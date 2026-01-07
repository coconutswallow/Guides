/**
 * monster-service.js
 * Service to interact with Supabase for Monster data.
 */

// ADJUSTED PATH: Go up one level (..) to find the config file
import { supabase } from '../supabase-config.js';

export async function getMonsters() {
    let { data, error } = await supabase
        .from('monsters')
        .select('name, slug, species, cr, image_url, row_id')
        .eq('is_live', true)
        .order('name');
    
    if (error) {
        console.error('Error fetching monsters:', error);
        return [];
    }
    return data;
}

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
    // This looks up features where parent_row_id matches the monster's row_id.
    // This bypasses the need for a strict Foreign Key relation in the DB.
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