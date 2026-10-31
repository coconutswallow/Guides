-- Migration: Harden Monster Compendium & Features RLS Policies
-- Date: 2026-10-31
-- Target Tables: public.monsters, public.monster_features
-- Description: Closes security vulnerabilities identified in code review:
--   1. Restricts monster INSERTs so non-admin creators can only insert Drafts with is_live = false.
--   2. Restricts monster UPDATEs so non-admin creators can only update Drafts or transition to Pending (never Approved/Live).
--   3. Explicitly codifies public read access for is_live = true monsters and features for anonymous visitors.

-- 1. Helper Function: is_monster_admin (ensures it is up to date and security definer)
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

GRANT EXECUTE ON FUNCTION public.is_monster_admin() TO public;

-- 2. Monsters Table Policies

-- SELECT: Public can view live monsters; authenticated creators can view their own; monster_admins can view all
DROP POLICY IF EXISTS "Enable read access for live monsters" ON public.monsters;
DROP POLICY IF EXISTS "Public can view live monsters" ON public.monsters;
CREATE POLICY "Public can view live monsters"
ON public.monsters FOR SELECT
TO public
USING (is_live = true);

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

-- INSERT: Non-admins can only insert Drafts with is_live = false matching their creator discord ID
DROP POLICY IF EXISTS "Creators can insert monsters" ON public.monsters;
CREATE POLICY "Creators can insert monsters"
ON public.monsters FOR INSERT
TO authenticated
WITH CHECK (
  (
    creator_discord_id = (SELECT discord_id FROM public.discord_users WHERE user_id = auth.uid())
    AND status = 'Draft'
    AND is_live = false
  )
  OR public.is_monster_admin()
);

-- UPDATE: Non-admins can only update their own Drafts or transition to Pending; cannot set Approved or is_live
DROP POLICY IF EXISTS "Creators or Staff can update monsters" ON public.monsters;
CREATE POLICY "Creators or Staff can update monsters"
ON public.monsters FOR UPDATE
TO authenticated
USING (
  (
    creator_discord_id = (SELECT discord_id FROM public.discord_users WHERE user_id = auth.uid())
    AND status IN ('Draft', 'Pending')
  )
  OR public.is_monster_admin()
)
WITH CHECK (
  (
    creator_discord_id = (SELECT discord_id FROM public.discord_users WHERE user_id = auth.uid())
    AND status IN ('Draft', 'Pending')
    AND is_live = false
  )
  OR public.is_monster_admin()
);

-- DELETE: Non-admins can only delete their own Drafts
DROP POLICY IF EXISTS "Creators or Staff can delete monsters" ON public.monsters;
CREATE POLICY "Creators or Staff can delete monsters"
ON public.monsters FOR DELETE
TO authenticated
USING (
  (
    creator_discord_id = (SELECT discord_id FROM public.discord_users WHERE user_id = auth.uid())
    AND status = 'Draft'
  )
  OR public.is_monster_admin()
);

-- 3. Monster Features Table Policies

-- SELECT: Public can view features of live monsters
DROP POLICY IF EXISTS "Public can view live monster features" ON public.monster_features;
DROP POLICY IF EXISTS "Public Access" ON public.monster_features;
CREATE POLICY "Public can view live monster features"
ON public.monster_features FOR SELECT
TO public
USING (
  parent_row_id IN (
    SELECT row_id FROM public.monsters WHERE is_live = true
  )
);

-- ALL: Authenticated creators can manage features for their own draft monsters; admins can manage any
DROP POLICY IF EXISTS "Users can manage features for owned monsters" ON public.monster_features;
CREATE POLICY "Users can manage features for owned monsters"
ON public.monster_features FOR ALL
TO authenticated
USING (
  parent_row_id IN (
    SELECT row_id FROM public.monsters 
    WHERE (
      creator_discord_id = (SELECT discord_id FROM public.discord_users WHERE user_id = auth.uid())
      AND status IN ('Draft', 'Pending')
    )
    OR public.is_monster_admin()
  )
)
WITH CHECK (
  parent_row_id IN (
    SELECT row_id FROM public.monsters 
    WHERE (
      creator_discord_id = (SELECT discord_id FROM public.discord_users WHERE user_id = auth.uid())
      AND status IN ('Draft', 'Pending')
    )
    OR public.is_monster_admin()
  )
);
