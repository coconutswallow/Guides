/**
 * ================================================================
 * REWORK CONSTANTS MODULE
 * ================================================================
 * 
 * This module defines all constant values used throughout the D&D
 * character rework calculator application. These include attribute
 * lists, point-buy costs, pricing tiers, and rework type identifiers.
 * 
 * @module rework-constants
 */

// ================================================================
// CHARACTER ATTRIBUTES
// ================================================================

/**
 * Standard D&D 5E ability scores in the canonical order.
 * Used for iterating over attributes in forms and calculations.
 * 
 * @constant {string[]} ATTRIBUTES
 * @example
 * ATTRIBUTES.forEach(attr => console.log(attr)); // STR, DEX, CON, INT, WIS, CHA
 */
export const ATTRIBUTES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

// ================================================================
// POINT-BUY SYSTEM
// ================================================================

/**
 * Point-buy costs for standard D&D character creation.
 * Maps each ability score value (8-15) to its point cost.
 * 
 * Key: Ability score value
 * Value: Number of points required to reach that score
 * 
 * @constant {Object.<number, number>} POINT_COSTS
 * @example
 * POINT_COSTS[14] // Returns 7 (it costs 7 points to have a 14)
 * POINT_COSTS[8]  // Returns 0 (8 is the baseline, costs nothing)
 */
export const POINT_COSTS = { 
    8: 0,   // Baseline - no cost
    9: 1,   // +1 point
    10: 2,  // +2 points
    11: 3,  // +3 points
    12: 4,  // +4 points
    13: 5,  // +5 points
    14: 7,  // +7 points (increased cost)
    15: 9   // +9 points (maximum standard point-buy)
};

// ================================================================
// FIXED REWORK COSTS (Checkpoint & Story Reworks)
// ================================================================

/**
 * Fixed costs for tier-based reworks (Checkpoints and Story Reworks).
 * Each tier represents a range of character levels and has predetermined
 * costs in both gold pieces (GP) and downtime points (DTP).
 * 
 * Tiers:
 * - T2: Levels 5-10 (Tier 2)
 * - T3: Levels 11-16 (Tier 3)
 * - T4: Levels 17-20 (Tier 4)
 * 
 * @constant {Object.<string, {gold: number, dtp: number}>} TIER_FIXED_COSTS
 * @example
 * TIER_FIXED_COSTS.T3 // { gold: 2400, dtp: 180 }
 */
export const TIER_FIXED_COSTS = {
    T2: { 
        gold: 820,  // Gold cost for Tier 2 reworks
        dtp: 150    // Downtime points for Tier 2 reworks
    },
    T3: { 
        gold: 2400, // Gold cost for Tier 3 reworks
        dtp: 180    // Downtime points for Tier 3 reworks
    },
    T4: { 
        gold: 4250, // Gold cost for Tier 4 reworks
        dtp: 260    // Downtime points for Tier 4 reworks
    }
};

// ================================================================
// A-LA-CARTE PRICING TIERS
// ================================================================

/**
 * A-la-carte pricing structure based on character level.
 * Each tier defines a level range and the per-change cost in gold and DTP.
 * 
 * For levels 1-5, a-la-carte reworks are not available (0 cost indicates N/A).
 * For levels 6+, each change (attribute swap, feat change, etc.) costs
 * a fixed amount based on the character's current level tier.
 * 
 * @constant {Array.<{min: number, max: number, gold: number, dtp: number}>} ALACARTE_TIERS
 * @property {number} min - Minimum character level for this tier
 * @property {number} max - Maximum character level for this tier
 * @property {number} gold - Gold cost per change at this tier
 * @property {number} dtp - Downtime points per change at this tier
 * 
 * @example
 * // Find pricing for a level 12 character:
 * const tier = ALACARTE_TIERS.find(t => 12 >= t.min && 12 <= t.max);
 * // Returns: { min: 11, max: 12, gold: 630, dtp: 40 }
 */
export const ALACARTE_TIERS = [
    { min: 1,  max: 5,  gold: 0,    dtp: 0  },  // N/A - Use free rework instead
    { min: 6,  max: 6,  gold: 160,  dtp: 30 },  // Level 6
    { min: 7,  max: 8,  gold: 270,  dtp: 30 },  // Levels 7-8
    { min: 9,  max: 10, gold: 400,  dtp: 30 },  // Levels 9-10
    { min: 11, max: 12, gold: 630,  dtp: 40 },  // Levels 11-12 (Tier 3 start)
    { min: 13, max: 14, gold: 810,  dtp: 40 },  // Levels 13-14
    { min: 15, max: 16, gold: 1030, dtp: 40 },  // Levels 15-16
    { min: 17, max: 18, gold: 1270, dtp: 50 },  // Levels 17-18 (Tier 4 start)
    { min: 19, max: 20, gold: 1530, dtp: 50 }   // Levels 19-20 (max level)
];

// ================================================================
// REWORK TYPE IDENTIFIERS
// ================================================================

/**
 * Enumeration of all available rework types.
 * These correspond to the dropdown options in the UI and determine
 * which validation rules and cost calculations are applied.
 * 
 * Rework Types:
 * 1. LEVEL_5_BELOW: Free rework for characters level 5 or below
 * 2. UPDATE_2024: Free conversion from 2014 to 2024 rules
 * 3. T2_CHECKPOINT: Tier 2 → Tier 1 fixed-cost rework
 * 4. T3_CHECKPOINT: Tier 3 → Tier 2 fixed-cost rework
 * 5. T4_CHECKPOINT: Tier 4 → Tier 3 fixed-cost rework
 * 6. ALACARTE: Pay-per-change rework system
 * 7. STORY: Fixed-cost story-based rework (level cannot increase)
 * 
 * @constant {Object.<string, string>} REWORK_TYPES
 * @example
 * if (reworkType === REWORK_TYPES.ALACARTE) {
 *     // Use a-la-carte pricing
 * }
 */
export const REWORK_TYPES = {
    LEVEL_5_BELOW: 'level-5-below',   // Free for low-level characters
    UPDATE_2024: '2024-update',       // Free 2014→2024 conversion
    T2_CHECKPOINT: 't2-checkpoint',   // Tier 2 checkpoint rework
    T3_CHECKPOINT: 't3-checkpoint',   // Tier 3 checkpoint rework
    T4_CHECKPOINT: 't4-checkpoint',   // Tier 4 checkpoint rework
    ALACARTE: 'alacarte',             // Per-change pricing
    STORY: 'story'                    // Story-driven rework
};