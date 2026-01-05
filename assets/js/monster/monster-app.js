/**
 * monster-app.js
 * * Main entry point for the Monster Manual application.
 * Handles:
 * 1. Supabase Client Initialization
 * 2. Hash-based Routing (SPA)
 * 3. View Orchestration
 */

import { renderMonsterLibrary } from './views/monster-library.js';
import { renderMonsterDetail } from './views/monster-detail.js';

// --- Supabase Configuration ---
// The SUPABASE_URL and ANON_KEY are exposed to the client.
// Security is handled via Row Level Security (RLS) policies on the backend,
// ensuring users can only access public 'live' data.
const SUPABASE_URL = 'https://iepqxczcyvrxcbyeiscc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllcHF4Y3pjeXZyeGNieWVpc2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNjU2MDEsImV4cCI6MjA3OTk0MTYwMX0.9fK4TppNy7IekO3n4Uwd37dbqMQ7KRhFkex_P_JSeVA';

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Route Definitions ---
// Maps exact hash paths to their specific render functions.
const routes = {
    '/': renderMonsterLibrary,
    '/monsters': renderMonsterLibrary
    // Dynamic routes (like /:slug) are handled logically in the router function
};

/**
 * Main Router Function
 * * Inspects the window.location.hash to determine which view to render.
 * Logic Hierarchy:
 * 1. OAuth Redirects: Cleans up URL fragments from Supabase Auth.
 * 2. Exact Matches: Checks static routes defined in `routes` object.
 * 3. Dynamic Slugs: Assumes any other "/string" is a monster slug.
 * 4. Fallback: Redirects to home/library if no match found.
 */
async function router() {
    const app = document.getElementById('app');
    
    // Normalize hash: remove the '#' symbol. Default to '/' if empty.
    let hash = window.location.hash.slice(1) || '/';
    
    // Handle Supabase OAuth redirects (clears tokens from URL after login)
    if (hash.includes('access_token')) {
        window.location.hash = '/';
        return;
    }

    let matchedRenderer = null;
    let params = {};

    // 1. Check for Exact Route Matches
    if (routes[hash]) {
        matchedRenderer = routes[hash];
    } 
    // 2. Handle Dynamic Monster Slugs (e.g., #/ancient-sword-dragon)
    // We assume any non-exact match starting with '/' is a monster detail request.
    else if (hash.startsWith('/')) {
        const slug = hash.slice(1); // Extract "ancient-sword-dragon" from "/ancient-sword-dragon"
        
        if (slug) {
            matchedRenderer = renderMonsterDetail;
            params = { slug };
        }
    } 
    // 3. Fallback / Default Route
    else {
        matchedRenderer = routes['/'];
    }

    // Render the View
    app.innerHTML = '<div class="loading">Loading...</div>';
    
    if (matchedRenderer) {
        try {
            await matchedRenderer(app, params);
        } catch (error) {
            console.error("View rendering failed:", error);
            app.innerHTML = '<div class="error">Sorry, something went wrong loading this page.</div>';
        }
    } else {
        app.innerHTML = '<h2>404 - Page Not Found</h2>';
    }
}

// --- Initialization ---
// Listen for hash changes to update view without reloading page
window.addEventListener('hashchange', router);
// Handle initial load
window.addEventListener('load', router);