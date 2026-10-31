/**
 * @file monster-tags-admin.js
 * @description Monster Tags Admin Controller. Handles RLS-restricted functions for managing
 * global monster tags in the Compendium. Provides interface for Add, Edit, Delete with usage stats.
 * Requires 'Engineer' or 'Admin' Discord roles.
 */

import { supabase } from '../supabaseClient.js';
import { 
    getAllMonsterTagsWithCounts, 
    createMonsterTag, 
    updateMonsterTag, 
    deleteMonsterTag 
} from './monster-service.js';
import { escapeHTML } from './monster-utils.js';

let activeTags = [];
let pendingDeleteId = null;

const ui = {
    authGuard: document.getElementById('admin-auth-guard'),
    authFailed: document.getElementById('auth-failed-msg'),
    spinner: document.getElementById('auth-loading-spinner'),
    tableBody: document.getElementById('tags-table-body'),
    countBadge: document.getElementById('tags-count-badge'),
    alertContainer: document.getElementById('tag-alert-container'),
    formAdd: document.getElementById('form-add-tag'),
    inputNewName: document.getElementById('new-tag-name'),
    modalEdit: document.getElementById('modal-edit-tag'),
    formEdit: document.getElementById('form-edit-tag'),
    inputEditId: document.getElementById('edit-tag-id'),
    inputEditName: document.getElementById('edit-tag-name'),
    btnCancelEdit: document.getElementById('btn-cancel-edit'),
    modalDelete: document.getElementById('modal-delete-tag'),
    deleteWarningText: document.getElementById('delete-warning-text'),
    btnCancelDelete: document.getElementById('btn-cancel-delete'),
    btnConfirmDelete: document.getElementById('btn-confirm-delete')
};

/**
 * PAGE AUTHORIZATION HOOK
 * Called by auth-header.html logic once Supabase session is established.
 * Verifies if the user has 'Engineer' or 'Admin' roles.
 * @param {Object} user - The Supabase user object.
 */
window.handlePageAuth = async (user) => {
    if (!user) {
        if (ui.authFailed) ui.authFailed.classList.remove('hidden');
        if (ui.spinner) ui.spinner.classList.add('hidden');
        return;
    }

    try {
        const { data, error } = await supabase
            .from('discord_users')
            .select('roles')
            .eq('user_id', user.id)
            .single();

        if (error || !data) throw new Error("Could not verify permissions");

        const roles = data.roles || [];
        const isAuthorized = roles.some(r => ['Engineer', 'Admin'].includes(r));

        if (isAuthorized) {
            if (ui.authGuard) ui.authGuard.classList.add('hidden');
            initDashboard();
        } else {
            if (ui.authFailed) ui.authFailed.classList.remove('hidden');
            if (ui.spinner) ui.spinner.classList.add('hidden');
        }
    } catch (e) {
        console.error("Auth Error:", e);
        if (ui.authFailed) {
            ui.authFailed.classList.remove('hidden');
            ui.authFailed.textContent = "Error verifying roles. Please try again.";
        }
    }
};

/**
 * Initializes listeners and loads initial tag data.
 */
export async function initDashboard() {
    setupEventListeners();
    await loadTags();
}

/**
 * Binds UI event listeners.
 */
function setupEventListeners() {
    if (ui.formAdd) {
        ui.formAdd.addEventListener('submit', handleAddTag);
    }

    if (ui.formEdit) {
        ui.formEdit.addEventListener('submit', handleSaveEdit);
    }

    if (ui.btnCancelEdit) {
        ui.btnCancelEdit.addEventListener('click', () => {
            if (ui.modalEdit?.close) ui.modalEdit.close();
        });
    }

    if (ui.btnCancelDelete) {
        ui.btnCancelDelete.addEventListener('click', () => {
            pendingDeleteId = null;
            if (ui.modalDelete?.close) ui.modalDelete.close();
        });
    }

    if (ui.btnConfirmDelete) {
        ui.btnConfirmDelete.addEventListener('click', handleConfirmDelete);
    }
}

/**
 * Displays an alert banner.
 * @param {string} message 
 * @param {'success'|'danger'|'info'} [type='danger'] 
 */
export function showAlert(message, type = 'danger') {
    if (!ui.alertContainer) return;
    const bg = type === 'success' ? 'var(--palette-alert-success-bg-light, #dff0d8)' : 'var(--palette-alert-danger-bg-light, #f2dede)';
    const color = type === 'success' ? 'var(--palette-alert-success-text, #3c763d)' : 'var(--palette-alert-danger-text, #a94442)';
    const border = type === 'success' ? 'var(--palette-alert-success-border, #d6e9c6)' : 'var(--palette-alert-danger-border, #ebccd1)';

    ui.alertContainer.innerHTML = `
        <div class="alert" style="padding: 1rem; margin-bottom: 1.5rem; border-radius: 4px; background: ${bg}; color: ${color}; border: 1px solid ${border}; display: flex; justify-content: space-between; align-items: center;">
            <span>${escapeHTML(message)}</span>
            <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: inherit;">&times;</button>
        </div>
    `;
}

/**
 * Fetches and renders all active tags.
 */
export async function loadTags() {
    try {
        if (ui.countBadge) ui.countBadge.textContent = 'Loading tags...';
        activeTags = await getAllMonsterTagsWithCounts();
        renderTable();
    } catch (err) {
        console.error("Failed to load tags:", err);
        showAlert("Failed to load tags: " + err.message);
    }
}

/**
 * Renders the table of tags.
 */
export function renderTable() {
    if (!ui.tableBody) return;

    if (ui.countBadge) {
        ui.countBadge.textContent = `${activeTags.length} tag${activeTags.length === 1 ? '' : 's'} configured`;
    }

    if (activeTags.length === 0) {
        ui.tableBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 2rem; color: var(--color-text-secondary); font-style: italic;">
                    No monster tags found. Use the form above to add your first tag.
                </td>
            </tr>
        `;
        return;
    }

    ui.tableBody.innerHTML = activeTags.map(tag => {
        const createdDate = tag.created_at ? new Date(tag.created_at).toLocaleDateString() : '—';
        const usageCount = tag.monster_count || 0;
        return `
            <tr style="border-bottom: 1px solid var(--color-border);">
                <td style="padding: 0.75rem; font-weight: 600; color: var(--color-primary);">
                    ${escapeHTML(tag.name)}
                </td>
                <td style="padding: 0.75rem; text-align: center;">
                    <span style="display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.85rem; font-weight: bold; background: var(--color-bg-medium); border: 1px solid var(--color-border);">
                        ${usageCount}
                    </span>
                </td>
                <td style="padding: 0.75rem; color: var(--color-text-secondary); font-size: 0.9rem;">
                    ${createdDate}
                </td>
                <td style="padding: 0.75rem; text-align: right;">
                    <button type="button" class="btn-edit-tag" data-id="${escapeHTML(tag.id)}" style="background: none; border: 1px solid var(--color-border); padding: 0.3rem 0.6rem; border-radius: 4px; cursor: pointer; color: var(--color-primary); margin-right: 0.4rem; font-size: 0.85rem;">
                        ✏️ Edit
                    </button>
                    <button type="button" class="btn-delete-tag" data-id="${escapeHTML(tag.id)}" style="background: none; border: 1px solid var(--palette-alert-danger-action, #d9534f); padding: 0.3rem 0.6rem; border-radius: 4px; cursor: pointer; color: var(--palette-alert-danger-action, #d9534f); font-size: 0.85rem;">
                        🗑️ Delete
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    // Attach row action listeners
    ui.tableBody.querySelectorAll('.btn-edit-tag').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const tag = activeTags.find(t => t.id === id);
            if (tag) openEditModal(tag);
        });
    });

    ui.tableBody.querySelectorAll('.btn-delete-tag').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const tag = activeTags.find(t => t.id === id);
            if (tag) openDeleteModal(tag);
        });
    });
}

/**
 * Handles adding a new tag.
 * @param {Event} e 
 */
async function handleAddTag(e) {
    e.preventDefault();
    const name = ui.inputNewName?.value?.trim();
    if (!name) return;

    try {
        await createMonsterTag(name);
        ui.inputNewName.value = '';
        showAlert(`Tag "${name}" added successfully.`, 'success');
        await loadTags();
    } catch (err) {
        console.error("Add Tag Error:", err);
        showAlert(err.message, 'danger');
    }
}

/**
 * Opens the edit dialog.
 * @param {Object} tag 
 */
function openEditModal(tag) {
    if (!ui.modalEdit) return;
    ui.inputEditId.value = tag.id;
    ui.inputEditName.value = tag.name;
    if (ui.modalEdit.showModal) {
        ui.modalEdit.showModal();
    } else {
        ui.modalEdit.setAttribute('open', '');
    }
}

/**
 * Handles saving tag edits.
 * @param {Event} e 
 */
async function handleSaveEdit(e) {
    e.preventDefault();
    const id = ui.inputEditId?.value;
    const newName = ui.inputEditName?.value?.trim();
    if (!id || !newName) return;

    try {
        await updateMonsterTag(id, newName);
        if (ui.modalEdit?.close) ui.modalEdit.close();
        showAlert(`Tag renamed to "${newName}".`, 'success');
        await loadTags();
    } catch (err) {
        console.error("Edit Tag Error:", err);
        showAlert(err.message, 'danger');
    }
}

/**
 * Opens delete confirmation dialog with usage warnings.
 * @param {Object} tag 
 */
function openDeleteModal(tag) {
    if (!ui.modalDelete) return;
    pendingDeleteId = tag.id;
    const usage = tag.monster_count || 0;

    if (usage > 0) {
        ui.deleteWarningText.innerHTML = `
            Are you sure you want to delete tag <strong>"${escapeHTML(tag.name)}"</strong>?<br><br>
            <span style="color: var(--palette-alert-danger-action, #d9534f); font-weight: bold;">
                ⚠️ Warning: This tag is currently linked to ${usage} monster${usage === 1 ? '' : 's'}. Deleting it will unlink it from all monsters.
            </span>
        `;
    } else {
        ui.deleteWarningText.innerHTML = `
            Are you sure you want to delete tag <strong>"${escapeHTML(tag.name)}"</strong>?
        `;
    }

    if (ui.modalDelete.showModal) {
        ui.modalDelete.showModal();
    } else {
        ui.modalDelete.setAttribute('open', '');
    }
}

/**
 * Executes tag deletion.
 */
async function handleConfirmDelete() {
    if (!pendingDeleteId) return;

    try {
        await deleteMonsterTag(pendingDeleteId);
        pendingDeleteId = null;
        if (ui.modalDelete?.close) ui.modalDelete.close();
        showAlert('Tag deleted successfully.', 'success');
        await loadTags();
    } catch (err) {
        console.error("Delete Tag Error:", err);
        showAlert(err.message, 'danger');
    }
}
