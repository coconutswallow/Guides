/**
 * AC SERVICE MODULE (Updated: 2026-04-17 20:05)
 * ================================================================
 * AC SERVICE MODULE
 * ================================================================
 * 
 * Handles all data fetching and state management for the Allowed 
 * Content UI. Interfaces with Supabase to retrieve bastions, 
 * categories, and other future content sets.
 * 
 * Includes simple caching logic to reduce network load.
 */

import { supabase } from '../supabaseClient.js';

const CACHE = {
    categories: null,
    bastions: null,
    // Add other content sets here as needed
};

/**
 * Common helper to fetch all rows from a table by bypassing the 1000-row limit.
 * 
 * @param {string} table - Table name
 * @param {string} select - Selection string
 * @param {Array} orders - Array of order objects { column, ascending }
 * @returns {Promise<Array>} All rows fetched
 */
async function fetchAll(table, select = '*', orders = []) {
    console.log(`Supabase: Fetching all from ${table}...`);
    let allData = [];
    let from = 0;
    let step = 1000;
    let finished = false;

    while (!finished) {
        let query = supabase.from(table).select(select).range(from, from + step - 1);
        
        // Apply orders
        orders.forEach(o => {
            query = query.order(o.column, { ascending: o.ascending ?? true });
        });

        const { data, error } = await query;
        if (error) throw error;
        
        allData = allData.concat(data);
        if (data.length < step) {
            finished = true;
        } else {
            from += step;
        }
    }
    return allData;
}

/**
 * Fetches all Bastion Categories from Supabase.
 * Results are cached for the duration of the session.
 * 
 * @returns {Promise<Array>} Array of category objects
 */
export async function getBastionCategories() {
    if (CACHE.categories) return CACHE.categories;

    const { data, error } = await supabase
        .from('ac_bastion_categories')
        .select('*')
        .order('name');

    if (error) {
        console.error('Error fetching bastion categories:', error);
        return [];
    }

    CACHE.categories = data;
    return data;
}

/**
 * Fetches all Bastions from Supabase, including joined category info.
 * 
 * @returns {Promise<Array>} Array of bastion objects
 */
export async function getBastions() {
    // Note: We're not caching bastions here yet to ensure fresh data if needed,
    // but we can add caching if the dataset grows significantly.
    
    // Using a join to get category name directly
    const { data, error } = await supabase
        .from('ac_bastions')
        .select(`
            *,
            category:category_id (
                name,
                notes,
                display_order
            )
        `)
        .order('name');

    if (error) {
        console.error('Error fetching bastions:', error);
        return [];
    }

    return data;
}

/**
 * Helper to get a specific category's notes by ID from cache.
 * Falls back to fetching if cache is empty.
 * 
 * @param {string} categoryId - UUID of the category
 * @returns {Promise<string|null>} Category notes or null
 */
export async function getCategoryNotes(categoryId) {
    const categories = await getBastionCategories();
    return cat ? cat.notes : null;
}

/**
 * Fetches all Races from Supabase.
 * 
 * @returns {Promise<Array>} Array of race objects
 */
export async function getRaces() {
    const { data, error } = await supabase
        .from('ac_races')
        .select('*')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching races:', error);
        return [];
    }

    return data;
}

/**
 * Fetches all Classes from Supabase.
 * 
 * @returns {Promise<Array>} Array of class objects
 */
export async function getClasses() {
    const { data, error } = await supabase
        .from('ac_classes')
        .select('*')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching classes:', error);
        return [];
    }

    return data;
}

/**
 * Fetches all Backgrounds from Supabase.
 * 
 * @returns {Promise<Array>} Array of background objects
 */
export async function getBackgrounds() {
    const { data, error } = await supabase
        .from('ac_backgrounds')
        .select('*')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching backgrounds:', error);
        return [];
    }

    return data;
}

/**
 * Fetches all Feats from Supabase.
 * 
 * @returns {Promise<Array>} Array of feat objects
 */
export async function getFeats() {
    try {
        return await fetchAll('ac_feats', '*', [
            { column: 'display_order', ascending: true },
            { column: 'name', ascending: true }
        ]);
    } catch (error) {
        console.error('Error fetching feats:', error);
        return [];
    }
}

/**
 * Fetches all Fighting Styles from Supabase.
 * 
 * @returns {Promise<Array>} Array of fighting style objects
 */
export async function getFightingStyles() {
    const { data, error } = await supabase
        .from('ac_fighting_styles')
        .select('*')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching fighting styles:', error);
        return [];
    }

    return data;
}

/**
 * Fetches all Artificer Infusions from Supabase.
 * 
 * @returns {Promise<Array>} Array of infusion objects
 */
export async function getArtificerInfusions() {
    const { data, error } = await supabase
        .from('ac_artificer_infusions')
        .select('*')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching artificer infusions:', error);
        return [];
    }

    return data;
}

/**
 * Fetches all Eldritch Invocations from Supabase.
 * 
 * @returns {Promise<Array>} Array of invocation objects
 */
export async function getEldritchInvocations() {
    const { data, error } = await supabase
        .from('ac_eldritch_invocations')
        .select('*')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching eldritch invocations:', error);
        return [];
    }

    return data;
}

/**
 * Fetches all Spells from Supabase.
 * 
 * @returns {Promise<Array>} Array of spell objects
 */
export async function getSpells() {
    try {
        return await fetchAll('ac_spells', '*', [
            { column: 'display_order', ascending: true },
            { column: 'name', ascending: true }
        ]);
    } catch (error) {
        console.error('Error fetching spells:', error);
        return [];
    }
}

/**
 * Fetches all Languages from Supabase, including joined category info.
 * 
 * @returns {Promise<Array>} Array of language objects
 */
export async function getLanguages() {
    const { data, error } = await supabase
        .from('ac_languages')
        .select(`
            *,
            language_type:type_id (
                id,
                name,
                description,
                display_order
            )
        `)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching languages:', error);
        return [];
    }

    return data;
}

/**
 * Fetches all Equipment from Supabase, including joined category info.
 * 
 * @returns {Promise<Array>} Array of equipment objects
 */
export async function getEquipment() {
    try {
        return await fetchAll('ac_equipment', `
            *,
            category:category_id (
                id,
                name,
                notes,
                display_order
            )
        `, [
            { column: 'display_order', ascending: true },
            { column: 'name', ascending: true }
        ]);
    } catch (error) {
        console.error('Error fetching equipment:', error);
        return [];
    }
}

/**
 * Fetches all Downtime Activities from Supabase, including joined category info.
 * 
 * @returns {Promise<Array>} Array of downtime objects
 */
export async function getDowntime() {
    const { data, error } = await supabase
        .from('ac_downtime')
        .select(`
            *,
            category:category_id (
                id,
                name,
                notes,
                display_order
            )
        `)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching downtime:', error);
        return [];
    }

    return data;
}

/**
 * Fetches all Loot Categories from Supabase.
 * 
 * @returns {Promise<Array>} Array of category objects
 */
export async function getLootCategories() {
    const { data, error } = await supabase
        .from('ac_loot_categories')
        .select('*')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching loot categories:', error);
        return [];
    }

    return data;
}

/**
 * Fetches all Loot Items from Supabase, including joined category info.
 * 
 * @returns {Promise<Array>} Array of loot objects
 */
export async function getLoot() {
    try {
        return await fetchAll('ac_loot', `
            *,
            category_id,
            category:category_id (
                id,
                name,
                notes,
                display_order
            )
        `, [
            { column: 'display_order', ascending: true },
            { column: 'name', ascending: true }
        ]);
    } catch (error) {
        console.error('Error fetching loot:', error);
        return [];
    }
}

/**
 * Fetch all Other Rewards Categories from Supabase.
 * 
 * @returns {Promise<Array>} Array of category objects
 */
export async function getOtherRewardsCategories() {
    const { data, error } = await supabase
        .from('ac_other_rewards_categories')
        .select('*')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching other rewards categories:', error);
        return [];
    }

    return data;
}

/**
 * Fetch all Other Rewards from Supabase, including joined category info.
 * 
 * @returns {Promise<Array>} Array of reward objects
 */
export async function getOtherRewards() {
    try {
        return await fetchAll('ac_other_rewards', `
            *,
            category_id,
            category:category_id (
                id,
                name,
                notes,
                display_order
            )
        `, [
            { column: 'display_order', ascending: true },
            { column: 'name', ascending: true }
        ]);
    } catch (error) {
        console.error('Error fetching other rewards (check if table exists):', error);
        return [];
    }
}

/**
 * Fetch all Item Properties Categories from Supabase.
 * 
 * @returns {Promise<Array>} Array of category objects
 */
export async function getItemPropertiesCategories() {
    const { data, error } = await supabase
        .from('ac_item_properties_categories')
        .select('*')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching item properties categories:', error);
        return [];
    }

    return data;
}

/**
 * Fetch all Item Properties from Supabase, including joined category info.
 * 
 * @returns {Promise<Array>} Array of property objects
 */
export async function getItemProperties() {
    try {
        return await fetchAll('ac_item_properties', `
            *,
            category_id,
            category:category_id (
                id,
                name,
                notes,
                display_order
            )
        `, [
            { column: 'display_order', ascending: true },
            { column: 'name', ascending: true }
        ]);
    } catch (error) {
        console.error('Error fetching item properties:', error);
        return [];
    }
}

/**
 * Fetch all Monster Categories from Supabase.
 * 
 * @returns {Promise<Array>} Array of category objects
 */
export async function getMonsterCategories() {
    const { data, error } = await supabase
        .from('ac_monsters_categories')
        .select('*')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching monster categories:', error);
        return [];
    }

    return data;
}

/**
 * Fetch all Monsters from Supabase, including joined category info.
 * 
 * @returns {Promise<Array>} Array of monster objects
 */
export async function getMonsters() {
    try {
        return await fetchAll('ac_monsters', `
            *,
            category_id,
            category:category_id (
                id,
                name,
                notes,
                display_order
            )
        `, [
            { column: 'display_order', ascending: true },
            { column: 'name', ascending: true }
        ]);
    } catch (error) {
        console.error('Error fetching monsters (check if table exists):', error);
        return [];
    }
}

/**
 * Fetch all Source Categories from Supabase.
 * 
 * @returns {Promise<Array>} Array of category objects
 */
export async function getSourceCategories() {
    const { data, error } = await supabase
        .from('ac_sources_categories')
        .select('*')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching source categories:', error);
        return [];
    }

    return data;
}

/**
 * Fetch all Sources from Supabase, including joined category info.
 * 
 * @returns {Promise<Array>} Array of source objects
 */
export async function getSources() {
    try {
        return await fetchAll('ac_sources', `
            *,
            category_id,
            category:category_id (
                id,
                name,
                notes,
                display_order
            )
        `, [
            { column: 'display_order', ascending: true },
            { column: 'name', ascending: true }
        ]);
    } catch (error) {
        console.error('Error fetching sources:', error);
        return [];
    }
}
