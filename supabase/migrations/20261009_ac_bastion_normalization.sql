-- ==============================================================================
-- MIGRATION: 20261009_ac_bastion_normalization.sql
-- Description: Normalize public.ac_bastion_type and public.ac_bastion schemas.
--              Includes check_id (BAS_0001..BAS_0066), bastion_type_id foreign key,
--              source as TEXT[] referencing ac_sources, facility size, prerequisites,
--              GP/DTP costs, order, description, notes_advice, fractional display_order
--              (DOUBLE PRECISION), handle_updated_at triggers, GIN indexing,
--              and Staff Admin & Engineer RLS policies.
--
--              Source data:
--                - AC_Bastion.xlsx (66 facility records with check_id)
--                - AC_Bastion_Type.xlsx (4 category type records)
--                - Allowed_Content_20261004.xlsx > Bastions sheet
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Ensure Supporting Sources Exist in ac_sources
--    (EFA, FRHOF, RHW are added by Equipment migration; HHB ensured here)
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
    'All: Equipment, Backgrounds, Feats',
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
-- 2. Schema Setup for public.ac_bastion_type
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ac_bastion_type (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    check_id VARCHAR(32) UNIQUE NOT NULL,
    name TEXT NOT NULL UNIQUE,
    notes TEXT,
    display_order DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.ac_bastion_type ALTER COLUMN display_order TYPE DOUBLE PRECISION USING display_order::double precision;

-- ------------------------------------------------------------------------------
-- 3. Upsert All 4 Bastion Types (Categories)
-- ------------------------------------------------------------------------------

INSERT INTO public.ac_bastion_type (id, check_id, name, notes, display_order)
VALUES (
    'e1a7b2c3-d4e5-4f60-8a9b-0c1d2e3f4a5b'::uuid,
    'BASC_0001',
    'General Rules',
    'A starting Bastion must contain two Basic Facilities (one Cramped and one Roomy) and two Special Facilities. You must be level 5+ and meet all other prerequisites. See Appendix B of the Player Guidelines for details.

Any facility or component built as part of a Bastion can be torn down and 50% of its gold cost refunded. The Bastion must still contain at least two Basic Facilities (including one Cramped and one Roomy) and two Special Facilities afterward to be useable.

A Special Facility can be replaced with another Special Facility by paying the gold and DTP to build the new facility, but the full gold cost of the old facility contributes to the new one

You can combine your Bastion with Bastions built by one or more characters of other players into a single structure as written in the 2024 Dungeon Master''s Guide.  Each participant can mutually contribute gold and DTP in building and expanding Bastions in this way.

Any items acquired or crafted from Bastions are subject to the normal trading rules (including needing to wait 30 days before self trading)',
    1.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    name = EXCLUDED.name,
    notes = EXCLUDED.notes,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion_type (id, check_id, name, notes, display_order)
VALUES (
    'f2b8c3d4-e5f6-4071-9bac-1d2e3f4a5b6c'::uuid,
    'BASC_0002',
    'Basic Facilities',
    'A Bastion can have any number of Basic Facilities.',
    2.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    name = EXCLUDED.name,
    notes = EXCLUDED.notes,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion_type (id, check_id, name, notes, display_order)
VALUES (
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'BASC_0003',
    'Special Facilities',
    'You must meet all prerequisites of a Special Facility in order to build and use it. The maximum number of Special Facilities your Bastion can have depends on your character''s level (see Appendix B of the Player Guidelines for details)

A Bastion can''t have more than one Special Facility of the same kind unless the facility''s description says otherwise.

A Special Facility can be replaced with another Special Facility by paying the gold and DTP to build the new facility, but the full gold cost of the old facility contributes to the new one

Only the Bastion''s owner can benefit from its Special Facilities except where explicitly noted otherwise.

Certain Special Facilities have associated Craftable Magic Item Types to be used with the Crafting Magic Item downtime activity',
    3.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    name = EXCLUDED.name,
    notes = EXCLUDED.notes,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion_type (id, check_id, name, notes, display_order)
VALUES (
    'b4dae5f6-a7b8-4293-1dec-3f4a5b6c7d8e'::uuid,
    'BASC_0004',
    'Other',
    NULL,
    4.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    name = EXCLUDED.name,
    notes = EXCLUDED.notes,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

-- ------------------------------------------------------------------------------
-- 4. Schema Setup & Evolution for public.ac_bastion
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ac_bastion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    check_id VARCHAR(32) UNIQUE NOT NULL,
    bastion_type_id UUID REFERENCES public.ac_bastion_type(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    source TEXT[] NOT NULL DEFAULT ARRAY['DMG2024']::text[],
    size TEXT,
    prerequisite TEXT,
    gp_cost TEXT,
    dtp_cost TEXT,
    bastion_order TEXT,
    description TEXT,
    notes_advice TEXT,
    display_order DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Evolve schema if table already exists
ALTER TABLE public.ac_bastion ADD COLUMN IF NOT EXISTS check_id VARCHAR(32);
ALTER TABLE public.ac_bastion ADD COLUMN IF NOT EXISTS bastion_type_id UUID REFERENCES public.ac_bastion_type(id) ON DELETE SET NULL;
ALTER TABLE public.ac_bastion ADD COLUMN IF NOT EXISTS size TEXT;
ALTER TABLE public.ac_bastion ADD COLUMN IF NOT EXISTS prerequisite TEXT;
ALTER TABLE public.ac_bastion ADD COLUMN IF NOT EXISTS gp_cost TEXT;
ALTER TABLE public.ac_bastion ADD COLUMN IF NOT EXISTS dtp_cost TEXT;
ALTER TABLE public.ac_bastion ADD COLUMN IF NOT EXISTS bastion_order TEXT;
ALTER TABLE public.ac_bastion ADD COLUMN IF NOT EXISTS notes_advice TEXT;

-- Convert source to TEXT[] if currently text
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'ac_bastion' AND column_name = 'source' AND data_type = 'text'
    ) THEN
        ALTER TABLE public.ac_bastion ALTER COLUMN source TYPE TEXT[] USING string_to_array(source, ', ');
    END IF;
END $$;

-- Ensure display_order is DOUBLE PRECISION
ALTER TABLE public.ac_bastion ALTER COLUMN display_order TYPE DOUBLE PRECISION USING display_order::double precision;
ALTER TABLE public.ac_bastion ALTER COLUMN display_order SET DEFAULT 0.0;

-- Add UNIQUE constraint on check_id if not already present
ALTER TABLE public.ac_bastion DROP CONSTRAINT IF EXISTS ac_bastion_check_id_key;
ALTER TABLE public.ac_bastion ADD CONSTRAINT ac_bastion_check_id_key UNIQUE (check_id);

-- GIN index for multi-source search
CREATE INDEX IF NOT EXISTS idx_ac_bastion_source ON public.ac_bastion USING GIN (source);

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ac_bastion_type_updated_at ON public.ac_bastion_type;
CREATE TRIGGER trg_ac_bastion_type_updated_at
    BEFORE UPDATE ON public.ac_bastion_type
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS trg_ac_bastion_updated_at ON public.ac_bastion;
CREATE TRIGGER trg_ac_bastion_updated_at
    BEFORE UPDATE ON public.ac_bastion
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ------------------------------------------------------------------------------
-- 5. Upsert All 66 Bastion Facility Records
-- ------------------------------------------------------------------------------

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    'c9d537e6-6911-575c-9a3c-04c9ecaa9758'::uuid,
    'BAS_0001',
    'f2b8c3d4-e5f6-4071-9bac-1d2e3f4a5b6c'::uuid,
    'Bedroom',
    ARRAY['DMG2024']::text[],
    'Cramped / Roomy / Vast (4/16/36 sq)',
    NULL,
    '500 / 1000/ 3000',
    '20 / 45 / 125',
    NULL,
    'Comes with nonmagical furnishings and decor. See book for details.',
    NULL,
    1.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '84672220-c853-5651-b2d3-69a18047622a'::uuid,
    'BAS_0002',
    'f2b8c3d4-e5f6-4071-9bac-1d2e3f4a5b6c'::uuid,
    'Courtyard',
    ARRAY['DMG2024']::text[],
    'Cramped / Roomy / Vast (4/16/36 sq)',
    NULL,
    '500 / 1000/ 3000',
    '20 / 45 / 125',
    NULL,
    'Comes with nonmagical furnishings and decor. See book for details.',
    NULL,
    2.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '3df16436-1119-5db9-82ba-10175f2d0089'::uuid,
    'BAS_0003',
    'f2b8c3d4-e5f6-4071-9bac-1d2e3f4a5b6c'::uuid,
    'Dining Room',
    ARRAY['DMG2024']::text[],
    'Cramped / Roomy / Vast (4/16/36 sq)',
    NULL,
    '500 / 1000/ 3000',
    '20 / 45 / 125',
    NULL,
    'Comes with nonmagical furnishings and decor. See book for details.',
    NULL,
    3.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '1d15fc24-3b5e-53c4-adcf-ac8c21f29a4f'::uuid,
    'BAS_0004',
    'f2b8c3d4-e5f6-4071-9bac-1d2e3f4a5b6c'::uuid,
    'Kitchen',
    ARRAY['DMG2024']::text[],
    'Cramped / Roomy / Vast (4/16/36 sq)',
    NULL,
    '500 / 1000/ 3000',
    '20 / 45 / 125',
    NULL,
    'Comes with nonmagical furnishings and decor. See book for details.',
    NULL,
    4.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    'fd8e526b-0a1d-5f9c-848f-672fbc244e1e'::uuid,
    'BAS_0005',
    'f2b8c3d4-e5f6-4071-9bac-1d2e3f4a5b6c'::uuid,
    'Parlor',
    ARRAY['DMG2024']::text[],
    'Cramped / Roomy / Vast (4/16/36 sq)',
    NULL,
    '500 / 1000/ 3000',
    '20 / 45 / 125',
    NULL,
    'Comes with nonmagical furnishings and decor. See book for details.',
    NULL,
    5.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    'f7848846-c07b-50c8-b761-80d576c48adf'::uuid,
    'BAS_0006',
    'f2b8c3d4-e5f6-4071-9bac-1d2e3f4a5b6c'::uuid,
    'Storage',
    ARRAY['DMG2024']::text[],
    'Cramped / Roomy / Vast (4/16/36 sq)',
    NULL,
    '500 / 1000/ 3000',
    '20 / 45 / 125',
    NULL,
    'Comes with nonmagical furnishings and decor. See book for details.',
    NULL,
    6.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '46ec415d-ad85-5c76-8beb-b6d0c974ff80'::uuid,
    'BAS_0007',
    'f2b8c3d4-e5f6-4071-9bac-1d2e3f4a5b6c'::uuid,
    'Grounds',
    ARRAY['HHB']::text[],
    '144 squares / 256 squares',
    NULL,
    '3000 / 5000',
    '125 / 250',
    NULL,
    'Large open area (e.g. field, clearing, plaza, great hall, park, lake, etc).',
    '- This homebrew Bastion facility was created by rexen
- If a similar Facility is officially printed, then this homebrew facility will be deprecated and anyone who built it will be refunded the gold and DTP spent to build this facility.',
    7.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '974ffc3f-52e2-5ecf-8b07-228bbec758b6'::uuid,
    'BAS_0008',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Amethyst Dragon Den',
    ARRAY['FRHOF']::text[],
    'Vast (36 sq)',
    'Level 5+, Member of the Purple Dragon Knights (Renown Score 3+)',
    '3000.0',
    '125.0',
    'Empower',
    'Comes with 1 hireling. See book for description.',
    'For the Empower: Psionic Defenses order, only in character days that pass as part of an adventure count against the duration of effect as determined by the DM.',
    8.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '6cd203fd-f666-5b94-b885-26b394c8a36f'::uuid,
    'BAS_0009',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Arcane Study',
    ARRAY['DMG2024']::text[],
    'Roomy (16 sq)',
    'Level 5+, ability to use an Arcane Focus or tool as a Spellcasting Focus',
    '1000.0',
    '45.0',
    'Craft',
    'Comes with 1 hireling. See book for description.

Craftable Magic Items Types:*
- Rod
- Staff
- Wand
- Wondrous item that requires attunement by an Artificer, Bard, Sorcerer, Warlock, or Wizard

* Can''t be used for crafting items that require attunement by only a Cleric, Druid, Paladin, or Ranger',
    '- For the Craft: Arcane Focus or Book order, crafting the item requires no additional DTP beyond taking the Bastion Turn and requires no additional GP beyond what is written.
- For the Craft: Magic Item order (must be level 9+), the crafted magic item can be any T0 or T1 item in the Rolled or Select Loot categories of the listed Craftable Magic Item Types (ignore rarity and theme). This facility''s hireling can craft the item even if you don''t have the associated tool proficiency, though you must still expend gold and DTP as normal. If the item allows one to cast any spells or has specific attunement restrictions, you must craft the item yourself.',
    9.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '57a3741b-a850-527e-8f62-5a7f1c4c0b50'::uuid,
    'BAS_0010',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Armory',
    ARRAY['DMG2024']::text[],
    'Roomy (16 sq)',
    'Level 5+',
    '1000.0',
    '45.0',
    'Trade',
    'Comes with 1 hireling. See book for description.',
    NULL,
    10.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '43091176-e340-5657-b30c-cb437127c19a'::uuid,
    'BAS_0011',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Barrack',
    ARRAY['DMG2024']::text[],
    'Roomy (16 sq)',
    'Level 5+',
    '1000.0',
    '45.0',
    'Recruit',
    'Comes with 1 hireling. A Bastion can have more than one Barrack. See book for description.',
    'Can be expanded to Vast as written by expending 2000 GP and 80 DTP',
    11.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    'e0dfc03e-eb1a-513c-a981-ed47fc1f8599'::uuid,
    'BAS_0012',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Dragonmark Outpost',
    ARRAY['EFA']::text[],
    'Roomy (16 sq)',
    'Level 5+, Renown Score 10+ with any Dragonmarked House',
    '1000.0',
    '45.0',
    'Empower',
    'Comes with 1 hireling. See book for description.',
    '- This Special Facility can only be used if your Bastion is in Khorvaire or another region in Eberron with dragonmarked houses present.
- If you take a Bastion Turn while physically present at your Bastion, you gain the benefits of Dragonmark Empowerment without needing to expend any additional DTP. You must otherwise expend 1 DTP to gain the benefits of Dragonmark Empowerment in downtime while present at the Bastion. You don''t need to expend this DTP during an adventure.',
    12.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '422ebf0c-d5d0-54e0-89c8-6649524c7287'::uuid,
    'BAS_0013',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Garden',
    ARRAY['DMG2024']::text[],
    'Roomy (16 sq)',
    'Level 5+',
    '1000.0',
    '45.0',
    'Harvest',
    'Comes with 1 hireling. A Bastion can have more than one Garden. See book for description.

Craftable Magic Items Types:
- Potion',
    '- For the Harvest: Garden Growth order, collecting the items requires no additional DTP beyond taking the Bastion Turn and costs no money.
- Changing the Garden''s type costs 21 DTP
- Can be expanded to Vast as written by expending 2000 GP and 80 DTP. A Vast Garden gains 1 extra hireling.',
    13.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '3cb9409f-4faa-58db-90bf-bfb97df95bfd'::uuid,
    'BAS_0014',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Harper Hideout',
    ARRAY['FRHOF']::text[],
    'Roomy (16 sq)',
    'Level 5+, Member of the Harpers (Renown 3+)',
    '1000.0',
    '45.0',
    'Empower',
    'Comes with 1 hireling. See book for description.',
    '- The Harper Hideout''s location can be changed as written by expending 1000 GP and 45 DTP
- For the Empower: Harper Training order, the die rolled is a d6.
- If the Empower: Harper Training order is issued in downtime, only you and other PCs of the same shared set of Bastions can benefit from its effect. The other PCs must expend 7 DTP to gain this benefit.
- If the Empower: Harper Training order is issued during an adventure, you and any PC in the facility can benefit from its effect.',
    14.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '623f1d6c-2f8e-551e-810b-177702e8cbe4'::uuid,
    'BAS_0015',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Library',
    ARRAY['DMG2024']::text[],
    'Roomy (16 sq)',
    'Level 5+',
    '1000.0',
    '45.0',
    'Research',
    'Comes with 1 hireling. See book for description.

Craftable Magic Items Types:
- Scroll',
    'The information obtained from the Research order must be overseen by a DM.',
    15.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '64d0f19f-813e-5e9d-97f1-f7f3f263c985'::uuid,
    'BAS_0016',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Red Wizard Necropolis',
    ARRAY['FRHOF']::text[],
    'Roomy (16 sq)',
    'Level 5+, ability to use a Spellcasting Focus, Member of the Red Wizards (Renown 3+)',
    '1000.0',
    '45.0',
    'Recruit',
    'Comes with 1 hireling. See book for description.',
    NULL,
    16.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '33ef474a-9b7d-5113-9949-e63432fa61bb'::uuid,
    'BAS_0017',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Rookery',
    ARRAY['RHW']::text[],
    'Cramped (4 sq)',
    'Level 5+',
    '500.0',
    '20.0',
    'Craft',
    'Comes with 1 hireling. See book for description.',
    'For the Craft: Mist Talisman order, you must expend an additional 21 DTP beyond the DTP used for the Bastion Turn to craft a Mist Talisman. This additional DTP must be expended even if this order is issued during an adventure and this order is considered to provide a lasting benefit (requiring expending 7 DTP to take the Bastion Turn even during an adventure).',
    17.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    'c676011a-f003-5a1e-be5e-bef78b60af88'::uuid,
    'BAS_0018',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Sanctuary',
    ARRAY['DMG2024']::text[],
    'Roomy (16 sq)',
    'Level 5+, ability to use a Holy Symbol or Druidic Focus as a Spellcasting Focus',
    '1000.0',
    '45.0',
    'Craft',
    'Comes with 1 hireling. See book for description.

Craftable Magic Items Types:*
- Rod
- Staff
- Wand
- Wondrous item that requires attunement by a Cleric, Druid, Paladin, or Ranger

* Can''t be used for crafting items that require attunement by only an Artificer, Bard, Sorcerer, Warlock, or Wizard',
    '- If you take a Bastion Turn while physically present at your Bastion, you gain the benefits of Sanctuary Charm without needing to expend any additional DTP.  You must otherwise expend 1 DTP to gain the benefits of Sanctuary Charm in downtime while present at the Bastion. You don''t need to expend this DTP during an adventure.
- Only in character days that pass as part of an adventure count against the duration of Sanctuary Charm as determined by the DM.
- For the Craft: Sacred Focus order, crafting the item requires no additional DTP beyond taking the Bastion Turn and costs no money.',
    18.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '21363aec-4b22-59c0-bda6-d3224359c5a0'::uuid,
    'BAS_0019',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Séance Parlor',
    ARRAY['RHW']::text[],
    'Cramped (4 sq)',
    'Level 5+',
    '500.0',
    '20.0',
    'Craft',
    'Comes with 1 hireling. See book for description.',
    '- If you take a Bastion Turn while physically present at your Bastion, you gain the benefits of Speak with Dead without needing to expend any additional DTP.  You must otherwise expend 3 DTP to gain the benefits of Speak with Dead in downtime while present at the Bastion. You don''t need to expend this DTP during an adventure.
- Speak with Dead can only be used during an adventure or as overseen by a DM.',
    19.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '69c41f89-a4e1-58a5-8242-bef7910855db'::uuid,
    'BAS_0020',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Smithy',
    ARRAY['DMG2024']::text[],
    'Roomy (16 sq)',
    'Level 5+',
    '1000.0',
    '45.0',
    'Craft',
    'Comes with 2 hirelings. See book for description.

Craftable Magic Items Types:           
- Ammunition
- Armor
- Weapon     ',
    '- For the Craft: Smith''s Tools order, the crafted item can be any item in Equipment that has Smith''s Tools as its requirement. The facility''s hirelings can craft the item even if you don''t have the associated tool proficiency, though you must still expend gold and DTP as normal.
- For the Craft: Magic Item order (must be level 9+), the crafted magic item can be any T0 or T1 item in the Rolled or Select Loot categories of the listed Craftable Magic Item Types (ignore rarity and theme). This facility''s hireling can craft the item even if you don''t have the associated tool proficiency, though you must still expend gold and DTP as normal. If the item allows one to cast any spells or has specific attunement restrictions, you must craft the item yourself.',
    20.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    'b4c6d9c0-03a2-5a9b-aa8e-d787d8504ded'::uuid,
    'BAS_0021',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Storehouse',
    ARRAY['DMG2024']::text[],
    'Roomy (16 sq)',
    'Level 5+',
    '1000.0',
    '45.0',
    'Trade',
    'Comes with 1 hireling. See book for description.',
    '- For the Trade: Goods order, any nonmagical goods acquired must be in the Equipment sheet.
- For the Trade: Goods order, any nonmagical goods sold from the Storehouse fetch prices as per the Buying and Selling downtime activity (ignore percentage markup)',
    21.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    'b92a589d-9d9f-5e4f-bd68-8232eb0c34ee'::uuid,
    'BAS_0022',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Zhentarim Travel Station',
    ARRAY['FRHOF']::text[],
    'Vast (36 sq)',
    'Level 5+, Member of the Zhentarim (Renown Score 3+)',
    '3000.0',
    '125.0',
    'Research',
    'Comes with 2 hirelings. See book for description.',
    '- The benefit of Long-Distance Travel Speed can only be used during an adventure.
- The Research: Reconnaissance order can only be used during an adventure.',
    22.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '31f86108-5f3d-5de1-a50b-122c3b46b863'::uuid,
    'BAS_0023',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Workshop',
    ARRAY['DMG2024']::text[],
    'Roomy (16 sq)',
    'Level 5+',
    '1000.0',
    '45.0',
    'Craft',
    'Comes with 3 hirelings. See book for description.

Craftable Magic Item Types:
- Ring
- Wondrous item that doesn''t require attunement by only a Bard, Cleric, Druid, Paladin, Ranger, Sorcerer, Warlock, or Wizard',
    '- For the Craft: Adventuring Gear order, the crafted item can be any item in Equipment that has one of the chosen tool proficiencies as its requirement. The facility''s hirelings can craft the item even if you don''t have the associated tool proficiency, though you must still expend gold and DTP as normal.
- For the Craft: Magic Item order (must be level 9+), the crafted magic item can be any T0 or T1 item in the Rolled or Select Loot categories of the listed Craftable Magic Item Types (ignore rarity and theme). This facility''s hireling can craft the item even if you don''t have the associated tool proficiency (provided the facility has one of the tools you selected), though you must still expend gold and DTP as normal. If the item allows one to cast any spells or has specific attunement restrictions, you must craft the item yourself.
- Can be expanded to Vast as written by expending 2000 GP and 80 DTP and also gaining 2 additional hirelings and 3 additional listed Aristan''s Tools as listed.
- If you take a Bastion Turn while physically present at your Bastion, you gain Heroic Inspiration without needing to expend any additional DTP.  You must otherwise expend 1 DTP to gain Heroic Inspiration in downtime while present at the Bastion. You don''t need to expend this DTP during an adventure.',
    23.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '99b9631f-83c0-597d-b6ac-d764fec0ba51'::uuid,
    'BAS_0024',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Ancient Altar',
    ARRAY['RHW']::text[],
    'Cramped (4 sq)',
    'Level 9+',
    '500.0',
    '20.0',
    'Empower',
    'Comes with 1 hireling. See book for description.',
    '- A blood sacrifice as part of the Empower order for this facility can only be taken as overseen by a DM
- Only in character days that pass as part of an adventure count against the duration of Blasphemous Charm as determined by the DM.',
    24.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '5da52e13-d8cb-5dfd-91fe-79193239ad54'::uuid,
    'BAS_0025',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Emerald Enclave Grove',
    ARRAY['FRHOF']::text[],
    'Vast (36 sq)',
    'Level 9+, Member of the Emerald Enclave (Renown Score 3+)',
    '3000.0',
    '125.0',
    'Recruit',
    'Comes with 2 hirelings. See book for description.',
    '- For the Recruit: Creature of Nature order, the die rolled is a d6.
- Creatures recruited from this facility cannot be traded or sold as they are sapient.',
    25.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '8dba802f-dec9-5110-8c3f-3f0803c2dae8'::uuid,
    'BAS_0026',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Gaming Hall',
    ARRAY['DMG2024']::text[],
    'Vast (36 sq)',
    'Level 9+',
    '3000.0',
    '125.0',
    'Trade',
    'Comes with 4 hirelings. See book for description.',
    'For the Trade: Gambling Hall order, roll and log the result in #downtime-logs under the associated log for taking a Bastion Turn.',
    26.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '06672efd-6ad3-5199-a382-4e4d668b377c'::uuid,
    'BAS_0027',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Greenhouse',
    ARRAY['DMG2024']::text[],
    'Roomy (16 sq)',
    'Level 9+',
    '1000.0',
    '45.0',
    'Harvest',
    'Comes with 1 hireling. See book for description.

Craftable Magic Items Types:
- Potion',
    '- If you take a Bastion Turn while physically present at your Bastion, you gain the benefits of Fruit of Restoration without needing to expend any additional DTP.  You and the recipient of the fruit must otherwise expend 1 DTP each to gain the benefits of Fruit Restoration (for all 3 fruits) in downtime while present at the Bastion. You don''t need to expend this DTP during an adventure.
- For the Harvest: Healing Herbs or Poison order, collecting the items requires no additional DTP beyond taking the Bastion Turn and costs no money.',
    27.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '7e26d8f1-c430-5e34-a4ca-bb740f35bba2'::uuid,
    'BAS_0028',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Infirmary',
    ARRAY['RHW']::text[],
    'Roomy (16 sq)',
    'Level 9+, proficiency in the Medicine skill',
    '1000.0',
    '45.0',
    'Craft',
    'Comes with 2 hirelings. See book for description.',
    '- In character days that pass as part of an adventure count against the duration of an enhanced Antitoxin as determined by the DM. Each real life day that passes while the character is not adventuring as part of a multisession or campaign also counts towards this time.                                        
- The Craft: Enhanced Potion of Healing order requires 7 DTP to take (in addition to the 7 DTP for taking a Bastion Turn).
- Can be expanded to Vast as written by expending 2000 GP and 80 DTP',
    28.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '8c9f636c-fa04-5098-9030-dd0b5784c931'::uuid,
    'BAS_0029',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Kundarak Vault',
    ARRAY['EFA']::text[],
    'Cramped (4 sq)',
    'Level 9+, Renown Score 15+ with House Kundarak',
    '500.0',
    '20.0',
    'Trade',
    'Comes with 1 hireling. See book for description.',
    '- This Special Facility can only be used if your Bastion is in Khorvaire or another region in Eberron with dragonmarked houses present.
- For the Trade: Goods order, any nonmagical goods acquired must be in the Equipment sheet.
- For the Trade: Goods order, any nonmagical goods sold from the facility fetch prices as per the Buying and Selling downtime activity (ignore percentage markup).',
    29.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '3a95b17d-1e88-5be9-95af-b327272cb14e'::uuid,
    'BAS_0030',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Laboratory',
    ARRAY['DMG2024']::text[],
    'Roomy (16 sq)',
    'Level 9+',
    '1000.0',
    '45.0',
    'Craft',
    'Comes with 1 hireling. See book for description.

Craftable Magic Items Types:
- Potion',
    '- For the Craft: Alchemist''s Supplies order, the crafted item can be any item in Equipment that has Alchemist''s Supplies as its requirement. The facility''s hirelings can craft the item even if you don''t have the associated tool proficiency, though you must still expend gold and DTP as normal.
- For the Craft: Poison order, collecting the poison requires no additional DTP beyond taking the Bastion Turn and costs GP equal to half the listed poison''s price.',
    30.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '734cecd6-837e-5155-bfe6-415c681fa25a'::uuid,
    'BAS_0031',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Lords'' Alliance Noble Residence',
    ARRAY['FRHOF']::text[],
    'Vast (36 sq)',
    'Level 9+, Member of the Lords'' Alliance (Renown Score 3+)',
    '3000.0',
    '125.0',
    'Recruit',
    'Comes with 1 hireling. See book for description.',
    '- For the Recruit: Visiting Noble order, the die rolled is a d6.
- If you take a Bastion Turn while physically present at your Bastion, you gain Heroic Inspiration without needing to expend any additional DTP.  You must otherwise expend 1 DTP to gain Heroic Inspiration in downtime while present at the Bastion. You don''t need to expend this DTP during an adventure.',
    31.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '88636486-2b54-560e-9a99-f2ea684c55a7'::uuid,
    'BAS_0032',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Navigator''s Helm',
    ARRAY['EFA']::text[],
    'Cramped (4 sq)',
    'Level 9+',
    '500.0',
    '20.0',
    'Empower',
    'Comes with 1 hireling. See book for description.',
    '- A water vehicle can be built into a mobile Bastion with this facility. The vehicle''s cost to acquire must be paid separately.
- Besides taking a Bastion Turn to travel as written, a mobile Bastion can be used as a vehicle as normal to travel during an adventure or in downtime as per the Traveling downtime activity.',
    32.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '80721ffe-e0e7-5b7d-8136-f2635143eff8'::uuid,
    'BAS_0033',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Orien Helm',
    ARRAY['EFA']::text[],
    'Cramped (4 sq)',
    'Level 9+, Renown Score 15+ with House Orien',
    '500.0',
    '20.0',
    'Empower',
    'Comes with 1 hireling. See book for description.',
    '- A Lightning Rail can be built into a mobile Bastion with this Special Facility. This can only be used as a Bastion in Khorvaire or another region in Eberron with dragonmarked houses present.
- This Special Facility can only be used if your Bastion is in Khorvaire or another region in Eberron with dragonmarked houses present.
- Besides taking a Bastion Turn to travel as written, a mobile Bastion can be used as a vehicle as normal to travel during an adventure or in downtime as per the Traveling downtime activity.',
    33.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '86350067-7f7c-5cbf-a8cd-9c14e3b847be'::uuid,
    'BAS_0034',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Sacristy',
    ARRAY['DMG2024']::text[],
    'Roomy (16 sq)',
    'Level 9+, ability to use a Holy Symbol or Druidic Focus as a Spellcasting Focus',
    '1000.0',
    '45.0',
    'Craft',
    'Comes with 1 hireling. See book for description.

Craftable Magic Items Types:*
- Rod
- Staff
- Wand
- Wondrous item that requires attunement by a Cleric, Druid, Paladin, or Ranger

* Can''t be used for crafting items that require attunement by only an Artificer, Bard, Sorcerer, Warlock, or Wizard',
    '- For the Craft: Holy Water order,  crafting the item requires no additional DTP beyond taking the Bastion Turn and requires no additional GP beyond what is written. You cannot sell or trade Holy Water crafted in this way.
- For the Craft: Magic Item order, the crafted magic item can be any T0 or T1 item in the Rolled or Select Loot categories of the listed Craftable Magic Item Types (ignore rarity and theme). This facility''s hireling can craft the item even if you don''t have the associated tool proficiency, though you must still expend gold and DTP as normal. If the item allows one to cast any spells or has specific attunement restrictions, you must craft the item yourself.
- Spell Refreshment can only be used during an adventure and costs no DTP.',
    34.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '0b296453-7f2f-5192-b5f3-bb5077a47086'::uuid,
    'BAS_0035',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Scriptorium',
    ARRAY['DMG2024']::text[],
    'Roomy (16 sq)',
    'Level 9+',
    '1000.0',
    '45.0',
    'Craft',
    'Comes with 1 hireling. See book for description.

Craftable Magic Items Types:
- Scroll',
    '- For the Craft: Book Replica order, replicating a book requires no additional DTP beyond taking the Bastion Turn and requires a blank Book as well as a Book to be replicated.
- For the Craft: Spell Scroll order, you must expend gold and DTP as listed for Scribing a Spell Scroll of the associated level to be made. The scroll created uses the statistics of a spell scroll as described in the Dungeon Master''s Guide and can be traded as normal. 
- For the Craft: Paperwork order, creating the copies requires no additional DTP beyond taking the Bastion Turn and requires no additional GP beyond what is written.',
    35.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    'fa152767-4043-5857-86e0-f4e300d4736a'::uuid,
    'BAS_0036',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Stable',
    ARRAY['DMG2024']::text[],
    'Roomy (16 sq)',
    'Level 9+',
    '1000.0',
    '45.0',
    'Trade',
    'Comes with 1 hireling. A Bastion can have more than one Stable. See book for description.',
    '- For the Trade: Animals order, any mounts acquired must be in the Equipment sheet. The available mounts depends on the Bastion''s location.
- For the Trade: Animals order, any mounts sold from the Storehouse fetch prices as per the Buying and Selling downtime activity (ignore percentage markup). You cannot sell sapient mounts.
- Can be expanded to Vast as written by expending 2000 GP and 80 DTP',
    36.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    'cb25afc4-01bf-5a5d-b97f-f66038c22de4'::uuid,
    'BAS_0037',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Teleportation Circle',
    ARRAY['DMG2024']::text[],
    'Roomy (16 sq)',
    'Level 9+',
    '1000.0',
    '45.0',
    'Recruit',
    'Comes with 1 hireling. See book for description.',
    '- The inscribed Teleportation Circle cannot be dispelled.
- For the Recruit: Spellcaster order, the die rolled is a d6. Additionally, the invited spellcaster has a spellcasting ability modifier of +3 and a spell save DC of 14 for purposes of spells they cast. When you reach level 17, the invited spellcaster has a spellcasting ability modifier of +5 and a spell save DC of 17 for purposes of spells they cast.
- A spell cast by the invited spellcaster requires no additional DTP beyond taking the Bastion Turn, though you must still pay for any costly components. The invited spellcaster cannot cast the Clone or Simulacrum spell on your behalf ',
    37.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '61baee06-4010-54fd-a787-57e77c6b5f29'::uuid,
    'BAS_0038',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Theater',
    ARRAY['DMG2024']::text[],
    'Vast (36 sq)',
    'Level 9+',
    '3000.0',
    '125.0',
    'Empower',
    'Comes with 4 hirelings. See book for description.',
    'The Empower: Theatrical Event order can only be used during an adventure.',
    38.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '3cacfd22-727c-50e4-86f7-42268d063466'::uuid,
    'BAS_0039',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Order of the Gauntlet Tournament Field',
    ARRAY['FRHOF']::text[],
    'Vast (36 sq)',
    'Level 9+, Member of the Order of the Gauntlet (Renown Score 3+)',
    '3000.0',
    '125.0',
    'Empower',
    'Comes with 1 hireling. See book for description.',
    'For the Empower: Hold Tournament order, you must expend an additional 7 DTP beyond the DTP used for the Bastion Turn to host the tournament (in addition to expending 2000 GP). This additional DTP must be expended even if this order is issued during an adventure and this order is considered to provide a lasting benefit (requiring expending 7 DTP to take the Bastion Turn even during an adventure).',
    39.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    'fd4cf500-324d-5478-84ae-fffab486b616'::uuid,
    'BAS_0040',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Training Area',
    ARRAY['DMG2024']::text[],
    'Vast (36 sq)',
    'Level 9+',
    '3000.0',
    '125.0',
    'Empower',
    'Comes with 4 hirelings. A Bastion can have more than one Training Area. See book for description.',
    '- For the Empower: Training order, only in character days that pass as part of an adventure count against the duration of effect as determined by the DM.
- If the Empower: Training order is issued in downtime, only you and other PCs of the same shared set of Bastions can benefit from its effect. The other PCs must expend 7 DTP to gain this benefit.
- If the Empower: Training order is issued during an adventure, you and any PC in the facility can benefit from its effect.',
    40.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    'ba73f360-74ad-50fc-a32d-fce8eb1b0a32'::uuid,
    'BAS_0041',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Trophy Room',
    ARRAY['DMG2024']::text[],
    'Roomy (16 sq)',
    'Level 9+',
    '1000.0',
    '45.0',
    'Research',
    'Comes with 1 hireling. See book for description.',
    '- The information obtained from the Research: Lore order must be overseen by a DM.
- For the Research: Trinket Trophy order, the die rolled is a d6. The obtained magic item is a random T0 item (ignore the table): roll for it in #treasure-log (/hgenloot 1 [your PC''s level] force_t0 True) and link to the result in the downtime log.',
    41.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    'a2463079-2558-58bf-b5ca-c517606c595f'::uuid,
    'BAS_0042',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Archive',
    ARRAY['DMG2024']::text[],
    'Roomy (16 sq)',
    'Level 13+',
    '3000.0',
    '85.0',
    'Research',
    'Comes with 1 hireling. See book for description.',
    '- The information obtained from the Research: Helpful Lore order must be overseen by a DM.
-  Can be expanded to Vast as written by expending 6000 GP and 160 DTP',
    42.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    'a042b51e-da26-5362-8386-9dea83d50518'::uuid,
    'BAS_0043',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Cult of the Dragon Archive',
    ARRAY['FRHOF']::text[],
    'Roomy (16 sq)',
    'Level 13+, Member of the Cult of the Dragon (Renown Score 3+)',
    '3000.0',
    '85.0',
    'Research',
    'Comes with 1 hireling. See book for description.',
    '- The information obtained from the Research: Helpful Lore order must be overseen by a DM.
-  Can be expanded to Vast as written by expending 6000 GP and 160 DTP',
    43.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '0be3cfd8-93a1-5637-b7fd-3f0ce65ff125'::uuid,
    'BAS_0044',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Artificer''s Forge',
    ARRAY['EFA']::text[],
    'Roomy (16 sq)',
    'Level 13+, ability to use Artisan''s Tools as a Spellcasting Focus',
    '3000.0',
    '85.0',
    'Craft',
    'Comes with 2 hirelings. See book for description.

Craftable Magic Items Types:*
- Any

* Can''t be used for crafting items that require attunement by only a Cleric, Druid, Paladin, or Ranger',
    '- Whenever you craft a magic item using the rules in Allowed Content (Downtime), the Crafting Assistants can reduce the base DTP cost to craft the item by either one half or two thirds of the normal base DTP cost (round up for the DTP cost after applying the reduction).
- For the Craft: Magic Item order, the crafted magic item can be any T0 or T1 item in the Rolled or Select Loot categories of the listed Craftable Magic Item Types (ignore rarity). This facility''s hirelings can craft the item even if you don''t have the associated tool proficiency, though you must still expend gold and DTP as normal. If the item has specific attunement restrictions, it must be an item that could be attuned to by an Artificer, Bard, Sorcerer, Warlock, or Wizard. The base DTP cost to craft the item this way is halved (round up) as the two hirelings work together.',
    44.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '97c50ff2-1965-5af7-a798-aff3e4d92a21'::uuid,
    'BAS_0045',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Inquisitive Agency',
    ARRAY['EFA']::text[],
    'Roomy (16 sq)',
    'Level 13+',
    '3000.0',
    '85.0',
    'Craft',
    'Comes with 1 hireling. See book for description.',
    'The information obtained from the Research: Information Gathering order must be overseen by a DM.',
    45.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '439704a3-1bb6-5d41-96f8-10ceb8cdd4c1'::uuid,
    'BAS_0046',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Lightning Generator',
    ARRAY['RHW']::text[],
    'Roomy (16 sq)',
    'Level 13+',
    '3000.0',
    '85.0',
    'Empower',
    'Comes with 1 hireling. See book for description.',
    '- Only in character days that pass as part of an adventure count against the duration of Charm of Electromancy as determined by the DM.
- In character days that pass as part of an adventure count against the duration of Lightning Life as determined by the DM. Each real life day that passes while the character is not adventuring as part of a multisession or campaign also counts towards this time. Additionally, only one instance of Lightning Life can be active at a time and the time also expires the next time you take a Bastion Turn.   ',
    46.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '44bbcf29-c9f9-5ae6-8a76-497c7aca7800'::uuid,
    'BAS_0047',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Lyrandar Helm',
    ARRAY['EFA']::text[],
    'Cramped (4 sq)',
    'Level 13+, Renown Score 25+ with House Lyrandar',
    '1500.0',
    '40.0',
    'Empower',
    'Comes with 1 hireling. See book for description.',
    '- An elemental air vehicle can be built into a mobile Bastion with this facility. The vehicle''s cost to acquire must be paid separately.
- A reflavored version of this Special Facility can also be used with other air vehicles as built into a mobile Bastion. The vehicle''s cost to acquire must be paid separately. Instead of Renown with House Lyrandar, the facility''s prerequisite instead is Renown Score 25+ with a group with access to and the ability to create airships, such as the community of Halruaa, the community of New Nivix, etc. (Renown with House Lyrandar can still also satisfy this prerequisite)
- A reflavored version of this Special Facility can also be used with space vehicles as built into a mobile Bastion. The vehicle''s cost to acquire must be paid separately. Instead of Renown with House Lyrandar, the facility''s prerequisite instead is Renown Score 25+ with a group with access to and the ability to create space vehicles, such as the community of New Nivix, the community of the Rock of Bral, the United Universe Coalition, etc.
- Besides taking a Bastion Turn to travel as written, a mobile Bastion can be used as a vehicle as normal to travel during an adventure or in downtime as per the Traveling downtime activity.',
    47.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '82ea6ba8-d61f-5ca8-981f-1b870ef6e523'::uuid,
    'BAS_0048',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Manifest Zone',
    ARRAY['EFA']::text[],
    'Vast (36 sq)',
    'Level 13+, ability to use a Spellcasting Focus',
    '9000.0',
    '245.0',
    'Empower',
    'Comes with 1 hireling. See book for description.',
    '- If you take a Bastion Turn while physically present at your Bastion, you gain the benefits of the Manifest Charm without needing to expend any additional DTP.  You must otherwise expend 1 DTP to gain the benefits of the Manifest Charm in downtime while present at the Bastion. You don''t need to expend this DTP during an adventure.
- If your Bastion exists outside of Eberron, the associated planes can be reflavored as follows: Mechanus (instead of Daanvi), the Shadowfell (instead of Dolurrh), the Elemental Plane of Fire (instead of Fernia), the Positive Plane (instead of Irian), the Beastlands (instead of Lamannia), the Negative Plane (instead of Mabar), the Elemental Plane of Water (instead of Risia), Acheron (instead of Shavarath), Mount Celestia (instead of Syrania), the Feywild (instead of Thelanis), and the Far Realm (instead of Xoriat).',
    48.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '79878f34-d7f3-5f0e-8891-446485c76f1d'::uuid,
    'BAS_0049',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Meditation Chamber',
    ARRAY['DMG2024']::text[],
    'Cramped (4 sq)',
    'Level 13+',
    '1500.0',
    '40.0',
    'Empower',
    'Comes with 1 hireling. See book for description.',
    '- The Empower: Inner Peace order can only be issued during an adventure or as overseen by a DM.
- If you take a Bastion Turn while physically present at your Bastion, you gain the benefits of Fortify Self without needing to expend any additional DTP.  You must otherwise expend 7 DTP to gain the benefits of Fortify Self in downtime while present at the Bastion. You don''t need to expend this DTP during an adventure. 
- Only in character days that pass as part of an adventure count against the duration of Fortify Self as determined by the DM.',
    49.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '04188ed4-f467-510a-807d-2b4c4740dfe1'::uuid,
    'BAS_0050',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Menagerie',
    ARRAY['DMG2024']::text[],
    'Vast (36 sq)',
    'Level 13+',
    '9000.0',
    '245.0',
    'Recruit',
    'Comes with 2 hirelings. See book for description.',
    'For the Recruit: Creature order, you can recruit other Beasts and Monstrosities besides the listed options with costs as according to the second table. The recruited creature can be any non-sapient Beast or Monstrosity of your choice that is CR 3 or less in Fair Game in the Monsters sheet. (If a monster can speak one or more languages, has telepathy, or has an alignment other than unaligned, it is considered to be sapient) A Beast or Monstrosity that is CR 2 or higher and that has a Fly Speed is considered to be T3 for purposes of acquisition and trade.',
    50.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    'd4fe85bb-fb8d-5e80-affc-ae23f4a8fad9'::uuid,
    'BAS_0051',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Museum',
    ARRAY['EFA']::text[],
    'Roomy (16 sq)',
    'Level 13+',
    '3000.0',
    '85.0',
    'Research',
    'Comes with 1 hireling. See book for description.',
    '- The information obtained from the Research: Specialized Lore order must be overseen by a DM.
- If you take a Bastion Turn while physically present at your Bastion, you gain the benefits of the an associated Charm without needing to expend any additional DTP.  You must otherwise expend 7 DTP to gain the benefits of the associated Charm in downtime while present at the Bastion. You don''t need to expend this DTP during an adventure.
- Only in character days that pass as part of an adventure count against the duration of the associated Charm as determined by the DM.
- Can be expanded to Vast as written by expending 6000 GP and 160 DTP',
    51.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '9eb0aabc-2c9e-5a43-9ee1-3c9cdb4e3de1'::uuid,
    'BAS_0052',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Observatory',
    ARRAY['DMG2024']::text[],
    'Roomy (16 sq)',
    'Level 13+, ability to use a Spellcasting Focus',
    '3000.0',
    '85.0',
    'Empower',
    'Comes with 1 hireling. See book for description.',
    '- If you take a Bastion Turn while physically present at your Bastion, you gain the benefits of Observatory Charm without needing to expend any additional DTP.  You must otherwise expend 1 DTP to gain the benefits of Observatory Charm in downtime while present at the Bastion. You don''t need to expend this DTP during an adventure.
- Only in character days that pass as part of an adventure count against the duration of Observatory Charm as determined by the DM.
- For the Empower: Eldritch Discovery order, the die rolled is a d6. ',
    52.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '0ea56fa3-9618-5b1e-8f41-f1bcda2c8f35'::uuid,
    'BAS_0053',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Pub',
    ARRAY['DMG2024']::text[],
    'Roomy (16 sq)',
    'Level 13+',
    '3000.0',
    '85.0',
    'Research',
    'Comes with 1 hireling. See book for description.',
    '- The information obtained from the Research: Information Gathering order must be overseen by a DM.
- If you take a Bastion Turn while physically present at your Bastion, you gain the benefits of Pub Special without needing to expend any additional DTP.  You must otherwise expend 1 DTP to gain the benefits of Pub Special in downtime while present at the Bastion. You don''t need to expend this DTP during an adventure.
- Only in character hours that pass as part of an adventure count against the duration of Pub Special as determined by the DM.
-  Only you and other PCs of the same shared set of Bastions can benefit from Pub Special in downtime. Any creature can gain its benefit during an adventure.
-  Can be expanded to Vast as written by expending 6000 GP and 160 DTP. A Vast pub gains 3 extra hirelings and can have up to 2 magical beverages on tap at a time.',
    53.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '3b327392-759a-52c2-9b8a-f3f210acfbc8'::uuid,
    'BAS_0054',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Reliquary',
    ARRAY['DMG2024']::text[],
    'Cramped (4 sq)',
    'Level 13+, ability to use a Holy Symbol or Druidic Focus as a Spellcasting Focus',
    '1500.0',
    '40.0',
    'Harvest',
    'Comes with 1 hireling. See book for description.',
    '- If you take a Bastion Turn while physically present at your Bastion, you gain the benefits of Reliquary Charm without needing to expend any additional DTP.  You must otherwise expend 1 DTP to gain the benefits of Reliquary Charm in downtime while present at the Bastion. You don''t need to expend this DTP during an adventure.
- Only in character days that pass as part of an adventure count against the duration of Reliquary Charm as determined by the DM.
- For the Harvest: Talisman order, harvesting the item requires no additional DTP beyond taking the Bastion Turn and costs no money.',
    54.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    'ffc20532-0527-5163-9cb8-5adcd5b72769'::uuid,
    'BAS_0055',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Spirit Vault',
    ARRAY['RHW']::text[],
    'Roomy (16 sq)',
    'Level 13+',
    '3000.0',
    '85.0',
    'Research',
    'Comes with 1 hireling. See book for description.',
    '- If you take a Bastion Turn while physically present at your Bastion, you gain the benefits of Esoteric Knowledge without needing to expend any additional DTP.  You must otherwise expend 1 DTP to gain the benefits of Esoteric Knowledge in downtime while present at the Bastion. You don''t need to expend this DTP during an adventure.
- Only in character days that pass as part of an adventure count against the duration of Esoteric Knowledge as determined by the DM.
- The Research: Ask the Occult order can only be issued during an adventure or as overseen by a DM.',
    55.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    'f04dfc1f-0bca-563e-9666-fbc5c571aefb'::uuid,
    'BAS_0056',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Construct Forge',
    ARRAY['EFA']::text[],
    'Vast (36 sq)',
    'Level 17+, ability to use Artisan''s Tools as a Spellcasting Focus',
    '15000.0',
    '245.0',
    'Recruit',
    'Comes with 2 hirelings. See book for description.',
    '-  A Construct Forge in a Bastion in Khorvaire or another region in Eberron with dragonmarked houses present can’t be used to create Warforged Titans.
- For purposes of acquisition and trades, treat a Helmed Horror as T2, a Shield Guardian as T3, and a Warforged Titan as T4.
- A Shield Guardian created by this facility has an associated amulet as described in the Monster Manual. The amulet is an object with AC 10, 10 HP, Immunity to Poison and Psychic damage, and if it is destroyed, a replacement amulet for that Shield Guardian can be crafted using 7 DTP and 1,000 GP in components.',
    56.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    'f06946ad-0596-5994-9819-c678b59f348a'::uuid,
    'BAS_0057',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Demiplane',
    ARRAY['DMG2024']::text[],
    'Vast (36 sq)',
    'Level 17+, ability to use an Arcane Focus or tool as a Spellcasting Focus',
    '15000.0',
    '245.0',
    'Empower',
    'Comes with 1 hireling. See book for description.',
    '- The Empower: Arcane Resilience order can only be issued during an adventure.
- You must expend 1 DTP to use Fabrication. This DTP must be expended even if used during an adventure.
- The object created via Fabrication must be present in the Equipment sheet in addition to the listed requirements.',
    57.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    'dcc5623e-95b2-54b2-a33c-767e9a7b2cf5'::uuid,
    'BAS_0058',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Guildhall',
    ARRAY['DMG2024']::text[],
    'Vast (36 sq)',
    'Level 17+, Expertise in a skill',
    '15000.0',
    '245.0',
    'Recruit',
    'Comes with 1 hireling. See book for description.',
    '- For the Adventurers'' Guild assignment, the Beast can be any Beast in Fair Game that is CR 2 or less.
- For the Masons'' Guild assignment, you can add up to 7 5-foot squares of Defensive Walls as part of the Bastion Turn with no additional DTP cost and costing no money. Only other PCs of the same shared set of Bastions can receive Defensive Walls in this way during downtime.
- For the Shipbuilders'' Guild assignment, any air, space, or water vehicle listed in the Equipment sheet can be made. You pay half the cost of the vehicle and the construction takes an amount of DTP equal to the vehicle''s full cost divided by 1000 (round up, minimum 1). Additionally, your Bastion must be located in a coastal location to construct any water vehicles. Your Bastion must be open to air or space to construct any air or space vehicles.
- For the Thieves'' Guild assignment, the object must be present in the Equipment sheet and have a value no greater than 500 GP in addition to the listed requirements.',
    58.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    'f6beb351-3937-53fd-b844-53e3d6f3f2cf'::uuid,
    'BAS_0059',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Liminal Space',
    ARRAY['RHW']::text[],
    'Vast (36 sq)',
    'Level 17+',
    '15000.0',
    '245.0',
    'Recruit',
    'Comes with 1 hireling. See book for description.',
    '- If you take a Bastion Turn while physically present at your Bastion, you can gain the benefits of Dark Bargains without needing to expend any additional DTP. You must otherwise expend 7 DTP to gain the benefits of Dark Bargains in downtime while present at the Bastion. You don''t need to expend this DTP during an adventure.
- You can only retain the benefit of the Dark Gift feat from Dark Bargains while you have this Bastion Facility and satisfy its prerequisite.
- If you already have the chosen Dark Gift feat from Dark Bargains as a Dark Gift feat, you only gain the benefit of one at a time. 
- The Dark Gift feat you gain from Dark Bargains can’t be replaced by any means except by use of Dark Bargains again.
- The Dark Gift feat you gain from Dark Bargains isn’t a Dark Gift (Supernatural Reward) as in Allowed Content: Other Rewards (Dark Gifts) and doesn’t count against the limit of 1 Dark Gift (Supernatural Reward) at a time.',
    59.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    'cbd21315-db67-5c14-95d0-bf5f5734841e'::uuid,
    'BAS_0060',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'Sanctum',
    ARRAY['DMG2024']::text[],
    'Roomy (16 sq)',
    'Level 17+, ability to use a Holy Symbol or Druidic Focus as a Spellcasting Focus',
    '5000.0',
    '85.0',
    'Empower',
    'Comes with 4 hirelings. See book for description.',
    '- If you take a Bastion Turn while physically present at your Bastion, you gain the benefits of Sanctum Charm without needing to expend any additional DTP.  You must otherwise expend 1 DTP to gain the benefits of Sanctum Charm in downtime while present at the Bastion. You don''t need to expend this DTP during an adventure.
- Only in character days that pass as part of an adventure count against the duration of Sanctum Charm as determined by the DM.',
    60.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    'e1a467ba-7b36-5621-89ed-d7d703637e83'::uuid,
    'BAS_0061',
    'a3c9d4e5-f6a7-4182-0cdb-2e3f4a5b6c7d'::uuid,
    'War Room',
    ARRAY['DMG2024']::text[],
    'Vast (36 sq)',
    'Level 17+, Fighting Style feature or Unarmored Defense feature',
    '15000.0',
    '245.0',
    'Recruit',
    'Comes with 2 or more hirelings. See book for description.',
    '- The Recruit: Soldiers order can only be issued during an adventure or as overseen by a DM.
- When you issue the Recruit: Soldiers order, you muster either 5 Army statblocks or 1 Mounted Army statblock per lieutenant ordered. Each Army costs 20 GP per day to feed and each Mounted Army costs 40 GP per day to feed. You can find these statblocks in Appendix B of the Player Guidelines. Each statblock represents a group of 20 Guards.',
    61.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '45a1ff2e-1c4a-5937-b72b-29199df68f25'::uuid,
    'BAS_0062',
    'b4dae5f6-a7b8-4293-1dec-3f4a5b6c7d8e'::uuid,
    'Closets',
    ARRAY['DMG2024']::text[],
    NULL,
    NULL,
    '0',
    '0',
    NULL,
    'Closets, washrooms, or similar enclosures as part of a Basic or Special Facility. See book for details.',
    'Closets must be inside a facility and can''t increase the facility''s area in squares.',
    62.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    'ef7b0443-59b3-5041-a28c-3f8fb9a07642'::uuid,
    'BAS_0063',
    'b4dae5f6-a7b8-4293-1dec-3f4a5b6c7d8e'::uuid,
    'Corridors, Ramps, Staircases',
    ARRAY['DMG2024']::text[],
    NULL,
    NULL,
    '0',
    '0',
    NULL,
    'Corridors, ramps, and staircases part of a Special or Basic facility leading to another facility. See book for details.',
    NULL,
    63.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '42cc30b1-77bf-5df6-b748-98234cf93693'::uuid,
    'BAS_0064',
    'b4dae5f6-a7b8-4293-1dec-3f4a5b6c7d8e'::uuid,
    'Defensive Walls',
    ARRAY['DMG2024']::text[],
    NULL,
    NULL,
    '250 GP per 5-foot square',
    '10 DTP per 5-foot square',
    NULL,
    'Defensive walls made around the exterior of a Bastion. See book for details.',
    '- A defensive wall is 20 feet high and can include a walkway on top, along with a means of access (such as a ladder or lift).
- Can''t be built as part of a mobile Bastion.',
    64.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    '48d827e2-b793-535a-a60e-1a0003163bc1'::uuid,
    'BAS_0065',
    'b4dae5f6-a7b8-4293-1dec-3f4a5b6c7d8e'::uuid,
    'Doors and Windows',
    ARRAY['DMG2024']::text[],
    NULL,
    NULL,
    '0',
    '0',
    NULL,
    'Doors and shuttered windows as part of a Basic or Special Facility. See book for details.',
    'Doors in a Bastion can be any kind of door described in chapter 3 of the 2024 Dungeon Master''s Guide, including secret doors, locked doors, and portcullises.',
    65.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_bastion (
    id, check_id, bastion_type_id, name, source, size, prerequisite,
    gp_cost, dtp_cost, bastion_order, description, notes_advice, display_order
) VALUES (
    'd7f12f42-0fd8-5554-940e-ee2ec8965d14'::uuid,
    'BAS_0066',
    'b4dae5f6-a7b8-4293-1dec-3f4a5b6c7d8e'::uuid,
    'Flying Bastion',
    ARRAY['HHB']::text[],
    NULL,
    NULL,
    '1000 GP per 5-foot square',
    '1 DTP per 5-foot square',
    NULL,
    'This is a Bastion modification that allows a Bastion to magically fly.',
    '- The listed cost is per 5-foot square taken up by a Bastion''s Basic and Special Facilities and must be expended both when turning a Bastion into a flying Bastion as well as when adding any new Basic or Special Facilities to a flying Bastion. 
- A flying Bastion requires a Navigation Orb in order to move. If a Bastion is turned into a flying Bastion without a Navigation Orb, it floats at a fixed height from 10 feet to 10 miles above the ground (chosen at the time when the modification is applied). 
- A flying Bastion can move with a Navigation Orb as written at a rate of 1 mile per hour. It can be used by the Bastion''s owner (or owners if it is a Shared Bastion) or by any hireling of the Bastion for this purpose. A flying Bastion can be used to travel during an adventure or in downtime as per the Traveling downtime activity. 
- A Navigation Orb can be keyed to an existing Flying Bastion by taking a Bastion Turn at the Bastion with the Navigation Orb present. The orb can otherwise be keyed to a Stronghold Bastion (as per the Building a Stronghold downtime activity) by expending 7 DTP with the Navigation Orb present at the location.',
    66.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    bastion_type_id = EXCLUDED.bastion_type_id,
    name = EXCLUDED.name,
    source = EXCLUDED.source,
    size = EXCLUDED.size,
    prerequisite = EXCLUDED.prerequisite,
    gp_cost = EXCLUDED.gp_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    bastion_order = EXCLUDED.bastion_order,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

-- ------------------------------------------------------------------------------
-- 6. Row Level Security
-- ------------------------------------------------------------------------------
ALTER TABLE public.ac_bastion_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ac_bastion ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them cleanly
DROP POLICY IF EXISTS "Allow public read-only access on ac_bastion_type" ON public.ac_bastion_type;
DROP POLICY IF EXISTS "Allow service role full access on ac_bastion_type" ON public.ac_bastion_type;
DROP POLICY IF EXISTS "Allow admin full access on ac_bastion_type" ON public.ac_bastion_type;
DROP POLICY IF EXISTS "Allow engineer full access on ac_bastion_type" ON public.ac_bastion_type;
DROP POLICY IF EXISTS "Allow public read access to ac_bastion_type" ON public.ac_bastion_type;
DROP POLICY IF EXISTS "Allow service_role to manage ac_bastion_type" ON public.ac_bastion_type;
DROP POLICY IF EXISTS "Admins and Engineers can manage ac_bastion_type" ON public.ac_bastion_type;

DROP POLICY IF EXISTS "Allow public read-only access on ac_bastion" ON public.ac_bastion;
DROP POLICY IF EXISTS "Allow service role full access on ac_bastion" ON public.ac_bastion;
DROP POLICY IF EXISTS "Allow admin full access on ac_bastion" ON public.ac_bastion;
DROP POLICY IF EXISTS "Allow engineer full access on ac_bastion" ON public.ac_bastion;
DROP POLICY IF EXISTS "Allow public read access to ac_bastion" ON public.ac_bastion;
DROP POLICY IF EXISTS "Allow service_role to manage ac_bastion" ON public.ac_bastion;
DROP POLICY IF EXISTS "Admins and Engineers can manage ac_bastion" ON public.ac_bastion;

-- ac_bastion_type policies
CREATE POLICY "Allow public read access to ac_bastion_type"
ON public.ac_bastion_type FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow service_role to manage ac_bastion_type"
ON public.ac_bastion_type FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins and Engineers can manage ac_bastion_type"
ON public.ac_bastion_type FOR ALL
TO authenticated
USING (
  ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
  OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
)
WITH CHECK (
  ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
  OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
);

-- ac_bastion policies
CREATE POLICY "Allow public read access to ac_bastion"
ON public.ac_bastion FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow service_role to manage ac_bastion"
ON public.ac_bastion FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins and Engineers can manage ac_bastion"
ON public.ac_bastion FOR ALL
TO authenticated
USING (
  ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
  OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
)
WITH CHECK (
  ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
  OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
);

-- ==============================================================================
-- END OF MIGRATION: 20261009_ac_bastion_normalization.sql
-- ==============================================================================
