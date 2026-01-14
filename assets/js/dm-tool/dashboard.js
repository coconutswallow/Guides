/**
 * assets/js/dm-tool/dashboard.js
 */

import { supabase } from '../supabaseClient.js';
import '../auth-manager.js'; 
import { fetchSessionList, createSession, deleteSession } from './data-manager.js';

let currentUser = null;
let deleteTargetId = null; // Stores the ID of the session to delete

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check Auth State
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
        currentUser = user;
        showDashboard();
    } else {
        showLanding();
    }

    // 2. Setup Listeners
    const btnNew = document.getElementById('btn-new-session');
    if (btnNew) btnNew.addEventListener('click', handleNewSession);

    const btnFirst = document.getElementById('btn-create-first');
    if (btnFirst) btnFirst.addEventListener('click', handleNewSession);
    
    // Auth State Listener
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
            currentUser = session.user;
            showDashboard();
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            showLanding();
        }
    });

    // Modal Listeners
    const btnCancel = document.getElementById('btn-cancel-delete');
    const btnConfirm = document.getElementById('btn-confirm-delete');

    if (btnCancel) btnCancel.addEventListener('click', closeDeleteModal);
    if (btnConfirm) btnConfirm.addEventListener('click', executeDelete);
});

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

         // We inject the actual cells (td) into the row
        row.innerHTML = `
            <td>
                <a href="session.html?id=${session.id}" style="font-weight:600; color: #2c3e50; text-decoration: none;">
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
    function handleDelete(e) {
    // Store the ID globally so executeDelete knows what to remove
    deleteTargetId = e.target.dataset.id;

    // Show the modal
    const modal = document.getElementById('delete-modal');
    if (modal) modal.classList.remove('hidden');
}
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