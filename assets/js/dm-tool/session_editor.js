// assets/js/dm-tool/session-editor.js

import { supabase } from '../supabaseClient.js'; // If needed for auth check
import { saveSession, saveAsTemplate, loadSession } from './data-manager.js';
import { calculateSessionCount, toUnixTimestamp } from './calculators.js';

// ==========================================
// 1. Initialization
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize UI Components
    initTabs();
    initTimezone();
    initHoursLogic();
    initDateTimeConverter();
    initTemplateLogic();
    
    // Check if we are editing an existing session (via URL param)
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('id');
    
    if (sessionId) {
        await loadSessionData(sessionId);
    }
});

// ==========================================
// 2. Logic Moved from Inline Script
// ==========================================

function initTabs() {
    // Sidebar Navigation
    document.querySelectorAll('#sidebar-nav .nav-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('#sidebar-nav .nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            document.querySelectorAll('.view-section').forEach(s => s.classList.add('hidden-section'));
            
            const targetId = item.dataset.target;
            const targetEl = document.getElementById(targetId);
            if(targetEl) targetEl.classList.remove('hidden-section');
        });
    });

    // Sub-tabs (Input/Output)
    document.querySelectorAll('.content-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            tab.parentElement.querySelectorAll('.content-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const targetId = tab.dataset.subtab;
            const parent = tab.closest('.view-section');
            parent.querySelectorAll('.subtab-content').forEach(c => c.classList.add('hidden-section'));
            document.getElementById(targetId).classList.remove('hidden-section');
        });
    });
}

function initHoursLogic() {
    const hoursInput = document.getElementById('header-hours');
    const sessionDisplay = document.getElementById('header-session-count');

    // Use the imported calculator logic
    const updateDisplay = () => {
        const count = calculateSessionCount(hoursInput.value);
        sessionDisplay.textContent = count;
        updateSessionNav(count);
    };

    hoursInput.addEventListener('input', updateDisplay);
    updateDisplay(); // Run once on load
}

function updateSessionNav(count) {
    const navContainer = document.getElementById('dynamic-session-nav');
    navContainer.innerHTML = ''; // Clear
    
    for(let i=1; i<=count; i++) {
        const div = document.createElement('div');
        div.className = 'nav-item';
        div.dataset.target = `view-session-${i}`;
        div.textContent = `Session ${i}`;
        
        div.addEventListener('click', () => {
            document.querySelectorAll('#sidebar-nav .nav-item').forEach(n => n.classList.remove('active'));
            div.classList.add('active');
            
            // Hide all sections
            document.querySelectorAll('.view-section').forEach(s => s.classList.add('hidden-section'));
            
            // Show target (or create it if missing - logic for creation can be added here)
            let targetSection = document.getElementById(`view-session-${i}`);
            if(targetSection) targetSection.classList.remove('hidden-section');
        });
        
        navContainer.appendChild(div);
    }
}

function initDateTimeConverter() {
    const dateInput = document.getElementById('inp-start-datetime');
    const unixInput = document.getElementById('inp-unix-time');

    dateInput.addEventListener('change', () => {
        unixInput.value = toUnixTimestamp(dateInput.value);
    });
}

function initTimezone() {
    const tzSelect = document.getElementById('inp-timezone');
    const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    const commonTimezones = [
        "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", 
        "Europe/London", "Europe/Paris", "Asia/Tokyo", "Australia/Sydney"
    ];
    
    if(!commonTimezones.includes(userTz)) commonTimezones.push(userTz);
    commonTimezones.sort().forEach(tz => {
        const opt = document.createElement('option');
        opt.value = tz;
        opt.text = tz;
        if(tz === userTz) opt.selected = true;
        tzSelect.appendChild(opt);
    });
}

// ==========================================
// 3. Data Handling (Save/Load)
// ==========================================

function initTemplateLogic() {
    const modal = document.getElementById('modal-save-template');
    
    document.getElementById('btn-open-save-template').addEventListener('click', () => {
        modal.showModal();
    });

    document.getElementById('btn-confirm-save-template').addEventListener('click', async () => {
        const tmplName = document.getElementById('inp-template-name').value;
        if(!tmplName) return alert("Enter a name");

        // Get User ID (Assuming auth-manager stores it in local storage or global)
        const user = await supabase.auth.getUser();
        if(!user.data.user) return alert("Please login");

        const formData = getFormData();
        
        try {
            await saveAsTemplate(user.data.user.id, tmplName, formData);
            alert("Template Saved!");
            modal.close();
        } catch (e) {
            alert("Error saving template");
        }
    });
}

function getFormData() {
    // Scrapes the DOM to build the JSON object
    return {
        header: {
            game_datetime: document.getElementById('inp-unix-time').value,
            timezone: document.getElementById('inp-timezone').value,
            game_description: document.getElementById('inp-description')?.value || "", 
            game_type: document.getElementById('inp-format').value,
            tier: document.getElementById('inp-tier').value,
            apl: document.getElementById('inp-apl').value,
            party_size: document.getElementById('inp-party-size').value,
            platform: document.getElementById('inp-platform').value,
            intended_duration: document.getElementById('inp-duration-text').value,
            // ... add the rest of your fields here
        },
        sessions: [] 
    };
}

async function loadSessionData(sessionId) {
    const session = await loadSession(sessionId);
    if(!session) return;

    // Populate the form fields from session.form_data
    // Example:
    document.getElementById('header-game-name').value = session.title;
    const data = session.form_data.header;
    
    if(data) {
        document.getElementById('inp-format').value = data.game_type || "";
        document.getElementById('inp-tier').value = data.tier || "";
        // ... populate rest of fields
    }
}