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
        const costRows = [];
        
        document.querySelectorAll('#cost-table-body tr').forEach(r => {
            const changeEl = r.querySelector('.cost-change');
            const numEl = r.querySelector('.cost-num-changes');
            const dtpEl = r.querySelector('.cost-dtp');
            const goldEl = r.querySelector('.cost-gold');
            
            costRows.push({
                change: changeEl?.value || "",
                numChanges: parseInt(numEl?.value) || 0,
                dtpCost: parseInt(dtpEl?.value) || 0,
                goldCost: parseInt(goldEl?.value) || 0
            });
        });
        
        // Store non-schema fields in new_character meta
        newC._rework_meta = { 
            rework_type: document.getElementById('rework-type')?.value || "", 
            cost_rows: costRows 
        };
        
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
        if (currentIdEl) currentIdEl.value = res.id;
        
        const u = new URL(window.location); 
        u.searchParams.set('id', res.id); 
        window.history.pushState({}, '', u);
        
        alert("Rework Saved! ID: " + res.id); 
        await window.fetchReworks();
    } catch(e) { 
        console.error("Save error:", e);
        alert("Error saving: " + e.message); 
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

// Initialize app
async function initApp() {
    console.log("Initializing Rework Tool...");

    try {
        // 1. Initialize UI Elements
        ['original', 'new'].forEach(col => {
            console.log(`Rendering UI for column: ${col}`);
            renderBaseAttributes(col);
            renderFeatureRows(`race-features-container-${col}`, 4);
            renderFeatureRows(`origin-features-container-${col}`, 4);
            renderFeatureRows(`origin-feat-features-container-${col}`, 4);
            addClassRow(col); 
        });

        // 2. Load Data from Supabase
        console.log("Loading character data...");
        await initCharacterData();

        // 3. Populate history
        console.log("Fetching saved reworks...");
        await window.fetchReworks();

        // 4. Check URL for ID parameter
        const urlParams = new URLSearchParams(window.location.search);
        const urlId = urlParams.get('id');
        if (urlId) {
            console.log("Loading rework from URL:", urlId);
            await window.loadExternalId(urlId);
        }

        // 5. Show controls
        const controls = document.getElementById('logged-in-controls');
        if(controls) {
            controls.style.display = 'flex';
            console.log("Controls shown");
        }
        
        console.log("✓ Rework Tool initialized successfully");
    } catch (error) {
        console.error("✗ Initialization error:", error);
        alert("Failed to initialize: " + error.message);
    }
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // DOM already loaded
    initApp();
}