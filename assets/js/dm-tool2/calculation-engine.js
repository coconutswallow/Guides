// assets/js/dm-tool/calculation-engine.js
// Granular calculation engine - only recalculates what changed

class CalculationEngine {
    constructor(gameRules) {
        this.rules = gameRules;
        this.cache = new Map();
    }

    // Update game rules reference
    updateRules(rules) {
        this.rules = rules;
        this.cache.clear();
    }

    // Calculate XP for a given level and hours
    calculateXP(level, hours, forfeitXP = false) {
        // If forfeit, return 0 immediately
        if (forfeitXP) return 0;
        
        const cacheKey = `xp_${level}_${hours}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        if (!this.rules || !this.rules.xp_per_hour) return 0;
        
        const safeLevel = parseInt(level) || 1;
        const hourlyXP = this.rules.xp_per_hour[safeLevel.toString()] || 
                        this.rules.xp_per_hour[safeLevel] || 0;
        const xp = Math.floor(hourlyXP * hours);
        
        this.cache.set(cacheKey, xp);
        return xp;
    }

    // Calculate player rewards (XP + DTP)
    calculatePlayerRewards(player, sessionHours) {
        const level = parseFloat(player.level) || 1;
        const hours = Math.min(parseFloat(player.hours) || 0, sessionHours);
        
        // Calculate XP with forfeit check
        const xp = this.calculateXP(level, hours, player.forfeit_xp);

        // Calculate DTP: base 5 per hour + incentives
        let dtp = Math.floor(5 * hours);
        
        if (this.rules && this.rules['player incentives'] && player.incentives) {
            player.incentives.forEach(name => {
                const bonus = this.rules['player incentives'][name];
                if (typeof bonus === 'number') {
                    dtp += bonus;
                } else if (typeof bonus === 'object' && bonus.DTP) {
                    dtp += bonus.DTP;
                }
            });
        }

        return { xp, dtp };
    }

    // Calculate DM rewards
    calculateDMRewards(dmData, sessionHours, playerStats) {
        const rewards = { xp: 0, dtp: 0, gp: 0 };
        if (!this.rules) return rewards;

        const dmLevel = parseFloat(dmData.level) || 1;
        const newHires = playerStats.newHires || 0;
        const welcomeWagon = playerStats.welcomeWagon || 0;

        // XP with forfeit check
        rewards.xp = this.calculateXP(dmLevel, sessionHours, dmData.forfeit_xp);

        // DTP: base + new hires (+5 per new hire) + incentives
        let dtp = Math.floor(5 * sessionHours) + (5 * newHires);
        
        if (this.rules['DM incentives'] && dmData.incentives) {
            dmData.incentives.forEach(name => {
                const incData = this.rules['DM incentives'][name];
                const bonus = (typeof incData === 'number') 
                    ? incData 
                    : (incData?.['bonus DTP'] || incData?.DTP || 0);
                dtp += bonus;
            });
        }
        rewards.dtp = dtp;

        // Gold: Based on DM's Character Level (not APL) * (1 + Welcome Wagon)
        const goldTable = this.rules.gold_per_session_by_apl;
        const lookupLevel = Math.floor(dmLevel);
        const baseGold = goldTable 
            ? (goldTable[lookupLevel.toString()] || goldTable[lookupLevel] || 0) 
            : 0;
            
        rewards.gp = baseGold * (1 + welcomeWagon);

        return rewards;
    }

    // Calculate player statistics (new hires, welcome wagon)
    calculatePlayerStats(players) {
        let newHires = 0;
        let welcomeWagon = 0;

        players.forEach(player => {
            const gamesVal = String(player.games_count);

            // Welcome Wagon: games played = 1
            if (gamesVal === "1") {
                welcomeWagon++;
            }

            // New Hires: games played <> 10+
            if (gamesVal !== "10+") {
                const num = parseInt(gamesVal);
                if (!isNaN(num) && num <= 10) {
                    newHires++;
                }
            }
        });

        return { newHires, welcomeWagon };
    }

    // Calculate max gold for session (Used for Player Validation based on APL)
    calculateMaxGold(apl) {
        if (!this.rules || !this.rules.gold_per_session_by_apl) return 0;
        const goldTable = this.rules.gold_per_session_by_apl;
        const safeApl = Math.floor(parseFloat(apl) || 1);
        return goldTable[safeApl.toString()] || goldTable[safeApl] || 0;
    }

    // Calculate DM loot rolls
    calculateDMLootRolls(dmData, playerStats) {
        let totalRolls = 1 + (playerStats.newHires || 0);
        
        if (this.rules && this.rules['DM incentives'] && dmData.incentives) {
            dmData.incentives.forEach(name => {
                const data = this.rules['DM incentives'][name];
                const bonus = (typeof data === 'object') 
                    ? (data['bonus loot roll'] || 0) 
                    : 0;
                if (bonus > 0) totalRolls += bonus;
            });
        }

        return totalRolls;
    }

    // Validate player gold against max (Warning only)
    validatePlayerGold(playerGold, maxGold) {
        if (maxGold <= 0) return true;
        return parseFloat(playerGold) <= maxGold;
    }

    // Validate player hours against session max
    validatePlayerHours(playerHours, sessionHours) {
        const hours = parseFloat(playerHours);
        const max = parseFloat(sessionHours);
        return hours >= 0 && hours <= max;
    }

    // Cap hours to valid range
    capHours(hours, sessionMax) {
        const val = parseFloat(hours);
        if (isNaN(val) || val < 0) return 0;
        if (val > sessionMax) return sessionMax;
        return val;
    }

    // Clear calculation cache
    clearCache() {
        this.cache.clear();
    }
}

export default CalculationEngine;