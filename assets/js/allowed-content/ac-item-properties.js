/**
 * ================================================================
 * AC ITEM PROPERTIES MODULE
 * ================================================================
 * 
 * Presentation, filtering, and administration controller for
 * Allowed Content Item Properties (Magic Item Special Features:
 * Creator, History, Minor Property, Quirk, and Sentient Magic Items).
 * 
 * Responsibilities:
 * - Rendering normalized Item Properties grouped by type/category accordion subheaders.
 * - Displaying inline introductory notes and rules per category.
 * - Multi-criteria toolbar: Type dropdown, Category (Fair Game vs Full DM Only) dropdown,
 *   Sourcebook dropdown, Toggle All Accordion, and live full-text search.
 * - Interactive detail modal on row click with markdown link and source badge rendering.
 * - Staff administration workflows (Add, Edit, Delete) with multi-source tag picker and fractional order indexing.
 * 
 * @module ACItemProperties
 */

import { 
    getItemProperties, 
    getItemPropertiesCategories, 
    createItemProperty, 
    updateItemProperty, 
    deleteItemProperty,
    getItemPropertyLookups,
    updateLookup,
    insertItemPropertiesCategory,
    updateItemPropertiesCategory,
    deleteItemPropertiesCategory,
    getSourcesCached,
    getSharedUsage,
    updateSharedUsage
} from './ac-service.js';
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
import { openGenericOptionsModal, openUsageOptionsModal } from './ac-options-manager.js';

export {
    setAdminMode,
    getAdminMode,
    openUsageOptionsModal
};


// Module State
let allItemProperties = [];
let filteredItemProperties = [];
let allCategories = [];
let propertyLookups = { types: [], permissions: [] };
let availableSourceKeys = [];
let availableTypes = [];
let collapsedCategories = new Set();

// Active toolbar filters
let selectedTypeFilter = 'ALL';         // 'ALL' | 'Creator' | 'History' | 'Minor Property' | 'Quirk' | 'Sentient Magic Item Property'
let selectedCategoryFilter = 'ALL';     // 'ALL' | 'Fair Game' | 'Full DM Only'
let selectedSourceFilter = 'ALL';       // 'ALL' | specific source key ('DMG2014', 'DMG2024', 'HHB')
let currentSearchTerm = '';

/**
 * Initializes the Item Properties view.
 * 
 * @param {boolean} [forceRefresh=false]
 */
export async function initItemProperties(forceRefresh = false) {
    const container = document.getElementById('ac-view-item-properties');
    if (!container) return;

    if (forceRefresh) {
        selectedTypeFilter = 'ALL';
        selectedCategoryFilter = 'ALL';
        selectedSourceFilter = 'ALL';
        currentSearchTerm = '';
        collapsedCategories.clear();
        allItemProperties = [];
    } else if (allItemProperties.length > 0) {
        applyFilters();
        updateTableOnly();
        return;
    }

    container.innerHTML = `
        <div class="ac-loading">
            <div class="spinner"></div>
            <span>Cataloging Item Properties...</span>
        </div>
    `;

    try {
        const [propsData, catsData, sourcesData, lookupsData, sharedUsageData] = await Promise.all([
            getItemProperties(),
            getItemPropertiesCategories(),
            getSourcesCached().catch(() => []),
            getItemPropertyLookups(),
            (typeof getSharedUsage === 'function' ? getSharedUsage() : Promise.resolve([])).catch(() => [])
        ]);

        allCategories = catsData || [];
        propertyLookups = lookupsData || { types: [], permissions: [] };
        if (Array.isArray(sharedUsageData) && sharedUsageData.length > 0) {
            propertyLookups.permissions = sharedUsageData;
        }
        allItemProperties = (propsData || []).map(p => ({
            ...p,
            display_order: typeof p.display_order === 'number' ? p.display_order : 10.0,
            source: Array.isArray(p.source) ? p.source : (p.source ? [p.source] : ['HHB'])
        }));

        sortByDisplayOrder(allItemProperties);

        // Collect available types in canonical order from lookups
        const configuredTypes = (propertyLookups.types || []).map(t => t.name);
        const typesSet = new Set(allItemProperties.map(p => p.type).filter(Boolean));
        availableTypes = configuredTypes.length > 0
            ? configuredTypes
            : ['Creator', 'History', 'Minor Property', 'Quirk', 'Sentient Magic Item Property'];
        // Add any items with types that aren't yet in configuredTypes
        typesSet.forEach(t => {
            if (!availableTypes.includes(t)) availableTypes.push(t);
        });

        // Collect available source keys
        const srcKeysSet = new Set();
        allItemProperties.forEach(p => {
            if (Array.isArray(p.source)) {
                p.source.forEach(s => { if (s) srcKeysSet.add(s.trim()); });
            }
        });
        availableSourceKeys = Array.from(srcKeysSet).sort();

        applyFilters();
        renderShell();
    } catch (err) {
        console.error('Error initializing Item Properties:', err);
        container.innerHTML = `
            <div class="ac-error-state">
                <p>Failed to load Item Properties: ${esc(err.message)}</p>
                <button type="button" class="ac-btn ac-btn-primary" onclick="window.location.reload()">Reload</button>
            </div>
        `;
    }
}

/**
 * Applies search query and filter dropdown criteria to allItemProperties.
 */
function applyFilters() {
    filteredItemProperties = allItemProperties.filter(item => {
        // 1. Type Filter
        if (selectedTypeFilter !== 'ALL' && item.type !== selectedTypeFilter) {
            return false;
        }

        // 2. Category Sub Filter (Fair Game vs Full DM Only)
        if (selectedCategoryFilter !== 'ALL' && item.category_sub !== selectedCategoryFilter) {
            return false;
        }

        // 3. Source Filter
        if (selectedSourceFilter !== 'ALL') {
            const hasSource = Array.isArray(item.source)
                ? item.source.includes(selectedSourceFilter)
                : item.source === selectedSourceFilter;
            if (!hasSource) return false;
        }

        // 4. Full-text Search
        if (currentSearchTerm) {
            const term = currentSearchTerm.toLowerCase();
            const nameMatch = (item.name || '').toLowerCase().includes(term);
            const checkIdMatch = (item.check_id || '').toLowerCase().includes(term);
            const typeMatch = (item.type || '').toLowerCase().includes(term);
            const catSubMatch = (item.category_sub || '').toLowerCase().includes(term);
            const descMatch = (item.description || '').toLowerCase().includes(term);
            const notesMatch = (item.notes_advice || '').toLowerCase().includes(term);
            const sourceMatch = Array.isArray(item.source)
                ? item.source.some(s => (s || '').toLowerCase().includes(term))
                : (item.source || '').toLowerCase().includes(term);

            if (!nameMatch && !checkIdMatch && !typeMatch && !catSubMatch && !descMatch && !notesMatch && !sourceMatch) {
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
export function filterItemProperties(term) {
    currentSearchTerm = (term || '').trim();
    applyFilters();
    updateTableOnly();
}

/**
 * Renders the top-level toolbar, filters, and table container.
 */
function renderShell() {
    const container = document.getElementById('ac-view-item-properties');
    if (!container) return;

    const isAdmin = getAdminMode();

    container.innerHTML = `
        <div class="ac-toolbar-layout">
            <!-- Filter Controls Bar -->
            <div class="ac-item-properties-toolbar ac-classes-toolbar">
                <div class="ac-toolbar-left">
                    <!-- Type Filter Dropdown -->
                    <select id="ac-item-properties-type-filter" class="ac-filter-select" title="Filter by Type" aria-label="Filter by Type">
                        <option value="ALL">All Types (${availableTypes.length})</option>
                        ${availableTypes.map(t => {
                            const count = allItemProperties.filter(i => i.type === t).length;
                            return `<option value="${esc(t)}" ${selectedTypeFilter === t ? 'selected' : ''}>${esc(t)} (${count})</option>`;
                        }).join('')}
                    </select>

                    <!-- Usage Filter Dropdown -->
                    <select id="ac-item-properties-category-filter" class="ac-filter-select" title="Filter by Usage" aria-label="Filter by Usage">
                        <option value="ALL">All Usages</option>
                        ${(propertyLookups.permissions || [
                            { name: 'Fair Game', label: 'Fair Game (Any DM)' },
                            { name: 'Full DM Only', label: 'Full DM Only' }
                        ]).map(p => `
                            <option value="${esc(p.name)}" ${selectedCategoryFilter === p.name ? 'selected' : ''}>${esc(p.label || p.name)}</option>
                        `).join('')}
                    </select>

                    <!-- Sourcebook Dropdown -->
                    <select id="ac-item-properties-source-filter" class="ac-filter-select" title="Filter by Sourcebook" aria-label="Filter by Sourcebook">
                        <option value="ALL">All Sources (${availableSourceKeys.length})</option>
                        ${availableSourceKeys.map(k => `
                            <option value="${esc(k)}" ${selectedSourceFilter === k ? 'selected' : ''}>${esc(k)}</option>
                        `).join('')}
                    </select>

                    <!-- Toggle All Button -->
                    <button type="button" id="ac-item-properties-toggle-all-btn" class="ac-btn-toggle-all" title="Toggle expanding or collapsing all sections">
                        Collapse All ▲
                    </button>
                </div>

                <div class="ac-toolbar-right">
                    <span class="ac-items-count" id="item-properties-stats">
                        Showing <strong>${filteredItemProperties.length}</strong> ${filteredItemProperties.length === 1 ? 'Property' : 'Properties'}
                    </span>
                </div>
            </div>

            <!-- Main Content Area: Table Wrapper -->
            <div id="item-properties-table-container">
                ${renderTable(isAdmin)}
            </div>
        </div>
    `;

    setupControls();
    setupTableInteractions();
}

/**
 * Groups filtered item properties by Type according to canonical ordering.
 * 
 * @param {Array} items - Filtered item properties array
 * @returns {Array<Object>} Group objects with type, name, notes, and items array
 */
function groupItemPropertiesByType(items) {
    const groups = [];
    const typesOrder = ['Creator', 'History', 'Minor Property', 'Quirk', 'Sentient Magic Item Property'];

    // Map each type to category notes if available
    const typeCatMap = {
        'Creator': 'Magic Item Special Features - Creator',
        'History': 'Magic Item Special Features - History',
        'Minor Property': 'Magic Item Special Features - Minor Property',
        'Quirk': 'Magic Item Special Features - Quirk',
        'Sentient Magic Item Property': 'Sentient Magic Items'
    };

    const typeDescMap = {
        'Creator': 'A magic item can have up to 1 Creator property detailing who crafted or intended to use it.',
        'History': 'A magic item can have up to 1 History property regarding a notable detail in its past.',
        'Minor Property': 'A magic item can have up to 2 Minor Properties providing cosmetic or minor conditional effects.',
        'Quirk': 'A magic item can have up to 1 Quirk describing a harmless peculiarity or behavioral quirk.',
        'Sentient Magic Item Property': 'Only Full DMs (or DMs collaborating via #dm-collaboration) can award sentient magic items.'
    };

    typesOrder.forEach(typeName => {
        const matchingItems = items.filter(i => i.type === typeName);
        if (matchingItems.length > 0) {
            const catRecord = allCategories.find(c => c.name === typeCatMap[typeName]);
            groups.push({
                name: typeName,
                notes: catRecord?.notes || typeDescMap[typeName] || null,
                items: matchingItems
            });
        }
    });

    // Unmapped types fallback
    const handledTypes = new Set(typesOrder);
    const unhandled = items.filter(i => !handledTypes.has(i.type));
    if (unhandled.length > 0) {
        const unhandledMap = new Map();
        unhandled.forEach(i => {
            const t = i.type || 'Other Properties';
            if (!unhandledMap.has(t)) unhandledMap.set(t, []);
            unhandledMap.get(t).push(i);
        });
        for (const [t, unhandledList] of unhandledMap.entries()) {
            groups.push({
                name: t,
                notes: null,
                items: unhandledList
            });
        }
    }

    return groups;
}

/**
 * Updates only the table content and stats counter without full shell rerender.
 */
function updateTableOnly() {
    const tableContainer = document.getElementById('item-properties-table-container');
    const statsContainer = document.getElementById('item-properties-stats');
    const isAdmin = getAdminMode();

    if (statsContainer) {
        statsContainer.innerHTML = `Showing <strong>${filteredItemProperties.length}</strong> ${filteredItemProperties.length === 1 ? 'Property' : 'Properties'}`;
    }

    if (tableContainer) {
        tableContainer.innerHTML = renderTable(isAdmin);
        attachExpandableTextListeners(tableContainer);
    }

    updateToggleAllBtn();
}

/**
 * Generates the HTML table for item properties grouped by type accordion subheadings.
 * 
 * @param {boolean} isAdmin
 * @returns {string} Table HTML
 */
function renderTable(isAdmin) {
    const totalCols = isAdmin ? 6 : 5;
    const groups = groupItemPropertiesByType(filteredItemProperties);

    if (groups.length === 0) {
        return `
            <div class="ac-table-wrapper">
                <table class="ac-table" id="item-properties-table">
                    <thead>
                        <tr>
                            <th class="col-name" style="min-width: 180px;">Name</th>
                            <th class="col-permission" style="width: 140px; text-align: center;">Usage</th>
                            <th class="col-source" style="width: 120px; text-align: center;">Source</th>
                            <th class="col-desc" style="min-width: 240px;">Description</th>
                            <th class="col-notes hide-tablet" style="min-width: 240px;">Notes / Advice</th>
                            ${isAdmin ? '<th class="col-actions" style="width: 85px; text-align: center;">Actions</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="${totalCols}" style="text-align: center; padding: 3rem;">
                                No Item Properties found matching your criteria.
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    let html = `
        <div class="ac-table-wrapper">
            <table class="ac-table" id="item-properties-table">
                <thead>
                    <tr>
                        <th class="col-name" style="min-width: 180px;">Name</th>
                        <th class="col-permission" style="width: 140px; text-align: center;">Usage</th>
                        <th class="col-source" style="width: 120px; text-align: center;">Source</th>
                        <th class="col-desc" style="min-width: 240px;">Description</th>
                        <th class="col-notes hide-tablet" style="min-width: 240px;">Notes / Advice</th>
                        ${isAdmin ? '<th class="col-actions" style="width: 85px; text-align: center;">Actions</th>' : ''}
                    </tr>
                </thead>
                <tbody>
    `;

    groups.forEach(group => {
        const isCollapsed = collapsedCategories.has(group.name);
        const chevron = isCollapsed ? '▶' : '▼';
        const ariaExpanded = isCollapsed ? 'false' : 'true';
        const itemCount = group.items.length;

        // Group Header Row
        html += `
            <tr class="ac-table-group-header" 
                data-category="${esc(group.name)}" 
                role="button" 
                tabindex="0" 
                aria-expanded="${ariaExpanded}"
                title="${isCollapsed ? 'Expand section' : 'Collapse section'}">
                <td colspan="${totalCols}">
                    <span class="ac-group-chevron">${chevron}</span>
                    <span class="ac-group-title">${esc(group.name)}</span>
                    <span class="ac-group-count">(${itemCount} ${itemCount === 1 ? 'property' : 'properties'})</span>
                </td>
            </tr>
        `;

        // Optional Group Notes Row
        if (group.notes) {
            html += `
                <tr class="ac-table-group-notes ${isCollapsed ? 'is-collapsed' : ''}" data-category-notes="${esc(group.name)}">
                    <td colspan="${totalCols}">
                        <div class="ac-group-notes-content">
                            ${renderMarkdownLinks(group.notes)}
                        </div>
                    </td>
                </tr>
            `;
        }

        // Property Item Rows
        group.items.forEach(item => {
            const isFairGame = item.category_sub === 'Fair Game';
            const permBadge = isFairGame
                ? '<span class="ruleset-pill ruleset-2014" style="border-color: #2e7d32; color: #2e7d32; background: rgba(46, 125, 50, 0.08);">Fair Game</span>'
                : '<span class="ruleset-pill ruleset-2024" style="border-color: #7a1b1b; color: #7a1b1b; background: rgba(122, 27, 27, 0.08);">Full DM Only</span>';

            html += `
                <tr class="ac-row-clickable ${isCollapsed ? 'is-collapsed' : ''}" 
                    data-id="${item.id}" 
                    data-category-child="${esc(group.name)}"
                    tabindex="0"
                    role="button">
                    <td class="col-name">
                        <strong>${esc(item.name)}</strong>
                    </td>
                    <td class="col-permission" style="text-align: center;">
                        ${permBadge}
                    </td>
                    <td class="col-source" style="text-align: center;">
                        ${renderSourceBadges(item.source)}
                    </td>
                    <td class="col-desc">
                        ${formatExpandableText(item.description || '—', 140)}
                    </td>
                    <td class="col-notes hide-tablet">
                        ${formatExpandableText(item.notes_advice || '—', 140)}
                    </td>
                    ${isAdmin ? `
                        <td class="col-actions" style="text-align: center;">
                            <button type="button" class="ac-btn-admin ac-btn-sm btn-edit-property" data-id="${item.id}" title="Edit Property">✏️</button>
                            <button type="button" class="ac-btn-admin ac-btn-sm ac-btn-delete btn-del-property" data-id="${item.id}" title="Delete Property">🗑️</button>
                        </td>
                    ` : ''}
                </tr>
            `;
        });
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    return html;
}

/**
 * Sets up toolbar control listeners (select dropdowns, toggle all button).
 */
function setupControls() {
    const typeSelect = document.getElementById('ac-item-properties-type-filter');
    const catSelect = document.getElementById('ac-item-properties-category-filter');
    const srcSelect = document.getElementById('ac-item-properties-source-filter');
    const toggleBtn = document.getElementById('ac-item-properties-toggle-all-btn');

    if (typeSelect) {
        typeSelect.onchange = (e) => {
            selectedTypeFilter = e.target.value;
            applyFilters();
            updateTableOnly();
        };
    }

    if (catSelect) {
        catSelect.onchange = (e) => {
            selectedCategoryFilter = e.target.value;
            applyFilters();
            updateTableOnly();
        };
    }

    if (srcSelect) {
        srcSelect.onchange = (e) => {
            selectedSourceFilter = e.target.value;
            applyFilters();
            updateTableOnly();
        };
    }

    if (toggleBtn) {
        toggleBtn.onclick = () => {
            toggleAllCategories();
        };
    }
}

/**
 * Toggles all accordion sections between expanded and collapsed.
 */
function toggleAllCategories() {
    const groups = groupItemPropertiesByType(filteredItemProperties);
    const totalGroups = groups.length;
    const allAreCollapsed = groups.every(g => collapsedCategories.has(g.name));

    if (allAreCollapsed) {
        collapsedCategories.clear();
    } else {
        groups.forEach(g => collapsedCategories.add(g.name));
    }

    updateTableOnly();
}

/**
 * Synchronizes the Toggle All button label.
 */
function updateToggleAllBtn() {
    const toggleBtn = document.getElementById('ac-item-properties-toggle-all-btn');
    if (!toggleBtn) return;

    const groups = groupItemPropertiesByType(filteredItemProperties);
    if (groups.length === 0) {
        toggleBtn.textContent = 'Collapse All ▲';
        return;
    }

    const allAreCollapsed = groups.every(g => collapsedCategories.has(g.name));
    toggleBtn.textContent = allAreCollapsed ? 'Expand All ▼' : 'Collapse All ▲';
}

/**
 * Toggles the collapsed state for a single group.
 * 
 * @param {string} categoryName
 * @param {HTMLElement} [groupHeader]
 */
function toggleCategoryAccordion(categoryName, groupHeader = null) {
    if (collapsedCategories.has(categoryName)) {
        collapsedCategories.delete(categoryName);
    } else {
        collapsedCategories.add(categoryName);
    }

    const isNowCollapsed = collapsedCategories.has(categoryName);
    const table = document.getElementById('item-properties-table');
    if (!table) return;

    const header = groupHeader || Array.from(table.querySelectorAll('.ac-table-group-header')).find(h => h.dataset.category === categoryName);
    if (header) {
        header.setAttribute('aria-expanded', isNowCollapsed ? 'false' : 'true');
        header.title = isNowCollapsed ? 'Expand section' : 'Collapse section';
        const chevron = header.querySelector('.ac-group-chevron');
        if (chevron) chevron.textContent = isNowCollapsed ? '▶' : '▼';
    }

    const notesRow = Array.from(table.querySelectorAll('.ac-table-group-notes')).find(r => r.dataset.categoryNotes === categoryName);
    if (notesRow) {
        notesRow.classList.toggle('is-collapsed', isNowCollapsed);
        notesRow.style.display = isNowCollapsed ? 'none' : '';
    }

    const childRows = Array.from(table.querySelectorAll('tr.ac-row-clickable')).filter(r => r.dataset.categoryChild === categoryName);
    childRows.forEach(row => {
        row.classList.toggle('is-collapsed', isNowCollapsed);
        row.style.display = isNowCollapsed ? 'none' : '';
    });

    updateToggleAllBtn();
}

/**
 * Sets up delegated event listeners on the table container.
 */
function setupTableInteractions() {
    const container = document.getElementById('item-properties-table-container');
    if (!container) return;

    container.addEventListener('click', (e) => {
        // 1. Group Header Click
        const groupHeader = e.target.closest('.ac-table-group-header');
        if (groupHeader) {
            const catName = groupHeader.dataset.category;
            if (catName) toggleCategoryAccordion(catName);
            return;
        }

        // 2. Edit Action Click
        const editBtn = e.target.closest('.btn-edit-property');
        if (editBtn) {
            e.stopPropagation();
            const id = editBtn.dataset.id;
            const item = allItemProperties.find(i => i.id === id);
            if (item) openItemPropertyForm(item);
            return;
        }

        // 3. Delete Action Click
        const delBtn = e.target.closest('.btn-del-property');
        if (delBtn) {
            e.stopPropagation();
            const id = delBtn.dataset.id;
            const item = allItemProperties.find(i => i.id === id);
            if (item) confirmAndDeleteItemProperty(item);
            return;
        }

        // 4. Row Click -> Detail Modal
        const row = e.target.closest('.ac-row-clickable');
        if (row && !e.target.closest('a') && !e.target.closest('button')) {
            const id = row.dataset.id;
            const item = allItemProperties.find(i => i.id === id);
            if (item) showItemPropertyDetail(item);
        }
    });

    // Keyboard support for Accordion headers and rows
    container.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            const groupHeader = e.target.closest('.ac-table-group-header');
            if (groupHeader) {
                e.preventDefault();
                const catName = groupHeader.dataset.category;
                if (catName) toggleCategoryAccordion(catName);
                return;
            }

            const row = e.target.closest('.ac-row-clickable');
            if (row && !e.target.closest('a') && !e.target.closest('button')) {
                e.preventDefault();
                const id = row.dataset.id;
                const item = allItemProperties.find(i => i.id === id);
                if (item) showItemPropertyDetail(item);
            }
        }
    });

    attachExpandableTextListeners(container);
}

/**
 * Renders the detail view modal for a single Item Property.
 * Note: Following Guild design patterns, internal check_id and display_order are omitted from public view.
 * 
 * @param {Object} item - Item property record
 */
export function showItemPropertyDetail(item) {
    const isAdmin = getAdminMode();
    const isFairGame = item.category_sub === 'Fair Game';
    const permBadge = isFairGame
        ? '<span class="ruleset-pill ruleset-2014" style="border-color: #2e7d32; color: #2e7d32; background: rgba(46, 125, 50, 0.08);">Fair Game</span>'
        : '<span class="ruleset-pill ruleset-2024" style="border-color: #7a1b1b; color: #7a1b1b; background: rgba(122, 27, 27, 0.08);">Full DM Only</span>';

    const html = `
        <div class="ac-detail-header">
            <div class="ac-detail-title-group">
                <span class="ac-detail-badge">${esc(item.type || 'Item Property')}</span>
                <h2 class="ac-detail-title">${esc(item.name)}</h2>
            </div>
            ${isAdmin ? `
                <div class="ac-detail-admin-actions">
                    <button type="button" class="ac-btn-admin ac-btn-primary" id="modal-btn-edit-property">✏️ Edit</button>
                    <button type="button" class="ac-btn-admin ac-btn-delete" id="modal-btn-del-property">🗑️ Delete</button>
                </div>
            ` : ''}
        </div>

        <div class="ac-detail-meta-grid" style="grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); margin-bottom: 1.5rem;">
            <div class="ac-meta-item">
                <span class="ac-meta-label">Type</span>
                <span class="ac-meta-value"><strong>${esc(item.type || '—')}</strong></span>
            </div>
            <div class="ac-meta-item">
                <span class="ac-meta-label">Usage</span>
                <span class="ac-meta-value">${permBadge}</span>
            </div>
            <div class="ac-meta-item">
                <span class="ac-meta-label">Sources</span>
                <span class="ac-meta-value">${renderSourceBadges(item.source)}</span>
            </div>
        </div>

        ${item.description ? `
            <div class="ac-detail-section">
                <h3>Description</h3>
                <div class="ac-detail-text">
                    ${renderMarkdownLinks(item.description)}
                </div>
            </div>
        ` : ''}

        ${item.notes_advice ? `
            <div class="ac-detail-section">
                <h3>Notes & Rage Advice</h3>
                <div class="ac-detail-text">
                    ${renderMarkdownLinks(item.notes_advice)}
                </div>
            </div>
        ` : ''}
    `;

    openModal(html);

    if (isAdmin) {
        document.getElementById('modal-btn-edit-property')?.addEventListener('click', () => {
            closeModal();
            openItemPropertyForm(item);
        });
        document.getElementById('modal-btn-del-property')?.addEventListener('click', () => {
            confirmAndDeleteItemProperty(item);
        });
    }
}

/**
 * Opens staff administrative add/edit form modal.
 * 
 * @param {Object|null} [item=null] - Item property to edit, or null to create new
 */
export async function openItemPropertyForm(item = null) {
    const isEdit = !!item;
    const defaultOrder = isEdit ? item.display_order : getNextDisplayOrder(allItemProperties, 10.0);
    let selectedSources = item?.source ? (Array.isArray(item.source) ? [...item.source] : [item.source]) : ['DMG2024'];

    const typesList = (propertyLookups.types && propertyLookups.types.length > 0)
        ? propertyLookups.types.map(t => t.name)
        : (availableTypes.length > 0 ? availableTypes : ['Creator', 'History', 'Minor Property', 'Quirk', 'Sentient Magic Item Property']);

    const permissionsList = (propertyLookups.permissions && propertyLookups.permissions.length > 0)
        ? propertyLookups.permissions
        : [
            { name: 'Fair Game', label: 'Fair Game (Any DM)' },
            { name: 'Full DM Only', label: 'Full DM Only' }
        ];

    const html = `
        <div class="ac-detail-header">
            <h2>${isEdit ? `Edit Item Property: ${esc(item.name)}` : 'Add New Item Property'}</h2>
        </div>
        <form id="ac-item-property-form" class="ac-edit-form">
            <div class="ac-form-grid" style="grid-template-columns: 1fr 1fr;">
                <div class="ac-form-group">
                    <label for="form-prop-name">Name *</label>
                    <input type="text" id="form-prop-name" required value="${esc(item?.name || '')}" class="ac-form-input">
                </div>
                <div class="ac-form-group">
                    <label for="form-prop-type">Property Type *</label>
                    <select id="form-prop-type" class="ac-form-select" required>
                        ${typesList.map(t => `
                            <option value="${esc(t)}" ${item?.type === t ? 'selected' : ''}>${esc(t)}</option>
                        `).join('')}
                    </select>
                </div>
            </div>

            <div class="ac-form-grid" style="grid-template-columns: 1fr 1fr;">
                <div class="ac-form-group">
                    <label for="form-prop-category">Usage Category *</label>
                    <select id="form-prop-category" class="ac-form-select" required>
                        ${permissionsList.map(p => `
                            <option value="${esc(p.name)}" ${(item?.category_sub === p.name || (!isEdit && p.name === permissionsList[0].name)) ? 'selected' : ''}>${esc(p.label || p.name)}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="ac-form-group">
                    <label for="form-prop-order">Display Order *</label>
                    <input type="number" step="any" id="form-prop-order" required value="${defaultOrder}" class="ac-form-input">
                </div>
            </div>

            <div class="ac-form-group">
                <label>Sources *</label>
                <div id="form-source-picker-container"></div>
            </div>

            <div class="ac-form-group">
                <label for="form-prop-desc">Description</label>
                <textarea id="form-prop-desc" rows="3" class="ac-form-textarea">${esc(item?.description || '')}</textarea>
            </div>

            <div class="ac-form-group">
                <label for="form-prop-notes">Notes & Rage Advice</label>
                <textarea id="form-prop-notes" rows="4" class="ac-form-textarea">${esc(item?.notes_advice || '')}</textarea>
            </div>

            <div class="ac-form-actions">
                <button type="button" class="ac-btn-admin ac-btn-secondary" id="form-prop-cancel">Cancel</button>
                <button type="submit" class="ac-btn-admin ac-btn-primary" id="form-prop-submit">Save Property</button>
            </div>
        </form>
    `;

    openModal(html);

    // Initialize source tag picker
    const pickerContainer = document.getElementById('form-source-picker-container');
    if (pickerContainer) {
        renderSourceTagPicker({
            containerEl: pickerContainer,
            selectedKeys: selectedSources,
            availableKeys: availableSourceKeys.length > 0 ? availableSourceKeys : ['DMG2014', 'DMG2024', 'HHB'],
            onChange: (updatedKeys) => { selectedSources = updatedKeys; }
        });
    }

    document.getElementById('form-prop-cancel').onclick = closeModal;

    const form = document.getElementById('ac-item-property-form');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('form-prop-submit');
        submitBtn.disabled = true;

        const propType = document.getElementById('form-prop-type').value.trim();
        const typeCatMap = {
            'Creator': 'Magic Item Special Features - Creator',
            'History': 'Magic Item Special Features - History',
            'Minor Property': 'Magic Item Special Features - Minor Property',
            'Quirk': 'Magic Item Special Features - Quirk',
            'Sentient Magic Item Property': 'Sentient Magic Items'
        };

        let matchingCat = allCategories.find(c => c.name === typeCatMap[propType]);
        if (!matchingCat) {
            matchingCat = allCategories.find(c => c.name.toLowerCase().includes(propType.toLowerCase()));
        }
        const catId = matchingCat ? matchingCat.id : (allCategories[0]?.id || null);

        const payload = {
            name: document.getElementById('form-prop-name').value.trim(),
            type: propType,
            category_id: catId,
            category_sub: document.getElementById('form-prop-category').value.trim(),
            source: selectedSources.length > 0 ? selectedSources : ['HHB'],
            display_order: cleanFloat(parseFloat(document.getElementById('form-prop-order').value) || defaultOrder),
            description: document.getElementById('form-prop-desc').value.trim() || null,
            notes_advice: document.getElementById('form-prop-notes').value.trim() || null
        };

        // If creating new, assign next check_id (ITP_XXXX)
        if (!isEdit) {
            const nextNum = allItemProperties.reduce((max, i) => {
                if (i.check_id && i.check_id.startsWith('ITP_')) {
                    const n = parseInt(i.check_id.slice(4), 10);
                    return n > max ? n : max;
                }
                return max;
            }, 0) + 1;
            payload.check_id = `ITP_${String(nextNum).padStart(4, '0')}`;
        }

        try {
            if (isEdit) {
                const { error } = await updateItemProperty(item.id, payload);
                if (error) throw error;
                showToast('Item Property updated successfully!');
            } else {
                const { error } = await createItemProperty(payload);
                if (error) throw error;
                showToast('Item Property created successfully!');
            }

            closeModal();
            await initItemProperties(true);
            window.dispatchEvent(new CustomEvent('ac:item-properties-updated'));
        } catch (err) {
            console.error('Error saving item property:', err);
            alert(`Failed to save: ${err.message || err}`);
            submitBtn.disabled = false;
        }
    };
}

/**
 * Confirms and executes item property deletion.
 * 
 * @param {Object} item - Item property to delete
 */
export async function confirmAndDeleteItemProperty(item) {
    if (!item) return;
    const confirmed = window.confirm(`Are you sure you want to delete the item property "${item.name}"?`);
    if (!confirmed) return;

    try {
        const { success, error } = await deleteItemProperty(item.id);
        if (!success) throw error || new Error('Delete operation failed');

        closeModal();
        showToast(`"${item.name}" deleted successfully!`);
        await initItemProperties(true);
        window.dispatchEvent(new CustomEvent('ac:item-properties-updated'));
    } catch (err) {
        console.error('Error deleting item property:', err);
        alert(`Failed to delete: ${err.message || err}`);
    }
}

// Global cache invalidation listener
if (typeof window !== 'undefined') {
    window.addEventListener('ac:item-properties-updated', () => {
        allItemProperties = [];
    });
    window.addEventListener('ac:open-item-properties-options', () => {
        openItemPropertiesOptionsManagerModal();
    });
}

/**
 * Opens the Options Manager modal for Item Properties.
 * Allows Admins/Engineers to configure Categories (ac_item_properties_categories table),
 * as well as Types and Permissions stored in the lookups table.
 */
export function openItemPropertiesOptionsManagerModal() {
    openGenericOptionsModal({
        title: '⚙️ Configure Item Properties Options',
        subtitle: 'Manage magic item feature categories, property types, and DM permission levels.',
        tabs: [
            {
                id: 'categories',
                label: 'Categories',
                addLabel: '+ Add Category',
                items: allCategories,
                columns: [
                    { key: 'display_order', label: 'Order', width: '70px', code: true },
                    { key: 'name', label: 'Category Name' },
                    { key: 'notes', label: 'Guidelines / Rules', snippet: 60 }
                ],
                fields: [
                    { key: 'name', label: 'Category Name', required: true },
                    { key: 'display_order', label: 'Display Order', type: 'number' },
                    { key: 'notes', label: 'Guidelines / Rules', type: 'textarea', placeholder: 'Official rulings / guidelines...' }
                ]
            },
            {
                id: 'types',
                label: 'Property Types',
                addLabel: '+ Add Property Type',
                items: propertyLookups.types || [],
                columns: [
                    { key: 'display_order', label: 'Order', width: '70px', code: true },
                    { key: 'name', label: 'Type Name' },
                    { key: 'notes', label: 'Description', snippet: 60 }
                ],
                fields: [
                    { key: 'name', label: 'Type Name', required: true },
                    { key: 'display_order', label: 'Display Order', type: 'number' },
                    { key: 'notes', label: 'Description / Notes', type: 'textarea', placeholder: 'Special feature description...' }
                ]
            },
            {
                id: 'permissions',
                label: 'Usage Levels',
                addLabel: '+ Add Usage Level',
                items: propertyLookups.permissions || [],
                columns: [
                    { key: 'display_order', label: 'Order', width: '70px', code: true },
                    { key: 'name', label: 'Key / Value' },
                    { key: 'label', label: 'Display Label' }
                ],
                fields: [
                    { key: 'name', label: 'Key / Value', required: true },
                    { key: 'label', label: 'Display Label', required: true },
                    { key: 'display_order', label: 'Display Order', type: 'number' }
                ]
            }
        ],
        onSave: async (drafts) => {
            // 1. Categories table (ac_item_properties_categories)
            const draftCats = drafts.categories || [];
            const origCatMap = new Map(allCategories.map(c => [c.id, c]));
            const draftCatIds = new Set(draftCats.filter(c => c.id).map(c => c.id));

            for (const [id] of origCatMap.entries()) {
                if (!draftCatIds.has(id)) {
                    const { error } = await deleteItemPropertiesCategory(id);
                    if (error) throw error;
                }
            }

            for (const item of draftCats) {
                if (item.id && origCatMap.has(item.id)) {
                    const { error } = await updateItemPropertiesCategory(item.id, {
                        name: item.name,
                        display_order: item.display_order,
                        notes: item.notes || null
                    });
                    if (error) throw error;
                } else {
                    const { data, error } = await insertItemPropertiesCategory({
                        name: item.name,
                        display_order: item.display_order,
                        notes: item.notes || null
                    });
                    if (error) throw error;
                    if (data?.id) item.id = data.id;
                }
            }

            // 2. Types & Permissions in lookups
            const cleanTypes = (drafts.types || []).map(t => ({
                name: (t.name || '').trim(),
                notes: t.notes || null,
                display_order: typeof t.display_order === 'number' ? t.display_order : parseFloat(t.display_order) || 1
            })).filter(t => t.name);

            const cleanPermissions = (drafts.permissions || []).map(p => ({
                name: (p.name || '').trim(),
                label: (p.label || p.name || '').trim(),
                notes: p.notes || null,
                display_order: typeof p.display_order === 'number' ? p.display_order : parseFloat(p.display_order) || 1
            })).filter(p => p.name);

            const { error: lookupErr } = await updateLookup('item-properties', {
                types: cleanTypes,
                permissions: cleanPermissions
            });
            if (lookupErr) throw lookupErr;

            // Synchronize with shared usage across all tabs (e.g. Monsters)
            await updateSharedUsage(cleanPermissions);
            window.dispatchEvent(new CustomEvent('ac:usage-updated', { detail: { usage: cleanPermissions } }));

            await initItemProperties(true);
        }
    });
}

// Invalidate in-memory cache and re-sync when usage updates
if (typeof window !== 'undefined') {
    window.addEventListener('ac:usage-updated', () => {
        allItemProperties = [];
    });
}


