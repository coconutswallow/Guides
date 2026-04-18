/**
 * ================================================================
 * AC MAIN CONTROLLER
 * ================================================================
 * 
 * Orchestrates the Allowed Content UI. Handles:
 * - Tab switching logic
 * - Global initialization
 * - Event delegation for common UI elements
 */

import { initRaces, filterRaces } from './ac-races.js';
import { initClasses, filterClasses } from './ac-classes.js';
import { initBackgrounds, filterBackgrounds } from './ac-backgrounds.js';
import { initFeats, filterFeats } from './ac-feats.js';
import { initSpells, filterSpells } from './ac-spells.js';
import { initLanguages, filterLanguages } from './ac-languages.js';
import { initMiscFeats, filterMiscFeats } from './ac-misc-feats.js';
import { initBastions, filterBastions } from './ac-bastions.js';
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
            const activeTab = document.querySelector('.ac-tab.active')?.dataset.tab;
            const term = e.target.value;
            switch (activeTab) {
                case 'races':
                    filterRaces(term);
                    break;
                case 'classes':
                    filterClasses(term);
                    break;
                case 'backgrounds':
                    filterBackgrounds(term);
                    break;
                case 'feats':
                    filterFeats(term);
                    break;
                case 'spells':
                    filterSpells(term);
                    break;
                case 'languages':
                    filterLanguages(term);
                    break;
                case 'misc-feats':
                    filterMiscFeats(term);
                    break;
                case 'bastions':
                    filterBastions(term);
                    break;
            }
        });
    }

    // Handle initial routing (deep links)
    const hash = window.location.hash.substring(1);
    if (hash) {
        await switchTab(hash, false);
    } else {
        // Default to first tab
        await switchTab('races', false);
    }

    // Listen for hash changes (back/forward navigation)
    window.addEventListener('hashchange', () => {
        const newHash = window.location.hash.substring(1);
        if (newHash) switchTab(newHash, false);
    });
    
    console.log('AC UI: Ready.');
}

/**
 * Switch to a specific tab and optionally update the URL hash.
 * 
 * @param {string} targetTab - The tab ID to switch to (e.g., 'races', 'bastions')
 * @param {boolean} updateHash - Whether to update the URL fragment
 */
async function switchTab(targetTab, updateHash = true) {
    const tabs = document.querySelectorAll('.ac-tab');
    const tabBtn = Array.from(tabs).find(t => t.dataset.tab === targetTab);
    
    if (!tabBtn || tabBtn.classList.contains('disabled')) {
        // Fallback to races if invalid tab
        if (targetTab !== 'races') switchTab('races', false);
        return;
    }

    // If already active and not a fresh hash change, skip
    if (tabBtn.classList.contains('active') && !updateHash) return;

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
    
    // Initialize tab-specific logic if not already done
    switch (targetTab) {
        case 'races':
            await initRaces();
            break;
        case 'classes':
            await initClasses();
            break;
        case 'backgrounds':
            await initBackgrounds();
            break;
        case 'feats':
            await initFeats();
            break;
        case 'spells':
            await initSpells();
            break;
        case 'languages':
            await initLanguages();
            break;
        case 'misc-feats':
            await initMiscFeats();
            break;
        case 'bastions':
            await initBastions();
            break;
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
