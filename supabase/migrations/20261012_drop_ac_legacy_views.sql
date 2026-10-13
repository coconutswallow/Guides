-- ==============================================================================
-- Migration: 20261012_drop_ac_legacy_views.sql
-- Description: Drop deprecated Allowed Content compatibility views
--              (public.ac_downtime_categories and public.ac_equipment_categories)
--              which have been superseded by base tables ac_downtime_type and ac_equip_type.
-- ==============================================================================

BEGIN;

DROP VIEW IF EXISTS public.ac_downtime_categories CASCADE;
DROP VIEW IF EXISTS public.ac_equipment_categories CASCADE;

COMMIT;
