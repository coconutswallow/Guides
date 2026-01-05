/**
 * monster-service.js
 * * Data Access Layer (DAL) for the application.
 * Handles all direct interactions with the Supabase backend.
 */

import { supabase } from './monster-app.js';

/**
 * Fetch all Live monsters for the Library.
 * @returns {Promise<Array>}
 */
export async function getLiveMonsters() {
    const { data, error } = await supabase
        .from('monsters')
        .select(`
            row_id, name, cr, size, species, usage, slug, image_url, tags
        `)
        .eq('is_live', true)
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching monster library:', error);
        return [];
    }
    return data;
}

/**
 * Fetch full monster details by Slug.
 * * Uses a "Two-Step" lookup to ensure the monster loads even if 
 * * the user/creator lookup fails due to RLS permissions.
 * @param {string} slug 
 * @returns {Promise<Object|null>}
 */
export async function getMonsterBySlug(slug) {
    // 1. Get Core Monster Data
    // We fetch the monster first. If this fails, the page is truly 404.
    const { data: monster, error } = await supabase
        .from('monsters')
        .select('*')
        .eq('slug', slug)
        .eq('is_live', true)
        .single();

    if (error || !monster) {
        if (error) console.error(`Error fetching monster core for slug "${slug}":`, error);
        return null;
    }

    // 2. Get Creator Name (Safe Lookup)
    // We perform this separately so that if RLS blocks access to the 'users' table,
    // the monster statblock still loads (just without the name).
    let creatorName = 'Unknown';
    
    if (monster.creator_id) {
        const { data: userData } = await supabase
            .from('users')
            .select('discord_name')
            .eq('id', monster.creator_id)
            .single();
            
        if (userData) {
            creatorName = userData.discord_name;
        }
    }

    // 3. Get Related Features
    const { data: features } = await supabase
        .from('monster_features')
        .select('*')
        .eq('parent_row_id', monster.row_id)
        .order('display_order', { ascending: true });

    // 4. Return Combined Object
    // We manually inject the 'creator_name' property for the view to use.
    return { 
        ...monster, 
        features: features || [],
        creator_name: creatorName 
    };
}