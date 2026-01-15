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
    calculatePlayerRewards,
    calculateDMRewards
} from './calculators.js';

let cachedGameRules = null; 
let activeIncentiveRowData = null; 

// ==========================================
// 1. Initialization
// ==========================================

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
        // Trigger initial calculation for new sessions
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
    if (sidebarNav) {
        sidebarNav.addEventListener('click', (e) => {
            const item = e.target.closest('.nav-item');
            if (!item) return;

            // Handle Active State
            document.querySelectorAll('#sidebar-nav .nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            // Hide all Sections
            document.querySelectorAll('.view-section').forEach(s => s.classList.add('hidden-section'));

            // Show Target Section
            const targetId = item.dataset.target;
            const targetEl = document.getElementById(targetId);
            if(targetEl) targetEl.classList.remove('hidden-section');
        });
    }

    // Content Tabs (Input/Output)
    document.body.addEventListener('click', (e) => {
        const tab = e.target.closest('.content-tab');
        if (!tab) return;
        
        const parent = tab.closest('.content-tabs');
        if (!parent) return;

        parent.querySelectorAll('.content-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const targetId = tab.dataset.subtab;
        const viewSection = tab.closest('.view-section');
        if (viewSection && targetId) {
            viewSection.querySelectorAll('.subtab-content').forEach(c => c.classList.add('hidden-section'));
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                targetEl.classList.remove('hidden-section');
                if (targetId === 'ad-output' || targetId.includes('session-output')) {
                    generateOutput(); 
                }
            }
        }
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
 * Core Logic: Creates Sidebar links AND Session Views
 */
function updateSessionNavAndViews(count, totalHours) {
    const navContainer = document.getElementById('dynamic-session-nav');
    const viewContainer = document.getElementById('session-views-container');
    if(!navContainer || !viewContainer) return;

    let createdNew = false;

    // Loop through sessions
    for (let i = 1; i <= count; i++) {
        let sessionDur = 3.0;
        if (i === count) {
            sessionDur = totalHours - (3 * (i - 1));
            sessionDur = Math.round(sessionDur * 10) / 10;
        }

        // CHECK IF SESSION VIEW ALREADY EXISTS
        const existingView = document.getElementById(`view-session-${i}`);
        if (existingView) {
            const tabInput = existingView.querySelector('.tab-input');
            const tabOutput = existingView.querySelector('.tab-output');
            const contentInput = existingView.querySelector('.content-input');
            const contentOutput = existingView.querySelector('.content-output');
            
            if (tabInput && tabOutput && contentInput && contentOutput) {
                const inputId = `session-input-${i}`;
                const outputId = `session-output-${i}`;
                
                tabInput.dataset.subtab = inputId;
                tabOutput.dataset.subtab = outputId;
                contentInput.id = inputId;
                contentOutput.id = outputId;
            }

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

        // CREATE NEW SESSION
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
        
        const tabInput = viewDiv.querySelector('.tab-input');
        const tabOutput = viewDiv.querySelector('.tab-output');
        const contentInput = viewDiv.querySelector('.content-input');
        const contentOutput = viewDiv.querySelector('.content-output');
        
        if (tabInput && tabOutput && contentInput && contentOutput) {
            const inputId = `session-input-${i}`;
            const outputId = `session-output-${i}`;
            
            tabInput.dataset.subtab = inputId;
            tabOutput.dataset.subtab = outputId;
            contentInput.id = inputId;
            contentOutput.id = outputId;
        }
        
        const gameName = document.getElementById('header-game-name').value || "Game";
        viewDiv.querySelector('.inp-session-title').value = `${gameName} Part ${i}`;
        viewDiv.querySelector('.inp-session-hours').value = sessionDur;

        viewContainer.appendChild(viewDiv);

        initSessionViewLogic(viewDiv, i);
        syncSessionPlayers(viewDiv, i);
        syncDMRewards(viewDiv, i);
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
        if(confirm("Reset this roster to match the previous session? Current data will be lost.")) {
            syncSessionPlayers(viewElement, index);
        }
    });

    const btnAdd = viewElement.querySelector('.btn-add-session-player');
    btnAdd.addEventListener('click', () => {
        addSessionPlayerRow(viewElement.querySelector('.player-roster-list'), {}, index, viewElement);
    });

    const dmLevel = viewElement.querySelector('.dm-level');
    const dmGames = viewElement.querySelector('.dm-games');
    const btnDMInc = viewElement.querySelector('.dm-incentives-btn');
    
    if(dmLevel) dmLevel.addEventListener('input', () => updateSessionCalculations(viewElement));
    if(dmGames) dmGames.addEventListener('input', () => updateSessionCalculations(viewElement));
    if(btnDMInc) btnDMInc.addEventListener('click', () => openDMIncentivesModal(btnDMInc, viewElement));
}

// ==========================================
// 4. Session Player & DM Logic
// ==========================================

function syncSessionPlayers(viewElement, sessionIndex) {
    const listContainer = viewElement.querySelector('.player-roster-list');
    listContainer.innerHTML = ''; 

    let sourceData = [];

    if (sessionIndex === 1) {
        sourceData = getPlayerRosterData(); 
    } else {
        const prevView = document.getElementById(`view-session-${sessionIndex - 1}`);
        if(prevView) {
            sourceData = getSessionRosterData(prevView);
        }
    }

    sourceData.forEach(p => {
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
            gold: "",
            items_used: "",
            notes: ""
        };
        addSessionPlayerRow(listContainer, newRowData, sessionIndex, viewElement);
    });
    
    updateSessionCalculations(viewElement);
}

function syncDMRewards(viewElement, sessionIndex) {
    const masterName = document.getElementById('inp-dm-char-name').value;
    viewElement.querySelector('.dm-name').value = masterName;

    let level = "";
    let games = "";

    if (sessionIndex === 1) {
        level = document.getElementById('inp-dm-level').value;
        const gRaw = document.getElementById('inp-dm-games-count').value; 
        if (gRaw === "10+") games = "10+";
        else {
            let g = parseInt(gRaw) || 0;
            g += 1;
            games = (g >= 10) ? "10" : g.toString(); 
        }
    } else {
        const prevView = document.getElementById(`view-session-${sessionIndex - 1}`);
        if (prevView) {
            level = prevView.querySelector('.dm-level').value; 
            const prevGames = prevView.querySelector('.dm-games').value;
            if (prevGames === "10+") games = "10+";
            else {
                let g = parseInt(prevGames) || 0;
                g += 1;
                games = (g >= 10) ? "10" : g.toString();
            }
        }
    }

    viewElement.querySelector('.dm-level').value = level;
    viewElement.querySelector('.dm-games').value = games;

    updateSessionCalculations(viewElement);
}

function addSessionPlayerRow(listContainer, data = {}, sessionIndex, viewContext) {
    const sessionHours = viewContext.querySelector('.inp-session-hours').value || "0";
    const rowHours = data.hours || sessionHours;
    
    const currentIncentives = data.incentives || [];
    const incentivesJson = JSON.stringify(currentIncentives);
    const btnText = currentIncentives.length > 0 ? `+` : '+';

    const playerNum = listContainer.children.length + 1;

    const card = document.createElement('div');
    card.className = 'player-card';

    card.innerHTML = `
        <div class="player-card-header">
            <span class="player-card-title">Player ${playerNum}</span>
            <button class="btn-delete-card" title="Remove Player">&times;</button>
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
                <div class="card-field w-20">
                    <label class="field-label">Hours Played</label>
                    <input type="number" class="table-input s-hours" value="${rowHours}" step="0.5">
                    <div class="validation-msg">Exceeds Session</div>
                </div>
                <div class="card-field w-20">
                    <label class="field-label"># Games</label>
                    <input type="text" class="table-input s-games" value="${data.games_count || ''}">
                    <div class="validation-msg">Cannot be less than previous</div>
                </div>
            </div>

            <div class="card-row">
                <div class="card-field w-20">
                    <label class="field-label">Level</label>
                    <input type="number" class="table-input s-level" value="${data.level || ''}">
                    <div class="validation-msg">Cannot be less than previous</div>
                </div>
                <div class="card-field w-20">
                    <label class="field-label">XP Earned</label>
                    <input type="text" class="table-input readonly-result s-xp" readonly placeholder="Auto">
                </div>
                <div class="card-field w-30">
                    <label class="field-label">Gold Rewarded <span title="Gold reward should be appropriate and not always be max allowed" style="cursor:help; font-size:0.8em;">ⓘ</span></label>
                    <input type="text" class="table-input s-gold" value="${data.gold || ''}" placeholder="GP">
                    <div class="validation-msg">Max <span class="val-max-msg"></span>gp</div>
                </div>
                <div class="card-field w-30">
                    <label class="field-label">DTP / Incentives</label>
                    <div class="dtp-wrapper">
                        <input type="text" class="table-input readonly-result s-dtp" readonly placeholder="DTP" style="width:calc(100% - 45px);">
                        <button class="button button-secondary s-incentives-btn" data-incentives='${incentivesJson}'>${btnText}</button>
                    </div>
                </div>
            </div>

            <div class="card-row">
                <div class="card-field w-50">
                    <label class="field-label">Loot Rewarded</label>
                    <input type="text" class="table-input s-loot" value="${data.loot || ''}" placeholder="">
                </div>
                <div class="card-field w-50">
                    <label class="field-label">Items Used</label>
                    <input type="text" class="table-input s-items" value="${data.items_used || ''}" placeholder="">
                </div>
            </div>

            <div class="card-row">
                <div class="card-field w-100">
                    <label class="field-label">Character Outcomes / Notes <span title="Optional - record any character outcomes that persist outside of the game/session" style="cursor:help; font-size:0.8em;">ⓘ</span></label>
                    <textarea class="table-input s-notes" rows="1" placeholder="">${data.notes || ''}</textarea>
                </div>
            </div>
        </div>
    `;

    card.querySelector('.btn-delete-card').addEventListener('click', () => {
        card.remove();
        updateSessionCalculations(viewContext);
        renumberCards(listContainer);
    });

    card.querySelector('.s-hours').addEventListener('input', () => updateSessionCalculations(viewContext));
    card.querySelector('.s-level').addEventListener('input', () => updateSessionCalculations(viewContext));
    card.querySelector('.s-games').addEventListener('input', () => updateSessionCalculations(viewContext));
    card.querySelector('.s-gold').addEventListener('input', () => updateSessionCalculations(viewContext));
    
    const btnIncentives = card.querySelector('.s-incentives-btn');
    btnIncentives.addEventListener('click', () => {
        openIncentivesModal(btnIncentives, viewContext, false); 
    });

    listContainer.appendChild(card);
    
    if (viewContext && data.level) updateSessionCalculations(viewContext);
}

function renumberCards(container) {
    const titles = container.querySelectorAll('.player-card-title');
    titles.forEach((span, index) => {
        span.textContent = `Player ${index + 1}`;
    });
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

function getPreviousSessionData(currentSessionIndex) {
    const baseline = new Map(); 

    if (currentSessionIndex === 1) {
        const rows = document.querySelectorAll('#roster-body .player-row');
        rows.forEach(row => {
            const did = row.querySelector('.inp-discord-id').value;
            if(did) {
                baseline.set(did, {
                    level: parseFloat(row.querySelector('.inp-level').value) || 0,
                    games_count: row.querySelector('.inp-games-count').value
                });
            }
        });
    } else {
        const prevIndex = currentSessionIndex - 1;
        const prevView = document.getElementById(`view-session-${prevIndex}`);
        if(prevView) {
            const cards = prevView.querySelectorAll('.player-card');
            cards.forEach(card => {
                const did = card.querySelector('.s-discord-id').value;
                if(did) {
                    baseline.set(did, {
                        level: parseFloat(card.querySelector('.s-level').value) || 0,
                        games_count: card.querySelector('.s-games').value
                    });
                }
            });
        }
    }
    return baseline;
}

function updateSessionCalculations(viewElement) {
    if (!cachedGameRules) return; 
    
    // 1. Calculate APL and Counts
    let totalLevel = 0;
    let playerCount = 0;
    let welcomeWagonCount = 0;
    let newHireCount = 0;

    const cards = viewElement.querySelectorAll('.player-card');
    cards.forEach(card => {
        const lvl = parseFloat(card.querySelector('.s-level').value) || 0;
        if(lvl > 0) { totalLevel += lvl; playerCount++; }

        const gVal = card.querySelector('.s-games').value;
        const gNum = parseInt(gVal);

        if (gVal === "1") welcomeWagonCount++;
        if (gVal !== "10+" && !isNaN(gNum) && gNum <= 10) newHireCount++;
    });
    const apl = playerCount > 0 ? Math.round(totalLevel / playerCount) : 0;
    
    // 2. Tier & Max Gold
    let tier = 1;
    if (apl >= 17) tier = 4;
    else if (apl >= 11) tier = 3;
    else if (apl >= 5) tier = 2;
    
    const maxGold = cachedGameRules.gold_per_session_by_apl ? (cachedGameRules.gold_per_session_by_apl[apl] || 0) : 0;

    const lblApl = viewElement.querySelector('.val-apl');
    const lblTier = viewElement.querySelector('.val-tier');
    const lblGold = viewElement.querySelector('.val-max-gold');
    
    if(lblApl) lblApl.textContent = apl;
    if(lblTier) lblTier.textContent = tier;
    if(lblGold) lblGold.textContent = maxGold;

    // 3. Row Updates & Validations
    const sessionHours = parseFloat(viewElement.querySelector('.inp-session-hours').value) || 0;
    const sessionIndex = parseInt(viewElement.dataset.sessionIndex) || 1;
    const previousData = getPreviousSessionData(sessionIndex);

    cards.forEach(card => {
        const did = card.querySelector('.s-discord-id').value;
        const lInput = card.querySelector('.s-level');
        const lvl = parseFloat(lInput.value) || 0;
        
        const hInput = card.querySelector('.s-hours');
        const playerHours = parseFloat(hInput.value) || 0;
        
        const gInput = card.querySelector('.s-gold');
        const playerGold = parseFloat(gInput.value) || 0;

        const gamesInput = card.querySelector('.s-games');
        const gamesVal = gamesInput.value;

        // Validation
        if (playerHours > sessionHours) hInput.parentElement.classList.add('error');
        else hInput.parentElement.classList.remove('error');

        if (maxGold > 0 && playerGold > maxGold) {
            const grp = gInput.parentElement;
            grp.classList.add('error');
            grp.querySelector('.val-max-msg').textContent = maxGold;
        } else {
            gInput.parentElement.classList.remove('error');
        }

        let isLevelError = false;
        let isGamesError = false;

        if (did && previousData.has(did)) {
            const prev = previousData.get(did);
            if (lvl < prev.level) isLevelError = true;
            if (prev.games_count === "10+") {
                if (gamesVal !== "10+") isGamesError = true; 
            } else {
                const prevG = parseInt(prev.games_count) || 0;
                const currG = parseInt(gamesVal);
                if (gamesVal !== "10+") {
                    if (isNaN(currG) || currG < prevG) isGamesError = true;
                }
            }
        }

        if (isLevelError) lInput.parentElement.classList.add('error');
        else lInput.parentElement.classList.remove('error');

        if (isGamesError) gamesInput.parentElement.classList.add('error');
        else gamesInput.parentElement.classList.remove('error');

        // Player Calculations via Calculator
        const btn = card.querySelector('.s-incentives-btn');
        const incentives = JSON.parse(btn.dataset.incentives || '[]');
        
        const rewards = calculatePlayerRewards(lvl, playerHours, cachedGameRules, incentives);
        
        card.querySelector('.s-xp').value = rewards.xp;
        card.querySelector('.s-dtp').value = rewards.dtp;
    });

    // 4. DM REWARDS CALCULATION
    const dmLevelInput = viewElement.querySelector('.dm-level');
    const dmGamesInput = viewElement.querySelector('.dm-games');
    
    if (dmLevelInput && dmGamesInput) {
        const dmLvl = parseFloat(dmLevelInput.value) || 0;
        const dmGamesVal = dmGamesInput.value;
        const dmGamesNum = parseInt(dmGamesVal) || 999; 

        // Derived Checks
        const isJumpstart = (dmGamesVal !== "10+" && dmGamesNum <= 10);
        
        viewElement.querySelector('.dm-val-jumpstart').value = isJumpstart ? "Yes" : "No";
        viewElement.querySelector('.dm-val-welcome').value = welcomeWagonCount;
        viewElement.querySelector('.dm-val-newhires').value = newHireCount;

        // Fetch selected incentives
        const btnDM = viewElement.querySelector('.dm-incentives-btn');
        const dmIncentives = JSON.parse(btnDM ? btnDM.dataset.incentives : '[]');

        // Use Calculator
        const dmRewards = calculateDMRewards(
            dmLvl, 
            sessionHours, 
            apl, 
            newHireCount, 
            isJumpstart, 
            cachedGameRules, 
            dmIncentives
        );

        viewElement.querySelector('.dm-res-xp').value = dmRewards.xp;
        viewElement.querySelector('.dm-res-dtp').value = dmRewards.dtp;
        viewElement.querySelector('.dm-res-gp').value = dmRewards.gp;
        viewElement.querySelector('.dm-res-loot').value = dmRewards.loot;
    }
}

function initIncentivesModal() {
    const modal = document.getElementById('modal-incentives');
    const btnCancel = document.getElementById('btn-cancel-incentives');
    const btnSave = document.getElementById('btn-save-incentives');
    if(btnCancel) btnCancel.addEventListener('click', () => { activeIncentiveRowData = null; modal.close(); });
    if(btnSave) btnSave.addEventListener('click', saveIncentivesFromModal);
}

function openDMIncentivesModal(buttonEl, viewContext) {
    openIncentivesModal(buttonEl, viewContext, true);
}

function openIncentivesModal(buttonEl, viewContext, isDM = false) {
    activeIncentiveRowData = { button: buttonEl, viewContext: viewContext, isDM: isDM };
    const modal = document.getElementById('modal-incentives');
    const listContainer = document.getElementById('incentives-list');
    const msgContainer = document.getElementById('incentives-message');
    listContainer.innerHTML = ''; 

    const currentSelection = JSON.parse(buttonEl.dataset.incentives || '[]');
    let hasIncentives = false;
    
    // FIXED: Use uppercase 'DM' to match JSON data
    const sourceKey = isDM ? 'DM incentives' : 'player incentives';

    if (cachedGameRules && cachedGameRules[sourceKey]) {
        const entries = Object.entries(cachedGameRules[sourceKey]);
        if (entries.length > 0) {
            hasIncentives = true;
            msgContainer.textContent = `Check any ${isDM ? 'DM' : 'Player'} incentives that apply.`;
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
    if (!hasIncentives) msgContainer.textContent = `No ${isDM ? 'DM' : 'Player'} Incentives found in game rules.`;
    modal.showModal();
}

function saveIncentivesFromModal() {
    if (!activeIncentiveRowData) return;
    const modal = document.getElementById('modal-incentives');
    const checkboxes = modal.querySelectorAll('input[type="checkbox"]:checked');
    const selected = Array.from(checkboxes).map(cb => cb.value);
    const btn = activeIncentiveRowData.button;
    btn.dataset.incentives = JSON.stringify(selected);
    btn.innerText = selected.length > 0 ? `+` : '+'; 
    updateSessionCalculations(activeIncentiveRowData.viewContext);
    activeIncentiveRowData = null;
    modal.close();
}

// ... (Standard Utils unchanged) ...

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
    if(btnAdd) btnAdd.addEventListener('click', addPlayerRowToMaster); 
}

function addPlayerRowToMaster(data = {}) {
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
                opt.text = tmplName; select.appendChild(opt);
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
        const dmBtn = view.querySelector('.dm-incentives-btn');
        const dmIncentives = JSON.parse(dmBtn ? dmBtn.dataset.incentives : '[]');

        sessionsData.push({
            session_index: view.dataset.sessionIndex,
            title: view.querySelector('.inp-session-title').value,
            hours: view.querySelector('.inp-session-hours').value,
            date_time: view.querySelector('.inp-session-unix').value, 
            notes: view.querySelector('.inp-session-notes').value,
            summary: view.querySelector('.inp-session-summary').value,
            dm_collaborators: view.querySelector('.inp-dm-collab').value,
            players: getSessionRosterData(view),
            dm_rewards: {
                level: view.querySelector('.dm-level').value,
                games_played: view.querySelector('.dm-games').value,
                incentives: dmIncentives,
                loot_selected: view.querySelector('.dm-loot-selected').value
            }
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
                addPlayerRowToMaster(player);
            });
        }
    }
    if (session.form_data.dm) {
        const d = session.form_data.dm;
        setVal('inp-dm-char-name', d.character_name);
        setVal('inp-dm-level', d.level);
        setVal('inp-dm-games-count', d.games_count);
    }
    
    let totalLoadedHours = 0;
    let savedSessionCount = 0;
    if (session.form_data.sessions && Array.isArray(session.form_data.sessions)) {
        savedSessionCount = session.form_data.sessions.length;
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
            if (view.querySelector('.inp-session-summary')) view.querySelector('.inp-session-summary').value = sData.summary || "";
            if (view.querySelector('.inp-dm-collab')) view.querySelector('.inp-dm-collab').value = sData.dm_collaborators || "";
            
            if(sData.date_time) {
                view.querySelector('.inp-session-unix').value = sData.date_time;
                const tz = document.getElementById('inp-timezone').value;
                view.querySelector('.inp-session-date').value = unixToLocalIso(sData.date_time, tz);
            }
            
            if (sData.dm_rewards) {
                view.querySelector('.dm-level').value = sData.dm_rewards.level || "";
                view.querySelector('.dm-games').value = sData.dm_rewards.games_played || "";
                view.querySelector('.dm-loot-selected').value = sData.dm_rewards.loot_selected || "";
                
                const dmBtn = view.querySelector('.dm-incentives-btn');
                const loadedInc = sData.dm_rewards.incentives || [];
                if(dmBtn) {
                    dmBtn.dataset.incentives = JSON.stringify(loadedInc);
                    dmBtn.innerText = loadedInc.length > 0 ? "+" : "+";
                }
            }

            const listContainer = view.querySelector('.player-roster-list');
            listContainer.innerHTML = ''; 
            
            if(sData.players) {
                sData.players.forEach(p => addSessionPlayerRow(listContainer, p, index, view));
            }

            updateSessionCalculations(view);
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
    
    // Session Outputs
    const sessionViews = document.querySelectorAll('.session-view');
    sessionViews.forEach(view => {
        const outText = view.querySelector('.out-session-text');
        if(outText) {
            const sTitle = view.querySelector('.inp-session-title').value;
            const sDate = view.querySelector('.inp-session-date').value; 
            const sNotes = view.querySelector('.inp-session-notes').value;
            const sSummary = view.querySelector('.inp-session-summary').value;
            
            outText.value = `**${sTitle}**\n*${sDate}*\n\n**Summary:**\n${sSummary}\n\n**Notes:**\n${sNotes}`;
        }
    });
}
