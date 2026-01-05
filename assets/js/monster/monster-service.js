/**
 * monster-service.js
 * * Data Access Layer (DAL) for the application.
 * Handles all direct interactions with the Supabase backend.
 */

import { supabase } from './monster-app.js';

/**
 * Fetch all Live monsters for the Library.
 * * UPDATED: Uses the explicit Foreign Key constraint name to resolve the
 * * PGRST201 embedding error.
 * @returns {Promise<Array>}
 */
export async function getLiveMonsters() {
    // We use the syntax 'table!constraint_name ( columns )'
    // This tells Supabase exactly which relationship to use.
    const { data, error } = await supabase
        .from('monsters')
        .select(`
            row_id, name, cr, size, species, usage, slug, image_url, tags,
            monster_habitats (
                lookup_habitats!monster_habitats_habitat_id_fkey ( name )
            )
        `)
        .eq('is_live', true)
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching monster library:', error);
        return [];
    }

    // Process the data to flatten the nested Supabase structure
    // from: monster_habitats: [{ lookup_habitats: { name: 'Forest' } }] 
    // to:   habitats: ['Forest']
    return data.map(monster => {
        const flatHabitats = monster.monster_habitats 
            ? monster.monster_habitats.map(mh => mh.lookup_habitats?.name).filter(Boolean)
            : [];

        return {
            ...monster,
            habitats: flatHabitats
        };
    });
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
    return { 
        ...monster, 
        features: features || [],
        creator_name: creatorName 
    };
}