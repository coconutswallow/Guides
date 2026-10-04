/**
 * ================================================================
 * AC SOURCES MODULE
 * ================================================================
 * 
 * Presentation and interaction controller for Allowed Content Sources.
 * 
 * Features:
 * - Direct integration with normalized `ac_sources` and `lookups`.
 * - Category filtering (Core, Supplemental, Settings, etc.) and dynamic jump links.
 * - Ruleset filtering (2014, 2024).
 * - Real-time full-text search across all fields (name, key, abbr, notes).
 * - Detailed modal view with formatted markdown links and audit metadata.
 * 
 * @module ACSources
 */

import { getSources, getSourceLookups } from './ac-service.js';
import { openModal, esc, formatSnippet } from './ac-ui-utils.js';

let allSources = [];
let sourceTypes = [];
let sourceRulesets = [];
let filteredSources = [];

// Filter State
let selectedType = null;
let selectedRuleset = null;
let currentSearchTerm = '';

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

    // Fetch lookups and sources in parallel
    const [lookups, items] = await Promise.all([
        getSourceLookups(),
        getSources()
    ]);

    sourceTypes = (lookups.types || []).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    sourceRulesets = lookups.rulesets || [
        { value: 2014, label: '2014' },
        { value: 2024, label: '2024' }
    ];

    allSources = items || [];
    applyFilters();
    renderSources();
}

/**
 * Applies active category, ruleset, and search filters to allSources.
 */
function applyFilters() {
    const term = currentSearchTerm.toLowerCase().trim();

    filteredSources = allSources.filter(item => {
        // Category filter
        if (selectedType && item.type !== selectedType) {
            return false;
        }

        // Ruleset filter
        if (selectedRuleset && String(item.ruleset) !== String(selectedRuleset)) {
            return false;
        }

        // Search term filter
        if (term) {
            const matchName = item.name?.toLowerCase().includes(term);
            const matchAbbr = item.abbreviation?.toLowerCase().includes(term);
            const matchKey = item.source_key?.toLowerCase().includes(term);
            const matchCheck = item.check_id?.toLowerCase().includes(term);
            const matchType = item.type?.toLowerCase().includes(term);
            const matchRuleset = String(item.ruleset || '').toLowerCase().includes(term);
            const matchContent = item.allowed_content?.toLowerCase().includes(term);
            const matchNotes = item.notes_advice?.toLowerCase().includes(term);

            if (!matchName && !matchAbbr && !matchKey && !matchCheck && !matchType && !matchRuleset && !matchContent && !matchNotes) {
                return false;
            }
        }

        return true;
    });
}

/**
 * Converts markdown links [label](url) in text to safe HTML anchor tags.
 * 
 * @param {string} text - Raw text with markdown links
 * @returns {string} Safe HTML with rendered anchor tags
 */
function renderMarkdownLinks(text) {
    if (!text) return '';
    // Escape standard characters first
    let safe = esc(text);
    // Replace markdown links with secure target="_blank" anchors
    return safe.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, (match, label, url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="source-url-link">${label}</a>`;
    });
}

/**
 * Creates a URL-safe DOM element ID from a category name.
 */
function slugify(name) {
    return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/**
 * Renders the full Sources view including filters and grouped tables.
 */
function renderSources() {
    const container = document.getElementById('ac-view-sources');
    if (!container) return;

    // Group filtered sources by type
    const itemMap = {};
    filteredSources.forEach(item => {
        const cat = item.type || 'Other';
        if (!itemMap[cat]) itemMap[cat] = [];
        itemMap[cat].push(item);
    });

    // Categories that currently have matching items
    const activeCategories = sourceTypes.length > 0
        ? sourceTypes.filter(c => (itemMap[c.name] || []).length > 0)
        : Object.keys(itemMap).map(k => ({ name: k, notes: null }));

    // Render layout skeleton
    container.innerHTML = `
        <div class="ac-table-header">
            <div id="sources-nav" class="ac-monster-nav">
                <!-- Navigation & Filter Chips -->
            </div>
            <div class="ac-stats" id="sources-stats">
                ${filteredSources.length} ${filteredSources.length === 1 ? 'Source' : 'Sources'} found
            </div>
        </div>
        <div id="sources-content" class="ac-sections-container"></div>
    `;

    renderNavigation(itemMap, activeCategories);

    const content = document.getElementById('sources-content');
    if (!content) return;

    if (filteredSources.length === 0) {
        content.innerHTML = `
            <div class="ac-no-results">
                <p>No sources found matching your criteria.</p>
                ${(selectedType || selectedRuleset || currentSearchTerm) ? `
                    <button class="ac-shortcut-chip" id="reset-sources-filters" style="margin-top: 1rem;">
                        Reset Filters
                    </button>
                ` : ''}
            </div>
        `;
        const resetBtn = document.getElementById('reset-sources-filters');
        if (resetBtn) {
            resetBtn.onclick = () => {
                selectedType = null;
                selectedRuleset = null;
                currentSearchTerm = '';
                const searchInput = document.getElementById('ac-global-search');
                if (searchInput) searchInput.value = '';
                applyFilters();
                renderSources();
            };
        }
        return;
    }

    // Render grouped tables
    content.innerHTML = activeCategories.map(cat => {
        const items = itemMap[cat.name] || [];
        const sectionId = `sources-section-${slugify(cat.name)}`;

        return `
            <div class="ac-section-group">
                <div class="ac-section-title" id="${sectionId}">
                    <h2>${esc(cat.name)}</h2>
                    ${cat.notes ? `<div class="section-desc" style="white-space: pre-wrap;">${renderMarkdownLinks(cat.notes)}</div>` : ''}
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
                                                <a href="${esc(item.link)}" target="_blank" rel="noopener noreferrer" class="source-name-link" onclick="event.stopPropagation()">
                                                    ${esc(item.name)} ↗
                                                </a>
                                            ` : `<span>${esc(item.name)}</span>`}
                                            <span class="row-hover-icon">Details →</span>
                                        </div>
                                    </td>
                                    <td class="col-abbr"><code>${esc(item.abbreviation || '—')}</code></td>
                                    <td class="col-type hide-mobile">${esc(item.type || '—')}</td>
                                    <td class="col-ruleset hide-tablet"><span class="ruleset-pill">${esc(item.ruleset || '—')}</span></td>
                                    <td class="col-allowed-content hide-mobile">${formatSnippet(item.allowed_content, 60)}</td>
                                    <td class="col-notes">${formatSnippet(item.notes_advice, 60)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }).join('');

    // Attach row click listeners for detail modal
    content.querySelectorAll('tr[data-id]').forEach(row => {
        row.addEventListener('click', () => {
            const id = row.dataset.id;
            const item = allSources.find(i => i.id === id);
            if (item) showSourceDetail(item);
        });
    });
}

/**
 * Renders filter chips for Category, Ruleset, and dynamic jump links.
 */
function renderNavigation(itemMap, activeCategories) {
    const navContainer = document.getElementById('sources-nav');
    if (!navContainer) return;

    // Available categories from lookups
    const categoryOptions = sourceTypes.map(c => c.name);

    // Jump link options (when viewing All categories)
    const jumpOptions = (!selectedType && activeCategories.length > 1) 
        ? activeCategories.map(c => ({ label: c.name, target: `sources-section-${slugify(c.name)}` }))
        : [];

    navContainer.innerHTML = `
        <div class="ac-shortcuts-row">
            <span class="nav-label">Category:</span>
            <div class="ac-shortcuts">
                <button class="ac-shortcut-chip ${!selectedType ? 'active' : ''}" data-type="category" data-value="">
                    All
                </button>
                ${categoryOptions.map(catName => `
                    <button class="ac-shortcut-chip ${selectedType === catName ? 'active' : ''}" data-type="category" data-value="${esc(catName)}">
                        ${esc(catName)}
                    </button>
                `).join('')}
            </div>
        </div>

        <div class="ac-shortcuts-row">
            <span class="nav-label">Ruleset:</span>
            <div class="ac-shortcuts">
                <button class="ac-shortcut-chip ${!selectedRuleset ? 'active' : ''}" data-type="ruleset" data-value="">
                    All
                </button>
                ${sourceRulesets.map(r => `
                    <button class="ac-shortcut-chip ${selectedRuleset === String(r.value) ? 'active' : ''}" data-type="ruleset" data-value="${esc(String(r.value))}">
                        ${esc(r.label)}
                    </button>
                `).join('')}
            </div>
        </div>

        ${jumpOptions.length > 0 ? `
            <div class="ac-shortcuts-row">
                <span class="nav-label">Jump to:</span>
                <div class="ac-shortcuts ac-shortcuts-tier2">
                    ${jumpOptions.map(opt => `
                        <button class="ac-shortcut-chip" data-type="scroll" data-target="${opt.target}">
                            ${esc(opt.label)}
                        </button>
                    `).join('')}
                </div>
            </div>
        ` : ''}
    `;

    // Chip click interactions
    navContainer.querySelectorAll('.ac-shortcut-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const { type, value, target } = chip.dataset;

            if (type === 'category') {
                selectedType = value || null;
                applyFilters();
                renderSources();
            } else if (type === 'ruleset') {
                selectedRuleset = value || null;
                applyFilters();
                renderSources();
            } else if (type === 'scroll') {
                const el = document.getElementById(target);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
    });
}

/**
 * External search filter handler triggered from global search bar.
 * 
 * @param {string} term - Search query string
 */
export function filterSources(term) {
    currentSearchTerm = term || '';
    applyFilters();
    renderSources();
}

/**
 * Displays full detail for a Source item in a modal.
 * 
 * @param {Object} item - Source row object
 */
function showSourceDetail(item) {
    const html = `
        <div class="detail-header">
            <span class="detail-category">${esc(item.type || 'Source')}</span>
            <h2 class="detail-title">${esc(item.name)}</h2>
            ${item.link ? `
                <div class="detail-link-sub">
                    <a href="${esc(item.link)}" target="_blank" rel="noopener noreferrer" class="source-url-link">
                        ${esc(item.link)} ↗
                    </a>
                </div>
            ` : ''}
        </div>

        <div class="detail-grid">
            <div class="detail-item">
                <label>Source Key</label>
                <value><code>${esc(item.source_key || '—')}</code></value>
            </div>
            <div class="detail-item">
                <label>Abbreviation</label>
                <value><code>${esc(item.abbreviation || '—')}</code></value>
            </div>
            <div class="detail-item">
                <label>Type</label>
                <value>${esc(item.type || '—')}</value>
            </div>
            <div class="detail-item">
                <label>Ruleset</label>
                <value><span class="ruleset-pill">${esc(item.ruleset || '—')}</span></value>
            </div>
            <div class="detail-item">
                <label>Audit Check ID</label>
                <value><code>${esc(item.check_id || '—')}</code></value>
            </div>
            <div class="detail-item">
                <label>Display Order</label>
                <value>${esc(String(item.display_order ?? '—'))}</value>
            </div>
        </div>

        <div class="detail-section">
            <h4>Allowed Content</h4>
            <div class="content-box" style="white-space: pre-wrap;">${esc(item.allowed_content || 'No specific content limitations listed.')}</div>
        </div>

        ${item.notes_advice ? `
        <div class="detail-section">
            <h4>Notes / Rage Advice</h4>
            <div class="advice-content" style="white-space: pre-wrap; line-height: 1.5;">${renderMarkdownLinks(item.notes_advice)}</div>
        </div>
        ` : ''}
    `;

    openModal(html);
}
