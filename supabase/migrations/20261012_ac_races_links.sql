--
-- Migration: 20261012_ac_races_links.sql
-- Purpose: Normalize external markdown links and relative site URLs in public.ac_races and public.ac_subraces.
-- Target Tables: public.ac_races, public.ac_subraces
--

BEGIN;

-- 1. Update ac_subraces: Replace raw 'Hawthorne Arcana' with relative website link '[Hawthorne Arcana](/arcana/)'
UPDATE public.ac_subraces
SET notes_advice = REPLACE(
    notes_advice,
    'can be found in Hawthorne Arcana',
    'can be found in [Hawthorne Arcana](/arcana/)'
)
WHERE notes_advice LIKE '%can be found in Hawthorne Arcana%';

-- 2. Update ac_races: Replace raw 'Hawthorne Arcana' with relative website link '[Hawthorne Arcana](/arcana/)'
UPDATE public.ac_races
SET notes_advice = REPLACE(
    notes_advice,
    'can be found in Hawthorne Arcana',
    'can be found in [Hawthorne Arcana](/arcana/)'
)
WHERE notes_advice LIKE '%can be found in Hawthorne Arcana%';

COMMIT;
