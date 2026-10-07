/**
 * ================================================================
 * AC EQUIPMENT MODULE
 * ================================================================
 * 
 * Presentation, filtering, and administration controller for
 * Allowed Content Equipment and Equipment Types.
 * 
 * Responsibilities:
 * - Rendering normalized equipment catalog with categories, editions ('2014' / '2024'),
 *   multi-source tags, cost, weight, crafting requirements, and staff notes.
 * - Multi-criteria toolbar: Category / Section filter, Ruleset filter, Source filter, and live text search.
 * - Category guidelines banner displayed when viewing specific categories.
 * - Interactive detail modal on row click with deep-linking support.
 * - Staff administration workflows (Add, Edit, Delete) with fractional order indexing.
 * 
 * @module ACEquipment
 */

import { 
    getEquipment, 
    getEquipTypes,
    createEquipment, 
    updateEquipment, 
    deleteEquipment,
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
    attachExpandableTextListeners,
    renderSourceTagPicker,
    showToast 
} from './ac-ui-utils.js';

export {
    setAdminMode,
    getAdminMode
};

// Module State
let allEquipment = [];
let filteredEquipment = [];
let allEquipTypes = [];
let availableSourceKeys = [];
let collapsedCategories = new Set();

// Active toolbar filters
let selectedTypeFilter = 'ALL';      // 'ALL' | specific category name
let selectedRulesetFilter = 'ALL';   // 'ALL' | '2024' | '2014'
let selectedSourceFilter = 'ALL';    // 'ALL' | specific source_key
let currentSearchTerm = '';

/**
 * Initializes the Equipment view.
 * 
 * @param {boolean} [forceRefresh=false]
 */
export async function initEquipment(forceRefresh = false) {
    const container = document.getElementById('ac-view-equipment');
    if (!container) return;

    if (forceRefresh) {
        selectedTypeFilter = 'ALL';
        selectedRulesetFilter = 'ALL';
        selectedSourceFilter = 'ALL';
        currentSearchTerm = '';
        collapsedCategories.clear();
    } else if (allEquipment.length > 0) {
        applyFilters();
        updateTableOnly();
        return;
    }

    container.innerHTML = `
        <div class="ac-loading">
            <div class="spinner"></div>
            <span>Cataloging Equipment & Gear...</span>
        </div>
    `;

    try {
        const [equipmentData, typesData, _sourcesMap] = await Promise.all([
            getEquipment(),
            getEquipTypes(),
            getSourcesMap(forceRefresh)
        ]);

        allEquipment = sortByDisplayOrder(equipmentData || []);
        allEquipTypes = sortByDisplayOrder(typesData || []);

        // Extract available source keys for dropdown filter
        const srcSet = new Set();
        allEquipment.forEach(item => {
            if (item.source) {
                const keys = Array.isArray(item.source) 
                    ? item.source 
                    : extractSourceKeys(item.source);
                keys.forEach(k => srcSet.add(k));
            }
        });
        availableSourceKeys = Array.from(srcSet).sort();

        applyFilters();
        renderView();
    } catch (err) {
        console.error('Error initializing Equipment module:', err);
        container.innerHTML = `
            <div class="ac-error-state">
                <p>Failed to load equipment: ${esc(err.message)}</p>
                <button class="ac-btn-admin ac-btn-sm" onclick="window.location.reload()">Retry</button>
            </div>
        `;
    }
}

/**
 * Applies active toolbar filters and search query to allEquipment.
 */
function applyFilters() {
    const term = (currentSearchTerm || '').trim().toLowerCase();

    filteredEquipment = allEquipment.filter(item => {
        // 1. Category / Type Filter
        if (selectedTypeFilter !== 'ALL') {
            const typeName = item.equip_type?.name || item.category?.name || '';
            if (typeName !== selectedTypeFilter) {
                return false;
            }
        }

        // 2. Ruleset Filter
        if (selectedRulesetFilter !== 'ALL' && item.ruleset !== selectedRulesetFilter) {
            return false;
        }

        // 3. Source Filter
        if (selectedSourceFilter !== 'ALL') {
            const itemSources = Array.isArray(item.source)
                ? item.source
                : (item.source ? extractSourceKeys(item.source) : []);
            if (!itemSources.includes(selectedSourceFilter)) {
                return false;
            }
        }

        // 4. Live Search Filter (Short-Circuit Evaluation)
        if (term) {
            const typeName = item.equip_type?.name || item.category?.name || '';
            const sourceStr = Array.isArray(item.source) ? item.source.join(' ') : (item.source || '');
            const matches = 
                (item.name && item.name.toLowerCase().includes(term)) ||
                (item.check_id && item.check_id.toLowerCase().includes(term)) ||
                (typeName && typeName.toLowerCase().includes(term)) ||
                (item.ruleset && item.ruleset.toLowerCase().includes(term)) ||
                (sourceStr && sourceStr.toLowerCase().includes(term)) ||
                (item.cost_gp && item.cost_gp.toString().toLowerCase().includes(term)) ||
                (item.weight_lbs && item.weight_lbs.toString().toLowerCase().includes(term)) ||
                (item.craft_reqs && item.craft_reqs.toLowerCase().includes(term)) ||
                (item.description && item.description.toLowerCase().includes(term)) ||
                (item.notes_advice && item.notes_advice.toLowerCase().includes(term));

            if (!matches) return false;
        }

        return true;
    });
}

/**
 * Searches / filters equipment dynamically from global search input.
 * 
 * @param {string} term
 */
export function filterEquipment(term) {
    currentSearchTerm = term;
    applyFilters();
    updateTableOnly();
}

/**
 * Renders the full Equipment view shell including toolbar, category banner, and table container.
 */
function renderView() {
    const container = document.getElementById('ac-view-equipment');
    if (!container) return;

    const isAdmin = getAdminMode();
    const visibleGroups = groupEquipmentByCategory(filteredEquipment);
    const allCollapsed = visibleGroups.length > 0 && visibleGroups.every(g => collapsedCategories.has(g.name));

    container.innerHTML = `
        <div class="ac-equipment-container">
            <!-- Toolbar: Filters and Stats -->
            <div class="ac-equipment-toolbar ac-classes-toolbar">
                <div class="ac-equipment-stats ac-classes-stats" id="equipment-stats">
                    Showing <strong>${filteredEquipment.length}</strong> ${filteredEquipment.length === 1 ? 'Item' : 'Items'}
                </div>

                <div class="ac-equipment-controls ac-classes-controls">
                    <!-- Category Filter -->
                    <select id="ac-equipment-type-filter" class="ac-filter-select" title="Filter by Category" aria-label="Filter by Category">
                        <option value="ALL">All Categories (${allEquipTypes.length})</option>
                        ${allEquipTypes.map(t => `
                            <option value="${esc(t.name)}" ${selectedTypeFilter === t.name ? 'selected' : ''}>${esc(t.name)}</option>
                        `).join('')}
                    </select>

                    <!-- Ruleset Filter -->
                    <select id="ac-equipment-ruleset-filter" class="ac-filter-select" title="Filter by Ruleset" aria-label="Filter by Ruleset">
                        <option value="ALL">All Rulesets</option>
                        <option value="2024" ${selectedRulesetFilter === '2024' ? 'selected' : ''}>2024</option>
                        <option value="2014" ${selectedRulesetFilter === '2014' ? 'selected' : ''}>2014</option>
                    </select>

                    <!-- Sourcebook Filter -->
                    <select id="ac-equipment-source-filter" class="ac-filter-select" title="Filter by Source" aria-label="Filter by Source">
                        <option value="ALL">All Sources (${availableSourceKeys.length})</option>
                        ${availableSourceKeys.map(k => `
                            <option value="${esc(k)}" ${selectedSourceFilter === k ? 'selected' : ''}>${esc(k)}</option>
                        `).join('')}
                    </select>

                    <button type="button" id="ac-equipment-toggle-all-btn" class="ac-btn-toggle-all" title="Toggle expanding or collapsing all categories">
                        ${allCollapsed ? 'Expand All ▼' : 'Collapse All ▲'}
                    </button>
                </div>
            </div>

            <!-- Optional Category Notes / Guidelines Banner -->
            <div id="equipment-category-banner">
                ${renderCategoryBanner()}
            </div>

            <!-- Main Content Area: Table Wrapper -->
            <div id="equipment-table-container">
                ${renderTable(isAdmin)}
            </div>
        </div>
    `;

    setupControls();
    setupTableInteractions();
}

/**
 * Renders notes or special guidelines for the currently selected equipment category.
 * (Guidelines are now presented inline directly inside category subheadings in the table).
 * 
 * @returns {string} Empty string to avoid duplicate banner
 */
function renderCategoryBanner() {
    return '';
}

/**
 * Groups filtered equipment items by their category according to allEquipTypes ordering.
 * 
 * @param {Array} items - Filtered equipment array
 * @returns {Array<Object>} Group objects with name, notes, and items array
 */
function groupEquipmentByCategory(items) {
    const groups = [];
    const handledIds = new Set();

    // 1. Group by known allEquipTypes (preserves canonical display_order)
    allEquipTypes.forEach(catType => {
        const matchingItems = items.filter(item => {
            const typeId = item.equip_type_id || item.category_id;
            const typeName = item.equip_type?.name || item.category?.name;
            return typeId === catType.id || typeName === catType.name;
        });

        if (matchingItems.length > 0) {
            matchingItems.forEach(i => handledIds.add(i.id));
            groups.push({
                type: catType,
                name: catType.name,
                notes: catType.notes || null,
                items: matchingItems
            });
        }
    });

    // 2. Unhandled / unmapped items fallback
    const unhandled = items.filter(i => !handledIds.has(i.id));
    if (unhandled.length > 0) {
        const remainingMap = new Map();
        unhandled.forEach(i => {
            const name = i.equip_type?.name || i.category?.name || 'Other Equipment';
            if (!remainingMap.has(name)) {
                remainingMap.set(name, []);
            }
            remainingMap.get(name).push(i);
        });

        for (const [name, remainingItems] of remainingMap.entries()) {
            groups.push({
                type: null,
                name,
                notes: null,
                items: remainingItems
            });
        }
    }

    return groups;
}

/**
 * Updates only the table content and stats counter without full shell rerender.
 */
function updateTableOnly() {
    const tableContainer = document.getElementById('equipment-table-container');
    const statsContainer = document.getElementById('equipment-stats');
    const bannerContainer = document.getElementById('equipment-category-banner');
    const isAdmin = getAdminMode();

    if (statsContainer) {
        statsContainer.innerHTML = `Showing <strong>${filteredEquipment.length}</strong> ${filteredEquipment.length === 1 ? 'Item' : 'Items'}`;
    }

    if (bannerContainer) {
        bannerContainer.innerHTML = renderCategoryBanner();
    }

    if (tableContainer) {
        tableContainer.innerHTML = renderTable(isAdmin);
        attachExpandableTextListeners(tableContainer);
    }

    updateToggleAllBtn();
}

/**
 * Generates the HTML table for equipment grouped by category subheadings.
 * 
 * @param {boolean} isAdmin
 * @returns {string} Table HTML
 */
function renderTable(isAdmin) {
    const totalCols = isAdmin ? 8 : 7;

    if (filteredEquipment.length === 0) {
        return `
            <div class="ac-table-wrapper">
                <table class="ac-table" id="equipment-table">
                    <thead>
                        <tr>
                            <th class="col-name" style="min-width: 200px;">Item</th>
                            <th class="col-ruleset" style="width: 85px; text-align: center;">Ruleset</th>
                            <th class="col-cost" style="width: 95px;">Cost</th>
                            <th class="col-weight" style="width: 85px;">Weight</th>
                            <th class="col-craft" style="width: 145px;">Crafting</th>
                            <th class="col-source" style="width: 120px; text-align: center;">Source</th>
                            <th class="col-notes" style="min-width: 260px;">Notes / Description</th>
                            ${isAdmin ? '<th class="col-actions" style="width: 85px; text-align: center;">Actions</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="${totalCols}" style="text-align: center; padding: 3rem;">
                                No equipment found matching your criteria.
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    const groups = groupEquipmentByCategory(filteredEquipment);

    return `
        <div class="ac-table-wrapper">
            <table class="ac-table" id="equipment-table">
                <thead>
                    <tr>
                        <th class="col-name" style="min-width: 200px;">Item</th>
                        <th class="col-ruleset" style="width: 85px; text-align: center;">Ruleset</th>
                        <th class="col-cost" style="width: 95px;">Cost</th>
                        <th class="col-weight" style="width: 85px;">Weight</th>
                        <th class="col-craft" style="width: 145px;">Crafting</th>
                        <th class="col-source" style="width: 120px; text-align: center;">Source</th>
                        <th class="col-notes" style="min-width: 260px;">Notes / Description</th>
                        ${isAdmin ? '<th class="col-actions" style="width: 85px; text-align: center;">Actions</th>' : ''}
                    </tr>
                </thead>
                <tbody>
                    ${groups.map(group => {
                        const isCollapsed = collapsedCategories.has(group.name);
                        const subheadingHtml = `
                            <tr class="ac-table-group-header ${isCollapsed ? 'collapsed' : ''}" data-category="${esc(group.name)}" role="button" aria-expanded="${!isCollapsed}" tabindex="0">
                                <td colspan="${totalCols}">
                                    <div class="ac-table-group-main">
                                        <span class="accordion-chevron">${isCollapsed ? '▶' : '▼'}</span>
                                        <span class="ac-table-group-title">${esc(group.name)}</span>
                                        <span class="ac-counter-pill">${group.items.length} ${group.items.length === 1 ? 'Item' : 'Items'}</span>${group.notes ? `
                                        <span class="ac-table-group-divider">—</span>
                                        <span class="ac-table-group-notes">${renderMarkdownLinks(group.notes.trim())}</span>` : ''}
                                        <span class="ac-group-hover-hint">${isCollapsed ? 'Expand ▼' : 'Collapse ▲'}</span>
                                    </div>
                                </td>
                            </tr>
                        `;

                        const itemsHtml = group.items.map(item => {
                            const summaryText = item.notes_advice || item.description || '—';
                            const craftSummary = (item.craft_cost_gp && item.craft_cost_gp !== '—')
                                ? `${esc(item.craft_cost_gp)} GP / ${esc(item.craft_cost_dtp || 0)} DTP`
                                : '—';

                            let formattedCost = '—';
                            if (item.cost_gp && item.cost_gp !== '—') {
                                const cStr = String(item.cost_gp).trim();
                                formattedCost = (!isNaN(cStr) && !cStr.toLowerCase().includes('gp')) 
                                    ? `${cStr} GP` 
                                    : cStr;
                            }

                            let formattedWeight = '—';
                            if (item.weight_lbs && item.weight_lbs !== '—') {
                                const wStr = String(item.weight_lbs).trim();
                                formattedWeight = (!isNaN(wStr) && !wStr.toLowerCase().includes('lb')) 
                                    ? `${wStr} lbs` 
                                    : wStr;
                            }

                            return `
                                <tr data-id="${item.id}" data-category="${esc(group.name)}" class="ac-equipment-row ${isCollapsed ? 'ac-group-collapsed' : ''}" style="${isCollapsed ? 'display: none;' : ''}">
                                    <td class="col-name">
                                        <div class="name-cell">
                                            <strong>${esc(item.name)}</strong>
                                            <span class="row-hover-icon">Details →</span>
                                        </div>
                                    </td>
                                    <td class="col-ruleset" style="text-align: center;">
                                        <span class="ruleset-pill">${esc(item.ruleset)}</span>
                                    </td>
                                    <td class="col-cost">${esc(formattedCost)}</td>
                                    <td class="col-weight">${esc(formattedWeight)}</td>
                                    <td class="col-craft">${craftSummary}</td>
                                    <td class="col-source" style="text-align: center;">
                                        ${renderSourceBadges(item.source)}
                                    </td>
                                    <td class="col-notes">
                                        ${formatExpandableText(summaryText, 140)}
                                    </td>
                                    ${isAdmin ? `
                                        <td class="col-actions" style="text-align: center;" onclick="event.stopPropagation()">
                                            <button class="ac-btn-admin ac-btn-sm btn-edit" data-id="${item.id}" title="Edit Equipment">✏️</button>
                                            <button class="ac-btn-admin ac-btn-sm ac-btn-delete btn-del" data-id="${item.id}" title="Delete Equipment">🗑️</button>
                                        </td>
                                    ` : ''}
                                </tr>
                            `;
                        }).join('');

                        return subheadingHtml + itemsHtml;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Sets up toolbar dropdown listeners.
 */
function setupControls() {
    const typeSelect = document.getElementById('ac-equipment-type-filter');
    const rulesetSelect = document.getElementById('ac-equipment-ruleset-filter');
    const sourceSelect = document.getElementById('ac-equipment-source-filter');
    const toggleAllBtn = document.getElementById('ac-equipment-toggle-all-btn');

    if (typeSelect) {
        typeSelect.onchange = (e) => {
            selectedTypeFilter = e.target.value;
            if (selectedTypeFilter !== 'ALL') {
                collapsedCategories.delete(selectedTypeFilter);
            }
            applyFilters();
            updateTableOnly();
        };
    }

    if (rulesetSelect) {
        rulesetSelect.onchange = (e) => {
            selectedRulesetFilter = e.target.value;
            applyFilters();
            updateTableOnly();
        };
    }

    if (sourceSelect) {
        sourceSelect.onchange = (e) => {
            selectedSourceFilter = e.target.value;
            applyFilters();
            updateTableOnly();
        };
    }

    if (toggleAllBtn) {
        toggleAllBtn.onclick = () => {
            const groups = groupEquipmentByCategory(filteredEquipment);
            const allCollapsed = groups.length > 0 && groups.every(g => collapsedCategories.has(g.name));
            if (allCollapsed) {
                // Expand all
                groups.forEach(g => collapsedCategories.delete(g.name));
            } else {
                // Collapse all
                groups.forEach(g => collapsedCategories.add(g.name));
            }
            updateTableOnly();
        };
    }
}

/**
 * Attaches delegated click listeners to the equipment table wrapper.
 */
function setupTableInteractions() {
    const tableContainer = document.getElementById('equipment-table-container');
    if (!tableContainer) return;

    attachExpandableTextListeners(tableContainer);

    tableContainer.onclick = (e) => {
        // 0a. Category Subheading Accordion Toggle
        const groupHeader = e.target.closest('tr.ac-table-group-header');
        if (groupHeader && !e.target.closest('a, button')) {
            const categoryName = groupHeader.dataset.category;
            if (categoryName) {
                toggleCategory(categoryName);
            }
            return;
        }

        // 0b. Inline "more ↗ / less ↖" expansion toggle (delegated)
        const moreBtn = e.target.closest('.ac-advice-more-btn');
        if (moreBtn) {
            e.stopPropagation();
            const parent = moreBtn.parentElement;
            if (parent) {
                const snippet = parent.querySelector('.ac-advice-snippet');
                const full = parent.querySelector('.ac-advice-full');
                if (snippet && full) {
                    const isExpanded = full.style.display !== 'none';
                    if (isExpanded) {
                        full.style.display = 'none';
                        snippet.style.display = '';
                        moreBtn.textContent = 'more ↗';
                        moreBtn.title = 'Click to expand';
                    } else {
                        full.style.display = 'inline';
                        snippet.style.display = 'none';
                        moreBtn.textContent = 'less ↖';
                        moreBtn.title = 'Click to collapse';
                    }
                }
            }
            return;
        }

        // 1. Edit Button
        const editBtn = e.target.closest('.btn-edit');
        if (editBtn) {
            e.stopPropagation();
            const id = editBtn.dataset.id;
            const item = allEquipment.find(i => i.id === id);
            if (item) openEquipmentForm(item);
            return;
        }

        // 2. Delete Button
        const delBtn = e.target.closest('.btn-del');
        if (delBtn) {
            e.stopPropagation();
            const id = delBtn.dataset.id;
            const item = allEquipment.find(i => i.id === id);
            if (item) confirmAndDeleteEquipment(item);
            return;
        }

        // 3. Row Click -> Detail Modal (skip group headers and buttons/links)
        const row = e.target.closest('tr[data-id]');
        if (row && !e.target.closest('button') && !e.target.closest('a')) {
            const id = row.dataset.id;
            const item = allEquipment.find(i => i.id === id);
            if (item) showEquipmentDetail(item);
        }
    };

    tableContainer.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            const groupHeader = e.target.closest('tr.ac-table-group-header');
            if (groupHeader && !e.target.closest('a, button')) {
                e.preventDefault();
                const categoryName = groupHeader.dataset.category;
                if (categoryName) {
                    toggleCategory(categoryName);
                }
            }
        }
    };
}

/**
 * Toggles a category between expanded and collapsed.
 * 
 * @param {string} categoryName
 */
export function toggleCategory(categoryName) {
    if (collapsedCategories.has(categoryName)) {
        collapsedCategories.delete(categoryName);
    } else {
        collapsedCategories.add(categoryName);
    }
    const isCollapsed = collapsedCategories.has(categoryName);

    const headers = document.querySelectorAll('tr.ac-table-group-header');
    headers.forEach(h => {
        if (h.dataset.category === categoryName) {
            h.classList.toggle('collapsed', isCollapsed);
            h.setAttribute('aria-expanded', !isCollapsed);
            const chevron = h.querySelector('.accordion-chevron');
            if (chevron) chevron.textContent = isCollapsed ? '▶' : '▼';
            const hint = h.querySelector('.ac-group-hover-hint');
            if (hint) hint.textContent = isCollapsed ? 'Expand ▼' : 'Collapse ▲';
        }
    });

    const rows = document.querySelectorAll('tr.ac-equipment-row');
    rows.forEach(r => {
        if (r.dataset.category === categoryName) {
            r.classList.toggle('ac-group-collapsed', isCollapsed);
            r.style.display = isCollapsed ? 'none' : '';
        }
    });

    updateToggleAllBtn();
}

/**
 * Updates the global Expand All / Collapse All button text state.
 */
function updateToggleAllBtn() {
    const toggleBtn = document.getElementById('ac-equipment-toggle-all-btn');
    if (!toggleBtn) return;
    const groups = groupEquipmentByCategory(filteredEquipment);
    if (groups.length === 0) return;
    const allCollapsed = groups.every(g => collapsedCategories.has(g.name));
    toggleBtn.textContent = allCollapsed ? 'Expand All ▼' : 'Collapse All ▲';
}

/**
 * Displays full item metadata inside the standard detail modal.
 * 
 * @param {Object} item - Equipment record
 */
export function showEquipmentDetail(item) {
    const isAdmin = getAdminMode();
    const typeName = item.equip_type?.name || item.category?.name || 'Equipment';
    const typeNotes = item.equip_type?.notes || item.category?.notes || '';

    const html = `
        <div class="detail-header">
            <div>
                <span class="detail-category">${esc(typeName)}</span>
                <span class="detail-code" style="margin-left: 0.5rem; font-size: 0.85rem; color: var(--color-secondary);">
                    <code>${esc(item.check_id || '—')}</code>
                </span>
                <h2 class="detail-title" style="margin-top: 0.25rem;">${esc(item.name)}</h2>
            </div>
            ${isAdmin ? `
                <div class="detail-actions">
                    <button id="modal-btn-edit-equipment" class="ac-btn-admin ac-btn-primary">✏️ Edit</button>
                    <button id="modal-btn-delete-equipment" class="ac-btn-admin ac-btn-delete">🗑️ Delete</button>
                </div>
            ` : ''}
        </div>

        <div class="detail-grid">
            <div class="detail-item">
                <label>Ruleset Edition</label>
                <value><span class="ruleset-pill">${esc(item.ruleset)}</span></value>
            </div>
            <div class="detail-item">
                <label>Category</label>
                <value>${esc(typeName)}</value>
            </div>
            <div class="detail-item">
                <label>Sources</label>
                <value>${renderSourceBadges(item.source)}</value>
            </div>
            <div class="detail-item">
                <label>Cost</label>
                <value>${esc(item.cost_gp || '—')}</value>
            </div>
            <div class="detail-item">
                <label>Weight</label>
                <value>${esc(item.weight_lbs || '—')}</value>
            </div>
            <div class="detail-item">
                <label>Display Order</label>
                <value>${esc(formatDisplayOrder(item.display_order))}</value>
            </div>
        </div>

        ${(item.craft_cost_gp || item.craft_cost_dtp || item.craft_reqs) ? `
            <div class="detail-section">
                <label>Crafting Specifications</label>
                <div class="detail-grid" style="margin-top: 0.4rem;">
                    <div class="detail-item">
                        <label>Crafting Cost (GP / DTP)</label>
                        <value>${esc(item.craft_cost_gp || '—')} GP / ${esc(item.craft_cost_dtp || '—')} DTP</value>
                    </div>
                    <div class="detail-item" style="grid-column: span 2;">
                        <label>Requirements / Tools</label>
                        <value>${esc(item.craft_reqs || '—')}</value>
                    </div>
                </div>
            </div>
        ` : ''}

        ${item.description ? `
            <div class="detail-section">
                <label>Description</label>
                <div class="detail-text" style="white-space: pre-wrap; line-height: 1.6;">
                    ${renderMarkdownLinks(item.description)}
                </div>
            </div>
        ` : ''}

        ${item.notes_advice ? `
            <div class="detail-section">
                <label>Notes & Advice</label>
                <div class="detail-text" style="white-space: pre-wrap; line-height: 1.6;">
                    ${renderMarkdownLinks(item.notes_advice)}
                </div>
            </div>
        ` : ''}

        ${typeNotes ? `
            <div class="detail-section" style="border-top: 1px dashed var(--color-border); padding-top: 0.75rem;">
                <label>${esc(typeName)} Category Guidelines</label>
                <div class="detail-text" style="font-size: 0.9rem; color: var(--color-text-secondary); white-space: pre-wrap;">
                    ${renderMarkdownLinks(typeNotes)}
                </div>
            </div>
        ` : ''}
    `;

    openModal(html);

    if (isAdmin) {
        document.getElementById('modal-btn-edit-equipment')?.addEventListener('click', () => {
            closeModal();
            openEquipmentForm(item);
        });
        document.getElementById('modal-btn-delete-equipment')?.addEventListener('click', () => {
            confirmAndDeleteEquipment(item);
        });
    }
}

/**
 * Calculates next sequential Check ID for equipment (e.g. EQP_0496).
 * 
 * @returns {string} Next check ID
 */
function getNextEquipmentCheckId() {
    let maxNum = 0;
    allEquipment.forEach(item => {
        if (item.check_id && item.check_id.startsWith('EQP_')) {
            const num = parseInt(item.check_id.replace('EQP_', ''), 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        }
    });
    return `EQP_${String(maxNum + 1).padStart(4, '0')}`;
}

/**
 * Opens staff administrative Add/Edit modal form.
 * 
 * @param {Object|null} [item=null]
 */
export async function openEquipmentForm(item = null) {
    const isEdit = !!item;
    const defaultCheckId = isEdit ? item.check_id : getNextEquipmentCheckId();
    const defaultOrder = isEdit ? item.display_order : getNextDisplayOrder(allEquipment, 1);
    
    let selectedSources = [];
    if (item?.source) {
        selectedSources = Array.isArray(item.source) 
            ? [...item.source] 
            : extractSourceKeys(item.source);
    } else {
        selectedSources = ['PHB2024'];
    }

    const currentTypeId = item?.equip_type_id || item?.category_id || (allEquipTypes[0]?.id || '');

    const html = `
        <div class="detail-header">
            <h2>${isEdit ? `Edit Equipment: ${esc(item.name)}` : 'Add New Equipment Item'}</h2>
        </div>
        <form id="ac-equipment-form" class="ac-edit-form">
            <div class="ac-form-grid">
                <div class="ac-form-group">
                    <label for="form-equip-name">Item Name *</label>
                    <input type="text" id="form-equip-name" required value="${esc(item?.name || '')}" class="ac-form-input">
                </div>
                <div class="ac-form-group">
                    <label for="form-equip-check-id">Check ID *</label>
                    <input type="text" id="form-equip-check-id" required value="${esc(defaultCheckId)}" class="ac-form-input">
                </div>
            </div>

            <div class="ac-form-grid">
                <div class="ac-form-group">
                    <label for="form-equip-type">Category / Type *</label>
                    <select id="form-equip-type" class="ac-form-select" required>
                        ${allEquipTypes.map(t => `
                            <option value="${esc(t.id)}" ${t.id === currentTypeId ? 'selected' : ''}>${esc(t.name)}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="ac-form-group">
                    <label for="form-equip-ruleset">Ruleset Edition *</label>
                    <select id="form-equip-ruleset" class="ac-form-select" required>
                        <option value="2024" ${item?.ruleset === '2024' || !isEdit ? 'selected' : ''}>2024</option>
                        <option value="2014" ${item?.ruleset === '2014' ? 'selected' : ''}>2014</option>
                    </select>
                </div>
            </div>

            <div class="ac-form-group">
                <label>Sources *</label>
                <div id="form-equip-source-picker"></div>
            </div>

            <div class="ac-form-grid">
                <div class="ac-form-group">
                    <label for="form-equip-cost">Cost (GP)</label>
                    <input type="text" id="form-equip-cost" value="${esc(item?.cost_gp || '')}" placeholder="e.g. 50 or 0.1" class="ac-form-input">
                </div>
                <div class="ac-form-group">
                    <label for="form-equip-weight">Weight (lbs)</label>
                    <input type="text" id="form-equip-weight" value="${esc(item?.weight_lbs || '')}" placeholder="e.g. 10" class="ac-form-input">
                </div>
            </div>

            <div class="ac-form-grid">
                <div class="ac-form-group">
                    <label for="form-equip-craft-gp">Craft Cost (GP)</label>
                    <input type="text" id="form-equip-craft-gp" value="${esc(item?.craft_cost_gp || '')}" placeholder="e.g. 25" class="ac-form-input">
                </div>
                <div class="ac-form-group">
                    <label for="form-equip-craft-dtp">Craft Cost (DTP)</label>
                    <input type="text" id="form-equip-craft-dtp" value="${esc(item?.craft_cost_dtp || '')}" placeholder="e.g. 2" class="ac-form-input">
                </div>
            </div>

            <div class="ac-form-group">
                <label for="form-equip-craft-reqs">Crafting Requirements / Tools</label>
                <input type="text" id="form-equip-craft-reqs" value="${esc(item?.craft_reqs || '')}" placeholder="e.g. Smith's Tools" class="ac-form-input">
            </div>

            <div class="ac-form-group">
                <label for="form-equip-order">Display Order (Fractional Indexing)</label>
                <input type="number" step="any" id="form-equip-order" value="${defaultOrder}" class="ac-form-input">
            </div>

            <div class="ac-form-group">
                <label for="form-equip-description">Description</label>
                <textarea id="form-equip-description" rows="3" class="ac-form-textarea" placeholder="Item description, armor class, weapon properties...">${esc(item?.description || '')}</textarea>
            </div>

            <div class="ac-form-group">
                <label for="form-equip-notes">Notes / Advice</label>
                <textarea id="form-equip-notes" rows="3" class="ac-form-textarea" placeholder="Staff rulings, markdown links [Guide](/Guides/...)...">${esc(item?.notes_advice || '')}</textarea>
            </div>

            <div class="ac-form-actions">
                <button type="button" class="ac-btn-admin ac-btn-secondary" id="form-equip-cancel">Cancel</button>
                <button type="submit" class="ac-btn-admin ac-btn-primary" id="form-equip-submit">Save Equipment</button>
            </div>
        </form>
    `;

    openModal(html);

    // Initialize multi-source tag picker
    const pickerContainer = document.getElementById('form-equip-source-picker');
    renderSourceTagPicker({
        containerEl: pickerContainer,
        selectedKeys: selectedSources,
        availableKeys: availableSourceKeys,
        onChange: (updatedKeys) => {
            selectedSources = updatedKeys;
        }
    });

    document.getElementById('form-equip-cancel').onclick = closeModal;

    const form = document.getElementById('ac-equipment-form');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('form-equip-submit');
        submitBtn.disabled = true;

        if (selectedSources.length === 0) {
            alert('Please select at least one sourcebook.');
            submitBtn.disabled = false;
            return;
        }

        const typeId = document.getElementById('form-equip-type').value;

        const payload = {
            name: document.getElementById('form-equip-name').value.trim(),
            check_id: document.getElementById('form-equip-check-id').value.trim(),
            equip_type_id: typeId,
            category_id: typeId,
            ruleset: document.getElementById('form-equip-ruleset').value,
            source: selectedSources,
            cost_gp: document.getElementById('form-equip-cost').value.trim() || null,
            weight_lbs: document.getElementById('form-equip-weight').value.trim() || null,
            craft_cost_gp: document.getElementById('form-equip-craft-gp').value.trim() || null,
            craft_cost_dtp: document.getElementById('form-equip-craft-dtp').value.trim() || null,
            craft_reqs: document.getElementById('form-equip-craft-reqs').value.trim() || null,
            description: document.getElementById('form-equip-description').value.trim() || null,
            notes_advice: document.getElementById('form-equip-notes').value.trim() || null,
            display_order: cleanFloat(parseFloat(document.getElementById('form-equip-order').value) || defaultOrder)
        };

        try {
            if (isEdit) {
                const { error } = await updateEquipment(item.id, payload);
                if (error) throw error;
                showToast('Equipment updated successfully!');
            } else {
                const { error } = await createEquipment(payload);
                if (error) throw error;
                showToast('Equipment created successfully!');
            }

            closeModal();
            await initEquipment(true);
            window.dispatchEvent(new CustomEvent('ac:equipment-updated'));
        } catch (err) {
            console.error('Error saving equipment:', err);
            alert(`Save failed: ${err.message || err}`);
            submitBtn.disabled = false;
        }
    };
}

/**
 * Confirms and executes equipment deletion.
 * 
 * @param {Object} item
 */
export async function confirmAndDeleteEquipment(item) {
    if (!item) return;
    const confirmed = window.confirm(`Are you sure you want to delete "${item.name}" (${item.check_id})?`);
    if (!confirmed) return;

    try {
        const { success, error } = await deleteEquipment(item.id);
        if (!success) throw error || new Error('Delete failed');

        closeModal();
        showToast('Equipment deleted successfully!');
        await initEquipment(true);
        window.dispatchEvent(new CustomEvent('ac:equipment-updated'));
    } catch (err) {
        console.error('Error deleting equipment:', err);
        alert(`Delete failed: ${err.message || err}`);
    }
}

// Invalidate in-memory cache when equipment mutation event is broadcast
if (typeof window !== 'undefined') {
    window.addEventListener('ac:equipment-updated', () => {
        allEquipment = [];
    });
}
