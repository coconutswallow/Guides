/**
 * ================================================================
 * AC LOOT MODULE
 * ================================================================
 * 
 * Data handling and presentation for the Loot content set.
 * 
 * Responsibilities:
 * - Rendering tiered loot tables (Rolled/Select Loot).
 * - Implementing the 3-tier hierarchy (Usage > Tier > Category).
 * - Extracting simplified Tier labels (T0-T4) from category names.
 * - Handling loot-specific search and item detail display.
 * 
 * @module ACLoot
 */

import { getLoot, getLootCategories } from './ac-service.js';
import { openModal, esc, formatSnippet } from './ac-ui-utils.js';

let allLoot = [];
let lootCategories = [];
let filteredLoot = [];

// Navigation State
let currentTier1 = null;
let currentTier2 = null;

/**
 * Initializes the Loot view.
 */
export async function initLoot() {
    const container = document.getElementById('ac-view-loot');
    if (!container) return;

    // Show loading state if empty
    if (allLoot.length === 0) {
        container.innerHTML = `
            <div class="ac-loading">
                <div class="spinner"></div>
                <span>Hoarding Loot...</span>
            </div>
        `;
    }

    // Fetch both categories and items in parallel
    const [categories, items] = await Promise.all([
        getLootCategories(),
        getLoot()
    ]);

    console.log(`AC Loot: Found ${categories.length} categories and ${items.length} items.`);

    // Pre-parse categories for tiered navigation
    lootCategories = categories.map(cat => {
        const parts = cat.name.split(' - ').map(p => p.trim());
        const rawTier2 = parts[1] || 'General';
        
        // Extract T0-T4 from parts[1] if present, e.g. "T1 Items" -> "T1"
        const tierMatch = rawTier2.match(/(T[0-4])/i);
        const tierLabel = tierMatch ? tierMatch[1].toUpperCase() : rawTier2;

        return {
            ...cat,
            tier1: parts[0] || 'Unknown',
            tier2: tierLabel,
            tier2_full: rawTier2, // Keep original for filtering if needed
            tier3: parts[2] || (parts[1] && !tierMatch ? parts[1] : parts[0]) 
        };
    });

    allLoot = items;
    filteredLoot = [...allLoot];

    renderLoot();
}

/**
 * Renders the Loot view.
 */
function renderLoot() {
    const container = document.getElementById('ac-view-loot');
    if (!container) return;

    // Build header structure
    container.innerHTML = `
        <div class="ac-table-header">
            <div id="loot-nav" class="ac-monster-nav">
                <!-- Tiered navigation chips -->
            </div>
            <div class="ac-stats" id="loot-stats">
                ${filteredLoot.length} Items found
            </div>
        </div>
        <div id="loot-content" class="ac-sections-container"></div>
    `;

    renderLootNavigation();

    const content = document.getElementById('loot-content');

    // Create a map of category ID -> array of filtered items
    const itemMap = {};
    filteredLoot.forEach(item => {
        const catId = (typeof item.category_id === 'object' ? item.category_id?.id : item.category_id) || item.category?.id;
        
        if (catId) {
            if (!itemMap[catId]) itemMap[catId] = [];
            itemMap[catId].push(item);
        }
    });

    // Render all categories sequentially
    content.innerHTML = lootCategories.map(cat => {
        const items = itemMap[cat.id] || [];
        const sectionId = `loot-section-${cat.id}`;
        
        return `
            <div class="ac-section-group">
                <div class="ac-section-title" id="${sectionId}">
                    <h2>${esc(cat.name)}</h2>
                    ${cat.notes ? `<div class="section-desc" style="white-space: pre-wrap;">${esc(cat.notes)}</div>` : ''}
                </div>
                
                ${items.length > 0 ? `
                    <div class="ac-table-wrapper">
                        <table class="ac-table">
                            <thead>
                                <tr>
                                    <th class="col-name">Name</th>
                                    <th class="col-source hide-mobile">Source</th>
                                    <th class="col-type hide-tablet">Type</th>
                                    <th class="col-tier hide-tablet">Tier</th>
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
                                        <td class="col-tier hide-tablet">${esc(item.tier || '—')}</td>
                                        <td class="col-description hide-mobile">${formatSnippet(item.description)}</td>
                                        <td class="col-notes">${formatSnippet(item.notes_advice)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');

    // Attach row click listeners
    content.querySelectorAll('tr[data-id]').forEach(row => {
        row.addEventListener('click', () => {
            const id = row.dataset.id;
            const item = allLoot.find(i => i.id === id);
            if (item) showLootDetail(item);
        });
    });
}

/**
 * Renders the 3-tier drill-down navigation for Loot.
 */
function renderLootNavigation() {
    const navContainer = document.getElementById('loot-nav');
    if (!navContainer) return;

    const tier1Options = [...new Set(lootCategories.map(c => c.tier1))].sort();
    const tier2Options = currentTier1 
        ? [...new Set(lootCategories.filter(c => c.tier1 === currentTier1).map(c => c.tier2))].sort()
        : [];
    const tier3Options = (currentTier1 && currentTier2)
        ? lootCategories.filter(c => c.tier1 === currentTier1 && c.tier2 === currentTier2)
        : [];

    navContainer.innerHTML = `
        <div class="ac-shortcuts-row">
            <span class="nav-label">Usage:</span>
            <div class="ac-shortcuts">
                <button class="ac-shortcut-chip ${!currentTier1 ? 'active' : ''}" data-type="tier1" data-value="">All</button>
                ${tier1Options.map(opt => `
                    <button class="ac-shortcut-chip ${currentTier1 === opt ? 'active' : ''}" data-type="tier1" data-value="${esc(opt)}">
                        ${esc(opt)}
                    </button>
                `).join('')}
            </div>
        </div>

        ${currentTier1 ? `
            <div class="ac-shortcuts-row">
                <span class="nav-label">Tier:</span>
                <div class="ac-shortcuts ac-shortcuts-tier2">
                    <button class="ac-shortcut-chip ${!currentTier2 ? 'active' : ''}" data-type="tier2" data-value="">All</button>
                    ${tier2Options.map(opt => `
                        <button class="ac-shortcut-chip ${currentTier2 === opt ? 'active' : ''}" data-type="tier2" data-value="${esc(opt)}">
                            ${esc(opt)}
                        </button>
                    `).join('')}
                </div>
            </div>
        ` : ''}

        ${currentTier2 ? `
            <div class="ac-shortcuts-row">
                <span class="nav-label">Category:</span>
                <div class="ac-shortcuts ac-shortcuts-tier3">
                    ${tier3Options.map(cat => `
                        <button class="ac-shortcut-chip" data-type="scroll" data-target="loot-section-${cat.id}">
                            ${esc(cat.tier3)}
                        </button>
                    `).join('')}
                </div>
            </div>
        ` : ''}
    `;

    navContainer.querySelectorAll('.ac-shortcut-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const { type, value, target } = chip.dataset;
            if (type === 'tier1') {
                currentTier1 = value || null;
                currentTier2 = null;
                renderLoot();
            } else if (type === 'tier2') {
                currentTier2 = value || null;
                renderLoot();
            } else if (type === 'scroll') {
                const element = document.getElementById(target);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
    });
}

/**
 * Filters the loot dataset based on a search term.
 */
export function filterLoot(term) {
    if (!term) {
        filteredLoot = [...allLoot];
    } else {
        const lower = term.toLowerCase();
        filteredLoot = allLoot.filter(i => 
            i.name.toLowerCase().includes(lower) ||
            i.source.toLowerCase().includes(lower) ||
            i.description?.toLowerCase().includes(lower) ||
            i.notes_advice?.toLowerCase().includes(lower) ||
            i.type?.toLowerCase().includes(lower) ||
            i.tier?.toLowerCase().includes(lower)
        );
    }
    renderLoot();
}

/**
 * Shows the full detail for a specific Loot item in a modal.
 */
function showLootDetail(item) {
    const html = `
        <div class="detail-header">
            <span class="detail-category">${esc(item.category?.name || 'Loot')}</span>
            <h2 class="detail-title">${esc(item.name)}</h2>
        </div>

        <div class="detail-grid">
            <div class="detail-item">
                <label>Source</label>
                <value>${esc(item.source)}</value>
            </div>
            <div class="detail-item">
                <label>Type / Tier</label>
                <value>${esc(item.type || '—')} / ${esc(item.tier || '—')}</value>
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
