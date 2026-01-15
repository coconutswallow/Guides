// assets/js/dm-tool/session-io.js
import * as Rows from './session-rows.js';
import * as UI from './session-ui.js';

export function getFormData() {
    const val = (id) => {
        const el = document.getElementById(id);
        return el ? el.value : "";
    };
    
    const eventSelect = document.getElementById('inp-event');
    const selectedEvents = eventSelect ? Array.from(eventSelect.selectedOptions).map(opt => opt.value) : [];
    
    const dmBtn = document.getElementById('btn-dm-incentives');
    const dmIncentives = JSON.parse(dmBtn ? dmBtn.dataset.incentives : '[]');

    // Get Session Log Hours safely
    const hoursEl = document.getElementById('inp-session-total-hours');
    const sessionHours = hoursEl ? hoursEl.value : 0;

    const sessionLog = {
        title: val('inp-session-title'),
        date_time: val('inp-session-unix'), 
        hours: sessionHours, 
        notes: val('inp-session-notes'),
        summary: val('inp-session-summary'),
        dm_collaborators: val('inp-dm-collab'),
        players: Rows.getSessionRosterData(),
        dm_rewards: {
            level: val('out-dm-level'),
            games_played: val('out-dm-games'),
            incentives: dmIncentives,
            loot_selected: val('dm-loot-selected')
        }
    };

    return {
        header: {
            // These are the Game Setup fields
            game_datetime: val('inp-unix-time'), // Specific to a scheduled game (cleared in template)
            timezone: val('inp-timezone'),
            intended_duration: val('inp-duration-text'),
            game_description: val('inp-description'), 
            game_version: val('inp-version'),
            game_type: val('inp-format'),
            apps_type: val('inp-apps-type'),
            platform: val('inp-platform'),
            event_tags: selectedEvents, 
            tier: val('inp-tier'),
            apl: val('inp-apl'),
            party_size: val('inp-party-size'),
            tone: val('inp-tone'),
            focus: val('inp-focus'),
            encounter_difficulty: val('inp-diff-encounter'),
            threat_level: val('inp-diff-threat'),
            char_loss: val('inp-diff-loss'),
            house_rules: val('inp-houserules'),
            notes: val('inp-notes'),
            warnings: val('inp-warnings'),
            how_to_apply: val('inp-apply'),
            
            // URLs
            listing_url: val('inp-listing-url'), // Specific to a posted game (cleared in template)
            lobby_url: val('inp-lobby-url'),     // Often reused, kept in template
            loot_plan: val('inp-loot-plan') 
        },
        players: Rows.getMasterRosterData(),
        dm: {
            character_name: val('inp-dm-char-name'),
            level: val('inp-dm-level'),
            games_count: val('inp-dm-games-count')
        },
        session_log: sessionLog
    };
}

export function populateForm(session, callbacks) {
    // 1. Load Header Info (Title)
    if(session.title) {
        const titleEl = document.getElementById('header-game-name');
        if(titleEl) titleEl.value = session.title;
    }
    
    if (!session.form_data) return;
    
    const setVal = (id, val) => { 
        const el = document.getElementById(id); 
        if(el) {
            el.value = val || ""; 
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }
    };

    // 2. Load Game Setup (Header)
    if (session.form_data.header) {
        const h = session.form_data.header;
        setVal('inp-unix-time', h.game_datetime);
        setVal('inp-timezone', h.timezone);
        if(h.game_datetime && h.timezone) {
            const dateStr = UI.unixToLocalIso(h.game_datetime, h.timezone);
            setVal('inp-start-datetime', dateStr);
        }
        setVal('inp-format', h.game_type);
        setVal('inp-tier', h.tier);
        setVal('inp-apl', h.apl);
        setVal('inp-party-size', h.party_size);
        setVal('inp-duration-text', h.intended_duration);
        setVal('inp-platform', h.platform);
        setVal('inp-tone', h.tone);
        setVal('inp-diff-encounter', h.encounter_difficulty);
        setVal('inp-description', h.game_description);
        setVal('inp-version', h.game_version);
        setVal('inp-apps-type', h.apps_type);
        setVal('inp-listing-url', h.listing_url);
        setVal('inp-lobby-url', h.lobby_url);
        setVal('inp-loot-plan', h.loot_plan); 
        
        const eventSelect = document.getElementById('inp-event');
        if (eventSelect && Array.isArray(h.event_tags)) {
            Array.from(eventSelect.options).forEach(opt => {
                opt.selected = h.event_tags.includes(opt.value);
            });
        }
        
        setVal('inp-focus', h.focus);
        setVal('inp-diff-threat', h.threat_level);
        setVal('inp-diff-loss', h.char_loss);
        setVal('inp-houserules', h.house_rules);
        setVal('inp-notes', h.notes);
        setVal('inp-warnings', h.warnings);
        setVal('inp-apply', h.how_to_apply);
    }

    // 3. Load Master Roster
    const tbody = document.getElementById('roster-body');
    if (tbody) {
        tbody.innerHTML = ''; 
        if (session.form_data.players && Array.isArray(session.form_data.players)) {
            session.form_data.players.forEach(player => {
                Rows.addPlayerRowToMaster(player);
            });
        }
    }

    // 4. Load DM Details
    if (session.form_data.dm) {
        const d = session.form_data.dm;
        setVal('inp-dm-char-name', d.character_name);
        setVal('inp-dm-level', d.level);
        setVal('inp-dm-games-count', d.games_count);
    }
    
    // 5. Load Session Log
    const sLog = session.form_data.session_log;
    if (sLog) {
        setVal('inp-session-title', sLog.title);
        setVal('inp-session-total-hours', sLog.hours || 0);
        setVal('inp-session-notes', sLog.notes);
        setVal('inp-session-summary', sLog.summary);
        setVal('inp-dm-collab', sLog.dm_collaborators);
        
        if(sLog.date_time) {
            setVal('inp-session-unix', sLog.date_time);
            const tz = document.getElementById('inp-timezone').value;
            setVal('inp-session-date', UI.unixToLocalIso(sLog.date_time, tz));
        }

        if (sLog.dm_rewards) {
            setVal('out-dm-level', sLog.dm_rewards.level);
            setVal('out-dm-games', sLog.dm_rewards.games_played);
            setVal('dm-loot-selected', sLog.dm_rewards.loot_selected);
            
            const dmBtn = document.getElementById('btn-dm-incentives');
            const loadedInc = sLog.dm_rewards.incentives || [];
            if(dmBtn) {
                dmBtn.dataset.incentives = JSON.stringify(loadedInc);
                dmBtn.innerText = loadedInc.length > 0 ? "+" : "+";
            }
        }

        const listContainer = document.getElementById('session-roster-list');
        listContainer.innerHTML = '';
        if(sLog.players) {
            sLog.players.forEach(p => Rows.addSessionPlayerRow(listContainer, p, callbacks));
        }
    } 
    
    generateOutput();
    if(callbacks.onUpdate) callbacks.onUpdate();
}

export function generateOutput() {
    const data = getFormData().header;
    const unixTime = document.getElementById('inp-unix-time').value;
    const name = document.getElementById('header-game-name').value || "Untitled";
    
    let timeString = "TBD";
    if (unixTime && unixTime > 0) {
        timeString = `<t:${unixTime}:F>`;
    }
    
    const listingText = `\`\`\`
**Start Time:** ${timeString}
**Name:** ${name}
**Description:**
${data.game_description || 'N/A'}
**Version:** ${data.game_version || 'N/A'}
**Format:** ${data.game_type || 'N/A'}
**Tier and APL:** ${data.tier || 'N/A'} (${data.apl || 'N/A'})
**Party Size:** ${data.party_size || 'N/A'}
**Applications:** ${data.apps_type || 'N/A'}
**Tone:** ${data.tone || 'N/A'}
**Focus:** ${data.focus || 'N/A'}
**Difficulty:** ${data.encounter_difficulty || 'N/A'}
- **Encounter Difficulty:** ${data.encounter_difficulty || 'N/A'}
- **Chance of Character Loss:** ${data.char_loss || 'N/A'}
- **Enemy Threat Level:** ${data.threat_level || 'N/A'}
- **Environment Hazard Level:** N/A
**Lobby:** ${data.lobby_url || 'N/A'}
**Platform:** ${data.platform || 'N/A'}
**Duration:** ${data.intended_duration || 'N/A'}
**House Rules:**
${data.house_rules || 'N/A'}
**Notes:**
${data.notes || 'N/A'}
**Content Warnings:**
${data.warnings || 'N/A'}
**How to Apply:**
${data.how_to_apply || 'Post your application below.'}
\`\`\``;

    const outListing = document.getElementById('out-listing-text');
    if(outListing) outListing.value = listingText;
    
    const adText = `\`\`\`
> **Name:** ${name}
**Version and Format:** ${data.game_version} / ${data.game_type}
**Tier and APL:** ${data.tier || 'N/A'} , APL ${data.apl || 'N/A'}
**Start Time and Duration:** ${timeString} (${data.intended_duration || 'N/A'})
**Listing:** ${data.listing_url || 'N/A'}
**Description:**
${data.game_description || ''}
\`\`\``;

    const outAd = document.getElementById('out-ad-text');
    if(outAd) outAd.value = adText; 
    
    const outText = document.getElementById('out-session-text');
    if(outText) {
        const sTitle = document.getElementById('inp-session-title').value;
        const sDate = document.getElementById('inp-session-date').value; 
        const sNotes = document.getElementById('inp-session-notes').value;
        const sSummary = document.getElementById('inp-session-summary').value;
        
        outText.value = `**${sTitle}**\n*${sDate}*\n\n**Summary:**\n${sSummary}\n\n**Notes:**\n${sNotes}`;
    }
}

/**
 * Filters the data to only include generic Game Setup fields.
 * Strips out specific dates, players, and session logs.
 */
export function prepareTemplateData(originalData) {
    const data = JSON.parse(JSON.stringify(originalData));
    
    // 1. Filter Header / Game Setup Fields
    if (data.header) {
        data.header.game_datetime = null; // Clear Start Date
        data.header.listing_url = "";     // Clear Listing URL
        
        // PRESERVED:
        // - Timezone
        // - Intended Duration
        // - Game Description
        // - All Game Settings (Format, Version, App Type, Platform, Events)
        // - All Party Config (Tier, APL, Party Size)
        // - All Tone & Difficulty
        // - All Details & Rules
        // - Lobby URL (kept as it is usually consistent)
    }

    // 2. Clear Roster (Templates should not have players)
    data.players = []; 

    // 3. Clear DM Details (Optional: User can re-enter this per game)
    data.dm = { character_name: "", level: "", games_count: "0" };

    // 4. Clear Session Log (Templates are for fresh games)
    data.session_log = { 
        title: "", // Clear specific session name
        hours: 0, 
        notes: "", 
        summary: "", 
        players: [], 
        dm_rewards: {} 
    };
    
    return data;
}