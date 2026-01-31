import { supabase } from './supabaseClient.js';
import { logError } from './error-logger.js';

const REQUIRED_GUILD_ID = '308324031478890497';
// 24 Hours in milliseconds
const MAX_SESSION_AGE = 24 * 60 * 60 * 1000; 

/**
 * Manages Supabase authentication state and handles synchronization 
 * between the local session and the Discord database records.
 * 
 * Documentation: https://github.com/hawthorneguild/HawthorneTeams/issues/17
 */
class AuthManager {
    constructor() {
        this.client = supabase;
        this.user = null;
        this.syncInProgress = false;
        this.syncPromise = null;
    }

    /**
     * Initializes the auth listener.
     * Checks for an existing session immediately, then listens for changes.
     * * @param {Function} onUserReady - Callback function executed when the user state is resolved. 
     * Receives the `user` object or `null`.
     */
    init(onUserReady) {
        this.client.auth.getSession().then(({ data }) => {
            this.handleSession(data.session, onUserReady);
        }).catch(error => {
            logError('auth-manager', `Failed to get initial session: ${error.message}`);
            if (onUserReady) onUserReady(null);
        });

        this.client.auth.onAuthStateChange((event, session) => {
            logError('auth-manager', `Auth state changed: ${event}`);
            this.handleSession(session, onUserReady);
        });
    }

    /**
     * Internal handler to validate session freshness.
     * If the session is stale (db 'last_seen' > 24h), it triggers a sync.
     * * @param {Object|null} session - The Supabase session object.
     * @param {Function} callback - The UI update callback.
     */
    async handleSession(session, callback) {
        if (!session) {
            logError('auth-manager', 'handleSession: No session found - user logged out or session expired');
            this.user = null;
            if (callback) callback(null);
            return;
        }

        logError('auth-manager', `handleSession: Processing session for user ${session.user.id}`);

        // 1. Check the DB for 'last_seen'
        const isFresh = await this.checkSessionFreshness(session.user.id);

        if (isFresh) {
            // DB is fresh (sync happened < 24h ago). We are good.
            logError('auth-manager', `handleSession: Session is fresh for user ${session.user.id}`);
            this.user = session.user;
            if (callback) callback(this.user);
        } else {
            // DB is stale. We must Sync.
            logError('auth-manager', `handleSession: Session stale or missing for user ${session.user.id}. Syncing...`);
            
            // Prevent multiple simultaneous syncs with a lock
            if (this.syncInProgress) {
                logError('auth-manager', `handleSession: Sync already in progress, waiting for completion...`);
                try {
                    await this.syncPromise;
                    this.user = session.user;
                    if (callback) callback(this.user);
                } catch (error) {
                    logError('auth-manager', `handleSession: Waited sync failed: ${error.message}`);
                    if (callback) callback(null);
                }
                return;
            }
            
            // Set lock and create sync promise
            this.syncInProgress = true;
            this.syncPromise = this.syncDiscordToDB(session);
            
            try {
                await this.syncPromise;
                this.user = session.user;
                logError('auth-manager', `handleSession: Sync successful for user ${session.user.id}`);
                if (callback) callback(this.user);
            } catch (error) {
                logError('auth-manager', `handleSession: Sync failed for user ${session.user.id}: ${error.message} | Stack: ${error.stack}`);
                await this.logout();
            } finally {
                this.syncInProgress = false;
                this.syncPromise = null;
            }
        }
    }

    /**
     * Verifies if the user's data in the `discord_users` table is recent.
     * * @param {string} userId - The Supabase User UUID.
     * @returns {Promise<boolean>} TRUE if last_seen is < 24 hours ago, FALSE otherwise.
     */
    async checkSessionFreshness(userId) {
        try {
            const { data, error } = await this.client
                .from('discord_users')
                .select('last_seen')
                .eq('user_id', userId)
                .single();

            if (error) {
                logError('auth-manager', `checkSessionFreshness: DB error for user ${userId}: ${error.message}`);
                return false;
            }
            
            if (!data) {
                logError('auth-manager', `checkSessionFreshness: No data found for user ${userId}`);
                return false;
            }
            
            if (!data.last_seen) {
                logError('auth-manager', `checkSessionFreshness: No last_seen timestamp for user ${userId}`);
                return false;
            }

            const lastSeenDate = new Date(data.last_seen);
            const now = new Date();
            const ageInMs = now - lastSeenDate;
            const isFresh = ageInMs < MAX_SESSION_AGE;

            logError('auth-manager', `checkSessionFreshness: User ${userId} last_seen=${data.last_seen}, age=${Math.floor(ageInMs/1000/60)} minutes, fresh=${isFresh}`);
            return isFresh;
        } catch (e) {
            logError('auth-manager', `checkSessionFreshness: Exception for user ${userId}: ${e.message}`);
            return false; // Fail safe: assume stale
        }
    }

    /**
     * Synchronizes Discord profile data (Roles, Nickname) to the Supabase DB.
     * Required if the local database record is stale or missing.
     * * @param {Object} session - The active Supabase session containing the provider token.
     * @throws {Error} If token is missing, user is not in the guild, or RPC fails.
     */
    async syncDiscordToDB(session) {
        const token = session.provider_token;
        if (!token) {
            logError('auth-manager', 'syncDiscordToDB: No provider token found in session');
            throw new Error("No token found");
        }

        logError('auth-manager', 'syncDiscordToDB: Checking guild membership...');
        const isMember = await this.checkGuildMembership(token);
        if (!isMember) {
            logError('auth-manager', `syncDiscordToDB: User not in required Discord Guild (${REQUIRED_GUILD_ID})`);
            throw new Error("User not in required Discord Guild");
        }

        logError('auth-manager', 'syncDiscordToDB: Fetching guild member data...');
        const member = await this.fetchGuildMember(token);
        if (!member) {
            logError('auth-manager', 'syncDiscordToDB: Could not fetch Discord member data');
            throw new Error("Could not fetch Discord member data");
        }

        const discordId = session.user.user_metadata.provider_id;
        const displayName = member.nick || session.user.user_metadata.full_name;
        logError('auth-manager', `syncDiscordToDB: Calling link_discord_account RPC for discord_id=${discordId}, name=${displayName}, roles=${JSON.stringify(member.roles)}`);

        // The RPC function typically handles updating 'last_seen' to NOW()
        // Ensure your Postgres function 'link_discord_account' does this!
        const { error } = await this.client.rpc('link_discord_account', {
            arg_discord_id: discordId,
            arg_display_name: displayName,
            arg_roles: member.roles
        });

        if (error) {
            logError('auth-manager', `syncDiscordToDB: RPC link_discord_account failed: ${error.message}`);
            throw error;
        }

        logError('auth-manager', 'syncDiscordToDB: Successfully synced Discord data to DB');
    }

    /**
     * Triggers the OAuth sign-in flow with Discord.
     * Redirects the user back to the current page origin.
     */
    async login() {
        const cleanUrl = window.location.origin + window.location.pathname;
        await this.client.auth.signInWithOAuth({
            provider: 'discord',
            options: { redirectTo: cleanUrl, scopes: 'guilds guilds.members.read' }
        });
    }

    /**
     * Signs the user out of Supabase and reloads the page.
     */
    async logout() {
        await this.client.auth.signOut();
        window.location.reload();
    }
    
    /**
     * Checks Discord API to see if the user is a member of the required Guild.
     * * @param {string} token - The Discord Provider Access Token.
     * @returns {Promise<boolean>}
     */
    async checkGuildMembership(token) {
         try {
            const r = await fetch('https://discord.com/api/users/@me/guilds', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (r.status === 429) {
                logError('auth-manager', 'checkGuildMembership: Rate limited by Discord API, assuming membership');
                return true; 
            }
            
            if (!r.ok) {
                logError('auth-manager', `checkGuildMembership: Discord API returned status ${r.status}`);
                return false;
            }
            
            const g = await r.json();
            const isMember = Array.isArray(g) && g.some(x => x.id === REQUIRED_GUILD_ID);
            
            logError('auth-manager', `checkGuildMembership: User ${isMember ? 'IS' : 'IS NOT'} a member of guild ${REQUIRED_GUILD_ID}`);
            return isMember;
        } catch(e) { 
            logError('auth-manager', `checkGuildMembership: Exception - ${e.message}`);
            return false;
        }
    }

    /**
     * Fetches the specific member details (roles, nickname) from the Discord Guild.
     * * @param {string} token - The Discord Provider Access Token.
     * @returns {Promise<Object|null>} The Discord Member object or null on failure.
     */
    async fetchGuildMember(token) {
        try {
            logError('auth-manager', `fetchGuildMember: Starting fetch for guild ${REQUIRED_GUILD_ID}`);
            
            // Add a timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const r = await fetch(`https://discord.com/api/users/@me/guilds/${REQUIRED_GUILD_ID}/member`, {
                headers: { Authorization: `Bearer ${token}` },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            logError('auth-manager', `fetchGuildMember: Discord API responded with status ${r.status}`);
            
            if (!r.ok) {
                const errorText = await r.text();
                logError('auth-manager', `fetchGuildMember: Discord API error: status=${r.status}, body=${errorText}`);
                return null;
            }
            
            const member = await r.json();
            logError('auth-manager', `fetchGuildMember: Successfully fetched member data with ${member.roles?.length || 0} roles: ${JSON.stringify(member.roles || [])}`);
            return member;
        } catch(e) {
            if (e.name === 'AbortError') {
                logError('auth-manager', `fetchGuildMember: Request timed out after 10 seconds`);
            } else {
                logError('auth-manager', `fetchGuildMember: Exception - ${e.message} | Stack: ${e.stack}`);
            }
            return null;
        }
    }
}

window.authManager = new AuthManager();