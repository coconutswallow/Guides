/**
 * ================================================================
 * AC ITEM PROPERTIES MODULE
 * ================================================================
 * 
 * Data handling and presentation for Item Properties and Mastery 
 * properties (2024 rules).
 * 
 * Responsibilities:
 * - Rendering specialized property tables categorized by item type.
 * - Implementing category scrolling and global search integration.
 * - Displaying detailed property mechanics and rules in modals.
 * 
 * @module ACItemProperties
 */

import { getItemProperties, getItemPropertiesCategories } from './ac-service.js';
import { openModal, esc, formatSnippet } from './ac-ui-utils.js';

let allProperties = [];
let propertyCategories = [];
let filteredProperties = [];

/**
 * Initializes the Item Properties view.
 */
export async function initItemProperties() {
    const container = document.getElementById('ac-view-item-properties');
    if (!container) return;

    // Show loading state if empty
    if (allProperties.length === 0) {
        container.innerHTML = `
            <div class="ac-loading">
                <div class="spinner"></div>
                <span>Identifying Properties...</span>
            </div>
        `;
    }

    // Fetch both categories and items in parallel
    const [categories, items] = await Promise.all([
        getItemPropertiesCategories(),
        getItemProperties()
    ]);

    console.log(`AC Item Properties: Found ${categories.length} categories and ${items.length} items.`);

    propertyCategories = categories;
    allProperties = items;
    filteredProperties = [...allProperties];

    renderItemProperties();
}

/**
 * Renders the Item Properties view.
 */
function renderItemProperties() {
    const container = document.getElementById('ac-view-item-properties');
    if (!container) return;

    // Clear and build header area
    container.innerHTML = `
        <div class="ac-table-header">
            <div class="ac-filters" id="property-filters"></div>
            <div class="ac-stats" id="property-stats">
                ${filteredProperties.length} Properties found
            </div>
        </div>
        <div id="property-content" class="ac-sections-container"></div>
    `;

    const content = document.getElementById('property-content');

    // Create a map of category ID -> array of filtered items
    const itemMap = {};
    filteredProperties.forEach(item => {
        const catId = (typeof item.category_id === 'object' ? item.category_id?.id : item.category_id) || item.category?.id;
        
        if (catId) {
            if (!itemMap[catId]) itemMap[catId] = [];
            itemMap[catId].push(item);
        }
    });

    // Render Shortcut Chips (Top Level Only)
    const filtersContainer = document.getElementById('property-filters');
    if (filtersContainer) {
        const topLevelMap = new Map();
        propertyCategories.forEach(cat => {
            const topName = cat.name.split(' - ')[0];
            if (!topLevelMap.has(topName)) {
                topLevelMap.set(topName, `property-section-${cat.id}`);
            }
        });

        filtersContainer.innerHTML = `
            <div class="ac-shortcuts">
                ${Array.from(topLevelMap.entries()).map(([name, targetId]) => `
                    <button class="ac-shortcut-chip" data-target="${targetId}">
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

    // Filter categories to only those that have items matching the current search
    const activeCategories = propertyCategories.filter(cat => (itemMap[cat.id] || []).length > 0);

    if (activeCategories.length === 0) {
        content.innerHTML = '<div class="ac-no-results">No properties found matching your search.</div>';
        return;
    }

    // Render active categories sequentially
    content.innerHTML = activeCategories.map(cat => {
        const items = itemMap[cat.id] || [];
        const sectionId = `property-section-${cat.id}`;
        
        return `
            <div class="ac-section-group">
                <div class="ac-section-title" id="${sectionId}">
                    <h2>${esc(cat.name)}</h2>
                    ${cat.notes ? `<div class="section-desc" style="white-space: pre-wrap;">${esc(cat.notes)}</div>` : ''}
                </div>
                
                <div class="ac-table-wrapper">
                    <table class="ac-table">
                        <thead>
                            <tr>
                                <th class="col-name">Property Name</th>
                                <th class="col-source hide-mobile">Source</th>
                                <th class="col-type hide-tablet">Type</th>
                                <th class="col-subcat hide-tablet">Sub-Category</th>
                                <th class="col-description hide-mobile">Description</th>
                                <th class="col-notes">Notes / Advice</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(item => `
                                <tr data-id="${item.id}">
                                    <td class="col-name">
                                        <div class="name-cell">
                                            <span>${esc(item.name)}</span>
                                            <span class="row-hover-icon">Details →</span>
                                        </div>
                                    </td>
                                    <td class="col-source hide-mobile">${esc(item.source)}</td>
                                    <td class="col-type hide-tablet">${esc(item.type || '—')}</td>
                                    <td class="col-subcat hide-tablet">${esc(item.category_sub || '—')}</td>
                                    <td class="col-description hide-mobile">${formatSnippet(item.description)}</td>
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
            const property = allProperties.find(p => p.id === id);
            if (property) showPropertyDetail(property);
        });
    });
}

/**
 * Filters the property dataset based on a search term.
 * 
 * @param {string} term - The search string
 */
export function filterItemProperties(term) {
    if (!term) {
        filteredProperties = [...allProperties];
    } else {
        const lower = term.toLowerCase();
        filteredProperties = allProperties.filter(p => 
            p.name.toLowerCase().includes(lower) ||
            p.source.toLowerCase().includes(lower) ||
            p.description?.toLowerCase().includes(lower) ||
            p.notes_advice?.toLowerCase().includes(lower) ||
            p.type?.toLowerCase().includes(lower) ||
            p.category_sub?.toLowerCase().includes(lower)
        );
    }
    renderItemProperties();
}

/**
 * Shows the full detail for a specific Item Property in a modal.
 * 
 * @param {Object} item - The property record
 */
function showPropertyDetail(item) {
    const html = `
        <div class="detail-header">
            <span class="detail-category">${esc(item.category?.name || 'Item Property')}</span>
            <h2 class="detail-title">${esc(item.name)}</h2>
        </div>

        <div class="detail-grid">
            <div class="detail-item">
                <label>Source</label>
                <value>${esc(item.source)}</value>
            </div>
            <div class="detail-item">
                <label>Type / Sub-Category</label>
                <value>${esc(item.type || '—')} / ${esc(item.category_sub || '—')}</value>
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
