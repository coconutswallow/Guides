/**
 * ================================================================
 * AC EQUIPMENT MODULE
 * ================================================================
 * 
 * Logic for the Equipment content set. Handles:
 * - Table rendering with grouping by Category
 * - Section headers with Category rules/notes
 * - Equipment-specific filtering and search
 * - Record detail generation
 */

import { getEquipment } from './ac-service.js';
import { openModal, esc, formatSnippet } from './ac-ui-utils.js';

let allEquipment = [];
let filteredEquipment = [];

/**
 * Initializes the Equipment view.
 */
export async function initEquipment() {
    const container = document.getElementById('ac-view-equipment');
    if (!container) return;

    // Show loading state if empty
    if (allEquipment.length === 0) {
        container.innerHTML = `
            <div class="ac-loading">
                <div class="spinner"></div>
                <span>Cataloging Equipment...</span>
            </div>
        `;
    }

    allEquipment = await getEquipment();
    filteredEquipment = [...allEquipment];

    renderEquipment();
}

/**
 * Renders the Equipment view, grouping items by their Category.
 */
function renderEquipment() {
    const container = document.getElementById('ac-view-equipment');
    if (!container) return;

    // Clear and build header area
    container.innerHTML = `
        <div class="ac-table-header">
            <div class="ac-filters" id="equipment-filters">
                <!-- Reserved for future specific filters -->
            </div>
            <div class="ac-stats" id="equipment-stats">
                ${filteredEquipment.length} Items found
            </div>
        </div>
        <div id="equipment-content" class="ac-sections-container"></div>
    `;

    const content = document.getElementById('equipment-content');

    if (filteredEquipment.length === 0) {
        content.innerHTML = '<div class="ac-no-results">No equipment found matching your search.</div>';
        return;
    }

    // Group items by category
    const groups = {};
    filteredEquipment.forEach(item => {
        const catName = item.category ? item.category.name : 'Other';
        if (!groups[catName]) {
            groups[catName] = {
                name: catName,
                notes: item.category ? item.category.notes : '',
                order: item.category ? item.category.display_order : 999,
                items: []
            };
        }
        groups[catName].items.push(item);
    });

    // Sort groups based on their display_order
    const sortedGroupNames = Object.keys(groups).sort((a, b) => groups[a].order - groups[b].order);

    // Render Shortcut Chips
    const filtersContainer = document.getElementById('equipment-filters');
    if (filtersContainer) {
        filtersContainer.innerHTML = `
            <div class="ac-shortcuts">
                ${sortedGroupNames.map(name => `
                    <button class="ac-shortcut-chip" data-target="equip-section-${name.toLowerCase().replace(/\s+/g, '-')}">
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
        const sectionId = `equip-section-${groupName.toLowerCase().replace(/\s+/g, '-')}`;
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
                                <th class="col-name">Item</th>
                                <th class="col-cost">Cost</th>
                                <th class="col-weight hide-mobile">Weight</th>
                                <th class="col-craft hide-tablet">Crafting</th>
                                <th class="col-source hide-mobile">Source</th>
                                <th class="col-notes">Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${group.items.map(item => `
                                <tr data-id="${item.id}">
                                    <td class="col-name">
                                        <div class="name-cell">
                                            <span>${esc(item.name)}</span>
                                            <span class="row-hover-icon">Details →</span>
                                        </div>
                                    </td>
                                    <td class="col-cost">${esc(item.cost_gp || '—')}</td>
                                    <td class="col-weight hide-mobile">${esc(item.weight_lbs || '—')}</td>
                                    <td class="col-craft hide-tablet">${item.craft_cost_gp ? `${esc(item.craft_cost_gp)} GP / ${esc(item.craft_cost_dtp)} DTP` : '—'}</td>
                                    <td class="col-source hide-mobile">${esc(item.source)}</td>
                                    <td class="col-notes">${formatSnippet(item.notes_advice)}</td>
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
            const id = row.dataset.id;
            const item = allEquipment.find(i => i.id === id);
            if (item) showEquipmentDetail(item);
        });
    });
}

/**
 * Filters the equipment dataset based on a search term.
 * 
 * @param {string} term - The search string
 */
export function filterEquipment(term) {
    if (!term) {
        filteredEquipment = [...allEquipment];
    } else {
        const lower = term.toLowerCase();
        filteredEquipment = allEquipment.filter(i => 
            i.name.toLowerCase().includes(lower) ||
            i.category?.name.toLowerCase().includes(lower) ||
            i.description?.toLowerCase().includes(lower) ||
            i.notes_advice?.toLowerCase().includes(lower) ||
            i.craft_reqs?.toLowerCase().includes(lower)
        );
    }
    renderEquipment();
}

/**
 * Shows the full detail for a specific Equipment item in a modal.
 * 
 * @param {Object} item - The equipment record
 */
function showEquipmentDetail(item) {
    const html = `
        <div class="detail-header">
            <span class="detail-category">${esc(item.category?.name || 'Equipment')}</span>
            <h2 class="detail-title">${esc(item.name)}</h2>
        </div>

        <div class="detail-grid">
            <div class="detail-item">
                <label>Cost</label>
                <value>${esc(item.cost_gp || '—')}</value>
            </div>
            <div class="detail-item">
                <label>Weight</label>
                <value>${esc(item.weight_lbs || '—')}</value>
            </div>
            <div class="detail-item">
                <label>Source</label>
                <value>${esc(item.source)}</value>
            </div>
        </div>

        ${item.craft_cost_gp || item.craft_reqs ? `
        <div class="detail-section">
            <h4>Crafting Details</h4>
            <div class="detail-grid" style="margin-top: 0.5rem;">
                <div class="detail-item">
                    <label>Crafting Cost (GP/DTP)</label>
                    <value>${esc(item.craft_cost_gp || '—')} GP / ${esc(item.craft_cost_dtp || '—')} DTP</value>
                </div>
            </div>
            ${item.craft_reqs ? `<div class="advice-content" style="margin-top: 0.5rem; white-space: pre-wrap;"><strong>Requirements:</strong> ${esc(item.craft_reqs)}</div>` : ''}
        </div>
        ` : ''}

        <div class="detail-section">
            <h4>Description</h4>
            <p style="white-space: pre-wrap;">${esc(item.description || 'No description available.')}</p>
        </div>

        ${item.notes_advice ? `
        <div class="detail-section">
            <h4>Notes / Advice</h4>
            <div class="advice-content" style="white-space: pre-wrap;">${esc(item.notes_advice)}</div>
        </div>
        ` : ''}
    `;

    openModal(html);
}
