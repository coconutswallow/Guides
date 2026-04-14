/**
 * monster-approvals.js
 * Controller for the staff Approval queue.
 * Location: \assets\js\monster\monster-approvals.js
 * https://github.com/hawthorneguild/HawthorneTeams/issues/7
 */

import { supabase } from '../supabaseClient.js';
import { checkAccess } from '../auth-check.js';
import {
    getPendingMonsters,
    approveMonster,
    rejectMonster,
    addToPatchQueue
} from './monster-service.js';
import { renderMonsterStatblock } from './views/monster-detail.js';

let pendingQueue = [];
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
 * Fetches the pending queue from the service and renders the dashboard table.
 * @param {HTMLElement} container - The main application container.
 * @returns {Promise<void>}
 */
async function renderQueue(container) {
    container.innerHTML = '<div class="loading">Fetching queue...</div>';

    pendingQueue = await getPendingMonsters();

    let html = `
        <div class="editor-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
            <div>
                <h2 style="margin: 0;">Approval Queue</h2>
                <p style="margin: 0;">${pendingQueue.length} monster(s) awaiting review.</p>
            </div>
            <a href="/Guides/staff/" class="btn btn-outline" style="font-size: 0.85rem;">Back to Staff Portal</a>
        </div>
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
        html += '<tr><td colspan="4" class="text-center">Queue is empty. Nice work!</td></tr>';
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

    html += '</tbody></table></div><div id="review-target"></div>';
    container.innerHTML = html;

    // Listen for review button
    container.querySelectorAll('.btn-review').forEach(btn => {
        btn.addEventListener('click', e => {
            const index = e.target.dataset.index;
            showReview(pendingQueue[index]);
        });
    });
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
 * @param {string} type - Either 'approve' or 'reject'.
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

        // Refresh queue
        renderQueue(document.getElementById('approvals-app'));
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// Start
init();
