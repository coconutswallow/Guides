import { getMonsterBySlug } from '../monster-service.js';

export async function renderMonsterDetail(container, params) {
    container.innerHTML = '<div class="loading">Summoning monster...</div>';
    
    const monster = await getMonsterBySlug(params.slug);
    
    if (!monster) {
        container.innerHTML = '<div class="alert alert-danger">Monster not found or not live.</div>';
        return;
    }

    // Apply Page Wide Class
    container.className = 'page page-wide';

    // Calculate Derived Stats
    // UPDATED: monster.cr
    const pb = calculatePB(monster.cr);
    const xp = calculateXP(monster.cr);
    
    // UPDATED: f.type (Postgres converts column 'Type' to 'type')
    const features = {
        Trait: monster.features.filter(f => f.type === 'Trait'),
        Action: monster.features.filter(f => f.type === 'Action'),
        Bonus: monster.features.filter(f => f.type === 'Bonus'),
        Reaction: monster.features.filter(f => f.type === 'Reaction'),
        Legendary: monster.features.filter(f => f.type === 'Legendary'),
        Lair: monster.features.filter(f => f.type === 'Lair'),
    };

    // UPDATED: monster.ability_scores, monster.saves
    const abilitiesHTML = renderAbilityTable(monster.ability_scores, monster.saves, pb);

    const template = `
        <div class="monster-detail-layout" style="display: grid; grid-template-columns: 60% 40%; gap: 2rem;">
            
            <div class="left-col">
                <a href="#/monsters" class="btn back-button">← Back to Library</a>
                
                ${monster.image_url ? `
                <div class="monster-image-container">
                    <img src="${monster.image_url}" alt="${monster.name}">
                    ${monster.image_credit ? `<p class="image-credit">Art by ${monster.image_credit}</p>` : ''}
                </div>` : ''}

                <div class="monster-description">
                    ${marked.parse(monster.description || '')}
                </div>
            </div>

            <div class="right-col">
                <blockquote class="stat-block">
                    <h2>${monster.name}</h2>
                    <p><em>${monster.size} ${monster.species}, ${monster.alignment}</em></p>
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

                    ${monster.saves ? `<p><strong>Saving Throws</strong> ${formatSaves(monster.saves)}</p>` : ''}
                    ${monster.skills ? `<p><strong>Skills</strong> ${monster.skills}</p>` : ''}
                    ${monster.vulnerabilities ? `<p><strong>Vulnerabilities</strong> ${monster.vulnerabilities}</p>` : ''}
                    ${monster.resistances ? `<p><strong>Resistances</strong> ${monster.resistances}</p>` : ''}
                    ${monster.immunities ? `<p><strong>Immunities</strong> ${monster.immunities}</p>` : ''}
                    ${monster.senses ? `<p><strong>Senses</strong> ${monster.senses}</p>` : ''}
                    <p><strong>Languages</strong> ${monster.languages || '—'}</p>
                    <p>
                        <strong>Challenge</strong> ${formatCR(monster.cr)} (${xp} XP) 
                        <strong>PB</strong> +${pb}
                    </p>

                    <hr>

                    ${renderFeatureBucket(features.Trait)}
                    ${renderFeatureBucket(features.Action, 'Actions')}
                    ${renderFeatureBucket(features.Bonus, 'Bonus Actions')}
                    ${renderFeatureBucket(features.Reaction, 'Reactions')}
                    
                    ${features.Legendary.length > 0 ? `
                        <h3>Legendary Actions</h3>
                        ${monster.legendary_header ? marked.parse(monster.legendary_header) : ''}
                        ${renderFeatureList(features.Legendary)}
                    ` : ''}

                    ${features.Lair.length > 0 ? `
                        <h3>Lair Actions</h3>
                        ${monster.lair_header ? marked.parse(monster.lair_header) : ''}
                        ${renderFeatureList(features.Lair)}
                    ` : ''}

                    <div class="statblock-creator">
                       Source: ${monster.usage || 'Unknown'}
                    </div>
                </blockquote>
            </div>
        </div>

        <style>
            @media (max-width: 900px) {
                .monster-detail-layout { grid-template-columns: 1fr !important; }
            }
        </style>
    `;

    container.innerHTML = template;
}

// --- Helpers ---

function calculateMod(score) {
    return Math.floor((score - 10) / 2);
}

function calculatePB(cr) {
    if (cr < 5) return 2;
    if (cr < 9) return 3;
    if (cr < 13) return 4;
    if (cr < 17) return 5;
    return 6;
}

function calculateXP(cr) {
    // Note: Make sure your keys are strings if using fractional CRs
    const table = { "0.125": 25, "0.25": 50, "0.5": 100, "1": 200, "2": 450, "3": 700, "4": 1100, "5": 1800, "11": 7200, "12": 8400, "25": 75000 };
    return table[cr] || 0;
}

function formatSign(val) {
    return val >= 0 ? `+${val}` : val;
}

function formatCR(val) {
    if (val == 0.125) return '1/8';
    if (val == 0.25) return '1/4';
    if (val == 0.5) return '1/2';
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
        // scores is the JSON object. 
        // Note: While columns are snake_case, JSON keys usually keep their case from insertion. 
        // If your JSON is { "STR": 10 }, then scores['STR'] works. 
        // If your JSON is { "str": 10 }, you might need scores[attr] or scores[attr.toLowerCase()].
        // Assuming Uppercase Keys based on schema:
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
    <table>
        <tbody>
            <tr>
                <td>STR</td><td>${data.STR.score}</td><td>${data.STR.mod}</td><td>${data.STR.save}</td>
                <td>DEX</td><td>${data.DEX.score}</td><td>${data.DEX.mod}</td><td>${data.DEX.save}</td>
                <td>CON</td><td>${data.CON.score}</td><td>${data.CON.mod}</td><td>${data.CON.save}</td>
            </tr>
            <tr>
                <td>INT</td><td>${data.INT.score}</td><td>${data.INT.mod}</td><td>${data.INT.save}</td>
                <td>WIS</td><td>${data.WIS.score}</td><td>${data.WIS.mod}</td><td>${data.WIS.save}</td>
                <td>CHA</td><td>${data.CHA.score}</td><td>${data.CHA.mod}</td><td>${data.CHA.save}</td>
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
        // UPDATED: f.description and f.name
        const desc = marked.parseInline(f.description); 
        return `<p><strong><em>${f.name}.</em></strong> ${desc}</p>`;
    }).join('');
}