import { initCharacterData, fetchMyReworks, saveReworkToDb, loadReworkById, deleteReworkById } from "./state-manager.js";
import { 
    scrapeColumn, populateColumn, renderBaseAttributes, renderFeatureRows, 
    addClassRow, removeClassRow, addCostRow, generateOutputString, 
    updatePointBuyDisplay as refreshPoints
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
        thead.innerHTML = `<th style="text-align: left;">Rework Type</th><th>DTP</th><th>Gold</th>`;
    } else {
        thead.innerHTML = `<th style="text-align: left;">Detailed Change Description</th><th style="width: 120px;"># Changes</th>`;
    }

    result.costs.forEach(c => {
        const row = document.createElement('tr');
        if (result.isFixed) {
            row.innerHTML = `<td style="text-align: left;">${c.change}</td><td>${c.dtp}</td><td>${c.gold} GP</td>`;
        } else {
            row.innerHTML = `<td style="text-align: left; font-size: 0.85em; color: #444;">${c.change}</td>
                             <td><input type="number" class="text-input cost-num-changes" value="${c.count}" onchange="window.updateTotalCost()"></td>`;
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

// --- UI Row Management Bindings ---
window.addClassRow = (col) => addClassRow(col);
window.removeClassRow = (btn) => removeClassRow(btn);
window.calculatePointBuy = (colId) => refreshPoints(colId);

// --- Save / Load / Delete Logic ---

// This updates the dropdown list in the UI
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
        console.error("Error fetching UI list:", e);
    }
};

window.performLoad = async (id) => {
    if (!id) return;
    try {
        const d = await loadReworkById(id);
        
        // 1. Update basic UI metadata
        document.getElementById('current-rework-id').value = d.id;
        document.getElementById('manual-discord-id').value = d.discord_id || "";
        document.getElementById('rework-cost').value = d.cost || "";
        document.getElementById('rework-notes').value = d.notes || "";
        
        // 2. Populate character columns 
        // Note: populateColumn handles the class rows and race/origin data
        populateColumn('original', d.old_character);
        populateColumn('new', d.new_character);
        
        // 3. FORCE FEAT GENERATION: Pass the saved feats specifically
        // We do this after populateColumn has finished building the class row DOM
        generateFeatCards('original', d.old_character.feats);
        generateFeatCards('new', d.new_character.feats);
        
        // 4. Final calculation refresh
        window.calculateCosts();
    } catch(e) {
        console.error("Load failed:", e);
        alert("Load failed: " + e.message);
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
        document.getElementById('current-rework-id').value = res.id;
        
        const u = new URL(window.location); 
        u.searchParams.set('id', res.id); 
        window.history.pushState({}, '', u);
        
        alert("Rework Saved! UUID: " + res.id); 
        await window.fetchReworks(); // This ensures the dropdown updates after saving
    } catch(e) { 
        console.error("Save error:", e);
        alert("Error saving: " + e.message); 
    }
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

        const urlParams = new URLSearchParams(window.location.search);
        const urlId = urlParams.get('id');

        if (urlId) {
            // Use the fixed window version
            await window.performLoad(urlId);
        } else {
            // Default empty state
            ['original', 'new'].forEach(col => addClassRow(col));
        }

        await window.fetchReworks();
    } catch (error) {
        console.error("Initialization error:", error);
    }
}

document.addEventListener('DOMContentLoaded', initApp);