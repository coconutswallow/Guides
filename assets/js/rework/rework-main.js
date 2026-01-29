import { 
    initCharacterData, 
    fetchMyReworks, 
    saveReworkToDb, 
    loadReworkById, 
    deleteReworkById,  // Fixed: Imported correctly now
    getState 
} from "./state-manager.js";

import { 
    scrapeColumn, 
    populateColumn, 
    renderBaseAttributes,
    renderFeatureRows,
    addClassRow, 
    removeClassRow, 
    generateFeatCards,
    addCostRow,
    generateOutputString,
    updatePointBuyDisplay as refreshPoints 
} from "./rework-ui.js";

import { computeReworkCosts } from "./rework-calculations.js";
import { ATTRIBUTES } from "./rework-constants.js";

// ==========================================
// 1. INITIALIZATION
// ==========================================

async function initApp() {
    console.log("Initializing Rework Tool...");

    // 1. Load Data from Supabase (Lookups)
    // We load this FIRST so that addClassRow can populate dropdowns correctly
    await initCharacterData();

    // 2. Initialize UI Elements (Attributes, Feature Rows)
    ['original', 'new'].forEach(col => {
        renderBaseAttributes(col);
        
        // Initialize feature containers with default empty rows
        renderFeatureRows(`race-features-container-${col}`, 4);
        renderFeatureRows(`origin-features-container-${col}`, 4);
        renderFeatureRows(`origin-feat-features-container-${col}`, 4);
        
        // Add one empty class row to start
        addClassRow(col);
    });

    // 3. Populate "My Reworks" dropdown from LocalStorage history
    await window.fetchReworks();

    // 4. Check URL for shared UUID (e.g., rework.html?id=123-abc)
    const urlParams = new URLSearchParams(window.location.search);
    const sharedId = urlParams.get('id');
    if (sharedId) {
        console.log("Found shared ID in URL:", sharedId);
        await window.loadExternalId(sharedId);
    }

    // 5. Show Controls
    const controls = document.getElementById('logged-in-controls');
    if (controls) controls.style.display = 'flex';
}

// ==========================================
// 2. GLOBAL WINDOW FUNCTIONS (For HTML Events)
// ==========================================

// --- Navigation ---

window.switchTab = (t) => {
    document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
    
    // Activate Button
    const btn = document.querySelector(`button[onclick*="'${t}'"]`);
    if (btn) btn.classList.add('active');
    
    // Activate Content
    const content = document.getElementById(`tab-${t}`);
    if (content) content.classList.add('active');

    // Trigger Tab Specific Logic
    if (t === 'output') {
        window.generateOutput();
    }
    if (t === 'cost') {
        // Auto-calculate if table is empty
        const tbody = document.getElementById('cost-table-body');
        if (!tbody || tbody.children.length === 0) {
            window.calculateCosts();
        }
    }
};

window.toggleAccordion = function(id) {
    const content = document.getElementById(`${id}-content`);
    const icon = document.getElementById(`${id}-icon`);
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.innerText = '▼';
    } else {
        content.style.display = 'none';
        icon.innerText = '▶';
    }
};

// --- Character Editing ---

window.addClassRow = (col) => addClassRow(col);
window.removeClassRow = (btn) => removeClassRow(btn);

window.calculatePointBuy = (colId) => {
    refreshPoints(colId);
};

// Copy Utilities
window.copyValue = (s, t) => { 
    const src = document.getElementById(s);
    const tgt = document.getElementById(t);
    if(src && tgt) tgt.value = src.value; 
};

window.copyAttributes = () => { 
    ATTRIBUTES.forEach(a => {
        const src = document.getElementById(`attr-original-${a}`);
        const tgt = document.getElementById(`attr-new-${a}`);
        if(src && tgt) tgt.value = src.value;
    });
    window.calculatePointBuy('new'); 
};

window.copyMods = (type) => { 
    ATTRIBUTES.forEach(a => { 
        const s = document.querySelector(`.mod-select-${type}[data-col="original"][data-attr="${a}"]`);
        const t = document.querySelector(`.mod-select-${type}[data-col="new"][data-attr="${a}"]`); 
        if (s && t) t.value = s.value; 
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

// --- Cost Calculation ---

window.addCostRow = () => addCostRow("", 0, 0, 0); // Empty row manually added by user

window.deleteCostRow = (btn) => { 
    btn.closest('tr').remove(); 
    window.updateTotalCost(); 
};

window.calculateCosts = () => {
    const type = document.getElementById('rework-type').value;
    const oldC = scrapeColumn('original');
    const newC = scrapeColumn('new');
    
    const result = computeReworkCosts(type, oldC, newC);
    
    const errDiv = document.getElementById('cost-error');
    if (!result.isValid) {
        if(errDiv) {
            errDiv.innerText = result.error;
            errDiv.style.display = 'block';
        } else {
            alert(result.error);
        }
        return;
    }
    
    if(errDiv) errDiv.style.display = 'none';
    
    // Clear and populate table
    document.getElementById('cost-table-body').innerHTML = '';
    result.costs.forEach(c => addCostRow(c.change, c.count, c.dtp, c.gold));
    
    window.updateTotalCost();
};

window.updateTotalCost = () => {
    let totalChanges = 0;
    let totalDTP = 0;
    let totalGold = 0;
    
    document.querySelectorAll('#cost-table-body tr').forEach(row => {
        totalChanges += parseInt(row.querySelector('.cost-num-changes')?.value) || 0;
        totalDTP += parseInt(row.querySelector('.cost-dtp')?.value) || 0;
        totalGold += parseInt(row.querySelector('.cost-gold')?.value) || 0;
    });
    
    const setTxt = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };
    setTxt('total-changes', totalChanges);
    setTxt('total-dtp', totalDTP);
    setTxt('total-gold', totalGold);
};

// --- Output Generation ---

window.generateOutput = () => {
    const oldC = scrapeColumn('original');
    const newC = scrapeColumn('new');
    
    // Gather cost info string
    const cost = document.getElementById('rework-cost').value || 'None';
    const notes = document.getElementById('rework-notes').value || 'None';
    
    const outputString = generateOutputString(oldC, newC, cost, notes);
    
    const outputBox = document.getElementById('output-text');
    if(outputBox) outputBox.value = outputString;
};

// ==========================================
// 3. DATABASE / STATE ACTIONS
// ==========================================

window.fetchReworks = async () => {
    const reworks = await fetchMyReworks();
    const select = document.getElementById('load-rework-select');
    if(!select) return;

    select.innerHTML = '<option value="">-- Load My Saved Rework --</option>';
    
    reworks.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.id;
        opt.innerText = `${r.character_name || "Unnamed"} (${new Date(r.updated_at).toLocaleDateString()})`;
        select.appendChild(opt);
    });
};

window.saveRework = async () => {
    const discordId = document.getElementById('manual-discord-id').value;
    if (!discordId) {
        return alert("Please enter your Discord ID (top right) before saving.");
    }

    try {
        const oldC = scrapeColumn('original');
        const newC = scrapeColumn('new');
        
        // Scrape Cost Rows manually
        const costRows = [];
        document.querySelectorAll('#cost-table-body tr').forEach(row => {
            costRows.push({
                change: row.querySelector('.cost-change')?.value || '',
                numChanges: parseInt(row.querySelector('.cost-num-changes')?.value) || 0,
                dtpCost: parseInt(row.querySelector('.cost-dtp')?.value) || 0,
                goldCost: parseInt(row.querySelector('.cost-gold')?.value) || 0
            });
        });

        // Store metadata inside new_character (adapter pattern)
        newC._rework_meta = {
            rework_type: document.getElementById('rework-type').value,
            cost_rows: costRows
        };

        const payload = {
            discord_id: discordId,
            character_name: oldC.name || "Unnamed",
            old_character: oldC,
            new_character: newC, 
            cost: document.getElementById('rework-cost').value,
            notes: document.getElementById('rework-notes').value,
        };

        const result = await saveReworkToDb(payload);

        // Update URL
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('id', result.id);
        window.history.pushState({}, '', newUrl);

        document.getElementById('current-rework-id').value = result.id;
        
        alert(`Rework Saved!\n\nID: ${result.id}\n(You can copy the URL to share this rework)`);
        
        // Refresh dropdown
        window.fetchReworks();
    } catch (e) {
        console.error(e);
        alert("Save failed: " + e.message);
    }
};

window.loadSelectedRework = async () => {
    const id = document.getElementById('load-rework-select').value;
    if (!id) return;
    await window.loadExternalId(id);
};

window.loadExternalId = async (id) => {
    if (!id) {
        id = prompt("Please paste the Rework UUID:");
    }
    if (!id) return;

    try {
        const data = await loadReworkById(id);
        
        // Populate Meta Fields
        document.getElementById('current-rework-id').value = data.id;
        document.getElementById('manual-discord-id').value = data.discord_id || "";
        document.getElementById('rework-cost').value = data.cost || "";
        document.getElementById('rework-notes').value = data.notes || "";

        // Extract Meta Data from JSONB
        const meta = data.new_character?._rework_meta || {};
        const costRows = meta.cost_rows || data.cost_rows || []; 
        const rType = meta.rework_type || data.rework_type || "";

        document.getElementById('rework-type').value = rType;

        populateColumn('original', data.old_character);
        populateColumn('new', data.new_character);

        // Restore Cost Rows
        document.getElementById('cost-table-body').innerHTML = '';
        if (Array.isArray(costRows)) {
            costRows.forEach(row => {
                const num = row.numChanges !== undefined ? row.numChanges : (row.cost || 0);
                addCostRow(row.change || '', num, row.dtpCost || 0, row.goldCost || 0);
            });
        }
        window.updateTotalCost();

        // Refresh dropdown to ensure this loaded ID appears if it wasn't there before
        window.fetchReworks();
        
        console.log("Rework loaded successfully");
        
    } catch (e) {
        console.error(e);
        alert("Could not load rework. Please check the ID.");
    }
};

window.deleteRework = async () => {
    const id = document.getElementById('load-rework-select').value;
    if (!id) return alert("Please select a rework from the dropdown to delete.");

    if (!confirm("Are you sure you want to delete this rework?")) return;

    try {
        await deleteReworkById(id);
        
        if (document.getElementById('current-rework-id').value === id) {
             document.getElementById('current-rework-id').value = "";
        }
        
        alert("Rework deleted.");
        window.fetchReworks(); // Refresh dropdown to remove deleted item
    } catch (e) {
        alert("Delete failed: " + e.message);
    }
};

// ==========================================
// 4. START
// ==========================================

initApp();