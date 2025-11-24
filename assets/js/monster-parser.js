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
        // Captures text between the first Header (## Title) and the first horizontal rule (___)
        const loreMatch = content.match(/## [^\r\n]+[\r\n]+[\r\n]+([\s\S]*?)[\r\n]+___/);
        return loreMatch ? loreMatch[1].trim() : '';
    }

    /**
     * Splits the content after the frontmatter/lore into the Blockquoted Statblock
     * and any Additional Info (Markdown) that follows it.
     */
    function splitStatBlockAndInfo(fullBody) {
        const lines = fullBody.split('\n');
        let statBlockLines = [];
        let additionalInfoLines = [];
        let pastStatBlock = false;
        let foundFirstDivider = false;

        for (let line of lines) {
            const trimmed = line.trim();

            // Handle horizontal rules (___)
            if (trimmed === '___') {
                if (!foundFirstDivider) {
                   foundFirstDivider = true; // Consumes the first divider (start of statblock)
                   continue;
                }
                // A second divider explicitly marks the end of the statblock
                pastStatBlock = true;
            }

            if (pastStatBlock) {
                additionalInfoLines.push(line);
                continue;
            }

            // Heuristic: If we hit a non-quoted line that has content, we've likely left the blockquote
            if (!line.startsWith('>') && trimmed !== '') {
                 pastStatBlock = true;
                 additionalInfoLines.push(line);
            } else {
                 statBlockLines.push(line);
            }
        }

        return {
            // Join lines and strip the blockquote '>' markers
            statBlock: statBlockLines.join('\n').replace(/^>\s*/gm, ''),
            additionalInfo: additionalInfoLines.join('\n').trim()
        };
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
        // Look for **StatName** followed by content.
        // Captures content until:
        // 1. The next bold header (e.g., **HP)
        // 2. A newline (if stats are on separate lines)
        // 3. A pipe (table start)
        // 4. End of string
        const pattern = new RegExp(`\\*\\*${statName}\\*\\*\\s+([\\s\\S]+?)(?=\\s*\\*\\*|\\n|\\s*\\||$)`);
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
        // Regex finds header "### Traits" followed by content until the next header or end
        const sectionPattern = new RegExp(`### ${sectionName}\\n+([\\s\\S]*?)(?=\\n###|$)`);
        const sectionMatch = blockContent.match(sectionPattern);
        
        if (!sectionMatch) return abilities;
        
        const sectionContent = sectionMatch[1];
        // Regex finds "***Name.*** Description"
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
        
        // Extract the intro description (text before the first action)
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
            additionalInfo: ''
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
        
        // Find the main body content (everything after the first separation rule)
        const bodyMatch = markdownContent.match(/___[\s\S]*$/);
        if (!bodyMatch) {
            console.error('No stat block found');
            return state;
        }

        // Split body into the clean statblock and any additional info
        const { statBlock, additionalInfo } = splitStatBlockAndInfo(bodyMatch[0]);

        // Assign Additional Info
        state.additionalInfo = additionalInfo;

        // Parse Statblock Fields
        const abilities = parseAbilityScores(statBlock);
        Object.assign(state, abilities);

        state.ac = parseStat(statBlock, 'AC') || parseStat(statBlock, 'Armor Class');
        state.hp = parseStat(statBlock, 'HP') || parseStat(statBlock, 'Hit Points');
        state.speed = parseStat(statBlock, 'Speed');
        
        const initText = parseStat(statBlock, 'Initiative');
        state.initiativeProficiency = deduceInitiativeProficiency(initText, state.dex, state.cr);

        const saves = parseSavingThrows(statBlock);
        Object.assign(state, saves);

        state.skills = parseStat(statBlock, 'Skills');
        state.senses = parseStat(statBlock, 'Senses');
        state.languages = parseStat(statBlock, 'Languages');
        state.conditionImmunities = parseStat(statBlock, 'Condition Immunities');
        state.damageResistances = parseStat(statBlock, 'Damage Resistances');
        state.damageImmunities = parseStat(statBlock, 'Damage Immunities');

        state.traits = parseAbilitySection(statBlock, 'Traits');
        state.actions = parseAbilitySection(statBlock, 'Actions');
        state.bonusActions = parseAbilitySection(statBlock, 'Bonus Actions');
        state.reactions = parseAbilitySection(statBlock, 'Reactions');

        const legendary = parseLegendaryActions(statBlock);
        state.legendaryActions = legendary.actions;
        state.legendaryActionDescription = legendary.description;

        state.lairActions = parseTextBlock(statBlock, 'Lair Actions');
        state.regionalEffects = parseTextBlock(statBlock, 'Regional Effects');

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