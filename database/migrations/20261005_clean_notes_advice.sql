-- ==============================================================================
-- Migration: Trim leading/trailing spaces from notes_advice lines in ac_subraces
-- Date: 2026-10-05
-- Target Database: Supabase PostgreSQL (public schema)
-- Description:
--   Normalizes multi-line notes_advice text so each line has leading/trailing
--   spaces stripped, ensuring consistent bullet alignment across all lineages.
-- ==============================================================================

UPDATE public.ac_subraces
SET notes_advice = trim(both E'\n\r ' from regexp_replace(regexp_replace(notes_advice, '^[ \t]+', '', 'ng'), '[ \t]+$', '', 'ng'))
WHERE notes_advice IS NOT NULL AND notes_advice ~ '(?m)^[ \t]+';

