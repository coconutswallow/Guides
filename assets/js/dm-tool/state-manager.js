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

        this.dom = {};
        this.debounceTimers = {
            calculations: null,
            lootDeclaration: null,
            outputs: null,
            dmLoot: null
        };
        this.updateCallbacks = {
            calculations: [],
            lootDeclaration: [],
            outputs: [],
            dmLoot: [],
            all: []
        };
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
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
        this.dom.description = document.getElementById('inp-game-desc'); // FIXED ID
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
        
        // Setup Tab - Details (FIXED IDs to match HTML/Session-Editor)
        this.dom.houseRules = document.getElementById('inp-house-rules'); 
        this.dom.notes = document.getElementById('inp-setup-notes'); 
        this.dom.warnings = document.getElementById('inp-content-warnings'); 
        this.dom.howToApply = document.getElementById('inp-how-to-apply'); 
        
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
        
        // DM Rewards
        this.dom.dmForfeitXp = document.getElementById('chk-dm-forfeit-xp');
        this.dom.dmLootSelected = document.getElementById('dm-loot-selected');
        this.dom.btnDmIncentives = document.getElementById('btn-dm-loot-incentives');
        
        // Outputs
        this.dom.outListing = document.getElementById('out-listing-text');
        this.dom.outAd = document.getElementById('out-ad-text');
        this.dom.outSession = document.getElementById('out-session-text');
        this.dom.outSummary = document.getElementById('out-summary-text');
        this.dom.outMAL = document.getElementById('out-mal-update');
    }

    attachDOMListeners() {
        // --- 1. Header & Text Inputs ---
        const textInputs = [
            { el: this.dom.gameName, sect: 'header', field: 'title', update: ['outputs', 'lootDeclaration'] },
            { el: this.dom.lobbyUrl, sect: 'header', field: 'lobby_url', update: ['outputs'] },
            { el: this.dom.listingUrl, sect: 'header', field: 'listing_url', update: ['outputs'] },
            { el: this.dom.dmCharName, sect: 'dm', field: 'character_name', update: ['outputs', 'dmLoot'] },
            { el: this.dom.lootPlan, sect: 'header', field: 'loot_plan', update: ['lootDeclaration'] },
            // Add missing Setup text areas
            { el: this.dom.houseRules, sect: 'header', field: 'house_rules', update: ['outputs'] },
            { el: this.dom.notes, sect: 'header', field: 'notes', update: ['outputs'] },
            { el: this.dom.warnings, sect: 'header', field: 'warnings', update: ['outputs'] },
            { el: this.dom.howToApply, sect: 'header', field: 'how_to_apply', update: ['outputs'] },
            { el: this.dom.description, sect: 'header', field: 'game_description', update: ['outputs'] },
            // Session Log Inputs
            { el: this.dom.sessionNotes, sect: 'session_log', field: 'notes', update: ['outputs'] },
            { el: this.dom.dmCollab, sect: 'session_log', field: 'dm_collaborators', update: ['outputs'] }
        ];

        textInputs.forEach(item => {
            if (item.el) {
                item.el.addEventListener('input', (e) => {
                    this.updateField(item.sect, item.field, e.target.value);
                    if (item.update) item.update.forEach(u => this.scheduleUpdate(u));
                });
            }
        });

        // --- 2. Multi-Selects (Tier, Events) ---
        if (this.dom.tierSelect) {
            this.dom.tierSelect.addEventListener('change', () => {
                const selected = Array.from(this.dom.tierSelect.selectedOptions).map(opt => opt.value);
                this.updateField('header', 'tier', selected);
                this.scheduleUpdate('outputs');
                this.scheduleUpdate('lootDeclaration'); // Updates "Trial/Full DM" instructions
            });
        }

        if (this.dom.eventSelect) {
            this.dom.eventSelect.addEventListener('change', () => {
                const selected = Array.from(this.dom.eventSelect.selectedOptions).map(opt => opt.value);
                this.updateField('header', 'event_tags', selected);
                this.scheduleUpdate('outputs');
            });
        }

        // --- 3. Numeric / Special Inputs ---
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

        if (this.dom.dmLootSelected) {
            this.dom.dmLootSelected.addEventListener('input', (e) => {
                this.updateField('session_log.dm_rewards', 'loot_selected', e.target.value);
            });
        }
        if (this.dom.tierSelect) {
            this.dom.tierSelect.addEventListener('change', () => {
                const selected = Array.from(this.dom.tierSelect.selectedOptions).map(opt => opt.value);
                this.updateField('header', 'tier', selected);
                this.scheduleUpdate('outputs');
                this.scheduleUpdate('lootDeclaration'); 
            });
        }
    }

    /**
     * STATE GETTERS
     */
    getFullState() { return JSON.parse(JSON.stringify(this.state)); }
    getHeader() { return { ...this.state.header }; }
    getPlayers() { return [...this.state.players]; }
    getDM() { return { ...this.state.dm }; }
    getSessionLog() { return JSON.parse(JSON.stringify(this.state.session_log)); }
    
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

        return { partySize: this.state.players.length, apl, tier, playerCount };
    }
    
    getPlayerStats() {
        let newHires = 0;
        let welcomeWagon = 0;

        this.state.players.forEach(player => {
            const gamesVal = String(player.games_count);
            // Check specifically for "1"
            if (gamesVal === "1") {
                welcomeWagon++;
            }
            // Check specifically for not "10+" and <= 10
            if (gamesVal !== "10+") {
                const n = parseInt(gamesVal);
                if(!isNaN(n) && n <= 10) newHires++;
            }
        });

        return { newHires, welcomeWagon };
    }

    /**
     * STATE SETTERS
     */
    updateField(section, field, value) {
        if (section.includes('.')) {
            const parts = section.split('.');
            let target = this.state;
            for (let i = 0; i < parts.length - 1; i++) target = target[parts[i]];
            target[parts[parts.length - 1]][field] = value;
        } else {
            this.state[section][field] = value;
        }
        
        // Sync to DOM
        const domKey = this.getDOMKeyForField(section, field);
        if (domKey && this.dom[domKey]) {
            if (this.dom[domKey].value !== value) {
                this.dom[domKey].value = value;
            }
        }
        
        this.scheduleUpdate('calculations');
        
        if (section === 'header' && ['title', 'loot_plan'].includes(field)) this.scheduleUpdate('lootDeclaration');
        if (section === 'dm' || ['predet_perms', 'predet_cons'].includes(field)) this.scheduleUpdate('dmLoot');
    }
    
    updatePlayer(index, field, value) {
        if (!this.state.players[index]) return;
        this.state.players[index][field] = value;
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

    /**
     * BULK OPERATIONS
     */
    loadFromDB(sessionData) {
        if (!sessionData.form_data) return;
        if (sessionData.form_data.header) Object.assign(this.state.header, sessionData.form_data.header);
        if (sessionData.form_data.players) this.state.players = [...sessionData.form_data.players];
        if (sessionData.form_data.dm) Object.assign(this.state.dm, sessionData.form_data.dm);
        if (sessionData.form_data.session_log) Object.assign(this.state.session_log, sessionData.form_data.session_log);
        
        this.syncAllToDOM();
        this.triggerAllUpdates();
    }
    
    syncAllToDOM() {
        // Text Fields
        const fields = [
            { el: this.dom.gameName, val: this.state.header.title },
            { el: this.dom.startDateTime, val: this.unixToLocalISO(this.state.header.game_datetime, this.state.header.timezone) },
            { el: this.dom.timezone, val: this.state.header.timezone },
            { el: this.dom.durationText, val: this.state.header.intended_duration },
            { el: this.dom.description, val: this.state.header.game_description },
            { el: this.dom.format, val: this.state.header.game_type },
            { el: this.dom.version, val: this.state.header.game_version },
            { el: this.dom.appsType, val: this.state.header.apps_type },
            { el: this.dom.platform, val: this.state.header.platform },
            { el: this.dom.apl, val: this.state.header.apl },
            { el: this.dom.partySize, val: this.state.header.party_size },
            { el: this.dom.listingUrl, val: this.state.header.listing_url },
            { el: this.dom.lobbyUrl, val: this.state.header.lobby_url },
            { el: this.dom.lootPlan, val: this.state.header.loot_plan },
            { el: this.dom.dmCharName, val: this.state.dm.character_name },
            { el: this.dom.dmLevel, val: this.state.dm.level },
            { el: this.dom.dmGamesCount, val: this.state.dm.games_count },
            { el: this.dom.predetPerms, val: this.state.header.predet_perms },
            { el: this.dom.predetCons, val: this.state.header.predet_cons }
        ];

        fields.forEach(f => { if(f.el) f.el.value = f.val || ''; });

        // Multi-selects
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
        
        if (this.dom.btnDmIncentives) {
            const incentives = this.state.session_log.dm_rewards.incentives || [];
            this.dom.btnDmIncentives.dataset.incentives = JSON.stringify(incentives);
        }
    }

    /**
     * UPDATE SCHEDULING
     */
    scheduleUpdate(updateType) {
        if (this.debounceTimers[updateType]) clearTimeout(this.debounceTimers[updateType]);
        this.debounceTimers[updateType] = setTimeout(() => {
            this.executeUpdate(updateType);
            this.debounceTimers[updateType] = null;
        }, 100);
    }
    
    executeUpdate(updateType) {
        (this.updateCallbacks[updateType] || []).forEach(cb => { try { cb(this); } catch (e) { console.error(e); } });
        (this.updateCallbacks.all || []).forEach(cb => { try { cb(this, updateType); } catch (e) { console.error(e); } });
    }
    
    triggerAllUpdates() {
        ['calculations', 'lootDeclaration', 'outputs', 'dmLoot'].forEach(t => this.executeUpdate(t));
    }
    
    onUpdate(updateType, callback) {
        if (this.updateCallbacks[updateType]) this.updateCallbacks[updateType].push(callback);
    }
    
    getDOMKeyForField(section, field) {
        const mapping = {
            'header.title': 'gameName',
            'header.intended_duration': 'durationText',
            'header.loot_plan': 'lootPlan',
            'header.game_description': 'description',
            'header.house_rules': 'houseRules',
            'header.notes': 'notes',
            'header.warnings': 'warnings',
            'header.how_to_apply': 'howToApply',
            'header.listing_url': 'listingUrl',
            'header.lobby_url': 'lobbyUrl',
            'dm.character_name': 'dmCharName',
            'dm.level': 'dmLevel',
            'dm.games_count': 'dmGamesCount',
            'session_log.hours': 'sessionHours',
            'session_log.notes': 'sessionNotes',
            'session_log.dm_collaborators': 'dmCollab',
            'session_log.dm_rewards.loot_selected': 'dmLootSelected'
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
        } catch(e) { return ""; }
    }
}

export const stateManager = new StateManager();