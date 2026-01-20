// assets/js/dm-tool/state-manager.js

/**
 * @file state-manager.js
 * @description Centralized State Management for the DM Tool.
 * This class acts as the "Single Source of Truth" for the application. It manages:
 * 1. The internal data model (State).
 * 2. Caching of DOM elements for performance.
 * 3. Event listeners that bind DOM inputs to State updates.
 * 4. A Pub/Sub (Observer) system to trigger UI updates when state changes.
 * @module StateManager
 */

class StateManager {
    /**
     * Initializes the State Manager.
     * Sets up the default empty state structure matching the form requirements.
     */
    constructor() {
        // Internal state storage
        // This structure mirrors the database schema and form requirements.
        this.state = {
            // 1. Game Metadata (Planning Phase)
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
            // 2. Roster Data
            players: [],
            // 3. DM Details
            dm: {
                character_name: '',
                level: 0,
                games_count: '1'
            },
            // 4. Session Logs (Post-Game Phase)
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

        this.dom = {}; // Cache for DOM elements
        this.debounceTimers = {}; // Timers for debouncing updates
        // Subscription channels for different types of updates
        this.updateCallbacks = { calculations: [], lootDeclaration: [], outputs: [], dmLoot: [], all: [] };
        this.initialized = false;
    }

    /**
     * Entry point for the State Manager.
     * Ensures initialization happens only once.
     */
    init() {
        if (this.initialized) return;
        this.cacheDOMElements();
        this.attachDOMListeners();
        this.initialized = true;
        console.log('✓ State Manager Initialized');
    }

    /**
     * Caches references to DOM elements to avoid repeated `document.getElementById` calls.
     * Stores references in `this.dom`.
     */
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
        
        // Setup Tab - Details (FIXED IDs to match session.html)
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
        this.dom.sessionSummary = document.getElementById('session-summary'); // FIXED ID
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

    /**
     * Attaches event listeners to cached DOM elements.
     * When inputs change, it updates the State and triggers relevant callbacks.
     * Uses a mapping array to handle repetitive text input logic cleanly.
     */
    attachDOMListeners() {
        const textInputs = [
            { el: this.dom.gameName, sect: 'header', field: 'title', update: ['outputs', 'lootDeclaration'] },
            { el: this.dom.lobbyUrl, sect: 'header', field: 'lobby_url', update: ['outputs'] },
            { el: this.dom.listingUrl, sect: 'header', field: 'listing_url', update: ['outputs'] },
            { el: this.dom.dmCharName, sect: 'dm', field: 'character_name', update: ['outputs', 'dmLoot'] },
            { el: this.dom.lootPlan, sect: 'header', field: 'loot_plan', update: ['lootDeclaration'] },
            // Setup Tab text areas
            { el: this.dom.houseRules, sect: 'header', field: 'house_rules', update: ['outputs'] },
            { el: this.dom.notes, sect: 'header', field: 'notes', update: ['outputs'] },
            { el: this.dom.warnings, sect: 'header', field: 'warnings', update: ['outputs'] },
            { el: this.dom.howToApply, sect: 'header', field: 'how_to_apply', update: ['outputs'] },
            { el: this.dom.description, sect: 'header', field: 'game_description', update: ['outputs'] },
            { el: this.dom.apl, sect: 'header', field: 'apl', update: ['outputs'] },
            { el: this.dom.partySize, sect: 'header', field: 'party_size', update: ['outputs'] },
            // Session Log Inputs
            { el: this.dom.sessionNotes, sect: 'session_log', field: 'notes', update: ['outputs'] },
            { el: this.dom.dmCollab, sect: 'session_log', field: 'dm_collaborators', update: ['outputs'] },
            { el: this.dom.sessionSummary, sect: 'session_log', field: 'summary', update: ['outputs'] }
        ];

        textInputs.forEach(item => {
            if (item.el) {
                item.el.addEventListener('input', (e) => {
                    this.updateField(item.sect, item.field, e.target.value);
                    if (item.update) item.update.forEach(u => this.scheduleUpdate(u));
                });
            }
        });

        // Other listeners (Selects / Multi-Selects)
        if (this.dom.tierSelect) {
            this.dom.tierSelect.addEventListener('change', () => {
                const selected = Array.from(this.dom.tierSelect.selectedOptions).map(opt => opt.value);
                this.updateField('header', 'tier', selected);
                this.scheduleUpdate('outputs');
                this.scheduleUpdate('lootDeclaration'); 
            });
        }
        
        if (this.dom.eventSelect) {
            this.dom.eventSelect.addEventListener('change', () => {
                const selected = Array.from(this.dom.eventSelect.selectedOptions).map(opt => opt.value);
                this.updateField('header', 'event_tags', selected);
                this.scheduleUpdate('outputs');
            });
        }
        
        // Numeric inputs
        const numInputs = [
            { el: this.dom.sessionHours, sect: 'session_log', field: 'hours', update: ['calculations', 'outputs'] },
            { el: this.dom.dmLevel, sect: 'dm', field: 'level', update: ['dmLoot', 'outputs'] },
            { el: this.dom.predetPerms, sect: 'header', field: 'predet_perms', update: ['lootDeclaration'] },
            { el: this.dom.predetCons, sect: 'header', field: 'predet_cons', update: ['lootDeclaration'] }
        ];

        numInputs.forEach(item => {
            if(item.el) {
                item.el.addEventListener('input', (e) => {
                     // Handle float/int logic if needed, or store as string
                     this.updateField(item.sect, item.field, e.target.value);
                     if(item.update) item.update.forEach(u => this.scheduleUpdate(u));
                });
            }
        });

        if (this.dom.dmGamesCount) {
            this.dom.dmGamesCount.addEventListener('change', (e) => {
                this.updateField('dm', 'games_count', e.target.value);
                this.scheduleUpdate('dmLoot');
            });
        }
        
        if (this.dom.dmLootSelected) {
            this.dom.dmLootSelected.addEventListener('input', (e) => {
                this.updateField('session_log.dm_rewards', 'loot_selected', e.target.value);
                this.scheduleUpdate('outputs');
            });
        }
    }

    /**
     * Returns a deep copy of the current state.
     * Prevents accidental direct mutation of the state object by consumers.
     * @returns {Object} Complete state object.
     */
    getFullState() { return JSON.parse(JSON.stringify(this.state)); }
    
    /**
     * Calculates derived statistics based on the current player roster.
     * @returns {Object} { partySize, apl, tier, playerCount }
     */
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
        
        // Calculate Tier based on APL thresholds
        let tier = 1;
        if (apl >= 17) tier = 4;
        else if (apl >= 11) tier = 3;
        else if (apl >= 5) tier = 2;

        return { partySize: this.state.players.length, apl, tier, playerCount };
    }
    
    /**
     * Calculates roster statistics specifically for DM Incentives (New Hires/Welcome Wagon).
     * @returns {Object} { newHires, welcomeWagon } counts.
     */
    getPlayerStats() {
        let newHires = 0;
        let welcomeWagon = 0;

        this.state.players.forEach(player => {
            const gamesVal = String(player.games_count);
            if (gamesVal === "1") welcomeWagon++;
            if (gamesVal !== "10+") {
                 const n = parseInt(gamesVal);
                 if(!isNaN(n) && n <= 10) newHires++;
            }
        });

        return { newHires, welcomeWagon };
    }

    /**
     * Updates a specific field in the state and syncs the DOM if necessary.
     * Supports dot notation for nested fields (e.g. 'session_log.dm_rewards').
     * @param {string} section - State section key or dot path.
     * @param {string} field - Field key.
     * @param {*} value - New value.
     */
    updateField(section, field, value) {
        if (section.includes('.')) {
            // Handle nested paths
            const parts = section.split('.');
            let target = this.state;
            for (let i = 0; i < parts.length - 1; i++) target = target[parts[i]];
            target[parts[parts.length - 1]][field] = value;
        } else {
            this.state[section][field] = value;
        }
        
        // Sync to DOM if the update didn't originate from the DOM
        const domKey = this.getDOMKeyForField(section, field);
        if (domKey && this.dom[domKey]) {
            if (this.dom[domKey].value !== value) {
                this.dom[domKey].value = value;
            }
        }
    }
    
    /**
     * Hydrates the state from a database object (e.g. loading a saved session).
     * @param {Object} sessionData - Data retrieved from DB.
     */
    loadFromDB(sessionData) {
        if (!sessionData.form_data) return;
        if (sessionData.form_data.header) Object.assign(this.state.header, sessionData.form_data.header);
        if (sessionData.form_data.players) this.state.players = [...sessionData.form_data.players];
        if (sessionData.form_data.dm) Object.assign(this.state.dm, sessionData.form_data.dm);
        if (sessionData.form_data.session_log) Object.assign(this.state.session_log, sessionData.form_data.session_log);
        this.syncAllToDOM();
    }
    
    /**
     * Triggers a visual sync of state to DOM elements.
     * (Note: Detailed form population is handled by session-io.js/populateForm).
     */
    syncAllToDOM() {
        // Sync Logic handled in session-io populateForm usually, 
        // but can be reinforced here if needed.
    }

    /**
     * Schedules a debounced update for a specific channel.
     * Prevents expensive operations (text generation) from running on every keystroke.
     * @param {string} updateType - The channel name (e.g., 'outputs', 'calculations').
     */
    scheduleUpdate(updateType) {
        if (this.debounceTimers[updateType]) clearTimeout(this.debounceTimers[updateType]);
        this.debounceTimers[updateType] = setTimeout(() => {
            this.executeUpdate(updateType);
            this.debounceTimers[updateType] = null;
        }, 100);
    }
    
    /**
     * Executes all registered callbacks for a specific update channel.
     * @param {string} updateType - The channel name.
     */
    executeUpdate(updateType) {
        (this.updateCallbacks[updateType] || []).forEach(cb => { try { cb(this); } catch (e) { console.error(e); } });
        (this.updateCallbacks.all || []).forEach(cb => { try { cb(this, updateType); } catch (e) { console.error(e); } });
    }
    
    /**
     * Subscribes a callback function to a specific update channel.
     * @param {string} updateType - The channel to listen to.
     * @param {Function} callback - The function to run when the channel updates.
     */
    onUpdate(updateType, callback) {
        if (this.updateCallbacks[updateType]) this.updateCallbacks[updateType].push(callback);
    }
    
    /**
     * Helper to map state keys to cached DOM element keys.
     * Enables automatic two-way binding.
     * @param {string} section - State section.
     * @param {string} field - State field.
     * @returns {string|undefined} The key in `this.dom` or undefined.
     */
    getDOMKeyForField(section, field) {
        const mapping = {
            'header.title': 'gameName',
            'header.intended_duration': 'durationText',
            'header.loot_plan': 'lootPlan',
            'header.game_description': 'description',
            // Corrected IDs
            'header.house_rules': 'houseRules',
            'header.notes': 'notes',
            'header.warnings': 'warnings',
            'header.how_to_apply': 'howToApply',
            'header.apl': 'apl',
            'header.party_size': 'partySize',
            
            'header.listing_url': 'listingUrl',
            'header.lobby_url': 'lobbyUrl',
            'dm.character_name': 'dmCharName',
            'dm.level': 'dmLevel',
            'dm.games_count': 'dmGamesCount',
            'session_log.hours': 'sessionHours',
            'session_log.notes': 'sessionNotes',
            'session_log.summary': 'sessionSummary',
            'session_log.dm_rewards.loot_selected': 'dmLootSelected'
        };
        return mapping[`${section}.${field}`];
    }
}

// Export a singleton instance
export const stateManager = new StateManager();