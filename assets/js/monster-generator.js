// Monster Controller Module
// Orchestrates all other modules and handles user interactions
const MonsterController = (function() {
    'use strict';

    // Application state
    let state = getInitialState();
    
    // Focus management for re-rendering
    let focusedElementInfo = null;

    /**
     * Get initial empty state
     * @returns {Object} Initial monster state
     */
    function getInitialState() {
        return {
            // Layout and identification
            layout: 'statblock',
            title: '',
            cr: '',
            size: 'Medium',
            type: 'Beast',
            alignment: 'Unaligned',
            category: '2014 Fair Game',
            creator: '', // Will be auto-filled by Auth
            
            // Visual elements
            image: '',
            image_credit: '',
            description: '',
            
            // Core combat statistics
            ac: '',
            hp: '',
            speed: '',
            
            // Ability scores (default to 10)
            str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
            
            // Optional proficient saving throw overrides
            strSave: '', dexSave: '', conSave: '', 
            intSave: '', wisSave: '', chaSave: '',
            
            // Additional statistics
            skills: '',
            damageResistances: '',
            damageImmunities: '',
            conditionImmunities: '',
            senses: '',
            languages: '',
            
            // Monster abilities
            traits: [],
            actions: [],
            reactions: [],
            bonusActions: [],
            legendaryActions: [],
            legendaryActionDescription: '',
            
            // Text blocks
            lairActions: '', 
            regionalEffects: '',
            additionalInfo: ''
        };
    }

    // --- STANDARD HELPER FUNCTIONS (No Changes Here) ---
    function resetState() { state = getInitialState(); }

    function saveFocus() {
        const activeElement = document.activeElement;
        if (activeElement && 
            (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'SELECT') && 
            activeElement.id) {
            focusedElementInfo = {
                id: activeElement.id,
                cursor: activeElement.selectionStart !== null ? activeElement.selectionStart : activeElement.value.length
            };
        } else {
            focusedElementInfo = null;
        }
    }

    function restoreFocus() {
        if (!focusedElementInfo) return;
        const elementToFocus = document.getElementById(focusedElementInfo.id);
        if (elementToFocus) {
            elementToFocus.focus();
            if (elementToFocus.setSelectionRange) {
                const cursor = Math.min(focusedElementInfo.cursor, elementToFocus.value.length);
                elementToFocus.setSelectionRange(cursor, cursor);
            }
        }
    }

    function syncFormState() {
        const formView = document.getElementById('form-view');
        if (!formView) return;

        const inputs = formView.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (input.hasAttribute('data-field')) return;
            if (input.id in state) {
                if (input.type === 'number') {
                    state[input.id] = parseInt(input.value) || 10;
                } else {
                    state[input.id] = input.value;
                }
            }
        });
    }

    function render(activeView = 'form') {
        const formView = document.getElementById('form-view');
        const previewView = document.getElementById('preview-view');
        
        if (!formView || !previewView) return;

        if (activeView === 'form') {
            saveFocus();
            formView.innerHTML = MonsterUI.renderForm(state);
            restoreFocus();
            attachFormListeners();
        } else {
            syncFormState();
            previewView.innerHTML = MonsterUI.renderPreview(state);
        }
    }

    function attachFormListeners() {
        const formView = document.getElementById('form-view');
        if (!formView) return;
        
        const dynamicFields = [
            'str', 'dex', 'con', 'int', 'wis', 'cha', 
            'strSave', 'dexSave', 'conSave', 'intSave', 'wisSave', 'chaSave',
            'cr'
        ];

        const inputs = formView.querySelectorAll('input:not([data-field]), select, textarea:not([data-field])');
        inputs.forEach(input => {
            const isDynamicField = dynamicFields.includes(input.id);
            const eventType = isDynamicField ? 'change' : (input.tagName === 'SELECT' ? 'change' : 'input');
            
            input.addEventListener(eventType, () => {
                if (input.type === 'number') {
                    state[input.id] = parseInt(input.value) || 10;
                } else {
                    state[input.id] = input.value;
                }
                if (isDynamicField) render('form');
            });

            if (input.type === 'number' && isDynamicField) {
                input.addEventListener('blur', () => {
                    state[input.id] = parseInt(input.value) || 10;
                    render('form');
                });
            }
        });

        const itemInputs = formView.querySelectorAll('input[data-field], textarea[data-field]');
        itemInputs.forEach(input => {
            input.addEventListener('input', () => {
                const field = input.getAttribute('data-field');
                const index = parseInt(input.getAttribute('data-index'));
                const prop = input.getAttribute('data-prop');
                if (state[field] && state[field][index]) {
                    state[field][index][prop] = input.value;
                }
            });
        });

        formView.querySelectorAll('.add-button').forEach(button => {
            button.addEventListener('click', () => {
                addItem(button.getAttribute('data-field'));
            });
        });

        formView.querySelectorAll('.remove-button').forEach(button => {
            button.addEventListener('click', () => {
                removeItem(button.getAttribute('data-field'), parseInt(button.getAttribute('data-index')));
            });
        });
    }

    function addItem(field) {
        if (!state[field]) state[field] = [];
        state[field].push({ name: '', description: '' });
        render('form');
    }

    function removeItem(field, index) {
        if (!state[field]) return;
        state[field].splice(index, 1);
        render('form');
    }

    function switchView(view) {
        const formView = document.getElementById('form-view');
        const previewView = document.getElementById('preview-view');
        if (!formView || !previewView) return;

        formView.classList.remove('active');
        previewView.classList.remove('active');
        document.getElementById(`${view}-view`).classList.add('active');
        
        document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
        const activeButton = document.querySelector(`[data-view="${view}"]`);
        if (activeButton) activeButton.classList.add('active');

        render(view);
    }

    function downloadMarkdown() {
        syncFormState();
        const validation = MonsterValidator.validateMonster(state);
        if (!validation.valid) {
            alert("Please fix the following errors before downloading:\n\n- " + validation.errors.join("\n- "));
            return;
        }
        const abilities = MonsterCalculator.calculateAllAbilities(state);
        const markdown = MonsterGenerator.generateMarkdown(state, abilities);
        const filename = MonsterGenerator.generateFilename(state.title);

        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function loadMarkdownFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            try {
                const loadedState = MonsterParser.parseMonster(content);
                if (!loadedState) {
                    alert("Failed to parse the markdown file.");
                    return;
                }
                state = loadedState;
                render('form');
                switchView('form');
                alert(`Successfully loaded: ${file.name}`);
            } catch (error) {
                console.error('Error loading markdown:', error);
                alert("Error loading file: " + error.message);
            }
            event.target.value = null;
        };
        reader.readAsText(file);
    }

    // --- NEW: AUTH UI HANDLING ---
    function updateAuthUI(user) {
        const authContainer = document.getElementById('auth-status');
        if (!authContainer) return;

        if (user) {
            const userName = window.authManager.getUserName();
            authContainer.innerHTML = `
                <span style="font-size: 0.9em; margin-right: 10px;">👤 ${userName}</span>
                <button id="logout-btn" class="download-btn" style="background:#444; padding: 4px 10px; font-size: 0.8em;">Log Out</button>
            `;
            document.getElementById('logout-btn').addEventListener('click', () => window.authManager.logout());

            // Auto-fill creator name if empty
            if (!state.creator) {
                state.creator = userName;
                render('form'); // Re-render to show the name in the input
            }
        } else {
            authContainer.innerHTML = `
                <button id="login-btn" class="download-btn" style="background: #5865F2; padding: 4px 10px; font-size: 0.8em;">Login with Discord</button>
            `;
            document.getElementById('login-btn').addEventListener('click', () => window.authManager.login());
        }
    }

    /**
     * Initialize the application
     */
    function init() {
        const container = document.getElementById('generator-app');
        if (!container) {
            console.error('Generator app container not found');
            return;
        }

        // --- NEW: UPDATED HTML STRUCTURE TO INCLUDE AUTH STATUS ---
        container.innerHTML = `
            <div class="generator-controls" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <div class="view-toggles">
                    <button class="toggle-btn active" data-view="form">Edit Form</button>
                    <button class="toggle-btn" data-view="preview">Preview</button>
                </div>

                <div id="auth-status" style="display:flex; align-items:center;">Loading...</div>

                <div style="display: flex; gap: 0.5em;">
                    <button class="download-btn" id="download-btn">📥 Download MD</button>
                    <button class="download-btn" style="background: #007bff;" id="upload-btn">📤 Load MD</button>
                    <input type="file" id="upload-input" accept=".md" style="display: none;">
                </div>
            </div>
            
            <div id="form-view" class="view-container active"></div>
            <div id="preview-view" class="view-container"></div>
        `;

        // Attach control button listeners
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.getAttribute('data-view');
                switchView(view);
            });
        });

        document.getElementById('download-btn').addEventListener('click', downloadMarkdown);
        document.getElementById('upload-btn').addEventListener('click', () => document.getElementById('upload-input').click());
        document.getElementById('upload-input').addEventListener('change', loadMarkdownFile);

        // Initial render
        render('form');

        // --- NEW: INITIALIZE AUTH MANAGER ---
        if (window.authManager) {
            window.authManager.init((user) => {
                updateAuthUI(user);
            });
        } else {
            console.error("Auth Manager not loaded.");
            document.getElementById('auth-status').innerHTML = "Auth Error";
        }
    }

    // Public API
    return {
        init,
        switchView,
        downloadMarkdown,
        getState: () => state,
        setState: (newState) => { state = newState; render('form'); }
    };

})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => MonsterController.init());
} else {
    MonsterController.init();
}