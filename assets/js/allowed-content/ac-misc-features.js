/**
 * ================================================================
 * AC MISC CLASS FEATURES MODULE
 * ================================================================
 * 
 * Unified module for Miscellaneous Class Features:
 * 1. Fighting Styles (ac_fighting_styles)
 * 2. Artificer Infusions (ac_artificer_infusions)
 * 3. Eldritch Invocations (ac_eldritch_invocations)
 * 
 * Features:
 * - Single-tab view presenting all 3 feature categories in stacked sections (matching spreadsheet layout).
 * - Quick Jump chip navigation to smoothly scroll between sections.
 * - Multi-criteria toolbar: Section filter, Ruleset filter ('2014' / '2024'), and Sourcebook filter.
 * - Global search integration filtering across all three feature domains simultaneously.
 * - Interactive detail modal on row click with comprehensive metadata and audit check_id.
 * - Full staff administration workflows (Add, Edit, Delete) for each of the three feature domains.
 * - Fractional indexing support for display ordering with O(1) performance.
 * 
 * @module ACMiscFeatures
 */

import {
    getFightingStyles,
    createFightingStyle,
    updateFightingStyle,
    deleteFightingStyle,
    getArtificerInfusions,
    createArtificerInfusion,
    updateArtificerInfusion,
    deleteArtificerInfusion,
    getEldritchInvocations,
    createEldritchInvocation,
    updateEldritchInvocation,
    deleteEldritchInvocation,
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
    getAdminMode
} from './ac-auth.js';
import {
    openModal,
    closeModal,
    esc,
    renderSourceBadges,
    extractSourceKeys,
    renderSourceTagPicker,
    renderMarkdownLinks,
    formatExpandableText,
    attachExpandableTextListeners,
    showToast
} from './ac-ui-utils.js';

export {
    setAdminMode,
    getAdminMode
};

// Data sets
let allFightingStyles = [];
let allArtificerInfusions = [];
let allEldritchInvocations = [];

let filteredFS = [];
let filteredAI = [];
let filteredEI = [];

let availableSourceKeys = [];

// Filter state
let selectedSectionFilter = 'ALL';   // 'ALL' | 'FS' | 'AI' | 'EI'
let selectedRulesetFilter = 'ALL';   // 'ALL' | '2014' | '2024'
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
 * Initializes the Misc Class Features view.
 * 
 * @param {boolean} [forceRefresh=false]
 */
export async function initMiscFeatures(forceRefresh = false) {
    const container = document.getElementById('ac-view-misc-features');
    if (!container) return;

    if (forceRefresh) {
        selectedSectionFilter = 'ALL';
        selectedRulesetFilter = 'ALL';
        selectedSourceFilter = 'ALL';
        currentSearchTerm = '';
    } else if (allFightingStyles.length > 0 || allArtificerInfusions.length > 0 || allEldritchInvocations.length > 0) {
        applyFilters();
        renderView();
        return;
    }

    container.innerHTML = `
        <div class="ac-loading">
            <div class="spinner"></div>
            <span>Cataloging Misc Class Features...</span>
        </div>
    `;

    try {
        const [fsData, aiData, eiData, _sourcesMap] = await Promise.all([
            getFightingStyles(),
            getArtificerInfusions(),
            getEldritchInvocations(),
            getSourcesMap(forceRefresh)
        ]);

        allFightingStyles = sortByDisplayOrder(fsData || []);
        allArtificerInfusions = sortByDisplayOrder(aiData || []);
        allEldritchInvocations = sortByDisplayOrder(eiData || []);

        // Aggregate unique source keys across all three datasets
        const sourceSet = new Set();
        [...allFightingStyles, ...allArtificerInfusions, ...allEldritchInvocations].forEach(item => {
            if (item.source) {
                extractSourceKeys(item.source).forEach(k => sourceSet.add(k));
            }
        });
        availableSourceKeys = Array.from(sourceSet).sort((a, b) => a.localeCompare(b));

        applyFilters();
        renderView();
    } catch (err) {
        console.error('Error initializing misc class features:', err);
        container.innerHTML = `
            <div class="ac-error-state" style="text-align: center; padding: 2rem;">
                <p>Failed to load misc class features: ${esc(err.message || String(err))}</p>
                <button class="ac-btn-admin ac-btn-secondary" onclick="window.location.reload()">Reload Page</button>
            </div>
        `;
    }
}

/**
 * Applies active toolbar filters and search query across all three datasets.
 */
function applyFilters() {
    const term = (currentSearchTerm || '').trim().toLowerCase();

    // 1. Filter Fighting Styles
    filteredFS = allFightingStyles.filter(item => {
        if (selectedRulesetFilter !== 'ALL' && item.ruleset !== selectedRulesetFilter) return false;
        if (selectedSourceFilter !== 'ALL') {
            const sources = item.source ? extractSourceKeys(item.source) : [];
            if (!sources.includes(selectedSourceFilter) && item.source !== selectedSourceFilter) return false;
        }
        if (term) {
            const matchName = item.name?.toLowerCase().includes(term);
            const matchClasses = item.classes?.toLowerCase().includes(term);
            const matchRuleset = item.ruleset?.toLowerCase().includes(term);
            const matchSource = item.source?.toLowerCase().includes(term);
            const matchNotes = item.notes_advice?.toLowerCase().includes(term);
            const matchCheck = item.check_id?.toLowerCase().includes(term);
            if (!matchName && !matchClasses && !matchRuleset && !matchSource && !matchNotes && !matchCheck) return false;
        }
        return true;
    });

    // 2. Filter Artificer Infusions
    filteredAI = allArtificerInfusions.filter(item => {
        if (selectedRulesetFilter !== 'ALL' && item.ruleset !== selectedRulesetFilter) return false;
        if (selectedSourceFilter !== 'ALL') {
            const sources = item.source ? extractSourceKeys(item.source) : [];
            if (!sources.includes(selectedSourceFilter) && item.source !== selectedSourceFilter) return false;
        }
        if (term) {
            const matchName = item.name?.toLowerCase().includes(term);
            const matchPrereq = item.item_prereq?.toLowerCase().includes(term);
            const matchAttune = item.requires_attunement?.toLowerCase().includes(term);
            const matchLvl = String(item.level_prereq || '').toLowerCase().includes(term);
            const matchRuleset = item.ruleset?.toLowerCase().includes(term);
            const matchSource = item.source?.toLowerCase().includes(term);
            const matchNotes = item.notes_advice?.toLowerCase().includes(term);
            const matchCheck = item.check_id?.toLowerCase().includes(term);
            if (!matchName && !matchPrereq && !matchAttune && !matchLvl && !matchRuleset && !matchSource && !matchNotes && !matchCheck) return false;
        }
        return true;
    });

    // 3. Filter Eldritch Invocations
    filteredEI = allEldritchInvocations.filter(item => {
        if (selectedRulesetFilter !== 'ALL' && item.ruleset !== selectedRulesetFilter) return false;
        if (selectedSourceFilter !== 'ALL') {
            const sources = item.source ? extractSourceKeys(item.source) : [];
            if (!sources.includes(selectedSourceFilter) && item.source !== selectedSourceFilter) return false;
        }
        if (term) {
            const matchName = item.name?.toLowerCase().includes(term);
            const matchPact = item.pact_prereq?.toLowerCase().includes(term);
            const matchOther = item.other_prereq?.toLowerCase().includes(term);
            const matchLvl = String(item.level_prereq || '').toLowerCase().includes(term);
            const matchRuleset = item.ruleset?.toLowerCase().includes(term);
            const matchSource = item.source?.toLowerCase().includes(term);
            const matchNotes = item.notes_advice?.toLowerCase().includes(term);
            const matchCheck = item.check_id?.toLowerCase().includes(term);
            if (!matchName && !matchPact && !matchOther && !matchLvl && !matchRuleset && !matchSource && !matchNotes && !matchCheck) return false;
        }
        return true;
    });
}

/**
 * Main render entry point. Builds full view structure.
 */
function renderView() {
    const container = document.getElementById('ac-view-misc-features');
    if (!container) return;

    const isAdmin = getAdminMode();
    const totalMatching = filteredFS.length + filteredAI.length + filteredEI.length;

    const showFS = selectedSectionFilter === 'ALL' || selectedSectionFilter === 'FS';
    const showAI = selectedSectionFilter === 'ALL' || selectedSectionFilter === 'AI';
    const showEI = selectedSectionFilter === 'ALL' || selectedSectionFilter === 'EI';

    container.innerHTML = `
        <div class="ac-misc-container">
            <!-- Toolbar: Filters and Stats -->
            <div class="ac-misc-toolbar ac-classes-toolbar">
                <div class="ac-misc-stats ac-classes-stats" id="misc-stats-counter">
                    Showing <strong>${totalMatching}</strong> Features
                </div>

                <div class="ac-misc-controls ac-classes-controls">
                    <!-- Section Filter -->
                    <select id="misc-section-filter" class="ac-filter-select" title="Filter by Section" aria-label="Filter by Section">
                        <option value="ALL" ${selectedSectionFilter === 'ALL' ? 'selected' : ''}>All Sections (3)</option>
                        <option value="FS" ${selectedSectionFilter === 'FS' ? 'selected' : ''}>Fighting Styles (${filteredFS.length})</option>
                        <option value="AI" ${selectedSectionFilter === 'AI' ? 'selected' : ''}>Artificer Infusions (${filteredAI.length})</option>
                        <option value="EI" ${selectedSectionFilter === 'EI' ? 'selected' : ''}>Eldritch Invocations (${filteredEI.length})</option>
                    </select>

                    <!-- Ruleset Filter -->
                    <select id="misc-ruleset-filter" class="ac-filter-select" title="Filter by Ruleset" aria-label="Filter by Ruleset">
                        <option value="ALL" ${selectedRulesetFilter === 'ALL' ? 'selected' : ''}>All Rulesets</option>
                        <option value="2024" ${selectedRulesetFilter === '2024' ? 'selected' : ''}>2024 Edition</option>
                        <option value="2014" ${selectedRulesetFilter === '2014' ? 'selected' : ''}>2014 Edition</option>
                    </select>

                    <!-- Source Filter -->
                    <select id="misc-source-filter" class="ac-filter-select" title="Filter by Sourcebook" aria-label="Filter by Sourcebook">
                        <option value="ALL">All Sources (${availableSourceKeys.length})</option>
                        ${availableSourceKeys.map(k => {
                            const src = getSourceByKey(k);
                            const label = src ? `${k} - ${src.name}` : k;
                            return `<option value="${esc(k)}" ${selectedSourceFilter === k ? 'selected' : ''}>${esc(label)}</option>`;
                        }).join('')}
                    </select>
                </div>
            </div>

            <div id="misc-sections-container">
            <!-- 1. Fighting Styles Section -->
            <section id="section-fs" class="ac-section-group" style="${showFS ? '' : 'display: none;'}">
                <div class="ac-section-header">
                    <div class="ac-section-title-wrap">
                        <h3 class="ac-section-title">⚔️ Fighting Styles</h3>
                        <span class="ac-counter-pill" id="fs-stats-pill">${filteredFS.length} Styles</span>
                    </div>
                    ${isAdmin ? `
                        <button class="ac-btn-admin ac-btn-sm ac-btn-primary" id="btn-add-fs-inline">+ Add Style</button>
                    ` : ''}
                </div>
                <div class="ac-table-wrapper">
                    <table class="ac-table" id="misc-fs-table">
                        <thead>
                            <tr>
                                <th style="min-width: 180px;">Fighting Style</th>
                                <th style="width: 80px; text-align: center;">Ruleset</th>
                                <th style="min-width: 180px;">Classes</th>
                                <th style="width: 100px; text-align: center;">Source</th>
                                <th style="min-width: 220px;">Notes / Advice</th>
                                ${isAdmin ? '<th style="width: 85px; text-align: center;">Actions</th>' : ''}
                            </tr>
                        </thead>
                        <tbody id="fs-tbody">
                            ${renderFSTbody(isAdmin)}
                        </tbody>
                    </table>
                </div>
            </section>

            <!-- 2. Artificer Infusions Section -->
            <section id="section-ai" class="ac-section-group" style="${showAI ? '' : 'display: none;'}">
                <div class="ac-section-header">
                    <div class="ac-section-title-wrap">
                        <h3 class="ac-section-title">⚙️ Artificer Infusions</h3>
                        <span class="ac-counter-pill" id="ai-stats-pill">${filteredAI.length} Infusions</span>
                    </div>
                    ${isAdmin ? `
                        <button class="ac-btn-admin ac-btn-sm ac-btn-primary" id="btn-add-ai-inline">+ Add Infusion</button>
                    ` : ''}
                </div>
                <div class="ac-table-wrapper">
                    <table class="ac-table" id="misc-ai-table">
                        <thead>
                            <tr>
                                <th style="min-width: 180px;">Infusion</th>
                                <th style="width: 80px; text-align: center;">Ruleset</th>
                                <th style="min-width: 180px;">Item Prerequisite</th>
                                <th style="width: 100px; text-align: center;">Attunement?</th>
                                <th style="width: 90px; text-align: center;">Level Req</th>
                                <th style="width: 100px; text-align: center;">Source</th>
                                <th style="min-width: 220px;">Notes / Advice</th>
                                ${isAdmin ? '<th style="width: 85px; text-align: center;">Actions</th>' : ''}
                            </tr>
                        </thead>
                        <tbody id="ai-tbody">
                            ${renderAITbody(isAdmin)}
                        </tbody>
                    </table>
                </div>
            </section>

            <!-- 3. Eldritch Invocations Section -->
            <section id="section-ei" class="ac-section-group" style="${showEI ? '' : 'display: none;'}">
                <div class="ac-section-header">
                    <div class="ac-section-title-wrap">
                        <h3 class="ac-section-title">🔮 Eldritch Invocations</h3>
                        <span class="ac-counter-pill" id="ei-stats-pill">${filteredEI.length} Invocations</span>
                    </div>
                    ${isAdmin ? `
                        <button class="ac-btn-admin ac-btn-sm ac-btn-primary" id="btn-add-ei-inline">+ Add Invocation</button>
                    ` : ''}
                </div>
                <div class="ac-table-wrapper">
                    <table class="ac-table" id="misc-ei-table">
                        <thead>
                            <tr>
                                <th style="min-width: 180px;">Invocation</th>
                                <th style="width: 80px; text-align: center;">Ruleset</th>
                                <th style="width: 100px; text-align: center;">Pact Prereq</th>
                                <th style="min-width: 160px;">Other Prereq</th>
                                <th style="width: 80px; text-align: center;">Level</th>
                                <th style="width: 100px; text-align: center;">Source</th>
                                <th style="min-width: 220px;">Notes / Advice</th>
                                ${isAdmin ? '<th style="width: 85px; text-align: center;">Actions</th>' : ''}
                            </tr>
                        </thead>
                        <tbody id="ei-tbody">
                            ${renderEITbody(isAdmin)}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    </div>
    `;

    setupControls();
    setupDelegatedInteractions(container);
    attachExpandableTextListeners(container);
}

/**
 * Generates Fighting Styles tbody rows.
 */
function renderFSTbody(isAdmin) {
    if (filteredFS.length === 0) {
        return `
            <tr>
                <td colspan="${isAdmin ? 6 : 5}" style="text-align: center; padding: 2rem; opacity: 0.6;">
                    No fighting styles match your current filter criteria.
                </td>
            </tr>
        `;
    }

    return filteredFS.map(s => `
        <tr data-id="${esc(s.id)}" data-type="fs" style="cursor: pointer;">
            <td><strong>${esc(s.name)}</strong></td>
            <td style="text-align: center;"><span class="ruleset-pill">${esc(s.ruleset)}</span></td>
            <td>${esc(s.classes || 'Any')}</td>
            <td style="text-align: center;">${renderSourceBadges(s.source)}</td>
            <td>${formatAdvice(s.notes_advice)}</td>
            ${isAdmin ? `
                <td style="text-align: center;" onclick="event.stopPropagation()">
                    <button class="ac-btn-admin ac-btn-sm btn-edit-fs" data-id="${esc(s.id)}" title="Edit Style">✏️</button>
                    <button class="ac-btn-admin ac-btn-sm ac-btn-delete btn-del-fs" data-id="${esc(s.id)}" title="Delete Style">🗑️</button>
                </td>
            ` : ''}
        </tr>
    `).join('');
}

/**
 * Generates Artificer Infusions tbody rows.
 */
function renderAITbody(isAdmin) {
    if (filteredAI.length === 0) {
        return `
            <tr>
                <td colspan="${isAdmin ? 8 : 7}" style="text-align: center; padding: 2rem; opacity: 0.6;">
                    No artificer infusions match your current filter criteria.
                </td>
            </tr>
        `;
    }

    return filteredAI.map(i => `
        <tr data-id="${esc(i.id)}" data-type="ai" style="cursor: pointer;">
            <td><strong>${esc(i.name)}</strong></td>
            <td style="text-align: center;"><span class="ruleset-pill">${esc(i.ruleset)}</span></td>
            <td>${esc(i.item_prereq || '—')}</td>
            <td style="text-align: center;"><span class="ruleset-pill" style="opacity: 0.85;">${esc(i.requires_attunement || 'No')}</span></td>
            <td style="text-align: center;"><code>${esc(String(i.level_prereq || 'Any'))}</code></td>
            <td style="text-align: center;">${renderSourceBadges(i.source)}</td>
            <td>${formatAdvice(i.notes_advice)}</td>
            ${isAdmin ? `
                <td style="text-align: center;" onclick="event.stopPropagation()">
                    <button class="ac-btn-admin ac-btn-sm btn-edit-ai" data-id="${esc(i.id)}" title="Edit Infusion">✏️</button>
                    <button class="ac-btn-admin ac-btn-sm ac-btn-delete btn-del-ai" data-id="${esc(i.id)}" title="Delete Infusion">🗑️</button>
                </td>
            ` : ''}
        </tr>
    `).join('');
}

/**
 * Generates Eldritch Invocations tbody rows.
 */
function renderEITbody(isAdmin) {
    if (filteredEI.length === 0) {
        return `
            <tr>
                <td colspan="${isAdmin ? 8 : 7}" style="text-align: center; padding: 2rem; opacity: 0.6;">
                    No eldritch invocations match your current filter criteria.
                </td>
            </tr>
        `;
    }

    return filteredEI.map(v => `
        <tr data-id="${esc(v.id)}" data-type="ei" style="cursor: pointer;">
            <td><strong>${esc(v.name)}</strong></td>
            <td style="text-align: center;"><span class="ruleset-pill">${esc(v.ruleset)}</span></td>
            <td style="text-align: center;"><code>${esc(v.pact_prereq || 'Any')}</code></td>
            <td>${esc(v.other_prereq || 'None')}</td>
            <td style="text-align: center;"><code>${esc(String(v.level_prereq || 'Any'))}</code></td>
            <td style="text-align: center;">${renderSourceBadges(v.source)}</td>
            <td>${formatAdvice(v.notes_advice)}</td>
            ${isAdmin ? `
                <td style="text-align: center;" onclick="event.stopPropagation()">
                    <button class="ac-btn-admin ac-btn-sm btn-edit-ei" data-id="${esc(v.id)}" title="Edit Invocation">✏️</button>
                    <button class="ac-btn-admin ac-btn-sm ac-btn-delete btn-del-ei" data-id="${esc(v.id)}" title="Delete Invocation">🗑️</button>
                </td>
            ` : ''}
        </tr>
    `).join('');
}

/**
 * Updates only the tbody bodies and counters without remounting the layout.
 */
function updateTableBodies() {
    const isAdmin = getAdminMode();

    const fsTbody = document.getElementById('fs-tbody');
    const aiTbody = document.getElementById('ai-tbody');
    const eiTbody = document.getElementById('ei-tbody');

    if (fsTbody) fsTbody.innerHTML = renderFSTbody(isAdmin);
    if (aiTbody) aiTbody.innerHTML = renderAITbody(isAdmin);
    if (eiTbody) eiTbody.innerHTML = renderEITbody(isAdmin);

    const fsPill = document.getElementById('fs-stats-pill');
    const aiPill = document.getElementById('ai-stats-pill');
    const eiPill = document.getElementById('ei-stats-pill');
    if (fsPill) fsPill.textContent = `${filteredFS.length} Styles`;
    if (aiPill) aiPill.textContent = `${filteredAI.length} Infusions`;
    if (eiPill) eiPill.textContent = `${filteredEI.length} Invocations`;

    const totalCounter = document.getElementById('misc-stats-counter');
    if (totalCounter) {
        totalCounter.innerHTML = `Showing <strong>${filteredFS.length + filteredAI.length + filteredEI.length}</strong> Features`;
    }

    // Synchronize section select options labels
    const secSelect = document.getElementById('misc-section-filter');
    if (secSelect) {
        const optFS = secSelect.querySelector('option[value="FS"]');
        if (optFS) optFS.textContent = `Fighting Styles (${filteredFS.length})`;
        const optAI = secSelect.querySelector('option[value="AI"]');
        if (optAI) optAI.textContent = `Artificer Infusions (${filteredAI.length})`;
        const optEI = secSelect.querySelector('option[value="EI"]');
        if (optEI) optEI.textContent = `Eldritch Invocations (${filteredEI.length})`;
    }

    // Toggle section visibility based on selectedSectionFilter
    const secFS = document.getElementById('section-fs');
    const secAI = document.getElementById('section-ai');
    const secEI = document.getElementById('section-ei');

    if (secFS) secFS.style.display = (selectedSectionFilter === 'ALL' || selectedSectionFilter === 'FS') ? '' : 'none';
    if (secAI) secAI.style.display = (selectedSectionFilter === 'ALL' || selectedSectionFilter === 'AI') ? '' : 'none';
    if (secEI) secEI.style.display = (selectedSectionFilter === 'ALL' || selectedSectionFilter === 'EI') ? '' : 'none';

    const container = document.getElementById('ac-view-misc-features');
    if (container) attachExpandableTextListeners(container);
}

/**
 * Sets up toolbar dropdown filter event listeners.
 */
function setupControls() {
    // 1. Section dropdown filter
    const secSelect = document.getElementById('misc-section-filter');
    if (secSelect) {
        secSelect.onchange = (e) => {
            selectedSectionFilter = e.target.value;
            updateTableBodies();
        };
    }

    // 3. Ruleset dropdown filter
    const rulesetSelect = document.getElementById('misc-ruleset-filter');
    if (rulesetSelect) {
        rulesetSelect.onchange = (e) => {
            selectedRulesetFilter = e.target.value;
            applyFilters();
            updateTableBodies();
        };
    }

    // 4. Source dropdown filter
    const srcSelect = document.getElementById('misc-source-filter');
    if (srcSelect) {
        srcSelect.onchange = (e) => {
            selectedSourceFilter = e.target.value;
            applyFilters();
            updateTableBodies();
        };
    }

    // 5. Inline add buttons
    document.getElementById('btn-add-fs-inline')?.addEventListener('click', () => openFightingStyleForm());
    document.getElementById('btn-add-ai-inline')?.addEventListener('click', () => openArtificerInfusionForm());
    document.getElementById('btn-add-ei-inline')?.addEventListener('click', () => openEldritchInvocationForm());
}

/**
 * Sets up delegated event listeners for row clicks and edit/delete actions.
 * 
 * @param {HTMLElement} container
 */
function setupDelegatedInteractions(container) {
    container.onclick = (e) => {
        // Edit Fighting Style
        const editFs = e.target.closest('.btn-edit-fs');
        if (editFs) {
            e.stopPropagation();
            const item = allFightingStyles.find(i => i.id === editFs.dataset.id);
            if (item) openFightingStyleForm(item);
            return;
        }

        // Delete Fighting Style
        const delFs = e.target.closest('.btn-del-fs');
        if (delFs) {
            e.stopPropagation();
            const item = allFightingStyles.find(i => i.id === delFs.dataset.id);
            if (item) confirmAndDeleteFightingStyle(item);
            return;
        }

        // Edit Artificer Infusion
        const editAi = e.target.closest('.btn-edit-ai');
        if (editAi) {
            e.stopPropagation();
            const item = allArtificerInfusions.find(i => i.id === editAi.dataset.id);
            if (item) openArtificerInfusionForm(item);
            return;
        }

        // Delete Artificer Infusion
        const delAi = e.target.closest('.btn-del-ai');
        if (delAi) {
            e.stopPropagation();
            const item = allArtificerInfusions.find(i => i.id === delAi.dataset.id);
            if (item) confirmAndDeleteArtificerInfusion(item);
            return;
        }

        // Edit Eldritch Invocation
        const editEi = e.target.closest('.btn-edit-ei');
        if (editEi) {
            e.stopPropagation();
            const item = allEldritchInvocations.find(i => i.id === editEi.dataset.id);
            if (item) openEldritchInvocationForm(item);
            return;
        }

        // Delete Eldritch Invocation
        const delEi = e.target.closest('.btn-del-ei');
        if (delEi) {
            e.stopPropagation();
            const item = allEldritchInvocations.find(i => i.id === delEi.dataset.id);
            if (item) confirmAndDeleteEldritchInvocation(item);
            return;
        }

        // Row Click -> Open Detail Modal
        const row = e.target.closest('tr[data-id][data-type]');
        if (row && !e.target.closest('a') && !e.target.closest('button')) {
            const id = row.dataset.id;
            const type = row.dataset.type;
            if (type === 'fs') {
                const item = allFightingStyles.find(i => i.id === id);
                if (item) showDetailModal(item, 'Fighting Style');
            } else if (type === 'ai') {
                const item = allArtificerInfusions.find(i => i.id === id);
                if (item) showDetailModal(item, 'Artificer Infusion');
            } else if (type === 'ei') {
                const item = allEldritchInvocations.find(i => i.id === id);
                if (item) showDetailModal(item, 'Eldritch Invocation');
            }
        }
    };
}

/**
 * External search filter handler invoked by ac-main.js global search input.
 * 
 * @param {string} term - Search query
 */
export function filterMiscFeatures(term) {
    currentSearchTerm = term || '';
    applyFilters();
    updateTableBodies();
}

/**
 * Opens detail modal for an item.
 * 
 * @param {Object} item - Record data
 * @param {string} categoryLabel - 'Fighting Style' | 'Artificer Infusion' | 'Eldritch Invocation'
 */
function showDetailModal(item, categoryLabel) {
    const isAdmin = getAdminMode();

    let gridFields = '';
    if (categoryLabel === 'Fighting Style') {
        gridFields = `
            <div class="detail-item">
                <label>Classes</label>
                <value>${esc(item.classes || 'Any')}</value>
            </div>
        `;
    } else if (categoryLabel === 'Artificer Infusion') {
        gridFields = `
            <div class="detail-item">
                <label>Item Prerequisite</label>
                <value>${esc(item.item_prereq || 'None')}</value>
            </div>
            <div class="detail-item">
                <label>Requires Attunement</label>
                <value>${esc(item.requires_attunement || 'No')}</value>
            </div>
            <div class="detail-item">
                <label>Level Requirement</label>
                <value><code>${esc(String(item.level_prereq || 'Any'))}</code></value>
            </div>
        `;
    } else if (categoryLabel === 'Eldritch Invocation') {
        gridFields = `
            <div class="detail-item">
                <label>Pact Prerequisite</label>
                <value><code>${esc(item.pact_prereq || 'Any')}</code></value>
            </div>
            <div class="detail-item">
                <label>Other Prerequisites</label>
                <value>${esc(item.other_prereq || 'None')}</value>
            </div>
            <div class="detail-item">
                <label>Level Requirement</label>
                <value><code>${esc(String(item.level_prereq || 'Any'))}</code></value>
            </div>
        `;
    }

    const html = `
        <div class="detail-header">
            <div>
                <span class="detail-category">${esc(categoryLabel)}</span>
                <h2 class="detail-title" style="margin: 0;">${esc(item.name)}</h2>
            </div>
            ${isAdmin ? `
                <div class="detail-actions" style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                    <button class="ac-btn-admin ac-btn-primary ac-btn-sm" id="detail-btn-edit">✏️ Edit</button>
                    <button class="ac-btn-admin ac-btn-danger ac-btn-sm" id="detail-btn-delete">🗑️ Delete</button>
                </div>
            ` : ''}
        </div>

        <div class="detail-grid">
            <div class="detail-item">
                <label>Check ID</label>
                <value><code>${esc(item.check_id || '—')}</code></value>
            </div>
            <div class="detail-item">
                <label>Ruleset</label>
                <value><span class="ruleset-pill">${esc(item.ruleset)}</span></value>
            </div>
            <div class="detail-item">
                <label>Source</label>
                <value>${renderSourceBadges(item.source)}</value>
            </div>
            ${gridFields}
            ${isAdmin ? `
                <div class="detail-item">
                    <label>Display Order</label>
                    <value><code>${formatDisplayOrder(item.display_order)}</code></value>
                </div>
            ` : ''}
        </div>

        <div class="detail-section">
            <h4>Guild Notes & Advice</h4>
            <div class="advice-content" style="margin-top: 0.35rem; line-height: 1.6;">
                ${item.notes_advice ? renderMarkdownLinks(item.notes_advice) : '<span style="opacity: 0.5;">None</span>'}
            </div>
        </div>
    `;

    openModal(html);

    if (isAdmin) {
        document.getElementById('detail-btn-edit')?.addEventListener('click', () => {
            closeModal();
            if (categoryLabel === 'Fighting Style') openFightingStyleForm(item);
            else if (categoryLabel === 'Artificer Infusion') openArtificerInfusionForm(item);
            else if (categoryLabel === 'Eldritch Invocation') openEldritchInvocationForm(item);
        });

        document.getElementById('detail-btn-delete')?.addEventListener('click', () => {
            if (categoryLabel === 'Fighting Style') confirmAndDeleteFightingStyle(item);
            else if (categoryLabel === 'Artificer Infusion') confirmAndDeleteArtificerInfusion(item);
            else if (categoryLabel === 'Eldritch Invocation') confirmAndDeleteEldritchInvocation(item);
        });
    }
}

/**
 * Picker modal opened from main admin toolbar when staff clicks "+ Add Feature".
 */
export function openMiscFeaturePicker() {
    const html = `
        <div class="detail-header">
            <span class="detail-category">Staff Operations</span>
            <h2 class="detail-title">Create Class Feature</h2>
        </div>
        <p style="margin: 1rem 0; opacity: 0.85;">Select the category of class feature you wish to add:</p>
        <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem;">
            <button class="ac-btn-admin ac-btn-primary" id="picker-btn-fs" style="padding: 0.75rem 1rem; text-align: left; font-size: 0.95rem;">
                ⚔️ <strong>Fighting Style</strong> (Fighter, Paladin, Ranger, etc.)
            </button>
            <button class="ac-btn-admin ac-btn-primary" id="picker-btn-ai" style="padding: 0.75rem 1rem; text-align: left; font-size: 0.95rem;">
                ⚙️ <strong>Artificer Infusion</strong> (Armor, Weapon, Boots, Focus, etc.)
            </button>
            <button class="ac-btn-admin ac-btn-primary" id="picker-btn-ei" style="padding: 0.75rem 1rem; text-align: left; font-size: 0.95rem;">
                🔮 <strong>Eldritch Invocation</strong> (Warlock Invocations)
            </button>
        </div>
        <div class="ac-form-actions">
            <button type="button" class="ac-btn-admin ac-btn-secondary" id="picker-cancel">Cancel</button>
        </div>
    `;

    openModal(html);

    document.getElementById('picker-cancel')?.addEventListener('click', closeModal);
    document.getElementById('picker-btn-fs')?.addEventListener('click', () => {
        closeModal();
        openFightingStyleForm();
    });
    document.getElementById('picker-btn-ai')?.addEventListener('click', () => {
        closeModal();
        openArtificerInfusionForm();
    });
    document.getElementById('picker-btn-ei')?.addEventListener('click', () => {
        closeModal();
        openEldritchInvocationForm();
    });
}

/**
 * Add / Edit Form Modal: Fighting Style
 * 
 * @param {Object|null} [item=null]
 */
export async function openFightingStyleForm(item = null) {
    if (allFightingStyles.length === 0) {
        allFightingStyles = (await getFightingStyles()) || [];
    }

    const isEdit = !!item;
    const defaultOrder = isEdit ? item.display_order : getNextDisplayOrder(allFightingStyles, 1);
    let selectedSources = item?.source ? extractSourceKeys(item.source) : ['PHB2024'];

    const html = `
        <div class="detail-header">
            <span class="detail-category">${isEdit ? 'Edit Fighting Style' : 'New Fighting Style'}</span>
            <h2 class="detail-title">${isEdit ? `Edit: ${esc(item.name)}` : 'Add Fighting Style'}</h2>
        </div>

        <form id="ac-fs-form" class="ac-edit-form" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;">
            <div class="ac-form-group">
                <label for="fs-input-name" style="font-weight: 600;">Style Name *</label>
                <input type="text" id="fs-input-name" required class="ac-form-input" value="${esc(item?.name || '')}" placeholder="e.g. Archery, Defense, Interception">
            </div>

            <div class="ac-form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="ac-form-group">
                    <label for="fs-input-ruleset" style="font-weight: 600;">Ruleset *</label>
                    <select id="fs-input-ruleset" required class="ac-form-select">
                        <option value="2024" ${item?.ruleset === '2024' ? 'selected' : ''}>2024 Edition</option>
                        <option value="2014" ${item?.ruleset === '2014' || !isEdit ? 'selected' : ''}>2014 Edition</option>
                    </select>
                </div>
                <div class="ac-form-group">
                    <label for="fs-input-order" style="font-weight: 600;">Display Order *</label>
                    <input type="number" step="any" id="fs-input-order" required class="ac-form-input" value="${defaultOrder}">
                </div>
            </div>

            <div class="ac-form-group">
                <label for="fs-input-classes" style="font-weight: 600;">Classes</label>
                <input type="text" id="fs-input-classes" class="ac-form-input" value="${esc(item?.classes || '')}" placeholder="e.g. Blood Hunter, Fighter, Paladin, Ranger">
            </div>

            <div class="ac-form-group">
                <label style="font-weight: 600;">Sources *</label>
                <div id="fs-source-tag-picker"></div>
            </div>

            <div class="ac-form-group">
                <label for="fs-input-advice" style="font-weight: 600;">Notes & Advice</label>
                <textarea id="fs-input-advice" rows="3" class="ac-form-textarea" placeholder="Add clarifications, revisions, or markdown links...">${esc(item?.notes_advice || '')}</textarea>
            </div>

            <div class="ac-form-actions" style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem;">
                <button type="button" class="ac-btn-admin ac-btn-secondary" id="fs-btn-cancel">Cancel</button>
                <button type="submit" class="ac-btn-admin ac-btn-primary" id="fs-btn-submit">💾 Save Style</button>
            </div>
        </form>
    `;

    openModal(html);

    renderSourceTagPicker({
        containerEl: document.getElementById('fs-source-tag-picker'),
        selectedKeys: selectedSources,
        availableKeys: availableSourceKeys,
        onChange: (updated) => { selectedSources = updated; }
    });

    document.getElementById('fs-btn-cancel')?.addEventListener('click', closeModal);

    const form = document.getElementById('ac-fs-form');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('fs-btn-submit');
        submitBtn.disabled = true;

        const payload = {
            name: document.getElementById('fs-input-name').value.trim(),
            ruleset: document.getElementById('fs-input-ruleset').value,
            classes: document.getElementById('fs-input-classes').value.trim() || null,
            source: selectedSources.join(', '),
            display_order: cleanFloat(parseFloat(document.getElementById('fs-input-order').value) || defaultOrder),
            notes_advice: document.getElementById('fs-input-advice').value.trim() || null
        };

        try {
            if (isEdit) {
                const { error } = await updateFightingStyle(item.id, payload);
                if (error) throw error;
                showToast('Fighting Style updated successfully!');
            } else {
                const { error } = await createFightingStyle(payload);
                if (error) throw error;
                showToast('Fighting Style created successfully!');
            }
            closeModal();
            await initMiscFeatures(true);
            window.dispatchEvent(new CustomEvent('ac:misc-features-updated'));
        } catch (err) {
            console.error('Error saving fighting style:', err);
            alert(`Save failed: ${err.message || String(err)}`);
            submitBtn.disabled = false;
        }
    };
}

/**
 * Add / Edit Form Modal: Artificer Infusion
 * 
 * @param {Object|null} [item=null]
 */
export async function openArtificerInfusionForm(item = null) {
    if (allArtificerInfusions.length === 0) {
        allArtificerInfusions = (await getArtificerInfusions()) || [];
    }

    const isEdit = !!item;
    const defaultOrder = isEdit ? item.display_order : getNextDisplayOrder(allArtificerInfusions, 1);
    let selectedSources = item?.source ? extractSourceKeys(item.source) : ['TCE'];

    const html = `
        <div class="detail-header">
            <span class="detail-category">${isEdit ? 'Edit Artificer Infusion' : 'New Artificer Infusion'}</span>
            <h2 class="detail-title">${isEdit ? `Edit: ${esc(item.name)}` : 'Add Artificer Infusion'}</h2>
        </div>

        <form id="ac-ai-form" class="ac-edit-form" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;">
            <div class="ac-form-group">
                <label for="ai-input-name" style="font-weight: 600;">Infusion Name *</label>
                <input type="text" id="ai-input-name" required class="ac-form-input" value="${esc(item?.name || '')}" placeholder="e.g. Enhanced Defense, Repeating Shot">
            </div>

            <div class="ac-form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="ac-form-group">
                    <label for="ai-input-ruleset" style="font-weight: 600;">Ruleset *</label>
                    <select id="ai-input-ruleset" required class="ac-form-select">
                        <option value="2014" selected>2014 Edition</option>
                    </select>
                </div>
                <div class="ac-form-group">
                    <label for="ai-input-order" style="font-weight: 600;">Display Order *</label>
                    <input type="number" step="any" id="ai-input-order" required class="ac-form-input" value="${defaultOrder}">
                </div>
            </div>

            <div class="ac-form-group">
                <label for="ai-input-prereq" style="font-weight: 600;">Item Prerequisite</label>
                <input type="text" id="ai-input-prereq" class="ac-form-input" value="${esc(item?.item_prereq || '')}" placeholder="e.g. A suit of armor, A simple or martial weapon">
            </div>

            <div class="ac-form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="ac-form-group">
                    <label for="ai-input-attunement" style="font-weight: 600;">Requires Attunement?</label>
                    <input type="text" id="ai-input-attunement" class="ac-form-input" value="${esc(item?.requires_attunement || 'No')}" placeholder="Yes / No / Special">
                </div>
                <div class="ac-form-group">
                    <label for="ai-input-level" style="font-weight: 600;">Level Requirement</label>
                    <input type="text" id="ai-input-level" class="ac-form-input" value="${esc(String(item?.level_prereq || 'Any'))}" placeholder="Any, 6, 10, 14, Special">
                </div>
            </div>

            <div class="ac-form-group">
                <label style="font-weight: 600;">Sources *</label>
                <div id="ai-source-tag-picker"></div>
            </div>

            <div class="ac-form-group">
                <label for="ai-input-advice" style="font-weight: 600;">Notes & Advice</label>
                <textarea id="ai-input-advice" rows="3" class="ac-form-textarea" placeholder="Add crafting limits, trade restrictions, or markdown links...">${esc(item?.notes_advice || '')}</textarea>
            </div>

            <div class="ac-form-actions" style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem;">
                <button type="button" class="ac-btn-admin ac-btn-secondary" id="ai-btn-cancel">Cancel</button>
                <button type="submit" class="ac-btn-admin ac-btn-primary" id="ai-btn-submit">💾 Save Infusion</button>
            </div>
        </form>
    `;

    openModal(html);

    renderSourceTagPicker({
        containerEl: document.getElementById('ai-source-tag-picker'),
        selectedKeys: selectedSources,
        availableKeys: availableSourceKeys,
        onChange: (updated) => { selectedSources = updated; }
    });

    document.getElementById('ai-btn-cancel')?.addEventListener('click', closeModal);

    const form = document.getElementById('ac-ai-form');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('ai-btn-submit');
        submitBtn.disabled = true;

        const payload = {
            name: document.getElementById('ai-input-name').value.trim(),
            ruleset: document.getElementById('ai-input-ruleset').value,
            item_prereq: document.getElementById('ai-input-prereq').value.trim() || null,
            requires_attunement: document.getElementById('ai-input-attunement').value.trim() || 'No',
            level_prereq: document.getElementById('ai-input-level').value.trim() || 'Any',
            source: selectedSources.join(', '),
            display_order: cleanFloat(parseFloat(document.getElementById('ai-input-order').value) || defaultOrder),
            notes_advice: document.getElementById('ai-input-advice').value.trim() || null
        };

        try {
            if (isEdit) {
                const { error } = await updateArtificerInfusion(item.id, payload);
                if (error) throw error;
                showToast('Artificer Infusion updated successfully!');
            } else {
                const { error } = await createArtificerInfusion(payload);
                if (error) throw error;
                showToast('Artificer Infusion created successfully!');
            }
            closeModal();
            await initMiscFeatures(true);
            window.dispatchEvent(new CustomEvent('ac:misc-features-updated'));
        } catch (err) {
            console.error('Error saving artificer infusion:', err);
            alert(`Save failed: ${err.message || String(err)}`);
            submitBtn.disabled = false;
        }
    };
}

/**
 * Add / Edit Form Modal: Eldritch Invocation
 * 
 * @param {Object|null} [item=null]
 */
export async function openEldritchInvocationForm(item = null) {
    if (allEldritchInvocations.length === 0) {
        allEldritchInvocations = (await getEldritchInvocations()) || [];
    }

    const isEdit = !!item;
    const defaultOrder = isEdit ? item.display_order : getNextDisplayOrder(allEldritchInvocations, 1);
    let selectedSources = item?.source ? extractSourceKeys(item.source) : ['PHB2024'];

    const html = `
        <div class="detail-header">
            <span class="detail-category">${isEdit ? 'Edit Eldritch Invocation' : 'New Eldritch Invocation'}</span>
            <h2 class="detail-title">${isEdit ? `Edit: ${esc(item.name)}` : 'Add Eldritch Invocation'}</h2>
        </div>

        <form id="ac-ei-form" class="ac-edit-form" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;">
            <div class="ac-form-group">
                <label for="ei-input-name" style="font-weight: 600;">Invocation Name *</label>
                <input type="text" id="ei-input-name" required class="ac-form-input" value="${esc(item?.name || '')}" placeholder="e.g. Agonizing Blast, Armor of Shadows, Repelling Blast">
            </div>

            <div class="ac-form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="ac-form-group">
                    <label for="ei-input-ruleset" style="font-weight: 600;">Ruleset *</label>
                    <select id="ei-input-ruleset" required class="ac-form-select">
                        <option value="2024" ${item?.ruleset === '2024' ? 'selected' : ''}>2024 Edition</option>
                        <option value="2014" ${item?.ruleset === '2014' || !isEdit ? 'selected' : ''}>2014 Edition</option>
                    </select>
                </div>
                <div class="ac-form-group">
                    <label for="ei-input-order" style="font-weight: 600;">Display Order *</label>
                    <input type="number" step="any" id="ei-input-order" required class="ac-form-input" value="${defaultOrder}">
                </div>
            </div>

            <div class="ac-form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="ac-form-group">
                    <label for="ei-input-pact" style="font-weight: 600;">Pact Prerequisite</label>
                    <input type="text" id="ei-input-pact" class="ac-form-input" value="${esc(item?.pact_prereq || 'Any')}" placeholder="Any, Blade, Tome, Chain, Talisman, or —">
                </div>
                <div class="ac-form-group">
                    <label for="ei-input-level" style="font-weight: 600;">Level Requirement</label>
                    <input type="text" id="ei-input-level" class="ac-form-input" value="${esc(String(item?.level_prereq || 'Any'))}" placeholder="Any, 2, 5, 7, 9, 12, 15">
                </div>
            </div>

            <div class="ac-form-group">
                <label for="ei-input-other" style="font-weight: 600;">Other Prerequisites</label>
                <input type="text" id="ei-input-other" class="ac-form-input" value="${esc(item?.other_prereq || 'None')}" placeholder="e.g. Eldritch Blast, Pact of the Blade (2024), None">
            </div>

            <div class="ac-form-group">
                <label style="font-weight: 600;">Sources *</label>
                <div id="ei-source-tag-picker"></div>
            </div>

            <div class="ac-form-group">
                <label for="ei-input-advice" style="font-weight: 600;">Notes & Advice</label>
                <textarea id="ei-input-advice" rows="3" class="ac-form-textarea" placeholder="Add rulings, spell slot notes, or markdown links...">${esc(item?.notes_advice || '')}</textarea>
            </div>

            <div class="ac-form-actions" style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem;">
                <button type="button" class="ac-btn-admin ac-btn-secondary" id="ei-btn-cancel">Cancel</button>
                <button type="submit" class="ac-btn-admin ac-btn-primary" id="ei-btn-submit">💾 Save Invocation</button>
            </div>
        </form>
    `;

    openModal(html);

    renderSourceTagPicker({
        containerEl: document.getElementById('ei-source-tag-picker'),
        selectedKeys: selectedSources,
        availableKeys: availableSourceKeys,
        onChange: (updated) => { selectedSources = updated; }
    });

    document.getElementById('ei-btn-cancel')?.addEventListener('click', closeModal);

    const form = document.getElementById('ac-ei-form');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('ei-btn-submit');
        submitBtn.disabled = true;

        const payload = {
            name: document.getElementById('ei-input-name').value.trim(),
            ruleset: document.getElementById('ei-input-ruleset').value,
            pact_prereq: document.getElementById('ei-input-pact').value.trim() || 'Any',
            other_prereq: document.getElementById('ei-input-other').value.trim() || 'None',
            level_prereq: document.getElementById('ei-input-level').value.trim() || 'Any',
            source: selectedSources.join(', '),
            display_order: cleanFloat(parseFloat(document.getElementById('ei-input-order').value) || defaultOrder),
            notes_advice: document.getElementById('ei-input-advice').value.trim() || null
        };

        try {
            if (isEdit) {
                const { error } = await updateEldritchInvocation(item.id, payload);
                if (error) throw error;
                showToast('Eldritch Invocation updated successfully!');
            } else {
                const { error } = await createEldritchInvocation(payload);
                if (error) throw error;
                showToast('Eldritch Invocation created successfully!');
            }
            closeModal();
            await initMiscFeatures(true);
            window.dispatchEvent(new CustomEvent('ac:misc-features-updated'));
        } catch (err) {
            console.error('Error saving eldritch invocation:', err);
            alert(`Save failed: ${err.message || String(err)}`);
            submitBtn.disabled = false;
        }
    };
}

/**
 * Confirms and executes Fighting Style deletion.
 * 
 * @param {Object} item
 */
export async function confirmAndDeleteFightingStyle(item) {
    if (!item) return;
    const confirmed = window.confirm(`Are you sure you want to delete Fighting Style "${item.name}"?`);
    if (!confirmed) return;

    try {
        const { success, error } = await deleteFightingStyle(item.id);
        if (!success) throw error || new Error('Delete failed');

        closeModal();
        showToast('Fighting Style deleted successfully!');
        await initMiscFeatures(true);
        window.dispatchEvent(new CustomEvent('ac:misc-features-updated'));
    } catch (err) {
        console.error('Error deleting fighting style:', err);
        alert(`Delete failed: ${err.message || String(err)}`);
    }
}

/**
 * Confirms and executes Artificer Infusion deletion.
 * 
 * @param {Object} item
 */
export async function confirmAndDeleteArtificerInfusion(item) {
    if (!item) return;
    const confirmed = window.confirm(`Are you sure you want to delete Artificer Infusion "${item.name}"?`);
    if (!confirmed) return;

    try {
        const { success, error } = await deleteArtificerInfusion(item.id);
        if (!success) throw error || new Error('Delete failed');

        closeModal();
        showToast('Artificer Infusion deleted successfully!');
        await initMiscFeatures(true);
        window.dispatchEvent(new CustomEvent('ac:misc-features-updated'));
    } catch (err) {
        console.error('Error deleting artificer infusion:', err);
        alert(`Delete failed: ${err.message || String(err)}`);
    }
}

/**
 * Confirms and executes Eldritch Invocation deletion.
 * 
 * @param {Object} item
 */
export async function confirmAndDeleteEldritchInvocation(item) {
    if (!item) return;
    const confirmed = window.confirm(`Are you sure you want to delete Eldritch Invocation "${item.name}"?`);
    if (!confirmed) return;

    try {
        const { success, error } = await deleteEldritchInvocation(item.id);
        if (!success) throw error || new Error('Delete failed');

        closeModal();
        showToast('Eldritch Invocation deleted successfully!');
        await initMiscFeatures(true);
        window.dispatchEvent(new CustomEvent('ac:misc-features-updated'));
    } catch (err) {
        console.error('Error deleting eldritch invocation:', err);
        alert(`Delete failed: ${err.message || String(err)}`);
    }
}

// Invalidate in-memory cache when mutation event is broadcast
if (typeof window !== 'undefined') {
    window.addEventListener('ac:misc-features-updated', () => {
        allFightingStyles = [];
        allArtificerInfusions = [];
        allEldritchInvocations = [];
    });
}
