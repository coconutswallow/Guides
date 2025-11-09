// Hawthorne Bestiary Stat Block Generator (Patched)
// - 2024 ability table format in markdown and visual preview
// - Save overrides included in calculated saves (use override if provided)
// - Keeps original functionality otherwise

(function() {
    'use strict';

    // --- STATE INITIALIZATION ---
    function getInitialState() {
        return {
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
            
            // ability scores default 10
            str: 10,
            dex: 10,
            con: 10,
            int: 10,
            wis: 10,
            cha: 10,
            
            // optional save overrides (string, e.g. "+5" or "5" or "-1")
            strSave: '', 
            dexSave: '',
            conSave: '',
            intSave: '',
            wisSave: '',
            chaSave: '',
            
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
        };
    }
    
    let state = getInitialState();

    function resetState() {
        state = getInitialState();
    }

    // --- CONSTANTS ---
    const NEWLINE_REGEX_G = /\n/g;
    const sizes = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'];
    const types = ['Aberration', 'Beast', 'Celestial', 'Construct', 'Dragon', 'Elemental', 
                   'Fey', 'Fiend', 'Giant', 'Humanoid', 'Monstrosity', 'Ooze', 'Plant', 'Undead'];

    // --- FOCUS MANAGEMENT ---
    let focusedElementInfo = null;

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

    function restoreFocus() {
        if (!focusedElementInfo) return;
        const elementToFocus = document.getElementById(focusedElementInfo.id);
        if (elementToFocus) {
            elementToFocus.focus();
            if (elementToFocus.setSelectionRange) {
                const cursor = Math.min(focusedElementInfo.cursor, elementToFocus.value.length);
                elementToFocus.setSelectionRange(cursor, cursor);
            }
        }
    }

    // --- GAME MECHANICS CALCULATIONS ---
    function calculateModifier(score) {
        return Math.floor((parseInt(score, 10) - 10) / 2);
    }

    function formatModifier(mod) {
        return mod >= 0 ? `+${mod}` : `${mod}`;
    }

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

    // calculateSave is not used directly for overrides: overrides are applied in getAbilitiesObject
    function calculateSave(score, profBonus) {
        return calculateModifier(score) + profBonus;
    }

    function parseOverrideSaveString(s) {
        if (typeof s !== 'string') return null;
        const trimmed = s.trim();
        if (!trimmed) return null;
        // Accept +5, -1, 5 (assume number), or "+5 (prof)" etc. We'll extract leading signed number.
        const m = trimmed.match(/^[\+\-]?\d+/);
        if (m) return parseInt(m[0], 10);
        return null;
    }

    function getAbilitiesObject(pb) {
        const abilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
        const abilities = {};
        abilityKeys.forEach(key => {
            const score = parseInt(state[key], 10) || 0;
            const mod = calculateModifier(score);
            const baseSave = calculateSave(score, pb);
            const overrideRaw = state[key + 'Save'];
            const override = parseOverrideSaveString(overrideRaw);
            abilities[key] = {
                score: score,
                mod: mod,
                // use override if provided, otherwise use calculated value
                save: override !== null ? override : baseSave
            };
        });
        return abilities;
    }
    
    // Simple HTML escaping utility
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
    function validateForm() {
        const errors = [];
        if (!state.title.trim()) errors.push('Title is required');
        if (!state.cr.trim()) errors.push('CR is required');
        if (!state.category.trim()) errors.push('Category is required');
        if (!state.creator.trim()) errors.push('Creator is required');
        
        try {
            const cleanCr = String(state.cr).replace(/\s/g, '');
            let crNum;
            if (cleanCr.includes('/')) {
                const parts = cleanCr.split('/');
                if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[1] != 0) {
                    crNum = parseFloat(parts[0]) / parseFloat(parts[1]);
                } else {
                    throw new Error('Invalid fraction');
                }
            } else {
                crNum = parseFloat(cleanCr);
            }
            if (isNaN(crNum)) {
                errors.push('CR must be a valid number or fraction (e.g., 5, 0.5, 1/4)');
            }
        } catch (e) {
            errors.push('CR must be a valid number or fraction (e.g., 5, 0.5, 1/4)');
        }

        ['str', 'dex', 'con', 'int', 'wis', 'cha'].forEach(ability => {
            const score = state[ability];
            if (isNaN(parseInt(score)) || score < 1 || score > 30) {
                errors.push(`${ability.toUpperCase()} must be between 1 and 30`);
            }
        });
        return { valid: errors.length === 0, errors };
    }

    // --- MARKDOWN GENERATION ---
    function generateMarkdown() {
        const validation = validateForm();
        if (!validation.valid) return '';

        const pb = getProficiencyBonus(state.cr);
        const abilities = getAbilitiesObject(pb);

        let markdown = `---
layout: ${state.layout}
title: ${state.title}
cr: ${state.cr}
size: ${state.size}
type: ${state.type}
alignment: ${state.alignment}
category: ${state.category}
creator: ${state.creator}`;

        if (state.image) markdown += `\nimage: ${state.image}`;
        if (state.image_credit) markdown += `\nimage_credit: ${state.image_credit}`;
        markdown += `\n---\n\n`;

        if (state.description) {
            markdown += `## ${state.title}\n\n`;
            const paragraphs = state.description.split(NEWLINE_REGEX_G).filter(p => p.trim());
            markdown += paragraphs.join('\n\n') + '\n\n';
        }

        markdown += `___\n> ## ${state.title}\n> *${state.size} ${state.type.toLowerCase()}, ${state.alignment.toLowerCase()}*\n>\n`;

        // Basic stats on separate lines
        const statsLine = [];
        if (state.ac) statsLine.push(`**Armor Class** ${state.ac}`);
        if (state.hp) statsLine.push(`**Hit Points** ${state.hp}`);
        if (state.speed) statsLine.push(`**Speed** ${state.speed}`);
        if (statsLine.length > 0) {
            markdown += `> ${statsLine.join('  \n> ')}\n>\n`;
        }

        // 2024 Ability score table (three-column pairs with MOD and SAVE)
        // Matches user's requested format:
        // | | | MOD | SAVE | | | MOD | SAVE | | | MOD | SAVE |
        // |:--|:-:|:----:|:----:|:--|:-:|:----:|:----:|:--|:-:|:----:|:----:|
        // |Str| 21| +5| +9|Dex| 12| +1 | +5|Con| 20| +5 | +9|
        // |Int| 14| +2 | +6|Wis| 16| +3 | +7|Cha| 21| +5 | +9|
        markdown += `> | | | MOD | SAVE | | | MOD | SAVE | | | MOD | SAVE |\n`;
        markdown += `> |:--|:-:|:----:|:----:|:--|:-:|:----:|:----:|:--|:-:|:----:|:----:|\n`;

        markdown += `> |Str| ${abilities.str.score}| ${formatModifier(abilities.str.mod)}| ${formatModifier(abilities.str.save)}|` +
                    `Dex| ${abilities.dex.score}| ${formatModifier(abilities.dex.mod)}| ${formatModifier(abilities.dex.save)}|` +
                    `Con| ${abilities.con.score}| ${formatModifier(abilities.con.mod)}| ${formatModifier(abilities.con.save)}|\n`;

        markdown += `> |Int| ${abilities.int.score}| ${formatModifier(abilities.int.mod)}| ${formatModifier(abilities.int.save)}|` +
                    `Wis| ${abilities.wis.score}| ${formatModifier(abilities.wis.mod)}| ${formatModifier(abilities.wis.save)}|` +
                    `Cha| ${abilities.cha.score}| ${formatModifier(abilities.cha.mod)}| ${formatModifier(abilities.cha.save)}|\n>\n`;

        // Optional saving throw overrides (human-readable list) - only include if overrides provided
        const saveOverrides = [];
        ['str','dex','con','int','wis','cha'].forEach(key => {
            const raw = state[key + 'Save'];
            if (typeof raw === 'string' && raw.trim()) {
                saveOverrides.push(`${key.charAt(0).toUpperCase() + key.slice(1)} ${raw.trim()}`);
            }
        });

        if (saveOverrides.length > 0) {
            markdown += `> **Saving Throws** ${saveOverrides.join(', ')}  \n`;
        }
        
        if (state.skills) markdown += `> **Skills** ${state.skills}  \n`;
        if (state.damageResistances) markdown += `> **Damage Resistances** ${state.damageResistances}  \n`;
        if (state.damageImmunities) markdown += `> **Damage Immunities** ${state.damageImmunities}  \n`;
        if (state.conditionImmunities) markdown += `> **Condition Immunities** ${state.conditionImmunities}  \n`;
        if (state.senses) markdown += `> **Senses** ${state.senses}  \n`;
        if (state.languages) markdown += `> **Languages** ${state.languages}  \n`;
        markdown += `> **Challenge** ${state.cr} (1,800 XP) **Proficiency Bonus** +${getProficiencyBonus(state.cr)}\n>\n`;

        const formatDesc = (desc) => (desc || '').replace(NEWLINE_REGEX_G, "\n> ");

        if (state.traits.length > 0) {
            markdown += `> ### Traits\n>\n`;
            state.traits.forEach(trait => {
                if (trait.name && trait.description) {
                    markdown += `> ***${trait.name}.*** ${formatDesc(trait.description)}\n>\n`;
                }
            });
        }

        if (state.actions.length > 0) {
            markdown += `> ### Actions\n>\n`;
            state.actions.forEach(action => {
                if (action.name && action.description) {
                    markdown += `> ***${action.name}.*** ${formatDesc(action.description)}\n>\n`;
                }
            });
        }
        
        if (state.bonusActions.length > 0) {
            markdown += `> ### Bonus Actions\n>\n`;
            state.bonusActions.forEach(action => {
                if (action.name && action.description) {
                    markdown += `> ***${action.name}.*** ${formatDesc(action.description)}\n>\n`;
                }
            });
        }

        if (state.reactions.length > 0) {
            markdown += `> ### Reactions\n>\n`;
            state.reactions.forEach(reaction => {
                if (reaction.name && reaction.description) {
                    markdown += `> ***${reaction.name}.*** ${formatDesc(reaction.description)}\n>\n`;
                }
            });
        }

        if (state.legendaryActions.length > 0) {
            markdown += `> ### Legendary Actions\n>\n`;
            const defaultDesc = "The creature can take 3 legendary actions, choosing from the options below. Only one legendary action can be used at a time and only at the end of another creature's turn. The creature regains spent legendary actions at the start of its turn.";
            const legendaryDesc = state.legendaryActionDescription.trim() || defaultDesc;
            
            markdown += `> ${formatDesc(legendaryDesc)}\n>\n`;

            state.legendaryActions.forEach(action => {
                if (action.name && action.description) {
                    markdown += `> ***${action.name}.*** ${formatDesc(action.description)}\n>\n`;
                }
            });
        }
        
        if (state.lairActions) {
            markdown += `> ### Lair Actions\n>\n`;
            const formattedLairActions = state.lairActions.split(NEWLINE_REGEX_G).map(l => l.trim() ? `> ${l}` : '>').join('\n');
            markdown += `${formattedLairActions}\n>\n`;
        }

        if (state.regionalEffects) {
            markdown += `> ### Regional Effects\n>\n`;
            const formattedRegionalEffects = state.regionalEffects.split(NEWLINE_REGEX_G).map(l => l.trim() ? `> ${l}` : '>').join('\n');
            markdown += `${formattedRegionalEffects}\n>\n`;
        }

        return markdown;
    }
    
    // --- SYNCHRONIZATION ---
    function syncFormState() {
        const formView = document.getElementById('form-view');
        if (!formView) return;

        const inputs = formView.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (input.id in state && !input.classList.contains('item-name') && !input.classList.contains('item-description')) {
                if (input.type === 'number') {
                    state[input.id] = parseInt(input.value) || 0;
                } else {
                    state[input.id] = input.value;
                }
            }
        });
    }

    // --- FORM RENDERING ---
    function renderForm() {
        const pb = getProficiencyBonus(state.cr || 0);
        return `
            <div class="form-section">
                <h2>Monster Identity</h2>
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
                        <textarea id="description" rows="5" placeholder="Optional lore and flavor text...">${escapeHtml(state.description)}</textarea>
                    </div>
                </div>
            </div>

            <div class="form-section">
                <h2>Basic Statistics</h2>
                <div class="field-group">
                    <div class="form-field">
                        <label for="ac">Armor Class</label>
                        <input type="text" id="ac" value="${escapeHtml(state.ac)}" placeholder="e.g., 13 (natural armor)">
                    </div>
                    <div class="form-field">
                        <label for="hp">Hit Points</label>
                        <input type="text" id="hp" value="${escapeHtml(state.hp)}" placeholder="e.g., 45 (6d8 + 18)">
                    </div>
                    <div class="form-field">
                        <label for="speed">Speed</label>
                        <input type="text" id="speed" value="${escapeHtml(state.speed)}" placeholder="e.g., 30 ft., swim 30 ft.">
                    </div>
                </div>
            </div>

            <div class="form-section">
                <h2>Ability Scores</h2>
                <p class="help-text">Proficiency Bonus: +${pb}</p>
                <div class="ability-group field-group">
                    <table>
                        <thead>
                            <tr>
                                <th>Ability</th>
                                <th>Score *</th>
                                <th>Mod</th>
                                <th>Save</th>
                                <th>Proficient Save Override</th>
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
                                            <input type="text" id="${ability}Save" value="${escapeHtml(state[ability + 'Save'])}" placeholder="Leave blank to use base save">
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
                        <input type="text" id="skills" value="${escapeHtml(state.skills)}" placeholder="e.g., Perception +3, Stealth +3">
                    </div>
                    <div class="form-field">
                        <label for="damageResistances">Damage Resistances</label>
                        <input type="text" id="damageResistances" value="${escapeHtml(state.damageResistances)}" placeholder="e.g., cold">
                    </div>
                    <div class="form-field">
                        <label for="damageImmunities">Damage Immunities</label>
                        <input type="text" id="damageImmunities" value="${escapeHtml(state.damageImmunities)}" placeholder="e.g., poison">
                    </div>
                    <div class="form-field">
                        <label for="conditionImmunities">Condition Immunities</label>
                        <input type="text" id="conditionImmunities" value="${escapeHtml(state.conditionImmunities)}" placeholder="e.g., poisoned">
                    </div>
                    <div class="form-field">
                        <label for="senses">Senses</label>
                        <input type="text" id="senses" value="${escapeHtml(state.senses)}" placeholder="e.g., darkvision 60 ft., passive Perception 13">
                    </div>
                    <div class="form-field">
                        <label for="languages">Languages</label>
                        <input type="text" id="languages" value="${escapeHtml(state.languages)}" placeholder="e.g., Common, Draconic or —">
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
                    <textarea id="legendaryActionDescription" rows="3" placeholder="Leave blank for default text...">${escapeHtml(state.legendaryActionDescription)}</textarea>
                </div>
                ${renderItemList('legendaryActions')}
                <button type="button" class="add-button" onclick="addItem('legendaryActions')">+ Add Legendary Action</button>
            </div>
            
            <div class="form-section">
                <h2>Lair Actions</h2>
                <div class="form-field full-width">
                    <label for="lairActions">Lair Actions (Optional Text Block)</label>
                    <textarea id="lairActions" rows="5" placeholder="Describe lair actions here...">${escapeHtml(state.lairActions)}</textarea>
                </div>
            </div>
            
            <div class="form-section">
                <h2>Regional Effects</h2>
                <div class="form-field full-width">
                    <label for="regionalEffects">Regional Effects (Optional Text Block)</label>
                    <textarea id="regionalEffects" rows="5" placeholder="Describe regional effects here...">${escapeHtml(state.regionalEffects)}</textarea>
                </div>
            </div>
        `;
    }

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

    function renderItemList(field) {
        if (!state[field]) state[field] = [];
        return `
            <div class="item-list">
                ${state[field].map((item, index) => `
                    <div class="item-entry">
                        <div class="item-header">
                            <input type="text" 
                                class="item-name" 
                                id="${field}-${index}-name"
                                value="${escapeHtml(item.name)}" 
                                placeholder="${singular(field)} Name" 
                                oninput="updateItem('${field}', ${index}, 'name', this.value)">
                            <button type="button" class="remove-button" onclick="removeItem('${field}', ${index})">Remove</button>
                        </div>
                        <textarea 
                            class="item-description" 
                            id="${field}-${index}-description"
                            rows="3"
                            placeholder="${singular(field)} Description" 
                            oninput="updateItem('${field}', ${index}, 'description', this.value)">${escapeHtml(item.description)}</textarea>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    function singular(field) {
        if (field === 'traits') return 'Trait';
        if (field === 'actions') return 'Action';
        if (field === 'bonusActions') return 'Bonus Action';
        if (field === 'reactions') return 'Reaction';
        if (field === 'legendaryActions') return 'Legendary Action';
        return 'Item';
    }

    // --- ITEM LIST MANAGEMENT ---
    function addItem(field) {
        if (!state[field]) state[field] = [];
        state[field].push({ name: '', description: '' });
        render();
    }

    function removeItem(field, index) {
        if (!state[field]) return;
        state[field].splice(index, 1);
        render();
    }

    function updateItem(field, index, prop, value) {
        if (state[field] && state[field][index]) {
            state[field][index][prop] = value;
        }
        const previewView = document.getElementById('preview-view');
        if (previewView && previewView.classList.contains('active')) {
            previewView.innerHTML = renderPreview();
        }
    }

    // --- PREVIEW RENDERING ---
    function renderPreview() {
        syncFormState();
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
                <p class="help-text">This is an approximation of how the statblock will appear in the bestiary.</p>
                ${renderVisualStatBlock()}
            </div>
        `;
    }

    function renderVisualStatBlock() {
        if (!state.title) return '<div class="statblock-placeholder">Fill in the form to see preview...</div>';

        const pb = getProficiencyBonus(state.cr);
        const abilities = getAbilitiesObject(pb);
        
        const abilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
        const saveOverrides = [];
        abilityKeys.forEach(key => {
            const overrideValue = state[key + 'Save'].trim();
            if (overrideValue) {
                saveOverrides.push(`${key.charAt(0).toUpperCase() + key.slice(1)} ${overrideValue}`);
            }
        });

        const descriptionParagraphs = state.description.trim().split(NEWLINE_REGEX_G).filter(p => p.trim());
        
        const optionalStat = (label, value) => value ? `<p><strong>${label}</strong> ${escapeHtml(value)}</p>` : '';
        const formatBlock = (text) => (text || '').split(NEWLINE_REGEX_G).map(p => `<p>${escapeHtml(p)}</p>`).join('');

        // Render visual 2024-style table (HTML approximation)
        const abilityRow1 = `
            <tr>
                <td>Str</td><td>${abilities.str.score}</td><td>${formatModifier(abilities.str.mod)}</td><td>${formatModifier(abilities.str.save)}</td>
                <td>Dex</td><td>${abilities.dex.score}</td><td>${formatModifier(abilities.dex.mod)}</td><td>${formatModifier(abilities.dex.save)}</td>
                <td>Con</td><td>${abilities.con.score}</td><td>${formatModifier(abilities.con.mod)}</td><td>${formatModifier(abilities.con.save)}</td>
            </tr>`;

        const abilityRow2 = `
            <tr>
                <td>Int</td><td>${abilities.int.score}</td><td>${formatModifier(abilities.int.mod)}</td><td>${formatModifier(abilities.int.save)}</td>
                <td>Wis</td><td>${abilities.wis.score}</td><td>${formatModifier(abilities.wis.mod)}</td><td>${formatModifier(abilities.wis.save)}</td>
                <td>Cha</td><td>${abilities.cha.score}</td><td>${formatModifier(abilities.cha.mod)}</td><td>${formatModifier(abilities.cha.save)}</td>
            </tr>`;

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
                    ${optionalStat('Armor Class', state.ac)}
                    ${optionalStat('Hit Points', state.hp)}
                    ${optionalStat('Speed', state.speed)}
                </div>

                <div class="statblock-abilities">
                    <table class="ability-table">
                        <thead>
                            <tr>
                                <th></th><th>Score</th><th>MOD</th><th>SAVE</th>
                                <th></th><th>Score</th><th>MOD</th><th>SAVE</th>
                                <th></th><th>Score</th><th>MOD</th><th>SAVE</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${abilityRow1}
                            ${abilityRow2}
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
                    <p><strong>Challenge</strong> ${escapeHtml(state.cr)} <strong>Proficiency Bonus</strong> +${pb}</p>
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
                
                ${state.bonusActions.length > 0 && state.bonusActions.some(b => b.name) ? `
                    <div class="statblock-section">
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
                
                ${state.legendaryActions.length > 0 && state.legendaryActions.some(l => l.name) ? `
                    <div class="statblock-section">
                        <h3>Legendary Actions</h3>
                        <p>${formatBlock(state.legendaryActionDescription.trim() || "The creature can take 3 legendary actions, choosing from the options below. Only one legendary action can be used at a time and only at the end of another creature's turn. The creature regains spent legendary actions at the start of its turn.")}</p>
                        ${state.legendaryActions.filter(l => l.name).map(l => `<p><strong><em>${escapeHtml(l.name)}.</em></strong> ${formatBlock(l.description)}</p>`).join('')}
                    </div>
                ` : ''}
                
                ${state.lairActions ? `
                    <div class="statblock-section">
                        <h3>Lair Actions</h3>
                        ${formatBlock(state.lairActions)}
                    </div>
                ` : ''}

                ${state.regionalEffects ? `
                    <div class="statblock-section">
                        <h3>Regional Effects</h3>
                        ${formatBlock(state.regionalEffects)}
                    </div>
                ` : ''}
            </div>
        `;
    }

    // --- VIEW MANAGEMENT ---
    function switchView(view) {
        const formView = document.getElementById('form-view');
        const previewView = document.getElementById('preview-view');
        if (!formView || !previewView) return;

        formView.classList.remove('active');
        previewView.classList.remove('active');
        
        document.getElementById(`${view}-view`).classList.add('active');
        
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeButton = document.querySelector(`[data-view="${view}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }

    // --- FILE OPERATIONS ---
    function downloadMarkdown() {
        syncFormState();
        const markdown = generateMarkdown();
        const validation = validateForm();
        
        if (!validation.valid) {
            alert("Please fill in all mandatory fields before downloading:\n- " + validation.errors.join("\n- "));
            return;
        }

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

    // Helper function to parse abilities in standardized format
    function parseAbilities(body, sectionName) {
        const abilities = [];
        const sectionMatch = body.match(new RegExp(`### ${sectionName}\\n\\n([\\s\\S]*?)(?=\\n###|$)`));
        if (!sectionMatch) return abilities;

        const sectionContent = sectionMatch[1];
        const abilityRegex = /\\*\\*\\*([^.]+)\\.\\*\\*\\*\\s+([\\s\\S]*?)(?=\\n\\*\\*\\*|\\n\\n###|$)/g;
        
        let match;
        while ((match = abilityRegex.exec(sectionContent)) !== null) {
            abilities.push({
                name: match[1].trim(),
                description: match[2].trim()
            });
        }
        
        return abilities;
    }

    function loadMarkdownFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        resetState();

        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;

            // --- PARSE YAML FRONT MATTER ---
            const frontMatterMatch = content.match(/^---[\\r\\n]+([\\s\\S]*?)[\\r\\n]+---/);
            if (!frontMatterMatch) {
                alert("No valid front matter found in this file.");
                return;
            }
            const frontMatter = frontMatterMatch[1];
            const lines = frontMatter.split(/\\r?\\n/);
            lines.forEach(line => {
                const colonIndex = line.indexOf(':');
                if (colonIndex === -1) return;
                const key = line.substring(0, colonIndex).trim();
                const value = line.substring(colonIndex + 1).trim();
                if (key in state) {
                    state[key] = value.replace(/^['\"]|['\"]$/g, '');
                }
            });

            // --- PARSE LORE DESCRIPTION ---
            const loreMatch = content.match(/## [^\\r\\n]+[\\r\\n]+[\\r\\n]+([\\s\\S]*?)[\\r\\n]+___/);
            if (loreMatch) {
                state.description = loreMatch[1].trim();
            }

            // --- PARSE ABILITY SCORES FROM TABLE ---
            const abilityTableMatch = content.match(/\\|\\s*STR\\s*\\|\\s*DEX\\s*\\|\\s*CON\\s*\\|\\s*INT\\s*\\|\\s*WIS\\s*\\|\\s*CHA\\s*\\|[\\s\\S]*?\\|\\s*(\\d+)\\s*\\([^)]+\\)\\s*\\|\\s*(\\d+)\\s*\\([^)]+\\)\\s*\\|\\s*(\\d+)\\s*\\([^)]+\\)\\s*\\|\\s*(\\d+)\\s*\\([^)]+\\)\\s*\\|\\s*(\\d+)\\s*\\([^)]+\\)\\s*\\|\\s*(\\d+)\\s*\\([^)]+\\)\\s*\\|/);
            if (abilityTableMatch) {
                state.str = parseInt(abilityTableMatch[1]);
                state.dex = parseInt(abilityTableMatch[2]);
                state.con = parseInt(abilityTableMatch[3]);
                state.int = parseInt(abilityTableMatch[4]);
                state.wis = parseInt(abilityTableMatch[5]);
                state.cha = parseInt(abilityTableMatch[6]);
            }

            // --- PARSE STAT BLOCK BODY ---
            const bodyMatch = content.match(/___[\\s\\S]*$/);
            if (!bodyMatch) return;
            
            let body = bodyMatch[0];

            // Remove all blockquote markers for easier parsing
            body = body.replace(/^>\\s*/gm, '');

            // Parse basic statistics
            const acMatch = body.match(/\\*\\*Armor Class\\*\\*\\s+(.+?)(?=\\s*\\*\\*|\\n)/);
            const hpMatch = body.match(/\\*\\*Hit Points\\*\\*\\s+(.+?)(?=\\s*\\*\\*|\\n)/);
            const speedMatch = body.match(/\\*\\*Speed\\*\\*\\s+(.+)/);

            if (acMatch) state.ac = acMatch[1].trim();
            if (hpMatch) state.hp = hpMatch[1].trim();
            if (speedMatch) state.speed = speedMatch[1].trim();

            // Parse saving throw overrides
            const savingThrowsMatch = body.match(/\\*\\*Saving Throws\\*\\*\\s+(.+)/);
            if (savingThrowsMatch) {
                const saves = savingThrowsMatch[1].trim();
                const strSaveMatch = saves.match(/Str\\s+([\\+\\-]?\\d+)/);
                const dexSaveMatch = saves.match(/Dex\\s+([\\+\\-]?\\d+)/);
                const conSaveMatch = saves.match(/Con\\s+([\\+\\-]?\\d+)/);
                const intSaveMatch = saves.match(/Int\\s+([\\+\\-]?\\d+)/);
                const wisSaveMatch = saves.match(/Wis\\s+([\\+\\-]?\\d+)/);
                const chaSaveMatch = saves.match(/Cha\\s+([\\+\\-]?\\d+)/);
                
                if (strSaveMatch) state.strSave = strSaveMatch[1];
                if (dexSaveMatch) state.dexSave = dexSaveMatch[1];
                if (conSaveMatch) state.conSave = conSaveMatch[1];
                if (intSaveMatch) state.intSave = intSaveMatch[1];
                if (wisSaveMatch) state.wisSave = wisSaveMatch[1];
                if (chaSaveMatch) state.chaSave = chaSaveMatch[1];
            }

            // Parse optional statistics
            const skillsMatch = body.match(/\\*\\*Skills\\*\\*\\s+(.+)/);
            const sensesMatch = body.match(/\\*\\*Senses\\*\\*\\s+(.+)/);
            const languagesMatch = body.match(/\\*\\*Languages\\*\\*\\s+(.+)/);
            const condImmMatch = body.match(/\\*\\*Condition Immunities\\*\\*\\s+(.+)/);
            const damageResMatch = body.match(/\\*\\*Damage Resistances\\*\\*\\s+(.+)/);
            const damageImmMatch = body.match(/\\*\\*Damage Immunities\\*\\*\\s+(.+)/);

            if (skillsMatch) state.skills = skillsMatch[1].trim();
            if (sensesMatch) state.senses = sensesMatch[1].trim();
            if (languagesMatch) state.languages = languagesMatch[1].trim();
            if (condImmMatch) state.conditionImmunities = condImmMatch[1].trim();
            if (damageResMatch) state.damageResistances = damageResMatch[1].trim();
            if (damageImmMatch) state.damageImmunities = damageImmMatch[1].trim();

            // Parse abilities using standardized format
            state.traits = parseAbilities(body, 'Traits');
            state.actions = parseAbilities(body, 'Actions');
            state.bonusActions = parseAbilities(body, 'Bonus Actions');
            state.reactions = parseAbilities(body, 'Reactions');

            // Parse Legendary Actions section
            const legendarySection = body.match(/### Legendary Actions\\n\\n([\\s\\S]*?)(?=\\n###|$)/);
            if (legendarySection) {
                const legendaryContent = legendarySection[1];
                
                // Extract description (everything before first ***)
                const descMatch = legendaryContent.match(/^([\\s\\S]*?)(?=\\n\\*\\*\\*)/);
                if (descMatch) {
                    const desc = descMatch[1].trim();
                    if (desc && !desc.includes('The creature can take 3 legendary actions')) {
                        state.legendaryActionDescription = desc;
                    }
                }
                
                // Parse individual legendary actions
                state.legendaryActions = parseAbilities(body, 'Legendary Actions');
            }

            // Parse Lair Actions
            const lairMatch = body.match(/### Lair Actions\\n\\n([\\s\\S]*?)(?=\\n###|$)/);
            if (lairMatch) {
                state.lairActions = lairMatch[1].trim();
            }

            // Parse Regional Effects
            const regionalMatch = body.match(/### Regional Effects\\n\\n([\\s\\S]*?)(?=\\n###|$)/);
            if (regionalMatch) {
                state.regionalEffects = regionalMatch[1].trim();
            }

            // Re-render form with loaded data
            render();
            switchView('form');
            alert(`Loaded: ${file.name}`);

            event.target.value = null;
        };

        reader.readAsText(file);
    }

    // --- RENDERING ---
    function render() {
        const formView = document.getElementById('form-view');
        const previewView = document.getElementById('preview-view');
        
        if (!formView || !previewView) return;

        const activeTab = previewView.classList.contains('active') ? 'preview' : 'form';
        
        if (activeTab === 'form') {
            saveFocus();
            formView.innerHTML = renderForm();
            restoreFocus();
            attachFormListeners();
        } else {
            previewView.innerHTML = renderPreview();
            formView.innerHTML = renderForm();
            attachFormListeners();
        }
    }

    // Attaches event listeners to form inputs for real-time updates
    function attachFormListeners() {
        const formView = document.getElementById('form-view');
        if (!formView) return;
        
        const dynamicFields = [
            'str', 'dex', 'con', 'int', 'wis', 'cha', 
            'strSave', 'dexSave', 'conSave', 'intSave', 'wisSave', 'chaSave',
            'cr'
        ];

        const inputs = formView.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (!input.classList.contains('item-name') && !input.classList.contains('item-description')) {
                
                const eventType = (input.tagName === 'SELECT' || input.type === 'checkbox') ? 'change' : 'input';

                input.addEventListener(eventType, () => {
                    if (input.type === 'number') {
                        state[input.id] = parseInt(input.value) || 0;
                    } else {
                        state[input.id] = input.value;
                    }

                    if (dynamicFields.includes(input.id)) {
                        render();
                    } else {
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
    function init() {
        const container = document.getElementById('generator-app');
        if (!container) return;

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
        window.switchGeneratorView = function(view) {
            if (view === 'preview') {
                syncFormState(); 
            }
            switchView(view);
            render(); 
        };

        window.downloadStatBlock = downloadMarkdown;
        window.addItem = addItem;
        window.removeItem = removeItem;
        window.updateItem = updateItem;
        window.loadMarkdownFile = loadMarkdownFile;

        // Initial render
        render();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})
