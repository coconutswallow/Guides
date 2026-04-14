/**
 * monster-editor.js
 * Main orchestrator for the Monster Compendium Editor.
 * This file handles routing and cross-module coordination.
 * Location: \assets\js\monster\monster-editor.js
 * https://github.com/hawthorneguild/HawthorneTeams/issues/7
 */

import { supabase } from '../supabaseClient.js';
import { checkAccess } from '../auth-check.js';
import { getMonsterBySlug, getMyMonsters, getMonsterLookups } from './monster-service.js';
import {
    renderDashboard,
    renderEditor as renderEditorUI,
    renderFeatureList,
    initMarkdownWidget
} from './monster-editor-ui.js';
import { attachEditorEvents, handleSave, handlePreview, handleSubmit } from './monster-editor-handlers.js';
import {
    createEmptyMonster,
    getLocalCache,
    clearLocalCache
} from './monster-editor-state.js';

let lookups = null;
let currentMonster = null;

/**
 * Entry point. Sets up the auth transition hook.
 */
function init() {
    // Hook for auth-header.html to call when user state is known
    window.handlePageAuth = async (user) => {
        const container = document.getElementById('editor-app');
        if (!container) return;

        if (!user) {
            container.innerHTML = `
                <div class="alert alert-info" style="margin-top: 2rem;">
                    <h3>Editor Access</h3>
                    <p>Please login with Discord to access the monster editor. Only DMs can submit or edit monsters.</p>
                </div>`;
            return;
        }

        const hasAccess = await checkAccess(user.id, ['Trial DM', 'Full DM', 'Monster Admin']);
        if (!hasAccess) {
            container.innerHTML = `
                <div class="alert alert-danger" style="margin-top: 2rem;">
                    <h3>Access Denied</h3>
                    <p>You do not have the required permissions to manage monsters. If you believe this is an error, contact staff.</p>
                </div>`;
            return;
        }

        if (!lookups) {
            lookups = await getMonsterLookups();
        }

        window.removeEventListener('hashchange', handleRoute);
        window.addEventListener('hashchange', handleRoute);
        handleRoute();
    };

    if (window.authManager && window.authManager.user) {
        window.handlePageAuth(window.authManager.user);
    }
}

/**
 * Router logic for the SPA Editor.
 * Directs to Dashboard, New Monster form, or Edit Monster form based on hash.
 * @returns {Promise<void>}
 */
async function handleRoute() {
    const container = document.getElementById('editor-app');
    const hash = window.location.hash.slice(1) || '/';

    if (hash === '/') {
        renderDashboard(container);
    } else if (hash === '/new') {
        renderEditor(container, null);
    } else if (hash.startsWith('/edit/')) {
        const slug = hash.split('/')[2];
        renderEditor(container, slug);
    } else {
        renderDashboard(container);
    }
}

/**
 * Orchestrates the loading and rendering of the editor view.
 * @param {HTMLElement} container - The element to render into.
 * @param {string|null} slug - Monster slug to edit, or null for new.
 * @returns {Promise<void>}
 */
async function renderEditor(container, slug) {
    container.innerHTML = '<div class="loading">Loading Editor...</div>';

    if (slug) {
        currentMonster = await getMonsterBySlug(slug);

        // Safety: If not found in public view, try fetching from user's drafts
        if (!currentMonster) {
            const { data: { user } } = await supabase.auth.getUser();
            const discordId = user.user_metadata.provider_id || user.id;
            const myMonsters = await getMyMonsters(discordId);
            currentMonster = myMonsters.find(m => m.slug === slug);

            if (currentMonster) {
                const { data: features } = await supabase.from('monster_features').select('*').eq('parent_row_id', currentMonster.row_id).order('display_order');
                currentMonster.features = features || [];
            }
        }
    } else {
        currentMonster = createEmptyMonster();
    }

    if (slug && !currentMonster) {
        container.innerHTML = '<div class="alert alert-danger">Monster not found or access denied.</div>';
        return;
    }

    const defaultCreator = window.authManager?.user?.user_metadata?.full_name || '';

    // 1. Render UI components
    renderEditorUI(container, currentMonster, lookups, defaultCreator);

    // 2. Check for Local Cache Recovery
    const cached = getLocalCache(slug);
    if (cached) {
        const cacheTime = new Date(cached.updated_at || Date.now());
        const dbTime = new Date(currentMonster.updated_at || 0);

        if (cacheTime > dbTime || (!slug && cached)) {
            const recoveryBanner = document.createElement('div');
            recoveryBanner.className = 'alert alert-info';
            recoveryBanner.style.marginBottom = '2rem';
            recoveryBanner.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>Draft Recovery:</strong> A newer unsaved version of this monster was found in your browser cache (from ${cacheTime.toLocaleTimeString()}).
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button type="button" id="btn-recover-local" class="btn btn-sm btn-primary">Restore Draft</button>
                        <button type="button" id="btn-discard-local" class="btn btn-sm btn-outline-secondary">Discard</button>
                    </div>
                </div>
            `;
            container.querySelector('.editor-toolbar').after(recoveryBanner);

            container.querySelector('#btn-recover-local').addEventListener('click', () => {
                currentMonster = cached;
                renderEditor(container, slug); // Re-render with cached data
            });

            container.querySelector('#btn-discard-local').addEventListener('click', () => {
                clearLocalCache(slug);
                recoveryBanner.remove();
            });
        }
    }

    // 3. Initialize markdown widgets
    container.querySelectorAll('.md-widget-container').forEach(w => initMarkdownWidget(w));

    // 4. Attach handlers
    attachEditorEvents(container, currentMonster, lookups);
    renderFeatureList(currentMonster);
}

// Global hooks for inline onclicks or legacy integrations
window.handlePreview = () => handlePreview(currentMonster);
window.handleSave = (silent) => handleSave(currentMonster, silent);
window.handleSubmit = () => handleSubmit(currentMonster);

init();
