// assets/js/dm-tool/session-loot.js

import { stateManager } from './state-manager.js';

// Dynamic Loot Instructions based on Role, Tier, Party
export function updateLootInstructions(isFullDM) {
    const container = document.getElementById('out-loot-instructions');
    if (!container) return;

    // Grab stats from the setup tab
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
        html += `<br><br><small>Please refer to the <a href="https://drive.google.com/file/d/1MiXp60GBg2ZASiiGjgFtTRFHp7Jf0m2P/view?usp=sharing" target="_blank">DM Guide</a> for full loot rules.</small>`;
    
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
            html += `As a Trial DM, you must use the loot roll bot for Tier 3 or higher games.<br>`;
            html += `Use the loot roll command instructions below to roll for loot.`;
        }
        html += `<br><br><small>Please refer to the <a href="https://drive.google.com/file/d/1MiXp60GBg2ZASiiGjgFtTRFHp7Jf0m2P/view?usp=sharing" target="_blank">DM Guide</a> for full loot rules.</small>`;
    }

    container.innerHTML = html;
}

// Updates the "Loot Declaration" text area for Discord
export function updateLootDeclaration(discordId) {
    const state = stateManager.getFullState();
    const stats = stateManager.getStats();

    const gameName = state.header.title || "Untitled";
    const lootPlan = state.header.loot_plan || "";

    const declareText = `<@${discordId}> declares loot for ${gameName}, Number of Players: ${stats.partySize}, APL: ${stats.apl}
||
${lootPlan}
||`;


    const partySize = document.getElementById('setup-val-party-size')?.textContent || "0";
    const apl = document.getElementById('setup-val-apl')?.textContent || "1";
    
    const out = document.getElementById('out-loot-declaration');
    if (out) {
        out.value = declareText;
    }
}

// Updates the Hgenloot Bot section (Declaration text AND Command)
export function updateHgenLogic(discordId) {
    const state = stateManager.getFullState();
    const stats = stateManager.getStats();
    
    const gameName = state.header.title || "Untitled";
    const partySize = stats.partySize || 0;
    const apl = stats.apl || 1;
    
    // FIX: Get from state instead of DOM
    const permsVal = parseInt(state.header.predet_perms) || 0;
    const consVal = parseInt(state.header.predet_cons) || 0;

    // 1. Output the "Rolls Loot" Declaration text
    const rollText = `<@${discordId}> rolls loot for ${gameName}, Number of Players: ${partySize}, APL: ${apl}`;
    
    const outDecl = document.getElementById('out-hgen-declaration');
    if (outDecl) {
        outDecl.value = rollText;
    }

    // 2. Output the Bot Command
    let cmd = `/hgenloot ${partySize} ${apl}`;
    
    // Logic: If we have Cons, we MUST print Perms (even if 0) to keep the order.
    // If we only have Perms, we just print Perms.
    if (consVal > 0) {
        cmd += ` ${permsVal} ${consVal}`;
    } else if (permsVal > 0) {
        cmd += ` ${permsVal}`;
    }
    
    const outCmd = document.getElementById('out-hgen-command');
    if(outCmd) {
        outCmd.value = cmd;
    }
}

// Updates the DM Loot logic (View 5)
export function updateDMLootLogic(discordId, gameRules) {
    // FIX: Get player stats from state manager instead of DOM
    const playerStats = stateManager.getPlayerStats();
    const newHires = playerStats.newHires;
    const welcomeWagon = playerStats.welcomeWagon;

    // DM Jumpstart Logic
    const state = stateManager.getFullState();
    const dmGamesVal = state.dm.games_count;
    const dmGamesNum = parseInt(dmGamesVal) || 999;
    const isJumpstart = (dmGamesVal !== "10+" && dmGamesNum <= 10);

    // Update UI Read-only fields
    const elNewHires = document.getElementById('loot-val-newhires');
    const elWelcome = document.getElementById('loot-val-welcome');
    const elJump = document.getElementById('loot-val-jumpstart');

    if(elNewHires) elNewHires.value = newHires;
    if(elWelcome) elWelcome.value = welcomeWagon;
    if(elJump) elJump.value = isJumpstart ? "Yes" : "No";

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

    // Generate Output Text
    const gameName = state.header.title || "Untitled Game";
    const dmLvl = state.dm.level || "0";
    
    const incentiveStr = incentiveNames.length > 0 ? `, Incentives: ${incentiveNames.join(', ')}` : "";
    const declText = `<@${discordId}> rolls loot for Game **${gameName}**${incentiveStr}`;
    
    const outDecl = document.getElementById('out-dm-loot-decl');
    if (outDecl) outDecl.value = declText;

    // Command (Standard)
    let cmdText = `/hgenloot ${totalRolls} ${dmLvl}`;
    const outCmd = document.getElementById('out-dm-loot-cmd');
    if (outCmd) outCmd.value = cmdText;

    // Jumpstart Command
    const jumpWrapper = document.getElementById('wrapper-jumpstart-bonus');
    const jumpCmd = document.getElementById('out-dm-jumpstart-cmd');
    
    if (isJumpstart) {
        if(jumpWrapper) jumpWrapper.style.display = "block";
        if(jumpCmd) jumpCmd.value = `/hgenloot 1 ${dmLvl}`;
    } else {
        if(jumpWrapper) jumpWrapper.style.display = "none";
    }
}