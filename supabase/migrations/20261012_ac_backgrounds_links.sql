--
-- Migration: 20261012_ac_backgrounds_links.sql
-- Purpose: Add check_id column, populate BAC_0001..BAC_0166 matching Allowed_Content_20261004.xlsx,
--          and ensure unique constraint and index on check_id in public.ac_backgrounds.
-- Target Table: public.ac_backgrounds
--

BEGIN;

-- 1. Add check_id column if not exists
ALTER TABLE public.ac_backgrounds 
ADD COLUMN IF NOT EXISTS check_id VARCHAR(32);

-- 2. Backfill check_id using display_order matching 1:1 with Excel BAC_0001..BAC_0166 sequence
UPDATE public.ac_backgrounds
SET check_id = 'BAC_' || LPAD(display_order::text, 4, '0')
WHERE check_id IS NULL OR check_id != ('BAC_' || LPAD(display_order::text, 4, '0'));

-- 3. Ensure check_id is NOT NULL
ALTER TABLE public.ac_backgrounds 
ALTER COLUMN check_id SET NOT NULL;

-- 4. Create unique constraint / index on check_id if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ac_backgrounds_check_id_key' 
          AND conrelid = 'public.ac_backgrounds'::regclass
    ) THEN
        ALTER TABLE public.ac_backgrounds 
        ADD CONSTRAINT ac_backgrounds_check_id_key UNIQUE (check_id);
    END IF;
END $$;

COMMIT;
