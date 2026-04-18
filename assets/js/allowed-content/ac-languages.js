/**
 * ================================================================
 * AC LANGUAGES MODULE
 * ================================================================
 * 
 * Data handling and presentation for languages.
 * 
 * Responsibilities:
 * - Rendering language tables categorized by type (Standard, Exotic, Rare).
 * - Implementing 2-tier scrolling navigation for language types.
 * - Handling search and filtering for language origins and speakers.
 * 
 * @module ACLanguages
 */

import { getLanguages } from './ac-service.js';
import { openModal, esc, formatSnippet } from './ac-ui-utils.js';

let allLanguages = [];
let filteredLanguages = [];

/**
 * Initializes the Languages view.
 */
export async function initLanguages() {
    const container = document.getElementById('ac-view-languages');
    if (!container) return;

    // Show loading state if empty
    if (allLanguages.length === 0) {
        container.innerHTML = `
            <div class="ac-loading">
                <div class="spinner"></div>
                <span>Deciphering Languages...</span>
            </div>
        `;
    }

    allLanguages = await getLanguages();
    filteredLanguages = [...allLanguages];

    renderLanguages();
}

/**
 * Renders the Languages view, grouping them by their Language Type.
 */
function renderLanguages() {
    const container = document.getElementById('ac-view-languages');
    if (!container) return;

    // Clear and build structure
    container.innerHTML = `
        <div class="ac-table-header">
            <div class="ac-filters" id="languages-filters">
                <!-- Reserved for future specific filters -->
            </div>
            <div class="ac-stats" id="languages-stats">
                ${filteredLanguages.length} Languages found
            </div>
        </div>
        <div id="languages-content" class="ac-sections-container"></div>
    `;

    const content = document.getElementById('languages-content');

    if (filteredLanguages.length === 0) {
        content.innerHTML = '<div class="ac-no-results">No languages found matching your search.</div>';
        return;
    }

    // Group languages by their type (Standard, Exotic, Rare, etc.)
    const groups = {};
    filteredLanguages.forEach(lang => {
        const type = lang.language_type ? lang.language_type.name : 'Other';
        if (!groups[type]) {
            groups[type] = {
                name: type,
                description: lang.language_type ? lang.language_type.description : '',
                order: lang.language_type ? lang.language_type.display_order : 999,
                items: []
            };
        }
        groups[type].items.push(lang);
    });

    // Sort groups based on their display_order
    const sortedGroupNames = Object.keys(groups).sort((a, b) => groups[a].order - groups[b].order);

    // Render Shortcut Chips
    const filtersContainer = document.getElementById('languages-filters');
    if (filtersContainer) {
        filtersContainer.innerHTML = `
            <div class="ac-shortcuts">
                ${sortedGroupNames.map(name => `
                    <button class="ac-shortcut-chip" data-target="lang-section-${name.toLowerCase().replace(/\s+/g, '-')}">
                        ${esc(name)}
                    </button>
                `).join('')}
            </div>
        `;

        filtersContainer.querySelectorAll('.ac-shortcut-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const targetId = chip.dataset.target;
                const element = document.getElementById(targetId);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }

    content.innerHTML = sortedGroupNames.map(groupName => {
        const group = groups[groupName];
        const sectionId = `lang-section-${groupName.toLowerCase().replace(/\s+/g, '-')}`;
        return `
            <div class="ac-section-group">
                <div class="ac-section-title" id="${sectionId}">
                    <h2>${esc(group.name)}</h2>
                    ${group.description ? `<p class="section-desc">${esc(group.description)}</p>` : ''}
                </div>
                <div class="ac-table-wrapper">
                    <table class="ac-table">
                        <thead>
                            <tr>
                                <th class="col-name">Language</th>
                                <th class="col-script">Script</th>
                                <th class="col-origin hide-mobile">Origin</th>
                                <th class="col-speakers hide-tablet">Typical Speakers</th>
                                <th class="col-notes">Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${group.items.map(l => `
                                <tr data-id="${l.id}">
                                    <td class="col-name">
                                        <div class="name-cell">
                                            <span>${esc(l.name)}</span>
                                            <span class="row-hover-icon">Details →</span>
                                        </div>
                                    </td>
                                    <td class="col-script">${esc(l.script || '—')}</td>
                                    <td class="col-origin hide-mobile">${esc(l.origin || '—')}</td>
                                    <td class="col-speakers hide-tablet">${formatSnippet(l.typical_speakers)}</td>
                                    <td class="col-notes">${formatSnippet(l.notes)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }).join('');

    // Attach row click listeners
    content.querySelectorAll('tr[data-id]').forEach(row => {
        row.addEventListener('click', () => {
            const id = row.dataset.id;
            const lang = allLanguages.find(l => l.id === id);
            if (lang) showLanguageDetail(lang);
        });
    });
}

/**
 * Filters the language dataset based on a search term.
 * 
 * @param {string} term - The search string
 */
export function filterLanguages(term) {
    if (!term) {
        filteredLanguages = [...allLanguages];
    } else {
        const lower = term.toLowerCase();
        filteredLanguages = allLanguages.filter(l => 
            l.name.toLowerCase().includes(lower) ||
            l.script?.toLowerCase().includes(lower) ||
            l.typical_speakers?.toLowerCase().includes(lower) ||
            l.notes?.toLowerCase().includes(lower) ||
            l.language_type?.name.toLowerCase().includes(lower)
        );
    }
    renderLanguages();
}

/**
 * Shows the full detail for a specific Language in a modal.
 * 
 * @param {Object} lang - The language record
 */
function showLanguageDetail(lang) {
    const html = `
        <div class="detail-header">
            <span class="detail-category">${esc(lang.language_type?.name || 'Language')}</span>
            <h2 class="detail-title">${esc(lang.name)}</h2>
        </div>

        <div class="detail-grid">
            <div class="detail-item">
                <label>Script</label>
                <value>${esc(lang.script || '—')}</value>
            </div>
            <div class="detail-item">
                <label>Origin</label>
                <value>${esc(lang.origin || '—')}</value>
            </div>
        </div>

        ${lang.typical_speakers ? `
        <div class="detail-section">
            <h4>Typical Speakers</h4>
            <div class="advice-content" style="white-space: pre-wrap;">${esc(lang.typical_speakers)}</div>
        </div>
        ` : ''}

        ${lang.notes ? `
        <div class="detail-section">
            <h4>Notes</h4>
            <div class="advice-content" style="white-space: pre-wrap;">${esc(lang.notes)}</div>
        </div>
        ` : ''}
    `;

    openModal(html);
}
