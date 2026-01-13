/**
 * assets/js/dm-tool/dashboard.js
 */

// FIX: Go up one level to /assets/js/
import { supabase } from '../supabaseClient.js';
import '../auth-manager.js'; 

// FIX: Stay in current folder
import { fetchSessionList, createSession, deleteSession } from './data-manager.js';

let currentUser = null;

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

    if (!listBody) return; // Guard clause

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
    const id = e.target.dataset.id;
    if (!confirm("Are you sure you want to delete this session log? This cannot be undone.")) return;

    const success = await deleteSession(id);
    if (success) {
        await loadSessions(); 
    } else {
        alert("Failed to delete session.");
    }
}