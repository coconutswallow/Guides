-- Migration: Rework Table RLS Policies
-- Date: 2026-05-17
-- Description: Enables RLS on 'rework' table and configures read, write, update, and delete access.
-- Grants SELECT and DELETE permissions to the creator and specified staff reviewer roles (Admin, Auditor, Auditor Apprentice, Engineer).

-- 1. Enable Row Level Security
ALTER TABLE IF EXISTS rework ENABLE ROW LEVEL SECURITY;

-- 2. SELECT Policy: Allow creator OR reviewers (Admin, Auditor, Auditor Apprentice, Engineer)
DROP POLICY IF EXISTS "Users and staff can view reworks" ON rework;
CREATE POLICY "Users and staff can view reworks" 
ON rework FOR SELECT 
TO authenticated 
USING (
  discord_id = (SELECT discord_id FROM discord_users WHERE user_id = auth.uid())
  OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Admin"]'::jsonb
  OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Auditor"]'::jsonb
  OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Auditor Apprentice"]'::jsonb
  OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Engineer"]'::jsonb
);

-- 3. INSERT Policy: Allow all authenticated users to insert new drafts
DROP POLICY IF EXISTS "Anyone authenticated can insert reworks" ON rework;
CREATE POLICY "Anyone authenticated can insert reworks" 
ON rework FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 4. UPDATE Policy: Allow creator OR reviewers to update rework entries
DROP POLICY IF EXISTS "Users and staff can update reworks" ON rework;
CREATE POLICY "Users and staff can update reworks" 
ON rework FOR UPDATE 
TO authenticated 
USING (
  discord_id = (SELECT discord_id FROM discord_users WHERE user_id = auth.uid())
  OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Admin"]'::jsonb
  OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Auditor"]'::jsonb
  OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Auditor Apprentice"]'::jsonb
  OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Engineer"]'::jsonb
)
WITH CHECK (
  discord_id = (SELECT discord_id FROM discord_users WHERE user_id = auth.uid())
  OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Admin"]'::jsonb
  OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Auditor"]'::jsonb
  OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Auditor Apprentice"]'::jsonb
  OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Engineer"]'::jsonb
);

-- 5. DELETE Policy: Allow creator OR reviewers to delete rework entries (needed for 90-day cleanup tool)
DROP POLICY IF EXISTS "Users and staff can delete reworks" ON rework;
CREATE POLICY "Users and staff can delete reworks" 
ON rework FOR DELETE 
TO authenticated 
USING (
  discord_id = (SELECT discord_id FROM discord_users WHERE user_id = auth.uid())
  OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Admin"]'::jsonb
  OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Auditor"]'::jsonb
  OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Auditor Apprentice"]'::jsonb
  OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Engineer"]'::jsonb
);
