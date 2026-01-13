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
 * Helper to determine Tier from Level (Standard 5e)
 */
function getTier(level) {
    if (level <= 4) return 1;
    if (level <= 10) return 2;
    if (level <= 16) return 3;
    return 4;
}