-- @file 220260416_admin_rls_policies.sql
-- @description Migration: DM-Tool Admin RLS Policies.
-- Enables Row Level Security on 'events' and 'lookups' tables.
-- Grants SELECT to all authenticated users, and ALL/UPDATE to Engineer/Admin roles based on discord_users table.

-- https://github.com/hawthorneguild/HawthorneTeams/issues/6

-- 1. Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE lookups ENABLE ROW LEVEL SECURITY;

-- 2. Events Table Policies

-- Allow all authenticated users to view active events
DROP POLICY IF EXISTS "Anyone can view events" ON events;
CREATE POLICY "Anyone can view events" 
ON events FOR SELECT 
TO authenticated 
USING (true);

-- Allow Engineer and Admin to manage events
DROP POLICY IF EXISTS "Admins can manage events" ON events;
CREATE POLICY "Admins can manage events" 
ON events FOR ALL 
TO authenticated 
USING (
  (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Engineer"]'::jsonb
  OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Admin"]'::jsonb
)
WITH CHECK (
  (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Engineer"]'::jsonb
  OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Admin"]'::jsonb
);

-- 3. Lookups Table Policies

-- Allow all authenticated users to view lookups
DROP POLICY IF EXISTS "Anyone can view lookups" ON lookups;
CREATE POLICY "Anyone can view lookups" 
ON lookups FOR SELECT 
TO authenticated 
USING (true);

-- Allow Engineer and Admin to update lookups
DROP POLICY IF EXISTS "Admins can update lookups" ON lookups;
CREATE POLICY "Admins can update lookups" 
ON lookups FOR UPDATE 
TO authenticated 
USING (
  (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Engineer"]'::jsonb
  OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Admin"]'::jsonb
)
WITH CHECK (
  (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Engineer"]'::jsonb
  OR (SELECT roles FROM discord_users WHERE user_id = auth.uid()) @> '["Admin"]'::jsonb
);
