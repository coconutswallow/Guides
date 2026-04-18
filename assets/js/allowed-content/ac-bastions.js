/**
 * ================================================================
 * AC BASTIONS MODULE
 * ================================================================
 * 
 * Data handling and presentation for Bastion facilities (2024 rules).
 * 
 * Responsibilities:
 * - Rendering bastion facilities categorized by type (Basic, Special).
 * - Implementing 2-tier scrolling navigation and empty category handling.
 * - Handling search and filtering for level requirements and prerequisites.
 * - Integration with the global detail modal for facility rules.
 * 
 * @module ACBastions
 */

import { getBastions } from './ac-service.js';
import { openModal, esc, formatSnippet } from './ac-ui-utils.js';

let allBastions = [];
let filteredBastions = [];

/**
 * Initializes the Bastions view.
 */
export async function initBastions() {
    const container = document.getElementById('ac-view-bastions');
    if (!container) return;

    // Show loading state if empty
    if (allBastions.length === 0) {
        container.innerHTML = `
            <div class="ac-loading">
                <div class="spinner"></div>
                <span>Discovering Bastions...</span>
            </div>
        `;
    }

    // Fetch data
    allBastions = await getBastions();
    
    // Initial sort by Category Display Order, then by Name
    allBastions.sort((a, b) => {
        const orderA = a.category?.display_order ?? 999;
        const orderB = b.category?.display_order ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
    });

    filteredBastions = [...allBastions];

    renderBastions();
}

/**
 * Renders the Bastions view, grouping them by their Category.
 */
function renderBastions() {
    const container = document.getElementById('ac-view-bastions');
    if (!container) return;

    // Clear and build header area
    container.innerHTML = `
        <div class="ac-table-header">
            <div class="ac-filters" id="bastions-filters">
                <!-- Reserved for future specific filters -->
            </div>
            <div class="ac-stats" id="bastions-stats">
                ${filteredBastions.length} Bastions found
            </div>
        </div>
        <div id="bastions-content" class="ac-sections-container"></div>
    `;

    const content = document.getElementById('bastions-content');

    if (filteredBastions.length === 0) {
        content.innerHTML = '<div class="ac-no-results">No bastions found matching your search.</div>';
        return;
    }

    // Group bastions by category
    const groups = {};
    filteredBastions.forEach(b => {
        const catName = b.category ? b.category.name : 'Other';
        if (!groups[catName]) {
            groups[catName] = {
                name: catName,
                notes: b.category ? b.category.notes : '',
                order: b.category ? b.category.display_order : 999,
                items: []
            };
        }
        groups[catName].items.push(b);
    });

    // Sort groups based on their display_order
    const sortedGroupNames = Object.keys(groups).sort((a, b) => groups[a].order - groups[b].order);

    // Render Shortcut Chips
    const filtersContainer = document.getElementById('bastions-filters');
    if (filtersContainer) {
        filtersContainer.innerHTML = `
            <div class="ac-shortcuts">
                ${sortedGroupNames.map(name => `
                    <button class="ac-shortcut-chip" data-target="bastion-section-${name.toLowerCase().replace(/\s+/g, '-')}">
                        ${esc(name)}
                    </button>
                `).join('')}
            </div>
        `;

        filtersContainer.querySelectorAll('.ac-shortcut-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const targetId = chip.dataset.target;
                const element = document.getElementById(targetId);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }

    content.innerHTML = sortedGroupNames.map(groupName => {
        const group = groups[groupName];
        const sectionId = `bastion-section-${groupName.toLowerCase().replace(/\s+/g, '-')}`;
        return `
            <div class="ac-section-group">
                <div class="ac-section-title" id="${sectionId}">
                    <h2>${esc(group.name)}</h2>
                    ${group.notes ? `<p class="section-desc">${esc(group.notes)}</p>` : ''}
                </div>
                <div class="ac-table-wrapper">
                    <table class="ac-table">
                        <thead>
                            <tr>
                                <th class="col-name">Name</th>
                                <th class="col-source hide-mobile">Source</th>
                                <th class="col-size hide-tablet">Size</th>
                                <th class="col-prereq hide-tablet">Prerequisite</th>
                                <th class="col-cost-gp">GP Cost</th>
                                <th class="col-cost-dtp">DTP Cost</th>
                                <th class="col-description hide-mobile">Description</th>
                                <th class="col-notes hide-tablet">Rule Notes</th>
                                <th class="col-order hide-mobile">Order</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${group.items.map(b => `
                                <tr data-id="${b.id}">
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
                                    <td class="col-description hide-mobile">${formatSnippet(b.description)}</td>
                                    <td class="col-notes hide-tablet">${formatSnippet(b.notes_advice)}</td>
                                    <td class="col-order hide-mobile">${esc(b.order || '—')}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }).join('');

    // Attach row click listeners
    content.querySelectorAll('tr[data-id]').forEach(row => {
        row.addEventListener('click', () => {
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
            <div class="advice-content" style="white-space: pre-wrap;">${esc(bastion.notes_advice)}</div>
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
            b.source?.toLowerCase().includes(lower) ||
            b.notes_advice?.toLowerCase().includes(lower)
        );
    }
    renderBastions();
}
