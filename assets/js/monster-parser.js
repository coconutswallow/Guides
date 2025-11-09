// Monster Parser Module
// Handles parsing markdown stat blocks into structured data
const MonsterParser = (function() {
    'use strict';

    /**
     * Parse YAML frontmatter from markdown content
     * @param {string} content - Full markdown content
     * @returns {Object} Parsed frontmatter key-value pairs
     */
    function parseFrontMatter(content) {
        const frontMatterMatch = content.match(/^---[\r\n]+([\s\S]*?)[\r\n]+---/);
        if (!frontMatterMatch) {
            throw new Error("No valid YAML frontmatter found");
        }

        const frontMatter = {};
        const lines = frontMatterMatch[1].split(/\r?\n/);
        
        lines.forEach(line => {
            const colonIndex = line.indexOf(':');
            if (colonIndex === -1) return;
            
            const key = line.substring(0, colonIndex).trim();
            const value = line.substring(colonIndex + 1).trim();
            
            // Remove surrounding quotes
            frontMatter[key] = value.replace(/^['"]|['"]$/g, '');
        });

        return frontMatter;
    }

    /**
     * Parse lore/description section between title and stat block
     * @param {string} content - Full markdown content
     * @returns {string} Lore description text
     */
    function parseLoreDescription(content) {
        const loreMatch = content.match(/## [^\r\n]+[\r\n]+[\r\n]+([\s\S]*?)[\r\n]+___/);
        return loreMatch ? loreMatch[1].trim() : '';
    }

    /**
     * Parse ability scores from stat block table
     * Supports both simple format and extended MOD/SAVE format
     * @param {string} blockContent - Stat block content (with blockquotes removed)
     * @returns {Object} Ability scores {str, dex, con, int, wis, cha}
     */
    function parseAbilityScores(blockContent) {
        // Try simple format first: | 21 (+5) | 12 (+1) | ...
        const simpleMatch = blockContent.match(
            /\|\s*STR\s*\|\s*DEX\s*\|\s*CON\s*\|\s*INT\s*\|\s*WIS\s*\|\s*CHA\s*\|[\s\S]*?\|\s*(\d+)\s*\([^)]+\)\s*\|\s*(\d+)\s*\([^)]+\)\s*\|\s*(\d+)\s*\([^)]+\)\s*\|\s*(\d+)\s*\([^)]+\)\s*\|\s*(\d+)\s*\([^)]+\)\s*\|\s*(\d+)\s*\([^)]+\)\s*\|/
        );

        if (simpleMatch) {
            return {
                str: parseInt(simpleMatch[1]),
                dex: parseInt(simpleMatch[2]),
                con: parseInt(simpleMatch[3]),
                int: parseInt(simpleMatch[4]),
                wis: parseInt(simpleMatch[5]),
                cha: parseInt(simpleMatch[6])
            };
        }

        // Try extended format with MOD/SAVE columns
        // This is more complex but handles the template format
        const extendedMatch = blockContent.match(
            /\|\s*\*\*Str\*\*\s*\|\s*(\d+)\s*\|[\s\S]*?\|\s*\*\*Dex\*\*\s*\|\s*(\d+)\s*\|[\s\S]*?\|\s*\*\*Con\*\*\s*\|\s*(\d+)\s*\|[\s\S]*?\|\s*\*\*Int\*\*\s*\|\s*(\d+)\s*\|[\s\S]*?\|\s*\*\*Wis\*\*\s*\|\s*(\d+)\s*\|[\s\S]*?\|\s*\*\*Cha\*\*\s*\|\s*(\d+)\s*\|/
        );

        if (extendedMatch) {
            return {
                str: parseInt(extendedMatch[1]),
                dex: parseInt(extendedMatch[2]),
                con: parseInt(extendedMatch[3]),
                int: parseInt(extendedMatch[4]),
                wis: parseInt(extendedMatch[5]),
                cha: parseInt(extendedMatch[6])
            };
        }

        // Default to 10 if no match
        return { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    }

    /**
     * Parse a single stat line (e.g., "**Armor Class** 13 (natural armor)")
     * @param {string} blockContent - Stat block content
     * @param {string} statName - Name of the stat to find
     * @returns {string} Stat value or empty string
     */
    function parseStat(blockContent, statName) {
        const pattern = new RegExp(`\\*\\*${statName}\\*\\*\\s+(.+?)(?=\\s*\\*\\*|\\n{2,}|\\s*\\||$)`, 's');
        const match = blockContent.match(pattern);
        return match ? match[1].trim() : '';
    }

    /**
     * Parse saving throw overrides
     * @param {string} blockContent - Stat block content
     * @returns {Object} Save overrides {strSave, dexSave, etc.}
     */
    function parseSavingThrows(blockContent) {
        const saves = {};
        const savingThrowsMatch = blockContent.match(/\*\*Saving Throws\*\*\s+(.+)/);
        
        if (!savingThrowsMatch) return saves;

        const saveText = savingThrowsMatch[1].trim();
        const abilities = ['Str', 'Dex', 'Con', 'Int', 'Wis', 'Cha'];
        
        abilities.forEach(ability => {
            const regex = new RegExp(`${ability}\\s+([+\\-]\\d+)`, 'i');
            const match = saveText.match(regex);
            if (match) {
                const key = ability.toLowerCase() + 'Save';
                saves[key] = match[1];
            }
        });

        return saves;
    }

    /**
     * Parse abilities (Traits, Actions, Reactions, etc.) from a section
     * Format: ***Name.*** Description
     * @param {string} blockContent - Stat block content
     * @param {string} sectionName - Name of section (e.g., "Traits")
     * @returns {Array} Array of {name, description} objects
     */
    function parseAbilitySection(blockContent, sectionName) {
        const abilities = [];
        const sectionPattern = new RegExp(`### ${sectionName}\\n+([\\s\\S]*?)(?=\\n+###|$)`);
        const sectionMatch = blockContent.match(sectionPattern);
        
        if (!sectionMatch) return abilities;

        const sectionContent = sectionMatch[1];
        
        // Match pattern: ***Name.*** Description
        const abilityPattern = /\*\*\*([^.]+)\.\*\*\*\s+([\s\S]*?)(?=\n+\*\*\*|\n+###|$)/g;
        
        let match;
        while ((match = abilityPattern.exec(sectionContent)) !== null) {
            abilities.push({
                name: match[1].trim(),
                description: match[2].trim().replace(/^\n+/, '').replace(/\n+$/, '')
            });
        }
        
        return abilities;
    }

    /**
     * Parse Legendary Actions section (includes description + abilities)
     * @param {string} blockContent - Stat block content
     * @returns {Object} {description, actions: [{name, description}]}
     */
    function parseLegendaryActions(blockContent) {
        const result = {
            description: '',
            actions: []
        };

        const sectionMatch = blockContent.match(/### Legendary Actions\n+([\s\S]*?)(?=\n+###|$)/);
        if (!sectionMatch) return result;

        const legendaryContent = sectionMatch[1];
        
        // Extract description (everything before first ***)
        const descMatch = legendaryContent.match(/^([\s\S]*?)(?=\n+\*\*\*)/);
        if (descMatch) {
            const desc = descMatch[1].trim();
            // Only store non-default descriptions
            if (desc && !desc.includes('The creature can take 3 legendary actions')) {
                result.description = desc;
            }
        }
        
        // Parse individual legendary actions
        result.actions = parseAbilitySection(blockContent, 'Legendary Actions');
        
        return result;
    }

    /**
     * Parse a text block section (Lair Actions, Regional Effects)
     * @param {string} blockContent - Stat block content
     * @param {string} sectionName - Name of section
     * @returns {string} Section content
     */
    function parseTextBlock(blockContent, sectionName) {
        const pattern = new RegExp(`### ${sectionName}\\n+([\\s\\S]*?)(?=\\n+###|$)`);
        const match = blockContent.match(pattern);
        return match ? match[1].trim() : '';
    }

    /**
     * Main parse function - converts markdown to monster state object
     * @param {string} markdownContent - Complete markdown file content
     * @returns {Object} Monster state object matching the generator's state structure
     */
    function parseMonster(markdownContent) {
        const state = {
            // Layout and identification
            layout: 'statblock',
            title: '',
            cr: '',
            size: 'Medium',
            type: 'Beast',
            alignment: 'Unaligned',
            category: '2014 Fair Game',
            creator: '',
            
            // Visual elements
            image: '',
            image_credit: '',
            description: '',
            
            // Core combat statistics
            ac: '',
            hp: '',
            speed: '',
            
            // Ability scores
            str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
            
            // Save overrides
            strSave: '', dexSave: '', conSave: '',
            intSave: '', wisSave: '', chaSave: '',
            
            // Additional statistics
            skills: '',
            damageResistances: '',
            damageImmunities: '',
            conditionImmunities: '',
            senses: '',
            languages: '',
            
            // Monster abilities
            traits: [],
            actions: [],
            reactions: [],
            bonusActions: [],
            legendaryActions: [],
            legendaryActionDescription: '',
            
            // Text blocks
            lairActions: '',
            regionalEffects: ''
        };

        // Parse frontmatter
        try {
            const frontMatter = parseFrontMatter(markdownContent);
            Object.keys(frontMatter).forEach(key => {
                if (key in state) {
                    state[key] = frontMatter[key];
                }
            });
        } catch (e) {
            console.error('Error parsing frontmatter:', e.message);
            return null;
        }

        // Parse lore description
        state.description = parseLoreDescription(markdownContent);

        // Extract stat block body (everything after ___)
        const bodyMatch = markdownContent.match(/___[\s\S]*$/);
        if (!bodyMatch) {
            console.error('No stat block found');
            return state;
        }

        // Remove blockquote markers for easier parsing
        let blockContent = bodyMatch[0].replace(/^>\s*/gm, '');

        // Parse ability scores
        const abilities = parseAbilityScores(blockContent);
        Object.assign(state, abilities);

        // Parse basic stats
        state.ac = parseStat(blockContent, 'Armor Class');
        state.hp = parseStat(blockContent, 'Hit Points');
        state.speed = parseStat(blockContent, 'Speed');

        // Parse saving throws
        const saves = parseSavingThrows(blockContent);
        Object.assign(state, saves);

        // Parse optional statistics
        state.skills = parseStat(blockContent, 'Skills');
        state.senses = parseStat(blockContent, 'Senses');
        state.languages = parseStat(blockContent, 'Languages');
        state.conditionImmunities = parseStat(blockContent, 'Condition Immunities');
        state.damageResistances = parseStat(blockContent, 'Damage Resistances');
        state.damageImmunities = parseStat(blockContent, 'Damage Immunities');

        // Parse ability sections
        state.traits = parseAbilitySection(blockContent, 'Traits');
        state.actions = parseAbilitySection(blockContent, 'Actions');
        state.bonusActions = parseAbilitySection(blockContent, 'Bonus Actions');
        state.reactions = parseAbilitySection(blockContent, 'Reactions');

        // Parse legendary actions
        const legendary = parseLegendaryActions(blockContent);
        state.legendaryActions = legendary.actions;
        state.legendaryActionDescription = legendary.description;

        // Parse text blocks
        state.lairActions = parseTextBlock(blockContent, 'Lair Actions');
        state.regionalEffects = parseTextBlock(blockContent, 'Regional Effects');

        return state;
    }

    // Public API
    return {
        parseMonster,
        // Export individual parsers for testing/flexibility
        parseFrontMatter,
        parseLoreDescription,
        parseAbilityScores,
        parseStat,
        parseSavingThrows,
        parseAbilitySection,
        parseLegendaryActions,
        parseTextBlock
    };

})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MonsterParser;
}