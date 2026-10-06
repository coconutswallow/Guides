/**
 * ================================================================
 * AC MAIN CONTROLLER
 * ================================================================
 * 
 * Central orchestrator and tab registry for the Allowed Content suite.
 * Modular architecture allows seamless addition of new tabs (Feats,
 * Classes, Spells, Equipment, Bastions, Backgrounds, Downtime, etc.)
 * via declarative configuration in TAB_REGISTRY.
 * 
 * Responsibilities:
 * - Bootstrapping the application on `DOMContentLoaded`.
 * - Managing declarative tab routing and deep-linking via URL hashes.
 * - Delegating search inputs to active feature modules through the registry.
 * - Coordinating staff admin mode and shell rendering across tabs.
 * - Handling global cache updates and event broadcasts.
 * 
 * @module ACMain
 */

import { initSources, filterSources } from './ac-sources.js';
import { initRaces, filterRaces } from './ac-races.js';
import { initClasses, filterClasses, openClassForm } from './ac-classes.js';
import { detectAdminSession, renderAdminBar } from './ac-auth.js';
import { initTooltips, debounce } from './ac-ui-utils.js';
import { getSourcesCached } from './ac-service.js';

/**
 * Configuration for an action button in the staff administrative toolbar.
 * 
 * @typedef {Object} AdminAction
 * @property {string} id - Unique HTML element ID for the button
 * @property {string} label - User-facing button text
 * @property {boolean} primary - True to render with primary brand accent styling
 * @property {string} event - Global CustomEvent name dispatched on click (e.g. 'ac:open-source-form')
 */

/**
 * Declarative configuration structure for an Allowed Content feature tab.
 * To introduce a new tab to the application, developers only need to define
 * an entry conforming to this typedef in TAB_REGISTRY.
 * 
 * @typedef {Object} TabConfig
 * @property {string} id - Route/tab key matching data-tab attribute (e.g. 'sources', 'races')
 * @property {string} viewId - HTML ID of the view container element (e.g. 'ac-view-sources')
 * @property {string} searchPlaceholder - Input placeholder text shown when this tab is active
 * @property {function(boolean=): Promise<void>} init - Async initialization function supporting in-memory cache
 * @property {function(string): void} filter - Synchronous text filter function receiving the query
 * @property {Array<AdminAction>} [adminActions] - Action buttons rendered in staff admin bar
 */

/**
 * Central Tab Registry
 * 
 * Scalability Pattern:
 * Decouples the main controller from feature implementations. Each tab is a self-contained
 * plugin registered here. Navigation, search delegation, and staff actions dynamically adapt.
 * 
 * @type {Record<string, TabConfig>}
 */
export const TAB_REGISTRY = {
    sources: {
        id: 'sources',
        viewId: 'ac-view-sources',
        searchPlaceholder: 'Search sources (name, abbreviation, key)...',
        init: (forceRefresh) => initSources(forceRefresh),
        filter: (term) => filterSources(term),
        adminActions: [
            { id: 'btn-add-source', label: '+ Add New Source', primary: true, event: 'ac:open-source-form' },
            { id: 'btn-manage-options', label: '⚙️ Configure Options', primary: false, event: 'ac:open-options-manager' }
        ]
    },
    races: {
        id: 'races',
        viewId: 'ac-view-races',
        searchPlaceholder: 'Search species, subraces, sources, traits, ASI...',
        init: (forceRefresh) => initRaces(forceRefresh),
        filter: (term) => filterRaces(term),
        adminActions: [
            { id: 'btn-add-race', label: '+ Add Race', primary: true, event: 'ac:open-new-race-form' },
            { id: 'btn-add-subrace', label: '+ Add Subrace', primary: false, event: 'ac:open-race-form' }
        ]
    },
    classes: {
        id: 'classes',
        viewId: 'ac-view-classes',
        searchPlaceholder: 'Search classes, subclasses, rulesets, categories, sources...',
        init: (forceRefresh) => initClasses(forceRefresh),
        filter: (term) => filterClasses(term),
        adminActions: [
            { id: 'btn-add-class', label: '+ Add Class', primary: true, event: 'ac:open-new-class-form' },
            { id: 'btn-add-subclass', label: '+ Add Subclass', primary: false, event: 'ac:open-class-form' }
        ]
    }
};

const VALID_TABS = Object.keys(TAB_REGISTRY);

/**
 * Initializes the Allowed Content application.
 */
async function init() {
    console.log('AC UI: Initializing...');
    
    // Preload sources cache in background for instant lookups across all tabs
    getSourcesCached().catch(err => console.warn('Sources cache preload failed:', err));
    
    // Detect staff session and render global admin bar if user has Admin/Engineer roles
    detectAdminSession().then(isAdmin => {
        if (isAdmin) {
            const activeTab = document.querySelector('.ac-tab.active')?.dataset.tab || 'sources';
            renderAdminBar(activeTab, TAB_REGISTRY);
        }
    }).catch(err => console.warn('Admin session check failed:', err));

    // Listen for sources mutations across tabs to ensure in-memory cache and views remain synced
    window.addEventListener('ac:sources-updated', async () => {
        await getSourcesCached(true);
        const activeTab = document.querySelector('.ac-tab.active')?.dataset.tab;
        const currentTabConfig = TAB_REGISTRY[activeTab];
        if (currentTabConfig?.init) {
            await currentTabConfig.init(true);
        }
    });

    // Listen for races mutations across tabs to ensure view remains synced
    window.addEventListener('ac:races-updated', async () => {
        const activeTab = document.querySelector('.ac-tab.active')?.dataset.tab;
        if (activeTab === 'races') {
            await TAB_REGISTRY.races.init(true);
        }
    });

    // Listen for classes mutations across tabs to ensure view remains synced
    window.addEventListener('ac:classes-updated', async () => {
        const activeTab = document.querySelector('.ac-tab.active')?.dataset.tab;
        if (activeTab === 'classes') {
            await TAB_REGISTRY.classes.init(true);
        }
    });

    // Listen for admin toolbar actions to open class and subclass forms
    window.addEventListener('ac:open-class-form', () => {
        openClassForm(null, null, false, 'subclass');
    });
    window.addEventListener('ac:open-new-class-form', () => {
        openClassForm(null, null, false, 'class');
    });

    // Initialize common UI utilities
    initTooltips();
    setupTabHandlers();
    
    // Set up modal close handler
    const closeBtn = document.getElementById('ac-modal-close');
    const modal = document.getElementById('ac-detail-modal');
    if (closeBtn && modal) {
        closeBtn.onclick = () => modal.close();
        modal.onclick = (e) => {
            if (e.target === modal) modal.close();
        };
    }

    // Set up global search router with 150ms debounce
    // This dramatically reduces CPU cycles and prevents DOM thrashing while typing
    const searchInput = document.getElementById('ac-global-search');
    if (searchInput) {
        const debouncedFilter = debounce((term) => {
            const activeTab = document.querySelector('.ac-tab.active')?.dataset.tab || 'sources';
            const currentTabConfig = TAB_REGISTRY[activeTab];
            if (currentTabConfig?.filter) {
                currentTabConfig.filter(term);
            }
        }, 150);

        searchInput.addEventListener('input', (e) => {
            debouncedFilter(e.target.value);
        });
    }

    // Handle initial routing (deep links)
    const hash = window.location.hash.substring(1);
    const initialTab = VALID_TABS.includes(hash) ? hash : 'sources';
    await switchTab(initialTab, false);

    // Listen for hash changes (back/forward navigation)
    window.addEventListener('hashchange', () => {
        const newHash = window.location.hash.substring(1);
        if (VALID_TABS.includes(newHash)) switchTab(newHash, false);
    });
    
    console.log('AC UI: Ready.');
}

/**
 * Switch to a specific tab and optionally update the URL hash.
 * 
 * @param {string} targetTab - The tab ID to switch to
 * @param {boolean} updateHash - Whether to update the URL fragment
 */
async function switchTab(targetTab = 'sources', updateHash = true) {
    const tabs = document.querySelectorAll('.ac-tab');
    const tabBtn = Array.from(tabs).find(t => t.dataset.tab === targetTab);
    const tabConfig = TAB_REGISTRY[targetTab];
    
    if (!tabBtn || tabBtn.classList.contains('disabled') || !tabConfig) {
        if (targetTab !== 'sources') switchTab('sources', false);
        return;
    }

    // If already active and not a fresh hash change, initialize and return
    if (tabBtn.classList.contains('active') && !updateHash) {
        if (tabConfig.init) await tabConfig.init(false);
        return;
    }

    console.log(`AC UI: Switching to ${targetTab}`);
    
    // Update active tab UI
    tabs.forEach(t => t.classList.remove('active'));
    tabBtn.classList.add('active');
    
    // Hide all views, show target view
    document.querySelectorAll('.ac-view').forEach(view => {
        view.classList.remove('active');
    });
    
    const targetView = document.getElementById(tabConfig.viewId);
    if (targetView) targetView.classList.add('active');

    // Update search placeholder based on tab
    const searchInput = document.getElementById('ac-global-search');
    if (searchInput) {
        searchInput.placeholder = tabConfig.searchPlaceholder || 'Search...';
    }

    // Update URL hash if requested
    if (updateHash) {
        window.location.hash = targetTab;
    }

    // Update staff admin bar for current tab
    renderAdminBar(targetTab, TAB_REGISTRY);
    
    if (tabConfig.init) {
        await tabConfig.init(false);
    }
}

/**
 * Sets up the tab switching logic.
 */
function setupTabHandlers() {
    const tabs = document.querySelectorAll('.ac-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            switchTab(tab.dataset.tab, true);
        });
    });
}

// Start the application when the DOM is ready
document.addEventListener('DOMContentLoaded', init);
