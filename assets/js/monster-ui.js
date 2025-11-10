// Monster UI Module
// Handles rendering forms, previews, and user interactions
const MonsterUI = (function() {
    'use strict';

    // Constants
    const SIZES = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'];
    const TYPES = ['Aberration', 'Beast', 'Celestial', 'Construct', 'Dragon', 'Elemental', 
                   'Fey', 'Fiend', 'Giant', 'Humanoid', 'Monstrosity', 'Ooze', 'Plant', 'Undead'];

    /**
     * Escape HTML to prevent XSS
     * @param {*} unsafe - Value to escape
     * @returns {string} Escaped string
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

    /**
     * Get singular form of section name
     * @param {string} field - Field name (e.g., "traits")
     * @returns {string} Singular form
     */
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

    /**
     * Render the main form
     * @param {Object} state - Monster state
     * @returns {string} HTML for form
     */
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
        `;
    }

    /**
     * Render Monster Identity section
     */
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
        `;
    }

    /**
     * Render Basic Statistics section
     */
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
                </div>
            </div>
        `;
    }

    /**
     * Render Ability Scores section
     */
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

    /**
     * Render Optional Statistics section
     */
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

    /**
     * Render an item section (Traits, Actions, etc.)
     */
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

    /**
     * Render list of items (name/description pairs)
     */
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

    /**
     * Render Legendary Actions section
     */
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

    /**
     * Render text block section (Lair Actions, Regional Effects)
     */
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

    /**
     * Render preview view
     */
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

    /**
     * Render visual stat block preview
     */
    function renderVisualStatBlock(state, abilities) {
        if (!state.title) {
            return '<div class="statblock-placeholder">Fill in the form to see preview...</div>';
        }

        const pb = MonsterCalculator.getProficiencyBonus(state.cr);
        const descriptionParagraphs = state.description.trim().split(/\n/).filter(p => p.trim());

        // Helper for optional stats
        const optionalStat = (label, value) => value ? `<p><strong>${label}</strong> ${escapeHtml(value)}</p>` : '';
        
        // Helper for text blocks
        const formatBlock = (text) => {
            if (!text) return '';
            return text.split(/\n/).map(p => `<p>${escapeHtml(p)}</p>`).join('');
        };

        // Get saving throw overrides for display in the "Saving Throws" line
        const abilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
        const saveOverrides = [];
        abilityKeys.forEach(key => {
            if (abilities[key].hasOverride) {
                const name = key.charAt(0).toUpperCase() + key.slice(1);
                saveOverrides.push(`${name} ${abilities[key].save}`);
            }
        });

        return `
            <blockquote class="stat-block statblock-visual">
                <h2>${escapeHtml(state.title)}</h2>
                <p><em>${escapeHtml(state.size)} ${escapeHtml(state.type.toLowerCase())}, ${escapeHtml(state.alignment.toLowerCase())}</em></p>
                
                ${descriptionParagraphs.length > 0 ? `
                    <div class="monster-description-preview">
                        ${descriptionParagraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('')}
                    </div>
                ` : ''}

                <p><strong>Armor Class</strong> ${escapeHtml(state.ac || '—')}</p>
                <p><strong>Hit Points</strong> ${escapeHtml(state.hp || '—')}</p>
                <p><strong>Speed</strong> ${escapeHtml(state.speed || '—')}</p>

                <div class="statblock-abilities">
                    <table>
                        <thead>
                            <tr>
                                <th>STR</th><th>DEX</th><th>CON</th><th>INT</th><th>WIS</th><th>CHA</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>${abilities.str.score} (${abilities.str.formattedMod})</td>
                                <td>${abilities.dex.score} (${abilities.dex.formattedMod})</td>
                                <td>${abilities.con.score} (${abilities.con.formattedMod})</td>
                                <td>${abilities.int.score} (${abilities.int.formattedMod})</td>
                                <td>${abilities.wis.score} (${abilities.wis.formattedMod})</td>
                                <td>${abilities.cha.score} (${abilities.cha.formattedMod})</td>
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
                    <p><strong>Challenge</strong> ${escapeHtml(state.cr)} <strong>Proficiency Bonus</strong> +${pb}</p>
                </div>

                ${renderVisualItemSection(state.traits, 'Traits')}
                ${renderVisualItemSection(state.actions, 'Actions')}
                ${renderVisualItemSection(state.bonusActions, 'Bonus Actions')}
                ${renderVisualItemSection(state.reactions, 'Reactions')}
                ${renderVisualLegendaryActions(state)}
                ${state.lairActions ? `
                    <h3>Lair Actions</h3>
                    ${formatBlock(state.lairActions)}
                ` : ''}
                ${state.regionalEffects ? `
                    <h3>Regional Effects</h3>
                    ${formatBlock(state.regionalEffects)}
                ` : ''}
            </blockquote>
        `;
    }

    /**
     * Render visual item section
     */
    function renderVisualItemSection(items, title) {
        if (!items || items.length === 0 || !items.some(i => i.name)) {
            return '';
        }

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

    /**
     * Render visual legendary actions
     */
    function renderVisualLegendaryActions(state) {
        if (!state.legendaryActions || state.legendaryActions.length === 0 || 
            !state.legendaryActions.some(l => l.name)) {
            return '';
        }

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

    // Public API
    return {
        renderForm,
        renderPreview,
        escapeHtml,
        SIZES,
        TYPES
    };

})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MonsterUI;
}