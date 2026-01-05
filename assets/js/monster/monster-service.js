import { supabase } from './monster-app.js';

/**
 * Fetch all Live monsters for the Library.
 */
export async function getLiveMonsters() {
    const { data, error } = await supabase
        .from('monsters')
        .select(`
            Row_ID, Name, CR, Size, Species, Type, Usage, Slug, Image_URL, Tags
        `)
        .eq('Is_Live', true)
        .order('Name', { ascending: true });

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
        .eq('Slug', slug)
        .eq('Is_Live', true)
        .single();

    if (error || !monster) return null;

    // 2. Get Features (Traits, Actions, etc)
    const { data: features } = await supabase
        .from('monster_features')
        .select('*')
        .eq('Parent_Row_ID', monster.Row_ID)
        .order('Display_Order', { ascending: true });

    return { ...monster, features: features || [] };
}