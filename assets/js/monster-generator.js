// Monster Generator Module
// Converts monster state object to markdown format
const MonsterGenerator = (function() {
    'use strict';

    // Regex for replacing newlines
    const NEWLINE_REGEX = /\n/g;

    /**
     * Generate YAML frontmatter
     * @param {Object} state - Monster state
     * @returns {string} YAML frontmatter block
     */
    function generateFrontMatter(state) {
        let yaml = `---
layout: ${state.layout}
title: ${state.title}
cr: ${state.cr}
size: ${state.size}
type: ${state.type}
alignment: ${state.alignment}
category: ${state.category}
creator: ${state.creator}`;

        if (state.image) {
            yaml += `\nimage: ${state.image}`;
        }
        if (state.image_credit) {
            yaml += `\nimage_credit: ${state.image_credit}`;
        }

        yaml += `\n---\n\n`;
        return yaml;
    }

    /**
     * Generate lore/description section
     * @param {Object} state - Monster state
     * @returns {string} Lore section markdown
     */
/**
 * Generate lore/description section
 * @param {Object} state - Monster state
 * @returns {string} Lore section markdown
 */
    function generateLoreSection(state) {
        // If there's no description, return an empty string
        if (!state.description || !state.description.trim()) {
            return '';
        }

        let lore = '';

        // 1. Add the main title header for the lore section
        // The original markdown uses `## Title\n\n`
        lore += `## ${state.title}\n\n`;

        // 2. Add the description content (which includes the custom section, table, and other dividers)
        // We use trim() to remove any extraneous whitespace captured by the parser.
        lore += state.description.trim();

        // 3. Ensure a double newline separates the end of the description block from the '___' stat block delimiter
        // This allows tables at the end of the description to maintain their proper markdown spacing.
        // We add a final double newline. The main `generateMarkdown` function will then add the '___'.
        lore += '\n\n'; 
        
        return lore;
    }

    /**
     * Generate ability score table (2024 D&D format with MOD and SAVE columns)
     * @param {Object} abilities - Calculated abilities from MonsterCalculator
     * @returns {string} Ability score table markdown
     */
    function generateAbilityTable(abilities) {
        let table = `> |     |     | MOD | SAVE |     |     | MOD | SAVE |     |     | MOD | SAVE |\n`;
        table += `> |:--- |:---:|:---:|:----:|:--- |:---:|:---:|:----:|:--- |:---:|:---:|:----:|\n`;
        table += `> | **Str** | ${abilities.str.score} | ${abilities.str.formattedMod} | ${abilities.str.save} | `;
        table += `**Dex** | ${abilities.dex.score} | ${abilities.dex.formattedMod} | ${abilities.dex.save} | `;
        table += `**Con** | ${abilities.con.score} | ${abilities.con.formattedMod} | ${abilities.con.save} |\n`;
        table += `> | **Int** | ${abilities.int.score} | ${abilities.int.formattedMod} | ${abilities.int.save} | `;
        table += `**Wis** | ${abilities.wis.score} | ${abilities.wis.formattedMod} | ${abilities.wis.save} | `;
        table += `**Cha** | ${abilities.cha.score} | ${abilities.cha.formattedMod} | ${abilities.cha.save} |\n>\n`;
        return table;
    }

    /**
     * Generate saving throws line
     * @param {Object} abilities - Calculated abilities from MonsterCalculator
     * @returns {string} Saving throws line or empty string
     */
    function generateSavingThrows(abilities) {
        const saveOverrides = [];
        const abilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
        
        abilityKeys.forEach(key => {
            if (abilities[key].hasOverride) {
                const abilityName = key.charAt(0).toUpperCase() + key.slice(1);
                saveOverrides.push(`${abilityName} ${abilities[key].saveOverride}`);
            }
        });

        if (saveOverrides.length > 0) {
            return `> **Saving Throws** ${saveOverrides.join(', ')}  \n`;
        }
        return '';
    }

    /**
     * Generate optional statistics section
     * @param {Object} state - Monster state
     * @returns {string} Optional stats markdown
     */
    function generateOptionalStats(state) {
        let stats = '';
        
        if (state.skills) {
            stats += `> **Skills** ${state.skills}  \n`;
        }
        if (state.damageResistances) {
            stats += `> **Damage Resistances** ${state.damageResistances}  \n`;
        }
        if (state.damageImmunities) {
            stats += `> **Damage Immunities** ${state.damageImmunities}  \n`;
        }
        if (state.conditionImmunities) {
            stats += `> **Condition Immunities** ${state.conditionImmunities}  \n`;
        }
        if (state.senses) {
            stats += `> **Senses** ${state.senses}  \n`;
        }
        if (state.languages) {
            stats += `> **Languages** ${state.languages}  \n`;
        }
        
        return stats;
    }

    /**
     * Format description text for stat block (handles newlines)
     * @param {string} description - Item description
     * @returns {string} Formatted description
     */
    function formatDescription(description) {
        if (!description) return '';
        return description.replace(NEWLINE_REGEX, '\n> ');
    }

    /**
     * Generate an ability section (Traits, Actions, etc.)
     * @param {Array} items - Array of {name, description} objects
     * @param {string} sectionTitle - Section title (e.g., "Traits")
     * @returns {string} Section markdown or empty string
     */
    function generateAbilitySection(items, sectionTitle) {
        if (!items || items.length === 0) {
            return '';
        }

        // Filter out empty items
        const validItems = items.filter(item => 
            item.name && item.name.trim() && 
            item.description && item.description.trim()
        );

        if (validItems.length === 0) {
            return '';
        }

        let section = `> ### ${sectionTitle}\n>\n`;
        
        validItems.forEach(item => {
            const formattedDesc = formatDescription(item.description);
            section += `> ***${item.name}.*** ${formattedDesc}\n>\n`;
        });

        return section;
    }

    /**
     * Generate legendary actions section
     * @param {Object} state - Monster state
     * @returns {string} Legendary actions markdown or empty string
     */
    function generateLegendaryActions(state) {
        if (!state.legendaryActions || state.legendaryActions.length === 0) {
            return '';
        }

        const validActions = state.legendaryActions.filter(action =>
            action.name && action.name.trim() &&
            action.description && action.description.trim()
        );

        if (validActions.length === 0) {
            return '';
        }

        const defaultDesc = "The creature can take 3 legendary actions, choosing from the options below. Only one legendary action can be used at a time and only at the end of another creature's turn. The creature regains spent legendary actions at the start of its turn.";
        const legendaryDesc = state.legendaryActionDescription.trim() || defaultDesc;

        let section = `> ### Legendary Actions\n>\n`;
        section += `> ${formatDescription(legendaryDesc)}\n>\n`;

        validActions.forEach(action => {
            const formattedDesc = formatDescription(action.description);
            section += `> ***${action.name}.*** ${formattedDesc}\n>\n`;
        });

        return section;
    }

    /**
     * Generate text block section (Lair Actions, Regional Effects)
     * @param {string} content - Text content
     * @param {string} sectionTitle - Section title
     * @returns {string} Section markdown or empty string
     */
    function generateTextBlock(content, sectionTitle) {
        if (!content || !content.trim()) {
            return '';
        }

        let section = `> ### ${sectionTitle}\n>\n`;
        
        // Format each line with blockquote marker
        const lines = content.split(NEWLINE_REGEX);
        const formattedLines = lines.map(line => 
            line.trim() ? `> ${line}` : '>'
        );
        
        section += formattedLines.join('\n') + '\n>\n';
        return section;
    }

    /**
     * Generate complete markdown document
     * @param {Object} state - Monster state
     * @param {Object} abilities - Calculated abilities from MonsterCalculator
     * @returns {string} Complete markdown document
     */
    function generateMarkdown(state, abilities) {
        let markdown = '';

        // Frontmatter
        markdown += generateFrontMatter(state);

        // Lore description
        markdown += generateLoreSection(state);

        // Stat block header
        markdown += `___\n`;
        markdown += `> ## ${state.title}\n`;
        markdown += `> *${state.size} ${state.type.toLowerCase()}, ${state.alignment.toLowerCase()}*\n>\n`;

        // Basic combat stats
        const basicStats = [];
        if (state.ac) basicStats.push(`**Armor Class** ${state.ac}`);
        if (state.hp) basicStats.push(`**Hit Points** ${state.hp}`);
        if (state.speed) basicStats.push(`**Speed** ${state.speed}`);
        
        if (basicStats.length > 0) {
            markdown += `> ${basicStats.join('  \n> ')}\n>\n`;
        }

        // Ability scores table
        markdown += generateAbilityTable(abilities);

        // Saving throws (only if there are overrides)
        markdown += generateSavingThrows(abilities);

        // Optional statistics
        markdown += generateOptionalStats(state);

        // Challenge rating and proficiency
        const profBonus = MonsterCalculator.getProficiencyBonus(state.cr);
        markdown += `> **Challenge** ${state.cr} (1,800 XP) **Proficiency Bonus** +${profBonus}\n>\n`;

        // Ability sections
        markdown += generateAbilitySection(state.traits, 'Traits');
        markdown += generateAbilitySection(state.actions, 'Actions');
        markdown += generateAbilitySection(state.bonusActions, 'Bonus Actions');
        markdown += generateAbilitySection(state.reactions, 'Reactions');

        // Legendary actions
        markdown += generateLegendaryActions(state);

        // Text blocks
        markdown += generateTextBlock(state.lairActions, 'Lair Actions');
        markdown += generateTextBlock(state.regionalEffects, 'Regional Effects');

        return markdown;
    }

    /**
     * Generate filename from monster title
     * @param {string} title - Monster title
     * @returns {string} Sanitized filename
     */
    function generateFilename(title) {
        if (!title || !title.trim()) {
            return 'statblock.md';
        }

        return title
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')  // Remove special chars
            .replace(/[\s-]+/g, '-')   // Replace spaces/hyphens with single hyphen
            .replace(/^-+|-+$/g, '')   // Remove leading/trailing hyphens
            + '.md';
    }

    // Public API
    return {
        generateMarkdown,
        generateFilename,
        // Export individual generators for testing/flexibility
        generateFrontMatter,
        generateLoreSection,
        generateAbilityTable,
        generateSavingThrows,
        generateOptionalStats,
        generateAbilitySection,
        generateLegendaryActions,
        generateTextBlock
    };

})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MonsterGenerator;
}