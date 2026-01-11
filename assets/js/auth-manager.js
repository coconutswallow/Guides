import { supabase } from './supabaseClient.js';

const REQUIRED_GUILD_ID = '308324031478890497';
// 24 Hours in milliseconds
const MAX_SESSION_AGE = 24 * 60 * 60 * 1000; 

class AuthManager {
    constructor() {
        this.client = supabase;
        this.user = null;
    }

    init(onUserReady) {
        this.client.auth.getSession().then(({ data }) => {
            this.handleSession(data.session, onUserReady);
        });

        this.client.auth.onAuthStateChange((event, session) => {
            this.handleSession(session, onUserReady);
        });
    }

    async handleSession(session, callback) {
        if (!session) {
            this.user = null;
            if (callback) callback(null);
            return;
        }

        // 1. Check the DB for 'last_seen'
        const isFresh = await this.checkSessionFreshness(session.user.id);

        if (isFresh) {
            // DB is fresh (sync happened < 24h ago). We are good.
            this.user = session.user;
            if (callback) callback(this.user);
        } else {
            // DB is stale. We must Sync.
            console.log("Auth: Session stale or missing. Syncing...");
            try {
                await this.syncDiscordToDB(session);
                this.user = session.user;
                if (callback) callback(this.user);
            } catch (error) {
                console.error("Auth: Sync failed.", error);
                await this.logout();
            }
        }
    }

    /**
     * Returns TRUE if last_seen is < 24 hours ago.
     * Returns FALSE if data is missing or old.
     */
    async checkSessionFreshness(userId) {
        try {
            const { data, error } = await this.client
                .from('discord_users')
                .select('last_seen')
                .eq('user_id', userId)
                .single();

            if (error || !data || !data.last_seen) return false;

            const lastSeenDate = new Date(data.last_seen);
            const now = new Date();
            const ageInMs = now - lastSeenDate;

            return ageInMs < MAX_SESSION_AGE;
        } catch (e) {
            return false; // Fail safe: assume stale
        }
    }

    async syncDiscordToDB(session) {
        const token = session.provider_token;
        if (!token) throw new Error("No token found");

        const isMember = await this.checkGuildMembership(token);
        if (!isMember) throw new Error("User not in required Discord Guild");

        const member = await this.fetchGuildMember(token);
        if (!member) throw new Error("Could not fetch Discord member data");

        // The RPC function typically handles updating 'last_seen' to NOW()
        // Ensure your Postgres function 'link_discord_account' does this!
        const { error } = await this.client.rpc('link_discord_account', {
            arg_discord_id: session.user.user_metadata.provider_id,
            arg_display_name: member.nick || session.user.user_metadata.full_name,
            arg_roles: member.roles
        });

        if (error) throw error;
    }

    // ... (rest of methods: login, logout, etc. remain the same) ...
    async login() {
        const cleanUrl = window.location.origin + window.location.pathname;
        await this.client.auth.signInWithOAuth({
            provider: 'discord',
            options: { redirectTo: cleanUrl, scopes: 'guilds guilds.members.read' }
        });
    }

    async logout() {
        await this.client.auth.signOut();
        window.location.reload();
    }
    
    async checkGuildMembership(token) {
        // ... (same as before)
         try {
            const r = await fetch('https://discord.com/api/users/@me/guilds', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (r.status === 429) return true; 
            const g = await r.json();
            return Array.isArray(g) && g.some(x => x.id === REQUIRED_GUILD_ID);
        } catch(e) { return false; }
    }

    async fetchGuildMember(token) {
        // ... (same as before)
        try {
            const r = await fetch(`https://discord.com/api/users/@me/guilds/${REQUIRED_GUILD_ID}/member`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return r.ok ? await r.json() : null;
        } catch(e) { return null; }
    }
}

window.authManager = new AuthManager();