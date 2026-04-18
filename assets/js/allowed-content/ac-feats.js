/**
 * ================================================================
 * AC FEATS MODULE
 * ================================================================
 * 
 * Logic for the Feats content set. Handles:
 * - Table rendering and formatting
 * - Feat-specific filtering and search
 * - Record detail generation
 */

import { getFeats } from './ac-service.js';
import { openModal, esc, formatSnippet } from './ac-ui-utils.js';

let allFeats = [];
let filteredFeats = [];

/**
 * Initializes the Feats view.
 */
export async function initFeats() {
    const tbody = document.getElementById('feats-tbody');
    if (!tbody) return;

    // Fetch data (already sorted by display_order then name via service)
    allFeats = await getFeats();
    filteredFeats = [...allFeats];

    renderFeatTable();
}

/**
 * Renders the Feats table.
 */
function renderFeatTable() {
    const tbody = document.getElementById('feats-tbody');
    if (!tbody) return;

    if (filteredFeats.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem;">No feats found matching your search.</td></tr>';
        return;
    }

    tbody.innerHTML = filteredFeats.map(feat => `
        <tr data-id="${feat.id}">
            <td class="col-name">
                <div class="name-cell">
                    <span>${esc(feat.name)}</span>
                    <span class="row-hover-icon">Details →</span>
                </div>
            </td>
            <td class="col-category hide-mobile">${esc(feat.category || 'General')}</td>
            <td class="col-prereq hide-tablet">${esc(feat.prerequisite || 'None')}</td>
            <td class="col-asi">${esc(feat.ability_increase || '—')}</td>
            <td class="col-notes hide-tablet">${formatSnippet(feat.notes_advice)}</td>
            <td class="col-source hide-mobile">${esc(feat.source)}</td>
        </tr>
    `).join('');

    // Attach row click listeners
    tbody.querySelectorAll('tr').forEach(row => {
        row.addEventListener('click', () => {
            const featId = row.dataset.id;
            const feat = allFeats.find(f => f.id === featId);
            if (feat) showFeatDetail(feat);
        });
    });
}

/**
 * Shows the full detail for a specific Feat in a modal.
 * 
 * @param {Object} feat - The feat record
 */
function showFeatDetail(feat) {
    const html = `
        <div class="detail-header">
            <span class="detail-category">${esc(feat.source)} | ${esc(feat.category || 'General')}</span>
            <h2 class="detail-title">${esc(feat.name)}</h2>
        </div>

        <div class="detail-grid">
            <div class="detail-item">
                <label>Prerequisite</label>
                <value>${esc(feat.prerequisite || 'None')}</value>
            </div>
            <div class="detail-item">
                <label>Ability Increase</label>
                <value>${esc(feat.ability_increase || 'None')}</value>
            </div>
        </div>

        ${feat.notes_advice ? `
        <div class="detail-section">
            <h4>Notes / Rage Advice</h4>
            <div class="advice-box">
                <p style="white-space: pre-wrap;">${esc(feat.notes_advice)}</p>
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
export function filterFeats(searchTerm) {
    if (!searchTerm) {
        filteredFeats = [...allFeats];
    } else {
        const lower = searchTerm.toLowerCase();
        filteredFeats = allFeats.filter(feat => 
            feat.name.toLowerCase().includes(lower) ||
            feat.source.toLowerCase().includes(lower) ||
            feat.category?.toLowerCase().includes(lower) ||
            feat.prerequisite?.toLowerCase().includes(lower) ||
            feat.ability_increase?.toLowerCase().includes(lower) ||
            feat.notes_advice?.toLowerCase().includes(lower)
        );
    }
    renderFeatTable();
}
