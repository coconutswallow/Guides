/**
 * ================================================================
 * AC BACKGROUNDS MODULE
 * ================================================================
 * 
 * Data handling and presentation for player character backgrounds.
 * Supports complete background catalogue, Ruleset ('2014' / '2024')
 * and Category ('Official' / 'Homebrew') filtering, source badge lookups,
 * interactive detail modal, and full staff administrative capabilities.
 * 
 * Features:
 * - Table view with responsive columns: Background, Ruleset, Category, Feature, Source, Rage Advice.
 * - Toolbar with counter, Ruleset filter, Category filter, and Sourcebook filter.
 * - Source lookup integration with badges and tooltips.
 * - Rage Advice with markdown links and inline more/less expansion.
 * - Detail modal on row click with full background metadata.
 * - Staff administrative operations (Add, Edit, Delete backgrounds).
 * 
 * @module ACBackgrounds
 */

import { 
    getBackgrounds, 
    createBackground, 
    updateBackground, 
    deleteBackground,
    getSourcesMap, 
    getSourceByKey 
} from './ac-service.js';
import { 
    getNextDisplayOrder, 
    cleanFloat, 
    sortByDisplayOrder, 
    formatDisplayOrder 
} from './ac-order-utils.js';
import { 
    setAdminMode, 
    getAdminMode, 
    getCurrentUser 
} from './ac-auth.js';
import { 
    openModal, 
    closeModal, 
    esc, 
    renderSourceBadges, 
    extractSourceKeys, 
    renderMarkdownLinks, 
    resolveSourceLink,
    formatExpandableText,
    attachExpandableTextListeners
} from './ac-ui-utils.js';

export {
    setAdminMode,
    getAdminMode
};

let allBackgrounds = [];
let filteredBackgrounds = [];
let availableSourceKeys = [];

// Active toolbar filters
let selectedRulesetFilter = 'ALL';   // 'ALL' | '2014' | '2024'
let selectedCategoryFilter = 'ALL';  // 'ALL' | 'Official' | 'Homebrew'
let selectedSourceFilter = 'ALL';    // 'ALL' | specific source_key
let currentSearchTerm = '';

/**
 * Formats Rage Advice text with markdown link support and inline more/less toggle if long.
 * 
 * @param {string|null} text
 * @returns {string} HTML markup
 */
export function formatAdvice(text) {
    return formatExpandableText(text, 160);
}

/**
 * Formats Background Feature text with newline support and inline more/less toggle if long.
 * 
 * @param {string|null} text
 * @returns {string} HTML markup
 */
export function formatFeature(text) {
    if (!text || text.trim() === '' || text.trim() === 'N/A') {
        return '<span style="opacity: 0.4;">N/A</span>';
    }
    return formatExpandableText(text, 160);
}

/**
 * Initializes the Backgrounds view.
 * 
 * @param {boolean} [forceRefresh=false]
 */
export async function initBackgrounds(forceRefresh = false) {
    const container = document.getElementById('ac-view-backgrounds');
    if (!container) return;

    if (!forceRefresh && allBackgrounds.length > 0) {
        applyFilters();
        renderView();
        return;
    }

    container.innerHTML = `
        <div class="ac-loading">
            <div class="spinner"></div>
            <span>Cataloging Backgrounds...</span>
        </div>
    `;

    try {
        const [bgData, _sourcesMap] = await Promise.all([
            getBackgrounds(),
            getSourcesMap(forceRefresh)
        ]);

        allBackgrounds = bgData || [];

        // Build sorted list of source keys
        const sourceSet = new Set();
        allBackgrounds.forEach(bg => {
            if (bg.source) {
                extractSourceKeys(bg.source).forEach(k => sourceSet.add(k));
            }
        });
        availableSourceKeys = Array.from(sourceSet).sort();

        applyFilters();
        renderView();
    } catch (err) {
        console.error('Error initializing backgrounds:', err);
        container.innerHTML = `<div class="ac-error" style="text-align: center; padding: 2rem;">Error loading backgrounds: ${esc(err.message)}</div>`;
    }
}

/**
 * Applies active toolbar filters and search query to allBackgrounds.
 */
function applyFilters() {
    const term = (currentSearchTerm || '').trim().toLowerCase();

    filteredBackgrounds = allBackgrounds.filter(bg => {
        // 1. Ruleset Filter
        if (selectedRulesetFilter !== 'ALL' && bg.ruleset !== selectedRulesetFilter) {
            return false;
        }

        // 2. Category Filter (match 'Official' or 'Homebrew'/'Hawthorne Homebrew')
        if (selectedCategoryFilter !== 'ALL') {
            if (selectedCategoryFilter === 'Homebrew') {
                const isHomebrew = bg.category === 'Homebrew' || bg.category === 'Hawthorne Homebrew';
                if (!isHomebrew) return false;
            } else if (bg.category !== selectedCategoryFilter) {
                return false;
            }
        }

        // 3. Source Filter
        if (selectedSourceFilter !== 'ALL') {
            const bgSources = extractSourceKeys(bg.source);
            if (!bgSources.includes(selectedSourceFilter)) {
                return false;
            }
        }

        // 4. Search Query
        if (term) {
            const bgSources = extractSourceKeys(bg.source);
            const matchesSourceLookup = bgSources.some(k => {
                const srcObj = getSourceByKey(k);
                return srcObj && (
                    srcObj.name.toLowerCase().includes(term) ||
                    srcObj.abbreviation?.toLowerCase().includes(term)
                );
            });

            const matches = 
                bg.name.toLowerCase().includes(term) ||
                (bg.ruleset && bg.ruleset.toLowerCase().includes(term)) ||
                (bg.category && bg.category.toLowerCase().includes(term)) ||
                (bg.source && bg.source.toLowerCase().includes(term)) ||
                matchesSourceLookup ||
                (bg.feature && bg.feature.toLowerCase().includes(term)) ||
                (bg.notes_advice && bg.notes_advice.toLowerCase().includes(term));

            if (!matches) return false;
        }

        return true;
    });
}

/**
 * Filter delegate invoked from the global search router in ac-main.js.
 * 
 * @param {string} searchTerm
 */
export function filterBackgrounds(searchTerm) {
    currentSearchTerm = searchTerm || '';
    applyFilters();
    renderView();
}

/**
 * Renders the Backgrounds container including toolbar and data table.
 */
function renderView() {
    const container = document.getElementById('ac-view-backgrounds');
    if (!container) return;

    const isAdmin = getAdminMode();

    const html = `
        <div class="ac-backgrounds-container">
            <!-- Toolbar: Filters and Controls -->
            <div class="ac-backgrounds-toolbar ac-classes-toolbar">
                <div class="ac-backgrounds-stats ac-classes-stats" id="backgrounds-stats">
                    Showing <strong>${filteredBackgrounds.length}</strong> Backgrounds
                </div>

                <div class="ac-backgrounds-controls ac-classes-controls">
                    <!-- Ruleset Filter (2014 vs 2024) -->
                    <select id="ac-backgrounds-ruleset-filter" class="ac-filter-select" title="Filter by Ruleset" aria-label="Filter by Ruleset">
                        <option value="ALL" ${selectedRulesetFilter === 'ALL' ? 'selected' : ''}>All Rulesets</option>
                        <option value="2014" ${selectedRulesetFilter === '2014' ? 'selected' : ''}>2014 Ruleset</option>
                        <option value="2024" ${selectedRulesetFilter === '2024' ? 'selected' : ''}>2024 Ruleset</option>
                    </select>

                    <!-- Category Filter (Official vs Homebrew) -->
                    <select id="ac-backgrounds-category-filter" class="ac-filter-select" title="Filter by Category" aria-label="Filter by Category">
                        <option value="ALL" ${selectedCategoryFilter === 'ALL' ? 'selected' : ''}>All Categories</option>
                        <option value="Official" ${selectedCategoryFilter === 'Official' ? 'selected' : ''}>Official WotC</option>
                        <option value="Homebrew" ${selectedCategoryFilter === 'Homebrew' ? 'selected' : ''}>Hawthorne Homebrew</option>
                    </select>

                    <!-- Source Filter -->
                    <select id="ac-backgrounds-source-filter" class="ac-filter-select" title="Filter by Sourcebook" aria-label="Filter by Sourcebook">
                        <option value="ALL">All Sources (${availableSourceKeys.length})</option>
                        ${availableSourceKeys.map(k => {
                            const src = getSourceByKey(k);
                            const label = src ? `${k} - ${src.name}` : k;
                            return `<option value="${esc(k)}" ${selectedSourceFilter === k ? 'selected' : ''}>${esc(label)}</option>`;
                        }).join('')}
                    </select>
                </div>
            </div>

            <!-- Main Content Area: Table -->
            <div id="backgrounds-table-container">
                ${renderTable(isAdmin)}
            </div>
        </div>
    `;

    container.innerHTML = html;
    setupControls();
    setupTableInteractions();
}

/**
 * Generates the HTML table for backgrounds.
 * 
 * @param {boolean} isAdmin
 * @returns {string} Table HTML
 */
function renderTable(isAdmin) {
    if (filteredBackgrounds.length === 0) {
        return `
            <div class="ac-table-wrapper">
                <table class="ac-table" id="backgrounds-table">
                    <thead>
                        <tr>
                            <th style="min-width: 180px;">Background</th>
                            <th style="width: 90px; text-align: center;">Ruleset</th>
                            <th style="width: 120px;">Category</th>
                            <th style="min-width: 220px;">Feature</th>
                            <th style="width: 120px; text-align: center;">Source</th>
                            <th style="min-width: 240px;">Rage Advice</th>
                            ${isAdmin ? '<th style="width: 80px; text-align: center;">Actions</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="${isAdmin ? 7 : 6}" style="text-align: center; padding: 3rem;">
                                No backgrounds found matching your criteria.
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    return `
        <div class="ac-table-wrapper">
            <table class="ac-table" id="backgrounds-table">
                <thead>
                    <tr>
                        <th style="min-width: 180px;">Background</th>
                        <th style="width: 90px; text-align: center;">Ruleset</th>
                        <th style="width: 120px;">Category</th>
                        <th style="min-width: 220px;">Feature</th>
                        <th style="width: 120px; text-align: center;">Source</th>
                        <th style="min-width: 240px;">Rage Advice</th>
                        ${isAdmin ? '<th style="width: 80px; text-align: center;">Actions</th>' : ''}
                    </tr>
                </thead>
                <tbody>
                    ${filteredBackgrounds.map(bg => renderRow(bg, isAdmin)).join('')}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Generates table row HTML for a background record.
 * 
 * @param {Object} bg
 * @param {boolean} isAdmin
 * @returns {string} Row HTML
 */
function renderRow(bg, isAdmin) {
    const sources = extractSourceKeys(bg.source);
    const badgesHtml = renderSourceBadges(sources);

    const rulesetBadge = bg.ruleset 
        ? `<span class="ac-badge ac-badge-ruleset ac-ruleset-${bg.ruleset.toLowerCase()}">${esc(bg.ruleset)}</span>`
        : '<span style="opacity: 0.4;">—</span>';

    const categoryText = bg.category === 'Homebrew' ? 'Hawthorne Homebrew' : (bg.category || 'Official');

    return `
        <tr class="ac-bg-row" data-bg-id="${esc(bg.id)}" style="cursor: pointer;">
            <td class="col-bg-name">
                <div class="name-cell" style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
                    <strong>${esc(bg.name)}</strong>
                    <span class="row-hover-icon">${isAdmin ? 'Edit / Details →' : 'Details →'}</span>
                </div>
            </td>
            <td class="col-bg-ruleset" style="text-align: center;">${rulesetBadge}</td>
            <td class="col-bg-category">${esc(categoryText)}</td>
            <td class="col-bg-feature">${formatFeature(bg.feature)}</td>
            <td class="col-bg-source" style="text-align: center;">${badgesHtml}</td>
            <td class="col-bg-notes">${formatAdvice(bg.notes_advice)}</td>
            ${isAdmin ? `
                <td class="col-bg-actions" style="text-align: center;" onclick="event.stopPropagation();">
                    <button class="ac-btn-admin ac-btn-secondary ac-btn-sm btn-edit-bg" data-bg-id="${esc(bg.id)}" title="Edit Background" style="padding: 2px 6px;">✏️</button>
                    <button class="ac-btn-admin ac-btn-danger ac-btn-sm btn-delete-bg" data-bg-id="${esc(bg.id)}" title="Delete Background" style="padding: 2px 6px;">🗑️</button>
                </td>
            ` : ''}
        </tr>
    `;
}

/**
 * Attaches event listeners to toolbar filter dropdowns.
 */
function setupControls() {
    const rulesetFilter = document.getElementById('ac-backgrounds-ruleset-filter');
    if (rulesetFilter) {
        rulesetFilter.onchange = (e) => {
            selectedRulesetFilter = e.target.value;
            applyFilters();
            renderView();
        };
    }

    const categoryFilter = document.getElementById('ac-backgrounds-category-filter');
    if (categoryFilter) {
        categoryFilter.onchange = (e) => {
            selectedCategoryFilter = e.target.value;
            applyFilters();
            renderView();
        };
    }

    const sourceFilter = document.getElementById('ac-backgrounds-source-filter');
    if (sourceFilter) {
        sourceFilter.onchange = (e) => {
            selectedSourceFilter = e.target.value;
            applyFilters();
            renderView();
        };
    }
}

/**
 * Attaches row click and inline action listeners to the table.
 */
function setupTableInteractions() {
    const container = document.getElementById('ac-view-backgrounds');
    if (!container) return;

    // Inline more/less button toggle using shared UI utility
    attachExpandableTextListeners(container);

    // Row click -> opens detail modal
    container.querySelectorAll('.ac-bg-row').forEach(row => {
        row.onclick = () => {
            const bgId = row.getAttribute('data-bg-id');
            const bg = allBackgrounds.find(b => b.id === bgId);
            if (bg) showBackgroundDetail(bg);
        };
    });

    // Admin direct action buttons
    container.querySelectorAll('.btn-edit-bg').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const bgId = btn.getAttribute('data-bg-id');
            const bg = allBackgrounds.find(b => b.id === bgId);
            if (bg) openBackgroundForm(bg);
        };
    });

    container.querySelectorAll('.btn-delete-bg').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const bgId = btn.getAttribute('data-bg-id');
            const bg = allBackgrounds.find(b => b.id === bgId);
            if (bg) confirmAndDeleteBackground(bg);
        };
    });
}

/**
 * Shows the full detail modal for a background.
 * 
 * @param {Object} bg
 */
export function showBackgroundDetail(bg) {
    const isAdmin = getAdminMode();
    const sources = extractSourceKeys(bg.source);
    const badgesHtml = renderSourceBadges(sources);

    const rulesetBadge = bg.ruleset 
        ? `<span class="ac-badge ac-badge-ruleset ac-ruleset-${bg.ruleset.toLowerCase()}">${esc(bg.ruleset)}</span>` 
        : '<span style="opacity: 0.4;">—</span>';
    const categoryBadge = bg.category 
        ? `<span class="ac-badge ac-badge-category">${esc(bg.category === 'Homebrew' ? 'Hawthorne Homebrew' : bg.category)}</span>` 
        : '<span style="opacity: 0.4;">—</span>';

    const html = `
        <div class="detail-header">
            <h2 class="detail-title" style="margin: 0;">${esc(bg.name)}</h2>
            ${isAdmin ? `
                <div class="detail-actions">
                    <button id="modal-btn-edit-background" class="ac-btn-admin ac-btn-primary" title="Edit background">✏️ Edit</button>
                    <button id="modal-btn-delete-background" class="ac-btn-admin ac-btn-delete" title="Delete background">🗑️ Delete</button>
                </div>
            ` : ''}
        </div>

        <div class="detail-grid">
            <div class="detail-item">
                <label>Ruleset</label>
                <value>${rulesetBadge}</value>
            </div>
            <div class="detail-item">
                <label>Category</label>
                <value>${categoryBadge}</value>
            </div>
            <div class="detail-item">
                <label>Source</label>
                <value>${badgesHtml}</value>
            </div>
        </div>

        <div class="detail-section">
            <h4>Background Feature</h4>
            <div style="margin-top: 0.35rem; line-height: 1.6; white-space: pre-wrap;">${bg.feature && bg.feature.trim() !== 'N/A' 
                ? renderMarkdownLinks(bg.feature.trim()) 
                : '<span style="opacity: 0.6;">N/A (Replacement or standard background)</span>'}</div>
        </div>

        ${bg.notes_advice && bg.notes_advice.trim() ? `
            <div class="detail-section">
                <h4>Notes / Rage Advice</h4>
                <div class="advice-box" style="margin-top: 0.35rem; line-height: 1.6; white-space: pre-wrap; color: var(--color-secondary);">${renderMarkdownLinks(bg.notes_advice.trim())}</div>
            </div>
        ` : ''}
    `;

    openModal(html);

    if (isAdmin) {
        const editBtn = document.getElementById('modal-btn-edit-background');
        if (editBtn) {
            editBtn.onclick = () => {
                closeModal();
                openBackgroundForm(bg);
            };
        }

        const deleteBtn = document.getElementById('modal-btn-delete-background');
        if (deleteBtn) {
            deleteBtn.onclick = () => {
                confirmAndDeleteBackground(bg);
            };
        }
    }
}

/**
 * Opens modal dialog to add a new background or edit an existing one.
 * 
 * @param {Object|null} [bgItem=null] - If provided, populates form for editing.
 */
export async function openBackgroundForm(bgItem = null) {
    if (allBackgrounds.length === 0) {
        allBackgrounds = (await getBackgrounds()) || [];
    }

    const isEdit = !!bgItem;
    const headerCategory = isEdit ? 'Edit Background' : 'New Background';
    const headerTitle = isEdit ? `Edit Background: ${esc(bgItem.name)}` : 'Add New Background';

    const defaultOrder = isEdit 
        ? bgItem.display_order 
        : getNextDisplayOrder(allBackgrounds, 1);

    const html = `
        <div class="detail-header">
            <span class="detail-category">${headerCategory}</span>
            <h2 class="detail-title">${headerTitle}</h2>
        </div>

        <form id="ac-background-form" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;">
            <div class="ac-form-group">
                <label for="bg-input-name">Background Name *</label>
                <input type="text" id="bg-input-name" required class="ac-form-input" value="${esc(bgItem?.name || '')}" placeholder="e.g. Acolyte, Wayfarer, Inheritor">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="ac-form-group">
                    <label for="bg-input-ruleset">Ruleset *</label>
                    <select id="bg-input-ruleset" class="ac-form-input ac-form-select" required>
                        <option value="2014" ${bgItem?.ruleset === '2014' ? 'selected' : ''}>2014</option>
                        <option value="2024" ${bgItem?.ruleset === '2024' || (!isEdit) ? 'selected' : ''}>2024</option>
                    </select>
                </div>

                <div class="ac-form-group">
                    <label for="bg-input-category">Category *</label>
                    <select id="bg-input-category" class="ac-form-input ac-form-select" required>
                        <option value="Official" ${(!bgItem || bgItem.category === 'Official') ? 'selected' : ''}>Official</option>
                        <option value="Homebrew" ${bgItem?.category === 'Homebrew' || bgItem?.category === 'Hawthorne Homebrew' ? 'selected' : ''}>Hawthorne Homebrew</option>
                    </select>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem;">
                <div class="ac-form-group">
                    <label for="bg-input-source">Source *</label>
                    <input type="text" id="bg-input-source" required class="ac-form-input" value="${esc(bgItem?.source || 'PHB2024')}" placeholder="e.g. PHB2024, PHB2014, SCAG, VRGR">
                </div>

                <div class="ac-form-group">
                    <label for="bg-input-order">Display Order</label>
                    <input type="number" step="any" id="bg-input-order" class="ac-form-input" value="${defaultOrder}">
                </div>
            </div>

            <div class="ac-form-group">
                <label for="bg-input-feature">Background Feature</label>
                <textarea id="bg-input-feature" class="ac-form-textarea" rows="3" placeholder="e.g. Shelter of the Faithful or feat & ability bonus specs">${esc(bgItem?.feature || '')}</textarea>
            </div>

            <div class="ac-form-group">
                <label for="bg-input-notes">Notes / Rage Advice</label>
                <textarea id="bg-input-notes" class="ac-form-textarea" rows="3" placeholder="Guild rulings, replacement notes, links...">${esc(bgItem?.notes_advice || '')}</textarea>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
                <button type="button" class="ac-btn-admin ac-btn-secondary" id="bg-form-cancel">Cancel</button>
                <button type="submit" class="ac-btn-admin ac-btn-primary" id="bg-form-submit">${isEdit ? 'Save Changes' : 'Create Background'}</button>
            </div>
        </form>
    `;

    openModal(html);

    const cancelBtn = document.getElementById('bg-form-cancel');
    if (cancelBtn) cancelBtn.onclick = closeModal;

    const form = document.getElementById('ac-background-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('bg-form-submit');
            if (submitBtn) submitBtn.disabled = true;

            try {
                const name = document.getElementById('bg-input-name').value.trim();
                const ruleset = document.getElementById('bg-input-ruleset').value;
                const category = document.getElementById('bg-input-category').value;
                const source = document.getElementById('bg-input-source').value.trim();
                const feature = document.getElementById('bg-input-feature').value.trim() || null;
                const notes_advice = document.getElementById('bg-input-notes').value.trim() || null;
                const display_order = parseFloat(document.getElementById('bg-input-order').value) || defaultOrder;

                if (!name || !source) {
                    alert('Name and Source are required.');
                    if (submitBtn) submitBtn.disabled = false;
                    return;
                }

                if (isEdit) {
                    const { error } = await updateBackground(bgItem.id, {
                        name,
                        ruleset,
                        category,
                        source,
                        feature,
                        notes_advice,
                        display_order
                    });
                    if (error) throw error;
                } else {
                    const { error } = await createBackground({
                        name,
                        ruleset,
                        category,
                        source,
                        feature,
                        notes_advice,
                        display_order
                    });
                    if (error) throw error;
                }

                closeModal();
                await initBackgrounds(true);
                window.dispatchEvent(new CustomEvent('ac:backgrounds-updated'));
            } catch (err) {
                console.error('Error saving background:', err);
                alert(`Error saving background: ${err.message || err}`);
                if (submitBtn) submitBtn.disabled = false;
            }
        };
    }
}

/**
 * Confirms and executes background deletion.
 * 
 * @param {Object} bg
 */
export async function confirmAndDeleteBackground(bg) {
    const confirmed = window.confirm(`Are you sure you want to delete background "${bg.name}"?\nThis action cannot be undone.`);
    if (!confirmed) return;

    try {
        const { success, error } = await deleteBackground(bg.id);
        if (error || !success) throw error || new Error('Deletion failed');

        closeModal();
        await initBackgrounds(true);
        window.dispatchEvent(new CustomEvent('ac:backgrounds-updated'));
    } catch (err) {
        console.error('Error deleting background:', err);
        alert(`Error deleting background: ${err.message || err}`);
    }
}

if (typeof window !== 'undefined') {
    window.addEventListener('ac:backgrounds-updated', () => {
        allBackgrounds = [];
    });
}
