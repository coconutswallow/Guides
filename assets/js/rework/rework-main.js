/**
 * ================================================================
 * REWORK MAIN MODULE
 * ================================================================
 * 
 * This is the main entry point and orchestration module for the
 * D&D character rework calculator application. It handles:
 * - Application initialization
 * - Tab navigation and validation
 * - Save/Load/Delete operations
 * - Cost calculation orchestration
 * - UI event handler bindings
 * - Copy/paste utilities
 * - Output generation
 * 
 * This module wires together all the other modules and exposes
 * functions to the global window object for HTML onclick handlers.
 * 
 * @module rework-main
 */

import { initCharacterData, fetchMyReworks, saveReworkToDb, loadReworkById, deleteReworkById } from "./state-manager.js";
import { 
    scrapeColumn, populateColumn, renderBaseAttributes, renderFeatureRows, 
    addClassRow, removeClassRow, addCostRow, generateOutputString, 
    updatePointBuyDisplay as refreshPoints, generateFeatCards 
} from "./rework-ui.js";
import { computeReworkCosts, getTotalLevel, getAlacarteRates } from "./rework-calculations.js";
import { ATTRIBUTES } from "./rework-constants.js";

// ================================================================
// TAB NAVIGATION & VALIDATION
// ================================================================

/**
 * Switches between the three main application tabs.
 * 
 * Tabs:
 * - Input: Character data entry
 * - Cost: Cost breakdown and summary
 * - Output: Discord-formatted output
 * 
 * When leaving the Input tab, validates that a rework type has been
 * selected and that it's compatible with the entered character levels.
 * This prevents users from generating invalid costs/output.
 * 
 * When entering Cost tab: Automatically recalculates costs
 * When entering Output tab: Automatically generates output string
 * 
 * @param {string} t - Tab identifier ('input', 'cost', or 'output')
 * @global
 * 
 * @example
 * <button onclick="switchTab('cost')">View Costs</button>
 */
window.switchTab = (t) => {
    const currentTab = document.querySelector('.tab-content.active')?.id;
    
    // --------------------------------------------------------
    // VALIDATION WHEN LEAVING INPUT TAB
    // --------------------------------------------------------
    if (currentTab === 'tab-input' && t !== 'input') {
        // Check that rework type is selected
        const reworkType = document.getElementById('rework-type')?.value;
        if (!reworkType) {
            alert("Please select a Rework Type before proceeding.");
            return;  // Don't switch tabs
        }
        
        // Validate that the rework type is compatible with character levels
        const validationError = window.validateReworkType();
        if (validationError) {
            alert(validationError);
            return;  // Don't switch tabs
        }
    }
    
    // --------------------------------------------------------
    // SWITCH ACTIVE TAB
    // --------------------------------------------------------
    // Remove active class from all tabs and buttons
    document.querySelectorAll('.tab-btn, .tab-content').forEach(el => 
        el.classList.remove('active')
    );
    
    // Add active class to selected tab button
    document.querySelector(`button[onclick*="'${t}'"]`)?.classList.add('active');
    
    // Show selected tab content
    document.getElementById(`tab-${t}`)?.classList.add('active');
    
    // --------------------------------------------------------
    // AUTO-ACTIONS WHEN ENTERING CERTAIN TABS
    // --------------------------------------------------------
    if (t === 'output') window.generateOutput();  // Generate output string
    if (t === 'cost') window.calculateCosts();    // Recalculate costs
};

// ================================================================
// ACCORDION TOGGLE
// ================================================================

/**
 * Toggles accordion sections (collapsible panels) in the UI.
 * 
 * Used for organizing the input form into collapsible sections
 * like "Basic Info", "Attributes", "Classes", etc.
 * 
 * @param {string} id - Base ID of the accordion section
 * @global
 * 
 * @example
 * <button onclick="toggleAccordion('basic-info')">Toggle Basic Info</button>
 * <div id="basic-info-content">...</div>
 * <span id="basic-info-icon">▼</span>
 */
window.toggleAccordion = (id) => {
    const content = document.getElementById(`${id}-content`);
    const icon = document.getElementById(`${id}-icon`);
    
    if (content && icon) {
        const isVisible = content.style.display !== 'none';
        content.style.display = isVisible ? 'none' : 'block';
        icon.textContent = isVisible ? '▶' : '▼';
    }
};

// ================================================================
// REWORK TYPE VALIDATION
// ================================================================

/**
 * Validates that the selected rework type is compatible with character levels.
 * 
 * Each rework type has specific level requirements:
 * - Level 5 or Below: Both characters must be level 1-5
 * - 2024 Update: Original must be 2014, New must be 2024
 * - T2 Checkpoint: Original 5-10 → New 1-4
 * - T3 Checkpoint: Original 11-16 → New 5-10
 * - T4 Checkpoint: Original 17-20 → New 11-16
 * - Story Rework: New level ≤ Original level
 * - A-la-carte: No level restrictions
 * 
 * @returns {string|null} Error message if invalid, null if valid
 * @global
 * 
 * @example
 * const error = validateReworkType();
 * if (error) {
 *     alert(error);  // "T2 Checkpoint Rework: Original character must be level 5-10..."
 * }
 */
window.validateReworkType = () => {
    const type = document.getElementById('rework-type')?.value;
    if (!type) return null;  // No validation if type not selected
    
    // Scrape character data to get levels
    const oldChar = scrapeColumn('original');
    const newChar = scrapeColumn('new');
    const origLevel = getTotalLevel(oldChar.classes || []);
    const newLevel = getTotalLevel(newChar.classes || []);
    
    /**
     * Helper: Check if all classes match a specific version
     * @param {Array} classes - Array of class objects
     * @param {string} v - Version string ('2014' or '2024')
     * @returns {boolean} True if all classes match version
     */
    const allMatchVer = (classes, v) => 
        classes && classes.length > 0 && classes.every(c => c.version === v);
    
    // --------------------------------------------------------
    // VALIDATE: Level 5 or Below
    // --------------------------------------------------------
    if (type === 'level-5-below') {
        if (origLevel > 5) {
            return "Level 5 or Below Rework: Original character must be level 5 or below.";
        }
        if (newLevel > 5) {
            return "Level 5 or Below Rework: New character must be level 5 or below.";
        }
    }
    
    // --------------------------------------------------------
    // VALIDATE: 2024 Update
    // --------------------------------------------------------
    if (type === '2024-update') {
        if (!allMatchVer(oldChar.classes, '2014')) {
            return "2024 Update Rework: All Original character classes must be 2014 version.";
        }
        if (!allMatchVer(newChar.classes, '2024')) {
            return "2024 Update Rework: All New character classes must be 2024 version.";
        }
    }
    
    // --------------------------------------------------------
    // VALIDATE: T2 Checkpoint
    // --------------------------------------------------------
    if (type === 't2-checkpoint') {
        if (origLevel < 5 || origLevel > 10) {
            return "T2 Checkpoint Rework: Original character must be level 5-10 (Tier 2).";
        }
        if (newLevel < 1 || newLevel > 4) {
            return "T2 Checkpoint Rework: New character must be level 1-4 (Tier 1).";
        }
    }
    
    // --------------------------------------------------------
    // VALIDATE: T3 Checkpoint
    // --------------------------------------------------------
    if (type === 't3-checkpoint') {
        if (origLevel < 11 || origLevel > 16) {
            return "T3 Checkpoint Rework: Original character must be level 11-16 (Tier 3).";
        }
        if (newLevel < 5 || newLevel > 10) {
            return "T3 Checkpoint Rework: New character must be level 5-10 (Tier 2).";
        }
    }
    
    // --------------------------------------------------------
    // VALIDATE: T4 Checkpoint
    // --------------------------------------------------------
    if (type === 't4-checkpoint') {
        if (origLevel < 17 || origLevel > 20) {
            return "T4 Checkpoint Rework: Original character must be level 17-20 (Tier 4).";
        }
        if (newLevel < 11 || newLevel > 16) {
            return "T4 Checkpoint Rework: New character must be level 11-16 (Tier 3).";
        }
    }
    
    // --------------------------------------------------------
    // VALIDATE: Story Rework
    // --------------------------------------------------------
    if (type === 'story') {
        if (newLevel > origLevel) {
            return "Story Rework: New character level cannot exceed original character level.";
        }
    }
    
    return null;  // No errors - validation passed
};

// ================================================================
// UUID CLIPBOARD UTILITY
// ================================================================

/**
 * Copies the current rework UUID to clipboard.
 * 
 * Useful for sharing the rework ID with admins or for external reference.
 * Only works if a rework has been saved.
 * 
 * @global
 * 
 * @example
 * <button onclick="copyUuid()">Copy UUID</button>
 */
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

// ================================================================
// COST CALCULATION & SUMMARY
// ================================================================

/**
 * Calculates and displays the rework costs.
 * 
 * This is the main orchestration function for the Cost tab.
 * It:
 * 1. Gets the selected rework type
 * 2. Scrapes character data from both columns
 * 3. Calls computeReworkCosts() to analyze changes
 * 4. Populates the cost table with results
 * 5. Updates the summary section
 * 
 * Handles both fixed-cost reworks (flat fee) and a-la-carte
 * (per-change pricing) by adjusting table headers and formatting.
 * 
 * @global
 * 
 * @example
 * calculateCosts();
 * // Populates the cost table with detected changes
 */
window.calculateCosts = () => {
    const typeEl = document.getElementById('rework-type');
    if (!typeEl || !typeEl.value) return;
    
    // Compute costs based on rework type and character data
    const result = computeReworkCosts(
        typeEl.value, 
        scrapeColumn('original'), 
        scrapeColumn('new')
    );
    
    const err = document.getElementById('cost-error');
    const tbody = document.getElementById('cost-table-body');
    const thead = document.querySelector('#cost-table thead tr');
    
    // --------------------------------------------------------
    // HANDLE VALIDATION ERRORS
    // --------------------------------------------------------
    if (!result.isValid) {
        err.style.display = 'block'; 
        err.innerText = result.error; 
        return;
    }
    
    err.style.display = 'none';
    tbody.innerHTML = '';  // Clear existing rows

    // --------------------------------------------------------
    // CONFIGURE TABLE FOR FIXED OR VARIABLE COSTS
    // --------------------------------------------------------
    if (result.isFixed) {
        // Fixed-cost rework (Checkpoint, Story, Free)
        thead.innerHTML = `
            <th style="text-align: left;">Rework Type</th>
            <th>DTP</th>
            <th>Gold</th>
            <th style="width: 5%;"></th>
        `;
    } else {
        // Variable-cost rework (A-la-carte)
        thead.innerHTML = `
            <th style="text-align: left;">Detailed Change Description</th>
            <th style="width: 120px;"># Changes</th>
            <th style="width: 5%;"></th>
        `;
    }

    // --------------------------------------------------------
    // POPULATE COST ROWS
    // --------------------------------------------------------
    result.costs.forEach(c => {
        const row = document.createElement('tr');
        
        if (result.isFixed) {
            // Fixed-cost row (non-editable)
            row.innerHTML = `
                <td style="text-align: left;">${c.change}</td>
                <td>${c.dtp}</td>
                <td>${c.gold} GP</td>
                <td></td>
            `;
        } else {
            // Variable-cost row (editable for manual adjustments)
            row.innerHTML = `
                <td style="text-align: left;">
                    <input type="text" class="text-input cost-change" 
                           value="${c.change}" 
                           style="width: 100%; font-size: 0.85em;">
                </td>
                <td>
                    <input type="number" class="text-input cost-num-changes" 
                           value="${c.count}" 
                           onchange="window.updateTotalCost()">
                </td>
                <td>
                    <button type="button" class="button" 
                            onclick="window.deleteCostRow(this)" 
                            style="background-color: #c0392b; color: #fff; padding: 4px 8px;">×</button>
                </td>
            `;
        }
        tbody.appendChild(row);
    });

    // --------------------------------------------------------
    // UPDATE SUMMARY SECTION
    // --------------------------------------------------------
    if (result.isFixed) {
        updateFixedSummary(result.costs[0].dtp, result.costs[0].gold);
    } else {
        updateAlacarteSummary(result.rates);
    }
};

/**
 * Updates the summary section for fixed-cost reworks.
 * 
 * @param {number} dtp - Downtime points
 * @param {number} gold - Gold pieces
 * @private
 * 
 * @example
 * updateFixedSummary(150, 820);
 * // Displays: Total DTP: 150, Total Gold: 820
 */
window.updateFixedSummary = (dtp, gold) => {
    document.getElementById('total-changes').innerText = "-";
    document.getElementById('total-dtp').innerText = dtp;
    document.getElementById('total-gold').innerText = gold;
    document.getElementById('rework-cost').value = `${gold} GP / ${dtp} DTP`;
};

/**
 * Updates the summary section for a-la-carte reworks.
 * 
 * Calculates total cost by multiplying number of changes by per-change rates.
 * 
 * @param {Object} rates - Per-change rates
 * @param {number} rates.gold - Gold per change
 * @param {number} rates.dtp - DTP per change
 * @private
 * 
 * @example
 * updateAlacarteSummary({ gold: 630, dtp: 40 });
 * // For 3 changes: Displays 1890 GP / 120 DTP
 */
window.updateAlacarteSummary = (rates) => {
    let totalChanges = 0;
    
    // Sum all change counts from the table
    document.querySelectorAll('.cost-num-changes').forEach(input => {
        totalChanges += parseInt(input.value) || 0;
    });
    
    const tGold = totalChanges * (rates?.gold || 0);
    const tDtp = totalChanges * (rates?.dtp || 0);

    document.getElementById('total-changes').innerText = totalChanges;
    document.getElementById('total-dtp').innerText = 
        `${tDtp} (${totalChanges} chg × ${rates?.dtp || 0})`;
    document.getElementById('total-gold').innerText = 
        `${tGold} GP (${totalChanges} chg × ${rates?.gold || 0})`;
    document.getElementById('rework-cost').value = `${tGold} GP / ${tDtp} DTP`;
};

/**
 * Updates the total cost display.
 * 
 * Called when user changes the number of changes in a-la-carte rework.
 * For fixed-cost reworks, just recalculates everything.
 * 
 * @global
 * 
 * @example
 * <input type="number" onchange="updateTotalCost()">
 */
window.updateTotalCost = () => {
    const type = document.getElementById('rework-type').value;
    
    if (type === 'alacarte') {
        // Recalculate a-la-carte totals
        const rates = getAlacarteRates(getTotalLevel(scrapeColumn('original').classes));
        window.updateAlacarteSummary(rates);
    } else {
        // Recalculate everything for fixed-cost types
        window.calculateCosts();
    }
};

// ================================================================
// MANUAL COST ROW MANAGEMENT
// ================================================================

/**
 * Adds a manual cost row to the a-la-carte table.
 * 
 * Allows users to add custom changes not detected automatically.
 * 
 * @global
 * 
 * @example
 * <button onclick="addCostRow()">Add Manual Change</button>
 */
window.addCostRow = () => addCostRow("", 0);

/**
 * Deletes a cost row from the table.
 * 
 * @param {HTMLButtonElement} btn - The delete button that was clicked
 * @global
 * 
 * @example
 * <button onclick="deleteCostRow(this)">×</button>
 */
window.deleteCostRow = (btn) => { 
    btn.closest('tr')?.remove(); 
    window.updateTotalCost(); 
};

// ================================================================
// CLASS MANAGEMENT BINDINGS
// ================================================================

/**
 * Adds a class row to the specified column.
 * 
 * @param {string} col - Column identifier ('original' or 'new')
 * @global
 * 
 * @example
 * <button onclick="addClassRow('original')">Add Class</button>
 */
window.addClassRow = (col) => addClassRow(col);

/**
 * Removes a class row and recalculates costs.
 * 
 * @param {HTMLButtonElement} btn - The remove button that was clicked
 * @global
 * 
 * @example
 * <button onclick="removeClassRow(this)">Remove</button>
 */
window.removeClassRow = (btn) => { 
    removeClassRow(btn); 
    window.calculateCosts(); 
};

/**
 * Updates the point-buy display for a column.
 * 
 * @param {string} colId - Column identifier
 * @global
 * 
 * @example
 * <select onchange="calculatePointBuy('original')">...</select>
 */
window.calculatePointBuy = (colId) => refreshPoints(colId);

// ================================================================
// SAVE / LOAD / DELETE OPERATIONS
// ================================================================

/**
 * Fetches all reworks saved by this user.
 * 
 * Populates the "Load Rework" dropdown with saved reworks.
 * Uses localStorage to track which reworks belong to this user.
 * 
 * @async
 * @global
 * 
 * @example
 * await fetchReworks();
 * // Dropdown now shows all saved reworks
 */
window.fetchReworks = async () => {
    try {
        const data = await fetchMyReworks();
        const sel = document.getElementById('load-rework-select');
        if (!sel) return;
        
        // Clear and rebuild dropdown
        sel.innerHTML = '<option value="">-- Load My Saved Rework --</option>';
        
        data.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.id;
            opt.innerText = `${r.character_name || "Unnamed"} (${new Date(r.updated_at).toLocaleDateString()})`;
            sel.appendChild(opt);
        });
    } catch (e) { 
        console.error(e); 
    }
};

/**
 * Loads a rework by ID and populates the UI.
 * 
 * This is the core load function that:
 * 1. Fetches the rework from the database
 * 2. Populates all form fields
 * 3. Generates feat cards
 * 4. Recalculates costs
 * 
 * @async
 * @param {string} id - UUID of the rework to load
 * @global
 * 
 * @example
 * await performLoad('550e8400-e29b-41d4-a716-446655440000');
 */
window.performLoad = async (id) => {
    if (!id) return;
    
    try {
        const d = await loadReworkById(id);
        
        // Populate metadata
        document.getElementById('current-rework-id').value = d.id;
        document.getElementById('manual-discord-id').value = d.discord_id || "";
        document.getElementById('rework-type').value = d.rework_type || "";
        document.getElementById('rework-cost').value = d.cost || "";
        document.getElementById('rework-notes').value = d.notes || "";
        
        // Populate character data
        populateColumn('original', d.old_character);
        populateColumn('new', d.new_character);
        
        // Generate feat cards
        generateFeatCards('original', d.old_character.feats);
        generateFeatCards('new', d.new_character.feats);
        
        // Recalculate costs
        window.calculateCosts();
        
    } catch(e) { 
        alert("Load failed: " + e.message); 
    }
};

/**
 * Saves the current rework to the database.
 * 
 * Smart save logic:
 * - If editing an existing rework with same name: UPDATE
 * - If creating new or name changed: INSERT (creates new record)
 * 
 * Also auto-formats Discord ID with @ prefix if missing.
 * 
 * @async
 * @global
 * 
 * @example
 * await saveRework();
 * // Rework saved, UUID displayed
 */
window.saveRework = async () => {
    try {
        // Get and format Discord ID
        let discordId = document.getElementById('manual-discord-id')?.value || "Unknown";
        if (discordId !== "Unknown" && !discordId.startsWith('@')) {
            discordId = '@' + discordId;
            document.getElementById('manual-discord-id').value = discordId;
        }

        // Scrape character data
        const oldC = scrapeColumn('original');
        const newC = scrapeColumn('new');
        
        // Build payload
        const payload = {
            discord_id: discordId,
            character_name: oldC.name,
            old_character: oldC,
            new_character: newC,
            rework_type: document.getElementById('rework-type')?.value || "",
            cost: document.getElementById('rework-cost')?.value || "",
            notes: document.getElementById('rework-notes')?.value || ""
        };

        // Save to database
        const res = await saveReworkToDb(payload);
        
        // Update UI with new/updated ID
        document.getElementById('current-rework-id').value = res.id;
        
        alert(`Rework saved successfully! ID: ${res.id}`);
        
        // Refresh the load dropdown
        await window.fetchReworks();
        
    } catch(e) { 
        alert(e.message); 
    }
};

/**
 * Loads a rework by manually entering its UUID.
 * 
 * Useful for loading reworks shared by other users.
 * 
 * @async
 * @global
 * 
 * @example
 * await loadExternalId();
 * // Prompts for UUID, then loads
 */
window.loadExternalId = async () => {
    const id = prompt("Enter UUID:");
    if (id) await window.performLoad(id);
};

/**
 * Loads the rework selected in the dropdown.
 * 
 * @async
 * @global
 * 
 * @example
 * <select id="load-rework-select">...</select>
 * <button onclick="loadSelectedRework()">Load</button>
 */
window.loadSelectedRework = async () => {
    const sel = document.getElementById('load-rework-select');
    if (sel && sel.value) await window.performLoad(sel.value);
};

/**
 * Deletes the selected rework from the database.
 * 
 * Prompts for confirmation before deleting.
 * Also removes from localStorage tracking.
 * 
 * @async
 * @global
 * 
 * @example
 * <button onclick="deleteRework()">Delete Selected</button>
 */
window.deleteRework = async () => {
    const sel = document.getElementById('load-rework-select');
    if (!sel || !sel.value) return;
    
    if(!confirm("Are you sure you want to delete this rework?")) return;
    
    try {
        await deleteReworkById(sel.value);
        document.getElementById('current-rework-id').value = "";
        await window.fetchReworks();
    } catch (e) { 
        console.error(e); 
    }
};

// ================================================================
// COPY UTILITIES
// ================================================================

/**
 * Copies a value from one input to another.
 * 
 * Generic utility for copying any single field.
 * 
 * @param {string} s - Source element ID
 * @param {string} t - Target element ID
 * @global
 * 
 * @example
 * <button onclick="copyValue('name-original', 'name-new')">Copy Name</button>
 */
window.copyValue = (s, t) => { 
    const el = document.getElementById(s); 
    const target = document.getElementById(t);
    if(el && target) target.value = el.value; 
};

/**
 * Copies all attribute values from Original to New column.
 * 
 * Copies all six ability scores and recalculates point-buy.
 * 
 * @global
 * 
 * @example
 * <button onclick="copyAttributes()">Copy Attributes →</button>
 */
window.copyAttributes = () => { 
    ATTRIBUTES.forEach(a => { 
        const source = document.getElementById(`attr-original-${a}`);
        const target = document.getElementById(`attr-new-${a}`);
        if (source && target) target.value = source.value;
    }); 
    window.calculatePointBuy('new'); 
};

/**
 * Copies racial or origin modifiers from Original to New.
 * 
 * @param {string} type - Modifier type ('race' or 'origin')
 * @global
 * 
 * @example
 * <button onclick="copyMods('race')">Copy Race Mods →</button>
 */
window.copyMods = (type) => { 
    ATTRIBUTES.forEach(a => { 
        const s = document.querySelector(`.mod-select-${type}[data-col="original"][data-attr="${a}"]`);
        const t = document.querySelector(`.mod-select-${type}[data-col="new"][data-attr="${a}"]`); 
        if(s && t) t.value = s.value; 
    }); 
};

/**
 * Copies feature rows from Original to New.
 * 
 * @param {string} type - Feature type ('race', 'origin', or 'origin-feat')
 * @global
 * 
 * @example
 * <button onclick="copyFeatures('race')">Copy Race Features →</button>
 */
window.copyFeatures = (type) => {
    // Determine container IDs based on type
    const sId = type === 'origin-feat' 
        ? `origin-feat-features-container-original` 
        : `${type}-features-container-original`;
    const tId = type === 'origin-feat' 
        ? `origin-feat-features-container-new` 
        : `${type}-features-container-new`;
    
    const sRows = document.querySelectorAll(`#${sId} .feature-row`);
    const tRows = document.querySelectorAll(`#${tId} .feature-row`);
    
    sRows.forEach((row, i) => {
        if (tRows[i]) {
            tRows[i].querySelector('.feature-type').value = 
                row.querySelector('.feature-type').value;
            tRows[i].querySelector('.feature-name').value = 
                row.querySelector('.feature-name').value;
        }
    });
};

// ================================================================
// OUTPUT GENERATION
// ================================================================

/**
 * Generates the Discord-formatted output string.
 * 
 * Called automatically when switching to the Output tab.
 * Creates a comprehensive summary ready to paste into Discord.
 * 
 * @global
 * 
 * @example
 * generateOutput();
 * // Populates output textarea with formatted string
 */
window.generateOutput = () => {
    const type = document.getElementById('rework-type').value;
    const oldC = scrapeColumn('original');
    const newC = scrapeColumn('new');
    const costText = document.getElementById('rework-cost').value;
    const notes = document.getElementById('rework-notes').value;
    
    // Re-calculate to get detailed costs for the Change Log
    const calcResult = computeReworkCosts(type, oldC, newC);
    
    // Generate and display output
    document.getElementById('output-text').value = 
        generateOutputString(oldC, newC, costText, notes, calcResult);
};

// ================================================================
// APPLICATION INITIALIZATION
// ================================================================

/**
 * Initializes the application on page load.
 * 
 * Initialization sequence:
 * 1. Render attribute tables for both columns
 * 2. Render feature row containers
 * 3. Load character data from Supabase
 * 4. Check for URL parameter ID and load if present
 * 5. Add initial class rows if not loading from URL
 * 6. Fetch user's saved reworks for dropdown
 * 
 * @async
 * 
 * @example
 * // Called automatically on DOMContentLoaded
 * // No manual invocation needed
 */
async function initApp() {
    try {
        // --------------------------------------------------------
        // RENDER UI COMPONENTS
        // --------------------------------------------------------
        ['original', 'new'].forEach(col => {
            renderBaseAttributes(col);
            renderFeatureRows(`race-features-container-${col}`, 4);
            renderFeatureRows(`origin-features-container-${col}`, 4);
            renderFeatureRows(`origin-feat-features-container-${col}`, 4);
        });
        
        // --------------------------------------------------------
        // LOAD CHARACTER DATA
        // --------------------------------------------------------
        await initCharacterData();
        
        // --------------------------------------------------------
        // CHECK FOR URL PARAMETER LOAD
        // --------------------------------------------------------
        const urlId = new URLSearchParams(window.location.search).get('id');
        
        if (urlId) {
            // Load from URL parameter
            await window.performLoad(urlId);
        } else {
            // Start fresh - add one empty class row to each column
            ['original', 'new'].forEach(col => addClassRow(col));
        }
        
        // --------------------------------------------------------
        // POPULATE SAVED REWORKS DROPDOWN
        // --------------------------------------------------------
        await window.fetchReworks();
        
    } catch (error) { 
        console.error('Application initialization error:', error); 
    }
}

// ================================================================
// START APPLICATION
// ================================================================

/**
 * Start the application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', initApp);