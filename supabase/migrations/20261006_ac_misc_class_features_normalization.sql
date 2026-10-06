-- ==============================================================================
-- Migration: AC Misc Class Features Normalization & Staff Admin RLS
-- Target Domain: Fighting Styles, Artificer Infusions, Eldritch Invocations
-- Date: 2026-10-06
-- Target Database: Supabase PostgreSQL (public schema)
-- Description:
--   1. Creates legacy backup snapshots for ac_fighting_styles, ac_artificer_infusions,
--      and ac_eldritch_invocations if not already present.
--   2. Evolves schemas: adds check_id, ruleset; converts display_order to DOUBLE PRECISION.
--   3. Upserts all 119 records from Allowed_Content_20261004.xlsx (MSC_0001 to MSC_0119):
--        - 17 Fighting Styles (MSC_0001..MSC_0017)
--        - 16 Artificer Infusions (MSC_0018..MSC_0033)
--        - 86 Eldritch Invocations (MSC_0034..MSC_0119)
--   4. Enforces check_id NOT NULL & UNIQUE, ruleset NOT NULL, (name, ruleset) UNIQUE,
--      and ac_sources(source_key) foreign key constraints across all three tables.
--   5. Re-attaches handle_updated_at triggers and sets up Staff Admin & Engineer RLS policies.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Archive Snapshots of Legacy Tables
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ac_fighting_styles')
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ac_fighting_styles_legacy_backup') THEN
        CREATE TABLE public.ac_fighting_styles_legacy_backup AS SELECT * FROM public.ac_fighting_styles;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ac_artificer_infusions')
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ac_artificer_infusions_legacy_backup') THEN
        CREATE TABLE public.ac_artificer_infusions_legacy_backup AS SELECT * FROM public.ac_artificer_infusions;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ac_eldritch_invocations')
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ac_eldritch_invocations_legacy_backup') THEN
        CREATE TABLE public.ac_eldritch_invocations_legacy_backup AS SELECT * FROM public.ac_eldritch_invocations;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. Schema Evolution: Add Columns and Alter Display Order Types
-- ------------------------------------------------------------------------------
-- Fighting Styles
ALTER TABLE public.ac_fighting_styles ADD COLUMN IF NOT EXISTS check_id TEXT;
ALTER TABLE public.ac_fighting_styles ADD COLUMN IF NOT EXISTS ruleset TEXT;
ALTER TABLE public.ac_fighting_styles ALTER COLUMN display_order TYPE DOUBLE PRECISION USING display_order::DOUBLE PRECISION;

-- Artificer Infusions
ALTER TABLE public.ac_artificer_infusions ADD COLUMN IF NOT EXISTS check_id TEXT;
ALTER TABLE public.ac_artificer_infusions ADD COLUMN IF NOT EXISTS ruleset TEXT;
ALTER TABLE public.ac_artificer_infusions ALTER COLUMN display_order TYPE DOUBLE PRECISION USING display_order::DOUBLE PRECISION;

-- Eldritch Invocations
ALTER TABLE public.ac_eldritch_invocations ADD COLUMN IF NOT EXISTS check_id TEXT;
ALTER TABLE public.ac_eldritch_invocations ADD COLUMN IF NOT EXISTS ruleset TEXT;
ALTER TABLE public.ac_eldritch_invocations ALTER COLUMN display_order TYPE DOUBLE PRECISION USING display_order::DOUBLE PRECISION;

-- ------------------------------------------------------------------------------
-- 3. Data Migration: Upsert 17 Fighting Styles (MSC_0001 to MSC_0017)
-- ------------------------------------------------------------------------------
UPDATE public.ac_fighting_styles f
SET check_id = v.check_id,
    ruleset = v.ruleset,
    classes = v.classes,
    source = v.source,
    notes_advice = v.notes_advice,
    display_order = v.display_order
FROM (VALUES
  ('MSC_0001', 'Archery', '2014', 'Blood Hunter, Fighter, Ranger', 'PHB2014', 'PHB 2014', NULL, 1.0::DOUBLE PRECISION),
  ('MSC_0002', 'Blessed Warrior', '2014', 'Paladin', 'TCE', 'TCE', NULL, 2.0::DOUBLE PRECISION),
  ('MSC_0003', 'Blind Fighting', '2014', 'Blood Hunter, Fighter, Paladin, Ranger', 'TCE', 'TCE', NULL, 3.0::DOUBLE PRECISION),
  ('MSC_0004', 'Close Quarters Shooter', '2014', 'Blood Hunter, Fighter, Paladin, Ranger', 'UALDU', 'UALDU', '- The first sentence is replaced with: "Being within 5 feet of a hostile creature doesn''t impose disadvantage on your ranged attack rolls."
- Can be selected as a Fighting Style feat for 2024 characters', 4.0::DOUBLE PRECISION),
  ('MSC_0005', 'Defense', '2014', 'Fighter, Paladin, Ranger', 'PHB2014', 'PHB 2014', NULL, 5.0::DOUBLE PRECISION),
  ('MSC_0006', 'Druidic Warrior', '2014', 'Ranger', 'TCE', 'TCE', NULL, 6.0::DOUBLE PRECISION),
  ('MSC_0007', 'Dueling', '2014', 'Bard (Swords), Blood Hunter, Fighter, Paladin, Ranger', 'PHB2014', 'PHB 2014', NULL, 7.0::DOUBLE PRECISION),
  ('MSC_0008', 'Great Weapon Fighting', '2014', 'Blood Hunter, Fighter, Paladin', 'PHB2014', 'PHB 2014', NULL, 8.0::DOUBLE PRECISION),
  ('MSC_0009', 'Interception', '2014', 'Fighter, Paladin', 'TCE', 'TCE', NULL, 9.0::DOUBLE PRECISION),
  ('MSC_0010', 'Mariner', '2014', 'Bard (Swords), Blood Hunter, Fighter, Paladin, Ranger', 'UAWA', 'UAWA', 'Can be selected as a Fighting Style feat for 2024 characters', 10.0::DOUBLE PRECISION),
  ('MSC_0011', 'Protection', '2014', 'Fighter, Paladin', 'PHB2014', 'PHB 2014', NULL, 11.0::DOUBLE PRECISION),
  ('MSC_0012', 'Superior Technique', '2014', 'Bard (Swords), Blood Hunter, Fighter', 'TCE', 'TCE', 'Can be selected as a Fighting Style feat for 2024 characters', 12.0::DOUBLE PRECISION),
  ('MSC_0013', 'Thrown Weapon Fighting', '2014', 'Bard (Swords), Fighter, Ranger', 'TCE', 'TCE', NULL, 13.0::DOUBLE PRECISION),
  ('MSC_0014', 'Tunnel Fighter', '2014', 'Bard (Swords), Blood Hunter, Fighter, Ranger', 'UALDU', 'UALDU', 'Can be selected as a Fighting Style feat for 2024 characters', 14.0::DOUBLE PRECISION),
  ('MSC_0015', 'Two-Weapon Fighting', '2014', 'Bard (Swords), Blood Hunter, Fighter, Ranger', 'PHB2014', 'PHB 2014', NULL, 15.0::DOUBLE PRECISION),
  ('MSC_0016', 'Unarmed Fighting', '2014', 'Fighter', 'TCE', 'TCE', NULL, 16.0::DOUBLE PRECISION),
  ('MSC_0017', '2024 Fighting Styles', '2024', 'N/A', 'PHB2024', 'PHB 2024', 'Refer to Fighting Style Feats [here](/Guides/allowed-content/#feats).', 17.0::DOUBLE PRECISION)
) AS v(check_id, name, ruleset, classes, source, legacy_source, notes_advice, display_order)
WHERE f.name = v.name AND (f.source = v.source OR f.source = v.legacy_source);

-- Insert any missing Fighting Styles
INSERT INTO public.ac_fighting_styles (check_id, name, ruleset, classes, source, notes_advice, display_order)
SELECT v.check_id, v.name, v.ruleset, v.classes, v.source, v.notes_advice, v.display_order
FROM (VALUES
  ('MSC_0001', 'Archery', '2014', 'Blood Hunter, Fighter, Ranger', 'PHB2014', NULL, 1.0::DOUBLE PRECISION),
  ('MSC_0002', 'Blessed Warrior', '2014', 'Paladin', 'TCE', NULL, 2.0::DOUBLE PRECISION),
  ('MSC_0003', 'Blind Fighting', '2014', 'Blood Hunter, Fighter, Paladin, Ranger', 'TCE', NULL, 3.0::DOUBLE PRECISION),
  ('MSC_0004', 'Close Quarters Shooter', '2014', 'Blood Hunter, Fighter, Paladin, Ranger', 'UALDU', '- The first sentence is replaced with: "Being within 5 feet of a hostile creature doesn''t impose disadvantage on your ranged attack rolls."
- Can be selected as a Fighting Style feat for 2024 characters', 4.0::DOUBLE PRECISION),
  ('MSC_0005', 'Defense', '2014', 'Fighter, Paladin, Ranger', 'PHB2014', NULL, 5.0::DOUBLE PRECISION),
  ('MSC_0006', 'Druidic Warrior', '2014', 'Ranger', 'TCE', NULL, 6.0::DOUBLE PRECISION),
  ('MSC_0007', 'Dueling', '2014', 'Bard (Swords), Blood Hunter, Fighter, Paladin, Ranger', 'PHB2014', NULL, 7.0::DOUBLE PRECISION),
  ('MSC_0008', 'Great Weapon Fighting', '2014', 'Blood Hunter, Fighter, Paladin', 'PHB2014', NULL, 8.0::DOUBLE PRECISION),
  ('MSC_0009', 'Interception', '2014', 'Fighter, Paladin', 'TCE', NULL, 9.0::DOUBLE PRECISION),
  ('MSC_0010', 'Mariner', '2014', 'Bard (Swords), Blood Hunter, Fighter, Paladin, Ranger', 'UAWA', 'Can be selected as a Fighting Style feat for 2024 characters', 10.0::DOUBLE PRECISION),
  ('MSC_0011', 'Protection', '2014', 'Fighter, Paladin', 'PHB2014', NULL, 11.0::DOUBLE PRECISION),
  ('MSC_0012', 'Superior Technique', '2014', 'Bard (Swords), Blood Hunter, Fighter', 'TCE', 'Can be selected as a Fighting Style feat for 2024 characters', 12.0::DOUBLE PRECISION),
  ('MSC_0013', 'Thrown Weapon Fighting', '2014', 'Bard (Swords), Fighter, Ranger', 'TCE', NULL, 13.0::DOUBLE PRECISION),
  ('MSC_0014', 'Tunnel Fighter', '2014', 'Bard (Swords), Blood Hunter, Fighter, Ranger', 'UALDU', 'Can be selected as a Fighting Style feat for 2024 characters', 14.0::DOUBLE PRECISION),
  ('MSC_0015', 'Two-Weapon Fighting', '2014', 'Bard (Swords), Blood Hunter, Fighter, Ranger', 'PHB2014', NULL, 15.0::DOUBLE PRECISION),
  ('MSC_0016', 'Unarmed Fighting', '2014', 'Fighter', 'TCE', NULL, 16.0::DOUBLE PRECISION),
  ('MSC_0017', '2024 Fighting Styles', '2024', 'N/A', 'PHB2024', 'Refer to Fighting Style Feats [here](/Guides/allowed-content/#feats).', 17.0::DOUBLE PRECISION)
) AS v(check_id, name, ruleset, classes, source, notes_advice, display_order)
WHERE NOT EXISTS (
    SELECT 1 FROM public.ac_fighting_styles f WHERE f.check_id = v.check_id
);

-- ------------------------------------------------------------------------------
-- 4. Data Migration: Upsert 16 Artificer Infusions (MSC_0018 to MSC_0033)
-- ------------------------------------------------------------------------------
UPDATE public.ac_artificer_infusions a
SET check_id = v.check_id,
    ruleset = v.ruleset,
    item_prereq = v.item_prereq,
    requires_attunement = v.requires_attunement,
    level_prereq = v.level_prereq,
    source = v.source,
    notes_advice = v.notes_advice,
    display_order = v.display_order
FROM (VALUES
  ('MSC_0018', 'Arcane Propulsion Armor', '2014', 'A suit of armor', 'Yes', '14', 'TCE', 'TCE', NULL, 1.0::DOUBLE PRECISION),
  ('MSC_0019', 'Armor of Magical Strength', '2014', 'A suit of armor', 'Yes', 'Any', 'TCE', 'TCE', NULL, 2.0::DOUBLE PRECISION),
  ('MSC_0020', 'Boots of the Winding Path', '2014', 'A pair of boots', 'Yes', '6', 'TCE', 'TCE', NULL, 3.0::DOUBLE PRECISION),
  ('MSC_0021', 'Enhanced Arcane Focus', '2014', 'A rod, staff, or wand', 'Yes', 'Any', 'TCE', 'TCE', NULL, 4.0::DOUBLE PRECISION),
  ('MSC_0022', 'Enhanced Defense', '2014', 'A suit of armor or shield', 'No', 'Any', 'TCE', 'TCE', NULL, 5.0::DOUBLE PRECISION),
  ('MSC_0023', 'Enhanced Weapon', '2014', 'A simple or martial weapon', 'No', 'Any', 'TCE', 'TCE', NULL, 6.0::DOUBLE PRECISION),
  ('MSC_0024', 'Helm of Awareness', '2014', 'A helmet', 'Yes', '10', 'TCE', 'TCE', NULL, 7.0::DOUBLE PRECISION),
  ('MSC_0025', 'Homunculus Servant', '2014', 'A gem or crystal worth at least 100 GP', 'No', 'Any', 'TCE', 'TCE', NULL, 8.0::DOUBLE PRECISION),
  ('MSC_0026', 'Mind Sharpener', '2014', 'A suit of armor or robes', 'No', 'Any', 'TCE', 'TCE', NULL, 9.0::DOUBLE PRECISION),
  ('MSC_0027', 'Radiant Weapon', '2014', 'A simple or martial weapon', 'Yes', '6', 'TCE', 'TCE', NULL, 10.0::DOUBLE PRECISION),
  ('MSC_0028', 'Repeating Shot', '2014', 'A simple or martial weapon with the  ammunition property', 'Yes', 'Any', 'TCE', 'TCE', NULL, 11.0::DOUBLE PRECISION),
  ('MSC_0029', 'Replicate Magic Item', '2014', 'Special', 'Special', 'Special', 'TCE', 'TCE', '- Magic items made this way can''t be sold or traded
- Can be used to make any T0 or T1 permanent magic item in the Items List', 12.0::DOUBLE PRECISION),
  ('MSC_0030', 'Repulsion Shield', '2014', 'A shield', 'Yes', '6', 'TCE', 'TCE', NULL, 13.0::DOUBLE PRECISION),
  ('MSC_0031', 'Resistant Armor', '2014', 'A suit of armor', 'Yes', '6', 'TCE', 'TCE', NULL, 14.0::DOUBLE PRECISION),
  ('MSC_0032', 'Returning Weapon', '2014', 'A simple or martial weapon with the thrown property', 'No', 'Any', 'TCE', 'TCE', NULL, 15.0::DOUBLE PRECISION),
  ('MSC_0033', 'Spell-Fueling Ring', '2014', 'A ring', 'Yes', '6', 'TCE', 'TCE', NULL, 16.0::DOUBLE PRECISION)
) AS v(check_id, name, ruleset, item_prereq, requires_attunement, level_prereq, source, legacy_source, notes_advice, display_order)
WHERE a.name = v.name AND (a.source = v.source OR a.source = v.legacy_source);

-- Insert any missing Artificer Infusions
INSERT INTO public.ac_artificer_infusions (check_id, name, ruleset, item_prereq, requires_attunement, level_prereq, source, notes_advice, display_order)
SELECT v.check_id, v.name, v.ruleset, v.item_prereq, v.requires_attunement, v.level_prereq, v.source, v.notes_advice, v.display_order
FROM (VALUES
  ('MSC_0018', 'Arcane Propulsion Armor', '2014', 'A suit of armor', 'Yes', '14', 'TCE', NULL, 1.0::DOUBLE PRECISION),
  ('MSC_0019', 'Armor of Magical Strength', '2014', 'A suit of armor', 'Yes', 'Any', 'TCE', NULL, 2.0::DOUBLE PRECISION),
  ('MSC_0020', 'Boots of the Winding Path', '2014', 'A pair of boots', 'Yes', '6', 'TCE', NULL, 3.0::DOUBLE PRECISION),
  ('MSC_0021', 'Enhanced Arcane Focus', '2014', 'A rod, staff, or wand', 'Yes', 'Any', 'TCE', NULL, 4.0::DOUBLE PRECISION),
  ('MSC_0022', 'Enhanced Defense', '2014', 'A suit of armor or shield', 'No', 'Any', 'TCE', NULL, 5.0::DOUBLE PRECISION),
  ('MSC_0023', 'Enhanced Weapon', '2014', 'A simple or martial weapon', 'No', 'Any', 'TCE', NULL, 6.0::DOUBLE PRECISION),
  ('MSC_0024', 'Helm of Awareness', '2014', 'A helmet', 'Yes', '10', 'TCE', NULL, 7.0::DOUBLE PRECISION),
  ('MSC_0025', 'Homunculus Servant', '2014', 'A gem or crystal worth at least 100 GP', 'No', 'Any', 'TCE', NULL, 8.0::DOUBLE PRECISION),
  ('MSC_0026', 'Mind Sharpener', '2014', 'A suit of armor or robes', 'No', 'Any', 'TCE', NULL, 9.0::DOUBLE PRECISION),
  ('MSC_0027', 'Radiant Weapon', '2014', 'A simple or martial weapon', 'Yes', '6', 'TCE', NULL, 10.0::DOUBLE PRECISION),
  ('MSC_0028', 'Repeating Shot', '2014', 'A simple or martial weapon with the  ammunition property', 'Yes', 'Any', 'TCE', NULL, 11.0::DOUBLE PRECISION),
  ('MSC_0029', 'Replicate Magic Item', '2014', 'Special', 'Special', 'Special', 'TCE', '- Magic items made this way can''t be sold or traded
- Can be used to make any T0 or T1 permanent magic item in the Items List', 12.0::DOUBLE PRECISION),
  ('MSC_0030', 'Repulsion Shield', '2014', 'A shield', 'Yes', '6', 'TCE', NULL, 13.0::DOUBLE PRECISION),
  ('MSC_0031', 'Resistant Armor', '2014', 'A suit of armor', 'Yes', '6', 'TCE', NULL, 14.0::DOUBLE PRECISION),
  ('MSC_0032', 'Returning Weapon', '2014', 'A simple or martial weapon with the thrown property', 'No', 'Any', 'TCE', NULL, 15.0::DOUBLE PRECISION),
  ('MSC_0033', 'Spell-Fueling Ring', '2014', 'A ring', 'Yes', '6', 'TCE', NULL, 16.0::DOUBLE PRECISION)
) AS v(check_id, name, ruleset, item_prereq, requires_attunement, level_prereq, source, notes_advice, display_order)
WHERE NOT EXISTS (
    SELECT 1 FROM public.ac_artificer_infusions a WHERE a.check_id = v.check_id
);

-- ------------------------------------------------------------------------------
-- 5. Data Migration: Upsert 86 Eldritch Invocations (MSC_0034 to MSC_0119)
-- ------------------------------------------------------------------------------
UPDATE public.ac_eldritch_invocations e
SET check_id = v.check_id,
    ruleset = v.ruleset,
    pact_prereq = v.pact_prereq,
    other_prereq = v.other_prereq,
    level_prereq = v.level_prereq,
    source = v.source,
    notes_advice = v.notes_advice,
    display_order = v.display_order
FROM (VALUES
  ('MSC_0034', 'Agonising Blast', '2014', 'Any', 'Eldritch Blast', 'Any', 'PHB2014', 'PHB 2014', NULL, 1.0::DOUBLE PRECISION),
  ('MSC_0035', 'Armor of Shadows', '2014', 'Any', NULL, 'Any', 'PHB2014', 'PHB 2014', NULL, 2.0::DOUBLE PRECISION),
  ('MSC_0036', 'Ascendant Step', '2014', 'Any', NULL, '9', 'PHB2014', 'PHB 2014', NULL, 3.0::DOUBLE PRECISION),
  ('MSC_0037', 'Aspect of the Moon', '2014', 'Tome', NULL, 'Any', 'XGE', 'XGE', NULL, 4.0::DOUBLE PRECISION),
  ('MSC_0038', 'Beast Speech', '2014', 'Any', NULL, 'Any', 'PHB2014', 'PHB 2014', NULL, 5.0::DOUBLE PRECISION),
  ('MSC_0039', 'Beguiling Influence', '2014', 'Any', NULL, 'Any', 'PHB2014', 'PHB 2014', NULL, 6.0::DOUBLE PRECISION),
  ('MSC_0040', 'Bewitching Whisper', '2014', 'Any', NULL, '7', 'PHB2014', 'PHB 2014', 'You don''t expend a spell slot to cast the spell from this invocation.', 7.0::DOUBLE PRECISION),
  ('MSC_0041', 'Bond of the Talisman', '2014', 'Talisman', NULL, '12', 'TCE', 'TCE', NULL, 8.0::DOUBLE PRECISION),
  ('MSC_0042', 'Book of Ancient Secrets', '2014', 'Tome', NULL, 'Any', 'PHB2014', 'PHB 2014', 'You can use the Book of Shadows as a spellbook, but it''s ever lost or destroyed, the replacement only contains the Pact of the Tome cantrips and the ritual spells it contained.', 9.0::DOUBLE PRECISION),
  ('MSC_0043', 'Chains of Carceri', '2014', 'Chain', NULL, '15', 'PHB2014', 'PHB 2014', NULL, 10.0::DOUBLE PRECISION),
  ('MSC_0044', 'Cloak of Flies', '2014', 'Any', NULL, '5', 'XGE', 'XGE', NULL, 11.0::DOUBLE PRECISION),
  ('MSC_0045', 'Devil''s Sight', '2014', 'Any', NULL, 'Any', 'PHB2014', 'PHB 2014', NULL, 12.0::DOUBLE PRECISION),
  ('MSC_0046', 'Dreadful Word', '2014', 'Any', NULL, '7', 'PHB2014', 'PHB 2014', 'You don''t expend a spell slot to cast the spell from this invocation.', 13.0::DOUBLE PRECISION),
  ('MSC_0047', 'Eldritch Mind', '2014', 'Any', NULL, 'Any', 'TCE', 'TCE', NULL, 14.0::DOUBLE PRECISION),
  ('MSC_0048', 'Eldritch Sight', '2014', 'Any', NULL, 'Any', 'PHB2014', 'PHB 2014', NULL, 15.0::DOUBLE PRECISION),
  ('MSC_0049', 'Eldritch Smite', '2014', 'Blade', NULL, '5', 'XGE', 'XGE', NULL, 16.0::DOUBLE PRECISION),
  ('MSC_0050', 'Eldritch Spear', '2014', 'Any', 'Eldritch Blast', 'Any', 'PHB2014', 'PHB 2014', NULL, 17.0::DOUBLE PRECISION),
  ('MSC_0051', 'Eyes of the Rune Keeper', '2014', 'Any', NULL, 'Any', 'PHB2014', 'PHB 2014', NULL, 18.0::DOUBLE PRECISION),
  ('MSC_0052', 'Far Scribe', '2014', 'Tome', NULL, '5', 'TCE', 'TCE', NULL, 19.0::DOUBLE PRECISION),
  ('MSC_0053', 'Feral Transformation', '2014', 'Any', NULL, '7', 'HWT', 'HWT', 'For 2024 games, the rules for the 2024 version of Polymorph are used: the form is also no longer maintained if you have no Temporary Hit Points remaining', 20.0::DOUBLE PRECISION),
  ('MSC_0054', 'Fiendish Vigor', '2014', 'Any', NULL, 'Any', 'PHB2014', 'PHB 2014', NULL, 21.0::DOUBLE PRECISION),
  ('MSC_0055', 'Gaze of Two Minds', '2014', 'Any', NULL, 'Any', 'PHB2014', 'PHB 2014', NULL, 22.0::DOUBLE PRECISION),
  ('MSC_0056', 'Ghostly Gaze', '2014', 'Any', NULL, '7', 'XGE', 'XGE', NULL, 23.0::DOUBLE PRECISION),
  ('MSC_0057', 'Gift of the Depths', '2014', 'Any', NULL, '5', 'XGE', 'XGE', NULL, 24.0::DOUBLE PRECISION),
  ('MSC_0058', 'Gift of the Ever-Living Ones', '2014', 'Chain', NULL, 'Any', 'XGE', 'XGE', NULL, 25.0::DOUBLE PRECISION),
  ('MSC_0059', 'Gift of the Protectors', '2014', 'Tome', NULL, '9', 'TCE', 'TCE', 'Only other creatures in the same adventure as the warlock can benefit from this invocation.', 26.0::DOUBLE PRECISION),
  ('MSC_0060', 'Grasp of Hadar', '2014', 'Any', 'Eldritch Blast', 'Any', 'XGE', 'XGE', NULL, 27.0::DOUBLE PRECISION),
  ('MSC_0061', 'Hexshredder', '2014', 'Pact of the Blade', NULL, 'Any', 'HWT', 'HWT', NULL, 28.0::DOUBLE PRECISION),
  ('MSC_0062', 'Hunter''s Grimoire', '2014', 'Pact of the Tome', NULL, 'Any', 'HWT', 'HWT', NULL, 29.0::DOUBLE PRECISION),
  ('MSC_0063', 'Improved Pact Weapon', '2014', 'Blade', NULL, 'Any', 'XGE', 'XGE', 'Can also be used with firearms', 30.0::DOUBLE PRECISION),
  ('MSC_0064', 'Investment of the Chain Master', '2014', 'Chain', NULL, 'Any', 'TCE', 'TCE', NULL, 31.0::DOUBLE PRECISION),
  ('MSC_0065', 'Lance of Lethargy', '2014', 'Any', 'Eldritch Blast', 'Any', 'XGE', 'XGE', NULL, 32.0::DOUBLE PRECISION),
  ('MSC_0066', 'Lifedrinker', '2014', 'Blade', NULL, '12', 'PHB2014', 'PHB 2014', NULL, 33.0::DOUBLE PRECISION),
  ('MSC_0067', 'Maddening Hex', '2014', 'Any', 'Hex/Curse', '5', 'XGE', 'XGE', NULL, 34.0::DOUBLE PRECISION),
  ('MSC_0068', 'Mask of Many Faces', '2014', 'Any', NULL, 'Any', 'PHB2014', 'PHB 2014', NULL, 35.0::DOUBLE PRECISION),
  ('MSC_0069', 'Master of Myriad Forms', '2014', 'Any', NULL, '15', 'PHB2014', 'PHB 2014', NULL, 36.0::DOUBLE PRECISION),
  ('MSC_0070', 'Minions of Chaos', '2014', 'Any', NULL, '9', 'PHB2014', 'PHB 2014', 'You don''t expend a spell slot to cast the spell from this invocation.', 37.0::DOUBLE PRECISION),
  ('MSC_0071', 'Mire the Mind', '2014', 'Any', NULL, '5', 'PHB2014', 'PHB 2014', NULL, 38.0::DOUBLE PRECISION),
  ('MSC_0072', 'Misty Visions', '2014', 'Any', NULL, 'Any', 'PHB2014', 'PHB 2014', NULL, 39.0::DOUBLE PRECISION),
  ('MSC_0073', 'One with Shadows', '2014', 'Any', NULL, '5', 'PHB2014', 'PHB 2014', NULL, 40.0::DOUBLE PRECISION),
  ('MSC_0074', 'Otherwordly Leap', '2014', 'Any', NULL, '9', 'PHB2014', 'PHB 2014', NULL, 41.0::DOUBLE PRECISION),
  ('MSC_0075', 'Primal Summoner', '2014', 'Pact of the Chain', NULL, 'Any', 'HWT', 'HWT', NULL, 42.0::DOUBLE PRECISION),
  ('MSC_0076', 'Protection of the Talisman', '2014', 'Talisman', NULL, '7', 'TCE', 'TCE', NULL, 43.0::DOUBLE PRECISION),
  ('MSC_0077', 'Rebuke of the Talisman', '2014', 'Talisman', NULL, 'Any', 'TCE', 'TCE', NULL, 44.0::DOUBLE PRECISION),
  ('MSC_0078', 'Relentless Hex', '2014', 'Any', 'Hex/Curse', '7', 'XGE', 'XGE', NULL, 45.0::DOUBLE PRECISION),
  ('MSC_0079', 'Repelling Blast', '2014', 'Any', 'Eldritch Blast', 'Any', 'PHB2014', 'PHB 2014', NULL, 46.0::DOUBLE PRECISION),
  ('MSC_0080', 'Sculptor of Flesh', '2014', 'Any', NULL, '7', 'PHB2014', 'PHB 2014', 'You don''t expend a spell slot to cast the spell from this invocation.', 47.0::DOUBLE PRECISION),
  ('MSC_0081', 'Shroud of Shadow', '2014', 'Any', NULL, '15', 'XGE', 'XGE', NULL, 48.0::DOUBLE PRECISION),
  ('MSC_0082', 'Signs of Ill Omen', '2014', 'Any', NULL, '5', 'PHB2014', 'PHB 2014', 'You don''t expend a spell slot to cast the spell from this invocation.', 49.0::DOUBLE PRECISION),
  ('MSC_0083', 'Thief of Five Fates', '2014', 'Any', NULL, 'Any', 'PHB2014', 'PHB 2014', 'You don''t expend a spell slot to cast the spell from this invocation.', 50.0::DOUBLE PRECISION),
  ('MSC_0084', 'Thirsting Blade', '2014', 'Blade', NULL, '5', 'PHB2014', 'PHB 2014', NULL, 51.0::DOUBLE PRECISION),
  ('MSC_0085', 'Tomb of Levistus', '2014', 'Any', NULL, '5', 'XGE', 'XGE', NULL, 52.0::DOUBLE PRECISION),
  ('MSC_0086', 'Trickster''s Escape', '2014', 'Any', NULL, '7', 'XGE', 'XGE', NULL, 53.0::DOUBLE PRECISION),
  ('MSC_0087', 'Undying Servitude', '2014', 'Any', NULL, '5', 'TCE', 'TCE', NULL, 54.0::DOUBLE PRECISION),
  ('MSC_0088', 'Visions of Distant Realms', '2014', 'Any', NULL, '15', 'PHB2014', 'PHB 2014', NULL, 55.0::DOUBLE PRECISION),
  ('MSC_0089', 'Voice of the Chain Master', '2014', 'Chain', NULL, 'Any', 'PHB2014', 'PHB 2014', NULL, 56.0::DOUBLE PRECISION),
  ('MSC_0090', 'Whispers of the Grave', '2014', 'Any', NULL, '9', 'PHB2014', 'PHB 2014', NULL, 57.0::DOUBLE PRECISION),
  ('MSC_0091', 'Witch Sight', '2014', 'Any', NULL, '15', 'PHB2014', 'PHB 2014', NULL, 58.0::DOUBLE PRECISION),
  ('MSC_0092', 'Agonizing Blast', '2024', '—', 'Warlock cantrip that deals damage', '2', 'PHB2024', 'PHB 2024', NULL, 59.0::DOUBLE PRECISION),
  ('MSC_0093', 'Armor of Shadows', '2024', '—', NULL, 'Any', 'PHB2024', 'PHB 2024', NULL, 60.0::DOUBLE PRECISION),
  ('MSC_0094', 'Ascendant Step', '2024', '—', NULL, '5', 'PHB2024', 'PHB 2024', NULL, 61.0::DOUBLE PRECISION),
  ('MSC_0095', 'Devil''s Sight', '2024', '—', NULL, '2', 'PHB2024', 'PHB 2024', NULL, 62.0::DOUBLE PRECISION),
  ('MSC_0096', 'Devouring Blade', '2024', '—', 'Thirsting Blade (2024)', '12', 'PHB2024', 'PHB 2024', NULL, 63.0::DOUBLE PRECISION),
  ('MSC_0097', 'Eldritch Mind', '2024', '—', NULL, 'Any', 'PHB2024', 'PHB 2024', NULL, 64.0::DOUBLE PRECISION),
  ('MSC_0098', 'Eldritch Smite', '2024', '—', 'Pact of the Blade (2024)', '5', 'PHB2024', 'PHB 2024', NULL, 65.0::DOUBLE PRECISION),
  ('MSC_0099', 'Eldritch Spear', '2024', '—', 'Warlock cantrip that deals damage', '2', 'PHB2024', 'PHB 2024', NULL, 66.0::DOUBLE PRECISION),
  ('MSC_0100', 'Fiendish Vigor', '2024', '—', NULL, '2', 'PHB2024', 'PHB 2024', NULL, 67.0::DOUBLE PRECISION),
  ('MSC_0101', 'Gaze of Two Minds', '2024', '—', NULL, '5', 'PHB2024', 'PHB 2024', NULL, 68.0::DOUBLE PRECISION),
  ('MSC_0102', 'Gift of the Depths', '2024', '—', NULL, '5', 'PHB2024', 'PHB 2024', NULL, 69.0::DOUBLE PRECISION),
  ('MSC_0103', 'Gift of the Protectors', '2024', '—', 'Pact of the Tome (2024)', '9', 'PHB2024', 'PHB 2024', 'Only other creatures in the same adventure as the warlock can benefit from this invocation.', 70.0::DOUBLE PRECISION),
  ('MSC_0104', 'Investment of the Chain Master', '2024', '—', 'Pact of the Chain (2024)', '5', 'PHB2024', 'PHB 2024', NULL, 71.0::DOUBLE PRECISION),
  ('MSC_0105', 'Lessons of the First Ones', '2024', '—', NULL, '2', 'PHB2024', 'PHB 2024', NULL, 72.0::DOUBLE PRECISION),
  ('MSC_0106', 'Lifedrinker', '2024', '—', 'Pact of the Blade (2024)', '9', 'PHB2024', 'PHB 2024', NULL, 73.0::DOUBLE PRECISION),
  ('MSC_0107', 'Mask of Many Faces', '2024', '—', NULL, '2', 'PHB2024', 'PHB 2024', NULL, 74.0::DOUBLE PRECISION),
  ('MSC_0108', 'Master of Myriad Forms', '2024', '—', NULL, '5', 'PHB2024', 'PHB 2024', NULL, 75.0::DOUBLE PRECISION),
  ('MSC_0109', 'Misty Visions', '2024', '—', NULL, '2', 'PHB2024', 'PHB 2024', NULL, 76.0::DOUBLE PRECISION),
  ('MSC_0110', 'One with Shadows', '2024', '—', NULL, '5', 'PHB2024', 'PHB 2024', NULL, 77.0::DOUBLE PRECISION),
  ('MSC_0111', 'Otherwordly Leap', '2024', '—', NULL, '2', 'PHB2024', 'PHB 2024', NULL, 78.0::DOUBLE PRECISION),
  ('MSC_0112', 'Pact of the Blade', '2024', '—', NULL, 'Any', 'PHB2024', 'PHB 2024', 'Also supersedes Improved Pact Weapon from XGE 2014.', 79.0::DOUBLE PRECISION),
  ('MSC_0113', 'Pact of the Chain', '2024', '—', NULL, 'Any', 'PHB2024', 'PHB 2024', 'Pact of the Chain has the following additional Find Familiar options: Abyssal Chicken, Anvilwrought Raptor, Cranium Rat, Crawling Claw, Flying Monkey, Gazer, Imp, Pseudodragon, Quasit, Slime Familiar, Sprite, Tressym, Dust Mephit, Ice Mephit, Magma Mephit, Mud Mephit, Smoke Mephit, Steam Mephit', 80.0::DOUBLE PRECISION),
  ('MSC_0114', 'Pact of the Tome', '2024', '—', NULL, 'Any', 'PHB2024', 'PHB 2024', NULL, 81.0::DOUBLE PRECISION),
  ('MSC_0115', 'Repelling Blast', '2024', '—', 'Warlock cantrip that deals damage', '2', 'PHB2024', 'PHB 2024', NULL, 82.0::DOUBLE PRECISION),
  ('MSC_0116', 'Thirsting Blade', '2024', '—', 'Pact of the Blade (2024)', '5', 'PHB2024', 'PHB 2024', NULL, 83.0::DOUBLE PRECISION),
  ('MSC_0117', 'Visions of Distant Realms', '2024', '—', NULL, '9', 'PHB2024', 'PHB 2024', NULL, 84.0::DOUBLE PRECISION),
  ('MSC_0118', 'Whispers of the Grave', '2024', '—', NULL, '7', 'PHB2024', 'PHB 2024', NULL, 85.0::DOUBLE PRECISION),
  ('MSC_0119', 'Witch Sight', '2024', '—', NULL, '15', 'PHB2024', 'PHB 2024', NULL, 86.0::DOUBLE PRECISION)
) AS v(check_id, name, ruleset, pact_prereq, other_prereq, level_prereq, source, legacy_source, notes_advice, display_order)
WHERE e.name = v.name AND (e.source = v.source OR e.source = v.legacy_source);

-- Insert any missing Eldritch Invocations
INSERT INTO public.ac_eldritch_invocations (check_id, name, ruleset, pact_prereq, other_prereq, level_prereq, source, notes_advice, display_order)
SELECT v.check_id, v.name, v.ruleset, v.pact_prereq, v.other_prereq, v.level_prereq, v.source, v.notes_advice, v.display_order
FROM (VALUES
  ('MSC_0034', 'Agonising Blast', '2014', 'Any', 'Eldritch Blast', 'Any', 'PHB2014', NULL, 1.0::DOUBLE PRECISION),
  ('MSC_0035', 'Armor of Shadows', '2014', 'Any', NULL, 'Any', 'PHB2014', NULL, 2.0::DOUBLE PRECISION),
  ('MSC_0036', 'Ascendant Step', '2014', 'Any', NULL, '9', 'PHB2014', NULL, 3.0::DOUBLE PRECISION),
  ('MSC_0037', 'Aspect of the Moon', '2014', 'Tome', NULL, 'Any', 'XGE', NULL, 4.0::DOUBLE PRECISION),
  ('MSC_0038', 'Beast Speech', '2014', 'Any', NULL, 'Any', 'PHB2014', NULL, 5.0::DOUBLE PRECISION),
  ('MSC_0039', 'Beguiling Influence', '2014', 'Any', NULL, 'Any', 'PHB2014', NULL, 6.0::DOUBLE PRECISION),
  ('MSC_0040', 'Bewitching Whisper', '2014', 'Any', NULL, '7', 'PHB2014', 'You don''t expend a spell slot to cast the spell from this invocation.', 7.0::DOUBLE PRECISION),
  ('MSC_0041', 'Bond of the Talisman', '2014', 'Talisman', NULL, '12', 'TCE', NULL, 8.0::DOUBLE PRECISION),
  ('MSC_0042', 'Book of Ancient Secrets', '2014', 'Tome', NULL, 'Any', 'PHB2014', 'You can use the Book of Shadows as a spellbook, but it''s ever lost or destroyed, the replacement only contains the Pact of the Tome cantrips and the ritual spells it contained.', 9.0::DOUBLE PRECISION),
  ('MSC_0043', 'Chains of Carceri', '2014', 'Chain', NULL, '15', 'PHB2014', NULL, 10.0::DOUBLE PRECISION),
  ('MSC_0044', 'Cloak of Flies', '2014', 'Any', NULL, '5', 'XGE', NULL, 11.0::DOUBLE PRECISION),
  ('MSC_0045', 'Devil''s Sight', '2014', 'Any', NULL, 'Any', 'PHB2014', NULL, 12.0::DOUBLE PRECISION),
  ('MSC_0046', 'Dreadful Word', '2014', 'Any', NULL, '7', 'PHB2014', 'You don''t expend a spell slot to cast the spell from this invocation.', 13.0::DOUBLE PRECISION),
  ('MSC_0047', 'Eldritch Mind', '2014', 'Any', NULL, 'Any', 'TCE', NULL, 14.0::DOUBLE PRECISION),
  ('MSC_0048', 'Eldritch Sight', '2014', 'Any', NULL, 'Any', 'PHB2014', NULL, 15.0::DOUBLE PRECISION),
  ('MSC_0049', 'Eldritch Smite', '2014', 'Blade', NULL, '5', 'XGE', NULL, 16.0::DOUBLE PRECISION),
  ('MSC_0050', 'Eldritch Spear', '2014', 'Any', 'Eldritch Blast', 'Any', 'PHB2014', NULL, 17.0::DOUBLE PRECISION),
  ('MSC_0051', 'Eyes of the Rune Keeper', '2014', 'Any', NULL, 'Any', 'PHB2014', NULL, 18.0::DOUBLE PRECISION),
  ('MSC_0052', 'Far Scribe', '2014', 'Tome', NULL, '5', 'TCE', NULL, 19.0::DOUBLE PRECISION),
  ('MSC_0053', 'Feral Transformation', '2014', 'Any', NULL, '7', 'HWT', 'For 2024 games, the rules for the 2024 version of Polymorph are used: the form is also no longer maintained if you have no Temporary Hit Points remaining', 20.0::DOUBLE PRECISION),
  ('MSC_0054', 'Fiendish Vigor', '2014', 'Any', NULL, 'Any', 'PHB2014', NULL, 21.0::DOUBLE PRECISION),
  ('MSC_0055', 'Gaze of Two Minds', '2014', 'Any', NULL, 'Any', 'PHB2014', NULL, 22.0::DOUBLE PRECISION),
  ('MSC_0056', 'Ghostly Gaze', '2014', 'Any', NULL, '7', 'XGE', NULL, 23.0::DOUBLE PRECISION),
  ('MSC_0057', 'Gift of the Depths', '2014', 'Any', NULL, '5', 'XGE', NULL, 24.0::DOUBLE PRECISION),
  ('MSC_0058', 'Gift of the Ever-Living Ones', '2014', 'Chain', NULL, 'Any', 'XGE', NULL, 25.0::DOUBLE PRECISION),
  ('MSC_0059', 'Gift of the Protectors', '2014', 'Tome', NULL, '9', 'TCE', 'Only other creatures in the same adventure as the warlock can benefit from this invocation.', 26.0::DOUBLE PRECISION),
  ('MSC_0060', 'Grasp of Hadar', '2014', 'Any', 'Eldritch Blast', 'Any', 'XGE', NULL, 27.0::DOUBLE PRECISION),
  ('MSC_0061', 'Hexshredder', '2014', 'Pact of the Blade', NULL, 'Any', 'HWT', NULL, 28.0::DOUBLE PRECISION),
  ('MSC_0062', 'Hunter''s Grimoire', '2014', 'Pact of the Tome', NULL, 'Any', 'HWT', NULL, 29.0::DOUBLE PRECISION),
  ('MSC_0063', 'Improved Pact Weapon', '2014', 'Blade', NULL, 'Any', 'XGE', 'Can also be used with firearms', 30.0::DOUBLE PRECISION),
  ('MSC_0064', 'Investment of the Chain Master', '2014', 'Chain', NULL, 'Any', 'TCE', NULL, 31.0::DOUBLE PRECISION),
  ('MSC_0065', 'Lance of Lethargy', '2014', 'Any', 'Eldritch Blast', 'Any', 'XGE', NULL, 32.0::DOUBLE PRECISION),
  ('MSC_0066', 'Lifedrinker', '2014', 'Blade', NULL, '12', 'PHB2014', NULL, 33.0::DOUBLE PRECISION),
  ('MSC_0067', 'Maddening Hex', '2014', 'Any', 'Hex/Curse', '5', 'XGE', NULL, 34.0::DOUBLE PRECISION),
  ('MSC_0068', 'Mask of Many Faces', '2014', 'Any', NULL, 'Any', 'PHB2014', NULL, 35.0::DOUBLE PRECISION),
  ('MSC_0069', 'Master of Myriad Forms', '2014', 'Any', NULL, '15', 'PHB2014', NULL, 36.0::DOUBLE PRECISION),
  ('MSC_0070', 'Minions of Chaos', '2014', 'Any', NULL, '9', 'PHB2014', 'You don''t expend a spell slot to cast the spell from this invocation.', 37.0::DOUBLE PRECISION),
  ('MSC_0071', 'Mire the Mind', '2014', 'Any', NULL, '5', 'PHB2014', NULL, 38.0::DOUBLE PRECISION),
  ('MSC_0072', 'Misty Visions', '2014', 'Any', NULL, 'Any', 'PHB2014', NULL, 39.0::DOUBLE PRECISION),
  ('MSC_0073', 'One with Shadows', '2014', 'Any', NULL, '5', 'PHB2014', NULL, 40.0::DOUBLE PRECISION),
  ('MSC_0074', 'Otherwordly Leap', '2014', 'Any', NULL, '9', 'PHB2014', NULL, 41.0::DOUBLE PRECISION),
  ('MSC_0075', 'Primal Summoner', '2014', 'Pact of the Chain', NULL, 'Any', 'HWT', NULL, 42.0::DOUBLE PRECISION),
  ('MSC_0076', 'Protection of the Talisman', '2014', 'Talisman', NULL, '7', 'TCE', NULL, 43.0::DOUBLE PRECISION),
  ('MSC_0077', 'Rebuke of the Talisman', '2014', 'Talisman', NULL, 'Any', 'TCE', NULL, 44.0::DOUBLE PRECISION),
  ('MSC_0078', 'Relentless Hex', '2014', 'Any', 'Hex/Curse', '7', 'XGE', NULL, 45.0::DOUBLE PRECISION),
  ('MSC_0079', 'Repelling Blast', '2014', 'Any', 'Eldritch Blast', 'Any', 'PHB2014', NULL, 46.0::DOUBLE PRECISION),
  ('MSC_0080', 'Sculptor of Flesh', '2014', 'Any', NULL, '7', 'PHB2014', 'You don''t expend a spell slot to cast the spell from this invocation.', 47.0::DOUBLE PRECISION),
  ('MSC_0081', 'Shroud of Shadow', '2014', 'Any', NULL, '15', 'XGE', NULL, 48.0::DOUBLE PRECISION),
  ('MSC_0082', 'Signs of Ill Omen', '2014', 'Any', NULL, '5', 'PHB2014', 'You don''t expend a spell slot to cast the spell from this invocation.', 49.0::DOUBLE PRECISION),
  ('MSC_0083', 'Thief of Five Fates', '2014', 'Any', NULL, 'Any', 'PHB2014', 'You don''t expend a spell slot to cast the spell from this invocation.', 50.0::DOUBLE PRECISION),
  ('MSC_0084', 'Thirsting Blade', '2014', 'Blade', NULL, '5', 'PHB2014', NULL, 51.0::DOUBLE PRECISION),
  ('MSC_0085', 'Tomb of Levistus', '2014', 'Any', NULL, '5', 'XGE', NULL, 52.0::DOUBLE PRECISION),
  ('MSC_0086', 'Trickster''s Escape', '2014', 'Any', NULL, '7', 'XGE', NULL, 53.0::DOUBLE PRECISION),
  ('MSC_0087', 'Undying Servitude', '2014', 'Any', NULL, '5', 'TCE', NULL, 54.0::DOUBLE PRECISION),
  ('MSC_0088', 'Visions of Distant Realms', '2014', 'Any', NULL, '15', 'PHB2014', NULL, 55.0::DOUBLE PRECISION),
  ('MSC_0089', 'Voice of the Chain Master', '2014', 'Chain', NULL, 'Any', 'PHB2014', NULL, 56.0::DOUBLE PRECISION),
  ('MSC_0090', 'Whispers of the Grave', '2014', 'Any', NULL, '9', 'PHB2014', NULL, 57.0::DOUBLE PRECISION),
  ('MSC_0091', 'Witch Sight', '2014', 'Any', NULL, '15', 'PHB2014', NULL, 58.0::DOUBLE PRECISION),
  ('MSC_0092', 'Agonizing Blast', '2024', '—', 'Warlock cantrip that deals damage', '2', 'PHB2024', NULL, 59.0::DOUBLE PRECISION),
  ('MSC_0093', 'Armor of Shadows', '2024', '—', NULL, 'Any', 'PHB2024', NULL, 60.0::DOUBLE PRECISION),
  ('MSC_0094', 'Ascendant Step', '2024', '—', NULL, '5', 'PHB2024', NULL, 61.0::DOUBLE PRECISION),
  ('MSC_0095', 'Devil''s Sight', '2024', '—', NULL, '2', 'PHB2024', NULL, 62.0::DOUBLE PRECISION),
  ('MSC_0096', 'Devouring Blade', '2024', '—', 'Thirsting Blade (2024)', '12', 'PHB2024', NULL, 63.0::DOUBLE PRECISION),
  ('MSC_0097', 'Eldritch Mind', '2024', '—', NULL, 'Any', 'PHB2024', NULL, 64.0::DOUBLE PRECISION),
  ('MSC_0098', 'Eldritch Smite', '2024', '—', 'Pact of the Blade (2024)', '5', 'PHB2024', NULL, 65.0::DOUBLE PRECISION),
  ('MSC_0099', 'Eldritch Spear', '2024', '—', 'Warlock cantrip that deals damage', '2', 'PHB2024', NULL, 66.0::DOUBLE PRECISION),
  ('MSC_0100', 'Fiendish Vigor', '2024', '—', NULL, '2', 'PHB2024', NULL, 67.0::DOUBLE PRECISION),
  ('MSC_0101', 'Gaze of Two Minds', '2024', '—', NULL, '5', 'PHB2024', NULL, 68.0::DOUBLE PRECISION),
  ('MSC_0102', 'Gift of the Depths', '2024', '—', NULL, '5', 'PHB2024', NULL, 69.0::DOUBLE PRECISION),
  ('MSC_0103', 'Gift of the Protectors', '2024', '—', 'Pact of the Tome (2024)', '9', 'PHB2024', 'Only other creatures in the same adventure as the warlock can benefit from this invocation.', 70.0::DOUBLE PRECISION),
  ('MSC_0104', 'Investment of the Chain Master', '2024', '—', 'Pact of the Chain (2024)', '5', 'PHB2024', NULL, 71.0::DOUBLE PRECISION),
  ('MSC_0105', 'Lessons of the First Ones', '2024', '—', NULL, '2', 'PHB2024', NULL, 72.0::DOUBLE PRECISION),
  ('MSC_0106', 'Lifedrinker', '2024', '—', 'Pact of the Blade (2024)', '9', 'PHB2024', NULL, 73.0::DOUBLE PRECISION),
  ('MSC_0107', 'Mask of Many Faces', '2024', '—', NULL, '2', 'PHB2024', NULL, 74.0::DOUBLE PRECISION),
  ('MSC_0108', 'Master of Myriad Forms', '2024', '—', NULL, '5', 'PHB2024', NULL, 75.0::DOUBLE PRECISION),
  ('MSC_0109', 'Misty Visions', '2024', '—', NULL, '2', 'PHB2024', NULL, 76.0::DOUBLE PRECISION),
  ('MSC_0110', 'One with Shadows', '2024', '—', NULL, '5', 'PHB2024', NULL, 77.0::DOUBLE PRECISION),
  ('MSC_0111', 'Otherwordly Leap', '2024', '—', NULL, '2', 'PHB2024', NULL, 78.0::DOUBLE PRECISION),
  ('MSC_0112', 'Pact of the Blade', '2024', '—', NULL, 'Any', 'PHB2024', 'Also supersedes Improved Pact Weapon from XGE 2014.', 79.0::DOUBLE PRECISION),
  ('MSC_0113', 'Pact of the Chain', '2024', '—', NULL, 'Any', 'PHB2024', 'Pact of the Chain has the following additional Find Familiar options: Abyssal Chicken, Anvilwrought Raptor, Cranium Rat, Crawling Claw, Flying Monkey, Gazer, Imp, Pseudodragon, Quasit, Slime Familiar, Sprite, Tressym, Dust Mephit, Ice Mephit, Magma Mephit, Mud Mephit, Smoke Mephit, Steam Mephit', 80.0::DOUBLE PRECISION),
  ('MSC_0114', 'Pact of the Tome', '2024', '—', NULL, 'Any', 'PHB2024', NULL, 81.0::DOUBLE PRECISION),
  ('MSC_0115', 'Repelling Blast', '2024', '—', 'Warlock cantrip that deals damage', '2', 'PHB2024', NULL, 82.0::DOUBLE PRECISION),
  ('MSC_0116', 'Thirsting Blade', '2024', '—', 'Pact of the Blade (2024)', '5', 'PHB2024', NULL, 83.0::DOUBLE PRECISION),
  ('MSC_0117', 'Visions of Distant Realms', '2024', '—', NULL, '9', 'PHB2024', NULL, 84.0::DOUBLE PRECISION),
  ('MSC_0118', 'Whispers of the Grave', '2024', '—', NULL, '7', 'PHB2024', NULL, 85.0::DOUBLE PRECISION),
  ('MSC_0119', 'Witch Sight', '2024', '—', NULL, '15', 'PHB2024', NULL, 86.0::DOUBLE PRECISION)
) AS v(check_id, name, ruleset, pact_prereq, other_prereq, level_prereq, source, notes_advice, display_order)
WHERE NOT EXISTS (
    SELECT 1 FROM public.ac_eldritch_invocations e WHERE e.check_id = v.check_id
);

-- ------------------------------------------------------------------------------
-- 6. Constraints, Indexes & Referential Integrity
-- ------------------------------------------------------------------------------
-- Fighting Styles Constraints & Indexes
ALTER TABLE public.ac_fighting_styles ALTER COLUMN check_id SET NOT NULL;
DROP INDEX IF EXISTS public.idx_ac_fighting_styles_check_id;
CREATE UNIQUE INDEX idx_ac_fighting_styles_check_id ON public.ac_fighting_styles (check_id);

ALTER TABLE public.ac_fighting_styles ALTER COLUMN ruleset SET NOT NULL;
DROP INDEX IF EXISTS public.idx_ac_fighting_styles_name_ruleset;
CREATE UNIQUE INDEX idx_ac_fighting_styles_name_ruleset ON public.ac_fighting_styles (name, ruleset);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ac_fighting_styles_source_fkey' AND table_name = 'ac_fighting_styles'
    ) THEN
        ALTER TABLE public.ac_fighting_styles 
            ADD CONSTRAINT ac_fighting_styles_source_fkey FOREIGN KEY (source) REFERENCES public.ac_sources(source_key);
    END IF;
END $$;

-- Artificer Infusions Constraints & Indexes
ALTER TABLE public.ac_artificer_infusions ALTER COLUMN check_id SET NOT NULL;
DROP INDEX IF EXISTS public.idx_ac_artificer_infusions_check_id;
CREATE UNIQUE INDEX idx_ac_artificer_infusions_check_id ON public.ac_artificer_infusions (check_id);

ALTER TABLE public.ac_artificer_infusions ALTER COLUMN ruleset SET NOT NULL;
DROP INDEX IF EXISTS public.idx_ac_artificer_infusions_name_ruleset;
CREATE UNIQUE INDEX idx_ac_artificer_infusions_name_ruleset ON public.ac_artificer_infusions (name, ruleset);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ac_artificer_infusions_source_fkey' AND table_name = 'ac_artificer_infusions'
    ) THEN
        ALTER TABLE public.ac_artificer_infusions 
            ADD CONSTRAINT ac_artificer_infusions_source_fkey FOREIGN KEY (source) REFERENCES public.ac_sources(source_key);
    END IF;
END $$;

-- Eldritch Invocations Constraints & Indexes
ALTER TABLE public.ac_eldritch_invocations ALTER COLUMN check_id SET NOT NULL;
DROP INDEX IF EXISTS public.idx_ac_eldritch_invocations_check_id;
CREATE UNIQUE INDEX idx_ac_eldritch_invocations_check_id ON public.ac_eldritch_invocations (check_id);

ALTER TABLE public.ac_eldritch_invocations ALTER COLUMN ruleset SET NOT NULL;
DROP INDEX IF EXISTS public.idx_ac_eldritch_invocations_name_ruleset;
CREATE UNIQUE INDEX idx_ac_eldritch_invocations_name_ruleset ON public.ac_eldritch_invocations (name, ruleset);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ac_eldritch_invocations_source_fkey' AND table_name = 'ac_eldritch_invocations'
    ) THEN
        ALTER TABLE public.ac_eldritch_invocations 
            ADD CONSTRAINT ac_eldritch_invocations_source_fkey FOREIGN KEY (source) REFERENCES public.ac_sources(source_key);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 7. Updated_At Triggers
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS set_ac_fighting_styles_updated_at ON public.ac_fighting_styles;
CREATE TRIGGER set_ac_fighting_styles_updated_at
    BEFORE UPDATE ON public.ac_fighting_styles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_ac_artificer_infusions_updated_at ON public.ac_artificer_infusions;
CREATE TRIGGER set_ac_artificer_infusions_updated_at
    BEFORE UPDATE ON public.ac_artificer_infusions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_ac_eldritch_invocations_updated_at ON public.ac_eldritch_invocations;
CREATE TRIGGER set_ac_eldritch_invocations_updated_at
    BEFORE UPDATE ON public.ac_eldritch_invocations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 8. Row Level Security (RLS) Policies
-- ------------------------------------------------------------------------------
-- Fighting Styles RLS
ALTER TABLE public.ac_fighting_styles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to ac_fighting_styles" ON public.ac_fighting_styles;
CREATE POLICY "Allow public read access to ac_fighting_styles"
ON public.ac_fighting_styles FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow service_role to manage ac_fighting_styles" ON public.ac_fighting_styles;
CREATE POLICY "Allow service_role to manage ac_fighting_styles"
ON public.ac_fighting_styles FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins and Engineers can manage ac_fighting_styles" ON public.ac_fighting_styles;
CREATE POLICY "Admins and Engineers can manage ac_fighting_styles"
ON public.ac_fighting_styles FOR ALL
TO authenticated
USING (
  ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
  OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
)
WITH CHECK (
  ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
  OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
);

-- Artificer Infusions RLS
ALTER TABLE public.ac_artificer_infusions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to ac_artificer_infusions" ON public.ac_artificer_infusions;
CREATE POLICY "Allow public read access to ac_artificer_infusions"
ON public.ac_artificer_infusions FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow service_role to manage ac_artificer_infusions" ON public.ac_artificer_infusions;
CREATE POLICY "Allow service_role to manage ac_artificer_infusions"
ON public.ac_artificer_infusions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins and Engineers can manage ac_artificer_infusions" ON public.ac_artificer_infusions;
CREATE POLICY "Admins and Engineers can manage ac_artificer_infusions"
ON public.ac_artificer_infusions FOR ALL
TO authenticated
USING (
  ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
  OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
)
WITH CHECK (
  ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
  OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
);

-- Eldritch Invocations RLS
ALTER TABLE public.ac_eldritch_invocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to ac_eldritch_invocations" ON public.ac_eldritch_invocations;
CREATE POLICY "Allow public read access to ac_eldritch_invocations"
ON public.ac_eldritch_invocations FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow service_role to manage ac_eldritch_invocations" ON public.ac_eldritch_invocations;
CREATE POLICY "Allow service_role to manage ac_eldritch_invocations"
ON public.ac_eldritch_invocations FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins and Engineers can manage ac_eldritch_invocations" ON public.ac_eldritch_invocations;
CREATE POLICY "Admins and Engineers can manage ac_eldritch_invocations"
ON public.ac_eldritch_invocations FOR ALL
TO authenticated
USING (
  ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
  OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
)
WITH CHECK (
  ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
  OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
);
