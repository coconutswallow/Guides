-- Migration: Fix Staff SELECT Permissions for Monsters & Features
-- Date: 2026-04-14
-- Description: Ensures Staff and Monster Admins can SELECT (view) all monsters and features, which is 
-- required for successful upsert/update operations and moderation workflows.

-- 1. Update Monster Table SELECT Policy
DROP POLICY IF EXISTS "Users can view own or approved monsters" ON monsters;
CREATE POLICY "Users can view own or approved monsters" 
ON monsters FOR SELECT 
TO authenticated 
USING (
  creator_discord_id = (SELECT discord_id FROM discord_users WHERE user_id = auth.uid()) 
  OR is_live = true 
  OR status = 'Approved'
  OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Staff"]'::jsonb
  OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Monster Admin"]'::jsonb
);

-- 2. Update Monster Features Table Policy (Consolidation for ALL operations)
-- This ensures they can manage features even for monsters they didn't create
DROP POLICY IF EXISTS "Users can manage features for owned monsters" ON monster_features;
CREATE POLICY "Users can manage features for owned monsters" 
ON monster_features FOR ALL 
TO authenticated 
USING (
  parent_row_id IN (
    SELECT row_id FROM monsters 
    WHERE creator_discord_id = (SELECT discord_id FROM discord_users WHERE user_id = auth.uid())
    OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Staff"]'::jsonb
    OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Monster Admin"]'::jsonb
  )
)
WITH CHECK (
  parent_row_id IN (
    SELECT row_id FROM monsters 
    WHERE creator_discord_id = (SELECT discord_id FROM discord_users WHERE user_id = auth.uid())
    OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Staff"]'::jsonb
    OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Monster Admin"]'::jsonb
  )
);
