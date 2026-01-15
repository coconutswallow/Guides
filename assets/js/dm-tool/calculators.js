// assets/js/dm-tool/calculators.js

/**
 * Distributes total hours across a number of sessions.
 * Simple logic: Evenly divides hours.
 */
export function distributeHours(totalHours, sessionCount) {
    if (!sessionCount || sessionCount <= 0) return 0;
    const raw = totalHours / sessionCount;
    return Math.round(raw * 2) / 2;
}

/**
 * Calculates XP separately. 
 */
export function calculateXP(level, hours, rules) {
    if (!rules || !rules.xp_per_hour) return 0;
    const hourlyXP = rules.xp_per_hour[level] || 0;
    return Math.floor(hourlyXP * hours);
}

/**
 * Calculates Player Rewards (XP and DTP)
 */
export function calculatePlayerRewards(level, hours, rules, incentives = []) {
    const xp = calculateXP(level, hours, rules);
    
    // DTP: floor(5 * hours) + incentives
    let dtp = Math.floor(5 * hours);
    
    if (rules && rules['player incentives']) {
        incentives.forEach(name => {
            dtp += (rules['player incentives'][name] || 0);
        });
    }

    return { xp, dtp };
}

/**
 * Calculates DM Rewards based on specific rules:
 * - DTP: floor(5 * hours) + (5 * newHires) + Incentives
 * - XP: Based on DMPC Level & Hours
 * - Gold: Max Gold for Session APL (Only if Jumpstart = Yes)
 * - Loot: 1 + New Hires + (1 if Jumpstart)
 */
export function calculateDMRewards(dmLevel, hours, sessionApl, newHireCount, isJumpstart, rules, selectedIncentives = []) {
    const rewards = {
        xp: 0,
        dtp: 0,
        gp: 0,
        loot: "1"
    };

    if (!rules) return rewards;

    // 1. XP
    rewards.xp = calculateXP(dmLevel, hours, rules);

    // 2. DTP
    let dtp = Math.floor(5 * hours) + (5 * newHireCount);
    
    if (rules['DM incentives']) {
        selectedIncentives.forEach(name => {
            dtp += (rules['DM incentives'][name] || 0);
        });
    }
    rewards.dtp = dtp;

    // 3. Gold (Only if Jumpstart)
    if (isJumpstart) {
        const safeApl = Math.floor(sessionApl) || 1;
        rewards.gp = rules.gold_per_session_by_apl ? (rules.gold_per_session_by_apl[safeApl] || 0) : 0;
    }

    // 4. Loot String Construction
    // "1 + [New Hires] + [Jumpstart]"
    let baseLoot = 1 + newHireCount;
    let lootStr = `${baseLoot}`;
    
    if (isJumpstart) {
        lootStr += " + 1 Jumpstart Loot";
    } else if (newHireCount > 0) {
        lootStr += " (Inc. New Hire Bonus)";
    }
    
    rewards.loot = lootStr;

    return rewards;
}

/**
 * Calculates the number of log sessions based on hours played.
 * Rule: Increments at every complete 3-hour mark (6, 9, 12, etc).
 */
export function calculateSessionCount(hours) {
    const h = parseFloat(hours) || 0;
    if (h <= 0) return 0;
    return Math.max(1, Math.floor(h / 3));
}

/**
 * Converts a datetime string and timezone to a Unix timestamp.
 */
export function toUnixTimestamp(dateStr, timeZone) {
    if (!dateStr) return 0;
    if (!timeZone) return Math.floor(new Date(dateStr).getTime() / 1000);

    const utcDate = new Date(dateStr + 'Z');
    const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: timeZone,
        timeZoneName: 'longOffset'
    });
    
    const parts = fmt.formatToParts(utcDate);
    const offsetStr = parts.find(p => p.type === 'timeZoneName').value; 

    if (offsetStr === 'GMT') return Math.floor(utcDate.getTime() / 1000);

    const match = offsetStr.match(/GMT([+-])(\d{1,2}):?(\d{2})?/);
    if (!match) return Math.floor(utcDate.getTime() / 1000); 

    const sign = match[1] === '+' ? 1 : -1;
    const hours = parseInt(match[2], 10);
    const minutes = parseInt(match[3] || '0', 10);
    const offsetMs = (hours * 60 + minutes) * 60 * 1000 * sign;

    return Math.floor((utcDate.getTime() - offsetMs) / 1000);
}