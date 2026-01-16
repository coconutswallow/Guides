// assets/js/dm-tool/session-rows.js
import { fetchMemberMap } from './data-manager.js';

/* ===========================
   1. MASTER ROSTER (View 4)
   =========================== */
// ... (Existing Master Roster functions: updateMasterRosterStats, addPlayerRowToMaster, getMasterRosterData, syncMasterRosterFromSubmissions - NO CHANGES) ...
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
        
        const effectiveLevel = lvlPlayAsRaw > 0 ? lvlPlayAsRaw : lvlRaw;

        if (effectiveLevel > 0) {
            totalLevel += effectiveLevel;
            playerCount++;
        }
    });

    const apl = playerCount > 0 ? Math.round(totalLevel / playerCount) : 0;
    
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
    
    const nameInput = tr.querySelector('.inp-player-display');
    const idInput = tr.querySelector('.inp-discord-id');
    nameInput.addEventListener('change', () => {
        if(!idInput.value) idInput.value = nameInput.value; 
    });

    tr.querySelector('.btn-delete-row').addEventListener('click', () => {
        tr.remove();
        updateMasterRosterStats(); 
    });

    const lvlInput = tr.querySelector('.inp-level');
    const playAsInput = tr.querySelector('.inp-level-play-as');
    
    [lvlInput, playAsInput].forEach(inp => {
        inp.addEventListener('input', updateMasterRosterStats);
        inp.addEventListener('change', updateMasterRosterStats);
        inp.addEventListener('blur', updateMasterRosterStats); 
    });

    tbody.appendChild(tr);
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

export async function syncMasterRosterFromSubmissions(submissions) {
    const tbody = document.getElementById('roster-body');
    if (!tbody) return;

    if (!submissions || submissions.length === 0) return;

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
            foundRow.querySelector('.inp-player-display').value = displayName; 
            if (p.char_name) foundRow.querySelector('.inp-char-name').value = p.char_name;
            if (p.level) foundRow.querySelector('.inp-level').value = p.level;
            if (p.level_as) foundRow.querySelector('.inp-level-play-as').value = p.level_as;
            if (p.games) foundRow.querySelector('.inp-games-count').value = p.games;
        } else {
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

/* ===========================
   2. SESSION PLAYER CARDS (View 6)
   =========================== */

// Updated to accept suppressUpdate to prevent infinite loops during auto-sync
export function addSessionPlayerRow(listContainer, data = {}, callbacks = {}, suppressUpdate = false) {
    if (!listContainer) return;

    const sessionTotalEl = document.getElementById('inp-session-total-hours');
    const sessionTotal = sessionTotalEl ? sessionTotalEl.value : "0";

    let rowHours;
    if (data.hours !== undefined && data.hours !== null && data.hours !== "") {
        rowHours = data.hours;
    } else {
        rowHours = sessionTotal;
    }
    
    const currentIncentives = data.incentives || [];
    const incentivesJson = JSON.stringify(currentIncentives);
    const btnText = currentIncentives.length > 0 ? `+` : '+';
    
    const isForfeit = !!data.forfeit_xp;

    const card = document.createElement('div');
    card.className = 'player-card';

    // UPDATED LAYOUT: Separate column for Forfeit XP
    card.innerHTML = `
        <div class="player-card-header" style="cursor:pointer; display:flex; align-items:center; justify-content:space-between;">
            <div style="display:flex; align-items:center; gap:0.5rem;">
                <span class="step-icon" style="transform:rotate(-90deg); transition:transform 0.2s;"></span>
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
                <input type="hidden" class="s-games" value="${data.games_count || '0'}">

                <div class="card-field w-20">
                    <label class="field-label">Hours</label>
                    <input type="number" class="table-input s-hours" value="${rowHours}" step="0.5" max="${sessionTotal}">
                </div>

                <div class="card-field w-25">
                    <label class="field-label">XP Earned</label>
                    <input type="text" class="table-input readonly-result s-xp" readonly placeholder="Auto">
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
                        <input type="text" class="table-input readonly-result s-dtp" readonly placeholder="DTP" style="width:calc(100% - 45px);">
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

    // Collapsible Logic
    const header = card.querySelector('.player-card-header');
    const body = card.querySelector('.player-card-body');
    const icon = card.querySelector('.step-icon');

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

    // BLUR FIX: Hours
    const hInput = card.querySelector('.s-hours');
    hInput.addEventListener('input', () => {
        if(callbacks.onUpdate) callbacks.onUpdate();
    });
    hInput.addEventListener('blur', () => {
        if (!hInput.value || hInput.value.trim() === "") {
            hInput.value = document.getElementById('inp-session-total-hours').value || "0";
            if(callbacks.onUpdate) callbacks.onUpdate();
        }
    });

    card.querySelector('.s-gold').addEventListener('input', () => {
        if(callbacks.onUpdate) callbacks.onUpdate();
    });

    card.querySelector('.s-forfeit-xp').addEventListener('change', () => {
        if(callbacks.onUpdate) callbacks.onUpdate();
    });
    
    const btnIncentives = card.querySelector('.s-incentives-btn');
    btnIncentives.addEventListener('click', () => {
        if(callbacks.onOpenModal) callbacks.onOpenModal(btnIncentives, null, false);
    });

    listContainer.appendChild(card);
    if(callbacks.onUpdate && !suppressUpdate) callbacks.onUpdate();
}

export function getSessionRosterData() {
    const cards = document.querySelectorAll('#session-roster-list .player-card');
    const players = [];
    cards.forEach(card => {
        const btn = card.querySelector('.s-incentives-btn');
        const incentives = JSON.parse(btn.dataset.incentives || '[]');
        const forfeitXp = card.querySelector('.s-forfeit-xp').checked;

        players.push({
            discord_id: card.querySelector('.s-discord-id').value,
            character_name: card.querySelector('.s-char-name').value, 
            display_name: card.querySelector('.player-card-title').textContent,
            level: card.querySelector('.s-level').value,
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

// Updated to accept suppressUpdate
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
            existingCard.querySelector('.player-card-title').textContent = masterPlayer.display_name;
            existingCard.querySelector('.s-char-name').value = masterPlayer.character_name;
            existingCard.querySelector('.s-level').value = masterPlayer.level_playing_as || masterPlayer.level;
            existingCard.querySelector('.s-games').value = masterPlayer.games_count;
        } else {
            const newData = {
                ...masterPlayer,
                level: masterPlayer.level_playing_as || masterPlayer.level
            };
            // Pass suppressUpdate to prevent infinite loop during onUpdate calls
            addSessionPlayerRow(listContainer, newData, callbacks, suppressUpdate);
        }
    });

    sessionCards.forEach(card => {
        const cid = card.querySelector('.s-discord-id').value;
        if (!processedIds.has(cid)) {
            card.remove();
        }
    });
    
    if(callbacks.onUpdate && !suppressUpdate) callbacks.onUpdate();
}

export function applyPlayerSubmissions(submissions, callbacks) {
    const listContainer = document.getElementById('session-roster-list');
    if (!listContainer) return;

    const existingCards = Array.from(listContainer.querySelectorAll('.player-card'));

    submissions.forEach(sub => {
        const p = sub.payload || {};
        const discordId = sub.discord_id || "";
        
        if (!discordId) return;

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