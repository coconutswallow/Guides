/**
 * ================================================================
 * AC RACES MODULE
 * ================================================================
 * 
 * Logic for the Races content set. Handles:
 * - Table rendering and formatting
 * - Race-specific filtering and search
 * - Record detail generation
 */

import { getRaces } from './ac-service.js';
import { openModal, esc, formatSnippet } from './ac-ui-utils.js';

let allRaces = [];
let filteredRaces = [];

/**
 * Initializes the Races view.
 */
export async function initRaces() {
    const tbody = document.getElementById('races-tbody');
    if (!tbody) return;

    // Fetch data (already sorted by display_order then name via service)
    allRaces = await getRaces();
    filteredRaces = [...allRaces];

    renderRaceTable();
    setupEventHandlers();
}

/**
 * Renders the Races table.
 */
function renderRaceTable() {
    const tbody = document.getElementById('races-tbody');
    if (!tbody) return;

    if (filteredRaces.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 2rem;">No races found matching your search.</td></tr>';
        return;
    }

    tbody.innerHTML = filteredRaces.map(r => `
        <tr data-id="${r.id}">
            <td class="col-name">
                <div class="name-cell">
                    <span>${esc(r.name)}</span>
                    <span class="row-hover-icon">Details →</span>
                </div>
            </td>
            <td class="col-subrace">${esc(r.subrace || '—')}</td>
            <td class="col-size hide-mobile">${esc(r.size)}</td>
            <td class="col-speed hide-tablet">${esc(r.speed)}</td>
            <td class="col-asi">${formatASI(r)}</td>
            <td class="col-language hide-tablet">${esc(r.language || '—')}</td>
            <td class="col-traits hide-mobile">${formatSnippet(r.extra)}</td>
            <td class="col-notes hide-tablet">${formatSnippet(r.rage_advice)}</td>
            <td class="col-source hide-mobile">${esc(r.source)}</td>
        </tr>
    `).join('');

    // Attach row click listeners

    tbody.querySelectorAll('tr').forEach(row => {
        row.addEventListener('click', () => {
            const raceId = row.dataset.id;
            const race = allRaces.find(r => r.id === raceId);
            if (race) showRaceDetail(race);
        });
    });
}

/**
 * Formats Ability Score Increases into a readable string.
 */
function formatASI(r) {
    const mods = [];
    if (r.str) mods.push(`STR ${r.str > 0 ? '+' : ''}${r.str}`);
    if (r.dex) mods.push(`DEX ${r.dex > 0 ? '+' : ''}${r.dex}`);
    if (r.con) mods.push(`CON ${r.con > 0 ? '+' : ''}${r.con}`);
    if (r.int) mods.push(`INT ${r.int > 0 ? '+' : ''}${r.int}`);
    if (r.wis) mods.push(`WIS ${r.wis > 0 ? '+' : ''}${r.wis}`);
    if (r.cha) mods.push(`CHA ${r.cha > 0 ? '+' : ''}${r.cha}`);
    
    return mods.length > 0 ? mods.join(', ') : '—';
}

/**
 * Shows the full detail for a specific Race in a modal.
 */
function showRaceDetail(race) {
    const html = `
        <div class="detail-header">
            <span class="detail-category">${esc(race.source)}</span>
            <h2 class="detail-title">${esc(race.name)} ${race.subrace && race.subrace !== '(none)' ? `<small style="opacity:0.6; font-size: 0.6em;">(${esc(race.subrace)})</small>` : ''}</h2>
        </div>

        <div class="detail-grid">
            <div class="detail-item">
                <label>Size</label>
                <value>${esc(race.size)}</value>
            </div>
            <div class="detail-item">
                <label>Speed</label>
                <value>${esc(race.speed)}</value>
            </div>
            <div class="detail-item">
                <label>ASI</label>
                <value>${formatASI(race)}</value>
            </div>
            <div class="detail-item">
                <label>Languages</label>
                <value>${esc(race.language || 'None')}</value>
            </div>
        </div>

        ${race.extra ? `
        <div class="detail-section">
            <h4>Racial Traits</h4>
            <p style="white-space: pre-wrap;">${esc(race.extra)}</p>
        </div>
        ` : ''}

        ${race.rage_advice ? `
        <div class="detail-section">
            <h4>Notes / Rage Advice</h4>
            <p style="white-space: pre-wrap;">${esc(race.rage_advice)}</p>
        </div>
        ` : ''}
    `;

    openModal(html);
}

/**
 * Filters the dataset based on a search term.
 */
export function filterRaces(searchTerm) {
    if (!searchTerm) {
        filteredRaces = [...allRaces];
    } else {
        const lower = searchTerm.toLowerCase();
        filteredRaces = allRaces.filter(r => 
            r.name.toLowerCase().includes(lower) ||
            r.subrace?.toLowerCase().includes(lower) ||
            r.source?.toLowerCase().includes(lower) ||
            r.extra?.toLowerCase().includes(lower)
        );
    }
    renderRaceTable();
}

/**
 * Sets up global handlers for the Races view.
 * (Search logic is now handled by ac-main for consistency)
 */
function setupEventHandlers() {
    // Handled in ac-main.js
}
