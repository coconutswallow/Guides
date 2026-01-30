/**
 * ================================================================
 * STATE MANAGER MODULE
 * ================================================================
 * 
 * This module manages application state and handles all data persistence
 * operations including:
 * - In-memory state management
 * - LocalStorage operations for tracking saved rework IDs
 * - Supabase database operations for CRUD on rework records
 * - Character data lookup table initialization
 * 
 * @module state-manager
 */

import { supabase } from "../supabaseClient.js";

// ================================================================
// APPLICATION STATE
// ================================================================

/**
 * Central state object for the application.
 * This is a singleton that persists across the session.
 * 
 * @property {Array} characterData - Lookup table of all class/subclass combinations with ASI levels
 * @property {string|null} currentReworkId - UUID of the currently loaded rework
 * @property {string|null} loadedCharacterName - Name of the character when it was loaded from DB
 * @property {Array<string>} savedReworkIds - Array of UUIDs saved in localStorage
 */
const state = {
    characterData: [],           // Populated from Supabase on init
    currentReworkId: null,       // Set when loading or saving a rework
    loadedCharacterName: null,   // Tracks original name to detect changes
    savedReworkIds: []           // Synced with localStorage
};

/**
 * LocalStorage key for persisting rework IDs across sessions.
 * @constant {string}
 */
const STORAGE_KEY = 'my_rework_ids';

// ================================================================
// STATE ACCESSORS
// ================================================================

/**
 * Returns the current application state.
 * 
 * @returns {Object} The state object
 * @example
 * const state = getState();
 * console.log(state.characterData.length);
 */
export const getState = () => state;

/**
 * Sets the current rework ID in state.
 * 
 * @param {string} id - UUID of the rework
 * @example
 * setReworkId('550e8400-e29b-41d4-a716-446655440000');
 */
export const setReworkId = (id) => { 
    state.currentReworkId = id; 
};

// ================================================================
// LOCALSTORAGE OPERATIONS
// ================================================================

/**
 * Loads the array of saved rework IDs from localStorage.
 * 
 * This allows the app to remember which reworks the user has created
 * even after closing the browser. If the data is corrupted or missing,
 * returns an empty array.
 * 
 * @returns {Array<string>} Array of rework UUIDs
 * @private
 * 
 * @example
 * const ids = loadLocalIds();
 * // ['uuid-1', 'uuid-2', 'uuid-3']
 */
function loadLocalIds() {
    try { 
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (error) { 
        console.error('Failed to parse localStorage IDs:', error);
        return []; 
    }
}

/**
 * Adds a rework ID to localStorage if it doesn't already exist.
 * 
 * This is called after successfully saving or loading a rework
 * to ensure the user can access it later from the dropdown.
 * 
 * @param {string} id - UUID to add
 * @private
 * 
 * @example
 * addLocalId('550e8400-e29b-41d4-a716-446655440000');
 */
function addLocalId(id) {
    const ids = loadLocalIds();
    
    // Only add if not already present (prevent duplicates)
    if (!ids.includes(id)) {
        ids.push(id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    }
}

/**
 * Removes a rework ID from localStorage.
 * 
 * Called when a user deletes a rework to clean up the saved list.
 * Exported so it can be used by the main application.
 * 
 * @param {string} id - UUID to remove
 * @public
 * 
 * @example
 * removeLocalId('550e8400-e29b-41d4-a716-446655440000');
 */
export function removeLocalId(id) {
    let ids = loadLocalIds();
    
    // Filter out the specified ID
    ids = ids.filter(savedId => savedId !== id);
    
    // Save back to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

// ================================================================
// CHARACTER DATA INITIALIZATION
// ================================================================

/**
 * Initializes character data from Supabase and localStorage.
 * 
 * This function:
 * 1. Loads saved rework IDs from localStorage into state
 * 2. Fetches the character lookup table from Supabase
 * 3. Validates the data structure
 * 4. Stores it in the state for use by calculations
 * 
 * The character data contains information about all class/subclass
 * combinations and their ASI levels, which is used to calculate
 * how many feat cards are affected by class changes.
 * 
 * @async
 * @returns {Promise<void>}
 * @throws {Error} If Supabase query fails
 * 
 * @example
 * await initCharacterData();
 * console.log('Character data loaded:', getState().characterData.length);
 */
export async function initCharacterData() {
    try {
        // Load saved rework IDs from localStorage
        state.savedReworkIds = loadLocalIds();
        
        console.log("Fetching character lookup data from Supabase...");
        
        // Query the lookups table for character data
        const { data, error } = await supabase
            .from('lookups')
            .select('data')
            .eq('type', 'character')  // Filter for character lookup type
            .single();                 // Expect exactly one row
        
        // Handle query errors
        if (error) {
            console.error("Supabase error fetching character data:", error);
            throw error;
        }
        
        // Handle missing data
        if (!data || !data.data) {
            console.warn("No character data found in lookups table");
            state.characterData = [];
            return;
        }
        
        // Store the character data array in state
        state.characterData = data.data;
        console.log(`✓ Loaded ${state.characterData.length} character class/subclass combinations`);
        
        // Validate data structure (helpful for debugging)
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

// ================================================================
// REWORK CRUD OPERATIONS
// ================================================================

/**
 * Fetches all reworks that the user has saved locally.
 * 
 * Queries Supabase for all reworks whose IDs are stored in localStorage.
 * This populates the "Load Rework" dropdown in the UI.
 * 
 * Returns a lightweight version with only id, name, and timestamp.
 * 
 * @async
 * @returns {Promise<Array<{id: string, character_name: string, updated_at: string}>>} Array of rework summaries
 * 
 * @example
 * const reworks = await fetchMyReworks();
 * reworks.forEach(r => {
 *     console.log(`${r.character_name} - ${r.updated_at}`);
 * });
 */
export async function fetchMyReworks() {
    const ids = loadLocalIds();
    
    // If no IDs in localStorage, return empty array
    if (ids.length === 0) return [];
    
    try {
        // Query Supabase for reworks matching the saved IDs
        const { data, error } = await supabase
            .from('rework')
            .select('id, character_name, updated_at')  // Only fetch needed fields
            .in('id', ids)                              // Filter by saved IDs
            .order('updated_at', { ascending: false }); // Most recent first
        
        if (error) throw error;
        
        return data || [];
        
    } catch (err) { 
        console.error("Error fetching reworks:", err);
        return []; 
    }
}

/**
 * Loads a complete rework record from Supabase by ID.
 * 
 * This function:
 * 1. Fetches the full rework record from the database
 * 2. Updates state with the current ID and character name
 * 3. Adds the ID to localStorage (in case it wasn't already saved)
 * 4. Returns the complete rework data for populating the UI
 * 
 * @async
 * @param {string} id - UUID of the rework to load
 * @returns {Promise<Object>} Complete rework record
 * @throws {Error} If rework not found or database error
 * 
 * @example
 * const rework = await loadReworkById('550e8400-e29b-41d4-a716-446655440000');
 * console.log('Loaded:', rework.character_name);
 */
export async function loadReworkById(id) {
    // Fetch the complete record
    const { data, error } = await supabase
        .from('rework')
        .select('*')          // Get all columns
        .eq('id', id)         // Match the specific ID
        .single();            // Expect exactly one result
    
    if (error) throw error;
    
    // Update state with loaded rework info
    state.currentReworkId = data.id;
    state.loadedCharacterName = data.character_name;  // Track for change detection
    
    // Ensure this ID is in localStorage
    addLocalId(data.id);
    
    return data;
}

/**
 * Saves a rework to the Supabase database.
 * 
 * This function implements smart save logic:
 * - If a rework is currently loaded AND the name hasn't changed: UPDATE
 * - Otherwise: INSERT a new record
 * 
 * This allows users to:
 * 1. Save new reworks (creates new record)
 * 2. Update existing reworks (updates in place)
 * 3. "Save As" by changing the character name (creates new record)
 * 
 * @async
 * @param {Object} payload - Rework data to save
 * @param {string} payload.discord_id - Discord user ID
 * @param {string} payload.character_name - Character name
 * @param {Object} payload.old_character - Original character data
 * @param {Object} payload.new_character - New character data
 * @param {string} payload.rework_type - Type of rework
 * @param {string} payload.cost - Cost summary string
 * @param {string} payload.notes - User notes
 * @returns {Promise<Object>} The saved rework record with ID
 * @throws {Error} If database operation fails
 * 
 * @example
 * const result = await saveReworkToDb({
 *     discord_id: '@user123',
 *     character_name: 'Aragorn',
 *     old_character: {...},
 *     new_character: {...},
 *     rework_type: 'alacarte',
 *     cost: '1000 GP / 50 DTP',
 *     notes: 'Changed to Ranger'
 * });
 * console.log('Saved with ID:', result.id);
 */
export async function saveReworkToDb(payload) {
    // Add current timestamp
    payload.updated_at = new Date().toISOString();
    
    const currentId = state.currentReworkId;
    
    // Check if the character name has changed since loading
    // If name changed, treat as a new rework (Save As behavior)
    const nameChanged = state.loadedCharacterName && 
                       payload.character_name !== state.loadedCharacterName;

    let result;
    
    // Decide whether to UPDATE or INSERT
    if (currentId && !nameChanged) {
        // --------------------------------------------------------
        // UPDATE EXISTING RECORD
        // --------------------------------------------------------
        console.log('Updating existing rework:', currentId);
        
        const { data, error } = await supabase
            .from('rework')
            .update(payload)           // Update with new data
            .eq('id', currentId)       // Match the current ID
            .select();                 // Return the updated record
        
        if (error) throw error;
        result = data[0];
        
    } else {
        // --------------------------------------------------------
        // INSERT NEW RECORD
        // --------------------------------------------------------
        console.log('Creating new rework record');
        
        const { data, error } = await supabase
            .from('rework')
            .insert([payload])  // Insert as new record
            .select();          // Return the created record
        
        if (error) throw error;
        result = data[0];
    }
    
    // Update state with the saved rework info
    state.currentReworkId = result.id;
    state.loadedCharacterName = result.character_name;
    
    // Ensure the ID is in localStorage
    addLocalId(result.id);
    
    return result;
}

/**
 * Deletes a rework from the Supabase database.
 * 
 * Also cleans up:
 * - Removes the ID from localStorage
 * - Clears currentReworkId from state if it matches
 * 
 * @async
 * @param {string} id - UUID of the rework to delete
 * @returns {Promise<void>}
 * @throws {Error} If database operation fails
 * 
 * @example
 * await deleteReworkById('550e8400-e29b-41d4-a716-446655440000');
 * console.log('Rework deleted');
 */
export async function deleteReworkById(id) {
    // Delete from Supabase
    const { error } = await supabase
        .from('rework')
        .delete()
        .eq('id', id);
    
    if (error) throw error;
    
    // Clean up localStorage
    removeLocalId(id);
    
    // Clear state if this was the current rework
    if (state.currentReworkId === id) {
        state.currentReworkId = null;
    }
}