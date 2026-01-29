import { ATTRIBUTES, POINT_COSTS, ALACARTE_TIERS, REWORK_TYPES } from './rework-constants.js';

export function calculatePointBuyCost(attributesObj) {
    let spent = 0;
    ATTRIBUTES.forEach(a => {
        const val = parseInt(attributesObj[a]) || 8;
        spent += POINT_COSTS[val] || 0;
    });
    return spent;
}

export function getTotalLevel(classes) {
    if (!classes || !Array.isArray(classes)) return 0;
    return classes.reduce((sum, c) => sum + (parseInt(c.level) || 0), 0);
}

export function getAlacarteRates(level) {
    const tier = ALACARTE_TIERS.find(t => level >= t.min && level <= t.max);
    return tier || { gold: 0, dtp: 0 };
}

// Helper to match the logic in rework-old for comparing feature arrays
function areFeaturesEqual(arr1, arr2) {
    const list1 = arr1 || [];
    const list2 = arr2 || [];
    const len = Math.max(list1.length, list2.length);
    
    for (let i = 0; i < len; i++) {
        const f1 = list1[i] || { type: 'none', name: '' };
        const f2 = list2[i] || { type: 'none', name: '' };
        if (f1.type !== f2.type || f1.name !== f2.name) return false;
    }
    return true;
}

// Helper to check mods (STR/DEX/etc)
function areModsEqual(m1, m2) {
    const mod1 = m1 || {};
    const mod2 = m2 || {};
    for (const a of ATTRIBUTES) {
        if ((mod1[a] || '0') !== (mod2[a] || '0')) return false;
    }
    return true;
}

export function computeReworkCosts(type, oldChar, newChar) {
    const costs = [];
    const origLevel = getTotalLevel(oldChar.classes || []);
    const newLevel = getTotalLevel(newChar.classes || []);
    
    // Helper for 2014/2024 check
    const hasVer = (classes, v) => classes && classes.some(c => c.version === v);

    if (type === REWORK_TYPES.LEVEL_5_BELOW) {
        if (origLevel > 5 || newLevel > 5) return { isValid: false, error: "Both characters must be level 5 or below." };
        costs.push({ change: 'Level 5 or Below Free Rework', count: 0, dtp: 0, gold: 0 });
        return { isValid: true, costs };
    }

    if (type === REWORK_TYPES.UPDATE_2024) {
        if (!hasVer(oldChar.classes, '2014') || !hasVer(newChar.classes, '2024')) {
            return { isValid: false, error: "Requires Original to have 2014 classes and New to have 2024 classes." };
        }
        costs.push({ change: '2024 Update', count: 0, dtp: 0, gold: 0 });
        return { isValid: true, costs };
    }

    if (type === REWORK_TYPES.T2_CHECKPOINT) {
        if (origLevel < 6 || origLevel > 10) return { isValid: false, error: "Original must be Tier 2 (level 6-10)." };
        if (newLevel < 1 || newLevel > 5) return { isValid: false, error: "New must be Tier 1 (level 1-5)." };
        costs.push({ change: 'T2 Checkpoint', count: 1, dtp: 150, gold: 820 });
        return { isValid: true, costs };
    }
    
    if (type === REWORK_TYPES.T3_CHECKPOINT) {
        if (origLevel < 11 || origLevel > 16) return { isValid: false, error: "Original must be Tier 3 (level 11-16)." };
        if (newLevel < 6 || newLevel > 10) return { isValid: false, error: "New must be Tier 2 (level 6-10)." };
        costs.push({ change: 'T3 Checkpoint', count: 1, dtp: 180, gold: 2400 });
        return { isValid: true, costs };
    }
    
    if (type === REWORK_TYPES.T4_CHECKPOINT) {
        if (origLevel < 17 || origLevel > 20) return { isValid: false, error: "Original must be Tier 4 (level 17-20)." };
        if (newLevel < 11 || newLevel > 16) return { isValid: false, error: "New must be Tier 3 (level 11-16)." };
        costs.push({ change: 'T4 Checkpoint', count: 1, dtp: 260, gold: 4250 });
        return { isValid: true, costs };
    }

    if (type === REWORK_TYPES.ALACARTE) {
        const rates = getAlacarteRates(origLevel);
        if (rates.gold === 0 && rates.dtp === 0) return { isValid: false, error: "A-la-carte available for levels 6+ only." };
        
        // A. Name
        if (oldChar.name !== newChar.name && oldChar.name && newChar.name) {
            costs.push({ change: `Character name change: ${oldChar.name} → ${newChar.name}`, count: 2 });
        }
        
        // B. Attributes
        const changedAttrs = ATTRIBUTES.filter(a => oldChar.attributes[a] !== newChar.attributes[a]);
        if (changedAttrs.length > 0) {
            costs.push({ change: `Starting ability score changes: ${changedAttrs.join(', ')}`, count: 2 });
        }
        
        // C. Race
        let raceChanged = false;
        if (oldChar.race !== newChar.race) raceChanged = true;
        if (!areModsEqual(oldChar.race_mods, newChar.race_mods)) raceChanged = true;
        if (!areFeaturesEqual(oldChar.race_features, newChar.race_features)) raceChanged = true;
        if (raceChanged) costs.push({ change: `Race/Species section changed`, count: 1 });
        
        // D. Origin
        let originChanged = false;
        if (oldChar.bg !== newChar.bg) originChanged = true;
        if (!areFeaturesEqual(oldChar.origin_features, newChar.origin_features)) originChanged = true;
        if (oldChar.origin_feat !== newChar.origin_feat) {
            originChanged = true;
        } else if (oldChar.origin_feat) {
            if (!areModsEqual(oldChar.origin_mods, newChar.origin_mods)) originChanged = true;
            if (!areFeaturesEqual(oldChar.origin_feat_features, newChar.origin_feat_features)) originChanged = true;
        }
        if (originChanged) costs.push({ change: `Origin/Background section changed`, count: 1 });
        
        // E. Feats (Logic from old file refactored)
        const oldFeats = (oldChar.feats || []).filter(f => f.name);
        const newFeats = (newChar.feats || []).filter(f => f.name);
        
        const oldFeatMap = {};
        oldFeats.forEach(f => {
            const key = `${f.source}-${f.name}`;
            if (!oldFeatMap[key]) oldFeatMap[key] = [];
            oldFeatMap[key].push({ ...f, _matched: false });
        });
        
        newFeats.forEach(newFeat => {
            const key = `${newFeat.source}-${newFeat.name}`;
            const potentialMatches = oldFeatMap[key] || [];
            
            // Find matched
            const matchIndex = potentialMatches.findIndex(pm => !pm._matched);
            
            if (matchIndex === -1) {
                // New feat
                costs.push({ change: `Feat added: ${newFeat.name} (${newFeat.source})`, count: 1 });
            } else {
                // Matched feat, check internals
                const match = potentialMatches[matchIndex];
                match._matched = true;
                
                let detailsChanged = false;
                if (!areModsEqual(match.mods, newFeat.mods)) detailsChanged = true;
                if (!areFeaturesEqual(match.features, newFeat.features)) detailsChanged = true;
                
                if (detailsChanged) {
                    costs.push({ change: `Feat modified: ${newFeat.name} (${newFeat.source})`, count: 1 });
                }
            }
        });

        return { 
            isValid: true, 
            costs: costs.map(c => ({ ...c, dtp: c.count * rates.dtp, gold: c.count * rates.gold })) 
        };
    }

    return { isValid: false, error: "Please select a valid rework type." };
}