import { initCharacterData, fetchMyReworks, saveReworkToDb, loadReworkById, deleteReworkById } from "./state-manager.js";
import { 
    scrapeColumn, populateColumn, renderBaseAttributes, renderFeatureRows, 
    addClassRow, removeClassRow, addCostRow, generateOutputString, 
    updatePointBuyDisplay as refreshPoints, generateFeatCards
} from "./rework-ui.js";
import { computeReworkCosts, getTotalLevel, getAlacarteRates } from "./rework-calculations.js";
import { ATTRIBUTES } from "./rework-constants.js";

// --- Window Bindings (Events) ---
window.switchTab = (t) => {
    document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
    document.querySelector(`button[onclick*="'${t}'"]`)?.classList.add('active');
    document.getElementById(`tab-${t}`)?.classList.add('active');
    if (t === 'output') window.generateOutput();
    if (t === 'cost' && document.getElementById('cost-table-body')?.children.length === 0) window.calculateCosts();
};

window.toggleAccordion = (id) => {
    const c = document.getElementById(`${id}-content`);
    const i = document.getElementById(`${id}-icon`);
    if (!c || !i) return;
    c.style.display = c.style.display === 'none' ? 'block' : 'none';
    i.innerText = c.style.display === 'none' ? '▶' : '▼';
};

window.addClassRow = (col) => addClassRow(col);
window.removeClassRow = (btn) => removeClassRow(btn);
window.calculatePointBuy = (colId) => refreshPoints(colId);

// Copy Utilities
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

// --- Cost Logic & Summary Handling ---

window.addCostRow = () => addCostRow("", 0, 0, 0);
window.deleteCostRow = (btn) => { 
    btn.closest('tr')?.remove(); 
    window.updateTotalCost(); 
};

window.calculateCosts = () => {
    const typeEl = document.getElementById('rework-type');
    if (!typeEl) return;
    
    const type = typeEl.value;
    const result = computeReworkCosts(type, scrapeColumn('original'), scrapeColumn('new'));
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

    // Switch table headers based on whether it's a flat rate or per-change basis
    if (result.isFixed) {
        thead.innerHTML = `<th style="width: 70%;">Rework Type</th><th style="width: 15%;">DTP Cost</th><th style="width: 15%;">Gold Cost</th>`;
    } else {
        thead.innerHTML = `<th style="width: 70%;">Change Description</th><th style="width: 30%;"># of Changes</th>`;
    }

    result.costs.forEach(c => {
        const row = document.createElement('tr');
        if (result.isFixed) {
            row.innerHTML = `<td>${c.change}</td><td>${c.dtp}</td><td>${c.gold} GP</td>`;
        } else {
            row.innerHTML = `<td>${c.change}</td><td><input type="number" class="text-input cost-num-changes" value="${c.count}" onchange="window.updateTotalCost()"></td>`;
        }
        tbody.appendChild(row);
    });

    if (result.isFixed) {
        window.updateFixedSummary(result.costs[0].dtp, result.costs[0].gold);
    } else {
        window.updateAlacarteSummary(result.rates);
    }
};

window.updateFixedSummary = (dtp, gold) => {
    document.getElementById('total-changes').innerText = "-";
    document.getElementById('total-dtp').innerText = dtp;
    document.getElementById('total-gold').innerText = gold;
    document.getElementById('rework-cost').value = `${gold} GP / ${dtp} DTP`;
};

window.updateAlacarteSummary = (rates) => {
    let totalChanges = 0;
    document.querySelectorAll('.cost-num-changes').forEach(input => {
        totalChanges += parseInt(input.value) || 0;
    });
    
    const totalGold = totalChanges * (rates?.gold || 0);
    const totalDtp = totalChanges * (rates?.dtp || 0);

    document.getElementById('total-changes').innerText = totalChanges;
    document.getElementById('total-dtp').innerText = `${totalDtp} (${totalChanges} chg × ${rates?.dtp || 0} DTP)`;
    document.getElementById('total-gold').innerText = `${totalGold} GP (${totalChanges} chg × ${rates?.gold || 0} GP)`;
    document.getElementById('rework-cost').value = `${totalGold} GP / ${totalDtp} DTP`;
};

window.updateTotalCost = () => {
    const type = document.getElementById('rework-type').value;
    if (type === 'alacarte') {
        const origLevel = getTotalLevel(scrapeColumn('original'));
        const rates = getAlacarteRates(origLevel);
        window.updateAlacarteSummary(rates);
    } else {
        // For fixed reworks, re-running calculateCosts is safest to ensure level ranges still match
        window.calculateCosts();
    }
};

window.generateOutput = () => {
    const costEl = document.getElementById('rework-cost');
    const notesEl = document.getElementById('rework-notes');
    const outputEl = document.getElementById('output-text');
    if (!costEl || !notesEl || !outputEl) return;
    
    const out = generateOutputString(
        scrapeColumn('original'), 
        scrapeColumn('new'), 
        costEl.value, 
        notesEl.value
    );
    outputEl.value = out;
};

// --- DB & State Persistence ---

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
    } catch (e) {
        console.error("Error fetching reworks:", e);
    }
};

window.saveRework = async () => {
    try {
        const oldC = scrapeColumn('original');
        const newC = scrapeColumn('new');
        
        const payload = {
            discord_id: document.getElementById('manual-discord-id')?.value || "Unknown",
            character_name: oldC.name,
            old_character: oldC,
            new_character: newC,
            cost: document.getElementById('rework-cost')?.value || "",
            notes: document.getElementById('rework-notes')?.value || ""
        };

        const res = await saveReworkToDb(payload);
        
        const currentIdEl = document.getElementById('current-rework-id');
        if (currentIdEl) {
            currentIdEl.value = res.id;
        }
        
        const u = new URL(window.location); 
        u.searchParams.set('id', res.id); 
        window.history.pushState({}, '', u);
        
        alert("Rework Saved! UUID: " + res.id); 
        await window.fetchReworks();
    } catch(e) { 
        console.error("Save error:", e);
        alert("Error saving: " + e.message); 
    }
};

async function performLoad(id) {
    if (!id) return;
    try {
        const d = await loadReworkById(id);
        
        document.getElementById('current-rework-id').value = d.id;
        document.getElementById('manual-discord-id').value = d.discord_id || "";
        document.getElementById('rework-cost').value = d.cost || "";
        document.getElementById('rework-notes').value = d.notes || "";
        
        populateColumn('original', d.old_character);
        populateColumn('new', d.new_character);
        
        // Refresh calculation display
        window.calculateCosts();
    } catch(e) {
        alert("Load failed: " + e.message);
    }
}

window.loadExternalId = async () => {
    const id = prompt("Enter UUID:");
    if (id) await performLoad(id);
};

window.loadSelectedRework = async () => {
    const sel = document.getElementById('load-rework-select');
    if (sel && sel.value) await performLoad(sel.value);
};

window.deleteRework = async () => {
    const sel = document.getElementById('load-rework-select');
    if (!sel || !sel.value) {
        alert("Please select a rework first.");
        return;
    }
    if(!confirm("Are you sure you want to delete this rework?")) return;
    try {
        await deleteReworkById(sel.value);
        document.getElementById('current-rework-id').value = "";
        alert("Rework deleted successfully"); 
        await window.fetchReworks();
    } catch (e) { 
        console.error("Delete error:", e);
        alert("Delete failed: " + e.message); 
    }
};

// --- App Initialization ---

async function initApp() {
    try {
        // Initialize UI containers
        ['original', 'new'].forEach(col => {
            renderBaseAttributes(col);
            renderFeatureRows(`race-features-container-${col}`, 4);
            renderFeatureRows(`origin-features-container-${col}`, 4);
            renderFeatureRows(`origin-feat-features-container-${col}`, 4);
        });

        await initCharacterData();

        const urlParams = new URLSearchParams(window.location.search);
        const urlId = urlParams.get('id');

        if (urlId) {
            await performLoad(urlId);
        } else {
            ['original', 'new'].forEach(col => addClassRow(col));
        }

        await window.fetchReworks();
    } catch (error) {
        console.error("Initialization error:", error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}