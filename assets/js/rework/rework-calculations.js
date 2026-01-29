import { 
    ATTRIBUTES, 
    POINT_COSTS, 
    ALACARTE_TIERS, 
    REWORK_TYPES 
} from './rework-constants.js';

// ==========================================
// 1. BASIC CALCULATIONS
// ==========================================

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
    // Find the tier where the level falls between min and max
    const tier = ALACARTE_TIERS.find(t => level >= t.min && level <= t.max);
    return tier || { gold: 0, dtp: 0 };
}

// ==========================================
// 2. MAIN COST LOGIC
// ==========================================

/**
 * Compares old and new character data to determine rework costs.
 * @param {string} type - The rework type ID (e.g., 'alacarte', 't2-checkpoint')
 * @param {object} oldChar - Scraped object of the original character
 * @param {object} newChar - Scraped object of the new character
 * @returns {object} { isValid: boolean, error: string, costs: Array }
 */
export function computeReworkCosts(type, oldChar, newChar) {
    const costs = [];
    const origLevel = getTotalLevel(oldChar.classes || []);
    const newLevel = getTotalLevel(newChar.classes || []);
    
    // Helpers
    const hasVer = (classes, v) => classes && classes.some(c => c.version === v);

    // ------------------------------------------
    // Type 1: Level 5 or Below (Free)
    // ------------------------------------------
    if (type === REWORK_TYPES.LEVEL_5_BELOW) {
        if (origLevel > 5 || newLevel > 5) {
            return { isValid: false, error: "Both characters must be level 5 or below for this rework type." };
        }
        costs.push({ change: 'Level 5 or Below Free Rework', count: 0, dtp: 0, gold: 0 });
        return { isValid: true, costs };
    }

    // ------------------------------------------
    // Type 2: 2024 Update (Free)
    // ------------------------------------------
    if (type === REWORK_TYPES.UPDATE_2024) {
        if (!hasVer(oldChar.classes, '2014') || !hasVer(newChar.classes, '2024')) {
            return { isValid: false, error: "2024 Update requires the Original character to have 2014 classes and the New character to have 2024 classes." };
        }
        costs.push({ change: '2024 Update', count: 0, dtp: 0, gold: 0 });
        return { isValid: true, costs };
    }

    // ------------------------------------------
    // Type 3: Checkpoints (Fixed Cost)
    // ------------------------------------------
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

    // ------------------------------------------
    // Type 4: A-la-carte (Calculated Cost)
    // ------------------------------------------
    if (type === REWORK_TYPES.ALACARTE) {
        const rates = getAlacarteRates(origLevel);
        
        if (rates.gold === 0 && rates.dtp === 0) {
            return { isValid: false, error: "A-la-carte rework is only available for characters level 6 and above." };
        }
        
        // A. Name Change
        if (oldChar.name !== newChar.name && oldChar.name && newChar.name) {
            costs.push({ change: `Character name change: ${oldChar.name} → ${newChar.name}`, count: 2 });
        }
        
        // B. Attributes Change
        const changedAttrs = ATTRIBUTES.filter(a => oldChar.attributes[a] !== newChar.attributes[a]);
        if (changedAttrs.length > 0) {
            costs.push({ change: `Starting ability score changes: ${changedAttrs.join(', ')}`, count: 2 });
        }
        
        // C. Race Section Comparison
        let raceChanged = false;
        if (oldChar.race !== newChar.race) {
            raceChanged = true;
        } else {
            // Compare Mods
            if (!areModsEqual(oldChar.race_mods, newChar.race_mods)) raceChanged = true;
            // Compare Features
            if (!areFeaturesEqual(oldChar.race_features, newChar.race_features)) raceChanged = true;
        }
        if (raceChanged) {
            costs.push({ change: `Race/Species section changed`, count: 1 });
        }
        
        // D. Background/Origin Section Comparison
        let originChanged = false;
        if (oldChar.bg !== newChar.bg) {
            originChanged = true;
        } else {
            // Compare Features
            if (!areFeaturesEqual(oldChar.origin_features, newChar.origin_features)) originChanged = true;
            
            // Compare Origin Feat + its internals
            if (oldChar.origin_feat !== newChar.origin_feat) {
                originChanged = true;
            } else if (oldChar.origin_feat) {
                if (!areModsEqual(oldChar.origin_mods, newChar.origin_mods)) originChanged = true;
                if (!areFeaturesEqual(oldChar.origin_feat_features, newChar.origin_feat_features)) originChanged = true;
            }
        }
        if (originChanged) {
            costs.push({ change: `Origin/Background section changed`, count: 1 });
        }
        
        // E. Feat/ASI Comparison
        const featChanges = calculateFeatChanges(oldChar.feats, newChar.feats);
        featChanges.forEach(fc => costs.push(fc));

        // Map counts to gold/dtp
        return { 
            isValid: true, 
            costs: costs.map(c => ({ 
                ...c, 
                dtp: c.count * rates.dtp, 
                gold: c.count * rates.gold 
            })) 
        };
    }

    return { isValid: false, error: "Please select a valid rework type." };
}

// ==========================================
// 3. COMPARISON UTILITIES
// ==========================================

function areModsEqual(mods1, mods2) {
    if (!mods1 && !mods2) return true;
    if (!mods1 || !mods2) return false;
    
    for (const attr of ATTRIBUTES) {
        if ((mods1[attr] || '0') !== (mods2[attr] || '0')) return false;
    }
    return true;
}

function areFeaturesEqual(arr1, arr2) {
    const list1 = arr1 || [];
    const list2 = arr2 || [];
    
    // Filter out empty rows before comparing
    const clean1 = list1.filter(f => f.type !== 'none' || f.name !== '');
    const clean2 = list2.filter(f => f.type !== 'none' || f.name !== '');

    if (clean1.length !== clean2.length) return false;

    for (let i = 0; i < clean1.length; i++) {
        if (clean1[i].type !== clean2[i].type) return false;
        if (clean1[i].name !== clean2[i].name) return false;
    }
    return true;
}

function calculateFeatChanges(oldFeats = [], newFeats = []) {
    const changes = [];
    const cleanOld = oldFeats.filter(f => f.name);
    const cleanNew = newFeats.filter(f => f.name);

    // Map old feats by "SourceClass-FeatName" to track usage
    const oldFeatMap = {};
    cleanOld.forEach(f => {
        const key = `${f.source}-${f.name}`;
        if (!oldFeatMap[key]) oldFeatMap[key] = [];
        oldFeatMap[key].push({ data: f, matched: false });
    });

    cleanNew.forEach(newFeat => {
        const key = `${newFeat.source}-${newFeat.name}`;
        const potentialMatches = oldFeatMap[key] || [];
        
        // Try to find an unmatched original feat
        const matchIndex = potentialMatches.findIndex(pm => !pm.matched);

        if (matchIndex === -1) {
            // No match found -> New Feat
            changes.push({ change: `Feat added: ${newFeat.name} (${newFeat.source})`, count: 1 });
        } else {
            // Match found -> Check if internal details changed
            const match = potentialMatches[matchIndex];
            match.matched = true; // Mark as used
            
            let detailsChanged = false;
            if (!areModsEqual(match.data.mods, newFeat.mods)) detailsChanged = true;
            if (!areFeaturesEqual(match.data.features, newFeat.features)) detailsChanged = true;

            if (detailsChanged) {
                changes.push({ change: `Feat modified: ${newFeat.name} (${newFeat.source})`, count: 1 });
            }
        }
    });

    return changes;
}