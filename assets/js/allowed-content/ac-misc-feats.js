/**
 * ================================================================
 * AC MISC CLASS FEATS MODULE
 * ================================================================
 * 
 * Logic for the Misc Class Feats content set. Handles:
 * - Table rendering for Fighting Styles, Infusions, and Invocations
 * - Multi-table filtering and search
 * - detail generation for each type
 */

import { getFightingStyles, getArtificerInfusions, getEldritchInvocations } from './ac-service.js';
import { openModal, esc, formatSnippet } from './ac-ui-utils.js';

let allFightingStyles = [];
let allInfusions = [];
let allInvocations = [];

let filteredFS = [];
let filteredAI = [];
let filteredEI = [];

/**
 * Initializes the Misc Class Feats view.
 */
export async function initMiscFeats() {
    const view = document.getElementById('ac-view-misc-feats');
    
    // Fetch all data in parallel
    const [fsData, aiData, eiData] = await Promise.all([
        getFightingStyles(),
        getArtificerInfusions(),
        getEldritchInvocations()
    ]);

    allFightingStyles = fsData;
    allInfusions = aiData;
    allInvocations = eiData;

    filteredFS = [...allFightingStyles];
    filteredAI = [...allInfusions];
    filteredEI = [...allInvocations];

    renderAllTables();
}

/**
 * Renders all three tables in the view.
 */
function renderAllTables() {
    renderShortcuts();
    renderFightingStyles();
    renderArtificerInfusions();
    renderEldritchInvocations();
}

/**
 * Renders the shortcut jump links.
 */
function renderShortcuts() {
    const container = document.getElementById('misc-feats-shortcuts');
    if (!container) return;

    const sections = [
        { id: 'section-fs', label: 'Fighting Styles' },
        { id: 'section-ai', label: 'Artificer Infusions' },
        { id: 'section-ei', label: 'Eldritch Invocations' }
    ];

    container.innerHTML = `
        <div class="ac-shortcuts">
            ${sections.map(s => `
                <button class="ac-shortcut-chip" data-target="${s.id}">
                    ${s.label}
                </button>
            `).join('')}
        </div>
    `;

    container.querySelectorAll('.ac-shortcut-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const element = document.getElementById(chip.dataset.target);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

/**
 * Renders the Fighting Styles table.
 */
function renderFightingStyles() {
    const tbody = document.getElementById('fs-tbody');
    const stats = document.getElementById('fs-stats');
    if (!tbody) return;

    stats.textContent = `${filteredFS.length} Styles`;

    if (filteredFS.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="ac-no-results">No fighting styles found.</td></tr>';
        return;
    }

    tbody.innerHTML = filteredFS.map(s => `
        <tr data-id="${s.id}" data-type="fs">
            <td class="col-name"><strong>${esc(s.name)}</strong></td>
            <td class="col-classes">${esc(s.classes || 'Any')}</td>
            <td class="col-source hide-mobile">${esc(s.source)}</td>
            <td class="col-notes">${formatSnippet(s.notes_advice, 80)}</td>
        </tr>
    `).join('');

    attachRowListeners(tbody, allFightingStyles, showFSDetail);
}

/**
 * Renders the Artificer Infusions table.
 */
function renderArtificerInfusions() {
    const tbody = document.getElementById('ai-tbody');
    const stats = document.getElementById('ai-stats');
    if (!tbody) return;

    stats.textContent = `${filteredAI.length} Infusions`;

    if (filteredAI.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="ac-no-results">No infusions found.</td></tr>';
        return;
    }

    tbody.innerHTML = filteredAI.map(i => `
        <tr data-id="${i.id}" data-type="ai">
            <td class="col-name"><strong>${esc(i.name)}</strong></td>
            <td class="col-item-prereq">${esc(i.item_prereq || '—')}</td>
            <td class="col-attunement hide-mobile">${esc(i.requires_attunement || 'No')}</td>
            <td class="col-level hide-mobile">${esc(i.level_prereq || '1')}</td>
            <td class="col-source hide-mobile">${esc(i.source)}</td>
            <td class="col-notes">${formatSnippet(i.notes_advice, 80)}</td>
        </tr>
    `).join('');

    attachRowListeners(tbody, allInfusions, showAIDetail);
}

/**
 * Renders the Eldritch Invocations table.
 */
function renderEldritchInvocations() {
    const tbody = document.getElementById('ei-tbody');
    const stats = document.getElementById('ei-stats');
    if (!tbody) return;

    stats.textContent = `${filteredEI.length} Invocations`;

    if (filteredEI.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="ac-no-results">No invocations found.</td></tr>';
        return;
    }

    tbody.innerHTML = filteredEI.map(v => `
        <tr data-id="${v.id}" data-type="ei">
            <td class="col-name"><strong>${esc(v.name)}</strong></td>
            <td class="col-pact-prereq">${esc(v.pact_prereq || '—')}</td>
            <td class="col-other-prereq hide-mobile">${esc(v.other_prereq || '—')}</td>
            <td class="col-level hide-mobile">${esc(v.level_prereq || '1')}</td>
            <td class="col-source hide-mobile">${esc(v.source)}</td>
            <td class="col-notes">${formatSnippet(v.notes_advice, 80)}</td>
        </tr>
    `).join('');

    attachRowListeners(tbody, allInvocations, showEIDetail);
}

/**
 * Helper to attach detail modal listeners to rows.
 */
function attachRowListeners(tbody, dataSet, detailFn) {
    tbody.querySelectorAll('tr').forEach(row => {
        row.addEventListener('click', () => {
            const id = row.dataset.id;
            const item = dataSet.find(i => i.id === id);
            if (item) detailFn(item);
        });
    });
}

/**
 * Detail View: Fighting Style
 */
function showFSDetail(s) {
    const html = `
        <div class="detail-header">
            <span class="detail-category">Fighting Style</span>
            <h2 class="detail-title">${esc(s.name)}</h2>
        </div>
        <div class="detail-grid">
            <div class="detail-item">
                <label>Classes</label>
                <value>${esc(s.classes || 'Any')}</value>
            </div>
            <div class="detail-item">
                <label>Source</label>
                <value>${esc(s.source)}</value>
            </div>
        </div>
        <div class="detail-section">
            <h4>Notes / advice</h4>
            <p style="white-space: pre-wrap;">${esc(s.notes_advice || 'No additional notes.')}</p>
        </div>
    `;
    openModal(html);
}

/**
 * Detail View: Artificer Infusion
 */
function showAIDetail(i) {
    const html = `
        <div class="detail-header">
            <span class="detail-category">Artificer Infusion</span>
            <h2 class="detail-title">${esc(i.name)}</h2>
        </div>
        <div class="detail-grid">
            <div class="detail-item">
                <label>Item Prerequisite</label>
                <value>${esc(i.item_prereq || 'None')}</value>
            </div>
            <div class="detail-item">
                <label>Requires Attunement</label>
                <value>${esc(i.requires_attunement || 'No')}</value>
            </div>
            <div class="detail-item">
                <label>Level Requirement</label>
                <value>${esc(i.level_prereq || '1')}</value>
            </div>
            <div class="detail-item">
                <label>Source</label>
                <value>${esc(i.source)}</value>
            </div>
        </div>
        <div class="detail-section">
            <h4>Notes / advice</h4>
            <p style="white-space: pre-wrap;">${esc(i.notes_advice || 'No additional notes.')}</p>
        </div>
    `;
    openModal(html);
}

/**
 * Detail View: Eldritch Invocation
 */
function showEIDetail(v) {
    const html = `
        <div class="detail-header">
            <span class="detail-category">Eldritch Invocation</span>
            <h2 class="detail-title">${esc(v.name)}</h2>
        </div>
        <div class="detail-grid">
            <div class="detail-item">
                <label>Pact Prerequisite</label>
                <value>${esc(v.pact_prereq || 'None')}</value>
            </div>
            <div class="detail-item">
                <label>Level Requirement</label>
                <value>${esc(v.level_prereq || '1')}</value>
            </div>
            <div class="detail-item">
                <label>Other Prerequisites</label>
                <value>${esc(v.other_prereq || 'None')}</value>
            </div>
            <div class="detail-item">
                <label>Source</label>
                <value>${esc(v.source)}</value>
            </div>
        </div>
        <div class="detail-section">
            <h4>Notes / advice</h4>
            <p style="white-space: pre-wrap;">${esc(v.notes_advice || 'No additional notes.')}</p>
        </div>
    `;
    openModal(html);
}

/**
 * Filters all three tables based on a search term.
 * 
 * @param {string} term - Search term
 */
export function filterMiscFeats(term) {
    if (!term) {
        filteredFS = [...allFightingStyles];
        filteredAI = [...allInfusions];
        filteredEI = [...allInvocations];
    } else {
        const lower = term.toLowerCase();
        
        filteredFS = allFightingStyles.filter(s => 
            s.name.toLowerCase().includes(lower) || 
            s.classes?.toLowerCase().includes(lower) ||
            s.source.toLowerCase().includes(lower) ||
            s.notes_advice?.toLowerCase().includes(lower)
        );

        filteredAI = allInfusions.filter(i => 
            i.name.toLowerCase().includes(lower) || 
            i.item_prereq?.toLowerCase().includes(lower) ||
            i.source.toLowerCase().includes(lower) ||
            i.notes_advice?.toLowerCase().includes(lower)
        );

        filteredEI = allInvocations.filter(v => 
            v.name.toLowerCase().includes(lower) || 
            v.pact_prereq?.toLowerCase().includes(lower) ||
            v.other_prereq?.toLowerCase().includes(lower) ||
            v.source.toLowerCase().includes(lower) ||
            v.notes_advice?.toLowerCase().includes(lower)
        );
    }

    renderAllTables();
}
