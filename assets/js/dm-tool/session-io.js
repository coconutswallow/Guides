// assets/js/dm-tool/session-io.js

import { stateManager } from './state-manager.js';
import { fetchGameRules } from './data-manager.js';
import * as Rows from './session-rows.js';
import * as UI from './session-ui.js';

// Helper to safely set value
const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || "";
};

export function getFormData() {
    // Force update state from DOM for fields that might not be bound perfectly
    const dom = stateManager.dom || {}; 
    
    // Helper to get value from DOM or fallback to state
    const getVal = (id, stateVal) => {
        const el = document.getElementById(id);
        return el ? el.value : stateVal;
    };

    const state = stateManager.getFullState();

    return {
        header: {
            title: getVal('header-game-name', state.header.title),
            game_datetime: getVal('inp-unix-time', state.header.game_datetime),
            game_date_str: getVal('inp-start-datetime', ''),
            timezone: getVal('inp-timezone', state.header.timezone),
            intended_duration: getVal('inp-duration-text', state.header.intended_duration),
            game_description: getVal('inp-game-desc', state.header.game_description), 
            game_version: getVal('inp-version', state.header.game_version),
            game_type: getVal('inp-format', state.header.game_type),
            apps_type: getVal('inp-apps-type', state.header.apps_type),
            platform: getVal('inp-platform', state.header.platform),
            event_tags: state.header.event_tags,
            tier: state.header.tier,
            apl: state.header.apl,
            party_size: state.header.party_size,
            
            tone: getVal('inp-tone', state.header.tone),
            focus: getVal('inp-focus', state.header.focus),
            encounter_difficulty: getVal('inp-diff-encounter', state.header.encounter_difficulty),
            threat_level: getVal('inp-diff-threat', state.header.threat_level),
            char_loss: getVal('inp-diff-loss', state.header.char_loss),
            
            // Corrected IDs for Setup Rules
            house_rules: getVal('inp-house-rules', state.header.house_rules),
            notes: getVal('inp-setup-notes', state.header.notes),
            warnings: getVal('inp-content-warnings', state.header.warnings),
            how_to_apply: getVal('inp-how-to-apply', state.header.how_to_apply),
            
            listing_url: getVal('inp-listing-url', state.header.listing_url),
            lobby_url: getVal('inp-lobby-url', state.header.lobby_url),
            
            loot_plan: getVal('inp-loot-plan', state.header.loot_plan),
            predet_perms: getVal('inp-predet-perms', state.header.predet_perms),
            predet_cons: getVal('inp-predet-cons', state.header.predet_cons)
        },
        players: Rows.getMasterRosterData(),
        dm: {
            character_name: getVal('inp-dm-char-name', state.dm.character_name),
            level: getVal('inp-dm-level', state.dm.level),
            games_count: getVal('inp-dm-games-count', state.dm.games_count)
        },
        session_log: {
            title: getVal('header-game-name', state.header.title),
            date_time: getVal('inp-session-unix', state.session_log.date_time),
            hours: getVal('inp-session-total-hours', state.session_log.hours),
            notes: getVal('inp-session-notes', state.session_log.notes),
            summary: getVal('inp-session-summary', state.session_log.summary),
            dm_collaborators: getVal('inp-dm-collab', state.session_log.dm_collaborators),
            players: Rows.getSessionRosterData(),
            dm_rewards: state.session_log.dm_rewards
        }
    };
}

export function populateForm(session, callbacks, options = {}) {
    if (session.title && !options.keepTitle) {
        stateManager.updateField('header', 'title', session.title);
        setVal('header-game-name', session.title);
    }
    
    if (!session.form_data) return;
    
    const fd = session.form_data;
    stateManager.loadFromDB(session); // Load into State
    
    // UI Restoration
    if (fd.header) {
        setVal('inp-start-datetime', fd.header.game_date_str);
        setVal('inp-timezone', fd.header.timezone);
        setVal('inp-unix-time', fd.header.game_datetime);
        setVal('inp-duration-text', fd.header.intended_duration);
        setVal('inp-game-desc', fd.header.game_description);

        setVal('inp-version', fd.header.game_version);
        setVal('inp-format', fd.header.game_type);
        setVal('inp-apps-type', fd.header.apps_type);
        setVal('inp-platform', fd.header.platform);
        
        setVal('inp-tone', fd.header.tone);
        setVal('inp-focus', fd.header.focus);
        setVal('inp-diff-encounter', fd.header.encounter_difficulty);
        setVal('inp-diff-threat', fd.header.threat_level);
        setVal('inp-diff-loss', fd.header.char_loss);
        
        // Corrected IDs for Setup Rules
        setVal('inp-house-rules', fd.header.house_rules);
        setVal('inp-setup-notes', fd.header.notes);
        setVal('inp-content-warnings', fd.header.warnings);
        setVal('inp-how-to-apply', fd.header.how_to_apply);
        
        setVal('inp-listing-url', fd.header.listing_url);
        setVal('inp-lobby-url', fd.header.lobby_url);
        
        setVal('inp-loot-plan', fd.header.loot_plan);
        setVal('inp-predet-perms', fd.header.predet_perms);
        setVal('inp-predet-cons', fd.header.predet_cons);

        if (fd.header.tier && Array.isArray(fd.header.tier)) {
            const tierSelect = document.getElementById('inp-tier');
            if(tierSelect) {
                 Array.from(tierSelect.options).forEach(opt => {
                    opt.selected = fd.header.tier.includes(opt.value);
                 });
            }
        }
        
        // Trigger multi-select event
        const eventSelect = document.getElementById('inp-event');
        if (eventSelect && fd.header.event_tags) {
             Array.from(eventSelect.options).forEach(opt => {
                opt.selected = fd.header.event_tags.includes(opt.value);
             });
        }
    }

    if (fd.dm) {
        setVal('inp-dm-char-name', fd.dm.character_name);
        setVal('inp-dm-level', fd.dm.level);
        setVal('inp-dm-games-count', fd.dm.games_count);
    }

    if (fd.session_log) {
        setVal('inp-session-total-hours', fd.session_log.hours);
        setVal('inp-session-notes', fd.session_log.notes);
        setVal('inp-session-summary', fd.session_log.summary);
        setVal('inp-dm-collab', fd.session_log.dm_collaborators);
    }
    
    // Restore Rosters
    const tbody = document.getElementById('roster-body');
    if (tbody && fd.players) {
        tbody.innerHTML = '';
        fd.players.forEach(player => {
            Rows.addPlayerRowToMaster(player);
        });
    }
    
    const listContainer = document.getElementById('session-roster-list');
    if (listContainer && fd.session_log?.players) {
        listContainer.innerHTML = '';
        fd.session_log.players.forEach(p => {
            Rows.addSessionPlayerRow(listContainer, p, callbacks);
        });
    }
    
    generateOutput();
    if (callbacks.onUpdate) callbacks.onUpdate();
}

export async function generateOutput() {
    const state = getFormData();
    
    // 1. GAME LISTING OUTPUT
    const listingEl = document.getElementById('out-listing-text');
    if (listingEl) {
        const stats = stateManager.getStats();
        const dateStr = state.header.game_datetime ? `<t:${state.header.game_datetime}:F>` : "TBD";
        const relative = state.header.game_datetime ? `<t:${state.header.game_datetime}:R>` : "";
        const tierStr = (state.header.tier && state.header.tier.length) ? state.header.tier.join(', ') : stats.tier;
        const events = (state.header.event_tags && state.header.event_tags.length) ? ` **[${state.header.event_tags.join(', ')}]**` : "";

        const listingText = `**Game:** ${state.header.title}${events}
**Time:** ${dateStr} (${relative})
**Format:** ${state.header.game_type || "N/A"}
**Platform:** ${state.header.platform || "Foundry VTT"}
**Players:** ${stats.partySize} (APL ${stats.apl})
**Tier:** ${tierStr}
**Application:** ${state.header.apps_type || "N/A"}
**Description:**
${state.header.game_description || "No description provided."}

**Listing:** ${state.header.listing_url || "N/A"}
**Lobby:** ${state.header.lobby_url || "N/A"}`;
        
        listingEl.value = listingText;
    }

    // 2. GAME ADVERTISEMENT OUTPUT
    const adEl = document.getElementById('out-ad-text');
    if (adEl) {
        const stats = stateManager.getStats();
        const dateStr = state.header.game_datetime ? `<t:${state.header.game_datetime}:F>` : "TBD";
        const tierStr = (state.header.tier && state.header.tier.length) ? state.header.tier.join(', ') : stats.tier;
        
        let details = "";
        if (state.header.tone) details += `**Tone:** ${state.header.tone}\n`;
        if (state.header.focus) details += `**Focus:** ${state.header.focus}\n`;
        if (state.header.encounter_difficulty) details += `**Encounter Difficulty:** ${state.header.encounter_difficulty}\n`;
        if (state.header.threat_level) details += `**Threat Level:** ${state.header.threat_level}\n`;
        if (state.header.char_loss) details += `**Character Loss:** ${state.header.char_loss}\n`;
        
        let warnings = state.header.warnings ? `\n**Content Warnings:**\n${state.header.warnings}\n` : "";
        let houseRules = state.header.house_rules ? `\n**House Rules:**\n${state.header.house_rules}\n` : "";
        let apply = state.header.how_to_apply ? `\n**How to Apply:**\n${state.header.how_to_apply}\n` : "";

        const adText = `**${state.header.title}**
${dateStr}

**Tier:** ${tierStr} | **APL:** ${stats.apl}
**Platform:** ${state.header.platform || "Foundry VTT"}

${details}${warnings}${houseRules}
**Description:**
${state.header.game_description || "No description."}
${apply}
**Game Listing:** ${state.header.listing_url || ""}
**Lobby:** ${state.header.lobby_url || ""}`;

        adEl.value = adText;
    }
}

export async function generateSessionLogOutput(dmDiscordId, dmDisplayName) {
    // Force refresh state from DOM to ensure notes/collab are current
    const state = getFormData(); 
    const stats = stateManager.getStats();
    
    const gameName = state.header.title || "Untitled";
    const gameVersion = state.header.game_version || "N/A";
    const gameFormat = state.header.game_type || "N/A";
    
    const sessionNotes = state.session_log.notes || "";
    // Logic for Pre-filled vs Manual
    const hasSessionData = sessionNotes.trim().length > 0;
    const appsType = hasSessionData ? "Prefilled" : (state.header.apps_type || "N/A");
    
    const sessionHours = state.session_log.hours || 3;
    const sessionSummary = state.session_log.summary || "";
    const dmCollaborators = state.session_log.dm_collaborators || "";

    let eventsString = '';
    if (Array.isArray(state.header.event_tags) && state.header.event_tags.length > 0) {
        eventsString = `**Event(s):** ${state.header.event_tags.join(', ')}\n`;
    }
    
    let playerLines = [];
    const players = Rows.getSessionRosterData();
    
    players.forEach(player => {
        let line = `- @${player.display_name || "Unknown"} as ${player.character_name || "Unknown"} (${player.level || "1"}) gains ${player.xp || "0"} XP, ${player.dtp || "0"} DTP`;
        
        if (player.incentives?.length > 0) {
            line += ` (incentives: ${player.incentives.join(', ')})`;
        }
        
        line += `, and ${player.gold || "0"} GP.`;
        if (player.loot) line += ` They take ${player.loot}.`;
        
        if (player.items_used || player.gold_used) {
            let res = [];
            if (player.items_used) res.push(player.items_used);
            if (player.gold_used) res.push(`${player.gold_used} GP`);
            line += ` They used ${res.join(' and ')}.`;
        }
        
        if (player.notes) line += ` ${player.notes}`;
        playerLines.push(line);
    });
    
    const dmCharName = state.dm.character_name || "DM Character";
    const dmLevel = state.session_log.dm_rewards.level || state.dm.level || "1";
    
    // Get live values for DM rewards
    const dmXP = document.querySelector('.dm-res-xp')?.value || "0";
    const dmDTP = document.querySelector('.dm-res-dtp')?.value || "0";
    const dmGP = document.querySelector('.dm-res-gp')?.value || "0";
    
    const dmLoot = state.session_log.dm_rewards.loot_selected || "";
    const dmIdString = dmDiscordId ? `<@${dmDiscordId}>` : `@${state.dm.character_name || "DM"}`;

    let dmRewardsLine = `${dmIdString} as ${dmCharName} (${dmLevel}) gains ${dmXP} XP, ${dmDTP} DTP, ${dmGP} GP`;
    if (dmLoot) dmRewardsLine += `, and ${dmLoot}`;
    dmRewardsLine += ".";

    let output = `**Session Name:** ${gameName}\n`;
    output += eventsString;
    output += `**Game Version:** ${gameVersion}\n`;
    output += `**Game Format:** ${gameFormat}\n`;
    output += `**Application Format:** ${appsType}\n`;
    output += `**APL and Tier:** APL ${stats.apl}, Tier ${stats.tier}\n`;
    output += `**Hours Played:** ${sessionHours}\n\n`;
    output += `**EXP, DTP, GP, Loot, and Resources Used:**\n`;
    output += playerLines.join('\n') + '\n\n';
    
    const playerStats = stateManager.getPlayerStats();
    let dmIncentivesList = [];
    if (state.dm.games_count !== "10+" && parseInt(state.dm.games_count) <= 10) {
        dmIncentivesList.push("Jumpstart");
    }
    if (playerStats.newHires > 0) dmIncentivesList.push(`New Hires x${playerStats.newHires}`);
    if (playerStats.welcomeWagon > 0) dmIncentivesList.push(`Welcome Wagon x${playerStats.welcomeWagon}`);
    
    // Add manual incentives
    if (state.session_log.dm_rewards.incentives) {
        dmIncentivesList = dmIncentivesList.concat(state.session_log.dm_rewards.incentives);
    }

    output += `**DM Incentives:** ${dmIncentivesList.join(', ') || 'None'}\n`;
    output += `**DM Rewards:** ${dmRewardsLine}\n\n`;
    
    // FIX: Add DM Collaboration
    if (dmCollaborators) {
        output += `**DM Collaborators:**\n${dmCollaborators}\n\n`;
    }
    
    // FIX: Add Session Notes
    if (sessionNotes) {
        output += `**Notes:**\n${sessionNotes}\n\n`;
    }

    const summaryHeader = `**Session Summary:**\n`;
    const summaryContent = sessionSummary || 'N/A';
    const fullTextTotal = output + summaryHeader + summaryContent;

    if (stateManager.dom.outSession) {
        stateManager.dom.outSession.value = fullTextTotal.trim();
        // Also update summary box if split view exists
        if (stateManager.dom.outSummary) {
             stateManager.dom.outSummary.value = (fullTextTotal.length > 999) ? summaryHeader + summaryContent : "";
        }
    }
}

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

export function prepareTemplateData(originalData) {
    const data = JSON.parse(JSON.stringify(originalData));
    if (data.header) {
        data.header.game_datetime = null;
        data.header.game_date_str = ""; 
        data.header.listing_url = "";
        data.header.lobby_url = ""; 
    }
    data.players = [];
    data.dm = { character_name: "", level: "", games_count: "0" };
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