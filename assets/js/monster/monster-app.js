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
    // Ensure we have a valid path (e.g., "/" or "/ancient-sword-dragon")
    let hash = window.location.hash.slice(1) || '/';
    
    // Auth Clean-up (Spec 1.3)
    if (hash.includes('access_token')) {
        window.location.hash = '/';
        return;
    }

    let matchedRenderer = null;
    let params = {};

    // 1. Check for Exact Matches first (Home, Library, etc.)
    if (routes[hash]) {
        matchedRenderer = routes[hash];
    } 
    // 2. If no exact match, treat it as a Monster Detail view
    // (We assume the hash is "/{slug}")
    else if (hash.startsWith('/')) {
        // Remove the leading slash to get the clean slug
        const slug = hash.slice(1); 
        
        if (slug) {
            matchedRenderer = renderMonsterDetail;
            params = { slug };
        }
    } 
    // 3. Fallback for weird URLs
    else {
        matchedRenderer = routes['/'];
    }

    // Render
    app.innerHTML = '<div class="loading">Loading...</div>';
    if (matchedRenderer) {
        await matchedRenderer(app, params);
    } else {
        // Optional: Handle 404 differently if the slug turns out to be invalid in the API
        app.innerHTML = '<h2>404 - Page Not Found</h2>';
    }
}

// Initialize
window.addEventListener('hashchange', router);
window.addEventListener('load', router);