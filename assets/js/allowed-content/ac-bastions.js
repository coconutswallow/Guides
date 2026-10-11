/**
 * ================================================================
 * AC BASTIONS MODULE
 * ================================================================
 * 
 * Presentation, filtering, and administration controller for
 * Allowed Content Bastions, Facilities, and General Rules.
 * 
 * Responsibilities:
 * - Rendering normalized Bastion facilities grouped by category accordion subheaders.
 * - Displaying inline category rules and rich General Bastion Guidelines.
 * - Multi-criteria toolbar: Category filter, Source filter, Toggle All Accordion, and live search.
 * - Interactive detail modal on row click with markdown link and source badge rendering.
 * - Staff administration workflows (Add, Edit, Delete) with multi-source tag picker and fractional order indexing.
 * 
 * @module ACBastions
 */

import { 
    getBastions, 
    getBastionTypes, 
    createBastion, 
    updateBastion, 
    deleteBastion,
    insertBastionType,
    updateBastionType,
    deleteBastionType,
    getSourcesCached
} from './ac-service.js';
import { openGenericOptionsModal } from './ac-options-manager.js';
import { 
    getNextDisplayOrder, 
    getStartDisplayOrder,
    getOrderForPosition,
    cleanFloat, 
    sortByDisplayOrder, 
    formatDisplayOrder 
} from './ac-order-utils.js';
import { 
    setAdminMode, 
    getAdminMode 
} from './ac-auth.js';
import { 
    openModal, 
    closeModal, 
    esc, 
    renderMarkdownLinks, 
    renderSourceBadges,
    renderSourceTagPicker,
    formatExpandableText,
    attachExpandableTextListeners,
    showToast 
} from './ac-ui-utils.js';

export {
    setAdminMode,
    getAdminMode
};

// Module State
let allBastions = [];
let filteredBastions = [];
let allBastionTypes = [];
let availableSourceKeys = [];
let collapsedCategories = new Set();

// Active toolbar filters
let selectedTypeFilter = 'ALL';       // 'ALL' | specific category name
let selectedSourceFilter = 'ALL';     // 'ALL' | specific source key
let currentSearchTerm = '';

/**
 * Initializes the Bastions view.
 * 
 * @param {boolean} [forceRefresh=false]
 */
export async function initBastions(forceRefresh = false) {
    const container = document.getElementById('ac-view-bastions');
    if (!container) return;

    if (forceRefresh) {
        selectedTypeFilter = 'ALL';
        selectedSourceFilter = 'ALL';
        currentSearchTerm = '';
        collapsedCategories.clear();
        allBastions = [];
    } else if (allBastions.length > 0) {
        applyFilters();
        updateTableOnly();
        return;
    }

    container.innerHTML = `
        <div class="ac-loading">
            <div class="spinner"></div>
            <span>Cataloging Bastions & Facilities...</span>
        </div>
    `;

    try {
        const [bastionsData, typesData, sourcesData] = await Promise.all([
            getBastions(),
            getBastionTypes(),
            getSourcesCached().catch(() => [])
        ]);

        allBastions = sortByDisplayOrder(bastionsData || []);
        allBastionTypes = sortByDisplayOrder(typesData || []);

        // Build list of unique source keys found in Bastion records
        const foundSources = new Set();
        allBastions.forEach(item => {
            if (Array.isArray(item.source)) {
                item.source.forEach(s => s && foundSources.add(s));
            } else if (typeof item.source === 'string' && item.source) {
                foundSources.add(item.source);
            }
        });
        availableSourceKeys = Array.from(foundSources).sort();

        applyFilters();
        renderShell();
    } catch (error) {
        console.error('Failed to initialize Bastions module:', error);
        container.innerHTML = `
            <div class="ac-error-state">
                <p>Failed to load Bastion facilities. Please refresh or try again later.</p>
                <button class="ac-btn ac-btn-primary" onclick="window.location.reload()">Reload</button>
            </div>
        `;
    }
}

/**
 * Applies search, category, and source filters to the allBastions dataset.
 */
function applyFilters() {
    filteredBastions = allBastions.filter(item => {
        // 1. Category / Type Filter
        if (selectedTypeFilter !== 'ALL') {
            const catName = item.bastion_type?.name || item.category?.name;
            if (catName !== selectedTypeFilter) return false;
        }

        // 2. Source Filter
        if (selectedSourceFilter !== 'ALL') {
            const itemSources = Array.isArray(item.source) 
                ? item.source 
                : [item.source].filter(Boolean);
            if (!itemSources.includes(selectedSourceFilter)) return false;
        }

        // 3. Text Search Filter (Short-circuit chaining)
        if (currentSearchTerm) {
            const term = currentSearchTerm.toLowerCase();
            const nameMatch = (item.name || '').toLowerCase().includes(term);
            const checkIdMatch = (item.check_id || '').toLowerCase().includes(term);
            const catName = (item.bastion_type?.name || item.category?.name || '').toLowerCase();
            const catMatch = catName.includes(term);
            const sizeMatch = (item.size || '').toLowerCase().includes(term);
            const prereqMatch = (item.prerequisite || '').toLowerCase().includes(term);
            const goldMatch = (item.gp_cost || '').toLowerCase().includes(term);
            const dtpMatch = String(item.dtp_cost || '').toLowerCase().includes(term);
            const orderMatch = (item.bastion_order || '').toLowerCase().includes(term);
            const descMatch = (item.description || '').toLowerCase().includes(term);
            const notesMatch = (item.notes_advice || '').toLowerCase().includes(term);
            const sourceMatch = Array.isArray(item.source)
                ? item.source.some(s => (s || '').toLowerCase().includes(term))
                : (item.source || '').toLowerCase().includes(term);

            if (!nameMatch && !checkIdMatch && !catMatch && !sizeMatch && !prereqMatch && 
                !goldMatch && !dtpMatch && !orderMatch && !descMatch && !notesMatch && !sourceMatch) {
                return false;
            }
        }

        return true;
    });
}

/**
 * External search filter interface called by ACMain controller.
 * 
 * @param {string} term - Search query string
 */
export function filterBastions(term) {
    currentSearchTerm = (term || '').trim();
    applyFilters();
    updateTableOnly();
}

/**
 * Renders the top-level toolbar, filters, and table container.
 */
function renderShell() {
    const container = document.getElementById('ac-view-bastions');
    if (!container) return;

    const isAdmin = getAdminMode();

    container.innerHTML = `
        <div class="ac-toolbar-layout">
            <!-- Filter Controls Bar -->
            <div class="ac-bastions-toolbar ac-classes-toolbar">
                <div class="ac-toolbar-left">
                    <!-- Category / Type Dropdown -->
                    <select id="ac-bastions-type-filter" class="ac-filter-select" title="Filter by Category" aria-label="Filter by Category">
                        <option value="ALL">All Categories (${allBastionTypes.length})</option>
                        ${allBastionTypes.map(t => {
                            const count = allBastions.filter(i => {
                                const cId = i.bastion_type_id || i.category_id;
                                const cName = i.bastion_type?.name || i.category?.name;
                                return cId === t.id || cName === t.name;
                            }).length;
                            const countLabel = t.name === 'General Rules' ? 'Rules' : `${count}`;
                            return `<option value="${esc(t.name)}" ${selectedTypeFilter === t.name ? 'selected' : ''}>${esc(t.name)} (${countLabel})</option>`;
                        }).join('')}
                    </select>

                    <!-- Sourcebook Dropdown -->
                    <select id="ac-bastions-source-filter" class="ac-filter-select" title="Filter by Sourcebook" aria-label="Filter by Sourcebook">
                        <option value="ALL">All Sources (${availableSourceKeys.length})</option>
                        ${availableSourceKeys.map(k => `
                            <option value="${esc(k)}" ${selectedSourceFilter === k ? 'selected' : ''}>${esc(k)}</option>
                        `).join('')}
                    </select>

                    <!-- Toggle All Button -->
                    <button type="button" id="ac-bastions-toggle-all-btn" class="ac-btn-toggle-all" title="Toggle expanding or collapsing all categories">
                        Collapse All ▲
                    </button>
                </div>

                <div class="ac-toolbar-right">
                    <span class="ac-items-count" id="bastions-stats">
                        Showing <strong>${filteredBastions.length}</strong> ${filteredBastions.length === 1 ? 'Facility' : 'Facilities'}
                    </span>
                </div>
            </div>

            <!-- Main Content Area: Table Wrapper -->
            <div id="bastions-table-container">
                ${renderTable(isAdmin)}
            </div>
        </div>
    `;

    setupControls();
    setupTableInteractions();
}

/**
 * Groups filtered bastion facilities by category according to allBastionTypes ordering.
 * Also preserves the General Rules section if active.
 * 
 * @param {Array} items - Filtered bastions array
 * @returns {Array<Object>} Group objects with name, notes, and items array
 */
function groupBastionsByCategory(items) {
    const groups = [];
    const handledIds = new Set();

    // 1. Group by known allBastionTypes (preserves canonical display_order 1.0 to 4.0)
    allBastionTypes.forEach(catType => {
        const matchingItems = items.filter(item => {
            const typeId = item.bastion_type_id || item.category_id;
            const typeName = item.bastion_type?.name || item.category?.name;
            return typeId === catType.id || typeName === catType.name;
        });

        // Include group if items exist, OR if it's General Rules and category filter includes it
        if (matchingItems.length > 0) {
            matchingItems.forEach(i => handledIds.add(i.id));
            groups.push({
                type: catType,
                name: catType.name,
                notes: catType.notes || null,
                items: matchingItems
            });
        } else if (catType.name === 'General Rules' && (selectedTypeFilter === 'ALL' || selectedTypeFilter === 'General Rules') && !currentSearchTerm && selectedSourceFilter === 'ALL') {
            groups.push({
                type: catType,
                name: catType.name,
                notes: catType.notes || null,
                items: []
            });
        }
    });

    // 2. Unhandled / unmapped items fallback
    const unhandled = items.filter(i => !handledIds.has(i.id));
    if (unhandled.length > 0) {
        const remainingMap = new Map();
        unhandled.forEach(i => {
            const name = i.bastion_type?.name || i.category?.name || 'Other Facilities';
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
    const tableContainer = document.getElementById('bastions-table-container');
    const statsContainer = document.getElementById('bastions-stats');
    const isAdmin = getAdminMode();

    if (statsContainer) {
        statsContainer.innerHTML = `Showing <strong>${filteredBastions.length}</strong> ${filteredBastions.length === 1 ? 'Facility' : 'Facilities'}`;
    }

    if (tableContainer) {
        tableContainer.innerHTML = renderTable(isAdmin);
        attachExpandableTextListeners(tableContainer);
    }

    updateToggleAllBtn();
}

/**
 * Generates the HTML table for bastions grouped by category subheadings.
 * 
 * @param {boolean} isAdmin
 * @returns {string} Table HTML
 */
function renderTable(isAdmin) {
    const totalCols = isAdmin ? 9 : 8;
    const groups = groupBastionsByCategory(filteredBastions);

    if (groups.length === 0) {
        return `
            <div class="ac-table-wrapper">
                <table class="ac-table" id="bastions-table">
                    <thead>
                        <tr>
                            <th class="col-name" style="min-width: 200px;">Facility</th>
                            <th class="col-size hide-mobile" style="width: 140px;">Size</th>
                            <th class="col-prereq hide-mobile" style="min-width: 150px;">Prerequisites</th>
                            <th class="col-gold" style="width: 120px;">Gold Cost</th>
                            <th class="col-dtp" style="width: 100px;">DTP Cost</th>
                            <th class="col-order hide-mobile" style="width: 110px;">Order</th>
                            <th class="col-source" style="width: 100px; text-align: center;">Source</th>
                            <th class="col-notes hide-tablet" style="min-width: 240px;">Notes / Advice</th>
                            ${isAdmin ? '<th class="col-actions" style="width: 85px; text-align: center;">Actions</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="${totalCols}" style="text-align: center; padding: 3rem;">
                                No Bastion facilities found matching your criteria.
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    return `
        <div class="ac-table-wrapper">
            <table class="ac-table" id="bastions-table">
                <thead>
                    <tr>
                        <th class="col-name" style="min-width: 200px;">Facility</th>
                        <th class="col-size hide-mobile" style="width: 140px;">Size</th>
                        <th class="col-prereq hide-mobile" style="min-width: 150px;">Prerequisites</th>
                        <th class="col-gold" style="width: 120px;">Gold Cost</th>
                        <th class="col-dtp" style="width: 100px;">DTP Cost</th>
                        <th class="col-order hide-mobile" style="width: 110px;">Order</th>
                        <th class="col-source" style="width: 100px; text-align: center;">Source</th>
                        <th class="col-notes hide-tablet" style="min-width: 240px;">Notes / Advice</th>
                        ${isAdmin ? '<th class="col-actions" style="width: 85px; text-align: center;">Actions</th>' : ''}
                    </tr>
                </thead>
                <tbody>
                    ${groups.map(group => {
                        const isCollapsed = collapsedCategories.has(group.name);
                        const isRulesGroup = group.name === 'General Rules';

                        const countBadge = isRulesGroup 
                            ? 'Bastion Guidelines' 
                            : `${group.items.length} ${group.items.length === 1 ? 'Facility' : 'Facilities'}`;

                        const subheadingHtml = `
                            <tr class="ac-table-group-header ${isCollapsed ? 'collapsed' : ''}" data-category="${esc(group.name)}" role="button" aria-expanded="${!isCollapsed}" tabindex="0">
                                <td colspan="${totalCols}">
                                    <div class="ac-table-group-main">
                                        <span class="accordion-chevron">${isCollapsed ? '▶' : '▼'}</span>
                                        <span class="ac-table-group-title">${esc(group.name)}</span>
                                        <span class="ac-counter-pill">${countBadge}</span>${group.notes && !isRulesGroup ? `
                                        <span class="ac-table-group-divider">—</span>
                                        <span class="ac-table-group-notes">${renderMarkdownLinks(group.notes.trim())}</span>` : ''}
                                        <span class="ac-group-hover-hint">${isCollapsed ? 'Expand ▼' : 'Collapse ▲'}</span>
                                    </div>
                                </td>
                            </tr>
                        `;

                        // Special rendering for General Rules rich guideline content
                        if (isRulesGroup) {
                            const rulesRowHtml = `
                                <tr data-category="${esc(group.name)}" class="ac-bastion-row ac-bastion-rules-row ${isCollapsed ? 'ac-group-collapsed' : ''}" style="${isCollapsed ? 'display: none;' : ''}">
                                    <td colspan="${totalCols}" style="padding: 1.25rem 1.5rem;">
                                        <div class="ac-bastion-rules-content">
                                            ${renderMarkdownLinks(group.notes ? group.notes.trim() : 'No general rules specified.')}
                                        </div>
                                    </td>
                                </tr>
                            `;
                            return subheadingHtml + rulesRowHtml;
                        }

                        // Rendering for standard facility items
                        const itemsHtml = group.items.map(item => {
                            const goldDisplay = esc(item.gp_cost ? item.gp_cost + (item.gp_cost.toLowerCase().includes('gp') ? '' : ' GP') : '—');
                            const dtpDisplay = esc(item.dtp_cost ? item.dtp_cost + (item.dtp_cost.toLowerCase().includes('dtp') ? '' : ' DTP') : '—');
                            const sizeDisplay = esc(item.size || '—');
                            const prereqDisplay = esc(item.prerequisite || '—');
                            const orderDisplay = esc(item.bastion_order || '—');

                            return `
                                <tr data-id="${item.id}" data-category="${esc(group.name)}" class="ac-bastion-row ${isCollapsed ? 'ac-group-collapsed' : ''}" style="${isCollapsed ? 'display: none;' : ''}">
                                    <td class="col-name">
                                        <div class="name-cell">
                                            <strong>${esc(item.name)}</strong>
                                            <span class="row-hover-icon">Details →</span>
                                        </div>
                                    </td>
                                    <td class="col-size hide-mobile">${sizeDisplay}</td>
                                    <td class="col-prereq hide-mobile">${prereqDisplay}</td>
                                    <td class="col-gold">${goldDisplay}</td>
                                    <td class="col-dtp">${dtpDisplay}</td>
                                    <td class="col-order hide-mobile">${orderDisplay}</td>
                                    <td class="col-source" style="text-align: center;">${renderSourceBadges(item.source)}</td>
                                    <td class="col-notes hide-tablet">
                                        ${formatExpandableText(item.notes_advice || item.description || '—', 140)}
                                    </td>
                                    ${isAdmin ? `
                                        <td class="col-actions" style="text-align: center;">
                                            <div class="ac-cell-actions" style="justify-content: center;">
                                                <button type="button" class="ac-btn-icon btn-edit-bastion" data-id="${item.id}" title="Edit Facility">✏️</button>
                                                <button type="button" class="ac-btn-icon delete btn-delete-bastion" data-id="${item.id}" title="Delete Facility">🗑️</button>
                                            </div>
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
 * Updates the text and icon of the Toggle All button based on current state.
 */
function updateToggleAllBtn() {
    const btn = document.getElementById('ac-bastions-toggle-all-btn');
    if (!btn) return;

    const visibleGroups = groupBastionsByCategory(filteredBastions);
    if (visibleGroups.length === 0) {
        btn.style.display = 'none';
        return;
    }
    btn.style.display = '';

    const allAreCollapsed = visibleGroups.length > 0 && visibleGroups.every(g => collapsedCategories.has(g.name));
    if (allAreCollapsed) {
        btn.textContent = 'Expand All ▼';
        btn.title = 'Expand all categories';
    } else {
        btn.textContent = 'Collapse All ▲';
        btn.title = 'Collapse all categories';
    }
}

/**
 * Sets up event listeners for toolbar controls (dropdowns, toggle all, add button).
 */
function setupControls() {
    const container = document.getElementById('ac-view-bastions');
    if (!container) return;

    // 1. Category Filter
    const catSelect = container.querySelector('#ac-bastions-type-filter');
    if (catSelect) {
        catSelect.addEventListener('change', (e) => {
            selectedTypeFilter = e.target.value;
            applyFilters();
            updateTableOnly();
        });
    }

    // 2. Sourcebook Filter
    const sourceSelect = container.querySelector('#ac-bastions-source-filter');
    if (sourceSelect) {
        sourceSelect.addEventListener('change', (e) => {
            selectedSourceFilter = e.target.value;
            applyFilters();
            updateTableOnly();
        });
    }

    // 3. Toggle All Button
    const toggleBtn = container.querySelector('#ac-bastions-toggle-all-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const visibleGroups = groupBastionsByCategory(filteredBastions);
            const allAreCollapsed = visibleGroups.length > 0 && visibleGroups.every(g => collapsedCategories.has(g.name));

            if (allAreCollapsed) {
                visibleGroups.forEach(g => collapsedCategories.delete(g.name));
            } else {
                visibleGroups.forEach(g => collapsedCategories.add(g.name));
            }

            updateTableOnly();
        });
    }

    // Attach expandable text listeners for table body
    attachExpandableTextListeners(container);
}

/**
 * Sets up event delegation on the table for row clicks, accordion subheaders, and admin buttons.
 */
function setupTableInteractions() {
    const container = document.getElementById('ac-view-bastions');
    if (!container) return;

    container.addEventListener('click', (e) => {
        // 1. Category Subheading Click -> Accordion Toggle
        const groupHeader = e.target.closest('tr.ac-table-group-header');
        if (groupHeader) {
            // Ignore click if clicking directly on a link inside the subheader notes
            if (e.target.tagName === 'A') return;

            const categoryName = groupHeader.dataset.category;
            if (!categoryName) return;

            if (collapsedCategories.has(categoryName)) {
                collapsedCategories.delete(categoryName);
            } else {
                collapsedCategories.add(categoryName);
            }

            const isCollapsed = collapsedCategories.has(categoryName);
            groupHeader.classList.toggle('collapsed', isCollapsed);
            groupHeader.setAttribute('aria-expanded', !isCollapsed);

            const chevron = groupHeader.querySelector('.accordion-chevron');
            if (chevron) chevron.textContent = isCollapsed ? '▶' : '▼';

            const hoverHint = groupHeader.querySelector('.ac-group-hover-hint');
            if (hoverHint) hoverHint.textContent = isCollapsed ? 'Expand ▼' : 'Collapse ▲';

            // Toggle visibility of matching sibling item rows
            const table = groupHeader.closest('table');
            if (table) {
                const rows = table.querySelectorAll(`tr.ac-bastion-row[data-category="${categoryName}"]`);
                rows.forEach(r => {
                    r.classList.toggle('ac-group-collapsed', isCollapsed);
                    r.style.display = isCollapsed ? 'none' : '';
                });
            }

            updateToggleAllBtn();
            return;
        }

        // 2. Admin Edit Button Click
        const editBtn = e.target.closest('.btn-edit-bastion');
        if (editBtn) {
            e.stopPropagation();
            const id = editBtn.dataset.id;
            const item = allBastions.find(i => i.id === id);
            if (item) openBastionForm(item);
            return;
        }

        // 3. Admin Delete Button Click
        const deleteBtn = e.target.closest('.btn-delete-bastion');
        if (deleteBtn) {
            e.stopPropagation();
            const id = deleteBtn.dataset.id;
            confirmAndDeleteBastion(id);
            return;
        }

        // 4. Detail Modal Click (Row Click)
        const row = e.target.closest('tr.ac-bastion-row');
        if (row) {
            // Ignore clicks on expandable buttons or links or rule content rows
            if (e.target.closest('.ac-expand-btn') || e.target.tagName === 'A' || row.classList.contains('ac-bastion-rules-row')) return;

            const id = row.dataset.id;
            const item = allBastions.find(i => i.id === id);
            if (item) showBastionDetail(item);
        }
    });

    // Keyboard navigation (Enter / Space) for category subheaders
    container.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            const groupHeader = e.target.closest('tr.ac-table-group-header');
            if (groupHeader) {
                e.preventDefault();
                groupHeader.click();
            }
        }
    });
}

/**
 * Shows the full detail modal for a Bastion facility.
 * 
 * @param {Object} item - Bastion facility object
 */
export function showBastionDetail(item) {
    const isAdmin = getAdminMode();
    const catName = item.bastion_type?.name || item.category?.name || 'Uncategorized';
    const catNotes = item.bastion_type?.notes || item.category?.notes || null;

    const goldVal = item.gp_cost ? item.gp_cost + (item.gp_cost.toLowerCase().includes('gp') ? '' : ' GP') : '—';
    const dtpVal = item.dtp_cost ? item.dtp_cost + (item.dtp_cost.toLowerCase().includes('dtp') ? '' : ' DTP') : '—';
    const sizeVal = item.size || '—';
    const prereqVal = item.prerequisite || '—';
    const orderVal = item.bastion_order || '—';
    const displayOrderVal = formatDisplayOrder(item.display_order);

    const html = `
        <div class="ac-detail-modal-wrapper">
            <!-- Header -->
            <div class="detail-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
                <div>
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                        <span class="detail-category">${esc(catName)}</span>
                        ${renderSourceBadges(item.source)}
                    </div>
                    <h2 class="detail-title">${esc(item.name)}</h2>
                </div>
                ${isAdmin ? `
                    <div class="detail-actions">
                        <button type="button" class="ac-btn-admin ac-btn-primary" id="modal-btn-edit-bastion" title="Edit facility">
                            ✏️ Edit Facility
                        </button>
                        <button type="button" class="ac-btn-admin ac-btn-delete" id="modal-btn-delete-bastion" title="Delete facility">
                            🗑️ Delete Facility
                        </button>
                    </div>
                ` : ''}
            </div>

            <!-- Quick Metadata Grid -->
            <div class="detail-grid">
                <div class="detail-item">
                    <label>Size</label>
                    <value><strong>${esc(sizeVal)}</strong></value>
                </div>
                <div class="detail-item">
                    <label>Prerequisites</label>
                    <value>${esc(prereqVal)}</value>
                </div>
                <div class="detail-item">
                    <label>Gold Cost</label>
                    <value><strong>${esc(goldVal)}</strong></value>
                </div>
                <div class="detail-item">
                    <label>DTP Cost</label>
                    <value><strong>${esc(dtpVal)}</strong></value>
                </div>
                <div class="detail-item">
                    <label>Bastion Order</label>
                    <value><strong>${esc(orderVal)}</strong></value>
                </div>
            </div>

            <!-- Description -->
            ${item.description ? `
                <div class="detail-section">
                    <h4>Description</h4>
                    <div class="advice-content">${renderMarkdownLinks(item.description)}</div>
                </div>
            ` : ''}

            <!-- Notes & Advice -->
            ${item.notes_advice ? `
                <div class="detail-section">
                    <h4>Notes & Advice</h4>
                    <div class="advice-content" style="color: var(--color-secondary);">${renderMarkdownLinks(item.notes_advice)}</div>
                </div>
            ` : ''}

            <!-- Category Guidelines -->
            ${catNotes ? `
                <div class="category-notes-box">
                    <strong>Category Rules (${esc(catName)}):</strong>
                    <div style="margin-top: 0.5rem; line-height: 1.6;">${renderMarkdownLinks(catNotes)}</div>
                </div>
            ` : ''}
        </div>
    `;

    openModal(html);

    if (isAdmin) {
        const modalContainer = document.getElementById('ac-detail-modal');
        if (modalContainer) {
            const editBtn = modalContainer.querySelector('#modal-btn-edit-bastion');
            if (editBtn) {
                editBtn.addEventListener('click', () => {
                    closeModal();
                    openBastionForm(item);
                });
            }

            const deleteBtn = modalContainer.querySelector('#modal-btn-delete-bastion');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    closeModal();
                    confirmAndDeleteBastion(item.id);
                });
            }
        }
    }
}

/**
 * Calculates next audit check_id (e.g. BAS_0067).
 * 
 * @returns {string}
 */
function getNextBastionCheckId() {
    let maxNum = 0;
    allBastions.forEach(item => {
        if (item.check_id && item.check_id.startsWith('BAS_')) {
            const num = parseInt(item.check_id.replace('BAS_', ''), 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        }
    });
    const nextNum = maxNum + 1;
    return `BAS_${String(nextNum).padStart(4, '0')}`;
}

/**
 * Opens staff administrative modal form for creating or editing a bastion facility.
 * 
 * @param {Object} [item=null] - If provided, opens form in Edit mode; otherwise Add mode
 */
export async function openBastionForm(item = null) {
    const isEdit = !!item;
    
    // Default category: pick Basic Facilities if available, else first type
    const basicType = allBastionTypes.find(t => t.name === 'Basic Facilities');
    const defaultTypeId = isEdit 
        ? (item.bastion_type_id || item.category_id || '') 
        : (basicType?.id || allBastionTypes[0]?.id || '');
        
    const defaultOrder = isEdit 
        ? item.display_order 
        : getNextDisplayOrder(allBastions, 1.0);

    // Initial selected sources
    let selectedSources = [];
    if (isEdit) {
        selectedSources = Array.isArray(item.source) ? [...item.source] : [item.source].filter(Boolean);
    } else {
        selectedSources = ['DMG2024'];
    }

    // Fetch all known source keys for tag picker
    let allAvailableKeys = [];
    try {
        const fullSources = await getSourcesCached();
        allAvailableKeys = fullSources.map(s => s.source_key).filter(Boolean).sort();
    } catch {
        allAvailableKeys = availableSourceKeys.length > 0 ? [...availableSourceKeys] : ['DMG2024', 'HHB', 'FRHOF'];
    }
    if (!allAvailableKeys.includes('DMG2024')) allAvailableKeys.unshift('DMG2024');

    const sortedFacilities = sortByDisplayOrder(allBastions);

    const headerCategory = isEdit ? 'Edit Bastion Facility' : 'New Bastion Facility';
    const headerTitle = isEdit ? (item?.name ? `Edit Bastion Facility: ${esc(item.name)}` : 'Edit Bastion Facility') : 'Add New Bastion Facility';

    const html = `
        <div class="detail-header">
            <div>
                <span class="detail-category">${headerCategory}</span>
                <h2 class="detail-title">${headerTitle}</h2>
            </div>
        </div>

        <form id="bastion-editor-form" class="ac-edit-form">
            <div class="ac-form-grid" style="grid-template-columns: 1fr 1fr;">
                <div class="ac-form-group">
                    <label for="form-bas-category">Category *</label>
                    <select id="form-bas-category" class="ac-form-select" required>
                        ${allBastionTypes.filter(t => t.name !== 'General Rules').map(t => `
                            <option value="${t.id}" ${t.id === defaultTypeId ? 'selected' : ''}>
                                ${esc(t.name)}
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div class="ac-form-group">
                    <label for="form-bas-name">Facility Name *</label>
                    <input type="text" id="form-bas-name" class="ac-form-input" value="${esc(item?.name || '')}" placeholder="e.g. Arcane Study" required>
                </div>
            </div>

            <!-- Multi-Source Tag Picker -->
            <div class="ac-form-group">
                <label>Sourcebook(s) *</label>
                <div id="form-bas-source-picker" class="ac-source-picker-container"></div>
            </div>

            <div class="ac-form-grid" style="grid-template-columns: 1fr 1fr;">
                <div class="ac-form-group">
                    <label for="form-bas-size">Size</label>
                    <input type="text" id="form-bas-size" class="ac-form-input" value="${esc(item?.size || '')}" placeholder="e.g. Roomy (16 sq), Cramped / Roomy / Vast (4/16/36 sq)">
                </div>
                <div class="ac-form-group">
                    <label for="form-bas-prereq">Prerequisites</label>
                    <input type="text" id="form-bas-prereq" class="ac-form-input" value="${esc(item?.prerequisite || '')}" placeholder="e.g. Level 5+, Level 9+ Cleric or Paladin">
                </div>
            </div>

            <div class="ac-form-grid" style="grid-template-columns: 1fr 1fr 1fr;">
                <div class="ac-form-group">
                    <label for="form-bas-gold">Gold Cost (GP)</label>
                    <input type="text" id="form-bas-gold" class="ac-form-input" value="${esc(item?.gp_cost || '')}" placeholder="e.g. 1000, 500 / 1000/ 3000">
                </div>
                <div class="ac-form-group">
                    <label for="form-bas-dtp">DTP Cost</label>
                    <input type="text" id="form-bas-dtp" class="ac-form-input" value="${esc(item?.dtp_cost || '')}" placeholder="e.g. 45, 20 / 45 / 125">
                </div>
                <div class="ac-form-group">
                    <label for="form-bas-order-type">Bastion Order</label>
                    <input type="text" id="form-bas-order-type" class="ac-form-input" value="${esc(item?.bastion_order || '')}" placeholder="e.g. Craft, Empower, Harvest, Trade">
                </div>
            </div>

            <div class="ac-form-grid" style="grid-template-columns: 1fr 1fr;">
                <div class="ac-form-group">
                    <label for="form-bas-order">Display Order (Fractional Index) *</label>
                    <input type="number" step="any" id="form-bas-order" class="ac-form-input" value="${defaultOrder}" required>
                </div>
                <div class="ac-form-group">
                    <label for="form-bas-placement-helper">Placement Helper</label>
                    <select id="form-bas-placement-helper" class="ac-form-select">
                        <option value="end">At End (Order ${getNextDisplayOrder(allBastions, 1.0)})</option>
                        <option value="start">At Beginning (Order ${getStartDisplayOrder(allBastions)})</option>
                        ${sortedFacilities.map(f => `
                            <option value="after_${f.id}">After ${esc(f.name)} (${f.display_order})</option>
                        `).join('')}
                    </select>
                </div>
            </div>

            <div class="ac-form-group">
                <label for="form-bas-description">Description</label>
                <textarea id="form-bas-description" class="ac-form-textarea" rows="3" placeholder="Comes with 1 hireling. See book for details...">${esc(item?.description || '')}</textarea>
            </div>

            <div class="ac-form-group">
                <label for="form-bas-notes">Notes & Advice (Supports Markdown Links)</label>
                <textarea id="form-bas-notes" class="ac-form-textarea" rows="5" placeholder="- Crafting rules and allowed item tiers\n- See [Equipment Guide](/Guides/allowed-content/#equipment)...">${esc(item?.notes_advice || '')}</textarea>
            </div>

            <div class="ac-form-actions">
                <button type="button" class="ac-btn-admin ac-btn-secondary" id="form-bas-cancel">Cancel</button>
                <button type="submit" class="ac-btn-admin ac-btn-primary" id="form-bas-submit">${isEdit ? 'Save Changes' : 'Create Facility'}</button>
            </div>
        </form>
    `;

    openModal(html);

    // Initialize multi-source tag picker
    const pickerContainer = document.getElementById('form-bas-source-picker');
    if (pickerContainer) {
        renderSourceTagPicker({
            containerEl: pickerContainer,
            selectedKeys: selectedSources,
            availableKeys: allAvailableKeys,
            onChange: (updatedKeys) => {
                selectedSources = updatedKeys;
            }
        });
    }

    // Setup Placement Helper listener
    const placementSelect = document.getElementById('form-bas-placement-helper');
    const orderInput = document.getElementById('form-bas-order');
    if (placementSelect && orderInput) {
        placementSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val === 'start') {
                orderInput.value = getStartDisplayOrder(allBastions);
            } else if (val === 'end') {
                orderInput.value = getNextDisplayOrder(allBastions, 1.0);
            } else if (val.startsWith('after_')) {
                const targetId = val.replace('after_', '');
                const sorted = sortByDisplayOrder(allBastions);
                const idx = sorted.findIndex(b => b.id === targetId);
                if (idx !== -1) {
                    orderInput.value = getOrderForPosition(sorted, idx + 1);
                }
            }
        });
    }

    // Cancel Button
    const cancelBtn = document.getElementById('form-bas-cancel');
    if (cancelBtn) cancelBtn.onclick = closeModal;

    // Form Submit
    const form = document.getElementById('bastion-editor-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('form-bas-submit');
            submitBtn.disabled = true;

            const name = document.getElementById('form-bas-name').value.trim();
            const formCheckId = isEdit ? (item?.check_id || getNextBastionCheckId()) : getNextBastionCheckId();
            const typeId = document.getElementById('form-bas-category').value;
            const size = document.getElementById('form-bas-size').value.trim();
            const prereq = document.getElementById('form-bas-prereq').value.trim();
            const gpCost = document.getElementById('form-bas-gold').value.trim();
            const dtpCost = document.getElementById('form-bas-dtp').value.trim();
            const orderType = document.getElementById('form-bas-order-type').value.trim();
            const orderVal = document.getElementById('form-bas-order').value.trim();
            const description = document.getElementById('form-bas-description').value.trim();
            const notesAdvice = document.getElementById('form-bas-notes').value.trim();

            if (!name) {
                alert('Please enter a facility name.');
                submitBtn.disabled = false;
                return;
            }

            if (selectedSources.length === 0) {
                alert('Please select at least one sourcebook.');
                submitBtn.disabled = false;
                return;
            }

            const payload = {
                check_id: formCheckId,
                bastion_type_id: typeId || null,
                name,
                source: selectedSources,
                size: size || null,
                prerequisite: prereq || null,
                gp_cost: gpCost || null,
                dtp_cost: dtpCost || null,
                bastion_order: orderType || null,
                display_order: parseFloat(orderVal) || 0,
                description: description || null,
                notes_advice: notesAdvice || null
            };

            try {
                if (isEdit) {
                    const res = await updateBastion(item.id, payload);
                    if (res.error) throw res.error;
                    showToast(`Bastion "${name}" updated successfully.`);
                } else {
                    const res = await createBastion(payload);
                    if (res.error) throw res.error;
                    showToast(`Bastion "${name}" created successfully.`);
                }

                closeModal();
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('ac:bastions-updated'));
                }
                await initBastions(true);
            } catch (err) {
                console.error('Error saving bastion facility:', err);
                alert(`Error saving bastion facility: ${err.message || 'Unknown database error'}`);
                submitBtn.disabled = false;
            }
        };
    }
}

/**
 * Prompts user for confirmation and deletes a bastion facility.
 * 
 * @param {string} id - UUID of the bastion facility
 */
export async function confirmAndDeleteBastion(id) {
    const item = allBastions.find(i => i.id === id);
    const name = item ? item.name : 'this facility';

    if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
        return;
    }

    try {
        const res = await deleteBastion(id);
        if (res.error) throw res.error;

        showToast(`"${name}" was deleted successfully.`);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ac:bastions-updated'));
        }
        await initBastions(true);
    } catch (err) {
        console.error('Error deleting bastion facility:', err);
        alert(`Failed to delete facility: ${err.message || 'Unknown database error'}`);
    }
}

// Invalidate in-memory cache upon external mutations
if (typeof window !== 'undefined') {
    window.addEventListener('ac:bastions-updated', () => {
        allBastions = [];
    });
    window.addEventListener('ac:open-bastions-options', () => {
        openBastionsOptionsManagerModal();
    });
}

/**
 * Opens the Options Manager modal for Bastions.
 * Allows Admins/Engineers to configure Bastion categories (ac_bastion_type table) in the database.
 */
export function openBastionsOptionsManagerModal() {
    openGenericOptionsModal({
        title: '⚙️ Configure Bastion Categories',
        subtitle: 'Manage bastion facility categories, guidelines, and display orders stored in the database.',
        tabs: [
            {
                id: 'categories',
                label: 'Categories',
                addLabel: '+ Add Category',
                items: allBastionTypes,
                columns: [
                    { key: 'display_order', label: 'Order', width: '70px', code: true },
                    { key: 'name', label: 'Category Name' },
                    { key: 'notes', label: 'Guidelines / Rules', snippet: 60 }
                ],
                fields: [
                    { key: 'name', label: 'Category Name', required: true },
                    { key: 'display_order', label: 'Display Order', type: 'number' },
                    { key: 'notes', label: 'Guidelines / Rules', type: 'textarea', placeholder: 'Official bastion facility rules / guidelines...' }
                ]
            }
        ],
        onSave: async (drafts) => {
            const draftList = drafts.categories || [];
            const origMap = new Map(allBastionTypes.map(t => [t.id, t]));
            const draftIds = new Set(draftList.filter(d => d.id).map(d => d.id));

            // Deletions
            for (const [id] of origMap.entries()) {
                if (!draftIds.has(id)) {
                    const { error } = await deleteBastionType(id);
                    if (error) throw error;
                }
            }

            // Inserts & Updates
            for (const item of draftList) {
                if (item.id && origMap.has(item.id)) {
                    const { error } = await updateBastionType(item.id, {
                        name: item.name,
                        display_order: item.display_order,
                        notes: item.notes || null
                    });
                    if (error) throw error;
                } else {
                    const { data, error } = await insertBastionType({
                        name: item.name,
                        display_order: item.display_order,
                        notes: item.notes || null
                    });
                    if (error) throw error;
                    if (data?.id) item.id = data.id;
                }
            }

            await initBastions(true);
        }
    });
}

