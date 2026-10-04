/**
 * ================================================================
 * AC BACKGROUNDS MODULE
 * ================================================================
 * 
 * Data handling and presentation for player backgrounds.
 * 
 * Responsibilities:
 * - Rendering background options, skill proficiencies, and equipment.
 * - Handling search and filtering for background features.
 * - Displaying detailed background metadata in modals.
 * 
 * @module ACBackgrounds
 */

import { getBackgrounds } from './ac-service.js';
import { openModal, esc, formatSnippet } from './ac-ui-utils.js';

let allBackgrounds = [];
let filteredBackgrounds = [];

/**
 * Initializes the Backgrounds view.
 */
export async function initBackgrounds() {
    const tbody = document.getElementById('backgrounds-tbody');
    if (!tbody) return;

    // Fetch data (already sorted by display_order then name via service)
    allBackgrounds = await getBackgrounds();
    filteredBackgrounds = [...allBackgrounds];

    renderBackgroundTable();
}

/**
 * Renders the Backgrounds table.
 */
function renderBackgroundTable() {
    const tbody = document.getElementById('backgrounds-tbody');
    if (!tbody) return;

    if (filteredBackgrounds.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 2rem;">No backgrounds found matching your search.</td></tr>';
        return;
    }

    tbody.innerHTML = filteredBackgrounds.map(bg => `
        <tr data-id="${bg.id}">
            <td class="col-name">
                <div class="name-cell">
                    <span>${esc(bg.name)}</span>
                    <span class="row-hover-icon">Details →</span>
                </div>
            </td>
            <td class="col-source hide-mobile">${esc(bg.source)}</td>
            <td class="col-feature hide-mobile">${formatSnippet(bg.feature)}</td>
            <td class="col-notes hide-tablet">${formatSnippet(bg.notes_advice)}</td>
        </tr>
    `).join('');

    // Attach row click listeners
    tbody.querySelectorAll('tr').forEach(row => {
        row.addEventListener('click', () => {
            const bgId = row.dataset.id;
            const bg = allBackgrounds.find(b => b.id === bgId);
            if (bg) showBackgroundDetail(bg);
        });
    });
}

/**
 * Shows the full detail for a specific Background in a modal.
 * 
 * @param {Object} bg - The background record
 */
function showBackgroundDetail(bg) {
    const html = `
        <div class="detail-header">
            <span class="detail-category">${esc(bg.source)}</span>
            <h2 class="detail-title">${esc(bg.name)}</h2>
        </div>

        <div class="detail-section">
            <h4>Background Feature</h4>
            <p style="white-space: pre-wrap;">${esc(bg.feature || 'None')}</p>
        </div>

        ${bg.notes_advice ? `
        <div class="detail-section">
            <h4>Notes / Rage Advice</h4>
            <div class="advice-box">
                <p style="white-space: pre-wrap;">${esc(bg.notes_advice)}</p>
            </div>
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
export function filterBackgrounds(searchTerm) {
    if (!searchTerm) {
        filteredBackgrounds = [...allBackgrounds];
    } else {
        const lower = searchTerm.toLowerCase();
        filteredBackgrounds = allBackgrounds.filter(bg => 
            bg.name.toLowerCase().includes(lower) ||
            bg.source.toLowerCase().includes(lower) ||
            bg.feature?.toLowerCase().includes(lower) ||
            bg.notes_advice?.toLowerCase().includes(lower)
        );
    }
    renderBackgroundTable();
}
