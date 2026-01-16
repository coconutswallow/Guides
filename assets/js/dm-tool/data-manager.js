/**
 * data-manager.js
 * Location: /assets/js/dm-tool/data-manager.js
 */

import { supabase } from '../supabaseClient.js';

/* =========================================
   1. GAME RULES & LOOKUPS
   ========================================= */

let cachedRules = null;

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

/* =========================================
   2. DASHBOARD OPERATIONS
   ========================================= */

export async function fetchSessionList(userId) {
    try {
        // Explicitly fetch only items where is_template is FALSE
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
 * Saves as template. Overwrites if a template with the same name exists for the user.
 */
export async function saveAsTemplate(userId, templateName, formData) {
    try {
        // 1. Check if template exists
        const { data: existing, error: fetchError } = await supabase
            .from('session_logs')
            .select('id')
            .eq('user_id', userId)
            .eq('is_template', true)
            .eq('title', templateName)
            .single();

        if (existing) {
            // 2a. Overwrite existing
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
            // 2b. Create new
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