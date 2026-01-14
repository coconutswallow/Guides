// assets/js/dm-tool/session-editor.js

// Relative path is correct because this file is in /assets/js/dm-tool/
// and supabaseClient.js is in /assets/js/
import { supabase } from '../supabaseClient.js'; 
import { saveSession, saveAsTemplate, loadSession, fetchSessionList } from './data-manager.js';
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
    await initTemplateDropdown(); // Populate the dropdown
    
    // Check if we are editing an existing session (via URL param)
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('id');
    
    if (sessionId) {
        await loadSessionData(sessionId);
    }
});

// ==========================================
// 2. Logic (Tabs, Hours, Timezone)
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
            
            // Re-generate markdown if output tab is selected
            if(targetId === 'ad-output') {
                generateOutput();
            }
        });
    });
}

function initHoursLogic() {
    const hoursInput = document.getElementById('header-hours');
    const sessionDisplay = document.getElementById('header-session-count');

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
            document.querySelectorAll('.view-section').forEach(s => s.classList.add('hidden-section'));
            
            let targetSection = document.getElementById(`view-session-${i}`);
            // If section doesn't exist yet, we just show Session 1 for now or handle dynamic creation
            if(!targetSection) targetSection = document.getElementById('view-session-1');
            
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
    
    // Clear existing options
    tzSelect.innerHTML = '';
    
    // 1. Get all supported timezones from the browser
    // This requires a modern browser (Chrome 109+, Safari 15.4+, Firefox 93+)
    let timezones = [];
    if (Intl.supportedValuesOf) {
        timezones = Intl.supportedValuesOf('timeZone');
    } else {
        // Fallback for very old browsers
        timezones = ["UTC", "America/New_York", "America/Los_Angeles", "Europe/London"];
    }

    // 2. Ensure user's current timezone is in the list
    if (!timezones.includes(userTz)) {
        timezones.push(userTz);
    }
    
    // 3. Sort alphabetically
    timezones.sort();

    // 4. Create Options
    timezones.forEach(tz => {
        const opt = document.createElement('option');
        opt.value = tz;
        opt.textContent = tz.replace(/_/g, " "); // Make it prettier (e.g., "New_York" -> "New York")
        
        // Pre-select the user's current timezone
        if(tz === userTz) opt.selected = true;
        
        tzSelect.appendChild(opt);
    });
}

// ==========================================
// 3. Template & Data Logic
// ==========================================

async function initTemplateDropdown() {
    const select = document.getElementById('template-select');
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // Not logged in

    // Fetch templates (Using the existing fetchSessionList but filtering in memory or ideally a new DB call)
    // For now, we reuse fetchSessionList and filtering for is_template=true
    try {
        const { data, error } = await supabase
            .from('session_logs')
            .select('id, title')
            .eq('user_id', user.id)
            .eq('is_template', true);
            
        if (data) {
            data.forEach(tmpl => {
                const opt = document.createElement('option');
                opt.value = tmpl.id;
                opt.text = tmpl.title;
                select.appendChild(opt);
            });
        }
    } catch (err) {
        console.error("Error fetching templates", err);
    }
}

function initTemplateLogic() {
    const modal = document.getElementById('modal-save-template');
    
    document.getElementById('btn-open-save-template').addEventListener('click', () => {
        modal.showModal();
    });

    document.getElementById('btn-confirm-save-template').addEventListener('click', async () => {
        const tmplName = document.getElementById('inp-template-name').value;
        if(!tmplName) return alert("Enter a name");

        const { data: { user } } = await supabase.auth.getUser();
        if(!user) return alert("Please login");

        const formData = getFormData();
        
        try {
            await saveAsTemplate(user.id, tmplName, formData);
            alert("Template Saved!");
            modal.close();
            // Refresh dropdown
            const select = document.getElementById('template-select');
            const opt = document.createElement('option');
            opt.text = tmplName; 
            select.appendChild(opt);
        } catch (e) {
            alert("Error saving template");
        }
    });

    // Load Button Logic
    document.getElementById('btn-load-template').addEventListener('click', async () => {
        const tmplId = document.getElementById('template-select').value;
        if(!tmplId) return;
        
        const session = await loadSession(tmplId);
        if(session) {
            populateForm(session);
            alert("Template Loaded!");
        }
    });
    
    // Save Game Button Logic
    document.getElementById('btn-save-game').addEventListener('click', async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('id');
        const { data: { user } } = await supabase.auth.getUser();

        const formData = getFormData();
        const title = document.getElementById('header-game-name').value || "Untitled Session";
        const date = document.getElementById('inp-start-datetime').value ? new Date(document.getElementById('inp-start-datetime').value).toISOString().split('T')[0] : null;

        if (sessionId) {
            await saveSession(sessionId, formData, { title, date });
            alert("Session Updated");
        } else {
            // Logic for creating new session would go here (usually redirecting to ?id=NEW_ID)
            alert("This functionality requires a 'Create' logic separate from Update.");
        }
    });
}

function getFormData() {
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
            // Add other fields as necessary
            tone: document.getElementById('inp-tone').value,
            encounter_difficulty: document.getElementById('inp-diff-encounter').value,
        },
        sessions: [] 
    };
}

function populateForm(session) {
    if(session.title) document.getElementById('header-game-name').value = session.title;
    
    const h = session.form_data.header;
    if(h) {
        // Safe set helper
        const setVal = (id, val) => { 
            const el = document.getElementById(id); 
            if(el) el.value = val || ""; 
        };
        
        setVal('inp-format', h.game_type);
        setVal('inp-tier', h.tier);
        setVal('inp-apl', h.apl);
        setVal('inp-party-size', h.party_size);
        setVal('inp-duration-text', h.intended_duration);
        setVal('inp-platform', h.platform);
        setVal('inp-tone', h.tone);
        setVal('inp-diff-encounter', h.encounter_difficulty);
        setVal('inp-description', h.game_description);
        
        // Handle Date specially if needed, but templates usually don't have dates
    }
}

async function loadSessionData(sessionId) {
    const session = await loadSession(sessionId);
    if(!session) return;
    populateForm(session);
}

function generateOutput() {
    // Simple generator for the output tab based on inputs
    const data = getFormData().header;
    const listingText = `**${document.getElementById('header-game-name').value}**\n` +
                        `**Time:** ${document.getElementById('inp-start-datetime').value || "TBD"}\n` +
                        `**Format:** ${data.game_type}\n` +
                        `**Tier:** ${data.tier}\n` +
                        `\n${data.game_description}`;
    
    document.getElementById('listing-content').innerText = listingText;
}

// Global copy function
window.copyToClipboard = (id) => {
    const el = document.getElementById(id);
    navigator.clipboard.writeText(el.innerText);
    alert("Copied!");
};