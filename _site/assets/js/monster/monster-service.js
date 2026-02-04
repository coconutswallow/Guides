/**
 * monster-service.js
 * Service to interact with Supabase for Monster data.
 * Location: \assets\js\monster\monster-service.js
 */
import { supabase } from '../supabaseClient.js';

export async function getMonsters() {
    // UPDATED: Added 'creator' to select list
    let { data, error } = await supabase
        .from('monsters')
        .select('name, slug, species, cr, image_url, row_id, size, usage, alignment, creator_discord_id, creator')
        .eq('is_live', true)
        .order('name');
    
    if (error) {
        console.error('Error fetching monsters:', error);
        return [];
    }
    return data;
}

export async function getMonsterBySlug(slug) {
    // 1. Fetch Monster
    // UPDATED: Added 'creator' to select list
    let { data: monster, error } = await supabase
        .from('monsters')
        .select('*, creator_discord_id::text, creator') 
        .eq('slug', slug)
        .eq('is_live', true)
        .single();

    if (error || !monster) {
        console.error('Error fetching monster:', error);
        return null;
    }

    // 2. Fetch Features
    const { data: features } = await supabase
        .from('monster_features')
        .select('*')
        .eq('parent_row_id', monster.row_id)
        .order('display_order', { ascending: true });

    monster.features = features || [];

    // REMOVED: Step 3 (Fetch Creator Name) is deleted. 
    // The 'monster' object now already contains the 'creator' field from Step 1.

    return monster;
}

// ... existing getMonsterLookups function remains unchanged ...
export async function getMonsterLookups() {
    let { data, error } = await supabase
        .from('lookups')
        .select('data')
        .eq('type', 'monster')
        .single();
    
    if (error || !data) {
        console.error('Error fetching lookups:', error);
        return null;
    }

    if (typeof data.data === 'string') {
        return JSON.parse(data.data);
    }
    
    return data.data;
}