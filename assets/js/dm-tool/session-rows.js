// assets/js/dm-tool/session-rows.js

/**
 * @file session-rows.js
 * @description Manages the creation, synchronization, and data scraping of Player Rows.
 * This module handles two distinct types of rows:
 * 1. Master Roster Rows (Table rows used in the planning phase).
 * 2. Session Player Cards (Detailed cards used in the log/results phase).
 * It also handles the calculation of Party Stats (APL, Tier) based on these rows.
 * @module SessionRows
 */

// FIX: Player card sync on initial load and proper forfeit XP handling
import { fetchMemberMap } from './data-manager.js';

/**
 * Recalculates Party Size, APL (Average Party Level), and Tier based on the Master Roster.
 * Updates the corresponding DOM elements in the Setup/Header section.
 * * Logic:
 * - Uses "Level Playing As" if set; otherwise uses "Character Level".
 * - Tier thresholds: 
 * - Tier 1: APL < 5
 * - Tier 2: 5 <= APL < 11
 * - Tier 3: 11 <= APL < 17
 * - Tier 4: APL >= 17
 */
export function updateMasterRosterStats() {
    const rows = document.querySelectorAll('#roster-body .player-row');
    let totalLevel = 0;
    let playerCount = 0; 

    rows.forEach(row => {
        const elLvl = row.querySelector('.inp-level');
        const elPlayAs = row.querySelector('.inp-level-play-as');

        if (!elLvl || !elPlayAs) return;

        const lvlRaw = parseFloat(elLvl.value) || 0;
        const lvlPlayAsRaw = parseFloat(elPlayAs.value) || 0;
        
        // Use "Play As" level override if present, otherwise use actual level
        const effectiveLevel = lvlPlayAsRaw > 0 ? lvlPlayAsRaw : lvlRaw;

        if (effectiveLevel > 0) {
            totalLevel += effectiveLevel;
            playerCount++;
        }
    });

    // standard rounding for APL
    const apl = playerCount > 0 ? Math.round(totalLevel / playerCount) : 0;
    
    // Determine Tier based on APL
    let tier = 1;
    if (apl >= 17) tier = 4;
    else if (apl >= 11) tier = 3;
    else if (apl >= 5) tier = 2;

    const elSize = document.getElementById('setup-val-party-size');
    const elApl = document.getElementById('setup-val-apl');
    const elTier = document.getElementById('setup-val-tier');

    if(elSize) elSize.textContent = rows.length; 
    if(elApl) elApl.textContent = apl;
    if(elTier) elTier.textContent = tier;
}

/**
 * Adds a new player row to the Master Roster table (Planning Tab).
 * Creates input fields for Discord Name, Character Name, Level, Play As, and Games Count.
 * Attaches event listeners for live updates of stats.
 * * @param {Object} data - Initial data to populate the row.
 * @param {string} [data.discord_id] - Discord ID.
 * @param {string} [data.display_name] - Discord Display Name.
 * @param {string} [data.character_name] - Character Name.
 * @param {string|number} [data.level] - Character Level.
 * @param {string|number} [data.level_playing_as] - Level override.
 * @param {string} [data.games_count] - Number of games played (1-10 or 10+).
 */
export function addPlayerRowToMaster(data = {}) {
    const tbody = document.getElementById('roster-body');
    if(!tbody) return;
    
    const tr = document.createElement('tr');
    tr.className = 'player-row';
    
    // Build options for Games Count dropdown
    let gamesOptions = '';
    for(let i=1; i<=10; i++) {
        const val = i.toString();
        const selected = (data.games_count === val) ? 'selected' : '';
        gamesOptions += `<option value="${val}" ${selected}>${val}</option>`;
    }
    gamesOptions += `<option value="10+" ${data.games_count === '10+' ? 'selected' : ''}>10+</option>`;
    
    const displayValue = data.display_name || data.discord_id || '';
    const idValue = data.discord_id || '';
    
    tr.innerHTML = `
        <td>
            <input type="text" class="table-input inp-player-display" placeholder="Player Discord Name" value="${displayValue}">
            <input type="hidden" class="inp-discord-id" value="${idValue}">
        </td>
        <td><input type="text" class="table-input inp-char-name" placeholder="Character Name" value="${data.character_name || ''}"></td>
        <td><input type="number" class="table-input inp-level" placeholder="" value="${data.level || ''}"></td>
        <td><input type="number" class="table-input inp-level-play-as" placeholder="" value="${data.level_playing_as || ''}"></td>
        <td><select class="table-input inp-games-count">${gamesOptions}</select></td>
        <td style="text-align:center;"><button class="button button-danger btn-sm btn-delete-row">&times;</button></td>
    `;

    // Trigger global update callback on games count change (affects incentives)
    const gamesSelect = tr.querySelector('.inp-games-count');
    if (gamesSelect) {
        gamesSelect.addEventListener('change', () => {
            if (window._sessionCallbacks && window._sessionCallbacks.onUpdate) {
                window._sessionCallbacks.onUpdate();
            }
        });
    }
    
    const nameInput = tr.querySelector('.inp-player-display');
    const idInput = tr.querySelector('.inp-discord-id');
    
    // Sync ID with Name if ID is missing (fallback)
    nameInput.addEventListener('change', () => {
        if(!idInput.value || idInput.value === nameInput.value) {
            idInput.value = nameInput.value;
        }
    });

    tr.querySelector('.btn-delete-row').addEventListener('click', () => {
        tr.remove();
        updateMasterRosterStats(); 
    });

    const lvlInput = tr.querySelector('.inp-level');
    const playAsInput = tr.querySelector('.inp-level-play-as');
    
    // Recalculate APL/Tier whenever levels change
    [lvlInput, playAsInput].forEach(inp => {
        inp.addEventListener('input', updateMasterRosterStats);
        inp.addEventListener('change', updateMasterRosterStats);
        inp.addEventListener('blur', updateMasterRosterStats); 
    });

    tbody.appendChild(tr);
    // Brief delay to ensure DOM insertion before calculation
    setTimeout(() => updateMasterRosterStats(), 50);
}

/**
 * Scrapes the Master Roster table to retrieve current player data.
 * Used to save state or sync to the session log.
 * * @returns {Array<Object>} Array of player objects (Planning phase data).
 */
export function getMasterRosterData() {
    const rows = document.querySelectorAll('#roster-body .player-row');
    const players = [];
    rows.forEach(row => {
        const displayName = row.querySelector('.inp-player-display').value;
        const discordId = row.querySelector('.inp-discord-id').value;
        
        players.push({
            discord_id: discordId || displayName,
            display_name: displayName,
            character_name: row.querySelector('.inp-char-name').value,
            level: row.querySelector('.inp-level').value,
            level_playing_as: row.querySelector('.inp-level-play-as').value, 
            games_count: row.querySelector('.inp-games-count').value
        });
    });
    return players;
}

/**
 * Updates the Master Roster based on external submissions (e.g., from Sign-up bot).
 * - Matches existing players by Discord ID to update their data.
 * - Creates new rows for players not yet in the roster.
 * * @param {Array<Object>} submissions - Array of submission objects.
 */
export async function syncMasterRosterFromSubmissions(submissions) {
    const tbody = document.getElementById('roster-body');
    if (!tbody) return;

    if (!submissions || submissions.length === 0) return;

    // Fetch nicknames for IDs
    const discordIds = submissions.map(s => s.discord_id).filter(Boolean);
    const displayMap = await fetchMemberMap(discordIds);

    submissions.forEach(sub => {
        const p = sub.payload || {};
        const pid = sub.discord_id;
        if(!pid) return;

        const displayName = displayMap[pid] || pid;

        let foundRow = null;
        const rows = tbody.querySelectorAll('.player-row');
        rows.forEach(r => {
            const rid = r.querySelector('.inp-discord-id').value;
            if(rid === pid) foundRow = r;
        });

        if (foundRow) {
            // Update existing row
            foundRow.querySelector('.inp-player-display').value = displayName;
            foundRow.querySelector('.inp-discord-id').value = pid;
            
            if (p.char_name) foundRow.querySelector('.inp-char-name').value = p.char_name;
            if (p.level) foundRow.querySelector('.inp-level').value = p.level;
            if (p.level_as) foundRow.querySelector('.inp-level-play-as').value = p.level_as;
            if (p.games) foundRow.querySelector('.inp-games-count').value = p.games;
        } else {
            // Add new row
            const newData = {
                discord_id: pid,
                display_name: displayName,
                character_name: p.char_name,
                level: p.level,
                level_playing_as: p.level_as,
                games_count: p.games
            };
            addPlayerRowToMaster(newData);
        }
    });

    setTimeout(() => updateMasterRosterStats(), 100);
}

/**
 * Adds a detailed Player Card to the Session Log/Results list.
 * This card includes fields for Hours, XP, Gold, DTP, Loot, and Logs.
 * * @param {HTMLElement} listContainer - The DOM container for the cards.
 * @param {Object} data - Player data to populate.
 * @param {Object} callbacks - Callback functions (e.g., onUpdate, onOpenModal).
 * @param {boolean} [suppressUpdate=false] - If true, skips the immediate `onUpdate` trigger.
 */
export function addSessionPlayerRow(listContainer, data = {}, callbacks = {}, suppressUpdate = false) {
    if (!listContainer) return;

    // Default to session total hours if player hours are undefined
    const sessionTotalEl = document.getElementById('inp-session-total-hours');
    const sessionTotal = parseFloat(sessionTotalEl?.value) || 3;

    let rowHours;
    if (data.hours !== undefined && data.hours !== null && data.hours !== "") {
        rowHours = parseFloat(data.hours);
    } else {
        rowHours = sessionTotal;
    }
    
    const currentIncentives = data.incentives || [];
    const incentivesJson = JSON.stringify(currentIncentives);
    const btnText = currentIncentives.length > 0 ? `+` : '+';
    
    // FIX: Properly read forfeit_xp from data (string or boolean)
    const isForfeit = data.forfeit_xp === true || data.forfeit_xp === "true";

    // Data.level is the "Effective" level. data.real_level is the actual level.
    // If real_level is missing, default to level.
    const realLevel = data.real_level || data.level || '1';

    const card = document.createElement('div');
    card.className = 'player-card';

    // Construct Player Card HTML
    card.innerHTML = `
        <div class="player-card-header" style="cursor:pointer; display:flex; align-items:center; justify-content:space-between;">
            <div style="display:flex; align-items:center; gap:0.5rem;">
                <span class="step-icon" style="transform:rotate(-90deg); transition:transform 0.2s;">▼</span>
                <span class="player-card-title">${data.display_name || 'Player'}</span>
                <span class="player-summary-text" style="font-size:0.8em; color:rgba(255,255,255,0.8); font-weight:normal; margin-left:1rem;">
                    ${data.character_name ? `(${data.character_name})` : ''}
                </span>
            </div>
            <button class="btn-delete-card" title="Remove Player" style="z-index:2;">&times;</button>
        </div>
        
        <div class="player-card-body" style="display:none;">
            <div class="card-row">
                <input type="hidden" class="s-char-name" value="${data.character_name || ''}">
                <input type="hidden" class="s-discord-id" value="${data.discord_id || ''}">
                <input type="hidden" class="s-level" value="${data.level || '0'}">
                <input type="hidden" class="s-real-level" value="${realLevel}"> <input type="hidden" class="s-games" value="${data.games_count || '1'}">
                <input type="hidden" class="s-display-name" value="${data.display_name || ''}">

                <div class="card-field w-20">
                    <label class="field-label">Hours</label>
                    <input type="number" class="table-input s-hours" value="${rowHours}" step="0.5" min="0" max="${sessionTotal}">
                </div>

                <div class="card-field w-25">
                    <label class="field-label">XP Earned</label>
                    <input type="text" class="table-input readonly-result s-xp" readonly placeholder="Auto" value="${data.xp || ''}">
                </div>

                <div class="card-field w-15" style="text-align:center;">
                     <label class="field-label" style="display:block; width:100%; cursor:pointer;">Forfeit XP</label>
                     <div style="height:38px; display:flex; align-items:center; justify-content:center;">
                        <input type="checkbox" class="s-forfeit-xp" ${isForfeit ? 'checked' : ''} style="width:18px; height:18px; cursor:pointer;">
                     </div>
                </div>

                <div class="card-field w-40">
                    <label class="field-label">DTP / Incentives</label>
                    <div class="dtp-wrapper">
                        <input type="text" class="table-input readonly-result s-dtp" readonly placeholder="DTP" style="width:calc(100% - 45px);" value="${data.dtp || ''}">
                        <button class="button button-secondary s-incentives-btn" data-incentives='${incentivesJson}' title="Select Player Incentives">${btnText}</button>
                    </div>
                </div>
            </div>

            <div class="card-row">
                <div class="card-field w-50">
                    <label class="field-label">Gold Awarded</label>
                    <input type="text" class="table-input s-gold" value="${data.gold || ''}" placeholder="GP">
                </div>
                <div class="card-field w-50">
                    <label class="field-label">Gold Used</label>
                    <input type="text" class="table-input s-gold-used" value="${data.gold_used || ''}" placeholder="GP Spent">
                </div>
            </div>

            <div class="card-row">
                 <div class="card-field w-100">
                    <label class="field-label">Loot Received</label>
                    <input type="text" class="table-input s-loot" value="${data.loot || ''}" placeholder="Item Name">
                </div>
            </div>

            <div class="card-row">
                 <div class="card-field w-100">
                    <label class="field-label">Items Used</label>
                    <textarea class="table-input s-items" rows="1">${data.items_used || ''}</textarea>
                </div>
            </div>

            <div class="card-row">
                <div class="card-field w-100">
                    <label class="field-label">Character Outcome Notes</label>
                    <textarea class="table-input s-notes" rows="1">${data.notes || ''}</textarea>
                </div>
            </div>
        </div>
    `;

    const header = card.querySelector('.player-card-header');
    const body = card.querySelector('.player-card-body');
    const icon = card.querySelector('.step-icon');

    // Accordion toggle logic
    header.addEventListener('click', (e) => {
        if(e.target.closest('.btn-delete-card')) return;
        
        const isHidden = body.style.display === 'none';
        if(isHidden) {
            body.style.display = 'flex';
            icon.style.transform = 'rotate(0deg)'; 
        } else {
            body.style.display = 'none';
            icon.style.transform = 'rotate(-90deg)'; 
        }
    });

    card.querySelector('.btn-delete-card').addEventListener('click', () => {
        card.remove();
        if(callbacks.onUpdate) callbacks.onUpdate();
    });

    const hInput = card.querySelector('.s-hours');
    
    // Validate Hours input
    hInput.addEventListener('input', () => {
        const sessionMax = parseFloat(document.getElementById('inp-session-total-hours')?.value) || 3;
        let val = parseFloat(hInput.value);
        
        if (val > sessionMax) {
            hInput.value = sessionMax;
        } else if (val < 0) {
            hInput.value = 0;
        }
        
        if(callbacks.onUpdate) callbacks.onUpdate();
    });
    
    // Reset empty hours to Default
    hInput.addEventListener('blur', () => {
        if (!hInput.value || hInput.value.trim() === "") {
            hInput.value = document.getElementById('inp-session-total-hours')?.value || 3;
            if(callbacks.onUpdate) callbacks.onUpdate();
        }
    });

    card.querySelector('.s-gold').addEventListener('input', () => {
        if(callbacks.onUpdate) callbacks.onUpdate();
    });

    // FIX: Ensure forfeit XP checkbox triggers update
    const forfeitCheckbox = card.querySelector('.s-forfeit-xp');
    forfeitCheckbox.addEventListener('change', () => {
        if(callbacks.onUpdate) callbacks.onUpdate();
    });
    
    const btnIncentives = card.querySelector('.s-incentives-btn');
    btnIncentives.addEventListener('click', () => {
        if(callbacks.onOpenModal) callbacks.onOpenModal(btnIncentives, null, false);
    });

    listContainer.appendChild(card);
    if(callbacks.onUpdate && !suppressUpdate) callbacks.onUpdate();
}

/**
 * Scrapes all Session Player Cards to retrieve the final result data.
 * Used for generating the text log and updating the DB.
 * * @returns {Array<Object>} Array of result objects (Hours, XP, Gold, Loot, etc).
 */
export function getSessionRosterData() {
    const cards = document.querySelectorAll('#session-roster-list .player-card');
    const players = [];
    cards.forEach(card => {
        const btn = card.querySelector('.s-incentives-btn');
        const incentives = JSON.parse(btn.dataset.incentives || '[]');
        // FIX: Properly read forfeit_xp checkbox state
        const forfeitCheckbox = card.querySelector('.s-forfeit-xp');
        const forfeitXp = forfeitCheckbox ? forfeitCheckbox.checked : false;

        players.push({
            discord_id: card.querySelector('.s-discord-id').value,
            character_name: card.querySelector('.s-char-name').value, 
            display_name: card.querySelector('.s-display-name')?.value || card.querySelector('.player-card-title').textContent,
            level: card.querySelector('.s-level').value,
            real_level: card.querySelector('.s-real-level')?.value, // Save real level too
            games_count: card.querySelector('.s-games').value,
            
            hours: card.querySelector('.s-hours').value,
            xp: card.querySelector('.s-xp').value,
            forfeit_xp: forfeitXp,
            
            gold: card.querySelector('.s-gold').value,
            gold_used: card.querySelector('.s-gold-used').value,
            dtp: card.querySelector('.s-dtp').value,
            incentives: incentives,
            loot: card.querySelector('.s-loot').value,
            items_used: card.querySelector('.s-items').value,
            notes: card.querySelector('.s-notes').value
        });
    });
    return players;
}

/**
 * Synchronizes the Session Roster (Results) with the Master Roster (Planning).
 * - Updates existing cards if player details (Name, Level) changed.
 * - Adds new cards for players added to the Master Roster.
 * - Removes cards for players removed from the Master Roster.
 * * @param {Object} callbacks - Callbacks for updates.
 * @param {boolean} [suppressUpdate=false] - Whether to suppress the update trigger.
 */
// FIX: Improved sync logic to properly handle all cases
export function syncSessionPlayersFromMaster(callbacks, suppressUpdate = false) {
    const listContainer = document.getElementById('session-roster-list');
    const masterData = getMasterRosterData(); 
    const sessionCards = Array.from(listContainer.querySelectorAll('.player-card'));
    
    const processedIds = new Set();

    masterData.forEach(masterPlayer => {
        const pid = masterPlayer.discord_id;
        processedIds.add(pid);

        const existingCard = sessionCards.find(c => c.querySelector('.s-discord-id').value === pid);

        if (existingCard) {
            // Update existing card
            existingCard.querySelector('.player-card-title').textContent = masterPlayer.display_name;
            existingCard.querySelector('.s-char-name').value = masterPlayer.character_name;
            existingCard.querySelector('.s-level').value = masterPlayer.level_playing_as || masterPlayer.level;
            
            // Update Real Level (hidden field)
            const realLevelField = existingCard.querySelector('.s-real-level');
            if(realLevelField) realLevelField.value = masterPlayer.level;

            existingCard.querySelector('.s-games').value = masterPlayer.games_count;
            
            // FIX: Update display_name hidden field
            const displayNameField = existingCard.querySelector('.s-display-name');
            if (displayNameField) {
                displayNameField.value = masterPlayer.display_name;
            }
            
            // Update the visual text in the header
            const summaryText = masterPlayer.character_name ? `(${masterPlayer.character_name})` : '';
            existingCard.querySelector('.player-summary-text').textContent = summaryText;
        } else {
            // Add new card
            const newData = {
                discord_id: masterPlayer.discord_id,
                display_name: masterPlayer.display_name,
                character_name: masterPlayer.character_name,
                level: masterPlayer.level_playing_as || masterPlayer.level, // Effective Level
                real_level: masterPlayer.level, // Real Level
                games_count: masterPlayer.games_count,
                forfeit_xp: false // Default to false for new players
            };
            addSessionPlayerRow(listContainer, newData, callbacks, suppressUpdate);
        }
    });

    // Remove cards for players no longer in master
    sessionCards.forEach(card => {
        const cid = card.querySelector('.s-discord-id').value;
        if (!processedIds.has(cid)) {
            card.remove();
        }
    });
    
    if(callbacks.onUpdate && !suppressUpdate) callbacks.onUpdate();
}

/**
 * Applies submitted data (from a session report submission) to existing Session Cards.
 * Updates fields like Loot, Items Used, Gold Used, and Notes.
 * * @param {Array<Object>} submissions - Array of submission objects.
 * @param {Object} callbacks - Callbacks for updates.
 */
export function applyPlayerSubmissions(submissions, callbacks) {
    const listContainer = document.getElementById('session-roster-list');
    if (!listContainer) return;

    const existingCards = Array.from(listContainer.querySelectorAll('.player-card'));

    submissions.forEach(sub => {
        const p = sub.payload || {};
        const discordId = sub.discord_id || "";
        
        if (!discordId) return;

        // Match submission to card by Discord ID
        const card = existingCards.find(c => {
            const val = c.querySelector('.s-discord-id').value.trim().toLowerCase();
            return val === discordId.trim().toLowerCase();
        });

        if (card) {
            if (p.loot) card.querySelector('.s-loot').value = p.loot;
            if (p.items) card.querySelector('.s-items').value = p.items;
            if (p.gold) card.querySelector('.s-gold').value = p.gold;
            if (p.gold_used) card.querySelector('.s-gold-used').value = p.gold_used;
            if (p.notes) card.querySelector('.s-notes').value = p.notes;
            
            if (p.incentives && Array.isArray(p.incentives)) {
                 const btn = card.querySelector('.s-incentives-btn');
                 btn.dataset.incentives = JSON.stringify(p.incentives);
                 btn.innerText = p.incentives.length > 0 ? "+" : "+";
            }
        }
    });

    if (callbacks && callbacks.onUpdate) callbacks.onUpdate();
}