// assets/js/dm-tool/state-manager.js
/**
 * STATE MANAGER - Complete Rewrite
 * FIXES:
 * - Fixed duplicate getPlayerStats() method
 * - Properly sync forfeit_xp to session players
 * - Fixed new hires logic (should count players who aren't 10+)
 */

class StateManager {
    constructor() {
        // Internal state storage
        this.state = {
            header: {
                title: '',
                game_datetime: null,
                timezone: '',
                intended_duration: '',
                game_description: '',
                game_version: '',
                game_type: '',
                apps_type: '',
                platform: '',
                event_tags: [],
                tier: [],
                apl: '',
                party_size: '',
                tone: '',
                focus: '',
                encounter_difficulty: '',
                threat_level: '',
                char_loss: '',
                house_rules: '',
                notes: '',
                warnings: '',
                how_to_apply: '',
                listing_url: '',
                lobby_url: '',
                loot_plan: '',
                predet_perms: 0,
                predet_cons: 0
            },
            players: [],
            dm: {
                character_name: '',
                level: 0,
                games_count: '1'
            },
            session_log: {
                title: '',
                date_time: null,
                hours: 3,
                notes: '',
                summary: '',
                dm_collaborators: '',
                players: [],
                dm_rewards: {
                    level: 0,
                    games_played: '0',
                    incentives: [],
                    loot_selected: '',
                    forfeit_xp: false
                }
            }
        };

        // DOM element cache
        this.dom = {};
        
        // Debounce timers (per update type)
        this.debounceTimers = {
            calculations: null,
            lootDeclaration: null,
            outputs: null,
            dmLoot: null
        };
        
        // Update callbacks
        this.updateCallbacks = {
            calculations: [],
            lootDeclaration: [],
            outputs: [],
            dmLoot: [],
            all: []
        };
        
        // Flags
        this.initialized = false;
    }

    init() {
        if (this.initialized) {
            console.warn('State manager already initialized');
            return;
        }

        this.cacheDOMElements();
        this.attachDOMListeners();
        this.initialized = true;
        console.log('✓ State Manager Initialized');
    }

    cacheDOMElements() {
        // Header
        this.dom.gameName = document.getElementById('header-game-name');
        
        // Setup Tab - Game Details
        this.dom.startDateTime = document.getElementById('inp-start-datetime');
        this.dom.timezone = document.getElementById('inp-timezone');
        this.dom.unixTime = document.getElementById('inp-unix-time');
        this.dom.durationText = document.getElementById('inp-duration-text');
        this.dom.description = document.getElementById('inp-description');
        this.dom.format = document.getElementById('inp-format');
        this.dom.version = document.getElementById('inp-version');
        this.dom.appsType = document.getElementById('inp-apps-type');
        this.dom.platform = document.getElementById('inp-platform');
        this.dom.eventSelect = document.getElementById('inp-event');
        
        // Setup Tab - Party Config
        this.dom.tierSelect = document.getElementById('inp-tier');
        this.dom.apl = document.getElementById('inp-apl');
        this.dom.partySize = document.getElementById('inp-party-size');
        
        // Setup Tab - Tone & Difficulty
        this.dom.tone = document.getElementById('inp-tone');
        this.dom.focus = document.getElementById('inp-focus');
        this.dom.diffEncounter = document.getElementById('inp-diff-encounter');
        this.dom.diffThreat = document.getElementById('inp-diff-threat');
        this.dom.diffLoss = document.getElementById('inp-diff-loss');
        
        // Setup Tab - Details
        this.dom.houseRules = document.getElementById('inp-houserules');
        this.dom.notes = document.getElementById('inp-notes');
        this.dom.warnings = document.getElementById('inp-warnings');
        this.dom.howToApply = document.getElementById('inp-apply');
        
        // Game Listing Tab
        this.dom.listingUrl = document.getElementById('inp-listing-url');
        this.dom.lobbyUrl = document.getElementById('inp-lobby-url');
        
        // Loot Plan Tab
        this.dom.lootPlan = document.getElementById('inp-loot-plan');
        this.dom.predetPerms = document.getElementById('inp-predet-perms');
        this.dom.predetCons = document.getElementById('inp-predet-cons');
        
        // Player Setup Tab
        this.dom.rosterBody = document.getElementById('roster-body');
        this.dom.dmCharName = document.getElementById('inp-dm-char-name');
        this.dom.dmLevel = document.getElementById('inp-dm-level');
        this.dom.dmGamesCount = document.getElementById('inp-dm-games-count');
        
        // Session Details Tab
        this.dom.sessionHours = document.getElementById('inp-session-total-hours');
        this.dom.sessionDate = document.getElementById('inp-session-date');
        this.dom.sessionUnix = document.getElementById('inp-session-unix');
        this.dom.sessionNotes = document.getElementById('inp-session-notes');
        this.dom.sessionSummary = document.getElementById('inp-session-summary');
        this.dom.dmCollab = document.getElementById('inp-dm-collab');
        this.dom.sessionRosterList = document.getElementById('session-roster-list');
        
        // Stats Displays
        this.dom.setupPartySize = document.getElementById('setup-val-party-size');
        this.dom.setupApl = document.getElementById('setup-val-apl');
        this.dom.setupTier = document.getElementById('setup-val-tier');
        
        // DM Rewards
        this.dom.dmForfeitXp = document.getElementById('chk-dm-forfeit-xp');
        this.dom.dmLootSelected = document.getElementById('dm-loot-selected');
        this.dom.btnDmIncentives = document.getElementById('btn-dm-loot-incentives');
        
        // Hidden DM fields
        this.dom.outDmName = document.getElementById('out-dm-name');
        this.dom.outDmLevel = document.getElementById('out-dm-level');
        this.dom.outDmGames = document.getElementById('out-dm-games');
        
        // Output fields
        this.dom.outListing = document.getElementById('out-listing-text');
        this.dom.outAd = document.getElementById('out-ad-text');
        this.dom.outSession = document.getElementById('out-session-text');
        this.dom.outSummary = document.getElementById('out-summary-text');
        this.dom.secondaryWrapper = document.getElementById('secondary-output-wrapper');
        this.dom.outLootDeclaration = document.getElementById('out-loot-declaration');
        this.dom.outHgenDeclaration = document.getElementById('out-hgen-declaration');
        this.dom.outHgenCommand = document.getElementById('out-hgen-command');
        this.dom.outDmLootDecl = document.getElementById('out-dm-loot-decl');
        this.dom.outDmLootCmd = document.getElementById('out-dm-loot-cmd');
        this.dom.outMAL = document.getElementById('out-mal-update');
    }

    attachDOMListeners() {
        if (this.dom.gameName) {
            this.dom.gameName.addEventListener('input', (e) => {
                this.updateField('header', 'title', e.target.value);
            });
        }

        if (this.dom.dmCharName) {
            this.dom.dmCharName.addEventListener('input', (e) => {
                this.updateField('dm', 'character_name', e.target.value);
            });
        }
            
        if (this.dom.sessionHours) {
            this.dom.sessionHours.addEventListener('input', (e) => {
                this.updateField('session_log', 'hours', parseFloat(e.target.value) || 3);
            });
        }
        
        if (this.dom.dmLevel) {
            this.dom.dmLevel.addEventListener('input', (e) => {
                this.updateField('dm', 'level', e.target.value);
            });
        }
        
        if (this.dom.dmGamesCount) {
            this.dom.dmGamesCount.addEventListener('change', (e) => {
                this.updateField('dm', 'games_count', e.target.value);
            });
        }

        if (this.dom.lootPlan) {
            this.dom.lootPlan.addEventListener('input', (e) => {
                this.updateField('header', 'loot_plan', e.target.value);
            });
        }

        if (this.dom.predetPerms) {
            this.dom.predetPerms.addEventListener('input', (e) => {
                this.updateField('header', 'predet_perms', parseInt(e.target.value) || 0);
            });
        }
        
        if (this.dom.predetCons) {
            this.dom.predetCons.addEventListener('input', (e) => {
                this.updateField('header', 'predet_cons', parseInt(e.target.value) || 0);
            });
        }

        if (this.dom.lobbyUrl) {
            this.dom.lobbyUrl.addEventListener('input', (e) => {
                this.updateField('header', 'lobby_url', e.target.value);
                this.scheduleUpdate('outputs');
            });
        }

        if (this.dom.listingUrl) {
            this.dom.listingUrl.addEventListener('input', (e) => {
                this.updateField('header', 'listing_url', e.target.value);
                this.scheduleUpdate('outputs');
            });
        }

        if (this.dom.tierSelect) {
            this.dom.tierSelect.addEventListener('change', (e) => {
                const selected = Array.from(e.target.selectedOptions).map(opt => opt.value);
                this.state.header.tier = selected;
                this.scheduleUpdate('calculations');
                this.scheduleUpdate('outputs');
            });
        }

        if (this.dom.eventSelect) {
            this.dom.eventSelect.addEventListener('change', (e) => {
                const selected = Array.from(e.target.selectedOptions).map(opt => opt.value);
                this.state.header.event_tags = selected;
                this.scheduleUpdate('outputs');
            });
        }

        if (this.dom.dmLootSelected) {
            this.dom.dmLootSelected.addEventListener('input', (e) => {
                this.updateField('session_log.dm_rewards', 'loot_selected', e.target.value);
            });
        }

        // FIX: Add DM forfeit XP listener
        if (this.dom.dmForfeitXp) {
            this.dom.dmForfeitXp.addEventListener('change', (e) => {
                this.updateField('session_log.dm_rewards', 'forfeit_xp', e.target.checked);
                this.scheduleUpdate('calculations');
            });
        }
    }

    getFullState() {
        return JSON.parse(JSON.stringify(this.state));
    }
    
    getHeader() {
        return { ...this.state.header };
    }
    
    getPlayers() {
        return [...this.state.players];
    }
    
    getDM() {
        return { ...this.state.dm };
    }
    
    getSessionLog() {
        return JSON.parse(JSON.stringify(this.state.session_log));
    }
    
    getStats() {
        let totalLevel = 0;
        let playerCount = 0;

        this.state.players.forEach(player => {
            const effectiveLevel = parseFloat(player.level_playing_as || player.level) || 0;
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

        return {
            partySize: this.state.players.length,
            apl,
            tier,
            playerCount
        };
    }
    
    // FIX: Corrected getPlayerStats - removed duplicate, fixed new hires logic
    getPlayerStats() {
        let newHires = 0;
        let welcomeWagon = 0;

        this.state.players.forEach(player => {
            const gamesVal = String(player.games_count);

            // Welcome Wagon: games played = 1
            if (gamesVal === "1") {
                welcomeWagon++;
            }

            // New Hires: games played <> 10+ (all players who haven't maxed out)
            if (gamesVal !== "10+") {
                const num = parseInt(gamesVal);
                if (!isNaN(num) && num >= 1 && num <= 10) {
                    newHires++;
                }
            }
        });

        return { newHires, welcomeWagon };
    }

    updateField(section, field, value) {
        // Handle nested paths (e.g., 'session_log.dm_rewards')
        if (section.includes('.')) {
            const parts = section.split('.');
            let target = this.state;
            
            // Navigate to nested object
            for (let i = 0; i < parts.length - 1; i++) {
                if (!target[parts[i]]) {
                    console.warn(`Invalid state path: ${section}`);
                    return;
                }
                target = target[parts[i]];
            }
            
            const lastKey = parts[parts.length - 1];
            if (!target[lastKey]) {
                console.warn(`Unknown state section: ${section}`);
                return;
            }
            
            // Update the nested field
            target[lastKey][field] = value;
        } else {
            // Original logic for top-level sections
            if (!this.state[section]) {
                console.warn(`Unknown state section: ${section}`);
                return;
            }
            
            this.state[section][field] = value;
        }
        
        // Sync to DOM if element exists
        const domKey = this.getDOMKeyForField(section, field);
        if (domKey && this.dom[domKey]) {
            if (this.dom[domKey].value !== value) {
                this.dom[domKey].value = value;
            }
        }
        
        // Trigger appropriate updates
        this.scheduleUpdate('calculations');
        
        // Specific field triggers
        if (section === 'header' && ['title', 'loot_plan'].includes(field)) {
            this.scheduleUpdate('lootDeclaration');
        }
        
        if (section === 'dm' || (section === 'header' && ['predet_perms', 'predet_cons'].includes(field))) {
            this.scheduleUpdate('dmLoot');
        }
    }
    
    updatePlayer(index, field, value) {
        if (!this.state.players[index]) {
            console.warn(`Player index ${index} does not exist`);
            return;
        }
        
        this.state.players[index][field] = value;
        
        // Update DOM row if it exists
        const rows = this.dom.rosterBody?.querySelectorAll('.player-row');
        if (rows && rows[index]) {
            const input = rows[index].querySelector(`.inp-${field}`);
            if (input && input.value !== value) {
                input.value = value;
            }
        }
        
        this.scheduleUpdate('calculations');
        this.scheduleUpdate('dmLoot');
    }
    
    addPlayer(playerData) {
        this.state.players.push(playerData);
        this.scheduleUpdate('calculations');
    }
    
    removePlayer(index) {
        this.state.players.splice(index, 1);
        this.scheduleUpdate('calculations');
    }
    
    updateSessionPlayer(index, field, value) {
        if (!this.state.session_log.players[index]) {
            console.warn(`Session player index ${index} does not exist`);
            return;
        }
        
        this.state.session_log.players[index][field] = value;
        
        // Update DOM card if it exists
        const cards = this.dom.sessionRosterList?.querySelectorAll('.player-card');
        if (cards && cards[index]) {
            const input = cards[index].querySelector(`.s-${field}`);
            if (input) {
                if (input.type === 'checkbox') {
                    input.checked = value;
                } else if (input.value !== value) {
                    input.value = value;
                }
            }
        }
        
        this.scheduleUpdate('calculations');
    }

    loadFromDB(sessionData) {
        if (!sessionData.form_data) return;
        
        // Load all sections
        if (sessionData.form_data.header) {
            Object.assign(this.state.header, sessionData.form_data.header);
        }
        if (sessionData.form_data.players) {
            this.state.players = [...sessionData.form_data.players];
        }
        if (sessionData.form_data.dm) {
            Object.assign(this.state.dm, sessionData.form_data.dm);
        }
        if (sessionData.form_data.session_log) {
            Object.assign(this.state.session_log, sessionData.form_data.session_log);
        }
        
        // Sync all to DOM
        this.syncAllToDOM();
        
        // Trigger full recalculation
        this.triggerAllUpdates();
    }
    
    syncAllToDOM() {
        // Header fields
        if (this.dom.gameName) this.dom.gameName.value = this.state.header.title || '';
        if (this.dom.startDateTime) this.dom.startDateTime.value = this.unixToLocalISO(this.state.header.game_datetime, this.state.header.timezone) || '';
        if (this.dom.timezone) this.dom.timezone.value = this.state.header.timezone || '';
        if (this.dom.durationText) this.dom.durationText.value = this.state.header.intended_duration || '';
        if (this.dom.description) this.dom.description.value = this.state.header.game_description || '';
        if (this.dom.format) this.dom.format.value = this.state.header.game_type || '';
        if (this.dom.version) this.dom.version.value = this.state.header.game_version || '';
        if (this.dom.appsType) this.dom.appsType.value = this.state.header.apps_type || '';
        if (this.dom.platform) this.dom.platform.value = this.state.header.platform || '';
        if (this.dom.apl) this.dom.apl.value = this.state.header.apl || '';
        if (this.dom.partySize) this.dom.partySize.value = this.state.header.party_size || '';
        if (this.dom.tone) this.dom.tone.value = this.state.header.tone || '';
        if (this.dom.focus) this.dom.focus.value = this.state.header.focus || '';
        if (this.dom.diffEncounter) this.dom.diffEncounter.value = this.state.header.encounter_difficulty || '';
        if (this.dom.diffThreat) this.dom.diffThreat.value = this.state.header.threat_level || '';
        if (this.dom.diffLoss) this.dom.diffLoss.value = this.state.header.char_loss || '';
        if (this.dom.listingUrl) this.dom.listingUrl.value = this.state.header.listing_url || '';
        if (this.dom.lobbyUrl) this.dom.lobbyUrl.value = this.state.header.lobby_url || '';
        if (this.dom.lootPlan) this.dom.lootPlan.value = this.state.header.loot_plan || '';
        
        // DM fields
        if (this.dom.dmCharName) this.dom.dmCharName.value = this.state.dm.character_name || '';
        if (this.dom.dmLevel) this.dom.dmLevel.value = this.state.dm.level || '';
        if (this.dom.dmGamesCount) this.dom.dmGamesCount.value = this.state.dm.games_count || '1';
        
        // Session fields
        if (this.dom.sessionHours) this.dom.sessionHours.value = this.state.session_log.hours || 3;
        if (this.dom.sessionNotes) this.dom.sessionNotes.value = this.state.session_log.notes || '';
        if (this.dom.sessionSummary) this.dom.sessionSummary.value = this.state.session_log.summary || '';

        // Loot Plan fields
        if (this.dom.lootPlan) this.dom.lootPlan.value = this.state.header.loot_plan || '';
        if (this.dom.predetPerms) this.dom.predetPerms.value = this.state.header.predet_perms || 0;
        if (this.dom.predetCons) this.dom.predetCons.value = this.state.header.predet_cons || 0;
        if (this.dom.dmLootSelected) this.dom.dmLootSelected.value = this.state.session_log.dm_rewards.loot_selected || '';
        
        // FIX: Sync DM forfeit XP checkbox
        if (this.dom.dmForfeitXp) {
            this.dom.dmForfeitXp.checked = this.state.session_log.dm_rewards.forfeit_xp || false;
        }
        
        // Also sync DM incentives button
        if (this.dom.btnDmIncentives) {
            const incentives = this.state.session_log.dm_rewards.incentives || [];
            this.dom.btnDmIncentives.dataset.incentives = JSON.stringify(incentives);
        }
            
        // Multi-select fields require special handling
        if (this.dom.tierSelect && Array.isArray(this.state.header.tier)) {
            Array.from(this.dom.tierSelect.options).forEach(opt => {
                opt.selected = this.state.header.tier.includes(opt.value);
            });
        }
        
        if (this.dom.eventSelect && Array.isArray(this.state.header.event_tags)) {
            Array.from(this.dom.eventSelect.options).forEach(opt => {
                opt.selected = this.state.header.event_tags.includes(opt.value);
            });
        }
    }

    scheduleUpdate(updateType) {
        // Clear existing timer for this type
        if (this.debounceTimers[updateType]) {
            clearTimeout(this.debounceTimers[updateType]);
        }
        
        // Schedule new update
        this.debounceTimers[updateType] = setTimeout(() => {
            this.executeUpdate(updateType);
            this.debounceTimers[updateType] = null;
        }, 100); // 100ms debounce
    }
    
    executeUpdate(updateType) {
        // Execute all callbacks registered for this update type
        const callbacks = this.updateCallbacks[updateType] || [];
        callbacks.forEach(cb => {
            try {
                cb(this);
            } catch (err) {
                console.error(`Update callback error (${updateType}):`, err);
            }
        });
        
        // Also execute 'all' callbacks
        this.updateCallbacks.all.forEach(cb => {
            try {
                cb(this, updateType);
            } catch (err) {
                console.error(`Global update callback error:`, err);
            }
        });
    }
    
    triggerAllUpdates() {
        this.executeUpdate('calculations');
        this.executeUpdate('lootDeclaration');
        this.executeUpdate('outputs');
        this.executeUpdate('dmLoot');
    }
    
    onUpdate(updateType, callback) {
        if (!this.updateCallbacks[updateType]) {
            console.warn(`Unknown update type: ${updateType}`);
            return;
        }
        this.updateCallbacks[updateType].push(callback);
    }
    
    getDOMKeyForField(section, field) {
        // Map state fields to DOM cache keys
        const mapping = {
            'header.title': 'gameName',
            'header.intended_duration': 'durationText',
            'header.loot_plan': 'lootPlan',
            'header.predet_perms': 'predetPerms',
            'header.predet_cons': 'predetCons',
            'dm.character_name': 'dmCharName',
            'dm.level': 'dmLevel',
            'dm.games_count': 'dmGamesCount',
            'session_log.hours': 'sessionHours',
            'session_log.notes': 'sessionNotes',
            'session_log.dm_rewards.loot_selected': 'dmLootSelected',
            'session_log.dm_rewards.forfeit_xp': 'dmForfeitXp'
        };
        
        return mapping[`${section}.${field}`];
    }
    
    unixToLocalISO(unixSeconds, timeZone) {
        if (!unixSeconds) return '';
        
        try {
            const date = new Date(unixSeconds * 1000);
            const fmt = new Intl.DateTimeFormat('en-CA', {
                timeZone: timeZone,
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', hour12: false
            });
            const parts = fmt.formatToParts(date);
            const get = (t) => parts.find(p => p.type === t).value;
            return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
        } catch(e) {
            console.error("Date conversion error", e);
            return "";
        }
    }
}

// Export singleton instance
export const stateManager = new StateManager();