/**
 * ================================================================
 * AC MAIN CONTROLLER
 * ================================================================
 * 
 * Orchestrator for the Allowed Content dashboard.
 * Currently configured for Sources tab. Additional tabs will be enabled
 * sequentially as they are developed and verified.
 * 
 * Responsibilities:
 * - Bootstrapping the application on `DOMContentLoaded`.
 * - Managing tab-based navigation and deep-linking via URL hashes.
 * - Delegating global search inputs to active feature modules.
 * - Handling core UI interactions (modals, tooltips).
 * 
 * @module ACMain
 */

import { initSources, filterSources } from './ac-sources.js';
import { initTooltips } from './ac-ui-utils.js';

/**
 * Initializes the Allowed Content application.
 */
async function init() {
    console.log('AC UI: Initializing...');
    
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

    // Set up global search router
    const searchInput = document.getElementById('ac-global-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const activeTab = document.querySelector('.ac-tab.active')?.dataset.tab || 'sources';
            const term = e.target.value;
            if (activeTab === 'sources') {
                filterSources(term);
            }
        });
    }

    // Handle initial routing (deep links)
    const hash = window.location.hash.substring(1);
    await switchTab(hash === 'sources' ? 'sources' : 'sources', false);

    // Listen for hash changes (back/forward navigation)
    window.addEventListener('hashchange', () => {
        const newHash = window.location.hash.substring(1);
        if (newHash === 'sources') switchTab('sources', false);
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
    
    if (!tabBtn || tabBtn.classList.contains('disabled')) {
        if (targetTab !== 'sources') switchTab('sources', false);
        return;
    }

    // If already active and not a fresh hash change, initialize and return
    if (tabBtn.classList.contains('active') && !updateHash) {
        if (targetTab === 'sources') await initSources();
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
    
    const targetView = document.getElementById(`ac-view-${targetTab}`);
    if (targetView) targetView.classList.add('active');

    // Update URL hash if requested
    if (updateHash) {
        window.location.hash = targetTab;
    }
    
    if (targetTab === 'sources') {
        await initSources();
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
