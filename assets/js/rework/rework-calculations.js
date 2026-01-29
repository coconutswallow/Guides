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

// Helper to check mods (STR/DEX/etc)
function areModsEqual(m1, m2) {
    const mod1 = m1 || {};
    const mod2 = m2 || {};
    for (const a of ATTRIBUTES) {
        if ((mod1[a] || '0') !== (mod2[a] || '0')) return false;
    }
    return true;
}

// Helper to match the logic in rework-old for comparing feature arrays
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
    
    // Helper for version checks
    const allMatchVer = (classes, v) => classes && classes.length > 0 && classes.every(c => c.version === v);

    // --- 2024 Update Rework Logic ---
    if (type === REWORK_TYPES.UPDATE_2024) {
        const oldIs2014 = allMatchVer(oldChar.classes, '2014');
        const newIs2024 = allMatchVer(newChar.classes, '2024');

        if (!oldIs2014 || !newIs2024) {
            return { 
                isValid: false, 
                error: "2024 Update requires all Original classes to be '2014' and all New classes to be '2024'." 
            };
        }
        costs.push({ change: '2024 Update Rework', count: 0, dtp: 0, gold: 0 });
        return { isValid: true, costs };
    }

    // --- Level 5 or Below Logic ---
    if (type === REWORK_TYPES.LEVEL_5_BELOW) {
        if (origLevel > 5 || newLevel > 5) return { isValid: false, error: "Both characters must be level 5 or below." };
        costs.push({ change: 'Level 5 or Below Free Rework', count: 0, dtp: 0, gold: 0 });
        return { isValid: true, costs };
    }

    // --- A-la-carte Logic ---
    if (type === REWORK_TYPES.ALACARTE) {
        const rates = getAlacarteRates(origLevel);
        if (rates.gold === 0 && rates.dtp === 0) return { isValid: false, error: "A-la-carte available for levels 6+ only." };
        
        // A. Name & B. Attributes (Logic as requested)
        if (oldChar.name !== newChar.name && oldChar.name && newChar.name) {
            costs.push({ change: `Character name change`, count: 2 });
        }
        
        const changedAttrs = ATTRIBUTES.filter(a => oldChar.attributes[a] !== newChar.attributes[a]);
        if (changedAttrs.length > 0) {
            costs.push({ change: `Starting ability score changes`, count: 2 });
        }
        
        // C. Race & D. Origin Section Changes
        let raceChanged = (oldChar.race !== newChar.race) || (!areModsEqual(oldChar.race_mods, newChar.race_mods)) || (!areFeaturesEqual(oldChar.race_features, newChar.race_features));
        if (raceChanged) costs.push({ change: `Race/Species section changed`, count: 1 });
        
        let originChanged = (oldChar.bg !== newChar.bg) || (!areFeaturesEqual(oldChar.origin_features, newChar.origin_features)) || (oldChar.origin_feat !== newChar.origin_feat) || (!areModsEqual(oldChar.origin_mods, newChar.origin_mods)) || (!areFeaturesEqual(oldChar.origin_feat_features, newChar.origin_feat_features));
        if (originChanged) costs.push({ change: `Origin/Background section changed`, count: 1 });
        
        // E. Class/Subclass & Feat Logic
        const oldClasses = oldChar.classes || [];
        const newClasses = newChar.classes || [];
        
        let classMismatch = oldClasses.length !== newClasses.length;
        if (!classMismatch) {
            for (let i = 0; i < oldClasses.length; i++) {
                if (oldClasses[i].class !== newClasses[i].class || oldClasses[i].subclass !== newClasses[i].subclass || oldClasses[i].version !== newClasses[i].version) {
                    classMismatch = true;
                    break;
                }
            }
        }

        if (classMismatch) {
            let featCardCount = 0;
            newClasses.forEach(cl => {
                let data = characterData.find(r => r.version === cl.version && r.class === cl.class && r.subclass === cl.subclass) || characterData.find(r => r.version === cl.version && r.class === cl.class);
                const milestones = data?.ASI || [4, 8, 12, 16, 19];
                featCardCount += milestones.filter(m => m <= (parseInt(cl.level) || 0)).length;
            });
            costs.push({ change: `Class/Subclass change (${featCardCount} feat cards affected)`, count: featCardCount });
        } else {
            const oldFeats = oldChar.feats || [];
            const newFeats = newChar.feats || [];
            let featDetailChanged = oldFeats.length !== newFeats.length;

            if (!featDetailChanged) {
                for (let i = 0; i < oldFeats.length; i++) {
                    const of = oldFeats[i];
                    const nf = newFeats[i];
                    if (of.name !== nf.name || !areModsEqual(of.mods, nf.mods) || !areFeaturesEqual(of.features, nf.features)) {
                        featDetailChanged = true;
                        break;
                    }
                }
            }
            if (featDetailChanged) costs.push({ change: `Feat selection or detail modified`, count: 1 });
        }

        return { 
            isValid: true, 
            costs: costs.map(c => ({ ...c, dtp: c.count * rates.dtp, gold: c.count * rates.gold })) 
        };
    }

    return { isValid: false, error: "Please select a valid rework type." };
}