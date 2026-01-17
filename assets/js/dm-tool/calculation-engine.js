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
    calculateXP(level, hours) {
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
        
        // Calculate XP
        let xp = this.calculateXP(level, hours);
        if (player.forfeit_xp) xp = 0;

        // Calculate DTP: base 5 per hour + incentives
        let dtp = Math.floor(5 * hours);
        
        if (this.rules && this.rules['player incentives'] && player.incentives) {
            player.incentives.forEach(name => {
                dtp += (this.rules['player incentives'][name] || 0);
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

        // XP
        rewards.xp = this.calculateXP(dmLevel, sessionHours);
        if (dmData.forfeit_xp) rewards.xp = 0;

        // DTP: base + new hires + incentives
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

        // Gold
        const goldTable = this.rules.gold_per_session_by_apl;
        const baseGold = goldTable 
            ? (goldTable[playerStats.apl?.toString()] || goldTable[playerStats.apl] || 0) 
            : 0;
        rewards.gp = baseGold * (1 + welcomeWagon);

        return rewards;
    }

    // Calculate player statistics (new hires, welcome wagon)
    calculatePlayerStats(players) {
        let newHires = 0;
        let welcomeWagon = 0;

        players.forEach(player => {
            const gamesVal = player.games_count;
            const gamesNum = parseInt(gamesVal);

            if (gamesVal === "1") welcomeWagon++;
            if (gamesVal !== "10+" && !isNaN(gamesNum) && gamesNum <= 10) {
                newHires++;
            }
        });

        return { newHires, welcomeWagon };
    }

    // Calculate max gold for session
    calculateMaxGold(apl) {
        if (!this.rules || !this.rules.gold_per_session_by_apl) return 0;
        
        const goldTable = this.rules.gold_per_session_by_apl;
        return goldTable[apl?.toString()] || goldTable[apl] || 0;
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

    // Validate player gold against max
    validatePlayerGold(playerGold, maxGold) {
        if (maxGold <= 0) return true; // No validation if max not set
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