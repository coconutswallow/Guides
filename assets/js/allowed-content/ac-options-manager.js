/**
 * ================================================================
 * AC OPTIONS MANAGER MODAL
 * ================================================================
 * 
 * Reusable options and lookups management modal for Allowed Content tabs.
 * Allows Staff Admins and Engineers to configure categories, types,
 * classifications, rulesets, and notes across all tabs.
 * 
 * @module ACOptionsManager
 */

import { openModal, closeModal, showToast, esc } from './ac-ui-utils.js';

function formatSnippet(text, maxLen = 60) {
    if (!text) return '—';
    const clean = String(text).replace(/\s+/g, ' ').trim();
    if (clean.length <= maxLen) return esc(clean);
    return esc(clean.substring(0, maxLen - 3)) + '...';
}

/**
 * @typedef {Object} OptionField
 * @property {string} key - Property key on item object (e.g. 'name', 'notes')
 * @property {string} label - Input label
 * @property {'text'|'number'|'textarea'} [type='text'] - Input field type
 * @property {boolean} [required=false] - Whether field is required
 * @property {string} [placeholder] - Placeholder text
 * @property {string} [helpText] - Help text rendered below field
 * @property {*} [defaultValue] - Default value for new items
 */

/**
 * @typedef {Object} OptionTabConfig
 * @property {string} id - Tab identifier (e.g. 'categories', 'rulesets')
 * @property {string} label - Tab display label
 * @property {Array<Object>} items - Array of items to manage
 * @property {Array<OptionField>} fields - Fields editable on this item
 * @property {Array<{key: string, label: string, width?: string, code?: boolean, snippet?: number}>} columns - Table columns
 * @property {string} [addLabel] - Button label (e.g. '+ Add Category')
 */

/**
 * @typedef {Object} OptionsManagerConfig
 * @property {string} title - Modal title (e.g. '⚙️ Configure Classes Options')
 * @property {string} subtitle - Explanatory subtitle
 * @property {Array<OptionTabConfig>} tabs - Tab definitions
 * @property {function(Record<string, Array<Object>>): Promise<boolean|void>} onSave - Async persistence handler
 */

/**
 * Opens a standardized Options / Lookups Manager modal.
 * 
 * @param {OptionsManagerConfig} config - Configuration object
 */
export function openGenericOptionsModal(config) {
    const { title, subtitle, tabs = [], onSave } = config;
    if (tabs.length === 0) return;

    // Clone all tabs' items into drafts
    const drafts = {};
    tabs.forEach(t => {
        drafts[t.id] = JSON.parse(JSON.stringify(t.items || []));
    });

    let activeTabId = tabs[0].id;
    let editingState = null; // null | { tabId: string, index: number|null, item: Object }

    // Open blank modal shell first
    openModal('<div id="ac-generic-options-container"></div>');

    function render() {
        const container = document.getElementById('ac-detail-body');
        if (!container) return;

        if (editingState) {
            renderEditForm(container);
        } else {
            renderOverview(container);
        }
    }

    function renderOverview(container) {
        const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
        const currentItems = drafts[activeTab.id] || [];

        container.innerHTML = `
            <div class="ac-options-modal">
                <div class="ac-options-header">
                    <h3>${esc(title)}</h3>
                    <p>${esc(subtitle)}</p>
                </div>

                ${tabs.length > 1 ? `
                    <div class="ac-options-nav">
                        ${tabs.map(t => `
                            <button type="button" class="ac-options-tab-btn ${t.id === activeTabId ? 'active' : ''}" data-tab="${t.id}">
                                ${esc(t.label)} (${(drafts[t.id] || []).length})
                            </button>
                        `).join('')}
                    </div>
                ` : ''}

                <div class="ac-options-toolbar">
                    <button type="button" id="opt-btn-add-item" class="ac-btn-admin ac-btn-primary">
                        ${esc(activeTab.addLabel || `+ Add ${activeTab.label.replace(/s$/, '')}`)}
                    </button>
                </div>

                <div class="ac-options-table-wrapper">
                    <table class="ac-options-table">
                        <thead>
                            <tr>
                                ${activeTab.columns.map(col => `
                                    <th style="${col.width ? `width: ${col.width};` : ''}">${esc(col.label)}</th>
                                `).join('')}
                                <th style="width: 110px; text-align: right;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${currentItems.length === 0 ? `
                                <tr>
                                    <td colspan="${activeTab.columns.length + 1}" style="text-align: center; color: var(--color-text-secondary); padding: 1.5rem;">
                                        No items defined yet. Click "Add" above to create one.
                                    </td>
                                </tr>
                            ` : currentItems.map((item, idx) => `
                                <tr>
                                    ${activeTab.columns.map(col => {
                                        const rawVal = item[col.key];
                                        if (col.code) {
                                            return `<td><code>${esc(String(rawVal ?? ''))}</code></td>`;
                                        }
                                        if (col.snippet) {
                                            return `<td style="max-width: 250px; font-size: 0.8rem; color: var(--color-text-secondary);">${formatSnippet(rawVal, col.snippet)}</td>`;
                                        }
                                        return `<td><strong>${esc(String(rawVal ?? ''))}</strong></td>`;
                                    }).join('')}
                                    <td class="ac-cell-actions">
                                        <button type="button" class="ac-btn-icon opt-item-edit" data-idx="${idx}" title="Edit Item">✏️ Edit</button>
                                        <button type="button" class="ac-btn-icon delete opt-item-delete" data-idx="${idx}" title="Delete Item">🗑️</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="ac-form-actions" style="margin-top: 0.75rem;">
                    <button type="button" id="opt-btn-close-modal" class="ac-btn-admin ac-btn-secondary">Close</button>
                    <button type="button" id="opt-btn-save-changes" class="ac-btn-admin ac-btn-primary">💾 Save Changes</button>
                </div>
            </div>
        `;

        // Switch tab
        container.querySelectorAll('.ac-options-tab-btn').forEach(btn => {
            btn.onclick = () => {
                activeTabId = btn.dataset.tab;
                render();
            };
        });

        // Add item
        container.querySelector('#opt-btn-add-item')?.addEventListener('click', () => {
            const newItem = {};
            activeTab.fields.forEach(f => {
                if (f.key === 'display_order') {
                    const maxOrder = currentItems.reduce((max, it) => Math.max(max, Number(it.display_order) || 0), 0);
                    newItem[f.key] = maxOrder + 1;
                } else {
                    newItem[f.key] = f.defaultValue ?? '';
                }
            });
            editingState = {
                tabId: activeTab.id,
                index: null,
                item: newItem
            };
            render();
        });

        // Edit item
        container.querySelectorAll('.opt-item-edit').forEach(btn => {
            btn.onclick = () => {
                const idx = parseInt(btn.dataset.idx, 10);
                editingState = {
                    tabId: activeTab.id,
                    index: idx,
                    item: { ...currentItems[idx] }
                };
                render();
            };
        });

        // Delete item
        container.querySelectorAll('.opt-item-delete').forEach(btn => {
            btn.onclick = () => {
                const idx = parseInt(btn.dataset.idx, 10);
                const item = currentItems[idx];
                const displayName = item.name || item.label || item.id || `Item #${idx + 1}`;
                if (confirm(`Are you sure you want to delete "${displayName}"?`)) {
                    currentItems.splice(idx, 1);
                    render();
                }
            };
        });

        // Close
        container.querySelector('#opt-btn-close-modal')?.addEventListener('click', () => {
            closeModal();
        });

        // Save All Changes
        container.querySelector('#opt-btn-save-changes')?.addEventListener('click', async () => {
            const saveBtn = container.querySelector('#opt-btn-save-changes');
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.textContent = 'Saving Changes...';
            }

            try {
                // Ensure display order sorting where applicable
                Object.keys(drafts).forEach(k => {
                    if (drafts[k].length > 0 && typeof drafts[k][0].display_order !== 'undefined') {
                        drafts[k].sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0));
                    }
                });

                if (typeof onSave === 'function') {
                    const success = await onSave(drafts);
                    if (success === false) {
                        if (saveBtn) {
                            saveBtn.disabled = false;
                            saveBtn.textContent = '💾 Save Changes';
                        }
                        return;
                    }
                }

                closeModal();
                showToast('Options and categories updated successfully!');
            } catch (err) {
                console.error('Error saving options:', err);
                showToast(`Failed to save options: ${err.message || 'Unknown error'}`, true);
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.textContent = '💾 Save Changes';
                }
            }
        });
    }

    function renderEditForm(container) {
        const activeTab = tabs.find(t => t.id === editingState.tabId);
        const isNew = editingState.index === null;
        const item = editingState.item;

        container.innerHTML = `
            <div class="ac-options-modal">
                <div class="ac-options-header">
                    <h3>${isNew ? `+ Add New ${activeTab.label.replace(/s$/, '')}` : `Edit: ${esc(item.name || item.label || 'Item')}`}</h3>
                    <p>Provide values below and click "Keep Item" to apply to your draft.</p>
                </div>

                <form id="ac-opt-edit-form" class="ac-edit-form">
                    ${activeTab.fields.map(f => {
                        const val = item[f.key] ?? '';
                        if (f.type === 'textarea') {
                            return `
                                <div class="ac-form-group">
                                    <label for="fld-${f.key}">${esc(f.label)}${f.required ? ' *' : ''}</label>
                                    <textarea id="fld-${f.key}" rows="3" class="ac-form-textarea" placeholder="${esc(f.placeholder || '')}">${esc(String(val))}</textarea>
                                    ${f.helpText ? `<small class="ac-form-help">${f.helpText}</small>` : ''}
                                </div>
                            `;
                        }
                        return `
                            <div class="ac-form-group">
                                <label for="fld-${f.key}">${esc(f.label)}${f.required ? ' *' : ''}</label>
                                <input type="${f.type === 'number' ? 'number' : 'text'}" id="fld-${f.key}" class="ac-form-input" ${f.required ? 'required' : ''} value="${esc(String(val))}" placeholder="${esc(f.placeholder || '')}">
                                ${f.helpText ? `<small class="ac-form-help">${f.helpText}</small>` : ''}
                            </div>
                        `;
                    }).join('')}

                    <div class="ac-form-actions" style="margin-top: 1rem;">
                        <button type="button" id="opt-btn-cancel-edit" class="ac-btn-admin ac-btn-secondary">Cancel</button>
                        <button type="submit" class="ac-btn-admin ac-btn-primary">✓ Keep Item</button>
                    </div>
                </form>
            </div>
        `;

        container.querySelector('#opt-btn-cancel-edit')?.addEventListener('click', () => {
            editingState = null;
            render();
        });

        container.querySelector('#ac-opt-edit-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const currentItems = drafts[editingState.tabId];

            activeTab.fields.forEach(f => {
                const el = container.querySelector(`#fld-${f.key}`);
                if (!el) return;
                if (f.type === 'number') {
                    item[f.key] = parseFloat(el.value) || 0;
                } else {
                    item[f.key] = el.value.trim() || null;
                }
            });

            if (editingState.index === null) {
                currentItems.push(item);
            } else {
                currentItems[editingState.index] = item;
            }

            editingState = null;
            render();
        });
    }

    render();
}
