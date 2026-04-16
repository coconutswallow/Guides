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
    addToPatchQueue
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

        const hasAccess = await checkAccess(user.id, ['Full DM', 'Monster Admin']);
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
                <tr>
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
                <tr>
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
}

/**
 * Renders the detailed review panel for a specific monster submission.
 * Includes side-by-side statblock preview and staff action controls.
 * @param {Object} monster - The full monster data object to review.
 */
function showReview(monster) {
    currentReview = monster;
    const target = document.getElementById('review-target');

    target.innerHTML = `
        <div class="review-panel">
            <div class="review-sidebar">
                <h3>Staff Review</h3>
                <p><strong>Monster:</strong> ${monster.name}</p>
                <p><strong>Slug:</strong> ${monster.slug}</p>
                
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

// Start
init();
