// assets/js/dm-tool/session-ui.js

let activeIncentiveRowData = null;

/* ===========================
   1. UTILITIES
   =========================== */

export function toUnixTimestamp(dateStr, timeZone) {
    if (!dateStr) return 0;
    if (!timeZone) return Math.floor(new Date(dateStr).getTime() / 1000);

    const utcDate = new Date(dateStr + 'Z');
    
    try {
        const fmt = new Intl.DateTimeFormat('en-US', {
            timeZone: timeZone,
            timeZoneName: 'longOffset'
        });
        
        const parts = fmt.formatToParts(utcDate);
        const offsetStr = parts.find(p => p.type === 'timeZoneName').value; 

        if (offsetStr === 'GMT') return Math.floor(utcDate.getTime() / 1000);

        const match = offsetStr.match(/GMT([+-])(\d{1,2}):?(\d{2})?/);
        if (!match) return Math.floor(utcDate.getTime() / 1000); 

        const sign = match[1] === '+' ? 1 : -1;
        const hours = parseInt(match[2], 10);
        const minutes = parseInt(match[3] || '0', 10);
        const offsetMs = (hours * 60 + minutes) * 60 * 1000 * sign;

        return Math.floor((utcDate.getTime() - offsetMs) / 1000);
    } catch (e) {
        console.warn("Date conversion fallback", e);
        return Math.floor(utcDate.getTime() / 1000);
    }
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
   2. ACCORDION & VALIDATION
   =========================== */
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

    const inputs = document.querySelectorAll('[data-required="true"]');
    inputs.forEach(input => {
        const handler = () => validateCard(input.closest('.accordion-card'));
        input.addEventListener('input', handler);
        input.addEventListener('change', handler);
        input.addEventListener('blur', handler);
    });
    
    document.querySelectorAll('.accordion-card').forEach(validateCard);

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
   3. TABS & VISIBILITY
   =========================== */
export function initTabs(outputCallback) {
    const sidebarNav = document.getElementById('sidebar-nav');
    if (sidebarNav) {
        sidebarNav.addEventListener('click', (e) => {
            const item = e.target.closest('.nav-item');
            if (!item) return;

            document.querySelectorAll('#sidebar-nav .nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            document.querySelectorAll('.view-section').forEach(s => s.classList.add('hidden-section'));

            const targetId = item.dataset.target;
            const targetEl = document.getElementById(targetId);
            if(targetEl) {
                targetEl.classList.remove('hidden-section');
                if(targetId === 'view-game-listing' && outputCallback) outputCallback();
                if(targetId === 'view-game-ad' && outputCallback) outputCallback();
                if(targetId === 'view-session-output' && outputCallback) outputCallback();
            }
        });
    }
}

/* ===========================
   4. DATE & TIME
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
        
        // --- FIX: Removed the recursive dispatchEvent call ---
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

/* ===========================
   5. DROPDOWNS & MODALS
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

export function initIncentivesModal(saveCallback) {
    const modal = document.getElementById('modal-incentives');
    const btnCancel = document.getElementById('btn-cancel-incentives');
    const btnSave = document.getElementById('btn-save-incentives');
    
    if(btnCancel) btnCancel.addEventListener('click', () => { activeIncentiveRowData = null; modal.close(); });
    
    if(btnSave) {
        const newBtn = btnSave.cloneNode(true);
        btnSave.parentNode.replaceChild(newBtn, btnSave);
        newBtn.addEventListener('click', () => saveIncentivesInternal(saveCallback));
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
            msgContainer.textContent = `Check any ${isDM ? 'DM' : 'Player'}