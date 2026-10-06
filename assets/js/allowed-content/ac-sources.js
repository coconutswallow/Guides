/**
 * ================================================================
 * AC SOURCES MODULE
 * ================================================================
 * 
 * Presentation, interaction, and administration controller for
 * Allowed Content Sources.
 * 
 * Features:
 * - Direct integration with normalized `ac_sources` and `lookups`.
 * - Single unified data table with Category column.
 * - Category filtering and Ruleset filtering.
 * - Real-time full-text search across all fields.
 * - Rendered clickable markdown links in Notes / Advice and detail modal.
 * - Row click opens detailed modal view.
 * - Silent staff authentication check: When an Admin or Engineer logs in
 *   via the Staff Portal, staff editing mode is automatically activated,
 *   enabling in-place editing, creation, and deletion of source records.
 *   For public visitors, the page remains strictly read-only.
 * 
 * @module ACSources
 */

/**
 * Official or homebrew sourcebook record stored in `ac_sources`.
 * 
 * @typedef {Object} SourceRecord
 * @property {string} id - UUID primary key in ac_sources
 * @property {string} source_key - Uppercase canonical identifier (e.g. 'PHB2014', 'MPMM', 'SCAG')
 * @property {string} check_id - Audit check identifier (e.g. 'SRC_0001')
 * @property {string} abbreviation - Short book code or acronym
 * @property {string} name - Full title of the sourcebook
 * @property {string} type - Category classification (e.g. 'Core', 'Supplemental', 'Hawthorne Homebrew')
 * @property {string|number} ruleset - Game system edition ('2014' or '2024')
 * @property {string} allowed_content - Summary of permitted content from this source
 * @property {string|null} notes_advice - Guild notes or rage advice (supports Markdown links)
 * @property {string|null} link - Official D&D Beyond or internal site reference URL
 * @property {number} display_order - Fractional sort index
 */

import { getSources, getSourceLookups, updateSource, createSource, deleteSource, updateLookup } from './ac-service.js';
import { 
    openModal, 
    closeModal, 
    esc, 
    formatSnippet, 
    resolveSourceLink, 
    getStaffPortalUrl,
    renderMarkdownLinks, 
    showToast 
} from './ac-ui-utils.js';
import { 
    setAdminMode, 
    getAdminMode, 
    getCurrentUser, 
    detectAdminSession, 
    renderAdminBar 
} from './ac-auth.js';
import {
    cleanFloat,
    getMidpointOrder,
    getOrderForPosition,
    getNextDisplayOrder,
    getStartDisplayOrder,
    moveItemOrder,
    needsRebalance,
    rebalanceOrders,
    sortByDisplayOrder,
    formatDisplayOrder
} from './ac-order-utils.js';

export {
    cleanFloat,
    getMidpointOrder,
    getOrderForPosition,
    getNextDisplayOrder,
    getStartDisplayOrder,
    moveItemOrder,
    needsRebalance,
    rebalanceOrders,
    sortByDisplayOrder,
    formatDisplayOrder,
    resolveSourceLink,
    renderMarkdownLinks,
    showToast,
    setAdminMode,
    getAdminMode,
    getCurrentUser,
    detectAdminSession,
    renderAdminBar
};

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
 * Uses in-memory cache if available unless forceRefresh is true.
 * 
 * @param {boolean} [forceRefresh=false] - Force re-fetch from database
 */
export async function initSources(forceRefresh = false) {
    const container = document.getElementById('ac-view-sources');
    if (!container) return;

    // Use cached in-memory data if available and not forcing refresh
    if (!forceRefresh && allSources.length > 0) {
        applyFilters();
        renderSources();
        return;
    }

    // Show loading state if empty
    if (allSources.length === 0) {
        container.innerHTML = `
            <div class="ac-loading">
                <div class="spinner"></div>
                <span>Cataloging Sources...</span>
            </div>
        `;
    }

    // Fetch lookups, sources, and check admin session in parallel
    const [lookups, items] = await Promise.all([
        getSourceLookups(),
        getSources(),
        detectAdminSession()
    ]);

    sourceTypes = (lookups.types || []).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    sourceRulesets = lookups.rulesets || [
        { value: 2014, label: '2014' },
        { value: 2024, label: '2024' }
    ];

    allSources = sortByDisplayOrder(items || []);
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
 * Renders the full Sources view as a single large table with filters.
 */
function renderSources() {
    const container = document.getElementById('ac-view-sources');
    if (!container) return;

    const isAdmin = getAdminMode();
    const currentUser = getCurrentUser();

    // Check if the currently selected category has any special notes
    const activeCategoryMeta = selectedType ? sourceTypes.find(c => c.name === selectedType) : null;
    const hasAdminContainer = !!document.getElementById('ac-admin-bar-container');

    // Render layout skeleton
    container.innerHTML = `
        ${(isAdmin && !hasAdminContainer) ? `
            <div class="ac-admin-bar" id="sources-admin-bar">
                <div class="ac-admin-badge">
                    <span class="badge-icon">🛡️</span>
                    <span>Staff Mode: <strong>${esc(currentUser?.user_metadata?.full_name || currentUser?.email || 'Admin/Engineer')}</strong></span>
                </div>
                <div class="ac-admin-actions">
                    <button id="btn-add-source" class="ac-btn-admin ac-btn-primary">+ Add New Source</button>
                    <button id="btn-manage-options" class="ac-btn-admin ac-btn-secondary">⚙️ Configure Options</button>
                    <a href="${getStaffPortalUrl()}" class="ac-btn-admin ac-btn-secondary">Staff Portal</a>
                </div>
            </div>
        ` : ''}

        <div class="ac-table-header">
            <div id="sources-nav" class="ac-monster-nav">
                <!-- Filter Chips -->
            </div>
            <div class="ac-stats" id="sources-stats">
                ${filteredSources.length} ${filteredSources.length === 1 ? 'Source' : 'Sources'} found
            </div>
        </div>
        ${activeCategoryMeta?.notes ? `
            <div class="ac-category-banner">
                <strong>${esc(activeCategoryMeta.name)}:</strong> ${renderMarkdownLinks(activeCategoryMeta.notes, false)}
            </div>
        ` : ''}
        <div id="sources-content" class="ac-sections-container"></div>
    `;

    renderNavigation();

    // Hook up Add Source and Configure Options buttons for Admins
    if (hasAdminContainer) {
        renderAdminBar();
    } else if (isAdmin) {
        const addBtn = document.getElementById('btn-add-source');
        if (addBtn) {
            addBtn.addEventListener('click', () => openSourceForm(null));
        }
        const optBtn = document.getElementById('btn-manage-options');
        if (optBtn) {
            optBtn.addEventListener('click', () => openOptionsManagerModal());
        }
    }

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

    // Render single unified table
    content.innerHTML = `
        <div class="ac-table-wrapper">
            <table class="ac-table" id="sources-table">
                <thead>
                    <tr>
                        <th class="col-category">Category</th>
                        <th class="col-name">Source</th>
                        <th class="col-abbr">Abbr.</th>
                        <th class="col-ruleset">Ruleset</th>
                        <th class="col-allowed-content hide-mobile">Allowed Content</th>
                        <th class="col-notes">Notes / Advice</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredSources.map(item => `
                        <tr data-id="${item.id}">
                            <td class="col-category">${esc(item.type || '—')}</td>
                            <td class="col-name">
                                <div class="name-cell">
                                    ${item.link ? `
                                        <a href="${esc(resolveSourceLink(item.link))}" target="_blank" rel="noopener noreferrer" class="source-name-link" onclick="event.stopPropagation()">
                                            ${esc(item.name)} ↗
                                        </a>
                                    ` : `<span>${esc(item.name)}</span>`}
                                    <span class="row-hover-icon">${isAdmin ? 'Edit / Details →' : 'Details →'}</span>
                                </div>
                            </td>
                            <td class="col-abbr"><code>${esc(item.abbreviation || '—')}</code></td>
                            <td class="col-ruleset"><span class="ruleset-pill">${esc(item.ruleset || '—')}</span></td>
                            <td class="col-allowed-content hide-mobile">${formatSnippet(item.allowed_content, 120)}</td>
                            <td class="col-notes">${renderMarkdownLinks(item.notes_advice, true)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    // Attach row click listeners for detail modal (ignoring clicks on links)
    content.querySelectorAll('tr[data-id]').forEach(row => {
        row.addEventListener('click', (e) => {
            if (e.target.closest('a')) return;
            const id = row.dataset.id;
            const item = allSources.find(i => i.id === id);
            if (item) showSourceDetail(item);
        });
    });
}

/**
 * Renders filter chips for Category and Ruleset.
 */
function renderNavigation() {
    const navContainer = document.getElementById('sources-nav');
    if (!navContainer) return;

    // Available categories from lookups
    const categoryOptions = sourceTypes.map(c => c.name);

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
    `;

    // Chip click interactions
    navContainer.querySelectorAll('.ac-shortcut-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const { type, value } = chip.dataset;

            if (type === 'category') {
                selectedType = value || null;
                applyFilters();
                renderSources();
            } else if (type === 'ruleset') {
                selectedRuleset = value || null;
                applyFilters();
                renderSources();
            }
        });
    });
}

/**
 * Resets all active filters and search term.
 */
export function resetFilters() {
    selectedType = null;
    selectedRuleset = null;
    currentSearchTerm = '';
    applyFilters();
    renderSources();
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
 * If user is Staff Admin, includes Edit and Delete buttons.
 * 
 * @param {Object} item - Source row object
 */
function showSourceDetail(item) {
    const isAdmin = getAdminMode();
    const html = `
        <div class="detail-header">
            <div>
                <span class="detail-category">${esc(item.type || 'Source')}</span>
                <h2 class="detail-title">${esc(item.name)}</h2>
                ${item.link ? `
                    <div class="detail-link-sub">
                        <a href="${esc(resolveSourceLink(item.link))}" target="_blank" rel="noopener noreferrer" class="source-url-link">
                            ${esc(item.link)} ↗
                        </a>
                    </div>
                ` : ''}
            </div>
            ${isAdmin ? `
                <div class="detail-actions">
                    <button id="modal-btn-edit-source" class="ac-btn-admin ac-btn-primary">✏️ Edit</button>
                    <button id="modal-btn-delete-source" class="ac-btn-admin ac-btn-delete" title="Delete Source">🗑️ Delete</button>
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
                <label>Category</label>
                <value>${esc(item.type || '—')}</value>
            </div>
            <div class="detail-item">
                <label>Ruleset</label>
                <value><span class="ruleset-pill">${esc(item.ruleset || '—')}</span></value>
            </div>
            <div class="detail-item">
                <label>Display Order</label>
                <value>${esc(formatDisplayOrder(item.display_order))}</value>
            </div>
        </div>

        <div class="detail-section">
            <h4>Allowed Content</h4>
            <div class="content-box" style="white-space: pre-wrap;">${esc(item.allowed_content || 'No specific content limitations listed.')}</div>
        </div>

        ${item.notes_advice ? `
        <div class="detail-section">
            <h4>Notes / Rage Advice</h4>
            <div class="advice-content" style="white-space: pre-wrap; line-height: 1.5;">${renderMarkdownLinks(item.notes_advice, false)}</div>
        </div>
        ` : ''}
    `;

    openModal(html);

    if (isAdmin) {
        document.getElementById('modal-btn-edit-source')?.addEventListener('click', () => openSourceForm(item));
        document.getElementById('modal-btn-delete-source')?.addEventListener('click', () => confirmAndDeleteSource(item));
    }
}

/**
 * Calculates the next sequential check_id (e.g. 'SRC_0120') based on highest existing number.
 * 
 * @param {Array} [sources=allSources] - Sources collection
 * @returns {string} Formatted check_id
 */
export function getNextCheckId(sources = allSources) {
    let maxNum = 0;
    (sources || []).forEach(s => {
        if (s && s.check_id) {
            const m = String(s.check_id).match(/^SRC_(\d+)$/i);
            if (m) {
                const n = parseInt(m[1], 10);
                if (n > maxNum) maxNum = n;
            }
        }
    });
    const nextNum = maxNum + 1;
    return `SRC_${String(nextNum).padStart(4, '0')}`;
}

/**
 * Derives a canonical uppercase alphanumeric source_key from an abbreviation or name.
 * 
 * @param {string} [abbr=''] - Source abbreviation
 * @param {string} [name=''] - Source full name
 * @returns {string} Canonical source key
 */
export function deriveSourceKey(abbr = '', name = '') {
    const raw = (abbr || name || '').trim().toUpperCase();
    return raw.replace(/[^A-Z0-9_]/g, '_').replace(/__+/g, '_').replace(/^_+|_+$/g, '');
}

/**
 * Opens an edit or creation form modal for a source.
 * 
 * @param {Object|null} item - Existing item to edit or null to create new
 */
export async function openSourceForm(item = null) {
    if (allSources.length === 0) {
        allSources = (await getSources()) || [];
    }
    if (sourceTypes.length === 0) {
        const lookups = await getSourceLookups();
        sourceTypes = (lookups.types || []).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
        sourceRulesets = lookups.rulesets || [
            { value: 2014, label: '2014' },
            { value: 2024, label: '2024' }
        ];
    }

    const isNew = !item;
    const sortedSources = sortByDisplayOrder(allSources);
    const startOrder = getStartDisplayOrder(allSources);
    const nextOrder = isNew 
        ? getNextDisplayOrder(allSources)
        : (item.display_order ?? 1);
    const checkIdVal = isNew ? '' : (item.check_id || '');
    const sourceKeyVal = isNew ? '' : (item.source_key || '');

    const typesToUse = sourceTypes.length > 0 ? sourceTypes : [
        { name: 'Core' },
        { name: 'Supplemental' },
        { name: 'Adventures' },
        { name: 'Campaign Setting' },
        { name: 'Unearthed Arcana' },
        { name: 'Hawthorne Homebrew' }
    ];

    const rulesetsToUse = sourceRulesets.length > 0 ? sourceRulesets : [
        { value: 2014, label: '2014' },
        { value: 2024, label: '2024' }
    ];

    const formHtml = `
        <div class="detail-header">
            <div>
                <span class="detail-category">${isNew ? 'New Catalog Entry' : 'Edit Catalog Entry'}</span>
                <h2 class="detail-title">${isNew ? 'Add New Source' : esc(item.name)}</h2>
            </div>
        </div>

        <form id="ac-source-form" class="ac-edit-form">
            <!-- Hidden / derived fields -->
            <input type="hidden" id="src-input-key" value="${esc(sourceKeyVal)}">
            <input type="hidden" id="src-input-check" value="${esc(checkIdVal)}">

            <div class="ac-form-grid">
                <div class="ac-form-group">
                    <label for="src-input-name">Source Name *</label>
                    <input type="text" id="src-input-name" required value="${isNew ? '' : esc(item.name)}" placeholder="e.g. Player's Handbook (2024)" class="ac-form-input">
                </div>

                <div class="ac-form-group">
                    <label for="src-input-abbr">Abbreviation *</label>
                    <input type="text" id="src-input-abbr" required value="${isNew ? '' : esc(item.abbreviation || '')}" placeholder="e.g. PHB2024" class="ac-form-input">
                </div>

                <div class="ac-form-group">
                    <label for="src-input-type">Category *</label>
                    <select id="src-input-type" required class="ac-form-select">
                        ${typesToUse.map(c => `
                            <option value="${esc(c.name)}" ${(item?.type === c.name) ? 'selected' : ''}>
                                ${esc(c.name)}
                            </option>
                        `).join('')}
                    </select>
                </div>

                <div class="ac-form-group">
                    <label for="src-input-ruleset">Ruleset *</label>
                    <select id="src-input-ruleset" required class="ac-form-select">
                        ${rulesetsToUse.map(r => `
                            <option value="${esc(String(r.value))}" ${(String(item?.ruleset) === String(r.value)) ? 'selected' : ''}>
                                ${esc(r.label)}
                            </option>
                        `).join('')}
                    </select>
                </div>
            </div>

            <div class="ac-form-group">
                <label for="src-input-order">Display Order *</label>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <input type="number" step="any" id="src-input-order" value="${nextOrder}" class="ac-form-input" style="flex: 1;">
                    <select id="src-input-placement" class="ac-form-select" style="flex: 1.4;" title="Placement Helper">
                        <option value="custom">Placement: Manual</option>
                        <option value="end" ${isNew ? 'selected' : ''}>At the End (${nextOrder})</option>
                        <option value="start">At the Beginning (${startOrder})</option>
                        <optgroup label="Place After...">
                            ${sortedSources.filter(s => !item || s.id !== item.id).map(s => `
                                <option value="after_${s.id}">After: ${esc(s.name)} (${formatDisplayOrder(s.display_order)})</option>
                            `).join('')}
                        </optgroup>
                    </select>
                </div>
                <small class="ac-form-help">Fractional indexing enabled (e.g. 10.5 to insert between 10 and 11)</small>
            </div>

            <div class="ac-form-group">
                <label for="src-input-link">Source URL / Link</label>
                <input type="text" id="src-input-link" value="${isNew ? '' : esc(item.link || '')}" placeholder="https://... or /arcana/" class="ac-form-input">
                <small class="ac-form-help">External URL (e.g. https://...) or internal site path (e.g. /arcana/)</small>
            </div>

            <div class="ac-form-group">
                <label for="src-input-content">Allowed Content</label>
                <textarea id="src-input-content" rows="3" class="ac-form-textarea" placeholder="e.g. All: Classes, Spells...">${isNew ? '' : esc(item.allowed_content || '')}</textarea>
            </div>

            <div class="ac-form-group">
                <label for="src-input-notes">Notes / Rage Advice</label>
                <textarea id="src-input-notes" rows="4" class="ac-form-textarea" placeholder="Enter notes or markdown links like [Label](https://...)">${isNew ? '' : esc(item.notes_advice || '')}</textarea>
                <small class="ac-form-help">Tip: Markdown links e.g. <code>[D&amp;D Beyond](https://...)</code> are rendered as clickable links.</small>
            </div>

            <div class="ac-form-actions">
                <button type="button" id="src-btn-cancel" class="ac-btn-admin ac-btn-secondary">Cancel</button>
                <button type="submit" id="src-btn-submit" class="ac-btn-admin ac-btn-primary">
                    ${isNew ? 'Create Source' : 'Save Changes'}
                </button>
            </div>
        </form>
    `;

    openModal(formHtml);

    // Dynamic key derivation from abbreviation
    const keyInput = document.getElementById('src-input-key');
    const abbrInput = document.getElementById('src-input-abbr');
    const nameInput = document.getElementById('src-input-name');

    if (abbrInput && keyInput) {
        abbrInput.addEventListener('input', () => {
            if (isNew || !keyInput.value) {
                keyInput.value = deriveSourceKey(abbrInput.value);
            }
        });

        abbrInput.addEventListener('blur', () => {
            if ((isNew || !keyInput.value) && !keyInput.value && nameInput?.value) {
                keyInput.value = deriveSourceKey(nameInput.value);
            }
        });
    }

    // Placement helper logic
    const placementSelect = document.getElementById('src-input-placement');
    const orderInput = document.getElementById('src-input-order');
    if (placementSelect && orderInput) {
        placementSelect.addEventListener('change', () => {
            const val = placementSelect.value;
            if (val === 'end') {
                orderInput.value = nextOrder;
            } else if (val === 'start') {
                orderInput.value = startOrder;
            } else if (val.startsWith('after_')) {
                const afterId = val.replace('after_', '');
                const sorted = sortByDisplayOrder(allSources);
                const idx = sorted.findIndex(s => s.id === afterId);
                if (idx !== -1) {
                    const newOrder = getOrderForPosition(sorted, idx + 1);
                    orderInput.value = newOrder;
                }
            }
        });

        orderInput.addEventListener('input', () => {
            if (placementSelect) placementSelect.value = 'custom';
        });
    }

    // Cancel action
    document.getElementById('src-btn-cancel')?.addEventListener('click', () => {
        if (item) {
            showSourceDetail(item);
        } else {
            closeModal();
        }
    });

    // Form submit action
    const form = document.getElementById('ac-source-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('src-btn-submit');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Saving...';
            }

            const name = document.getElementById('src-input-name').value.trim();
            const abbreviation = document.getElementById('src-input-abbr').value.trim();
            let source_key = document.getElementById('src-input-key')?.value?.trim()?.toUpperCase();
            if (!source_key) {
                source_key = deriveSourceKey(abbreviation, name);
            }
            const check_id = document.getElementById('src-input-check')?.value?.trim()?.toUpperCase() || null;
            const type = document.getElementById('src-input-type').value;
            const ruleset = document.getElementById('src-input-ruleset').value;
            const display_order = parseFloat(document.getElementById('src-input-order').value) || 0;
            const link = document.getElementById('src-input-link').value.trim() || null;
            const allowed_content = document.getElementById('src-input-content').value.trim() || null;
            const notes_advice = document.getElementById('src-input-notes').value.trim() || null;

            // Form validation
            if (!name || !abbreviation || !type || !ruleset) {
                showToast('Please fill in all required fields.', true);
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = isNew ? 'Create Source' : 'Save Changes';
                }
                return;
            }

            if (!source_key || !/^[A-Z0-9_]+$/.test(source_key)) {
                showToast('Could not derive a valid Source Key from abbreviation.', true);
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = isNew ? 'Create Source' : 'Save Changes';
                }
                return;
            }

            if (isNew && allSources.some(s => s.source_key?.toUpperCase() === source_key)) {
                showToast(`A source with key "${source_key}" already exists.`, true);
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Create Source';
                }
                return;
            }

            if (check_id) {
                const checkDup = allSources.find(s => (isNew || s.id !== item.id) && s.check_id?.toUpperCase() === check_id);
                if (checkDup) {
                    showToast(`Audit Check ID "${check_id}" is already used by "${checkDup.name}".`, true);
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = isNew ? 'Create Source' : 'Save Changes';
                    }
                    return;
                }
            }

            const payload = {
                name,
                abbreviation,
                source_key,
                check_id,
                type,
                ruleset,
                display_order,
                link,
                allowed_content,
                notes_advice
            };

            if (isNew) {
                const { data, error } = await createSource(payload);
                if (error) {
                    showToast(`Error creating source: ${error.message || 'Database error'}`, true);
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Create Source';
                    }
                    return;
                }
                const newRecord = data || { ...payload, id: 'temp-' + Date.now() };
                allSources.push(newRecord);
                allSources = sortByDisplayOrder(allSources);
                applyFilters();
                renderSources();
                closeModal();
                showToast(`Source "${payload.name}" created successfully!`);
                window.dispatchEvent(new CustomEvent('ac:sources-updated', { detail: { action: 'create', item: newRecord } }));
            } else {
                const { data, error } = await updateSource(item.id, payload);
                if (error) {
                    showToast(`Error updating source: ${error.message || 'Database error'}`, true);
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Save Changes';
                    }
                    return;
                }
                const idx = allSources.findIndex(s => s.id === item.id);
                if (idx !== -1) {
                    allSources[idx] = { ...allSources[idx], ...payload, ...(data || {}) };
                }
                allSources = sortByDisplayOrder(allSources);
                applyFilters();
                renderSources();
                closeModal();
                showToast(`Source "${payload.name}" updated successfully!`);
                window.dispatchEvent(new CustomEvent('ac:sources-updated', { detail: { action: 'update', item: allSources[idx] } }));
            }
        });
    }
}

/**
 * Handles confirmation and deletion of a source.
 * 
 * @param {Object} item - Source record to delete
 */
export async function confirmAndDeleteSource(item) {
    if (!confirm(`Are you sure you want to delete source "${item.name}" (${item.source_key})?\n\nThis cannot be undone.`)) {
        return;
    }

    const { success, error } = await deleteSource(item.id);
    if (!success) {
        showToast(`Error deleting source: ${error?.message || 'Database error'}`, true);
        return;
    }

    allSources = allSources.filter(s => s.id !== item.id);
    applyFilters();
    renderSources();
    closeModal();
    showToast(`Source "${item.name}" deleted.`);
    window.dispatchEvent(new CustomEvent('ac:sources-updated', { detail: { action: 'delete', id: item.id } }));
}

/**
 * Opens the Options / Lookups configuration modal for Sources.
 * Allows Admins/Engineers to manage Category types (with order & notes) and Rulesets.
 */
export function openOptionsManagerModal() {
    let draftTypes = JSON.parse(JSON.stringify(sourceTypes));
    let draftRulesets = JSON.parse(JSON.stringify(sourceRulesets));
    let currentTab = 'categories'; // 'categories' | 'rulesets'
    let editingItem = null; // null | { type: 'category'|'ruleset', index: number|null, item: {...} }

    function renderContent() {
        const modalBody = document.getElementById('ac-detail-body');
        if (!modalBody) return;

        if (editingItem) {
            renderEditingForm(modalBody);
        } else {
            renderOverview(modalBody);
        }
    }

    function renderOverview(container) {
        container.innerHTML = `
            <div class="ac-options-modal">
                <div class="ac-options-header">
                    <h3>⚙️ Configure Sources Options (Lookups)</h3>
                    <p>Manage category options, rulesets, and contextual banner notes saved in the <code>lookups</code> table.</p>
                </div>

                <div class="ac-options-nav">
                    <button class="ac-options-tab-btn ${currentTab === 'categories' ? 'active' : ''}" data-tab="categories">
                        Categories (${draftTypes.length})
                    </button>
                    <button class="ac-options-tab-btn ${currentTab === 'rulesets' ? 'active' : ''}" data-tab="rulesets">
                        Rulesets (${draftRulesets.length})
                    </button>
                </div>

                ${currentTab === 'categories' ? `
                    <div class="ac-options-toolbar">
                        <button id="opt-btn-add-cat" class="ac-btn-admin ac-btn-primary">+ Add Category</button>
                    </div>
                    <div class="ac-options-table-wrapper">
                        <table class="ac-options-table">
                            <thead>
                                <tr>
                                    <th style="width: 70px;">Order</th>
                                    <th>Category Name</th>
                                    <th>Banner Notes</th>
                                    <th style="width: 110px; text-align: right;">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${draftTypes.map((cat, idx) => `
                                    <tr>
                                        <td><code>${cat.display_order ?? idx + 1}</code></td>
                                        <td><strong>${esc(cat.name)}</strong></td>
                                        <td style="max-width: 250px; font-size: 0.8rem; color: var(--color-text-secondary);">${formatSnippet(cat.notes, 60)}</td>
                                        <td class="ac-cell-actions">
                                            <button class="ac-btn-icon opt-edit-cat" data-index="${idx}" title="Edit Category">✏️ Edit</button>
                                            <button class="ac-btn-icon delete opt-delete-cat" data-index="${idx}" title="Delete Category">🗑️</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : `
                    <div class="ac-options-toolbar">
                        <button id="opt-btn-add-rule" class="ac-btn-admin ac-btn-primary">+ Add Ruleset</button>
                    </div>
                    <div class="ac-options-table-wrapper">
                        <table class="ac-options-table">
                            <thead>
                                <tr>
                                    <th>Label</th>
                                    <th>Value</th>
                                    <th style="width: 110px; text-align: right;">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${draftRulesets.map((r, idx) => `
                                    <tr>
                                        <td><strong>${esc(r.label)}</strong></td>
                                        <td><code>${esc(String(r.value))}</code></td>
                                        <td class="ac-cell-actions">
                                            <button class="ac-btn-icon opt-edit-rule" data-index="${idx}" title="Edit Ruleset">✏️ Edit</button>
                                            <button class="ac-btn-icon delete opt-delete-rule" data-index="${idx}" title="Delete Ruleset">🗑️</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `}

                <div class="ac-form-actions" style="margin-top: 0.5rem;">
                    <button type="button" id="opt-btn-close" class="ac-btn-admin ac-btn-secondary">Close</button>
                    <button type="button" id="opt-btn-save-all" class="ac-btn-admin ac-btn-primary">💾 Save All to Lookups</button>
                </div>
            </div>
        `;

        // Tab click
        container.querySelectorAll('.ac-options-tab-btn').forEach(btn => {
            btn.onclick = () => {
                currentTab = btn.dataset.tab;
                renderContent();
            };
        });

        // Add Category
        container.querySelector('#opt-btn-add-cat')?.addEventListener('click', () => {
            const nextOrder = draftTypes.reduce((max, c) => Math.max(max, c.display_order ?? 0), 0) + 1;
            editingItem = {
                type: 'category',
                index: null,
                item: { name: '', display_order: nextOrder, notes: '' }
            };
            renderContent();
        });

        // Add Ruleset
        container.querySelector('#opt-btn-add-rule')?.addEventListener('click', () => {
            editingItem = {
                type: 'ruleset',
                index: null,
                item: { label: '', value: '' }
            };
            renderContent();
        });

        // Edit Category
        container.querySelectorAll('.opt-edit-cat').forEach(btn => {
            btn.onclick = () => {
                const idx = parseInt(btn.dataset.index, 10);
                editingItem = {
                    type: 'category',
                    index: idx,
                    item: { ...draftTypes[idx] }
                };
                renderContent();
            };
        });

        // Delete Category
        container.querySelectorAll('.opt-delete-cat').forEach(btn => {
            btn.onclick = () => {
                const idx = parseInt(btn.dataset.index, 10);
                const cat = draftTypes[idx];
                if (confirm(`Delete category "${cat.name}"?`)) {
                    draftTypes.splice(idx, 1);
                    renderContent();
                }
            };
        });

        // Edit Ruleset
        container.querySelectorAll('.opt-edit-rule').forEach(btn => {
            btn.onclick = () => {
                const idx = parseInt(btn.dataset.index, 10);
                editingItem = {
                    type: 'ruleset',
                    index: idx,
                    item: { ...draftRulesets[idx] }
                };
                renderContent();
            };
        });

        // Delete Ruleset
        container.querySelectorAll('.opt-delete-rule').forEach(btn => {
            btn.onclick = () => {
                const idx = parseInt(btn.dataset.index, 10);
                const r = draftRulesets[idx];
                if (confirm(`Delete ruleset "${r.label}"?`)) {
                    draftRulesets.splice(idx, 1);
                    renderContent();
                }
            };
        });

        // Close button
        container.querySelector('#opt-btn-close')?.addEventListener('click', () => {
            closeModal();
        });

        // Save All button
        container.querySelector('#opt-btn-save-all')?.addEventListener('click', async () => {
            const saveBtn = container.querySelector('#opt-btn-save-all');
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.textContent = 'Saving Lookups...';
            }

            draftTypes.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

            const payload = {
                types: draftTypes,
                rulesets: draftRulesets
            };

            const { error } = await updateLookup('sources', payload);
            if (error) {
                showToast(`Error saving lookups: ${error.message || 'Database error'}`, true);
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.textContent = '💾 Save All to Lookups';
                }
                return;
            }

            sourceTypes = draftTypes;
            sourceRulesets = draftRulesets;
            closeModal();
            applyFilters();
            renderSources();
            showToast('Sources options updated successfully!');
        });
    }

    function renderEditingForm(container) {
        const isCat = editingItem.type === 'category';
        const isNew = editingItem.index === null;

        container.innerHTML = `
            <div class="ac-options-modal">
                <div class="ac-options-header">
                    <h3>${isNew ? (isCat ? '+ Add New Category' : '+ Add New Ruleset') : (isCat ? `Edit Category: ${esc(editingItem.item.name)}` : `Edit Ruleset: ${esc(editingItem.item.label)}`)}</h3>
                </div>

                <form id="ac-item-opt-form" class="ac-edit-form">
                    ${isCat ? `
                        <div class="ac-form-grid">
                            <div class="ac-form-group">
                                <label for="sub-input-name">Category Name *</label>
                                <input type="text" id="sub-input-name" required value="${esc(editingItem.item.name || '')}" class="ac-form-input">
                            </div>
                            <div class="ac-form-group">
                                <label for="sub-input-order">Display Order</label>
                                <input type="number" id="sub-input-order" value="${editingItem.item.display_order ?? 0}" class="ac-form-input">
                            </div>
                        </div>
                        <div class="ac-form-group">
                            <label for="sub-input-notes">Contextual Banner Notes</label>
                            <textarea id="sub-input-notes" rows="3" class="ac-form-textarea" placeholder="Displayed at top when this category is selected...">${esc(editingItem.item.notes || '')}</textarea>
                            <small class="ac-form-help">Tip: Markdown links e.g. <code>[Arcana](/arcana/)</code> are rendered as clickable links.</small>
                        </div>
                    ` : `
                        <div class="ac-form-grid">
                            <div class="ac-form-group">
                                <label for="sub-input-label">Ruleset Label *</label>
                                <input type="text" id="sub-input-label" required value="${esc(editingItem.item.label || '')}" placeholder="e.g. 2024" class="ac-form-input">
                            </div>
                            <div class="ac-form-group">
                                <label for="sub-input-value">Ruleset Value *</label>
                                <input type="text" id="sub-input-value" required value="${esc(String(editingItem.item.value ?? ''))}" placeholder="e.g. 2024" class="ac-form-input">
                            </div>
                        </div>
                    `}

                    <div class="ac-form-actions">
                        <button type="button" id="sub-btn-cancel" class="ac-btn-admin ac-btn-secondary">Back</button>
                        <button type="submit" id="sub-btn-apply" class="ac-btn-admin ac-btn-primary">Apply</button>
                    </div>
                </form>
            </div>
        `;

        container.querySelector('#sub-btn-cancel')?.addEventListener('click', () => {
            editingItem = null;
            renderContent();
        });

        const form = container.querySelector('#ac-item-opt-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                if (isCat) {
                    const name = document.getElementById('sub-input-name').value.trim();
                    const order = parseInt(document.getElementById('sub-input-order').value, 10) || 0;
                    const notes = document.getElementById('sub-input-notes').value.trim() || null;
                    if (!name) return;

                    const updated = { name, display_order: order, notes };
                    if (isNew) {
                        draftTypes.push(updated);
                    } else {
                        draftTypes[editingItem.index] = updated;
                    }
                } else {
                    const label = document.getElementById('sub-input-label').value.trim();
                    const val = document.getElementById('sub-input-value').value.trim();
                    if (!label || !val) return;

                    const numVal = isNaN(Number(val)) ? val : Number(val);
                    const updated = { label, value: numVal };
                    if (isNew) {
                        draftRulesets.push(updated);
                    } else {
                        draftRulesets[editingItem.index] = updated;
                    }
                }
                editingItem = null;
                renderContent();
            });
        }
    }

    openModal('<div id="ac-options-container"></div>');
    renderContent();
}

// Window Event Listeners for cache invalidation and admin triggers
if (typeof window !== 'undefined') {
    window.addEventListener('ac:sources-updated', () => {
        const container = document.getElementById('ac-view-sources');
        if (container && container.classList.contains('active')) {
            initSources(true);
        } else {
            allSources = [];
        }
    });
    window.addEventListener('ac:open-source-form', () => openSourceForm(null));
    window.addEventListener('ac:open-options-manager', () => openOptionsManagerModal());
}
