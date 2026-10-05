/**
 * ================================================================
 * AC RACES MODULE
 * ================================================================
 * 
 * Data handling and presentation for player character species and lineages.
 * Supports normalized two-table architecture (ac_races + ac_subraces),
 * array-typed sources (TEXT[]), multi-source variant modeling (JSONB),
 * and client-side in-memory source resolution.
 * 
 * Database Schema Overview:
 * 1. `ac_races`: Base species level (e.g. Elf, Dwarf, Human). Holds species name,
 *    base display order, aggregated sources array, and edition variants.
 * 2. `ac_subraces`: Lineage level (e.g. High Elf, Wood Elf, Mountain Dwarf).
 *    Holds specific traits, ASI values, speed, size, languages, audit check_id,
 *    and foreign key `race_id` linking back to `ac_races.race_id`.
 * 
 * Features:
 * - Dual view modes: "Species Overview" (grouped by species) and "All Lineages" (flat).
 * - Interactive lineage chips and modal navigation tabs.
 * - Dynamic source badges with tooltips powered by in-memory ac_sources cache.
 * - Multi-source printing/reprint variant inspector (JSON-style).
 * - Real-time client-side search across species, subraces, sources, ASI, traits, and notes.
 * 
 * @module ACRaces
 */

/**
 * Base species entity stored in `ac_races`.
 * 
 * @typedef {Object} Race
 * @property {string} id - UUID primary key in ac_races
 * @property {string} race_id - Sequential human-readable identifier (e.g. 'RACE_0001')
 * @property {string} name - Base species name (e.g. 'Elf', 'Dwarf', 'Owlin')
 * @property {Array<string>} sources - Array of sourcebook keys (e.g. ['PHB2014', 'MPMM'])
 * @property {number} display_order - Fractional sort index
 * @property {Object} [variants] - JSONB edition/reprint mechanical differences
 * @property {Array<Subrace>} [subraces] - Joined child lineage records
 */

/**
 * Individual lineage/subrace record stored in `ac_subraces`.
 * 
 * @typedef {Object} Subrace
 * @property {string} id - UUID primary key in ac_subraces
 * @property {string} race_id - Foreign key referencing ac_races.race_id
 * @property {string} check_id - Audit check identifier (e.g. 'RAC_0001')
 * @property {string} subrace - Lineage title ('None' or specific lineage like 'High', 'Wood')
 * @property {Array<string>} sources - Sources attributing this specific lineage
 * @property {string} size - Character size ('Medium', 'Small', etc.)
 * @property {string} speed - Walking/flying speed string ('30', '30 ft, fly 30 ft')
 * @property {string} [language] - Known languages
 * @property {string} [str] - Strength ability modifier
 * @property {string} [dex] - Dexterity ability modifier
 * @property {string} [con] - Constitution ability modifier
 * @property {string} [int_stat] - Intelligence ability modifier
 * @property {string} [wis] - Wisdom ability modifier
 * @property {string} [cha] - Charisma ability modifier
 * @property {string} [extra] - Racial traits and mechanical abilities
 * @property {string} [notes_advice] - Guild ruling notes and rage advice
 * @property {number} display_order - Fractional sort index within parent race
 * @property {Object} [variants] - JSONB edition differences for this lineage
 * @property {Race} [parentRace] - Reference to parent species when flattened
 * @property {string} [raceName] - Parent species name when flattened
 */

import { 
    getRaces, 
    getSourcesMap, 
    getSourceByKey,
    createRace,
    updateRace,
    deleteRace,
    createSubrace,
    updateSubrace,
    deleteSubrace
} from './ac-service.js';
import { 
    getNextDisplayOrder, 
    cleanFloat, 
    sortByDisplayOrder, 
    formatDisplayOrder 
} from './ac-order-utils.js';
import { 
    detectAdminSession, 
    setAdminMode, 
    getAdminMode, 
    getCurrentUser 
} from './ac-auth.js';
import { 
    openModal, 
    closeModal, 
    esc, 
    formatSnippet, 
    renderSourceBadges, 
    renderSourceTagPicker 
} from './ac-ui-utils.js';

export {
    setAdminMode,
    getAdminMode,
    renderSourceBadges
};

let allRaces = [];
let allSubracesFlat = [];
let filteredRaces = [];
let filteredSubraces = [];
let availableSourceKeys = [];

let currentViewMode = 'species'; // 'species' | 'subraces'
let currentSearchTerm = '';
let selectedSourceFilter = 'ALL';

/**
 * Calculates the next sequential check_id (e.g. 'RAC_0248') based on highest existing number.
 * 
 * @param {Array} [subraces=allSubracesFlat] - Subraces collection
 * @returns {string} Formatted check_id
 */
export function getNextRaceCheckId(subraces = allSubracesFlat) {
    let maxNum = 0;
    (subraces || []).forEach(s => {
        if (s && s.check_id) {
            const m = String(s.check_id).match(/^RAC_(\d+)$/i);
            if (m) {
                const n = parseInt(m[1], 10);
                if (n > maxNum) maxNum = n;
            }
        }
    });
    return `RAC_${String(maxNum + 1).padStart(4, '0')}`;
}

/**
 * Calculates the next sequential race_id (e.g. 'RACE_0115') based on highest existing number.
 * 
 * @param {Array} [races=allRaces] - Races collection
 * @returns {string} Formatted race_id
 */
export function getNextRaceId(races = allRaces) {
    let maxNum = 0;
    (races || []).forEach(r => {
        if (r && r.race_id) {
            const m = String(r.race_id).match(/^RACE_(\d+)$/i);
            if (m) {
                const n = parseInt(m[1], 10);
                if (n > maxNum) maxNum = n;
            }
        }
    });
    return `RACE_${String(maxNum + 1).padStart(4, '0')}`;
}

// Global listener for opening race form from admin bar
if (typeof window !== 'undefined') {
    window.addEventListener('ac:open-race-form', () => {
        openRaceForm(null);
    });
    window.addEventListener('ac:races-updated', () => {
        const container = document.getElementById('ac-view-races');
        if (container && container.classList.contains('active')) {
            initRaces(true);
        } else {
            allRaces = [];
        }
    });
}

/**
 * Initializes the Races & Subraces view.
 * Uses in-memory cache if available unless forceRefresh is true.
 * 
 * @param {boolean} [forceRefresh=false] - Force re-fetch from database
 */
export async function initRaces(forceRefresh = false) {
    const container = document.getElementById('ac-view-races');
    if (!container) return;

    // Use cached in-memory data if available and not forcing refresh
    if (!forceRefresh && allRaces.length > 0) {
        applyFilters();
        renderView();
        return;
    }

    // Show initial loading spinner if data not loaded yet
    if (allRaces.length === 0) {
        container.innerHTML = `
            <div class="ac-loading">
                <div class="spinner"></div>
                <span>Cataloging Species & Lineages...</span>
            </div>
        `;
    }

    // Fetch races (with joined subraces) and ensure sources cache is ready
    const [races, sourcesMap] = await Promise.all([
        getRaces(),
        getSourcesMap(),
        detectAdminSession().catch(() => false)
    ]);

    // Sort races and nested subraces by display_order
    allRaces = sortByDisplayOrder(races || []);
    allRaces.forEach(r => {
        if (r.subraces && Array.isArray(r.subraces)) {
            r.subraces = sortByDisplayOrder(r.subraces);
        }
    });
    
    // Flatten subraces list for direct 1-to-1 table display
    allSubracesFlat = [];
    const sourceKeySet = new Set();

    allRaces.forEach(race => {
        (race.sources || []).forEach(k => sourceKeySet.add(k));
        
        const subs = race.subraces || [];
        subs.forEach(sub => {
            (sub.sources || []).forEach(k => sourceKeySet.add(k));
            allSubracesFlat.push({
                ...sub,
                parentRace: race,
                raceName: race.name
            });
        });
    });

    availableSourceKeys = Array.from(sourceKeySet).sort();

    applyFilters();
    renderView();
}

/**
 * Filters dataset based on search term and selected source.
 * 
 * @param {string} searchTerm - Global search query string
 */
export function filterRaces(searchTerm = '') {
    currentSearchTerm = searchTerm;
    applyFilters();
    renderView();
}

/**
 * Applies search term and source filters to both views.
 */
function applyFilters() {
    const term = currentSearchTerm.toLowerCase().trim();

    // 1. Filter Base Races (Species View)
    filteredRaces = allRaces.filter(race => {
        // Source filter
        if (selectedSourceFilter !== 'ALL') {
            const hasSource = (race.sources || []).includes(selectedSourceFilter) ||
                (race.subraces || []).some(s => (s.sources || []).includes(selectedSourceFilter));
            if (!hasSource) return false;
        }

        // Search term filter
        if (!term) return true;

        const nameMatch = race.name?.toLowerCase().includes(term);
        const subraceMatch = (race.subraces || []).some(s => 
            s.subrace?.toLowerCase().includes(term) ||
            s.extra?.toLowerCase().includes(term) ||
            s.notes_advice?.toLowerCase().includes(term) ||
            (s.sources || []).some(sk => sk.toLowerCase().includes(term))
        );
        const sourceMatch = (race.sources || []).some(sk => {
            if (sk.toLowerCase().includes(term)) return true;
            const src = getSourceByKey(sk);
            return src?.name?.toLowerCase().includes(term) || src?.abbreviation?.toLowerCase().includes(term);
        });

        return nameMatch || subraceMatch || sourceMatch;
    });

    // 2. Filter Subraces (Flat View)
    filteredSubraces = allSubracesFlat.filter(item => {
        // Source filter
        if (selectedSourceFilter !== 'ALL') {
            if (!(item.sources || []).includes(selectedSourceFilter)) return false;
        }

        // Search term filter
        if (!term) return true;

        const raceMatch = item.raceName?.toLowerCase().includes(term);
        const subraceMatch = item.subrace?.toLowerCase().includes(term);
        const checkIdMatch = item.check_id?.toLowerCase().includes(term);
        const extraMatch = item.extra?.toLowerCase().includes(term);
        const adviceMatch = item.notes_advice?.toLowerCase().includes(term);
        const asiMatch = formatASI(item).toLowerCase().includes(term);
        const sourceMatch = (item.sources || []).some(sk => {
            if (sk.toLowerCase().includes(term)) return true;
            const src = getSourceByKey(sk);
            return src?.name?.toLowerCase().includes(term) || src?.abbreviation?.toLowerCase().includes(term);
        });

        return raceMatch || subraceMatch || checkIdMatch || extraMatch || adviceMatch || asiMatch || sourceMatch;
    });
}

/**
 * Renders the complete Races view into `#ac-view-races`.
 */
function renderView() {
    const container = document.getElementById('ac-view-races');
    if (!container) return;

    const totalSpecies = allRaces.length;
    const totalLineages = allSubracesFlat.length;
    const showingCount = currentViewMode === 'species' ? filteredRaces.length : filteredSubraces.length;

    container.innerHTML = `
        <div class="ac-races-toolbar">
            <div class="ac-races-stats">
                Showing <strong>${showingCount}</strong> ${currentViewMode === 'species' ? 'species' : 'lineages'} 
                <span style="opacity: 0.7;">(Total: ${totalSpecies} species, ${totalLineages} lineages)</span>
            </div>

            <div class="ac-races-controls">
                <!-- View Mode Toggle -->
                <div class="ac-view-toggle">
                    <button class="ac-toggle-btn ${currentViewMode === 'species' ? 'active' : ''}" id="btn-view-species" title="Group by base species">
                        Species View (${filteredRaces.length})
                    </button>
                    <button class="ac-toggle-btn ${currentViewMode === 'subraces' ? 'active' : ''}" id="btn-view-subraces" title="Show all individual lineages">
                        All Lineages (${filteredSubraces.length})
                    </button>
                </div>

                <!-- Source Filter Dropdown -->
                <select class="ac-source-filter-select" id="ac-races-source-filter" aria-label="Filter by Source">
                    <option value="ALL" ${selectedSourceFilter === 'ALL' ? 'selected' : ''}>All Sources (${availableSourceKeys.length})</option>
                    ${availableSourceKeys.map(k => {
                        const src = getSourceByKey(k);
                        const label = src ? `${k} - ${src.name}` : k;
                        return `<option value="${esc(k)}" ${selectedSourceFilter === k ? 'selected' : ''}>${esc(label)}</option>`;
                    }).join('')}
                </select>
            </div>
        </div>

        <div class="ac-table-wrapper">
            ${currentViewMode === 'species' ? renderSpeciesTable() : renderSubracesTable()}
        </div>
    `;

    setupControls();
    attachRowListeners();
}

/**
 * Renders the Species (Grouped) table view.
 */
function renderSpeciesTable() {
    if (filteredRaces.length === 0) {
        return `
            <table class="ac-table">
                <tbody>
                    <tr><td colspan="5" style="text-align:center; padding: 3rem;">No species found matching your criteria.</td></tr>
                </tbody>
            </table>
        `;
    }

    return `
        <table class="ac-table" id="races-species-table">
            <thead>
                <tr>
                    <th class="col-name" style="width: 250px;">Species / Base Race</th>
                    <th class="col-subraces">Subraces & Lineages</th>
                    <th class="col-size hide-mobile" style="width: 140px;">Size & Speed</th>
                    <th class="col-asi hide-tablet">ASI Overview</th>
                    <th class="col-sources" style="width: 200px;">Sources</th>
                </tr>
            </thead>
            <tbody>
                ${filteredRaces.map(race => {
                    const subs = race.subraces || [];
                    const firstSub = subs[0] || {};
                    const sizes = Array.from(new Set(subs.map(s => s.size).filter(Boolean))).join('/') || '—';
                    const speeds = Array.from(new Set(subs.map(s => s.speed).filter(Boolean))).join('/') || '—';
                    
                    return `
                        <tr data-race-id="${esc(race.id)}">
                            <td class="col-name">
                                <div class="name-cell">
                                    <span>${esc(race.name)}</span>
                                    <span class="row-hover-icon">Details →</span>
                                </div>
                            </td>
                            <td class="col-subraces">
                                <div class="ac-subrace-chips">
                                    ${subs.map((s, idx) => {
                                        const label = s.subrace && s.subrace !== 'None' ? s.subrace : 'Standard';
                                        return `
                                            <span class="ac-subrace-chip" data-race-id="${esc(race.id)}" data-subrace-idx="${idx}" title="Click to view details for ${esc(label)}">
                                                ${esc(label)}
                                            </span>
                                        `;
                                    }).join('')}
                                </div>
                            </td>
                            <td class="col-size hide-mobile">
                                <div><strong>${esc(sizes)}</strong> <span style="opacity:0.6;">|</span> ${esc(speeds)}${speeds !== '—' && !speeds.includes('fly') ? ' ft' : ''}</div>
                            </td>
                            <td class="col-asi hide-tablet">
                                ${subs.length === 1 ? formatASI(firstSub) : `<span style="opacity:0.75;">${subs.length} options (see details)</span>`}
                            </td>
                            <td class="col-sources">
                                ${renderSourceBadges(race.sources)}
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

/**
 * Renders the All Subraces (Flat) table view.
 */
function renderSubracesTable() {
    if (filteredSubraces.length === 0) {
        return `
            <table class="ac-table">
                <tbody>
                    <tr><td colspan="8" style="text-align:center; padding: 3rem;">No lineages found matching your criteria.</td></tr>
                </tbody>
            </table>
        `;
    }

    return `
        <table class="ac-table" id="races-subraces-table">
            <thead>
                <tr>
                    <th class="col-name" style="width: 180px;">Species</th>
                    <th class="col-subrace" style="width: 170px;">Subrace</th>
                    <th class="col-size hide-mobile" style="width: 90px;">Size</th>
                    <th class="col-speed hide-tablet" style="width: 90px;">Speed</th>
                    <th class="col-asi" style="width: 170px;">ASI</th>
                    <th class="col-traits hide-mobile">Traits</th>
                    <th class="col-notes hide-tablet">Notes / Advice</th>
                    <th class="col-sources" style="width: 160px;">Sources</th>
                </tr>
            </thead>
            <tbody>
                ${filteredSubraces.map(item => `
                    <tr data-subrace-id="${esc(item.id)}" data-race-id="${esc(item.parentRace?.id || '')}">
                        <td class="col-name">
                            <div class="name-cell">
                                <span>${esc(item.raceName)}</span>
                                <span class="row-hover-icon">Details →</span>
                            </div>
                        </td>
                        <td class="col-subrace">
                            <strong>${esc(item.subrace && item.subrace !== 'None' ? item.subrace : 'Standard')}</strong>
                            ${item.check_id ? `<br><small style="opacity:0.5; font-family:monospace;">${esc(item.check_id)}</small>` : ''}
                        </td>
                        <td class="col-size hide-mobile">${esc(item.size || '—')}</td>
                        <td class="col-speed hide-tablet">${esc(item.speed || '—')}${item.speed && !item.speed.includes('fly') ? ' ft' : ''}</td>
                        <td class="col-asi">${formatASI(item)}</td>
                        <td class="col-traits hide-mobile">${formatSnippet(item.extra, 70)}</td>
                        <td class="col-notes hide-tablet">${formatSnippet(item.notes_advice, 60)}</td>
                        <td class="col-sources">${renderSourceBadges(item.sources)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

/**
 * Attaches event handlers for toolbar controls (view toggles, source filter).
 */
function setupControls() {
    const btnSpecies = document.getElementById('btn-view-species');
    const btnSubraces = document.getElementById('btn-view-subraces');
    const sourceSelect = document.getElementById('ac-races-source-filter');

    if (btnSpecies) {
        btnSpecies.onclick = () => {
            if (currentViewMode !== 'species') {
                currentViewMode = 'species';
                renderView();
            }
        };
    }

    if (btnSubraces) {
        btnSubraces.onclick = () => {
            if (currentViewMode !== 'subraces') {
                currentViewMode = 'subraces';
                renderView();
            }
        };
    }

    if (sourceSelect) {
        sourceSelect.onchange = (e) => {
            selectedSourceFilter = e.target.value;
            applyFilters();
            renderView();
        };
    }
}

/**
 * Attaches row and chip click listeners to open the rich detail modal.
 */
function attachRowListeners() {
    const container = document.getElementById('ac-view-races');
    if (!container) return;

    // Subrace chip click in species view
    container.querySelectorAll('.ac-subrace-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            e.stopPropagation();
            const raceId = chip.dataset.raceId;
            const subIdx = parseInt(chip.dataset.subraceIdx, 10) || 0;
            const race = allRaces.find(r => r.id === raceId);
            if (race) showRaceDetail(race, subIdx);
        });
    });

    // Row clicks in Species table
    container.querySelectorAll('#races-species-table tbody tr').forEach(row => {
        row.addEventListener('click', () => {
            const raceId = row.dataset.raceId;
            const race = allRaces.find(r => r.id === raceId);
            if (race) showRaceDetail(race, 0);
        });
    });

    // Row clicks in Subraces table
    container.querySelectorAll('#races-subraces-table tbody tr').forEach(row => {
        row.addEventListener('click', () => {
            const subraceId = row.dataset.subraceId;
            const subItem = allSubracesFlat.find(s => s.id === subraceId);
            if (!subItem) return;
            const parentRace = subItem.parentRace;
            if (parentRace) {
                const subIdx = (parentRace.subraces || []).findIndex(s => s.id === subraceId);
                showRaceDetail(parentRace, Math.max(0, subIdx));
            }
        });
    });
}

/**
 * Opens and renders the rich Race & Subrace Detail Modal.
 * Includes subrace navigation tabs and multi-source variant inspector.
 * 
 * @param {Object} race - Parent race object from ac_races
 * @param {number} activeSubraceIndex - Index of currently focused subrace
 */
export function showRaceDetail(race, activeSubraceIndex = 0) {
    const isAdmin = getAdminMode();
    const subraces = race.subraces || [];
    const currentSub = subraces[activeSubraceIndex] || subraces[0] || {};
    const subraceName = currentSub.subrace && currentSub.subrace !== 'None' ? currentSub.subrace : '';

    const html = `
        <div class="detail-header">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem;">
                <div class="detail-category">${renderSourceBadges(currentSub.sources?.length ? currentSub.sources : race.sources)}</div>
                ${currentSub.check_id ? `<span style="font-family: monospace; font-size: 0.8rem; opacity: 0.6;">Audit Check: ${esc(currentSub.check_id)}</span>` : ''}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
                <h2 class="detail-title" style="margin: 0;">
                    ${esc(race.name)} 
                    ${subraceName ? `<small style="opacity:0.75; font-size: 0.65em; font-weight: 500;">(${esc(subraceName)})</small>` : ''}
                </h2>
                ${isAdmin ? `
                    <div class="detail-actions">
                        <button id="modal-btn-edit-lineage" class="ac-btn-admin ac-btn-secondary" title="Edit this lineage">✏️ Edit Lineage</button>
                        <button id="modal-btn-add-subrace" class="ac-btn-admin ac-btn-primary" title="Add a new subrace to this species">➕ Add Lineage</button>
                        <button id="modal-btn-edit-race" class="ac-btn-admin ac-btn-secondary" title="Edit base species name or order">⚙️ Edit Species</button>
                        <button id="modal-btn-delete-lineage" class="ac-btn-admin ac-btn-delete" title="Delete this lineage">🗑️ Delete</button>
                    </div>
                ` : ''}
            </div>
        </div>

        ${subraces.length > 1 ? `
            <div class="ac-modal-subrace-nav">
                <div class="ac-modal-nav-title">Select Subrace / Lineage (${subraces.length} available):</div>
                <div class="ac-modal-subrace-tabs">
                    ${subraces.map((s, idx) => {
                        const label = s.subrace && s.subrace !== 'None' ? s.subrace : 'Standard';
                        const isActive = idx === activeSubraceIndex;
                        return `
                            <button class="ac-modal-tab-btn ${isActive ? 'active' : ''}" data-idx="${idx}">
                                <span>${esc(label)}</span>
                                ${s.sources?.length ? `<span style="opacity: 0.7; font-size: 0.75em;">(${esc(s.sources.join(', '))})</span>` : ''}
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>
        ` : ''}

        <div class="detail-grid">
            <div class="detail-item">
                <label>Size</label>
                <value>${esc(currentSub.size || 'Medium')}</value>
            </div>
            <div class="detail-item">
                <label>Speed</label>
                <value>${esc(currentSub.speed || '30')}${currentSub.speed && !currentSub.speed.includes('fly') ? ' ft' : ''}</value>
            </div>
            <div class="detail-item">
                <label>Ability Score Increase</label>
                <value>${formatASI(currentSub)}</value>
            </div>
            <div class="detail-item">
                <label>Languages</label>
                <value>${esc(currentSub.language || 'Common')}</value>
            </div>
        </div>

        ${currentSub.extra ? `
            <div class="detail-section">
                <h4>Racial Traits & Features</h4>
                <p style="white-space: pre-wrap; line-height: 1.6;">${esc(currentSub.extra)}</p>
            </div>
        ` : ''}

        ${currentSub.notes_advice ? `
            <div class="detail-section">
                <h4>Guild Notes / Rage Advice</h4>
                <div class="advice-content" style="white-space: pre-wrap; line-height: 1.6; background: rgba(var(--palette-brand-highlight), 0.06); padding: 1rem; border-radius: 6px; border-left: 4px solid var(--palette-brand-highlight);">
                    ${esc(currentSub.notes_advice)}
                </div>
            </div>
        ` : ''}

        ${renderVariantsSection(race, currentSub)}
    `;

    openModal(html);

    if (isAdmin) {
        document.getElementById('modal-btn-edit-lineage')?.addEventListener('click', () => {
            openRaceForm(currentSub, race);
        });
        document.getElementById('modal-btn-add-subrace')?.addEventListener('click', () => {
            openRaceForm(null, race);
        });
        document.getElementById('modal-btn-edit-race')?.addEventListener('click', () => {
            openEditRaceModal(race);
        });
        document.getElementById('modal-btn-delete-lineage')?.addEventListener('click', () => {
            confirmAndDeleteSubrace(currentSub, race);
        });
    }

    // Wire interactive subrace tab switching inside the open modal
    const modalEl = document.getElementById('ac-detail-modal');
    if (modalEl) {
        modalEl.querySelectorAll('.ac-modal-tab-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const newIdx = parseInt(btn.dataset.idx, 10);
                showRaceDetail(race, newIdx);
            };
        });
    }
}

/**
 * Renders the multi-source variant breakdown (JSON-style) if present.
 * 
 * @param {Object} race - Parent race object
 * @param {Object} currentSub - Active subrace object
 * @returns {string} HTML for variants section or empty string
 */
function renderVariantsSection(race, currentSub) {
    const variants = race.variants || currentSub.variants;
    if (!variants || typeof variants !== 'object' || Object.keys(variants).length === 0) {
        return '';
    }

    const variantKeys = Object.keys(variants);

    return `
        <div class="detail-section" style="margin-top: 2rem;">
            <h4>Multi-Source Printings & Edition Variants</h4>
            <p style="font-size: 0.88rem; color: var(--color-text-secondary); margin-bottom: 1rem;">
                This species has multiple official printings across sources. Select an edition code to review specific mechanical differences:
            </p>
            <div class="ac-variants-grid">
                ${variantKeys.map(code => {
                    const v = variants[code];
                    const src = getSourceByKey(code);
                    const sourceTitle = src ? `${src.name} (${code})` : `Variant: ${code}`;
                    
                    return `
                        <div class="ac-variant-block">
                            <h5>
                                <span class="ac-source-badge badge-variant">${esc(code)}</span>
                                <span>${esc(sourceTitle)}</span>
                            </h5>
                            <div style="font-size: 0.88rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.5rem; margin: 0.5rem 0 0.75rem 0;">
                                <div><strong>Speed:</strong> ${esc(v.speed || '—')}</div>
                                <div><strong>Size:</strong> ${esc(v.size || '—')}</div>
                                <div><strong>ASI:</strong> ${formatASI(v)}</div>
                            </div>
                            ${v.extra ? `<div style="font-size: 0.85rem; margin-top: 0.4rem;"><strong>Traits:</strong> ${esc(v.extra)}</div>` : ''}
                            ${v.notes_advice ? `<div style="font-size: 0.85rem; margin-top: 0.4rem; font-style: italic; opacity: 0.85;"><strong>Notes:</strong> ${esc(v.notes_advice)}</div>` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

/**
 * Formats Ability Score Increases into a readable string.
 * Handles both subrace records and JSON variant objects.
 * 
 * @param {Object} r - Record containing ability score values
 * @returns {string} Formatted string (e.g. "DEX +2, WIS +1")
 */
function formatASI(r) {
    if (!r) return '—';

    // Support nested asi object if present in JSON variants
    if (r.asi && typeof r.asi === 'object') {
        if (r.asi.custom) return esc(r.asi.custom);
        const parts = [];
        for (const [k, v] of Object.entries(r.asi)) {
            parts.push(`${k.toUpperCase()} ${Number(v) > 0 ? '+' : ''}${v}`);
        }
        if (parts.length > 0) return parts.join(', ');
    }

    const mods = [];
    if (r.str && r.str !== '-') mods.push(`STR ${Number(r.str) > 0 ? '+' : ''}${r.str}`);
    if (r.dex && r.dex !== '-') mods.push(`DEX ${Number(r.dex) > 0 ? '+' : ''}${r.dex}`);
    if (r.con && r.con !== '-') mods.push(`CON ${Number(r.con) > 0 ? '+' : ''}${r.con}`);
    
    const intVal = r.int_stat ?? r.int;
    if (intVal && intVal !== '-') mods.push(`INT ${Number(intVal) > 0 ? '+' : ''}${intVal}`);
    
    if (r.wis && r.wis !== '-') mods.push(`WIS ${Number(r.wis) > 0 ? '+' : ''}${r.wis}`);
    if (r.cha && r.cha !== '-') mods.push(`CHA ${Number(r.cha) > 0 ? '+' : ''}${r.cha}`);

    if (mods.length === 0) {
        if (r.str === '-' || r.dex === '-') return 'Special / Custom';
        return '—';
    }

    return mods.join(', ');
}

/**
 * Opens an edit or creation form modal for a Race / Lineage.
 * 
 * @param {Object|null} subraceItem - Existing subrace to edit or null to create new
 * @param {Object|null} defaultParentRace - Pre-selected parent race object
 */
export async function openRaceForm(subraceItem = null, defaultParentRace = null) {
    if (allRaces.length === 0) {
        allRaces = sortByDisplayOrder((await getRaces()) || []);
    }
    if (availableSourceKeys.length === 0) {
        const sm = await getSourcesMap();
        availableSourceKeys = Array.from(sm.keys()).sort();
    }

    const isNew = !subraceItem;
    let selectedParentRace = defaultParentRace || (isNew ? null : (allRaces.find(r => r.race_id === subraceItem.race_id) || allRaces.find(r => r.name === subraceItem.raceName) || null));
    let selectedSources = isNew 
        ? (selectedParentRace?.sources ? [...selectedParentRace.sources] : [])
        : [...(subraceItem.sources || [])];

    // Default display order to bottom of subraces for existing race, or 1 for new
    const nextSubraceOrder = isNew 
        ? (selectedParentRace ? getNextDisplayOrder(selectedParentRace.subraces || [], 1) : 1)
        : (subraceItem.display_order ?? 1);

    const nextCheckId = isNew 
        ? getNextRaceCheckId(allSubracesFlat)
        : (subraceItem.check_id || '');

    const formHtml = `
        <div class="detail-header">
            <div>
                <span class="detail-category">${isNew ? 'New Lineage / Species' : 'Edit Lineage'}</span>
                <h2 class="detail-title">${isNew ? 'Add Race or Lineage' : `Edit Lineage: ${esc(selectedParentRace?.name || '')} (${esc(subraceItem.subrace || 'None')})`}</h2>
            </div>
        </div>

        <form id="ac-race-form" class="ac-edit-form">
            <div id="race-form-error" class="ac-form-error" style="display: none; background: rgba(211, 47, 47, 0.1); border-left: 4px solid #d32f2f; color: #d32f2f; padding: 0.75rem; border-radius: 4px; font-weight: 500;"></div>

            <div class="ac-form-grid">
                <!-- Step 1: Parent Race / Species -->
                <div class="ac-form-group">
                    <label for="race-input-parent">Species / Base Race *</label>
                    <select id="race-input-parent" class="ac-form-select" ${!isNew ? 'disabled' : ''}>
                        <option value="NEW" ${!selectedParentRace ? 'selected' : ''}>+ Create New Species...</option>
                        ${allRaces.map(r => `
                            <option value="${esc(r.race_id)}" ${(selectedParentRace && selectedParentRace.race_id === r.race_id) ? 'selected' : ''}>
                                ${esc(r.name)}
                            </option>
                        `).join('')}
                    </select>
                </div>

                <!-- New Species Name (Conditional) -->
                <div class="ac-form-group" id="race-new-species-group" style="${selectedParentRace ? 'display: none;' : ''}">
                    <label for="race-input-new-name">New Species Name *</label>
                    <input type="text" id="race-input-new-name" class="ac-form-input" placeholder="e.g. Owlin, Thri-kreen" ${!selectedParentRace ? 'required' : ''}>
                    <small class="ac-form-help">Base species order will default to bottom (${getNextDisplayOrder(allRaces)})</small>
                </div>

                <!-- Step 2: Lineage / Subrace -->
                <div class="ac-form-group">
                    <label for="race-input-subrace">Subrace Name</label>
                    <input type="text" id="race-input-subrace" class="ac-form-input" value="${esc(isNew ? '' : (subraceItem.subrace === 'None' ? '' : subraceItem.subrace))}" placeholder="e.g. High, Wood, or leave blank for 'None'">
                    <small class="ac-form-help">Leave blank or 'None' if this species has no subraces</small>
                </div>

                <div class="ac-form-group">
                    <label for="race-input-check-id">Audit Check ID *</label>
                    <input type="text" id="race-input-check-id" required class="ac-form-input" value="${esc(nextCheckId)}" placeholder="e.g. RAC_0248">
                    <small class="ac-form-help">Unique audit check identifier</small>
                </div>

                <!-- Step 3: Stats -->
                <div class="ac-form-group">
                    <label for="race-input-size">Size *</label>
                    <input type="text" id="race-input-size" required class="ac-form-input" list="ac-race-sizes" value="${esc(isNew ? 'Medium' : (subraceItem.size || 'Medium'))}">
                    <datalist id="ac-race-sizes">
                        <option value="Medium">
                        <option value="Small">
                        <option value="S or M">
                        <option value="Large">
                    </datalist>
                </div>

                <div class="ac-form-group">
                    <label for="race-input-speed">Speed *</label>
                    <input type="text" id="race-input-speed" required class="ac-form-input" value="${esc(isNew ? '30' : (subraceItem.speed || '30'))}" placeholder="e.g. 30, 25, 30 ft (fly 30 ft)">
                </div>

                <div class="ac-form-group">
                    <label for="race-input-language">Languages</label>
                    <input type="text" id="race-input-language" class="ac-form-input" value="${esc(isNew ? 'Common' : (subraceItem.language || 'Common'))}" placeholder="e.g. Common, Elvish, +1">
                </div>

                <div class="ac-form-group">
                    <label for="race-input-order">Lineage Display Order *</label>
                    <input type="number" step="any" id="race-input-order" required class="ac-form-input" value="${esc(nextSubraceOrder)}">
                    <small class="ac-form-help">Defaulted to bottom of species. Fractional orders (e.g. 1.5) supported.</small>
                </div>
            </div>

            <!-- Ability Score Increases -->
            <div class="ac-form-group" style="margin-top: 0.5rem;">
                <label>Ability Score Increases (ASI)</label>
                <div class="ac-asi-inputs-grid">
                    <div class="ac-asi-item">
                        <label for="race-asi-str">STR</label>
                        <input type="text" id="race-asi-str" class="ac-form-input" value="${esc(subraceItem?.str || '')}" placeholder="0">
                    </div>
                    <div class="ac-asi-item">
                        <label for="race-asi-dex">DEX</label>
                        <input type="text" id="race-asi-dex" class="ac-form-input" value="${esc(subraceItem?.dex || '')}" placeholder="0">
                    </div>
                    <div class="ac-asi-item">
                        <label for="race-asi-con">CON</label>
                        <input type="text" id="race-asi-con" class="ac-form-input" value="${esc(subraceItem?.con || '')}" placeholder="0">
                    </div>
                    <div class="ac-asi-item">
                        <label for="race-asi-int">INT</label>
                        <input type="text" id="race-asi-int" class="ac-form-input" value="${esc(subraceItem?.int_stat || '')}" placeholder="0">
                    </div>
                    <div class="ac-asi-item">
                        <label for="race-asi-wis">WIS</label>
                        <input type="text" id="race-asi-wis" class="ac-form-input" value="${esc(subraceItem?.wis || '')}" placeholder="0">
                    </div>
                    <div class="ac-asi-item">
                        <label for="race-asi-cha">CHA</label>
                        <input type="text" id="race-asi-cha" class="ac-form-input" value="${esc(subraceItem?.cha || '')}" placeholder="0">
                    </div>
                </div>
            </div>

            <!-- Step 4: Multi-Select Sources Tag Picker -->
            <div class="ac-form-group" style="margin-top: 0.5rem;">
                <label>Source Attribution *</label>
                <div class="ac-tag-picker">
                    <div id="race-sources-chips" class="ac-tag-chips-container"></div>
                    <div style="display: flex; gap: 0.5rem;">
                        <select id="race-source-select" class="ac-form-select" style="flex: 1;">
                            <option value="">+ Add Source to Lineage...</option>
                            ${availableSourceKeys.map(k => {
                                const src = getSourceByKey(k);
                                const label = src ? `${k} - ${src.name}` : k;
                                return `<option value="${esc(k)}">${esc(label)}</option>`;
                            }).join('')}
                        </select>
                    </div>
                </div>
                <small class="ac-form-help">Select one or more official or homebrew sourcebooks</small>
            </div>

            <!-- Traits and Notes -->
            <div class="ac-form-group" style="margin-top: 0.5rem;">
                <label for="race-input-extra">Racial Traits & Features</label>
                <textarea id="race-input-extra" rows="3" class="ac-form-textarea" placeholder="e.g. Darkvision, Fey Ancestry, Trance, Keen Senses...">${esc(subraceItem?.extra || '')}</textarea>
            </div>

            <div class="ac-form-group">
                <label for="race-input-notes">Guild Notes / Rage Advice</label>
                <textarea id="race-input-notes" rows="3" class="ac-form-textarea" placeholder="Guild ruling, character creation guidance, Markdown links allowed...">${esc(subraceItem?.notes_advice || '')}</textarea>
            </div>

            <div class="detail-actions" style="margin-top: 1.5rem; justify-content: flex-end;">
                <button type="button" class="ac-btn-admin ac-btn-secondary" id="race-form-cancel">Cancel</button>
                <button type="submit" class="ac-btn-admin ac-btn-primary" id="race-form-submit">${isNew ? 'Create Race / Lineage' : 'Save Changes'}</button>
            </div>
        </form>
    `;

    openModal(formHtml);

    // Setup interactive source tags
    function updateSourceChips() {
        const chipsContainer = document.getElementById('race-sources-chips');
        if (!chipsContainer) return;
        if (selectedSources.length === 0) {
            chipsContainer.innerHTML = '<span class="ac-tag-empty-msg">No sources selected. Use dropdown below to add.</span>';
            return;
        }
        chipsContainer.innerHTML = selectedSources.map(k => {
            const src = getSourceByKey(k);
            const label = src ? `${k} (${src.name})` : k;
            return `
                <span class="ac-tag-chip" data-key="${esc(k)}">
                    <span>${esc(label)}</span>
                    <span class="ac-tag-remove" data-key="${esc(k)}" title="Remove source">&times;</span>
                </span>
            `;
        }).join('');

        chipsContainer.querySelectorAll('.ac-tag-remove').forEach(rm => {
            rm.addEventListener('click', (e) => {
                e.stopPropagation();
                const key = rm.dataset.key;
                selectedSources = selectedSources.filter(sk => sk !== key);
                updateSourceChips();
            });
        });
    }

    updateSourceChips();

    const sourceSelect = document.getElementById('race-source-select');
    if (sourceSelect) {
        sourceSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val && !selectedSources.includes(val)) {
                selectedSources.push(val);
                updateSourceChips();
            }
            sourceSelect.value = '';
        });
    }

    // Dynamic parent race selection changes
    const parentSelect = document.getElementById('race-input-parent');
    const newSpeciesGroup = document.getElementById('race-new-species-group');
    const newNameInput = document.getElementById('race-input-new-name');
    const orderInput = document.getElementById('race-input-order');

    if (parentSelect) {
        parentSelect.addEventListener('change', () => {
            const isNewSpecies = parentSelect.value === 'NEW';
            if (newSpeciesGroup) {
                newSpeciesGroup.style.display = isNewSpecies ? '' : 'none';
            }
            if (newNameInput) {
                newNameInput.required = isNewSpecies;
            }
            if (orderInput && isNew) {
                if (isNewSpecies) {
                    orderInput.value = 1;
                } else {
                    const chosen = allRaces.find(r => r.race_id === parentSelect.value);
                    orderInput.value = chosen ? getNextDisplayOrder(chosen.subraces || [], 1) : 1;
                }
            }
        });
    }

    // Cancel handler
    document.getElementById('race-form-cancel')?.addEventListener('click', () => {
        if (!isNew && selectedParentRace) {
            showRaceDetail(selectedParentRace, 0);
        } else {
            const modal = document.getElementById('ac-detail-modal');
            if (modal && typeof modal.close === 'function') modal.close();
        }
    });

    // Form submission
    const form = document.getElementById('ac-race-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const errEl = document.getElementById('race-form-error');
            if (errEl) errEl.style.display = 'none';

            if (selectedSources.length === 0) {
                if (errEl) {
                    errEl.textContent = 'Please select at least one source for this lineage.';
                    errEl.style.display = 'block';
                }
                return;
            }

            const isNewSpecies = parentSelect?.value === 'NEW';
            let targetRaceId = parentSelect?.value;
            let parentRaceRecord = null;

            if (isNewSpecies) {
                const newName = (newNameInput?.value || '').trim();
                if (!newName) {
                    if (errEl) {
                        errEl.textContent = 'Species Name is required.';
                        errEl.style.display = 'block';
                    }
                    return;
                }
                if (allRaces.some(r => r.name.toLowerCase() === newName.toLowerCase())) {
                    if (errEl) {
                        errEl.textContent = `A species with the name "${newName}" already exists.`;
                        errEl.style.display = 'block';
                    }
                    return;
                }

                const nextRaceId = getNextRaceId(allRaces);
                const nextRaceOrder = getNextDisplayOrder(allRaces, 1);

                const { data: createdRace, error: raceErr } = await createRace({
                    race_id: nextRaceId,
                    name: newName,
                    sources: selectedSources,
                    display_order: nextRaceOrder
                });

                if (raceErr) {
                    if (errEl) {
                        errEl.textContent = `Error creating base species: ${raceErr.message || JSON.stringify(raceErr)}`;
                        errEl.style.display = 'block';
                    }
                    return;
                }

                targetRaceId = nextRaceId;
                parentRaceRecord = createdRace;
            } else {
                parentRaceRecord = allRaces.find(r => r.race_id === targetRaceId);
            }

            const rawSubrace = document.getElementById('race-input-subrace')?.value?.trim();
            const subraceVal = rawSubrace && rawSubrace.toLowerCase() !== 'none' ? rawSubrace : 'None';
            const checkIdVal = document.getElementById('race-input-check-id')?.value?.trim();
            const sizeVal = document.getElementById('race-input-size')?.value?.trim() || 'Medium';
            const speedVal = document.getElementById('race-input-speed')?.value?.trim() || '30';
            const langVal = document.getElementById('race-input-language')?.value?.trim() || null;
            const extraVal = document.getElementById('race-input-extra')?.value?.trim() || null;
            const notesVal = document.getElementById('race-input-notes')?.value?.trim() || null;
            const orderVal = cleanFloat(parseFloat(orderInput?.value) || 1);

            const strVal = document.getElementById('race-asi-str')?.value?.trim() || null;
            const dexVal = document.getElementById('race-asi-dex')?.value?.trim() || null;
            const conVal = document.getElementById('race-asi-con')?.value?.trim() || null;
            const intVal = document.getElementById('race-asi-int')?.value?.trim() || null;
            const wisVal = document.getElementById('race-asi-wis')?.value?.trim() || null;
            const chaVal = document.getElementById('race-asi-cha')?.value?.trim() || null;

            const subPayload = {
                race_id: targetRaceId,
                check_id: checkIdVal,
                subrace: subraceVal,
                sources: selectedSources,
                size: sizeVal,
                speed: speedVal,
                language: langVal,
                str: strVal,
                dex: dexVal,
                con: conVal,
                int_stat: intVal,
                wis: wisVal,
                cha: chaVal,
                extra: extraVal,
                notes_advice: notesVal,
                display_order: orderVal
            };

            if (isNew) {
                const { data: createdSub, error: subErr } = await createSubrace(subPayload);
                if (subErr) {
                    if (errEl) {
                        errEl.textContent = `Error creating lineage: ${subErr.message || JSON.stringify(subErr)}`;
                        errEl.style.display = 'block';
                    }
                    return;
                }
            } else {
                const { data: updatedSub, error: subErr } = await updateSubrace(subraceItem.id, subPayload);
                if (subErr) {
                    if (errEl) {
                        errEl.textContent = `Error updating lineage: ${subErr.message || JSON.stringify(subErr)}`;
                        errEl.style.display = 'block';
                    }
                    return;
                }
            }

            // Sync parent race sources if needed
            if (parentRaceRecord && parentRaceRecord.id) {
                const currentRaceSources = parentRaceRecord.sources || [];
                const mergedSources = Array.from(new Set([...currentRaceSources, ...selectedSources]));
                if (mergedSources.length > currentRaceSources.length) {
                    await updateRace(parentRaceRecord.id, { sources: mergedSources });
                }
            }

            // Close modal and refresh view
            const modal = document.getElementById('ac-detail-modal');
            if (modal && typeof modal.close === 'function') modal.close();

            await initRaces();
            window.dispatchEvent(new CustomEvent('ac:races-updated'));
        });
    }
}

/**
 * Opens a modal to edit base species name and display order.
 * 
 * @param {Object} race - Parent race object
 */
export async function openEditRaceModal(race) {
    if (!race) return;

    const html = `
        <div class="detail-header">
            <div>
                <span class="detail-category">Edit Base Species</span>
                <h2 class="detail-title">${esc(race.name)}</h2>
            </div>
        </div>

        <form id="ac-edit-race-form" class="ac-edit-form">
            <div id="edit-race-error" class="ac-form-error" style="display: none; background: rgba(211, 47, 47, 0.1); border-left: 4px solid #d32f2f; color: #d32f2f; padding: 0.75rem; border-radius: 4px; font-weight: 500;"></div>

            <div class="ac-form-group">
                <label for="race-edit-name">Species Name *</label>
                <input type="text" id="race-edit-name" required class="ac-form-input" value="${esc(race.name)}">
            </div>

            <div class="ac-form-group">
                <label for="race-edit-order">Species Display Order *</label>
                <input type="number" step="any" id="race-edit-order" required class="ac-form-input" value="${esc(race.display_order ?? 0)}">
                <small class="ac-form-help">Fractional indexing enabled for ordering species</small>
            </div>

            <div class="detail-actions" style="margin-top: 1.5rem; justify-content: flex-end;">
                <button type="button" class="ac-btn-admin ac-btn-secondary" id="race-edit-cancel">Cancel</button>
                <button type="submit" class="ac-btn-admin ac-btn-primary" id="race-edit-submit">Save Species</button>
            </div>
        </form>
    `;

    openModal(html);

    document.getElementById('race-edit-cancel')?.addEventListener('click', () => {
        showRaceDetail(race, 0);
    });

    document.getElementById('ac-edit-race-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errEl = document.getElementById('edit-race-error');
        const newName = document.getElementById('race-edit-name')?.value?.trim();
        const newOrder = cleanFloat(parseFloat(document.getElementById('race-edit-order')?.value) || 0);

        if (!newName) {
            if (errEl) {
                errEl.textContent = 'Species Name cannot be empty.';
                errEl.style.display = 'block';
            }
            return;
        }

        const { data, error } = await updateRace(race.id, {
            name: newName,
            display_order: newOrder
        });

        if (error) {
            if (errEl) {
                errEl.textContent = `Error updating species: ${error.message || JSON.stringify(error)}`;
                errEl.style.display = 'block';
            }
            return;
        }

        await initRaces();
        window.dispatchEvent(new CustomEvent('ac:races-updated'));
        const updated = allRaces.find(r => r.id === race.id);
        if (updated) {
            showRaceDetail(updated, 0);
        } else {
            const modal = document.getElementById('ac-detail-modal');
            if (modal && typeof modal.close === 'function') modal.close();
        }
    });
}

/**
 * Prompts user confirmation to delete a lineage or base species.
 * 
 * @param {Object} currentSub - Subrace to delete
 * @param {Object} race - Parent race object
 */
export async function confirmAndDeleteSubrace(currentSub, race) {
    if (!currentSub || !race) return;

    const isOnlySubrace = (race.subraces || []).length <= 1;
    const subLabel = currentSub.subrace && currentSub.subrace !== 'None' ? currentSub.subrace : 'Standard';

    let msg = `Are you sure you want to delete the lineage "${subLabel}" (${currentSub.check_id || ''})?`;
    if (isOnlySubrace) {
        msg = `"${subLabel}" is the ONLY lineage for "${race.name}". Deleting it will permanently delete the base species "${race.name}" as well. Are you sure you want to proceed?`;
    }

    if (!window.confirm(msg)) {
        return;
    }

    if (isOnlySubrace) {
        const { success, error } = await deleteRace(race.id);
        if (!success) {
            alert(`Error deleting species: ${error?.message || 'Unknown error'}`);
            return;
        }
    } else {
        const { success, error } = await deleteSubrace(currentSub.id);
        if (!success) {
            alert(`Error deleting lineage: ${error?.message || 'Unknown error'}`);
            return;
        }
    }

    const modal = document.getElementById('ac-detail-modal');
    if (modal && typeof modal.close === 'function') modal.close();

    await initRaces();
    window.dispatchEvent(new CustomEvent('ac:races-updated'));
}
