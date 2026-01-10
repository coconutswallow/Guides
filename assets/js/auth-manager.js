/**
 * assets/js/auth-manager.js
 */
import { supabase } from './supabaseClient.js';

// REPLACE WITH YOUR ACTUAL SERVER ID
const REQUIRED_GUILD_ID = '308324031478890497'; 

class AuthManager {
    constructor() {
        this.client = supabase;
        this.user = null;
    }

    init(uiCallback) {
        this.client.auth.getSession().then(({ data }) => {
            this.handleSessionUpdate(data.session, uiCallback);
        });

        this.client.auth.onAuthStateChange((event, session) => {
            this.handleSessionUpdate(session, uiCallback);
        });
    }

    async handleSessionUpdate(session, callback) {
        if (!session) {
            this.user = null;
            if (callback) callback(null, null);
            return;
        }

        const discordToken = session.provider_token;

        if (discordToken) {
            // 1. Check if they are in the server
            const isMember = await this.checkGuildMembership(discordToken);
            
            if (!isMember) {
                console.warn('User not in required Discord server.');
                alert('Access Denied: You must be a member of our Discord server.');
                await this.logout();
                return;
            }

            // 2. Fetch detailed profile (Roles & Nickname)
            const memberData = await this.fetchGuildMember(discordToken);
            
            // 3. Sync to Supabase Table "discord_users"
            if (memberData) {
                await this.syncUserToDB(session.user, memberData);
            }
        }
        
        this.finalizeLogin(session, callback);
    }

    async checkGuildMembership(token) {
        try {
            const response = await fetch('https://discord.com/api/users/@me/guilds', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) return false;
            const guilds = await response.json();
            return guilds.some(guild => guild.id === 'REQUIRED_GUILD_ID');
        } catch (error) {
            console.error('Membership check failed:', error);
            return false;
        }
    }

    // NEW: Fetches roles and nickname for this specific server
    async fetchGuildMember(token) {
        try {
            const response = await fetch(`https://discord.com/api/users/@me/guilds/${REQUIRED_GUILD_ID}/member`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) return null;
            return await response.json(); // Returns { roles: [...], nick: "...", user: {...} }
        } catch (error) {
            console.error('Error fetching member details:', error);
            return null;
        }
    }

    async syncUserToDB(authUser, memberData) {
        try {
            // Mapping Discord data to YOUR existing database columns
            const updates = {
                // 1. MATCHING KEY: The Discord ID
                discord_id: authUser.user_metadata.provider_id,

                // 2. DISPLAY NAME
                // Logic: Use their specific Server Nickname if they have one, 
                // otherwise fall back to their Discord Global Name.
                display_name: memberData.nick || authUser.user_metadata.full_name,

                // 3. ROLES
                // Your CSV shows this column is named 'roles' (lowercase)
                roles: memberData.roles
            };

            // 4. UPSERT
            // We use 'discord_id' as the conflict key because 'id' does not exist in your CSV.
            const { error } = await this.client
                .from('discord_users')
                .upsert(updates, { onConflict: 'discord_id' });

            if (error) throw error;
            console.log('User synced to DB');

        } catch (error) {
            console.error('Error syncing user to DB:', error);
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
                // Request 'guilds' to check membership
                // Request 'guilds.members.read' to get roles/nickname
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