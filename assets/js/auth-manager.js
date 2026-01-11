import { supabase } from './supabaseClient.js';

const REQUIRED_GUILD_ID = '308324031478890497'; 

class AuthManager {
    constructor() {
        this.client = supabase;
        this.user = null;
    }

    // 1. INIT: Start listening for session changes
    init(onUserReady) {
        this.client.auth.getSession().then(({ data }) => {
            this.handleSession(data.session, onUserReady);
        });

        this.client.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'SIGNED_OUT') {
                this.handleSession(session, onUserReady);
            }
        });
    }

    // 2. SESSION HANDLER: The Gatekeeper
    async handleSession(session, callback) {
        if (!session) {
            this.user = null;
            if (callback) callback(null); // Logged Out
            return;
        }

        // --- THE SYNC BARRIER ---
        // We do not release the user to the page until we verify/sync them.
        try {
            await this.syncDiscordToDB(session);
            // If sync succeeds, the DB is fresh. We are ready.
            this.user = session.user;
            if (callback) callback(this.user);
        } catch (error) {
            console.error("Auth Error:", error.message);
            // If sync fails (e.g., they left the Discord server), 
            // we force them out so they can't access ANY page.
            await this.logout(); 
        }
    }

    // 3. SYNC: The Background Worker
    async syncDiscordToDB(session) {
        const token = session.provider_token;
        if (!token) throw new Error("No token found");

        // A. Verify Membership
        const isMember = await this.checkGuildMembership(token);
        if (!isMember) throw new Error("User not in required Discord Guild");

        // B. Fetch Latest Roles from Discord
        const member = await this.fetchGuildMember(token);
        if (!member) throw new Error("Could not fetch Discord member data");

        // C. Update Database (Wait for this to finish!)
        const { error } = await this.client.rpc('link_discord_account', {
            arg_discord_id: session.user.user_metadata.provider_id,
            arg_display_name: member.nick || session.user.user_metadata.full_name,
            arg_roles: member.roles
        });

        if (error) throw error;
    }

    // --- UTILITIES ---
    async login() {
        const cleanUrl = window.location.origin + window.location.pathname;
        await this.client.auth.signInWithOAuth({
            provider: 'discord',
            options: { redirectTo: cleanUrl, scopes: 'guilds guilds.members.read' }
        });
    }

    async logout() {
        window.localStorage.clear(); // Safety clear
        window.sessionStorage.clear();
        await this.client.auth.signOut();
        window.location.reload();
    }

    // --- API CALLS ---
    async checkGuildMembership(token) {
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
        try {
            const r = await fetch(`https://discord.com/api/users/@me/guilds/${REQUIRED_GUILD_ID}/member`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return r.ok ? await r.json() : null;
        } catch(e) { return null; }
    }
}

window.authManager = new AuthManager();