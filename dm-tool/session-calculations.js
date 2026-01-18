// assets/js/dm-tool/session-calculations.js

function calculateXP(level, hours, rules) {
    if (!rules || !rules.xp_per_hour) return 0;
    const safeLevel = parseInt(level) || 1;
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
            const bonus = (typeof incData === 'number') ? incData : (incData?.['bonus DTP'] || incData?.DTP || 0);
            dtp += bonus;
        });
    }
    rewards.dtp = dtp;

    // DM Gold
    const safeLevel = parseInt(dmLevel) || 1;
    const goldTable = rules.gold_per_session_by_apl;
    const baseGold = goldTable ? (goldTable[safeLevel.toString()] || goldTable[safeLevel] || 0) : 0;
    
    rewards.gp = baseGold * (1 + welcomeWagonCount);

    return rewards;
}

export function updateSessionCalculations(rules) {
    if (!rules) return; 
    
    const container = document.getElementById('view-session-details');
    if(!container) return;

    // 1. Get Session Total Hours
    const sessionHoursInput = document.getElementById('inp-session-total-hours');
    const sessionTotalHours = parseFloat(sessionHoursInput?.value) || 0;

    // 2. Determine Max Gold
    const aplText = document.getElementById('setup-val-apl')?.textContent || "1";
    const aplVal = parseInt(aplText) || 1;
    
    const goldTable = rules.gold_per_session_by_apl || {};
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
        
        // Hours Logic - validate against session max
        const hInput = card.querySelector('.s-hours');
        let pHours = parseFloat(hInput.value) || 0;
        
        // Ensure hours don't exceed session total
        if (pHours > sessionTotalHours) {
            pHours = sessionTotalHours;
            hInput.value = pHours;
        }
        
        // Ensure hours are non-negative
        if (pHours < 0) {
            pHours = 0;
            hInput.value = 0;
        }

        // Gold Validation
        const gInput = card.querySelector('.s-gold');
        const playerGold = parseFloat(gInput.value) || 0;
        
        if (maxGold > 0 && playerGold > maxGold) {
            gInput.parentElement.classList.add('error');
        } else {
            gInput.parentElement.classList.remove('error');
        }

        // Calculate Rewards
        const btn = card.querySelector('.s-incentives-btn');
        const incentives = JSON.parse(btn.dataset.incentives || '[]');
        const rewards = calculatePlayerRewards(lvl, pHours, rules, incentives);
        
        // CHECK FORFEIT
        const forfeitXp = card.querySelector('.s-forfeit-xp').checked;
        if (forfeitXp) rewards.xp = 0;

        card.querySelector('.s-xp').value = rewards.xp;
        card.querySelector('.s-dtp').value = rewards.dtp;
    });

    // 4. Calculate DM Rewards
    const dmLevelSetup = document.getElementById('inp-dm-level');
    const dmGamesSetup = document.getElementById('inp-dm-games-count');
    const dmNameSetup = document.getElementById('inp-dm-char-name');
    
    // Sync DM data to hidden fields in Session Details tab
    if(dmNameSetup) {
        const hiddenName = document.getElementById('out-dm-name');
        if(hiddenName) hiddenName.value = dmNameSetup.value;
    }
    if(dmLevelSetup) {
        const hiddenLevel = document.getElementById('out-dm-level');
        if(hiddenLevel) hiddenLevel.value = dmLevelSetup.value;
    }
    if(dmGamesSetup) {
        const hiddenGames = document.getElementById('out-dm-games');
        if(hiddenGames) hiddenGames.value = dmGamesSetup.value;
    }
    
    const dmLvl = parseFloat(dmLevelSetup ? dmLevelSetup.value : 0) || 0;

    container.querySelector('.dm-val-welcome').value = welcomeWagonCount;
    container.querySelector('.dm-val-newhires').value = newHireCount;

    // Incentives
    const btnDM = document.getElementById('btn-dm-loot-incentives');
    const dmIncentives = JSON.parse(btnDM ? btnDM.dataset.incentives : '[]');
    
    const dmIncDisplay = document.getElementById('out-dm-incentives-display');
    if(dmIncDisplay) dmIncDisplay.value = dmIncentives.join(', ');

    const dmRewards = calculateDMRewards(
        dmLvl, 
        sessionTotalHours, 
        newHireCount, 
        welcomeWagonCount, 
        rules, 
        dmIncentives
    );
    
    // CHECK DM FORFEIT
    const dmForfeit = document.getElementById('chk-dm-forfeit-xp');
    if (dmForfeit && dmForfeit.checked) {
        dmRewards.xp = 0;
    }

    container.querySelector('.dm-res-xp').value = dmRewards.xp;
    container.querySelector('.dm-res-dtp').value = dmRewards.dtp;
    container.querySelector('.dm-res-gp').value = dmRewards.gp;
}