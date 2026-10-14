-- ==============================================================================
-- Migration: 20261014_drop_ac_bastions_legacy_tables.sql
-- Description: Drop deprecated Allowed Content legacy bastion tables
--              (public.ac_bastions and public.ac_bastion_categories)
--              which were superseded by normalized public.ac_bastion and
--              public.ac_bastion_type.
-- ==============================================================================

BEGIN;

DROP TABLE IF EXISTS public.ac_bastions CASCADE;
DROP TABLE IF EXISTS public.ac_bastion_categories CASCADE;

COMMIT;
