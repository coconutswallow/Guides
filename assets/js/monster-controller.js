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
            creator: '',
            
            // Visual elements
            image: '',
            image_credit: '',
            description: '',
            
            // Core combat statistics
            ac: '',
            hp: '',
            speed: '',
            
            // Ability scores (default to 10)
            str: 10,
            dex: 10,
            con: 10,
            int: 10,
            wis: 10,
            cha: 10,
            
            // Optional proficient saving throw overrides
            strSave: '', 
            dexSave: '',
            conSave: '',
            intSave: '',
            wisSave: '',
            chaSave: '',
            
            // Additional statistics
            skills: '',
            damageResistances: '',
            damageVulnerabilities: '',
            damageImmunities: '',
            conditionImmunities: '',
            senses: '',
            languages: '',
            
            // Monster abilities (arrays of {name, description} objects)
            traits: [],
            actions: [],
            reactions: [],
            bonusActions: [],
            legendaryActions: [],
            legendaryActionDescription: '',
            
            // Text blocks for lair mechanics
            lairActions: '', 
            regionalEffects: '',

            // NEW: Additional Info (Tactics, Customizable Traits, etc.)
            additionalInfo: ''
        };
    }

    /**
     * Reset state to initial values
     */
    function resetState() {
        state = getInitialState();
    }

    /**
     * Save focus information before re-render
     */
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

    /**
     * Restore focus after re-render
     */
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

    /**
     * Sync form inputs to state
     */
    function syncFormState() {
        const formView = document.getElementById('form-view');
        if (!formView) return;

        const inputs = formView.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            // Skip item name/description fields (they have data attributes)
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

    /**
     * Render the current view
     * @param {string} activeView - 'form' or 'preview'
     */
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

    /**
     * Attach event listeners to form inputs
     */
    function attachFormListeners() {
        const formView = document.getElementById('form-view');
        if (!formView) return;
        
        // Fields that trigger full re-render (affect calculations)
        const dynamicFields = [
            'str', 'dex', 'con', 'int', 'wis', 'cha', 
            'strSave', 'dexSave', 'conSave', 'intSave', 'wisSave', 'chaSave',
            'cr'
        ];

        // Regular input fields
        const inputs = formView.querySelectorAll('input:not([data-field]), select, textarea:not([data-field])');
        inputs.forEach(input => {
            // For ability scores and save overrides, use 'change' and 'blur' to avoid premature calculation
            // For other fields, use 'input' for immediate updates
            const isDynamicField = dynamicFields.includes(input.id);
            const eventType = isDynamicField ? 'change' : (input.tagName === 'SELECT' ? 'change' : 'input');
            
            input.addEventListener(eventType, () => {
                if (input.type === 'number') {
                    state[input.id] = parseInt(input.value) || 10;
                } else {
                    state[input.id] = input.value;
                }

                // Re-render if it's a dynamic field that affects calculations
                if (isDynamicField) {
                    render('form');
                }
            });

            // Also add blur event for number inputs to ensure final value is captured
            if (input.type === 'number' && isDynamicField) {
                input.addEventListener('blur', () => {
                    state[input.id] = parseInt(input.value) || 10;
                    render('form');
                });
            }
        });

        // Item list inputs (name/description fields)
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

        // Add item buttons
        const addButtons = formView.querySelectorAll('.add-button');
        addButtons.forEach(button => {
            button.addEventListener('click', () => {
                const field = button.getAttribute('data-field');
                addItem(field);
            });
        });

        // Remove item buttons
        const removeButtons = formView.querySelectorAll('.remove-button');
        removeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const field = button.getAttribute('data-field');
                const index = parseInt(button.getAttribute('data-index'));
                removeItem(field, index);
            });
        });
    }

    /**
     * Add an item to an array field
     * @param {string} field - Field name (traits, actions, etc.)
     */
    function addItem(field) {
        if (!state[field]) state[field] = [];
        state[field].push({ name: '', description: '' });
        render('form');
    }

    /**
     * Remove an item from an array field
     * @param {string} field - Field name
     * @param {number} index - Index to remove
     */
    function removeItem(field, index) {
        if (!state[field]) return;
        state[field].splice(index, 1);
        render('form');
    }

    /**
     * Switch between form and preview views
     * @param {string} view - 'form' or 'preview'
     */
    function switchView(view) {
        const formView = document.getElementById('form-view');
        const previewView = document.getElementById('preview-view');
        
        if (!formView || !previewView) return;

        // Update view visibility
        formView.classList.remove('active');
        previewView.classList.remove('active');
        document.getElementById(`${view}-view`).classList.add('active');
        
        // Update button states
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeButton = document.querySelector(`[data-view="${view}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }

        // Render the active view
        render(view);
    }

    /**
     * Download markdown file
     */
    function downloadMarkdown() {
        syncFormState();
        
        // Validate before download
        const validation = MonsterValidator.validateMonster(state);
        if (!validation.valid) {
            alert("Please fix the following errors before downloading:\n\n- " + validation.errors.join("\n- "));
            return;
        }

        // Generate markdown
        const abilities = MonsterCalculator.calculateAllAbilities(state);
        const markdown = MonsterGenerator.generateMarkdown(state, abilities);
        const filename = MonsterGenerator.generateFilename(state.title);

        // Create and trigger download
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

    /**
     * Load markdown file
     * @param {Event} event - File input change event
     */
    function loadMarkdownFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            
            try {
                const loadedState = MonsterParser.parseMonster(content);
                
                if (!loadedState) {
                    alert("Failed to parse the markdown file. Please check the format.");
                    return;
                }

                // Update state with loaded data
                state = loadedState;
                
                // Re-render form
                render('form');
                switchView('form');
                
                alert(`Successfully loaded: ${file.name}`);
            } catch (error) {
                console.error('Error loading markdown:', error);
                alert("Error loading file: " + error.message);
            }

            // Reset file input
            event.target.value = null;
        };

        reader.readAsText(file);
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

        // Create main UI structure
        container.innerHTML = `
            <div class="generator-controls">
                <div class="view-toggles">
                    <button class="toggle-btn active" data-view="form">Edit Form</button>
                    <button class="toggle-btn" data-view="preview">Preview</button>
                </div>
                <div style="display: flex; gap: 0.5em;">
                    <button class="download-btn" id="download-btn">📥 Download Markdown</button>
                    <button class="download-btn" style="background: #007bff;" id="upload-btn">📤 Load Markdown</button>
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
        
        document.getElementById('upload-btn').addEventListener('click', () => {
            document.getElementById('upload-input').click();
        });

        document.getElementById('upload-input').addEventListener('change', loadMarkdownFile);

        // Initial render
        render('form');
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