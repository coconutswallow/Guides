// Monster Parser Module
// Handles parsing markdown stat blocks into structured data
const MonsterParser = (function() {
    'use strict';

    function parseFrontMatter(content) {
        const frontMatterMatch = content.match(/^---[\r\n]+([\s\S]*?)[\r\n]+---/);
        if (!frontMatterMatch) throw new Error("No valid YAML frontmatter found");
        const frontMatter = {};
        const lines = frontMatterMatch[1].split(/\r?\n/);
        lines.forEach(line => {
            const colonIndex = line.indexOf(':');
            if (colonIndex === -1) return;
            const key = line.substring(0, colonIndex).trim();
            const value = line.substring(colonIndex + 1).trim();
            frontMatter[key] = value.replace(/^['"]|['"]$/g, '');
        });
        return frontMatter;
    }

    function parseLoreDescription(content) {
        const loreMatch = content.match(/## [^\r\n]+[\r\n]+[\r\n]+([\s\S]*?)[\r\n]+___/);
        return loreMatch ? loreMatch[1].trim() : '';
    }

    function parseAbilityScores(blockContent) {
        // Try simple format first
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
        // Try extended format (with bold headers)
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
        return { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    }

    function parseStat(blockContent, statName) {
        // Regex looks for **StatName** followed by content, stopping at the next double-asterisk, table start, or double newline
        const pattern = new RegExp(`\\*\\*${statName}\\*\\*\\s+(.+?)(?=\\s*\\*\\*|\\n{2,}|\\s*\\||$)`, 's');
        const match = blockContent.match(pattern);
        return match ? match[1].trim() : '';
    }

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

    function parseAbilitySection(blockContent, sectionName) {
        const abilities = [];
        const sectionPattern = new RegExp(`### ${sectionName}\\n+([\\s\\S]*?)(?=\\n###|$)`);
        const sectionMatch = blockContent.match(sectionPattern);
        if (!sectionMatch) return abilities;
        const sectionContent = sectionMatch[1];
        const abilityPattern = /\*\*\*([^.]+)\.\*\*\*\s*([\s\S]*?)(?=\n\*\*\*|\n###|$)/g;
        let match;
        while ((match = abilityPattern.exec(sectionContent)) !== null) {
            const description = match[2].trim().replace(/^\n+/, '').replace(/\n+$/, '');
            if (description) {
                abilities.push({
                    name: match[1].trim(),
                    description: description
                });
            }
        }
        return abilities;
    }

    function parseLegendaryActions(blockContent) {
        const result = { description: '', actions: [] };
        const sectionMatch = blockContent.match(/### Legendary Actions\n+([\s\S]*?)(?=\n+###|$)/);
        if (!sectionMatch) return result;
        const legendaryContent = sectionMatch[1];
        let actionSearchContent = legendaryContent;
        const descMatch = legendaryContent.match(/^([\s\S]*?)(?=\n+\*\*\*)/);
        if (descMatch) {
            const desc = descMatch[1].trim();
            if (desc) result.description = desc;
            actionSearchContent = legendaryContent.substring(descMatch[0].length).trim();
        }
        const actionPattern = /\*\*\*([^.]+)\.\*\*\*\s*([\s\S]*?)(?=\*\*\*|###|$)/g;
        let match;
        while ((match = actionPattern.exec(actionSearchContent)) !== null) {
            result.actions.push({
                name: match[1].trim(),
                description: match[2].trim()
            });
        }
        return result;
    }

    function parseTextBlock(blockContent, sectionName) {
        const pattern = new RegExp(`### ${sectionName}\\n+([\\s\\S]*?)(?=\\n+###|$)`);
        const match = blockContent.match(pattern);
        return match ? match[1].trim() : '';
    }

    function deduceInitiativeProficiency(initText, dex, cr) {
        if (!initText) return '0';
        const match = initText.match(/([+-]\d+)/);
        if (!match) return '0';
        const totalMod = parseInt(match[1]);
        const dexMod = Math.floor((dex - 10) / 2);
        const pb = MonsterCalculator.getProficiencyBonus(cr);
        if (totalMod === dexMod) return '0';
        if (totalMod === dexMod + pb) return '1';
        if (totalMod === dexMod + (pb * 2)) return '2';
        return '0';
    }

    function parseMonster(markdownContent) {
        const state = {
            layout: 'statblock',
            title: '',
            cr: '',
            size: 'Medium',
            type: 'Beast',
            alignment: 'Unaligned',
            category: '2014 Fair Game',
            creator: '',
            image: '',
            image_credit: '',
            description: '',
            ac: '',
            hp: '',
            speed: '',
            initiativeProficiency: '0',
            str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
            strSave: '', dexSave: '', conSave: '',
            intSave: '', wisSave: '', chaSave: '',
            skills: '',
            damageResistances: '',
            damageImmunities: '',
            conditionImmunities: '',
            senses: '',
            languages: '',
            traits: [],
            actions: [],
            reactions: [],
            bonusActions: [],
            legendaryActions: [],
            legendaryActionDescription: '',
            lairActions: '',
            regionalEffects: '',
            additionalInfo: '' // NEW FIELD
        };

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

        state.description = parseLoreDescription(markdownContent);
        
        // Find the main stat block (after ___)
        const bodyMatch = markdownContent.match(/___[\s\S]*$/);
        if (!bodyMatch) {
            console.error('No stat block found');
            return state;
        }

        // Logic to separate the Blockquoted Statblock from any Additional Info below it
        const fullBody = bodyMatch[0];
        
        // We look for where the lines stop starting with '>'
        const lines = fullBody.split('\n');
        let statBlockLines = [];
        let additionalInfoLines = [];
        let foundDivider = false;
        let pastStatBlock = false;

        for (let line of lines) {
            if (line.trim() === '___') {
                if (!foundDivider) {
                   foundDivider = true; // This is the first divider
                   continue;
                } else {
                   // A second divider usually implies the end of the statblock section if users use it
                   pastStatBlock = true;
                }
            }

            if (pastStatBlock) {
                additionalInfoLines.push(line);
                continue;
            }

            // Check if line is part of the statblock (starts with >)
            // Or is empty inside the statblock
            if (line.startsWith('>') || (line.trim() === '' && !pastStatBlock)) {
                 // However, if we hit a non-quoted line that has content, the statblock is likely over
                 if (!line.startsWith('>') && line.trim() !== '') {
                     pastStatBlock = true;
                     additionalInfoLines.push(line);
                 } else {
                     statBlockLines.push(line);
                 }
            } else {
                pastStatBlock = true;
                additionalInfoLines.push(line);
            }
        }

        // Join statblock lines and strip '>'
        let blockContent = statBlockLines.join('\n').replace(/^>\s*/gm, '');

        // Join additional info lines
        state.additionalInfo = additionalInfoLines.join('\n').trim();

        // --- Parsing the specific statblock fields ---
        const abilities = parseAbilityScores(blockContent);
        Object.assign(state, abilities);

        state.ac = parseStat(blockContent, 'AC') || parseStat(blockContent, 'Armor Class');
        state.hp = parseStat(blockContent, 'HP') || parseStat(blockContent, 'Hit Points');
        state.speed = parseStat(blockContent, 'Speed');
        
        const initText = parseStat(blockContent, 'Initiative');
        state.initiativeProficiency = deduceInitiativeProficiency(initText, state.dex, state.cr);

        const saves = parseSavingThrows(blockContent);
        Object.assign(state, saves);

        state.skills = parseStat(blockContent, 'Skills');
        state.senses = parseStat(blockContent, 'Senses');
        state.languages = parseStat(blockContent, 'Languages');
        state.conditionImmunities = parseStat(blockContent, 'Condition Immunities');
        state.damageResistances = parseStat(blockContent, 'Damage Resistances');
        state.damageImmunities = parseStat(blockContent, 'Damage Immunities');

        state.traits = parseAbilitySection(blockContent, 'Traits');
        state.actions = parseAbilitySection(blockContent, 'Actions');
        state.bonusActions = parseAbilitySection(blockContent, 'Bonus Actions');
        state.reactions = parseAbilitySection(blockContent, 'Reactions');

        const legendary = parseLegendaryActions(blockContent);
        state.legendaryActions = legendary.actions;
        state.legendaryActionDescription = legendary.description;

        state.lairActions = parseTextBlock(blockContent, 'Lair Actions');
        state.regionalEffects = parseTextBlock(blockContent, 'Regional Effects');

        return state;
    }

    return {
        parseMonster,
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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MonsterParser;
}