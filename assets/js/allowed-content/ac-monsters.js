/**
 * ================================================================
 * AC MONSTERS MODULE
 * ================================================================
 * 
 * Presentation, filtering, and administration controller for
 * Allowed Content Monsters.
 * 
 * Responsibilities:
 * - Rendering the comprehensive catalogue of 3,195 official monsters.
 * - Header notification banner routing users to the interactive Field Guide Monster Compendium
 *   for Hawthorne Homebrew content.
 * - Multi-criteria toolbar: Ruleset ('2014' / '2024'), Category ('Fair Game' / 'Full DM Only'),
 *   Section Classification ('Core', 'Supplemental', 'Adventures', 'Non-FR'),
 *   Challenge Rating (CR), and canonical Sourcebook filtering.
 * - Live full-text search with instant client-side filtering.
 * - Interactive detail modal on row click with markdown link and source badge rendering.
 * - Full staff administrative capabilities (Add, Edit, Delete) with multi-source tag picker
 *   and fractional display order indexing.
 * - Categories configuration modal via generic options manager.
 * 
 * @module ACMonsters
 */

import { 
    getMonsters, 
    createMonster, 
    updateMonster, 
    deleteMonster,
    getMonsterCategories,
    getMonsterLookups,
    getSourcesCached,
    insertMonsterCategory,
    updateMonsterCategory,
    deleteMonsterCategory,
    updateLookup,
    getSharedUsage,
    updateSharedUsage
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
    formatExpandableText,
    attachExpandableTextListeners,
    renderSourceTagPicker,
    renderRulesetPill,
    setModalItem,
    copyDirectLink,
    slugify,
    showToast 
} from './ac-ui-utils.js';
import { openGenericOptionsModal, openUsageOptionsModal } from './ac-options-manager.js';

export { setAdminMode, getAdminMode, openUsageOptionsModal };

// Module State
let allMonsters = [];
let filteredMonsters = [];
let monsterCategories = [];
let monsterLookups = null;
let availableCategories = [];
let availableClassifications = [];
let availableCRs = [];
let availableSourceKeys = [];

// Active Filters
let selectedRulesetFilter = 'ALL';
let selectedCategoryFilter = 'ALL';
let selectedClassificationFilter = 'ALL';
let selectedCRFilter = 'ALL';
let selectedSourceFilter = 'ALL';
let currentSearchTerm = '';
let pendingMonsterTarget = null;
const PAGE_SIZE = 100;
let currentPage = 1;

/**
 * Helper to convert Challenge Rating strings to numeric values for sorting.
 * 
 * @param {string|null} cr
 * @returns {number}
 */
function parseCRToNumeric(cr) {
    if (!cr || cr === '—') return 999;
    const str = String(cr).trim();
    if (str === '1/8') return 0.125;
    if (str === '1/4') return 0.25;
    if (str === '1/2') return 0.5;
    const match = str.match(/^(\d+)/);
    if (match) return parseInt(match[1], 10);
    return 998;
}

/**
 * Initializes the Monsters view.
 * 
 * @param {boolean} [forceRefresh=false]
 */
export async function initMonsters(forceRefresh = false) {
    const container = document.getElementById('ac-view-monsters');
    if (!container) return;

    if (forceRefresh) {
        selectedRulesetFilter = 'ALL';
        selectedCategoryFilter = 'ALL';
        selectedClassificationFilter = 'ALL';
        selectedCRFilter = 'ALL';
        selectedSourceFilter = 'ALL';
        currentSearchTerm = '';
        currentPage = 1;
        allMonsters = [];
    } else if (allMonsters.length > 0) {
        applyFilters();
        renderTableBody();
        return;
    }

    container.innerHTML = `
        <div class="ac-loading">
            <div class="spinner"></div>
            <span>Cataloging Monsters & Beasts...</span>
        </div>
    `;

    try {
        const [monstersData, categoriesData, lookupsData, _sourcesData, sharedUsageData] = await Promise.all([
            getMonsters(),
            getMonsterCategories().catch(() => []),
            getMonsterLookups().catch(() => null),
            getSourcesCached().catch(() => []),
            getSharedUsage().catch(() => [])
        ]);

        monsterCategories = categoriesData || [];
        monsterLookups = lookupsData || null;
        allMonsters = (monstersData || []).map(m => ({
            ...m,
            display_order: typeof m.display_order === 'number' ? m.display_order : 10.0,
            source: Array.isArray(m.source) ? m.source : (m.source ? [m.source] : [])
        }));

        sortByDisplayOrder(allMonsters);

        // Extract metadata for dropdown filters
        const catSet = new Set();
        const classSet = new Set();
        const crSet = new Set();
        const srcSet = new Set();

        // Seed categories from shared usage / lookups / database table
        if (Array.isArray(sharedUsageData)) {
            sharedUsageData.forEach(u => { if (u.name) catSet.add(u.name); });
        }
        if (monsterLookups?.categories && Array.isArray(monsterLookups.categories)) {
            monsterLookups.categories.forEach(c => catSet.add(c.name));
        }
        monsterCategories.forEach(c => catSet.add(c.name));

        allMonsters.forEach(item => {
            if (item.category) catSet.add(item.category.trim());
            if (item.classification) classSet.add(item.classification.trim());
            if (item.cr) crSet.add(item.cr.trim());
            if (item.source) {
                const keys = Array.isArray(item.source) ? item.source : extractSourceKeys(item.source);
                keys.forEach(k => srcSet.add(k));
            }
        });

        availableCategories = Array.from(catSet).sort();
        availableClassifications = ['Core', 'Supplemental', 'Adventures', 'Non-FR'].filter(c => classSet.has(c));
        classSet.forEach(c => {
            if (!availableClassifications.includes(c)) availableClassifications.push(c);
        });

        // Sort CR numerically
        availableCRs = Array.from(crSet).sort((a, b) => {
            const numA = parseCRToNumeric(a);
            const numB = parseCRToNumeric(b);
            if (numA !== numB) return numA - numB;
            return a.localeCompare(b);
        });

        availableSourceKeys = Array.from(srcSet).sort();

        applyFilters();
        renderView();

        if (pendingMonsterTarget) {
            const target = pendingMonsterTarget;
            pendingMonsterTarget = null;
            highlightMonsterItem(target);
        }
    } catch (err) {
        console.error('Error initializing Monsters:', err);
        container.innerHTML = `<div class="ac-error-state"><p>Failed to load monster data: ${esc(err.message)}</p></div>`;
    }
}

/**
 * Filters dataset based on search term and active controls.
 */
function applyFilters() {
    currentPage = 1;
    const term = currentSearchTerm.toLowerCase().trim();

    filteredMonsters = allMonsters.filter(item => {
        if (selectedRulesetFilter !== 'ALL' && item.ruleset !== selectedRulesetFilter) return false;
        if (selectedCategoryFilter !== 'ALL' && item.category !== selectedCategoryFilter) return false;
        if (selectedClassificationFilter !== 'ALL' && item.classification !== selectedClassificationFilter) return false;
        if (selectedCRFilter !== 'ALL' && item.cr !== selectedCRFilter) return false;
        
        if (selectedSourceFilter !== 'ALL') {
            const itemKeys = Array.isArray(item.source) ? item.source : extractSourceKeys(item.source);
            if (!itemKeys.includes(selectedSourceFilter)) return false;
        }

        if (term) {
            const sourcesStr = Array.isArray(item.source) ? item.source.join(' ') : String(item.source || '');
            const matches = 
                (item.name && item.name.toLowerCase().includes(term)) ||
                (item.check_id && item.check_id.toLowerCase().includes(term)) ||
                (item.category && item.category.toLowerCase().includes(term)) ||
                (item.classification && item.classification.toLowerCase().includes(term)) ||
                (item.cr && item.cr.toLowerCase().includes(term)) ||
                (item.creature_type && item.creature_type.toLowerCase().includes(term)) ||
                (item.notes_advice && item.notes_advice.toLowerCase().includes(term)) ||
                sourcesStr.toLowerCase().includes(term);
            if (!matches) return false;
        }

        return true;
    });
}

/**
 * Mounts the overall layout and toolbar shell into the container once.
 */
function renderView() {
    const container = document.getElementById('ac-view-monsters');
    if (!container) return;

    container.innerHTML = `
        <div class="ac-monsters-notice-banner ac-category-guidelines-banner" style="margin-bottom: 1.25rem; padding: 0.9rem 1.25rem;">
            <p style="margin: 0; font-size: 0.95rem;">
                Official Monsters listed here. For Hawthorne Homebrew Monsters, please <a href="/Guides/monsters/">Go to the Monster Compendium in the Field Guide</a>.
            </p>
        </div>

        <div class="ac-monsters-toolbar ac-classes-toolbar">
            <div class="ac-monsters-stats ac-classes-stats" id="monsters-stats">
                Showing <strong>${filteredMonsters.length}</strong> ${filteredMonsters.length === 1 ? 'Monster' : 'Monsters'}
            </div>
            <div class="ac-monsters-controls ac-classes-controls">
                <select class="ac-filter-select" id="monsters-ruleset-filter" aria-label="Filter by Ruleset" title="Filter by Ruleset">
                    <option value="ALL">All Rulesets</option>
                    <option value="2024" ${selectedRulesetFilter === '2024' ? 'selected' : ''}>2024</option>
                    <option value="2014" ${selectedRulesetFilter === '2014' ? 'selected' : ''}>2014</option>
                </select>
                <select class="ac-filter-select" id="monsters-category-filter" aria-label="Filter by Usage" title="Filter by Usage">
                    <option value="ALL">All Usages (${availableCategories.length})</option>
                    ${availableCategories.map(c => `<option value="${esc(c)}" ${selectedCategoryFilter === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
                </select>
                <select class="ac-filter-select" id="monsters-cr-filter" aria-label="Filter by Challenge Rating" title="Filter by Challenge Rating">
                    <option value="ALL">All CRs (${availableCRs.length})</option>
                    ${availableCRs.map(cr => `<option value="${esc(cr)}" ${selectedCRFilter === cr ? 'selected' : ''}>CR ${esc(cr)}</option>`).join('')}
                </select>
                <select class="ac-filter-select" id="monsters-classification-filter" aria-label="Filter by Source Type" title="Filter by Source Type">
                    <option value="ALL">All Source Types (${availableClassifications.length})</option>
                    ${availableClassifications.map(c => `<option value="${esc(c)}" ${selectedClassificationFilter === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
                </select>
                <select class="ac-filter-select" id="monsters-source-filter" aria-label="Filter by Source" title="Filter by Source">
                    <option value="ALL">All Sources (${availableSourceKeys.length})</option>
                    ${availableSourceKeys.map(k => `<option value="${esc(k)}" ${selectedSourceFilter === k ? 'selected' : ''}>${esc(k)}</option>`).join('')}
                </select>
            </div>
        </div>

        <div class="ac-table-wrapper" id="monsters-table-container">
            <!-- Table mounted here -->
        </div>
    `;

    setupControls();
    setupDelegatedInteractions();
    renderTableBody();
}

/**
 * Renders or updates only the table body and stats counter without DOM thrashing.
 */
function renderTableBody() {
    const container = document.getElementById('monsters-table-container');
    const statsEl = document.getElementById('monsters-stats');
    if (!container) return;

    const totalCount = filteredMonsters.length;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filteredMonsters.slice(startIndex, startIndex + PAGE_SIZE);

    if (statsEl) {
        if (totalCount <= PAGE_SIZE) {
            statsEl.innerHTML = `Showing <strong>${totalCount}</strong> ${totalCount === 1 ? 'Monster' : 'Monsters'}`;
        } else {
            const endCount = Math.min(startIndex + pageItems.length, totalCount);
            statsEl.innerHTML = `Showing <strong>${startIndex + 1}–${endCount}</strong> of <strong>${totalCount}</strong> Monsters`;
        }
    }

    const isAdmin = getAdminMode();

    if (filteredMonsters.length === 0) {
        container.innerHTML = `
            <div class="ac-no-results">
                <p>No monsters found matching your filter criteria.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <table class="ac-table" id="monsters-table">
            <thead>
                <tr>
                    <th style="min-width: 170px;">Name</th>
                    <th style="width: 75px; text-align: center;">Ruleset</th>
                    <th style="width: 110px; text-align: center;">Usage</th>
                    <th style="width: 75px; text-align: center;">CR</th>
                    <th style="min-width: 130px;">Creature Type</th>
                    <th style="width: 115px; text-align: center;">Source Type</th>
                    <th style="width: 110px; text-align: center;">Source</th>
                    <th style="min-width: 180px;">Notes / Advice</th>
                    ${isAdmin ? '<th style="width: 80px; text-align: center;">Actions</th>' : ''}
                </tr>
            </thead>
            <tbody>
                ${pageItems.map(item => `
                    <tr data-id="${item.id}" style="cursor: pointer;">
                        <td>
                            <div class="ac-item-name-cell">
                                <strong>${esc(item.name)}</strong>
                                <button type="button" 
                                        class="ac-btn-copy-link" 
                                        data-id="${esc(item.id)}" 
                                        data-item-id="${esc(slugify(item.name) || item.id)}" 
                                        title="Copy direct link to ${esc(item.name)}" 
                                        aria-label="Copy direct link to ${esc(item.name)}">
                                    🔗
                                </button>
                            </div>
                        </td>
                        <td style="text-align: center;">${renderRulesetPill(item.ruleset)}</td>
                        <td style="text-align: center;"><span class="ac-category-pill">${esc(item.category)}</span></td>
                        <td style="text-align: center;"><span class="ac-cr-pill">${esc(item.cr || '—')}</span></td>
                        <td>${esc(item.creature_type || '—')}</td>
                        <td style="text-align: center;">${esc(item.classification)}</td>
                        <td style="text-align: center;">${renderSourceBadges(item.source)}</td>
                        <td class="col-notes">${formatExpandableText(item.notes_advice, 160)}</td>
                        ${isAdmin ? `
                            <td class="col-actions" style="text-align: center;">
                                <button class="ac-btn-admin ac-btn-sm btn-edit" data-id="${item.id}" title="Edit Monster">✏️</button>
                                <button class="ac-btn-admin ac-btn-sm ac-btn-delete btn-del" data-id="${item.id}" title="Delete Monster">🗑️</button>
                            </td>
                        ` : ''}
                    </tr>
                `).join('')}
            </tbody>
        </table>
        ${totalPages > 1 ? `
            <div class="ac-pagination-bar" style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; padding: 0.5rem 0;">
                <button type="button" class="ac-btn-admin ac-btn-secondary ac-btn-sm btn-prev-page" ${currentPage === 1 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>← Previous ${PAGE_SIZE}</button>
                <span class="ac-page-indicator" style="font-size: 0.88rem; font-weight: 500;">Page <strong>${currentPage}</strong> of <strong>${totalPages}</strong></span>
                <button type="button" class="ac-btn-admin ac-btn-secondary ac-btn-sm btn-next-page" ${currentPage === totalPages ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>Next ${PAGE_SIZE} →</button>
            </div>
        ` : ''}
    `;

    attachExpandableTextListeners(container);

    // Direct event bindings for staff action buttons
    container.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const item = allMonsters.find(i => String(i.id) === String(btn.dataset.id));
            if (item) openMonsterForm(item);
        });
    });

    container.querySelectorAll('.btn-del').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const item = allMonsters.find(i => String(i.id) === String(btn.dataset.id));
            if (item) confirmAndDeleteMonster(item);
        });
    });
}

/**
 * Sets up toolbar dropdown filter event listeners.
 */
function setupControls() {
    const rulesetSelect = document.getElementById('monsters-ruleset-filter');
    const catSelect = document.getElementById('monsters-category-filter');
    const classSelect = document.getElementById('monsters-classification-filter');
    const crSelect = document.getElementById('monsters-cr-filter');
    const srcSelect = document.getElementById('monsters-source-filter');

    if (rulesetSelect) rulesetSelect.onchange = (e) => {
        selectedRulesetFilter = e.target.value;
        applyFilters();
        renderTableBody();
    };
    if (catSelect) catSelect.onchange = (e) => {
        selectedCategoryFilter = e.target.value;
        applyFilters();
        renderTableBody();
    };
    if (classSelect) classSelect.onchange = (e) => {
        selectedClassificationFilter = e.target.value;
        applyFilters();
        renderTableBody();
    };
    if (crSelect) crSelect.onchange = (e) => {
        selectedCRFilter = e.target.value;
        applyFilters();
        renderTableBody();
    };
    if (srcSelect) srcSelect.onchange = (e) => {
        selectedSourceFilter = e.target.value;
        applyFilters();
        renderTableBody();
    };
}

/**
 * Event delegation on the table wrapper for row clicks and action buttons.
 */
function setupDelegatedInteractions() {
    const container = document.getElementById('monsters-table-container');
    if (!container) return;

    container.onclick = (e) => {
        // Previous page button clicked
        const prevBtn = e.target.closest('.btn-prev-page');
        if (prevBtn) {
            e.stopPropagation();
            if (currentPage > 1) {
                currentPage--;
                renderTableBody();
                container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            return;
        }

        // Next page button clicked
        const nextBtn = e.target.closest('.btn-next-page');
        if (nextBtn) {
            e.stopPropagation();
            const totalPages = Math.ceil(filteredMonsters.length / PAGE_SIZE) || 1;
            if (currentPage < totalPages) {
                currentPage++;
                renderTableBody();
                container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            return;
        }

        // Direct Copy Link Button
        const copyBtn = e.target.closest('.ac-btn-copy-link');
        if (copyBtn) {
            e.stopPropagation();
            const id = copyBtn.dataset.id;
            const item = allMonsters.find(i => String(i.id) === String(id));
            if (item) copyDirectLink('monsters', item);
            return;
        }

        // Edit button clicked
        const editBtn = e.target.closest('.btn-edit');
        if (editBtn) {
            e.stopPropagation();
            const item = allMonsters.find(i => String(i.id) === String(editBtn.dataset.id));
            if (item) openMonsterForm(item);
            return;
        }

        // Delete button clicked
        const delBtn = e.target.closest('.btn-del');
        if (delBtn) {
            e.stopPropagation();
            const item = allMonsters.find(i => String(i.id) === String(delBtn.dataset.id));
            if (item) confirmAndDeleteMonster(item);
            return;
        }

        // Table row clicked -> Detail Modal (skip if clicking links, buttons, or action cells)
        const row = e.target.closest('tr[data-id]');
        if (row && !e.target.closest('a') && !e.target.closest('button') && !e.target.closest('.col-actions')) {
            const item = allMonsters.find(i => String(i.id) === String(row.dataset.id));
            if (item) showDetailModal(item);
        }
    };
}

/**
 * External search filter handler invoked by ac-main.js global search.
 * 
 * @param {string} term
 */
export function filterMonsters(term) {
    currentSearchTerm = term || '';
    applyFilters();
    renderTableBody();
}

/**
 * Opens detail modal for a monster.
 * 
 * @param {Object} item
 */
export function showDetailModal(item) {
    const isAdmin = getAdminMode();
    const html = `
        <div class="detail-header">
            <div>
                <span class="detail-category">${esc(item.category || 'Monster')} &bull; ${esc(item.classification || 'Source Type')}</span>
                <h2 class="detail-title">${esc(item.name)}</h2>
            </div>
            ${isAdmin ? `
                <div class="detail-actions">
                    <button id="modal-btn-edit" class="ac-btn-admin ac-btn-primary">✏️ Edit</button>
                    <button id="modal-btn-delete" class="ac-btn-admin ac-btn-delete">🗑️ Delete</button>
                </div>
            ` : ''}
        </div>
        <div class="detail-grid">
            <div class="detail-item"><label>Check ID</label><value><code>${esc(item.check_id)}</code></value></div>
            <div class="detail-item"><label>Ruleset</label><value>${renderRulesetPill(item.ruleset)}</value></div>
            <div class="detail-item"><label>Usage</label><value><span class="ac-category-pill">${esc(item.category)}</span></value></div>
            <div class="detail-item"><label>Challenge Rating (CR)</label><value><span class="ac-cr-pill">${esc(item.cr || '—')}</span></value></div>
            <div class="detail-item"><label>Creature Type</label><value>${esc(item.creature_type || '—')}</value></div>
            <div class="detail-item"><label>Source Type</label><value>${esc(item.classification)}</value></div>
            <div class="detail-item"><label>Sources</label><value>${renderSourceBadges(item.source)}</value></div>
        </div>
        ${item.notes_advice ? `
            <div class="detail-section">
                <label>Notes & Advice</label>
                <div class="detail-text">${renderMarkdownLinks(item.notes_advice)}</div>
            </div>
        ` : ''}
    `;
    openModal(html);
    setModalItem('monsters', item);

    if (isAdmin) {
        document.getElementById('modal-btn-edit')?.addEventListener('click', () => {
            openMonsterForm(item);
        });
        document.getElementById('modal-btn-delete')?.addEventListener('click', () => {
            confirmAndDeleteMonster(item);
        });
    }
}

/**
 * Highlights a specific monster from a direct link or query identifier:
 * - Resets active filters if the item is currently hidden.
 * - Navigates to the correct pagination page.
 * - Smoothly scrolls the item row into view with a visual pulse highlight.
 * - Automatically opens the item's detail modal.
 * 
 * @param {string} identifier - Item name slug, UUID id, or check_id
 * @returns {Promise<boolean>} True if item was found and opened
 */
export async function highlightMonsterItem(identifier) {
    if (!identifier) return false;

    if (!allMonsters || allMonsters.length === 0) {
        pendingMonsterTarget = identifier;
        return true;
    }

    const cleanId = String(identifier).trim().toLowerCase();
    const item = allMonsters.find(i => 
        (i.name && slugify(i.name) === cleanId) ||
        (i.name && i.name.toLowerCase() === cleanId) ||
        (i.id && String(i.id).toLowerCase() === cleanId) ||
        (i.check_id && i.check_id.toLowerCase() === cleanId)
    );

    if (!item) return false;

    // 1. Clear filters if hidden
    let filtersReset = false;
    if (selectedRulesetFilter !== 'ALL' && item.ruleset !== selectedRulesetFilter) {
        selectedRulesetFilter = 'ALL';
        const rSelect = document.getElementById('monsters-ruleset-filter');
        if (rSelect) rSelect.value = 'ALL';
        filtersReset = true;
    }
    if (selectedCategoryFilter !== 'ALL' && item.category !== selectedCategoryFilter) {
        selectedCategoryFilter = 'ALL';
        const cSelect = document.getElementById('monsters-category-filter');
        if (cSelect) cSelect.value = 'ALL';
        filtersReset = true;
    }
    if (selectedClassificationFilter !== 'ALL' && item.classification !== selectedClassificationFilter) {
        selectedClassificationFilter = 'ALL';
        const clSelect = document.getElementById('monsters-classification-filter');
        if (clSelect) clSelect.value = 'ALL';
        filtersReset = true;
    }
    if (selectedCRFilter !== 'ALL' && item.cr !== selectedCRFilter) {
        selectedCRFilter = 'ALL';
        const crSelect = document.getElementById('monsters-cr-filter');
        if (crSelect) crSelect.value = 'ALL';
        filtersReset = true;
    }
    if (selectedSourceFilter !== 'ALL') {
        selectedSourceFilter = 'ALL';
        const sSelect = document.getElementById('monsters-source-filter');
        if (sSelect) sSelect.value = 'ALL';
        filtersReset = true;
    }
    if (currentSearchTerm) {
        currentSearchTerm = '';
        const searchInput = document.getElementById('ac-global-search');
        if (searchInput) searchInput.value = '';
        filtersReset = true;
    }

    applyFilters();

    // 2. Adjust pagination
    const itemIndex = filteredMonsters.findIndex(i => String(i.id) === String(item.id));
    if (itemIndex >= 0) {
        currentPage = Math.floor(itemIndex / PAGE_SIZE) + 1;
    }
    renderTableBody();

    // 3. Highlight row & scroll
    const row = document.querySelector(`tr[data-id="${item.id}"]`);
    if (row) {
        if (typeof row.scrollIntoView === 'function') {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        row.classList.remove('ac-row-highlighted');
        if (row.offsetWidth !== undefined) void row.offsetWidth;
        row.classList.add('ac-row-highlighted');
        setTimeout(() => row.classList.remove('ac-row-highlighted'), 4000);
    }

    // 4. Open modal
    showDetailModal(item);
    return true;
}

/**
 * Opens staff add/edit modal form.
 * 
 * @param {Object|null} [item=null]
 */
export async function openMonsterForm(item = null) {
    const isEdit = !!item;
    const defaultOrder = isEdit ? item.display_order : getNextDisplayOrder(allMonsters, 10);
    let selectedSources = item?.source 
        ? (Array.isArray(item.source) ? [...item.source] : extractSourceKeys(item.source)) 
        : ['MM2024'];

    const categories = availableCategories.length > 0 ? availableCategories : ['Fair Game', 'Full DM Only'];
    const classifications = availableClassifications.length > 0 ? availableClassifications : ['Core', 'Supplemental', 'Adventures', 'Non-FR'];

    const html = `
        <div class="detail-header">
            <h2>${isEdit ? `Edit: ${esc(item.name)}` : 'Add New Monster'}</h2>
        </div>
        <form id="ac-monster-form" class="ac-edit-form">
            <div class="ac-form-grid">
                <div class="ac-form-group">
                    <label>Name *</label>
                    <input type="text" id="form-name" required value="${esc(item?.name || '')}" class="ac-form-input">
                </div>
                <div class="ac-form-group">
                    <label>Ruleset *</label>
                    <select id="form-ruleset" class="ac-form-select" required>
                        <option value="2024" ${item?.ruleset === '2024' || !isEdit ? 'selected' : ''}>2024</option>
                        <option value="2014" ${item?.ruleset === '2014' ? 'selected' : ''}>2014</option>
                    </select>
                </div>
            </div>

            <div class="ac-form-grid">
                <div class="ac-form-group">
                    <label>Usage *</label>
                    <select id="form-category" class="ac-form-select" required>
                        ${categories.map(c => `
                            <option value="${esc(c)}" ${item?.category === c ? 'selected' : ''}>${esc(c)}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="ac-form-group">
                    <label>Source Type *</label>
                    <select id="form-classification" class="ac-form-select" required>
                        ${classifications.map(c => `
                            <option value="${esc(c)}" ${item?.classification === c ? 'selected' : ''}>${esc(c)}</option>
                        `).join('')}
                    </select>
                </div>
            </div>

            <div class="ac-form-grid">
                <div class="ac-form-group">
                    <label>Challenge Rating (CR)</label>
                    <input type="text" id="form-cr" value="${esc(item?.cr || '')}" placeholder="e.g. 1/4, 2, 10" class="ac-form-input">
                </div>
                <div class="ac-form-group">
                    <label>Creature Type</label>
                    <input type="text" id="form-type" value="${esc(item?.creature_type || '')}" placeholder="e.g. Dragon, Monstrosity" class="ac-form-input">
                </div>
            </div>

            <div class="ac-form-group">
                <label>Sources *</label>
                <div id="form-source-picker"></div>
            </div>

            <div class="ac-form-group">
                <label>Display Order</label>
                <input type="number" step="any" id="form-order" value="${defaultOrder}" class="ac-form-input">
            </div>

            <div class="ac-form-group">
                <label>Notes & Advice</label>
                <textarea id="form-notes" rows="3" class="ac-form-textarea" placeholder="Rage advice, DM notes, variants...">${esc(item?.notes_advice || '')}</textarea>
            </div>

            <div class="ac-form-actions">
                <button type="button" class="ac-btn-admin ac-btn-secondary" id="form-cancel">Cancel</button>
                <button type="submit" class="ac-btn-admin ac-btn-primary" id="form-submit">Save</button>
            </div>
        </form>
    `;

    openModal(html);

    // Initialize source tag picker
    const pickerContainer = document.getElementById('form-source-picker');
    renderSourceTagPicker({
        containerEl: pickerContainer,
        selectedKeys: selectedSources,
        availableKeys: availableSourceKeys.length > 0 ? availableSourceKeys : ['MM2024', 'PHB2024', 'MM2014'],
        onChange: (updatedKeys) => { selectedSources = updatedKeys; }
    });

    document.getElementById('form-cancel').onclick = closeModal;

    const form = document.getElementById('ac-monster-form');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('form-submit');
        submitBtn.disabled = true;

        const categoryVal = document.getElementById('form-category').value;
        const matchedCat = monsterCategories.find(c => c.name === categoryVal);
        const categoryId = matchedCat?.id || (categoryVal === 'Fair Game' ? 'c1ce104d-076e-4eaa-b464-06467a67ddcd' : 'a4a35cf9-768c-5722-a9b0-92ee7e02b78a');

        const payload = {
            name: document.getElementById('form-name').value.trim(),
            ruleset: document.getElementById('form-ruleset').value,
            category: categoryVal,
            category_id: categoryId,
            classification: document.getElementById('form-classification').value,
            cr: document.getElementById('form-cr').value.trim() || null,
            creature_type: document.getElementById('form-type').value.trim() || null,
            source: selectedSources,
            display_order: cleanFloat(parseFloat(document.getElementById('form-order').value) || defaultOrder),
            notes_advice: document.getElementById('form-notes').value.trim() || null
        };

        if (!isEdit) {
            // Generate next available MON_ check_id for staff addition
            const maxMonNum = allMonsters.reduce((max, m) => {
                const match = m.check_id?.match(/^MON_(\d+)$/);
                return match ? Math.max(max, parseInt(match[1], 10)) : max;
            }, 0);
            payload.check_id = `MON_${String(maxMonNum + 1).padStart(4, '0')}`;
        }

        try {
            if (isEdit) {
                const { error } = await updateMonster(item.id, payload);
                if (error) throw error;
                showToast('Monster updated successfully!');
            } else {
                const { error } = await createMonster(payload);
                if (error) throw error;
                showToast('Monster created successfully!');
            }
            closeModal();
            await initMonsters(true);
            window.dispatchEvent(new CustomEvent('ac:monsters-updated'));
        } catch (err) {
            console.error('Error saving Monster:', err);
            alert(`Save failed: ${err.message || err}`);
            submitBtn.disabled = false;
        }
    };
}

/**
 * Confirms and executes deletion.
 * 
 * @param {Object} item
 */
export async function confirmAndDeleteMonster(item) {
    if (!item) return;
    const confirmed = window.confirm(`Are you sure you want to delete monster "${item.name}"?`);
    if (!confirmed) return;

    try {
        const { success, error } = await deleteMonster(item.id);
        if (!success) throw error || new Error('Delete failed');

        closeModal();
        showToast('Monster deleted successfully!');
        await initMonsters(true);
        window.dispatchEvent(new CustomEvent('ac:monsters-updated'));
    } catch (err) {
        console.error('Error deleting monster:', err);
        alert(`Delete failed: ${err.message || err}`);
    }
}

/**
 * Opens generic options manager for configuring Monster Usage Levels.
 * Delegates to the shared Usage options manager shared across Allowed Content tabs.
 */
export async function openMonstersOptionsModal() {
    return openUsageOptionsModal({
        onSaved: async () => {
            await initMonsters(true);
        }
    });
}

// Invalidate in-memory cache when mutation event is broadcast
if (typeof window !== 'undefined') {
    window.addEventListener('ac:monsters-updated', () => {
        allMonsters = [];
    });
    window.addEventListener('ac:usage-updated', () => {
        allMonsters = [];
    });
}

