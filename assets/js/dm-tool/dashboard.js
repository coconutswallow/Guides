/**
 * assets/js/dm-tool/dashboard.js
 * * @file dashboard.js
 * @description Manages the main dashboard view for the DM Tool. 
 * This module handles:
 * 1. Role-based Authentication (checking for DM roles).
 * 2. Toggling between Landing page (public) and Dashboard (private).
 * 3. Fetching and rendering the list of game sessions.
 * 4. Creating, Editing, and Deleting sessions.
 * @module Dashboard
 */

import { supabase } from '../supabaseClient.js';
import '../auth-manager.js'; 
import { fetchSessionList, createSession, deleteSession } from './data-manager.js';
import { checkAccess } from '../auth-check.js';

/** @type {Object|null} Holds the currently authenticated Supabase user object */
let currentUser = null;
/** @type {string|null} Temporary storage for the Session ID to be deleted */
let deleteTargetId = null; 

document.addEventListener('DOMContentLoaded', () => {
    // Use the central authManager to coordinate the Discord sync
    // before checking roles. This prevents the "flash" and "kick" loop.
    window.authManager.init(async (user) => {
        if (user) {
            await handleUserLogin(user);
        } else {
            showLanding();
        }
    });

    // Setup UI Listeners
    setupEventListeners();
});

/**
 * Single declaration of handleUserLogin to prevent SyntaxError.
 */
async function handleUserLogin(user) {
    try {
        // This check waits for the DB 'roles' column updated by your RPC function.
        const hasAccess = await checkAccess(user.id, ['Trial DM', 'Full DM']);

        if (hasAccess) {
            currentUser = user;
            showDashboard();
        } else {
            console.warn("Access Denied: User lacks required roles.");
            alert("Access Denied: You must be a Trial DM or Full DM to use this tool.");
            await window.authManager.logout(); 
        }
    } catch (err) {
        console.error("Error during role check:", err);
        showLanding();
    }
}

function setupEventListeners() {
    const btnNew = document.getElementById('btn-new-session');
    if (btnNew) btnNew.addEventListener('click', handleNewSession);

    const btnFirst = document.getElementById('btn-create-first');
    if (btnFirst) btnFirst.addEventListener('click', handleNewSession);
    
    const btnCancel = document.getElementById('btn-cancel-delete');
    const btnConfirm = document.getElementById('btn-confirm-delete');

    if (btnCancel) btnCancel.addEventListener('click', closeDeleteModal);
    if (btnConfirm) btnConfirm.addEventListener('click', executeDelete);
}

// Update handleUserLogin to be more resilient
async function handleUserLogin(user) {
    try {
        const hasAccess = await checkAccess(user.id, ['Trial DM', 'Full DM']);

        if (hasAccess) {
            currentUser = user;
            showDashboard();
        } else {
            console.warn("Access Denied: User lacks required roles.");
            alert("Access Denied: You must be a Trial DM or Full DM to use this tool.");
            window.authManager.logout(); 
        }
    } catch (err) {
        console.error("Error during role check:", err);
        showLanding();
    }
}

// --- NEW HELPER FUNCTION ---
/**
 * Handles the logic after a user has successfully authenticated with Supabase.
 * Performs a secondary check against the application database to ensure the user
 * has a specific role (Trial DM or Full DM).
 * * @async
 * @param {Object} user - The Supabase user object.
 */
async function handleUserLogin(user) {
    // 3. Check for specific roles
    // Retrieves role data from the 'profiles' table via auth-check.js
    const hasAccess = await checkAccess(user.id, ['Trial DM', 'Full DM']);

    if (hasAccess) {
        currentUser = user;
        showDashboard();
    } else {
        // Option A: Show a "Not Authorized" message
        // If user exists but lacks role, deny access and sign them out immediately.
        alert("Access Denied: You must be a Trial DM or Full DM to use this tool.");
        await supabase.auth.signOut(); // Force sign out
        showLanding();
    }
}
// ---------------------------

/**
 * Toggles the UI to show the Public Landing Page and hide the Dashboard.
 */
function showLanding() {
    const dash = document.getElementById('dashboard-content');
    const landing = document.getElementById('public-landing');
    if(dash) dash.classList.add('hidden');
    if(landing) landing.classList.remove('hidden');
}

/**
 * Toggles the UI to show the Dashboard and hide the Public Landing Page.
 * Triggers the data loading process for session lists.
 * @async
 */
async function showDashboard() {
    const dash = document.getElementById('dashboard-content');
    const landing = document.getElementById('public-landing');
    if(landing) landing.classList.add('hidden');
    if(dash) dash.classList.remove('hidden');
    
    await loadSessions();
}

/**
 * Fetches the list of sessions for the current user and renders the HTML table.
 * Handles Loading States and Empty States.
 * @async
 */
async function loadSessions() {
    const listBody = document.getElementById('session-list-body');
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');
    const table = document.getElementById('session-table');

    if (!listBody) return; 

    // Reset UI: Clear list, show loading spinner
    listBody.innerHTML = '';
    loadingState.classList.remove('hidden');
    table.classList.add('hidden');
    emptyState.classList.add('hidden');

    // Fetch Data from DB
    const sessions = await fetchSessionList(currentUser.id);

    // Hide loading spinner
    loadingState.classList.add('hidden');

    // Handle Empty State (User has no sessions)
    if (!sessions || sessions.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }

    // Render Rows if data exists
    table.classList.remove('hidden');
    
    sessions.forEach(session => {
        const row = document.createElement('tr');
        
        // Format Date (e.g., "Jan 1, 2024")
        const dateObj = new Date(session.session_date || session.updated_at);
        const dateStr = dateObj.toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric'
        });

        // Safe Title (Sanitized to prevent XSS)
        const safeTitle = session.title ? escapeHtml(session.title) : 'Untitled Session';

         // REMOVED inline color style from the <a> tag below
        row.innerHTML = `
            <td>
                <a href="session.html?id=${session.id}" class="session-link">
                    ${safeTitle}
                </a>
            </td>
            <td>${dateStr}</td>
            <td style="text-align:right; white-space: nowrap;">
                <button class="button button-secondary btn-sm btn-edit" data-id="${session.id}">Edit</button>
                <button class="button button-secondary btn-sm btn-danger-outline btn-delete" data-id="${session.id}">Delete</button>
            </td>
        `;
 
        listBody.appendChild(row);
    });

    // Attach Listeners to the new buttons
    attachRowListeners();
}

/**
 * Helper to attach event listeners to dynamic elements (Edit/Delete buttons)
 * after the table rows have been injected into the DOM.
 */
function attachRowListeners() {
    // Edit Buttons: Redirect to the session editor
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            window.location.href = `session.html?id=${id}`;
        });
    });

    // Delete Buttons: Trigger the modal workflow
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', handleDelete);
    });
}

/**
 * Prompts user for a session name and creates a new session in the database.
 * Redirects to the editor upon success.
 * @async
 */
async function handleNewSession() {
    const name = prompt("Enter a name for the new session:", "New Session");
    if (!name) return;

    try {
        const newSession = await createSession(currentUser.id, name);
        if (newSession) {
            window.location.href = `session.html?id=${newSession.id}`;
        }
    } catch (err) {
        console.error(err);
        alert("Error creating session.");
    }
}

/**
 * Step 1 of Deletion: Stores the ID and opens the confirmation modal.
 * @param {Event} e - The click event from the delete button.
 */
async function handleDelete(e) {
    // 1. Store the ID globally so executeDelete knows what to remove
    deleteTargetId = e.target.dataset.id;

    // 2. Show the modal
    const modal = document.getElementById('delete-modal');
    if (modal) modal.classList.remove('hidden');
}

/**
 * Utility: Escapes HTML characters to prevent Cross-Site Scripting (XSS).
 * @param {string} text - The raw text input.
 * @returns {string} Sanitized text safe for innerHTML.
 */
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Step 2 of Deletion: Performs the API call to delete the session.
 * Handles UI feedback (disabling button) and list refreshing.
 * @async
 */
async function executeDelete() {
    if (!deleteTargetId) return;

    // Visual feedback (optional: disable button to prevent double clicks)
    const btnConfirm = document.getElementById('btn-confirm-delete');
    const originalText = btnConfirm.innerText;
    btnConfirm.innerText = "Deleting...";
    btnConfirm.disabled = true;

    const success = await deleteSession(deleteTargetId);

    // Reset button state
    btnConfirm.innerText = originalText;
    btnConfirm.disabled = false;

    if (success) {
        closeDeleteModal();
        await loadSessions(); // Refresh the list
    } else {
        alert("Failed to delete session.");
        closeDeleteModal();
    }
}

/**
 * Closes the delete confirmation modal and clears the stored target ID.
 */
function closeDeleteModal() {
    deleteTargetId = null;
    const modal = document.getElementById('delete-modal');
    if (modal) modal.classList.add('hidden');
}