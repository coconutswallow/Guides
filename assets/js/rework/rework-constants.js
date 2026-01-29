export const ATTRIBUTES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

export const POINT_COSTS = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

export const ALACARTE_TIERS = [
    { min: 1, max: 5, gold: 0, dtp: 0 },
    { min: 6, max: 6, gold: 160, dtp: 30 },
    { min: 7, max: 8, gold: 270, dtp: 30 },
    { min: 9, max: 10, gold: 400, dtp: 30 },
    { min: 11, max: 12, gold: 630, dtp: 40 },
    { min: 13, max: 14, gold: 810, dtp: 40 },
    { min: 15, max: 16, gold: 1030, dtp: 40 },
    { min: 17, max: 18, gold: 1270, dtp: 50 },
    { min: 19, max: 20, gold: 1530, dtp: 50 }
];

export const REWORK_TYPES = {
    LEVEL_5_BELOW: 'level-5-below',
    UPDATE_2024: '2024-update',
    T2_CHECKPOINT: 't2-checkpoint',
    T3_CHECKPOINT: 't3-checkpoint',
    T4_CHECKPOINT: 't4-checkpoint',
    ALACARTE: 'alacarte',
    STORY: 'story' 
};