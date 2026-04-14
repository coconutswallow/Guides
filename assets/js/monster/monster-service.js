/**
 * monster-service.js
 * Service to interact with Supabase for Monster data.
 * Location: \assets\js\monster\monster-service.js
 */
import { supabase } from '../supabaseClient.js';
import { logError } from '../error-logger.js';

// --- PUBLIC FETCHERS ---

export async function getMonsters() {
    let { data, error } = await supabase
        .from('monsters')
        .select('name, slug, species, cr, image_url, row_id, size, usage, alignment, creator_discord_id, creator')
        .eq('is_live', true)
        .order('name');
    
    if (error) {
        logError('monster-service', `Error fetching monsters: ${error.message}`);
        return [];
    }
    return data;
}

export async function getMonsterBySlug(slug) {
    let { data: monster, error } = await supabase
        .from('monsters')
        .select('*, creator_discord_id::text, creator') 
        .eq('slug', slug)
        .single();

    if (error || !monster) {
        logError('monster-service', `Error fetching monster (${slug}): ${error?.message || 'Not found'}`);
        return null;
    }

    const { data: features } = await supabase
        .from('monster_features')
        .select('*')
        .eq('parent_row_id', monster.row_id)
        .order('display_order', { ascending: true });

    monster.features = features || [];
    return monster;
}

/// --- CREATOR / EDITOR FUNCTIONS ---

/**
 * Fetches all monsters created by a specific user (drafts, pending, approved).
 * @param {string} discordId - The user's Discord ID.
 * @returns {Promise<Object[]>} Array of monster objects.
 */
export async function getMyMonsters(discordId) {
    const { data, error } = await supabase
        .from('monsters')
        .select('*')
        .eq('creator_discord_id', discordId)
        .order('updated_at', { ascending: false });

    if (error) {
        logError('monster-service', `Error fetching my monsters: ${error.message}`);
        return [];
    }
    return data;
}

/**
 * Saves or Updates a monster draft.
 * Handles the monster record and replaces its associated features using a delta-based upsert.
 * @param {Object} monsterData - The core monster statistics and metadata.
 * @param {Object[]} [features=[]] - Array of feature/action objects associated with the monster.
 * @returns {Promise<Object>} The saved monster record with updated features attached.
 */
export async function saveMonsterDraft(monsterData, features = []) {
    const { data: userResponse } = await supabase.auth.getUser();
    if (!userResponse?.user) throw new Error('Not authenticated');
    const user = userResponse.user;

    const { features: rawFeatures, save_proficiencies, ...monsterFields } = monsterData;
    const isNew = !monsterFields.row_id;
    const now = new Date().toISOString();

    // Fetch the user's official Discord ID from the discord_users table to ensure RLS compliance
    const { data: userData, error: userError } = await supabase
        .from('discord_users')
        .select('discord_id, display_name')
        .eq('user_id', user.id)
        .single();
    
    if (userError || !userData) {
        logError('monster-service', `Unauthorized: User ${user.id} not found in discord_users.`);
        throw new Error('User profile not found. Please contact staff or re-sync your Discord.');
    }

    const discordId = userData.discord_id;
    const displayName = userData.display_name;

    const payload = {
        ...monsterFields,
        updated_at: now,
        status: monsterFields.status || 'Draft'
    };

    if (isNew) {
        delete payload.row_id; 
        payload.monster_id = payload.monster_id || crypto.randomUUID();
        payload.version = payload.version || '1.0';
        payload.created_at = now;
        payload.creator_discord_id = discordId;
        payload.creator = displayName;
        payload.is_live = false; 
    } else {
        delete payload.creator_discord_id;
        delete payload.creator;
        delete payload.created_at;
    }

    let { data: savedData, error: monsterError } = await supabase
        .from('monsters')
        .upsert(payload, { onConflict: 'slug' })
        .select('row_id, slug');

    if (!savedData && !monsterError && isNew) {
        const { data: recovered } = await supabase.from('monsters').select('row_id, slug').eq('slug', payload.slug).maybeSingle();
        if (recovered) savedData = [recovered];
    }

    if (monsterError) throw monsterError;

    const savedMonster = Array.isArray(savedData) ? savedData[0] : savedData;
    if (!savedMonster) throw new Error('Failed to retrieve saved monster record.');

    let upsertedFeatures = [];

    if (savedMonster && savedMonster.row_id) {
        const { data: dbFeats, error: fetchErr } = await supabase
            .from('monster_features')
            .select('id')
            .eq('parent_row_id', savedMonster.row_id);
            
        if (fetchErr) throw new Error(`Could not fetch existing features: ${fetchErr.message}`);

        const dbIds = (dbFeats || []).map(f => f.id);
        const keptIds = features.map(f => f.id).filter(Boolean);
        const deletedIds = dbIds.filter(id => !keptIds.includes(id));

        if (deletedIds.length > 0) {
            const { error: delErr } = await supabase
                .from('monster_features')
                .delete()
                .in('id', deletedIds);
                
            if (delErr) throw new Error(`Failed to delete removed features: ${delErr.message}`);
        }
    }

    if (features.length > 0) {
        const featurePayload = features.map((f, index) => {
            const payloadRow = {
                name: (f.name || '').trim(),
                type: f.type || 'Trait',
                description: (f.description || '').trim(),
                parent_row_id: savedMonster.row_id,
                display_order: index
            };
            if (f.id) payloadRow.id = f.id;
            return payloadRow;
        });

        const { data: returnFeats, error: featError } = await supabase
            .from('monster_features')
            .upsert(featurePayload)
            .select('*');

        if (featError) throw featError;
        upsertedFeatures = returnFeats || [];
    }

    savedMonster.features = upsertedFeatures;
    return savedMonster;
}

/**
 * Creates a new version of an existing approved monster.
 * Clones the record and its features, incrementing the version number.
 * @param {string} sourceRowId - The UUID of the original (approved) monster row.
 * @returns {Promise<string>} The slug of the new version draft.
 */
export async function createNewVersion(sourceRowId) {
    const { data: source, error: sourceErr } = await supabase
        .from('monsters')
        .select('*')
        .eq('row_id', sourceRowId)
        .single();
    
    if (sourceErr) throw sourceErr;

    const { data: existingDraft } = await supabase
        .from('monsters')
        .select('row_id, slug')
        .eq('monster_id', source.monster_id)
        .in('status', ['Draft', 'Pending'])
        .maybeSingle();

    if (existingDraft) {
        throw new Error(`You already have an open draft or pending version for this monster.`);
    }

    const currentVersion = parseFloat(source.version || '1.0');
    const newVersion = (currentVersion + 1.0).toFixed(1);
    
    const newMonster = { ...source };
    delete newMonster.row_id;
    delete newMonster.created_at;
    delete newMonster.updated_at;
    delete newMonster.submitted_at;
    delete newMonster.archived_at;
    delete newMonster.reviewer_notes;
    
    const baseSlug = source.slug.replace(/-v\d+(\.\d+)?$/, ''); 
    newMonster.slug = `${baseSlug}-v${newVersion}`;
    
    newMonster.version = newVersion;
    newMonster.status = 'Draft';
    newMonster.is_live = false;
    newMonster.created_at = new Date().toISOString();
    newMonster.updated_at = newMonster.created_at;

    const { data: savedMonster, error: insertErr } = await supabase
        .from('monsters')
        .insert(newMonster)
        .select('row_id, slug')
        .single();

    if (insertErr) throw insertErr;

    const { data: features } = await supabase
        .from('monster_features')
        .select('*')
        .eq('parent_row_id', sourceRowId);

    if (features && features.length > 0) {
        const clonedFeatures = features.map(f => {
            const clone = { ...f };
            delete clone.id;
            clone.parent_row_id = savedMonster.row_id;
            return clone;
        });

        const { error: featErr } = await supabase
            .from('monster_features')
            .insert(clonedFeatures);
            
        if (featErr) console.error('[MonsterService] Error cloning features:', featErr);
    }

    return savedMonster.slug;
}

/**
 * Submits a monster draft for staff review.
 * @param {string} rowId - The UUID of the monster row.
 * @returns {Promise<Object>} The updated monster record.
 */
export async function submitMonsterForApproval(rowId) {
    const { data, error } = await supabase
        .from('monsters')
        .update({ 
            status: 'Pending', 
            submitted_at: new Date().toISOString(), 
            is_live: false 
        })
        .eq('row_id', rowId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// --- STAFF / ADMIN FUNCTIONS ---

/**
 * Fetches the queue of monsters waiting for approval.
 * @returns {Promise<Object[]>} Array of pending monster objects with features attached.
 */
export async function getPendingMonsters() {
    const { data, error } = await supabase
        .from('monsters')
        .select(`
            *,
            creator_discord_id::text,
            features:monster_features(*)
        `)
        .eq('status', 'Pending')
        .order('submitted_at', { ascending: true });
    
    if (data) {
        data.forEach(m => {
            if (m.features) {
                m.features.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
            }
        });
    }

    if (error) {
        logError('monster-service', `Error fetching pending queue: ${error.message}`);
        return [];
    }
    return data;
}

/**
 * Approves a monster version, making it live and archiving any previous approved versions.
 * @param {string} rowId - The UUID of the monster row to approve.
 * @param {string} reviewerId - The Supabase Auth ID of the reviewer.
 * @returns {Promise<Object>} The approved monster record.
 */
export async function approveMonster(rowId, reviewerId) {
    const { data: pending, error: fetchErr } = await supabase
        .from('monsters')
        .select('*')
        .eq('row_id', rowId)
        .single();
    
    if (fetchErr) throw fetchErr;

    const { data: oldApproved } = await supabase
        .from('monsters')
        .select('row_id, slug')
        .eq('monster_id', pending.monster_id)
        .eq('status', 'Approved')
        .maybeSingle();

    if (oldApproved) {
        const archivedSlug = `${oldApproved.slug}-archived-${oldApproved.row_id.substring(0, 8)}`;
        await supabase
            .from('monsters')
            .update({ 
                status: 'Archived', 
                is_live: false, 
                slug: archivedSlug,
                archived_at: new Date().toISOString()
            })
            .eq('row_id', oldApproved.row_id);
    }

    const cleanSlug = pending.slug.replace(/-v\d+(\.\d+)?$/, '');

    const { data, error } = await supabase
        .from('monsters')
        .update({ 
            status: 'Approved', 
            is_live: true, 
            slug: cleanSlug,
            reviewer_id: reviewerId
        })
        .eq('row_id', rowId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Rejects a monster, sending it back to drafts.
 * @param {string} rowId - The UUID of the monster row to reject.
 * @param {string} reviewerId - The Supabase Auth ID of the reviewer.
 * @returns {Promise<Object>} The updated monster record.
 */
export async function rejectMonster(rowId, reviewerId) {
    const { data, error } = await supabase
        .from('monsters')
        .update({ 
            status: 'Draft', 
            is_live: false, 
            reviewer_id: reviewerId
        })
        .eq('row_id', rowId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// --- LOOKUPS ---

/**
 * Fetches metadata lookups (species, sizes, CRs) from the database.
 * @returns {Promise<Object|null>} The combined lookup tables object.
 */
export async function getMonsterLookups() {
    let { data, error } = await supabase
        .from('lookups')
        .select('data')
        .eq('type', 'monster')
        .single();
    
    if (error || !data) {
        logError('monster-service', `Error fetching lookups: ${error?.message || 'No data'}`);
        return null;
    }

    if (typeof data.data === 'string') {
        return JSON.parse(data.data);
    }
    
    return data.data;
}

/**
 * Checks if a slug is already taken by another monster.
 * @param {string} slug - The URL-friendly identifier to check.
 * @param {string|null} [excludeRowId=null] - UUID of a row to ignore (e.g., when updating an existing row).
 * @returns {Promise<boolean>} True if the slug is unique.
 */
export async function isSlugUnique(slug, excludeRowId = null) {
    let query = supabase
        .from('monsters')
        .select('row_id')
        .eq('slug', slug);

    if (excludeRowId) {
        query = query.neq('row_id', excludeRowId);
    }

    const { data } = await query;
    return !data || data.length === 0;
}