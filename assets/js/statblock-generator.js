// Hawthorne Bestiary Stat Block Generator
// This script creates an interactive form for generating D&D monster stat blocks in markdown format
(function() {
    'use strict';

    // --- STATE INITIALIZATION ---
    // Creates a fresh state object with all default values for a new monster
    function getInitialState() {
        return {
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
            initiative: '',
            
            // Ability scores (default to 10, which gives +0 modifier)
            str: 10,
            dex: 10,
            con: 10,
            int: 10,
            wis: 10,
            cha: 10,
            
            // Optional proficient saving throw overrides (empty = use calculated value)
            strSave: '', 
            dexSave: '',
            conSave: '',
            intSave: '',
            wisSave: '',
            chaSave: '',
            
            // Additional statistics
            skills: '',
            damageResistances: '',
            damageImmunities: '',
            conditionImmunities: '',
            senses: '',
            languages: '',
            
            // Monster abilities (arrays of {name, description} objects)
            traits: [],
            actions: [],
            reactions: [],
            bonusActions: [],
            legendaryActions: [],
            legendaryActionDescription: '',
            
            // Text blocks for lair mechanics
            lairActions: '', 
            regionalEffects: '',

            // Temporary storage for full body markdown for parsing
            markdownBody: '',
        };
    }
    
    // Current application state
    let state = getInitialState();

    // Resets the state back to initial values (used when loading a new file)
    function resetState() {
        state = getInitialState();
    }

    // --- CONSTANTS ---
    // Available creature sizes in D&D
    const sizes = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'];
    
    // Available creature types in D&D
    const types = ['Aberration', 'Beast', 'Celestial', 'Construct', 'Dragon', 'Elemental', 
                   'Fey', 'Fiend', 'Giant', 'Humanoid', 'Monstrosity', 'Ooze', 'Plant', 'Undead'];

    // --- FOCUS MANAGEMENT ---
    // Stores information about which input field was focused and cursor position
    // This allows us to restore focus after re-rendering the form
    let focusedElementInfo = null;

    // Saves the currently focused element and cursor position before re-render
    function saveFocus() {
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') && activeElement.id) {
            focusedElementInfo = {
                id: activeElement.id,
                cursor: activeElement.selectionStart !== null ? activeElement.selectionStart : activeElement.value.length
            };
        } else {
            focusedElementInfo = null;
        }
    }

    // Restores focus to the previously focused element and cursor position after re-render
    function restoreFocus() {
        if (!focusedElementInfo) return;
        const elementToFocus = document.getElementById(focusedElementInfo.id);
        if (elementToFocus) {
            elementToFocus.focus();
            if (elementToFocus.setSelectionRange) {
                // Check if cursor position is valid for the element's value
                const cursor = Math.min(focusedElementInfo.cursor, elementToFocus.value.length);
                elementToFocus.setSelectionRange(cursor, cursor);
            }
        }
    }

    // --- GAME MECHANICS CALCULATIONS ---
    // Calculates the ability modifier from an ability score (D&D 5e formula)
    // Example: score of 14 = modifier of +2
    function calculateModifier(score) {
        return Math.floor((parseInt(score, 10) - 10) / 2);
    }

    // Formats a modifier with appropriate sign for display
    // Example: 2 becomes "+2", -1 stays "-1"
    function formatModifier(mod) {
        return mod >= 0 ? `+${mod}` : `${mod}`;
    }

    // Calculates proficiency bonus based on Challenge Rating
    // Used for skill checks and saving throws
    function getProficiencyBonus(cr) {
        const crNum = eval(cr) || 0; // Use eval to handle fractions like "1/4"
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

    // Calculates a proficient saving throw value
    // saving throw = ability modifier + proficiency bonus
    function calculateSave(score, profBonus) {
        return calculateModifier(score) + profBonus;
    }

    // Creates an object with all ability scores, their modifiers, and saving throws
    // Returns: { str: {score, mod, save}, dex: {...}, etc. }
    function getAbilitiesObject(pb) {
        const abilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
        const abilities = {};
        abilityKeys.forEach(key => {
            abilities[key] = {
                score: state[key],
                mod: calculateModifier(state[key]),
                save: calculateSave(state[key], pb)
            };
        });
        return abilities;
    }

    // **FIX for ancient-sword-dragon.md (Traits/Actions not loading)**
    /**
     * Parses ability blocks (Traits, Actions, Legendary Actions) from the markdown body.
     * NOTE: The markdown body must be stored in state.markdownBody before calling.
     * @param {string} sectionHeader - The H3 header of the section (e.g., 'Traits').
     * @param {string} startMarker - The starting bold marker for the ability name (e.g., '***').
     * @param {string} endMarker - The ending bold marker for the ability name.
     * @returns {Array<Object>} An array of {name, description} objects.
     */
    function parseAbilityList(sectionHeader, startMarker, endMarker) {
        const abilities = [];
        if (!state.markdownBody) return []; // Safety check

        // Ensure asterisks are correctly escaped for the RegExp constructor
        const escapedStart = startMarker.replace(/\*/g, '\\*');
        const escapedEnd = endMarker.replace(/\*/g, '\\*');
        
        // 1. Find the entire section block by header
        // Stops before the next H3 header or the end of the file.
        // It also handles blockquoted (>) or non-blockquoted headers
        // Added 'm' flag for multiline matching (^ matches start of line)
        const sectionRegex = new RegExp(`(?:^>\\s*### ${sectionHeader}|^### ${sectionHeader})\\s*([\\s\\S]*?)(?=\\n>\\s*### |\\n### |$)`, 'm');
        const sectionMatch = state.markdownBody.match(sectionRegex);
    
        if (!sectionMatch) {
            return [];
        }

        // Use match[1] if available, otherwise find content after match[0]
        let sectionContent = sectionMatch[1]; 
        if (!sectionContent) {
             // Fallback for headers that might be part of the match[0]
            const headerRegex = new RegExp(`(?:^>\\s*### ${sectionHeader}|^### ${sectionHeader})`, 'm');
            sectionContent = sectionMatch[0].replace(headerRegex, '').trim();
        }

        if (!sectionContent) return [];
        sectionContent = sectionContent.trim();

        // 2. Find individual abilities (robustly handles multi-paragraph descriptions)
        // This regex finds abilities that are blockquoted (>) or not.
        // It captures the Name and the Description
        // Updated to be more robust for blockquoted and non-blockquoted abilities
        const abilityRegex = new RegExp(
            `^>?\\s*${escapedStart}([^\\.]+?)\\. ${escapedEnd}\\s*([\\s\\S]*?)(?=\\n>?\\s*${escapedStart}[^\\.]+?\\. ${escapedEnd}|$)`,
            'gm'
        );
        
        let match;
        while ((match = abilityRegex.exec(sectionContent)) !== null) {
            abilities.push({
                name: match[1].trim(),
                description: match[2].replace(/^>\s*/gm, '').trim() // Clean blockquotes from description
            });
        }
    
        return abilities;
    }
    
    // Simple HTML escaping utility (prevents XSS in <pre> tags)
    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') {
            if (unsafe === null || typeof unsafe === 'undefined') {
                unsafe = '';
            } else {
                unsafe = String(unsafe);
            }
        }
        return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    // --- VALIDATION ---
    // Validates that all required fields are filled and valid
    // Returns: { valid: boolean, errors: string[] }
    function validateForm() {
        const errors = [];
        if (!state.title.trim()) errors.push('Title is required');
        if (!state.cr.trim()) errors.push('CR is required');
        if (!state.category.trim()) errors.push('Category is required');
        if (!state.creator.trim()) errors.push('Creator is required');
        
        try {
            if (state.cr && isNaN(eval(state.cr))) { // Handle "1/4"
                errors.push('CR must be a number (e.g., 5, 0.5, 1/4)');
            }
        } catch (e) {
            errors.push('CR must be a valid number or fraction (e.g., 5, 0.5, 1/4)');
        }

        ['str', 'dex', 'con', 'int', 'wis', 'cha'].forEach(ability => {
            const score = state[ability];
            if (score < 1 || score > 30) {
                errors.push(`${ability.toUpperCase()} must be between 1 and 30`);
            }
        });
        return { valid: errors.length === 0, errors };
    }

    // --- MARKDOWN GENERATION ---
    // Generates the complete markdown file content for the stat block
    // This creates a Jekyll-compatible front matter + markdown stat block
    function generateMarkdown() {
        const validation = validateForm();
        if (!validation.valid) return '';

        const pb = getProficiencyBonus(state.cr);
        const abilities = getAbilitiesObject(pb);

        // Build YAML front matter (metadata section at top of file)
        let markdown = `---
layout: ${state.layout}
title: ${state.title}
cr: ${state.cr}
size: ${state.size}
type: ${state.type}
alignment: ${state.alignment}
category: ${state.category}
creator: ${state.creator}`;

        // Add optional front matter fields if present
        if (state.image) markdown += `\nimage: ${state.image}`;
        if (state.image_credit) markdown += `\nimage_credit: ${state.image_credit}`;

        // Close front matter
        markdown += `\n---\n\n`;

        // Add description section if present (now outside front matter)
        if (state.description) {
            markdown += `## ${state.title}\n\n`;
            // Split description into paragraphs and format with blank lines between
            const paragraphs = state.description.split('\n').filter(p => p.trim());
            markdown += paragraphs.join('\n\n') + '\n\n';
        }

        // Start the stat block content
        markdown += `___\n> ## ${state.title}\n> *${state.size} ${state.type.toLowerCase()}, ${state.alignment.toLowerCase()}*\n>\n`;

        // Add core statistics (AC, HP, Speed)
        if (state.ac) markdown += `> **AC** ${state.ac}`;
        if (state.hp) markdown += ` **HP** ${state.hp}`;
        if (state.speed) markdown += ` **Speed** ${state.speed}`;
        markdown += `\n>\n`;

        // Add initiative if specified
        if (state.initiative) {
            markdown += `> **Initiative** ${state.initiative}\n>\n`;
        }

        // Determine which saving throw values to display
        // Use override value if provided, otherwise use calculated value
        const strSaveOutput = state.strSave.trim() || formatModifier(abilities.str.save);
        const dexSaveOutput = state.dexSave.trim() || formatModifier(abilities.dex.save);
        const conSaveOutput = state.conSave.trim() || formatModifier(abilities.con.save);
        const intSaveOutput = state.intSave.trim() || formatModifier(abilities.int.save);
        const wisSaveOutput = state.wisSave.trim() || formatModifier(abilities.wis.save);
        const chaSaveOutput = state.chaSave.trim() || formatModifier(abilities.cha.save);

        // Build ability score table with scores, modifiers, and saves
        markdown += `> | | | MOD | SAVE | | | MOD | SAVE | | | MOD | SAVE |\n`;
        markdown += `> |:--|:-:|:----:|:----:|:--|:-:|:----:|:----:|:--|:-:|:----:|:----:|\n`;
        markdown += `> |Str| ${abilities.str.score}| ${formatModifier(abilities.str.mod)}| ${strSaveOutput}|`;
        markdown += `Dex| ${abilities.dex.score}| ${formatModifier(abilities.dex.mod)} | ${dexSaveOutput}|`;
        markdown += `Con| ${abilities.con.score}| ${formatModifier(abilities.con.mod)} | ${conSaveOutput}|\n`;
        markdown += `> |Int| ${abilities.int.score}| ${formatModifier(abilities.int.mod)} | ${intSaveOutput}|`;
        markdown += `Wis| ${abilities.wis.score}| ${formatModifier(abilities.wis.mod)} | ${wisSaveOutput}|`;
        markdown += `Cha| ${abilities.cha.score}| ${formatModifier(abilities.cha.mod)} | ${chaSaveOutput}|\n>\n`;

        // Add explicit "Saving Throws" line if any saves were overridden
        const abilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
        const saveOverrides = [];
        abilityKeys.forEach(key => {
            const overrideValue = state[key + 'Save'].trim(); 
            if (overrideValue) {
                saveOverrides.push(`${key.charAt(0).toUpperCase() + key.slice(1)} ${overrideValue}`);
            }
        });

        if (saveOverrides.length > 0) {
            markdown += `> **Saving Throws** ${saveOverrides.join(', ')}  \n`;
        }
        
        // Add optional statistics (skills, resistances, senses, etc.)
        if (state.skills) markdown += `> **Skills** ${state.skills}  \n`;
        if (state.damageResistances) markdown += `> **Damage Resistances** ${state.damageResistances}  \n`;
        if (state.damageImmunities) markdown += `> **Damage Immunities** ${state.damageImmunities}  \n`;
        if (state.conditionImmunities) markdown += `> **Condition Immunities** ${state.conditionImmunities}  \n`;
        if (state.senses) markdown += `> **Senses** ${state.senses}  \n`;
        if (state.languages) markdown += `> **Languages** ${state.languages}  \n`;
        markdown += `> **CR** ${state.cr} (PB +${pb})\n>\n`;

        // Helper to format descriptions for markdown blockquote
        const formatDesc = (desc) => (desc || '').replace(/\n/g, "\n> ");

        // Add traits section if any traits exist
        if (state.traits.length > 0) {
            markdown += `> ### Traits\n>\n`;
            state.traits.forEach(trait => {
                if (trait.name && trait.description) {
                    markdown += `> ***${trait.name}.*** ${formatDesc(trait.description)}\n>\n`;
                }
            });
        }

        // Add actions section if any actions exist
        if (state.actions.length > 0) {
            markdown += `> ### Actions\n>\n`;
            state.actions.forEach(action => {
                if (action.name && action.description) {
                    markdown += `> ***${action.name}.*** ${formatDesc(action.description)}\n>\n`;
                }
            });
        }
        
        // Add bonus actions section if any exist
        if (state.bonusActions.length > 0) {
            markdown += `> ### Bonus Actions\n>\n`;
            state.bonusActions.forEach(action => {
                if (action.name && action.description) {
                    markdown += `> ***${action.name}.*** ${formatDesc(action.description)}\n>\n`;
                }
            });
        }

        // Add reactions section if any exist
        if (state.reactions.length > 0) {
            markdown += `> ### Reactions\n>\n`;
            state.reactions.forEach(reaction => {
                if (reaction.name && reaction.description) {
                    markdown += `> ***${reaction.name}.*** ${formatDesc(reaction.description)}\n>\n`;
                }
            });
        }

        // Add legendary actions section if any exist
        if (state.legendaryActions.length > 0) {
            markdown += `> ### Legendary Actions\n`;
            const defaultDesc = "The creature can take 3 legendary actions, choosing from the options below. Only one legendary action can be used at a time and only at the end of another creature's turn. The creature regains spent legendary actions at the start of its turn.";
            const legendaryDesc = state.legendaryActionDescription.trim() || defaultDesc;
            
            markdown += `> ${formatDesc(legendaryDesc)}\n>\n`;

            state.legendaryActions.forEach(action => {
                if (action.name && action.description) {
                    markdown += `> **${action.name}.** ${formatDesc(action.description)}\n>\n`;
                }
            });
        }
        
        // Add lair actions section if text is provided
        if (state.lairActions) {
            markdown += `> ### Lair Actions\n>\n`;
            const formattedLairActions = state.lairActions.split('\n').map(l => l.trim() ? `> ${l}` : '>').join('\n');
            markdown += `${formattedLairActions}\n>\n`;
        }

        // Add regional effects section if text is provided
        if (state.regionalEffects) {
            markdown += `> ### Regional Effects\n>\n`;
            const formattedRegionalEffects = state.regionalEffects.split('\n').map(l => l.trim() ? `> ${l}` : '>').join('\n');
            markdown += `${formattedRegionalEffects}\n>\n`;
        }

        return markdown;
    }
    
    // --- SYNCHRONIZATION ---
    // Updates the state object from the form inputs
    function syncFormState() {
        const formView = document.getElementById('form-view');
        if (!formView) return;

        // Sync main fields
        const inputs = formView.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            // Check if input ID exists in the state and it's not an item list field
            if (input.id in state && !input.classList.contains('item-name') && !input.classList.contains('item-description')) {
                if (input.type === 'number') {
                    state[input.id] = parseInt(input.value) || 0; // Ensure ability scores are numbers
                } else {
                    state[input.id] = input.value;
                }
            }
        });
        // Note: Item lists (traits, actions) are updated by their own handlers (addItem, removeItem, updateItem)
    }

    // --- FORM RENDERING ---
    // Renders the complete HTML form for editing the stat block
    function renderForm() {
        const pb = getProficiencyBonus(state.cr || 0);
        return `
            <div class="form-section">
                <h2>Monster</h2>
                <div class="field-group">
                    <div class="form-field">
                        <label for="title">Title *</label>
                        <input type="text" id="title" value="${escapeHtml(state.title)}" placeholder="e.g., Owlbear">
                    </div>
                    <div class="form-field">
                        <label for="cr">CR (Challenge Rating) *</label>
                        <input type="text" id="cr" value="${escapeHtml(state.cr)}" placeholder="e.g., 5 or 1/4">
                    </div>
                    <div class="form-field">
                        <label for="size">Size *</label>
                        <select id="size">
                            ${sizes.map(s => `<option value="${s}" ${state.size === s ? 'selected' : ''}>${s}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-field">
                        <label for="type">Type *</label>
                        <select id="type">
                            ${types.map(t => `<option value="${t}" ${state.type === t ? 'selected' : ''}>${t}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-field">
                        <label for="alignment">Alignment *</label>
                        <input type="text" id="alignment" value="${escapeHtml(state.alignment)}" placeholder="e.g., Lawful Evil">
                    </div>
                    <div class="form-field">
                        <label for="category">Category *</label>
                        <input type="text" id="category" value="${escapeHtml(state.category)}" placeholder="e.g., 2014 Fair Game">
                    </div>
                    <div class="form-field">
                        <label for="creator">Creator *</label>
                        <input type="text" id="creator" value="${escapeHtml(state.creator)}" placeholder="Your Name">
                    </div>
                    <div class="form-field">
                        <label for="image">Image URL</label>
                        <input type="text" id="image" value="${escapeHtml(state.image)}" placeholder="Full URL to image">
                    </div>
                    <div class="form-field">
                        <label for="image_credit">Image Credit</label>
                        <input type="text" id="image_credit" value="${escapeHtml(state.image_credit)}" placeholder="Artist and Source">
                    </div>
                    <div class="form-field full-width">
                        <label for="description">Lore Description</label>
                        <textarea id="description" rows="5">${escapeHtml(state.description)}</textarea>
                    </div>
                </div>
            </div>

            <div class="form-section">
                <h2>Basic Statistics</h2>
                <div class="field-group">
                    <div class="form-field">
                        <label for="ac">AC</label>
                        <input type="text" id="ac" value="${escapeHtml(state.ac)}" placeholder="e.g., 14 (natural armor)">
                    </div>
                    <div class="form-field">
                        <label for="hp">HP</label>
                        <input type="text" id="hp" value="${escapeHtml(state.hp)}" placeholder="e.g., 59 (7d10 + 21)">
                    </div>
                    <div class="form-field">
                        <label for="speed">Speed</label>
                        <input type="text" id="speed" value="${escapeHtml(state.speed)}" placeholder="e.g., 40 ft., burrow 20 ft.">
                    </div>
                    <div class="form-field">
                        <label for="initiative">Initiative</label>
                        <input type="text" id="initiative" value="${escapeHtml(state.initiative)}" placeholder="e.g., +2">
                    </div>
                </div>
            </div>

            <div class="form-section">
                <h2>Ability Scores</h2>
                <p>Note: Modifiers and Saves are refreshed upon hitting the "Preview" button or changing scores.</p>
                <div class="ability-group field-group">
                    <table>
                        <thead>
                            <tr>
                                <th>Ability</th>
                                <th>Score *</th>
                                <th>Mod</th>
                                <th>Base Save (+PB)</th>
                                <th>Proficient Save (Override)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${['str', 'dex', 'con', 'int', 'wis', 'cha'].map(ability => {
                                const score = state[ability];
                                const mod = calculateModifier(score);
                                const save = calculateSave(score, pb);
                                return `
                                    <tr>
                                        <td>${ability.toUpperCase()}</td>
                                        <td>
                                            <input type="number" class="ability-score-input" id="${ability}" min="1" max="30" value="${score}">
                                        </td>
                                        <td>${formatModifier(mod)}</td>
                                        <td>${formatModifier(save)}</td>
                                        <td>
                                            <input type="text" id="${ability}Save" value="${escapeHtml(state[ability + 'Save'])}" placeholder="e.g., +9">
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="form-section">
                <h2>Optional Statistics</h2>
                <div class="field-group">
                    <div class="form-field">
                        <label for="skills">Skills</label>
                        <input type="text" id="skills" value="${escapeHtml(state.skills)}" placeholder="e.g., Perception +5, Stealth +4">
                    </div>
                    <div class="form-field">
                        <label for="damageResistances">Damage Resistances</label>
                        <input type="text" id="damageResistances" value="${escapeHtml(state.damageResistances)}" placeholder="e.g., cold, fire">
                    </div>
                    <div class="form-field">
                        <label for="damageImmunities">Damage Immunities</label>
                        <input type="text" id="damageImmunities" value="${escapeHtml(state.damageImmunities)}" placeholder="e.g., poison, radiant">
                    </div>
                    <div class="form-field">
                        <label for="conditionImmunities">Condition Immunities</label>
                        <input type="text" id="conditionImmunities" value="${escapeHtml(state.conditionImmunities)}" placeholder="e.g., charmed, prone">
                    </div>
                    <div class="form-field">
                        <label for="senses">Senses</label>
                        <input type="text" id="senses" value="${escapeHtml(state.senses)}" placeholder="e.g., darkvision 60 ft., passive Perception 13">
                    </div>
                    <div class="form-field">
                        <label for="languages">Languages</label>
                        <input type="text" id="languages" value="${escapeHtml(state.languages)}" placeholder="e.g., Common, Draconic">
                    </div>
                </div>
            </div>

            ${renderItemSection('traits', 'Traits')}
            ${renderItemSection('actions', 'Actions')}
            ${renderItemSection('bonusActions', 'Bonus Actions')}
            ${renderItemSection('reactions', 'Reactions')}
            
            <div class="form-section">
                <h2>Legendary Actions</h2>
                <div class="form-field full-width">
                    <label for="legendaryActionDescription">Legendary Action Description (optional)</label>
                    <textarea id="legendaryActionDescription" rows="3">${escapeHtml(state.legendaryActionDescription)}</textarea>
                </div>
                ${renderItemList('legendaryActions')}
                <button type="button" class="add-button" onclick="addItem('legendaryActions')">+ Add Legendary Action</button>
            </div>
            
            <div class="form-section">
                <h2>Lair Actions</h2>
                <div class="form-field full-width">
                    <label for="lairActions">Lair Actions (Optional Text Block)</label>
                    <textarea id="lairActions" rows="5">${escapeHtml(state.lairActions)}</textarea>
                </div>
            </div>
            
            <div class="form-section">
                <h2>Regional Effects</h2>
                <div class="form-field full-width">
                    <label for="regionalEffects">Regional Effects (Optional Text Block)</label>
                    <textarea id="regionalEffects" rows="5">${escapeHtml(state.regionalEffects)}</textarea>
                </div>
            </div>
        `;
    }

    // Renders a complete section with multiple items (traits, actions, etc.)
    // Returns HTML for the section header, list of items, and add button
    function renderItemSection(field, title) {
        const singularTitle = title.slice(0, -1); 
        return `
            <div class="form-section">
                <h2>${title}</h2>
                ${renderItemList(field)}
                <button type="button" class="add-button" onclick="addItem('${field}')">+ Add ${singularTitle}</button>
            </div>
        `;
    }

    // Renders the list of items (each with name and description fields)
    // Used for traits, actions, reactions, etc.
    function renderItemList(field) {
        if (!state[field]) state[field] = []; // Ensure field exists
        return `
            <div class="item-list">
                ${state[field].map((item, index) => `
                    <div class="item-entry">
                        <div class="item-header">
                            <input type="text" 
                                class="item-name" 
                                id="${field}-${index}-name"
                                value="${escapeHtml(item.name)}" 
                                placeholder="${field.slice(0, -1)} Name" 
                                oninput="updateItem('${field}', ${index}, 'name', this.value)">
                            <button type="button" class="remove-button" onclick="removeItem('${field}', ${index})">Remove</button>
                        </div>
                        <textarea 
                            class="item-description" 
                            id="${field}-${index}-description"
                            rows="3"
                            placeholder="${field.slice(0, -1)} Description" 
                            oninput="updateItem('${field}', ${index}, 'description', this.value)">${escapeHtml(item.description)}</textarea>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // --- ITEM LIST MANAGEMENT ---
    // Adds a new item to the specified array field in the state
    function addItem(field) {
        if (!state[field]) state[field] = []; // Ensure array exists
        state[field].push({ name: '', description: '' });
        render(); // Re-render to show new empty item
    }

    // Removes an item from the specified array field in the state
    function removeItem(field, index) {
        if (!state[field]) return;
        state[field].splice(index, 1);
        render(); // Re-render to update list indices
    }

    // Updates a specific property (name or description) of an item in the state
    // Note: This is called by oninput and does NOT trigger a full render, 
    // it only updates the state for the next sync/render cycle.
    function updateItem(field, index, prop, value) {
        if (state[field] && state[field][index]) {
            state[field][index][prop] = value;
        }
        // Optionally trigger a preview update here if needed, but not required for form input.
        const previewView = document.getElementById('preview-view');
        if (previewView && previewView.classList.contains('active')) {
            previewView.innerHTML = renderPreview();
        }
    }


    // --- PREVIEW RENDERING ---
    // Renders the preview tab showing validation status, markdown, and visual preview
    function renderPreview() {
        syncFormState(); // Ensure state is up-to-date
        const validation = validateForm();
        const markdown = generateMarkdown();
        
        return `
            <div class="preview-messages">
                ${!validation.valid ? `
                    <div class="error-box">
                        <h3>⚠️ Validation Errors:</h3>
                        <ul>
                            ${validation.errors.map(e => `<li>${e}</li>`).join('')}
                        </ul>
                    </div>
                ` : `
                    <div class="success-box">
                        ✓ Validation Passed! Your stat block is ready to download.
                    </div>
                `}
            </div>

            <div class="markdown-output">
                <h3>Markdown Preview</h3>
                <pre>${escapeHtml(markdown)}</pre>
            </div>

            <div class="visual-output">
                <h3>Visual Preview</h3>
                <p>This is an approximation of how the statblock would appear in the bestiary. Note the visual rendering (Lore in particular) is not perfect in the preview and should look better when added to the bestiary.</p>
                ${renderVisualStatBlock()}
            </div>
        `;
    }

    // Renders the visual representation of the stat block (HTML formatted)
    // This shows what the stat block will look like when rendered on the website
    function renderVisualStatBlock() {
        if (!state.title) return '<div class="statblock-placeholder">Fill in the form to see preview...</div>';

        const pb = getProficiencyBonus(state.cr);
        const abilities = getAbilitiesObject(pb);

        // Determine display values for saving throws (use override if provided)
        const strSaveValue = state.strSave.trim() || formatModifier(abilities.str.save);
        const dexSaveValue = state.dexSave.trim() || formatModifier(abilities.dex.save);
        const conSaveValue = state.conSave.trim() || formatModifier(abilities.con.save);
        const intSaveValue = state.intSave.trim() || formatModifier(abilities.int.save);
        const wisSaveValue = state.wisSave.trim() || formatModifier(abilities.wis.save);
        const chaSaveValue = state.chaSave.trim() || formatModifier(abilities.cha.save);
        
        // Determine which saving throw values to display in the section (only overrides)
        const abilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
        const saveOverrides = [];
        abilityKeys.forEach(key => {
            const overrideValue = state[key + 'Save'].trim();
            if (overrideValue) {
                // Capitalize the ability name for display (e.g., 'Str +9')
                saveOverrides.push(`${key.charAt(0).toUpperCase() + key.slice(1)} ${overrideValue}`);
            }
        });

        // Split description into paragraphs for display
        const descriptionParagraphs = state.description.trim().split('\n').filter(p => p.trim());
        
        // Helper function for optional stats
        const optionalStat = (label, value) => value ? `<p><strong>${label}</strong> ${escapeHtml(value)}</p>` : '';
        // Helper to format text with newlines as <p> tags
        const formatBlock = (text) => (text || '').split('\n').map(p => `<p>${escapeHtml(p)}</p>`).join('');

        return `
            <div class="statblock-visual">
                <div class="statblock-header">
                    <h1>${escapeHtml(state.title)}</h1>
                    <p><em>${escapeHtml(state.size)} ${escapeHtml(state.type.toLowerCase())}, ${escapeHtml(state.alignment.toLowerCase())}</em></p>
                </div>
                
                ${descriptionParagraphs.length > 0 ? `
                    <div class="statblock-description">
                        ${descriptionParagraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('')}
                    </div>
                ` : ''}

                <div class="statblock-section">
                    ${state.ac ? `<p><strong>AC</strong> ${escapeHtml(state.ac)}</p>` : ''}
                    ${state.hp ? `<p><strong>HP</strong> ${escapeHtml(state.hp)}</p>` : ''}
                    ${state.speed ? `<p><strong>Speed</strong> ${escapeHtml(state.speed)}</p>` : ''}
                </div>
                
                ${state.initiative ? `<div class="statblock-section"><p><strong>Initiative</strong> ${escapeHtml(state.initiative)}</p></div>` : ''}

                <div class="statblock-abilities">
                    <table>
                        <thead>
                            <tr>
                                <th></th><th>Score</th><th>Mod</th><th>Save</th>
                                <th></th><th>Score</th><th>Mod</th><th>Save</th>
                                <th></th><th>Score</th><th>Mod</th><th>Save</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Str</td><td>${abilities.str.score}</td><td>${formatModifier(abilities.str.mod)}</td><td>${strSaveValue}</td>
                                <td>Dex</td><td>${abilities.dex.score}</td><td>${formatModifier(abilities.dex.mod)}</td><td>${dexSaveValue}</td>
                                <td>Con</td><td>${abilities.con.score}</td><td>${formatModifier(abilities.con.mod)}</td><td>${conSaveValue}</td>
                            </tr>
                            <tr>
                                <td>Int</td><td>${abilities.int.score}</td><td>${formatModifier(abilities.int.mod)}</td><td>${intSaveValue}</td>
                                <td>Wis</td><td>${abilities.wis.score}</td><td>${formatModifier(abilities.wis.mod)}</td><td>${wisSaveValue}</td>
                                <td>Cha</td><td>${abilities.cha.score}</td><td>${formatModifier(abilities.cha.mod)}</td><td>${chaSaveValue}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="statblock-section">
                    ${saveOverrides.length > 0 ? `<p><strong>Saving Throws</strong> ${escapeHtml(saveOverrides.join(', '))}</p>` : ''}
                    ${optionalStat('Skills', state.skills)}
                    ${optionalStat('Damage Resistances', state.damageResistances)}
                    ${optionalStat('Damage Immunities', state.damageImmunities)}
                    ${optionalStat('Condition Immunities', state.conditionImmunities)}
                    ${optionalStat('Senses', state.senses)}
                    ${optionalStat('Languages', state.languages)}
                    <p><strong>CR</strong> ${escapeHtml(state.cr)} (PB +${pb})</p>
                </div>

                ${state.traits.length > 0 && state.traits.some(t => t.name) ? `
                    <div class="statblock-section">
                        <h3>Traits</h3>
                        ${state.traits.filter(t => t.name).map(t => `<p><strong><em>${escapeHtml(t.name)}.</em></strong> ${formatBlock(t.description)}</p>`).join('')}
                    </div>
                ` : ''}
                
                ${state.actions.length > 0 && state.actions.some(a => a.name) ? `
                    <div class="statblock-section">
                        <h3>Actions</h3>
                        ${state.actions.filter(a => a.name).map(a => `<p><strong><em>${escapeHtml(a.name)}.</em></strong> ${formatBlock(a.description)}</p>`).join('')}
                    </div>
                ` : ''}
                
                ${state.bonusActions.length > 0 && state.bonusActions.some(b => b.name) ? ` <div class="statblock-section">
                        <h3>Bonus Actions</h3>
                        ${state.bonusActions.filter(b => b.name).map(b => `<p><strong><em>${escapeHtml(b.name)}.</em></strong> ${formatBlock(b.description)}</p>`).join('')}
                    </div>
                ` : ''} 
                
                ${state.reactions.length > 0 && state.reactions.some(r => r.name) ? `
                    <div class="statblock-section">
                        <h3>Reactions</h3>
                        ${state.reactions.filter(r => r.name).map(r => `<p><strong><em>${escapeHtml(r.name)}.</em></strong> ${formatBlock(r.description)}</p>`).join('')}
                    </div>
                ` : ''}
                
                ${(state.legendaryActions.length > 0 && state.legendaryActions.some(l => l.name)) ? `
                    <div class="statblock-section">
                        <h3>Legendary Actions</h3>
                        <p>${formatBlock(state.legendaryActionDescription.trim() || "The creature can take 3 legendary actions, choosing from the options below. Only one legendary action can be used at a time and only at the end of another creature's turn. The creature regains spent legendary actions at the start of its turn.")}</p>
                        ${state.legendaryActions.filter(l => l.name).map(l => `<p><strong>${escapeHtml(l.name)}.</strong> ${formatBlock(l.description)}</p>`).join('')}
                    </div>
                ` : ''}
                
                ${state.lairActions ? `
                    <div class="statblock-section lair-actions-section">
                        <h3>Lair Actions</h3>
                        ${formatBlock(state.lairActions)}
                    </div>
                ` : ''}

                ${state.regionalEffects ? `
                    <div class="statblock-section regional-effects-section">
                        <h3>Regional Effects</h3>
                        ${formatBlock(state.regionalEffects)}
                    </div>
                ` : ''}
            </div>
        `;
    }

    // --- VIEW MANAGEMENT ---
    // Switches between form edit view and preview view
    function switchView(view) {
        const formView = document.getElementById('form-view');
        const previewView = document.getElementById('preview-view');
        if (!formView || !previewView) return;

        // Hide all views
        formView.classList.remove('active');
        previewView.classList.remove('active');
        
        // Show selected view
        document.getElementById(`${view}-view`).classList.add('active');
        
        // Update button active states
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeButton = document.querySelector(`[data-view="${view}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }

    // --- FILE OPERATIONS ---
    // Downloads the generated markdown as a .md file
    function downloadMarkdown() {
        syncFormState();
        const markdown = generateMarkdown();
        const validation = validateForm();
        
        if (!validation.valid) {
            alert("Please fill in all mandatory fields before downloading:\n- " + validation.errors.join("\n- "));
            return;
        }

        // Create blob and trigger download
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${state.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s-]+/g, '-') || 'statblock'}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // --- RENDERING ---
    // Main render function - updates both form and preview views
    function render() {
        const formView = document.getElementById('form-view');
        const previewView = document.getElementById('preview-view');
        
        if (!formView || !previewView) return; // Exit if containers not found

        const activeTab = previewView.classList.contains('active') ? 'preview' : 'form';
        
        if (activeTab === 'form') {
            saveFocus(); // Save cursor position before re-render
            formView.innerHTML = renderForm();
            restoreFocus(); // Restore cursor position after re-render
            attachFormListeners();
        } else {
            // Only render preview if it's the active tab
            previewView.innerHTML = renderPreview();
            // Still need to render form in background to attach listeners
            formView.innerHTML = renderForm();
            attachFormListeners();
        }
    }

    // Attaches event listeners to form inputs for real-time updates
    function attachFormListeners() {
        const formView = document.getElementById('form-view');
        if (!formView) return;
        
        // Fields that require full re-render when changed (affect calculations)
        const dynamicFields = [
            'str', 'dex', 'con', 'int', 'wis', 'cha', 
            'strSave', 'dexSave', 'conSave', 'intSave', 'wisSave', 'chaSave',
            'cr'
        ];

        const inputs = formView.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            // Skip item fields (they have their own handlers via updateItem)
            if (!input.classList.contains('item-name') && !input.classList.contains('item-description')) {
                
                const eventType = (input.tagName === 'SELECT' || input.type === 'checkbox') ? 'change' : 'input';

                input.addEventListener(eventType, () => {
                    // Sync state immediately on input
                    if (input.type === 'number') {
                        state[input.id] = parseInt(input.value) || 0;
                    } else {
                        state[input.id] = input.value;
                    }

                    if (dynamicFields.includes(input.id)) {
                        // Full re-render for fields that affect calculations
                        // This will re-render the form and preview (if active)
                        render();
                    } else {
                        // Just update preview if it's active
                        const previewView = document.getElementById('preview-view');
                        if (previewView && previewView.classList.contains('active')) {
                            previewView.innerHTML = renderPreview();
                        }
                    }
                });
            }
        });
    }

    // --- INITIALIZATION ---
    // Sets up the application when the page loads
    function init() {
        const container = document.getElementById('generator-app');
        if (!container) return;

        // Build main application structure
        container.innerHTML = `
            <div class="generator-controls">
                <div class="view-toggles">
                    <button class="toggle-btn active" data-view="form" onclick="switchGeneratorView('form')">Edit Form</button>
                    <button class="toggle-btn" data-view="preview" onclick="switchGeneratorView('preview')">Preview</button>
                </div>
                <div style="display: flex; gap: 0.5em;">
                    <button class="download-btn" onclick="downloadStatBlock()">📥 Download Markdown</button>
                    <button class="download-btn" style="background: #007bff;" onclick="document.getElementById('upload-md').click()">📤 Load Markdown</button>
                    <input type="file" id="upload-md" accept=".md" style="display: none;" onchange="loadMarkdownFile(event)">
                </div>
            </div>
            
            <div id="form-view" class="view-container active"></div>
            <div id="preview-view" class="view-container"></div>
        `;

        // Register global functions for onclick handlers
        // Expose necessary functions globally for onclick attributes in dynamically generated HTML
        window.switchGeneratorView = function(view) {
            if (view === 'preview') {
                syncFormState(); // Sync before switching to preview
            }
            switchView(view);
            render(); // Re-render to update the active view
        };

        window.downloadStatBlock = downloadMarkdown;
        window.addItem = addItem;
        window.removeItem = removeItem;
        window.updateItem = updateItem;

        // Loads a markdown file and parses it back into the form
        window.loadMarkdownFile = function(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            // Clear previous monster data before loading new file
            resetState();

            const reader = new FileReader();
            reader.onload = function(e) {
                const content = e.target.result;

                // --- PARSE YAML FRONT MATTER ---
                // Extract the YAML section between --- markers at the start of the file
                const frontMatterMatch = content.match(/^---[\r\n]+([\s\S]*?)[\r\n]+---/);
                if (!frontMatterMatch) {
                    alert("No valid front matter found in this file.");
                    return;
                }

                const frontMatter = frontMatterMatch[1];
                            
                // Parse single-line YAML fields
                const lines = frontMatter.split('\n');
                lines.forEach(line => {
                    const colonIndex = line.indexOf(':');
                    if (colonIndex === -1) return;
            
                    const key = line.substring(0, colonIndex).trim();
                    // Handle values that may contain colons (like URLs)
                    const value = line.substring(colonIndex + 1).trim();

                    if (key in state) {
                         // Strip quotes from value if present
                        state[key] = value.replace(/^['"]|['"]$/g, '');
                    }
                });

                // --- PARSE DESCRIPTION (now outside front matter) ---
                // Description appears after front matter as ## Title followed by paragraphs
                // Must stop at ___ (stat block start)
                const descriptionMatch = content.match(/---\s*\n+## [^\n]+\s*\n+([\s\S]*?)(?=\n*___)/);
                if (descriptionMatch) {
                    const desc = descriptionMatch[1].trim();
                    if (desc) {
                        state.description = desc;
                    }
                }

                // --- PARSE ABILITY SCORES FROM STAT BLOCK TABLE ---
                // More robust regex to handle whitespace and pipes
                const strMatch = content.match(/\|Str\|\s*(\d+)\s*\|/);
                const dexMatch = content.match(/\|Dex\|\s*(\d+)\s*\|/);
                const conMatch = content.match(/\|Con\|\s*(\d+)\s*\|/);
                const intMatch = content.match(/\|Int\|\s*(\d+)\s*\|/);
                const wisMatch = content.match(/\|Wis\|\s*(\d+)\s*\|/);
                const chaMatch = content.match(/\|Cha\|\s*(\d+)\s*\|/);

                if (strMatch) state.str = parseInt(strMatch[1]);
                if (dexMatch) state.dex = parseInt(dexMatch[1]);
                if (conMatch) state.con = parseInt(conMatch[1]);
                if (intMatch) state.int = parseInt(intMatch[1]);
                if (wisMatch) state.wis = parseInt(wisMatch[1]);
                if (chaMatch) state.cha = parseInt(chaMatch[1]);

                // --- PARSE STAT BLOCK BODY ---
                // Everything after the first '___' marker is the stat block body
                const bodyMatch = content.match(/___[\s\S]*$/); 
                if (bodyMatch) {
                    // Clean up leading markers for easier parsing
                    let body = bodyMatch[0];
                    
                    // *** FIX: Store body in state for robust ability parsing ***
                    state.markdownBody = body;

                    // Parse basic statistics (AC, HP, Speed, Initiative)
                    // Added \n to regex to prevent over-matching
                    const acMatch = body.match(/\*\*AC\*\*\s+([^\*\n]+?)(?=\s*\*\*|$|\n)/);
                    const hpMatch = body.match(/\*\*HP\*\*\s+([^\*\n]+?)(?=\s*\*\*|$|\n)/);
                    const speedMatch = body.match(/\*\*Speed\*\*\s+([^\n]+)/);
                    const initiativeMatch = body.match(/\*\*Initiative\*\*\s+([^\n]+)/);

                    if (acMatch) state.ac = acMatch[1].trim();
                    if (hpMatch) state.hp = hpMatch[1].trim();
                    if (speedMatch) state.speed = speedMatch[1].trim();
                    if (initiativeMatch) state.initiative = initiativeMatch[1].trim();

                    // Parse saving throw overrides if they exist (separate line after ability table)
                    const savingThrowsMatch = body.match(/\*\*Saving Throws\*\*\s+([^\n]+)/);
                    if (savingThrowsMatch) {
                        const saves = savingThrowsMatch[1].trim();
                        // Parse individual saves: "Str +9, Dex +5, Con +9, Int +6, Wis +7, Cha +9"
                        const strSaveMatch = saves.match(/Str\s+([\+\-]\d+)/);
                        const dexSaveMatch = saves.match(/Dex\s+([\+\-]\d+)/);
                        const conSaveMatch = saves.match(/Con\s+([\+\-]\d+)/);
                        const intSaveMatch = saves.match(/Int\s+([\+\-]\d+)/);
                        const wisSaveMatch = saves.match(/Wis\s+([\+\-]\d+)/);
                        const chaSaveMatch = saves.match(/Cha\s+([\+\-]\d+)/);
                        
                        if (strSaveMatch) state.strSave = strSaveMatch[1];
                        if (dexSaveMatch) state.dexSave = dexSaveMatch[1];
                        if (conSaveMatch) state.conSave = conSaveMatch[1];
                        if (intSaveMatch) state.intSave = intSaveMatch[1];
                        if (wisSaveMatch) state.wisSave = wisSaveMatch[1];
                        if (chaSaveMatch) state.chaSave = chaSaveMatch[1];
                    }

                    // Parse optional statistics (more robust regex)
                    const skillsMatch = body.match(/\*\*Skills\*\*\s+([^\n]+)/);
                    const sensesMatch = body.match(/\*\*Senses\*\*\s+([^\n]+)/);
                    const languagesMatch = body.match(/\*\*Languages\*\*\s+([^\n]+)/);
                    const condImmMatch = body.match(/\*\*Condition Immunities\*\*\s+([^\n]+)/);
                    const damageResMatch = body.match(/\*\*Damage Resistances\*\*\s+([^\n]+)/);
                    const damageImmMatch = body.match(/\*\*Damage Immunities\*\*\s+([^\n]+)/);

                    if (skillsMatch) state.skills = skillsMatch[1].trim();
                    if (sensesMatch) state.senses = sensesMatch[1].trim();
                    if (languagesMatch) state.languages = languagesMatch[1].trim();
                    if (condImmMatch) state.conditionImmunities = condImmMatch[1].trim();
                    if (damageResMatch) state.damageResistances = damageResMatch[1].trim();
                    if (damageImmMatch) state.damageImmunities = damageImmMatch[1].trim();


                    // --- PARSE ABILITY LISTS ---
                    // *** FIX for ancient-sword-dragon.md ***
                    // Use the new robust `parseAbilityList` function
                    state.traits = parseAbilityList('Traits', '***', '***');
                    state.actions = parseAbilityList('Actions', '***', '***');
                    state.bonusActions = parseAbilityList('Bonus Actions', '***', '***');
                    state.reactions = parseAbilityList('Reactions', '***', '***');

                    // --- PARSE LEGENDARY ACTIONS SECTION ---
                    const legendaryActionsSection = body.match(/### Legendary Actions[\s\S]*?(?=\n>?\s*### |$)/);
                    if (legendaryActionsSection) {
                        // Find description text *before* the first bolded action
                        // Added allowance for blockquote >
                        const descMatch = legendaryActionsSection[0].match(/### Legendary Actions\n>?\s*([\s\S]*?)(?=\n>?\s*\*\*[^_]|$\n)/);                    
                        if (descMatch) {
                            const desc = descMatch[1].replace(/^>\s*/gm, '').trim();
                            // Only save if it's not the default description
                            if (desc && !desc.includes('The creature can take 3 legendary actions')) {
                                state.legendaryActionDescription = desc;
                            }
                        }
                        
                        // Parse individual legendary actions: **Name.** Description (note: ** not ***)
                        state.legendaryActions = parseAbilityList('Legendary Actions', '\\*\\*', '\\*\\*');
                    }

                    // --- PARSE LAIR ACTIONS SECTION ---
                    // *** FIX for the-sandman.md ***
                    // Use robust regex to find section and strip ALL blockquotes
                    // Updated regex to be non-greedy and handle blockquotes
                    const lairActionsBlockMatch = body.match(/### Lair Actions\s*([\s\S]*?)(?=\n>?\s*### Regional Effects|$)/);
                    if (lairActionsBlockMatch) {
                        state.lairActions = lairActionsBlockMatch[1].replace(/^\s*>\s*/gm, '').trim();
                    }

                    // --- PARSE REGIONAL EFFECTS SECTION ---
                    // *** FIX for the-sandman.md ***
                    // Use robust regex to find section and strip ALL blockquotes
                    const regionalEffectsBlockMatch = body.match(/### Regional Effects\s*([\s\S]*?)(?=\n>?\s*$|\n>?\s*<|$)/); // Stop at end of block
                    if (regionalEffectsBlockMatch) {
                        state.regionalEffects = regionalEffectsBlockMatch[1].replace(/^\s*>\s*/gm, '').trim();
                    }
                }

                // Re-render form with loaded data and show success message
                render();
                switchView('form'); // Switch back to form view
                alert(`Loaded: ${file.name}`);

                // Reset file input to allow loading the same file again
                event.target.value = null;
            };

            reader.readAsText(file);
        };

        // Initial render
        render();
    }

    // Start initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();