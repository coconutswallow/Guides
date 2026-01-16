// assets/js/dm-tool/session-loot.js

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
    const gameName = document.getElementById('header-game-name')?.value || "Untitled";
    const partySize = document.getElementById('setup-val-party-size')?.textContent || "0";
    const apl = document.getElementById('setup-val-apl')?.textContent || "1";
    
    // The manually entered loot items
    const lootPlan = document.getElementById('inp-loot-plan')?.value || "";
    
    // Declaration Format:
    // <id> declares loot for [Game], Players: [N], APL: [N]
    // ||
    // [Items]
    // ||
    const declareText = `<@${discordId}> declares loot for ${gameName}, Number of Players: ${partySize}, APL: ${apl}\n||\n${lootPlan}\n||`;

    const out = document.getElementById('out-loot-declaration');
    if (out) {
        out.value = declareText;
    }
}

// Updates the Hgenloot Bot section (Declaration text AND Command)
export function updateHgenLogic(discordId) {
    const gameName = document.getElementById('header-game-name')?.value || "Untitled";
    const partySize = document.getElementById('setup-val-party-size')?.textContent || "0";
    const apl = document.getElementById('setup-val-apl')?.textContent || "1";
    
    const permsVal = parseInt(document.getElementById('inp-predet-perms')?.value || "0");
    const consVal = parseInt(document.getElementById('inp-predet-cons')?.value || "0");

    // 1. Output the "Rolls Loot" Declaration text
    // <id> rolls loot for [Game], Players: [N], APL: [N]
    const rollText = `<@${discordId}> rolls loot for ${gameName}, Number of Players: ${partySize}, APL: ${apl}`;
    
    const outDecl = document.getElementById('out-hgen-declaration');
    if (outDecl) {
        outDecl.value = rollText;
    }

    // 2. Output the Bot Command
    // /hgenloot [players] [apl] {optional: perms} {optional: cons}
    let cmd = `/hgenloot ${partySize} ${apl}`;
    
    // Logic: If we have Cons, we MUST print Perms (even if 0) to keep the order.
    // If we only have Perms, we just print Perms.
    if (consVal > 0) {
        cmd += ` ${permsVal} ${consVal}`;
    } else if (permsVal > 0) {
        cmd += ` ${permsVal}`;
    }
    
    // Note: HTML id is 'out-hgen-command'
    const outCmd = document.getElementById('out-hgen-command');
    if(outCmd) {
        outCmd.value = cmd;
    }
}

// Updates the DM Loot logic (View 5)
export function updateDMLootLogic(discordId, gameRules) {
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

    // 5. Generate Output Text
    const gameName = document.getElementById('header-game-name').value || "Untitled Game";
    const dmLvlInput = document.getElementById('inp-dm-level');
    const dmLvl = dmLvlInput ? dmLvlInput.value : "0";
    
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