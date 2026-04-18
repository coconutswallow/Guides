/**
 * ================================================================
 * AC SOURCES MODULE
 * ================================================================
 * 
 * Data handling and presentation for the Sources content set.
 * 
 * Responsibilities:
 * - Rendering the hierarchical source catalog.
 * - Implementing 3-tier navigation (Usage > Series > Group).
 * - Handling source-specific search and detail display.
 * - Integration with the Resource link metadata.
 * 
 * @module ACSources
 */

import { getSources, getSourceCategories } from './ac-service.js';
import { openModal, esc, formatSnippet, getUniqueSortedLabels } from './ac-ui-utils.js';

let allSources = [];
let sourceCategories = [];
let filteredSources = [];

// Navigation State
let currentTier1 = null;
let currentTier2 = null;

/**
 * Initializes the Sources view.
 */
export async function initSources() {
    const container = document.getElementById('ac-view-sources');
    if (!container) return;

    // Show loading state if empty
    if (allSources.length === 0) {
        container.innerHTML = `
            <div class="ac-loading">
                <div class="spinner"></div>
                <span>Cataloging Sources...</span>
            </div>
        `;
    }

    // Fetch both categories and items in parallel
    const [categories, items] = await Promise.all([
        getSourceCategories(),
        getSources()
    ]);

    console.log(`AC Sources: Found ${categories.length} categories and ${items.length} items.`);

    // Pre-parse categories for tiered navigation
    sourceCategories = categories.map(cat => {
        const parts = cat.name.split(' - ').map(p => p.trim());
        return {
            ...cat,
            tier1: parts[0] || 'Unknown',
            tier2: (parts[1] && parts[1].toLowerCase() !== 'general') ? parts[1] : null,
            tier2_full: parts[1] || parts[0], // Keep original for jump labels
            tier3: (parts[2] && parts[2].toLowerCase() !== 'general') ? parts[2] : null
        };
    });

    allSources = items;
    filteredSources = [...allSources];

    renderSources();
}

/**
 * Renders the Sources view.
 */
function renderSources() {
    const container = document.getElementById('ac-view-sources');
    if (!container) return;

    // Build header structure
    container.innerHTML = `
        <div class="ac-table-header">
            <div id="sources-nav" class="ac-monster-nav">
                <!-- Tiered navigation chips -->
            </div>
            <div class="ac-stats" id="sources-stats">
                ${filteredSources.length} Sources found
            </div>
        </div>
        <div id="sources-content" class="ac-sections-container"></div>
    `;

    // Create a map of category ID -> array of filtered items
    const itemMap = {};
    filteredSources.forEach(item => {
        const catId = (typeof item.category_id === 'object' ? item.category_id?.id : item.category_id) || item.category?.id;
        
        if (catId) {
            if (!itemMap[catId]) itemMap[catId] = [];
            itemMap[catId].push(item);
        }
    });

    renderSourcesNavigation(itemMap);

    const content = document.getElementById('sources-content');
    if (!content) return;

    // Filter categories to only those that have items matching the current search AND selection
    const activeCategories = sourceCategories.filter(cat => {
        if (currentTier1 && cat.tier1 !== currentTier1) return false;
        if (currentTier2 && cat.tier2 !== currentTier2) return false;
        return (itemMap[cat.id] || []).length > 0;
    });

    if (activeCategories.length === 0) {
        content.innerHTML = '<div class="ac-no-results">No sources found matching your search.</div>';
        return;
    }

    // Render active categories sequentially
    content.innerHTML = activeCategories.map(cat => {
        const items = itemMap[cat.id] || [];
        const sectionId = `sources-section-${cat.id}`;
        
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
                                <th class="col-name">Source</th>
                                <th class="col-abbr">Abbr.</th>
                                <th class="col-type hide-mobile">Type</th>
                                <th class="col-ruleset hide-tablet">Ruleset</th>
                                <th class="col-allowed-content hide-mobile">Allowed Content</th>
                                <th class="col-notes">Notes / Advice</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(item => `
                                <tr data-id="${item.id}">
                                    <td class="col-name">
                                        <div class="name-cell">
                                            ${item.link ? `
                                                <a href="${esc(item.link)}" target="_blank" class="source-name-link" onclick="event.stopPropagation()">
                                                    ${esc(item.name)}
                                                </a>
                                            ` : `<span>${esc(item.name)}</span>`}
                                            <span class="row-hover-icon">Details →</span>
                                        </div>
                                    </td>
                                    <td class="col-abbr">${esc(item.abbreviation || '—')}</td>
                                    <td class="col-type hide-mobile">${esc(item.type || '—')}</td>
                                    <td class="col-ruleset hide-tablet">${esc(item.ruleset || '—')}</td>
                                    <td class="col-allowed-content hide-mobile">${formatSnippet(item.allowed_content)}</td>
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
            const item = allSources.find(i => i.id === id);
            if (item) showSourceDetail(item);
        });
    });
}

/**
 * Renders the 3-tier drill-down navigation for Sources.
 * @param {Object} itemMap - Map of category ID to filtered items.
 */
function renderSourcesNavigation(itemMap = {}) {
    const navContainer = document.getElementById('sources-nav');
    if (!navContainer) return;

    // Filter chips to those that actually have items
    const tier1Options = getUniqueSortedLabels(sourceCategories, 'tier1');
    const tier2Options = currentTier1 
        ? getUniqueSortedLabels(sourceCategories.filter(c => c.tier1 === currentTier1), 'tier2')
        : [];
    
    // Dynamic Jump-links (Navigation Index)
    let jumpOptions = [];
    let jumpLabel = "Navigation:";

    if (currentTier1 && currentTier2) {
        // Specific Tier 2 selected -> Jump to Tier 3 sub-categories
        jumpLabel = "Source Group:";
        jumpOptions = sourceCategories.filter(c => 
            c.tier1 === currentTier1 && 
            c.tier2 === currentTier2 && 
            c.tier3 &&
            (itemMap[c.id] || []).length > 0
        ).map(c => ({ label: c.tier3, target: `sources-section-${c.id}` }));
    } else if (currentTier1) {
        // Tier 1 selected, Tier 2 is "All" -> Jump to Tier 2 group starts
        jumpLabel = "Jump to:";
        const t2Labels = getUniqueSortedLabels(sourceCategories.filter(c => c.tier1 === currentTier1), 'tier2_full');
        jumpOptions = t2Labels.map(t2 => {
            const firstCat = sourceCategories.find(c => c.tier1 === currentTier1 && c.tier2_full === t2);
            return { label: t2, target: `sources-section-${firstCat.id}` };
        });
    }

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

        ${currentTier1 && tier2Options.length > 0 ? `
            <div class="ac-shortcuts-row">
                <span class="nav-label">Series:</span>
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

        ${jumpOptions.length > 0 ? `
            <div class="ac-shortcuts-row">
                <span class="nav-label">${jumpLabel}</span>
                <div class="ac-shortcuts ac-shortcuts-tier3">
                    ${jumpOptions.map(opt => `
                        <button class="ac-shortcut-chip" data-type="scroll" data-target="${opt.target}">
                            ${esc(opt.label)}
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
                renderSources();
            } else if (type === 'tier2') {
                currentTier2 = value || null;
                renderSources();
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
 * Filters the sources dataset based on a search term.
 */
export function filterSources(term) {
    if (!term) {
        filteredSources = [...allSources];
    } else {
        const lower = term.toLowerCase();
        filteredSources = allSources.filter(i => 
            i.name.toLowerCase().includes(lower) ||
            i.abbreviation?.toLowerCase().includes(lower) ||
            i.type?.toLowerCase().includes(lower) ||
            i.ruleset?.toLowerCase().includes(lower) ||
            i.allowed_content?.toLowerCase().includes(lower) ||
            i.notes_advice?.toLowerCase().includes(lower)
        );
    }
    renderSources();
}

/**
 * Shows the full detail for a specific Source in a modal.
 */
function showSourceDetail(item) {
    const html = `
        <div class="detail-header">
            <span class="detail-category">${esc(item.category?.name || 'Source')}</span>
            <h2 class="detail-title">${esc(item.name)}</h2>
            ${item.link ? `
                <div class="detail-link-sub">
                    <a href="${esc(item.link)}" target="_blank" class="source-url-link">${esc(item.link)}</a>
                </div>
            ` : ''}
        </div>

        <div class="detail-grid">
            <div class="detail-item">
                <label>Abbreviation</label>
                <value>${esc(item.abbreviation || '—')}</value>
            </div>
            <div class="detail-item">
                <label>Type / Ruleset</label>
                <value>${esc(item.type || '—')} / ${esc(item.ruleset || '—')}</value>
            </div>
        </div>

        <div class="detail-section">
            <h4>Allowed Content</h4>
            <div class="content-box" style="white-space: pre-wrap;">${esc(item.allowed_content || 'No specific content listed.')}</div>
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
