// Monster Generator Module
// Converts monster state object to markdown format
const MonsterGenerator = (function() {
    'use strict';

    const NEWLINE_REGEX = /\n/g;

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

    function generateLoreSection(state) {
        if (!state.description || !state.description.trim()) {
            return '';
        }
        let lore = '';
        lore += `## ${state.title}\n\n`;
        lore += state.description.trim();
        lore += '\n\n'; 
        return lore;
    }

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

    function generateOptionalStats(state) {
        let stats = '';
        if (state.skills) stats += `> **Skills** ${state.skills}  \n`;
        if (state.damageResistances) stats += `> **Damage Resistances** ${state.damageResistances}  \n`;
        if (state.damageImmunities) stats += `> **Damage Immunities** ${state.damageImmunities}  \n`;
        if (state.conditionImmunities) stats += `> **Condition Immunities** ${state.conditionImmunities}  \n`;
        if (state.senses) stats += `> **Senses** ${state.senses}  \n`;
        if (state.languages) stats += `> **Languages** ${state.languages}  \n`;
        return stats;
    }

    function formatDescription(description) {
        if (!description) return '';
        return description.replace(NEWLINE_REGEX, '\n> ');
    }

    function generateAbilitySection(items, sectionTitle) {
        if (!items || items.length === 0) return '';
        const validItems = items.filter(item => 
            item.name && item.name.trim() && 
            item.description && item.description.trim()
        );
        if (validItems.length === 0) return '';
        let section = `> ### ${sectionTitle}\n>\n`;
        validItems.forEach(item => {
            const formattedDesc = formatDescription(item.description);
            section += `> ***${item.name}.*** ${formattedDesc}\n>\n`;
        });
        return section;
    }

    function generateLegendaryActions(state) {
        if (!state.legendaryActions || state.legendaryActions.length === 0) return '';
        const validActions = state.legendaryActions.filter(action =>
            action.name && action.name.trim() &&
            action.description && action.description.trim()
        );
        if (validActions.length === 0) return '';
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

    function generateTextBlock(content, sectionTitle) {
        if (!content || !content.trim()) return '';
        let section = `> ### ${sectionTitle}\n>\n`;
        const lines = content.split(NEWLINE_REGEX);
        const formattedLines = lines.map(line => 
            line.trim() ? `> ${line}` : '>'
        );
        section += formattedLines.join('\n') + '\n>\n';
        return section;
    }

    function generateMarkdown(state, abilities) {
        let markdown = '';
        markdown += generateFrontMatter(state);
        markdown += generateLoreSection(state);

        markdown += `___\n`;
        markdown += `> ## ${state.title}\n`;
        markdown += `> *${state.size} ${state.type.toLowerCase()}, ${state.alignment.toLowerCase()}*\n>\n`;

        // Basic combat stats
        const basicStats = [];
        if (state.ac) basicStats.push(`**AC** ${state.ac}`);
        if (state.hp) basicStats.push(`**HP** ${state.hp}`);
        if (state.speed) basicStats.push(`**Speed** ${state.speed}`);
        
        // Calculate Initiative
        const init = MonsterCalculator.calculateInitiative(state.dex, state.cr, state.initiativeProficiency);
        basicStats.push(`**Initiative** ${init.formatted} (${init.score})`);

        if (basicStats.length > 0) {
            markdown += `> ${basicStats.join(' ')}\n>\n`;
        }

        markdown += generateAbilityTable(abilities);
        markdown += generateSavingThrows(abilities);
        markdown += generateOptionalStats(state);

        const profBonus = MonsterCalculator.getProficiencyBonus(state.cr);
        markdown += `> **Challenge** ${state.cr} (1,800 XP) **Proficiency Bonus** +${profBonus}\n>\n`;

        markdown += generateAbilitySection(state.traits, 'Traits');
        markdown += generateAbilitySection(state.actions, 'Actions');
        markdown += generateAbilitySection(state.bonusActions, 'Bonus Actions');
        markdown += generateAbilitySection(state.reactions, 'Reactions');
        markdown += generateLegendaryActions(state);
        markdown += generateTextBlock(state.lairActions, 'Lair Actions');
        markdown += generateTextBlock(state.regionalEffects, 'Regional Effects');

        return markdown;
    }

    function generateFilename(title) {
        if (!title || !title.trim()) return 'statblock.md';
        return title
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s-]+/g, '-')
            .replace(/^-+|-+$/g, '')
            + '.md';
    }

    return {
        generateMarkdown,
        generateFilename,
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