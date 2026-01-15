// assets/js/dm-tool/session-rows.js

/* ===========================
   1. MASTER ROSTER
   =========================== */
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
        <td><input type="text" class="table-input inp-discord-id" placeholder="Discord ID" value="${data.discord_id || ''}"></td>
        <td><input type="text" class="table-input inp-char-name" placeholder="Character Name" value="${data.character_name || ''}"></td>
        <td><input type="number" class="table-input inp-level" placeholder="Lvl" value="${data.level || ''}"></td>
        <td><select class="table-input inp-games-count">${gamesOptions}</select></td>
        <td style="text-align:center;"><button class="button button-danger btn-sm btn-delete-row">&times;</button></td>
    `;
    
    tr.querySelector('.btn-delete-row').addEventListener('click', () => tr.remove());
    tbody.appendChild(tr);
}

export function getMasterRosterData() {
    const rows = document.querySelectorAll('#roster-body .player-row');
    const players = [];
    rows.forEach(row => {
        players.push({
            discord_id: row.querySelector('.inp-discord-id').value,
            character_name: row.querySelector('.inp-char-name').value,
            level: row.querySelector('.inp-level').value,
            games_count: row.querySelector('.inp-games-count').value
        });
    });
    return players;
}

/* ===========================
   2. SESSION PLAYER CARDS
   =========================== */
export function addSessionPlayerRow(listContainer, data = {}, callbacks = {}) {
    // Check if listContainer exists
    if (!listContainer) {
        console.error("Session Player Row Error: listContainer is null.");
        return;
    }

    // Find context variables
    const viewContext = listContainer.closest('.session-view');
    if (!viewContext) {
        console.error("Session Player Row Error: Context .session-view not found.");
        return;
    }

    const sessionHours = viewContext.querySelector('.inp-session-hours').value || "0";
    const rowHours = data.hours || sessionHours;
    
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
                    <label class="field-label">Discord ID</label>
                    <input type="text" class="table-input s-discord-id" value="${data.discord_id || ''}">
                </div>
                <div class="card-field w-30">
                    <label class="field-label">Character Name</label>
                    <input type="text" class="table-input s-char-name" value="${data.character_name || ''}">
                </div>
                <div class="card-field w-20">
                    <label class="field-label">Hours Played</label>
                    <input type="number" class="table-input s-hours" value="${rowHours}" step="0.5">
                    <div class="validation-msg">Exceeds Session</div>
                </div>
                <div class="card-field w-20">
                    <label class="field-label"># Games</label>
                    <input type="text" class="table-input s-games" value="${data.games_count || ''}">
                    <div class="validation-msg">Cannot be less than previous</div>
                </div>
            </div>

            <div class="card-row">
                <div class="card-field w-20">
                    <label class="field-label">Level</label>
                    <input type="number" class="table-input s-level" value="${data.level || ''}">
                    <div class="validation-msg">Cannot be less than previous</div>
                </div>
                <div class="card-field w-20">
                    <label class="field-label">XP Earned</label>
                    <input type="text" class="table-input readonly-result s-xp" readonly placeholder="Auto">
                </div>
                <div class="card-field w-30">
                    <label class="field-label">Gold Rewarded <span title="Gold reward should be appropriate and not always be max allowed" style="cursor:help; font-size:0.8em;">ⓘ</span></label>
                    <input type="text" class="table-input s-gold" value="${data.gold || ''}" placeholder="GP">
                    <div class="validation-msg">Max <span class="val-max-msg"></span>gp</div>
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
                    <label class="field-label">Character Outcomes / Notes <span title="Optional - record any character outcomes that persist outside of the game/session" style="cursor:help; font-size:0.8em;">ⓘ</span></label>
                    <textarea class="table-input s-notes" rows="1" placeholder="">${data.notes || ''}</textarea>
                </div>
            </div>
        </div>
    `;

    // Listeners
    card.querySelector('.btn-delete-card').addEventListener('click', () => {
        card.remove();
        renumberCards(listContainer);
        if(callbacks.onUpdate) callbacks.onUpdate(viewContext);
    });

    ['.s-hours', '.s-level', '.s-games', '.s-gold'].forEach(cls => {
        card.querySelector(cls).addEventListener('input', () => {
            if(callbacks.onUpdate) callbacks.onUpdate(viewContext);
        });
    });
    
    const btnIncentives = card.querySelector('.s-incentives-btn');
    btnIncentives.addEventListener('click', () => {
        if(callbacks.onOpenModal) callbacks.onOpenModal(btnIncentives, viewContext, false);
    });

    listContainer.appendChild(card);
    
    if(callbacks.onUpdate) callbacks.onUpdate(viewContext);
}

function renumberCards(container) {
    const titles = container.querySelectorAll('.player-card-title');
    titles.forEach((span, index) => {
        span.textContent = `Player ${index + 1}`;
    });
}

export function getSessionRosterData(viewElement) {
    const cards = viewElement.querySelectorAll('.player-card');
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

/* ===========================
   3. SYNCING LOGIC
   =========================== */
export function syncSessionPlayers(viewElement, sessionIndex, callbacks) {
    const listContainer = viewElement.querySelector('.player-roster-list');
    listContainer.innerHTML = ''; 

    let sourceData = [];

    if (sessionIndex === 1) {
        sourceData = getMasterRosterData(); 
    } else {
        const prevView = document.getElementById(`view-session-${sessionIndex - 1}`);
        if(prevView) {
            sourceData = getSessionRosterData(prevView);
        }
    }

    sourceData.forEach(p => {
        let nextGames = "1";
        const currentGames = p.games_count;

        if (currentGames === "10+") {
            nextGames = "10+";
        } else {
            const g = parseInt(currentGames) || 0;
            if (g >= 9) nextGames = "10"; 
            nextGames = (g + 1).toString();
            if (g >= 10) nextGames = "10+";
        }

        const newRowData = {
            discord_id: p.discord_id,
            character_name: p.character_name,
            level: p.level,
            games_count: nextGames,
            loot: "",
            gold: "",
            items_used: "",
            notes: ""
        };
        addSessionPlayerRow(listContainer, newRowData, callbacks);
    });
}

export function syncDMRewards(viewElement, sessionIndex, callbacks) {
    const masterName = document.getElementById('inp-dm-char-name').value;
    const dmNameEl = viewElement.querySelector('.dm-name');
    if(dmNameEl) dmNameEl.value = masterName;

    let level = "";
    let games = "";

    if (sessionIndex === 1) {
        level = document.getElementById('inp-dm-level').value;
        const gRaw = document.getElementById('inp-dm-games-count').value; 
        if (gRaw === "10+") games = "10+";
        else {
            let g = parseInt(gRaw) || 0;
            g += 1;
            games = (g >= 10) ? "10" : g.toString(); 
        }
    } else {
        const prevView = document.getElementById(`view-session-${sessionIndex - 1}`);
        if (prevView) {
            level = prevView.querySelector('.dm-level').value; 
            const prevGames = prevView.querySelector('.dm-games').value;
            if (prevGames === "10+") games = "10+";
            else {
                let g = parseInt(prevGames) || 0;
                g += 1;
                games = (g >= 10) ? "10" : g.toString();
            }
        }
    }

    viewElement.querySelector('.dm-level').value = level;
    viewElement.querySelector('.dm-games').value = games;

    if(callbacks.onUpdate) callbacks.onUpdate(viewElement);
}