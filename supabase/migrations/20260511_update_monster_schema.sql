-- Migration: Update Monster Schema for Lair and Regional Features
-- Date: 2026-05-11
-- Description: Ensures all required feature types exist in the enum and header columns exist in the monsters table.

-- 1. Update feature_type enum
-- We use individual ALTER TYPE commands as they cannot be run inside a transaction/DO block in some Postgres environments.
-- If running in Supabase SQL Editor, these will ensure the values exist.

-- Try to add each value (Postgres will error if it already exists, so we ignore errors or run individually)
-- Alternatively, we can use a more robust script if supported.

-- For Supabase/Postgres 12+:
ALTER TYPE feature_type ADD VALUE IF NOT EXISTS 'Trait';
ALTER TYPE feature_type ADD VALUE IF NOT EXISTS 'Action';
ALTER TYPE feature_type ADD VALUE IF NOT EXISTS 'Bonus Action';
ALTER TYPE feature_type ADD VALUE IF NOT EXISTS 'Reaction';
ALTER TYPE feature_type ADD VALUE IF NOT EXISTS 'Legendary Action';
ALTER TYPE feature_type ADD VALUE IF NOT EXISTS 'Lair Action';
ALTER TYPE feature_type ADD VALUE IF NOT EXISTS 'Regional Effect';

-- 2. Ensure header columns exist in monsters table
ALTER TABLE monsters 
ADD COLUMN IF NOT EXISTS legendary_header TEXT,
ADD COLUMN IF NOT EXISTS lair_header TEXT,
ADD COLUMN IF NOT EXISTS regional_header TEXT;

-- 3. Update comments
COMMENT ON COLUMN monsters.legendary_header IS 'Intro text for the Legendary Actions section';
COMMENT ON COLUMN monsters.lair_header IS 'Intro text for the Lair Actions section';
COMMENT ON COLUMN monsters.regional_header IS 'Intro text for the Regional Effects section';
