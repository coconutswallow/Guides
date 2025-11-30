// Monster Calculator Module
// Handles D&D 5e ability score and saving throw calculations
const MonsterCalculator = (function() {
    'use strict';

    /**
     * Calculate ability modifier from ability score
     * @param {number} score - Ability score (1-30)
     * @returns {number} Modifier value
     */
    function calculateModifier(score) {
        const parsedScore = parseInt(score, 10);
        if (isNaN(parsedScore)) return 0;
        return Math.floor((parsedScore - 10) / 2);
    }

    /**
     * Format modifier with + or - sign
     * @param {number} modifier - Modifier value
     * @returns {string} Formatted modifier (e.g., "+3", "-1")
     */
    function formatModifier(modifier) {
        return modifier >= 0 ? `+${modifier}` : `${modifier}`;
    }

    /**
     * Get proficiency bonus based on Challenge Rating
     * Based on D&D 5e rules
     * @param {string|number} cr - Challenge Rating (can be fraction like "1/4")
     * @returns {number} Proficiency bonus (2-9)
     */
    function getProficiencyBonus(cr) {
        let crNum = 0;
        
        try {
            const cleanCr = String(cr).replace(/\s/g, '');
            
            // Handle fractions
            if (cleanCr.includes('/')) {
                const parts = cleanCr.split('/');
                if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[1] != 0) {
                    crNum = parseFloat(parts[0]) / parseFloat(parts[1]);
                }
            } else {
                crNum = parseFloat(cleanCr);
            }
        } catch (e) {
            crNum = 0;
        }

        if (isNaN(crNum)) return 2;
        if (crNum < 5) return 2;
        if (crNum < 9) return 3;
        if (crNum < 13) return 4;
        if (crNum < 17) return 5;
        if (crNum < 21) return 6;
        if (crNum < 25) return 7;
        if (crNum < 29) return 8;
        return 9;
    }

    /**
     * Calculate saving throw modifier
     * Always calculates from ability score + proficiency (ignores override for calculation,
     * but the override value is still tracked for display purposes)
     * @param {number} abilityScore - Ability score
     * @param {number} proficiencyBonus - Proficiency bonus
     * @param {string} override - Optional override value (tracked but not used in calculation)
     * @returns {string} Formatted saving throw modifier
     */
    function calculateSave(abilityScore, proficiencyBonus, override = '') {
        // Always calculate: ability modifier + proficiency
        // Override parameter exists but is not used for calculation
        const abilityMod = calculateModifier(abilityScore);
        const saveBonus = abilityMod + proficiencyBonus;
        return formatModifier(saveBonus);
    }

    /**
     * Calculate Initiative 
     * @param {number} dexScore - Dexterity score
     * @param {string|number} cr - Challenge Rating (for PB)
     * @param {number|string} profLevel - 0=None, 1=Proficient, 2=Expertise
     * @returns {Object} { mod, formatted, score }
     */
    function calculateInitiative(dexScore, cr, profLevel) {
        const dexMod = calculateModifier(dexScore);
        const pb = getProficiencyBonus(cr);
        const level = parseInt(profLevel) || 0;
        
        // Init Mod = Dex Mod + (PB * level)
        const totalMod = dexMod + (pb * level);
        
        // Init Score = 10 + Init Mod
        // (Similar to Passive Perception, but for Initiative)
        const score = 10 + totalMod;

        return {
            mod: totalMod,
            formatted: formatModifier(totalMod),
            score: score
        };
    }

    /**
     * Calculate all ability modifiers and saves for a monster
     * @param {Object} state - Monster state with ability scores and save overrides
     * @returns {Object} Object with calculated values for each ability
     */
    function calculateAllAbilities(state) {
        const proficiencyBonus = getProficiencyBonus(state.cr || 0);
        const abilities = {};
        const abilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
        
        abilityKeys.forEach(key => {
            const score = state[key] || 10;
            const mod = calculateModifier(score);
            const saveOverride = state[key + 'Save'] || '';
            
            abilities[key] = {
                score: score,
                mod: mod,
                formattedMod: formatModifier(mod),
                save: calculateSave(score, proficiencyBonus, saveOverride), // This is still (Mod + PB)
                hasOverride: !!(saveOverride && saveOverride.trim()),
                saveOverride: saveOverride
            };
        });
        
        return abilities;
    }

    // Public API
    return {
        calculateModifier,
        formatModifier,
        getProficiencyBonus,
        calculateSave,
        calculateInitiative,
        calculateAllAbilities
    };

})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MonsterCalculator;
}