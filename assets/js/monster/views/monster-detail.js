/**
 * monster-detail.js
 * * View controller for the single Monster Detail page (Statblock).
 * Handles:
 * 1. Fetching full monster data.
 * 2. Calculating derived D&D stats.
 * 3. Rendering the responsive layout.
 * 
 * Location: \assets\js\monster\views\monster-detail.js
 */

import { getMonsterBySlug } from '../monster-service.js';

/**
 * Main render function for the Detail View.
 * @param {HTMLElement} container - The DOM element to render into.
 * @param {Object} params - Route parameters (must include .slug).
 */
export async function renderMonsterDetail(container, params) {
    container.innerHTML = '<div class="loading">Summoning monster...</div>';
    
    const monster = await getMonsterBySlug(params.slug);
    
    if (!monster) {
        container.innerHTML = '<div class="alert alert-danger">Monster not found or not live.</div>';
        return;
    }

    // Apply Page Wide Class
    const parentPage = container.closest('.page');
    if (parentPage) {
        parentPage.classList.add('page-wide');
    }

    // --- LAYOUT LOGIC ---
    const hasLeftContent = monster.image_url || monster.description || monster.additional_info;
    
    const layoutStyle = hasLeftContent 
        ? 'display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: start;'
        : 'display: block; max-width: 800px; margin: 0 auto;';

    // Calculations
    const pb = calculatePB(monster.cr);
    const xp = calculateXP(monster.cr);
    
    // SAFEGUARD: Ensure we have an array before filtering
    const featureList = monster.features || [];

    const features = {
        Trait: featureList.filter(f => f.type === 'Trait'),
        Action: featureList.filter(f => f.type === 'Action'),
        Bonus: featureList.filter(f => f.type === 'Bonus' || f.type === 'Bonus Action'),
        Reaction: featureList.filter(f => f.type === 'Reaction'),
        Legendary: featureList.filter(f => f.type === 'Legendary' || f.type === 'Legendary Action'),
        Lair: featureList.filter(f => f.type === 'Lair' || f.type === 'Lair Action'),
        Regional: featureList.filter(f => f.type === 'Regional' || f.type === 'Regional Effect'),
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

    // Check if saves actually exist (prevents displaying empty "Saving Throws" label)
    const hasSaves = monster.saves && Object.keys(monster.saves).length > 0;

    const template = `
        <div class="monster-header" style="margin-bottom: 2rem;">
            <a href="#/" class="btn back-button" style="margin-bottom: 1rem;">← Back to Monster Compendium</a>
            <h1>${monster.name}</h1>
        </div>

        <div class="monster-detail-layout" style="${layoutStyle}">
            
            ${hasLeftContent ? `
            <div class="left-col">
                <div class="monster-lore-container">
                    ${monster.image_url ? `
                    <div class="monster-image-container" style="margin-bottom: 1.5rem;">
                        <img src="${monster.image_url}" alt="${monster.name}" style="width: 100%; border-radius: var(--border-radius); border: 4px solid var(--color-primary);">
                        ${monster.image_credit ? `<p class="image-caption">Art by ${monster.image_credit}</p>` : ''}
                    </div>` : ''}

                    <div class="monster-description">
                        ${marked.parse(monster.description || '')}
                        
                        ${monster.additional_info ? `
                            <hr>
                            ${marked.parse(monster.additional_info)}
                        ` : ''}
                    </div>
                </div>
            </div>
            ` : ''}

            <div class="right-col"> 
                <blockquote class="stat-block">
                    <h2>${monster.name}</h2>
                    <p><em>${monster.size} ${monster.species}, ${alignmentText}</em></p>
                    <hr>
                    
                    <div class="stat-grid-container">
                        <div class="stat-cell-ac">
                            <strong>AC</strong> ${monster.ac} ${monster.conditional_ac || ''}
                        </div>
                        <div class="stat-cell-init">
                            <strong>Initiative</strong> ${formatInitiative(monster.ability_scores.DEX, monster.init_prof, pb)}
                        </div>
                        <div class="stat-cell-hp">
                            <strong>HP</strong> ${calculateHPString(monster.hit_dice_num, monster.hit_dice_size, monster.hp_modifier)}
                        </div>
                        <div class="stat-cell-speed">
                            <strong>Speed</strong> ${monster.speed}
                        </div>
                    </div>

                    <hr>
                    ${abilitiesHTML}
                    <hr>

                    ${hasSaves ? `<p><strong>Saving Throws</strong> ${formatSaves(monster.saves)}</p>` : ''}
                    ${monster.skills ? `<p><strong>Skills</strong> ${monster.skills}</p>` : ''}
                    
                    ${vuln ? `<p><strong>Damage Vulnerabilities</strong> ${vuln}</p>` : ''}
                    ${res ? `<p><strong>Damage Resistances</strong> ${res}</p>` : ''}
                    ${imm ? `<p><strong>Damage Immunities</strong> ${imm}</p>` : ''}
                    ${conImm ? `<p><strong>Condition Immunities</strong> ${conImm}</p>` : ''}
                    
                    ${monster.senses ? `<p><strong>Senses</strong> ${monster.senses}</p>` : ''}
                    <p><strong>Languages</strong> ${monster.languages || '—'}</p>
                    <p>
                        <strong>Challenge</strong> ${formatCR(monster.cr)} (${xp} XP) 
                        <strong>PB</strong> +${pb}
                    </p>

                    ${renderFeatureBucket(features.Trait, 'Traits')}
                    ${renderFeatureBucket(features.Action, 'Actions')}
                    ${renderFeatureBucket(features.Bonus, 'Bonus Actions')}
                    ${renderFeatureBucket(features.Reaction, 'Reactions')}
                    
                    ${(features.Legendary.length > 0 || monster.legendary_header) ? `
                        <h3>Legendary Actions</h3>
                        ${monster.legendary_header ? marked.parse(monster.legendary_header) : ''}
                        ${renderFeatureList(features.Legendary)}
                    ` : ''}

                    ${(features.Lair.length > 0 || monster.lair_header) ? `
                        <h3>Lair Actions</h3>
                        ${monster.lair_header ? marked.parse(monster.lair_header) : ''}
                        ${renderFeatureList(features.Lair)}
                    ` : ''}

                    ${(features.Regional.length > 0 || monster.regional_header) ? `
                        <h3>Regional Effects</h3>
                        ${monster.regional_header ? marked.parse(monster.regional_header) : ''}
                        ${renderFeatureList(features.Regional)}
                    ` : ''}

                    <div class="statblock-creator">
                       <p style="margin: 0.2em 0;">
                           <strong>Created by:</strong> ${monster.creator_name || 'Unknown'} ${monster.creator_notes ? `(${monster.creator_notes})` : ''}
                       </p>
                       <p style="margin: 0.2em 0;">
                           <strong>Usage:</strong> ${monster.usage || 'Unknown'}
                       </p>
                    </div>
                </blockquote>
            </div>
        </div>

        <style>
            .monster-description { 
                background: transparent; 
                padding: 0; 
                border: none; 
                /* FIX: Prevent text overflow */
                overflow-wrap: break-word; 
                word-wrap: break-word;
                max-width: 100%;
            }

            .monster-description img {
                max-width: 100%;
                height: auto;
            }

            .statblock-creator p { font-size: 0.9em; font-style: italic; color: var(--color-primary); }
            
            /* Ability Table Styling */
            .ability-table { width: 100%; text-align: center; border-collapse: collapse; margin-bottom: 0.5em; }
            .ability-table th { color: var(--color-primary); font-size: 0.75em; text-transform: uppercase; border-bottom: 1px solid var(--color-line); padding-bottom: 2px;}
            .ability-table td { padding: 4px 2px; }
            
            /* CSS Fix for Nested Lists */
            .feature-item ul, 
            .monster-description ul,
            .stat-block ul { 
                margin: 0.5em 0 0.5em 1.5em !important; 
                padding-left: 1em !important; 
                list-style: disc outside !important; 
            }
            
            .feature-item li,
            .monster-description li,
            .stat-block li {
                display: list-item !important;
                list-style: disc outside !important;
                margin-bottom: 0.2em;
            }
            
            /* Base paragraph style for features */
            .feature-item p { display: inline-block; margin-bottom: 0.5em; }

            .feature-item li p { display: block; margin-bottom: 0; }

            /* MOBILE FIX: Switch to Flexbox column layout on small screens */
            @media (max-width: 1000px) {
                
                .monster-header {
                    margin-top: 4rem; 
                }

                .monster-detail-layout { 
                    display: flex !important; 
                    flex-direction: column !important;
                    gap: 2rem !important;
                }
                
                .left-col, .right-col {
                    width: 100% !important;
                    max-width: 100% !important;
                    min-width: 0; /* Allows text wrapping in flex children */
                }

                .monster-image-container {
                    max-width: 100%;
                }
            }
        </style>
    `;

    container.innerHTML = template;
}

// --- Helpers ---

function calculateMod(score) { return Math.floor((score - 10) / 2); }

function calculatePB(cr) {
    if (cr < 5) return 2;   // CR 0-4
    if (cr < 9) return 3;   // CR 5-8
    if (cr < 13) return 4;  // CR 9-12
    if (cr < 17) return 5;  // CR 13-16
    if (cr < 21) return 6;  // CR 17-20
    if (cr < 25) return 7;  // CR 21-24
    if (cr < 29) return 8;  // CR 25-28
    return 9;               // CR 29+
}

function calculateXP(cr) {
    const table = { "0.125": 25, "0.25": 50, "0.5": 100, "1": 200, "2": 450, "3": 700, "4": 1100, "5": 1800, "6": 2300, "7": 2900, "8": 3900, "9": 5000, "10": 5900, "11": 7200, "12": 8400, "13": 10000, "14": 11500, "15": 13000, "16": 15000, "17": 18000, "18": 20000, "19": 22000, "20": 25000, "21": 33000, "22": 41000, "23": 50000, "24": 62000, "25": 75000, "26": 90000, "27": 105000, "28": 120000, "29": 135000, "30": 155000 };
    return table[cr] || 0;
}

function formatSign(val) { return val >= 0 ? `+${val}` : val; }

function formatCR(val) {
    if (val === 0.125) return '1/8';
    if (val === 0.25) return '1/4';
    if (val === 0.5) return '1/2';
    return val;
}

function calculateHPString(num, size, mod) {
    const avg = Math.floor(num * (size / 2 + 0.5)) + mod;
    const modStr = mod !== 0 ? (mod > 0 ? ` + ${mod}` : ` - ${Math.abs(mod)}`) : '';
    return `${avg} (${num}d${size}${modStr})`;
}

function formatInitiative(dexScore, proficiency, pb) {
    let mod = calculateMod(dexScore);
    if (proficiency === 'Proficient') mod += pb;
    if (proficiency === 'Expert') mod += (pb * 2);
    return `${formatSign(mod)} (${dexScore})`;
}

function renderAbilityTable(scores, saves, pb) {
    const abilities = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
    const getCellData = (attr) => {
        const score = scores && scores[attr] ? scores[attr] : 10;
        const mod = calculateMod(score);
        let saveMod = mod; 
        if (saves && saves[attr] !== undefined) {
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

function formatSaves(savesObj) {
    if (!savesObj) return '';
    return Object.entries(savesObj)
        .map(([stat, val]) => `${stat} ${formatSign(val)}`)
        .join(', ');
}

function renderFeatureBucket(list, title) {
    if (!list || list.length === 0) return '';
    return `
        ${title ? `<h3>${title}</h3>` : ''}
        ${renderFeatureList(list)}
    `;
}

function renderFeatureList(list) {
    return list.map(f => {
        let html = marked.parse(f.description);
        const titleHtml = `<strong><em>${f.name}.</em></strong> `;
        if (html.startsWith('<p>')) {
            html = html.replace('<p>', `<p>${titleHtml}`);
        } else {
            html = `<p>${titleHtml}</p>` + html;
        }
        return `<div class="feature-item">${html}</div>`;
    }).join('');
}