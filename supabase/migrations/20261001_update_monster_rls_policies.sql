-- Migration: Update Monster RLS Policies to use discord_role_map (monster_admin = true)
-- Date: 2026-10-01
-- Description: Allows all users who hold any role in discord_role_map where monster_admin = true
-- to view, review, and manage monsters and features in the Compendium.

-- 1. Helper function to check if the current authenticated user has monster_admin privileges
-- Checks if any role in the user's roles array matches a role in discord_role_map with monster_admin = true
CREATE OR REPLACE FUNCTION public.is_monster_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.discord_users du
    JOIN public.discord_role_map drm 
      ON du.roles ? drm.role_name
    WHERE du.user_id = auth.uid() 
      AND drm.monster_admin = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_monster_admin() TO authenticated;

-- 2. Monster Table SELECT Policy
-- Users can view their own monsters, any live/approved monsters, or all monsters if monster_admin = true
DROP POLICY IF EXISTS "Users can view own or approved monsters" ON public.monsters;
CREATE POLICY "Users can view own or approved monsters" 
ON public.monsters FOR SELECT 
TO authenticated 
USING (
  creator_discord_id = (SELECT discord_id FROM public.discord_users WHERE user_id = auth.uid()) 
  OR is_live = true 
  OR status = 'Approved'
  OR public.is_monster_admin()
);

-- 3. Monster Table UPDATE Policy
-- Users can update their own monsters; users with monster_admin = true can update any monster
DROP POLICY IF EXISTS "Creators or Staff can update monsters" ON public.monsters;
CREATE POLICY "Creators or Staff can update monsters" 
ON public.monsters FOR UPDATE 
TO authenticated 
USING (
  creator_discord_id = (SELECT discord_id FROM public.discord_users WHERE user_id = auth.uid())
  OR public.is_monster_admin()
);

-- 4. Monster Table DELETE Policy
-- Creators can delete their own Drafts; users with monster_admin = true can delete any monster
DROP POLICY IF EXISTS "Creators or Staff can delete monsters" ON public.monsters;
CREATE POLICY "Creators or Staff can delete monsters" 
ON public.monsters FOR DELETE 
TO authenticated 
USING (
  (creator_discord_id = (SELECT discord_id FROM public.discord_users WHERE user_id = auth.uid()) AND status = 'Draft')
  OR public.is_monster_admin()
);

-- 5. Monster Features Table Policy
-- Users can manage features for monsters they own or if they have monster_admin = true
DROP POLICY IF EXISTS "Users can manage features for owned monsters" ON public.monster_features;
CREATE POLICY "Users can manage features for owned monsters" 
ON public.monster_features FOR ALL 
TO authenticated 
USING (
  parent_row_id IN (
    SELECT row_id FROM public.monsters 
    WHERE creator_discord_id = (SELECT discord_id FROM public.discord_users WHERE user_id = auth.uid())
    OR public.is_monster_admin()
  )
)
WITH CHECK (
  parent_row_id IN (
    SELECT row_id FROM public.monsters 
    WHERE creator_discord_id = (SELECT discord_id FROM public.discord_users WHERE user_id = auth.uid())
    OR public.is_monster_admin()
  )
);
