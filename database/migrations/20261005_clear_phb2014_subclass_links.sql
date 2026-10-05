-- ==============================================================================
-- Migration: Clear External Document Links from PHB2014 Subclasses
-- Date: 2026-10-05
-- Description:
-- Subclasses originating from Player's Handbook 2014 (source = 'PHB2014')
-- should not have external document links (e.g. Moon Druid 2014, Knowledge Cleric,
-- Beast Master Ranger 2014, Hunter Ranger 2014).
-- External links to FRHOF remain on 2024 Moon Druid (source = 'PHB2024'),
-- and UA links remain on Revised Ranger (source = 'UATRR').
-- ==============================================================================

UPDATE public.ac_subclasses
SET link = NULL
WHERE source = 'PHB2014' AND link IS NOT NULL;
