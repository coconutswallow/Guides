/**
 * monster-service.js
 * Data Access Layer (DAL)
 */

import { supabase } from './monster-app.js';

/**
 * Fetch all Live monsters for the Library.
 * Includes Tags (parsed) and Habitats (flattened).
 * @returns {Promise<Array>}
 */
export async function getLiveMonsters() {
    const { data, error } = await supabase
        .from('monsters')
        .select(`
            row_id, name, cr, size, species, usage, slug, image_url, tags,
            monster_habitats (
                lookup_habitats ( name )
            )
        `)
        .eq('is_live', true)
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching monster library:', error);
        return [];
    }

    // Post-process: Flatten joined data and parse JSON strings
    return data.map(monster => {
        // 1. Flatten Habitats: [{lookup: {name: 'Forest'}}] -> ['Forest']
        const habitats = (monster.monster_habitats || [])
            .map(item => item.lookup_habitats?.name)
            .filter(Boolean)
            .sort();

        // 2. Parse Tags: "[\"Shapechanger\"]" -> ['Shapechanger']
        let tags = [];
        if (Array.isArray(monster.tags)) {
            tags = monster.tags;
        } else if (typeof monster.tags === 'string') {
            try { tags = JSON.parse(monster.tags); } catch (e) { console.warn('Tag parse error', e); }
        }

        return {
            ...monster,
            habitats,
            tags
        };
    });
}

/**
 * Fetch full monster details by Slug.
 * (Same as previous implementation)
 */
export async function getMonsterBySlug(slug) {
    const { data: monster, error } = await supabase
        .from('monsters')
        .select(`
            *,
            users ( discord_name ),
            monster_habitats (
                lookup_habitats ( name )
            )
        `)
        .eq('slug', slug)
        .eq('is_live', true)
        .single();

    if (error || !monster) {
        if (error) console.error(`Error fetching monster for slug "${slug}":`, error);
        return null;
    }

    const { data: features } = await supabase
        .from('monster_features')
        .select('*')
        .eq('parent_row_id', monster.row_id)
        .order('display_order', { ascending: true });

    const creatorName = monster.users?.discord_name || 'Unknown';
    
    // Flatten Habitats for Detail View
    const habitats = (monster.monster_habitats || [])
        .map(item => item.lookup_habitats?.name)
        .filter(Boolean)
        .sort();

    return { 
        ...monster, 
        features: features || [],
        creator_name: creatorName,
        habitats: habitats
    };
}