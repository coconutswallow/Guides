/**
 * monster-service.js
 * * Data Access Layer (DAL) for the application.
 */

import { supabase } from './monster-app.js';

/**
 * Fetch all Live monsters for the Library.
 * * UPDATED: Fetches Discord Display Name via Foreign Key join.
 */
export async function getLiveMonsters() {
    // We select the discord_users table. 
    // Note: If you renamed your foreign key, replace 'monsters_creator_discord_id_fkey' 
    // with the actual constraint name found in your Supabase Table settings.
    const { data, error } = await supabase
        .from('monsters')
        .select(`
            row_id, name, cr, size, species, usage, slug, image_url, tags,
            monster_habitats (
                lookup_habitats!monster_habitats_habitat_id_fkey ( name )
            ),
            discord_users ( display_name ) 
        `)
        .eq('is_live', true)
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching monster library:', error);
        return [];
    }

    // Process data to flatten structure
    return data.map(monster => {
        const flatHabitats = monster.monster_habitats 
            ? monster.monster_habitats.map(mh => mh.lookup_habitats?.name).filter(Boolean)
            : [];
            
        // Flatten the joined user object to a simple string property
        const creatorName = monster.discord_users?.display_name || 'Unknown';

        return {
            ...monster,
            habitats: flatHabitats,
            creator_name: creatorName
        };
    });
}

/**
 * Fetch full monster details by Slug.
 * * Uses a "Two-Step" lookup or direct join if permissions allow.
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

    // 2. Get Creator Name via new Discord ID
    let creatorName = 'Unknown';
    if (monster.creator_discord_id) {
        // We fetch from the new table
        const { data: userData } = await supabase
            .from('discord_users')
            .select('display_name')
            .eq('discord_id', monster.creator_discord_id)
            .single();
            
        if (userData) {
            creatorName = userData.display_name;
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