/**
 * monster-app.js
 * Entry point for the application.
 * Handles routing and initialization.
 */

// ADJUSTED PATH: Go up one level (..) to find the config file
import { supabase } from '../supabase-config.js'; 
import { renderMonsterList } from './views/monster-list.js';
import { renderMonsterDetail } from './views/monster-detail.js';

// --- Router ---

const routes = {
    '/': renderMonsterList,
    '/monster/:slug': renderMonsterDetail
};

function getRouteInfo() {
    const hash = window.location.hash.slice(1) || '/'; // Default to '/'
    
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

    return { handler: renderMonsterList, params: {} }; // Fallback
}

async function handleRoute() {
    const app = document.getElementById('app');
    const { handler, params } = getRouteInfo();

    // Clear and render
    app.innerHTML = '';
    
    // Update active nav state
    updateNavbar();

    await handler(app, params);
}

function updateNavbar() {
    // Simple logic to highlight active link if needed
    // Currently just ensures basic state
}

// --- Initialization ---

function init() {
    window.addEventListener('hashchange', handleRoute);
    window.addEventListener('load', handleRoute);
    
    // Handle internal links to prevent full reloads
    document.body.addEventListener('click', e => {
        if (e.target.matches('[data-link]')) {
            e.preventDefault();
            window.location.hash = e.target.getAttribute('href');
        }
    });
}

init();