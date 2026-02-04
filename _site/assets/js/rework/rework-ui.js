/**
 * ================================================================
 * REWORK UI MODULE
 * ================================================================
 * 
 * This module handles all user interface operations including:
 * - Data extraction from DOM (scraping)
 * - Data injection into DOM (populating)
 * - Dynamic UI rendering (attributes, classes, feats, features)
 * - Output string generation for Discord
 * 
 * @module rework-ui
 */

import { ATTRIBUTES, POINT_COSTS } from './rework-constants.js';
import { getState } from './state-manager.js';
import { calculatePointBuyCost, getTotalLevel } from './rework-calculations.js';

// ================================================================
// DATA EXTRACTION (SCRAPING)
// ================================================================

/**
 * Scrapes all character data from a column in the UI.
 * 
 * This function extracts data from all form inputs in either the
 * "Original" or "New" character column and returns a structured
 * character object. This is the inverse of populateColumn().
 * 
 * Extracts:
 * - Basic info (name, race, background)
 * - Attributes (STR, DEX, CON, INT, WIS, CHA)
 * - Racial and origin modifiers
 * - Class/subclass/level combinations
 * - Feat cards with mods and features
 * - Race, origin, and origin feat features
 * 
 * @param {string} colId - Column identifier ('original' or 'new')
 * @returns {Object} Complete character data object
 * 
 * @example
 * const originalChar = scrapeColumn('original');
 * console.log(originalChar.name);        // "Gandalf"
 * console.log(originalChar.attributes);  // { STR: 10, DEX: 12, ... }
 * console.log(originalChar.classes);     // [{ class: 'Wizard', level: 20, ... }]
 */
export function scrapeColumn(colId) {
    /**
     * Helper: Safely get value from an input element
     * @param {string} id - Element ID
     * @returns {string} Element value or empty string
     */
    const getV = (id) => document.getElementById(id)?.value || "";
    
    // --------------------------------------------------------
    // Extract base attributes (STR, DEX, CON, INT, WIS, CHA)
    // --------------------------------------------------------
    const attrs = {}; 
    ATTRIBUTES.forEach(attrName => {
        attrs[attrName] = getV(`attr-${colId}-${attrName}`);
    });

    // --------------------------------------------------------
    // Extract racial modifiers
    // --------------------------------------------------------
    const rMods = {};
    document.querySelectorAll(`.mod-select-race[data-col="${colId}"]`).forEach(select => {
        rMods[select.dataset.attr] = select.value;
    });
    
    // --------------------------------------------------------
    // Extract origin/background modifiers
    // --------------------------------------------------------
    const oMods = {};
    document.querySelectorAll(`.mod-select-origin[data-col="${colId}"]`).forEach(select => {
        oMods[select.dataset.attr] = select.value;
    });

    // --------------------------------------------------------
    // Extract all class blocks (supports multiclassing)
    // --------------------------------------------------------
    const classes = [];
    document.querySelectorAll(`#classes-container-${colId} .class-block`).forEach(block => {
        classes.push({
            version: block.querySelector('.version-select').value,
            class: block.querySelector('.class-select').value,
            subclass: block.querySelector('.subclass-select').value,
            level: block.querySelector('.level-input').value
        });
    });

    // --------------------------------------------------------
    // Extract all feat cards (ASI/Feat choices)
    // --------------------------------------------------------
    const feats = [];
    document.querySelectorAll(`#feats-container-${colId} .feat-card`).forEach(card => {
        // Extract attribute modifiers from this feat
        const mods = {};
        card.querySelectorAll('select[data-attr]').forEach(select => {
            mods[select.dataset.attr] = select.value;
        });
        
        // Extract feat features (languages, skills, tool proficiencies)
        const features = [];
        card.querySelectorAll('.feat-feature-type').forEach((typeSelect, i) => {
            features.push({
                type: typeSelect.value,
                name: card.querySelectorAll('.feat-feature-name')[i]?.value || ""
            });
        });

        // Parse the card title to extract source and level info
        const titleText = card.querySelector('.card-title')?.innerText || "";
        const source = titleText.split(' - ')[0] || "Unknown";
        const lvl = titleText.match(/Lvl (\d+)/)?.[1] || "";

        feats.push({
            name: card.querySelector('.feat-name')?.value || "",
            mods: mods,
            features: features,
            source: source,
            lvl: lvl
        });
    });

    /**
     * Helper: Scrapes feature rows from a container
     * @param {string} cid - Container element ID
     * @returns {Array<{type: string, name: string}>} Array of features
     */
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

    // --------------------------------------------------------
    // Return complete character object
    // --------------------------------------------------------
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

// ================================================================
// DATA INJECTION (POPULATING)
// ================================================================

/**
 * Populates a column with character data from an object.
 * 
 * This function takes a character data object (typically loaded from
 * the database) and populates all the form inputs in the specified
 * column. This is the inverse of scrapeColumn().
 * 
 * Handles:
 * - Setting basic text inputs (name, race, background)
 * - Populating attribute dropdowns
 * - Setting modifier selects
 * - Rendering class blocks
 * - Rendering feat cards
 * - Filling feature rows
 * 
 * @param {string} colId - Column identifier ('original' or 'new')
 * @param {Object} data - Character data object to populate
 * 
 * @example
 * const savedCharacter = await loadReworkById('uuid-123');
 * populateColumn('original', savedCharacter.old_character);
 * populateColumn('new', savedCharacter.new_character);
 */
export function populateColumn(colId, data) {
    if (!data) return;
    
    /**
     * Helper: Safely set value on an input element
     * @param {string} id - Element ID
     * @param {string} val - Value to set
     */
    const setV = (id, val) => { 
        const el = document.getElementById(id); 
        if (el) el.value = val || ""; 
    };

    // --------------------------------------------------------
    // Populate basic text inputs
    // --------------------------------------------------------
    setV(`name-${colId}`, data.name);
    setV(`race-${colId}`, data.race);
    setV(`bg-${colId}`, data.bg);
    setV(`orig-feat-${colId}`, data.origin_feat);

    // --------------------------------------------------------
    // Populate attribute dropdowns
    // --------------------------------------------------------
    ATTRIBUTES.forEach(attr => {
        setV(`attr-${colId}-${attr}`, data.attributes?.[attr] || "10");
    });
    updatePointBuyDisplay(colId);  // Recalculate point-buy total

    // --------------------------------------------------------
    // Populate modifier selects (race and origin)
    // --------------------------------------------------------
    document.querySelectorAll(`.mod-select-race[data-col="${colId}"]`).forEach(select => {
        select.value = data.race_mods?.[select.dataset.attr] || "0";
    });
    
    document.querySelectorAll(`.mod-select-origin[data-col="${colId}"]`).forEach(select => {
        select.value = data.origin_mods?.[select.dataset.attr] || "0";
    });

    /**
     * Helper: Fills feature rows with data
     * @param {string} cid - Container element ID
     * @param {Array} feats - Array of feature objects
     */
    const fillFeatures = (cid, feats) => {
        renderFeatureRows(cid, 4);  // Ensure 4 rows exist
        const rows = document.querySelectorAll(`#${cid} .feature-row`);
        
        if (feats) {
            feats.forEach((f, i) => {
                if (rows[i]) {
                    const typeSelect = rows[i].querySelector('.feature-type');
                    const nameInput = rows[i].querySelector('.feature-name');
                    if (typeSelect) typeSelect.value = f.type || "none";
                    if (nameInput) nameInput.value = f.name || "";
                }
            });
        }
    };

    // --------------------------------------------------------
    // Populate all feature sections
    // --------------------------------------------------------
    fillFeatures(`race-features-container-${colId}`, data.race_features);
    fillFeatures(`origin-features-container-${colId}`, data.origin_features);
    fillFeatures(`origin-feat-features-container-${colId}`, data.origin_feat_features);

    // --------------------------------------------------------
    // Populate class blocks
    // --------------------------------------------------------
    const container = document.getElementById(`classes-container-${colId}`);
    container.innerHTML = "";  // Clear existing classes
    
    if (data.classes && data.classes.length > 0) {
        data.classes.forEach(c => addClassRow(colId, c));
    } else {
        addClassRow(colId);  // Add one empty class if none exist
    }
}

// ================================================================
// ATTRIBUTE RENDERING
// ================================================================

/**
 * Renders the base attribute selection table for a column.
 * 
 * Creates a table with dropdowns for all six ability scores.
 * Each dropdown shows the score value and its point cost.
 * Also initializes the point-buy display.
 * 
 * @param {string} colId - Column identifier ('original' or 'new')
 * 
 * @example
 * renderBaseAttributes('original');
 * // Creates a table with STR, DEX, CON, INT, WIS, CHA dropdowns
 */
export function renderBaseAttributes(colId) {
    const container = document.getElementById(`attrs-container-${colId}`);
    if(!container) return;
    
    /**
     * Generates option HTML for an attribute dropdown
     * @param {number} selectedValue - Currently selected value
     * @returns {string} HTML options string
     */
    const generateOptions = (selectedValue) => {
        let optionsHtml = '';
        for (let i = 8; i <= 15; i++) {
            const cost = POINT_COSTS[i];
            const isSelected = i === parseInt(selectedValue) ? 'selected' : '';
            optionsHtml += `<option value="${i}" ${isSelected}>${i} (${cost})</option>`;
        }
        return optionsHtml;
    };

    // Build the attribute table
    container.innerHTML = `
    <table class="stat-table">
        <thead><tr>${ATTRIBUTES.map(a => `<th>${a}</th>`).join('')}</tr></thead>
        <tbody>
            <tr>${ATTRIBUTES.map(a => `<td><select id="attr-${colId}-${a}" class="text-input" style="width: 100%;" onchange="window.calculatePointBuy('${colId}')">${generateOptions(10)}</select></td>`).join('')}</tr>
        </tbody>
    </table>`;
    
    // Initialize point-buy display
    updatePointBuyDisplay(colId);
}

/**
 * Updates the point-buy display for a column.
 * 
 * Calculates total points spent and remaining, then updates the
 * display with appropriate color coding:
 * - Red: Over budget (negative remaining)
 * - Green: Perfect (0 remaining)
 * - Orange: Under budget (points remaining)
 * 
 * @param {string} colId - Column identifier ('original' or 'new')
 * 
 * @example
 * updatePointBuyDisplay('original');
 * // Updates display to show "0 / 27 Pts" in green
 */
export function updatePointBuyDisplay(colId) {
    // Collect current attribute values
    const attrs = {};
    ATTRIBUTES.forEach(a => {
        const el = document.getElementById(`attr-${colId}-${a}`);
        if(el) attrs[a] = el.value;
    });
    
    // Calculate points spent
    const spent = calculatePointBuyCost(attrs);
    const remaining = 27 - spent;
    
    // Update display
    const display = document.getElementById(`points-${colId}`);
    if(display) {
        display.innerText = `${remaining} / 27 Pts`;
        
        // Color code based on remaining points
        if (remaining < 0) {
            display.style.color = '#e74c3c';  // Red - over budget
        } else if (remaining === 0) {
            display.style.color = '#2ecc71';  // Green - perfect
        } else {
            display.style.color = '#f39c12';  // Orange - under budget
        }
    }
}

// ================================================================
// FEATURE ROW RENDERING
// ================================================================

/**
 * Renders a specified number of feature rows in a container.
 * 
 * Feature rows are used for racial features, origin features, and
 * origin feat features. Each row has a type dropdown and name input.
 * 
 * Supported feature types:
 * - None
 * - Language
 * - Skill
 * - Tool Proficiency
 * 
 * @param {string} containerId - ID of the container element
 * @param {number} [count=4] - Number of rows to render
 * 
 * @example
 * renderFeatureRows('race-features-container-original', 4);
 * // Creates 4 feature rows in the container
 */
export function renderFeatureRows(containerId, count = 4) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Generate the feature rows HTML
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

// ================================================================
// CLASS MANAGEMENT
// ================================================================

/**
 * Removes a class block from the UI and regenerates feat cards.
 * 
 * When a class is removed:
 * 1. Saves the current state of all feat cards
 * 2. Removes the class block from the DOM
 * 3. Regenerates feat cards based on remaining classes
 * 4. Restores as much feat data as possible
 * 
 * @param {HTMLButtonElement} btn - The delete button that was clicked
 * 
 * @example
 * <button onclick="removeClassRow(this)">Remove</button>
 */
export function removeClassRow(btn) {
    const block = btn.closest('.class-block');
    const container = block.parentElement;
    const colId = container.id.replace('classes-container-', '');
    
    // Save current feat state before removing
    const savedFeats = saveFeatState(colId);
    
    // Remove the class block
    block.remove();
    
    // Regenerate feat cards based on remaining classes
    generateFeatCards(colId, savedFeats);
}

/**
 * Saves the current state of all feat cards in a column.
 * 
 * This is used when classes change to preserve as much feat data
 * as possible. Saves feat names, modifiers, and features.
 * 
 * @param {string} colId - Column identifier
 * @returns {Array<Object>} Array of feat state objects
 * @private
 * 
 * @example
 * const saved = saveFeatState('original');
 * // Returns: [{ name: 'War Caster', mods: {...}, features: [...] }, ...]
 */
function saveFeatState(colId) {
    const feats = [];
    document.querySelectorAll(`#feats-container-${colId} .feat-card`).forEach(card => {
        // Extract modifiers
        const mods = {};
        card.querySelectorAll('select[data-attr]').forEach(select => {
            mods[select.dataset.attr] = select.value;
        });
        
        // Extract features
        const features = [];
        card.querySelectorAll('.feat-feature-type').forEach((typeSelect, i) => {
            const nameInput = card.querySelectorAll('.feat-feature-name')[i];
            features.push({
                type: typeSelect.value,
                name: nameInput?.value || ""
            });
        });
        
        feats.push({
            name: card.querySelector('.feat-name')?.value || "",
            mods: mods,
            features: features
        });
    });
    return feats;
}

/**
 * Adds a new class row to the UI.
 * 
 * Creates a class block with:
 * - Version selector (2014/2024)
 * - Class dropdown
 * - Subclass dropdown (cascades from class)
 * - Level input
 * - Remove button
 * 
 * When any field changes, feat cards are regenerated to match
 * the new class progression.
 * 
 * @param {string} colId - Column identifier
 * @param {Object} [init] - Initial data to populate (optional)
 * @param {string} [init.version] - Class version ('2014' or '2024')
 * @param {string} [init.class] - Class name
 * @param {string} [init.subclass] - Subclass name
 * @param {number} [init.level] - Class level
 * 
 * @example
 * addClassRow('original');
 * // Adds empty class row
 * 
 * addClassRow('new', { version: '2024', class: 'Wizard', subclass: 'Evoker', level: 10 });
 * // Adds pre-populated class row
 */
export function addClassRow(colId, init = null) {
    const container = document.getElementById(`classes-container-${colId}`);
    if (!container) return;

    const characterData = getState().characterData || [];
    const block = document.createElement('div');
    block.className = 'class-block';
    block.innerHTML = `
        <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 12px;">
            <select class="text-input version-select" style="flex: 1;">
                <option value="">Version</option>
                <option value="2014">2014</option>
                <option value="2024">2024</option>
            </select>
            <select class="text-input class-select" style="flex: 2;">
                <option value="">Class</option>
            </select>
            <select class="text-input subclass-select" style="flex: 2;" disabled>
                <option value="">Subclass</option>
            </select>
            <input type="number" class="text-input level-input" placeholder="Level" min="1" max="20" style="flex: 1;">
            <button type="button" class="button" onclick="window.removeClassRow(this)" style="background-color: #c0392b; color: #fff;">Remove</button>
        </div>`;
    container.appendChild(block);

    // Get references to the selects
    const vS = block.querySelector('.version-select');  // Version select
    const cS = block.querySelector('.class-select');    // Class select
    const sS = block.querySelector('.subclass-select'); // Subclass select
    const lI = block.querySelector('.level-input');     // Level input

    /**
     * Updates the class dropdown based on selected version
     * Preserves current selection if possible
     */
    const updC = () => {
        const currentVal = cS.value;
        cS.innerHTML = '<option value="">Class</option>';
        cS.disabled = !vS.value;
        sS.innerHTML = '<option value="">Subclass</option>';
        sS.disabled = true;
        
        if (!vS.value) return;
        
        // Get unique classes for this version
        const classes = [...new Set(
            characterData.filter(i => i.version == vS.value).map(i => i.class)
        )];
        classes.forEach(c => cS.innerHTML += `<option value="${c}">${c}</option>`);
        
        // Restore previous value if it still exists
        if (currentVal) cS.value = currentVal;
    };

    /**
     * Updates the subclass dropdown based on selected class
     * Preserves current selection if possible
     */
    const updS = () => {
        const currentVal = sS.value;
        sS.innerHTML = '<option value="">Subclass</option>'; 
        sS.disabled = !cS.value;
        
        if(!cS.value) return;
        
        // Get subclasses for this version/class combination
        const subs = characterData.filter(i => 
            i.version == vS.value && i.class == cS.value
        );
        subs.forEach(s => 
            sS.innerHTML += `<option value="${s.subclass}">${s.subclass || 'None'}</option>`
        );
        
        // Restore previous value if it still exists
        if (currentVal) sS.value = currentVal;
    };

    /**
     * Regenerates feat cards when class details change
     * Preserves existing feat data when possible
     */
    const regen = () => {
        const saved = saveFeatState(colId);
        generateFeatCards(colId, saved);
        if (window.calculateCosts) window.calculateCosts();
    };

    // Attach event handlers
    vS.onchange = () => { updC(); regen(); };  // Version change → update classes
    cS.onchange = () => { updS(); regen(); };  // Class change → update subclasses
    sS.onchange = () => regen();               // Subclass change → regen feats
    lI.oninput = () => regen();                // Level change → regen feats
    
    // Populate with initial data if provided
    if (init) { 
        vS.value = init.version; 
        updC(); 
        cS.value = init.class; 
        updS(); 
        sS.value = init.subclass; 
        lI.value = init.level; 
    }
}

// ================================================================
// FEAT CARD GENERATION
// ================================================================

/**
 * Generates feat/ASI cards based on current class configuration.
 * 
 * This is the core function that creates the feat selection UI.
 * For each class, it:
 * 1. Looks up the ASI levels from the character data
 * 2. Creates a card for each ASI milestone reached
 * 3. Populates cards with attribute modifiers and feature slots
 * 4. Restores saved data if provided
 * 
 * ASI levels vary by class (e.g., Fighter gets extras at 6 and 14).
 * Default ASI levels are [4, 8, 12, 16, 19] if not found in data.
 * 
 * @param {string} colId - Column identifier
 * @param {Array<Object>} [saved=null] - Previously saved feat data to restore
 * 
 * @example
 * // Generate fresh cards based on classes
 * generateFeatCards('original');
 * 
 * // Generate cards and restore previous selections
 * const saved = saveFeatState('original');
 * generateFeatCards('original', saved);
 */
export function generateFeatCards(colId, saved = null) {
    const container = document.getElementById(`feats-container-${colId}`);
    if (!container) return;
    
    container.innerHTML = '';  // Clear existing cards
    let idx = 0;
    const characterData = getState().characterData || [];

    // Process each class block
    document.querySelectorAll(`#classes-container-${colId} .class-block`).forEach(block => {
        const ver = block.querySelector('.version-select').value;
        const cls = block.querySelector('.class-select').value;
        const sub = block.querySelector('.subclass-select').value;
        const lvl = parseInt(block.querySelector('.level-input').value) || 0;

        // Skip if no class selected
        if (!cls || !ver) return;

        // Look up ASI levels for this class/subclass combination
        let dataRow = characterData.find(row => 
            row.version == ver && row.class === cls && row.subclass === sub
        );
        
        // Fall back to base class if subclass not found
        if (!dataRow) {
            dataRow = characterData.find(row => 
                row.version == ver && row.class === cls
            );
        }

        // Use custom ASI levels or default
        const asiLevels = dataRow?.ASI || [4, 8, 12, 16, 19];

        // Create a card for each ASI milestone reached
        asiLevels.forEach(milestone => {
            if (milestone > lvl) return;  // Skip if level not reached

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

            // Restore saved data if available
            if (saved && saved[idx]) {
                const s = saved[idx];
                
                // Restore feat name
                const nameInp = card.querySelector('.feat-name');
                if (nameInp) nameInp.value = s.name || "";
                
                // Restore attribute modifiers
                ATTRIBUTES.forEach(a => {
                    const sel = card.querySelector(`select[data-attr="${a}"]`);
                    if (sel) sel.value = s.mods?.[a] || "0";
                });
                
                // Restore feat features
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

// ================================================================
// COST TABLE MANAGEMENT
// ================================================================

/**
 * Adds a manual cost row to the cost table.
 * 
 * Used for a-la-carte reworks where users can add custom changes.
 * Each row has an editable description, change count, and delete button.
 * 
 * @param {string} [change=""] - Description of the change
 * @param {number} [count=0] - Number of change points
 * 
 * @example
 * addCostRow("Extra spell swap", 1);
 * // Adds a row with description and count = 1
 */
export function addCostRow(change = "", count = 0) {
    const tbody = document.getElementById('cost-table-body');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="text" class="text-input cost-change" value="${change}" style="width: 100%;"></td>
        <td><input type="number" class="text-input cost-num-changes" value="${count}" min="0" style="width: 100%;" onchange="window.updateTotalCost()"></td>
        <td><button type="button" class="button" onclick="window.deleteCostRow(this)" style="background-color: #c0392b; color: #fff; padding: 4px 8px;">×</button></td>`;
    tbody.appendChild(row);
    window.updateTotalCost();
}

// ================================================================
// OUTPUT GENERATION
// ================================================================

/**
 * Generates a Discord-formatted output string for the rework request.
 * 
 * This creates a comprehensive summary formatted for posting in Discord,
 * including:
 * - Requestor information
 * - Old character summary
 * - New character summary
 * - Cost breakdown
 * - Detailed change log
 * - Rework ID for reference
 * - Discord role mentions
 * 
 * The output uses Discord code block formatting and mentions the
 * appropriate server roles for rework approval.
 * 
 * @param {Object} oldC - Original character data
 * @param {Object} newC - New character data
 * @param {string} cost - Cost summary string (e.g., "1000 GP / 50 DTP")
 * @param {string} notes - User notes about the rework
 * @param {Object} calcResult - Result from computeReworkCosts()
 * @returns {string} Formatted Discord message
 * 
 * @example
 * const output = generateOutputString(oldChar, newChar, "1000 GP / 50 DTP", "Switching to Ranger", calcResult);
 * console.log(output);
 * // ```
 * // __***Character Change Request***__
 * // **Requestor:** @user123 as Gandalf(20)
 * // ...
 * // ```
 */
export function generateOutputString(oldC, newC, cost, notes, calcResult) {
    /**
     * Helper: Builds a character summary block
     * @param {Object} c - Character data
     * @returns {string} Formatted character summary
     */
    const buildB = (c) => {
        /**
         * Helper: Cleans class/subclass names by removing parenthetical content
         * @param {string} s - String to clean
         * @returns {string} Cleaned string
         */
        const clean = (s) => (s || '').replace(/\s*\(.*?\)\s*/g, ' ').trim();
        
        // Build class line (e.g., "Fighter Battlemaster (10) / Rogue Thief (5)")
        const classLine = c.classes.map(cl => {
            const name = clean(cl.class);
            const sub = clean(cl.subclass);
            return `${name}${sub && sub !== 'None' ? ' ' + sub : ''} (${cl.level})`;
        }).join(' / ');

        // Build feat list with modifiers
        const featChoices = c.feats.map(f => {
            let m = []; 
            ATTRIBUTES.forEach(a => { 
                if (f.mods[a] != "0") m.push(`+${f.mods[a]} ${a}`); 
            });
            return `${f.name}${m.length ? ' ' + m.join(", ") : ""} (${f.source})`;
        });

        return `**Level:** ${c.classes.reduce((a, b) => a + (parseInt(b.level) || 0), 0)}\n**Class:** ${classLine}\n**Race:** ${c.race}\n**Attributes:** ${ATTRIBUTES.map(a => c.attributes[a]).join('/')}\n**Feats:** ${featChoices.join(', ') || 'None'}`;
    };

    // Format Discord ID (ensure @ prefix)
    let discordId = document.getElementById('manual-discord-id').value || "Unknown";
    if (discordId !== "Unknown" && !discordId.startsWith('@')) {
        discordId = '@' + discordId;
    }

    // Get human-readable rework type label
    const typeSelect = document.getElementById('rework-type');
    let typeLabel = typeSelect.options[typeSelect.selectedIndex]?.text || "Not Selected";

    // Build change log from calculation results
    const logs = [];
    logs.push(`**Rework Type:** ${typeLabel}`);
    logs.push(`---`);
    
    if (calcResult && calcResult.costs) {
        calcResult.costs.forEach(c => {
            let logLine = `- ${c.change}`;
            
            // For a-la-carte, show the cost breakdown for each item
            if (!calcResult.isFixed && c.count > 0) {
                const g = c.count * (calcResult.rates?.gold || 0);
                const d = c.count * (calcResult.rates?.dtp || 0);
                logLine += ` (${c.count} pts: ${g} GP / ${d} DTP)`;
            }
            logs.push(logLine);
        });
    }

    const oldLevel = getTotalLevel(oldC.classes);
    const reworkId = document.getElementById('current-rework-id')?.value || "Not Saved";

    // Assemble final output string
    return `\`\`\`
__***Character Change Request***__
**Requestor:** ${discordId} as ${oldC.name}(${oldLevel})

**Old Character**
${buildB(oldC)}

**New Character**
${buildB(newC)}

**Details**
Cost: ${cost}
Notes: ${notes}

__***Change Log***__
${logs.join('\n')}

**Rework ID:** ${reworkId}
\`\`\`
<@&474659626193780751> <@&554463237924716545>`;
}