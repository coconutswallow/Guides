// assets/js/dm-tool/calculators.js

/**
 * Distributes total hours across a number of sessions.
 * Simple logic: Evenly divides hours.
 * @param {number} totalHours 
 * @param {number} sessionCount 
 * @returns {number} Hours per session
 */
export function distributeHours(totalHours, sessionCount) {
    if (!sessionCount || sessionCount <= 0) return 0;
    // Round to nearest 0.5
    const raw = totalHours / sessionCount;
    return Math.round(raw * 2) / 2;
}

/**
 * Calculates rewards based on the User's specific rules:
 * - XP: Based on Character Level * Hours
 * - Gold: Based on Session APL (Flat limit per session)
 * - DTP: floor(5 * hours) + Incentives
 * * @param {number} charLevel - The individual player's level
 * @param {number} sessionApl - The Average Party Level of the group
 * @param {number} hours - Duration of the session
 * @param {object} rules - The 'dm_rules' object fetched from DB
 * @param {string[]} incentives - Array of incentive names selected
 */
export function calculateRewards(charLevel, sessionApl, hours, rules, incentives = []) {
    // 1. DTP Calculation
    // Formula: floor(5 * hours) + Incentives
    let earnedDTP = Math.floor(5 * hours);
    
    // Add incentives
    if (rules && rules['player incentives']) {
        incentives.forEach(name => {
            const bonus = rules['player incentives'][name] || 0;
            earnedDTP += bonus;
        });
    }

    // 2. XP Calculation (Per Hour, based on Character Level)
    const hourlyXP = rules.xp_per_hour[charLevel] || 0;
    const maxXP = hourlyXP * hours;

    // 3. Gold Calculation (Flat per Session, based on APL)
    const safeApl = Math.floor(sessionApl) || 1;
    const maxGold = rules.gold_per_session_by_apl[safeApl] || 0;

    const tier = getTier(charLevel);

    return {
        tier,
        maxXP,
        maxGold, 
        earnedDTP
    };
}

/**
 * Calculates XP separately. 
 * Required by session-editor.js for dynamic updates in the roster table.
 */
export function calculateXP(level, hours, rules) {
    if (!rules || !rules.xp_per_hour) return 0;
    const hourlyXP = rules.xp_per_hour[level] || 0;
    return Math.floor(hourlyXP * hours);
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

function getTier(level) {
    if (level <= 4) return 1;
    if (level <= 10) return 2;
    if (level <= 16) return 3;
    return 4;
}