-- ==============================================================================
-- Migration: 20261012_ac_arcana_links_global.sql
-- Description: Replace external Google Drive links to Hawthorne Arcana PDF
--              ('https://drive.google.com/file/d/1yoinFa31Rhq__unHxMxCSfMq7QY5ARYC/view')
--              with website link ('/arcana/') across all Allowed Content tables.
-- ==============================================================================

BEGIN;

-- 1. ac_feats: Update remaining dragonmark feats and Boon of Siberys
UPDATE public.ac_feats
SET notes_advice = REPLACE(notes_advice, 'https://drive.google.com/file/d/1yoinFa31Rhq__unHxMxCSfMq7QY5ARYC/view', '/arcana/')
WHERE notes_advice LIKE '%1yoinFa31Rhq__unHxMxCSfMq7QY5ARYC%';

-- 2. ac_spells: Update SPL_0007 (Spells from EGW)
UPDATE public.ac_spells
SET notes = REPLACE(notes, 'https://drive.google.com/file/d/1yoinFa31Rhq__unHxMxCSfMq7QY5ARYC/view', '/arcana/')
WHERE notes LIKE '%1yoinFa31Rhq__unHxMxCSfMq7QY5ARYC%';

-- 3. ac_equipment: Update EQP_0459 (Songbird)
UPDATE public.ac_equipment
SET description = REPLACE(description, 'https://drive.google.com/file/d/1yoinFa31Rhq__unHxMxCSfMq7QY5ARYC/view', '/arcana/')
WHERE description LIKE '%1yoinFa31Rhq__unHxMxCSfMq7QY5ARYC%';

-- 4. ac_monsters_legacy_backup (if present)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'ac_monsters_legacy_backup'
    ) THEN
        UPDATE public.ac_monsters_legacy_backup
        SET notes_advice = REPLACE(notes_advice, 'https://drive.google.com/file/d/1yoinFa31Rhq__unHxMxCSfMq7QY5ARYC/view', '/arcana/')
        WHERE notes_advice LIKE '%1yoinFa31Rhq__unHxMxCSfMq7QY5ARYC%';
    END IF;
END $$;

COMMIT;
