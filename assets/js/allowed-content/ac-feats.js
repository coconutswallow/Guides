/**
 * ================================================================
 * AC FEATS MODULE
 * ================================================================
 * 
 * Data handling and presentation for Allowed Content Feats.
 * Supports complete feat catalogue, Ruleset ('2014' / '2024'), Category
 * ('General', 'Origin', 'Epic Boon', 'Fighting Style', 'Dragonmark', 'Dark Gift'),
 * Sourcebook filtering, search indexing across all fields, interactive
 * detail modal, and full staff administrative capabilities (Add, Edit, Delete).
 * 
 * Features:
 * - Table view with responsive columns: Feat, Ruleset, Category, Prerequisite, Ability Increase, Source, Notes / Advice.
 * - Toolbar with counter, Ruleset filter, Category filter, and Sourcebook filter.
 * - Source lookup integration with badges and tooltips.
 * - Monospace/pill styling for Ability Score Increases and prerequisites.
 * - Detail modal on row click with comprehensive metadata and audit check_id.
 * - Mobile-responsive add/edit form modal for staff administrators with fractional indexing.
 * 
 * @module ACFeats
 */

import { 
    getFeats, 
    createFeat, 
    updateFeat, 
    deleteFeat,
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

let allFeats = [];
let filteredFeats = [];
let availableCategories = [];
let availableSourceKeys = [];

// Active toolbar filters
let selectedRulesetFilter = 'ALL';   // 'ALL' | '2014' | '2024'
let selectedCategoryFilter = 'ALL';  // 'ALL' | specific category
let selectedSourceFilter = 'ALL';    // 'ALL' | specific source_key
let currentSearchTerm = '';

/**
 * Formats Notes / Advice text with markdown link support and inline more/less toggle.
 * 
 * @param {string|null} text
 * @returns {string} HTML markup
 */
export function formatAdvice(text) {
    if (!text || typeof text !== 'string' || text.trim() === '') {
        return '<span style="opacity: 0.4;">—</span>';
    }
    return formatExpandableText(text, 160);
}

/**
 * Formats Prerequisite text.
 * 
 * @param {string|null} text
 * @returns {string} HTML markup
 */
export function formatPrerequisite(text) {
    if (!text || typeof text !== 'string' || text.trim() === '' || text.trim().toLowerCase() === 'none' || text.trim() === '—') {
        return '<span style="opacity: 0.4;">—</span>';
    }
    return esc(text.trim());
}

/**
 * Formats Ability Score Increase text.
 * 
 * @param {string|null} text
 * @returns {string} HTML markup
 */
export function formatAbilityIncrease(text) {
    if (!text || typeof text !== 'string' || text.trim() === '' || text.trim().toLowerCase() === 'none' || text.trim() === '—') {
        return '<span style="opacity: 0.4;">—</span>';
    }
    return esc(text.trim());
}

/**
 * Initializes the Feats view.
 * 
 * @param {boolean} [forceRefresh=false]
 */
export async function initFeats(forceRefresh = false) {
    const container = document.getElementById('ac-view-feats');
    if (!container) return;

    if (forceRefresh) {
        selectedRulesetFilter = 'ALL';
        selectedCategoryFilter = 'ALL';
        selectedSourceFilter = 'ALL';
        currentSearchTerm = '';
    } else if (allFeats.length > 0) {
        applyFilters();
        renderView();
        return;
    }

    container.innerHTML = `
        <div class="ac-loading">
            <div class="spinner"></div>
            <span>Cataloging Feats...</span>
        </div>
    `;

    try {
        const [featsData, _sourcesMap] = await Promise.all([
            getFeats(),
            getSourcesMap(forceRefresh)
        ]);

        allFeats = sortByDisplayOrder(featsData || []);

        // Collect distinct categories
        const catSet = new Set();
        allFeats.forEach(f => {
            if (f.category && f.category.trim()) {
                catSet.add(f.category.trim());
            }
        });
        availableCategories = Array.from(catSet).sort((a, b) => a.localeCompare(b));

        // Collect distinct source keys
        const sourceSet = new Set();
        allFeats.forEach(f => {
            if (f.source) {
                extractSourceKeys(f.source).forEach(k => sourceSet.add(k));
            }
        });
        availableSourceKeys = Array.from(sourceSet).sort((a, b) => a.localeCompare(b));

        applyFilters();
        renderView();
    } catch (err) {
        console.error('Error initializing feats:', err);
        container.innerHTML = `
            <div class="ac-error-state" style="text-align: center; padding: 2rem;">
                <p>Failed to load feats: ${esc(err.message || String(err))}</p>
                <button class="ac-btn-admin ac-btn-secondary" onclick="window.location.reload()">Reload Page</button>
            </div>
        `;
    }
}

/**
 * Applies active toolbar filters and search query to allFeats.
 */
function applyFilters() {
    const term = (currentSearchTerm || '').trim().toLowerCase();

    filteredFeats = allFeats.filter(feat => {
        // 1. Ruleset Filter
        if (selectedRulesetFilter !== 'ALL' && feat.ruleset !== selectedRulesetFilter) {
            return false;
        }

        // 2. Category Filter
        if (selectedCategoryFilter !== 'ALL' && feat.category !== selectedCategoryFilter) {
            return false;
        }

        // 3. Source Filter
        if (selectedSourceFilter !== 'ALL') {
            const featSources = feat.source ? extractSourceKeys(feat.source) : [];
            if (!featSources.includes(selectedSourceFilter) && feat.source !== selectedSourceFilter) {
                return false;
            }
        }

        // 4. Search Filter
        if (term) {
            const matchName = feat.name && feat.name.toLowerCase().includes(term);
            const matchCategory = feat.category && feat.category.toLowerCase().includes(term);
            const matchRuleset = feat.ruleset && feat.ruleset.toLowerCase().includes(term);
            const matchPrereq = feat.prerequisite && feat.prerequisite.toLowerCase().includes(term);
            const matchAsi = feat.ability_increase && feat.ability_increase.toLowerCase().includes(term);
            const matchSource = feat.source && feat.source.toLowerCase().includes(term);
            const matchNotes = feat.notes_advice && feat.notes_advice.toLowerCase().includes(term);
            const matchCheckId = feat.check_id && feat.check_id.toLowerCase().includes(term);

            if (!matchName && !matchCategory && !matchRuleset && !matchPrereq && !matchAsi && !matchSource && !matchNotes && !matchCheckId) {
                return false;
            }
        }

        return true;
    });
}

/**
 * Searches / filters feats dynamically from global search input.
 * 
 * @param {string} term
 */
export function filterFeats(term) {
    currentSearchTerm = term;
    applyFilters();
    renderView();
}

/**
 * Renders the full Feats view including toolbar and table.
 */
function renderView() {
    const container = document.getElementById('ac-view-feats');
    if (!container) return;

    const isAdmin = getAdminMode();

    const html = `
        <div class="ac-feats-container">
            <!-- Toolbar: Filters and Stats -->
            <div class="ac-feats-toolbar ac-classes-toolbar">
                <div class="ac-feats-stats ac-classes-stats" id="feats-stats">
                    Showing <strong>${filteredFeats.length}</strong> ${filteredFeats.length === 1 ? 'Feat' : 'Feats'}
                </div>

                <div class="ac-feats-controls ac-classes-controls">
                    <!-- Ruleset Filter -->
                    <select id="ac-feats-ruleset-filter" class="ac-filter-select" title="Filter by Ruleset" aria-label="Filter by Ruleset">
                        <option value="ALL" ${selectedRulesetFilter === 'ALL' ? 'selected' : ''}>All Rulesets</option>
                        <option value="2024" ${selectedRulesetFilter === '2024' ? 'selected' : ''}>2024 </option>
                        <option value="2014" ${selectedRulesetFilter === '2014' ? 'selected' : ''}>2014 </option>
                    </select>

                    <!-- Category Filter -->
                    <select id="ac-feats-category-filter" class="ac-filter-select" title="Filter by Category" aria-label="Filter by Category">
                        <option value="ALL" ${selectedCategoryFilter === 'ALL' ? 'selected' : ''}>All Categories (${availableCategories.length})</option>
                        ${availableCategories.map(cat => `
                            <option value="${esc(cat)}" ${selectedCategoryFilter === cat ? 'selected' : ''}>${esc(cat)}</option>
                        `).join('')}
                    </select>

                    <!-- Sourcebook Filter -->
                    <select id="ac-feats-source-filter" class="ac-filter-select" title="Filter by Sourcebook" aria-label="Filter by Sourcebook">
                        <option value="ALL" ${selectedSourceFilter === 'ALL' ? 'selected' : ''}>All Sources</option>
                        ${availableSourceKeys.map(k => `
                            <option value="${esc(k)}" ${selectedSourceFilter === k ? 'selected' : ''}>${esc(k)}</option>
                        `).join('')}
                    </select>
                </div>
            </div>

            <!-- Main Content Area: Table -->
            <div id="feats-table-container">
                ${renderTable(isAdmin)}
            </div>
        </div>
    `;

    container.innerHTML = html;
    setupControls();
    setupTableInteractions();
}

/**
 * Generates the HTML table for feats.
 * 
 * @param {boolean} isAdmin
 * @returns {string} Table HTML
 */
function renderTable(isAdmin) {
    if (filteredFeats.length === 0) {
        return `
            <div class="ac-table-wrapper">
                <table class="ac-table" id="feats-table">
                    <thead>
                        <tr>
                            <th class="col-feat-name" style="min-width: 180px;">Feat</th>
                            <th class="col-ruleset" style="width: 90px; text-align: center;">Ruleset</th>
                            <th class="col-category" style="width: 130px;">Category</th>
                            <th class="col-prereq" style="min-width: 160px;">Prerequisite</th>
                            <th class="col-asi" style="min-width: 130px;">ASI</th>
                            <th class="col-source" style="width: 110px; text-align: center;">Source</th>
                            <th class="col-notes" style="min-width: 240px;">Notes / Advice</th>
                            ${isAdmin ? '<th class="col-actions" style="width: 80px; text-align: center;">Actions</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="${isAdmin ? 8 : 7}" style="text-align: center; padding: 3rem;">
                                No feats found matching your criteria.
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    return `
        <div class="ac-table-wrapper">
            <table class="ac-table" id="feats-table">
                <thead>
                    <tr>
                        <th class="col-feat-name" style="min-width: 180px;">Feat</th>
                        <th class="col-ruleset" style="width: 90px; text-align: center;">Ruleset</th>
                        <th class="col-category" style="width: 130px;">Category</th>
                        <th class="col-prereq" style="min-width: 160px;">Prerequisite</th>
                        <th class="col-asi" style="min-width: 130px;">ASI</th>
                        <th class="col-source" style="width: 110px; text-align: center;">Source</th>
                        <th class="col-notes" style="min-width: 240px;">Notes / Advice</th>
                        ${isAdmin ? '<th class="col-actions" style="width: 80px; text-align: center;">Actions</th>' : ''}
                    </tr>
                </thead>
                <tbody>
                    ${filteredFeats.map(feat => renderRow(feat, isAdmin)).join('')}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Generates table row HTML for a feat record.
 * 
 * @param {Object} feat
 * @param {boolean} isAdmin
 * @returns {string} Row HTML
 */
function renderRow(feat, isAdmin) {
    const sources = extractSourceKeys(feat.source);
    const badgesHtml = renderSourceBadges(sources);

    const rulesetBadge = feat.ruleset 
        ? `<span class="ac-badge ac-badge-ruleset ac-ruleset-${feat.ruleset.toLowerCase()}">${esc(feat.ruleset)}</span>`
        : '<span style="opacity: 0.4;">—</span>';

    return `
        <tr class="ac-feat-row" data-feat-id="${esc(feat.id)}" style="cursor: pointer;">
            <td class="col-feat-name">
                <div class="name-cell" style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
                    <strong>${esc(feat.name)}</strong>
                    <span class="row-hover-icon">${isAdmin ? 'Edit / Details →' : 'Details →'}</span>
                </div>
            </td>
            <td class="col-ruleset" style="text-align: center;">${rulesetBadge}</td>
            <td class="col-category">${esc(feat.category || 'General')}</td>
            <td class="col-prereq">${formatPrerequisite(feat.prerequisite)}</td>
            <td class="col-asi">${formatAbilityIncrease(feat.ability_increase)}</td>
            <td class="col-source" style="text-align: center;">${badgesHtml}</td>
            <td class="col-notes">${formatAdvice(feat.notes_advice)}</td>
            ${isAdmin ? `
                <td class="col-actions" style="text-align: center;" onclick="event.stopPropagation();">
                    <button class="ac-btn-admin ac-btn-secondary ac-btn-sm btn-edit-feat" data-feat-id="${esc(feat.id)}" title="Edit Feat" style="padding: 2px 6px;">✏️</button>
                    <button class="ac-btn-admin ac-btn-danger ac-btn-sm btn-delete-feat" data-feat-id="${esc(feat.id)}" title="Delete Feat" style="padding: 2px 6px;">🗑️</button>
                </td>
            ` : ''}
        </tr>
    `;
}

/**
 * Attaches event listeners to toolbar filter dropdowns.
 */
function setupControls() {
    const rulesetFilter = document.getElementById('ac-feats-ruleset-filter');
    if (rulesetFilter) {
        rulesetFilter.onchange = (e) => {
            selectedRulesetFilter = e.target.value;
            applyFilters();
            renderView();
        };
    }

    const categoryFilter = document.getElementById('ac-feats-category-filter');
    if (categoryFilter) {
        categoryFilter.onchange = (e) => {
            selectedCategoryFilter = e.target.value;
            applyFilters();
            renderView();
        };
    }

    const sourceFilter = document.getElementById('ac-feats-source-filter');
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
    const container = document.getElementById('ac-view-feats');
    if (!container) return;

    // Inline more/less button toggle using shared UI utility
    attachExpandableTextListeners(container);

    // Row click -> opens detail modal
    container.querySelectorAll('.ac-feat-row').forEach(row => {
        row.onclick = () => {
            const featId = row.getAttribute('data-feat-id');
            const feat = allFeats.find(f => f.id === featId);
            if (feat) showFeatDetailModal(feat);
        };
    });

    // Admin direct action buttons
    container.querySelectorAll('.btn-edit-feat').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const featId = btn.getAttribute('data-feat-id');
            const feat = allFeats.find(f => f.id === featId);
            if (feat) openFeatForm(feat);
        };
    });

    container.querySelectorAll('.btn-delete-feat').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const featId = btn.getAttribute('data-feat-id');
            const feat = allFeats.find(f => f.id === featId);
            if (feat) confirmAndDeleteFeat(feat);
        };
    });
}

/**
 * Shows the full detail modal for a feat.
 * 
 * @param {Object} feat
 */
export function showFeatDetailModal(feat) {
    const isAdmin = getAdminMode();
    const sources = extractSourceKeys(feat.source);
    const badgesHtml = renderSourceBadges(sources);

    const rulesetBadge = feat.ruleset 
        ? `<span class="ac-badge ac-badge-ruleset ac-ruleset-${feat.ruleset.toLowerCase()}">${esc(feat.ruleset)}</span>` 
        : '<span style="opacity: 0.4;">—</span>';

    const html = `
        <div class="detail-header">
            <h2 class="detail-title" style="margin: 0;">${esc(feat.name)}</h2>
            ${isAdmin ? `
                <div class="detail-actions" style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                    <button class="ac-btn-admin ac-btn-primary ac-btn-sm" id="detail-btn-edit">✏️ Edit Feat</button>
                    <button class="ac-btn-admin ac-btn-danger ac-btn-sm" id="detail-btn-delete">🗑️ Delete</button>
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
                <value>${esc(feat.category || 'General')}</value>
            </div>
            <div class="detail-item">
                <label>Prerequisite</label>
                <value style="font-family: monospace; font-size: 0.95rem;">${esc(feat.prerequisite || 'None')}</value>
            </div>
            <div class="detail-item">
                <label>Ability Score Increase</label>
                <value style="font-family: monospace; font-size: 0.95rem;">${esc(feat.ability_increase || 'None')}</value>
            </div>
            <div class="detail-item">
                <label>Source</label>
                <value>${badgesHtml}</value>
            </div>
            ${isAdmin ? `
                <div class="detail-item">
                    <label>Display Order</label>
                    <value><code style="font-size: 0.85rem;">${formatDisplayOrder(feat.display_order)}</code></value>
                </div>
            ` : ''}
        </div>

        <div class="detail-section">
            <h4>Guild Notes & Advice</h4>
            <div class="advice-content" style="margin-top: 0.35rem; line-height: 1.6;">
                ${feat.notes_advice ? renderMarkdownLinks(feat.notes_advice) : '<span style="opacity: 0.5;">None</span>'}
            </div>
        </div>
    `;

    openModal(html);

    if (isAdmin) {
        const editBtn = document.getElementById('detail-btn-edit');
        if (editBtn) {
            editBtn.onclick = () => {
                closeModal();
                openFeatForm(feat);
            };
        }

        const deleteBtn = document.getElementById('detail-btn-delete');
        if (deleteBtn) {
            deleteBtn.onclick = () => {
                confirmAndDeleteFeat(feat);
            };
        }
    }
}

/**
 * Opens modal dialog to add a new feat or edit an existing one.
 * 
 * @param {Object|null} [featItem=null] - If provided, populates form for editing.
 */
export async function openFeatForm(featItem = null) {
    if (allFeats.length === 0) {
        allFeats = (await getFeats()) || [];
    }

    const isEdit = !!featItem;
    const headerCategory = isEdit ? 'Edit Feat' : 'New Feat';
    const headerTitle = isEdit ? `Edit Feat: ${esc(featItem.name)}` : 'Add New Feat';

    const defaultOrder = isEdit 
        ? featItem.display_order 
        : getNextDisplayOrder(allFeats, 1);

    const categoriesList = ['General', 'Origin', 'Epic Boon', 'Fighting Style', 'Dragonmark', 'Dark Gift'];
    // Merge any existing custom categories
    availableCategories.forEach(c => {
        if (!categoriesList.includes(c)) categoriesList.push(c);
    });

    const html = `
        <div class="detail-header">
            <span class="detail-category" style="font-size: 0.85rem; text-transform: uppercase; color: var(--color-secondary); font-weight: 600;">${headerCategory}</span>
            <h2 class="detail-title" style="margin: 0; font-family: var(--font-header); color: var(--color-primary);">${headerTitle}</h2>
        </div>

        <form id="ac-feat-form" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;">
            <div class="ac-form-group">
                <label for="feat-input-name" style="font-weight: 600;">Feat Name *</label>
                <input type="text" id="feat-input-name" required class="ac-form-input" value="${esc(featItem?.name || '')}" placeholder="e.g. Alert, War Caster, Boon of Combat Prowess">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="ac-form-group">
                    <label for="feat-input-ruleset" style="font-weight: 600;">Ruleset *</label>
                    <select id="feat-input-ruleset" class="ac-form-input ac-form-select" required>
                        <option value="2024" ${featItem?.ruleset === '2024' || (!isEdit) ? 'selected' : ''}>2024</option>
                        <option value="2014" ${featItem?.ruleset === '2014' ? 'selected' : ''}>2014</option>
                    </select>
                </div>

                <div class="ac-form-group">
                    <label for="feat-input-category" style="font-weight: 600;">Category *</label>
                    <select id="feat-input-category" class="ac-form-input ac-form-select" required>
                        ${categoriesList.map(cat => `
                            <option value="${esc(cat)}" ${featItem?.category === cat ? 'selected' : ''}>${esc(cat)}</option>
                        `).join('')}
                    </select>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="ac-form-group">
                    <label for="feat-input-prereq" style="font-weight: 600;">Prerequisite</label>
                    <input type="text" id="feat-input-prereq" class="ac-form-input" value="${esc(featItem?.prerequisite || '')}" placeholder="e.g. Level 4+, CHA 13+ (or leave blank for None)">
                </div>

                <div class="ac-form-group">
                    <label for="feat-input-asi" style="font-weight: 600;">Ability Score Increase</label>
                    <input type="text" id="feat-input-asi" class="ac-form-input" value="${esc(featItem?.ability_increase || '')}" placeholder="e.g. CHA +1 or STR, DEX, or CON +1">
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem;">
                <div class="ac-form-group">
                    <label for="feat-input-source" style="font-weight: 600;">Source *</label>
                    <input type="text" id="feat-input-source" required class="ac-form-input" value="${esc(featItem?.source || 'PHB2024')}" placeholder="e.g. PHB2024, PHB2014, TCE, XGE">
                </div>

                <div class="ac-form-group">
                    <label for="feat-input-order" style="font-weight: 600;">Display Order</label>
                    <input type="number" step="any" id="feat-input-order" class="ac-form-input" value="${defaultOrder}">
                </div>
            </div>

            <div class="ac-form-group">
                <label for="feat-input-notes" style="font-weight: 600;">Notes / Advice / Rulings</label>
                <textarea id="feat-input-notes" class="ac-form-textarea" rows="3" placeholder="Guild rulings, advice notes, markdown links...">${esc(featItem?.notes_advice || '')}</textarea>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
                <button type="button" class="ac-btn-admin ac-btn-secondary" id="feat-form-cancel">Cancel</button>
                <button type="submit" class="ac-btn-admin ac-btn-primary" id="feat-form-submit">${isEdit ? 'Save Changes' : 'Create Feat'}</button>
            </div>
        </form>
    `;

    openModal(html);

    const cancelBtn = document.getElementById('feat-form-cancel');
    if (cancelBtn) cancelBtn.onclick = closeModal;

    const form = document.getElementById('ac-feat-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('feat-form-submit');
            if (submitBtn) submitBtn.disabled = true;

            try {
                const name = document.getElementById('feat-input-name').value.trim();
                const ruleset = document.getElementById('feat-input-ruleset').value;
                const category = document.getElementById('feat-input-category').value;
                const prerequisite = document.getElementById('feat-input-prereq').value.trim() || null;
                const ability_increase = document.getElementById('feat-input-asi').value.trim() || null;
                const source = document.getElementById('feat-input-source').value.trim();
                const notes_advice = document.getElementById('feat-input-notes').value.trim() || null;
                const display_order = parseFloat(document.getElementById('feat-input-order').value) || defaultOrder;

                if (!name || !source) {
                    alert('Feat Name and Source are required.');
                    if (submitBtn) submitBtn.disabled = false;
                    return;
                }

                if (isEdit) {
                    const { error } = await updateFeat(featItem.id, {
                        name,
                        ruleset,
                        category,
                        prerequisite,
                        ability_increase,
                        source,
                        notes_advice,
                        display_order
                    });
                    if (error) throw error;
                } else {
                    const { error } = await createFeat({
                        name,
                        ruleset,
                        category,
                        prerequisite,
                        ability_increase,
                        source,
                        notes_advice,
                        display_order
                    });
                    if (error) throw error;
                }

                closeModal();
                await initFeats(true);
                window.dispatchEvent(new CustomEvent('ac:feats-updated'));
            } catch (err) {
                console.error('Error saving feat:', err);
                alert(`Error saving feat: ${err.message || err}`);
                if (submitBtn) submitBtn.disabled = false;
            }
        };
    }
}

/**
 * Confirms and executes feat deletion.
 * 
 * @param {Object} feat
 */
export async function confirmAndDeleteFeat(feat) {
    const confirmed = window.confirm(`Are you sure you want to delete feat "${feat.name}"?\nThis action cannot be undone.`);
    if (!confirmed) return;

    try {
        const { success, error } = await deleteFeat(feat.id);
        if (error || !success) throw error || new Error('Deletion failed');

        closeModal();
        await initFeats(true);
        window.dispatchEvent(new CustomEvent('ac:feats-updated'));
    } catch (err) {
        console.error('Error deleting feat:', err);
        alert(`Error deleting feat: ${err.message || err}`);
    }
}

if (typeof window !== 'undefined') {
    window.addEventListener('ac:feats-updated', () => {
        allFeats = [];
    });
}
