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

let cachedGameRules = null; 
let activeIncentiveRowData = null; 

document.addEventListener('DOMContentLoaded', async () => {
    cachedGameRules = await fetchGameRules();

    initTabs();
    initTimezone();
    initHoursLogic();
    initDateTimeConverter(); 
    initTemplateLogic();
    initPlayerRoster(); 
    initIncentivesModal(); 
    
    await initDynamicDropdowns(); 
    await initEventsDropdown(); 
    await initTemplateDropdown(); 

    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('id');

    if (sessionId) {
        await loadSessionData(sessionId);
    } else {
        const hoursInput = document.getElementById('header-hours');
        if(hoursInput) {
            hoursInput.dispatchEvent(new Event('input')); 
        }
    }
});

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

// ... (Dropdown Inits same as before) ...
async function initDynamicDropdowns() {
    const rules = cachedGameRules || await fetchGameRules();
    if (!rules || !rules.options) return;
    const fillSelect = (id, options) => {
        const select = document.getElementById(id);
        if (!select) return;
        select.innerHTML = '<option value="">Select...</option>';
        options.forEach(opt => {
            const el = document.createElement('option');
            el.value = opt; el.textContent = opt; select.appendChild(el);
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
        el.value = evt.name; el.textContent = evt.name; select.appendChild(el);
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
        opt.value = tmpl.id; opt.textContent = tmpl.title; select.appendChild(opt);
    });
}

// ... (Tabs and Hours Logic) ...
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
}

// ... (updateSessionNavAndViews Logic) ...
function updateSessionNavAndViews(count, totalHours) {
    const navContainer = document.getElementById('dynamic-session-nav');
    const viewContainer = document.getElementById('session-views-container');
    if(!navContainer || !viewContainer) return;

    let createdNew = false;

    for (let i = 1; i <= count; i++) {
        let sessionDur = 3.0;
        if (i === count) {
            sessionDur = totalHours - (3 * (i - 1));
            sessionDur = Math.round(sessionDur * 10) / 10;
        }

        if (document.getElementById(`view-session-${i}`)) {
            const existingView = document.getElementById(`view-session-${i}`);
            const currentVal = parseFloat(existingView.querySelector('.inp-session-hours').value);
            
            if (currentVal !== sessionDur) {
                existingView.querySelector('.inp-session-hours').value = sessionDur;
                existingView.querySelectorAll('.player-card').forEach(card => {
                    const hInput = card.querySelector('.s-hours');
                    if(hInput) hInput.value = sessionDur;
                });
                updateSessionCalculations(existingView);
            }
            continue; 
        }

        createdNew = true;
        const div = document.createElement('div');
        div.className = 'nav-item';
        div.dataset.target = `view-session-${i}`;
        div.textContent = `Session ${i}`;
        div.id = `nav-link-session-${i}`;
        navContainer.appendChild(div);

        const tmpl = document.getElementById('tpl-session-view');
        const clone = tmpl.content.cloneNode(true);
        const viewDiv = clone.querySelector('.session-view');
        
        viewDiv.id = `view-session-${i}`;
        viewDiv.dataset.sessionIndex = i;
        viewDiv.querySelector('.lbl-session-num').textContent = i;
        
        const gameName = document.getElementById('header-game-name').value || "Game";
        viewDiv.querySelector('.inp-session-title').value = `${gameName} Part ${i}`;
        viewDiv.querySelector('.inp-session-hours').value = sessionDur;

        viewContainer.appendChild(viewDiv);
        initSessionViewLogic(viewDiv, i);
        syncSessionPlayers(viewDiv, i);
    }

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

    if (createdNew && count === 1) {
        const s1Link = document.getElementById('nav-link-session-1');
        if (s1Link) s1Link.click();
    }
}

function initSessionViewLogic(viewElement, index) {
    const dateInput = viewElement.querySelector('.inp-session-date');
    const unixInput = viewElement.querySelector('.inp-session-unix');
    if(index === 1) {
        const mainDate = document.getElementById('inp-start-datetime').value;
        if(mainDate) dateInput.value = mainDate;
    }
    const updateUnix = () => {
        const tzVal = document.getElementById('inp-timezone').value;
        if(unixInput) unixInput.value = toUnixTimestamp(dateInput.value, tzVal);
    };
    dateInput.addEventListener('change', updateUnix);
    
    const btnSync = viewElement.querySelector('.btn-sync-players');
    btnSync.addEventListener('click', () => {
        if(confirm("Reset this roster? Current data will be lost.")) {
            syncSessionPlayers(viewElement, index);
        }
    });

    const btnAdd = viewElement.querySelector('.btn-add-session-player');
    btnAdd.addEventListener('click', () => {
        // Target the DIV list now
        addSessionPlayerRow(viewElement.querySelector('.player-roster-list'), {}, index, viewElement);
    });
}

function syncSessionPlayers(viewElement, sessionIndex) {
    const listContainer = viewElement.querySelector('.player-roster-list');
    listContainer.innerHTML = ''; // Clear div cards

    let sourceData = [];
    if (sessionIndex === 1) {
        sourceData = getPlayerRosterData(); 
    } else {
        const prevView = document.getElementById(`view-session-${sessionIndex - 1}`);
        if(prevView) sourceData = getSessionRosterData(prevView);
    }

    sourceData.forEach(p => {
        let nextGames = "1";
        const currentGames = p.games_count;
        if (currentGames === "10+") nextGames = "10+";
        else {
            const g = parseInt(currentGames) || 0;
            nextGames = (g + 1).toString();
            if (g >= 10) nextGames = "10+";
        }

        const newRowData = {
            discord_id: p.discord_id,
            character_name: p.character_name,
            level: p.level,
            games_count: nextGames,
            loot: "",
            gold: "",
            items_used: "",
            notes: ""
        };
        addSessionPlayerRow(listContainer, newRowData, sessionIndex, viewElement);
    });
    
    updateSessionCalculations(viewElement);
}

// === NEW: CARD BUILDER ===
function addSessionPlayerRow(listContainer, data = {}, sessionIndex, viewContext) {
    const sessionHours = viewContext.querySelector('.inp-session-hours').value || "0";
    const rowHours = data.hours || sessionHours;
    
    const currentIncentives = data.incentives || [];
    const incentivesJson = JSON.stringify(currentIncentives);
    
    const playerNum = listContainer.children.length + 1;

    const card = document.createElement('div');
    card.className = 'player-card';

    card.innerHTML = `
        <div class="player-card-header">
            <span class="player-card-title">Player ${playerNum}</span>
            <button class="btn-delete-card" title="Remove">&times;</button>
        </div>
        <div class="player-card-body">
            <div class="card-row">
                <div class="card-field w-30">
                    <label class="field-label">Discord ID</label>
                    <input type="text" class="table-input s-discord-id" value="${data.discord_id || ''}">
                </div>
                <div class="card-field w-30">
                    <label class="field-label">Character Name</label>
                    <input type="text" class="table-input s-char-name" value="${data.character_name || ''}">
                </div>
                <div class="card-field w-20 error-container">
                    <label class="field-label">Hours</label>
                    <input type="number" class="table-input s-hours" value="${rowHours}" step="0.5">
                    <div class="validation-msg">Exceeds Session</div>
                </div>
                <div class="card-field w-20">
                    <label class="field-label"># Games</label>
                    <input type="text" class="table-input s-games" value="${data.games_count || ''}">
                </div>
            </div>

            <div class="card-row">
                <div class="card-field w-20">
                    <label class="field-label">Level</label>
                    <input type="number" class="table-input s-level" value="${data.level || ''}">
                </div>
                <div class="card-field w-20">
                    <label class="field-label">XP Earned</label>
                    <input type="text" class="table-input readonly-result s-xp" readonly placeholder="Auto">
                </div>
                <div class="card-field w-30 error-container">
                    <label class="field-label">Gold</label>
                    <input type="text" class="table-input s-gold" value="${data.gold || ''}" placeholder="GP">
                    <div class="validation-msg">Max <span class="val-max-msg"></span>gp</div>
                </div>
                <div class="card-field w-30">
                    <label class="field-label">DTP / Incentives</label>
                    <div class="dtp-wrapper">
                        <input type="text" class="table-input readonly-result s-dtp" readonly placeholder="DTP">
                        <button class="button button-secondary s-incentives-btn" data-incentives='${incentivesJson}'>+</button>
                    </div>
                </div>
            </div>

            <div class="card-row">
                <div class="card-field w-50">
                    <label class="field-label">Loot Rewarded</label>
                    <input type="text" class="table-input s-loot" value="${data.loot || ''}">
                </div>
                <div class="card-field w-50">
                    <label class="field-label">Items Used</label>
                    <input type="text" class="table-input s-items" value="${data.items_used || ''}">
                </div>
            </div>

            <div class="card-row">
                <div class="card-field w-100">
                    <label class="field-label">Notes</label>
                    <textarea class="table-input s-notes" rows="1">${data.notes || ''}</textarea>
                </div>
            </div>
        </div>
    `;

    // Listeners
    card.querySelector('.btn-delete-card').addEventListener('click', () => {
        card.remove();
        updateSessionCalculations(viewContext);
        // Renumber logic could go here
    });

    card.querySelector('.s-hours').addEventListener('input', () => updateSessionCalculations(viewContext));
    card.querySelector('.s-level').addEventListener('input', () => updateSessionCalculations(viewContext));
    card.querySelector('.s-gold').addEventListener('input', () => updateSessionCalculations(viewContext));
    
    const btnIncentives = card.querySelector('.s-incentives-btn');
    btnIncentives.addEventListener('click', () => {
        openIncentivesModal(btnIncentives, viewContext);
    });

    listContainer.appendChild(card);
    
    if (viewContext && data.level) updateSessionCalculations(viewContext);
}

function getSessionRosterData(viewElement) {
    const cards = viewElement.querySelectorAll('.player-card');
    const players = [];
    cards.forEach(card => {
        const btn = card.querySelector('.s-incentives-btn');
        const incentives = JSON.parse(btn.dataset.incentives || '[]');
        players.push({
            discord_id: card.querySelector('.s-discord-id').value,
            character_name: card.querySelector('.s-char-name').value,
            level: card.querySelector('.s-level').value,
            games_count: card.querySelector('.s-games').value,
            hours: card.querySelector('.s-hours').value,
            xp: card.querySelector('.s-xp').value,
            gold: card.querySelector('.s-gold').value,
            dtp: card.querySelector('.s-dtp').value,
            incentives: incentives,
            loot: card.querySelector('.s-loot').value,
            items_used: card.querySelector('.s-items').value,
            notes: card.querySelector('.s-notes').value
        });
    });
    return players;
}

function updateSessionCalculations(viewElement) {
    if (!cachedGameRules) return; 
    
    // 1. Calculate APL
    let totalLevel = 0;
    let playerCount = 0;
    const cards = viewElement.querySelectorAll('.player-card');
    cards.forEach(card => {
        const lvl = parseFloat(card.querySelector('.s-level').value) || 0;
        if(lvl > 0) { totalLevel += lvl; playerCount++; }
    });
    const apl = playerCount > 0 ? Math.round(totalLevel / playerCount) : 0;
    
    // 2. Tier & Max Gold
    let tier = 1;
    if (apl >= 17) tier = 4;
    else if (apl >= 11) tier = 3;
    else if (apl >= 5) tier = 2;
    
    const maxGold = cachedGameRules.gold_per_session_by_apl ? (cachedGameRules.gold_per_session_by_apl[apl] || 0) : 0;

    viewElement.querySelector('.val-apl').textContent = apl;
    viewElement.querySelector('.val-tier').textContent = tier;
    viewElement.querySelector('.val-max-gold').textContent = maxGold;

    // 3. Row Updates
    const sessionHours = parseFloat(viewElement.querySelector('.inp-session-hours').value) || 0;

    cards.forEach(card => {
        const lvl = parseInt(card.querySelector('.s-level').value) || 0;
        const hInput = card.querySelector('.s-hours');
        const playerHours = parseFloat(hInput.value) || 0;
        const gInput = card.querySelector('.s-gold');
        const playerGold = parseFloat(gInput.value) || 0;
        
        // Validations
        if (playerHours > sessionHours) hInput.parentElement.classList.add('error');
        else hInput.parentElement.classList.remove('error');

        if (maxGold > 0 && playerGold > maxGold) {
            const grp = gInput.parentElement;
            grp.classList.add('error');
            grp.querySelector('.val-max-msg').textContent = maxGold;
        } else {
            gInput.parentElement.classList.remove('error');
        }

        // Calcs
        const xp = calculateXP(lvl, playerHours, cachedGameRules);
        let dtp = Math.floor(5 * playerHours);
        const btn = card.querySelector('.s-incentives-btn');
        const incentives = JSON.parse(btn.dataset.incentives || '[]');
        if (cachedGameRules['player incentives']) {
            incentives.forEach(i => dtp += (cachedGameRules['player incentives'][i] || 0));
        }

        card.querySelector('.s-xp').value = xp;
        card.querySelector('.s-dtp').value = dtp;
    });
}

function initIncentivesModal() {
    const modal = document.getElementById('modal-incentives');
    const btnCancel = document.getElementById('btn-cancel-incentives');
    const btnSave = document.getElementById('btn-save-incentives');
    if(btnCancel) btnCancel.addEventListener('click', () => { activeIncentiveRowData = null; modal.close(); });
    if(btnSave) btnSave.addEventListener('click', saveIncentivesFromModal);
}

function openIncentivesModal(buttonEl, viewContext) {
    activeIncentiveRowData = { button: buttonEl, viewContext: viewContext };
    const modal = document.getElementById('modal-incentives');
    const listContainer = document.getElementById('incentives-list');
    const msgContainer = document.getElementById('incentives-message');
    listContainer.innerHTML = ''; 

    const currentSelection = JSON.parse(buttonEl.dataset.incentives || '[]');
    let hasIncentives = false;

    if (cachedGameRules && cachedGameRules['player incentives']) {
        const entries = Object.entries(cachedGameRules['player incentives']);
        if (entries.length > 0) {
            hasIncentives = true;
            msgContainer.textContent = "Check any incentives that apply.";
            entries.forEach(([name, val]) => {
                const label = document.createElement('label');
                label.className = 'checkbox-item';
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = name;
                if (currentSelection.includes(name)) checkbox.checked = true;
                label.appendChild(checkbox);
                label.appendChild(document.createTextNode(`${name} (+${val} DTP)`));
                listContainer.appendChild(label);
            });
        }
    } 
    if (!hasIncentives) msgContainer.textContent = "No Player Incentives at this time.";
    modal.showModal();
}

function saveIncentivesFromModal() {
    if (!activeIncentiveRowData) return;
    const modal = document.getElementById('modal-incentives');
    const checkboxes = modal.querySelectorAll('input[type="checkbox"]:checked');
    const selected = Array.from(checkboxes).map(cb => cb.value);
    const btn = activeIncentiveRowData.button;
    btn.dataset.incentives = JSON.stringify(selected);
    updateSessionCalculations(activeIncentiveRowData.viewContext);
    activeIncentiveRowData = null;
    modal.close();
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

function initPlayerRoster() {
    const btnAdd = document.getElementById('btn-add-player');
    if(btnAdd) btnAdd.addEventListener('click', addPlayerRow);
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
    
    // CALCULATE AND SET TOTAL HOURS BEFORE CREATING VIEWS
    let totalLoadedHours = 0;
    let savedSessionCount = 0;
    
    if (session.form_data.sessions && Array.isArray(session.form_data.sessions)) {
        savedSessionCount = session.form_data.sessions.length;
        // Sum up the actual hours saved in each session
        totalLoadedHours = session.form_data.sessions.reduce((acc, s) => acc + (parseFloat(s.hours) || 0), 0);
    }

    const headerHoursInput = document.getElementById('header-hours');
    if(headerHoursInput) {
        headerHoursInput.value = totalLoadedHours;
        const sessionDisplay = document.getElementById('header-session-count');
        if(sessionDisplay) sessionDisplay.textContent = savedSessionCount;
    }

    if (session.form_data.sessions && Array.isArray(session.form_data.sessions)) {
        const count = session.form_data.sessions.length;
        
        updateSessionNavAndViews(count, totalLoadedHours);

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

            const listContainer = view.querySelector('.player-roster-list');
            listContainer.innerHTML = ''; // DUPLICATION FIX

            if(sData.players) {
                sData.players.forEach(p => addSessionPlayerRow(listContainer, p, index, view));
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