-- ==============================================================================
-- Migration: Enable Security Invoker on public.v_ac_races
-- Date: 2026-10-05
-- Target Database: Supabase PostgreSQL (public schema)
-- Description:
--   Sets security_invoker = true on public.v_ac_races so the view enforces
--   Row Level Security (RLS) policies of invoking roles (anon, authenticated).
--   Eliminates the "unrestricted view" security warning in Supabase.
-- ==============================================================================

ALTER VIEW public.v_ac_races SET (security_invoker = true);

GRANT SELECT ON public.v_ac_races TO anon, authenticated, service_role;
