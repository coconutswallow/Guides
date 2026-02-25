// assets/js/dm-tool/session-editor.js

/**
 *
 * https://github.com/hawthorneguild/HawthorneTeams/issues/6
 * 
 *  @fileoverview Main controller for the DM Tool Session Editor.
 * * This module orchestrates the interaction between the UI, the State Manager, 
 * the Calculation Engine, and the Data Layer (Supabase).
 * * Key Responsibilities:
 * 1. Initialization: Loading session data, game rules, and templates.
 * 2. Event Binding: connecting UI inputs to StateManager updates.
 * 3. Calculation Orchestration: Triggering math updates when inputs change.
 * 4. Persistence: Saving/Loading sessions and templates via DataManager.
 * * @module SessionEditor
 */

import { supabase } from '../supabaseClient.js';
import { stateManager } from './state-manager.js';
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
import { logError } from '../error-logger.js';

import { checkAccess } from '../auth-check.js';
import * as UI from './session-ui.js';
import * as Rows from './session-rows.js';
import * as IO from './session-io.js';
import CalculationEngine from './calculation-engine.js';
import {
    updateLootInstructions,
    updateLootDeclaration,
    updateHgenLogic,
    updateDMLootLogic
} from './session-loot.js';


// --- Global State & Cache ---

/** @type {CalculationEngine|null} Instance of the calculation logic engine */
let calculationEngine = null;

/** @type {Object|null} Cached copy of the game rules (XP tables, gold limits, etc.) */
let cachedGameRules = null;

/** @type {boolean} Flag indicating if the current user has "Full DM" privileges */
let isFullDM = false;

/** @type {string} Current user's Discord ID (used for mentions/tracking) */
let cachedDiscordId = "YOUR_ID";

/** @type {string} Current user's Display Name (used for MAL output) */
let cachedDisplayName = "DM";

/** * DOM Element Cache to reduce repeated `getElementById` calls for static elements.
 * @type {Object<string, HTMLElement>}
 */
const domCache = {};


/**
 * Fetches and caches the current user's Discord ID and Display Name from Supabase.
 * This is critical for generating correct discord mentions and MAL exports.
 * @async
 */
async function cacheDiscordId() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.identities) {
            // Extract Discord ID from auth identities
            const identity = user.identities.find(i => i.provider === 'discord');
            if (identity && identity.id) {
                cachedDiscordId = identity.id;
            }
        }

        // Fetch display name from the directory to ensure it matches server nickname
        if (cachedDiscordId) {
            const { data } = await supabase
                .from('discord_users')
                .select('display_name')
                .eq('discord_id', cachedDiscordId)
                .single();

            if (data && data.display_name) {
                cachedDisplayName = data.display_name;
            }
        }
    } catch (e) {
        logError('session-editor', `Could not fetch Discord ID: ${e.message}`, 'warning');
    }
}


/**
 * Caches frequently used static DOM elements into `domCache`.
 * Called once during initialization.
 */
function cacheDOMElements() {
    domCache.sessionHoursInput = document.getElementById('inp-session-total-hours');
    domCache.rosterBody = document.getElementById('roster-body');
    domCache.sidebarNav = document.getElementById('sidebar-nav');
    domCache.dmLevelSetup = document.getElementById('inp-dm-level');
    domCache.dmGamesSetup = document.getElementById('inp-dm-games-count');
}

/**
 * Generates the name for the next session part.
 * Logic:
 * - "Session Name" -> "Session Name Part 2"
 * - "Session Name Part 2" -> "Session Name Part 3"
 * * @param {string} name - The current session name.
 * @returns {string} The incremented name.
 */
function incrementPartName(name) {
    if (!name) return "Session Part 2";

    // Regex matches "Name", optional " - Part ", and the number
    const match = name.match(/^(.*?)(\s?-?\s?Part\s?)(\d+)$/i);

    if (match) {
        const num = parseInt(match[3]) + 1;
        return `${match[1]}${match[2]}${num}`;
    }

    return `${name} Part 2`;
}

/**
 * Increments the "Games Played" count string.
 * Handles the specific logic where "10" becomes "10+".
 * * @param {string} val - Current games count value.
 * @returns {string} Incremented value as string.
 */
function incrementGameString(val) {
    if (val === "10+") return "10+";
    const num = parseInt(val);

    if (isNaN(num)) return "1";

    if (num >= 10) return "10+";
    return (num + 1).toString();
}

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */

const DEFAULT_SESSION_HOURS = 3;
const MAX_SESSION_HOURS = 5.5;

// List of input IDs to be handled by event delegation
const DELEGATED_INPUT_IDS = [
    'inp-tone', 'inp-focus', 'inp-diff-encounter', 'inp-diff-threat', 'inp-diff-loss',
    'inp-house-rules', 'inp-setup-notes', 'inp-content-warnings', 'inp-how-to-apply',
    'inp-lobby-url', 'inp-listing-url', 'inp-session-notes', 'inp-dm-collab', 'inp-session-summary',
    'inp-game-listing-url', 'inp-dm-collab-link', 'inp-dm-collaborators'
];

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */

/**
 * Main initialization entry point.
 * Orchestrates the startup sequence.
 */
async function initSessionEditor() {
    try {
        await initValidUser();
        await initContext();
        initUI();
        bindEvents();

        // Final logic setup
        stateManager.init();
        logError('session-editor', 'State Manager Ready', 'info');

        // Initial Trigger
        scheduleUpdate(() => {
            updateSessionCalculations();
            updateLootInstructions(isFullDM);
            updateLootDeclaration(cachedDiscordId);
            updateHgenLogic(cachedDiscordId);
            updateDMLootLogic(cachedDiscordId, cachedGameRules);
            IO.updateJumpstartDisplay();
            IO.generateOutput();
        });

        // Load Data
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('id');
        if (sessionId) {
            await loadSessionData(sessionId, window._sessionCallbacks);
        }

    } catch (e) {
        logError('session-editor', `Initialization Failed: ${e.message}`, 'critical');
    }
}

async function initValidUser() {
    // 1. Check User Roles
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        isFullDM = await checkAccess(user.id, 'Full DM');
        logError('session-editor', `User Role Check - Full DM: ${isFullDM}`, 'info');
    } else {
        // Optional: Redirect or warn if no user?
    }
}

async function initContext() {
    await cacheDiscordId();
    cachedGameRules = await fetchGameRules();
    calculationEngine = new CalculationEngine(cachedGameRules);
}

function initUI() {
    cacheDOMElements();
    // 5. Initial UI Updates
    updateLootInstructions(isFullDM);

    // 6. Initialize UI Components
    UI.initTabs(() => IO.generateOutput());
    UI.initTimezone();
    UI.initDateTimeConverter();
    UI.initAccordions();

    // Initialize Incentives Modal with save callback
    UI.initIncentivesModal((ctx) => {
        scheduleUpdate(() => {
            updateSessionCalculations();
            updateDMLootLogic(cachedDiscordId, cachedGameRules);
        });
    });

    // 8. Populate Dropdowns from Game Rules
    const rules = cachedGameRules;
    if (rules && rules.options) {
        if (rules.options["Game Version"]) UI.fillDropdown('inp-version', rules.options["Game Version"]);
        if (rules.options["Application Types"]) UI.fillDropdown('inp-apps-type', rules.options["Application Types"]);
        if (rules.options["Game Format"]) UI.fillDropdown('inp-format', rules.options["Game Format"]);
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

    // Dropdowns
    initEventsDropdown();
    initTemplateDropdown();
}

function bindEvents() {
    const callbacks = {
        onUpdate: () => {
            scheduleUpdate(() => {
                updateSessionCalculations();
                updateLootInstructions(isFullDM);
                updateLootDeclaration(cachedDiscordId);
                updateHgenLogic(cachedDiscordId);
                updateDMLootLogic(cachedDiscordId, cachedGameRules);
                IO.updateJumpstartDisplay();
                IO.generateOutput();
            });
        },
        onOpenModal: (btn, ctx, isDM) => UI.openIncentivesModal(btn, ctx, isDM, cachedGameRules)
    };
    // Export callbacks
    window._sessionCallbacks = callbacks;

    // --- State Manager Subscribers ---
    stateManager.onUpdate('calculations', (state) => {
        updateSessionCalculations();
        updateLootInstructions(isFullDM);
        updateDMLootLogic(cachedDiscordId, cachedGameRules);
    });

    stateManager.onUpdate('lootDeclaration', (state) => {
        updateLootDeclaration(cachedDiscordId);
        updateHgenLogic(cachedDiscordId);
    });

    stateManager.onUpdate('dmLoot', (state) => {
        updateDMLootLogic(cachedDiscordId, cachedGameRules);
        IO.updateJumpstartDisplay();
    });

    stateManager.onUpdate('outputs', (state) => {
        IO.generateOutput();
    });

    // --- Input Delegation ---
    document.addEventListener('input', (e) => {
        const id = e.target.id;
        if (!id) return;

        if (DELEGATED_INPUT_IDS.includes(id)) {
            // Generic updates often just need to mark state as dirty or trigger simple debouncers
            // Check specific output triggers
            if (['inp-lobby-url', 'inp-listing-url', 'inp-game-listing-url', 'inp-dm-collab-link', 'inp-dm-collaborators'].includes(id)) {
                IO.generateOutput();
            }
        }
    });

    // --- Specific Listeners that need more than just input delegation ---

    // Session Roster
    const sessionRosterList = document.getElementById('session-roster-list');
    if (sessionRosterList) {
        sessionRosterList.addEventListener('change', (e) => {
            if (e.target.matches('.s-forfeit-xp')) {
                scheduleUpdate(() => {
                    updateSessionCalculations();
                });
            }
        });
    }

    // Nav
    if (domCache.sidebarNav) {
        domCache.sidebarNav.addEventListener('click', (e) => {
            const item = e.target.closest('.nav-item');
            if (!item) return;

            if (item.dataset.target === 'view-session-output') {
                IO.generateSessionLogOutput(cachedDiscordId, cachedDisplayName);
            }
            if (item.dataset.target === 'view-mal-update') {
                IO.generateMALUpdate(cachedDisplayName);
            }
            if (item.dataset.target === 'view-session-details') {
                Rows.syncSessionPlayersFromMaster(callbacks);
            }
        });
    }

    // Add Time
    const btnAddTime = document.getElementById('btn-add-time');
    if (btnAddTime) btnAddTime.addEventListener('click', () => UI.addTimeField());

    // Generate Invite
    const btnGenerate = document.getElementById('btn-generate-invite');
    if (btnGenerate) {
        btnGenerate.addEventListener('click', handleInviteGeneration);
    }

    // Session Duration
    if (domCache.sessionHoursInput) {
        domCache.sessionHoursInput.addEventListener('change', handleSessionDurationChange);
    }

    // Logic Controllers
    initCopyGameLogic();
    initTemplateLogic();
    initPlayerSetup();
    initPlayerSync();

    setupCalculationTriggers(callbacks);

    // Loot Plan Bindings
    ['inp-loot-plan', 'header-game-name', 'inp-predet-perms', 'inp-predet-cons'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                scheduleUpdate(() => {
                    updateLootDeclaration(cachedDiscordId);
                    if (id === 'header-game-name' || id.startsWith('inp-predet')) {
                        updateHgenLogic(cachedDiscordId);
                    }
                    if (id === 'header-game-name') {
                        updateDMLootLogic(cachedDiscordId, cachedGameRules);
                    }
                });
            });
        }
    });
}


async function handleInviteGeneration() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (!id) {
        alert("Please save the session first to generate a Session ID.");
        return;
    }

    const path = window.location.pathname;
    const directory = path.substring(0, path.lastIndexOf('/'));
    const inviteUrl = `${window.location.origin}${directory}/player-entry.html?session_id=${id}`;

    const inpInvite = document.getElementById('inp-invite-link');
    if (inpInvite) {
        inpInvite.value = inviteUrl;
        try {
            await supabase
                .from('sessions')
                .update({ invite_url: inviteUrl })
                .eq('id', id);
        } catch (e) {
            logError('session-editor', `Could not save invite URL: ${e.message}`, 'warning');
        }
    }
}

function handleSessionDurationChange() {
    const val = parseFloat(domCache.sessionHoursInput.value) || 0;
    const newSessionHours = parseFloat(domCache.sessionHoursInput.value) || DEFAULT_SESSION_HOURS;

    const cards = document.querySelectorAll('#session-roster-list .player-card');
    cards.forEach(card => {
        const hInput = card.querySelector('.s-hours');
        if (hInput) {
            hInput.value = newSessionHours;
            hInput.setAttribute('max', newSessionHours);
        }
    });

    if (val > MAX_SESSION_HOURS) {
        const proceed = confirm(`Duration exceeds ${MAX_SESSION_HOURS} hours. Do you want to create the next part automatically?`);
        if (proceed) {
            domCache.sessionHoursInput.value = DEFAULT_SESSION_HOURS;
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
}

document.addEventListener('DOMContentLoaded', initSessionEditor);

/* ==========================================================================
   CALCULATION LOGIC
   ========================================================================== */

/**
 * Main calculation loop for Player Rewards.
 * Syncs roster stats, checks gold limits, and updates each player card's XP/DTP.
 */
function updateSessionCalculations() {
    if (!calculationEngine) return;

    const sessionHours = parseFloat(document.getElementById('inp-session-total-hours')?.value) || 3;
    const stats = stateManager.getStats(); // Get APL
    const maxGold = calculationEngine.calculateMaxGold(stats.apl);

    // --- FIX: Update the visual "Max Gold" Label ---
    const elMaxGold = document.querySelector('.val-max-gold');
    if (elMaxGold) {
        elMaxGold.textContent = maxGold;
    }
    // ------------------------------------------------

    const cards = document.querySelectorAll('#session-roster-list .player-card');

    cards.forEach(card => {
        // Gather input data from the card
        const levelInput = card.querySelector('.s-level'); // Effective Level
        const realLevelInput = card.querySelector('.s-real-level'); // Real Level
        const hoursInput = card.querySelector('.s-hours');
        const xpInput = card.querySelector('.s-xp');
        const dtpInput = card.querySelector('.s-dtp');
        const goldInput = card.querySelector('.s-gold'); // Get Gold Input
        const forfeitCheckbox = card.querySelector('.s-forfeit-xp');
        const incentivesBtn = card.querySelector('.s-incentives-btn');

        if (!levelInput || !hoursInput || !xpInput || !dtpInput) return;

        // --- Max Gold Validation / Warning ---
        // Visually warn user if they award more gold than the table allows
        const currentGold = parseFloat(goldInput.value) || 0;
        if (currentGold > maxGold) {
            goldInput.style.borderColor = "#ff4444";
            goldInput.title = `Warning: Exceeds Max Gold for APL ${stats.apl} (${maxGold}gp)`;
        } else {
            goldInput.style.borderColor = "";
            goldInput.title = "";
        }

        const playerData = {
            // FIX: Use Real Level for XP calculation if available, else fallback to visual level
            level: realLevelInput ? (parseInt(realLevelInput.value) || 1) : (parseInt(levelInput.value) || 1),
            hours: parseFloat(hoursInput.value) || 0,
            forfeit_xp: forfeitCheckbox ? forfeitCheckbox.checked : false,
            incentives: incentivesBtn ? JSON.parse(incentivesBtn.dataset.incentives || '[]') : []
        };

        // Run Calculation
        const rewards = calculationEngine.calculatePlayerRewards(playerData, sessionHours);

        // Update DOM (Manual XP Override Logic)
        const currentXP = parseInt(xpInput.value);
        const autoXP = parseInt(xpInput.dataset.autoXp);
        const newXP = rewards.xp;

        // If this is first run (autoXP undefined) OR value matches previous auto, we sync.
        // Also sync if the field is empty.
        const shouldSync = isNaN(autoXP) || currentXP === autoXP || xpInput.value === "";

        if (shouldSync) {
            xpInput.value = newXP;
            xpInput.style.borderColor = "";
            xpInput.title = "";
        } else {
            // User has manually diverged. Check if they are still divergent.
            if (parseInt(xpInput.value) !== newXP) {
                xpInput.style.borderColor = "#ff9800"; // Orange/Warning color
                xpInput.title = "Warning: changing XP should only occur in very limited situations, e.g. campaigns with milestone XP/level ups.";
            } else {
                xpInput.style.borderColor = "";
                xpInput.title = "";
            }
        }

        // Update the baseline for next time
        xpInput.dataset.autoXp = newXP;

        dtpInput.value = rewards.dtp;
    });

    // Trigger downstream updates
    updateDMCalculations();
    updateStatsDisplays();

    // Update Read-only Stats for New Hires / Welcome Wagon in Session View
    // This is required here to ensure Session View is visually in sync with Loot View
    const playerStats = stateManager.getPlayerStats();
    const elNewHires = document.getElementById('loot-val-newhires');
    const elWelcome = document.getElementById('loot-val-welcome');
    if (elNewHires) elNewHires.value = playerStats.newHires;
    if (elWelcome) elWelcome.value = playerStats.welcomeWagon;
}

/**
 * Main calculation loop for DM Rewards.
 * Updates XP, GP, DTP based on DM Level, Games Played, and Incentives.
 */
function updateDMCalculations() {
    if (!calculationEngine) return;

    const state = stateManager.getFullState();
    const sessionHours = parseFloat(document.getElementById('inp-session-total-hours')?.value) || 3;

    const dmXPOutput = document.querySelector('.dm-res-xp');
    const dmDTPOutput = document.querySelector('.dm-res-dtp');
    const dmGPOutput = document.querySelector('.dm-res-gp');
    const dmForfeitCheckbox = document.getElementById('chk-dm-forfeit-xp');
    const dmIncentivesBtn = document.getElementById('btn-dm-loot-incentives');

    if (!dmXPOutput || !dmDTPOutput || !dmGPOutput) return;

    const dmData = {
        level: parseInt(state.dm.level) || 1,
        forfeit_xp: dmForfeitCheckbox ? dmForfeitCheckbox.checked : false,
        incentives: dmIncentivesBtn ? JSON.parse(dmIncentivesBtn.dataset.incentives || '[]') : []
    };

    const playerStats = stateManager.getPlayerStats();

    const rewards = calculationEngine.calculateDMRewards(dmData, sessionHours, playerStats);

    // Update DOM
    dmXPOutput.value = rewards.xp;
    dmDTPOutput.value = rewards.dtp;
    dmGPOutput.value = rewards.gp;
}

/**
 * Updates the visual statistics bar (Party Size, APL, Tier) on the UI.
 */
function updateStatsDisplays() {
    const stats = stateManager.getStats();

    const elSize = document.getElementById('setup-val-party-size');
    const elApl = document.getElementById('setup-val-apl');
    const elTier = document.getElementById('setup-val-tier');

    if (elSize) elSize.textContent = stats.partySize;
    if (elApl) elApl.textContent = stats.apl;
    if (elTier) elTier.textContent = stats.tier;
}

/**
 * Binds various UI triggers to the update callbacks.
 * This sets up the reactive behavior for the DM Level, Games Count, Roster changes, etc.
 * @param {Object} callbacks - Object containing `onUpdate` function.
 */
function setupCalculationTriggers(callbacks) {
    // Listener for Sidebar Navigation (Syncing Roster on Tab Change)
    if (domCache.sidebarNav) {
        domCache.sidebarNav.addEventListener('click', (e) => {
            const item = e.target.closest('.nav-item');
            if (item && item.dataset.target === 'view-session-details') {
                // Force Sync Roster -> Session when entering Session Details
                Rows.syncSessionPlayersFromMaster(callbacks);

                // Auto-fill Session Date logic
                const setupDateInput = document.getElementById('inp-start-datetime');
                const sessionDateInput = document.getElementById('inp-session-date');
                const sessionUnixInput = document.getElementById('inp-session-unix');
                const tz = document.getElementById('inp-timezone')?.value;
                const gameName = document.getElementById('header-game-name')?.value || "";

                if (sessionDateInput && !sessionDateInput.value) {
                    let targetDateStr = setupDateInput.value;
                    let targetUnix = "";

                    // Complex Logic: Check for "Part X" in game name
                    const match = gameName.match(/Part\s*(\d+)/i);
                    if (match && match[1]) {
                        const partNum = parseInt(match[1]);
                        if (partNum > 1) {
                            // Part 2 corresponds to index 0 of additional_times (since Part 1 is main input)
                            const additionalTimes = IO.getFormData().header.additional_times || [];
                            const timeIndex = partNum - 2;

                            if (additionalTimes[timeIndex]) {
                                // Convert Unix to Local ISO for the input
                                targetUnix = additionalTimes[timeIndex];
                                targetDateStr = UI.unixToLocalIso(targetUnix, tz);
                            }
                        }
                    }

                    if (targetDateStr) {
                        sessionDateInput.value = targetDateStr;

                        // If we derived it from unix, use that directly, else recalc
                        if (targetUnix) {
                            if (sessionUnixInput) sessionUnixInput.value = targetUnix;
                        } else {
                            const unixVal = UI.toUnixTimestamp(targetDateStr, tz);
                            if (sessionUnixInput) sessionUnixInput.value = unixVal;
                        }
                    }
                }
            }
        });
    }
    const setupDateInput = document.getElementById('inp-start-datetime');

    if (setupDateInput) {
        setupDateInput.addEventListener('input', () => {
            const sessionDateInput = document.getElementById('inp-session-date');
            const sessionUnixInput = document.getElementById('inp-session-unix');
            const tzInput = document.getElementById('inp-timezone');

            // Only update if the session date is currently empty
            if (sessionDateInput && !sessionDateInput.value) {

                // 1. Copy the visual date string
                sessionDateInput.value = setupDateInput.value;

                // 2. Calculate and update the hidden Unix timestamp
                if (sessionUnixInput && tzInput) {
                    // We use the UI utility you already have available
                    const unixVal = UI.toUnixTimestamp(setupDateInput.value, tzInput.value);
                    sessionUnixInput.value = unixVal;
                }
            }
        });
    }

    const dmLevel = document.getElementById('out-dm-level');
    const dmGames = document.getElementById('out-dm-games');
    const btnDMIncLoot = document.getElementById('btn-dm-loot-incentives');
    const syncBtn = document.getElementById('btn-sync-session');
    const addPlayerBtn = document.getElementById('btn-add-session-player');

    // DM inputs triggers
    if (dmLevel) {
        dmLevel.addEventListener('input', () => scheduleUpdate(callbacks.onUpdate));
    }
    if (dmGames) {
        dmGames.addEventListener('input', () => scheduleUpdate(callbacks.onUpdate));
    }

    const dmForfeitCheckbox = document.getElementById('chk-dm-forfeit-xp');
    if (dmForfeitCheckbox) {
        dmForfeitCheckbox.addEventListener('change', () => scheduleUpdate(callbacks.onUpdate));
    }

    // Modal trigger
    if (btnDMIncLoot) {
        btnDMIncLoot.addEventListener('click', () => callbacks.onOpenModal(btnDMIncLoot, null, true));
    }

    // Sync Button
    if (syncBtn) {
        syncBtn.addEventListener('click', async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const id = urlParams.get('id');
            if (!id) return alert("Save session first");

            if (!confirm("This will merge player submissions into your Session Log.\n\nContinue?")) return;

            const submissions = await fetchPlayerSubmissions(id);
            Rows.applyPlayerSubmissions(submissions, callbacks);
        });
    }

    // Manual Add Player Button
    if (addPlayerBtn) {
        addPlayerBtn.addEventListener('click', () => {
            Rows.addSessionPlayerRow(document.getElementById('session-roster-list'), {}, callbacks);
        });
    }

    // DM Setup inputs triggers
    if (domCache.dmLevelSetup) {
        domCache.dmLevelSetup.addEventListener('input', () => {
            scheduleUpdate(() => updateDMLootLogic(cachedDiscordId, cachedGameRules));
        });
    }
    if (domCache.dmGamesSetup) {
        domCache.dmGamesSetup.addEventListener('change', () => {
            scheduleUpdate(() => {
                updateDMLootLogic(cachedDiscordId, cachedGameRules);
                IO.updateJumpstartDisplay();
            });
        });
    }

    // Roster Body triggers (for updating loot stats when master roster changes)
    if (domCache.rosterBody) {
        domCache.rosterBody.addEventListener('change', () => {
            scheduleUpdate(() => {
                updateDMLootLogic(cachedDiscordId, cachedGameRules);
            });
        });

        domCache.rosterBody.addEventListener('click', (e) => {
            if (e.target.matches('.btn-delete-row')) {
                // Short delay to allow DOM removal to complete before recalculating
                setTimeout(() => {
                    scheduleUpdate(() => updateDMLootLogic(cachedDiscordId, cachedGameRules));
                }, 100);
            }
        });

        // FIX: Sync state immediately on input to prevent APL flickering
        domCache.rosterBody.addEventListener('input', (e) => {
            // Update global state immediately from DOM so that calculateStats() is accurate
            stateManager.state.players = Rows.getMasterRosterData();

            // Debounce the heavy lifting (UI updates)
            scheduleUpdate(() => {
                window._sessionCallbacks.onUpdate();
            });
        });
    }
}

/**
 * Loads session data from Supabase via DataManager and populates the form via SessionIO.
 * @async
 * @param {string} sessionId - The UUID of the session to load.
 * @param {Object} callbacks - Callback object for UI updates.
 */
async function loadSessionData(sessionId, callbacks) {
    try {
        const session = await loadSession(sessionId);
        if (session) {
            IO.populateForm(session, callbacks);

            // Load invite link if present in DB
            if (session.invite_url) {
                const inpInvite = document.getElementById('inp-invite-link');
                if (inpInvite) inpInvite.value = session.invite_url;
            }
        }
    } catch (error) {
        logError('session-editor', `Error loading session: ${error.message}`, 'error');
    }
}

/* ==========================================================================
   UI SETUP HELPERS
   ========================================================================== */

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

    if (btnAdd) {
        btnAdd.addEventListener('click', () => {
            Rows.addPlayerRowToMaster({});
            scheduleUpdate(() => {
                window._sessionCallbacks.onUpdate();
            });
        });
    }

    // Note: The main 'input' listener for rosterBody is now in setupCalculationTriggers
    // to handle state syncing.
}

function initPlayerSync() {
    const btnCopy = document.getElementById('btn-copy-invite');
    const inpInvite = document.getElementById('inp-invite-link');
    const btnSync = document.getElementById('btn-sync-submissions');

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

/**
 * Initializes logic for the "Copy / Next Part" Modal.
 * Logic:
 * 1. Opens modal via button.
 * 2. On confirm, creates new session via Supabase.
 * 3. Applies logic (increments part number, games played, resets hours).
 * 4. Saves new session and redirects user.
 */
function initCopyGameLogic() {
    const btnCopy = document.getElementById('btn-copy-game');
    const modal = document.getElementById('modal-copy-game');
    const btnConfirm = document.getElementById('btn-confirm-copy');

    if (btnCopy) {
        btnCopy.addEventListener('click', () => {
            const currentName = document.getElementById('header-game-name').value;
            document.getElementById('inp-copy-name').value = incrementPartName(currentName);
            modal.showModal();
        });
    }

    if (btnConfirm) {
        btnConfirm.addEventListener('click', async () => {
            const newName = document.getElementById('inp-copy-name').value;
            if (!newName) return alert("Please enter a name.");

            const isNextPart = document.getElementById('chk-next-part').checked;
            const fullData = IO.getFormData();

            // Prepare new session data
            fullData.header.title = newName;
            fullData.session_log.title = newName;

            // Reset log data
            fullData.session_log.hours = 3;
            fullData.session_log.notes = "";
            fullData.session_log.summary = "";
            fullData.session_log.dm_rewards.loot_selected = "";
            fullData.session_log.dm_rewards.incentives = [];

            if (isNextPart) {
                // FIX: Set Application Type to "Pre-filled" for next part
                fullData.header.apps_type = "Pre-filled";

                // Increment Player Games
                if (fullData.players) {
                    fullData.players.forEach(p => {
                        p.games_count = incrementGameString(p.games_count);
                    });
                }

                // Increment DM Games
                if (fullData.dm) {
                    fullData.dm.games_count = incrementGameString(fullData.dm.games_count);
                }

                // Reset/Increment Session Player Data
                if (fullData.session_log.players) {
                    fullData.session_log.players.forEach(p => {
                        p.games_count = incrementGameString(p.games_count);
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

                fullData.session_log.dm_rewards.games_played = fullData.dm.games_count;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return alert("Not logged in");

            try {
                const newSession = await createSession(user.id, newName, false);
                if (newSession) {
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

/**
 * Initializes logic for Saving/Loading Templates.
 */
function initTemplateLogic() {
    const modal = document.getElementById('modal-save-template');
    const btnOpen = document.getElementById('btn-open-save-template');
    const btnConfirm = document.getElementById('btn-confirm-save-template');
    const btnLoad = document.getElementById('btn-load-template');
    const btnSaveGame = document.getElementById('btn-save-game');
    const btnSaveSetup = document.getElementById('btn-save-template-setup');
    const tmplSelect = document.getElementById('template-select');
    const btnDelete = document.getElementById('btn-delete-template');

    if (btnOpen) btnOpen.addEventListener('click', () => modal.showModal());

    if (btnSaveSetup) {
        btnSaveSetup.addEventListener('click', () => {
            const currentName = document.getElementById('header-game-name').value;
            const selectedText = tmplSelect && tmplSelect.selectedIndex > 0 ? tmplSelect.options[tmplSelect.selectedIndex].text : "";

            // FIX: Default to selected template name if overwriting, else game name
            if (selectedText) {
                document.getElementById('inp-template-name').value = selectedText;
            } else if (currentName) {
                document.getElementById('inp-template-name').value = currentName;
            }

            document.getElementById('modal-save-template').showModal();
        });
    }

    if (btnDelete) {
        btnDelete.addEventListener('click', async () => {
            const tmplId = document.getElementById('template-select').value;
            if (!tmplId) return alert("Please select a template to delete.");

            if (confirm("Are you sure you want to delete this template? This cannot be undone.")) {
                try {
                    await deleteSession(tmplId);
                    await initTemplateDropdown();
                    alert("Template deleted.");
                } catch (e) {
                    console.error(e);
                    alert("Error deleting template.");
                }
            }
        });
    }

    if (btnConfirm) {
        btnConfirm.addEventListener('click', async () => {
            const tmplName = document.getElementById('inp-template-name').value;
            if (!tmplName) return alert("Enter a name");
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return alert("Please login");

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

    if (btnLoad) {
        btnLoad.addEventListener('click', async () => {
            const tmplId = document.getElementById('template-select').value;
            if (!tmplId) return;
            const session = await loadSession(tmplId);
            if (session) {
                IO.populateForm(session, window._sessionCallbacks, { keepTitle: true });
                alert("Template Loaded!");
            }
        });
    }

    if (btnSaveGame) {
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
                if (user) {
                    const newS = await createSession(user.id, title);
                    await saveSession(newS.id, formData, { title, date });
                    window.history.pushState({}, "", `?id=${newS.id}`);
                    alert("Session Created & Saved");
                }
            }
        });
    }
}

/**
 * Debounce helper to prevent excessive calculations during rapid input.
 * @param {Function} callback - The function to execute.
 */
let debounceTimer = null;
function scheduleUpdate(callback) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        callback();
        debounceTimer = null;
    }, 100);
}