-- ==============================================================================
-- Migration: Trim leading/trailing spaces from notes_advice in ac_classes & ac_subclasses
-- Date: 2026-10-05
-- Target Database: Supabase PostgreSQL (public schema)
-- Description:
--   Normalizes multi-line notes_advice, expanded_options, and multiclassing text
--   so each line has leading/trailing spaces stripped, ensuring consistent alignment.
-- ==============================================================================

UPDATE public.ac_classes
SET notes_advice = trim(both E'\n\r ' from regexp_replace(regexp_replace(notes_advice, '^[ \t]+', '', 'ng'), '[ \t]+$', '', 'ng'))
WHERE notes_advice IS NOT NULL AND (notes_advice ~ '(?m)^[ \t]+' OR notes_advice ~ '(?m)[ \t]+$');

UPDATE public.ac_subclasses
SET notes_advice = trim(both E'\n\r ' from regexp_replace(regexp_replace(notes_advice, '^[ \t]+', '', 'ng'), '[ \t]+$', '', 'ng'))
WHERE notes_advice IS NOT NULL AND (notes_advice ~ '(?m)^[ \t]+' OR notes_advice ~ '(?m)[ \t]+$');

UPDATE public.ac_classes
SET expanded_options = trim(both E'\n\r ' from regexp_replace(regexp_replace(expanded_options, '^[ \t]+', '', 'ng'), '[ \t]+$', '', 'ng'))
WHERE expanded_options IS NOT NULL AND (expanded_options ~ '(?m)^[ \t]+' OR expanded_options ~ '(?m)[ \t]+$');

UPDATE public.ac_classes
SET multiclassing = trim(both E'\n\r ' from regexp_replace(regexp_replace(multiclassing, '^[ \t]+', '', 'ng'), '[ \t]+$', '', 'ng'))
WHERE multiclassing IS NOT NULL AND (multiclassing ~ '(?m)^[ \t]+' OR multiclassing ~ '(?m)[ \t]+$');
