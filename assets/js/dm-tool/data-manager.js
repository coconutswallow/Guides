/**
 * data-manager.js
 * Location: /assets/js/dm-tool/data-manager.js
 * * Responsibilities:
 * - Bridges the Frontend and Supabase Database.
 * - Handles CRUD operations for Session Logs.
 * - Fetches Game Rules (XP/Gold tables) from the Lookups table.
 */

// Import from the shared assets folder (One level up)
import { supabase } from '../supabaseClient.js';

/* =========================================
   1. GAME RULES (LOOKUPS)
   ========================================= */

let cachedRules = null;

/**
 * Fetches the static XP/Gold/Tier rules from the 'lookups' table.
 * Caches the result to prevent unnecessary DB calls.
 * @returns {Promise<Object|null>} The rules object or null on error.
 */
export async function fetchGameRules() {
    if (cachedRules) return cachedRules;

    try {
        const { data, error } = await supabase
            .from('lookups')
            .select('data')
            .eq('type', 'dm_rules')
            .single();

        if (error) throw error;
        
        cachedRules = data.data; // The JSON object inside the 'data' column
        return cachedRules;
    } catch (err) {
        console.error('Error fetching game rules:', err);
        return null;
    }
}

/* =========================================
   2. DASHBOARD OPERATIONS (LIST VIEWS)
   ========================================= */

/**
 * Fetches the list of sessions for the dashboard.
 * Optimizes performance by only selecting metadata columns, not the heavy JSON blob.
 * @param {string} userId - The current user's UUID.
 * @returns {Promise<Array>} List of session objects.
 */
export async function fetchSessionList(userId) {
    try {
        const { data, error } = await supabase
            .from('session_logs')
            .select('id, title, session_date, is_template, updated_at')
            .eq('user_id', userId)
            .order('session_date', { ascending: false, nullsFirst: false });

        if (error) throw error;
        return data;
    } catch (err) {
        console.error('Error fetching session list:', err);
        return [];
    }
}

/* =========================================
   3. CRUD OPERATIONS (CREATE, READ, UPDATE, DELETE)
   ========================================= */

/**
 * Creates a new blank session or template.
 * @param {string} userId - Owner UUID.
 * @param {string} title - Name of the session.
 * @param {boolean} isTemplate - Whether this is a reusable template.
 * @returns {Promise<Object|null>} The created session object.
 */
export async function createSession(userId, title, isTemplate = false) {
    try {
        const { data, error } = await supabase
            .from('session_logs')
            .insert([{
                user_id: userId,
                title: title,
                is_template: isTemplate,
                session_date: new Date().toISOString().split('T')[0], // Default to today YYYY-MM-DD
                form_data: { 
                    hours: 3, // Default duration
                    players: [] // Empty roster
                } 
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (err) {
        console.error('Error creating session:', err);
        return null;
    }
}

/**
 * Loads the full state (including the JSONB blob) for the editor.
 * @param {string} sessionId - UUID of the session.
 * @returns {Promise<Object|null>} The full session row.
 */
export async function loadSession(sessionId) {
    try {
        const { data, error } = await supabase
            .from('session_logs')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (error) throw error;
        return data;
    } catch (err) {
        console.error('Error loading session:', err);
        return null;
    }
}

/**
 * Saves the session state.
 * Updates both the relational metadata (for dashboard sorting) and the JSONB blob.
 * * @param {string} sessionId - UUID of the session.
 * @param {object} formData - The massive JSON object containing players, notes, calculations.
 * @param {object} metadata - Specific fields extracted for columns (title, date, status).
 */
export async function saveSession(sessionId, formData, metadata) {
    try {
        const updatePayload = {
            form_data: formData,
            updated_at: new Date().toISOString()
        };

        // Only update metadata columns if they are provided
        if (metadata.title) updatePayload.title = metadata.title;
        if (metadata.date) updatePayload.session_date = metadata.date;
        if (metadata.status) updatePayload.status = metadata.status;
        if (metadata.is_template !== undefined) updatePayload.is_template = metadata.is_template;

        const { data, error } = await supabase
            .from('session_logs')
            .update(updatePayload)
            .eq('id', sessionId)
            .select();

        if (error) throw error;
        return data;
    } catch (err) {
        console.error('Error saving session:', err);
        throw err; // Re-throw so the UI knows the save failed
    }
}

/**
 * Deletes a session log.
 * @param {string} sessionId 
 * @returns {Promise<boolean>} True if successful.
 */
export async function deleteSession(sessionId) {
    try {
        const { error } = await supabase
            .from('session_logs')
            .delete()
            .eq('id', sessionId);

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Error deleting session:', err);
        return false;
    }
}