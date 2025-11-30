console.log("--> monster-storage.js: STARTING LOAD"); // Debug Log 1

/**
 * monster-storage.js
 * Handles Database interactions for the frontend website.
 * Manages CRUD operations, Versioning logic, and Admin checks.
 */
const MonsterStorage = (function() {
    'use strict';

    const TABLE_MONSTERS = 'monsters';
    const TABLE_ADMINS = 'app_admins';

    // --- Helper to get client securely ---
    function getClient() {
        // 1. Prioritize AuthManager (It holds the correctly initialized client)
        if (window.authManager) {
            return window.authManager.getClient();
        }

        // 2. Check if window.supabase is actually the client (has .from method)
        // If it's just the SDK library, this check prevents the crash.
        if (window.supabase && typeof window.supabase.from === 'function') {
            return window.supabase;
        }

        console.error("MonsterStorage: No valid Supabase client found.");
        return null;
    }

    function getUser() {
        return window.authManager ? window.authManager.user : null;
    }

    /**
     * Check if the current logged-in user is an Admin.
     * @returns {Promise<boolean>} True if user exists in app_admins table
     */
    async function checkIsAdmin() {
        const client = getClient();
        const user = getUser();
        if (!client || !user) return false;

        // RLS policy will only let us find a row if we are that user
        const { data, error } = await client
            .from(TABLE_ADMINS)
            .select('user_id')
            .eq('user_id', user.id)
            .maybeSingle();

        return !!data; // True if record exists
    }

    /**
     * Fetch all monsters created by the current user.
     */
    async function getMyMonsters() {
        const client = getClient();
        const user = getUser();
        if (!user) return { error: { message: "Not logged in" } };

        return await client
            .from(TABLE_MONSTERS)
            .select('id, title, status, version, updated_at')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false });
    }

    /**
     * Fetch all monsters currently pending review (Admin only).
     */
    async function getPendingMonsters() {
        const client = getClient();
        // RLS ensures only admins can actually see these due to the policy we set up
        return await client
            .from(TABLE_MONSTERS)
            .select('id, title, status, version, updated_at, user_id')
            .eq('status', 'pending')
            .order('updated_at', { ascending: true });
    }

    /**
     * Load a specific monster by ID.
     * @param {string} id - UUID of the monster
     */
    async function getMonsterById(id) {
        const client = getClient();
        if (!client) return { error: { message: "No DB Connection" } };

        return await client
            .from(TABLE_MONSTERS)
            .select('*')
            .eq('id', id)
            .single();
    }

    /**
     * Save a monster. Handles the "Draft vs New Version" logic.
     * @param {Object} state - The full JS object of the monster data
     * @param {string|null} existingId - The database ID (if editing), null if new
     */
    async function saveMonster(state, existingId = null) {
        const client = getClient();
        const user = getUser();

        if (!user) return { error: { message: "You must be logged in to save." } };

        // Prepare the payload
        const payload = {
            title: state.title || 'Untitled Monster',
            
            // Metadata columns for filtering
            cr: state.cr,
            type: state.type,
            size: state.size,
            alignment: state.alignment,
            image: state.image,

            content: state, // Save the full state JSON
            user_id: user.id,
            updated_at: new Date().toISOString()
        };

        // --- SCENARIO 1: NEW MONSTER (Insert) ---
        if (!existingId) {
            payload.status = 'draft';
            payload.version = 1;
            return await client.from(TABLE_MONSTERS).insert([payload]).select().single();
        }

        // --- SCENARIO 2: EDITING EXISTING ---
        // First, check the current status of the record in DB
        const { data: currentRecord, error: fetchError } = await client
            .from(TABLE_MONSTERS)
            .select('status, version, original_id')
            .eq('id', existingId)
            .single();

        if (fetchError) return { error: fetchError };

        // 2a. If Approved -> INSERT NEW VERSION (Fork)
        if (currentRecord.status === 'approved') {
            payload.status = 'pending'; // New versions need review
            payload.version = (currentRecord.version || 1) + 1;
            // Link to the original parent
            payload.original_id = currentRecord.original_id || existingId;

            return await client.from(TABLE_MONSTERS).insert([payload]).select().single();
        }

        // 2b. Else (Draft/Pending/Rejected) -> UPDATE in place
        return await client
            .from(TABLE_MONSTERS)
            .update(payload)
            .eq('id', existingId)
            .select()
            .single();
    }

    /**
     * Submit a draft for review.
     * @param {string} id 
     */
    async function submitForReview(id) {
        const client = getClient();
        return await client
            .from(TABLE_MONSTERS)
            .update({ status: 'pending' })
            .eq('id', id)
            .select()
            .single();
    }

    /**
     * Approve a monster (Admin only).
     * @param {string} id 
     */
    async function approveMonster(id) {
        const client = getClient();
        // RLS ensures only admins can perform this update
        return await client
            .from(TABLE_MONSTERS)
            .update({ status: 'approved' })
            .eq('id', id)
            .select()
            .single();
    }

    /**
     * Reject a monster (Admin only).
     * @param {string} id 
     */
    async function rejectMonster(id) {
        const client = getClient();
        return await client
            .from(TABLE_MONSTERS)
            .update({ status: 'rejected' })
            .eq('id', id)
            .select()
            .single();
    }

    return {
        checkIsAdmin,
        getMyMonsters,
        getPendingMonsters,
        getMonsterById,
        saveMonster,
        submitForReview,
        approveMonster,
        rejectMonster
    };

})();

// EXPOSE TO WINDOW
window.MonsterStorage = MonsterStorage;
console.log("--> monster-storage.js: LOAD COMPLETE. Object exposed:", !!window.MonsterStorage); // Debug Log 2