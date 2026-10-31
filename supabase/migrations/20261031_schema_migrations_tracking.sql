-- Migration: Schema Migrations Tracking
-- Date: 2026-10-31
-- Target Table: public._schema_migrations

CREATE TABLE IF NOT EXISTS public._schema_migrations (
    version VARCHAR(120) PRIMARY KEY,
    name TEXT NOT NULL,
    checksum VARCHAR(64) NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    applied_by TEXT DEFAULT CURRENT_USER,
    execution_time_ms INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at 
ON public._schema_migrations(applied_at);

-- Row Level Security
ALTER TABLE public._schema_migrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view schema_migrations" ON public._schema_migrations;
CREATE POLICY "Public can view schema_migrations"
ON public._schema_migrations FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Staff and Admins can manage schema_migrations" ON public._schema_migrations;
CREATE POLICY "Staff and Admins can manage schema_migrations"
ON public._schema_migrations FOR ALL
TO authenticated
USING (
  ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
  OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
)
WITH CHECK (
  ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
  OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
);
