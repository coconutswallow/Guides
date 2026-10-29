/**
 * ================================================================
 * AC LOOT MODULE
 * ================================================================
 * 
 * Presentation, filtering, and administration controller for
 * Allowed Content Loot (Rolled Loot, Select Loot, Multisession Loot,
 * and Other Loot / Event Items / Decks of Many Things).
 * 
 * Responsibilities:
 * - Rendering Loot items grouped by category accordion subheaders.
 * - Displaying Level 1 category rules in accordion subheader notes.
 * - Rendering interactive Tier badges with Level 2 & Level 3 tooltip rules.
 * - Rendering Nature badges (Permanent vs Consumable) with distinct styles.
 * - Multi-criteria toolbar: Category filter, Nature filter, Tier filter, Source filter, Toggle All Accordion, live search.
 * - Interactive detail modal on row click with markdown link and source badge rendering.
 * - Staff administration workflows (Add, Edit, Delete) with multi-source tag picker and fractional order indexing.
 * 
 * @module ACLoot
 */

import { 
    getLoot, 
    getLootCategories, 
    createLoot, 
    updateLoot, 
    deleteLoot,
    insertLootCategory,
    updateLootCategory,
    deleteLootCategory,
    getTiersCached,
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
    showToast,
    initTooltips,
    createDirectLink,
    copyDirectLink,
    setModalItem,
    slugify
} from './ac-ui-utils.js';

export {
    setAdminMode,
    getAdminMode
};

// Module State
let allLoot = [];
let filteredLoot = [];
let allCategories = [];
let allTiers = [];
let availableSourceKeys = [];
let availableItemTypes = [];
let collapsedCategories = new Set();
let collapsedTiers = new Set();

// Active toolbar filters
let selectedCategoryFilter = 'ALL';   // 'ALL' | specific category name
let selectedTypeFilter = 'ALL';       // 'ALL' | specific item type
let selectedNatureFilter = 'ALL';     // 'ALL' | 'Permanent' | 'Consumable'
let selectedTierFilters = new Set(['ALL']); // Set of tier codes | Set(['ALL'])
let selectedSourceFilter = 'ALL';     // 'ALL' | specific source key
let currentSearchTerm = '';
let pendingLootTarget = null;

/**
 * Checks whether an item's type matches the selected item type filter.
 * Supports exact matching and base item type matching (e.g. "Weapon" matches "Weapon (dagger)").
 * 
 * @param {string|null} itemType 
 * @param {string} selectedType 
 * @returns {boolean}
 */
export function matchesTypeFilter(itemType, selectedType) {
    if (!selectedType || selectedType === 'ALL') return true;
    if (!itemType || !itemType.trim() || itemType === '—') return false;

    const cleanItem = itemType.trim().toLowerCase();
    const cleanSelected = selectedType.trim().toLowerCase();

    if (cleanItem === cleanSelected) return true;

    // Base type comparison (e.g. "Weapon" matches "Weapon (dagger)", "Armor" matches "Armor (shield)")
    const baseItem = cleanItem.split('(')[0].trim();
    const baseSelected = cleanSelected.split('(')[0].trim();

    if (baseItem === cleanSelected || baseItem === baseSelected) return true;

    return false;
}

/**
 * Checks whether a loot item matches the active multi-select tier filter.
 * 
 * @param {Object} item 
 * @param {Set<string>} selectedSet 
 * @returns {boolean}
 */
export function matchesTierFilter(item, selectedSet) {
    if (!selectedSet || selectedSet.size === 0 || selectedSet.has('ALL')) {
        return true;
    }
    const tCode = item.tier && typeof item.tier === 'object' ? item.tier.code : (typeof item.tier === 'string' ? item.tier : '');
    const tName = item.tier && typeof item.tier === 'object' ? item.tier.name : '';
    const tId = item.tier_id || (item.tier && typeof item.tier === 'object' ? item.tier.id : '');
    const tDisplay = item.tier_display || '';

    for (const filterVal of selectedSet) {
        if (!filterVal || filterVal === 'ALL') return true;
        // Check exact match with tier code or tier name or tier id
        if (tCode && tCode.toLowerCase() === filterVal.toLowerCase()) return true;
        if (tName && tName.toLowerCase() === filterVal.toLowerCase()) return true;
        if (tId && tId === filterVal) return true;

        // Check tier_display matches (e.g. filterVal 'T0' matches 'T0 Consumable', 'T2_SELECT' or 'T2 Select' matches 'T2 Select Permanent')
        if (tDisplay) {
            const lowerDisplay = tDisplay.toLowerCase();
            const lowerFilter = filterVal.toLowerCase().replace(/_/g, ' ');
            if (lowerDisplay === filterVal.toLowerCase() || lowerDisplay === lowerFilter) return true;
            if (lowerDisplay.startsWith(filterVal.toLowerCase() + ' ') || lowerDisplay.startsWith(lowerFilter + ' ')) return true;
            if (lowerDisplay.startsWith(filterVal.toLowerCase() + '(') || lowerDisplay.startsWith(lowerFilter + '(')) return true;
            if (lowerDisplay.includes(lowerFilter)) return true;
        }
    }
    return false;
}

/**
 * Sets active multi-select tier filters programmatically.
 * 
 * @param {Array<string>|string} tiers
 */
export function setSelectedTierFilters(tiers) {
    const list = Array.isArray(tiers) ? tiers : [tiers];
    selectedTierFilters = new Set(list.length > 0 ? list : ['ALL']);
    updateTierPillsUI();
    applyFilters();
    updateTableOnly();
}

/**
 * Retrieves the currently selected tier filter codes.
 * 
 * @returns {Array<string>}
 */
export function getSelectedTierFilters() {
    return Array.from(selectedTierFilters);
}

/**
 * Sets active item type filter programmatically.
 * 
 * @param {string} type 
 */
export function setSelectedTypeFilter(type) {
    selectedTypeFilter = type || 'ALL';
    const typeSelect = document.getElementById('loot-type-filter');
    if (typeSelect) typeSelect.value = selectedTypeFilter;
    applyFilters();
    updateTableOnly();
}

/**
 * Retrieves the currently selected item type filter.
 * 
 * @returns {string}
 */
export function getSelectedTypeFilter() {
    return selectedTypeFilter;
}

/**
 * Retrieves list of available item types discovered in loot items.
 * 
 * @returns {Array<string>}
 */
export function getAvailableItemTypes() {
    return [...availableItemTypes];
}

/**
 * Builds tooltip text for Loot tier badges (incorporates Level 2 & Level 3 rules).
 * 
 * @param {Object} item 
 * @returns {string} Plaintext tooltip
 */
export function formatLootTierTooltip(item) {
    const tier = item.tier;
    if (!tier) {
        return item.tier_display || 'Standard Tier';
    }

    const lines = [];
    lines.push(`Tier: ${tier.name || tier.code} (${tier.tier_group || 'General'})`);
    if (tier.min_apl) lines.push(`Minimum APL: ${tier.min_apl}+`);
    if (tier.dm_requirement && tier.dm_requirement !== 'Any DM') lines.push(`Authority: ${tier.dm_requirement}`);
    if (tier.loot_tier_rules) lines.push(`Loot Rules: ${tier.loot_tier_rules}`);
    
    // Level 3 Scope depending on nature
    if (item.nature === 'Permanent' && tier.permanent_rules) {
        lines.push(`Permanent Rule: ${tier.permanent_rules}`);
    } else if (item.nature === 'Consumable' && tier.consumable_rules) {
        lines.push(`Consumable Rule: ${tier.consumable_rules}`);
    } else {
        if (tier.permanent_rules) lines.push(`Permanent: ${tier.permanent_rules}`);
        if (tier.consumable_rules) lines.push(`Consumable: ${tier.consumable_rules}`);
    }

    if (item.is_dm_select) lines.push(`• DM Select: Requires permission or collaboration by creator DM.`);
    if (item.event_category) lines.push(`• Event: Acquirable only during ${item.event_category}.`);

    return lines.join('\n');
}

/**
 * Initializes the Loot view.
 * 
 * @param {boolean} [forceRefresh=false]
 */
export async function initLoot(forceRefresh = false) {
    const container = document.getElementById('ac-view-loot');
    if (!container) return;

    if (forceRefresh) {
        selectedCategoryFilter = 'ALL';
        selectedTypeFilter = 'ALL';
        selectedNatureFilter = 'ALL';
        selectedTierFilters.clear();
        selectedTierFilters.add('ALL');
        selectedSourceFilter = 'ALL';
        currentSearchTerm = '';
        collapsedCategories.clear();
        collapsedTiers.clear();
        allLoot = [];
        availableItemTypes = [];
    } else if (allLoot.length > 0) {
        applyFilters();
        updateTableOnly();
        return;
    }

    container.innerHTML = `
        <div class="ac-loading">
            <div class="spinner"></div>
            <span>Cataloging Loot & Magic Items...</span>
        </div>
    `;

    try {
        const [lootData, categoriesData, tiersData, sourcesData] = await Promise.all([
            getLoot(),
            getLootCategories(),
            getTiersCached().catch(() => []),
            getSourcesCached().catch(() => [])
        ]);

        allLoot = sortByDisplayOrder(lootData || []);
        allCategories = sortByDisplayOrder(categoriesData || []);
        allTiers = sortByDisplayOrder(tiersData || []);

        if (allTiers.length === 0 && allLoot.length > 0) {
            const foundTierCodes = new Set();
            allLoot.forEach(item => {
                const code = item.tier?.code || (item.tier_display ? item.tier_display.split(' ')[0] : null);
                if (code) foundTierCodes.add(code);
            });
            allTiers = Array.from(foundTierCodes).sort().map(code => ({ code, name: code, display_order: 100 }));
        }

        const foundSources = new Set();
        allLoot.forEach(item => {
            if (Array.isArray(item.source)) {
                item.source.forEach(s => s && foundSources.add(s));
            } else if (typeof item.source === 'string' && item.source) {
                foundSources.add(item.source);
            }
        });
        availableSourceKeys = Array.from(foundSources).sort();

        // Extract available item types
        const typeSet = new Map();
        allLoot.forEach(item => {
            if (!item.type || typeof item.type !== 'string') return;
            const raw = item.type.trim();
            if (!raw || raw === '—') return;
            const base = raw.split('(')[0].trim();
            if (!base) return;
            const titleCased = base.charAt(0).toUpperCase() + base.slice(1);
            const key = titleCased.toLowerCase();
            if (!typeSet.has(key)) {
                typeSet.set(key, titleCased);
            }
        });
        availableItemTypes = Array.from(typeSet.values()).sort((a, b) => a.localeCompare(b));

        renderShell(container);
        applyFilters();
        updateTableOnly();

        if (pendingLootTarget) {
            const target = pendingLootTarget;
            pendingLootTarget = null;
            highlightLootItem(target);
        }
    } catch (err) {
        console.error('Failed to initialize Loot view:', err);
        container.innerHTML = `
            <div class="ac-error">
                <p>Failed to load Loot: ${esc(err.message)}</p>
                <button class="ac-btn-admin ac-btn-primary" onclick="window.location.reload()">Retry</button>
            </div>
        `;
    }
}

/**
 * Renders the persistent shell, toolbar, and table container.
 * 
 * @param {HTMLElement} container 
 */
function renderShell(container) {
    const isAdmin = getAdminMode();
    const isAllTiers = selectedTierFilters.size === 0 || selectedTierFilters.has('ALL');

    container.innerHTML = `
        <div class="ac-loot-container">
            <!-- Toolbar: Filters and Stats -->
            <div class="ac-loot-toolbar ac-classes-toolbar">
                <div class="ac-loot-toolbar-main">
                    <div class="ac-loot-stats ac-classes-stats" id="loot-stats">
                        Showing <strong>${filteredLoot.length}</strong> ${filteredLoot.length === 1 ? 'Item' : 'Items'}
                    </div>

                    <div class="ac-loot-controls ac-classes-controls">
                        <!-- Category Dropdown -->
                        <select id="loot-category-filter" class="ac-filter-select" title="Filter by Category" aria-label="Filter by Category">
                            <option value="ALL">All Categories (${allLoot.length})</option>
                            ${allCategories.map(cat => {
                                const count = allLoot.filter(l => l.category_id === cat.id || (l.category && l.category.name === cat.name)).length;
                                return `<option value="${esc(cat.name)}" ${selectedCategoryFilter === cat.name ? 'selected' : ''}>${esc(cat.name)} (${count})</option>`;
                            }).join('')}
                        </select>

                        <!-- Item Type Dropdown -->
                        <select id="loot-type-filter" class="ac-filter-select" title="Filter by Item Type" aria-label="Filter by Item Type">
                            <option value="ALL">All Item Types (${availableItemTypes.length})</option>
                            ${availableItemTypes.map(type => {
                                const count = allLoot.filter(l => matchesTypeFilter(l.type, type)).length;
                                return `<option value="${esc(type)}" ${selectedTypeFilter === type ? 'selected' : ''}>${esc(type)} (${count})</option>`;
                            }).join('')}
                        </select>

                        <!-- Nature Dropdown -->
                        <select id="loot-nature-filter" class="ac-filter-select" title="Filter by Nature" aria-label="Filter by Nature">
                            <option value="ALL">All Natures</option>
                            <option value="Permanent" ${selectedNatureFilter === 'Permanent' ? 'selected' : ''}>Permanent</option>
                            <option value="Consumable" ${selectedNatureFilter === 'Consumable' ? 'selected' : ''}>Consumable</option>
                        </select>

                        <!-- Sourcebook Dropdown -->
                        <select id="loot-source-filter" class="ac-filter-select" title="Filter by Sourcebook" aria-label="Filter by Sourcebook">
                            <option value="ALL">All Sources (${availableSourceKeys.length})</option>
                            ${availableSourceKeys.map(src => `<option value="${esc(src)}" ${selectedSourceFilter === src ? 'selected' : ''}>${esc(src)}</option>`).join('')}
                        </select>

                        <!-- Toggle All Button -->
                        <button type="button" id="btn-toggle-all-loot-accordion" class="ac-btn-toggle-all" title="Toggle expanding or collapsing all categories">
                            Collapse All ▲
                        </button>

                        ${isAdmin ? `
                            <button type="button" class="ac-btn-admin ac-btn-primary" id="btn-add-loot-inline">
                                + Add Loot
                            </button>
                            <button type="button" class="ac-btn-admin ac-btn-secondary" id="btn-manage-loot-categories-inline">
                                ⚙️ Configure Categories
                            </button>
                        ` : ''}
                    </div>
                </div>

                <!-- Tier Multi-Select Filter Row -->
                <div class="ac-loot-tier-filter-row" id="loot-tier-filter-row">
                    <span class="ac-tier-filter-label">Tiers:</span>
                    <div class="ac-tier-pills-container" id="loot-tier-pills">
                        <button type="button" 
                                class="ac-tier-pill-btn ${isAllTiers ? 'active' : ''}" 
                                data-tier="ALL"
                                aria-pressed="${isAllTiers ? 'true' : 'false'}"
                                title="Show all tiers">
                            All
                        </button>
                        ${allTiers.map(t => {
                            const isSelected = !isAllTiers && selectedTierFilters.has(t.code);
                            return `
                                <button type="button" 
                                        class="ac-tier-pill-btn ${isSelected ? 'active' : ''}" 
                                        data-tier="${esc(t.code)}"
                                        aria-pressed="${isSelected ? 'true' : 'false'}"
                                        title="Filter by Tier ${esc(t.name)}">
                                    ${esc(t.name)}
                                </button>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>

            <div class="ac-table-responsive" id="loot-table-container">
                <table class="ac-table" id="loot-table">
                    <thead>
                        <tr>
                            <th class="col-name">Name</th>
                            <th class="col-type">Type</th>
                            <th class="col-tier">Tier</th>
                            <th class="col-source">Source</th>
                            <th class="col-desc">Description</th>
                            <th class="col-notes">Notes / Rage Advice</th>
                            ${isAdmin ? '<th class="col-actions">Actions</th>' : ''}
                        </tr>
                    </thead>
                    <tbody id="loot-tbody">
                        <!-- Populated dynamically -->
                    </tbody>
                </table>
            </div>
        </div>
    `;

    attachToolbarListeners(container);
}

/**
 * Attaches event listeners to toolbar controls.
 * 
 * @param {HTMLElement} container 
 */
function attachToolbarListeners(container) {
    const categorySelect = container.querySelector('#loot-category-filter');
    if (categorySelect) {
        categorySelect.addEventListener('change', (e) => {
            selectedCategoryFilter = e.target.value;
            applyFilters();
            updateTableOnly();
        });
    }

    const typeSelect = container.querySelector('#loot-type-filter');
    if (typeSelect) {
        typeSelect.addEventListener('change', (e) => {
            selectedTypeFilter = e.target.value;
            applyFilters();
            updateTableOnly();
        });
    }

    const natureSelect = container.querySelector('#loot-nature-filter');
    if (natureSelect) {
        natureSelect.addEventListener('change', (e) => {
            selectedNatureFilter = e.target.value;
            applyFilters();
            updateTableOnly();
        });
    }

    const pillsContainer = container.querySelector('#loot-tier-pills');
    if (pillsContainer) {
        pillsContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.ac-tier-pill-btn');
            if (!btn) return;

            const tierCode = btn.dataset.tier;
            if (!tierCode) return;

            if (tierCode === 'ALL') {
                selectedTierFilters.clear();
                selectedTierFilters.add('ALL');
            } else {
                selectedTierFilters.delete('ALL');
                if (selectedTierFilters.has(tierCode)) {
                    selectedTierFilters.delete(tierCode);
                    if (selectedTierFilters.size === 0) {
                        selectedTierFilters.add('ALL');
                    }
                } else {
                    selectedTierFilters.add(tierCode);
                }
            }

            updateTierPillsUI();
            applyFilters();
            updateTableOnly();
        });
    }

    const sourceSelect = container.querySelector('#loot-source-filter');
    if (sourceSelect) {
        sourceSelect.addEventListener('change', (e) => {
            selectedSourceFilter = e.target.value;
            applyFilters();
            updateTableOnly();
        });
    }

    const toggleAllBtn = container.querySelector('#btn-toggle-all-loot-accordion');
    if (toggleAllBtn) {
        toggleAllBtn.addEventListener('click', () => {
            if (collapsedCategories.size === allCategories.length) {
                collapsedCategories.clear();
            } else {
                allCategories.forEach(c => collapsedCategories.add(c.id));
            }
            updateTableOnly();
        });
    }

    const addBtn = container.querySelector('#btn-add-loot-inline');
    if (addBtn) {
        addBtn.addEventListener('click', () => openLootForm());
    }

    const manageCatBtn = container.querySelector('#btn-manage-loot-categories-inline');
    if (manageCatBtn) {
        manageCatBtn.addEventListener('click', () => openLootOptionsModal());
    }
}

/**
 * Synchronizes the active visual state of the Tier multi-select pills.
 */
function updateTierPillsUI() {
    const pillsContainer = document.getElementById('loot-tier-pills');
    if (!pillsContainer) return;

    const isAll = selectedTierFilters.size === 0 || selectedTierFilters.has('ALL');

    pillsContainer.querySelectorAll('.ac-tier-pill-btn').forEach(btn => {
        const tierCode = btn.dataset.tier;
        if (tierCode === 'ALL') {
            btn.classList.toggle('active', isAll);
            btn.setAttribute('aria-pressed', isAll ? 'true' : 'false');
        } else {
            const isActive = !isAll && selectedTierFilters.has(tierCode);
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        }
    });
}

/**
 * Updates the text and icon of the Toggle All button based on current state.
 */
function updateToggleAllBtn() {
    const btn = document.getElementById('btn-toggle-all-loot-accordion');
    if (!btn) return;

    const allAreCollapsed = allCategories.length > 0 && allCategories.every(c => collapsedCategories.has(c.id));
    if (allAreCollapsed) {
        btn.textContent = 'Expand All ▼';
        btn.title = 'Expand all categories';
    } else {
        btn.textContent = 'Collapse All ▲';
        btn.title = 'Collapse all categories';
    }
}

/**
 * Applies active category, type, nature, tier, source, and search filters.
 */
function applyFilters() {
    const term = currentSearchTerm.toLowerCase().trim();

    filteredLoot = allLoot.filter(item => {
        // Category filter
        if (selectedCategoryFilter !== 'ALL') {
            const catName = item.category ? item.category.name : '';
            if (catName !== selectedCategoryFilter) return false;
        }

        // Item Type filter
        if (selectedTypeFilter !== 'ALL') {
            if (!matchesTypeFilter(item.type, selectedTypeFilter)) return false;
        }

        // Nature filter
        if (selectedNatureFilter !== 'ALL') {
            if (item.nature !== selectedNatureFilter) return false;
        }

        // Tier filter (multi-select)
        if (selectedTierFilters.size > 0 && !selectedTierFilters.has('ALL')) {
            if (!matchesTierFilter(item, selectedTierFilters)) return false;
        }

        // Source filter
        if (selectedSourceFilter !== 'ALL') {
            const sources = Array.isArray(item.source) ? item.source : [item.source];
            if (!sources.includes(selectedSourceFilter)) return false;
        }

        // Search term
        if (term) {
            const name = (item.name || '').toLowerCase();
            const type = (item.type || '').toLowerCase();
            const nature = (item.nature || '').toLowerCase();
            const tierDisplay = (item.tier_display || '').toLowerCase();
            const desc = (item.description || '').toLowerCase();
            const notes = (item.notes_advice || '').toLowerCase();
            const sources = (Array.isArray(item.source) ? item.source.join(' ') : String(item.source || '')).toLowerCase();

            if (!name.includes(term) && 
                !type.includes(term) && 
                !nature.includes(term) && 
                !tierDisplay.includes(term) && 
                !desc.includes(term) && 
                !notes.includes(term) && 
                !sources.includes(term)) {
                return false;
            }
        }

        return true;
    });
}

/**
 * Filters Loot by global search query.
 * 
 * @param {string} term 
 */
export function filterLoot(term) {
    currentSearchTerm = term || '';
    applyFilters();
    updateTableOnly();
}

/**
 * Groups filtered loot by category, preserving canonical display_order.
 * 
 * @param {Array} items
 * @returns {Array<Object>} Category groups
 */
function groupLootByCategory(items) {
    const catMap = new Map();
    allCategories.forEach(cat => {
        catMap.set(cat.id, {
            category: cat,
            items: []
        });
    });

    items.forEach(item => {
        const catId = item.category_id || (item.category ? item.category.id : null);
        if (catMap.has(catId)) {
            catMap.get(catId).items.push(item);
        } else {
            const fallbackKey = 'other';
            if (!catMap.has(fallbackKey)) {
                catMap.set(fallbackKey, {
                    category: { id: fallbackKey, name: 'Other', notes: '', display_order: 999 },
                    items: []
                });
            }
            catMap.get(fallbackKey).items.push(item);
        }
    });

    const result = [];
    catMap.forEach(({ category, items: catItems }) => {
        if (catItems.length === 0 && selectedCategoryFilter !== 'ALL') return;
        if (catItems.length === 0) return;

        result.push({
            category,
            items: catItems
        });
    });

    return result;
}

/**
 * Formats a loot item description for tabular display:
 * - If the text contains "See book for description.", displays that text.
 * - If the text has any other description, shows the text before "Base Cost".
 * 
 * @param {string|null} text - Raw description text
 * @returns {string} Formatted HTML snippet
 */
export function formatLootTableDescription(text) {
    if (!text || !text.trim() || text === '—') {
        return '<span style="opacity: 0.5;">—</span>';
    }

    let displayText;
    if (text.includes('See book for description.')) {
        displayText = 'See book for description.';
    } else {
        const baseCostIdx = text.search(/Base Cost/i);
        if (baseCostIdx !== -1) {
            const before = text.slice(0, baseCostIdx).trim();
            displayText = before || text.trim();
        } else {
            displayText = text.trim();
        }
    }

    return formatExpandableText(displayText, 160);
}

/**
 * Helper to render a Loot row with Tier column restored.
 */
function renderLootRowHtml(item, isAdmin) {
    const tierTooltip = formatLootTierTooltip(item);
    const descFormatted = formatLootTableDescription(item.description);
    const notesFormatted = formatExpandableText(item.notes_advice || item.notes, 120);

    return `
        <tr class="ac-row-clickable" data-loot-id="${esc(item.id)}" data-check-id="${esc(item.check_id || '')}" id="loot-${esc(item.check_id || item.id)}">
            <td class="col-name">
                <div class="ac-item-name-cell">
                    <strong>${esc(item.name)}</strong>
                    <button type="button" 
                            class="ac-btn-copy-link" 
                            data-loot-id="${esc(item.id)}" 
                            data-check-id="${esc(item.check_id || '')}"
                            data-item-id="${esc(slugify(item.name) || item.id)}"
                            title="Copy direct link to ${esc(item.name)}" 
                            aria-label="Copy direct link to ${esc(item.name)}">
                        🔗
                    </button>
                </div>
            </td>
            <td class="col-type">
                <span class="ac-badge-type">${esc(item.type || '—')}</span>
                ${item.is_dm_select ? `<span class="ac-badge-dm-select">DM Select</span>` : ''}
            </td>
            <td class="col-tier">
                <span class="ac-badge-tier" data-tooltip="${esc(tierTooltip)}" title="${esc(tierTooltip)}">
                    ${esc(item.tier_display || (item.tier ? item.tier.name : '—'))}
                </span>
            </td>
            <td class="col-source">
                ${renderSourceBadges(item.source)}
            </td>
            <td class="col-desc">
                ${descFormatted}
            </td>
            <td class="col-notes">
                ${notesFormatted}
            </td>
            ${isAdmin ? `
                <td class="col-actions" style="text-align: center;" onclick="event.stopPropagation()">
                    <button type="button" class="ac-btn-admin ac-btn-sm btn-edit-loot" data-loot-id="${esc(item.id)}" title="Edit Loot">✏️</button>
                    <button type="button" class="ac-btn-admin ac-btn-sm ac-btn-delete btn-delete-loot" data-loot-id="${esc(item.id)}" title="Delete Loot">🗑️</button>
                </td>
            ` : ''}
        </tr>
    `;
}

/**
 * Renders the table content partitioned by Category Accordion Subheaders.
 */
function updateTableOnly() {
    const tbody = document.getElementById('loot-tbody');
    const statsContainer = document.getElementById('loot-stats');
    if (!tbody) return;

    if (statsContainer) {
        statsContainer.innerHTML = `Showing <strong>${filteredLoot.length}</strong> ${filteredLoot.length === 1 ? 'Item' : 'Items'}`;
    }

    const isAdmin = getAdminMode();
    const colSpan = isAdmin ? 7 : 6;

    if (filteredLoot.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="${colSpan}" class="ac-no-results">
                    No Loot items found matching your filter criteria.
                </td>
            </tr>
        `;
        updateToggleAllBtn();
        return;
    }

    const htmlRows = [];
    const categoryGroups = groupLootByCategory(filteredLoot);

    categoryGroups.forEach(({ category, items }) => {
        const isCatCollapsed = collapsedCategories.has(category.id);
        const catBadge = `${items.length} ${items.length === 1 ? 'Item' : 'Items'}`;

        // Level 1: Category Banner with rules embedded in notes
        htmlRows.push(`
            <tr class="ac-table-group-header ${isCatCollapsed ? 'collapsed' : ''}" data-category-id="${esc(category.id)}" role="button" aria-expanded="${!isCatCollapsed}" tabindex="0">
                <td colspan="${colSpan}">
                    <div class="ac-table-group-main">
                        <span class="accordion-chevron">${isCatCollapsed ? '▶' : '▼'}</span>
                        <span class="ac-table-group-title">${esc(category.name)}</span>
                        <span class="ac-counter-pill">${catBadge}</span>${category.notes ? `
                        <span class="ac-table-group-divider">—</span>
                        <span class="ac-table-group-notes">${renderMarkdownLinks(esc(category.notes.trim()))}</span>` : ''}
                        <span class="ac-group-hover-hint">${isCatCollapsed ? 'Expand ▼' : 'Collapse ▲'}</span>
                    </div>
                </td>
            </tr>
        `);

        if (!isCatCollapsed) {
            items.forEach(item => {
                htmlRows.push(renderLootRowHtml(item, isAdmin));
            });
        }
    });

    tbody.innerHTML = htmlRows.join('');
    attachRowListeners(tbody);
    attachExpandableTextListeners(tbody);
    initTooltips(tbody);
    updateToggleAllBtn();
}

/**
 * Attaches row-level click and administrative action listeners.
 * 
 * @param {HTMLElement} tbody 
 */
function attachRowListeners(tbody) {
    // Category Accordion toggle
    tbody.querySelectorAll('.ac-table-group-header').forEach(header => {
        header.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') return;
            const catId = header.dataset.categoryId;
            if (collapsedCategories.has(catId)) {
                collapsedCategories.delete(catId);
            } else {
                collapsedCategories.add(catId);
            }
            updateTableOnly();
        });
    });

    tbody.querySelectorAll('.ac-btn-copy-link').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const lootId = btn.dataset.lootId;
            const lootItem = allLoot.find(l => l.id === lootId);
            if (lootItem) {
                copyDirectLink('loot', lootItem);
            }
        });
    });

    tbody.querySelectorAll('.ac-row-clickable').forEach(row => {
        row.addEventListener('click', (e) => {
            if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.ac-expand-toggle')) {
                return;
            }
            const lootId = row.dataset.lootId;
            const lootItem = allLoot.find(l => l.id === lootId);
            if (lootItem) {
                showLootDetail(lootItem);
            }
        });
    });

    tbody.querySelectorAll('.btn-edit-loot').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const lootId = btn.dataset.lootId;
            const lootItem = allLoot.find(l => l.id === lootId);
            if (lootItem) {
                openLootForm(lootItem);
            }
        });
    });

    tbody.querySelectorAll('.btn-delete-loot').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const lootId = btn.dataset.lootId;
            const lootItem = allLoot.find(l => l.id === lootId);
            if (lootItem) {
                confirmAndDeleteLoot(lootItem);
            }
        });
    });
}

/**
 * Displays rich detail modal for a Loot item.
 * 
 * @param {Object} item 
 */
export function showLootDetail(item) {
    const isAdmin = getAdminMode();
    const tierTooltip = formatLootTierTooltip(item);
    const categoryName = item.category ? item.category.name : 'Other Loot';
    const categoryNotes = item.category ? item.category.notes : '';

    const natureBadgeClass = item.nature === 'Permanent' 
        ? 'ac-badge-nature-permanent' 
        : (item.nature === 'Consumable' ? 'ac-badge-nature-consumable' : 'ac-badge-type');

    const contentHtml = `
        <div class="detail-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
            <div>
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                    <span class="detail-category">${esc(categoryName)}</span>
                    ${renderSourceBadges(item.source)}
                </div>
                <h2 class="detail-title" style="margin: 0;">${esc(item.name)}</h2>
            </div>
            ${isAdmin ? `
                <div class="detail-actions" style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                    <button type="button" class="ac-btn-admin ac-btn-primary" id="btn-modal-edit-loot" title="Edit Loot">✏️ Edit</button>
                    <button type="button" class="ac-btn-admin ac-btn-delete" id="btn-modal-delete-loot" title="Delete Loot">🗑️ Delete</button>
                </div>
            ` : ''}
        </div>

        <div class="detail-grid">
            <div class="detail-item">
                <label>Tier</label>
                <value>
                    <span class="ac-badge-tier" data-tooltip="${esc(tierTooltip)}" title="${esc(tierTooltip)}">
                        ${esc(item.tier_display || (item.tier ? item.tier.name : '—'))}
                    </span>
                </value>
            </div>
            <div class="detail-item">
                <label>Nature</label>
                <value><span class="${natureBadgeClass}">${esc(item.nature || '—')}</span></value>
            </div>
            <div class="detail-item">
                <label>Type</label>
                <value><span class="ac-badge-type">${esc(item.type || '—')}</span></value>
            </div>
            <div class="detail-item">
                <label>Sources</label>
                <value>${renderSourceBadges(item.source)}</value>
            </div>
            ${item.is_dm_select ? `
                <div class="detail-item">
                    <label>Special Rule</label>
                    <value><span class="ac-badge-dm-select">DM Select</span></value>
                </div>
            ` : ''}
            ${item.event_category ? `
                <div class="detail-item">
                    <label>Event Category</label>
                    <value><span class="ac-badge-nature-consumable">${esc(item.event_category)}</span></value>
                </div>
            ` : ''}
        </div>

        <!-- Section 1: Distribution & Scope Rules (Level 1) -->
        <div class="category-notes-box" style="margin-top: 0; margin-bottom: 1.5rem;">
            <strong>Category Distribution Rules: ${esc(categoryName)}:</strong>
            <div style="margin-top: 0.5rem; line-height: 1.6;">
                ${categoryNotes ? renderMarkdownLinks(esc(categoryNotes)) : '<em>No specific category restrictions recorded.</em>'}
            </div>
        </div>

        <!-- Section 2: Tier & Permanence Rules (Level 2 & Level 3) -->
        ${item.tier ? `
            <div class="detail-section" style="margin-bottom: 1.5rem; padding: 1.25rem; background: var(--color-bg-medium); border: 1px solid var(--color-border); border-radius: 8px;">
                <h4 style="margin-top: 0; margin-bottom: 0.5rem; border-left: none; padding-left: 0; color: var(--color-primary);">
                    ⚖️ Tier & Allotment Rules (${esc(item.tier.name)})
                </h4>
                <div style="font-size: 0.92rem; line-height: 1.6;">
                    ${item.tier.loot_tier_rules ? `<p style="margin: 0.25rem 0;"><strong>Loot Rules:</strong> ${esc(item.tier.loot_tier_rules)}</p>` : ''}
                    ${(item.nature === 'Permanent' || item.nature === 'Varies' || !item.nature) && item.tier.permanent_rules ? `<p style="margin: 0.25rem 0;"><strong>Permanent Items:</strong> ${esc(item.tier.permanent_rules)}</p>` : ''}
                    ${(item.nature === 'Consumable' || item.nature === 'Varies' || !item.nature) && item.tier.consumable_rules ? `<p style="margin: 0.25rem 0;"><strong>Consumable Items:</strong> ${esc(item.tier.consumable_rules)}</p>` : ''}
                    ${item.tier.min_apl ? `<p style="margin: 0.25rem 0;"><strong>Minimum APL:</strong> ${item.tier.min_apl}+</p>` : ''}
                    ${item.tier.dm_requirement && item.tier.dm_requirement !== 'Any DM' ? `<p style="margin: 0.25rem 0;"><strong>Authorization:</strong> ${esc(item.tier.dm_requirement)}</p>` : ''}
                </div>
            </div>
        ` : ''}

        <!-- Section 3: Description & Mechanics -->
        ${item.description ? `
            <div class="detail-section">
                <h4>Description & Effects</h4>
                <div class="advice-content">
                    ${renderMarkdownLinks(item.description)}
                </div>
            </div>
        ` : ''}

        <!-- Section 4: Notes / Rage Advice -->
        <div class="detail-section">
            <h4>Notes / Rage Advice</h4>
            <div class="advice-content" style="color: var(--color-secondary);">
                ${(item.notes_advice || item.notes) ? renderMarkdownLinks(item.notes_advice || item.notes) : '<em>—</em>'}
            </div>
        </div>

        <!-- Metadata Footer (Admin only) -->
        ${isAdmin ? `
            <div style="margin-top: 1.5rem; padding-top: 0.75rem; border-top: 1px solid var(--color-border); font-size: 0.85rem; opacity: 0.7;">
                <span><strong>Display Order:</strong> ${formatDisplayOrder(item.display_order)}</span>
            </div>
        ` : ''}
    `;

    openModal(contentHtml);
    setModalItem('loot', item);

    if (isAdmin) {
        const editBtn = document.getElementById('btn-modal-edit-loot');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                closeModal();
                openLootForm(item);
            });
        }

        const deleteBtn = document.getElementById('btn-modal-delete-loot');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                closeModal();
                confirmAndDeleteLoot(item);
            });
        }
    }
}

/**
 * Highlights a specific loot item from a direct link or query identifier:
 * - Expands the category group if collapsed.
 * - Resets filters if the item is currently hidden.
 * - Smoothly scrolls the item row into view with a visual pulse highlight.
 * - Automatically opens the item's detail modal.
 * 
 * @param {string} identifier - Item check_id (e.g. 'LOT_0178'), UUID id, or item name / slug
 * @returns {Promise<boolean>} True if item was found and opened
 */
export async function highlightLootItem(identifier) {
    if (!identifier) return false;

    if (!allLoot || allLoot.length === 0) {
        pendingLootTarget = identifier;
        return true;
    }

    const cleanId = String(identifier).trim().toLowerCase();
    const item = allLoot.find(l => 
        (l.check_id && l.check_id.toLowerCase() === cleanId) ||
        (l.id && l.id.toLowerCase() === cleanId) ||
        (l.name && l.name.toLowerCase() === cleanId) ||
        (l.name && slugify(l.name) === cleanId)
    );

    if (!item) return false;

    // 1. Ensure parent category accordion is uncollapsed
    const catId = item.category_id || (item.category ? item.category.id : null);
    if (catId && collapsedCategories.has(catId)) {
        collapsedCategories.delete(catId);
    }

    // 2. Clear filters if they would hide this item
    let filtersReset = false;
    if (selectedCategoryFilter !== 'ALL' && item.category && selectedCategoryFilter !== item.category.name) {
        selectedCategoryFilter = 'ALL';
        const catSelect = document.getElementById('loot-category-filter');
        if (catSelect) catSelect.value = 'ALL';
        filtersReset = true;
    }
    if (selectedNatureFilter !== 'ALL' && selectedNatureFilter !== item.nature) {
        selectedNatureFilter = 'ALL';
        const natureSelect = document.getElementById('loot-nature-filter');
        if (natureSelect) natureSelect.value = 'ALL';
        filtersReset = true;
    }
    if (selectedTypeFilter !== 'ALL' && !matchesTypeFilter(item.type, selectedTypeFilter)) {
        selectedTypeFilter = 'ALL';
        const typeSelect = document.getElementById('loot-type-filter');
        if (typeSelect) typeSelect.value = 'ALL';
        filtersReset = true;
    }
    if (selectedTierFilters.size > 0 && !selectedTierFilters.has('ALL') && !matchesTierFilter(item, selectedTierFilters)) {
        selectedTierFilters.clear();
        selectedTierFilters.add('ALL');
        updateTierPillsUI();
        filtersReset = true;
    }
    if (selectedSourceFilter !== 'ALL') {
        selectedSourceFilter = 'ALL';
        const sourceSelect = document.getElementById('loot-source-filter');
        if (sourceSelect) sourceSelect.value = 'ALL';
        filtersReset = true;
    }
    if (currentSearchTerm) {
        currentSearchTerm = '';
        const searchInput = document.getElementById('ac-global-search');
        if (searchInput) searchInput.value = '';
        filtersReset = true;
    }

    if (filtersReset) {
        applyFilters();
    }
    updateTableOnly();

    // 3. Locate row in DOM, scroll into view, pulse highlight
    const row = document.querySelector(`tr[data-loot-id="${item.id}"]`);
    if (row) {
        if (typeof row.scrollIntoView === 'function') {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        row.classList.remove('ac-row-highlighted');
        if (row.offsetWidth !== undefined) void row.offsetWidth; // Force reflow
        row.classList.add('ac-row-highlighted');
        setTimeout(() => row.classList.remove('ac-row-highlighted'), 4000);
    }

    // 4. Open rich detail modal
    showLootDetail(item);
    return true;
}

/**
 * Opens form to create or edit a Loot item.
 * 
 * @param {Object} [existingItem=null] 
 */
export function openLootForm(existingItem = null) {
    const isEditing = Boolean(existingItem && existingItem.id);
    const title = isEditing ? `Edit Loot: ${existingItem.name}` : 'Add New Loot Item';

    const currentCatId = existingItem ? (existingItem.category_id || (existingItem.category ? existingItem.category.id : '')) : (allCategories[0] ? allCategories[0].id : '');
    const currentTierId = existingItem ? (existingItem.tier_id || (existingItem.tier ? existingItem.tier.id : '')) : (allTiers[0] ? allTiers[0].id : '');
    const currentNature = existingItem ? existingItem.nature : 'Permanent';
    let selectedSources = existingItem ? (Array.isArray(existingItem.source) ? [...existingItem.source] : [existingItem.source].filter(Boolean)) : ['DMG2024'];

    const formHtml = `
        <div class="detail-header">
            <div>
                <span class="detail-category">${isEditing ? 'Edit Loot Item' : 'New Loot Item'}</span>
                <h2 class="detail-title">${esc(title)}</h2>
            </div>
        </div>

        <form id="ac-loot-form" class="ac-edit-form">
            <div class="ac-form-group">
                <label for="loot-form-name">Item Name *</label>
                <input type="text" id="loot-form-name" required value="${esc(existingItem ? existingItem.name : '')}" class="ac-form-input" />
            </div>

            <div class="ac-form-grid" style="grid-template-columns: 1fr 1fr;">
                <div class="ac-form-group">
                    <label for="loot-form-category">Category *</label>
                    <select id="loot-form-category" required class="ac-form-select">
                        ${allCategories.map(c => `
                            <option value="${esc(c.id)}" ${c.id === currentCatId ? 'selected' : ''}>${esc(c.name)}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="ac-form-group">
                    <label for="loot-form-tier">Base Tier *</label>
                    <select id="loot-form-tier" required class="ac-form-select">
                        ${allTiers.map(t => `
                            <option value="${esc(t.id)}" ${t.id === currentTierId ? 'selected' : ''}>${esc(t.name)} (${esc(t.tier_group)})</option>
                        `).join('')}
                    </select>
                </div>
            </div>

            <div class="ac-form-grid" style="grid-template-columns: 1fr 1fr 1fr;">
                <div class="ac-form-group">
                    <label for="loot-form-nature">Nature *</label>
                    <select id="loot-form-nature" required class="ac-form-select">
                        <option value="Permanent" ${currentNature === 'Permanent' ? 'selected' : ''}>Permanent</option>
                        <option value="Consumable" ${currentNature === 'Consumable' ? 'selected' : ''}>Consumable</option>
                        <option value="Varies" ${currentNature === 'Varies' ? 'selected' : ''}>Varies</option>
                    </select>
                </div>
                <div class="ac-form-group">
                    <label for="loot-form-type">Type</label>
                    <input type="text" id="loot-form-type" value="${esc(existingItem ? existingItem.type || '' : 'Wondrous item')}" placeholder="e.g. Weapon, Potion..." class="ac-form-input" />
                </div>
                <div class="ac-form-group">
                    <label for="loot-form-tier-display">Tier Display Label *</label>
                    <input type="text" id="loot-form-tier-display" required value="${esc(existingItem ? existingItem.tier_display : 'T1 Permanent')}" placeholder="e.g. T2 Select Permanent" class="ac-form-input" />
                </div>
            </div>

            <div class="ac-form-grid" style="grid-template-columns: 1fr 1fr;">
                <div class="ac-form-group" style="justify-content: center;">
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; text-transform: none; font-size: 0.9rem;">
                        <input type="checkbox" id="loot-form-dm-select" ${existingItem && existingItem.is_dm_select ? 'checked' : ''} />
                        Is DM Select Item (Requires creator DM permission)
                    </label>
                </div>
                <div class="ac-form-group">
                    <label for="loot-form-event-cat">Event Category</label>
                    <input type="text" id="loot-form-event-cat" value="${esc(existingItem ? existingItem.event_category || '' : '')}" placeholder="Optional event name" class="ac-form-input" />
                </div>
            </div>

            <div class="ac-form-group">
                <label>Sources *</label>
                <div id="loot-form-source-picker"></div>
            </div>

            <div class="ac-form-group">
                <label for="loot-form-desc">Description & Effects</label>
                <textarea id="loot-form-desc" rows="4" class="ac-form-textarea">${esc(existingItem ? existingItem.description || '' : '')}</textarea>
            </div>

            <div class="ac-form-group">
                <label for="loot-form-notes">Notes & Advice</label>
                <textarea id="loot-form-notes" rows="3" class="ac-form-textarea">${esc(existingItem ? existingItem.notes_advice || '' : '')}</textarea>
            </div>

            <div class="ac-form-group">
                <label for="loot-form-order">Display Order</label>
                <input type="number" step="0.001" id="loot-form-order" value="${existingItem ? existingItem.display_order : getNextDisplayOrder(allLoot)}" class="ac-form-input" />
            </div>

            <div class="ac-form-actions">
                <button type="button" class="ac-btn-admin ac-btn-secondary" id="btn-cancel-loot">Cancel</button>
                <button type="submit" class="ac-btn-admin ac-btn-primary" id="btn-submit-loot">${isEditing ? 'Save Changes' : 'Create Loot'}</button>
            </div>
        </form>
    `;

    openModal(formHtml);

    const cancelBtn = document.getElementById('btn-cancel-loot');
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    const pickerContainer = document.getElementById('loot-form-source-picker');
    renderSourceTagPicker({
        containerEl: pickerContainer,
        selectedKeys: selectedSources,
        availableKeys: availableSourceKeys,
        onChange: (keys) => {
            selectedSources = keys;
        }
    });

    const form = document.getElementById('ac-loot-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!selectedSources || selectedSources.length === 0) {
                alert('Please select at least one source.');
                return;
            }

            const name = form.querySelector('#loot-form-name').value.trim();
            const categoryId = form.querySelector('#loot-form-category').value;
            const tierId = form.querySelector('#loot-form-tier').value;
            const nature = form.querySelector('#loot-form-nature').value;
            const type = form.querySelector('#loot-form-type').value.trim() || null;
            const tierDisplay = form.querySelector('#loot-form-tier-display').value.trim();
            const eventCat = form.querySelector('#loot-form-event-cat').value.trim() || null;
            const isDmSelect = form.querySelector('#loot-form-dm-select').checked;
            const description = form.querySelector('#loot-form-desc').value.trim() || null;
            const notesAdvice = form.querySelector('#loot-form-notes').value.trim() || null;
            const displayOrder = cleanFloat(form.querySelector('#loot-form-order').value, getNextDisplayOrder(allLoot));

            const submitBtn = form.querySelector('#btn-submit-loot');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';

            try {
                if (isEditing) {
                    const updates = {
                        name,
                        category_id: categoryId,
                        tier_id: tierId,
                        nature,
                        type,
                        tier_display: tierDisplay,
                        event_category: eventCat,
                        is_dm_select: isDmSelect,
                        source: selectedSources,
                        description,
                        notes_advice: notesAdvice,
                        display_order: displayOrder
                    };
                    const { error } = await updateLoot(existingItem.id, updates);
                    if (error) throw error;
                    showToast('Loot updated successfully!');
                } else {
                    const checkId = `LOT_${String(allLoot.length + 1).padStart(4, '0')}`;
                    const newRecord = {
                        name,
                        check_id: checkId,
                        category_id: categoryId,
                        tier_id: tierId,
                        nature,
                        type,
                        tier_display: tierDisplay,
                        event_category: eventCat,
                        is_dm_select: isDmSelect,
                        source: selectedSourceTags,
                        description,
                        notes_advice: notesAdvice,
                        display_order: displayOrder
                    };
                    const { error } = await createLoot(newRecord);
                    if (error) throw error;
                    showToast('Loot item created successfully!');
                }

                closeModal();
                await initLoot(true);
            } catch (err) {
                console.error('Error saving loot:', err);
                alert(`Error saving loot: ${err.message}`);
                submitBtn.disabled = false;
                submitBtn.textContent = isEditing ? 'Save Changes' : 'Create Loot';
            }
        });
    }
}

/**
 * Confirms and executes deletion of a Loot item.
 * 
 * @param {Object} item 
 */
export async function confirmAndDeleteLoot(item) {
    if (!confirm(`Are you sure you want to permanently delete "${item.name}"? This action cannot be undone.`)) {
        return;
    }

    try {
        const { error } = await deleteLoot(item.id);
        if (error) throw error;
        showToast(`Deleted "${item.name}" successfully.`);
        await initLoot(true);
    } catch (err) {
        console.error('Failed to delete loot:', err);
        alert(`Failed to delete loot: ${err.message}`);
    }
}

/**
 * Opens standard Options Manager modal for Loot categories (Level 1 Scope rules).
 */
export function openLootOptionsModal() {
    openGenericOptionsModal({
        title: '⚙️ Configure Loot Categories',
        subtitle: 'Manage Level 1 Category Sections and Distribution Guidelines across Rolled Loot, Select Loot, Multisession, and Other Loot.',
        tabs: [
            {
                id: 'categories',
                label: 'Categories',
                items: allCategories,
                columns: [
                    { key: 'name', label: 'Category Name', width: '30%' },
                    { key: 'notes', label: 'Level 1 Distribution Rules (Notes)', snippet: 60 },
                    { key: 'display_order', label: 'Order', width: '15%' }
                ],
                fields: [
                    { key: 'name', label: 'Category Name', required: true, type: 'text' },
                    { key: 'notes', label: 'Level 1 Distribution Rules (Notes)', type: 'textarea', placeholder: 'Enter complete rulebook guidelines for this section (/hgenloot commands, predetermination caps, etc.)...' },
                    { key: 'display_order', label: 'Display Order', type: 'number', defaultValue: 10 }
                ],
                addLabel: '+ Add Category'
            }
        ],
        onSave: async (drafts) => {
            const updatedCategories = drafts.categories || [];
            try {
                for (const cat of updatedCategories) {
                    if (cat.id && !cat.id.startsWith('new_')) {
                        await updateLootCategory(cat.id, {
                            name: cat.name,
                            notes: cat.notes || '',
                            display_order: cleanFloat(cat.display_order, 10)
                        });
                    } else {
                        await insertLootCategory({
                            name: cat.name,
                            notes: cat.notes || '',
                            display_order: cleanFloat(cat.display_order, 10)
                        });
                    }
                }
                showToast('Loot categories updated!');
                await initLoot(true);
                return true;
            } catch (err) {
                console.error('Error saving loot categories:', err);
                alert(`Error saving categories: ${err.message}`);
                return false;
            }
        }
    });
}
