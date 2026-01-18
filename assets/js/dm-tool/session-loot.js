// assets/js/dm-tool/session-loot.js

/**
 * @file session-loot.js
 * @description Manages loot generation logic, rule display, and Discord command creation.
 * This module handles the logic for:
 * 1. Displaying loot limits/rules based on Tier and DM Rank.
 * 2. Generating text for Loot Declarations.
 * 3. Generating `/hgenloot` bot commands for Party Loot.
 * 4. Calculating DM Rewards (XP/Gold/Loot) and generating associated bot commands.
 * @module SessionLoot
 */

import { stateManager } from './state-manager.js';
import * as Rows from './session-rows.js';
import CalculationEngine from './calculation-engine.js';

/**
 * Dynamically updates the "Loot Instructions" UI panel.
 * Renders HTML guidelines based on the DM's rank (Full vs. Trial), the Game Tier,
 * and the Party Size to ensure DMs know exactly what they are allowed to distribute.
 * * @param {boolean} isFullDM - True if the user has Full DM status, False for Trial DM.
 */
export function updateLootInstructions(isFullDM) {
    const container = document.getElementById('out-loot-instructions');
    if (!container) return;

    const stats = stateManager.getStats();
    const tier = stats.tier || 1;
    const partySize = stats.partySize || 0;
    
    // Half party size is used often for "Consumable" or "Permanent" limits
    const halfParty = Math.floor(partySize / 2);
    
    let html = "";
    if (isFullDM) {
        // --- Full DM Logic ---
        html += `<strong>Full DM (Tier ${tier}, ${partySize} Players)</strong><br><br>`;
        
        // Tier-specific allowances
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
        // --- Trial DM Logic ---
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
            // Trial DMs cannot pre-determine high-tier loot; they must roll.
            html += `As a Trial DM, you must use the loot roll bot for Tier 3 or higher games.<br>`;
            html += `Use the loot roll command instructions below to roll for loot.`;
        }
        html += `<br><br><small>Please refer to the <a href="https://drive.google.com/file/d/1MiXp60GBg2ZASiiGjgFtTRFHp7Jf0m2P/view?usp=sharing" target="_blank">DM Guide</a> for full loot rules.</small>`;
    }
    container.innerHTML = html;
}

/**
 * Generates the "Loot Declaration" text for Discord.
 * This is the text used to announce pre-determined loot to players, usually hidden in spoilers.
 * * @param {string} discordId - The Discord User ID of the DM.
 */
export function updateLootDeclaration(discordId) {
    const state = stateManager.getFullState();
    const stats = stateManager.getStats();
    const gameName = state.header.title || "Untitled";
    const lootPlan = state.header.loot_plan || "";
    
    // Format: @DM declares loot for Game, Players: X, APL: Y || Plan ||
    const declareText = `<@${discordId}> declares loot for ${gameName}, Number of Players: ${stats.partySize}, APL: ${stats.apl}\n||\n${lootPlan}\n||`;

    const out = document.getElementById('out-loot-declaration');
    if (out) out.value = declareText;
}

/**
 * Updates the Hybrid Generator (HGen) logic for Party Loot.
 * Generates the specific `/hgenloot` command string based on:
 * 1. Party Size (Number of items to generate).
 * 2. APL (Average Party Level).
 * 3. Pre-determined items (Subtracts from the generation pool).
 * * @param {string} discordId - The Discord User ID of the DM.
 */
export function updateHgenLogic(discordId) {
    const state = stateManager.getFullState();
    const stats = stateManager.getStats();
    
    const gameName = state.header.title || "Untitled";
    const partySize = stats.partySize || 0;
    const apl = stats.apl || 1;
    
    // Number of items the DM has already hand-picked
    const permsVal = parseInt(state.header.predet_perms) || 0;
    const consVal = parseInt(state.header.predet_cons) || 0;

    // 1. Generate Declaration Text
    const rollText = `<@${discordId}> rolls loot for ${gameName}, Number of Players: ${partySize}, APL: ${apl}`;
    const outDecl = document.getElementById('out-hgen-declaration');
    if (outDecl) outDecl.value = rollText;

    // 2. Generate Bot Command
    // Syntax: /hgenloot [TotalItems] [APL] [PredetPerms] [PredetCons]
    let cmd = `/hgenloot ${partySize} ${apl}`;
    if (consVal > 0) {
        cmd += ` ${permsVal} ${consVal}`;
    } else if (permsVal > 0) {
        cmd += ` ${permsVal}`;
    }
    
    const outCmd = document.getElementById('out-hgen-command');
    if(outCmd) outCmd.value = cmd;
}

/**
 * Updates all logic related to DM Rewards (Loot for the DM).
 * * Responsibilities:
 * 1. Calculate player incentives (New Hires, Welcome Wagon) via CalculationEngine.
 * 2. Sync UI fields across multiple tabs (e.g., Tab 5 IDs vs Tab 6 Classes).
 * 3. Determine "Jumpstart" eligibility (DMs with <= 10 games).
 * 4. Generate the main DM Loot roll command (including incentives).
 * 5. Generate the specific Jumpstart bonus command if eligible.
 * * @param {string} discordId - The Discord User ID of the DM.
 * @param {Object} gameRules - The global rules object containing incentive definitions.
 */
export function updateDMLootLogic(discordId, gameRules) {
    const currentRoster = Rows.getMasterRosterData();
    const calc = new CalculationEngine(gameRules);
    
    // Calculate roster-based stats
    const playerStats = calc.calculatePlayerStats(currentRoster);

    const newHires = playerStats.newHires;
    const welcomeWagon = playerStats.welcomeWagon;

    /**
     * Helper to update both a specific ID (usually in Planning tab)
     * and a class of elements (usually in Logs/Result tabs) to keep them in sync.
     */
    const setBoth = (id, cls, val) => {
        const elId = document.getElementById(id);
        if(elId) elId.value = val;
        const elsCls = document.querySelectorAll('.' + cls);
        elsCls.forEach(e => e.value = val);
    };

    // Update UI with calculated stats
    setBoth('loot-val-newhires', 'dm-val-newhires', newHires);
    setBoth('loot-val-welcome', 'dm-val-welcome', welcomeWagon);
    
    // Check Jumpstart Eligibility (10 or fewer games run)
    const state = stateManager.getFullState();
    const dmGamesVal = state.dm.games_count;
    const dmGamesNum = parseInt(dmGamesVal) || 999;
    const isJumpstart = (dmGamesVal !== "10+" && dmGamesNum <= 10);
    
    setBoth('loot-val-jumpstart', 'dm-val-jumpstart', isJumpstart ? "Yes" : "No");

    // --- Calculate Loot Rolls for DM ---
    // Base roll is 1, plus 1 per New Hire
    let totalRolls = 1 + newHires;
    
    // Fetch selected custom incentives (e.g., "Server Event Bonus")
    const btnDM = document.getElementById('btn-dm-loot-incentives');
    const selectedIncentives = JSON.parse(btnDM ? btnDM.dataset.incentives : '[]');
    let incentiveNames = [];
    
    if (newHires > 0) incentiveNames.push(`New Hires (${newHires})`);
    
    // Add bonus rolls from custom game rules/incentives
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
    
    // 1. Generate DM Loot Declaration Text
    const declText = `<@${discordId}> rolls loot for Game **${gameName}**${incentiveStr}`;
    
    const outDecl = document.getElementById('out-dm-loot-decl');
    if (outDecl) outDecl.value = declText;

    // 2. Generate DM Loot Bot Command
    // Syntax: /hgenloot [TotalRolls] [DM_Character_Level]
    let cmdText = `/hgenloot ${totalRolls} ${dmLvl}`;
    const outCmd = document.getElementById('out-dm-loot-cmd');
    if (outCmd) outCmd.value = cmdText;

    // 3. Handle Jumpstart Bonus Command
    // Jumpstart is a separate roll (1 item at DM Level)
    const jumpWrapper = document.getElementById('wrapper-jumpstart-bonus');
    const jumpCmd = document.getElementById('out-dm-jumpstart-cmd');
    
    if (isJumpstart) {
        if(jumpWrapper) jumpWrapper.style.display = "block";
        if(jumpCmd) jumpCmd.value = `/hgenloot 1 ${dmLvl}`;
    } else {
        if(jumpWrapper) jumpWrapper.style.display = "none";
    }
}