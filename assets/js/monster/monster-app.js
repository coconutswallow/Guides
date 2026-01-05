import { renderMonsterLibrary } from './views/monster-library.js';
import { renderMonsterDetail } from './views/monster-detail.js';

// --- Supabase Config ---
// These keys are safe in the code long as role-level security is implemented
const SUPABASE_URL = 'https://iepqxczcyvrxcbyeiscc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllcHF4Y3pjeXZyeGNieWVpc2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNjU2MDEsImV4cCI6MjA3OTk0MTYwMX0.9fK4TppNy7IekO3n4Uwd37dbqMQ7KRhFkex_P_JSeVA';
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Router ---
const routes = {
    '/': renderMonsterLibrary,
    '/monsters': renderMonsterLibrary,
    '/monster/:slug': renderMonsterDetail
};

async function router() {
    const app = document.getElementById('app');
    let hash = window.location.hash.slice(1) || '/';
    
    // Auth Clean-up (Spec 1.3)
    if (hash.includes('access_token')) {
        // In a full implementation, pass this to AuthManager
        window.location.hash = '/';
        return;
    }

    // Basic Pattern Matching for Routes
    let matchedRenderer = null;
    let params = {};

    if (hash.startsWith('/monster/')) {
        const slug = hash.split('/monster/')[1];
        if (slug) {
            matchedRenderer = renderMonsterDetail;
            params = { slug };
        }
    } else {
        matchedRenderer = routes[hash] || routes['/'];
    }

    // Render
    app.innerHTML = '<div class="loading">Loading...</div>';
    if (matchedRenderer) {
        await matchedRenderer(app, params);
    } else {
        app.innerHTML = '<h2>404 - Page Not Found</h2>';
    }
}

// Initialize
window.addEventListener('hashchange', router);
window.addEventListener('load', router);