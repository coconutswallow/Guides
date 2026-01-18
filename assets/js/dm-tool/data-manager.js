/**
 * data-manager.js
 * Location: /assets/js/dm-tool/data-manager.js
 * * @file data-manager.js
 * @description Serves as the Data Access Layer (DAL) for the DM Tool application.
 * This module encapsulates all direct interactions with the Supabase backend, 
 * including:
 * 1. Fetching static game rules and event data.
 * 2. Resolving Discord IDs to user display names.
 * 3. Performing CRUD operations on Session Logs.
 * 4. Managing Templates and Player Submissions.
 * * @module DataManager
 */

import { supabase } from '../supabaseClient.js';

/* =========================================
   1. GAME RULES & LOOKUPS
   ========================================= */

/** @type {Object|null} In-memory cache for game rules to prevent redundant API calls. */
let cachedRules = null;

/**
 * Fetches the global configuration rules for the DM Tool (e.g., XP tables, Gold limits).
 * Uses a caching strategy to return local data if already fetched during the session.
 * * @async
 * @returns {Promise<Object|null>} The game rules object (JSON) or null on failure.
 */
export async function fetchGameRules() {
    if (cachedRules) return cachedRules;

    try {
        const { data, error } = await supabase
            .from('lookups')
            .select('data')
            .eq('type', 'dm-tool')
            .single();

        if (error) throw error;
        
        cachedRules = data.data; 
        return cachedRules;
    } catch (err) {
        console.error('Error fetching game rules:', err);
        return null;
    }
}

/**
 * Retrieves a list of currently active server events.
 * Used to populate event selection dropdowns in the UI.
 * * @async
 * @returns {Promise<Array<Object>>} Array of active event objects {id, name}.
 */
export async function fetchActiveEvents() {
    try {
        const { data, error } = await supabase
            .from('events')
            .select('id, name')
            .eq('is_active', true)
            .order('name', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error fetching events:', err);
        return [];
    }
}

/**
 * Resolves a list of Discord IDs into a mapping of IDs to Display Names.
 * Queries the 'member_directory' table for user details.
 * * @async
 * @param {Array<string>} discordIds - List of Discord IDs to resolve.
 * @returns {Promise<Object>} A map object: { "discord_id": "display_name" }.
 */
export async function fetchMemberMap(discordIds) {
    if (!discordIds || discordIds.length === 0) return {};
    
    try {
        const { data, error } = await supabase
            .from('member_directory')
            .select('discord_id, display_name')
            .in('discord_id', discordIds);

        if (error) throw error;
        
        // Convert to map: { "123": "Coconut", "456": "Banana" }
        const map = {};
        if (data) {
            data.forEach(m => {
                map[m.discord_id] = m.display_name;
            });
        }
        return map;
    } catch (err) {
        console.error("Error fetching member directory:", err);
        return {};
    }
}

/* =========================================
   2. DASHBOARD OPERATIONS
   ========================================= */

/**
 * Fetches the list of standard (non-template) sessions for a specific user.
 * Ordered by session date (descending) for the Dashboard view.
 * * @async
 * @param {string} userId - The UUID of the current user.
 * @returns {Promise<Array<Object>>} Array of session summary objects.
 */
export async function fetchSessionList(userId) {
    try {
        const { data, error } = await supabase
            .from('session_logs')
            .select('id, title, session_date, is_template, updated_at')
            .eq('user_id', userId)
            .eq('is_template', false) 
            .order('session_date', { ascending: false, nullsFirst: false });

        if (error) throw error;
        return data;
    } catch (err) {
        console.error('Error fetching session list:', err);
        return [];
    }
}

/**
 * Fetches the list of saved Session Templates for the current user.
 * Templates are blueprints used to create new sessions quickly.
 * * @async
 * @param {string} userId - The UUID of the current user.
 * @returns {Promise<Array<Object>>} Array of template objects.
 */
export async function fetchTemplates(userId) {
    try {
        const { data, error } = await supabase
            .from('session_logs')
            .select('id, title')
            .eq('user_id', userId)
            .eq('is_template', true)
            .order('title', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error fetching templates:', err);
        return [];
    }
}

/* =========================================
   3. CRUD OPERATIONS
   ========================================= */

/**
 * Creates a new, blank session record in the database.
 * Initializes the record with default configuration data (headers, empty arrays).
 * * @async
 * @param {string} userId - The owner's UUID.
 * @param {string} title - The display title of the session.
 * @param {boolean} [isTemplate=false] - Whether this session is a template.
 * @returns {Promise<Object|null>} The created session object or null on failure.
 */
export async function createSession(userId, title, isTemplate = false) {
    try {
        const { data, error } = await supabase
            .from('session_logs')
            .insert([{
                user_id: userId,
                title: title,
                is_template: isTemplate,
                session_date: new Date().toISOString().split('T')[0],
                form_data: { 
                    header: {
                        intended_duration: "3-4 Hours",
                        party_size: "5",
                        event_tags: [] 
                    },
                    sessions: [] 
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
 * Saves the current session state as a Template.
 * Uses an "Upsert" logic: updates if a template with the same name exists, otherwise inserts new.
 * * @async
 * @param {string} userId - The owner's UUID.
 * @param {string} templateName - The name of the template.
 * @param {Object} formData - The full JSON state of the session form.
 * @returns {Promise<Object>} The saved template record.
 */
export async function saveAsTemplate(userId, templateName, formData) {
    try {
        const { data: existing, error: fetchError } = await supabase
            .from('session_logs')
            .select('id')
            .eq('user_id', userId)
            .eq('is_template', true)
            .eq('title', templateName)
            .single();

        if (existing) {
            // Update existing template
            const { data, error } = await supabase
                .from('session_logs')
                .update({
                    form_data: formData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } else {
            // Create new template
            const { data, error } = await supabase
                .from('session_logs')
                .insert([{
                    user_id: userId,
                    title: templateName,
                    is_template: true,
                    form_data: formData,
                    session_date: null 
                }])
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    } catch (err) {
        console.error('Error saving template:', err);
        throw err;
    }
}

/**
 * Retrieves a full session record by ID, including its nested JSON `form_data`.
 * * @async
 * @param {string} sessionId - The UUID of the session to load.
 * @returns {Promise<Object|null>} The session record or null on failure.
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
 * Updates an existing session record with new form data and metadata.
 * Can selectively update top-level columns (Title, Date, Status) and the JSON blob.
 * * @async
 * @param {string} sessionId - The UUID of the session to update.
 * @param {Object} formData - The complete JSON state of the form.
 * @param {Object} metadata - Metadata fields to update (title, date, status).
 * @returns {Promise<Object>} The updated session record.
 */
export async function saveSession(sessionId, formData, metadata) {
    try {
        const updatePayload = {
            form_data: formData,
            updated_at: new Date().toISOString()
        };

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
        throw err; 
    }
}

/**
 * Permanently deletes a session record from the database.
 * * @async
 * @param {string} sessionId - The UUID of the session to delete.
 * @returns {Promise<boolean>} True if deletion was successful, False otherwise.
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

/**
 * Fetches player submissions (e.g., from a Sign-up bot) associated with this session.
 * Used to auto-populate the player roster.
 * * @async
 * @param {string} sessionId - The UUID of the session.
 * @returns {Promise<Array<Object>>} Array of submission objects containing payloads.
 */
export async function fetchPlayerSubmissions(sessionId) {
    try {
        const { data, error } = await supabase
            .from('session_player_submissions')
            .select('discord_id, payload, updated_at')
            .eq('session_id', sessionId);

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error fetching submissions:', err);
        return [];
    }
}