// assets/js/dm-tool/session-ui.js

/**
 * @file session-ui.js
 * @description Manages User Interface interactions for the Session Editor.
 * This module handles:
 * 1. Date and Time conversions (ISO strings <-> Unix Timestamps).
 * 2. Accordion expansion and field validation.
 * 3. Tab navigation and view switching.
 * 4. Dynamic dropdown population (Timezones).
 * 5. Modal management for selecting game incentives.
 * @module SessionUI
 */

/** * Temporary state storage for the currently open Incentives Modal.
 * Stores references to the triggering button and context (DM vs Player)
 * so the save handler knows where to write the data back.
 * @type {Object|null}
 */
let activeIncentiveRowData = null;

/* ===========================
   1. UTILITIES
   =========================== */

/**
 * Converts a date string and timezone into a Unix Timestamp (seconds).
 * Handles timezone offsets manually via Intl.DateTimeFormat to ensure accuracy across browsers.
 * * @param {string} dateStr - The ISO date string (e.g., "2024-01-01T12:00").
 * @param {string} timeZone - The IANA timezone identifier (e.g., "America/New_York").
 * @returns {number} Unix timestamp in seconds.
 */
export function toUnixTimestamp(dateStr, timeZone) {
    if (!dateStr) return 0;
    // If no timezone is provided, assume local browser time
    if (!timeZone) return Math.floor(new Date(dateStr).getTime() / 1000);

    // Append 'Z' to treat input as UTC base for calculation, then adjust offset
    const utcDate = new Date(dateStr + 'Z');
    
    try {
        // Extract the specific offset for the given timezone and date
        const fmt = new Intl.DateTimeFormat('en-US', {
            timeZone: timeZone,
            timeZoneName: 'longOffset'
        });
        
        const parts = fmt.formatToParts(utcDate);
        const offsetStr = parts.find(p => p.type === 'timeZoneName').value; 

        // Handle GMT case (no offset)
        if (offsetStr === 'GMT') return Math.floor(utcDate.getTime() / 1000);

        // Parse offset string (e.g., "GMT-05:00" or "GMT+1")
        const match = offsetStr.match(/GMT([+-])(\d{1,2}):?(\d{2})?/);
        if (!match) return Math.floor(utcDate.getTime() / 1000); 

        const sign = match[1] === '+' ? 1 : -1;
        const hours = parseInt(match[2], 10);
        const minutes = parseInt(match[3] || '0', 10);
        const offsetMs = (hours * 60 + minutes) * 60 * 1000 * sign;

        // Apply inverse offset to get the correct timestamp
        return Math.floor((utcDate.getTime() - offsetMs) / 1000);
    } catch (e) {
        console.warn("Date conversion fallback", e);
        return Math.floor(utcDate.getTime() / 1000);
    }
}

/**
 * Converts a Unix Timestamp to a local ISO string formatted for `datetime-local` inputs.
 * * @param {number} unixSeconds - Unix timestamp in seconds.
 * @param {string} timeZone - The IANA timezone identifier.
 * @returns {string} Formatted string "YYYY-MM-DDTHH:mm".
 */
export function unixToLocalIso(unixSeconds, timeZone) {
    try {
        const date = new Date(unixSeconds * 1000);
        // Use Canadian English locale for consistent YYYY-MM-DD format
        const fmt = new Intl.DateTimeFormat('en-CA', {
            timeZone: timeZone,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hour12: false
        });
        const parts = fmt.formatToParts(date);
        const get = (t) => parts.find(p => p.type === t).value;
        return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
    } catch(e) {
        console.error("Date conversion error", e);
        return "";
    }
}

/* ===========================
   2. ACCORDION & VALIDATION
   =========================== */

/**
 * Initializes UI Accordions.
 * - Adds click listeners to toggle open/closed states.
 * - Attaches validation listeners to required fields within accordions.
 * - Sets up a poller to validate fields updated programmatically (e.g., date pickers).
 */
export function initAccordions() {
    const headers = document.querySelectorAll('.accordion-header');
    headers.forEach(header => {
        header.addEventListener('click', (e) => {
            const card = header.closest('.accordion-card');
            const isOpen = card.classList.contains('open');
            if(isOpen) card.classList.remove('open');
            else card.classList.add('open');
        });
    });

    // Real-time validation for required inputs
    const inputs = document.querySelectorAll('[data-required="true"]');
    inputs.forEach(input => {
        const handler = () => validateCard(input.closest('.accordion-card'));
        input.addEventListener('input', handler);
        input.addEventListener('change', handler);
        input.addEventListener('blur', handler);
    });
    
    // Initial validation pass
    document.querySelectorAll('.accordion-card').forEach(validateCard);

    // Polling mechanism for inputs that are modified by external JS (e.g., md-trigger)
    setInterval(() => {
        const mdInputs = document.querySelectorAll('.md-trigger');
        mdInputs.forEach(input => {
            const oldVal = input.dataset.lastVal || "";
            const newVal = input.value;
            if(oldVal !== newVal) {
                input.dataset.lastVal = newVal;
                validateCard(input.closest('.accordion-card'));
            }
        });
    }, 1000); 
}

/**
 * Validates a specific accordion card.
 * Checks all child inputs with `data-required="true"`.
 * Adds/removes the 'completed' CSS class based on validation status.
 * * @param {HTMLElement} card - The accordion card element.
 */
function validateCard(card) {
    if(!card) return;
    const reqFields = card.querySelectorAll('[data-required="true"]');
    let allValid = true;
    reqFields.forEach(field => {
        if(!field.value || field.value.trim() === "") allValid = false;
    });
    if(allValid) card.classList.add('completed');
    else card.classList.remove('completed');
}
/* ===========================
   TAB DEFINITIONS
   =========================== */
// Define the logical order of tabs for the "Next/Prev" buttons
const TAB_ORDER = [
    'view-start',
    'view-game-setup',
    'view-game-listing',
    'view-game-ad',
    'view-player-setup',
    'view-loot-plan',
    'view-session-lobby',
    'view-session-details',
    'view-session-output',
    'view-mal-update',
    'view-records'
];

/* ===========================
   3. TABS & VISIBILITY
   =========================== */
/* ===========================
   3. TABS & VISIBILITY
   =========================== */

/**
 * Initializes Sidebar Navigation & Mobile Wizard Buttons.
 */
export function initTabs(outputCallback) {
    // 1. Sidebar Click Handler
    const sidebarNav = document.getElementById('sidebar-nav');
    if (sidebarNav) {
        sidebarNav.addEventListener('click', (e) => {
            const item = e.target.closest('.nav-item');
            if (!item) return;
            switchTab(item.dataset.target, outputCallback);
        });
    }

    // 2. Mobile "Next/Prev" Button Handlers
    const btnPrev = document.getElementById('btn-mobile-prev');
    const btnNext = document.getElementById('btn-mobile-next');

    if (btnPrev && btnNext) {
        btnPrev.addEventListener('click', () => navigateMobileStep(-1, outputCallback));
        btnNext.addEventListener('click', () => navigateMobileStep(1, outputCallback));
    }
    
    // Initialize buttons for the starting view
    updateMobileButtons('view-start');
}

/**
 * Core function to switch tabs (used by both Sidebar and Mobile Buttons).
 */
function switchTab(targetId, outputCallback) {
    // Update Sidebar Active State
    document.querySelectorAll('#sidebar-nav .nav-item').forEach(n => {
        n.classList.toggle('active', n.dataset.target === targetId);
    });

    // Hide all sections
    document.querySelectorAll('.view-section').forEach(s => s.classList.add('hidden-section'));

    // Show target section
    const targetEl = document.getElementById(targetId);
    if(targetEl) {
        targetEl.classList.remove('hidden-section');
        
        // Mobile-specific updates
        updateMobileButtons(targetId);
        
        // Auto-close sidebar on mobile if open
        const sidebar = document.getElementById('sidebar-nav');
        const overlay = document.getElementById('mobile-overlay');
        if (sidebar && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
        }

        // Trigger Output Generation Callback
        handleOutputGeneration(targetId, outputCallback);
        
        // Scroll to top
        const main = document.querySelector('.editor-main');
        if(main) main.scrollTop = 0;
        window.scrollTo(0, 0); // For mobile body scroll
    }
}

/**
 * Handles the logic for moving Next (+1) or Prev (-1) in the sequence.
 */
function navigateMobileStep(direction, outputCallback) {
    // Find current active tab
    const activeItem = document.querySelector('#sidebar-nav .nav-item.active');
    if (!activeItem) return;

    const currentId = activeItem.dataset.target;
    const currentIndex = TAB_ORDER.indexOf(currentId);

    if (currentIndex === -1) return;

    const newIndex = currentIndex + direction;

    // Boundary checks
    if (newIndex >= 0 && newIndex < TAB_ORDER.length) {
        switchTab(TAB_ORDER[newIndex], outputCallback);
    }
}

/**
 * Updates the text and disabled state of the Mobile Buttons based on current step.
 */
function updateMobileButtons(currentId) {
    const btnPrev = document.getElementById('btn-mobile-prev');
    const btnNext = document.getElementById('btn-mobile-next');
    const indicator = document.getElementById('mobile-step-text');
    
    if (!btnPrev || !btnNext) return;

    const index = TAB_ORDER.indexOf(currentId);
    
    // Update Indicator Text (e.g., "1. Game Setup")
    const activeNavItem = document.querySelector(`#sidebar-nav .nav-item[data-target="${currentId}"]`);
    if (activeNavItem && indicator) {
        // Strip the number prefix for cleaner mobile display if needed, 
        // or just show the whole text. Let's show "Step X: [Name]"
        indicator.innerText = activeNavItem.innerText; 
    }

    // Prev Button State
    if (index <= 0) {
        btnPrev.disabled = true;
        btnPrev.style.opacity = '0.3';
    } else {
        btnPrev.disabled = false;
        btnPrev.style.opacity = '1';
    }

    // Next Button State
    if (index >= TAB_ORDER.length - 1) {
        btnNext.disabled = true;
        btnNext.innerText = "Finish";
    } else {
        btnNext.disabled = false;
        btnNext.innerText = "Next →";
    }
}

/**
 * Helper to trigger callbacks when specific tabs are opened.
 */
function handleOutputGeneration(targetId, outputCallback) {
    if (!outputCallback) return;

    if (targetId === 'view-game-listing' || 
        targetId === 'view-game-ad' || 
        targetId === 'view-session-output') {
        outputCallback();
    }

    if (targetId === 'view-session-lobby') {
        // Auto-fill logic specific to this tab
        const lobbyUrlVal = document.getElementById('inp-lobby-url')?.value;
        const sessionLobbyInput = document.getElementById('inp-game-listing-url'); 
        if(lobbyUrlVal && sessionLobbyInput && !sessionLobbyInput.value) {
            sessionLobbyInput.value = lobbyUrlVal;
        }
        outputCallback();
    }
}

/* ===========================
   4. DATE & TIME
   =========================== */

/**
 * Binds the Date and Timezone inputs to the hidden Unix timestamp field.
 * Ensures that whenever the visual date or timezone changes, the logic-friendly timestamp is updated.
 */
export function initDateTimeConverter() {
    const dateInput = document.getElementById('inp-start-datetime');
    const tzSelect = document.getElementById('inp-timezone');
    const unixInput = document.getElementById('inp-unix-time');
    
    if(!dateInput || !tzSelect) return;

    const updateUnix = () => {
        const dateVal = dateInput.value;
        const tzVal = tzSelect.value;
        if(unixInput) unixInput.value = toUnixTimestamp(dateVal, tzVal);
    };
    
    dateInput.addEventListener('change', updateUnix);
    dateInput.addEventListener('input', updateUnix); 
    tzSelect.addEventListener('change', updateUnix);
}

/**
 * Populates the Timezone dropdown.
 * Attempts to detect the user's local timezone for default selection.
 * Uses `Intl.supportedValuesOf` to get a valid list of IANA timezones.
 */
export function initTimezone() {
    const tzSelect = document.getElementById('inp-timezone');
    if(!tzSelect) return;
    
    const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    tzSelect.innerHTML = '';
    
    // Fallback list if browser doesn't support supportedValuesOf
    let timezones = Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : ["UTC", "America/New_York"];
    if (!timezones.includes(userTz)) timezones.push(userTz);
    
    timezones.sort().forEach(tz => {
        const opt = document.createElement('option');
        opt.value = tz;
        opt.textContent = tz.replace(/_/g, " "); 
        if(tz === userTz) opt.selected = true;
        tzSelect.appendChild(opt);
    });
}

/* ===========================
   5. DROPDOWNS & MODALS
   =========================== */

/**
 * Helper to populate a simple HTML Select element with an array of string options.
 * * @param {string} id - The DOM ID of the select element.
 * @param {Array<string>} options - Array of string values to populate.
 */
export function fillDropdown(id, options) {
    const select = document.getElementById(id);
    if (!select) return;
    select.innerHTML = '<option value="">Select...</option>';
    options.forEach(opt => {
        const el = document.createElement('option');
        el.value = opt;
        el.textContent = opt;
        select.appendChild(el);
    });
}

/**
 * Initializes the Incentives Modal logic (Cancel/Save buttons).
 * * @param {Function} saveCallback - Callback to execute after saving (usually to refresh state).
 */
export function initIncentivesModal(saveCallback) {
    const modal = document.getElementById('modal-incentives');
    const btnCancel = document.getElementById('btn-cancel-incentives');
    const btnSave = document.getElementById('btn-save-incentives');
    
    if(btnCancel) btnCancel.addEventListener('click', () => { activeIncentiveRowData = null; modal.close(); });
    
    // Clone button to strip existing listeners (prevents multiple bindings if init called twice)
    if(btnSave) {
        const newBtn = btnSave.cloneNode(true);
        btnSave.parentNode.replaceChild(newBtn, btnSave);
        newBtn.addEventListener('click', () => saveIncentivesInternal(saveCallback));
    }
}

/**
 * Opens the Incentives selection modal.
 * dynamically populates checkboxes based on the Game Rules provided.
 * * @param {HTMLElement} buttonEl - The button that triggered the modal (used to store result dataset).
 * @param {number|null} viewContext - Index/ID context for the update (passed to callback).
 * @param {boolean} isDM - True if opening for DM incentives, False for Player incentives.
 * @param {Object} gameRules - The rules object containing incentive definitions.
 */
export function openIncentivesModal(buttonEl, viewContext, isDM, gameRules) {
    activeIncentiveRowData = { button: buttonEl, viewContext: viewContext, isDM: isDM };
    const modal = document.getElementById('modal-incentives');
    const listContainer = document.getElementById('incentives-list');
    const msgContainer = document.getElementById('incentives-message');
    listContainer.innerHTML = ''; 

    // Retrieve currently selected incentives from button dataset
    const currentSelection = JSON.parse(buttonEl.dataset.incentives || '[]');
    let hasIncentives = false;
    const sourceKey = isDM ? 'DM incentives' : 'player incentives';

    // Build Checkbox List from Rules
    if (gameRules && gameRules[sourceKey]) {
        const entries = Object.entries(gameRules[sourceKey]);
        if (entries.length > 0) {
            hasIncentives = true;
            msgContainer.textContent = `Check any ${isDM ? 'DM' : 'Player'} incentives that apply.`;
            entries.forEach(([name, val]) => {
                const label = document.createElement('label');
                label.className = 'checkbox-item';
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = name;
                if (currentSelection.includes(name)) checkbox.checked = true;
                
                label.appendChild(checkbox);
                
                // UPDATED: Handle Object vs Number values in Game Rules
                // Some incentives are simple numbers (DTP), others are objects (DTP + Loot Rolls)
                let desc = "";
                if (typeof val === 'number') {
                    desc = ` (+${val} DTP)`;
                } else if (typeof val === 'object') {
                    // DM Incentives usually have objects
                    const dtp = val['bonus DTP'] || val.DTP || 0;
                    const roll = val['bonus loot roll'] || 0;
                    const parts = [];
                    if (dtp > 0) parts.push(`+${dtp} DTP`);
                    if (roll > 0) parts.push(`+${roll} Loot Roll`);
                    if (parts.length > 0) desc = ` (${parts.join(', ')})`;
                }
                
                label.appendChild(document.createTextNode(`${name}${desc}`));
                listContainer.appendChild(label);
            });
        }
    } 
    if (!hasIncentives) msgContainer.textContent = `No ${isDM ? 'DM' : 'Player'} Incentives found in game rules.`;
    modal.showModal();
}

/**
 * Internal handler for the Modal's "Save" button.
 * Collects checked values, updates the source button's dataset/text, and triggers the callback.
 * * @param {Function} saveCallback - The external callback to update state.
 */
function saveIncentivesInternal(saveCallback) {
    if (!activeIncentiveRowData) return;
    const modal = document.getElementById('modal-incentives');
    const checkboxes = modal.querySelectorAll('input[type="checkbox"]:checked');
    const selected = Array.from(checkboxes).map(cb => cb.value);
    
    // Update the button that opened the modal
    const btn = activeIncentiveRowData.button;
    btn.dataset.incentives = JSON.stringify(selected);
    
    // Logic: If it's the Player Card small button, keep the "+" style.
    // If it's the large "Add Additional Incentives" button, keep/update that text.
    if (btn.classList.contains('s-incentives-btn')) {
        btn.innerText = selected.length > 0 ? "+" : "+";
    } else {
        // Optional: Change text to "Edit Incentives" if items are selected
        btn.innerText = selected.length > 0 ? "Edit Incentives" : "Add Additional Incentives";
    }
    
    // Sync display text if sibling input exists
    // (This handles both the DM view and any future layouts)
    const wrapper = btn.closest('.dtp-wrapper');
    if (wrapper) {
        const displayInput = wrapper.querySelector('input[type="text"]');
        if (displayInput) {
            displayInput.value = selected.join(', ');
        }
    }
    
    // Execute state update callback
    if(saveCallback) saveCallback(activeIncentiveRowData.viewContext);
    
    activeIncentiveRowData = null;
    modal.close();
}