// assets/js/dm-tool/session-editor.js

import { supabase } from '../supabaseClient.js'; 
import { 
    saveSession, 
    createSession,
    saveAsTemplate, 
    loadSession, 
    fetchGameRules, 
    fetchActiveEvents, 
    fetchTemplates,
    deleteSession,
    fetchPlayerSubmissions 
} from './data-manager.js';

import { checkAccess } from '../auth-check.js'; 

import * as UI from './session-ui.js';
import * as Rows from './session-rows.js';
import * as IO from './session-io.js';

let cachedGameRules = null; 
let isFullDM = false; 

// ==========================================
// 1. Initialization
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    cachedGameRules = await fetchGameRules();

    // Check DM Role
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        isFullDM = await checkAccess(user.id, 'Full DM');
        console.log("User Role Check - Full DM:", isFullDM);
    }

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
    initPlayerSync();
    
    // NEW: Initialize DM Loot Incentives UI based on rules
    initDMLootIncentives();

    const bindOutput = (id) => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('input', () => IO.generateOutput());
    };
    bindOutput('inp-lobby-url');
    bindOutput('inp-listing-url');

    // Dropdowns
    const rules = cachedGameRules;
    if(rules && rules.options) {
        if(rules.options["Game Version"]) UI.fillDropdown('inp-version', rules.options["Game Version"]);
        if(rules.options["Application Types"]) UI.fillDropdown('inp-apps-type', rules.options["Application Types"]);
        if(rules.options["Game Format"]) UI.fillDropdown('inp-format', rules.options["Game Format"]);
    }
    
    // Tier Dropdown
    if (rules && rules.tier) {
        const tierSelect = document.getElementById('inp-tier');
        if (tierSelect) {
            tierSelect.setAttribute('multiple', 'true');
            tierSelect.innerHTML = ''; 
            Object.keys(rules.tier).sort().forEach(key => {
                const el = document.createElement('option');
                el.value = key; 
                el.textContent = key;
                tierSelect.appendChild(el);
            });
        }
    }
    
    await initEventsDropdown(); 
    await initTemplateDropdown(); 

    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('id');

    // Callbacks for dynamic rows
    const callbacks = {
        onUpdate: () => {
            updateSessionCalculations();
            updateLootInstructions();
            updateLootDeclaration(); // Update standard Loot Declaration
            updateHgenLogic();       // Update Hgenloot Logic
            updateDMLootLogic();     // Update DM Loot Logic
        },
        onOpenModal: (btn, ctx, isDM) => UI.openIncentivesModal(btn, ctx, isDM, cachedGameRules)
    };
    
    window._sessionCallbacks = callbacks;

    if (sessionId) {
        await loadSessionData(sessionId, callbacks);
    } 

    const hoursInput = document.getElementById('inp-session-total-hours');
    if(hoursInput) {
        hoursInput.addEventListener('input', () => {
            const val = parseFloat(hoursInput.value) || 0;
            if (val > 5.5) {
                const proceed = confirm("Duration exceeds 5.5 hours. Do you want to create the next part automatically?");
                if(proceed) {
                    hoursInput.value = 3;
                    updateSessionCalculations();
                    document.getElementById('chk-next-part').checked = true;
                    const currentName = document.getElementById('header-game-name').value;
                    const nextName = incrementPartName(currentName);
                    document.getElementById('inp-copy-name').value = nextName;
                    document.getElementById('modal-copy-game').showModal();
                }
            } else {
                updateSessionCalculations();
            }
        });
    }

    setupCalculationTriggers(callbacks);
    
    // Listeners for Loot Plan inputs
    const lootPlanInput = document.getElementById('inp-loot-plan');
    if (lootPlanInput) lootPlanInput.addEventListener('input', updateLootDeclaration);

    const gameNameInput = document.getElementById('header-game-name');
    if (gameNameInput) {
        gameNameInput.addEventListener('input', () => {
            updateLootDeclaration();
            updateHgenLogic();
            updateDMLootLogic();
        });
    }

    // Listeners for Hgen inputs
    ['inp-predet-perms', 'inp-predet-cons'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('input', updateHgenLogic);
    });
    
    // Initial Loot Update call
    setTimeout(() => {
        updateLootInstructions();
        updateLootDeclaration();
        updateHgenLogic();
        updateDMLootLogic();
    }, 1000);
});

function setupCalculationTriggers(callbacks) {
    const dmLevel = document.getElementById('out-dm-level');
    const dmGames = document.getElementById('out-dm-games');
    const btnDMInc = document.getElementById('btn-dm-incentives');
    const syncBtn = document.getElementById('btn-sync-roster');
    const addPlayerBtn = document.getElementById('btn-add-session-player');

    // Existing session log triggers
    if(dmLevel) dmLevel.addEventListener('input', callbacks.onUpdate);
    if(dmGames) dmGames.addEventListener('input', callbacks.onUpdate);
    if(btnDMInc) btnDMInc.addEventListener('click', () => callbacks.onOpenModal(btnDMInc, null, true));
    
    if(syncBtn) syncBtn.addEventListener('click', () => {
        if(confirm("Replace session roster with game setup roster?")) {
            Rows.syncSessionPlayersFromMaster(callbacks);
        }
    });

    if(addPlayerBtn) addPlayerBtn.addEventListener('click', () => {
        Rows.addSessionPlayerRow(document.getElementById('session-roster-list'), {}, callbacks);
    });

    // NEW: Listeners for DM Loot Logic (View 5)
    // We bind to the Setup inputs because Loot Planning often happens before Session Logging
    const dmLevelInputSetup = document.getElementById('inp-dm-level'); 
    const dmGamesInputSetup = document.getElementById('inp-dm-games-count'); 
    const dmIncentivesSelect = document.getElementById('inp-dm-incentives');

    if(dmLevelInputSetup) dmLevelInputSetup.addEventListener('input', updateDMLootLogic);
    if(dmGamesInputSetup) dmGamesInputSetup.addEventListener('change', updateDMLootLogic);
    if(dmIncentivesSelect) dmIncentivesSelect.addEventListener('change', updateDMLootLogic);
    
    // Trigger update on Roster changes (View 4 Roster affects View 5 Loot)
    const rosterBody = document.getElementById('roster-body');
    if (rosterBody) {
        rosterBody.addEventListener('change', updateDMLootLogic);
        rosterBody.addEventListener('click', (e) => {
            if (e.target.matches('.btn-delete-row')) {
                setTimeout(updateDMLootLogic, 100); 
            }
        });
    }
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

// --- UPDATED: Triggers loot instruction update on player changes ---
function initPlayerSetup() {
    const btnAdd = document.getElementById('btn-add-player');
    const rosterBody = document.getElementById('roster-body');

    // 1. Add Player Button
    if(btnAdd) {
        btnAdd.addEventListener('click', () => { 
            Rows.addPlayerRowToMaster({});
            // Wait slightly longer than session-rows.js (50ms) to ensure stats are ready
            setTimeout(() => {
                 updateLootInstructions();
                 updateLootDeclaration();
                 updateHgenLogic();
                 updateDMLootLogic();
            }, 150);
        }); 
    }

    // 2. Listen for changes in the table (Level inputs or Deletions)
    if (rosterBody) {
        rosterBody.addEventListener('input', (e) => {
            // If level fields change
            if (e.target.matches('.inp-level') || e.target.matches('.inp-level-play-as')) {
                setTimeout(() => {
                     updateLootInstructions();
                     updateLootDeclaration();
                     updateHgenLogic();
                     updateDMLootLogic();
                }, 150);
            }
        });

        rosterBody.addEventListener('click', (e) => {
            // If delete button clicked
            if (e.target.matches('.btn-delete-row')) {
                setTimeout(() => {
                     updateLootInstructions();
                     updateLootDeclaration();
                     updateHgenLogic();
                     updateDMLootLogic();
                }, 150);
            }
        });
    }
}

// --- UPDATED: Triggers loot update after sync ---
function initPlayerSync() {
    const btnGenerate = document.getElementById('btn-generate-invite');
    const btnCopy = document.getElementById('btn-copy-invite');
    const inpInvite = document.getElementById('inp-invite-link');
    const btnSync = document.getElementById('btn-sync-submissions');

    if (btnGenerate) {
        btnGenerate.addEventListener('click', () => {
            const urlParams = new URLSearchParams(window.location.search);
            const id = urlParams.get('id');
            if (!id) return alert("Please save the session first to generate a Session ID.");
            
            const path = window.location.pathname;
            const directory = path.substring(0, path.lastIndexOf('/'));
            const inviteUrl = `${window.location.origin}${directory}/player-entry.html?session_id=${id}`;
            
            if(inpInvite) inpInvite.value = inviteUrl;
        });
    }

    if (btnCopy) {
        btnCopy.addEventListener('click', () => {
            if (!inpInvite || !inpInvite.value) return alert("Generate a link first.");
            
            navigator.clipboard.writeText(inpInvite.value).then(() => {
                const originalText = btnCopy.innerText;
                btnCopy.innerText = "Copied!";
                setTimeout(() => btnCopy.innerText = originalText, 2000);
            }).catch(err => {
                console.error('Failed to copy: ', err);
                prompt("Copy this link:", inpInvite.value);
            });
        });
    }

    if (btnSync) {
        btnSync.addEventListener('click', async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const id = urlParams.get('id');
            if (!id) return alert("Please save the session first.");

            const submissions = await fetchPlayerSubmissions(id);
            if (!submissions || submissions.length === 0) {
                return alert("No player submissions found for this session.");
            }
            await Rows.syncMasterRosterFromSubmissions(submissions);
            alert(`Synced ${submissions.length} player(s) from submissions.`);
            
            // Recalculate loot instructions after sync
            setTimeout(() => {
                updateLootInstructions();
                updateLootDeclaration();
                updateHgenLogic();
                updateDMLootLogic();
            }, 200);
        });
    }
    
    const btnSyncSession = document.getElementById('btn-sync-session');
    if(btnSyncSession) {
        btnSyncSession.addEventListener('click', async () => {
             const urlParams = new URLSearchParams(window.location.search);
             const id = urlParams.get('id');
             if(!id) return alert("Save session first");
             
             if (!confirm("This will merge player submissions into your Session Log.\n\nContinue?")) return;
             
             const submissions = await fetchPlayerSubmissions(id);
             Rows.applyPlayerSubmissions(submissions, window._sessionCallbacks);
        });
    }
}

// NEW: Initialize DM Loot Incentives based on database rules
// Updated to use a <select multiple> instead of checkboxes, with robust loading handling
function initDMLootIncentives() {
    const select = document.getElementById('inp-dm-incentives');
    // Guard clause if container or rules are missing
    if (!select) return;

    // Clear "Loading..." immediately
    select.innerHTML = '';

    if (!cachedGameRules || !cachedGameRules['DM incentives']) {
        const opt = document.createElement('option');
        opt.text = "No incentives found.";
        opt.disabled = true;
        select.add(opt);
        select.disabled = true;
        return;
    }

    const incentives = cachedGameRules['DM incentives'];
    let count = 0;

    for (const [name, data] of Object.entries(incentives)) {
        // Safe Parse: Ensure string numbers are treated as numbers
        const bonusRoll = parseInt(data["bonus loot roll"] || 0);

        // Filter: only show if bonus loot roll > 0
        if (bonusRoll > 0) {
            count++;
            const option = document.createElement('option');
            option.value = name;
            option.dataset.bonus = bonusRoll;
            option.textContent = `${name} (+${bonusRoll} Roll)`;
            select.appendChild(option);
        }
    }

    if (count === 0) {
        select.innerHTML = '<option value="" disabled>No bonus loot incentives available</option>';
        select.disabled = true;
    } else {
        select.disabled = false;
    }
}

// ==========================================
// 3. Calculation Logic
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

    rewards.xp = calculateXP(dmLevel, hours, rules);

    let dtp = Math.floor(5 * hours) + (5 * newHireCount);
    if (rules['DM incentives']) {
        selectedIncentives.forEach(name => {
            dtp += (rules['DM incentives'][name] || 0);
        });
    }
    rewards.dtp = dtp;

    if (isJumpstart) {
        const safeApl = Math.floor(sessionApl) || 1;
        rewards.gp = rules.gold_per_session_by_apl ? (rules.gold_per_session_by_apl[safeApl] || 0) : 0;
    }

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
    
    const container = document.getElementById('view-session-details');
    if(!container) return;

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

// Dynamic Loot Instructions based on Role, Tier, Party
function updateLootInstructions() {
    const container = document.getElementById('out-loot-instructions');
    if (!container) return;

    // Grab stats from the setup tab (View 4)
    const tierEl = document.getElementById('setup-val-tier');
    const partySizeEl = document.getElementById('setup-val-party-size');
    
    const tier = parseInt(tierEl ? tierEl.textContent : "1") || 1;
    const partySize = parseInt(partySizeEl ? partySizeEl.textContent : "0") || 0;
    
    const halfParty = Math.floor(partySize / 2);
    
    let html = "";
    
    if (isFullDM) {
        // --- FULL DM ---
        html += `<strong>Full DM (Tier ${tier}, ${partySize} Players)</strong><br><br>`;

        if (tier === 1) {
            html += `You can pre-determine up to <strong>${partySize}</strong> Tier 1 loot items.<br>`;
            html += `Up to <strong>${halfParty}</strong> permanents are allowed.<br>`;
            html += `<em>Bonus loot:</em> You can also select up to <strong>${halfParty}</strong> T0 items (up to only 1 T0 permanent).`;
        } 
        else if (tier === 2) {
            html += `You can pre-determine up to <strong>${partySize}</strong> Tier 2 or lower loot items.<br>`;
            html += `Up to <strong>${halfParty}</strong> permanents are allowed.<br>`;
            html += `<em>Bonus loot:</em> You can also select up to <strong>${halfParty}</strong> T0 items (up to only 1 T0 permanent).`;
        }
        else if (tier === 3) {
            html += `You can pre-determine up to <strong>${partySize}</strong> Tier 3 or lower loot items.<br>`;
            html += `Up to <strong>${halfParty}</strong> permanents are allowed.<br>`;
            html += `<em>Bonus loot:</em> You can also select up to <strong>${halfParty}</strong> T0 items (up to only 1 T0 permanent).`;
        }
        else if (tier >= 4) {
            html += `You can pre-determine up to <strong>${partySize}</strong> Tier 3 or lower loot items.<br>`;
            html += `Up to <strong>${halfParty}</strong> permanents are allowed.<br>`;
            html += `<em>Bonus loot:</em> Add up to 1 T1 permanent or 2 slots worth of T1 consumables as either predetermined or from a roll at APL 4.`;
        }

        html += `<br><br><small>Please refer to the <a href="https://drive.google.com/file/d/1MiXp60GBg2ZASiiGjgFtTRFHp7Jf0m2P/view?usp=sharing" target="_blank">DM Guide</a> for full loot rules, including multi-session loot rules.</small>`;
    
    } else {
        // --- TRIAL DM ---
        html += `<strong>Trial DM (Tier ${tier}, ${partySize} Players)</strong><br><br>`;
        
        if (tier === 1) {
            html += `You can pre-determine up to <strong>${partySize}</strong> Tier 1 loot items.<br>`;
            html += `Up to <strong>${halfParty}</strong> permanents are allowed.<br>`;
            html += `<em>Bonus loot:</em> You can also select up to <strong>${halfParty}</strong> T0 items (up to only 1 T0).`;
        }
        else if (tier === 2) {
            html += `You can pre-determine up to <strong>${partySize}</strong> Tier 2 or lower loot items.<br>`;
            html += `Up to <strong>${halfParty}</strong> permanents are allowed.<br>`;
            html += `<em>Bonus loot:</em> You can also select up to <strong>${halfParty}</strong> T0 items (up to only 1 T0).`;
        }
        else {
            // Tier 3+
            html += `As a Trial DM, you must use the loot roll bot for Tier 3 or higher games.<br>`;
            html += `Use the loot roll command instructions below to roll for loot.`;
        }
        html += `<br><br><small>Please refer to the <a href="https://drive.google.com/file/d/1MiXp60GBg2ZASiiGjgFtTRFHp7Jf0m2P/view?usp=sharing" target="_blank">DM Guide</a> for full loot rules.</small>`;
    }

    container.innerHTML = html;
}

// NEW: Calculates DM Loot Plan logic (View 5) based on Setup Roster (View 4)
async function updateDMLootLogic() {
    // 1. Calculate Roster Stats from Setup Roster (View 4)
    // We use Setup Roster because Planning happens before Session Logging
    const rows = document.querySelectorAll('#roster-body .player-row');
    let newHires = 0;
    let welcomeWagon = 0;

    rows.forEach(row => {
        const gamesVal = row.querySelector('.inp-games-count').value;
        const gamesNum = parseInt(gamesVal);
        
        if (gamesVal === "1") welcomeWagon++;
        // New Hire: Not "10+" and <= 10
        if (gamesVal !== "10+" && !isNaN(gamesNum) && gamesNum <= 10) {
            newHires++;
        }
    });

    // 2. DM Jumpstart Logic
    const dmGamesInput = document.getElementById('inp-dm-games-count');
    const dmGamesVal = dmGamesInput ? dmGamesInput.value : "10+";
    const dmGamesNum = parseInt(dmGamesVal) || 999;
    const isJumpstart = (dmGamesVal !== "10+" && dmGamesNum <= 10);

    // 3. Update UI Read-only fields
    const elNewHires = document.getElementById('loot-val-newhires');
    const elWelcome = document.getElementById('loot-val-welcome');
    const elJump = document.getElementById('loot-val-jumpstart');

    if(elNewHires) elNewHires.value = newHires;
    if(elWelcome) elWelcome.value = welcomeWagon;
    if(elJump) elJump.value = isJumpstart ? "Yes" : "No";

    // 4. Calculate Loot Rolls
    // Base 1 + New Hires
    let totalRolls = 1 + newHires;
    
    // Check Selected Incentives (From Multi-Select)
    const selectEl = document.getElementById('inp-dm-incentives');
    let incentiveNames = [];
    
    if (newHires > 0) incentiveNames.push(`New Hires (${newHires})`);
    
    // NOTE: Jumpstart is handled separately in output now, but technically part of the "reasoning"
    // if (isJumpstart) incentiveNames.push("Jumpstart"); // Removed to separate output

    if (selectEl && selectEl.selectedOptions) {
        Array.from(selectEl.selectedOptions).forEach(opt => {
            const bonus = parseInt(opt.dataset.bonus) || 0;
            totalRolls += bonus;
            incentiveNames.push(opt.value);
        });
    }

    // 5. Generate Output Text
    const gameName = document.getElementById('header-game-name').value || "Untitled Game";
    const dmLvlInput = document.getElementById('inp-dm-level');
    const dmLvl = dmLvlInput ? dmLvlInput.value : "0";
    
    // Get Discord ID
    let discordId = "YOUR_ID";
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.identities) {
            const identity = user.identities.find(i => i.provider === 'discord');
            if(identity && identity.id) discordId = identity.id;
        }
    } catch (e) { console.warn("ID fetch error"); }

    // -- Declaration --
    const incentiveStr = incentiveNames.length > 0 ? `, Incentives: ${incentiveNames.join(', ')}` : "";
    const declText = `<@${discordId}> rolls loot for Game **${gameName}**${incentiveStr}`;
    
    const outDecl = document.getElementById('out-dm-loot-decl');
    if (outDecl) outDecl.value = declText;

    // -- Command (Standard) --
    // REMOVED JUMPSTART TEXT APPENDING HERE
    let cmdText = `/hgenloot ${totalRolls} ${dmLvl}`;
    const outCmd = document.getElementById('out-dm-loot-cmd');
    if (outCmd) outCmd.value = cmdText;

    // -- Jumpstart Command (Hidden/Shown) --
    const jumpWrapper = document.getElementById('wrapper-jumpstart-bonus');
    const jumpCmd = document.getElementById('out-dm-jumpstart-cmd');
    
    if (isJumpstart) {
        if(jumpWrapper) jumpWrapper.style.display = "block"; // SHOW
        if(jumpCmd) jumpCmd.value = `/hgenloot 1 ${dmLvl}`;
    } else {
        if(jumpWrapper) jumpWrapper.style.display = "none";  // HIDE
    }
}