-- 1. Remove dependencies that block type modification
ALTER TABLE monsters ALTER COLUMN status DROP DEFAULT;
DROP POLICY IF EXISTS "Users can view own or approved monsters" ON monsters;
DROP POLICY IF EXISTS "Creators or Staff can delete monsters" ON monsters;

-- 2. Temporarily cast the column to TEXT
ALTER TABLE monsters 
ALTER COLUMN status TYPE TEXT;

-- 3. Drop the existing enum type
DROP TYPE IF EXISTS monster_status;

-- 4. Re-create the ENUM with the correct TitleCase values
CREATE TYPE monster_status AS ENUM ('Draft', 'Pending', 'Approved', 'Archived');

-- 5. Cast the column back to the new ENUM type
-- We use INITCAP to ensure any existing 'pending' -> 'Pending'
ALTER TABLE monsters 
ALTER COLUMN status TYPE monster_status 
USING INITCAP(status)::monster_status;

-- 6. Restore the default value and column comment
ALTER TABLE monsters ALTER COLUMN status SET DEFAULT 'Draft'::monster_status;
COMMENT ON COLUMN monsters.status IS 'Draft, Pending, Approved, Archived';

-- 7. Re-create the policies
CREATE POLICY "Users can view own or approved monsters" 
ON monsters FOR SELECT 
TO authenticated 
USING (
  creator_discord_id = (SELECT discord_id FROM discord_users WHERE user_id = auth.uid()) 
  OR is_live = true 
  OR status = 'Approved'
);

CREATE POLICY "Creators or Staff can delete monsters" 
ON monsters FOR DELETE 
TO authenticated 
USING (
  (creator_discord_id = (SELECT discord_id FROM discord_users WHERE user_id = auth.uid()) AND status = 'Draft')
  OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Staff"]'::jsonb
);
