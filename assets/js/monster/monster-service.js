/**
 * monster-service.js
 * Service to interact with Supabase for Monster data.
 * Location: \assets\js\monster\monster-service.js
 */

// Import the client config (Go up one level)
import { supabase } from '../supabaseClient.js';

/**
 * Fetches the list of all live monsters for the library view.
 */
export async function getMonsters() {
    let { data, error } = await supabase
        .from('monsters')
        .select('name, slug, species, cr, image_url, row_id, usage, size, alignment')
        .eq('is_live', true)
        .order('name');
    
    if (error) {
        console.error('Error fetching monsters:', error);
        return [];
    }
    return data;
}

/**
 * Fetches a single monster by slug, including its features.
 */
export async function getMonsterBySlug(slug) {
    // 1. Fetch the Monster Core Data
    let { data: monster, error } = await supabase
        .from('monsters')
        .select('*')
        .eq('slug', slug)
        .eq('is_live', true)
        .single();

    if (error || !monster) {
        console.error('Error fetching monster:', error);
        return null;
    }

    // 2. Manually Fetch Features
    // We query the features table separately using parent_row_id.
    const { data: features, error: featureError } = await supabase
        .from('monster_features')
        .select('*')
        .eq('parent_row_id', monster.row_id)
        .order('display_order', { ascending: true });

    if (featureError) {
        console.warn('Error fetching features:', featureError);
        monster.features = [];
    } else {
        monster.features = features || [];
    }

    return monster;
}