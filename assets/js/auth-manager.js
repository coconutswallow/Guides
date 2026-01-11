/**
 * Discord Authorization Module
 * This uses Supabase's built in OAuth function to faciliate login via Discord to allow us to use Discord ID to manage access and provide security to certain features\
 * Benefits: 
 *		Don't need to build our own oAuth or login function
 * 		OAuth is connected to Supabase' role-level-security (RLS).  This means that we can set policies that users can only edit table records that match their user ID
 *		We can pull Hawthorne Guild membership and roles.  This means that we can limit access to website features only if they are a member of the Hawthorne Guild and 
 *			have some features that are locked to DM only, Staff only, etc.
 *		
 *		This module is used in combination with supabaseClient.js (reusable connection code to the Supabase instance) and auth-header.html (an include file that basically 
 *		allows you to drop the discord login function into a webpage
 *
 * File Location:  assets/js/auth-manager.js
 *
 */
import { supabase } from './supabaseClient.js';

// Server ID
const REQUIRED_GUILD_ID = '308324031478890497'; 
// How often to re-verify Discord status (e.g., 10 minutes)
const SYNC_COOLDOWN = 1000 * 60 * 10; 

class AuthManager {
    constructor() {
        this.client = supabase;
        this.user = null;
        this.isProcessing = false; // Add a lock flag
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
            // Ignore 'INITIAL_SESSION' event to prevent double-firing on load
            if (event !== 'INITIAL_SESSION') {
                this.handleSessionUpdate(session, uiCallback);
            }
        });
    }
	/**
     * Fetches the public member list.
     * Uses the 'member_directory' view which hides sensitive roles/notes.
     */
    async fetchMemberDirectory() {
        try {
            const { data, error } = await this.client
                .from('member_directory') // Query the VIEW, not the table
                .select('*');             // The view already limits columns

            if (error) {
                console.error("Error fetching directory:", error.message);
                return [];
            }
            return data;
        } catch (e) {
            console.error("Directory fetch failed:", e);
            return [];
        }
    }

    async handleSessionUpdate(session, callback) {
        // Prevent running multiple checks at the same time
        if (this.isProcessing) return;
        this.isProcessing = true;

        if (!session) {
            this.user = null;
            this.isProcessing = false;
            if (callback) callback(null, null);
            return;
        }

        const discordToken = session.provider_token;
        const userId = session.user.id;
        
        // --- NEW LOGIC: Check Cooldown ---
        const syncKey = `auth_last_sync_${userId}`;
        const lastSyncTime = localStorage.getItem(syncKey);
        const now = Date.now();
        
        // We sync if there is no record, OR if the cooldown has passed
        const shouldSync = !lastSyncTime || (now - parseInt(lastSyncTime) > SYNC_COOLDOWN);

        if (discordToken && shouldSync) {
            console.log("🔄 Verifying Discord Membership & Syncing...");

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
                // Update the timestamp so we don't do this again for 10 mins
                localStorage.setItem(syncKey, now.toString());
            }
        } else {
            // If we are here, we are skipping the expensive checks
            // console.log("✅ Using cached session (skipping Discord sync)");
        }
        // 2. NEW: Always fetch the latest permissions from YOUR DB
        // We do this regardless of whether we just synced or not.
        const profile = await this.fetchLocalProfile(session.user.id);
        
        if (profile && profile.roles) {
            this.userRoles = profile.roles; // Save roles to memory
        }
        
        this.finalizeLogin(session, profile, callback);
        this.isProcessing = false; // Release lock
    }
    async fetchLocalProfile(userId) {
        try {
            // Adjust 'discord_users' to match your actual table name
            // Adjust 'uuid' to match your primary key column name
            const { data, error } = await this.client
                .from('discord_users') 
                .select('roles, display_name')
                .eq('user_id', userId)
                .single();

            if (error) {
                console.warn("Could not fetch local profile:", error.message);
                return null;
            }
            return data;
        } catch (e) {
            return null;
        }
    }

    // --- NEW HELPER: Check Permissions ---
    /**
     * Checks if the user has ANY of the required roles.
     * @param {string|string[]} allowedRoles - Single role or array of roles (e.g. ['DM', 'Trial DM'])
     * @returns {boolean}
     */
    hasRole(allowedRoles) {
        if (!this.user || !this.userRoles || this.userRoles.length === 0) return false;

        // Convert string to array if needed
        const required = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

        // Check if user has at least one of the required roles
        return required.some(reqRole => this.userRoles.includes(reqRole));
    }

    async checkGuildMembership(token) {
        try {
            const response = await fetch('https://discord.com/api/users/@me/guilds', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Handle Rate Limits (429) gracefully
            if (response.status === 429) {
                console.warn("Rate limited by Discord. Retrying allowed for safety.");
                return true; 
            }

            const guilds = await response.json();
            
            // Safety check
            if (!Array.isArray(guilds)) {
                console.error("Discord returned unexpected data:", guilds);
                return false; 
            }

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
        try {
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

    finalizeLogin(session, profile, callback) {
        this.user = session.user;
        
        // Clean URL
        if (this.user && window.location.hash && window.location.hash.includes('access_token')) {
            window.history.replaceState(null, null, window.location.pathname + window.location.search);
        }

        // Pass 'profile' to the callback so the UI can see roles
        if (callback) callback(this.user, profile);
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
        try {
            // Clear the sync timestamp so next login forces a fresh check
            if (this.user) {
                localStorage.removeItem(`auth_last_sync_${this.user.id}`);
            }
            // Attempt to sign out on the server
            await this.client.auth.signOut();
        } catch (e) {
            console.warn("Server sign-out failed, forcing local logout:", e);
        } finally {
            // ALWAYS reload, even if the server errors out
            // This ensures the user is never "stuck"
            window.location.reload();
        }
    }
}

window.authManager = new AuthManager();