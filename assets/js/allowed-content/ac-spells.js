/**
 * ================================================================
 * AC SPELLS MODULE
 * ================================================================
 * 
 * Presentation, filtering, and administration controller for
 * Allowed Content Spells.
 * 
 * Responsibilities:
 * - Rendering spells catalog with editions ('2014' / '2024'), sources, notes, and rage advice.
 * - Multi-criteria toolbar: Ruleset filter, Source filter, and live text search.
 * - Interactive detail modal on row click.
 * - Staff administration workflows (Add, Edit, Delete) with fractional order indexing.
 * 
 * @module ACSpells
 */

import { 
    getSpells, 
    createSpell, 
    updateSpell, 
    deleteSpell,
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
let allSpells = [];
let filteredSpells = [];
let availableSourceKeys = [];

// Active toolbar filters
let selectedRulesetFilter = 'ALL';   // 'ALL' | '2014' | '2024'
let selectedSourceFilter = 'ALL';    // 'ALL' | specific source_key
let currentSearchTerm = '';

/**
 * Initializes the Spells view.
 * 
 * @param {boolean} [forceRefresh=false]
 */
export async function initSpells(forceRefresh = false) {
    const container = document.getElementById('ac-view-spells');
    if (!container) return;

    if (forceRefresh) {
        selectedRulesetFilter = 'ALL';
        selectedSourceFilter = 'ALL';
        currentSearchTerm = '';
    } else if (allSpells.length > 0) {
        applyFilters();
        updateTableOnly();
        return;
    }

    container.innerHTML = `
        <div class="ac-loading">
            <div class="spinner"></div>
            <span>Cataloging Spells & Incantations...</span>
        </div>
    `;

    try {
        const [spellsData, _sourcesMap] = await Promise.all([
            getSpells(),
            getSourcesMap(forceRefresh)
        ]);

        allSpells = sortByDisplayOrder(spellsData || []);

        // Extract metadata for dropdown filters
        const srcSet = new Set();
        allSpells.forEach(s => {
            if (s.source) {
                extractSourceKeys(s.source).forEach(k => srcSet.add(k));
            }
        });
        availableSourceKeys = Array.from(srcSet).sort();

        applyFilters();
        renderView();
    } catch (err) {
        console.error('Error initializing Spells module:', err);
        container.innerHTML = `
            <div class="ac-error-state">
                <p>Failed to load spells: ${esc(err.message)}</p>
                <button class="ac-btn-admin ac-btn-sm" onclick="window.location.reload()">Retry</button>
            </div>
        `;
    }
}

/**
 * Applies active toolbar filters and search query to allSpells.
 */
function applyFilters() {
    const term = (currentSearchTerm || '').trim().toLowerCase();

    filteredSpells = allSpells.filter(spell => {
        // 1. Ruleset Filter
        if (selectedRulesetFilter !== 'ALL' && spell.ruleset !== selectedRulesetFilter) {
            return false;
        }

        // 2. Source Filter
        if (selectedSourceFilter !== 'ALL') {
            const spellSources = spell.source ? extractSourceKeys(spell.source) : [];
            if (!spellSources.includes(selectedSourceFilter) && spell.source !== selectedSourceFilter) {
                return false;
            }
        }

        // 3. Search Filter
        if (term) {
            const matches = 
                (spell.name && spell.name.toLowerCase().includes(term)) ||
                (spell.ruleset && spell.ruleset.toLowerCase().includes(term)) ||
                (spell.source && spell.source.toLowerCase().includes(term)) ||
                (spell.check_id && spell.check_id.toLowerCase().includes(term)) ||
                (spell.notes && spell.notes.toLowerCase().includes(term)) ||
                (spell.rage_advice && spell.rage_advice.toLowerCase().includes(term));

            if (!matches) return false;
        }

        return true;
    });
}

/**
 * Searches / filters spells dynamically from global search input.
 * 
 * @param {string} term
 */
export function filterSpells(term) {
    currentSearchTerm = term;
    applyFilters();
    updateTableOnly();
}

/**
 * Renders the full Spells view shell including toolbar and table container.
 */
function renderView() {
    const container = document.getElementById('ac-view-spells');
    if (!container) return;

    const isAdmin = getAdminMode();

    container.innerHTML = `
        <div class="ac-spells-container">
            <!-- Toolbar: Filters and Stats -->
            <div class="ac-spells-toolbar ac-classes-toolbar">
                <div class="ac-spells-stats ac-classes-stats" id="spells-stats">
                    Showing <strong>${filteredSpells.length}</strong> ${filteredSpells.length === 1 ? 'Spell Group' : 'Spell Groups'}
                </div>

                <div class="ac-spells-controls ac-classes-controls">
                    <!-- Ruleset Filter -->
                    <select id="ac-spells-ruleset-filter" class="ac-filter-select" title="Filter by Ruleset" aria-label="Filter by Ruleset">
                        <option value="ALL">All Rulesets</option>
                        <option value="2024" ${selectedRulesetFilter === '2024' ? 'selected' : ''}>2024</option>
                        <option value="2014" ${selectedRulesetFilter === '2014' ? 'selected' : ''}>2014</option>
                    </select>

                    <!-- Sourcebook Filter -->
                    <select id="ac-spells-source-filter" class="ac-filter-select" title="Filter by Source" aria-label="Filter by Source">
                        <option value="ALL">All Sources (${availableSourceKeys.length})</option>
                        ${availableSourceKeys.map(k => `
                            <option value="${esc(k)}" ${selectedSourceFilter === k ? 'selected' : ''}>${esc(k)}</option>
                        `).join('')}
                    </select>
                </div>
            </div>

            <!-- Main Content Area: Table -->
            <div id="spells-table-container">
                ${renderTable(isAdmin)}
            </div>
        </div>
    `;

    setupControls();
    setupTableInteractions();
}

/**
 * Updates only the table content and stats count without rebuilding the toolbar shell.
 */
function updateTableOnly() {
    const tableContainer = document.getElementById('spells-table-container');
    const statsContainer = document.getElementById('spells-stats');
    const isAdmin = getAdminMode();

    if (statsContainer) {
        statsContainer.innerHTML = `Showing <strong>${filteredSpells.length}</strong> ${filteredSpells.length === 1 ? 'Spell Group' : 'Spell Groups'}`;
    }

    if (tableContainer) {
        tableContainer.innerHTML = renderTable(isAdmin);
        attachExpandableTextListeners(tableContainer);
    }
}

/**
 * Generates the HTML table for spells.
 * 
 * @param {boolean} isAdmin
 * @returns {string} Table HTML
 */
function renderTable(isAdmin) {
    if (filteredSpells.length === 0) {
        return `
            <div class="ac-table-wrapper">
                <table class="ac-table" id="spells-table">
                    <thead>
                        <tr>
                            <th class="col-spell-name" style="min-width: 200px;">Spell Group</th>
                            <th class="col-ruleset" style="width: 90px; text-align: center;">Ruleset</th>
                            <th class="col-source" style="width: 120px; text-align: center;">Source</th>
                            <th class="col-notes" style="min-width: 240px;">Notes / Description</th>
                            <th class="col-advice" style="min-width: 260px;">Rage Advice</th>
                            ${isAdmin ? '<th class="col-actions" style="width: 90px; text-align: center;">Actions</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="${isAdmin ? 6 : 5}" style="text-align: center; padding: 3rem;">
                                No spells found matching your criteria.
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    return `
        <div class="ac-table-wrapper">
            <table class="ac-table" id="spells-table">
                <thead>
                    <tr>
                        <th class="col-spell-name" style="min-width: 200px;">Spell Group</th>
                        <th class="col-ruleset" style="width: 90px; text-align: center;">Ruleset</th>
                        <th class="col-source" style="width: 120px; text-align: center;">Source</th>
                        <th class="col-notes" style="min-width: 240px;">Notes / Description</th>
                        <th class="col-advice" style="min-width: 260px;">Rage Advice</th>
                        ${isAdmin ? '<th class="col-actions" style="width: 90px; text-align: center;">Actions</th>' : ''}
                    </tr>
                </thead>
                <tbody>
                    ${filteredSpells.map(spell => `
                        <tr data-id="${spell.id}" class="ac-row">
                            <td class="col-spell-name">
                                <div class="name-cell">
                                    <strong>${esc(spell.name)}</strong>
                                    <span class="row-hover-icon">Details →</span>
                                </div>
                            </td>
                            <td class="col-ruleset" style="text-align: center;">
                                <span class="ruleset-pill ruleset-${esc(spell.ruleset || '2024')}">${esc(spell.ruleset || '2024')}</span>
                            </td>
                            <td class="col-source" style="text-align: center;">
                                ${renderSourceBadges(spell.source)}
                            </td>
                            <td class="col-notes">
                                ${spell.notes ? formatExpandableText(spell.notes, 160) : '<span style="opacity: 0.4;">—</span>'}
                            </td>
                            <td class="col-advice">
                                ${spell.rage_advice ? formatExpandableText(spell.rage_advice, 160) : '<span style="opacity: 0.4;">—</span>'}
                            </td>
                            ${isAdmin ? `
                                <td class="col-actions" style="text-align: center;" onclick="event.stopPropagation()">
                                    <button class="ac-btn-admin ac-btn-sm btn-edit" data-id="${spell.id}" title="Edit Spell">✏️</button>
                                    <button class="ac-btn-admin ac-btn-sm ac-btn-delete btn-del" data-id="${spell.id}" title="Delete Spell">🗑️</button>
                                </td>
                            ` : ''}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Binds event listeners for toolbar dropdowns.
 */
function setupControls() {
    const rulesetSelect = document.getElementById('ac-spells-ruleset-filter');
    if (rulesetSelect) {
        rulesetSelect.addEventListener('change', (e) => {
            selectedRulesetFilter = e.target.value;
            applyFilters();
            updateTableOnly();
        });
    }

    const sourceSelect = document.getElementById('ac-spells-source-filter');
    if (sourceSelect) {
        sourceSelect.addEventListener('change', (e) => {
            selectedSourceFilter = e.target.value;
            applyFilters();
            updateTableOnly();
        });
    }
}

/**
 * Attaches delegated click listeners to the table container.
 */
function setupTableInteractions() {
    const container = document.getElementById('spells-table-container');
    if (!container) return;

    attachExpandableTextListeners(container);

    container.addEventListener('click', (e) => {
        // Check if click was on expandable text toggle or admin buttons
        if (e.target.closest('.ac-expand-toggle') || e.target.closest('button')) {
            return;
        }

        const row = e.target.closest('tr[data-id]');
        if (!row) return;

        const spellId = row.dataset.id;
        const spell = allSpells.find(s => s.id === spellId);
        if (spell) {
            showSpellDetail(spell);
        }
    });

    // Delegated edit and delete listeners
    container.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.btn-edit');
        if (editBtn) {
            e.stopPropagation();
            const id = editBtn.dataset.id;
            const spell = allSpells.find(s => s.id === id);
            if (spell) openSpellForm(spell);
            return;
        }

        const delBtn = e.target.closest('.btn-del');
        if (delBtn) {
            e.stopPropagation();
            const id = delBtn.dataset.id;
            confirmAndDeleteSpell(id);
        }
    });
}

/**
 * Displays full detail for a Spell in a modal.
 * 
 * @param {Object} spell
 */
export function showSpellDetail(spell) {
    const sourceKey = spell.source ? extractSourceKeys(spell.source)[0] : null;
    const sourceObj = sourceKey ? getSourceByKey(sourceKey) : null;
    const sourceLink = sourceObj ? resolveSourceLink(sourceObj.link) : null;

    const html = `
        <div class="ac-detail-modal">
            <div class="detail-header" style="margin-bottom: 1.5rem;">
                <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem;">
                    <span class="ruleset-pill ruleset-${esc(spell.ruleset || '2024')}">${esc(spell.ruleset || '2024')}</span>
                    ${spell.check_id ? `<span class="check-id-badge" style="font-size: 0.8rem; background: var(--color-bg); padding: 2px 8px; border-radius: 4px; border: 1px solid var(--color-border); font-family: monospace;">${esc(spell.check_id)}</span>` : ''}
                </div>
                <h2 class="detail-title" style="margin: 0 0 0.5rem 0; font-family: var(--font-header);">${esc(spell.name)}</h2>
            </div>

            <div class="detail-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; background: var(--color-bg); padding: 1rem; border-radius: 6px; border: 1px solid var(--color-border);">
                <div class="detail-item">
                    <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--color-text-secondary); display: block; font-weight: 600;">Source</span>
                    <span style="font-weight: 600;">
                        ${sourceObj ? esc(sourceObj.name) : esc(spell.source)}
                        ${sourceLink ? `<a href="${sourceLink}" target="_blank" rel="noopener noreferrer" style="margin-left: 6px; font-size: 0.85rem;" title="View Source Reference">🔗</a>` : ''}
                    </span>
                </div>
                <div class="detail-item">
                    <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--color-text-secondary); display: block; font-weight: 600;">Ruleset Edition</span>
                    <span style="font-weight: 600;">${esc(spell.ruleset || '2024')}</span>
                </div>
                <div class="detail-item">
                    <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--color-text-secondary); display: block; font-weight: 600;">Display Order</span>
                    <span style="font-family: monospace;">${formatDisplayOrder(spell.display_order)}</span>
                </div>
            </div>

            ${spell.notes ? `
                <div class="detail-section" style="margin-bottom: 1.5rem;">
                    <h4 style="font-family: var(--font-header); margin-bottom: 0.5rem; border-bottom: 1px solid var(--color-border); padding-bottom: 0.3rem;">Notes & Description</h4>
                    <div style="white-space: pre-wrap; line-height: 1.5;">${renderMarkdownLinks(esc(spell.notes))}</div>
                </div>
            ` : ''}

            ${spell.rage_advice ? `
                <div class="detail-section" style="margin-bottom: 1rem;">
                    <h4 style="font-family: var(--font-header); margin-bottom: 0.5rem; border-bottom: 1px solid var(--color-border); padding-bottom: 0.3rem;">Rage Advice & Spell Guidance</h4>
                    <div class="advice-content" style="white-space: pre-wrap; line-height: 1.5; color: var(--color-text);">${renderMarkdownLinks(esc(spell.rage_advice))}</div>
                </div>
            ` : ''}
        </div>
    `;

    openModal(html);
}

/**
 * Opens form modal for creating or editing a Spell entry.
 * 
 * @param {Object|null} [spell=null]
 */
export function openSpellForm(spell = null) {
    const isEdit = !!spell;
    const currentSources = spell?.source ? extractSourceKeys(spell.source) : ['PHB2024'];
    let selectedSources = [...currentSources];
    const currentRuleset = spell?.ruleset || '2024';

    // Calculate suggested display order if adding new item
    let defaultOrder = 10.0;
    if (!isEdit) {
        defaultOrder = getNextDisplayOrder(allSpells);
    } else {
        defaultOrder = cleanFloat(spell.display_order ?? 10.0);
    }

    const html = `
        <div class="ac-form-modal">
            <h3 style="font-family: var(--font-header); margin-bottom: 1.25rem;">
                ${isEdit ? 'Edit Spell Entry' : 'Add New Spell Entry'}
            </h3>

            <form id="ac-spell-form" style="display: flex; flex-direction: column; gap: 1rem;">
                <div class="form-group" style="display: flex; flex-direction: column; gap: 0.35rem;">
                    <label for="spell-name" style="font-weight: 600; font-size: 0.85rem;">Spell / Group Name *</label>
                    <input type="text" id="spell-name" class="ac-input" required 
                           value="${isEdit ? esc(spell.name) : ''}" 
                           placeholder="e.g. Spells from PHB (2024)">
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-group" style="display: flex; flex-direction: column; gap: 0.35rem;">
                        <label for="spell-check-id" style="font-weight: 600; font-size: 0.85rem;">Check ID *</label>
                        <input type="text" id="spell-check-id" class="ac-input" required 
                               value="${isEdit ? esc(spell.check_id) : `SPL_${String(allSpells.length + 1).padStart(4, '0')}`}" 
                               placeholder="e.g. SPL_0021">
                    </div>

                    <div class="form-group" style="display: flex; flex-direction: column; gap: 0.35rem;">
                        <label for="spell-ruleset" style="font-weight: 600; font-size: 0.85rem;">Ruleset Edition *</label>
                        <select id="spell-ruleset" class="ac-filter-select" style="width: 100%;">
                            <option value="2024" ${currentRuleset === '2024' ? 'selected' : ''}>2024</option>
                            <option value="2014" ${currentRuleset === '2014' ? 'selected' : ''}>2014</option>
                        </select>
                    </div>
                </div>

                <div class="form-group" style="display: flex; flex-direction: column; gap: 0.35rem;">
                    <label style="font-weight: 600; font-size: 0.85rem;">Sourcebook *</label>
                    <div id="spell-source-picker-container"></div>
                </div>

                <div class="form-group" style="display: flex; flex-direction: column; gap: 0.35rem;">
                    <label for="spell-order" style="font-weight: 600; font-size: 0.85rem;">Display Order *</label>
                    <input type="number" step="0.0001" id="spell-order" class="ac-input" required 
                           value="${defaultOrder}">
                    <small style="color: var(--color-text-secondary); font-size: 0.75rem;">
                        Controls sorting sequence. Use decimal increments (e.g. 17.5) to position between existing entries.
                    </small>
                </div>

                <div class="form-group" style="display: flex; flex-direction: column; gap: 0.35rem;">
                    <label for="spell-notes" style="font-weight: 600; font-size: 0.85rem;">Notes / Description</label>
                    <textarea id="spell-notes" class="ac-input" rows="4" 
                              placeholder="Allowed content notes, community spellbook details, etc.">${isEdit ? esc(spell.notes || '') : ''}</textarea>
                </div>

                <div class="form-group" style="display: flex; flex-direction: column; gap: 0.35rem;">
                    <label for="spell-advice" style="font-weight: 600; font-size: 0.85rem;">Rage Advice & Spell Rulings</label>
                    <textarea id="spell-advice" class="ac-input" rows="5" 
                              placeholder="Bullet-point rulings, ban details, class availability, etc.">${isEdit ? esc(spell.rage_advice || '') : ''}</textarea>
                </div>

                <div id="spell-form-error" style="color: #d9534f; font-size: 0.85rem; display: none;"></div>

                <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem;">
                    <button type="button" class="ac-btn-admin ac-btn-sm" id="btn-cancel-spell">Cancel</button>
                    <button type="submit" class="ac-btn-admin ac-btn-sm" style="background: var(--color-primary); color: white;" id="btn-save-spell">
                        ${isEdit ? 'Save Changes' : 'Create Spell'}
                    </button>
                </div>
            </form>
        </div>
    `;

    openModal(html);

    renderSourceTagPicker({
        containerEl: document.getElementById('spell-source-picker-container'),
        selectedKeys: selectedSources,
        availableKeys: availableSourceKeys.length > 0 ? availableSourceKeys : ['PHB2024', 'PHB2014', 'EEPC', 'SCAG', 'XGE', 'TCE'],
        onChange: (updated) => { selectedSources = updated; }
    });

    const form = document.getElementById('ac-spell-form');
    const cancelBtn = document.getElementById('btn-cancel-spell');
    const errorEl = document.getElementById('spell-form-error');

    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorEl.style.display = 'none';

            if (selectedSources.length === 0) {
                errorEl.textContent = 'Please select at least one source.';
                errorEl.style.display = 'block';
                return;
            }

            const name = document.getElementById('spell-name').value.trim();
            const checkId = document.getElementById('spell-check-id').value.trim();
            const ruleset = document.getElementById('spell-ruleset').value;
            const displayOrder = parseFloat(document.getElementById('spell-order').value) || 0.0;
            const notes = document.getElementById('spell-notes').value.trim() || null;
            const rageAdvice = document.getElementById('spell-advice').value.trim() || null;

            if (!name) {
                errorEl.textContent = 'Name is required.';
                errorEl.style.display = 'block';
                return;
            }

            const payload = {
                name,
                check_id: checkId,
                ruleset,
                source: selectedSources[0], // ac_spells links 1 primary source key
                display_order: displayOrder,
                notes,
                rage_advice: rageAdvice
            };

            const saveBtn = document.getElementById('btn-save-spell');
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';

            try {
                let res;
                if (isEdit) {
                    res = await updateSpell(spell.id, payload);
                } else {
                    res = await createSpell(payload);
                }

                if (res.error) {
                    throw new Error(res.error.message || 'Operation failed');
                }

                closeModal();
                showToast(`Spell "${name}" ${isEdit ? 'updated' : 'created'} successfully.`, 'success');
                
                // Invalidate cache and reload
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('ac:spells-updated'));
                }
                await initSpells(true);
            } catch (err) {
                console.error('Error saving spell:', err);
                errorEl.textContent = `Error: ${err.message}`;
                errorEl.style.display = 'block';
                saveBtn.disabled = false;
                saveBtn.textContent = isEdit ? 'Save Changes' : 'Create Spell';
            }
        });
    }
}

/**
 * Confirms and deletes a Spell record.
 * 
 * @param {string} id
 */
export async function confirmAndDeleteSpell(id) {
    const spell = allSpells.find(s => s.id === id);
    if (!spell) return;

    const confirmed = window.confirm(`Are you sure you want to delete "${spell.name}"?`);
    if (!confirmed) return;

    try {
        const { success, error } = await deleteSpell(id);
        if (!success || error) {
            throw new Error(error?.message || 'Delete failed');
        }

        showToast(`Spell "${spell.name}" deleted.`, 'success');
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ac:spells-updated'));
        }
        await initSpells(true);
    } catch (err) {
        console.error('Error deleting spell:', err);
        showToast(`Error deleting spell: ${err.message}`, 'error');
    }
}

// Invalidate in-memory cache when mutated
if (typeof window !== 'undefined') {
    window.addEventListener('ac:spells-updated', () => {
        allSpells = [];
    });
}
