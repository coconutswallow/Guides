import { initCharacterData, fetchMyReworks, saveReworkToDb, loadReworkById, deleteReworkById } from "./state-manager.js";
import { 
    scrapeColumn, populateColumn, renderBaseAttributes, renderFeatureRows, 
    addClassRow, removeClassRow, addCostRow, generateOutputString, 
    updatePointBuyDisplay as refreshPoints, generateFeatCards, copyFeatures as uiCopyFeatures
} from "./rework-ui.js";
import { computeReworkCosts } from "./rework-calculations.js";
import { ATTRIBUTES } from "./rework-constants.js";

async function initApp() {
    console.log("Initializing Rework Tool...");

    // 1. Initialize UI Elements immediately
    ['original', 'new'].forEach(col => {
        renderBaseAttributes(col);
        renderFeatureRows(`race-features-container-${col}`, 4);
        renderFeatureRows(`origin-features-container-${col}`, 4);
        renderFeatureRows(`origin-feat-features-container-${col}`, 4);
        addClassRow(col); 
    });

    // 2. Load Data from Supabase
    await initCharacterData();

    // 3. Populate history
    await window.fetchReworks();

    // 4. Check URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('id')) await window.loadExternalId(urlParams.get('id'));

    // 5. Show logged-in controls (Auth removed as requested, just showing controls)
    const controls = document.getElementById('logged-in-controls');
    if(controls) controls.style.display = 'flex';
}

// --- Window Bindings (Events) ---
window.switchTab = (t) => {
    document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
    document.querySelector(`button[onclick*="'${t}'"]`)?.classList.add('active');
    document.getElementById(`tab-${t}`).classList.add('active');
    if (t === 'output') window.generateOutput();
    if (t === 'cost' && document.getElementById('cost-table-body').children.length === 0) window.calculateCosts();
};

window.toggleAccordion = (id) => {
    const c = document.getElementById(`${id}-content`);
    const i = document.getElementById(`${id}-icon`);
    c.style.display = c.style.display === 'none' ? 'block' : 'none';
    i.innerText = c.style.display === 'none' ? '▶' : '▼';
};

window.addClassRow = (col) => addClassRow(col);
window.removeClassRow = (btn) => removeClassRow(btn);
window.calculatePointBuy = (colId) => refreshPoints(colId);

// Copy Utilities
window.copyValue = (s, t) => { const el = document.getElementById(s); if(el) document.getElementById(t).value = el.value; };
window.copyAttributes = () => { ['STR','DEX','CON','INT','WIS','CHA'].forEach(a => { document.getElementById(`attr-new-${a}`).value = document.getElementById(`attr-original-${a}`).value; }); window.calculatePointBuy('new'); };
window.copyMods = (type) => { 
    ATTRIBUTES.forEach(a => { 
        const s = document.querySelector(`.mod-select-${type}[data-col="original"][data-attr="${a}"]`);
        const t = document.querySelector(`.mod-select-${type}[data-col="new"][data-attr="${a}"]`); 
        if(s && t) t.value = s.value; 
    }); 
};
window.copyFeatures = (type) => {
    const sourceRows = document.querySelectorAll(`#${type}-features-container-original .feature-row`);
    const targetRows = document.querySelectorAll(`#${type}-features-container-new .feature-row`);
    sourceRows.forEach((sourceRow, i) => {
        if (targetRows[i]) {
            const sType = sourceRow.querySelector('.feature-type');
            const sName = sourceRow.querySelector('.feature-name');
            const tType = targetRows[i].querySelector('.feature-type');
            const tName = targetRows[i].querySelector('.feature-name');
            if (sType && tType) tType.value = sType.value;
            if (sName && tName) tName.value = sName.value;
        }
    });
};

// Cost Logic bindings
window.addCostRow = () => addCostRow("", 0, 0, 0);
window.deleteCostRow = (btn) => { btn.closest('tr').remove(); window.updateTotalCost(); };

window.updateTotalCost = () => {
    let ch = 0, dtp = 0, gold = 0;
    document.querySelectorAll('#cost-table-body tr').forEach(r => {
        ch += parseInt(r.querySelector('.cost-num-changes')?.value) || 0;
        dtp += parseInt(r.querySelector('.cost-dtp')?.value) || 0;
        gold += parseInt(r.querySelector('.cost-gold')?.value) || 0;
    });
    const set = (id, v) => document.getElementById(id).innerText = v;
    set('total-changes', ch); set('total-dtp', dtp); set('total-gold', gold);
};

window.calculateCosts = () => {
    const type = document.getElementById('rework-type').value;
    const result = computeReworkCosts(type, scrapeColumn('original'), scrapeColumn('new'));
    
    const err = document.getElementById('cost-error');
    if (!result.isValid) {
        err.style.display = 'block'; err.innerText = result.error; return;
    }
    err.style.display = 'none';
    document.getElementById('cost-table-body').innerHTML = '';
    result.costs.forEach(c => addCostRow(c.change, c.count, c.dtp, c.gold));
    window.updateTotalCost();
};

window.generateOutput = () => {
    const out = generateOutputString(scrapeColumn('original'), scrapeColumn('new'), document.getElementById('rework-cost').value, document.getElementById('rework-notes').value);
    document.getElementById('output-text').value = out;
};

// DB Bindings
window.fetchReworks = async () => {
    const data = await fetchMyReworks();
    const sel = document.getElementById('load-rework-select');
    sel.innerHTML = '<option value="">-- Load My Saved Rework --</option>';
    data.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.id;
        opt.innerText = `${r.character_name || "Unnamed"} (${new Date(r.updated_at).toLocaleDateString()})`;
        sel.appendChild(opt);
    });
};

window.saveRework = async () => {
    const oldC = scrapeColumn('original');
    const newC = scrapeColumn('new');
    const costRows = [];
    document.querySelectorAll('#cost-table-body tr').forEach(r => costRows.push({
        change: r.querySelector('.cost-change').value,
        numChanges: parseInt(r.querySelector('.cost-num-changes').value) || 0,
        dtpCost: parseInt(r.querySelector('.cost-dtp').value) || 0,
        goldCost: parseInt(r.querySelector('.cost-gold').value) || 0
    }));
    
    // Adapter: Store non-schema fields in new_character meta
    newC._rework_meta = { rework_type: document.getElementById('rework-type').value, cost_rows: costRows };
    
    const payload = {
        discord_id: document.getElementById('manual-discord-id').value || "Unknown",
        character_name: oldC.name,
        old_character: oldC,
        new_character: newC,
        cost: document.getElementById('rework-cost').value,
        notes: document.getElementById('rework-notes').value
    };

    try {
        const res = await saveReworkToDb(payload);
        document.getElementById('current-rework-id').value = res.id;
        const u = new URL(window.location); u.searchParams.set('id', res.id); window.history.pushState({},'',u);
        alert("Rework Saved! ID: " + res.id); 
        window.fetchReworks();
    } catch(e) { alert("Error: " + e.message); }
};

window.loadExternalId = async (id) => {
    if(!id) id = prompt("UUID:");
    if(!id) return;
    try {
        const d = await loadReworkById(id);
        document.getElementById('current-rework-id').value = d.id;
        document.getElementById('manual-discord-id').value = d.discord_id;
        document.getElementById('rework-cost').value = d.cost;
        document.getElementById('rework-notes').value = d.notes;
        
        const meta = d.new_character?._rework_meta || {};
        const costRows = meta.cost_rows || d.cost_rows || []; // Fallback
        
        document.getElementById('rework-type').value = meta.rework_type || d.rework_type || "";
        document.getElementById('cost-table-body').innerHTML = '';
        costRows.forEach(r => addCostRow(r.change, r.numChanges || r.cost || 0, r.dtpCost || 0, r.goldCost || 0));
        
        populateColumn('original', d.old_character);
        populateColumn('new', d.new_character);
        window.updateTotalCost();
    } catch(e) { alert("Load failed: " + e.message); }
};

window.loadSelectedRework = () => window.loadExternalId(document.getElementById('load-rework-select').value);

window.deleteRework = async () => {
    const id = document.getElementById('load-rework-select').value;
    if(!id) return alert("Select a rework first.");
    if(!confirm("Are you sure?")) return;
    try {
        await deleteReworkById(id);
        if(document.getElementById('current-rework-id').value == id) document.getElementById('current-rework-id').value = "";
        alert("Deleted"); 
        window.fetchReworks();
    } catch (e) { alert("Delete failed: " + e.message); }
};

initApp();