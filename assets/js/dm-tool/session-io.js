// assets/js/dm-tool/session-io.js
// COMPLETE VERSION - No functionality removed
import * as Rows from './session-rows.js';
import * as UI from './session-ui.js';
import { fetchGameRules } from './data-manager.js';

export function getFormData() {
    const val = (id) => {
        const el = document.getElementById(id);
        return el ? el.value : "";
    };
    
    const eventSelect = document.getElementById('inp-event');
    const selectedEvents = eventSelect ? Array.from(eventSelect.selectedOptions).map(opt => opt.value) : [];
    
    const tierSelect = document.getElementById('inp-tier');
    let selectedTiers = [];
    if (tierSelect && tierSelect.selectedOptions) {
        selectedTiers = Array.from(tierSelect.selectedOptions).map(opt => opt.value);
    } else if (tierSelect) {
        selectedTiers = tierSelect.value ? [tierSelect.value] : [];
    }

    const dmBtn = document.getElementById('btn-dm-loot-incentives');
    const dmIncentives = JSON.parse(dmBtn ? dmBtn.dataset.incentives : '[]');

    const hoursEl = document.getElementById('inp-session-total-hours');
    const sessionHours = hoursEl ? hoursEl.value : 0;
    
    // DM Forfeit State
    const dmForfeitXp = document.getElementById('chk-dm-forfeit-xp') ? document.getElementById('chk-dm-forfeit-xp').checked : false;

    const sessionLog = {
        title: val('header-game-name'), 
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
            loot_selected: val('dm-loot-selected'),
            forfeit_xp: dmForfeitXp
        }
    };

    return {
        header: {
            title: val('header-game-name'), // ADDED - was missing
            game_datetime: val('inp-unix-time'), 
            timezone: val('inp-timezone'),
            intended_duration: val('inp-duration-text'),
            game_description: val('inp-description'), 
            game_version: val('inp-version'),
            game_type: val('inp-format'),
            apps_type: val('inp-apps-type'),
            platform: val('inp-platform'),
            event_tags: selectedEvents, 
            tier: selectedTiers,
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
            lobby_url: val('inp-lobby-url'),     
            loot_plan: val('inp-loot-plan'),
            predet_perms: val('inp-predet-perms'),
            predet_cons: val('inp-predet-cons')
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

export function populateForm(session, callbacks, options = {}) {
    if(session.title && !options.keepTitle) {
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

    if (session.form_data.header) {
        const h = session.form_data.header;
        setVal('inp-unix-time', h.game_datetime);
        setVal('inp-timezone', h.timezone);
        if(h.game_datetime && h.timezone) {
            const dateStr = UI.unixToLocalIso(h.game_datetime, h.timezone);
            setVal('inp-start-datetime', dateStr);
        }
        setVal('inp-format', h.game_type);
        
        const tierSelect = document.getElementById('inp-tier');
        if (tierSelect) {
            const values = Array.isArray(h.tier) ? h.tier : [h.tier];
            if (tierSelect.tagName === 'SELECT' && tierSelect.options) {
                Array.from(tierSelect.options).forEach(opt => {
                    opt.selected = values.includes(opt.value);
                });
            } else {
                tierSelect.value = values.join(', ');
            }
        }
        
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
        setVal('inp-predet-perms', h.predet_perms || "0");
        setVal('inp-predet-cons', h.predet_cons || "0");
        
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

    const tbody = document.getElementById('roster-body');
    if (tbody) {
        tbody.innerHTML = ''; 
        if (session.form_data.players && Array.isArray(session.form_data.players)) {
            session.form_data.players.forEach(player => {
                Rows.addPlayerRowToMaster(player);
            });
        }
    }

    if (session.form_data.dm) {
        const d = session.form_data.dm;
        setVal('inp-dm-char-name', d.character_name);
        setVal('inp-dm-level', d.level);
        setVal('inp-dm-games-count', d.games_count);
        
        // Sync hidden DM fields in Session Details tab
        setVal('out-dm-name', d.character_name);
        setVal('out-dm-level', d.level);
        setVal('out-dm-games', d.games_count);
    }

    const sLog = session.form_data.session_log;
    if (sLog) {
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
            
            // Restore DM Forfeit XP
            const dmForfeit = document.getElementById('chk-dm-forfeit-xp');
            if (dmForfeit) {
                dmForfeit.checked = !!sLog.dm_rewards.forfeit_xp;
                dmForfeit.addEventListener('change', () => {
                   if(callbacks.onUpdate) callbacks.onUpdate();
                });
            }
            
            const dmBtn = document.getElementById('btn-dm-loot-incentives');
            const loadedInc = sLog.dm_rewards.incentives || [];
            if(dmBtn) {
                dmBtn.dataset.incentives = JSON.stringify(loadedInc);
                dmBtn.innerText = loadedInc.length > 0 ? "Edit Incentives" : "Add Additional Incentives";
                
                const disp = document.getElementById('disp-dm-incentives');
                if(disp) disp.value = loadedInc.join(', ');
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

export async function generateOutput() {
    const getVal = (id) => {
        const el = document.getElementById(id);
        return el ? el.value : "";
    };

    // 1. Data Collection
    const data = getFormData().header;
    const unixTime = getVal('inp-unix-time');
    const name = getVal('header-game-name') || "Untitled";
    const sessionSummary = getVal('session-summary'); // New: Target for split logic
    
    // 2. Time String Calculation
    let timeString = "TBD";
    if (unixTime && unixTime > 0) {
        timeString = `<t:${unixTime}:F>`;
    }
    
    // 3. Tier and APL Logic
    let tierString = 'N/A';
    if (Array.isArray(data.tier) && data.tier.length > 0) {
        const sortedTiers = data.tier.sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.replace(/\D/g, '')) || 0;
            return numA - numB;
        });
        
        if (sortedTiers.length === 1) {
            tierString = sortedTiers[0];
        } else {
            const first = sortedTiers[0];
            const last = sortedTiers[sortedTiers.length - 1];
            tierString = `${first} to ${last}`;
        }
    } else if (typeof data.tier === 'string' && data.tier) {
        tierString = data.tier;
    }

    // 4. Construct Segments for Listing Output
    const listingTop = `**Start Time:** ${timeString}
**Name:** ${name}
**Description:**
${data.game_description || 'N/A'}

**Version:** ${data.game_version || 'N/A'}
**Format:** ${data.game_type || 'N/A'}
**Tier and APL:** ${tierString} (${data.apl || 'N/A'})
**Party Size:** ${data.party_size || 'N/A'}
**Applications:** ${data.apps_type || 'N/A'}
**Tone:** ${data.tone || 'N/A'}
**Focus:** ${data.focus || 'N/A'}
**Difficulty:**
- **Encounter Difficulty:** ${data.encounter_difficulty || 'N/A'}
- **Chance of Character Loss:** ${data.char_loss || 'N/A'}
- **Enemy Threat Level:** ${data.threat_level || 'N/A'}
- **Environment Hazard Level:** N/A
**Lobby:** ${data.lobby_url || 'N/A'}
**Platform:** ${data.platform || 'N/A'}
**Duration:** ${data.intended_duration || 'N/A'}\n`;

    const listingSummary = `\n**Session Summary:**\n${sessionSummary || 'N/A'}\n`;

    const listingBottom = `\n**House Rules:**
${data.house_rules || 'N/A'}

**Notes:**
${data.notes || 'N/A'}

**Content Warnings:**
${data.warnings || 'N/A'}

**How to Apply:**
${data.how_to_apply || 'Post your application below.'}`;

    // 5. Check 999 Character Limit and Update UI
    const fullListingText = listingTop + listingSummary + listingBottom;
    const outListing = document.getElementById('out-listing-text');
    const secondaryWrapper = document.getElementById('secondary-output-wrapper');
    const outSummary = document.getElementById('out-summary-text');

    if (fullListingText.length > 999) {
        // Split detected: Show both textareas and split content
        if (outListing) outListing.value = listingTop;
        if (outSummary) outSummary.value = listingSummary + listingBottom;
        if (secondaryWrapper) {
            secondaryWrapper.classList.remove('d-none');
            secondaryWrapper.style.display = "block"; // Ensure it's visible
        }
    } else {
        // No split needed: Hide secondary and put everything in Part 1
        if (outListing) outListing.value = fullListingText;
        if (secondaryWrapper) {
            secondaryWrapper.classList.add('d-none');
            secondaryWrapper.style.display = "none"; // Explicitly hide
        }
        if (outSummary) outSummary.value = ""; // Clear Part 2
    }
    
    // 6. AD/Ping Logic (Always remains as a single output)
    const rules = await fetchGameRules();
    let pingString = "";
    
    if (rules && rules.tier && Array.isArray(data.tier)) {
        const pings = new Set();
        data.tier.forEach(t => {
            const tierData = rules.tier[t];
            if (tierData) {
                if (data.game_type === "Voice") {
                    if (tierData["voice ping"]) pings.add(tierData["voice ping"]);
                } else if (data.game_type === "PBP" || data.game_type === "Live Text") {
                    if (tierData["PBP ping"]) pings.add(tierData["PBP ping"]);
                }
            }
        });
        if (pings.size > 0) pingString = Array.from(pings).join(' ');
    }

    const adText = `**Game Name:** ${name}
**Version and Format:** ${data.game_version} / ${data.game_type}
**Tier and APL:** ${tierString} , APL ${data.apl || 'N/A'}
**Start Time and Duration:** ${timeString} (${data.intended_duration || 'N/A'})
**Listing:** ${data.listing_url || 'N/A'}

**Description:**
${data.game_description || ''}

${pingString}`;

    const outAd = document.getElementById('out-ad-text');
    if(outAd) outAd.value = adText;
}

export function prepareTemplateData(originalData) {
    const data = JSON.parse(JSON.stringify(originalData));
    
    if (data.header) {
        data.header.game_datetime = null; 
        data.header.listing_url = "";     
    }

    data.players = []; 
    data.dm = { character_name: "", level: "", games_count: "0" };
    data.session_log = { 
        title: "", 
        hours: 0, 
        notes: "", 
        summary: "", 
        players: [], 
        dm_rewards: {} 
    };
    
    return data;
}

export async function generateSessionLogOutput(dmDiscordId) {
    const data = getFormData();
    
    // Header information
    const gameName = document.getElementById('header-game-name')?.value || "Untitled";
    const gameVersion = data.header.game_version || "N/A";
    const gameFormat = data.header.game_type || "N/A";
    
    // Check if we already have session data logged
    const sessionNotes = data.session_log.notes || "";
    const hasSessionData = sessionNotes.trim().length > 0;
    const appsType = hasSessionData ? "Prefilled" : (data.header.apps_type || "N/A");
    
    const tierEl = document.getElementById('setup-val-tier');
    const tier = tierEl ? tierEl.textContent : "1";
    
    const aplEl = document.getElementById('setup-val-apl');
    const apl = aplEl ? aplEl.textContent : "1";
    
    const sessionHours = data.session_log.hours || 3;
    const sessionSummary = data.session_log.summary || "";
    const dmCollaborators = data.session_log.dm_collaborators || "";
    
    // Build player lines
    let playerLines = [];
    const players = data.session_log.players || [];
    
    players.forEach(player => {
        let line = `- `;
        
        // Discord ID or Username
        const displayName = player.display_name || "Unknown";
        line += `@${displayName}`;
        
        // Character name and level
        const charName = player.character_name || "Unknown";
        const level = player.level || "1";
        
        line += ` as ${charName} (${level})`;
        
        // Gains
        const xp = player.xp || "0";
        const dtp = player.dtp || "0";
        const gold = player.gold || "0";
        
        line += ` gains ${xp} XP, ${dtp} DTP`;
        
        // Incentives (inside DTP)
        const incentives = player.incentives || [];
        if (incentives.length > 0) {
            line += ` (incentives: ${incentives.join(', ')})`;
        }
        
        line += `, and ${gold} GP.`;
        
        // Loot
        const loot = player.loot || "";
        if (loot) {
            line += ` They take ${loot}.`;
        }
        
        // Resources used (items + gold)
        const itemsUsed = player.items_used || "";
        const goldUsed = player.gold_used || "";
        
        if (itemsUsed || goldUsed) {
            let resourceParts = [];
            if (itemsUsed) resourceParts.push(itemsUsed);
            if (goldUsed) resourceParts.push(`${goldUsed} GP`);
            line += ` They used ${resourceParts.join(' and ')}.`;
        }
        
        // Character outcomes/notes
        const notes = player.notes || "";
        if (notes) {
            line += ` ${notes}`;
        }
        
        playerLines.push(line);
    });
    
    // Build DM incentives list
    let dmIncentivesList = [];
    
    // Calculate player stats
    const newHires = players.filter(p => {
        const games = p.games_count || "0";
        return games !== "10+" && parseInt(games) <= 10;
    }).length;
    
    const welcomeWagon = players.filter(p => p.games_count === "1").length;
    
    const dmGames = data.dm.games_count || "0";
    const isJumpstart = dmGames !== "10+" && parseInt(dmGames) <= 10;
    
    if (isJumpstart) dmIncentivesList.push("Jumpstart");
    if (newHires > 0) dmIncentivesList.push(`New Hires x${newHires}`);
    if (welcomeWagon > 0) dmIncentivesList.push(`Welcome Wagon x${welcomeWagon}`);
    
    // Add bonus incentives
    const dmIncentives = data.session_log.dm_rewards.incentives || [];
    dmIncentivesList = dmIncentivesList.concat(dmIncentives);
    
    // DM Rewards
    const dmDisplayName = data.dm.character_name || "DM";
    const dmCharName = data.dm.character_name || "DM Character";
    const dmLevel = data.session_log.dm_rewards.level || data.dm.level || "1";
    const dmXP = document.querySelector('.dm-res-xp')?.value || "0";
    const dmDTP = document.querySelector('.dm-res-dtp')?.value || "0";
    const dmGP = document.querySelector('.dm-res-gp')?.value || "0";
    const dmLoot = data.session_log.dm_rewards.loot_selected || "";
    
    // FIX: Use Discord ID if available, otherwise display name
    const dmIdString = dmDiscordId ? `<@${dmDiscordId}>` : `@${dmDisplayName}`;

    let dmRewardsLine = `${dmIdString} as ${dmCharName} (${dmLevel}) gains ${dmXP} XP, ${dmDTP} DTP, ${dmGP} GP`;
    if (dmLoot) {
        dmRewardsLine += `, and ${dmLoot}`;
    }
    dmRewardsLine += `.`;
    
    // Build the full output
    let output = `**Session Name:** ${gameName}\n`;
    output += `**Game Version:** ${gameVersion}\n`;
    output += `**Game Format:** ${gameFormat}\n`;
    output += `**Application Format:** ${appsType}\n`;
    output += `**APL and Tier:** APL ${apl}, Tier ${tier}\n`;
    output += `**Hours Played:** ${sessionHours}\n\n`;
    output += `**EXP, DTP, GP, Loot, and Resources Used:**\n`;
    output += playerLines.join('\n') + '\n\n';
    output += `**DM Incentives:** ${dmIncentivesList.join(', ') || 'None'}\n`;
    output += `**DM Rewards:** ${dmRewardsLine}\n\n`;
    
    if (dmCollaborators) {
        output += `**DM Collaborators:**\n${dmCollaborators}\n\n`;
    }
    
    if (sessionNotes) {
        output += `**Notes:**\n${sessionNotes}\n\n`;
    }
    
    output += `**Session Summary:**\n${sessionSummary}`;
    
    // Output to textarea
    const outText = document.getElementById('out-session-text');
    if (outText) outText.value = output.trim();
}

export function generateMALUpdate() {
    const sessionDate = document.getElementById('inp-session-date')?.value || '';
    const formattedDate = sessionDate ? sessionDate.split('T')[0] : new Date().toISOString().split('T')[0];
    
    // FIX: Use header-game-name instead of data.header.title
    const gameName = document.getElementById('header-game-name')?.value || 'Untitled';
    const dmName = document.getElementById('inp-dm-char-name')?.value || 'DM';
    const aplEl = document.getElementById('setup-val-apl');
    const apl = aplEl ? aplEl.textContent : '1';
    const dmXP = document.querySelector('.dm-res-xp')?.value || '0';
    const dmGP = document.querySelector('.dm-res-gp')?.value || '0';
    const dmDTP = document.querySelector('.dm-res-dtp')?.value || '0';
    const dmLoot = document.getElementById('dm-loot-selected')?.value || '';
    
    // Tab-delimited format
    const malRow = `${formattedDate}\t"DM"\t${gameName}\t${dmName}\t${apl}\t${dmXP}\t${dmGP}\t${dmDTP}\t${dmLoot}`;
    
    const outMAL = document.getElementById('out-mal-update');
    if (outMAL) {
        outMAL.value = malRow;
    }
}

export function updateJumpstartDisplay() {
    const dmGamesInput = document.getElementById('inp-dm-games-count');
    const dmGamesVal = dmGamesInput ? dmGamesInput.value : "10+";
    const dmGamesNum = parseInt(dmGamesVal) || 999;
    const isJumpstart = (dmGamesVal !== "10+" && dmGamesNum <= 10);
    
    // Update the Jumpstart field in Session Details tab
    const jumpstartField = document.querySelector('.dm-val-jumpstart');
    if (jumpstartField) {
        jumpstartField.value = isJumpstart ? "Yes" : "No";
    }
}