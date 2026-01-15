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
        // Force initial update. If default is 0, this sets count to 0 (no tabs).
        // If user enters 13.5, it triggers logic.
        const hoursInput = document.getElementById('header-hours');
        if(hoursInput) {
            hoursInput.dispatchEvent(new Event('input')); 
        }
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
    const sidebarNav = document.getElementById('sidebar-nav');
    sidebarNav.addEventListener('click', (e) => {
        const item = e.target.closest('.nav-item');
        if (!item) return;

        document.querySelectorAll('#sidebar-nav .nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');

        document.querySelectorAll('.view-section').forEach(s => s.classList.add('hidden-section'));

        const targetId = item.dataset.target;
        const targetEl = document.getElementById(targetId);
        if(targetEl) targetEl.classList.remove('hidden-section');
    });

    document.querySelectorAll('.content-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            tab.parentElement.querySelectorAll('.content-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const targetId = tab.dataset.subtab;
            if(!targetId) return; 

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
    // Note: Do not call updateDisplay() here, let the main init handle it
}

/**
 * Core Logic: Creates Sidebar links AND Session Views (DOM)
 */
function updateSessionNavAndViews(count, totalHours) {
    const navContainer = document.getElementById('dynamic-session-nav');
    const viewContainer = document.getElementById('session-views-container');
    if(!navContainer || !viewContainer) return;

    let createdNew = false;

    // 1. Loop desired count
    for (let i = 1; i <= count; i++) {
        // Prevent duplicate creation
        if (document.getElementById(`view-session-${i}`)) {
            // Update duration if it changed (e.g. from 3.0 to 4.5)
            // But strict rule: only LAST session changes. 
            // We'll update the value just in case.
            const existingView = document.getElementById(`view-session-${i}`);
            let sessionDur = 3.0;
            if (i === count) {
                sessionDur = totalHours - (3 * (i - 1));
                sessionDur = Math.round(sessionDur * 10) / 10;
            }
            existingView.querySelector('.inp-session-hours').value = sessionDur;
            continue; 
        }

        createdNew = true;

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
        
        // Duration Logic
        let sessionDur = 3.0;
        if (i === count) {
            sessionDur = totalHours - (3 * (i - 1));
            sessionDur = Math.round(sessionDur * 10) / 10;
        }
        viewDiv.querySelector('.inp-session-hours').value = sessionDur;

        viewContainer.appendChild(viewDiv);

        // Initialize Listeners for this new specific view
        initSessionViewLogic(viewDiv, i);

        // AUTO-SYNC ROSTER ON CREATION
        syncSessionPlayers(viewDiv, i);
    }

    // 2. Remove Excess Sessions
    const currentViews = viewContainer.querySelectorAll('.session-view');
    const currentCount = currentViews.length;

    if (currentCount > count) {
        for (let i = currentCount; i > count; i--) {
            const nav = document.getElementById(`nav-link-session-${i}`);
            const view = document.getElementById(`view-session-${i}`);
            if(nav) nav.remove();
            if(view) view.remove();
        }
    }

    // 3. Auto-Select Session 1 if created and nothing active
    if (createdNew && count === 1) {
        // If we just made session 1, and there are no other sessions...
        const activeNav = document.querySelector('#sidebar-nav .nav-item.active');
        // If the user was on the Ad tab, we might want to stay there. 
        // But the user complained about it being hidden. 
        // Let's switch ONLY if we just went from 0 sessions to 1.
        const s1Link = document.getElementById('nav-link-session-1');
        if (s1Link && (!activeNav || !activeNav.id.includes('session'))) {
            s1Link.click();
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
        const tzVal = document.getElementById('inp-timezone').value;
        if(unixInput) unixInput.value = toUnixTimestamp(dateInput.value, tzVal);
    };
    dateInput.addEventListener('change', updateUnix);
    
    // 2. Sync Button
    const btnSync = viewElement.querySelector('.btn-sync-players');
    btnSync.addEventListener('click', () => {
        if(confirm("Reset this roster to match the previous session? Current data will be lost.")) {
            syncSessionPlayers(viewElement, index);
        }
    });

    // 3. Add Player Button
    const btnAdd = viewElement.querySelector('.btn-add-session-player');
    btnAdd.addEventListener('click', () => {
        addSessionPlayerRow(viewElement.querySelector('.session-roster-body'), {}, index, viewElement);
    });
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
            if (g >= 9) nextGames = "10"; 
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
    
    recalculateSessionXP(viewElement);
}

// NEW: Generates 3 Rows per Player (Grouped by Tbody)
function addSessionPlayerRow(tableContainer, data = {}, sessionIndex, viewContext) {
    // Note: tableContainer passed here is the main TBODY of the table, 
    // but we want to append a whole NEW TBODY for this player to group the 3 rows.
    // However, HTML doesn't allow nested TBODYs.
    // Actually, HTML allows multiple TBODYs in a TABLE. 
    // So 'session-roster-body' should likely be the TABLE itself or we append adjacent TBODYs.
    // But our HTML template has <tbody class="session-roster-body">.
    // We will append a TBODY to the TABLE, not the existing tbody.
    
    // Fix: We need to find the TABLE, not just the tbody, if we want multiple tbodies.
    // OR we just append 3 TRs to the single tbody and style them.
    // Let's stick to appending 3 TRs to the existing tbody and use classes to style boundaries.

    const tbody = viewContext.querySelector('.session-roster-body');
    
    // Create a wrapper class for these 3 rows? No, just add them.
    
    const sessionHours = viewContext.querySelector('.inp-session-hours').value || "0";
    const rowHours = data.hours || sessionHours;

    // --- ROW 1: STATS ---
    const tr1 = document.createElement('tr');
    tr1.className = 'player-row-main';
    tr1.style.borderTop = "2px solid var(--color-border)";
    tr1.innerHTML = `
        <td style="vertical-align:top;">
            <input type="text" class="table-input s-discord-id" placeholder="Discord ID" value="${data.discord_id || ''}" style="margin-bottom:4px;">
            <input type="text" class="table-input s-char-name" placeholder="Character Name" value="${data.character_name || ''}">
        </td>
        <td style="vertical-align:top;"><input type="number" class="table-input s-level" value="${data.level || ''}"></td>
        <td style="vertical-align:top;"><input type="text" class="table-input s-games" value="${data.games_count || ''}"></td>
        <td style="vertical-align:top;"><input type="number" class="table-input s-hours" value="${rowHours}" step="0.5"></td>
        <td style="vertical-align:top;"><input type="text" class="table-input s-xp" readonly placeholder="XP"></td>
        <td style="vertical-align:top;"><input type="text" class="table-input s-dtp" readonly placeholder="DTP"></td>
        
        <td colspan="2" style="vertical-align:top; background: rgba(0,0,0,0.02);">
            <div style="font-size:0.8em; font-weight:bold; margin-bottom:2px;">Incentives</div>
            <select class="table-input s-incentives" multiple style="height: 60px;">
                <option value="New Player">New Player</option>
                <option value="Server Boost">Server Boost</option>
                <option value="Birthday">Birthday</option>
            </select>
        </td>
        <td style="vertical-align:top; text-align:center;">
             <button class="button button-danger btn-sm btn-delete-row" style="height:100%;">&times;</button>
        </td>
    `;

    // --- ROW 2: LOOT ---
    const tr2 = document.createElement('tr');
    tr2.innerHTML = `
        <td colspan="6" style="text-align:right; vertical-align:middle; font-size:0.9em; font-weight:bold; color:var(--color-text-secondary);">Rewards & Items:</td>
        <td colspan="2">
            <input type="text" class="table-input s-loot" placeholder="Loot Rewarded" value="${data.loot || ''}" style="margin-bottom:4px;">
            <input type="text" class="table-input s-items" placeholder="Items Used" value="${data.items_used || ''}">
        </td>
        <td></td>
    `;

    // --- ROW 3: NOTES ---
    const tr3 = document.createElement('tr');
    tr3.innerHTML = `
        <td colspan="6" style="text-align:right; vertical-align:top; font-size:0.9em; font-weight:bold; color:var(--color-text-secondary); padding-top:10px;">Notes:</td>
        <td colspan="2">
            <textarea class="table-input s-notes" rows="2" placeholder="Session Notes / Comments">${data.notes || ''}</textarea>
        </td>
        <td></td>
    `;

    // Logic to delete all 3 rows
    tr1.querySelector('.btn-delete-row').addEventListener('click', () => {
        tr1.remove();
        tr2.remove();
        tr3.remove();
    });

    // Recalc Listeners
    tr1.querySelector('.s-level').addEventListener('input', () => recalculateSessionXP(viewContext));
    tr1.querySelector('.s-hours').addEventListener('input', () => recalculateSessionXP(viewContext));

    tbody.appendChild(tr1);
    tbody.appendChild(tr2);
    tbody.appendChild(tr3);
    
    if (viewContext && data.level) recalculateSessionXP(viewContext);
}

function getSessionRosterData(viewElement) {
    // We select only the MAIN rows to iterate logic
    const rows = viewElement.querySelectorAll('.player-row-main');
    const players = [];
    rows.forEach(row => {
        // Find sibling rows
        const row2 = row.nextElementSibling;
        const row3 = row2.nextElementSibling;

        // Get Incentives (Multi)
        const incentiveSelect = row.querySelector('.s-incentives');
        const incentives = Array.from(incentiveSelect.selectedOptions).map(o => o.value);

        players.push({
            discord_id: row.querySelector('.s-discord-id').value,
            character_name: row.querySelector('.s-char-name').value,
            level: row.querySelector('.s-level').value,
            games_count: row.querySelector('.s-games').value,
            hours: row.querySelector('.s-hours').value,
            xp: row.querySelector('.s-xp').value,
            dtp: row.querySelector('.s-dtp').value,
            incentives: incentives,
            loot: row2.querySelector('.s-loot').value,
            items_used: row2.querySelector('.s-items').value,
            notes: row3.querySelector('.s-notes').value
        });
    });
    return players;
}

function recalculateSessionXP(viewElement) {
    if (!cachedGameRules) return; 
    
    viewElement.querySelectorAll('.player-row-main').forEach(row => {
        const lvl = parseInt(row.querySelector('.s-level').value) || 0;
        const playerHours = parseFloat(row.querySelector('.s-hours').value) || 0;
        
        const xpInput = row.querySelector('.s-xp');
        const dtpInput = row.querySelector('.s-dtp');

        const xp = calculateXP(lvl, playerHours, cachedGameRules);
        const dtp = 5 * playerHours; // Fixed rule

        xpInput.value = xp;
        dtpInput.value = dtp;
    });
}

// ==========================================
// 5. Existing Utilities & Helpers (Global Date/TZ)
// ==========================================
// (Standard utilities unchanged, included for completeness)
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
    let timezones = Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : ["UTC", "America/New_York"];
    if (!timezones.includes(userTz)) timezones.push(userTz);
    timezones.sort().forEach(tz => {
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
    let gamesOptions = '';
    for(let i=0; i<=10; i++) {
        const val = i.toString();
        const selected = (data.games_count === val) ? 'selected' : '';
        gamesOptions += `<option value="${val}" ${selected}>${val}</option>`;
    }
    gamesOptions += `<option value="10+" ${data.games_count === '10+' ? 'selected' : ''}>10+</option>`;

    tr.innerHTML = `
        <td><input type="text" class="table-input inp-discord-id" placeholder="Discord ID" value="${data.discord_id || ''}"></td>
        <td><input type="text" class="table-input inp-char-name" placeholder="Character Name" value="${data.character_name || ''}"></td>
        <td><input type="number" class="table-input inp-level" placeholder="Lvl" value="${data.level || ''}"></td>
        <td><select class="table-input inp-games-count">${gamesOptions}</select></td>
        <td style="text-align:center;"><button class="button button-danger btn-sm btn-delete-row">&times;</button></td>
    `;
    tr.querySelector('.btn-delete-row').addEventListener('click', () => tr.remove());
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

    if(btnOpen) btnOpen.addEventListener('click', () => modal.showModal());

    if(btnConfirm) {
        btnConfirm.addEventListener('click', async () => {
            const tmplName = document.getElementById('inp-template-name').value;
            if(!tmplName) return alert("Enter a name");
            const { data: { user } } = await supabase.auth.getUser();
            if(!user) return alert("Please login");

            const fullData = getFormData();
            const templateData = prepareTemplateData(fullData);
            
            try {
                await saveAsTemplate(user.id, tmplName, templateData);
                alert("Template Saved!");
                modal.close();
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

function prepareTemplateData(originalData) {
    const data = JSON.parse(JSON.stringify(originalData));
    if (data.header) {
        data.header.game_datetime = null; 
        data.header.listing_url = "";
        data.header.lobby_url = "";
    }
    data.players = []; 
    data.dm = { character_name: "", level: "", games_count: "0" };
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
        sessions: sessionsData
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

    const tbody = document.getElementById('roster-body');
    if (tbody) {
        tbody.innerHTML = ''; 
        if (session.form_data.players && Array.isArray(session.form_data.players)) {
            session.form_data.players.forEach(player => {
                addPlayerRow(player);
            });
        }
    }

    if (session.form_data.dm) {
        const d = session.form_data.dm;
        setVal('inp-dm-char-name', d.character_name);
        setVal('inp-dm-level', d.level);
        setVal('inp-dm-games-count', d.games_count);
    }
    
    if (session.form_data.sessions && Array.isArray(session.form_data.sessions)) {
        const count = session.form_data.sessions.length;
        const totalHours = parseFloat(document.getElementById('header-hours').value) || (count * 3); 
        
        updateSessionNavAndViews(count, totalHours);

        session.form_data.sessions.forEach((sData, i) => {
            const index = i + 1;
            const view = document.getElementById(`view-session-${index}`);
            if(!view) return;

            view.querySelector('.inp-session-title').value = sData.title;
            // Respect saved hours or default
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

function unixToLocalIso(unixSeconds, timeZone) {
    try {
        const date = new Date(unixSeconds * 1000);
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
    // (Unchanged from previous versions)
    const data = getFormData().header;
    const unixTime = document.getElementById('inp-unix-time').value;
    const name = document.getElementById('header-game-name').value || "Untitled";
    
    let timeString = "TBD";
    if (unixTime && unixTime > 0) {
        timeString = `<t:${unixTime}:F>`;
    }

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