/**
 * monster-approvals.js
 * Controller for the staff Approval queue.
 * Location: \assets\js\monster\monster-approvals.js
 * 
 * https://github.com/hawthorneguild/HawthorneTeams/issues/7
 */

import { supabase } from '../supabaseClient.js';
import { checkAccess } from '../auth-check.js';
import {
    getPendingMonsters,
    getQueuedMonsters,
    approveMonster,
    rejectMonster,
    addToPatchQueue,
    getMonsterBySlug
} from './monster-service.js';
import { renderMonsterStatblock } from './views/monster-detail.js';

let pendingQueue = [];
let patchQueue = [];
let currentReview = null;

/**
 * Initializes the Approval SPA.
 * Sets up the auth transition hook for the global auth provider.
 * @returns {Promise<void>}
 */
async function init() {
    /**
     * Hook for auth-header.html to call when user state is known.
     * @param {Object|null} user - The authenticated user object or null.
     */
    window.handlePageAuth = async (user) => {
        const container = document.getElementById('approvals-app');

        if (!user) {
            container.innerHTML = `
                <div class="alert alert-info" style="margin-top: 2rem;">
                    <h3>Staff Access Required</h3>
                    <p>Please login with Discord to access the moderation queue. Only Staff can approve monsters.</p>
                </div>
            `;
            return;
        }

        const hasAccess = await checkAccess(user.id, [
            'Rule Architects',
            'Rules Architects',
            'Rule Apprentice',
            'Lore Consultant',
            'Lore Apprentice',
            'Admin',
            'Engineer',
            'Monster Admin',
            'Lore',
            'Rules'
        ]);
        if (!hasAccess) {
            container.innerHTML = `
                <div class="alert alert-danger" style="margin-top: 2rem;">
                    <h3>Access Denied</h3>
                    <p>Staff Only. You do not have permission to moderate monsters.</p>
                </div>
            `;
            return;
        }

        renderQueue(container);
    };
}

/**
 * Fetches the pending and patch queues from the service and renders the dashboard.
 * @param {HTMLElement} container - The main application container.
 * @returns {Promise<void>}
 */
async function renderQueue(container) {
    container.innerHTML = '<div class="loading">Fetching queue data...</div>';

    [pendingQueue, patchQueue] = await Promise.all([
        getPendingMonsters(),
        getQueuedMonsters()
    ]);

    let html = `
        <div class="editor-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
            <div>
                <h2 style="margin: 0;">Monster Moderation</h2>
                <p style="margin: 0;">${pendingQueue.length} pending reviews | ${patchQueue.length} queued for next patch.</p>
            </div>
            <a href="/Guides/staff/" class="btn btn-outline" style="font-size: 0.85rem;">Back to Staff Portal</a>
        </div>
        <div id="queue-status-alert"></div>

        <section class="queue-section">
            <h3>Approval Queue (Pending)</h3>
            <div class="queue-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Monster</th>
                            <th>Creator</th>
                            <th>Submitted</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    if (pendingQueue.length === 0) {
        html += '<tr><td colspan="4" class="text-center">Pending queue is empty.</td></tr>';
    } else {
        pendingQueue.forEach((m, i) => {
            html += `
                <tr data-slug="${m.slug}" data-row-id="${m.row_id}">
                    <td><strong>${m.name}</strong> (CR ${m.cr})</td>
                    <td><code>${m.creator || m.creator_discord_id}</code></td>
                    <td>${new Date(m.submitted_at).toLocaleString()}</td>
                    <td>
                        <button class="btn btn-sm btn-primary btn-review" data-index="${i}">Review</button>
                    </td>
                </tr>
            `;
        });
    }

    html += `
                    </tbody>
                </table>
            </div>
        </section>

        <section class="queue-section" style="margin-top: 4rem;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h3>Patch Queue (Scheduled)</h3>
                ${patchQueue.length > 0 ? `<button id="btn-activate-queued" class="btn btn-approve btn-sm" style="width: auto;">Activate Queued Submissions</button>` : ''}
            </div>
            <div class="queue-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Monster</th>
                            <th>Creator</th>
                            <th>Queued At</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    if (patchQueue.length === 0) {
        html += '<tr><td colspan="4" class="text-center">Patch queue is empty. Use "Add to Patch Queue" during review.</td></tr>';
    } else {
        patchQueue.forEach((m, i) => {
            html += `
                <tr data-slug="${m.slug}" data-row-id="${m.row_id}">
                    <td><strong>${m.name}</strong> (CR ${m.cr})</td>
                    <td><code>${m.creator || m.creator_discord_id}</code></td>
                    <td>${new Date(m.updated_at).toLocaleString()}</td>
                    <td>
                        <button class="btn btn-sm btn-primary btn-review-patch" data-index="${i}">Review</button>
                    </td>
                </tr>
            `;
        });
    }

    html += '</tbody></table></div><div id="review-target"></div>';
    container.innerHTML = html;

    // Listeners: Pending Reviews
    container.querySelectorAll('.btn-review').forEach(btn => {
        btn.addEventListener('click', e => {
            const index = e.target.dataset.index;
            showReview(pendingQueue[index]);
        });
    });

    // Listeners: Patch Reviews (Reuse same showReview but it needs context)
    container.querySelectorAll('.btn-review-patch').forEach(btn => {
        btn.addEventListener('click', e => {
            const index = e.target.dataset.index;
            showReview(patchQueue[index]);
        });
    });

    // Batch Activation Listener
    const btnActivate = document.getElementById('btn-activate-queued');
    if (btnActivate) {
        btnActivate.addEventListener('click', () => handleBatchActivation());
    }

    // Inspect URL query params for direct approval links
    await checkDirectApprovalTarget();
}

/**
 * Renders the detailed review panel for a specific monster submission.
 * Includes side-by-side statblock preview and staff action controls.
 * @param {Object} monster - The full monster data object to review.
 */
function showReview(monster) {
    currentReview = monster;
    const target = document.getElementById('review-target');

    // Update table row highlighting
    document.querySelectorAll('.highlight-review-row').forEach(row => row.classList.remove('highlight-review-row'));
    const matchedRow = document.querySelector(`tr[data-slug="${monster.slug}"], tr[data-row-id="${monster.row_id}"]`);
    if (matchedRow) {
        matchedRow.classList.add('highlight-review-row');
    }

    target.innerHTML = `
        <div class="review-panel">
            <div class="review-sidebar">
                <h3>Staff Review</h3>
                <p><strong>Monster:</strong> ${monster.name}</p>
                <p><strong>Slug:</strong> ${monster.slug}</p>
                <p><strong>Creator:</strong> <code>${monster.creator || monster.creator_discord_id || 'Unknown'}</code></p>
                ${monster.creator_notes ? `<p><strong>Creator Notes:</strong> <em>${monster.creator_notes}</em></p>` : ''}
                
                <div class="decision-box" style="margin-top: 2rem; border-top: 1px solid var(--color-border); padding-top: 1.5rem;">
                    <button id="btn-approve" class="btn btn-approve" style="width: 100%; margin-bottom: 0.8rem; font-weight: bold;">Approve & Publish</button>
                    <button id="btn-queue" class="btn btn-queue" style="width: 100%; margin-bottom: 0.8rem;">Add to Patch Queue</button>
                    <button id="btn-reject" class="btn btn-reject" style="width: 100%;">Reject (Send to Drafts)</button>
                </div>
                <button onclick="window.scrollTo({top: 0, behavior: 'smooth'})" class="btn btn-sm btn-outline-secondary" style="margin-top: 1.5rem; width: 100%;">Back to Top</button>
            </div>
            <div class="review-statblock monster-page">
                <div id="statblock-preview"></div>
            </div>
        </div>
    `;

    // Render the statblock
    const sbContainer = target.querySelector('#statblock-preview');
    renderMonsterStatblock(sbContainer, monster);

    // Decision Listeners
    target.querySelector('#btn-approve').addEventListener('click', () => handleDecision('approve'));
    target.querySelector('#btn-queue').addEventListener('click', () => handleDecision('queue'));
    target.querySelector('#btn-reject').addEventListener('click', () => handleDecision('reject'));

    // Scroll to review panel
    target.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Processes the approval or rejection of a monster submission.
 * @param {string} type - Either 'approve', 'queue', or 'reject'.
 * @returns {Promise<void>}
 */
async function handleDecision(type) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!confirm(`Are you sure you want to ${type} this monster?`)) return;

    try {
        if (type === 'approve') {
            await approveMonster(currentReview.row_id, user.id);
            alert('Monster Approved & Published!');
        } else if (type === 'queue') {
            await addToPatchQueue(currentReview.row_id, user.id);
            alert('Monster added to Patch Queue.');
        } else {
            await rejectMonster(currentReview.row_id, user.id);
            alert('Monster Rejected (Sent back to Drafts).');
        }

        if (window.location.search) {
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }

        // Refresh lists
        renderQueue(document.getElementById('approvals-app'));
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

/**
 * Iterates through all monsters in the Patch Queue and activates them.
 * Includes archiving previous versions automatically via approveMonster.
 * @returns {Promise<void>}
 */
async function handleBatchActivation() {
    if (patchQueue.length === 0) return;

    const count = patchQueue.length;
    const msg = `This will activate ALL ${count} monsters in the Patch Queue.\n\n` +
        `Actions per monster:\n` +
        `- Set to 'Approved' & 'Live'\n` +
        `- Clean slug (remove -vX.X suffix)\n` +
        `- Archive any previous approved versions\n\n` +
        `Do you want to proceed?`;

    if (!confirm(msg)) return;

    const { data: { user } } = await supabase.auth.getUser();
    const btnTranslate = document.getElementById('btn-activate-queued');
    const originalText = btnTranslate.textContent;
    btnTranslate.disabled = true;

    try {
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < patchQueue.length; i++) {
            const m = patchQueue[i];
            btnTranslate.textContent = `Activating [${i + 1}/${count}]...`;

            try {
                await approveMonster(m.row_id, user.id);
                successCount++;
            } catch (err) {
                console.error(`Failed to activate ${m.name}:`, err);
                failCount++;
            }
        }

        alert(`Batch completion: ${successCount} activated, ${failCount} failed.`);
        renderQueue(document.getElementById('approvals-app'));

    } catch (err) {
        alert('Fatal Error during batch process: ' + err.message);
    } finally {
        if (btnTranslate) {
            btnTranslate.disabled = false;
            btnTranslate.textContent = originalText;
        }
    }
}

/**
 * Inspects URL parameters (?monster= or ?id=) and automatically focuses the requested monster review.
 * 
 * Developer Notes:
 * - SECURITY ORDER: This function is called from inside renderQueue(), which only executes
 *   AFTER window.handlePageAuth() has confirmed that:
 *     1) The user is logged in via Discord.
 *     2) The user possesses an authorized staff role (Lore, Rules, Admin, Monster Admin, Engineer).
 * - Therefore, this link CANNOT bypass authentication or permissions; it is strictly a UX shortcut.
 * - We check both pendingQueue and patchQueue, matching against either the monster's unique slug
 *   or its primary key row_id (UUID).
 * 
 * @returns {Promise<void>}
 */
async function checkDirectApprovalTarget() {
    // Read the query parameters from the browser's current URL
    const urlParams = new URLSearchParams(window.location.search);
    const targetKey = urlParams.get('monster') || urlParams.get('id');
    if (!targetKey) return; // No direct link parameter present; render default queue view

    const alertContainer = document.getElementById('queue-status-alert');

    // 1. Check if the target monster is currently waiting in either queue
    const matched = pendingQueue.find(m => m.slug === targetKey || m.row_id === targetKey) ||
                    patchQueue.find(m => m.slug === targetKey || m.row_id === targetKey);

    if (matched) {
        if (alertContainer) {
            alertContainer.innerHTML = `
                <div class="alert alert-info" style="margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>Direct Review:</strong> Focused on submission <strong>"${matched.name}"</strong> (${matched.status}).
                    </div>
                    <button type="button" class="btn btn-sm btn-outline-secondary" onclick="this.parentElement.remove();" style="padding: 0.2rem 0.6rem; font-size: 0.8rem;">Dismiss</button>
                </div>
            `;
        }

        // Auto-open the review panel (which also highlights the corresponding row and scrolls into view)
        showReview(matched);
        return;
    }

    // 2. Fallback: The monster was not found in the active queues.
    // This happens if the monster was already approved/rejected, is still a draft, or was deleted.
    // We query Supabase directly to display an informative notice to the reviewer.
    try {
        // Detect whether the parameter is a UUID (row_id) or a text slug to query the correct column
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetKey);
        let query = supabase.from('monsters').select('name, slug, status, row_id');
        query = isUUID ? query.eq('row_id', targetKey) : query.eq('slug', targetKey);
        const { data: monster } = await query.maybeSingle();

        if (!alertContainer) return;

        if (monster) {
            const rawBase = window.MONSTER_EDITOR_CONFIG?.baseUrl || '/Guides/';
            const baseUrl = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
            const liveUrl = `${baseUrl}monsters/#/${monster.slug}`;

            if (monster.status === 'Approved') {
                alertContainer.innerHTML = `
                    <div class="alert alert-info" style="margin-bottom: 2rem;">
                        <strong>Direct Link Notice:</strong> Monster <strong>"${monster.name}"</strong> is already <strong>Approved & Live</strong>.
                        <a href="${liveUrl}" target="_blank" style="margin-left: 0.5rem; text-decoration: underline; font-weight: bold;">View Live in Library &rarr;</a>
                    </div>
                `;
            } else if (monster.status === 'Draft') {
                alertContainer.innerHTML = `
                    <div class="alert alert-warning" style="margin-bottom: 2rem;">
                        <strong>Direct Link Notice:</strong> Monster <strong>"${monster.name}"</strong> is currently a <strong>Draft</strong> and has not yet been submitted for staff review.
                    </div>
                `;
            } else if (monster.status === 'Archived') {
                alertContainer.innerHTML = `
                    <div class="alert alert-secondary" style="margin-bottom: 2rem;">
                        <strong>Direct Link Notice:</strong> Monster <strong>"${monster.name}"</strong> is an <strong>Archived</strong> older version.
                    </div>
                `;
            } else {
                alertContainer.innerHTML = `
                    <div class="alert alert-info" style="margin-bottom: 2rem;">
                        <strong>Direct Link Notice:</strong> Monster <strong>"${monster.name}"</strong> is in status <strong>${monster.status}</strong> and is not waiting in the moderation queue.
                    </div>
                `;
            }
        } else {
            alertContainer.innerHTML = `
                <div class="alert alert-danger" style="margin-bottom: 2rem;">
                    <strong>Direct Link Error:</strong> Monster matching "<strong>${targetKey}</strong>" was not found in the database. It may have been deleted or the link is incorrect.
                </div>
            `;
        }
    } catch (err) {
        console.error('Failed to verify direct approval link:', err);
    }
}

// Start
init();
