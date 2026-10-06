-- ==============================================================================
-- Migration: AC Races & Subraces Staff Admin RLS Policies
-- Date: 2026-10-04
-- Target Database: Supabase PostgreSQL (public schema)
-- Description: Enables Admin and Engineer roles to INSERT, UPDATE, and DELETE
--              records in ac_races and ac_subraces based on discord_users roles.
-- ==============================================================================

-- 1. ac_races staff management policy
DROP POLICY IF EXISTS "Admins and Engineers can manage ac_races" ON public.ac_races;
CREATE POLICY "Admins and Engineers can manage ac_races" 
ON public.ac_races FOR ALL 
TO authenticated 
USING (
  ((SELECT discord_users.roles FROM discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
  OR ((SELECT discord_users.roles FROM discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
)
WITH CHECK (
  ((SELECT discord_users.roles FROM discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
  OR ((SELECT discord_users.roles FROM discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
);

-- 2. ac_subraces staff management policy
DROP POLICY IF EXISTS "Admins and Engineers can manage ac_subraces" ON public.ac_subraces;
CREATE POLICY "Admins and Engineers can manage ac_subraces" 
ON public.ac_subraces FOR ALL 
TO authenticated 
USING (
  ((SELECT discord_users.roles FROM discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
  OR ((SELECT discord_users.roles FROM discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
)
WITH CHECK (
  ((SELECT discord_users.roles FROM discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
  OR ((SELECT discord_users.roles FROM discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
);
