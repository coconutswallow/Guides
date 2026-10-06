/**
 * ================================================================
 * AC LANGUAGES MODULE
 * ================================================================
 * 
 * Data handling and presentation for Allowed Content Languages.
 * Supports complete language catalogue, Classification filtering,
 * Script filtering, interactive detail modal, and full staff
 * administrative operations (Add, Edit, Delete).
 * 
 * Features:
 * - Table view with responsive columns: Language, Classification, Script, Origin, Typical Speakers, Notes / Rulings.
 * - Category banner displaying official rulings/guidelines when a classification is filtered.
 * - Toolbar with stats counter, Classification filter, and Script filter.
 * - Detail modal on row click with comprehensive metadata and audit check_id.
 * - Mobile-responsive add/edit form modal for staff administrators.
 * 
 * @module ACLanguages
 */

import { 
    getLanguages, 
    getLanguageTypes,
    createLanguage, 
    updateLanguage, 
    deleteLanguage 
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
    renderMarkdownLinks, 
    formatExpandableText,
    attachExpandableTextListeners
} from './ac-ui-utils.js';

export {
    setAdminMode,
    getAdminMode
};

let allLanguages = [];
let allLanguageTypes = [];
let filteredLanguages = [];
let availableScripts = [];

// Active toolbar filters
let selectedTypeFilter = 'ALL';     // 'ALL' | specific type ID or name
let selectedScriptFilter = 'ALL';   // 'ALL' | 'UNWRITTEN' | specific script
let currentSearchTerm = '';

/**
 * Formats notes text with markdown links and inline more/less toggle if long.
 * 
 * @param {string|null} text
 * @returns {string} HTML markup
 */
export function formatNotes(text) {
    if (!text || typeof text !== 'string' || text.trim() === '') {
        return '<span style="opacity: 0.4;">—</span>';
    }
    return formatExpandableText(text, 150);
}

/**
 * Formats script label.
 * 
 * @param {string|null} script
 * @returns {string} HTML markup
 */
export function formatScript(script) {
    if (!script || typeof script !== 'string' || script.trim() === '' || script.trim() === '—') {
        return '<span class="ac-script-unwritten" style="opacity: 0.5;">—</span>';
    }
    return `<code class="ac-script-code">${esc(script)}</code>`;
}

/**
 * Initializes the Languages view.
 * 
 * @param {boolean} [forceRefresh=false]
 */
export async function initLanguages(forceRefresh = false) {
    const container = document.getElementById('ac-view-languages');
    if (!container) return;

    if (forceRefresh) {
        selectedTypeFilter = 'ALL';
        selectedScriptFilter = 'ALL';
        currentSearchTerm = '';
    } else if (allLanguages.length > 0 && allLanguageTypes.length > 0) {
        renderLanguages();
        return;
    }

    container.innerHTML = `
        <div class="ac-loading">
            <div class="spinner"></div>
            <span>Cataloging Languages...</span>
        </div>
    `;

    try {
        const [languagesData, typesData] = await Promise.all([
            getLanguages(),
            getLanguageTypes()
        ]);

        allLanguages = sortByDisplayOrder(languagesData || []);
        allLanguageTypes = sortByDisplayOrder(typesData || []);

        // Collect distinct scripts for filter dropdown
        const scriptsSet = new Set();
        allLanguages.forEach(l => {
            if (typeof l.script === 'string' && l.script.trim() && l.script.trim() !== '—') {
                scriptsSet.add(l.script.trim());
            }
        });
        availableScripts = Array.from(scriptsSet).sort((a, b) => a.localeCompare(b));

        filteredLanguages = [...allLanguages];
        renderLanguages();
    } catch (err) {
        console.error('Failed to initialize Languages view:', err);
        container.innerHTML = `
            <div class="ac-error-state">
                <p>Failed to load languages. Please try again later.</p>
                <button class="ac-btn-admin ac-btn-secondary" onclick="window.location.reload()">Reload Page</button>
            </div>
        `;
    }
}

/**
 * Renders the full Languages view including toolbar, banners, and table.
 */
function renderLanguages() {
    const container = document.getElementById('ac-view-languages');
    if (!container) return;

    const isAdmin = getAdminMode();
    applyFilters();

    // Check if selected classification has description
    const activeType = allLanguageTypes.find(t => t.id === selectedTypeFilter || t.name === selectedTypeFilter);

    const html = `
        <div class="ac-languages-container">
            <!-- Toolbar: Filters and Controls -->
            <div class="ac-languages-toolbar ac-classes-toolbar">
                <div class="ac-languages-stats ac-classes-stats" id="languages-stats">
                    Showing <strong>${filteredLanguages.length}</strong> ${filteredLanguages.length === 1 ? 'Language' : 'Languages'}
                </div>

                <div class="ac-languages-controls ac-classes-controls">
                    <!-- Classification Filter -->
                    <select id="ac-languages-type-filter" class="ac-filter-select" title="Filter by Classification" aria-label="Filter by Classification">
                        <option value="ALL" ${selectedTypeFilter === 'ALL' ? 'selected' : ''}>All Classifications (${allLanguageTypes.length})</option>
                        ${allLanguageTypes.map(t => `
                            <option value="${esc(t.id)}" ${selectedTypeFilter === t.id ? 'selected' : ''}>${esc(t.name)}</option>
                        `).join('')}
                    </select>

                    <!-- Script Filter -->
                    <select id="ac-languages-script-filter" class="ac-filter-select" title="Filter by Script" aria-label="Filter by Script">
                        <option value="ALL" ${selectedScriptFilter === 'ALL' ? 'selected' : ''}>All Scripts</option>
                        <option value="UNWRITTEN" ${selectedScriptFilter === 'UNWRITTEN' ? 'selected' : ''}>Unwritten / None</option>
                        ${availableScripts.map(s => `
                            <option value="${esc(s)}" ${selectedScriptFilter === s ? 'selected' : ''}>${esc(s)}</option>
                        `).join('')}
                    </select>
                </div>
            </div>

            <!-- Category Description Banner (if filtered) -->
            ${activeType && activeType.description ? `
                <div class="ac-category-banner" style="margin-bottom: 1rem;">
                    <strong>${esc(activeType.name)}:</strong>
                    <div>${renderMarkdownLinks(activeType.description, true)}</div>
                </div>
            ` : ''}

            <!-- Main Content Area: Table -->
            <div id="languages-table-container">
                ${renderTable(isAdmin)}
            </div>
        </div>
    `;

    container.innerHTML = html;
    setupControls();
    setupTableInteractions();
}

/**
 * Generates the HTML table for languages.
 * 
 * @param {boolean} isAdmin
 * @returns {string} Table HTML
 */
function renderTable(isAdmin) {
    if (filteredLanguages.length === 0) {
        return `
            <div class="ac-table-wrapper">
                <table class="ac-table" id="languages-table">
                    <thead>
                        <tr>
                            <th class="col-name" style="min-width: 170px;">Language</th>
                            <th class="col-classification">Classification</th>
                            <th class="col-script" style="width: 120px;">Script</th>
                            <th class="col-origin" style="min-width: 160px;">Origin</th>
                            <th class="col-speakers" style="min-width: 200px;">Typical Speakers</th>
                            <th class="col-notes" style="min-width: 220px;">Notes / Rulings</th>
                            ${isAdmin ? '<th class="col-actions" style="width: 80px; text-align: center;">Actions</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="${isAdmin ? 7 : 6}" style="text-align: center; padding: 3rem;">
                                No languages found matching your criteria.
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    return `
        <div class="ac-table-wrapper">
            <table class="ac-table" id="languages-table">
                <thead>
                    <tr>
                        <th class="col-name" style="min-width: 170px;">Language</th>
                        <th class="col-classification">Classification</th>
                        <th class="col-script" style="width: 120px;">Script</th>
                        <th class="col-origin" style="min-width: 160px;">Origin</th>
                        <th class="col-speakers" style="min-width: 200px;">Typical Speakers</th>
                        <th class="col-notes" style="min-width: 220px;">Notes / Rulings</th>
                        ${isAdmin ? '<th class="col-actions" style="width: 80px; text-align: center;">Actions</th>' : ''}
                    </tr>
                </thead>
                <tbody>
                    ${filteredLanguages.map(lang => renderRow(lang, isAdmin)).join('')}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Renders a single table row for a language.
 * 
 * @param {Object} lang
 * @param {boolean} isAdmin
 * @returns {string} Row HTML
 */
function renderRow(lang, isAdmin) {
    const typeName = lang.language_type?.name || 'Standard';

    return `
        <tr data-id="${esc(lang.id)}">
            <td class="col-name">
                <div class="name-cell">
                    <strong>${esc(lang.name)}</strong>
                    <span class="row-hover-icon">${isAdmin ? 'Edit / Details →' : 'Details →'}</span>
                </div>
            </td>
            <td class="col-classification">
                <span>${esc(typeName)}</span>
            </td>
            <td class="col-script">
                ${formatScript(lang.script)}
            </td>
            <td class="col-origin">
                <span>${esc(lang.origin || '—')}</span>
            </td>
            <td class="col-speakers">
                <span>${esc(lang.typical_speakers || '—')}</span>
            </td>
            <td class="col-notes">
                ${formatNotes(lang.notes)}
            </td>
            ${isAdmin ? `
                <td class="col-actions" style="text-align: center;" onclick="event.stopPropagation()">
                    <button class="ac-btn-icon btn-edit-lang" data-id="${esc(lang.id)}" title="Edit Language" aria-label="Edit Language">✏️</button>
                    <button class="ac-btn-icon btn-delete-lang" data-id="${esc(lang.id)}" title="Delete Language" aria-label="Delete Language">🗑️</button>
                </td>
            ` : ''}
        </tr>
    `;
}

/**
 * Sets up toolbar change listeners.
 */
function setupControls() {
    const typeFilter = document.getElementById('ac-languages-type-filter');
    if (typeFilter) {
        typeFilter.addEventListener('change', (e) => {
            selectedTypeFilter = e.target.value;
            renderLanguages();
        });
    }

    const scriptFilter = document.getElementById('ac-languages-script-filter');
    if (scriptFilter) {
        scriptFilter.addEventListener('change', (e) => {
            selectedScriptFilter = e.target.value;
            renderLanguages();
        });
    }
}

/**
 * Attaches row click and admin button listeners to the table.
 */
function setupTableInteractions() {
    const table = document.getElementById('languages-table');
    if (!table) return;

    // Expandable text listeners for long notes
    attachExpandableTextListeners(table);

    // Row click for detail view
    table.querySelectorAll('tbody tr[data-id]').forEach(row => {
        row.addEventListener('click', (e) => {
            // Ignore if clicking action buttons or links
            if (e.target.closest('button') || e.target.closest('a')) return;
            const id = row.getAttribute('data-id');
            const lang = allLanguages.find(l => l.id === id);
            if (lang) {
                showLanguageDetail(lang);
            }
        });
    });

    // Admin action buttons
    table.querySelectorAll('.btn-edit-lang').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            const lang = allLanguages.find(l => l.id === id);
            if (lang) openLanguageForm(lang);
        });
    });

    table.querySelectorAll('.btn-delete-lang').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            const lang = allLanguages.find(l => l.id === id);
            if (lang) confirmAndDeleteLanguage(lang);
        });
    });
}

/**
 * Filters the language collection by search term and dropdown selections.
 * 
 * @param {string} [term]
 */
export function filterLanguages(term = '') {
    currentSearchTerm = term.trim().toLowerCase();
    renderLanguages();
}

/**
 * Applies active search and dropdown filters to allLanguages.
 */
function applyFilters() {
    filteredLanguages = allLanguages.filter(lang => {
        // Classification filter
        if (selectedTypeFilter !== 'ALL') {
            const matchesTypeId = lang.type_id === selectedTypeFilter;
            const matchesTypeName = lang.language_type?.name === selectedTypeFilter;
            if (!matchesTypeId && !matchesTypeName) return false;
        }

        // Script filter
        if (selectedScriptFilter === 'UNWRITTEN') {
            if (lang.script && lang.script.trim() !== '' && lang.script.trim() !== '—') return false;
        } else if (selectedScriptFilter !== 'ALL') {
            if (!lang.script || lang.script.trim() !== selectedScriptFilter) return false;
        }

        // Search term filter
        if (currentSearchTerm) {
            const name = (lang.name || '').toLowerCase();
            const type = (lang.language_type?.name || '').toLowerCase();
            const script = (lang.script || '').toLowerCase();
            const origin = (lang.origin || '').toLowerCase();
            const speakers = (lang.typical_speakers || '').toLowerCase();
            const notes = (lang.notes || '').toLowerCase();
            const checkId = (lang.check_id || '').toLowerCase();

            const matchesSearch = 
                name.includes(currentSearchTerm) ||
                type.includes(currentSearchTerm) ||
                script.includes(currentSearchTerm) ||
                origin.includes(currentSearchTerm) ||
                speakers.includes(currentSearchTerm) ||
                notes.includes(currentSearchTerm) ||
                checkId.includes(currentSearchTerm);

            if (!matchesSearch) return false;
        }

        return true;
    });
}

/**
 * Opens detail modal for a language.
 * 
 * @param {Object} lang
 */
export function showLanguageDetail(lang) {
    const isAdmin = getAdminMode();
    const typeName = lang.language_type?.name || 'Standard';
    const typeDesc = lang.language_type?.description || '';

    const contentHtml = `
        <div class="ac-detail-container">
            <h2 class="detail-title">${esc(lang.name)}</h2>
            
            <div class="detail-badges" style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.5rem;">
                <span class="ac-badge-classification">${esc(typeName)}</span>
            </div>

            <div class="detail-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                <div class="detail-field">
                    <span class="detail-label">Script</span>
                    <div class="detail-value">${formatScript(lang.script)}</div>
                </div>
                <div class="detail-field">
                    <span class="detail-label">Origin</span>
                    <div class="detail-value">${esc(lang.origin || '—')}</div>
                </div>
                <div class="detail-field" style="grid-column: 1 / -1;">
                    <span class="detail-label">Typical Speakers</span>
                    <div class="detail-value">${esc(lang.typical_speakers || '—')}</div>
                </div>
            </div>

            ${typeDesc ? `
                <div class="ac-category-banner" style="margin-bottom: 1.5rem;">
                    <strong>${esc(typeName)} Guidelines:</strong>
                    <div>${renderMarkdownLinks(typeDesc, true)}</div>
                </div>
            ` : ''}

            <div class="detail-section" style="margin-bottom: 1.5rem;">
                <span class="detail-label">Notes & Rulings</span>
                <div class="detail-value" style="margin-top: 0.5rem; line-height: 1.6;">
                    ${lang.notes ? renderMarkdownLinks(lang.notes, true) : '<span style="opacity: 0.4;">No special rulings or notes recorded.</span>'}
                </div>
            </div>

            ${isAdmin ? `
                <div class="detail-admin-actions" style="display: flex; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid var(--color-border); padding-top: 1rem; margin-top: 1.5rem;">
                    <button type="button" class="ac-btn-admin ac-btn-danger" id="detail-btn-delete-lang">Delete Language</button>
                    <button type="button" class="ac-btn-admin ac-btn-primary" id="detail-btn-edit-lang">Edit Language</button>
                </div>
            ` : ''}
        </div>
    `;

    openModal(contentHtml);

    if (isAdmin) {
        const editBtn = document.getElementById('detail-btn-edit-lang');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                closeModal();
                openLanguageForm(lang);
            });
        }
        const delBtn = document.getElementById('detail-btn-delete-lang');
        if (delBtn) {
            delBtn.addEventListener('click', () => {
                closeModal();
                confirmAndDeleteLanguage(lang);
            });
        }
    }
}

/**
 * Opens the staff administration Add/Edit form modal for a Language.
 * 
 * @param {Object|null} [lang=null]
 */
export function openLanguageForm(lang = null) {
    const isEdit = Boolean(lang);
    const title = isEdit ? `Edit Language: ${lang.name}` : 'Add New Language';

    // Calculate default display order if adding
    const defaultOrder = isEdit 
        ? (lang.display_order ?? 0) 
        : getNextDisplayOrder(allLanguages);

    const formHtml = `
        <div class="ac-detail-container">
            <h2 class="detail-title">${esc(title)}</h2>
            
            <form id="ac-language-form" class="ac-edit-form">
                <div class="ac-form-group">
                    <label for="lang-input-name">Language Name *</label>
                    <input type="text" id="lang-input-name" required class="ac-form-input" value="${esc(lang?.name || '')}" placeholder="e.g. Sylvan, Undercommon">
                </div>

                <div class="ac-form-grid">
                    <div class="ac-form-group">
                        <label for="lang-input-type">Classification *</label>
                        <select id="lang-input-type" required class="ac-form-select">
                            ${allLanguageTypes.map(t => `
                                <option value="${esc(t.id)}" ${lang?.type_id === t.id ? 'selected' : ''}>${esc(t.name)}</option>
                            `).join('')}
                        </select>
                    </div>

                    <div class="ac-form-group">
                        <label for="lang-input-script">Script</label>
                        <input type="text" id="lang-input-script" class="ac-form-input" list="lang-scripts-list" value="${esc(lang?.script || '')}" placeholder="e.g. Dwarvish, Elvish, Common (leave blank if unwritten)">
                        <datalist id="lang-scripts-list">
                            ${availableScripts.map(s => `<option value="${esc(s)}"></option>`).join('')}
                        </datalist>
                    </div>
                </div>

                <div class="ac-form-grid">
                    <div class="ac-form-group">
                        <label for="lang-input-origin">Origin</label>
                        <input type="text" id="lang-input-origin" class="ac-form-input" value="${esc(lang?.origin || '')}" placeholder="e.g. The Feywild, Sigil">
                    </div>

                    <div class="ac-form-group">
                        <label for="lang-input-order">Display Order</label>
                        <input type="number" step="any" id="lang-input-order" class="ac-form-input" value="${formatDisplayOrder(defaultOrder)}">
                    </div>
                </div>

                <div class="ac-form-group">
                    <label for="lang-input-speakers">Typical Speakers</label>
                    <input type="text" id="lang-input-speakers" class="ac-form-input" value="${esc(lang?.typical_speakers || '')}" placeholder="e.g. Fey, plants, some celestials">
                </div>

                <div class="ac-form-group">
                    <label for="lang-input-notes">Notes & Rulings</label>
                    <textarea id="lang-input-notes" class="ac-form-textarea" rows="4" placeholder="Enter rulings, restrictions, character creation options, or markdown links...">${esc(lang?.notes || '')}</textarea>
                </div>

                <div class="ac-form-actions">
                    <button type="button" class="ac-btn-admin ac-btn-secondary" id="lang-form-cancel">Cancel</button>
                    <button type="submit" class="ac-btn-admin ac-btn-primary" id="lang-form-submit">${isEdit ? 'Save Changes' : 'Create Language'}</button>
                </div>
            </form>
        </div>
    `;

    openModal(formHtml);

    const cancelBtn = document.getElementById('lang-form-cancel');
    if (cancelBtn) {
        cancelBtn.onclick = () => closeModal();
    }

    const form = document.getElementById('ac-language-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('lang-form-submit');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerText = 'Saving...';
            }

            const name = document.getElementById('lang-input-name').value.trim();
            const typeId = document.getElementById('lang-input-type').value;
            const scriptVal = document.getElementById('lang-input-script').value.trim();
            const script = scriptVal === '' || scriptVal === '—' ? null : scriptVal;
            const originVal = document.getElementById('lang-input-origin').value.trim();
            const origin = originVal === '' ? null : originVal;
            const speakersVal = document.getElementById('lang-input-speakers').value.trim();
            const typicalSpeakers = speakersVal === '' ? null : speakersVal;
            const notesVal = document.getElementById('lang-input-notes').value.trim();
            const notes = notesVal === '' ? null : notesVal;
            const displayOrder = cleanFloat(parseFloat(document.getElementById('lang-input-order').value) || defaultOrder);

            const payload = {
                name,
                type_id: typeId,
                script,
                origin,
                typical_speakers: typicalSpeakers,
                notes,
                display_order: displayOrder
            };

            let result;
            if (isEdit) {
                result = await updateLanguage(lang.id, payload);
            } else {
                result = await createLanguage(payload);
            }

            if (result.error) {
                alert(`Error saving language: ${result.error.message || result.error}`);
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = isEdit ? 'Save Changes' : 'Create Language';
                }
                return;
            }

            closeModal();
            await initLanguages(true);
            window.dispatchEvent(new CustomEvent('ac:languages-updated'));
        };
    }
}

/**
 * Prompts confirmation and deletes a language.
 * 
 * @param {Object} lang
 */
export async function confirmAndDeleteLanguage(lang) {
    if (!lang) return;
    const confirmed = window.confirm(`Are you sure you want to delete the language "${lang.name}"? This action cannot be undone.`);
    if (!confirmed) return;

    const { success, error } = await deleteLanguage(lang.id);
    if (!success) {
        alert(`Failed to delete language: ${error?.message || error || 'Unknown error'}`);
        return;
    }

    await initLanguages(true);
    window.dispatchEvent(new CustomEvent('ac:languages-updated'));
}

if (typeof window !== 'undefined') {
    window.addEventListener('ac:languages-updated', () => {
        allLanguages = [];
        allLanguageTypes = [];
    });
}
