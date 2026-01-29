import { ATTRIBUTES, POINT_COSTS } from './rework-constants.js';
import { getState } from './state-manager.js';
import { calculatePointBuyCost } from './rework-calculations.js';

// ==========================================
// 1. DATA SCRAPING (DOM -> Object)
// ==========================================

export function scrapeColumn(colId) {
    const getV = (id) => document.getElementById(id)?.value || "";
    
    // 1. Attributes
    const attrs = {}; 
    ATTRIBUTES.forEach(a => attrs[a] = getV(`attr-${colId}-${a}`));

    // 2. Modifiers
    const rMods = {};
    document.querySelectorAll(`.mod-select-race[data-col="${colId}"]`).forEach(s => rMods[s.dataset.attr] = s.value);
    
    const oMods = {};
    document.querySelectorAll(`.mod-select-origin[data-col="${colId}"]`).forEach(s => oMods[s.dataset.attr] = s.value);

    // 3. Classes
    const classes = [];
    document.querySelectorAll(`#classes-container-${colId} .class-block`).forEach(b => {
        classes.push({
            version: b.querySelector('.version-select').value,
            class: b.querySelector('.class-select').value,
            subclass: b.querySelector('.subclass-select').value,
            level: b.querySelector('.level-input').value
        });
    });

    // 4. Feats / ASIs
    const feats = [];
    document.querySelectorAll(`#feats-container-${colId} .feat-card`).forEach(c => {
        const mods = {};
        c.querySelectorAll('select[data-attr]').forEach(s => mods[s.dataset.attr] = s.value);
        
        const features = [];
        const featureTypes = c.querySelectorAll('.feat-feature-type');
        const featureNames = c.querySelectorAll('.feat-feature-name');
        
        featureTypes.forEach((typeSelect, i) => {
            features.push({
                type: typeSelect.value,
                name: featureNames[i]?.value || ""
            });
        });
        
        // Extract source class and level from card title
        const titleText = c.querySelector('.card-title')?.innerText || "Unknown";
        const sourceClass = titleText.split(' - ')[0];
        const lvlMatch = titleText.match(/Lvl (\d+)/);
        
        feats.push({
            name: c.querySelector('.feat-name')?.value || "",
            mods: mods,
            features: features,
            source: sourceClass,
            lvl: lvlMatch ? lvlMatch[1] : ""
        });
    });

    // 5. Generic Features (Race/Origin)
    const getFeatures = (containerId) => {
        const arr = [];
        document.querySelectorAll(`#${containerId} .feature-row`).forEach(row => {
            arr.push({
                type: row.querySelector('.feature-type')?.value || "none",
                name: row.querySelector('.feature-name')?.value || ""
            });
        });
        return arr;
    };

    return { 
        name: getV(`name-${colId}`), 
        race: getV(`race-${colId}`), 
        race_features: getFeatures(`race-features-container-${colId}`),
        bg: getV(`bg-${colId}`), 
        origin_features: getFeatures(`origin-features-container-${colId}`),
        origin_feat: getV(`orig-feat-${colId}`), 
        origin_feat_features: getFeatures(`origin-feat-features-container-${colId}`),
        attributes: attrs, 
        race_mods: rMods, 
        origin_mods: oMods, 
        classes, 
        feats 
    };
}

// ==========================================
// 2. DATA POPULATION (Object -> DOM)
// ==========================================

export function populateColumn(colId, data) {
    if (!data) return;
    const setV = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ""; };

    // Basic Fields
    setV(`name-${colId}`, data.name);
    setV(`race-${colId}`, data.race);
    setV(`bg-${colId}`, data.bg);
    setV(`orig-feat-${colId}`, data.origin_feat);

    // Attributes
    ATTRIBUTES.forEach(a => setV(`attr-${colId}-${a}`, data.attributes?.[a] || "10"));
    updatePointBuyDisplay(colId);

    // Mods
    document.querySelectorAll(`.mod-select-race[data-col="${colId}"]`).forEach(s => s.value = data.race_mods?.[s.dataset.attr] || "0");
    document.querySelectorAll(`.mod-select-origin[data-col="${colId}"]`).forEach(s => s.value = data.origin_mods?.[s.dataset.attr] || "0");

    // Helper to populate feature rows
    const fillFeatures = (containerId, featData) => {
        // First ensure enough rows exist
        renderFeatureRows(containerId, 4); // Default to 4
        
        const rows = document.querySelectorAll(`#${containerId} .feature-row`);
        if (featData) {
            featData.forEach((f, i) => {
                if (rows[i]) {
                    const typeSel = rows[i].querySelector('.feature-type');
                    const nameInp = rows[i].querySelector('.feature-name');
                    if (typeSel) typeSel.value = f.type || "none";
                    if (nameInp) nameInp.value = f.name || "";
                }
            });
        }
    };

    fillFeatures(`race-features-container-${colId}`, data.race_features);
    fillFeatures(`origin-features-container-${colId}`, data.origin_features);
    fillFeatures(`origin-feat-features-container-${colId}`, data.origin_feat_features);

    // Classes
    const container = document.getElementById(`classes-container-${colId}`);
    container.innerHTML = ""; // Clear existing
    if (data.classes && data.classes.length > 0) {
        data.classes.forEach(c => addClassRow(colId, c));
    } else {
        addClassRow(colId); // Default empty row
    }

    // Feats (Regenerate based on classes, then fill data)
    generateFeatCards(colId, data.feats);
}

// ==========================================
// 3. UI RENDERERS & LOGIC
// ==========================================

export function renderBaseAttributes(colId) {
    const container = document.getElementById(`attrs-container-${colId}`);
    
    const generateOptions = (selectedValue) => {
        let optionsHtml = '';
        for (let i = 8; i <= 15; i++) {
            const cost = POINT_COSTS[i];
            const isSelected = i === selectedValue ? 'selected' : '';
            optionsHtml += `<option value="${i}" ${isSelected}>${i} (${cost})</option>`;
        }
        return optionsHtml;
    };

    container.innerHTML = `
    <table class="stat-table">
        <thead><tr>${ATTRIBUTES.map(a => `<th>${a}</th>`).join('')}</tr></thead>
        <tbody>
            <tr>
                ${ATTRIBUTES.map(a => `
                    <td>
                        <select id="attr-${colId}-${a}" class="text-input" 
                            style="width: 100%; padding: 4px; text-align: center;" 
                            onchange="window.calculatePointBuy('${colId}')">
                            ${generateOptions(10)}
                        </select>
                    </td>
                `).join('')}
            </tr>
        </tbody>
    </table>`;
    
    updatePointBuyDisplay(colId);
}

export function updatePointBuyDisplay(colId) {
    const attrs = {};
    ATTRIBUTES.forEach(a => {
        const el = document.getElementById(`attr-${colId}-${a}`);
        if(el) attrs[a] = el.value;
    });
    
    const spent = calculatePointBuyCost(attrs);
    const remaining = 27 - spent;
    
    const display = document.getElementById(`points-${colId}`);
    if(display) {
        display.innerText = `${remaining} / 27 Pts`;
        display.style.color = remaining < 0 ? '#e74c3c' : (remaining === 0 ? '#2ecc71' : '#f39c12');
    }
}

export function renderFeatureRows(containerId, count = 4) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    let html = '';
    for (let i = 0; i < count; i++) {
        html += `
            <div class="feature-row" style="display: grid; grid-template-columns: 1fr 2fr; gap: 8px; margin-bottom: 8px;">
                <select class="text-input feature-type">
                    <option value="none">None</option>
                    <option value="language">Language</option>
                    <option value="skill">Skill</option>
                    <option value="tool proficiency">Tool Proficiency</option>
                </select>
                <input type="text" class="text-input feature-name" placeholder="Feature Name">
            </div>
        `;
    }
    container.innerHTML = html;
}

// --- Class & Feat Logic ---

function saveFeatState(colId) {
    const feats = [];
    document.querySelectorAll(`#feats-container-${colId} .feat-card`).forEach(c => {
        const mods = {};
        c.querySelectorAll('select[data-attr]').forEach(s => mods[s.dataset.attr] = s.value);
        
        const features = [];
        c.querySelectorAll('.feat-feature-type').forEach((t, i) => {
            features.push({
                type: t.value,
                name: c.querySelectorAll('.feat-feature-name')[i]?.value || ""
            });
        });

        feats.push({
            name: c.querySelector('.feat-name')?.value || "",
            mods: mods,
            features: features
        });
    });
    return feats;
}

export function removeClassRow(btn) {
    const block = btn.closest('.class-block');
    const container = block.parentElement;
    const colId = container.id.replace('classes-container-', '');

    const savedFeats = saveFeatState(colId);
    block.remove();
    generateFeatCards(colId, savedFeats);
}

export function addClassRow(colId, init = null) {
    const container = document.getElementById(`classes-container-${colId}`);
    const block = document.createElement('div');
    block.className = 'class-block';
    block.innerHTML = `
        <div class="class-row">
            <select class="version-select"><option value="">Ver</option><option value="2014">2014</option><option value="2024">2024</option></select>
            <select class="class-select" disabled><option value="">Class</option></select>
            <select class="subclass-select" disabled><option value="">Subclass</option></select>
        </div>
        <div class="class-row-bottom">
            <div class="level-wrapper">Lvl:<input type="number" class="level-input" value="1" min="1" max="20"></div>
            <button type="button" class="remove-class-btn" onclick="window.removeClassRow(this)">&times;</button>
        </div>`;
    container.appendChild(block);

    const vS = block.querySelector('.version-select');
    const cS = block.querySelector('.class-select');
    const sS = block.querySelector('.subclass-select');
    const lI = block.querySelector('.level-input');

    const characterData = getState().characterData || [];

    const updC = (val) => {
        cS.innerHTML = '<option value="">Class</option>'; 
        cS.disabled = !vS.value;
        const classes = [...new Set(characterData.filter(i => i.version == vS.value).map(i => i.class))];
        classes.forEach(c => {
            const opt = document.createElement('option'); opt.value = c; opt.innerText = c;
            if (c === val) opt.selected = true;
            cS.appendChild(opt);
        });
    };

    const updS = (val) => {
        sS.innerHTML = '<option value="">Subclass</option>'; 
        sS.disabled = !cS.value;
        const subs = characterData.filter(i => i.version == vS.value && i.class == cS.value);
        subs.forEach(s => {
            const opt = document.createElement('option'); opt.value = s.subclass; opt.innerText = s.subclass || 'None';
            if (s.subclass === val) opt.selected = true;
            sS.appendChild(opt);
        });
    };

    const updateAndRegen = () => {
        const savedState = saveFeatState(colId);
        generateFeatCards(colId, savedState);
    };

    vS.onchange = () => { updC(); updateAndRegen(); };
    cS.onchange = () => { updS(); updateAndRegen(); };
    lI.oninput = () => updateAndRegen();

    if (init) { 
        vS.value = init.version; 
        updC(init.class); 
        updS(init.subclass); 
        lI.value = init.level; 
    }
}

export function generateFeatCards(colId, saved = null) {
    const container = document.getElementById(`feats-container-${colId}`);
    container.innerHTML = ''; 
    let idx = 0;
    
    // Safety check: ensure lookups are loaded
    const characterData = getState().characterData;
    if (!characterData || characterData.length === 0) {
        // If data isn't loaded yet, we can't generate cards correctly.
        // In a real scenario, we might want to trigger a load or retry, 
        // but for now, we just return to avoid crashing.
        return; 
    }

    document.querySelectorAll(`#classes-container-${colId} .class-block`).forEach(b => {
        const ver = b.querySelector('.version-select').value;
        const cls = b.querySelector('.class-select').value;
        const sub = b.querySelector('.subclass-select').value;
        const lvl = parseInt(b.querySelector('.level-input').value) || 0;

        if (!cls || !ver) return;

        let dataRow = characterData.find(row => row.version == ver && row.class === cls && row.subclass === sub);
        if (!dataRow) dataRow = characterData.find(row => row.version == ver && row.class === cls);

        const asiLevels = dataRow?.ASI || [4, 8, 12, 16, 19];

        asiLevels.forEach(milestone => {
            if (milestone > lvl) return;

            const card = document.createElement('div'); 
            card.className = 'card feat-card';
            card.innerHTML = `
                <h3 class="card-title">${cls} - Lvl ${milestone} ASI/Feat</h3>
                <input type="text" class="text-input feat-name" placeholder="Feat Name">
                <table class="stat-table">
                    <thead><tr>${ATTRIBUTES.map(a => `<th>${a}</th>`).join('')}</tr></thead>
                    <tbody>
                        <tr>${ATTRIBUTES.map(a => `<td><select data-attr="${a}"><option value="0">0</option><option value="1">+1</option><option value="2">+2</option></select></td>`).join('')}</tr>
                    </tbody>
                </table>
                <div style="margin-top: 10px;">
                    <label class="input-label" style="font-size:0.8em">Feat Features</label>
                    <div class="feat-features-container">
                        ${[1, 2, 3].map(() => `
                            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 8px; margin-bottom: 8px;">
                                <select class="text-input feat-feature-type">
                                    <option value="none">None</option>
                                    <option value="language">Language</option>
                                    <option value="skill">Skill</option>
                                    <option value="tool proficiency">Tool Proficiency</option>
                                </select>
                                <input type="text" class="text-input feat-feature-name" placeholder="Feature Name">
                            </div>
                        `).join('')}
                    </div>
                </div>`;
            
            container.appendChild(card);

            // Restore saved data
            if (saved && saved[idx]) {
                const s = saved[idx];
                const nameInp = card.querySelector('.feat-name');
                if (nameInp) nameInp.value = s.name || "";
                
                ATTRIBUTES.forEach(a => {
                    const sel = card.querySelector(`select[data-attr="${a}"]`);
                    if (sel) sel.value = s.mods?.[a] || "0";
                });

                if (s.features) {
                    const types = card.querySelectorAll('.feat-feature-type');
                    const names = card.querySelectorAll('.feat-feature-name');
                    s.features.forEach((feat, i) => {
                        if (types[i]) types[i].value = feat.type || "none";
                        if (names[i]) names[i].value = feat.name || "";
                    });
                }
            }
            idx++;
        });
    });
}

// ==========================================
// 4. COST TABLE UI
// ==========================================

export function addCostRow(change, count, dtp, gold) {
    const tbody = document.getElementById('cost-table-body');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="text" class="text-input cost-change" value="${change}" style="width: 100%;"></td>
        <td><input type="number" class="text-input cost-num-changes" value="${count}" min="0" style="width: 100%;" onchange="window.updateTotalCost()"></td>
        <td><input type="number" class="text-input cost-dtp" value="${dtp}" min="0" style="width: 100%;" onchange="window.updateTotalCost()"></td>
        <td><input type="number" class="text-input cost-gold" value="${gold}" min="0" style="width: 100%;" onchange="window.updateTotalCost()"></td>
        <td><button type="button" class="button" onclick="window.deleteCostRow(this)" style="background-color: #c0392b; color: #fff; padding: 4px 8px;">×</button></td>
    `;
    tbody.appendChild(row);
}

// ==========================================
// 5. OUTPUT GENERATION
// ==========================================

export function generateOutputString(oldC, newC, costInfo, notes) {
    const buildB = (c) => {
        const clean = (s) => (s || '').replace(/\s*\(.*?\)\s*/g, ' ').trim();
        const classLine = c.classes.map(cl => {
            const name = clean(cl.class);
            const sub = clean(cl.subclass);
            return `${name}${sub && sub !== 'None' ? ' ' + sub : ''} (${cl.level})`;
        }).join(' / ');

        const bonusLine = [];
        ATTRIBUTES.forEach(a => {
            const total = (parseInt(c.race_mods[a]) || 0) + (parseInt(c.origin_mods[a]) || 0);
            if (total > 0) bonusLine.push(`+${total} ${a}`);
        });

        const featChoices = [];
        if (c.origin_feat) {
            let m = []; 
            ATTRIBUTES.forEach(a => { if (c.origin_mods[a] != "0") m.push(`+${c.origin_mods[a]} ${a}`); });
            featChoices.push(`${c.origin_feat}${m.length ? ' ' + m.join(", ") : ""} (Background)`);
        }
        
        c.feats.forEach(f => {
            let m = []; 
            ATTRIBUTES.forEach(a => { if (f.mods[a] != "0") m.push(`+${f.mods[a]} ${a}`); });

            const sourceClassData = c.classes.find(cl => cl.class === f.source);
            const cleanSubName = sourceClassData ? clean(sourceClassData.subclass) : "";
            const subPart = (cleanSubName && cleanSubName !== 'None') ? ` ${cleanSubName}` : "";

            featChoices.push(`${f.name}${m.length ? ' ' + m.join(", ") : ""} (${f.source}${subPart} (${f.lvl}))`);
        });

        return `Name: ${c.name}
Version: ${c.classes[0]?.version || '2024'}
Level: ${c.classes.reduce((a, b) => a + (parseInt(b.level) || 0), 0)}
Class: ${classLine}
Race/Species: ${c.race}
Starting Stats: (excluding Racial/Background Bonuses)
Str / Dex / Con / Int / Wis / Cha
${ATTRIBUTES.map(a => c.attributes[a]).join(' / ')}
Racial/Background stat bonuses: ${bonusLine.join(', ') || 'None'}
ASI/Feat/Origin Feat choices: ${featChoices.join(', ')}
Background: ${c.bg}`;
    };

    const discordId = document.getElementById('manual-discord-id').value || "Unknown";
    const reworkId = getState().currentReworkId || "Not Saved Yet";

    return `\`\`\`
__***Character Change Request***__

**Requestor:** @${discordId} as ${oldC.name} (${oldC.classes.reduce((a, b) => a + (parseInt(b.level) || 0), 0)})

**Old Character**
${buildB(oldC)}

**New Character**
${buildB(newC)}

**Details**
Cost: ${costInfo}
Notes: ${notes}

**Rework UUID:** ${reworkId}
(Load this ID in the Rework Tool to view details)
\`\`\`
<@&474659626193780751> <@&554463237924716545>`;
}