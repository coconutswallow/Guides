/**
 * ================================================================
 * AC CLASSES MODULE
 * ================================================================
 * 
 * Logic for the Classes content set. Handles:
 * - Table rendering and formatting
 * - Class-specific filtering and search
 * - Record detail generation
 */

import { getClasses } from './ac-service.js';
import { openModal, esc, formatSnippet } from './ac-ui-utils.js';

let allClasses = [];
let filteredClasses = [];

/**
 * Initializes the Classes view.
 */
export async function initClasses() {
    const tbody = document.getElementById('classes-tbody');
    if (!tbody) return;

    // Fetch data
    allClasses = await getClasses();
    filteredClasses = [...allClasses];

    renderClassTable();
    setupEventHandlers();
}

/**
 * Renders the Classes table.
 */
function renderClassTable() {
    const tbody = document.getElementById('classes-tbody');
    if (!tbody) return;

    if (filteredClasses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 2rem;">No classes found matching your search.</td></tr>';
        return;
    }

    tbody.innerHTML = filteredClasses.map(c => `
        <tr data-id="${c.id}">
            <td class="col-name">
                <div class="name-cell">
                    <span>${esc(c.name)}</span>
                    <span class="row-hover-icon">Details →</span>
                </div>
            </td>
            <td class="col-subclass">${esc(c.subclass)}</td>
            <td class="col-hitdie">${esc(c.hit_die || '—')}</td>
            <td class="col-multiclass hide-tablet">${formatMulticlassShort(c.multiclassing)}</td>
            <td class="col-expanded hide-mobile">${formatSnippet(c.expanded_options)}</td>
            <td class="col-advice hide-tablet">${formatSnippet(c.rage_advice)}</td>
        </tr>
    `).join('');

    // Attach row click listeners
    tbody.querySelectorAll('tr').forEach(row => {
        row.addEventListener('click', () => {
            const classId = row.dataset.id;
            const cls = allClasses.find(c => c.id === classId);
            if (cls) showClassDetail(cls);
        });
    });
}

/**
 * Formats the multiclassing requirements for the table view.
 * Extracts the first line or a short summary.
 */
function formatMulticlassShort(text) {
    if (!text) return '—';
    // Look for "Requires [Stats] [Value]" style
    const match = text.match(/Requires\s+([^.\n]+)/i);
    return match ? match[0] : text.split('\n')[0].substring(0, 30) + '...';
}

/**
 * Shows the full detail for a specific Class in a modal.
 */
function showClassDetail(cls) {
    const html = `
        <div class="detail-header">
            <span class="detail-category">Class Options</span>
            <h2 class="detail-title">${esc(cls.name)} <small style="opacity:0.6; font-size: 0.6em;">(${esc(cls.subclass)})</small></h2>
        </div>

        <div class="detail-grid">
            <div class="detail-item">
                <label>Hit Die</label>
                <value>${esc(cls.hit_die || '—')}</value>
            </div>
            <div class="detail-item" style="grid-column: span 2;">
                <label>Multiclassing / Proficiencies</label>
                <value style="white-space: pre-wrap; font-size: 0.95rem;">${esc(cls.multiclassing || 'None')}</value>
            </div>
        </div>

        ${cls.expanded_options ? `
        <div class="detail-section">
            <h4>Expanded Options</h4>
            <div style="white-space: pre-wrap; font-size: 0.95rem; line-height: 1.6;">${esc(cls.expanded_options)}</div>
        </div>
        ` : ''}

        ${cls.rage_advice ? `
        <div class="detail-section">
            <h4>Notes / Advice</h4>
            <div style="white-space: pre-wrap; font-size: 0.95rem; line-height: 1.6; color: var(--color-secondary);">${esc(cls.rage_advice)}</div>
        </div>
        ` : ''}
    `;

    openModal(html);
}

/**
 * Filters the dataset based on a search term.
 */
export function filterClasses(searchTerm) {
    if (!searchTerm) {
        filteredClasses = [...allClasses];
    } else {
        const lower = searchTerm.toLowerCase();
        filteredClasses = allClasses.filter(c => 
            c.name.toLowerCase().includes(lower) ||
            c.subclass.toLowerCase().includes(lower) ||
            c.multiclassing?.toLowerCase().includes(lower) ||
            c.expanded_options?.toLowerCase().includes(lower) ||
            c.rage_advice?.toLowerCase().includes(lower)
        );
    }
    renderClassTable();
}

/**
 * Sets up global handlers for the Classes view.
 */
function setupEventHandlers() {
    // Handled in ac-main.js
}
