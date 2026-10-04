/**
 * ================================================================
 * AC SOURCES MODULE
 * ================================================================
 * 
 * Presentation, interaction, and administration controller for
 * Allowed Content Sources.
 * 
 * Features:
 * - Direct integration with normalized `ac_sources` and `lookups`.
 * - Single unified data table with Category column.
 * - Category filtering and Ruleset filtering.
 * - Real-time full-text search across all fields.
 * - Rendered clickable markdown links in Notes / Advice and detail modal.
 * - Row click opens detailed modal view.
 * - Silent staff authentication check: When an Admin or Engineer logs in
 *   via the Staff Portal, staff editing mode is automatically activated,
 *   enabling in-place editing, creation, and deletion of source records.
 *   For public visitors, the page remains strictly read-only.
 * 
 * @module ACSources
 */

import { getSources, getSourceLookups, updateSource, createSource, deleteSource } from './ac-service.js';
import { openModal, closeModal, esc, formatSnippet } from './ac-ui-utils.js';
import { supabase } from '../supabaseClient.js';
import { checkAccess } from '../auth-check.js';

let allSources = [];
let sourceTypes = [];
let sourceRulesets = [];
let filteredSources = [];

// Filter State
let selectedType = null;
let selectedRuleset = null;
let currentSearchTerm = '';

// Staff Admin State
let isAdmin = false;
let currentUser = null;

/**
 * Manually set or override admin mode (useful for testing or direct routing).
 * 
 * @param {boolean} enabled - Whether admin mode is active
 * @param {Object|null} user - The user object
 */
export function setAdminMode(enabled, user = null) {
    isAdmin = !!enabled;
    currentUser = user;
}

/**
 * Returns current admin mode state.
 * 
 * @returns {boolean}
 */
export function getAdminMode() {
    return isAdmin;
}

/**
 * Silently detects if the current visitor has an active Supabase session
 * with 'Admin' or 'Engineer' roles from the Staff Portal.
 * 
 * @returns {Promise<boolean>}
 */
export async function detectAdminSession() {
    try {
        if (!supabase || !supabase.auth) return isAdmin;
        const { data } = await supabase.auth.getUser();
        const user = data?.user;
        if (user) {
            const hasAccess = await checkAccess(user.id, ['Admin', 'Engineer']);
            if (hasAccess) {
                isAdmin = true;
                currentUser = user;
                return true;
            }
        }
    } catch (e) {
        // Silently treat as public visitor
    }
    return isAdmin;
}

/**
 * Initializes the Sources view.
 */
export async function initSources() {
    const container = document.getElementById('ac-view-sources');
    if (!container) return;

    // Show loading state if empty
    if (allSources.length === 0) {
        container.innerHTML = `
            <div class="ac-loading">
                <div class="spinner"></div>
                <span>Cataloging Sources...</span>
            </div>
        `;
    }

    // Fetch lookups, sources, and check admin session in parallel
    const [lookups, items] = await Promise.all([
        getSourceLookups(),
        getSources(),
        detectAdminSession()
    ]);

    sourceTypes = (lookups.types || []).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    sourceRulesets = lookups.rulesets || [
        { value: 2014, label: '2014' },
        { value: 2024, label: '2024' }
    ];

    allSources = items || [];
    applyFilters();
    renderSources();
}

/**
 * Applies active category, ruleset, and search filters to allSources.
 */
function applyFilters() {
    const term = currentSearchTerm.toLowerCase().trim();

    filteredSources = allSources.filter(item => {
        // Category filter
        if (selectedType && item.type !== selectedType) {
            return false;
        }

        // Ruleset filter
        if (selectedRuleset && String(item.ruleset) !== String(selectedRuleset)) {
            return false;
        }

        // Search term filter
        if (term) {
            const matchName = item.name?.toLowerCase().includes(term);
            const matchAbbr = item.abbreviation?.toLowerCase().includes(term);
            const matchKey = item.source_key?.toLowerCase().includes(term);
            const matchCheck = item.check_id?.toLowerCase().includes(term);
            const matchType = item.type?.toLowerCase().includes(term);
            const matchRuleset = String(item.ruleset || '').toLowerCase().includes(term);
            const matchContent = item.allowed_content?.toLowerCase().includes(term);
            const matchNotes = item.notes_advice?.toLowerCase().includes(term);

            if (!matchName && !matchAbbr && !matchKey && !matchCheck && !matchType && !matchRuleset && !matchContent && !matchNotes) {
                return false;
            }
        }

        return true;
    });
}

/**
 * Converts markdown links [label](url) in text to safe, clickable HTML anchor tags.
 * 
 * @param {string} text - Raw text with markdown links
 * @param {boolean} stopPropagation - Whether clicking the link stops event bubbling (e.g. In table rows)
 * @returns {string} Safe HTML with rendered anchor tags
 */
export function renderMarkdownLinks(text, stopPropagation = true) {
    if (!text) return '—';
    // Escape standard characters first
    let safe = esc(text);
    // Convert newlines to <br>
    safe = safe.replace(/\r?\n/g, '<br>');
    // Replace markdown links with secure target="_blank" anchors
    const stopProp = stopPropagation ? ' onclick="event.stopPropagation()"' : '';
    return safe.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)\"'>]+)\)/g, (match, label, url) => {
        const cleanUrl = url.replace(/"/g, '&quot;');
        return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="source-url-link"${stopProp}>${label}</a>`;
    });
}

/**
 * Displays a lightweight toast notification.
 * 
 * @param {string} message - Message text
 * @param {boolean} isError - Whether to format as error
 */
export function showToast(message, isError = false) {
    const existing = document.getElementById('ac-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'ac-toast';
    toast.className = `ac-toast ${isError ? 'error' : ''}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        if (toast.parentNode) toast.remove();
    }, 3500);
}

/**
 * Renders the full Sources view as a single large table with filters.
 */
function renderSources() {
    const container = document.getElementById('ac-view-sources');
    if (!container) return;

    // Check if the currently selected category has any special notes
    const activeCategoryMeta = selectedType ? sourceTypes.find(c => c.name === selectedType) : null;

    // Render layout skeleton
    container.innerHTML = `
        ${isAdmin ? `
            <div class="ac-admin-bar" id="sources-admin-bar">
                <div class="ac-admin-badge">
                    <span class="badge-icon">🛡️</span>
                    <span>Staff Mode: <strong>${esc(currentUser?.user_metadata?.full_name || currentUser?.email || 'Admin/Engineer')}</strong></span>
                </div>
                <div class="ac-admin-actions">
                    <button id="btn-add-source" class="ac-btn-admin ac-btn-primary">+ Add New Source</button>
                    <a href="/staff/" class="ac-btn-admin ac-btn-secondary">Staff Portal</a>
                </div>
            </div>
        ` : ''}

        <div class="ac-table-header">
            <div id="sources-nav" class="ac-monster-nav">
                <!-- Filter Chips -->
            </div>
            <div class="ac-stats" id="sources-stats">
                ${filteredSources.length} ${filteredSources.length === 1 ? 'Source' : 'Sources'} found
            </div>
        </div>
        ${activeCategoryMeta?.notes ? `
            <div class="ac-category-banner">
                <strong>${esc(activeCategoryMeta.name)}:</strong> ${renderMarkdownLinks(activeCategoryMeta.notes, false)}
            </div>
        ` : ''}
        <div id="sources-content" class="ac-sections-container"></div>
    `;

    renderNavigation();

    // Hook up Add Source button for Admins
    if (isAdmin) {
        const addBtn = document.getElementById('btn-add-source');
        if (addBtn) {
            addBtn.addEventListener('click', () => openSourceForm(null));
        }
    }

    const content = document.getElementById('sources-content');
    if (!content) return;

    if (filteredSources.length === 0) {
        content.innerHTML = `
            <div class="ac-no-results">
                <p>No sources found matching your criteria.</p>
                ${(selectedType || selectedRuleset || currentSearchTerm) ? `
                    <button class="ac-shortcut-chip" id="reset-sources-filters" style="margin-top: 1rem;">
                        Reset Filters
                    </button>
                ` : ''}
            </div>
        `;
        const resetBtn = document.getElementById('reset-sources-filters');
        if (resetBtn) {
            resetBtn.onclick = () => {
                selectedType = null;
                selectedRuleset = null;
                currentSearchTerm = '';
                const searchInput = document.getElementById('ac-global-search');
                if (searchInput) searchInput.value = '';
                applyFilters();
                renderSources();
            };
        }
        return;
    }

    // Render single unified table
    content.innerHTML = `
        <div class="ac-table-wrapper">
            <table class="ac-table" id="sources-table">
                <thead>
                    <tr>
                        <th class="col-name">Source</th>
                        <th class="col-abbr">Abbr.</th>
                        <th class="col-category">Category</th>
                        <th class="col-ruleset">Ruleset</th>
                        <th class="col-allowed-content hide-mobile">Allowed Content</th>
                        <th class="col-notes">Notes / Advice</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredSources.map(item => `
                        <tr data-id="${item.id}">
                            <td class="col-name">
                                <div class="name-cell">
                                    ${item.link ? `
                                        <a href="${esc(item.link)}" target="_blank" rel="noopener noreferrer" class="source-name-link" onclick="event.stopPropagation()">
                                            ${esc(item.name)} ↗
                                        </a>
                                    ` : `<span>${esc(item.name)}</span>`}
                                    <span class="row-hover-icon">${isAdmin ? 'Edit / Details →' : 'Details →'}</span>
                                </div>
                            </td>
                            <td class="col-abbr"><code>${esc(item.abbreviation || '—')}</code></td>
                            <td class="col-category">${esc(item.type || '—')}</td>
                            <td class="col-ruleset"><span class="ruleset-pill">${esc(item.ruleset || '—')}</span></td>
                            <td class="col-allowed-content hide-mobile">${formatSnippet(item.allowed_content, 120)}</td>
                            <td class="col-notes">${renderMarkdownLinks(item.notes_advice, true)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    // Attach row click listeners for detail modal (ignoring clicks on links)
    content.querySelectorAll('tr[data-id]').forEach(row => {
        row.addEventListener('click', (e) => {
            if (e.target.closest('a')) return;
            const id = row.dataset.id;
            const item = allSources.find(i => i.id === id);
            if (item) showSourceDetail(item);
        });
    });
}

/**
 * Renders filter chips for Category and Ruleset.
 */
function renderNavigation() {
    const navContainer = document.getElementById('sources-nav');
    if (!navContainer) return;

    // Available categories from lookups
    const categoryOptions = sourceTypes.map(c => c.name);

    navContainer.innerHTML = `
        <div class="ac-shortcuts-row">
            <span class="nav-label">Category:</span>
            <div class="ac-shortcuts">
                <button class="ac-shortcut-chip ${!selectedType ? 'active' : ''}" data-type="category" data-value="">
                    All
                </button>
                ${categoryOptions.map(catName => `
                    <button class="ac-shortcut-chip ${selectedType === catName ? 'active' : ''}" data-type="category" data-value="${esc(catName)}">
                        ${esc(catName)}
                    </button>
                `).join('')}
            </div>
        </div>

        <div class="ac-shortcuts-row">
            <span class="nav-label">Ruleset:</span>
            <div class="ac-shortcuts">
                <button class="ac-shortcut-chip ${!selectedRuleset ? 'active' : ''}" data-type="ruleset" data-value="">
                    All
                </button>
                ${sourceRulesets.map(r => `
                    <button class="ac-shortcut-chip ${selectedRuleset === String(r.value) ? 'active' : ''}" data-type="ruleset" data-value="${esc(String(r.value))}">
                        ${esc(r.label)}
                    </button>
                `).join('')}
            </div>
        </div>
    `;

    // Chip click interactions
    navContainer.querySelectorAll('.ac-shortcut-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const { type, value } = chip.dataset;

            if (type === 'category') {
                selectedType = value || null;
                applyFilters();
                renderSources();
            } else if (type === 'ruleset') {
                selectedRuleset = value || null;
                applyFilters();
                renderSources();
            }
        });
    });
}

/**
 * Resets all active filters and search term.
 */
export function resetFilters() {
    selectedType = null;
    selectedRuleset = null;
    currentSearchTerm = '';
    applyFilters();
    renderSources();
}

/**
 * External search filter handler triggered from global search bar.
 * 
 * @param {string} term - Search query string
 */
export function filterSources(term) {
    currentSearchTerm = term || '';
    applyFilters();
    renderSources();
}

/**
 * Displays full detail for a Source item in a modal.
 * If user is Staff Admin, includes Edit and Delete buttons.
 * 
 * @param {Object} item - Source row object
 */
function showSourceDetail(item) {
    const html = `
        <div class="detail-header">
            <div>
                <span class="detail-category">${esc(item.type || 'Source')}</span>
                <h2 class="detail-title">${esc(item.name)}</h2>
                ${item.link ? `
                    <div class="detail-link-sub">
                        <a href="${esc(item.link)}" target="_blank" rel="noopener noreferrer" class="source-url-link">
                            ${esc(item.link)} ↗
                        </a>
                    </div>
                ` : ''}
            </div>
            ${isAdmin ? `
                <div class="detail-actions">
                    <button id="modal-btn-edit-source" class="ac-btn-admin ac-btn-primary">✏️ Edit</button>
                    <button id="modal-btn-delete-source" class="ac-btn-admin ac-btn-delete" title="Delete Source">🗑️ Delete</button>
                </div>
            ` : ''}
        </div>

        <div class="detail-grid">
            <div class="detail-item">
                <label>Source Key</label>
                <value><code>${esc(item.source_key || '—')}</code></value>
            </div>
            <div class="detail-item">
                <label>Abbreviation</label>
                <value><code>${esc(item.abbreviation || '—')}</code></value>
            </div>
            <div class="detail-item">
                <label>Category</label>
                <value>${esc(item.type || '—')}</value>
            </div>
            <div class="detail-item">
                <label>Ruleset</label>
                <value><span class="ruleset-pill">${esc(item.ruleset || '—')}</span></value>
            </div>
            <div class="detail-item">
                <label>Audit Check ID</label>
                <value><code>${esc(item.check_id || '—')}</code></value>
            </div>
            <div class="detail-item">
                <label>Display Order</label>
                <value>${esc(String(item.display_order ?? '—'))}</value>
            </div>
        </div>

        <div class="detail-section">
            <h4>Allowed Content</h4>
            <div class="content-box" style="white-space: pre-wrap;">${esc(item.allowed_content || 'No specific content limitations listed.')}</div>
        </div>

        ${item.notes_advice ? `
        <div class="detail-section">
            <h4>Notes / Rage Advice</h4>
            <div class="advice-content" style="white-space: pre-wrap; line-height: 1.5;">${renderMarkdownLinks(item.notes_advice, false)}</div>
        </div>
        ` : ''}
    `;

    openModal(html);

    if (isAdmin) {
        document.getElementById('modal-btn-edit-source')?.addEventListener('click', () => openSourceForm(item));
        document.getElementById('modal-btn-delete-source')?.addEventListener('click', () => confirmAndDeleteSource(item));
    }
}

/**
 * Opens an edit or creation form modal for a source.
 * 
 * @param {Object|null} item - Existing item to edit or null to create new
 */
function openSourceForm(item = null) {
    const isNew = !item;
    const nextOrder = isNew 
        ? ((allSources.reduce((max, s) => Math.max(max, s.display_order ?? 0), 0)) + 1)
        : (item.display_order ?? 1);

    const formHtml = `
        <div class="detail-header">
            <div>
                <span class="detail-category">${isNew ? 'New Catalog Entry' : 'Edit Catalog Entry'}</span>
                <h2 class="detail-title">${isNew ? 'Add New Source' : esc(item.name)}</h2>
            </div>
        </div>

        <form id="ac-source-form" class="ac-edit-form">
            <div class="ac-form-grid">
                <div class="ac-form-group">
                    <label for="src-input-name">Source Name *</label>
                    <input type="text" id="src-input-name" required value="${isNew ? '' : esc(item.name)}" class="ac-form-input">
                </div>

                <div class="ac-form-group">
                    <label for="src-input-abbr">Abbreviation *</label>
                    <input type="text" id="src-input-abbr" required value="${isNew ? '' : esc(item.abbreviation || '')}" class="ac-form-input">
                </div>

                <div class="ac-form-group">
                    <label for="src-input-key">Source Key (PK) *</label>
                    <input type="text" id="src-input-key" required value="${isNew ? '' : esc(item.source_key || '')}" class="ac-form-input" ${isNew ? '' : 'readonly'}>
                    ${!isNew ? '<small class="ac-form-help">Canonical primary key (immutable)</small>' : ''}
                </div>

                <div class="ac-form-group">
                    <label for="src-input-check">Audit Check ID *</label>
                    <input type="text" id="src-input-check" required value="${isNew ? '' : esc(item.check_id || '')}" placeholder="e.g. SRC_0120" class="ac-form-input">
                </div>

                <div class="ac-form-group">
                    <label for="src-input-type">Category *</label>
                    <select id="src-input-type" required class="ac-form-select">
                        ${sourceTypes.map(c => `
                            <option value="${esc(c.name)}" ${(item?.type === c.name) ? 'selected' : ''}>
                                ${esc(c.name)}
                            </option>
                        `).join('')}
                    </select>
                </div>

                <div class="ac-form-group">
                    <label for="src-input-ruleset">Ruleset *</label>
                    <select id="src-input-ruleset" required class="ac-form-select">
                        ${sourceRulesets.map(r => `
                            <option value="${esc(String(r.value))}" ${(String(item?.ruleset) === String(r.value)) ? 'selected' : ''}>
                                ${esc(r.label)}
                            </option>
                        `).join('')}
                    </select>
                </div>

                <div class="ac-form-group">
                    <label for="src-input-order">Display Order</label>
                    <input type="number" id="src-input-order" value="${nextOrder}" class="ac-form-input">
                </div>

                <div class="ac-form-group">
                    <label for="src-input-link">External URL</label>
                    <input type="url" id="src-input-link" value="${isNew ? '' : esc(item.link || '')}" placeholder="https://..." class="ac-form-input">
                </div>
            </div>

            <div class="ac-form-group">
                <label for="src-input-content">Allowed Content</label>
                <textarea id="src-input-content" rows="3" class="ac-form-textarea" placeholder="e.g. All: Classes, Spells...">${isNew ? '' : esc(item.allowed_content || '')}</textarea>
            </div>

            <div class="ac-form-group">
                <label for="src-input-notes">Notes / Rage Advice</label>
                <textarea id="src-input-notes" rows="4" class="ac-form-textarea" placeholder="Enter notes or markdown links like [Label](https://...)">${isNew ? '' : esc(item.notes_advice || '')}</textarea>
                <small class="ac-form-help">Tip: Markdown links e.g. <code>[D&amp;D Beyond](https://...)</code> are rendered as clickable links.</small>
            </div>

            <div class="ac-form-actions">
                <button type="button" id="src-btn-cancel" class="ac-btn-admin ac-btn-secondary">Cancel</button>
                <button type="submit" id="src-btn-submit" class="ac-btn-admin ac-btn-primary">
                    ${isNew ? 'Create Source' : 'Save Changes'}
                </button>
            </div>
        </form>
    `;

    openModal(formHtml);

    // Cancel action
    document.getElementById('src-btn-cancel')?.addEventListener('click', () => {
        if (item) {
            showSourceDetail(item);
        } else {
            closeModal();
        }
    });

    // Form submit action
    const form = document.getElementById('ac-source-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('src-btn-submit');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Saving...';
            }

            const payload = {
                name: document.getElementById('src-input-name').value.trim(),
                abbreviation: document.getElementById('src-input-abbr').value.trim(),
                source_key: document.getElementById('src-input-key').value.trim(),
                check_id: document.getElementById('src-input-check').value.trim(),
                type: document.getElementById('src-input-type').value,
                ruleset: document.getElementById('src-input-ruleset').value,
                display_order: parseInt(document.getElementById('src-input-order').value, 10) || 0,
                link: document.getElementById('src-input-link').value.trim() || null,
                allowed_content: document.getElementById('src-input-content').value.trim() || null,
                notes_advice: document.getElementById('src-input-notes').value.trim() || null
            };

            if (isNew) {
                const { data, error } = await createSource(payload);
                if (error) {
                    showToast(`Error creating source: ${error.message || 'Database error'}`, true);
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Create Source';
                    }
                    return;
                }
                const newRecord = data || { ...payload, id: 'temp-' + Date.now() };
                allSources.push(newRecord);
                allSources.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
                applyFilters();
                renderSources();
                closeModal();
                showToast(`Source "${payload.name}" created successfully!`);
            } else {
                const { data, error } = await updateSource(item.id, payload);
                if (error) {
                    showToast(`Error updating source: ${error.message || 'Database error'}`, true);
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Save Changes';
                    }
                    return;
                }
                const idx = allSources.findIndex(s => s.id === item.id);
                if (idx !== -1) {
                    allSources[idx] = { ...allSources[idx], ...payload, ...(data || {}) };
                }
                allSources.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
                applyFilters();
                renderSources();
                closeModal();
                showToast(`Source "${payload.name}" updated successfully!`);
            }
        });
    }
}

/**
 * Handles confirmation and deletion of a source.
 * 
 * @param {Object} item - Source record to delete
 */
async function confirmAndDeleteSource(item) {
    if (!confirm(`Are you sure you want to delete source "${item.name}" (${item.source_key})?\n\nThis cannot be undone.`)) {
        return;
    }

    const { success, error } = await deleteSource(item.id);
    if (!success) {
        showToast(`Error deleting source: ${error?.message || 'Database error'}`, true);
        return;
    }

    allSources = allSources.filter(s => s.id !== item.id);
    applyFilters();
    renderSources();
    closeModal();
    showToast(`Source "${item.name}" deleted.`);
}
