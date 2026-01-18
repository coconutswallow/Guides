// assets/js/dm-tool/session-loot.js

import { stateManager } from './state-manager.js';
import * as Rows from './session-rows.js';
import CalculationEngine from './calculation-engine.js';

// Dynamic Loot Instructions based on Role, Tier, Party
export function updateLootInstructions(isFullDM) {
    const container = document.getElementById('out-loot-instructions');
    if (!container) return;

    const stats = stateManager.getStats();
    const tier = stats.tier || 1;
    const partySize = stats.partySize || 0;
    const halfParty = Math.floor(partySize / 2);
    
    let html = "";
    if (isFullDM) {
        html += `<strong>Full DM (Tier ${tier}, ${partySize} Players)</strong><br><br>`;
        if (tier === 1) {
            html += `You can pre-determine up to <strong>${partySize}</strong> Tier 1 loot items.<br>`;
            html += `Up to <strong>${halfParty}</strong> permanents are allowed.<br>`;
            html += `<em>Bonus loot:</em> You can also select up to <strong>${halfParty}</strong> T0 items (up to only 1 T0 permanent).`;
        } else if (tier === 2) {
            html += `You can pre-determine up to <strong>${partySize}</strong> Tier 2 or lower loot items.<br>`;
            html += `Up to <strong>${halfParty}</strong> permanents are allowed.<br>`;
            html += `<em>Bonus loot:</em> You can also select up to <strong>${halfParty}</strong> T0 items (up to only 1 T0 permanent).`;
        } else if (tier === 3) {
            html += `You can pre-determine up to <strong>${partySize}</strong> Tier 3 or lower loot items.<br>`;
            html += `Up to <strong>${halfParty}</strong> permanents are allowed.<br>`;
            html += `<em>Bonus loot:</em> You can also select up to <strong>${halfParty}</strong> T0 items (up to only 1 T0 permanent).`;
        } else if (tier >= 4) {
            html += `You can pre-determine up to <strong>${partySize}</strong> Tier 3 or lower loot items.<br>`;
            html += `Up to <strong>${halfParty}</strong> permanents are allowed.<br>`;
            html += `<em>Bonus loot:</em> Add up to 1 T1 permanent or 2 slots worth of T1 consumables as either predetermined or from a roll at APL 4.`;
        }
        html += `<br><br><small>Please refer to the <a href="https://drive.google.com/file/d/1MiXp60GBg2ZASiiGjgFtTRFHp7Jf0m2P/view?usp=sharing" target="_blank">DM Guide</a> for full loot rules.</small>`;
    } else {
        html += `<strong>Trial DM (Tier ${tier}, ${partySize} Players)</strong><br><br>`;
        if (tier === 1) {
            html += `You can pre-determine up to <strong>${partySize}</strong> Tier 1 loot items.<br>`;
            html += `Up to <strong>${halfParty}</strong> permanents are allowed.<br>`;
            html += `<em>Bonus loot:</em> You can also select up to <strong>${halfParty}</strong> T0 items (up to only 1 T0).`;
        } else if (tier === 2) {
            html += `You can pre-determine up to <strong>${partySize}</strong> Tier 2 or lower loot items.<br>`;
            html += `Up to <strong>${halfParty}</strong> permanents are allowed.<br>`;
            html += `<em>Bonus loot:</em> You can also select up to <strong>${halfParty}</strong> T0 items (up to only 1 T0).`;
        } else {
            html += `As a Trial DM, you must use the loot roll bot for Tier 3 or higher games.<br>`;
            html += `Use the loot roll command instructions below to roll for loot.`;
        }
        html += `<br><br><small>Please refer to the <a href="https://drive.google.com/file/d/1MiXp60GBg2ZASiiGjgFtTRFHp7Jf0m2P/view?usp=sharing" target="_blank">DM Guide</a> for full loot rules.</small>`;
    }
    container.innerHTML = html;
}

export function updateLootDeclaration(discordId) {
    const state = stateManager.getFullState();
    const stats = stateManager.getStats();
    const gameName = state.header.title || "Untitled";
    const lootPlan = state.header.loot_plan || "";
    const declareText = `<@${discordId}> declares loot for ${gameName}, Number of Players: ${stats.partySize}, APL: ${stats.apl}\n||\n${lootPlan}\n||`;

    const out = document.getElementById('out-loot-declaration');
    if (out) out.value = declareText;
}

export function updateHgenLogic(discordId) {
    const state = stateManager.getFullState();
    const stats = stateManager.getStats();
    
    const gameName = state.header.title || "Untitled";
    const partySize = stats.partySize || 0;
    const apl = stats.apl || 1;
    const permsVal = parseInt(state.header.predet_perms) || 0;
    const consVal = parseInt(state.header.predet_cons) || 0;

    const rollText = `<@${discordId}> rolls loot for ${gameName}, Number of Players: ${partySize}, APL: ${apl}`;
    const outDecl = document.getElementById('out-hgen-declaration');
    if (outDecl) outDecl.value = rollText;

    let cmd = `/hgenloot ${partySize} ${apl}`;
    if (consVal > 0) {
        cmd += ` ${permsVal} ${consVal}`;
    } else if (permsVal > 0) {
        cmd += ` ${permsVal}`;
    }
    
    const outCmd = document.getElementById('out-hgen-command');
    if(outCmd) outCmd.value = cmd;
}

export function updateDMLootLogic(discordId, gameRules) {
    const currentRoster = Rows.getMasterRosterData();
    const calc = new CalculationEngine(gameRules);
    const playerStats = calc.calculatePlayerStats(currentRoster);

    const newHires = playerStats.newHires;
    const welcomeWagon = playerStats.welcomeWagon;

    // Helper to update both ID (tab 5) and Class (tab 6)
    const setBoth = (id, cls, val) => {
        const elId = document.getElementById(id);
        if(elId) elId.value = val;
        const elsCls = document.querySelectorAll('.' + cls);
        elsCls.forEach(e => e.value = val);
    };

    setBoth('loot-val-newhires', 'dm-val-newhires', newHires);
    setBoth('loot-val-welcome', 'dm-val-welcome', welcomeWagon);
    
    const state = stateManager.getFullState();
    const dmGamesVal = state.dm.games_count;
    const dmGamesNum = parseInt(dmGamesVal) || 999;
    const isJumpstart = (dmGamesVal !== "10+" && dmGamesNum <= 10);
    
    setBoth('loot-val-jumpstart', 'dm-val-jumpstart', isJumpstart ? "Yes" : "No");

    // Calculate Loot Rolls
    let totalRolls = 1 + newHires;
    const btnDM = document.getElementById('btn-dm-loot-incentives');
    const selectedIncentives = JSON.parse(btnDM ? btnDM.dataset.incentives : '[]');
    let incentiveNames = [];
    
    if (newHires > 0) incentiveNames.push(`New Hires (${newHires})`);
    
    if (gameRules && gameRules['DM incentives']) {
        selectedIncentives.forEach(name => {
            const data = gameRules['DM incentives'][name];
            const bonus = (typeof data === 'object') ? (data['bonus loot roll'] || 0) : 0;
            if (bonus > 0) totalRolls += bonus;
            incentiveNames.push(name);
        });
    }

    const gameName = state.header.title || "Untitled Game";
    const dmLvl = state.dm.level || "0";
    const incentiveStr = incentiveNames.length > 0 ? `, Incentives: ${incentiveNames.join(', ')}` : "";
    const declText = `<@${discordId}> rolls loot for Game **${gameName}**${incentiveStr}`;
    
    const outDecl = document.getElementById('out-dm-loot-decl');
    if (outDecl) outDecl.value = declText;

    let cmdText = `/hgenloot ${totalRolls} ${dmLvl}`;
    const outCmd = document.getElementById('out-dm-loot-cmd');
    if (outCmd) outCmd.value = cmdText;

    const jumpWrapper = document.getElementById('wrapper-jumpstart-bonus');
    const jumpCmd = document.getElementById('out-dm-jumpstart-cmd');
    
    if (isJumpstart) {
        if(jumpWrapper) jumpWrapper.style.display = "block";
        if(jumpCmd) jumpCmd.value = `/hgenloot 1 ${dmLvl}`;
    } else {
        if(jumpWrapper) jumpWrapper.style.display = "none";
    }
}