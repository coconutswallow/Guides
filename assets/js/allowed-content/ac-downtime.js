/**
 * ================================================================
 * AC DOWNTIME MODULE
 * ================================================================
 * 
 * Presentation, filtering, and administration controller for
 * Allowed Content Downtime activities and categories.
 * 
 * Responsibilities:
 * - Rendering normalized downtime activities grouped by category subheaders.
 * - Multi-criteria toolbar: Category filter, Toggle All Accordion, and live text search.
 * - Inline category rules & guidelines displayed inside category subheadings.
 * - Interactive detail modal on row click with markdown link rendering.
 * - Staff administration workflows (Add, Edit, Delete) with fractional order indexing.
 * 
 * @module ACDowntime
 */

import { 
    getDowntime, 
    getDowntimeTypes,
    createDowntime, 
    updateDowntime, 
    deleteDowntime 
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
    renderMarkdownLinks, 
    resolveSourceLink,
    formatExpandableText,
    attachExpandableTextListeners,
    showToast 
} from './ac-ui-utils.js';

export {
    setAdminMode,
    getAdminMode
};

// Module State
let allDowntime = [];
let filteredDowntime = [];
let allDowntimeTypes = [];
let collapsedCategories = new Set();

// Active toolbar filters
let selectedCategoryFilter = 'ALL';   // 'ALL' | specific category name
let currentSearchTerm = '';

/**
 * Initializes the Downtime view.
 * 
 * @param {boolean} [forceRefresh=false]
 */
export async function initDowntime(forceRefresh = false) {
    const container = document.getElementById('ac-view-downtime');
    if (!container) return;

    if (forceRefresh) {
        selectedCategoryFilter = 'ALL';
        currentSearchTerm = '';
        collapsedCategories.clear();
    } else if (allDowntime.length > 0) {
        applyFilters();
        updateTableOnly();
        return;
    }

    container.innerHTML = `
        <div class="ac-loading">
            <div class="spinner"></div>
            <span>Cataloging Downtime Activities...</span>
        </div>
    `;

    try {
        const [downtimeData, typesData] = await Promise.all([
            getDowntime(),
            getDowntimeTypes()
        ]);

        allDowntime = sortByDisplayOrder(downtimeData || []);
        allDowntimeTypes = sortByDisplayOrder(typesData || []);

        applyFilters();
        renderShell();
    } catch (error) {
        console.error('Failed to initialize Downtime module:', error);
        container.innerHTML = `
            <div class="ac-error-state">
                <p>Failed to load downtime activities. Please refresh or try again later.</p>
                <button class="ac-btn ac-btn-primary" onclick="window.location.reload()">Reload</button>
            </div>
        `;
    }
}

/**
 * Applies search and category filters to allDowntime dataset.
 */
function applyFilters() {
    filteredDowntime = allDowntime.filter(item => {
        // Category Filter
        if (selectedCategoryFilter !== 'ALL') {
            const catName = item.downtime_type?.name || item.category?.name;
            if (catName !== selectedCategoryFilter) return false;
        }

        // Text Search Filter
        if (currentSearchTerm) {
            const term = currentSearchTerm.toLowerCase();
            const nameMatch = (item.name || '').toLowerCase().includes(term);
            const checkIdMatch = (item.check_id || '').toLowerCase().includes(term);
            const catName = (item.downtime_type?.name || item.category?.name || '').toLowerCase();
            const catMatch = catName.includes(term);
            const goldMatch = (item.gold_cost || '').toLowerCase().includes(term);
            const dtpMatch = String(item.dtp_cost || '').toLowerCase().includes(term);
            const descMatch = (item.description || '').toLowerCase().includes(term);
            const notesMatch = (item.notes_advice || '').toLowerCase().includes(term);

            if (!nameMatch && !checkIdMatch && !catMatch && !goldMatch && !dtpMatch && !descMatch && !notesMatch) {
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
export function filterDowntime(term) {
    currentSearchTerm = (term || '').trim();
    applyFilters();
    updateTableOnly();
}

/**
 * Renders the top-level toolbar, filters, and table container.
 */
function renderShell() {
    const container = document.getElementById('ac-view-downtime');
    if (!container) return;

    const isAdmin = getAdminMode();

    container.innerHTML = `
        <div class="ac-toolbar-layout">
            <!-- Filter Controls Bar -->
            <div class="ac-equipment-toolbar ac-classes-toolbar">
                <div class="ac-toolbar-left">
                    <!-- Category / Type Dropdown -->
                    <div class="ac-filter-group">
                        <label for="downtime-category-filter" class="ac-filter-label">Category:</label>
                        <select id="downtime-category-filter" class="ac-filter-select">
                            <option value="ALL">All Categories (${allDowntimeTypes.length})</option>
                            ${allDowntimeTypes.map(t => {
                                const count = allDowntime.filter(i => {
                                    const cId = i.downtime_type_id || i.category_id;
                                    const cName = i.downtime_type?.name || i.category?.name;
                                    return cId === t.id || cName === t.name;
                                }).length;
                                return `<option value="${esc(t.name)}" ${selectedCategoryFilter === t.name ? 'selected' : ''}>${esc(t.name)} (${count})</option>`;
                            }).join('')}
                        </select>
                    </div>

                    <!-- Toggle All Button -->
                    <button class="ac-btn-toggle-all" id="downtime-toggle-all-btn" title="Toggle expanding or collapsing all categories">
                        Collapse All ▲
                    </button>
                </div>

                <div class="ac-toolbar-right">
                    <span class="ac-items-count" id="downtime-stats">
                        Showing <strong>${filteredDowntime.length}</strong> ${filteredDowntime.length === 1 ? 'Activity' : 'Activities'}
                    </span>
                    ${isAdmin ? `
                        <button class="ac-btn ac-btn-primary ac-btn-sm" id="btn-add-downtime-top">
                            + Add Downtime Activity
                        </button>
                    ` : ''}
                </div>
            </div>

            <!-- Main Content Area: Table Wrapper -->
            <div id="downtime-table-container">
                ${renderTable(isAdmin)}
            </div>
        </div>
    `;

    setupControls();
    setupTableInteractions();
}

/**
 * Groups filtered downtime activities by category according to allDowntimeTypes ordering.
 * 
 * @param {Array} items - Filtered downtime array
 * @returns {Array<Object>} Group objects with name, notes, and items array
 */
function groupDowntimeByCategory(items) {
    const groups = [];
    const handledIds = new Set();

    // 1. Group by known allDowntimeTypes (preserves canonical display_order 1.0 to 13.0)
    allDowntimeTypes.forEach(catType => {
        const matchingItems = items.filter(item => {
            const typeId = item.downtime_type_id || item.category_id;
            const typeName = item.downtime_type?.name || item.category?.name;
            return typeId === catType.id || typeName === catType.name;
        });

        if (matchingItems.length > 0) {
            matchingItems.forEach(i => handledIds.add(i.id));
            groups.push({
                type: catType,
                name: catType.name,
                notes: catType.notes || catType.description || null,
                items: matchingItems
            });
        }
    });

    // 2. Unhandled / unmapped items fallback
    const unhandled = items.filter(i => !handledIds.has(i.id));
    if (unhandled.length > 0) {
        const remainingMap = new Map();
        unhandled.forEach(i => {
            const name = i.downtime_type?.name || i.category?.name || 'Other Activities';
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
    const tableContainer = document.getElementById('downtime-table-container');
    const statsContainer = document.getElementById('downtime-stats');
    const isAdmin = getAdminMode();

    if (statsContainer) {
        statsContainer.innerHTML = `Showing <strong>${filteredDowntime.length}</strong> ${filteredDowntime.length === 1 ? 'Activity' : 'Activities'}`;
    }

    if (tableContainer) {
        tableContainer.innerHTML = renderTable(isAdmin);
        attachExpandableTextListeners(tableContainer);
    }

    updateToggleAllBtn();
}

/**
 * Generates the HTML table for downtime activities grouped by category subheadings.
 * 
 * @param {boolean} isAdmin
 * @returns {string} Table HTML
 */
function renderTable(isAdmin) {
    const totalCols = isAdmin ? 6 : 5;

    if (filteredDowntime.length === 0) {
        return `
            <div class="ac-table-wrapper">
                <table class="ac-table" id="downtime-table">
                    <thead>
                        <tr>
                            <th class="col-name" style="min-width: 220px;">Activity</th>
                            <th class="col-gold" style="width: 150px;">Gold Cost</th>
                            <th class="col-dtp" style="width: 120px;">DTP Cost</th>
                            <th class="col-description hide-mobile" style="min-width: 240px;">Description</th>
                            <th class="col-notes hide-tablet" style="min-width: 260px;">Notes / Advice</th>
                            ${isAdmin ? '<th class="col-actions" style="width: 85px; text-align: center;">Actions</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="${totalCols}" style="text-align: center; padding: 3rem;">
                                No downtime activities found matching your criteria.
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    const groups = groupDowntimeByCategory(filteredDowntime);

    return `
        <div class="ac-table-wrapper">
            <table class="ac-table" id="downtime-table">
                <thead>
                    <tr>
                        <th class="col-name" style="min-width: 220px;">Activity</th>
                        <th class="col-gold" style="width: 150px;">Gold Cost</th>
                        <th class="col-dtp" style="width: 120px;">DTP Cost</th>
                        <th class="col-description hide-mobile" style="min-width: 240px;">Description</th>
                        <th class="col-notes hide-tablet" style="min-width: 260px;">Notes / Advice</th>
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
                                        <span class="ac-counter-pill">${group.items.length} ${group.items.length === 1 ? 'Activity' : 'Activities'}</span>${group.notes ? `
                                        <span class="ac-table-group-divider">—</span>
                                        <span class="ac-table-group-notes">${renderMarkdownLinks(group.notes.trim())}</span>` : ''}
                                        <span class="ac-group-hover-hint">${isCollapsed ? 'Expand ▼' : 'Collapse ▲'}</span>
                                    </div>
                                </td>
                            </tr>
                        `;

                        const itemsHtml = group.items.map(item => {
                            const goldDisplay = esc(item.gold_cost || '—');
                            const dtpDisplay = esc(item.dtp_cost !== null && item.dtp_cost !== undefined ? String(item.dtp_cost) : '—');

                            return `
                                <tr data-id="${item.id}" data-category="${esc(group.name)}" class="ac-downtime-row ${isCollapsed ? 'ac-group-collapsed' : ''}" style="${isCollapsed ? 'display: none;' : ''}">
                                    <td class="col-name">
                                        <div class="name-cell">
                                            <strong>${esc(item.name)}</strong>
                                            <span class="row-hover-icon">Details →</span>
                                        </div>
                                    </td>
                                    <td class="col-gold">${goldDisplay}</td>
                                    <td class="col-dtp">${dtpDisplay}</td>
                                    <td class="col-description hide-mobile">
                                        ${formatExpandableText(item.description || '—', 120)}
                                    </td>
                                    <td class="col-notes hide-tablet">
                                        ${formatExpandableText(item.notes_advice || '—', 140)}
                                    </td>
                                    ${isAdmin ? `
                                        <td class="col-actions" style="text-align: center;">
                                            <div class="action-buttons-inline">
                                                <button class="btn-action-icon btn-edit-downtime" data-id="${item.id}" title="Edit Activity">✏️</button>
                                                <button class="btn-action-icon btn-delete-downtime" data-id="${item.id}" title="Delete Activity">🗑️</button>
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
    const btn = document.getElementById('downtime-toggle-all-btn');
    if (!btn) return;

    const visibleGroups = groupDowntimeByCategory(filteredDowntime);
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
    const container = document.getElementById('ac-view-downtime');
    if (!container) return;

    // Category Filter
    const catSelect = container.querySelector('#downtime-category-filter');
    if (catSelect) {
        catSelect.addEventListener('change', (e) => {
            selectedCategoryFilter = e.target.value;
            applyFilters();
            updateTableOnly();
        });
    }

    // Toggle All Button
    const toggleBtn = container.querySelector('#downtime-toggle-all-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const visibleGroups = groupDowntimeByCategory(filteredDowntime);
            const allAreCollapsed = visibleGroups.length > 0 && visibleGroups.every(g => collapsedCategories.has(g.name));

            if (allAreCollapsed) {
                // Expand all
                visibleGroups.forEach(g => collapsedCategories.delete(g.name));
            } else {
                // Collapse all
                visibleGroups.forEach(g => collapsedCategories.add(g.name));
            }

            updateTableOnly();
        });
    }

    // Top Add Activity Button (Admin)
    const addTopBtn = container.querySelector('#btn-add-downtime-top');
    if (addTopBtn) {
        addTopBtn.addEventListener('click', () => openDowntimeForm());
    }

    // Initial expandable text listeners
    attachExpandableTextListeners(container);
}

/**
 * Sets up event delegation on the table for row clicks, accordion subheaders, and admin buttons.
 */
function setupTableInteractions() {
    const container = document.getElementById('ac-view-downtime');
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
                const rows = table.querySelectorAll(`tr.ac-downtime-row[data-category="${categoryName}"]`);
                rows.forEach(r => {
                    r.classList.toggle('ac-group-collapsed', isCollapsed);
                    r.style.display = isCollapsed ? 'none' : '';
                });
            }

            updateToggleAllBtn();
            return;
        }

        // 2. Admin Edit Button Click
        const editBtn = e.target.closest('.btn-edit-downtime');
        if (editBtn) {
            e.stopPropagation();
            const id = editBtn.dataset.id;
            const item = allDowntime.find(i => i.id === id);
            if (item) openDowntimeForm(item);
            return;
        }

        // 3. Admin Delete Button Click
        const deleteBtn = e.target.closest('.btn-delete-downtime');
        if (deleteBtn) {
            e.stopPropagation();
            const id = deleteBtn.dataset.id;
            confirmAndDeleteDowntime(id);
            return;
        }

        // 4. Detail Modal Click (Row Click)
        const row = e.target.closest('tr.ac-downtime-row');
        if (row) {
            // Ignore clicks on expandable buttons or links
            if (e.target.closest('.ac-expand-btn') || e.target.tagName === 'A') return;

            const id = row.dataset.id;
            const item = allDowntime.find(i => i.id === id);
            if (item) showDowntimeDetail(item);
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
 * Shows the full detail modal for a downtime activity.
 * 
 * @param {Object} item - Downtime activity object
 */
export function showDowntimeDetail(item) {
    const isAdmin = getAdminMode();
    const catName = item.downtime_type?.name || item.category?.name || 'Uncategorized';
    const catNotes = item.downtime_type?.notes || item.downtime_type?.description || item.category?.notes || null;

    const goldVal = item.gold_cost || '—';
    const dtpVal = item.dtp_cost !== null && item.dtp_cost !== undefined ? String(item.dtp_cost) : '—';
    const displayOrderVal = formatDisplayOrder(item.display_order);

    const html = `
        <div class="ac-modal-detail">
            <!-- Header -->
            <div class="detail-header">
                <div class="detail-title-row">
                    <h2>${esc(item.name)}</h2>
                    <div class="detail-badges">
                        ${item.check_id ? `<span class="source-badge badge-official" title="Audit Check ID">${esc(item.check_id)}</span>` : ''}
                        <span class="source-badge badge-homebrew" title="Category">${esc(catName)}</span>
                    </div>
                </div>
            </div>

            <!-- Quick Metadata Grid -->
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="label">Gold Cost:</span>
                    <span class="value"><strong>${esc(goldVal)}</strong></span>
                </div>
                <div class="detail-item">
                    <span class="label">DTP Cost:</span>
                    <span class="value"><strong>${esc(dtpVal)}</strong></span>
                </div>
                <div class="detail-item">
                    <span class="label">Display Order:</span>
                    <span class="value">${esc(displayOrderVal)}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Category:</span>
                    <span class="value">${esc(catName)}</span>
                </div>
            </div>

            <!-- Description -->
            ${item.description ? `
                <div class="detail-section">
                    <h3>Description</h3>
                    <div class="detail-text">${renderMarkdownLinks(item.description)}</div>
                </div>
            ` : ''}

            <!-- Notes & Advice -->
            ${item.notes_advice ? `
                <div class="detail-section">
                    <h3>Notes & Advice</h3>
                    <div class="detail-text detail-notes">${renderMarkdownLinks(item.notes_advice)}</div>
                </div>
            ` : ''}

            <!-- Category Guidelines -->
            ${catNotes ? `
                <div class="detail-section">
                    <h3>Category Rules: ${esc(catName)}</h3>
                    <div class="detail-text detail-rules">${renderMarkdownLinks(catNotes)}</div>
                </div>
            ` : ''}

            <!-- Staff Admin Actions in Modal -->
            ${isAdmin ? `
                <div class="detail-admin-actions">
                    <button class="ac-btn ac-btn-secondary" id="modal-btn-edit-downtime">
                        ✏️ Edit Activity
                    </button>
                    <button class="ac-btn ac-btn-danger" id="modal-btn-delete-downtime">
                        🗑️ Delete Activity
                    </button>
                </div>
            ` : ''}
        </div>
    `;

    openModal(html);

    if (isAdmin) {
        const modalContainer = document.getElementById('ac-detail-modal');
        if (modalContainer) {
            const editBtn = modalContainer.querySelector('#modal-btn-edit-downtime');
            if (editBtn) {
                editBtn.addEventListener('click', () => {
                    closeModal();
                    openDowntimeForm(item);
                });
            }

            const deleteBtn = modalContainer.querySelector('#modal-btn-delete-downtime');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    closeModal();
                    confirmAndDeleteDowntime(item.id);
                });
            }
        }
    }
}

/**
 * Calculates next audit check_id (e.g. DT_0131).
 * 
 * @returns {string}
 */
function getNextDowntimeCheckId() {
    let maxNum = 0;
    allDowntime.forEach(item => {
        if (item.check_id && item.check_id.startsWith('DT_')) {
            const num = parseInt(item.check_id.replace('DT_', ''), 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        }
    });
    const nextNum = maxNum + 1;
    return `DT_${String(nextNum).padStart(4, '0')}`;
}

/**
 * Opens staff administrative modal form for creating or editing a downtime activity.
 * 
 * @param {Object} [item=null] - If provided, opens form in Edit mode; otherwise Add mode
 */
export function openDowntimeForm(item = null) {
    const isEdit = !!item;
    const checkId = isEdit ? (item.check_id || '') : getNextDowntimeCheckId();
    const defaultTypeId = isEdit 
        ? (item.downtime_type_id || item.category_id || '') 
        : (allDowntimeTypes[0]?.id || '');
    const defaultOrder = isEdit 
        ? item.display_order 
        : getNextDisplayOrder(allDowntime, 1.0);

    const html = `
        <div class="ac-modal-form">
            <h2>${isEdit ? 'Edit Downtime Activity' : 'Add New Downtime Activity'}</h2>
            <form id="downtime-editor-form">
                <div class="form-row">
                    <div class="form-group form-group-half">
                        <label for="form-dt-check-id">Check ID</label>
                        <input type="text" id="form-dt-check-id" value="${esc(checkId)}" placeholder="DT_0131" required>
                    </div>
                    <div class="form-group form-group-half">
                        <label for="form-dt-category">Category *</label>
                        <select id="form-dt-category" required>
                            ${allDowntimeTypes.map(t => `
                                <option value="${t.id}" ${t.id === defaultTypeId ? 'selected' : ''}>
                                    ${esc(t.name)}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group form-group-full">
                        <label for="form-dt-name">Activity Name *</label>
                        <input type="text" id="form-dt-name" value="${esc(item?.name || '')}" placeholder="e.g. Construct or Expand a Bastion" required>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group form-group-third">
                        <label for="form-dt-gold">Gold Cost</label>
                        <input type="text" id="form-dt-gold" value="${esc(item?.gold_cost || '')}" placeholder="e.g. 0, -50, Varies">
                    </div>
                    <div class="form-group form-group-third">
                        <label for="form-dt-dtp">DTP Cost</label>
                        <input type="text" id="form-dt-dtp" value="${esc(item?.dtp_cost !== null && item?.dtp_cost !== undefined ? String(item.dtp_cost) : '')}" placeholder="e.g. 0, 7, Varies">
                    </div>
                    <div class="form-group form-group-third">
                        <label for="form-dt-order">Display Order</label>
                        <input type="number" step="0.0001" id="form-dt-order" value="${defaultOrder}" required>
                    </div>
                </div>

                <div class="form-group">
                    <label for="form-dt-description">Description</label>
                    <textarea id="form-dt-description" rows="3" placeholder="Brief summary of the downtime activity...">${esc(item?.description || '')}</textarea>
                </div>

                <div class="form-group">
                    <label for="form-dt-notes">Notes & Advice (Supports Markdown Links)</label>
                    <textarea id="form-dt-notes" rows="6" placeholder="- Specific execution rules\n- Log requirement (#downtime-logs)\n- See [Player Guidelines](https://...)">${esc(item?.notes_advice || '')}</textarea>
                </div>

                <div class="form-actions">
                    <button type="button" class="ac-btn ac-btn-secondary" id="form-cancel-btn">Cancel</button>
                    <button type="submit" class="ac-btn ac-btn-primary" id="form-submit-btn">
                        ${isEdit ? 'Save Changes' : 'Create Activity'}
                    </button>
                </div>
            </form>
        </div>
    `;

    openModal(html);

    const form = document.getElementById('downtime-editor-form');
    if (!form) return;

    form.querySelector('#form-cancel-btn')?.addEventListener('click', closeModal);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('#form-submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        const nameVal = form.querySelector('#form-dt-name').value.trim();
        const checkIdVal = form.querySelector('#form-dt-check-id').value.trim();
        const typeIdVal = form.querySelector('#form-dt-category').value;
        const goldVal = form.querySelector('#form-dt-gold').value.trim() || null;
        const dtpVal = form.querySelector('#form-dt-dtp').value.trim() || null;
        const orderVal = cleanFloat(parseFloat(form.querySelector('#form-dt-order').value) || 0);
        const descVal = form.querySelector('#form-dt-description').value.trim() || null;
        const notesVal = form.querySelector('#form-dt-notes').value.trim() || null;

        if (!nameVal || !typeIdVal) {
            showToast('Please fill out all required fields.', true);
            submitBtn.disabled = false;
            submitBtn.textContent = isEdit ? 'Save Changes' : 'Create Activity';
            return;
        }

        const payload = {
            name: nameVal,
            activity: nameVal,
            check_id: checkIdVal,
            downtime_type_id: typeIdVal,
            category_id: typeIdVal,
            gold_cost: goldVal,
            dtp_cost: dtpVal,
            display_order: orderVal,
            description: descVal,
            notes_advice: notesVal
        };

        try {
            if (isEdit) {
                const { data, error } = await updateDowntime(item.id, payload);
                if (error) throw error;
                showToast(`Activity "${nameVal}" updated successfully.`);
            } else {
                const { data, error } = await createDowntime(payload);
                if (error) throw error;
                showToast(`Activity "${nameVal}" created successfully.`);
            }

            closeModal();
            await initDowntime(true);
            window.dispatchEvent(new CustomEvent('ac:downtime-updated', { detail: payload }));
        } catch (err) {
            console.error('Error saving downtime activity:', err);
            showToast(`Failed to save activity: ${err.message}`, true);
            submitBtn.disabled = false;
            submitBtn.textContent = isEdit ? 'Save Changes' : 'Create Activity';
        }
    });
}

/**
 * Prompts confirmation and deletes a downtime activity.
 * 
 * @param {string} id - Activity UUID
 */
async function confirmAndDeleteDowntime(id) {
    const item = allDowntime.find(i => i.id === id);
    if (!item) return;

    if (!confirm(`Are you sure you want to delete "${item.name}"? This action cannot be undone.`)) {
        return;
    }

    try {
        const { success, error } = await deleteDowntime(id);
        if (error || !success) throw error || new Error('Delete operation failed');

        showToast(`Activity "${item.name}" deleted.`);
        await initDowntime(true);
        window.dispatchEvent(new CustomEvent('ac:downtime-updated', { detail: { id, deleted: true } }));
    } catch (err) {
        console.error('Error deleting downtime activity:', err);
        showToast(`Failed to delete activity: ${err.message}`, true);
    }
}
