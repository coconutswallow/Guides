// assets/js/dm-tool/session-io.js
// FIX 6: Session Log output with DM Collaboration and Session Notes properly ordered

import { stateManager } from './state-manager.js';
import { fetchGameRules } from './data-manager.js';
import * as Rows from './session-rows.js';
import * as UI from './session-ui.js';

export function getFormData() {
    const state = stateManager.getFullState();
    
    return {
        header: {
            title: state.header.title,
            game_datetime: state.header.game_datetime,
            timezone: state.header.timezone,
            intended_duration: state.header.intended_duration,
            game_description: state.header.game_description,
            game_version: state.header.game_version,
            game_type: state.header.game_type,
            apps_type: state.header.apps_type,
            platform: state.header.platform,
            event_tags: state.header.event_tags,
            tier: state.header.tier,
            apl: state.header.apl,
            party_size: state.header.party_size,
            tone: state.header.tone,
            focus: state.header.focus,
            encounter_difficulty: state.header.encounter_difficulty,
            threat_level: state.header.threat_level,
            char_loss: state.header.char_loss,
            house_rules: state.header.house_rules,
            notes: state.header.notes,
            warnings: state.header.warnings,
            how_to_apply: state.header.how_to_apply,
            listing_url: state.header.listing_url,
            lobby_url: state.header.lobby_url,
            loot_plan: state.header.loot_plan,
            predet_perms: state.header.predet_perms,
            predet_cons: state.header.predet_cons
        },
        players: Rows.getMasterRosterData(),
        dm: state.dm,
        session_log: {
            title: state.header.title,
            date_time: state.session_log.date_time,
            hours: state.session_log.hours,
            notes: state.session_log.notes,
            summary: state.session_log.summary,
            dm_collaborators: state.session_log.dm_collaborators,
            players: Rows.getSessionRosterData(),
            dm_rewards: state.session_log.dm_rewards
        }
    };
}

export function populateForm(session, callbacks, options = {}) {
    if (session.title && !options.keepTitle) {
        stateManager.updateField('header', 'title', session.title);
    }
    
    if (!session.form_data) return;
    
    stateManager.loadFromDB(session);
    
    const tbody = document.getElementById('roster-body');
    if (tbody && session.form_data.players) {
        tbody.innerHTML = '';
        session.form_data.players.forEach(player => {
            Rows.addPlayerRowToMaster(player);
        });
    }
    
    const listContainer = document.getElementById('session-roster-list');
    if (listContainer && session.form_data.session_log?.players) {
        listContainer.innerHTML = '';
        session.form_data.session_log.players.forEach(p => {
            Rows.addSessionPlayerRow(listContainer, p, callbacks);
        });
    }
    
    generateOutput();
    if (callbacks.onUpdate) callbacks.onUpdate();
}

export async function generateOutput() {
    const state = stateManager.getFullState();
    const unixTime = state.header.game_datetime;
    const gameName = state.header.title || "Untitled";
    const sessionSummary = state.session_log.summary || "";
    
    let timeString = "TBD";
    if (unixTime && unixTime > 0) {
        timeString = `<t:${unixTime}:F>`;
    }
    
    let tierString = 'N/A';
    if (Array.isArray(state.header.tier) && state.header.tier.length > 0) {
        const sortedTiers = state.header.tier.sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.replace(/\D/g, '')) || 0;
            return numA - numB;
        });
        
        if (sortedTiers.length === 1) {
            tierString = sortedTiers[0];
        } else {
            const first = sortedTiers[0];
            const last = sortedTiers[sortedTiers.length - 1];
            tierString = `${first} to ${last}`;
        }
    }

    let eventsString = '';
    if (Array.isArray(state.header.event_tags) && state.header.event_tags.length > 0) {
        eventsString = `**Event(s):** ${state.header.event_tags.join(', ')}\n`;
    }
    
    const listingTop = `**Start Time:** ${timeString}
**Name:** ${gameName}
${eventsString}
**Description:**
${state.header.game_description || 'N/A'}

**Version:** ${state.header.game_version || 'N/A'}
**Format:** ${state.header.game_type || 'N/A'}
**Tier and APL:** ${tierString} (${state.header.apl || 'N/A'})
**Party Size:** ${state.header.party_size || 'N/A'}
**Applications:** ${state.header.apps_type || 'N/A'}
**Tone:** ${state.header.tone || 'N/A'}
**Focus:** ${state.header.focus || 'N/A'}
**Difficulty:**
- **Encounter Difficulty:** ${state.header.encounter_difficulty || 'N/A'}
- **Chance of Character Loss:** ${state.header.char_loss || 'N/A'}
- **Enemy Threat Level:** ${state.header.threat_level || 'N/A'}
- **Environment Hazard Level:** N/A
**Lobby:** ${state.header.lobby_url || 'N/A'}
**Platform:** ${state.header.platform || 'N/A'}
**Duration:** ${state.header.intended_duration || 'N/A'}\n`;

    const listingSummary = `\n**Session Summary:**\n${sessionSummary || 'N/A'}\n`;
    
    const listingBottom = `\n**House Rules:**
${state.header.house_rules || 'N/A'}

**Notes:**
${state.header.notes || 'N/A'}

**Content Warnings:**
${state.header.warnings || 'N/A'}

**How to Apply:**
${state.header.how_to_apply || 'Post your application below.'}`;

    const fullListingText = listingTop + listingSummary + listingBottom;
    
    if (stateManager.dom.outListing) {
        if (fullListingText.length > 999) {
            stateManager.dom.outListing.value = listingTop;
            if (stateManager.dom.outSummary) {
                stateManager.dom.outSummary.value = listingSummary + listingBottom;
            }
            if (stateManager.dom.secondaryWrapper) {
                stateManager.dom.secondaryWrapper.classList.remove('d-none');
                stateManager.dom.secondaryWrapper.style.display = "block";
            }
        } else {
            stateManager.dom.outListing.value = fullListingText;
            if (stateManager.dom.outSummary) {
                stateManager.dom.outSummary.value = "";
            }
            if (stateManager.dom.secondaryWrapper) {
                stateManager.dom.secondaryWrapper.classList.add('d-none');
                stateManager.dom.secondaryWrapper.style.display = "none";
            }
        }
    }
    
    const rules = await fetchGameRules();
    let pingString = "";
    
    if (rules && rules.tier && Array.isArray(state.header.tier)) {
        const pings = new Set();
        state.header.tier.forEach(t => {
            const tierData = rules.tier[t];
            if (tierData) {
                if (state.header.game_type === "Voice") {
                    if (tierData["voice ping"]) pings.add(tierData["voice ping"]);
                } else if (state.header.game_type === "PBP" || state.header.game_type === "Live Text") {
                    if (tierData["PBP ping"]) pings.add(tierData["PBP ping"]);
                }
            }
        });
        if (pings.size > 0) pingString = Array.from(pings).join(' ');
    }

    const adText = `**Game Name:** ${gameName}
**Version and Format:** ${state.header.game_version} / ${state.header.game_type}
**Tier and APL:** ${tierString} , APL ${state.header.apl || 'N/A'}
**Start Time and Duration:** ${timeString} (${state.header.intended_duration || 'N/A'})
**Listing:** ${state.header.listing_url || 'N/A'}

**Description:**
${state.header.game_description || ''}

${pingString}`;

    if (stateManager.dom.outAd) {
        stateManager.dom.outAd.value = adText;
    }
}

export function prepareTemplateData(originalData) {
    const data = JSON.parse(JSON.stringify(originalData));
    
    if (data.header) {
        data.header.game_datetime = null;
        data.header.listing_url = "";
    }

    data.players = [];
    data.dm = { character_name: "", level: "", games_count: "0" };
    data.session_log = {
        title: "",
        hours: 0,
        notes: "",
        summary: "",
        players: [],
        dm_rewards: {}
    };
    
    return data;
}

export async function generateSessionLogOutput(dmDiscordId, dmDisplayName) {
    const state = stateManager.getFullState();
    const stats = stateManager.getStats();
    
    const gameName = state.header.title || "Untitled";
    const gameVersion = state.header.game_version || "N/A";
    const gameFormat = state.header.game_type || "N/A";
    
    const sessionNotes = state.session_log.notes || "";
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
    const dmXPOutput = document.querySelector('.dm-res-xp');
    const dmDTPOutput = document.querySelector('.dm-res-dtp');
    const dmGPOutput = document.querySelector('.dm-res-gp');
    const dmXP = dmXPOutput?.value || "0";
    const dmDTP = dmDTPOutput?.value || "0";
    const dmGP = dmGPOutput?.value || "0";
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
    dmIncentivesList = dmIncentivesList.concat(state.session_log.dm_rewards.incentives || []);

    output += `**DM Incentives:** ${dmIncentivesList.join(', ') || 'None'}\n`;
    output += `**DM Rewards:** ${dmRewardsLine}\n`;
    
    // FIX 6: Add DM Collaboration right after DM Rewards (before Notes)
    if (dmCollaborators && dmCollaborators.trim()) {
        output += `\n**DM Collaborators:**\n${dmCollaborators}\n`;
    }
    
    // FIX 6: Add Session Notes after DM Collaboration (before Summary)
    if (sessionNotes && sessionNotes.trim()) {
        output += `\n**Notes:**\n${sessionNotes}\n`;
    }
    
    output += '\n'; // Extra newline before summary

    const summaryHeader = `**Session Summary:**\n`;
    const summaryContent = sessionSummary || 'N/A';
    const fullTextTotal = output + summaryHeader + summaryContent;

    if (stateManager.dom.outSession) {
        if (fullTextTotal.length > 999) {
            stateManager.dom.outSession.value = output.trim();
            if (stateManager.dom.outSummary) {
                stateManager.dom.outSummary.value = summaryHeader + summaryContent;
            }
            if (stateManager.dom.secondaryWrapper) {
                stateManager.dom.secondaryWrapper.classList.remove('d-none');
                stateManager.dom.secondaryWrapper.style.display = "block";
            }
        } else {
            stateManager.dom.outSession.value = fullTextTotal.trim();
            if (stateManager.dom.outSummary) {
                stateManager.dom.outSummary.value = "";
            }
            if (stateManager.dom.secondaryWrapper) {
                stateManager.dom.secondaryWrapper.classList.add('d-none');
                stateManager.dom.secondaryWrapper.style.display = "none";
            }
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

export function updateJumpstartDisplay() {
    const state = stateManager.getFullState();
    const dmGamesVal = state.dm.games_count;
    const dmGamesNum = parseInt(dmGamesVal) || 999;
    const isJumpstart = (dmGamesVal !== "10+" && dmGamesNum <= 10);
    
    const jumpstartField = document.querySelector('.dm-val-jumpstart');
    if (jumpstartField) {
        jumpstartField.value = isJumpstart ? "Yes" : "No";
    }
}