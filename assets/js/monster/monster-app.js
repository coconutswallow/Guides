/**
 * monster-app.js
 * Entry point for the application.
 * Location: \assets\js\monster\monster-app.js
 */

// Import the client config (Go up one level)
import { supabase } from '../supabaseClient.js'; 

// Import Views (Look in current folder's 'views' subfolder)
import { renderMonsterLibrary } from './views/monster-library.js'; 
import { renderMonsterDetail } from './views/monster-detail.js';

// --- Router Configuration ---

const routes = {
    '/': renderMonsterLibrary,
    '/monster/:slug': renderMonsterDetail
};

/**
 * Parses the current URL hash to find the matching route and parameters.
 */
function getRouteInfo() {
    const hash = window.location.hash.slice(1) || '/';
    
    // 1. Exact Match
    if (routes[hash]) {
        return { handler: routes[hash], params: {} };
    }

    // 2. Pattern Match (e.g. /monster/the-bitter-maiden)
    for (const route in routes) {
        if (route.includes(':')) {
            const routeParts = route.split('/');
            const hashParts = hash.split('/');

            if (routeParts.length === hashParts.length) {
                const params = {};
                let match = true;

                for (let i = 0; i < routeParts.length; i++) {
                    if (routeParts[i].startsWith(':')) {
                        params[routeParts[i].slice(1)] = hashParts[i];
                    } else if (routeParts[i] !== hashParts[i]) {
                        match = false;
                        break;
                    }
                }

                if (match) {
                    return { handler: routes[route], params };
                }
            }
        }
    }

    // Fallback: Default to library
    return { handler: renderMonsterLibrary, params: {} };
}

/**
 * Main router handler
 */
async function handleRoute() {
    const app = document.getElementById('app');
    const { handler, params } = getRouteInfo();

    // Clear current content
    app.innerHTML = '';
    
    // Render the new view
    await handler(app, params);
}

// --- Initialization ---

function init() {
    window.addEventListener('hashchange', handleRoute);
    window.addEventListener('load', handleRoute);
    
    // Internal link delegation
    document.body.addEventListener('click', e => {
        const link = e.target.closest('[data-link]');
        if (link) {
            e.preventDefault();
            window.location.hash = link.getAttribute('href'); 
        }
    });
}

// Start
init();