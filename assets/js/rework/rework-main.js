import { initCharacterData, fetchMyReworks, saveReworkToDb, loadReworkById, deleteReworkById } from "./state-manager.js";
import { 
    scrapeColumn, populateColumn, renderBaseAttributes, renderFeatureRows, 
    addClassRow, removeClassRow, addCostRow, generateOutputString, 
    updatePointBuyDisplay as refreshPoints, generateFeatCards
} from "./rework-ui.js";
import { computeReworkCosts } from "./rework-calculations.js";
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

// Cost Logic bindings
window.addCostRow = () => addCostRow("", 0, 0, 0);
window.deleteCostRow = (btn) => { 
    btn.closest('tr')?.remove(); 
    window.updateTotalCost(); 
};

window.updateTotalCost = () => {
    let ch = 0, dtp = 0, gold = 0;
    document.querySelectorAll('#cost-table-body tr').forEach(r => {
        ch += parseInt(r.querySelector('.cost-num-changes')?.value) || 0;
        dtp += parseInt(r.querySelector('.cost-dtp')?.value) || 0;
        gold += parseInt(r.querySelector('.cost-gold')?.value) || 0;
    });
    const set = (id, v) => { 
        const el = document.getElementById(id);
        if (el) el.innerText = v;
    };
    set('total-changes', ch); 
    set('total-dtp', dtp); 
    set('total-gold', gold);
};

window.calculateCosts = () => {
    const typeEl = document.getElementById('rework-type');
    if (!typeEl) return;
    
    const type = typeEl.value;
    const result = computeReworkCosts(type, scrapeColumn('original'), scrapeColumn('new'));
    
    const err = document.getElementById('cost-error');
    const tbody = document.getElementById('cost-table-body');
    if (!err || !tbody) return;
    
    if (!result.isValid) {
        err.style.display = 'block'; 
        err.innerText = result.error; 
        return;
    }
    err.style.display = 'none';
    tbody.innerHTML = '';
    result.costs.forEach(c => addCostRow(c.change, c.count, c.dtp, c.gold));
    window.updateTotalCost();
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

// DB Bindings
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
        
        // ... (keep your costRows scraping logic here) ...

        const payload = {
            discord_id: document.getElementById('manual-discord-id')?.value || "Unknown",
            character_name: oldC.name,
            old_character: oldC,
            new_character: newC,
            cost: document.getElementById('rework-cost')?.value || "",
            notes: document.getElementById('rework-notes')?.value || ""
        };

        const res = await saveReworkToDb(payload);
        
        // Update the UI with the new ID
        const currentIdEl = document.getElementById('current-rework-id');
        if (currentIdEl) {
            currentIdEl.value = res.id;
            currentIdEl.type = "text"; // Make it visible if it was hidden
            currentIdEl.style.display = "inline-block";
            currentIdEl.readOnly = true;
        }
        
        // Update URL and Refresh Dropdown
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

// --- Load Logic ---
// This handles the actual data population
async function performLoad(id) {
    if (!id) return;
    try {
        const d = await loadReworkById(id);
        
        // UI Updates
        document.getElementById('current-rework-id').value = d.id;
        document.getElementById('manual-discord-id').value = d.discord_id || "";
        document.getElementById('rework-cost').value = d.cost || "";
        document.getElementById('rework-notes').value = d.notes || "";
        
        const meta = d.new_character?._rework_meta || {};
        if (document.getElementById('rework-type')) {
            document.getElementById('rework-type').value = meta.rework_type || "";
        }
        
        const tbody = document.getElementById('cost-table-body');
        if (tbody) {
            tbody.innerHTML = '';
            (meta.cost_rows || []).forEach(r => addCostRow(r.change, r.numChanges, r.dtpCost, r.goldCost));
        }
        
        populateColumn('original', d.old_character);
        populateColumn('new', d.new_character);
        window.updateTotalCost();
    } catch(e) {
        alert("Load failed: " + e.message);
    }
}

// Triggered by "Load UUID" button
window.loadExternalId = async () => {
    const id = prompt("Enter UUID:");
    if (id) await performLoad(id);
};

// Triggered by Dropdown onchange
window.loadSelectedRework = async () => {
    const sel = document.getElementById('load-rework-select');
    if (sel && sel.value) {
        await performLoad(sel.value);
    }
};

window.loadExternalId = async (id) => {
    if(!id) {
        id = prompt("Enter UUID:");
    }
    if(!id) return;
    
    try {
        const d = await loadReworkById(id);
        
        const currentIdEl = document.getElementById('current-rework-id');
        const discordIdEl = document.getElementById('manual-discord-id');
        const costEl = document.getElementById('rework-cost');
        const notesEl = document.getElementById('rework-notes');
        const typeEl = document.getElementById('rework-type');
        const tbody = document.getElementById('cost-table-body');
        
        if (currentIdEl) currentIdEl.value = d.id;
        if (discordIdEl) discordIdEl.value = d.discord_id || "";
        if (costEl) costEl.value = d.cost || "";
        if (notesEl) notesEl.value = d.notes || "";
        
        const meta = d.new_character?._rework_meta || {};
        const costRows = meta.cost_rows || [];
        
        if (typeEl) typeEl.value = meta.rework_type || "";
        if (tbody) {
            tbody.innerHTML = '';
            costRows.forEach(r => addCostRow(r.change, r.numChanges || 0, r.dtpCost || 0, r.goldCost || 0));
        }
        
        populateColumn('original', d.old_character);
        populateColumn('new', d.new_character);
        window.updateTotalCost();
    } catch(e) { 
        console.error("Load error:", e);
        alert("Load failed: " + e.message); 
    }
};

window.loadSelectedRework = () => {
    const sel = document.getElementById('load-rework-select');
    if (sel && sel.value) {
        window.loadExternalId(sel.value);
    }
};

window.deleteRework = async () => {
    const sel = document.getElementById('load-rework-select');
    if (!sel) return;
    
    const id = sel.value;
    if(!id) {
        alert("Please select a rework first.");
        return;
    }
    
    if(!confirm("Are you sure you want to delete this rework?")) return;
    
    try {
        await deleteReworkById(id);
        const currentIdEl = document.getElementById('current-rework-id');
        if(currentIdEl && currentIdEl.value == id) {
            currentIdEl.value = "";
        }
        alert("Rework deleted successfully"); 
        await window.fetchReworks();
    } catch (e) { 
        console.error("Delete error:", e);
        alert("Delete failed: " + e.message); 
    }
};

async function initApp() {
    console.log("Initializing Rework Tool...");

    try {
        // 1. Initialize Static UI (No data dependency)
        ['original', 'new'].forEach(col => {
            renderBaseAttributes(col);
            renderFeatureRows(`race-features-container-${col}`, 4);
            renderFeatureRows(`origin-features-container-${col}`, 4);
            renderFeatureRows(`origin-feat-features-container-${col}`, 4);
            // Removed addClassRow from here to prevent "dead" cards
        });

        // 2. Load Data from Supabase
        // This must complete so getState().characterData is populated
        await initCharacterData();

        // 3. Handle URL loading OR Default State
        const urlParams = new URLSearchParams(window.location.search);
        const urlId = urlParams.get('id');

        if (urlId) {
            // loadExternalId calls populateColumn, which handles its own addClassRow
            await window.loadExternalId(urlId);
        } else {
            // Fresh start: Add exactly ONE row per column now that data is ready
            ['original', 'new'].forEach(col => {
                addClassRow(col);
            });
        }

        // 4. Final UI Polishing
        await window.fetchReworks();
        const controls = document.getElementById('logged-in-controls');
        if(controls) controls.style.display = 'flex';
        
        console.log("✓ Rework Tool initialized successfully");
    } catch (error) {
        console.error("✗ Initialization error:", error);
    }
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // DOM already loaded
    initApp();
}