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
    createNewVersion,
    deleteMonster
} from './monster-service.js';
import { renderMonsterStatblock } from './views/monster-detail.js';
import { calculatePB, calculateXP, calculateMod, formatInitiative, calculatePassivePerception, getMonsterApprovalUrl } from './monster-utils.js';
import { renderFeatureList, updateFeatureCardHeader } from './monster-editor-ui.js';
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

    // Editable Species combo box. The options are supplied by the existing
    // lookups record (type = "monster", data.species); the input remains free
    // text so authors can still enter a custom species.
    const speciesInput = form.querySelector('input[name="species"]');
    const speciesToggle = form.querySelector('#species-toggle');
    const speciesOptions = form.querySelector('#species-options');
    const setSpeciesOptionsOpen = (isOpen) => {
        if (!speciesOptions) return;
        speciesOptions.hidden = !isOpen;
        speciesInput?.setAttribute('aria-expanded', String(isOpen));
        speciesToggle?.setAttribute('aria-expanded', String(isOpen));
    };

    const filterSpeciesOptions = () => {
        const filter = speciesInput?.value.trim().toLocaleLowerCase() || '';
        speciesOptions?.querySelectorAll('.species-option').forEach(option => {
            option.hidden = Boolean(filter) && !option.dataset.value.toLocaleLowerCase().includes(filter);
        });
    };

    speciesInput?.addEventListener('focus', () => {
        filterSpeciesOptions();
        setSpeciesOptionsOpen(true);
    });
    speciesInput?.addEventListener('input', () => {
        filterSpeciesOptions();
        setSpeciesOptionsOpen(true);
    });
    speciesToggle?.addEventListener('click', () => {
        const isOpening = speciesOptions?.hidden;
        filterSpeciesOptions();
        setSpeciesOptionsOpen(isOpening);
        if (isOpening) speciesInput?.focus();
    });
    speciesOptions?.addEventListener('click', (event) => {
        const option = event.target.closest('.species-option');
        if (!option || !speciesInput) return;
        speciesInput.value = option.dataset.value;
        speciesInput.dispatchEvent(new Event('input', { bubbles: true }));
        setSpeciesOptionsOpen(false);
    });

    if (container._speciesComboOutsideHandler) {
        document.removeEventListener('pointerdown', container._speciesComboOutsideHandler);
    }
    container._speciesComboOutsideHandler = (event) => {
        if (!container.contains(event.target)) setSpeciesOptionsOpen(false);
    };
    document.addEventListener('pointerdown', container._speciesComboOutsideHandler);

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

    // 0.5. Prevent accidental navigation loss
    window.onbeforeunload = (e) => {
        const statusDiv = document.getElementById('save-status');
        // If the status div shows "Saving...", "Error", or is empty (unsaved), warn the user
        if (statusDiv && (statusDiv.textContent.includes('Saving') || statusDiv.textContent === '')) {
            e.preventDefault();
            e.returnValue = '';
        }
    };
    
    container.dataset.visibilityHandler = 'true';

    // 1. Name -> Slug Auto-gen
    const nameInput = container.querySelector('input[name="name"]');
    const slugInput = container.querySelector('input[name="slug"]');

    // Handle manual overrides for auto-calculated fields
    form.querySelectorAll('.save-override, input[name="hp_modifier"]').forEach(input => {
        if (input.value !== '') {
            input.dataset.manual = 'true';
        }
        input.addEventListener('input', () => {
            if (input.value !== '') {
                input.dataset.manual = 'true';
            } else {
                delete input.dataset.manual;
                updateCalculatedStats(); 
            }
        });
    });

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
        const cr = form.elements['cr']?.value || '0';
        const pb = calculatePB(cr);

        // Ability Mods & Saves
        let dexScore = 10;
        let wisScore = 10;
        let conMod = 0;
        container.querySelectorAll('.attr-score').forEach(input => {
            const attr = input.name.split('_')[1];
            const modTarget = container.querySelector(`#mod-${attr}`);
            const saveTarget = container.querySelector(`input[name="save_${attr}"]`);
            const profCheck = container.querySelector(`.save-prof[data-attr="${attr}"]`);

            const score = parseInt(input.value) || 10;
            if (attr === 'DEX') dexScore = score;
            if (attr === 'WIS') wisScore = score;
            const m = calculateMod(score);
            if (attr === 'CON') conMod = m;

            if (modTarget) modTarget.textContent = m >= 0 ? `+${m}` : m;
            if (saveTarget && !saveTarget.dataset.manual) {
                const total = m + (profCheck && profCheck.checked ? pb : 0);
                saveTarget.placeholder = total >= 0 ? `+${total}` : total;
            }
        });

        // HP
        const num = parseInt(form.elements['hit_dice_num']?.value) || 0;
        const size = parseInt(form.elements['hit_dice_size']?.value) || 0;
        const hpModInput = form.elements['hp_modifier'];
        
        if (hpModInput && !hpModInput.dataset.manual) {
            hpModInput.value = conMod * num;
        }
        
        const mod = parseInt(hpModInput?.value) || 0;
        const average = Math.floor(num * (size / 2 + 0.5) + mod);
        const hpPreview = form.querySelector('#hp-average');
        if (hpPreview) {
            hpPreview.value = `${num}d${size}${mod !== 0 ? (mod >= 0 ? '+' : '') + mod : ''} (${average})`;
        }

        // Initiative
        const initProf = form.elements['init_prof']?.value || 'None';
        const initPreview = form.querySelector('#init-preview');
        if (initPreview) {
            initPreview.value = formatInitiative(dexScore, initProf, pb);
        }

        // Passive Perception
        const passivePercProf = form.elements['passive_perc_prof']?.value || 'None';
        const passivePercPreview = form.querySelector('#passive-perc-preview');
        if (passivePercPreview) {
            passivePercPreview.value = calculatePassivePerception(wisScore, passivePercProf, pb);
        }

        // Overviews
        const pbPreview = form.querySelector('#pb-preview');
        if (pbPreview) pbPreview.value = `+${pb}`;
        
        const xpPreview = form.querySelector('#xp-preview');
        if (xpPreview) xpPreview.value = calculateXP(cr).toLocaleString() + ' XP';
    };

    const handleFormUpdate = () => {
        updateCalculatedStats();
        // Keep the in-memory object current before resetAutoSave writes its
        // immediate localStorage recovery copy.
        syncMonsterFromForm(form, currentMonster);
        resetAutoSave(currentMonster, (silent) => handleSave(currentMonster, silent));
    };

    form.addEventListener('input', handleFormUpdate);
    form.addEventListener('change', handleFormUpdate);

    // Run initial calculation
    updateCalculatedStats();

    // 2. Tab Switching
    container.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = e.currentTarget.getAttribute('data-tab');
            
            // Sync and Auto-save before switching views to ensure no data loss
            handleSave(currentMonster, true);

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
    container.querySelector('#btn-delete-draft')?.addEventListener('click', () => handleDeleteDraft(currentMonster));

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
            
            // Persist the expansion state in the data object and refresh header
            if (feat) {
                feat.expanded = isOpening;
                updateFeatureCardHeader(card, feat);
            }
            return;
        }

        if (e.target.classList.contains('btn-add-grouped')) {
            syncMonsterFromForm(form, currentMonster);
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
            syncMonsterFromForm(form, currentMonster);
            currentMonster.features.splice(index, 1);
            renderFeatureList(currentMonster);
        }

        // Reordering logic
        if (e.target.closest('.feat-up') || e.target.closest('.feat-down')) {
            syncMonsterFromForm(form, currentMonster);
            const dir = e.target.closest('.feat-up') ? -1 : 1;
            const swapIdx = findSiblingFeature(currentMonster, index, dir);
            if (swapIdx !== null) {
                [currentMonster.features[index], currentMonster.features[swapIdx]] = [currentMonster.features[swapIdx], currentMonster.features[index]];
                renderFeatureList(currentMonster);
            }
        }
    });

    // Sub-sync for features and live header updates
    const handleFeatureSync = (e) => {
        const card = e.target.closest('.feature-card');
        if (!card) return;
        const feat = currentMonster.features?.[parseInt(card.dataset.index)];
        if (!feat) return;

        if (e.target.classList.contains('feat-type')) {
            feat.type = e.target.value;
            // Check if feature type moved between buckets (Actions vs non-Actions)
            const hideType = card.dataset.hideType === 'true';
            const isActionType = ['action', 'bonus action', 'reaction'].includes((feat.type || '').toLowerCase());
            if ((!hideType && !isActionType) || (hideType && isActionType)) {
                syncMonsterFromForm(form, currentMonster);
                renderFeatureList(currentMonster);
                return;
            }
            updateFeatureCardHeader(card, feat);
        }
        if (e.target.classList.contains('feat-name')) {
            feat.name = e.target.value;
            updateFeatureCardHeader(card, feat);
        }
        if (e.target.classList.contains('md-textarea')) {
            feat.description = e.target.value;
        }
    };

    form.addEventListener('input', handleFeatureSync);
    form.addEventListener('change', handleFeatureSync);

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
    const form = document.getElementById('monster-form');
    syncMonsterFromForm(form, currentMonster);
    form?.querySelectorAll('.feature-card').forEach(card => {
        const index = parseInt(card.dataset.index);
        const feat = currentMonster.features?.[index];
        if (feat) updateFeatureCardHeader(card, feat);
    });

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

        statusDiv.textContent = silent ? 'Auto-sync complete' : `Saved • ${new Date().toLocaleTimeString()}`;
        
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
        currentMonster.status = 'Pending';
        showSubmissionSuccessModal(currentMonster);
    } catch (err) {
        alert('Submission failed: ' + err.message);
    }
}

/**
 * Displays a modal confirming submission and providing a copyable direct link for staff approvers.
 * 
 * Developer Notes:
 * - We dynamically create and append the modal to document.body rather than keeping hidden DOM nodes.
 * - This ensures clean separation of concerns and prevents stale event listeners across submissions.
 * - The modal offers 1-click clipboard copying with a fallback for older browsers.
 * 
 * @param {Object} monster - The monster data.
 */
export function showSubmissionSuccessModal(monster) {
    // 1. Remove any pre-existing modal instance to prevent duplicate elements in DOM
    let modal = document.getElementById('submission-success-modal');
    if (modal) modal.remove();

    // 2. Generate the direct URL pointing to the approvals queue with this monster's slug
    const approvalUrl = getMonsterApprovalUrl(monster.slug);

    // 3. Create the modal container element with backdrop styling
    modal = document.createElement('div');
    modal.id = 'submission-success-modal';
    modal.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.75);
        z-index: 3000;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(4px);
    `;

    modal.innerHTML = `
        <div class="modal-card" style="background: var(--color-bg-page, #fff); color: var(--color-text, #333); max-width: 560px; width: 92%; border-radius: 8px; border: 2px solid var(--color-primary); box-shadow: 0 10px 30px rgba(0,0,0,0.5); padding: 2rem; position: relative;">
            <button type="button" class="close-submission-modal" aria-label="Close modal" style="position: absolute; top: 1rem; right: 1rem; background: none; border: none; font-size: 1.8rem; line-height: 1; cursor: pointer; color: var(--color-text-secondary);">&times;</button>
            <h3 style="margin-top: 0; margin-bottom: 0.5rem; color: var(--color-primary); font-family: 'Marcellus SC', serif; font-size: 1.6rem; text-transform: uppercase;">Monster Submitted!</h3>
            <p style="margin-bottom: 1.5rem; font-size: 1.05rem;">
                <strong>${monster.name || 'Your monster'}</strong> has been submitted to the staff moderation queue.
            </p>
            <div style="background: var(--color-bg-medium, #f4f4f4); padding: 1.2rem; border-radius: 6px; border: 1px solid var(--color-border); margin-bottom: 1.5rem;">
                <label style="display: block; font-weight: bold; margin-bottom: 0.5rem; font-family: 'Marcellus SC', serif; color: var(--color-primary); font-size: 0.95rem;">
                    Approver Direct Link (Shortcut)
                </label>
                <div style="display: flex; gap: 0.5rem;">
                    <input type="text" id="submission-approval-link-input" readonly value="${approvalUrl}" class="form-control" style="font-size: 0.9rem; padding: 0.5rem; width: 100%; cursor: text; background: var(--color-bg-page); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 4px;" />
                    <button type="button" id="btn-copy-approval-link" class="btn btn-primary" style="white-space: nowrap; font-size: 0.85rem; padding: 0.5rem 1rem;">Copy Link</button>
                </div>
                <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-top: 0.6rem; margin-bottom: 0;">
                    Share this link with staff to jump directly to this monster in the approval queue. Reviewers will still authenticate before reviewing.
                </p>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 0.5rem;">
                <button type="button" class="btn btn-secondary close-submission-modal" style="padding: 0.6rem 1.2rem;">Return to My Monsters</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const input = modal.querySelector('#submission-approval-link-input');
    const copyBtn = modal.querySelector('#btn-copy-approval-link');

    // Automatically select the text when the user clicks or focuses the input for easy manual copying
    input?.addEventListener('focus', () => input.select());

    // 4. Clipboard copy action with visual feedback and fallback
    copyBtn?.addEventListener('click', async () => {
        try {
            // Modern asynchronous Clipboard API
            await navigator.clipboard.writeText(approvalUrl);
            copyBtn.textContent = 'Copied!';
            copyBtn.style.background = 'var(--palette-role-full-dm, #27ae60)';
            setTimeout(() => {
                copyBtn.textContent = 'Copy Link';
                copyBtn.style.background = '';
            }, 2000);
        } catch (err) {
            // Fallback for non-HTTPS or older browsers
            input?.select();
            document.execCommand('copy');
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyBtn.textContent = 'Copy Link';
            }, 2000);
        }
    });

    // 5. Clean up modal from DOM and navigate back to the Creator Dashboard (#/)
    const closeModal = () => {
        modal.remove();
        window.location.hash = '#/';
    };

    // Attach close listener to both the "X" button and the "Return to My Monsters" button
    modal.querySelectorAll('.close-submission-modal').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    // Close when clicking on the dark backdrop outside the card
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
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

/**
 * Handles the deletion of a monster draft.
 * @param {Object} currentMonster - The monster data.
 */
export async function handleDeleteDraft(currentMonster) {
    if (!currentMonster.row_id) return; // Cannot delete unsaved
    if (currentMonster.status !== 'Draft') {
        alert('Only monsters in Draft status can be deleted.');
        return;
    }

    if (!confirm(`Are you sure you want to delete "${currentMonster.name}"? This action cannot be undone.`)) return;

    try {
        await deleteMonster(currentMonster.row_id);
        clearLocalCache(currentMonster.slug);
        alert('Monster deleted.');
        window.location.hash = '#/';
    } catch (err) {
        alert('Deletion failed: ' + err.message);
    }
}

// Utility for finding sibling features during reordering
function findSiblingFeature(m, currIndex, direction) {
    const buckets = { 'Trait': 'traits', 'Action': 'actions', 'Bonus Action': 'actions', 'Reaction': 'actions', 'Legendary Action': 'legendary', 'Lair Action': 'lair', 'Regional Effect': 'regional' };
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
