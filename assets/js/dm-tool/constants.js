// assets/js/dm-tool/constants.js
// Centralized constants - eliminates magic numbers

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

export const TIER_THRESHOLDS = {
    TIER_1_MAX: 4,
    TIER_2_MIN: 5,
    TIER_2_MAX: 10,
    TIER_3_MIN: 11,
    TIER_3_MAX: 16,
    TIER_4_MIN: 17
};

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

export const DEBOUNCE_DELAYS = {
    CALCULATION_UPDATE: 100,
    INPUT_VALIDATION: 300,
    SAVE_STATUS: 1500
};

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

export const VALIDATION = {
    LEVEL_MIN: 1,
    LEVEL_MAX: 20,
    HOURS_MIN: 0,
    KEY_MAX_LENGTH: 200,
    VALUE_MAX_SIZE: 5242880 // 5MB in bytes
};

export const GAME_STRINGS = {
    GAMES_NEW: "1",
    GAMES_MAX: "10+",
    DEFAULT_PARTY_SIZE: 5,
    DEFAULT_APL: 1,
    DEFAULT_TIER: 1
};

export const DISCORD_CHANNELS = {
    GAME_LISTINGS: "https://discord.com/channels/308324031478890497/1366924010255814768",
    GAME_ADS: "https://discord.com/channels/308324031478890497/1366924010255814768",
    TREASURE_LOG: "https://discord.com/channels/308324031478890497/617808735770902718",
    SESSION_LOGS: "#session-logs"
};

export const ROLES = {
    TRIAL_DM: 'Trial DM',
    FULL_DM: 'Full DM',
    ADMIN: 'Admin'
};

export const FILE_PATHS = {
    DM_GUIDE: "https://drive.google.com/file/d/1MiXp60GBg2ZASiiGjgFtTRFHp7Jf0m2P/view?usp=sharing",
    ALLOWED_CONTENT: "https://docs.google.com/spreadsheets/d/1fBEv1yDNTD-vwUyK6pK_oiXg2K7OiltW35iFCqxyMTY/edit?gid=867745632#gid=867745632"
};

export const SESSION_DEFAULTS = {
    DURATION: "3-4 Hours",
    PARTY_SIZE: "5",
    HOW_TO_APPLY: "Post your application below.",
    PLATFORM: "TBD"
};

// Helper functions using constants
export function getTierFromAPL(apl) {
    if (apl >= TIER_THRESHOLDS.TIER_4_MIN) return 4;
    if (apl >= TIER_THRESHOLDS.TIER_3_MIN) return 3;
    if (apl >= TIER_THRESHOLDS.TIER_2_MIN) return 2;
    return 1;
}

export function isNewHire(gamesCount) {
    if (gamesCount === GAME_STRINGS.GAMES_MAX) return false;
    const num = parseInt(gamesCount);
    return !isNaN(num) && num <= CALCULATIONS.MAX_GAMES_NUMERIC;
}

export function isWelcomeWagon(gamesCount) {
    return gamesCount === GAME_STRINGS.GAMES_NEW;
}

export function validateLevel(level) {
    const lvl = parseInt(level);
    return !isNaN(lvl) && lvl >= VALIDATION.LEVEL_MIN && lvl <= VALIDATION.LEVEL_MAX;
}

export function validateHours(hours, maxHours) {
    const hrs = parseFloat(hours);
    return !isNaN(hrs) && hrs >= VALIDATION.HOURS_MIN && hrs <= maxHours;
}

export function capToRange(value, min, max) {
    const val = parseFloat(value);
    if (isNaN(val)) return min;
    return Math.max(min, Math.min(max, val));
}