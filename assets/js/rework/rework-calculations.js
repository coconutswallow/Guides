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

    // --- Checkpoint Rework Logic ---
    const checkpoints = {
        [REWORK_TYPES.T2_CHECKPOINT]: { oMin: 5, oMax: 10, nMin: 1, nMax: 4 },
        [REWORK_TYPES.T3_CHECKPOINT]: { oMin: 11, oMax: 16, nMin: 5, nMax: 10 },
        [REWORK_TYPES.T4_CHECKPOINT]: { oMin: 17, oMax: 20, nMin: 11, nMax: 16 }
    };

    if (checkpoints[type]) {
        const t = checkpoints[type];
        const isOrigValid = origLevel >= t.oMin && origLevel <= t.oMax;
        const isNewValid = newLevel >= t.nMin && newLevel <= t.nMax;

        if (!isOrigValid || !isNewValid) {
            return { 
                isValid: false, 
                error: `Invalid Level Range for ${type.replace('-', ' ').toUpperCase()}. Original must be ${t.oMin}-${t.oMax}, New must be ${t.nMin}-${t.nMax}.` 
            };
        }
        const rates = getAlacarteRates(origLevel);
        return { isValid: true, isFixed: true, costs: [{ change: `${type.toUpperCase()} Checkpoint`, count: 1, dtp: rates.dtp, gold: rates.gold }] };
    }

    // --- A-la-carte Logic ---
    if (type === REWORK_TYPES.ALACARTE) {
        const rates = getAlacarteRates(origLevel);
        if (rates.gold === 0 && rates.dtp === 0) return { isValid: false, error: "A-la-carte available for levels 6+ only." };
        
        if (oldChar.name !== newChar.name && oldChar.name && newChar.name) costs.push({ change: `Character name change`, count: 2 });
        if (ATTRIBUTES.some(a => oldChar.attributes[a] !== newChar.attributes[a])) costs.push({ change: `Starting ability score changes`, count: 2 });
        if (oldChar.race !== newChar.race || !areModsEqual(oldChar.race_mods, newChar.race_mods) || !areFeaturesEqual(oldChar.race_features, newChar.race_features)) costs.push({ change: `Race/Species section changed`, count: 1 });
        
        let originChanged = (oldChar.bg !== newChar.bg) || (!areFeaturesEqual(oldChar.origin_features, newChar.origin_features)) || (oldChar.origin_feat !== newChar.origin_feat) || (!areModsEqual(oldChar.origin_mods, newChar.origin_mods)) || (!areFeaturesEqual(oldChar.origin_feat_features, newChar.origin_feat_features));
        if (originChanged) costs.push({ change: `Origin/Background section changed`, count: 1 });
        
        const oldClasses = oldChar.classes || [];
        const newClasses = newChar.classes || [];
        let classMismatch = oldClasses.length !== newClasses.length || oldClasses.some((c, i) => c.class !== newClasses[i].class || c.subclass !== newClasses[i].subclass || c.version !== newClasses[i].version);

        if (classMismatch) {
            let featCardCount = 0;
            newClasses.forEach(cl => {
                let data = characterData.find(r => r.version === cl.version && r.class === cl.class && r.subclass === cl.subclass) || characterData.find(r => r.version === cl.version && r.class === cl.class);
                featCardCount += (data?.ASI || [4, 8, 12, 16, 19]).filter(m => m <= (parseInt(cl.level) || 0)).length;
            });
            costs.push({ change: `Class/Subclass change`, count: featCardCount });
        } else {
            const oldFeats = oldChar.feats || [];
            const newFeats = newChar.feats || [];
            let featChanged = oldFeats.length !== newFeats.length || oldFeats.some((of, i) => of.name !== newFeats[i].name || !areModsEqual(of.mods, newFeats[i].mods) || !areFeaturesEqual(of.features, newFeats[i].features));
            if (featChanged) costs.push({ change: `Feat selection or detail modified`, count: 1 });
        }

        return { isValid: true, isFixed: false, rates, costs };
    }

    return { isValid: false, error: "Please select a valid rework type." };
}