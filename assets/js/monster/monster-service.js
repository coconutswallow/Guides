import { supabase } from './monster-app.js';

/**
 * Fetch all Live monsters for the Library.
 */
export async function getLiveMonsters() {
    // UPDATED: Using lowercase column names to match the database.
    const { data, error } = await supabase
        .from('monsters')
        .select(`
            row_id, name, cr, size, species, usage, slug, image_url, tags
        `)
        .eq('is_live', true)
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching monsters:', error);
        return [];
    }
    return data;
}

/**
 * Fetch full monster details by Slug.
 */
export async function getMonsterBySlug(slug) {
    // 1. Get Core Monster Data
    const { data: monster, error } = await supabase
        .from('monsters')
        .select('*')
        .eq('slug', slug)
        .eq('is_live', true)
        .single();

    if (error || !monster) return null;

    // 2. Get Features (Traits, Actions, etc)
    const { data: features } = await supabase
        .from('monster_features')
        .select('*')
        .eq('parent_row_id', monster.row_id)
        .order('display_order', { ascending: true });

    return { ...monster, features: features || [] };
}