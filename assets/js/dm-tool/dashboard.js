/**
 * assets/js/dm-tool/dashboard.js
 */

import { supabase } from '../supabaseClient.js';
import '../auth-manager.js'; 
import { fetchSessionList, createSession, deleteSession } from './data-manager.js';
import { checkAccess } from '../auth-check.js'; // <--- 1. Import checkAccess

let currentUser = null;
let deleteTargetId = null; 

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check Auth State
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
        await handleUserLogin(user); // <--- 2. Use a handler that checks roles
    } else {
        showLanding();
    }

    // 2. Setup Listeners
    const btnNew = document.getElementById('btn-new-session');
    if (btnNew) btnNew.addEventListener('click', handleNewSession);

    const btnFirst = document.getElementById('btn-create-first');
    if (btnFirst) btnFirst.addEventListener('click', handleNewSession);
    
    // Auth State Listener
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN') {
            await handleUserLogin(session.user);
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            showLanding();
        }
    });

    // ... (Modal listeners remain the same)
    const btnCancel = document.getElementById('btn-cancel-delete');
    const btnConfirm = document.getElementById('btn-confirm-delete');

    if (btnCancel) btnCancel.addEventListener('click', closeDeleteModal);
    if (btnConfirm) btnConfirm.addEventListener('click', executeDelete);
});

// --- NEW HELPER FUNCTION ---
async function handleUserLogin(user) {
    // 3. Check for specific roles
    const hasAccess = await checkAccess(user.id, ['Trial DM', 'Full DM']);

    if (hasAccess) {
        currentUser = user;
        showDashboard();
    } else {
        // Option A: Show a "Not Authorized" message
        alert("Access Denied: You must be a Trial DM or Full DM to use this tool.");
        await supabase.auth.signOut(); // Force sign out
        showLanding();
    }
}
// ---------------------------

function showLanding() {
    const dash = document.getElementById('dashboard-content');
    const landing = document.getElementById('public-landing');
    if(dash) dash.classList.add('hidden');
    if(landing) landing.classList.remove('hidden');
}

async function showDashboard() {
    const dash = document.getElementById('dashboard-content');
    const landing = document.getElementById('public-landing');
    if(landing) landing.classList.add('hidden');
    if(dash) dash.classList.remove('hidden');
    
    await loadSessions();
}

async function loadSessions() {
    const listBody = document.getElementById('session-list-body');
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');
    const table = document.getElementById('session-table');

    if (!listBody) return; 

    // Reset UI
    listBody.innerHTML = '';
    loadingState.classList.remove('hidden');
    table.classList.add('hidden');
    emptyState.classList.add('hidden');

    // Fetch Data
    const sessions = await fetchSessionList(currentUser.id);

    loadingState.classList.add('hidden');

    if (!sessions || sessions.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }

    // Render Rows
    table.classList.remove('hidden');
    
    sessions.forEach(session => {
        const row = document.createElement('tr');
        
        // Format Date
        const dateObj = new Date(session.session_date || session.updated_at);
        const dateStr = dateObj.toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric'
        });

        // Safe Title
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
 * Helper to attach listeners to dynamic elements
 */
function attachRowListeners() {
    // Edit Buttons
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            window.location.href = `session.html?id=${id}`;
        });
    });

    // Delete Buttons
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', handleDelete);
    });
}

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

async function handleDelete(e) {
    // 1. Store the ID globally so executeDelete knows what to remove
    deleteTargetId = e.target.dataset.id;

    // 2. Show the modal
    const modal = document.getElementById('delete-modal');
    if (modal) modal.classList.remove('hidden');
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

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

function closeDeleteModal() {
    deleteTargetId = null;
    const modal = document.getElementById('delete-modal');
    if (modal) modal.classList.add('hidden');
}