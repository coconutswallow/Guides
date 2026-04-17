/**
 * ================================================================
 * REWORK REVIEWER MODULE
 * ================================================================
 * 
 * Handles the logic for the Rework Reviewer page, including:
 * - Role-based access control (RBAC) verification
 * - Fetching and rendering the full list of rework logs
 * - Handling navigation to the main rework tool
 * 
 * Access is restricted to Users with the following roles:
 * - Admin
 * - Auditor Apprentice
 * - Auditor
 * - Engineer
 * 
 *   
 * https://github.com/hawthorneguild/HawthorneTeams/issues/8
 * 
 * @module rework-reviewer
 */

import { fetchAllReworks, cleanupOldReworks } from "./state-manager.js";

/**
 * Required roles for accessing the reviewer page.
 * @constant {Array<string>}
 */
const REQUIRED_ROLES = ["Admin", "Auditor Apprentice", "Auditor", "Engineer"];

/**
 * Initializes the reviewer page.
 * 
 * Verifies authentication and roles, then triggers the data fetch.
 * 
 * @async
 * @global
 */
window.initReviewer = async () => {
    const listContainer = document.getElementById('rework-log-list');
    if (!listContainer) return;

    listContainer.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading logs...</td></tr>';

    try {
        const reworks = await fetchAllReworks();
        renderLogList(reworks);
    } catch (err) {
        console.error("Failed to load logs:", err);
        listContainer.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--palette-alert-danger-border);">Error loading logs. Please try again.</td></tr>';
    }
};

/**
 * Renders the list of rework logs into the table.
 * 
 * @param {Array} reworks - Array of rework records from Supabase
 * @private
 */
function renderLogList(reworks) {
    const tbody = document.getElementById('rework-log-list');
    if (!tbody) return;

    if (!reworks || reworks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No rework logs found.</td></tr>';
        return;
    }

    tbody.innerHTML = ''; // Clear loading message

    reworks.forEach(r => {
        const row = document.createElement('tr');

        // Format date
        const dateStr = new Date(r.updated_at).toLocaleDateString() + ' ' +
            new Date(r.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Map rework type to human-readable label
        const typeLabels = {
            '2024-update': '2024 Update',
            'level-5-below': 'Level 5 Below',
            't2-checkpoint': 'T2 Checkpoint',
            't3-checkpoint': 'T3 Checkpoint',
            't4-checkpoint': 'T4 Checkpoint',
            'story': 'Story Rework',
            'alacarte': 'A-la-carte'
        };

        row.innerHTML = `
            <td><code>${r.id.substring(0, 8)}...</code></td>
            <td style="text-align: left; font-weight: bold;">${r.character_name || "Unknown"}</td>
            <td style="text-align: left;">${r.discord_id || "Unknown"}</td>
            <td><span class="badge">${typeLabels[r.rework_type] || r.rework_type || "Unknown"}</span></td>
            <td>${dateStr}</td>
            <td>
                <button class="btn btn-primary" style="padding: 4px 12px; font-size: 0.8rem;" 
                        onclick="window.viewRework('${r.id}')">View</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * Prompts for confirmation and deletes rework logs older than 90 days.
 * 
 * @async
 * @global
 */
window.handleCleanup = async () => {
    const confirmed = confirm("Are you sure you want to delete ALL rework logs older than 90 days? This action cannot be undone.");
    if (!confirmed) return;

    try {
        const count = await cleanupOldReworks(90);
        alert(`Successfully deleted ${count} old rework logs.`);
        // Refresh the list
        window.initReviewer();
    } catch (err) {
        alert("An error occurred during cleanup. See console for details.");
        console.error(err);
    }
};

/**
 * Navigates to the main rework tool with a specific ID.
 * 
 * @param {string} id - UUID of the rework to view
 * @global
 */
window.viewRework = (id) => {
    // Redirect to index.html with the ID as a query parameter
    window.location.href = `./index.html?id=${id}`;
};

/**
 * Handle page-level authentication and RBAC.
 * This is called by auth-header.html once auth state is determined.
 * 
 * @param {Object|null} user - The Supabase user object or null
 * @global
 */
window.handlePageAuth = async (user) => {
    const reviewerContent = document.getElementById('reviewer-content');
    const accessDenied = document.getElementById('access-denied');
    const reviewerLoading = document.getElementById('reviewer-loading');

    // Always hide loading once we start processing auth
    if (reviewerLoading) reviewerLoading.style.display = 'none';

    if (!user) {
        // Not logged in: Show access denied or redirect
        if (reviewerContent) reviewerContent.style.display = 'none';
        if (accessDenied) accessDenied.style.display = 'block';
        return;
    }

    try {
        // Fetch user roles from the database via authManager's client
        const { data, error } = await window.authManager.client
            .from('discord_users')
            .select('roles')
            .eq('user_id', user.id)
            .single();

        if (error) throw error;

        const roles = data?.roles || [];
        const hasAccess = roles.some(r => REQUIRED_ROLES.includes(r));

        if (hasAccess) {
            // Authorized
            if (reviewerContent) reviewerContent.style.display = 'block';
            if (accessDenied) accessDenied.style.display = 'none';

            // Trigger data load
            window.initReviewer();
        } else {
            // Unauthorized roles
            if (reviewerContent) reviewerContent.style.display = 'none';
            if (accessDenied) accessDenied.style.display = 'block';
        }
    } catch (e) {
        console.error("RBAC Check Error:", e);
        if (reviewerContent) reviewerContent.style.display = 'none';
        if (accessDenied) accessDenied.style.display = 'block';
    }
};

// ================================================================
// INITIALIZATION & RACE CONDITION HANDLING
// ================================================================

/**
 * Handle race condition where authManager might initialize BEFORE
 * this module is fully loaded.
 */
(async function () {
    // Wait for authManager to be available on window
    let polls = 0;
    while (!window.authManager && polls < 50) {
        await new Promise(r => setTimeout(r, 100));
        polls++;
    }

    if (window.authManager && window.authManager.user !== undefined) {
        // If user state is already determined, trigger the check manually
        window.handlePageAuth(window.authManager.user);
    }
})();
