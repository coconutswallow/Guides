// assets/js/dm-tool/session-editor.js

import { supabase } from '../supabaseClient.js'; 
import { saveSession, saveAsTemplate, loadSession, fetchGameRules, fetchActiveEvents } from './data-manager.js';
import { calculateSessionCount, toUnixTimestamp } from './calculators.js';

// ==========================================
// 1. Initialization
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    initTabs();
    initTimezone();
    initHoursLogic();
    initDateTimeConverter();
    initTemplateLogic();
    initPlayerRoster(); 
    
    // Load dropdowns
    await initDynamicDropdowns(); 
    await initEventsDropdown(); 
    await initTemplateDropdown(); 

    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('id');

    if (sessionId) {
        await loadSessionData(sessionId);
    }
});

// ==========================================
// 2. Data Loading & Saving Logic
// ==========================================

async function loadSessionData(sessionId) {
    try {
        const session = await loadSession(sessionId);
        if (session) {
            populateForm(session);
        } else {
            console.error("Session not found");
        }
    } catch (error) {
        console.error("Error loading session data:", error);
    }
}

async function initDynamicDropdowns() {
    const rules = await fetchGameRules();
    if (!rules || !rules.options) return;

    const fillSelect = (id, options) => {
        const select = document.getElementById(id);
        if (!select) return;
        select.innerHTML = '<option value="">Select...</option>';
        options.forEach(opt => {
            const el = document.createElement('option');
            el.value = opt;
            el.textContent = opt;
            select.appendChild(el);
        });
    };

    if(rules.options["Game Version"]) fillSelect('inp-version', rules.options["Game Version"]);
    if(rules.options["Application Types"]) fillSelect('inp-apps-type', rules.options["Application Types"]);
    if(rules.options["Game Format"]) fillSelect('inp-format', rules.options["Game Format"]);
}

async function initEventsDropdown() {
    const events = await fetchActiveEvents();
    const select = document.getElementById('inp-event');
    if (!select) return;

    select.innerHTML = ''; 
    
    events.forEach(evt => {
        const el = document.createElement('option');
        el.value = evt.name; 
        el.textContent = evt.name;
        select.appendChild(el);
    });
}

// ==========================================
// 3. UI Logic (Tabs, Hours, Timezone)
// ==========================================

function initTabs() {
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

    document.querySelectorAll('.content-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            tab.parentElement.querySelectorAll('.content-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const targetId = tab.dataset.subtab;
            const parent = tab.closest('.view-section');
            parent.querySelectorAll('.subtab-content').forEach(c => c.classList.add('hidden-section'));
            document.getElementById(targetId).classList.remove('hidden-section');
            
            if(targetId === 'ad-output') {
                generateOutput();
            }
        });
    });
}

function initHoursLogic() {
    const hoursInput = document.getElementById('header-hours');
    const sessionDisplay = document.getElementById('header-session-count');
    
    if(!hoursInput) return;

    const updateDisplay = () => {
        const count = calculateSessionCount(hoursInput.value);
        if(sessionDisplay) sessionDisplay.textContent = count;
        updateSessionNav(count);
    };

    hoursInput.addEventListener('input', updateDisplay);
    updateDisplay(); 
}

function updateSessionNav(count) {
    const navContainer = document.getElementById('dynamic-session-nav');
    if(!navContainer) return;

    navContainer.innerHTML = ''; 
    
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
        if(unixInput) unixInput.value = toUnixTimestamp(dateVal, tzVal);
    };

    dateInput.addEventListener('change', updateUnix);
    dateInput.addEventListener('input', updateUnix); 
    tzSelect.addEventListener('change', updateUnix);
}

function initTimezone() {
    const tzSelect = document.getElementById('inp-timezone');
    if(!tzSelect) return;

    const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    tzSelect.innerHTML = '';
    
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
// 4. Player Roster Logic (PC/DMPC)
// ==========================================

function initPlayerRoster() {
    const btnAdd = document.getElementById('btn-add-player');
    if(btnAdd) {
        btnAdd.addEventListener('click', () => {
            addPlayerRow();
        });
    }
}

function addPlayerRow(data = {}) {
    const tbody = document.getElementById('roster-body');
    if(!tbody) return;

    const tr = document.createElement('tr');
    tr.className = 'player-row';

    // Games Dropdown Generator
    let gamesOptions = '';
    for(let i=0; i<=10; i++) {
        const val = i.toString();
        const selected = (data.games_count === val) ? 'selected' : '';
        gamesOptions += `<option value="${val}" ${selected}>${val}</option>`;
    }
    const selectedTenPlus = (data.games_count === '10+') ? 'selected' : '';
    gamesOptions += `<option value="10+" ${selectedTenPlus}>10+</option>`;

    // NOTE: Using 'table-input' class to ensure Dark Mode compatibility via CSS
    tr.innerHTML = `
        <td><input type="text" class="table-input inp-discord-id" placeholder="Discord ID" value="${data.discord_id || ''}"></td>
        <td><input type="text" class="table-input inp-char-name" placeholder="Character Name" value="${data.character_name || ''}"></td>
        <td><input type="number" class="table-input inp-level" placeholder="Lvl" value="${data.level || ''}"></td>
        <td>
            <select class="table-input inp-games-count">
                ${gamesOptions}
            </select>
        </td>
        <td style="text-align:center;">
            <button class="button button-danger btn-sm btn-delete-row" title="Remove Player">&times;</button>
        </td>
    `;

    // Delete Event
    tr.querySelector('.btn-delete-row').addEventListener('click', () => {
        tr.remove();
    });

    tbody.appendChild(tr);
}

function getPlayerRosterData() {
    const rows = document.querySelectorAll('#roster-body .player-row');
    const players = [];

    rows.forEach(row => {
        players.push({
            discord_id: row.querySelector('.inp-discord-id').value,
            character_name: row.querySelector('.inp-char-name').value,
            level: row.querySelector('.inp-level').value,
            games_count: row.querySelector('.inp-games-count').value
        });
    });
    return players;
}

// ==========================================
// 5. Template & Saving Logic
// ==========================================

async function initTemplateDropdown() {
    const select = document.getElementById('template-select');
    if(!select) return;

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

            const formData = getFormData();
            const title = document.getElementById('header-game-name').value || "Untitled Session";
            const dateInput = document.getElementById('inp-start-datetime');
            const date = dateInput && dateInput.value ? new Date(dateInput.value).toISOString().split('T')[0] : null;

            if (sessionId) {
                await saveSession(sessionId, formData, { title, date });
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

// ==========================================
// 6. Form Handling (Get/Populate)
// ==========================================

function getFormData() {
    const val = (id) => document.getElementById(id) ? document.getElementById(id).value : "";

    // Handle Multi-Select for Events
    const eventSelect = document.getElementById('inp-event');
    const selectedEvents = eventSelect ? Array.from(eventSelect.selectedOptions).map(opt => opt.value) : [];

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
            game_version: val('inp-version'),
            apps_type: val('inp-apps-type'),
            event_tags: selectedEvents, 
            focus: val('inp-focus'),
            threat_level: val('inp-diff-threat'),
            char_loss: val('inp-diff-loss'),
            house_rules: val('inp-houserules'),
            notes: val('inp-notes'),
            warnings: val('inp-warnings'),
            how_to_apply: val('inp-apply'),
            listing_url: val('inp-listing-url'),
            lobby_url: val('inp-lobby-url')
        },
        players: getPlayerRosterData(),
        dm: {
            // discord_id removed
            character_name: val('inp-dm-char-name'),
            level: val('inp-dm-level'),
            games_count: val('inp-dm-games-count')
        },
        sessions: [] 
    };
}

function populateForm(session) {
    if(session.title) {
        const titleEl = document.getElementById('header-game-name');
        if(titleEl) titleEl.value = session.title;
    }
    
    if (!session.form_data) return;

    // 1. Populate Header Fields
    if (session.form_data.header) {
        const h = session.form_data.header;
        const setVal = (id, val) => { 
            const el = document.getElementById(id); 
            if(el) el.value = val || ""; 
        };
        
        setVal('inp-unix-time', h.game_datetime);
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
        setVal('inp-version', h.game_version);
        setVal('inp-apps-type', h.apps_type);
        setVal('inp-listing-url', h.listing_url);
        setVal('inp-lobby-url', h.lobby_url);

        // Handle Multi-Select
        const eventSelect = document.getElementById('inp-event');
        if (eventSelect && Array.isArray(h.event_tags)) {
            Array.from(eventSelect.options).forEach(opt => {
                opt.selected = h.event_tags.includes(opt.value);
            });
        } else if (eventSelect && h.event_tag) {
            eventSelect.value = h.event_tag;
        }

        setVal('inp-focus', h.focus);
        setVal('inp-diff-threat', h.threat_level);
        setVal('inp-diff-loss', h.char_loss);
        setVal('inp-houserules', h.house_rules);
        setVal('inp-notes', h.notes);
        setVal('inp-warnings', h.warnings);
        setVal('inp-apply', h.how_to_apply);
    }

    // 2. Populate Player Roster
    const tbody = document.getElementById('roster-body');
    if (tbody) {
        tbody.innerHTML = ''; // Clear existing rows
        if (session.form_data.players && Array.isArray(session.form_data.players)) {
            session.form_data.players.forEach(player => {
                addPlayerRow(player);
            });
        }
    }

    // 3. Populate DM Details
    if (session.form_data.dm) {
        const d = session.form_data.dm;
        const setVal = (id, val) => { 
            const el = document.getElementById(id); 
            if(el) el.value = val || ""; 
        };
        // discord_id removed
        setVal('inp-dm-char-name', d.character_name);
        setVal('inp-dm-level', d.level);
        setVal('inp-dm-games-count', d.games_count);
    }
}

function generateOutput() {
    const data = getFormData().header;
    const unixTime = document.getElementById('inp-unix-time').value;
    const name = document.getElementById('header-game-name').value || "Untitled";
    
    let timeString = "TBD";
    if (unixTime && unixTime > 0) {
        timeString = `<t:${unixTime}:F>`;
    }

    // --- GAME LISTING ---
    const listingText = `\`\`\`
**Start Time:** ${timeString}

**Name:** ${name}
**Description:** ${data.game_description || 'N/A'}

**Version:** ${data.game_version || 'N/A'}
**Format:** ${data.game_type || 'N/A'}
**Tier and APL:** ${data.tier || 'N/A'} (${data.apl || 'N/A'})
**Party Size:** ${data.party_size || 'N/A'}
**Applications:** ${data.apps_type || 'N/A'}

**Tone:** ${data.tone || 'N/A'}
**Focus:** ${data.focus || 'N/A'}
**Difficulty:** ${data.encounter_difficulty || 'N/A'}
- **Encounter Difficulty:** ${data.encounter_difficulty || 'N/A'}
- **Chance of Character Loss:** ${data.char_loss || 'N/A'}
- **Enemy Threat Level:** ${data.threat_level || 'N/A'}
- **Environment Hazard Level:** N/A

**Lobby:** ${data.lobby_url || 'N/A'}
**Platform:** ${data.platform || 'N/A'}
**Duration:** ${data.intended_duration || 'N/A'}

**House Rules:** ${data.house_rules || 'N/A'}

**Notes:** ${data.notes || 'N/A'}

**Content Warnings:** ${data.warnings || 'N/A'}

**How to Apply:**
${data.how_to_apply || 'Post your application below.'}
\`\`\``;
    
    const outListing = document.getElementById('out-listing-text');
    if(outListing) outListing.value = listingText;

    // --- GAME AD ---
    const adText = `\`\`\`
> **Name:** ${name}
**Version and Format:** ${data.game_version} / ${data.game_type}
/ **Tier and APL:** ${data.tier || 'N/A'} , APL ${data.apl || 'N/A'}
**Start Time and Duration:** ${timeString} (${data.intended_duration || 'N/A'})
**Listing:** ${data.listing_url || 'N/A'}
**Description:**
${data.game_description || ''}
\`\`\``;

    const outAd = document.getElementById('out-ad-text');
    if(outAd) outAd.value = adText; 
}