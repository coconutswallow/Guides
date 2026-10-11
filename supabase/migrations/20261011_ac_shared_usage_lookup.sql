-- ==============================================================================
-- Migration: 20261011_ac_shared_usage_lookup.sql
-- Description: Seed shared usage levels in public.lookups (type = 'usage')
--              to be shared across Allowed Content tabs (Monsters, Item Properties).
-- ==============================================================================

INSERT INTO public.lookups (type, data)
VALUES (
    'usage',
    jsonb_build_array(
        jsonb_build_object(
            'name', 'Fair Game',
            'label', 'Fair Game (Any DM)',
            'display_order', 1,
            'notes', 'Fair Game content can be used by any DM in adventures they run.'
        ),
        jsonb_build_object(
            'name', 'Full DM Only',
            'label', 'Full DM Only',
            'display_order', 2,
            'notes', 'DMs should take care to review statblock and notes before including.'
        )
    )
)
ON CONFLICT (type) DO UPDATE
SET data = EXCLUDED.data;
