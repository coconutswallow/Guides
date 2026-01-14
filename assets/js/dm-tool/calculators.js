// assets/js/dm-tool/calculators.js

/**
 * Calculates rewards based on the User's specific rules:
 * - XP: Based on Character Level * Hours
 * - Gold: Based on Session APL (Flat limit per session)
 * - DTP: 5 per hour
 * * @param {number} charLevel - The individual player's level
 * @param {number} sessionApl - The Average Party Level of the group
 * @param {number} hours - Duration of the session
 * @param {object} rules - The 'dm_rules' object fetched from DB
 */
export function calculateRewards(charLevel, sessionApl, hours, rules) {
    // 1. DTP Calculation (Fixed Formula)
    // "5 per hour"
    const earnedDTP = 5 * hours;

    // 2. XP Calculation (Per Hour, based on Character Level)
    // Default to 0 if level not found
    const hourlyXP = rules.xp_per_hour[charLevel] || 0;
    const maxXP = hourlyXP * hours;

    // 3. Gold Calculation (Flat per Session, based on APL)
    // Note: User specified "Max allowable gold per session is based on APL"
    // We floor the APL to find the lookup key (e.g., APL 4.5 -> 4)
    const safeApl = Math.floor(sessionApl) || 1;
    const maxGold = rules.gold_per_session_by_apl[safeApl] || 0;

    // Tier isn't explicitly in the new lookup tables, 
    // but usually derived from Level (1-4=T1, 5-10=T2, etc.) if needed for display.
    const tier = getTier(charLevel);

    return {
        tier,
        maxXP,
        maxGold, // This is the total cap for the session
        earnedDTP
    };
}

/**
 * Calculates the number of log sessions based on hours played.
 * Standard logic: usually 1 session, but some leagues split 4hr+ games.
 * For now, we return 1 unless specified otherwise, or use a 4-hour block rule.
 * @param {number} hours 
 * @returns {number}
 */
export function calculateSessionCount(hours) {
    const h = parseFloat(hours) || 0;
    if (h <= 0) return 0;
    // Example logic: 1 session count per 4 hours started, or just default to 1
    // Given the UI allows manual override, we'll implement a simple ceiling of 4-hour blocks
    return Math.ceil(h / 4);
}

/**
 * Converts a datetime string and timezone to a Unix timestamp.
 * Uses the browser's Intl API to calculate the correct offset for that specific date (handling DST).
 * @param {string} dateStr - YYYY-MM-DDTHH:MM
 * @param {string} timeZone - IANA Timezone string (e.g. "America/New_York")
 * @returns {number} Unix timestamp in seconds
 */
export function toUnixTimestamp(dateStr, timeZone) {
    if (!dateStr) return 0;
    
    // 1. If no timezone is selected, default to browser's local time
    if (!timeZone) {
        return Math.floor(new Date(dateStr).getTime() / 1000);
    }

    // 2. Treat the input string as UTC first to get a baseline
    // We append 'Z' to force it to be UTC
    const utcDate = new Date(dateStr + 'Z');

    // 3. Ask the browser: "When it is this time in UTC, what is the offset string for the target timezone?"
    // We use 'longOffset' to get formats like "GMT-05:00" or "GMT+09:30"
    const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: timeZone,
        timeZoneName: 'longOffset'
    });
    
    const parts = fmt.formatToParts(utcDate);
    const offsetStr = parts.find(p => p.type === 'timeZoneName').value; // e.g., "GMT-05:00"

    // 4. Parse the offset (e.g., "-05:00" -> -5 hours)
    // Format is always GMT±HH:MM or GMT
    if (offsetStr === 'GMT') return Math.floor(utcDate.getTime() / 1000);

    const match = offsetStr.match(/GMT([+-])(\d{1,2}):?(\d{2})?/);
    if (!match) return Math.floor(utcDate.getTime() / 1000); // Fallback

    const sign = match[1] === '+' ? 1 : -1;
    const hours = parseInt(match[2], 10);
    const minutes = parseInt(match[3] || '0', 10);
    
    // Total offset in milliseconds
    const offsetMs = (hours * 60 + minutes) * 60 * 1000 * sign;

    // 5. Apply the offset
    // Since we started with UTC, we SUBTRACT the offset to shift it "back" to the target time.
    // Example: Target is Tokyo (+9). We have 10:00 UTC. To get 10:00 Tokyo, we act as if it's 9 hours earlier in UTC.
    return Math.floor((utcDate.getTime() - offsetMs) / 1000);
}

/**
 * Helper to determine Tier from Level (Standard 5e)
 */
function getTier(level) {
    if (level <= 4) return 1;
    if (level <= 10) return 2;
    if (level <= 16) return 3;
    return 4;
}