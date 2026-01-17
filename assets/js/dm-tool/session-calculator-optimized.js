// assets/js/dm-tool/session-calculator-optimized.js
// Optimized calculation functions using state management
// This is a bridge file for backward compatibility during migration

import { sessionState } from './session-state.js';
import CalculationEngine from './calculation-engine.js';
import { CALCULATIONS } from './constants.js';

let calculatorInstance = null;

// Initialize calculator with rules
export function initCalculator(gameRules) {
    calculatorInstance = new CalculationEngine(gameRules);
}

// Legacy compatibility function - delegates to calculation engine
export function updateSessionCalculations(rules) {
    if (!calculatorInstance && rules) {
        calculatorInstance = new CalculationEngine(rules);
    }
    
    if (!calculatorInstance) {
        console.warn('Calculator not initialized');
        return;
    }
    
    const container = document.getElementById('view-session-details');
    if (!container) return;

    // Get session hours directly from DOM to ensure freshness
    const sessionHoursInput = document.getElementById('inp-session-total-hours');
    const sessionHours = parseFloat(sessionHoursInput?.value) || 3;
    
    // Calculate max gold
    const stats = sessionState.calculateStats();
    const maxGold = calculatorInstance.calculateMaxGold(stats.apl);
    const lblGold = container.querySelector('.val-max-gold');
    if (lblGold) lblGold.textContent = maxGold;

    // Process player cards
    const cards = container.querySelectorAll('.player-card');
    cards.forEach((card, index) => {
        // 1. Get Inputs
        const hInput = card.querySelector('.s-hours');
        const levelInput = card.querySelector('.s-level');
        const forfeitInput = card.querySelector('.s-forfeit-xp');
        const incentivesBtn = card.querySelector('.s-incentives-btn');
        const gInput = card.querySelector('.s-gold');

        // 2. Validate & Cap Hours
        let pHours = parseFloat(hInput.value) || 0;
        
        if (pHours > sessionHours) {
            pHours = sessionHours;
            hInput.value = pHours;
        } else if (pHours < 0) {
            pHours = 0;
            hInput.value = 0;
        }

        // 3. Construct Player Object for Calculator
        // Ensure level is at least 1, otherwise lookup fails and returns 0 XP
        let pLevel = parseInt(levelInput.value) || 0;
        if (pLevel < 1) pLevel = 1;

        const playerObj = {
            level: pLevel,
            hours: pHours, // Pass the numeric, capped hours
            forfeit_xp: forfeitInput ? forfeitInput.checked : false,
            incentives: JSON.parse(incentivesBtn.dataset.incentives || '[]')
        };
        
        // 4. Validate Gold
        const playerGold = parseFloat(gInput.value) || 0;
        const isValid = calculatorInstance.validatePlayerGold(playerGold, maxGold);
        
        const goldWrapper = gInput.closest('.card-field');
        if (goldWrapper) {
            if (isValid) {
                goldWrapper.classList.remove('error');
            } else {
                goldWrapper.classList.add('error');
            }
        }

        // 5. Calculate Rewards
        // This will now look up XP based on pLevel and multiply by pHours
        const rewards = calculatorInstance.calculatePlayerRewards(playerObj, sessionHours);
        
        // 6. Update DOM
        card.querySelector('.s-xp').value = rewards.xp;
        card.querySelector('.s-dtp').value = rewards.dtp;
    });

    // Calculate DM rewards
    const playerStats = calculatorInstance.calculatePlayerStats(sessionState.data.players);
    
    // Get DM Level directly from Setup Input to ensure freshness
    const dmLevelInput = document.getElementById('inp-dm-level');
    const dmLevel = dmLevelInput ? dmLevelInput.value : (sessionState.data.dm.level || 1);

    const dmData = {
        level: dmLevel, 
        games_count: sessionState.data.dm.games_count,
        incentives: JSON.parse(
            document.getElementById('btn-dm-loot-incentives')?.dataset.incentives || '[]'
        ),
        forfeit_xp: document.getElementById('chk-dm-forfeit-xp')?.checked || false
    };
    
    const dmRewards = calculatorInstance.calculateDMRewards(dmData, sessionHours, {
        ...playerStats,
        apl: stats.apl
    });
    
    // Update DM display
    container.querySelector('.dm-val-welcome').value = playerStats.welcomeWagon;
    container.querySelector('.dm-val-newhires').value = playerStats.newHires;
    container.querySelector('.dm-res-xp').value = dmRewards.xp;
    container.querySelector('.dm-res-dtp').value = dmRewards.dtp;
    container.querySelector('.dm-res-gp').value = dmRewards.gp;
    
    // Sync DM fields
    syncDMFieldsToSessionTab();
}

// Sync DM fields between Setup and Session tabs
function syncDMFieldsToSessionTab() {
    const dmNameSetup = document.getElementById('inp-dm-char-name');
    const dmLevelSetup = document.getElementById('inp-dm-level');
    const dmGamesSetup = document.getElementById('inp-dm-games-count');
    
    if (dmNameSetup) {
        const hiddenName = document.getElementById('out-dm-name');
        if (hiddenName) hiddenName.value = dmNameSetup.value;
    }
    if (dmLevelSetup) {
        const hiddenLevel = document.getElementById('out-dm-level');
        if (hiddenLevel) hiddenLevel.value = dmLevelSetup.value;
    }
    if (dmGamesSetup) {
        const hiddenGames = document.getElementById('out-dm-games');
        if (hiddenGames) hiddenGames.value = dmGamesSetup.value;
    }
}

// Export calculator instance getter for other modules
export function getCalculator() {
    return calculatorInstance;
}