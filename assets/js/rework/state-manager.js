import { supabase } from "../supabaseClient.js";

const state = {
    characterData: [],
    currentReworkId: null,
    savedReworkIds: [] 
};

const STORAGE_KEY = 'my_rework_ids';

export const getState = () => state;
export const setReworkId = (id) => { state.currentReworkId = id; };

function loadLocalIds() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}

function addLocalId(id) {
    const ids = loadLocalIds();
    if (!ids.includes(id)) {
        ids.push(id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    }
}

export function removeLocalId(id) {
    let ids = loadLocalIds();
    ids = ids.filter(savedId => savedId !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export async function initCharacterData() {
    try {
        state.savedReworkIds = loadLocalIds();
        console.log("Fetching character lookup data from Supabase...");
        
        const { data, error } = await supabase
            .from('lookups')
            .select('data')
            .eq('type', 'character')
            .single();
        
        if (error) {
            console.error("Supabase error fetching character data:", error);
            throw error;
        }
        
        if (!data || !data.data) {
            console.warn("No character data found in lookups table");
            state.characterData = [];
            return;
        }
        
        state.characterData = data.data;
        console.log(`✓ Loaded ${state.characterData.length} character class/subclass combinations`);
        
        // Verify data structure
        if (state.characterData.length > 0) {
            const sample = state.characterData[0];
            if (!sample.ASI || !sample.class || !sample.version) {
                console.error("Invalid character data structure. Expected: {ASI, class, version, subclass}");
            }
        }
    } catch (e) {
        console.error("Failed to load character data:", e);
        console.warn("Classes and subclasses will not be populated");
        state.characterData = [];
    }
}

export async function fetchMyReworks() {
    const ids = loadLocalIds();
    if (ids.length === 0) return [];
    try {
        const { data, error } = await supabase.from('rework')
            .select('id, character_name, updated_at')
            .in('id', ids)
            .order('updated_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (err) { 
        console.error("Error fetching reworks:", err);
        return []; 
    }
}

export async function loadReworkById(id) {
    const { data, error } = await supabase.from('rework').select('*').eq('id', id).single();
    if (error) throw error;
    state.currentReworkId = data.id;
    addLocalId(data.id);
    return data;
}

export async function saveReworkToDb(payload) {
    payload.updated_at = new Date().toISOString();
    const currentId = state.currentReworkId;
    let result;

    if (currentId) {
        const { data, error } = await supabase.from('rework').update(payload).eq('id', currentId).select();
        if (error) throw error;
        result = data[0];
    } else {
        const { data, error } = await supabase.from('rework').insert([payload]).select();
        if (error) throw error;
        result = data[0];
    }
    state.currentReworkId = result.id;
    addLocalId(result.id);
    return result;
}

export async function deleteReworkById(id) {
    const { error } = await supabase.from('rework').delete().eq('id', id);
    if (error) throw error;
    removeLocalId(id);
    if (state.currentReworkId === id) state.currentReworkId = null;
}