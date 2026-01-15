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
    toUnixTimestamp, // <--- ADDED THIS IMPORT
    calculatePlayerRewards,
    calculateDMRewards
} from './calculators.js';

import * as UI from './session-ui.js';
import * as Rows from './session-rows.js';
import * as IO from './session-io.js';

let cachedGameRules = null; 

/// ==========================================
// 1. Initialization
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    cachedGameRules = await fetchGameRules();

    // Init UI Modules
    UI.initTabs(() => IO.generateOutput()); 
    UI.initTimezone();
    UI.initDateTimeConverter(); 
    UI.initAccordions(); // <--- ADDED THIS
    
    UI.initIncentivesModal((viewContext) => {
        updateSessionCalculations(viewContext);
    });
    
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

    // Main Load
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
    
    // Init Hours Listener (The Heartbeat)
    const hoursInput = document.getElementById('header-hours');
    const sessionDisplay = document.getElementById('header-session-count');
    if(hoursInput) {
        hoursInput.addEventListener('input', () => {
            const totalHours = parseFloat(hoursInput.value) || 0;
            const count = calculateSessionCount(totalHours);
            if(sessionDisplay) sessionDisplay.textContent = count;
            updateSessionNavAndViews(count, totalHours);
        });
    }
});

// ==========================================
// 2. Data Loading & Syncing
// ==========================================

async function loadSessionData(sessionId) {
    try {
        const session = await loadSession(sessionId);
        if (session) {
            // Pass the callback to create views
            IO.populateForm(session, updateSessionNavAndViews, {
                onUpdate: updateSessionCalculations,
                onOpenModal: (btn, ctx, isDM) => UI.openIncentivesModal(btn, ctx, isDM, cachedGameRules)
            });
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
// 3. Core Logic Loop
// ==========================================

function updateSessionNavAndViews(count, totalHours) {
    const navContainer = document.getElementById('dynamic-session-nav');
    const viewContainer = document.getElementById('session-views-container');
    if(!navContainer || !viewContainer) return;

    let createdNew = false;

    // Define Callbacks object for rows
    const rowCallbacks = {
        onUpdate: updateSessionCalculations,
        onOpenModal: (btn, ctx, isDM) => UI.openIncentivesModal(btn, ctx, isDM, cachedGameRules)
    };

    for (let i = 1; i <= count; i++) {
        let sessionDur = 3.0;
        if (i === count) {
            sessionDur = totalHours - (3 * (i - 1));
            sessionDur = Math.round(sessionDur * 10) / 10;
        }

        const existingView = document.getElementById(`view-session-${i}`);
        if (existingView) {
            const currentVal = parseFloat(existingView.querySelector('.inp-session-hours').value);
            if (currentVal !== sessionDur) {
                existingView.querySelector('.inp-session-hours').value = sessionDur;
                existingView.querySelectorAll('.player-card').forEach(card => {
                    const hInput = card.querySelector('.s-hours');
                    if(hInput) {
                        hInput.value = sessionDur;
                        hInput.dispatchEvent(new Event('input'));
                    }
                });
                updateSessionCalculations(existingView);
            }
            continue; 
        }

        // Create New
        createdNew = true;
        
        // Nav
        const div = document.createElement('div');
        div.className = 'nav-item';
        div.dataset.target = `view-session-${i}`;
        div.textContent = `Session ${i}`;
        div.id = `nav-link-session-${i}`;
        navContainer.appendChild(div);

        // View
        const tmpl = document.getElementById('tpl-session-view');
        const clone = tmpl.content.cloneNode(true);
        const viewDiv = clone.querySelector('.session-view');
        
        viewDiv.id = `view-session-${i}`;
        viewDiv.dataset.sessionIndex = i;
        viewDiv.querySelector('.lbl-session-num').textContent = i;
        
        // Unique Tab IDs
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

        // Init Listeners
        initSessionViewLogic(viewDiv, i, rowCallbacks);
        
        // Sync Data
        Rows.syncSessionPlayers(viewDiv, i, rowCallbacks);
        Rows.syncDMRewards(viewDiv, i, rowCallbacks);
    }

    // Cleanup Excess
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

function initSessionViewLogic(viewElement, index, callbacks) {
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
        if(confirm("Reset roster?")) {
            Rows.syncSessionPlayers(viewElement, index, callbacks);
        }
    });

    const btnAdd = viewElement.querySelector('.btn-add-session-player');
    btnAdd.addEventListener('click', () => {
        Rows.addSessionPlayerRow(viewElement.querySelector('.player-roster-list'), {}, callbacks);
    });

    // DM Listeners
    const dmLevel = viewElement.querySelector('.dm-level');
    const dmGames = viewElement.querySelector('.dm-games');
    const btnDMInc = viewElement.querySelector('.dm-incentives-btn');
    
    if(dmLevel) dmLevel.addEventListener('input', () => updateSessionCalculations(viewElement));
    if(dmGames) dmGames.addEventListener('input', () => updateSessionCalculations(viewElement));
    if(btnDMInc) btnDMInc.addEventListener('click', () => callbacks.onOpenModal(btnDMInc, viewElement, true));
}

// ==========================================
// 4. Calculations
// ==========================================

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

    // 3. Row Updates
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

        // Validations
        hInput.parentElement.classList.toggle('error', playerHours > sessionHours);
        
        if (maxGold > 0 && playerGold > maxGold) {
            gInput.parentElement.classList.add('error');
            gInput.parentElement.querySelector('.val-max-msg').textContent = maxGold;
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

        lInput.parentElement.classList.toggle('error', isLevelError);
        gamesInput.parentElement.classList.toggle('error', isGamesError);

        // Calc
        const btn = card.querySelector('.s-incentives-btn');
        const incentives = JSON.parse(btn.dataset.incentives || '[]');
        const rewards = calculatePlayerRewards(lvl, playerHours, cachedGameRules, incentives);
        
        card.querySelector('.s-xp').value = rewards.xp;
        card.querySelector('.s-dtp').value = rewards.dtp;
    });

    // 4. DM Calc
    const dmLevelInput = viewElement.querySelector('.dm-level');
    const dmGamesInput = viewElement.querySelector('.dm-games');
    
    if (dmLevelInput && dmGamesInput) {
        const dmLvl = parseFloat(dmLevelInput.value) || 0;
        const dmGamesVal = dmGamesInput.value;
        const dmGamesNum = parseInt(dmGamesVal) || 999; 

        const isJumpstart = (dmGamesVal !== "10+" && dmGamesNum <= 10);
        
        viewElement.querySelector('.dm-val-jumpstart').value = isJumpstart ? "Yes" : "No";
        viewElement.querySelector('.dm-val-welcome').value = welcomeWagonCount;
        viewElement.querySelector('.dm-val-newhires').value = newHireCount;

        const btnDM = viewElement.querySelector('.dm-incentives-btn');
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

        viewElement.querySelector('.dm-res-xp').value = dmRewards.xp;
        viewElement.querySelector('.dm-res-dtp').value = dmRewards.dtp;
        viewElement.querySelector('.dm-res-gp').value = dmRewards.gp;
        viewElement.querySelector('.dm-res-loot').value = dmRewards.loot;
    }
}

function getPreviousSessionData(currentSessionIndex) {
    const baseline = new Map(); 
    if (currentSessionIndex === 1) {
        Rows.getMasterRosterData().forEach(p => {
            if(p.discord_id) baseline.set(p.discord_id, { level: parseFloat(p.level)||0, games_count: p.games_count });
        });
    } else {
        const prevIndex = currentSessionIndex - 1;
        const prevView = document.getElementById(`view-session-${prevIndex}`);
        if(prevView) {
            Rows.getSessionRosterData(prevView).forEach(p => {
                if(p.discord_id) baseline.set(p.discord_id, { level: parseFloat(p.level)||0, games_count: p.games_count });
            });
        }
    }
    return baseline;
}

// ==========================================
// 5. Save/Template Logic
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
            
            const fullData = IO.getFormData();
            const templateData = IO.prepareTemplateData(fullData); 
            
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
                IO.populateForm(session, updateSessionNavAndViews, {
                    onUpdate: updateSessionCalculations,
                    onOpenModal: (btn, ctx, isDM) => UI.openIncentivesModal(btn, ctx, isDM, cachedGameRules)
                });
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
                alert("Session ID missing. Please create a session from the dashboard first.");
            }
        });
    }
}