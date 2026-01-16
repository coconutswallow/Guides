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

let cachedDiscordId = "YOUR_ID"; // Default fallback

async function cacheDiscordId() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.identities) {
            // Find the identity linked to Discord to get the Snowflake ID
            const identity = user.identities.find(i => i.provider === 'discord');
            if (identity && identity.id) {
                cachedDiscordId = identity.id;
            }
        }
    } catch (e) {
        console.warn("Could not fetch Discord ID:", e);
    }
}

// ==========================================
// 1. Initialization
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    await cacheDiscordId();
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
    UI.initIncentivesModal((ctx) => {
        updateSessionCalculations();
        updateDMLootLogic();
    });
    
    // Restore logic functions
    initCopyGameLogic();
    initTemplateLogic(); 
    initPlayerSetup();
    initPlayerSync();

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
            updateLootDeclaration(); 
            updateHgenLogic();       
            updateDMLootLogic();     
        },
        onOpenModal: (btn, ctx, isDM) => UI.openIncentivesModal(btn, ctx, isDM, cachedGameRules)
    };
    
    window._sessionCallbacks = callbacks;

    if (sessionId) {
        await loadSessionData(sessionId, callbacks);
    } 

    // Session Hours "Next Part" Logic
    const hoursInput = document.getElementById('inp-session-total-hours');
    if(hoursInput) {
        hoursInput.addEventListener('change', () => { 
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
    // 1. Automatic Roster Sync on Tab Switch
    const sidebarNav = document.getElementById('sidebar-nav');
    if (sidebarNav) {
        sidebarNav.addEventListener('click', (e) => {
            const item = e.target.closest('.nav-item');
            if (item && item.dataset.target === 'view-session-details') {
                // Automatically sync roster when entering Session Details tab
                Rows.syncSessionPlayersFromMaster(callbacks);
            }
        });
    }

    // 2. Session Hours Clamping & Recalc
    const sessionHoursInput = document.getElementById('inp-session-total-hours');
    if (sessionHoursInput) {
        sessionHoursInput.addEventListener('input', () => {
             updateSessionCalculations(); // Clamps player hours instantly
        });
    }

    // 3. Existing triggers
    const dmLevel = document.getElementById('out-dm-level');
    const dmGames = document.getElementById('out-dm-games');
    const btnDMIncLoot = document.getElementById('btn-dm-loot-incentives');
    const syncBtn = document.getElementById('btn-sync-session'); // The manual sync button for submissions
    const addPlayerBtn = document.getElementById('btn-add-session-player');

    if(dmLevel) dmLevel.addEventListener('input', callbacks.onUpdate);
    if(dmGames) dmGames.addEventListener('input', callbacks.onUpdate);
    // Button in View 5 for DM Incentives
    if(btnDMIncLoot) btnDMIncLoot.addEventListener('click', () => callbacks.onOpenModal(btnDMIncLoot, null, true));
    
    if(syncBtn) {
        syncBtn.addEventListener('click', async () => {
             const urlParams = new URLSearchParams(window.location.search);
             const id = urlParams.get('id');
             if(!id) return alert("Save session first");
             
             if (!confirm("This will merge player submissions into your Session Log.\n\nContinue?")) return;
             
             const submissions = await fetchPlayerSubmissions(id);
             Rows.applyPlayerSubmissions(submissions, callbacks);
        });
    }

    if(addPlayerBtn) addPlayerBtn.addEventListener('click', () => {
        Rows.addSessionPlayerRow(document.getElementById('session-roster-list'), {}, callbacks);
    });

    // Listeners for DM Loot Logic (View 5)
    const dmLevelInputSetup = document.getElementById('inp-dm-level'); 
    const dmGamesInputSetup = document.getElementById('inp-dm-games-count'); 
    // Note: old Select element listener removed
    
    if(dmLevelInputSetup) dmLevelInputSetup.addEventListener('input', updateDMLootLogic);
    if(dmGamesInputSetup) dmGamesInputSetup.addEventListener('change', updateDMLootLogic);
    
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

function initPlayerSetup() {
    const btnAdd = document.getElementById('btn-add-player');
    const rosterBody = document.getElementById('roster-body');

    if(btnAdd) {
        btnAdd.addEventListener('click', () => { 
            Rows.addPlayerRowToMaster({});
            setTimeout(() => {
                 updateLootInstructions();
                 updateLootDeclaration();
                 updateHgenLogic();
                 updateDMLootLogic();
            }, 150);
        }); 
    }

    if (rosterBody) {
        rosterBody.addEventListener('input', (e) => {
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
            
            setTimeout(() => {
                updateLootInstructions();
                updateLootDeclaration();
                updateHgenLogic();
                updateDMLootLogic();
            }, 200);
        });
    }
}

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
    
    const btnSaveSetup = document.getElementById('btn-save-template-setup');
    const btnDelete = document.getElementById('btn-delete-template');
    
    if(btnOpen) btnOpen.addEventListener('click', () => modal.showModal());
    
    if(btnSaveSetup) btnSaveSetup.addEventListener('click', () => {
        const currentName = document.getElementById('header-game-name').value;
        if(currentName) document.getElementById('inp-template-name').value = currentName;
        modal.showModal();
    });
    
    if(btnDelete) {
        btnDelete.addEventListener('click', async () => {
            const tmplId = document.getElementById('template-select').value;
            if(!tmplId) return alert("Please select a template to delete.");
            
            if(confirm("Are you sure you want to delete this template? This cannot be undone.")) {
                try {
                    await deleteSession(tmplId); 
                    await initTemplateDropdown(); 
                    alert("Template deleted.");
                } catch(e) {
                    console.error(e);
                    alert("Error deleting template.");
                }
            }
        });
    }
    
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
                await initTemplateDropdown(); 
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
                IO.populateForm(session, window._sessionCallbacks, { keepTitle: true });
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

// ==========================================
// 3. Loot & Logic Calculations
// ==========================================

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
    
    // Note: isFullDM is a global variable defined at the top of this file
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

// Updates the "Loot Declaration" text area for Discord
function updateLootDeclaration() {
    const gameName = document.getElementById('header-game-name')?.value || "Untitled";
    
    // Grab stats from the setup tab text (calculated by View 4)
    // Fallback to "0" or "1" if elements are missing
    const partySize = document.getElementById('setup-val-party-size')?.textContent || "0";
    const apl = document.getElementById('setup-val-apl')?.textContent || "1";
    
    // The manually entered loot items
    const lootPlan = document.getElementById('inp-loot-plan')?.value || "";
    
    // 1. Declaration Format (Used when specific loot is listed)
    // Note: Adds the || spoilers around the item list
    const declareText = `<@${cachedDiscordId}> declares loot for Game: ${gameName}, Number of Players: ${partySize}, APL ${apl}:\n||\n${lootPlan}\n||`;

    // 2. Roll Format (Used when generic bot rolling is needed)
    const rollText = `<@${cachedDiscordId}> rolls loot for Game: ${gameName}, Number of Players: ${partySize}, APL ${apl}.`;

    const out = document.getElementById('out-loot-declaration');
    if (out) {
        // If there is text in the loot plan, use the Declaration format.
        // Otherwise, default to the Roll format.
        if (lootPlan.trim().length > 0) {
            out.value = declareText;
        } else {
            out.value = rollText;
        }
    }
}

// Updates the /hgenloot command output
function updateHgenLogic() {
    const partySize = document.getElementById('setup-val-party-size')?.textContent || "0";
    const apl = document.getElementById('setup-val-apl')?.textContent || "1";
    
    // Parse the inputs for predetermined items, defaulting to 0
    const permsVal = parseInt(document.getElementById('inp-predet-perms')?.value || "0");
    const consVal = parseInt(document.getElementById('inp-predet-cons')?.value || "0");
    
    // Base Command: /hgenloot [players] [apl]
    let cmd = `/hgenloot ${partySize} ${apl}`;
    
    // Optional: Add predetermined_perms if > 0
    if (permsVal > 0) {
        cmd += ` ${permsVal}`;
    }
    
    // Optional: Add predetermined_cons if > 0
    // Note: If perms is 0 but cons is > 0, we must include the 0 for perms 
    // to ensure the bot parses the arguments in the correct order.
    if (consVal > 0) {
        if (permsVal <= 0) cmd += ` 0`; // Filler for missing perms arg
        cmd += ` ${consVal}`;
    }
    
    const out = document.getElementById('out-hgen-cmd');
    if(out) out.value = cmd;
}
// ==========================================
// 4. Session Calculations
// ==========================================

function calculateXP(level, hours, rules) {
    if (!rules || !rules.xp_per_hour) return 0;
    const safeLevel = parseInt(level) || 1;
    // Handle both string and number keys in JSON lookup
    const hourlyXP = rules.xp_per_hour[safeLevel.toString()] || rules.xp_per_hour[safeLevel] || 0;
    return Math.floor(hourlyXP * hours);
}

function calculatePlayerRewards(level, hours, rules, incentives = []) {
    const xp = calculateXP(level, hours, rules);
    
    // Base DTP: 5 per hour
    let dtp = Math.floor(5 * hours);
    
    // Incentive Bonus DTP
    if (rules && rules['player incentives']) {
        incentives.forEach(name => {
            dtp += (rules['player incentives'][name] || 0);
        });
    }
    return { xp, dtp };
}

function calculateDMRewards(dmLevel, hours, newHireCount, welcomeWagonCount, rules, selectedIncentives = []) {
    const rewards = { xp: 0, dtp: 0, gp: 0 };
    if (!rules) return rewards;

    rewards.xp = calculateXP(dmLevel, hours, rules);

    // DM DTP Formula: floor(5 * hours) + 5x (number of new hires) + bonus incentives
    let dtp = Math.floor(5 * hours) + (5 * newHireCount);
    
    if (rules['DM incentives']) {
        selectedIncentives.forEach(name => {
            const incData = rules['DM incentives'][name];
            // Bonus can be a direct number or object with "bonus DTP"
            const bonus = (typeof incData === 'number') ? incData : (incData?.['bonus DTP'] || incData?.DTP || 0);
            dtp += bonus;
        });
    }
    rewards.dtp = dtp;

    // DM Gold Formula: (lookup gold per session for DMPC Level) x (1 + Welcome Wagon Count)
    const safeLevel = parseInt(dmLevel) || 1;
    const goldTable = rules.gold_per_session_by_apl; // Using this table for DM Level lookup as per instruction
    const baseGold = goldTable ? (goldTable[safeLevel.toString()] || goldTable[safeLevel] || 0) : 0;
    
    rewards.gp = baseGold * (1 + welcomeWagonCount);

    return rewards;
}

function updateSessionCalculations() {
    if (!cachedGameRules) return; 
    
    const container = document.getElementById('view-session-details');
    if(!container) return;

    // 1. Get Session Total Hours
    const sessionHoursInput = document.getElementById('inp-session-total-hours');
    const sessionTotalHours = parseFloat(sessionHoursInput.value) || 0;

    // 2. Determine Max Gold
    const aplText = document.getElementById('setup-val-apl')?.textContent || "1";
    const aplVal = parseInt(aplText) || 1;
    
    const goldTable = cachedGameRules.gold_per_session_by_apl || {};
    const maxGold = goldTable[aplVal.toString()] || goldTable[aplVal] || 0;
    
    const lblGold = container.querySelector('.val-max-gold');
    if(lblGold) lblGold.textContent = maxGold;

    // 3. Process Player Cards
    let totalLevel = 0;
    let playerCount = 0;
    let welcomeWagonCount = 0;
    let newHireCount = 0;

    const cards = container.querySelectorAll('.player-card');
    cards.forEach(card => {
        // Stats Gathering
        const lvl = parseFloat(card.querySelector('.s-level').value) || 0;
        if(lvl > 0) { totalLevel += lvl; playerCount++; }

        const gVal = card.querySelector('.s-games').value;
        const gNum = parseInt(gVal);

        if (gVal === "1") welcomeWagonCount++;
        if (gVal !== "10+" && !isNaN(gNum) && gNum <= 10) newHireCount++;
        
        // Hours Logic: Clamp to session total
        const hInput = card.querySelector('.s-hours');
        // If undefined/empty, default to session total
        if(!hInput.value) hInput.value = sessionTotalHours;
        let pHours = parseFloat(hInput.value) || 0;
        if (pHours > sessionTotalHours) {
            pHours = sessionTotalHours;
            hInput.value = pHours; 
        }

        // Gold Validation
        const gInput = card.querySelector('.s-gold');
        const playerGold = parseFloat(gInput.value) || 0;
        
        if (maxGold > 0 && playerGold > maxGold) {
            gInput.parentElement.classList.add('error');
        } else {
            gInput.parentElement.classList.remove('error');
        }

        // Calculate Rewards (XP & DTP)
        const btn = card.querySelector('.s-incentives-btn');
        const incentives = JSON.parse(btn.dataset.incentives || '[]');
        const rewards = calculatePlayerRewards(lvl, pHours, cachedGameRules, incentives);
        
        card.querySelector('.s-xp').value = rewards.xp;
        card.querySelector('.s-dtp').value = rewards.dtp;
    });

    // 4. Calculate DM Rewards
    const dmLevelSetup = document.getElementById('inp-dm-level');
    const dmGamesSetup = document.getElementById('inp-dm-games-count');
    const dmNameSetup = document.getElementById('inp-dm-char-name');

    // Sync Name to Read-only field
    if(dmNameSetup) document.getElementById('out-dm-name').value = dmNameSetup.value;
    
    const dmLvl = parseFloat(dmLevelSetup ? dmLevelSetup.value : 0) || 0;
    const dmGamesVal = dmGamesSetup ? dmGamesSetup.value : "10+";
    const dmGamesNum = parseInt(dmGamesVal) || 999; 
    const isJumpstart = (dmGamesVal !== "10+" && dmGamesNum <= 10);

    container.querySelector('.dm-val-jumpstart').value = isJumpstart ? "Yes" : "No";
    container.querySelector('.dm-val-welcome').value = welcomeWagonCount;
    container.querySelector('.dm-val-newhires').value = newHireCount;

    // READ INCENTIVES FROM VIEW 5 BUTTON
    const btnDM = document.getElementById('btn-dm-loot-incentives');
    const dmIncentives = JSON.parse(btnDM ? btnDM.dataset.incentives : '[]');
    
    // Update read-only display in View 6
    const dmIncDisplay = document.getElementById('out-dm-incentives-display');
    if(dmIncDisplay) dmIncDisplay.value = dmIncentives.join(', ');

    const dmRewards = calculateDMRewards(
        dmLvl, 
        sessionTotalHours, 
        newHireCount, 
        welcomeWagonCount, 
        cachedGameRules, 
        dmIncentives
    );

    container.querySelector('.dm-res-xp').value = dmRewards.xp;
    container.querySelector('.dm-res-dtp').value = dmRewards.dtp;
    container.querySelector('.dm-res-gp').value = dmRewards.gp;
}

async function updateDMLootLogic() {
    // 1. Calculate Roster Stats
    const rows = document.querySelectorAll('#roster-body .player-row');
    let newHires = 0;
    let welcomeWagon = 0;

    rows.forEach(row => {
        const gamesVal = row.querySelector('.inp-games-count').value;
        const gamesNum = parseInt(gamesVal);
        
        if (gamesVal === "1") welcomeWagon++;
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
    let totalRolls = 1 + newHires;
    
    // UPDATED: Read from Button Dataset
    const btnDM = document.getElementById('btn-dm-loot-incentives');
    const selectedIncentives = JSON.parse(btnDM ? btnDM.dataset.incentives : '[]');
    let incentiveNames = [];
    
    if (newHires > 0) incentiveNames.push(`New Hires (${newHires})`);
    
    if (cachedGameRules && cachedGameRules['DM incentives']) {
        selectedIncentives.forEach(name => {
            const data = cachedGameRules['DM incentives'][name];
            const bonus = (typeof data === 'object') ? (data['bonus loot roll'] || 0) : 0;
            if (bonus > 0) totalRolls += bonus;
            incentiveNames.push(name);
        });
    }

    // 5. Generate Output Text
    const gameName = document.getElementById('header-game-name').value || "Untitled Game";
    const dmLvlInput = document.getElementById('inp-dm-level');
    const dmLvl = dmLvlInput ? dmLvlInput.value : "0";
    
    let discordId = "YOUR_ID";
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.identities) {
            const identity = user.identities.find(i => i.provider === 'discord');
            if(identity && identity.id) discordId = identity.id;
        }
    } catch (e) { console.warn("ID fetch error"); }

    const incentiveStr = incentiveNames.length > 0 ? `, Incentives: ${incentiveNames.join(', ')}` : "";
    const declText = `<@${discordId}> rolls loot for Game **${gameName}**${incentiveStr}`;
    
    const outDecl = document.getElementById('out-dm-loot-decl');
    if (outDecl) outDecl.value = declText;

    // Command (Standard)
    let cmdText = `/hgenloot ${totalRolls} ${dmLvl}`;
    const outCmd = document.getElementById('out-dm-loot-cmd');
    if (outCmd) outCmd.value = cmdText;

    // Jumpstart Command (Hidden/Shown)
    const jumpWrapper = document.getElementById('wrapper-jumpstart-bonus');
    const jumpCmd = document.getElementById('out-dm-jumpstart-cmd');
    
    if (isJumpstart) {
        if(jumpWrapper) jumpWrapper.style.display = "block";
        if(jumpCmd) jumpCmd.value = `/hgenloot 1 ${dmLvl}`;
    } else {
        if(jumpWrapper) jumpWrapper.style.display = "none";
    }
}