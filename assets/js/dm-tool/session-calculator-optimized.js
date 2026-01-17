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
    
    // Calculate max gold (relying on state for stats is fine here, assuming sync happened)
    const stats = sessionState.calculateStats();
    const maxGold = calculatorInstance.calculateMaxGold(stats.apl);
    const lblGold = container.querySelector('.val-max-gold');
    if (lblGold) lblGold.textContent = maxGold;

    // Process player cards
    const cards = container.querySelectorAll('.player-card');
    cards.forEach((card, index) => {
        // We construct a temporary player object from the DOM to ensure we calculate based on what is seen
        const levelVal = card.querySelector('.s-level').value;
        const forfeitXp = card.querySelector('.s-forfeit-xp').checked;
        const incentivesBtn = card.querySelector('.s-incentives-btn');
        const incentives = JSON.parse(incentivesBtn.dataset.incentives || '[]');

        const player = {
            level: levelVal,
            forfeit_xp: forfeitXp,
            incentives: incentives,
            hours: card.querySelector('.s-hours').value
        };
        
        // Validate and cap hours
        const hInput = card.querySelector('.s-hours');
        let pHours = parseFloat(hInput.value) || 0;
        
        if (pHours > sessionHours) {
            pHours = sessionHours;
            hInput.value = pHours;
            player.hours = pHours;
        }
        
        if (pHours < 0) {
            pHours = 0;
            hInput.value = 0;
            player.hours = 0;
        }

        // Validate gold
        const gInput = card.querySelector('.s-gold');
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

        // Calculate rewards - FIX 2: Ensure we pass the object with the level derived from DOM
        const rewards = calculatorInstance.calculatePlayerRewards(player, sessionHours);
        
        // Update DOM
        card.querySelector('.s-xp').value = rewards.xp;
        card.querySelector('.s-dtp').value = rewards.dtp;
    });

    // Calculate DM rewards
    const playerStats = calculatorInstance.calculatePlayerStats(sessionState.data.players);
    
    // FIX 3: Get DM Level directly from Setup Input to ensure freshness
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