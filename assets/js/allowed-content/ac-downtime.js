/**
 * ================================================================
 * AC DOWNTIME MODULE
 * ================================================================
 * 
 * Data handling and presentation for Downtime activities.
 * 
 * Responsibilities:
 * - Rendering downtime activities categorized by type (Training, Crafting, etc.).
 * - Implementing category scrolling and global search integration.
 * - Displaying detailed rules and mechanical outcomes in modals.
 * 
 * @module ACDowntime
 */

import { getDowntime } from './ac-service.js';
import { openModal, esc, formatSnippet } from './ac-ui-utils.js';

let allDowntime = [];
let filteredDowntime = [];

/**
 * Initializes the Downtime view.
 */
export async function initDowntime() {
    const container = document.getElementById('ac-view-downtime');
    if (!container) return;

    // Show loading state if empty
    if (allDowntime.length === 0) {
        container.innerHTML = `
            <div class="ac-loading">
                <div class="spinner"></div>
                <span>Scheduling Downtime...</span>
            </div>
        `;
    }

    allDowntime = await getDowntime();
    filteredDowntime = [...allDowntime];

    renderDowntime();
}

/**
 * Renders the Downtime view, grouping items by their Category.
 */
function renderDowntime() {
    const container = document.getElementById('ac-view-downtime');
    if (!container) return;

    // Clear and build header area
    container.innerHTML = `
        <div class="ac-table-header">
            <div class="ac-filters" id="downtime-filters"></div>
            <div class="ac-stats" id="downtime-stats">
                ${filteredDowntime.length} Activities found
            </div>
        </div>
        <div id="downtime-content" class="ac-sections-container"></div>
    `;

    const content = document.getElementById('downtime-content');

    if (filteredDowntime.length === 0) {
        content.innerHTML = '<div class="ac-no-results">No downtime activities found matching your search.</div>';
        return;
    }

    // Group items by category
    const groups = {};
    filteredDowntime.forEach(item => {
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
    const filtersContainer = document.getElementById('downtime-filters');
    if (filtersContainer) {
        filtersContainer.innerHTML = `
            <div class="ac-shortcuts">
                ${sortedGroupNames.map(name => `
                    <button class="ac-shortcut-chip" data-target="dt-section-${name.toLowerCase().replace(/\s+/g, '-')}">
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
        const sectionId = `dt-section-${groupName.toLowerCase().replace(/\s+/g, '-')}`;
        return `
            <div class="ac-section-group">
                <div class="ac-section-title" id="${sectionId}">
                    <h2>${esc(group.name)}</h2>
                    ${group.notes ? `<div class="section-desc" style="white-space: pre-wrap;">${esc(group.notes)}</div>` : ''}
                </div>
                <div class="ac-table-wrapper">
                    <table class="ac-table">
                        <thead>
                            <tr>
                                <th class="col-name">Activity</th>
                                <th class="col-gold">Gold Cost</th>
                                <th class="col-dtp">DTP Cost</th>
                                <th class="col-description hide-mobile">Description</th>
                                <th class="col-notes hide-tablet">Notes / Advice</th>
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
                                    <td class="col-gold">${esc(item.gold_cost || '—')}</td>
                                    <td class="col-dtp">${esc(item.dtp_cost || '—')}</td>
                                    <td class="col-description hide-mobile">${formatSnippet(item.description)}</td>
                                    <td class="col-notes hide-tablet">${formatSnippet(item.notes_advice)}</td>
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
            const item = allDowntime.find(i => i.id === id);
            if (item) showDowntimeDetail(item);
        });
    });
}

/**
 * Filters the downtime dataset based on a search term.
 * 
 * @param {string} term - The search string
 */
export function filterDowntime(term) {
    if (!term) {
        filteredDowntime = [...allDowntime];
    } else {
        const lower = term.toLowerCase();
        filteredDowntime = allDowntime.filter(i => 
            i.name.toLowerCase().includes(lower) ||
            i.category?.name.toLowerCase().includes(lower) ||
            i.description?.toLowerCase().includes(lower) ||
            i.notes_advice?.toLowerCase().includes(lower)
        );
    }
    renderDowntime();
}

/**
 * Shows the full detail for a specific Downtime activity in a modal.
 * 
 * @param {Object} item - The downtime record
 */
function showDowntimeDetail(item) {
    const html = `
        <div class="detail-header">
            <span class="detail-category">${esc(item.category?.name || 'Downtime')}</span>
            <h2 class="detail-title">${esc(item.name)}</h2>
        </div>

        <div class="detail-grid">
            <div class="detail-item">
                <label>Gold Cost</label>
                <value>${esc(item.gold_cost || '—')}</value>
            </div>
            <div class="detail-item">
                <label>DTP Cost</label>
                <value>${esc(item.dtp_cost || '—')}</value>
            </div>
        </div>

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
