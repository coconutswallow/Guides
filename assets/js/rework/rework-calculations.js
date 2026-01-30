/**
 * ================================================================
 * REWORK CALCULATIONS MODULE
 * ================================================================
 * 
 * This module contains all calculation logic for the character rework
 * system, including point-buy costs, level totals, pricing lookups,
 * and comprehensive rework cost computation.
 * 
 * @module rework-calculations
 */

import { ATTRIBUTES, POINT_COSTS, ALACARTE_TIERS, REWORK_TYPES, TIER_FIXED_COSTS } from './rework-constants.js';
import { getState } from './state-manager.js';

// ================================================================
// POINT-BUY CALCULATION
// ================================================================

/**
 * Calculates the total point-buy cost for a set of ability scores.
 * 
 * Uses the standard D&D point-buy system where scores range from 8-15.
 * Each score above 8 costs points based on the POINT_COSTS table.
 * 
 * @param {Object.<string, number>} attributesObj - Object with attribute names as keys (STR, DEX, etc.) and scores as values
 * @returns {number} Total points spent (valid point-buy is typically 27 points)
 * 
 * @example
 * const attrs = { STR: 14, DEX: 12, CON: 13, INT: 10, WIS: 8, CHA: 15 };
 * calculatePointBuyCost(attrs); // Returns 27
 */
export function calculatePointBuyCost(attributesObj) {
    let spent = 0;
    
    // Iterate through all six ability scores
    ATTRIBUTES.forEach(attrName => {
        // Parse the value, default to 8 if invalid
        const scoreValue = parseInt(attributesObj[attrName]) || 8;
        
        // Add the cost for this score to the total
        spent += POINT_COSTS[scoreValue] || 0;
    });
    
    return spent;
}

// ================================================================
// LEVEL CALCULATION
// ================================================================

/**
 * Calculates the total character level from an array of class objects.
 * 
 * Handles multiclassing by summing the levels of all classes.
 * Gracefully handles invalid input by returning 0.
 * 
 * @param {Array.<{class: string, level: number}>} classes - Array of class objects with level properties
 * @returns {number} Total character level
 * 
 * @example
 * const classes = [
 *     { class: 'Fighter', level: 5 },
 *     { class: 'Rogue', level: 3 }
 * ];
 * getTotalLevel(classes); // Returns 8
 */
export function getTotalLevel(classes) {
    // Handle null/undefined/non-array inputs
    if (!classes || !Array.isArray(classes)) return 0;
    
    // Sum all class levels
    return classes.reduce((sum, classObj) => {
        return sum + (parseInt(classObj.level) || 0);
    }, 0);
}

// ================================================================
// A-LA-CARTE PRICING LOOKUP
// ================================================================

/**
 * Retrieves the a-la-carte pricing rates for a given character level.
 * 
 * Searches the ALACARTE_TIERS array to find the tier that contains
 * the specified level, then returns that tier's gold and DTP rates.
 * 
 * @param {number} level - Character's total level
 * @returns {{gold: number, dtp: number}} Pricing rates for this level
 * 
 * @example
 * getAlacarteRates(12);  // { gold: 630, dtp: 40 }
 * getAlacarteRates(4);   // { gold: 0, dtp: 0 } - Not available at low levels
 */
export function getAlacarteRates(level) {
    // Find the first tier where level falls within min-max range
    const tier = ALACARTE_TIERS.find(t => level >= t.min && level <= t.max);
    
    // Return the tier's rates, or zeros if not found
    return tier || { gold: 0, dtp: 0 };
}

// ================================================================
// EQUALITY CHECKING HELPERS
// ================================================================

/**
 * Compares two modifier objects to determine if they are equal.
 * 
 * Modifier objects contain attribute modifiers (e.g., racial bonuses).
 * Treats missing attributes as "0" for comparison purposes.
 * 
 * @param {Object.<string, string>} m1 - First modifier object
 * @param {Object.<string, string>} m2 - Second modifier object
 * @returns {boolean} True if all attributes match, false otherwise
 * 
 * @example
 * const mod1 = { STR: '2', DEX: '1' };
 * const mod2 = { STR: '2', DEX: '1', CON: '0' };
 * areModsEqual(mod1, mod2); // Returns true (missing values treated as '0')
 */
function areModsEqual(m1, m2) {
    const mod1 = m1 || {};
    const mod2 = m2 || {};
    
    // Check each attribute
    for (const attr of ATTRIBUTES) {
        const val1 = mod1[attr] || '0';
        const val2 = mod2[attr] || '0';
        
        if (val1 !== val2) return false;
    }
    
    return true;
}

/**
 * Compares two arrays of feature objects to determine if they are equal.
 * 
 * Features are objects with 'type' and 'name' properties.
 * Arrays must have the same length and matching features at each index.
 * 
 * @param {Array.<{type: string, name: string}>} arr1 - First feature array
 * @param {Array.<{type: string, name: string}>} arr2 - Second feature array
 * @returns {boolean} True if arrays are identical, false otherwise
 * 
 * @example
 * const f1 = [{ type: 'proficiency', name: 'Stealth' }];
 * const f2 = [{ type: 'proficiency', name: 'Stealth' }];
 * areFeaturesEqual(f1, f2); // Returns true
 */
function areFeaturesEqual(arr1, arr2) {
    const list1 = arr1 || [];
    const list2 = arr2 || [];
    
    // Different lengths = not equal
    if (list1.length !== list2.length) return false;
    
    // Compare each feature
    for (let i = 0; i < list1.length; i++) {
        const f1 = list1[i] || { type: 'none', name: '' };
        const f2 = list2[i] || { type: 'none', name: '' };
        
        if (f1.type !== f2.type || f1.name !== f2.name) {
            return false;
        }
    }
    
    return true;
}

// ================================================================
// MAIN REWORK COST COMPUTATION
// ================================================================

/**
 * Computes the costs for a character rework based on type and changes.
 * 
 * This is the primary calculation engine that:
 * 1. Validates the rework type and character levels
 * 2. Determines if it's a fixed-cost or variable-cost rework
 * 3. Analyzes differences between old and new characters
 * 4. Returns detailed cost breakdown
 * 
 * @param {string} type - Rework type identifier (from REWORK_TYPES)
 * @param {Object} oldChar - Original character object
 * @param {Object} newChar - New character object
 * @returns {Object} Result object with isValid, costs, and optional error/rates
 * 
 * @returns {boolean} result.isValid - Whether the rework is valid
 * @returns {boolean} [result.isFixed] - True for fixed-cost reworks
 * @returns {string} [result.error] - Error message if invalid
 * @returns {Object} [result.rates] - A-la-carte rates if applicable
 * @returns {Array.<Object>} result.costs - Array of cost line items
 * 
 * @example
 * const result = computeReworkCosts('alacarte', oldCharacter, newCharacter);
 * if (result.isValid) {
 *     console.log('Total changes:', result.costs.length);
 *     console.log('Rate:', result.rates);
 * }
 */
export function computeReworkCosts(type, oldChar, newChar) {
    const costs = [];
    
    // Calculate total levels for both characters
    const origLevel = getTotalLevel(oldChar.classes || []);
    const newLevel = getTotalLevel(newChar.classes || []);
    
    // Get character data lookup table (for ASI/feat calculations)
    const characterData = getState().characterData || [];
    
    /**
     * Helper: Check if all classes in an array match a specific version
     * @param {Array} classes - Array of class objects
     * @param {string} v - Version to check ('2014' or '2024')
     * @returns {boolean} True if all classes match the version
     */
    const allMatchVer = (classes, v) => 
        classes && classes.length > 0 && classes.every(c => c.version === v);

    // ============================================================
    // REWORK TYPE 1: Level 5 or Below Free Rework
    // ============================================================
    if (type === REWORK_TYPES.LEVEL_5_BELOW) {
        // Validation: Both characters must be level 5 or below
        if (origLevel > 5 || newLevel > 5) {
            return { 
                isValid: false, 
                error: "Both characters must be level 5 or below." 
            };
        }
        
        // Free rework - no cost
        return { 
            isValid: true, 
            isFixed: true, 
            costs: [{ 
                change: 'Level 5 or Below Free Rework', 
                count: 0, 
                dtp: 0, 
                gold: 0 
            }] 
        };
    }

    // ============================================================
    // REWORK TYPE 2: 2024 Update Rework
    // ============================================================
    if (type === REWORK_TYPES.UPDATE_2024) {
        // Validation: Original must be all 2014, New must be all 2024
        if (!allMatchVer(oldChar.classes, '2014') || !allMatchVer(newChar.classes, '2024')) {
            return { 
                isValid: false, 
                error: "Requires all Original to be 2014 and all New to be 2024." 
            };
        }
        
        // Free conversion - no cost
        return { 
            isValid: true, 
            isFixed: true, 
            costs: [{ 
                change: '2024 Update Rework', 
                count: 0, 
                dtp: 0, 
                gold: 0 
            }] 
        };
    }

    // ============================================================
    // REWORK TYPES 3-5: Checkpoint Reworks (T2, T3, T4)
    // ============================================================
    
    /**
     * Checkpoint configuration map
     * Defines level ranges and tier identifiers for each checkpoint type
     */
    const checkpoints = {
        [REWORK_TYPES.T2_CHECKPOINT]: { 
            oMin: 5,   // Original minimum level
            oMax: 10,  // Original maximum level
            nMin: 1,   // New minimum level
            nMax: 4,   // New maximum level
            tier: 'T2' // Pricing tier
        },
        [REWORK_TYPES.T3_CHECKPOINT]: { 
            oMin: 11, 
            oMax: 16, 
            nMin: 5, 
            nMax: 10, 
            tier: 'T3' 
        },
        [REWORK_TYPES.T4_CHECKPOINT]: { 
            oMin: 17, 
            oMax: 20, 
            nMin: 11, 
            nMax: 16, 
            tier: 'T4' 
        }
    };

    if (checkpoints[type]) {
        const t = checkpoints[type];
        
        // Validation: Check level ranges
        if (origLevel < t.oMin || origLevel > t.oMax || 
            newLevel < t.nMin || newLevel > t.nMax) {
            return { 
                isValid: false, 
                error: `Invalid Level Range for Checkpoint.` 
            };
        }
        
        // Fixed cost based on tier
        const rates = TIER_FIXED_COSTS[t.tier];
        return { 
            isValid: true, 
            isFixed: true, 
            costs: [{ 
                change: `${t.tier} Checkpoint`, 
                count: 1, 
                dtp: rates.dtp, 
                gold: rates.gold 
            }] 
        };
    }

    // ============================================================
    // REWORK TYPE 6: Story Rework
    // ============================================================
    if (type === REWORK_TYPES.STORY) {
        // Validation: New level cannot exceed original level
        if (newLevel > origLevel) {
            return { 
                isValid: false, 
                error: "Story Rework: New level cannot exceed original level." 
            };
        }
        
        // Determine tier based on original level
        let tier = "";
        if (origLevel >= 17) tier = "T4";
        else if (origLevel >= 11) tier = "T3";
        else if (origLevel >= 5) tier = "T2";
        
        // Apply tier-based or free pricing
        if (tier) {
            const rates = TIER_FIXED_COSTS[tier];
            return { 
                isValid: true, 
                isFixed: true, 
                costs: [{ 
                    change: `${tier} Story Rework`, 
                    count: 1, 
                    dtp: rates.dtp, 
                    gold: rates.gold 
                }] 
            };
        } else {
            // Level 1-4: Free story rework
            return { 
                isValid: true, 
                isFixed: true, 
                costs: [{ 
                    change: 'Level 5 or Below Story Rework', 
                    count: 0, 
                    dtp: 0, 
                    gold: 0 
                }] 
            };
        }
    }

    // ============================================================
    // REWORK TYPE 7: A-la-carte Rework
    // ============================================================
    if (type === REWORK_TYPES.ALACARTE) {
        // Get pricing rates based on original character level
        const rates = getAlacarteRates(origLevel);
        
        // Validation: A-la-carte only available for level 6+
        if (rates.gold === 0 && rates.dtp === 0) {
            return { 
                isValid: false, 
                error: "A-la-carte available for levels 6+ only." 
            };
        }
        
        // --------------------------------------------------------
        // CHANGE DETECTION 1: Name Change
        // --------------------------------------------------------
        if (oldChar.name !== newChar.name && oldChar.name && newChar.name) {
            costs.push({ 
                change: `Name Change: ${oldChar.name} → ${newChar.name}`, 
                count: 2  // Name changes cost 2 units
            });
        }
        
        // --------------------------------------------------------
        // CHANGE DETECTION 2: Attribute Changes
        // --------------------------------------------------------
        const changedAttrs = ATTRIBUTES.filter(attr => 
            oldChar.attributes[attr] !== newChar.attributes[attr]
        );
        
        if (changedAttrs.length > 0) {
            // Build detailed description of which attributes changed
            const detail = changedAttrs.map(attr => 
                `${attr} (${oldChar.attributes[attr]}→${newChar.attributes[attr]})`
            ).join(', ');
            
            costs.push({ 
                change: `Attribute Changes: ${detail}`, 
                count: 2  // Attribute changes cost 2 units
            });
        }
        
        // --------------------------------------------------------
        // CHANGE DETECTION 3: Race/Species Change
        // --------------------------------------------------------
        // Checks race name, modifiers, and features
        if (oldChar.race !== newChar.race || 
            !areModsEqual(oldChar.race_mods, newChar.race_mods) || 
            !areFeaturesEqual(oldChar.race_features, newChar.race_features)) {
            
            costs.push({ 
                change: `Race/Species Change: ${oldChar.race || 'None'} → ${newChar.race || 'None'}`, 
                count: 1  // Race changes cost 1 unit
            });
        }
        
        // --------------------------------------------------------
        // CHANGE DETECTION 4: Origin/Background Change
        // --------------------------------------------------------
        // Checks background, origin feat, and origin features
        if (oldChar.bg !== newChar.bg || 
            oldChar.origin_feat !== newChar.origin_feat || 
            !areFeaturesEqual(oldChar.origin_features, newChar.origin_features)) {
            
            costs.push({ 
                change: `Origin Change: ${oldChar.bg || 'None'} → ${newChar.bg || 'None'}`, 
                count: 1  // Origin changes cost 1 unit
            });
        }
        
        // --------------------------------------------------------
        // CHANGE DETECTION 5: Class/Level Changes
        // --------------------------------------------------------
        const oldClasses = oldChar.classes || [];
        const newClasses = newChar.classes || [];
        
        // Create human-readable class strings for display
        const oldStr = oldClasses.map(c => 
            `${c.class} (${c.subclass || 'None'})`
        ).join('/');
        const newStr = newClasses.map(c => 
            `${c.class} (${c.subclass || 'None'})`
        ).join('/');

        // Determine if the build has changed
        // Must check: class count, names, subclasses, versions, AND levels
        let buildChanged = oldClasses.length !== newClasses.length;
        
        if (!buildChanged) {
            // Same number of classes - check each one in detail
            for (let i = 0; i < oldClasses.length; i++) {
                if (oldClasses[i].class !== newClasses[i].class || 
                    oldClasses[i].subclass !== newClasses[i].subclass ||
                    oldClasses[i].version !== newClasses[i].version ||
                    oldClasses[i].level !== newClasses[i].level) { 
                    buildChanged = true;
                    break;
                }
            }
        }

        if (buildChanged) {
            // Build changed - recalculate all feat cards
            // Each ASI/feat milestone counts as one change
            
            let featCardCount = 0;
            
            newChar.classes.forEach(classObj => {
                // Look up this class/subclass in the character data
                let data = characterData.find(r => 
                    r.version === classObj.version && 
                    r.class === classObj.class && 
                    r.subclass === classObj.subclass
                ) || characterData.find(r => 
                    r.version === classObj.version && 
                    r.class === classObj.class
                );
                
                // Get ASI levels (default to standard if not found)
                const asiLevels = data?.ASI || [4, 8, 12, 16, 19];
                
                // Count how many ASI milestones this class has reached
                featCardCount += asiLevels.filter(milestone => 
                    milestone <= (parseInt(classObj.level) || 0)
                ).length;
            });
            
            costs.push({ 
                change: `Class/Level Shift: ${oldStr} → ${newStr} (${featCardCount} feat cards affected)`, 
                count: featCardCount 
            });
            
        } else {
            // --------------------------------------------------------
            // CHANGE DETECTION 5b: Individual Feat/ASI Changes
            // --------------------------------------------------------
            // Build didn't change, so check individual feat modifications
            
            const oldFeats = oldChar.feats || [];
            const newFeats = newChar.feats || [];
            const featChanges = [];
            
            oldFeats.forEach((oldFeat, index) => {
                const newFeat = newFeats[index];
                if (!newFeat) return;  // No corresponding new feat

                // Check if feat name changed
                if (oldFeat.name !== newFeat.name) {
                    featChanges.push(
                        `${oldFeat.source}: ${oldFeat.name || 'Empty'} → ${newFeat.name || 'Empty'}`
                    );
                } else {
                    // Same feat name - check if modifiers or features changed
                    const modsChanged = ATTRIBUTES.some(attr => 
                        (oldFeat.mods[attr] || "0") !== (newFeat.mods[attr] || "0")
                    );
                    
                    const featuresChanged = !areFeaturesEqual(
                        oldFeat.features, 
                        newFeat.features
                    );
                    
                    if (modsChanged || featuresChanged) {
                        featChanges.push(
                            `${oldFeat.name} (${oldFeat.source}) details/modifiers updated`
                        );
                    }
                }
            });

            // Add all feat changes as a single line item
            if (featChanges.length > 0) {
                costs.push({ 
                    change: `Feat/ASI Modifications: ${featChanges.join('; ')}`, 
                    count: 1  // All feat tweaks together cost 1 unit
                });
            }
        }
        
        // Return a-la-carte result with rates and itemized costs
        return { 
            isValid: true, 
            isFixed: false,  // Variable cost based on number of changes
            rates,           // Include per-change rates
            costs            // Array of detected changes
        };
    }

    // ============================================================
    // FALLBACK: Invalid Rework Type
    // ============================================================
    return { 
        isValid: false, 
        error: "Please select a valid rework type." 
    };
}