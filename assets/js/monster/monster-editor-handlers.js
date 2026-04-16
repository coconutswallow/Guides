/**
 * monster-editor-handlers.js
 * Event listeners and button action handlers for the Monster Editor.
 * Location: \assets\js\monster\monster-editor-handlers.js
 * 
 * https://github.com/hawthorneguild/HawthorneTeams/issues/7
 */

import { supabase } from '../supabaseClient.js';
import { logError } from '../error-logger.js';
import {
    saveMonsterDraft,
    submitMonsterForApproval,
    isSlugUnique,
    createNewVersion
} from './monster-service.js';
import { renderMonsterStatblock } from './views/monster-detail.js';
import { calculatePB, calculateXP } from './monster-utils.js';
import { renderFeatureList } from './monster-editor-ui.js';
import {
    syncMonsterFromForm,
    validateMonster,
    resetAutoSave,
    clearLocalCache
} from './monster-editor-state.js';

let activeVisibilityHandler = null;

function ensurePreviewModalElements() {
    let modal = document.getElementById('preview-modal');
    let target = document.getElementById('preview-target');

    if (modal && target) return { modal, target };

    modal = document.createElement('div');
    modal.id = 'preview-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal" id="preview-close" aria-label="Close preview">&times;</span>
            <div id="preview-target"></div>
        </div>
    `;
    document.body.appendChild(modal);

    target = modal.querySelector('#preview-target');
    const closeBtn = modal.querySelector('#preview-close');

    closeBtn?.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    return { modal, target };
}

/**
 * Attaches all event listeners for the editor form.
 * @param {HTMLElement} container - The main editor container.
 * @param {Object} currentMonster - The monster object being edited.
 * @param {Object} lookups - Lookup data.
 */
export function attachEditorEvents(container, currentMonster, lookups) {
    const form = container.querySelector('#monster-form');
    if (!form) return;

    // 0. Tab Visibility Autosave — Deduplicate to prevent multiple listeners
    if (activeVisibilityHandler) {
        document.removeEventListener('visibilitychange', activeVisibilityHandler);
    }
    activeVisibilityHandler = () => {
        if (document.visibilityState === 'hidden') {
            console.log('[MonsterEditor] Page hidden, triggering emergency auto-save.');
            handleSave(currentMonster, true);
        }
    };
    document.addEventListener('visibilitychange', activeVisibilityHandler);
    
    container.dataset.visibilityHandler = 'true';

    // 1. Name -> Slug Auto-gen
    const nameInput = container.querySelector('input[name="name"]');
    const slugInput = container.querySelector('input[name="slug"]');
    nameInput?.addEventListener('input', () => {
        const slug = nameInput.value.toLowerCase()
            .trim()
            .replace(/['’]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        slugInput.value = slug;

        if (slug && slug !== currentMonster.slug) {
            checkSlugUniqueness(slug, currentMonster, slugInput);
        }
    });

    // 1.5. HP & Combat Stat Calculations
    const updateCalculatedStats = () => {
        const cr = form.cr.value;
        const pb = calculatePB(cr);

        // HP
        const num = parseInt(form.hit_dice_num.value) || 0;
        const size = parseInt(form.hit_dice_size.value) || 0;
        const mod = parseInt(form.hp_modifier.value) || 0;
        const average = Math.floor(num * (size / 2 + 0.5) + mod);
        form.querySelector('#hp-average').value = `${num}d${size}${mod !== 0 ? (mod >= 0 ? '+' : '') + mod : ''} (${average})`;

        // Ability Mods & Saves
        container.querySelectorAll('.attr-score').forEach(input => {
            const attr = input.name.split('_')[1];
            const modTarget = container.querySelector(`#mod-${attr}`);
            const saveTarget = container.querySelector(`input[name="save_${attr}"]`);
            const profCheck = container.querySelector(`.save-prof[data-attr="${attr}"]`);

            const score = parseInt(input.value) || 10;
            const m = Math.floor((score - 10) / 2);

            if (modTarget) modTarget.textContent = m >= 0 ? `+${m}` : m;
            if (saveTarget && !saveTarget.dataset.manual) {
                const total = m + (profCheck.checked ? pb : 0);
                saveTarget.placeholder = total >= 0 ? `+${total}` : total;
            }
        });

        // Initiative
        const dexMod = Math.floor(((parseInt(form.ability_DEX.value) || 10) - 10) / 2);
        const initProf = form.init_prof.value;
        let totalInit = dexMod;
        if (initProf === 'Proficient') totalInit += pb;
        else if (initProf === 'Expert') totalInit += (pb * 2);
        form.querySelector('#init-preview').value = `${totalInit >= 0 ? '+' : ''}${totalInit} (${10 + totalInit})`;

        // Overviews
        form.querySelector('#pb-preview').value = `+${pb}`;
        form.querySelector('#xp-preview').value = calculateXP(cr).toLocaleString() + ' XP';
    };

    form.addEventListener('input', () => {
        updateCalculatedStats();
        resetAutoSave(currentMonster, (silent) => handleSave(currentMonster, silent));
    });

    // 2. Tab Switching
    container.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = e.currentTarget.getAttribute('data-tab');
            sessionStorage.setItem('monster_editor_active_tab', targetId);
            container.querySelectorAll('.editor-tab-pane').forEach(p => p.style.display = 'none');
            container.querySelectorAll('.tab-btn').forEach(b => {
                b.classList.remove('active');
                b.style.borderBottomColor = 'transparent';
                b.style.color = 'var(--color-text-secondary)';
                b.style.background = 'transparent';
            });
            const activeBtn = e.currentTarget;
            activeBtn.classList.add('active');
            activeBtn.style.borderBottomColor = 'var(--color-primary)';
            activeBtn.style.color = 'var(--color-primary)';
            activeBtn.style.background = 'var(--color-bg-light)';
            document.getElementById(targetId).style.display = 'block';
        });
    });

    // Initial load for tabs
    const savedTab = sessionStorage.getItem('monster_editor_active_tab');
    if (savedTab) container.querySelector(`.tab-btn[data-tab="${savedTab}"]`)?.click();

    // 3. Action Buttons
    container.querySelector('#btn-save')?.addEventListener('click', () => handleSave(currentMonster, false));
    container.querySelector('#btn-preview')?.addEventListener('click', () => handlePreview(currentMonster));
    container.querySelector('#btn-submit')?.addEventListener('click', () => handleSubmit(currentMonster));
    container.querySelector('#btn-version')?.addEventListener('click', () => handleCreateNewVersion(currentMonster));

    // 4. Feature Management (Delegated)
    form.addEventListener('click', (e) => {
        const accordionHeader = e.target.closest('.accordion-header');
        if (accordionHeader && !e.target.closest('button')) {
            const body = accordionHeader.nextElementSibling;
            const icon = accordionHeader.querySelector('.accordion-icon');
            const card = accordionHeader.closest('.feature-card');
            const index = parseInt(card?.dataset.index);
            const feat = currentMonster.features[index];

            const isOpening = body.style.display === 'none';
            body.style.display = isOpening ? 'block' : 'none';
            icon.style.transform = isOpening ? 'rotate(0deg)' : 'rotate(-90deg)';
            
            // Persist the expansion state in the data object
            if (feat) {
                feat.expanded = isOpening;
            }
            return;
        }

        if (e.target.classList.contains('btn-add-grouped')) {
            currentMonster.features.push({ 
                name: '', 
                type: e.target.dataset.type, 
                description: '',
                expanded: true // Default new features to OPEN
            });
            renderFeatureList(currentMonster);
            return;
        }

        const card = e.target.closest('.feature-card');
        if (!card) return;
        const index = parseInt(card.dataset.index);

        if (e.target.closest('.feat-remove') && confirm('Remove this feature?')) {
            currentMonster.features.splice(index, 1);
            renderFeatureList(currentMonster);
        }

        // Reordering logic
        if (e.target.closest('.feat-up') || e.target.closest('.feat-down')) {
            const dir = e.target.closest('.feat-up') ? -1 : 1;
            const swapIdx = findSiblingFeature(currentMonster, index, dir);
            if (swapIdx !== null) {
                [currentMonster.features[index], currentMonster.features[swapIdx]] = [currentMonster.features[swapIdx], currentMonster.features[index]];
                renderFeatureList(currentMonster);
            }
        }
    });

    // Sub-sync for features
    form.addEventListener('input', e => {
        const card = e.target.closest('.feature-card');
        if (!card) return;
        const feat = currentMonster.features[parseInt(card.dataset.index)];
        if (!feat) return;
        if (e.target.classList.contains('feat-type')) feat.type = e.target.value;
        if (e.target.classList.contains('feat-name')) feat.name = e.target.value;
        if (e.target.classList.contains('md-textarea')) feat.description = e.target.value;
    });

    updateCalculatedStats();
}

/**
 * Handles the save action (manual or auto).
 * @param {Object} currentMonster - Monster data.
 * @param {boolean} silent - Use true for auto-saves to suppress UI feedback.
 */
export async function handleSave(currentMonster, silent = false) {
    const statusDiv = document.getElementById('save-status');
    if (!statusDiv || ['Pending', 'Queued', 'Approved', 'Archived'].includes(currentMonster?.status)) return;

    if (!silent) statusDiv.textContent = 'Saving...';
    syncMonsterFromForm(document.getElementById('monster-form'), currentMonster);

    const errors = validateMonster(currentMonster);
    if (errors.length > 0) {
        if (!silent) alert('Cannot save:\n- ' + errors.join('\n- '));
        return;
    }

    try {
        // Record current expansion states before save overwrites the features array
        const expansionStates = currentMonster.features.map(f => f.expanded);

        const saved = await saveMonsterDraft(currentMonster, currentMonster.features);
        currentMonster.row_id = saved.row_id;
        
        if (saved.features) {
            // Restore expanded state flags to the new objects from the server
            currentMonster.features = saved.features.map((f, i) => ({
                ...f,
                expanded: expansionStates[i] || false
            }));
        }

        // Success: Clear local cache for this monster as DB is now source of truth
        clearLocalCache(currentMonster.slug);

        statusDiv.textContent = `${silent ? 'Auto-sync' : 'Saved'} • ${new Date().toLocaleTimeString()}`;
        
        // ONLY change the hash if it's a manual save (silent = false)
        // This prevents the router from re-rendering and losing focus during auto-saves.
        if (!silent && window.location.hash === '#/new') {
            window.location.hash = `#/edit/${saved.slug}`;
        }
    } catch (err) {
        logError('monster-editor', `Save error: ${err.message}`);
        if (!silent) statusDiv.textContent = 'Error saving!';
    }
}

/**
 * Shows the statblock preview modal.
 * @param {Object} currentMonster - Monster data.
 */
export async function handlePreview(currentMonster) {
    try {
        syncMonsterFromForm(document.getElementById('monster-form'), currentMonster);
        const { modal, target } = ensurePreviewModalElements();

        modal.style.display = 'block';
        target.innerHTML = `
            <div class="monster-page" style="padding: 3rem;">
                <div class="page page-wide">
                    <div class="monster-view-header" style="margin-bottom: 2rem;">
                        <span class="btn" style="background: var(--color-primary); color: white; cursor: not-allowed; opacity: 0.8;">&larr; BACK</span>
                        <h1 style="margin: 0; font-family: var(--font-header); color: var(--color-primary); font-size: 2.5rem; text-transform: uppercase;">${currentMonster.name || 'Unnamed Monster'}</h1>
                    </div>
                    <div id="preview-render-inner"></div>
                </div>
            </div>`;
        renderMonsterStatblock(target.querySelector('#preview-render-inner'), currentMonster);
    } catch (err) {
        alert('Preview failed: ' + err.message);
    }
}

/**
 * Submits the monster for approval.
 * @param {Object} currentMonster - Monster data.
 */
export async function handleSubmit(currentMonster) {
    if (!confirm('Submit for staff approval? You will not be able to edit it until it is reviewed.')) return;
    try {
        await handleSave(currentMonster, false);
        await submitMonsterForApproval(currentMonster.row_id);
        alert('Submitted successfully!');
        window.location.hash = '#/';
    } catch (err) {
        alert('Submission failed: ' + err.message);
    }
}

/**
 * Creates a new version of an approved monster.
 * @param {Object} currentMonster - Monster data.
 */
async function handleCreateNewVersion(currentMonster) {
    if (!confirm('Create a new editable version? The live version remains unchanged.')) return;
    try {
        const newSlug = await createNewVersion(currentMonster.row_id);
        window.location.hash = `#/edit/${newSlug}`;
    } catch (err) {
        alert('Failed to version: ' + err.message);
    }
}

// Utility for finding sibling features during reordering
function findSiblingFeature(m, currIndex, direction) {
    const buckets = { 'Trait': 'traits', 'Action': 'actions', 'Bonus Action': 'actions', 'Reaction': 'actions', 'Legendary Action': 'actions', 'Lair Action': 'lair', 'Regional Effect': 'regional' };
    const bucket = buckets[m.features[currIndex].type];
    let i = currIndex + direction;
    while (i >= 0 && i < m.features.length) {
        if (buckets[m.features[i].type] === bucket) return i;
        i += direction;
    }
    return null;
}

/**
 * Checks if a slug is already taken and updates UI validation state.
 * @param {string} slug - The slug to check.
 * @param {Object} currentMonster - The current monster record.
 * @param {HTMLInputElement} input - The slug input element.
 * @returns {Promise<void>}
 */
async function checkSlugUniqueness(slug, currentMonster, input) {
    const isUnique = await isSlugUnique(slug, currentMonster.row_id);
    input.classList.toggle('is-invalid', !isUnique);
    input.title = isUnique ? '' : 'Warning: Slug already in use.';
}
