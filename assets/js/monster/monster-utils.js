/**
 * monster-utils.js
 * Shared utility functions for D&D monster calculations and formatting.
 * Location: \assets\js\monster\monster-utils.js
 */

/**
 * Calculates the ability modifier from a score.
 * @param {number} score 
 * @returns {number}
 */
export function calculateMod(score) { 
    return Math.floor(((parseInt(score) || 10) - 10) / 2); 
}

/**
 * Calculates Proficiency Bonus based on Challenge Rating.
 * @param {string|number} cr 
 * @returns {number}
 */
export function calculatePB(cr) {
    const val = parseFloat(cr);
    if (val < 5) return 2;   // CR 0-4
    if (val < 9) return 3;   // CR 5-8
    if (val < 13) return 4;  // CR 9-12
    if (val < 17) return 5;  // CR 13-16
    if (val < 21) return 6;  // CR 17-20
    if (val < 25) return 7;  // CR 21-24
    if (val < 29) return 8;  // CR 25-28
    return 9;               // CR 29+
}

/**
 * Calculates XP value based on Challenge Rating.
 * @param {string|number} cr 
 * @returns {number}
 */
export function calculateXP(cr) {
    const table = { 
        "0": 10, "0.125": 25, "0.25": 50, "0.5": 100, "1": 200, "2": 450, "3": 700, "4": 1100, 
        "5": 1800, "6": 2300, "7": 2900, "8": 3900, "9": 5000, "10": 5900, "11": 7200, "12": 8400, 
        "13": 10000, "14": 11500, "15": 13000, "16": 15000, "17": 18000, "18": 20000, "19": 22000, 
        "20": 25000, "21": 33000, "22": 41000, "23": 50000, "24": 62000, "25": 75000, "26": 90000, 
        "27": 105000, "28": 120000, "29": 135000, "30": 155000 
    };
    const key = parseFloat(cr).toString();
    return table[key] || table[cr] || 0;
}

/**
 * Formats a number with a leading sign (e.g. +3, -1).
 * @param {number} val 
 * @returns {string}
 */
export function formatSign(val) { 
    return val >= 0 ? `+${val}` : val.toString(); 
}

/**
 * Formats CR for display (e.g. 0.125 -> 1/8).
 * @param {string|number} val 
 * @returns {string}
 */
export function formatCR(val) {
    if (val === 0.125 || val === "0.125") return '1/8';
    if (val === 0.25 || val === "0.25") return '1/4';
    if (val === 0.5 || val === "0.5") return '1/2';
    return val.toString();
}

/**
 * Generates the HP string (Average + Dice + Mod).
 * @param {number} num 
 * @param {number} size 
 * @param {number} mod 
 * @returns {string}
 */
export function calculateHPString(num, size, mod) {
    const n = parseInt(num);
    const s = parseInt(size);
    const m = parseInt(mod) || 0;
    if (!n || !s) return '—';
    const avg = Math.floor(n * (s / 2 + 0.5)) + m;
    const modStr = m !== 0 ? (m > 0 ? ` + ${m}` : ` - ${Math.abs(m)}`) : '';
    return `${avg} (${n}d${s}${modStr})`;
}

/**
 * Formats Initiative as: Modifier (Score)
 * @param {number} dexScore 
 * @param {string} proficiency 
 * @param {number} pb 
 * @returns {string}
 */
export function formatInitiative(dexScore, proficiency, pb) {
    const dexMod = calculateMod(dexScore || 10);
    let totalBonus = dexMod;

    if (proficiency === 'Proficient') {
        totalBonus += pb;
    } else if (proficiency === 'Expert') {
        totalBonus += (pb * 2);
    }
    
    const score = 10 + totalBonus;
    return `${formatSign(totalBonus)} (${score})`;
}

/**
 * Escapes HTML characters to prevent XSS.
 * @param {string} str 
 * @returns {string}
 */
export function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
