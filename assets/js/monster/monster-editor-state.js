/**
 * monster-editor-state.js
 * Logic for managing monster editor state, validation, and auto-save timers.
 * Location: \assets\js\monster\monster-editor-state.js
 * https://github.com/hawthorneguild/HawthorneTeams/issues/7
 */

/**
 * Initializes a new monster object with default 2024 D&D values.
 * @returns {Object} A blank monster template.
 */
export function createEmptyMonster() {
    return {
        name: '',
        slug: '',
        size: 'Medium',
        species: 'Humanoid',
        alignment: 'Unaligned',
        alignment_prefix: '',
        cr: '1',
        usage: '2014 Fair Game',
        ac: 10,
        conditional_ac: '',
        hit_dice_num: 1,
        hit_dice_size: 8,
        hp_modifier: 0,
        speed: '30 ft.',
        ability_scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
        saves: { STR: null, DEX: null, CON: null, INT: null, WIS: null, CHA: null },
        skills: '',
        damage_vulnerabilities: '',
        damage_resistances: '',
        damage_immunities: '',
        condition_immunities: '',
        senses: '',
        languages: '',
        init_prof: 'None',
        features: [],
        legendary_header: '',
        lair_header: '',
        regional_header: '',
        description: '',
        additional_info: '',
        creator_notes: '',
        image_url: '',
        token_url: '',
        image_credit: '',
        tags: [],
        status: 'Draft'
    };
}

/**
 * Syncs the current DOM form state into a monster data object.
 * @param {HTMLFormElement} form - The monster-form element.
 * @param {Object} currentMonster - The monster object to update in-place.
 */
export function syncMonsterFromForm(form, currentMonster) {
    if (!form || !currentMonster) return;

    const formData = new FormData(form);

    currentMonster.name = formData.get('name');
    currentMonster.creator = formData.get('creator');
    currentMonster.slug = formData.get('slug');
    currentMonster.size = formData.get('size');
    currentMonster.species = formData.get('species');
    currentMonster.alignment = formData.get('alignment');
    currentMonster.alignment_prefix = formData.get('alignment_prefix');
    currentMonster.cr = formData.get('cr');
    currentMonster.usage = formData.get('usage');
    currentMonster.ac = parseInt(formData.get('ac')) || 10;
    currentMonster.conditional_ac = formData.get('conditional_ac');
    currentMonster.hit_dice_num = parseInt(formData.get('hit_dice_num')) || 1;
    currentMonster.hit_dice_size = parseInt(formData.get('hit_dice_size')) || 8;
    currentMonster.hp_modifier = parseInt(formData.get('hp_modifier')) || 0;
    currentMonster.speed = formData.get('speed');
    currentMonster.init_prof = formData.get('init_prof');

    currentMonster.skills = formData.get('skills');
    currentMonster.damage_vulnerabilities = formData.get('damage_vulnerabilities');
    currentMonster.damage_resistances = formData.get('damage_resistances');
    currentMonster.damage_immunities = formData.get('damage_immunities');
    currentMonster.condition_immunities = formData.get('condition_immunities');
    currentMonster.senses = formData.get('senses');
    currentMonster.languages = formData.get('languages');

    currentMonster.legendary_header = formData.get('legendary_header');
    currentMonster.lair_header = formData.get('lair_header');
    currentMonster.regional_header = formData.get('regional_header');

    currentMonster.image_url = formData.get('image_url');
    currentMonster.token_url = formData.get('token_url');
    currentMonster.image_credit = formData.get('image_credit');
    currentMonster.description = formData.get('description');
    currentMonster.additional_info = formData.get('additional_info');
    currentMonster.creator_notes = formData.get('creator_notes');

    const tagsStr = formData.get('tags') || '';
    const tagsArray = tagsStr.split(',').map(t => t.trim()).filter(t => t !== '');
    currentMonster.tags = tagsArray;

    currentMonster.ability_scores = {
        STR: parseInt(formData.get('ability_STR')) || 10,
        DEX: parseInt(formData.get('ability_DEX')) || 10,
        CON: parseInt(formData.get('ability_CON')) || 10,
        INT: parseInt(formData.get('ability_INT')) || 10,
        WIS: parseInt(formData.get('ability_WIS')) || 10,
        CHA: parseInt(formData.get('ability_CHA')) || 10
    };

    currentMonster.saves = {
        STR: formData.get('save_STR') ? parseInt(formData.get('save_STR')) : null,
        DEX: formData.get('save_DEX') ? parseInt(formData.get('save_DEX')) : null,
        CON: formData.get('save_CON') ? parseInt(formData.get('save_CON')) : null,
        INT: formData.get('save_INT') ? parseInt(formData.get('save_INT')) : null,
        WIS: formData.get('save_WIS') ? parseInt(formData.get('save_WIS')) : null,
        CHA: formData.get('save_CHA') ? parseInt(formData.get('save_CHA')) : null
    };

    currentMonster.saves.proficiencies = Array.from(form.querySelectorAll('.save-prof:checked')).map(cb => cb.dataset.attr);
}

/**
 * Validates the current monster object for mandatory 5e data.
 * @param {Object} currentMonster - The monster object to validate.
 * @returns {string[]} An array of human-readable error messages.
 */
export function validateMonster(currentMonster) {
    const errors = [];
    if (!currentMonster.name || currentMonster.name.trim() === '') {
        errors.push('Monster Name is required.');
    }
    if (!currentMonster.slug) {
        errors.push('Slug is missing (Check your monster name).');
    }

    if (currentMonster.image_url && currentMonster.image_url.trim() !== '') {
        const validExtensions = /\.(jpeg|jpg|gif|png|webp|svg|bmp)(\?.*)?$/i;
        if (!validExtensions.test(currentMonster.image_url.trim())) {
            errors.push('Main Image URL must point directly to an image file (e.g. ending in .png, .jpg, or .webp).');
        }
    }

    if (currentMonster.features) {
        currentMonster.features.forEach((f, i) => {
            if (!f.name && !f.description) return;
            if (!f.name || f.name.trim() === '') {
                errors.push(`${f.type || 'Feature'} #${i + 1} is missing a name.`);
            }
            if (!f.description || f.description.trim() === '') {
                errors.push(`${f.type || 'Feature'} #${i + 1} is missing a description.`);
            }
        });
    }

    return errors;
}

/**
 * Global timer for auto-saving drafts.
 */
let autoSaveTimeout = null;

/**
 * Resets the auto-save timer. Triggers a silent save to Supabase after a delay.
 * Also triggers an immediate sync to localStorage for rapid recovery.
 * @param {Object} currentMonster - The monster being edited.
 * @param {Function} saveCallback - The function to call when the timer expires.
 * @param {number} [delay=30000] - Delay in milliseconds (default 30s).
 */
export function resetAutoSave(currentMonster, saveCallback, delay = 30000) {
    if (autoSaveTimeout) clearTimeout(autoSaveTimeout);

    // Backup to localStorage immediately on input
    saveToLocalCache(currentMonster);

    if (['Pending', 'Approved'].includes(currentMonster?.status)) {
        return;
    }

    autoSaveTimeout = setTimeout(() => {
        console.log('[MonsterEditor] Triggering Auto-save...');
        saveCallback(true);
    }, delay);
}

/**
 * Saves a monster draft to browser localStorage.
 * @param {Object} monster - The monster data to cache.
 */
export function saveToLocalCache(monster) {
    if (!monster) return;
    try {
        const cacheObj = {
            timestamp: Date.now(),
            data: monster
        };
        localStorage.setItem(`monster_draft_cache_${monster.slug || 'new'}`, JSON.stringify(cacheObj));
    } catch (e) {
        console.error('[MonsterEditor] Failed to save to local cache:', e);
    }
}

/**
 * Attempts to recover a monster draft from localStorage.
 * @param {string} slug - The monster slug to recover.
 * @returns {Object|null} The recovered monster data or null.
 */
export function getLocalCache(slug) {
    try {
        const raw = localStorage.getItem(`monster_draft_cache_${slug || 'new'}`);
        if (!raw) return null;
        const cache = JSON.parse(raw);

        // Expire cache after 24 hours
        if (Date.now() - cache.timestamp > 86400000) {
            localStorage.removeItem(`monster_draft_cache_${slug || 'new'}`);
            return null;
        }

        return cache.data;
    } catch (e) {
        return null;
    }
}

/**
 * Clears the localStorage cache for a specific monster.
 * @param {string} slug - The monster slug to clear.
 */
export function clearLocalCache(slug) {
    localStorage.removeItem(`monster_draft_cache_${slug || 'new'}`);
}
