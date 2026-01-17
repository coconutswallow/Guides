// assets/js/dm-tool/session-editor-refactored.js
// FINAL VERSION with all fixes

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
import { updateSessionCalculations } from './session-calculator-optimized.js';
import { 
    updateLootInstructions, 
    updateLootDeclaration, 
    updateHgenLogic, 
    updateDMLootLogic 
} from './session-loot.js';

let cachedGameRules = null; 
let isFullDM = false; 
let cachedDiscordId = "YOUR_ID";
let updateDebounceTimer = null;

const domCache = {};
const UPDATE_DEBOUNCE_MS = 100;

async function cacheDiscordId() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.identities) {
            const identity = user.identities.find(i => i.provider === 'discord');
            if (identity && identity.id) {
                cachedDiscordId = identity.id;
            }
        }
    } catch (e) {
        console.warn("Could not fetch Discord ID:", e);
    }
}

function cacheDOMElements() {
    domCache.sessionHoursInput = document.getElementById('inp-session-total-hours');
    domCache.rosterBody = document.getElementById('roster-body');
    domCache.sidebarNav = document.getElementById('sidebar-nav');
    domCache.dmLevelSetup = document.getElementById('inp-dm-level');
    domCache.dmGamesSetup = document.getElementById('inp-dm-games-count');
}

function scheduleUpdate(callback) {
    if (updateDebounceTimer) {
        clearTimeout(updateDebounceTimer);
    }
    
    updateDebounceTimer = setTimeout(() => {
        callback();
        updateDebounceTimer = null;
    }, UPDATE_DEBOUNCE_MS);
}

function incrementPartName(name) {
    if(!name) return "Session Part 2";
    
    // Regex to find "Part X" at the end of the string (case insensitive)
    const match = name.match(/^(.*?)(\s?-?\s?Part\s?)(\d+)$/i);
    
    if(match) {
        // match[1] = "Game Name"
        // match[2] = " Part "
        // match[3] = "1"
        const num = parseInt(match[3]) + 1;
        return `${match[1]}${match[2]}${num}`;
    }
    
    // If no "Part X" found, append "Part 2"
    return `${name} Part 2`;
}

// Helper to increment "1" -> "2" ... "9" -> "10" -> "10+" -> "10+"
function incrementGameString(val) {
    if (val === "10+") return "10+";
    const num = parseInt(val);
    
    if (isNaN(num)) return "1"; // Default start
    
    if (num >= 10) return "10+";
    return (num + 1).toString();
}

function initCopyGameLogic() {
    const btnCopy = document.getElementById('btn-copy-game');
    const modal = document.getElementById('modal-copy-game');
    const btnConfirm = document.getElementById('btn-confirm-copy');
    
    if(btnCopy) {
        btnCopy.addEventListener('click', () => {
            const currentName = document.getElementById('header-game-name').value;
            
            // Auto-check "Next Part" if duration was maxed (handled in sessionHours listener), 
            // but we also default it to unchecked usually unless triggered by logic.
            // Here we just set the name.
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
            
            // 1. Update Title
            fullData.header.title = newName; 
            fullData.session_log.title = newName;
            
            // 2. Reset Session Specifics
            fullData.session_log.hours = 3; 
            fullData.session_log.notes = "";
            fullData.session_log.summary = "";
            fullData.session_log.dm_rewards.loot_selected = "";
            fullData.session_log.dm_rewards.incentives = []; // Clear one-time incentives
            
            // 3. Increment Games Logic
            if (isNextPart) {
                // Increment Master Roster Players
                if (fullData.players) {
                    fullData.players.forEach(p => {
                        p.games_count = incrementGameString(p.games_count);
                    });
                }
                
                // Increment DM
                if (fullData.dm) {
                    fullData.dm.games_count = incrementGameString(fullData.dm.games_count);
                }
                
                // Increment Session Log Players (if any are carried over)
                if (fullData.session_log.players) {
                    fullData.session_log.players.forEach(p => {
                        p.games_count = incrementGameString(p.games_count);
                        // Reset session specific player fields
                        p.hours = 3;
                        p.xp = "";
                        p.dtp = "";
                        p.gold = "";
                        p.loot = "";
                        p.items_used = "";
                        p.notes = "";
                        p.incentives = [];
                    });
                }
                
                // Update DM Rewards games count
                fullData.session_log.dm_rewards.games_played = fullData.dm.games_count;
            }
            
            const { data: { user } } = await supabase.auth.getUser();
            if(!user) return alert("Not logged in");

            try {
                // Create new session entry
                const newSession = await createSession(user.id, newName, false);
                if(newSession) {
                    // Save the modified data to the new session
                    await saveSession(newSession.id, fullData, { title: newName });
                    
                    // Redirect to new session
                    window.location.href = `session.html?id=${newSession.id}`;
                }
            } catch (e) {
                console.error(e);
                alert("Error copying game.");
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await cacheDiscordId();
    cachedGameRules = await fetchGameRules();
    
    cacheDOMElements();

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        isFullDM = await checkAccess(user.id, 'Full DM');
        console.log("User Role Check - Full DM:", isFullDM);
    }

    UI.initTabs(() => IO.generateOutput()); 
    UI.initTimezone();
    UI.initDateTimeConverter(); 
    UI.initAccordions();
    
    UI.initIncentivesModal((ctx) => {
        scheduleUpdate(() => {
            updateSessionCalculations(cachedGameRules);
            updateDMLootLogic(cachedDiscordId, cachedGameRules);
        });
    });
    
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

    const rules = cachedGameRules;
    if(rules && rules.options) {
        if(rules.options["Game Version"]) UI.fillDropdown('inp-version', rules.options["Game Version"]);
        if(rules.options["Application Types"]) UI.fillDropdown('inp-apps-type', rules.options["Application Types"]);
        if(rules.options["Game Format"]) UI.fillDropdown('inp-format', rules.options["Game Format"]);
    }
    
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

    const callbacks = {
        onUpdate: () => {
            scheduleUpdate(() => {
                updateSessionCalculations(cachedGameRules);
                updateLootInstructions(isFullDM);
                updateLootDeclaration(cachedDiscordId); 
                updateHgenLogic(cachedDiscordId);   
                updateDMLootLogic(cachedDiscordId, cachedGameRules);
                IO.updateJumpstartDisplay(); // FIX: Update jumpstart visibility
            });
        },
        onOpenModal: (btn, ctx, isDM) => UI.openIncentivesModal(btn, ctx, isDM, cachedGameRules)
    };
    
    window._sessionCallbacks = callbacks;

    if (domCache.sidebarNav) {
        domCache.sidebarNav.addEventListener('click', (e) => {
            const item = e.target.closest('.nav-item');
            if (!item) return;
            
            // Generate Session Log when navigating to that tab
            if (item.dataset.target === 'view-session-output') {
                // FIX 4A: Pass cachedDiscordId to the generator
                IO.generateSessionLogOutput(cachedDiscordId);
            }
            
            // Generate MAL when navigating to MAL tab
            if (item.dataset.target === 'view-mal-update') {
                IO.generateMALUpdate();
            }
        });
    }

    if (sessionId) {
        await loadSessionData(sessionId, callbacks);
    } 

    // FIX: Session Hours logic - update all player hours when changed
    if(domCache.sessionHoursInput) {
        domCache.sessionHoursInput.addEventListener('change', () => { 
            const val = parseFloat(domCache.sessionHoursInput.value) || 0;
            
            // FIX: Update all player card hours to match session hours
            const cards = document.querySelectorAll('#session-roster-list .player-card');
            const newSessionHours = parseFloat(domCache.sessionHoursInput.value) || 3;
            
            cards.forEach(card => {
                const hInput = card.querySelector('.s-hours');
                if (hInput) {
                    hInput.value = newSessionHours;
                    hInput.setAttribute('max', newSessionHours);
                }
            });
            
            if (val > 5.5) {
                const proceed = confirm("Duration exceeds 5.5 hours. Do you want to create the next part automatically?");
                if(proceed) {
                    domCache.sessionHoursInput.value = 3;
                    updateSessionCalculations(cachedGameRules);
                    document.getElementById('chk-next-part').checked = true;
                    const currentName = document.getElementById('header-game-name').value;
                    const nextName = incrementPartName(currentName);
                    document.getElementById('inp-copy-name').value = nextName;
                    document.getElementById('modal-copy-game').showModal();
                }
            } else {
                updateSessionCalculations(cachedGameRules);
            }
        });
    }

    setupCalculationTriggers(callbacks);
    
    const lootPlanInput = document.getElementById('inp-loot-plan');
    if (lootPlanInput) {
        lootPlanInput.addEventListener('input', () => {
            scheduleUpdate(() => updateLootDeclaration(cachedDiscordId));
        });
    }

    const gameNameInput = document.getElementById('header-game-name');
    if (gameNameInput) {
        gameNameInput.addEventListener('input', () => {
            scheduleUpdate(() => {
                updateLootDeclaration(cachedDiscordId);
                updateHgenLogic(cachedDiscordId);
                updateDMLootLogic(cachedDiscordId, cachedGameRules);
            });
        });
    }

    ['inp-predet-perms', 'inp-predet-cons'].forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.addEventListener('input', () => {
                scheduleUpdate(() => updateHgenLogic(cachedDiscordId));
            });
        }
    });
    
    setTimeout(() => {
        callbacks.onUpdate();
    }, 500);
});

function setupCalculationTriggers(callbacks) {
    if (domCache.sidebarNav) {
        domCache.sidebarNav.addEventListener('click', (e) => {
            const item = e.target.closest('.nav-item');
            if (item && item.dataset.target === 'view-session-details') {
                Rows.syncSessionPlayersFromMaster(callbacks);
                
                const setupDateInput = document.getElementById('inp-start-datetime');
                const sessionDateInput = document.getElementById('inp-session-date');
                if (setupDateInput && setupDateInput.value && sessionDateInput && !sessionDateInput.value) {
                    sessionDateInput.value = setupDateInput.value;
                    
                    const tz = document.getElementById('inp-timezone')?.value;
                    const unixVal = UI.toUnixTimestamp(setupDateInput.value, tz);
                    const sessionUnixInput = document.getElementById('inp-session-unix');
                    if (sessionUnixInput) sessionUnixInput.value = unixVal;
                }
            }
        });
    }

    const dmLevel = document.getElementById('out-dm-level');
    const dmGames = document.getElementById('out-dm-games');
    const btnDMIncLoot = document.getElementById('btn-dm-loot-incentives');
    const syncBtn = document.getElementById('btn-sync-session'); 
    const addPlayerBtn = document.getElementById('btn-add-session-player');

    if(dmLevel) {
        dmLevel.addEventListener('input', () => scheduleUpdate(callbacks.onUpdate));
    }
    if(dmGames) {
        dmGames.addEventListener('input', () => scheduleUpdate(callbacks.onUpdate));
    }
    
    if(btnDMIncLoot) {
        btnDMIncLoot.addEventListener('click', () => callbacks.onOpenModal(btnDMIncLoot, null, true));
    }
    
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

    if(addPlayerBtn) {
        addPlayerBtn.addEventListener('click', () => {
            Rows.addSessionPlayerRow(document.getElementById('session-roster-list'), {}, callbacks);
        });
    }

    if(domCache.dmLevelSetup) {
        domCache.dmLevelSetup.addEventListener('input', () => {
            scheduleUpdate(() => updateDMLootLogic(cachedDiscordId, cachedGameRules));
        });
    }
    if(domCache.dmGamesSetup) {
        domCache.dmGamesSetup.addEventListener('change', () => {
            scheduleUpdate(() => {
                updateDMLootLogic(cachedDiscordId, cachedGameRules);
                IO.updateJumpstartDisplay(); // FIX: Update on DM games change
            });
        });
    }
    
    if (domCache.rosterBody) {
        domCache.rosterBody.addEventListener('change', () => {
            scheduleUpdate(() => updateDMLootLogic(cachedDiscordId, cachedGameRules));
        });
        
        domCache.rosterBody.addEventListener('click', (e) => {
            if (e.target.matches('.btn-delete-row')) {
                setTimeout(() => {
                    scheduleUpdate(() => updateDMLootLogic(cachedDiscordId, cachedGameRules));
                }, 100); 
            }
        });
    }
}

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

    if(btnAdd) {
        btnAdd.addEventListener('click', () => { 
            Rows.addPlayerRowToMaster({});
            scheduleUpdate(() => {
                window._sessionCallbacks.onUpdate();
            });
        }); 
    }

    if (domCache.rosterBody) {
        domCache.rosterBody.addEventListener('input', (e) => {
            if (e.target.matches('.inp-level') || e.target.matches('.inp-level-play-as')) {
                scheduleUpdate(() => window._sessionCallbacks.onUpdate());
            }
        });

        domCache.rosterBody.addEventListener('click', (e) => {
            if (e.target.matches('.btn-delete-row')) {
                scheduleUpdate(() => window._sessionCallbacks.onUpdate());
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
            
            scheduleUpdate(() => window._sessionCallbacks.onUpdate());
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

function initTemplateLogic() {
    const modal = document.getElementById('modal-save-template');
    const btnOpen = document.getElementById('btn-open-save-template');
    const btnConfirm = document.getElementById('btn-confirm-save-template');
    const btnLoad = document.getElementById('btn-load-template');
    const btnSaveGame = document.getElementById('btn-save-game');
    const btnSaveSetup = document.getElementById('btn-save-template-setup');
    const btnDelete = document.getElementById('btn-delete-template');
    
    if(btnOpen) btnOpen.addEventListener('click', () => modal.showModal());
    
    if(btnSaveSetup) {
        btnSaveSetup.addEventListener('click', () => {
            const currentName = document.getElementById('header-game-name').value;
            if(currentName) document.getElementById('inp-template-name').value = currentName;
            modal.showModal();
        });
    }
    
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