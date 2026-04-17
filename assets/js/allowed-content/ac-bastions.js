/**
 * ================================================================
 * AC BASTIONS MODULE
 * ================================================================
 * 
 * Logic for the Bastions content set. Handles:
 * - Table rendering and formatting
 * - Bastion-specific filtering and search
 * - Record detail generation
 */

import { getBastions } from './ac-service.js';
import { openModal, esc } from './ac-ui-utils.js';

let allBastions = [];
let filteredBastions = [];

/**
 * Initializes the Bastions view.
 */
export async function initBastions() {
    const tbody = document.getElementById('bastions-tbody');
    if (!tbody) return;

    // Fetch data
    allBastions = await getBastions();
    
    // Sort by Category Display Order, then by Name
    allBastions.sort((a, b) => {
        const orderA = a.category?.display_order ?? 999;
        const orderB = b.category?.display_order ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
    });

    filteredBastions = [...allBastions];

    renderBastionTable();
    setupEventHandlers();
}

/**
 * Renders the Bastions table with the current filtered dataset.
 */
function renderBastionTable() {
    const tbody = document.getElementById('bastions-tbody');
    if (!tbody) return;

    if (filteredBastions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 2rem;">No bastions found matching your search.</td></tr>';
        return;
    }

    tbody.innerHTML = filteredBastions.map(b => `
        <tr data-id="${b.id}">
            <td class="col-category">
                <span class="category-lookup" data-tooltip="<h5>${esc(b.category?.name)}</h5>${esc(b.category?.notes)}">
                    ${esc(b.category?.name)} <span class="info-icon">ⓘ</span>
                </span>
            </td>
            <td class="col-name">
                <div class="name-cell">
                    <span>${esc(b.name)}</span>
                    <span class="row-hover-icon">Details →</span>
                </div>
            </td>
            <td class="col-source hide-mobile">${esc(b.source)}</td>
            <td class="col-size hide-tablet">${esc(b.size)}</td>
            <td class="col-prereq hide-tablet">${esc(b.building_prerequisite || '—')}</td>
            <td class="col-cost-gp">${esc(b.cost_gp)}</td>
            <td class="col-cost-dtp">${esc(b.cost_dtp)}</td>
            <td class="col-order hide-mobile">${esc(b.order || '—')}</td>
        </tr>
    `).join('');

    // Attach row click listeners
    tbody.querySelectorAll('tr').forEach(row => {
        row.addEventListener('click', (e) => {
            // Don't trigger if category lookup span was clicked
            if (e.target.closest('.category-lookup')) return;
            const bastionId = row.dataset.id;
            const bastion = allBastions.find(b => b.id === bastionId);
            if (bastion) showBastionDetail(bastion);
        });
    });
}

/**
 * Shows the full detail for a specific Bastion in a modal.
 * 
 * @param {Object} bastion - The bastion record
 */
function showBastionDetail(bastion) {
    const html = `
        <div class="detail-header">
            <span class="detail-category">${esc(bastion.category?.name)}</span>
            <h2 class="detail-title">${esc(bastion.name)}</h2>
        </div>

        <div class="category-notes-box" style="margin-top: 0; margin-bottom: 2rem;">
            <h5>${esc(bastion.category?.name)}</h5>
            <p style="font-size: 0.9rem; opacity: 0.8; white-space: pre-wrap;">${esc(bastion.category?.notes)}</p>
        </div>

        <div class="detail-grid">
            <div class="detail-item">
                <label>Source</label>
                <value>${esc(bastion.source)}</value>
            </div>
            <div class="detail-item">
                <label>Size</label>
                <value>${esc(bastion.size)}</value>
            </div>
            <div class="detail-item">
                <label>Prerequisite</label>
                <value>${esc(bastion.building_prerequisite || 'None')}</value>
            </div>
            <div class="detail-item">
                <label>GP Cost</label>
                <value>${esc(bastion.cost_gp)}</value>
            </div>
            <div class="detail-item">
                <label>DTP Cost</label>
                <value>${esc(bastion.cost_dtp)}</value>
            </div>
            <div class="detail-item">
                <label>Order</label>
                <value>${esc(bastion.order || 'None')}</value>
            </div>
        </div>

        <div class="detail-section">
            <h4>Description</h4>
            <p>${esc(bastion.description)}</p>
        </div>

        ${bastion.notes_advice ? `
        <div class="detail-section">
            <h4>Notes / Advice</h4>
            <p style="white-space: pre-wrap;">${esc(bastion.notes_advice)}</p>
        </div>
        ` : ''}
    `;

    openModal(html);
}

/**
 * Filters the dataset based on a search term.
 * 
 * @param {string} searchTerm - The string to search for
 */
export function filterBastions(searchTerm) {
    if (!searchTerm) {
        filteredBastions = [...allBastions];
    } else {
        const lower = searchTerm.toLowerCase();
        filteredBastions = allBastions.filter(b => 
            b.name.toLowerCase().includes(lower) ||
            b.category?.name.toLowerCase().includes(lower) ||
            b.description?.toLowerCase().includes(lower) ||
            b.source?.toLowerCase().includes(lower)
        );
    }
    renderBastionTable();
}

/**
 * Sets up global handlers for the Bastions view.
 * (Search logic is now handled by ac-main for consistency)
 */
function setupEventHandlers() {
    // Handled in ac-main.js
}
