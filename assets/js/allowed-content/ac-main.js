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

import { initBastions } from './ac-bastions.js';
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

    // Default to initializing the first tab (Bastions)
    await initBastions();
    
    console.log('AC UI: Ready.');
}

/**
 * Sets up the tab switching logic.
 */
function setupTabHandlers() {
    const tabs = document.querySelectorAll('.ac-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', async () => {
            if (tab.classList.contains('active') || tab.classList.contains('disabled')) return;
            
            const targetTab = tab.dataset.tab;
            console.log(`AC UI: Switching to ${targetTab}`);
            
            // Update active tab UI
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Hide all views, show target view
            document.querySelectorAll('.ac-view').forEach(view => {
                view.classList.remove('active');
            });
            
            const targetView = document.getElementById(`ac-view-${targetTab}`);
            if (targetView) targetView.classList.add('active');
            
            // Initialize tab-specific logic if not already done
            // (For now, just Bastions is implemented)
            if (targetTab === 'bastions') {
                await initBastions();
            }
        });
    });
}

// Start the application when the DOM is ready
document.addEventListener('DOMContentLoaded', init);
