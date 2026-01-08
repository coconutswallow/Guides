/**
 * assets/js/auth-manager.js
 * Imports the shared Supabase client and manages auth.
 */

// 1. Import from your modular configuration file
//    Note: './' works because both files are in the same directory
import { supabase } from './supabaseClient.js';

class AuthManager {
    constructor() {
        this.client = supabase;
        this.user = null;
    }

    init(uiCallback) {
        // 1. Check Session
        this.client.auth.getSession().then(({ data }) => {
            this.updateState(data.session, uiCallback);
        });

        // 2. Listen for Changes
        this.client.auth.onAuthStateChange((event, session) => {
            this.updateState(session, uiCallback);
        });
    }

    updateState(session, callback) {
        this.user = session ? session.user : null;
        
        // Clean URL fragments if needed
        if (this.user && window.location.hash && window.location.hash.includes('access_token')) {
            window.history.replaceState(null, null, window.location.pathname + window.location.search);
        }

        // Send user data back to the UI (auth-header.html)
        // We pass 'null' for the profile for now to keep it simple
        if (callback) callback(this.user, null);
    }

    async login() {
        const cleanUrl = window.location.origin + window.location.pathname;

        await this.client.auth.signInWithOAuth({
            provider: 'discord',
            options: { 
                redirectTo: cleanUrl  // <--- CHANGED FROM window.location.href
            }
        });
    }

    async logout() {
        await this.client.auth.signOut();
        window.location.reload();
    }
}

// 3. EXPOSE TO WINDOW
// This allows the onclick="window.authManager.login()" in your HTML to work.
window.authManager = new AuthManager();