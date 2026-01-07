/**
 * monster-service.js
 * Service to interact with Supabase for Monster data.
 * Location: \assets\js\monster\monster-service.js
 */
import { supabase } from '../supabaseClient.js';

export async function getMonsters() {
    let { data, error } = await supabase
        .from('monsters')
        .select('name, slug, species, cr, image_url, row_id, size, usage, alignment, creator_discord_id')
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
    let { data: monster, error } = await supabase
        .from('monsters')
        .select('*, creator_discord_id::text') 
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

    // 3. Fetch Creator Name
    if (monster.creator_discord_id) {
        const { data: user } = await supabase
            .from('discord_users')
            .select('display_name')
            .eq('discord_id', monster.creator_discord_id)
            .single();

        if (user) {
            monster.creator_name = user.display_name;
        } else {
            monster.creator_name = "Unknown";
        }
    }

    return monster;
}