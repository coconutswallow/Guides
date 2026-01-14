// assets/js/dm-tool/session-editor.js

import { supabase } from '../supabaseClient.js'; 
import { 
    saveSession, 
    saveAsTemplate, 
    loadSession, 
    fetchGameRules, 
    fetchActiveEvents,
    fetchTemplates 
} from './data-manager.js';
import { 
    calculateSessionCount, 
    toUnixTimestamp, 
    distributeHours,
    calculateXP 
} from './calculators.js';

let cachedGameRules = null; // Store rules globally for XP calc

// ==========================================
// 1. Initialization
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    // Fetch rules immediately for XP calculations
    cachedGameRules = await fetchGameRules();

    initTabs();
    initTimezone();
    initHoursLogic();
    initDateTimeConverter(); // Global header converter
    initTemplateLogic();
    initPlayerRoster(); // Master Roster logic
    
    // Load dropdowns
    await initDynamicDropdowns(); 
    await initEventsDropdown(); 
    await initTemplateDropdown(); 

    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('id');

    if (sessionId) {
        await loadSessionData(sessionId);
    } else {
        // If new session, trigger the logic to create at least Session 1
        // We trigger the input event manually to run the calculation logic once
        const hoursInput = document.getElementById('header-hours');
        if(hoursInput) hoursInput.dispatchEvent(new Event('input'));
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
    const rules = cachedGameRules || await fetchGameRules();
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

async function initTemplateDropdown() {
    const select = document.getElementById('template-select');
    if (!select) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; 

    const templates = await fetchTemplates(user.id);
    select.innerHTML = '<option value="">Select a saved template...</option>';
    templates.forEach(tmpl => {
        const opt = document.createElement('option');
        opt.value = tmpl.id; 
        opt.textContent = tmpl.title;
        select.appendChild(opt);
    });
}

// ==========================================
// 3. UI Logic (Tabs, Hours, Timezone)
// ==========================================

function initTabs() {
    // Delegate click for dynamic sidebar items
    const sidebarNav = document.getElementById('sidebar-nav');
    sidebarNav.addEventListener('click', (e) => {
        const item = e.target.closest('.nav-item');
        if (!item) return;

        // Visual Active State
        document.querySelectorAll('#sidebar-nav .nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');

        // Hide all sections
        document.querySelectorAll('.view-section').forEach(s => s.classList.add('hidden-section'));

        // Show target
        const targetId = item.dataset.target;
        const targetEl = document.getElementById(targetId);
        
        // Target element might be created dynamically, so we check existence
        if(targetEl) targetEl.classList.remove('hidden-section');
    });

    // Content Tabs (Input/Output inside sections)
    document.querySelectorAll('.content-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            tab.parentElement.querySelectorAll('.content-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const targetId = tab.dataset.subtab;
            if(!targetId) return; // For tabs without subtabs (like placeholders)

            const parent = tab.closest('.view-section');
            parent.querySelectorAll('.subtab-content').forEach(c => c.classList.add('hidden-section'));
            
            const subTarget = document.getElementById(targetId);
            if(subTarget) subTarget.classList.remove('hidden-section');
            
            if(targetId === 'ad-output') generateOutput();
        });
    });
}

function initHoursLogic() {
    const hoursInput = document.getElementById('header-hours');
    const sessionDisplay = document.getElementById('header-session-count');
    
    if(!hoursInput) return;

    const updateDisplay = () => {
        const totalHours = parseFloat(hoursInput.value) || 0;
        const count = calculateSessionCount(totalHours);
        if(sessionDisplay) sessionDisplay.textContent = count;
        
        updateSessionNavAndViews(count, totalHours);
    };

    hoursInput.addEventListener('input', updateDisplay);
}

/**
 * Core Logic: Creates Sidebar links AND Session Views (DOM)
 * Handles creating new tabs or removing old ones based on hours.
 */
function updateSessionNavAndViews(count, totalHours) {
    const navContainer = document.getElementById('dynamic-session-nav');
    const viewContainer = document.getElementById('session-views-container');
    if(!navContainer || !viewContainer) return;

    // 1. Determine current number of sessions
    const currentSessions = viewContainer.children.length;

    // 2. Add Sessions if needed
    if (count > currentSessions) {
        for (let i = currentSessions + 1; i <= count; i++) {
            // Sidebar Link
            const div = document.createElement('div');
            div.className = 'nav-item';
            div.dataset.target = `view-session-${i}`;
            div.textContent = `Session ${i}`;
            div.id = `nav-link-session-${i}`;
            navContainer.appendChild(div);

            // View DOM (Clone Template)
            const tmpl = document.getElementById('tpl-session-view');
            const clone = tmpl.content.cloneNode(true);
            const viewDiv = clone.querySelector('.session-view');
            
            viewDiv.id = `view-session-${i}`;
            viewDiv.dataset.sessionIndex = i;
            viewDiv.querySelector('.lbl-session-num').textContent = i;
            
            // Default Data logic
            const gameName = document.getElementById('header-game-name').value || "Game";
            viewDiv.querySelector('.inp-session-title').value = `${gameName} Part ${i}`;
            
            // Distribute Hours (Simple default)
            const hoursPerSession = distributeHours(totalHours, count);
            viewDiv.querySelector('.inp-session-hours').value = hoursPerSession;

            viewContainer.appendChild(viewDiv);

            // Initialize Listeners for this new specific view
            initSessionViewLogic(viewDiv, i);
        }
    } 
    // 3. Remove Sessions if needed (Truncate from end)
    else if (count < currentSessions) {
        for (let i = currentSessions; i > count; i--) {
            const nav = document.getElementById(`nav-link-session-${i}`);
            const view = document.getElementById(`view-session-${i}`);
            if(nav) nav.remove();
            if(view) view.remove();
        }
    }
}

/**
 * Initialize listeners for a specific Session View (Date logic, Player Table)
 */
function initSessionViewLogic(viewElement, index) {
    // 1. Date Converter for this session
    const dateInput = viewElement.querySelector('.inp-session-date');
    const unixInput = viewElement.querySelector('.inp-session-unix');
    
    // Default Date: Use main start date if Session 1
    if(index === 1) {
        const mainDate = document.getElementById('inp-start-datetime').value;
        if(mainDate) dateInput.value = mainDate;
    }

    const updateUnix = () => {
        // Always read the GLOBAL timezone select
        const tzVal = document.getElementById('inp-timezone').value;
        if(unixInput) unixInput.value = toUnixTimestamp(dateInput.value, tzVal);
    };
    dateInput.addEventListener('change', updateUnix);
    
    // 2. Sync Button (The Waterfall)
    const btnSync = viewElement.querySelector('.btn-sync-players');
    btnSync.addEventListener('click', () => {
        if(confirm("This will overwrite current player rows with data from the previous step. Continue?")) {
            syncSessionPlayers(viewElement, index);
        }
    });

    // 3. Add Player Button
    const btnAdd = viewElement.querySelector('.btn-add-session-player');
    btnAdd.addEventListener('click', () => {
        addSessionPlayerRow(viewElement.querySelector('.session-roster-body'), {}, index, viewElement);
    });

    // 4. Update XP when Hours change
    const hoursInput = viewElement.querySelector('.inp-session-hours');
    hoursInput.addEventListener('change', () => recalculateSessionXP(viewElement));
}

// ==========================================
// 4. Session Player Logic (Waterfall & XP)
// ==========================================

function syncSessionPlayers(viewElement, sessionIndex) {
    const tbody = viewElement.querySelector('.session-roster-body');
    tbody.innerHTML = ''; // Clear current

    let sourceData = [];

    if (sessionIndex === 1) {
        // Source is Master Roster (Setup Tab)
        sourceData = getPlayerRosterData(); 
    } else {
        // Source is Previous Session
        const prevView = document.getElementById(`view-session-${sessionIndex - 1}`);
        if(prevView) {
            sourceData = getSessionRosterData(prevView);
        }
    }

    sourceData.forEach(p => {
        // Logic: Increment games played
        let nextGames = "1";
        const currentGames = p.games_count;

        if (currentGames === "10+") {
            nextGames = "10+";
        } else {
            const g = parseInt(currentGames) || 0;
            // Cap at 10, then use "10+" as the next step
            if (g >= 9) nextGames = "10"; // Or should it be 10+? Logic says "stop at 10+"
            // If they had 9, next is 10. If they had 10, next is 10+? 
            // Simplified:
            nextGames = (g + 1).toString();
            if (g >= 10) nextGames = "10+";
        }

        const newRowData = {
            discord_id: p.discord_id,
            character_name: p.character_name,
            level: p.level,
            games_count: nextGames,
            loot: "",
            notes: ""
        };
        addSessionPlayerRow(tbody, newRowData, sessionIndex, viewElement);
    });
    
    // Recalc XP after sync
    recalculateSessionXP(viewElement);
}

function addSessionPlayerRow(tbody, data = {}, sessionIndex, viewContext) {
    const tr = document.createElement('tr');
    tr.className = 'session-player-row';
    
    tr.innerHTML = `
        <td><input type="text" class="table-input s-discord-id" value="${data.discord_id || ''}"></td>
        <td><input type="text" class="table-input s-char-name" value="${data.character_name || ''}"></td>
        <td><input type="number" class="table-input s-level" style="width:50px" value="${data.level || ''}"></td>
        <td><input type="text" class="table-input s-games" style="width:50px" value="${data.games_count || ''}"></td>
        <td><input type="text" class="table-input s-xp" style="width:60px" readonly placeholder="Auto"></td>
        <td><textarea class="table-input s-loot" rows="1">${data.loot || ''}</textarea></td>
        <td><textarea class="table-input s-notes" rows="1">${data.notes || ''}</textarea></td>
        <td style="text-align:center;">
            <button class="button button-danger btn-sm btn-delete-row">&times;</button>
        </td>
    `;

    // Listeners
    tr.querySelector('.btn-delete-row').addEventListener('click', () => tr.remove());
    
    // Recalc XP if Level changes
    tr.querySelector('.s-level').addEventListener('input', () => {
        if(viewContext) recalculateSessionXP(viewContext);
    });

    tbody.appendChild(tr);
    
    // Trigger calc for this row immediately if context provided
    if (viewContext && data.level) recalculateSessionXP(viewContext);
}

function getSessionRosterData(viewElement) {
    const rows = viewElement.querySelectorAll('.session-player-row');
    const players = [];
    rows.forEach(row => {
        players.push({
            discord_id: row.querySelector('.s-discord-id').value,
            character_name: row.querySelector('.s-char-name').value,
            level: row.querySelector('.s-level').value,
            games_count: row.querySelector('.s-games').value,
            xp: row.querySelector('.s-xp').value,
            loot: row.querySelector('.s-loot').value,
            notes: row.querySelector('.s-notes').value
        });
    });
    return players;
}

function recalculateSessionXP(viewElement) {
    if (!cachedGameRules) return; 
    const hours = parseFloat(viewElement.querySelector('.inp-session-hours').value) || 0;
    
    viewElement.querySelectorAll('.session-player-row').forEach(row => {
        const lvl = parseInt(row.querySelector('.s-level').value) || 0;
        const xpInput = row.querySelector('.s-xp');
        const xp = calculateXP(lvl, hours, cachedGameRules);
        xpInput.value = xp;
    });
}

// ==========================================
// 5. Existing Utilities & Helpers (Global Date/TZ)
// ==========================================

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
// 6. Master Player Roster Logic (PC/DMPC)
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
// 7. Template & Saving Logic
// ==========================================

function initTemplateLogic() {
    const modal = document.getElementById('modal-save-template');
    const btnOpen = document.getElementById('btn-open-save-template');
    const btnConfirm = document.getElementById('btn-confirm-save-template');
    const btnLoad = document.getElementById('btn-load-template');
    const btnSaveGame = document.getElementById('btn-save-game');

    // Open Modal
    if(btnOpen) {
        btnOpen.addEventListener('click', () => modal.showModal());
    }

    // CONFIRM SAVE TEMPLATE
    if(btnConfirm) {
        btnConfirm.addEventListener('click', async () => {
            const tmplName = document.getElementById('inp-template-name').value;
            if(!tmplName) return alert("Enter a name");

            const { data: { user } } = await supabase.auth.getUser();
            if(!user) return alert("Please login");

            // 1. Get All Data
            const fullData = getFormData();

            // 2. Filter Data for Template (Remove specific fields)
            const templateData = prepareTemplateData(fullData);
            
            try {
                // Save with the filtered data
                await saveAsTemplate(user.id, tmplName, templateData);
                
                alert("Template Saved!");
                modal.close();
                
                // Add to dropdown immediately
                const select = document.getElementById('template-select');
                const opt = document.createElement('option');
                opt.text = tmplName; 
                select.appendChild(opt);
            } catch (e) {
                console.error(e);
                alert("Error saving template");
            }
        });
    }

    // LOAD TEMPLATE
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
    
    // SAVE GAME (Top Button)
    if(btnSaveGame) {
        btnSaveGame.addEventListener('click', async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const sessionId = urlParams.get('id');

            // 1. Get Full Data (No filtering)
            const formData = getFormData();
            
            // 2. Extract Metadata for SQL Columns (title, date)
            const title = document.getElementById('header-game-name').value || "Untitled Session";
            const dateInput = document.getElementById('inp-start-datetime');
            const date = dateInput && dateInput.value ? new Date(dateInput.value).toISOString().split('T')[0] : null;

            if (sessionId) {
                // Save Full Session
                await saveSession(sessionId, formData, { title, date });
                
                // Visual Feedback
                const btn = document.getElementById('btn-save-game');
                const originalText = btn.innerText;
                btn.innerText = "Saved!";
                btn.classList.add('button-success'); 
                setTimeout(() => {
                    btn.innerText = originalText;
                    btn.classList.remove('button-success');
                }, 1500);
            } else {
                alert("Session ID missing. Please create a session from the dashboard first.");
            }
        });
    }
}

/**
 * Helper to strip specific data for Templates
 */
function prepareTemplateData(originalData) {
    const data = JSON.parse(JSON.stringify(originalData));

    if (data.header) {
        data.header.game_datetime = null; 
        data.header.listing_url = "";
        data.header.lobby_url = "";
    }

    data.players = []; 
    data.dm = {
        character_name: "",
        level: "",
        games_count: "0"
    };
    data.sessions = [];

    return data;
}

// ==========================================
// 8. Form Handling (Get/Populate)
// ==========================================

function getFormData() {
    const val = (id) => document.getElementById(id) ? document.getElementById(id).value : "";
    const eventSelect = document.getElementById('inp-event');
    const selectedEvents = eventSelect ? Array.from(eventSelect.selectedOptions).map(opt => opt.value) : [];

    // NEW: Scrape Sessions Data
    const sessionsData = [];
    const sessionViews = document.querySelectorAll('.session-view');
    sessionViews.forEach(view => {
        sessionsData.push({
            session_index: view.dataset.sessionIndex,
            title: view.querySelector('.inp-session-title').value,
            hours: view.querySelector('.inp-session-hours').value,
            date_time: view.querySelector('.inp-session-unix').value, 
            notes: view.querySelector('.inp-session-notes').value,
            players: getSessionRosterData(view)
        });
    });

    return {
        header: {
            game_datetime: val('inp-unix-time'),
            timezone: val('inp-timezone'),
            intended_duration: val('inp-duration-text'),
            game_description: val('inp-description'), 
            game_version: val('inp-version'),
            game_type: val('inp-format'),
            apps_type: val('inp-apps-type'),
            platform: val('inp-platform'),
            event_tags: selectedEvents, 
            tier: val('inp-tier'),
            apl: val('inp-apl'),
            party_size: val('inp-party-size'),
            tone: val('inp-tone'),
            focus: val('inp-focus'),
            encounter_difficulty: val('inp-diff-encounter'),
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
            character_name: val('inp-dm-char-name'),
            level: val('inp-dm-level'),
            games_count: val('inp-dm-games-count')
        },
        sessions: sessionsData // Saving new session array
    };
}

function populateForm(session) {
    if(session.title) {
        const titleEl = document.getElementById('header-game-name');
        if(titleEl) titleEl.value = session.title;
    }
    
    if (!session.form_data) return;

    const setVal = (id, val) => { 
        const el = document.getElementById(id); 
        if(el) {
            el.value = val || ""; 
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }
    };

    // 1. Populate Header Fields
    if (session.form_data.header) {
        const h = session.form_data.header;
        
        setVal('inp-unix-time', h.game_datetime);
        setVal('inp-timezone', h.timezone);
        
        if(h.game_datetime && h.timezone) {
            const dateStr = unixToLocalIso(h.game_datetime, h.timezone);
            setVal('inp-start-datetime', dateStr);
        }
        
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

        const eventSelect = document.getElementById('inp-event');
        if (eventSelect && Array.isArray(h.event_tags)) {
            Array.from(eventSelect.options).forEach(opt => {
                opt.selected = h.event_tags.includes(opt.value);
            });
        }

        setVal('inp-focus', h.focus);
        setVal('inp-diff-threat', h.threat_level);
        setVal('inp-diff-loss', h.char_loss);
        setVal('inp-houserules', h.house_rules);
        setVal('inp-notes', h.notes);
        setVal('inp-warnings', h.warnings);
        setVal('inp-apply', h.how_to_apply);
    }

    // 2. Populate Master Player Roster
    const tbody = document.getElementById('roster-body');
    if (tbody) {
        tbody.innerHTML = ''; 
        if (session.form_data.players && Array.isArray(session.form_data.players)) {
            session.form_data.players.forEach(player => {
                addPlayerRow(player);
            });
        }
    }

    // 3. Populate DM Details
    if (session.form_data.dm) {
        const d = session.form_data.dm;
        setVal('inp-dm-char-name', d.character_name);
        setVal('inp-dm-level', d.level);
        setVal('inp-dm-games-count', d.games_count);
    }
    
    // 4. Populate Dynamic Sessions
    if (session.form_data.sessions && Array.isArray(session.form_data.sessions)) {
        const count = session.form_data.sessions.length;
        // Total hours fallback if not explicitly saved (simplified)
        const totalHours = parseFloat(document.getElementById('header-hours').value) || (count * 3); 
        
        // Force create views
        updateSessionNavAndViews(count, totalHours);

        // Fill Views
        session.form_data.sessions.forEach((sData, i) => {
            const index = i + 1;
            const view = document.getElementById(`view-session-${index}`);
            if(!view) return;

            view.querySelector('.inp-session-title').value = sData.title;
            view.querySelector('.inp-session-hours').value = sData.hours;
            view.querySelector('.inp-session-notes').value = sData.notes || "";
            
            if(sData.date_time) {
                view.querySelector('.inp-session-unix').value = sData.date_time;
                const tz = document.getElementById('inp-timezone').value;
                view.querySelector('.inp-session-date').value = unixToLocalIso(sData.date_time, tz);
            }

            const sTbody = view.querySelector('.session-roster-body');
            sTbody.innerHTML = '';
            if(sData.players) {
                sData.players.forEach(p => addSessionPlayerRow(sTbody, p, index, view));
            }
        });
    }

    generateOutput();
}

/**
 * Helper: Converts Unix Timestamp back to "YYYY-MM-DDTHH:MM" 
 */
function unixToLocalIso(unixSeconds, timeZone) {
    try {
        const date = new Date(unixSeconds * 1000);
        // Use en-CA because it formats as YYYY-MM-DD
        const fmt = new Intl.DateTimeFormat('en-CA', {
            timeZone: timeZone,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hour12: false
        });
        
        const parts = fmt.formatToParts(date);
        const get = (t) => parts.find(p => p.type === t).value;
        
        return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
    } catch(e) {
        console.error("Date conversion error", e);
        return "";
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
**Description:**
${data.game_description || 'N/A'}

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

**House Rules:**
${data.house_rules || 'N/A'}

**Notes:**
${data.notes || 'N/A'}

**Content Warnings:**
${data.warnings || 'N/A'}

**How to Apply:**
${data.how_to_apply || 'Post your application below.'}
\`\`\``;
    
    const outListing = document.getElementById('out-listing-text');
    if(outListing) outListing.value = listingText;

    // --- GAME AD ---
    const adText = `\`\`\`
> **Name:** ${name}
**Version and Format:** ${data.game_version} / ${data.game_type}
**Tier and APL:** ${data.tier || 'N/A'} , APL ${data.apl || 'N/A'}
**Start Time and Duration:** ${timeString} (${data.intended_duration || 'N/A'})
**Listing:** ${data.listing_url || 'N/A'}
**Description:**
${data.game_description || ''}
\`\`\``;

    const outAd = document.getElementById('out-ad-text');
    if(outAd) outAd.value = adText; 
}