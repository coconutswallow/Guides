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
    
    const sessionsData = [];
    const sessionViews = document.querySelectorAll('.session-view');
    
    sessionViews.forEach(view => {
        const dmBtn = view.querySelector('.dm-incentives-btn');
        const dmIncentives = JSON.parse(dmBtn ? dmBtn.dataset.incentives : '[]');

        sessionsData.push({
            session_index: view.dataset.sessionIndex,
            title: view.querySelector('.inp-session-title').value,
            hours: view.querySelector('.inp-session-hours').value,
            date_time: view.querySelector('.inp-session-unix').value, 
            notes: view.querySelector('.inp-session-notes').value,
            summary: view.querySelector('.inp-session-summary').value,
            dm_collaborators: view.querySelector('.inp-dm-collab').value,
            players: Rows.getSessionRosterData(view),
            dm_rewards: {
                level: view.querySelector('.dm-level').value,
                games_played: view.querySelector('.dm-games').value,
                incentives: dmIncentives,
                loot_selected: view.querySelector('.dm-loot-selected').value
            }
        });
    });

    return {
        header: {
            game_datetime: val('inp-unix-time'),
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
            listing_url: val('inp-listing-url'),
            lobby_url: val('inp-lobby-url')
        },
        players: Rows.getMasterRosterData(),
        dm: {
            character_name: val('inp-dm-char-name'),
            level: val('inp-dm-level'),
            games_count: val('inp-dm-games-count')
        },
        sessions: sessionsData
    };
}

export function populateForm(session, createSessionViewCallback, callbacks) {
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

    // Header
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

    // Master Roster
    const tbody = document.getElementById('roster-body');
    if (tbody) {
        tbody.innerHTML = ''; 
        if (session.form_data.players && Array.isArray(session.form_data.players)) {
            session.form_data.players.forEach(player => {
                Rows.addPlayerRowToMaster(player);
            });
        }
    }

    // DM Master Data
    if (session.form_data.dm) {
        const d = session.form_data.dm;
        setVal('inp-dm-char-name', d.character_name);
        setVal('inp-dm-level', d.level);
        setVal('inp-dm-games-count', d.games_count);
    }
    
    // Sessions
    let totalLoadedHours = 0;
    if (session.form_data.sessions && Array.isArray(session.form_data.sessions)) {
        totalLoadedHours = session.form_data.sessions.reduce((acc, s) => acc + (parseFloat(s.hours) || 0), 0);
    }
    
    const headerHoursInput = document.getElementById('header-hours');
    if(headerHoursInput) {
        headerHoursInput.value = totalLoadedHours;
        const sessionDisplay = document.getElementById('header-session-count');
        if(sessionDisplay) sessionDisplay.textContent = (session.form_data.sessions || []).length;
    }

    if (session.form_data.sessions && Array.isArray(session.form_data.sessions)) {
        const count = session.form_data.sessions.length;
        
        // Re-create views
        createSessionViewCallback(count, totalLoadedHours);
        
        // Populate views
        session.form_data.sessions.forEach((sData, i) => {
            const index = i + 1;
            const view = document.getElementById(`view-session-${index}`);
            if(!view) return;
            
            view.querySelector('.inp-session-title').value = sData.title;
            view.querySelector('.inp-session-hours').value = sData.hours; 
            view.querySelector('.inp-session-notes').value = sData.notes || "";
            if (view.querySelector('.inp-session-summary')) view.querySelector('.inp-session-summary').value = sData.summary || "";
            if (view.querySelector('.inp-dm-collab')) view.querySelector('.inp-dm-collab').value = sData.dm_collaborators || "";
            
            if(sData.date_time) {
                view.querySelector('.inp-session-unix').value = sData.date_time;
                const tz = document.getElementById('inp-timezone').value;
                view.querySelector('.inp-session-date').value = UI.unixToLocalIso(sData.date_time, tz);
            }
            
            // Restore DM Data
            if (sData.dm_rewards) {
                view.querySelector('.dm-level').value = sData.dm_rewards.level || "";
                view.querySelector('.dm-games').value = sData.dm_rewards.games_played || "";
                view.querySelector('.dm-loot-selected').value = sData.dm_rewards.loot_selected || "";
                
                const dmBtn = view.querySelector('.dm-incentives-btn');
                const loadedInc = sData.dm_rewards.incentives || [];
                if(dmBtn) {
                    dmBtn.dataset.incentives = JSON.stringify(loadedInc);
                    dmBtn.innerText = loadedInc.length > 0 ? "+" : "+";
                }
            }

            const listContainer = view.querySelector('.player-roster-list');
            listContainer.innerHTML = ''; 
            
            if(sData.players) {
                sData.players.forEach(p => Rows.addSessionPlayerRow(listContainer, p, callbacks));
            }

            if(callbacks.onUpdate) callbacks.onUpdate(view);
        });
    }
    
    generateOutput();
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
    
    // Session Outputs
    const sessionViews = document.querySelectorAll('.session-view');
    sessionViews.forEach(view => {
        const outText = view.querySelector('.out-session-text');
        if(outText) {
            const sTitle = view.querySelector('.inp-session-title').value;
            const sDate = view.querySelector('.inp-session-date').value; 
            const sNotes = view.querySelector('.inp-session-notes').value;
            const sSummary = view.querySelector('.inp-session-summary').value;
            
            outText.value = `**${sTitle}**\n*${sDate}*\n\n**Summary:**\n${sSummary}\n\n**Notes:**\n${sNotes}`;
        }
    });
}

// Added this function which was missing
export function prepareTemplateData(originalData) {
    const data = JSON.parse(JSON.stringify(originalData));
    if (data.header) {
        data.header.game_datetime = null; 
        data.header.listing_url = "";
        data.header.lobby_url = "";
    }
    data.players = []; 
    data.dm = { character_name: "", level: "", games_count: "0" };
    data.sessions = [];
    return data;
}