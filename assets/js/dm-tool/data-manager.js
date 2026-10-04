/**
 * 
 * https://github.com/hawthorneguild/HawthorneTeams/issues/6
 * 
 * data-manager.js
 * Location: /assets/js/dm-tool/data-manager.js
 * * @file data-manager.js
 * @description Serves as the Data Access Layer (DAL) for the DM Tool application.
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
 */
export async function fetchMemberMap(discordIds) {
    if (!discordIds || discordIds.length === 0) return {};
    
    try {
        const { data, error } = await supabase
            .from('discord_users')
            .select('discord_id, display_name')
            .in('discord_id', discordIds);

        if (error) throw error;
        
        const map = {};
        if (data) {
            data.forEach(m => {
                map[m.discord_id] = m.display_name;
            });
        }
        return map;
    } catch (err) {
        console.error("Error fetching user map:", err);
        return {};
    }
}

/* =========================================
   2. DASHBOARD OPERATIONS
   ========================================= */

/**
 * Fetches the list of standard (non-template) sessions for a specific user.
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
 * Creates a new session record in the database.
 * If formData is provided, it is saved directly on creation (via single POST request).
 */
export async function createSession(userId, title, isTemplate = false, formData = null, sessionDate = null) {
    try {
        const defaultFormData = { 
            header: {
                intended_duration: "3-4 Hours",
                party_size: "5",
                event_tags: [] 
            },
            sessions: [] 
        };

        const { data, error } = await supabase
            .from('session_logs')
            .insert([{
                user_id: userId,
                title: title,
                is_template: isTemplate,
                session_date: sessionDate || new Date().toISOString().split('T')[0],
                form_data: formData || defaultFormData
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
            const updatePayload = {
                form_data: formData,
                updated_at: new Date().toISOString()
            };

            let updateSuccess = false;
            let updateResult = null;
            try {
                const { data, error } = await supabase
                    .from('session_logs')
                    .update(updatePayload)
                    .eq('id', existing.id);

                if (!error) {
                    updateSuccess = true;
                    updateResult = data;
                }
            } catch (patchErr) {
                console.warn('Template update via PATCH failed, attempting fallback:', patchErr);
            }

            if (!updateSuccess) {
                const { data, error } = await supabase
                    .from('session_logs')
                    .upsert({
                        id: existing.id,
                        user_id: userId,
                        title: templateName,
                        is_template: true,
                        form_data: formData,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'id' });

                if (error) throw error;
                return data;
            }
            return updateResult;
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
 * Uses PATCH (update) with automatic fallback to POST upsert if PATCH is blocked by CORS/network proxies.
 */
export async function saveSession(sessionId, formData, metadata = {}) {
    try {
        const updatePayload = {
            form_data: formData,
            updated_at: new Date().toISOString()
        };

        if (metadata.title) updatePayload.title = metadata.title;
        if (metadata.date) updatePayload.session_date = metadata.date;
        if (metadata.is_template !== undefined) updatePayload.is_template = metadata.is_template;

        // Try standard UPDATE (PATCH) first
        let updateSuccess = false;
        let updateResult = null;
        try {
            const { data, error } = await supabase
                .from('session_logs')
                .update(updatePayload)
                .eq('id', sessionId);

            if (!error) {
                updateSuccess = true;
                updateResult = data;
            } else {
                console.warn('Update via PATCH returned error, attempting upsert fallback:', error);
            }
        } catch (patchErr) {
            console.warn('Update via PATCH threw error (likely CORS/network restriction), attempting upsert fallback:', patchErr);
        }

        if (updateSuccess) {
            return updateResult;
        }

        // Fallback: If PATCH is blocked by browser CORS preflight / network restrictions,
        // use upsert via POST (resolution=merge-duplicates) which is universally allowed.
        const { data: { user } } = await supabase.auth.getUser();
        const upsertPayload = {
            id: sessionId,
            ...updatePayload
        };
        if (user?.id) {
            upsertPayload.user_id = user.id;
        }
        if (!upsertPayload.title) {
            upsertPayload.title = formData?.header?.title || "Untitled Session";
        }

        const { data, error } = await supabase
            .from('session_logs')
            .upsert(upsertPayload, { onConflict: 'id' });

        if (error) throw error;
        return data;
    } catch (err) {
        console.error('Error saving session:', err);
        throw err; 
    }
}

/**
 * Permanently deletes a session record from the database.
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