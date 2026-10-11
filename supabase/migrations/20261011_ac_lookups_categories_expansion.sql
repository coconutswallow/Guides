-- ============================================================================
-- Migration: 20261011_ac_lookups_categories_expansion.sql
-- Description: Expand public.lookups table to store category and type options
--              for Allowed Content tabs (classes, backgrounds, feats,
--              item-properties, misc-features) and grant full manage access
--              to Staff Admins and Engineers.
-- ============================================================================

-- 1. Update RLS policies on public.lookups for Staff Admin and Engineer management
DROP POLICY IF EXISTS "Admins can update lookups" ON public.lookups;
DROP POLICY IF EXISTS "Admins and Engineers can manage lookups" ON public.lookups;

CREATE POLICY "Admins and Engineers can manage lookups" ON public.lookups
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.discord_users
        WHERE discord_users.user_id = auth.uid()
        AND (
            discord_users.roles @> '["Admin"]'::jsonb
            OR discord_users.roles @> '["Engineer"]'::jsonb
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.discord_users
        WHERE discord_users.user_id = auth.uid()
        AND (
            discord_users.roles @> '["Admin"]'::jsonb
            OR discord_users.roles @> '["Engineer"]'::jsonb
        )
    )
);

-- Ensure public read access remains intact
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'lookups' AND policyname = 'Enable read access for all users'
    ) THEN
        CREATE POLICY "Enable read access for all users" ON public.lookups
        FOR SELECT TO public USING (true);
    END IF;
END $$;

-- 2. Seed Lookups for Allowed Content Tabs

-- Classes & Subclasses categories and rulesets
INSERT INTO public.lookups (type, data)
VALUES (
    'classes',
    jsonb_build_object(
        'categories', jsonb_build_array(
            jsonb_build_object('name', 'Official', 'display_order', 1, 'notes', 'Official D&D 5e / 2024 Classes and Subclasses'),
            jsonb_build_object('name', 'Hawthorne Homebrew', 'display_order', 2, 'notes', 'Hawthorne Guild Custom Homebrew Content')
        ),
        'rulesets', jsonb_build_array(
            jsonb_build_object('label', '2014', 'value', '2014'),
            jsonb_build_object('label', '2024', 'value', '2024')
        )
    )
)
ON CONFLICT (type) DO UPDATE
SET data = CASE
    WHEN EXCLUDED.data IS NOT NULL THEN public.lookups.data || EXCLUDED.data
    ELSE public.lookups.data
END;

-- Backgrounds categories and rulesets
INSERT INTO public.lookups (type, data)
VALUES (
    'backgrounds',
    jsonb_build_object(
        'categories', jsonb_build_array(
            jsonb_build_object('name', 'Official', 'display_order', 1, 'notes', 'Official Backgrounds'),
            jsonb_build_object('name', 'Homebrew', 'display_order', 2, 'notes', 'Hawthorne Homebrew Backgrounds')
        ),
        'rulesets', jsonb_build_array(
            jsonb_build_object('label', '2014', 'value', '2014'),
            jsonb_build_object('label', '2024', 'value', '2024')
        )
    )
)
ON CONFLICT (type) DO UPDATE
SET data = CASE
    WHEN EXCLUDED.data IS NOT NULL THEN public.lookups.data || EXCLUDED.data
    ELSE public.lookups.data
END;

-- Feats categories and rulesets
INSERT INTO public.lookups (type, data)
VALUES (
    'feats',
    jsonb_build_object(
        'categories', jsonb_build_array(
            jsonb_build_object('name', 'General', 'display_order', 1, 'notes', NULL),
            jsonb_build_object('name', 'Origin', 'display_order', 2, 'notes', NULL),
            jsonb_build_object('name', 'Epic Boon', 'display_order', 3, 'notes', NULL),
            jsonb_build_object('name', 'Fighting Style', 'display_order', 4, 'notes', NULL),
            jsonb_build_object('name', 'Dragonmark', 'display_order', 5, 'notes', NULL),
            jsonb_build_object('name', 'Dark Gift', 'display_order', 6, 'notes', NULL)
        ),
        'rulesets', jsonb_build_array(
            jsonb_build_object('label', '2014', 'value', '2014'),
            jsonb_build_object('label', '2024', 'value', '2024')
        )
    )
)
ON CONFLICT (type) DO UPDATE
SET data = CASE
    WHEN EXCLUDED.data IS NOT NULL THEN public.lookups.data || EXCLUDED.data
    ELSE public.lookups.data
END;

-- Item Properties types and permissions
INSERT INTO public.lookups (type, data)
VALUES (
    'item-properties',
    jsonb_build_object(
        'types', jsonb_build_array(
            jsonb_build_object('name', 'Creator', 'display_order', 1, 'notes', 'Creator special features for magic items'),
            jsonb_build_object('name', 'History', 'display_order', 2, 'notes', 'History special features for magic items'),
            jsonb_build_object('name', 'Minor Property', 'display_order', 3, 'notes', 'Minor properties for magic items'),
            jsonb_build_object('name', 'Quirk', 'display_order', 4, 'notes', 'Quirks for magic items'),
            jsonb_build_object('name', 'Sentient Magic Item Property', 'display_order', 5, 'notes', 'Sentient magic item properties')
        ),
        'permissions', jsonb_build_array(
            jsonb_build_object('name', 'Fair Game', 'label', 'Fair Game (Any DM)', 'display_order', 1, 'notes', NULL),
            jsonb_build_object('name', 'Full DM Only', 'label', 'Full DM Only', 'display_order', 2, 'notes', NULL)
        )
    )
)
ON CONFLICT (type) DO UPDATE
SET data = CASE
    WHEN EXCLUDED.data IS NOT NULL THEN public.lookups.data || EXCLUDED.data
    ELSE public.lookups.data
END;

-- Misc Class Features sections and rulesets
INSERT INTO public.lookups (type, data)
VALUES (
    'misc-features',
    jsonb_build_object(
        'sections', jsonb_build_array(
            jsonb_build_object('id', 'FS', 'name', 'Fighting Styles', 'display_order', 1, 'notes', 'Fighting Style feats and options'),
            jsonb_build_object('id', 'AI', 'name', 'Artificer Infusions', 'display_order', 2, 'notes', 'Artificer Infusions'),
            jsonb_build_object('id', 'EI', 'name', 'Eldritch Invocations', 'display_order', 3, 'notes', 'Warlock Eldritch Invocations')
        ),
        'rulesets', jsonb_build_array(
            jsonb_build_object('label', '2014', 'value', '2014'),
            jsonb_build_object('label', '2024', 'value', '2024')
        )
    )
)
ON CONFLICT (type) DO UPDATE
SET data = CASE
    WHEN EXCLUDED.data IS NOT NULL THEN public.lookups.data || EXCLUDED.data
    ELSE public.lookups.data
END;
