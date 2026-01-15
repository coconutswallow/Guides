// assets/js/dm-tool/session-ui.js
import { toUnixTimestamp } from './calculators.js';

let activeIncentiveRowData = null;

/* ===========================
   1. ACCORDION & VALIDATION
   =========================== */
export function initAccordions() {
    const headers = document.querySelectorAll('.accordion-header');
    headers.forEach(header => {
        header.addEventListener('click', (e) => {
            const card = header.closest('.accordion-card');
            const isOpen = card.classList.contains('open');
            
            // Allow multiple open or just toggle current
            if(isOpen) card.classList.remove('open');
            else card.classList.add('open');
        });
    });

    // 1. Standard Input Listeners
    const inputs = document.querySelectorAll('[data-required="true"]');
    inputs.forEach(input => {
        const handler = () => validateCard(input.closest('.accordion-card'));
        input.addEventListener('input', handler);
        input.addEventListener('change', handler);
        input.addEventListener('blur', handler);
    });
    
    // 2. Initial Validation
    document.querySelectorAll('.accordion-card').forEach(validateCard);

    // 3. Polling for Markdown Hidden Inputs
    // Since we don't control the markdown editor's events, we poll the hidden inputs
    // that have the class .md-trigger for value changes.
    setInterval(() => {
        const mdInputs = document.querySelectorAll('.md-trigger');
        let needsValidation = false;
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

function validateCard(card) {
    if(!card) return;
    
    const reqFields = card.querySelectorAll('[data-required="true"]');
    let allValid = true;

    reqFields.forEach(field => {
        if(!field.value || field.value.trim() === "") {
            allValid = false;
        }
    });

    if(allValid) {
        card.classList.add('completed');
    } else {
        card.classList.remove('completed');
    }
}

/* ===========================
   2. TABS & VISIBILITY
   =========================== */
export function initTabs(outputCallback) {
    const sidebarNav = document.getElementById('sidebar-nav');
    if (sidebarNav) {
        sidebarNav.addEventListener('click', (e) => {
            const item = e.target.closest('.nav-item');
            if (!item) return;

            // Handle Active State
            document.querySelectorAll('#sidebar-nav .nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            // Hide all Sections
            document.querySelectorAll('.view-section').forEach(s => s.classList.add('hidden-section'));

            // Show Target Section
            const targetId = item.dataset.target;
            const targetEl = document.getElementById(targetId);
            if(targetEl) {
                targetEl.classList.remove('hidden-section');
                
                // Trigger output gen if going to Listing or Ad view
                if((targetId === 'view-game-listing-output' || targetId === 'view-game-ad') && outputCallback) {
                    outputCallback();
                }
            }
        });
    }
}

/* ===========================
   3. DATE & TIME (Keep Existing)
   =========================== */
export function initDateTimeConverter() {
    const dateInput = document.getElementById('inp-start-datetime');
    const tzSelect = document.getElementById('inp-timezone');
    const unixInput = document.getElementById('inp-unix-time');
    
    if(!dateInput || !tzSelect) return;

    const updateUnix = () => {
        const dateVal = dateInput.value;
        const tzVal = tzSelect.value;
        if(unixInput) unixInput.value = toUnixTimestamp(dateVal, tzVal);
        
        // Trigger validation if inside accordion
        if(dateInput.dataset.required) dateInput.dispatchEvent(new Event('change'));
    };
    
    dateInput.addEventListener('change', updateUnix);
    dateInput.addEventListener('input', updateUnix); 
    tzSelect.addEventListener('change', updateUnix);
}

export function initTimezone() {
    const tzSelect = document.getElementById('inp-timezone');
    if(!tzSelect) return;
    
    const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    tzSelect.innerHTML = '';
    
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

export function unixToLocalIso(unixSeconds, timeZone) {
    try {
        const date = new Date(unixSeconds * 1000);
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
   4. DROPDOWNS (Keep Existing)
   =========================== */
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

/* ===========================
   5. INCENTIVES MODAL (Keep Existing)
   =========================== */
export function initIncentivesModal(saveCallback) {
    const modal = document.getElementById('modal-incentives');
    const btnCancel = document.getElementById('btn-cancel-incentives');
    const btnSave = document.getElementById('btn-save-incentives');
    
    if(btnCancel) btnCancel.addEventListener('click', () => { activeIncentiveRowData = null; modal.close(); });
    
    if(btnSave) {
        const newBtn = btnSave.cloneNode(true);
        btnSave.parentNode.replaceChild(newBtn, btnSave);
        
        newBtn.addEventListener('click', () => {
            saveIncentivesInternal(saveCallback);
        });
    }
}

export function openIncentivesModal(buttonEl, viewContext, isDM, gameRules) {
    activeIncentiveRowData = { button: buttonEl, viewContext: viewContext, isDM: isDM };
    const modal = document.getElementById('modal-incentives');
    const listContainer = document.getElementById('incentives-list');
    const msgContainer = document.getElementById('incentives-message');
    listContainer.innerHTML = ''; 

    const currentSelection = JSON.parse(buttonEl.dataset.incentives || '[]');
    let hasIncentives = false;
    const sourceKey = isDM ? 'DM incentives' : 'player incentives';

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
                label.appendChild(document.createTextNode(`${name} (+${val} DTP)`));
                listContainer.appendChild(label);
            });
        }
    } 
    if (!hasIncentives) msgContainer.textContent = `No ${isDM ? 'DM' : 'Player'} Incentives found in game rules.`;
    modal.showModal();
}

function saveIncentivesInternal(saveCallback) {
    if (!activeIncentiveRowData) return;
    
    const modal = document.getElementById('modal-incentives');
    const checkboxes = modal.querySelectorAll('input[type="checkbox"]:checked');
    const selected = Array.from(checkboxes).map(cb => cb.value);
    
    const btn = activeIncentiveRowData.button;
    btn.dataset.incentives = JSON.stringify(selected);
    btn.innerText = selected.length > 0 ? `+` : '+'; 
    
    if(saveCallback) {
        saveCallback(activeIncentiveRowData.viewContext);
    }
    
    activeIncentiveRowData = null;
    modal.close();
}