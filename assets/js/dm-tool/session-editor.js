// assets/js/dm-tool/session-editor.js

import { supabase } from '../supabaseClient.js'; 
// Fixed Imports: Combined into a single line to prevent "Identifier already declared" error
import { saveSession, saveAsTemplate, loadSession, fetchSessionList, fetchGameRules } from './data-manager.js';
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
    
    // Load dropdown options first
    await initDynamicDropdowns(); 
    await initTemplateDropdown(); 

    // Check if we are editing an existing session
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('id');

    if (sessionId) {
        await loadSessionData(sessionId);
    }
});

// ==========================================
// 2. Logic (Tabs, Hours, Timezone)
// ==========================================

async function initDynamicDropdowns() {
    console.log("Initializing dynamic dropdowns...");
    const rules = await fetchGameRules();
    
    console.log("Fetched rules:", rules);

    if (!rules || !rules.options) {
        console.error("Could not load dropdown options from DB. Rules:", rules);
        return;
    }

    console.log("Available options:", rules.options);

    // Helper to fill a select element
    const fillSelect = (id, options) => {
        const select = document.getElementById(id);
        if (!select) {
            console.warn(`Select element not found: ${id}`);
            return;
        }

        // Clear "Loading..."
        select.innerHTML = '<option value="">Select...</option>';

        options.forEach(opt => {
            const el = document.createElement('option');
            el.value = opt;
            el.textContent = opt;
            select.appendChild(el);
        });
        
        console.log(`Populated ${id} with ${options.length} options`);
    };

    // Map DB keys to HTML IDs
    // JSON Key -> HTML ID
    // Note: Matches the JSON structure you provided
    if(rules.options["Game Version"]) fillSelect('inp-version', rules.options["Game Version"]);
    if(rules.options["Application Types"]) fillSelect('inp-apps-type', rules.options["Application Types"]);
    if(rules.options["Game Format"]) fillSelect('inp-format', rules.options["Game Format"]);
    
    console.log("Dropdown initialization complete");
}

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
    
    if(!hoursInput) return; // Guard clause

    const updateDisplay = () => {
        const count = calculateSessionCount(hoursInput.value);
        if(sessionDisplay) sessionDisplay.textContent = count;
        updateSessionNav(count);
    };

    hoursInput.addEventListener('input', updateDisplay);
    updateDisplay(); // Run once on load
}

function updateSessionNav(count) {
    const navContainer = document.getElementById('dynamic-session-nav');
    if(!navContainer) return;

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
    const tzSelect = document.getElementById('inp-timezone');
    const unixInput = document.getElementById('inp-unix-time');

    if(!dateInput || !tzSelect) return;

    const updateUnix = () => {
        const dateVal = dateInput.value;
        const tzVal = tzSelect.value;
        // Pass both values to the calculator
        if(unixInput) unixInput.value = toUnixTimestamp(dateVal, tzVal);
    };

    // Listen to changes on BOTH inputs
    dateInput.addEventListener('change', updateUnix);
    dateInput.addEventListener('input', updateUnix); 
    tzSelect.addEventListener('change', updateUnix);
}

function initTimezone() {
    const tzSelect = document.getElementById('inp-timezone');
    if(!tzSelect) return;

    const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Clear existing options
    tzSelect.innerHTML = '';
    
    // 1. Get all supported timezones from the browser
    let timezones = [];
    if (Intl.supportedValuesOf) {
        timezones = Intl.supportedValuesOf('timeZone');
    } else {
        timezones = ["UTC", "America/New_York", "America/Los_Angeles", "Europe/London"];
    }

    if (!timezones.includes(userTz)) {
        timezones.push(userTz);
    }
    
    timezones.sort();

    timezones.forEach(tz => {
        const opt = document.createElement('option');
        opt.value = tz;
        opt.textContent = tz.replace(/_/g, " "); 
        if(tz === userTz) opt.selected = true;
        tzSelect.appendChild(opt);
    });
}

// ==========================================
// 3. Template & Data Logic
// ==========================================

async function initTemplateDropdown() {
    const select = document.getElementById('template-select');
    if(!select) return;

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; 

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
    const btnOpen = document.getElementById('btn-open-save-template');
    const btnConfirm = document.getElementById('btn-confirm-save-template');
    const btnLoad = document.getElementById('btn-load-template');
    const btnSaveGame = document.getElementById('btn-save-game');

    if(btnOpen) {
        btnOpen.addEventListener('click', () => modal.showModal());
    }

    if(btnConfirm) {
        btnConfirm.addEventListener('click', async () => {
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
    }

    if(btnLoad) {
        btnLoad.addEventListener('click', async () => {
            const tmplId = document.getElementById('template-select').value;
            if(!tmplId) return;
            
            const session = await loadSession(tmplId);
            if(session) {
                populateForm(session);
                alert("Template Loaded!");
            }
        });
    }
    
    if(btnSaveGame) {
        btnSaveGame.addEventListener('click', async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const sessionId = urlParams.get('id');
            const { data: { user } } = await supabase.auth.getUser();

            const formData = getFormData();
            const title = document.getElementById('header-game-name').value || "Untitled Session";
            const dateInput = document.getElementById('inp-start-datetime');
            const date = dateInput && dateInput.value ? new Date(dateInput.value).toISOString().split('T')[0] : null;

            if (sessionId) {
                await saveSession(sessionId, formData, { title, date });
                // Provide visual feedback
                const btn = document.getElementById('btn-save-game');
                const originalText = btn.innerText;
                btn.innerText = "Saved!";
                setTimeout(() => btn.innerText = originalText, 1500);
            } else {
                alert("Session ID missing.");
            }
        });
    }
}

function getFormData() {
    // Helper to safely get value
    const val = (id) => document.getElementById(id) ? document.getElementById(id).value : "";

    return {
        header: {
            game_datetime: val('inp-unix-time'),
            timezone: val('inp-timezone'),
            game_description: val('inp-description'), 
            game_type: val('inp-format'),
            tier: val('inp-tier'),
            apl: val('inp-apl'),
            party_size: val('inp-party-size'),
            platform: val('inp-platform'),
            intended_duration: val('inp-duration-text'),
            tone: val('inp-tone'),
            encounter_difficulty: val('inp-diff-encounter'),
            // Add other fields to match session.html IDs
            game_version: val('inp-version'),
            apps_type: val('inp-apps-type'),
            event_tag: val('inp-event'),
            focus: val('inp-focus'),
            threat_level: val('inp-diff-threat'),
            char_loss: val('inp-diff-loss'),
            house_rules: val('inp-houserules'),
            notes: val('inp-notes'),
            warnings: val('inp-warnings'),
            how_to_apply: val('inp-apply')
        },
        sessions: [] 
    };
}

function populateForm(session) {
    if(session.title) {
        const titleEl = document.getElementById('header-game-name');
        if(titleEl) titleEl.value = session.title;
    }
    
    // Safety check: New sessions might not have 'header' data yet
    if (!session.form_data || !session.form_data.header) return;

    const h = session.form_data.header;
    
    // Safe set helper
    const setVal = (id, val) => { 
        const el = document.getElementById(id); 
        if(el) el.value = val || ""; 
    };
    
    setVal('inp-unix-time', h.game_datetime);
    // Note: timezone handling might require re-running the calculator logic if needed
    setVal('inp-timezone', h.timezone);
    
    setVal('inp-format', h.game_type);
    setVal('inp-tier', h.tier);
    setVal('inp-apl', h.apl);
    setVal('inp-party-size', h.party_size);
    setVal('inp-duration-text', h.intended_duration);
    setVal('inp-platform', h.platform);
    setVal('inp-tone', h.tone);
    setVal('inp-diff-encounter', h.encounter_difficulty);
    setVal('inp-description', h.game_description);

    // New fields
    setVal('inp-version', h.game_version);
    setVal('inp-apps-type', h.apps_type);
    setVal('inp-event', h.event_tag);
    setVal('inp-focus', h.focus);
    setVal('inp-diff-threat', h.threat_level);
    setVal('inp-diff-loss', h.char_loss);
    
    // Markdown fields
    setVal('inp-houserules', h.house_rules);
    setVal('inp-notes', h.notes);
    setVal('inp-warnings', h.warnings);
    setVal('inp-apply', h.how_to_apply);
}

async function loadSessionData(sessionId) {
    const session = await loadSession(sessionId);
    if(!session) return;
    populateForm(session);
}

function generateOutput() {
    const data = getFormData().header;
    const unixTime = document.getElementById('inp-unix-time').value;
    
    // DISCORD TIMESTAMP LOGIC
    let timeString = "TBD";
    if (unixTime && unixTime > 0) {
        timeString = `<t:${unixTime}:F> (<t:${unixTime}:R>)`;
    }

    const listingText = `**${document.getElementById('header-game-name').value}**\n` +
                        `**Time:** ${timeString}\n` +
                        `**Format:** ${data.game_type || 'N/A'}\n` +
                        `**Tier:** ${data.tier || 'N/A'}\n` +
                        `\n${data.game_description || ''}`;
    
    const outListing = document.getElementById('listing-content');
    if(outListing) outListing.innerText = listingText;

    const outAd = document.getElementById('ad-content');
    if(outAd) outAd.innerText = listingText; // Mirror for now
}

// Global copy function
window.copyToClipboard = (id) => {
    const el = document.getElementById(id);
    if(el) {
        navigator.clipboard.writeText(el.innerText);
        alert("Copied!");
    }
};

// Hook up copy buttons
document.addEventListener('DOMContentLoaded', () => {
    const btnCopyList = document.getElementById('btn-copy-listing');
    if(btnCopyList) {
        btnCopyList.addEventListener('click', () => window.copyToClipboard('listing-content'));
    }
    
    const btnCopyAd = document.getElementById('btn-copy-ad');
    if(btnCopyAd) {
        btnCopyAd.addEventListener('click', () => window.copyToClipboard('ad-content'));
    }
});