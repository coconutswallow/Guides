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
 * * Uses Supabase "Foreign Key Joins" to fetch the Creator Name from the 'users' table.
 * @param {string} slug 
 * @returns {Promise<Object|null>}
 */
export async function getMonsterBySlug(slug) {
    // 1. Get Core Data + Joined Creator Name
    // Supabase automatically detects the foreign key between 'monsters.creator_id' 
    // and 'users.id'. We ask it to embed the 'users' table and return only 'discord_name'.
    const { data: monster, error } = await supabase
        .from('monsters')
        .select(`
            *,
            users (
                discord_name
            )
        `)
        .eq('slug', slug)
        .eq('is_live', true)
        .single();

    if (error || !monster) {
        if (error) console.error(`Error fetching monster for slug "${slug}":`, error);
        return null;
    }

    // 2. Get Related Features
    const { data: features } = await supabase
        .from('monster_features')
        .select('*')
        .eq('parent_row_id', monster.row_id)
        .order('display_order', { ascending: true });

    // 3. Data Formatting
    // Supabase returns the join as an object: monster.users = { discord_name: "..." }
    // We flatten this to a simple string for the view.
    // If the join fails or user is missing, we default to 'Unknown'.
    const creatorName = monster.users?.discord_name || 'Unknown';

    return { 
        ...monster, 
        features: features || [],
        creator_name: creatorName
    };
}