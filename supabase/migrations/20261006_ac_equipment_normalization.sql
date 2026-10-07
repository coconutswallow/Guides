-- ==============================================================================
-- MIGRATION: 20261006_ac_equipment_normalization.sql
-- Description: Normalize public.ac_equip_type and public.ac_equipment schemas.
--              Includes check_id (EQP_0001..EQP_0495), equip_type_id foreign key,
--              multi-source TEXT[] referencing ac_sources, ruleset (2014/2024),
--              fractional display_order, handle_updated_at triggers, GIN indexing,
--              and Staff Admin & Engineer RLS policies.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Ensure Supporting Sources Exist in ac_sources
-- ------------------------------------------------------------------------------
INSERT INTO public.ac_sources (
    id, source_key, abbreviation, name, type, ruleset, allowed_content, link, display_order, check_id
) VALUES 
(
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
),
(
    'b2c3d4e5-f6a1-4b2c-9d3e-4f5a6b7c8d9e'::uuid,
    'AC',
    'AC',
    'Allowed Content',
    'Core',
    '2024',
    'All: Equipment, Spells, General Rules',
    '/Guides/allowed-content/',
    120.0,
    'SRC_0121'
)
ON CONFLICT (source_key) DO UPDATE SET
    name = EXCLUDED.name,
    abbreviation = EXCLUDED.abbreviation,
    type = EXCLUDED.type,
    updated_at = timezone('utc'::text, now());

-- ------------------------------------------------------------------------------
-- 2. Schema Setup for public.ac_equip_type
-- ------------------------------------------------------------------------------
-- Temporarily drop view if it already exists from a previous migration run
DROP VIEW IF EXISTS public.ac_equipment_categories CASCADE;
DROP TABLE IF EXISTS public.ac_equipment_categories CASCADE;

CREATE TABLE IF NOT EXISTS public.ac_equip_type (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    notes TEXT,
    display_order DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ensure display_order is DOUBLE PRECISION
ALTER TABLE public.ac_equip_type ALTER COLUMN display_order TYPE DOUBLE PRECISION USING display_order::double precision;

-- ------------------------------------------------------------------------------
-- 3. Upsert All 13 Equipment Types
-- ------------------------------------------------------------------------------
INSERT INTO public.ac_equip_type (id, name, notes, display_order)
VALUES (
    '6fce8a1e-300a-4496-983a-095a2435d7e7'::uuid,
    'Armor',
    'Armor can be resold for half price',
    1.0
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    notes = EXCLUDED.notes,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equip_type (id, name, notes, display_order)
VALUES (
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Weapons',
    'Weapon can be resold for half price',
    2.0
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    notes = EXCLUDED.notes,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equip_type (id, name, notes, display_order)
VALUES (
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Tools',
    'Tools can be resold for half price. Tools cannot be crafted.',
    3.0
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    notes = EXCLUDED.notes,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equip_type (id, name, notes, display_order)
VALUES (
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Adventuring Gear',
    'Adventuring Gear can be resold for half price',
    4.0
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    notes = EXCLUDED.notes,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equip_type (id, name, notes, display_order)
VALUES (
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    'Poisons',
    'Poisons can be resold for full price. The discount from the Crafter feat (2024) does not apply when buying Poisons.
Note that Basic Poison is considered Adventuring Gear and only fetches half price when resold (50 GP)',
    5.0
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    notes = EXCLUDED.notes,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equip_type (id, name, notes, display_order)
VALUES (
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    'Trade Goods',
    'Trade Goods can be resold for full price. The discount from the Crafter feat (2024) does not apply when buying Trade Goods. Trade Goods cannot be crafted.',
    6.0
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    notes = EXCLUDED.notes,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equip_type (id, name, notes, display_order)
VALUES (
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'Mounts',
    'A mount''s participation in an adventure is at the DM''s discretion.
A DM can use the guidelines on customizing monsters in the DM Guidelines for mounts they award.
A DM can choose to award a mount that has been awakened (such as by the Awaken spell) but the mount is then considered to be a sapient mount.
A sapient mount''s name, alignment, and personality must be written in the session log in which it is acquired.
Sapient mounts cannot be traded or sold.',
    7.0
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    notes = EXCLUDED.notes,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equip_type (id, name, notes, display_order)
VALUES (
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Vehicles',
    'Vehicles that require Crew need the listed number of skilled hirelings in order to be used, which cost 2 GP per day each
Each type of vehicle has its own associated proficiency: vehicles (air), vehicles (land), vehicles (space), or vehicles (water)',
    8.0
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    notes = EXCLUDED.notes,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equip_type (id, name, notes, display_order)
VALUES (
    'bd206c15-d3f0-4346-a7a9-60d5c56ac01d'::uuid,
    'Vehicle Upgrades',
    'Except where written otherwise, vehicle upgrades can be installed onto air, space, and water vehicles as listed in Equipment.
Vehicle upgrades can only be installed while a vehicle is berthed.',
    9.0
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    notes = EXCLUDED.notes,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equip_type (id, name, notes, display_order)
VALUES (
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    'Pets',
    'Pets can''t take the Attack or Help actions and normally can''t participate in adventures: a pet only participates in adventures otherwise with a DM''s express permission and at their discretion
A DM can submit a Rules request to award a creature not listed here as a vanity pet
Pets can also be awarded as the equivalent of a T0 Permanent item and follow the associated item distribution rules for doing so
A DM can use the guidelines on customizing monsters in the DM Guidelines for pets they award.
Sapient pets cannot be traded or sold.
A sapient pet''s name, alignment, and personality must be written in the session log in which it is acquired.
A DM can choose to award a pet that has been awakened (such as by the Awaken spell) but the pet is then considered to be a sapient pet.',
    10.0
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    notes = EXCLUDED.notes,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equip_type (id, name, notes, display_order)
VALUES (
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    'Siege Ammunition and Weapons',
    'Depending on the Siege Weapon, Siege Weapons can either be deployed as shipboard weapons or as ground based weapons such as on a field, atop a structure such as a Bastion, or as personally operated.

Siege Weapons can be resold for half price',
    11.0
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    notes = EXCLUDED.notes,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equip_type (id, name, notes, display_order)
VALUES (
    'b5f22ecb-b537-4f26-839d-295f9fadb915'::uuid,
    'Spell Components',
    'Spell Components can be resold for full price. The discount from the Crafter feat (2024) does not apply when buying Spell Components.',
    12.0
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    notes = EXCLUDED.notes,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equip_type (id, name, notes, display_order)
VALUES (
    '572ec17e-208b-4e46-b915-e33962fe65b5'::uuid,
    'Other Craftable Items',
    'The items below can only be crafted and cannot be purchased or sold',
    13.0
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    notes = EXCLUDED.notes,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

-- Compatibility View for legacy ac_equipment_categories references
DROP TABLE IF EXISTS public.ac_equipment_categories CASCADE;
CREATE OR REPLACE VIEW public.ac_equipment_categories AS
SELECT id, name, notes, display_order, created_at, updated_at
FROM public.ac_equip_type;

-- ------------------------------------------------------------------------------
-- 4. Schema Setup & Evolution for public.ac_equipment
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ac_equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.ac_equip_type(id),
    name TEXT NOT NULL,
    source TEXT[] NOT NULL DEFAULT ARRAY['PHB2024']::text[],
    cost_gp TEXT,
    weight_lbs TEXT,
    craft_cost_gp TEXT,
    craft_cost_dtp TEXT,
    craft_reqs TEXT,
    description TEXT,
    notes_advice TEXT,
    display_order DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Drop legacy unique constraint on (name, source) as multi-source and variants differ
ALTER TABLE public.ac_equipment DROP CONSTRAINT IF EXISTS ac_equipment_name_source_key;
ALTER TABLE public.ac_equipment DROP CONSTRAINT IF EXISTS ac_equipment_category_id_fkey;

-- Add check_id, ruleset, and equip_type_id columns
ALTER TABLE public.ac_equipment ADD COLUMN IF NOT EXISTS check_id VARCHAR(32);
ALTER TABLE public.ac_equipment ADD COLUMN IF NOT EXISTS ruleset VARCHAR(10) NOT NULL DEFAULT '2024';
ALTER TABLE public.ac_equipment ADD COLUMN IF NOT EXISTS equip_type_id UUID REFERENCES public.ac_equip_type(id);

-- Convert source to TEXT[] if currently text
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'ac_equipment' AND column_name = 'source' AND data_type = 'text'
    ) THEN
        ALTER TABLE public.ac_equipment ALTER COLUMN source TYPE TEXT[] USING string_to_array(source, ', ');
    END IF;
END $$;

-- Ensure display_order is DOUBLE PRECISION
ALTER TABLE public.ac_equipment ALTER COLUMN display_order TYPE DOUBLE PRECISION USING display_order::double precision;
ALTER TABLE public.ac_equipment ALTER COLUMN display_order SET DEFAULT 0.0;

-- ------------------------------------------------------------------------------
-- 5. Upsert All 490 Equipment Records
-- ------------------------------------------------------------------------------
INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'e9629436-62c9-4ea0-b7af-1f38c0435e41'::uuid,
    'EQP_0001',
    '6fce8a1e-300a-4496-983a-095a2435d7e7'::uuid,
    '6fce8a1e-300a-4496-983a-095a2435d7e7'::uuid,
    'Padded Armor',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '5',
    '8',
    NULL,
    NULL,
    'Weaver''s Tools',
    'Light armor. See book for description.',
    NULL,
    1.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'ed73c254-e99d-4d87-937f-4675cf31c971'::uuid,
    'EQP_0002',
    '6fce8a1e-300a-4496-983a-095a2435d7e7'::uuid,
    '6fce8a1e-300a-4496-983a-095a2435d7e7'::uuid,
    'Leather Armor',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '10',
    '10',
    NULL,
    NULL,
    'Leatherworker''s Tools',
    'Light armor. See book for description.',
    NULL,
    2.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '3b74567a-a186-4046-a8ed-edf26d44ad05'::uuid,
    'EQP_0003',
    '6fce8a1e-300a-4496-983a-095a2435d7e7'::uuid,
    '6fce8a1e-300a-4496-983a-095a2435d7e7'::uuid,
    'Studded Leather Armor',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '45',
    '13',
    NULL,
    NULL,
    'Leatherworker''s Tools',
    'Light armor. See book for description.',
    NULL,
    3.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '566b4f80-6f1a-4cbf-b543-9711454ea395'::uuid,
    'EQP_0004',
    '6fce8a1e-300a-4496-983a-095a2435d7e7'::uuid,
    '6fce8a1e-300a-4496-983a-095a2435d7e7'::uuid,
    'Hide Armor',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '10',
    '12',
    NULL,
    NULL,
    'Leatherworker''s Tools',
    'Medium armor. See book for description.',
    NULL,
    4.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '4313d2b9-3992-42e8-9d24-0383759d3652'::uuid,
    'EQP_0005',
    '6fce8a1e-300a-4496-983a-095a2435d7e7'::uuid,
    '6fce8a1e-300a-4496-983a-095a2435d7e7'::uuid,
    'Chain Shirt',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '50',
    '20',
    NULL,
    NULL,
    'Smith''s Tools',
    'Medium armor. See book for description.',
    NULL,
    5.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '7f2ea81d-76eb-44e1-96ee-be25d5f17631'::uuid,
    'EQP_0006',
    '6fce8a1e-300a-4496-983a-095a2435d7e7'::uuid,
    '6fce8a1e-300a-4496-983a-095a2435d7e7'::uuid,
    'Scale Mail',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '50',
    '45',
    NULL,
    NULL,
    'Smith''s Tools',
    'Medium armor. See book for description.',
    NULL,
    6.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'bae52298-bc78-40e5-bd4c-ee207dc099e3'::uuid,
    'EQP_0007',
    '6fce8a1e-300a-4496-983a-095a2435d7e7'::uuid,
    '6fce8a1e-300a-4496-983a-095a2435d7e7'::uuid,
    'Spiked Armor',
    '2014',
    ARRAY['SCAG']::text[],
    '75',
    '45',
    NULL,
    NULL,
    'Smith''s Tools',
    'Medium armor. See book for description.',
    NULL,
    7.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '83c2f912-7894-44a2-b586-b35e194576ca'::uuid,
    'EQP_0008',
    '6fce8a1e-300a-4496-983a-095a2435d7e7'::uuid,
    '6fce8a1e-300a-4496-983a-095a2435d7e7'::uuid,
    'Breastplate',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '400',
    '20',
    NULL,
    NULL,
    'Smith''s Tools',
    'Medium armor. See book for description.',
    NULL,
    8.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'b391fe62-80e6-42a4-a1be-b2a99ca35e0f'::uuid,
    'EQP_0009',
    '6fce8a1e-300a-4496-983a-095a2435d7e7'::uuid,
    '6fce8a1e-300a-4496-983a-095a2435d7e7'::uuid,
    'Half Plate Armor',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '750',
    '40',
    NULL,
    NULL,
    'Smith''s Tools',
    'Medium armor. See book for description.',
    NULL,
    9.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '05f7b132-97b6-498d-96c2-bc841feb6444'::uuid,
    'EQP_0010',
    '6fce8a1e-300a-4496-983a-095a2435d7e7'::uuid,
    '6fce8a1e-300a-4496-983a-095a2435d7e7'::uuid,
    'Ring Mail',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '30',
    '40',
    NULL,
    NULL,
    'Smith''s Tools',
    'Heavy armor. See book for description.',
    NULL,
    10.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'e1db86e2-d964-4a04-bb48-04afb7f8d832'::uuid,
    'EQP_0011',
    '6fce8a1e-300a-4496-983a-095a2435d7e7'::uuid,
    '6fce8a1e-300a-4496-983a-095a2435d7e7'::uuid,
    'Chain Mail',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '75',
    '55',
    NULL,
    NULL,
    'Smith''s Tools',
    'Heavy armor. See book for description.',
    NULL,
    11.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'cc9b6a1e-9ec4-40ea-b131-07322857bbb3'::uuid,
    'EQP_0012',
    '6fce8a1e-300a-4496-983a-095a2435d7e7'::uuid,
    '6fce8a1e-300a-4496-983a-095a2435d7e7'::uuid,
    'Splint Armor',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '200',
    '60',
    NULL,
    NULL,
    'Smith''s Tools',
    'Heavy armor. See book for description.',
    NULL,
    12.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '945fc3e6-ffe4-47d1-b5ff-3b04813b0999'::uuid,
    'EQP_0013',
    '6fce8a1e-300a-4496-983a-095a2435d7e7'::uuid,
    '6fce8a1e-300a-4496-983a-095a2435d7e7'::uuid,
    'Plate Armor',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '1500',
    '65',
    NULL,
    NULL,
    'Smith''s Tools',
    'Heavy armor. See book for description.',
    NULL,
    13.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'e1bfad11-31fc-4766-b250-deb2e5696ee9'::uuid,
    'EQP_0014',
    '6fce8a1e-300a-4496-983a-095a2435d7e7'::uuid,
    '6fce8a1e-300a-4496-983a-095a2435d7e7'::uuid,
    'Shield',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '10',
    '6',
    NULL,
    NULL,
    'Smith''s Tools',
    'Shield. See book for description.',
    NULL,
    14.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'ae5cbf96-474e-4187-894d-205203808516'::uuid,
    'EQP_0015',
    '6fce8a1e-300a-4496-983a-095a2435d7e7'::uuid,
    '6fce8a1e-300a-4496-983a-095a2435d7e7'::uuid,
    'Barding',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '4x cost of armor',
    '2x weight of armor',
    '2x cost of armor',
    '4x DTP cost of armor',
    'Smith''s Tools',
    'Barding is armor for a mount and any of the types of armor above, except shields, can be bought or crafted as barding. See book for description.',
    NULL,
    15.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'bf143378-cd88-43fe-a2f6-757be8f68e43'::uuid,
    'EQP_0016',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Club',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '0.1',
    '2',
    NULL,
    NULL,
    'Carpenter''s Tools',
    'Simple melee weapon. See book for description.',
    NULL,
    16.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '51edad7d-5dfa-453a-8f1c-94bab9a9417e'::uuid,
    'EQP_0017',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Dagger',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '2',
    '1',
    NULL,
    NULL,
    'Smith''s Tools',
    'Simple melee weapon. See book for description.',
    NULL,
    17.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '54f87980-8238-4395-9ea4-785f4e1eb376'::uuid,
    'EQP_0018',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Greatclub',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '0.2',
    '10',
    NULL,
    NULL,
    'Carpenter''s Tools',
    'Simple melee weapon. See book for description.',
    NULL,
    18.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '2bc5c9f0-6550-46de-8bd7-b84fc05af86b'::uuid,
    'EQP_0019',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Handaxe',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '5',
    '2',
    NULL,
    NULL,
    'Smith''s Tools',
    'Simple melee weapon. See book for description.',
    NULL,
    19.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'bcbb8436-38a6-42a6-92bd-515137d389b2'::uuid,
    'EQP_0020',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Javelin',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '0.5',
    '2',
    NULL,
    NULL,
    'Smith''s Tools',
    'Simple melee weapon. See book for description.',
    NULL,
    20.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'fad7a86f-727e-4155-bb8e-ff567e4c24a2'::uuid,
    'EQP_0021',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Light Hammer',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '2',
    '2',
    NULL,
    NULL,
    'Smith''s Tools',
    'Simple melee weapon. See book for description.',
    NULL,
    21.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '51213cf9-9045-4b88-ac02-aa3a478cb418'::uuid,
    'EQP_0022',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Mace',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '5',
    '4',
    NULL,
    NULL,
    'Smith''s Tools',
    'Simple melee weapon. See book for description.',
    NULL,
    22.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '7c2ae20f-4648-42f8-8ae9-388fac95c854'::uuid,
    'EQP_0023',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Quarterstaff',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '0.2',
    '4',
    NULL,
    NULL,
    'Carpenter''s Tools',
    'Simple melee weapon. See book for description.',
    NULL,
    23.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'ac2172e0-a155-4201-89c0-c6f3fe14abe3'::uuid,
    'EQP_0024',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Sickle',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '1',
    '2',
    NULL,
    NULL,
    'Smith''s Tools',
    'Simple melee weapon. See book for description.',
    NULL,
    24.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'b774dda9-c94d-4038-b312-965135557bc1'::uuid,
    'EQP_0025',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Spear',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '1',
    '3',
    NULL,
    NULL,
    'Smith''s Tools',
    'Simple melee weapon. See book for description.',
    NULL,
    25.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'a68c4993-077f-416d-bae2-6c9d23da77e9'::uuid,
    'EQP_0026',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Yklwa',
    '2014',
    ARRAY['ToA']::text[],
    '1',
    '3',
    NULL,
    NULL,
    'Smith''s Tools',
    'Simple melee weapon. See book for description.',
    '- Can only be purchased in Chult.
- Has the Sap weapon mastery property in 2024 games',
    26.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'c0091420-bd0e-4962-b650-d8045d56c152'::uuid,
    'EQP_0027',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Dart',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '0.05',
    '0.25',
    '0.02',
    NULL,
    'Woodcarver''s Tools',
    'Simple ranged weapon. See book for description.',
    NULL,
    27.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '4b449420-f7b4-4e2a-b0fa-ccf6a4c1639e'::uuid,
    'EQP_0028',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Light Crossbow',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '25',
    '5',
    NULL,
    NULL,
    'Woodcarver''s Tools',
    'Simple ranged weapon. See book for description.',
    NULL,
    28.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '05082171-4969-4b8d-94fc-17f4fe95c925'::uuid,
    'EQP_0029',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Shortbow',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '25',
    '2',
    NULL,
    NULL,
    'Woodcarver''s Tools',
    'Simple ranged weapon. See book for description.',
    NULL,
    29.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '4fe67510-b3e7-4fea-a611-3148e21b0bbc'::uuid,
    'EQP_0030',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Sling',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '0.1',
    '—',
    NULL,
    NULL,
    'Leatherworker''s Tools',
    'Simple ranged weapon. See book for description.',
    NULL,
    30.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'e068de9e-ef7d-41e1-87e1-17b67d977d20'::uuid,
    'EQP_0031',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Battleaxe',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '10',
    '4',
    NULL,
    NULL,
    'Smith''s Tools',
    'Martial melee weapon. See book for description.',
    NULL,
    31.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '4b0952e2-3c0f-4651-b391-cfd6d068c31f'::uuid,
    'EQP_0032',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Boarding Axe',
    '2014',
    ARRAY['HWT']::text[],
    '8',
    '3',
    NULL,
    NULL,
    'Smith''s Tools',
    'Martial melee weapon. See book for description.',
    'Has Sap weapon mastery property in 2024 games.',
    32.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '2b39752f-82a9-461f-aa9c-3932500d08d8'::uuid,
    'EQP_0033',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Flail',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '10',
    '2',
    NULL,
    NULL,
    'Smith''s Tools',
    'Martial melee weapon. See book for description.',
    NULL,
    33.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '06d377e1-e0da-4e4b-a5b0-285da856d76c'::uuid,
    'EQP_0034',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Glaive',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '20',
    '6',
    NULL,
    NULL,
    'Smith''s Tools',
    'Martial melee weapon. See book for description.',
    NULL,
    34.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '5334dfba-52db-4221-890d-ecbf9de9be24'::uuid,
    'EQP_0035',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Greataxe',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '30',
    '7',
    NULL,
    NULL,
    'Smith''s Tools',
    'Martial melee weapon. See book for description.',
    NULL,
    35.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '62ed6148-b267-4189-bea5-620f20c62c35'::uuid,
    'EQP_0036',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Greatsword',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '50',
    '6',
    NULL,
    NULL,
    'Smith''s Tools',
    'Martial melee weapon. See book for description.',
    NULL,
    36.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '4808eb6b-f5fd-4bb9-98c6-70e91511745a'::uuid,
    'EQP_0037',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Halberd',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '20',
    '6',
    NULL,
    NULL,
    'Smith''s Tools',
    'Martial melee weapon. See book for description.',
    NULL,
    37.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'ff3b9bfa-92aa-41e8-8e8c-8e4a8735037d'::uuid,
    'EQP_0038',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Hooked Shortspear',
    '2014',
    ARRAY['OotA']::text[],
    '1',
    '2',
    NULL,
    NULL,
    'Smith''s Tools',
    'Martial melee weapon

1d4 Piercing, Light

On a hit with this weapon, the wielder can forgo dealing damage and attempt to trip the target, in which case the target must succeed on a Strength saving throw or fall prone. The DC is 8 + the wielder''s Strength modifier + the wielder''s proficiency bonus.',
    'Has the Sap weapon mastery in 2024 games',
    38.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '9357e92f-d850-4b8b-9f2b-c31cdb365ab4'::uuid,
    'EQP_0039',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Lance',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '10',
    '6',
    NULL,
    NULL,
    'Smith''s Tools',
    'Martial melee weapon. See book for description.',
    'Considered to have the Heavy property for purposes of weapons in Loot that allow or exclude weapons with the Heavy property',
    39.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'f8f4a53f-2a43-4bbb-a2c7-e5655db5f145'::uuid,
    'EQP_0040',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Longsword',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '15',
    '3',
    NULL,
    NULL,
    'Smith''s Tools',
    'Martial melee weapon. See book for description.',
    NULL,
    40.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'c17e821c-f21a-4076-9ca8-bb9d633cd4f4'::uuid,
    'EQP_0041',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Maul',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '10',
    '10',
    NULL,
    NULL,
    'Smith''s Tools',
    'Martial melee weapon. See book for description.',
    NULL,
    41.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'edd81444-ad47-415a-be0e-076a44d9ed52'::uuid,
    'EQP_0042',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Morningstar',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '15',
    '4',
    NULL,
    NULL,
    'Smith''s Tools',
    'Martial melee weapon. See book for description.',
    NULL,
    42.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'f239da4e-a53f-4206-9fe8-370cbed87088'::uuid,
    'EQP_0043',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Pike',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '5',
    '18',
    NULL,
    NULL,
    'Smith''s Tools',
    'Martial melee weapon. See book for description.',
    NULL,
    43.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'e3b8682f-3ea2-47df-bd76-8946fd41d5f5'::uuid,
    'EQP_0044',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Rapier',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '25',
    '2',
    NULL,
    NULL,
    'Smith''s Tools',
    'Martial melee weapon. See book for description.',
    NULL,
    44.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'f5e20dd4-2e09-4aa7-a416-1d148f6f7215'::uuid,
    'EQP_0045',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Scimitar',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '25',
    '3',
    NULL,
    NULL,
    'Smith''s Tools',
    'Martial melee weapon. See book for description.',
    NULL,
    45.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'c22dddbe-fe94-4262-8794-c6798eedb4e1'::uuid,
    'EQP_0046',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Shortsword',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '10',
    '2',
    NULL,
    NULL,
    'Smith''s Tools',
    'Martial melee weapon. See book for description.',
    NULL,
    46.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'a13218bf-5e51-437b-a26a-58ee839a0f7f'::uuid,
    'EQP_0047',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Trident',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '5',
    '4',
    NULL,
    NULL,
    'Smith''s Tools',
    'Martial melee weapon. See book for description.',
    NULL,
    47.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '87796db9-4840-46b3-837b-f982bd5f5cd7'::uuid,
    'EQP_0048',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Warhammer',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '15',
    '2',
    NULL,
    NULL,
    'Smith''s Tools',
    'Martial melee weapon. See book for description.',
    NULL,
    48.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '49ce6db0-8936-456c-a287-fb981373db37'::uuid,
    'EQP_0049',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'War Pick',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '5',
    '2',
    NULL,
    NULL,
    'Smith''s Tools',
    'Martial melee weapon. See book for description.',
    NULL,
    49.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '15f86bba-0344-491e-9b49-713177f70174'::uuid,
    'EQP_0050',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Whip',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '2',
    '3',
    NULL,
    NULL,
    'Leatherworker''s Tools',
    'Martial melee weapon. See book for description.',
    NULL,
    50.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '5a9a5030-3a3e-493a-8799-742b39381739'::uuid,
    'EQP_0051',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Double-Bladed Scimitar',
    '2014',
    ARRAY['ERLW']::text[],
    '100',
    '6',
    NULL,
    NULL,
    'Smith''s Tools',
    'Martial melee weapon. See book for description.',
    'Has the Cleave weapon mastery in 2024 games',
    51.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'b2cfba56-8694-4a23-80a0-9e2bb581d6bf'::uuid,
    'EQP_0052',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Hoopak',
    '2014',
    ARRAY['DSotDQ']::text[],
    '0.1',
    '2',
    NULL,
    NULL,
    'Smith''s Tools',
    'Martial melee weapon. See book for description.',
    'Has the Sap weapon mastery in 2024 games',
    52.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '29e13987-a118-4235-bc2c-576b791d97aa'::uuid,
    'EQP_0053',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Blowgun',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '10',
    '1',
    NULL,
    NULL,
    'Woodcarver''s Tools',
    'Martial ranged weapon. See book for description.',
    NULL,
    53.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'ca556f1a-652f-49f8-a38c-d9b84aa5e180'::uuid,
    'EQP_0054',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Hand Crossbow',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '75',
    '3',
    NULL,
    NULL,
    'Woodcarver''s Tools',
    'Martial ranged weapon. See book for description.',
    NULL,
    54.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '6f0c653d-828b-49a8-a5f4-aa022d81b21d'::uuid,
    'EQP_0055',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Heavy Crossbow',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '50',
    '18',
    NULL,
    NULL,
    'Woodcarver''s Tools',
    'Martial ranged weapon. See book for description.',
    NULL,
    55.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '85e02eb0-9520-45d6-b191-15bde4aa98e0'::uuid,
    'EQP_0056',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Longbow',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '50',
    '2',
    NULL,
    NULL,
    'Woodcarver''s Tools',
    'Martial ranged weapon. See book for description.',
    NULL,
    56.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '09e2faaf-2788-44d6-b8d5-38864ad98923'::uuid,
    'EQP_0057',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Twinshot Hand Crossbow',
    '2014',
    ARRAY['HWT']::text[],
    '85',
    '5',
    NULL,
    NULL,
    'Woodcarver''s Tools',
    'Martial ranged weapon. See book for description.',
    'Has Sap weapon mastery property in 2024 games.',
    57.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '6977a917-6013-47f9-9971-c32d84179b44'::uuid,
    'EQP_0058',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Net',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '1',
    '3',
    NULL,
    NULL,
    'Weaver''s Tools',
    'Martial ranged weapon in 2014. Adventuring gear in 2024. See books for description.',
    NULL,
    58.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'f9e817c6-81f5-4ab9-8e41-1172b9cdcee4'::uuid,
    'EQP_0059',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Blunderbuss (HB)',
    '2014',
    ARRAY['HTA']::text[],
    '500',
    '7',
    NULL,
    NULL,
    'Tinker''s Tools',
    'Martial ranged weapon (firearm)
2d6 Bludgeoning — Ammunition (Range 30/90 ft.; Bullet), Loading, Two-Handed',
    '- Cannot be sold if taken as starting equipment.
- Has Push weapon mastery in 2024 games.
- Can be used with any spell that specifies arrows, bolts, or other ammunition, such as Flame Arrows or Swift Quiver
- Can be used with Improved Pact Weapon
- Replaces Scatterguns and Shotguns from the previous and deprecated HTA firearms',
    59.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '34e935ec-aa52-48c0-aded-54f4c53245fe'::uuid,
    'EQP_0060',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Musket',
    '2024',
    ARRAY['DMG2014', 'PHB2024']::text[],
    '500',
    '10',
    NULL,
    NULL,
    'Tinker''s Tools',
    'Martial ranged weapon and firearm. See book for description.',
    '- Cannot be sold if taken as starting equipment.
- Has Slow weapon mastery in 2024 games.
- Can be used with any spell that specifies arrows, bolts, or other ammunition, such as Flame Arrows or Swift Quiver
- Can be used with Improved Pact Weapon
- Replaces Rifles and Light Rifles from the previous and deprecated HTA firearms',
    60.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '614bfdd7-9551-4aba-b159-f06fe7671c9d'::uuid,
    'EQP_0061',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Pistol',
    '2024',
    ARRAY['DMG2014', 'PHB2024']::text[],
    '250',
    '3',
    NULL,
    NULL,
    'Tinker''s Tools',
    'Martial ranged weapon and firearm. See book for description.',
    '- Cannot be sold if taken as starting equipment.
- Has Vex weapon mastery in 2024 games.
- Can be used with any spell that specifies arrows, bolts, or other ammunition, such as Flame Arrows or Swift Quiver
- Can be used with Improved Pact Weapon
- Replaces Pistols and Light Pistols from the previous and deprecated HTA firearms',
    61.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '369bffd6-f876-4118-8e1a-7db777b37273'::uuid,
    'EQP_0062',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Adamantine Weapons',
    '2024',
    ARRAY['XGE', 'DMG2024']::text[],
    '500 in addition to weapon or ammunition cost',
    '—',
    'Total cost / 2',
    'Total cost / 25',
    'Smith''s Tools',
    'Coating a melee weapon or 10 pieces of ammunition with adamantine. See book for description.',
    'This is treated as a magic weapon or magic ammunition',
    62.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'b9fbeb36-dc28-43c4-99d3-357eec1c97f0'::uuid,
    'EQP_0063',
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    '0ece4dc6-dd68-4f89-ad53-1ba9418af206'::uuid,
    'Silvered Weapons',
    '2024',
    ARRAY['PHB2014', 'DMG2024']::text[],
    '100 in addition to weapon or ammunition cost',
    '—',
    'Total cost / 2',
    'Total cost / 25',
    'Smith''s Tools',
    'Coating a weapon or 10 pieces of ammunition with silver. See book for description.',
    '- This is treated as a magic weapon or magic ammunition
- When you score a Critical Hit with it against a creature that is shape-shifted, this weapon or ammunition deals one additional die of damage.',
    63.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'd660bab3-3f0b-47dc-83df-c1a1e7e34363'::uuid,
    'EQP_0064',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Alchemist''s Supplies',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '50',
    '8',
    '—',
    '—',
    '—',
    'Artisan''s tools, main ability score is INT. See book for description.',
    'Can be used to craft Acid, Alchemist''s Fire, Component Pouch, Oil, Paper, Perfume',
    64.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'aa3751d9-0e8d-4ecb-89b0-5e43d107ff1b'::uuid,
    'EQP_0065',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Brewer''s Supplies',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '20',
    '9',
    '—',
    '—',
    '—',
    'Artisan''s tools, main ability score is INT. See book for description.',
    'Can be used to craft Antitoxin',
    65.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '24521341-6566-4a22-9778-2e87be9bb829'::uuid,
    'EQP_0066',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Calligrapher''s Supplies',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '10',
    '5',
    '—',
    '—',
    '—',
    'Artisan''s tools, main ability score is DEX. See book for description.',
    'Can be used to craft Ink',
    66.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '3877218f-3644-4fbb-9fcc-6e1d6a289834'::uuid,
    'EQP_0067',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Carpenter''s Tools',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '8',
    '6',
    '—',
    '—',
    '—',
    'Artisan''s tools, main ability score is STR. See book for description.',
    'Can be used to craft Club, Greatclub, Quarterstaff, Barrel, Chest, Ladder, Pole, Portable Ram, Torch',
    67.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '63a6e0a9-30b1-44d4-ace7-3e7d544c5d55'::uuid,
    'EQP_0068',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Cartographer''s Tools',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '15',
    '6',
    '—',
    '—',
    '—',
    'Artisan''s tools, main ability score is WIS. See book for description.',
    'Can be used to craft Map',
    68.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'efc6b11a-d7f2-40da-8f30-ed64f5b4cb20'::uuid,
    'EQP_0069',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Cobbler''s Tools',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '5',
    '5',
    '—',
    '—',
    '—',
    'Artisan''s tools, main ability score is DEX. See book for description.',
    'Can be used to craft Climber''s Kit',
    69.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '2618ff72-4cbd-4dd8-b7a0-5ad6cb800cd5'::uuid,
    'EQP_0070',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Cook''s Utensils',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '1',
    '8',
    '—',
    '—',
    '—',
    'Artisan''s tools, main ability score is WIS. See book for description.',
    'Can be used to craft Rations',
    70.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'ddf4208d-d177-44c3-8724-f322b1ac5c87'::uuid,
    'EQP_0071',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Glassblower''s Tools',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '30',
    '5',
    '—',
    '—',
    '—',
    'Artisan''s tools, main ability score is INT. See book for description.',
    'Can be used to craft Glass Bottle, Magnifying Glass, Spyglass, Vial',
    71.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'f23b1b63-b34c-48fd-a2d8-3c89440df1b7'::uuid,
    'EQP_0072',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Jeweler''s Tools',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '25',
    '2',
    '—',
    '—',
    '—',
    'Artisan''s tools, main ability score is INT. See book for description.',
    'Can be used to craft Arcane Focus, Holy Symbol',
    72.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '1cbb19b0-1f86-466f-9e0d-2f0e5ca32866'::uuid,
    'EQP_0073',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Leatherworker''s Tools',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '5',
    '5',
    '—',
    '—',
    '—',
    'Artisan''s tools, main ability score is DEX. See book for description.',
    'Can be used to craft Sling, Whip, Hide Armor, Leather Armor, Studded Leather Armor, Backpack, Crossbow Bolt Case, Map or Scroll Case, Parchment, Pouch, Quiver, Waterskin',
    73.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '528d126c-b851-4d42-9d76-5fd9cd9a1863'::uuid,
    'EQP_0074',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Mason''s Tools',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '10',
    '8',
    '—',
    '—',
    '—',
    'Artisan''s tools, main ability score is STR. See book for description.',
    'Can be used to craft Block and Tackle',
    74.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '6f848c21-0324-4453-aa4b-87a5167b1c0a'::uuid,
    'EQP_0075',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Painter''s Supplies',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '10',
    '5',
    '—',
    '—',
    '—',
    'Artisan''s tools, main ability score is WIS. See book for description.',
    'Can be used to craft Druidic Focus, Holy Symbol',
    75.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'f520710b-927d-40b4-8883-fa04ba2a30ef'::uuid,
    'EQP_0076',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Potter''s Tools',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '10',
    '3',
    '—',
    '—',
    '—',
    'Artisan''s tools, main ability score is INT. See book for description.',
    'Can be used to craft Jug, Lamp',
    76.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'dfe5da6a-7628-4f7b-a8cf-2555d7c8a73f'::uuid,
    'EQP_0077',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Smith''s Tools',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '20',
    '8',
    '—',
    '—',
    '—',
    'Artisan''s tools, main ability score is STR. See book for description.',
    'Can be used to craft any Melee weapon (except Club, Greatclub, Quarterstaff, and Whip), Medium armor (except Hide), Heavy armor, Ball Bearings, Bucket, Caltrops, Chain, Crowbar, Firearm Bullets, Grappling Hook, Iron Pot, Iron Spikes, Sling Bullets',
    77.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'bc9a35e7-29f3-473d-901e-c3d84716cbbd'::uuid,
    'EQP_0078',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Tinker''s Tools',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '50',
    '10',
    '—',
    '—',
    '—',
    'Artisan''s tools, main ability score is DEX. See book for description.',
    'Can be used to craft any Firearm, Bell, Bullseye Lantern, Flask, Hooded Lantern, Hunting Trap, Lock, Manacles, Mirror, Shovel, Signal Whistle, Tinderbox',
    78.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '5b4b914a-0724-43a6-889c-368df91e6a28'::uuid,
    'EQP_0079',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Weaver''s Tools',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '1',
    '5',
    '—',
    '—',
    '—',
    'Artisan''s tools, main ability score is DEX. See book for description.',
    'Can be used to craft Padded Armor, Basket, Bedroll, Blanket, Fine Clothes, Net, Robe, Rope, Sack, String, Tent, Traveler''s Clothes',
    79.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '59ac23fa-5441-4a82-91d8-13c7b66141ad'::uuid,
    'EQP_0080',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Woodcarver''s Tools',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '1',
    '5',
    '—',
    '—',
    '—',
    'Main ability score is DEX. See book for description.',
    'Can be used to craft Club, Greatclub, Quarterstaff, Ranged weapons (except Firearms and Sling), Arcane Focus, Arrows, Crossbow Bolts, Druidic Focus, Ink Pen, Blowgun Needles',
    80.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '6db074d7-bc3e-442c-985b-552ae74cc338'::uuid,
    'EQP_0081',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Disguise Kit',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '25',
    '3',
    '—',
    '—',
    '—',
    'Main ability score is CHA. See book for description.',
    'Can be used to craft Costume',
    81.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '6e491377-0e84-4030-a2dd-1286e5d2973c'::uuid,
    'EQP_0082',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Forgery Kit',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '15',
    '5',
    '—',
    '—',
    '—',
    'Main ability score is DEX. See book for description.',
    NULL,
    82.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '5a48ec0c-af84-4c2a-a5fd-67679a3e626e'::uuid,
    'EQP_0083',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Herbalism Kit',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '5',
    '3',
    '—',
    '—',
    '—',
    'Main ability score is INT. See book for description.',
    'Can be used to craft Antitoxin, Candle, Healer''s Kit, Potion of Healing (as well as Greater, Superior, and Supreme)',
    83.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'e4f262b0-eba3-4157-af99-3e3d6a229fcc'::uuid,
    'EQP_0084',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Navigator''s Tools',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '25',
    '2',
    '—',
    '—',
    '—',
    'Main ability score is WIS. See book for description.',
    NULL,
    84.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'a49630d3-90ca-4ec8-a8d5-0ed89f932ab1'::uuid,
    'EQP_0085',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Poisoner''s Kit',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '50',
    '2',
    '—',
    '—',
    '—',
    'Main ability score is INT. See book for description.',
    'Can be used to craft Basic Poison (as well as other poisons)',
    85.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '1adc2de3-a252-4508-8696-a238d1a196a3'::uuid,
    'EQP_0086',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Thieves'' Tools',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '25',
    '1',
    '—',
    '—',
    '—',
    'Main ability score is DEX. See book for description.',
    NULL,
    86.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '33a30bfb-4808-49a3-ae36-219437d5d0ce'::uuid,
    'EQP_0087',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Dice Set',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '0.1',
    '—',
    '—',
    '—',
    '—',
    'Gaming set, main ability score is WIS. See book for description.',
    NULL,
    87.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '49015232-a827-4b2a-b47a-f6687e223286'::uuid,
    'EQP_0088',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Dragonchess Set',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '1',
    '—',
    '—',
    '—',
    '—',
    'Gaming set, main ability score is WIS. See book for description.',
    NULL,
    88.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '07809f00-f684-4fba-aa79-a335a19019f4'::uuid,
    'EQP_0089',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Playing Cards',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '0.5',
    '—',
    '—',
    '—',
    '—',
    'Gaming set, main ability score is WIS. See book for description.',
    NULL,
    89.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '7c69ec66-e41b-4b1f-b5da-b01536017e7e'::uuid,
    'EQP_0090',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Three-Dragon Ante Set',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '1',
    '—',
    '—',
    '—',
    '—',
    'Gaming set, main ability score is WIS. See book for description.',
    NULL,
    90.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '4712d29c-b9e6-48a9-a009-dcbe171bb933'::uuid,
    'EQP_0091',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Bagpipes',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '30',
    '6',
    '—',
    '—',
    '—',
    'Musical instrument, main ability score is CHA. See book for description.',
    NULL,
    91.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'e9a5efc8-d5c6-457c-9bb3-11b8030f38a9'::uuid,
    'EQP_0092',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Drum',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '6',
    '3',
    '—',
    '—',
    '—',
    'Musical instrument, main ability score is CHA. See book for description.',
    NULL,
    92.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '8ca506c4-a958-45e7-a3b0-107fe637cc32'::uuid,
    'EQP_0093',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Dulcimer',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '25',
    '10',
    '—',
    '—',
    '—',
    'Musical instrument, main ability score is CHA. See book for description.',
    NULL,
    93.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '41b89eb6-c252-4da7-8087-34c1b030561d'::uuid,
    'EQP_0094',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Flute',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '2',
    '1',
    '—',
    '—',
    '—',
    'Musical instrument, main ability score is CHA. See book for description.',
    NULL,
    94.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '5d873fbf-f6d6-4089-8210-4dcea83931bb'::uuid,
    'EQP_0095',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Horn',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '3',
    '2',
    '—',
    '—',
    '—',
    'Musical instrument, main ability score is CHA. See book for description.',
    NULL,
    95.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'ffd14381-55c7-47f1-be64-de5b5e0f28ac'::uuid,
    'EQP_0096',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Lute',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '35',
    '2',
    '—',
    '—',
    '—',
    'Musical instrument, main ability score is CHA. See book for description.',
    NULL,
    96.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '2b2e2df0-d613-427e-8ab7-6d9d58c0fbb9'::uuid,
    'EQP_0097',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Lyre',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '30',
    '2',
    '—',
    '—',
    '—',
    'Musical instrument, main ability score is CHA. See book for description.',
    NULL,
    97.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'a355dd85-9e61-458d-9835-4dd888503545'::uuid,
    'EQP_0098',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Pan Flute',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '12',
    '2',
    '—',
    '—',
    '—',
    'Musical instrument, main ability score is CHA. See book for description.',
    NULL,
    98.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'dea25256-575a-4f74-8c90-cf1784398714'::uuid,
    'EQP_0099',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Shawmn',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '2',
    '1',
    '—',
    '—',
    '—',
    'Musical instrument, main ability score is CHA. See book for description.',
    NULL,
    99.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '91755cc1-91a8-460c-ac6f-27f8acdd6bca'::uuid,
    'EQP_0100',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Viol',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '30',
    '1',
    '—',
    '—',
    '—',
    'Musical instrument, main ability score is CHA. See book for description.',
    NULL,
    100.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '891239b0-9771-4619-bdba-69d4f70d7fa4'::uuid,
    'EQP_0101',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Bandore',
    '2024',
    ARRAY['FRHOF']::text[],
    '65',
    '3',
    '—',
    '—',
    '—',
    'Musical instrument, main ability score is CHA. See book for description.',
    NULL,
    101.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '1f771cb3-a6f1-4306-9ce7-4199cd6b82c9'::uuid,
    'EQP_0102',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Cittern',
    '2024',
    ARRAY['FRHOF']::text[],
    '65',
    '2',
    '—',
    '—',
    '—',
    'Musical instrument, main ability score is CHA. See book for description.',
    NULL,
    102.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '06661033-af60-4437-95cf-a677ea90c3f3'::uuid,
    'EQP_0103',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Yarting',
    '2024',
    ARRAY['FRHOF']::text[],
    '40',
    '2',
    '—',
    '—',
    '—',
    'Musical instrument, main ability score is CHA. See book for description.',
    NULL,
    103.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'd6514bc2-9423-4cd4-b247-d146ada3b895'::uuid,
    'EQP_0104',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Bells',
    '2014',
    ARRAY['HHB']::text[],
    '2',
    '1',
    '—',
    '—',
    '—',
    'Musical instrument, main ability score is CHA.',
    NULL,
    104.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'f0abd3cf-d70c-40c0-b999-2958d68e5270'::uuid,
    'EQP_0105',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Chimes',
    '2014',
    ARRAY['HHB']::text[],
    '2',
    '1',
    '—',
    '—',
    '—',
    'Musical instrument, main ability score is CHA.',
    NULL,
    105.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'bc9d9abc-02e6-4ca0-a523-ff8fecb0df6b'::uuid,
    'EQP_0106',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Fiddle',
    '2014',
    ARRAY['HHB']::text[],
    '30',
    '2',
    '—',
    '—',
    '—',
    'Musical instrument, main ability score is CHA.',
    NULL,
    106.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '08d1fc4c-f8d7-4d11-aa60-1293eede3d29'::uuid,
    'EQP_0107',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Gong',
    '2014',
    ARRAY['HHB']::text[],
    '6',
    '3',
    '—',
    '—',
    '—',
    'Musical instrument, main ability score is CHA.',
    NULL,
    107.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'be70c587-beeb-4387-abec-1059dc70b1e6'::uuid,
    'EQP_0108',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Harp',
    '2014',
    ARRAY['HHB']::text[],
    '45',
    '80',
    '—',
    '—',
    '—',
    'Musical instrument, main ability score is CHA.',
    'Cannot be sold if taken as starting equipment.',
    108.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '6fe3f2fd-b24b-4983-90c4-65cc915bbf6f'::uuid,
    'EQP_0109',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Harpsichord',
    '2014',
    ARRAY['HHB']::text[],
    '100',
    '500',
    '—',
    '—',
    '—',
    'Musical instrument, main ability score is CHA.',
    'Cannot be sold if taken as starting equipment.',
    109.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '3278635f-7530-4854-a2d6-b505618d2d7a'::uuid,
    'EQP_0110',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Piano',
    '2014',
    ARRAY['HHB']::text[],
    '100',
    '500',
    '—',
    '—',
    '—',
    'Musical instrument, main ability score is CHA.',
    'Cannot be sold if taken as starting equipment.',
    110.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'fe87cd5b-76dd-4bed-8838-69f7525b9c01'::uuid,
    'EQP_0111',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Pipe Organ',
    '2014',
    ARRAY['HHB']::text[],
    '100',
    '500',
    '—',
    '—',
    '—',
    'Musical instrument, main ability score is CHA.',
    'Cannot be sold if taken as starting equipment.',
    111.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '61e994ac-e906-43ae-a6bd-4ef45c1dd699'::uuid,
    'EQP_0112',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Mandolin',
    '2014',
    ARRAY['HHB']::text[],
    '35',
    '2',
    '—',
    '—',
    '—',
    'Musical instrument, main ability score is CHA.',
    NULL,
    112.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '178dbd72-a19d-4028-8e4d-566a34561c99'::uuid,
    'EQP_0113',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Recorder',
    '2014',
    ARRAY['HHB']::text[],
    '2',
    '1',
    '—',
    '—',
    '—',
    'Musical instrument, main ability score is CHA.',
    NULL,
    113.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'cfec41e0-493e-484a-b016-a312bdcf5246'::uuid,
    'EQP_0114',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Saxophone',
    '2014',
    ARRAY['HHB']::text[],
    '30',
    '6',
    '—',
    '—',
    '—',
    'Musical instrument, main ability score is CHA.',
    NULL,
    114.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '458761b5-3c64-4b75-91b4-66366771616f'::uuid,
    'EQP_0115',
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'df9a720e-6b9b-4721-89dd-5e5eb26511b6'::uuid,
    'Trumpet',
    '2014',
    ARRAY['HHB']::text[],
    '3',
    '2',
    '—',
    '—',
    '—',
    'Musical instrument, main ability score is CHA.',
    NULL,
    115.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '7c261b02-0c70-48bc-ac1c-ad984c3e7f14'::uuid,
    'EQP_0116',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Arrows (20)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '1',
    '1',
    NULL,
    NULL,
    'Woodcarver''s Tools',
    'Ammunition. See book for description.',
    'Stored in a Quiver',
    116.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'b4563ef6-0f10-45b2-aa4a-e6816630b7c5'::uuid,
    'EQP_0117',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Crossbow Bolts (20)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '1',
    '1.5',
    NULL,
    NULL,
    'Woodcarver''s Tools',
    'Ammunition. See book for description.',
    '- Reprinted as "Bolts" in 2024
- Stored in a Crossbow Bolt Case',
    117.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '992785d2-5376-4c16-94c0-4808c6e86ae3'::uuid,
    'EQP_0118',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Firearm Bullets (10)',
    '2024',
    ARRAY['DMG2014', 'PHB2024']::text[],
    '3',
    '2',
    NULL,
    NULL,
    'Smith''s Tools',
    'Ammunition. See book for description.',
    '- Stored in a Pouch
- Can be used with any spell that specifies arrows, bolts, or other ammunition, such as Flame Arrows or Swift Quiver',
    118.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '75ab076a-6174-4c4c-8e09-968d2e1a7619'::uuid,
    'EQP_0119',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Sling Bullets (20)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '0.04',
    '1.5',
    NULL,
    NULL,
    'Smith''s Tools',
    'Ammunition. See book for description.',
    'Stored in a Pouch',
    119.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '1b3eea96-bffe-4feb-9daa-2c1bb703f7da'::uuid,
    'EQP_0120',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Blowgun Needles (50)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '1',
    '1',
    NULL,
    NULL,
    'Woodcarver''s Tools',
    'Ammunition. See book for description.',
    '- Reprinted as "Needles" in 2024
- Stored in a Pouch',
    120.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '39ec0b66-e264-460c-866e-52afca8f7624'::uuid,
    'EQP_0121',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Abacus',
    '2014',
    ARRAY['PHB2014']::text[],
    '2',
    '2',
    '—',
    '—',
    '—',
    'Adventuring gear.',
    NULL,
    121.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '804ae87d-2400-4bce-baa3-efca2479bc5f'::uuid,
    'EQP_0122',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Acid (vial)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '25',
    '1',
    NULL,
    NULL,
    'Alchemist''s Supplies',
    'Adventuring gear. See book for description.',
    NULL,
    122.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '4522c173-5c67-46b4-8e36-e347c0e52867'::uuid,
    'EQP_0123',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Alchemist''s Fire (flask)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '50',
    '1',
    NULL,
    NULL,
    'Alchemist''s Supplies',
    'Adventuring gear. See book for description.',
    NULL,
    123.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '6644e468-8c83-4bc0-978d-35310880da29'::uuid,
    'EQP_0124',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Antitoxin (vial)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '50',
    '—',
    NULL,
    NULL,
    'Alchemist''s Supplies, Brewer''s Supplies, or Herbalism kit',
    'Adventuring gear. See book for description.',
    NULL,
    124.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'b5069d8c-0e20-45eb-be40-aabcc869ffef'::uuid,
    'EQP_0125',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Crystal (Arcane Focus)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '10',
    '1',
    NULL,
    NULL,
    'Jeweler''s Tools',
    'Arcane spellcasting focus for Sorcerers, Warlocks, and Wizards. See book for description.',
    NULL,
    125.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '86d0b774-f4d1-44f3-b32b-e80a389a3a9b'::uuid,
    'EQP_0126',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Orb (Arcane Focus)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '20',
    '3',
    NULL,
    NULL,
    'Jeweler''s Tools or Woodcarver''s Tools',
    'Arcane spellcasting focus for Sorcerers, Warlocks, and Wizards. See book for description.',
    NULL,
    126.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '5f0b1a41-c77e-43ad-b5c4-11f64f219cb4'::uuid,
    'EQP_0127',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Rod (Arcane Focus)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '10',
    '2',
    NULL,
    NULL,
    'Jeweler''s Tools or Woodcarver''s Tools',
    'Arcane spellcasting focus for Sorcerers, Warlocks, and Wizards. See book for description.',
    NULL,
    127.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'd5e060b4-3884-418a-974f-86429f8c90f0'::uuid,
    'EQP_0128',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Staff (Arcane Focus)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '5',
    '4',
    NULL,
    NULL,
    'Jeweler''s Tools or Woodcarver''s Tools',
    'Arcane spellcasting focus for Sorcerers, Warlocks, and Wizards. See book for description.',
    'Can also be used as a Quarterstaff',
    128.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'c628b0d1-0f43-425b-a529-fcd626a3b52a'::uuid,
    'EQP_0129',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Wand (Arcane Focus)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '10',
    '1',
    NULL,
    NULL,
    'Jeweler''s Tools or Woodcarver''s Tools',
    'Arcane spellcasting focus for Sorcerers, Warlocks, and Wizards. See book for description.',
    NULL,
    129.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '5696e6ba-dbc1-420d-84c1-0eb4c56b30b9'::uuid,
    'EQP_0130',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Backpack',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '2',
    '5',
    NULL,
    NULL,
    'Leatherworker''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    130.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'a8522fb0-e935-41bc-a306-f89cbfe307f1'::uuid,
    'EQP_0131',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Ball Bearings (bag of 1000)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '1',
    '2',
    NULL,
    NULL,
    'Smith''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    131.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'ffa6994d-48ea-4a5a-a2b0-16071b7e4ac4'::uuid,
    'EQP_0132',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Barrel',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '2',
    '70',
    NULL,
    NULL,
    'Carpenter''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    132.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '489bb4cf-a1e4-4011-8316-1deb4921cfee'::uuid,
    'EQP_0133',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Basket',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '0.4',
    '2',
    NULL,
    NULL,
    'Weaver''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    133.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '44793af7-0260-4794-ba3c-c601822e5b77'::uuid,
    'EQP_0134',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Bedroll',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '1',
    '7',
    NULL,
    NULL,
    'Weaver''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    134.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '7349dd83-4f50-4536-bd14-091e6bf9b652'::uuid,
    'EQP_0135',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Bell',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '1',
    '—',
    NULL,
    NULL,
    'Tinker''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    135.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'eff944c4-9bc1-4425-934c-c7c0184c1541'::uuid,
    'EQP_0136',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Blanket',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '0.5',
    '3',
    NULL,
    NULL,
    'Weaver''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    136.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '403351c7-cda5-487c-9ebb-014bc9d30b6c'::uuid,
    'EQP_0137',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Block and Tackle',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '1',
    '5',
    NULL,
    NULL,
    'Mason''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    137.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '448009d6-6fcc-46de-af1a-309e72370fdf'::uuid,
    'EQP_0138',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Book',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '25',
    '5',
    '—',
    '—',
    '—',
    'Adventuring gear. See book for description.',
    NULL,
    138.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '4a576680-2a3f-48e7-ad0e-9206dcbe4659'::uuid,
    'EQP_0139',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Glass Bottle',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '2',
    '2',
    NULL,
    NULL,
    'Glassblower''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    139.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '7bd92c04-c496-4d60-8b0a-832bc6841f59'::uuid,
    'EQP_0140',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Bucket',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '0.05',
    '2',
    '0.02',
    NULL,
    'Smith''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    140.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'cab9614e-df5d-47bc-bada-f30de1ef28b6'::uuid,
    'EQP_0141',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Caltrops (bag of 20)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '1',
    '2',
    NULL,
    NULL,
    'Smith''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    141.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'bf848a94-abe5-4e98-bac4-6b18594ef1f4'::uuid,
    'EQP_0142',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Candle',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '0.01',
    '—',
    '0.01',
    NULL,
    'Herbalism Kit',
    'Adventuring gear. See book for description.',
    NULL,
    142.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'efed5aed-b524-463d-b50c-02b489a33341'::uuid,
    'EQP_0143',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Crossbow Bolt Case',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '1',
    '1',
    NULL,
    NULL,
    'Leatherworker''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    143.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'ed2b49b3-dce6-4634-9bb2-8d7980d3f8ab'::uuid,
    'EQP_0144',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Map or Scroll Case',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '1',
    '1',
    NULL,
    NULL,
    'Leatherworker''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    144.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '7952ccd6-bb13-40f9-9464-2a15a1632784'::uuid,
    'EQP_0145',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Chain (10 feet)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '5',
    '10',
    NULL,
    NULL,
    'Smith''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    145.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '8bb691c9-3ff0-49d5-be77-7acb495e86a7'::uuid,
    'EQP_0146',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Chalk (1 piece)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '0.01',
    '—',
    '—',
    '—',
    '—',
    'Adventuring gear.',
    NULL,
    146.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '45b972c1-20be-4634-9db4-3d330ab3b4af'::uuid,
    'EQP_0147',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Chest',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '5',
    '25',
    NULL,
    NULL,
    'Carpenter''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    147.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'bf176717-476f-4349-ac4b-703edcfb8286'::uuid,
    'EQP_0148',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Common Clothes',
    '2014',
    ARRAY['PHB2014']::text[],
    '0.5',
    '3',
    NULL,
    NULL,
    'Weaver''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    148.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '816215ef-e829-4c2d-9e2c-9a8505ab96cf'::uuid,
    'EQP_0149',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Fine Clothes',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '15',
    '6',
    NULL,
    NULL,
    'Weaver''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    149.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '6ab10594-359c-44d1-8372-9825c338ca30'::uuid,
    'EQP_0150',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Traveler''s Clothes',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '2',
    '4',
    NULL,
    NULL,
    'Weaver''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    150.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '5bedd94c-1005-45a6-987c-2aeb25672bc0'::uuid,
    'EQP_0151',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Costume Clothes',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '5',
    '4',
    NULL,
    NULL,
    'Disguise Kit',
    'Adventuring gear. See book for description.',
    NULL,
    151.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'd0288f17-1e69-4b29-a584-80c32c6be804'::uuid,
    'EQP_0152',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Component Pouch',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '25',
    '2',
    NULL,
    NULL,
    'Alchemist''s Supplies',
    'Adventuring gear. See book for description.',
    NULL,
    152.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '283eb751-bd47-4594-a18c-a049b1d18d3c'::uuid,
    'EQP_0153',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Crowbar',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '2',
    '5',
    NULL,
    NULL,
    'Smith''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    153.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '8d03da74-cf6e-4ef3-b799-49a2522ad363'::uuid,
    'EQP_0154',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Sprig of Mistletoe (Druidic Focus)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '1',
    '—',
    NULL,
    NULL,
    'Painter''s Supplies or Woodcarver''s Tools',
    'Druidic spellcasting focus for Druids and Rangers. See book for description.',
    NULL,
    154.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'f224d3a1-21c0-4000-9e31-45a032c5e882'::uuid,
    'EQP_0155',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Totem (Druidic Focus)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '1',
    '—',
    NULL,
    NULL,
    'Painter''s Supplies or Woodcarver''s Tools',
    'Druidic spellcasting focus for Druids and Rangers. See book for description.',
    NULL,
    155.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '5e54cb8f-38e5-461a-b93f-6c01e09893fa'::uuid,
    'EQP_0156',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Wooden Staff (Druidic Focus)',
    '2014',
    ARRAY['PHB2014']::text[],
    '5',
    '4',
    NULL,
    NULL,
    'Painter''s Supplies or Woodcarver''s Tools',
    'Druidic spellcasting focus for Druids and Rangers. See book for description.',
    NULL,
    156.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '1a4d97fb-1ff8-46f1-9268-58c75c0a4bbc'::uuid,
    'EQP_0157',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Yew Wand (Druidic Focus)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '10',
    '1',
    NULL,
    NULL,
    'Painter''s Supplies or Woodcarver''s Tools',
    'Druidic spellcasting focus for Druids and Rangers. See book for description.',
    NULL,
    157.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'f86a423d-8f53-469d-955f-cb5256fb2226'::uuid,
    'EQP_0158',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Fishing Tackle',
    '2014',
    ARRAY['PHB2014']::text[],
    '1',
    '4',
    '—',
    '—',
    '—',
    'Adventuring gear. See book for description.',
    NULL,
    158.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '4f6df665-d1b0-483c-a3b1-b6af69b0e27c'::uuid,
    'EQP_0159',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Flask',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '0.02',
    '1',
    NULL,
    NULL,
    'Tinker''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    159.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '62db4ea4-e96c-4625-a6bf-e0a545c24d4c'::uuid,
    'EQP_0160',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Tankard',
    '2014',
    ARRAY['PHB2014']::text[],
    '0.02',
    '1',
    NULL,
    NULL,
    'Tinker''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    160.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'a04a08e3-2420-4cea-80bc-292ea555aa19'::uuid,
    'EQP_0161',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Grappling Hook',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '2',
    '4',
    NULL,
    NULL,
    'Smith''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    161.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'ca622cf1-3d45-40cd-89d2-7d39f5238f3c'::uuid,
    'EQP_0162',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Healer''s Kit',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '5',
    '3',
    NULL,
    NULL,
    'Herbalism Kit',
    'Adventuring gear. See book for description.',
    NULL,
    162.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'a5724baa-b24a-4cbf-b44c-21892a4082c8'::uuid,
    'EQP_0163',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Hammer',
    '2014',
    ARRAY['PHB2014']::text[],
    '1',
    '3',
    NULL,
    NULL,
    'Smith''s Tools',
    'Adventuring gear.',
    'Can be used in 2024 games to hammer a Spike.',
    163.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'd7bba07e-380f-4690-90c0-24acab63ad88'::uuid,
    'EQP_0164',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Sledge Hammer',
    '2014',
    ARRAY['PHB2014']::text[],
    '2',
    '10',
    NULL,
    NULL,
    'Smith''s Tools',
    'Adventuring gear.',
    'Can be used in 2024 games to hammer a Spike.',
    164.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '2414422d-d063-49ae-9e02-6a56e0806345'::uuid,
    'EQP_0165',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Amulet (Holy Symbol)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '5',
    '1',
    NULL,
    NULL,
    'Jeweler''s Tools or Painter''s Supplies',
    'Divine spellcasting focus for Clerics and Paladins that is worn or held. See book for description.',
    NULL,
    165.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'fb546e1b-a33e-4439-b00e-a15bdc77844a'::uuid,
    'EQP_0166',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Emblem (Holy Symbol)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '5',
    '—',
    NULL,
    NULL,
    'Jeweler''s Tools or Painter''s Supplies',
    'Divine spellcasting focus for Clerics and Paladins that is borne on fabric or a Shield. See book for description.',
    NULL,
    166.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'f174b3a5-46fe-4e0b-9d83-487fc48605e5'::uuid,
    'EQP_0167',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Reliquary (Holy Symbol)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '5',
    '2',
    NULL,
    NULL,
    'Jeweler''s Tools or Painter''s Supplies',
    'Divine spellcasting focus for Clerics and Paladins that is held. See book for description.',
    NULL,
    167.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'ebbde689-97f1-488c-99b6-71132f357ced'::uuid,
    'EQP_0168',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Holy Water (Flask)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '25',
    '1',
    '—',
    '—',
    '—',
    'Adventuring gear. See book for description.',
    'Can be created with Ceremony spell (2 DTP, 25 GP of components)',
    168.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '497670ff-772e-41e4-b8ff-a9655d71afa6'::uuid,
    'EQP_0169',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Hourglass',
    '2014',
    ARRAY['PHB2014']::text[],
    '25',
    '1',
    NULL,
    NULL,
    'Glassblower''s Tools',
    'Adventuring gear.',
    NULL,
    169.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'e92f917b-0a9d-41af-98cb-1fad035dd91e'::uuid,
    'EQP_0170',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Hunting Trap',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '25',
    '5',
    '—',
    '—',
    '—',
    'Adventuring gear. See book for description.',
    NULL,
    170.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'd59f2a1c-2f94-4a1a-870d-6afd44fbc0eb'::uuid,
    'EQP_0171',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Ink (1-ounce bottle)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '10',
    '—',
    NULL,
    NULL,
    'Calligrapher''s Supplies',
    'Adventuring gear. See book for description.',
    NULL,
    171.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'd3c773a7-1175-4cc3-b6ec-13138ee39e2a'::uuid,
    'EQP_0172',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Ink Pen',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '0.02',
    '—',
    NULL,
    NULL,
    'Woodcarver''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    172.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'bd1bf553-7f43-44f1-8cbf-8807135fbc1a'::uuid,
    'EQP_0173',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Jug',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '0.02',
    '4',
    NULL,
    NULL,
    'Potter''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    173.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '708d5ce3-d76c-47c2-88f6-31f5f34d5a3d'::uuid,
    'EQP_0174',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Pitcher',
    '2014',
    ARRAY['PHB2014']::text[],
    '0.02',
    '4',
    NULL,
    NULL,
    'Potter''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    174.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '666c14f1-4e49-4598-ab5d-50f2fa81bf18'::uuid,
    'EQP_0175',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Climber''s Kit',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '25',
    '12',
    NULL,
    NULL,
    'Cobbler''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    175.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '69a29e68-7a4a-4a8e-87ff-1db07f91ec51'::uuid,
    'EQP_0176',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Mess Kit',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '0.2',
    '1',
    NULL,
    NULL,
    'Potter''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    176.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'eca930ef-e6b6-41e8-8994-0afd647aa727'::uuid,
    'EQP_0177',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Ladder (10-foot)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '0.1',
    '25',
    NULL,
    NULL,
    'Carpenter''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    177.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '337b43da-e1ec-477b-ba3b-8b7e5c53312a'::uuid,
    'EQP_0178',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Lamp',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '0.5',
    '1',
    NULL,
    NULL,
    'Potter''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    178.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'a518b79a-5e2f-4952-90c7-170c829d2c7c'::uuid,
    'EQP_0179',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Bullseye Lantern',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '10',
    '2',
    NULL,
    NULL,
    'Tinker''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    179.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'b4ea15f9-c979-4078-ac05-3b59012452fa'::uuid,
    'EQP_0180',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Hooded Lantern',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '5',
    '2',
    NULL,
    NULL,
    'Tinker''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    180.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '47ce7578-6fd5-4ccd-9a74-400e3a1a2fff'::uuid,
    'EQP_0181',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Lock',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '10',
    '1',
    NULL,
    NULL,
    'Tinker''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    181.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'a7003617-74d3-4e48-b63b-d7c1507009e9'::uuid,
    'EQP_0182',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Magnifying Glass',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '100',
    '—',
    NULL,
    NULL,
    'Glassblower''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    182.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'd43577f6-d170-476c-b8d7-0e61fa989104'::uuid,
    'EQP_0183',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Manacles',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '2',
    '6',
    NULL,
    NULL,
    'Tinker''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    183.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '95bc4e8b-75b0-4c5d-ace0-eb608e97e931'::uuid,
    'EQP_0184',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Steel Mirror',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '5',
    '0.5',
    NULL,
    NULL,
    'Tinker''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    184.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'b4c0b524-de06-4e5d-a011-7940b2333c67'::uuid,
    'EQP_0185',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Oil (flask)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '0.1',
    '1',
    NULL,
    NULL,
    'Alchemist''s Supplies',
    'Adventuring gear. See book for description.',
    NULL,
    185.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '38ddab22-6d42-4be5-bc39-09d10ef6c9db'::uuid,
    'EQP_0186',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Paper (one sheet)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '0.2',
    '—',
    NULL,
    NULL,
    'Alchemist''s Supplies',
    'Adventuring gear. See book for description.',
    NULL,
    186.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '6dd6e9c9-0a3d-448e-a7bf-bf133fb0f912'::uuid,
    'EQP_0187',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Parchment (one sheet)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '0.1',
    '—',
    NULL,
    NULL,
    'Leatherworker''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    187.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '86fb22df-0ccc-4dfb-9921-c24a0761d81b'::uuid,
    'EQP_0188',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Perfume (vial)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '5',
    '—',
    NULL,
    NULL,
    'Alchemist''s Supplies',
    'Adventuring gear. See book for description.',
    NULL,
    188.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '79521c2e-759c-4dcf-b62d-a0ce437506b0'::uuid,
    'EQP_0189',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Miner''s Pick',
    '2014',
    ARRAY['PHB2014']::text[],
    '2',
    '10',
    NULL,
    NULL,
    'Smith''s Tools',
    'Adventuring gear.',
    NULL,
    189.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'abc813cc-aa17-436c-a199-c0c362b01e58'::uuid,
    'EQP_0190',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Piton',
    '2014',
    ARRAY['PHB2014']::text[],
    '0.05',
    '0.25',
    '0.02',
    NULL,
    'Smith''s Tools',
    'Adventuring gear.',
    NULL,
    190.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '4a6df6d7-79be-4cd8-bbaf-e61a372c31d4'::uuid,
    'EQP_0191',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Basic Poison (Vial)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '100',
    '—',
    NULL,
    NULL,
    'Poisoner''s Kit',
    'Adventuring gear. See book for description.',
    'As Adventuring Gear, this fetches half price when sold (50 GP)',
    191.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'ca9875f3-980a-42c8-896f-53848138c05b'::uuid,
    'EQP_0192',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Pole (10-foot)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '0.05',
    '7',
    '0.02',
    NULL,
    'Carpenter''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    192.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '64a469db-209e-4e39-b8c4-a5e8bf89b251'::uuid,
    'EQP_0193',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Iron Pot',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '2',
    '10',
    NULL,
    NULL,
    'Smith''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    193.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'be94685a-c45c-4173-bfb0-5216e68a8154'::uuid,
    'EQP_0194',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Potion of Healing',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '50',
    '0.5',
    NULL,
    '1',
    'Herbalism Kit',
    'Potion. See book for description.',
    NULL,
    194.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'b1459a3d-4e08-40c8-8a7e-ce550e602a39'::uuid,
    'EQP_0195',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Pouch',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '0.5',
    '1',
    NULL,
    NULL,
    'Leatherworker''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    195.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'dc6431c6-c3f8-4e10-9610-641df04b2ae4'::uuid,
    'EQP_0196',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Quiver',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '1',
    '1',
    NULL,
    NULL,
    'Leatherworker''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    196.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '26a9c341-df02-4a64-8a51-fa5fef32ccff'::uuid,
    'EQP_0197',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Portable Ram',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '4',
    '35',
    NULL,
    NULL,
    'Carpenter''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    197.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'db14bfc3-5119-4a05-b066-60523448465a'::uuid,
    'EQP_0198',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Rations (1 day)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '0.5',
    '2',
    NULL,
    NULL,
    'Cook''s Utensils',
    'Adventuring gear. See book for description.',
    NULL,
    198.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '36cefea6-53ad-4ed4-9f48-482db13a0665'::uuid,
    'EQP_0199',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Robes',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '1',
    '4',
    NULL,
    NULL,
    'Weaver''s Tools',
    'Adventuring gear. See book for description.',
    'Reprinted as "Robe" in 2024',
    199.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '391daaf3-39d9-4cea-a9db-7533a39e675a'::uuid,
    'EQP_0200',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Rope (50 feet)',
    '2024',
    ARRAY['PHB2024']::text[],
    '1',
    '5',
    NULL,
    NULL,
    'Weaver''s Tools',
    'Adventuring gear. See book for description.',
    'Follows the rules for hempen rope in 2014 games',
    200.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'bb6f97ac-2fc7-4a34-993f-010c644fe2ce'::uuid,
    'EQP_0201',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Hempen Rope (50 feet)',
    '2014',
    ARRAY['PHB2014']::text[],
    '1',
    '10',
    NULL,
    NULL,
    'Weaver''s Tools',
    'Adventuring gear. See book for description.',
    'Follows the rules for Rope in 2024 games',
    201.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'a5943f9e-cf90-46dc-822e-18a6e1ccff99'::uuid,
    'EQP_0202',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Silk Rope (50 feet)',
    '2014',
    ARRAY['PHB2014']::text[],
    '10',
    '5',
    NULL,
    NULL,
    'Weaver''s Tools',
    'Adventuring gear. See book for description.',
    'Follows the rules for Rope in 2024 games',
    202.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '698154ca-64c8-4257-91a8-12efa3ce8cf6'::uuid,
    'EQP_0203',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Sack',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '0.01',
    '0.5',
    '0.01',
    NULL,
    'Weaver''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    203.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'f6a3c326-a504-496b-9eb2-b2c821f2e24b'::uuid,
    'EQP_0204',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Merchant''s Scales',
    '2014',
    ARRAY['PHB2014']::text[],
    '5',
    '3',
    NULL,
    NULL,
    'Smith''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    204.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'd052f185-bb50-4d4f-afc3-a760b095edfb'::uuid,
    'EQP_0205',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Sealing Wax',
    '2014',
    ARRAY['PHB2014']::text[],
    '0.5',
    '—',
    NULL,
    NULL,
    'Herbalism Kit',
    'Adventuring gear.',
    NULL,
    205.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'ae202765-769e-40d9-b30a-2ed73a6648c8'::uuid,
    'EQP_0206',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Shovel',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '2',
    '5',
    NULL,
    NULL,
    'Tinker''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    206.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'e52f4894-e4b6-4cdb-a3b9-2d80524e7000'::uuid,
    'EQP_0207',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Signal Whistle',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '0.05',
    '—',
    '0.02',
    NULL,
    'Tinker''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    207.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '56c5ba59-606b-40e9-aae6-6136a3652ec4'::uuid,
    'EQP_0208',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Signet Ring',
    '2014',
    ARRAY['PHB2014']::text[],
    '5',
    '—',
    NULL,
    NULL,
    'Jeweler''s Tools',
    'Adventuring gear.',
    NULL,
    208.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'c0dcdf26-e4ce-4982-bbdb-b5e4bdb6db94'::uuid,
    'EQP_0209',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Soap',
    '2014',
    ARRAY['PHB2014']::text[],
    '0.02',
    '—',
    NULL,
    NULL,
    'Alchemist''s Supplies',
    'Adventuring gear.',
    NULL,
    209.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '74fad5df-71ad-4a2d-aece-9216bff713e1'::uuid,
    'EQP_0210',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Spellbook',
    '2014',
    ARRAY['PHB2014']::text[],
    '50',
    '3',
    '—',
    '—',
    '—',
    'Adventuring gear. See book for description.',
    NULL,
    210.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '9a28cdda-aa0a-471d-aefb-5c93fdbeca9e'::uuid,
    'EQP_0211',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Spell Scroll (Cantrip)',
    '2024',
    ARRAY['PHB2024']::text[],
    '30',
    '—',
    '—',
    '—',
    '—',
    'Magical scroll. See book for description.',
    NULL,
    211.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '699e5d81-d1dd-4f2d-a00b-fb353908fec2'::uuid,
    'EQP_0212',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Spell Scroll (Level 1)',
    '2024',
    ARRAY['PHB2024']::text[],
    '50',
    '—',
    '—',
    '—',
    '—',
    'Magical scroll. See book for description.',
    NULL,
    212.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '298eb9a5-64a8-4bcc-a0e9-79bc66db10ad'::uuid,
    'EQP_0213',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Iron Spikes (10)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '1',
    '5',
    NULL,
    NULL,
    'Smith''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    213.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'c94b13e8-8f97-4cd1-8717-8af57497c4f5'::uuid,
    'EQP_0214',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Spyglass',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '1000',
    '1',
    NULL,
    NULL,
    'Glassblower''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    214.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'bbcb4725-d96c-4962-85c3-9eb91a41ab27'::uuid,
    'EQP_0215',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'String (10 feet)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '0.1',
    '—',
    NULL,
    NULL,
    'Weaver''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    215.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '7e1357d6-d6dc-4246-9610-2798ee3a2ce8'::uuid,
    'EQP_0216',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Two-Person Tent',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '2',
    '20',
    NULL,
    NULL,
    'Weaver''s Tools',
    'Adventuring gear. See book for description.',
    'Reprinted as "Tent" in 2024',
    216.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '0405e385-f278-431a-b6c9-c91f0a2c47fa'::uuid,
    'EQP_0217',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Tinderbox',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '0.5',
    '1',
    NULL,
    NULL,
    'Tinker''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    217.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '23b2421f-bfcf-4040-afe8-495b3975e382'::uuid,
    'EQP_0218',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Torch',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '0.01',
    '1',
    '0.01',
    NULL,
    'Carpenter''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    218.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '9b15fc7c-5f80-4007-945b-02a6ee6e7fee'::uuid,
    'EQP_0219',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Vial',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '1',
    '—',
    NULL,
    NULL,
    'Glassblower''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    219.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'ea1e38ca-fad4-4e89-995d-86b61e0fb0e5'::uuid,
    'EQP_0220',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Waterskin',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '0.2',
    '5 (when full)',
    NULL,
    NULL,
    'Leatherworker''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    220.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'd7fb80e5-d32d-4542-94fa-23cc457a3813'::uuid,
    'EQP_0221',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Whetstone',
    '2014',
    ARRAY['PHB2014']::text[],
    '0.01',
    '1',
    '0.01',
    NULL,
    'Mason''s Tools',
    'Adventuring gear.',
    NULL,
    221.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'f48b861c-b105-4438-abc8-1689e509ef79'::uuid,
    'EQP_0222',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Burglar''s Pack (2014)',
    '2014',
    ARRAY['PHB2014']::text[],
    '16',
    '44.5',
    '—',
    '—',
    '—',
    'Adventuring gear. See book for description.',
    NULL,
    222.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '9854438c-ad79-4259-8892-21197d594b0f'::uuid,
    'EQP_0223',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Burglar''s Pack (2024)',
    '2024',
    ARRAY['PHB2024']::text[],
    '16',
    '47.5',
    '—',
    '—',
    '—',
    'Adventuring gear. See book for description.',
    NULL,
    223.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '10493ec9-b054-4d2e-a113-e19dac3f32e1'::uuid,
    'EQP_0224',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Diplomat''s Pack (2014)',
    '2014',
    ARRAY['PHB2014']::text[],
    '39',
    '36',
    '—',
    '—',
    '—',
    'Adventuring gear. See book for description.',
    NULL,
    224.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '0fc7808b-0b63-4b17-b305-84083bad9fd6'::uuid,
    'EQP_0225',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Diplomat''s Pack (2024)',
    '2024',
    ARRAY['PHB2024']::text[],
    '39',
    '39',
    '—',
    '—',
    '—',
    'Adventuring gear. See book for description.',
    NULL,
    225.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '7b32d604-6e56-490e-891c-d6bc4d50e6d0'::uuid,
    'EQP_0226',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Dungeoneer''s Pack (2014)',
    '2014',
    ARRAY['PHB2014']::text[],
    '12',
    '61.5',
    '—',
    '—',
    '—',
    'Adventuring gear. See book for description.',
    NULL,
    226.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'd1df4cee-0111-49c0-8606-b7f4bf6b633c'::uuid,
    'EQP_0227',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Dungeoneer''s Pack (2024)',
    '2024',
    ARRAY['PHB2024']::text[],
    '12',
    '55',
    '—',
    '—',
    '—',
    'Adventuring gear. See book for description.',
    NULL,
    227.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '49b288f3-764b-4d0d-bd6e-c5dd6150e8bd'::uuid,
    'EQP_0228',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Entertainer''s Pack (2014)',
    '2014',
    ARRAY['PHB2014']::text[],
    '40',
    '38',
    '—',
    '—',
    '—',
    'Adventuring gear. See book for description.',
    NULL,
    228.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'a8be6667-9638-4921-b5c9-1bce829e3133'::uuid,
    'EQP_0229',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Entertainer''s Pack (2024)',
    '2024',
    ARRAY['PHB2024']::text[],
    '40',
    '58.5',
    '—',
    '—',
    '—',
    'Adventuring gear. See book for description.',
    NULL,
    229.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '972e0e9c-f052-49a9-8a16-a6d456548eb9'::uuid,
    'EQP_0230',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Explorer''s Pack (2014)',
    '2014',
    ARRAY['PHB2014']::text[],
    '10',
    '59',
    '—',
    '—',
    '—',
    'Adventuring gear. See book for description.',
    NULL,
    230.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '6346d75b-affe-40b7-b5c0-2fe101e074ae'::uuid,
    'EQP_0231',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Explorer''s Pack (2024)',
    '2024',
    ARRAY['PHB2024']::text[],
    '10',
    '55',
    '—',
    '—',
    '—',
    'Adventuring gear. See book for description.',
    NULL,
    231.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'b43f6439-2c0c-4551-b9b8-68d16a165f31'::uuid,
    'EQP_0232',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Priest''s Pack (2014)',
    '2014',
    ARRAY['PHB2014']::text[],
    '19',
    '24',
    '—',
    '—',
    '—',
    'Adventuring gear. See book for description.',
    NULL,
    232.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'a07697a0-db6e-4ad6-a206-2e99f3b0ccf1'::uuid,
    'EQP_0233',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Priest''s Pack (2024)',
    '2024',
    ARRAY['PHB2024']::text[],
    '33',
    '29',
    '—',
    '—',
    '—',
    'Adventuring gear. See book for description.',
    NULL,
    233.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'fccff65e-d015-440a-84dd-680f938dd2b8'::uuid,
    'EQP_0234',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Scholar''s Pack (2014)',
    '2014',
    ARRAY['PHB2014']::text[],
    '40',
    '10',
    '—',
    '—',
    '—',
    'Adventuring gear. See book for description.',
    NULL,
    234.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '44c2b12f-cdb0-4a7b-9fe0-6021a7a6d10b'::uuid,
    'EQP_0235',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Scholar''s Pack (2024)',
    '2024',
    ARRAY['PHB2024']::text[],
    '40',
    '22',
    '—',
    '—',
    '—',
    'Adventuring gear. See book for description.',
    NULL,
    235.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '1637ebf6-ad00-44b7-a0ed-13ca7e740c92'::uuid,
    'EQP_0236',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Monster Hunter''s Pack',
    '2014',
    ARRAY['VRGR']::text[],
    '33',
    '48.5',
    '—',
    '—',
    '—',
    'Adventuring gear. See book for description.',
    NULL,
    236.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '145b382d-54ff-4c21-80d2-337fb9ce1134'::uuid,
    'EQP_0237',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Bit and bridle',
    '2014',
    ARRAY['PHB2014']::text[],
    '2',
    '1',
    '—',
    '—',
    '—',
    'Tack and harness. See book for description.',
    NULL,
    237.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'a46cfd5f-dc93-4157-92f6-c95ac1e24e77'::uuid,
    'EQP_0238',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Animal Feed (per day)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '0.05',
    '10',
    '—',
    '—',
    '—',
    'Tack and harness. See book for description.',
    NULL,
    238.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '08fcdea9-10f9-4936-b72f-63a4312785a8'::uuid,
    'EQP_0239',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Exotic Saddle',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '60',
    '40',
    '—',
    '—',
    '—',
    'Tack and harness. Required to ride an acquatic or flying mount.  See book for description.',
    NULL,
    239.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '8f2c771c-59da-47b4-8eeb-f9e78cb447da'::uuid,
    'EQP_0240',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Military Saddle',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '20',
    '30',
    '—',
    '—',
    '—',
    'Tack and harness. See book for description.',
    NULL,
    240.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '4be76ede-d4c9-455d-ac6e-c673a7134742'::uuid,
    'EQP_0241',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Pack Saddle',
    '2014',
    ARRAY['PHB2014']::text[],
    '5',
    '15',
    '—',
    '—',
    '—',
    'Tack and harness. See book for description.',
    NULL,
    241.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '41ec55c3-451f-441c-9bad-782bc4db46c8'::uuid,
    'EQP_0242',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Riding Saddle',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '10',
    '25',
    '—',
    '—',
    '—',
    'Tack and harness. See book for description.',
    NULL,
    242.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '62718262-935d-4389-9073-20229d2b07ec'::uuid,
    'EQP_0243',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Saddlebags',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '4',
    '8',
    '—',
    '—',
    '—',
    'Tack and harness. See book for description.',
    NULL,
    243.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '5ee2b497-ccd1-4a13-9086-f03cdeb96135'::uuid,
    'EQP_0244',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Ale (Gallon)',
    '2014',
    ARRAY['PHB2014']::text[],
    '2',
    'N/A',
    '—',
    '—',
    '—',
    'Food and drink. See book for description.',
    NULL,
    244.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '93258a47-9ed9-4a68-96d2-aa611d723082'::uuid,
    'EQP_0245',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Ale (Mug)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '0.04',
    'N/A',
    '—',
    '—',
    '—',
    'Food and drink. See book for description.',
    NULL,
    245.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '643a0756-a1e4-4d01-be84-898333dc18de'::uuid,
    'EQP_0246',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Bread (Loaf)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '0.02',
    'N/A',
    '—',
    '—',
    '—',
    'Food and drink. See book for description.',
    NULL,
    246.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'da97459f-b3a0-4d37-8ba7-9c6b9f13d474'::uuid,
    'EQP_0247',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Cheese (Hunk)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '0.1',
    'N/A',
    '—',
    '—',
    '—',
    'Food and drink. See book for description.',
    'Reprinted as "Chesse (Wedge)" in 2024',
    247.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '41d0e34e-e887-4cc1-8f8c-e699400c9439'::uuid,
    'EQP_0248',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Cheese Bag',
    '2024',
    ARRAY['FRHOF']::text[],
    '1',
    '1',
    '—',
    '—',
    '—',
    'Food and drink. See book for description.',
    'Only one Cheese Bag can be purchased per day per person. If purchasing a Cheese Bag in downtime, you must expend 1 DTP in addition to the gold cost.',
    248.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '368c7103-ca86-4b79-8351-edf790f4906e'::uuid,
    'EQP_0249',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Meat (Chunk)',
    '2014',
    ARRAY['PHB2014']::text[],
    '0.3',
    'N/A',
    '—',
    '—',
    '—',
    'Food and drink. See book for description.',
    NULL,
    249.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '3eb8c4cb-37b7-4b44-9c4d-b7965dc54fa8'::uuid,
    'EQP_0250',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Common Wine (Pitcher)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '0.2',
    'N/A',
    '—',
    '—',
    '—',
    'Food and drink. See book for description.',
    'Reprinted as "Common Wine (Bottle)" in 2024',
    250.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '5f334033-3b7e-4df4-a7f1-fdf72d622b0a'::uuid,
    'EQP_0251',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Fine Wine (Bottle)',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '10',
    'N/A',
    '—',
    '—',
    '—',
    'Food and drink. See book for description.',
    NULL,
    251.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '1f774cf8-e0a6-4602-bbf6-a4ef78a923a3'::uuid,
    'EQP_0252',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Adventurer''s Ring',
    '2024',
    ARRAY['FRHOF']::text[],
    '250',
    '—',
    '—',
    '—',
    '—',
    'T0 Ring. See book for description.',
    'See Allowed Content (Loot) for the requirements to craft this magic item.',
    252.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '35140812-e59b-44b7-a809-2233dbb27a8e'::uuid,
    'EQP_0253',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Backpack Parachute',
    '2014',
    ARRAY['WDH']::text[],
    '500',
    '20',
    '—',
    '—',
    '—',
    'See book for description.',
    'Can only be purchased from the temple of Gond in Waterdeep or other technologically advanced settements such as Lantan or New Nivix',
    253.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'c1505443-fc51-4b21-9eae-eee6a7143054'::uuid,
    'EQP_0254',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Black Sap',
    '2014',
    ARRAY['EGW']::text[],
    '300',
    '—',
    '—',
    '—',
    '—',
    'See book for description.',
    '- Outside of Exandria, this is reflavored as originating from a Black Pudding.
- By default, this is reflavored as not being a drug.
- Can only be purchased by level 5+ characters',
    254.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '6716b57f-7a58-497b-ba5c-1b7e999bbddf'::uuid,
    'EQP_0255',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Basic Fishing Equipment',
    '2014',
    ARRAY['AAG']::text[],
    '0.1',
    '7',
    '—',
    '—',
    '—',
    'See book for description.',
    NULL,
    255.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '20b55357-5c0f-44d3-a64c-df8e8c30eef3'::uuid,
    'EQP_0256',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Beast Whistle',
    '2014',
    ARRAY['HWT']::text[],
    '20',
    '—',
    '—',
    '—',
    '—',
    'See book for description.',
    NULL,
    256.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '049dbf06-7597-4e4d-8ed1-f47f3ba661ed'::uuid,
    'EQP_0257',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Blasting Powder',
    '2014',
    ARRAY['EGW']::text[],
    '35',
    '—',
    '—',
    '—',
    '—',
    'Adventuring gear. See book for description.',
    NULL,
    257.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '032d104a-0e13-485e-9c75-ec9f9d52c187'::uuid,
    'EQP_0258',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Blight Ichor',
    '2014',
    ARRAY['EGW']::text[],
    '200',
    '—',
    '—',
    '—',
    '—',
    'See book for description.',
    '- Outside of Exandria, this is reflavored as originating from Underdark fungi.
- By default, this is reflavored as not being a drug.',
    258.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '2718be1c-f703-4a1c-ab1f-24274900f599'::uuid,
    'EQP_0259',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Bright Fungal Cloak',
    '2024',
    ARRAY['FRHOF']::text[],
    '25',
    '4',
    NULL,
    NULL,
    'Weaver''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    259.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '73df56c9-90c4-4144-8003-b483a845fc88'::uuid,
    'EQP_0260',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Cold Weather Clothing',
    '2014',
    ARRAY['IDRotF']::text[],
    '10',
    '5',
    NULL,
    NULL,
    'Weaver''s Tools',
    'Adventuring gear. See book for description.',
    'Can only be purchased from Hawthorne or arctic settlements',
    260.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'a4739c90-54e2-4a50-b31c-73439ae78b57'::uuid,
    'EQP_0261',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Crampons',
    '2014',
    ARRAY['IDRotF']::text[],
    '2',
    '0.25',
    NULL,
    NULL,
    'Cobbler''s Tools',
    'Adventuring gear. See book for description.',
    'Can only be purchased from Hawthorne or arctic settlements',
    261.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '2641cff3-5997-4e23-a22e-4b44b4b8882b'::uuid,
    'EQP_0262',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Desert Clothing',
    '2024',
    ARRAY['FRHOF']::text[],
    '10',
    '4',
    NULL,
    NULL,
    'Weaver''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    262.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'd3d7f21d-f2ef-4644-abe1-0f36f94f115a'::uuid,
    'EQP_0263',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Designer Clothes',
    '2014',
    ARRAY['HWT']::text[],
    '30',
    '6',
    '—',
    '—',
    '—',
    'See book for description.',
    'Can be reflavored as not originating from Zephyr & Co. in Everden',
    263.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '3ea07fcb-1727-441c-945d-e11a6e08b810'::uuid,
    'EQP_0264',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Devil Mask',
    '2024',
    ARRAY['FRHOF']::text[],
    '25',
    '—',
    NULL,
    NULL,
    'Weaver''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    264.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'ef440547-0269-42e4-a1ee-1a651c0503e4'::uuid,
    'EQP_0265',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Dreamlily',
    '2014',
    ARRAY['ERLW']::text[],
    '300',
    '—',
    '—',
    '—',
    '—',
    'See book for description.',
    'By default, this is reflavored as not being a drug.',
    265.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'bfaea285-42e1-4a15-8a38-42b179051d49'::uuid,
    'EQP_0266',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Explosive Seed',
    '2014',
    ARRAY['EGW']::text[],
    '30',
    '—',
    '—',
    '—',
    '—',
    'See book for description.',
    NULL,
    266.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'c8b6b00a-7212-4f94-8e0b-b4e36d25c229'::uuid,
    'EQP_0267',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Fargab',
    '2014',
    ARRAY['DSotDQ']::text[],
    '2000',
    '30',
    '—',
    '—',
    '—',
    'Adventuring gear. See book for description.',
    'Can only be purchased from the temple of Gond in Waterdeep or other technologically advanced settements such as Lantan or New Nivix',
    267.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '523210dc-f485-48d4-abcd-1093f8f151d3'::uuid,
    'EQP_0268',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Garb of Light and Shadow',
    '2024',
    ARRAY['FRHOF']::text[],
    '50',
    '6',
    NULL,
    NULL,
    'Weaver''s Tools',
    'Adventuring gear. See book for description.',
    'The Domain of Delight associated with this garb should be noted in the downtime or session log in which it is acquired, such as the Gloaming Court or the Summer Court',
    268.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'd7df8b5e-67b3-47d9-bcbc-4567b6208846'::uuid,
    'EQP_0269',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Genie Robe',
    '2024',
    ARRAY['FRHOF']::text[],
    '50',
    '6',
    NULL,
    NULL,
    'Weaver''s Tools',
    'Adventuring gear. See book for description.',
    'The Elemental Plane associated with this robe should be noted in the downtime or session log in which it is acquired, such as the Elemental Plane of Air or the Elemental Plane of Fire',
    269.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'd2c764c5-1740-4585-a0b6-d8ac0775d2d0'::uuid,
    'EQP_0270',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Insect Repellent (Block of Incense)',
    '2014',
    ARRAY['ToA']::text[],
    '0.1',
    '—',
    '—',
    '—',
    '—',
    'Adventuring gear. See book for description.',
    NULL,
    270.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'a6ee109b-e8ea-4223-a852-f50d8dc6c885'::uuid,
    'EQP_0271',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Insect Repellent (Greasy Salve)',
    '2014',
    ARRAY['ToA']::text[],
    '1',
    '—',
    '—',
    '—',
    '—',
    'Adventuring gear. See book for description.',
    NULL,
    271.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '5f8abb80-8a9d-4089-92db-e318b1d040e8'::uuid,
    'EQP_0272',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Locking Spellbook',
    '2024',
    ARRAY['FRHOF']::text[],
    '35',
    '3',
    '—',
    '—',
    '—',
    'Adventuring gear. See book for description.',
    NULL,
    272.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '90b61fdc-852b-4b63-98ed-75581df3b417'::uuid,
    'EQP_0273',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Mechanical Wonder (Domestic)',
    '2024',
    ARRAY['FRHOF']::text[],
    '400',
    '—',
    '—',
    '—',
    '—',
    'T1 Wondrous Item. See book for description.',
    'See Allowed Content (Loot) for the requirements to craft this magic item.',
    273.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '2bb3800b-7a07-42ca-9121-87a2bdc5c95d'::uuid,
    'EQP_0274',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Menga Leaves (1 ounce)',
    '2014',
    ARRAY['ToA']::text[],
    '2',
    '0.0625',
    '—',
    '—',
    '—',
    'See book for description.',
    'Can only be purchased in Port Nyanzaru and other settlements in Chult',
    274.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'aa47036e-3a0a-477d-8030-2f2d3c958952'::uuid,
    'EQP_0275',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Monster Camouflage',
    '2024',
    ARRAY['FRHOF']::text[],
    '50',
    '6',
    NULL,
    NULL,
    'Weaver''s Tools',
    'Adventuring gear. See book for description.',
    'The Beast or Monstrosity this camouflage resembles should be noted in the downtime or session log in which it is acquired, such as an Owlbear',
    275.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '33d60f98-a95d-4f63-b011-0ea128191896'::uuid,
    'EQP_0276',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Muroosa Balm',
    '2014',
    ARRAY['EGW']::text[],
    '100',
    '—',
    '—',
    '—',
    '—',
    'See book for description.',
    'A dose of Muroosa Balm sufficient to treat sunburn costs only 1 GP.',
    276.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '39be6bc6-982e-4ec1-b875-be4b4db3914e'::uuid,
    'EQP_0277',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Narycrash',
    '2014',
    ARRAY['DSotDQ']::text[],
    '500',
    '20',
    '—',
    '—',
    '—',
    'See book for description.',
    'Can only be purchased from the temple of Gond in Waterdeep or other technologically advanced settements such as Lantan or New Nivix',
    277.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '72be7790-2f7e-41e4-a884-84edaba33d84'::uuid,
    'EQP_0278',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Olisuba Leaf',
    '2014',
    ARRAY['EGW']::text[],
    '50',
    '—',
    '—',
    '—',
    '—',
    'See book for description.',
    NULL,
    278.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '15a81fd4-51a1-4c2d-b3a2-3dc7c6a0dde8'::uuid,
    'EQP_0279',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Pressure Capsule',
    '2014',
    ARRAY['GoS']::text[],
    '500',
    '—',
    '—',
    '—',
    '—',
    'Wondrous magic item. See book for description.',
    '- Can only be purchased in Hawthorne and other major port towns or cities.
- Lasts 8 hours',
    279.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '6a53eda2-929a-4548-8718-c4e4d273a123'::uuid,
    'EQP_0280',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Pride Silk',
    '2014',
    ARRAY['EGW']::text[],
    '100',
    '1',
    NULL,
    NULL,
    'Weaver''s Tools',
    'Adventuring gear. See book for description.',
    'Can only be purchased in Hawthorne and other major towns or cities',
    280.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '4057462f-9a82-4092-888a-2b9ba7b298a0'::uuid,
    'EQP_0281',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Pride Silk Outfit',
    '2014',
    ARRAY['EGW']::text[],
    '500',
    '4',
    NULL,
    NULL,
    'Weaver''s Tools',
    'Adventuring gear. See book for description.',
    'Can only be purchased in Hawthorne and other major towns or cities',
    281.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '5b11accf-7361-4364-bf11-98d4284477f4'::uuid,
    'EQP_0282',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Prosthetic Limb',
    '2024',
    ARRAY['FRHOF', 'DMG2024', 'TCE']::text[],
    '0',
    '—',
    '—',
    '—',
    '—',
    'T0 Wondrous Item. See book for description.',
    '- Can only be purchased by a PC missing a limb or on behalf of a creature missing a limb
- Does not require attunement.
- A PC can start with this item at character creation as a substitute for a missing limb. A Prosthetic Limb possessed at character creation in this way cannot be traded.
- See Allowed Content (Loot) for the requirements to craft this magic item.',
    282.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '3f348524-ccfb-40c1-971d-bf13dcbffb0a'::uuid,
    'EQP_0283',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Rain Catcher',
    '2014',
    ARRAY['ToA']::text[],
    '1',
    '5',
    NULL,
    NULL,
    'Leatherworker''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    283.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'd5f8a13d-6f46-4ad6-8d0d-4e1e6e833c2a'::uuid,
    'EQP_0284',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Ryath Root',
    '2014',
    ARRAY['ToA']::text[],
    '50',
    '—',
    '—',
    '—',
    '—',
    'See book for description.',
    'Can only be purchased in Port Nyanzaru and other settlements in Chult',
    284.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'c06b0224-c048-441d-9340-101d76986d03'::uuid,
    'EQP_0285',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Sinda Berries (10)',
    '2014',
    ARRAY['ToA']::text[],
    '5',
    '—',
    '—',
    '—',
    '—',
    'See book for description.',
    'Can only be purchased in Port Nyanzaru and other settlements in Chult',
    285.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '62ee1323-e01b-4e89-bd92-c0f686de7acb'::uuid,
    'EQP_0286',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Steppe Rations',
    '2014',
    ARRAY['HWT']::text[],
    '200',
    '0.5',
    '—',
    '—',
    '—',
    'See book for description.',
    NULL,
    286.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '862d8556-ee71-447c-9ed6-129cb982099c'::uuid,
    'EQP_0287',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Smokepowder (Packet)',
    '2014',
    ARRAY['WDH']::text[],
    '35',
    '—',
    '—',
    '—',
    '—',
    'See book for description.',
    NULL,
    287.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '803fa8a5-111b-4a04-80b9-2d65e2c9350b'::uuid,
    'EQP_0288',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Smokepowder (Keg)',
    '2014',
    ARRAY['WDH']::text[],
    '250',
    '—',
    '—',
    '—',
    '—',
    'See book for description.',
    NULL,
    288.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '6344ab08-126c-41c6-9263-6eb6ac770a0d'::uuid,
    'EQP_0289',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Snowshoes',
    '2014',
    ARRAY['IDRotF']::text[],
    '2',
    '4',
    NULL,
    NULL,
    'Cobbler''s Tools',
    'Adventuring gear. See book for description.',
    'Can only be purchased from Hawthorne or arctic settlements',
    289.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'abbe438f-1372-435c-8009-cded6820b187'::uuid,
    'EQP_0290',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Soothsalts',
    '2014',
    ARRAY['EGW']::text[],
    '150',
    '—',
    '—',
    '—',
    '—',
    'See book for description.',
    '- Outside of Exandria, this is reflavored as originating from crystalline deposits in mines of various mountains.
- By default, this is reflavored as not being a drug.',
    290.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '69f1ae0a-66aa-46dd-bead-4141f0fc2c4a'::uuid,
    'EQP_0291',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Spelljamming Helm',
    '2014',
    ARRAY['AAG']::text[],
    '7500',
    '—',
    '—',
    '—',
    '—',
    'See book for description.',
    'Can only be purchased from the Rock of Bral or other major settlements in Wildspace or the Astral Sea',
    291.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '024570dd-9035-4fb8-9d0e-b8907f62aa76'::uuid,
    'EQP_0292',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Tej (1 gallon cask)',
    '2014',
    ARRAY['ToA']::text[],
    '0.2',
    'N/A',
    '—',
    '—',
    '—',
    'See book for description.',
    'Can only be purchased in Port Nyanzaru and other settlements in Chult. Costs 3 SP (0.3 GP) in Fort Belurian.',
    292.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'fc854a64-e67a-4d0d-96ad-fb368714efa4'::uuid,
    'EQP_0293',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Tej (mug)',
    '2014',
    ARRAY['ToA']::text[],
    '0.04',
    'N/A',
    '—',
    '—',
    '—',
    'See book for description.',
    'Can only be purchased in Port Nyanzaru and other settlements in Chult. Costs 6 CP (0.06 GP) in Fort Belurian.',
    293.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '7a564af0-c61c-4971-a17b-5aae9d6050b0'::uuid,
    'EQP_0294',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Theki Root',
    '2014',
    ARRAY['EGW']::text[],
    '3',
    '—',
    '—',
    '—',
    '—',
    'See book for description.',
    NULL,
    294.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '305f8128-f500-4be7-83c5-96f2e7004204'::uuid,
    'EQP_0295',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Traveler''s Guide',
    '2014',
    ARRAY['HWT']::text[],
    '25',
    '2',
    '—',
    '—',
    '—',
    'See book for description.',
    'Obtained as providing information on a specific location',
    295.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '52f0f73c-1ee9-4558-8273-934e4dae6255'::uuid,
    'EQP_0296',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Traveler''s Lantern',
    '2014',
    ARRAY['HWT']::text[],
    '12',
    '1',
    NULL,
    NULL,
    'Tinker''s Tools',
    'See book for description.',
    NULL,
    296.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '3d0a636d-f9fe-49ba-82c6-bb3528b60449'::uuid,
    'EQP_0297',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Warm Fungal Clothing',
    '2024',
    ARRAY['FRHOF']::text[],
    '15',
    '4',
    NULL,
    NULL,
    'Weaver''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    297.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '61cb8450-b0a3-4d7e-86d8-2beaab2e4dfb'::uuid,
    'EQP_0298',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Wildroot',
    '2014',
    ARRAY['ToA']::text[],
    '25',
    '—',
    '—',
    '—',
    '—',
    'See book for description.',
    'Can only be purchased in Port Nyanzaru and other settlements in Chult',
    298.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'cc805405-3f02-45fb-9735-3ed6ff47499d'::uuid,
    'EQP_0299',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Willowshade Oil',
    '2014',
    ARRAY['EGW']::text[],
    '300',
    '—',
    '—',
    '—',
    '—',
    'See book for description.',
    NULL,
    299.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '0372924a-af32-41f7-816f-31357c5eaab4'::uuid,
    'EQP_0300',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Windskiff',
    '2024',
    ARRAY['FRHOF']::text[],
    '4000',
    '—',
    '—',
    '—',
    '—',
    'T2 Wondrous Item. See book for description.',
    NULL,
    300.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'c24b242a-f577-4218-ada0-e0d8c2f63f54'::uuid,
    'EQP_0301',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Winter Camouflage',
    '2024',
    ARRAY['FRHOF']::text[],
    '50',
    '4',
    NULL,
    NULL,
    'Weaver''s Tools',
    'Adventuring gear. See book for description.',
    NULL,
    301.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'e31a1f74-0677-40f8-97d1-193f027ed248'::uuid,
    'EQP_0302',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Wukka Nut',
    '2014',
    ARRAY['ToA']::text[],
    '1',
    '—',
    '—',
    '—',
    '—',
    'See book for description.',
    'Can only be purchased in Port Nyanzaru and other settlements in Chult',
    302.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'dbc4f6ca-7734-406b-a9b0-5656baaba9ad'::uuid,
    'EQP_0303',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Yahcha',
    '2014',
    ARRAY['ToA']::text[],
    '1',
    '—',
    '—',
    '—',
    '—',
    'See book for description.',
    'Can only be purchased in Port Nyanzaru and other settlements in Chult',
    303.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '19f4c0e4-e660-476a-87c2-7cfa6aec18d7'::uuid,
    'EQP_0304',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Zabou',
    '2014',
    ARRAY['ToA']::text[],
    '10',
    '—',
    '—',
    '—',
    '—',
    'See book for description.',
    'Can only be purchased in Port Nyanzaru and other settlements in Chult',
    304.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '30e6f361-89e3-486b-aa54-deb7c65d4036'::uuid,
    'EQP_0305',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Flashstick (HB)',
    '2014',
    ARRAY['HHB']::text[],
    '200',
    '—',
    NULL,
    NULL,
    'Alchemist''s Supplies',
    'Adventuring gear

A flashstick is an alchemical, nonmagical item, a long parchment wrapped stick with a short fuse. As an action, a creature can light the fuse and throw the flashstick at a point up to 60 feet away where it detonates. Each creature within 10 feet of a detonating flashstick must succeed on a DC 15 Constitution saving throw or become Blinded for 1 minute. A creature can repeat this saving throw at the end of each of its turns, ending the effect on a success.',
    '- The creator of this homebrew item is greensprout.
- Can only be purchased or crafted by characters that have the Goblin Munitions Renown Perk. Crafting or purchasing this item in this way can only occur in a settlement or stronghold containing members of the Legion of Dread.
- The Legion of Dread has contacts and a presence in the city of Hawthorne.',
    305.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '6c2af905-c8c0-4a51-b099-31e966bfc48d'::uuid,
    'EQP_0306',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Sharper (HB)',
    '2014',
    ARRAY['HHB']::text[],
    '200',
    '—',
    NULL,
    NULL,
    'Alchemist''s Supplies',
    'Adventuring gear

A Sharper is an alchemical, nonmagical item with an spherical brittle iron shell with a short fuse. As an action, a creature can light the fuse and throw the sharper at a point up to 60 feet away where it detonates. Each creature within 10 feet of a detonating sharper must succeed on a DC 15 Dexterity saving throw or take 3d6 Piercing damage and have their Speed reduced to 0 until the end of their next turn.',
    '- The creator of this homebrew item is greensprout.
- Can only be purchased or crafted by characters that have the Goblin Munitions Renown Perk. Crafting or purchasing this item in this way can only occur in a settlement or stronghold containing members of the Legion of Dread.
- The Legion of Dread has contacts and a presence in the city of Hawthorne.',
    306.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '55e4fb82-bd14-4915-ac26-73efca6418f8'::uuid,
    'EQP_0307',
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    '69d73c8e-224f-47d6-83f6-a739042967ea'::uuid,
    'Tosser Grenade (HB)',
    '2014',
    ARRAY['HHB']::text[],
    '200',
    '—',
    NULL,
    NULL,
    'Alchemist''s Supplies',
    'Adventuring gear

A tosser grenade is an alchemical, nonmagical item with an circular clay shell that shatters on impact. As an action, a creature can throw a tosser grenade at a point up to 60 feet away. Each creature within 10 feet of a shattered tosser grenade must succeed on a DC 15 Strength saving throw or take 2d8 Thunder damage and be knocked Prone.',
    '- The creator of this homebrew item is greensprout.
- Can only be purchased or crafted by characters that have the Goblin Munitions Renown Perk. Crafting or purchasing this item in this way can only occur in a settlement or stronghold containing members of the Legion of Dread.
- The Legion of Dread has contacts and a presence in the city of Hawthorne.',
    307.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'f6b2c05f-2c0f-4e82-a85b-c337ffd75896'::uuid,
    'EQP_0308',
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    'Assassin''s Blood',
    '2024',
    ARRAY['DMG2014', 'DMG2024']::text[],
    '150',
    '—',
    NULL,
    NULL,
    'Poisoner''s Kit',
    'Ingested poison. See book for description.',
    NULL,
    308.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '47578c77-f295-48bc-97a1-b0921a53704a'::uuid,
    'EQP_0309',
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    'Burnt Othur Fumes',
    '2024',
    ARRAY['DMG2014', 'DMG2024']::text[],
    '500',
    '—',
    NULL,
    NULL,
    'Poisoner''s Kit',
    'Inhaled poison. See book for description.',
    NULL,
    309.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '9d1bc5c1-308b-4a3c-bde0-e1c5779049f5'::uuid,
    'EQP_0310',
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    'Carrion Crawler Mucus',
    '2024',
    ARRAY['DMG2014', 'DMG2024']::text[],
    '200',
    '—',
    NULL,
    NULL,
    'Poisoner''s Kit',
    'Contact poison. See book for description.',
    NULL,
    310.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '7d5c7ad4-10cf-426a-a073-621e3aa93a9d'::uuid,
    'EQP_0311',
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    'Corruption Poison (HB)',
    '2014',
    ARRAY['HHB']::text[],
    '1500',
    '—',
    NULL,
    NULL,
    'Alchemist''s Supplies or Poisoner''s Kit',
    'Injury Poison.

A creature subjected to this poison must succeed on a DC 19 Constitution saving throw or be Poisoned for 1 minute. They can repeat the saving throw at the end of each of their turns to end the Poisoned condition. While Poisoned in this way, the creature takes 10 (3d6) Force damage at the start of each of their turns.',
    '- Cannot be purchased in downtime
- Only a level 5+ character can craft this poison.
- This is an adaptation of Yserthrax''s Corruption Poison Recipe from Where Evil Lives: The MCDM Book of Boss Battles',
    311.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '84fcee24-247b-474d-a066-108ad4c2a217'::uuid,
    'EQP_0312',
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    'Drow Poison (Lolth''s Sting)',
    '2024',
    ARRAY['DMG2014', 'DMG2024']::text[],
    '200',
    '—',
    NULL,
    NULL,
    'Poisoner''s Kit',
    'Injury poison. See book for description.',
    NULL,
    312.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '7666aaf2-fa0a-4158-8b83-621c5acd9226'::uuid,
    'EQP_0313',
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    'Dust of the Mummy',
    '2014',
    ARRAY['IMR']::text[],
    '250',
    '—',
    NULL,
    NULL,
    'Poisoner''s Kit',
    'Inhaled poison. See book for description.',
    NULL,
    313.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '9ff57ee5-8b1b-457e-9a7b-c13f67d2f652'::uuid,
    'EQP_0314',
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    'Essence of Ether',
    '2024',
    ARRAY['DMG2014', 'DMG2024']::text[],
    '300',
    '—',
    NULL,
    NULL,
    'Poisoner''s Kit',
    'Inhaled poison. See book for description.',
    NULL,
    314.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'd948dc26-011d-4744-8112-43ee2407e5b3'::uuid,
    'EQP_0315',
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    'Firelance Venom',
    '2014',
    ARRAY['HWT']::text[],
    '300',
    '—',
    NULL,
    NULL,
    'Poisoner''s Kit',
    'Injury poison. See book for description.',
    NULL,
    315.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '0a9915b6-3cff-404b-8c5e-fbc295c4e87e'::uuid,
    'EQP_0316',
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    'Malice',
    '2024',
    ARRAY['DMG2014', 'DMG2024']::text[],
    '250',
    '—',
    NULL,
    NULL,
    'Poisoner''s Kit',
    'Inhaled poison. See book for description.',
    NULL,
    316.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'ecc2bc1b-a468-4259-a2d0-9a30fe719c9f'::uuid,
    'EQP_0317',
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    'Midnight Tears',
    '2024',
    ARRAY['DMG2014', 'DMG2024']::text[],
    '1500',
    '—',
    NULL,
    NULL,
    'Poisoner''s Kit',
    'Ingested poison. See book for description.',
    NULL,
    317.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'c85f07a7-2850-4903-bbf2-0c36063a17fa'::uuid,
    'EQP_0318',
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    'Oil of Taggit',
    '2024',
    ARRAY['DMG2014', 'DMG2024']::text[],
    '400',
    '—',
    NULL,
    NULL,
    'Poisoner''s Kit',
    'Contact poison. See book for description.',
    NULL,
    318.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '42c6db28-9253-4b43-a465-c71c5c72ab8c'::uuid,
    'EQP_0319',
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    'Pale Tincture',
    '2024',
    ARRAY['DMG2014', 'DMG2024']::text[],
    '250',
    '—',
    NULL,
    NULL,
    'Poisoner''s Kit',
    'Ingested poison. See book for description.',
    NULL,
    319.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '9bbe225b-adf2-48ed-9ca9-82ebae76d03b'::uuid,
    'EQP_0320',
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    'Purple Worm Poison',
    '2024',
    ARRAY['DMG2014', 'DMG2024']::text[],
    '2000',
    '—',
    NULL,
    NULL,
    'Poisoner''s Kit',
    'Injury poison. See book for description.',
    '- Only a level 5+ character can buy and craft this poison.
- Deals 12d6 Poison damage (DC 19) in 2014 games and 10d6 Poison damage (DC 21) in 2024 games',
    320.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '22194fda-a774-4e4d-b8b8-90d63d3ef418'::uuid,
    'EQP_0321',
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    'Serpent Venom',
    '2024',
    ARRAY['DMG2014', 'DMG2024']::text[],
    '200',
    '—',
    NULL,
    NULL,
    'Poisoner''s Kit',
    'Injury poison. See book for description.',
    NULL,
    321.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '8346a80b-e28f-47f5-913b-a044c61c1628'::uuid,
    'EQP_0322',
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    'Slaad Tadpole Secretion Poison, Red (HB)',
    '2014',
    ARRAY['HHB']::text[],
    '200',
    '—',
    NULL,
    NULL,
    'Poisoner''s Kit',
    'Injury Poison.

A creature subjected to this poison must succeed on a DC 13 Constitution saving throw or have the Poisoned condition until the end of its next turn. The creature''s Speed is also reduced by 10 feet while Poisoned in this way.',
    'The creator of this homebrew item is baba8forever',
    322.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '276c3735-aef7-4205-a2e8-7a062fda9f3a'::uuid,
    'EQP_0323',
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    'Torpor',
    '2024',
    ARRAY['DMG2014', 'DMG2024']::text[],
    '600',
    '—',
    NULL,
    NULL,
    'Poisoner''s Kit',
    'Ingested poison. See book for description.',
    NULL,
    323.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '65a0d803-9e37-44ac-ad46-6b9e5179581e'::uuid,
    'EQP_0324',
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    'Truth Serum',
    '2024',
    ARRAY['DMG2014', 'DMG2024']::text[],
    '150',
    '—',
    NULL,
    NULL,
    'Poisoner''s Kit',
    'Ingested poison. See book for description.',
    NULL,
    324.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '38284056-f1bf-4d85-8c3b-5bff7bbf9a12'::uuid,
    'EQP_0325',
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    'Wyvern Poison',
    '2024',
    ARRAY['DMG2014', 'DMG2024']::text[],
    '1200',
    '—',
    NULL,
    NULL,
    'Poisoner''s Kit',
    'Injury poison. See book for description.',
    'Only a level 5+ character can buy and craft this poison.',
    325.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '308294a2-cf9f-4a6f-9a8c-9d7af90e87f3'::uuid,
    'EQP_0326',
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    '1fb5e836-20e4-4c8b-9b7f-cca82f3d8cc3'::uuid,
    'Dancing Monkey Fruit',
    '2014',
    ARRAY['ToA']::text[],
    '5',
    '—',
    '—',
    '—',
    '—',
    'Magical fruit. See book for description.',
    'Can only be purchased in Port Nyanzaru and other settlements in Chult',
    326.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '570b2fc7-44c3-475c-bced-41ad86df5c01'::uuid,
    'EQP_0327',
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    'Adamantine Bar',
    '2014',
    ARRAY['WDH']::text[],
    '1000',
    '10',
    '—',
    '—',
    '—',
    NULL,
    NULL,
    327.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'fe12bed7-2ffc-49f5-b8fc-6b2d212c257b'::uuid,
    'EQP_0328',
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    'Canvas (1 square yard)',
    '2024',
    ARRAY['PHB2014', 'DMG2024']::text[],
    '0.1',
    '—',
    '—',
    '—',
    '—',
    NULL,
    NULL,
    328.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'b42dc125-010b-4714-8204-de19b80c3c82'::uuid,
    'EQP_0329',
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    'Chicken',
    '2024',
    ARRAY['PHB2014', 'DMG2024']::text[],
    '0.02',
    'Varies',
    '—',
    '—',
    '—',
    NULL,
    NULL,
    329.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '7c32ad3d-8b79-4348-8d66-3749d8817e1a'::uuid,
    'EQP_0330',
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    'Cinnamon',
    '2024',
    ARRAY['PHB2014', 'DMG2024']::text[],
    '2',
    '1',
    '—',
    '—',
    '—',
    NULL,
    NULL,
    330.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '2aaccbaf-463e-4544-9f6b-2e16b45d47d0'::uuid,
    'EQP_0331',
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    'Cloves',
    '2024',
    ARRAY['PHB2014', 'DMG2024']::text[],
    '3',
    '1',
    '—',
    '—',
    '—',
    NULL,
    NULL,
    331.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'f89f8084-ce7f-4f6c-8281-1f33b4ce7673'::uuid,
    'EQP_0332',
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    'Cocoa Beans (HB)',
    '2014',
    ARRAY['HHB']::text[],
    '10',
    '1',
    '—',
    '—',
    '—',
    NULL,
    'Sold in Hawthorne and other major port towns or cities',
    332.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '5a81ec9e-cf0d-4b14-ae0a-ae451b611d54'::uuid,
    'EQP_0333',
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    'Copper',
    '2024',
    ARRAY['PHB2014', 'DMG2024']::text[],
    '0.5',
    '1',
    '—',
    '—',
    '—',
    NULL,
    NULL,
    333.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'd15d86c1-fd14-4995-9b8e-9eac92d08719'::uuid,
    'EQP_0334',
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    'Cotton Cloth (1 square yard)',
    '2024',
    ARRAY['PHB2014', 'DMG2024']::text[],
    '0.5',
    '—',
    '—',
    '—',
    '—',
    NULL,
    NULL,
    334.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '27647506-7f7a-4d62-94f6-c9e5f0d58e56'::uuid,
    'EQP_0335',
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    'Cow',
    '2024',
    ARRAY['PHB2014', 'DMG2024']::text[],
    '10',
    'Varies',
    '—',
    '—',
    '—',
    NULL,
    NULL,
    335.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'a7fffef9-8327-4bf8-9ebd-439211781a3c'::uuid,
    'EQP_0336',
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    'Dustbloom Spices',
    '2014',
    ARRAY['HWT']::text[],
    '5',
    '1',
    '—',
    '—',
    '—',
    NULL,
    'Can be reflavored as originating from desert locales not only in Everden',
    336.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '2a90843a-bb29-4d00-a728-a8f3e8d8f4eb'::uuid,
    'EQP_0337',
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    'Elderberry Everwine',
    '2014',
    ARRAY['HWT']::text[],
    '25',
    '2',
    '—',
    '—',
    '—',
    NULL,
    'Can be reflavored as exceptionally fine wine not only from Everden',
    337.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '0d02fcb5-a997-4018-b689-66c1c14d05ed'::uuid,
    'EQP_0338',
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    'Flour',
    '2024',
    ARRAY['PHB2014', 'DMG2024']::text[],
    '0.02',
    '1',
    '—',
    '—',
    '—',
    NULL,
    NULL,
    338.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'a3522aa0-edb0-4e4f-a97b-2dc4b1010fca'::uuid,
    'EQP_0339',
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    'Gasparian Tree Nuts',
    '2014',
    ARRAY['HWT']::text[],
    '2',
    '1',
    '—',
    '—',
    '—',
    NULL,
    'Can be reflavored as exotic tree nuts from island locales not only in Everden',
    339.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '398cb06b-37d5-4ea1-831b-c3cd72f0136e'::uuid,
    'EQP_0340',
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    'Ginger',
    '2024',
    ARRAY['PHB2014', 'DMG2024']::text[],
    '1',
    '1',
    '—',
    '—',
    '—',
    NULL,
    NULL,
    340.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '0afb52b2-5a4c-4a65-88b3-208801810a97'::uuid,
    'EQP_0341',
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    'Goat',
    '2024',
    ARRAY['PHB2014', 'DMG2024']::text[],
    '1',
    'Varies',
    '—',
    '—',
    '—',
    NULL,
    NULL,
    341.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '6ba365c0-fc48-45a4-be77-0298fccee24b'::uuid,
    'EQP_0342',
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    'Gold',
    '2024',
    ARRAY['PHB2014', 'DMG2024']::text[],
    '50',
    '1',
    '—',
    '—',
    '—',
    NULL,
    NULL,
    342.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'e5f827ec-efb6-4fae-9b05-0f0214ec48bd'::uuid,
    'EQP_0343',
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    'Gold Bar (5-pound)',
    '2024',
    ARRAY['DMG2024']::text[],
    '250',
    '5',
    '—',
    '—',
    '—',
    NULL,
    NULL,
    343.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '944652d4-6529-4537-b805-333d111fee70'::uuid,
    'EQP_0344',
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    'Imported Fruits',
    '2014',
    ARRAY['HWT']::text[],
    '3',
    '1',
    '—',
    '—',
    '—',
    NULL,
    NULL,
    344.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'c70140af-6d25-45ba-b2c1-e75386409a4f'::uuid,
    'EQP_0345',
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    'Iron',
    '2024',
    ARRAY['PHB2014', 'DMG2024']::text[],
    '0.1',
    '1',
    '—',
    '—',
    '—',
    NULL,
    NULL,
    345.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '96942f5b-f57c-439c-85f1-89f81f8ae321'::uuid,
    'EQP_0346',
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    'Linen (1 square yard)',
    '2024',
    ARRAY['PHB2014', 'DMG2024']::text[],
    '5',
    '—',
    '—',
    '—',
    '—',
    NULL,
    NULL,
    346.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'd4d9db2d-0ee9-4fe0-9c9c-93c6c378c9a6'::uuid,
    'EQP_0347',
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    'Noble''s Jewelry',
    '2014',
    ARRAY['HWT']::text[],
    '150',
    '1',
    '—',
    '—',
    '—',
    NULL,
    'Can be acquired as custom made for an additional 10 GP (for a total of 160 GP)',
    347.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '5c9627ba-f9c6-4a49-8457-9947ab1ca432'::uuid,
    'EQP_0348',
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    'Ox',
    '2024',
    ARRAY['PHB2014', 'DMG2024']::text[],
    '15',
    'Varies',
    '—',
    '—',
    '—',
    NULL,
    NULL,
    348.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '3a7cb9c5-e78d-43dc-a9a2-db7668aa681f'::uuid,
    'EQP_0349',
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    'Pepper',
    '2024',
    ARRAY['PHB2014', 'DMG2024']::text[],
    '2',
    '1',
    '—',
    '—',
    '—',
    NULL,
    NULL,
    349.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '7f96a19b-2185-4e75-9699-73ce417ee5ee'::uuid,
    'EQP_0350',
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    'Perfume (HWT)',
    '2014',
    ARRAY['HWT']::text[],
    '20',
    '—',
    '—',
    '—',
    '—',
    NULL,
    NULL,
    350.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '7d37bad8-99a8-4287-82ad-49c4ec8c8eea'::uuid,
    'EQP_0351',
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    'Pig',
    '2024',
    ARRAY['PHB2014', 'DMG2024']::text[],
    '3',
    'Varies',
    '—',
    '—',
    '—',
    NULL,
    NULL,
    351.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'fcd2604f-996d-4610-86b4-5ea2e816b667'::uuid,
    'EQP_0352',
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    'Platinum',
    '2024',
    ARRAY['PHB2014', 'DMG2024']::text[],
    '500',
    '1',
    '—',
    '—',
    '—',
    NULL,
    NULL,
    352.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '79eedd4c-f730-464e-b0b4-30e7ba7166b8'::uuid,
    'EQP_0353',
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    'Saffron',
    '2024',
    ARRAY['PHB2014', 'DMG2024']::text[],
    '15',
    '1',
    '—',
    '—',
    '—',
    NULL,
    NULL,
    353.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '0e9283b3-206c-4e51-9fa8-d55e192be75e'::uuid,
    'EQP_0354',
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    'Salt',
    '2024',
    ARRAY['PHB2014', 'DMG2024']::text[],
    '0.05',
    '1',
    '—',
    '—',
    '—',
    NULL,
    NULL,
    354.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'a680cb90-493e-469b-a37a-67ace952b83e'::uuid,
    'EQP_0355',
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    'Sheep',
    '2024',
    ARRAY['PHB2014', 'DMG2024']::text[],
    '2',
    'Varies',
    '—',
    '—',
    '—',
    NULL,
    NULL,
    355.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'c0f986df-4ea5-46fe-80ec-24887bbba611'::uuid,
    'EQP_0356',
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    'Silk (1 square yard)',
    '2024',
    ARRAY['PHB2014', 'DMG2024']::text[],
    '10',
    '—',
    '—',
    '—',
    '—',
    NULL,
    NULL,
    356.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '92a4ffc6-b0d7-4715-9bef-e099ebce9a7c'::uuid,
    'EQP_0357',
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    'Silver',
    '2024',
    ARRAY['PHB2014', 'DMG2024']::text[],
    '5',
    '1',
    '—',
    '—',
    '—',
    NULL,
    NULL,
    357.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '1eb1a4fb-6e20-40b0-a192-6ce09fb57c57'::uuid,
    'EQP_0358',
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    'Silver Bar (2-pound)',
    '2024',
    ARRAY['PHB2014', 'DMG2024']::text[],
    '10',
    '2',
    '—',
    '—',
    '—',
    NULL,
    NULL,
    358.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '99de2793-2d32-48ee-8c38-eec4d513a0c0'::uuid,
    'EQP_0359',
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    'Silver Bar (5-pound)',
    '2024',
    ARRAY['PHB2014', 'DMG2024']::text[],
    '25',
    '5',
    '—',
    '—',
    '—',
    NULL,
    NULL,
    359.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '48bb6ea7-7e96-44c2-afe1-c879184dc099'::uuid,
    'EQP_0360',
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    'Tea',
    '2014',
    ARRAY['HWT']::text[],
    '5',
    '1',
    '—',
    '—',
    '—',
    NULL,
    NULL,
    360.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'f2dd36e0-f6bc-4ca1-aec2-0009c6f93b23'::uuid,
    'EQP_0495',
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    '466707c2-47e3-4759-b4b4-75d1250c6444'::uuid,
    'Wheat',
    '2024',
    ARRAY['PHB2014', 'DMG2024']::text[],
    '0.01',
    '1',
    '—',
    '—',
    '—',
    NULL,
    NULL,
    361.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'da64d25b-f5a6-4657-9f88-d90dd4f8e619'::uuid,
    'EQP_0361',
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'Camel',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '50',
    'Varies',
    '—',
    '—',
    '—',
    'Mount. See book for description.',
    NULL,
    362.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '36a0d908-bdf3-4e1e-9c63-fc187c7dcaa3'::uuid,
    'EQP_0362',
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'Donkey',
    '2014',
    ARRAY['PHB2014']::text[],
    '8',
    'Varies',
    '—',
    '—',
    '—',
    'Mount. See book for description.',
    NULL,
    363.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '9fef2d13-1d44-4a10-be4b-235d1f1d1965'::uuid,
    'EQP_0363',
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'Mule',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '8',
    'Varies',
    '—',
    '—',
    '—',
    'Mount. See book for description.',
    NULL,
    364.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'c5b2557e-6863-4c72-a2e1-94eccc3a757a'::uuid,
    'EQP_0364',
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'Elephant',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '200',
    'Varies',
    '—',
    '—',
    '—',
    'Mount. See book for description.',
    NULL,
    365.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'f90dc882-89a5-4839-bfac-992776ff33e2'::uuid,
    'EQP_0365',
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'Draft Horse',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '50',
    'Varies',
    '—',
    '—',
    '—',
    'Mount. See book for description.',
    NULL,
    366.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '52cfc974-26d9-42a2-bae8-4bd9f89038c5'::uuid,
    'EQP_0366',
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'Riding Horse',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '75',
    'Varies',
    '—',
    '—',
    '—',
    'Mount. See book for description.',
    NULL,
    367.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '6c10e543-4000-48dd-93fb-fb5417e73fbe'::uuid,
    'EQP_0367',
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'Mastiff',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '25',
    'Varies',
    '—',
    '—',
    '—',
    'Mount. See book for description.',
    NULL,
    368.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '9851c240-7522-4a00-8435-c2029d86e2e4'::uuid,
    'EQP_0368',
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'Pony',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '30',
    'Varies',
    '—',
    '—',
    '—',
    'Mount. See book for description.',
    NULL,
    369.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'b28cf404-a953-4b69-9a83-7e9d6492a11d'::uuid,
    'EQP_0369',
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'Warhorse',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '400',
    'Varies',
    '—',
    '—',
    '—',
    'Mount. See book for description.',
    NULL,
    370.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '10598410-e911-4cff-b82e-18d301478040'::uuid,
    'EQP_0370',
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'Ankylosaurus',
    '2014',
    ARRAY['ToA']::text[],
    '250',
    'Varies',
    '—',
    '—',
    '—',
    'Mount. See book for description.',
    '- Can only be purchased in Port Nyanzaru
- Cannot be transported through Port Nyanzaru''s teleportation circle in the Temple of Savras',
    371.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'f7a13d6e-453c-4da3-afa0-93a747be0a7f'::uuid,
    'EQP_0371',
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'Axe Beak',
    '2024',
    ARRAY['FRHOF', 'IDRotF']::text[],
    '50',
    'Varies',
    '—',
    '—',
    '—',
    'Mount. See book for description.',
    NULL,
    372.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '3e2cf353-38e6-4d94-be6a-b0e85060f129'::uuid,
    'EQP_0372',
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'Deinonychus',
    '2014',
    ARRAY['VGM', 'MPMM', 'ToA']::text[],
    '250',
    'Varies',
    '—',
    '—',
    '—',
    'Mount. See book for description.',
    'Can only be purchased in Port Nyanzaru',
    373.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '12c4cfe4-f41f-495b-97cc-c821919f7988'::uuid,
    'EQP_0373',
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'Female Steeder',
    '2014',
    ARRAY['MTF', 'MPMM']::text[],
    '400',
    'Varies',
    '—',
    '—',
    '—',
    'Mount. See book for description.',
    'Can only be purchased in Underdark settlements',
    374.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'aaab1606-0458-4fbd-953e-a3d2ec941186'::uuid,
    'EQP_0374',
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'Gadabout',
    '2014',
    ARRAY['MCV1_SC']::text[],
    '2500',
    'Varies',
    '—',
    '—',
    '—',
    'Mount. See book for description.',
    '- Only level 5+ characters can purchase and benefit from a gadabout
- Can only be purchased from the Rock of Bral or other major settlements in Wildspace or the Astral Sea',
    375.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'c36422c4-e67b-4d4f-8622-e9c10e5dcb51'::uuid,
    'EQP_0375',
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'Giant Lizard',
    '2014',
    ARRAY['MM2014', 'ToA']::text[],
    '100',
    'Varies',
    '—',
    '—',
    '—',
    'Mount. See book for description.',
    '- Can only be purchased in Port Nyanzaru or Underdark settlements
- Cannot be transported through Port Nyanzaru''s teleportation circle in the Temple of Savras',
    376.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'abe72a6d-59ec-4d97-9f4e-6cd550845a48'::uuid,
    'EQP_0376',
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'Hadrosaurus',
    '2014',
    ARRAY['VGM', 'MPMM', 'ToA']::text[],
    '100',
    'Varies',
    '—',
    '—',
    '—',
    'Mount. See book for description.',
    '- Can only be purchased in Port Nyanzaru
- Cannot be transported through Port Nyanzaru''s teleportation circle in the Temple of Savras',
    377.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'fbc56731-b124-43b0-bec0-c656d503e63c'::uuid,
    'EQP_0377',
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'Moorbounder',
    '2014',
    ARRAY['EGW']::text[],
    '400',
    'Varies',
    '—',
    '—',
    '—',
    'Mount. See book for description.',
    'Can only be purchased in settlements in the Hordelands',
    378.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '380be9c8-be61-487a-a869-b63f8425669d'::uuid,
    'EQP_0378',
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'Sled Dog',
    '2024',
    ARRAY['FRHOF', 'IDRotF']::text[],
    '50',
    'Varies',
    '—',
    '—',
    '—',
    'Mount. See book for description.',
    NULL,
    379.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'b55b8a0f-a3f9-4748-8f20-f36a3e9317f7'::uuid,
    'EQP_0379',
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'e7b2a552-80ec-453e-85c7-e09e3b6630d7'::uuid,
    'Triceratops',
    '2014',
    ARRAY['VGM', 'MPMM', 'ToA']::text[],
    '500',
    'Varies',
    '—',
    '—',
    '—',
    'Mount. See book for description.',
    '- Can only be purchased in Port Nyanzaru
- Cannot be transported through Port Nyanzaru''s teleportation circle in the Temple of Savras',
    380.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '58f3b63e-3c65-453b-aaa6-6f76ded906c0'::uuid,
    'EQP_0380',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Carriage',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '100',
    '600',
    '—',
    '—',
    '—',
    'Land vehicle. See book for description.',
    NULL,
    381.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '8e4598c5-78d4-46e8-997d-9f84afd0ae6f'::uuid,
    'EQP_0381',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Cart',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '15',
    '200',
    '—',
    '—',
    '—',
    'Land vehicle. See book for description.',
    NULL,
    382.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '29bc9a06-3f84-40d8-8617-a558d01f3e61'::uuid,
    'EQP_0382',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Chariot',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '250',
    '100',
    '—',
    '—',
    '—',
    'Land vehicle. See book for description.',
    NULL,
    383.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '292334ac-fcf1-4f89-87a1-d9ea0c925689'::uuid,
    'EQP_0383',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Sled',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '20',
    '300',
    '—',
    '—',
    '—',
    'Land vehicle. See book for description.',
    NULL,
    384.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'b16860b8-c571-4182-a001-db33222ac552'::uuid,
    'EQP_0384',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Wagon',
    '2024',
    ARRAY['PHB2014', 'PHB2024']::text[],
    '35',
    '400',
    '—',
    '—',
    '—',
    'Land vehicle. See book for description.',
    NULL,
    385.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '9cfca375-7739-4d9b-885a-0024d3fc092a'::uuid,
    'EQP_0385',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Canoe',
    '2014',
    ARRAY['ToA']::text[],
    '50',
    '100',
    '—',
    '—',
    '—',
    'Water vehicle. See book for description.',
    '- Superior Ship Upgrades can''t be installed onto a Canoe.
- Vehicle Upgrades can''t be installed onto a Canoe.',
    386.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'dcfa6040-2027-4b06-af4a-a7a22fc24571'::uuid,
    'EQP_0386',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Covered Wagon',
    '2024',
    ARRAY['FRHOF']::text[],
    '250',
    '1300',
    '—',
    '—',
    '—',
    'Land vehicle. See book for description.',
    NULL,
    387.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '0ca61bc9-7169-4c26-95f6-17cd2597ff2e'::uuid,
    'EQP_0387',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Dogsled',
    '2014',
    ARRAY['IDRotF']::text[],
    '20',
    '300',
    '—',
    '—',
    '—',
    'Land vehicle. See book for description.',
    NULL,
    388.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'c7ced67a-fead-4b22-abdb-f784c38619ee'::uuid,
    'EQP_0388',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Devil''s Ride',
    '2014',
    ARRAY['BGDIA']::text[],
    '1500*',
    '500',
    '—',
    '—',
    '—',
    'Land vehicle and infernal war machine. See book for description.',
    '- Typically found in the Nine Hells. Can only be purchased during an adventure or as otherwise overseen by a DM.
- Uses the rules for infernal war machines as listed in Baldur''s Gate: Descent into Avernus, including requiring Soul Coins to use the vehicle.
- An infernal war machine can be repaired as described in Downtime.
- A Devil''s Ride has no weapon stations and can''t accept any new weapon stations as Infernal War Machine Upgrades.

* Can also instead be purchased for 4 Soul Coins',
    389.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'b8a3356b-e9aa-4ed6-8d2b-f874caea2149'::uuid,
    'EQP_0389',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Demon Grinder',
    '2014',
    ARRAY['BGDIA']::text[],
    '10000*',
    '12000',
    '—',
    '—',
    '—',
    'Land vehicle and infernal war machine. See book for description.',
    '- Typically found in the Nine Hells. Can only be purchased during an adventure or as otherwise overseen by a DM.
- Uses the rules for infernal war machines as listed in Baldur''s Gate: Descent into Avernus, including requiring Soul Coins to use the vehicle.
- An infernal war machine can be repaired as described in Downtime.
- A Demon Grinder has 4 weapon stations and can swap them with new weapon stations as Infernal War Machine Upgrades.

* Can also instead be purchased for 8 Soul Coins',
    390.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '7c027bcc-fd65-417b-a75b-d67abaa98726'::uuid,
    'EQP_0390',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Tormentor',
    '2014',
    ARRAY['BGDIA']::text[],
    '3000*',
    '3000',
    '—',
    '—',
    '—',
    'Land vehicle and infernal war machine. See book for description.',
    '- Typically found in the Nine Hells. Can only be purchased during an adventure or as otherwise overseen by a DM.
- Uses the rules for infernal war machines as listed in Baldur''s Gate: Descent into Avernus, including requiring Soul Coins to use the vehicle.
- An infernal war machine can be repaired as described in Downtime.
- A Tormentor has 1 weapon station and can swap it with a new weapon station as Infernal War Machine Upgrades.

* Can also instead be purchased for 4 Soul Coins',
    391.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'c619e048-51ab-4a51-b34b-37eb0f1ef621'::uuid,
    'EQP_0391',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Scavenger',
    '2014',
    ARRAY['BGDIA']::text[],
    '7500*',
    '9000',
    '—',
    '—',
    '—',
    'Land vehicle and infernal war machine. See book for description.',
    '- Typically found in the Nine Hells. Can only be purchased during an adventure or as otherwise overseen by a DM.
- Uses the rules for infernal war machines as listed in Baldur''s Gate: Descent into Avernus, including requiring Soul Coins to use the vehicle.
- An infernal war machine can be repaired as described in Downtime.
- A Scavenger has 3 weapon stations and can swap them with new weapon stations as Infernal War Machine Upgrades.

* Can also instead be purchased for 8 Soul Coins',
    392.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '49ef484a-3cc8-4cde-8ecc-f8158c3c8e0f'::uuid,
    'EQP_0392',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Airship',
    '2024',
    ARRAY['PHB2024']::text[],
    '40000',
    '—',
    '—',
    '—',
    '—',
    'Air vehicle. See book for description.',
    'Can be oufitted with up to 4 ballistas or other shipboard siege weapons (must be purchased separately)',
    393.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'ba2c135d-2133-4f48-8cc9-96c8ee131bfc'::uuid,
    'EQP_0393',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Battle Balloon',
    '2014',
    ARRAY['AcqInc']::text[],
    '60000',
    '—',
    '—',
    '—',
    '—',
    'Air vehicle. See book for description.',
    'The Harpoon Gun can also be replaced with another shipboard siege weapon (must be purchased to replace).',
    394.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '6367ccd3-d3ed-45ea-b7fb-58afc81b5ab8'::uuid,
    'EQP_0394',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Mechanical Beholder',
    '2014',
    ARRAY['AcqInc']::text[],
    '75000',
    '—',
    '—',
    '—',
    '—',
    'Air vehicle. See book for description.',
    'Can''t be turned into a mobile Bastion',
    395.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'ca69b61a-f6f7-415d-a3fa-c0b61db757c0'::uuid,
    'EQP_0395',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Skyship',
    '2014',
    ARRAY['EGW']::text[],
    '100000',
    '—',
    '—',
    '—',
    '—',
    'Air vehicle. See book for description.',
    'Can be oufitted with up to 4 ballistas or other shipboard siege weapons (must be purchased separately)',
    396.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '2d661aad-a913-451c-a219-bf21315beb88'::uuid,
    'EQP_0396',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Lyrandar Air Cruiser',
    '2024',
    ARRAY['EFA']::text[],
    '50000',
    '—',
    '—',
    '—',
    '—',
    'Elemental air vehicle. See book for description.',
    '- Can only be purchased in Khorvaire or another region in Eberron with dragonmarked houses present.
- A creature without the Mark of the Storm can''t operate this vehicle''s helm except as described in chapter 7 of Eberron: Forge of the Artificer
- The Shipbuilder’s Guild assignment for the Guildhall Special Facility for Bastions can only be used to construct this air vehicle if your Bastion is in Khorvaire or another region in Eberron with dragonmarked houses present and you have 25+ Renown Score with House Lyrandar.
- Besides the Helm, the listed crew stations can be exchanged for either shipboard Siege Weapons or other crew stations as Vehicle Upgrades',
    397.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '165db419-5ee1-42f5-b178-6892279aa817'::uuid,
    'EQP_0397',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Lyrandar Skyskiff',
    '2024',
    ARRAY['EFA']::text[],
    '20000',
    '—',
    '—',
    '—',
    '—',
    'Elemental air vehicle. See book for description.',
    '- Can only be purchased in Khorvaire or another region in Eberron with dragonmarked houses present.
- A creature without the Mark of the Storm can''t operate this vehicle''s helm except as described in chapter 7 of Eberron: Forge of the Artificer
- The Shipbuilder’s Guild assignment for the Guildhall Special Facility for Bastions can only be used to construct this air vehicle if your Bastion is in Khorvaire or another region in Eberron with dragonmarked houses present and you have 25+ Renown Score with House Lyrandar.
- Besides the Helm, the listed crew stations can be exchanged for either shipboard Siege Weapons or other crew stations as Vehicle Upgrades',
    398.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'a509182e-502e-45e9-8420-6062a1438878'::uuid,
    'EQP_0398',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Strider Airship',
    '2024',
    ARRAY['EFA']::text[],
    '40000',
    '—',
    '—',
    '—',
    '—',
    'Elemental air vehicle. See book for description.',
    '- Can only be purchased in Khorvaire or another region in Eberron with dragonmarked houses present.
- A creature without the Mark of the Storm can''t operate this vehicle''s helm except as described in chapter 7 of Eberron: Forge of the Artificer
- The Shipbuilder’s Guild assignment for the Guildhall Special Facility for Bastions can only be used to construct this air vehicle if your Bastion is in Khorvaire or another region in Eberron with dragonmarked houses present and you have 25+ Renown Score with House Lyrandar.
- Besides the Helm, the listed crew stations can be exchanged for either shipboard Siege Weapons or other crew stations as Vehicle Upgrades',
    399.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '6bc0ee21-cf78-4eff-8647-6f547d87ad27'::uuid,
    'EQP_0399',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Hot Air Balloon (HB)',
    '2014',
    ARRAY['HHB']::text[],
    '1000',
    '—',
    '—',
    '—',
    '—',
    'Large vehicle (air)

Creature Capacity 1 crew, 3 passengers
Cargo Capacity —
Travel Pace 3 miles per hour in the direction of the wind

Basket
Armor Class 11
Hit Points 27
Damage Immunities Poison, Psychic
This Large wicker basket can carry up to 750 pounds.

Control and Movement: Balloon
Armor Class 11
Hit Points 15
Damage Immunities Poison, Psychic
Speed (air). 30 feet in the direction of the wind. 
This Huge balloon provides the lift. If the balloon drops to 0 Hit Points, it bursts and the vehicle loses the ability to fly.

For the hot air balloon to rise into the air, the balloon must be filled with heated air over the course of 10 minutes using the burner and 1 gallon of Oil (the equivalent of 8 flasks of Oil). The burner uses Oil as fuel, with 1 gallon of Oil (the equivalent of 8 flasks of Oil) able to provide 1 hour of flight. The burner can hold up to 5 gallons of Oil (the equivalent of 40 flasks of Oil) at a time.

A creature piloting the hot air balloon can take an action to increase the heat provided by the burner, allowing the hot air balloon to ascend up to 30 feet. A creature piloting the hot air balloon can also take an action to pull a cord to open a vent flap at the top of the balloon to allow hot air to escape, allowing the hot air balloon to descend up to 30 feet. This top vent flap of the balloon, 20 feet above the basket, can also be reached by flying up or climbing the balloon''s rigging. 

The hot air balloon has no propulsion but instead relies on existing wind currents. By ascending or descending the hot air balloon, it is possible to find wind currents moving in different directions to "steer" the hot air balloon. A pilot or passenger can make Wisdom (Survival) checks in order to attempt to discern the direction of different wind currents. 

As long as the balloon or basket has at least 1 Hit Point, it can be repaired using the rules for repairing vehicles.',
    '- The creator of this homebrew item is salah_ad_din
- This vehicle can''t be used to travel in downtime except as overseen by a DM
- Superior Ship Upgrades can''t be installed onto a Hot Air Balloon
- Can''t be turned into a mobile Bastion',
    400.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '10339829-bea4-49a5-ad72-6e7625479b8c'::uuid,
    'EQP_0400',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Galley',
    '2024',
    ARRAY['DMG2014', 'PHB2024', 'GoS']::text[],
    '30000',
    '—',
    '—',
    '—',
    '—',
    'Water vehicle. See book for description.',
    '- Can only be purchased in major port cities
- Can be oufitted with up to 4 ballistas and up to 2 manongels (must be purchased separately). Each can also be replaced with other shipboard siege weapons via purchasing.',
    401.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '44c21859-63f3-4338-8b47-058df57fc875'::uuid,
    'EQP_0401',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Keelboat',
    '2024',
    ARRAY['DMG2014', 'PHB2024', 'GoS']::text[],
    '3000',
    '—',
    '—',
    '—',
    '—',
    'Water vehicle. See book for description.',
    '- Can only be purchased in Hawthorne and other port cities
- Can be oufitted with up to 1 ballista or another shipboard siege weapon (must be purchased separately).',
    402.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '84964c7e-8f94-4957-b6f5-db0388bc4318'::uuid,
    'EQP_0402',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Longship',
    '2024',
    ARRAY['DMG2014', 'PHB2024', 'GoS']::text[],
    '10000',
    '—',
    '—',
    '—',
    '—',
    'Water vehicle. See book for description.',
    'Can only be purchased in Hawthorne and other port cities',
    403.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '93f7de6b-f3fc-47be-a30f-4c62d30dc51f'::uuid,
    'EQP_0403',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Rowboat',
    '2024',
    ARRAY['DMG2014', 'PHB2024', 'GoS']::text[],
    '50',
    '100',
    '—',
    '—',
    '—',
    'Water vehicle. See book for description.',
    'Can''t be turned into a mobile Bastion',
    404.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '2d5fded6-ffce-4bef-a79c-34065054ff64'::uuid,
    'EQP_0404',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Sailing Ship',
    '2024',
    ARRAY['DMG2014', 'PHB2024', 'GoS']::text[],
    '10000',
    '—',
    '—',
    '—',
    '—',
    'Water vehicle. See book for description.',
    '- Can only be purchased in Hawthorne and other port cities
- Can be oufitted with up to 1 ballista and 1 mangonel (must be purchased separately). Each can also be replaced with other shipboard siege weapons via purchasing.',
    405.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'c07c5d25-f57a-45f2-a24e-2aea33b09887'::uuid,
    'EQP_0405',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Warship',
    '2024',
    ARRAY['DMG2014', 'PHB2024', 'GoS']::text[],
    '25000',
    '—',
    '—',
    '—',
    '—',
    'Water vehicle. See book for description.',
    '- Can only be purchased in major port cities
- Can be outfitted with up to 2 ballistas and 2 mangonels (must be purchased separately). Each can also be replaced with other shipboard siege weapons via purchasing.',
    406.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'fe829441-e755-4e74-b91b-53e4952fce19'::uuid,
    'EQP_0406',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Ffolk Sailing Ship',
    '2024',
    ARRAY['FRAIF']::text[],
    '20000',
    '—',
    '—',
    '—',
    '—',
    'Water vehicle. See book for description.',
    '- Can only be purchased in Hawthorne and other port cities
- Can be oufitted with up to 1 ballista and 1 mangonel (must be purchased separately). Each can also be replaced with other shipboard siege weapons via purchasing.',
    407.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'ae8c7e04-08b9-4ac3-b485-de169e245a4e'::uuid,
    'EQP_0407',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Norlander Longship',
    '2024',
    ARRAY['FRAIF']::text[],
    '10000',
    '—',
    '—',
    '—',
    '—',
    'Water vehicle. See book for description.',
    'Can only be purchased in Hawthorne and other port cities',
    408.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '51882be9-438e-41d8-9050-156751bdadb8'::uuid,
    'EQP_0408',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Rusted Hulk',
    '2024',
    ARRAY['FRAIF']::text[],
    '50000',
    '—',
    '—',
    '—',
    '—',
    'Water vehicle. See book for description.',
    '- Can only be purchased in major port cities
- Can be outfitted with up to 2 ballistas and 2 mangonels (must be purchased separately). Each can also be replaced with other shipboard siege weapons via purchasing.',
    409.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '28002af8-e38d-4fa6-abfc-28138b31efd7'::uuid,
    'EQP_0409',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Whaleboat',
    '2024',
    ARRAY['FRAIF']::text[],
    '500',
    '—',
    '—',
    '—',
    '—',
    'Water vehicle. See book for description.',
    '- Can only be purchased in Hawthorne and other port cities
- Can''t be turned into a mobile Bastion',
    410.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '71905a71-91bf-4158-9a55-eff008b12d0f'::uuid,
    'EQP_0410',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Bombard',
    '2014',
    ARRAY['AAG']::text[],
    '50000',
    '—',
    '—',
    '—',
    '—',
    'Space vehicle. See book for description.',
    '- Can only be purchased in the Rock of Bral or other major settlements in Wildspace or the Astral Sea
- Giant cannon balls are not included in the cost and must be separately purchased. This vehicle can hold up to 14 giant cannon balls at a time.
- Ballistas and ballista bolts are not included in the cost and must be separately purchased. Can also be replaced with other shipboard siege weapons via purchasing.
- Can safely float on and sail in water, but cannot safely land on the ground.',
    411.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '62f64a84-bec8-453e-824c-bf3c8b41d36f'::uuid,
    'EQP_0411',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Damselfly Ship',
    '2014',
    ARRAY['AAG']::text[],
    '20000',
    '—',
    '—',
    '—',
    '—',
    'Space vehicle. See book for description.',
    '- Can only be purchased in the Rock of Bral or other major settlements in Wildspace or the Astral Sea
- Ballista, ballista bolts, and mangonel are not included in the cost and must be separately purchased. Each can also be replaced with other shipboard siege weapons via purchasing.
- Can be landed safely on the ground but cannot float in or land in water.',
    412.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'd2f8f14e-828d-43ec-9e91-17e3a95c7f81'::uuid,
    'EQP_0412',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Flying Fish Ship',
    '2014',
    ARRAY['AAG']::text[],
    '20000',
    '—',
    '—',
    '—',
    '—',
    'Space vehicle. See book for description.',
    '- Can only be purchased in the Rock of Bral or other major settlements in Wildspace or the Astral Sea
- Ballista, ballista bolts, and mangonel are not included in the cost and must be separately purchased. Each can also be replaced with other shipboard siege weapons via purchasing.
- Can safely float on and sail in water, but cannot safely land on the ground.',
    413.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '71560d6a-1312-418f-9dd9-8b59b0404fb9'::uuid,
    'EQP_0413',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Hammerhead Ship',
    '2014',
    ARRAY['AAG']::text[],
    '40000',
    '—',
    '—',
    '—',
    '—',
    'Space vehicle. See book for description.',
    '- Can only be purchased in the Rock of Bral or other major settlements in Wildspace or the Astral Sea
- Ballista, ballista bolts, and mangonel are not included in the cost and must be separately purchased. Each can also be replaced with other shipboard siege weapons via purchasing.
- Can safely float on and sail in water, but cannot safely land on the ground.',
    414.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '6d1b6e03-9774-4472-b548-cf6c9a1e28ad'::uuid,
    'EQP_0414',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Lamprey Ship',
    '2014',
    ARRAY['AAG']::text[],
    '20000',
    '—',
    '—',
    '—',
    '—',
    'Space vehicle. See book for description.',
    '- Can only be purchased in the Rock of Bral or other major settlements in Wildspace or the Astral Sea
- Ballistas and ballista bolts are not included in the cost and must be separately purchased. Each can also be replaced with other shipboard siege weapons via purchasing.
- Can safely float (but not sail) in water, but cannot safely land on the ground.',
    415.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '1a8275f2-474f-47fa-a6ee-c47938797f81'::uuid,
    'EQP_0415',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Living Ship',
    '2014',
    ARRAY['AAG']::text[],
    '25000',
    '—',
    '—',
    '—',
    '—',
    'Space vehicle. See book for description.',
    '- Can only be purchased in the Rock of Bral or other major settlements in Wildspace or the Astral Sea
- Ballista and ballista bolts are not included in the cost and must be separately purchased. Each can also be replaced with other shipboard siege weapons via purchasing.
- Can safely float on and sail in water, but cannot safely land on the ground.
- The treant restores the ship''s hull to full Hit Points between adventures (no DTP required)',
    416.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'e09f7f79-c613-4c12-bd2e-533b8eefa557'::uuid,
    'EQP_0416',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Nautiloid',
    '2014',
    ARRAY['AAG']::text[],
    '50000',
    '—',
    '—',
    '—',
    '—',
    'Space vehicle. See book for description.',
    '- Can only be purchased in the Rock of Bral or other major settlements in Wildspace or the Astral Sea
- Ballistas, ballista bolts, and mangonels are not included in the cost and must be separately purchased. Each can also be replaced with other shipboard siege weapons via purchasing.
- Can''t land on ground or water
- Planar travel using a nautiloid follows the existing rules for traveling to a location beyond Faerun in downtime. Otherwise, it can only occur during an adventure or as otherwise overseen by a DM.',
    417.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '692a8458-83cd-4b21-bca4-fbce952d7164'::uuid,
    'EQP_0417',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Nightspider',
    '2014',
    ARRAY['AAG']::text[],
    '50000',
    '—',
    '—',
    '—',
    '—',
    'Space vehicle. See book for description.',
    '- Can only be purchased in the Rock of Bral or other major settlements in Wildspace or the Astral Sea
- Ballistas, ballista bolts, and mangonel are not included in the cost and must be separately purchased. Each can also be replaced with other shipboard siege weapons via purchasing.
- Can''t land on ground or water',
    418.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '8281caf9-9db5-483f-9bf2-54d30bc1a11f'::uuid,
    'EQP_0418',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Scorpion Ship',
    '2014',
    ARRAY['AAG']::text[],
    '25000',
    '—',
    '—',
    '—',
    '—',
    'Space vehicle. See book for description.',
    '- Can only be purchased in the Rock of Bral or other major settlements in Wildspace or the Astral Sea
- Ballista, ballista bolts, and mangonel are not included in the cost and must be separately purchased. Each can also be replaced with other shipboard siege weapons via purchasing.
- Can be landed safely on the ground but cannot float in or land in water.',
    419.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'ff8694ce-d16f-4c9b-ae57-a20eb8c91922'::uuid,
    'EQP_0419',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Shrike Ship',
    '2014',
    ARRAY['AAG']::text[],
    '20000',
    '—',
    '—',
    '—',
    '—',
    'Space vehicle. See book for description.',
    '- Can only be purchased in the Rock of Bral or other major settlements in Wildspace or the Astral Sea
- Ballistas and ballista bolts are not included in the cost and must be separately purchased. Each can also be replaced with other shipboard siege weapons via purchasing.
- Can be landed safely on the ground and can float on (but not sail in) water',
    420.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '04c44195-c9c2-4540-9730-e1c44dae7851'::uuid,
    'EQP_0420',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Space Galleon',
    '2014',
    ARRAY['AAG']::text[],
    '30000',
    '—',
    '—',
    '—',
    '—',
    'Space vehicle. See book for description.',
    '- Can only be purchased in the Rock of Bral or other major settlements in Wildspace or the Astral Sea
- Ballistas, ballista bolts, and mangonel are not included in the cost and must be separately purchased. Each can also be replaced with other shipboard siege weapons via purchasing.
- Can safely float on and sail in water, but cannot safely land on the ground.',
    421.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'df69d6dc-d633-4bfc-93ce-77211528f859'::uuid,
    'EQP_0421',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Squid Ship',
    '2014',
    ARRAY['AAG']::text[],
    '25000',
    '—',
    '—',
    '—',
    '—',
    'Space vehicle. See book for description.',
    '- Can only be purchased in the Rock of Bral or other major settlements in Wildspace or the Astral Sea
- Ballistas, ballista bolts, and mangonel are not included in the cost and must be separately purchased. Each can also be replaced with other shipboard siege weapons via purchasing.
- Can safely float on and sail in water and also can safely land on the ground',
    422.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '0d348a18-00bf-465d-9cc8-ff0f842f7442'::uuid,
    'EQP_0422',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Star Moth',
    '2014',
    ARRAY['AAG']::text[],
    '40000',
    '—',
    '—',
    '—',
    '—',
    'Space vehicle. See book for description.',
    '- Can only be purchased in the Rock of Bral or other major settlements in Wildspace or the Astral Sea
- Ballistas, ballista bolts, and mangonel are not included in the cost and must be separately purchased. Each can also be replaced with other shipboard siege weapons via purchasing.
- Can safely float (but not sail) in water and also can safely land on the ground',
    423.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'e4db715b-e676-468d-9825-15e2fd29d5cc'::uuid,
    'EQP_0423',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Turtle Ship',
    '2014',
    ARRAY['AAG']::text[],
    '40000',
    '—',
    '—',
    '—',
    '—',
    'Space vehicle. See book for description.',
    '- Can only be purchased in the Rock of Bral or other major settlements in Wildspace or the Astral Sea
- Ballistas, ballista bolts, and mangonel are not included in the cost and must be separately purchased. Each can also be replaced with other shipboard siege weapons via purchasing.
- Can safely float on and sail in water and also can safely land on the ground
- Can travel underwater, but can''t use weapons while underwater',
    424.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '54803195-942e-4651-ab07-f9fa88d72f37'::uuid,
    'EQP_0424',
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    '5f3cb2b9-239b-432a-ad07-5f03d1252736'::uuid,
    'Wasp Ship',
    '2014',
    ARRAY['AAG']::text[],
    '20000',
    '—',
    '—',
    '—',
    '—',
    'Space vehicle. See book for description.',
    '- Can only be purchased in the Rock of Bral or other major settlements in Wildspace or the Astral Sea
- Ballistas and ballista bolts are not included in the cost and must be separately purchased. Each can also be replaced with other shipboard siege weapons via purchasing.
- Can be landed safely on the ground but cannot float in or land in water.',
    425.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'd372a8d3-95b1-4657-9824-60ce4794312f'::uuid,
    'EQP_0430',
    'bd206c15-d3f0-4346-a7a9-60d5c56ac01d'::uuid,
    'bd206c15-d3f0-4346-a7a9-60d5c56ac01d'::uuid,
    'AC Upgrade',
    '2024',
    ARRAY['EFA']::text[],
    '15000',
    '—',
    '—',
    '—',
    '—',
    'Increasing a vehicle''s AC by 1. A vehicle can only receive this upgrade up to 5 times.',
    '- Can only be installed onto an air, space, or water vehicle while it is berthed and costs 30 DTP to install in addition to the gold cost. Can also be installed onto an infernal war machine.
- A vehicle can only receive this upgrade up to 5 times.',
    426.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '62bd35ec-83bb-4b42-b467-e9841a415c6e'::uuid,
    'EQP_0431',
    'bd206c15-d3f0-4346-a7a9-60d5c56ac01d'::uuid,
    'bd206c15-d3f0-4346-a7a9-60d5c56ac01d'::uuid,
    'HP Upgrade',
    '2024',
    ARRAY['EFA']::text[],
    '10% of a vehicle''s gold cost',
    '—',
    '—',
    '—',
    '—',
    'Increasing a vehicle''s current and maximum HP by 20. A vehicle can only receive this upgrade up to 5 times.',
    '- Can only be installed onto an air, space, or water vehicle while it is berthed and costs 30 DTP to install in addition to the gold cost. Can also be installed onto an infernal war machine.
- A vehicle can only receive this upgrade up to 5 times.
- This upgrade stacks with the Reinforced Hull Superior Ship Upgrade, regardless of which is applied first.',
    427.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '43dac932-bb18-43c9-98d6-9ae84e166d96'::uuid,
    'EQP_0432',
    'bd206c15-d3f0-4346-a7a9-60d5c56ac01d'::uuid,
    'bd206c15-d3f0-4346-a7a9-60d5c56ac01d'::uuid,
    'Elemental Core',
    '2024',
    ARRAY['EFA']::text[],
    '10000',
    '—',
    '—',
    '—',
    '—',
    'Elemental core for air, space, or water vehicle required to turn one into an elemental vehicle.',
    '- Can only be installed onto an air, space, or water vehicle that doesn''t already have an elemental core. 
- A vehicle with an elemental core also needs an elemental helm in order to fly using the elemental core.
- Can only be be acquired from and installed on a vehicle berthed in a city in Khorvaire or another region in Eberron with dragonmarked houses present.
- Costs 15,000 GP and 14 DTP to install in addition to the gold cost to acquire, as a vehicle''s hull must be modified in order to use an elemental core.',
    428.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '7894f804-460e-4665-ada0-9d665e1b9fb3'::uuid,
    'EQP_0433',
    'bd206c15-d3f0-4346-a7a9-60d5c56ac01d'::uuid,
    'bd206c15-d3f0-4346-a7a9-60d5c56ac01d'::uuid,
    'Helm',
    '2024',
    ARRAY['EFA']::text[],
    '7500',
    '—',
    '—',
    '—',
    '—',
    'Elemental helm required for an elemental vehicle to fly using its elemental core.',
    '- Can only be installed onto an air, space, or water vehicle that has an elemental core but that doesn''t already have an elemental Helm 
- An elemental Helm is required for a vehicle with an elemental core to fly using the elemental core.
- Can only be be acquired from and installed on a vehicle berthed in a city in Khorvaire or another region in Eberron with dragonmarked houses present.
- Costs 14 DTP to install in addition to the gold cost to acquire.',
    429.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '65dbafe4-960a-4547-9360-1c457bfb3369'::uuid,
    'EQP_0434',
    'bd206c15-d3f0-4346-a7a9-60d5c56ac01d'::uuid,
    'bd206c15-d3f0-4346-a7a9-60d5c56ac01d'::uuid,
    'Elemental Thrusters',
    '2024',
    ARRAY['EFA']::text[],
    '7500',
    '—',
    '—',
    '—',
    '—',
    'Crew station for elemental vehicle.',
    '- Can only be installed onto a vehicle with an elemental core, such as a Lyrandar Airship, a Lyrandar Skyskiff, or a Strider Airship
- Can be added to an elemental vehicle without needing to replace another crew station.
- Can only be be acquired from and installed on a vehicle berthed in a city in Khorvaire or another region in Eberron with dragonmarked houses present.
- Costs 14 DTP to install in addition to the gold cost to acquire.',
    430.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'a0780483-9437-48e0-9c72-71ac9c06f31a'::uuid,
    'EQP_0435',
    'bd206c15-d3f0-4346-a7a9-60d5c56ac01d'::uuid,
    'bd206c15-d3f0-4346-a7a9-60d5c56ac01d'::uuid,
    'Repair Clamps',
    '2024',
    ARRAY['EFA']::text[],
    '5000',
    '—',
    '—',
    '—',
    '—',
    'Crew station for elemental vehicle.',
    '- Can only be installed onto a vehicle with an elemental core, such as a Lyrandar Airship, a Lyrandar Skyskiff, or a Strider Airship
- Can be added to an elemental vehicle without needing to replace another crew station.
- Can only be be acquired from and installed on a vehicle berthed in a city in Khorvaire or another region in Eberron with dragonmarked houses present.
- Costs 14 DTP to install in addition to the gold cost to acquire.
- Can also be operated by a creature that can cast the Mending spell instead of just those with the Mark of Making',
    431.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'd9d20e10-8e33-40c6-bc67-8ef58eba84d8'::uuid,
    'EQP_0436',
    'bd206c15-d3f0-4346-a7a9-60d5c56ac01d'::uuid,
    'bd206c15-d3f0-4346-a7a9-60d5c56ac01d'::uuid,
    'Sky Veil',
    '2024',
    ARRAY['EFA']::text[],
    '15000',
    '—',
    '—',
    '—',
    '—',
    'Crew station for elemental vehicle.',
    '- Can only be installed onto a vehicle with an elemental core, such as a Lyrandar Airship, a Lyrandar Skyskiff, or a Strider Airship
- Can be added to an elemental vehicle without needing to replace another crew station.
- Can only be be acquired from and installed on a vehicle berthed in a city in Khorvaire or another region in Eberron with dragonmarked houses present.
- Costs 14 DTP to install in addition to the gold cost to acquire.',
    432.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'a2911a3e-b4ee-444a-a0b9-f3bce42813f8'::uuid,
    'EQP_0437',
    'bd206c15-d3f0-4346-a7a9-60d5c56ac01d'::uuid,
    'bd206c15-d3f0-4346-a7a9-60d5c56ac01d'::uuid,
    'Arcane Launcher',
    '2024',
    ARRAY['EFA']::text[],
    '4000',
    '—',
    '—',
    '—',
    '—',
    'Crew station for elemental vehicle.',
    '- Can only be installed onto a vehicle with an elemental core, such as a Lyrandar Airship, a Lyrandar Skyskiff, or a Strider Airship
- Replaces either existing shipboard siege weapon or crew station on the vehicle (except for an Elemental Helm, Elemental Thrusters, Repair Clamps, or Sky Veil)
- Can only be be acquired from and installed on a vehicle berthed in a city in Khorvaire or another region in Eberron with dragonmarked houses present.
- Costs 14 DTP to install in addition to the gold cost to acquire.',
    433.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'f7462249-56bf-4f88-a902-5783736debe5'::uuid,
    'EQP_0438',
    'bd206c15-d3f0-4346-a7a9-60d5c56ac01d'::uuid,
    'bd206c15-d3f0-4346-a7a9-60d5c56ac01d'::uuid,
    'Lightning Turret',
    '2024',
    ARRAY['EFA']::text[],
    '4500',
    '—',
    '—',
    '—',
    '—',
    'Crew station for elemental vehicle.',
    '- Can only be installed onto a vehicle with an elemental core, such as a Lyrandar Airship, a Lyrandar Skyskiff, or a Strider Airship
- Replaces either existing shipboard siege weapon or crew station on the vehicle (except for an Elemental Helm, Elemental Thrusters, Repair Clamps, or Sky Veil)
- Can only be be acquired from and installed on a vehicle berthed in a city in Khorvaire or another region in Eberron with dragonmarked houses present.
- Costs 14 DTP to install in addition to the gold cost to acquire.
- Can also be operated by a creature that can cast the Mending spell instead of just those with the Mark of Making',
    434.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'a5810b7b-2726-414f-b081-d1a64f3214bf'::uuid,
    'EQP_0439',
    'bd206c15-d3f0-4346-a7a9-60d5c56ac01d'::uuid,
    'bd206c15-d3f0-4346-a7a9-60d5c56ac01d'::uuid,
    'Tow Cable',
    '2024',
    ARRAY['EFA']::text[],
    '100',
    '—',
    '—',
    '—',
    '—',
    'Crew station for elemental vehicle.',
    '- Can only be installed onto a vehicle with an elemental core, such as a Lyrandar Airship, a Lyrandar Skyskiff, or a Strider Airship
- Replaces either existing shipboard siege weapon or crew station on the vehicle (except for an Elemental Helm, Elemental Thrusters, Repair Clamps, or Sky Veil)
- Can only be be acquired from and installed on a vehicle berthed in a city in Khorvaire or another region in Eberron with dragonmarked houses present.
- Costs 14 DTP to install in addition to the gold cost to acquire.',
    435.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '5f17f152-418a-4e8a-8389-11d9ec50aa6a'::uuid,
    'EQP_0440',
    'bd206c15-d3f0-4346-a7a9-60d5c56ac01d'::uuid,
    'bd206c15-d3f0-4346-a7a9-60d5c56ac01d'::uuid,
    'Shield Station',
    '2024',
    ARRAY['EFA']::text[],
    '15000',
    '—',
    '—',
    '—',
    '—',
    'Crew station for elemental vehicle.',
    '- Can only be installed onto a vehicle with an elemental core, such as a Lyrandar Airship, a Lyrandar Skyskiff, or a Strider Airship
- Replaces either existing shipboard siege weapon or crew station on the vehicle (except for an elemental Helm, Elemental Thrusters, Repair Clamps, or Sky Veil)
- Can only be be acquired from and installed on a vehicle berthed in a city in Khorvaire or another region in Eberron with dragonmarked houses present.
- Costs 14 DTP to install in addition to the gold cost to acquire.',
    436.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '65cedcda-4531-41da-8d73-6d5196f83fa5'::uuid,
    'EQP_0441',
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    'Any CR 0 Beast in the Monster Manual or 2024 Player''s Handbook',
    '2024',
    ARRAY['MM2014', 'MM2024', 'PHB2024']::text[],
    '25',
    'Varies',
    '—',
    '—',
    '—',
    'Pet.',
    '- A crab can be reflavored as a turtle
- A hawk can be reflavored as a falcon
- A hawk with no flying speed can be reflavored as a chicken or rooster
- A quipper without Blood Frenzy can be reflavored as a fish
- A raven can be reflavored as a crow
- A vulture can be reflavored as a peacock',
    437.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '5ef81154-3831-44ae-af59-8dd6b6575dfd'::uuid,
    'EQP_0442',
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    'Almiraj',
    '2014',
    ARRAY['ToA']::text[],
    '100',
    'Varies',
    '—',
    '—',
    '—',
    'Pet.',
    'Can only be purchased in Port Nyanzaru',
    438.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'c17a5a8c-32f0-44f6-8fd5-e0353b52ffab'::uuid,
    'EQP_0443',
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    'Anvilwrought Raptor',
    '2014',
    ARRAY['MOT']::text[],
    '100',
    'Varies',
    '—',
    '—',
    '—',
    'Pet.',
    'Can only be purchased in Hawthorne or major cities',
    439.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '0d2b94c3-2d14-497c-bc88-861413947d8f'::uuid,
    'EQP_0444',
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    'Blood Hawk',
    '2014',
    ARRAY['MM2014']::text[],
    '25',
    'Varies',
    '—',
    '—',
    '—',
    'Pet.',
    NULL,
    440.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '545b9956-861a-405b-bd6c-2257e849a57b'::uuid,
    'EQP_0445',
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    'Cow',
    '2014',
    ARRAY['VGM']::text[],
    '25',
    'Varies',
    '—',
    '—',
    '—',
    'Pet.',
    NULL,
    441.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '6e7216c7-b1fb-4810-94b1-6850b57761f0'::uuid,
    'EQP_0446',
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    'Flying Monkey',
    '2014',
    ARRAY['ToA']::text[],
    '100',
    'Varies',
    '—',
    '—',
    '—',
    'Pet.',
    'Can only be purchased in Port Nyanzaru',
    442.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'f5f1ecf4-1f73-4a8c-92b7-c11e7019ece8'::uuid,
    'EQP_0447',
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    'Flying Snake',
    '2024',
    ARRAY['FRHOF', 'MM2014', 'MM2024', 'ToA']::text[],
    '25',
    'Varies',
    '—',
    '—',
    '—',
    'Pet.',
    NULL,
    443.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'd2927ff9-f9cb-459c-aeaa-faaf23f3f5ce'::uuid,
    'EQP_0448',
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    'Fox',
    '2014',
    ARRAY['IDRotF']::text[],
    '25',
    'Varies',
    '—',
    '—',
    '—',
    'Pet.',
    NULL,
    444.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '0b3f620d-20fc-4df1-84a7-c60cf8b6f3ac'::uuid,
    'EQP_0449',
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    'Hare',
    '2014',
    ARRAY['IDRotF']::text[],
    '25',
    'Varies',
    '—',
    '—',
    '—',
    'Pet.',
    NULL,
    445.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '5a91302c-dfce-43e4-a869-5e66834156c9'::uuid,
    'EQP_0450',
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    'Knucklehead Trout',
    '2014',
    ARRAY['IDRotF']::text[],
    '25',
    'Varies',
    '—',
    '—',
    '—',
    'Pet.',
    NULL,
    446.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'e287c75b-db54-4fbb-bc30-f146cbeb5b26'::uuid,
    'EQP_0451',
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    'Ox',
    '2014',
    ARRAY['VGM', 'MPMM']::text[],
    '25',
    'Varies',
    '—',
    '—',
    '—',
    'Pet.',
    NULL,
    447.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '2c71ad7b-9c32-4541-ae7f-50291a8ba27e'::uuid,
    'EQP_0452',
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    'Pig',
    '2014',
    ARRAY['SKT']::text[],
    '25',
    'Varies',
    '—',
    '—',
    '—',
    'Pet.',
    NULL,
    448.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'ba6145d4-3b92-464d-92b5-8d0720782a41'::uuid,
    'EQP_0453',
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    'Playful Pulp',
    '2014',
    ARRAY['HTFG']::text[],
    '100',
    'Varies',
    '—',
    '—',
    '—',
    'Pet. See Hawthorne Field Guide for further info.',
    'This pet is sapient',
    449.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'ddaf5809-696e-41d9-9ef3-d9df872acdf3'::uuid,
    'EQP_0454',
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    'Seal',
    '2014',
    ARRAY['IDRotF']::text[],
    '50',
    'Varies',
    '—',
    '—',
    '—',
    'Pet.',
    NULL,
    450.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '207794f9-67d5-422b-a651-b03ddb0397a3'::uuid,
    'EQP_0455',
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    'Sheep',
    '2014',
    ARRAY['SKT']::text[],
    '25',
    'Varies',
    '—',
    '—',
    '—',
    'Pet.',
    NULL,
    451.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'aaac1693-d4d2-47f7-b14d-e3d6ed582d12'::uuid,
    'EQP_0456',
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    'Space Guppy',
    '2014',
    ARRAY['BAM']::text[],
    '50',
    'Varies',
    '—',
    '—',
    '—',
    'Pet.',
    'Can only be purchased in the Rock of Bral or other settlements in Wildspace or the Astral Sea',
    452.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '0b2a6327-78b2-4729-8765-5af64f703f16'::uuid,
    'EQP_0457',
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    'Space Hamster',
    '2014',
    ARRAY['BAM']::text[],
    '25',
    'Varies',
    '—',
    '—',
    '—',
    'Pet.',
    'Known as "hamsters"',
    453.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '653fdb51-7e4e-4844-9cdb-5144ec72c0dc'::uuid,
    'EQP_0458',
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    'Space Mollymawk',
    '2014',
    ARRAY['BAM']::text[],
    '50',
    'Varies',
    '—',
    '—',
    '—',
    'Pet.',
    'Can only be purchased in the Rock of Bral or other settlements in Wildspace or the Astral Sea',
    454.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'c62521f2-caed-4986-a9b7-a9cda6571e89'::uuid,
    'EQP_0459',
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    'Songbird',
    '2014',
    ARRAY['HTA']::text[],
    '25',
    'Varies',
    '—',
    '—',
    '—',
    'Pet. See Hawthorne Arcana for further info.',
    'Songbird
Tiny Beast, Unaligned

STR 2 (-4) DEX 12 (+1) CON 8 (-1) INT 2 (-4) WIS 12 (+1) CHA 7 (-2)
Skills Perception +3
Senses Passive Perception +3
Languages —
CR 0 (0 XP; PB+2)

Traits
Birdsong. This creature can produce a nice sound that is either soothing or annoying when you are trying to sleep.

Actions
Beak. Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit 1 Piercing damage',
    455.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '58e937ee-a7b4-4bf2-981b-10c84849c4e8'::uuid,
    'EQP_0460',
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    '89fbdc72-1481-4d80-a27b-f21774789d4f'::uuid,
    'Tressym',
    '2014',
    ARRAY['BGDIA', 'SKT']::text[],
    '100',
    'Varies',
    '—',
    '—',
    '—',
    'Pet.',
    'This pet is sapient',
    456.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '534ca968-b027-4402-93b5-dbe2c1b24b6d'::uuid,
    'EQP_0461',
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    'Ballista Bolt',
    '2014',
    ARRAY['AAG']::text[],
    '5',
    '—',
    '—',
    '—',
    '—',
    'Ammunition. Ballista Bolt used with Ballista.',
    NULL,
    457.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '056a9bab-3005-48c8-81ca-44cd48e9fd37'::uuid,
    'EQP_0462',
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    'Cannonball',
    '2024',
    ARRAY['DMG2014', 'DMG2024']::text[],
    '50',
    '—',
    '—',
    '—',
    '—',
    'Ammunition. Cannonball used with Cannon.',
    NULL,
    458.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '9c574fd9-90b1-4d14-bb98-3d39605ce9b3'::uuid,
    'EQP_0463',
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    'Giant Cannon Ball',
    '2014',
    ARRAY['AAG']::text[],
    '1000',
    '20000',
    '—',
    '—',
    '—',
    'Ammunition. Giant Cannon Ball used with Giant Cannon on a Bombard.',
    NULL,
    459.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'c0f5189d-17a2-4e69-b777-cba1d7ce009a'::uuid,
    'EQP_0464',
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    'Fiery Canister',
    '2024',
    ARRAY['HBTD']::text[],
    '150',
    '—',
    '—',
    '—',
    '—',
    'Ammunition. Fiery Canister used with Forge Launcher.',
    NULL,
    460.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'e820aa8e-9371-451f-883a-b126ee456e4e'::uuid,
    'EQP_0465',
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    'Stone',
    '2024',
    ARRAY['DMG2014', 'DMG2024']::text[],
    '5',
    '—',
    '—',
    '—',
    '—',
    'Ammunition. Stone used with Mangonel and Trebuchet.',
    NULL,
    461.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '41af560f-7aa0-4537-a4d1-b55dee738af3'::uuid,
    'EQP_0466',
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    'Toxic Keg',
    '2024',
    ARRAY['DMG2024']::text[],
    '100',
    '—',
    '—',
    '—',
    '—',
    'Ammunition. Toxic Keg used with Keg Launcher.',
    NULL,
    462.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '28af1fbd-494d-4eb2-b9a2-5cb1e179b322'::uuid,
    'EQP_0467',
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    'Ballista',
    '2024',
    ARRAY['DMG2014', 'DMG2024']::text[],
    '50',
    '—',
    '—',
    '—',
    '—',
    'Siege weapon and shipboard weapon.',
    '- Can either be deployed as a ground based siege weapon or as a shipboard weapon.
- Can replace other existing shipboard weapons on a vehicle, such as a Ballista or Mangonel.
- Uses Ballista Bolts as ammunition',
    463.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'aa230a6b-4286-41da-9d36-bae656c70b29'::uuid,
    'EQP_0468',
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    'Automatic Ballista',
    '2024',
    ARRAY['HBTD']::text[],
    '4000',
    '—',
    '—',
    '—',
    '—',
    'Siege weapon and shipboard weapon.',
    '- Can either be deployed as a ground based siege weapon or as a shipboard weapon.
- Can replace other existing shipboard weapons on a vehicle, such as a Ballista or Mangonel.
- Uses Ballista Bolts as ammunition',
    464.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'a1222012-9043-45f5-ba60-0898f7b6f3e3'::uuid,
    'EQP_0469',
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    'Enchanted Ballista',
    '2024',
    ARRAY['HBTD']::text[],
    '4000',
    '—',
    '—',
    '—',
    '—',
    'Siege weapon and shipboard weapon.',
    '- Can either be deployed as a ground based siege weapon or as a shipboard weapon.
- Can replace other existing shipboard weapons on a vehicle, such as a Ballista or Mangonel.
- Uses Ballista Bolts as ammunition',
    465.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'f46d61fe-c71c-47f6-821d-ccc948c30357'::uuid,
    'EQP_0470',
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    'Boilerdrak',
    '2014',
    ARRAY['DSotDQ']::text[],
    '400',
    '—',
    '—',
    '—',
    '—',
    'Siege weapon and shipboard weapon.',
    '- Can either be deployed as a ground based siege weapon or as a shipboard weapon.
- Can replace other existing shipboard weapons on a vehicle, such as a Ballista or Mangonel.',
    466.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '6b9de4aa-d8bc-4afc-b608-2953e0a792ef'::uuid,
    'EQP_0471',
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    'Cannon',
    '2024',
    ARRAY['DMG2014', 'DMG2024']::text[],
    '4000',
    '—',
    '—',
    '—',
    '—',
    'Siege weapon and shipboard weapon.',
    '- Can either be deployed as a ground based siege weapon or as a shipboard weapon.
- Can replace other existing shipboard weapons on a vehicle, such as a Ballista or Mangonel.
- Uses Cannonballs as ammunition',
    467.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'dc7a303e-343c-4b26-afe3-1df0e8166f67'::uuid,
    'EQP_0472',
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    'Gnomeflinger',
    '2014',
    ARRAY['DSotDQ']::text[],
    '150',
    '—',
    '—',
    '—',
    '—',
    'Siege weapon and shipboard weapon.',
    '- Can either be deployed as a ground based siege weapon or as a shipboard weapon.
- Can replace other existing shipboard weapons on a vehicle, such as a Ballista or Mangonel.
- Propels a Medium or smaller creature as a projectile',
    468.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'ecb82b92-7626-466e-b4a2-5f669e02ee52'::uuid,
    'EQP_0473',
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    'Harpoon Gun',
    '2014',
    ARRAY['AcqInc']::text[],
    '100',
    '—',
    '—',
    '—',
    '—',
    'Siege weapon and shipboard weapon.',
    '- Can either be deployed as a ground based siege weapon or as a shipboard weapon.
- Can replace other existing shipboard weapons on a vehicle, such as a Ballista or Mangonel.
- Uses Ballista Bolts as ammunition
- Uses the statistics of a Harpoon Gun as present on a Battle Balloon',
    469.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '6a7f8619-55a7-443d-8ad9-4b508a61e735'::uuid,
    'EQP_0474',
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    'Keg Launcher',
    '2024',
    ARRAY['DMG2024']::text[],
    '800',
    '—',
    '—',
    '—',
    '—',
    'Siege weapon and shipboard weapon.',
    '- Can either be deployed as a ground based siege weapon or as a shipboard weapon.
- Can replace other existing shipboard weapons on a vehicle, such as a Ballista or Mangonel.
- Uses Toxic Kegs as ammunition',
    470.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '57eb18ea-f725-47f0-8ea2-1f80f23346d8'::uuid,
    'EQP_0475',
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    'Forge Launcher',
    '2024',
    ARRAY['HBTD']::text[],
    '4000',
    '—',
    '—',
    '—',
    '—',
    'Siege weapon and shipboard weapon.',
    '- Can either be deployed as a ground based siege weapon or as a shipboard weapon.
- Can replace other existing shipboard weapons on a vehicle, such as a Ballista or Mangonel.
- Uses Fiery Canisters as ammunition',
    471.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '79530798-0527-4ac6-a44b-0a1c2be3e871'::uuid,
    'EQP_0476',
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    'Lightning Cannon',
    '2024',
    ARRAY['DMG2024']::text[],
    '4000',
    '—',
    '—',
    '—',
    '—',
    'Siege weapon and shipboard weapon.',
    '- Can either be deployed as a ground based siege weapon or as a shipboard weapon.
- Can replace other existing shipboard weapons on a vehicle, such as a Ballista or Mangonel.',
    472.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'f54cca8d-d47a-423d-b016-9c6ba79c6e71'::uuid,
    'EQP_0477',
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    'Storm Cannon',
    '2024',
    ARRAY['HBTD']::text[],
    '4000',
    '—',
    '—',
    '—',
    '—',
    'Siege weapon and shipboard weapon.',
    '- Can either be deployed as a ground based siege weapon or as a shipboard weapon.
- Can replace other existing shipboard weapons on a vehicle, such as a Ballista or Mangonel.',
    473.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '615a84b9-fc6e-4455-8842-d26d792c561d'::uuid,
    'EQP_0478',
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    'Mangonel',
    '2024',
    ARRAY['DMG2014', 'DMG2024']::text[],
    '100',
    '—',
    '—',
    '—',
    '—',
    'Siege weapon and shipboard weapon.',
    '- Can either be deployed as a ground based siege weapon or as a shipboard weapon.
- Can replace other existing shipboard weapons on a vehicle, such as a Ballista or Mangonel.
- Uses Stone as ammunition.',
    474.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'f50550c9-0cd1-4639-829d-c59cff928f9d'::uuid,
    'EQP_0479',
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    'Ram',
    '2024',
    ARRAY['DMG2014', 'DMG2024']::text[],
    '100',
    '—',
    '—',
    '—',
    '—',
    'Siege weapon. Ground based only.',
    'Can only be deployed as a ground based siege weapon',
    475.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '91f7fe74-3f88-4071-99f0-a756638efc6f'::uuid,
    'EQP_0480',
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    'Siege Tower',
    '2024',
    ARRAY['DMG2014', 'DMG2024']::text[],
    '2000',
    '—',
    '—',
    '—',
    '—',
    'Siege weapon. Ground based only.',
    'Can only be deployed as a ground based siege weapon',
    476.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '92497675-c648-449e-b5e8-634f12582c2a'::uuid,
    'EQP_0481',
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    'Suspended Cauldron',
    '2024',
    ARRAY['DMG2014', 'DMG2024']::text[],
    '50',
    '—',
    '—',
    '—',
    '—',
    'Siege weapon. Ground based only.',
    '- Can only be deployed as a ground based siege weapon
- Requires 1 gallon''s worth of Oil per use, which is the equivalent of 8 SP worth of Oil.
- As written, other substances at a DM''s discretion can be used, such as 1 gallon''s worth of Acid, which is the equivalent of 800 GP worth of Acid.',
    477.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '988cf4cd-8d5d-49e8-9886-638ed3634b97'::uuid,
    'EQP_0482',
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    'Trebuchet',
    '2024',
    ARRAY['DMG2014', 'DMG2024']::text[],
    '200',
    '—',
    '—',
    '—',
    '—',
    'Siege weapon. Ground based only.',
    '- Can only be deployed as a ground based siege weapon
- Uses Stone as ammunition.',
    478.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '2c501d62-e9ac-4e65-b24e-15d5f2b2f25d'::uuid,
    'EQP_0483',
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    'Clockwork Trebuchet',
    '2024',
    ARRAY['HBTD']::text[],
    '4000',
    '—',
    '—',
    '—',
    '—',
    'Siege weapon. Ground based only.',
    '- Can only be deployed as a ground based siege weapon
- Uses Stone as ammunition.',
    479.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'de708f0a-da84-4dbc-a829-5fd6d013564d'::uuid,
    'EQP_0484',
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    'Goblin Hucker',
    '2014',
    ARRAY['HHB']::text[],
    '100',
    '—',
    '—',
    '—',
    '—',
    'Large object

Armor Class 15
Hit Points 50

This portable trebuchet was originally designed to fling goblins. It is a contraption that rests on a Large creature''s back and shoulders but doesn''t inhibit the wearer''s mobility or fighting ability despite its cumbersome appearance. A Goblin Hucker can only be worn by Large creatures with humanoid anatomy, such as an Ogre, and requires 10 minutes to don or doff.

Loading a Goblin Hucker requires an Utilize action that the wearer can''t perform but must instead be taken by another creature. A Small or Tiny creature willing to serve as a living projectile can also load itself with an Utilize action. Then the wearer of the Goblin Hucker can take the Goblin Projectile action.

Goblin Projectile (Requires Load). Ranged Weapon Attack: +3 to hit, range 150/600 ft. (can''t hit targets within 30 feet of the Goblin Hucker), one creature, object, or space not in the air. Hit: 5 (2d4) Bludgeoning damage, or 10 (4d4) Piercing damage if the living projectile is wearing Spiked Armor. Hit or Miss: The living projectile takes 1d6 Bludgeoning damage per 10 feet it travels through the air (maximum 20d6).',
    '- This is an adaptation of the Goblin Hucker from Storm King''s Thunder
- Can only be deployed as a personally operated siege weapon
- Can only be worn by a creature of Large size that has a humanoid anatomy, such as an Ogre
- Propels a Small or smaller creature as a projectile',
    480.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '2fad2ea7-9e39-4d36-b059-ab3e95f9d3ea'::uuid,
    'EQP_0485',
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    '92ee7761-a534-4dbd-b06d-2239011e7d13'::uuid,
    'Flamethrower Coach',
    '2024',
    ARRAY['DMG2024']::text[],
    '2500',
    '—',
    '—',
    '—',
    '—',
    'Siege weapon and land vehicle. Ground based only.',
    'Can only be deployed as a ground based siege weapon that is personally operated.',
    481.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'e5660475-fce5-4650-a10d-5dd2726e8080'::uuid,
    'EQP_0486',
    'b5f22ecb-b537-4f26-839d-295f9fadb915'::uuid,
    'b5f22ecb-b537-4f26-839d-295f9fadb915'::uuid,
    'Tuning Fork (Material Plane)',
    '2024',
    ARRAY['PHB2014', 'PHB2024', 'DMG2014']::text[],
    '250',
    '—',
    '250',
    '7',
    'Ability to cast Plane Shift',
    'Spell component for Plane Shift to the Material Plane.',
    '- The tuning fork is made of steel and produces a C note when rung
- Can only be purchased in Hawthorne and other major cities',
    482.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '200f7729-a275-4afe-9f03-19229949eb05'::uuid,
    'EQP_0487',
    'b5f22ecb-b537-4f26-839d-295f9fadb915'::uuid,
    'b5f22ecb-b537-4f26-839d-295f9fadb915'::uuid,
    'Tuning Fork (Other Planes)',
    '2014',
    ARRAY['PHB2014']::text[],
    'N/A',
    '—',
    '250+ as determined by DM',
    'Determined by DM',
    'Ability to cast Plane Shift, Crafted Tuning Fork as determined by DM',
    'Spell component for Plane Shift to another plane of existence beyond the Material Plane.',
    '- Tuning forks to other planes of existence can only be purchased or crafted as part of an adventure
- Crafting a tuning fork for another plane of existence requires 1) Researching the correct combination of material and frequency for that plane of existence as determined by the DM 2) Crafting the tuning fork as determined by the DM 3) Traveling to the associated plane of existence and attuning the fork there using associated materials from the plane and casting Plane Shift over the course of 1 hour or more as determined by the DM
- DMs can review "Plane Speaking" in Dragon 120 for a suggested list of materials and frequencies',
    483.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '940a7832-073c-429f-8165-a4bff3a75bc7'::uuid,
    'EQP_0488',
    'b5f22ecb-b537-4f26-839d-295f9fadb915'::uuid,
    'b5f22ecb-b537-4f26-839d-295f9fadb915'::uuid,
    'Other Costly Components',
    '2024',
    ARRAY['AC']::text[],
    'Equal to the cost listed in the spell',
    'Varies',
    '—',
    '—',
    '—',
    'Costly spell components for other spells.',
    NULL,
    484.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'cc10e9d2-93d8-441c-b114-22c528af6bf2'::uuid,
    'EQP_0489',
    '572ec17e-208b-4e46-b915-e33962fe65b5'::uuid,
    '572ec17e-208b-4e46-b915-e33962fe65b5'::uuid,
    'Potion of Greater Healing',
    '2024',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'N/A',
    '0.5',
    '100',
    '5',
    'Herbalism Kit',
    'Potion. See book for description.',
    '- Can only be acquired from an adventure or crafted
- Can be dropped as part of the gold allotment of an APL 3+ game and count as 100 GP against the adventure''s gold allotment',
    485.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'f18e88e4-17d0-4a23-8000-f33ac06e6a64'::uuid,
    'EQP_0490',
    '572ec17e-208b-4e46-b915-e33962fe65b5'::uuid,
    '572ec17e-208b-4e46-b915-e33962fe65b5'::uuid,
    'Potion of Superior Healing',
    '2024',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'N/A',
    '0.5',
    '1000',
    '15',
    'Herbalism Kit',
    'Potion. See book for description.',
    '- Can only be acquired from an adventure or crafted                                
- Can only be crafted by a level 5+ PC
- Can be dropped as part of the gold allotment of an APL 5+ game and count as 1000 GP against the adventure''s gold allotment',
    486.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '6c4a4ced-a267-43f3-b19c-3852a71a8fb4'::uuid,
    'EQP_0491',
    '572ec17e-208b-4e46-b915-e33962fe65b5'::uuid,
    '572ec17e-208b-4e46-b915-e33962fe65b5'::uuid,
    'Potion of Supreme Healing',
    '2024',
    ARRAY['DMG2014', 'DMG2024']::text[],
    'N/A',
    '0.5',
    '10000',
    '20',
    'Herbalism Kit',
    'Potion. See book for description.',
    '- Can only be acquired from an adventure or crafted
- Can only be crafted by a level 11+ PC
- Can be dropped as part of the gold allotment of an APL 11+ game and count as 10000 GP against the adventure''s gold allotment',
    487.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'f6674ea1-c733-44da-9657-1bc1ab4f59bc'::uuid,
    'EQP_0492',
    '572ec17e-208b-4e46-b915-e33962fe65b5'::uuid,
    '572ec17e-208b-4e46-b915-e33962fe65b5'::uuid,
    'Blod Stone',
    '2014',
    ARRAY['SKT']::text[],
    'N/A',
    '—',
    '5000 (Diamond)',
    '10',
    'A creature''s blood, ability to cast Locate Creature or Scrying',
    'Wondrous item, T1 Permanent 

See book for description.',
    '- Can only be acquired from an adventure or crafted
- Can''t be used as a spell component
- The blood can''t be recovered or used',
    488.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    'c85c58d1-0ab8-4663-9cbe-245c64e97480'::uuid,
    'EQP_0493',
    '572ec17e-208b-4e46-b915-e33962fe65b5'::uuid,
    '572ec17e-208b-4e46-b915-e33962fe65b5'::uuid,
    'Keycharm',
    '2014',
    ARRAY['HHB']::text[],
    'N/A',
    'Varies',
    '50 (diamonds)',
    '1',
    'A Tiny object that weighs 5 pounds or less and whose longest dimension is no more than 3 feet. See description for details.',
    'Wondrous item, T0 Permanent

This simple object allows you whoever holds it to access and bypass the protective enchantments it is keyed to. A Keycharm is a Tiny object that weighs 5 pounds or less whose longest dimension is 3 feet or less. Whenever you cast a spell with an ongoing duration that either triggers an effect in response to a circumstance or that can designate one or more creatures to be subjected or not subjected to its effect, you can expend 50 GP worth of diamonds and tie the spell to the keycharm and designate a corresponding command word. While a creature holds the keycharm, it doesn''t trigger the tied spell''s effect, is designated to avoid the tied spell''s effect if it can be, and knows if the tied spell triggered. For example, the holder of the keycharm wouldn''t trigger a tied Glyph of Warding, could bypass a tied Arcane Lock, and would know if a tied Alarm was triggered. The holder of the keycharm can also use an action to speak the designated command word to end the corresponding tied spell. The Keycharm can have up to three tied spells at one time.',
    'This is an adaptation of the Keycharm from Eberron: Rising from the Last War.',
    489.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_equipment (
    id, check_id, equip_type_id, category_id, name, ruleset, source, cost_gp, weight_lbs,
    craft_cost_gp, craft_cost_dtp, craft_reqs, description, notes_advice, display_order
) VALUES (
    '8f274f9a-f77a-4606-b08f-b20b2592f0c4'::uuid,
    'EQP_0494',
    '572ec17e-208b-4e46-b915-e33962fe65b5'::uuid,
    '572ec17e-208b-4e46-b915-e33962fe65b5'::uuid,
    'Planar Puzzle Cube',
    '2014',
    ARRAY['HHB']::text[],
    'N/A',
    '—',
    '5000',
    '10',
    'Ability to cast Demiplane and an existing demiplane created by the spell or the Demiplane Special Facility of a Bastion',
    'Wondrous item, T3 Permanent
 
A planar puzzle cube is an 8-inch magical cube made of gold, iron, crystal, and copper and is magically linked to a specific demiplane. A functioning puzzle cube can be solved with 30 minutes of work and a successful DC 25 Intelligence (Investigation) check (the cube’s creator automatically succeeds on this check and takes only 1 minute of work). When the cube is solved, a 30-foot diameter portal appears before the creature who solved the cube, leading to the demiplane linked to the cube. The portal is two-way and remains open for 10 minutes or until a creature uses an action to change the puzzle’s configuration. The puzzle cube can be used in the linked demiplane to function in reverse and exit by repeating the check after 30 minutes of work, opening a portal to the creature’s last location before entering the demiplane (the cube’s creator automatically succeeds on the check and takes only 1 minute of work).',
    '- Can only be acquired from an adventure or crafted
- Can only be crafted by a level 11+ PC able to cast Demiplane, with the crafted cube linking to a demiplane they have created or the Demiplane Special Facility of a Bastion they own
- This is an adaptation of the Horizon Puzzle Cube from Bigby Presents: Glory of the Giants.',
    490.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    equip_type_id = EXCLUDED.equip_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    cost_gp = EXCLUDED.cost_gp,
    weight_lbs = EXCLUDED.weight_lbs,
    craft_cost_gp = EXCLUDED.craft_cost_gp,
    craft_cost_dtp = EXCLUDED.craft_cost_dtp,
    craft_reqs = EXCLUDED.craft_reqs,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

-- ------------------------------------------------------------------------------
-- 6. Enforce Constraints and Foreign Keys
-- ------------------------------------------------------------------------------
ALTER TABLE public.ac_equipment ALTER COLUMN check_id SET NOT NULL;
ALTER TABLE public.ac_equipment DROP CONSTRAINT IF EXISTS uq_ac_equipment_check_id;
ALTER TABLE public.ac_equipment ADD CONSTRAINT uq_ac_equipment_check_id UNIQUE (check_id);

-- Foreign key to ac_equip_type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ac_equipment_equip_type_id_fkey' AND table_name = 'ac_equipment'
    ) THEN
        ALTER TABLE public.ac_equipment ADD CONSTRAINT ac_equipment_equip_type_id_fkey FOREIGN KEY (equip_type_id) REFERENCES public.ac_equip_type(id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ac_equipment_category_id_fkey' AND table_name = 'ac_equipment'
    ) THEN
        ALTER TABLE public.ac_equipment ADD CONSTRAINT ac_equipment_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.ac_equip_type(id);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 7. Indexes
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_ac_equip_type_display_order ON public.ac_equip_type(display_order);

CREATE INDEX IF NOT EXISTS idx_ac_equipment_check_id ON public.ac_equipment(check_id);
CREATE INDEX IF NOT EXISTS idx_ac_equipment_equip_type_id ON public.ac_equipment(equip_type_id);
CREATE INDEX IF NOT EXISTS idx_ac_equipment_ruleset ON public.ac_equipment(ruleset);
CREATE INDEX IF NOT EXISTS idx_ac_equipment_source ON public.ac_equipment USING GIN (source);
CREATE INDEX IF NOT EXISTS idx_ac_equipment_display_order ON public.ac_equipment(display_order);

-- ------------------------------------------------------------------------------
-- 8. Updated_At Triggers
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS set_ac_equip_type_updated_at ON public.ac_equip_type;
CREATE TRIGGER set_ac_equip_type_updated_at
    BEFORE UPDATE ON public.ac_equip_type
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_ac_equipment_updated_at ON public.ac_equipment;
CREATE TRIGGER set_ac_equipment_updated_at
    BEFORE UPDATE ON public.ac_equipment
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 9. Row Level Security (RLS) Policies
-- ------------------------------------------------------------------------------
ALTER TABLE public.ac_equip_type ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to ac_equip_type" ON public.ac_equip_type;
CREATE POLICY "Allow public read access to ac_equip_type"
ON public.ac_equip_type FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow service_role to manage ac_equip_type" ON public.ac_equip_type;
CREATE POLICY "Allow service_role to manage ac_equip_type"
ON public.ac_equip_type FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins and Engineers can manage ac_equip_type" ON public.ac_equip_type;
CREATE POLICY "Admins and Engineers can manage ac_equip_type"
ON public.ac_equip_type FOR ALL
TO authenticated
USING (
  ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
  OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
)
WITH CHECK (
  ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
  OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
);

ALTER TABLE public.ac_equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to ac_equipment" ON public.ac_equipment;
CREATE POLICY "Allow public read access to ac_equipment"
ON public.ac_equipment FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow service_role to manage ac_equipment" ON public.ac_equipment;
CREATE POLICY "Allow service_role to manage ac_equipment"
ON public.ac_equipment FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins and Engineers can manage ac_equipment" ON public.ac_equipment;
CREATE POLICY "Admins and Engineers can manage ac_equipment"
ON public.ac_equipment FOR ALL
TO authenticated
USING (
  ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
  OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
)
WITH CHECK (
  ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
  OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
);
