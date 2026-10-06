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
 * - Accordion View: Base species with expandable drawers for multiple lineages and instant detail modals.
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
 * @property {string} [notes_advice] - Notes and rage advice
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
    renderSourceTagPicker,
    renderMarkdownLinks 
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

let currentViewMode = 'accordion';
let currentSearchTerm = '';
let selectedSourceFilter = 'ALL';
let expandedRaceIds = new Set();
let allExpanded = false;

/**
 * Returns current Races view mode ('accordion').
 * 
 * @returns {string} View mode
 */
export function getViewMode() {
    return 'accordion';
}

/**
 * Sets Races view mode (settled on accordion).
 * 
 * @param {'accordion'} [mode] - Target view mode
 */
export function setViewMode(mode = 'accordion') {
    currentViewMode = 'accordion';
}

/**
 * Resolves inherited properties from parent species down to lineage record:
 * - Size & Speed: Subrace overrides if non-null, otherwise inherits from Base Race.
 * - Ability Score Increases: Subrace overrides individual stats if non-null, otherwise inherits base race stat.
 * - Languages: Appends / combines subrace extra languages to Base Race languages.
 * - Extra Traits: Combines Base Traits + Subrace Features.
 * - Notes / Advice: Appends Subrace Notes to Base Species Notes.
 * 
 * @param {Object} sub - Subrace / lineage record from ac_subraces
 * @param {Object} race - Parent species record from ac_races
 * @returns {Object} Lineage with inherited properties resolved
 */
export function resolveInheritedLineage(sub, race) {
    if (!sub) return {};
    if (!race) return { ...sub };

    // Size: subrace overrides if set, else base race fallback
    const size = sub.size || race.size || 'M';

    // Speed: subrace overrides if set, else base race fallback
    const speed = sub.speed || race.speed || '30';

    // Ability Scores: subrace stat overrides base race stat if present, otherwise inherits base
    const str = (sub.str !== null && sub.str !== undefined && sub.str !== '') ? sub.str : (race.str || null);
    const dex = (sub.dex !== null && sub.dex !== undefined && sub.dex !== '') ? sub.dex : (race.dex || null);
    const con = (sub.con !== null && sub.con !== undefined && sub.con !== '') ? sub.con : (race.con || null);
    const int_stat = (sub.int_stat !== null && sub.int_stat !== undefined && sub.int_stat !== '') ? sub.int_stat : (race.int_stat || null);
    const wis = (sub.wis !== null && sub.wis !== undefined && sub.wis !== '') ? sub.wis : (race.wis || null);
    const cha = (sub.cha !== null && sub.cha !== undefined && sub.cha !== '') ? sub.cha : (race.cha || null);

    // Languages: combine cleanly without duplicate "Common"
    let language = sub.language || race.language || 'Common';
    if (race.language && sub.language && race.language !== sub.language) {
        const subLangClean = sub.language.trim();
        if (subLangClean.startsWith('+') || subLangClean.startsWith('1 +') || !subLangClean.toLowerCase().includes('common')) {
            language = `${race.language}, ${subLangClean}`;
        }
    }

    // Extra Traits: combine if both present and different
    let extra = sub.extra || race.extra || null;
    if (race.extra && sub.extra && race.extra.trim() !== sub.extra.trim()) {
        extra = `${race.extra.trim()}\n${sub.extra.trim()}`;
    }

    // Notes / Advice: append subrace notes to base race notes
    let notes_advice = sub.notes_advice || race.notes_advice || null;
    if (race.notes_advice && sub.notes_advice && race.notes_advice.trim() !== sub.notes_advice.trim()) {
        notes_advice = `${race.notes_advice.trim()}\n\n${sub.notes_advice.trim()}`;
    }

    return {
        ...sub,
        size,
        speed,
        language,
        str,
        dex,
        con,
        int_stat,
        wis,
        cha,
        extra,
        notes_advice,
        parentRace: race,
        raceName: race.name
    };
}

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
        openRaceForm(null, null, 'subrace');
    });
    window.addEventListener('ac:open-new-race-form', () => {
        openRaceForm(null, null, 'race');
    });
    window.addEventListener('ac:races-updated', () => {
        allRaces = [];
        allSubracesFlat = [];
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

    if (forceRefresh || allRaces.length === 0) {
        selectedSourceFilter = 'ALL';
        currentSearchTerm = '';
    }

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
    
    // Flatten subraces list with inherited properties resolved for direct 1-to-1 table display
    allSubracesFlat = [];
    const sourceKeySet = new Set();

    allRaces.forEach(race => {
        (race.sources || []).forEach(k => sourceKeySet.add(k));
        
        const subs = race.subraces || [];
        race.resolvedSubraces = [];
        subs.forEach(sub => {
            (sub.sources || []).forEach(k => sourceKeySet.add(k));
            const merged = resolveInheritedLineage(sub, race);
            race.resolvedSubraces.push(merged);
            allSubracesFlat.push(merged);
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
 * Applies search term and source filters across all species and lineages.
 */
function applyFilters() {
    const term = currentSearchTerm.toLowerCase().trim();

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
        const languageMatch = item.language?.toLowerCase().includes(term);
        const extraMatch = item.extra?.toLowerCase().includes(term);
        const adviceMatch = item.notes_advice?.toLowerCase().includes(term);
        const asiMatch = formatASI(item).toLowerCase().includes(term);
        const sourceMatch = (item.sources || []).some(sk => {
            if (sk.toLowerCase().includes(term)) return true;
            const src = getSourceByKey(sk);
            return src?.name?.toLowerCase().includes(term) || src?.abbreviation?.toLowerCase().includes(term);
        });

        return raceMatch || subraceMatch || checkIdMatch || languageMatch || extraMatch || adviceMatch || asiMatch || sourceMatch;
    });

    const matchingRaceNames = new Set(filteredSubraces.map(s => s.raceName));
    filteredRaces = allRaces.filter(r => matchingRaceNames.has(r.name));
}

/**
 * Renders the complete Races view into `#ac-view-races`.
 */
function renderView() {
    const container = document.getElementById('ac-view-races');
    if (!container) return;

    const totalSpecies = allRaces.length;
    const totalLineages = allSubracesFlat.length;
    const showingCount = filteredSubraces.length;
    const isAdmin = getAdminMode();

    const tableContentHtml = renderAccordionTable(isAdmin, 'races-accordion-table');

    container.innerHTML = `
        <div class="ac-races-toolbar">
            <div class="ac-races-stats" id="races-stats">
                Showing <strong>${showingCount}</strong> Lineages 
                <span style="opacity: 0.7;">(across ${totalSpecies} Species)</span>
            </div>

            <div class="ac-races-controls">
                <!-- Source Filter Dropdown -->
                <select class="ac-filter-select ac-source-filter-select" id="ac-races-source-filter" aria-label="Filter by Source">
                    <option value="ALL" ${selectedSourceFilter === 'ALL' ? 'selected' : ''}>All Sources (${availableSourceKeys.length})</option>
                    ${availableSourceKeys.map(k => {
                        const src = getSourceByKey(k);
                        const label = src ? `${k} - ${src.name}` : k;
                        return `<option value="${esc(k)}" ${selectedSourceFilter === k ? 'selected' : ''}>${esc(label)}</option>`;
                    }).join('')}
                </select>

                <button type="button" class="ac-btn-toggle-all" id="accordion-toggle-all-btn" title="Toggle expanding or collapsing all species">
                    ${allExpanded ? 'Collapse All ▲' : 'Expand All ▼'}
                </button>
            </div>
        </div>

        <div class="ac-table-wrapper">
            ${tableContentHtml}
        </div>
    `;

    setupControls();
    attachRowListeners();
}

/**
 * Cleanly formats racial traits and feature snippets, preserving line breaks via <br> without unwanted whitespace.
 * 
 * @param {string} text - Raw traits text
 * @returns {string} Sanitized HTML string
 */
export function formatTraits(text) {
    if (!text || !text.trim() || text === '—') return '—';
    return esc(text.trim()).split(/\r?\n/).map(l => l.trim()).filter(Boolean).join('<br>');
}

/**
 * Cleanly formats guild rulings and notes, rendering markdown links without unwanted leading whitespace.
 * 
 * @param {string} text - Raw notes / advice text
 * @returns {string} Sanitized HTML string with links
 */
export function formatNotesAdvice(text) {
    if (!text || !text.trim() || text === '—') return '—';
    return renderMarkdownLinks(text);
}


/**
 * Renders Accordion / Grouped Species View:
 * - Base Species displayed at the top level with inherited base stats.
 * - Species with subraces feature an interactive chevron and expandable drawer.
 * - Single-lineage species display directly without requiring an accordion click.
 * 
 * @param {boolean} [isAdmin=false] - Whether staff admin mode is enabled
 * @param {string} [tableId='races-accordion-table'] - HTML table ID
 * @returns {string} Table HTML
 */
function renderAccordionTable(isAdmin = false, tableId = 'races-accordion-table') {
    if (filteredRaces.length === 0) {
        return `
            <table class="ac-table ac-accordion-table" id="${tableId}">
                <tbody>
                    <tr><td colspan="9" style="text-align:center; padding: 3rem;">No species found matching your criteria.</td></tr>
                </tbody>
            </table>
        `;
    }

    return `
        <table class="ac-table ac-accordion-table" id="${tableId}">
            <thead>
                <tr>
                    <th class="col-name">Race / Species</th>
                    <th class="col-subrace">Subrace</th>
                    <th class="col-size" style="text-align: center;">Size</th>
                    <th class="col-speed" style="text-align: center;">Speed</th>
                    <th class="col-language">Language</th>
                    <th class="col-asi">ASI</th>
                    <th class="col-traits">Extra</th>
                    <th class="col-sources" style="text-align: center;">Source</th>
                    <th class="col-notes">Notes / Advice</th>
                </tr>
            </thead>
            <tbody>
                ${filteredRaces.map(race => {
                    const subs = race.resolvedSubraces || race.subraces || [];
                    const hasSubraces = subs.length > 1 || (subs[0] && subs[0].subrace && subs[0].subrace.toLowerCase() !== 'none' && subs[0].subrace !== '(none)');
                    const isExpanded = expandedRaceIds.has(race.id);

                    // Speed display
                    let speedDisplay = '—';
                    if (race.speed) {
                        const s = String(race.speed).trim();
                        speedDisplay = (s === '-' || s.includes('fly') || s.endsWith('ft')) ? s : `${s} ft`;
                    } else if (subs[0]?.speed) {
                        const s = String(subs[0].speed).trim();
                        speedDisplay = (s === '-' || s.includes('fly') || s.endsWith('ft')) ? s : `${s} ft`;
                    }

                    // Lineage summary
                    let lineageSummaryHtml = '';
                    if (hasSubraces) {
                        const names = subs.map(s => getSubraceLabel(s)).filter(n => n && n !== '—');
                        lineageSummaryHtml = `
                            <div>
                                <strong>${subs.length} Lineages</strong>
                                <div style="font-size: 0.78rem; opacity: 0.75; margin-top: 2px;">${esc(names.slice(0, 3).join(', '))}${names.length > 3 ? ` +${names.length - 3} more` : ''}</div>
                            </div>
                        `;
                    } else {
                        lineageSummaryHtml = `<span class="badge-single-lineage">Single Lineage</span>`;
                    }

                    const chevronHtml = hasSubraces 
                        ? `<span class="accordion-chevron">${isExpanded ? '▼' : '▶'}</span>`
                        : '';

                    let rowHtml = `
                        <tr class="ac-accordion-parent-row ${isExpanded ? 'expanded' : ''}" data-race-id="${esc(race.id)}">
                            <td class="col-name">
                                <div class="name-cell">
                                    <div style="display: flex; align-items: center;">
                                        ${chevronHtml}
                                        <span><strong>${esc(race.name)}</strong></span>
                                        ${hasSubraces ? `<span class="badge-lineages-count">${subs.length}</span>` : ''}
                                    </div>
                                    <span class="row-hover-icon">${hasSubraces ? (isExpanded ? 'Collapse ▲' : 'Expand ▼') : (isAdmin ? 'Edit →' : 'Details →')}</span>
                                </div>
                            </td>
                            <td class="col-subrace">
                                ${lineageSummaryHtml}
                            </td>
                            <td class="col-size" style="text-align: center;">
                                ${esc(race.size || subs[0]?.size || 'M')}
                            </td>
                            <td class="col-speed" style="text-align: center;">
                                ${esc(speedDisplay)}
                            </td>
                            <td class="col-language">
                                ${esc(race.language || subs[0]?.language || 'Common')}
                            </td>
                            <td class="col-asi">
                                ${formatASI(race.asi ? race : (subs.length === 1 ? subs[0] : race))}
                            </td>
                            <td class="col-traits">${formatTraits(race.extra || (subs.length === 1 ? subs[0]?.extra : null))}</td>
                            <td class="col-sources" style="text-align: center;">${renderSourceBadges(race.sources)}</td>
                            <td class="col-notes">${formatNotesAdvice(race.notes_advice || (subs.length === 1 ? subs[0]?.notes_advice : null))}</td>
                        </tr>
                    `;

                    // Drawer row if species has distinct subraces
                    if (hasSubraces) {
                        rowHtml += `
                            <tr class="ac-species-drawer-row ${isExpanded ? '' : 'ac-drawer-collapsed'}" id="drawer-${esc(race.id)}">
                                <td colspan="9" class="ac-drawer-cell">
                                    <div class="ac-inline-subraces-wrapper">
                                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; padding: 0 0.25rem;">
                                            <div style="font-weight: 600; color: var(--color-primary); font-size: 0.9rem;">
                                                📂 ${esc(race.name)} Lineages (${subs.length})
                                            </div>
                                            <div style="font-size: 0.8rem; opacity: 0.7;">
                                                Click any lineage row to view complete detail modal
                                            </div>
                                        </div>
                                        <table class="ac-inline-subtable">
                                            <thead>
                                                <tr>
                                                    <th>Subrace</th>
                                                    <th style="text-align: center;">Size</th>
                                                    <th style="text-align: center;">Speed</th>
                                                    <th>Language</th>
                                                    <th>Lineage ASI (Total)</th>
                                                    <th>Lineage Traits</th>
                                                    <th style="text-align: center;">Source</th>
                                                    <th>Notes / Advice</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${subs.map((sub, sIdx) => {
                                                    const subLabel = getSubraceLabel(sub);
                                                    let subSpeed = '—';
                                                    if (sub.speed) {
                                                        const s = String(sub.speed).trim();
                                                        subSpeed = (s === '-' || s.includes('fly') || s.endsWith('ft')) ? s : `${s} ft`;
                                                    }
                                                    return `
                                                        <tr data-subrace-id="${esc(sub.id)}" data-race-id="${esc(race.id)}" data-sub-idx="${sIdx}">
                                                            <td><strong>${esc(subLabel)}</strong></td>
                                                            <td style="text-align: center;">${esc(sub.size || 'M')}</td>
                                                            <td style="text-align: center;">${esc(subSpeed)}</td>
                                                            <td>${esc(sub.language || 'Common')}</td>
                                                            <td><strong>${formatASI(sub)}</strong></td>
                                                            <td>${formatTraits(sub.extra)}</td>
                                                            <td style="text-align: center;">${renderSourceBadges(sub.sources)}</td>
                                                            <td>${formatNotesAdvice(sub.notes_advice)}</td>
                                                        </tr>
                                                    `;
                                                }).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                </td>
                            </tr>
                        `;
                    }

                    return rowHtml;
                }).join('')}
            </tbody>
        </table>
    `;
}

/**
 * Attaches event handlers for toolbar controls (source filter, view switcher, accordion toggle).
 */
function setupControls() {
    const sourceSelect = document.getElementById('ac-races-source-filter');
    if (sourceSelect) {
        sourceSelect.onchange = (e) => {
            selectedSourceFilter = e.target.value;
            applyFilters();
            renderView();
        };
    }

    const container = document.getElementById('ac-view-races');
    if (!container) return;

    // Toggle All Accordions button
    const toggleAllBtn = document.getElementById('accordion-toggle-all-btn');
    if (toggleAllBtn) {
        toggleAllBtn.onclick = () => {
            allExpanded = !allExpanded;
            if (allExpanded) {
                filteredRaces.forEach(r => expandedRaceIds.add(r.id));
            } else {
                expandedRaceIds.clear();
            }
            renderView();
        };
    }
}

/**
 * Attaches row click listeners across accordion headers and nested child rows.
 */
function attachRowListeners() {
    const container = document.getElementById('ac-view-races');
    if (!container) return;

    // 2. Accordion parent row clicks -> toggle expand/collapse or open single-lineage modal
    container.querySelectorAll('.ac-accordion-parent-row').forEach(row => {
        row.onclick = (e) => {
            if (e.target.closest('a, button, .ac-source-badge')) return;
            const raceId = row.dataset.raceId;
            const race = allRaces.find(r => r.id === raceId);
            if (!race) return;

            const subs = race.resolvedSubraces || race.subraces || [];
            const hasSubraces = subs.length > 1 || (subs[0] && subs[0].subrace && subs[0].subrace.toLowerCase() !== 'none' && subs[0].subrace !== '(none)');

            if (hasSubraces) {
                if (expandedRaceIds.has(raceId)) {
                    expandedRaceIds.delete(raceId);
                } else {
                    expandedRaceIds.add(raceId);
                }
                renderView();
            } else {
                showRaceDetail(race, 0);
            }
        };
    });

    // 3. Accordion inline child table row clicks -> open lineage detail modal
    container.querySelectorAll('.ac-inline-subtable tbody tr').forEach(row => {
        row.onclick = (e) => {
            e.stopPropagation();
            if (e.target.closest('a, button, .ac-source-badge')) return;
            const raceId = row.dataset.raceId;
            const subraceId = row.dataset.subraceId;
            const race = allRaces.find(r => r.id === raceId);
            if (!race) return;
            const subIdx = (race.resolvedSubraces || race.subraces || []).findIndex(s => s.id === subraceId);
            showRaceDetail(race, Math.max(0, subIdx));
        };
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
    const subraces = race.resolvedSubraces || race.subraces || [];
    const currentSub = subraces[activeSubraceIndex] || subraces[0] || {};
    const subraceName = currentSub.subrace && currentSub.subrace !== 'None' 
        ? currentSub.subrace 
        : (subraces.length > 1 ? getSubraceLabel(currentSub) : '');

    const html = `
        <div class="detail-header">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem;">
                <div class="detail-category">${renderSourceBadges(currentSub.sources?.length ? currentSub.sources : race.sources)}</div>
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
                <div class="ac-modal-nav-title">Select Subrace (${subraces.length} available):</div>
                <div class="ac-modal-subrace-tabs">
                    ${subraces.map((s, idx) => {
                        const label = getSubraceLabel(s);
                        const isActive = idx === activeSubraceIndex;
                        const hasDistinctSources = s.sources?.length && label !== s.sources.join(', ');
                        return `
                            <button class="ac-modal-tab-btn ${isActive ? 'active' : ''}" data-idx="${idx}">
                                <span>${esc(label)}</span>
                                ${hasDistinctSources ? `<span style="opacity: 0.7; font-size: 0.75em;">(${esc(s.sources.join(', '))})</span>` : ''}
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
                <p style="line-height: 1.6;">${formatTraits(currentSub.extra)}</p>
            </div>
        ` : ''}

        ${currentSub.notes_advice ? `
            <div class="detail-section">
                <h4>Notes / Rage Advice</h4>
                <div class="advice-content" style="line-height: 1.6; background: rgba(var(--palette-brand-highlight), 0.06); padding: 1rem; border-radius: 6px; border-left: 4px solid var(--palette-brand-highlight);">${formatNotesAdvice(currentSub.notes_advice)}</div>
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
            openRaceForm(null, race, 'subrace');
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
 * Checks whether an ability score value is a valid numeric modifier.
 * Filters out null, undefined, 'null', 'undefined', 'none', '-', '0', and 0.
 * 
 * @param {*} val - Value to check
 * @returns {boolean} True if value is a valid modifier
 */
export function isValidMod(val) {
    if (val === null || val === undefined) return false;
    const s = String(val).trim().toLowerCase();
    if (!s || s === 'null' || s === 'undefined' || s === 'none' || s === '-' || s === '0') return false;
    return true;
}

/**
 * Formats Ability Score Increases into a readable string.
 * Handles both subrace records and JSON variant objects.
 * Filters out null and zero values to prevent 'CON null' artifacts.
 * 
 * @param {Object} r - Record containing ability score values
 * @returns {string} Formatted string (e.g. "DEX +2, WIS +1")
 */
export function formatASI(r) {
    if (!r) return '—';

    // Support nested asi object if present in JSON variants or database
    if (r.asi && typeof r.asi === 'object') {
        if (r.asi.custom) return esc(r.asi.custom);
        if (r.asi.choice) return esc(r.asi.choice);
        const parts = [];
        for (const [k, v] of Object.entries(r.asi)) {
            if (isValidMod(v)) {
                const num = Number(v);
                const sign = !isNaN(num) && num > 0 ? '+' : '';
                parts.push(`${k.toUpperCase()} ${sign}${v}`);
            }
        }
        if (parts.length > 0) return parts.join(', ');
    }

    const mods = [];
    const stats = [
        { label: 'STR', val: r.str },
        { label: 'DEX', val: r.dex },
        { label: 'CON', val: r.con },
        { label: 'INT', val: r.int_stat ?? r.int },
        { label: 'WIS', val: r.wis },
        { label: 'CHA', val: r.cha }
    ];

    for (const stat of stats) {
        if (isValidMod(stat.val)) {
            const num = Number(stat.val);
            const sign = !isNaN(num) && num > 0 ? '+' : '';
            mods.push(`${stat.label} ${sign}${stat.val}`);
        }
    }

    if (mods.length === 0) {
        if (r.str === '-' || r.dex === '-') return 'Special / Custom';
        if (r.extra && /(\+2\/\+1|\+1\/\+1\/\+1|\bASI\b.*choice|your choice)/i.test(r.extra)) {
            return '+2/+1 or +1/+1/+1 (Choice)';
        }
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
export async function openRaceForm(subraceItem = null, defaultParentRace = null, defaultMode = null) {
    if (allRaces.length === 0) {
        allRaces = sortByDisplayOrder((await getRaces()) || []);
    }
    const sm = await getSourcesMap();
    if (availableSourceKeys.length === 0) {
        availableSourceKeys = Array.from(sm.keys()).sort();
    }

    let allLookupSources = [];
    if (sm && sm.size > 0) {
        const seen = new Set();
        for (const [k, src] of sm.entries()) {
            const key = src?.source_key || src?.abbreviation || k;
            if (!seen.has(key)) {
                seen.add(key);
                allLookupSources.push({
                    key,
                    name: src?.name || key,
                    ruleset: src?.ruleset || ''
                });
            }
        }
        allLookupSources.sort((a, b) => a.key.localeCompare(b.key));
    }
    if (allLookupSources.length === 0) {
        allLookupSources = availableSourceKeys.map(k => ({ key: k, name: k, ruleset: '' }));
    }

    const isNew = !subraceItem;
    let selectedParentRace = defaultParentRace || (isNew ? null : (allRaces.find(r => r.race_id === subraceItem.race_id) || allRaces.find(r => r.name === subraceItem.raceName) || null));
    const initialMode = defaultMode || (selectedParentRace ? 'subrace' : 'race');
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

    let headerCategory = 'New Race / Lineage';
    let headerTitle = 'Add Race or Lineage';

    if (!isNew) {
        headerCategory = 'Edit Lineage';
        headerTitle = `Edit Lineage: ${esc(selectedParentRace?.name || '')} (${esc(subraceItem.subrace || 'None')})`;
    } else if (initialMode === 'race') {
        headerCategory = 'New Base Race';
        headerTitle = 'Add New Base Race';
    } else {
        headerCategory = 'New Subrace / Lineage';
        headerTitle = selectedParentRace ? `Add New Subrace: ${esc(selectedParentRace.name)}` : 'Add New Subrace';
    }

    const formHtml = `
        <div class="detail-header">
            <div>
                <span class="detail-category" id="race-modal-category">${headerCategory}</span>
                <h2 class="detail-title" id="race-modal-title">${headerTitle}</h2>
            </div>
        </div>

        <form id="ac-race-form" class="ac-edit-form">
            <div id="race-form-error" class="ac-form-error" style="display: none; background: rgba(211, 47, 47, 0.1); border-left: 4px solid #d32f2f; color: #d32f2f; padding: 0.75rem; border-radius: 4px; font-weight: 500;"></div>

            ${isNew ? `
                <!-- Mode Selector Toggle -->
                <div class="ac-form-group ac-mode-toggle" style="background: var(--bg-surface-elevated, rgba(0,0,0,0.03)); padding: 0.75rem 1rem; border-radius: 6px; border: 1px solid var(--border-color, rgba(0,0,0,0.1)); margin-bottom: 1rem;">
                    <label style="font-weight: 600; margin-bottom: 0.4rem; display: block;">What would you like to add?</label>
                    <div style="display: flex; gap: 1.5rem; align-items: center; flex-wrap: wrap;">
                        <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; font-weight: 500;">
                            <input type="radio" name="race-form-type" id="type-radio-race" value="race" ${initialMode === 'race' ? 'checked' : ''}>
                            <span>New Base Race / Species <small style="opacity: 0.75;">(e.g. Human, Elf, Owlin)</small></span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; font-weight: 500;">
                            <input type="radio" name="race-form-type" id="type-radio-subrace" value="subrace" ${initialMode === 'subrace' ? 'checked' : ''}>
                            <span>New Subrace / Lineage <small style="opacity: 0.75;">(under an existing species)</small></span>
                        </label>
                    </div>
                </div>
            ` : ''}

            <div class="ac-form-grid">
                <!-- Step 1: Parent Race / Species -->
                <div class="ac-form-group" id="race-parent-group" style="${initialMode === 'race' && isNew ? 'display: none;' : ''}">
                    <label for="race-input-parent">Species / Base Race *</label>
                    <select id="race-input-parent" class="ac-form-select" ${!isNew ? 'disabled' : ''}>
                        <option value="NEW" ${(!selectedParentRace || initialMode === 'race') ? 'selected' : ''}>+ Create New Species...</option>
                        ${allRaces.map(r => `
                            <option value="${esc(r.race_id)}" ${(selectedParentRace && selectedParentRace.race_id === r.race_id) ? 'selected' : ''}>
                                ${esc(r.name)}
                            </option>
                        `).join('')}
                    </select>
                </div>

                <!-- New Species Name (Conditional) -->
                <div class="ac-form-group" id="race-new-species-group" style="${initialMode === 'race' || (!selectedParentRace && isNew) ? '' : 'display: none;'}">
                    <label for="race-input-new-name">New Species Name *</label>
                    <input type="text" id="race-input-new-name" class="ac-form-input" placeholder="e.g. Owlin, Thri-kreen" ${(initialMode === 'race' || !selectedParentRace) && isNew ? 'required' : ''}>
                    <small class="ac-form-help">Base species order will default to bottom (${getNextDisplayOrder(allRaces)})</small>
                </div>

                <!-- Step 2: Subrace -->
                <div class="ac-form-group" id="race-subrace-group">
                    <label for="race-input-subrace" id="race-subrace-label">${initialMode === 'race' && isNew ? 'Subrace Name (Optional)' : 'Subrace Name'}</label>
                    <input type="text" id="race-input-subrace" class="ac-form-input" value="${esc(isNew ? '' : (subraceItem.subrace === 'None' ? '' : subraceItem.subrace))}" placeholder="${initialMode === 'race' && isNew ? 'e.g. Standard, or leave blank if none' : 'e.g. High, Wood, or leave blank for \'None\''}">
                    <small class="ac-form-help" id="race-subrace-help">Leave blank or 'None' if this species has no subraces</small>
                </div>

                <input type="hidden" id="race-input-check-id" value="${esc(nextCheckId)}">

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
                            ${allLookupSources.map(src => {
                                const label = src.name && src.name !== src.key 
                                    ? `${src.key} - ${src.name}${src.ruleset ? ` [${src.ruleset}]` : ''}` 
                                    : src.key;
                                return `<option value="${esc(src.key)}">${esc(label)}</option>`;
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
                <label for="race-input-notes">Notes / Rage Advice</label>
                <textarea id="race-input-notes" rows="3" class="ac-form-textarea" placeholder="Notes, character creation guidance, Markdown links allowed...">${esc(subraceItem?.notes_advice || '')}</textarea>
            </div>

            <div class="detail-actions" style="margin-top: 1.5rem; justify-content: flex-end;">
                <button type="button" class="ac-btn-admin ac-btn-secondary" id="race-form-cancel">Cancel</button>
                <button type="submit" class="ac-btn-admin ac-btn-primary" id="race-form-submit">${!isNew ? 'Save Changes' : (initialMode === 'race' ? 'Create Base Race' : 'Create Subrace')}</button>
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

    // Dynamic parent race selection changes & mode switching
    const parentSelect = document.getElementById('race-input-parent');
    const newSpeciesGroup = document.getElementById('race-new-species-group');
    const newNameInput = document.getElementById('race-input-new-name');
    const orderInput = document.getElementById('race-input-order');
    const parentGroup = document.getElementById('race-parent-group');
    const subraceLabel = document.getElementById('race-subrace-label');
    const subraceInput = document.getElementById('race-input-subrace');
    const radioRace = document.getElementById('type-radio-race');
    const radioSubrace = document.getElementById('type-radio-subrace');

    function setRaceFormMode(mode) {
        const isRaceMode = mode === 'race';
        const headerCat = document.getElementById('race-modal-category');
        const headerTit = document.getElementById('race-modal-title');
        const submitBtn = document.getElementById('race-form-submit');

        if (isRaceMode) {
            if (headerCat) headerCat.textContent = 'New Base Race';
            if (headerTit) headerTit.textContent = 'Add New Base Race';
            if (submitBtn) submitBtn.textContent = 'Create Base Race';
            if (parentGroup) parentGroup.style.display = 'none';
            if (newSpeciesGroup) newSpeciesGroup.style.display = '';
            if (parentSelect) parentSelect.value = 'NEW';
            if (newNameInput) newNameInput.required = true;
            if (subraceLabel) subraceLabel.textContent = 'Subrace Name (Optional)';
            if (subraceInput) subraceInput.placeholder = "e.g. Standard, or leave blank if none";
            if (orderInput && isNew) orderInput.value = 1;
        } else {
            if (headerCat) headerCat.textContent = 'New Subrace / Lineage';
            if (parentGroup) parentGroup.style.display = '';
            if (newSpeciesGroup) newSpeciesGroup.style.display = 'none';
            if (parentSelect && parentSelect.value === 'NEW') {
                if (selectedParentRace) {
                    parentSelect.value = selectedParentRace.race_id;
                } else if (allRaces.length > 0) {
                    parentSelect.value = allRaces[0].race_id;
                }
            }
            const curParent = allRaces.find(r => r.race_id === parentSelect?.value);
            if (headerTit) {
                headerTit.textContent = curParent ? `Add New Subrace: ${curParent.name}` : 'Add New Subrace';
            }
            if (submitBtn) submitBtn.textContent = 'Create Subrace';
            if (newNameInput) newNameInput.required = false;
            if (subraceLabel) subraceLabel.textContent = 'Subrace Name';
            if (subraceInput) subraceInput.placeholder = "e.g. High, Wood, or leave blank for 'None'";
            if (orderInput && isNew) {
                orderInput.value = curParent ? getNextDisplayOrder(curParent.subraces || [], 1) : 1;
            }
        }
    }

    if (radioRace) {
        radioRace.addEventListener('change', () => {
            if (radioRace.checked) setRaceFormMode('race');
        });
    }
    if (radioSubrace) {
        radioSubrace.addEventListener('change', () => {
            if (radioSubrace.checked) setRaceFormMode('subrace');
        });
    }

    if (parentSelect) {
        parentSelect.addEventListener('change', () => {
            const isNewSpecies = parentSelect.value === 'NEW';
            if (isNewSpecies) {
                if (radioRace) radioRace.checked = true;
                setRaceFormMode('race');
            } else {
                if (radioSubrace) radioSubrace.checked = true;
                const chosen = allRaces.find(r => r.race_id === parentSelect.value);
                const headerTit = document.getElementById('race-modal-title');
                if (headerTit && isNew) {
                    headerTit.textContent = chosen ? `Add New Subrace: ${chosen.name}` : 'Add New Subrace';
                }
                if (orderInput && isNew) {
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

            const isNewSpecies = (radioRace?.checked) || (parentSelect?.value === 'NEW');
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
    const subLabel = getSubraceLabel(currentSub);

    let msg = `Are you sure you want to delete the lineage "${subLabel}"?`;
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

/**
 * Resolves a human-friendly subrace/lineage label.
 * If the subrace is defined and not 'None' / '(none)' / 'Standard', returns the subrace name.
 * Otherwise, falls back to source abbreviation(s) (e.g. 'EEPC', 'MPMM').
 * 
 * @param {Object} item - Subrace record or lineage object
 * @returns {string} Subrace name or source abbreviation label
 */
export function getSubraceLabel(item) {
    if (!item) return 'Standard';
    const sub = (item.subrace || '').trim();
    if (sub && sub.toLowerCase() !== 'none' && sub !== '(none)' && sub.toLowerCase() !== 'standard') {
        return sub;
    }
    // Determine sources from item, or parentRace if missing
    const sources = (item.sources && item.sources.length > 0)
        ? item.sources
        : (item.parentRace?.sources || []);

    if (sources && sources.length > 0) {
        return sources.map(k => {
            const src = getSourceByKey(k);
            return src?.abbreviation || src?.source_key || k;
        }).join(', ');
    }
    return sub || 'Standard';
}

