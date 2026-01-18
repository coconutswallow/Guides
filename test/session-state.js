// assets/js/dm-tool/session-state.js

/**
 * @file session-state.js
 * @description Centralized State Management for the DM Tool.
 * This class acts as the "Single Source of Truth" for the session editor.
 * It manages the internal data representation of the game session, caches DOM references
 * to improve performance, and implements an Observer pattern to notify the UI when data changes.
 * @module SessionState
 */

// Centralized state management - eliminates scattered DOM queries

class SessionState {
    /**
     * Initializes the SessionState with default empty values.
     * The state object mirrors the database schema and form structure.
     */
    constructor() {
        this.data = {
            // 1. Header Information (Game Metadata)
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
            // 2. Master Roster (Planning Phase)
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
        
        // Cache DOM references once to avoid repeated document.getElementById calls
        this.dom = {};
        this.listeners = [];
    }

    /**
     * Caches all relevant DOM elements into the `this.dom` object.
     * Should be called once immediately after the page DOM is loaded.
     */
    cacheDOMElements() {
        this.dom = {
            // Header
            gameName: document.getElementById('header-game-name'),
            
            // Setup Tab
            startDateTime: document.getElementById('inp-start-datetime'),
            timezone: document.getElementById('inp-timezone'),
            unixTime: document.getElementById('inp-unix-time'),
            durationText: document.getElementById('inp-duration-text'),
            format: document.getElementById('inp-format'),
            version: document.getElementById('inp-version'),
            appsType: document.getElementById('inp-apps-type'),
            platform: document.getElementById('inp-platform'),
            eventSelect: document.getElementById('inp-event'),
            tierSelect: document.getElementById('inp-tier'),
            apl: document.getElementById('inp-apl'),
            partySize: document.getElementById('inp-party-size'),
            tone: document.getElementById('inp-tone'),
            focus: document.getElementById('inp-focus'),
            diffEncounter: document.getElementById('inp-diff-encounter'),
            diffThreat: document.getElementById('inp-diff-threat'),
            diffLoss: document.getElementById('inp-diff-loss'),
            listingUrl: document.getElementById('inp-listing-url'),
            lobbyUrl: document.getElementById('inp-lobby-url'),
            lootPlan: document.getElementById('inp-loot-plan'),
            predetPerms: document.getElementById('inp-predet-perms'),
            predetCons: document.getElementById('inp-predet-cons'),
            
            // Player Setup
            rosterBody: document.getElementById('roster-body'),
            dmCharName: document.getElementById('inp-dm-char-name'),
            dmLevel: document.getElementById('inp-dm-level'),
            dmGamesCount: document.getElementById('inp-dm-games-count'),
            
            // Session Details
            sessionHours: document.getElementById('inp-session-total-hours'),
            sessionDate: document.getElementById('inp-session-date'),
            sessionUnix: document.getElementById('inp-session-unix'),
            sessionNotes: document.getElementById('inp-session-notes'),
            sessionSummary: document.getElementById('inp-session-summary'),
            dmCollab: document.getElementById('inp-dm-collab'),
            sessionRosterList: document.getElementById('session-roster-list'),
            
            // Stats displays
            setupPartySize: document.getElementById('setup-val-party-size'),
            setupApl: document.getElementById('setup-val-apl'),
            setupTier: document.getElementById('setup-val-tier'),
            
            // DM Rewards
            dmForfeitXp: document.getElementById('chk-dm-forfeit-xp'),
            dmLootSelected: document.getElementById('dm-loot-selected'),
            btnDmIncentives: document.getElementById('btn-dm-loot-incentives'),
            
            // Outputs
            outListing: document.getElementById('out-listing-text'),
            outAd: document.getElementById('out-ad-text'),
            outSession: document.getElementById('out-session-text'),
            outLootDeclaration: document.getElementById('out-loot-declaration'),
            outHgenDeclaration: document.getElementById('out-hgen-declaration'),
            outHgenCommand: document.getElementById('out-hgen-command'),
            outDmLootDecl: document.getElementById('out-dm-loot-decl'),
            outDmLootCmd: document.getElementById('out-dm-loot-cmd')
        };
    }

    /**
     * Updates a specific field within a section of the state.
     * Triggers change notification.
     * @param {string} section - The top-level key (e.g., 'header', 'dm').
     * @param {string} field - The specific property to update.
     * @param {*} value - The new value.
     */
    updateField(section, field, value) {
        if (this.data[section]) {
            this.data[section][field] = value;
            this.notifyChange(section, field);
        }
    }

    /**
     * Performs a bulk update on multiple fields within a specific section.
     * Useful for initializing forms or applying templates.
     * @param {Object} updates - Object map where keys are sections and values are objects of fields to update.
     */
    updateFields(updates) {
        Object.entries(updates).forEach(([section, fields]) => {
            if (this.data[section]) {
                Object.assign(this.data[section], fields);
            }
        });
        this.notifyChange('bulk');
    }

    /**
     * Returns a deep copy of the current state.
     * Prevents external code from mutating the state directly by reference.
     * @returns {Object} The complete state object.
     */
    getState() {
        return JSON.parse(JSON.stringify(this.data));
    }

    /**
     * Loads a full state object (usually from the Database) into the internal store.
     * Merges the incoming data structure with the existing schema.
     * @param {Object} sessionData - The raw session object from the DB.
     */
    loadState(sessionData) {
        if (!sessionData.form_data) return;
        
        if (sessionData.form_data.header) {
            Object.assign(this.data.header, sessionData.form_data.header);
        }
        if (sessionData.form_data.players) {
            this.data.players = [...sessionData.form_data.players];
        }
        if (sessionData.form_data.dm) {
            Object.assign(this.data.dm, sessionData.form_data.dm);
        }
        if (sessionData.form_data.session_log) {
            Object.assign(this.data.session_log, sessionData.form_data.session_log);
        }
        
        this.notifyChange('load');
    }

    /**
     * Registers a callback function to be executed when the state changes.
     * Part of the Observer pattern.
     * @param {Function} callback - Function to execute on change.
     */
    onChange(callback) {
        this.listeners.push(callback);
    }

    /**
     * Notifies all registered listeners that a change has occurred.
     * @param {string} context - A description of what changed (for debugging/filtering).
     */
    notifyChange(context) {
        this.listeners.forEach(cb => cb(context));
    }

    /**
     * Calculates derived statistics based on the current player roster.
     * Logic:
     * - APL (Average Party Level) = Round(Total Levels / Player Count).
     * - Tier is determined by APL thresholds (1-4, 5-10, 11-16, 17+).
     * @returns {Object} { partySize, apl, tier, playerCount }
     */
    calculateStats() {
        let totalLevel = 0;
        let playerCount = 0;

        this.data.players.forEach(player => {
            // "Play As" level takes precedence over character level
            const effectiveLevel = parseFloat(player.level_playing_as || player.level) || 0;
            if (effectiveLevel > 0) {
                totalLevel += effectiveLevel;
                playerCount++;
            }
        });

        const apl = playerCount > 0 ? Math.round(totalLevel / playerCount) : 0;
        
        // Determine Tier based on APL
        let tier = 1;
        if (apl >= 17) tier = 4;
        else if (apl >= 11) tier = 3;
        else if (apl >= 5) tier = 2;

        return {
            partySize: this.data.players.length,
            apl,
            tier,
            playerCount
        };
    }

    /**
     * Retrieves session players with additional calculated context.
     * Specifically adds `maxHours` from the session log to assist with UI validation.
     * @returns {Array<Object>} List of session player objects.
     */
    getSessionPlayers() {
        const sessionHours = parseFloat(this.data.session_log.hours) || 3;
        
        return this.data.session_log.players.map(player => ({
            ...player,
            maxHours: sessionHours
        }));
    }

    /**
     * Updates a specific field for a player in the Master Roster.
     * @param {number} index - Index of the player in `data.players`.
     * @param {string} field - Field key to update.
     * @param {*} value - New value.
     */
    updatePlayer(index, field, value) {
        if (this.data.players[index]) {
            this.data.players[index][field] = value;
            this.notifyChange('player', index);
        }
    }

    /**
     * Updates a specific field for a player in the Session Log.
     * @param {number} index - Index of the player in `data.session_log.players`.
     * @param {string} field - Field key to update.
     * @param {*} value - New value.
     */
    updateSessionPlayer(index, field, value) {
        if (this.data.session_log.players[index]) {
            this.data.session_log.players[index][field] = value;
            this.notifyChange('session_player', index);
        }
    }

    /**
     * Adds a new player to the Master Roster.
     * @param {Object} playerData - The player object to add.
     */
    addPlayer(playerData) {
        this.data.players.push(playerData);
        this.notifyChange('player_added');
    }

    /**
     * Removes a player from the Master Roster by index.
     * @param {number} index - Index of the player to remove.
     */
    removePlayer(index) {
        this.data.players.splice(index, 1);
        this.notifyChange('player_removed');
    }

    /**
     * Synchronizes the Session Log players with the Master Roster players.
     * - Adds new players from Master to Session Log (with default empty result fields).
     * - Updates existing players' core info (Name, Level) in Session Log.
     * - Removes players from Session Log if they no longer exist in Master Roster.
     * Matching is performed based on `discord_id`.
     */
    syncSessionPlayers() {
        const masterPlayers = this.data.players;
        const sessionPlayers = this.data.session_log.players;
        const processedIds = new Set();

        // Update existing and add new
        masterPlayers.forEach(master => {
            processedIds.add(master.discord_id);
            const existing = sessionPlayers.find(s => s.discord_id === master.discord_id);
            
            if (existing) {
                // Update core fields only, preserve session-specific data (loot, xp, etc.)
                existing.display_name = master.display_name;
                existing.character_name = master.character_name;
                existing.level = master.level_playing_as || master.level;
                existing.games_count = master.games_count;
            } else {
                // Add new player to log with default empty result fields
                sessionPlayers.push({
                    discord_id: master.discord_id,
                    display_name: master.display_name,
                    character_name: master.character_name,
                    level: master.level_playing_as || master.level,
                    games_count: master.games_count,
                    hours: this.data.session_log.hours,
                    xp: 0,
                    forfeit_xp: false,
                    gold: '',
                    gold_used: '',
                    dtp: 0,
                    incentives: [],
                    loot: '',
                    items_used: '',
                    notes: ''
                });
            }
        });

        // Remove players no longer in master roster
        this.data.session_log.players = sessionPlayers.filter(
            s => processedIds.has(s.discord_id)
        );

        this.notifyChange('sync_players');
    }
}

// Create singleton instance to ensure global state consistency
export const sessionState = new SessionState();