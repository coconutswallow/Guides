// assets/js/dm-tool/session-rows.js
import { fetchMemberMap } from './data-manager.js';

/* ===========================
   1. MASTER ROSTER (View 4)
   =========================== */

/**
 * Calculates APL, Tier, and Party Size based on the current rows in the Master Roster.
 * Updates the stats bar in the DOM.
 */
export function updateMasterRosterStats() {
    const rows = document.querySelectorAll('#roster-body .player-row');
    let totalLevel = 0;
    let playerCount = 0; // Only counts players with a valid level > 0

    rows.forEach(row => {
        // Grab inputs
        const elLvl = row.querySelector('.inp-level');
        const elPlayAs = row.querySelector('.inp-level-play-as');

        if (!elLvl || !elPlayAs) return;

        const lvlRaw = parseFloat(elLvl.value) || 0;
        const lvlPlayAsRaw = parseFloat(elPlayAs.value) || 0;
        
        // Logic: Use 'Play As' if available, otherwise use actual 'Level'
        const effectiveLevel = lvlPlayAsRaw > 0 ? lvlPlayAsRaw : lvlRaw;

        if (effectiveLevel > 0) {
            totalLevel += effectiveLevel;
            playerCount++;
        }
    });

    const apl = playerCount > 0 ? Math.round(totalLevel / playerCount) : 0;
    
    // Tier Logic based on APL
    let tier = 1;
    if (apl >= 17) tier = 4;
    else if (apl >= 11) tier = 3;
    else if (apl >= 5) tier = 2;

    // Update DOM elements
    const elSize = document.getElementById('setup-val-party-size');
    const elApl = document.getElementById('setup-val-apl');
    const elTier = document.getElementById('setup-val-tier');

    // Update Text
    if(elSize) elSize.textContent = rows.length; 
    if(elApl) elApl.textContent = apl;
    if(elTier) elTier.textContent = tier;

    // Debugging log
    console.log(`[Roster Stats] Count: ${rows.length}, APL: ${apl}, Tier: ${tier}`);
}

/**
 * Adds a row to the Player & DM Setup table.
 */
export function addPlayerRowToMaster(data = {}) {
    const tbody = document.getElementById('roster-body');
    if(!tbody) return;
    
    const tr = document.createElement('tr');
    tr.className = 'player-row';
    
    let gamesOptions = '';
    for(let i=0; i<=10; i++) {
        const val = i.toString();
        const selected = (data.games_count === val) ? 'selected' : '';
        gamesOptions += `<option value="${val}" ${selected}>${val}</option>`;
    }
    gamesOptions += `<option value="10+" ${data.games_count === '10+' ? 'selected' : ''}>10+</option>`;
    
    tr.innerHTML = `
        <td>
            <input type="text" class="table-input inp-player-display" placeholder="Player Name" value="${data.display_name || data.discord_id || ''}">
            <input type="hidden" class="inp-discord-id" value="${data.discord_id || ''}">
        </td>
        <td><input type="text" class="table-input inp-char-name" placeholder="Character Name" value="${data.character_name || ''}"></td>
        <td><input type="number" class="table-input inp-level" placeholder="" value="${data.level || ''}"></td>
        <td><input type="number" class="table-input inp-level-play-as" placeholder="" value="${data.level_playing_as || ''}"></td>
        <td><select class="table-input inp-games-count">${gamesOptions}</select></td>
        <td style="text-align:center;"><button class="button button-danger btn-sm btn-delete-row">&times;</button></td>
    `;
    
    // Auto-update hidden ID
    const nameInput = tr.querySelector('.inp-player-display');
    const idInput = tr.querySelector('.inp-discord-id');
    nameInput.addEventListener('change', () => {
        if(!idInput.value) idInput.value = nameInput.value; 
    });

    // Delete Listener
    tr.querySelector('.btn-delete-row').addEventListener('click', () => {
        tr.remove();
        updateMasterRosterStats(); // Recalculate stats after deletion
    });

    // Real-time Calc Listeners
    const lvlInput = tr.querySelector('.inp-level');
    const playAsInput = tr.querySelector('.inp-level-play-as');
    
    [lvlInput, playAsInput].forEach(inp => {
        inp.addEventListener('input', updateMasterRosterStats);
        inp.addEventListener('change', updateMasterRosterStats);
        inp.addEventListener('blur', updateMasterRosterStats); // Extra trigger on blur
    });

    tbody.appendChild(tr);
    
    // USE SETTIMEOUT: This ensures the row is fully rendered before we calculate
    setTimeout(() => updateMasterRosterStats(), 50);
}

export function getMasterRosterData() {
    const rows = document.querySelectorAll('#roster-body .player-row');
    const players = [];
    rows.forEach(row => {
        players.push({
            discord_id: row.querySelector('.inp-discord-id').value,
            display_name: row.querySelector('.inp-player-display').value,
            character_name: row.querySelector('.inp-char-name').value,
            level: row.querySelector('.inp-level').value,
            level_playing_as: row.querySelector('.inp-level-play-as').value, 
            games_count: row.querySelector('.inp-games-count').value
        });
    });
    return players;
}

/**
 * SYNC LOGIC for View 4 (Player Setup)
 * Pulls data from player-entry submissions -> Master Roster
 */
export async function syncMasterRosterFromSubmissions(submissions) {
    const tbody = document.getElementById('roster-body');
    if (!tbody) return;

    if (!submissions || submissions.length === 0) return;

    // 1. Get Display Names map for all Discord IDs in submissions
    const discordIds = submissions.map(s => s.discord_id).filter(Boolean);
    const displayMap = await fetchMemberMap(discordIds);

    // 2. Iterate Submissions and Update/Add rows
    submissions.forEach(sub => {
        const p = sub.payload || {};
        const pid = sub.discord_id;
        if(!pid) return;

        // Display Name Lookup (fallback to ID if not found)
        const displayName = displayMap[pid] || pid;

        // Find existing row by Hidden ID
        let foundRow = null;
        const rows = tbody.querySelectorAll('.player-row');
        rows.forEach(r => {
            const rid = r.querySelector('.inp-discord-id').value;
            if(rid === pid) foundRow = r;
        });

        if (foundRow) {
            // Update Existing
            foundRow.querySelector('.inp-player-display').value = displayName; 
            if (p.char_name) foundRow.querySelector('.inp-char-name').value = p.char_name;
            if (p.level) foundRow.querySelector('.inp-level').value = p.level;
            if (p.level_as) foundRow.querySelector('.inp-level-play-as').value = p.level_as;
            if (p.games) foundRow.querySelector('.inp-games-count').value = p.games;
        } else {
            // Create New Row
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

    // 3. Final calculation update
    setTimeout(() => updateMasterRosterStats(), 100);
}


/* ===========================
   2. SESSION PLAYER CARDS (View 6)
   =========================== */
export function addSessionPlayerRow(listContainer, data = {}, callbacks = {}) {
    if (!listContainer) return;

    // Default hours to the session total if not specific to player
    const rowHours = data.hours || document.getElementById('inp-session-total-hours').value || "0";
    
    const currentIncentives = data.incentives || [];
    const incentivesJson = JSON.stringify(currentIncentives);
    const btnText = currentIncentives.length > 0 ? `+` : '+';

    const playerNum = listContainer.children.length + 1;

    const card = document.createElement('div');
    card.className = 'player-card';

    card.innerHTML = `
        <div class="player-card-header">
            <span class="player-card-title">Player ${playerNum}</span>
            <button class="btn-delete-card" title="Remove Player">&times;</button>
        </div>
        
        <div class="player-card-body">
            <div class="card-row">
                <div class="card-field w-30">
                    <label class="field-label">Discord Name</label>
                    <input type="text" class="table-input s-char-name" value="${data.display_name || data.discord_id || ''}" readonly style="border:none; font-weight:bold;">
                    <input type="hidden" class="s-discord-id" value="${data.discord_id || ''}">
                </div>
                <div class="card-field w-30">
                    <label class="field-label">Character Name</label>
                    <input type="text" class="table-input s-char-name" value="${data.character_name || ''}">
                </div>
                <div class="card-field w-20">
                    <label class="field-label">Hours Played</label>
                    <input type="number" class="table-input s-hours" value="${rowHours}" step="0.5" readonly>
                </div>
                <div class="card-field w-20">
                    <label class="field-label"># Games</label>
                    <input type="text" class="table-input s-games" value="${data.games_count || ''}">
                </div>
            </div>

            <div class="card-row">
                <div class="card-field w-20">
                    <label class="field-label">Level</label>
                    <input type="number" class="table-input s-level" value="${data.level || ''}">
                </div>
                <div class="card-field w-20">
                    <label class="field-label">XP Earned</label>
                    <input type="text" class="table-input readonly-result s-xp" readonly placeholder="Auto">
                </div>
                <div class="card-field w-30">
                    <label class="field-label">Gold Rewarded</label>
                    <input type="text" class="table-input s-gold" value="${data.gold || ''}" placeholder="GP">
                </div>
                <div class="card-field w-30">
                    <label class="field-label">DTP / Incentives</label>
                    <div class="dtp-wrapper">
                        <input type="text" class="table-input readonly-result s-dtp" readonly placeholder="DTP" style="width:calc(100% - 45px);">
                        <button class="button button-secondary s-incentives-btn" data-incentives='${incentivesJson}'>${btnText}</button>
                    </div>
                </div>
            </div>

            <div class="card-row">
                <div class="card-field w-50">
                    <label class="field-label">Loot Rewarded</label>
                    <input type="text" class="table-input s-loot" value="${data.loot || ''}" placeholder="">
                </div>
                <div class="card-field w-50">
                    <label class="field-label">Items Used</label>
                    <input type="text" class="table-input s-items" value="${data.items_used || ''}" placeholder="">
                </div>
            </div>

            <div class="card-row">
                <div class="card-field w-100">
                    <label class="field-label">Notes</label>
                    <textarea class="table-input s-notes" rows="1">${data.notes || ''}</textarea>
                </div>
            </div>
        </div>
    `;

    // Listeners
    card.querySelector('.btn-delete-card').addEventListener('click', () => {
        card.remove();
        if(callbacks.onUpdate) callbacks.onUpdate();
    });

    ['.s-level', '.s-games', '.s-gold'].forEach(cls => {
        card.querySelector(cls).addEventListener('input', () => {
            if(callbacks.onUpdate) callbacks.onUpdate();
        });
    });
    
    const btnIncentives = card.querySelector('.s-incentives-btn');
    btnIncentives.addEventListener('click', () => {
        if(callbacks.onOpenModal) callbacks.onOpenModal(btnIncentives, null, false);
    });

    listContainer.appendChild(card);
    if(callbacks.onUpdate) callbacks.onUpdate();
}

export function getSessionRosterData() {
    const cards = document.querySelectorAll('#session-roster-list .player-card');
    const players = [];
    cards.forEach(card => {
        const btn = card.querySelector('.s-incentives-btn');
        const incentives = JSON.parse(btn.dataset.incentives || '[]');

        players.push({
            discord_id: card.querySelector('.s-discord-id').value,
            character_name: card.querySelector('.s-char-name').value,
            level: card.querySelector('.s-level').value,
            games_count: card.querySelector('.s-games').value,
            hours: card.querySelector('.s-hours').value,
            xp: card.querySelector('.s-xp').value,
            gold: card.querySelector('.s-gold').value,
            dtp: card.querySelector('.s-dtp').value,
            incentives: incentives,
            loot: card.querySelector('.s-loot').value,
            items_used: card.querySelector('.s-items').value,
            notes: card.querySelector('.s-notes').value
        });
    });
    return players;
}

export function syncSessionPlayersFromMaster(callbacks) {
    const listContainer = document.getElementById('session-roster-list');
    listContainer.innerHTML = ''; 
    const sourceData = getMasterRosterData(); 
    
    // Also sync DM Data
    const dmLvl = document.getElementById('inp-dm-level').value;
    const dmGames = document.getElementById('inp-dm-games-count').value;
    const dmChar = document.getElementById('inp-dm-char-name').value;
    
    document.getElementById('out-dm-level').value = dmLvl;
    document.getElementById('out-dm-games').value = dmGames;
    document.getElementById('out-dm-name').value = dmChar;

    sourceData.forEach(p => {
        addSessionPlayerRow(listContainer, p, callbacks);
    });
}

/**
 * Applies submissions to Session Logs (View 6)
 */
export function applyPlayerSubmissions(submissions, callbacks) {
    const listContainer = document.getElementById('session-roster-list');
    if (!listContainer) return;

    const existingCards = Array.from(listContainer.querySelectorAll('.player-card'));

    submissions.forEach(sub => {
        const p = sub.payload || {};
        const discordId = sub.discord_id || "";
        
        if (!discordId) return;

        // Find existing card by Discord ID (Hidden Field)
        const card = existingCards.find(c => {
            const val = c.querySelector('.s-discord-id').value.trim().toLowerCase();
            return val === discordId.trim().toLowerCase();
        });

        if (card) {
            if (p.char_name) card.querySelector('.s-char-name').value = p.char_name;
            if (p.level) card.querySelector('.s-level').value = p.level;
            if (p.games) card.querySelector('.s-games').value = p.games;
            if (p.loot) card.querySelector('.s-loot').value = p.loot;
            if (p.items) card.querySelector('.s-items').value = p.items;
            if (p.gold) card.querySelector('.s-gold').value = p.gold;
            if (p.notes) card.querySelector('.s-notes').value = p.notes;
            card.querySelector('.s-level').dispatchEvent(new Event('input'));
        } else {
            const newPlayerData = {
                discord_id: discordId,
                display_name: discordId, // Fallback, will be updated if sync happens
                character_name: p.char_name,
                level: p.level,
                level_playing_as: p.level_as, 
                games_count: p.games,
                loot: p.loot,
                items_used: p.items,
                gold: p.gold,
                notes: p.notes
            };
            addSessionPlayerRow(listContainer, newPlayerData, callbacks);
        }
    });

    if (callbacks && callbacks.onUpdate) callbacks.onUpdate();
}