/**
 * dashboard.js
 * Handles the logic for the index.html landing page.
 * - Fetches list of sessions
 * - Handles "New Session" creation
 * - Handles Delete actions
 */

import { supabase } from './supabaseClient.js';
import { fetchSessionList, createSession, deleteSession } from './dm-tool/data-manager.js';
import { setupAuthListener } from './auth-manager.js'; // Assuming you have a listener setup

// State
let currentUser = null;

/**
 * Initialize Dashboard
 */
async function init() {
    try {
        // 1. Get User
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            // auth-check.js should have redirected, but just in case
            window.location.href = 'login.html';
            return;
        }
        currentUser = user;

        // 2. Setup UI Events
        document.getElementById('btn-new-session').addEventListener('click', handleNewSession);
        
        // 3. Load Data
        await loadSessions();

    } catch (err) {
        console.error("Dashboard Init Error:", err);
        alert("Failed to initialize dashboard.");
    }
}

/**
 * Loads and Renders the Session List
 */
async function loadSessions() {
    const listBody = document.getElementById('session-list-body');
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');
    const table = document.getElementById('session-table');

    // Reset UI
    listBody.innerHTML = '';
    loadingState.classList.remove('hidden');
    table.classList.add('hidden');
    emptyState.classList.add('hidden');

    // Fetch Data
    const sessions = await fetchSessionList(currentUser.id);

    loadingState.classList.add('hidden');

    if (sessions.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }

    // Render Rows
    table.classList.remove('hidden');
    sessions.forEach(session => {
        const row = document.createElement('tr');
        
        // Format Date
        const dateObj = new Date(session.session_date || session.updated_at);
        const dateStr = dateObj.toLocaleDateString();

        // Status Class
        const statusClass = session.status ? `status-${session.status.toLowerCase()}` : 'status-planning';

        row.innerHTML = `
            <td>
                <strong><a href="session.html?id=${session.id}">${session.title}</a></strong>
                ${session.is_template ? '<span style="font-size:0.8em; color:#666; margin-left:5px;">(Template)</span>' : ''}
            </td>
            <td>${dateStr}</td>
            <td><span class="status-badge ${statusClass}">${session.status || 'Planning'}</span></td>
            <td style="text-align: right;">
                <button class="btn btn-sm btn-outline-danger btn-delete" data-id="${session.id}">Delete</button>
            </td>
        `;

        listBody.appendChild(row);
    });

    // Attach Delete Listeners
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', handleDelete);
    });
}

/**
 * Handle Creating a New Session
 */
async function handleNewSession() {
    const name = prompt("Enter a name for the new session:", "New Session");
    if (!name) return;

    try {
        const newSession = await createSession(currentUser.id, name);
        if (newSession) {
            // Redirect to the Editor
            window.location.href = `session.html?id=${newSession.id}`;
        }
    } catch (err) {
        alert("Error creating session. Check console.");
    }
}

/**
 * Handle Deleting a Session
 */
async function handleDelete(e) {
    const id = e.target.dataset.id;
    if (!confirm("Are you sure you want to delete this session log? This cannot be undone.")) return;

    const success = await deleteSession(id);
    if (success) {
        await loadSessions(); // Refresh list
    } else {
        alert("Failed to delete session.");
    }
}

// Start
document.addEventListener('DOMContentLoaded', init);