-- ================================================================
-- Migration: Allowed Content Sources Admin RLS Policies
-- Target: public.ac_sources
-- Description:
--   Grants full management permissions (INSERT, UPDATE, DELETE)
--   on public.ac_sources to authenticated users possessing the
--   'Admin' or 'Engineer' roles in public.discord_users.
-- ================================================================

-- 1. Ensure RLS is enabled on ac_sources
ALTER TABLE public.ac_sources ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing admin policy if present (idempotent)
DROP POLICY IF EXISTS "Admins and Engineers can manage ac_sources" ON public.ac_sources;

-- 3. Create management policy for Admin and Engineer roles
CREATE POLICY "Admins and Engineers can manage ac_sources"
ON public.ac_sources FOR ALL
TO authenticated
USING (
  (SELECT roles FROM public.discord_users WHERE user_id = auth.uid()) @> '["Engineer"]'::jsonb
  OR (SELECT roles FROM public.discord_users WHERE user_id = auth.uid()) @> '["Admin"]'::jsonb
)
WITH CHECK (
  (SELECT roles FROM public.discord_users WHERE user_id = auth.uid()) @> '["Engineer"]'::jsonb
  OR (SELECT roles FROM public.discord_users WHERE user_id = auth.uid()) @> '["Admin"]'::jsonb
);
