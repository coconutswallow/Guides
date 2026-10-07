/**
 * ================================================================
 * AC SERVICE MODULE
 * ================================================================
 * 
 * Central data access layer for the Allowed Content dashboard.
 * 
 * Responsibilities:
 * - Interfacing with Supabase for all content retrieval.
 * - Implementing pagination bypass via `fetchAll` for large datasets.
 * - Providing a unified API for feature modules to consume data.
 * - Managing simple session-based caching for static categories.
 * 
 * @module ACService
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
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.notes : null;
}

/**
 * Fetches all Races from Supabase, including joined subraces.
 * 
 * @returns {Promise<Array>} Array of race objects with subraces
 */
export async function getRaces() {
    try {
        const { data, error } = await supabase
            .from('ac_races')
            .select('*, subraces:ac_subraces(*)')
            .order('display_order', { ascending: true })
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching races:', error);
            return [];
        }

        // Ensure nested subraces are sorted by display_order
        if (data) {
            data.forEach(race => {
                if (race.subraces && Array.isArray(race.subraces)) {
                    race.subraces.sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0));
                }
            });
        }

        return data || [];
    } catch (err) {
        console.error('Exception fetching races:', err);
        return [];
    }
}

/**
 * Fetches all Subraces from Supabase, including joined parent race info.
 * 
 * @returns {Promise<Array>} Array of subrace objects
 */
export async function getSubraces() {
    try {
        const { data, error } = await supabase
            .from('ac_subraces')
            .select('*, race:ac_races(*)')
            .order('display_order', { ascending: true });

        if (error) {
            console.error('Error fetching subraces:', error);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error('Exception fetching subraces:', err);
        return [];
    }
}

/**
 * Fetches all Classes from Supabase.
 * 
 * @returns {Promise<Array>} Array of class objects
 */
export async function getClasses() {
    try {
        const { data, error } = await supabase
            .from('ac_classes')
            .select('*, subclasses:ac_subclasses(*)')
            .order('display_order', { ascending: true })
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching classes:', error);
            return [];
        }

        if (data) {
            data.forEach(cls => {
                if (cls.subclasses && Array.isArray(cls.subclasses)) {
                    cls.subclasses.sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0));
                }
            });
        }

        return data || [];
    } catch (err) {
        console.error('Exception fetching classes:', err);
        return [];
    }
}

/**
 * Fetches all Subclasses from Supabase with joined parent class info.
 * 
 * @returns {Promise<Array>} Array of subclass objects
 */
export async function getSubclasses() {
    try {
        const { data, error } = await supabase
            .from('ac_subclasses')
            .select('*, class:ac_classes(*)')
            .order('display_order', { ascending: true });

        if (error) {
            console.error('Error fetching subclasses:', error);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error('Exception fetching subclasses:', err);
        return [];
    }
}

/**
 * Fetches all Backgrounds from Supabase.
 * 
 * @returns {Promise<Array>} Array of background objects
 */
export async function getBackgrounds() {
    try {
        const { data, error } = await supabase
            .from('ac_backgrounds')
            .select('*')
            .order('display_order', { ascending: true })
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching backgrounds:', error);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error('Exception fetching backgrounds:', err);
        return [];
    }
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
    try {
        const { data, error } = await supabase
            .from('ac_fighting_styles')
            .select('*')
            .order('display_order', { ascending: true })
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching fighting styles:', error);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error('Exception fetching fighting styles:', err);
        return [];
    }
}

/**
 * Fetches all Artificer Infusions from Supabase.
 * 
 * @returns {Promise<Array>} Array of infusion objects
 */
export async function getArtificerInfusions() {
    try {
        const { data, error } = await supabase
            .from('ac_artificer_infusions')
            .select('*')
            .order('display_order', { ascending: true })
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching artificer infusions:', error);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error('Exception fetching artificer infusions:', err);
        return [];
    }
}

/**
 * Fetches all Eldritch Invocations from Supabase.
 * 
 * @returns {Promise<Array>} Array of invocation objects
 */
export async function getEldritchInvocations() {
    try {
        const { data, error } = await supabase
            .from('ac_eldritch_invocations')
            .select('*')
            .order('display_order', { ascending: true })
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching eldritch invocations:', error);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error('Exception fetching eldritch invocations:', err);
        return [];
    }
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
    try {
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

        return data || [];
    } catch (err) {
        console.error('Exception fetching languages:', err);
        return [];
    }
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
            equip_type:equip_type_id (
                id,
                name,
                notes,
                display_order
            ),
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
 * Fetches all Equipment Types from Supabase.
 * 
 * @returns {Promise<Array>} Array of equipment type objects
 */
export async function getEquipTypes() {
    try {
        return await fetchAll('ac_equip_type', '*', [
            { column: 'display_order', ascending: true },
            { column: 'name', ascending: true }
        ]);
    } catch (error) {
        console.error('Error fetching equipment types:', error);
        return [];
    }
}

/**
 * Fetches all Downtime Activities from Supabase, including joined category and type info.
 * 
 * @returns {Promise<Array>} Array of downtime objects
 */
export async function getDowntime() {
    try {
        const { data, error } = await supabase
            .from('ac_downtime')
            .select(`
                *,
                downtime_type:downtime_type_id (
                    id,
                    name,
                    notes,
                    description,
                    display_order
                ),
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

        return data || [];
    } catch (error) {
        console.error('Exception fetching downtime:', error);
        return [];
    }
}

/**
 * Fetches all Downtime Types from Supabase.
 * 
 * @returns {Promise<Array>} Array of downtime type objects
 */
export async function getDowntimeTypes() {
    try {
        const { data, error } = await supabase
            .from('ac_downtime_type')
            .select('*')
            .order('display_order', { ascending: true })
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching downtime types:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Exception fetching downtime types:', error);
        return [];
    }
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
 * Generic helper to fetch lookup data by type.
 * 
 * @param {string} type - Lookup type key (e.g. 'sources')
 * @returns {Promise<Object|Array|null>} Lookup data payload
 */
export async function getLookup(type) {
    try {
        const { data, error } = await supabase
            .from('lookups')
            .select('data')
            .eq('type', type)
            .maybeSingle();

        if (error || !data) {
            console.error(`Error fetching lookup for '${type}':`, error);
            return null;
        }
        return data.data;
    } catch (error) {
        console.error(`Exception in getLookup('${type}'):`, error);
        return null;
    }
}

/**
 * Generic helper to update lookup data by type.
 * Requires Admin or Engineer role.
 * 
 * @param {string} type - Lookup type key (e.g. 'sources')
 * @param {Object|Array} dataPayload - The JSON payload to save
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function updateLookup(type, dataPayload) {
    try {
        const { data, error } = await supabase
            .from('lookups')
            .update({ data: dataPayload })
            .eq('type', type)
            .select()
            .single();

        if (error) {
            console.error(`Error updating lookup '${type}':`, error);
            return { data: null, error };
        }
        return { data, error: null };
    } catch (err) {
        console.error(`Exception in updateLookup('${type}'):`, err);
        return { data: null, error: err };
    }
}

/**
 * Fetch Source metadata (categories and rulesets) from lookups table.
 * 
 * @returns {Promise<Object>} Object with types and rulesets arrays
 */
export async function getSourceLookups() {
    try {
        const { data, error } = await supabase
            .from('lookups')
            .select('data')
            .eq('type', 'sources')
            .maybeSingle();

        if (error || !data) {
            console.error('Error fetching source lookups:', error);
            return { types: [], rulesets: [] };
        }
        return data.data || { types: [], rulesets: [] };
    } catch (error) {
        console.error('Error in getSourceLookups:', error);
        return { types: [], rulesets: [] };
    }
}

/**
 * Fetch all Source Categories from lookups.
 * Backward-compatible helper returning category objects.
 * 
 * @returns {Promise<Array>} Array of category objects
 */
export async function getSourceCategories() {
    const lookups = await getSourceLookups();
    return lookups.types || [];
}

// ================================================================
// In-Memory Sources Cache
// ================================================================
let sourcesCache = null;
let sourcesMap = null;

/**
 * Clears the in-memory sources cache (called on mutation).
 */
export function clearSourcesCache() {
    sourcesCache = null;
    sourcesMap = null;
}

/**
 * Fetch all Sources from Supabase with in-memory caching.
 * 
 * @param {boolean} [forceRefresh=false] - Force cache bypass
 * @returns {Promise<Array>} Array of source objects
 */
export async function getSourcesCached(forceRefresh = false) {
    if (forceRefresh || !sourcesCache) {
        sourcesCache = await getSources();
        sourcesMap = new Map();
        for (const s of sourcesCache) {
            if (s.source_key) sourcesMap.set(s.source_key, s);
            if (s.abbreviation) sourcesMap.set(s.abbreviation, s);
        }
    }
    return sourcesCache;
}

/**
 * Returns a Map of all sources keyed by source_key and abbreviation.
 * 
 * @param {boolean} [forceRefresh=false]
 * @returns {Promise<Map<string, Object>>}
 */
export async function getSourcesMap(forceRefresh = false) {
    if (forceRefresh || !sourcesMap) {
        await getSourcesCached(forceRefresh);
    }
    return sourcesMap;
}

/**
 * Synchronous lookup for a source by key/abbreviation from the cache.
 * Returns null if not cached yet or not found.
 * 
 * @param {string} key - e.g. 'MPMM', 'PHB2014', 'SCAG'
 * @returns {Object|null}
 */
export function getSourceByKey(key) {
    if (!key || !sourcesMap) return null;
    return sourcesMap.get(key) || null;
}

/**
 * Fetch all Sources from Supabase.
 * 
 * @returns {Promise<Array>} Array of source objects
 */
export async function getSources() {
    try {
        return await fetchAll('ac_sources', '*', [
            { column: 'display_order', ascending: true },
            { column: 'name', ascending: true }
        ]);
    } catch (error) {
        console.error('Error fetching sources:', error);
        return [];
    }
}

/**
 * Updates an existing Source record in Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {string} id - The UUID of the source record
 * @param {Object} updates - Object containing fields to update
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function updateSource(id, updates) {
    try {
        const { data, error } = await supabase
            .from('ac_sources')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating source:', error);
            return { data: null, error };
        }
        clearSourcesCache();
        return { data, error: null };
    } catch (err) {
        console.error('Exception updating source:', err);
        return { data: null, error: err };
    }
}

/**
 * Creates a new Source record in Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {Object} sourceData - Object containing new source fields
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function createSource(sourceData) {
    try {
        const { data, error } = await supabase
            .from('ac_sources')
            .insert(sourceData)
            .select()
            .single();

        if (error) {
            console.error('Error creating source:', error);
            return { data: null, error };
        }
        clearSourcesCache();
        return { data, error: null };
    } catch (err) {
        console.error('Exception creating source:', err);
        return { data: null, error: err };
    }
}

/**
 * Deletes a Source record from Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {string} id - The UUID of the source to delete
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function deleteSource(id) {
    try {
        const { error } = await supabase
            .from('ac_sources')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting source:', error);
            return { success: false, error };
        }
        clearSourcesCache();
        return { success: true, error: null };
    } catch (err) {
        console.error('Exception deleting source:', err);
        return { success: false, error: err };
    }
}

/**
 * Creates a new Race record in Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {Object} raceData - Object containing new race fields
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function createRace(raceData) {
    try {
        const { data, error } = await supabase
            .from('ac_races')
            .insert(raceData)
            .select()
            .single();

        if (error) {
            console.error('Error creating race:', error);
            return { data: null, error };
        }
        return { data, error: null };
    } catch (err) {
        console.error('Exception creating race:', err);
        return { data: null, error: err };
    }
}

/**
 * Updates an existing Race record in Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {string} id - The UUID of the race to update
 * @param {Object} updates - Object containing modified fields
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function updateRace(id, updates) {
    try {
        const { data, error } = await supabase
            .from('ac_races')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating race:', error);
            return { data: null, error };
        }
        return { data, error: null };
    } catch (err) {
        console.error('Exception updating race:', err);
        return { data: null, error: err };
    }
}

/**
 * Deletes a Race record from Supabase.
 * Cascade-deletes all associated subraces.
 * Requires Admin or Engineer role.
 * 
 * @param {string} id - The UUID of the race to delete
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function deleteRace(id) {
    try {
        const { error } = await supabase
            .from('ac_races')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting race:', error);
            return { success: false, error };
        }
        return { success: true, error: null };
    } catch (err) {
        console.error('Exception deleting race:', err);
        return { success: false, error: err };
    }
}

/**
 * Creates a new Subrace record in Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {Object} subraceData - Object containing new subrace fields
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function createSubrace(subraceData) {
    try {
        const { data, error } = await supabase
            .from('ac_subraces')
            .insert(subraceData)
            .select()
            .single();

        if (error) {
            console.error('Error creating subrace:', error);
            return { data: null, error };
        }
        return { data, error: null };
    } catch (err) {
        console.error('Exception creating subrace:', err);
        return { data: null, error: err };
    }
}

/**
 * Updates an existing Subrace record in Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {string} id - The UUID of the subrace to update
 * @param {Object} updates - Object containing modified fields
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function updateSubrace(id, updates) {
    try {
        const { data, error } = await supabase
            .from('ac_subraces')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating subrace:', error);
            return { data: null, error };
        }
        return { data, error: null };
    } catch (err) {
        console.error('Exception updating subrace:', err);
        return { data: null, error: err };
    }
}

/**
 * Deletes a Subrace record from Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {string} id - The UUID of the subrace to delete
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function deleteSubrace(id) {
    try {
        const { error } = await supabase
            .from('ac_subraces')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting subrace:', error);
            return { success: false, error };
        }
        return { success: true, error: null };
    } catch (err) {
        console.error('Exception deleting subrace:', err);
        return { success: false, error: err };
    }
}

/**
 * Creates a new Class record in Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {Object} classData - Object containing new class fields
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function createClass(classData) {
    try {
        const { data, error } = await supabase
            .from('ac_classes')
            .insert(classData)
            .select()
            .single();

        if (error) {
            console.error('Error creating class:', error);
            return { data: null, error };
        }
        return { data, error: null };
    } catch (err) {
        console.error('Exception creating class:', err);
        return { data: null, error: err };
    }
}

/**
 * Updates an existing Class record in Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {string} id - The UUID of the class to update
 * @param {Object} updates - Object containing modified fields
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function updateClass(id, updates) {
    try {
        const { data, error } = await supabase
            .from('ac_classes')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating class:', error);
            return { data: null, error };
        }
        return { data, error: null };
    } catch (err) {
        console.error('Exception updating class:', err);
        return { data: null, error: err };
    }
}

/**
 * Deletes a Class record from Supabase.
 * Cascade-deletes all associated subclasses.
 * Requires Admin or Engineer role.
 * 
 * @param {string} id - The UUID of the class to delete
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function deleteClass(id) {
    try {
        const { error } = await supabase
            .from('ac_classes')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting class:', error);
            return { success: false, error };
        }
        return { success: true, error: null };
    } catch (err) {
        console.error('Exception deleting class:', err);
        return { success: false, error: err };
    }
}

/**
 * Creates a new Subclass record in Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {Object} subclassData - Object containing new subclass fields
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function createSubclass(subclassData) {
    try {
        const { data, error } = await supabase
            .from('ac_subclasses')
            .insert(subclassData)
            .select()
            .single();

        if (error) {
            console.error('Error creating subclass:', error);
            return { data: null, error };
        }
        return { data, error: null };
    } catch (err) {
        console.error('Exception creating subclass:', err);
        return { data: null, error: err };
    }
}

/**
 * Updates an existing Subclass record in Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {string} id - The UUID of the subclass to update
 * @param {Object} updates - Object containing modified fields
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function updateSubclass(id, updates) {
    try {
        const { data, error } = await supabase
            .from('ac_subclasses')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating subclass:', error);
            return { data: null, error };
        }
        return { data, error: null };
    } catch (err) {
        console.error('Exception updating subclass:', err);
        return { data: null, error: err };
    }
}

/**
 * Deletes a Subclass record from Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {string} id - The UUID of the subclass to delete
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function deleteSubclass(id) {
    try {
        const { error } = await supabase
            .from('ac_subclasses')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting subclass:', error);
            return { success: false, error };
        }
        return { success: true, error: null };
    } catch (err) {
        console.error('Exception deleting subclass:', err);
        return { success: false, error: err };
    }
}

/**
 * Creates a new Background record in Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {Object} backgroundData - Background fields to insert
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function createBackground(backgroundData) {
    try {
        const { data, error } = await supabase
            .from('ac_backgrounds')
            .insert(backgroundData)
            .select()
            .single();

        if (error) {
            console.error('Error creating background:', error);
            return { data: null, error };
        }
        return { data, error: null };
    } catch (err) {
        console.error('Exception creating background:', err);
        return { data: null, error: err };
    }
}

/**
 * Updates an existing Background record in Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {string} id - The UUID of the background to update
 * @param {Object} updates - Object containing modified fields
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function updateBackground(id, updates) {
    try {
        const { data, error } = await supabase
            .from('ac_backgrounds')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating background:', error);
            return { data: null, error };
        }
        return { data, error: null };
    } catch (err) {
        console.error('Exception updating background:', err);
        return { data: null, error: err };
    }
}

/**
 * Deletes a Background record from Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {string} id - The UUID of the background to delete
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function deleteBackground(id) {
    try {
        const { error } = await supabase
            .from('ac_backgrounds')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting background:', error);
            return { success: false, error };
        }
        return { success: true, error: null };
    } catch (err) {
        console.error('Exception deleting background:', err);
        return { success: false, error: err };
    }
}

/**
 * Fetches all Language Types (classifications) from Supabase.
 * 
 * @returns {Promise<Array>} Array of language type objects
 */
export async function getLanguageTypes() {
    try {
        const { data, error } = await supabase
            .from('ac_language_types')
            .select('*')
            .order('display_order', { ascending: true });

        if (error) {
            console.error('Error fetching language types:', error);
            return [];
        }
        return data || [];
    } catch (err) {
        console.error('Exception fetching language types:', err);
        return [];
    }
}

/**
 * Creates a new Language record in Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {Object} languageData - Language fields to insert
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function createLanguage(languageData) {
    try {
        const { data, error } = await supabase
            .from('ac_languages')
            .insert(languageData)
            .select(`
                *,
                language_type:type_id (
                    id,
                    name,
                    description,
                    display_order
                )
            `)
            .single();

        if (error) {
            console.error('Error creating language:', error);
            return { data: null, error };
        }
        return { data, error: null };
    } catch (err) {
        console.error('Exception creating language:', err);
        return { data: null, error: err };
    }
}

/**
 * Updates an existing Language record in Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {string} id - The UUID of the language to update
 * @param {Object} updates - Object containing modified fields
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function updateLanguage(id, updates) {
    try {
        const { data, error } = await supabase
            .from('ac_languages')
            .update(updates)
            .eq('id', id)
            .select(`
                *,
                language_type:type_id (
                    id,
                    name,
                    description,
                    display_order
                )
            `)
            .single();

        if (error) {
            console.error('Error updating language:', error);
            return { data: null, error };
        }
        return { data, error: null };
    } catch (err) {
        console.error('Exception updating language:', err);
        return { data: null, error: err };
    }
}

/**
 * Deletes a Language record from Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {string} id - The UUID of the language to delete
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function deleteLanguage(id) {
    try {
        const { error } = await supabase
            .from('ac_languages')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting language:', error);
            return { success: false, error };
        }
        return { success: true, error: null };
    } catch (err) {
        console.error('Exception deleting language:', err);
        return { success: false, error: err };
    }
}

/**
 * Creates a new Feat in Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {Object} featData - Feat fields to insert
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function createFeat(featData) {
    try {
        const { data, error } = await supabase
            .from('ac_feats')
            .insert(featData)
            .select()
            .single();

        if (error) {
            console.error('Error creating feat:', error);
            return { data: null, error };
        }
        return { data, error: null };
    } catch (err) {
        console.error('Exception creating feat:', err);
        return { data: null, error: err };
    }
}

/**
 * Updates an existing Feat in Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {string} id - UUID of the feat to update
 * @param {Object} updates - Modified fields
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function updateFeat(id, updates) {
    try {
        const { data, error } = await supabase
            .from('ac_feats')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating feat:', error);
            return { data: null, error };
        }
        return { data, error: null };
    } catch (err) {
        console.error('Exception updating feat:', err);
        return { data: null, error: err };
    }
}

/**
 * Deletes a Feat from Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {string} id - UUID of the feat to delete
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function deleteFeat(id) {
    try {
        const { error } = await supabase
            .from('ac_feats')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting feat:', error);
            return { success: false, error };
        }
        return { success: true, error: null };
    } catch (err) {
        console.error('Exception deleting feat:', err);
        return { success: false, error: err };
    }
}

/**
 * Creates a new Fighting Style in Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {Object} styleData - Fighting Style fields to insert
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function createFightingStyle(styleData) {
    try {
        const { data, error } = await supabase
            .from('ac_fighting_styles')
            .insert(styleData)
            .select()
            .single();

        if (error) {
            console.error('Error creating fighting style:', error);
            return { data: null, error };
        }
        return { data, error: null };
    } catch (err) {
        console.error('Exception creating fighting style:', err);
        return { data: null, error: err };
    }
}

/**
 * Updates an existing Fighting Style in Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {string} id - UUID of the style to update
 * @param {Object} updates - Modified fields
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function updateFightingStyle(id, updates) {
    try {
        const { data, error } = await supabase
            .from('ac_fighting_styles')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating fighting style:', error);
            return { data: null, error };
        }
        return { data, error: null };
    } catch (err) {
        console.error('Exception updating fighting style:', err);
        return { data: null, error: err };
    }
}

/**
 * Deletes a Fighting Style from Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {string} id - UUID of the style to delete
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function deleteFightingStyle(id) {
    try {
        const { error } = await supabase
            .from('ac_fighting_styles')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting fighting style:', error);
            return { success: false, error };
        }
        return { success: true, error: null };
    } catch (err) {
        console.error('Exception deleting fighting style:', err);
        return { success: false, error: err };
    }
}

/**
 * Creates a new Artificer Infusion in Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {Object} infusionData - Infusion fields to insert
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function createArtificerInfusion(infusionData) {
    try {
        const { data, error } = await supabase
            .from('ac_artificer_infusions')
            .insert(infusionData)
            .select()
            .single();

        if (error) {
            console.error('Error creating artificer infusion:', error);
            return { data: null, error };
        }
        return { data, error: null };
    } catch (err) {
        console.error('Exception creating artificer infusion:', err);
        return { data: null, error: err };
    }
}

/**
 * Updates an existing Artificer Infusion in Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {string} id - UUID of the infusion to update
 * @param {Object} updates - Modified fields
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function updateArtificerInfusion(id, updates) {
    try {
        const { data, error } = await supabase
            .from('ac_artificer_infusions')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating artificer infusion:', error);
            return { data: null, error };
        }
        return { data, error: null };
    } catch (err) {
        console.error('Exception updating artificer infusion:', err);
        return { data: null, error: err };
    }
}

/**
 * Deletes an Artificer Infusion from Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {string} id - UUID of the infusion to delete
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function deleteArtificerInfusion(id) {
    try {
        const { error } = await supabase
            .from('ac_artificer_infusions')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting artificer infusion:', error);
            return { success: false, error };
        }
        return { success: true, error: null };
    } catch (err) {
        console.error('Exception deleting artificer infusion:', err);
        return { success: false, error: err };
    }
}

/**
 * Creates a new Eldritch Invocation in Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {Object} invocationData - Invocation fields to insert
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function createEldritchInvocation(invocationData) {
    try {
        const { data, error } = await supabase
            .from('ac_eldritch_invocations')
            .insert(invocationData)
            .select()
            .single();

        if (error) {
            console.error('Error creating eldritch invocation:', error);
            return { data: null, error };
        }
        return { data, error: null };
    } catch (err) {
        console.error('Exception creating eldritch invocation:', err);
        return { data: null, error: err };
    }
}

/**
 * Updates an existing Eldritch Invocation in Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {string} id - UUID of the invocation to update
 * @param {Object} updates - Modified fields
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function updateEldritchInvocation(id, updates) {
    try {
        const { data, error } = await supabase
            .from('ac_eldritch_invocations')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating eldritch invocation:', error);
            return { data: null, error };
        }
        return { data, error: null };
    } catch (err) {
        console.error('Exception updating eldritch invocation:', err);
        return { data: null, error: err };
    }
}

/**
 * Deletes an Eldritch Invocation from Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {string} id - UUID of the invocation to delete
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function deleteEldritchInvocation(id) {
    try {
        const { error } = await supabase
            .from('ac_eldritch_invocations')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting eldritch invocation:', error);
            return { success: false, error };
        }
        return { success: true, error: null };
    } catch (err) {
        console.error('Exception deleting eldritch invocation:', err);
        return { success: false, error: err };
    }
}

/**
 * Creates a new Spell entry in Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {Object} spellData - Spell fields to insert
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function createSpell(spellData) {
    try {
        const { data, error } = await supabase
            .from('ac_spells')
            .insert(spellData)
            .select()
            .single();

        if (error) {
            console.error('Error creating spell:', error);
            return { data: null, error };
        }
        return { data, error: null };
    } catch (err) {
        console.error('Exception creating spell:', err);
        return { data: null, error: err };
    }
}

/**
 * Updates an existing Spell entry in Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {string} id - UUID of the spell to update
 * @param {Object} updates - Modified fields
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function updateSpell(id, updates) {
    try {
        const { data, error } = await supabase
            .from('ac_spells')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating spell:', error);
            return { data: null, error };
        }
        return { data, error: null };
    } catch (err) {
        console.error('Exception updating spell:', err);
        return { data: null, error: err };
    }
}

/**
 * Deletes a Spell entry from Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {string} id - UUID of the spell to delete
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function deleteSpell(id) {
    try {
        const { error } = await supabase
            .from('ac_spells')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting spell:', error);
            return { success: false, error };
        }
        return { success: true, error: null };
    } catch (err) {
        console.error('Exception deleting spell:', err);
        return { success: false, error: err };
    }
}

/**
 * Creates a new Equipment entry in Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {Object} equipmentData - Equipment fields to insert
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function createEquipment(equipmentData) {
    try {
        const { data, error } = await supabase
            .from('ac_equipment')
            .insert(equipmentData)
            .select(`
                *,
                equip_type:equip_type_id (
                    id,
                    name,
                    notes,
                    display_order
                ),
                category:category_id (
                    id,
                    name,
                    notes,
                    display_order
                )
            `)
            .single();

        if (error) {
            console.error('Error creating equipment:', error);
            return { data: null, error };
        }
        return { data, error: null };
    } catch (err) {
        console.error('Exception creating equipment:', err);
        return { data: null, error: err };
    }
}

/**
 * Updates an existing Equipment entry in Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {string} id - UUID of the equipment to update
 * @param {Object} updates - Modified fields
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function updateEquipment(id, updates) {
    try {
        const { data, error } = await supabase
            .from('ac_equipment')
            .update(updates)
            .eq('id', id)
            .select(`
                *,
                equip_type:equip_type_id (
                    id,
                    name,
                    notes,
                    display_order
                ),
                category:category_id (
                    id,
                    name,
                    notes,
                    display_order
                )
            `)
            .single();

        if (error) {
            console.error('Error updating equipment:', error);
            return { data: null, error };
        }
        return { data, error: null };
    } catch (err) {
        console.error('Exception updating equipment:', err);
        return { data: null, error: err };
    }
}

/**
 * Deletes an Equipment entry from Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {string} id - UUID of the equipment to delete
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function deleteEquipment(id) {
    try {
        const { error } = await supabase
            .from('ac_equipment')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting equipment:', error);
            return { success: false, error };
        }
        return { success: true, error: null };
    } catch (err) {
        console.error('Exception deleting equipment:', err);
        return { success: false, error: err };
    }
}

/**
 * Inserts a new Downtime activity into Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {Object} downtimeData - Payload containing check_id, downtime_type_id, category_id, name, gold_cost, dtp_cost, etc.
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function createDowntime(downtimeData) {
    try {
        const { data, error } = await supabase
            .from('ac_downtime')
            .insert(downtimeData)
            .select(`
                *,
                downtime_type:downtime_type_id (
                    id,
                    name,
                    notes,
                    description,
                    display_order
                ),
                category:category_id (
                    id,
                    name,
                    notes,
                    display_order
                )
            `)
            .single();

        if (error) {
            console.error('Error creating downtime:', error);
            return { data: null, error };
        }
        return { data, error: null };
    } catch (err) {
        console.error('Exception creating downtime:', err);
        return { data: null, error: err };
    }
}

/**
 * Updates an existing Downtime activity in Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {string} id - UUID of the downtime activity to update
 * @param {Object} updates - Modified fields
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function updateDowntime(id, updates) {
    try {
        const { data, error } = await supabase
            .from('ac_downtime')
            .update(updates)
            .eq('id', id)
            .select(`
                *,
                downtime_type:downtime_type_id (
                    id,
                    name,
                    notes,
                    description,
                    display_order
                ),
                category:category_id (
                    id,
                    name,
                    notes,
                    display_order
                )
            `)
            .single();

        if (error) {
            console.error('Error updating downtime:', error);
            return { data: null, error };
        }
        return { data, error: null };
    } catch (err) {
        console.error('Exception updating downtime:', err);
        return { data: null, error: err };
    }
}

/**
 * Deletes a Downtime activity from Supabase.
 * Requires Admin or Engineer role.
 * 
 * @param {string} id - UUID of the downtime activity to delete
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function deleteDowntime(id) {
    try {
        const { error } = await supabase
            .from('ac_downtime')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting downtime:', error);
            return { success: false, error };
        }
        return { success: true, error: null };
    } catch (err) {
        console.error('Exception deleting downtime:', err);
        return { success: false, error: err };
    }
}




