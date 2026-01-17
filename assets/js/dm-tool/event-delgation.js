// assets/js/dm-tool/event-delegation.js
// Centralized event handling - eliminates listener proliferation

class EventDelegator {
    constructor(state, calculator) {
        this.state = state;
        this.calculator = calculator;
        this.updateCallbacks = [];
    }

    // Initialize all event delegation
    init() {
        this.initRosterEvents();
        this.initSessionRosterEvents();
        this.initHeaderEvents();
        this.initSetupEvents();
    }

    // Register update callback
    onUpdate(callback) {
        this.updateCallbacks.push(callback);
    }

    // Trigger all update callbacks
    triggerUpdate(context) {
        this.updateCallbacks.forEach(cb => cb(context));
    }

    // Master Roster event delegation
    initRosterEvents() {
        const tbody = document.getElementById('roster-body');
        if (!tbody) return;

        // Single delegated listener for all roster interactions
        tbody.addEventListener('input', (e) => {
            const row = e.target.closest('.player-row');
            if (!row) return;

            const index = Array.from(tbody.children).indexOf(row);

            if (e.target.matches('.inp-level, .inp-level-play-as')) {
                this.handlePlayerLevelChange(index, e.target);
            } else if (e.target.matches('.inp-player-display')) {
                this.handlePlayerNameChange(index, e.target);
            }
        });

        tbody.addEventListener('change', (e) => {
            const row = e.target.closest('.player-row');
            if (!row) return;

            const index = Array.from(tbody.children).indexOf(row);

            if (e.target.matches('.inp-games-count')) {
                this.handlePlayerGamesChange(index, e.target.value);
            }
        });

        tbody.addEventListener('click', (e) => {
            if (e.target.matches('.btn-delete-row')) {
                const row = e.target.closest('.player-row');
                const index = Array.from(tbody.children).indexOf(row);
                this.handlePlayerDelete(index, row);
            }
        });
    }

    // Session Roster event delegation
    initSessionRosterEvents() {
        const container = document.getElementById('session-roster-list');
        if (!container) return;

        // Single delegated listener for all session player cards
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

        container.addEventListener('change', (e) => {
            const card = e.target.closest('.player-card');
            if (!card) return;

            const index = Array.from(container.children).indexOf(card);

            if (e.target.matches('.s-forfeit-xp')) {
                this.handleSessionForfeitChange(index, e.target.checked);
            }
        });

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
                if (!e.target.closest('.btn-delete-card')) {
                    this.toggleCardBody(card);
                }
            }
        });
    }

    // Header events
    initHeaderEvents() {
        const gameName = document.getElementById('header-game-name');
        if (gameName) {
            gameName.addEventListener('input', () => {
                this.state.updateField('header', 'title', gameName.value);
                this.triggerUpdate('header');
            });
        }
    }

    // Setup tab events
    initSetupEvents() {
        const sessionHours = document.getElementById('inp-session-total-hours');
        if (sessionHours) {
            sessionHours.addEventListener('input', () => {
                const newHours = parseFloat(sessionHours.value) || 3;
                this.state.updateField('session_log', 'hours', newHours);
                
                // Update all player cards that exceed new max
                this.capAllPlayerHours(newHours);
                this.triggerUpdate('session_hours');
            });
        }

        // DM Level/Games
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

    // Handler methods
    handlePlayerLevelChange(index, input) {
        const field = input.classList.contains('inp-level') ? 'level' : 'level_playing_as';
        this.state.updatePlayer(index, field, input.value);
        this.triggerUpdate('player_level');
    }

    handlePlayerNameChange(index, input) {
        this.state.updatePlayer(index, 'display_name', input.value);
        
        // Auto-fill discord_id if empty
        const row = input.closest('.player-row');
        const idInput = row.querySelector('.inp-discord-id');
        if (idInput && !idInput.value) {
            this.state.updatePlayer(index, 'discord_id', input.value);
        }
    }

    handlePlayerGamesChange(index, value) {
        this.state.updatePlayer(index, 'games_count', value);
        this.triggerUpdate('player_games');
    }

    handlePlayerDelete(index, row) {
        row.remove();
        this.state.removePlayer(index);
        this.triggerUpdate('player_deleted');
    }

    handleSessionHoursChange(index, input) {
        const sessionMax = parseFloat(this.state.data.session_log.hours) || 3;
        const value = this.calculator.capHours(input.value, sessionMax);
        
        input.value = value;
        this.state.updateSessionPlayer(index, 'hours', value);
        this.triggerUpdate('session_player_hours');
    }

    handleSessionGoldChange(index, input) {
        this.state.updateSessionPlayer(index, 'gold', input.value);
        this.triggerUpdate('session_player_gold');
    }

    handleSessionForfeitChange(index, checked) {
        this.state.updateSessionPlayer(index, 'forfeit_xp', checked);
        this.triggerUpdate('session_player_forfeit');
    }

    handleSessionPlayerDelete(index, card) {
        card.remove();
        this.state.data.session_log.players.splice(index, 1);
        this.triggerUpdate('session_player_deleted');
    }

    handleIncentivesClick(button, index, isDM) {
        // This would call the modal opener
        if (window._sessionCallbacks && window._sessionCallbacks.onOpenModal) {
            window._sessionCallbacks.onOpenModal(button, index, isDM);
        }
    }

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

    // Cleanup method
    destroy() {
        // If needed, remove event listeners
        // (Currently using delegation, so just clearing references)
        this.updateCallbacks = [];
    }
}

export default EventDelegator;