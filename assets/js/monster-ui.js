// Monster UI Module
// Handles rendering forms, previews, and user interactions
const MonsterUI = (function() {
    'use strict';

    // Constants
    const SIZES = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'];
    const TYPES = ['Aberration', 'Beast', 'Celestial', 'Construct', 'Dragon', 'Elemental', 
                   'Fey', 'Fiend', 'Giant', 'Humanoid', 'Monstrosity', 'Ooze', 'Plant', 'Undead'];
    const CATEGORIES = ['2014 Fair Game', '2014 Full DM Only'];

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') {
            if (unsafe === null || typeof unsafe === 'undefined') {
                unsafe = '';
            } else {
                unsafe = String(unsafe);
            }
        }
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function singular(field) {
        const singulars = {
            'traits': 'Trait',
            'actions': 'Action',
            'bonusActions': 'Bonus Action',
            'reactions': 'Reaction',
            'legendaryActions': 'Legendary Action'
        };
        return singulars[field] || 'Item';
    }

    function renderForm(state) {
        const pb = MonsterCalculator.getProficiencyBonus(state.cr || 0);
        const abilities = MonsterCalculator.calculateAllAbilities(state);

        return `
            ${renderIdentitySection(state)}
            ${renderBasicStatsSection(state)}
            ${renderAbilityScoresSection(state, abilities, pb)}
            ${renderOptionalStatsSection(state)}
            ${renderItemSection(state, 'traits', 'Traits')}
            ${renderItemSection(state, 'actions', 'Actions')}
            ${renderItemSection(state, 'bonusActions', 'Bonus Actions')}
            ${renderItemSection(state, 'reactions', 'Reactions')}
            ${renderLegendaryActionsSection(state)}
            ${renderTextBlockSection(state, 'lairActions', 'Lair Actions')}
            ${renderTextBlockSection(state, 'regionalEffects', 'Regional Effects')}
            ${renderAdditionalInfoSection(state)}
        `;
    }

    function renderIdentitySection(state) {
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
                            ${SIZES.map(s => `<option value="${s}" ${state.size === s ? 'selected' : ''}>${s}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-field">
                        <label for="type">Type *</label>
                        <select id="type">
                            ${TYPES.map(t => `<option value="${t}" ${state.type === t ? 'selected' : ''}>${t}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-field">
                        <label for="alignment">Alignment *</label>
                        <input type="text" id="alignment" value="${escapeHtml(state.alignment)}" placeholder="e.g., Lawful Evil">
                    </div>
                    <div class="form-field">
                        <label for="category">Category *</label>
                        <select id="category">
                            ${CATEGORIES.map(c => `<option value="${c}" ${state.category === c ? 'selected' : ''}>${c}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-field">
                        <label for="creator">Creator *</label>
                        <input type="text" id="creator" value="${escapeHtml(state.creator)}" placeholder="Your Name">
                    </div>
                    <div class="form-field">
                        <label for="image">Image URL</label>
                        <input type="text" id="image" value="${escapeHtml(state.image)}" placeholder="Full URL to image">
                    </div>
                    <div class="form-field span-2">
                        <label for="image_credit">Image Credit</label>
                        <input type="text" id="image_credit" value="${escapeHtml(state.image_credit)}" placeholder="Artist and Source">
                    </div>
                    <div class="form-field full-width">
                        <label for="description">Lore Description</label>
                        <textarea id="description" rows="5" placeholder="Optional lore and flavor text...">${escapeHtml(state.description)}</textarea>
                    </div>
                </div>
            </div>
        `;
    }

    function renderBasicStatsSection(state) {
        return `
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
                    <div class="form-field">
                        <label for="initiativeProficiency">Initiative Proficiency</label>
                        <select id="initiativeProficiency">
                            <option value="0" ${state.initiativeProficiency == '0' ? 'selected' : ''}>None (Dex Mod)</option>
                            <option value="1" ${state.initiativeProficiency == '1' ? 'selected' : ''}>Proficient (+PB)</option>
                            <option value="2" ${state.initiativeProficiency == '2' ? 'selected' : ''}>Expertise (+2 PB)</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    }

    function renderAbilityScoresSection(state, abilities, pb) {
        const abilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
        
        return `
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
                            ${abilityKeys.map(ability => {
                                return `
                                    <tr>
                                        <td>${ability.toUpperCase()}</td>
                                        <td>
                                            <input type="number" class="ability-score-input" id="${ability}" min="1" max="30" value="${state[ability]}">
                                        </td>
                                        <td>${abilities[ability].formattedMod}</td>
                                        <td>${abilities[ability].save}</td>
                                        <td>
                                            <input type="text" id="${ability}Save" value="${escapeHtml(state[ability + 'Save'])}" placeholder="+0">
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    function renderOptionalStatsSection(state) {
        return `
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
        `;
    }

    function renderItemSection(state, field, title) {
        const singularTitle = singular(field);
        return `
            <div class="form-section">
                <h2>${title}</h2>
                ${renderItemList(state, field)}
                <button type="button" class="add-button" data-field="${field}">${'+ Add ' + singularTitle}</button>
            </div>
        `;
    }

    function renderItemList(state, field) {
        if (!state[field]) state[field] = [];
        
        return `
            <div class="item-list" data-field="${field}">
                ${state[field].map((item, index) => `
                    <div class="item-entry" data-index="${index}">
                        <div class="item-header">
                            <input type="text" 
                                class="item-name" 
                                data-field="${field}"
                                data-index="${index}"
                                data-prop="name"
                                value="${escapeHtml(item.name)}" 
                                placeholder="${singular(field)} Name">
                            <button type="button" class="remove-button" data-field="${field}" data-index="${index}">Remove</button>
                        </div>
                        <textarea 
                            class="item-description" 
                            data-field="${field}"
                            data-index="${index}"
                            data-prop="description"
                            rows="3"
                            placeholder="${singular(field)} Description">${escapeHtml(item.description)}</textarea>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function renderLegendaryActionsSection(state) {
        return `
            <div class="form-section">
                <h2>Legendary Actions</h2>
                <div class="form-field full-width">
                    <label for="legendaryActionDescription">Legendary Action Description (optional)</label>
                    <textarea id="legendaryActionDescription" rows="3" placeholder="Leave blank for default text...">${escapeHtml(state.legendaryActionDescription)}</textarea>
                </div>
                ${renderItemList(state, 'legendaryActions')}
                <button type="button" class="add-button" data-field="legendaryActions">+ Add Legendary Action</button>
            </div>
        `;
    }

    function renderTextBlockSection(state, field, title) {
        return `
            <div class="form-section">
                <h2>${title}</h2>
                <div class="form-field full-width">
                    <label for="${field}">${title} (Optional Text Block)</label>
                    <textarea id="${field}" rows="5" placeholder="Describe ${title.toLowerCase()} here...">${escapeHtml(state[field])}</textarea>
                </div>
            </div>
        `;
    }

    function renderAdditionalInfoSection(state) {
        return `
            <div class="form-section">
                <h2>Additional Information</h2>
                <div class="form-field full-width">
                    <label for="additionalInfo">Custom Traits, Tactics, etc. (Markdown Supported)</label>
                    <textarea id="additionalInfo" rows="8" placeholder="Enter any extra markdown content here (like Tactics or Customizable Traits)...">${escapeHtml(state.additionalInfo)}</textarea>
                </div>
            </div>
        `;
    }

    function renderPreview(state) {
        const validation = MonsterValidator.validateMonster(state);
        const abilities = MonsterCalculator.calculateAllAbilities(state);
        const markdown = MonsterGenerator.generateMarkdown(state, abilities);

        return `
            <div class="preview-messages">
                ${!validation.valid ? `
                    <div class="error-box">
                        <h3>⚠️ Validation Errors:</h3>
                        <ul>
                            ${validation.errors.map(e => `<li>${escapeHtml(e)}</li>`).join('')}
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
                ${renderVisualStatBlock(state, abilities)}
            </div>
        `;
    }

    function parseMarkdown(text) {
        if (!text) return '';
        let html = text;
        html = html.replace(/^(---+|___+)$/gm, '<hr class="statblock-divider">');
        html = html.replace(/^#### (.+)$/gm, '<h6>$1</h6>');
        html = html.replace(/^### (.+)$/gm, '<h5>$1</h5>');
        html = html.replace(/^## (.+)$/gm, '<h4>$1</h4>');
        html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        html = parseMarkdownTables(html);
        const paragraphs = html.split(/\n\n+/);
        html = paragraphs.map(p => {
            p = p.trim();
            if (!p) return '';
            if (p.startsWith('<h') || p.startsWith('<hr') || p.startsWith('<table')) {
                return p;
            }
            if (p.startsWith('-') || p.startsWith('*')) {
                const items = p.split(/\n/).map(line => {
                    line = line.trim();
                    if (line.startsWith('-') || line.startsWith('*')) {
                        return `<li>${line.substring(1).trim()}</li>`;
                    }
                    return line;
                }).join('');
                return `<ul>${items}</ul>`;
            }
            return `<p>${p}</p>`;
        }).join('');
        return html;
    }

    function parseMarkdownTables(text) {
        const lines = text.split('\n');
        let inTable = false;
        let tableLines = [];
        let result = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('|') && line.endsWith('|')) {
                if (!inTable) {
                    inTable = true;
                    tableLines = [];
                }
                tableLines.push(line);
            } else {
                if (inTable) {
                    result.push(convertTableToHtml(tableLines));
                    inTable = false;
                    tableLines = [];
                }
                result.push(line);
            }
        }
        if (inTable && tableLines.length > 0) {
            result.push(convertTableToHtml(tableLines));
        }
        return result.join('\n');
    }

    function convertTableToHtml(tableLines) {
        if (tableLines.length < 2) return tableLines.join('\n');
        const rows = tableLines.map(line => {
            return line.substring(1, line.length - 1).split('|').map(cell => cell.trim());
        });
        const headers = rows[0];
        const dataRows = rows.slice(2);
        let html = '<table>\n<thead>\n<tr>\n';
        headers.forEach(header => { html += `<th>${header}</th>\n`; });
        html += '</tr>\n</thead>\n<tbody>\n';
        dataRows.forEach(row => {
            html += '<tr>\n';
            row.forEach(cell => { html += `<td>${cell}</td>\n`; });
            html += '</tr>\n';
        });
        html += '</tbody>\n</table>';
        return html;
    }

    function renderVisualStatBlock(state, abilities) {
        if (!state.title) {
            return '<div class="statblock-placeholder">Fill in the form to see preview...</div>';
        }

        const pb = MonsterCalculator.getProficiencyBonus(state.cr);
        const init = MonsterCalculator.calculateInitiative(state.dex, state.cr, state.initiativeProficiency);

        const optionalStat = (label, value) => value ? `<p><strong>${label}</strong> ${escapeHtml(value)}</p>` : '';

        const abilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
        const saveOverrides = [];
        abilityKeys.forEach(key => {
            if (abilities[key].hasOverride) {
                const name = key.charAt(0).toUpperCase() + key.slice(1);
                saveOverrides.push(`${name} ${abilities[key].saveOverride}`);
            }
        });

        const descriptionHtml = state.description.trim() ? parseMarkdown(state.description.trim()) : '';
        const additionalInfoHtml = state.additionalInfo && state.additionalInfo.trim() 
                                   ? parseMarkdown(state.additionalInfo.trim()) 
                                   : '';
        
        // NEW: Parse markdown for Lair Actions and Regional Effects
        const lairActionsHtml = state.lairActions && state.lairActions.trim() 
                                ? parseMarkdown(state.lairActions.trim()) 
                                : '';
        const regionalEffectsHtml = state.regionalEffects && state.regionalEffects.trim() 
                                    ? parseMarkdown(state.regionalEffects.trim()) 
                                    : '';

        return `
            ${descriptionHtml ? `
                <div class="monster-description">
                    ${descriptionHtml}
                </div>
                <hr class="statblock-divider">
            ` : ''}
            <blockquote class="stat-block statblock-visual">
                <h2>${escapeHtml(state.title)}</h2>
                <p><em>${escapeHtml(state.size)} ${escapeHtml(state.type.toLowerCase())}, ${escapeHtml(state.alignment.toLowerCase())}</em></p>

                <div style="display: grid; grid-template-columns: max-content max-content; justify-content: start; column-gap: 4em; margin-bottom: 10px;">
                    <div><strong>AC</strong> ${escapeHtml(state.ac || '—')}</div>
                    <div><strong>Initiative</strong> ${init.formatted} (${init.score})</div>
                    <div style="grid-column: 1 / -1;"><strong>HP</strong> ${escapeHtml(state.hp || '—')}</div>
                    <div style="grid-column: 1 / -1;"><strong>Speed</strong> ${escapeHtml(state.speed || '—')}</div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th></th><th></th><th>MOD</th><th>SAVE</th>
                            <th></th><th></th><th>MOD</th><th>SAVE</th>
                            <th></th><th></th><th>MOD</th><th>SAVE</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Str</strong></td><td>${abilities.str.score}</td><td>${abilities.str.formattedMod}</td><td>${abilities.str.save}</td>
                            <td><strong>Dex</strong></td><td>${abilities.dex.score}</td><td>${abilities.dex.formattedMod}</td><td>${abilities.dex.save}</td>
                            <td><strong>Con</strong></td><td>${abilities.con.score}</td><td>${abilities.con.formattedMod}</td><td>${abilities.con.save}</td>
                        </tr>
                        <tr>
                            <td><strong>Int</strong></td><td>${abilities.int.score}</td><td>${abilities.int.formattedMod}</td><td>${abilities.int.save}</td>
                            <td><strong>Wis</strong></td><td>${abilities.wis.score}</td><td>${abilities.wis.formattedMod}</td><td>${abilities.wis.save}</td>
                            <td><strong>Cha</strong></td><td>${abilities.cha.score}</td><td>${abilities.cha.formattedMod}</td><td>${abilities.cha.save}</td>
                        </tr>
                    </tbody>
                </table>

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

                ${renderVisualItemSection(state.traits, 'Traits')}
                ${renderVisualItemSection(state.actions, 'Actions')}
                ${renderVisualItemSection(state.bonusActions, 'Bonus Actions')}
                ${renderVisualItemSection(state.reactions, 'Reactions')}
                ${renderVisualLegendaryActions(state)}
                ${lairActionsHtml ? `
                    <h3>Lair Actions</h3>
                    ${lairActionsHtml}
                ` : ''}
                ${regionalEffectsHtml ? `
                    <h3>Regional Effects</h3>
                    ${regionalEffectsHtml}
                ` : ''}
            </blockquote>
            
            ${additionalInfoHtml ? `
                <hr class="statblock-divider">
                <div class="monster-description">
                    ${additionalInfoHtml}
                </div>
            ` : ''}
        `;
    }

    function renderVisualItemSection(items, title) {
        if (!items || items.length === 0 || !items.some(i => i.name)) return '';
        const validItems = items.filter(i => i.name && i.name.trim());
        if (validItems.length === 0) return '';
        return `
            <h3>${title}</h3>
            ${validItems.map(item => {
                const desc = item.description ? item.description.split(/\n/).map(p => escapeHtml(p)).join(' ') : '';
                return `<p><strong><em>${escapeHtml(item.name)}.</em></strong> ${desc}</p>`;
            }).join('')}
        `;
    }

    function renderVisualLegendaryActions(state) {
        if (!state.legendaryActions || state.legendaryActions.length === 0 || !state.legendaryActions.some(l => l.name)) return '';
        const validActions = state.legendaryActions.filter(l => l.name && l.name.trim());
        if (validActions.length === 0) return '';
        const defaultDesc = "The creature can take 3 legendary actions, choosing from the options below. Only one legendary action can be used at a time and only at the end of another creature's turn. The creature regains spent legendary actions at the start of its turn.";
        const desc = state.legendaryActionDescription.trim() || defaultDesc;
        return `
            <h3>Legendary Actions</h3>
            <p>${escapeHtml(desc)}</p>
            ${validActions.map(action => {
                const actionDesc = action.description ? action.description.split(/\n/).map(p => escapeHtml(p)).join(' ') : '';
                return `<p><strong><em>${escapeHtml(action.name)}.</em></strong> ${actionDesc}</p>`;
            }).join('')}
        `;
    }

    return {
        renderForm,
        renderPreview,
        escapeHtml,
        SIZES,
        TYPES
    };

})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MonsterUI;
}