import { ATTRIBUTES, POINT_COSTS, ALACARTE_TIERS, REWORK_TYPES } from './rework-constants.js';
import { getState } from './state-manager.js';

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

function areModsEqual(m1, m2) {
    const mod1 = m1 || {};
    const mod2 = m2 || {};
    for (const a of ATTRIBUTES) {
        if ((mod1[a] || '0') !== (mod2[a] || '0')) return false;
    }
    return true;
}

function areFeaturesEqual(arr1, arr2) {
    const list1 = arr1 || [];
    const list2 = arr2 || [];
    if (list1.length !== list2.length) return false;
    for (let i = 0; i < list1.length; i++) {
        const f1 = list1[i] || { type: 'none', name: '' };
        const f2 = list2[i] || { type: 'none', name: '' };
        if (f1.type !== f2.type || f1.name !== f2.name) return false;
    }
    return true;
}

export function computeReworkCosts(type, oldChar, newChar) {
    const costs = [];
    const origLevel = getTotalLevel(oldChar.classes || []);
    const newLevel = getTotalLevel(newChar.classes || []);
    const characterData = getState().characterData || [];
    const allMatchVer = (classes, v) => classes && classes.length > 0 && classes.every(c => c.version === v);

    // --- Fixed/Free Rework Types ---
    if (type === REWORK_TYPES.LEVEL_5_BELOW) {
        if (origLevel > 5 || newLevel > 5) return { isValid: false, error: "Both characters must be level 5 or below." };
        return { isValid: true, isFixed: true, costs: [{ change: 'Level 5 or Below Free Rework', count: 0, dtp: 0, gold: 0 }] };
    }

    if (type === REWORK_TYPES.UPDATE_2024) {
        if (!allMatchVer(oldChar.classes, '2014') || !allMatchVer(newChar.classes, '2024')) {
            return { isValid: false, error: "Requires all Original to be 2014 and all New to be 2024." };
        }
        return { isValid: true, isFixed: true, costs: [{ change: '2024 Update Rework', count: 0, dtp: 0, gold: 0 }] };
    }

    const checkpoints = {
        [REWORK_TYPES.T2_CHECKPOINT]: { oMin: 5, oMax: 10, nMin: 1, nMax: 4 },
        [REWORK_TYPES.T3_CHECKPOINT]: { oMin: 11, oMax: 16, nMin: 5, nMax: 10 },
        [REWORK_TYPES.T4_CHECKPOINT]: { oMin: 17, oMax: 20, nMin: 11, nMax: 16 }
    };
    // --- Story Rework Logic ---
    if (type === REWORK_TYPES.STORY) {
        // Validation: New level cannot exceed original level
        if (newLevel > origLevel) {
            return { isValid: false, error: "Story Rework: New level cannot exceed original level." };
        }
        
        // Determine Tier based on original character level
        let tierLabel = "";
        if (origLevel >= 5 && origLevel <= 10) tierLabel = "T2 Story Rework";
        else if (origLevel >= 11 && origLevel <= 16) tierLabel = "T3 Story Rework";
        else if (origLevel >= 17 && origLevel <= 20) tierLabel = "T4 Story Rework";
        else if (origLevel < 5) tierLabel = "Level 5 or Below Story Rework (Free)";
        else return { isValid: false, error: "Invalid level for Story Rework." };

        const rates = getAlacarteRates(origLevel);
        
        // If level 5 or below, cost is 0; otherwise, standard tier rate
        const finalGold = origLevel <= 5 ? 0 : rates.gold;
        const finalDtp = origLevel <= 5 ? 0 : rates.dtp;

        return { 
            isValid: true, 
            isFixed: true, 
            costs: [{ 
                change: tierLabel, 
                count: 1, 
                dtp: finalDtp, 
                gold: finalGold 
            }] 
        };
    }

    if (checkpoints[type]) {
        const t = checkpoints[type];
        if (origLevel < t.oMin || origLevel > t.oMax || newLevel < t.nMin || newLevel > t.nMax) {
            return { isValid: false, error: `Invalid Level Range for ${type.replace('-', ' ').toUpperCase()}.` };
        }
        const rates = getAlacarteRates(origLevel);
        return { isValid: true, isFixed: true, costs: [{ change: `${type.toUpperCase()} Checkpoint`, count: 1, dtp: rates.dtp, gold: rates.gold }] };
    }

    // --- A-la-carte Logic ---
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