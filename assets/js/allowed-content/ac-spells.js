/**
 * ================================================================
 * AC SPELLS MODULE
 * ================================================================
 * 
 * Logic for the Spells content set. Handles:
 * - Table rendering and formatting
 * - Spell-specific filtering and search
 * - Record detail generation
 */

import { getSpells } from './ac-service.js';
import { openModal, esc, formatSnippet } from './ac-ui-utils.js';

let allSpells = [];
let filteredSpells = [];

/**
 * Initializes the Spells view.
 */
export async function initSpells() {
    const tbody = document.getElementById('spells-tbody');
    if (!tbody) return;

    // Fetch data
    allSpells = await getSpells();
    filteredSpells = [...allSpells];

    renderSpellsTable();
}

/**
 * Renders the Spells table.
 */
function renderSpellsTable() {
    const tbody = document.getElementById('spells-tbody');
    if (!tbody) return;

    if (filteredSpells.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 2rem;">No spells found matching your search.</td></tr>';
        return;
    }

    tbody.innerHTML = filteredSpells.map(s => `
        <tr data-id="${s.id}">
            <td class="col-name">
                <div class="name-cell">
                    <span>${esc(s.name)}</span>
                    <span class="row-hover-icon">Details →</span>
                </div>
            </td>
            <td class="col-source hide-mobile">${esc(s.source)}</td>
            <td class="col-notes hide-tablet">${formatSnippet(s.notes)}</td>
            <td class="col-advice hide-tablet">${formatSnippet(s.rage_advice)}</td>
        </tr>
    `).join('');

    // Attach row click listeners
    tbody.querySelectorAll('tr').forEach(row => {
        row.addEventListener('click', () => {
            const spellId = row.dataset.id;
            const spell = allSpells.find(s => s.id === spellId);
            if (spell) showSpellDetail(spell);
        });
    });
}

/**
 * Shows the full detail for a specific Spell in a modal.
 * 
 * @param {Object} spell - The spell record
 */
function showSpellDetail(spell) {
    const html = `
        <div class="detail-header">
            <span class="detail-category">${esc(spell.source)}</span>
            <h2 class="detail-title">${esc(spell.name)}</h2>
        </div>

        <div class="detail-grid">
            <div class="detail-item">
                <label>Source</label>
                <value>${esc(spell.source)}</value>
            </div>
        </div>

        ${spell.notes ? `
        <div class="detail-section">
            <h4>Notes / Description</h4>
            <p style="white-space: pre-wrap;">${esc(spell.notes)}</p>
        </div>
        ` : ''}

        ${spell.rage_advice ? `
        <div class="detail-section">
            <h4>Rage Advice</h4>
            <div class="advice-content" style="white-space: pre-wrap;">${esc(spell.rage_advice)}</div>
        </div>
        ` : ''}
    `;

    openModal(html);
}

/**
 * Filters the dataset based on a search term.
 * 
 * @param {string} searchTerm - The string to search for
 */
export function filterSpells(searchTerm) {
    if (!searchTerm) {
        filteredSpells = [...allSpells];
    } else {
        const lower = searchTerm.toLowerCase();
        filteredSpells = allSpells.filter(s => 
            s.name.toLowerCase().includes(lower) ||
            s.source.toLowerCase().includes(lower) ||
            s.notes?.toLowerCase().includes(lower) ||
            s.rage_advice?.toLowerCase().includes(lower)
        );
    }
    renderSpellsTable();
}
