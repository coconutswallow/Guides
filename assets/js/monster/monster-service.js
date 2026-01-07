/**
 * monster-service.js
 * Service to interact with Supabase for Monster data.
 */
import { supabase } from '../supabaseClient.js';

export async function getMonsters() {
    // Note: Ensure your DB actually has a 'type' column. 
    // Your CSV shows 'species', so you might need to select 'species' instead of 'type'.
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
    let { data, error } = await supabase
        .from('monsters')
        .select(`
            *,
            features:monster_features (*)
        `)
        .eq('slug', slug)
        .eq('is_live', true)
        .single();

    if (error) {
        console.error('Error fetching monster:', error);
        return null;
    }

    // Safeguard: Ensure features is an array if the join returns null
    if (data) {
        data.features = data.features || [];
        
        // Optional: Sort features by display_order if you have that column
        data.features.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    }

    return data;
}