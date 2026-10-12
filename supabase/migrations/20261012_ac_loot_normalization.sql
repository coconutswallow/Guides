-- Allowed Content: AC Loot Normalization Migration
-- Generated deterministically from Allowed_Content_20261004.xlsx

BEGIN;

-- 1. Backup legacy tables if not already backed up
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ac_loot_legacy_backup') THEN
        CREATE TABLE public.ac_loot_legacy_backup AS SELECT * FROM public.ac_loot;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ac_loot_categories_legacy_backup') THEN
        CREATE TABLE public.ac_loot_categories_legacy_backup AS SELECT * FROM public.ac_loot_categories;
    END IF;
END $$;

-- 2. Drop existing foreign keys and dependent tables (ac_loot_tags references ac_loot)
DROP TABLE IF EXISTS public.ac_loot_tags CASCADE;
DROP TABLE IF EXISTS public.ac_loot CASCADE;
DROP TABLE IF EXISTS public.ac_loot_categories CASCADE;

-- 3. Create public.ac_loot_categories
CREATE TABLE public.ac_loot_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(64) UNIQUE NOT NULL,
    notes TEXT NOT NULL,
    display_order DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Insert Canonical Loot Categories
INSERT INTO public.ac_loot_categories (id, name, notes, display_order) VALUES
('d0000001-0000-0000-0000-000000000001', 'Rolled Loot', 'Rolled Loot can be rolled in #treasure-log using /hgenloot [Number of Players] [APL]. A DM can also choose to predetermine rolled loot instead of rolling, with a number of item slots = the number of players. For predetermined loot, no more than half the items (rounded down) for a game can be permanents and the maximum item tier is up to the tier for the APL. Trial DMs can only predetermine up to T2 Rolled Loot. A DM can choose to predetermine some of the items and roll for the remainder.', 10.0),
('d0000001-0000-0000-0000-000000000002', 'Select Loot', 'Select Loot can only be predetermined by a DM, not rolled. For predetermined loot, no more than half the items (rounded down) for a game can be permanents and the maximum item tier is up to the tier for the APL. Trial DMs can only predetermine up to T2 Select Loot. A DM can choose to predetermine some Select Loot items and roll for the remainder.', 20.0),
('d0000001-0000-0000-0000-000000000003', 'Multisession Loot', 'Multisession loot can only be awarded by Full DMs as part of consecutive session campaigns.', 30.0),
('d0000001-0000-0000-0000-000000000004', 'Other Loot', 'Contains Deck of Many Things, Hoard Magic Items, Superior Ship Upgrades, Infernal War Machine Upgrades, Event Items, and Legacy Loot.', 40.0)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    notes = EXCLUDED.notes,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();

-- 5. Create public.ac_loot table
CREATE TABLE public.ac_loot (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    check_id VARCHAR(32) UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category_id UUID NOT NULL REFERENCES public.ac_loot_categories(id) ON DELETE RESTRICT,
    tier_id UUID NOT NULL REFERENCES public.ac_tiers(id) ON DELETE RESTRICT,
    type TEXT,
    nature VARCHAR(16) NOT NULL,
    is_dm_select BOOLEAN DEFAULT false,
    event_category VARCHAR(64),
    tier_display TEXT NOT NULL,
    source TEXT[] NOT NULL DEFAULT '{}',
    description TEXT,
    notes_advice TEXT,
    display_order DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Recreate ac_loot_tags
CREATE TABLE public.ac_loot_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loot_id UUID NOT NULL REFERENCES public.ac_loot(id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Insert Normalized Loot Items
INSERT INTO public.ac_loot (
    id, check_id, name, category_id, tier_id, type, nature, is_dm_select, event_category, tier_display, source, description, notes_advice, display_order
) VALUES
('fe290054-dfc7-58e6-a0ee-bde126ce6817', 'LOT_0001', 'Acid', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Adventuring gear', 'Consumable', false, NULL, 'T0 Consumable', '{"PHB2014", "PHB2024"}', 'See book for description.

Base Cost: See Equipment.
Crafting Cost: See Equipment.', NULL, 10.0),
('7854e0d7-9bad-58b6-b4c6-24c84e41fbcf', 'LOT_0002', 'Adamantine Ammunition', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Ammunition (any)', 'Consumable', false, NULL, 'T0 Consumable', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: See Equipment.
Crafting Cost: See Equipment.', NULL, 20.0),
('f882d588-62d7-5aee-93de-8e601f872541', 'LOT_0003', 'Alchemist''s Fire', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Adventuring gear', 'Consumable', false, NULL, 'T0 Consumable', '{"PHB2014", "PHB2024"}', 'See book for description.

Base Cost: See Equipment.
Crafting Cost: See Equipment.', NULL, 30.0),
('b6f1b051-5472-5950-bf88-e7f0f22be925', 'LOT_0004', 'Alluring Dye', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Potion', 'Consumable', false, NULL, 'T0 Consumable', '{"HWT"}', 'See book for description.

Base Cost: 50 GP (plus 1 GP for Vial)
Crafting Cost: 25 GP (plus 1 GP for Vial), 3 DTP (Garden, Greenhouse, or Laboratory)
Tool: Alchemist''s Supplies', NULL, 40.0),
('e0aa6751-d0ed-5f8e-b692-b31692fe7d49', 'LOT_0005', 'Antitoxin', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Adventuring gear', 'Consumable', false, NULL, 'T0 Consumable', '{"PHB2014", "PHB2024"}', 'See book for description.

Base Cost: See Equipment.
Crafting Cost: See Equipment.', NULL, 50.0),
('76a1eab3-c8e1-5599-a9a2-3953aa45f07a', 'LOT_0006', 'Basic Poison', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Adventuring gear', 'Consumable', false, NULL, 'T0 Consumable', '{"PHB2014", "PHB2024"}', 'See book for description.

Base Cost: See Equipment.
Crafting Cost: See Equipment.', NULL, 60.0),
('082c6a38-4439-56be-9782-270aa0806b48', 'LOT_0007', 'Bead of Nourishment', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Consumable', false, NULL, 'T0 Consumable', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 50 GP
Crafting Cost: 25 GP, 3 DTP (Workshop)
Tool: Alchemist''s Supplies', NULL, 70.0),
('13c03221-977c-57cb-9d03-59eba9113d31', 'LOT_0008', 'Bead of Refreshment', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Consumable', false, NULL, 'T0 Consumable', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 50 GP
Crafting Cost: 25 GP, 3 DTP (Workshop)
Tool: Alchemist''s Supplies', NULL, 80.0),
('95621a53-b129-5c0e-be78-baa13e18673b', 'LOT_0009', 'Cream of Ooze Moisturizing Face Serum', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Potion', 'Consumable', false, NULL, 'T0 Consumable', '{"HWT"}', 'See book for description.

Base Cost: 50 GP (plus 1 GP for Vial)
Crafting Cost: 25 GP (plus 1 GP for Vial), 3 DTP (Garden, Greenhouse, or Laboratory)
Tool: Alchemist''s Supplies', NULL, 90.0),
('d8c1d9b4-48df-5b4b-a59d-e5bd9b0ce50b', 'LOT_0010', 'Dancing Monkey Fruit', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Mundane', 'Consumable', false, NULL, 'T0 Consumable', '{"ToA"}', 'See book for description.

Base Cost: See Equipment.
Crafting Cost: See Equipment.', NULL, 100.0),
('8ed86189-54da-5886-bd22-23a3043f498c', 'LOT_0011', 'Explosive Seed', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Adventuring gear', 'Consumable', false, NULL, 'T0 Consumable', '{"EGW"}', 'See book for description.

Base Cost: See Equipment.
Crafting Cost: See Equipment.', NULL, 110.0),
('9656c97f-e054-5324-acda-71ced76870f1', 'LOT_0012', 'Feather Token', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Consumable', false, NULL, 'T0 Consumable', '{"ERLW"}', 'See book for description.

Base Cost: 50 GP
Crafting Cost: 25 GP, 3 DTP (Workshop)
Tool: Smith''s Tools', NULL, 120.0),
('92373d01-c8e1-5a6d-bfcb-d339097db1f6', 'LOT_0013', 'Festival Lantern (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Consumable', false, NULL, 'T0 Consumable', '{"HHB"}', 'Wondrous item, T0

This paper lantern has 25 charges.  While you are holding it, you can use an action to speak one of the three command words to cause one of the following effects:

- The first command word causes the lantern to float and orbit up to 15 feet above your head.  You may use a Bonus Action to command the lantern to raise or lower its orbit height.  This effect doesn’t expend a charge.  The lantern remains floating and orbiting you until you use a Bonus Action to repeat the command word, at which point it slowly floats back down to your feet.
- The second command word expends 1 charge and causes the lantern to shed bright light in a 10 foot radius and dim light for an additional 10 feet. This magical light fades after 1 hour.
- The third command word expends 1 charge and causes the lantern to continuously emit a harmless sensory effect such as falling petals, spiraling motes of color, floating bubbles, puffs of sparkling glitter, or the scent of floral perfume.  This effect lasts 1 hour.

When all of the lantern’s charges are expended, the lantern crumbles and is destroyed.

Base Cost: 50 GP
Crafting Cost: 25 GP, 3 DTP (Workshop)
Tool: Tinker''s Tools', NULL, 130.0),
('b2b40c2c-4b77-56e9-b573-9f1620f0315b', 'LOT_0014', 'Holy Water', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Adventuring gear', 'Consumable', false, NULL, 'T0 Consumable', '{"PHB2014", "PHB2024"}', 'See book for description.

Base Cost: See Equipment.
Crafting Cost: See Equipment.', NULL, 140.0),
('891fb0d9-6191-57ce-a285-e7e12a13cb21', 'LOT_0015', 'Magical Bandage (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Consumable', false, NULL, 'T0 Consumable', '{"HHB"}', 'Wondrous item, T0

When you make a Medicine check, you can use these bandages as part of the check and add your Proficiency Bonus if you don''t already do so. If you already add your Proficiency Bonus to the check, you instead made the check with Advantage. After you use the bandages in this way, they become nonmagical.

Base Cost: 50 GP
Crafting Cost: 25 GP, 3 DTP (Workshop)
Tool: Herbalism Kit', NULL, 150.0),
('7c543254-c1b4-5832-835e-11dd40523961', 'LOT_0016', 'Medal of the Meat Pie', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Consumable', false, NULL, 'T0 Consumable', '{"CRCotN"}', 'See book for description.

Base Cost: 50 GP
Crafting Cost: 25 GP, 3 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 160.0),
('ff1e39b2-a731-5385-b075-0c57eec04ce3', 'LOT_0017', 'Medal of the Conch', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Consumable', false, NULL, 'T0 Consumable', '{"CRCotN"}', 'See book for description.

Base Cost: 50 GP
Crafting Cost: 25 GP, 3 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 170.0),
('a62a98df-125e-5b5a-82d7-9184fbdc5a0f', 'LOT_0018', 'Medal of the Maze', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Consumable', false, NULL, 'T0 Consumable', '{"CRCotN"}', 'See book for description.

Base Cost: 50 GP
Crafting Cost: 25 GP, 3 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 180.0),
('637a6676-4c78-534e-896d-43b6149a2029', 'LOT_0019', 'Medal of the Wetlands', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Consumable', false, NULL, 'T0 Consumable', '{"CRCotN"}', 'See book for description.

Base Cost: 50 GP
Crafting Cost: 25 GP, 3 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 190.0),
('97aeee1e-b534-5a8f-9d30-3c4c92b26862', 'LOT_0020', 'Menga leaves (1 ounce)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Mundane', 'Consumable', false, NULL, 'T0 Consumable', '{"ToA"}', 'See book for description.

Base Cost: See Equipment.
Crafting Cost: See Equipment.', NULL, 200.0),
('31ec9070-aa90-55bf-87b0-cd002ec971e7', 'LOT_0021', 'Moodmark Paint', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Consumable', false, NULL, 'T0 Consumable', '{"GGR"}', 'See book for description.

Base Cost: 50 GP
Crafting Cost: 25 GP, 3 DTP (Workshop)
Tool: Painter''s Supplies', NULL, 210.0),
('b2db0961-82c1-522d-90e9-e2c9e421846d', 'LOT_0022', 'Mystery Key', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Consumable', false, NULL, 'T0 Consumable', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 50 GP
Crafting Cost: 25 GP, 3 DTP (Workshop)
Tool: Tinker''s Tools', NULL, 220.0),
('e4fc97fd-86be-5846-affc-157cc4f0dc72', 'LOT_0023', 'Mythallar Bracelet', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Consumable', false, NULL, 'T0 Consumable', '{"NF"}', 'See book for description.

Base Cost: 50 GP
Crafting Cost: 25 GP, 3 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 230.0),
('079d14dc-c9d4-5e4a-bb26-135c164f42b3', 'LOT_0024', 'Olisuba Leaf', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Adventuring gear', 'Consumable', false, NULL, 'T0 Consumable', '{"EGW"}', 'See book for description.

Base Cost: See Equipment.
Crafting Cost: See Equipment.', NULL, 240.0),
('0b785eaa-c513-5fd7-a0cf-98a5b7893fe0', 'LOT_0025', 'Perfume of Bewitching', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Consumable', false, NULL, 'T0 Consumable', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 50 GP (plus 5 GP for Perfume)
Crafting Cost: 25 GP (plus 5 GP for Perfume), 3 DTP (Workshop)
Tool: Alchemist''s Supplies', NULL, 250.0),
('3a93f4d7-ffb7-5863-97f1-e6049e0dc076', 'LOT_0026', 'Pot of Awakening', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Consumable', false, NULL, 'T0 Consumable', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 50 GP
Crafting Cost: 25 GP, 3 DTP (Workshop)
Tool: Potter''s Tools', NULL, 260.0),
('b9147398-58e5-5843-ae18-35ac4d39c040', 'LOT_0027', 'Potion of Animal Friendship', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Potion', 'Consumable', false, NULL, 'T0 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 50 GP (plus 1 GP for Vial)
Crafting Cost: 25 GP (plus 1 GP for Vial), 3 DTP (Garden, Greenhouse, or Laboratory)
Tool: Alchemist''s Supplies', NULL, 270.0),
('bd3f9242-6072-5158-8b86-4d6054a0fa92', 'LOT_0028', 'Potion of Poison', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Potion', 'Consumable', false, NULL, 'T0 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 50 GP (plus 1 GP for Vial)
Crafting Cost: 25 GP (plus 1 GP for Vial), 3 DTP (Garden, Greenhouse, or Laboratory)
Tool: Poisoner''s Kit', NULL, 280.0),
('5f92de28-4008-5ca1-9afc-11b4f60fb02a', 'LOT_0029', 'Potion of Healing', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Potion', 'Consumable', false, NULL, 'T0 Consumable', '{"PHB2014", "PHB2024"}', 'See book for description.

Base Cost: See Equipment.
Crafting Cost: See Equipment.', NULL, 290.0),
('5972fc63-8e6f-5e8a-ba7c-868b6d0ba81d', 'LOT_0030', 'Potion of Watchful Rest', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Potion', 'Consumable', false, NULL, 'T0 Consumable', '{"WDMM"}', 'See book for description.

Base Cost: 50 GP (plus 1 GP for Vial)
Crafting Cost: 25 GP (plus 1 GP for Vial), 3 DTP (Garden, Greenhouse, or Laboratory)
Tool: Alchemist''s Supplies', NULL, 300.0),
('3df027ee-5470-5df7-a3d7-9b29c16600a5', 'LOT_0031', 'Pressure Capsule', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Consumable', false, NULL, 'T0 Consumable', '{"GoS"}', 'See book for description.

Base Cost: 50 GP
Crafting Cost: 25 GP, 3 DTP (Workshop)
Tool: Herbalism Kit', NULL, 310.0),
('26759662-eb5c-5601-ba88-06ee4b9ff3d9', 'LOT_0032', 'Ryath Root', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Adventuring gear', 'Consumable', false, NULL, 'T0 Consumable', '{"ToA"}', 'See book for description.

Base Cost: See Equipment.
Crafting Cost: See Equipment.', NULL, 320.0),
('5d5bc5c0-cc1c-585d-8aa9-4011cdf98d76', 'LOT_0033', 'Silvered Ammunition', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Ammunition (any type)', 'Consumable', false, NULL, 'T0 Consumable', '{"PHB2014", "DMG2024"}', 'See book for description.

Base Cost: See Equipment.
Crafting Cost: See Equipment.', NULL, 330.0),
('3ca8da3f-59a9-5a0c-b205-60620963db2f', 'LOT_0034', 'Sinda Berries', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Mundane', 'Consumable', false, NULL, 'T0 Consumable', '{"ToA"}', 'See book for description.

Base Cost: See Equipment.
Crafting Cost: See Equipment.', NULL, 340.0),
('71a1967e-8829-59e3-bae2-d52172581bfe', 'LOT_0035', 'Spell Scroll (Cantrip)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Scroll', 'Consumable', false, NULL, 'T0 Consumable', '{"DMG2014"}', 'See book for description.

Base Cost: See Equipment
Crafting Cost: See Downtime (Scribing Spell Scroll)', NULL, 350.0),
('e1a4b066-5c29-53ce-9e7d-f82763efee1d', 'LOT_0036', 'Spell Scroll (Level 1)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Scroll', 'Consumable', false, NULL, 'T0 Consumable', '{"DMG2014"}', 'See book for description.

Base Cost: See Equipment
Crafting Cost: See Downtime (Scribing Spell Scroll)', NULL, 360.0),
('69d0bee5-b026-5a8a-b522-68c9e3aa2e1f', 'LOT_0037', 'Spellwrought Tattoo (Cantrip)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item (tattoo)', 'Consumable', false, NULL, 'T0 Consumable', '{"TCE"}', 'See book for description.

Base Cost: 50 GP
Crafting Cost: 25 GP, 3 DTP (Workshop)
Tool: Painter''s Supplies', NULL, 370.0),
('f395e7d9-b07f-59a4-bd4e-15385c98d027', 'LOT_0038', 'Spellwrought Tattoo (Level 1)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item (tattoo)', 'Consumable', false, NULL, 'T0 Consumable', '{"TCE"}', 'See book for description.

Base Cost: 125 GP
Crafting Cost: 62.5 GP, 4 DTP (Workshop)
Tool: Painter''s Supplies', NULL, 380.0),
('b3b27f9e-b932-579d-b5a8-88495e35daa4', 'LOT_0039', 'Theki Root', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Mundane', 'Consumable', false, NULL, 'T0 Consumable', '{"ToA"}', 'See book for description.

Base Cost: See Equipment.
Crafting Cost: See Equipment.', NULL, 390.0),
('8c9603cb-6bd6-54dc-89ab-9747bccc5a82', 'LOT_0040', 'Unbreakable Ammunition (Unbreakable Arrow) (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Ammunition (any)', 'Consumable', false, NULL, 'T0 Consumable', '{"XGE"}', 'See book for description.

Base Cost (of 10x ammunition): 50 GP (plus cost of 10x ammunition)
Crafting Cost (of 10x): 25 GP (plus cost of 10x ammunition), 3 DTP (Smithy)
Tool: See Equipment (depends on ammunition type)', NULL, 400.0),
('10cad231-5701-5549-a576-6cb01a96938c', 'LOT_0041', 'Walloping Ammunition (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Ammunition (any)', 'Consumable', false, NULL, 'T0 Consumable', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost (of 10x ammunition): 50 GP (plus cost of 10x ammunition)
Crafting Cost (of 10x ammunition): 25 GP (plus cost of 10x ammunition), 3 DTP (Smithy)
Tool: See Equipment (depends on ammunition type)', NULL, 410.0),
('58f5d580-ca1f-586f-9dd0-96ae76150ba2', 'LOT_0042', 'Wildroot', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Mundane', 'Consumable', false, NULL, 'T0 Consumable', '{"ToA"}', 'See book for description.

Base Cost: See Equipment.
Crafting Cost: See Equipment.', NULL, 420.0),
('44285aa8-0d18-564b-92fa-2adeceba7aca', 'LOT_0043', 'Wukka Nut', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Mundane', 'Consumable', false, NULL, 'T0 Consumable', '{"ToA"}', 'See book for description.

Base Cost: See Equipment.
Crafting Cost: See Equipment.', NULL, 430.0),
('1532b33d-d526-526f-9e55-c61cd853bbe5', 'LOT_0044', 'Yahcha', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Mundane', 'Consumable', false, NULL, 'T0 Consumable', '{"ToA"}', 'See book for description.

Base Cost: See Equipment.
Crafting Cost: See Equipment.', NULL, 440.0),
('5c159e96-5c78-51e1-9e07-56bd5ba2db4c', 'LOT_0045', 'Zabou', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Mundane', 'Consumable', false, NULL, 'T0 Consumable', '{"ToA"}', 'See book for description.

Base Cost: See Equipment.
Crafting Cost: See Equipment.', NULL, 450.0),
('9c3befab-83ae-5806-83e6-3c690f4b3736', 'LOT_0046', 'Adamantine Weapon (any melee)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Melee weapon (any)', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: See Equipment.
Crafting Cost: See Equipment.', NULL, 460.0),
('4cc71ccb-7012-5e20-b8cb-e13ee7155f47', 'LOT_0047', 'Adventurer''s Ring', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Ring', 'Permanent', false, NULL, 'T0 Permanent', '{"FRHOF"}', 'See book for description.

Base Cost: 250 GP
Crafting Cost: 125 GP, 5 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 470.0),
('ba7c60cd-cad1-5602-b269-5cc57fb489c9', 'LOT_0048', 'Armblade (any melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Weapon (any melee weapon)', 'Permanent', false, NULL, 'T0 Permanent', '{"ERLW"}', 'See book for description.

Base Cost: 100 GP (plus cost of weapon)
Crafting Cost: 50 GP (plus cost of weapon), 5 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 480.0),
('096efa9e-3318-52b7-bb53-a62ec805a8fb', 'LOT_0049', 'Armor of Gleaming (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Armor (any)', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 100 GP (plus cost of armor)
Crafting Cost: 50 GP (plus cost of armor), 5 DTP (Smithy)
Tool: See Equipment (depends on armor type)', NULL, 490.0),
('bb2e4078-2706-57db-9c92-5a2a9f392e8f', 'LOT_0050', 'Backpack Parachute', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Mundane', 'Permanent', false, NULL, 'T0 Permanent', '{"WDH"}', 'See book for description.

Base Cost: See Equipment.
Crafting Cost: See Equipment.', NULL, 500.0),
('0a8b745b-cdf4-5f91-bba5-79e8f47b77dd', 'LOT_0051', 'Band of Friendship (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"HHB"}', 'Wondrous item, T0

This simple charm bracelet was made to help children by providing them with a friendly animal companion. While wearing this bracelet, you can cast the Find Familiar spell from it. When you cast this spell from the bracelet, the familiar is Fey and disappears at the next dawn.  This property can''t be used again until the next dawn.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 510.0),
('b2b1214f-de84-5c72-beb4-744d496eeeb1', 'LOT_0052', 'Band of Loyalty', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Ring', 'Permanent', false, NULL, 'T0 Permanent', '{"WGE"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 520.0),
('092525ae-345e-55d6-aad1-4efd700f6cb1', 'LOT_0053', 'Basilisk Crystal', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"HWT"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 530.0),
('f0e92847-a042-5115-95ba-7b0770731f7e', 'LOT_0054', 'Beardling Belt (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"HHB"}', 'Wondrous item, T0

Often worn by young dwarves seeking to woo a partner.

While wearing this belt, you have a 50 percent chance each day at dawn of growing a full beard, or a thicker beard if you already have one. If not wearing this belt at dawn, you have a 50% of losing your beard.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Leatherworker''s Tools', NULL, 540.0),
('e8dff2f1-643a-5010-86df-f9629f11bfb6', 'LOT_0055', 'Bonded Rings (HB) (pair of)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Ring', 'Permanent', false, NULL, 'T0 Permanent', '{"HHB"}', 'Ring, T0 (Requires Attunement)

This pair of matching platinum rings can be worn and attuned to by you and another creature. For as long as you and the other creature wear and remain attuned to the rings,
while the other creature is alive and on the same of plane of existence as you, you know their emotional state and if they are healthy (at full hit points) or injured (missing hit points). In addition, you can cast Sending targeting the bearer of the other ring if you and they are wearing the rings and are attuned to them. Once you use this property, you can''t do so again until the next dawn.

Attuning to this ring doesn''t count against the normal number of items you can attune to, but you can''t attune to more than one Bonded Ring at a time as normal.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 550.0),
('190ed70d-7bdc-560c-8f85-cef7b1a38415', 'LOT_0056', 'Boots of False Tracks', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Cobbler''s Tools', NULL, 560.0),
('771d5b56-8c36-55e2-b14a-9eaa74b8e911', 'LOT_0057', 'Bottle of Boundless Coffee', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"SCC"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Potter''s Tools', NULL, 570.0),
('236341e0-4ed9-5702-9abd-79489c076816', 'LOT_0058', 'Breathing Bubble', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"EGW"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Glassblower''s Tools', NULL, 580.0),
('da060a74-1ca0-5700-88cc-80de8cd1f459', 'LOT_0059', 'Butter Cookie Tin of Weaving (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"HHB"}', 'Wondrous item, T0

This small blue tin is decorated with little windmills and pretzel shaped cookies and looks like an ordinary confectionary container, but it often holds a less than sweet surprise. When you open the tin, you can use an action to speak its command phrase, “Ooh! Cookies!” and open the tin. Roll a d4.  On a 1 - 3 on the d4, the tin contains a set of Weaver''s Tools; you have proficiency with these tools if you don''t already have proficiency with Weaver''s Tools, and the tools disappear at the next dawn. On a 4 on the d4, the tin contains 12 tiny butter cookies; any cookies that remain uneaten disappear at the next dawn. This property of the cookie tin can''t be used again until the next dawn.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Cook''s Utensils', NULL, 590.0),
('50da2b40-c9de-5d4a-a928-b786c3704f09', 'LOT_0060', 'Candle of the Deep', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 100 GP (plus 0.01 GP for Candle)
Crafting Cost: 50 GP (plus 0.01 GP for Candle), 5 DTP (Workshop)
Tool: Herbalism Kit', NULL, 600.0),
('4a739a4a-ea32-5b50-b991-e2247c573a2f', 'LOT_0061', 'Cast-Off Armor (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Armor (any)', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 100 GP (plus cost of armor)
Crafting Cost: 50 GP (plus cost of armor), 5 DTP (Smithy)
Tool: See Equipment (depends on armor type)', NULL, 610.0),
('25c1a3ca-4c27-5ab4-985a-c5bd91b72be2', 'LOT_0062', 'Charlatan''s Die', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Gaming Set (Dice Set)', NULL, 620.0),
('c247d4c8-ecff-502c-9d80-2fd2249d9f65', 'LOT_0063', 'Charm Weapon (HB) (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Weapon (any)', 'Permanent', false, NULL, 'T0 Permanent', '{"HHB"}', 'Weapon (any), T0

This bejeweled charm in the shape of a weapon can be fashionably worn as jewelry. While holding the charm, as a Bonus Action, you can speak the command word to grow the charm to a full size version of the weapon or to return the weapon to normal size. While in its jewelry form, it appears as nonmagical to the Detect Magic spell.

Base Cost: 100 GP (plus cost of weapon)
Crafting Cost: 50 GP (plus cost of weapon), 5 DTP (Workshop)
Tool: See Equipment (depends on weapon type)', NULL, 630.0),
('305eddeb-5112-59be-bbf6-10ce963d27ba', 'LOT_0064', 'Chef’s Apron of Adventurous Palates (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"HHB"}', 'Wondrous item, T0

While wearing this apron, you gain a +1 bonus to ability checks involving the harvesting and preparation of edible materials from creatures.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Weaver''s Tools', NULL, 640.0),
('766a2356-38a1-53c6-b3f5-1a71d030a852', 'LOT_0065', 'Chest of Preserving', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"WDMM"}', 'See book for description.

Base Cost: 100 GP (plus 5 GP for Chest)
Crafting Cost: 50 GP (plus 5 GP for Chest), 5 DTP (Workshop)
Tool: Carpenter''s Tools', NULL, 650.0),
('1bdd115a-3f2d-5f6a-94cc-128a7e6e09db', 'LOT_0066', 'Circlet of Human Perfection', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"WDMM"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 660.0),
('748b31a5-fddd-5192-a576-b6280484d30c', 'LOT_0067', 'Clan Sigil Sash (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Permanent', true, NULL, 'T0 Permanent (DM Select)', '{"HHB"}', 'Wondrous Item, T0

This sash bears the symbol of the Yamato Clan: a stylized cherry blossom woven with a silver crescent and black feathers. It glows faintly under the moonlight.

Jōka. While wearing the sash, you can cast the Prestidigitation spell to clean yourself and any equipment you are wearing or carrying only.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 670.0),
('58430c88-ebad-5ad3-9c0f-55e5652c4cee', 'LOT_0068', 'Cleansing Stone', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"ERLW"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Mason''s Tools', NULL, 680.0),
('b03d0da3-fe09-5f93-b6a6-8050c3e40c3b', 'LOT_0069', 'Cloak of Billowing', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Weaver''s Tools', NULL, 690.0),
('84d845d7-1b5a-5634-8243-4a181f105bfc', 'LOT_0070', 'Cloak of Many Fashions', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Weaver''s Tools', NULL, 700.0),
('487f9fe3-f50f-5f14-b4be-34f0af37b9b8', 'LOT_0071', 'Clockwork Amulet', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Tinker''s Tools', NULL, 710.0),
('90918eb3-304a-590c-80bb-71ccd07d6dc8', 'LOT_0072', 'Clockwork Dog', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"SKT"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Tinker''s Tools', NULL, 720.0),
('48c5b217-9762-5d10-a621-ffe138a3a927', 'LOT_0073', 'Clothes of Mending', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 100 GP (plus 2 GP for Traveler''s Clothes)
Crafting Cost: 50 GP (plus 2 GP for Traveler''s Clothes), 5 DTP (Workshop)
Tool: Weaver''s Tools', NULL, 730.0),
('5b803da2-d290-5ec0-8ad9-145d8425edc0', 'LOT_0074', 'Coin of Delving', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"EGW"}', 'See book for description.

Base Cost: 100 GP (plus 0.01 GP for 1 copper piece)
Crafting Cost: 50 GP (plus 0.01 GP for 1 copper piece), 5 DTP (Workshop)
Tool: Smith''s Tools', NULL, 740.0),
('ddebab4a-235f-5b00-ad80-480c9115bc59', 'LOT_0075', 'Colorful Helm (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"HHB"}', 'Wondrous item, T0

This eldritch helmet doesn''t appear to be any one color. 

When you make a Charisma (Persuasion) check while wearing the helmet, you can cause your eye color to cycle through the visual spectrum and roll a d6. You have Advantage on the Charisma (Persuasion) check if you rolled an even number on the d6, and you have Disadvantage on the check instead if you rolled an odd number on the d6. Once used, this property can''t be used again until the next dawn.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Smith''s Tools', NULL, 750.0),
('9ab6f1e5-d8fb-51a2-9e4e-04512095334f', 'LOT_0076', 'Common Glamerweave', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"ERLW"}', 'See book for description.

Base Cost: 100 GP (plus cost of clothes)
Crafting Cost: 50 GP (plus cost of clothes), 5 DTP (Workshop)
Tool: Weaver''s Tools', NULL, 760.0),
('6df0a554-a3d4-5928-b64a-b5db79c6eae7', 'LOT_0077', 'Container with a Secret Compartment (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Mundane', 'Permanent', false, NULL, 'T0 Permanent', '{"HHB"}', 'Adventuring gear

A creature notices the secret compartment only within a successful Wisdom (Perception) check made if they are inspecting the container.  The DC of the check depends on the quality of the pouch from 15 - 25 (as determined by the DM).

Base Cost: 100 GP (plus cost of container such as a backpack)
Crafting Cost: 50 GP (plus cost of container), 5 DTP (Workshop)
Tool: See Equipment (depends on type of container)', NULL, 770.0),
('b79e3418-f704-5d9a-bed1-f7c00041f312', 'LOT_0078', 'Crystal-Core Weapon (HB) (any melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Weapon (any melee weapon)', 'Permanent', false, NULL, 'T0 Permanent', '{"HHB"}', 'Weapon (any melee weapon), T0 (requires attunement)

This weapon has 5 charges, and it regains 1d4+1 expended charges daily at dawn. You can use a Bonus Action while holding this weapon to expend up to 3 charges, and the next attack you make with this weapon until the end of your next turn has a bonus to its attack and damage rolls equal to the amount of expended charges (maximum of a +3 bonus).

Base Cost: 100 GP (plus cost of weapon)
Crafting Cost: 50 GP (plus cost of weapon), 5 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 780.0),
('9369ac44-79df-598c-be0e-ab305344cf31', 'LOT_0079', 'Cuddly Strixhaven Mascot', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"SCC"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Weaver''s Tools', NULL, 790.0),
('832392d7-6a7f-5db1-acf5-4925d3cfeb7c', 'LOT_0080', 'Dark Shard Amulet', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 100 GP (plus 5 GP for Amulet)
Crafting Cost: 50 GP (plus 5 GP for Amulet), 5 DTP (Arcane Study)
Tool: Jeweler''s Tools', NULL, 800.0),
('ac36ceb0-4b17-521a-8269-1fc99dd2df3f', 'LOT_0081', 'Dread Helm', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Smith''s Tools', NULL, 810.0),
('dbf7d107-dae2-5c1c-bcf0-4d82fccaa4c3', 'LOT_0082', 'Ear Horn of Hearing', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Tinker''s Tools', NULL, 820.0),
('9f6ae467-2ecb-5223-829d-7726fe2ff82b', 'LOT_0083', 'Earring of Message', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"CRCotN"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 830.0),
('849dd660-ae67-5f5d-853c-6214014fd006', 'LOT_0084', 'Emblem of the Order (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"HHB"}', 'Wondrous item, T0

This Emblem serves as faction insignia given to new members of the Order of the Gauntlet and to mark them as belonging to the faction. Prominently displayed upon the Emblem is the symbol of the Order of the Gauntlet: a gauntleted fist grasping a sword by the blade.

You can use this Emblem as a Holy Symbol. While wearing the fabric or holding the Shield that the Emblem is borne upon, you can take a Bonus Action to cause the Emblem to shed Bright Light in a 10-foot radius and Dim Light for an additional 10 feet, or to extinguish the light.

Base Cost: 100 GP (plus 5 GP for Emblem)
Crafting Cost: N/A (cannot be crafted)', NULL, 840.0),
('f3cdb869-bf96-56f5-800c-80bbf93ed235', 'LOT_0085', 'Emerald Enclave Clasp (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"HHB"}', 'Wondrous item, T0

This copper cloak clasp is in the shape of a leaf accented with green enamel and serves as faction insignia for new members of the Emerald Enclave. 

While wearing this clasp, you can take a Magic action to determine which way is magnetic north. Nothing happens if the clasp is used in a location that has no magnetic north. Additionally, you can cast the Druidcraft spell from this clasp to predict the weather at your location only.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 850.0),
('79112c30-b2aa-5d20-bea1-c3e08621a469', 'LOT_0086', 'Enduring Spellbook', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 100 GP (plus 50 GP for Spellbook)
Crafting Cost: 50 GP (plus 50 GP for Spellbook), 5 DTP (Workshop)
Tool: Leatherworker''s Tools', NULL, 860.0),
('210462eb-e3b5-59fb-bd7d-4e1cd8e3cde7', 'LOT_0087', 'Ersatz Eye', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Tinker''s Tools', NULL, 870.0),
('e971adaf-1639-595e-aa80-0380c32a3b02', 'LOT_0088', 'Everbright Lantern', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"ERLW"}', 'See book for description.

Base Cost: 100 GP (plus 10 GP for Bullseye Lantern)
Crafting Cost: 50 GP (plus 10 GP for Bullseye Lantern), 5 DTP (Workshop)
Tool: Tinker''s Tools', NULL, 880.0),
('875a14ec-4c94-5338-a058-21264f8e2a8a', 'LOT_0089', 'Everchill Armor (HB) (any metal armor)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Armor (any metal armor)', 'Permanent', false, NULL, 'T0 Permanent', '{"HHB"}', 'Armor (Any metal armor), T0

This magic armor is infused with a shard of never melting ice, always leaving you pleasantly cool no matter what environment you are in. You are immune to the effects of extreme heat and the armor can''t become hot enough to affect or damage you, such as through the Heat Metal spell.

Base Cost: 100 GP (plus cost of armor)
Crafting Cost: 50 GP (plus cost of armor), 5 DTP (Smithy)
Tool: See Equipment (depends on armor type)', NULL, 890.0),
('63c0e34d-ff62-5ab8-9a55-d372e82be546', 'LOT_0090', 'Eyes of the Eagle (2014)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"DMG2014"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Glassblower''s Tools', NULL, 900.0),
('18390e36-a978-5fef-abb9-79ae8b3feeaa', 'LOT_0091', 'Fabulist Gem', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"BMT"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 910.0),
('1d108962-da34-53d0-87ff-ba43fb3f58bb', 'LOT_0092', 'Family Insignia (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Trinket', 'Permanent', false, NULL, 'T0 Permanent', '{"HHB"}', 'Trinket, T0

As newly inducted member of a crime family, you have been presented with a family insignia: a ring, a coin, a tattoo, or some other ornament appropriate to the family. The insignia bears the symbol of the crime family and is unique to each crime family.

When you display this insignia in the area where the crime family exerts its influence, you have Advantage on Intimidation checks made against merchants, travelers, and others that fear and respect the influence of the crime family in the region.   

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 920.0),
('d6d3709c-b69c-5397-913d-38a36ed04389', 'LOT_0093', 'Fatestrike Weapon (HB) (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Weapon (any)', 'Permanent', false, NULL, 'T0 Permanent', '{"HHB"}', 'Weapon (any), T0 (requires attunement)

This weapon bears Dwarvish runes which read "Opportunities multiply as they are seized." 

When you make the first attack of the Attack action on your turn with this magic weapon, you can choose to forgo any additional attacks you can make with the Attack action as the result of Extra Attack or other game features that let you make additional attacks as part of the Attack action. If you hit with the attack, you roll one additional weapon damage die for each attack forwent to determine the attack''s damage roll.

Base Cost: 100 GP (plus cost of weapon)
Crafting Cost: 50 GP (plus cost of weapon), 5 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 930.0),
('9dc2ac6e-0c90-5513-adf3-45a469ffccf4', 'LOT_0094', 'Gambler''s Shells (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"HHB"}', 'Wondrous item, T0

These three pink coral shells are each carved with an eye on the outside. You can use an action to magically teleport a Tiny object that fits in one of the shells to another within 20 feet. If used to play a shell game, a creature observing the game can discern the effect with a DC 15 Intelligence (Arcana) check and has Advantage on the check if they are proficient with a gaming set.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 940.0),
('712225ef-5c58-57c8-8687-3d3bec45dbdf', 'LOT_0095', 'GEAR Multi-Tool (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', true, NULL, 'T0 Permanent (DM Select)', '{"HHB"}', 'Wondrous Item, T0

This intricate device is about 6 inches wide and bears the symbol of GEAR: a gear with a bomb in the center, with its fuse lit with a faint ember glow. The device is made of metal that reflects your rank within GEAR: copper, brass, steel, adamantine, or mithral. As you rise up the ranks, this device is modified and upgraded to accommodate the new metal.

The GEAR Multi-Tool contains multiple tools folded within it. While holding it, you can take an Utilize action to transform the GEAR Multi-Tool into one of the following tools of your choice: Thieves'' Tools, Tinker''s Tools, or Weaver''s Tools. 

You can add 1d4 to an ability check made with one of these tools while holding it. Once used, this property can''t be used again until the next dawn.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 950.0),
('b964fdfc-e0d4-5225-bf32-c0362efa236d', 'LOT_0096', 'Gem of the Dune Court (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', true, NULL, 'T0 Permanent (DM Select)', '{"HHB"}', 'Wondrous item, T0

As a newly inducted member of the Court of Dunes, you gain access to its outer courts and have been gifted this gem by Lady Sirocco, archfey and ambassador of the Court of Dunes.

While this gem is on your person, you have Advantage on Intelligence (Investigation) checks made to uncover secrets.

Message. While holding the gem, you can take a Magic action to cause the gem to emit a magical pulse of light and cast the Message spell, except its range is 300 feet. This property of the gem can''t be used again until the next dawn.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 960.0),
('22fcf98b-a875-550d-b2eb-27669284cc72', 'LOT_0097', 'Gilded Accord Amulet (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', true, NULL, 'T0 Permanent (DM Select)', '{"HHB"}', 'Wondrous item, T0

As a member of the Gilded Accord, you are an operative assigned to confront threats and gather intelligence. To mark your membership with the organization, you are given this amulet.

Whenever you finish a Long Rest while wearing this amulet, you can choose one of the following creature types: Aberration, Celestial, Elemental, Fey, Fiend, or Undead. While the amulet is within 150 feet of a creature of the chosen type, it feels noticeably colder. Additionally, while the amulet is within 30 feet of another Gilded Accord Amulet, it subtly vibrates to warn you.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 970.0),
('d78c9b56-0ad6-551e-bea6-b8e9a8b0d70f', 'LOT_0098', 'Gloves of Training (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"HHB"}', 'Wondrous item, T0 (requires attunement)

These well-worn leather gloves were once worn by a retired professional boxer. Despite their age, they still radiate a sense of purpose to train the wearer for greater challenges ahead.

You can spend 10 minutes practicing boxing while wearing these gloves: at the end of the practice, you gain a number of Temporary Hit Points equal to your Proficiency Bonus. This property can''t be used again until the next dawn.

Float like a Butterfly.  If you take damage from an attack while wearing these gloves, you can use your reaction to reduce the damage by an amount equal to your Proficiency Bonus. This property can''t be used again until the next dawn.

Sting like a Bee. When you make an Unarmed Strike while wearing these gloves, you can forgo rolling the d20 on the attack roll to get a 10 on the die. Once used, this property can''t be used again until the next dawn.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Leatherworker''s Tools', NULL, 980.0),
('c46d44d4-7b70-5c12-ac2f-67eebdeca753', 'LOT_0099', 'HALO Insignia Cloak (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', true, NULL, 'T0 Permanent (DM Select)', '{"HHB"}', 'Wondrous item, T0

As a newly inducted member of HALO, you are a crew member of a vessel and entrusted to carry standard cargo. To aid in your duties and identify you as a member of HALO, you have received this cloak.

While wearing this cloak, you have Advantage on Strength (Athletics) checks made to swim and you cannot become lost while traveling by ship except by magical means.

Message. While wearing the cloak, you can take a Magic action to cause the cloak to emit a magical pulse of light and cast the Message spell, except its range is 300 feet. This property of the cloak can''t be used again until the next dawn.                        

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 990.0),
('45ca173e-e4cc-5a03-b96a-9be4990104c9', 'LOT_0100', 'Handlewart Weapon (HB) (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Weapon (any)', 'Permanent', false, NULL, 'T0 Permanent', '{"HHB"}', 'Weapon (any), T0

This weapon''s grip is made from the wood of a handlewart tree. Handlewart trees are rare trees with wood that is light but is as durable as steel and containing buds which can severely weaken or even kill those that imbibe high quantities of spice ground from such buds. Weapons with handlewart wood handles or grips seem to anticipate the intentions of their wielders, shifting the weapon''s weight to alter the trajectory of an attack that would otherwise miss in less skilled hands.

You don''t automatically miss a target with an attack made with this magic weapon due to rolling a 1 on the d20 for the attack roll. The attack roll must still equal or exceed the target''s Armor Class to hit as normal. If you roll a 1 on the d20 for an attack roll made with this weapon and the attack hits the target, the target takes only half damage from the attack.

Base Cost: 100 GP (plus cost of weapon)
Crafting Cost: 50 GP (plus cost of weapon), 5 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 1000.0);

INSERT INTO public.ac_loot (
    id, check_id, name, category_id, tier_id, type, nature, is_dm_select, event_category, tier_display, source, description, notes_advice, display_order
) VALUES
('640cd4b9-99f2-583a-a753-5f9bb3eca431', 'LOT_0101', 'Harper Token (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"HHB"}', 'Wondrous item, T0

This silver brooch is embossed with the symbol of the Harpers, depicting a harp against a crescent moon. This brooch is presented to newly inducted members of the Harpers to serve as faction insignia as a token of their membership.

While wearing this brooch, you gain the following benefit.

Telepathic Detection. The pin grows warm if a creature within 30 feet of yourself attempts to use telepathy to communicate.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 1010.0),
('a12b5b6e-3268-570a-bc25-d79063e6790b', 'LOT_0102', 'Hat of Vermin', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Weaver''s Tools', NULL, 1020.0),
('e1200688-848b-5f72-8e8a-81acc2ee994f', 'LOT_0103', 'Hat of Vortexes', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Permanent', false, NULL, 'T0 Permanent', '{"NF"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Weaver''s Tools', NULL, 1030.0),
('cb0f9511-1008-5868-99af-fa6480ea8b21', 'LOT_0104', 'Hat of Wizardry', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Arcane Study)
Tool: Weaver''s Tools', NULL, 1040.0),
('b20a1204-032a-5ab7-8c5c-276c64c56ef2', 'LOT_0105', 'Heward''s Handy Spice Pouch', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 100 GP (plus 0.5 GP for Pouch)
Crafting Cost: 50 GP (plus 0.5 GP for Pouch), 5 DTP (Workshop)
Tool: Cook''s Utensils', NULL, 1050.0),
('eb8766e4-f7bb-59fb-94b4-7ae64738f172', 'LOT_0106', 'Horn of Silent Alarm', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Tinker''s Tools', NULL, 1060.0),
('5bd2ad7a-411f-509d-abe5-c83c087875bd', 'LOT_0107', 'Illuminator''s Tattoo', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item (tattoo)', 'Permanent', false, NULL, 'T0 Permanent', '{"TCE"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Painter''s Supplies', NULL, 1070.0),
('f5ed7804-b8d8-5d58-97b5-d989674ed911', 'LOT_0108', 'Imbued Wood Focus (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Rod, staff, or wand', 'Permanent', false, NULL, 'T0 Permanent', '{"ERLW"}', 'See book for description.

Base Cost: 100 GP (plus cost of focus)
Crafting Cost: 50 GP (plus cost of focus), 5 DTP (Arcane Study, Sanctuary, or Sacristy)
Tool: Woodcarver''s Tools', NULL, 1080.0),
('d8749ab3-195f-5611-9f97-8c4736e2f8f1', 'LOT_0109', 'Instrument of Illusions (any instrument)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item (instrument)', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 100 GP (plus cost of instrument)
Crafting Cost: 50 GP (plus cost of instrument), 5 DTP (Workshop)
Tool: Tinker''s Tools', NULL, 1090.0),
('e920f098-d5fb-5d3d-982f-ef2c7fa59a1e', 'LOT_0110', 'Instrument of Scribing (any instrument)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item (instrument)', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 100 GP (plus cost of instrument)
Crafting Cost: 50 GP (plus cost of instrument), 5 DTP (Workshop)
Tool: Tinker''s Tools', NULL, 1100.0),
('38086a9a-d90b-5603-9e00-2fe77b4cc23c', 'LOT_0111', 'Ioun Stone of Language Knowledge', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"LLK"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 1110.0),
('cbb270fb-2500-5919-bb59-cb13b8b2cce2', 'LOT_0112', 'Ioun Stone of Supreme Intellect', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"LLK"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 1120.0),
('c8b36659-8aa3-545d-bd71-ac864d2e6190', 'LOT_0113', 'Ioun Stone of Vitality', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"IMR"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 1130.0),
('dad04063-8605-525c-864f-e5f82498a8df', 'LOT_0114', 'Keycharm (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"HHB"}', 'Wondrous item, T0

This simple object allows you whoever holds it to access and bypass the protective enchantments it is keyed to. A Keycharm is a Tiny object that weighs 5 pounds or less whose longest dimension is 3 feet or less. Whenever you cast a spell with an ongoing duration that either triggers an effect in response to a circumstance or that can designate one or more creatures to be subjected or not subjected to its effect, you can expend 50 GP worth of diamonds and tie the spell to the keycharm and designate a corresponding command word. While a creature holds the keycharm, it doesn''t trigger the tied spell''s effect, is designated to avoid the tied spell''s effect if it can be, and knows if the tied spell triggered. For example, the holder of the keycharm wouldn''t trigger a tied Glyph of Warding, could bypass a tied Arcane Lock, and would know if a tied Alarm was triggered. The holder of the keycharm can also use an action to speak the designated command word to end the corresponding tied spell. The Keycharm can have up to three tied spells at one time. 

Base Cost: See Equipment
Crafting Cost: See Equipment', NULL, 1140.0),
('d910a99a-8ce5-55dd-bc25-814271003cc7', 'LOT_0115', 'Lamps of Affection (HB) (pair of)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"HHB"}', 'Wondrous item, T0

This pair of matching lamps have heart shaped windows.  To activate and bond these lamps, two different creatures must place a drop of their blood into a respective lampwick.  While lit, the lamp burns for 6 hours on a flask (1 pint) of oil.  As long as the lamps and their bonded creatures are on the same plane of existence, when one of the bonded creatures thinks of the other while both lamps are lit, the lamp’s twin glows a soft pink light.  Bonding the lamps to different creatures requires replacing the lampwick using 1 GP worth of supplies and 10 minutes of work.

Base Cost: 100 GP (plus 0.1 GP for 2x Lamps)
Crafting Cost: 50 GP (plus 0.1 GP for 2x Lamps), 5 DTP (Workshop)
Tool: Potter''s Tools', NULL, 1150.0),
('e3b4385e-de60-5f7c-9cbf-d336575e30bb', 'LOT_0116', 'Lantern of Tracking (type chosen or rolled for by DM)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"IDRotF"}', 'See book for description.

Base Cost: 100 GP (plus 5 GP for Hooded Lantern)
Crafting Cost: 50 GP (plus 5 GP for Hooded Lantern), 5 DTP (Workshop)
Tool: Tinker''s Tools', NULL, 1160.0),
('426fda4d-0065-5d93-8fb6-6d5e74197f4c', 'LOT_0117', 'Lesser Chromatic Fang (HB) (any melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Weapon (any melee weapon)', 'Permanent', false, NULL, 'T0 Permanent', '{"HHB"}', 'Weapon (any melee weapon), T0

This weapon is made from the extracted fang of a chromatic dragon. You have a +1 bonus to attack and damage rolls with this magic weapon against the kind of dragon the fang was extracted: Red, Blue, Green, Black, or White.

Base Cost: 100 GP (plus cost of weapon)
Crafting Cost: 50 GP (plus cost of weapon), 5 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 1170.0),
('63ad5250-8ba6-5e37-b853-f7c7147b9304', 'LOT_0118', 'Lock', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Adventuring gear', 'Permanent', false, NULL, 'T0 Permanent', '{"PHB2014", "PHB2024"}', 'See book for description.

Base Cost: See Equipment.
Crafting Cost: See Equipment.', NULL, 1180.0),
('d62fc25b-55d5-56b4-b120-51e35f65d0d8', 'LOT_0119', 'Lock of Trickery', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 100 GP (plus 10 GP for Lock)
Crafting Cost: 50 GP (plus 10 GP for Lock), 5 DTP (Workshop)
Tool: Tinker''s Tools', NULL, 1190.0),
('33bffa4f-f9ff-5c33-9574-0d1509b440e2', 'LOT_0120', 'Lotus Seed Clip (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Trinket', 'Permanent', true, NULL, 'T0 Permanent (DM Select)', '{"HHB"}', 'Trinket, T0

This brooch or hair clip is a shimmering and prismatic lotus seed. This ornament is presented to newly inducted members of the Prismatic Lotus to serve as faction insignia as a token of their membership.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 1200.0),
('6a10d5ef-f957-5c97-bcb5-dd8d19a43df5', 'LOT_0121', 'Manifold Tool', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"EFA"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Tinker''s Tools', NULL, 1210.0),
('db70d91b-58f3-5d6b-8f62-0b4d66d96c30', 'LOT_0122', 'Mask of Changed Appearance', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"NF"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 1220.0),
('a69cc6ff-9bc8-51c4-b921-fe3f34eecb04', 'LOT_0123', 'Masque Charm', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"SCC"}', 'See book for description.

Base Cost: 250 GP
Crafting Cost: 125 GP, 7 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 1230.0),
('f40f0ade-9e41-5f80-8606-f98426c2e444', 'LOT_0124', 'Masquerade Tattoo', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item (tattoo)', 'Permanent', false, NULL, 'T0 Permanent', '{"TCE"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Painter''s Supplies', NULL, 1240.0),
('f7b04653-35c8-51cd-9f98-45aae77aa770', 'LOT_0125', 'Mechanical Wonder (Flying)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Permanent', false, NULL, 'T0 Permanent', '{"FRAIF"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Tinker''s Tools', NULL, 1250.0),
('1abc7f75-2127-5a68-ba88-c807fbe45e94', 'LOT_0126', 'Mechanical Wonder (Mobility)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Permanent', false, NULL, 'T0 Permanent', '{"FRAIF"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Tinker''s Tools', NULL, 1260.0),
('62af3b32-0f1d-5ec6-a045-900e2aa35fb1', 'LOT_0127', 'Medallion of Blessings (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"HHB"}', 'Wondrous item, T0 (requires attunement)

Whenever you regain Hit Points from a spell while wearing this medallion, you regain an additional 1d4 Hit Points.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 1270.0),
('21725a52-13fa-5348-9f83-32535ae264d0', 'LOT_0128', 'Moon-Touched Weapon (Moon-Touched Sword) (any piercing or slashing melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Weapon (any piercing or slashing melee weapon)', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE"}', 'See book for description.

Base Cost: 100 GP (plus cost of weapon)
Crafting Cost: 50 GP (plus cost of weapon), 5 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 1280.0),
('495eea33-3a20-5dc0-add2-1a5066c1d79d', 'LOT_0129', 'Nightweaver''s Needle (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Permanent', false, NULL, 'T0 Permanent', '{"HHB"}', 'Wondrous Item, T0

The Nightweaver’s Needle is an elegant black pin shaped like a needle, threaded with shimmering, ever-shifting light.

This pin has 3 charges, and regains all of its charges every day at dusk. While holding this needle, you can spend 10 minutes creating or altering one nonmagical accessory or article of clothing from cloth, fabric, and similar materials that fit within 9 square feet of a surface. Additionally, as a Magic action while holding this needle, you can spend 1 charge to instantly change the color, texture, or pattern of any clothing or accessories you are wearing. Finally, as a Magic action while holding this needle, you can spend 2 charges to cast Mending to repair a tear or hole in a piece of fabric. When you cast the spell in this way, you can choose to create a decorative pattern in the repaired area.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Tinker''s Tools', NULL, 1290.0),
('5f19b37c-d19a-5031-9138-1f6131a813d8', 'LOT_0130', 'Onmyō Paper Tag (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Permanent', true, NULL, 'T0 Permanent (DM Select)', '{"HHB"}', 'Wondrous Item, T0

This prayer book bears the symbol of the Yamato Clan: a stylized cherry blossom woven with a silver crescent and black feathers. It contains various prayers and protective verses.

Orizuru. While holding this book, you can cast the Find Familiar spell from it. When you cast this spell from this book, the familiar is Celestial, always takes the form of a Raven made of folded paper, and disappears at the next dawn.  This property can''t be used again until the next dawn.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 1300.0),
('0868bf9a-c7f1-5fae-b4f4-b31a9f8e26a2', 'LOT_0131', 'Orb of Direction', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 100 GP (plus 20 GP for Orb)
Crafting Cost: 50 GP (plus 20 GP for Orb), 5 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 1310.0),
('a33624c1-4e56-5eac-ad14-72b5075be55c', 'LOT_0132', 'Orb of Gonging', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"WDMM"}', 'See book for description.

Base Cost: 100 GP (plus 20 GP for Orb)
Crafting Cost: 50 GP (plus 20 GP for Orb), 5 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 1320.0),
('a5a0b175-f434-567e-9e5d-9a75681896c3', 'LOT_0133', 'Orb of Shielding (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"ERLW"}', 'See book for description.

Base Cost: 100 GP (plus 20 GP for Orb)
Crafting Cost: 50 GP (plus 20 GP for Orb), 5 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 1330.0),
('496b0f4c-941b-5f25-b213-4bef9633d141', 'LOT_0134', 'Orb of Time', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 100 GP (plus 20 GP for Orb)
Crafting Cost: 50 GP (plus 20 GP for Orb), 5 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 1340.0),
('76002678-624f-5d1e-b0e8-deaf56ec3ac1', 'LOT_0135', 'Pipe of Remembrance', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"GoS"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Woodcarver''s Tools', NULL, 1350.0),
('026192a1-befc-5c32-a0aa-f8eb706a7190', 'LOT_0136', 'Pipe of Smoke Monsters', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Woodcarver''s Tools', NULL, 1360.0),
('4fd2becd-f04d-5df5-84c2-adef50d1af1c', 'LOT_0137', 'Pole of Angling', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 100 GP (plus 0.05 GP for Pole)
Crafting Cost: 50 GP (plus 0.05 GP for Pole), 5 DTP (Workshop)
Tool: Carpenter''s Tools', NULL, 1370.0),
('6b361c79-f5ef-5692-ad25-c9b90807e467', 'LOT_0138', 'Pole of Collapsing', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 100 GP (plus 0.05 GP for Pole)
Crafting Cost: 50 GP (plus 0.05 GP for Pole), 5 DTP (Workshop)
Tool: Carpenter''s Tools', NULL, 1380.0),
('d8c6b546-2521-589f-aed4-5b89eec8ce5a', 'LOT_0139', 'Portal Compass', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"SATO"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Tinker''s Tools', NULL, 1390.0),
('e4d331ee-5043-506a-b6be-c3490653aaa4', 'LOT_0140', 'Pride Silk', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Adventuring gear', 'Permanent', false, NULL, 'T0 Permanent', '{"EGW"}', 'See book for description.

Base Cost: See Equipment.
Crafting Cost: See Equipment.', NULL, 1400.0),
('85fc7763-02da-520f-9532-09fd3d0c8fa2', 'LOT_0141', 'Pride Silk Outfit', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Adventuring gear', 'Permanent', false, NULL, 'T0 Permanent', '{"EGW"}', 'See book for description.

Base Cost: See Equipment.
Crafting Cost: See Equipment.', NULL, 1410.0),
('c1cd3b64-892e-547f-87e9-bedb32444f69', 'LOT_0142', 'Prosthetic Limb', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"FRHOF", "TCE", "DMG2024"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Tinker''s Tools', NULL, 1420.0),
('4b393f97-74dd-5b40-944c-bb426644e4a2', 'LOT_0143', 'Replenishing Aquarium Ball (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"HHB"}', 'Wondrous item, T0

This clear, 1-inch-thick glass orb is the size of a large melon and hangs from a thick chain, weighing 20 lbs and holds up to 2 gallons of water.  One Tiny aquatic creature can comfortably fit into the aquarium ball, and the ball refreshes itself each with clean water and fresh food enough to feed the creature inhabiting it. The cap near the top of the ball can be unscrewed for easy access. The ball has AC 15, 15 HP, and Immunity to Poison and Psychic damage. 

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Glassblower''s Tools', NULL, 1430.0),
('a7cd270b-87f3-5122-ac3a-12be0f52bcc8', 'LOT_0144', 'Ring of Truth Telling', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Ring', 'Permanent', false, NULL, 'T0 Permanent', '{"WDH"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 1440.0),
('9ad50a3f-cbf9-5c0e-8973-5f56210b6d39', 'LOT_0145', 'Rival Coin', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"DMG2024"}', 'See book for description.

Base Cost: 100 GP (plus 1 GP for 1 gold piece)
Crafting Cost: 50 GP (plus 1 GP for 1 gold piece), 5 DTP (Workshop)
Tool: Smith''s Tools', NULL, 1450.0),
('aead3ef8-f87d-5b48-bdc8-80e3d3b85687', 'LOT_0146', 'Rope of Mending', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 100 GP (plus 1 GP for Rope)
Crafting Cost: 50 GP (plus 1 GP for Rope), 5 DTP (Workshop)
Tool: Weaver''s Tools', NULL, 1460.0),
('6ee47e10-0549-53c1-84ad-4b316bac90bc', 'LOT_0147', 'Runic Weapon (HB) (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Weapon (any)', 'Permanent', false, NULL, 'T0 Permanent', '{"HHB"}', 'Weapon (any), T0 (requires attunement)

Ancient runes line the surface of this weapon. Whenever you cast a level 1+ spell while holding this weapon, you have a +1 bonus to attack and damage rolls made with this magic weapon until the end of your next turn. The weapon additionally sheds dim light in a 10-foot radius during that time.

Base Cost: 100 GP (plus cost of weapon)
Crafting Cost: 50 GP (plus cost of weapon), 5 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 1470.0),
('57cc4913-67fa-59a1-bee9-93edbead1d6b', 'LOT_0148', 'Scribe''s Pen (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"HHB"}', 'Wondrous item, T0

You can use this quill to write on any solid surface. You choose if this writing is visible (as traced by glowing mystical lines) or invisible, but it is always visible to you. Invisible writing in this way can be detected and read via the use of Detect Magic, See Invisibility, True Seeing, or by applying heat to the surface. If you use the pen to write on a creature that isn''t a Construct, the writing fades after 7 days.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Weaver''s Tools', NULL, 1480.0),
('0094f438-f26c-5bca-9ebe-b0bda6d62be4', 'LOT_0149', 'Shield of Expression', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Armor (shield)', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 100 GP (plus 10 GP for Shield)
Crafting Cost: 50 GP (plus 10 GP for Shield), 5 DTP (Smithy)
Tool: Smith''s Tools', NULL, 1490.0),
('e1468b68-eab4-5eba-b43d-3b231b041780', 'LOT_0150', 'Shiftweave', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"ERLW"}', 'See book for description.

Base Cost: 100 GP (plus cost of clothes)
Crafting Cost: 50 GP (plus cost of clothes), 5 DTP (Workshop)
Tool: Weaver''s Tools', NULL, 1500.0),
('e29bcb22-eaac-5a70-87a1-ae365fbe58c4', 'LOT_0151', 'Signet Ring of the Alliance (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Ring', 'Permanent', false, NULL, 'T0 Permanent', '{"HHB"}', 'Ring, T0

Etched upon this signet ring is the shape of a crown, the symbol of the Lords'' Alliance. Such rings serve as faction insignia for the Lords'' Alliance and are customarily given to newly inducted members and can be dipped in wax to seal important documents.

While wearing this ring, you can take a Magic action to cause your voice or signal to carry clearly for up to 600 feet until the end of your next turn.

Base Cost: 100 GP (plus 5 GP for Signet Ring)
Crafting Cost: N/A (cannot be crafted)', NULL, 1510.0),
('6846676e-8789-5f1e-b3eb-78af6304d332', 'LOT_0152', 'Silvered Weapon (any melee)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Melee weapon (any)', 'Permanent', false, NULL, 'T0 Permanent', '{"PHB2014", "DMG2024"}', 'See book for description.

Base Cost: See Equipment.
Crafting Cost: See Equipment.', NULL, 1520.0),
('6b4a6900-7133-5919-9b99-913bdb140f36', 'LOT_0153', 'Slanderous Skullcap (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"HHB"}', 'Wondrous item, T0 (requires attunement)

This appears to be a multicolored wool cap and you can occasionally hear faint whispering while wearing it. 

Whenever you roll a 20 on an attack roll, you can immediately cast Vicious Mockery as a Bonus Action (save DC 13). Whenever you roll a 1 on an attack roll, the cap casts Vicious Mockery targeting you (save DC 13).

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Weaver''s Tools', NULL, 1530.0),
('7f57807d-83d7-5ce3-98bd-7d678cecbf6c', 'LOT_0154', 'Smoldering Armor (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Armor (any)', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 100 GP (plus cost of armor)
Crafting Cost: 50 GP (plus cost of armor), 5 DTP (Smithy)
Tool: See Equipment (depends on armor type)', NULL, 1540.0),
('e80d5a75-6908-5660-a118-9bc56372fa22', 'LOT_0155', 'Spellshard', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"ERLW"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 1550.0),
('6ce062a5-5281-54b9-9c19-d572f804244f', 'LOT_0156', 'Staff of Adornment', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Staff', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 100 GP (plus 5 GP for Staff)
Crafting Cost: 50 GP (plus 5 GP for Staff), 5 DTP (Arcane Study, Sanctuary, or Sacristy)
Tool: Woodcarver''s Tools', NULL, 1560.0),
('7116e90f-4b34-5645-b5e4-158cc4babd6f', 'LOT_0157', 'Staff of Birdcalls', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Staff', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 100 GP (plus 5 GP for Staff)
Crafting Cost: 50 GP (plus 5 GP for Staff), 5 DTP (Arcane Study, Sanctuary, or Sacristy)
Tool: Woodcarver''s Tools', NULL, 1570.0),
('d0672113-075c-569e-a18a-d44bffa9be9a', 'LOT_0158', 'Staff of Flowers', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Staff', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 100 GP (plus 5 GP for Staff)
Crafting Cost: 50 GP (plus 5 GP for Staff), 5 DTP (Arcane Study, Sanctuary, or Sacristy)
Tool: Woodcarver''s Tools', NULL, 1580.0),
('954cecff-87f7-544c-8d53-d3b2c7488b8b', 'LOT_0159', 'Strixhaven Pennant', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"SCC"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Weaver''s Tools', NULL, 1590.0),
('eedb6dbc-f121-5ded-a0fe-bb4f013acbcd', 'LOT_0160', 'Sylvan Talon (any piercing or slashing melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"DMG2024"}', 'See book for description.

Base Cost: 100 GP (plus cost of weapon)
Crafting Cost: 50 GP (plus cost of weapon), 5 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 1600.0),
('95d907da-b587-5da9-bc24-0661872c0c6b', 'LOT_0161', 'Talking Doll', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Weaver''s Tools', NULL, 1610.0),
('0910a1cd-d5e5-573a-a09f-766d1aa06efe', 'LOT_0162', 'Tankard of Sobriety', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Brewer''s Supplies', NULL, 1620.0),
('c0f2b559-a9bc-5371-881c-2be87c9f9e38', 'LOT_0163', 'Thermal Cube', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"IDRotF"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Mason''s Tools', NULL, 1630.0),
('bf45a508-47f8-562a-b59f-d46901c487a6', 'LOT_0164', 'Tiara of Magical Girliness (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"HHB"}', 'Wondrous item, T0

This tiara transforms its wearer and garments they are wearing into an idealized version of themselves wearing the cutest of outfits. The tiara chooses the physical characteristics of the form, such as age, skin color, hair color, outfit color and style and stylistic flourishes such as sparkles. The wearer''s statistics don''t change, nor do items worn or carried by the wearer. Removing the tiara ends the effect.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 1640.0),
('543a3448-86b7-5de8-b9ff-9066c59bb3d1', 'LOT_0165', 'Tome of Worldly Knowledge', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"HHB"}', 'Wondrous item, T0

This small book is bound in hammered silver and engraved with the continents of the world. When you make an Arcana, History, Investigation, Nature, or Religion check, you can use this book to add a +5 bonus to the check. Once the item has been used in this way, it cannot be used again until the next dawn.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Leatherworker''s Tools', NULL, 1650.0),
('6d7265cb-7aba-5188-8ca0-c7591c900ab5', 'LOT_0166', 'Uncommon Glamerweave', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"ERLW"}', 'See book for description.

Base Cost: 250 GP (plus cost of clothes)
Crafting Cost: 125 GP (plus cost of clothes), 7 DTP (Workshop)
Tool: Weaver''s Tools', NULL, 1660.0),
('df819d8d-dcad-5212-8407-ae87e01d0726', 'LOT_0167', 'Veteran''s Cane (shortsword, longsword, or rapier)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 100 GP (plus cost of weapon)
Crafting Cost: 50 GP (plus cost of weapon), 5 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 1670.0),
('aff4b7a1-a02f-5ba2-985c-901c1b19249a', 'LOT_0168', 'Vox Seeker', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"EGW"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Tinker''s Tools', NULL, 1680.0),
('80ab3a4f-aba6-5c04-b269-e232ee13683a', 'LOT_0169', 'Wand of Conducting', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wand', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 100 GP (plus 10 GP for Wand)
Crafting Cost: 50 GP (plus 10 GP for Wand), 5 DTP (Arcane Study, Sanctuary, or Sacristy)
Tool: Woodcarver''s Tools', NULL, 1690.0),
('ab09733b-40d0-535a-b15f-27bcd8e17ee9', 'LOT_0170', 'Wand of Pyrotechnics', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wand', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 100 GP (plus 10 GP for Wand)
Crafting Cost: 50 GP (plus 10 GP for Wand), 5 DTP (Arcane Study, Sanctuary, or Sacristy)
Tool: Woodcarver''s Tools', NULL, 1700.0),
('c4bcc6ae-59a8-548f-8481-3ce139cba268', 'LOT_0171', 'Wand of Scowls', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wand', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE"}', 'See book for description.

Base Cost: 100 GP (plus 10 GP for Wand)
Crafting Cost: 50 GP (plus 10 GP for Wand), 5 DTP (Arcane Study, Sanctuary, or Sacristy)
Tool: Woodcarver''s Tools', NULL, 1710.0),
('32a8d8b4-a90b-5ecb-a7e1-ec08b7cee393', 'LOT_0172', 'Wand Sheath', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"ERLW"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Tinker''s Tools', NULL, 1720.0),
('f4be5958-2a06-50d5-8780-45df3b4cd949', 'LOT_0173', 'Wand of Smiles', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wand', 'Permanent', false, NULL, 'T0 Permanent', '{"XGE"}', 'See book for description.

Base Cost: 100 GP (plus 10 GP for Wand)
Crafting Cost: 50 GP (plus 10 GP for Wand), 5 DTP (Arcane Study, Sanctuary, or Sacristy)
Tool: Woodcarver''s Tools', NULL, 1730.0),
('5f8a04cb-4a92-580e-b28f-e9c5703298ae', 'LOT_0174', 'Wildspace Orrery', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, NULL, 'T0 Permanent', '{"AAG"}', 'See book for description.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Tinker''s Tools', NULL, 1740.0),
('18b7bc2f-2193-56cb-9c46-7d8f8717dfe0', 'LOT_0175', 'Zhentarim Token (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Trinket', 'Permanent', false, NULL, 'T0 Permanent', '{"HHB"}', 'Trinket, T0

This iron coin is stamped with the symbol of the Zhentarim, a winged snake biting a coin, and is given to newly inducted members of the Black Network and serves as faction insignia to mark membership within the faction. 

When you display this coin, you have Advantage on Intimidation checks made against merchants, travelers, and others that fear and respect the influence of the Black Network.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 1750.0),
('5dffcafc-8fc5-5573-9f3f-0bb9503eb87d', 'LOT_0176', '+1 Ammunition (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Ammunition (any)', 'Consumable', false, NULL, 'T1 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost (of 10x ammunition): 200 GP (plus cost of 10x ammunition)
Crafting Cost (of 10x ammunition): 100 GP (plus cost of 10x ammunition), 5 DTP (Smithy)
Tool: See Equipment (depends on ammunition type)', NULL, 1760.0),
('556c444c-0f86-5001-b218-71e341478bb0', 'LOT_0177', 'Blasting Powder', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Adventuring gear', 'Consumable', false, NULL, 'T1 Consumable', '{"EGW"}', 'See book for description.

Base Cost: See Equipment
Crafting Cost: See Equipment', NULL, 1770.0),
('7abc398b-223e-5b87-a468-4e6e0eef2ae4', 'LOT_0178', 'Blight Ichor', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Adventuring gear', 'Consumable', false, NULL, 'T1 Consumable', '{"EGW"}', 'See book for description.

Base Cost: See Equipment
Crafting Cost: See Equipment', NULL, 1780.0),
('8f643669-0035-59c4-a46e-26c0c512b899', 'LOT_0179', 'Bottle of Glug (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Consumable', false, NULL, 'T1 Consumable', '{"HHB"}', 'Wondrous item, T1

Bottled goblin glug has strange nasty bits floating around in it and has no consistent flavor from bottle to bottle. When you drink this potion, for the next 1d6 hours, you have a +2 bonus to damage rolls for melee attacks you make against creatures that are at least one size larger than you. Immediately after drinking this potion, you must succeed on a DC 12 Constitution saving throw or have the Poisoned condition for the same duration. Bugbears, Goblins, Hobgoblins, and other goblinoid creatures have Advantage on this saving throw.

Base Cost: 200 GP (plus 1 GP for Vial)
Crafting Cost: 100 GP (plus 1 GP for Vial), 5 DTP (Garden, Greenhouse, or Laboratory)
Tool: Alchemist''s Supplies', NULL, 1790.0),
('6d7f9ce9-251b-5c57-858c-755ebac35147', 'LOT_0180', 'Bottled Breath', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Potion', 'Consumable', false, NULL, 'T1 Consumable', '{"PotA"}', 'See book for description.

Base Cost: 200 GP (plus 1 GP for Vial)
Crafting Cost: 100 GP (plus 1 GP for Vial), 5 DTP (Garden, Greenhouse, or Laboratory)
Tool: Alchemist''s Supplies', NULL, 1800.0),
('f1239004-1a6f-5e50-bdac-aec670bf6f6c', 'LOT_0181', 'Chime of Opening', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Consumable', false, NULL, 'T1 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 200 GP
Crafting Cost: 100 GP, 5 DTP (Workshop)
Tool: Tinker''s Tools', NULL, 1810.0),
('05db74bf-7ba8-501a-953a-a3aa48255dca', 'LOT_0182', 'Cooldown Cigar (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Consumable', false, NULL, 'T1 Consumable', '{"HHB"}', 'Wondrous item, T1

This cigar is marked with a mystical rune that was enchanted by an ancient bard. When smoked, it gives off luxurious fumes that seem to rejuvenate your body on a deep, physical level. If you spend 10 minutes smoking this cigar in quiet contemplation, you gain the benefits of a Short Rest. Once you use this item, the magic rune burns out and what''s left of the cigar disintegrates.

Base Cost: 200 GP
Crafting Cost: 100 GP, 5 DTP (Workshop)
Tool: Herbalism Kit', NULL, 1820.0),
('2f49c31f-c5d0-5a79-88e4-854e4a4d84a2', 'LOT_0183', 'Deck of Illusions (full deck)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Consumable', false, NULL, 'T1 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 200 GP (plus 0.5 GP for Playing Cards)
Crafting Cost: 100 GP (plus 0.5 GP for Playing Cards), 5 DTP (Workshop)
Tool: Gaming Set (Playing Cards)', NULL, 1830.0),
('d33b2b97-3f8e-5b01-aa30-7a943f7e3968', 'LOT_0184', 'Deck of Miscellany', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Consumable', false, NULL, 'T1 Consumable', '{"BMT"}', 'See book for description.

Base Cost: 200 GP (plus 0.5 GP for Playing Cards)
Crafting Cost: 100 GP (plus 0.5 GP for Playing Cards), 5 DTP (Workshop)
Tool: Gaming Set (Playing Cards)', NULL, 1840.0),
('91e8e7a4-3759-5d9a-9d57-723a31b140a0', 'LOT_0185', 'Dried Leech', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Ammunition (any)', 'Consumable', false, NULL, 'T1 Consumable', '{"BMT"}', 'See book for description.

Base Cost (of 10x ammunition): 200 GP (plus cost of 10x ammunition)
Crafting Cost (of 10x ammunition): 100 GP (plus cost of 10x ammunition), 5 DTP (Smithy)
Tool: See Equipment (depends on ammunition type)', NULL, 1850.0),
('14a1dc67-900a-52e9-bbbe-d1186ab6e8fa', 'LOT_0186', 'Draught of Feather Shine', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Potion', 'Consumable', false, NULL, 'T1 Consumable', '{"HWT"}', 'See book for description.

Base Cost: 200 GP (plus 1 GP for Vial)
Crafting Cost: 100 GP (plus 1 GP for Vial), 5 DTP (Garden, Greenhouse, or Laboratory)
Tool: Alchemist''s Supplies', NULL, 1860.0),
('1496ef8a-c0db-5c6c-af45-28c93108cdb7', 'LOT_0187', 'Dust of Corrosion', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Consumable', false, NULL, 'T1 Consumable', '{"WBTW"}', 'See book for description.

Base Cost: 200 GP
Crafting Cost: 100 GP, 5 DTP (Workshop)
Tool: Alchemist''s Supplies', NULL, 1870.0),
('a0fdfe34-278b-5868-a62f-4f5834ec02ba', 'LOT_0188', 'Dust of Deliciousness', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Consumable', false, NULL, 'T1 Consumable', '{"EGW"}', 'See book for description.

Base Cost: 200 GP
Crafting Cost: 100 GP, 5 DTP (Workshop)
Tool: Alchemist''s Supplies', NULL, 1880.0),
('20a5609a-f577-5d1b-a933-93eaddac9e26', 'LOT_0189', 'pinches of Dust of Disappearance', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Consumable', false, NULL, 'T1 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 200 GP
Crafting Cost: 100 GP, 5 DTP (Workshop)
Tool: Alchemist''s Supplies', NULL, 1890.0),
('76f683df-6331-5b88-844a-02c6941397d1', 'LOT_0190', 'Dust of Dryness', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Consumable', false, NULL, 'T1 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 200 GP
Crafting Cost: 100 GP, 5 DTP (Workshop)
Tool: Alchemist''s Supplies', NULL, 1900.0),
('9a5dd185-ac9b-5ed2-9fa5-19b2974c13f2', 'LOT_0191', 'Dust of the Mummy', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Poison', 'Consumable', false, NULL, 'T1 Consumable', '{"IMR"}', 'See book for description.

Base Cost: See Equipment
Crafting Cost: See Equipment', NULL, 1910.0),
('44cd2c66-1431-5bd4-9f6b-9fcd674a6fa1', 'LOT_0192', 'Dust of Sneezing and Choking', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Consumable', false, NULL, 'T1 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 200 GP
Crafting Cost: 100 GP, 5 DTP (Workshop)
Tool: Alchemist''s Supplies', NULL, 1920.0),
('796ed125-b11f-5970-8c5d-9233eec79dac', 'LOT_0193', 'Elixir of Health', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Potion', 'Consumable', false, NULL, 'T1 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 200 GP (plus 1 GP for Vial)
Crafting Cost: 100 GP (plus 1 GP for Vial), 5 DTP (Garden, Greenhouse, or Laboratory)
Tool: Herbalism Kit', NULL, 1930.0),
('6e4ac9a1-f108-51e2-9744-f5575eadcfa7', 'LOT_0194', 'pinches of Faerie Dust', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Consumable', false, NULL, 'T1 Consumable', '{"SKT"}', 'See book for description.

Base Cost: 200 GP
Crafting Cost: 100 GP, 5 DTP (Workshop)
Tool: Alchemist''s Supplies', NULL, 1940.0),
('6dde90da-9e6b-561f-bc82-c76752517257', 'LOT_0195', 'Gambler''s Die (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Consumable', false, NULL, 'T1 Consumable', '{"HHB"}', 'Wondrous item, T1

You can take a Magic action to roll a d6 and throw this six-sided die up to 60 feet away. When it reaches the end of its trajectory, the die detonates and each creature in a 10-foot-radius Sphere centered on the point where the die exploded must make a DC 15 Dexterity saving throw. A creature takes a number of d6s of Force damage equal to the result of the d6 roll on a failed save, or half as much damage on a successful one.

Base Cost: 200 GP
Crafting Cost: 100 GP, 5 DTP (Workshop)
Tool: Gaming Set (Dice Set)', NULL, 1950.0),
('7decb188-6796-5dd5-a071-87865d3370e1', 'LOT_0196', 'Gem of Brightness', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Consumable', false, NULL, 'T1 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 250 GP
Crafting Cost: 150 GP, 5 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 1960.0),
('36871e9e-9df7-533e-8232-bff158174df2', 'LOT_0197', 'pots of Glowrune Pigment', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Consumable', false, NULL, 'T1 Consumable', '{"BGG"}', 'See book for description.

Base Cost: 200 GP
Crafting Cost: 100 GP, 5 DTP (Workshop)
Tool: Painter''s Supplies', NULL, 1970.0),
('6a49f9ce-b617-519c-a1a8-9bcc86d017bc', 'LOT_0198', 'Hizagkuur Ammunition (HB) (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Ammunition (any)', 'Consumable', false, NULL, 'T1 Consumable', '{"HHB"}', 'Ammunition (any), T1

This ammunition is made of Hizagkuur, a rare silvery gray metal made from ore in the Underdark that is refined by complex processes and often enchanted by dwarven priests of the Mordinsamman to resist all magic and ensorcellment.

This ammunition is nonmagical and cannot be targeted by spells or other magical effects. An attack made using this ammunition gains no benefit from spells or other magical effects, such as from a +1 Weapon.

This ammunition harmlessly passes through any magical barrier (including a Wall of Force) and ignores any cover conferred by a magical barrier, but a target behind Total Cover hit with an attack using this ammunition has Resistance to all of the attack''s damage. A target gains no benefit to its AC or Resistances from spells or other magical effects, such as the Shield spell or Stoneskin spell, against attacks made with this ammunition except due to Total Cover as earlier described.

Base Cost (of 10x ammunition): 200 GP (plus cost of 10x ammunition)
Crafting Cost (of 10x ammunition): 100 GP (plus cost of 10x ammunition), 5 DTP (Smithy, requires Gift of Hizagkuur Story Outcome)
Tool: See Equipment (depends on ammunition type)', NULL, 1980.0),
('547b25fe-84f5-5f30-bcb0-b053c0388690', 'LOT_0199', 'Horn of Blasting', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Consumable', false, NULL, 'T1 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 200 GP (plus 3 GP for Horn)
Crafting Cost: 100 GP (plus 3 GP for Horn), 5 DTP (Workshop)
Tool: Tinker''s Tools', NULL, 1990.0),
('f7f1a17b-c7e8-5187-b893-f1cc15b1f5fb', 'LOT_0200', 'Immolating Ammunition (HB) (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Ammunition (any)', 'Consumable', false, NULL, 'T1 Consumable', '{"HHB"}', 'Ammunition (any), T1

A creature hit by this ammunition becomes engulfed in flames for 1 minute: at the start of each of the creature''s turns, it takes 1d4 Fire damage and makes a DC 15 Dexterity saving throw, ending the effect on a success. Once it hits a target, the ammunition is no longer magical.

Base Cost (of 10x ammunition): 200 GP (plus cost of 10x ammunition)
Crafting Cost (of 10x ammunition): 100 GP (plus cost of 10x ammunition), 5 DTP (Smithy)
Tool: See Equipment (depends on ammunition type)', NULL, 2000.0);

INSERT INTO public.ac_loot (
    id, check_id, name, category_id, tier_id, type, nature, is_dm_select, event_category, tier_display, source, description, notes_advice, display_order
) VALUES
('0ff263a8-74fd-5525-9d44-a482e1d72138', 'LOT_0201', 'doses of Keoghtom''s Ointment', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Consumable', false, NULL, 'T1 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 200 GP
Crafting Cost: 100 GP, 5 DTP (Workshop)
Tool: Herbalism Kit', NULL, 2010.0),
('61b91cd3-123d-53c5-a85e-566d31bf377d', 'LOT_0202', 'seeds of Kwark''s Wondrous Kernels (Planter or Tossables)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Consumable', false, NULL, 'T1 Consumable', '{"HWT"}', 'See book for description.

Base Cost: 200 GP
Crafting Cost: 100 GP, 5 DTP (Workshop)
Tool: Herbalism Kit', NULL, 2020.0),
('a17e6f95-6347-5152-a157-b00cf7f5bb88', 'LOT_0203', 'Medal of Muscle', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Consumable', false, NULL, 'T1 Consumable', '{"CRCotN"}', 'See book for description.

Base Cost: 200 GP
Crafting Cost: 100 GP, 5 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 2030.0),
('6f31a5e8-7f41-5787-a843-f0c4f936b1b5', 'LOT_0204', 'Medal of Wit', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Consumable', false, NULL, 'T1 Consumable', '{"CRCotN"}', 'See book for description.

Base Cost: 200 GP
Crafting Cost: 100 GP, 5 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 2040.0),
('dfdca4ca-9f4f-541e-ba1b-c0db43e9b9db', 'LOT_0205', 'Origami Courier (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Consumable', false, NULL, 'T1 Consumable', '{"HHB"}', 'Wondrous item, T1

After you write a message of fifty words or fewer on this magic sheet of parchment and name a specific fixed location that is familiar to you and on the same plane of existence, the parchment magically folds into a Tiny paper bird and flies to the location whose name you uttered. If you name a location on another plane of existence, a location that moves (such as a mobile fortress), or a location that isn''t specific (such as "a green dragon''s lair"), the bird turns into ash as it takes flight.

The bird is an object that has 1 hit point, an Armor Class of 13, a flying speed of 60 feet, a Dexterity of 16 (+3), and a score of 1 (−5) in all other abilities, and it is immune to poison and psychic damage. 

It travels to within 5 feet of its intended location by the most direct route, whereupon it turns into a nonmagical and inanimate sheet of parchment that can be unfolded. If the bird''s hit points or speed is reduced to 0 or if it is otherwise immobilized, it turns into a nonmagical and inanimate sheet of parchment that can be unfolded.

Base Cost: 200 GP (plus 0.1 GP for Parchment)
Crafting Cost: 100 GP (plus 0.1 GP for Parchment), 5 DTP (Workshop)
Tool: Leatherworker''s Tools', NULL, 2050.0),
('efa0529a-f746-5b98-8115-f3bde45d85aa', 'LOT_0206', 'pinches of Pixie Dust', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Consumable', false, NULL, 'T1 Consumable', '{"WBTW"}', 'See book for description.

Base Cost: 200 GP
Crafting Cost: 100 GP, 5 DTP (Workshop)
Tool: Alchemist''s Supplies', NULL, 2060.0),
('85a775a1-13b6-5fd3-9112-ae8649128205', 'LOT_0207', 'Potion of Advantage', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Potion', 'Consumable', false, NULL, 'T1 Consumable', '{"WBTW"}', 'See book for description.

Base Cost: 200 GP (plus 1 GP for Vial)
Crafting Cost: 100 GP (plus 1 GP for Vial), 5 DTP (Garden, Greenhouse, or Laboratory)
Tool: Alchemist''s Supplies', NULL, 2070.0),
('a90c505c-9ac1-5a47-a806-d79524833b33', 'LOT_0208', 'Potion of Climbing', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Potion', 'Consumable', false, NULL, 'T1 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 200 GP (plus 1 GP for Vial)
Crafting Cost: 100 GP (plus 1 GP for Vial), 5 DTP (Garden, Greenhouse, or Laboratory)
Tool: Alchemist''s Supplies', NULL, 2080.0),
('7410ede3-0806-574a-afba-cd1860fcaf7c', 'LOT_0209', 'Potion of Comprehension', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Potion', 'Consumable', false, NULL, 'T1 Consumable', '{"WDMM"}', 'See book for description.

Base Cost: 200 GP (plus 1 GP for Vial)
Crafting Cost: 100 GP (plus 1 GP for Vial), 5 DTP (Garden, Greenhouse, or Laboratory)
Tool: Alchemist''s Supplies', NULL, 2090.0),
('76287bd8-3b65-5267-bbad-d3433660fbb3', 'LOT_0210', 'Potion of Diminution', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Potion', 'Consumable', false, NULL, 'T1 Consumable', '{"DMG2014"}', 'See book for description.

Base Cost: 200 GP (plus 1 GP for Vial)
Crafting Cost: 100 GP (plus 1 GP for Vial), 5 DTP (Garden, Greenhouse, or Laboratory)
Tool: Alchemist''s Supplies', NULL, 2100.0),
('d9bbb583-36c2-5ebc-8a94-8d6ff88c8fa3', 'LOT_0211', 'Potion of Fire Breath', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Potion', 'Consumable', false, NULL, 'T1 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 200 GP (plus 1 GP for Vial)
Crafting Cost: 100 GP (plus 1 GP for Vial), 5 DTP (Garden, Greenhouse, or Laboratory)
Tool: Alchemist''s Supplies', NULL, 2110.0),
('a072d29e-80bd-5cea-acba-32605e718032', 'LOT_0212', 'Potion of Greater Healing', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Potion', 'Consumable', false, NULL, 'T1 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: See Equipment
Crafting Cost: See Equipment', NULL, 2120.0),
('a0c7055e-0de7-5808-b6ec-816a35fafc48', 'LOT_0213', 'Potion of Growth', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Potion', 'Consumable', false, NULL, 'T1 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 200 GP (plus 1 GP for Vial)
Crafting Cost: 100 GP (plus 1 GP for Vial), 5 DTP (Garden, Greenhouse, or Laboratory)
Tool: Alchemist''s Supplies', NULL, 2130.0),
('6f333c0a-ef67-5564-b55e-599a9f288455', 'LOT_0214', 'Potion of Heroism', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Potion', 'Consumable', false, NULL, 'T1 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 200 GP (plus 1 GP for Vial)
Crafting Cost: 100 GP (plus 1 GP for Vial), 5 DTP (Garden, Greenhouse, or Laboratory)
Tool: Alchemist''s Supplies', NULL, 2140.0),
('51b6b9e7-ae1a-5323-bea3-bb7de5dfeffc', 'LOT_0215', 'Potion of Hill Giant Strength', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Potion', 'Consumable', false, NULL, 'T1 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 200 GP (plus 1 GP for Vial)
Crafting Cost: 100 GP (plus 1 GP for Vial), 5 DTP (Garden, Greenhouse, or Laboratory)
Tool: Alchemist''s Supplies', NULL, 2150.0),
('3296743b-4a5f-5a0e-8d2b-bc60a2fefd83', 'LOT_0216', 'Potion of Invisibility', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Potion', 'Consumable', false, NULL, 'T1 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 200 GP (plus 1 GP for Vial)
Crafting Cost: 100 GP (plus 1 GP for Vial), 5 DTP (Garden, Greenhouse, or Laboratory)
Tool: Alchemist''s Supplies', NULL, 2160.0),
('b6088d0e-2eff-5978-a957-0d8f8adebb0b', 'LOT_0217', 'Potion of Irrational Bravery (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Consumable', false, NULL, 'T1 Consumable', '{"HHB"}', 'Wondrous item, T1

When you drink this potion, for the next 1d4 hours, you have Advantage on saving throws made to avoid or end the Frightened condition as a result of creatures that are at least one size larger than you. You additionally gain a level of Exhaustion when this effect ends.

Base Cost: 200 GP (plus 1 GP for Vial)
Crafting Cost: 100 GP (plus 1 GP for Vial), 5 DTP (Garden, Greenhouse, or Laboratory)
Tool: Alchemist''s Supplies', NULL, 2170.0),
('7c4b92ab-d41f-5b91-8318-46bef3d8be39', 'LOT_0218', 'Potion of Mind Reading', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Potion', 'Consumable', false, NULL, 'T1 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 200 GP (plus 1 GP for Vial)
Crafting Cost: 100 GP (plus 1 GP for Vial), 5 DTP (Garden, Greenhouse, or Laboratory)
Tool: Alchemist''s Supplies', NULL, 2180.0),
('63b666ff-4ca0-58d4-aa06-48843ae48bf9', 'LOT_0219', 'Potion of Polychromy', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Potion', 'Consumable', false, NULL, 'T1 Consumable', '{"DLCT"}', 'See book for description.

Base Cost: 200 GP (plus 1 GP for Vial)
Crafting Cost: 100 GP (plus 1 GP for Vial), 5 DTP (Garden, Greenhouse, or Laboratory)
Tool: Alchemist''s Supplies', NULL, 2190.0),
('a1222d76-491e-560d-9366-e87c71a8211c', 'LOT_0220', 'Potion of Possibility', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Potion', 'Consumable', false, NULL, 'T1 Consumable', '{"EGW"}', 'See book for description.

Base Cost: 1000 GP (plus 1 GP for Vial)
Crafting Cost: 500 GP (plus 1 GP for Vial), 15 DTP (Garden, Greenhouse, or Laboratory)
Tool: Alchemist''s Supplies', NULL, 2200.0),
('aa6c9a82-1fbf-5465-99dd-bab9d48edc90', 'LOT_0221', 'Potion of Psionic Fortitude', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Potion', 'Consumable', false, NULL, 'T1 Consumable', '{"PBTSO"}', 'See book for description.

Base Cost: 200 GP (plus 1 GP for Vial)
Crafting Cost: 100 GP (plus 1 GP for Vial), 5 DTP (Garden, Greenhouse, or Laboratory)
Tool: Alchemist''s Supplies', NULL, 2210.0),
('289685f1-1969-5dac-9569-c5b9b5da1849', 'LOT_0222', 'Potion of Pugilism', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Potion', 'Consumable', false, NULL, 'T1 Consumable', '{"DMG2024"}', 'See book for description.

Base Cost: 200 GP (plus 1 GP for Vial)
Crafting Cost: 100 GP (plus 1 GP for Vial), 5 DTP (Garden, Greenhouse, or Laboratory)
Tool: Alchemist''s Supplies', NULL, 2220.0),
('b9d836dd-8c25-5637-986b-eb648f0c0666', 'LOT_0223', 'Potion of Resistance (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Potion', 'Consumable', false, NULL, 'T1 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 200 GP (plus 1 GP for Vial)
Crafting Cost: 100 GP (plus 1 GP for Vial), 5 DTP (Garden, Greenhouse, or Laboratory)
Tool: Alchemist''s Supplies', NULL, 2230.0),
('fd66d035-d357-5d93-a426-05aa9357be00', 'LOT_0224', 'Potion of Water Breathing', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Potion', 'Consumable', false, NULL, 'T1 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 200 GP (plus 1 GP for Vial)
Crafting Cost: 100 GP (plus 1 GP for Vial), 5 DTP (Garden, Greenhouse, or Laboratory)
Tool: Alchemist''s Supplies', NULL, 2240.0),
('2f73584f-5790-5e5f-8641-fd5cd2acb2bf', 'LOT_0225', 'Potion of Wild Magic (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Potion', 'Consumable', false, NULL, 'T1 Consumable', '{"HHB"}', 'Potion, T1

This potion contains a prismatic, swirling liquid that shakes in its container. When you drink this potion, you roll on the Wild Magic Surge table immediately. If a Wild Magic effect is a spell, it''s too wild to be affected by Metamagic, and its DC is 15. If it normally requires concentration, it doesn''t require concentration in this case; the spell lasts for its full duration.

Base Cost: 200 GP (plus 1 GP for Vial)
Crafting Cost: 100 GP (plus 1 GP for Vial), 5 DTP (Garden, Greenhouse, or Laboratory)
Tool: Alchemist''s Supplies', NULL, 2250.0),
('a5255033-9614-5756-bde8-a8fb2294933c', 'LOT_0226', 'Quaal''s Feather Token, Anchor', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Consumable', false, NULL, 'T1 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 200 GP
Crafting Cost: 100 GP, 5 DTP (Workshop)
Tool: Weaver''s Tools', NULL, 2260.0),
('e6b831ba-b791-5313-8938-360a1499db9b', 'LOT_0227', 'Quaal''s Feather Token, Fan', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Consumable', false, NULL, 'T1 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 200 GP
Crafting Cost: 100 GP, 5 DTP (Workshop)
Tool: Weaver''s Tools', NULL, 2270.0),
('91efb8fe-c6e2-5561-8c82-8256cb23f7f8', 'LOT_0228', 'Quaal''s Feather Token, Tree', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Consumable', false, NULL, 'T1 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 200 GP
Crafting Cost: 100 GP, 5 DTP (Workshop)
Tool: Weaver''s Tools', NULL, 2280.0),
('f497768a-b43b-5735-b8c8-5491c80238ae', 'LOT_0229', 'Quaal''s Feather Token, Whip', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Consumable', false, NULL, 'T1 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 200 GP
Crafting Cost: 100 GP, 5 DTP (Workshop)
Tool: Weaver''s Tools', NULL, 2290.0),
('9518e0cb-eac1-5e5f-8a09-3ebdb493c5c1', 'LOT_0230', 'Robe of Serpents', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Consumable', false, NULL, 'T1 Consumable', '{"SKT"}', 'See book for description.

Base Cost: 200 GP (plus 1 GP for Robe)
Crafting Cost: 100 GP (plus 1 GP for Robe), 5 DTP (Workshop)
Tool: Weaver''s Tools', NULL, 2300.0),
('dbc1479e-fb98-544a-8950-b45ef993b0d2', 'LOT_0231', 'Seeker Weapon (HB) (any simple weapon with the thrown property)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any simple weapon with the thrown property)', 'Consumable', false, NULL, 'T1 Consumable', '{"HHB"}', 'Weapon (any simple weapon with the thrown property), T1

This weapon is decorated with designs like windy spirals that span the length of its shaft. As an action you can whisper the word "seek" and hurl this weapon and it seeks out a target of your choice within 120 feet of you. You must have seen the target before, but you don''t need to see it now. If the target isn''t within range or if there is no clear path to it, the weapon falls to the ground, its magic spent and wasted. Otherwise, elemental winds guide the weapon instantly through the air to the target. The weapon can also change direction to fly around corners.

When the weapon reaches its target, the target must succeed on a DC 16 Dexterity saving throw or take damage from the weapon plus 3d4 lightning damage. The weapon''s magic is then spent, and it becomes a nonmagical weapon.

Base Cost: 200 GP (plus cost of weapon)
Crafting Cost: 100 GP (plus cost of weapon), 5 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 2310.0),
('461c0aa7-aef0-5216-bf9a-686831021e80', 'LOT_0232', 'Scroll of Wild Magic (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Scroll', 'Consumable', false, NULL, 'T1 Consumable', '{"HHB"}', 'Scroll, T1

This scroll is made of taped together bits of spell scrolls. By using an action to read from the scroll, you can roll on the Wild Magic Surge table in the Player''s Handbook.

Base Cost: 200 GP
Crafting Cost: 100 GP, 5 DTP (Library or Scriptorium)
Tool: Calligrapher''s Supplies', NULL, 2320.0),
('cf5e61de-7dc1-56f2-8213-38fd86bede0e', 'LOT_0233', 'Sensory Stone', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Consumable', false, NULL, 'T1 Consumable', '{"SATO"}', 'See book for description.

Base Cost: 200 GP
Crafting Cost: 100 GP, 5 DTP (Workshop)
Tool: Mason''s Tools', NULL, 2330.0),
('26342aab-0ea9-5e22-876e-41335bcde8fe', 'LOT_0234', 'Serpent Venom', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Poison', 'Consumable', false, NULL, 'T1 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: See Equipment
Crafting Cost: See Equipment', NULL, 2340.0),
('6b0e7d61-19a0-5aca-9aee-97d28002c4e1', 'LOT_0235', 'Shadowberry (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Consumable', false, NULL, 'T1 Consumable', '{"HHB"}', 'Wondrous item, T1

When you use an action to consume this dark and sour berry, you gain the ability to see in magical and nonmagical darkness out to 60 feet for 1 hour.

Base Cost: 200 GP
Crafting Cost: 100 GP, 5 DTP (Workshop)
Tool: Herbalism Kit', NULL, 2350.0),
('d21f4831-919b-5309-9c22-9886d912c88f', 'LOT_0236', 'Slaad Secretion Poison, Red (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Consumable', false, NULL, 'T1 Consumable', '{"HHB"}', 'Poison (Injury), T1

A creature subjected to this poison must succeed on a DC 13 Constitution saving throw or have the Poisoned condition until the end of its next turn. The creature''s Speed is also reduced by 10 feet while Poisoned in this way.

Base Cost: See Equipment
Crafting Cost: See Equipment', NULL, 2360.0),
('9d69acc7-a4c8-54e6-abfe-f4583835dead', 'LOT_0237', 'Sling Bullets of Althemone (Tracking)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Ammunition (sling bullets)', 'Consumable', false, NULL, 'T1 Consumable', '{"MOT"}', 'See book for description.

Base Cost (of 10x ammunition): 200 GP (plus 0.02 GP for 10x Sling Bullets)
Crafting Cost (of 10x ammunition): 100 GP (plus 0.02 GP for 10x Sling Bullets), 5 DTP (Smithy)
Tool: Smith''s Tools', NULL, 2370.0),
('503a4868-7fa7-51cf-9d4b-c4e9b7ab08ae', 'LOT_0238', 'Smokepowder (Packet)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Consumable', false, NULL, 'T1 Consumable', '{"WDH"}', 'See book for description.

Base Cost: See Equipment
Crafting Cost: See Equipment', NULL, 2380.0),
('e54460c0-c18a-5a33-bc95-0bfb315fcaed', 'LOT_0239', 'Smokepowder (Keg)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Consumable', false, NULL, 'T1 Consumable', '{"WDH"}', 'See book for description.

Base Cost: See Equipment
Crafting Cost: See Equipment', NULL, 2390.0),
('5757c818-7ac2-5f78-9a77-2c1bf71f39ab', 'LOT_0240', 'Soothsalts', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Adventuring gear', 'Consumable', false, NULL, 'T1 Consumable', '{"EGW"}', 'See book for description.

Base Cost: See Equipment
Crafting Cost: See Equipment', NULL, 2400.0),
('e66a5e28-79ee-5888-b8cf-cd84fbdd5ef0', 'LOT_0241', 'Spell Scroll (Level 2)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Scroll', 'Consumable', false, NULL, 'T1 Consumable', '{"DMG2014"}', 'See book for description.

Base Cost: 200 GP
Crafting Cost: See Downtime (Scribing Spell Scroll)', NULL, 2410.0),
('108ddfc5-61da-5d75-a2c3-8672684fab8f', 'LOT_0242', 'Spell Scroll (Level 3)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Scroll', 'Consumable', false, NULL, 'T1 Consumable', '{"DMG2014"}', 'See book for description.

Base Cost: 300 GP
Crafting Cost: See Downtime (Scribing Spell Scroll)', NULL, 2420.0),
('75905b32-71c8-5e3e-9c20-a6636cdd58fe', 'LOT_0243', 'Spellwrought Tattoo (Level 2)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item (tattoo)', 'Consumable', false, NULL, 'T1 Consumable', '{"TCE"}', 'See book for description.

Base Cost: 600 GP
Crafting Cost: 300 GP, 10 DTP (Workshop)
Tool: Painter''s Supplies', NULL, 2430.0),
('232f9e23-3b77-5827-8836-db5bb47287ca', 'LOT_0244', 'Spellwrought Tattoo (Level 3)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item (tattoo)', 'Consumable', false, NULL, 'T1 Consumable', '{"TCE"}', 'See book for description.

Base Cost: 1000 GP
Crafting Cost: 500 GP, 15 DTP (Workshop)
Tool: Painter''s Supplies', NULL, 2440.0),
('be566ee1-5c36-51d1-a8f2-1e04f380f5fd', 'LOT_0245', 'Winged Ammunition (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Ammunition (any)', 'Consumable', false, NULL, 'T1 Consumable', '{"BMT"}', 'See book for description.

Base Cost (of 10x ammunition): 200 GP (plus cost of 10x ammunition)
Crafting Cost (of 10x ammunition): 100 GP (plus cost of 10x ammunition), 5 DTP (Smithy)
Tool: See Equipment (depends on ammunition type)', NULL, 2450.0),
('36884d6e-edf6-5fc3-a363-9acd1d8a9e75', 'LOT_0246', 'Acheron Blade (any piercing or slashing melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any piercing or slashing melee weapon)', 'Permanent', false, NULL, 'T1 Permanent', '{"EGW"}', 'See book for description.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 2460.0),
('a43968bc-8047-5785-9c7d-581b86e27736', 'LOT_0247', 'Adamantine Armor (any medium or heavy armor except hide)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Armor (any medium or heavy armor except hide)', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP (plus cost of armor)
Crafting Cost: 200 GP (plus cost of armor), 10 DTP (Smithy)
Tool: See Equipment (depends on armor type)', NULL, 2470.0),
('0673fda5-e5ff-5705-956d-adbc343cb397', 'LOT_0248', 'Alchemy Jug', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP (plus 0.02 GP for Jug)
Crafting Cost: 200 GP (plus 0.02 GP for Jug), 10 DTP (Workshop)
Tool: Potter''s Tools', NULL, 2480.0),
('d2fc3554-76e8-56b6-9c97-96b75b183a2e', 'LOT_0249', 'Amulet of Proof Against Detection and Location', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP (plus 5 GP for Amulet)
Crafting Cost: 200 GP (plus 5 GP for Amulet), 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 2490.0),
('2fae57f1-24ff-5de2-b8fb-a472816d8ecb', 'LOT_0250', 'Antlers of the True Path', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"HWT"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Woodcarver''s Tools', NULL, 2500.0),
('b37ff4cf-da4f-553d-a891-3b446737d6e3', 'LOT_0251', 'Akrisae''s War Mace (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (mace)', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Weapon (mace), T1 (requires attunement by a cleric or paladin)

You have a +1 bonus to attack and damage rolls made with this mage weapon.

When you hit a creature with a melee attack using this weapon, you can charge the weapon with radiant energy for the next minute. If you cast a spell that deals Radiant damage during the time the weapon is charged, you can choose to reroll any number of the damage dice (you must use the new roll), with the weapon losing its charge immediately after. This property can''t be used again until the next dawn.

Base Cost: 400 GP (plus 5 GP for Mace)
Crafting Cost: N/A (cannot be crafted)', NULL, 2510.0),
('e8b494b2-ad98-55f6-9de0-a37a80cd6934', 'LOT_0252', 'Armor of Balance (Breastplate of Balance) (any medium or heavy armor except hide)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Armor (any medium or heavy armor except hide)', 'Permanent', false, NULL, 'T1 Permanent', '{"BMT"}', 'See book for description.

Base Cost: 400 GP (plus cost of armor)
Crafting Cost: 200 GP (plus cost of armor), 10 DTP (Smithy)
Tool: See Equipment (depends on armor type)', NULL, 2520.0),
('cdf9dd3c-c7ce-5352-8a8e-0b886a7a09c9', 'LOT_0253', 'Armor of the Fallen (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Armor (any)', 'Permanent', false, NULL, 'T1 Permanent', '{"BMT"}', 'See book for description.

Base Cost: 400 GP (plus cost of armor)
Crafting Cost: 200 GP (plus cost of armor), 10 DTP (Smithy)
Tool: See Equipment (depends on armor type)', NULL, 2530.0),
('eacdbf31-7943-5fc5-b2c4-cb652f012987', 'LOT_0254', 'Armor of Fungal Spores (any medium or heavy armor)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Armor (any medium or heavy armor)', 'Permanent', false, NULL, 'T1 Permanent', '{"BMT"}', 'See book for description.

Base Cost: 400 GP (plus cost of armor)
Crafting Cost: 200 GP (plus cost of armor), 10 DTP (Smithy)
Tool: See Equipment (depends on armor type)', NULL, 2540.0),
('7b5be910-ca21-5e8e-802b-2db806c680be', 'LOT_0255', 'Armor of Knight’s Fellowship (Plate of Knight’s Fellowship) (any medium or heavy armor except hide)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Armor (any medium or heavy armor except hide)', 'Permanent', false, NULL, 'T1 Permanent', '{"BMT"}', 'See book for description.

Base Cost: 400 GP (plus cost of armor)
Crafting Cost: 200 GP (plus cost of armor), 10 DTP (Smithy)
Tool: See Equipment (depends on armor type)', NULL, 2550.0),
('b8c5d724-f7e1-5947-bcc8-0420dde95f83', 'LOT_0256', 'Armor of Resistance (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Armor (any)', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP (plus cost of armor)
Crafting Cost: 200 GP (plus cost of armor), 10 DTP (Smithy)
Tool: See Equipment (depends on armor type)', NULL, 2560.0),
('aca7edb4-3e47-5a7d-8ec9-dab153a81b2e', 'LOT_0257', 'Armor of Weightlessness (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Armor (any)', 'Permanent', false, NULL, 'T1 Permanent', '{"BMT"}', 'See book for description.

Base Cost: 400 GP (plus cost of armor)
Crafting Cost: 200 GP (plus cost of armor), 10 DTP (Smithy)
Tool: See Equipment (depends on armor type)', NULL, 2570.0),
('a7ef9279-5801-5900-b6d5-a1f81d6d14b0', 'LOT_0258', 'Baba Yaga''s Dancing Broom', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Woodcarver''s Tools', NULL, 2580.0),
('fb66c7f1-6f55-5182-98b6-290e0e624001', 'LOT_0259', 'Bag of Bounty (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Wondrous item, T1

This sturdy leather sack is capable of conjuring food in accordance with your desire. You can use an action to cast Create Food and Water, shaping the meal with your thoughts.

You can create the standard bland fare without requiring any sort of check, but you can attempt to create finer food by making a Charisma check; if you''re proficient with cook''s utensils, add your proficiency bonus to this check or double your proficiency bonus if you would normally do so. A failed check results in a sour and squalid meal.

Food Quality     Difficulty
Poor                    No roll required
Modest               10
Comfortable       13
Wealthy              15
Aristocratic         18

A bag of bounty can be used up to three times over the course of a day. After that, the bag can''t be used again until the next dawn.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Cook''s Utensils', NULL, 2590.0),
('e2103eb6-7c0b-504c-b022-e07f342fe0cd', 'LOT_0260', 'Bag of Holding', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Leatherworker''s Tools', NULL, 2600.0),
('61fa6419-a612-559e-91f5-f045e00cc0ad', 'LOT_0261', 'Bag of Tricks (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Leatherworker''s Tools', NULL, 2610.0),
('d45ac1f6-0bee-578c-b6f1-59d9afbe5f18', 'LOT_0262', 'Balance of Harmony', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"TftYP"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Tinker''s Tools', NULL, 2620.0),
('fe1cc307-e008-5cfa-be8e-9c038e99c463', 'LOT_0263', 'Barrier Tattoo (Uncommon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item (tattoo)', 'Permanent', false, NULL, 'T1 Permanent', '{"TCE"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Painter''s Supplies', NULL, 2630.0),
('1f617996-ae70-5c18-92ec-2549ceec56e0', 'LOT_0264', 'Bell Branch', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"TCE"}', 'See book for description.

Base Cost: 400 GP (plus 1 GP for Bell)
Crafting Cost: 200 GP (plus 1 GP for Bell), 10 DTP (Arcane Study, Sanctuary, or Sacristy)
Tool: Tinker''s Tools', NULL, 2640.0),
('26fffec2-ea96-5550-a8cd-87f018ea8169', 'LOT_0265', 'Belt of the Weald', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"HWT"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Woodcarver''s Tools', NULL, 2650.0),
('7f633258-19bd-5ae6-8969-d49d2e3c50c1', 'LOT_0266', 'Blasted Goggles', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"BMT"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Glassblower''s Tools', NULL, 2660.0),
('4ec67581-b050-5d5c-94a4-0c397915081d', 'LOT_0267', 'Bloodrage Weapon (Bloodrage Greataxe) (any melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any melee weapon)', 'Permanent', false, NULL, 'T1 Permanent', '{"BMT"}', 'See book for description.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 2670.0),
('dc108bcf-c9dd-59e3-ab75-96ece49add46', 'LOT_0268', 'Boomerang Shield', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Armor (shield)', 'Permanent', false, NULL, 'T1 Permanent', '{"BMT"}', 'See book for description.

Base Cost: 400 GP (plus 10 GP for Shield)
Crafting Cost: 200 GP (plus 10 GP for Shield), 10 DTP (Smithy)
Tool: Smith''s Tools', NULL, 2680.0),
('b016a275-bacb-51b0-af86-24a74a093c62', 'LOT_0269', 'Boots of Elvenkind', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Cobbler''s Tools', NULL, 2690.0),
('96b2b1b1-9454-522c-af83-09c4a54bad86', 'LOT_0270', 'Boots of Striding and Springing', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Cobbler''s Tools', NULL, 2700.0),
('c8edf609-5736-5b6f-8e9b-8c4672bd336e', 'LOT_0271', 'Boots of the Winding Path', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"EFA"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Cobbler''s Tools', NULL, 2710.0),
('22ad69dc-df66-5087-a71e-138820108559', 'LOT_0272', 'Breacher (HB) (any ranged weapon that lacks the thrown property)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any ranged weapon that lacks the thrown property)', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Weapon (any ranged weapon that lacks the thrown property), T1 (requires attunement)

This weapon gleams the color of an obsidian black, with three gems encrusted on the barrel: a sapphire, a diamond, and a ruby. This weapon has 5 charges. While holding this weapon, you can spend 2 charges to cast Knock. In addition, when you hit with a ranged weapon attack using this weapon, you can use a Bonus Action to expend 2 charges to cast Shatter (save DC 15) or 1 charge to cast Burning Hands (save DC 15). This weapon regains 1d4+1 expended charges daily at dawn.

Whenever you hit an object with ammunition fired from this weapon, that hit is a critical hit.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 2720.0),
('7cb7932a-4de9-58d5-b9d8-9df08e2c930f', 'LOT_0273', 'Brooch of the Elements', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"NF"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 2730.0),
('f18e531e-37b4-5827-abd5-98d9f85fdebf', 'LOT_0274', 'Brooch of Living Essence', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"EGW"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 2740.0),
('2fed62c4-ff6c-5bca-9bd5-63321d2a77d1', 'LOT_0275', 'Cap of Water Breathing', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Weaver''s Tools', NULL, 2750.0),
('63390db7-0fee-59a3-9603-a2a16e6b2a87', 'LOT_0276', 'Cap of Vanishing', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"WttHC"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Weaver''s Tools', NULL, 2760.0),
('44b7912a-effb-5621-bf2d-35adbac39016', 'LOT_0277', 'Card Sharp’s Deck', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"BMT"}', 'See book for description.

Base Cost: 400 GP (plus 0.5 GP for Playing Cards)
Crafting Cost: 200 GP (plus 0.5 GP for Playing Cards), 10 DTP (Workshop)
Tool: Gaming Set (Playing Cards)', NULL, 2770.0),
('bd7ec304-0bf1-5638-a306-3ef153173d76', 'LOT_0278', 'Circlet of Blasting', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 2780.0),
('db1d7234-b891-50cb-baf3-d7bbdea4d71a', 'LOT_0279', 'Cloak of Elvenkind', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Weaver''s Tools', NULL, 2790.0),
('db1decbc-4f62-5840-92bb-f2de9de39857', 'LOT_0280', 'Lesser Cloak of the Manta Ray (Cloak of the Manta Ray (2024))', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Weaver''s Tools', NULL, 2800.0),
('a599ed97-d8e1-58dc-ba31-d081dd669ecb', 'LOT_0281', 'Clockwork Armor (any medium or heavy armor except hide)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Armor (any medium or heavy armor except hide)', 'Permanent', false, NULL, 'T1 Permanent', '{"BMT"}', 'See book for description.

Base Cost: 400 GP (plus cost of armor)
Crafting Cost: 200 GP (plus cost of armor), 10 DTP (Smithy)
Tool: See Equipment (depends on armor type)', NULL, 2810.0),
('fa32fd8e-fe14-5e0c-9bab-ff8e69c526da', 'LOT_0282', 'Coiling Grasp Tattoo', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item (tattoo)', 'Permanent', false, NULL, 'T1 Permanent', '{"TCE"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Painter''s Supplies', NULL, 2820.0),
('e65e05e1-f942-5504-b797-6ec413a8ed67', 'LOT_0283', 'Conductor’s Baton (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Wondrous Item, T1 (requires attunement by a spellcaster)

This small, wooden stick is a foot long and tapers slightly towards the tip and widens to a small bulb at the other end to provide counterbalance. The baton can be used as a Spellcasting Focus. 

You can use an action to cast Silence and Enthrall. Once the baton has been used to cast either spell, that spell can''t be cast again from the baton until the next dawn. You can additionally spend one minute conducting the motions of a song to make musical instruments to start playing themselves, with a total number of instruments up to twice your Proficiency Bonus. This effect requires Concentration (as if concentrating on a spell).

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Woodcarver''s Tools', NULL, 2830.0),
('2537a7c4-f54d-54ed-8f09-56d51e382e3d', 'LOT_0284', 'Corpse Slayer (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any)', 'Permanent', false, NULL, 'T1 Permanent', '{"EGW"}', 'See book for description.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 2840.0),
('20043c84-dbcc-5a43-a9bd-8dbd75c19721', 'LOT_0285', 'Cracker and Whacker (HB) (Flails, Morningstars, or Maces)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapons (flails, morningstars, or maces)', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Cracker
Weapon (flail, morningstar, or mace), T1 (requires attunement)

This weapon has a glassteel ball with spikes connected to a solid adamantine handle, with the spikes oozing the ichor of a rust monster.

You have a +1 bonus to attack and damage rolls made with this weapon. When you hit with an attack with this magic weapon, nonmagical armor or a nonmagical shield worn by the target is partly dissolved and takes a permanent and cumulative −1 penalty to the AC it offers. Armor reduced to an AC of 10 or a shield reduced to a +0 bonus to AC is destroyed. 

If you are attuned to and are wielding Whacker, you can use two-weapon fighting with this weapon.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: Smith''s Tools

Whacker
Weapon (flail, morningstar, or mace), T1 (requires attunement)

This weapon has a glassteel ball with nubs connected to a solid adamantine handle, with the nubs extruding a light coating of oil of impact.

When you hit with an attack using this magic weapon, the target takes an extra 1d6 Bludgeoning damage. If you hit an object with this weapon, the hit is a critical hit.

If you are attuned to and are wielding Cracker, you can use two-weapon fighting with this weapon.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: Smith''s Tools', NULL, 2850.0),
('0f5f1595-6e5a-580f-b21a-b4dcd442d54d', 'LOT_0286', 'Crown of Daffodils', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"HWT"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Weaver''s Tools', NULL, 2860.0),
('ad5b67b2-eadf-5e43-997e-45935aaeddce', 'LOT_0287', 'Crusader''s Armament (HB) (any weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any)', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Weapon (any), T1 (requires attunement)

You can use an action while holding this weapon to cast Crusader''s Mantle from it. This property can''t be used again until the next dawn.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 2870.0),
('ee837e38-42ad-51ef-9055-5843fc096b46', 'LOT_0288', 'Dagger of the Drider (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (dagger)', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Weapon (dagger), T1

This ornate adamantine dagger displays the symbol of Lolth on its hilt and has a small white gem in its pommel.

The dagger has 2 charges that can be used in the following ways:
- When you hit a target with this magic weapon, you can immediately use a Bonus Action to expend 1 charge to deal an extra 1d6 Poison damage to the target and cast the Web spell (save DC 13) centered on the target. 
- When you roll a 20 with an attack roll with this weapon, the target takes an extra 1d6 Poison damage (for a total of 2d6 Poison damage on a critical hit) and 1 charge is expended from the dagger as the Web spell is cast centered on the target. Web cast in this way doesn''t require Concentration but instead lasts for its full duration.

The dagger regains all expended charges when you finish a Short or Long Rest while holding the dagger and succeed on a DC 10 Intelligence (Arcana) check (a drow, drider, or yochlol automatically succeeds). On a failed check, all remaining charges from the dagger are expended and the Web spell (save DC 13) is cast from the dagger centered on you. Web cast in this way doesn''t require Concentration but instead lasts for its full duration.

Whenever the last charge of the dagger is expended, roll a d20. On a 1, the dagger shatters and is destroyed. Each creature within 10 feet must succeed on a DC 13 Dexterity saving throw or take 1d4 Piercing damage and the Web spell (save DC 13) is cast, centered on where the dagger was destroyed. Web cast in this way doesn''t require Concentration but instead lasts for its full duration.

Base Cost: 400 GP (plus 2 GP for Dagger)
Crafting Cost: 200 GP (plus 2 GP for Dagger), 10 DTP (Smithy)
Tool: Smith''s Tools', NULL, 2880.0),
('f4309873-cc72-5468-affd-5f7d383fb5c3', 'LOT_0289', 'Dawnstar (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (morningstar)', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Weapon (morningstar), T1 (requires attunement by a paladin)

You have a +1 bonus to attack and damage rolls made with this magic weapon. Whenever you use Divine Smite, you can reroll one of the damage dice and must use the new roll.

Base Cost: 400 GP (plus 15 GP for Morningstar)
Crafting Cost: 200 GP (plus 15 GP for Morningstar), 10 DTP (Smithy)
Tool: Smith''s Tools', NULL, 2890.0),
('606d1387-4a71-522d-be15-145861366c13', 'LOT_0290', 'Delver''s Dirk (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (dagger)', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Weapon (dagger), T1 (requires attunement)

While holding this dagger, you always know how deep below the surface you are. Additionally, whenever you hit a creature with an attack with this dagger, the target''s speed is reduced by 5 feet until the start of your next turn. A creature''s speed can be reduced in this way no more than once per turn.

Base Cost: 400 GP (plus 2 GP for Dagger)
Crafting Cost: 200 GP (plus 2 GP for Dagger), 10 DTP (Smithy)
Tool: Smith''s Tools', NULL, 2900.0),
('8111ff8d-1cbb-59e2-830a-1d985ef8b71f', 'LOT_0291', 'Demon Skin (any medium or heavy armor except hide)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Armor (any medium or heavy armor except hide)', 'Permanent', false, NULL, 'T1 Permanent', '{"DLCT"}', 'See book for description.

Base Cost: 2000 GP (plus cost of armor)
Crafting Cost: 1000 GP (plus cost of armor), 30 DTP (Smithy)
Tool: See Equipment (depends on armor type)', NULL, 2910.0),
('0250d0f4-4765-567d-94a3-ae392601ff19', 'LOT_0292', 'Diatryma Feather (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Wondrous item, T1

You can use an action to blow on this feather and summon an axe beak that appears in an unoccupied space within 30 feet of you that isn''t blocked by total cover. The Axe Beak is hostile to and is an enemy to all other creatures it is aware of and acts on its own turn in Initiative. The axe beak disappears after 1 minute or if it dies. Once you use this property of the feather, it can''t be used again until the next dawn.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Weaver''s Tools', NULL, 2920.0),
('b45e2405-d895-5bd9-85df-eb4aa9188a32', 'LOT_0293', 'Dragonbinding Net (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (Net)', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Weapon (Net), T1

This Net has interwoven but loose ties and expands to fully engulf even the largest of creatures. This Net can affect creatures of any size.

Base Cost: 400 GP (plus 1 GP for Net)
Crafting Cost: 200 GP (plus 1 GP for Net), 10 DTP (Smithy)
Tool: Weaver''s Tools', NULL, 2930.0),
('d08b005b-364e-558c-a970-c405b73772d9', 'LOT_0294', 'Dragonbreath (HB) (any firearm)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any firearm)', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Weapon (any firearm), T1

A fierce, draconic design adorns this gun, and it glows with the power like the great dragon whose likeness it was made to resemble. You have a +1 bonus to attack and damage rolls made with this magic weapon. This weapon’s damage type for ranged attacks depends on the type of dragon it was modeled after as per the table below.

Dragon Color             Damage Type
Black / Copper             Acid
White / Silver               Cold
Red / Brass / Gold       Fire
Blue / Bronze               Lightning
Green                          Poison
Amethyst                     Force
Crystal                         Radiant
Emerald                       Psychic
Sapphire                      Thunder
Topaz                           Necrotic

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: Tinker''s Tools', NULL, 2940.0),
('2f74eb44-e1ed-5341-880d-e51203bde3e7', 'LOT_0295', '+1 Dragonhide Belt', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"FTD"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Leatherworker''s Tools', NULL, 2950.0),
('2605abf4-6481-5e4b-ab48-ae3da066047d', 'LOT_0296', 'Dragon Wing Bow (any ranged weapon that lacks the thrown property)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any ranged weapon that lacks the thrown property)', 'Permanent', false, NULL, 'T1 Permanent', '{"FTD"}', 'See book for description.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 2960.0),
('13b0e320-d48e-5c43-bcd2-037b7429fef6', 'LOT_0297', 'Driftglobe', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Glassblower''s Tools', NULL, 2970.0),
('4ff2eb74-f016-534c-82ac-d0affedecc8e', 'LOT_0298', 'Dusty Conch Shell (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Wondrous item, T1

You can use an action to blow on this shell and summon a dust mephit that appears in the nearest unoccupied area of exposed earth that fills a 10-foot cube within 90 feet of you that isn''t blocked by total cover. If no such area is present, blowing the horn has no effect. The summoned mephit remains while you concentrate (as if concentrating on a spell) and is friendly to you and your companions, obeys your verbal commands, and acts on its own turn in Initiative. The mephit disappears after 1 minute or if you lose concentration or it dies. If the mephit dies, the shell becomes nonmagical. Once you use this property of the shell, it can''t be used again until dawn 10 days later.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 2980.0),
('be88917f-a64d-5403-9efe-6e58927ea7ae', 'LOT_0299', 'Earworm', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"ERLW"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 2990.0),
('b7287f8a-7306-5d8d-8e33-8564c33ac611', 'LOT_0300', 'Eldritch Claw Tattoo', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"TCE"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Painter''s Supplies', NULL, 3000.0);

INSERT INTO public.ac_loot (
    id, check_id, name, category_id, tier_id, type, nature, is_dm_select, event_category, tier_display, source, description, notes_advice, display_order
) VALUES
('3893b7ee-1c24-5a82-989c-270147032caa', 'LOT_0301', 'Enspelled Armor (Cantrip) (any armor)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Armor (any)', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2024"}', 'See book for description.

Base Cost: 400 GP (plus cost of armor)
Crafting Cost: 200 GP (plus cost of armor), 10 DTP (Smithy)
Tool: See Equipment (depends on armor type)', NULL, 3010.0),
('47359955-3712-5671-8947-fbc74c0d6f39', 'LOT_0302', 'Enspelled Staff (Cantrip)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Staff', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2024"}', 'See book for description.

Base Cost: 400 GP (plus 5 GP for Staff)
Crafting Cost: 200 GP (plus 5 GP for Staff), 10 DTP (Arcane Study, Sanctuary, or Sacristy)
Tool: Woodcarver''s Tools', NULL, 3020.0),
('9c555fdc-6e7f-52b9-a47d-605e62265154', 'LOT_0303', 'Enspelled Weapon (Cantrip) (any weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any)', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2024"}', 'See book for description.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 3030.0),
('dff8882a-8885-5a30-90f3-18d7ae821866', 'LOT_0304', 'Enspelled Armor (Level 1) (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Armor (any)', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2024"}', 'See book for description.

Base Cost: 2000 GP (plus cost of armor)
Crafting Cost: 1000 GP (plus cost of armor), 30 DTP (Smithy)
Tool: See Equipment (depends on armor type)', NULL, 3040.0),
('8b9238b0-d328-5fb2-be4d-bc24ef93c654', 'LOT_0305', 'Enspelled Staff (Level 1)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Staff', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2024"}', 'See book for description.

Base Cost: 2000 GP (plus 5 GP for Staff)
Crafting Cost: 1000 GP (plus 5 GP for Staff), 30 DTP (Arcane Study, Sanctuary, or Sacristy)
Tool: Woodcarver''s Tools', NULL, 3050.0),
('89095f61-222e-5c90-98f0-ad53eecbaf0e', 'LOT_0306', 'Enspelled Weapon (Level 1) (any weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any)', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2024"}', 'See book for description.

Base Cost: 2000 GP (plus cost of weapon)
Crafting Cost: 1000 GP (plus cost of weapon), 30 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 3060.0),
('4ae5561c-7389-543d-a8c4-ea98d449e0e0', 'LOT_0307', 'Emerald Pen', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"FTD"}', 'See book for description.

Base Cost: 400 GP (plus 0.02 GP for Ink Pen)
Crafting Cost: 200 GP (plus 0.02 GP for Ink Pen), 10 DTP (Workshop)
Tool: Woodcarver''s Tools', NULL, 3070.0),
('cef6bf42-8f18-5923-aa91-78747ac75ac0', 'LOT_0308', 'Eversmoking Bottle', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Potter''s Tools', NULL, 3080.0),
('34d3d5a5-612b-5640-be23-dc123d959443', 'LOT_0309', 'Eyes of Charming', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Glassblower''s Tools', NULL, 3090.0),
('659e4060-a4ca-5f7a-845d-06f986eb9647', 'LOT_0310', 'Greater Eyes of the Eagle (Eyes of the Eagle (2024))', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Glassblower''s Tools', NULL, 3100.0),
('86e37b8b-95ce-522a-9ada-3836170db0b2', 'LOT_0311', 'Eyes of Minute Seeing', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Glassblower''s Tools', NULL, 3110.0),
('719a2b5a-d14b-533c-9f6d-f82b1126dbca', 'LOT_0312', 'Fate Cutter Shears (any piercing or slashing melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any piercing or slashing melee weapon)', 'Permanent', false, NULL, 'T1 Permanent', '{"BMT"}', 'See book for description.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 3120.0),
('4896ecd6-00ec-56eb-ad43-a8f272346015', 'LOT_0313', 'Feather of Diatryma Summoning', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"WDH"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Weaver''s Tools', NULL, 3130.0),
('1ffbc448-3543-5566-b866-642263196702', 'LOT_0314', 'Feathered Helm (Gallus, Luma, Raptor, or Strig)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"HWCS"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Smith''s Tools', NULL, 3140.0),
('ea9aa4a8-9822-563c-8e22-25b503d94a02', 'LOT_0315', 'Feywild Shard', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"TCE"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Arcane Study)
Tool: Jeweler''s Tools', NULL, 3150.0),
('8c4a5475-efee-5e14-b84c-32e9108ccfa5', 'LOT_0316', 'Figurine of Wondrous Power, Ivory Goat of Travail', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Mason''s Tools', NULL, 3160.0),
('03cb3c54-1432-5083-8098-b89f593e6807', 'LOT_0317', 'Figurine of Wondrous Power, Silver Raven', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Smith''s Tools', NULL, 3170.0),
('71676a1b-dc85-5fe7-8b90-449c9c2241c0', 'LOT_0318', 'Firestorm Weapon (HB) (any weapon with the heavy or two-handed property)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any weapon with the heavy or two-handed property)', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Weapon (any weapon with the heavy or two-handed property), T1 (requires attunement)

This weapon sheds bright light in a 20-foot radius and dim light for an additional 20 feet.

When you hit with an attack using this magic weapon, the target takes an extra 1d4 Fire damage. When you roll a 20 on attack roll with this magic weapon, the target must make a DC 15 Dexterity saving throw, taking 6d6 Fire damage on a failed save or half as much on a success. 

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 3180.0),
('c77ebdb0-bd21-5543-8892-727397e27c51', 'LOT_0319', 'Flame-Core Weapon (HB) (any melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any melee weapon)', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Weapon (any melee weapon), T1 (requires attunement)

This weapon is warm to the touch and has a pommel of cut ruby with facets that reflect the image of a licking flame. The dragon Themberchaud of Gracklestugh is said to imbue weapons such as this with his fiery breath and essence. 

You can use a Bonus Action to speak a command word while holding this weapon to cause the entire weapon to erupt into flames and shed bright light in a 20-foot radius and dim light for an additional 20 feet. While the sword is ablaze, it deals an extra 2d4 Fire damage to any target it hits. You also take this Fire damage at the end of each of your turns while holding this weapon and whenever you pick up the weapon for the first time on a turn. You must make a DC 13 Constitution saving throw to avoid dropping the weapon after taking any of this damage.

The flames last for 1 minute or until the weapon is fully submerged in water or a creature holding the weapon uses an action to douse the flames. 

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 3190.0),
('899ed650-3931-534e-acf8-d25f833283e6', 'LOT_0320', 'Flayer Slayer (any melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any melee weapon)', 'Permanent', false, NULL, 'T1 Permanent', '{"PBTSO"}', 'See book for description.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 3200.0),
('9f297f44-f12b-595a-a1b8-ae9ed5f85d49', 'LOT_0321', 'Galder’s Bubble Pipe', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"LLK"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Woodcarver''s Tools', NULL, 3210.0),
('25e7dbf5-b746-5009-9ef4-bc64e6a84223', 'LOT_0322', 'Gauntlets of Flaming Fury', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"BGDIA"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Smith''s Tools', NULL, 3220.0),
('a4e8009a-8263-58d8-934e-8db70b842ccf', 'LOT_0323', '+1 Gauntlets of the Dragon (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Wondrous item, T1

This pair of lightweight gauntlets is in the shape of a dragon''s head. While wearing these gauntlets, you have a +1 bonus to attack and damage rolls you make with Unarmed Strikes and natural weapons and such attacks are considered to be magical. The type of damage dealt by your Unarmed Strikes and natural weapons while wearing these gauntlets depends on the type of the dragon the gauntlets were modelled after as per the table below.

Dragon Color            Damage Type
Black / Copper            Acid
White / Silver              Cold
Red / Brass / Gold      Fire
Blue / Bronze              Lightning
Green                         Poison
Amethyst                    Force
Crystal                        Radiant
Emerald                      Psychic
Sapphire                     Thunder
Topaz                          Necrotic

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Smith''s Tools', NULL, 3230.0),
('938d6084-3f8c-5af8-8b6f-32d854f961b3', 'LOT_0324', 'Gauntlet of Transfusion (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Wondrous item, T1

This bronze gauntlet has a small circular glass window at the back of the hand. The leather underside has hundreds of small needles.

You can use an action to open the small window and pour the contents of a potion within, storing it in the gauntlet. As an action or a Bonus Action, you can speak the gauntlet’s command word to administer the stored potion on a willing or Incapacitated creature within 5 feet of you (this can include yourself). The gauntlet can only store one potion at a time.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Smith''s Tools', NULL, 3240.0),
('e50fdb44-179f-56c5-a08c-211832676859', 'LOT_0325', 'Ghost Lantern', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"ToA"}', 'See book for description.

Base Cost: 400 GP (plus 5 GP for Hooded Lantern)
Crafting Cost: 200 GP (plus 5 GP for Hooded Lantern), 10 DTP (Workshop)
Tool: Tinker''s Tools', NULL, 3250.0),
('54694dc1-1d7c-53f0-b6e4-83313a50752e', 'LOT_0326', 'Gloves of Missile Snaring', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Weaver''s Tools', NULL, 3260.0),
('f7f44360-460b-548c-a1f7-4d3fff624126', 'LOT_0327', 'Gloves of Swimming and Climbing', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Weaver''s Tools', NULL, 3270.0),
('40149fb3-6d6f-5647-a089-748d10c7781f', 'LOT_0328', 'Gloves of Thievery', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Weaver''s Tools', NULL, 3280.0),
('845377ac-bbf2-59a3-9316-5117a0a909c5', 'LOT_0329', 'Goggles of Night', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Glassblower''s Tools', NULL, 3290.0),
('763474a4-f59a-533b-887d-c070ebe5c867', 'LOT_0330', 'Goggles of Object Reading', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"EGW"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Glassblower''s Tools', NULL, 3300.0),
('2e22dec2-213c-59c1-9117-ff8e23de3044', 'LOT_0331', 'Grasping Whip', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (whip)', 'Permanent', false, NULL, 'T1 Permanent', '{"BMT"}', 'See book for description.

Base Cost: 400 GP (plus 2 GP for Whip)
Crafting Cost: 200 GP (plus 2 GP for Whip), 10 DTP (Smithy)
Tool: Leatherworker''s Tools', NULL, 3310.0),
('5b1883d7-e43d-5405-84db-e9920d00dd36', 'LOT_0332', 'Green Copper Ewer (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Wondrous item, T1

Any poisonous liquid poured into the ewer is instantly transformed into an equal amount of sweet wine. Furthermore, a creature that grasps the ewer''s handle can command the ewer to fill with 1 gallon of wine, and it can''t produce more wine until the next dawn.

Base Cost: 400 GP (plus 0.02 GP for Jug)
Crafting Cost: 200 GP (plus 0.02 GP for Jug), 10 DTP (Workshop)
Tool: Potter''s Tools', NULL, 3320.0),
('31a99806-9fa4-5bc3-835e-6b6bd397655f', 'LOT_0333', 'Guardian Emblem', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"TCE"}', 'See book for description.

Base Cost: 400 GP (plus 5 GP for Emblem)
Crafting Cost: 200 GP (plus 5 GP for Emblem), 10 DTP (Sanctuary or Sacristy)
Tool: Painter''s Supplies', NULL, 3330.0),
('c6c674b2-4f18-5852-bba6-8a4b8aac93df', 'LOT_0334', 'Guild Signet', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"GGR"}', 'See book for description.

Base Cost: 400 GP (plus 5 GP for Signet Ring)
Crafting Cost: 200 GP (plus 5 GP for Signet Ring), 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 3340.0),
('ba47b340-0d20-5aab-a27a-4d79a550268b', 'LOT_0335', 'Hat of Disguise', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Weaver''s Tools', NULL, 3350.0),
('ebf1523a-7c87-5dfe-9650-9d3f78066c64', 'LOT_0336', 'Helm of Awareness', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"EFA"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Smith''s Tools', NULL, 3360.0),
('8bb807da-be57-5bf2-b4de-4ed7e4113a60', 'LOT_0337', 'Helm of Comprehending Languages', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Smith''s Tools', NULL, 3370.0),
('eab04229-8b1d-527d-a4f4-f6a66ac12a85', 'LOT_0338', 'Helm of the Gods (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Wondrous item, T1 (requires attunement)

While wearing this helm, you know whether there is a celestial or fiend within 30 feet of you, as well as where the creature is located, provided the creature isn''t behind total cover.

Whenever you finish a Long Rest while wearing the helm, you can pray to a god associated with one of the divine domains listed on the Helm of the Gods table and store the listed spell in the helm, replacing any spell that is already stored there. The save DC for the spell is 13, the spell attack modifier is +5, and the spellcasting ability modifier is +3.

The helm has 3 charges. To cast a spell from the helm, you must expend 1 charge, and the helm regains 1d3 charges daily at dawn.

Divine Domain     Spell
Arcana                   magic missile
Death                     inflict wounds
Forge                     searing smite
Grave                     protection from evil and good
Knowledge             identify
Life                         lesser restoration
Light                       guiding bolt
Nature                    goodberry
Order                     entangle
Peace                    sanctuary
Tempest                 thunderous smite
Trickery                 charm person
Twilight                  faerie fire
War                       heroism

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Smith''s Tools', NULL, 3380.0),
('121b1e22-d079-5814-b840-0102fab8f677', 'LOT_0339', 'Helm of Telepathy', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 2000 GP
Crafting Cost: 1000 GP, 30 DTP (Workshop)
Tool: Smith''s Tools', NULL, 3390.0),
('a9bf1b38-51dd-5309-9f4a-340b84914349', 'LOT_0340', 'Helm of Underwater Action', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"GoS"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Smith''s Tools', NULL, 3400.0),
('a5e36463-f385-52a6-80a3-591eef09b6af', 'LOT_0341', 'Heroic Gauntlets of the Courageous (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Wondrous item, T1 (requires attunement by a paladin)

While wearing these gauntlets, you have Advantage on saving throws against being Frightened. Additionally, your pool of healing for Lay on Hands increases by 5 points.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Sanctuary or Sacristy)
Tool: Smith''s Tools', NULL, 3410.0),
('f54f2ddf-44bb-503e-a445-04668091e4a3', 'LOT_0342', 'Heward''s Hireling Armor', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Armor (leather armor)', 'Permanent', false, NULL, 'T1 Permanent', '{"LLK"}', 'See book for description.

Base Cost: 400 GP (plus 10 GP for Leather Armor)
Crafting Cost: 200 GP (plus 10 GP for Leather Armor), 10 DTP (Smithy)
Tool: Leatherworker''s Tools', NULL, 3420.0),
('1860fdcd-2507-5e10-a3e0-99a21312e87a', 'LOT_0343', 'Hook of Fisher''s Delight', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"IDRotF"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)', NULL, 3430.0),
('68cc6a7e-e150-5aec-b9dc-c7abfb48d103', 'LOT_0344', 'Horseshoes of Speed', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 2000 GP
Crafting Cost: 1000 GP, 30 DTP (Workshop)
Tool: Smith''s Tools', NULL, 3440.0),
('ff6dc3f0-92cd-5cd2-ac89-a1775830ddbe', 'LOT_0345', 'Horseshoes of a Zephyr', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Smith''s Tools', NULL, 3450.0),
('a27434bd-85df-59fe-99da-c2fe724dad09', 'LOT_0346', 'House of Cards', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"BMT"}', 'See book for description.

Base Cost: 400 GP (plus 0.5 GP for Playing Cards)
Crafting Cost: 200 GP (plus 0.5 GP for Playing Cards), 10 DTP (Workshop)
Tool: Gaming Set (Playing Cards)', NULL, 3460.0),
('2c19e4b2-4ffe-5c83-9928-883f8f83fde4', 'LOT_0347', 'Howell''s Travelling Cabin (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Wondrous item, T1

You can use an action to place this model cabin on the ground and speak its command word. The model rapidly grows into a full sized cabin that remains until you use an action to speak the command word that dismisses it. The full sized cabin is a square structure that is 20 feet on a side and 20 feet high. If the space the cabin would expand into is occupied by creatures or solid objects, the model does not grow. The cabin magically produces a three course meal to serve six creatures that appears at dusk each day. The cabin can be returned to its model form by speaking its command word as an action, with any creatures and objects not originally from the cabin''s interior expelled to unoccupied spaces around the model. Once you''ve grown the model into a cabin this way, it can''t be used again until dawn 10 days later.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Carpenter''s Tools', NULL, 3470.0),
('a4d9f063-af86-5621-824a-d51f98851fe9', 'LOT_0348', 'Hunter''s Coat', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Armor (leather armor)', 'Permanent', false, NULL, 'T1 Permanent', '{"EGW"}', 'See book for description.

Base Cost: 400 GP (plus 10 GP for Leather Armor)
Crafting Cost: 200 GP (plus 10 GP for Leather Armor), 10 DTP (Smithy)
Tool: Leatherworker''s Tools', NULL, 3480.0),
('ad1ffa59-eb79-5709-be15-e23fdae6300c', 'LOT_0349', 'Iggwilv’s Horn', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DLCT"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Tinker''s Tools', NULL, 3490.0),
('cf53e7f1-faf9-51fc-9b48-ccefd8827677', 'LOT_0350', 'Immovable Rod', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Rod', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP (plus 10 GP for Rod)
Crafting Cost: 200 GP (plus 10 GP for Rod), 10 DTP (Arcane Study, Sanctuary, or Sacristy)
Tool: Smith''s Tools', NULL, 3500.0),
('0953be75-a189-58ff-a524-3c97492456f4', 'LOT_0351', 'Inquisitive''s Goggles (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Wondrous item, T1 (requires attunement)

The crystal lenses of these goggles shine a distinct amber color. While attuned to these goggles, you gain the following benefits:
- You have advantage on Wisdom (Insight) checks against creatures that you can see. 
- When you examine an object, you can make a Wisdom (Perception) check to identify the aura of the last living
creature to touch the object. The DC is 13 + the number of days since last contact occurred. If the check is successful, you learn the race of the creature and you gain advantage on any Wisdom (Perception) or Wisdom (Survival) checks made to find it. This benefit lasts until dawn seven days later, and you lose it if you should use it again on another object.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Glassblower''s Tools', NULL, 3510.0),
('134b3ad8-4ee4-52c4-8916-039f5c28ea08', 'LOT_0352', 'Insignia of Claws', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"HOTDQ_TOD"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 3520.0),
('ee8db8c5-d4b0-5a28-9ff4-26af816a09a8', 'LOT_0353', 'Instrument of the Bards, Doss Lute', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Arcane Study)
Tool: Tinker''s Tools', NULL, 3530.0),
('4e9ee25b-07bf-5f8b-9e4a-e9533ecfc4fe', 'LOT_0354', 'Instrument of the Bards, Fochlucan Bandore', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Arcane Study)
Tool: Tinker''s Tools', NULL, 3540.0),
('625f84f5-1ff1-5c25-884f-6970ef88ab47', 'LOT_0355', 'Instrument of the Bards, Mac-Fuirmidh Cittern', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Arcane Study)
Tool: Tinker''s Tools', NULL, 3550.0),
('d412a6b9-1916-5af2-9368-6f04a2ae03cf', 'LOT_0356', 'Ioun Stone of Agility', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 3560.0),
('4cba42bf-60ef-58eb-a101-67de497c11fc', 'LOT_0357', 'Ioun Stone of Awareness', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 3570.0),
('8c658b4e-f622-5b4a-b7a2-d576f717df07', 'LOT_0358', 'Ioun Stone of Fortitude', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 3580.0),
('ce01a9d0-ecf1-50ac-8c1c-9e6d60e27749', 'LOT_0359', 'Ioun Stone of Historical Knowledge', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"LLK"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 3590.0),
('899c45dd-b533-5172-8195-f2c0f0159ca2', 'LOT_0360', 'Ioun Stone of Insight', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 3600.0),
('462f1a4f-9336-5a7d-9985-e47ee8dc59ed', 'LOT_0361', 'Ioun Stone of Intellect', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 3610.0),
('eeeaaac5-a314-58cf-808a-5ce9404fbe60', 'LOT_0362', 'Ioun Stone of Leadership', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 3620.0),
('74d9ff80-6f5f-58eb-85c9-5a6dd7a6f820', 'LOT_0363', 'Ioun Stone of Natural Knowledge', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"LLK"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 3630.0),
('4e368521-00a5-5d5e-84d1-e277c8dc2d02', 'LOT_0364', 'Ioun Stone of Regeneration', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 3640.0),
('89f738a5-5359-5831-9532-1e1481848871', 'LOT_0365', 'Ioun Stone of Religious Knowledge', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"LLK"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 3650.0),
('72c20426-34f4-543d-af52-2e92954669d8', 'LOT_0366', 'Ioun Stone of Self-Preservation', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"LLK"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 3660.0),
('cc0e6d87-3b36-5589-a10b-f304e71e19a7', 'LOT_0367', 'Ioun Stone of Strength', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 3670.0),
('3d0ba020-49e4-5b71-9608-9cbce8ab3767', 'LOT_0368', 'Ioun Stone of Sustenance', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 3680.0),
('78de1fd1-1b60-5cd4-980b-16cc53ba757e', 'LOT_0369', 'Javelin of Lightning', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (javelin)', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP (plus 0.5 GP for Javelin)
Crafting Cost: 200 GP (plus 0.5 GP for Javelin), 10 DTP (Smithy)
Tool: Smith''s Tools', NULL, 3690.0),
('1c231a9f-1ca2-5f78-921f-278dab80a9a7', 'LOT_0370', 'Linza’s Disgraced Cuirass (HB) (any medium or heavy armor except hide)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Armor (any medium or heavy armor except hide)', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Linza''s Disgraced Cuirass
Armor (any medium or heavy armor except hide), T1

This armor has 5 charges, and it regains 1d4+1 expended charges daily at dawn. If you are hit by a melee attack while wearing this armor, you can expend 1 charge to deal 5 Slashing damage to the attacker.

Base Cost: 400 GP (plus cost of armor)
Crafting Cost: N/A (cannot be crafted)', NULL, 3700.0),
('2e402bdc-be3e-55c8-9c78-89a6563d8bec', 'LOT_0371', 'Linza’s Shattered Shield (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Armor (shield)', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Armor (shield), T1

This shield has 5 charges, and it regains 1d4+1 expended charges daily at dawn. When you are hit with a melee attack while wielding this shield, you can use a Reaction to expend 1 charge and reduce the damage of the attack by 1d10. 

Base Cost: 400 GP (plus 10 GP for Shield)
Crafting Cost: N/A (cannot be crafted)', NULL, 3710.0),
('6fafcc2b-3be8-5a2b-a80c-59669376ba56', 'LOT_0372', 'Living Gloves', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"ERLW"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Weaver''s Tools', NULL, 3720.0),
('39b6c789-2263-569c-9c39-2c917377774c', 'LOT_0373', 'Mantle of Spell Resistance', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Weaver''s Tools', NULL, 3730.0),
('ad83beb9-d857-579a-a772-3c0afdcba527', 'LOT_0374', 'Mariner’s Armor (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Armor (any)', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP (plus cost of armor)
Crafting Cost: 200 GP (plus cost of armor), 10 DTP (Smithy)
Tool: See Equipment (depends on armor type)', NULL, 3740.0),
('fad6de64-930f-59b2-9362-aadc778a92a2', 'LOT_0375', 'Marotte of Chance', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Rod', 'Permanent', false, NULL, 'T1 Permanent', '{"HWT"}', 'See book for description.

Base Cost: 400 GP (plus 10 GP for Rod)
Crafting Cost: 200 GP (plus 10 GP for Rod), 10 DTP (Arcane Study, Sanctuary, or Sacristy)
Tool: Woodcarver''s Tools', NULL, 3750.0),
('b6203662-832e-5764-a995-758ab1e15c5c', 'LOT_0376', 'Mechanical Wonder (Domestic)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"FRHOF", "FRAIF"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Tinker''s Tools', NULL, 3760.0),
('fbc67666-0d71-5b09-8f12-4913f609ddec', 'LOT_0377', 'Medallion of Thoughts', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 3770.0),
('60dbe127-5e8b-5e06-8b5b-87aaf3516a70', 'LOT_0378', 'Mind Sharpener', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Ring', 'Permanent', false, NULL, 'T1 Permanent', '{"EFA"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 3780.0),
('0f0ff09c-1afc-5d4b-8aff-3212b5ba867c', 'LOT_0379', 'Mithral Armor (any medium or heavy armor except hide)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Armor (any medium or heavy armor except hide)', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP (plus cost of armor)
Crafting Cost: 200 GP (plus cost of armor), 10 DTP (Smithy)
Tool: See Equipment (depends on armor type)', NULL, 3790.0),
('c0074e53-ed5d-5a30-8f54-442e5a99ad17', 'LOT_0380', 'Mithral Weapon (HB) (Any Light Melee Weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (Any Light Melee Weapon)', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Weapon (Any Light Melee Weapon), T1

This weapon is made of mithral, a light, flexible metal, and weighs a quarter of its normal weight.

This weapon has the Finesse property. If this weapon has the Thrown property, attacking at long range doesn''t impose Disadvantage on ranged attack rolls made with this weapon.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 3800.0),
('5f24a3be-36c2-5f5b-8dec-2e434b7a0b91', 'LOT_0381', 'Molten Bronze Skin (any medium or heavy armor except hide)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Armor (any medium or heavy armor except hide)', 'Permanent', false, NULL, 'T1 Permanent', '{"MOT"}', 'See book for description.

Base Cost: 2000 GP (plus cost of armor)
Crafting Cost: 1000 GP (plus cost of armor), 30 DTP (Smithy)
Tool: See Equipment (depends on armor type)', NULL, 3810.0),
('23fb27e0-5be9-5d52-b704-328003171f55', 'LOT_0382', 'Nature''s Mantle', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"TCE", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Sanctuary or Sacristy)
Tool: Weaver''s Tools', NULL, 3820.0),
('316f8eec-57a9-5b99-a510-cba8832ccf98', 'LOT_0383', 'Necklace of Adaptation', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 3830.0),
('8e64eaf9-5301-5781-9cca-5b7df0e7c94f', 'LOT_0384', 'Needle of Mending', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (dagger)', 'Permanent', false, NULL, 'T1 Permanent', '{"EGW"}', 'See book for description.

Base Cost: 400 GP (plus 2 GP for Dagger)
Crafting Cost: 200 GP (plus 2 GP for Dagger), 10 DTP (Smithy)
Tool: Smith''s Tools', NULL, 3840.0),
('30f15bad-9414-5aea-b11a-781523601ad6', 'LOT_0385', 'Nest Charm', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"HWCS"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Smith''s Tools', NULL, 3850.0),
('dc225b60-9642-57e9-b506-c843f28dad2a', 'LOT_0386', 'Netherese Timecleaver (HB) (any piercing or slashing melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any piercing or slashing melee weapon)', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Weapon (any piercing or slashing melee weapon), T1 (requires attunement)

You gain a +1 bonus to Attack and Damage Rolls made with this Magic Weapon.

When you roll a 20 on an Attack roll made with this weapon, the target must make a DC 15 Wisdom saving throw or vanish, being thrown to another point in time. At the end of its next turn, the target returns to the space it previously occupied, or the nearest unoccupied space. When the target returns, it is unaware that any time has passed.

Cursed. This weapon is cursed, and becoming attuned to it extends the curse to you. Until the curse is broken with a Remove Curse spell or similar magic, you are unwilling to part with the weapon. Whenever you attack a creature with this weapon and roll a 1 on the attack roll, you must succeed on a DC 15 Wisdom saving throw or vanish, being thrown to another point in time. At the end of your next turn, you return to the space you previously occupied, or the nearest unoccupied space. When you return, you are unaware that any time has passed.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 3860.0),
('1a60875b-b1a2-52c1-a50e-710964a51b2d', 'LOT_0387', 'Orca Weapon (HB) (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any)', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Weapon (any), T1 (requires attunement)

This weapon has been artfully crafted with motifs of a great undersea predator. You have a +1 bonus to attack and damage rolls made with this weapon. Additionally, while you hold this weapon, you gain a swimming speed equal to your walking speed, and attacks you make with this weapon ignore any penalties due to being underwater. 

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 3870.0),
('bd1ecfd7-edef-5dc5-b413-f8f73f60d095', 'LOT_0388', 'Ogre Bolt Launcher (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Martial weapon, ranged weapon, T1

2d8 Piercing — Ammunition (Range 120/480 ft.; Bolt), Heavy, Loading, Two-Handed

This unique weapon can only be wielded by a Medium or larger creature with a Strength of 18 or higher. This ballista converted into a crossbow uses Bolts as ammunition that deal piercing damage equal to 2d8 + the wielder''s Strength modifier.

Base Cost: 400 GP (plus 50 GP for Heavy Crossbow)
Crafting Cost: 200 GP (plus 50 GP for Heavy Crossbow), 10 DTP (Smithy)
Tool: Woodcarver''s Tools', NULL, 3880.0),
('98a6ffc3-067f-559e-98fc-85a95c7e1ec3', 'LOT_0389', 'Oversized Longbow', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon', 'Permanent', false, NULL, 'T1 Permanent', '{"WDH"}', 'See book for description.

Base Cost: 400 GP (plus 50 GP for Longbow)
Crafting Cost: 200 GP (plus 50 GP for Longbow), 10 DTP (Smithy)
Tool: Woodcarver''s Tools', NULL, 3890.0),
('640097ef-ff4e-5354-a3c8-8d2dddf7699a', 'LOT_0390', 'Peacemaker (HB) (any ranged weapon that lacks the thrown property)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any ranged weapon that lacks the thrown property)', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Weapon (any ranged weapon that lacks the thrown property), T1

You have a +1 bonus to attack and damage rolls made with this magic weapon. Additionally, when you would reduce a creature to 0 hit points with an attack with this weapon, you can choose to knock the creature out.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 3900.0),
('3b267c5f-5664-5e5c-b58e-df142d8082f3', 'LOT_0391', 'Pearl of Power', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 3910.0),
('c73ec296-5214-525d-a852-963a335bf547', 'LOT_0392', 'Pennant of the Vind Rune', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"SKT"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Weaver''s Tools', NULL, 3920.0),
('c1ffcf6e-139e-5530-8ba7-59e1e14e4bbe', 'LOT_0393', 'Lesser Periapt of Health (Periapt of Health (2024))', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 3930.0),
('bf65d8a1-6434-5fba-be62-ae9f3336e0d1', 'LOT_0394', 'Periapt of Wound Closure', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 3940.0),
('74888747-f65e-5709-bc7d-b466917bb096', 'LOT_0395', 'Piercer (any piercing or slashing melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any piercing or slashing melee weapon)', 'Permanent', false, NULL, 'T1 Permanent', '{"AcqInc"}', 'See book for description.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 3950.0),
('5d145119-99ad-5a85-9997-71c37be1d3f4', 'LOT_0396', 'Pipes of Pestilence', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"WttHC"}', 'See book for description.

Base Cost: 400 GP (plus 30 GP for Bagpipes)
Crafting Cost: 200 GP (plus 30 GP for Bagpipes), 10 DTP (Workshop)
Tool: Woodcarver''s Tools', NULL, 3960.0),
('1a9c9853-8765-595a-884f-c92ca6c488d9', 'LOT_0397', 'Pipes of the Sewers', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP (plus 30 GP for Bagpipes)
Crafting Cost: 200 GP (plus 30 GP for Bagpipes), 10 DTP (Workshop)
Tool: Woodcarver''s Tools', NULL, 3970.0),
('1b4862b7-185c-5b89-a1f5-b21730adcdf2', 'LOT_0398', 'Polymorph Weapon (Polymorph Blade) (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any)', 'Permanent', false, NULL, 'T1 Permanent', '{"LLK"}', 'See book for description.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 3980.0),
('be57c14e-edc5-57f2-8c09-b522f255ccb4', 'LOT_0399', 'Prayer Bead, Bless', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'Bead of a Necklace of Prayer Beads. See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Sanctuary or Sacristy)
Tool: Jeweler''s Tools', NULL, 3990.0),
('1dd20a74-aa67-55d0-bd42-5375a54fca9f', 'LOT_0400', 'Prayer Bead, Curing', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'Bead of a Necklace of Prayer Beads. See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Sanctuary or Sacristy)
Tool: Jeweler''s Tools', NULL, 4000.0);

INSERT INTO public.ac_loot (
    id, check_id, name, category_id, tier_id, type, nature, is_dm_select, event_category, tier_display, source, description, notes_advice, display_order
) VALUES
('851bd3ad-d7e5-59e0-9a4a-e0f7fbc6ddac', 'LOT_0401', 'Prayer Bead, Smiting', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'Bead of a Necklace of Prayer Beads. See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Sanctuary or Sacristy)
Tool: Jeweler''s Tools', NULL, 4010.0),
('034e441f-86f3-56f0-9770-991a07f7245b', 'LOT_0402', 'Psi Crystal', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"IDRotF"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 4020.0),
('f9ca260a-8972-5c3c-a828-4acff2e53812', 'LOT_0403', 'Pyroconverger', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"GGR"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tools: Tinker''s Tools', NULL, 4030.0),
('095c78dc-261c-5268-9cf8-2b2d9b1b15d2', 'LOT_0404', 'Quiver of Ehlonna', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP (plus 1 GP for Quiver)
Crafting Cost: 200 GP (plus 1 GP for Quiver), 10 DTP (Workshop)
Tool: Leatherworker''s Tools', NULL, 4040.0),
('8cae164d-17ff-5112-86e3-90ec1d6207e5', 'LOT_0405', 'Red-Feather Bow (any ranged weapon that lacks the thrown property)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any ranged weapon that lacks the thrown property)', 'Permanent', false, NULL, 'T1 Permanent', '{"HWCS"}', 'See book for description.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 4050.0),
('395da6e2-5980-5525-8572-69f032c60f83', 'LOT_0406', 'Repeating Crossbow (HB) (any crossbow)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any crossbow)', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Weapon (any crossbow), T1

This crossbow does not have the Loading property and has half the range of a normal crossbow.

This crossbow is fitted with a cartridge that can hold up to six crossbow bolts. It automatically reloads after firing until the cartridge runs out of ammunition. Reloading the cartridge takes a Utilize action.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: Woodcarver''s Tools', NULL, 4060.0),
('354905dc-78e6-504d-9131-ab49c840f264', 'LOT_0407', 'Repeating Shot', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (Any Simple or Martial with the Ammunition Property)', 'Permanent', false, NULL, 'T1 Permanent', '{"EFA"}', 'See book for description.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 4070.0),
('d18c5400-266c-575d-a714-b168f1b4b969', 'LOT_0408', 'Returning Weapon', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (Any Simple or Martial with the Thrown Property)', 'Permanent', false, NULL, 'T1 Permanent', '{"EFA"}', 'See book for description.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 4080.0),
('40c0e766-5b89-5622-bd22-e632d6ed5b91', 'LOT_0409', 'Rhahk’Zor’s Crusher (HB) (any melee weapon with the heavy or two-handed property)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any melee weapon with the heavy or two-handed property)', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Weapon (any melee weapon with the heavy or two-handed property), T1 (requires attunement)

This weapon has 3 charges, and it regains 1d3 expended charges daily at dawn. When you hit with an attack using this weapon, you can expend 1 or more of its to cast Earth Tremor (save DC 13) as part of the attack. For 1 charge, you cast the 1st-level version of the spell. You can increase the spell slot level by one for each additionally charge you expend. 

Additionally, while you hold this weapon, you can cast Mold Earth.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 4090.0),
('d97be840-e946-542c-8af3-0cd15c883363', 'LOT_0410', 'Ring of Barrels', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Ring', 'Permanent', false, NULL, 'T1 Permanent', '{"VSS_PP"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 4100.0),
('701fa4ae-4157-5ec9-804f-af78852c5783', 'LOT_0411', 'Ring of Feather Falling', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Ring', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 4110.0),
('7e8f2034-4276-5b81-96d1-781581b609e0', 'LOT_0412', 'Ring of Jumping', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Ring', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 4120.0),
('919f32ea-517f-5547-8c23-cec063c66314', 'LOT_0413', 'Ring of Mind Shielding (empty)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Ring', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'This is a Ring of Mind Shielding which does not contain a soul inside of it. See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 4130.0),
('4e319885-4d33-5f23-a5c0-7354f133c1e7', 'LOT_0414', 'Ring of Obscuring', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Ring', 'Permanent', false, NULL, 'T1 Permanent', '{"EGW"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 4140.0),
('7bff8d81-38b2-560b-b67d-7fb53f6a905e', 'LOT_0415', 'Ring of the Orator', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Ring', 'Permanent', false, NULL, 'T1 Permanent', '{"PBTSO"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 4150.0),
('dc4e8402-9524-5f42-9a8b-1ee8d586c500', 'LOT_0416', 'Ring of Plant Speech', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Ring', 'Permanent', false, NULL, 'T1 Permanent', '{"HWT"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 4160.0),
('60242d42-35a7-558f-a00d-5e9a9a9fba94', 'LOT_0417', 'Ring of Puzzler''s Wit', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Ring', 'Permanent', false, NULL, 'T1 Permanent', '{"BMT"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 4170.0),
('985957c8-43f7-5fd0-8fb0-8a68dd79096e', 'LOT_0418', 'Ring of the Ram', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Ring', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 4180.0),
('9419a852-94c7-58d7-a542-ae71af9109da', 'LOT_0419', 'Rings of Shared Suffering (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Ring', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Ring, T1 (requires attunement)

These rings come in linked pairs. You can use a Bonus Action to form a link to the creature attuned to the other ring; from then on, whenever that creature suffers damage, they only suffer half of that damage and you take the rest. This effect continues until you end it as a Bonus Action or until you or the other creature removes their ring. This effect isn''t limited by range. A creature cannot be attuned to more than one Ring of Shared Suffering.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 4190.0),
('6c5c591d-710f-5ccb-a684-408409d9209d', 'LOT_0420', 'Ring of the Sky Hunter', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Ring', 'Permanent', false, NULL, 'T1 Permanent', '{"HWT"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 4200.0),
('4f53750d-b288-5b05-9ade-765557af760d', 'LOT_0421', 'Ring of X-Ray Vision', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Ring', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 4210.0),
('2dc38068-3cff-5c5c-870e-2b775f4e5127', 'LOT_0422', 'Rod of Retribution', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Rod', 'Permanent', false, NULL, 'T1 Permanent', '{"EGW"}', 'See book for description.

Base Cost: 400 GP (plus 10 GP for Rod)
Crafting Cost: 200 GP (plus 10 GP for Rod), 10 DTP (Arcane Study, Sanctuary, or Sacristy)
Tool: Smith''s Tools', NULL, 4220.0),
('16cd3216-4a3a-5487-8a2b-7fdfcf9d6af8', 'LOT_0423', 'Rope of Climbing', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP (plus 1 GP for Rope)
Crafting Cost: 200 GP (plus 1 GP for Rope), 10 DTP (Workshop)
Tool: Weaver''s Tools', NULL, 4230.0),
('6d09770a-ad64-5afa-b538-4264d320eaf9', 'LOT_0424', 'Ruby of the War Mage', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"XGE", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 4240.0),
('4e6383ef-284d-54f7-b22e-5b4c662cd6c6', 'LOT_0425', 'Ruinous Weapon (Ruinous Flail) (any melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any melee weapon)', 'Permanent', false, NULL, 'T1 Permanent', '{"BMT"}', 'See book for description.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 4250.0),
('296fec5c-4e37-514b-aa32-93043ae99407', 'LOT_0426', 'Rusted Iron Ring', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Ring', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Ring, T1

While you wear this ring, you can speak its command word and ignore nonmagical difficult terrain for 1 hour. This property can''t be used again until the next dawn.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 4260.0),
('79ca9fa7-7973-5207-849d-48669889a789', 'LOT_0427', 'Saddle of the Cavalier', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP (plus 20 GP for Military Saddle)
Crafting Cost: 200 GP (plus 20 GP for Military Saddle), 10 DTP (Workshop)
Tool: Leatherworker''s Tools', NULL, 4270.0),
('6536bdc8-0406-5bb6-860a-71354dabcfbf', 'LOT_0428', 'Scorpion Armor', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Armor (plate armor)', 'Permanent', false, NULL, 'T1 Permanent', '{"ToA"}', 'See book for description.

Base Cost: 400 GP (plus 1500 GP for Plate Armor)
Crafting Cost: 200 GP (plus 1500 GP for Plate Armor), 10 DTP (Smithy)
Tool: Smith''s Tools', NULL, 4280.0),
('d976059e-bd87-5ac8-b8ad-902a3087b804', 'LOT_0429', 'Sending Stones (pair of)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Mason''s Tools', NULL, 4290.0),
('23db9f19-5342-5f5c-85a3-c54493fee48a', 'LOT_0430', 'Shadow Mist (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Wondrous item, T1 (requires attunement)

These boots have 3 charges and regains 1d3 expended charges daily at dawn. While you are in an area of Dim Light or Darkness while wearing these boots, you can use a Bonus Action to expend 1 charge and cast Misty Step.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Cobbler''s Tools', NULL, 4300.0),
('9b3785fb-0866-58d1-bdd8-98e5cd18d139', 'LOT_0431', 'Shield of Missile Attraction', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Armor (shield)', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP (plus 10 GP for Shield)
Crafting Cost: 200 GP (plus 10 GP for Shield), 10 DTP (Smithy)
Tool: Smith''s Tools', NULL, 4310.0),
('372a9036-b6a9-5f11-8dde-836f39e34575', 'LOT_0432', 'Shield Ring (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Ring', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Ring, T1 (requires attunement)

If you aren''t missing any Hit Points, you have a +1 bonus to your AC while wearing this ring.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 4320.0),
('412ddd44-7e4f-5469-88fa-5125f1e9bbd1', 'LOT_0433', 'Shining Knight''s Ring (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Ring', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Wondrous item, T1 (requires attunement by a paladin)

This ring normally resembles a simple gold band. When you wear and are attuned to this ring, it forms a symbol of your oath along the band. 

You can use an action while wearing the ring to cast Prestidigitation to clean yourself and any equipment you are wearing or carrying. Additionally, while you are attuned to this ring, the Find Steed and Find Greater Steed spells are oath spells for you: they are always prepared and don''t count against the number of spells you can prepare each day.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Sanctuary or Sacristy)
Tool: Jeweler''s Tools', NULL, 4330.0),
('6d30ab6c-bcf0-54b1-a5ef-069d1f4c114f', 'LOT_0434', 'Shrieking Greaves', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"BMT"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Smith''s Tools', NULL, 4340.0),
('d3cfac45-0f24-519d-a920-1aac76cc9c0f', 'LOT_0435', 'Siren Song Lyre', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"MOT"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Tinker''s Tools', NULL, 4350.0),
('469470d5-4aea-5fd4-b56b-22935e549e89', 'LOT_0436', 'Skyblinder Staff', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Staff', 'Permanent', false, NULL, 'T1 Permanent', '{"GGR"}', 'See book for description.

Base Cost: 400 GP (plus 5 GP for Staff)
Crafting Cost: 200 GP (plus 5 GP for Staff), 10 DTP (Arcane Study, Sanctuary, or Sacristy)
Tool: Woodcarver''s Tools', NULL, 4360.0),
('bb3a8f0d-4421-5df4-931d-51f9629969ca', 'LOT_0437', 'Sling of Giant Felling', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (sling)', 'Permanent', false, NULL, 'T1 Permanent', '{"BMT"}', 'See book for description.

Base Cost: 400 GP (plus 0.1 GP for Sling)
Crafting Cost: 200 GP (plus 0.1 GP for Sling), 10 DTP (Smithy)
Tool: Leatherworker''s Tools', NULL, 4370.0),
('9d9d62c7-c000-59b6-90b8-65a6235c0841', 'LOT_0438', 'Spell-Refueling Ring', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Ring', 'Permanent', false, NULL, 'T1 Permanent', '{"EFA"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 4380.0),
('b3a2c7a0-00eb-564b-b922-4aa2aa65fe59', 'LOT_0439', 'Spider''s Prey (HB) (any ranged weapon that lacks the thrown property)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any ranged weapon that lacks the thrown property)', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Weapon (any ranged weapon that lacks the thrown property), T1 (requires attunement)

This weapon is made of dark wood and black metal with a white design of spider webs all over the weapon. While holding this weapon, you can use a Bonus Action to speak a command word and cause the web design to fly off and attempt to ensnare a creature within 30 feet. The target must succeed on a DC 15 Dexterity saving throw or be Restrained by the webs. A creature Restrained by the webs can use an action on its turn to make a DC 15 Strength check to escape. Once used, this property can''t be used again until the next sunset.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tools: See Equipment (depends on weapon type)', NULL, 4390.0),
('f6e91167-f4f1-5fac-95b9-d22fd895a7a3', 'LOT_0440', 'Spies'' Murmur (pair of)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"GGR"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Tinker''s Tools', NULL, 4400.0),
('1ed05ddd-5394-533a-a7ce-1faafe75cd76', 'LOT_0441', 'Spiked Shield', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Armor (shield)', 'Permanent', false, NULL, 'T1 Permanent', '{"WttHC"}', 'See book for description.

Base Cost: 400 GP (plus 10 GP for Shield)
Crafting Cost: 200 GP (plus 10 GP for Shield), 10 DTP (Smithy)
Tool: Smith''s Tools', NULL, 4410.0),
('f51b584f-7bc6-5046-9958-0378e684d8a1', 'LOT_0442', 'Slippers of Spider Climbing', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Cobbler''s Tools', NULL, 4420.0),
('befee4a9-213b-54da-b1f9-822497f44e2d', 'LOT_0443', 'Staff of the Adder', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Staff', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP (plus 5 GP for Staff)
Crafting Cost: 200 GP (plus 5 GP for Staff), 10 DTP (Arcane Study, Sanctuary, or Sacristy)
Tool: Woodcarver''s Tools', NULL, 4430.0),
('49183b17-4b8f-5111-b27c-e110a45bce85', 'LOT_0444', 'Staff of Climbing Ivy', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Staff', 'Permanent', false, NULL, 'T1 Permanent', '{"HWT"}', 'See book for description.

Base Cost: 400 GP (plus 5 GP for Staff)
Crafting Cost: 200 GP (plus 5 GP for Staff), 10 DTP (Arcane Study, Sanctuary, or Sacristy)
Tool: Woodcarver''s Tools', NULL, 4440.0),
('d7ae7b7a-d062-5c27-9616-6d3e832d4ec9', 'LOT_0445', 'Staff of Life Overflowing (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Staff', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Staff, T1 (requires attunement by a spellcaster)

The staff has 7 charges and regains 1d6+1 expended charges daily at dawn. If you expend the last charge, roll a d20. On a 1, the staff disappears into motes of light, destroying it.

When you cast a spell that restores Hit Points to a single target while holding the staff, you can use your reaction to expend 1 charge to restore an additional amount of Hit Points to the target equal to 1d6 + your spellcasting ability modifier. When you cast a spell that restores Hit Points to two or more targets while holding the staff, you can use your reaction to expend 2 charges to restore an additional amount of Hit Points to the targets equal to 1d4 + your spellcasting ability modifier.

Base Cost: 400 GP (plus 5 GP for Staff)
Crafting Cost: 200 GP (plus 5 GP for Staff), 10 DTP (Arcane Study, Sanctuary, or Sacristy)
Tool: Woodcarver''s Tools', NULL, 4450.0),
('218c7785-f302-5ea8-87bc-31da373e917b', 'LOT_0446', 'Staff of the Ivory Claw', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Staff', 'Permanent', false, NULL, 'T1 Permanent', '{"EGW"}', 'See book for description.

Base Cost: 400 GP (plus 5 GP for Staff)
Crafting Cost: 200 GP (plus 5 GP for Staff), 10 DTP (Arcane Study, Sanctuary, or Sacristy)
Tool: Woodcarver''s Tools', NULL, 4460.0),
('59a01994-a310-53c2-a5ef-a910dbd7af87', 'LOT_0447', 'Staff of the Python', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Staff', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP (plus 5 GP for Staff)
Crafting Cost: 200 GP (plus 5 GP for Staff), 10 DTP (Arcane Study, Sanctuary, or Sacristy)
Tool: Woodcarver''s Tools', NULL, 4470.0),
('904175a3-075e-5575-a758-e4aabc1e3312', 'LOT_0448', 'Staff of Withering', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Staff', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP (plus 5 GP for Staff)
Crafting Cost: 200 GP (plus 5 GP for Staff), 10 DTP (Arcane Study, Sanctuary, or Sacristy)
Tool: Woodcarver''s Tools', NULL, 4480.0),
('cf03dca4-5752-55f5-8ecc-242e424cc4b7', 'LOT_0449', 'Strixhaven Primer (Lorehold, Prismari, Quandrix, Silverquill, or Witherbloom Primer)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"SCC"}', 'See book for description.

Base Cost: 400 GP (plus 25 GP for Book)
Crafting Cost: 200 GP (plus 25 GP for Book), 10 DTP (Workshop)
Tool: Leatherworker''s Tools', NULL, 4490.0),
('53bbe717-dd65-5338-8c4c-a6cae63ef540', 'LOT_0450', 'Stone of Good Luck', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Mason''s Tools', NULL, 4500.0),
('8281c91f-6a08-57df-9155-d8b1495e56de', 'LOT_0451', 'Sword Ring (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Ring', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Ring, T1 (requires attunement)

If you aren''t missing any Hit Points, you have a +1 bonus to your attack and damage rolls while wearing this ring.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Jeweler''s Tools', NULL, 4510.0),
('ca58413f-f394-549a-8d2b-3ecf430e59cc', 'LOT_0452', 'Tablets of Sending (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Wondrous item, T1 (requires attunement)

These obsidian tablets are found as a bonded pair and if one of the tablets is destroyed, the magic in both fades away. You can use an action while holding the tablet to write and transmit a message no longer than 25 words to appear on the other tablet. You can use this property three times before it can''t be used again until the next dawn. 

Additionally, you can use an action while holding the tablet to create a purely visual illusion to conceal what is written on the tablet to others that aren''t attuned to the tablet or its counterpart. A creature can discern what is written on the tablet with a DC 15 Intelligence (Investigation) check. Once you use this property, it can''t be used again until the next dawn.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Mason''s Tools', NULL, 4520.0),
('367aa6c6-f736-5e4a-9e77-5123e3fd71d8', 'LOT_0453', 'Tentacle Rod (2014)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Rod', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014"}', 'See book for description.

Base Cost: 400 GP (plus 10 GP for Rod)
Crafting Cost: 200 GP (plus 10 GP for Rod), 10 DTP (Arcane Study, Sanctuary, or Sacristy)
Tool: Woodcarver''s Tools', NULL, 4530.0),
('159a955e-9dad-5d9d-813f-73215f73ec72', 'LOT_0454', 'Trident of Fish Command', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (trident)', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP (plus 5 GP for Trident)
Crafting Cost: 200 GP (plus 5 GP for Trident), 10 DTP (Smithy)
Tool: Smith''s Tools', NULL, 4540.0),
('9cc748b2-9903-5bd1-88e5-3c9fe724f04e', 'LOT_0455', 'Troll-Hide Armor (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Armor (hide)', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Armor (hide), T1 (requires attunement)

This bundle of hide and leather tanned from Troll Skin and treated with heated stones imparts a troll’s regenerative effect upon its wearer, though one has to worry if there’s more to a troll than its skin in this armor. 

Regeneration. While wearing this armor, at the start of each of your turns, you regain 5 Hit Points if you have at least 1 Hit Point but no more than half of your Hit Points left.

Curse. This armor is cursed with the essence of a troll and become attuned to it extends the curse to you. Until the curse is broken with Remove Curse or similar magic, the armor bonds to your skin and can''t be removed from you. Whenever you take Fire damage while wearing the armor, until the end of your next turn, you can''t gain the benefit of the armor''s Regeneration property and you have Disadvantage on attack rolls and ability checks.

Base Cost: 400 GP (plus 10 GP for Hide Armor)
Crafting Cost: 200 GP (plus 10 GP for Hide Armor), 10 DTP (Smithy)
Tool: Leatherworker''s Tools', NULL, 4550.0),
('c76b37fa-46d6-5a2b-9d24-f3c9b260a809', 'LOT_0456', 'Vial of Thought Capture', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"AZfyT"}', 'See book for description.

Base Cost: 2000 GP (plus 1 GP for Vial)
Crafting Cost: 1000 GP (plus 1 GP for Vial), 30 DTP (Workshop)
Tool: Glassblower''s Tools', NULL, 4560.0),
('7da92f88-953c-505e-9304-0d3813742b4f', 'LOT_0457', 'Vicious Weapon (2014) (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any)', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014"}', 'See book for description.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 4570.0),
('3e2caa36-ecc9-5af7-bc57-6194756e06e9', 'LOT_0458', 'Ventilating Lungs', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"ERLW"}', 'See book for description.

Base Cost: 2000 GP
Crafting Cost: 1000 GP, 30 DTP (Workshop)
Tool: Tinker''s Tools', NULL, 4580.0),
('b20bd497-3845-512a-83e9-48c7f260cb24', 'LOT_0459', 'Wailing Maiden (HB) (any melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any melee weapon)', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Weapon (any melee weapon), T1

The image of a beautiful maiden is carved into this weapon and that seems to beckon towards any who view it. 

You can use a Bonus Action while holding the weapon to transform the maiden into the image of a shrieking banshee. For the next minute, the audible wail of a banshee can be heard emitting from the weapon out to a distance of 300 feet. While the weapon is wailing, it deals an extra 1d4 Psychic damage to any target it hits and any creature within 5 feet of the weapon that can hear the wail has Disadvantage on attack rolls and Wisdom (Perception) checks that rely on hearing. Once you use this property of the weapon, it can''t be used again until you finish a Short Rest.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 4590.0),
('f21ac713-09cc-5860-a899-68974a394261', 'LOT_0460', 'Wand of Enemy Detection', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wand', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014"}', 'See book for description.

Base Cost: 400 GP (plus 10 GP for Wand)
Crafting Cost: 200 GP (plus 10 GP for Wand), 10 DTP (Arcane Study, Sanctuary, or Sacristy)
Tool: Woodcarver''s Tools', NULL, 4600.0),
('21695a31-b9ab-54a2-b5ee-654a7ced9b42', 'LOT_0461', 'Wand of Entangle', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wand', 'Permanent', false, NULL, 'T1 Permanent', '{"TftYP"}', 'See book for description.

Base Cost: 400 GP (plus 10 GP for Wand)
Crafting Cost: 200 GP (plus 10 GP for Wand), 10 DTP (Arcane Study, Sanctuary, or Sacristy)
Tool: Woodcarver''s Tools', NULL, 4610.0),
('b0223b63-e36f-502d-a51c-db9a1b7e083f', 'LOT_0462', 'Wand of Magic Detection', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wand', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP (plus 10 GP for Wand)
Crafting Cost: 200 GP (plus 10 GP for Wand), 10 DTP (Arcane Study, Sanctuary, or Sacristy)
Tool: Woodcarver''s Tools', NULL, 4620.0),
('684466bd-8f4e-5ce9-b8ad-4445a0e00930', 'LOT_0463', 'Wand of Magic Missiles', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wand', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP (plus 10 GP for Wand)
Crafting Cost: 200 GP (plus 10 GP for Wand), 10 DTP (Arcane Study, Sanctuary, or Sacristy)
Tool: Woodcarver''s Tools', NULL, 4630.0),
('6e015c26-2b6d-5f13-b554-5ebc853e87fd', 'LOT_0464', 'Wand of Secrets', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wand', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP (plus 10 GP for Wand)
Crafting Cost: 200 GP (plus 10 GP for Wand), 10 DTP (Arcane Study, Sanctuary, or Sacristy)
Tool: Woodcarver''s Tools', NULL, 4640.0),
('867e7937-b8ce-5f6a-979a-870c592e5c2c', 'LOT_0465', '+1 Wand of the War Mage', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wand', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP (plus 10 GP for Wand)
Crafting Cost: 200 GP (plus 10 GP for Wand), 10 DTP (Arcane Study, Sanctuary, or Sacristy)
Tool: Woodcarver''s Tools', NULL, 4650.0),
('0eaba421-64e2-5359-8fd0-893e217f6d8f', 'LOT_0466', 'Lesser Wand of Web (Wand of Web (2024))', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wand', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2024"}', 'See book for description.

Base Cost: 400 GP (plus 10 GP for Wand)
Crafting Cost: 200 GP (plus 10 GP for Wand), 10 DTP (Arcane Study, Sanctuary, or Sacristy)
Tool: Woodcarver''s Tools', NULL, 4660.0),
('81d9dd6a-5415-5acd-9f7d-6d9a0af0b90f', 'LOT_0467', 'Wayfarer’s Boots', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"BGG"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Cobbler''s Tools', NULL, 4670.0),
('fe08415c-b04a-5948-b23e-eebf501ee8a3', 'LOT_0468', '+1 Weapon (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any)', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 4680.0),
('66169798-3646-5bd2-9afe-7c03ea10bfe6', 'LOT_0469', 'Weapon of Conflagration (Bow of Conflagration) (any ranged weapon that lacks the thrown property)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any ranged weapon that lacks the thrown property)', 'Permanent', false, NULL, 'T1 Permanent', '{"BMT"}', 'See book for description.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 4690.0),
('e91f83f7-8b84-5904-9dfd-c49c5a4ee92c', 'LOT_0470', 'Weapon of the Deep (HB) (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any)', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Weapon (any), T1 (requires attunement)

This magic weapon has been made from deep-sea coral corrupted by aberrant and eldritch energy from the ocean depths. While this weapon is on your person, you gain the following benefits:
- You can breathe water.
- You gain a swimming speed equal to your walking speed.

Corrupted Strike. A creature you hit with this weapon takes an extra 2d6 Psychic damage.

Corruption of the Deep. When you roll a 1 on an attack roll made with this weapon, you must make a DC 20 Charisma saving throw. On a failed save, you gain 1 level of Exhaustion.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 4700.0),
('56e13553-2da7-538b-b3d1-0f91d25d97c6', 'LOT_0471', 'Weapon of the Hunt (HB) (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any)', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Weapon (any), T1 (requires attunement)

You have a +1 bonus to attack and damage rolls made with this magic weapon.

You can use an action to target a creature that you can see within 300 feet of you. For the next hour, you deal an extra 2 damage whenever you hit a creature of that type and have Advantage on Wisdom (Perception) and Wisdom (Survival) checks to track creatures of that type as well as Advantage on Intelligence checks to recall information about them. Once this property of the weapon has been used, it can''t be used again until the next dawn.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 4710.0),
('5b6f3e4a-801b-5b55-9047-6d59e8c3336a', 'LOT_0472', 'Weapon of Life Stealing (Sword of Life Stealing) (any piercing or slashing melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any piercing or slashing melee weapon)', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 4720.0),
('ae2ba18d-de45-53cb-8217-3708fcb8c823', 'LOT_0473', 'Weapon of Melodies (Bow of Melodies) (any ranged weapon that lacks the thrown property)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any ranged weapon that lacks the thrown property)', 'Permanent', false, NULL, 'T1 Permanent', '{"BMT"}', 'See book for description.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 4730.0),
('108ba1b5-58fe-5f2a-aa96-a97f1e1738f4', 'LOT_0474', 'Weapon of the Rooted Hills (Staff of the Rooted Hills) (any bludgeoning melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any bludgeoning melee weapon)', 'Permanent', false, NULL, 'T1 Permanent', '{"BGG"}', 'See book for description.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 4740.0),
('856e5896-0cef-5996-be4e-f41008a78783', 'LOT_0475', 'Weapon of Runic Focus (Hammer of Runic Focus) (any melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any melee weapon)', 'Permanent', false, NULL, 'T1 Permanent', '{"BMT"}', 'See book for description.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 4750.0),
('0ed7227e-eeb9-5020-9752-92c1494160c2', 'LOT_0476', 'Weapon of Sharpness (Sword of Sharpness) (2014) (any piercing or slashing melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any piercing or slashing melee weapon)', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014"}', 'See book for description.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 4760.0),
('fcf27754-4385-5892-941c-8f9431a02c1d', 'LOT_0477', 'Weapon of Slaughter (HB) (any melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any melee weapon)', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Weapon (any melee weapon), T1

When you reduce a creature to 0 Hit Points with an attack made with this magic weapon, you can use a Bonus Action to move up to your Speed toward another enemy that you can see. Until the end of your next turn, your next attack with this weapon has Advantage.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 4770.0),
('5d615229-a1c6-57bb-8e23-cfa430b5d84a', 'LOT_0478', '+1 Weapon of Song (HB) (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any)', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Weapon (any), T1 (requires attunement by a bard)

This weapon resembles a musical instrument.

You have a +1 bonus to attack and damage rolls you make with this magic weapon and you can use it as a spellcasting focus.

You can use a Bonus Action while holding this weapon to expend a use of your Bardic Inspiration to gain a number of Temporary Hit Points equal to a roll of your Bardic Inspiration die. Additionally, until the start of your next turn after expending a use of your Bardic Inspiration in this way, you gain a bonus to any damage rolls you make while holding this weapon equal to your Charisma modifier.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 4780.0),
('f44b0f9b-7701-52a4-b815-d61b2db3f142', 'LOT_0479', 'Weapon of the Twins (HB) (any melee weapon with the light property)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any melee weapon with the light property)', 'Permanent', false, NULL, 'T1 Permanent', '{"HHB"}', 'Weapon (any melee weapon with the light property), T1 (requires attunement)

You have a +1 bonus to attack and damage rolls made with this magic weapon, which deals Cold damage instead of another damage type. While holding this magic weapon, you can use a Bonus Action to create an identical weapon in an empty hand except the created weapon is made of fire, it deals Fire damage instead of Cold damage, and it sheds bright light in a 10-foot radius and dim light for an additional 10 feet. The created weapon disappears if you no longer hold either weapon.  

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 4790.0),
('a3884151-3add-500a-936d-f5cf9ecc4d7d', 'LOT_0480', 'Weapon of Venom (Dagger of Venom) (any melee weapon with the light property)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any melee weapon with the light property)', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 4800.0),
('73ff2e97-cfd9-547d-b9b5-5c52f40d7797', 'LOT_0481', 'Weapon of Wounding (Sword of Wounding) (2014) (any piercing or slashing melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any piercing or slashing melee weapon)', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014"}', 'See book for description.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: 200 GP (plus cost of weapon), 10 DTP (Smithy)
Tool: See Equipment (depends on weapon type)', NULL, 4810.0),
('fef3c0c4-51f1-5928-b727-31c564476b99', 'LOT_0482', 'Wild Forest Shroud (Kagonesti Forest Shroud)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DSotDQ"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Weaver''s Tools', NULL, 4820.0),
('062bda10-4648-5a3b-8ad9-1a300a5898ed', 'LOT_0483', 'Wind Fan', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Tinker''s Tools', NULL, 4830.0),
('60f35c1d-396d-58f2-9747-3b9cff622c87', 'LOT_0484', '+1 Wraps of Unarmed Prowess', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Permanent', '{"BMT", "DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Leatherworker''s Tools', NULL, 4840.0),
('495196af-d940-54e1-8cb3-d95b44f117a9', 'LOT_0485', '+2 Ammunition (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Ammunition (any)', 'Consumable', false, NULL, 'T2 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 4850.0),
('d40ecf86-77a5-5a7c-a0b5-d47cfe019d65', 'LOT_0486', 'Arcane Battery', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Consumable', false, NULL, 'T2 Consumable', '{"NF"}', 'See book for description.', NULL, 4860.0),
('b2c152f3-d105-5b7b-bca3-52392bf0173c', 'LOT_0487', 'Arrow of Slaying', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Ammunition (any)', 'Consumable', false, NULL, 'T2 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 4870.0),
('808f1332-7919-53f9-a029-3f5f6acf6dc5', 'LOT_0488', 'beans of a Bag of Beans', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Consumable', false, NULL, 'T2 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 4880.0),
('c6010ce7-ace0-5c2d-841a-4e7edb7fad5f', 'LOT_0489', 'Bead of Force', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Consumable', false, NULL, 'T2 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 4890.0),
('0fc6f5b2-ccf5-5356-a16e-3734d126c285', 'LOT_0490', 'Black Sap', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Adventuring Gear', 'Consumable', false, NULL, 'T2 Consumable', '{"EGW"}', 'See book for description.', NULL, 4900.0),
('f14ed963-8c9d-5919-aaef-78703a2642e5', 'LOT_0491', 'Bloodseeker Ammunition', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Ammunition (any)', 'Consumable', false, NULL, 'T2 Consumable', '{"BMT"}', 'See book for description.', NULL, 4910.0),
('3b9d9465-afd5-55e1-8c9c-c4595463502a', 'LOT_0492', 'Chromatic Rose (any color)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Consumable', false, NULL, 'T2 Consumable', '{"WBTW"}', 'See book for description.', NULL, 4920.0),
('20dab3b8-80df-5ef6-9abf-112ac5ba726c', 'LOT_0493', 'Draught of Slime Curse Cure', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Potion', 'Consumable', false, NULL, 'T2 Consumable', '{"HWT"}', 'See book for description.', NULL, 4930.0),
('671d3131-0ae8-5b80-bbd3-420eb53b2879', 'LOT_0494', 'Dreamlily', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Adventuring gear', 'Consumable', false, NULL, 'T2 Consumable', '{"ERLW"}', 'See book for description.', NULL, 4940.0),
('f7945933-e41b-5f52-acd4-bb349cd1016a', 'LOT_0495', 'Elemental Gem (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Consumable', false, NULL, 'T2 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 4950.0),
('ed8b53e8-da4a-5acd-ab54-13910071e96f', 'LOT_0496', 'Ioun Stone of Absorption (2014)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Consumable', false, NULL, 'T2 Consumable', '{"DMG2014"}', 'See book for description.', NULL, 4960.0),
('644bfc2e-c4cc-5d91-b73b-7e1cc0ab32d1', 'LOT_0497', 'Manual of Flesh Golems', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Consumable', false, NULL, 'T2 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 4970.0),
('0065a920-eb7b-579f-aebf-f75a4fc634ff', 'LOT_0498', 'Mind Crystal (Careful, Distant, Empowered, Extended, or Subtle)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Consumable', false, NULL, 'T2 Consumable', '{"PBTSO"}', 'See book for description.', NULL, 4980.0),
('cd1f5adc-9dd3-58bd-b455-62aef93c4f76', 'LOT_0499', 'beads of Necklace of Fireballs', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Consumable', false, NULL, 'T2 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 4990.0),
('3490ef89-e3a7-5081-a0a9-d4527da10526', 'LOT_0500', 'pots of Nolzur''s Mediocre Pigments (Nolzur''s Marvelous Pigments (2024))', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Consumable', false, NULL, 'T2 Consumable', '{"DMG2024"}', 'See book for description.', NULL, 5000.0);

INSERT INTO public.ac_loot (
    id, check_id, name, category_id, tier_id, type, nature, is_dm_select, event_category, tier_display, source, description, notes_advice, display_order
) VALUES
('2a37614a-2e6e-570d-9dc0-fb2931fec88c', 'LOT_0501', 'Oil of Etherealness', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Potion', 'Consumable', false, NULL, 'T2 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 5010.0),
('53286203-c475-5f23-9d2c-ec33da7c3c3b', 'LOT_0502', 'Oil of Slaying (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Potion', 'Consumable', false, NULL, 'T2 Consumable', '{"HHB"}', 'Potion, T2

This magic oil has the properties of an Arrow of Slaying except that it is a potion instead of ammunition and can be applied to a melee weapon with a Bonus Action. If a creature of the kind or type associated with the oil takes damage from the coated melee weapon, the creature suffers the associated effect of an Arrow of Slaying. After the coated melee weapon deals this extra damage to a creature, the oil is expended and its magic fades.', NULL, 5020.0),
('73f0ed78-0ece-543d-91d2-9f97da9e8f7b', 'LOT_0503', 'Oil of Slipperiness', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Potion', 'Consumable', false, NULL, 'T2 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 5030.0),
('4cb7bfcd-06b0-580d-a3ca-2fc566adec9b', 'LOT_0504', 'bag of Portable Cannonballs', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Ammunition (firearm bullets)', 'Consumable', false, NULL, 'T2 Consumable', '{"VSS_PP"}', 'See book for description.', NULL, 5040.0),
('1b6772c4-7c85-5ca4-a4ad-bfbbc6dac438', 'LOT_0505', 'Potion of Aqueous Form', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Potion', 'Consumable', false, NULL, 'T2 Consumable', '{"MOT"}', 'See book for description.', NULL, 5050.0),
('87b1d0c7-7c85-5e03-9125-697f808b476b', 'LOT_0506', 'Potion of Clairvoyance', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Potion', 'Consumable', false, NULL, 'T2 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 5060.0),
('6be8183d-d3ea-5cb4-8633-f5354e5e8d77', 'LOT_0507', 'Potion of Fire Giant Strength', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Potion', 'Consumable', false, NULL, 'T2 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 5070.0),
('d3c44e12-0189-553c-bc5f-e67b15b27d63', 'LOT_0508', 'Potion of Flying', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Potion', 'Consumable', false, NULL, 'T2 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 5080.0),
('477d5b1e-f0ab-58e1-b0dc-5c3827da1fc7', 'LOT_0509', 'Potion of Frost Giant Strength', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Potion', 'Consumable', false, NULL, 'T2 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 5090.0),
('6c05d723-5d4a-598c-9b87-c5e226b0d718', 'LOT_0510', 'Potion of Gaseous Form', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Potion', 'Consumable', false, NULL, 'T2 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 5100.0),
('825c22c2-be64-5b58-b349-c7f3181f6f80', 'LOT_0511', 'Potion of Invulnerability', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Potion', 'Consumable', false, NULL, 'T2 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 5110.0),
('d73f33a8-57d8-5d51-85e3-84346c2337e6', 'LOT_0512', 'Potion of Longevity', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Potion', 'Consumable', false, NULL, 'T2 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 5120.0),
('4f175bf1-097c-52c8-b070-e93327f213d3', 'LOT_0513', 'Potion of Maximum Power', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Potion', 'Consumable', false, NULL, 'T2 Consumable', '{"EGW"}', 'See book for description.', NULL, 5130.0),
('15dba0bf-03ec-59ac-82e3-4b6da6d1ba17', 'LOT_0514', 'Potion of Mind Control (Beast)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Potion', 'Consumable', false, NULL, 'T2 Consumable', '{"TftYP"}', 'See book for description.', NULL, 5140.0),
('d28be0f9-6c5f-54a5-94f6-e5e9a13a3621', 'LOT_0515', 'Potion of Mind Control (Humanoid)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Potion', 'Consumable', false, NULL, 'T2 Consumable', '{"TftYP"}', 'See book for description.', NULL, 5150.0),
('066b73e3-0c46-542b-be46-1f3b7c724fa0', 'LOT_0516', 'Potion of Rest', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Potion', 'Consumable', false, NULL, 'T2 Consumable', '{"HWT"}', 'See book for description.', NULL, 5160.0),
('f87d91b2-ae02-54cb-8361-f1de80ce9f2c', 'LOT_0517', 'Potion of Speed', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Potion', 'Consumable', false, NULL, 'T2 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 5170.0),
('67cc588c-e981-57ce-926b-8ab42ee60249', 'LOT_0518', 'Potion of Stone Giant Strength', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Potion', 'Consumable', false, NULL, 'T2 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 5180.0),
('e9578206-7d12-500c-a540-26abfb111864', 'LOT_0519', 'Potion of Superior Healing', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Potion', 'Consumable', false, NULL, 'T2 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 5190.0),
('8a52e640-9032-56c9-89a3-efb30f3b90db', 'LOT_0520', 'Potion of Vitality', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Potion', 'Consumable', false, NULL, 'T2 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 5200.0),
('a4a63544-bb47-5d18-8d0c-b89b73e0d3d9', 'LOT_0521', 'Purple Worm Poison', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Poison', 'Consumable', false, NULL, 'T2 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 5210.0),
('518c1523-e083-5785-b9f7-2e5cf0c932f3', 'LOT_0522', 'Quaal''s Feather Token, Bird', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Consumable', false, NULL, 'T2 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 5220.0),
('43986358-1f1f-5a6c-ac31-d2fc81a34047', 'LOT_0523', 'Quaal''s Feather Token, Swan Boat', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Consumable', false, NULL, 'T2 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 5230.0),
('b03059f7-1bc1-5b72-939e-0a222e03b6ac', 'LOT_0524', 'Reincarnation Dust', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Consumable', false, NULL, 'T2 Consumable', '{"EGW"}', 'See book for description.', NULL, 5240.0),
('76d10a94-524f-59f5-82ce-593abf652070', 'LOT_0525', 'Ring of Temporal Salvation', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Ring', 'Consumable', false, NULL, 'T2 Consumable', '{"EGW"}', 'See book for description.', NULL, 5250.0),
('e24c30ae-bad0-5836-96f6-d0b3717fb574', 'LOT_0526', 'Robe of Useful Items', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Consumable', false, NULL, 'T2 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 5260.0),
('be8e5e23-7f13-5600-8ce0-080ae74259c6', 'LOT_0527', 'Scroll of Protection (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Scroll', 'Consumable', false, NULL, 'T2 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 5270.0),
('d33c1aa5-5400-5115-9abf-821b60d30f52', 'LOT_0528', 'Shatterstick', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Mundane', 'Consumable', false, NULL, 'T2 Consumable', '{"BGDIA"}', 'See book for description.', NULL, 5280.0),
('65d63110-baa8-5620-8dfc-cc6dd55b0dcd', 'LOT_0529', 'Shredder Grenade (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Adventuring gear', 'Consumable', false, NULL, 'T2 Consumable', '{"HHB"}', 'Adventuring gear, T2

As an action, you can throw this grenade at up to 60 feet away where it explodes. Each creature within 20 feet of an exploding shredder grenade must succeed on a DC 15 Dexterity saving throw or take 6d6 Slashing damage and have their Speed reduced to 0 until the end of their next turn. On a successful save, a creature takes half as much damage only.', NULL, 5290.0),
('342d7428-a90f-53c0-a446-63e713e8aeeb', 'LOT_0530', 'Siren''s Breath (HB) (any ammunition)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Ammunition (any)', 'Consumable', false, NULL, 'T2 Consumable', '{"HHB"}', 'Ammunition (any), T2

The tip of this ammunition is shaped like a heart and contains rose-hued, effervescent liquid stored inside. 

A creature hit by this ammunition must make a DC 15 Wisdom saving throw or become Charmed by you until the start of your next turn.', NULL, 5300.0),
('c6e2269c-0674-5dda-9ae4-dba91246293c', 'LOT_0531', 'Sovereign Glue (1 oz) and Universal Solvent', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Consumable', false, NULL, 'T2 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 5310.0),
('da803201-8b73-52c2-b541-7ad34fea3199', 'LOT_0532', 'Spell Scroll (Level 4)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Scroll', 'Consumable', false, NULL, 'T2 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 5320.0),
('cb85f7f2-52ac-5299-affd-8d2076eb4883', 'LOT_0533', 'Spell Scroll (Level 5)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Scroll', 'Consumable', false, NULL, 'T2 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 5330.0),
('b3cd7516-97c7-5b59-af6c-4946f9d25885', 'LOT_0534', 'Spellwrought Tattoo (Level 4)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item (tattoo)', 'Consumable', false, NULL, 'T2 Consumable', '{"TCE"}', 'See book for description.', NULL, 5340.0),
('b84dc7d8-aba2-5d34-abf5-0c5a89cd854c', 'LOT_0535', 'Spellwrought Tattoo (Level 5)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item (tattoo)', 'Consumable', false, NULL, 'T2 Consumable', '{"TCE"}', 'See book for description.', NULL, 5350.0),
('1a5ead41-87f2-5520-afd4-dab8e0f320a9', 'LOT_0536', 'Talon Tincture', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Potion', 'Consumable', false, NULL, 'T2 Consumable', '{"HWT"}', 'See book for description.', NULL, 5360.0),
('c0e4beaf-9e79-5395-83d9-4311a201702e', 'LOT_0537', 'Tangler Grenade', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Mundane', 'Consumable', false, NULL, 'T2 Consumable', '{"WDMM"}', 'See book for description.', NULL, 5370.0),
('bc28b428-2155-5a9c-9731-f6b91f3d973b', 'LOT_0538', 'Thessaltoxin', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Poison', 'Consumable', false, NULL, 'T2 Consumable', '{"IMR"}', 'See book for description.', NULL, 5380.0),
('0112cae7-1da1-5ce6-af2b-0d9d449710ca', 'LOT_0539', 'Thunder Grenade (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Adventuring gear', 'Consumable', false, NULL, 'T2 Consumable', '{"HHB"}', 'Adventuring gear, T2

As an action, you can throw this grenade a point up to 60 feet away. This grenade explodes in a thunderous blast that fills a 20-foot radius Sphere. Each creature in that area must make a DC 15 Dexterity saving throw. On a failed save, a creatures takes 18 (4d8) Thunder damage and is pushed 15 feet away from the point. On a successful save, a creature takes half as much damage only. 

In addition, unsecured objects that are entirely within the Sphere are pushed 15 feet away from the point, and a thunderous boom is audible within 300 feet of the point.', NULL, 5390.0),
('2a51d47f-faee-5209-bdaf-edeae15fe2d3', 'LOT_0540', 'Tranquilizer Needle (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Ammunition (Blowgun Needle)', 'Consumable', false, NULL, 'T2 Consumable', '{"HHB"}', 'Ammunition (Blowgun Needle), T2

This needle is tipped with magically enhanced poison designed to induce lethargy and unconsciousness. 

A creature hit by this ammunition must succeed on a DC 15 Constitution saving throw or have the Poisoned condition for 1 minute. The creature also has the Unconscious condition while Poisoned in this way as it is magically put to sleep. It wakes up if it takes damage or someone within 5 feet of it takes an action to shake it awake.', NULL, 5400.0),
('8467afda-2639-5237-8872-8a44b5acbdb7', 'LOT_0541', 'Vial of Curious Paint (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Potion', 'Consumable', false, NULL, 'T2 Consumable', '{"HHB"}', 'Potion, T2

This vial contains paint that comes in the muddy hues of mixed dark grey and purples. There’s a roiling, viscous quality to the liquid when you inspect the vial’s content closely.

When you take the Attack action, you can replace one of your attacks with throwing a Vial of Curious Paint.  Target one creature you can see within 20 feet of yourself.  The target must make a Constitution saving throw (DC 8 plus your Dexterity modifier and Proficiency Bonus).  The target takes 4d8 Necrotic damage and has the Blinded condition for 1 minute on a failed save, or half as much damage only on a successful save.  At the end of each of its turns, the target repeats the save, ending the effect on itself on a success.', NULL, 5410.0),
('aeadfb90-29f3-5518-b84c-ffc07e9c8f85', 'LOT_0542', 'Willowshade Oil', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Adventuring gear', 'Consumable', false, NULL, 'T2 Consumable', '{"EGW"}', 'See book for description.', NULL, 5420.0),
('8e3a8e4a-617e-58b1-b9f4-9cf040fc3e02', 'LOT_0543', 'Wyvern Poison', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Poison', 'Consumable', false, NULL, 'T2 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 5430.0),
('c2c731c4-1496-5d96-a309-4f97e62d0795', 'LOT_0544', 'Abracadabrus', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"IDRotF"}', 'See book for description.', NULL, 5440.0),
('df008fae-f2fd-5753-8ccc-5fda499baf44', 'LOT_0545', 'Absorbing Tattoo', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item (tattoo)', 'Permanent', false, NULL, 'T2 Permanent', '{"TCE"}', 'See book for description.', NULL, 5450.0),
('0f9574e8-a611-5adf-9788-2938442e1eec', 'LOT_0546', 'Alchemical Compendium', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"TCE"}', 'See book for description.', NULL, 5460.0),
('b642a24c-fc02-5858-bb4e-00789f9977e6', 'LOT_0547', '+1 All-Purpose Tool', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"TCE"}', 'See book for description.', NULL, 5470.0),
('41ad2495-6a65-550b-96e3-1bf85f5e699f', 'LOT_0548', '+1 Amulet of the Devout', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"TCE"}', 'See book for description.', NULL, 5480.0),
('377699e9-5df4-5ced-899a-c3d59880f0ab', 'LOT_0549', 'Amulet of Health', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 5490.0),
('f48ea07d-5da0-5bf5-b499-407fc6553d68', 'LOT_0550', 'Ankheg Plate Armor (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Armor (plate armor)', 'Permanent', false, NULL, 'T2 Permanent', '{"HHB"}', 'Armor (plate armor), T2

This bright green suit of plate armor was magically forged from the chitin of an ankheg as opposed to metal. It weighs only 30 pounds and its Strength score requirement to avoid movement penalties is 13. While you wear this armor, you have resistance to Acid damage and the armor is immune to effects that affect metal (such as the Heat Metal spell).', NULL, 5500.0),
('2a1e3f37-913b-565f-8e60-e440d155b4b6', 'LOT_0551', 'Arcane Cannon', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"EGW"}', 'See book for description.', NULL, 5510.0),
('7391209c-dcef-5055-94e9-f5cb5c0db99b', 'LOT_0552', '+1 Arcane Grimoire', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"TCE"}', 'See book for description.', NULL, 5520.0),
('80aba512-8739-5f73-81d9-8c8244d52b4e', 'LOT_0553', '+1 Armor (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Armor (any)', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 5530.0),
('0c55748e-bd6c-5ef0-9e0e-a07c9dabe25b', 'LOT_0554', 'Armor of the Deep (HB) (any medium or heavy armor except hide)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Armor (any medium or heavy armor except hide)', 'Permanent', false, NULL, 'T2 Permanent', '{"HHB"}', 'Armor (any medium or heavy armor except hide), T2 (requires attunement)

This set of armor has been made from deep-sea coral corrupted by aberrant and eldritch energy from the ocean depths. While wearing the armor, you gain the following benefits:
- You have resistance to Psychic damage.
- You can breathe water.
- You gain a swimming speed equal to your walking speed.

Corruption of the Deep. When you roll a 1 on a saving throw while wearing this armor, you must make a DC 15 Charisma saving throw. On a failed save, you gain 1 level of exhaustion.', NULL, 5540.0),
('de9c7e01-6fdd-5955-9613-657cb7e55b3c', 'LOT_0555', 'Armor of Safeguarding (any medium or heavy armor)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Armor (any medium or heavy armor)', 'Permanent', false, NULL, 'T2 Permanent', '{"BGG"}', 'See book for description.', NULL, 5550.0),
('d846e731-0c70-54b2-bf40-0d127a41e3ec', 'LOT_0556', 'Arrow-Catching Shield', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Armor (shield)', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 5560.0),
('5dd188fb-e5b1-56ff-b0dc-a0f2de25addf', 'LOT_0557', 'Astral Shard', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"TCE"}', 'See book for description.', NULL, 5570.0),
('a9207b13-c037-58ed-b284-2625d702ba6f', 'LOT_0558', 'Astromancy Archive', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"TCE"}', 'See book for description.', NULL, 5580.0),
('fda499fa-784c-5abd-ac40-14c761d7aac7', 'LOT_0559', 'Atlas of Endless Horizons', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"TCE"}', 'See book for description.', NULL, 5590.0),
('d4cb0a7e-67de-5a82-8672-4a956c425ac1', 'LOT_0560', 'Baleful Talon (any melee weapon with the light property)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any melee weapon with the light property)', 'Permanent', false, NULL, 'T2 Permanent', '{"BMT"}', 'See book for description.', NULL, 5600.0),
('a312a254-43d1-57d6-8395-8552add3dd4d', 'LOT_0561', 'Band of Fruitfulness', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"HWT"}', 'See book for description.', NULL, 5610.0),
('2ddc30b1-c3d8-533c-9279-9681a505b6c7', 'LOT_0562', 'Banner of the Krig Rune', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"SKT"}', 'See book for description.', NULL, 5620.0),
('467332db-1be6-5e34-a84a-c7a682a4b2de', 'LOT_0563', 'Barrier Tattoo (Rare)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item (tattoo)', 'Permanent', false, NULL, 'T2 Permanent', '{"TCE"}', 'See book for description.', NULL, 5630.0),
('1fa3f00b-bb99-5e8e-b01e-3dd3bd89eaab', 'LOT_0564', 'Battering Shield', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Armor (shield)', 'Permanent', false, NULL, 'T2 Permanent', '{"EGW"}', 'See book for description.', NULL, 5640.0),
('bf6cf5ff-2094-5c0a-af6e-7b30f2f3fe0c', 'LOT_0565', 'Battle Standard of Infernal Power', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"BGDIA"}', 'See book for description.', NULL, 5650.0),
('4a39c9ce-27fb-537b-90e5-8b32eeb9b961', 'LOT_0566', 'Belt of Dwarvenkind', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 5660.0),
('b8d4479b-5d1f-5cac-805a-a3cb64518028', 'LOT_0567', 'Belt of Elvenkind (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"HHB"}', 'Wondrous item, T2 (requires attunement)

While wearing this belt, you gain the following benefits: 
- Your Dexterity score increases by 2, to a maximum of 20.
- You have Advantage on Charisma (checks) made to interact with elves.

In addition, while attuned to the belt, you have a 50 percent change each day at dawn of shedding all body hair. If you aren''t an elf, you gain the following additional benefits while wearing the belt:
- You have advantage on saving throws against being Charmed, and magic can’t put you to sleep.
- You have Darkvision out to a range of 60 feet.
- You can speak, read, and write Elvish.', NULL, 5670.0),
('3337ef91-a4f4-5cd3-972d-fea1ff822a25', 'LOT_0568', 'Belt of the Firbolg (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"HHB"}', 'Wondrous item, T2 (requires attunement)

While wearing this belt, you gain the following benefits:
- Your Wisdom score increases by 2, to a maximum of 20.
- You have Advantage on Charisma (Persuasion) checks made to interact with firbolgs.

In addition, while attuned to the belt, you have a 50 percent chance each day at dawn of growing by one inch, provided you are under 8 feet tall. You cannot grow more than one foot as a result of this property.

If you aren''t a firbolg, you gain the following additional benefits while wearing the belt:
- You can use a Bonus Action to magically become Invisible until the start of your next turn or until you attack, deal damage, or force someone to make a saving throw. Once this property is used, it can''t be used again until you finish a Short or Long Rest.
- You can communicate in a limited manner with Beasts, Plants, and vegetation. They can understand the meaning of your words, though you have no special ability to understand them in return. You have Advantage on all Charisma checks you make to influence them.', NULL, 5680.0),
('337ab092-d905-5e50-9b64-29e4349fa2f6', 'LOT_0569', 'Belt of Hill Giant Strength', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 5690.0),
('658654e6-14f1-53c5-926c-c7a0e99f95dc', 'LOT_0570', 'Bloodshed Weapon (Bloodshed Blade) (any melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any melee weapon)', 'Permanent', false, NULL, 'T2 Permanent', '{"BGG"}', 'See book for description.', NULL, 5700.0),
('6a966e3a-d0d8-5a47-9549-4e60b7d107bc', 'LOT_0571', 'Bloodthirster (Bloodaxe) (any melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any melee weapon)', 'Permanent', false, NULL, 'T2 Permanent', '{"EGW"}', 'See book for description.', NULL, 5710.0),
('8fb1c2e9-232a-5542-8e76-64d2a48cf6df', 'LOT_0572', '+1 Bloodwell Vial', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"TCE"}', 'See book for description.', NULL, 5720.0),
('e085112b-3c91-5148-a0c8-9d294402ab69', 'LOT_0573', 'Bobbing Lily Pad', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"WBTW"}', 'See book for description.', NULL, 5730.0),
('42ea6dea-edea-562c-a14d-1976b771d528', 'LOT_0574', 'Boogie Woogie Bells (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"HHB"}', 'Wondrous item, T2 (Requires Attunement)

This set of bells has 6 charges and regains 1d4+2 expended charges daily at dawn.

If a creature that you can see within 30 feet becomes the target of an attack roll while the bells are on your person and you have at least two hands free, you can take a Reaction to expend 1 charge from the bells and clap your hands. If the creature is willing, both you and the creature teleport, swapping places, and you become the target of the attack instead.  If the attack roll hits you and the attacker is within 5 feet of yourself, you can make a melee weapon attack against the attacker as part of this same Reaction.', NULL, 5740.0),
('a0fc81f2-bdbd-548e-b074-83df76d357af', 'LOT_0575', 'Boots of Levitation', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 5750.0),
('af7e0c34-6521-5173-bcdf-d67f27ae3f69', 'LOT_0576', 'Boots of Speed', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 5760.0),
('78623f27-97ae-5158-bea6-4ed637482000', 'LOT_0577', 'Boots of the Winterlands', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 5770.0),
('c6597187-5927-5d91-aa52-0b09a86ae792', 'LOT_0578', 'Bracers of Archery', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 5780.0),
('4c7488a6-8f35-546b-80a9-79bfe8044d47', 'LOT_0579', 'Bracers of Celerity', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"PBTSO"}', 'See book for description.', NULL, 5790.0),
('e5657084-b59b-5fea-857e-eac49aa84adc', 'LOT_0580', 'Bracers of Defense', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 5800.0),
('8a799cd9-0982-50a1-a4ce-3349779dc54a', 'LOT_0581', 'Bracer of Flying Daggers', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"WDH"}', 'See book for description.', NULL, 5810.0),
('0ffc0923-64ca-56a4-bc33-c6849bef8322', 'LOT_0582', 'Brooch of Shielding', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 5820.0),
('552d3836-83b9-54e2-b5bd-2705c6197411', 'LOT_0583', 'Lesser Broom of Flying (Broom of Flying (2024))', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 5830.0),
('43bdce6a-def7-564d-a37f-cbde4559592f', 'LOT_0584', 'Butcher’s Bib', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"EGW"}', 'See book for description.', NULL, 5840.0),
('e3eed999-bd1d-5cfc-8ba1-a0cd957b36de', 'LOT_0585', 'Cape of the Mountebank', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 5850.0),
('aa3fbf14-5252-59f8-a74c-d236bcdb02d8', 'LOT_0586', 'Cauldron of Plenty', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"IDRotF"}', 'See book for description.', NULL, 5860.0),
('57e398fd-38b9-586a-a63c-5b39cf702ac3', 'LOT_0587', 'Charm of Plant Command', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"GoS"}', 'See book for description.', NULL, 5870.0),
('46c8ee9f-e546-5582-a8c4-a20fad2a6829', 'LOT_0588', 'Claws of the Umber Hulk', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"PotA"}', 'See book for description.', NULL, 5880.0),
('6c7c3d59-31c3-54dc-9197-6ba659df6762', 'LOT_0589', 'Claw of the Wyrm Rune', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"SKT"}', 'See book for description.', NULL, 5890.0),
('84fb2e82-e13a-58a9-95f0-8d2ee3afe73d', 'LOT_0590', 'Cloak of Arachnida', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 5900.0),
('f2020513-1e3b-50c7-bcee-5dff23d80e7b', 'LOT_0591', 'Cloak of the Bat', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 5910.0),
('7b24d5e0-83fe-5950-a5cb-c0d4574cac4f', 'LOT_0592', 'Cloak of Displacement', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 5920.0),
('2cecb430-2f16-5f0a-9089-4fce0e128906', 'LOT_0593', 'Cloak of the Manta Ray (2014)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014"}', 'See book for description.', NULL, 5930.0),
('68ee14f0-e6ca-5b46-8e7a-80f59e6b81e2', 'LOT_0594', 'Cloak of Protection', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 5940.0),
('4f370f12-b9e2-5a71-98bc-b7b6592e858e', 'LOT_0595', 'Cloak of Spines', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"HWT"}', 'See book for description.', NULL, 5950.0),
('c1010ba4-69e1-52d7-a8ca-f54a6dd0dbe7', 'LOT_0596', 'Coat of Arms (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"HHB"}', 'Wondrous Item, T2 (requires attunement)

This coat is worn around the shoulders like a cloak, with two sleeves that hang loosely from either side. While wearing this coat, you can use an action to cause the sleeves to animate. The sleeves remain animated until you are no longer wearing the coat, become Incapacitated or die, use a Bonus Action to end the effect, or your attunement to this coat ends.

Each animated sleeve acts as secondary arms, in addition to your primary pair of arms. The animated sleeves can be used in all the ways your primary arms and hands can be used, except a sleeve can only lift a number of pounds equal to your Strength score and has a reach of 5 feet. 

Each sleeve can be attacked while it is animate. Each animated sleeve is a magical object with 20 Hit Points, an AC of 11 + your Dexterity modifier, immunity to Poison and Psychic damage, and resistance to all other damage. As long as it is not destroyed, a sleeve regains all of its lost Hit Points when it reverts to its inanimate form. A destroyed sleeve cannot be repaired or animated again and if both sleeves of the coat are destroyed, the coat becomes nonmagical.', NULL, 5960.0),
('4c912357-b9a0-511e-8dcc-b9455eb606bd', 'LOT_0597', 'Corrosive Crackshot (HB) (any ranged weapon that lacks the thrown property)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any ranged weapon that lacks the thrown property)', 'Permanent', false, NULL, 'T2 Permanent', '{"HHB"}', 'Weapon (any ranged weapon that lacks the thrown property), T2 (requires attunement)

This weapon is tinted a dark sickly green, with the words "Juiblex sends his regards!" carved into the surface in Abyssal.

You gain a +1 bonus to attack and damage rolls made with this magic weapon. Ammunition fired from this weapon deals an extra 1d4 Acid damage to targets you hit. When you attack a creature with this weapon and roll a 20 on the attack roll, an Ochre Jelly appears in the nearest unoccupied space on the ground next to the target. The Ochre Jelly is hostile to all creatures except you and spends its turns pursuing and attacking the nearest non-oozes to the best of its ability.

The Ochre Jelly remains until it is destroyed or until 1 hour passes after which point it disappears. After this property has been used, another Ochre Jelly cannot be summoned again in this way until you finish a Short or Long Rest.', NULL, 5970.0),
('51fd8dce-a4fb-5f38-889d-85fa5027a2ca', 'LOT_0598', 'Crown of Whirling Comets', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"BMT"}', 'See book for description.', NULL, 5980.0),
('790d1914-84f1-572a-aa7e-3bf95d0bfc43', 'LOT_0599', 'Crown of the Wrath Bringer', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"BGG"}', 'See book for description.', NULL, 5990.0),
('f9b20788-bb12-5a28-87cd-be5f81defe2d', 'LOT_0600', 'Crystalline Chronicle', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"TCE"}', 'See book for description.', NULL, 6000.0);

INSERT INTO public.ac_loot (
    id, check_id, name, category_id, tier_id, type, nature, is_dm_select, event_category, tier_display, source, description, notes_advice, display_order
) VALUES
('226bb27a-dca2-5f6f-945b-69d9b5ce88a2', 'LOT_0601', 'Crystal Weapon (Crystal Blade) (any melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any melee weapon)', 'Permanent', false, NULL, 'T2 Permanent', '{"FTD"}', 'See book for description.', NULL, 6010.0),
('02503340-2339-5d62-84ba-5f3f8f7de019', 'LOT_0602', 'Lesser Cube of Force (Cube of Force (2024))', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 6020.0),
('fb0e017c-7587-5ffa-814b-9cc145370097', 'LOT_0603', 'Lesser Daern''s Instant Fortress (Daern''s Instant Fortress (2024))', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 6030.0),
('6c0eb511-7945-54b4-a4c3-aeb6cb9d4dca', 'LOT_0604', 'Dancing Weapon (Dancing Sword) (any melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any melee weapon)', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014"}', 'See book for description.', NULL, 6040.0),
('53959eb2-7294-5a27-bbd4-d4a47e035f80', 'LOT_0605', 'Dark Hand (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"HHB"}', 'Wondrous item, T2 (requires attunement)

This glove is dyed red and black, its colors constantly shifting unnaturally while you wear it. You can use a Bonus Action to transform the Dark Hand into a gauntlet, a shield, or back into a glove.

- Gauntlet: The gauntlet is a simple melee weapon you are proficient with that deals 1d4 Bludgeoning damage on a hit. When you hit with an attack with this weapon, the target takes an extra 1d6 Necrotic damage. At the end of each of your turns, you gain a number of Temporary Hit Points equal to half the Necrotic damage dealt by this gauntlet (rounded down).

- Shield: The shield weighs nothing and you have resistance to Necrotic damage while holding the shield.', NULL, 6050.0),
('d41c00e4-549d-507e-8fd7-010f6e0ce2d0', 'LOT_0606', 'Dazzling Weapon', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (Any Simple or Martial)', 'Permanent', false, NULL, 'T2 Permanent', '{"EFA"}', 'See book for description.', NULL, 6060.0),
('7f9a5010-6659-50d1-8611-2a6ce3244066', 'LOT_0607', 'Decanter of Endless Water', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 6070.0),
('afefc0c1-9eaf-5bc2-a2e1-cea7499a0aae', 'LOT_0608', 'Deck of Divining (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"HHB"}', 'Wondrous Item, T2

Each of the cards within the deck bears a sigil on its reverse, the sigil of the seer who crafted it.  Imbued into the cards are fragments of the powers of that seer, which you can draw on to limited capacity.

This deck is comprised of 18 cards: 6 Silver, 6 Green, and 6 Pink, each of which bears a rune representing a spell. You can take a Magic action to randomly determine the spell you cast by rolling on the table of your choice. When the spell from the card is cast, the card returns to the deck. Once this property is used, it can''t be used again until the next dawn.

Detection Spell. On the face of the Silver cards are Detection Spells.
d6 Spell
1 - Detect Evil and Good
2 - Detect Magic
3 - Detect Poison and Disease
4 - See Invisibility
5 - Locate Creature
6 - Commune with Nature

Communication Spell.  On the face of the Green cards are Communication Spells.
d6 Spell
1 - Comprehend Languages
2 - Speak with Animals
3 - Sending
4 - Tongues
5 - Contact Other Plane
6 - Rary''s Telepathic Bond

Foresight Spell. On the face of the Pink cards are Foresight spells.
d6 Spell
1 - Identify
2 - Augury
3 - Borrowed Knowledge
4 - Clairvoyance
5 - Arcane Eye
6 - Legend Lore', NULL, 6080.0),
('ea64074e-6e83-5bd8-b488-2055421afc2b', 'LOT_0609', 'Deck of Oracles', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"BMT"}', 'See book for description.', NULL, 6090.0),
('cac6c08b-8215-5ca5-b7de-d0eae813bb0a', 'LOT_0610', 'Deck of Wild Cards', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"BMT"}', 'See book for description.', NULL, 6100.0),
('69a83e9f-0c32-50a2-b030-269c4173eab7', 'LOT_0611', 'Delver’s Claws', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"BGG"}', 'See book for description.', NULL, 6110.0),
('1db8d89b-2338-59a2-8efb-ba671e235fb4', 'LOT_0612', 'Demon Armor', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Armor (any armor)', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 6120.0),
('c9966f86-253a-505e-9b20-8c9e48a10209', 'LOT_0613', 'Devotee’s Censer', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (flail)', 'Permanent', false, NULL, 'T2 Permanent', '{"TCE"}', 'See book for description.', NULL, 6130.0),
('f5bc29f5-8b5e-5711-9c6c-c928da0d7da6', 'LOT_0614', 'Dimensional Shackles', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 6140.0),
('f954bdae-67b2-59c2-951a-39b07b486d72', 'LOT_0615', 'Donjon’s Sundering Sphere', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"BMT"}', 'See book for description.', NULL, 6150.0),
('90d692f8-cba6-5d17-84ab-8e1e37a25e93', 'LOT_0616', 'Dragonguard (any armor)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Armor (any)', 'Permanent', false, NULL, 'T2 Permanent', '{"PBTSO"}', 'See book for description.', NULL, 6160.0),
('86e3855c-31c6-5ae4-b4c1-14bfb0362047', 'LOT_0617', '+2 Dragonhide Belt', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"FTD"}', 'See book for description.', NULL, 6170.0),
('eb7699b2-2d28-506f-a5bc-4f4e902ca6c7', 'LOT_0618', 'Dragonmaw Shield (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Armor (Shield)', 'Permanent', false, NULL, 'T2 Permanent', '{"HHB"}', 'Armor (Shield), T2 (Requires Attunement)

This shield has a hinged lower portion with the appearance of a dragon''s roaring mouth, including a hollow opening.

Devour. The shield''s maw contains a fiery forge within. The interior of the shield''s opening is an extradimensional space that is considerably larger than its outside dimensions—roughly 2 feet square. The extradimensional space can hold up to 500 pounds, not exceeding a volume of 64 cubic feet. None of the contents of the extradimensional space add to the shield''s weight. 

The extradimensional space continually roils with the heat of an open forge: a creature or object that can fit through the opening takes 2d10 Fire damage the first time it enters the extradimensional space and for each minute it spends inside the extradimensional space thereafter. A creature or object reduced to 0 Hit Points in this way is reduced to ash or slag respectively. 

You can take a Utilize action to pour out the contents of the extradimensional space. You can also take a Utilize action to retrieve a creature or object inside the extradimensional space but you take 1d10 Fire damage for doing so. A creature inside the extradimensional space can take an action to leave it. 

Gnash. The shield''s maw can unleash scalding flames to retaliate against those it defends against. When a creature misses you with a melee attack roll, you can take a Reaction to force the attacker to make a DC 15 Dexterity saving throw or take 1d10 Fire damage. If the attacker used a manufactured weapon made of metal, wood, or a flammable material with its missed attack and took any of this damage, it has Disadvantage on attack rolls made with that weapon until the start of its next turn.', NULL, 6180.0),
('d890dff9-8cd3-5df9-9d60-5d945cc3a390', 'LOT_0619', 'Dragon Scale Armor (Dragon Scale Mail, any dragon color) (any medium or heavy armor except hide)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Armor (any medium or heavy armor except hide)', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 6190.0),
('a47141ab-4eb6-5c3b-8011-8d7dc596a702', 'LOT_0620', 'Dragon Slayer (any weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any weapon)', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 6200.0),
('4186ab43-31ce-53a8-8191-deac7ccc6f45', 'LOT_0621', 'Duplicitous Manuscript', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"TCE"}', 'See book for description.', NULL, 6210.0),
('64089b4f-3622-5693-bee3-25bc14d06464', 'LOT_0622', 'Eagle Whistle', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"TftYP"}', 'See book for description.', NULL, 6220.0),
('70fba86d-427a-59f7-8f7c-4dc77dd08b08', 'LOT_0623', 'Eldritch Staff', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Staff', 'Permanent', false, NULL, 'T2 Permanent', '{"WBTW"}', 'See book for description.', NULL, 6230.0),
('6a9dbd31-0189-5d6e-b4bd-43a7145524a0', 'LOT_0624', 'Elemental Essence Shard (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"TCE"}', 'See book for description.', NULL, 6240.0),
('c640423f-a1ea-5f85-abbc-be0f49b01cef', 'LOT_0625', 'Elven Chain (chain shirt or chain mail)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Armor (chain shirt or chain mail)', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 6250.0),
('f21e8ca5-4ef1-524c-9633-5c3cccb994db', 'LOT_0626', 'Energy Bow (any ranged weapon that lacks the thrown property)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any ranged weapon that lacks the thrown property)', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 6260.0),
('241ca294-81a1-5615-9258-96cac738b579', 'LOT_0627', 'Enspelled Armor (Level 2) (any armor)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Armor (any)', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 6270.0),
('17a1b796-bed0-5760-8f36-af951dee321a', 'LOT_0628', 'Enspelled Armor (Level 3) (any armor)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Armor (any)', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 6280.0),
('7cc43e2b-02cf-50ac-8a91-ee06f0d38781', 'LOT_0629', 'Enspelled Staff (Level 2)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Staff', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 6290.0),
('d0877c23-c6cf-5b31-aedc-f46fc67714ac', 'LOT_0630', 'Enspelled Staff (Level 3)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Staff', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 6300.0),
('3b7fbbea-5bfe-5f10-b08a-284cd7246f95', 'LOT_0631', 'Enspelled Weapon (Level 2) (any weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any)', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 6310.0),
('efe34a30-362c-566d-b40c-ab1dafcf5036', 'LOT_0632', 'Enspelled Weapon (Level 3) (any weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any)', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 6320.0),
('77e83539-acf8-5d33-82ac-3fb07e8a79cb', 'LOT_0633', 'Executioner''s Blade (Executioner''s Axe) (any slashing melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any slashing melee weapon)', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 6330.0),
('14a5fd5e-8b95-5513-bac8-c724e0c79457', 'LOT_0634', 'Eye of Starsight', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"HWT"}', 'See book for description.', NULL, 6340.0),
('aafbbb3f-8646-5651-bd3f-430f2f2466fc', 'LOT_0635', 'Fangs of Guile', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"HWT"}', 'See book for description.', NULL, 6350.0),
('ae36f354-441a-5f9f-bb10-cd214aa5e7f3', 'LOT_0636', 'Far Realm Shard', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"TCE"}', 'See book for description.', NULL, 6360.0),
('0820c930-bbce-5205-a2da-154b1215b8a4', 'LOT_0637', '+1 Fate Dealer''s Deck', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"BMT"}', 'See book for description.', NULL, 6370.0),
('8a6ac8ae-2484-5b79-9cf4-c6733a1cafc7', 'LOT_0638', 'Feathered Helm (Corvum)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"HWCS"}', 'See book for description.', NULL, 6380.0),
('7dbded67-883a-5383-8837-c949bdfcd8d7', 'LOT_0639', 'Feywrought Armor (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Armor (any)', 'Permanent', false, NULL, 'T2 Permanent', '{"BMT"}', 'See book for description.', NULL, 6390.0),
('adcdb85a-9c05-5fea-b1e5-dc39b5f74889', 'LOT_0640', 'Figurine of Wondrous Power, Bronze Griffon', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 6400.0),
('2904ae74-22d6-5d0c-8dac-2de70171f5d9', 'LOT_0641', 'Figurine of Wondrous Power, Ebony Fly', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 6410.0),
('5c67e3b7-1c66-5c0d-8d13-5514bbb10a1a', 'LOT_0642', 'Figurine of Wondrous Power, Golden Lions', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 6420.0),
('b2f56b9f-9e7f-51c0-9cd8-6eaf6aa6aadc', 'LOT_0643', 'Figurine of Wondrous Power, Ivory Goats', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 6430.0),
('294ed83a-a131-5941-a8ad-0891bd4aecae', 'LOT_0644', 'Figurine of Wondrous Power, Marble Elephant', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 6440.0),
('2e2f5caa-5048-58d7-882c-db79adfe6328', 'LOT_0645', 'Figurine of Wondrous Power, Onyx Dog', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 6450.0),
('672b09de-e2c5-5163-956a-80ed351e4746', 'LOT_0646', 'Figurine of Wondrous Power, Serpentine Owl', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 6460.0),
('d7f59103-bff6-586a-a524-0e5fbc5f8b56', 'LOT_0647', 'Flame of Ingenuity', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"HWT"}', 'See book for description.', NULL, 6470.0),
('53a0e818-1bc6-5c8d-9ecb-e8531393f948', 'LOT_0648', 'Flame Tongue (any melee weapon that lacks the thrown property)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any melee weapon that lacks the thrown property)', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 6480.0),
('b6784d7d-d9f4-5d56-9f60-39f2deffdfe8', 'LOT_0649', 'Flying Chariot', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"MOT"}', 'See book for description.', NULL, 6490.0),
('4bc4a6dc-06b5-5c80-b201-18a6700e4142', 'LOT_0650', 'Folding Boat', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 6500.0),
('39756b6b-7b7f-5517-a014-046ccbabbf13', 'LOT_0651', 'Fool''s Weapon (Fool''s Blade) (any melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any melee weapon)', 'Permanent', false, NULL, 'T2 Permanent', '{"BMT"}', 'See book for description.', NULL, 6510.0),
('863f1f6b-03dc-54b9-8e28-e69969e32ce9', 'LOT_0652', 'Foresight Weapon (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any)', 'Permanent', false, NULL, 'T2 Permanent', '{"WEL"}', 'See book for description.', NULL, 6520.0),
('9363d1d8-87c5-59de-b6a0-e93fede439fe', 'LOT_0653', 'Frost Brand (any melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any melee weapon)', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 6530.0),
('6ec920d8-2e0a-5b57-8457-f3619124152c', 'LOT_0654', 'Fulguris (HB) (any melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any melee weapon)', 'Permanent', false, NULL, 'T2 Permanent', '{"HHB"}', 'Weapon (any melee weapon), T2 (requires attunement)

You have a +1 bonus to attack and damage rolls made with this magic weapon. When you hit with an attack using this magic weapon, the target takes an extra 1d6 Lightning damage. 

Additionally, this weapon has the Thrown property if it normally doesn''t, with a normal range of 20 feet and a long range of 60 feet. Whenever you make a ranged attack with this weapon, it returns to your hand immediately after the attack hits or misses.', NULL, 6540.0),
('1021b896-2340-5f26-bbea-d158990b37cb', 'LOT_0655', 'Fulminating Treatise', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"TCE"}', 'See book for description.', NULL, 6550.0),
('dfba0dfe-bd37-5cd0-82a8-a55fe4604c8f', 'LOT_0656', 'Gavel of the Venn Rune', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"SKT"}', 'See book for description.', NULL, 6560.0),
('5ee48e78-d784-5d3d-95fc-17fdd03f6b99', 'LOT_0657', 'Gauntlets of Ogre Power', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 6570.0),
('66aafe14-83e0-54cc-8a40-03d3c0a36472', 'LOT_0658', '+2 Gauntlets of the Dragon (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"HHB"}', 'Wondrous item, T2

This pair of lightweight gauntlets is in the shape of a dragon''s head. While wearing these gauntlets, you have a +2 bonus to attack and damage rolls you make with Unarmed Strikes and natural weapons and such attacks are considered to be magical. The type of damage dealt by your Unarmed Strikes and natural weapons while wearing these gauntlets depends on the type of the dragon the gauntlets were modelled after as per the table below.

Dragon Color            Damage Type
Black / Copper            Acid
White / Silver              Cold
Red / Brass / Gold      Fire
Blue / Bronze              Lightning
Green                         Poison
Amethyst                    Force
Crystal                        Radiant
Emerald                      Psychic
Sapphire                     Thunder
Topaz                          Necrotic', NULL, 6580.0),
('eff8cfef-00bb-50e1-863c-06a65394dd4d', 'LOT_0659', 'Gem of Seeing', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 6590.0),
('2b1e066d-0b29-5db0-b59b-41d9fbed545c', 'LOT_0660', 'Ghostgrip Gauntlets (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"HHB"}', 'Wondrous item, T2

While wearing these gauntlets, you ignore a creature''s immunity to the Grappled or Restrained condition when attempting to or maintaining a grapple.', NULL, 6600.0),
('61322130-90ad-5e48-8494-933db0ad7a8a', 'LOT_0661', 'Ghost Step Tattoo', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item (tattoo)', 'Permanent', false, NULL, 'T2 Permanent', '{"TCE"}', 'See book for description.', NULL, 6610.0),
('9e8bb2fc-9c21-5d45-bbab-c491545a4351', 'LOT_0662', 'Giant Slayer (any melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any melee weapon)', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 6620.0),
('c9824a52-517f-5d93-aee2-a9449dc1f4fe', 'LOT_0663', 'Glamoured Studded Leather', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Armor (studded leather)', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 6630.0),
('3f02209a-50c9-5267-b64d-30a52bbc3310', 'LOT_0664', 'Glimmering Moonshot (Glimmering Moonbow) (any ranged weapon that lacks the thrown property)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any ranged weapon that lacks the thrown property)', 'Permanent', false, NULL, 'T2 Permanent', '{"BMT"}', 'See book for description.', NULL, 6640.0),
('b4c53f7a-df83-5506-8b79-e5c10db75078', 'LOT_0665', 'Gloomwrought Armor (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Armor (any)', 'Permanent', false, NULL, 'T2 Permanent', '{"BMT"}', 'See book for description.', NULL, 6650.0),
('80c00a1f-7275-5656-8ce5-67a8ae2e5bb4', 'LOT_0666', 'Haemstrike (HB) (any bludgeoning melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any bludgeoning melee weapon)', 'Permanent', false, NULL, 'T2 Permanent', '{"HHB"}', 'Weapon (any bludgeoning melee weapon), T2

You have a +2 bonus to attack and damage rolls made with this magic weapon against targets made of metal or wearing metal armor. 

This weapon has 4 charges and regains 1d4 charges daily at dawn.

Attraction. While holding this weapon, you can use a Bonus Action to expend 1 charge to target one Medium or smaller creature or an object weighing less than 300 pounds that is not being worn or carried. The target must succeed on a DC 13 Strength saving throw or be pulled 15 feet towards you, with a target made of metal or wearing metal armor making this saving throw with disadvantage.', NULL, 6660.0),
('f3e64274-8e99-5e99-910b-1c3f20f2fb89', 'LOT_0667', 'Hat of Many Spells', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 6670.0),
('3aa7b6e5-d285-5e7a-8543-b40307ea5279', 'LOT_0668', 'Headband of Intellect', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 6680.0),
('e887c604-111a-533f-8369-3d8569bfbde7', 'LOT_0669', 'Heart Weaver''s Primer', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"TCE"}', 'See book for description.', NULL, 6690.0),
('08b22671-8778-559a-8030-e8970a129f59', 'LOT_0670', 'Heward''s Handy Haversack', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 6700.0),
('534d32af-2f19-5057-8548-4c0552e01937', 'LOT_0671', 'Hizagkuur Armor (HB) (any Medium or Heavy armor except Hide)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Armor (any Medium or Heavy armor except Hide)', 'Permanent', false, NULL, 'T2 Permanent', '{"HHB"}', 'Armor (any Medium or Heavy armor except Hide), T2

This armor is made of Hizagkuur, a rare silvery gray metal made from ore in the Underdark that is refined by complex processes and often enchanted by dwarven priests of the Mordinsamman to resist all magic and ensorcellment.

This armor is nonmagical and cannot be targeted by spells or other magical effects.

When you are hit by a spell attack or fail a saving throw against a spell or other magical effect, you can take a Reaction to reflect some of the magic in a 15-foot Emanation originating from you. Each creature in the area must make a DC 15 Dexterity saving throw or take 3d8 Force damage.', NULL, 6710.0),
('797ba41c-7f85-5a17-9138-d91e6cd3fc4a', 'LOT_0672', 'Hizagkuur Weapon (HB) (any Melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any Melee weapon)', 'Permanent', false, NULL, 'T2 Permanent', '{"HHB"}', 'Weapon (any Melee weapon), T2

This weapon is made of Hizagkuur, a rare silvery gray metal made from ore in the Underdark that is refined by complex processes and often enchanted by dwarven priests of the Mordinsamman to resist all magic and ensorcellment.

This weapon is nonmagical and cannot be targeted by spells or other magical effects.

When you take damage from a spell or other magical effect while wielding this weapon, you can take a Reaction to reduce the total damage by an amount equal to 1d10 plus your Dexterity modifier. If this reduces the damage to 0, you suffer none of the additional effects of the spell or magical effect that would have damaged you.', NULL, 6720.0),
('55e6e106-ae76-5808-a59e-ed08acfbdfc5', 'LOT_0673', 'Horn of Valhalla, Silver', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 6730.0),
('35fd1d0e-5c3b-55a7-a3cf-bec814b6b3b2', 'LOT_0674', 'Howell’s Handled Mirror of Displacement (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Armor (shield)', 'Permanent', false, NULL, 'T2 Permanent', '{"HHB"}', 'Armor (shield), T2

This shield is simply a large mirror, its sides and back reinforced with metal to keep it sturdy. The shield''s reflective surface is unable to be scratched or tarnished as it constantly shimmers and warps, showing no image but a starry silvery backdrop with eddies of light.

The shield has 3 charges, and it regains 1d3 expended charges daily at dawn. When you successfully shove a creature prone while wielding the shield, you can expend 1 charge to force the target to make a DC 13 Charisma saving throw. On a failed save, the target vanishes from the current plane of existence and is trapped in a harmless demiplane until the end of your next turn. While the target is trapped, they can be seen on the shield''s reflective surface. When the target reappears, they can appear in an unoccupied space of their choice within 10 feet of the shield or the nearest unoccupied space otherwise.', NULL, 6740.0),
('01f4df39-93fd-54a8-8879-2ceb41b7125b', 'LOT_0675', 'Indra Deus (HB) (any ranged weapon that lacks the thrown property)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any ranged weapon that lacks the thrown property)', 'Permanent', false, NULL, 'T2 Permanent', '{"HHB"}', 'Weapon (any ranged weapon that lacks the thrown property), T2 (requires attunement)

This weapon is wrought from black oak and runs with blue streaks of arcane magic. The weapon crackles and flares with azure lightning when readied and which trails every shot that is fired.

You have a +1 bonus to attack and damage rolls made with this magic weapon. When you hit with a ranged attack roll using this magic weapon, the target takes an extra 1d6 Lightning damage. 

When you fire this weapon, you can speak its command word to cause the fired ammunition to transform into a bolt of lightning, forming a line 5 feet wide that extends out from you to a target within this weapon''s maximum range. Each creature in the line excluding you and the target must make a DC 15 Dexterity saving throw, taking 5d6 Lightning damage on a failed save and half as much damage on a successful one. The lightning bolt turns back into ammunition when it reaches the target. Make a ranged weapon attack against the target. On a hit, the target takes damage from the attack plus 5d6 Lightning damage. This property can''t be used again until the next dawn.', NULL, 6750.0),
('9240834d-1fab-5f17-8cf3-016300347f0d', 'LOT_0676', 'Ingot of the Skold Rune', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"SKT"}', 'See book for description.', NULL, 6760.0),
('8d408b57-a499-5d51-b229-1269e7f4caa5', 'LOT_0677', 'Instrument of the Bards, Canaith Mandolin', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 6770.0),
('39373b8b-cb11-5fee-8437-e7cd431b54ba', 'LOT_0678', 'Instrument of the Bards, Cli Lyre', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 6780.0),
('1f1dcbc2-6251-533f-b9ca-3befb20f722a', 'LOT_0679', 'Interrogator’s Weapon (HB) (any melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any melee weapon)', 'Permanent', false, NULL, 'T2 Permanent', '{"HHB"}', 'Weapon (any melee weapon), T2 (requires attunement)

This weapon has 5 charges and regains 1d4 + 1 expended charges daily at dawn. You have a +1 bonus to attack and damage rolls made with this magic weapon. 

Once per turn when you hit a creature with this magic weapon, you can expend 1 charge to deal an extra 2d6 Psychic damage and force the target to make a DC 15 Wisdom saving throw or be Stunned until the end of your next turn.', NULL, 6790.0),
('9ebdab80-3ecc-563b-a622-0be5460607cc', 'LOT_0680', 'Ioun Stone of Protection', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 6800.0),
('8037d3e5-7655-520e-a490-06f8445e8084', 'LOT_0681', 'Ioun Stone of Reserve', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 6810.0),
('b02ab7d0-1d61-5911-befa-21519038b101', 'LOT_0682', 'Iron Bands of Bilarro', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 6820.0),
('2e46e7a6-2b3d-54d5-b2b9-c9d4920106c0', 'LOT_0683', 'Knave’s Eye Patch', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"WDH"}', 'See book for description.', NULL, 6830.0),
('f9826583-1d6f-507a-8e8f-3b459b695488', 'LOT_0684', 'Lantern of Revealing', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 6840.0),
('c2637ea3-673b-57bc-96e5-7eeddb8cf36f', 'LOT_0685', 'Last Stand Armor (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Armor (any)', 'Permanent', false, NULL, 'T2 Permanent', '{"EGW"}', 'See book for description.', NULL, 6850.0),
('19338b3f-2a17-5146-ae76-a376ed726018', 'LOT_0686', 'Leonora''s Throne of Indolence', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"VSS_PP"}', 'See book for description.', NULL, 6860.0),
('74048a3a-e1c4-5c8d-9c0a-15788ad272e3', 'LOT_0687', 'Libram of Souls and Flesh', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"TCE"}', 'See book for description.', NULL, 6870.0),
('77107587-f43b-579f-9a22-b6c6125a8fbb', 'LOT_0688', 'Lifewell Tattoo', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item (tattoo)', 'Permanent', false, NULL, 'T2 Permanent', '{"TCE"}', 'See book for description.', NULL, 6880.0),
('59c23c8c-98aa-521c-aae1-f11b4047cc34', 'LOT_0689', 'Lightbringer (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon', 'Permanent', false, NULL, 'T2 Permanent', '{"HHB"}', 'Weapon (mace), T2

This mace is shaped like a sunburst and made of solid brass and is associated with deities of light, such as Lathander. The mace sheds bright light in a 20-foot radius and dim light for an additional 20 feet. 

You have a +1 bonus to attack and damage rolls made with this magic weapon, and when you hit an Undead creature with this magic weapon, the target takes an extra 1d6 Radiant damage.', NULL, 6890.0),
('b4c99c73-edb1-509e-b142-066a458ece4a', 'LOT_0690', 'Luck Weapon (Luck Blade) (any melee weapon) (no charges)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any melee weapon)', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'This weapon lacks the Wish property. See book for description.', NULL, 6900.0),
('b83f5e6b-a37b-5261-b7c3-68d3c02cd133', 'LOT_0691', 'Luminous Warpick (any melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any melee weapon)', 'Permanent', false, NULL, 'T2 Permanent', '{"PBTSO"}', 'See book for description.', NULL, 6910.0),
('c96c010a-c777-505e-b076-5d2ed4d12041', 'LOT_0692', 'Luxon Beacon', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"EGW"}', 'See book for description.', NULL, 6920.0),
('d20ec745-efe9-56ba-8095-3dcbf0bf9581', 'LOT_0693', 'Lyre of Building', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"TCE"}', 'See book for description.', NULL, 6930.0),
('768d916c-61f6-5ffc-857f-cded2a1b1f11', 'LOT_0694', 'Mace of Disruption', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (mace)', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 6940.0),
('2f8bd5a8-65ef-53ab-bb71-e03a2977caa2', 'LOT_0695', 'Mace of Smiting', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (mace)', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 6950.0),
('4f9c795c-8189-5c0e-beb6-f7d079bba068', 'LOT_0696', 'Mace of Terror', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (mace)', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 6960.0),
('27b027b0-5456-592a-b625-ad3fcf313d03', 'LOT_0697', 'Macuahuitl (any melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any melee weapon)', 'Permanent', false, NULL, 'T2 Permanent', '{"TftYP"}', 'See book for description.', NULL, 6970.0),
('b53b490f-2b7f-5636-8a40-1853d78c0c41', 'LOT_0698', 'Mechanical Wonder (Gyrocopter)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"FRAIF"}', 'See book for description.', NULL, 6980.0),
('dbfe20f1-befb-5892-bb91-b288e431f420', 'LOT_0699', 'Mimir', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"SATO"}', 'See book for description.', NULL, 6990.0),
('5b4d4107-0bde-57e3-a6a5-350eba28d330', 'LOT_0700', 'Mirror of the Past', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"TftYP"}', 'See book for description.', NULL, 7000.0);

INSERT INTO public.ac_loot (
    id, check_id, name, category_id, tier_id, type, nature, is_dm_select, event_category, tier_display, source, description, notes_advice, display_order
) VALUES
('a9d7aac0-1c28-522a-b851-86c215a5a7b4', 'LOT_0701', 'Mirror of Reflected Pasts', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DSotDQ"}', 'See book for description.', NULL, 7010.0),
('f4f28628-7f7c-5f7c-92fd-22096da47767', 'LOT_0702', 'Mizzium Armor (any medium or heavy armor except hide)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Armor (any medium or heavy armor except hide)', 'Permanent', false, NULL, 'T2 Permanent', '{"GGR"}', 'See book for description.', NULL, 7020.0),
('a8f91b56-0734-5733-b2ce-15cede82b605', 'LOT_0703', 'Mizzium Mortar', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"GGR"}', 'See book for description.', NULL, 7030.0),
('4efa2fbd-ca23-5b00-957e-e7d6f54f8eb7', 'LOT_0704', '+1 Moon Sickle', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (sickle)', 'Permanent', false, NULL, 'T2 Permanent', '{"TCE"}', 'See book for description.', NULL, 7040.0),
('52db4b1a-aa4a-51b7-b381-fad20e8f3bcb', 'LOT_0705', 'Mythallar Cloak', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"NF"}', 'See book for description.', NULL, 7050.0),
('aab52146-8cbe-5f1b-bbc6-a72b8662b2dc', 'LOT_0706', 'Night Caller', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"TftYP"}', 'See book for description.', NULL, 7060.0),
('be854c36-3823-5c73-9743-ce7ee2316e4e', 'LOT_0707', 'Nimbus Coronet', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"BGG"}', 'See book for description.', NULL, 7070.0),
('40a8f38d-8ee7-5baa-b819-d0f7652b981c', 'LOT_0708', 'Nine Lives Stealer (fully charged) (any slashing melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any slashing melee weapon)', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 7080.0),
('0a45b6dd-3dc2-53e6-93e9-72268d3cb1ef', 'LOT_0709', 'Oathbow (any ranged weapon that lacks the thrown property)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any ranged weapon that lacks the thrown property)', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014"}', 'See book for description.', NULL, 7090.0),
('4954b9a1-0133-50a4-bc37-dccd7d04b9f4', 'LOT_0710', 'Opal of the Ild Rune', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"SKT"}', 'See book for description.', NULL, 7100.0),
('2f13fc7e-42e8-5bbd-a86b-a343c8ddda9f', 'LOT_0711', 'Orb of Skoraeus', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"BGG"}', 'See book for description.', NULL, 7110.0),
('3c320037-369f-5ed2-8edb-402c1d04022d', 'LOT_0712', 'Orb of the Stein Rune', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"SKT"}', 'See book for description.', NULL, 7120.0),
('6eaea721-75c5-550c-b347-8cc8b2828e50', 'LOT_0713', 'Outer Essence Shard (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"TCE"}', 'See book for description.', NULL, 7130.0),
('7d260f79-364d-59ff-9e1b-fdbf4d75a6cc', 'LOT_0714', 'Pariah’s Shield', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Armor (shield)', 'Permanent', false, NULL, 'T2 Permanent', '{"GGR"}', 'See book for description.', NULL, 7140.0),
('5d7dad5f-4acf-55fb-88e6-10764f783df4', 'LOT_0715', 'Pathfinder''s Pebble', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"HWT"}', 'See book for description.', NULL, 7150.0),
('bd74d718-2311-5480-8276-96d2cf688806', 'LOT_0716', 'Periapt of Health (2014)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014"}', 'See book for description.', NULL, 7160.0),
('d93bd4e0-6605-5d5b-a01a-035c2bcade90', 'LOT_0717', 'Phoenix Armor (HB) (any medium or heavy armor except hide)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Armor (any medium or heavy armor except hide)', 'Permanent', false, NULL, 'T2 Permanent', '{"HHB"}', 'Armor (any medium or heavy armor except hide), T2 (requires attunement)

While wearing this armor, you have resistance to Fire damage. Additionally, if you are reduced to 0 Hit Points while wearing this armor, you can use your reaction to instead drop to 1 Hit Point and move up to your Speed without provoking Opportunity Attacks and make one melee weapon attack with Advantage. Once you use this property, it can''t be used again until the next dawn.', NULL, 7170.0),
('041f6905-6580-5231-9b94-4f1a25db637d', 'LOT_0718', 'Pipes of Haunting', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 7180.0),
('6a77312d-7e44-57ef-9298-41bfa873aa05', 'LOT_0719', 'Planecaller’s Codex', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"TCE"}', 'See book for description.', NULL, 7190.0),
('fca9d14b-c955-58b6-a94a-1ada3eb4fffb', 'LOT_0720', 'Portable Hole', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 7200.0),
('311260ff-01a6-53a2-869a-cd7da35b6f0b', 'LOT_0721', 'Prayer Bead, Favor', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'Bead of a Necklace of Prayer Beads. See book for description.', NULL, 7210.0),
('8fa23223-fff0-5c0e-a09d-1a2f39e8524a', 'LOT_0722', 'Lesser Prayer Bead, Summons (Prayer Bead, Summons (2024))', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2024"}', 'Bead of a Necklace of Prayer Beads. See book for description.', NULL, 7220.0),
('a8dc8cc0-4b60-5759-a156-8ed81cbc706c', 'LOT_0723', 'Prehistoric Figurine of Wondrous Power, Carnelian Triceratops', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"BGG"}', 'See book for description.', NULL, 7230.0),
('892595ce-b91e-5499-be43-d35dd00dcae7', 'LOT_0724', 'Prehistoric Figurine of Wondrous Power, Kyanite Pteranodon', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"BGG"}', 'See book for description.', NULL, 7240.0),
('24491248-1c96-5585-b3b3-07b8fbc12b28', 'LOT_0725', 'Prehistoric Figurine of Wondrous Power, Pyrite Plesiosaurus', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"BGG"}', 'See book for description.', NULL, 7250.0),
('1cd6ad1b-eab7-535a-a665-6981157696ba', 'LOT_0726', 'Protective Verses', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"TCE"}', 'See book for description.', NULL, 7260.0),
('99936234-6ecf-5e4b-be93-5a268e7e3ab8', 'LOT_0727', 'Quarterstaff of the Acrobat', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (quarterstaff)', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 7270.0),
('4e416b0e-ce71-5cbd-8be3-c104f9a8a963', 'LOT_0728', 'Reaper''s Scream (any melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any melee weapon)', 'Permanent', false, NULL, 'T2 Permanent', '{"BGG"}', 'See book for description.', NULL, 7280.0),
('843484a0-ba09-5ec2-a493-3ad55c8d9324', 'LOT_0729', 'Repulsion Shield', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Armor (Shield)', 'Permanent', false, NULL, 'T2 Permanent', '{"EFA"}', 'See book for description.', NULL, 7290.0),
('50e33d6a-59f4-5b90-86c7-9589ab5fd4a0', 'LOT_0730', '+2 Returning Weapon (HB) (Any Simple or Martial with the Thrown Property)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (Any Simple or Martial with the Thrown Property)', 'Permanent', false, NULL, 'T2 Permanent', '{"HHB"}', 'Weapon (Any Simple or Martial with the Thrown Property), T2

This weapon has the properties of a Returning Weapon except its bonus to attack and damage rolls is +2.', NULL, 7300.0),
('b10b3899-3562-518f-8c7c-47bdf5d4a786', 'LOT_0731', '+1 Rhythm-Maker''s Drum', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"TCE"}', 'See book for description.', NULL, 7310.0),
('28711af4-9ed9-5882-8017-e89ba9f553ec', 'LOT_0732', 'Ring of Amity', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Ring', 'Permanent', false, NULL, 'T2 Permanent', '{"BGG"}', 'See book for description.', NULL, 7320.0),
('ba2a7e2b-23c9-5ec9-b3de-1e09552770ce', 'LOT_0733', 'Ring of Animal Influence', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Ring', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 7330.0),
('5f178ce1-2d04-574c-a8ba-880a38c001a7', 'LOT_0734', 'Rings of Arbitration (HB) (pair of)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Ring', 'Permanent', false, NULL, 'T2 Permanent', '{"HHB"}', 'Ring, T2 (requires attunement)

These rings come in matching pairs as golden rings set with a heart-shaped ruby.

While you and another creature wear and are attuned to the matching rings, you both gain the following benefits while within 100 feet of each other:
- You have Resistance to all damage, and each time you take damage, the bearer of the matching ring takes the same amount of damage, which can''t be reduced or prevented in any way.
- Whenever you regain Hit Points from a spell or other magical effect, half of those Hit Points are transferred to the bearer of the matching ring.
- Having 0 Hit Points doesn''t cause you to fall Unconscious. You must still make Death Saving Throws, and you suffer the normal effects of taking damage while at 0 Hit Points. You fall Unconscious and are Stable upon achieving three successful Death Saving Throws and you die if you fail three Death Saving Throws. The ruby in the matching ring grows dark if you die.
- You can see the bearer of the matching ring through magical and nonmagical darkness as a glowing outline. 

Curse. This item is cursed. Attuning to it extends the curse to you until you are targeted by a Remove Curse spell or similar magic or until either you or the bearer of the matching ring dies. As long as you remained cursed, you remain attuned to the ring and are unwilling to part from it or take it off.', NULL, 7340.0),
('2dd66f2d-d69a-50fc-81ce-e703d4c22bdd', 'LOT_0735', 'Ring of Corrupted Fury (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Ring', 'Permanent', false, NULL, 'T2 Permanent', '{"HHB"}', 'Ring, T2 (requires attunement)

This ring has been made from deep-sea coral corrupted by aberrant and eldritch energy from the ocean depths. While wearing the ring, you gain the following benefits:
- You can breathe water.
- You gain a swimming speed equal to your walking speed.

Corrupted Rage. While wearing the ring, you can use a Bonus Action to gain the following benefits for the next minute or until  you die or become Incapacitated:
- You have Advantage on Strength checks and Strength saving throws.
- When you hit with an attack, you can add your Proficiency Bonus to the damage roll.
- Difficult Terrain doesn''t cost you extra movement, and you are immune to the Paralyzed and Restrained conditions.

You can''t use this property of the ring again until you finish a Long Rest.

Corruption of the Deep. When you use the Corrupted Rage property of the ring, you must make a DC 20 Charisma saving throw. On a failed save, you gain 1 level of exhaustion.', NULL, 7350.0),
('4a06b2cc-26e2-5be8-97b8-4c5950837b4a', 'LOT_0736', 'Ring of Evasion', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Ring', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 7360.0),
('9274a6d8-2010-59ea-ab5a-2b4f074944fd', 'LOT_0737', 'Ring of Free Action', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Ring', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 7370.0),
('4335d9a6-ed21-52f7-b0da-d6ac40b0a6f2', 'LOT_0738', 'Ring of Invisibility (2014)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Ring', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014"}', 'See book for description.', NULL, 7380.0),
('61c93fb1-60ea-5a08-89aa-a158a1c251ed', 'LOT_0739', 'Ring of Protection', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Ring', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 7390.0),
('96435f8a-a1a0-5e5e-9d49-5a3ad6ee57ab', 'LOT_0740', 'Ring of Resistance (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Ring', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014"}', 'See book for description.', NULL, 7400.0),
('de5ccf25-407f-5dd9-803c-da2748afc531', 'LOT_0741', 'Ring of Shooting Stars', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Ring', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 7410.0),
('56aef3c4-f167-526a-b749-dd775422b327', 'LOT_0742', 'Ring of Spell Storing', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Ring', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 7420.0),
('d6f639e7-32c2-571f-b14d-0e498b2eb43d', 'LOT_0743', 'Ring of Spell Turning (2014)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Ring', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014"}', 'See book for description.', NULL, 7430.0),
('6f8bb9f4-31fe-5f78-b886-2c61c11466ab', 'LOT_0744', 'Ring of Swimming', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Ring', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 7440.0),
('602790f7-517a-59fb-9b45-66fcbf8a5612', 'LOT_0745', 'Ring of Telekinesis (2014)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Ring', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014"}', 'See book for description.', NULL, 7450.0),
('f3778523-514b-5b08-ba01-bfc6645cad89', 'LOT_0746', 'Ring of Warmth', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Ring', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 7460.0),
('62a01672-6224-5700-8bba-111aad4f0303', 'LOT_0747', 'Ring of Water Walking', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Ring', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 7470.0),
('5f7e1f9a-094a-5000-9c87-5b2b846b85ec', 'LOT_0748', 'Robe of Eyes', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 7480.0),
('fc0a4b73-ac26-5b91-a1d5-410df8b68b98', 'LOT_0749', 'Robe of Resistance (HB) (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"HHB"}', 'Wondrous item, T2 (requires attunement)

You have resistance to one type of damage while you wear this robe. The DM chooses the type or determines it randomly from the options below.

d10        Damage Type
1            Acid
2            Cold
3            Fire
4            Force
5            Lightning
6            Necrotic
7            Poison
8            Psychic
9            Radiant
10          Thunder', NULL, 7490.0),
('43e23257-e658-52e2-9f91-e384240cbd66', 'LOT_0750', 'Robe of Scintillating Colors', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 7500.0),
('94dc5f51-d8c5-5369-ac5d-c1a318397222', 'LOT_0751', 'Rod of Rulership', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Rod', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 7510.0),
('d972c284-3b17-5957-9bab-9346cbe283ef', 'LOT_0752', '+1 Rod of the Pact Keeper', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Rod', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 7520.0),
('3877bfe6-8a2d-5d91-bf31-6ac51772bf53', 'LOT_0753', 'Rogue''s Mantle', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"BMT"}', 'See book for description.', NULL, 7530.0),
('6f748a01-6041-5941-a831-05f8c4619752', 'LOT_0754', 'Rope of Entanglement', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 7540.0),
('1e05d036-7aec-5b3d-ae8b-18dae83dfdd3', 'LOT_0755', 'Sage''s Signet (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Ring', 'Permanent', false, NULL, 'T2 Permanent', '{"BMT"}', 'See book for description.', NULL, 7550.0),
('66a02843-6bd2-5875-90fd-488d4c3a3d15', 'LOT_0756', 'Sanctum Amulet', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"BGG"}', 'See book for description.', NULL, 7560.0),
('b2d26cec-a485-573b-b19d-6b92452b3543', 'LOT_0757', 'Scarab of Protection (2014)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014"}', 'See book for description.', NULL, 7570.0),
('7ec43a47-e6e3-5700-988e-9ed19ef2f674', 'LOT_0758', 'Scimitar of Speed', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (scimitar)', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 7580.0),
('3837e038-e903-598f-8968-bd127de72bd5', 'LOT_0759', 'Scissors of Shadow Snipping', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"WBTW"}', 'See book for description.', NULL, 7590.0),
('78e5a272-ff07-5c3d-bb16-fce7c9189ab3', 'LOT_0760', 'Sentinel Shield', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Armor (shield)', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 7600.0),
('bb4b02ce-4926-5687-8f09-71a8297a6605', 'LOT_0761', 'Serpent''s Fang (any piercing or slashing melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any piercing or slashing melee weapon)', 'Permanent', false, NULL, 'T2 Permanent', '{"CM"}', 'See book for description.', NULL, 7610.0),
('4d774d50-b474-580b-8c31-fb7b91e60db5', 'LOT_0762', 'Serpent Scale Armor', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Armor (scale mail)', 'Permanent', false, NULL, 'T2 Permanent', '{"CM"}', 'See book for description.', NULL, 7620.0),
('0244dfb2-9e0a-557d-9925-e245528e9052', 'LOT_0763', 'Shadowfell Brand Tattoo', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item (tattoo)', 'Permanent', false, NULL, 'T2 Permanent', '{"TCE"}', 'See book for description.', NULL, 7630.0),
('4f34fe1e-4ec4-5932-a789-20e384e4fda2', 'LOT_0764', 'Shadowfell Shard', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"TCE"}', 'See book for description.', NULL, 7640.0),
('3210bfc6-8456-5439-8aa0-cc67ab2cc311', 'LOT_0765', 'Shard of the Ise Rune', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"SKT"}', 'See book for description.', NULL, 7650.0),
('671704c7-79ce-5f55-b6d5-67f78aa911a1', 'LOT_0766', '+1 Shield', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Armor (shield)', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 7660.0),
('3e1882d9-58dc-5b54-9d0d-ad5ed22e712b', 'LOT_0767', 'Shield of the Deep (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Armor (shield)', 'Permanent', false, NULL, 'T2 Permanent', '{"HHB"}', 'Armor (shield), T2 (requires attunement)

This shield has been made from deep-sea coral corrupted by aberrant and eldritch energy from the ocean depths. While this shield is on your person, you gain the following benefits:
- You have resistance to Psychic damage.
- You can breathe water.
- You gain a swimming speed equal to your walking speed.

Psychic Reflection. When you take Psychic damage while holding the shield, you can use your Reaction to choose another creature you can see within 30 feet of you. That creature takes the Psychic damage you would have taken instead.

Corruption of the Deep. When you use the Psychic Reflection property of the shield, you must make a DC 20 Charisma saving throw. On a failed save, you gain 1 level of exhaustion.', NULL, 7670.0),
('a11c06af-c607-5e97-aae6-04cbd5bd02ff', 'LOT_0768', 'Speaking Stone (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"HHB"}', 'Wondrous item, T2

This crystalline stone is inscribed with a unique sequence of arcane symbols. A spellcaster can touch the stone and use an action to cast the Sending spell from it, targeting any other speaking stone whose location or unique sequence of symbols is known to the user. A creature within 5 feet of the stone hears the message as if they were the target.', NULL, 7680.0),
('7e660cd1-0e46-52e7-ba5c-b38f0e9ffe7e', 'LOT_0769', 'Spellguard Shield', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Armor (shield)', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 7690.0),
('cc0b345e-4906-5856-80c1-5c777da97946', 'LOT_0770', 'Spider Staff', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Staff', 'Permanent', false, NULL, 'T2 Permanent', '{"LMoP"}', 'See book for description.', NULL, 7700.0),
('28877fad-5dad-50d3-8acc-3b81651d540b', 'LOT_0771', 'Spirit Board', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 7710.0),
('372531c0-88b8-5915-9045-c5b9856322dc', 'LOT_0772', 'Staff of Charming', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Staff', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 7720.0),
('cad7eafb-330a-50d4-8b37-b067a9834ecf', 'LOT_0773', 'Staff of Defense', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Staff', 'Permanent', false, NULL, 'T2 Permanent', '{"PBTSO"}', 'See book for description.', NULL, 7730.0),
('cdcb168d-ca1a-5ac5-be31-e0e7423b5f27', 'LOT_0774', 'Staff of Dunamancy', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Staff', 'Permanent', false, NULL, 'T2 Permanent', '{"EGW"}', 'See book for description.', NULL, 7740.0),
('e7cf50e8-d637-5dca-bdfa-af4e3e89714b', 'LOT_0775', 'Staff of Healing', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Staff', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 7750.0),
('89211c9a-e529-5faf-97b0-c9d0378de029', 'LOT_0776', 'Staff of Swarming Insects', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Staff', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 7760.0),
('dba3e90b-475e-5055-a0c2-bf9f93164880', 'LOT_0777', 'Lesser Staff of the Woodlands (Staff of the Woodlands (2024))', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Staff', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 7770.0),
('010573e2-fe0d-5d99-831b-c1c1c23ef5a3', 'LOT_0778', 'Starshot Weapon (Starshot Crossbow) (any ranged weapon that lacks the thrown property)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any ranged weapon that lacks the thrown property)', 'Permanent', false, NULL, 'T2 Permanent', '{"BMT"}', 'See book for description.', NULL, 7780.0),
('af608268-f4d0-5f78-8d18-56c3fd139f0c', 'LOT_0779', 'Stonemaker Weapon (Stonemaker''s War Pick, fully charged) (any melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any melee weapon)', 'Permanent', false, NULL, 'T2 Permanent', '{"BMT"}', 'See book for description.', NULL, 7790.0),
('a00774b1-5241-58f2-87dd-51400e396557', 'LOT_0780', 'Sun Blade (any melee weapon that lacks the Heavy or Thrown property)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any melee weapon that lacks the heavy or thrown property)', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 7800.0),
('33f51984-ee06-5ae1-9d31-b581f2ddc854', 'LOT_0781', 'Sunforger (any melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any melee weapon)', 'Permanent', false, NULL, 'T2 Permanent', '{"GGR"}', 'See book for description.', NULL, 7810.0),
('84d1274b-b2c4-59b1-990c-c22dbeade349', 'LOT_0782', 'Sun Lantern (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"HHB"}', 'Wondrous item, T2 (requires attunement)

This bullseye lantern has 5 charges and regains 1 charge per hour it is exposed to direct sunlight. While holding the lantern, you can use a Bonus Action to speak a command word to light the lantern, which remains lit for 6 hours or until the command word is spoken again. The lantern''s light is magical. Additionally, while the lantern is lit, you can use a Bonus Action to turn the lantern''s light into sunlight for 1 minute.', NULL, 7820.0),
('737c63c1-086e-5121-a5ad-b2e5f3caf489', 'LOT_0783', 'Sun Staff', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Staff', 'Permanent', false, NULL, 'T2 Permanent', '{"BMT"}', 'See book for description.', NULL, 7830.0),
('ea2be51f-2d91-5076-9c00-2d944acacbba', 'LOT_0784', 'Talons of the Squall', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"HWT"}', 'See book for description.', NULL, 7840.0),
('35c20fde-83d0-58dd-87b7-f931146fef6e', 'LOT_0785', 'Tasha’s Creeping Keelboat', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DLCT"}', 'See book for description.', NULL, 7850.0),
('72d1934a-d341-501c-bcf2-c7aa7d005574', 'LOT_0786', 'Greater Tentacle Rod (Tentacle Rod (2024))', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Rod', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 7860.0),
('020b11eb-a50c-55be-a76e-6795a5de240d', 'LOT_0787', 'Thunderbuss (any firearm)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any firearm)', 'Permanent', false, NULL, 'T2 Permanent', '{"BGG"}', 'See book for description.', NULL, 7870.0),
('806e16c2-3912-5493-bb61-9dc6b32e9db6', 'LOT_0788', 'Two-Birds Sling', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (sling)', 'Permanent', false, NULL, 'T2 Permanent', '{"MOT"}', 'See book for description.', NULL, 7880.0),
('003c3798-c955-5c98-bf93-17977cd98db1', 'LOT_0789', 'Voidwalker Armor (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Armor (any)', 'Permanent', false, NULL, 'T2 Permanent', '{"BMT"}', 'See book for description.', NULL, 7890.0),
('60b1a112-647e-56f8-8e26-05a26e0fc591', 'LOT_0790', 'Wand of Binding', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wand', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 7900.0),
('0a320cec-cb8a-50e8-8733-8b8839b53a67', 'LOT_0791', 'Wand of Fear', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wand', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 7910.0),
('15910f57-015b-52f7-a8ec-60032154c088', 'LOT_0792', 'Wand of Fireballs', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wand', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 7920.0),
('f59d9d9e-06c0-52dd-890b-a5befcf0b76c', 'LOT_0793', 'Wand of Lightning Bolts', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wand', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 7930.0),
('bdf8b745-b8dc-5278-9551-48321f7ea8ac', 'LOT_0794', 'Wand of Paralysis', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wand', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 7940.0),
('df524303-fcca-5a60-8e3d-ea026a0742e3', 'LOT_0795', 'Wand of Polymorph', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wand', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 7950.0),
('96d041e4-2971-53a0-ae45-3fda47e506cc', 'LOT_0796', '+2 Wand of the War Mage', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wand', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 7960.0),
('176edc14-9522-51c7-8e1e-011ec0b6226a', 'LOT_0797', 'Wand of Web (2014)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wand', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014"}', 'See book for description.', NULL, 7970.0),
('91de50a4-d307-52ce-af2b-4f9ca09a8a2f', 'LOT_0798', 'Wand of Winter', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wand', 'Permanent', false, NULL, 'T2 Permanent', '{"HOTDQ_TOD"}', 'See book for description.', NULL, 7980.0),
('13ed50c6-9840-594b-bf55-33de51b5eb8a', 'LOT_0799', 'Wand of Wonder', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wand', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 7990.0),
('33e7173f-2bf2-5123-92a1-a9f3cb219711', 'LOT_0800', 'War Horn of Valor', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"BGG"}', 'See book for description.', NULL, 8000.0);

INSERT INTO public.ac_loot (
    id, check_id, name, category_id, tier_id, type, nature, is_dm_select, event_category, tier_display, source, description, notes_advice, display_order
) VALUES
('6ffa328c-b304-5408-8f9b-46b34fbe4e7d', 'LOT_0801', 'Warrior’s Passkey', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"BMT"}', 'See book for description.', NULL, 8010.0),
('427de281-f2fd-59f7-b744-6be79eaecf6d', 'LOT_0802', '+2 Weapon (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any)', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 8020.0),
('9e8edd95-c057-58e6-9c57-1e329c3e87e2', 'LOT_0803', 'Weapon of Backbiting (Spear of Backbiting) (any weapon with the thrown property)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any weapon with the thrown property)', 'Permanent', false, NULL, 'T2 Permanent', '{"TftYP"}', 'See book for description.', NULL, 8030.0),
('c94d6b24-3b42-52d7-9436-9802c547751e', 'LOT_0804', 'Weapon of the Banneret (Sword of the Paruns) (any melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any melee weapon)', 'Permanent', false, NULL, 'T2 Permanent', '{"GGR"}', 'See book for description.', NULL, 8040.0),
('1750f9c0-92a9-5181-82b8-55a4ae9ba121', 'LOT_0805', 'Weapon of Blindsight (HB) (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any)', 'Permanent', false, NULL, 'T2 Permanent', '{"HHB"}', 'Weapon (any weapon), T2 (requires attunement)

While attuned to this weapon, you have Blindsight out to a range of 30 feet.', NULL, 8050.0),
('21df611b-4401-5ddc-af86-bca319eb79c3', 'LOT_0806', 'Weapon of Certain Death (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any)', 'Permanent', false, NULL, 'T2 Permanent', '{"EGW"}', 'See book for description.', NULL, 8060.0),
('28f8070a-0e47-5714-91ee-81b979693738', 'LOT_0807', 'Weapon of the Executioner (HB) (any slashing melee weapon with the heavy or two-handed property)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any slashing melee weapon with the heavy or two-handed property)', 'Permanent', false, NULL, 'T2 Permanent', '{"HHB"}', 'Weapon (any slashing melee weapon with the heavy or two-handed property), T2 (requires attunement)

This consists to a masterfully carved hickory shaft with a rusted and chipped blade mounted firmly to the shaft, worn and rusted from years of use. Despite its appearance, the blade is razor sharp and never dulls. Some believe the weapon to be haunted, claiming to hear the voices of its previous victims begging to be spared.

You have a +1 bonus to attack and damage rolls made with this magic weapon. When you a hit a creature that doesn''t have all of its Hit Points with an attack with this weapon, the target takes an extra 5 Slashing damage if it isn''t a Construct or an Undead. Additionally, while holding this weapon, you can use a Bonus Action to extend the weapon''s reach by 5 feet until the end of your turn.', NULL, 8070.0),
('ee7e5590-d6bc-58af-bb0b-12a334e5e3e5', 'LOT_0808', 'Weapon of the Medusa (Blade of the Medusa) (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any)', 'Permanent', false, NULL, 'T2 Permanent', '{"LLK"}', 'See book for description.', NULL, 8080.0),
('27cb3613-d463-5c62-aa92-653cacbd242a', 'LOT_0809', 'Greater Weapon of Sharpness (Sword of Sharpness (2024)) (any piercing or slashing melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any piercing or slashing melee weapon)', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 8090.0),
('19392e91-ec98-5cc4-bce7-dfc98be25997', 'LOT_0810', '+2 Weapon of Song (HB) (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any)', 'Permanent', false, NULL, 'T2 Permanent', '{"HHB"}', 'Weapon (any), T2 (requires attunement by a bard)

This weapon resembles a musical instrument.

You have a +2 bonus to attack and damage rolls you make with this magic weapon and you can use it as a spellcasting focus.

You can use a Bonus Action while holding this weapon to expend a use of your Bardic Inspiration to gain a number of Temporary Hit Points equal to a roll of your Bardic Inspiration die. Additionally, until the start of your next turn after expending a use of your Bardic Inspiration in this way, you gain a bonus to any damage rolls you make while holding this weapon equal to your Charisma modifier.', NULL, 8100.0),
('c8369120-3f46-59a1-a7bb-0d9ff9e6f9c4', 'LOT_0811', 'Weapon of Throne''s Command (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any)', 'Permanent', false, NULL, 'T2 Permanent', '{"BMT"}', 'See book for description.', NULL, 8110.0),
('5e6838a4-6d15-5881-9132-18eab01c3dc6', 'LOT_0812', 'Weapon of Warning (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any)', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 8120.0),
('cf847c35-237d-58c7-b9d8-01252ac24e44', 'LOT_0813', 'Weapon of the Wood (Blade of the Wood) (any melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any melee weapon)', 'Permanent', false, NULL, 'T2 Permanent', '{"HWCS"}', 'See book for description.', NULL, 8130.0),
('fe972fd7-f6ce-5c79-963a-beae4b6f96d5', 'LOT_0814', 'Greater Weapon of Wounding (Sword of Wounding (2024)) (any piercing or slashing melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any piercing or slashing melee weapon)', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 8140.0),
('af9768dc-bc9c-5330-93ba-2067cc70af1c', 'LOT_0815', 'Whistle of Freedom', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"HWT"}', 'See book for description.', NULL, 8150.0),
('5a1f18d4-7d36-5aa8-bea1-24dfdf34beff', 'LOT_0816', 'Windskiff', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"FRHOF"}', 'See book for description.', NULL, 8160.0),
('9fcdb2e4-b689-55da-ba2d-b649fb063edf', 'LOT_0817', 'Winged Boots', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 8170.0),
('d115b121-08df-5c4a-b212-afe2e56be80e', 'LOT_0818', 'Wing Crest Shield', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Armor (shield)', 'Permanent', false, NULL, 'T2 Permanent', '{"HWCS"}', 'See book for description.', NULL, 8180.0),
('c5eba168-8ec5-5f61-97cd-a566e99f42eb', 'LOT_0819', 'Wings of Flying', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 8190.0),
('62280ee8-841b-5716-94bd-4d75c0426f12', 'LOT_0820', '+2 Wraps of Unarmed Prowess', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"BMT", "DMG2024"}', 'See book for description.', NULL, 8200.0),
('b536bd6e-12ce-5b77-8a51-52a96482cf68', 'LOT_0821', 'Wyrmreaver Gauntlets', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Permanent', '{"BGG"}', 'See book for description.', NULL, 8210.0),
('df382a61-2e80-594c-82cd-0e5ff95464df', 'LOT_0822', 'Zephyr Armor (any light armor)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Armor (any light armor)', 'Permanent', false, NULL, 'T2 Permanent', '{"BGG"}', 'See book for description.', NULL, 8220.0),
('0d13eb36-6a4a-5808-9fe2-b5a6d3670110', 'LOT_0823', '+3 Ammunition (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Ammunition (any)', 'Consumable', false, NULL, 'T3 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 8230.0),
('bebd57c5-0582-5b42-a3ed-9b7afba4de4d', 'LOT_0824', 'Dispelling Stone', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Consumable', false, NULL, 'T3 Consumable', '{"EGW"}', 'See book for description.', NULL, 8240.0),
('77f438b3-25ab-5fbf-9143-2248a14f474f', 'LOT_0825', 'Superior Ioun Stone of Absorption (Ioun Stone of Absorption (2024))', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Consumable', false, NULL, 'T3 Consumable', '{"DMG2024"}', 'See book for description.', NULL, 8250.0),
('fea8ce9a-e05f-50c5-a8da-886e0e8cdc71', 'LOT_0826', 'Ioun Stone of Greater Absorption (2014)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Consumable', false, NULL, 'T3 Consumable', '{"DMG2014"}', 'See book for description.', NULL, 8260.0),
('fbe53087-0384-5543-b664-1ed0cc71bd6e', 'LOT_0827', 'Lesser Potion of Dragon''s Majesty (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Potion', 'Consumable', false, NULL, 'T3 Consumable', '{"HHB"}', 'Potion, T3

This potion has the properties of a Potion of Dragon''s Majesty except it transforms you into a young dragon of the same kind as the scale the dragon came from.', NULL, 8270.0),
('383bc48f-3a27-5131-95d8-4d6b1bdf2e52', 'LOT_0828', 'Manual of Clay Golems', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Consumable', false, NULL, 'T3 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 8280.0),
('0fd5e864-4441-57ea-843a-9f65eb7f2231', 'LOT_0829', 'Manual of Stone Golems', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Consumable', false, NULL, 'T3 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 8290.0),
('6a7ab18f-1ecf-50fc-a72c-b76eb3a4a3aa', 'LOT_0830', 'Mind Crystal (Heightened or Quickened)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Consumable', false, NULL, 'T3 Consumable', '{"PBTSO"}', 'See book for description.', NULL, 8300.0),
('ee4e24a1-a113-5563-9fbb-48b79335a4a8', 'LOT_0831', 'pots of Nolzur''s Marvelous Pigments (2014)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Consumable', false, NULL, 'T3 Consumable', '{"DMG2014"}', 'See book for description.', NULL, 8310.0),
('f66b5222-5a04-5755-b2cb-55ba7ae20ddf', 'LOT_0832', 'Oil of Sharpness (2014)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Potion', 'Consumable', false, NULL, 'T3 Consumable', '{"DMG2014"}', 'See book for description.', NULL, 8320.0),
('d92d40ad-d160-5215-be3a-4e13e20cb145', 'LOT_0833', 'Potion of Cloud Giant Strength', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Potion', 'Consumable', false, NULL, 'T3 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 8330.0),
('9925f580-874e-552f-afd8-d3f01e930731', 'LOT_0834', 'Potion of Greater Invisibility', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Potion', 'Consumable', false, NULL, 'T3 Consumable', '{"DMG2024"}', 'See book for description.', NULL, 8340.0),
('cc8c6f02-9a16-538f-84ec-fadb72b74fc7', 'LOT_0835', 'Potion of Mind Control (monster)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Potion', 'Consumable', false, NULL, 'T3 Consumable', '{"TftYP"}', 'See book for description.', NULL, 8350.0),
('ee1e19c5-70f8-59a0-bedb-8f38be0b14cb', 'LOT_0836', 'Potion of Supreme Healing', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Potion', 'Consumable', false, NULL, 'T3 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 8360.0),
('8e96720b-22af-5d6f-90ab-0ea3d4686173', 'LOT_0837', 'Recall Crystal', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Consumable', false, NULL, 'T3 Consumable', '{"HWT"}', 'See book for description.', NULL, 8370.0),
('8eb18f02-e17b-5ad2-bd02-51d9df5d189e', 'LOT_0838', 'Sling Bullets of Althemone (Banishment)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Ammunition (sling bullets)', 'Consumable', false, NULL, 'T3 Consumable', '{"MOT"}', 'See book for description.', NULL, 8380.0),
('41e306a3-7adc-52b1-bf3b-348cdf6ae8fe', 'LOT_0839', 'Sling Bullets of Althemone (Fulguration)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Ammunition (sling bullets)', 'Consumable', false, NULL, 'T3 Consumable', '{"MOT"}', 'See book for description.', NULL, 8390.0),
('e0d3cd01-415c-5c1f-b6f9-89630e07dee0', 'LOT_0840', 'Spell Scroll (Level 6)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Scroll', 'Consumable', false, NULL, 'T3 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 8400.0),
('6213991b-0b6a-5ca7-a696-ba7ac32b5f1b', 'LOT_0841', 'Spell Scroll (Level 7)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Scroll', 'Consumable', false, NULL, 'T3 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 8410.0),
('ec4134e5-1eec-52a7-b041-69dfc0930f9b', 'LOT_0842', 'Spell Scroll (Level 8)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Scroll', 'Consumable', false, NULL, 'T3 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 8420.0),
('36840702-cd99-5f85-a529-cba0f6c9fc99', 'LOT_0843', 'Amethyst Lodestone', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"FTD"}', 'See book for description.', NULL, 8430.0),
('01bbeebc-df1b-5c93-952c-befe7703864e', 'LOT_0844', 'Animated Shield', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Armor (shield)', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 8440.0),
('5299a76e-7d94-57be-9cf4-0b1ad7ba3b8a', 'LOT_0845', 'Antimagic Armor (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Armor (any)', 'Permanent', false, NULL, 'T3 Permanent', '{"BMT"}', 'See book for description.', NULL, 8450.0),
('3ed283a9-60b4-5cc1-86ed-f06d722698f0', 'LOT_0846', 'Apparatus of Kwalish', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 8460.0),
('b45e2161-118c-557b-8b9b-c36f1800d72e', 'LOT_0847', '+2 Armor (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Armor (any)', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 8470.0),
('309ebb41-93fa-55f5-be7f-68a1e2228853', 'LOT_0848', 'Armor of Etherealness (Plate Armor of Etherealness) (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Armor (any)', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 8480.0),
('87ef25f5-49b0-573b-a888-c198f03b12e5', 'LOT_0849', 'Armor of Sea''s Retribution (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Armor (any medium or heavy armor)', 'Permanent', false, NULL, 'T3 Permanent', '{"HHB"}', 'Armor (Any Medium or Heavy Armor), T3

This armor is decorated with the parts of an undersea monster. While wearing this armor, you have a +1 bonus to AC and gain a swimming speed equal to your walking speed.

The armor has 3 charges, and it regains all expended charges daily at dawn. When a creature within 5 feet of you damages you while you are wearing this armor, you can use your reaction to expend 1 of this armor''s charges and deal 2d10 piercing damage to the creature.', NULL, 8490.0),
('6024c4c9-5bff-5fe1-985e-f5219ac3984e', 'LOT_0850', 'Bag of Devouring', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 8500.0),
('fc3620d6-74c2-5a78-bb1d-424750975748', 'LOT_0851', 'Barrier Tattoo (Very Rare)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item (tattoo)', 'Permanent', false, NULL, 'T3 Permanent', '{"TCE"}', 'See book for description.', NULL, 8510.0),
('29728103-f646-5ff0-bcd5-0ec48574b1f7', 'LOT_0852', 'Beholder Crown (Belashyrra''s Beholder Crown)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"ERLW"}', 'See book for description.', NULL, 8520.0),
('29c9c470-bb37-570d-a750-ca4c7e34e761', 'LOT_0853', 'Belt of Frost Giant Strength', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 8530.0),
('0980b57d-44ae-5219-bb01-ab647c32eb26', 'LOT_0854', 'Belt of Stone Giant Strength', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 8540.0),
('a195b4c8-c95c-5468-b974-1d9c9f3eb625', 'LOT_0855', 'Blast Scepter', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Rod', 'Permanent', false, NULL, 'T3 Permanent', '{"WDMM"}', 'See book for description.', NULL, 8550.0),
('3b994e19-1118-5600-99e4-79b1a65996d0', 'LOT_0856', 'Bowl of Commanding Water Elementals', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 8560.0),
('35e9d459-4e93-5d84-8eb1-3c79886c07cb', 'LOT_0857', 'Bracelet of Rock Magic', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"TftYP"}', 'See book for description.', NULL, 8570.0),
('e7a6673c-c3dc-5472-8fdf-f52fa1dccef3', 'LOT_0858', 'Branch Shot (HB) (any ranged weapon that lacks the thrown property)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Weapon (any ranged weapon that lacks the thrown property)', 'Permanent', false, NULL, 'T3 Permanent', '{"HHB"}', 'Weapon (any ranged weapon that lacks the thrown property), T3 (requires attunement)

You have a +2 bonus to attack and damage rolls made with this magic weapon. This weapon has 5 charges, and it regains expended 1d4+1 charges daily at dawn. When you make a ranged attack roll with this weapon, you can expend 1 charge to speak the weapon''s command word and make an additional attack against a different target within 10 feet of the original target. The second attack uses the same attack roll and damage roll as the first attack, except that all of the damage dealt is Force damage. This property can only be used once per turn.', NULL, 8580.0),
('a867cee7-9778-5722-9d86-f5ebd235142d', 'LOT_0859', 'Brazier of Commanding Fire Elementals', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 8590.0),
('cff23c2d-7997-5458-aaa9-4732d00ff570', 'LOT_0860', 'Bridle of Capturing', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"IMR"}', 'See book for description.', NULL, 8600.0),
('651c7eae-c61d-59b9-9016-b3e200e19a15', 'LOT_0861', 'Broom of Flying (2014)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014"}', 'See book for description.', NULL, 8610.0),
('3bc22be9-d9f6-5c14-adec-c5b5041bc0f0', 'LOT_0862', 'Cape of Enlargement', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"PBTSO"}', 'See book for description.', NULL, 8620.0),
('9954ca17-ff5e-57fc-8558-34a6e3b5802a', 'LOT_0863', 'Carpet of Flying, 3ft. x 5ft.', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 8630.0),
('cb8fb29b-79db-5eb0-a9ed-c34941f14417', 'LOT_0864', 'Carpet of Flying, 4ft. x 6ft.', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 8640.0),
('0d1821c5-a591-5fea-844a-471cdc5e3e24', 'LOT_0865', 'Carpet of Flying, 5ft. x 7ft.', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 8650.0),
('c13dfcdf-b9ee-5c7b-8c59-4ad3547ab62b', 'LOT_0866', 'Carpet of Flying, 6ft. x 9ft.', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 8660.0),
('2e68ff75-4419-5da4-a6fb-704c7576fe8a', 'LOT_0867', 'Cauldron of Rebirth', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"TCE", "DMG2024"}', 'See book for description.', NULL, 8670.0),
('6db96c2b-7d74-5ecc-a57b-568c9f21e7d7', 'LOT_0868', 'Censer of Controlling Air Elementals', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 8680.0),
('f250a4e1-a6f4-5340-baca-bb4273bea5f2', 'LOT_0869', 'Chime of Exile', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"VEOR"}', 'See book for description.', NULL, 8690.0),
('4a1f2697-b781-59cb-b3f2-886f40235f18', 'LOT_0870', 'Cogwork Wings', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"HWT"}', 'See book for description.', NULL, 8700.0),
('4b65f793-261c-5de2-a476-b134d3def6a8', 'LOT_0871', 'Crystal Ball (non-variant)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'This is a Crystal Ball that can cast Scrying with no additional special features. See book for description.', NULL, 8710.0),
('bd58a80f-00b2-59d5-a440-7be1910df081', 'LOT_0872', 'Cube of Summoning', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 8720.0),
('075168dc-1ae2-512f-8f56-ba346f0ec85f', 'LOT_0873', 'Deck of Dimensions', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"BMT"}', 'See book for description.', NULL, 8730.0),
('b879c453-13a3-5440-8f44-010bb3f87bdc', 'LOT_0874', 'Defender (any melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Weapon (Any Melee Weapon)', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 8740.0),
('57bcb1e9-8243-511e-86e1-c3ffd799f739', 'LOT_0875', '+3 Dragonhide Belt', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"FTD"}', 'See book for description.', NULL, 8750.0),
('ac3bb98e-6232-5434-baf4-bcfb1161ad5d', 'LOT_0876', 'Dragonlance (lance or pike)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Weapon (lance or pike)', 'Permanent', false, NULL, 'T3 Permanent', '{"FTD", "DSotDQ"}', 'See book for description.', NULL, 8760.0),
('697b93e2-6c58-53c5-b209-a71cb0e4fb82', 'LOT_0877', 'Duskcrusher (any melee weapon that lacks the heavy or thrown property)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Weapon (any melee weapon that lacks the heavy or thrown property)', 'Permanent', false, NULL, 'T3 Permanent', '{"EGW"}', 'See book for description.', NULL, 8770.0),
('d2e491b7-5a52-5da6-a695-a74ca635acc8', 'LOT_0878', 'Dwarven Plate (half plate or plate)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Armor (half plate or plate)', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 8780.0),
('e5e161df-24e2-5bab-bd54-fc138d4c5e02', 'LOT_0879', 'Dwarven Thrower', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Weapon (warhammer)', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014"}', 'See book for description.', NULL, 8790.0),
('d7020a0d-9821-5751-8625-c46f1dd2ea89', 'LOT_0880', 'Enspelled Armor (Level 4) (any armor)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Armor (any)', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 8800.0),
('f7f41b95-8131-50f6-b639-1378689c084f', 'LOT_0881', 'Enspelled Armor (Level 5) (any armor)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Armor (any)', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 8810.0),
('cc5ac834-89f7-58c1-8e92-9fb3d4d0146f', 'LOT_0882', 'Enspelled Staff (Level 4)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Staff', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 8820.0),
('b308cf5c-3426-5b18-a6f7-d5e65ef061f9', 'LOT_0883', 'Enspelled Staff (Level 5)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Staff', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 8830.0),
('f8ba3d30-e90f-5b10-876b-bed72afca24f', 'LOT_0884', 'Enspelled Weapon (Level 4) (any weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Weapon (any)', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 8840.0),
('1af6ad12-00c8-5608-ba22-122ffc488fa8', 'LOT_0885', 'Enspelled Weapon (Level 5) (any weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Weapon (any)', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 8850.0),
('aef6c203-d891-5bdc-827c-94d15d10fa50', 'LOT_0886', 'Eyes of the Arcane (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"HHB"}', 'Wondrous item, T3 (requires attunement)

This winged golden mask has stark white lenses that fit over the eyes. It is cold and clammy to the touch and wearing it causes you to hear whispered giggling. 

While wearing this mask, you can use any Spell Scroll by making an Intelligence (Arcana) check with the DC equal to 10 + the spell''s level. On a successful check, you cast the spell from the scroll. On a failed check, the scroll disintegrates. 

Additionally, whenever you fail to use a Spell Scroll while wearing this mask, you take 2d8 Force damage and must roll once on the Wild Magic Surge table in the Player''s Handbook.', NULL, 8860.0),
('4321c85e-c05c-5558-b024-6758cefc3ac7', 'LOT_0887', 'Fane Weapon (Fane-Eater) (any melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Weapon (any melee weapon)', 'Permanent', false, NULL, 'T3 Permanent', '{"BGDIA"}', 'See book for description.', NULL, 8870.0),
('4cb46556-1ecf-5836-ac47-f8cf842c4bd0', 'LOT_0888', 'Figurine of Wondrous Power, Obsidian Steed', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 8880.0),
('50cf4906-daac-54c1-8852-b1a652983461', 'LOT_0889', 'Fish Suit', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"AAG"}', 'See book for description.', NULL, 8890.0),
('d4f83b62-b154-551e-aed7-b05961ffde88', 'LOT_0890', 'Forcebreaker Weapon (any weapon that deals bludgeoning damage)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Weapon (any weapon that deals bludgeoning damage)', 'Permanent', false, NULL, 'T3 Permanent', '{"BMT"}', 'See book for description.', NULL, 8900.0),
('19cea4d9-280a-5026-840f-9820ce85cb5f', 'LOT_0891', 'Fork of Eddy Summoning', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous Item', 'Permanent', false, NULL, 'T3 Permanent', '{"NF"}', 'See book for description.', NULL, 8910.0),
('c76882a8-c30b-5f65-aced-f31ed1bbe79f', 'LOT_0892', '+3 Gauntlets of the Dragon (HB)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"HHB"}', 'Wondrous item, T3

This pair of lightweight gauntlets is in the shape of a dragon''s head. While wearing these gauntlets, you have a +3 bonus to attack and damage rolls you make with Unarmed Strikes and natural weapons and such attacks are considered to be magical. The type of damage dealt by your Unarmed Strikes and natural weapons while wearing these gauntlets depends on the type of the dragon the gauntlets were modelled after as per the table below.

Dragon Color            Damage Type
Black / Copper            Acid
White / Silver              Cold
Red / Brass / Gold      Fire
Blue / Bronze              Lightning
Green                         Poison
Amethyst                    Force
Crystal                        Radiant
Emerald                      Psychic
Sapphire                     Thunder
Topaz                          Necrotic', NULL, 8920.0),
('27a8b98f-2e8d-539d-9d79-0db159ec416b', 'LOT_0893', 'Helm of Brilliance', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 8930.0),
('7d7c3f23-9903-5282-bc6c-3bed68209703', 'LOT_0894', 'Helm of Devil Command', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"BGDIA"}', 'See book for description.', NULL, 8940.0),
('8861e779-3592-5a20-be33-f25f74101896', 'LOT_0895', 'Helm of Teleportation', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 8950.0),
('fd546320-6ddb-55e5-afae-a076293174b0', 'LOT_0896', 'Horn of Valhalla, Brass', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 8960.0),
('cf8f78fa-3f69-57d1-9140-8bb0cb77ea7e', 'LOT_0897', 'Instrument of the Bards, Anstruth Harp', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 8970.0),
('fdfe4eac-a7b5-5490-9ed2-09079ec47757', 'LOT_0898', 'Instrument of the Bards, Ollamh Harp', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 8980.0),
('1b6a6992-d1dc-5e75-a787-f5b89579c6b5', 'LOT_0899', 'Ioun Stone of Mastery', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 8990.0),
('db8b2da0-eb6e-5db5-8b55-9ae433cce71f', 'LOT_0900', 'Juiblex''s Ooze (Kyrzin’s Ooze)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"ERLW"}', 'See book for description.', NULL, 9000.0);

INSERT INTO public.ac_loot (
    id, check_id, name, category_id, tier_id, type, nature, is_dm_select, event_category, tier_display, source, description, notes_advice, display_order
) VALUES
('cf879ec5-fcb3-5677-8a3d-0e8745295e9a', 'LOT_0901', 'Lash of Immolation', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Weapon (whip)', 'Permanent', false, NULL, 'T3 Permanent', '{"BGG"}', 'See book for description.', NULL, 9010.0),
('28071edc-a122-5ce2-9410-5763e58f787c', 'LOT_0902', 'Living Armor (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Armor (any)', 'Permanent', false, NULL, 'T3 Permanent', '{"ERLW"}', 'See book for description.', NULL, 9020.0),
('9a929d57-be5f-5d35-8844-69939f934304', 'LOT_0903', 'Lucent Destroyer (any ranged weapon that lacks the thrown property)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Weapon (any ranged weapon that lacks the thrown property)', 'Permanent', false, NULL, 'T3 Permanent', '{"BGG"}', 'See book for description.', NULL, 9030.0),
('8ec9855f-7144-5efe-aa13-ae5fa7281f14', 'LOT_0904', 'Lute of Thunderous Thumping', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Weapon (club)', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 9040.0),
('d3838449-105e-5cc7-be51-b8fccdb805b1', 'LOT_0905', 'Magen Handbell', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"NF"}', 'See book for description.', NULL, 9050.0),
('ccdd056c-944e-5b5a-833f-d7a0bfaa8d9f', 'LOT_0906', 'Mindblasting Cap', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"PBTSO"}', 'See book for description.', NULL, 9060.0),
('3f441214-b84f-57b5-a338-6527d9b0eb82', 'LOT_0907', 'Mindguard Crown', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"PBTSO"}', 'See book for description.', NULL, 9070.0),
('535a4ecb-fd20-50ae-aa35-388b05edfda0', 'LOT_0908', 'Mistral Mantle', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"BGG"}', 'See book for description.', NULL, 9080.0),
('819119fb-ebb0-5a56-98a5-4b3f3d82d96c', 'LOT_0909', 'Mizzium Apparatus', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"GGR"}', 'See book for description.', NULL, 9090.0),
('8006e2ed-0afb-5ec5-be0a-2dc0e984892c', 'LOT_0910', 'Greater Oil of Sharpness (Oil of Sharpness (2024))', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Potion', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 9100.0),
('03640f20-6061-528b-b1fc-ea2a030df810', 'LOT_0911', 'Orb of the Veil', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"EGW"}', 'See book for description.', NULL, 9110.0),
('b9c61d47-e5ac-5d15-8eaf-897f4dbe69f2', 'LOT_0912', 'Ornithopter of Flying', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"WBTW"}', 'See book for description.', NULL, 9120.0),
('74d000a1-77af-55f3-8f0b-8dfe498f8dc0', 'LOT_0913', 'Peregrine Mask', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"GGR"}', 'See book for description.', NULL, 9130.0),
('a69befce-7952-53c7-906c-a1b7c868a0e7', 'LOT_0914', 'Lesser Periapt of Proof Against Poison (Periapt of Proof Against Poison (2024))', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 9140.0),
('567dc3b6-8179-50aa-a46c-0ccc8854276e', 'LOT_0915', 'Prayer Bead, Wind Walking', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'Bead of a Necklace of Prayer Beads. See book for description.', NULL, 9150.0),
('b2063d7f-1727-5e3f-ac02-ca4bf8b85388', 'LOT_0916', 'Prehistoric Figurine of Wondrous Power, Jasper Tyrannosaurus Rex', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"BGG"}', 'See book for description.', NULL, 9160.0),
('4c3d7505-20cf-56d2-aea2-a723a38a40ad', 'LOT_0917', '+3 Returning Weapon (HB) (Any Simple or Martial with the Thrown Property)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Weapon (Any Simple or Martial with the Thrown Property)', 'Permanent', false, NULL, 'T3 Permanent', '{"HHB"}', 'Weapon (Any Simple or Martial with the Thrown Property), T3

This weapon has the properties of a Returning Weapon except its bonus to attack and damage rolls is +3.', NULL, 9170.0),
('10de2bef-730a-5454-8b86-e26138866c8e', 'LOT_0918', 'Ring of Regeneration', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Ring', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 9180.0),
('9477c09a-1c5f-5533-a65e-bfdf1753ae93', 'LOT_0919', 'Greater Ring of Spell Turning (Ring of Spell Turning (2024))', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Ring', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 9190.0),
('d4c998c3-d9f3-5c8a-a2e5-be3ff2a8d633', 'LOT_0920', 'Greater Ring of Telekinesis (Ring of Telekinesis (2024))', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Ring', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 9200.0),
('34cad139-6b65-5142-97a9-def75a5ed071', 'LOT_0921', 'Robe of Stars', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 9210.0),
('e5575d65-7ea4-5bdb-a711-f4f30c598d55', 'LOT_0922', 'Rod of Alertness', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Rod', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 9220.0),
('19d6795a-5531-5b5b-8aaa-828e196e4f45', 'LOT_0923', 'Rod of Hellish Flames', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Rod', 'Permanent', false, NULL, 'T3 Permanent', '{"BMT"}', 'See book for description.', NULL, 9230.0),
('a7a0dae3-f6da-5bff-b784-e0b4e5b9c100', 'LOT_0924', 'Rod of Lordly Might', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Rod', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 9240.0),
('be648b4c-f67c-5afb-951f-601305124653', 'LOT_0925', 'Rod of Resurrection', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Rod', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 9250.0),
('0da9e7b8-ea6d-5522-9c8a-d79f5ad4fe2b', 'LOT_0926', 'Rod of Security', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Rod', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 9260.0),
('d7fc272d-25b9-56f3-987a-0775139c8cf5', 'LOT_0927', 'Saber of Unity (any slashing or piercing melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Weapon (any slashing or piercing melee weapon)', 'Permanent', false, NULL, 'T3 Permanent', '{"HWT"}', 'See book for description.', NULL, 9270.0),
('c6df4c08-9192-54c2-9af9-00988d4b77ad', 'LOT_0928', 'Sapphire Buckler', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Armor (shield)', 'Permanent', false, NULL, 'T3 Permanent', '{"FTD"}', 'See book for description.', NULL, 9280.0),
('538e43be-62f7-55a0-8517-71f070cdbe26', 'LOT_0929', 'Greater Scarab of Protection (Scarab of Protection (2024))', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 9290.0),
('86e64eeb-60ef-5bb6-af4a-1f87a1a31a5c', 'LOT_0930', 'Shard Solitaire (Black Sapphire, Jacinth, Rainbow Pearl, or Ruby)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"KftGV"}', 'See book for description.', NULL, 9300.0),
('f44ed757-3e1d-53b5-ac6e-0a51a8f82dc7', 'LOT_0931', '+2 Shield', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Armor (shield)', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 9310.0),
('a6950410-e87a-5c56-be85-b3a90c24ed99', 'LOT_0932', 'Shield of the Blazing Dreadnought', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Armor (shield)', 'Permanent', false, NULL, 'T3 Permanent', '{"BGG"}', 'See book for description.', NULL, 9320.0),
('8a03382f-dc75-5b6d-9ec9-6e62c1d8c354', 'LOT_0933', 'Shield of the Cavalier', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Armor (shield)', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 9330.0),
('ccdfdee9-3918-5bdc-a633-efd81fc08584', 'LOT_0934', 'Skull Helm', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"BMT"}', 'See book for description.', NULL, 9340.0),
('1d80d9ef-f0ef-5d9d-888d-467137a43907', 'LOT_0935', 'Slimeforged Blade (any slashing or piercing melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Weapon (any slashing or piercing melee weapon)', 'Permanent', false, NULL, 'T3 Permanent', '{"HWT"}', 'See book for description.', NULL, 9350.0),
('05a8f33e-2eba-56e0-a26f-e64a2e103719', 'LOT_0936', 'Spell Bottle', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"EGW"}', 'See book for description.', NULL, 9360.0),
('db688950-2d28-59bc-9df6-7e983dcad7fd', 'LOT_0937', 'Spindle of Fate', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wand', 'Permanent', false, NULL, 'T3 Permanent', '{"BMT"}', 'See book for description.', NULL, 9370.0),
('53768f73-d07f-5c20-83cc-14978ef11722', 'LOT_0938', 'Staff of Fate', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Staff', 'Permanent', false, NULL, 'T3 Permanent', '{"CM"}', 'See book for description.', NULL, 9380.0),
('607d8050-484d-52fa-9ceb-62671711c8c8', 'LOT_0939', 'Staff of Fire', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Staff', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 9390.0),
('e538712c-2761-59df-9b38-e44686c258a9', 'LOT_0940', 'Staff of Frost', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Staff', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 9400.0),
('ecfe2f78-ab8a-5422-b43f-9f35521ee1d1', 'LOT_0941', 'Staff of Striking', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Staff', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 9410.0),
('20df6363-b2ae-5891-ac1c-84d9b9f7e725', 'LOT_0942', 'Staff of Thunder and Lightning', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Staff', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 9420.0),
('430b4c0e-24ec-5c43-a0a0-93bac63f4e20', 'LOT_0943', 'Staff of the Woodlands (2014)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Staff', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014"}', 'See book for description.', NULL, 9430.0),
('3e7ae69f-47ac-54f3-a2e6-5e56d4e1f955', 'LOT_0944', 'Stone of Controlling Earth Elementals', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 9440.0),
('2a6eaa2c-2b14-55a2-a170-09d2ec9941d6', 'LOT_0945', 'Telescopic Transporter', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"BMT"}', 'See book for description.', NULL, 9450.0),
('3318a62c-43ba-5694-bd84-9301fe7eb357', 'LOT_0946', 'Tentacle Whip (Dyrrn’s Tentacle Whip)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Weapon (whip)', 'Permanent', false, NULL, 'T3 Permanent', '{"ERLW"}', 'See book for description.', NULL, 9460.0),
('4ff9ee3c-75c8-5f19-828e-57a48217fa43', 'LOT_0947', 'Tidecaller Weapon (Tidecaller Trident) (javelin, spear, or trident)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Weapon (javelin, spear, or trident)', 'Permanent', false, NULL, 'T3 Permanent', '{"BMT"}', 'See book for description.', NULL, 9470.0),
('9d0dc19a-5e0b-5c7a-8d0c-6018fcdfd38e', 'LOT_0948', 'Topaz Annihilator (HB) (any firearm)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Weapon (any firearm)', 'Permanent', false, NULL, 'T3 Permanent', '{"HHB"}', 'Weapon (any firearm), T3 (requires attunement)

This magic firearm holds a glowing yellow scale from a topaz dragon in its heart, and it ignores the Ammunition and Loading properties. In lieu of ammunition, this weapon fires topaz bolts of energy. 

This weapon deals Necrotic damage instead of another damage type. When you hit with a ranged attack roll using this magic weapon, the target takes an extra 1d6 Necrotic damage. If Necrotic damage from this weapon reduces a creature or object to 0 Hit Points, the target is reduced to dust.  A creature reduced to dust can be restored to life only by a True Resurrection or Wish spell.

While the weapon is on your person, you can use an action to cast the disintegrate spell (save DC 18). Once this property is used, it can''t be used again until the next dawn.', NULL, 9480.0),
('3cb6aaad-cc0a-5c86-b917-21f58f632c50', 'LOT_0949', 'Greater Vicious Weapon (Vicious Weapon (2024)) (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Weapon (any)', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 9490.0),
('cb863e3f-a654-507d-b026-788ea6b11cbd', 'LOT_0950', 'Vortex Outburst (HB) (any Ranged Weapon that lacks the Thrown property)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Weapon (any Ranged Weapon that lacks the Thrown property)', 'Permanent', false, NULL, 'T3 Permanent', '{"HHB"}', 'Weapon (any Ranged Weapon that lacks the Thrown property), T3 (Requires Attunement)

This weapon is made from light pink crystal shards with the pulsing veins of arcane magic visible and is cold to the touch. A creature that attempts to use this weapon without being attuned to it takes 2d4 Cold damage when making an attack with it.

You have a +2 bonus to attack and damage rolls made with this magic weapon. When you hit with a ranged attack roll using this magic weapon, the target takes an extra 1d6 Cold damage. 

This weapon has 6 charges for the following properties and regains all expended charges daily at dawn.

Cryo Blast. After hitting a creature with a ranged attack roll using this magic weapon, you can immediately take a Bonus Action and expend 1 of its charges to force the target to make a DC 17 Constitution saving throw. On a failed save, the target subtracts 1d4 from all D20 Tests it makes for 1 minute. The target can repeat the saving throw at the end of each of its turns, ending the effect on a success.

Rime Torment. After hitting a creature with a ranged attack roll using this magic weapon, you can immediately take a Bonus Action and expend 1 of its charges to force the target to make a DC 17 Constitution saving throw or have the Stunned condition until the end of your next turn. Once used, this property can''t be used again until the next dawn.', NULL, 9500.0),
('be14dbc8-a08f-5bb3-a809-cb514e733c07', 'LOT_0951', 'Voyager Staff', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Staff', 'Permanent', false, NULL, 'T3 Permanent', '{"GGR"}', 'See book for description.', NULL, 9510.0),
('d11728b3-4fc0-5353-b858-6904416d63f6', 'LOT_0952', '+3 Wand of the War Mage', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wand', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 9520.0),
('191e9c2e-e62b-5aae-be59-da9d614ec20c', 'LOT_0953', 'Watchful Helm', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"CM"}', 'See book for description.', NULL, 9530.0),
('3837a9d5-8927-5887-9214-4dd8f5266c3e', 'LOT_0954', '+3 Weapon (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Weapon (any)', 'Permanent', false, NULL, 'T3 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 9540.0),
('0eb15107-4cf5-5ad5-882d-2cd74e4a38dc', 'LOT_0955', 'Weapon of the Healing Hearth (Longbow of the Healing Hearth) (any ranged weapon that lacks the thrown property)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Weapon (any ranged weapon that lacks the thrown property)', 'Permanent', false, NULL, 'T3 Permanent', '{"BGG"}', 'See book for description.', NULL, 9550.0),
('3939a74f-12bc-5c5e-b29c-dfa5b4f70553', 'LOT_0956', '+3 Weapon of Song (HB) (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Weapon (any)', 'Permanent', false, NULL, 'T3 Permanent', '{"HHB"}', 'Weapon (any), T3 (requires attunement by a bard)

This weapon resembles a musical instrument.

You have a +3 bonus to attack and damage rolls you make with this magic weapon and you can use it as a spellcasting focus.

You can use a Bonus Action while holding this weapon to expend a use of your Bardic Inspiration to gain a number of Temporary Hit Points equal to a roll of your Bardic Inspiration die. Additionally, until the start of your next turn after expending a use of your Bardic Inspiration in this way, you gain a bonus to any damage rolls you make while holding this weapon equal to your Charisma modifier.', NULL, 9560.0),
('b1896467-09aa-56bb-ab46-40c2be9ed4e0', 'LOT_0957', '+3 Wraps of Unarmed Prowess', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Permanent', '{"BMT", "DMG2024"}', 'See book for description.', NULL, 9570.0),
('a413471b-c003-5c97-b12c-83632e41b1e0', 'LOT_0958', 'Egg of Rebirth', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Wondrous item', 'Consumable', false, NULL, 'T4 Consumable', '{"HWT"}', 'See book for description.', NULL, 9580.0),
('056a19a6-cb0a-53c4-86ef-0206c6607e56', 'LOT_0959', 'Efreeti Bottle', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Wondrous item', 'Consumable', false, NULL, 'T4 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 9590.0),
('58df3bf0-a7cd-5063-b16b-1e641d6ccade', 'LOT_0960', 'Superior Ioun Stone of Greater Absorption (Ioun Stone of Greater Absorption (2024))', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Wondrous item', 'Consumable', false, NULL, 'T4 Consumable', '{"DMG2024"}', 'See book for description.', NULL, 9600.0),
('061370d4-9e74-54ff-809b-3ca3cde75b2c', 'LOT_0961', 'Talisman of Pure Good (2014)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Wondrous item', 'Consumable', false, NULL, 'T4 Consumable', '{"DMG2014"}', 'See book for description.', NULL, 9610.0),
('feb70172-f3ba-5b3a-9e58-5fbb00ce326f', 'LOT_0962', 'Talisman of Ultimate Evil (2014)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Wondrous item', 'Consumable', false, NULL, 'T4 Consumable', '{"DMG2014"}', 'See book for description.', NULL, 9620.0),
('80972b2e-a3a2-53fe-b19d-4fe2442b9d44', 'LOT_0963', 'Manual of Iron Golems', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Wondrous item', 'Consumable', false, NULL, 'T4 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 9630.0),
('64468bff-c9e4-5778-bddc-fc0654daf471', 'LOT_0964', 'Potion of Dragon''s Majesty (any type)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Potion', 'Consumable', false, NULL, 'T4 Consumable', '{"FTD"}', 'See book for description.', NULL, 9640.0),
('61ae53df-e327-5dd9-906a-3f9556925dc5', 'LOT_0965', 'Potion of Giant Size', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Potion', 'Consumable', false, NULL, 'T4 Consumable', '{"SKT"}', 'See book for description.', NULL, 9650.0),
('0a88963a-5fce-5c7a-b3fa-a746cb9bf6ca', 'LOT_0966', 'Potion of Storm Giant Strength', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Potion', 'Consumable', false, NULL, 'T4 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 9660.0),
('babc607b-ccbe-5f0d-b0a8-1c6a896fd602', 'LOT_0967', 'Ring of Three Wishes (1 wish)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Ring', 'Consumable', false, NULL, 'T4 Consumable', '{"DMG2014", "DMG2024"}', 'This Ring of Three Wishes has only 1 charge remaining to cast Wish. See book for description.', NULL, 9670.0),
('c6908a61-9a5c-5502-8c9e-c85394cecac2', 'LOT_0968', 'Spell Scroll (Level 9)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Scroll', 'Consumable', false, NULL, 'T4 Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 9680.0),
('c8a5172d-bef9-5f8e-801d-1356fd4dfd2f', 'LOT_0969', 'Tablet of Reawakening', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Wondrous item', 'Consumable', false, NULL, 'T4 Consumable', '{"HAT_LMI"}', 'See book for description.', NULL, 9690.0),
('c651dde5-87c0-5e71-bab5-7d06d19f85e3', 'LOT_0970', 'Amulet of the Planes', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Wondrous item', 'Permanent', false, NULL, 'T4 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 9700.0),
('b0c1196d-998c-553f-bb7e-e8209f296512', 'LOT_0971', '+3 Armor (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Armor (any)', 'Permanent', false, NULL, 'T4 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 9710.0),
('10e0d66c-e263-5fc3-969c-31347e556ab0', 'LOT_0972', 'Armor of Invulnerability (any)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Armor (any)', 'Permanent', false, NULL, 'T4 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 9720.0),
('56bfd2f4-fb2a-58e2-b9a1-4860e79cb693', 'LOT_0973', 'Belt of Fire Giant Strength', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Wondrous item', 'Permanent', false, NULL, 'T4 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 9730.0),
('78368351-3daa-5073-8bbb-bfcd4dbd2466', 'LOT_0974', 'Blade of the Planes (Sword of the Planes) (any piercing or slashing melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Weapon (any piercing or slashing melee weapon)', 'Permanent', false, NULL, 'T4 Permanent', '{"BMT"}', 'See book for description.', NULL, 9740.0),
('81226496-67ce-5c81-89cc-635172634b20', 'LOT_0975', 'Blood Fury Tattoo', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Wondrous item (tattoo)', 'Permanent', false, NULL, 'T4 Permanent', '{"TCE"}', 'See book for description.', NULL, 9750.0),
('c1b27ca1-2401-5c6f-a9ad-f13a4a8468f7', 'LOT_0976', 'Chronicle of Fools', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Wondrous item', 'Permanent', false, NULL, 'T4 Permanent', '{"HWT"}', 'See book for description.', NULL, 9760.0),
('4e53b45c-ed89-53ad-94a7-c135fe41b70a', 'LOT_0977', 'Cloak of Invisibility', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Wondrous item', 'Permanent', false, NULL, 'T4 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 9770.0),
('291eded8-261f-5238-b24a-22ea018da6bd', 'LOT_0978', 'Crystal Ball (Mind Reading, Telepathy, or True Seeing)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Wondrous item', 'Permanent', false, NULL, 'T4 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 9780.0),
('a826b296-62b6-5304-9850-433313b3eb2e', 'LOT_0979', 'Efreeti Chain (chain shirt or chain mail)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Armor (chain shirt or chainmail)', 'Permanent', false, NULL, 'T4 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 9790.0),
('2df53c56-2568-58cc-b16c-fa86182e2cc2', 'LOT_0980', 'Enspelled Armor (Level 6) (any armor)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Armor (any)', 'Permanent', false, NULL, 'T4 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 9800.0),
('6587b3c5-e1a8-5708-9472-f820fa99c6c6', 'LOT_0981', 'Enspelled Armor (Level 7) (any armor)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Armor (any)', 'Permanent', false, NULL, 'T4 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 9810.0),
('533c390e-71e0-5941-8aa7-ceca089cefc7', 'LOT_0982', 'Enspelled Staff (Level 6)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Staff', 'Permanent', false, NULL, 'T4 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 9820.0),
('dfba0cd8-8e5e-5d25-aa9f-a1b8d33c73d2', 'LOT_0983', 'Enspelled Staff (Level 7)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Staff', 'Permanent', false, NULL, 'T4 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 9830.0),
('a10d1327-f550-51d2-99c2-165f14dea2aa', 'LOT_0984', 'Enspelled Weapon (Level 6) (any weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Weapon (any)', 'Permanent', false, NULL, 'T4 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 9840.0),
('9bac76dd-d345-53c4-9958-43b76bcfa174', 'LOT_0985', 'Enspelled Weapon (Level 7) (any weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Weapon (any)', 'Permanent', false, NULL, 'T4 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 9850.0),
('91fafccf-5006-59e7-b5d7-9c92273fbbd3', 'LOT_0986', 'Euryale''s Aegis', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Armor (shield)', 'Permanent', false, NULL, 'T4 Permanent', '{"BMT"}', 'See book for description.', NULL, 9860.0),
('65b0b5a0-2e48-530b-9124-8475bff3abe6', 'LOT_0987', 'Gold Canary Figurine of Wondrous Power', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Wondrous item', 'Permanent', false, NULL, 'T4 Permanent', '{"FTD"}', 'See book for description.', NULL, 9870.0),
('25b80f6f-1987-5744-9e86-cf780a052848', 'LOT_0988', 'Hither-Thither Staff', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Staff', 'Permanent', false, NULL, 'T4 Permanent', '{"HAT_LMI"}', 'See book for description.', NULL, 9880.0),
('d2aef082-bfe0-5b9a-af8e-8994372831a1', 'LOT_0989', 'Holy Avenger (any weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Weapon (any weapon)', 'Permanent', false, NULL, 'T4 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 9890.0),
('12391897-ce7e-5076-9d2d-043ba298b200', 'LOT_0990', 'Horn of Valhalla, Bronze', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Wondrous item', 'Permanent', false, NULL, 'T4 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 9900.0),
('e3073048-bdb4-5e91-a446-8d53a8020c28', 'LOT_0991', 'Luck Weapon (Luck Blade) (any melee weapon) (1d3 charges)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Weapon (any melee weapon)', 'Permanent', false, NULL, 'T4 Permanent', '{"DMG2014", "DMG2024"}', 'This weapon has 1d3 charge to cast Wish. See book for description.', NULL, 9910.0),
('dc77ee61-0bdc-59d4-b9f3-38fdd4515045', 'LOT_0992', 'Obsidian Flint Dragon Plate', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Armor (plate armor)', 'Permanent', false, NULL, 'T4 Permanent', '{"BGDIA"}', 'See book for description.', NULL, 9920.0),
('2071c092-66c1-516b-95f4-eac7e34a9f2b', 'LOT_0993', 'Periapt of Proof Against Poison (2014)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Wondrous item', 'Permanent', false, NULL, 'T4 Permanent', '{"DMG2014"}', 'See book for description.', NULL, 9930.0),
('eb7bde3e-51e5-5877-bf24-8733f48c6e86', 'LOT_0994', 'Platinum Scarf', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Wondrous item', 'Permanent', false, NULL, 'T4 Permanent', '{"FTD"}', 'See book for description.', NULL, 9940.0),
('aeb5495a-a9e4-5e46-8f37-25cc196761a7', 'LOT_0995', 'Ring of Air Elemental Command', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Ring', 'Permanent', false, NULL, 'T4 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 9950.0),
('3d0286be-076b-59cd-bf00-ba67b05403b5', 'LOT_0996', 'Ring of Earth Elemental Command', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Ring', 'Permanent', false, NULL, 'T4 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 9960.0),
('07703e02-2092-53f0-bba7-f75f3046ee47', 'LOT_0997', 'Ring of Fire Elemental Command', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Ring', 'Permanent', false, NULL, 'T4 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 9970.0),
('71bcfed5-8d23-5896-a5c6-d410a4bd72dd', 'LOT_0998', 'Ring of Water Elemental Command', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Ring', 'Permanent', false, NULL, 'T4 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 9980.0),
('fcd1fc89-6c7d-5eb7-9206-382336d4b220', 'LOT_0999', 'Greater Ring of Invisibility (Ring of Invisibility (2024))', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Wondrous item', 'Permanent', false, NULL, 'T4 Permanent', '{"DMG2024"}', 'See book for description.', NULL, 9990.0),
('33425dc1-90a9-59c9-992a-ddc9298b4fa6', 'LOT_1000', 'Ruby Weave Gem', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Wondrous item', 'Permanent', false, NULL, 'T4 Permanent', '{"FTD"}', 'See book for description.', NULL, 10000.0);

INSERT INTO public.ac_loot (
    id, check_id, name, category_id, tier_id, type, nature, is_dm_select, event_category, tier_display, source, description, notes_advice, display_order
) VALUES
('1167e967-ed3c-5124-b89a-7e5264fbc9d6', 'LOT_1001', '+3 Shield', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Armor (shield)', 'Permanent', false, NULL, 'T4 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 10010.0),
('d63b7ede-6735-53fa-a8e4-ac8e50cbec38', 'LOT_1002', 'Shield of the Uven Rune', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Armor (shield)', 'Permanent', false, NULL, 'T4 Permanent', '{"WDMM"}', 'See book for description.', NULL, 10020.0),
('846ecf69-00c7-517a-8e5e-47886d123f59', 'LOT_1003', 'Staff of Power', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Staff', 'Permanent', false, NULL, 'T4 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 10030.0),
('47d8d9e5-01f7-5684-a105-f074f374a14b', 'LOT_1004', 'Stonebreaker’s Armor (Stonebreaker’s Breastplate) (any medium or heavy armor except hide)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Armor (any medium or heavy armor except hide)', 'Permanent', false, NULL, 'T4 Permanent', '{"BGG"}', 'See book for description.', NULL, 10040.0),
('1185634c-5525-5d4d-b92a-74e9b05907df', 'LOT_1005', 'Vorpal Weapon (Vorpal Sword) (any slashing melee weapon)', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Weapon (any slashing melee weapon)', 'Permanent', false, NULL, 'T4 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 10050.0),
('54f0d42d-250f-5950-8171-be78b8436535', 'LOT_1006', 'Well of Many Worlds', 'd0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T4'), 'Wondrous item', 'Permanent', false, NULL, 'T4 Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 10060.0),
('0477c144-6226-5c07-aef9-1d049952ed49', 'LOT_1007', 'Flashstick (HB)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Adventuring gear', 'Consumable', false, NULL, 'T1 Select Consumable', '{"HHB"}', 'Adventuring gear

A flashstick is an alchemical, nonmagical item, a long parchment wrapped stick with a short fuse. As an action, a creature can light the fuse and throw the flashstick at a point up to 60 feet away where it detonates. Each creature within 10 feet of a detonating flashstick must succeed on a DC 15 Constitution saving throw or become Blinded for 1 minute. A creature can repeat this saving throw at the end of each of its turns, ending the effect on a success.

Base Cost: 200 GP
Crafting Cost: See Equipment', NULL, 10070.0),
('95f1567a-7ddc-58f5-b5b4-80c951a5147a', 'LOT_1008', 'Sharper (HB)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Adventuring gear', 'Consumable', false, NULL, 'T1 Select Consumable', '{"HHB"}', 'Adventuring gear

A Sharper is an alchemical, nonmagical item with an spherical brittle iron shell with a short fuse. As an action, a creature can light the fuse and throw the sharper at a point up to 60 feet away where it detonates. Each creature within 10 feet of a detonating sharper must succeed on a DC 15 Dexterity saving throw or take 3d6 Piercing damage and have their Speed reduced to 0 until the end of their next turn.

Base Cost: 200 GP
Crafting Cost: See Equipment', NULL, 10080.0),
('eaefd3e6-3615-554e-bb65-17541d8a3a3b', 'LOT_1009', 'Soul Coin', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Wondrous item', 'Consumable', false, NULL, 'T1 Select Consumable', '{"BGDIA"}', 'See book for description.

Base Cost: 200 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 10090.0),
('5ba8de59-0e99-5d03-bb95-5bdfd3f36952', 'LOT_1010', 'Tosser Grenade (HB)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Adventuring gear', 'Consumable', false, NULL, 'T1 Select Consumable', '{"HHB"}', 'Adventuring gear

A tosser grenade is an alchemical, nonmagical item with an circular clay shell that shatters on impact. As an action, a creature can throw a tosser grenade at a point up to 60 feet away. Each creature within 10 feet of a shattered tosser grenade must succeed on a DC 15 Strength saving throw or take 2d8 Thunder damage and be knocked Prone.

Base Cost: 200 GP
Crafting Cost: See Equipment', NULL, 10100.0),
('654c765e-7564-54a5-b50a-987b7f58a1db', 'LOT_1011', 'Arcane Propulsion Arm', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Select Permanent', '{"ERLW"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Tinker''s Tools', NULL, 10110.0),
('2af0fa29-cec7-5b76-99f2-9a9432b77f4f', 'LOT_1012', 'All Purpose Knife (HB)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Wondrous item', 'Permanent', true, NULL, 'T1 Select Permanent (DM Select)', '{"HHB"}', 'Wondrous item, T1

This compact, versatile tool contains an array of foldable components cleverly housed within a single durable casing. You can take a Utilize action to unfold one of the following tools of your choice: Thieves'' Tools, Tinker''s Tools, Smith''s Tools, or Woodcarver''s Tools. You have Advantage on ability checks made with one of the knife''s tools while holding it.

Base Cost: 400 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 10120.0),
('7a012b65-b5b7-5937-9c6f-de7d81b447b3', 'LOT_1013', 'Blod Stone', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Select Permanent', '{"SKT"}', 'See book for description.

Base Cost: See Equipment
Crafting Cost: See Equipment', NULL, 10130.0),
('25715760-998e-5998-ba70-e91c1495487d', 'LOT_1014', 'Bowl of Never-Ending Ramen (HB)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Wondrous Item', 'Permanent', true, NULL, 'T1 Select Permanent (DM Select)', '{"HHB"}', 'Wondrous Item, T1

The first step to martial prowess is a good meal. This wide ceramic bowl is painted with looping waves and tiny golden koi along the rim. The inside always feels faintly warm, and it smells faintly of garlic, sesame, and something you can’t quite name but makes you hungry.

This bowl has 3 charges and regains all expended charges daily at dawn. While holding it, you can take a Magic action to use the bowl''s command word and expend 1 charge to create a steaming portion of ramen in the bowl. A creature can spend 10 minutes to consume the ramen and regain a number of Hit Points equal to 2d8 + its Constitution modifier. One portion of ramen provides enough nourishment to sustain a creature for one day.

Base Cost: 400 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 10140.0),
('3a718164-1298-5d89-8cb1-957c2a987a5e', 'LOT_1015', 'Hag Eye', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Select Permanent', '{"DMG2024"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 10150.0),
('4151adab-9e23-5a54-8e83-ace1032695db', 'LOT_1016', 'Harper Pin (Silver)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Select Permanent', '{"FRAIF"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 10160.0),
('7fcffa82-cf66-58ba-b92f-670fde7a14df', 'LOT_1017', 'Lesser Harper Pin (HB)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Select Permanent', '{"HHB"}', 'Wondrous item, T1 (Requires Attunement)

This silver brooch is embossed with the symbol of the Harpers, depicting a harp against a crescent moon. This brooch is presented to dedicated members among the Harpers.

While wearing this pin, you gain the following benefits.

Mind Shielding. You are immune to magic that allows other creatures to read your thoughts, determine whether you are lying, know your alignment, or know your creature type. Creatures can telepathically communicate with you only if you allow it.

Telepathic Detection. The pin grows warm if a creature within 30 feet of yourself attempts to use telepathy to communicate.

Base Cost: 400 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 10170.0),
('642d98a9-3d10-56f9-a373-a17e0625aba4', 'LOT_1018', 'Hellfire Weapon (any weapon)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Weapon (any)', 'Permanent', false, NULL, 'T1 Select Permanent', '{"BGDIA"}', 'See book for description.

Base Cost: 400 GP (plus cost of weapon)
Crafting Cost: N/A (cannot be crafted)', NULL, 10180.0),
('62925141-e078-569d-a0b0-506d15c08675', 'LOT_1019', 'Nazz Lifeline Garter (HB)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Select Permanent', '{"HHB"}', 'Wondrous item, T1

Developed by the Nazz Free Health Clinic, this compact thigh-strapped garter rig combines basic alchemy with simple arcano-mechanical sensing. Two potion vials rest in fitted holsters along the outside of the leg, connected to a small automatic injector that monitors the wearer’s vitals. When danger spikes and the wearer’s condition worsens, the device attempts to deliver emergency treatment faster than most healers can respond.

A small inscription sewn into the inside of the Garter says, "Do not remove." Written below is a potion miscibility reminder as a disclaimer: "Nazz Free Health Clinic is not responsible for any unintended side effects or medical consequences of potion overdose or cataclysmic potion combinations." This item is worn as a thigh-strapped garter rig and can hold up to two Potions of Healing. It is found empty.

You can use a Magic action to load one Potion of Healing into the garter. Immediately after you take damage while you are Bloodied but have at least 1 Hit Point, you can use a Reaction to have the garter inject one of the Potions of Healing into you. When an injection occurs, roll a 1d10. On a 1, the device jams and the potion is not injected. When a potion is injected, the garter consumes it, and you regain maximum Hit Points from that potion.

Base Cost: 400 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 10190.0),
('0b1830d5-fab9-5b83-b363-bff2486f5521', 'LOT_1020', 'A New Leaf (HB)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Wondrous item', 'Permanent', true, NULL, 'T1 Select Permanent (DM Select)', '{"HHB"}', 'Wondrous item, T1

This brooch or hair clip is a shimmering lotus leaf. This ornament is presented to dedicated members among the Prismatic Lotus. While wearing this ornament, you have Advantage on Intelligence (History) checks and you have Advantage on Charisma checks made to obtain information.

Base Cost: 400 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 10200.0),
('c7463ac4-b8fe-5b04-a3ab-5280b59b3d65', 'LOT_1021', 'Professor Orb', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Select Permanent', '{"WDMM"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 10210.0),
('ac60208d-e710-5b98-970d-38c78e164587', 'LOT_1022', 'Reliquary of Dawn', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Select Permanent', '{"LFL"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 10220.0),
('971f9a73-dbbf-5024-be2d-25198bfa9bd5', 'LOT_1023', 'Reliquary of Twilight', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Select Permanent', '{"LFL"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 10230.0),
('586192eb-7911-554d-9388-0f8f2f6a064d', 'LOT_1024', 'Ring of Mind Shielding (contains a soul)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Ring', 'Permanent', false, NULL, 'T1 Select Permanent', '{"DMG2014", "DMG2024"}', 'A Ring of Mind Shielding that already contains a soul inside it. See book for description.

Base Cost: 400 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 10240.0),
('7b571928-914d-5990-a32a-a50af28a215f', 'LOT_1025', 'Teacup of Endless Clarity (HB)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Wondrous Item', 'Permanent', true, NULL, 'T1 Select Permanent (DM Select)', '{"HHB"}', 'Wondrous Item, T1

This porcelain teacup is painted with a ring of tiny stars along the lip. The tea inside always steams faintly, regardless of temperature, and smells like a mix of jasmine, mint, and an indefinable ancient sweetness.

This teacup has 3 charges for the following properties and regains all expended charges daily at dawn. 

Clarifying Brew. You can take a Magic action to use the teacup''s command word and expend 1 charge to create steaming tea within the teacup. You can spend 1 minute drinking the tea and gain Advantage on the next Intelligence (Arcana, History, Investigation, or Nature) check you make within the next hour.

Energizing Brew. When you finish a Short Rest while the teacup is on your person, you can expend 1 charge and regain one expended level 1 spell slot. Once used, this property can''t be used again until the next dawn. 

Base Cost: 400 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 10250.0),
('cba1dbc2-95f8-5d37-a15f-305fe1744c7c', 'LOT_1026', 'Thayan Spell Tattoo', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Select Permanent', '{"FRHOF"}', 'See book for description.

Base Cost: 50 GP (level 1) / 200 GP (level 2) / 300 GP (level 3)
Crafting Cost: 2 DTP (level 1) / 5 DTP (level 2) / 8 DTP (level 3)', NULL, 10260.0),
('c6b37ff9-7740-5343-a58c-c190f96046c7', 'LOT_1027', 'Wheel of Wind and Water', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Select Permanent', '{"ERLW"}', 'See book for description.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Tinker''s Tools', NULL, 10270.0),
('a23f3336-fb9a-5ea7-bdd0-895bf6c33424', 'LOT_1028', 'Blood of the Lycanthrope Antidote', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Potion', 'Consumable', false, NULL, 'T2 Select Consumable', '{"IMR"}', 'See book for description.', NULL, 10280.0),
('d9873d93-ad5e-5756-9d72-6947eb7ab21d', 'LOT_1029', 'Infernal War Machine Schematic (HB)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Wondrous item', 'Consumable', false, NULL, 'T2 Select Consumable', '{"HHB"}', 'Wondrous Item, T2

This schematic contains information and infernal rites necessary to make a particular kind of infernal war machine. To decipher and use the schematic, you must be proficient in Smith''s Tools or Tinker''s Tools and either be a spellcaster with at least two 3rd-level spell slots or have an additional amount of Soul Coins as listed below. A creature that can''t use an Infernal War Machine Schematic and attempts to use it instead takes 6d6 Psychic damage.

The type of Infernal War Machine Schematic is either chosen by the DM or determined randomly by rolling on the following table.

d20       Machine            Time          Cost*
1 - 5      Tormentor           9 days       3,000 GP or 4 Soul Coins
6 - 17    Devil''s Ride        9 days       1,500 GP or 4 Soul Coins
18 - 19  Scavenger          27 days     7,500 GP or 8 Soul Coins
20         Demon Grinder   27 days     10,000 GP or 8 Soul Coins

* The listed amount of Soul Coins can be used as an additional amount of Soul Coins to substitute for the requirement of being a spellcaster with at least two 3rd-level spell slots. You must still be proficient in either Smith''s Tools or Tinker''s Tools. These additional Soul Coins must be expended in addition to the normal cost in gold or Soul Coins create the infernal war machine.

To create an infernal war machine, you must spend the time shown on the table, working without interruption with the schematic in hand and resting no more than 8 hours per day. You must also either pay the specified cost to purchase supplies or have the required number of Soul Coins to consume instead.

Once you finish creating the infernal war machine, the schematic is consumed in hellish flames.', NULL, 10290.0),
('1a6e9af2-fbfb-5e13-a8eb-78e58b89269e', 'LOT_1030', 'Mummy Rot Antidote', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Potion', 'Consumable', false, NULL, 'T2 Select Consumable', '{"IMR"}', 'See book for description.', NULL, 10300.0),
('f51fc15d-edc8-58f0-aa73-8064b0e5bd8c', 'LOT_1031', 'Teleportation Tablet', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Wondrous item', 'Consumable', false, NULL, 'T2 Select Consumable', '{"CRCotN"}', 'See book for description.', NULL, 10310.0),
('30f989ea-a37d-57a5-80d5-a4338761b9bb', 'LOT_1032', 'Badge of the Alliance (HB)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Select Permanent', '{"HHB"}', 'Wondrous item, T2 (Requires Attunement)

Emblazoned upon this badge is the symbol of a crown, marking one as a ranking member of the Lords'' Alliance. These badges are frequently given to Stingblades of the Lords'' Alliance after earning the trust of the Lords'' Alliance for their actions and marks their authority to act as entrusted agents of the Alliance.

While wearing this badge, you gain a +2 bonus to AC if you aren''t using a shield.

Additionally, while wearing this badge, you can cast the Command spell from it (save DC 17).', NULL, 10320.0),
('1ae4e9f4-848b-5e5f-985c-1e3a62fd1b75', 'LOT_1033', 'Banner of the Dread Legion (HB)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Wondrous item', 'Permanent', true, NULL, 'T2 Select Permanent (DM Select)', '{"HHB"}', 'Wondrous item, T2 (Requires Attunement)

This banner is emblazoned with the symbol of the Legion of Dread and measures 5 feet high and 3 feet wide. Such banners are often granted to field commanders in the Legion of Dread to mark their authority. It can be attached to a 10-foot pole to serve as a standard. Furling or unfurling the banner requires an action. 

You can use a Magic action while holding the banner while it is unfurled to create a 10-foot Emanation originating from the banner, which lasts until you let go of the banner, have the Incapacitated condition, or use a Bonus Action to end it. When you create this Emanation, choose one of the options below:
- Attack. While in the Emanation, you can take a Bonus Action on each of your turns to inspire a charge: each creature of your choice within the Emanation can take a Reaction to move up to their Speed toward you and has Advantage on its next attack roll before the end of your next turn.
- Defend. You and allies in the Emanation while it lasts are immune to the Prone condition and have Advantage on saving throws made to avoid or end the Charmed and Frightened conditions.', NULL, 10330.0),
('3851b04b-f63f-52a7-a6f0-0bae942e56df', 'LOT_1034', 'Docent', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Select Permanent', '{"ERLW"}', 'See book for description.', NULL, 10340.0),
('654fae12-0bf5-50ff-aae5-962dd81aa674', 'LOT_1035', 'Emerald Cloak (HB)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Wondrous Item', 'Permanent', false, NULL, 'T2 Select Permanent', '{"HHB"}', 'Wondrous Item, T2 (Requires Attunement)

Subtly displayed on the back of this green cloak is the profile of a silhouetted stag, the symbol of the Emerald Enclave. This cloak is presented to members of the Emerald Enclave for demonstrating their relability as faction agents and in carrying out significant duties and tasks.

This cloak has the properties of a Nature''s Mantle and you have Advantage on Dexterity (Stealth) checks while wearing this cloak. 

Additionally, while wearing this cloak, you can use a Bonus Action to cast the Tree Stride spell from this cloak except that the spell''s duration is 1 round. This property of the cloak can''t be used again until the next dawn.', NULL, 10350.0),
('d4749df3-46c8-5996-b2ca-760dd6d8b5ed', 'LOT_1036', 'GEAR Pyrojector (HB)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Wondrous item', 'Permanent', true, NULL, 'T2 Select Permanent (DM Select)', '{"HHB"}', 'Wondrous Item, T2 (Requires Attunement)

This short tube, about 2 feet long and 6 inches in diameter, is a modified Mizzium Mortar that has been further enhanced by inventors of GEAR. The end that''s pointed toward a target is open, and a glowing ball of molten metal can be seen at the other end as long as the tube has at least 1 charge remaining.

The GEAR Pyrojector has 6 charges for the following properties. It regains 1d6 expended charges daily at dawn.

Molten Wave. While holding the tube, you can take a Magic action to expend 1 charge and unleash a wave of molten destruction in a 30-foot Cone. Each creature in the area must make a DC 15 Dexterity saving throw, taking 5d6 Fire damage on a failed save, or half as much damage on a successful one.

Molten Bombard. While holding the tube, you can take a Magic action to expend 3 charges to unleash a blast of molten rock and make a ranged spell attack with a +7 bonus to hit against one creature within 60 feet of yourself. On a hit, the target takes 8d6 Fire damage and has the Blinded condition until the end of its next turn.', NULL, 10360.0),
('750dfd34-df18-5f9c-90d7-4bc49643b593', 'LOT_1037', 'Guild Keyrune', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Select Permanent', '{"GGR"}', 'See book for description.', NULL, 10370.0),
('cf694dd0-574a-5b7b-a52a-9666d3909812', 'LOT_1038', 'Herbarium of Natural Magics (HB)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Wondrous item', 'Permanent', true, NULL, 'T2 Select Permanent (DM Select)', '{"HHB"}', 'Wondrous item, T2 (Requires Attunement by a Wizard)

To you, this book, bound in green, leaf-like leather, is a magical spellbook.  To anyone else, this book appears to be an illustrated manuscript featuring depictions of plants, astronomical diagrams, and maps with lines that crisscross the land, with text that doesn’t appear to resemble any known script in any known language.  While attuned to this book, the text rearranges itself into a language you know. 

When found, the book contains the following spells, which are wizard spells for you while you are attuned to the book: Blight, Control Weather, Entangle, Erupting Earth, Locate Animals or Plants, Shape Plants, and Tree Stride. It functions as a spellbook for you.

While you are holding the book, you can use it as a spellcasting focus for your wizard spells.

The book has 3 charges, and it regains 1d3 expended charges daily at dawn. You can use the charges in the following ways while holding it:
- If you spend 1 minute studying the book, you can expend 1 charge to replace one of your prepared wizard spells with a different spell in the book. The new spell must also be on the Druid class spell list.
- You call upon the magic within the land and environment to aid you in your efforts.  When you cast a Wizard spell that has an area of effect, you can expend 1 charge to turn the ground within the area into Difficult Terrain. This Difficult Terrain appears where the area of effect initially appears and lasts for 1 minute.', NULL, 10380.0),
('2294246c-fb88-5143-80d0-21204b8303fd', 'LOT_1039', 'Infernal Puzzle Box', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Select Permanent', '{"BGDIA"}', 'See book for description.', NULL, 10390.0),
('323ec0a5-f66d-5af1-86cd-452ac591352d', 'LOT_1040', '+1 Robe of the Order (HB)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Wondrous Item', 'Permanent', false, NULL, 'T2 Select Permanent', '{"HHB"}', 'Wondrous Item, T2 (Requires Attunement by a Mystic)

This robe bears psionic sigils and symbols. 

While wearing the robe, you gain a +1 bonus to the attack rolls and saving throw DCs of your Psionic Talents and Psionic Disciplines.

While wearing the robe, you can take a Magic Action to regain a number of expended Psi Points equal to your Psi Limit. Once this property is used, it can''t be used again until the next dawn.', NULL, 10400.0),
('bbb461aa-9f4b-539e-930f-631a4db98930', 'LOT_1041', 'Sage''s Sight (HB)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Wondrous item', 'Permanent', true, NULL, 'T2 Select Permanent (DM Select)', '{"HHB"}', 'Wondrous item, T2 (Requires Attunement)

The gem you received when you originally joined the Court of Dunes has been upgraded and imbued with a greater capacity to perceive hidden truths. 

This gem has the properties of a Gem of the Dune Court and a Gem of Seeing.', NULL, 10410.0),
('4718cc53-7fa0-536f-b4cd-5ff1674478a2', 'LOT_1042', 'Spelljamming Helm', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Select Permanent', '{"AAG"}', 'See book for description.', NULL, 10420.0),
('ec64a400-ecd8-510d-afdd-a35c679f82d6', 'LOT_1043', 'Unseen Blade (HB)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Weapon (Shortsword)', 'Permanent', true, NULL, 'T2 Select Permanent (DM Select)', '{"HHB"}', 'Weapon (Shortsword), T2 (Requires Attunement)

You have a +1 bonus to attack and damage rolls made with this magic weapon. The weapon deals an extra 2d6 damage on a hit while you have the Invisible condition.

Slip Into Shadow. When you reduce an enemy to 0 Hit Points with an attack using this weapon, you gain the Invisible condition until the end of your next turn or until you make an attack roll, deal damage, or cast a spell.

Slash Dash. This weapon has 7 charges and regains 1d6 + 1 expended charges daily at dawn. When you make an attack with this weapon, you can expend 1 charge to teleport to an unoccupied space you can see within 10 feet of yourself. You can teleport immediately before or after you make the attack roll.', NULL, 10430.0),
('9125e393-0409-5745-b0cd-41d09301827d', 'LOT_1044', 'Weapon of the Warden (HB) (any melee weapon)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Weapon (any melee weapon)', 'Permanent', false, NULL, 'T2 Select Permanent', '{"HHB"}', 'Weapon (Any Melee Weapon), T2 (Attunement Optional)

Attuning to this weapon takes only 1 minute.

Warding Weapon (Requires Attunement). You have a +1 bonus to attack and damage rolls made with this magic weapon, and you have a +1 bonus to AC while holding it. 

Spirit Guardians (Requires Attunement). While holding this magic weapon, you can cast the Spirit Guardians spell (save DC 15) from it. This property of the weapon can''t be used again until the next dawn.', NULL, 10440.0),
('c9eacd27-2ed4-566b-bd7a-5afa2701f58c', 'LOT_1045', 'Zhentilar Tattoo (HB)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Wondrous Item (Tattoo)', 'Permanent', false, NULL, 'T2 Select Permanent', '{"HHB"}', 'Wondrous item (tattoo), T2

Produced by a special needle, this magic tattoo appears on your body as a Flying Snake which moves about your skin to avoid being seen by others. This tattoo is given to committed members of the Zhentarim, marking their irrevocable dedication to the Black Network for the remainder of their life.

Zhentilar Dedication. To apply this tattoo, you hold the needle to your skin where you want the tattoo to appear, pressing the needle there for duration of a Short Rest. When you finish the Short Rest, the needle turns into the ink that has become the tattoo, which appears on the skin. After the tattoo is applied, it cannot be removed from you unless you die or are targeted with a Wish spell or Divine Intervention, in which case the tattoo vanishes and the needle reappears in your space. 

Tattoo Attunement. You can only attune to this tattoo if it has been applied to you.

Shadowy Acts (Requires Attunement). You have Advantage on Dexterity (Stealth) and Charisma (Intimidation) checks. Additionally, while you are in Dim Light or Darkness, you can Hide as a Bonus Action even if you are being directly observed.

Zhentarim Diplomacy (Requires Attunement). This tattoo has 6 charges and regains 1d6 expended charges daily at dusk. You can expend 1 or more of the tattoo''s charges to cast one of the following spells from it (save DC 15): Command (1 charge), Fear (3 charges), or Suggestion (2 charges).', NULL, 10450.0),
('6b86b4d7-aaa5-58cf-ab3d-12ce83e24a56', 'LOT_1046', 'Disintegration Baton', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Rod', 'Consumable', false, NULL, 'T3 Select Consumable', '{"HHB"}', 'Rod, T3

This standard issue defensive tool is issued to security checkpoint guards of the Spelljammer Academy. 

While holding this rod, you can take a Bonus Action to cause the tip of the rod to glow with crackling energy, which emits dim light in a 5-foot radius, or cause the tip to no longer glow with energy. 

While the tip is glowing with energy, you can take a Magic action to direct the glowing tip towards a creature or object you can see within 5 feet of you. The tip makes a melee weapon attack roll with a +9 bonus. On a hit, the tip deals 10d6 + 40 force damage to the target.

If this damage reduces it to 0 Hit Points, it and everything nonmagical it is wearing and carrying are disintegrated into gray dust. The target can be revived only by a True Resurrection or a Wish spell.

This attack automatically disintegrates a Large or smaller nonmagical object or a creation of magical force. If such a target is Huge or larger, this spell disintegrates a 10-foot-Cube portion of it.

After a successful attack, the baton disintegrates to gray dust with its energy spent.', NULL, 10460.0),
('e205614b-50c0-5273-89e4-2d26c89525f9', 'LOT_1047', 'Conch of Teleportation', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Select Permanent', '{"SKT"}', 'See book for description.', NULL, 10470.0),
('ab157f3a-9714-5d1a-811e-783157c77c99', 'LOT_1048', 'Greater Boogie Woogie Bells (HB)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Wondrous item', 'Permanent', true, NULL, 'T3 Select Permanent (DM Select)', '{"HHB"}', 'Wondrous item, T3 (Requires Attunement)

This set of bells has 6 charges for the following properties, which you can use while the bells are on your person. The bells regain 1d4 + 2 expended charges daily at dawn.

Boogie. When you or a creature you can see within 30 feet becomes the target of an attack roll while you have at least one hand free and another free hand of a creature is within 5 feet (which can include yourself), you can take a Reaction to expend 1 charge from the bells and clap your free hand against another free hand of a creature within 5 feet (which can include yourself). 

Both the target and another creature you can see within 30 feet teleport, swapping places. The other teleported creature becomes the target of the attack instead. If the attack roll hits you in this way, and the attacker is within 5 feet of yourself, you can make a melee weapon attack against the attacker as part of this same Reaction. An unwilling creature must succeed on a DC 17 Wisdom saving throw to resist this effect, causing the swap to fail if either creature succeeds on the saving throw. 

Woogie. You can take a Bonus Action while you have at least one hand free and another free hand of a creature is within 5 feet (which can include yourself) to expend 1 charge from the bells and clap your free hand against another free hand of a creature within 5 feet (which can include yourself). 

Two creatures you can see within 30 feet of yourself (which can include yourself) both teleport, swapping places. An unwilling creature must succeed on a DC 17 Wisdom saving throw to resist this effect, causing the swap to fail if either creature succeeds on the saving throw. 

Scatter. You can expend 3 charges to cast the Scatter spell (save DC 17) from the bells.

Tempo. An ally that is teleported by the properties of the bells has Advantage on attack rolls and its Speed doubled until the end of its next turn. An enemy that is teleported by the properties of the bells has Disadvantage on attack rolls and its Speed halved until the end of its next turn.', NULL, 10480.0),
('e8678bf5-c004-5627-9d9d-caed089ed856', 'LOT_1049', 'Harp of Gilded Plenty', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Select Permanent', '{"BGG"}', 'See book for description.', NULL, 10490.0),
('1c432757-8d5c-55c6-a7e0-17dc909c9cac', 'LOT_1050', 'Infernal Tack', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Select Permanent', '{"MTF"}', 'See book for description.', NULL, 10500.0),
('3a1bf7a3-871c-52c0-8ac6-0d5140767efb', 'LOT_1051', 'Ink of the Living Legacy (HB)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Wondrous Item (tattoo)', 'Permanent', true, NULL, 'T3 Select Permanent (DM Select)', '{"HHB"}', 'Wondrous Item (tattoo), T3 (Requires Attunement)

This intricate magical tattoo runs across your forearm, shoulder, or back in flowing lines of ink that shift faintly with your heartbeat. At rest, the design depicts your mentor, teacher, or other important guiding figure, stylized in an iconic pose. When activated, the ink glows and briefly animates, peeling away from your skin as an ethereal figure.

This tattoo has a number of charges equal to your Proficiency Bonus for the following properties and it regains all expended charges daily at dawn.

Mentor''s Strike. The spectral image of your mentor strikes with you and steels your resolve. When you hit a creature with a weapon attack, you can expend 1 charge to deal an extra 4d6 Force damage to the target. If this attack reduces the target to 0 Hit Points, you gain Temporary Hit Points equal to your level.

Shrine Maiden''s Blessing. You can call forth a serene shrine maiden in a burst of shimmering paper charms. You can expend 2 charges to cast the Lesser Restoration spell from the tattoo.', NULL, 10510.0),
('d53fdef1-1289-59bf-b6b5-917e3202ee6c', 'LOT_1052', 'Mantle of the Gilded (HB)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Wondrous item', 'Permanent', true, NULL, 'T3 Select Permanent (DM Select)', '{"HHB"}', 'Wondrous item, T3 (Requires Attunement)

As a member of the Gilded Accord, you have been gifted a mantle imbued with the power of the gold dragon Aurelian, founder of the Gilded Accord. 

This mantle has the properties of a Cloak of Protection. 

Additionally while wearing this mantle, you can cast the the Flame Strike spell (save DC 15) or Zone of Truth spell (save DC 15) from it. Once the mantle has been used to cast a spell, it can''t be used to cast that spell again until the next dawn.', NULL, 10520.0),
('354fd7c5-6f92-565a-b3fb-bdd85ecc275d', 'LOT_1053', 'Mirror of Life Trapping', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Select Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 10530.0),
('b9f55baa-5636-566f-9124-58a9087cb203', 'LOT_1054', 'Navigation Orb', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Select Permanent', '{"SKT"}', 'See book for description.', NULL, 10540.0),
('2795407e-6169-533d-83fd-9f4596029c2c', 'LOT_1055', 'Nightfall Pearl', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Select Permanent', '{"EGW"}', 'See book for description.', NULL, 10550.0),
('f2479fa8-fcfb-5a66-98e0-95d40b355a5e', 'LOT_1056', 'Pendant of the Arcane Echo (HB)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Wondrous Item', 'Permanent', true, NULL, 'T3 Select Permanent (DM Select)', '{"HHB"}', 'Wondrous Item, T3 (Requires Attunement by a Spellcaster)

Suspended from this silver chain is a smooth gemstone that swirls with faint starlight. At certain angles, you see brief, flickering afterimages of yourself casting spells as if the pendant is replaying memories of your magic.

The pendant has a number of charges equal to your Proficiency Bonus and regains all expended charges daily at dawn. You can use the following properties while wearing the pendant.

Arcane Renewal. You can spend 1 minute in deep focus and regain one expended spell slot of level 3 or lower. Once used, this property can''t be used again until the next dawn.

Empower the Effect. When you roll damage for a spell or roll dice to determine the number of Hit Points a spell restores, you can expend 1 charge and reroll a number of dice up to your spellcasting ability modifier, and you must use the new rolls.

Perfect the Weave. If you miss a spell attack roll or fail a Constitution saving throw made to maintain Concentration, you can expend 1 charge and reroll the d20, and you must use the new roll.', NULL, 10560.0),
('2c52cc9c-cef9-5e2d-b288-6b1db7400d97', 'LOT_1057', 'Planar Puzzle Cube (HB)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Select Permanent', '{"HHB"}', 'Wondrous item, T3
 
A planar puzzle cube is an 8-inch magical cube made of gold, iron, crystal, and copper and is magically linked to a specific demiplane. A functioning puzzle cube can be solved with 30 minutes of work and a successful DC 25 Intelligence (Investigation) check (the cube’s creator automatically succeeds on this check and takes only 1 minute of work). When the cube is solved, a 30-foot diameter portal appears before the creature who solved the cube, leading to the demiplane linked to the cube. The portal is two-way and remains open for 10 minutes or until a creature uses an action to change the puzzle’s configuration. The puzzle cube can be used in the linked demiplane to function in reverse and exit by repeating the check after 30 minutes of work, opening a portal to the creature’s last location before entering the demiplane (the cube’s creator automatically succeeds on the check and takes only 1 minute of work).', NULL, 10570.0),
('6fc65dd2-1d10-508d-8ef1-699da83dc9f6', 'LOT_1058', 'Reinforced Glassteel Plate (HB)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Armor (Breastplate, Half Plate, or Plate Armor)', 'Permanent', true, NULL, 'T3 Select Permanent (DM Select)', '{"HHB"}', 'Armor (Breastplate, Half Plate, or Plate Armor), T3 (Requires Attunement)

This extraordinary set of transparent armor is made of glassteel, a wondrous substance that is as transparent as glass and stronger than steel. This particular variant has been reinforced by secret techniques known to the master smiths of Evereska.

This armor is half its normal weight and if the armor normally imposes disadvantage on Dexterity (Stealth) checks or has a Strength requirement, this version of the armor doesn''t.

While wearing this armor, you have Resistance to two of the following damage types: Bludgeoning, Piercing, or Slashing. The DM chooses the types or determines them randomly.', NULL, 10580.0),
('9245e671-3c89-5cad-b824-28cd5e15ac1c', 'LOT_1059', 'Sword of Answering (any)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Weapon (longsword)', 'Permanent', false, NULL, 'T3 Select Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 10590.0),
('2af0579d-b803-55d0-b5e1-0245a5682467', 'LOT_1060', 'Ring of Three Wishes (2 wishes)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Ring', 'Consumable', false, NULL, 'T4 Select Consumable', '{"DMG2014", "DMG2024"}', 'This Ring of Three Wishes has 2 charges remaining to cast Wish as written. See book for description.', NULL, 10600.0),
('585fb21b-0741-5271-bbda-1c703a3c3510', 'LOT_1061', 'Ring of Three Wishes (3 wishes)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Ring', 'Consumable', false, NULL, 'T4 Select Consumable', '{"DMG2014", "DMG2024"}', 'This Ring of Three Wishes has 3 charges remaining to cast Wish as written. See book for description.', NULL, 10610.0),
('b3e634bf-5bd9-58e3-a301-d9e050f6800b', 'LOT_1062', 'Tome of the Dragon', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Wondrous Item', 'Consumable', false, NULL, 'T4 Select Consumable', '{"FRAIF"}', 'See book for description.', NULL, 10620.0),
('1793b089-14e0-5211-acc2-e8978ca3b521', 'LOT_1063', 'Crown of the Alliance (HB)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T4 Select Permanent', '{"HHB"}', 'Wondrous item, T4 (Requires Attunement)

This golden crown is forged in the shape of two rearing lions. This crown is immediately recognizable as a symbol of the Lords'' Alliance and is often presented to those that have become a Lioncrown, the highest rank in the leadership of the Lords'' Alliance. 

The crown has 7 charges and regains 1d6 + 1 expended charges daily at dawn, and has the following properties.

Resolve. While you wear this crown, you have Resistance to Psychic damage and have Immunity to the Charmed and Frightened conditions. Additionally, each ally within 30 feet of you has Advantage on saving throws made to avoid or end the Charmed or Frightened condition. 

Inspiration. While wearing this crown, you can take a Bonus Action to expend 1 charge from the crown and inspire one creature you can see that is within 30 feet of you and that can see or hear you. Once within the next hour when the inspired creature makes a D20 Test, the inspired creature can roll 1d6 and add the number rolled to the d20. 

Spells. While wearing this crown, you can expend 1 or more of the crown''s charges to cast one of the following spells from it: Aid (level 4 version, 4 charges), Circle of Power (5 charges), Crusader''s Mantle (3 charges), or Heroism (5 Temporary Hit Points, 1 charge).', NULL, 10630.0),
('dc6b4b5d-8d93-524c-ae2a-8c924f266d65', 'LOT_1064', 'Faceless Eyes of the Zhentarim (HB)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T4 Select Permanent', '{"HHB"}', 'Wondrous Item, T4 (Requires Attunement)

This stylized hood of black and gold leaves only the eyes visible. This hood is immediately recognizable as a symbol of the Black Network and is often presented to those that have become a Dread Lord, the highest rank in the Zhentarim''s leadership.

Faceless Gaze. To gaze upon the faceless eyes of this hood is to invite fear. When a creature starts its turn within 30 feet of you and can see you, you can force it to make a DC 19 Wisdom saving throw if you don''t have the Incapacitated condition and can see the creature. On a failed save, the creature has the Frightened condition until the start of its next turn, and if the saving throw fails by 5 or more, the creature''s Speed is reduced to 0 while Frightened in this way. Unless surprised, a creature can avert its eyes to avoid the saving throw at the start of its next turn. If the creature does so, it can''t see you until the start of its next turn, when it can avert its eyes again. If the creature looks at you in the meantime, it must immediately make the save.

Mark for Death. You can take a Magic action to choose one creature you can see within 30 feet of you, marking it until the end of your next turn. The next time you deal damage to the marked creature, the creature has Vulnerability to all of that source''s damage, and then the mark ends.', NULL, 10640.0),
('16565c0f-4247-55bf-ae94-612686558245', 'LOT_1065', 'GEAR Exosuit (HB)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Wondrous item', 'Permanent', true, NULL, 'T4 Select Permanent (DM Select)', '{"HHB"}', 'Wondrous Item, T4 (Requires Attunement)

This suit consists of a collection of plates, bracers, and fittings made of adamantine, mithral, and other magically enchanted metals and has a glowing arcane battery at its center. 

The suit covers its wearer from neck to toe and can either be worn by itself or can be incorporated into an existing set of armor. Donning or doffing the suit takes 10 minutes, and it can''t be removed against your will while you are alive. Incorporating the suit into an existing set of armor or removing it also takes 10 minutes.

While wearing the suit and not wearing armor, the suit grants you an Armor Class of 18. You can use a shield and still gain this benefit.
 
The suit has 5 charges for the following properties and regains 1d4 + 1 expended charges daily at dawn.
 
Aether Enhancement. While wearing the suit, you can take a Bonus Action to expend 1 charge for the suit to grant one of the following benefits while wearing the suit for the listed duration or until you dismiss it (no action required). The suit can''t grant more than two of these benefits at a time: using this property to gain a third benefit causes one of the existing benefits to end (your choice).
- Adaptive Shielding. You gain Temporary Hit Points equal to your Proficiency Bonus, and for 1 minute, you gain Temporary Hit Points equal to your Proficiency Bonus at the start of each of your turns.
- Aether Amplification. For 1 minute, when you hit with an attack roll, the attack deals an extra 1d8 Force damage.
- Aether Field. For 1 minute, oscillating magical energy surges in a 10-foot Emanation originating from you. You and allies in the area gain the benefits of the Bless spell (no Concentration required).
- Aether Flight. For the next 10 minutes, you gain a Fly Speed equal to your Speed and can hover.
- Overclocked Targeting. For 1 minute, you have a +2 bonus to your attack rolls.

Molten Barrage. While wearing the suit, you can take a Magic action to expend 2 charges and create a fiery explosion in a 20-foot radius, 40-foot high Cylinder centered on a point within 120 feet of yourself. Each creature in that area must make a DC 18 Dexterity saving throw, taking 10d8 Fire damage on a failed save, or half as much on a successful one.', NULL, 10650.0),
('dc0205bf-d12a-576c-ab12-2cc43393bcf5', 'LOT_1066', 'Greater Harper Pin (HB)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T4 Select Permanent', '{"HHB"}', 'Wondrous item, T4 (Requires Attunement)

This silver brooch is embossed with the symbol of the Harpers, depicting a harp against a crescent moon. This brooch is presented to those that have become a High Harper, the highest rank in the leadership of the Harpers. Unlike the Harper pin provided earlier in a Harper''s career, the silver of this pin has been magically treated to be as hard as adamantine and has extraordinary properties.

While wearing this pin, you gain the following effects..

Mind Shielding. You have Advantage on saving throws made to avoid or end the Charmed or Frightened condition. Additionally, you are immune to magic that allows other creatures to read your thoughts, determine whether you are lying, know your alignment, or know your creature type. Creatures can telepathically communicate with you only if you allow it.

Nondetection. The pin has the properties of an Amulet of Proof Against Detection and Location and the pin itself is also protected against such effects.

Resilience. You have Resistance to Lightning damage and you have Immunity to damage from the Magic Missile spell.

Telepathic Detection. The pin grows warm if a creature within 30 feet of yourself attempts to use telepathy to communicate.', NULL, 10660.0),
('1dd94521-b174-5ad1-9e52-a2025112c361', 'LOT_1067', 'The HALO Halo (HB)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Wondrous Item', 'Permanent', true, NULL, 'T4 Select Permanent (DM Select)', '{"HHB"}', 'Wondrous Item, T4 (Requires Attunement)

As a Halo Bearer of HALO, you have gained this shining gold crown to mark achieving the highest rank in the organization and your position of leadership. This shining gold crown hovers just above your head while you wear it, and you gain the following benefits while wearing this crown.

By Land, Air, and Sea. You have a Burrow Speed, Fly Speed, and Swim Speed equal to your walking Speed.

Adapt and Thrive. You can cast the Air Bubble or Water Breathing spell from this crown. This property of the crown can''t be used again until you finish a Short or Long Rest.

Raise the Tempest. You can cast the Control Weather spell from this crown. This property of the crown can''t be used again until the next dawn.

Bombard Blitz. You can take a Bonus Action to cause the crown to pulse with the force of a bombard. For the next minute or until you become Incapacitated or dismiss this effect on your turn (no action required), you gain a +2 bonus to ranged weapon attack rolls, deal an additional 2d8 Force damage with your ranged weapon attacks, and when you hit a creature with a ranged weapon attack, you can push the creature up to 10 feet straight away from yourself if it is Huge or smaller. This property of the crown can''t be used again until the next dawn.', NULL, 10670.0),
('72e358da-8341-5404-8e66-ae4dfdff9889', 'LOT_1068', 'Ink of the Eternal Legacy (HB)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Wondrous Item (tattoo)', 'Permanent', true, NULL, 'T4 Select Permanent (DM Select)', '{"HHB"}', 'Wondrous Item (tattoo), T4 (Requires Attunement)

The tattoo expands across the body from its original form. Your mentor’s stylized likeness now appears entwined with faint celestial calligraphy, while the shrine maiden’s form is etched in silver-white ink that seems to shimmer faintly when you breathe. At times of danger, the tattoo pulses with radiant warmth, as if alive.

This tattoo has a number of charges equal to your Proficiency Bonus and it regains all expended charges daily at dawn.

Deadly Strike. Your attack rolls with weapons and Unarmed Strikes can score a Critical Hit on a roll of 19 or 20 on the d20.

Shrine Maiden''s Minor Blessing. You can call forth a serene shrine maiden in a burst of shimmering paper charms. You can expend 1 charge to cast the Lesser Restoration spell from the tattoo.

Shrine Maiden''s Major Blessing. You can call forth a serene shrine maiden in a burst of shimmering paper charms. You can expend 2 charges to cast the Greater Restoration spell from the tattoo.

Unstoppable Strike. The spectral image of your mentor strikes with you and steels your resolve. When you hit a creature with a weapon attack, you can expend 1 charge to deal an extra 4d8 Force damage to the target and if the target is Large or smaller, it must succeed on a Strength saving throw (DC equal to 8 plus your Strength or Dexterity modifier plus your Proficiency Bonus) or be knocked Prone. If this attack reduces the target to 0 Hit Points, you gain Temporary Hit Points equal to twice your level.', NULL, 10680.0),
('5af3b237-ae8d-5a9c-b001-96a2b8825114', 'LOT_1069', 'Mark of the Lotus (HB)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Wondrous Item (Tattoo)', 'Permanent', true, NULL, 'T4 Select Permanent (DM Select)', '{"HHB"}', 'Wondrous Item (Tattoo), T4

As a Bloom of the Prismatic Lotus, you''ve achieved the highest rank of leadership within the organization besides the founders themselves. As a testament to your dedication to the organization, you have been gifted with a magical tattoo of a lotus as imbued by one of the founders, Serix or Soliana, and through it formed a bond with a Mini-Render that has an appearance of your choice and is known as a GR-44.

A Mini-Render has the statistics of a Gray Render, except its size is Tiny, it can''t attack, it has 10 HP and 15 AC, and it regards you as its master, following your commands to the best of its ability. If you take a Magic action to throw the Mini-Render to a point on the ground within 60 feet of yourself, the Mini-Render becomes a Gray Render. If the space where the Gray Render would appear is occupied by other creatures or objects, or if there isn''t enough space for the creature, the Mini-Render doesn''t become a Gray Render.

The Gray Render is Friendly to you and your allies. It understands your languages, obeys your commands, and takes its turn immediately after you on your Initiative count. If you issue no commands, the Gray Render defends itself but takes no other actions.

The Gray Render exists for up to 3 hours. At the end of the duration, the Gray Render reverts to its Mini-Render form and attempts to return to you. It reverts to a Mini-Render early if it is reduced to 0 hit points or if you take a Magic action while touching the Gray Render to make it revert back to a Mini-Render

Once the Gray Render reverts to its Mini-Render form again, it can''t transform in this way again until it has been fed blood or meat and 7 days have passed.

If the Mini-Render is ever slain, its body dissolves and is siphoned into the tattoo. Its body can be extracted from the tattoo by the founders of the Prismatic Lotus, who can restore it back to life and re-establish your bond with it over the course of 7 days.', NULL, 10690.0),
('df4e4f70-7efd-5c0c-8585-7a412a372faa', 'LOT_1070', 'Pendant of the Arcane Fury (HB)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Wondrous Item (tattoo)', 'Permanent', true, NULL, 'T4 Select Permanent (DM Select)', '{"HHB"}', 'Wondrous Item, T4 (Requires Attunement by a Spellcaster)

Suspended from this silver chain is a smooth gemstone that swirls with faint starlight. At certain angles, you see brief, flickering afterimages of yourself casting spells as if the pendant is replaying memories of your magic.

The pendant has 8 charges and regains all expended charges daily at dawn. You can use the following properties while wearing the pendant.

Arcane Renewal. When you finish a Short Rest, you can expend up to 5 charges to regain expended spell slots that have a combined level equal to no more than the number of charges expended.

Empower the Effect. When you roll damage for a spell or roll dice to determine the number of Hit Points a spell restores, you can expend 1 charge and reroll a number of dice up to your spellcasting ability modifier, and you must use the new rolls.

Perfect the Weave. If you miss a spell attack roll or fail a Constitution saving throw made to maintain Concentration, you can expend 1 charge and reroll the d20, and you must use the new roll.

Secret Spell. When you cast a spell, you can expend 1 charge to to cast it without any Verbal, Somatic, or Material components, except Material components that are consumed by the spell or that have a cost specified in the spell.

War Mage. Your spell save DC and spell attack bonus each increase by 2.', NULL, 10700.0),
('04e5d1e0-a521-5def-b74a-66cab2c01bbd', 'LOT_1071', 'Ring of Djinni Summoning', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Ring', 'Permanent', false, NULL, 'T4 Select Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 10710.0),
('ca6f68d2-49e0-5cf7-b202-177b0290eb0a', 'LOT_1072', 'Sphere of Annihilation (2014)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T4 Select Permanent', '{"DMG2014"}', 'See book for description.', NULL, 10720.0),
('0d9dc851-deee-5510-9b8e-7cc4b8f42cae', 'LOT_1073', 'Talisman of the Gauntlet (HB)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T4 Select Permanent', '{"HHB"}', 'Wondrous item, T4 (Requires Attunement)

This silver talisman is emblazoned with the symbol of the Order of the Gauntlet, depicting the blade of retribution held by the gauntlet of justice. This talisman is presented to those that have become a Righteous Hand, the highest rank in the Order of the Gauntlet''s leadership. 

Holy Symbol. You can use the talisman as a Holy Symbol. You gain a +3 bonus to your saving throws while you wear or hold this talisman.

Holy Rebuke. This talisman has 7 charges and regains 1d6 + 1 expended charges daily at dawn. While holding or wearing this talisman, you can take a Magic action to expend 1 or more of its charges to cause one of the following effects:
- Rebuke Evil. You expend 1 charge and target one creature you can see within 60 feet of yourself. The target must succeed on a DC 17 Wisdom saving throw, taking 8d6 Psychic damage on a failed save, or half as much damage on a successful one. If the target is evil, it has Disadvantage on the save. 
- Turn Evil. You expend 2 charges and target one creature you can see within 60 feet of yourself, forcing the target to make a DC 17 Wisdom saving throw. On a failed save, the target has the Frightened condition for 1 minute or until it takes damage. While Frightened in this way, the target can do only one of the following on each of its turns: move or take an action or a Bonus Action. If the target is evil, it has Disadvantage on the initial save, and the target can repeat the saving throw at the end of each of its turns, ending the condition on itself on a success.
- Grand Rebuke. You expend 4 charges and target each creature of your choice that you can see within 60 feet of yourself. Each target must succeed on a DC 17 Wisdom saving throw, taking 8d6 Psychic damage on a failed save, or half as much damage on a successful one. If the target is evil, it has Disadvantage on the save.', NULL, 10730.0),
('c04c989d-a797-5fec-9465-9b748def171a', 'LOT_1074', 'Talisman of the Sphere', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T4 Select Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 10740.0),
('a14d6492-76f1-5664-8311-cad48703a813', 'LOT_1075', 'Voice of Aurelian (HB)', 'd0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Wondrous item', 'Permanent', true, NULL, 'T4 Select Permanent (DM Select)', '{"HHB"}', 'Wondrous item, T4

As a Councilor of the Gilded Accord, the amulet you received when you originally joined the organization has been upgraded and imbued with the draconic magic of Aurelian, marking you as among the highest rank of leadership in the organization.

This amulet has the properties of a Gilded Accord Amulet. 

This amulet has 3 charges and regains all expended charges daily at dawn. When a creature you can see within 120 feet of you targets you with an attack roll, you can take a Reaction and expend 1 charge from the amulet to force the attacker to make a DC 18 Charisma saving throw. On a failed save, the attack misses and the creature is transported to a harmless demiplane until the start of your next turn, where it reappears in the space it left or in the nearest unoccupied space if that space is occupied.', NULL, 10750.0),
('566989dd-5be5-56c0-b69a-96be90f7c64d', 'LOT_1076', 'Lesser Portal Stones (HB)', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T3_PLUS'), 'Wondrous item', 'Consumable', false, NULL, 'T3+ Consumable', '{"HHB"}', 'Wondrous item, T3+

These small stones come in pairs, with each stone carved with arcane runes to match the other. These extraordinary stones are most often created by those skilled with portal magic, imbuing the magic of portals into such stones. 

You can take a Magic action to affix one of the paired stones into the side of a Large or smaller opening, such as the doorframe of a door, the arch of an archway, or other entrance. The stone can also be removed with a Magic action.

If the paired stone is similarly affixed to the side of a similar opening on the same plane of existence, then a portal that fills that opening''s space appears at both openings, with the corresponding location visible through it. Each portal has a front and back, with travel through the portal possible only by moving through its front. A creature can take a Magic action while within 5 feet of a portal to travel through it and is instantly transported to the other location, appearing in the unoccupied space nearest to the portal.

These portals can link any two locations on the same plane of existence. However, deities and other planar rulers can prevent a portal from being created in this way in their presence or anywhere within their domains. 

After these portals are created, the stones cannot be removed, and not even an Antimagic Field causes them to fall off. If a stone in one of the locations is destroyed (AC 20; HP 10; Immunity to Poison and Psychic damage; Resistance to all other damage), then both portals vanish. If an opening is somehow moved 10 or more feet, then the stones at both locations fall off and both portals vanish.', NULL, 10760.0),
('3292d717-5d5a-59b2-90e5-9ccd1bc7e9e7', 'LOT_1077', 'Rod of Absorption', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T3_PLUS'), 'Rod', 'Consumable', false, NULL, 'T3+ Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 10770.0),
('eeafebf3-ca99-54fb-9461-f4fe81a40c5e', 'LOT_1078', '+2 All-Purpose Tool', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T3_PLUS'), 'Wondrous item', 'Permanent', false, NULL, 'T3+ Permanent', '{"TCE"}', 'See book for description.', NULL, 10780.0),
('2f7d63ec-5bc1-5d11-8e6b-214b2094b2bc', 'LOT_1079', '+2 Amulet of the Devout', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T3_PLUS'), 'Wondrous item', 'Permanent', false, NULL, 'T3+ Permanent', '{"TCE"}', 'See book for description.', NULL, 10790.0),
('3fff8ef4-02a7-524d-9a3b-3cdf6255aadb', 'LOT_1080', '+2 Arcane Grimoire', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T3_PLUS'), 'Wondrous item', 'Permanent', false, NULL, 'T3+ Permanent', '{"TCE"}', 'See book for description.', NULL, 10800.0),
('19687833-d16d-5a18-a6ed-3b34ce2ca95a', 'LOT_1081', '+2 Bloodwell Vial', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T3_PLUS'), 'Wondrous item', 'Permanent', false, NULL, 'T3+ Permanent', '{"TCE"}', 'See book for description.', NULL, 10810.0),
('153f248c-3a3b-574d-8b38-ba174f5e7cc7', 'LOT_1082', 'Daern’s Instant Fortress (2014)', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T3_PLUS'), 'Wondrous item', 'Permanent', false, NULL, 'T3+ Permanent', '{"DMG2014"}', 'See book for description.', NULL, 10820.0),
('057a4797-5719-52f3-a027-0635ed705f44', 'LOT_1083', '+2 Fate Dealer’s Deck', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T3_PLUS'), 'Wondrous item', 'Permanent', false, NULL, 'T3+ Permanent', '{"BMT"}', 'See book for description.', NULL, 10830.0),
('9d75b492-e9a7-5d10-800c-32b405ba9626', 'LOT_1084', 'Feather Robe (any)', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T3_PLUS'), 'Wondrous item', 'Permanent', false, NULL, 'T3+ Permanent', '{"HWT"}', 'See book for description.', NULL, 10840.0),
('4a39b40d-aa5c-5ee7-86b5-fffa2321449c', 'LOT_1085', 'Illusionist’s Bracers', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T3_PLUS'), 'Wondrous item', 'Permanent', false, NULL, 'T3+ Permanent', '{"GGR"}', 'See book for description.', NULL, 10850.0),
('76e797d3-b413-5479-958c-75459c58b8c2', 'LOT_1086', 'Mudslick Tower', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T3_PLUS'), 'Wondrous item', 'Permanent', false, NULL, 'T3+ Permanent', '{"PBTSO"}', 'See book for description.', NULL, 10860.0),
('54e2f464-6c0f-56df-b785-4051e6e9df2c', 'LOT_1087', '+2 Moon Sickle', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T3_PLUS'), 'Weapon (sickle)', 'Permanent', false, NULL, 'T3+ Permanent', '{"TCE"}', 'See book for description.', NULL, 10870.0),
('47edaa9b-c884-5c4b-8a6f-4b6bbd2af9d8', 'LOT_1088', 'Prayer Bead, Summons (2014)', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T3_PLUS'), 'Wondrous item', 'Permanent', false, NULL, 'T3+ Permanent', '{"DMG2014"}', 'Bead of a Necklace of Prayer Beads. See book for description.', NULL, 10880.0),
('a352dc11-16d4-59c9-a4f8-94fb94936c80', 'LOT_1089', 'Reveler''s Concertina', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T3_PLUS'), 'Wondrous item', 'Permanent', false, NULL, 'T3+ Permanent', '{"TCE"}', 'See book for description.', NULL, 10890.0),
('a1258854-802e-5649-886f-59eff150ed0a', 'LOT_1090', '+2 Rhythm-Maker''s Drum', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T3_PLUS'), 'Wondrous item', 'Permanent', false, NULL, 'T3+ Permanent', '{"TCE"}', 'See book for description.', NULL, 10900.0),
('64150fd7-33bd-568a-af6c-5c0e7845a841', 'LOT_1091', '+2 Robe of the Order (HB)', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T3_PLUS'), 'Wondrous Item', 'Permanent', false, NULL, 'T3+ Permanent', '{"HHB"}', 'Wondrous Item, T3+ (Requires Attunement by a Mystic)

This robe bears psionic sigils and symbols. 

While wearing the robe, you gain a +2 bonus to the attack rolls and saving throw DCs of your Psionic Talents and Psionic Disciplines.

While wearing the robe, you can take a Magic Action to regain a number of expended Psi Points equal to your Psi Limit. Once this property is used, it can''t be used again until the next dawn.', NULL, 10910.0),
('bf929063-665a-5c76-a38e-088feaf42554', 'LOT_1092', '+2 Rod of the Pact Keeper', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T3_PLUS'), 'Rod', 'Permanent', false, NULL, 'T3+ Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 10920.0),
('42035376-cd0a-5857-8ebc-e5fe5072f055', 'LOT_1093', 'Thunderous Weapon (Thunderous Greatclub) (any bludgeoning melee weapon)', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T3_PLUS'), 'Weapon (any bludgeoning melee weapon)', 'Permanent', false, NULL, 'T3+ Permanent', '{"DMG2024"}', 'See book for description.', NULL, 10930.0),
('9162914b-6202-5362-ae10-d7ef4b242c40', 'LOT_1094', 'Lesser Candle of Invocation (Candle of Invocation (2024))', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Wondrous item', 'Consumable', false, NULL, 'T4+ Consumable', '{"DMG2024"}', 'See book for description.', NULL, 10940.0),
('3fca9b87-2630-554c-a0cf-226252d8c27f', 'LOT_1095', 'Manual of Bodily Health', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Wondrous item', 'Consumable', false, NULL, 'T4+ Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 10950.0),
('a3fbb2da-604e-5f12-9944-082ad93dbae9', 'LOT_1096', 'Manual of Gainful Exercise', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Wondrous item', 'Consumable', false, NULL, 'T4+ Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 10960.0),
('6da6407a-5a9a-5bae-bebb-40fa0b0cf962', 'LOT_1097', 'Manual of Quickness of Action', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Wondrous item', 'Consumable', false, NULL, 'T4+ Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 10970.0),
('fb6aaaa7-7cb0-51fa-8433-8eab4bb0854f', 'LOT_1098', 'Tome of Clear Thought', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Wondrous item', 'Consumable', false, NULL, 'T4+ Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 10980.0),
('dffd8580-cc8d-5c97-89a9-84cd52b4eaec', 'LOT_1099', 'Tome of Leadership and Influence', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Wondrous item', 'Consumable', false, NULL, 'T4+ Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 10990.0),
('eab0eab2-4d27-5e61-be74-e961b31f275e', 'LOT_1100', 'Tome of Understanding', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Wondrous item', 'Consumable', false, NULL, 'T4+ Consumable', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 11000.0);

INSERT INTO public.ac_loot (
    id, check_id, name, category_id, tier_id, type, nature, is_dm_select, event_category, tier_display, source, description, notes_advice, display_order
) VALUES
('e1d5cdd8-9e93-5da2-91d8-1ce7292b77bc', 'LOT_1101', 'Greater Talisman of Pure Good (Talisman of Pure Good (2024))', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Wondrous item', 'Consumable', false, NULL, 'T4+ Consumable', '{"DMG2024"}', 'See book for description.', NULL, 11010.0),
('b25f8a97-5343-5a46-8717-07007f3efc20', 'LOT_1102', 'Greater Talisman of Ultimate Evil (Talisman of Ultimate Evil (2024))', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Wondrous item', 'Consumable', false, NULL, 'T4+ Consumable', '{"DMG2024"}', 'See book for description.', NULL, 11020.0),
('9c7a1917-b595-5b49-9923-31c19412325b', 'LOT_1103', '+3 All-Purpose Tool', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Wondrous item', 'Permanent', false, NULL, 'T4+ Permanent', '{"TCE"}', 'See book for description.', NULL, 11030.0),
('bbaaeadc-4c7e-5966-9719-ccfaaf1c4c9a', 'LOT_1104', '+3 Amulet of the Devout', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Wondrous item', 'Permanent', false, NULL, 'T4+ Permanent', '{"TCE"}', 'See book for description.', NULL, 11040.0),
('ad946277-c0d7-5478-a1e7-962ed0d8b5e4', 'LOT_1105', '+3 Arcane Grimoire', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Wondrous item', 'Permanent', false, NULL, 'T4+ Permanent', '{"TCE"}', 'See book for description.', NULL, 11050.0),
('d5311b2b-bbdf-54b4-a957-e1397292a770', 'LOT_1106', 'Belt of Cloud Giant Strength', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Wondrous item', 'Permanent', false, NULL, 'T4+ Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 11060.0),
('3b83d6ef-d6fd-5ff3-98da-d4cb13d3827a', 'LOT_1107', '+3 Bloodwell Vial', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Wondrous item', 'Permanent', false, NULL, 'T4+ Permanent', '{"TCE"}', 'See book for description.', NULL, 11070.0),
('8e471fd2-f853-52c0-9001-085e69a2adf4', 'LOT_1108', 'Cube of Force (2014)', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Wondrous item', 'Permanent', false, NULL, 'T4+ Permanent', '{"DMG2014"}', 'See book for description.', NULL, 11080.0),
('34fc18d8-e3a9-525b-8fae-19a238a9c1b8', 'LOT_1109', 'Cubic Gate', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Wondrous item', 'Permanent', false, NULL, 'T4+ Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 11090.0),
('44d64989-1199-5c26-8dca-6a0d41cc1b24', 'LOT_1110', 'Enspelled Armor (Level 8) (any armor)', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Armor (any)', 'Permanent', false, NULL, 'T4+ Permanent', '{"DMG2024"}', 'See book for description.', NULL, 11100.0),
('db598b4f-bd88-5559-9fbd-a58fea791f07', 'LOT_1111', 'Enspelled Staff (Level 8)', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Staff', 'Permanent', false, NULL, 'T4+ Permanent', '{"DMG2024"}', 'See book for description.', NULL, 11110.0),
('8ddc933f-9a08-5fe6-aa55-48d69174b464', 'LOT_1112', 'Enspelled Weapon (Level 8) (any weapon)', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Weapon (any)', 'Permanent', false, NULL, 'T4+ Permanent', '{"DMG2024"}', 'See book for description.', NULL, 11120.0),
('915367dd-5ea4-590a-9c2f-25c26daaca5e', 'LOT_1113', '+3 Fate Dealer’s Deck', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Wondrous item', 'Permanent', false, NULL, 'T4+ Permanent', '{"BMT"}', 'See book for description.', NULL, 11130.0),
('1d86ad20-db73-575e-88f6-c9c4fa6dbc02', 'LOT_1114', 'Flail of Tiamat', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Weapon (flail)', 'Permanent', false, NULL, 'T4+ Permanent', '{"FTD"}', 'See book for description.', NULL, 11140.0),
('9d29e518-a7ed-5747-bb16-f7af3309dbbe', 'LOT_1115', 'Greater Sphere of Annihilation (Sphere of Annihilation (2024))', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Wondrous item', 'Permanent', false, NULL, 'T4+ Permanent', '{"DMG2024"}', 'See book for description.', NULL, 11150.0),
('719d1f8f-4550-576e-aa33-f94166b640c9', 'LOT_1116', 'Hammer of Thunderbolts (any bludgeoning melee weapon)', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Weapon (any bludgeoning melee weapon)', 'Permanent', false, NULL, 'T4+ Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 11160.0),
('e1196aa3-19a5-5b49-a31d-04fda49a5bc1', 'LOT_1117', 'Horn of Valhalla, Iron', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Wondrous item', 'Permanent', false, NULL, 'T4+ Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 11170.0),
('9af55208-8f9e-5cd0-9f8f-fe38af33fa7f', 'LOT_1118', 'Iron Flask (does not contain a Solar)', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Wondrous item', 'Permanent', false, NULL, 'T4+ Permanent', '{"DMG2014", "DMG2024"}', 'This is an Iron Flask that does not contain a Solar. See book for description.', NULL, 11180.0),
('13cd399d-51db-55b6-9963-e464a876ce4f', 'LOT_1119', 'Jester’s Mask', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Wondrous item', 'Permanent', false, NULL, 'T4+ Permanent', '{"BMT"}', 'See book for description.', NULL, 11190.0),
('9b5700e6-10f2-5fa2-8d02-f63e7af51e69', 'LOT_1120', 'Moonblade (any sword)', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Weapon (any sword)', 'Permanent', false, NULL, 'T4+ Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 11200.0),
('a281b854-1da8-5070-b562-5b3753f56a01', 'LOT_1121', '+3 Moon Sickle', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Weapon (sickle)', 'Permanent', false, NULL, 'T4+ Permanent', '{"TCE"}', 'See book for description.', NULL, 11210.0),
('7e2870ea-4ada-539a-9b1c-67eff74bf243', 'LOT_1122', 'Red Wizard Blade', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Weapon (dagger)', 'Permanent', false, NULL, 'T4+ Permanent', '{"HAT_LMI"}', 'See book for description.', NULL, 11220.0),
('79b16b72-7495-55b8-8cab-bd2715f709d7', 'LOT_1123', '+3 Rhythm-Maker''s Drum', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Wondrous item', 'Permanent', false, NULL, 'T4+ Permanent', '{"TCE"}', 'See book for description.', NULL, 11230.0),
('761e1b48-4a61-513b-b3dc-efa8f66a1816', 'LOT_1124', 'Riteknife (Rakdos Riteknife)', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Weapon (dagger)', 'Permanent', false, NULL, 'T4+ Permanent', '{"GGR"}', 'See book for description.', NULL, 11240.0),
('9d912a6d-d5a5-5a6b-8d6e-60268c729212', 'LOT_1125', 'Robe of the Archmagi', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Wondrous item', 'Permanent', false, NULL, 'T4+ Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 11250.0),
('f4d725bb-d913-528e-be9d-7b9f419535e2', 'LOT_1126', '+3 Robe of the Order (HB)', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Wondrous Item', 'Permanent', false, NULL, 'T4+ Permanent', '{"HHB"}', 'Wondrous Item, T4+ (Requires Attunement by a Mystic)

This robe bears psionic sigils and symbols. 

While wearing the robe, you gain a +3 bonus to the attack rolls and saving throw DCs of your Psionic Talents and Psionic Disciplines.

While wearing the robe, you can take a Magic Action to regain a number of expended Psi Points equal to your Psi Limit. Once this property is used, it can''t be used again until the next dawn.', NULL, 11260.0),
('e073e564-e81c-5983-ad3c-9f3f5f46c5a4', 'LOT_1127', '+3 Rod of the Pact Keeper', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Rod', 'Permanent', false, NULL, 'T4+ Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 11270.0),
('af5a20ad-5f35-5e8f-bd71-9cd351cdd8b4', 'LOT_1128', 'Shard Solitaire (Diamond)', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Wondrous item', 'Permanent', false, NULL, 'T4+ Permanent', '{"KftGV"}', 'See book for description.', NULL, 11280.0),
('d58e09a4-a28e-5a9f-8e57-ece1b3df9ea3', 'LOT_1129', 'Staff of the Magi', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Staff', 'Permanent', false, NULL, 'T4+ Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 11290.0),
('d96ad7a5-b41c-5bc8-9018-49464f67e5cb', 'LOT_1130', 'Candle of Invocation (2014)', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'TIER_S'), 'Wondrous item', 'Consumable', false, NULL, 'Tier S Consumable', '{"DMG2014"}', 'See book for description.', NULL, 11300.0),
('a9baa2cc-210c-56b8-a240-91a505a6324f', 'LOT_1131', 'Scroll of Titan Summoning', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'TIER_S'), 'Scroll', 'Consumable', false, NULL, 'Tier S Consumable', '{"DMG2024"}', 'See book for description.', NULL, 11310.0),
('469118ba-bb83-518c-97aa-7600999e447e', 'LOT_1132', 'Belt of Storm Giant Strength', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'TIER_S'), 'Wondrous item', 'Permanent', false, NULL, 'Tier S Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 11320.0),
('1f7bcb78-b40b-5fe7-9ff9-8217644ef52e', 'LOT_1133', 'Helm of Disjunction', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'TIER_S'), 'Wondrous item', 'Permanent', false, NULL, 'Tier S Permanent', '{"HAT_LMI"}', 'See book for description.', NULL, 11330.0),
('bb49c7e1-75da-5224-8ac3-d16193310d82', 'LOT_1134', 'Iron Flask (contains a Solar)', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'TIER_S'), 'Wondrous item', 'Permanent', false, NULL, 'Tier S Permanent', '{"DMG2014", "DMG2024"}', 'This is an Iron Flask found already containing a Solar. See book for description.', NULL, 11340.0),
('b95d0654-7fb1-50b3-a7d2-5b3ed13b9195', 'LOT_1135', 'Tome of the Stilled Tongue', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'TIER_S'), 'Wondrous item', 'Permanent', false, NULL, 'Tier S Permanent', '{"DMG2014", "DMG2024"}', 'See book for description.', NULL, 11350.0),
('7b1347eb-a757-5625-a275-b28b57046215', 'LOT_1136', 'Relic of Emergence (Dormant)', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'VARIES'), 'Varies', 'Varies', false, NULL, 'Varies', '{"HHB"}', 'The Dormant and initial state of a homebrew Relic of Emergence. Refer to the Vestiges of Divergence in Explorer''s Guide to Wildemount for examples and guidance.', NULL, 11360.0),
('9557f102-b48d-53a2-acd0-09b3dca797a2', 'LOT_1137', 'Relic of Emergence (Awakened)', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'VARIES'), 'Varies', 'Varies', false, NULL, 'Varies', '{"HHB"}', 'The Awakened and transitory state of a homebrew Relic of Emergence, with additional abilities and improvements upon the Dormant state. Refer to the Vestiges of Divergence in Explorer''s Guide to Wildemount for examples and guidance.', NULL, 11370.0),
('466bb505-ac26-5c02-a54f-c46e738b3734', 'LOT_1138', 'Relic of Emergence (Exalted)', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'VARIES'), 'Varies', 'Varies', false, NULL, 'Varies', '{"HHB"}', 'The Exalted and final state of a homebrew Relic of Emergence, with further abilities and improvements upon the Awakened state. Refer to the Vestiges of Divergence in Explorer''s Guide to Wildemount for examples and guidance.', NULL, 11380.0),
('5df21bd5-403b-5d73-8cba-5318bfc4c5d4', 'LOT_1139', 'Oath of the Mogger (HB)', 'd0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'T2_T3_T4'), 'Wondrous item', 'Permanent', true, NULL, 'T2+/T3+/T4+ (DM Select)', '{"HHB"}', 'Wondrous item, T2+/T3+/T4+ (Requires Attunement)

This necklace is given by the Ancient Mogg to warriors sworn to protect Moggville. 

Dormant (T2+). When you first attune to the Oath of the Mogger in its dormant state, choose one type of Simple or Martial weapon. Another creature can''t attune to the Oath of the Mogger while you are attuned to it, and your attunement to it can''t end by any means (not even by dying) except by the Ancient Mogg, which can end your attunement to the Oath of the Mogger with a touch.

When the Oath of the Mogger is in a dormant state, you can take a Bonus Action while touching it to transform it into a weapon of the chosen type or back into a necklace. You have a +1 bonus to attack and damage rolls made with this magic weapon. When you hit with an attack roll using this magic weapon, the target takes an extra 1d6 Lightning damage and you gain a number of Temporary Hit Points equal to half the Lightning damage dealt by the weapon (rounded down).

Awakened (T3+). When the Oath of the Mogger reaches an awakened state, you gain the following benefits:
- You have Advantage on death saving throws while attuned to the Oath of the Mogger.
- The transformed weapon''s bonus to attack and damage rolls increases to +2.
- The transformed weapon deals an extra 2d6 Lightning damage on a hit (instead of 1d6).
- The transformed weapon deals Lightning damage instead of its normal damage type.

Exalted (T4+). When the Oath of the Mogger reaches an exalted state, you gain the following benefits:
- While attuned to the Oath of the Mogger, you have Advantage on death saving throws and treat a roll of 19 or 20 on the d20 as a 20 for death saving throws.
- The transformed weapon''s bonus to attack and damage rolls increases to +3.
- The transformed weapon deals an extra 3d6 Lightning damage on a hit (instead of 1d6).
- When you hit with an attack roll with the transformed weapon, you regain Hit Points equal to half the Lightning damage dealt by the weapon, rounded down (instead of gaining Temporary Hit Points).', NULL, 11390.0),
('0290e581-aa07-5bd3-a011-b881c007c35b', 'LOT_1140', 'Key', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Select Permanent', '{"BMT"}', 'Individual card from the Deck of Many Things. See book for description.', NULL, 11400.0),
('e71a05cd-3100-53c0-b8c3-d01d6e543225', 'LOT_1141', 'Puzzle', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Select Permanent', '{"BMT"}', 'Individual card from the Deck of Many Things. See book for description.', NULL, 11410.0),
('403eeaf2-35d2-506d-949a-27ad6c9fa1b0', 'LOT_1142', 'Star', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T1 Select Permanent', '{"BMT"}', 'Individual card from the Deck of Many Things. See book for description.', NULL, 11420.0),
('a1286492-a1f7-558d-bc4d-5bc0f038ee0d', 'LOT_1143', 'Balance', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Select Permanent', '{"BMT"}', 'Individual card from the Deck of Many Things. See book for description.', NULL, 11430.0),
('5ebbc0dc-537b-5fcf-8115-1337680bb9d0', 'LOT_1144', 'Fates', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Select Permanent', '{"BMT"}', 'Individual card from the Deck of Many Things. See book for description.', NULL, 11440.0),
('68c5411e-9a84-5c1e-aaa8-0355295beba3', 'LOT_1145', 'Fool', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Select Permanent', '{"BMT"}', 'Individual card from the Deck of Many Things. See book for description.', NULL, 11450.0),
('5c4cf51e-b8f2-5c4b-9927-a905934fb17c', 'LOT_1146', 'Knight', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Select Permanent', '{"BMT"}', 'Individual card from the Deck of Many Things. See book for description.', NULL, 11460.0),
('ea160b95-cc24-501a-b7cf-a857e2980788', 'LOT_1147', 'Moon', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Select Permanent', '{"BMT"}', 'Individual card from the Deck of Many Things. See book for description.', NULL, 11470.0),
('ec093332-9384-578e-815d-be585e4fdf12', 'LOT_1148', 'Rogue', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Select Permanent', '{"BMT"}', 'Individual card from the Deck of Many Things. See book for description.', NULL, 11480.0),
('80fd54ca-e708-5b2e-be86-ea341d2720a1', 'LOT_1149', 'Sage', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Select Permanent', '{"BMT"}', 'Individual card from the Deck of Many Things. See book for description.', NULL, 11490.0),
('57d1447b-6886-5e64-8de0-d024b8adf507', 'LOT_1150', 'Talons', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Select Permanent', '{"BMT"}', 'Individual card from the Deck of Many Things. See book for description.', NULL, 11500.0),
('46e2d19f-cbf0-5205-9ace-9f136b3803c2', 'LOT_1151', 'Throne', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Select Permanent', '{"BMT"}', 'Individual card from the Deck of Many Things. See book for description.', NULL, 11510.0),
('de32111f-21d9-5427-8e34-47c13a3265d4', 'LOT_1152', 'Void', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T2 Select Permanent', '{"BMT"}', 'Individual card from the Deck of Many Things. See book for description.', NULL, 11520.0),
('da133b8b-f6b2-5748-ba8f-74b3d9689898', 'LOT_1153', 'Comet', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Select Permanent', '{"BMT"}', 'Individual card from the Deck of Many Things. See book for description.', NULL, 11530.0),
('0d6bbadf-9927-5913-b5b6-c0b77d143ccd', 'LOT_1154', 'Donjon', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Select Permanent', '{"BMT"}', 'Individual card from the Deck of Many Things. See book for description.', NULL, 11540.0),
('8d74ee83-5fca-54ef-b644-bf780782888a', 'LOT_1155', 'Euryale', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Select Permanent', '{"BMT"}', 'Individual card from the Deck of Many Things. See book for description.', NULL, 11550.0),
('a263a6cf-428b-596a-8cb4-eded5713d0b6', 'LOT_1156', 'Flames', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Select Permanent', '{"BMT"}', 'Individual card from the Deck of Many Things. See book for description.', NULL, 11560.0),
('95b13a1c-dd0a-5b8e-8fb6-061ee2278ea2', 'LOT_1157', 'Gem', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Select Permanent*', '{"BMT"}', 'Individual card from the Deck of Many Things. See book for description.', NULL, 11570.0),
('9e2891c5-786c-5099-a25a-4f842ad45723', 'LOT_1158', 'Jester', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Select Permanent', '{"BMT"}', 'Individual card from the Deck of Many Things. See book for description.', NULL, 11580.0),
('76db7edf-04dc-5919-98ae-66653864df47', 'LOT_1159', 'Ruin', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Select Permanent', '{"BMT"}', 'Individual card from the Deck of Many Things. See book for description.', NULL, 11590.0),
('9ec53308-682c-5ce5-bde2-197857d68a2b', 'LOT_1160', 'Skull', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Select Permanent', '{"BMT"}', 'Individual card from the Deck of Many Things. See book for description.', NULL, 11600.0),
('afa952cd-0044-58a9-ba73-a07a1dd87fd6', 'LOT_1161', 'Sun', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Wondrous item', 'Permanent', false, NULL, 'T3 Select Permanent', '{"BMT"}', 'Individual card from the Deck of Many Things. See book for description.', NULL, 11610.0),
('eda87102-e22c-5ab9-a230-dc261159648c', 'LOT_1162', 'Dragon''s Wrath Weapon (any)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'VARIES'), 'Weapon (any)', 'Varies', false, NULL, 'Varies', '{"FTD"}', 'Hoard Magic Item from Fizban''s Treasury of Dragons. See book for full description. Each state''s item tiers are below:
- Slumbering: T1 Select
- Stirring: T2 Select
- Wakened: T3+
- Ascendant: T4+', NULL, 11620.0),
('cd21ec46-f29e-5852-82f0-e2eee3d21f96', 'LOT_1163', 'Dragon-Touched Focus', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'VARIES'), 'Wondrous item', 'Varies', false, NULL, 'Varies', '{"FTD"}', 'Hoard Magic Item from Fizban''s Treasury of Dragons. See book for full description. Each state''s item tiers are below:
- Slumbering: T1 Select
- Stirring: T2 Select
- Wakened: T2+
- Ascendant: T4+', NULL, 11630.0),
('ec6ce004-dae9-5be0-8594-9a99e69f2b0e', 'LOT_1164', 'Dragon Vessel', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'VARIES'), 'Wondrous item', 'Varies', false, NULL, 'Varies', '{"FTD"}', 'Hoard Magic Item from Fizban''s Treasury of Dragons. See book for full description. Each state''s item tiers are below:
- Slumbering: T1 Select
- Stirring: T1 Select
- Wakened: T2 Select
- Ascendant: T4 Slect', NULL, 11640.0),
('a4aa0bdb-1875-5c30-b230-5ad0531ca925', 'LOT_1165', 'Scaled Ornament', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'VARIES'), 'Wondrous item', 'Varies', false, NULL, 'Varies', '{"FTD"}', 'Hoard Magic Item from Fizban''s Treasury of Dragons. See book for full description. Each state''s item tiers are below:
- Slumbering: T1 Select
- Stirring: T2+
- Wakened: T2+
- Ascendant: T3+', NULL, 11650.0),
('73729a0b-b041-57e0-af46-877c3eaec14b', 'LOT_1166', 'Fists of the Dragon''s Maw (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'VARIES'), 'Wondrous Item', 'Varies', false, NULL, 'Varies', '{"HHB"}', 'Wondrous Item, T1/T2/T3/T4 (Requires Attunement)

This pair of heavy gauntlets takes the shape of a dragon''s head. When the gauntlets steep in a dragon’s hoard, they take on the color and shape of the dragon''s head and absorb the energy of the dragon’s breath weapon and deal damage of that type with its special properties.

You gain the following benefits while wearing these gauntlets.

     Slumbering (T1). Your Unarmed Strikes and natural weapons are considered magical for the purpose of overcoming Immunity and Resistance to nonmagical attacks and damage. In addition, your Unarmed Strikes and natural weapons deal your choice of their normal damage type or damage of the type dealt by the dragon''s breath weapon and deal an extra 1d6 damage of the type dealt by the dragon’s breath weapon on a hit.

    Stirring (T2). The Stirring gauntlets have the Slumbering property.  In addition, when you attack a creature with an Unarmed strike or natural weapon and roll a 20 on the d20 for the attack roll, the target takes an extra 2d6 damage of the type dealt by the dragon’s breath weapon, and you can use one of the properties determined by the family of the dragon in whose hoard it became Stirring:

Chromatic. The target takes an extra 2d6 damage of the type dealt by the dragon’s breath weapon and has the Frightened condition until the end of your next turn.

Gem. You can immediately teleport up to 30 feet to an unoccupied space you can see. If you do, attack rolls made against you have Disadvantage until the end of your next turn.

Metallic. One ally you can see within 30 feet of yourself gains a number of Temporary Hit Points equal to half of the damage dealt by the attack (rounded down).

    Wakened (T3). The Wakened gauntlets have the Slumbering property, and they improve on the Stirring property. The extra damage dealt to a creature after rolling a 20 on the d20 for an attack roll with an Unarmed Strike or natural weapon increases to 4d6. In addition, you have Blindsight with a range of 10 feet.

    As a Bonus Action, you gain 50 Temporary Hit Points and become empowered for 1 minute, which ends early if you have no Temporary Hit Points remaining. Once this Bonus Action is used, it can''t be used again until the next dawn. When you become empowered in this way, and as a Bonus Action on subsequent turns, you can unleash a blast of destructive energy from the gauntlets in either a 30-foot Cone or a 60-foot Line that is 5 feet wide (choose the shape each time). Each creature in that area must make a DC 16 Dexterity saving throw, taking 4d6 damage of the type dealt by the dragon’s breath weapon on a failed save, or half as much damage on a successful one. This blast of destructive energy has an additional effect determined by the family of the dragon in whose hoard it became Wakened:

Chromatic. A target that fails the saving throw takes 4d6 damage of the type dealt by the dragon’s breath weapon at the end of its next turn.

Gem. A target that fails the saving throw has the Prone condition, and its Speed is reduced to 0 until the end of its next turn.

Metallic. Allies in the area take no damage from the destructive energy and instead regain 4d6 Hit Points.

    Ascendant (T4). The Ascendant gauntlets has the Stirring property, and it improves on the Slumbering and Wakened properties. The extra damage dealt by your Unarmed Strikes and natural weapons increases to 2d6, and the range of Blindsight granted by the gauntlets increases to 30 feet.
    In addition, the Temporary Hit Points gained from becoming empowered increases to 70, and the blast of destructive energy the gauntlets create while you are empowered increases to a 60-foot Cone or 90-foot long Line that is 5 feet wide, the save DC increases to 18, and the damage increases to 8d6.', NULL, 11660.0),
('1f292793-8ffd-5463-bebd-272ec4ffec5e', 'LOT_1167', 'Homebrew Hoard Magic Item', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'VARIES'), 'Varies', 'Varies', false, NULL, 'Varies', '{"HHB"}', 'Homebrew Hoard Magic Item created by a Full DM and as submitted to the Rules team for review and approval.', NULL, 11670.0),
('7dc5dfe5-9637-5f6b-9e0a-38d4bfac077e', 'LOT_1168', 'Frost-Locked Hull', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Ship Upgrade (Hull)', 'Permanent', false, NULL, 'T1 Select Permanent', '{"GoS"}', 'Hull upgrade for ships. See source for description.', NULL, 11680.0),
('401a2bdd-b98d-52a6-bc40-e9080e965e2f', 'LOT_1169', 'Scything Oars', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Ship Upgrade (Movement)', 'Permanent', false, NULL, 'T1 Select Permanent', '{"GoS"}', 'Movement upgrade (Oars) for ships. See source for description.', NULL, 11690.0),
('941184d9-d370-537f-8967-ac88f79d7c17', 'LOT_1170', 'Churning Hull', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Ship Upgrade (Hull)', 'Permanent', false, NULL, 'T2 Select Permanent', '{"GoS"}', 'Hull upgrade for ships. See source for description.', NULL, 11700.0),
('e4f8952d-37b5-5a0a-9aa5-8fda9ae5af34', 'LOT_1171', 'Death Vessel', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Ship Upgrade (Hull)', 'Permanent', false, NULL, 'T2 Select Permanent', '{"GoS"}', 'Hull upgrade for ships. See source for description.', NULL, 11710.0),
('a4c66ffe-b0ad-5e54-bfed-f2e69fc57b89', 'LOT_1172', 'Vigilant Watch', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Ship Upgrade (Hull)', 'Permanent', false, NULL, 'T2 Select Permanent', '{"GoS"}', 'Hull upgrade for ships. See source for description.', NULL, 11720.0),
('bbf6d146-e05b-5b82-b1f5-c0d120305cf6', 'LOT_1173', 'Clockwork Oars', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Ship Upgrade (Movement)', 'Permanent', false, NULL, 'T2 Select Permanent', '{"GoS"}', 'Movement upgrade (Oars) for ships. See source for description.', NULL, 11730.0),
('7c763e2e-3564-57b7-a375-f21e60b2a5da', 'LOT_1174', 'Dragon Sails', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Ship Upgrade (Movement)', 'Permanent', false, NULL, 'T2 Select Permanent', '{"GoS"}', 'Movement upgrade (Sails) for ships. See source for description.', NULL, 11740.0),
('e720554e-bb6f-5ede-84a3-a9dae4a3e067', 'LOT_1175', 'Screaming Sails', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Ship Upgrade (Movement)', 'Permanent', false, NULL, 'T2 Select Permanent', '{"GoS"}', 'Movement upgrade (Sails) for ships. See source for description.', NULL, 11750.0),
('84e60abf-2534-5114-8fa9-7977cc766866', 'LOT_1176', 'Arcane Artillery', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Ship Upgrade (Weapon)', 'Permanent', false, NULL, 'T2 Select Permanent', '{"GoS"}', 'Weapon upgrade for ships. See source for description.', NULL, 11760.0),
('e46c6d37-ffd2-5225-ba2e-10d0261bcbc4', 'LOT_1177', 'Concussive Rounds', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Ship Upgrade (Weapon)', 'Permanent', false, NULL, 'T2 Select Permanent', '{"GoS"}', 'Weapon upgrade for ships. See source for description.', NULL, 11770.0),
('a4ca7055-fada-5520-8787-4a35e22e07e4', 'LOT_1178', 'Explosive Rounds', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Ship Upgrade (Weapon)', 'Permanent', false, NULL, 'T2 Select Permanent', '{"GoS"}', 'Weapon upgrade for ships. See source for description.', NULL, 11780.0),
('efeef84b-fb2b-5790-b919-631ad8d11cdf', 'LOT_1179', 'Grasping Rounds', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Ship Upgrade (Weapon)', 'Permanent', false, NULL, 'T2 Select Permanent', '{"GoS"}', 'Weapon upgrade for ships. See source for description.', NULL, 11790.0),
('febd71a3-ca83-578d-a6c7-493ef71b7844', 'LOT_1180', 'Red Dragon Figurehead', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Ship Upgrade (Figurehead)', 'Permanent', false, NULL, 'T2 Select Permanent', '{"GoS"}', 'Figurehead upgrade for ships. See source for description.', NULL, 11800.0),
('b034aa3f-73d6-5071-8791-9d0e85934dd8', 'LOT_1181', 'Storm Giant Figurehead', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Ship Upgrade (Figurehead)', 'Permanent', false, NULL, 'T2 Select Permanent', '{"GoS"}', 'Figurehead upgrade for ships. See source for description.', NULL, 11810.0),
('fb9ec715-4b9e-5fb7-bae3-ca3d3a08e132', 'LOT_1182', 'Taskmaster''s Drums', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Ship Upgrade (Miscellaneous)', 'Permanent', false, NULL, 'T2 Select Permanent', '{"GoS"}', 'Miscellaneous upgrade for ships. See source for description.', NULL, 11820.0),
('20881ad7-a039-5bc5-905f-bba164131911', 'LOT_1183', 'Living Vessel', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Ship Upgrade (Hull)', 'Permanent', false, NULL, 'T3 Select Permanent', '{"GoS"}', 'Hull upgrade for ships. See source for description.', NULL, 11830.0),
('dee6512f-4255-5ea4-b4be-223c73929919', 'LOT_1184', 'Reinforced Hull', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Ship Upgrade (Hull)', 'Permanent', false, NULL, 'T3 Select Permanent', '{"GoS"}', 'Hull upgrade for ships. See source for description.', NULL, 11840.0),
('53655b04-9613-58bd-aee0-3a57a80ccce2', 'LOT_1185', 'Ever-Full Sails', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Ship Upgrade (Movement)', 'Permanent', false, NULL, 'T3 Select Permanent', '{"GoS"}', 'Movement upgrade (Sails) for ships. See source for description.', NULL, 11850.0),
('1bfb484b-9b05-5859-a15d-ac229aed0388', 'LOT_1186', 'Defiant Sails', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Ship Upgrade (Movement)', 'Permanent', false, NULL, 'T3 Select Permanent', '{"GoS"}', 'Movement upgrade (Sails) for ships. See source for description.', NULL, 11860.0),
('ab01ec03-4b1a-5f9c-a1d2-c06f9098232a', 'LOT_1187', 'Guardian Figurehead', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Ship Upgrade (Figurehead)', 'Permanent', false, NULL, 'T3 Select Permanent', '{"GoS"}', 'Figurehead upgrade for ships. See source for description.', NULL, 11870.0),
('364237dc-03fd-5ddd-8acd-f8e90af0979b', 'LOT_1188', 'Bones of Endless Toil', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Ship Upgrade (Miscellaneous)', 'Permanent', false, NULL, 'T3 Select Permanent', '{"GoS"}', 'Miscellaneous upgrade for ships. See source for description.', NULL, 11880.0),
('209e95ca-dd60-570b-b054-4c02cc7a37bb', 'LOT_1189', 'Smuggler''s Banner', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Ship Upgrade (Miscellaneous)', 'Permanent', false, NULL, 'T3 Select Permanent', '{"GoS"}', 'Miscellaneous upgrade for ships. See source for description.', NULL, 11890.0),
('03084788-0617-5d87-99b0-45a1071d50b8', 'LOT_1190', 'Chomper', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Infernal War Machine Upgrade (Weapon Station)', 'Permanent', false, NULL, 'T2 Select Permanent', '{"BGDIA"}', 'Chomper (Requires 1 Crew and Grants Half Cover). Melee Weapon Attack: Bonus equals infernal war machine''s Strength modifier + 5, reach 5 ft., one target. Hit: 6d6 + infernal war machine''s Strength modifier Piercing damage. A target reduced to 0 hit points by this damage is ground to bits and spit out through pipes on both sides of the infernal war machine. Any nonmagical items the target was holding or carrying are destroyed as well.', NULL, 11900.0),
('e2e6d8ae-2847-55e9-a641-95f86bf87bfa', 'LOT_1191', 'Flamethrower', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Infernal War Machine Upgrade (Weapon Station)', 'Permanent', false, NULL, 'T2 Select Permanent', '{"BGDIA"}', 'Weapon station for infernal war machine. See source for description.', NULL, 11910.0),
('86fc563a-437b-5d1a-8096-1f7cf5136657', 'LOT_1192', 'Grappling Claw', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Infernal War Machine Upgrade (Weapon Station)', 'Permanent', false, NULL, 'T2 Select Permanent', '{"BGDIA"}', 'Grappling Claw (Requires 1 Crew and Grants Half Cover). Melee Weapon Attack: Bonus equals infernal war machine''s Strength modifier + 5, reach 15 ft., one target. Hit: The target is grappled (escape DC 12). If the target is a creature, it is restrained until the grapple ends. The grappling claw can grapple only one target at a time, and the claw''s operator can use a bonus action to make the claw release whatever it''s holding.', NULL, 11920.0),
('26afd5c1-5cd5-5bd2-a078-d4b3fe3bf2d4', 'LOT_1193', 'Harpoon Flinger', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Infernal War Machine Upgrade (Weapon Station)', 'Permanent', false, NULL, 'T2 Select Permanent', '{"BGDIA"}', 'Harpoon Flinger (Requires 1 Crew and Grants Half Cover). Ammunition: 10 harpoons. Ranged Weapon Attack: Bonus equals infernal war machine''s Dexterity modifier + 5, range 120 ft., one target. Hit: 2d8 + infernal war machine''s Dexterity modifier Piercing damage.', NULL, 11930.0),
('0c7fdcb9-075d-519d-a8b8-3f0d14621459', 'LOT_1194', 'Infernal Screamer', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Infernal War Machine Upgrade (Weapon Station)', 'Permanent', false, NULL, 'T2 Select Permanent', '{"BGDIA"}', 'Weapon station for infernal war machine. See source for description.', NULL, 11940.0),
('a804eb9b-f60f-51a5-aa1e-08f2c8d5eceb', 'LOT_1195', 'Wrecking Ball', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Infernal War Machine Upgrade (Weapon Station)', 'Permanent', false, NULL, 'T2 Select Permanent', '{"BGDIA"}', 'Wrecking Ball (Requires 1 Crew and Grants Half Cover). Melee Weapon Attack: Bonus equals infernal war machine''s Strength modifier + 5, reach 15 ft., one target. Hit: 8d8 + infernal war machine''s Strength modifier Bludgeoning damage. Double the damage if the target is an object or a structure.', NULL, 11950.0),
('51fa3a6a-5ffa-546e-a1c9-67737b5d2e66', 'LOT_1196', 'Canian Armor', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Infernal War Machine Upgrade (Armor)', 'Permanent', false, NULL, 'T2 Select Permanent', '{"BGDIA"}', 'Armor upgrade for infernal war machine. See source for description.', NULL, 11960.0),
('8306652a-bcc7-514c-9641-2ebc2d06e746', 'LOT_1197', 'Gilded Death Armor', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Infernal War Machine Upgrade (Armor)', 'Permanent', false, NULL, 'T2 Select Permanent', '{"BGDIA"}', 'Armor upgrade for infernal war machine. See source for description.', NULL, 11970.0),
('95ecb399-895d-5339-9c45-86a8925d9cc2', 'LOT_1198', 'Soul Spike Armor', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Infernal War Machine Upgrade (Armor)', 'Permanent', false, NULL, 'T2 Select Permanent', '{"BGDIA"}', 'Armor upgrade for infernal war machine. See source for description.', NULL, 11980.0),
('61a41d21-0dba-5d44-be82-9308a321fd82', 'LOT_1199', 'Necrotic Smoke Screen', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Infernal War Machine Upgrade (Magical Gadget)', 'Permanent', false, NULL, 'T2 Select Permanent', '{"BGDIA"}', 'Magical gadget upgrade for infernal war machine. See source for description.', NULL, 11990.0),
('81b0919f-48f8-503c-92d1-07c0be935cb6', 'LOT_1200', 'Teleporter', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Infernal War Machine Upgrade (Magical Gadget)', 'Permanent', false, NULL, 'T2 Select Permanent', '{"BGDIA"}', 'Magical gadget upgrade for infernal war machine. See source for description.', NULL, 12000.0);

INSERT INTO public.ac_loot (
    id, check_id, name, category_id, tier_id, type, nature, is_dm_select, event_category, tier_display, source, description, notes_advice, display_order
) VALUES
('12e79d60-84c3-5a37-8c4a-f5ddd091ac8d', 'LOT_1201', 'Acidic Bile Sprayer', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Infernal War Machine Upgrade (Weapon Station)', 'Permanent', false, NULL, 'T3 Select Permanent', '{"BGDIA"}', 'Weapon station for infernal war machine. See source for description.', NULL, 12010.0),
('e7b4d7a6-60ca-5874-b61c-2711f8143b57', 'LOT_1202', 'Styx Sprayer', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Infernal War Machine Upgrade (Weapon Station)', 'Permanent', false, NULL, 'T3 Select Permanent', '{"BGDIA"}', 'Weapon station for infernal war machine. See source for description.', NULL, 12020.0),
('2d82fdd2-cd6c-553a-aad5-dd7bdfbafc39', 'LOT_1203', 'Hawthorne Cast-Off Shirt of Mending (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Exclusive Event', 'T0 Permanent (Exclusive Event)', '{"HHB"}', 'Wondrous item, T0

This shirt can come in a variety of design and color. It has the emblem of the Hawthorne Guild embroidered on it. You can take a Bonus Action to impressively rip this article of clothing off. After doing so, you feel the overwhelming urge to boast about your abilities to anyone within earshot. At the next dawn, the clothes mend themselves, ready to be ripped again.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12030.0),
('d7c48542-5348-5619-882a-c343f7c7a6cb', 'LOT_1204', 'Hawthorne Tear-Away Pants (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Exclusive Event', 'T0 Permanent (Exclusive Event)', '{"HHB"}', 'Wondrous item, T0

These pants feature snaps that run the length of the leg and the Hawthorne logo just below the waistband. As a Bonus Action, you can remove these comfortable sweatpants.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12040.0),
('b756632e-9e17-5da4-9602-aa79379da1cc', 'LOT_1205', 'Hawthorne Energy Drink (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Potion', 'Consumable', false, 'Exclusive Event', 'T1 Select Consumable (Exclusive Event)', '{"HHB"}', 'Potion, T1

This vial contains a brightly colored liquid. Energy drinks can come with a variety of colors and tastes. When you drink this potion, you recover one expended Hit Die.

Base Cost: 200 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12050.0),
('ccb7733b-7d76-54d0-a67d-3bcb771c4796', 'LOT_1206', 'Hawthorne''s Secret Stuff (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Potion', 'Consumable', false, 'Exclusive Event', 'T1 Select Consumable (Exclusive Event)', '{"HHB"}', 'Potion, T1

This opaque blue vial has a bright red cap and a yellow label affixed to it. The label reads ‘’Hawthorne’s Secret Stuff’’. When you drink this potion, you are under the effects of the Heroism spell for the next minute (no Concentration required, 3 Temporary Hit Points gained at the start of each turn).

Base Cost: 200 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12060.0),
('17c483b4-18f8-554e-b193-40e01bd3c25a', 'LOT_1207', 'Hawthorne Pouch of Hand Chalk (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Wondrous item', 'Consumable', false, 'Exclusive Event', 'T1 Select Consumable (Exclusive Event)', '{"HHB"}', 'Wondrous item, T1

This drawstring pouch has the Hawthorne logo embroidered on it. It contains 4 handfuls of hand chalk. The pouch and its contents weigh 1.5 pounds. As an Utilize action, one handful of hand chalk can be applied to the skin. The creature that receives it gains the following benefits for the next hour:
- The creature has a +5 bonus to Strength (Athletics) checks made to climb.
- Climbing doesn’t cost the creature extra movement.

Base Cost: 200 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12070.0),
('24efebe1-caf1-5b0d-bb7b-885ea50c59e3', 'LOT_1208', 'Figurine of Wondrous Power, Sandstone Frog (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Exclusive Event', 'T0 Permanent (Exclusive Event)', '{"HHB"}', 'Wondrous item, T0

This statuette of a frog is small enough to fit in a pocket and is made of sandstone. If you take a Magic action to throw the figurine to a point on the ground within 60 feet of yourself, the figurine becomes a living creature with the statistics of a Frog. If the space where the creature would appear is occupied by other creatures or objects, or if there isn''t enough space for the creature, the figurine doesn''t become a creature.

The creature is Friendly to you and your allies. It understands your languages, obeys your commands, and takes its turn immediately after you on your Initiative count. If you issue no commands, the creature defends itself but takes no other actions.

The figurine has 12 charges and each hour or portion thereof it spends in frog form costs 1 charge. While it has charges, you can use it as often as you wish. When it runs out of charges, it reverts to a figurine and can''t be used again until 12 hours have passed, where it regains all expended charges. It reverts to a figurine early if its frog form drops to 0 Hit Points or if you take a Magic action while touching the creature to make it revert to figurine form.

While the figurine is in frog form, you can take a Magic action while touching the frog to specify a period of time. If the figurine is in frog form after the specified amount of time has passed, the frog emits a continuous, shrill squeak that is audible out to 60 feet. The frog continues squeaking until it reverts to a figurine or if you take a Bonus Action to end it while touching the frog.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12080.0),
('090e5833-9fd1-5e9d-a70b-ef3ad63d0fd6', 'LOT_1209', 'Jar of Stars (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Exclusive Event', 'T0 Permanent (Exclusive Event)', '{"HHB"}', 'Wondrous item, T0

This jar is filled with enchanted motes of faerie light that dance and twinkle like tiny star-shaped fireflies. While the jar is in Dim Light or Darkness, it sheds Dim Light in a 10-foot radius.

Wonderful. While the jar is on your person, you feel peaceful and optimistic about what the future holds.  Fireflies frolic in this jar''s presence.

Like Stars in the Sky. While holding this jar, you can cast the Dancing Lights spell from it (no Concentration required), which takes the form of four motes released from the jar and which reform in the jar when the spell ends. This property of the jar can''t be used again until the next dusk.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12090.0),
('09e0a013-0142-5d90-97f3-cd252b7a4877', 'LOT_1210', 'Toadstool Cap (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Exclusive Event', 'T0 Permanent (Exclusive Event)', '{"HHB"}', 'Wondrous Item, T0

This whimsical mushroom cap makes your eyes sparkle with glints of sunlight.

Spellcasting Focus. You can use the cap as a Spellcasting Focus for your Druid spells.

Unknown Spell. As a Magic action, you can try to cast a cantrip that you don''t know. The cantrip must be on the Druid spell list and have a casting time of an action, and you make a DC 10 Intelligence (Nature) check. On a successful check, you cast the spell. On a failed check, the spell fails, and the action used to cast the spell is wasted. In either case, you can''t use this property again until you finish a Long Rest.

Emotional. This cap was created by the hyperemotional magic of the Plane of Faerie.  As a result, while wearing the cap, your emotions are heightened.  In addition, your emotions are reflected by a small illusory weather phenomenon that floats within 1 foot of your head.  For example, if you are sad, a small rain cloud floats above you; if you are happy, a small sun floats above you.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12100.0),
('509c6962-e035-5fdc-8bae-a979d39410c2', 'LOT_1211', 'Baha-mini-ut (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Exclusive Event', 'T0 Permanent (Exclusive Event)', '{"HHB"}', 'Wondrous item, T0

This Tiny figurine is carved in the likeness of the dragon deity Bahamut.

If you take a Magic action to toss this figurine into the air, the figurine orbits your head at a distance of 1d3 feet until you take an Utilize action to seize and stow it. The orbiting figurine is considered to be an object you are wearing and it avoids contact with other creatures and objects, adjusting its orbit to avoid collisions and thwarting all attempts by other creatures to attack or snatch it. If you die while the figurine is orbiting your head, it falls as though you had dropped it.

While the figurine is orbiting your head, you can cast one of the following spells from it (save DC 13): Resistance, Spare the Dying or Sacred Flame. Once the figurine has been used to cast a spell, it curls up on your shoulder as though sleeping and the figurine can''t be used to cast any spells again until the next dawn.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12110.0),
('3b66c7dd-623e-5483-bd55-885c75fa4b3a', 'LOT_1212', 'Comet Plushie (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Exclusive Event', 'T0 Permanent (Exclusive Event)', '{"HHB"}', 'Wondrous item, T0

Representing the King-Killer Star itself, this soft, Tiny, magic plushie resembles a reddish comet with a trail following it. 

If you take a Magic action to toss this plushie into the air, the plushie orbits your head at a distance of 1d3 feet for 1 hour or until you take an Utilize action to seize and stow it. The orbiting plushie is considered to be an object you are wearing and it avoids contact with other creatures and objects, adjusting its orbit to avoid collisions and thwarting all attempts by other creatures to attack or snatch it. If you die while the plushie is orbiting your head, it falls as though you had dropped it.

When you make a saving throw to avoid or end the effects of the Dracorage or the Charmed condition on yourself, you can give yourself Advantage on the roll if the plushie is orbiting your head. You must decide to do so before rolling the d20. If the save succeeds, you can''t use the plushie in this way until you finish a Long Rest.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12120.0),
('aa5ca303-6a5a-5ef6-9be6-51a2a2094e9c', 'LOT_1213', 'Draconic Pin (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Exclusive Event', 'T0 Permanent (Exclusive Event)', '{"HHB"}', 'Wondrous item, T0

This pin glows faintly when Dragons are within 120 feet of it. The color the pin glows corresponds to the type of Dragon within 120 feet, such as glowing red if a red dragon of any age category is within 120 feet. If multiple Dragons are within 120 feet, the color the pin glows corresponds to the oldest Dragon.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12130.0),
('025346bf-e977-541f-8610-954694579084', 'LOT_1214', 'King-Killer Star Ribbon (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Exclusive Event', 'T0 Permanent (Exclusive Event)', '{"HHB"}', 'Wondrous item, T0

This ribbon appears like the tail of a comet. If you press it to your guild badge, it remains attached there until you take an Utilize action to remove it. While the ribbon is attached to your guild badge, you can take a Magic action to touch the ribbon and create a small light in your hand that sheds Bright Light in a 10-foot radius and Dim Light for an additional 10 feet. The light is in the shape of a reddish comet and vanishes if you take a Magic action to dismiss it or if the ribbon is no longer on your person or attached to the badge.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12140.0),
('96bd0a65-85d7-5181-9ae7-5da815468172', 'LOT_1215', 'Medallion of Bahamut''s Remembrance (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Exclusive Event', 'T0 Permanent (Exclusive Event)', '{"HHB"}', 'Wondrous Item, T0

While wearing this medallion, you can take a Magic action to create an immobile and majestic illusion of the deity Bahamut in a 15-foot Cube behind you. The illusion is obviously illusory and lasts for 1 minute or until you dismiss it with a Magic action or take this Magic action again.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12150.0),
('77949297-d848-5374-96b5-9d6fd64870f7', 'LOT_1216', 'Medallion of Tiamat''s Remembrance (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Exclusive Event', 'T0 Permanent (Exclusive Event)', '{"HHB"}', 'Wondrous Item, T0

While wearing this medallion, you can take a Magic action to create an immobile and imposing illusion of the deity Tiamat in a 15-foot Cube behind you. The illusion is obviously illusory and lasts for 1 minute or until you dismiss it with a Magic action or take this Magic action again.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12160.0),
('a615551a-63e1-56f8-bc0b-3b5c370c7abf', 'LOT_1217', 'Tiny-imat (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Exclusive Event', 'T0 Permanent (Exclusive Event)', '{"HHB"}', 'Wondrous item, T0

This Tiny figurine is carved in the likeness of the dragon deity Tiamat.

If you take a Magic action to toss this figurine into the air, the figurine orbits your head at a distance of 1d3 feet until you take an Utilize action to seize and stow it. The orbiting figurine is considered to be an object you are wearing and it avoids contact with other creatures and objects, adjusting its orbit to avoid collisions and thwarting all attempts by other creatures to attack or snatch it. If you die while the figurine is orbiting your head, it falls as though you had dropped it.

While the figurine is orbiting your head, you can cast the Sorcerous Burst spell (+5 attack bonus; Acid, Cold, Fire, Lightning, or Poison damage only) from it. Once the figurine has been used to cast a spell, it curls up on your shoulder as though sleeping and the figurine can''t be used to cast any spells again until the next dawn.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12170.0),
('2693b3c3-d242-512f-95c3-c379fc9b64f6', 'LOT_1218', 'King-Killer Star Pebble (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Trinket', 'Permanent', false, 'Exclusive Event', 'T0 (Exclusive Event)', '{"HHB"}', 'Trinket, T0

This is a fragment of the King-''Killer Star taken from a large rock that was retrieved from the comet and split to be shared among those that participated in the final battle of the Rage of Dragons of 1499 DR. It serves as a testament and reminder of when the Hawthorne Guild defended the world and what it endured to do so.

Base Cost: 0 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12180.0),
('2f8bdb7d-7b9f-5404-bc22-0b77bed049e1', 'LOT_1219', 'Favored of Bahamut (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Story Outcome', 'Permanent', false, 'Exclusive Event', 'T0 (Exclusive Event)', '{"HHB"}', 'Story Outcome, T0

You have proven to be an ally of the Platinum Dragon through your efforts during the Rage of Dragons. When interacting with followers of Bahamut or speaking with metallic Dragons outside of combat, you can make a DC 15 Charisma (Persuasion) check. On a success, you can request one of the following favors:
- Ask for shelter for up to one week.
- Receive information on one object or creature within their territory.
- Receive transport to a location with no questions asked.

Once you successfully use this Story Reward, remove it from your character sheet.', NULL, 12190.0),
('4a428279-f808-55bd-9942-686afb7bf4f6', 'LOT_1220', 'Favored of Tiamat (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Story Outcome', 'Permanent', false, 'Exclusive Event', 'T0 (Exclusive Event)', '{"HHB"}', 'You have proven to be an ally of the Dragon Queen through your efforts during the Rage of Dragons. When interacting with followers of Tiamat or speaking with chromatic Dragons outside of combat, you can make a DC 15 Charisma (Persuasion) check. On a success, you can request for one of the following favors:
- Ask for them to turn a blind eye to a recent activity you took
- Ask them to pretend they hadn''t seen you
- Receive information about an object or creature in their territory

Once you successfully use this Story Reward, remove it from your character sheet.', NULL, 12200.0),
('59ab8ea3-1b9a-5db5-a64d-a231fc909a20', 'LOT_1221', 'Hawthorne Locket (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Wondrous item', 'Permanent', false, 'Exclusive Event', 'T1 Select Permanent (Exclusive Event)', '{"HHB"}', 'Wondrous item, T1

This metal locket commemorates your time spent as an adventurer with the Hawthorne Guild and has a relief of a hawthorn tree engraved on the front: the symbol of the Hawthorne Guild. On one half of the locket''s interior is an image of yourself from the first day you joined the guild. The other half of the locket''s interior has space for an image of someone else.

While wearing this locket, you gain the following benefits.

CINEMA. While wearing this locket, you can take a Bonus Action to create one or more of the following effects of your choice for the next minute:
- Accompanying Score. You and all other creatures within 10 feet of yourself hear music that reflects your mood and the situation, ranging from contemplative, ethereal, mournful, triumphant, or more.
- Classic Colors. You and all other creatures within 10 feet of yourself perceive your surroundings in black and white.
- In Frame. You and all other creatures within 10 feet of yourself perceive your surroundings to be contained within a frame akin to a painting frame.
- Windswept. You and all other creatures within 10 feet of yourself experience unseen wind to cause your hair and garments to be dramatically windswept.

Lessons of the Past. While wearing this locket, you can take a Magic action to contemplate the images contained in the locket. You can add 1d4 to one D20 Test of your choice that you make within the next minute. Once this property of the locket is used, it can''t be used again until you finish a Short or Long Rest while wearing this locket.

Rising Up the Ranks. Both the color and material of the locket changes as your rank in the Hawthorne Guild changes. If you are level 4 or lower while wearing this locket, the locket is made of copper. If you are between level 5 and level 10 while wearing this locket, the locket is made of silver. If you are between level 11 and level 16 while wearing this locket, the locket is made of gold. If you are level 17 or higher while wearing this locket, the locket is made of platinum.

Base Cost: 400 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12210.0),
('4e471b2c-38b1-5e6b-9d45-151db0feda54', 'LOT_1222', 'Peerless Yellow Rose (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Exclusive Event', 'T0 Permanent (Exclusive Event)', '{"HHB"}', 'Wondrous Item, T0

Sent over as a sign of gratitude from the monks of the Monastery of the Yellow Rose dedicated to Saint Sollars the Twice Martyred, this yellow rose can be affixed and pinned onto a garment or woven into your hair and will not wilt. Outside of combat while you wear this rose, the flower will open or close in the presence of someone who is physically hurt or in pain, letting you know how close they are if they are within 30 feet of you.

Base Cost: 100 GP
Crafting Cost: N/A (cannot crafted)', NULL, 12220.0),
('4519edf6-3698-5fe8-bb11-5704db69a23c', 'LOT_1223', 'Selûnite Cloak (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Exclusive Event', 'T0 Permanent (Exclusive Event)', '{"HHB"}', 'Wondrous Item, T0

For fighting against the Moonmaiden''s ancient foe in defense of your home, the Church of Selûne has granted this to you. This cloak seems to weigh nothing and trails behind you as if you were followed around by the night sky itself. While wearing this cloak, you can take a Bonus Action to make it billow dramatically for 1 minute. Additionally, while wearing this cloak, you always know which direction is magnetic north, unless you are in a location that has no magnetic north. This cloak glows with a shimmering silver light during holidays dedicated to Selûne, like Shieldmeet.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12230.0),
('330e90a2-5369-5970-90f1-7677e4085083', 'LOT_1224', 'Miniature Corvid Companion', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Pet', 'Permanent', false, 'Exclusive Event', 'T0 (Exclusive Event)', '{"HHB"}', 'Pet, T0

This small, orb-like black bird appeared after the Night of Black Knives, seeming to find attachment to you. The corvid companion has the statistics of a Raven and at your request, it can perch on your shoulder. While the corvid companion is perched on your shoulder, it is immune to all damage and all conditions and cannot be targeted by attacks, spells, or other effects. The corvid companion can learn and speak up to three messages of 25 words or less at a time, and it can replace one of these messages after it has spoken it with a new message.', NULL, 12240.0),
('d5375854-d28e-5158-822b-866bcbede909', 'LOT_1225', 'Bulwark Against Loss', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Story Outcome', 'Permanent', false, 'Exclusive Event', 'T0 (Exclusive Event)', '{"HHB"}', 'Story Outcome, T0

The Followers of the Lady of Loss sought to spread the influence of Loss, and had been emboldened to raise their blades against Hawthorne, the Guild, and its allies. Just as Loss had emboldened her followers, your dedication to defending Hawthorne, the Guild, and its allies serve to embolden yourself in the eyes of others. When interacting with any of the five factions of Faerûn (the Emerald Enclave, the Harpers, the Lords'' Alliance, the Order of the Gauntlet, and the Zhentarim), you gain a +2 bonus to Charisma (Persuasion) and Charisma (Intimidation) checks to sway these factions.', NULL, 12250.0),
('23679795-96c1-5d0b-a066-3f9b651f11c8', 'LOT_1226', 'Glorious Plume (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous item', 'Permanent', false, 'Exclusive Event', 'T1 Permanent (Exclusive Event)', '{"HHB"}', 'Wondrous item, T1

This glorious purple plume of feathers can be attached to a helm, a hat or cap, a suit of armor, or to clothing. When an ally within 30 feet of yourself that can see you makes an attack while you are wearing the plume of feathers, you can take a Reaction to cause the ally''s attack roll to have Advantage. Once this property is used, it can''t be used again until you finish a Short or Long Rest.

Base Cost: 400 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12260.0),
('7ec1f7d5-a787-544e-83d2-1e4c5d2f9311', 'LOT_1227', 'Lionhat (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Exclusive Event', 'T0 Permanent (Exclusive Event)', '{"HHB"}', 'Wondrous item, T0

This hat has a surprisingly lifelike stuffed lion''s head atop of it. You can take a Bonus Action while wearing this hat to cause the lion''s head to emit a loud lion''s roar, which carries clearly out to 300 feet. 

Heart of a Lion. When you make a saving throw made to avoid or end the Frightened condition, you can give yourself advantage on the roll if you are wearing the hat. You must decide to do so before rolling the d20. If the save succeeds, you can''t use the hat in this way again until you finish a Long Rest.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12270.0),
('dfb8bdac-30c6-583c-ab90-6871d622820b', 'LOT_1228', 'Nolzur''s Neverending Pigmets (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Wondrous item', 'Permanent', false, 'Exclusive Event', 'T2 Select Permanent (Exclusive Event)', '{"HHB"}', 'Wondrous item, T2

This fine wooden box contains a pot of pigment and a brush (weighing 1 pound in total) that has the properties of a pot of Nolzur''s Mediocre Pigments (Nolzur''s Marvelous Pigments (2024)) except that after the pot is expended, it fully refills at dawn daily.', NULL, 12280.0),
('49da8b9b-c2c4-5d5a-82f9-898bb4febf7d', 'LOT_1229', 'Hula C''thula (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Exclusive Event', 'T0 Permanent (Exclusive Event)', '{"HHB"}', 'Wondrous item, T0

This tiny figurine, made of a soapy greenish-black stone, is exquisitely carved in the shape of a scantily clad mind flayer with a hula hoop around its waist. The upper body of this figure bobbles rhythmically when bumped or jostled.

Just Drive. When you make an ability check to control a vehicle you are piloting or if a vehicle you are piloting makes an ability check or saving throw, you can take a Reaction to cause the roll to have Advantage if you can see the figurine within 10 feet of yourself. Once used, this property can''t be used again until the next dawn.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12290.0),
('e73fd036-0d5b-53ff-a6ce-a77c0e38ea63', 'LOT_1230', 'Spell Jam Jar (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Exclusive Event', 'T0 Permanent (Exclusive Event)', '{"HHB"}', 'Wondrous Item, T0

This unassuming jar is capable of storing cantrips as magical jelly.

Jamming Jelly. The jar can store up to one cantrip at a time. When the jar is empty, any creature can cast a cantrip into the jar by jamming its hand into the jar as the spell is cast. The cantrip has no effect other than to be stored in the jar as jelly that fills the jar. The jar''s lid must be placed as soon as the jelly is made. After this property of the jar is used, it can''t be used again until the next dawn.

Unjamming the Jar. While holding the jar with two hands, you can cast the cantrip stored in it by opening the lid as the spell is cast. The cantrip uses the caster level, spell save DC, spell attack bonus, and spellcasting ability of the original caster but is otherwise treated as if you had cast the spell. The jelly disappears and the jar becomes empty once the spell is cast.

Smelly Jelly. Jelly stored in the jar for more than 24 hours goes bad and begins to stink.  The jar can''t be used to cast or store a cantrip until the jelly is cleaned out by hand, causing any stored spell to be lost.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12300.0),
('fe227f1c-f923-5504-874c-df7190ac12b8', 'LOT_1231', 'Kindori Voyage', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Story Outcome', 'Permanent', false, 'Exclusive Event', 'T0 (Exclusive Event)', '{"HHB"}', 'Story Outcome, T0

During your travels in Wildspace, you encountered and befriended a Kindori, which magically imbued you with a charm to call upon it again in the future. While you are in Wildspace or in the Astral Sea, you can use the charm to call the Kindori you befriended. The Kindori provides you and your party with spelljamming transport for a period of 30 days. After you use this Story Outcome, remove it from your character sheet.', NULL, 12310.0),
('10a62bd5-8f92-5cf5-9f5d-7198f77fafb9', 'LOT_1232', 'The Spirit of Joy', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Pet', 'Permanent', false, 'Exclusive Event', 'T0 (Exclusive Event)', '{"HHB"}', 'Pet, T0

For celebrating love, joy and authenticity during Lliira’s Festival of Joy, the Joybringer herself grants you a celestial companion made from her very own robes. 

The Spirit of Joy is a Chaotic Good creature. It loves to flit and play, though it can also be convinced to take happy, snuggly naps as well. 

It does not speak, and does not have a language of its own, but it can follow simple non-combat commands like, “Come here,” “Fetch,” “Play,” and “Sleep.” When left to its own devices, the patch on its chest constantly shifts with the colors of Lliira’s multi-colored robes.

Owners can use a magic action to speak the command word, “Spark joy!” and The Spirit of Joy will reflect any combination of colors you like. This pet cannot join in combat, and if struck, or commanded to fight, it will flee to the gardens of Brightwater forever.

When left to its own devices, the patch on its chest constantly shifts with the colors of Lliira’s multi-colored robes. It otherwise uses the statistics of Fluff Puffle.', NULL, 12320.0),
('10733be6-27e0-55aa-a786-f39c33843a14', 'LOT_1233', 'Hawthorne Cape (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Exclusive Event', 'T0 Permanent (Exclusive Event)', '{"HHB"}', 'Wondrous item, T0

This cape seems to be made from the leaves of a hawthorn tree but has a metallic sheen and is surprisingly durable. The symbol of the Hawthorne Guild is emblazoned on the back of the cape, marking you as a member of the famous adventuring guild while you wear it. The cape has the following properties while you wear it.

Billowing. While wearing this cape, you can take a Bonus Action to make it billow dramatically for 1 minute.

Rising Up the Ranks. The color of the leaves of this cape changes as your rank in the Hawthorne Guild changes. If you are level 4 or lower while wearing this cape, the color of the cape is copper. If you are between level 5 and level 10 while wearing this cape, the color of the cape is silver. If you are between level 11 and level 16 while wearing this cape, the color of the cape is gold. If you are level 17 or higher while wearing this cape , the color of the cape is platinum.

There''s No Place Like Home. While wearing this cape as a member of the Hawthorne Guild, you always know which way Hawthorne or the nearest portal leading to it is.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12330.0),
('f2f91b74-1629-5f23-b90c-1bac0c0f2d85', 'LOT_1234', 'Calamity Capsules (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Consumable', false, 'Seasonal Event', 'T0 Consumable (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

These small, semi-opaque capsules of unspecified material look as if they contain a maelstrom of unstable magic with a particular color. They have a small ring-shaped protrusion that allows them to be strung together for easy carrying. 

As an action, you can throw this capsule up to 20 feet against a creature or object, shattering it on impact. Make a ranged weapon attack against the target, treating the capsule as an improvised weapon. On a hit, the target is subjected to the capsule’s effect. Alternatively, you can crush the capsule in your hand to subject yourself to its effect.

The appearance of an affected creature is transformed for 1 hour to appear gravely injured by a particular damage type, accompanied by a visual effect when the capsule shatters. The color of the capsule determines the damage type and visual effect, as indicated in the table below. The visual effects given are examples and a capsule may contain a different one than indicated in the table. The effects of the capsule are illusions that fail to hold up to physical inspection. To discern that the injuries aren’t real, another creature can use its action to inspect an affected creature’s appearance and must succeed on a DC 13 Intelligence (Investigation) check.

Capsule Color and Visual Effect Table
Color              Damage          Effect
Yelow              Acid                 Gelatinous cube falls on the target, 
                                                then melts into the floor.
Brown             Bludgeoning    Large stone coffin falls down on the 
                                                target.
Cyan              Cold                 Miniature localized blizzard engulfs 
                                               the target.
Bright Red      Fire                 Column of fire engulfs the target.
Pink               Force               Swarm of Magic Missiles strike 
                                               the target simultaneously.
Blue               Lightning          Lightning strikes the target 
                                               three times in short succession.
Black             Necrotic           Large skeletal hand reaches up 
                                              and grasps the target. 
Orange          Piercing           Target is struck by a hail of arrows 
                                              or enclosed in an iron maiden.
Green            Poison            Poisonous snakes and spiders 
                                             engulf the target, then scatter.
Purple            Psychic          Hammer drives a spectral wedge 
                                             into the target’s head.
White            Radiant           Wall of holy flames smites the target.
Maroon         Slashing          Massive butcher''s knife hacks away 
                                             at the target.
Silver            Thunder           Target’s head is caught between a 
                                              gong and its mallet.

Base Cost: 50 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12340.0),
('dcc462f4-be6e-5fef-9d51-e9500397866a', 'LOT_1235', 'Capsules of Gore (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Consumable', false, 'Seasonal Event', 'T0 Consumable (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

When you bite this small red capsule, it is destroyed as a stream of fake blood and gore streams from your mouth, covering you in fake gore. While you are covered in this gore, you have advantage on ability checks made to disguise yourself as a corpse. This fake gore can be washed off with water.

Base Cost: 50 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12350.0),
('6915fecb-8a53-5272-9c50-1d8be1ef2558', 'LOT_1236', 'Carving Knife of Awakening (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Consumable', false, 'Seasonal Event', 'T0 Consumable (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

You can spend 1 hour of work using this knife to carving a gourd, melon, or other rounded plant. At the end of the hour, the carved plant magically animates and this knife loses its
magical properties and becomes a nonmagical knife. The animated plant uses the statistics of an Awakened Shrub and is friendly to you. Absent commands, the plant tries to play pranks and cause mischief to those around it. At the next dawn, the plant becomes an ordinary plant once again and ceases to be animated.

Base Cost: 50 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12360.0),
('593d6c5b-b0c0-5af7-b264-e4898a1442cf', 'LOT_1237', 'Facehugger (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Consumable', false, 'Seasonal Event', 'T0 Consumable (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

This severed hand can be placed on your shoulder. While holding the severed hand or while it is on your shoulder, you can take a Magic action to cause the severed hand to animate and pounce on a Medium or smaller creature you can see within 20 feet of yourself. 

The target must succeed on a DC 12 Dexterity saving throw or the severed hand attaches to its face. While the hand is attached to a creature''s face, it has the Blinded condition and takes 1d4 Bludgeoning damage at the start of each of its turns. 

To remove the hand, the target or a creature within 5 feet of it must take an action to make a DC 10 Strength (Athletics) check, removing the hand on a success. Destroying the hand (AC 10; HP 5; Resistance to all damage) also removes it from the target''s face.

If the target succeeded on its initial saving throw or if the severed hand is removed without being destroyed, the severed hand rapidly skitters out of sight and irretrievably disappears.

Base Cost: 50 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12370.0),
('9092e419-d7ab-5df2-bef5-fb20867dc55f', 'LOT_1238', 'Hooligan Bandages (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Consumable', false, 'Seasonal Event', 'T0 Consumable (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

You can use a Magic action to speak a command word and throw this roll of bandages at a building within 60 feet whose longest dimension does not exceed 60 feet. The bandages unfurl themselves and wrap around the exterior of the building so as to act as a nuisance. After the bandages are thrown and unfurl themselves in this way, they lose their magic and become ordinary bandages. 

Base Cost: 50 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12380.0),
('98c4fe82-78c3-52a7-ac3b-9185d29dc1be', 'LOT_1239', 'Marvelously Frightful Wardrobe (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Consumable', false, 'Seasonal Event', 'T0 Consumable (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This Tiny wardrobe is made of ebony wood and can comfortably fit in a hand. When you take an Utilize action to toss this wardrobe into the air, it vanishes in a plume of smoke, and you and other willing creatures within a 10-foot Emanation originating from you become garbed in or have any worn garments transform to take on the appearance of a Frightful Costume.

A Frightful Costume is composed of magical makeup, clothes, wigs, and fake appendages to alter your appearance. This appearance lasts for 8 hours and ends early if the affected garments are doffed or if dismissed by an affected creature with an Utilize action, causing the costume to disappear in a plume of smoke. The costume''s appearance is determined by rolling on the Frightful Wardrobe table.

Frightful Wardrobe Table
D20   Frightful Costumes
1     A bed sheet with two holes cut out for seeing through
2     Fake vampire teeth that are worn over normal teeth
3     Pumpkin
4     Imp
5     Scarecrow
6     Gargoyle
7     Skeleton or Zombie
8     Banshee
9     Flesh Golem
10    Mummy
11    Swamp Thing
12    Dullahan
13    Hag
14    Lycanthrope
15    Archmage
16    Pit Fiend
17    Beholder
18    Vampire
19    Lich
20    Any other result on the table of your choice

If you are hidden while wearing the costume, you can take an action to come out of hiding and attempt to scare one creature within 15 feet of yourself that can see you and force it to make a DC 13 Wisdom saving throw. On a failed save, the target has the Frightened condition until the start of your next turn and the costume disappears early at the start of your next turn.

Base Cost: 50 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12390.0),
('ecd42499-c4ac-56bd-9164-45c1aef51f81', 'LOT_1240', 'Seeker Eggs (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Consumable', false, 'Seasonal Event', 'T0 Consumable (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

As a Magic action, you can whisper the phrase “egg them” and hurl this rotten egg. The egg then seeks out a target of your choice within 60 feet of you. You must have seen the target before, but you don''t need to see it now. If the target isn''t within range or if there is no clear path to it, the egg falls to the ground, its magic spent and wasted and the egg is destroyed. Otherwise, the egg is guided instantly through the air to the target. The egg can also change direction to fly around corners.

When the egg reaches its target, the target must succeed on a DC 10 Dexterity saving throw or the egg impacts them and splatters its rotten contents upon the target, destroying the egg. For the next hour, the target exudes a foul odor and other creatures have advantage on Wisdom (Perception) checks relying on smell made to detect the target’s location while within 10 feet of the target. The odor can be removed early by the target or another creature within 5 feet by washing off the scent using an Utilize action and 1 gallon or more of water. 

Base Cost: 50 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12400.0),
('616d2973-8b76-5dca-9e9c-1967751d7d03', 'LOT_1241', 'Sweets of Hyperactivity (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Consumable', false, 'Seasonal Event', 'T0 Consumable (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

This package contains 1d4 sweets, which come in four varieties. The DM chooses the sweets or determines them randomly by rolling on the following table.

Sweets of Hyperactivity Table
d4 Sweets
1    Candied Berry
2   Chocolate Bar
3   Hard Candy
4   Lollipop

You can take an Utilize action to consume one of the sweets to enter into a sugar rush and gain an effect depending on the type of sweet consumed. You can only benefit from one sweet at a time.
- Candied Berry. The sugar rush comes with a burst of insight. You are under the effect of the Zephyr Strike spell for the spell''s duration.
- Chocolate Bar. You feel nothing is out of your reach. You are the effect of the Jump spell for the spell''s duration.
- Hard Candy. The crystallized candy empowers you to move faster. You are under the effect of the Longstrider spell for the spell''s duration.
- Lollipop. You are empowered by bursts of speed but find it difficult to speak. You are under the effect of the Expeditious Retreat spell for the spell''s duration. While the spell is ongoing in this way, you can''t cast spells with a Verbal component and you can speak only falteringly.

Base Cost: 50 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12410.0),
('20ef0be0-ba24-5c1d-9bf5-733b23686af9', 'LOT_1242', 'Take It or Leaf It! (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Consumable', false, 'Seasonal Event', 'T0 Consumable (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

Inside this container are 5 leaves prepared for consumption. These leaves were harvested a year ago and pickled in salt during that time. With the arrival of fall, they have been battered and deep-fried to be enjoyed as an autumnal snack.

You can take an action to consume one of the leaves and roll 1d8. On a 5 or higher on the d8, you gain Temporary Hit Points equal to the number rolled. On a 4 or lower, you merely enjoy a sweet, crunchy snack.

Base Cost: 50 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12420.0),
('96f86ac7-7783-5e8e-8ecb-c03097d29a79', 'LOT_1243', 'Vial of Ectoplasm (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Potion', 'Consumable', false, 'Seasonal Event', 'T0 Consumable (Seasonal Event)', '{"HHB"}', 'Potion, T0

When you drink this potion, you can see into the Ethereal Plane for the next minute, out to a range of 30 feet. This potion’s translucent liquid looks slimy and gooey.

Base Cost: 50 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12430.0),
('7a908f35-7b6a-59fe-8536-4c71bbc11149', 'LOT_1244', 'Witch''s Brew: Wightful Heir (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Potion', 'Consumable', false, 'Seasonal Event', 'T0 Consumable (Seasonal Event)', '{"HHB"}', 'Potion, T0

When you drink this potion, harmless incorporeal spirits materialize around you and remain for 1 hour or until you take a Magic action to dismiss them early. For the same duration, you have Advantage on all Charisma (Intimidation) checks made to influence a creature within 5 feet of yourself.

The spirits produce no sound but appear to fawn over you and are friendly to you and they respond to your actions and words when interacting with them. If you interact with the spirits in a hostile or unfriendly manner, the spirits fly through your body before vanishing, ending the effect early and you take 2d6 Necrotic damage.

Base Cost: 50 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12440.0),
('1a317c2e-553f-5469-a339-5930467bbc11', 'LOT_1245', 'Angel''s Harvest (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

This small celestial figurine made of marble wields a sickle, poised to strike.

Spellcasting Focus. You can use the figurine as a Spellcasting Focus for your Cleric or Paladin spells.

Imbue Radiance. While holding the figurine, you can take a Bonus Action and use the figurine''s command word to add 1d4 Radiant damage to one melee attack you make this turn. Once this property is used, it can''t be used again until the next dawn.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12450.0),
('24b360bb-33a1-5335-adb6-5dc27da970a3', 'LOT_1246', 'Angelic Statuette (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

This Tiny statuette resembles a female angel, covering her face as if she is weeping in sadness.

A creature that touches this statuette becomes cursed by the statuette unless another creature is already cursed by the statuette. The statuette can only curse one creature in this way at a time, and a creature remains cursed until it is targeted by a Remove Curse spell or similar magic.

When the statuette is not being actively observed, it immediately moves with a Speed of 30 feet to approach the cursed creature until it is either actively observed again or is within 5 feet of the cursed creature. The statuette never moves close enough to touch the cursed creature.

If the cursed creature ever sleeps and intends to awaken at a specific time, it experiences the sensation of two tiny hands touching its face and momentary panic of a feeling of being horribly late for something before it awakens at the designated time. A cursed creature that awakens always discovers the statuette in the closest unoccupied space to where it was sleeping.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12460.0),
('9fbc7d60-a683-5915-a0bd-0a4c896129c5', 'LOT_1247', 'Arachnaring (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Ring', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Ring, T0

This small jade ring displays the motif of a spider. You can use a Bonus Action to speak a command word, causing the spider design to detach itself from the ring and animate for the next hour. At the end of that duration, the spider ceases to be animated and cannot be animated again until the next dawn. While animated, the spider obeys your simple commands but cannot take actions. The spider has AC 5, 1 Hit Point, a walking and climbing speed of 20 feet, and can climb difficult surfaces, including upside down on ceilings, without needing to make an ability check.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12470.0),
('3490deaf-9699-5b5b-904f-62817c42da20', 'LOT_1248', 'Autumnal Keepsake (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

On this necklace hangs a charm depicting the harvest moon with its warm golden glow. With it, the user is never separated from the smell of a pumpkin pie or the sight of gently falling autumn leaves.

While wearing this necklace, you can take a Magic action to produce one of the following magical effects. If you take this Magic action multiple times, you can have up to three non-instantaneous effects active at a time.
- Comfort Food. You create an instantaneous, harmless smell in a 5-foot Cube within 15 feet of yourself, such as that of roasting cinnamon, nutmeg, and clove or any other scent that makes you nostalgic for 1 minute.
- Fall Colors. One object within 15 feet of yourself takes on shades of orange, brown, and earthy greens for 1 hour to match the autumn palette.
- Turning of the Leaves.  You create an illusory image of gently falling autumn leaves in a 5-foot Cube within 15 feet of yourself. The illusion lasts for 1 minute, with illusory leaves appear to shimmer and dance as they fall for the duration.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12480.0),
('3260709b-af2b-5fe3-9246-498380484598', 'LOT_1249', 'Bag O'' Bones (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

You can take a Magic action to turn this bag inside out and cause a pile of bones to spill out and form into three Tiny animated skeletons that are approximately 5 inches tall and each carries a wind instrument made of bones. The skeletons then spend the next minute playing their instruments as part of a performance, after which they collapse into an inanimate pile of bones and disappear. You have a +5 bonus to the first Charisma (Intimidation) or Charisma (Performance) check you make while the skeletons are playing.

If this Magic action is taken more than once before the next dawn, there is a cumulative 50 percent chance for each use after the first that the skeletons play off-key in a discordant performance and you instead have a -5 penalty to the first Charisma (Intimidation) or Charisma (Performance) check you make while the skeletons are playing.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12490.0),
('bd89002b-fb2d-51b3-b7ff-eb8d535f6ecf', 'LOT_1250', 'Bootern (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

This glowing red lantern is designed with a cute ghost carving on it and has a resting spirit within it. You can take an Utilize action to attach the lantern to or detach it from a Simple or Martial weapon you are holding. 

While holding the lantern or the weapon it is attached to, you can take a Bonus Action to command the spirit  to shed reddish Bright Light in a 30-foot radius and Dim Light for an additional 30 feet.

While holding the lantern or the weapon it is attached to, you can take a Magic action to have the spirit leave the lantern and accompany you for 1 hour, after which the spirit returns to the lantern. The spirit resembles a floating white wisp and is fond of saying "Boo!"

While the spirit accompanies you in this way, you can take a Magic action to command it to cast the Control Flames spell on your turn or to dismiss it, except it can only have one non-instantaneous effect active at a time. 

If you roll a 1 on the d20 for an attack roll or ability check while the spirit accompanies you, the spirit immediately casts the Cause Fear spell (save DC 13) targeting you. 

The spirit is bound to the lantern and can''t be harmed, turned, or raised from the dead.

Casting a Dispel Evil and Good spell on the lantern releases the spirit to the afterlife and renders the lantern nonmagical.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12500.0),
('d78c43e6-cd26-5fe4-ade5-bae499905d7b', 'LOT_1251', 'Boots of Crunching Delight (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

These leather boots of earthly brown, orange, and yellow tones are adorned with similarly colored leaf designs of the harvest season.

While wearing the boots, you can take a Magic Action to create a Small pile of crisp dry leaves in an unoccupied space on the ground within 5 feet of you. The leaves last for 1 minute before disappearing. Once this property has been used, it can''t be used again until the next dusk.

While wearing the boots, you can use their command word (no action required). If you do, your steps make a satisfying crunching sound, you take no falling damage when landing on a pile of dry leaves, and you have Disadvantage on Dexterity (Stealth) checks. The effect ends early if you are no longer wearing the boots, or if you use the command word again. When you''ve used the boots'' property for a total of 10 minutes, the magic ceases to function for you until you finish the next dusk.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12510.0),
('2c23892d-88b7-5438-8c91-a807621701e2', 'LOT_1252', 'Candle of Friendly Ghosts (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

This candle smells of cinnamon and apple cider but its lit flame reveal small ghostly hands reaching from the base as if warming themselves by the fire. 

This candle''s wax can''t melt down due to its lit flame. While you hold the lit candle, small harmless spirits appear to drift around you and mimic your actions. 

While holding the lit candle and while the spirits are present, you can take a Magic action to command the spirits to cast the Minor Illusion spell (save DC 11). Once used, this property can''t be used again for 1 hour.

The spirits vanish and refuses to reappear again for 1 hour if you or another creature within 5 feet of the candle speak cruelly to the spirits or extinguish the candle''s flame without giving thanks to the spirits.

If the spirits vanish in this way for a third time, the candle turns black and is destroyed, leaving behind only ashes. The creature that caused the spirits to vanish is cursed until the creature is targeted by a Remove Curse spell or similar magic. While cursed, the creature hears cryptic whispers at night and while sleeping.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12520.0),
('32ca0aa8-638d-5ac1-ab49-49e431c97a44', 'LOT_1253', 'Cinnamon Broom (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This broom was crafted from bound pine straw infused with the essence of cinnamon oil and warding magic. Such brooms can be found in households during the Feast of the Moon, when the barriers between the living world and that of the dead are believed to be thinnest.

This broom is 3 feet tall and regrows to its full size daily at dusk.

Spellcasting Focus. While holding the broom, you can use it as a Spellcasting Focus for your Sorcerer, Warlock, or Wizard spells.

Aromatizing. While holding the broom, you can take a Magic action to reduce the broom''s size by 1 inch (provided it is over 3 inches tall) and cause the broom to emit a harmless scent of cinnamon in a 10-foot Emanation originating from it for 1 hour. 

Cleansing. While holding the broom in a kitchen or room with a cauldron, fireplace, hearth, stove, or similar feature, you can take a Magic action to reduce the broom''s size by 1 foot (provided it is over 1 foot tall) and cause it to animate for 1 hour. While animated, the broom flies about on its head and cleans up to 10 feet of ceilings, flooring, walls, and other hard surfaces per minute as if using the Prestidigitation spell and leaves behind a lingering faint scene of cinnamon. The broom has AC 5, 1 Hit Points, and a walking Speed and Fly Speed of 30 feet. Once used, this property can''t be used again until the next dusk. 

Warding. You can take a Magic action to reduce the broom''s size by 1 foot (provided it is over 1 foot tall) and affix the broom beside or above a Large or smaller opening, such as the doorframe of a door, the arch of an archway, a window, or other entrance. The broom remains affixed for 4 hours or until removed with a Magic action. While affixed, the broom produces the effect of the Alarm spell for anything that passes through the opening except for creatures you designate and you receive a mental alarm in the form of a sudden scent of cinnamon and dry pine straw. Once used, this property can''t be used again until the next dusk. 

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12530.0),
('b8db782a-ba01-591e-a497-1cbec60fbf3e', 'LOT_1254', 'Deck of the Dead (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

This weathered tarokka deck consists of 22 cards wrapped in black silk and faintly smells of grave soil and incense. Each card of the deck depicts a different figure with varying expressions and whose eyes appear to blink. When you draw the cards beneath moonlight, the cards whisper faint words only you can hear.

While holding the deck, you can take a Magic action to channel spirits to create one of the following magical effects within 30 feet of yourself.
- You create an instantaneous, harmless sensory effect, such as a flickering azure flame, an unnaturally chill breeze, rhythmic chanting, or the smell of incense.
- You instantaneously light or snuff out a candle, torch, or a small campfire.
- You make a minor spirit briefly appear and fade away.
- You create a mote of iridescent light that points in the direction of the closest place of spiritual power, recent death, or new birth.
- You make leylines within 30 feet of yourself briefly reveal themselves as they flicker with otherworldly light.
- You make a card in the deck flip over and glow with a faint light, revealing a brief, cryptic omen as determined by the DM.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12540.0),
('d47dce82-0305-5d64-a9fc-b6e2d1037929', 'LOT_1255', 'Doctor Fun''s Dashing Spider (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

This Tiny clockwork spider has a button in the shape of a smiley face on its back. The button glows faintly in the dark, and you can use an Utilize action to click the button to animate this spider for the next hour. For that duration, the spider moves away from you and towards the nearest building to cover the interior and exterior of the building with harmless and magically created cobwebs. The spider can cover a 5-foot cube with harmless cobwebs each minute. At the end of that duration, the clockwork spider stops and can’t be activated again until the next dusk. The spider can be deactivated early by a creature using their action to make a DC 15 Dexterity check to click the button while within 5 feet of the spider. The spider has AC 5, 1 Hit Point, a walking and climbing speed of 20 feet, and can climb difficult surfaces, including upside down on ceilings, without needing to make an ability check.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12550.0),
('ecff8b0f-8d93-5c67-a53e-fe77db019dc8', 'LOT_1256', 'Doctor Fun''s Instant Costume (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

This magical garment comes in the form of clothing or other worn accessory such as a piece of jewelry or a cloak, with a smiley face stamped onto one of its corners. While you wear this garment, illusory magic causes any worn armor and clothing to take on the appearance of an outfit embedded into the cloth, but your worn armor and clothing retain their normal bulk and weight. The illusory appearance lasts until you remove this garment.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12560.0),
('a247915e-76bb-5931-8db4-1f1daa9d3132', 'LOT_1257', 'Eerie Orb-ituary (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This dark glass orb is cold to the touch and faintly glows with drifting motes of pale light that hold memories of death inside.

Illusory Remembrance. While holding the orb, you can take a Magic action to conjure an illusion of a creature you have personally slain or that has slain you before. The illusion appears in an unoccupied space within 5 feet of you and lasts for 1 minute or until you dismiss it as a Bonus Action. The illusion is obviously illusory and can be immediately recognized as such by any creature that sees it. While the illusion is present, it produces eerie sounds and motions reminiscent of the original creature but it cannot move from the space it was created in or deal damage.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12570.0),
('b175f618-d15e-5621-8e95-14749536f53e', 'LOT_1258', 'Fangs of Shadow and Minions (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

These polished ivory fangs are designed to slip perfectly over your upper canines, giving you a perpetually brooding, yet oddly sparkly, vampiric visage. They occasionally emit tiny wisps of smoke when you yawn. 

You gain the following benefits while wearing these fangs.

Thespian Flair. You can take a Magic action to emanate shadowy smoke from your body that takes the form of a creature, such as a bat, a spider, or a wolf. The form must be small enough to fit in a 1-foot cube and loses its shape after 6 seconds, becoming an ordinary puff of smoke.

Squeaking Servants. You can cast the Unseen Servant spell, which takes the form as a visible cauldron of vampiric bats. Once used, this property can''t be used again until the next dusk.

Shameful Sparkle. While in sunlight, your skin glitters and you shed Bright Light in a 10-foot radius and Dim Light for an additional 10 feet. This light is particularly noticeable to and often attracts the attention of small animals or other creatures attracted to shiny objects, such as magpies.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12580.0),
('e8d87e59-8ed6-589a-84cb-e68c455e02fe', 'LOT_1259', 'Frightening Frame (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This darkly gilded miniature picture frame is empty when first found. This picture frame was created by a fan of the Hawthorne Guild that was also fond of the spooky stories shared during the autumn season. A sense of energy can be felt thrumming through it.

Shake, Rattle, and Roll. While holding the frame, you can take a Magic action to target one creature within 10 feet of yourself. The picture frame is momentarily filled with images of your most recent harrowing experiences (such as your adventures during the Feast of the Moon season) and if the target can see the picture frame, it must succeed on a DC 13 Wisdom saving throw or have the Frightened condition until the end of its next turn. Once used, this property can''t be used again until the next dusk.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12590.0),
('1bc74b16-e249-505c-b1ea-ad74b079baec', 'LOT_1260', 'Garden Shears of the Bloody Harvest (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

These garden shears appear to be made of an unknown dark metal. When these shears are used to harvest an edible plant, that plant bleeds illusory blood for 1 minute, and a duplicate of the plant is magically created, which spoils if uneaten after 24 hours. The shears can be used to duplicate up to 18 pounds of edible plants, or enough to sustain up to 6 humanoids for 24 hours, after which this property can’t be used again until the next dawn.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12600.0),
('61cd9bba-b07e-5aac-a51a-42d58a4830cb', 'LOT_1261', 'GPPL Frightlight (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

This Tiny object is 11 inches tall and resembles a beast as determined by the DM. As a Magic action, you can speak the command word to animate this object, after which it follows you for 8 hours. For that duration, the frightlight can hold up to six torches and lights any torches it is given. At the end of the duration, the frightlight stops until activated again. The frightlight has AC 5, 1 Hit Point, and a walking speed of 30 feet.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12610.0),
('d34d16e5-26ec-520e-b3e8-be936baa559d', 'LOT_1262', 'Hauntling''s Mirror (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

While holding and looking at this silver mirror, you can use a Magic action to speak the phrase “Where are you?” three times. A small ghostly spirit appears beside your reflection in the mirror. The spirit can interact with the objects and environment depicted in the mirror and thus alter what is depicted in the mirror. These alterations in the mirror do not affect anything outside the mirror, and the spirit is unaware that it exists as a reflection in the mirror. You can dismiss the spirit by speaking the phrase “See you soon,” with no action required. The spirit’s behavior is determined by the DM.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12620.0),
('f5adea3f-09dd-5a5c-aa1a-811a208d2580', 'LOT_1263', 'Headband of Skimpiness (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

While you wear this headband, illusory magic causes any worn armor and clothing to take on the appearance of more revealing armor and clothing that seems to expose bare flesh, but your worn armor and clothing retain their normal bulk and weight. The illusory appearance lasts until you remove this headband.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12630.0),
('da70a27c-e384-52ec-a9be-c3604e8af2a6', 'LOT_1264', 'Hematite Cat Statuette (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

As a Magic action, you can speak the command word to animate this Tiny statuette of a black cat, after which it follows you for 8 hours. At the end of that duration, the cat becomes a statuette and cannot be animated again until the next midnight. Once while the statuette is animated, when you roll a 1 on an attack roll, ability check, or saving throw while the cat is within 30 feet of you, you can reroll the die and must use the new roll. The cat has AC 5, 1 Hit Point, and a walking speed of 30 feet.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12640.0),
('466aec33-1e31-51b8-a233-9b59d7ef9ad4', 'LOT_1265', 'Lamp of Tragedy (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

This lamp has a crying face carved into the side. To light this lamp, a creature must first drop a drop of their blood on its lampwick. While lit, it burns for 6 hours on a flask (1 pint) of oil. If the creature who lit the lamp dies, the flame immediately extinguishes itself and the lamp cannot be lit again while the creature remains dead or until the lampwick is replaced using 1 GP worth of supplies and 10 minutes of work.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12650.0),
('4668e070-2f1b-56cd-ad67-196d7040ddf1', 'LOT_1266', 'Petrified Jack-O''-Lantern (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

This pumpkin has been carved to have a foreboding face and has been imbued with magic and petrified in the process, preserving it. A lamp wick is contained in the interior of the
pumpkin, which can be accessed and lit from a hole on the top of the pumpkin. While lit, it burns for 6 hours on a flask (1 pint) of oil. For the duration, the pumpkin casts magical
Dim Light in a 200foot radius. This Dim Light dims any nonmagical Bright Light in its area to Dim Light; however, magical Bright Light is unaffected by the pumpkin’s Dim Light.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12660.0),
('4586402b-2af9-5f63-b1f8-6ab1c2680ad0', 'LOT_1267', 'Spirit Box (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

This peculiar contraption appears to be an old wooden box, barely larger than a bread loaf. It features vaguely unsettling carvings of grimacing faces and sickly beasts. Two tarnished brass tubes protrude from the top, ending in earwax-stained leather ear cups. A small chain attaches a bone stylus to the side of the box.

While wearing the Spirit Box, you can take a Magic action to press the bone stylus against the corpse of a dead Humanoid and hear the last 10 words spoken by the creature before it died.

Each time you use the Spirit Box, there is a 50 percent chance that the last 10 words you hear are incorrect, nonsensical, or dramatically altered. Additionally, each time you use the Spirit Box, there is a 5 percent chance that you begin to hear an incessant cacophony of whispers and murmurs of the dead, which lasts until you finish a Long Rest.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12670.0),
('808cc1c7-7ba0-5365-bc6b-f409b4524dd3', 'LOT_1268', 'Talking Head (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

This carved pumpkin is infused with the holiday spirit of the Feast of the Moon. You can take a Magic action to attach this pumpkin to or to detach it from the stump of a corpse that is missing its head. A corpse with a Talking Head attached in this way can be targeted by the Speak with Dead spell. Once the pumpkin is used in this way, it can''t be used again until the next midnight.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12680.0),
('78ed2417-1e02-50ea-a64b-51054c5cda38', 'LOT_1269', 'The Thing That Mimics Mimics (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

This ball of yarn has fake teeth strewn across it.

While holding the ball of yarn, you can take a Magic action to speak a command word and wrap the yarn around a Huge or smaller object within 5 feet that isn''t being worn or carried. The affected object then assumes the illusory appearance of a Mimic that has revealed itself as such, including alien eyes and teeth.

Physical interaction with the affect object reveals the illusion. A creature that takes the Study action to examine the affected object can determine that it is an illusion with a successful DC 10 Intelligence (Investigation) check. If a creature discerns the illusion for what it is, the creature can see through the illusion and the illusion takes on a shifting appearance as if distorted by static.

You can retrieve the yarn from the affected object by taking a Magic action to speak the command word again while within 5 feet of the affected object, which ends the illusion and unravels the yarn back into a ball of yarn you can pick up.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12690.0),
('af78ec32-edec-5b99-ba12-152fb83ace4c', 'LOT_1270', 'Trick or Treat Bag (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

This bag, made from orange cloth and depicting a grinning jack-o-lantern, appears empty. Reaching inside the bag after speaking the command phrase, "trick or treat," however, reveals the presence of small candies.  These candies all look and smell the same, but are distinct in taste.

You can take a Magic action to pull one of the candies from the bag.  When a creature puts the candy in their mouth, it takes on a flavor you determine by rolling on the Trick or Treat table.

These candies disappear if not consumed within 24 hours of pulling them out of the bag. Once three candies have been pulled from the bag, the bag can''t be used again until the next dawn.

Trick or Treat Table
1d10    Flavor
1    Rotten Egg
2    Pumpkin Pie
3    Sewer Ooze
4    Spoiled Milk
5    Spiced Cider
6    Catoblepas Stench
7    Cinnamon
8    Caramel Apple
9    Smores
10   Old Socks

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12700.0),
('37be7ee8-fceb-5131-841f-d132047341d5', 'LOT_1271', 'Trick or Treat Mask (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0
 
While holding this mask during the Feast of the Moon, you have an increased urge to wear it. While worn, the mask changes between a "Happy and Sweet" form and a "Sad and Spooky" form randomly. The mask''s appearance changes based on the wearer and their mental idea on what each form would be, although it does not disguise their form.
 
When you make a Charisma (Deception), or Charisma (Intimidation), or Charisma (Persuasion) check while wearing the mask, you can roll a d4 and add the number rolled to the check. When making the check, the mask changes to the Happy and Sweet form for Deception and Persuasion, or the Sad and Spooky form for Intimidation. Once this property of the mask is used, it can''t be used again until the next dawn.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12710.0),
('74a7143f-5390-5ef7-8b8f-6f38c106ce6c', 'LOT_1272', 'Wand of Lunar Phases (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wand', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wand, T0

This slender wand is tipped with a small crystal sphere that shimmers faintly when held under the night sky. While holding it, you can take a Magic action to create an illusion of the moon within the sphere, with the illusory moon in one of the following phases of your choice: Full, Waning, Waxing, or New. You can take a Magic action while holding the wand to change the illusory moon''s phase, and the illusion lasts for 1 hour or until you dismiss it with a Magic action while holding the wand.

While the illusory moon is present within the sphere, the wand sheds light as determined by the illusory moon''s phase. The light is moonlight. 
- Full Moon. The wand sheds Bright Light in a 20-foot radius and Dim Light for an additional 20 feet.
- Waning or Waxing Moon. The wand sheds Dim Light in a 40-foot radius.
- New Moon. The wand sheds Dim Light in a 10-foot radius.

Base Cost: 110 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12720.0),
('039b5317-a186-5eb7-baad-5dbbacd56b5b', 'LOT_1273', 'Wand of Frightful Fun (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wand', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wand, T0

This slender wand is carved from dark wood and tipped with a tiny, grinning pumpkin that seems to giggle when no one is looking. The wand has 5 charges and regains all expended charges daily at dawn.

Gourd of Surpises. While holding the wand, you can take a Magic action to expend 1 charge and create a magical effect in an unoccupied space within 5 feet of yourself. To determine the effect created, roll a d10:
- On a 1 on the d10, a Playful Pulp appears in the shape of a candy pumpkin within the space. The Playful Pulp rolls its own Initiative and spends its turns pursuing you and using its actions against you to the best of its ability. The Playful Pulp remains until it is destroyed or until 1 hour passes, at which point it disappears.
- On a 2, 4, 6, or 8 on the d10, a small candy pumpkin appears within the space, which provides enough nourishment to sustain a creature for one day.
- On a 3, 5, 7, or 9 on the d10, a jack-o''-lantern appears within the space. The jack-o''-lantern''s interior can be lit to allow it to be used as a torch for 1 hour, after which time it burns away.
- On a 10 on the d10, a special candy pumpkin appears within the space, which provides enough nourishment to sustain a creature for one day and restores 1 Hit Point.

Base Cost: 110 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12730.0),
('20e36027-8fee-5de1-98d4-a4794e17f80f', 'LOT_1274', 'Witch''s Fashionable Hat (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

While wearing this pointed hat, you can take a Magic action to cause any armor and garments you are wearing to assume the appearance of a witch''s outfit, which consists of a witch''s hat, a dress or top with pants, and either a cloak or no cloak (your choice). All other aspects of what the outfit looks like is decided by you—including color, style, and accessories—but the affected armor and garments retain their normal bulk and weight. 

The illusory appearance ends if you take a Magic action to dismiss it, if you are no longer wearing the affected armor and garments, or if the hat is removed for 1 minute or longer.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12740.0),
('f7312f2a-ed8d-5657-961b-ce8794f712b2', 'LOT_1275', 'Egg of Renewal (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Consumable', false, 'Seasonal Event', 'T0 Consumable (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This blown glass egg has vibrant swirling patterns.

You can take the Magic action to throw the egg up to 30 feet, which shatters if it strikes a solid surface. If you had a familiar (as from the Find Familiar or Flock of Familiars spell) that disappeared in the last 24 hours, it hatches from the shattered egg and reappears within 5 feet of where the egg was shattered.

Base Cost: 50 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12750.0),
('95341bf6-e75b-5944-8add-30185bc508ff', 'LOT_1276', 'Flowers of Sneezing (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Consumable', false, 'Seasonal Event', 'T0 Consumable (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This small bouquet of flowers takes the appearance of a daisy. You can use an action to blow on the flowers, creating a cloud of pollen that encloses one creature within 10 feet, and the bouquet of flowers becomes a nonmagical bouquet. The target of the pollen cloud must succeed a DC 12 Constitution saving throw or sneeze uncontrollably until the start of your next turn. While sneezing, the creature has disadvantage on their ability checks and cannot take reactions.

Base Cost: 50 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12760.0),
('6998b5cc-5495-5dab-b3b3-f5551d03cfe2', 'LOT_1277', 'Greengrass Green Grass Seeds (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Consumable', false, 'Seasonal Event', 'T0 Consumable (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This small pouch of flaky seeds are particularly aromatic during the season of Greengrass.

You can use take a Magic action to toss all of the seeds on a 5-foot patch of dirt that you can see within 10 feet of yourself. 3 foot-tall grass instantly grows in that patch. Until cleared, the patch is Difficult Terrain and a Medium or smaller creature in the patch and that is Prone also is Heavily Obscured. 

Base Cost: 50 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12770.0),
('54a9bb10-44bf-5211-8c95-fdbf6984ed6a', 'LOT_1278', 'Honey Bear Muffin (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Consumable', false, 'Seasonal Event', 'T0 Consumable (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This tasty bear-shaped muffin has a sweet, gooey filling and comes with a complementary thimble of honey. If the muffin is eaten, after one minute a swarm of bees emerges from your mouth. (Use the statistics of a swarm of wasps) You must immediately make a DC 14 Charisma (Intimidation, Performance, or Persuasion) check to win over the bees. On a failure, the swarm is hostile to you and attacks. On a success, the swarm is friendly to you and obeys your spoken commands. Either way, the swarm vanishes into a puff of flour after 1 minute has passed. The muffin comes in chocolate and vanilla flavors.

Base Cost: 50 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12780.0),
('10d7c991-31bc-5335-aaee-bae19adb5cfc', 'LOT_1279', 'Invisible Paint (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Consumable', false, 'Seasonal Event', 'T0 Consumable (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This bucket contains enough transparent paint to coat a 15-foot cube area and comes with a paintbrush. Objects and surfaces covered in paint become invisible. If the object or surface is larger than a 15-foot cube, the paint makes a 15- foot cube portion of it invisible (e.g. a coated floor appears as a 15-foot deep hole). 

One minute after applying the paint, you must make a DC 13 Wisdom saving throw. On a failed save, you magically forget about the object or surface you have painted, as well as the act of painting it so long as it remains coated or until you make physical contact with it. 

The paint evaporates after 1 hour. It also washes off with water.

Base Cost: 50 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12790.0),
('c83faa07-b139-5381-8ec8-e9bac0e87539', 'LOT_1280', 'Lanternbloom Grove Tree Token (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Consumable', false, 'Seasonal Event', 'T0 Consumable (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This small wooden token, shaped like a coin, bears the carving of a tree on both faces.

You can take a Magic action to plant the token into soil. The token is destroyed and a healthy, nonmagical sapling grows from where the token was planted, of a type as determined by rolling on the following table.

Lanternbloom Grove Tree Token Sapling Table
d6     Type of Sapling
1        Birch
2        Maple
3        Oak
4        Poplar
5        Spruce
6        Sweetgum

Base Cost: 50 GP
Crafting Cost: 25 GP, 3 DTP (Workshop)
Tool: Woodcarver''s Tools', NULL, 12800.0),
('f7eba9eb-9f3a-5bd1-ac9e-2aada07453bf', 'LOT_1281', 'Lanternbloom Bubble Wand (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wand', 'Consumable', false, 'Seasonal Event', 'T0 Consumable (Seasonal Event)', '{"HHB"}', 'Wand, T0

This wooden wand curves into a circular loop. 

The wand has 10 charges. While holding the wand, you can take a Magic action to expend 1 charge and blow through the ring to release a stream of colorful bubbles that drift gently through the air. 

If you expend the wand''s last charge, it breaks and becomes nonmagical.

Base Cost: 50 GP (plus 10 GP for Wand)
Crafting Cost: 25 GP (plus 10 GP for Wand), 5 DTP (Arcane Study, Sanctuary, or Sacristy)
Tool: Woodcarver''s Tools', NULL, 12810.0),
('f40714b8-5605-55c8-8d73-aabf8ba828f5', 'LOT_1282', 'Memory Tea of Lanternbloom (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Consumable', false, 'Seasonal Event', 'T0 Consumable (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

“Rosemary for remembrance, thyme for the temples, and sage for wisdom.” This herbal blend is a favorite of Nost of the Lanternbloom Grove, dried beneath starlight to awaken old memories. When steeped in hot water, the tea glimmers faintly with tiny star-like motes.

One pouch contains enough herbs to brew up to 3 cups of tea. 

You can spend 10 minutes to either brew a single cup of tea or brew the entire pouch all at once in a kettle to produce 3 cups of tea. A brewed cup of tea remains warm and retains its magic for 10 minutes, after which it grows cold and is no longer magical.

A creature that drinks a cup of tea within 10 minutes after it is brewed has Advantage on one Intelligence check of its choice that it makes within the next hour.

Base Cost: 50 GP
Crafting Cost: 25 GP, 3 DTP (Workshop)
Tool: Brewer''s Supplies', NULL, 12820.0),
('e790a638-aa34-5a06-9fbe-e68456f8a7d2', 'LOT_1283', 'Perfuming Lapel (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Consumable', false, 'Seasonal Event', 'T0 Consumable (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This small flower lapel is tied with a neat green ribbon and never seems to wilt. 

While wearing the lapel, you can take a Magic action to gently press the flower and release a pleasant fragrance and subtle magical scent that shifts with your mood: lavender for calm confidence, citrus for bold charm, or soft rose for gentle persuasion. You have Advantage on one Charisma check of your choice you make within the next hour.

Once used, the flower''s magic fades and it becomes a normal lapel.

Base Cost: 50 GP
Crafting Cost: 25 GP, 3 DTP (Workshop)
Tool: Weaver''s Tools', NULL, 12830.0),
('dd732ea6-e10d-535f-b075-153bdc512f5e', 'LOT_1284', 'Pollenward Lozenge (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Consumable', false, 'Seasonal Event', 'T0 Consumable (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This pale green herbal lozenge infused with herbal magic is popular with druids with seasonal allergies. 

A creature can take a Bonus Action to eat the lozenge and, for the next 10 minutes, has Advantage on Constitution saving throws made to avoid or end the Poisoned condition or against harmful gases or vapors  (such as Cloudkill and Stinking Cloud effects, inhaled poisons, and the breath weapons of some Dragons).

Base Cost: 50 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12840.0),
('33771401-9545-5435-af92-7b5618386c84', 'LOT_1285', 'Pot of Devious Dye (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Consumable', false, 'Seasonal Event', 'T0 Consumable (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This pot contains 1d4 uses of a magical dye capable of changing the color of a single piece of armor or a single weapon. The dye is magical and can be removed by a casting of Dispel Magic upon the item.

Base Cost: 50 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12850.0),
('a7909671-845e-542e-9d0d-bc039d1025c7', 'LOT_1286', 'Sachets of Royal-Tea (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Consumable', false, 'Seasonal Event', 'T0 Consumable (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

When you steep these pleasant-smelling sachets into warm water for 10 minutes, they produce a delightful-tasting tea. As an action, you can drink this tea and for the next hour, you feel more confident and an illusion appears upon you that shifts your clothing and physical appearance to appear more regal. Additionally roll a d10: on a roll of 1 on the d10, any armor and outer layer of clothing you are wearing becomes invisible to other creatures instead.

Base Cost: 50 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12860.0),
('777ca7c7-891d-5ea0-80b7-7655a484b000', 'LOT_1287', 'Soppy Mud of Chucking (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Consumable', false, 'Seasonal Event', 'T0 Consumable (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This dirt stays perpetually wet, never drying until it is chucked.

When you take the Attack action, you can replace one of your attacks with chucking the mud. Target one creature you can see within 20 feet of yourself. The target must succeed on a DC 10 Dexterity saving throw or have the Blinded condition until the start of your next turn. 

Base Cost: 50 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12870.0),
('19754d30-3aec-5a3a-b433-b45787d4f8b1', 'LOT_1288', 'Boots of Puddle Jumping (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

These glossy leather boots are enchanted to withstand the rainy season and bring joy to the dreariest of days.

Raingear. While wearing these boots, your socks and feet remain dry, even when fully submerged in water.

Puddle Maker. While wearing the boots, you can take a Magic Action to create a Small, shallow puddle of water in an unoccupied space on the ground within 5 feet of you. The puddle lasts for 1 minute before disappearing. Once this property has been used, it can''t be used again until the next dawn.

Puddle Hopper. While wearing the boots, you can use their command word (no action required). If you do, your steps make a splash sound, and illusory water sprays and ripples out from your feet as if you’d jumped in a puddle. While wearing the boots, your long jump and high jump distance is increased by 5 feet for any jump that ends in a puddle, with or without a running start, and you have Disadvantage on Dexterity (Stealth) checks. The effect ends early if you are no longer wearing the boots, or if you use the command word again.  When you''ve used this property for a total of 10 minutes, this property cannot be activated again until the next dawn.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12880.0),
('61a581ae-b987-560a-8e35-bf30e1ab29a1', 'LOT_1289', 'Cloak of Undergrowth (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This simple green cloak is adorned with a gold-embroidered lily but grows a layer of moss while worn.

While wearing this cloak, you have a +1 bonus to Dexterity (Stealth) checks while in a forest or swamp.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Weaver''s Tools', NULL, 12890.0),
('cf5f6d53-d3f7-507c-ab1c-06ab2a4215e3', 'LOT_1290', 'Community Colors (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This enchanted square of durable cloth is woven with threads that take on the appearance of an organization that the viewer holds in high regard. It can be sewn or otherwise attached to a piece of clothing or armor.

As a bonus action, you can touch the patch. For the next 10 minutes, you roll 1d4 and add the result to Charisma (Persuasion) checks made to influence Indifferent characters, as they are inclined to give you the benefit of the doubt based on your "shared" interests.

Once the patch has been used in this way, it cannot be activated again until the next dawn.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12900.0),
('1d6bbe0a-a7f2-538d-a4ee-dcd6ae9b6170', 'LOT_1291', 'Crown of Flowers (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

While you are wearing this crown of flowers, you can use it as a druidic focus. When you cast a spell using the crown, all plants within 15 feet blooms illusionary flowers of their type for one minute.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12910.0),
('383228df-657d-5974-87b3-23814a290928', 'LOT_1292', 'Egg of Buried Treasures (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

You can use an action to separate this wooden shell into its two halves to reveal a piece of magically created candy. Roll a d100: on a roll of 1 - 10 on the d100, the candy revealed is exactly the candy you wanted, and on a roll of 11 - 100 on the d100, the candy revealed is edible but disgusting. After you use this property, it can''t be used again until the next dawn.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12920.0),
('f580a44f-30cf-56bf-9e81-f4b5ce09f7f2', 'LOT_1293', 'Efflorescent Boots (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

While wearing these boots, the wearer feels fortunate and optimistic about what the future holds. Wherever the wearer of this pair of boots walks, flowers and other plants spring up magically behind them. The flowers and plants wilt away after 1 hour.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12930.0),
('d1ace7b8-6cdd-5f16-a01e-506c5ac28ace', 'LOT_1294', 'The Everbloom Bond (HB) (pair of)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Ring', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Ring, T0

This pair of rings is made from sylvan stone that encases miniaturized chamomile and edelweiss, and it changes color depending on the wearer’s mood.

These rings have the properties of a set of Bonded Rings, with the following additional properties while you are wearing and are attuned to the ring.

Blossom of Renewal. Wherever you walk, flowers and other plants spring up magically behind you. The flowers and plants disappear after 1 hour.

Forestwalker. You choose one creature you can see within 30 feet of yourself (no action required), and the chosen creature gains 1d4 + 2 Temporary Hit Points. Once used, this property can''t be used again until the next dawn.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12940.0),
('6f61d496-a53e-567a-8b51-88b37f8827a0', 'LOT_1295', 'Factional Finery (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This set of fine clothes is designed for purposes of a specific faction or group, such as the Harpers or Zhentarim. Discreet embroidery, colors, or insignia identify fellowship to those who know how to look.

While wearing these fine clothes, you gain the following benefits:
- You can take the Help action as a Bonus Action to assist a member of the group or faction associated with these clothes. Once used, this property can''t be used again until the next dawn.
- When you make a Charisma (Deception, Intimidation, or Persuasion) check made to influence a member of the group or faction associated with these clothes, you can gain a +5 bonus to the check. Once used, this property can''t be used again until the next dawn.

Base Cost: 100 GP (plus 15 GP for Fine Clothes)
Crafting Cost: N/A (cannot be crafted)', NULL, 12950.0),
('f5c4de82-d776-58fb-b0ca-08e4b323b757', 'LOT_1296', 'Gloves of the Imaginary Instrument (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

While wearing these gloves, they count as any music instrument which you are proficient with, and you can mimic gestures as if you were playing one of those instruments to magically produce sounds as if you are playing that instrument.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12960.0),
('017562db-bd9c-5b7a-b2b4-7eb0f0dcc3d0', 'LOT_1297', 'Greengrass Basket of Egg Painting (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This small woven basket is decorated with pastel ribbons and filled with shredded paper that resembles grass.  It looks like an ordinary Greengrass basket, but it often holds a more creative surprise.

Greengrass Surprise. You can take a Magic action to stick your hand into the basket and use the basket''s command phrase "Happy Greengrass!" Roll 1d4 to determine the outcome. 

On a 1 to 3 on the d4, a set of Painter''s Supplies and 2 boiled chicken eggs magically appear within the basket. The tools and any uneaten eggs last until they disappear at the next dawn. You have proficiency with these Painter''s Supplies while they exist if you don''t already have proficiency with Painter''s Supplies.

On a 4 on the d4, 3 foil-wrapped chocolate covered marshmallows shaped like eggs appear inside the basket. Any uneaten marshmallows last until they disappear at the next dawn.

Once used, this property of the basket can''t be used again until the next dawn.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12970.0),
('e33ce308-e57d-5414-bf67-3d2b3204cc5a', 'LOT_1298', 'The Greengrass Equinox Amulet of Lathander (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

A palm sized amulet made of a green tinted metal in the shape of a Lathander sigil covered in various plants and fruits of the Greengrass season.

You can use the Magic Action to activate the amulet. It will emit 10 feet of Bright Light, and an additional 10 feet of Dim Light for the next minute before turning off. During this time, you can use grant yourself Advantage to Intellgence Checks (History, Arcana) or Wisdom Checks (Survival, Insight) while attempting to identify, track down, or find the weakness of an Undead Creature. Once this feature has been used, it can’t be used again until dawn.

After the final day of the Greengrass event, the Greengrass Equinox Amulet of Lathander will go into a dormant state and it will not be able to be utilized until the next Greengrass season.

Base Cost: 100 GP (plus 5 GP for Amulet)
Crafting Cost: N/A (cannot be crafted)', NULL, 12980.0),
('55fe634a-6392-5830-a783-2579cb666749', 'LOT_1299', 'Greengrass Lamb Plushie (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This little lamb has surprisingly long black eyelashes, three little red buttons, and red gloves. While holding the Greengrass Lamb Plushie, you feel a slight sense of calm. 

The Greengrass Lamb Plushie is enchanted to say a variety of phrases, including the following phrases:
- "Let''s take a nap!"
- "If ever you''re so angry you can feel you ears begin to smoke...  You can put out the flame, playing the game of ''Tell Yourself a Joke''!"
- "Tell me about when I was a baby..."

Plushie Support. If you make a saving throw to avoid or end the Frightened or Unconscious condition while holding the plushie, you can clutch or gently pet it and add 1d4 to the save. Once used, this property can''t be used again until the next dawn.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 12990.0),
('8cc5a764-b3e3-5508-9681-f2dfed393752', 'LOT_1300', 'Groundhog Plushie (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

While holding this plushie, you always know the item''s depth below the surface and the direction to the nearest staircase, ramp, or other path leading upward while being underground, and you can use an action to predict what the weather will be at your location for the next 24 hours.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13000.0);

INSERT INTO public.ac_loot (
    id, check_id, name, category_id, tier_id, type, nature, is_dm_select, event_category, tier_display, source, description, notes_advice, display_order
) VALUES
('8fcee333-2675-524a-ba6b-5ad87ad07b95', 'LOT_1301', 'Hat of Nesting (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This hat takes the shape of a very comfy bird nest, which magically balances itself and sits firmly on top of one''s head. While wearing this hat, you attract Tiny avian creatures, and you have advantage on Wisdom (Animal Handling) against avian creatures.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13010.0),
('28805360-692d-563b-b005-97ae76d3782f', 'LOT_1302', 'Howell''s Gallivanting Gardner (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

As an action, you can activate this Tiny golem for 12 hours.
During this time, the golem moves along grass covered
surfaces on tiny wheels, cutting up to 100 square feet of grass
per minute and occasionally leaving behind a flower in full
bloom as if using the druidcraft cantrip. The golem
deactivates and stops moving at the end of the duration until
activated again. The golem has AC 5, 1 hit point, and a
walking speed of 30 feet.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13020.0),
('478d405f-d3a0-5bb8-8864-157da9e53264', 'LOT_1303', 'Lover''s Thimble (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This silver thimble is etched with a chain-link pattern. You spend 10 minutes and 1 GP worth of supplies to use the thimble to sew a patch onto another creature''s clothing. As long as the creature wears that clothing and you and it are within 60 feet of each other, you both feel a gentle tug in the direction of the other. 

If you use the thimble to sew a new patch, the previous connection fades.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13030.0),
('1e85c809-38a9-5312-9ec0-08be159a6414', 'LOT_1304', 'Mantle of Eccentric Effect (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

Originally created as a fashionable product by the Wizard Grassbottle, this mantle creates instantaneous illusory audio and visual accents, that can be heard up to 5 feet, from the wearer. The illusory effects all respond to a set tone determined by the style of mantle being worn.
- Billowing Hero style with Heroic and Inspiring tone: Blue or red cloak with gold trim that produces rose petals, background light rays, bold gold letters, and a subtle amount of exaggerated cape flickers.
- Lustrous Silks style with Poetic and Graceful tone: Pastel colored scarf or shawl that produces roses, glitter, music notes of a high pitch, and shiny cursive letters.
- Rugged Ranger style with Exploration and Discovery tone: Dark green and sometimes furred traveller''s cloak that produces rustled leaves, owl hoots, blows wind through the hair, and roars for fierce emphasis.
- Spry Arcanist style with Eccentricity tone: Fancy blue scarf that produces lightning flashes, makes the eyes appear fiery, shoots fireworks, and displays flashy onomatopoeia.
- Ominous Court style with Cryptic, Dread, and Menacing tone: Fur-collared mantle with red underlining that produces the sound of a lady screaming, low musical notes, thunder claps, organ tunes, and finishes cut off sentences and answers with an arrow with the words ''To be Continued'' pointing over to the source of the interruption.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13040.0),
('92d868bc-1c63-57e3-a194-fcbd5f0512bb', 'LOT_1305', 'Pearl Clutch (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This small figurine is carved from sea coral, often in the likeness of a famous seafarer. It holds a tiny pearl clasped in one hand. The expression on the figurine’s face changes throughout the day, and some believe it reflects the disposition of Umberlee.

While holding the figurine, you can speak its command word to cause it to release the pearl. While the pearl and the figurine are on the same plane of existence, the figurine always points in the direction of the pearl. If the pearl is not on the same plane of existence as the figurine, the figurine clutches its chest and its face twists into an expression of agony.

The pearl can be returned to the figurine by pressing it back into the figurine’s hands.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13050.0),
('f2bad742-f7a7-54eb-a741-9e40c6b0f841', 'LOT_1306', 'Quali-Tea Kettle (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This 4-pint kettle with a whimsical pattern appears empty and has 10 charges. While holding the kettle, you can use an action to expend 1 of its charges and speak the name of any nonmagical tea, hot chocolate, or coffee. The kettle then fills with the beverage of your choice. The beverage inside is always comfortably warm, though none of the heat can be felt through the kettle. Any liquids produced by the kettle that have not been consumed vanish after 24 hours have passed, and the kettle regains 1d6 + 4 expended charges daily at dawn.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13060.0),
('c9cda05e-12ce-5b0b-b0f4-ee96bfbde190', 'LOT_1307', 'Rainfall Shielding Umbrella (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Rod', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Rod, T0

This rod measures roughly three feet in length and curves into a silver-capped hook for hanging it from a belt or backpack loop.  The upper portion of the rod is encased in a sheath of glossy leather, bound tight against the shaft by a sliding metal ring. 

You can take an Utilize action to open the umbrella by releasing the ring and pushing it upwards so that a series of internal hinged ribs snap outward, stretching the leather into a taut canopy.  You can close the umbrella by pulling the ring back down the rod with another Utilize action.

Spellcasting Focus. You can use the rod as a Spellcasting Focus for your spells.

Raingear.  While holding the rod above your head with the umbrella open, your head and torso remain dry while you are in light to heavy rain or snow conditions.

Shielding. While holding the rod, you can take a Magic Action to cause the umbrella to glow with protective energies and open if it was not already open.  While empowered in this way, it magically transforms into a Shield.  You are considered donning the shield while this effect is active. The effect ends if you are no longer holding the rod or if you close the umbrella with an Utilize action. Once used, this property can''t be used again until the next dawn.

Rainfall. While holding the rod above your head with the umbrella open, you can use its command word (no action required). If you do, illusory water droplets fall from the bottom of the umbrella as if you were standing in a light rain shower, and you take no falling damage when landing in a puddle so long as you fell a distance no greater than 15 feet.  The effect ends early if you are no longer holding the rod, if you use the command word again, or if you close the umbrella with an Utilize action. 

Once you''ve used this property for a total of 10 minutes, this property ceases to function until the next dawn.

Base Cost: 100 GP (plus 10 GP for Rod)
Crafting Cost: N/A (cannot be crafted)', NULL, 13070.0),
('243eb62c-7472-5d68-8562-4db6e11fb8b7', 'LOT_1308', 'Scabbard of Concealing (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This ornate scabbard looks fit for a short and narrow dagger. As an action, you can sheathe a melee weapon of any size into it, and the weapon is magically transformed into an ornate dagger. You can draw the dagger as if doing so from a regular scabbard, and the dagger is reverted back to the weapon''s original form once it is fully unsheathed.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13080.0),
('c6592824-bcb9-52e1-93dd-453627d5c13a', 'LOT_1309', 'Singsilk Umbrella (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This beautifully embroidered umbrella once served as a prop in a Feywilds-themed play, telling of a lost maiden guided to safety by those charmed by her grace. Golden, flower-shaped tassels fringe its edges, chiming softly in the breeze.

While holding this umbrella, you can take a Magic action to open it and raise it overhead, causing a gentle shower of petals from your favorite flowers to fall around you, and you choose either the Nature or Performance skill. You have Advantage on ability checks using chosen skill for 1 hour while the umbrella remains open above your head. 

Once used, this property can''t be used again until the next dawn.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13090.0),
('f14cd996-f11d-5604-ab0c-1cf19986ce5a', 'LOT_1310', 'Stained Glass Kite (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Wondrous Item', 'Permanent', false, 'Seasonal Event', 'T1 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T1

This delicate kite has a 3-foot wingspan of colored, semi-translucent panels that scatter brilliant rainbow light when it catches the wind.

Dazzling Flight. You can take a Magic action to launch the kite while holding its string in an open space. The kite remains magically aloft for the next minute as long as you hold on to its string with a free hand to control it. Once on each of your turns while the kite remains aloft and you don''t have the Incapacitated condition, you can sweep the kite''s shimmering light across up to three creatures of your choice within 30 feet of yourself.

The targets must succeed on a DC 12 Wisdom saving throw or have the Charmed condition until the start of your next turn. While Charmed in this way, a creature has a Speed of 0 and has Disadvantage on Wisdom (Perception) checks to detect anything other than the kite''s dazzling light. The Charmed condition ends early if the creature takes damage.

Once used, this property can''t be used again until the next dawn.

Base Cost: 400 GP
Crafting Cost: 200 GP, 10 DTP (Workshop)
Tool: Tinker''s Tools', NULL, 13100.0),
('9014562e-fbdc-5cc0-8021-0dc86fe2612a', 'LOT_1311', 'Weatherock (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

Though often dismissed as a novelty item by seasoned adventurers, a Weatherock remains a popular tool among travelers, apprentices, and those with little talent for more sophisticated divination magic.

This small stone is tied securely to the end of a short cord, allowing it to be hung from a branch, hook, or other elevated point. When suspended outdoors, the stone responds to its surroundings, allowing a creature that can see the Weatherock to determine current weather conditions according to the following table.

Weatherock Table
Weatherock State                                 Weather Conditions     
The Weatherock is dry.                           The weather is clear.
The Weatherock is wet.                          It is raining.
The Weatherock is swinging.                  Strong winds are present.
The Weatherock is covered in white.      It is snowing.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Mason''s Tools', NULL, 13110.0),
('3c01693b-b7df-5da7-ab68-25eea0c17cbd', 'LOT_1312', 'Windcraft Pinwheel (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This small handheld pinwheel reflects a kaleidoscope of colors as it spins. 

While holding the pinwheel, you can cast the Gust spell (save DC 11) from it. Once used, this property can''t be used again until the next dawn.

Base Cost: 100 GP
Crafting Cost: 50 GP, 5 DTP (Workshop)
Tool: Tinker''s Tools', NULL, 13120.0),
('d8a7bd30-1218-5f1e-bd64-a90b0e4442ce', 'LOT_1313', 'Bells of Jingling (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Consumable', false, 'Seasonal Event', 'T0 Consumable (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

These bells have AC 10 and 1 HP.

You can take a Magic action to affix the bells to a door, window, or another solid surface. Whenever a creature passes within 10 feet of the bells after it is affixed, the bells jingle. During the winter season, the bells jingle a merry tune.

The bells remain for 8 hours after being affixed, after which they disappear with a final merry jingle.

Base Cost: 50 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13130.0),
('f4eaffca-e1ab-5518-ba94-91df10a73b06', 'LOT_1314', 'Bloodtusk''s Yule Cane Coffee (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Consumable', false, 'Seasonal Event', 'T0 Consumable (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This self-heating pack of Bloodtusk''s Yule Cane Coffee can be mixed with warm water to create a rich medium roast coffee with peppermint flavor and a hint of nutmeg.

After you drink this coffee, you can tolerate and are unharmed by temperatures as low as -20 degrees Fahrenheit for 2 hours. During this time, you also find it easier to recall any pleasant holiday memories you''ve experienced, even those you may have forgotten.

Base Cost: 50 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13140.0),
('eb40162e-842f-5f22-8b6f-0ac199095586', 'LOT_1315', 'Cane of Minty Fresh Revival (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Consumable', false, 'Seasonal Event', 'T0 Consumable (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

This small cane of candy has a pleasant mint scent and taste, leaving one’s breath fresh for hours. If the cane is placed in the mouth of a creature that is not a construct or undead and is making death saving throws, the cane melts in their mouth and stabilizes them.

Base Cost: 50 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13150.0),
('169ea541-c8f9-5ec2-9f91-35108b968f61', 'LOT_1316', 'Deadwinter Candle (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Consumable', false, 'Seasonal Event', 'T0 Consumable (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

Bone-white and seated in a cheap tin holder, Deadwinter Candles bring a sliver of comfort and hope through the dark winter nights. While this candle is lit, it sheds Bright Light in a 5-foot radius and Dim Light for an additional 5 feet, and each creature in a 30-foot Emanation originating from the candle experiences the warmth of the springtime sun and smells the scent of newly budding flowers. The candle remains lit for 1 hour, after which it completely melts away and leaves behind a tin holder worth 2 GP.

Base Cost: 50 GP (plus 0.01 GP for Candle)
Crafting Cost: N/A (cannot be crafted)', NULL, 13160.0),
('0c6a2f72-20f3-5c8c-90cf-ec6e4763c984', 'LOT_1317', 'Everfrozen Ice (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Consumable', false, 'Seasonal Event', 'T0 Consumable (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

This cube of ice is taken from the heart of a glacier that lies on the border of the Plane of Air and Plane of Water and can be acquired as a 1-foot Cube, as a 2-foot Cube, or as a 5-foot Cube. Formed from the very idea of ice and cold, a piece of Everfrozen Ice never melts, even when subjected to the heat of a dragon''s fire. Everfrozen Ice has the hardness and durability of a piece of marble, making it a popular choice for carving trinkets, statues, and pieces of art from.

An unshaped piece of Everfrozen Ice can be shaped into an object with Mason''s Tools requiring 8 hours of uninterrupted work for each cubic inch of Everfrozen Ice.

Base Cost: 50 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13170.0),
('1c948c95-14f8-5568-85d6-fb80160a0185', 'LOT_1318', 'Jingle Hat of Untimidation (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Consumable', false, 'Seasonal Event', 'T0 Consumable (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This jolly hat comes with three glowing bells. The bells do not emit light, but can be seen in nonmagical darkness.

While wearing this hat, whenever an ally within 30 feet of you makes a saving throw against being Frightened, you can use your Reaction to jingle the bells on the hat. If the ally can see and hear you, it gains Advantage on the saving throw. After jingling the hat in this way, one of the bells stops glowing. Once all three bells stop glowing, the hat loses all magical properties and becomes a mundane festive hat.

Base Cost: 50 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13180.0),
('bd2481c2-a608-5b8e-a793-9ec1c0559072', 'LOT_1319', 'Nut-Cracker''s Messages (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Consumable', false, 'Seasonal Event', 'T0 Consumable (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This tiny chestnut is a modified explosive seed filled with smokepowder and is ready to create shining messages in the night sky. At night, you can use the chestnut to cast the Skywrite spell in a color of your choice. The spell doesn''t require Concentration, and the message appears after 1 minute as the tiny chestnut shoots up into the sky and cracks open, exploding into a burst of harmless sparks and lights. The message lasts for 1 minute.

Base Cost: 50 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13190.0),
('20561923-6d3d-51e5-962c-c6db2fe62b0b', 'LOT_1320', 'Winter''s Solstick (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Consumable', false, 'Seasonal Event', 'T0 Consumable (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This small piece of dried branch is pale and brittle, as if it had fallen off a tree many winters ago.

While outdoors during a sunny day, you can take a Magic action to plant this stick into the ground and break it to cause a cloud to appear 120 feet in the air directly above. The cloud takes the shape of a Cylinder that is 10 feet with a 60-foot radius.

The cloud obscures light beneath it, turning nonmagical Bright Light directly beneath it to Dim Light and creating an area of nonmagical darkness in a Cylinder with a radius of 10-feet directly beneath the center of the cloud.

The cloud dissipates after 1 minute, ending the effect.

Base Cost: 50 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13200.0),
('48767119-8bfa-514a-8585-d64df58886ad', 'LOT_1321', 'Bag of Portable Snowballs (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This burlap satchel weighs 5 pounds and contains 10 magical snowballs, each of which are perfectly round and have a diameter of 6 inches. The satchel magically regains all expended snowballs daily at dawn.

Each snowball is a magic Ranged weapon with which you are proficient and that has the Thrown property. It has a normal range of 20 feet and a long range of 60 feet, it deals 1d4 Cold damage on a hit, and if you score a Critical Hit with the snowball, the target''s Speed is reduced by 10 feet until the start of your next turn. A snowball is destroyed immediately after you hit or miss with it, and melts if not thrown within 1 minute from being drawn from the satchel.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13210.0),
('bf6d9f0a-7f80-5e88-a333-7322e24d8150', 'LOT_1322', 'Cariah Marey''s Cube of Merry Caroling (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

The smell of flan and sugar cookies magically emanates from this ever-frozen ice cube, which houses the spirit of renowned Midwinter bard Cariah Marey. The Detect Magic spell reveals powerful Evocation magic tied to an Eldritch creature. 

Whenever this item is held during winter, you hear a fragment of an ancient song. The song gets louder each day leading up to Midwinter, and gets quieter each day after until winter is over. 

While holding this cube during winter,  a creature can make a DC 18 Charisma (Performance) check to appease the spirit by singing a Midwinter carol. 
- Make my Wish Come True. On a success, the spirit breaks free from the ice cube and gifts the creature with 1 GP.
- All I want for Midwinter is YOU. On a failure, the spirit breaks free from the ice cube and possesses the creature that failed the Performance check for 1 minute, forcing them to sing and dance for the duration.

Success or failure, the spirit returns to the ice immediately after, which reforms into a cube instantly. Once this property of the cube is used, it can''t be used again until the next dawn.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13220.0),
('bcc2a076-0531-55f6-bea6-710e2cabca3b', 'LOT_1323', 'Cloak of the Falling Snow (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

This cloak appears to be made of a blend of winter wolf and mammoth fur. The cloak never becomes dirty and cannot be damaged by cold conditions. While wearing this cloak, illusory snow falls lightly around you in a 5 foot radius.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13230.0),
('03156029-3b92-56dd-8b15-3d6bf6edc7fb', 'LOT_1324', 'Coin Purse of the Miserly (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This finely woven silk purse can hold up to 1,000 mundane coins and appears to have belonged to merchants of a bygone era.

Coins placed in this purse can be removed only by the creature that placed them, and only one coin can be taken out at a time. If the purse is pierced, or torn, it is destroyed, and its contents are scattered in the nearest unoccupied space

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13240.0),
('9b5e1763-8ec7-5ef8-9c9d-1f81c9892d30', 'LOT_1325', 'Conceited Yuletree (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This small, decorated evergreen tree has been planted in a red and golden pot. You can spend one minute heaping lavish praise on the tree, at the end of which you must make a DC 15 Charisma (Performance) or Charisma (Persuasion) check (your choice). On a success, the tree transforms into an Awakened Shrub and climbs out of the pot. The shrub is Friendly toward you and obeys your commands. Absent commands from you, it does nothing. After an hour has elapsed, the shrub reverts back to a mundane tree, which can be planted in the pot again. Success or failure, another attempt to praise the tree can''t be made until the next dawn.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13250.0),
('adbac094-4a3b-573b-ad58-d94237703845', 'LOT_1326', 'Cuddling Scarf (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

This scarf is made from sheep''s wool and is too large to be wrapped around a single person without being intrusive. However, when you and a willing creature within 5 feet of you are wrapped in the scarf, both of you can feel warm enough that you suffer no harm from temperatures as low as -20 degrees Fahrenheit.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13260.0),
('c8e65b59-e72c-57d6-9be6-7e22dee67b96', 'LOT_1327', 'Deadwinter Log (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This wooden log has 3 charges and regains 1d3 charges daily at dawn. You can say the command phrase "The weather outside is frightful" and expend 1 charge to cause the log to burst into crackling and popping flames for 8 hours. While the log is ablaze, it produces enough dry heat to keep the temperature within 15 feet of it at 95 degrees Fahrenheit (35 degrees Celsius), and it emits Dim Light in the same area. During winter, the log gives off the faint scent of roasting chestnuts.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13270.0),
('ae9da490-c584-5d2e-999a-6d798bde07f1', 'LOT_1328', 'Earmuffs of Warmth and Security (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

These earmuffs are made of goat fur and hide, and keep the wearer''s ears safe and warm even on the coldest nights. When you make a saving throw to avoid or end the Deafened condition on yourself, you can give yourself advantage on the roll if you are wearing the earmuffs. You must decide to do so before rolling the d20. If the save succeeds, you can''t use the earmuffs in this way until you finish a long rest.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13280.0),
('daf3a759-7d7f-5609-b278-be438723b131', 'LOT_1329', 'Fey on a Tray (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

This Tiny golem is dressed in colorfully patterned clothing and looks like a wingless sprite. As an action, you can activate the golem for 12 hours. During this time, the golem walks and climbs along hard surfaces, giggling and making a mess of 10 feet of flooring, walls, or ceiling per minute as if using the Prestidigitation cantrip. The golem deactivates, stops moving, and strikes a funny pose among its mess at the end of the duration until activated again. The golem has AC 5, 1 hit point, and a walking and climbing speed of 30 feet.        

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13290.0),
('4b662fc8-a9e0-599f-9be4-8b50bb53f37d', 'LOT_1330', 'Figurine of Wondrous Power, Felted Midwinter Donkey (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This statuette of a donkey, wearing a derby hat and jingle bells around its feet, is small enough to fit in a pocket and is made of felted wool. If you take a Magic action to throw the figurine to a point on the ground within 60 feet of yourself, the figurine becomes a living creature with the statistics of a Small Mule. If the space where the creature would appear is occupied by other creatures or objects, or if there isn''t enough space for the creature, the figurine doesn''t become a creature.

The creature is Friendly to you and your allies. It understands your languages, obeys your commands, and takes its turn immediately after you on your Initiative count. If you issue no commands, the creature defends itself but takes no other actions.

The figurine has 12 charges and each hour or portion thereof it spends in mule form costs 1 charge. While it has charges, you can use it as often as you wish. When it runs out of charges, it reverts to a figurine and can''t be used again until 12 hours have passed, where it regains all expended charges. It reverts to a figurine early if its mule form drops to 0 Hit Points or if you take a Magic action while touching the creature to make it revert to figurine form.

Jing-a-di-jing. While the figurine is in mule form, you can take a Magic action while touching the mule to cause it to dance and bray cheerfully for 1 minute, jingling its bells.  Each friendly creature within 15 feet that can see or hear the mule feel joyful and optimistic about what the coming year will bring.

Made in Brookaleen.  While the figurine is in mule form, you can take a Magic action while touching the mule to expend a charge and cause a tiny giftwrapped box to appear within 5 feet of the mule.  When a creature opens the box, a trinket appears inside, taking on the shape you determine by rolling on the Midwinter Gift Table.

Midwinter Gift Table
1d12 Trinket
1     Sleigh bell
2    Pair of mittens
3    Pouch of paper confetti
4    Note wishing you a merry Midwinter
5    Paper crown
6    Whistle 
7     Pine scented candle
8     Mistletoe
9     Pair of shoes
10   Cookie cutter 
11     Dress
12    Ribbon

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13300.0),
('a751154d-c4c2-5aa5-bd11-06badbdfca16', 'LOT_1331', 'Hat of Midwinter Cheer (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This is a conical, droopy hat that is red with white fur around the base and a white pom-pom on top. 

While wearing this hat, you can take a Magic Action to force a humanoid you can see within 30 feet of you to make a DC 10 Charisma saving throw. On a failure, the creature is filled with feelings of joy and cheer for 1 minute, and you add 1d4 to Charisma checks made to influence the target in a positive way. On a success, or at the end of the duration, the creature knows you tried to influence it but not how. Once this property of the hat is used, it can''t be used again until the next dawn.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13310.0),
('0eff9b2c-d368-54d2-888f-aa0e0a864761', 'LOT_1332', 'Howell''s Roving Custodian (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

As an action, you can activate this Tiny golem for 12 hours. During this time, the golem moves along hard surfaces on tiny wheels, cleaning up to 10 feet of flooring per minute as if using the Prestidigitation spell. The golem deactivates and stops moving at the end of the duration until activated again. The golem has AC 5, 1 Hit Point, and a walking speed of 30 feet.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13320.0),
('4c2d53a4-3569-5bf4-8a28-41a41c827c17', 'LOT_1333', 'Howell''s Treading Surfacer (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

As an action, you can activate this Tiny golem for 12 hours. During this time, the golem moves along hard surfaces on rubber tracks at a walking speed of 10 feet. When activated, choose one of the following modes:

Ice Smoother. The golem smooths snow and ice into a flat, slick surface suitable for ice skating, affecting up to 10 square feet of ground per minute. This does not strengthen ice or create ice where none exists.

Powder Maker. The golem breaks up and propels fallen snow, creating loose powder suitable for skiing or snowboarding, affecting up to 10 feet of snow-covered ground per minute. This mode has no effect on bare ground or solid ice.

The golem deactivates and stops moving at the end of the duration and cannot be activated again until the next dawn. The golem has AC 5, 1 Hit Point, and avoids obvious hazards but makes no tactical decisions.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13330.0),
('e5566ac2-01d5-5445-b3d3-846d6c7011d7', 'LOT_1334', 'An Important Lesson (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Weapon (Longsword)', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Weapon (Longsword), T0

This Longsword appears to be a perfectly average nonmagical weapon. All attempts to determine the weapon''s properties show it is nonmagical. 

If you have proficiency with Simple weapons, you are considered proficient with this weapon even if you lack proficiency with Longswords.

The Lesson. If you roll an attack with this weapon and miss, you take 1 Slashing damage.

Base Cost: 100 GP (plus 15 GP for Longsword)
Crafting Cost: N/A (cannot be crafted)', NULL, 13340.0),
('b0b97d93-3836-51b8-aa7c-49936bede9f6', 'LOT_1335', 'Jelly of the Month Club Membership (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

This certificate of proof of membership comes with a clear glass jar. The jar appears empty and has 3 charges. While holding the certificate and jar, you can use a Magic action to
expend 1 of its chargs, speak its command phrase, "the gift that keeps on giving the whole year," and remove a dollop of jelly from the jar. Roll a d12 and consult the following table to
discover what happens. A dollop of jelly is enough to flavor a single meal. The certificate and jar regain all expended charges daily at dawn.

Jelly Taste Table
d12 Effect
1     The jelly is spoiled and putrid, and a Playful Pulp appears in the nearest unoccupied space next to you. The Playful Pulp spends its turns pursuing and ''''attacking'''' you to the best of its ability. It remains until it is destroyed or until 1 hour passes, at which point it disappears.
2     The jelly is strawberry flavored.
3     The jelly is peach flavored.
4     The jelly is blueberry flavored.
5     The jelly is sweet pepper flavored.
6     The jelly is fig flavored.
7     The jelly is cherry flavored.
8     The jelly is orange flavored.
9     The jelly is grape flavored.
10   The jelly is pumpkin flavored.
11   The jelly is cranberry flavored.
12   The jelly is gray and flavorless. When it is mixed into a single meal, it increases the flavor, but not the quality or appearance, of the meal by one (a poor meal tastes like a modest one, a modest meal tastes like a comfortable one, and so on).

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13350.0),
('dd3b9709-0e12-5511-9b6d-91e2642ff5dc', 'LOT_1336', 'Leg Lantern (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This lantern is designed to resemble a human leg encased in a fishnet stocking and a high-heeled shoe and is topped with a fringed silk lampshade.  It casts Bright Light in a 30-foot radius and Dim Light for an additional 30 feet. Once lit, it burns for 6 hours on a flask (1 pint) of oil.

A Major Award.  When you make a Deception, Intimidation, Persuasion, or Performance check, you can use this lantern to add a +5 bonus to the check after speaking its command phrase, "It''s a major award." Once the lantern has been used in this way, it cannot be used again until the next dawn.

Fra-Gee-Lay.  This lantern is absurdly fragile.  If you drop it or if you take damage or fail a Dexterity saving throw while holding it, roll a d20.  On a 1, it cracks and its radius of Bright Light and Dim Light are reduced to 10 feet each until you repair it using 1 GP worth of supplies and 10 minutes of work. 

Base Cost: 100 GP (plus 5 GP for Hooded Lantern)
Crafting Cost: N/A (cannot be crafted)', NULL, 13360.0),
('3f424cc7-9b1d-56dc-b079-a60cd56a5dd6', 'LOT_1337', 'Locket of Season''s Delight (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

This gold and silver chain locket is in the shape of a heart, inscribed with images of cold winter nights and long summer days. The locket glows and exudes a comforting mist to the
beat of a heart. While wearing this locket, you suffer no harm in temperatures as cold as -20 degrees Fahrenheit or as warm as 120 degrees Fahrenheit.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13370.0),
('c406e94e-b5b3-5676-99ec-ce640dfb44f7', 'LOT_1338', 'Midwinter Mantle (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

Illusory patterns of the night sky swirl across the surface of this cloth. This glamerweave cloth can be worn as a scarf or cap and has 3 charges.

While wearing the cloth, you can take a Magic action to expend 1 charge from it and gain the Unconscious condition for the next 10 minutes as you instantly fall into a deep magical slumber. This effect ends early if you take damage or if someone within 5 feet of you takes an action to shake you out of the effect. If you slept for the entire duration of the effect, you can add 1d4 to your next Wisdom (Insight) or Wisdom (Perception) check. 

When the cloth''s last charge is expended, it transforms into Common Glamerweave with illusory patterns of the night sky.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13380.0),
('cf4ac9d2-b1c7-5c68-b99e-0e14f248e45f', 'LOT_1339', 'Midwinter Top (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

A spinning top made of clay with 4 sides labelled with letters from a lost language. When spun, the top spins for 1d4 rounds. The top alternates between flashing blue and white
until it falls.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13390.0),
('b871280e-25f9-5a38-af49-9a0ad434fc5f', 'LOT_1340', 'Oversized Candy Cane (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Weapon (Club)', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Weapon (Club), T0

This large candy cane seems to grow out of nowhere in a cave located in the grey peaks and to be made out of mundane syrup.

Whenever you hit an object with this weapon, the hit is a Critical Hit. When you score a Critical Hit with the candy cane, it is destroyed. 

When this candy cane is destroyed, it shatters into 10 Tiny candy cane pieces, which last for 24 hours before evaporating and disappearing. A creature can take a Bonus Action to eat one candy cane piece. Eating a candy cane piece restores 1 Hit Point, and the candy cane piece provides enough nourishment to sustain a creature for one day.

Base Cost: 100 GP (plus 0.1 GP for Club)
Crafting Cost: N/A (cannot be crafted)', NULL, 13400.0),
('01e649bb-c61f-5be7-9b4e-e1d4fe9be999', 'LOT_1341', 'Sleigh of Dashing (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This small wooden toboggan is warm and comfortable, and plays a cheerful tune when in motion.

If the sleigh is warm, whenever you take the Dash action while standing on ice or snow, you can choose to deploy the sleigh and hastily ride it. When you do so, your Speed increases by 20 feet until the end of your turn. Once used, this property can''t be used again until the next dawn.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13410.0),
('9d80bfc6-def0-5337-94da-94d12833f6fd', 'LOT_1342', 'Snow Angel (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This figurine takes the appearance of a tiny snow angel. When placed in snow or ice, depending on the amount of material, the figurine melts and rises into a Large or smaller Celestial made entirely of gentle, soft ice and warm winter light. Regardless of size, the angel has an AC of 10, 1 hit point, and has a walking and flying speed of 30 feet. It is immune to cold damage and all conditions. If it is forced to make an ability check or a saving throw, treat all its ability scores as 10 (+0). It speaks Common and Celestial, and it obeys your spoken commands. It cannot make attacks and it cannot use magic items.

While present, the angel radiates a comforting aura that keeps creatures within 10 feet of it pleasantly warm even in severe cold. The snow angel remains for up to 8 hours before becoming a figurine again. It reverts to a figurine early if you take a Magic action while touching the creature to make it revert to figurine form. If reduced to 0 hit points, the figurine is destroyed. Once used, the figurine cannot be used again until the next dawn.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13420.0),
('a763ef27-31a9-538a-ab11-e26e0c3ab658', 'LOT_1343', 'Snowglobe of Silent Nights (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This delicate glass snowglobe contains a tiny winter village under softly falling snow. When shaken, the flakes swirl gently and a faint chime can be heard.

As a Magic action, you can shake the snowglobe to create a small sphere of tranquility. For the next 8 hours, all mundane sounds within 10 feet of the snowglobe become muted as if wrapped in soft snowfall. Conversations can still be heard clearly, but loud noises such as combat or shouting sound distant and muffled. Spells and other effects are not interfered with or silenced by the globe and remain unaffected. Once this property of the globe is used, it can''t be used again until the next dawn.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13430.0),
('e6973e47-6b10-51a1-89de-b09079e792fe', 'LOT_1344', 'Snowpocalator (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

The Snowpocalator was born of one goblin''s desire for revenge against his older brother, who hit him with a snowball. This weapon allows the bearer to pour out the wrath of a snowballpocalypse on others in a snowball fight.

This magical turret requires snow as ammunition. As a Magic action, you can plant it onto the ground, causing it to suck in 5 cubic feet of snow each turn using a hose in a 10-foot Emanation originating from it. At the beginning of your next turn, it shoots snowballs in a 15-foot Cone, blanketing the area in snow. Any creature in this area engaging in or watching a snowball fight must make a DC 13 Wisdom saving throw or have the Frightened condition until the end of their next turn.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13440.0),
('278923be-338b-5fc4-9aad-378364eaa9a7', 'LOT_1345', 'Solstice Sentinel (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

Every winter festival, children and adventurers alike clamor for a chance to own the hottest toy in town the Solstice Sentinel, a tiny toy brought to life by the arcane enchantments of Faerûn’s greatest artificers. They say two wealthy merchants, both fathers desperate to make their children’s winter festival unforgettable, went to war over a single Solstice Sentinel. Snowballs flew, magical mishaps turned market stalls upside down, and a rogue fire elemental got involved after someone tripped the summoning trap. Shimmering in crimson armor trimmed with sparkling snowflakes, this pint-sized hero spins and twinkles with rainbow lights, spreading cheer wherever it goes. 

You can take an Utilize action to wind a key to animate the toy for 8 hours. During this time, the toy produces an aura of snowflakes and rainbow lights in a 10-foot Emanation while uttering heroic catchphrases and follows you to the best of its ability and can share your space. The toy has AC 5, 1 Hit Point, and a walking Speed of 30 feet. 

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13450.0),
('7b688fc3-b78d-50a2-bb0a-d5cc50955d55', 'LOT_1346', 'Stocking of Sweets (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

Looking like an ordinary bright red sock with white trimming this stocking hides a sweet surprise. You can reach inside this stocking to pull out either a gift wrapped mint candy cane or three small coin shaped chocolates. These sweets disappear if not consumed within 24 hours of pulling them out of the stocking. Once you use the stocking in this way, you can''t do so again until the next dawn.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13460.0),
('194fcf0f-750f-514c-8386-f6432d59d1f3', 'LOT_1347', 'Tea-Riffic Teacup (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

When you pour nonmagical liquids into this delicate bone china teacup, it instantly creates a perfect cup of steaming hot tea. Upon drinking from it, roll a 1d100. On a 1 on the d100, your tea is over-steeped, bitter, and tastes faintly salty from tears.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13470.0),
('8ee36417-d2b7-58a5-8a00-55ea108da213', 'LOT_1348', 'Winter Clause Suit (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous item, T0

By putting on this suit, you agree to adhere to the clause made by the spirit of a joyful man who passed many years ago during the winter. The clause is written in small letters
around the label inside the suit and states that you must bring joy to those around you. While wearing the suit, you become in tune with his spirit and feel an overwhelming sense of jolliness and constantly feel compelled by the spirit to try to bring joy to anyone you see like he had. Over 1d4+2 days your appearance will slowly begin to change. Your hair slowly turns white, your stomach becomes big and round, and you grow a long white beard. While like this you are still recognizable as yourself and when you take off the suit you revert back to normal in the same amount of time it took you to transform.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13480.0),
('54e387d4-858d-58de-8a19-a94b20b1f4dc', 'LOT_1349', 'Winter Lodge Journal (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', 'Permanent', false, 'Seasonal Event', 'T0 Permanent (Seasonal Event)', '{"HHB"}', 'Wondrous Item, T0

This smooth camel tan leather tome is stitched with holly sprigs and snowflakes in silver thread. Inside the pages are thick and ivory; each page has a silver-gilded edge. A slender pen with small snowflake accents is clasped to the spine by ribbon. Holding the journal in your hands will always bring back the best smells, sounds, and tastes of your favorite Midwinter celebrations.

The journal has the following properties.

Magical Recording. The pen writes in green and red ink that never runs out but that can only be used to write in the journal. You can also take a Magic action and speak aloud for the pen to animate and write what you say aloud in the journal. The pen animates and writes in the journal in this way for 1 hour, which ends early if you dismiss this effect (no action required).

Midwinter Magic. When you finish a Long Rest while the journal is on your person, you gain one of the following benefits of your choice.
- Midwinter Past. You have Advantage on your next Intelligence (History) check.
- Midwinter Present. You gain 1d4 + 2 Temporary Hit Points.
- Midwinter Future. You have Advantage on your next Wisdom (Insight) check.

Base Cost: 100 GP
Crafting Cost: N/A (cannot be crafted)', NULL, 13490.0),
('15ab9c5c-b3d1-50ac-b83c-10753d749083', 'LOT_1350', 'Official Item Not Listed Here', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'VARIES'), 'Varies', 'Varies', false, NULL, 'Varies', '{}'::text[], 'Item from an official 5e Wizards of the Coast product. See associated book for description.', NULL, 13500.0),
('276726a8-ab17-5516-83a0-cd8408ae9bd1', 'LOT_1351', 'Homebrew Item Created by a DM', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'VARIES'), 'Varies', 'Varies', false, NULL, 'Varies', '{"HHB"}', 'Homebrew item created by a DM in collaboration with the Rules team.', NULL, 13510.0),
('256110f2-c909-5ece-9d2c-6ee5f575c6b2', 'LOT_1352', 'Clover (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (Pistoll)', 'Permanent', false, 'Legacy', 'Legacy T1 Permanent', '{"HHB"}', 'Weapon (Pistol), Legacy T1 (requires attunement)

This shiny golden gun is engraved with a green rune of a four leaf clover that resonates with divination magic. 

You have a +1 bonus to attack and damage rolls made with this weapon. If you miss a ranged attack with this weapon using the last bullet before you have to reload, the target of the attack still takes Slashing damage equal to the ability modifier you used to make the attack roll.', NULL, 13520.0),
('a37814e9-55e3-5ed4-a0d7-05f2505295a6', 'LOT_1353', 'Fortunate Shotgun (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Weapon (Blunderbuss)', 'Permanent', false, 'Legacy', 'Legacy T0 Permanent', '{"HHB"}', 'Weapon (Blunderbuss), Legacy T0

When you score a critical hit with a ranged attack with this weapon, you don''t take any Scatter damage from it.', NULL, 13530.0),
('db2b7cec-fab1-52f4-b75f-25142ce8fdef', 'LOT_1354', 'Gutbuster (HB)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Potion', 'Consumable', false, 'Legacy', 'Legacy T2 Consumable', '{"HHB"}', 'Potion, Legacy T2

This dwarven concoction is made from cave fisher venom and heady liqueurs. When you drink this potion, you must make a DC 17 Constitution saving throw or become poisoned for 1 minute. You automatically succeed if you have the Battlerager Primal Path. For the next minute after drinking this potion, you gain the following benefits:
- Having 0 Hit Points doesn''t cause you to fall Unconscious. You must still make Death Saving Throws, and you suffer the normal effects of taking damage while at 0 Hit Points. 
- If you have the Battlerager Primal Path, your bonus Rage Damage is doubled and the Temporary Hit Points you gain from your Reckless Abandon feature are also doubled.', NULL, 13540.0),
('5b36fdc1-8fec-58b2-aa07-cca010dbdadf', 'LOT_1355', 'Weapon of Recall (HB)  (any weapon with the thrown property)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any weapon with the thrown property)', 'Permanent', false, 'Legacy', 'Legacy T1 Permanent', '{"HHB"}', 'Weapon (any weapon with the thrown property), T1

Whenever you make a ranged attack with this weapon, it returns to your hand immediately after the attack hits or misses.', NULL, 13550.0),
('02b9d952-8baf-5982-b07f-50b0e2ff5aa7', 'LOT_1356', '+1 Weapon of Recall (HB) (any weapon with the thrown property)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Weapon (any weapon with the thrown property)', 'Permanent', false, 'Legacy', 'Legacy T1 Permanent', '{"HHB"}', 'Weapon (any weapon with the thrown property), T1

You have a +1 bonus to attack and damage rolls made with this magic weapon. Whenever you make a ranged attack with this weapon, it returns to your hand immediately after the attack hits or misses.', NULL, 13560.0),
('036ec7d3-7f58-5ddc-bd13-7728666b50f8', 'LOT_1357', '+2 Weapon of Recall  (HB) (any weapon with the thrown property)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Weapon (any weapon with the thrown property)', 'Permanent', false, 'Legacy', 'Legacy T2 Permanent', '{"HHB"}', 'Weapon (any weapon with the thrown property), T2

You have a +2 bonus to attack and damage rolls made with this magic weapon. Whenever you make a ranged attack with this weapon, it returns to your hand immediately after the attack hits or misses.', NULL, 13570.0),
('11eff5c4-1d16-56e4-b36d-99d99a625161', 'LOT_1358', '+3 Weapon of Recall (HB)  (any weapon with the thrown property)', 'd0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T3'), 'Weapon (any weapon with the thrown property)', 'Permanent', false, 'Legacy', 'Legacy T3 Permanent', '{"HHB"}', 'Weapon (any weapon with the thrown property), T3

You have a +3 bonus to attack and damage rolls made with this magic weapon. Whenever you make a ranged attack with this weapon, it returns to your hand immediately after the attack hits or misses.', NULL, 13580.0);

-- 8. Indexes
CREATE INDEX idx_ac_loot_category_id ON public.ac_loot(category_id);
CREATE INDEX idx_ac_loot_tier_id ON public.ac_loot(tier_id);
CREATE INDEX idx_ac_loot_check_id ON public.ac_loot(check_id);
CREATE INDEX idx_ac_loot_name ON public.ac_loot(name);
CREATE INDEX idx_ac_loot_nature ON public.ac_loot(nature);
CREATE INDEX idx_ac_loot_tags_loot_id ON public.ac_loot_tags(loot_id);

-- 9. Row Level Security (RLS)
ALTER TABLE public.ac_loot_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ac_loot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ac_loot_tags ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Allow public read access to ac_loot_categories" ON public.ac_loot_categories FOR SELECT USING (true);
CREATE POLICY "Allow public read access to ac_loot" ON public.ac_loot FOR SELECT USING (true);
CREATE POLICY "Allow public read access to ac_loot_tags" ON public.ac_loot_tags FOR SELECT USING (true);

-- Staff admin/auditor/engineer modification policies
CREATE POLICY "Allow staff to insert ac_loot_categories" ON public.ac_loot_categories FOR INSERT WITH CHECK (
    ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb) OR
    ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Auditor"]'::jsonb) OR
    ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
);
CREATE POLICY "Allow staff to update ac_loot_categories" ON public.ac_loot_categories FOR UPDATE USING (
    ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb) OR
    ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Auditor"]'::jsonb) OR
    ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
);
CREATE POLICY "Allow staff to delete ac_loot_categories" ON public.ac_loot_categories FOR DELETE USING (
    ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb) OR
    ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
);
CREATE POLICY "Allow staff to insert ac_loot" ON public.ac_loot FOR INSERT WITH CHECK (
    ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb) OR
    ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Auditor"]'::jsonb) OR
    ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
);
CREATE POLICY "Allow staff to update ac_loot" ON public.ac_loot FOR UPDATE USING (
    ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb) OR
    ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Auditor"]'::jsonb) OR
    ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
);
CREATE POLICY "Allow staff to delete ac_loot" ON public.ac_loot FOR DELETE USING (
    ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb) OR
    ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
);
CREATE POLICY "Allow staff to insert ac_loot_tags" ON public.ac_loot_tags FOR INSERT WITH CHECK (
    ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb) OR
    ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Auditor"]'::jsonb) OR
    ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
);
CREATE POLICY "Allow staff to update ac_loot_tags" ON public.ac_loot_tags FOR UPDATE USING (
    ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb) OR
    ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Auditor"]'::jsonb) OR
    ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
);
CREATE POLICY "Allow staff to delete ac_loot_tags" ON public.ac_loot_tags FOR DELETE USING (
    ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb) OR
    ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
);

COMMIT;
