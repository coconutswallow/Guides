import { getMonsterBySlug } from '../monster-service.js';
import { 
    calculatePB, 
    calculateXP, 
    calculateMod, 
    formatSign, 
    calculateHPString, 
    formatInitiative 
} from '../monster-utils.js';

/**
 * Main page view: Fetches monster by slug and renders the statblock.
 * @param {HTMLElement} container - The app container element.
 * @param {Object} params - Router parameters.
 * @param {string} params.slug - The slug of the monster to load.
 * @returns {Promise<void>}
 */
export async function renderMonsterDetail(container, { slug }) {
    container.innerHTML = '<div class="loading">Loading Monster Statblock...</div>';
    
    try {
        const monster = await getMonsterBySlug(slug);
        if (!monster) {
            container.innerHTML = `<div class="alert alert-danger">Monster "${slug}" not found.</div>`;
            return;
        }

        container.innerHTML = `
            <div class="monster-view-header" style="margin-bottom: 2rem;">
                <a href="#/" class="btn" style="background: var(--color-primary); color: white; margin-bottom: 1rem; text-decoration: none; padding: 0.5rem 1rem; display: inline-block;">&larr; BACK TO MONSTER COMPENDIUM</a>
                <h1 style="margin: 0; font-family: var(--font-header); color: var(--color-primary); font-size: 2.5rem; text-transform: uppercase;">${monster.name || 'Unnamed Monster'}</h1>
            </div>
            <div id="monster-statblock-container"></div>
        `; 
        
        const statblockTarget = container.querySelector('#monster-statblock-container');
        renderMonsterStatblock(statblockTarget, monster);
    } catch (err) {
        console.error('[MonsterDetail] Failed to load monster:', err);
        container.innerHTML = '<div class="alert alert-danger">Error loading monster data.</div>';
    }
}

/**
 * Main rendering component for a monster statblock.
 * Handles the two-column layout for lore/images and the card itself.
 * @param {HTMLElement} container - The wrapper for the statblock.
 * @param {Object} monster - The full monster data object.
 * @returns {void}
 */
export function renderMonsterStatblock(container, monster) {
    if (!container || !monster) return;

    try {
        // Apply Page Wide Class to parents if in a page context
        const parentPage = container.closest('.page');
        if (parentPage) {
            parentPage.classList.add('page-wide');
        }

        // --- LAYOUT LOGIC ---
        const hasLeftContent = monster.image_url || monster.description || monster.additional_info;
        const layoutClass = hasLeftContent ? 'has-lore' : 'no-lore';
        
        // Calculations
        const pb = calculatePB(monster.cr);
        const xp = calculateXP(monster.cr);
        
        // SAFEGUARD: Ensure we have an array before filtering
        const featureList = monster.features || [];

        const features = {
            Trait: featureList.filter(f => (f.type || '').toLowerCase() === 'trait'),
            Action: featureList.filter(f => (f.type || '').toLowerCase() === 'action'),
            Bonus: featureList.filter(f => (f.type || '').toLowerCase() === 'bonus' || (f.type || '').toLowerCase() === 'bonus action'),
            Reaction: featureList.filter(f => (f.type || '').toLowerCase() === 'reaction'),
            Legendary: featureList.filter(f => (f.type || '').toLowerCase() === 'legendary' || (f.type || '').toLowerCase() === 'legendary action'),
            Lair: featureList.filter(f => (f.type || '').toLowerCase() === 'lair' || (f.type || '').toLowerCase() === 'lair action'),
            Regional: featureList.filter(f => (f.type || '').toLowerCase() === 'regional' || (f.type || '').toLowerCase() === 'regional effect'),
        };

    const abilitiesHTML = renderAbilityTable(monster.ability_scores, monster.saves, pb);

    const vuln = monster.damage_vulnerabilities || monster.vulnerabilities;
    const res = monster.damage_resistances || monster.resistances;
    const imm = monster.damage_immunities || monster.immunities;
    const conImm = monster.condition_immunities;

    // Helper to format alignment string (e.g. "Typically Neutral" vs "Neutral")
    const alignmentText = monster.alignment_prefix 
        ? `${monster.alignment_prefix} ${monster.alignment}` 
        : monster.alignment;

    const template = `
        <div class="monster-detail-layout ${layoutClass}">
            
            ${hasLeftContent ? `
            <div class="left-col">
                <div class="monster-lore-container">
                    ${monster.image_url ? `
                    <div class="monster-image-container" style="margin-bottom: 1.5rem;">
                        <img src="${monster.image_url}" alt="${monster.name}" style="width: 100%; border-radius: var(--border-radius); border: 4px solid var(--color-primary);">
                        ${monster.image_credit ? `<p class="image-caption">Art by ${monster.image_credit}</p>` : ''}
                    </div>` : ''}

                    <div class="monster-description">
                        ${parseMarkdown(monster.description)}
                        
                        ${monster.additional_info ? `
                            <div class="monster-additional-info" style="margin-top: 1.5rem;">
                                ${parseMarkdown(monster.additional_info)}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
            ` : ''}

            <div class="right-col"> 
                <blockquote class="stat-block">
                    <h2>${monster.name || 'Unnamed Monster'}</h2>
                    <p><em>${monster.size || 'Medium'} ${monster.species || 'Humanoid'}, ${alignmentText}</em></p>
                    <hr>
                    
                    <div class="stats-container">
                        <div class="stat-row-split">
                            <div class="stat-item">
                                <strong>AC</strong> ${monster.ac} ${monster.conditional_ac || ''}
                            </div>
                            <div class="stat-item">
                                <strong>Initiative</strong> ${formatInitiative(monster.ability_scores?.DEX || 10, monster.init_prof, pb)}
                            </div>
                        </div>

                        <div class="stat-row">
                            <strong>HP</strong> ${calculateHPString(monster.hit_dice_num, monster.hit_dice_size, monster.hp_modifier)}
                        </div>

                        <div class="stat-row">
                            <strong>Speed</strong> ${monster.speed || '30 ft.'}
                        </div>
                    </div>

                    <hr>
                    ${abilitiesHTML}
                    <hr>

                    <div class="vitals-container">
                        ${vuln ? `<div class="stat-row"><strong>Damage Vulnerabilities</strong> ${vuln}</div>` : ''}
                        ${res ? `<div class="stat-row"><strong>Damage Resistances</strong> ${res}</div>` : ''}
                        ${imm ? `<div class="stat-row"><strong>Damage Immunities</strong> ${imm}</div>` : ''}
                        ${conImm ? `<div class="stat-row"><strong>Condition Immunities</strong> ${conImm}</div>` : ''}
                        
                        <div class="stat-row">
                            <strong>Senses</strong> ${monster.senses || 'passive Perception 10'}
                        </div>
                        <div class="stat-row">
                            <strong>Languages</strong> ${monster.languages || '—'}
                        </div>
                        <div class="stat-row-split">
                            <div class="stat-item">
                                <strong>CR</strong> ${monster.cr} (${xp.toLocaleString('en-US')} XP)
                            </div>
                            <div class="stat-item">
                                <strong>PB</strong> +${pb}
                            </div>
                        </div>
                    </div>

                    <hr>

                    <!-- FEATURES SECTIONS -->
                    <div class="features-container">
                        ${renderFeatureBucket(features.Trait)}
                        ${renderFeatureBucket(features.Action, 'Actions')}
                        ${renderFeatureBucket(features.Bonus, 'Bonus Actions')}
                        ${renderFeatureBucket(features.Reaction, 'Reactions')}
                        
                        ${features.Legendary.length > 0 ? `
                            <h3>Legendary Actions</h3>
                            ${monster.legendary_header ? `<p><em>${monster.legendary_header}</em></p>` : ''}
                            ${renderFeatureList(features.Legendary)}
                        ` : ''}

                        ${features.Lair.length > 0 ? `
                            <h3>Lair Actions</h3>
                            ${monster.lair_header ? `<p><em>${monster.lair_header}</em></p>` : ''}
                            ${renderFeatureList(features.Lair)}
                        ` : ''}

                        ${features.Regional.length > 0 ? `
                            <h3>Regional Effects</h3>
                            ${monster.regional_header ? `<p><em>${monster.regional_header}</em></p>` : ''}
                            ${renderFeatureList(features.Regional)}
                        ` : ''}
                    </div>

                    ${monster.creator_display_name ? `
                        <div class="statblock-creator">
                            Created by ${monster.creator_display_name}
                        </div>
                    ` : ''}
                </blockquote>
            </div>
        </div>
    `;

        container.innerHTML = template;
    } catch (err) {
        console.error("Render Error:", err);
        container.innerHTML = `<div class="alert alert-danger" style="color:red; padding:20px; font-weight:bold;">Render Crash: ${err.message}<br><br>${err.stack}</div>`;
    }
}

/**
 * Renders the ability scores table with modifiers and saves.
 * @param {Object} scores - Ability scores object (STR, DEX, etc).
 * @param {Object} saves - Save overrides object.
 * @param {number} pb - Proficiency Bonus.
 * @returns {string} HTML string.
 */
function renderAbilityTable(scores, saves, pb) {
    const abilities = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
    const getCellData = (attr) => {
        const score = scores && scores[attr] ? scores[attr] : 10;
        const mod = calculateMod(score);
        let saveMod = mod; 
        if (saves && saves[attr] !== undefined && saves[attr] !== null) {
            saveMod = saves[attr];
        }
        return { score, mod: formatSign(mod), save: formatSign(saveMod) };
    };

    const data = abilities.reduce((acc, attr) => ({...acc, [attr]: getCellData(attr)}), {});

    return `
    <table class="ability-table">
        <thead>
            <tr>
                <th></th><th>Score</th><th>Mod</th><th>Save</th>
                <th></th><th>Score</th><th>Mod</th><th>Save</th>
                <th></th><th>Score</th><th>Mod</th><th>Save</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>STR</strong></td><td>${data.STR.score}</td><td>${data.STR.mod}</td><td>${data.STR.save}</td>
                <td><strong>DEX</strong></td><td>${data.DEX.score}</td><td>${data.DEX.mod}</td><td>${data.DEX.save}</td>
                <td><strong>CON</strong></td><td>${data.CON.score}</td><td>${data.CON.mod}</td><td>${data.CON.save}</td>
            </tr>
            <tr>
                <td><strong>INT</strong></td><td>${data.INT.score}</td><td>${data.INT.mod}</td><td>${data.INT.save}</td>
                <td><strong>WIS</strong></td><td>${data.WIS.score}</td><td>${data.WIS.mod}</td><td>${data.WIS.save}</td>
                <td><strong>CHA</strong></td><td>${data.CHA.score}</td><td>${data.CHA.mod}</td><td>${data.CHA.save}</td>
            </tr>
        </tbody>
    </table>`;
}

/**
 * Renders a bucket of features with an optional title.
 * @param {Object[]} list - Array of feature objects.
 * @param {string} [title] - Optional title for the bucket.
 * @returns {string} HTML string.
 */
function renderFeatureBucket(list, title) {
    if (!list || list.length === 0) return '';
    return `
        ${title ? `<h3>${title}</h3>` : ''}
        ${renderFeatureList(list)}
    `;
}

/**
 * Renders an array of features as HTML items.
 * @param {Object[]} list - Array of feature objects.
 * @returns {string} HTML string.
 */
function renderFeatureList(list) {
    return list.map(f => {
        let html = parseMarkdown(f.description);
        const titleHtml = `<strong><em>${f.name}.</em></strong> `;
        if (html.startsWith('<p>')) {
            html = html.replace('<p>', `<p>${titleHtml}`);
        } else {
            html = `<p>${titleHtml}</p>` + html;
        }
        return `<div class="feature-item">${html}</div>`;
    }).join('');
}

/**
 * Parses markdown text into HTML.
 * @param {string} text - Markdown content.
 * @returns {string} HTML content.
 */
function parseMarkdown(text) {
    if (!text) return '';
    if (typeof marked !== 'undefined') return marked.parse(text);
    if (typeof window !== 'undefined' && window.marked) return window.marked.parse(text);
    return `<p>${text}</p>`; // Fallback if marked is missing
}