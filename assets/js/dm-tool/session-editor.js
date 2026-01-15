// assets/js/dm-tool/session-editor.js

import { supabase } from '../supabaseClient.js'; 
import { 
    saveSession, 
    createSession,
    saveAsTemplate, 
    loadSession, 
    fetchGameRules, 
    fetchActiveEvents,
    fetchTemplates 
} from './data-manager.js';

import * as UI from './session-ui.js';
import * as Rows from './session-rows.js';
import * as IO from './session-io.js';

let cachedGameRules = null; 

// ==========================================
// 1. Initialization
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    cachedGameRules = await fetchGameRules();

    // Init UI Modules
    UI.initTabs(() => IO.generateOutput()); 
    UI.initTimezone();
    UI.initDateTimeConverter(); 
    UI.initAccordions();
    
    // Init Modals
    UI.initIncentivesModal((ctx) => updateSessionCalculations());
    initCopyGameLogic();
    initTemplateLogic(); 
    initPlayerSetup();

    // Dropdowns
    const rules = cachedGameRules;
    if(rules && rules.options) {
        if(rules.options["Game Version"]) UI.fillDropdown('inp-version', rules.options["Game Version"]);
        if(rules.options["Application Types"]) UI.fillDropdown('inp-apps-type', rules.options["Application Types"]);
        if(rules.options["Game Format"]) UI.fillDropdown('inp-format', rules.options["Game Format"]);
    }
    
    await initEventsDropdown(); 
    await initTemplateDropdown(); 

    // Load Data or Defaults
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('id');

    // Callbacks for dynamic rows
    const callbacks = {
        onUpdate: updateSessionCalculations,
        onOpenModal: (btn, ctx, isDM) => UI.openIncentivesModal(btn, ctx, isDM, cachedGameRules)
    };
    
    // Store callbacks globally/module-scope for Rows to use if needed
    window._sessionCallbacks = callbacks;

    if (sessionId) {
        await loadSessionData(sessionId, callbacks);
    } 

    // Init Hours Listener (Central Logic)
    const hoursInput = document.getElementById('inp-session-total-hours');
    if(hoursInput) {
        hoursInput.addEventListener('input', () => {
            const val = parseFloat(hoursInput.value) || 0;
            
            // 5.5 Hour Limit Logic
            if (val > 5.5) {
                const proceed = confirm("Duration exceeds 5.5 hours. Do you want to create the next part automatically?");
                if(proceed) {
                    // 1. Set current to 3
                    hoursInput.value = 3;
                    updateSessionCalculations();
                    
                    // 2. Trigger Copy (Next Part)
                    document.getElementById('chk-next-part').checked = true;
                    // Default name increment
                    const currentName = document.getElementById('header-game-name').value;
                    const nextName = incrementPartName(currentName);
                    document.getElementById('inp-copy-name').value = nextName;
                    
                    // Open Modal
                    document.getElementById('modal-copy-game').showModal();
                }
            } else {
                updateSessionCalculations();
            }
        });
    }

    setupCalculationTriggers(callbacks);
});

function setupCalculationTriggers(callbacks) {
    const dmLevel = document.getElementById('out-dm-level');
    const dmGames = document.getElementById('out-dm-games');
    const btnDMInc = document.getElementById('btn-dm-incentives');
    const syncBtn = document.getElementById('btn-sync-roster');
    const addPlayerBtn = document.getElementById('btn-add-session-player');

    if(dmLevel) dmLevel.addEventListener('input', updateSessionCalculations);
    if(dmGames) dmGames.addEventListener('input', updateSessionCalculations);
    if(btnDMInc) btnDMInc.addEventListener('click', () => callbacks.onOpenModal(btnDMInc, null, true));
    
    if(syncBtn) syncBtn.addEventListener('click', () => {
        if(confirm("Replace session roster with game setup roster?")) {
            Rows.syncSessionPlayersFromMaster(callbacks);
        }
    });

    if(addPlayerBtn) addPlayerBtn.addEventListener('click', () => {
        Rows.addSessionPlayerRow(document.getElementById('session-roster-list'), {}, callbacks);
    });
}

function incrementPartName(name) {
    if(!name) return "Session Part 2";
    const match = name.match(/(.*Part\s)(\d+)$/i);
    if(match) {
        const num = parseInt(match[2]) + 1;
        return `${match[1]}${num}`;
    }
    return `${name} Part 2`;
}

// ==========================================
// 2. Data Loading & Events
// ==========================================

async function loadSessionData(sessionId, callbacks) {
    try {
        const session = await loadSession(sessionId);
        if (session) {
            IO.populateForm(session, callbacks);
        }
    } catch (error) {
        console.error("Error loading session:", error);
    }
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

function initPlayerSetup() {
    const btnAdd = document.getElementById('btn-add-player');
    if(btnAdd) btnAdd.addEventListener('click', () => Rows.addPlayerRowToMaster({})); 
}

// ==========================================
// 3. Calculation Logic (Merged)
// ==========================================

function calculateXP(level, hours, rules) {
    if (!rules || !rules.xp_per_hour) return 0;
    const hourlyXP = rules.xp_per_hour[level] || 0;
    return Math.floor(hourlyXP * hours);
}

function calculatePlayerRewards(level, hours, rules, incentives = []) {
    const xp = calculateXP(level, hours, rules);
    let dtp = Math.floor(5 * hours);
    if (rules && rules['player incentives']) {
        incentives.forEach(name => {
            dtp += (rules['player incentives'][name] || 0);
        });
    }
    return { xp, dtp };
}

function calculateDMRewards(dmLevel, hours, sessionApl, newHireCount, isJumpstart, rules, selectedIncentives = []) {
    const rewards = { xp: 0, dtp: 0, gp: 0, loot: "1" };
    if (!rules) return rewards;

    // XP
    rewards.xp = calculateXP(dmLevel, hours, rules);

    // DTP
    let dtp = Math.floor(5 * hours) + (5 * newHireCount);
    if (rules['DM incentives']) {
        selectedIncentives.forEach(name => {
            dtp += (rules['DM incentives'][name] || 0);
        });
    }
    rewards.dtp = dtp;

    // Gold (Jumpstart Only)
    if (isJumpstart) {
        const safeApl = Math.floor(sessionApl) || 1;
        rewards.gp = rules.gold_per_session_by_apl ? (rules.gold_per_session_by_apl[safeApl] || 0) : 0;
    }

    // Loot
    let baseLoot = 1 + newHireCount;
    let lootStr = `${baseLoot}`;
    if (isJumpstart) {
        lootStr += " + 1 Jumpstart Loot";
    } else if (newHireCount > 0) {
        lootStr += " (Inc. New Hire Bonus)";
    }
    rewards.loot = lootStr;

    return rewards;
}

function updateSessionCalculations() {
    if (!cachedGameRules) return; 
    
    // Target the session details view container specifically
    const container = document.getElementById('view-session-details');
    if(!container) return;

    // 1. Calculate APL / Counts
    let totalLevel = 0;
    let playerCount = 0;
    let welcomeWagonCount = 0;
    let newHireCount = 0;

    const cards = container.querySelectorAll('.player-card');
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

    const lblApl = container.querySelector('.val-apl');
    const lblTier = container.querySelector('.val-tier');
    const lblGold = container.querySelector('.val-max-gold');
    
    if(lblApl) lblApl.textContent = apl;
    if(lblTier) lblTier.textContent = tier;
    if(lblGold) lblGold.textContent = maxGold;

    // 3. Row Updates
    const sessionHours = parseFloat(document.getElementById('inp-session-total-hours').value) || 0;
    
    cards.forEach(card => {
        const hInput = card.querySelector('.s-hours');
        hInput.value = sessionHours; 
        
        const gInput = card.querySelector('.s-gold');
        const playerGold = parseFloat(gInput.value) || 0;
        const lInput = card.querySelector('.s-level');
        const lvl = parseFloat(lInput.value) || 0;
        
        if (maxGold > 0 && playerGold > maxGold) {
            gInput.parentElement.classList.add('error');
        } else {
            gInput.parentElement.classList.remove('error');
        }

        const btn = card.querySelector('.s-incentives-btn');
        const incentives = JSON.parse(btn.dataset.incentives || '[]');
        const rewards = calculatePlayerRewards(lvl, sessionHours, cachedGameRules, incentives);
        
        card.querySelector('.s-xp').value = rewards.xp;
        card.querySelector('.s-dtp').value = rewards.dtp;
    });

    // 4. DM Calc
    const dmLevelInput = document.getElementById('out-dm-level');
    const dmGamesInput = document.getElementById('out-dm-games');
    
    if (dmLevelInput && dmGamesInput) {
        const dmLvl = parseFloat(dmLevelInput.value) || 0;
        const dmGamesVal = dmGamesInput.value;
        const dmGamesNum = parseInt(dmGamesVal) || 999; 

        const isJumpstart = (dmGamesVal !== "10+" && dmGamesNum <= 10);
        
        container.querySelector('.dm-val-jumpstart').value = isJumpstart ? "Yes" : "No";
        container.querySelector('.dm-val-welcome').value = welcomeWagonCount;
        container.querySelector('.dm-val-newhires').value = newHireCount;

        const btnDM = document.getElementById('btn-dm-incentives');
        const dmIncentives = JSON.parse(btnDM ? btnDM.dataset.incentives : '[]');

        const dmRewards = calculateDMRewards(
            dmLvl, 
            sessionHours, 
            apl, 
            newHireCount, 
            isJumpstart, 
            cachedGameRules, 
            dmIncentives
        );

        container.querySelector('.dm-res-xp').value = dmRewards.xp;
        container.querySelector('.dm-res-dtp').value = dmRewards.dtp;
        container.querySelector('.dm-res-gp').value = dmRewards.gp;
        container.querySelector('.dm-res-loot').value = dmRewards.loot;
    }
}

// ==========================================
// 4. Save / Copy / Template Logic
// ==========================================

function initCopyGameLogic() {
    const btnCopy = document.getElementById('btn-copy-game');
    const modal = document.getElementById('modal-copy-game');
    const btnConfirm = document.getElementById('btn-confirm-copy');
    
    if(btnCopy) {
        btnCopy.addEventListener('click', () => {
            const currentName = document.getElementById('header-game-name').value;
            document.getElementById('inp-copy-name').value = incrementPartName(currentName);
            modal.showModal();
        });
    }

    if(btnConfirm) {
        btnConfirm.addEventListener('click', async () => {
            const newName = document.getElementById('inp-copy-name').value;
            if(!newName) return alert("Please enter a name.");
            
            const isNextPart = document.getElementById('chk-next-part').checked;
            const fullData = IO.getFormData();
            
            fullData.header.title = newName; 
            fullData.session_log.hours = 3; 
            
            if (isNextPart) {
                fullData.players.forEach(p => p.games_count = incrementGameString(p.games_count));
                fullData.dm.games_count = incrementGameString(fullData.dm.games_count);
                fullData.session_log.dm_rewards.games_played = fullData.dm.games_count;
                fullData.session_log.players.forEach(p => p.games_count = incrementGameString(p.games_count));
            }
            
            fullData.session_log.title = newName;
            fullData.session_log.notes = "";
            fullData.session_log.summary = "";
            fullData.session_log.dm_rewards.loot_selected = "";
            
            const { data: { user } } = await supabase.auth.getUser();
            if(!user) return alert("Not logged in");

            try {
                const newSession = await createSession(user.id, newName, false);
                if(newSession) {
                    await saveSession(newSession.id, fullData, { title: newName });
                    window.location.href = `session.html?id=${newSession.id}`;
                }
            } catch (e) {
                console.error(e);
                alert("Error copying game.");
            }
        });
    }
}

function incrementGameString(val) {
    if (val === "10+") return "10+";
    const num = parseInt(val) || 0;
    if (num >= 10) return "10+";
    return (num + 1).toString();
}

function initTemplateLogic() {
    const modal = document.getElementById('modal-save-template');
    const btnOpen = document.getElementById('btn-open-save-template');
    const btnConfirm = document.getElementById('btn-confirm-save-template');
    const btnLoad = document.getElementById('btn-load-template');
    const btnSaveGame = document.getElementById('btn-save-game');
    
    // New Save Button from Game Setup
    const btnSaveSetup = document.getElementById('btn-save-template-setup');
    
    if(btnOpen) btnOpen.addEventListener('click', () => modal.showModal());
    
    // Add listener for new button - Prefill Name
    if(btnSaveSetup) btnSaveSetup.addEventListener('click', () => {
        const currentName = document.getElementById('header-game-name').value;
        if(currentName) document.getElementById('inp-template-name').value = currentName;
        modal.showModal();
    });
    
    if(btnConfirm) {
        btnConfirm.addEventListener('click', async () => {
            const tmplName = document.getElementById('inp-template-name').value;
            if(!tmplName) return alert("Enter a name");
            const { data: { user } } = await supabase.auth.getUser();
            if(!user) return alert("Please login");
            
            const fullData = IO.getFormData();
            const templateData = IO.prepareTemplateData(fullData); 
            
            try {
                await saveAsTemplate(user.id, tmplName, templateData);
                alert("Template Saved!");
                modal.close();
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
                IO.populateForm(session, window._sessionCallbacks);
                alert("Template Loaded!");
            }
        });
    }
    
    if(btnSaveGame) {
        btnSaveGame.addEventListener('click', async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const sessionId = urlParams.get('id');
            const formData = IO.getFormData();
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
                // Auto-create if no ID (new session)
                const { data: { user } } = await supabase.auth.getUser();
                if(user) {
                    const newS = await createSession(user.id, title);
                    await saveSession(newS.id, formData, { title, date });
                    window.history.pushState({}, "", `?id=${newS.id}`);
                    alert("Session Created & Saved");
                }
            }
        });
    }
}