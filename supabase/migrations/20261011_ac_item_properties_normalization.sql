-- ==============================================================================
-- MIGRATION: 20261011_ac_item_properties_normalization.sql
-- Description: Normalize public.ac_item_properties schema and dataset.
--              - Check IDs: ITP_0001 through ITP_0092 (1:1 with Allowed_Content_20261004.xlsx)
--              - UUID primary keys (gen_random_uuid())
--              - Category Foreign Key (UUID -> public.ac_item_properties_categories.id)
--              - Source as TEXT[] referencing canonical ac_sources keys (DMG2014, DMG2024, HHB)
--              - GIN index on source array
--              - display_order as DOUBLE PRECISION (fractional indexing)
--              - Clean up header artifact row
--              - Composite UNIQUE constraint (category_id, name)
--              - Full RLS policies for Public Read, Service Role, and Staff Admin/Engineer
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Ensure Supporting Source Exists in ac_sources
-- ------------------------------------------------------------------------------
INSERT INTO public.ac_sources (
    id, source_key, abbreviation, name, type, ruleset, allowed_content, link, display_order, check_id
) VALUES (
    'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d'::uuid,
    'HHB',
    'HHB',
    'Hawthorne Homebrew',
    'Hawthorne Homebrew',
    '2014',
    'All: Equipment, Backgrounds, Feats, Item Properties',
    '/Guides/allowed-content/#equipment',
    119.0,
    'SRC_0120'
)
ON CONFLICT (source_key) DO UPDATE SET
    name = EXCLUDED.name,
    abbreviation = EXCLUDED.abbreviation,
    type = EXCLUDED.type,
    updated_at = timezone('utc'::text, now());

-- ------------------------------------------------------------------------------
-- 2. Schema Evolution for public.ac_item_properties_categories
-- ------------------------------------------------------------------------------
ALTER TABLE public.ac_item_properties_categories 
    ALTER COLUMN display_order TYPE DOUBLE PRECISION USING display_order::double precision;

-- ------------------------------------------------------------------------------
-- 3. Schema Evolution for public.ac_item_properties
-- ------------------------------------------------------------------------------
-- Add check_id column if not exists
ALTER TABLE public.ac_item_properties 
    ADD COLUMN IF NOT EXISTS check_id VARCHAR(32);

-- Convert display_order to DOUBLE PRECISION
ALTER TABLE public.ac_item_properties 
    ALTER COLUMN display_order TYPE DOUBLE PRECISION USING display_order::double precision;
ALTER TABLE public.ac_item_properties 
    ALTER COLUMN display_order SET DEFAULT 10.0;

-- Convert source to TEXT[] if currently text
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'ac_item_properties' AND column_name = 'source' AND data_type = 'text'
    ) THEN
        ALTER TABLE public.ac_item_properties DROP CONSTRAINT IF EXISTS ac_item_properties_category_name_source_key;
        ALTER TABLE public.ac_item_properties ALTER COLUMN source TYPE TEXT[] USING string_to_array(source, ', ');
    END IF;
END $$;

-- Drop obsolete header artifact row if present (where name='Creator' and display_order=1)
DELETE FROM public.ac_item_properties 
WHERE name = 'Creator' AND (source = ARRAY['Minor Property']::text[] OR display_order = 1);

-- Ensure composite unique constraint on (category_id, name)
ALTER TABLE public.ac_item_properties DROP CONSTRAINT IF EXISTS ac_item_properties_category_id_name_key;
ALTER TABLE public.ac_item_properties DROP CONSTRAINT IF EXISTS ac_item_properties_category_name_key;
ALTER TABLE public.ac_item_properties ADD CONSTRAINT ac_item_properties_category_id_name_key UNIQUE (category_id, name);

-- GIN index for source array filtering
CREATE INDEX IF NOT EXISTS idx_ac_item_properties_source ON public.ac_item_properties USING GIN (source);

-- ------------------------------------------------------------------------------
-- 4. Upsert Normalized Data Records (ITP_0001 - ITP_0092)
-- ------------------------------------------------------------------------------

INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0001',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Creator' LIMIT 1),
    'Custom Creator',
    ARRAY['HHB']::text[],
    'Creator',
    'Fair Game',
    'A custom item property as created by a DM relating to whoever was the creator of or intended to use the magic item.',
    'Any DM can create and award a Creator property not listed here (such as Githyanki) provided it has no mechanical effect on the item''s use or it is a reflavor of one of the existing properties listed here.',
    10.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0002',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Creator' LIMIT 1),
    'Aberration',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Creator',
    'Fair Game',
    'See sources for description.',
    NULL,
    20.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0003',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Creator' LIMIT 1),
    'Celestial',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Creator',
    'Fair Game',
    'See sources for description.',
    NULL,
    30.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0004',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Creator' LIMIT 1),
    'Devotees of Lolth',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Creator',
    'Fair Game',
    'See sources for description.',
    'Known as "Drow" in the 2014 Dungeon Master''s Guide',
    40.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0005',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Creator' LIMIT 1),
    'Dragon',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Creator',
    'Fair Game',
    'See sources for description.',
    NULL,
    50.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0006',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Creator' LIMIT 1),
    'Dwarf',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Creator',
    'Fair Game',
    'See sources for description.',
    NULL,
    60.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0007',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Creator' LIMIT 1),
    'Elemental Air',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Creator',
    'Fair Game',
    'See sources for description.',
    NULL,
    70.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0008',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Creator' LIMIT 1),
    'Elemental Earth',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Creator',
    'Fair Game',
    'See sources for description.',
    NULL,
    80.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0009',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Creator' LIMIT 1),
    'Elemental Fire',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Creator',
    'Fair Game',
    'See sources for description.',
    NULL,
    90.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0010',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Creator' LIMIT 1),
    'Elemental Water',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Creator',
    'Fair Game',
    'See sources for description.',
    NULL,
    100.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0011',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Creator' LIMIT 1),
    'Elf',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Creator',
    'Fair Game',
    'See sources for description.',
    NULL,
    110.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0012',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Creator' LIMIT 1),
    'Fey',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Creator',
    'Fair Game',
    'See sources for description.',
    NULL,
    120.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0013',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Creator' LIMIT 1),
    'Fiend',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Creator',
    'Fair Game',
    'See sources for description.',
    NULL,
    130.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0014',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Creator' LIMIT 1),
    'Giant',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Creator',
    'Fair Game',
    'See sources for description.',
    NULL,
    140.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0015',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Creator' LIMIT 1),
    'Gnome',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Creator',
    'Fair Game',
    'See sources for description.',
    NULL,
    150.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0016',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Creator' LIMIT 1),
    'Human',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Creator',
    'Fair Game',
    'See sources for description.',
    NULL,
    160.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0017',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Creator' LIMIT 1),
    'Undead',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Creator',
    'Fair Game',
    'See sources for description.',
    NULL,
    170.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0018',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - History' LIMIT 1),
    'Custom History',
    ARRAY['HHB']::text[],
    'History',
    'Fair Game',
    'A custom item property as created by a DM regarding a detail in the history of the magic item.',
    'Any DM can create and award a History property not listed here provided it has no mechanical effect on the item''s use.',
    180.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0019',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - History' LIMIT 1),
    'Arcane',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'History',
    'Fair Game',
    'See sources for description.',
    NULL,
    190.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0020',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - History' LIMIT 1),
    'Bane',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'History',
    'Fair Game',
    'See sources for description.',
    NULL,
    200.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0021',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - History' LIMIT 1),
    'Heroic',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'History',
    'Fair Game',
    'See sources for description.',
    NULL,
    210.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0022',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - History' LIMIT 1),
    'Ornament',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'History',
    'Fair Game',
    'See sources for description.',
    NULL,
    220.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0023',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - History' LIMIT 1),
    'Prophecy',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'History',
    'Fair Game',
    'See sources for description.',
    NULL,
    230.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0024',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - History' LIMIT 1),
    'Religious',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'History',
    'Fair Game',
    'See sources for description.',
    NULL,
    240.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0025',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - History' LIMIT 1),
    'Sinister',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'History',
    'Fair Game',
    'See sources for description.',
    NULL,
    250.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0026',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - History' LIMIT 1),
    'Symbol of Power',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'History',
    'Fair Game',
    'See sources for description.',
    NULL,
    260.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0027',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Custom Minor Property',
    ARRAY['HHB']::text[],
    'Minor Property',
    'Full DM Only',
    'A custom item property as created by a Full DM that details a minor property the magic item has.',
    '- A Full DM can create and award a Minor Property not listed here (or via #dm-collaboration with a Full DM)
- Any custom Minor Property created in this way must be a minor property: DMs are advised to refer to the Minor Properties listed here for the scope of mechanical effect appropriate for a Minor Property.
- As a general rule of thumb, a Minor Property provides an additional minor effect that doesn''t directly interact with or affect how the item is meant to be used nor does it workaround how it is meant to be used. For example, a property that increased the speed conferred by a set of Wayfarer''s Boots would not be a Minor Property. Likewise, a property that allowed you to retain the magical bonus of a +1 Shield without wielding it also wouldn''t be a Minor Property. In both examples, the properties directly affect the normal use and properties of the item.
- As a general rule of thumb, a Minor Property either consists of a cosmetic effect or has a mechanical benefit that is often conditional or niche in applicability and with limited overall effect.
- As a general rule of thumb, if a Minor Property would replicate an effect only seen in a T1 or higher magic item or a magic item that requires Attunement, then it is not appropriate to be a Minor Property.
- Any property that directly improves attack rolls, saving throws, AC, or HP or likewise impose a similar penalty on enemies is not appropriate as a Minor Property.
- If a Full DM that is ever uncertain if a property they designed for an upcoming game is truly appropriate to be a Minor Property, they can consult with other DMs for advice in #dm-collaboration or contact a member of the Rules team for assistance.',
    270.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0028',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Beacon',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Minor Property',
    'Fair Game',
    'See sources for description.',
    NULL,
    280.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0029',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Compass',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Minor Property',
    'Fair Game',
    'See sources for description.',
    NULL,
    290.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0030',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Conscientious',
    ARRAY['DMG2014']::text[],
    'Minor Property',
    'Fair Game',
    'See source for description.',
    NULL,
    300.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0031',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Delver',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Minor Property',
    'Fair Game',
    'See sources for description.',
    NULL,
    310.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0032',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Gleaming',
    ARRAY['DMG2014']::text[],
    'Minor Property',
    'Fair Game',
    'See source for description.',
    NULL,
    320.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0033',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Guardian',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Minor Property',
    'Full DM Only',
    'See sources for description.',
    NULL,
    330.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0034',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Harmonious',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Minor Property',
    'Fair Game',
    'See sources for description.',
    NULL,
    340.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0035',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Illusion',
    ARRAY['DMG2014']::text[],
    'Minor Property',
    'Fair Game',
    'See source for description.',
    NULL,
    350.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0036',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Key',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Minor Property',
    'Fair Game',
    'See sources for description.',
    NULL,
    360.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0037',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Language',
    ARRAY['DMG2014']::text[],
    'Minor Property',
    'Fair Game',
    'See source for description.',
    NULL,
    370.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0038',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Secret Message',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Minor Property',
    'Fair Game',
    'See sources for description.',
    'Known as "Hidden Message" in the 2014 Dungeon Master''s Guide',
    380.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0039',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Sentinel',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Minor Property',
    'Fair Game',
    'See sources for description.',
    NULL,
    390.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0040',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Songcraft',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Minor Property',
    'Fair Game',
    'See sources for description.',
    'Known as "Song Craft" in the 2014 Dungeon Master''s Guide',
    400.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0041',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Strange Material',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Minor Property',
    'Fair Game',
    'See sources for description.',
    NULL,
    410.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0042',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Temperate',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Minor Property',
    'Fair Game',
    'See sources for description.',
    NULL,
    420.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0043',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Unbreakable',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Minor Property',
    'Full DM Only',
    'See sources for description.',
    'The special means required to destroy the item must be written in the #treasure-log or #session-log',
    430.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0044',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'War Leader',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Minor Property',
    'Fair Game',
    'See sources for description.',
    NULL,
    440.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0045',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Waterborne',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Minor Property',
    'Fair Game',
    'See sources for description.',
    NULL,
    450.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0046',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Wicked',
    ARRAY['DMG2014']::text[],
    'Minor Property',
    'Fair Game',
    'See source for description.',
    NULL,
    460.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0047',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Alien (HB)',
    ARRAY['HHB']::text[],
    'Minor Property',
    'Fair Game',
    'The item seems to be made of a strange material of a grotesque organic or crystalline nature. Its durability is unaffected.',
    'This homebrew minor property was created originally for the purposes of the first Hawthorne Story Season by kathcaly and luolang',
    470.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0048',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Altered Creatures (HB)',
    ARRAY['HHB']::text[],
    'Minor Property',
    'Fair Game',
    'If the item creates, summons, or transforms into one or more creatures, the creatures can have any creature type other than their original type except for Beast or Humanoid.',
    NULL,
    480.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0049',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Altered Resistances (HB)',
    ARRAY['HHB']::text[],
    'Minor Property',
    'Full DM Only',
    'If the item grants Resistance to one or more types of damage, it instead grants Resistance to any other damage type of the DM''s choice except for Bludgeoning, Piercing, Slashing, or Force.',
    NULL,
    490.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0050',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Aqua Affinity (HB)',
    ARRAY['HHB']::text[],
    'Minor Property',
    'Fair Game',
    'While holding the item, you can hold your breath for twice as long while underwater.',
    'This homebrew minor property was created originally for the purposes of the 2021 Underwater District event by kathcaly, itsmuddy, killerspy7, strikingtherich, and magurotoria as Lore Consultants',
    500.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0051',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Aqua Sight (HB)',
    ARRAY['HHB']::text[],
    'Minor Property',
    'Fair Game',
    'The wielder of this item can see normally in clear water, following the rules for visibility outdoors.',
    'This homebrew minor property was created originally for the purposes of the 2021 Underwater District event by kathcaly, itsmuddy, killerspy7, strikingtherich, and magurotoria as Lore Consultants',
    510.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0052',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Bioluminescent (HB)',
    ARRAY['HHB']::text[],
    'Minor Property',
    'Fair Game',
    'The item is riddled with bioluminescent organisms that can shed a dim blue light. The bearer can use a bonus action to cause the organisms to shed blue Dim Light in a 15-foot radius, or to extinguish the light.',
    'This homebrew minor property was created originally for the purposes of the 2021 Underwater District event by kathcaly, itsmuddy, killerspy7, strikingtherich, and magurotoria as Lore Consultants',
    520.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0053',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Bubbly (HB)',
    ARRAY['HHB']::text[],
    'Minor Property',
    'Fair Game',
    'While holding this item, a constant stream of small bubbles emerge from the bearer’s body. Each bubble pops after a few seconds and has no other effect.',
    'This homebrew minor property was created originally for the purposes of the 2021 Underwater District event by kathcaly, itsmuddy, killerspy7, strikingtherich, and magurotoria as Lore Consultants',
    530.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0054',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Damage Alteration (HB)',
    ARRAY['HHB']::text[],
    'Minor Property',
    'Full DM Only',
    'If the item deals extra damage (such as a Flame Tongue) or deals damage other than its normal damage type (such as a Sun Blade), provided the damage type dealt by the item isn''t Poison, the item instead deals damage of any other type of the DM''s choice except Bludgeoning, Piercing, Slashing, or Force.',
    NULL,
    540.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0055',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Deep Diver (HB)',
    ARRAY['HHB']::text[],
    'Minor Property',
    'Fair Game',
    'The wielder of this item can spend twice as long as normal swimming underwater at depths greater than 100 feet below the surface.',
    'This homebrew minor property was created originally for the purposes of the 2021 Underwater District event by kathcaly, itsmuddy, killerspy7, strikingtherich, and magurotoria as Lore Consultants',
    550.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0056',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Destructive (HB)',
    ARRAY['HHB']::text[],
    'Minor Property',
    'Fair Game',
    'This item amplifies the destructive impulses in its bearer. When the bearer of this item reduces a creature to 0 hit points with a melee attack, they cannot choose to knock the creature out.',
    'This homebrew minor property was created originally for the purposes of the first Hawthorne Story Season by kathcaly and luolang',
    560.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0057',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Disturbed (HB)',
    ARRAY['HHB']::text[],
    'Minor Property',
    'Fair Game',
    'Being in the presence of the item is extremely disturbing. Whenever the bearer of the item finishes a Long Rest, they must succeed on a DC 12 Wisdom saving throw or take 1d6 Psychic damage.',
    'This homebrew minor property was created originally for the purposes of the first Hawthorne Story Season by kathcaly and luolang',
    570.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0058',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Lingering Presence (HB)',
    ARRAY['HHB']::text[],
    'Minor Property',
    'Fair Game',
    'While bearing this item, the bearer gets the sensation of being followed by a strange creature and can even see tentacle like appendages in the corner of their eyes. Whenever they turn around to look, there is nothing there. No one else is affected by this.',
    'This homebrew minor property was created originally for the purposes of the first Hawthorne Story Season by kathcaly and luolang',
    580.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0059',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Lure (HB)',
    ARRAY['HHB']::text[],
    'Minor Property',
    'Fair Game',
    'While holding this item underwater, small fish are attracted to the bearer.',
    'This homebrew minor property was created originally for the purposes of the 2021 Underwater District event by kathcaly, itsmuddy, killerspy7, strikingtherich, and magurotoria as Lore Consultants',
    590.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0060',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Madness (HB)',
    ARRAY['HHB']::text[],
    'Minor Property',
    'Fair Game',
    'The item threatens its bearer’s sense of reality while in their possession. While bearing this item, the bearer suffers from an indefinite madness as selected by the DM. This indefinite madness lasts until the bearer is separated from the item for at least 24 hours. The use of Greater Restoration or similar magic made to cure an indefinite madness suppresses this effect for 24 hours.',
    'This homebrew minor property was created originally for the purposes of the first Hawthorne Story Season by kathcaly and luolang',
    600.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0061',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Moist (HB)',
    ARRAY['HHB']::text[],
    'Minor Property',
    'Fair Game',
    'This item is always wet to the touch.',
    'This homebrew minor property was created originally for the purposes of the 2021 Underwater District event by kathcaly, itsmuddy, killerspy7, strikingtherich, and magurotoria as Lore Consultants',
    610.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0062',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Paracusia (HB)',
    ARRAY['HHB']::text[],
    'Minor Property',
    'Fair Game',
    'The bearer of this item experiences auditory hallucinations at unpredictable times, with the hallucinations often of a threatening or unsettling nature.',
    'This homebrew minor property was created originally for the purposes of the first Hawthorne Story Season by kathcaly and luolang',
    620.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0063',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Paranoia (HB)',
    ARRAY['HHB']::text[],
    'Minor Property',
    'Fair Game',
    'The bearer of this item finds themself more inclined to distrust others and has their sense of suspicion heightened, regardless of whether their suspicions are justified or not.',
    'This homebrew minor property was created originally for the purposes of the first Hawthorne Story Season by kathcaly and luolang',
    630.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0064',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Sailor Compass (HB)',
    ARRAY['HHB']::text[],
    'Minor Property',
    'Fair Game',
    'The wielder can use an action to learn which way is the nearest solid land.',
    'This homebrew minor property was created originally for the purposes of the 2021 Underwater District event by kathcaly, itsmuddy, killerspy7, strikingtherich, and magurotoria as Lore Consultants',
    640.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0065',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Salty Air (HB)',
    ARRAY['HHB']::text[],
    'Minor Property',
    'Fair Game',
    'While holding this item, the bearer always smells like the sea.',
    'This homebrew minor property was created originally for the purposes of the 2021 Underwater District event by kathcaly, itsmuddy, killerspy7, strikingtherich, and magurotoria as Lore Consultants',
    650.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0066',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Skillful (HB)',
    ARRAY['HHB']::text[],
    'Minor Property',
    'Fair Game',
    'The bearer of this item has a +2 bonus to any ability check using a skill or tool of the DM''s choice, except for Perception or Stealth',
    NULL,
    660.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0067',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Soulbound (HB)',
    ARRAY['HHB']::text[],
    'Minor Property',
    'Fair Game',
    'This item can only be used by its chosen recipient as determined by the DM and does not grant its benefits or properties to anyone else.',
    'An item with this property only functions for the user that originally obtains it or that it is intended for and does not function or provide its benefits to anyone else.',
    670.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0068',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Stained (HB)',
    ARRAY['HHB']::text[],
    'Minor Property',
    'Fair Game',
    'This item appears to be stained. No matter how much it is washed, the stain never goes off.',
    'This homebrew minor property was created originally for the purposes of the first Hawthorne Story Season by kathcaly and luolang',
    680.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0069',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Stealthy (HB)',
    ARRAY['HHB']::text[],
    'Minor Property',
    'Full DM Only',
    'The bearer of this item has a +2 bonus to Dexterity (Stealth) checks',
    NULL,
    690.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0070',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Steamy (HB)',
    ARRAY['HHB']::text[],
    'Minor Property',
    'Fair Game',
    'While holding this item underwater, the water around the bearer appears to be boiling. While holding this item while not underwater, vapor seems to rise around the bearer, as if steaming. However, this item doesn’t modify the temperature of the environment.',
    'This homebrew minor property was created originally for the purposes of the 2021 Underwater District event by kathcaly, itsmuddy, killerspy7, strikingtherich, and magurotoria as Lore Consultants',
    700.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0071',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Translucent (HB)',
    ARRAY['HHB']::text[],
    'Minor Property',
    'Fair Game',
    'The item is translucent. While in physical contact with the item, the bearer’s skin becomes translucent, making their blood vessels apparent to sight.',
    'This homebrew minor property was created originally for the purposes of the first Hawthorne Story Season by kathcaly and luolang',
    710.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0072',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Watchful (HB)',
    ARRAY['HHB']::text[],
    'Minor Property',
    'Full DM Only',
    'The bearer of this item has a +2 bonus to Wisdom (Perception) checks',
    NULL,
    720.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0073',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Minor Property' LIMIT 1),
    'Warped (HB)',
    ARRAY['HHB']::text[],
    'Minor Property',
    'Fair Game',
    'The item is twisted into an unnatural shape. While bearing the item, a tumorous growth appears on the bearer’s body within 1d4 hours since first bearing it. If the item is separated from the bearer for a period of at least 24 hours, the growth disappears.',
    'This homebrew minor property was created originally for the purposes of the first Hawthorne Story Season by kathcaly and luolang',
    730.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0074',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Quirk' LIMIT 1),
    'Custom Quirk',
    ARRAY['HHB']::text[],
    'Quirk',
    'Fair Game',
    'A custom item property as created by a DM that details a minor quirk the magic item has.',
    'Any DM can create and award a Quirk property not listed here provided it has no mechanical effect on the item''s use.',
    740.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0075',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Quirk' LIMIT 1),
    'Blissful',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Quirk',
    'Fair Game',
    'See sources for description.',
    NULL,
    750.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0076',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Quirk' LIMIT 1),
    'Confident',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Quirk',
    'Fair Game',
    'See sources for description.',
    NULL,
    760.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0077',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Quirk' LIMIT 1),
    'Covetous',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Quirk',
    'Fair Game',
    'See sources for description.',
    NULL,
    770.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0078',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Quirk' LIMIT 1),
    'Fragile',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Quirk',
    'Fair Game',
    'See sources for description.',
    'Known as "Frail" in the 2014 Dungeon Master''s Guide',
    780.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0079',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Quirk' LIMIT 1),
    'Hungry',
    ARRAY['DMG2014']::text[],
    'Quirk',
    'Fair Game',
    'See source for description.',
    NULL,
    790.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0080',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Quirk' LIMIT 1),
    'Loud',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Quirk',
    'Fair Game',
    'See sources for description.',
    NULL,
    800.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0081',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Quirk' LIMIT 1),
    'Metamorphic',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Quirk',
    'Fair Game',
    'See sources for description.',
    NULL,
    810.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0082',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Quirk' LIMIT 1),
    'Muttering',
    ARRAY['DMG2014']::text[],
    'Quirk',
    'Fair Game',
    'See source for description.',
    NULL,
    820.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0083',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Quirk' LIMIT 1),
    'Painful',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Quirk',
    'Fair Game',
    'See sources for description.',
    NULL,
    830.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0084',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Quirk' LIMIT 1),
    'Possessive',
    ARRAY['DMG2014']::text[],
    'Quirk',
    'Fair Game',
    'See source for description.',
    NULL,
    840.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0085',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Quirk' LIMIT 1),
    'Repulsive',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Quirk',
    'Fair Game',
    'See sources for description.',
    NULL,
    850.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0086',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Magic Item Special Features - Quirk' LIMIT 1),
    'Slothful',
    ARRAY['DMG2014']::text[],
    'Quirk',
    'Fair Game',
    'See source for description.',
    NULL,
    860.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0087',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Sentient Magic Items' LIMIT 1),
    'Abilities',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Sentient Magic Item Property',
    'Full DM Only',
    'The sentient magic item''s Intelligence, Wisdom, and Charisma ability scores. See sources for description.',
    'As described, either choose the sentient magic item''s Intelligence, Wisdom, and Charisma scores, or determine them by rolling 4d6, dropping the lowest and totaling the rest.',
    870.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0088',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Sentient Magic Items' LIMIT 1),
    'Alignment',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Sentient Magic Item Property',
    'Full DM Only',
    'The sentient magic item''s alignment. See sources for description.',
    'As described, either choose the sentient magic item''s alignment or roll on the associated table to determine it.',
    880.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0089',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Sentient Magic Items' LIMIT 1),
    'Communication',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Sentient Magic Item Property',
    'Full DM Only',
    'The sentient magic item''s means of communication. See sources for description.',
    '- As described, either choose the sentient magic item''s means of communication on the associated table or roll on the associated table to determine it.
- You can also have the sentient magic item communicate in a unique way not listed in the table, such as having words appear on the item.',
    890.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0090',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Sentient Magic Items' LIMIT 1),
    'Senses',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Sentient Magic Item Property',
    'Full DM Only',
    'The sentient magic item''s senses. See sources for description.',
    'As described, either choose the sentient magic item''s senses on the associated table or roll on the associated table to determine it.',
    900.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0091',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Sentient Magic Items' LIMIT 1),
    'Special Purpose',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'Sentient Magic Item Property',
    'Full DM Only',
    'The sentient magic item''s special purpose. See sources for description.',
    '- As described, either choose the sentient magic item''s special purpose on the associated table or roll on the associated table to determine it.
- You can also assign a unique special purpose to the sentient magic item not listed on the table, such as seeking to reclaim a lost throne.',
    910.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());
INSERT INTO public.ac_item_properties (
    check_id, category_id, name, source, type, category_sub, description, notes_advice, display_order
) VALUES (
    'ITP_0092',
    (SELECT id FROM public.ac_item_properties_categories WHERE name = 'Sentient Magic Items' LIMIT 1),
    'Characteristics',
    ARRAY['DMG2014']::text[],
    'Sentient Magic Item Property',
    'Full DM Only',
    'The sentient magic item''s characteristics and personality. See source for description.',
    'As described, determine the sentient magic item''s characteristics and personality by using the guidelines for creating NPCs, including determing personality traits, ideals, bonds, and flaws.',
    920.0
)
ON CONFLICT (category_id, name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    source = EXCLUDED.source,
    type = EXCLUDED.type,
    category_sub = EXCLUDED.category_sub,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

-- ------------------------------------------------------------------------------
-- 5. Add Constraints & Indices
-- ------------------------------------------------------------------------------
ALTER TABLE public.ac_item_properties DROP CONSTRAINT IF EXISTS ac_item_properties_check_id_key;
ALTER TABLE public.ac_item_properties ADD CONSTRAINT ac_item_properties_check_id_key UNIQUE (check_id);

-- ------------------------------------------------------------------------------
-- 6. Row Level Security Policies (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.ac_item_properties_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ac_item_properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to ac_item_properties_categories" ON public.ac_item_properties_categories;
DROP POLICY IF EXISTS "Allow service_role to manage ac_item_properties_categories" ON public.ac_item_properties_categories;
DROP POLICY IF EXISTS "Admins and Engineers can manage ac_item_properties_categories" ON public.ac_item_properties_categories;

CREATE POLICY "Allow public read access to ac_item_properties_categories"
ON public.ac_item_properties_categories FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow service_role to manage ac_item_properties_categories"
ON public.ac_item_properties_categories FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins and Engineers can manage ac_item_properties_categories"
ON public.ac_item_properties_categories FOR ALL
TO authenticated
USING (
  ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
  OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
)
WITH CHECK (
  ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
  OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
);

DROP POLICY IF EXISTS "Allow public read access to ac_item_properties" ON public.ac_item_properties;
DROP POLICY IF EXISTS "Allow service_role to manage ac_item_properties" ON public.ac_item_properties;
DROP POLICY IF EXISTS "Admins and Engineers can manage ac_item_properties" ON public.ac_item_properties;

CREATE POLICY "Allow public read access to ac_item_properties"
ON public.ac_item_properties FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow service_role to manage ac_item_properties"
ON public.ac_item_properties FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins and Engineers can manage ac_item_properties"
ON public.ac_item_properties FOR ALL
TO authenticated
USING (
  ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
  OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
)
WITH CHECK (
  ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
  OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
);
