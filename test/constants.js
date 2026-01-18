// assets/js/dm-tool/constants.js

/**
 * @file constants.js
 * @description Centralized registry of application constants, configuration values, and utility helpers.
 * This module acts as the "Single Source of Truth" for magic numbers, strings, and thresholds
 * used throughout the DM Tool. It includes helper functions to apply these constants consistently.
 * @module Constants
 */

// Centralized constants - eliminates magic numbers

/**
 * Core calculation factors for XP, DTP, and Session mechanics.
 * These values drive the arithmetic in calculation-engine.js.
 */
export const CALCULATIONS = {
    DTP_PER_HOUR: 5,
    DTP_PER_NEW_HIRE: 5,
    DEFAULT_SESSION_HOURS: 3,
    MAX_SESSION_HOURS: 5.5,
    MIN_CHARACTER_LEVEL: 1,
    MAX_CHARACTER_LEVEL: 20,
    MAX_GAMES_DISPLAY: "10+",
    MAX_GAMES_NUMERIC: 10
};

/**
 * APL (Average Party Level) thresholds that define the Game Tier.
 * Used to determine loot legality and difficulty scaling.
 */
export const TIER_THRESHOLDS = {
    TIER_1_MAX: 4,
    TIER_2_MIN: 5,
    TIER_2_MAX: 10,
    TIER_3_MIN: 11,
    TIER_3_MAX: 16,
    TIER_4_MIN: 17
};

/**
 * Dynamic formulas for calculating loot distribution limits based on party size.
 * Keys map to specific game rules for distributing items.
 */
export const LOOT_LIMITS = {
    TIER_1_PERMANENT_SLOTS: (partySize) => Math.floor(partySize / 2),
    TIER_1_BONUS_TIER_0: (partySize) => Math.floor(partySize / 2),
    TIER_2_PERMANENT_SLOTS: (partySize) => Math.floor(partySize / 2),
    TIER_2_BONUS_TIER_0: (partySize) => Math.floor(partySize / 2),
    TIER_3_PERMANENT_SLOTS: (partySize) => Math.floor(partySize / 2),
    TIER_3_BONUS_TIER_0: (partySize) => Math.floor(partySize / 2),
    TIER_4_BONUS_TIER_1_PERMANENT: 1,
    TIER_4_BONUS_TIER_1_CONSUMABLE_SLOTS: 2
};

/**
 * Timing delays (in milliseconds) for debouncing UI actions.
 * prevents excessive recalculations or API calls during rapid user input.
 */
export const DEBOUNCE_DELAYS = {
    CALCULATION_UPDATE: 100,
    INPUT_VALIDATION: 300,
    SAVE_STATUS: 1500
};

/**
 * User-facing strings for notifications, errors, and confirmations.
 * Centralized here to allow for easy localization updates in the future.
 */
export const UI_MESSAGES = {
    NO_SESSION_ID: "Error: No Session ID",
    SAVE_FIRST: "Please save the session first",
    DELETE_CONFIRM: "Are you sure you want to delete this session? This action cannot be undone.",
    TEMPLATE_SAVED: "Template Saved!",
    TEMPLATE_LOADED: "Template Loaded!",
    COPY_SUCCESS: "Copied!",
    SAVE_SUCCESS: "Saved!",
    SESSION_CREATED: "Session Created & Saved",
    NO_SUBMISSIONS: "No player submissions found for this session.",
    SYNC_COMPLETE: (count) => `Synced ${count} player(s) from submissions.`,
    HOURS_EXCEEDED: "Duration exceeds 5.5 hours. Do you want to create the next part automatically?",
    NOT_LOGGED_IN: "Not logged in",
    ENTER_NAME: "Please enter a name",
    GENERATE_LINK_FIRST: "Generate a link first."
};

/**
 * Validation boundaries for data integrity checks.
 * Ensures user inputs (Levels, Hours, Data Sizes) remain within safe/logical limits.
 */
export const VALIDATION = {
    LEVEL_MIN: 1,
    LEVEL_MAX: 20,
    HOURS_MIN: 0,
    KEY_MAX_LENGTH: 200,
    VALUE_MAX_SIZE: 5242880 // 5MB in bytes
};

/**
 * Standard strings used in dropdowns and game logic comparisons.
 * Helps avoid typos when comparing string values like "10+".
 */
export const GAME_STRINGS = {
    GAMES_NEW: "1",
    GAMES_MAX: "10+",
    DEFAULT_PARTY_SIZE: 5,
    DEFAULT_APL: 1,
    DEFAULT_TIER: 1
};

/**
 * URLs and identifiers for Discord integration.
 * Links to specific channels for posting logs or listings.
 */
export const DISCORD_CHANNELS = {
    GAME_LISTINGS: "https://discord.com/channels/308324031478890497/1366924010255814768",
    GAME_ADS: "https://discord.com/channels/308324031478890497/1366924010255814768",
    TREASURE_LOG: "https://discord.com/channels/308324031478890497/617808735770902718",
    SESSION_LOGS: "#session-logs"
};

/**
 * Role definitions for access control and UI conditional rendering.
 */
export const ROLES = {
    TRIAL_DM: 'Trial DM',
    FULL_DM: 'Full DM',
    ADMIN: 'Admin'
};

/**
 * External links to documentation and rulebooks.
 */
export const FILE_PATHS = {
    DM_GUIDE: "https://drive.google.com/file/d/1MiXp60GBg2ZASiiGjgFtTRFHp7Jf0m2P/view?usp=sharing",
    ALLOWED_CONTENT: "https://docs.google.com/spreadsheets/d/1fBEv1yDNTD-vwUyK6pK_oiXg2K7OiltW35iFCqxyMTY/edit?gid=867745632#gid=867745632"
};

/**
 * Default placeholder values for new session forms.
 */
export const SESSION_DEFAULTS = {
    DURATION: "3-4 Hours",
    PARTY_SIZE: "5",
    HOW_TO_APPLY: "Post your application below.",
    PLATFORM: "TBD"
};

// Helper functions using constants

/**
 * Determines the Game Tier based on Average Party Level (APL).
 * @param {number} apl - The calculated APL of the party.
 * @returns {number} The Tier (1-4).
 */
export function getTierFromAPL(apl) {
    if (apl >= TIER_THRESHOLDS.TIER_4_MIN) return 4;
    if (apl >= TIER_THRESHOLDS.TIER_3_MIN) return 3;
    if (apl >= TIER_THRESHOLDS.TIER_2_MIN) return 2;
    return 1;
}

/**
 * Checks if a player qualifies as a "New Hire" based on games played.
 * Rule: A player is a New Hire if they have played 10 or fewer games.
 * @param {string|number} gamesCount - The number of games played (e.g. "5", "10", "10+").
 * @returns {boolean} True if New Hire, False otherwise.
 */
export function isNewHire(gamesCount) {
    if (gamesCount === GAME_STRINGS.GAMES_MAX) return false;
    const num = parseInt(gamesCount);
    return !isNaN(num) && num <= CALCULATIONS.MAX_GAMES_NUMERIC;
}

/**
 * Checks if a player qualifies for "Welcome Wagon" bonus.
 * Rule: Applies only if this is their very first game (games count == "1").
 * @param {string} gamesCount - The number of games played.
 * @returns {boolean} True if Welcome Wagon applies.
 */
export function isWelcomeWagon(gamesCount) {
    return gamesCount === GAME_STRINGS.GAMES_NEW;
}

/**
 * Validates if a level input is within the allowed range (1-20).
 * @param {string|number} level - The level to check.
 * @returns {boolean} True if valid.
 */
export function validateLevel(level) {
    const lvl = parseInt(level);
    return !isNaN(lvl) && lvl >= VALIDATION.LEVEL_MIN && lvl <= VALIDATION.LEVEL_MAX;
}

/**
 * Validates if a duration input is non-negative and within the specific maximum.
 * @param {string|number} hours - The duration in hours.
 * @param {number} maxHours - The maximum allowed duration.
 * @returns {boolean} True if valid.
 */
export function validateHours(hours, maxHours) {
    const hrs = parseFloat(hours);
    return !isNaN(hrs) && hrs >= VALIDATION.HOURS_MIN && hrs <= maxHours;
}

/**
 * Clamps a numeric value within a specified range [min, max].
 * Useful for ensuring input fields don't exceed boundaries.
 * @param {string|number} value - The input value.
 * @param {number} min - The floor.
 * @param {number} max - The ceiling.
 * @returns {number} The clamped value.
 */
export function capToRange(value, min, max) {
    const val = parseFloat(value);
    if (isNaN(val)) return min;
    return Math.max(min, Math.min(max, val));
}