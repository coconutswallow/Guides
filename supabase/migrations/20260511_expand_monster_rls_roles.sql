-- Migration: Expand Monster Compendium RLS Roles
-- Date: 2026-05-11
-- Description: Adds 'Full DM' and 'Trial DM' roles to the RLS policies for monsters and monster_features.
-- This ensures that users with these roles (who are authorized in the frontend) can also manage 
-- content in the database.

-- 2026-07-12:  Executed in PROD

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
  OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Full DM"]'::jsonb
  OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Trial DM"]'::jsonb
);

-- 2. Update Monster Table UPDATE Policy
DROP POLICY IF EXISTS "Creators or Staff can update monsters" ON monsters;
CREATE POLICY "Creators or Staff can update monsters" 
ON monsters FOR UPDATE 
TO authenticated 
USING (
  creator_discord_id = (SELECT discord_id FROM discord_users WHERE user_id = auth.uid())
  OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Staff"]'::jsonb
  OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Monster Admin"]'::jsonb
  OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Full DM"]'::jsonb
  OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Trial DM"]'::jsonb
);

-- 3. Update Monster Table DELETE Policy
DROP POLICY IF EXISTS "Creators or Staff can delete monsters" ON monsters;
CREATE POLICY "Creators or Staff can delete monsters" 
ON monsters FOR DELETE 
TO authenticated 
USING (
  (creator_discord_id = (SELECT discord_id FROM discord_users WHERE user_id = auth.uid()) AND status = 'Draft')
  OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Staff"]'::jsonb
  OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Monster Admin"]'::jsonb
  OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Full DM"]'::jsonb
  OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Trial DM"]'::jsonb
);

-- 4. Update Monster Features Table Policy
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
    OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Full DM"]'::jsonb
    OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Trial DM"]'::jsonb
  )
)
WITH CHECK (
  parent_row_id IN (
    SELECT row_id FROM monsters 
    WHERE creator_discord_id = (SELECT discord_id FROM discord_users WHERE user_id = auth.uid())
    OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Staff"]'::jsonb
    OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Monster Admin"]'::jsonb
    OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Full DM"]'::jsonb
    OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Trial DM"]'::jsonb
  )
);
