// assets/js/dm-tool/session-io.js

/**
 * @file session-io.js
 * @description Handles Data Input/Output operations for the DM Tool.
 * This module is responsible for scraping form data from the DOM, populating the UI 
 * from saved session data, and generating formatted text outputs (Discord listings, 
 * session logs, MAL updates).
 * * @module SessionIO
 */

import { stateManager } from './state-manager.js';
import * as Rows from './session-rows.js';

/**
 * Safely sets the value of a DOM element by ID.
 * Does nothing if the element does not exist.
 * * @param {string} id - The HTML ID of the element.
 * @param {string|number} val - The value to set.
 */
const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || "";
};

/**
 * Retrieves all current form data from the DOM and State Manager.
 * Aggregates Header, DM, Session Log, and Roster data into a single object.
 * * @returns {Object} The complete session data object structure.
 */
export function getFormData() {
    /**
     * Helper to prefer the DOM value over state value if the element exists.
     * @param {string} id - HTML ID.
     * @param {*} stateVal - Fallback value from state.
     */
    const getVal = (id, stateVal) => {
        const el = document.getElementById(id);
        return el ? el.value : stateVal;
    };

    const state = stateManager.getFullState();

    return {
        // 1. Header Information (Game Metadata)
        header: {
            title: getVal('header-game-name', state.header.title),
            game_datetime: getVal('inp-unix-time', state.header.game_datetime),
            game_date_str: getVal('inp-start-datetime', ''),
            timezone: getVal('inp-timezone', state.header.timezone),
            intended_duration: getVal('inp-duration-text', state.header.intended_duration),
            game_description: getVal('inp-description', state.header.game_description),
            game_version: getVal('inp-version', state.header.game_version),
            game_type: getVal('inp-format', state.header.game_type),
            apps_type: getVal('inp-apps-type', state.header.apps_type),
            platform: getVal('inp-platform', state.header.platform),
            event_tags: state.header.event_tags,
            tier: state.header.tier,
            apl: state.header.apl,
            party_size: state.header.party_size,
            
            // Flavor & Difficulty
            tone: getVal('inp-tone', state.header.tone),
            focus: getVal('inp-focus', state.header.focus),
            encounter_difficulty: getVal('inp-diff-encounter', state.header.encounter_difficulty),
            threat_level: getVal('inp-diff-threat', state.header.threat_level),
            char_loss: getVal('inp-diff-loss', state.header.char_loss),
            
            // Rules & Requirements
            house_rules: getVal('inp-houserules', state.header.house_rules),
            notes: getVal('inp-notes', state.header.notes),
            warnings: getVal('inp-warnings', state.header.warnings),
            how_to_apply: getVal('inp-apply', state.header.how_to_apply),
            
            // URLs
            listing_url: getVal('inp-listing-url', state.header.listing_url),
            lobby_url: getVal('inp-lobby-url', state.header.lobby_url),
            
            // Session Planning
            loot_plan: getVal('inp-loot-plan', state.header.loot_plan),
            predet_perms: getVal('inp-predet-perms', state.header.predet_perms),
            predet_cons: getVal('inp-predet-cons', state.header.predet_cons)
        },
        // 2. Master Roster (Pre-session)
        players: Rows.getMasterRosterData(),
        // 3. DM Details
        dm: {
            character_name: getVal('inp-dm-char-name', state.dm.character_name),
            level: getVal('inp-dm-level', state.dm.level),
            games_count: getVal('inp-dm-games-count', state.dm.games_count)
        },
        // 4. Post-Session Log Details
        session_log: {
            title: getVal('header-game-name', state.header.title),
            date_time: getVal('inp-session-unix', state.session_log.date_time),
            hours: getVal('inp-session-total-hours', state.session_log.hours),
            notes: getVal('inp-session-notes', state.session_log.notes),
            summary: getVal('session-summary', state.session_log.summary),
            dm_collaborators: getVal('inp-dm-collab', state.session_log.dm_collaborators),
            players: Rows.getSessionRosterData(),
            dm_rewards: state.session_log.dm_rewards
        }
    };
}

/**
 * Populates the UI forms with data from a provided session object.
 * Used when loading a saved session or template.
 * * @param {Object} session - The session data object to load.
 * @param {Object} callbacks - Object containing callback functions (e.g., onUpdate).
 * @param {Object} [options={}] - Configuration options.
 * @param {boolean} [options.keepTitle] - If true, does not overwrite the current title.
 */
export function populateForm(session, callbacks, options = {}) {
    // Handle Title overrides
    if (session.title && !options.keepTitle) {
        stateManager.updateField('header', 'title', session.title);
        setVal('header-game-name', session.title);
    }
    
    if (!session.form_data) return;
    
    const fd = session.form_data;
    stateManager.loadFromDB(session); // Load into State Manager
    
    // --- UI Restoration: Header Fields ---
    if (fd.header) {
        setVal('inp-start-datetime', fd.header.game_date_str);
        
        if (fd.header.timezone) {
            setVal('inp-timezone', fd.header.timezone);
        }
        setVal('inp-unix-time', fd.header.game_datetime);

        setVal('inp-duration-text', fd.header.intended_duration);
        setVal('inp-description', fd.header.game_description);

        setVal('inp-version', fd.header.game_version);
        setVal('inp-format', fd.header.game_type);
        setVal('inp-apps-type', fd.header.apps_type);
        setVal('inp-platform', fd.header.platform);
        
        setVal('inp-tone', fd.header.tone);
        setVal('inp-focus', fd.header.focus);
        setVal('inp-diff-encounter', fd.header.encounter_difficulty);
        setVal('inp-diff-threat', fd.header.threat_level);
        setVal('inp-diff-loss', fd.header.char_loss);
        
        setVal('inp-houserules', fd.header.house_rules);
        setVal('inp-notes', fd.header.notes);
        setVal('inp-warnings', fd.header.warnings);
        setVal('inp-apply', fd.header.how_to_apply);
        
        setVal('inp-listing-url', fd.header.listing_url);
        setVal('inp-lobby-url', fd.header.lobby_url);
        
        setVal('inp-loot-plan', fd.header.loot_plan);
        setVal('inp-predet-perms', fd.header.predet_perms);
        setVal('inp-predet-cons', fd.header.predet_cons);

        // Restore Multi-Select: Tier
        if (fd.header.tier && Array.isArray(fd.header.tier)) {
            const tierSelect = document.getElementById('inp-tier');
            if(tierSelect) {
                 Array.from(tierSelect.options).forEach(opt => {
                    opt.selected = fd.header.tier.includes(opt.value);
                 });
            }
        }
        
        // Restore Multi-Select: Events
        const eventSelect = document.getElementById('inp-event');
        if (eventSelect && fd.header.event_tags) {
             Array.from(eventSelect.options).forEach(opt => {
                opt.selected = fd.header.event_tags.includes(opt.value);
             });
        }
    }

    // --- UI Restoration: DM Data ---
    if (fd.dm) {
        setVal('inp-dm-char-name', fd.dm.character_name);
        setVal('inp-dm-level', fd.dm.level);
        setVal('inp-dm-games-count', fd.dm.games_count);
    }

    // --- UI Restoration: Session Log Data ---
    if (fd.session_log) {
        setVal('inp-session-total-hours', fd.session_log.hours);
        setVal('inp-session-notes', fd.session_log.notes);
        setVal('session-summary', fd.session_log.summary);
        setVal('inp-dm-collab', fd.session_log.dm_collaborators);
    }
    
    // --- UI Restoration: Rosters ---
    
    // 1. Master Roster (Planning Phase)
    const tbody = document.getElementById('roster-body');
    if (tbody && fd.players) {
        tbody.innerHTML = '';
        fd.players.forEach(player => {
            Rows.addPlayerRowToMaster(player);
        });
    }
    
    // 2. Session Roster (Log Phase)
    const listContainer = document.getElementById('session-roster-list');
    if (listContainer && fd.session_log?.players) {
        listContainer.innerHTML = '';
        fd.session_log.players.forEach(p => {
            Rows.addSessionPlayerRow(listContainer, p, callbacks);
        });
    }
    
    // Trigger output regeneration
    generateOutput();
    if (callbacks.onUpdate) callbacks.onUpdate();
}

/**
 * Generates the text outputs for Discord:
 * 1. Game Listing (Short format for scheduling channels).
 * 2. Game Advertisement (Long format for LFG channels).
 * * Populates `out-listing-text` and `out-ad-text` textareas.
 */
export async function generateOutput() {
    const state = getFormData();
    
    // 1. GAME LISTING OUTPUT
    const listingEl = document.getElementById('out-listing-text');
    if (listingEl) {
        // Discord timestamp formatting
        const dateStr = state.header.game_datetime ? `<t:${state.header.game_datetime}:F>` : "TBD";
        
        // FIX: Get tier from multi-select in Game Setup
        let tierStr = "N/A";
        if (state.header.tier && Array.isArray(state.header.tier) && state.header.tier.length > 0) {
            // Sort tiers numerically and create range display
            const sortedTiers = state.header.tier.sort((a, b) => {
                const numA = parseInt(a.replace('Tier ', ''));
                const numB = parseInt(b.replace('Tier ', ''));
                return numA - numB;
            });
            
            if (sortedTiers.length === 1) {
                tierStr = sortedTiers[0];
            } else {
                // Create range like "Tier 1 to Tier 3"
                tierStr = `${sortedTiers[0]} to ${sortedTiers[sortedTiers.length - 1]}`;
            }
        }
        
        // FIX: Get APL directly from Game Setup fields
        const apl = state.header.apl || "N/A";
        
        let eventsString = '';
        if (Array.isArray(state.header.event_tags) && state.header.event_tags.length > 0) {
            eventsString = `**Event(s):** ${state.header.event_tags.join(', ')}\n`;
        }
        
        let details = "";
        if (state.header.tone) details += `**Tone:** ${state.header.tone}\n`;
        if (state.header.focus) details += `**Focus:** ${state.header.focus}\n`;
        if (state.header.encounter_difficulty) details += `**Encounter Difficulty:** ${state.header.encounter_difficulty}\n`;
        if (state.header.threat_level) details += `**Enemy Threat Level:** ${state.header.threat_level}\n`;
        if (state.header.char_loss) details += `**Chance of Character Loss:** ${state.header.char_loss}\n`;
        
        let warnings = state.header.warnings ? `**Content Warnings:**\n${state.header.warnings}\n\n` : "";
        let houseRules = state.header.house_rules ? `**House Rules:**\n${state.header.house_rules}\n\n` : "";
        let apply = state.header.how_to_apply ? `**How to Apply:**\n${state.header.how_to_apply}\n\n` : "";

        const listingText = `**Game Name:** ${state.header.title}
${eventsString}**Date & Time:** ${dateStr}

**Description:**
${state.header.game_description || "No description provided."}

**Applications:** ${state.header.apps_type || "N/A"}
**Tier:** ${tierStr}  **APL:** ${apl}  **Players:** ${state.header.party_size || "0"}
**Platform:** ${state.header.platform || "Foundry VTT"}
${details}${warnings}${houseRules}${apply}**Game Lobby:** ${state.header.lobby_url || "N/A"}`;
        
        listingEl.value = listingText;
    }

    // 2. GAME ADVERTISEMENT OUTPUT
    const adEl = document.getElementById('out-ad-text');
    if (adEl) {
        const dateStr = state.header.game_datetime ? `<t:${state.header.game_datetime}:F>` : "TBD";
        const relative = state.header.game_datetime ? `<t:${state.header.game_datetime}:R>` : "";
        
        // FIX: Get tier from multi-select in Game Setup (same logic as above)
        let tierStr = "N/A";
        if (state.header.tier && Array.isArray(state.header.tier) && state.header.tier.length > 0) {
            const sortedTiers = state.header.tier.sort((a, b) => {
                const numA = parseInt(a.replace('Tier ', ''));
                const numB = parseInt(b.replace('Tier ', ''));
                return numA - numB;
            });
            
            if (sortedTiers.length === 1) {
                tierStr = sortedTiers[0];
            } else {
                tierStr = `${sortedTiers[0]} to ${sortedTiers[sortedTiers.length - 1]}`;
            }
        }
        
        // FIX: Get party size and APL directly from Game Setup field
        const partySize = state.header.party_size || "N/A";
        const apl = state.header.apl || "N/A";
        
        let eventsString = '';
        if (Array.isArray(state.header.event_tags) && state.header.event_tags.length > 0) {
            eventsString = `**Event(s):** ${state.header.event_tags.join(', ')}\n`;
        }

        const adText = `**Game:** ${state.header.title}
${eventsString}**Time:** ${dateStr} (${relative})
**Format:** ${state.header.game_type || "N/A"}
**Players:** ${partySize}
**Tier:** ${tierStr}  **APL:** ${apl}
**Applications:** ${state.header.apps_type || "N/A"}
**Description:**
${state.header.game_description || "No description provided."}

**Game Listing:** ${state.header.listing_url || "N/A"}`;

        adEl.value = adText;
    }

    // 3. SESSION LOBBY OUTPUT
    const lobbyEl = document.getElementById('out-session-lobby');
    if (lobbyEl) {
        const listingUrl = document.getElementById('inp-game-listing-url')?.value || state.header.listing_url || "N/A";
        
        // Get player Discord names from roster
        const playerMentions = [];
        if (state.players && Array.isArray(state.players)) {
            state.players.forEach(player => {
                const discordName = player.display_name || player.discord_id || '';
                if (discordName) {
                    // Ensure it starts with @ for Discord mentions
                    const mention = discordName.startsWith('@') ? discordName : `@${discordName}`;
                    playerMentions.push(mention);
                }
            });
        }
        
        const playerMentionList = playerMentions.length > 0 ? playerMentions.join(' ') : '(No players added yet)';
        
        const lobbyText = `This lobby is for the game corresponding to the following listing: ${listingUrl}

${playerMentionList}`;
        
        lobbyEl.value = lobbyText;
    }
}

/**
 * Generates the post-session report log for Discord.
 * Includes: Game Metadata, Player rewards (XP/Gold/DTP), DM Rewards, and Summaries.
 * * @param {string} dmDiscordId - The Discord ID of the DM (for mentioning).
 * @param {string} dmDisplayName - The display name of the DM.
 */
export async function generateSessionLogOutput(dmDiscordId, dmDisplayName) {
    const state = getFormData();
    const stats = stateManager.getStats();
    
    // Metadata
    const gameName = state.header.title || "Untitled";
    const gameVersion = state.header.game_version || "N/A";
    const gameFormat = state.header.game_type || "N/A";
    
    const sessionNotes = state.session_log.notes || "";
    const hasSessionData = sessionNotes.trim().length > 0;
    const appsType = hasSessionData ? "Prefilled" : (state.header.apps_type || "N/A");
    
    const sessionHours = state.session_log.hours || 3;
    const sessionSummary = state.session_log.summary || "";
    const dmCollaborators = state.session_log.dm_collaborators || "";

    // Get session ID from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('id') || 'N/A';

    let eventsString = '';
    if (Array.isArray(state.header.event_tags) && state.header.event_tags.length > 0) {
        eventsString = `**Event(s):** ${state.header.event_tags.join(', ')}\n`;
    }
    
    // Process Players
    let playerLines = [];
    const players = Rows.getSessionRosterData();
    
    players.forEach(player => {
        // FIX: Check for forfeit flag
        const xpStr = player.forfeit_xp ? "forfeits XP" : `gains ${player.xp || "0"} XP`;
        
        // Handle Level Display (Real vs Effective)
        // If real_level exists and differs from effective level, show both.
        // Otherwise just show effective level.
        let levelDisplay = player.level || "1";
        if (player.real_level && String(player.real_level) !== String(player.level)) {
             levelDisplay = `${player.real_level}, playing at level ${player.level}`;
        }
        
        let line = `- @${player.display_name || "Unknown"} as ${player.character_name || "Unknown"} (${levelDisplay}) ${xpStr}, ${player.dtp || "0"} DTP`;
        
        if (player.incentives?.length > 0) {
            line += ` (incentives: ${player.incentives.join(', ')})`;
        }
        
        line += `, and ${player.gold || "0"} GP.`;
        if (player.loot) line += ` They take ${player.loot}.`;
        
        // Items & Resources used
        if (player.items_used || player.gold_used) {
            let res = [];
            if (player.items_used) res.push(player.items_used);
            if (player.gold_used) res.push(`${player.gold_used} GP`);
            line += ` They used ${res.join(' and ')}.`;
        }
        
        if (player.notes) line += ` ${player.notes}`;
        playerLines.push(line);
    });
    
    // Process DM Rewards
    const dmCharName = state.dm.character_name || "DM Character";
    const dmLevel = state.session_log.dm_rewards.level || state.dm.level || "1";
    
    // Retrieve calculated values directly from calculation inputs
    const dmXP = document.querySelector('.dm-res-xp')?.value || "0";
    const dmDTP = document.querySelector('.dm-res-dtp')?.value || "0";
    const dmGP = document.querySelector('.dm-res-gp')?.value || "0";
    const dmLoot = state.session_log.dm_rewards.loot_selected || "";
    const dmIdString = dmDiscordId ? `<@${dmDiscordId}>` : `@${state.dm.character_name || "DM"}`;

    // FIX: Check DM Forfeit Checkbox directly from DOM to be safe
    const dmForfeitBox = document.getElementById('chk-dm-forfeit-xp');
    const isDmForfeit = dmForfeitBox ? dmForfeitBox.checked : false;
    const dmXpStr = isDmForfeit ? "forfeits XP" : `gains ${dmXP} XP`;

    let dmRewardsLine = `${dmIdString} as ${dmCharName} (${dmLevel}) ${dmXpStr}, ${dmDTP} DTP, ${dmGP} GP`;
    if (dmLoot) dmRewardsLine += `, and ${dmLoot}`;
    dmRewardsLine += ".";

    // Build Final Output String
    let output = `**Session Name:** ${gameName}\n`;
    output += eventsString;
    output += `**Game Version:** ${gameVersion}\n`;
    output += `**Game Format:** ${gameFormat}\n`;
    output += `**Application Format:** ${appsType}\n`;
    output += `**APL and Tier:** APL ${stats.apl}, Tier ${stats.tier}\n`;
    output += `**Hours Played:** ${sessionHours}\n\n`;
    output += `**EXP, DTP, GP, Loot, and Resources Used:**\n`;
    output += playerLines.join('\n') + '\n\n';
    
    // Calculate DM Incentives
    const playerStats = stateManager.getPlayerStats();
    let dmIncentivesList = [];
    if (state.dm.games_count !== "10+" && parseInt(state.dm.games_count) <= 10) {
        dmIncentivesList.push("Jumpstart");
    }
    if (playerStats.newHires > 0) dmIncentivesList.push(`New Hires x${playerStats.newHires}`);
    if (playerStats.welcomeWagon > 0) dmIncentivesList.push(`Welcome Wagon x${playerStats.welcomeWagon}`);
    
    if (state.session_log.dm_rewards.incentives) {
        dmIncentivesList = dmIncentivesList.concat(state.session_log.dm_rewards.incentives);
    }

    output += `**DM Incentives:** ${dmIncentivesList.join(', ') || 'None'}\n`;
    output += `**DM Rewards:** ${dmRewardsLine}\n\n`;
    
    if (dmCollaborators) output += `**DM Collaborators:**\n${dmCollaborators}\n\n`;
    if (sessionNotes) output += `**Notes:**\n${sessionNotes}\n\n`;

    // Add Session UUID tracker line before summary
    output += `|| DM Tool Tracker: ${sessionId} ||\n\n`;

    const summaryHeader = `**Session Summary:**\n`;
    const summaryContent = sessionSummary || 'N/A';
    const fullTextTotal = output + summaryHeader + summaryContent;

    // Set Outputs
    if (stateManager.dom.outSession) {
        stateManager.dom.outSession.value = fullTextTotal.trim();
        // Update secondary output if it exists (split view for long logs)
        if (stateManager.dom.outSummary) {
             stateManager.dom.outSummary.value = (fullTextTotal.length > 999) ? summaryHeader + summaryContent : "";
        }
    }
}

/**
 * Generates a tab-separated string for the Master Adventure Log (MAL).
 * Format: Date | "DM" | Game Name | DM Name | APL | XP | GP | DTP | Loot
 * * @param {string} dmDisplayName - The DM's name.
 */
export function generateMALUpdate(dmDisplayName) {
    const state = stateManager.getFullState();
    const stats = stateManager.getStats();
    
    const sessionDate = stateManager.dom.sessionDate?.value || '';
    const formattedDate = sessionDate ? sessionDate.split('T')[0] : new Date().toISOString().split('T')[0];
    
    const gameName = state.header.title || 'Untitled';
    const dmName = dmDisplayName || state.dm.character_name || 'DM';
    const dmXP = document.querySelector('.dm-res-xp')?.value || '0';
    const dmGP = document.querySelector('.dm-res-gp')?.value || '0';
    const dmDTP = document.querySelector('.dm-res-dtp')?.value || '0';
    const dmLoot = state.session_log.dm_rewards.loot_selected || '';
    
    const malRow = `${formattedDate}\t"DM"\t${gameName}\t${dmName}\t${stats.apl}\t${dmXP}\t${dmGP}\t${dmDTP}\t${dmLoot}`;
    
    if (stateManager.dom.outMAL) {
        stateManager.dom.outMAL.value = malRow;
    }
}

/**
 * Creates a template-safe copy of session data.
 * Clears date-specific fields and session logs while preserving settings.
 * * @param {Object} originalData - The source session data.
 * @returns {Object} A sanitized data object for template creation.
 */
export function prepareTemplateData(originalData) {
    // Deep copy to ensure we don't modify the active form/state
    const data = JSON.parse(JSON.stringify(originalData));
    
    // Explicitly clear date fields for the template copy
    if (data.header) {
        data.header.game_datetime = null;
        data.header.game_date_str = ""; 
        data.header.listing_url = "";
        data.header.lobby_url = ""; 
    }
    
    // Reset players but keep the structure empty if needed, or clear them
    data.players = [];
    data.dm = { character_name: "", level: "", games_count: "0" };
    
    // Clear session log specific details
    data.session_log = {
        title: "",
        hours: 0,
        notes: "",
        summary: "",
        dm_collaborators: "",
        players: [],
        dm_rewards: {}
    };
    
    return data;
}

/**
 * Updates the visual display for DM "Jumpstart" bonus eligibility.
 * Jumpstart applies if DM has run 10 or fewer games.
 */
export function updateJumpstartDisplay() {
    const state = stateManager.getFullState();
    const dmGamesVal = state.dm.games_count;
    const dmGamesNum = parseInt(dmGamesVal) || 999;
    const isJumpstart = (dmGamesVal !== "10+" && dmGamesNum <= 10);
    
    const jumpstartField = document.getElementById('loot-val-jumpstart');
    if (jumpstartField) {
        jumpstartField.value = isJumpstart ? "Yes" : "No";
    }
}