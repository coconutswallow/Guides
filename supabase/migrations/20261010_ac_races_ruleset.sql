-- ==============================================================================
-- Migration: Add ruleset to ac_races and normalize species names
-- File: 20261010_ac_races_ruleset.sql
-- Description:
--   1. Adds 'ruleset' column (VARCHAR(10) NOT NULL DEFAULT '2014') to public.ac_races.
--   2. Updates ac_races:
--      - If name contains '(2024)', sets ruleset = '2024' and strips ' (2024)' from name.
--      - Otherwise, sets ruleset = '2014'.
--   3. Drops existing unique constraint on name, replacing with UNIQUE (name, ruleset).
--   4. Recreates public.v_ac_races view to expose ruleset from public.ac_races.
--   5. Updates security_invoker = true on v_ac_races and grants permissions.
-- ==============================================================================

BEGIN;

-- 1. Add ruleset column to ac_races
ALTER TABLE public.ac_races 
ADD COLUMN IF NOT EXISTS ruleset VARCHAR(10) NOT NULL DEFAULT '2014';

-- 2. Drop single-column unique constraint on name before normalizing names
ALTER TABLE public.ac_races DROP CONSTRAINT IF EXISTS ac_races_name_key;

-- 3. Populate ruleset and normalize species name
-- If name has (2024), set ruleset = '2024' and strip ' (2024)'
UPDATE public.ac_races
SET 
    ruleset = '2024',
    name = TRIM(REGEXP_REPLACE(name, '\s*\(2024\)\s*$', '', 'gi')),
    updated_at = NOW()
WHERE name ILIKE '%(2024)%';

-- Ensure all other races have ruleset = '2014'
UPDATE public.ac_races
SET 
    ruleset = '2014',
    updated_at = NOW()
WHERE ruleset IS NULL OR ruleset != '2024';

-- 4. Add composite unique constraint on (name, ruleset)

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ac_races_name_ruleset_key' AND conrelid = 'public.ac_races'::regclass
    ) THEN
        ALTER TABLE public.ac_races ADD CONSTRAINT ac_races_name_ruleset_key UNIQUE (name, ruleset);
    END IF;
END $$;

-- 4. Recreate view public.v_ac_races including ruleset
DROP VIEW IF EXISTS public.v_ac_races CASCADE;

CREATE OR REPLACE VIEW public.v_ac_races WITH (security_invoker = true) AS
SELECT
    s.id,
    r.name AS race,
    r.name,
    r.ruleset,
    s.subrace,
    COALESCE(s.size, r.size) AS size,
    COALESCE(s.speed, r.speed) AS speed,
    CASE 
        WHEN s.language IS NULL OR s.language = '' THEN r.language
        WHEN r.language IS NULL OR r.language = '' THEN s.language
        WHEN s.language = r.language THEN r.language
        WHEN s.language LIKE '+%' OR s.language LIKE '1 +%' THEN 
            CONCAT_WS(', ', r.language, s.language)
        WHEN r.language NOT LIKE CONCAT('%', s.language, '%') THEN
            CONCAT_WS(', ', r.language, s.language)
        ELSE s.language
    END AS language,
    COALESCE(s.str, r.str) AS str,
    COALESCE(s.dex, r.dex) AS dex,
    COALESCE(s.con, r.con) AS con,
    COALESCE(s.int_stat, r.int_stat) AS int_stat,
    COALESCE(s.wis, r.wis) AS wis,
    COALESCE(s.cha, r.cha) AS cha,
    CASE 
        WHEN r.extra IS NOT NULL AND s.extra IS NOT NULL AND r.extra != s.extra 
            THEN CONCAT_WS(E'\n', r.extra, s.extra)
        ELSE COALESCE(s.extra, r.extra)
    END AS extra,
    array_to_string(s.sources, ', ') AS source,
    s.sources,
    CASE 
        WHEN r.notes_advice IS NOT NULL AND s.notes_advice IS NOT NULL AND r.notes_advice != s.notes_advice 
            THEN CONCAT_WS(E'\n', r.notes_advice, s.notes_advice)
        ELSE COALESCE(s.notes_advice, r.notes_advice)
    END AS notes_advice,
    CASE 
        WHEN r.notes_advice IS NOT NULL AND s.notes_advice IS NOT NULL AND r.notes_advice != s.notes_advice 
            THEN CONCAT_WS(E'\n', r.notes_advice, s.notes_advice)
        ELSE COALESCE(s.notes_advice, r.notes_advice)
    END AS rage_advice,
    s.check_id,
    s.display_order,
    s.created_at,
    s.updated_at
FROM public.ac_subraces s
JOIN public.ac_races r ON s.race_id = r.race_id;

-- 5. Set security_invoker = true and grant read access
ALTER VIEW public.v_ac_races SET (security_invoker = true);
GRANT SELECT ON public.v_ac_races TO anon, authenticated, service_role;

COMMIT;
