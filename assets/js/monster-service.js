const MonsterService = (function() {
    'use strict';

    // 🔴 CONFIGURATION: REPLACE THESE WITH YOUR NEW PROJECT KEYS 🔴
    const SUPABASE_URL = 'https://iepqxczcyvrxcbyeiscc.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllcHF4Y3pjeXZyeGNieWVpc2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNjU2MDEsImV4cCI6MjA3OTk0MTYwMX0.9fK4TppNy7IekO3n4Uwd37dbqMQ7KRhFkex_P_JSeVA'; 
    
    let supabase = null;
    let currentUser = null;
    let isAdminUser = false;

    function init() {
        if (typeof window.supabase === 'undefined') {
            console.error('Supabase client library not loaded. Ensure the CDN script is in your HTML.');
            return;
        }
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        
        // Check for existing session on load
        supabase.auth.getSession().then(({ data: { session } }) => {
            handleSession(session);
        });

        // Listen for auth changes (login/logout)
        supabase.auth.onAuthStateChange((_event, session) => {
            handleSession(session);
        });
    }

    async function handleSession(session) {
        currentUser = session?.user || null;
        isAdminUser = false;

        if (currentUser) {
            // Check if the user is an admin by querying the 'admins' table
            const { data } = await supabase
                .from('admins')
                .select('user_id')
                .eq('user_id', currentUser.id)
                .single();
            
            if (data) isAdminUser = true;
        }

        // Notify the rest of the app that auth state changed
        document.dispatchEvent(new CustomEvent('auth-changed', { 
            detail: { user: currentUser, isAdmin: isAdminUser } 
        }));
    }

    /* --- AUTHENTICATION --- */

    async function login() {
        // ✅ FIX: Construct a clean URL without query parameters (?id=...) or hashes (#)
        // This ensures the URL matches exactly what you whitelisted in the Supabase Dashboard.
        const redirectUrl = window.location.origin + window.location.pathname;

        const { error } = await supabase.auth.signInWithOAuth({ 
            provider: 'discord', 
            options: { 
                redirectTo: redirectUrl 
            } 
        });

        if (error) {
            alert("Login Error: " + error.message);
        }
    }

    async function logout() {
        const { error } = await supabase.auth.signOut();
        if (error) console.error("Logout Error:", error);
        
        // Refresh to clear UI state
        window.location.reload();
    }

    /* --- READ OPERATIONS --- */

    async function getMyMonsters() {
        if (!currentUser) return { data: [], error: null };
        
        return await supabase
            .from('monsters')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('updated_at', { ascending: false });
    }

    async function getReviewQueue() {
        if (!isAdminUser) return { data: [], error: { message: "Unauthorized" } };
        
        return await supabase
            .from('monsters')
            .select('*')
            .eq('status', 'submitted')
            .order('updated_at', { ascending: true });
    }

    async function loadMonster(id) {
        const { data, error } = await supabase
            .from('monsters')
            .select('*')
            .eq('id', id)
            .single();
            
        if (data) {
            // Return separated State (JSON) and Meta (SQL columns)
            return { state: data.data, meta: data }; 
        }
        return { error };
    }

    /* --- WRITE OPERATIONS --- */

    async function saveMonster(state, id = null) {
        if (!currentUser) return { error: { message: "Must be logged in to save." } };

        const payload = {
            title: state.title || 'Untitled Monster',
            cr: state.cr,
            type: state.type,
            data: state, // Save the whole JS object
            updated_at: new Date()
        };

        if (id) {
            // UPDATE EXISTING
            // Security Check: Cannot edit Approved monsters directly via this method
            const { data: current } = await supabase.from('monsters').select('status').eq('id', id).single();
            
            if (current && current.status === 'approved' && !isAdminUser) {
                return { error: { message: "Cannot edit an Approved monster directly. Please create a Revision." } };
            }

            return await supabase
                .from('monsters')
                .update(payload)
                .eq('id', id)
                .select();
        } else {
            // INSERT NEW
            payload.user_id = currentUser.id;
            return await supabase
                .from('monsters')
                .insert([payload])
                .select();
        }
    }

    /**
     * Creates a Draft Revision linked to a Parent Monster.
     * This allows editing "Live" monsters without breaking them.
     */
    async function createRevision(parentId) {
        if (!currentUser) return { error: { message: "Not logged in" } };

        // 1. Fetch the original data
        const { data: original, error } = await supabase.from('monsters').select('*').eq('id', parentId).single();
        if (error) return { error };

        // 2. Insert new row as a "Draft Revision"
        const payload = {
            user_id: currentUser.id,
            parent_id: parentId, // Link to parent
            title: original.title,
            cr: original.cr,
            type: original.type,
            status: 'draft',
            data: original.data
        };

        return await supabase
            .from('monsters')
            .insert([payload])
            .select()
            .single();
    }
    
    async function cloneMonster(sourceId) {
        if (!currentUser) return { error: { message: "Not logged in" } };
        
        const { data: original, error } = await supabase.from('monsters').select('*').eq('id', sourceId).single();
        if (error) return { error };

        // Modify title to indicate copy
        const newData = { ...original.data, title: `${original.title} (Copy)` };

        const payload = {
            user_id: currentUser.id,
            title: newData.title,
            cr: original.cr,
            type: original.type,
            status: 'draft',
            data: newData
        };

        return await supabase.from('monsters').insert([payload]).select().single();
    }

    async function deleteMonster(id) {
        return await supabase.from('monsters').delete().eq('id', id);
    }

    /* --- WORKFLOW ACTIONS --- */

    async function submitForReview(id) {
        if (!currentUser) return { error: { message: "Not logged in" } };
        
        return await supabase
            .from('monsters')
            .update({ status: 'submitted' })
            .eq('id', id);
    }

    async function approveMonster(id) {
        if (!isAdminUser) return { error: { message: "Unauthorized" } };
        
        // Use the SQL function to handle the "Swap & Merge" logic
        return await supabase.rpc('approve_revision', { revision_id: id });
    }

    async function rejectMonster(id) {
        if (!isAdminUser) return { error: { message: "Unauthorized" } };
        
        return await supabase
            .from('monsters')
            .update({ status: 'rejected' })
            .eq('id', id);
    }

    return {
        init,
        login,
        logout,
        getMyMonsters,
        getReviewQueue,
        loadMonster,
        saveMonster,
        createRevision,
        cloneMonster,
        deleteMonster,
        submitForReview,
        approveMonster,
        rejectMonster,
        getUser: () => currentUser,
        isAdmin: () => isAdminUser
    };
})();