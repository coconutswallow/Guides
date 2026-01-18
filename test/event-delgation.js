// assets/js/dm-tool/event-delegation.js

/**
 * @file event-delegation.js
 * @description Centralized Event Handling System using the Event Delegation pattern.
 * Instead of attaching individual event listeners to every dynamic input field (which leads 
 * to memory leaks and performance issues), this class attaches listeners to parent containers
 * and routes events based on the target element's class.
 * @module EventDelegator
 */

class EventDelegator {
    /**
     * Initializes the Event Delegator.
     * @param {Object} state - Reference to the centralized StateManager instance.
     * @param {Object} calculator - Reference to the CalculationEngine for validation logic.
     */
    constructor(state, calculator) {
        this.state = state;
        this.calculator = calculator;
        /** @type {Array<Function>} List of callbacks to fire when a UI interaction updates the state. */
        this.updateCallbacks = [];
    }

    /**
     * Bootstraps all event listeners for the application.
     * Should be called once after the DOM is ready.
     */
    init() {
        this.initRosterEvents();
        this.initSessionRosterEvents();
        this.initHeaderEvents();
        this.initSetupEvents();
    }

    /**
     * Registers a callback function to be executed when a UI event triggers a state update.
     * Implements the Observer pattern.
     * @param {Function} callback - The function to execute.
     */
    onUpdate(callback) {
        this.updateCallbacks.push(callback);
    }

    /**
     * Fires all registered update callbacks.
     * @param {string} context - A string identifier indicating what triggered the update (e.g., 'header', 'player_level').
     */
    triggerUpdate(context) {
        this.updateCallbacks.forEach(cb => cb(context));
    }

    /**
     * Sets up delegated listeners for the Master Roster table (Planning Tab).
     * Handles: Player Name changes, Level changes, Game Count changes, and Row Deletion.
     */
    initRosterEvents() {
        const tbody = document.getElementById('roster-body');
        if (!tbody) return;

        // Single delegated listener for all roster interactions (INPUT events)
        tbody.addEventListener('input', (e) => {
            // Find the parent row (`tr`) to determine index context
            const row = e.target.closest('.player-row');
            if (!row) return;

            const index = Array.from(tbody.children).indexOf(row);

            // Routing logic based on target class
            if (e.target.matches('.inp-level, .inp-level-play-as')) {
                this.handlePlayerLevelChange(index, e.target);
            } else if (e.target.matches('.inp-player-display')) {
                this.handlePlayerNameChange(index, e.target);
            }
        });

        // Delegated listener for CHANGE events (Selects / Finalized inputs)
        tbody.addEventListener('change', (e) => {
            const row = e.target.closest('.player-row');
            if (!row) return;

            const index = Array.from(tbody.children).indexOf(row);

            if (e.target.matches('.inp-games-count')) {
                this.handlePlayerGamesChange(index, e.target.value);
            }
        });

        // Delegated listener for CLICK events (Buttons)
        tbody.addEventListener('click', (e) => {
            if (e.target.matches('.btn-delete-row')) {
                const row = e.target.closest('.player-row');
                const index = Array.from(tbody.children).indexOf(row);
                this.handlePlayerDelete(index, row);
            }
        });
    }

    /**
     * Sets up delegated listeners for the Session Log Roster (Results Tab).
     * Handles: Hours, Gold, Forfeit Checkboxes, Deletion, Incentives, and Accordion Toggles.
     */
    initSessionRosterEvents() {
        const container = document.getElementById('session-roster-list');
        if (!container) return;

        // Single delegated listener for all session player cards (INPUT events)
        container.addEventListener('input', (e) => {
            const card = e.target.closest('.player-card');
            if (!card) return;

            const index = Array.from(container.children).indexOf(card);

            if (e.target.matches('.s-hours')) {
                this.handleSessionHoursChange(index, e.target);
            } else if (e.target.matches('.s-gold')) {
                this.handleSessionGoldChange(index, e.target);
            }
        });

        // Delegated listener for CHANGE events (Checkboxes)
        container.addEventListener('change', (e) => {
            const card = e.target.closest('.player-card');
            if (!card) return;

            const index = Array.from(container.children).indexOf(card);

            if (e.target.matches('.s-forfeit-xp')) {
                this.handleSessionForfeitChange(index, e.target.checked);
            }
        });

        // Delegated listener for CLICK events (Buttons & Accordion Headers)
        container.addEventListener('click', (e) => {
            const card = e.target.closest('.player-card');
            if (!card) return;

            if (e.target.matches('.btn-delete-card')) {
                const index = Array.from(container.children).indexOf(card);
                this.handleSessionPlayerDelete(index, card);
            } else if (e.target.matches('.s-incentives-btn')) {
                const index = Array.from(container.children).indexOf(card);
                this.handleIncentivesClick(e.target, index, false);
            } else if (e.target.matches('.player-card-header')) {
                // Ensure we don't toggle if the delete button inside the header was clicked
                if (!e.target.closest('.btn-delete-card')) {
                    this.toggleCardBody(card);
                }
            }
        });
    }

    /**
     * Sets up listeners for global Header fields (Game Name, etc).
     */
    initHeaderEvents() {
        const gameName = document.getElementById('header-game-name');
        if (gameName) {
            gameName.addEventListener('input', () => {
                this.state.updateField('header', 'title', gameName.value);
                this.triggerUpdate('header');
            });
        }
    }

    /**
     * Sets up listeners for the Setup/Configuration tab.
     * Handles global session hours and DM-specific inputs.
     */
    initSetupEvents() {
        const sessionHours = document.getElementById('inp-session-total-hours');
        if (sessionHours) {
            sessionHours.addEventListener('input', () => {
                const newHours = parseFloat(sessionHours.value) || 3;
                this.state.updateField('session_log', 'hours', newHours);
                
                // When global hours change, ensure no player exceeds the new max
                this.capAllPlayerHours(newHours);
                this.triggerUpdate('session_hours');
            });
        }

        // DM Level/Games Inputs
        const dmLevel = document.getElementById('inp-dm-level');
        const dmGames = document.getElementById('inp-dm-games-count');
        
        if (dmLevel) {
            dmLevel.addEventListener('input', () => {
                this.state.updateField('dm', 'level', dmLevel.value);
                this.triggerUpdate('dm_level');
            });
        }
        
        if (dmGames) {
            dmGames.addEventListener('change', () => {
                this.state.updateField('dm', 'games_count', dmGames.value);
                this.triggerUpdate('dm_games');
            });
        }
    }

    // =========================================
    // SPECIFIC HANDLER METHODS
    // =========================================

    /**
     * Logic for when a player's level changes in the Master Roster.
     * Distinguishes between actual level and "Play As" level.
     * @param {number} index - Index of the player in the state array.
     * @param {HTMLInputElement} input - The input element triggering the change.
     */
    handlePlayerLevelChange(index, input) {
        const field = input.classList.contains('inp-level') ? 'level' : 'level_playing_as';
        this.state.updatePlayer(index, field, input.value);
        this.triggerUpdate('player_level');
    }

    /**
     * Logic for player name changes.
     * Automatically syncs the Discord ID field if it's currently empty.
     * @param {number} index - Index of the player.
     * @param {HTMLInputElement} input - The name input element.
     */
    handlePlayerNameChange(index, input) {
        this.state.updatePlayer(index, 'display_name', input.value);
        
        // Auto-fill discord_id if empty (User convenience)
        const row = input.closest('.player-row');
        const idInput = row.querySelector('.inp-discord-id');
        if (idInput && !idInput.value) {
            this.state.updatePlayer(index, 'discord_id', input.value);
        }
    }

    /**
     * Logic for changes to "Games Played" count.
     * @param {number} index - Player index.
     * @param {string} value - The new value (e.g. "1", "5", "10+").
     */
    handlePlayerGamesChange(index, value) {
        this.state.updatePlayer(index, 'games_count', value);
        this.triggerUpdate('player_games');
    }

    /**
     * Removes a player row from the DOM and State.
     * @param {number} index - Player index.
     * @param {HTMLElement} row - The row element to remove.
     */
    handlePlayerDelete(index, row) {
        row.remove();
        this.state.removePlayer(index);
        this.triggerUpdate('player_deleted');
    }

    /**
     * Validates and updates session hours for a specific player.
     * Uses the Calculator engine to clamp the value to the session maximum.
     * @param {number} index - Player index.
     * @param {HTMLInputElement} input - The hours input.
     */
    handleSessionHoursChange(index, input) {
        const sessionMax = parseFloat(this.state.data.session_log.hours) || 3;
        // Cap value prevents user from entering hours > session total
        const value = this.calculator.capHours(input.value, sessionMax);
        
        input.value = value;
        this.state.updateSessionPlayer(index, 'hours', value);
        this.triggerUpdate('session_player_hours');
    }

    /**
     * Updates gold rewards for a session player.
     * @param {number} index - Player index.
     * @param {HTMLInputElement} input - Gold input.
     */
    handleSessionGoldChange(index, input) {
        this.state.updateSessionPlayer(index, 'gold', input.value);
        this.triggerUpdate('session_player_gold');
    }

    /**
     * Toggles the "Forfeit XP" flag.
     * @param {number} index - Player index.
     * @param {boolean} checked - Whether the box is checked.
     */
    handleSessionForfeitChange(index, checked) {
        this.state.updateSessionPlayer(index, 'forfeit_xp', checked);
        this.triggerUpdate('session_player_forfeit');
    }

    /**
     * Removes a player card from the Session Log view.
     * @param {number} index - Player index.
     * @param {HTMLElement} card - The card element.
     */
    handleSessionPlayerDelete(index, card) {
        card.remove();
        this.state.data.session_log.players.splice(index, 1);
        this.triggerUpdate('session_player_deleted');
    }

    /**
     * Opens the Incentives Modal for a player.
     * Delegates to the global callback handler attached to `window`.
     * @param {HTMLElement} button - The clicked button.
     * @param {number} index - Player index.
     * @param {boolean} isDM - Whether this is for the DM or a Player.
     */
    handleIncentivesClick(button, index, isDM) {
        // This would call the modal opener
        if (window._sessionCallbacks && window._sessionCallbacks.onOpenModal) {
            window._sessionCallbacks.onOpenModal(button, index, isDM);
        }
    }

    /**
     * Toggles the visibility of the player card body (Accordion behavior).
     * Rotates the arrow icon for visual feedback.
     * @param {HTMLElement} card - The parent card element.
     */
    toggleCardBody(card) {
        const body = card.querySelector('.player-card-body');
        const icon = card.querySelector('.step-icon');
        
        if (body.style.display === 'none') {
            body.style.display = 'flex';
            icon.style.transform = 'rotate(0deg)';
        } else {
            body.style.display = 'none';
            icon.style.transform = 'rotate(-90deg)';
        }
    }

    /**
     * Iterates over all player cards and reduces their hours if they exceed the new maximum.
     * Triggered when the global Session Hours are reduced.
     * @param {number} maxHours - The new maximum allowed hours.
     */
    capAllPlayerHours(maxHours) {
        const cards = document.querySelectorAll('#session-roster-list .player-card');
        cards.forEach((card, index) => {
            const input = card.querySelector('.s-hours');
            if (input) {
                const current = parseFloat(input.value) || 0;
                if (current > maxHours) {
                    input.value = maxHours;
                    this.state.updateSessionPlayer(index, 'hours', maxHours);
                }
            }
        });
    }

    /**
     * Cleanup method to prevent memory leaks if the delegator is destroyed.
     */
    destroy() {
        // If needed, remove event listeners
        // (Currently using delegation, so just clearing references)
        this.updateCallbacks = [];
    }
}

export default EventDelegator;