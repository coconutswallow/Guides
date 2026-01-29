import { ATTRIBUTES, POINT_COSTS } from './rework-constants.js';
import { getState } from './state-manager.js';
import { calculatePointBuyCost } from './rework-calculations.js';

// --- Scrape & Populate logic ---
export function scrapeColumn(colId) {
    const getV = (id) => document.getElementById(id)?.value || "";
    
    const attrs = {}; 
    ATTRIBUTES.forEach(a => attrs[a] = getV(`attr-${colId}-${a}`));

    const rMods = {};
    document.querySelectorAll(`.mod-select-race[data-col="${colId}"]`).forEach(s => rMods[s.dataset.attr] = s.value);
    const oMods = {};
    document.querySelectorAll(`.mod-select-origin[data-col="${colId}"]`).forEach(s => oMods[s.dataset.attr] = s.value);

    const classes = [];
    document.querySelectorAll(`#classes-container-${colId} .class-block`).forEach(b => {
        classes.push({
            version: b.querySelector('.version-select').value,
            class: b.querySelector('.class-select').value,
            subclass: b.querySelector('.subclass-select').value,
            level: b.querySelector('.level-input').value
        });
    });

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

        const titleText = c.querySelector('.card-title')?.innerText || "";
        const source = titleText.split(' - ')[0] || "Unknown";
        const lvl = titleText.match(/Lvl (\d+)/)?.[1] || "";

        feats.push({
            name: c.querySelector('.feat-name')?.value || "",
            mods: mods,
            features: features,
            source: source,
            lvl: lvl
        });
    });

    const scrapeFeatures = (cid) => {
        const arr = [];
        document.querySelectorAll(`#${cid} .feature-row`).forEach(row => {
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
        race_features: scrapeFeatures(`race-features-container-${colId}`),
        bg: getV(`bg-${colId}`), 
        origin_features: scrapeFeatures(`origin-features-container-${colId}`),
        origin_feat: getV(`orig-feat-${colId}`), 
        origin_feat_features: scrapeFeatures(`origin-feat-features-container-${colId}`),
        attributes: attrs, 
        race_mods: rMods, 
        origin_mods: oMods, 
        classes, 
        feats
    };
}

export function populateColumn(colId, data) {
    if (!data) return;
    const setV = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ""; };

    setV(`name-${colId}`, data.name);
    setV(`race-${colId}`, data.race);
    setV(`bg-${colId}`, data.bg);
    setV(`orig-feat-${colId}`, data.origin_feat);

    ATTRIBUTES.forEach(a => setV(`attr-${colId}-${a}`, data.attributes?.[a] || "10"));
    updatePointBuyDisplay(colId);

    document.querySelectorAll(`.mod-select-race[data-col="${colId}"]`).forEach(s => s.value = data.race_mods?.[s.dataset.attr] || "0");
    document.querySelectorAll(`.mod-select-origin[data-col="${colId}"]`).forEach(s => s.value = data.origin_mods?.[s.dataset.attr] || "0");

    const fillFeatures = (cid, feats) => {
        renderFeatureRows(cid, 4); 
        const rows = document.querySelectorAll(`#${cid} .feature-row`);
        if (feats) {
            feats.forEach((f, i) => {
                if (rows[i]) {
                    const t = rows[i].querySelector('.feature-type');
                    const n = rows[i].querySelector('.feature-name');
                    if (t) t.value = f.type || "none";
                    if (n) n.value = f.name || "";
                }
            });
        }
    };

    fillFeatures(`race-features-container-${colId}`, data.race_features);
    fillFeatures(`origin-features-container-${colId}`, data.origin_features);
    fillFeatures(`origin-feat-features-container-${colId}`, data.origin_feat_features);

    const container = document.getElementById(`classes-container-${colId}`);
    container.innerHTML = "";
    if (data.classes && data.classes.length > 0) {
        data.classes.forEach(c => addClassRow(colId, c));
    } else {
        addClassRow(colId);
    }
}

// --- UI Rendering logic ---
export function renderBaseAttributes(colId) {
    const container = document.getElementById(`attrs-container-${colId}`);
    if(!container) return;
    
    const generateOptions = (selectedValue) => {
        let optionsHtml = '';
        for (let i = 8; i <= 15; i++) {
            const cost = POINT_COSTS[i];
            const isSelected = i === parseInt(selectedValue) ? 'selected' : '';
            optionsHtml += `<option value="${i}" ${isSelected}>${i} (${cost})</option>`;
        }
        return optionsHtml;
    };

    container.innerHTML = `
    <table class="stat-table">
        <thead><tr>${ATTRIBUTES.map(a => `<th>${a}</th>`).join('')}</tr></thead>
        <tbody>
            <tr>${ATTRIBUTES.map(a => `<td><select id="attr-${colId}-${a}" class="text-input" style="width: 100%;" onchange="window.calculatePointBuy('${colId}')">${generateOptions(10)}</select></td>`).join('')}</tr>
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
    const display = document.getElementById(`points-${colId}`);
    if(display) {
        display.innerText = `${27 - spent} / 27 Pts`;
        display.style.color = (27 - spent) < 0 ? '#e74c3c' : (27 - spent === 0 ? '#2ecc71' : '#f39c12');
    }
}

export function renderFeatureRows(containerId, count = 4) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = Array(count).fill(0).map(() => `
        <div class="feature-row" style="display: grid; grid-template-columns: 1fr 2fr; gap: 8px; margin-bottom: 8px;">
            <select class="text-input feature-type">
                <option value="none">None</option>
                <option value="language">Language</option>
                <option value="skill">Skill</option>
                <option value="tool proficiency">Tool Proficiency</option>
            </select>
            <input type="text" class="text-input feature-name" placeholder="Feature Name">
        </div>`).join('');
}

// --- Class & Feat logic ---
export function removeClassRow(btn) {
    const block = btn.closest('.class-block');
    const container = block.parentElement;
    const colId = container.id.replace('classes-container-', '');
    const savedFeats = saveFeatState(colId);
    block.remove();
    generateFeatCards(colId, savedFeats);
}

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

    const updC = () => {
        const currentVal = cS.value;
        cS.innerHTML = '<option value="">Class</option>'; 
        cS.disabled = !vS.value;
        if(!vS.value) return;
        const classes = [...new Set(characterData.filter(i => i.version == vS.value).map(i => i.class))];
        classes.forEach(c => cS.innerHTML += `<option value="${c}">${c}</option>`);
        if (currentVal) cS.value = currentVal;
    };

    const updS = () => {
        const currentVal = sS.value;
        sS.innerHTML = '<option value="">Subclass</option>'; 
        sS.disabled = !cS.value;
        if(!cS.value) return;
        const subs = characterData.filter(i => i.version == vS.value && i.class == cS.value);
        subs.forEach(s => sS.innerHTML += `<option value="${s.subclass}">${s.subclass || 'None'}</option>`);
        if (currentVal) sS.value = currentVal;
    };

    const regen = () => {
        const saved = saveFeatState(colId);
        generateFeatCards(colId, saved);
    };

    vS.onchange = () => { updC(); regen(); };
    cS.onchange = () => { updS(); regen(); };
    sS.onchange = () => regen();
    lI.oninput = () => regen();
    
    if (init) { 
        vS.value = init.version; 
        updC(); 
        cS.value = init.class; 
        updS(); 
        sS.value = init.subclass; 
        lI.value = init.level; 
    }
}

export function generateFeatCards(colId, saved = null) {
    const container = document.getElementById(`feats-container-${colId}`);
    if (!container) return;
    container.innerHTML = ''; 
    let idx = 0;
    const characterData = getState().characterData || [];

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
// --- Cost Row & Output Logic ---
export function addCostRow(change, count, dtp, gold) {
    const tbody = document.getElementById('cost-table-body');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="text" class="text-input cost-change" value="${change}" style="width: 100%;"></td>
        <td><input type="number" class="text-input cost-num-changes" value="${count}" min="0" style="width: 100%;" onchange="window.updateTotalCost()"></td>
        <td><input type="number" class="text-input cost-dtp" value="${dtp}" min="0" style="width: 100%;" onchange="window.updateTotalCost()"></td>
        <td><input type="number" class="text-input cost-gold" value="${gold}" min="0" style="width: 100%;" onchange="window.updateTotalCost()"></td>
        <td><button type="button" class="button" onclick="window.deleteCostRow(this)" style="background-color: #c0392b; color: #fff; padding: 4px 8px;">×</button></td>`;
    tbody.appendChild(row);
}

export function generateOutputString(oldC, newC, cost, notes) {
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

        const featChoices = c.feats.map(f => {
            let m = []; 
            ATTRIBUTES.forEach(a => { if (f.mods[a] != "0") m.push(`+${f.mods[a]} ${a}`); });
            return `${f.name}${m.length ? ' ' + m.join(", ") : ""} (${f.source})`;
        });

        return `**Level:** ${c.classes.reduce((a, b) => a + (parseInt(b.level) || 0), 0)}\n**Class:** ${classLine}\n**Race:** ${c.race}\n**Attributes:** ${ATTRIBUTES.map(a => c.attributes[a]).join('/')}\n**Feats:** ${featChoices.join(', ') || 'None'}`;
    };

    const logs = [];
    if (oldC.name !== newC.name) logs.push(`- Name: ${oldC.name} → ${newC.name}`);
    
    const attrChanges = ATTRIBUTES.filter(a => oldC.attributes[a] !== newC.attributes[a])
        .map(a => `${a} (${oldC.attributes[a]}→${newC.attributes[a]})`);
    if (attrChanges.length > 0) logs.push(`- Attributes: ${attrChanges.join(', ')}`);

    const oldClStr = oldC.classes.map(c => `${c.class} (${c.subclass})`).join('/');
    const newClStr = newC.classes.map(c => `${c.class} (${c.subclass})`).join('/');
    if (oldClStr !== newClStr) logs.push(`- Classes: ${oldClStr} → ${newClStr}`);

    if (oldC.race !== newC.race) logs.push(`- Race: ${oldC.race} → ${newC.race}`);
    if (oldC.bg !== newC.bg) logs.push(`- Origin: ${oldC.bg} → ${newC.bg}`);

    const discordId = document.getElementById('manual-discord-id').value || "Unknown";
    
    return `\`\`\`
__***Character Change Request***__
**Requestor:** @${discordId}

**Old Character**
${buildB(oldC)}

**New Character**
${buildB(newC)}

**Details**
Cost: ${cost}
Notes: ${notes}

__***Change Log***__
${logs.length > 0 ? logs.join('\n') : "- No structural changes detected."}
\`\`\`
<@&474659626193780751> <@&554463237924716545>`;
}