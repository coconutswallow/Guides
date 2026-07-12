-- Migration: Add Passive Perception Proficiency field to Monsters
-- Date: 2026-05-12
-- Description: Adds a column to track proficiency level (None, Proficient, Expert) specifically for the Passive Perception calculation.

-- 2026-07-12:  Executed in PROD

ALTER TABLE monsters 
ADD COLUMN IF NOT EXISTS passive_perc_prof TEXT DEFAULT 'None';

COMMENT ON COLUMN monsters.passive_perc_prof IS 'Proficiency level for Passive Perception calculation (None, Proficient, Expert)';
