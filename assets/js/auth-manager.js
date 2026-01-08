/**
 * auth-manager.js
 * * PURPOSE:
 * Bridges your existing 'supabaseClient.js' with the UI.
 * Handles Login, Logout, and Profile fetching.
 * * USAGE:
 * Must be loaded with type="module" in your HTML:
 * <script type="module" src="assets/js/auth-manager.js"></script>
 */

// 1. Import the pre-configured client from your existing file
//    (Make sure the path matches where you saved supabaseClient.js)
import { supabase } from './supabaseClient.js'; 

class AuthManager {
    constructor() {
        // Use the client you already created
        this.db = supabase;
        this.user = null;         
        this.userProfile = null;

        console.log("AuthManager: Initialized with existing Supabase client.");
    }

    /**
     * Initializes the auth listener.
     * @param {Function} onStateChange - Callback (user, profile) => { ... }
     */
    init(onStateChange) {
        // Check active session immediately
        this.db.auth.getSession().then(({ data }) => {
            this.handleSession(data.session, onStateChange);
        });

        // Listen for future changes (sign in, sign out)
        this.db.auth.onAuthStateChange((event, session) => {
            this.handleSession(session, onStateChange);
        });
    }

    async handleSession(session, callback) {
        this.user = session ? session.user : null;
        this.userProfile = null; 

        // Clean URL junk (#access_token=...) automatically
        if (session && window.location.hash && window.location.hash.includes('access_token')) {
            window.history.replaceState(null, null, window.location.pathname + window.location.search);
        }

        // If logged in, fetch custom 'discord_users' profile
        if (this.user) {
            await this.fetchUserProfile();
        }

        if (callback) callback(this.user, this.userProfile);
    }

    async fetchUserProfile() {
        try {
            const discordIdentity = this.user.identities?.find(id => id.provider === 'discord');
            
            if (!discordIdentity) {
                console.warn("User logged in, but not via Discord.");
                return;
            }

            const discordId = discordIdentity.id_in_provider;

            const { data, error } = await this.db
                .from('discord_users')
                .select('*')
                .eq('discord_id', discordId)
                .single();

            if (!error) {
                this.userProfile = data;
            }
        } catch (err) {
            console.error("Profile fetch error:", err);
        }
    }

    async login() {
        const redirectUrl = window.location.origin + window.location.pathname;
        await this.db.auth.signInWithOAuth({
            provider: 'discord',
            options: { redirectTo: redirectUrl }
        });
    }

    async logout() {
        await this.db.auth.signOut();
        window.location.reload();
    }
}

// 2. Attach to window so non-module scripts (like auth-header.html) can see it
window.authManager = new AuthManager();