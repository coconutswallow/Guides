/**
 * ================================================================
 * AC SOURCES MODULE
 * ================================================================
 * 
 * Logic for the Sources content set. Handles:
 * - Table rendering grouped by Category
 * - Explicit rendering of empty categories (headers/notes only)
 * - Source-specific filtering and search
 * - Record detail generation
 * - 3-Tier Drill-down Navigation
 */

import { getSources, getSourceCategories } from './ac-service.js';
import { openModal, esc, formatSnippet } from './ac-ui-utils.js';

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
            tier2: parts[1] || 'General',
            tier3: parts[2] || parts[1] || parts[0]
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

    renderSourcesNavigation();

    const content = document.getElementById('sources-content');

    // Create a map of category ID -> array of filtered items
    const itemMap = {};
    filteredSources.forEach(item => {
        const catId = (typeof item.category_id === 'object' ? item.category_id?.id : item.category_id) || item.category?.id;
        
        if (catId) {
            if (!itemMap[catId]) itemMap[catId] = [];
            itemMap[catId].push(item);
        }
    });

    // Render all categories sequentially
    content.innerHTML = sourceCategories.map(cat => {
        const items = itemMap[cat.id] || [];
        const sectionId = `sources-section-${cat.id}`;
        
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
                ` : ''}
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
 */
function renderSourcesNavigation() {
    const navContainer = document.getElementById('sources-nav');
    if (!navContainer) return;

    const tier1Options = [...new Set(sourceCategories.map(c => c.tier1))].sort();
    const tier2Options = currentTier1 
        ? [...new Set(sourceCategories.filter(c => c.tier1 === currentTier1).map(c => c.tier2))].sort()
        : [];
    const tier3Options = (currentTier1 && currentTier2)
        ? sourceCategories.filter(c => c.tier1 === currentTier1 && c.tier2 === currentTier2)
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

        ${currentTier2 ? `
            <div class="ac-shortcuts-row">
                <span class="nav-label">Source Group:</span>
                <div class="ac-shortcuts ac-shortcuts-tier3">
                    ${tier3Options.map(cat => `
                        <button class="ac-shortcut-chip" data-type="scroll" data-target="sources-section-${cat.id}">
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
