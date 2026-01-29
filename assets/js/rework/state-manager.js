import { supabase } from "../supabaseClient.js";

// Global State
const state = {
    characterData: [],
    currentReworkId: null,
    savedReworkIds: [] // loaded from localStorage
};

export async function fetchAllReworks() {
    try {
        const { data, error } = await supabase
            .from('rework')
            .select(`
                id,
                created_at,
                updated_at,
                discord_id,
                character_name,
                old_character,
                new_character,
                cost,
                notes,
                user_id
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    } catch (err) {
        console.error("Error fetching all reworks:", err);
        return [];
    }
}

const STORAGE_KEY = 'my_rework_ids';

export const getState = () => state;
export const setReworkId = (id) => { state.currentReworkId = id; };

// --- Local Storage Management ---

function loadLocalIds() {
    const json = localStorage.getItem(STORAGE_KEY);
    return json ? JSON.parse(json) : [];
}

function addLocalId(id) {
    const ids = loadLocalIds();
    if (!ids.includes(id)) {
        ids.push(id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    }
    state.savedReworkIds = ids;
}

export function removeLocalId(id) {
    let ids = loadLocalIds();
    ids = ids.filter(savedId => savedId !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    state.savedReworkIds = ids;
}

// --- Database Interactions ---

export async function initCharacterData() {
    try {
        state.savedReworkIds = loadLocalIds(); // Load IDs on init
        const { data } = await supabase.from('lookups').select('data').eq('type', 'character').single();
        state.characterData = data?.data || [];
    } catch (e) {
        console.error("Init Error:", e);
    }
}

// Fetch only the reworks that exist in the user's LocalStorage
export async function fetchMyReworks() {
    const ids = loadLocalIds();
    if (ids.length === 0) return [];

    try {
        const { data, error } = await supabase.from('rework')
            .select('id, character_name, updated_at')
            .in('id', ids) // Filter by our local list
            .order('updated_at', { ascending: false });
            
        if (error) throw error;
        return data;
    } catch (err) {
        console.error("Fetch Error:", err);
        return [];
    }
}

export async function loadReworkById(id) {
    try {
        const { data, error } = await supabase.from('rework').select('*').eq('id', id).single();
        if (error) throw error;
        
        state.currentReworkId = data.id;
        
        // If we load someone else's rework, add it to our local list so we can find it again
        addLocalId(data.id); 
        
        return data;
    } catch (err) {
        throw err;
    }
}

export async function saveReworkToDb(payload) {
    // No user_id injection anymore
    payload.updated_at = new Date().toISOString();

    const currentId = state.currentReworkId;
    let result;

    if (currentId) {
        // Update existing
        const { data, error } = await supabase.from('rework')
            .update(payload)
            .eq('id', currentId)
            .select();
        if (error) throw error;
        result = data[0];
    } else {
        // Create new
        const { data, error } = await supabase.from('rework')
            .insert([payload])
            .select();
        if (error) throw error;
        result = data[0];
    }

    if (result) {
        state.currentReworkId = result.id;
        addLocalId(result.id); // Save UUID to cookies/storage
    }
    return result;
}