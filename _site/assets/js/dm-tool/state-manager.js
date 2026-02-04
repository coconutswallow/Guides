// assets/js/dm-tool/state-manager.js

/**
 * @file state-manager.js
 * @description Centralized State Management for the DM Tool.
 * @module StateManager
 */

class StateManager {
    constructor() {
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
                game_listing_url: '', 
                dm_collab_link: '', 
                dm_collaborators: '',
                loot_plan: '',
                predet_perms: 0,
                predet_cons: 0,
                // UPDATED: New Link Field
                player_loot_links: ''
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
                },
                // UPDATED: New Link Fields
                dm_loot_links: '',
                session_log_links: ''
            }
        };

        this.dom = {}; 
        this.debounceTimers = {};
        this.updateCallbacks = { calculations: [], lootDeclaration: [], outputs: [], dmLoot: [], all: [] };
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
        this.dom.gameName = document.getElementById('header-game-name');
        
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
        
        this.dom.tierSelect = document.getElementById('inp-tier');
        this.dom.apl = document.getElementById('inp-apl');
        this.dom.partySize = document.getElementById('inp-party-size');
        
        this.dom.tone = document.getElementById('inp-tone');
        this.dom.focus = document.getElementById('inp-focus');
        this.dom.diffEncounter = document.getElementById('inp-diff-encounter');
        this.dom.diffThreat = document.getElementById('inp-diff-threat');
        this.dom.diffLoss = document.getElementById('inp-diff-loss');
        
        this.dom.houseRules = document.getElementById('inp-houserules'); 
        this.dom.notes = document.getElementById('inp-notes'); 
        this.dom.warnings = document.getElementById('inp-warnings'); 
        this.dom.howToApply = document.getElementById('inp-apply'); 
        
        this.dom.listingUrl = document.getElementById('inp-listing-url');
        this.dom.lobbyUrl = document.getElementById('inp-lobby-url');
        
        this.dom.gameListingUrl = document.getElementById('inp-game-listing-url');
        
        this.dom.dmCollabLink = document.getElementById('inp-dm-collab-link');
        this.dom.dmCollaborators = document.getElementById('inp-dm-collaborators');
        
        this.dom.lootPlan = document.getElementById('inp-loot-plan');
        this.dom.predetPerms = document.getElementById('inp-predet-perms');
        this.dom.predetCons = document.getElementById('inp-predet-cons');
        
        // UPDATED: Cache New Link Fields
        this.dom.playerLootLinks = document.getElementById('inp-player-loot-links');
        this.dom.dmLootLinks = document.getElementById('inp-dm-loot-links');
        this.dom.sessionLogLinks = document.getElementById('inp-session-log-links');

        this.dom.rosterBody = document.getElementById('roster-body');
        this.dom.dmCharName = document.getElementById('inp-dm-char-name');
        this.dom.dmLevel = document.getElementById('inp-dm-level');
        this.dom.dmGamesCount = document.getElementById('inp-dm-games-count');
        
        this.dom.sessionHours = document.getElementById('inp-session-total-hours');
        this.dom.sessionDate = document.getElementById('inp-session-date');
        this.dom.sessionUnix = document.getElementById('inp-session-unix');
        this.dom.sessionNotes = document.getElementById('inp-session-notes');
        this.dom.sessionSummary = document.getElementById('session-summary');
        this.dom.dmCollab = document.getElementById('inp-dm-collab');
        this.dom.sessionRosterList = document.getElementById('session-roster-list');
        
        this.dom.dmForfeitXp = document.getElementById('chk-dm-forfeit-xp');
        this.dom.dmLootSelected = document.getElementById('dm-loot-selected');
        this.dom.btnDmIncentives = document.getElementById('btn-dm-loot-incentives');
        
        this.dom.outListing = document.getElementById('out-listing-text');
        this.dom.outAd = document.getElementById('out-ad-text');
        this.dom.outSession = document.getElementById('out-session-text');
        this.dom.outSummary = document.getElementById('out-summary-text');
        this.dom.outMAL = document.getElementById('out-mal-update');
        // UPDATED: Cache New Output
        this.dom.outPlayerSummary = document.getElementById('out-player-summary');
    }

    attachDOMListeners() {
        const textInputs = [
            { el: this.dom.gameName, sect: 'header', field: 'title', update: ['outputs', 'lootDeclaration'] },
            { el: this.dom.lobbyUrl, sect: 'header', field: 'lobby_url', update: ['outputs'] },
            { el: this.dom.listingUrl, sect: 'header', field: 'listing_url', update: ['outputs'] },
            { el: this.dom.gameListingUrl, sect: 'header', field: 'game_listing_url', update: ['outputs'] },
            { el: this.dom.dmCollabLink, sect: 'header', field: 'dm_collab_link', update: ['outputs'] },
            { el: this.dom.dmCollaborators, sect: 'header', field: 'dm_collaborators', update: ['outputs'] },
            { el: this.dom.dmCharName, sect: 'dm', field: 'character_name', update: ['outputs', 'dmLoot'] },
            { el: this.dom.lootPlan, sect: 'header', field: 'loot_plan', update: ['lootDeclaration'] },
            
            { el: this.dom.houseRules, sect: 'header', field: 'house_rules', update: ['outputs'] },
            { el: this.dom.notes, sect: 'header', field: 'notes', update: ['outputs'] },
            { el: this.dom.warnings, sect: 'header', field: 'warnings', update: ['outputs'] },
            { el: this.dom.howToApply, sect: 'header', field: 'how_to_apply', update: ['outputs'] },
            { el: this.dom.description, sect: 'header', field: 'game_description', update: ['outputs'] },
            { el: this.dom.apl, sect: 'header', field: 'apl', update: ['outputs'] },
            { el: this.dom.partySize, sect: 'header', field: 'party_size', update: ['outputs'] },
            
            { el: this.dom.sessionNotes, sect: 'session_log', field: 'notes', update: ['outputs'] },
            { el: this.dom.dmCollab, sect: 'session_log', field: 'dm_collaborators', update: ['outputs'] },
            { el: this.dom.sessionSummary, sect: 'session_log', field: 'summary', update: ['outputs'] },
            
            // UPDATED: Listeners for new link fields
            { el: this.dom.playerLootLinks, sect: 'header', field: 'player_loot_links', update: ['outputs'] },
            { el: this.dom.dmLootLinks, sect: 'session_log', field: 'dm_loot_links', update: ['outputs'] },
            { el: this.dom.sessionLogLinks, sect: 'session_log', field: 'session_log_links', update: ['outputs'] }
        ];

        textInputs.forEach(item => {
            if (item.el) {
                item.el.addEventListener('input', (e) => {
                    this.updateField(item.sect, item.field, e.target.value);
                    if (item.update) item.update.forEach(u => this.scheduleUpdate(u));
                });
            }
        });

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
        
        const numInputs = [
            { el: this.dom.sessionHours, sect: 'session_log', field: 'hours', update: ['calculations', 'outputs'] },
            { el: this.dom.dmLevel, sect: 'dm', field: 'level', update: ['dmLoot', 'outputs'] },
            { el: this.dom.predetPerms, sect: 'header', field: 'predet_perms', update: ['lootDeclaration'] },
            { el: this.dom.predetCons, sect: 'header', field: 'predet_cons', update: ['lootDeclaration'] }
        ];

        numInputs.forEach(item => {
            if(item.el) {
                item.el.addEventListener('input', (e) => {
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

    getFullState() { return JSON.parse(JSON.stringify(this.state)); }
    
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
            if (gamesVal === "1") welcomeWagon++;
            if (gamesVal !== "10+") {
                 const n = parseInt(gamesVal);
                 if(!isNaN(n) && n <= 10) newHires++;
            }
        });

        return { newHires, welcomeWagon };
    }

    updateField(section, field, value) {
        if (section.includes('.')) {
            const parts = section.split('.');
            let target = this.state;
            for (let i = 0; i < parts.length - 1; i++) target = target[parts[i]];
            target[parts[parts.length - 1]][field] = value;
        } else {
            this.state[section][field] = value;
        }
        
        const domKey = this.getDOMKeyForField(section, field);
        if (domKey && this.dom[domKey]) {
            if (this.dom[domKey].value !== value) {
                this.dom[domKey].value = value;
            }
        }
    }
    
    loadFromDB(sessionData) {
        if (!sessionData.form_data) return;
        if (sessionData.form_data.header) Object.assign(this.state.header, sessionData.form_data.header);
        if (sessionData.form_data.players) this.state.players = [...sessionData.form_data.players];
        if (sessionData.form_data.dm) Object.assign(this.state.dm, sessionData.form_data.dm);
        if (sessionData.form_data.session_log) Object.assign(this.state.session_log, sessionData.form_data.session_log);
        this.syncAllToDOM();
    }
    
    syncAllToDOM() { }

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
            'session_log.dm_rewards.loot_selected': 'dmLootSelected',
            // UPDATED: Mapping for new link fields
            'header.player_loot_links': 'playerLootLinks',
            'session_log.dm_loot_links': 'dmLootLinks',
            'session_log.session_log_links': 'sessionLogLinks'
        };
        return mapping[`${section}.${field}`];
    }
}

export const stateManager = new StateManager();