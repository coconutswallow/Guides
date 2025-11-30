// Monster Controller Module
// Orchestrates all other modules, handles user interactions, and manages Database state.
const MonsterController = (function() {
    'use strict';

    // Application state
    let state = getInitialState();
    
    // Focus management for re-rendering
    let focusedElementInfo = null;

    /**
     * Get initial empty state
     * Includes DB fields (dbId, status, version) and Admin flags
     */
    function getInitialState() {
        return {
            // Database Meta
            dbId: null,
            status: 'draft',
            version: 1,
            isAdmin: false,      // Flag if current user is admin
            isReviewing: false,  // Flag if currently reviewing someone else's monster

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
            initiativeProficiency: '0',
            
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

    // --- HELPER FUNCTIONS ---

    function resetState() { 
        // Keep admin status when resetting
        const wasAdmin = state.isAdmin;
        state = getInitialState();
        state.isAdmin = wasAdmin;
        
        // Auto-fill creator if logged in
        if (window.authManager && window.authManager.user) {
            state.creator = window.authManager.getUserName();
        }
    }

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

    // --- VIEW RENDERING ---

    function render(activeView = 'form') {
        const formView = document.getElementById('form-view');
        const previewView = document.getElementById('preview-view');
        
        if (!formView || !previewView) return;

        if (activeView === 'form') {
            saveFocus();
            formView.innerHTML = MonsterUI.renderForm(state);
            
            // Inject Admin/Status Controls into Form View
            renderStatusControls(formView);
            
            restoreFocus();
            attachFormListeners();
        } else if (activeView === 'preview') {
            syncFormState();
            previewView.innerHTML = MonsterUI.renderPreview(state);
        }
    }

    function renderStatusControls(container) {
        // 1. If Reviewing (Admin Mode)
        if (state.isReviewing) {
            const adminBar = document.createElement('div');
            adminBar.className = 'admin-review-bar';
            adminBar.style.cssText = "background:#ffebee; border:2px solid #ef5350; padding:15px; margin-bottom:20px; border-radius:8px;";
            adminBar.innerHTML = `
                <h3 style="margin-top:0; color:#c62828;">🛡️ Admin Review: ${state.status.toUpperCase()}</h3>
                <p>You are reviewing <strong>${MonsterUI.escapeHtml(state.title)}</strong> (v${state.version}) by <em>${MonsterUI.escapeHtml(state.creator)}</em>.</p>
                <div style="display:flex; gap:10px;">
                    <button id="admin-approve-btn" style="background:#2ea44f; color:white; padding:8px 16px; border:none; border-radius:4px; cursor:pointer;">✅ Approve</button>
                    <button id="admin-reject-btn" style="background:#d32f2f; color:white; padding:8px 16px; border:none; border-radius:4px; cursor:pointer;">❌ Reject</button>
                    <button id="admin-cancel-btn" style="background:#666; color:white; padding:8px 16px; border:none; border-radius:4px; cursor:pointer;">Cancel</button>
                </div>
            `;
            container.insertBefore(adminBar, container.firstChild);
            
            document.getElementById('admin-approve-btn').addEventListener('click', () => adminAction('approve'));
            document.getElementById('admin-reject-btn').addEventListener('click', () => adminAction('reject'));
            document.getElementById('admin-cancel-btn').addEventListener('click', () => switchView('dashboard'));
            return;
        }

        // 2. If User Editing (Show Status/Submit)
        if (state.dbId) {
            const statusBar = document.createElement('div');
            statusBar.style.cssText = "background:#f6f8fa; padding:10px; margin-bottom:20px; border:1px solid #d0d7de; border-radius:6px; display:flex; justify-content:space-between; align-items:center;";
            
            let statusBadge = `<span class="badge status-${state.status}" style="padding:4px 8px; border-radius:12px; font-weight:bold; font-size:0.85em; text-transform:uppercase;">${state.status}</span>`;
            
            let actionButtons = '';
            if (state.status === 'draft' || state.status === 'rejected') {
                actionButtons = `<button id="submit-review-btn" style="background:#0969da; color:white; padding:6px 12px; border:none; border-radius:4px; cursor:pointer;">Submit for Review</button>`;
            } else if (state.status === 'pending') {
                actionButtons = `<span style="color:#666; font-style:italic;">Awaiting approval...</span>`;
            } else if (state.status === 'approved') {
                actionButtons = `<span style="color:#2ea44f;">✓ Live in Compendium</span>`;
            }

            statusBar.innerHTML = `
                <div><strong>Status:</strong> ${statusBadge} <small>(v${state.version})</small></div>
                <div>${actionButtons}</div>
            `;
            container.insertBefore(statusBar, container.firstChild);

            const submitBtn = document.getElementById('submit-review-btn');
            if (submitBtn) {
                submitBtn.addEventListener('click', submitForReview);
            }
        }
    }

    async function renderDashboard() {
        const view = document.getElementById('dashboard-view');
        view.innerHTML = '<div style="text-align:center; padding:40px;">Loading dashboard...</div>';

        // 1. Fetch Data
        const [myMonstersReq, pendingReq] = await Promise.all([
            MonsterStorage.getMyMonsters(),
            state.isAdmin ? MonsterStorage.getPendingMonsters() : Promise.resolve({ data: [] })
        ]);

        const myMonsters = myMonstersReq.data || [];
        const pendingMonsters = pendingReq.data || [];

        // 2. Build HTML
        let html = '';

        // -- ADMIN SECTION --
        if (state.isAdmin) {
             html += `
                <div class="dashboard-section admin-queue" style="background:#fff1f0; border:1px solid #ffa39e; padding:20px; border-radius:8px; margin-bottom:30px;">
                    <h2 style="margin-top:0; color:#cf1322;">🛡️ Admin Review Queue</h2>
                    ${pendingMonsters.length === 0 
                        ? '<p>No pending submissions.</p>' 
                        : renderMonsterTable(pendingMonsters, true)}
                </div>
            `;
        }

        // -- USER SECTION --
        html += `
            <div class="dashboard-section">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h2 style="margin:0;">My Monsters</h2>
                    <button class="create-new-btn" style="background:#2ea44f; color:white; padding:8px 16px; border:none; border-radius:6px; cursor:pointer;">+ Create New</button>
                </div>
                ${myMonsters.length === 0 
                    ? '<div style="text-align:center; padding:30px; background:#f6f8fa; border-radius:8px;">You haven\'t created any monsters yet.</div>' 
                    : renderMonsterTable(myMonsters, false)}
            </div>
        `;

        view.innerHTML = html;

        // 3. Attach Listeners
        view.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const isReview = btn.dataset.review === 'true';
                loadMonsterFromDb(id, isReview);
            });
        });

        view.querySelector('.create-new-btn').addEventListener('click', () => {
            resetState();
            switchView('form');
        });
    }

    function renderMonsterTable(monsters, isReviewQueue) {
        return `
            <table class="monster-table" style="width:100%; border-collapse:collapse; background:white; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                <thead style="background:#f6f8fa; border-bottom:2px solid #eee;">
                    <tr>
                        <th style="padding:12px; text-align:left;">Title</th>
                        <th style="padding:12px; text-align:left;">Version</th>
                        <th style="padding:12px; text-align:left;">Status</th>
                        <th style="padding:12px; text-align:left;">Last Updated</th>
                        <th style="padding:12px; text-align:right;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${monsters.map(m => {
                        const date = new Date(m.updated_at).toLocaleDateString();
                        const statusColor = m.status === 'approved' ? 'green' : (m.status === 'pending' ? 'orange' : 'gray');
                        return `
                        <tr style="border-bottom:1px solid #eee;">
                            <td style="padding:12px;"><strong>${MonsterUI.escapeHtml(m.title)}</strong></td>
                            <td style="padding:12px;">v${m.version}</td>
                            <td style="padding:12px;"><span style="color:${statusColor}; font-weight:bold; text-transform:uppercase; font-size:0.8em;">${m.status}</span></td>
                            <td style="padding:12px;">${date}</td>
                            <td style="padding:12px; text-align:right;">
                                <button class="edit-btn" data-id="${m.id}" data-review="${isReviewQueue}" style="padding:5px 10px; cursor:pointer;">
                                    ${isReviewQueue ? 'Review' : 'Edit'}
                                </button>
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
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

    // --- DATA MANIPULATION ---

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
        syncFormState();
        
        // Toggle Buttons
        document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
        const activeButton = document.querySelector(`[data-view="${view}"]`);
        if (activeButton) activeButton.classList.add('active');

        // Toggle Views
        const views = ['form', 'preview', 'dashboard'];
        views.forEach(v => {
            const el = document.getElementById(`${v}-view`);
            if (el) el.classList.remove('active');
        });

        const activeViewEl = document.getElementById(`${view}-view`);
        if (activeViewEl) activeViewEl.classList.add('active');

        // Render Logic
        if (view === 'dashboard') {
            renderDashboard();
        } else {
            render(view);
        }
    }

    // --- DATABASE ACTIONS ---

    async function loadMonsterFromDb(id, isReviewMode = false) {
        const { data, error } = await MonsterStorage.getMonsterById(id);
        
        if (error) {
            console.error(error);
            alert("Error loading monster: " + error.message);
            return;
        }

        // Restore state from JSON content
        state = data.content;
        
        // Enforce DB meta persistence
        state.dbId = data.id;
        state.status = data.status;
        state.version = data.version;
        state.isReviewing = isReviewMode;

        // If reviewing, ensure title reflects it's a review
        if (isReviewMode) {
            console.log("Entering Review Mode for", data.title);
        }

        switchView('form');
    }

    async function saveToDatabase() {
        syncFormState();

        const btn = document.getElementById('save-db-btn');
        const originalText = btn.innerText;
        btn.innerText = "Saving...";
        btn.disabled = true;

        // Perform validation before save (optional, but good practice)
        const validation = MonsterValidator.validateMonster(state);
        if (!validation.valid && !confirm(`This monster has errors:\n- ${validation.errors.join('\n- ')}\n\nSave anyway?`)) {
            btn.innerText = originalText;
            btn.disabled = false;
            return;
        }

        const { data, error } = await MonsterStorage.saveMonster(state, state.dbId);

        btn.innerText = originalText;
        btn.disabled = false;

        if (error) {
            alert("Error saving: " + error.message);
        } else {
            // Update state with result
            state.dbId = data.id;
            state.status = data.status;
            state.version = data.version;
            
            alert(`Saved successfully! (Status: ${state.status.toUpperCase()})`);
            render('form'); // Re-render to show new status/version
        }
    }

    async function submitForReview() {
        if (!state.dbId) {
            alert("Please save the monster first.");
            return;
        }

        if (!confirm("Are you sure you want to submit this for approval? It will appear in the Admin queue.")) return;

        const { data, error } = await MonsterStorage.submitForReview(state.dbId);
        
        if (error) {
            alert("Error submitting: " + error.message);
        } else {
            state.status = 'pending';
            alert("Submitted for review!");
            render('form');
        }
    }

    async function adminAction(action) {
        if (!state.isReviewing || !state.dbId) return;

        const confirmMsg = action === 'approve' 
            ? "Approve this monster? It will become viewable by the public." 
            : "Reject this monster?";
        
        if (!confirm(confirmMsg)) return;

        let result;
        if (action === 'approve') {
            result = await MonsterStorage.approveMonster(state.dbId);
        } else {
            result = await MonsterStorage.rejectMonster(state.dbId);
        }

        if (result.error) {
            alert("Error: " + result.error.message);
        } else {
            alert(`Monster ${action}d successfully.`);
            state.isReviewing = false;
            switchView('dashboard');
        }
    }

    // --- MARKDOWN FILE HANDLING (Legacy/Backup) ---

    function downloadMarkdown() {
        syncFormState();
        const validation = MonsterValidator.validateMonster(state);
        if (!validation.valid) {
            alert("Please fix errors before downloading:\n\n- " + validation.errors.join("\n- "));
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
                // When loading from file, it's a new entry (no dbId)
                state = loadedState;
                state.dbId = null;
                state.status = 'draft';
                state.version = 1;
                
                render('form');
                switchView('form');
                alert(`Successfully loaded from file: ${file.name}`);
            } catch (error) {
                console.error('Error loading markdown:', error);
                alert("Error loading file: " + error.message);
            }
            event.target.value = null;
        };
        reader.readAsText(file);
    }

    // --- AUTH & INITIALIZATION ---

    function updateAuthUI(user) {
        const authContainer = document.getElementById('auth-status');
        if (!authContainer) return;

        if (user) {
            const userName = window.authManager.getUserName();
            
            // Check Admin Status
            MonsterStorage.checkIsAdmin().then(isAdmin => {
                state.isAdmin = isAdmin;
                const adminBadge = isAdmin ? '<span style="background:gold; color:black; padding:2px 6px; border-radius:4px; font-size:0.8em; margin-right:5px; font-weight:bold;">ADMIN</span>' : '';
                
                authContainer.innerHTML = `
                    <div style="display:flex; align-items:center; gap:10px;">
                        ${adminBadge}
                        <span style="font-size: 0.9em;">👤 ${userName}</span>
                        <button id="logout-btn" class="download-btn" style="background:#444; padding: 4px 10px; font-size: 0.8em;">Log Out</button>
                    </div>
                `;
                document.getElementById('logout-btn').addEventListener('click', () => window.authManager.logout());
                
                // If on dashboard, refresh to show admin tools/user data
                if (document.getElementById('dashboard-view').classList.contains('active')) {
                    renderDashboard();
                } else {
                    // Redirect to dashboard on login
                    switchView('dashboard');
                }
            });

            // Auto-fill creator name if empty
            if (!state.creator) {
                state.creator = userName;
                // Don't re-render entire form here to avoid focus loss if already editing
            }
        } else {
            state.isAdmin = false;
            authContainer.innerHTML = `
                <button id="login-btn" class="download-btn" style="background: #5865F2; padding: 4px 10px; font-size: 0.8em;">Login with Discord</button>
            `;
            document.getElementById('login-btn').addEventListener('click', () => window.authManager.login());
            
            // If logged out, show generic form
            switchView('form');
        }
    }

    function init() {
        const container = document.getElementById('generator-app');
        if (!container) return;

        // Updated HTML Structure
        container.innerHTML = `
            <div class="generator-controls" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:20px;">
                <div class="view-toggles">
                    <button class="toggle-btn" data-view="dashboard">Dashboard</button>
                    <button class="toggle-btn active" data-view="form">Edit Form</button>
                    <button class="toggle-btn" data-view="preview">Preview</button>
                </div>

                <div id="auth-status" style="display:flex; align-items:center;">Checking Auth...</div>

                <div style="display: flex; gap: 0.5em;">
                    <button class="download-btn" id="save-db-btn" style="background-color: #2ea44f;">💾 Save Cloud</button>
                    <button class="download-btn" id="download-btn" style="background-color: #0969da;">📥 Download MD</button>
                    <button class="download-btn" id="upload-btn" style="background-color: #6e7781;">📤 Load MD</button>
                    <input type="file" id="upload-input" accept=".md" style="display: none;">
                </div>
            </div>
            
            <div id="dashboard-view" class="view-container"></div>
            <div id="form-view" class="view-container active"></div>
            <div id="preview-view" class="view-container"></div>
        `;

        // Attach listeners
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.addEventListener('click', () => switchView(btn.getAttribute('data-view')));
        });

        document.getElementById('save-db-btn').addEventListener('click', saveToDatabase);
        document.getElementById('download-btn').addEventListener('click', downloadMarkdown);
        document.getElementById('upload-btn').addEventListener('click', () => document.getElementById('upload-input').click());
        document.getElementById('upload-input').addEventListener('change', loadMarkdownFile);

        // Initial Render
        render('form');

        // Initialize Auth
        if (window.authManager) {
            window.authManager.init((user) => {
                updateAuthUI(user);
            });
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