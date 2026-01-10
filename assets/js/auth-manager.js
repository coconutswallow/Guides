/**
 * assets/js/auth-manager.js
 */
import { supabase } from './supabaseClient.js';

// REPLACE THIS with your copied Server ID
const REQUIRED_GUILD_ID = '308324031478890497'; 

class AuthManager {
    constructor() {
        this.client = supabase;
        this.user = null;
        this.isProcessing = false; // FIX 1: Add a lock flag
    }

    init(uiCallback) {
        // 1. Check Initial Session
        this.client.auth.getSession().then(({ data }) => {
            if (data.session) {
                this.handleSessionUpdate(data.session, uiCallback);
            } else {
                // If no session, just clear UI
                if (uiCallback) uiCallback(null, null);
            }
        });

        // 2. Listen for Changes (Login/Logout)
        this.client.auth.onAuthStateChange((event, session) => {
            // FIX 2: Ignore 'INITIAL_SESSION' event to prevent double-firing on load
            if (event !== 'INITIAL_SESSION') {
                this.handleSessionUpdate(session, uiCallback);
            }
        });
    }

    async handleSessionUpdate(session, callback) {
        // FIX 3: Prevent running multiple checks at the same time
        if (this.isProcessing) return;
        this.isProcessing = true;

        if (!session) {
            this.user = null;
            this.isProcessing = false;
            if (callback) callback(null, null);
            return;
        }

        const discordToken = session.provider_token;

        if (discordToken) {
            // Check Membership
            const isMember = await this.checkGuildMembership(discordToken);
            
            if (!isMember) {
                this.isProcessing = false;
                alert('Access Denied: You must be a member of the Discord server.');
                await this.logout();
                return;
            }

            // Sync to DB
            const memberData = await this.fetchGuildMember(discordToken);
            if (memberData) {
                await this.syncUserToDB(session.user, memberData);
            }
        }
        
        this.finalizeLogin(session, callback);
        this.isProcessing = false; // Release lock
    }

    async checkGuildMembership(token) {
        try {
            const response = await fetch('https://discord.com/api/users/@me/guilds', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // FIX 4: Handle Rate Limits (429) gracefully
            if (response.status === 429) {
                console.warn("Rate limited by Discord. Retrying allowed for safety.");
                // We assume true temporarily to avoid kicking them out just because of a rate limit
                // Ideally you would wait and retry, but this prevents the crash.
                return true; 
            }

            const guilds = await response.json();
            
            // FIX 5: Safety check - Ensure 'guilds' is actually an array before using .some()
            if (!Array.isArray(guilds)) {
                console.error("Discord returned unexpected data:", guilds);
                return false; 
            }

            // DEBUG: See your servers
            // console.log("Servers found:", guilds); 

            return guilds.some(g => g.id === REQUIRED_GUILD_ID);

        } catch (e) { 
            console.error("Membership check error:", e); 
            return false; 
        }
    }

    async fetchGuildMember(token) {
        try {
            const response = await fetch(`https://discord.com/api/users/@me/guilds/${REQUIRED_GUILD_ID}/member`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) return null;
            return await response.json();
        } catch (e) { return null; }
    }

    async syncUserToDB(user, member) {
        console.log("--- SYNCING VIA SECURE FUNCTION ---");
        
        try {
            // We call the RPC function we just created
            const { error } = await this.client.rpc('link_discord_account', {
                arg_discord_id: user.user_metadata.provider_id,
                arg_display_name: member.nick || user.user_metadata.full_name,
                arg_roles: member.roles
            });

            if (error) {
                console.error("❌ SYNC FAILED:", error.message);
            } else {
                console.log("✅ ACCOUNT LINKED! UUID saved to database.");
            }

        } catch (e) {
            console.error("❌ CRITICAL ERROR:", e);
        }
    }

    finalizeLogin(session, callback) {
        this.user = session.user;
        // Clean URL
        if (this.user && window.location.hash && window.location.hash.includes('access_token')) {
            window.history.replaceState(null, null, window.location.pathname + window.location.search);
        }
        if (callback) callback(this.user, null);
    }

    async login() {
        const cleanUrl = window.location.origin + window.location.pathname;
        await this.client.auth.signInWithOAuth({
            provider: 'discord',
            options: { 
                redirectTo: cleanUrl,
                scopes: 'guilds guilds.members.read' 
            }
        });
    }

    async logout() {
        await this.client.auth.signOut();
        window.location.reload();
    }
}

window.authManager = new AuthManager();