const MonsterService = (function() {
    'use strict';

    // CONFIGURATION
    const SUPABASE_URL = 'https://iepqxczcyvrxcbyeiscc.supabase.co'; // <-- REPLACE THIS
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllcHF4Y3pjeXZyeGNieWVpc2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNjU2MDEsImV4cCI6MjA3OTk0MTYwMX0.9fK4TppNy7IekO3n4Uwd37dbqMQ7KRhFkex_P_JSeVA'; // <-- REPLACE THIS
    
    let supabase = null;
    let currentUser = null;
    let isAdminUser = false;

    function init() {
        if (typeof window.supabase === 'undefined') {
            console.error('Supabase client not loaded');
            return;
        }
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        
        // Initial Auth Check
        supabase.auth.getSession().then(({ data: { session } }) => {
            handleSession(session);
        });

        // Listen for changes
        supabase.auth.onAuthStateChange((_event, session) => {
            handleSession(session);
        });
    }

    async function handleSession(session) {
        currentUser = session?.user || null;
        isAdminUser = false;

        if (currentUser) {
            // Check if user is admin
            const { data } = await supabase.from('admins').select('user_id').eq('user_id', currentUser.id).single();
            if (data) isAdminUser = true;
        }

        // Notify App
        document.dispatchEvent(new CustomEvent('auth-changed', { 
            detail: { user: currentUser, isAdmin: isAdminUser } 
        }));
    }

    /* --- AUTH --- */
    async function login() {
        const redirectUrl = window.location.href;
        await supabase.auth.signInWithOAuth({ provider: 'discord', options: { redirectTo: redirectUrl } });
    }

    async function logout() {
        await supabase.auth.signOut();
    }

    /* --- READ --- */
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
            .select('*, users:user_id(email)') // Optional: Fetch creator email if needed
            .eq('status', 'submitted')
            .order('updated_at', { ascending: true });
    }

    async function loadMonster(id) {
        const { data, error } = await supabase.from('monsters').select('*').eq('id', id).single();
        if (data) {
            return { state: data.data, meta: data }; // Return separated State (JSON) and Meta (SQL columns)
        }
        return { error };
    }

    /* --- WRITE --- */
    async function saveMonster(state, id = null) {
        if (!currentUser) return { error: { message: "Not logged in" } };

        const payload = {
            title: state.title || 'Untitled',
            cr: state.cr,
            type: state.type,
            data: state,
            updated_at: new Date()
        };

        if (id) {
            // Check status before updating
            const { data: current } = await supabase.from('monsters').select('status').eq('id', id).single();
            if (current && current.status === 'approved' && !isAdminUser) {
                return { error: { message: "Cannot edit Approved monster directly. Create a revision." } };
            }
            return await supabase.from('monsters').update(payload).eq('id', id).select();
        } else {
            payload.user_id = currentUser.id;
            return await supabase.from('monsters').insert([payload]).select();
        }
    }

    async function createRevision(parentId) {
        if (!currentUser) return { error: { message: "Not logged in" } };

        // 1. Fetch original
        const { data: original, error } = await supabase.from('monsters').select('*').eq('id', parentId).single();
        if (error) return { error };

        // 2. Clone as Draft linked to Parent
        const payload = {
            user_id: currentUser.id,
            parent_id: parentId,
            title: original.title,
            cr: original.cr,
            type: original.type,
            status: 'draft',
            data: original.data 
        };

        return await supabase.from('monsters').insert([payload]).select().single();
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

    /* --- WORKFLOW --- */
    async function submitForReview(id) {
        return await supabase.from('monsters').update({ status: 'submitted' }).eq('id', id);
    }

    async function approveMonster(id) {
        if (!isAdminUser) return { error: { message: "Unauthorized" } };
        // Call the SQL function to handle the swap/merge
        return await supabase.rpc('approve_revision', { revision_id: id });
    }

    async function rejectMonster(id) {
        if (!isAdminUser) return { error: { message: "Unauthorized" } };
        return await supabase.from('monsters').update({ status: 'rejected' }).eq('id', id);
    }
    
    async function deleteMonster(id) {
         return await supabase.from('monsters').delete().eq('id', id);
    }

    return {
        init, login, logout,
        getMyMonsters, getReviewQueue, loadMonster,
        saveMonster, createRevision, cloneMonster, deleteMonster,
        submitForReview, approveMonster, rejectMonster,
        getUser: () => currentUser,
        isAdmin: () => isAdminUser
    };
})();