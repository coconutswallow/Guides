// Monster Validator Module
// Handles validation of monster state data
const MonsterValidator = (function() {
    'use strict';

    /**
     * Validate that a field is not empty
     * @param {string} value - Field value
     * @param {string} fieldName - Human-readable field name
     * @returns {string|null} Error message or null if valid
     */
    function validateRequired(value, fieldName) {
        if (!value || !value.trim()) {
            return `${fieldName} is required`;
        }
        return null;
    }

    /**
     * Validate ability score is within legal range (1-30)
     * @param {number} score - Ability score
     * @param {string} abilityName - Name of ability (e.g., "STR")
     * @returns {string|null} Error message or null if valid
     */
    function validateAbilityScore(score, abilityName) {
        const num = parseInt(score, 10);
        if (isNaN(num) || num < 1 || num > 30) {
            return `${abilityName} must be between 1 and 30`;
        }
        return null;
    }

    /**
     * Validate Challenge Rating format
     * Accepts whole numbers (0-30) or fractions (1/8, 1/4, 1/2)
     * @param {string|number} cr - Challenge Rating
     * @returns {string|null} Error message or null if valid
     */
    function validateChallengeRating(cr) {
        if (!cr || !String(cr).trim()) {
            return 'CR is required';
        }

        try {
            const cleanCr = String(cr).replace(/\s/g, '');
            let crNum;

            // Handle fractions
            if (cleanCr.includes('/')) {
                const parts = cleanCr.split('/');
                if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1]) || parts[1] == 0) {
                    return 'CR must be a valid number or fraction (e.g., 5, 0.5, 1/4)';
                }
                crNum = parseFloat(parts[0]) / parseFloat(parts[1]);
            } else {
                crNum = parseFloat(cleanCr);
            }

            if (isNaN(crNum)) {
                return 'CR must be a valid number or fraction (e.g., 5, 0.5, 1/4)';
            }

            if (crNum < 0 || crNum > 30) {
                return 'CR must be between 0 and 30';
            }
        } catch (e) {
            return 'CR must be a valid number or fraction (e.g., 5, 0.5, 1/4)';
        }

        return null;
    }

    /**
     * Validate that monster has at least one action
     * @param {Array} actions - Array of action objects
     * @returns {string|null} Error message or null if valid
     */
    function validateHasActions(actions) {
        if (!actions || actions.length === 0) {
            return 'Monster must have at least one action';
        }

        // Check if at least one action has a name
        const hasValidAction = actions.some(action => action.name && action.name.trim());
        if (!hasValidAction) {
            return 'Monster must have at least one action with a name';
        }

        return null;
    }

    /**
     * Validate complete monster state
     * @param {Object} state - Monster state object
     * @returns {Object} {valid: boolean, errors: string[]}
     */
    function validateMonster(state) {
        const errors = [];

        // Required fields
        const requiredError = validateRequired(state.title, 'Title');
        if (requiredError) errors.push(requiredError);

        const crError = validateChallengeRating(state.cr);
        if (crError) errors.push(crError);

        const categoryError = validateRequired(state.category, 'Category');
        if (categoryError) errors.push(categoryError);

        const creatorError = validateRequired(state.creator, 'Creator');
        if (creatorError) errors.push(creatorError);

        // Ability scores
        const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
        abilities.forEach(ability => {
            const abilityError = validateAbilityScore(
                state[ability], 
                ability.toUpperCase()
            );
            if (abilityError) errors.push(abilityError);
        });

        // Actions requirement
        const actionsError = validateHasActions(state.actions);
        if (actionsError) errors.push(actionsError);

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Validate a single ability/action item
     * @param {Object} item - Item with name and description
     * @param {string} itemType - Type of item (for error messages)
     * @returns {string|null} Error message or null if valid
     */
    function validateItem(item, itemType) {
        if (!item) {
            return `${itemType} is missing`;
        }

        if (!item.name || !item.name.trim()) {
            return `${itemType} must have a name`;
        }

        if (!item.description || !item.description.trim()) {
            return `${itemType} "${item.name}" must have a description`;
        }

        return null;
    }

    /**
     * Validate array of items (traits, actions, etc.)
     * @param {Array} items - Array of items to validate
     * @param {string} itemType - Type of items (for error messages)
     * @returns {string[]} Array of error messages
     */
    function validateItems(items, itemType) {
        const errors = [];
        
        if (!items || !Array.isArray(items)) {
            return errors;
        }

        items.forEach((item, index) => {
            // Skip empty items (both name and description empty)
            if ((!item.name || !item.name.trim()) && 
                (!item.description || !item.description.trim())) {
                return;
            }

            // Validate items that have at least some content
            const error = validateItem(item, `${itemType} #${index + 1}`);
            if (error) errors.push(error);
        });

        return errors;
    }

    /**
     * Get validation warnings (non-critical issues)
     * @param {Object} state - Monster state object
     * @returns {string[]} Array of warning messages
     */
    function getWarnings(state) {
        const warnings = [];

        // Warn if no description
        if (!state.description || !state.description.trim()) {
            warnings.push('Consider adding a lore description for context');
        }

        // Warn if no traits
        if (!state.traits || state.traits.length === 0 || 
            !state.traits.some(t => t.name && t.name.trim())) {
            warnings.push('Most monsters have at least one trait');
        }

        // Warn about incomplete items in arrays
        const sections = [
            {items: state.traits, name: 'Traits'},
            {items: state.actions, name: 'Actions'},
            {items: state.bonusActions, name: 'Bonus Actions'},
            {items: state.reactions, name: 'Reactions'},
            {items: state.legendaryActions, name: 'Legendary Actions'}
        ];

        sections.forEach(section => {
            if (!section.items) return;
            
            section.items.forEach((item, index) => {
                if ((item.name && item.name.trim()) && 
                    (!item.description || !item.description.trim())) {
                    warnings.push(
                        `${section.name} #${index + 1} "${item.name}" has no description`
                    );
                }
            });
        });

        return warnings;
    }

    // Public API
    return {
        validateMonster,
        validateRequired,
        validateAbilityScore,
        validateChallengeRating,
        validateHasActions,
        validateItem,
        validateItems,
        getWarnings
    };

})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MonsterValidator;
}