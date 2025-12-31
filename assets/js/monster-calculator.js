// Monster Calculator Module
// Handles D&D 5e ability score and saving throw calculations
const MonsterCalculator = (function() {
    'use strict';

    const XP_TABLE = {
        "0": 10, "1/8": 25, "1/4": 50, "1/2": 100,
        "1": 200, "2": 450, "3": 700, "4": 1100, "5": 1800,
        "6": 2300, "7": 2900, "8": 3900, "9": 5000, "10": 5900,
        "11": 7200, "12": 8400, "13": 10000, "14": 11500, "15": 13000,
        "16": 15000, "17": 18000, "18": 20000, "19": 22000, "20": 25000,
        "21": 33000, "22": 41000, "23": 50000, "24": 62000, "25": 75000,
        "26": 90000, "27": 105000, "28": 120000, "29": 135000, "30": 155000
    };

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
     */
    function getProficiencyBonus(cr) {
        let crNum = 0;
        
        try {
            const cleanCr = String(cr).replace(/\s/g, '');
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
     * Get Experience Points based on CR
     */
    function getExperiencePoints(cr) {
        const cleanCr = String(cr).trim();
        const xp = XP_TABLE[cleanCr] || 0;
        return xp.toLocaleString();
    }

    /**
     * Calculate Initiative 
     */
    function calculateInitiative(dexScore, cr, profLevel) {
        const dexMod = calculateModifier(dexScore);
        const pb = getProficiencyBonus(cr);
        const level = parseInt(profLevel) || 0;
        const totalMod = dexMod + (pb * level);
        const score = 10 + totalMod;

        return {
            mod: totalMod,
            formatted: formatModifier(totalMod),
            score: score
        };
    }

    /**
     * Calculate all ability modifiers and saves for a monster
     * UPDATED: Now defaults 'save' to the Modifier. 
     * Uses 'saveOverride' for the 'save' property ONLY if provided.
     */
    function calculateAllAbilities(state) {
        const proficiencyBonus = getProficiencyBonus(state.cr || 0);
        const abilities = {};
        const abilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
        
        abilityKeys.forEach(key => {
            const score = state[key] || 10;
            const mod = calculateModifier(score);
            const saveOverride = state[key + 'Save'] || '';
            const hasOverride = !!(saveOverride && saveOverride.trim());

            // Determine effective save: Use override if present, else use modifier
            let effectiveSave;
            if (hasOverride) {
                effectiveSave = saveOverride;
            } else {
                effectiveSave = formatModifier(mod);
            }

            abilities[key] = {
                score: score,
                mod: mod,
                formattedMod: formatModifier(mod),
                save: effectiveSave, // Used in the table display
                hasOverride: hasOverride,
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
        getExperiencePoints,
        calculateInitiative,
        calculateAllAbilities
    };

})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MonsterCalculator;
}