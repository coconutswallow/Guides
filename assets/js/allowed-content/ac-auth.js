/**
 * ================================================================
 * AC AUTH & ADMIN SHELL MODULE
 * ================================================================
 * 
 * Centralized staff authentication state and administrative bar shell
 * for the Allowed Content suite.
 * 
 * Responsibilities:
 * - Detecting staff/admin session via Supabase & auth-check.
 * - Managing global admin mode state and current user metadata.
 * - Rendering the administrative action bar across all AC tabs.
 * - Decoupling auth logic from specific domain modules (Sources, Races, etc.).
 * 
 * Security Architecture:
 * - IMPORTANT FOR DEVELOPERS: The client-side `isAdmin` boolean controls UI visibility ONLY
 *   (e.g. Showing "+ Add Source" buttons and edit forms).
 * - Real security is enforced server-side by PostgreSQL Row Level Security (RLS) policies
 *   on Supabase tables (`ac_sources`, `ac_races`, `ac_subraces`).
 * - Even if a malicious user manipulates client-side `isAdmin = true`, any unauthorized
 *   INSERT, UPDATE, or DELETE calls will be rejected with HTTP 403 / PostgreSQL permission denied.
 * 
 * @module ACAuth
 */

import { supabase } from '../supabaseClient.js';
import { checkAccess } from '../auth-check.js';
import { esc, getStaffPortalUrl } from './ac-ui-utils.js';

let isAdmin = false;
let currentUser = null;
let adminSessionPromise = null;

/**
 * Manually sets or overrides admin mode (useful for testing or direct routing).
 * 
 * @param {boolean} enabled - Whether admin mode is active
 * @param {Object|null} user - The user object
 */
export function setAdminMode(enabled, user = null) {
    isAdmin = !!enabled;
    currentUser = user;
    adminSessionPromise = Promise.resolve(isAdmin);
}

/**
 * Returns current admin mode state.
 * 
 * @returns {boolean}
 */
export function getAdminMode() {
    return isAdmin;
}

/**
 * Returns current logged-in admin user metadata.
 * 
 * @returns {Object|null}
 */
export function getCurrentUser() {
    return currentUser;
}

/**
 * Silently detects if the current visitor has an active Supabase session
 * with 'Admin' or 'Engineer' roles from the Staff Portal.
 * Caches the in-flight/resolved promise to avoid duplicate network roundtrips.
 * 
 * @returns {Promise<boolean>}
 */
export async function detectAdminSession() {
    if (adminSessionPromise) {
        return adminSessionPromise;
    }

    adminSessionPromise = (async () => {
        try {
            if (!supabase || !supabase.auth) return isAdmin;
            const { data } = await supabase.auth.getUser();
            const user = data?.user;
            if (user) {
                const hasAccess = await checkAccess(user.id, ['Admin', 'Engineer']);
                if (hasAccess) {
                    isAdmin = true;
                    currentUser = user;
                    return true;
                }
            }
        } catch (e) {
            // Silently treat as public visitor
        }
        return isAdmin;
    })();

    return adminSessionPromise;
}

/**
 * Renders the top administrative action bar into `#ac-admin-bar-container` or active view.
 * 
 * @param {string} [activeTab='sources'] - Currently active tab
 * @param {Object} [tabRegistry=null] - Optional tab registry for dynamic action button generation
 */
export function renderAdminBar(activeTab = 'sources', tabRegistry = null) {
    const adminBarContainer = document.getElementById('ac-admin-bar-container');
    const fallbackView = document.getElementById(`ac-view-${activeTab}`) || document.getElementById('ac-view-sources');
    const target = adminBarContainer || fallbackView;
    if (!target) return;

    if (!isAdmin) {
        const existing = document.getElementById('sources-admin-bar');
        if (existing) existing.remove();
        if (adminBarContainer) adminBarContainer.innerHTML = '';
        return;
    }

    const existing = document.getElementById('sources-admin-bar');
    if (existing && existing.parentElement === target && existing.dataset.tab === activeTab) {
        return;
    }
    if (existing) {
        existing.remove();
    }

    let actionsHtml = '';
    const staffPortalHref = getStaffPortalUrl();
    const tabConfig = tabRegistry?.[activeTab];
    if (tabConfig?.adminActions) {
        actionsHtml = tabConfig.adminActions.map(action => `
            <button id="${esc(action.id)}" class="ac-btn-admin ${action.primary ? 'ac-btn-primary' : 'ac-btn-secondary'}">${esc(action.label)}</button>
        `).join('') + `<a href="${staffPortalHref}" class="ac-btn-admin ac-btn-secondary">Staff Portal</a>`;
    } else if (activeTab === 'classes') {
        actionsHtml = `
            <button id="btn-add-class-subclass" class="ac-btn-admin ac-btn-primary">+ Add Class/Subclass</button>
            <a href="${staffPortalHref}" class="ac-btn-admin ac-btn-secondary">Staff Portal</a>
        `;
    } else if (activeTab === 'backgrounds') {
        actionsHtml = `
            <button id="btn-add-background" class="ac-btn-admin ac-btn-primary">+ Add Background</button>
            <a href="${staffPortalHref}" class="ac-btn-admin ac-btn-secondary">Staff Portal</a>
        `;
    } else if (activeTab === 'races') {
        actionsHtml = `
            <button id="btn-add-race" class="ac-btn-admin ac-btn-primary">+ Add Race</button>
            <button id="btn-add-subrace" class="ac-btn-admin ac-btn-secondary">+ Add Subrace</button>
            <a href="${staffPortalHref}" class="ac-btn-admin ac-btn-secondary">Staff Portal</a>
        `;
    } else {
        actionsHtml = `
            <button id="btn-add-source" class="ac-btn-admin ac-btn-primary">+ Add New Source</button>
            <button id="btn-manage-options" class="ac-btn-admin ac-btn-secondary">⚙️ Configure Options</button>
            <a href="${staffPortalHref}" class="ac-btn-admin ac-btn-secondary">Staff Portal</a>
        `;
    }

    const barHtml = `
        <div class="ac-admin-bar" id="sources-admin-bar" data-tab="${esc(activeTab)}">
            <div class="ac-admin-badge">
                <span class="badge-icon">🛡️</span>
                <span>Staff Mode: <strong>${esc(currentUser?.user_metadata?.full_name || currentUser?.email || 'Admin/Engineer')}</strong></span>
            </div>
            <div class="ac-admin-actions">
                ${actionsHtml}
            </div>
        </div>
    `;

    if (adminBarContainer) {
        adminBarContainer.innerHTML = barHtml;
    } else {
        fallbackView.insertAdjacentHTML('afterbegin', barHtml);
    }

    // Attach button listeners based on config or defaults
    if (tabConfig?.adminActions) {
        tabConfig.adminActions.forEach(action => {
            const btn = document.getElementById(action.id);
            if (btn && action.event) {
                btn.addEventListener('click', () => {
                    window.dispatchEvent(new CustomEvent(action.event));
                });
            }
        });
    } else {
        document.getElementById('btn-add-source')?.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('ac:open-source-form'));
        });
        document.getElementById('btn-manage-options')?.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('ac:open-options-manager'));
        });
        document.getElementById('btn-add-class-subclass')?.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('ac:open-class-form'));
        });
        document.getElementById('btn-add-class')?.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('ac:open-class-form'));
        });
        document.getElementById('btn-add-background')?.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('ac:open-background-form'));
        });
        document.getElementById('btn-add-race')?.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('ac:open-new-race-form'));
        });
        document.getElementById('btn-add-subrace')?.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('ac:open-race-form'));
        });
    }
}
