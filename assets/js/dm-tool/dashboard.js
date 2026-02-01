/**
 * assets/js/dm-tool/dashboard.js
 * @file dashboard.js
 * @description Manages the main dashboard view for the DM Tool. 
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

let dashboardInitialized = false;

document.addEventListener('DOMContentLoaded', () => {
    // Coordinate with authManager to ensure sync/freshness logic completes 
    // before we attempt to check roles or load data.
    window.authManager.init(async (user) => {
        if (user) {
            await handleUserLogin(user);
        } else {
            showLanding();
        }
    });

    setupEventListeners();
});

/**
 * Handles the logic after a user has authenticated.
 * @param {Object} user - The Supabase user object.
 */
async function handleUserLogin(user) {
    try {
        // Waits for the DB 'roles' updated by your Postgres RPC function.
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

/**
 * Toggles the UI to show the Public Landing Page.
 */
function showLanding() {
    const dash = document.getElementById('dashboard-content');
    const landing = document.getElementById('public-landing');
    if(dash) dash.classList.add('hidden');
    if(landing) landing.classList.remove('hidden');
}

/**
 * Toggles the UI to show the Dashboard and loads session data.
 */
async function showDashboard() {
    if (dashboardInitialized) return;
    dashboardInitialized = true;
    
    const dash = document.getElementById('dashboard-content');
    const landing = document.getElementById('public-landing');
    
    if(landing) landing.classList.add('hidden');
    if(dash) dash.classList.remove('hidden');
    
    await loadSessions();
}

/**
 * Fetches and renders the list of sessions.
 */
async function loadSessions() {
    const listBody = document.getElementById('session-list-body');
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');
    const table = document.getElementById('session-table');

    if (!listBody) return; 

    listBody.innerHTML = '';
    loadingState.classList.remove('hidden');
    table.classList.add('hidden');
    emptyState.classList.add('hidden');

    const sessions = await fetchSessionList(currentUser.id);
    loadingState.classList.add('hidden');

    if (!sessions || sessions.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }

    table.classList.remove('hidden');
    
    sessions.forEach(session => {
        const row = document.createElement('tr');
        const dateObj = new Date(session.session_date || session.updated_at);
        const dateStr = dateObj.toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric'
        });

        const safeTitle = session.title ? escapeHtml(session.title) : 'Untitled Session';

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

    attachRowListeners();
}

function attachRowListeners() {
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            window.location.href = `session.html?id=${id}`;
        });
    });

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
    deleteTargetId = e.target.dataset.id;
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

    const btnConfirm = document.getElementById('btn-confirm-delete');
    const originalText = btnConfirm.innerText;
    btnConfirm.innerText = "Deleting...";
    btnConfirm.disabled = true;

    const success = await deleteSession(deleteTargetId);

    btnConfirm.innerText = originalText;
    btnConfirm.disabled = false;

    if (success) {
        closeDeleteModal();
        await loadSessions();
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