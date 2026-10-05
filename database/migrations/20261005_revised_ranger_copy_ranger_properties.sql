-- ==============================================================================
-- Migration: Copy Hit Die and Multiclassing from Ranger (2014) to Revised Ranger (2014)
-- Date: 2026-10-05
-- Description:
-- Revised Ranger (2014) shares the core class hit die (d10) and multiclassing
-- requirements/proficiencies with standard Ranger (2014).
-- ==============================================================================

UPDATE public.ac_classes rr
SET hit_die = r.hit_die,
    multiclassing = r.multiclassing
FROM public.ac_classes r
WHERE rr.name = 'Revised Ranger' AND rr.ruleset = '2014'
  AND r.name = 'Ranger' AND r.ruleset = '2014';
