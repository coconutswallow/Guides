-- Migration: Monster Compendium RLS Policies
-- Date: 2026-04-13
-- Description: Enables RLS on Monsters and Features, allowing creators and staff to manage content.

-- 1. Enable RLS on primary tables
ALTER TABLE monsters ENABLE ROW LEVEL SECURITY;
ALTER TABLE monster_features ENABLE ROW LEVEL SECURITY;

-- 2. Monster Table Policies

-- Allow creators to insert their own monsters
DROP POLICY IF EXISTS "Creators can insert monsters" ON monsters;
CREATE POLICY "Creators can insert monsters" 
ON monsters FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow users to view their own drafts, and everyone to view Approved/Live ones
DROP POLICY IF EXISTS "Users can view own or approved monsters" ON monsters;
CREATE POLICY "Users can view own or approved monsters" 
ON monsters FOR SELECT 
TO authenticated 
USING (
  creator_discord_id = (SELECT discord_id FROM discord_users WHERE user_id = auth.uid()) 
  OR is_live = true 
  OR status = 'Approved'
);

-- Allow users to update their own monsters, and Staff to update any
DROP POLICY IF EXISTS "Creators or Staff can update monsters" ON monsters;
CREATE POLICY "Creators or Staff can update monsters" 
ON monsters FOR UPDATE 
TO authenticated 
USING (
  creator_discord_id = (SELECT discord_id FROM discord_users WHERE user_id = auth.uid())
  OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Staff"]'::jsonb
  OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Monster Admin"]'::jsonb
);

-- Allow creators or staff to delete drafts
DROP POLICY IF EXISTS "Creators or Staff can delete monsters" ON monsters;
CREATE POLICY "Creators or Staff can delete monsters" 
ON monsters FOR DELETE 
TO authenticated 
USING (
  (creator_discord_id = (SELECT discord_id FROM discord_users WHERE user_id = auth.uid()) AND status = 'Draft')
  OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Staff"]'::jsonb
);


-- 3. Monster Features Table Policies
-- Features share the same ownership logic as their parent monster

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
