export function computeReworkCosts(type, oldChar, newChar) {
    const costs = [];
    const origLevel = getTotalLevel(oldChar.classes || []);
    const newLevel = getTotalLevel(newChar.classes || []);
    const characterData = getState().characterData || []; // Ensure data is accessible for class checks
    
    const allMatchVer = (classes, v) => classes && classes.length > 0 && classes.every(c => c.version === v);

    // --- 1. Level 5 or Below Free Rework ---
    if (type === REWORK_TYPES.LEVEL_5_BELOW) {
        if (origLevel > 5 || newLevel > 5) return { isValid: false, error: "Both characters must be level 5 or below." };
        return { isValid: true, isFixed: true, costs: [{ change: 'Level 5 or Below Free Rework', count: 0, dtp: 0, gold: 0 }] };
    }

    // --- 2. 2024 Update Rework ---
    if (type === REWORK_TYPES.UPDATE_2024) {
        if (!allMatchVer(oldChar.classes, '2014') || !allMatchVer(newChar.classes, '2024')) {
            return { isValid: false, error: "Requires all Original to be 2014 and all New to be 2024." };
        }
        return { isValid: true, isFixed: true, costs: [{ change: '2024 Update Rework', count: 0, dtp: 0, gold: 0 }] };
    }

    // --- 3. Checkpoint Rework Logic ---
    const checkpoints = {
        [REWORK_TYPES.T2_CHECKPOINT]: { oMin: 5, oMax: 10, nMin: 1, nMax: 4, tier: 'T2' },
        [REWORK_TYPES.T3_CHECKPOINT]: { oMin: 11, oMax: 16, nMin: 5, nMax: 10, tier: 'T3' },
        [REWORK_TYPES.T4_CHECKPOINT]: { oMin: 17, oMax: 20, nMin: 11, nMax: 16, tier: 'T4' }
    };

    if (checkpoints[type]) {
        const t = checkpoints[type];
        if (origLevel < t.oMin || origLevel > t.oMax || newLevel < t.nMin || newLevel > t.nMax) {
            return { isValid: false, error: `Invalid Level Range for ${t.tier} Checkpoint.` };
        }
        const rates = TIER_FIXED_COSTS[t.tier];
        return { isValid: true, isFixed: true, costs: [{ change: `${t.tier} Checkpoint`, count: 1, dtp: rates.dtp, gold: rates.gold }] };
    }

    // --- 4. Story Rework Logic ---
    if (type === REWORK_TYPES.STORY) {
        if (newLevel > origLevel) {
            return { isValid: false, error: "Story Rework: New level cannot exceed original level." };
        }
        
        let tier = "";
        if (origLevel >= 17) tier = "T4";
        else if (origLevel >= 11) tier = "T3";
        else if (origLevel >= 5) tier = "T2";
        
        if (tier) {
            const rates = TIER_FIXED_COSTS[tier];
            return { isValid: true, isFixed: true, costs: [{ change: `${tier} Story Rework`, count: 1, dtp: rates.dtp, gold: rates.gold }] };
        } else {
            return { isValid: true, isFixed: true, costs: [{ change: 'Level 5 or Below Story Rework', count: 0, dtp: 0, gold: 0 }] };
        }
    }

    // --- 5. A-la-carte Logic ---
    if (type === REWORK_TYPES.ALACARTE) {
        const rates = getAlacarteRates(origLevel);
        if (rates.gold === 0 && rates.dtp === 0) return { isValid: false, error: "A-la-carte available for levels 6+ only." };
        
        // Name Detailed Change
        if (oldChar.name !== newChar.name && oldChar.name && newChar.name) {
            costs.push({ change: `Name Change: ${oldChar.name} → ${newChar.name}`, count: 2 });
        }
        
        // Attribute Detailed Change
        const changedAttrs = ATTRIBUTES.filter(a => oldChar.attributes[a] !== newChar.attributes[a]);
        if (changedAttrs.length > 0) {
            const detail = changedAttrs.map(a => `${a} (${oldChar.attributes[a]}→${newChar.attributes[a]})`).join(', ');
            costs.push({ change: `Attribute Changes: ${detail}`, count: 2 });
        }
        
        // Race Detailed Change
        if (oldChar.race !== newChar.race || !areModsEqual(oldChar.race_mods, newChar.race_mods) || !areFeaturesEqual(oldChar.race_features, newChar.race_features)) {
            costs.push({ change: `Race/Species Change: ${oldChar.race || 'None'} → ${newChar.race || 'None'}`, count: 1 });
        }
        
        // Origin Detailed Change
        if (oldChar.bg !== newChar.bg || oldChar.origin_feat !== newChar.origin_feat || !areFeaturesEqual(oldChar.origin_features, newChar.origin_features)) {
            costs.push({ change: `Origin Change: ${oldChar.bg || 'None'} (${oldChar.origin_feat || 'No Feat'}) → ${newChar.bg || 'None'} (${newChar.origin_feat || 'No Feat'})`, count: 1 });
        }
        
        const oldClasses = oldChar.classes || [];
        const newClasses = newChar.classes || [];
        const oldStr = oldClasses.map(c => `${c.class} (${c.subclass || 'None'})`).join('/');
        const newStr = newClasses.map(c => `${c.class} (${c.subclass || 'None'})`).join('/');

        if (oldStr !== newStr) {
            let featCardCount = 0;
            newClasses.forEach(cl => {
                let data = characterData.find(r => r.version === cl.version && r.class === cl.class && r.subclass === cl.subclass) || characterData.find(r => r.version === cl.version && r.class === cl.class);
                featCardCount += (data?.ASI || [4, 8, 12, 16, 19]).filter(m => m <= (parseInt(cl.level) || 0)).length;
            });
            costs.push({ change: `Class/Subclass Change: ${oldStr} → ${newStr}`, count: featCardCount });
        } else {
            const oldFeats = oldChar.feats || [];
            const newFeats = newChar.feats || [];
            if (oldFeats.some((of, i) => !newFeats[i] || of.name !== newFeats[i].name || !areModsEqual(of.mods, newFeats[i].mods))) {
                costs.push({ change: `Feat details modified (ASIs, Modifiers, or Choices)`, count: 1 });
            }
        }

        return { isValid: true, isFixed: false, rates, costs };
    }

    return { isValid: false, error: "Please select a valid rework type." };
}