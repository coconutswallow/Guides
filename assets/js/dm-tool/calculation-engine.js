// assets/js/dm-tool/calculation-engine.js

/**
 * @file calculation-engine.js
 * @description A dedicated calculation engine for the DM Tool.
 * This class isolates all math and logic related to Experience Points (XP),
 * Downtime Points (DTP), Gold (GP), and Loot Rolls. It utilizes a caching mechanism
 * to optimize performance during frequent UI updates.
 * @module CalculationEngine
 */

class CalculationEngine {
    /**
     * Initializes the Calculation Engine with a specific set of game rules.
     * @param {Object} gameRules - The rules object containing XP tables, Gold tables, and incentive data.
     */
    constructor(gameRules) {
        this.rules = gameRules;
        /**
         * Internal cache map to store results of expensive or repetitive calculations
         * (e.g., XP based on level/hours).
         * @type {Map<string, number>}
         */
        this.cache = new Map();
    }

    /**
     * Updates the internal reference to game rules and invalidates the cache.
     * Use this when the application loads new rule data from the backend.
     * @param {Object} rules - The new rules object.
     */
    updateRules(rules) {
        this.rules = rules;
        this.cache.clear();
    }

    /**
     * Calculates the Experience Points (XP) earned based on character level and session duration.
     * Includes logic for forfeit flags and internal caching.
     * * @param {number|string} level - The character's level.
     * @param {number} hours - The duration of the session in hours.
     * @param {boolean} [forfeitXP=false] - If true, the character voluntarily forfeits XP (returns 0).
     * @returns {number} The calculated XP amount.
     */
    calculateXP(level, hours, forfeitXP = false) {
        // If forfeit is active, short-circuit immediately.
        if (forfeitXP) return 0;
        
        // Check cache to avoid recalculating unchanged inputs
        const cacheKey = `xp_${level}_${hours}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        // Validate rules existence
        if (!this.rules || !this.rules.xp_per_hour) return 0;
        
        // Input sanitization: ensure level is an integer, default to 1
        const safeLevel = parseInt(level) || 1;
        
        // Retrieve hourly rate from rules (handles string or number keys in JSON)
        const hourlyXP = this.rules.xp_per_hour[safeLevel.toString()] || 
                        this.rules.xp_per_hour[safeLevel] || 0;
        
        // Calculation: Rate * Hours (rounded down)
        const xp = Math.floor(hourlyXP * hours);
        
        // Store result in cache
        this.cache.set(cacheKey, xp);
        return xp;
    }

    /**
     * Calculates total rewards (XP and DTP) for a specific player.
     * * @param {Object} player - The player data object.
     * @param {number} sessionHours - The total duration of the session.
     * @returns {Object} An object containing { xp: number, dtp: number }.
     */
    calculatePlayerRewards(player, sessionHours) {
        const level = parseFloat(player.level) || 1;
        
        // Cap player hours at the session max duration
        const hours = Math.min(parseFloat(player.hours) || 0, sessionHours);
        
        // Calculate XP with forfeit check
        const xp = this.calculateXP(level, hours, player.forfeit_xp);

        // Calculate DTP: Base rate is usually 5 per hour
        let dtp = Math.floor(5 * hours);
        
        // Apply Bonus DTP from selected incentives (if any)
        if (this.rules && this.rules['player incentives'] && player.incentives) {
            player.incentives.forEach(name => {
                const bonus = this.rules['player incentives'][name];
                
                // Handle different data structures in rules (simple number vs object)
                if (typeof bonus === 'number') {
                    dtp += bonus;
                } else if (typeof bonus === 'object' && bonus.DTP) {
                    dtp += bonus.DTP;
                }
            });
        }

        return { xp, dtp };
    }

    /**
     * Calculates the rewards for the Dungeon Master.
     * Logic differs from players: Gold is based on DM Level, not APL.
     * DTP is influenced by the number of "New Hires" in the party.
     * * @param {Object} dmData - The DM data object.
     * @param {number} sessionHours - The total duration of the session.
     * @param {Object} playerStats - Aggregated stats (newHires, welcomeWagon).
     * @returns {Object} An object containing { xp: number, dtp: number, gp: number }.
     */
    calculateDMRewards(dmData, sessionHours, playerStats) {
        const rewards = { xp: 0, dtp: 0, gp: 0 };
        if (!this.rules) return rewards;

        const dmLevel = parseFloat(dmData.level) || 1;
        const newHires = playerStats.newHires || 0;
        const welcomeWagon = playerStats.welcomeWagon || 0;

        // 1. Calculate XP (respects forfeit flag)
        rewards.xp = this.calculateXP(dmLevel, sessionHours, dmData.forfeit_xp);

        // 2. Calculate DTP: 
        // Formula: (5 * Hours) + (5 * New Hires) + Incentives
        let dtp = Math.floor(5 * sessionHours) + (5 * newHires);
        
        if (this.rules['DM incentives'] && dmData.incentives) {
            dmData.incentives.forEach(name => {
                const incData = this.rules['DM incentives'][name];
                // Handle incentive value variations
                const bonus = (typeof incData === 'number') 
                    ? incData 
                    : (incData?.['bonus DTP'] || incData?.DTP || 0);
                dtp += bonus;
            });
        }
        rewards.dtp = dtp;

        // 3. Calculate Gold (GP):
        // Formula: Base Gold (from Table based on DM Level) * (1 + Welcome Wagon Count)
        const goldTable = this.rules.gold_per_session_by_apl;
        const lookupLevel = Math.floor(dmLevel);
        const baseGold = goldTable 
            ? (goldTable[lookupLevel.toString()] || goldTable[lookupLevel] || 0) 
            : 0;
            
        rewards.gp = baseGold * (1 + welcomeWagon);

        return rewards;
    }

    /**
     * Analyzes the roster to determine special statistics affecting DM rewards.
     * * @param {Array<Object>} players - Array of player objects.
     * @returns {Object} { newHires: number, welcomeWagon: number }
     */
    calculatePlayerStats(players) {
        let newHires = 0;
        let welcomeWagon = 0;

        players.forEach(player => {
            const gamesVal = String(player.games_count);

            // Welcome Wagon: Applies if a player has played exactly 1 game (this is their first).
            if (gamesVal === "1") {
                welcomeWagon++;
            }

            // New Hires: Applies if a player has played 10 or fewer games.
            // Note: "10+" is the string value for veterans.
            if (gamesVal !== "10+") {
                const num = parseInt(gamesVal);
                if (!isNaN(num) && num <= 10) {
                    newHires++;
                }
            }
        });

        return { newHires, welcomeWagon };
    }

    /**
     * Determines the maximum Gold a player can earn based on APL (Average Party Level).
     * Used primarily for validation warnings in the UI.
     * * @param {number|string} apl - The Average Party Level.
     * @returns {number} The max gold cap.
     */
    // FIX: Calculate max gold for session (Used for Player Validation based on APL)
    calculateMaxGold(apl) {
        if (!this.rules || !this.rules.gold_per_session_by_apl) return 0;
        
        const goldTable = this.rules.gold_per_session_by_apl;
        const safeApl = Math.floor(parseFloat(apl) || 1);
        
        // Handle case where keys might be strings "1" or numbers 1
        const val = goldTable[safeApl.toString()] || goldTable[safeApl];
        
        return parseFloat(val) || 0;
    }

    /**
     * Calculates the number of Loot Rolls the DM is entitled to.
     * Formula: 1 (Base) + 1 per New Hire + Incentive Bonuses.
     * * @param {Object} dmData - The DM data object.
     * @param {Object} playerStats - Contains newHires count.
     * @returns {number} Total number of loot rolls.
     */
    calculateDMLootRolls(dmData, playerStats) {
        let totalRolls = 1 + (playerStats.newHires || 0);
        
        if (this.rules && this.rules['DM incentives'] && dmData.incentives) {
            dmData.incentives.forEach(name => {
                const data = this.rules['DM incentives'][name];
                // Check if the incentive grants specific bonus loot rolls
                const bonus = (typeof data === 'object') 
                    ? (data['bonus loot roll'] || 0) 
                    : 0;
                if (bonus > 0) totalRolls += bonus;
            });
        }

        return totalRolls;
    }

    /**
     * Validates if the entered gold amount is within the allowable limit.
     * @param {number} playerGold - The amount entered.
     * @param {number} maxGold - The calculated limit.
     * @returns {boolean} True if valid, False if exceeds limit.
     */
    validatePlayerGold(playerGold, maxGold) {
        if (maxGold <= 0) return true; // If no rule exists, assume valid
        return parseFloat(playerGold) <= maxGold;
    }

    /**
     * Validates if the player's hours do not exceed the session duration.
     * @param {number} playerHours - Hours played by player.
     * @param {number} sessionHours - Total session duration.
     * @returns {boolean} True if valid.
     */
    validatePlayerHours(playerHours, sessionHours) {
        const hours = parseFloat(playerHours);
        const max = parseFloat(sessionHours);
        return hours >= 0 && hours <= max;
    }

    /**
     * Helper utility to clamp hours to a safe range [0, sessionMax].
     * @param {number} hours - Input hours.
     * @param {number} sessionMax - Maximum allowed hours.
     * @returns {number} The clamped value.
     */
    capHours(hours, sessionMax) {
        const val = parseFloat(hours);
        if (isNaN(val) || val < 0) return 0;
        if (val > sessionMax) return sessionMax;
        return val;
    }

    /**
     * Manually clears the internal calculation cache.
     */
    clearCache() {
        this.cache.clear();
    }
}

export default CalculationEngine;