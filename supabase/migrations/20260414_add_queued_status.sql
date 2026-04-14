/**
 * 2026-04-14: Add 'Queued' and 'Archived' statuses to Monster Compendium
 * Run this in the Supabase SQL Editor.
 * Location: /migrations/20260414_add_queued_status.sql
 */

-- 1. Add new states to the monster_status enum
-- Note: ALTER TYPE ... ADD VALUE cannot be run inside a transaction block in some Postgres versions.
ALTER TYPE monster_status ADD VALUE IF NOT EXISTS 'Queued' AFTER 'Pending';
ALTER TYPE monster_status ADD VALUE IF NOT EXISTS 'Archived';

-- 2. Add archived_at column to track when a version was replaced
ALTER TABLE monsters ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- 3. Update the column comment to reflect the full workflow
COMMENT ON COLUMN monsters.status IS 'Draft, Pending, Queued, Approved, Archived';

-- 4. Update the review logic (Optional safety check)
-- Ensure 'Queued' monsters are not accidentally filtered out of staff views if needed in the future.

