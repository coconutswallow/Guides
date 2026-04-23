/**
 * monster-editor-ui.js
 * Component for generating and rendering the Monster Editor UI templates.
 * Location: \assets\js\monster\monster-editor-ui.js
 * 
 * https://github.com/hawthorneguild/HawthorneTeams/issues/7
 */

import { supabase } from '../supabaseClient.js';
import { getMyMonsters } from './monster-service.js';

/**
 * Renders the primary dashboard view (My Monsters list).
 * @param {HTMLElement} container - The element to render into.
 * @returns {Promise<void>}
 */
export async function renderDashboard(container) {
    container.innerHTML = '<div class="loading">Loading your monsters...</div>';

    const { data: { user } } = await supabase.auth.getUser();
    const discordId = user.user_metadata.provider_id || user.id;
    const monsters = await getMyMonsters(discordId);

    let html = `
        <div class="editor-header d-flex justify-content-between align-items-center">
            <h2>My Monsters</h2>
            <a href="#/new" class="btn btn-primary">+ Create New Monster</a>
        </div>
        <div class="editor-dashboard">
            <table class="table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Version</th>
                        <th>CR</th>
                        <th>Status</th>
                        <th>Last Updated</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (monsters.length === 0) {
        html += '<tr><td colspan="6" class="text-center">No monsters found. Build your first one!</td></tr>';
    } else {
        monsters.forEach(m => {
            const statusClass = m.status ? `status-${m.status.toLowerCase()}` : 'status-draft';
            html += `
                <tr>
                    <td><strong>${m.name}</strong></td>
                    <td>${m.version || '1.0'}</td>
                    <td>${m.cr}</td>
                    <td><span class="status-badge ${statusClass}">${m.status || 'Draft'}</span></td>
                    <td>${new Date(m.updated_at).toLocaleDateString()}</td>
                    <td>
                        ${['Pending', 'Queued'].includes(m.status)
                    ? `<span class="status-badge status-${m.status.toLowerCase()}" style="font-size: 0.7rem;">${m.status === 'Pending' ? 'Pending Review' : 'Queued for Patch'}</span>`
                    : `<a href="#/edit/${m.slug}" class="btn btn-sm btn-info">${m.status === 'Archived' ? 'View' : 'Edit'}</a>`
                }
                        ${m.status === 'Approved' ? `<a href="${(window.MONSTER_EDITOR_CONFIG?.baseUrl || '/Guides/') + 'monsters/#/' + m.slug}" target="_blank" class="btn btn-sm btn-outline-secondary">View Live</a>` : ''}
                    </td>
                </tr>
            `;
        });
    }

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

export function renderEditor(container, currentMonster, lookups, defaultCreator) {
    container.innerHTML = getEditorTemplate(currentMonster, lookups, defaultCreator);
}

/**
 * Generates the massive HTML template for the monster editor form.
 * @param {Object} currentMonster - Current monster data object.
 * @param {Object} lookups - Data lookup tables (species, sizes, etc).
 * @param {string} defaultCreator - Default name for the creator field.
 * @returns {string} HTML Template.
 */
export function getEditorTemplate(currentMonster, lookups, defaultCreator) {
    const isNew = !currentMonster.row_id;
    const isLocked = ['Pending', 'Queued', 'Approved', 'Archived'].includes(currentMonster.status);
    const lockReason = currentMonster.status === 'Pending' ? 'Pending Review'
        : currentMonster.status === 'Queued' ? 'Queued for Patch'
            : currentMonster.status === 'Approved' ? 'Approved'
                : 'Archived';

    return `
        <div class="editor-toolbar" style="display: flex; gap: 1rem; margin-bottom: 2rem; align-items: center; position: sticky; top: 100px; background: var(--color-bg-page); padding: 1rem 0; z-index: 100; border-bottom: 1px solid var(--color-border);">
            <a href="#/" class="btn">← Back</a>
            <h2 style="margin: 0; flex-grow: 1; display: flex; align-items: center; gap: 1rem;">
                ${isNew ? 'New Monster' : 'Edit: ' + currentMonster.name}
                ${!isNew ? `<span class="version-tag" style="background: var(--color-bg-medium); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem; color: var(--color-text-secondary);">v${currentMonster.version || '1.0'}</span>` : ''}
                ${!isNew ? `<span class="status-badge status-${(currentMonster.status || 'draft').toLowerCase()}">${currentMonster.status || 'Draft'}</span>` : '<span class="status-badge status-draft">Draft</span>'}
            </h2>
            <div id="save-status" style="font-size: 0.8rem; color: var(--color-text-secondary);"></div>
            <button type="button" id="btn-save" class="btn btn-save" ${isLocked ? `disabled title="Monster is locked (${lockReason})"` : ''}>Save Draft</button>
            <button type="button" id="btn-preview" class="btn btn-preview">Preview Statblock</button>
            <button type="button" id="btn-submit" class="btn btn-submit" ${isLocked ? `disabled title="Monster is locked (${lockReason})"` : ''}>Submit for Review</button>
            ${currentMonster.status === 'Approved' ? '<button type="button" id="btn-version" class="btn btn-outline-primary" style="margin-left: auto;">Save as New Version</button>' : ''}
        </div>

        ${isLocked ? `
            <div class="alert alert-warning" style="margin-bottom: 2rem;">
                <strong>Locked:</strong> This monster version is currently <strong>${currentMonster.status}</strong> and cannot be edited. 
                ${currentMonster.status === 'Pending' ? 'If you need to make changes, please wait for staff review or contact Admin.' :
                currentMonster.status === 'Queued' ? 'This version is accepted and waiting to be merged into the next patch release.' :
                    currentMonster.status === 'Archived' ? 'This is an archived older version and is read-only.' :
                        'Approved monsters are locked to maintain consistency in the compendium.'}
            </div>
        ` : ''}

        <form id="monster-form" ${isLocked ? 'style="pointer-events: none; opacity: 0.8;"' : ''}>
            <div class="editor-tabs" style="display: flex; gap: 0.5rem; border-bottom: 2px solid var(--color-border); margin-bottom: 2rem;">
                <button type="button" class="tab-btn active" data-tab="tab-overview" style="padding: 10px 20px; border: none; background: transparent; cursor: pointer; border-bottom: 3px solid transparent; font-weight: bold; color: var(--color-text-secondary); font-family: 'Marcellus SC', serif; font-size: 1.1rem; border-radius: 4px 4px 0 0; transition: all 0.2s;">Overview & Lore</button>
                <button type="button" class="tab-btn" data-tab="tab-combat" style="padding: 10px 20px; border: none; background: transparent; cursor: pointer; border-bottom: 3px solid transparent; font-weight: bold; color: var(--color-text-secondary); font-family: 'Marcellus SC', serif; font-size: 1.1rem; border-radius: 4px 4px 0 0; transition: all 0.2s;">Attributes & Combat</button>
                <button type="button" class="tab-btn" data-tab="tab-features" style="padding: 10px 20px; border: none; background: transparent; cursor: pointer; border-bottom: 3px solid transparent; font-weight: bold; color: var(--color-text-secondary); font-family: 'Marcellus SC', serif; font-size: 1.1rem; border-radius: 4px 4px 0 0; transition: all 0.2s;">Traits and Actions</button>
            </div>

            <!-- TAB: OVERVIEW -->
            <div id="tab-overview" class="editor-tab-pane">
                <div class="form-section">
                <h3>Monster Overview</h3>
                <div class="grid-3">
                    <div class="form-group">
                        <label>Monster Name</label>
                        <input type="text" name="name" class="form-control" value="${currentMonster.name || ''}" placeholder="e.g. Ancient Red Dragon" required>
                    </div>
                    <div class="form-group">
                        <label>Creator Name</label>
                        <input type="text" name="creator" class="form-control" value="${currentMonster.creator || defaultCreator}" placeholder="Your Name">
                    </div>
                    <div class="form-group">
                        <label>URL Slug ${parseFloat(currentMonster.version || '1.0') > 1.0 ? '(Locked for Versions > 1)' : ''}</label>
                        <input type="text" name="slug" id="monster-slug" class="form-control" value="${currentMonster.slug || ''}" placeholder="auto-generated-slug" ${parseFloat(currentMonster.version || '1.0') > 1.0 ? 'readonly tabindex="-1"' : ''}>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 140px 1fr 210px 180px; gap: 1rem;">
                    <div class="form-group">
                        <label>Size</label>
                        <select name="size" class="form-control">${renderOptions(lookups?.sizes, currentMonster.size)}</select>
                    </div>
                    <div class="form-group">
                        <label>Species (Can overwrite with custom text)</label>
                        <input type="text" name="species" list="species-list" class="form-control" value="${currentMonster.species || ''}" placeholder="e.g. Humanoid">
                        <datalist id="species-list">
                            ${lookups?.species?.map(s => `<option value="${s.value}">${s.value}</option>`).join('')}
                        </datalist>
                    </div>
                    <div class="form-group">
                        <label>Alignment Prefix (optional)</label>
                        <input type="text" name="alignment_prefix" class="form-control" value="${currentMonster.alignment_prefix || ''}" placeholder="Typically">
                    </div>
                    <div class="form-group">
                        <label>Alignment</label>
                        <input type="text" name="alignment" list="alignment-list" class="form-control" value="${currentMonster.alignment || ''}" placeholder="e.g. Neutral">
                        <datalist id="alignment-list">
                            ${lookups?.alignments?.map(a => `<option value="${a.value}">${a.value}</option>`).join('')}
                        </datalist>
                    </div>
                </div>

                <div style="margin-bottom: 1.5rem; background: var(--color-bg-medium); padding: 1rem; border-radius: 8px; display: flex; align-items: center; gap: 1.5rem;">
                    <div class="form-group" style="margin-bottom: 0; min-width: 130px;">
                        <label>Challenge Rating (CR)</label>
                        <select name="cr" class="form-control">${renderOptions(lookups?.challenge_ratings, currentMonster.cr, 'decimal_value', 'value')}</select>
                    </div>
                    <div class="form-group" style="margin-bottom: 0; min-width: 80px;">
                        <label>Proficiency Bonus</label>
                        <input type="text" id="pb-preview" class="form-control" value="+0" readonly tabindex="-1" style="background: rgba(255,255,255,0.1); border-color: rgba(0,0,0,0.1); font-weight: bold; text-align: center;">
                    </div>
                    <div class="form-group" style="margin-bottom: 0; min-width: 150px;">
                        <label>Experience Points (XP)</label>
                        <input type="text" id="xp-preview" class="form-control" value="0" readonly tabindex="-1" style="background: rgba(255,255,255,0.1); border-color: rgba(0,0,0,0.1); font-weight: bold;">
                    </div>
                </div>

                <div class="form-group">
                    <label>Monster Role / Usage</label>
                    <select name="usage" class="form-control">${renderOptions(lookups?.usages, currentMonster.usage)}</select>
                </div>
            </div>

             <div class="form-section">
                <h3>Lore & Image</h3>
                <div class="grid-2">
                    <div class="form-group">
                        <label>Reference Image URL</label>
                        <input type="url" name="image_url" class="form-control" value="${currentMonster.image_url || ''}" placeholder="Ends with .png, .jpg, .webp...">
                    </div>
                    <div class="form-group">
                        <label>Image Artist / Credit</label>
                        <input type="text" name="image_credit" class="form-control" value="${currentMonster.image_credit || ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label>Background /  Description (Lore)</label>
                    ${getMarkdownWidgetHTML('description', 'description', currentMonster.description || '', '300px')}
                </div>
                <div class="form-group">
                    <label>Additional Info (e.g. Combat Tactics, DM Notes,etc.)</label>
                    ${getMarkdownWidgetHTML('additional_info', 'additional_info', currentMonster.additional_info || '', '150px')}
                </div>
            </div>
            </div> <!-- END TAB OVERVIEW -->

            <!-- TAB: COMBAT -->
            <div id="tab-combat" class="editor-tab-pane" style="display: none;">
            <div class="form-section">
                <h3>Ability Scores</h3>
                <table class="ability-table-editor">
                    <thead>
                        <tr>
                            <th></th><th>Score</th><th>Mod</th><th>Save Proficient</th><th>Save</th>
                            <th></th><th>Score</th><th>Mod</th><th>Save Proficient</th><th>Save</th>
                            <th></th><th>Score</th><th>Mod</th><th>Save Proficient</th><th>Save</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            ${['STR', 'DEX', 'CON'].map(a => `
                                <td class="attr-label">${a}</td>
                                <td><input type="number" name="ability_${a}" class="form-control attr-score" value="${(currentMonster.ability_scores && currentMonster.ability_scores[a]) || 10}"></td>
                                <td class="attr-mod" id="mod-${a}">+0</td>
                                <td><input type="checkbox" class="save-prof" data-attr="${a}" ${currentMonster.saves?.proficiencies?.includes(a) ? 'checked' : ''}></td>
                                <td><input type="number" name="save_${a}" class="form-control save-override" value="${(currentMonster.saves && currentMonster.saves[a]) !== null ? currentMonster.saves[a] : ''}" placeholder="Auto" style="width: 70px; margin: 0 auto; text-align: center;"></td>
                            `).join('')}
                        </tr>
                        <tr>
                            ${['INT', 'WIS', 'CHA'].map(a => `
                                <td class="attr-label">${a}</td>
                                <td><input type="number" name="ability_${a}" class="form-control attr-score" value="${(currentMonster.ability_scores && currentMonster.ability_scores[a]) || 10}"></td>
                                <td class="attr-mod" id="mod-${a}">+0</td>
                                <td><input type="checkbox" class="save-prof" data-attr="${a}" ${currentMonster.saves?.proficiencies?.includes(a) ? 'checked' : ''}></td>
                                <td><input type="number" name="save_${a}" class="form-control save-override" value="${(currentMonster.saves && currentMonster.saves[a]) !== null ? currentMonster.saves[a] : ''}" placeholder="Auto" style="width: 70px; margin: 0 auto; text-align: center;"></td>
                            `).join('')}
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="form-section">
                <h3>Attributes</h3>
                <div style="display: grid; grid-template-columns: 80px 1fr; gap: 1rem;">
                    <div class="form-group">
                        <label>AC</label>
                        <input type="number" name="ac" class="form-control" value="${currentMonster.ac || 10}">
                    </div>
                    <div class="form-group">
                        <label>Conditional AC (e.g. "Natural Armor")</label>
                        <input type="text" name="conditional_ac" class="form-control" value="${currentMonster.conditional_ac || ''}">
                    </div>
                </div>
                <div class="grid-4">
                    <div class="form-group">
                        <label>HP Num Dice</label>
                        <input type="number" name="hit_dice_num" class="form-control" value="${currentMonster.hit_dice_num || 1}">
                    </div>
                    <div class="form-group">
                        <label>HP Die Size</label>
                        <select name="hit_dice_size" class="form-control">${renderOptions([4, 6, 8, 10, 12, 20], currentMonster.hit_dice_size)}</select>
                    </div>
                    <div class="form-group">
                        <label>HP Modifier</label>
                        <input type="number" name="hp_modifier" class="form-control" value="${currentMonster.hp_modifier || 0}">
                    </div>
                    <div class="form-group">
                        <label>Average HP (Preview)</label>
                        <input type="text" id="hp-average" class="form-control" value="0" readonly tabindex="-1">
                    </div>
                </div>
                <div class="grid-3" style="margin-top: 1rem;">
                    <div class="form-group">
                        <label>Speed</label>
                        <input type="text" name="speed" class="form-control" value="${currentMonster.speed || '30 ft.'}">
                    </div>
                    <div class="form-group">
                        <label>Initiative Proficiency</label>
                        <select name="init_prof" class="form-control">
                            <option value="None" ${currentMonster.init_prof === 'None' ? 'selected' : ''}>None</option>
                            <option value="Proficient" ${currentMonster.init_prof === 'Proficient' ? 'selected' : ''}>Proficient</option>
                            <option value="Expert" ${currentMonster.init_prof === 'Expert' ? 'selected' : ''}>Expert</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Initiative Preview</label>
                        <input type="text" id="init-preview" class="form-control" value="0" readonly tabindex="-1">
                    </div>
                </div>
                <div class="grid-2" style="margin-top: 1rem;">
                    <div class="form-group">
                        <label>Proficient Skills</label>
                        <input type="text" name="skills" class="form-control" value="${currentMonster.skills || ''}" placeholder="Arcana +5, Stealth +7">
                    </div>
                    <div class="form-group">
                        <label>Special Senses</label>
                        <input type="text" name="senses" class="form-control" value="${currentMonster.senses || ''}" placeholder="darkvision 60 ft., passive Perception 12">
                    </div>
                </div>
                <div class="form-group">
                    <label>Known Languages</label>
                    <input type="text" name="languages" class="form-control" value="${currentMonster.languages || ''}" placeholder="Common, Draconic">
                </div>
                <div class="grid-2" style="margin-top: 1rem;">
                    <div class="form-group">
                        <label>Damage Vulnerabilities</label>
                        <textarea name="damage_vulnerabilities" class="form-control" rows="2">${currentMonster.damage_vulnerabilities || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Damage Resistances</label>
                        <textarea name="damage_resistances" class="form-control" rows="2">${currentMonster.damage_resistances || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Damage Immunities</label>
                        <textarea name="damage_immunities" class="form-control" rows="2">${currentMonster.damage_immunities || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Condition Immunities</label>
                        <textarea name="condition_immunities" class="form-control" rows="2">${currentMonster.condition_immunities || ''}</textarea>
                    </div>
                </div>
            </div>
            </div> <!-- END TAB COMBAT -->

            <!-- TAB: FEATURES -->
            <div id="tab-features" class="editor-tab-pane" style="display: none;">
            <div class="form-section card" style="background: var(--color-bg-light); border: 1px solid var(--color-border); padding: 1.5rem; margin-bottom: 2rem; border-radius: 8px;">
                <h3 style="margin-top: 0; border-bottom: 2px solid var(--color-primary); padding-bottom: 0.5rem; margin-bottom: 1.5rem;">Traits</h3>
                <div id="traits-container"></div>
                <button type="button" class="btn btn-outline-primary btn-add-grouped" data-type="Trait">+ Add Trait</button>
            </div>

            <div class="form-section card" style="background: var(--color-bg-light); border: 1px solid var(--color-border); padding: 1.5rem; margin-bottom: 2rem; border-radius: 8px;">
                <h3 style="margin-top: 0; border-bottom: 2px solid var(--color-primary); padding-bottom: 0.5rem; margin-bottom: 1.5rem;">Actions</h3>
                <div id="actions-container"></div>
                <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                    <button type="button" class="btn btn-outline-primary btn-add-grouped" data-type="Action">+ Add Action</button>
                    <button type="button" class="btn btn-outline-primary btn-add-grouped" data-type="Bonus Action">+ Add Bonus Action</button>
                    <button type="button" class="btn btn-outline-primary btn-add-grouped" data-type="Reaction">+ Add Reaction</button>
                </div>
            </div>

            <div class="form-section card" style="background: var(--color-bg-light); border: 1px solid var(--color-border); padding: 1.5rem; margin-bottom: 2rem; border-radius: 8px;">
                <h3 style="margin-top: 0; border-bottom: 2px solid var(--color-primary); padding-bottom: 0.5rem; margin-bottom: 1.5rem;">Legendary Actions</h3>
                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label>Legendary Actions Header (Optional)</label>
                    ${getMarkdownWidgetHTML('legendary_header', 'legendary_header', currentMonster.legendary_header || '', '100px')}
                </div>
                <div id="legendary-container"></div>
                <button type="button" class="btn btn-outline-primary btn-add-grouped" data-type="Legendary Action" style="margin-top: 1rem;">+ Add Legendary Action</button>
            </div>

            <div class="form-section card" style="background: var(--color-bg-light); border: 1px solid var(--color-border); padding: 1.5rem; margin-bottom: 2rem; border-radius: 8px;">
                <h3 style="margin-top: 0; border-bottom: 2px solid var(--color-primary); padding-bottom: 0.5rem; margin-bottom: 1.5rem;">Lair Actions</h3>
                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label>Lair Actions Header (Optional)</label>
                    ${getMarkdownWidgetHTML('lair_header', 'lair_header', currentMonster.lair_header || '', '100px')}
                </div>
                <div id="lair-container"></div>
                <button type="button" class="btn btn-outline-primary btn-add-grouped" data-type="Lair Action">+ Add Lair Action</button>
            </div>

            <div class="form-section card" style="background: var(--color-bg-light); border: 1px solid var(--color-border); padding: 1.5rem; margin-bottom: 2rem; border-radius: 8px;">
                <h3 style="margin-top: 0; border-bottom: 2px solid var(--color-primary); padding-bottom: 0.5rem; margin-bottom: 1.5rem;">Regional Effects</h3>
                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label>Regional Effects Header (Optional)</label>
                    ${getMarkdownWidgetHTML('regional_header', 'regional_header', currentMonster.regional_header || '', '100px')}
                </div>
                <div id="regional-container"></div>
                <button type="button" class="btn btn-outline-primary btn-add-grouped" data-type="Regional Effect">+ Add Regional Effect</button>
            </div>
            </div> <!-- END TAB FEATURES -->
        </form>
    `;
}

/**
 * Renders the dynamic lists of features filtered by section.
 * @param {Object} currentMonster - The monster data object.
 */
export function renderFeatureList(currentMonster) {
    const buckets = {
        traits: ['Trait'],
        actions: ['Action', 'Bonus Action', 'Reaction'],
        legendary: ['Legendary Action'],
        lair: ['Lair Action'],
        regional: ['Regional Effect']
    };

    const renderBucket = (types, containerId, hideType = false) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Filter features for this bucket (case-insensitive)
        const filtered = currentMonster.features
            .map((f, i) => ({ ...f, originalIndex: i }))
            .filter(f => types.some(t => t.toLowerCase() === (f.type || '').toLowerCase()));

        container.innerHTML = filtered.map((f, i) => {
            const isExpanded = f.expanded === true;
            return `
            <div class="feature-card accordion-card" data-index="${f.originalIndex}" style="padding: 0; overflow: hidden; margin-bottom: 1rem; border: 1px solid var(--color-border); border-radius: 4px;">
                <div class="accordion-header" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; padding: 0.8rem 1rem; background: var(--color-bg-light); border-bottom: 1px solid var(--color-border); font-family: 'Marcellus SC', serif; color: var(--color-primary);">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span class="accordion-icon" style="transform: ${isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)'}; transition: transform 0.2s;">▼</span>
                        <span style="font-weight: bold;">${hideType ? '' : f.type + ': '}${f.name || '(Unnamed)'}</span>
                    </div>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <button type="button" class="btn btn-sm btn-outline-primary feat-up" ${i === 0 ? 'disabled' : ''} style="padding: 2px 8px; font-size: 0.8rem;" title="Move Up">▲</button>
                        <button type="button" class="btn btn-sm btn-outline-primary feat-down" ${i === filtered.length - 1 ? 'disabled' : ''} style="padding: 2px 8px; font-size: 0.8rem;" title="Move Down">▼</button>
                        <button type="button" class="btn btn-sm btn-outline-primary feat-remove" style="padding: 2px 8px; font-size: 0.8rem;">Remove</button>
                    </div>
                </div>
                <div class="accordion-body" style="display: ${isExpanded ? 'block' : 'none'}; padding: 1rem; background: var(--color-bg-page);">
                    <div class="${hideType ? 'form-group' : 'grid-2'}">
                        ${!hideType ? `
                             <div class="form-group">
                                <label>Type</label>
                                <select class="form-control feat-type">${renderOptions(['Trait', 'Action', 'Bonus Action', 'Reaction', 'Legendary Action', 'Lair Action', 'Regional Effect'], f.type)}</select>
                            </div>
                        ` : ''}
                        <div class="form-group">
                            <label>Name</label>
                            <input type="text" class="form-control feat-name" value="${f.name || ''}" placeholder="e.g. ${f.type === 'Reaction' ? 'Opportunist' : 'Multiattack'}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Description (Markdown)</label>
                        ${getMarkdownWidgetHTML(`feat-desc-${f.originalIndex}`, `feat-desc-${f.originalIndex}`, f.description || '', '150px')}
                    </div>
                </div>
            </div>
            `;
        }).join('');

        // Initialize widgets
        container.querySelectorAll('.md-widget-container').forEach(widget => initMarkdownWidget(widget));
    };

    renderBucket(buckets.traits, 'traits-container', true);
    renderBucket(buckets.actions, 'actions-container', false);
    renderBucket(buckets.legendary, 'legendary-container', true);
    renderBucket(buckets.lair, 'lair-container', true);
    renderBucket(buckets.regional, 'regional-container', true);
}

/**
 * Helper to render HTML <option> tags from an array or object list.
 * @param {Array<string|Object>} arr - Data to map to options.
 * @param {any} selected - The value that should be marked as selected.
 * @param {string} valKey - Key to use for the option value attribute.
 * @param {string} labelKey - Key to use for the display label.
 * @returns {string} HTML string of options.
 */
export function renderOptions(arr, selected, valKey = 'value', labelKey = 'value') {
    if (!arr) return '';
    return arr.map(opt => {
        const val = typeof opt === 'object' ? opt[valKey] : opt;
        const label = typeof opt === 'object' ? (opt[labelKey] || val) : opt;
        return `<option value="${val}" ${val == selected ? 'selected' : ''}>${label}</option>`;
    }).join('');
}

/**
 * Returns the HTML structure for the Markdown Widget.
 * @param {string} id - Unique ID for the widget container.
 * @param {string} name - Name for the textarea input.
 * @param {string} content - Initial content.
 * @param {string} height - Min-height for the editor.
 * @returns {string} HTML Template.
 */
export function getMarkdownWidgetHTML(id, name, content, height = '200px') {
    return `
    <div id="widget-${id}" class="md-widget-container" data-md-id="${id}">
        <div class="md-header">
            <div class="md-tabs">
                <button type="button" class="md-tab active" data-tab="write">Write</button>
                <button type="button" class="md-tab" data-tab="preview">Preview</button>
            </div>
            <div class="md-tools">
                <button type="button" data-cmd="header" data-val="### ">H3</button>
                <button type="button" data-cmd="wrap" data-val="**"><strong>B</strong></button>
                <button type="button" data-cmd="wrap" data-val="*"><em>I</em></button>
                <span class="md-sep">|</span>
                <button type="button" data-cmd="header" data-val="- ">• List</button>
                <button type="button" data-cmd="link">🔗 Link</button>
            </div>
        </div>
        <div class="md-body">
            <textarea id="${id}" name="${name}" class="md-textarea" style="min-height: ${height};" placeholder="Type your markdown here...">${content}</textarea>
            <div id="${id}-preview" class="md-preview-box" style="display: none; min-height: ${height};"></div>
        </div>
    </div>`;
}

/**
 * Initializes the logic for a Markdown Widget container.
 * @param {HTMLElement} container - The .md-widget-container element.
 */
export function initMarkdownWidget(container) {
    const id = container.dataset.mdId;
    const textarea = container.querySelector('textarea');
    const preview = container.querySelector('.md-preview-box');
    const toolsPanel = container.querySelector('.md-tools');

    container.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        if (btn.hasAttribute('data-tab')) {
            const mode = btn.dataset.tab;
            const tabs = container.querySelectorAll('.md-tab');
            if (mode === 'write') {
                textarea.style.display = 'block';
                preview.style.display = 'none';
                toolsPanel.style.display = 'flex';
                tabs[0].classList.add('active');
                tabs[1].classList.remove('active');
            } else {
                if (typeof marked !== 'undefined') {
                    const raw = textarea.value.trim();
                    preview.innerHTML = raw ? marked.parse(raw) : '<em>Nothing to preview.</em>';
                }
                textarea.style.display = 'none';
                preview.style.display = 'block';
                toolsPanel.style.display = 'none';
                tabs[0].classList.remove('active');
                tabs[1].classList.add('active');
            }
        }

        if (btn.hasAttribute('data-cmd')) {
            const cmd = btn.dataset.cmd;
            const val = btn.dataset.val;
            const valEnd = btn.dataset.valEnd || val;

            if (cmd === 'header') insertAtCursor(textarea, val);
            if (cmd === 'wrap') wrapSelection(textarea, val, valEnd);
            if (cmd === 'link') insertLink(textarea);

            // Trigger input event for auto-save/sync
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });

    function insertAtCursor(el, text) {
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const before = el.value.substring(0, start);
        const after = el.value.substring(end);
        if (start > 0 && before.slice(-1) !== '\n') text = "\n" + text;
        el.value = before + text + after;
        el.focus();
        el.selectionStart = el.selectionEnd = start + text.length;
    }

    function wrapSelection(el, startTag, endTag) {
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const text = el.value.substring(start, end);
        el.value = el.value.substring(0, start) + startTag + text + endTag + el.value.substring(end);
        el.focus();
        el.selectionStart = el.selectionEnd = text.length > 0
            ? start + startTag.length + text.length + endTag.length
            : start + startTag.length;
    }

    function insertLink(el) {
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const text = el.value.substring(start, end) || "link text";
        const snippet = `[${text}](url)`;
        el.value = el.value.substring(0, start) + snippet + el.value.substring(end);
        el.focus();
        const urlStart = start + 1 + text.length + 2;
        el.setSelectionRange(urlStart, urlStart + 3);
    }
}
