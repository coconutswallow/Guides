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
    const pb = calculatePB(monster.CR);
    const xp = calculateXP(monster.CR);
    
    const features = {
        Trait: monster.features.filter(f => f.Type === 'Trait'),
        Action: monster.features.filter(f => f.Type === 'Action'),
        Bonus: monster.features.filter(f => f.Type === 'Bonus'),
        Reaction: monster.features.filter(f => f.Type === 'Reaction'),
        Legendary: monster.features.filter(f => f.Type === 'Legendary'),
        Lair: monster.features.filter(f => f.Type === 'Lair'),
    };

    const abilitiesHTML = renderAbilityTable(monster.Ability_Scores, monster.Saves, pb);

    const template = `
        <div class="monster-detail-layout" style="display: grid; grid-template-columns: 60% 40%; gap: 2rem;">
            
            <div class="left-col">
                <a href="#/monsters" class="btn back-button">← Back to Library</a>
                
                ${monster.Image_URL ? `
                <div class="monster-image-container">
                    <img src="${monster.Image_URL}" alt="${monster.Name}">
                    ${monster.Image_Credit ? `<p class="image-credit">Art by ${monster.Image_Credit}</p>` : ''}
                </div>` : ''}

                <div class="monster-description">
                    ${marked.parse(monster.Description || '')}
                </div>
            </div>

            <div class="right-col">
                <blockquote class="stat-block">
                    <h2>${monster.Name}</h2>
                    <p><em>${monster.Size} ${monster.Species}, ${monster.Alignment}</em></p>
                    <hr>
                    
                    <div class="stat-grid-container">
                        <div class="stat-cell-ac">
                            <strong>AC</strong> ${monster.AC} ${monster.Conditional_AC || ''}
                        </div>
                        <div class="stat-cell-init">
                            <strong>Initiative</strong> ${formatInitiative(monster.Ability_Scores.DEX, monster.Init_Prof, pb)}
                        </div>
                        <div class="stat-cell-hp">
                            <strong>HP</strong> ${calculateHPString(monster.Hit_Dice_Num, monster.Hit_Dice_Size, monster.HP_Modifier)}
                        </div>
                        <div class="stat-cell-speed">
                            <strong>Speed</strong> ${monster.Speed}
                        </div>
                    </div>

                    <hr>
                    ${abilitiesHTML}
                    <hr>

                    ${monster.Saves ? `<p><strong>Saving Throws</strong> ${formatSaves(monster.Saves)}</p>` : ''}
                    ${monster.Skills ? `<p><strong>Skills</strong> ${monster.Skills}</p>` : ''}
                    ${monster.Vulnerabilities ? `<p><strong>Vulnerabilities</strong> ${monster.Vulnerabilities}</p>` : ''}
                    ${monster.Resistances ? `<p><strong>Resistances</strong> ${monster.Resistances}</p>` : ''}
                    ${monster.Immunities ? `<p><strong>Immunities</strong> ${monster.Immunities}</p>` : ''}
                    ${monster.Senses ? `<p><strong>Senses</strong> ${monster.Senses}</p>` : ''}
                    <p><strong>Languages</strong> ${monster.Languages || '—'}</p>
                    <p>
                        <strong>Challenge</strong> ${formatCR(monster.CR)} (${xp} XP) 
                        <strong>PB</strong> +${pb}
                    </p>

                    <hr>

                    ${renderFeatureBucket(features.Trait)}
                    ${renderFeatureBucket(features.Action, 'Actions')}
                    ${renderFeatureBucket(features.Bonus, 'Bonus Actions')}
                    ${renderFeatureBucket(features.Reaction, 'Reactions')}
                    
                    ${features.Legendary.length > 0 ? `
                        <h3>Legendary Actions</h3>
                        ${monster.Legendary_Header ? marked.parse(monster.Legendary_Header) : ''}
                        ${renderFeatureList(features.Legendary)}
                    ` : ''}

                    ${features.Lair.length > 0 ? `
                        <h3>Lair Actions</h3>
                        ${monster.Lair_Header ? marked.parse(monster.Lair_Header) : ''}
                        ${renderFeatureList(features.Lair)}
                    ` : ''}

                    <div class="statblock-creator">
                       Source: ${monster.Usage}
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
    const table = { "0.125": 25, "0.25": 50, "0.5": 100, "1": 200, "2": 450, "3": 700, "4": 1100, "5": 1800 };
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
        const score = scores[attr] || 10;
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
        const desc = marked.parseInline(f.Description); 
        return `<p><strong><em>${f.Name}.</em></strong> ${desc}</p>`;
    }).join('');
}