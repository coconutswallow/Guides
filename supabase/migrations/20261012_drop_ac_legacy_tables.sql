-- ==============================================================================
-- Migration: 20261012_drop_ac_legacy_tables.sql
-- Description: Drop deprecated Allowed Content legacy backup snapshot tables
--              that were created during schema normalization.
-- ==============================================================================

BEGIN;

DROP TABLE IF EXISTS public.ac_artificer_infusions_legacy_backup CASCADE;
DROP TABLE IF EXISTS public.ac_classes_legacy_backup CASCADE;
DROP TABLE IF EXISTS public.ac_eldritch_invocations_legacy_backup CASCADE;
DROP TABLE IF EXISTS public.ac_feats_legacy_backup CASCADE;
DROP TABLE IF EXISTS public.ac_fighting_styles_legacy_backup CASCADE;
DROP TABLE IF EXISTS public.ac_loot_categories_legacy_backup CASCADE;
DROP TABLE IF EXISTS public.ac_loot_legacy_backup CASCADE;
DROP TABLE IF EXISTS public.ac_monsters_categories_legacy_backup CASCADE;
DROP TABLE IF EXISTS public.ac_monsters_legacy_backup CASCADE;
DROP TABLE IF EXISTS public.ac_other_rewards_categories_legacy_backup CASCADE;
DROP TABLE IF EXISTS public.ac_other_rewards_legacy_backup CASCADE;
DROP TABLE IF EXISTS public.ac_races_legacy_20261004 CASCADE;

COMMIT;
