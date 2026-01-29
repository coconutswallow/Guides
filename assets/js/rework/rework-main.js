import { initCharacterData, fetchMyReworks, saveReworkToDb, loadReworkById, deleteReworkById } from "./state-manager.js";
import { 
    scrapeColumn, populateColumn, renderBaseAttributes, renderFeatureRows, 
    addClassRow, removeClassRow, addCostRow, generateOutputString, 
    updatePointBuyDisplay as refreshPoints, generateFeatCards 
} from "./rework-ui.js";
import { computeReworkCosts, getTotalLevel, getAlacarteRates } from "./rework-calculations.js";
import { ATTRIBUTES } from "./rework-constants.js";

// --- Tab & Navigation ---
window.switchTab = (t) => {
    document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
    document.querySelector(`button[onclick*="'${t}'"]`)?.classList.add('active');
    document.getElementById(`tab-${t}`)?.classList.add('active');
    if (t === 'output') window.generateOutput();
    if (t === 'cost') window.calculateCosts();
};

// --- UUID Clipboard Helper ---
window.copyUuid = () => {
    const uuidEl = document.getElementById('current-rework-id');
    if (!uuidEl || !uuidEl.value || uuidEl.value === "Not Saved") {
        alert("No UUID to copy!");
        return;
    }
    navigator.clipboard.writeText(uuidEl.value).then(() => {
        alert("UUID copied to clipboard: " + uuidEl.value);
    });
};

// --- Cost & Summary Logic ---
window.calculateCosts = () => {
    const typeEl = document.getElementById('rework-type');
    if (!typeEl || !typeEl.value) return;
    
    const result = computeReworkCosts(typeEl.value, scrapeColumn('original'), scrapeColumn('new'));
    const err = document.getElementById('cost-error');
    const tbody = document.getElementById('cost-table-body');
    const thead = document.querySelector('#cost-table thead tr');
    
    if (!result.isValid) {
        err.style.display = 'block'; 
        err.innerText = result.error; 
        return;
    }
    
    err.style.display = 'none';
    tbody.innerHTML = '';

    if (result.isFixed) {
        thead.innerHTML = `<th style="text-align: left;">Rework Type</th><th>DTP</th><th>Gold</th><th style="width: 5%;"></th>`;
    } else {
        thead.innerHTML = `<th style="text-align: left;">Detailed Change Description</th><th style="width: 120px;"># Changes</th><th style="width: 5%;"></th>`;
    }

    result.costs.forEach(c => {
        const row = document.createElement('tr');
        if (result.isFixed) {
            row.innerHTML = `<td style="text-align: left;">${c.change}</td><td>${c.dtp}</td><td>${c.gold} GP</td><td></td>`;
        } else {
            row.innerHTML = `<td style="text-align: left; font-size: 0.85em; color: #444;">${c.change}</td>
                             <td><input type="number" class="text-input cost-num-changes" value="${c.count}" onchange="window.updateTotalCost()"></td>
                             <td><button type="button" class="button" onclick="window.deleteCostRow(this)" style="background-color: #c0392b; color: #fff; padding: 4px 8px;">×</button></td>`;
        }
        tbody.appendChild(row);
    });

    result.isFixed ? window.updateFixedSummary(result.costs[0].dtp, result.costs[0].gold) 
                   : window.updateAlacarteSummary(result.rates);
};

window.updateFixedSummary = (dtp, gold) => {
    document.getElementById('total-changes').innerText = "-";
    document.getElementById('total-dtp').innerText = dtp;
    document.getElementById('total-gold').innerText = gold;
    document.getElementById('rework-cost').value = `${gold} GP / ${dtp} DTP`;
};

window.updateAlacarteSummary = (rates) => {
    let totalChanges = 0;
    document.querySelectorAll('.cost-num-changes').forEach(i => totalChanges += parseInt(i.value) || 0);
    
    const tGold = totalChanges * (rates?.gold || 0);
    const tDtp = totalChanges * (rates?.dtp || 0);

    document.getElementById('total-changes').innerText = totalChanges;
    document.getElementById('total-dtp').innerText = `${tDtp} (${totalChanges} chg × ${rates?.dtp || 0})`;
    document.getElementById('total-gold').innerText = `${tGold} GP (${totalChanges} chg × ${rates?.gold || 0})`;
    document.getElementById('rework-cost').value = `${tGold} GP / ${tDtp} DTP`;
};

window.updateTotalCost = () => {
    const type = document.getElementById('rework-type').value;
    if (type === 'alacarte') {
        const rates = getAlacarteRates(getTotalLevel(scrapeColumn('original').classes));
        window.updateAlacarteSummary(rates);
    } else {
        window.calculateCosts();
    }
};

// --- Manual Row Bindings [RESTORED] ---
window.addCostRow = () => addCostRow("", 0, 0, 0);
window.deleteCostRow = (btn) => { 
    btn.closest('tr')?.remove(); 
    window.updateTotalCost(); 
};

window.addClassRow = (col) => addClassRow(col);
window.removeClassRow = (btn) => removeClassRow(btn);
window.calculatePointBuy = (colId) => refreshPoints(colId);

// --- Save / Load / Delete Logic ---
window.fetchReworks = async () => {
    try {
        const data = await fetchMyReworks();
        const sel = document.getElementById('load-rework-select');
        if (!sel) return;
        sel.innerHTML = '<option value="">-- Load My Saved Rework --</option>';
        data.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.id;
            opt.innerText = `${r.character_name || "Unnamed"} (${new Date(r.updated_at).toLocaleDateString()})`;
            sel.appendChild(opt);
        });
    } catch (e) { console.error(e); }
};

window.performLoad = async (id) => {
    if (!id) return;
    try {
        const d = await loadReworkById(id);
        document.getElementById('current-rework-id').value = d.id;
        document.getElementById('manual-discord-id').value = d.discord_id || "";
        document.getElementById('rework-cost').value = d.cost || "";
        document.getElementById('rework-notes').value = d.notes || "";
        
        populateColumn('original', d.old_character);
        populateColumn('new', d.new_character);
        
        generateFeatCards('original', d.old_character.feats);
        generateFeatCards('new', d.new_character.feats);
        
        window.calculateCosts();
    } catch(e) { alert("Load failed: " + e.message); }
};

window.saveRework = async () => {
    try {
        const oldC = scrapeColumn('original');
        const payload = {
            discord_id: document.getElementById('manual-discord-id')?.value || "Unknown",
            character_name: oldC.name,
            old_character: oldC,
            new_character: scrapeColumn('new'),
            cost: document.getElementById('rework-cost')?.value || "",
            notes: document.getElementById('rework-notes')?.value || ""
        };
        const res = await saveReworkToDb(payload);
        document.getElementById('current-rework-id').value = res.id;
        const u = new URL(window.location); u.searchParams.set('id', res.id); window.history.pushState({}, '', u);
        alert("Rework Saved! UUID: " + res.id); 
        await window.fetchReworks();
    } catch(e) { alert("Error saving: " + e.message); }
};

window.loadExternalId = async () => {
    const id = prompt("Enter UUID:");
    if (id) await window.performLoad(id);
};

window.loadSelectedRework = async () => {
    const sel = document.getElementById('load-rework-select');
    if (sel && sel.value) await window.performLoad(sel.value);
};

window.deleteRework = async () => {
    const sel = document.getElementById('load-rework-select');
    if (!sel || !sel.value) return;
    if(!confirm("Are you sure?")) return;
    try {
        await deleteReworkById(sel.value);
        document.getElementById('current-rework-id').value = "";
        await window.fetchReworks();
    } catch (e) { console.error(e); }
};

// --- Copy Utilities [RESTORED] ---
window.copyValue = (s, t) => { 
    const el = document.getElementById(s); 
    const target = document.getElementById(t);
    if(el && target) target.value = el.value; 
};

window.copyAttributes = () => { 
    ATTRIBUTES.forEach(a => { 
        const source = document.getElementById(`attr-original-${a}`);
        const target = document.getElementById(`attr-new-${a}`);
        if (source && target) target.value = source.value;
    }); 
    window.calculatePointBuy('new'); 
};

window.copyMods = (type) => { 
    ATTRIBUTES.forEach(a => { 
        const s = document.querySelector(`.mod-select-${type}[data-col="original"][data-attr="${a}"]`);
        const t = document.querySelector(`.mod-select-${type}[data-col="new"][data-attr="${a}"]`); 
        if(s && t) t.value = s.value; 
    }); 
};

window.copyFeatures = (type) => {
    const sId = type === 'origin-feat' ? `origin-feat-features-container-original` : `${type}-features-container-original`;
    const tId = type === 'origin-feat' ? `origin-feat-features-container-new` : `${type}-features-container-new`;
    const sRows = document.querySelectorAll(`#${sId} .feature-row`);
    const tRows = document.querySelectorAll(`#${tId} .feature-row`);
    sRows.forEach((row, i) => {
        if (tRows[i]) {
            tRows[i].querySelector('.feature-type').value = row.querySelector('.feature-type').value;
            tRows[i].querySelector('.feature-name').value = row.querySelector('.feature-name').value;
        }
    });
};

window.generateOutput = () => {
    const cost = document.getElementById('rework-cost').value;
    const notes = document.getElementById('rework-notes').value;
    document.getElementById('output-text').value = generateOutputString(scrapeColumn('original'), scrapeColumn('new'), cost, notes);
};

// --- App Initialization ---
async function initApp() {
    try {
        ['original', 'new'].forEach(col => {
            renderBaseAttributes(col);
            renderFeatureRows(`race-features-container-${col}`, 4);
            renderFeatureRows(`origin-features-container-${col}`, 4);
            renderFeatureRows(`origin-feat-features-container-${col}`, 4);
        });
        await initCharacterData();
        const urlId = new URLSearchParams(window.location.search).get('id');
        urlId ? await window.performLoad(urlId) : ['original', 'new'].forEach(col => addClassRow(col));
        await window.fetchReworks();
    } catch (error) { console.error(error); }
}

document.addEventListener('DOMContentLoaded', initApp);