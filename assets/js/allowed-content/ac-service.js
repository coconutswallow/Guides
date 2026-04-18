/**
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
    const { data, error } = await supabase
        .from('ac_feats')
        .select('*')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching feats:', error);
        return [];
    }

    return data;
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
