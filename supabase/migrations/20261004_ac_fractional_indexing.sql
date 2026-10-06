-- ==============================================================================
-- Migration: AC Fractional Indexing for Display Order
-- Date: 2026-10-04
-- Target Database: Supabase PostgreSQL (public schema)
-- Description:
--   Alter display_order column in public.ac_sources, public.ac_races, and
--   public.ac_subraces from INTEGER to DOUBLE PRECISION to support fractional
--   indexing (midpoint ordering) without integer truncation or large rebalancing writes.
-- ==============================================================================

-- 1. Alter ac_sources display_order to DOUBLE PRECISION
ALTER TABLE public.ac_sources 
    ALTER COLUMN display_order TYPE DOUBLE PRECISION USING display_order::DOUBLE PRECISION;

-- 2. Alter ac_races display_order to DOUBLE PRECISION
ALTER TABLE public.ac_races 
    ALTER COLUMN display_order TYPE DOUBLE PRECISION USING display_order::DOUBLE PRECISION;

-- 3. Safely handle ac_subraces and recreate dependent view v_ac_races
DROP VIEW IF EXISTS public.v_ac_races CASCADE;

ALTER TABLE public.ac_subraces 
    ALTER COLUMN display_order TYPE DOUBLE PRECISION USING display_order::DOUBLE PRECISION;

CREATE OR REPLACE VIEW public.v_ac_races AS
SELECT s.id,
    r.name AS race,
    r.name,
    s.subrace,
    s.size,
    s.speed,
    s.language,
    s.str,
    s.dex,
    s.con,
    s.int_stat,
    s.wis,
    s.cha,
    s.extra,
    array_to_string(s.sources, ', '::text) AS source,
    s.sources,
    s.notes_advice,
    s.notes_advice AS rage_advice,
    s.check_id,
    s.display_order,
    s.created_at,
    s.updated_at
FROM public.ac_subraces s
JOIN public.ac_races r ON s.race_id = r.race_id;
