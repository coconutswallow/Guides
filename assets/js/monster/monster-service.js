/**
 * monster-service.js
 * Service to interact with Supabase for Monster data.
 * Location: \assets\js\monster\monster-service.js
 * https://github.com/hawthorneguild/HawthorneTeams/issues/7
 */
import { supabase } from '../supabaseClient.js';
import { logError } from '../error-logger.js';

// --- PUBLIC FETCHERS ---

export async function getMonsters() {
    let { data, error } = await supabase
        .from('monsters')
        .select('name, slug, species, cr, image_url, row_id, size, usage, alignment, creator_discord_id, creator, monster_tag_relations(tag_id, monster_tags(id, name))')
        .eq('is_live', true)
        .order('name');

    if (error) {
        logError('monster-service', `Error fetching monsters: ${error.message}`);
        throw new Error(error.message);
    }
    return (data || []).map(m => ({
        ...m,
        tags: (m.monster_tag_relations || []).map(r => r.monster_tags?.name).filter(Boolean),
        tag_ids: (m.monster_tag_relations || []).map(r => r.tag_id).filter(Boolean)
    }));
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

    const [featuresRes, tagsRes] = await Promise.all([
        supabase
            .from('monster_features')
            .select('*')
            .eq('parent_row_id', monster.row_id)
            .order('display_order', { ascending: true }),
        supabase
            .from('monster_tag_relations')
            .select('tag_id, monster_tags(id, name)')
            .eq('monster_row_id', monster.row_id)
    ]);

    monster.features = featuresRes.data || [];
    monster.tags = (tagsRes.data || []).map(r => r.monster_tags?.name).filter(Boolean);
    monster.tag_ids = (tagsRes.data || []).map(r => r.tag_id).filter(Boolean);
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
        .select('*, monster_tag_relations(tag_id, monster_tags(id, name))')
        .eq('creator_discord_id', discordId)
        .order('updated_at', { ascending: false });

    if (error) {
        logError('monster-service', `Error fetching my monsters: ${error.message}`);
        return [];
    }
    return (data || []).map(m => ({
        ...m,
        tags: (m.monster_tag_relations || []).map(r => r.monster_tags?.name).filter(Boolean),
        tag_ids: (m.monster_tag_relations || []).map(r => r.tag_id).filter(Boolean)
    }));
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

    const { features: rawFeatures, save_proficiencies, tags: rawTags, tag_ids: rawTagIds, ...monsterFields } = monsterData;
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
        // Keep a creator name entered in the form; use the Discord display
        // name only as the default for a blank field.
        payload.creator = payload.creator?.trim() || displayName;
        payload.is_live = false;
    } else {
        // The Discord ID determines ownership and must remain immutable, but
        // a draft's displayed creator name is intentionally editable.
        delete payload.creator_discord_id;
        delete payload.created_at;
    }

    // A new draft must never update an existing row merely because its slug
    // collides. Besides being surprising, that sends the request through the
    // UPDATE RLS policy and previously surfaced as an opaque 403.
    const saveQuery = isNew
        ? supabase.from('monsters').insert(payload)
        : supabase.from('monsters').update(payload).eq('row_id', monsterFields.row_id);

    let { data: savedData, error: monsterError } = await saveQuery
        .select('row_id, slug');

    if (!savedData && !monsterError && isNew) {
        const { data: recovered } = await supabase.from('monsters').select('row_id, slug').eq('slug', payload.slug).maybeSingle();
        if (recovered) savedData = [recovered];
    }

    if (monsterError) {
        if (monsterError.code === '23505') {
            throw new Error('That monster slug is already in use. Please choose a different name or slug.');
        }
        throw monsterError;
    }

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
        const toUpdate = [];
        const toInsert = [];

        features.forEach((f, index) => {
            const payloadRow = {
                name: (f.name || '').trim(),
                type: f.type || 'Trait',
                description: (f.description || '').trim(),
                parent_row_id: savedMonster.row_id,
                display_order: index
            };
            if (f.id) {
                payloadRow.id = f.id;
                toUpdate.push(payloadRow);
            } else {
                toInsert.push(payloadRow);
            }
        });

        // 1. Perform Updates (Features with existing IDs)
        if (toUpdate.length > 0) {
            const { data: updated, error: updateErr } = await supabase
                .from('monster_features')
                .upsert(toUpdate)
                .select('*');
            if (updateErr) throw updateErr;
            upsertedFeatures.push(...(updated || []));
        }

        // 2. Perform Inserts (New features without IDs)
        if (toInsert.length > 0) {
            const { data: inserted, error: insertErr } = await supabase
                .from('monster_features')
                .insert(toInsert)
                .select('*');
            if (insertErr) throw insertErr;
            upsertedFeatures.push(...(inserted || []));
        }

        // Sort by display order to maintain consistency
        upsertedFeatures.sort((a, b) => a.display_order - b.display_order);
    }

    // 3. Sync Monster Tag Relations
    const targetTagIds = Array.isArray(monsterData.tag_ids)
        ? monsterData.tag_ids
        : (Array.isArray(rawTagIds) ? rawTagIds : []);

    if (savedMonster && savedMonster.row_id && (targetTagIds.length > 0 || !isNew)) {
        const { data: dbRels, error: fetchRelErr } = await supabase
            .from('monster_tag_relations')
            .select('tag_id')
            .eq('monster_row_id', savedMonster.row_id);

        if (!fetchRelErr) {
            const currentDbTagIds = (dbRels || []).map(r => r.tag_id);
            const toDelete = currentDbTagIds.filter(id => !targetTagIds.includes(id));
            const toInsert = targetTagIds.filter(id => !currentDbTagIds.includes(id));

            if (toDelete.length > 0) {
                await supabase
                    .from('monster_tag_relations')
                    .delete()
                    .eq('monster_row_id', savedMonster.row_id)
                    .in('tag_id', toDelete);
            }

            if (toInsert.length > 0) {
                const insertRows = toInsert.map(tag_id => ({
                    monster_row_id: savedMonster.row_id,
                    tag_id
                }));
                await supabase
                    .from('monster_tag_relations')
                    .insert(insertRows);
            }
        }
    }

    savedMonster.features = upsertedFeatures;
    savedMonster.tag_ids = targetTagIds;
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

    const { data: features, error: fetchFeatErr } = await supabase
        .from('monster_features')
        .select('*')
        .eq('parent_row_id', sourceRowId);

    if (fetchFeatErr) throw fetchFeatErr;

    if (features && features.length > 0) {
        const clonedFeatures = features.map(f => {
            const clone = { ...f };
            delete clone.id;
            delete clone.created_at; 
            clone.parent_row_id = savedMonster.row_id;
            return clone;
        });

        const { error: featErr } = await supabase
            .from('monster_features')
            .insert(clonedFeatures);

        if (featErr) throw featErr;
    }

    // Clone tag associations
    const { data: sourceTags } = await supabase
        .from('monster_tag_relations')
        .select('tag_id')
        .eq('monster_row_id', sourceRowId);

    if (sourceTags && sourceTags.length > 0) {
        const tagRelationsToInsert = sourceTags.map(st => ({
            monster_row_id: savedMonster.row_id,
            tag_id: st.tag_id
        }));
        await supabase
            .from('monster_tag_relations')
            .insert(tagRelationsToInsert);
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
 * Fetches the queue of monsters in the Patch Queue (Queued).
 * @returns {Promise<Object[]>} Array of queued monster objects with features attached.
 */
export async function getQueuedMonsters() {
    const { data, error } = await supabase
        .from('monsters')
        .select(`
            *,
            creator_discord_id::text,
            features:monster_features(*)
        `)
        .eq('status', 'Queued')
        .order('updated_at', { ascending: true });

    if (data) {
        data.forEach(m => {
            if (m.features) {
                m.features.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
            }
        });
    }

    if (error) {
        logError('monster-service', `Error fetching patch queue: ${error.message}`);
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
    // 1. Fetch the target monster to get its monster_id and metadata
    const { data: target, error: fetchErr } = await supabase
        .from('monsters')
        .select('*')
        .eq('row_id', rowId)
        .single();

    if (fetchErr) throw fetchErr;

    // 2. Check for any currently live/approved versions of the same monster
    const { data: oldVersions } = await supabase
        .from('monsters')
        .select('row_id, slug')
        .eq('monster_id', target.monster_id)
        .or('status.eq.Approved,is_live.eq.true')
        .neq('row_id', rowId); // Don't archive itself if it was already somehow live

    // 3. Archive older versions
    if (oldVersions && oldVersions.length > 0) {
        for (const old of oldVersions) {
            const archivedSlug = `${old.slug}-archived-${old.row_id.substring(0, 8)}`;
            const { error: arcErr } = await supabase
                .from('monsters')
                .update({
                    status: 'Archived',
                    is_live: false,
                    slug: archivedSlug,
                    archived_at: new Date().toISOString()
                })
                .eq('row_id', old.row_id);
            if (arcErr) throw arcErr;
        }
    }

    // 4. Update the target monster to Approved & Live
    // We strip version suffixes (e.g. -v2.0) from the slug when publishing live.
    const cleanSlug = target.slug.replace(/-v\d+(\.\d+)?$/, '');

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
 * Moves a monster submission to the Patch Queue.
 * @param {string} rowId - The UUID of the monster row.
 * @param {string} reviewerId - The Supabase Auth ID of the reviewer.
 * @returns {Promise<Object>} The updated monster record.
 */
export async function addToPatchQueue(rowId, reviewerId) {
    const { data, error } = await supabase
        .from('monsters')
        .update({
            status: 'Queued',
            is_live: false,
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

const DEFAULT_MONSTER_SPECIES = [
    'Aberration', 'Beast', 'Celestial', 'Construct', 'Dragon', 'Elemental',
    'Fey', 'Fiend', 'Giant', 'Humanoid', 'Monstrosity', 'Ooze', 'Plant', 'Undead'
].map(value => ({ value }));

function normalizeMonsterLookups(rawLookups) {
    const lookups = rawLookups && typeof rawLookups === 'object' ? rawLookups : {};
    const species = Array.isArray(lookups.species) && lookups.species.length
        ? lookups.species
        : DEFAULT_MONSTER_SPECIES;

    return { ...lookups, species };
}

/**
 * Fetches metadata lookups (species, sizes, CRs) from the database.
 * @returns {Promise<Object|null>} The combined lookup tables object.
 */
export async function getMonsterLookups() {
    let [lookupRes, tagsRes] = await Promise.all([
        supabase
            .from('lookups')
            .select('data')
            .eq('type', 'monster')
            .single(),
        supabase
            .from('monster_tags')
            .select('id, name')
            .order('name')
    ]);

    let lookupData = {};
    if (lookupRes.data) {
        try {
            lookupData = typeof lookupRes.data.data === 'string'
                ? JSON.parse(lookupRes.data.data)
                : lookupRes.data.data;
        } catch (error) {
            logError('monster-service', `Error parsing monster lookups: ${error.message}`);
        }
    }

    const normalized = normalizeMonsterLookups(lookupData);
    normalized.tags = (tagsRes.data || []).map(t => ({ id: t.id, name: t.name, value: t.name }));
    return normalized;
}

/**
 * Deletes a monster draft and all its associated features.
 * @param {string} rowId - The UUID of the monster row to delete.
 * @returns {Promise<void>}
 */
export async function deleteMonster(rowId) {
    // 1. Delete features first to avoid FK issues if cascade isn't set
    const { error: featError } = await supabase
        .from('monster_features')
        .delete()
        .eq('parent_row_id', rowId);

    if (featError) {
        logError('monster-service', `Error deleting features for monster ${rowId}: ${featError.message}`);
        throw featError;
    }

    // 2. Delete the monster
    const { error } = await supabase
        .from('monsters')
        .delete()
        .eq('row_id', rowId);

    if (error) {
        logError('monster-service', `Error deleting monster ${rowId}: ${error.message}`);
        throw error;
    }
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

// --- MONSTER TAGS MANAGEMENT FUNCTIONS ---

/**
 * Fetches all global monster tags.
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
export async function getMonsterTags() {
    const { data, error } = await supabase
        .from('monster_tags')
        .select('id, name, created_at, updated_at')
        .order('name');

    if (error) {
        logError('monster-service', `Error fetching tags: ${error.message}`);
        return [];
    }
    return data || [];
}

/**
 * Fetches all global tags along with their monster usage count.
 * @returns {Promise<Array<{id: string, name: string, monster_count: number}>>}
 */
export async function getAllMonsterTagsWithCounts() {
    const { data, error } = await supabase
        .from('monster_tags')
        .select(`
            id,
            name,
            created_at,
            updated_at,
            monster_tag_relations (
                monster_row_id
            )
        `)
        .order('name');

    if (error) {
        logError('monster-service', `Error fetching monster tags with counts: ${error.message}`);
        return [];
    }

    return (data || []).map(tag => ({
        id: tag.id,
        name: tag.name,
        created_at: tag.created_at,
        updated_at: tag.updated_at,
        monster_count: (tag.monster_tag_relations || []).length
    }));
}

/**
 * Creates a new global monster tag.
 * @param {string} name - Name of the tag (e.g. "XMas 2026").
 * @returns {Promise<Object>} The created tag record.
 */
export async function createMonsterTag(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) throw new Error('Tag name cannot be empty.');

    const { data, error } = await supabase
        .from('monster_tags')
        .insert({ name: trimmed })
        .select('*')
        .single();

    if (error) {
        if (error.code === '23505') {
            throw new Error(`A tag named "${trimmed}" already exists.`);
        }
        logError('monster-service', `Error creating tag: ${error.message}`);
        throw error;
    }
    return data;
}

/**
 * Renames an existing monster tag.
 * @param {string} id - UUID of the tag.
 * @param {string} newName - New name for the tag.
 * @returns {Promise<Object>} The updated tag record.
 */
export async function updateMonsterTag(id, newName) {
    const trimmed = (newName || '').trim();
    if (!trimmed) throw new Error('Tag name cannot be empty.');

    const { data, error } = await supabase
        .from('monster_tags')
        .update({ name: trimmed, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();

    if (error) {
        if (error.code === '23505') {
            throw new Error(`A tag named "${trimmed}" already exists.`);
        }
        logError('monster-service', `Error updating tag: ${error.message}`);
        throw error;
    }
    return data;
}

/**
 * Deletes a monster tag and cascades relation removal.
 * @param {string} id - UUID of the tag.
 * @returns {Promise<boolean>} True on success.
 */
export async function deleteMonsterTag(id) {
    const { error } = await supabase
        .from('monster_tags')
        .delete()
        .eq('id', id);

    if (error) {
        logError('monster-service', `Error deleting tag: ${error.message}`);
        throw error;
    }
    return true;
}

