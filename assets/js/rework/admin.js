/**
 * @file assets/js/rework/admin.js
 * @description Administrative logic for the Character Rework lookup database.
 * Handles fetching, searching, and CRUD operations on Class/Subclass ASI data.
 * @module ReworkAdmin
 * 
 * https://github.com/hawthorneguild/HawthorneTeams/issues/8
 */

import { supabase } from '../supabaseClient.js';
import { logError } from '../error-logger.js';

// GLOBAL STATE
let characterData = [];
let originalData = [];
let dbRecord = null;
let searchTerm = "";

// UI REFERENCES
const ui = {
    authGuard: document.getElementById('admin-auth-guard'),
    authFailed: document.getElementById('auth-failed-msg'),
    dashboard: document.getElementById('admin-dashboard'),
    tableBody: document.getElementById('class-table-body'),
    searchInput: document.getElementById('class-search'),
    saveStatus: document.getElementById('save-status-msg'),
    modalEditor: document.getElementById('modal-class-editor'),
    formEditor: document.getElementById('form-class-editor')
};

/**
 * PAGE AUTHORIZATION HOOK
 * Verifies if the user has 'Engineer' or 'Admin' roles.
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
            ui.dashboard.classList.remove('hidden');
            initAdmin();
        } else {
            ui.authFailed.classList.remove('hidden');
            document.getElementById('auth-loading-spinner').classList.add('hidden');
        }
    } catch (e) {
        console.error("Auth Error:", e);
        ui.authFailed.classList.remove('hidden');
    }
};

/**
 * INITIALIZE ADMIN LOGIC
 */
const initAdmin = () => {
    fetchData();

    // Event Listeners
    ui.searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase();
        renderTable();
    });

    document.getElementById('btn-add-class').addEventListener('click', () => showEditor());
    document.getElementById('btn-save-data').addEventListener('click', saveData);
    document.getElementById('btn-reset-data').addEventListener('click', () => {
        if (confirm("Reset all unsaved changes?")) {
            characterData = JSON.parse(JSON.stringify(originalData));
            renderTable();
        }
    });

    ui.formEditor.addEventListener('submit', handleFormSubmit);
};

/**
 * FETCH DATA FROM SUPABASE
 * Loads the 'character' lookup record. Handles serialization fallback if data is stored as string.
 * @async
 * @returns {Promise<void>}
 */
const fetchData = async () => {
    try {
        const { data, error } = await supabase
            .from('lookups')
            .select('*')
            .eq('type', 'character')
            .single();

        if (error) throw error;
        
        dbRecord = data;
        let rawData = data.data;
        
        // Handle serialized JSON string if present (fallback for specific DB formats)
        if (typeof rawData === 'string') {
            try { rawData = JSON.parse(rawData); } catch(e) {}
        }
        
        originalData = rawData || [];
        characterData = JSON.parse(JSON.stringify(originalData));
        
        renderTable();
    } catch (e) {
        logError('rework-admin', `Fetch Error: ${e.message}`);
        ui.tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Error loading data.</td></tr>';
    }
};

/**
 * RENDER THE DATA TABLE
 * Filters the global characterData array by searchTerm and injects HTML into the table body.
 */
const renderTable = () => {
    const filtered = characterData.filter(item => {
        const text = `${item.class} ${item.subclass} ${item.version}`.toLowerCase();
        return text.includes(searchTerm);
    });

    if (filtered.length === 0) {
        ui.tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No matching records found.</td></tr>';
        return;
    }

    ui.tableBody.innerHTML = filtered.map((item, idx) => {
        // Find actual index in global array
        const globalIdx = characterData.indexOf(item);
        
        return `
            <tr>
                <td><strong>${item.class}</strong></td>
                <td>${item.subclass}</td>
                <td><span class="badge ${item.version === 2024 ? 'badge-active' : 'badge-inactive'}">${item.version}</span></td>
                <td><code>${(item.ASI || []).join(', ')}</code></td>
                <td>
                    <button class="btn-icon" onclick="window.adminController.edit(${globalIdx})" title="Edit Row">✏️</button>
                    <button class="btn-icon" onclick="window.adminController.remove(${globalIdx})" title="Delete Row">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
};

/**
 * PERSIST DATA TO SUPABASE
 * Updates the 'lookups' table with the current state of characterData.
 * @async
 * @returns {Promise<void>}
 */
const saveData = async () => {
    showStatus("Saving...", "var(--palette-role-auditor)");

    try {
        const { error } = await supabase
            .from('lookups')
            .update({ data: characterData })
            .eq('id', dbRecord.id);

        if (error) throw error;
        
        originalData = JSON.parse(JSON.stringify(characterData));
        showStatus("Configuration saved successfully!", "var(--palette-role-full-dm)");
    } catch (e) {
        logError('rework-admin', `Save Error: ${e.message}`);
        alert("Error saving: " + e.message);
        showStatus("Save Failed", "var(--palette-alert-danger-action)");
    }
};

/**
 * FORM HANDLING: Modal Visibility
 * @param {number} [index=-1] - Index of the item to edit, or -1 for new entry.
 */
const showEditor = (index = -1) => {
    const isNew = index === -1;
    document.getElementById('modal-title').textContent = isNew ? "Add New Class" : "Edit Class Entry";
    document.getElementById('edit-index').value = index;

    if (!isNew) {
        const item = characterData[index];
        document.getElementById('edit-class').value = item.class;
        document.getElementById('edit-subclass').value = item.subclass;
        document.getElementById('edit-version').value = item.version;
        document.getElementById('edit-asi').value = (item.ASI || []).join(', ');
    } else {
        ui.formEditor.reset();
    }

    ui.modalEditor.showModal();
};

/**
 * FORM HANDLING: Submission
 * Processes the class editor form and updates the local state.
 * @param {Event} e - Form submission event.
 */
const handleFormSubmit = (e) => {
    e.preventDefault();
    const index = parseInt(document.getElementById('edit-index').value);
    
    // Parse the ASI string back to an array of numbers
    const asiStr = document.getElementById('edit-asi').value;
    const asiArr = asiStr.split(',')
        .map(s => parseInt(s.trim()))
        .filter(n => !isNaN(n))
        .sort((a, b) => a - b);

    const newItem = {
        class: document.getElementById('edit-class').value.trim(),
        subclass: document.getElementById('edit-subclass').value.trim(),
        version: parseInt(document.getElementById('edit-version').value),
        ASI: asiArr
    };

    if (index === -1) {
        characterData.unshift(newItem); // Add to top
    } else {
        characterData[index] = newItem;
    }

    ui.modalEditor.close();
    renderTable();
    showStatus("Changes ready to save", "var(--palette-role-auditor)");
};

/**
 * PUBLIC CONTROLLER
 */
window.adminController = {
    edit: (index) => showEditor(index),
    remove: (index) => {
        if (confirm(`Are you sure you want to remove "${characterData[index].subclass}"?`)) {
            characterData.splice(index, 1);
            renderTable();
            showStatus("Row removed (unsaved)", "var(--palette-alert-danger-action)");
        }
    }
};

/**
 * Displays a temporary status message.
 * @param {string} msg - Text to display.
 * @param {string} color - CSS color value (hex, var, etc.).
 */
const showStatus = (msg, color) => {
    ui.saveStatus.textContent = msg;
    ui.saveStatus.style.color = color;
    if (msg.includes("successfully")) {
        setTimeout(() => { ui.saveStatus.textContent = ""; }, 4000);
    }
};
