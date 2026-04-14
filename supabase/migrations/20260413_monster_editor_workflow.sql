/**
 * 2026-04-13: Monster Editor & Staff Roles Migration
 * Run this in the Supabase SQL Editor.
 * Location: /migrations/20260413_monster_editor_workflow.sql
 */

-- 1. Ensure columns for review workflow exist
ALTER TABLE monsters 
ADD COLUMN IF NOT EXISTS reviewer_notes TEXT,
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- 2. Add 'monster_admin' to discord_role_map for visibility/management
-- This allows mapping specific Discord Role IDs to the internal Monster Admin permission
ALTER TABLE discord_role_map
ADD COLUMN IF NOT EXISTS monster_admin BOOLEAN DEFAULT FALSE;

-- 3. Update comments for documentation
COMMENT ON COLUMN monsters.status IS 'Draft, Pending, Approved, Archived';
COMMENT ON COLUMN monsters.reviewer_notes IS 'Notes from the staff during approval/rejection';
