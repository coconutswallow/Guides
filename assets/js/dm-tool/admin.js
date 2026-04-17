/**
 * @file admin.js
 * @description DM-Tool Admin Controller. Handles RLS-restricted functions for managing 
 * events and lookup data. Provides a dynamic form interface for nested JSONB configuration.
 * @module AdminController
 * 
 * https://github.com/hawthorneguild/HawthorneTeams/issues/6
 */

import { supabase } from '../supabaseClient.js';
import { logError } from '../error-logger.js';

// GLOBAL STATE
let currentLookups = null;
let originalLookups = null;

// UI REFERENCES
const ui = {
    authGuard: document.getElementById('admin-auth-guard'),
    authFailed: document.getElementById('auth-failed-msg'),
    eventsTable: document.getElementById('events-table-body'),
    lookupsContainer: document.getElementById('lookups-form-container'),
    saveStatus: document.getElementById('save-status-msg'),
    tabs: document.querySelectorAll('.admin-tab'),
    sections: document.querySelectorAll('.admin-section')
};

/**
 * PAGE AUTHORIZATION HOOK
 * Called by auth-header.html logic once Supabase session is established.
 * Verifies if the user has 'Engineer' or 'Admin' roles.
 * 
 * @param {Object} user - The Supabase user object.
 */
window.handlePageAuth = async (user) => {
    if (!user) {
        ui.authFailed.classList.remove('hidden');
        document.getElementById('auth-loading-spinner').classList.add('hidden');
        return;
    }

    try {
        const { data, error } = await supabase
            .from('discord_users')
            .select('roles')
            .eq('user_id', user.id)
            .single();

        if (error || !data) throw new Error("Could not verify permissions");

        const roles = data.roles || [];
        const isAuthorized = roles.some(r => ['Engineer', 'Admin'].includes(r));

        if (isAuthorized) {
            ui.authGuard.classList.add('hidden');
            initDashboard();
        } else {
            ui.authFailed.classList.remove('hidden');
            document.getElementById('auth-loading-spinner').classList.add('hidden');
        }
    } catch (e) {
        console.error("Auth Error:", e);
        ui.authFailed.classList.remove('hidden');
        ui.authFailed.textContent = "Error verifying roles. Please try again.";
    }
};

/**
 * INITIALIZE DASHBOARD
 * Sets up tab listeners, fetches initial data, and binds form events.
 */
const initDashboard = () => {
    setupTabs();
    fetchEvents();
    fetchLookups();

    // Event Listeners
    document.getElementById('form-add-event').addEventListener('submit', handleAddEvent);
    document.getElementById('btn-save-lookups').addEventListener('click', saveLookups);
    document.getElementById('btn-reset-lookups').addEventListener('click', () => {
        currentLookups = JSON.parse(JSON.stringify(originalLookups));
        renderLookupsForm();
    });
};

/**
 * TABS MANAGEMENT
 * Handles switching between Events and Lookups visibility.
 */
const setupTabs = () => {
    ui.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            ui.tabs.forEach(t => t.classList.remove('active'));
            ui.sections.forEach(s => s.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`section-${tab.dataset.tab}`).classList.add('active');
        });
    });
};

/**
 * EVENTS MANAGEMENT
 * Fetches all events from Supabase and triggers rendering.
 */
const fetchEvents = async () => {
    try {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        renderEvents(data);
    } catch (e) {
        logError('admin-js', `Fetch Events Error: ${e.message}`);
    }
};

/**
 * Renders the events table based on fetched data.
 * @param {Array<Object>} events - List of event records.
 */
const renderEvents = (events) => {
    if (!events.length) {
        ui.eventsTable.innerHTML = '<tr><td colspan="5" style="text-align:center;">No events found.</td></tr>';
        return;
    }

    ui.eventsTable.innerHTML = events.map(ev => `
        <tr>
            <td><strong>${ev.name}</strong></td>
            <td>${ev.description || '<span style="color:#888;">N/A</span>'}</td>
            <td>
                <span class="badge ${ev.is_active ? 'badge-active' : 'badge-inactive'}">
                    ${ev.is_active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>${new Date(ev.created_at).toLocaleString()}</td>
            <td>
                <button class="button button-secondary btn-sm" onclick="window.adminController.toggleEvent(${ev.id}, ${ev.is_active})">
                    ${ev.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button class="button btn-danger-outline btn-sm" onclick="window.adminController.deleteEvent(${ev.id})">Delete</button>
            </td>
        </tr>
    `).join('');
};

/**
 * Handles the submission of the "Add Event" form.
 * @param {Event} e - The form submission event.
 */
const handleAddEvent = async (e) => {
    e.preventDefault();
    const name = document.getElementById('new-event-name').value;
    const description = document.getElementById('new-event-desc').value;
    const is_active = document.getElementById('new-event-active').checked;

    try {
        const { error } = await supabase
            .from('events')
            .insert([{ name, description, is_active }]);

        if (error) throw error;

        document.getElementById('modal-add-event').close();
        e.target.reset();
        fetchEvents();
        showStatus("Event created successfully!");
    } catch (err) {
        alert("Error creating event: " + err.message);
    }
};

/**
 * LOOKUPS CONFIGURATION
 * Fetches the 'dm-tool' lookup record from Supabase.
 */
const fetchLookups = async () => {
    try {
        const { data, error } = await supabase
            .from('lookups')
            .select('*')
            .eq('type', 'dm-tool')
            .single();

        if (error) throw error;
        originalLookups = data;
        currentLookups = JSON.parse(JSON.stringify(data));
        renderLookupsForm();
    } catch (e) {
        logError('admin-js', `Fetch Lookups Error: ${e.message}`);
    }
};

/**
 * Generates the dynamic form for all Lookups configuration data.
 * Reconstructs the UI from the currentLookups.data object.
 */
const renderLookupsForm = () => {
    const data = currentLookups.data;
    let html = '';

    // Tiers & Pings
    html += `
        <div class="lookup-card" style="grid-column: 1 / -1;">
            <h3>Tiers & Role Pings</h3>
            <div class="tier-container">
                ${Object.entries(data.tier).map(([tierName, pings]) => `
                    <div class="tier-row">
                        <div class="tier-label">${tierName}</div>
                        <div class="nested-grid">
                            ${Object.entries(pings).map(([pingType, roleId]) => `
                                <div>
                                    <label style="font-size:0.65rem; color:var(--color-text-secondary); text-transform:none;">${pingType}</label>
                                    <input type="text" class="lookup-input" 
                                        value="${roleId}" 
                                        onchange="window.adminController.updateLookup('tier.${tierName}.${pingType}', this.value)">
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    // Game Options (Arrays)
    html += `
        <div class="lookup-card">
            <h3>Dropdown Options</h3>
            ${Object.entries(data.options).map(([optName, items]) => `
                <div class="lookup-group">
                    <label>${optName}</label>
                    <textarea class="lookup-input" rows="3" 
                        onchange="window.adminController.updateLookup('options.${optName}', this.value.split(',').map(s=>s.trim()))">${items.join(', ')}</textarea>
                    <small>Separate items with commas</small>
                </div>
            `).join('')}
        </div>
    `;

    // Incentives (Dynamic Grid)
    html += `
        <div class="lookup-card" style="grid-column: 1 / -1;">
            <h3>Incentives Configuration</h3>
            <div class="lookup-form-grid">
                <!-- Player Incentives -->
                <div class="lookup-group">
                    <label>Player Incentives (DTP)</label>
                    <div id="player-incentives-list" class="incentive-table">
                        <div class="incentive-row" style="font-size:0.7rem; font-weight:bold; color:var(--color-text-secondary); margin-bottom:5px;">
                            <div>Incentive Name</div>
                            <div>DTP</div>
                            <div></div>
                        </div>
                        ${Object.entries(data['player incentives']).map(([name, val], idx) => `
                            <div class="incentive-row">
                                <input type="text" class="lookup-input" value="${name}" 
                                    onchange="window.adminController.renameIncentive('player', '${name}', this.value)">
                                <input type="number" class="lookup-input" value="${val}"
                                    onchange="window.adminController.updateIncentive('player', '${name}', 'value', this.value)">
                                <button class="btn-icon" onclick="window.adminController.removeIncentive('player', '${name}')" title="Remove row">🗑️</button>
                            </div>
                        `).join('')}
                        <button class="btn-add-row" onclick="window.adminController.addIncentive('player')">+ Add Player Incentive</button>
                    </div>
                </div>

                <!-- DM Incentives -->
                <div class="lookup-group">
                    <label>DM Incentives</label>
                    <div id="dm-incentives-list" class="incentive-table">
                        <div class="incentive-row dm-type" style="font-size:0.7rem; font-weight:bold; color:var(--color-text-secondary); margin-bottom:5px;">
                            <div>Incentive Name</div>
                            <div>Bonus DTP</div>
                            <div>Bonus Loot</div>
                            <div></div>
                        </div>
                        ${Object.entries(data['DM incentives']).map(([name, config], idx) => `
                            <div class="incentive-row dm-type">
                                <input type="text" class="lookup-input" value="${name}" 
                                    onchange="window.adminController.renameIncentive('dm', '${name}', this.value)">
                                <input type="number" class="lookup-input" value="${config['bonus DTP']}"
                                    onchange="window.adminController.updateIncentive('dm', '${name}', 'bonus DTP', this.value)">
                                <input type="number" class="lookup-input" value="${config['bonus loot roll']}"
                                    onchange="window.adminController.updateIncentive('dm', '${name}', 'bonus loot roll', this.value)">
                                <button class="btn-icon" onclick="window.adminController.removeIncentive('dm', '${name}')" title="Remove row">🗑️</button>
                            </div>
                        `).join('')}
                        <button class="btn-add-row" onclick="window.adminController.addIncentive('dm')">+ Add DM Incentive</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // XP & Gold Tables (Level based)
    html += `
        <div class="lookup-card">
            <h3>XP per Hour (by Level)</h3>
            <div class="nested-grid" style="grid-template-columns: repeat(4, 1fr);">
                ${Object.entries(data.xp_per_hour).map(([lvl, xp]) => `
                    <div class="lookup-group">
                        <label>Lvl ${lvl}</label>
                        <input type="number" class="lookup-input" value="${xp}" 
                            onchange="window.adminController.updateLookup('xp_per_hour.${lvl}', parseInt(this.value))">
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    html += `
        <div class="lookup-card">
            <h3>Gold per Session (by APL)</h3>
            <div class="nested-grid" style="grid-template-columns: repeat(4, 1fr);">
                ${Object.entries(data.gold_per_session_by_apl).map(([apl, gp]) => `
                    <div class="lookup-group">
                        <label>APL ${apl}</label>
                        <input type="number" class="lookup-input" value="${gp}" 
                            onchange="window.adminController.updateLookup('gold_per_session_by_apl.${apl}', parseInt(this.value))">
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    ui.lookupsContainer.innerHTML = html;
};

/**
 * Persists the currentLookups.data object to the Supabase database.
 */
const saveLookups = async () => {
    ui.saveStatus.textContent = "Saving...";
    ui.saveStatus.style.color = "var(--palette-role-auditor)";

    try {
        const { error } = await supabase
            .from('lookups')
            .update({ data: currentLookups.data })
            .eq('id', currentLookups.id);

        if (error) throw error;
        originalLookups = JSON.parse(JSON.stringify(currentLookups));
        showStatus("Lookups saved successfully!");
    } catch (e) {
        logError('admin-js', `Save Lookups Error: ${e.message}`);
        alert("Error saving: " + e.message);
        ui.saveStatus.textContent = "Save Failed";
        ui.saveStatus.style.color = "var(--palette-alert-danger-action)";
    }
};

/**
 * PUBLIC API (For Inline DOM Calls)
 * Exposes methods to the window object for interaction with HTML onclick handlers.
 */
window.adminController = {
    toggleEvent: async (id, currentStatus) => {
        try {
            const { error } = await supabase
                .from('events')
                .update({ is_active: !currentStatus })
                .eq('id', id);

            if (error) throw error;
            fetchEvents();
            showStatus(currentStatus ? "Event deactivated" : "Event activated");
        } catch (err) {
            alert("Error toggling event: " + err.message);
        }
    },

    deleteEvent: async (id) => {
        if (!confirm("Are you sure you want to delete this event? This cannot be undone.")) return;
        try {
            const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchEvents();
            showStatus("Event deleted");
        } catch (err) {
            alert("Error deleting event: " + err.message);
        }
    },

    updateLookup: (path, value) => {
        const parts = path.split('.');
        let current = currentLookups.data;

        for (let i = 0; i < parts.length - 1; i++) {
            current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
        console.log(`Updated ${path} to:`, value);
    },

    renameIncentive: (type, oldName, newName) => {
        if (!newName || oldName === newName) return;
        const root = type === 'player' ? 'player incentives' : 'DM incentives';
        const data = currentLookups.data[root];

        if (data[newName]) {
            alert("An incentive with this name already exists.");
            renderLookupsForm(); // Reset UI
            return;
        }

        data[newName] = data[oldName];
        delete data[oldName];
        renderLookupsForm();
    },

    updateIncentive: (type, name, field, value) => {
        const root = type === 'player' ? 'player incentives' : 'DM incentives';
        const data = currentLookups.data[root];

        if (type === 'player') {
            data[name] = parseInt(value) || 0;
        } else {
            data[name][field] = parseInt(value) || 0;
        }
    },

    addIncentive: (type) => {
        const root = type === 'player' ? 'player incentives' : 'DM incentives';
        const data = currentLookups.data[root];
        const newName = "New " + (type === 'player' ? "Player" : "DM") + " Incentive " + (Object.keys(data).length + 1);

        if (type === 'player') {
            data[newName] = 0;
        } else {
            data[newName] = { "bonus DTP": 0, "bonus loot roll": 0 };
        }
        renderLookupsForm();
    },

    removeIncentive: (type, name) => {
        if (!confirm(`Remove "${name}"?`)) return;
        const root = type === 'player' ? 'player incentives' : 'DM incentives';
        delete currentLookups.data[root][name];
        renderLookupsForm();
    }
};

/**
 * Displays a temporary status message in the admin actions bar.
 * @param {string} msg - The message to display.
 */
const showStatus = (msg) => {
    ui.saveStatus.textContent = msg;
    ui.saveStatus.style.color = "var(--palette-role-full-dm)";
    setTimeout(() => { ui.saveStatus.textContent = ""; }, 4000);
};
