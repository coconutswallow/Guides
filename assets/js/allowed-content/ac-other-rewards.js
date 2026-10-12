/**
 * ================================================================
 * AC OTHER REWARDS MODULE
 * ================================================================
 * 
 * Presentation, filtering, and administration controller for
 * Allowed Content Other Rewards (Dark Gifts, Supernatural Gifts,
 * Mythic Gifts, Charms, Pets, Mounts, and Quirks).
 * 
 * Responsibilities:
 * - Rendering Other Rewards grouped by category accordion subheaders.
 * - Displaying Level 1 category rules in accordion subheader notes.
 * - Rendering interactive Tier badges with Level 2/3 tooltip rules.
 * - Multi-criteria toolbar: Category filter, Tier filter, Source filter, Toggle All Accordion, live search.
 * - Interactive detail modal on row click with markdown link and source badge rendering.
 * - Staff administration workflows (Add, Edit, Delete) with multi-source tag picker and fractional order indexing.
 * 
 * @module ACOtherRewards
 */

import { 
    getOtherRewards, 
    getOtherRewardsCategories, 
    createOtherReward, 
    updateOtherReward, 
    deleteOtherReward,
    insertOtherRewardsCategory,
    updateOtherRewardsCategory,
    deleteOtherRewardsCategory,
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
    initTooltips
} from './ac-ui-utils.js';

export {
    setAdminMode,
    getAdminMode
};

// Module State
let allRewards = [];
let filteredRewards = [];
let allCategories = [];
let allTiers = [];
let availableSourceKeys = [];
let collapsedCategories = new Set();
let collapsedSubcategories = new Set();

// Active toolbar filters
let selectedCategoryFilter = 'ALL';   // 'ALL' | specific category name
let selectedSubcategoryFilter = 'ALL'; // 'ALL' | specific subcategory name (for Miscellaneous)
let selectedTierFilter = 'ALL';       // 'ALL' | specific tier code or group
let selectedSourceFilter = 'ALL';     // 'ALL' | specific source key
let currentSearchTerm = '';

/**
 * Returns the subcategory within Miscellaneous for a given item.
 * 
 * @param {Object} item 
 * @returns {string} Subcategory name
 */
export function getRewardSubcategory(item) {
    const t = item.type || '';
    const n = item.name || '';
    if (t.startsWith('Group') || t.startsWith('Renown') || t === 'Member Benefits' || t.startsWith('Wondrous Item') || t === 'Trinket' || t === 'Ring') {
        return 'Renown';
    }
    if (t === 'Story Outcome') return 'Story Outcomes';
    if (t === 'Mount') return 'Mounts';
    if (t === 'Pet') return 'Pets';
    if (t === 'Mark of Prestige') return 'Marks of Prestige';
    if (n === 'Quirk' || t === 'Quirk') return 'Quirks';
    if (n === 'Piety' || t.includes('Supernatural Gift') || n.toLowerCase().includes('piety')) return 'Piety';
    if (t === 'Bastion' || t === 'Supernatural Reward' || n.includes('Homebrew Supernatural')) return 'Other Miscellaneous Rewards';
    return 'Other Miscellaneous Rewards';
}

const MISC_SUBCATEGORY_RULES = {
    'Other Miscellaneous Rewards': 'Special rewards including Bastions and approved Homebrew Supernatural Rewards.',
    'Quirks': 'Quirks don\'t take up an item slot and can only be awarded by Full DMs.',
    'Piety': 'Homebrew Supernatural Gifts developed with Lore and Rules teams using the Piety system in Mythic Odysseys of Theros.',
    'Marks of Prestige': 'Marks of Prestige don\'t count against a game\'s item slots or gold allotment.',
    'Mounts': 'Creatures that can be used as mounts, following standard item distribution rules.',
    'Pets': 'Pets cannot take Attack or Help actions. Can be awarded as equivalent of a T0 Permanent.',
    'Renown': 'Guild factions, organizations, communities, and associated Renown Perks.',
    'Story Outcomes': 'Permanent adventure consequences and story milestones awarded by DMs.'
};

/**
 * Builds tooltip text for Other Rewards tier badges (incorporates Level 2 & Level 3 rules).
 * 
 * @param {Object} item 
 * @returns {string} Plaintext tooltip
 */
export function formatRewardTierTooltip(item) {
    const tier = item.tier;
    if (!tier) {
        return item.tier_display || 'Standard Tier';
    }

    const lines = [];
    lines.push(`Tier: ${tier.name || tier.code} (${tier.tier_group || 'General'})`);
    if (tier.min_apl) lines.push(`Minimum APL: ${tier.min_apl}+`);
    if (tier.dm_requirement && tier.dm_requirement !== 'Any DM') lines.push(`Authority: ${tier.dm_requirement}`);
    if (tier.reward_tier_rules) lines.push(`Reward Rules: ${tier.reward_tier_rules}`);
    if (item.is_dm_select) lines.push(`• DM Select: Requires DM collaboration or predetermination.`);
    if (item.event_category) lines.push(`• Event: Acquirable only during ${item.event_category}.`);

    return lines.join('\n');
}

/**
 * Initializes the Other Rewards view.
 * 
 * @param {boolean} [forceRefresh=false]
 */
export async function initOtherRewards(forceRefresh = false) {
    const container = document.getElementById('ac-view-other-rewards');
    if (!container) return;

    if (forceRefresh) {
        selectedCategoryFilter = 'ALL';
        selectedSubcategoryFilter = 'ALL';
        selectedTierFilter = 'ALL';
        selectedSourceFilter = 'ALL';
        currentSearchTerm = '';
        collapsedCategories.clear();
        collapsedSubcategories.clear();
        allRewards = [];
    } else if (allRewards.length > 0) {
        applyFilters();
        updateTableOnly();
        return;
    }

    container.innerHTML = `
        <div class="ac-loading">
            <div class="spinner"></div>
            <span>Cataloging Other Rewards & Supernatural Gifts...</span>
        </div>
    `;

    try {
        const [rewardsData, categoriesData, tiersData, sourcesData] = await Promise.all([
            getOtherRewards(),
            getOtherRewardsCategories(),
            getTiersCached().catch(() => []),
            getSourcesCached().catch(() => [])
        ]);

        allRewards = sortByDisplayOrder(rewardsData || []);
        allCategories = sortByDisplayOrder(categoriesData || []);
        allTiers = sortByDisplayOrder(tiersData || []);

        const foundSources = new Set();
        allRewards.forEach(item => {
            if (Array.isArray(item.source)) {
                item.source.forEach(s => s && foundSources.add(s));
            } else if (typeof item.source === 'string' && item.source) {
                foundSources.add(item.source);
            }
        });
        availableSourceKeys = Array.from(foundSources).sort();

        renderShell(container);
        applyFilters();
        updateTableOnly();
    } catch (err) {
        console.error('Failed to initialize Other Rewards view:', err);
        container.innerHTML = `
            <div class="ac-error">
                <p>Failed to load Other Rewards: ${esc(err.message)}</p>
                <button class="btn-primary" onclick="window.location.reload()">Retry</button>
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

    container.innerHTML = `
        <div class="ac-other-rewards-container">
            <!-- Toolbar: Filters and Stats -->
            <div class="ac-other-rewards-toolbar ac-classes-toolbar">
                <div class="ac-other-rewards-stats ac-classes-stats" id="other-rewards-stats">
                    Showing <strong>${filteredRewards.length}</strong> ${filteredRewards.length === 1 ? 'Reward' : 'Rewards'}
                </div>

                <div class="ac-other-rewards-controls ac-classes-controls">
                    <!-- Category Dropdown -->
                    <select id="other-rewards-category-filter" class="ac-filter-select" title="Filter by Category" aria-label="Filter by Category">
                        <option value="ALL">All Categories (${allRewards.length})</option>
                        ${allCategories.map(cat => {
                            const count = allRewards.filter(r => r.category_id === cat.id || (r.category && r.category.name === cat.name)).length;
                            return `<option value="${esc(cat.name)}" ${selectedCategoryFilter === cat.name ? 'selected' : ''}>${esc(cat.name)} (${count})</option>`;
                        }).join('')}
                    </select>

                    <!-- Subcategory Dropdown (for Miscellaneous) -->
                    <select id="other-rewards-subcategory-filter" class="ac-filter-select" title="Filter by Subcategory" aria-label="Filter by Subcategory" style="${selectedCategoryFilter === 'Miscellaneous' ? '' : 'display: none;'}">
                        <option value="ALL">All Miscellaneous</option>
                        <option value="Other Miscellaneous Rewards" ${selectedSubcategoryFilter === 'Other Miscellaneous Rewards' ? 'selected' : ''}>Other Misc</option>
                        <option value="Quirks" ${selectedSubcategoryFilter === 'Quirks' ? 'selected' : ''}>Quirks</option>
                        <option value="Piety" ${selectedSubcategoryFilter === 'Piety' ? 'selected' : ''}>Piety</option>
                        <option value="Marks of Prestige" ${selectedSubcategoryFilter === 'Marks of Prestige' ? 'selected' : ''}>Marks of Prestige</option>
                        <option value="Mounts" ${selectedSubcategoryFilter === 'Mounts' ? 'selected' : ''}>Mounts</option>
                        <option value="Pets" ${selectedSubcategoryFilter === 'Pets' ? 'selected' : ''}>Pets</option>
                        <option value="Renown" ${selectedSubcategoryFilter === 'Renown' ? 'selected' : ''}>Renown</option>
                        <option value="Story Outcomes" ${selectedSubcategoryFilter === 'Story Outcomes' ? 'selected' : ''}>Story Outcomes</option>
                    </select>

                    <!-- Tier Dropdown -->
                    <select id="other-rewards-tier-filter" class="ac-filter-select" title="Filter by Tier" aria-label="Filter by Tier">
                        <option value="ALL">All Tiers</option>
                        ${allTiers.map(t => `<option value="${esc(t.code)}" ${selectedTierFilter === t.code ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}
                    </select>

                    <!-- Sourcebook Dropdown -->
                    <select id="other-rewards-source-filter" class="ac-filter-select" title="Filter by Sourcebook" aria-label="Filter by Sourcebook">
                        <option value="ALL">All Sources (${availableSourceKeys.length})</option>
                        ${availableSourceKeys.map(src => `<option value="${esc(src)}" ${selectedSourceFilter === src ? 'selected' : ''}>${esc(src)}</option>`).join('')}
                    </select>

                    <!-- Toggle All Button -->
                    <button type="button" id="btn-toggle-all-other-rewards-accordion" class="ac-btn-toggle-all" title="Toggle expanding or collapsing all categories">
                        Collapse All ▲
                    </button>

                    ${isAdmin ? `
                        <button type="button" class="btn-primary ac-btn-sm" id="btn-add-other-reward-inline">
                            + Add Reward
                        </button>
                        <button type="button" class="btn-secondary ac-btn-sm" id="btn-manage-other-rewards-categories-inline">
                            ⚙️ Configure Categories
                        </button>
                    ` : ''}
                </div>
            </div>

            <div class="ac-table-responsive" id="other-rewards-table-container">
                <table class="ac-table" id="other-rewards-table">
                    <thead>
                        <tr>
                            <th class="col-name">Name</th>
                            <th class="col-type">Type</th>
                            <th class="col-tier">Tier</th>
                            <th class="col-source">Source</th>
                            <th class="col-desc">Description / Effects</th>
                            <th class="col-notes">Notes & Advice</th>
                            ${isAdmin ? '<th class="col-actions">Actions</th>' : ''}
                        </tr>
                    </thead>
                    <tbody id="other-rewards-tbody">
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
    const categorySelect = container.querySelector('#other-rewards-category-filter');
    const subcategorySelect = container.querySelector('#other-rewards-subcategory-filter');

    if (categorySelect) {
        categorySelect.addEventListener('change', (e) => {
            selectedCategoryFilter = e.target.value;
            if (subcategorySelect) {
                if (selectedCategoryFilter === 'Miscellaneous') {
                    subcategorySelect.style.display = '';
                } else {
                    subcategorySelect.style.display = 'none';
                    selectedSubcategoryFilter = 'ALL';
                    subcategorySelect.value = 'ALL';
                }
            }
            applyFilters();
            updateTableOnly();
        });
    }

    if (subcategorySelect) {
        subcategorySelect.addEventListener('change', (e) => {
            selectedSubcategoryFilter = e.target.value;
            applyFilters();
            updateTableOnly();
        });
    }

    const tierSelect = container.querySelector('#other-rewards-tier-filter');
    if (tierSelect) {
        tierSelect.addEventListener('change', (e) => {
            selectedTierFilter = e.target.value;
            applyFilters();
            updateTableOnly();
        });
    }

    const sourceSelect = container.querySelector('#other-rewards-source-filter');
    if (sourceSelect) {
        sourceSelect.addEventListener('change', (e) => {
            selectedSourceFilter = e.target.value;
            applyFilters();
            updateTableOnly();
        });
    }

    const toggleAllBtn = container.querySelector('#btn-toggle-all-other-rewards-accordion');
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

    const addBtn = container.querySelector('#btn-add-other-reward-inline');
    if (addBtn) {
        addBtn.addEventListener('click', () => openOtherRewardForm());
    }

    const manageCatBtn = container.querySelector('#btn-manage-other-rewards-categories-inline');
    if (manageCatBtn) {
        manageCatBtn.addEventListener('click', () => openOtherRewardsOptionsModal());
    }
}

/**
 * Updates the text and icon of the Toggle All button based on current state.
 */
function updateToggleAllBtn() {
    const btn = document.getElementById('btn-toggle-all-other-rewards-accordion');
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
 * Applies active category, subcategory, tier, source, and search filters.
 */
function applyFilters() {
    const term = currentSearchTerm.toLowerCase().trim();

    filteredRewards = allRewards.filter(item => {
        // Category filter
        if (selectedCategoryFilter !== 'ALL') {
            const catName = item.category ? item.category.name : '';
            if (catName !== selectedCategoryFilter) return false;
        }

        // Subcategory filter (within Miscellaneous)
        if (selectedCategoryFilter === 'Miscellaneous' && selectedSubcategoryFilter !== 'ALL') {
            const sub = getRewardSubcategory(item);
            if (sub !== selectedSubcategoryFilter) return false;
        }

        // Tier filter
        if (selectedTierFilter !== 'ALL') {
            const tCode = item.tier ? item.tier.code : '';
            if (tCode !== selectedTierFilter && item.tier_display !== selectedTierFilter) return false;
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
            const tierDisplay = (item.tier_display || '').toLowerCase();
            const desc = (item.description || '').toLowerCase();
            const notes = (item.notes_advice || '').toLowerCase();
            const sources = (Array.isArray(item.source) ? item.source.join(' ') : String(item.source || '')).toLowerCase();

            if (!name.includes(term) && 
                !type.includes(term) && 
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
 * Filters Other Rewards by global search query.
 * 
 * @param {string} term 
 */
export function filterOtherRewards(term) {
    currentSearchTerm = term || '';
    applyFilters();
    updateTableOnly();
}

/**
 * Groups filtered rewards by category, preserving canonical display_order.
 * 
 * @param {Array} items
 * @returns {Array<Object>} Category groups
 */
function groupRewardsByCategory(items) {
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
 * Helper to render an item row with Tier column restored.
 */
function renderRewardRowHtml(item, isAdmin, isSubrow = false) {
    const tierTooltip = formatRewardTierTooltip(item);
    const descFormatted = formatExpandableText(item.description, 160);
    const notesFormatted = formatExpandableText(item.notes_advice, 120);

    return `
        <tr class="ac-row-clickable ${isSubrow ? 'ac-subrow-indented' : ''}" data-reward-id="${esc(item.id)}">
            <td class="col-name">
                <strong>${esc(item.name)}</strong>
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
                    <button type="button" class="ac-btn-admin ac-btn-sm btn-edit-reward" data-reward-id="${esc(item.id)}" title="Edit Reward">✏️</button>
                    <button type="button" class="ac-btn-admin ac-btn-sm ac-btn-delete btn-delete-reward" data-reward-id="${esc(item.id)}" title="Delete Reward">🗑️</button>
                </td>
            ` : ''}
        </tr>
    `;
}

/**
 * Renders the table content partitioned by Category Accordion Subheaders.
 */
function updateTableOnly() {
    const tbody = document.getElementById('other-rewards-tbody');
    const statsContainer = document.getElementById('other-rewards-stats');
    if (!tbody) return;

    if (statsContainer) {
        statsContainer.innerHTML = `Showing <strong>${filteredRewards.length}</strong> ${filteredRewards.length === 1 ? 'Reward' : 'Rewards'}`;
    }

    const isAdmin = getAdminMode();
    const colSpan = isAdmin ? 7 : 6;

    if (filteredRewards.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="${colSpan}" class="ac-no-results">
                    No Other Rewards found matching your filter criteria.
                </td>
            </tr>
        `;
        updateToggleAllBtn();
        return;
    }

    const htmlRows = [];
    const categoryGroups = groupRewardsByCategory(filteredRewards);

    categoryGroups.forEach(({ category, items }) => {
        const isCatCollapsed = collapsedCategories.has(category.id);
        const catBadge = `${items.length} ${items.length === 1 ? 'Reward' : 'Rewards'}`;

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
            if (category.name === 'Miscellaneous' && selectedSubcategoryFilter === 'ALL') {
                // Partition by Subcategory under Miscellaneous matching spreadsheet
                const subBuckets = new Map();
                const subOrder = ['Other Miscellaneous Rewards', 'Quirks', 'Piety', 'Marks of Prestige', 'Mounts', 'Pets', 'Renown', 'Story Outcomes'];
                subOrder.forEach(so => subBuckets.set(so, []));

                items.forEach(item => {
                    const sub = getRewardSubcategory(item);
                    if (!subBuckets.has(sub)) subBuckets.set(sub, []);
                    subBuckets.get(sub).push(item);
                });

                subBuckets.forEach((subItems, subName) => {
                    if (subItems.length === 0) return;
                    const isSubCollapsed = collapsedSubcategories.has(subName);
                    const subRule = MISC_SUBCATEGORY_RULES[subName] || '';
                    htmlRows.push(`
                        <tr class="ac-table-tier-header ${isSubCollapsed ? 'collapsed' : ''}" data-subcat="${esc(subName)}" role="button" aria-expanded="${!isSubCollapsed}" tabindex="0">
                            <td colspan="${colSpan}">
                                <div class="ac-table-tier-main">
                                    <span class="accordion-chevron">${isSubCollapsed ? '▶' : '▼'}</span>
                                    <span class="ac-table-tier-title">${esc(subName)}</span>
                                    <span class="ac-tier-pill">${subItems.length} ${subItems.length === 1 ? 'Item' : 'Items'}</span>${subRule ? `
                                    <span class="ac-table-group-divider">—</span>
                                    <span class="ac-table-tier-notes">${esc(subRule)}</span>` : ''}
                                    <span class="ac-group-hover-hint">${isSubCollapsed ? 'Expand ▼' : 'Collapse ▲'}</span>
                                </div>
                            </td>
                        </tr>
                    `);

                    if (!isSubCollapsed) {
                        subItems.forEach(item => {
                            htmlRows.push(renderRewardRowHtml(item, isAdmin, true));
                        });
                    }
                });
            } else {
                items.forEach(item => {
                    htmlRows.push(renderRewardRowHtml(item, isAdmin, false));
                });
            }
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

    // Subcategory Accordion toggle (under Miscellaneous)
    tbody.querySelectorAll('.ac-table-tier-header').forEach(header => {
        header.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') return;
            const subName = header.dataset.subcat;
            if (!subName) return;
            if (collapsedSubcategories.has(subName)) {
                collapsedSubcategories.delete(subName);
            } else {
                collapsedSubcategories.add(subName);
            }
            updateTableOnly();
        });
    });

    // Row click -> detail modal
    tbody.querySelectorAll('.ac-row-clickable').forEach(row => {
        row.addEventListener('click', (e) => {
            if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.ac-expand-toggle')) {
                return;
            }
            const rewardId = row.dataset.rewardId;
            const reward = allRewards.find(r => r.id === rewardId);
            if (reward) {
                showOtherRewardDetail(reward);
            }
        });
    });

    // Admin edit buttons
    tbody.querySelectorAll('.btn-edit-reward').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const rewardId = btn.dataset.rewardId;
            const reward = allRewards.find(r => r.id === rewardId);
            if (reward) {
                openOtherRewardForm(reward);
            }
        });
    });

    // Admin delete buttons
    tbody.querySelectorAll('.btn-delete-reward').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const rewardId = btn.dataset.rewardId;
            const reward = allRewards.find(r => r.id === rewardId);
            if (reward) {
                confirmAndDeleteReward(reward);
            }
        });
    });
}

/**
 * Displays rich detail modal for an Other Reward item.
 * 
 * @param {Object} item 
 */
export function showOtherRewardDetail(item) {
    const isAdmin = getAdminMode();
    const tierTooltip = formatRewardTierTooltip(item);
    const categoryName = item.category ? item.category.name : 'Other';
    const categoryNotes = item.category ? item.category.notes : '';

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
                <div class="detail-actions">
                    <button type="button" class="ac-btn-admin ac-btn-primary" id="btn-modal-edit-reward" title="Edit Reward">✏️ Edit</button>
                    <button type="button" class="ac-btn-admin ac-btn-delete" id="btn-modal-delete-reward" title="Delete Reward">🗑️ Delete</button>
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
            <strong>Category Info: ${esc(categoryName)}:</strong>
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
                    ${item.tier.reward_tier_rules ? `<p style="margin: 0.25rem 0;"><strong>Reward Rules:</strong> ${esc(item.tier.reward_tier_rules)}</p>` : ''}
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
                    ${renderMarkdownLinks(esc(item.description)).replace(/\n/g, '<br>')}
                </div>
            </div>
        ` : ''}

        <!-- Section 4: Notes & Advice -->
        ${item.notes_advice ? `
            <div class="detail-section">
                <h4>Notes & Advice</h4>
                <div class="advice-content" style="color: var(--color-secondary);">
                    ${renderMarkdownLinks(esc(item.notes_advice)).replace(/\n/g, '<br>')}
                </div>
            </div>
        ` : ''}

        <!-- Metadata Footer (Admin only) -->
        ${isAdmin ? `
            <div style="margin-top: 1.5rem; padding-top: 0.75rem; border-top: 1px solid var(--color-border); font-size: 0.85rem; opacity: 0.7;">
                <span><strong>Display Order:</strong> ${formatDisplayOrder(item.display_order)}</span>
            </div>
        ` : ''}
    `;

    openModal(contentHtml);

    if (isAdmin) {
        const editBtn = document.getElementById('btn-modal-edit-reward');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                closeModal();
                openOtherRewardForm(item);
            });
        }

        const deleteBtn = document.getElementById('btn-modal-delete-reward');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                closeModal();
                confirmAndDeleteReward(item);
            });
        }
    }
}

/**
 * Opens form to create or edit an Other Reward item.
 * 
 * @param {Object} [existingItem=null] 
 */
export function openOtherRewardForm(existingItem = null) {
    const isEditing = Boolean(existingItem && existingItem.id);
    const title = isEditing ? `Edit Other Reward: ${existingItem.name}` : 'Add New Other Reward';

    const currentCatId = existingItem ? (existingItem.category_id || (existingItem.category ? existingItem.category.id : '')) : (allCategories[0] ? allCategories[0].id : '');
    const currentTierId = existingItem ? (existingItem.tier_id || (existingItem.tier ? existingItem.tier.id : '')) : (allTiers[0] ? allTiers[0].id : '');
    let selectedSources = existingItem ? (Array.isArray(existingItem.source) ? [...existingItem.source] : [existingItem.source].filter(Boolean)) : ['HHB'];

    const formHtml = `
        <div class="detail-header">
            <div>
                <span class="detail-category">${isEditing ? 'Edit Other Reward' : 'New Other Reward'}</span>
                <h2 class="detail-title">${esc(title)}</h2>
            </div>
        </div>

        <form id="ac-other-reward-form" class="ac-edit-form">
            <div class="ac-form-group">
                <label for="rew-form-name">Reward Name *</label>
                <input type="text" id="rew-form-name" required value="${esc(existingItem ? existingItem.name : '')}" class="ac-form-input" />
            </div>

            <div class="ac-form-grid" style="grid-template-columns: 1fr 1fr;">
                <div class="ac-form-group">
                    <label for="rew-form-category">Category *</label>
                    <select id="rew-form-category" required class="ac-form-select">
                        ${allCategories.map(c => `
                            <option value="${esc(c.id)}" ${c.id === currentCatId ? 'selected' : ''}>${esc(c.name)}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="ac-form-group">
                    <label for="rew-form-tier">Base Tier *</label>
                    <select id="rew-form-tier" required class="ac-form-select">
                        ${allTiers.map(t => `
                            <option value="${esc(t.id)}" ${t.id === currentTierId ? 'selected' : ''}>${esc(t.name)} (${esc(t.tier_group)})</option>
                        `).join('')}
                    </select>
                </div>
            </div>

            <div class="ac-form-grid" style="grid-template-columns: 1fr 1fr 1fr;">
                <div class="ac-form-group">
                    <label for="rew-form-type">Type *</label>
                    <input type="text" id="rew-form-type" required value="${esc(existingItem ? existingItem.type : 'Gift')}" placeholder="e.g. Dark Gift, Charm, Pet..." class="ac-form-input" />
                </div>
                <div class="ac-form-group">
                    <label for="rew-form-tier-display">Tier Display Label *</label>
                    <input type="text" id="rew-form-tier-display" required value="${esc(existingItem ? existingItem.tier_display : 'T0')}" placeholder="e.g. T1 Select (DM Select)" class="ac-form-input" />
                </div>
                <div class="ac-form-group">
                    <label for="rew-form-event-cat">Event Category</label>
                    <input type="text" id="rew-form-event-cat" value="${esc(existingItem ? existingItem.event_category || '' : '')}" placeholder="Optional event name" class="ac-form-input" />
                </div>
            </div>

            <div class="ac-form-group">
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; text-transform: none; font-size: 0.9rem;">
                    <input type="checkbox" id="rew-form-dm-select" ${existingItem && existingItem.is_dm_select ? 'checked' : ''} />
                    Is DM Select Item (requires DM collaboration / predetermination)
                </label>
            </div>

            <div class="ac-form-group">
                <label>Sources *</label>
                <div id="rew-form-source-picker"></div>
            </div>

            <div class="ac-form-group">
                <label for="rew-form-desc">Description & Effects</label>
                <textarea id="rew-form-desc" rows="4" class="ac-form-textarea">${esc(existingItem ? existingItem.description || '' : '')}</textarea>
            </div>

            <div class="ac-form-group">
                <label for="rew-form-notes">Notes & Advice</label>
                <textarea id="rew-form-notes" rows="3" class="ac-form-textarea">${esc(existingItem ? existingItem.notes_advice || '' : '')}</textarea>
            </div>

            <div class="ac-form-group">
                <label for="rew-form-order">Display Order</label>
                <input type="number" step="0.001" id="rew-form-order" value="${existingItem ? existingItem.display_order : getNextDisplayOrder(allRewards)}" class="ac-form-input" />
            </div>

            <div class="ac-form-actions">
                <button type="button" class="ac-btn-admin ac-btn-secondary" id="btn-cancel-other-reward">Cancel</button>
                <button type="submit" class="ac-btn-admin ac-btn-primary" id="btn-submit-other-reward">${isEditing ? 'Save Changes' : 'Create Reward'}</button>
            </div>
        </form>
    `;

    openModal(formHtml);

    const cancelBtn = document.getElementById('btn-cancel-other-reward');
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    const pickerContainer = document.getElementById('rew-form-source-picker');
    renderSourceTagPicker({
        containerEl: pickerContainer,
        selectedKeys: selectedSources,
        availableKeys: availableSourceKeys,
        onChange: (keys) => {
            selectedSources = keys;
        }
    });

    const form = document.getElementById('ac-other-reward-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!selectedSources || selectedSources.length === 0) {
                alert('Please select at least one source.');
                return;
            }

            const name = form.querySelector('#rew-form-name').value.trim();
            const categoryId = form.querySelector('#rew-form-category').value;
            const tierId = form.querySelector('#rew-form-tier').value;
            const type = form.querySelector('#rew-form-type').value.trim();
            const tierDisplay = form.querySelector('#rew-form-tier-display').value.trim();
            const eventCat = form.querySelector('#rew-form-event-cat').value.trim() || null;
            const isDmSelect = form.querySelector('#rew-form-dm-select').checked;
            const description = form.querySelector('#rew-form-desc').value.trim() || null;
            const notesAdvice = form.querySelector('#rew-form-notes').value.trim() || null;
            const displayOrder = cleanFloat(form.querySelector('#rew-form-order').value, getNextDisplayOrder(allRewards));

            const submitBtn = form.querySelector('#btn-submit-other-reward');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';

            try {
                if (isEditing) {
                    const updates = {
                        name,
                        category_id: categoryId,
                        tier_id: tierId,
                        type,
                        tier_display: tierDisplay,
                        event_category: eventCat,
                        is_dm_select: isDmSelect,
                        source: selectedSources,
                        description,
                        notes_advice: notesAdvice,
                        display_order: displayOrder
                    };
                    const { error } = await updateOtherReward(existingItem.id, updates);
                    if (error) throw error;
                    showToast('Reward updated successfully!');
                } else {
                    const checkId = `REW_${String(allRewards.length + 1).padStart(4, '0')}`;
                    const newRecord = {
                        name,
                        check_id: checkId,
                        category_id: categoryId,
                        tier_id: tierId,
                        type,
                        tier_display: tierDisplay,
                        event_category: eventCat,
                        is_dm_select: isDmSelect,
                        source: selectedSourceTags,
                        description,
                        notes_advice: notesAdvice,
                        display_order: displayOrder
                    };
                    const { error } = await createOtherReward(newRecord);
                    if (error) throw error;
                    showToast('Reward created successfully!');
                }

                closeModal();
                await initOtherRewards(true);
            } catch (err) {
                console.error('Error saving reward:', err);
                alert(`Error saving reward: ${err.message}`);
                submitBtn.disabled = false;
                submitBtn.textContent = isEditing ? 'Save Changes' : 'Create Reward';
            }
        });
    }
}

/**
 * Confirms and executes deletion of an Other Reward.
 * 
 * @param {Object} item 
 */
export async function confirmAndDeleteReward(item) {
    if (!confirm(`Are you sure you want to permanently delete "${item.name}"? This action cannot be undone.`)) {
        return;
    }

    try {
        const { error } = await deleteOtherReward(item.id);
        if (error) throw error;
        showToast(`Deleted "${item.name}" successfully.`);
        await initOtherRewards(true);
    } catch (err) {
        console.error('Failed to delete reward:', err);
        alert(`Failed to delete reward: ${err.message}`);
    }
}

/**
 * Opens standard Options Manager modal for Other Rewards categories (Level 1 Scope rules).
 */
export function openOtherRewardsOptionsModal() {
    openGenericOptionsModal({
        title: '⚙️ Configure Other Rewards Categories',
        subtitle: 'Manage Level 1 Category Sections and Rulebook Guidelines across Dark Gifts, Supernatural Gifts, Charms, etc.',
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
                    { key: 'notes', label: 'Level 1 Distribution Rules (Notes)', type: 'textarea', placeholder: 'Enter complete rulebook guidelines for this section...' },
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
                        await updateOtherRewardsCategory(cat.id, {
                            name: cat.name,
                            notes: cat.notes || '',
                            display_order: cleanFloat(cat.display_order, 10)
                        });
                    } else {
                        await insertOtherRewardsCategory({
                            name: cat.name,
                            notes: cat.notes || '',
                            display_order: cleanFloat(cat.display_order, 10)
                        });
                    }
                }
                showToast('Other Rewards categories updated!');
                await initOtherRewards(true);
                return true;
            } catch (err) {
                console.error('Error saving categories:', err);
                alert(`Error saving categories: ${err.message}`);
                return false;
            }
        }
    });
}
