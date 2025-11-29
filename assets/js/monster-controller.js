const MonsterController = (function() {
    'use strict';

    let state = getInitialState(); // (From your original code)
    let currentId = null;
    let currentMeta = null; // Stores status, parent_id, etc.

    function getInitialState() {
        return {
            layout: 'statblock', title: '', cr: '', size: 'Medium', type: 'Beast', 
            alignment: 'Unaligned', category: '2014 Fair Game', creator: '', 
            image: '', description: '', ac: '', hp: '', speed: '', 
            str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
            traits: [], actions: [], reactions: [], bonusActions: [], 
            legendaryActions: [], lairActions: '', additionalInfo: ''
        };
    }

    /* --- INITIALIZATION --- */
    function init() {
        MonsterService.init();
        
        // Listen for Auth Changes to update header/views
        document.addEventListener('auth-changed', (e) => {
            MonsterUI.renderAuthHeader(e.detail.user, e.detail.isAdmin);
            if (e.detail.user) loadDashboard();
            else switchView('form');
        });

        // Basic Event Listeners
        setupGlobalListeners();
        
        // Initial Render
        render('form');
        // 1. Define the UI Updater function
function updateAuthUI(session) {
    const authHeader = document.getElementById('auth-header');
    
    if (session) {
        // User is LOGGED IN
        const email = session.user.email;
        // Optionally get Discord metadata like avatar:
        // const avatar = session.user.user_metadata.avatar_url;
        
        authHeader.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span>Signed in as <strong>${email}</strong></span>
                <button id="logout-btn" class="download-btn secondary" style="padding: 5px 10px; font-size: 0.8rem;">Sign Out</button>
            </div>
        `;
        
        // Attach Logout Handler
        document.getElementById('logout-btn').addEventListener('click', async () => {
            const { error } = await supabase.auth.signOut();
            if (error) console.error('Error logging out:', error);
        });
        
    } else {
        // User is LOGGED OUT
        authHeader.innerHTML = `
            <button id="login-btn" class="download-btn" style="background-color: #5865F2;">Login with Discord</button>
        `;
        
        // Attach Login Handler
        document.getElementById('login-btn').addEventListener('click', async () => {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'discord',
                options: {
                    redirectTo: window.location.href // Returns to current page
                }
            });
        });
    }
}

// 2. Setup the Listeners (Put this in your init function)
async function initAuth() {
    // Check initial session
    const { data: { session } } = await supabase.auth.getSession();
    updateAuthUI(session);

    // Listen for changes (Login, Logout, Auto-refresh)
    supabase.auth.onAuthStateChange((event, session) => {
        console.log("Auth event:", event); // Helpful for debugging
        updateAuthUI(session);
        
        // Optional: Reload dashboard if they just logged in
        if (event === 'SIGNED_IN' && MonsterController && MonsterController.loadDashboard) {
            MonsterController.loadDashboard(); 
        }
    });
}

// 3. Call it!
initAuth();
        
    }

    function setupGlobalListeners() {
        // Navigation
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.addEventListener('click', () => switchView(btn.dataset.view));
        });

        // Save Button
        document.getElementById('save-db-btn').addEventListener('click', handleSave);
        
        // New Button
        document.getElementById('new-monster-btn').addEventListener('click', () => {
            resetEditor();
            switchView('form');
        });
    }

    /* --- CORE ACTIONS --- */
    async function handleSave() {
        // syncFormState() is from your original code - ensures inputs are in `state`
        syncFormState(); 

        const validation = MonsterValidator.validateMonster(state);
        if (!validation.valid) {
            alert("Please fix validation errors: \n- " + validation.errors.join("\n- "));
            return;
        }

        const btn = document.getElementById('save-db-btn');
        const originalText = btn.textContent;
        btn.textContent = "Saving...";
        btn.disabled = true;

        const { data, error } = await MonsterService.saveMonster(state, currentId);

        btn.textContent = originalText;
        btn.disabled = false;

        if (error) {
            alert("Error saving: " + error.message);
        } else {
            currentId = data[0].id;
            currentMeta = data[0];
            alert("Saved successfully!");
            MonsterUI.updateStatusBadge(currentMeta.status);
        }
    }

    async function handleEditClick(id) {
        const { state: loadedState, meta } = await MonsterService.loadMonster(id);
        
        if (meta.status === 'approved' && !MonsterService.isAdmin()) {
            // REVISION WORKFLOW TRIGGER
            const proceed = confirm(
                "⚠️ This monster is Live/Approved.\n\n" +
                "To edit, we will create a new Revision Draft. The live version stays public until you submit the revision and an Admin approves it.\n\n" +
                "Create Revision?"
            );
            
            if (!proceed) return;

            const { data: revision, error } = await MonsterService.createRevision(id);
            if (error) {
                alert("Error creating revision: " + error.message);
                return;
            }
            
            // Load the NEW revision
            await loadEditor(revision.id);
            alert("Revision created! You are now editing the draft.");
        } else {
            // Normal Edit
            await loadEditor(id);
        }
    }
    
    async function handleCloneClick(id) {
        if(confirm("Clone this monster to your workspace?")) {
            const { data, error } = await MonsterService.cloneMonster(id);
            if(error) alert(error.message);
            else {
                await loadEditor(data.id);
                alert("Cloned successfully!");
            }
        }
    }

    async function loadEditor(id) {
        const { state: loadedState, meta } = await MonsterService.loadMonster(id);
        state = loadedState;
        currentId = meta.id;
        currentMeta = meta;
        
        render('form');
        switchView('form');
        MonsterUI.updateStatusBadge(meta.status);
    }

    function resetEditor() {
        state = getInitialState();
        currentId = null;
        currentMeta = null;
        render('form');
    }

    /* --- DASHBOARD ACTIONS --- */
    async function loadDashboard() {
        const container = document.getElementById('dashboard-view');
        container.innerHTML = '<div class="loading-spinner">Loading...</div>';

        // 1. Get User's Monsters
        const { data: myMonsters } = await MonsterService.getMyMonsters();
        
        // 2. If Admin, Get Review Queue
        let reviewQueue = [];
        if (MonsterService.isAdmin()) {
            const { data } = await MonsterService.getReviewQueue();
            reviewQueue = data || [];
        }

        container.innerHTML = MonsterUI.renderDashboard(myMonsters, reviewQueue, MonsterService.isAdmin());
        attachDashboardListeners(container);
    }

    function attachDashboardListeners(container) {
        // Edit Buttons
        container.querySelectorAll('.action-edit').forEach(btn => {
            btn.addEventListener('click', () => handleEditClick(btn.dataset.id));
        });
        
        // Clone Buttons
        container.querySelectorAll('.action-clone').forEach(btn => {
            btn.addEventListener('click', () => handleCloneClick(btn.dataset.id));
        });

        // Submit Buttons
        container.querySelectorAll('.action-submit').forEach(btn => {
            btn.addEventListener('click', async () => {
                if(confirm("Submit for review? You won't be able to edit while it is pending.")) {
                    await MonsterService.submitForReview(btn.dataset.id);
                    loadDashboard();
                }
            });
        });

        // ADMIN: Approve
        container.querySelectorAll('.action-approve').forEach(btn => {
            btn.addEventListener('click', async () => {
                if(confirm("Approve this monster? If it is a revision, it will replace the live version.")) {
                    await MonsterService.approveMonster(btn.dataset.id);
                    loadDashboard();
                }
            });
        });

        // ADMIN: Reject
        container.querySelectorAll('.action-reject').forEach(btn => {
            btn.addEventListener('click', async () => {
                const reason = prompt("Reason for rejection (optional):"); // Could store this in DB later
                await MonsterService.rejectMonster(btn.dataset.id);
                loadDashboard();
            });
        });
        
         // Delete Buttons
        container.querySelectorAll('.action-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                if(confirm("Are you sure you want to delete this? This cannot be undone.")) {
                    await MonsterService.deleteMonster(btn.dataset.id);
                    loadDashboard();
                }
            });
        });
    }

    // ... Include your existing render(), switchView(), saveFocus(), restoreFocus(), syncFormState() logic here ...
    // Note: In `render(view)`, if view === 'dashboard', call loadDashboard()

    return { init, getState: () => state };
})();