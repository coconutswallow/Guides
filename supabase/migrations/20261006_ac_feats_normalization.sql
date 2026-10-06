-- ==============================================================================
-- Migration: AC Feats Normalization & Staff Admin RLS
-- Date: 2026-10-06
-- Target Database: Supabase PostgreSQL (public schema)
-- Description:
--   1. Creates ac_feats_legacy_backup snapshot if not already present.
--   2. Evolves public.ac_feats table schema (adds check_id, ruleset; alters display_order).
--   3. Upserts all 346 feats from Allowed_Content_20261004.xlsx (FEA_0001 to FEA_0346).
--   4. Enforces check_id NOT NULL & UNIQUE and (name, ruleset) UNIQUE constraints.
--   5. Configures updated_at trigger and Staff Admin / Engineer RLS policies.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Archive Snapshot of Legacy ac_feats
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ac_feats')
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ac_feats_legacy_backup') THEN
        CREATE TABLE public.ac_feats_legacy_backup AS SELECT * FROM public.ac_feats;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. Table Definition & Schema Evolution
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ac_feats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    check_id TEXT,
    name TEXT NOT NULL,
    ruleset TEXT NOT NULL DEFAULT '2014',
    category TEXT NOT NULL DEFAULT 'General',
    prerequisite TEXT,
    ability_increase TEXT,
    source TEXT NOT NULL,
    notes_advice TEXT,
    display_order DOUBLE PRECISION DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Evolve existing columns if table already existed
ALTER TABLE public.ac_feats ADD COLUMN IF NOT EXISTS check_id TEXT;
ALTER TABLE public.ac_feats ADD COLUMN IF NOT EXISTS ruleset TEXT;
ALTER TABLE public.ac_feats ALTER COLUMN display_order TYPE DOUBLE PRECISION USING display_order::DOUBLE PRECISION;

-- ------------------------------------------------------------------------------
-- 3. Data Migration: Upsert all 346 Feats from Allowed_Content_20261004.xlsx
-- ------------------------------------------------------------------------------
-- Match and backfill check_id on existing rows using name and legacy source printings
UPDATE public.ac_feats f
SET check_id = v.check_id,
    ruleset = v.ruleset,
    category = v.category,
    prerequisite = v.prereq,
    ability_increase = v.ability_increase,
    source = v.source,
    notes_advice = v.notes,
    display_order = v.display_order
FROM (VALUES

  ('FEA_0001', 'Aberrant Dragonmark', '2014', 'General', 'Not being a dragonmarked race', 'CON +1', 'ERLW', '- The Greater Aberrant Powers option is not used
- You can additionally cast the 1st-level spell with spell slots
- Details on "spellmarked" as specifically originating from Toril can be found in Hawthorne Arcana', 1.0::DOUBLE PRECISION),
  ('FEA_0002', 'Acrobat', '2014', 'General', 'None', 'DEX +1', 'UAFFS', NULL, 2.0::DOUBLE PRECISION),
  ('FEA_0003', 'Actor', '2014', 'General', 'None', 'CHA +1', 'PHB2014', NULL, 3.0::DOUBLE PRECISION),
  ('FEA_0004', 'Adept of the Black Robes', '2014', 'General', '4th level, Initiate of high sorcery (nuitari) feat', 'None', 'DSotDQ', NULL, 4.0::DOUBLE PRECISION),
  ('FEA_0005', 'Adept of the Red Robes', '2014', 'General', '4th level, Initiate of high sorcery (lunitari) feat', 'None', 'DSotDQ', NULL, 5.0::DOUBLE PRECISION),
  ('FEA_0006', 'Adept of the White Robes', '2014', 'General', '4th level, Initiate of high sorcery (solinari) feat', 'None', 'DSotDQ', NULL, 6.0::DOUBLE PRECISION),
  ('FEA_0007', 'Aerial Expert', '2014', 'General', 'Glide trait', 'None', 'HWCS', NULL, 7.0::DOUBLE PRECISION),
  ('FEA_0008', 'Agent of Order', '2014', 'General', '4th level, scion of the outer planes (lawful outer plane) feat', 'Any +1', 'SATO', NULL, 8.0::DOUBLE PRECISION),
  ('FEA_0009', 'Alert', '2014', 'General', 'None', 'None', 'PHB2014', NULL, 9.0::DOUBLE PRECISION),
  ('FEA_0010', 'Alchemist', '2014', 'General', 'None', 'INT +1', 'UAFT', NULL, 10.0::DOUBLE PRECISION),
  ('FEA_0011', 'Animal Handler', '2014', 'General', 'None', 'WIS +1', 'UAFFS', NULL, 11.0::DOUBLE PRECISION),
  ('FEA_0012', 'Arcanist', '2014', 'General', 'None', 'INT +1', 'UAFFS', '- Your spellcasting ability for these spells is INT
- You can additionally cast Detect Magic with spell slots', 12.0::DOUBLE PRECISION),
  ('FEA_0013', 'Artificer Initiate', '2014', 'Origin', 'None', 'None', 'TCE', 'Can be taken as an Origin feat by 2024 characters', 13.0::DOUBLE PRECISION),
  ('FEA_0014', 'Athlete', '2014', 'General', 'None', 'STR or DEX +1', 'PHB2014', NULL, 14.0::DOUBLE PRECISION),
  ('FEA_0015', 'Bandit Cunning', '2014', 'General', 'None', 'None', 'HWCS', NULL, 15.0::DOUBLE PRECISION),
  ('FEA_0016', 'Baleful Scion', '2014', 'General', '4th level, scion of the outer planes (evil outer plane) feat', 'Any +1', 'SATO', NULL, 16.0::DOUBLE PRECISION),
  ('FEA_0017', 'Blade Mastery', '2014', 'General', 'None', 'None', 'UAFT', 'Also benefits Double-Bladed Scimitars', 17.0::DOUBLE PRECISION),
  ('FEA_0018', 'Bountiful Luck', '2014', 'General', 'Halfling', 'None', 'XGE', NULL, 18.0::DOUBLE PRECISION),
  ('FEA_0019', 'Brawny', '2014', 'General', 'None', 'STR +1', 'UAFFS', NULL, 19.0::DOUBLE PRECISION),
  ('FEA_0020', 'Burglar', '2014', 'General', 'None', 'DEX +1', 'UAFT', NULL, 20.0::DOUBLE PRECISION),
  ('FEA_0021', 'Cartomancer', '2014', 'General', '4th level, Spellcasting or Pact Magic feature', 'None', 'BMT', '- Having either Spellcasting or Pact Magic serves as this feat''s prerequisite.
- You imbue spells as a single classed member of a class e.g. a cleric 1/wizard 4 can''t imbue 3rd-level cleric or wizard spells.
- Casting the imbued spell as a bonus action uses no components but does use a spell slot and obeys all other general spellcasting rules.', 21.0::DOUBLE PRECISION),
  ('FEA_0022', 'Charger', '2014', 'General', 'None', 'None', 'PHB2014', NULL, 22.0::DOUBLE PRECISION),
  ('FEA_0023', 'Chef', '2014', 'General', 'None', 'CON or WIS +1', 'TCE', 'You can use the Prepare Meals option for cook''s utensils (XGE) as part of the same short rest to make the special food.', 23.0::DOUBLE PRECISION),
  ('FEA_0024', 'Cohort of Chaos', '2014', 'General', '4th level, scion of the outer planes (chaotic outer plane) feat', 'Any +1', 'SATO', NULL, 24.0::DOUBLE PRECISION),
  ('FEA_0025', 'Crossbow Expert', '2014', 'General', 'None', 'None', 'PHB2014', NULL, 25.0::DOUBLE PRECISION),
  ('FEA_0026', 'Crusher', '2014', 'General', 'None', 'STR or CON+1', 'TCE', NULL, 26.0::DOUBLE PRECISION),
  ('FEA_0027', 'Defensive Duelist', '2014', 'General', 'DEX 13+', 'None', 'PHB2014', NULL, 27.0::DOUBLE PRECISION),
  ('FEA_0028', 'Diplomat', '2014', 'General', 'None', 'CHA +1', 'UAFFS', 'If you or your companions harm the charmed target, they''re no longer charmed and can''t be charmed via Diplomat again for 1 hour.', 28.0::DOUBLE PRECISION),
  ('FEA_0029', 'Divinely Favored', '2014', 'General', '4th-level', 'None', 'DSotDQ', NULL, 29.0::DOUBLE PRECISION),
  ('FEA_0030', 'Dragon Fear', '2014', 'General', 'Dragonborn', 'STR, CON or CHA +1', 'XGE', NULL, 30.0::DOUBLE PRECISION),
  ('FEA_0031', 'Dragon Hide', '2014', 'General', 'Dragonborn', 'STR, CON or CHA +1', 'XGE', NULL, 31.0::DOUBLE PRECISION),
  ('FEA_0032', 'Drow High Magic', '2014', 'General', 'Elf (Drow)', 'None', 'XGE', '- Your spellcasting ability for these spells is your choice of INT, WIS, or CHA
- You can additionally cast the listed spells with spell slots', 32.0::DOUBLE PRECISION),
  ('FEA_0033', 'Dual Wielder', '2014', 'General', 'None', 'None', 'PHB2014', NULL, 33.0::DOUBLE PRECISION),
  ('FEA_0034', 'Dungeon Delver', '2014', 'Origin', 'None', 'None', 'PHB2014', 'Can be taken as an Origin feat by 2024 characters', 34.0::DOUBLE PRECISION),
  ('FEA_0035', 'Durable', '2014', 'General', 'None', 'CON +1', 'PHB2014', NULL, 35.0::DOUBLE PRECISION),
  ('FEA_0036', 'Dwarf Fortitude', '2014', 'General', 'Dwarf', 'CON +1', 'XGE', NULL, 36.0::DOUBLE PRECISION),
  ('FEA_0037', 'Eldritch Adept', '2014', 'General', 'Spellcasting or Pact Magic feature', 'None', 'TCE', 'The spell save DC for spells you gain this way is the same spell save DC used to qualify for this feat (Spellcasting or Pact Magic).', 37.0::DOUBLE PRECISION),
  ('FEA_0038', 'Elemental Adept', '2014', 'General', 'Spellcasting feature', 'None', 'PHB2014', NULL, 38.0::DOUBLE PRECISION),
  ('FEA_0039', 'Elven Accuracy', '2014', 'General', 'Elf/Half Elf', 'DEX, INT, WIS or CHA +1', 'XGE', NULL, 39.0::DOUBLE PRECISION),
  ('FEA_0040', 'Ember of the Fire Giant', '2014', 'General', '4th level, strike of the giants (fire strike) feat', 'STR, CON, or WIS +1', 'BGG', NULL, 40.0::DOUBLE PRECISION),
  ('FEA_0041', 'Empathic', '2014', 'General', 'None', 'WIS +1', 'UAFFS', NULL, 41.0::DOUBLE PRECISION),
  ('FEA_0042', 'Fade Away', '2014', 'General', 'Gnome', 'DEX or INT +1', 'XGE', NULL, 42.0::DOUBLE PRECISION),
  ('FEA_0043', 'Fell Handed', '2014', 'General', 'None', 'None', 'UAFT', NULL, 43.0::DOUBLE PRECISION),
  ('FEA_0044', 'Flail Mastery', '2014', 'General', 'None', 'None', 'UAFT', NULL, 44.0::DOUBLE PRECISION),
  ('FEA_0045', 'Fey Teleportation', '2014', 'General', 'Elf (High)', 'INT or CHA +1', 'XGE', '- Your spellcasting ability for these spells is your choice of INT, WIS, or CHA
- You can additionally cast Misty Step with spell slots', 45.0::DOUBLE PRECISION),
  ('FEA_0046', 'Fey Touched', '2014', 'General', 'None', 'INT, WIS, or CHA +1', 'TCE', NULL, 46.0::DOUBLE PRECISION),
  ('FEA_0047', 'Field Medic', '2014', 'General', 'None', 'None', 'HWT', '- Your spellcasting ability for these spells is your choice of INT, WIS, or CHA
- You can additionally cast Cure Wounds with spell slots', 47.0::DOUBLE PRECISION),
  ('FEA_0048', 'Fighting Initiate', '2014', 'Origin', 'Proficiency with a martial weapon', 'None', 'TCE', 'Can be used by 2024 characters to acquire a Fighting Style feat.', 48.0::DOUBLE PRECISION),
  ('FEA_0049', 'Flames of Phlegethos', '2014', 'General', 'Tiefling', 'INT or CHA +1', 'XGE', NULL, 49.0::DOUBLE PRECISION),
  ('FEA_0050', 'Flamewoken', '2014', 'General', 'None', 'None', 'HWT', 'Your spellcasting ability for Produce Flame is your choice of INT, WIS, or CHA', 50.0::DOUBLE PRECISION),
  ('FEA_0051', 'Fury of the Frost Giant', '2014', 'General', '4th level, strike of the giants (frost strike) feat', 'STR, CON, or WIS +1', 'BGG', NULL, 51.0::DOUBLE PRECISION),
  ('FEA_0052', 'Gift of the Chromatic Dragon', '2014', 'General', 'None', 'None', 'FTD', NULL, 52.0::DOUBLE PRECISION),
  ('FEA_0053', 'Gift of the Gem Dragon', '2014', 'General', 'None', 'INT, WIS, or CHA +1', 'FTD', NULL, 53.0::DOUBLE PRECISION),
  ('FEA_0054', 'Gift of the Metallic Dragon', '2014', 'General', 'None', 'None', 'FTD', NULL, 54.0::DOUBLE PRECISION),
  ('FEA_0055', 'Gourmand', '2014', 'General', 'None', 'CON +1', 'UAFT', NULL, 55.0::DOUBLE PRECISION),
  ('FEA_0056', 'Grappler', '2014', 'General', 'STR +13', 'None', 'PHB2014', NULL, 56.0::DOUBLE PRECISION),
  ('FEA_0057', 'Great Weapon Master', '2014', 'General', 'None', 'None', 'PHB2014', NULL, 57.0::DOUBLE PRECISION),
  ('FEA_0058', 'Guile of the Cloud Giant', '2014', 'General', '4th level, strike of the giants (cloud strike) feat', 'STR, CON, or CHA +1', 'BGG', NULL, 58.0::DOUBLE PRECISION),
  ('FEA_0059', 'Gunner', '2014', 'General', 'None', 'DEX +1', 'TCE', NULL, 59.0::DOUBLE PRECISION),
  ('FEA_0060', 'Healer', '2014', 'General', 'None', 'None', 'PHB2014', NULL, 60.0::DOUBLE PRECISION),
  ('FEA_0061', 'Heavily Armored', '2014', 'General', 'M. armor proficiency', 'STR +1', 'PHB2014', NULL, 61.0::DOUBLE PRECISION),
  ('FEA_0062', 'Heavy Armor Master', '2014', 'General', 'H. armor proficiency', 'STR +1', 'PHB2014', NULL, 62.0::DOUBLE PRECISION),
  ('FEA_0063', 'Heavy Glider', '2014', 'General', 'Glide trait', 'None', 'HWCS', NULL, 63.0::DOUBLE PRECISION),
  ('FEA_0064', 'Historian', '2014', 'General', 'None', 'INT +1', 'UAFFS', NULL, 64.0::DOUBLE PRECISION),
  ('FEA_0065', 'Infernal Constitution', '2014', 'General', 'Tiefling', 'CON +1', 'XGE', NULL, 65.0::DOUBLE PRECISION),
  ('FEA_0066', 'Initiate of High Sorcery', '2014', 'Origin', 'Sorcerer, Wizard, or Mage of High Sorcery', 'None', 'DSotDQ', 'Can be taken as an Origin feat by 2024 characters', 66.0::DOUBLE PRECISION),
  ('FEA_0067', 'Inspiring Leader', '2014', 'General', 'CHA 13+', 'None', 'PHB2014', NULL, 67.0::DOUBLE PRECISION),
  ('FEA_0068', 'Investigator', '2014', 'General', 'None', 'INT +1', 'UAFFS', NULL, 68.0::DOUBLE PRECISION),
  ('FEA_0069', 'Keen Mind', '2014', 'General', 'None', 'INT +1', 'PHB2014', NULL, 69.0::DOUBLE PRECISION),
  ('FEA_0070', 'Keeness of the Stone Giant', '2014', 'General', '4th level, strike of the giants (stone strike) feat', 'STR, CON, or WIS +1', 'BGG', NULL, 70.0::DOUBLE PRECISION),
  ('FEA_0071', 'Knight of the Crown', '2014', 'General', '4th level, Squire of solamnia feat', 'STR, DEX, or CON +1', 'DSotDQ', NULL, 71.0::DOUBLE PRECISION),
  ('FEA_0072', 'Knight of the Rose', '2014', 'General', '4th level, Squire of solamnia feat', 'CON, WIS, or CHA +1', 'DSotDQ', NULL, 72.0::DOUBLE PRECISION),
  ('FEA_0073', 'Knight of the Sword', '2014', 'General', '4th level, Squire of solamnia feat', 'INT, WIS, or CHA +1', 'DSotDQ', NULL, 73.0::DOUBLE PRECISION),
  ('FEA_0074', 'Lightly Armored', '2014', 'General', 'None', 'STR or DEX +1', 'PHB2014', NULL, 74.0::DOUBLE PRECISION),
  ('FEA_0075', 'Linguist', '2014', 'General', 'None', 'INT +1', 'PHB2014', 'Can''t be used to learn Class Languages such as Druidic or Thieves'' Cant', 75.0::DOUBLE PRECISION),
  ('FEA_0076', 'Lucky', '2014', 'General', 'None', 'None', 'PHB2014', NULL, 76.0::DOUBLE PRECISION),
  ('FEA_0077', 'Mage Slayer', '2014', 'General', 'None', 'None', 'PHB2014', 'The first bullet point is replaced with the following: When you see a creature within 5 feet of you casting a spell with verbal, somatic, or material components, you can use your reaction to make a melee weapon attack against that creature. On a hit, the creature must make a Constitution saving throw, with the DC equal to 10 or half the damage taken, whichever number is higher. On a failed save, the creature''s spell fails and has no effect.', 77.0::DOUBLE PRECISION),
  ('FEA_0078', 'Magic Initiate', '2014', 'General', 'None', 'None', 'PHB2014', '- Your spellcasting ability for these spells is your choice of INT, WIS, or CHA
- You can additionally cast the 1st-level spell with spell slots', 78.0::DOUBLE PRECISION),
  ('FEA_0079', 'Martial Adept', '2014', 'Origin', 'None', 'None', 'PHB2014', 'Can be taken as an Origin feat by 2024 characters', 79.0::DOUBLE PRECISION),
  ('FEA_0080', 'Master of Disguise', '2014', 'General', 'None', 'CHA +1', 'UAFT', NULL, 80.0::DOUBLE PRECISION),
  ('FEA_0081', 'Medic', '2014', 'General', 'None', 'WIS +1', 'UAFFS', NULL, 81.0::DOUBLE PRECISION),
  ('FEA_0082', 'Medium Armor Master', '2014', 'General', 'M. armor proficiency', 'None', 'PHB2014', NULL, 82.0::DOUBLE PRECISION),
  ('FEA_0083', 'Menacing', '2014', 'General', 'None', 'CHA +1', 'UAFFS', NULL, 83.0::DOUBLE PRECISION),
  ('FEA_0084', 'Metamagic Adept', '2014', 'General', 'Spellcasting or Pact Magic', 'None', 'TCE', NULL, 84.0::DOUBLE PRECISION),
  ('FEA_0085', 'Mobile', '2014', 'General', 'None', 'None', 'PHB2014', NULL, 85.0::DOUBLE PRECISION),
  ('FEA_0086', 'Moderately Armored', '2014', 'General', 'L. armor proficiency', 'STR or DEX +1', 'PHB2014', NULL, 86.0::DOUBLE PRECISION),
  ('FEA_0087', 'Mounted Combatant', '2014', 'General', 'None', 'None', 'PHB2014', NULL, 87.0::DOUBLE PRECISION),
  ('FEA_0088', 'Naturalist', '2014', 'General', 'None', 'INT +1', 'UAFFS', '- Your spellcasting ability for these spells is INT
- You can additionally cast Detect Poison and Disease with spell slots', 88.0::DOUBLE PRECISION),
  ('FEA_0089', 'Observant', '2014', 'General', 'None', 'INT or WIS +1', 'PHB2014', NULL, 89.0::DOUBLE PRECISION),
  ('FEA_0090', 'Orcish Fury', '2014', 'General', 'Half-Orc', 'STR or CON +1', 'XGE', NULL, 90.0::DOUBLE PRECISION),
  ('FEA_0091', 'Opportunistic Thief', '2014', 'General', 'None', 'DEX +1', 'HWCS', NULL, 91.0::DOUBLE PRECISION),
  ('FEA_0092', 'Outlands Envoy', '2014', 'General', '4th level, scion of the outer planes (the outlands) feat', 'Any +1', 'SATO', NULL, 92.0::DOUBLE PRECISION),
  ('FEA_0093', 'Perceptive', '2014', 'General', 'None', 'WIS +1', 'UAFFS', NULL, 93.0::DOUBLE PRECISION),
  ('FEA_0094', 'Perfect Landing', '2014', 'General', 'None', 'DEX +1', 'HWCS', NULL, 94.0::DOUBLE PRECISION),
  ('FEA_0095', 'Performer', '2014', 'General', 'None', 'CHA +1', 'UAFFS', NULL, 95.0::DOUBLE PRECISION),
  ('FEA_0096', 'Piercer', '2014', 'General', 'None', 'STR or DEX +1', 'TCE', NULL, 96.0::DOUBLE PRECISION),
  ('FEA_0097', 'Planar Wanderer', '2014', 'General', '4th level, scion of the outer planes feat', 'None', 'SATO', NULL, 97.0::DOUBLE PRECISION),
  ('FEA_0098', 'Plantmender', '2014', 'General', 'None', 'None', 'HWT', '- Your spellcasting ability for these spells is your choice of INT, WIS, or CHA
- You can additionally cast Barkskin or Spike Growth with spell slots', 98.0::DOUBLE PRECISION),
  ('FEA_0099', 'Poisoner', '2014', 'General', 'None', 'None', 'TCE', NULL, 99.0::DOUBLE PRECISION),
  ('FEA_0100', 'Polearm Master', '2014', 'General', 'None', 'None', 'PHB2014', 'A trident can also be used with both options of this feat.', 100.0::DOUBLE PRECISION),
  ('FEA_0101', 'Prodigy', '2014', 'General', 'Half-Elf/Half-Orc/Human', 'None', 'XGE', 'Can''t be used to learn Class Languages such as Druidic or Thieves'' Cant', 101.0::DOUBLE PRECISION),
  ('FEA_0102', 'Quick-Fingered', '2014', 'General', 'None', 'DEX +1', 'UAFFS', NULL, 102.0::DOUBLE PRECISION),
  ('FEA_0103', 'Resilient', '2014', 'General', 'None', 'One +1 of your choice', 'PHB2014', NULL, 103.0::DOUBLE PRECISION),
  ('FEA_0104', 'Revenant Blade', '2014', 'General', 'Double-bladed scimitar proficiency', 'STR or DEX +1', 'ERLW', 'Uses the mechanics of the Revenant Blade feat from ERLW, but the prequisite is changed as listed.', 104.0::DOUBLE PRECISION),
  ('FEA_0105', 'Righetous Heritor', '2014', 'General', '4th level, scion of the outer planes (good outer plane) feat', 'Any +1', 'SATO', NULL, 105.0::DOUBLE PRECISION),
  ('FEA_0106', 'Ritual Caster', '2014', 'General', 'INT/WIS 13+', 'None', 'PHB2014', NULL, 106.0::DOUBLE PRECISION),
  ('FEA_0107', 'Rune Shaper', '2014', 'Origin', 'Spellcasting or Pact Magic Feature', 'None', 'BGG', '- Having either Spellcasting or Pact Magic serves as this feat''s prerequisite.
- Can be taken as an Origin feat by 2024 characters', 107.0::DOUBLE PRECISION),
  ('FEA_0108', 'Savage Attacker', '2014', 'General', 'None', 'None', 'PHB2014', NULL, 108.0::DOUBLE PRECISION),
  ('FEA_0109', 'Scion of the Outer Planes', '2014', 'Origin', 'None', 'None', 'SATO', 'Can be taken as an Origin feat by 2024 characters', 109.0::DOUBLE PRECISION),
  ('FEA_0110', 'Second Chance', '2014', 'General', 'Halfling', 'DEX, CON or CHA +1', 'XGE', NULL, 110.0::DOUBLE PRECISION),
  ('FEA_0111', 'Sentinel', '2014', 'General', 'None', 'None', 'PHB2014', NULL, 111.0::DOUBLE PRECISION),
  ('FEA_0112', 'Shadow Touched', '2014', 'General', 'None', 'INT, WIS, or CHA +1', 'TCE', NULL, 112.0::DOUBLE PRECISION),
  ('FEA_0113', 'Sharpshooter', '2014', 'General', 'None', 'None', 'PHB2014', NULL, 113.0::DOUBLE PRECISION),
  ('FEA_0114', 'Shield Master', '2014', 'General', 'None', 'None', 'PHB2014', 'You can take the bonus action to shove before you take the Attack action.', 114.0::DOUBLE PRECISION),
  ('FEA_0115', 'Silver-Tongued', '2014', 'General', 'None', 'CHA +1', 'UAFFS', NULL, 115.0::DOUBLE PRECISION),
  ('FEA_0116', 'Skilled', '2014', 'General', 'None', 'None', 'PHB2014', NULL, 116.0::DOUBLE PRECISION),
  ('FEA_0117', 'Skill Expert', '2014', 'General', 'None', 'Any +1', 'TCE', NULL, 117.0::DOUBLE PRECISION),
  ('FEA_0118', 'Skulker', '2014', 'General', 'DEX 13+', 'None', 'PHB2014', NULL, 118.0::DOUBLE PRECISION),
  ('FEA_0119', 'Slasher', '2014', 'General', 'None', 'STR or DEX +1', 'TCE', NULL, 119.0::DOUBLE PRECISION),
  ('FEA_0120', 'Soul of the Storm Giant', '2014', 'General', '4th level, strike of the giants (storm strike) feat', 'STR, WIS, or CHA +1', 'BGG', NULL, 120.0::DOUBLE PRECISION),
  ('FEA_0121', 'Spear Mastery', '2014', 'General', 'None', 'None', 'UAFT', 'You can also use a trident with each of this feat''s options.', 121.0::DOUBLE PRECISION),
  ('FEA_0122', 'Speech of the Ancient Beasts', '2014', 'General', 'None', 'CHA +1', 'HWCS', NULL, 122.0::DOUBLE PRECISION),
  ('FEA_0123', 'Spell Sniper', '2014', 'General', 'Spellcasting', 'None', 'PHB2014', 'Your spellcasting ability for these spells is your choice of INT, WIS, or CHA', 123.0::DOUBLE PRECISION),
  ('FEA_0124', 'Squat Nimbleness', '2014', 'General', 'Dwarf/Small race', 'STR or DEX +1', 'XGE', NULL, 124.0::DOUBLE PRECISION),
  ('FEA_0125', 'Squire of Solamnia', '2014', 'Origin', 'Fighter, Paladin, or Knight of Solamnia', 'None', 'DSotDQ', 'Can be taken as an Origin feat by 2024 characters', 125.0::DOUBLE PRECISION),
  ('FEA_0126', 'Stealthy', '2014', 'General', 'None', 'DEX +1', 'UAFFS', NULL, 126.0::DOUBLE PRECISION),
  ('FEA_0127', 'Strike of the Giants', '2014', 'Origin', 'Proficiency with a Martial Weapon or Giant Foundling', 'None', 'BGG', '- Can be taken as an Origin feat by 2024 characters
- Proficiency with at least one martial weapon satsifies this feat''s prerequisite', 127.0::DOUBLE PRECISION),
  ('FEA_0128', 'Strixhaven Initiate', '2014', 'Origin', 'None', 'None', 'SCC', 'Can be taken as an Origin feat by 2024 characters', 128.0::DOUBLE PRECISION),
  ('FEA_0129', 'Strixhaven Mascot', '2014', 'General', '4th-level, Strixhaven Initiate feat', 'None', 'SCC', NULL, 129.0::DOUBLE PRECISION),
  ('FEA_0130', 'Survivalist', '2014', 'General', 'None', 'WIS +1', 'UAFFS', '- Your spellcasting ability for these spells is WIS
- You can additionally cast Alarm with spell slots', 130.0::DOUBLE PRECISION),
  ('FEA_0131', 'Svirfeblin Magic', '2014', 'General', 'Gnome (Deep)', 'None', 'MTF', '- Your spellcasting ability for these spells is your choice of INT, WIS, or CHA
- You can additionally cast the listed spells with spell slots', 131.0::DOUBLE PRECISION),
  ('FEA_0132', 'Tavern Brawler', '2014', 'General', 'None', 'STR or CON +1', 'PHB2014', NULL, 132.0::DOUBLE PRECISION),
  ('FEA_0133', 'Telekinetic', '2014', 'General', 'None', 'INT, WIS, or CHA +1', 'TCE', 'The distance before disappearing for the mage hand created by this feat also increases by 30 feet (to 60 feet).', 133.0::DOUBLE PRECISION),
  ('FEA_0134', 'Telepathic', '2014', 'General', 'None', 'INT, WIS, or CHA +1', 'TCE', NULL, 134.0::DOUBLE PRECISION),
  ('FEA_0135', 'Theologian', '2014', 'General', 'None', 'INT +1', 'UAFFS', '- Your spellcasting ability for these spells is INT
- You can additionally cast Detect Evil and Good with spell slots', 135.0::DOUBLE PRECISION),
  ('FEA_0136', 'Tough', '2014', 'General', 'None', 'None', 'PHB2014', NULL, 136.0::DOUBLE PRECISION),
  ('FEA_0137', 'Vigor of the Hill Giant', '2014', 'General', '4th level, strike of the giants (hill strike) feat', 'STR, CON, or WIS +1', 'BGG', NULL, 137.0::DOUBLE PRECISION),
  ('FEA_0138', 'War Caster', '2014', 'General', 'Spellcasting', 'None', 'PHB2014', NULL, 138.0::DOUBLE PRECISION),
  ('FEA_0139', 'Weapon Master', '2014', 'General', 'None', 'STR or DEX +1', 'PHB2014', NULL, 139.0::DOUBLE PRECISION),
  ('FEA_0140', 'Wood Elf Magic', '2014', 'General', 'Elf (Wood)', 'None', 'XGE', '- Your spellcasting ability for these spells is your choice of INT, WIS, or CHA
- You can additionally cast the listed spells with spell slots', 140.0::DOUBLE PRECISION),
  ('FEA_0141', 'Woodwise', '2014', 'General', 'None', 'None', 'HWCS', NULL, 141.0::DOUBLE PRECISION),
  ('FEA_0142', 'Aerial Expert', '2024', 'Origin', 'Glide trait', 'None', 'HWCS_2024', NULL, 142.0::DOUBLE PRECISION),
  ('FEA_0143', 'Alert', '2024', 'Origin', 'None', 'None', 'PHB2024', NULL, 143.0::DOUBLE PRECISION),
  ('FEA_0144', 'Arcane Artist', '2024', 'Origin', 'None', 'None', 'AU', NULL, 144.0::DOUBLE PRECISION),
  ('FEA_0145', 'Arcane Eloquence', '2024', 'Origin', 'None', 'None', 'AU', NULL, 145.0::DOUBLE PRECISION),
  ('FEA_0146', 'Arcane Infiltrator', '2024', 'Origin', 'None', 'None', 'AU', NULL, 146.0::DOUBLE PRECISION),
  ('FEA_0147', 'Arcane Omens', '2024', 'Origin', 'None', 'None', 'AU', NULL, 147.0::DOUBLE PRECISION),
  ('FEA_0148', 'Arcane Overload', '2024', 'Origin', 'None', 'None', 'AU', NULL, 148.0::DOUBLE PRECISION),
  ('FEA_0149', 'Arcane Safeguard', '2024', 'Origin', 'None', 'None', 'AU', NULL, 149.0::DOUBLE PRECISION),
  ('FEA_0150', 'Arcane Undertaker', '2024', 'Origin', 'None', 'None', 'AU', NULL, 150.0::DOUBLE PRECISION),
  ('FEA_0151', 'Bandit Cunning', '2024', 'Origin', 'None', 'None', 'HWCS_2024', NULL, 151.0::DOUBLE PRECISION),
  ('FEA_0152', 'Child of the Sun', '2024', 'Origin', 'None', 'None', 'LFL', NULL, 152.0::DOUBLE PRECISION),
  ('FEA_0153', 'Crafter', '2024', 'Origin', 'None', 'None', 'PHB2024', '- The discount only applies to equipment or other items that fetch half value when sold.
- Items made with Fast Crafting can''t be sold or traded.', 153.0::DOUBLE PRECISION),
  ('FEA_0154', 'Cult of the Dragon Initiate', '2024', 'Origin', 'None', 'None', 'FRHOF', 'If you already know Draconic, the language chosen can be any language in Allowed Content (Languages) except for Class Languages', 154.0::DOUBLE PRECISION),
  ('FEA_0155', 'Emerald Enclave Fledgling', '2024', 'Origin', 'None', 'None', 'FRHOF', NULL, 155.0::DOUBLE PRECISION),
  ('FEA_0156', 'Familiar Friend', '2024', 'Origin', 'None', 'None', 'AU', NULL, 156.0::DOUBLE PRECISION),
  ('FEA_0157', 'Harper Agent', '2024', 'Origin', 'None', 'None', 'FRHOF', NULL, 157.0::DOUBLE PRECISION),
  ('FEA_0158', 'Healer', '2024', 'Origin', 'None', 'None', 'PHB2024', NULL, 158.0::DOUBLE PRECISION),
  ('FEA_0159', 'Heavy Glider', '2024', 'Origin', 'Glide trait', 'None', 'HWCS_2024', NULL, 159.0::DOUBLE PRECISION),
  ('FEA_0160', 'Lords'' Alliance Agent', '2024', 'Origin', 'None', 'None', 'FRHOF', NULL, 160.0::DOUBLE PRECISION),
  ('FEA_0161', 'Lucky', '2024', 'Origin', 'None', 'None', 'PHB2024', NULL, 161.0::DOUBLE PRECISION),
  ('FEA_0162', 'Magic Initiate', '2024', 'Origin', 'None', 'None', 'PHB2024', NULL, 162.0::DOUBLE PRECISION),
  ('FEA_0163', 'Musician', '2024', 'Origin', 'None', 'None', 'PHB2024', NULL, 163.0::DOUBLE PRECISION),
  ('FEA_0164', 'Opportunistic Thief', '2024', 'Origin', 'None', 'None', 'HWCS_2024', NULL, 164.0::DOUBLE PRECISION),
  ('FEA_0165', 'Perfect Landing', '2024', 'Origin', 'None', 'None', 'HWCS_2024', NULL, 165.0::DOUBLE PRECISION),
  ('FEA_0166', 'Portal Jumper', '2024', 'Origin', 'None', 'None', 'AU', NULL, 166.0::DOUBLE PRECISION),
  ('FEA_0167', 'Purple Dragon Rook', '2024', 'Origin', 'None', 'None', 'FRHOF', NULL, 167.0::DOUBLE PRECISION),
  ('FEA_0168', 'Savage Attacker', '2024', 'Origin', 'None', 'None', 'PHB2024', NULL, 168.0::DOUBLE PRECISION),
  ('FEA_0169', 'Shadowmoor Hexer', '2024', 'Origin', 'None', 'None', 'LFL', NULL, 169.0::DOUBLE PRECISION),
  ('FEA_0170', 'Sharp Eye', '2024', 'Origin', 'None', 'None', 'RHW', NULL, 170.0::DOUBLE PRECISION),
  ('FEA_0171', 'Speech of the Ancient Beasts', '2024', 'Origin', 'None', 'None', 'HWCS_2024', NULL, 171.0::DOUBLE PRECISION),
  ('FEA_0172', 'Spellfire Spark', '2024', 'Origin', 'None', 'None', 'FRHOF', NULL, 172.0::DOUBLE PRECISION),
  ('FEA_0173', 'Skilled', '2024', 'Origin', 'None', 'None', 'PHB2024', NULL, 173.0::DOUBLE PRECISION),
  ('FEA_0174', 'Survivor', '2024', 'Origin', 'None', 'None', 'RHW', NULL, 174.0::DOUBLE PRECISION),
  ('FEA_0175', 'Tavern Brawler', '2024', 'Origin', 'None', 'None', 'PHB2024', NULL, 175.0::DOUBLE PRECISION),
  ('FEA_0176', 'Tireless Reveler', '2024', 'Origin', 'None', 'None', 'ABH', NULL, 176.0::DOUBLE PRECISION),
  ('FEA_0177', 'Transmuted Anatomy', '2024', 'Origin', 'None', 'None', 'AU', NULL, 177.0::DOUBLE PRECISION),
  ('FEA_0178', 'Tough', '2024', 'Origin', 'None', 'None', 'PHB2024', NULL, 178.0::DOUBLE PRECISION),
  ('FEA_0179', 'Tyro of the Gauntlet', '2024', 'Origin', 'None', 'None', 'FRHOF', NULL, 179.0::DOUBLE PRECISION),
  ('FEA_0180', 'Vampire Hunter', '2024', 'Origin', 'None', 'None', 'ABH', NULL, 180.0::DOUBLE PRECISION),
  ('FEA_0181', 'Vampire Plaything', '2024', 'Origin', 'None', 'None', 'ABH', 'The Potion of Healing or Antitoxin created can''t be sold or traded.', 181.0::DOUBLE PRECISION),
  ('FEA_0182', 'Woodwise', '2024', 'Origin', 'None', 'None', 'HWCS_2024', NULL, 182.0::DOUBLE PRECISION),
  ('FEA_0183', 'Zhentarim Ruffian', '2024', 'Origin', 'None', 'None', 'FRHOF', NULL, 183.0::DOUBLE PRECISION),
  ('FEA_0184', 'Aberrant Anatomy', '2024', 'Dark Gift', 'None', 'None', 'RHW', '- If you receive the benefit of Aberrant Anatomy as a Dark Gift (Supernatural Reward) while you already have it as a Dark Gift feat, you only gain the benefit of one at a time.
- As written, you can also gain this Dark Gift feat anytime you could gain an Origin feat.', 184.0::DOUBLE PRECISION),
  ('FEA_0185', 'Echoing Soul', '2024', 'Dark Gift', 'None', 'None', 'RHW', '- If you receive the benefit of Echoing Soul as a Dark Gift (Supernatural Reward) while you already have it as a Dark Gift feat, you only gain the benefit of one at a time.
- As written, you can also gain this Dark Gift feat anytime you could gain an Origin feat.', 185.0::DOUBLE PRECISION),
  ('FEA_0186', 'Gathered Whispers', '2024', 'Dark Gift', 'None', 'None', 'RHW', '- If you receive the benefit of Gathered Whispers as a Dark Gift (Supernatural Reward) while you already have it as a Dark Gift feat, you only gain the benefit of one at a time.
- As written, you can also gain this Dark Gift feat anytime you could gain an Origin feat.', 186.0::DOUBLE PRECISION),
  ('FEA_0187', 'Living Shadow', '2024', 'Dark Gift', 'None', 'None', 'RHW', '- If you receive the benefit of Living Shadow as a Dark Gift (Supernatural Reward) while you already have it as a Dark Gift feat, you only gain the benefit of one at a time.
- As written, you can also gain this Dark Gift feat anytime you could gain an Origin feat.', 187.0::DOUBLE PRECISION),
  ('FEA_0188', 'Mist Walker', '2024', 'Dark Gift', 'None', 'None', 'RHW', '- If you receive the benefit of Mist Walker as a Dark Gift (Supernatural Reward) while you already have it as a Dark Gift feat, you only gain the benefit of one at a time.
- As written, you can also gain this Dark Gift feat anytime you could gain an Origin feat.', 188.0::DOUBLE PRECISION),
  ('FEA_0189', 'Second Skin', '2024', 'Dark Gift', 'None', 'None', 'RHW', '- If you receive the benefit of Second Skin as a Dark Gift (Supernatural Reward) while you already have it as a Dark Gift feat, you only gain the benefit of one at a time.
- As written, you can also gain this Dark Gift feat anytime you could gain an Origin feat.', 189.0::DOUBLE PRECISION),
  ('FEA_0190', 'Symbiotic Being', '2024', 'Dark Gift', 'None', 'None', 'RHW', '- If you receive the benefit of Symbiotic Being as a Dark Gift (Supernatural Reward) while you already have it as a Dark Gift feat, you only gain the benefit of one at a time.
- As written, you can also gain this Dark Gift feat anytime you could gain an Origin feat.', 190.0::DOUBLE PRECISION),
  ('FEA_0191', 'Touch of Death', '2024', 'Dark Gift', 'None', 'None', 'RHW', '- If you receive the benefit of Touch of Death (RHW) as a Dark Gift (Supernatural Reward) while you already have it as a Dark Gift feat, you only gain the benefit of one at a time.
- As written, you can also gain this Dark Gift feat anytime you could gain an Origin feat.', 191.0::DOUBLE PRECISION),
  ('FEA_0192', 'Watchers', '2024', 'Dark Gift', 'None', 'None', 'RHW', '- If you receive the benefit of Watchers as a Dark Gift (Supernatural Reward) while you already have it as a Dark Gift feat, you only gain the benefit of one at a time.
- As written, you can also gain this Dark Gift feat anytime you could gain an Origin feat.', 192.0::DOUBLE PRECISION),
  ('FEA_0193', 'Aberrant Dragonmark', '2024', 'Dragonmark', 'Can''t have another dragonmarked feat or be a dragonmarked race', 'None', 'EFA', '- This feat can''t be taken by 2024 PCs that are a dragonmarked race from Eberron: Rising from the Last War
- Details on "spellmarked" as specifically originating from Toril can be found in Hawthorne Arcana
- When customizing a background for a 2024 PC and selecting an Origin feat, you can choose to instead take this Dragonmark Feat as a starting feat for that background', 193.0::DOUBLE PRECISION),
  ('FEA_0194', 'Mark of Detection', '2024', 'Dragonmark', 'Can''t have another dragonmarked feat or be a dragonmarked race', 'None', 'EFA', '- This feat can''t be taken by 2024 PCs that are a dragonmarked race from Eberron: Rising from the Last War
- Details on "spellmarked" as specifically originating from Toril can be found in Hawthorne Arcana
- When customizing a background for a 2024 PC and selecting an Origin feat, you can choose to instead take this Dragonmark Feat as a starting feat for that background', 194.0::DOUBLE PRECISION),
  ('FEA_0195', 'Mark of Finding', '2024', 'Dragonmark', 'Can''t have another dragonmarked feat or be a dragonmarked race', 'None', 'EFA', '- This feat can''t be taken by 2024 PCs that are a dragonmarked race from Eberron: Rising from the Last War
- Details on "spellmarked" as specifically originating from Toril can be found in Hawthorne Arcana
- When customizing a background for a 2024 PC and selecting an Origin feat, you can choose to instead take this Dragonmark Feat as a starting feat for that background', 195.0::DOUBLE PRECISION),
  ('FEA_0196', 'Mark of Handling', '2024', 'Dragonmark', 'Can''t have another dragonmarked feat or be a dragonmarked race', 'None', 'EFA', '- This feat can''t be taken by 2024 PCs that are a dragonmarked race from Eberron: Rising from the Last War
- Details on "spellmarked" as specifically originating from Toril can be found in Hawthorne Arcana
- When customizing a background for a 2024 PC and selecting an Origin feat, you can choose to instead take this Dragonmark Feat as a starting feat for that background', 196.0::DOUBLE PRECISION),
  ('FEA_0197', 'Mark of Healing', '2024', 'Dragonmark', 'Can''t have another dragonmarked feat or be a dragonmarked race', 'None', 'EFA', '- This feat can''t be taken by 2024 PCs that are a dragonmarked race from Eberron: Rising from the Last War
- Details on "spellmarked" as specifically originating from Toril can be found in Hawthorne Arcana
- When customizing a background for a 2024 PC and selecting an Origin feat, you can choose to instead take this Dragonmark Feat as a starting feat for that background', 197.0::DOUBLE PRECISION),
  ('FEA_0198', 'Mark of Hospitality', '2024', 'Dragonmark', 'Can''t have another dragonmarked feat or be a dragonmarked race', 'None', 'EFA', '- This feat can''t be taken by 2024 PCs that are a dragonmarked race from Eberron: Rising from the Last War
- Details on "spellmarked" as specifically originating from Toril can be found in Hawthorne Arcana
- When customizing a background for a 2024 PC and selecting an Origin feat, you can choose to instead take this Dragonmark Feat as a starting feat for that background', 198.0::DOUBLE PRECISION),
  ('FEA_0199', 'Mark of Making', '2024', 'Dragonmark', 'Can''t have another dragonmarked feat or be a dragonmarked race', 'None', 'EFA', '- This feat can''t be taken by 2024 PCs that are a dragonmarked race from Eberron: Rising from the Last War
- Details on "spellmarked" as specifically originating from Toril can be found in Hawthorne Arcana
- When customizing a background for a 2024 PC and selecting an Origin feat, you can choose to instead take this Dragonmark Feat as a starting feat for that background', 199.0::DOUBLE PRECISION),
  ('FEA_0200', 'Mark of Passage', '2024', 'Dragonmark', 'Can''t have another dragonmarked feat or be a dragonmarked race', 'None', 'EFA', '- This feat can''t be taken by 2024 PCs that are a dragonmarked race from Eberron: Rising from the Last War
- Details on "spellmarked" as specifically originating from Toril can be found in Hawthorne Arcana
- When customizing a background for a 2024 PC and selecting an Origin feat, you can choose to instead take this Dragonmark Feat as a starting feat for that background', 200.0::DOUBLE PRECISION),
  ('FEA_0201', 'Mark of Scribing', '2024', 'Dragonmark', 'Can''t have another dragonmarked feat or be a dragonmarked race', 'None', 'EFA', '- This feat can''t be taken by 2024 PCs that are a dragonmarked race from Eberron: Rising from the Last War
- Details on "spellmarked" as specifically originating from Toril can be found in Hawthorne Arcana
- When customizing a background for a 2024 PC and selecting an Origin feat, you can choose to instead take this Dragonmark Feat as a starting feat for that background', 201.0::DOUBLE PRECISION),
  ('FEA_0202', 'Mark of Sentinel', '2024', 'Dragonmark', 'Can''t have another dragonmarked feat or be a dragonmarked race', 'None', 'EFA', '- This feat can''t be taken by 2024 PCs that are a dragonmarked race from Eberron: Rising from the Last War
- Details on "spellmarked" as specifically originating from Toril can be found in Hawthorne Arcana
- When customizing a background for a 2024 PC and selecting an Origin feat, you can choose to instead take this Dragonmark Feat as a starting feat for that background', 202.0::DOUBLE PRECISION),
  ('FEA_0203', 'Mark of Shadow', '2024', 'Dragonmark', 'Can''t have another dragonmarked feat or be a dragonmarked race', 'None', 'EFA', '- This feat can''t be taken by 2024 PCs that are a dragonmarked race from Eberron: Rising from the Last War
- Details on "spellmarked" as specifically originating from Toril can be found in Hawthorne Arcana
- When customizing a background for a 2024 PC and selecting an Origin feat, you can choose to instead take this Dragonmark Feat as a starting feat for that background', 203.0::DOUBLE PRECISION),
  ('FEA_0204', 'Mark of Storm', '2024', 'Dragonmark', 'Can''t have another dragonmarked feat or be a dragonmarked race', 'None', 'EFA', '- This feat can''t be taken by 2024 PCs that are a dragonmarked race from Eberron: Rising from the Last War
- Details on "spellmarked" as specifically originating from Toril can be found in Hawthorne Arcana
- When customizing a background for a 2024 PC and selecting an Origin feat, you can choose to instead take this Dragonmark Feat as a starting feat for that background', 204.0::DOUBLE PRECISION),
  ('FEA_0205', 'Mark of Warding', '2024', 'Dragonmark', 'Can''t have another dragonmarked feat or be a dragonmarked race', 'None', 'EFA', '- This feat can''t be taken by 2024 PCs that are a dragonmarked race from Eberron: Rising from the Last War
- Details on "spellmarked" as specifically originating from Toril can be found in Hawthorne Arcana
- When customizing a background for a 2024 PC and selecting an Origin feat, you can choose to instead take this Dragonmark Feat as a starting feat for that background', 205.0::DOUBLE PRECISION),
  ('FEA_0206', 'Ability Score Improvement', '2024', 'General', 'Level 4+', 'Any +2 or any two +1/+1', 'PHB2024', NULL, 206.0::DOUBLE PRECISION),
  ('FEA_0207', 'Abjuration Adept', '2024', 'General', 'Level 4+, Spellcasting or Pact Magic', 'INT, WIS, or CHA +1', 'AU', NULL, 207.0::DOUBLE PRECISION),
  ('FEA_0208', 'Actor', '2024', 'General', 'Level 4+, CHA 13+', 'CHA +1', 'PHB2024', NULL, 208.0::DOUBLE PRECISION),
  ('FEA_0209', 'Athlete', '2024', 'General', 'Level 4+, STR or DEX 13+', 'STR or DEX +1', 'PHB2024', NULL, 209.0::DOUBLE PRECISION),
  ('FEA_0210', 'Bloodlust', '2024', 'General', 'Level 4+', 'STR, DEX, or CON +1', 'ABH', NULL, 210.0::DOUBLE PRECISION),
  ('FEA_0211', 'Bomber', '2024', 'General', 'Level 4+', 'DEX +1', 'ABH', NULL, 211.0::DOUBLE PRECISION),
  ('FEA_0212', 'Brutal Grip', '2024', 'General', 'Level 4+, STR 13+', 'STR +1', 'VSS_PP', NULL, 212.0::DOUBLE PRECISION),
  ('FEA_0213', 'Charger', '2024', 'General', 'Level 4+, STR or DEX 13+', 'STR or DEX +1', 'PHB2024', NULL, 213.0::DOUBLE PRECISION),
  ('FEA_0214', 'Chef', '2024', 'General', 'Level 4+', 'CON or WIS +1', 'PHB2024', 'You can use the Prepare Meals option for cook''s utensils (XGE) as part of the same short rest to make the special food.', 214.0::DOUBLE PRECISION),
  ('FEA_0215', 'Cloying Mists', '2024', 'General', 'Level 4+', 'INT, WIS, or CHA +1', 'ABH', NULL, 215.0::DOUBLE PRECISION),
  ('FEA_0216', 'Cold Caster', '2024', 'General', 'Level 4+', 'INT, WIS, or CHA +1', 'FRHOF', NULL, 216.0::DOUBLE PRECISION),
  ('FEA_0217', 'Conjuration Adept', '2024', 'General', 'Level 4+, Spellcasting or Pact Magic', 'INT, WIS, or CHA +1', 'AU', NULL, 217.0::DOUBLE PRECISION),
  ('FEA_0218', 'Crossbow Expert', '2024', 'General', 'Level 4+, DEX 13+', 'DEX +1', 'PHB2024', NULL, 218.0::DOUBLE PRECISION),
  ('FEA_0219', 'Crusher', '2024', 'General', 'Level 4+', 'STR or CON +1', 'PHB2024', NULL, 219.0::DOUBLE PRECISION),
  ('FEA_0220', 'Defensive Duelist', '2024', 'General', 'Level 4+, DEX 13+', 'DEX +1', 'PHB2024', NULL, 220.0::DOUBLE PRECISION),
  ('FEA_0221', 'Delicious Pain', '2024', 'General', 'Level 4+', 'Any +1', 'ABH', NULL, 221.0::DOUBLE PRECISION),
  ('FEA_0222', 'Divination Adept', '2024', 'General', 'Level 4+, Spellcasting or Pact Magic', 'INT, WIS, or CHA +1', 'AU', NULL, 222.0::DOUBLE PRECISION),
  ('FEA_0223', 'Dragonscarred', '2024', 'General', 'Level 4+, Cult of the Dragon Initiate Feat', 'CON or CHA +1', 'FRHOF', NULL, 223.0::DOUBLE PRECISION),
  ('FEA_0224', 'Dual Wielder', '2024', 'General', 'Level 4+, STR or DEX 13+', 'STR or DEX +1', 'PHB2024', NULL, 224.0::DOUBLE PRECISION),
  ('FEA_0225', 'Durable', '2024', 'General', 'Level 4+', 'CON +1', 'PHB2024', NULL, 225.0::DOUBLE PRECISION),
  ('FEA_0226', 'Elemental Adept', '2024', 'General', 'Level 4+, Spellcasting or Pact Magic', 'INT, WIS, or CHA +1', 'PHB2024', NULL, 226.0::DOUBLE PRECISION),
  ('FEA_0227', 'Elemental Familiar', '2024', 'General', 'Level 4+, Familiar Friend Feat', 'Any +1', 'AU', NULL, 227.0::DOUBLE PRECISION),
  ('FEA_0228', 'Enchantment Adept', '2024', 'General', 'Level 4+, Spellcasting or Pact Magic', 'INT, WIS, or CHA +1', 'AU', NULL, 228.0::DOUBLE PRECISION),
  ('FEA_0229', 'Enclave Magic', '2024', 'General', 'Level 4+, Emerald Enclave Fledgling Feat', 'INT, WIS, or CHA +1', 'FRHOF', NULL, 229.0::DOUBLE PRECISION),
  ('FEA_0230', 'Evocation Adept', '2024', 'General', 'Level 4+, Spellcasting or Pact Magic', 'INT, WIS, or CHA +1', 'AU', NULL, 230.0::DOUBLE PRECISION),
  ('FEA_0231', 'Fairy Trickster', '2024', 'General', 'Level 4+', 'DEX or CHA +1', 'FRHOF', NULL, 231.0::DOUBLE PRECISION),
  ('FEA_0232', 'Fey-Touched', '2024', 'General', 'Level 4+', 'INT, WIS, or CHA +1', 'PHB2024', NULL, 232.0::DOUBLE PRECISION),
  ('FEA_0233', 'Field Commander', '2024', 'General', 'Level 4+, CHA 13+', 'CHA +1', 'VSS_PP', 'An ally commanded to take the Dash action as a Reaction can choose to instead take a Reaction to move up to their speed.', 233.0::DOUBLE PRECISION),
  ('FEA_0234', 'Focused Critical', '2024', 'General', 'Level 4+', 'STR or DEX +1', 'VSS_PP', NULL, 234.0::DOUBLE PRECISION),
  ('FEA_0235', 'Genie Magic', '2024', 'General', 'Level 4+', 'INT, WIS, or CHA +1', 'FRHOF', NULL, 235.0::DOUBLE PRECISION),
  ('FEA_0236', 'Grappler', '2024', 'General', 'Level 4+, STR or DEX 13+', 'STR or DEX +1', 'PHB2024', NULL, 236.0::DOUBLE PRECISION),
  ('FEA_0237', 'Great Weapon Master', '2024', 'General', 'Level 4+, STR 13+', 'STR +1', 'PHB2024', NULL, 237.0::DOUBLE PRECISION),
  ('FEA_0238', 'Greater Aberrant Mark', '2024', 'General', 'Level 4+, Aberrant Dragonmark Feat', 'CON +1', 'EFA', NULL, 238.0::DOUBLE PRECISION),
  ('FEA_0239', 'Greater Mark of Detection', '2024', 'General', 'Level 4+, Mark of Detection Feat or Half-Elf (Mark of Detection) Race', 'Any +1', 'EFA', 'A 2024 PC that is a Half-Elf (Mark of Detection) from Eberron: Rising from the Last War also satisfies this feat''s prerequisite.', 239.0::DOUBLE PRECISION),
  ('FEA_0240', 'Greater Mark of Finding', '2024', 'General', 'Level 4+, Mark of Finding Feat or Half-Orc (Mark of Finding) race or Human (Mark of Finding) race', 'Any +1', 'EFA', 'A 2024 PC that is a Half-Orc (Mark of Finding) or Human (Mark of Finding) from Eberron: Rising from the Last War also satisfies this feat''s prerequisite.', 240.0::DOUBLE PRECISION),
  ('FEA_0241', 'Greater Mark of Handling', '2024', 'General', 'Level 4+, Mark of Handling Feat or Human (Mark of Handling) race', 'Any +1', 'EFA', 'A 2024 PC that is a Human (Mark of Handling) from Eberron: Rising from the Last War also satisfies this feat''s prerequisite.', 241.0::DOUBLE PRECISION),
  ('FEA_0242', 'Greater Mark of Healing', '2024', 'General', 'Level 4+, Mark of Healing Feat or Halfling (Mark of Healing) race', 'Any +1', 'EFA', 'A 2024 PC that is a Halfling (Mark of Healing) from Eberron: Rising from the Last War also satisfies this feat''s prerequisite.', 242.0::DOUBLE PRECISION),
  ('FEA_0243', 'Greater Mark of Hospitality', '2024', 'General', 'Level 4+, Mark of Hospitality Feat or Halfling (Mark of Hospitality) race', 'Any +1', 'EFA', 'A 2024 PC that is a Halfling (Mark of Hospitality) from Eberron: Rising from the Last War also satisfies this feat''s prerequisite.', 243.0::DOUBLE PRECISION),
  ('FEA_0244', 'Greater Mark of Making', '2024', 'General', 'Level 4+, Mark of Making Feat or Human (Mark of Making) race', 'Any +1', 'EFA', 'A 2024 PC that is a Human (Mark of Making) from Eberron: Rising from the Last War also satisfies this feat''s prerequisite.', 244.0::DOUBLE PRECISION),
  ('FEA_0245', 'Greater Mark of Passage', '2024', 'General', 'Level 4+, Mark of Passage Feat or Human (Mark of Passage) race', 'Any +1', 'EFA', 'A 2024 PC that is a Human (Mark of Passage) from Eberron: Rising from the Last War also satisfies this feat''s prerequisite.', 245.0::DOUBLE PRECISION),
  ('FEA_0246', 'Greater Mark of Scribing', '2024', 'General', 'Level 4+, Mark of Scribing Feat or Gnome (Mark of Scribing) race', 'Any +1', 'EFA', 'A 2024 PC that is a Gnome (Mark of Scribing) from Eberron: Rising from the Last War also satisfies this feat''s prerequisite.', 246.0::DOUBLE PRECISION),
  ('FEA_0247', 'Greater Mark of Sentinel', '2024', 'General', 'Level 4+, Mark of Sentinel Feat or Human (Mark of Sentinel) race', 'Any +1', 'EFA', 'A 2024 PC that is a Human (Mark of Sentinel) from Eberron: Rising from the Last War also satisfies this feat''s prerequisite.', 247.0::DOUBLE PRECISION),
  ('FEA_0248', 'Greater Mark of Shadow', '2024', 'General', 'Level 4+, Mark of Shadow Feat or Elf (Mark of Shadow) race', 'Any +1', 'EFA', 'A 2024 PC that is an Elf (Mark of Shadow) from Eberron: Rising from the Last War also satisfies this feat''s prerequisite.', 248.0::DOUBLE PRECISION),
  ('FEA_0249', 'Greater Mark of Storm', '2024', 'General', 'Level 4+, Mark of Storm Feat or Half-Elf (Mark of Storm) race', 'Any +1', 'EFA', 'A 2024 PC that is a Half-Elf (Mark of Storm) from Eberron: Rising from the Last War also satisfies this feat''s prerequisite.', 249.0::DOUBLE PRECISION),
  ('FEA_0250', 'Greater Mark of Warding', '2024', 'General', 'Level 4+, Mark of Warding or Dwarf (Mark of Warding) race', 'Any +1', 'EFA', 'A 2024 PC that is a Dwarf (Mark of Warding) from Eberron: Rising from the Last War also satisfies this feat''s prerequisite.', 250.0::DOUBLE PRECISION),
  ('FEA_0251', 'Harper Teamwork', '2024', 'General', 'Level 4+, Harper Agent Feat', 'DEX or CHA +1', 'FRHOF', NULL, 251.0::DOUBLE PRECISION),
  ('FEA_0252', 'Heavily Armored', '2024', 'General', 'Level 4+, Medium Armor Training', 'STR or CON +1', 'PHB2024', NULL, 252.0::DOUBLE PRECISION),
  ('FEA_0253', 'Heavy Armor Master', '2024', 'General', 'Level 4+, Heavy Armor Training', 'STR or CON +1', 'PHB2024', NULL, 253.0::DOUBLE PRECISION),
  ('FEA_0254', 'Illusion Adept', '2024', 'General', 'Level 4+, Spellcasting or Pact Magic', 'INT, WIS, or CHA +1', 'AU', NULL, 254.0::DOUBLE PRECISION),
  ('FEA_0255', 'Inspiring Leader', '2024', 'General', 'Level 4+, WIS or CHA 13+', 'WIS or CHA +1', 'PHB2024', NULL, 255.0::DOUBLE PRECISION),
  ('FEA_0256', 'Keen Mind', '2024', 'General', 'Level 4+, INT 13+', 'INT +1', 'PHB2024', NULL, 256.0::DOUBLE PRECISION),
  ('FEA_0257', 'Light Bringer', '2024', 'General', 'Level 4+', 'INT, WIS, or CHA +1', 'ABH', NULL, 257.0::DOUBLE PRECISION),
  ('FEA_0258', 'Lightly Armored', '2024', 'General', 'Level 4+', 'STR or DEX +1', 'PHB2024', NULL, 258.0::DOUBLE PRECISION),
  ('FEA_0259', 'Lordly Resolve', '2024', 'General', 'Level 4+, Lords'' Alliance Agent Feat', 'STR or CHA +1', 'FRHOF', NULL, 259.0::DOUBLE PRECISION),
  ('FEA_0260', 'Love Bites', '2024', 'General', 'Level 4+', 'Any +1', 'ABH', NULL, 260.0::DOUBLE PRECISION),
  ('FEA_0261', 'Mage Slayer', '2024', 'General', 'Level 4+', 'STR or DEX +1', 'PHB2024', NULL, 261.0::DOUBLE PRECISION),
  ('FEA_0262', 'Magic Connoisseur', '2024', 'General', 'Level 4+, Magic Initiate Feat', 'INT, WIS, or CHA +1', 'AU', NULL, 262.0::DOUBLE PRECISION),
  ('FEA_0263', 'Martial Weapon Training', '2024', 'General', 'Level 4+', 'STR or DEX +1', 'PHB2024', NULL, 263.0::DOUBLE PRECISION),
  ('FEA_0264', 'Medium Armor Master', '2024', 'General', 'Level 4+, Medium Armor Training', 'STR or DEX +1', 'PHB2024', NULL, 264.0::DOUBLE PRECISION),
  ('FEA_0265', 'Moderately Armored', '2024', 'General', 'Level 4+, Light Armor Training', 'STR or DEX +1', 'PHB2024', NULL, 265.0::DOUBLE PRECISION),
  ('FEA_0266', 'Mounted Combatant', '2024', 'General', 'Level 4+', 'STR, DEX, or WIS +1', 'PHB2024', NULL, 266.0::DOUBLE PRECISION),
  ('FEA_0267', 'Mythal Touched', '2024', 'General', 'Level 4+', 'INT, WIS, or CHA +1', 'FRHOF', NULL, 267.0::DOUBLE PRECISION),
  ('FEA_0268', 'Necromancy Adept', '2024', 'General', 'Level 4+, Spellcasting or Pact Magic', 'INT, WIS, or CHA +1', 'AU', NULL, 268.0::DOUBLE PRECISION),
  ('FEA_0269', 'Observant', '2024', 'General', 'Level 4+, INT or WIS 13+', 'INT or WIS +1', 'PHB2024', NULL, 269.0::DOUBLE PRECISION),
  ('FEA_0270', 'Order''s Resilience', '2024', 'General', 'Level 4+, Tyro of the Gauntlet Feat', 'STR, WIS, or CHA +1', 'FRHOF', NULL, 270.0::DOUBLE PRECISION),
  ('FEA_0271', 'Otherworldly Familiar', '2024', 'General', 'Level 4+, Familiar Friend Feat', 'Any +1', 'AU', NULL, 271.0::DOUBLE PRECISION),
  ('FEA_0272', 'Piercer', '2024', 'General', 'Level 4+', 'STR or DEX +1', 'PHB2024', NULL, 272.0::DOUBLE PRECISION),
  ('FEA_0273', 'Poisoner', '2024', 'General', 'Level 4+', 'DEX or INT +1', 'PHB2024', NULL, 273.0::DOUBLE PRECISION),
  ('FEA_0274', 'Polearm Master', '2024', 'General', 'Level 4+, STR or DEX 13+', 'STR or DEX +1', 'PHB2024', NULL, 274.0::DOUBLE PRECISION),
  ('FEA_0275', 'Potent Dragonmark', '2024', 'General', 'Level 4+, Any Dragonmark Feat or Any Dragonmark Race', 'Dragonmark Feat Spellcasting Ability +1', 'EFA', '- A 2024 PC that is a dragonmarked race from Eberron: Rising from the Last War also satisfies this feat''s prerequisite. The feat grants +1 to the ability score you use for the race''s racial spells feature.', 275.0::DOUBLE PRECISION),
  ('FEA_0276', 'Purple Dragon Commandant', '2024', 'General', 'Level 4+, Purple Dragon Rook Feat or Martial Weapon Proficiency', 'STR or DEX +1', 'FRHOF', NULL, 276.0::DOUBLE PRECISION),
  ('FEA_0277', 'Putrefy', '2024', 'General', 'Level 4+', 'Any +1', 'ABH', NULL, 277.0::DOUBLE PRECISION),
  ('FEA_0278', 'Rebuke', '2024', 'General', 'Level 4+', 'Any +1', 'ABH', NULL, 278.0::DOUBLE PRECISION),
  ('FEA_0279', 'Resilient', '2024', 'General', 'Level 4+', 'One +1 of your choice', 'PHB2024', NULL, 279.0::DOUBLE PRECISION),
  ('FEA_0280', 'Ritual Caster', '2024', 'General', 'Level 4+; INT, WIS, or CHA 13+', 'INT, WIS, or CHA +1', 'PHB2024', NULL, 280.0::DOUBLE PRECISION),
  ('FEA_0281', 'Sentinel', '2024', 'General', 'Level 4+, STR or DEX 13+', 'STR or DEX +1', 'PHB2024', NULL, 281.0::DOUBLE PRECISION),
  ('FEA_0282', 'Shadow Touched', '2024', 'General', 'Level 4+', 'INT, WIS, or CHA +1', 'PHB2024', NULL, 282.0::DOUBLE PRECISION),
  ('FEA_0283', 'Sharpshooter', '2024', 'General', 'Level 4+, DEX 13+', 'DEX +1', 'PHB2024', NULL, 283.0::DOUBLE PRECISION),
  ('FEA_0284', 'Shield Master', '2024', 'General', 'Level 4+, Shield Training', 'STR +1', 'PHB2024', NULL, 284.0::DOUBLE PRECISION),
  ('FEA_0285', 'Skill Expert', '2024', 'General', 'Level 4+', 'Any +1', 'PHB2024', NULL, 285.0::DOUBLE PRECISION),
  ('FEA_0286', 'Skulker', '2024', 'General', 'Level 4+, DEX 13+', 'DEX +1', 'PHB2024', NULL, 286.0::DOUBLE PRECISION),
  ('FEA_0287', 'Slasher', '2024', 'General', 'Level 4+', 'STR or DEX +1', 'PHB2024', NULL, 287.0::DOUBLE PRECISION),
  ('FEA_0288', 'Soothing Familiar', '2024', 'General', 'Level 4+, Familiar Friend Feat', 'Any +1', 'AU', NULL, 288.0::DOUBLE PRECISION),
  ('FEA_0289', 'Speedy', '2024', 'General', 'Level 4+, DEX or CON 13+', 'DEX or CON +1', 'PHB2024', 'Replaces the Mobile feat from PHB 2014.', 289.0::DOUBLE PRECISION),
  ('FEA_0290', 'Spell Resistant', '2024', 'General', 'Level 4+', 'DEX or CON +1', 'AU', NULL, 290.0::DOUBLE PRECISION),
  ('FEA_0291', 'Spell Subterfuge', '2024', 'General', 'Level 4+, Spellcasting or Pact Magic', 'INT, WIS, or CHA +1', 'AU', NULL, 291.0::DOUBLE PRECISION),
  ('FEA_0292', 'Spell Sniper', '2024', 'General', 'Level 4+, Spellcasting or Pact Magic', 'INT, WIS, or CHA +1', 'PHB2024', NULL, 292.0::DOUBLE PRECISION),
  ('FEA_0293', 'Spellfire Adept', '2024', 'General', 'Level 4+, Spellfire Spark Feat or Spellcasting or Pact Magic Feature', 'INT, WIS, or CHA +1', 'FRHOF', NULL, 293.0::DOUBLE PRECISION),
  ('FEA_0294', 'Street Justice', '2024', 'General', 'Level 4+', 'STR or DEX +1', 'FRHOF', NULL, 294.0::DOUBLE PRECISION),
  ('FEA_0295', 'Telekinetic', '2024', 'General', 'Level 4+', 'INT, WIS, or CHA +1', 'PHB2024', 'The distance before disappearing for the mage hand created by this feat also increases by 30 feet (to 60 feet).', 295.0::DOUBLE PRECISION),
  ('FEA_0296', 'Telepathic', '2024', 'General', 'Level 4+', 'INT, WIS, or CHA +1', 'PHB2024', NULL, 296.0::DOUBLE PRECISION),
  ('FEA_0297', 'Treacherous Allure', '2024', 'General', 'Level 4+', 'INT, WIS, or CHA +1', 'ABH', NULL, 297.0::DOUBLE PRECISION),
  ('FEA_0298', 'Transmutation Adept', '2024', 'General', 'Level 4+, Spellcasting or Pact Magic', 'INT, WIS, or CHA +1', 'AU', NULL, 298.0::DOUBLE PRECISION),
  ('FEA_0299', 'Vampire Touched', '2024', 'General', 'Level 4+', 'INT, WIS, or CHA +1', 'ABH', NULL, 299.0::DOUBLE PRECISION),
  ('FEA_0300', 'War Caster', '2024', 'General', 'Level 4+, Spellcasting or Pact Magic', 'INT, WIS, or CHA +1', 'PHB2024', NULL, 300.0::DOUBLE PRECISION),
  ('FEA_0301', 'Warlike Familiar', '2024', 'General', 'Level 4+, Familiar Friend Feat', 'Any +1', 'AU', NULL, 301.0::DOUBLE PRECISION),
  ('FEA_0302', 'Weapon Master', '2024', 'General', 'Level 4+', 'STR or DEX +1', 'PHB2024', NULL, 302.0::DOUBLE PRECISION),
  ('FEA_0303', 'Zhentarim Tactics', '2024', 'General', 'Level 4+, Zhentarim Ruffian Feat', 'DEX or CHA +1', 'FRHOF', NULL, 303.0::DOUBLE PRECISION),
  ('FEA_0304', 'Arcane Warrior', '2024', 'Fighting Style', 'Fighting Style Feature', 'None', 'AU', NULL, 304.0::DOUBLE PRECISION),
  ('FEA_0305', 'Archery', '2024', 'Fighting Style', 'Fighting Style Feature', 'None', 'PHB2024', NULL, 305.0::DOUBLE PRECISION),
  ('FEA_0306', 'Blind Fighting', '2024', 'Fighting Style', 'Fighting Style Feature', 'None', 'PHB2024', NULL, 306.0::DOUBLE PRECISION),
  ('FEA_0307', 'Defense', '2024', 'Fighting Style', 'Fighting Style Feature', 'None', 'PHB2024', NULL, 307.0::DOUBLE PRECISION),
  ('FEA_0308', 'Dueling', '2024', 'Fighting Style', 'Fighting Style Feature', 'None', 'PHB2024', NULL, 308.0::DOUBLE PRECISION),
  ('FEA_0309', 'Great Weapon Fighting', '2024', 'Fighting Style', 'Fighting Style Feature', 'None', 'PHB2024', NULL, 309.0::DOUBLE PRECISION),
  ('FEA_0310', 'Interception', '2024', 'Fighting Style', 'Fighting Style Feature', 'None', 'PHB2024', NULL, 310.0::DOUBLE PRECISION),
  ('FEA_0311', 'Protection', '2024', 'Fighting Style', 'Fighting Style Feature', 'None', 'PHB2024', NULL, 311.0::DOUBLE PRECISION),
  ('FEA_0312', 'Thrown Weapon Fighting', '2024', 'Fighting Style', 'Fighting Style Feature', 'None', 'PHB2024', NULL, 312.0::DOUBLE PRECISION),
  ('FEA_0313', 'Two-Weapon Fighting', '2024', 'Fighting Style', 'Fighting Style Feature', 'None', 'PHB2024', NULL, 313.0::DOUBLE PRECISION),
  ('FEA_0314', 'Unarmed Fighting', '2024', 'Fighting Style', 'Fighting Style Feature', 'None', 'PHB2024', NULL, 314.0::DOUBLE PRECISION),
  ('FEA_0315', 'Boon of Blazing Dawn', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'ABH', NULL, 315.0::DOUBLE PRECISION),
  ('FEA_0316', 'Boon of Bloodshed', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'FRHOF', NULL, 316.0::DOUBLE PRECISION),
  ('FEA_0317', 'Boon of Bountiful Health', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'FRHOF', NULL, 317.0::DOUBLE PRECISION),
  ('FEA_0318', 'Boon of the Bright Sun', '2024', 'Epic Boon', 'Level 19+', 'CON, WIS, or CHA +1 (up to 30)', 'FRHOF', NULL, 318.0::DOUBLE PRECISION),
  ('FEA_0319', 'Boon of Combat Prowess', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'PHB2024', NULL, 319.0::DOUBLE PRECISION),
  ('FEA_0320', 'Boon of Communication', '2024', 'Epic Boon', 'Level 19+', 'INT, WIS, or CHA +1 (up to 30)', 'FRHOF', NULL, 320.0::DOUBLE PRECISION),
  ('FEA_0321', 'Boon of Desperate Resilience', '2024', 'Epic Boon', 'Level 19+', 'STR or CON +1 (up to 30)', 'FRHOF', NULL, 321.0::DOUBLE PRECISION),
  ('FEA_0322', 'Boon of Dimensional Travel', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'PHB2024', NULL, 322.0::DOUBLE PRECISION),
  ('FEA_0323', 'Boon of Energy Resistance', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'PHB2024', NULL, 323.0::DOUBLE PRECISION),
  ('FEA_0324', 'Boon of Erupting Spellpower', '2024', 'Epic Boon', 'Level 19+', 'INT, WIS, or CHA +1 (up to 30)', 'AU', NULL, 324.0::DOUBLE PRECISION),
  ('FEA_0325', 'Boon of Exquisite Radiance', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'FRHOF', NULL, 325.0::DOUBLE PRECISION),
  ('FEA_0326', 'Boon of Fate', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'PHB2024', NULL, 326.0::DOUBLE PRECISION),
  ('FEA_0327', 'Boon of Fluid Forms', '2024', 'Epic Boon', 'Level 19+', 'INT, WIS, or CHA +1 (up to 30)', 'FRHOF', NULL, 327.0::DOUBLE PRECISION),
  ('FEA_0328', 'Boon of Fortitude', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'PHB2024', NULL, 328.0::DOUBLE PRECISION),
  ('FEA_0329', 'Boon of Fortune''s Favor', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'FRHOF', NULL, 329.0::DOUBLE PRECISION),
  ('FEA_0330', 'Boon of the Furious Storm', '2024', 'Epic Boon', 'Level 19+, Spellcasting or Pact Magic Feature', 'INT, WIS, or CHA +1 (up to 30)', 'FRHOF', NULL, 330.0::DOUBLE PRECISION),
  ('FEA_0331', 'Boon of the Iron Mind', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'AU', NULL, 331.0::DOUBLE PRECISION),
  ('FEA_0332', 'Boon of Irresistible Offense', '2024', 'Epic Boon', 'Level 19+', 'STR or DEX +1 (up to 30)', 'PHB2024', NULL, 332.0::DOUBLE PRECISION),
  ('FEA_0333', 'Boon of Looming Shadows', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'ABH', NULL, 333.0::DOUBLE PRECISION),
  ('FEA_0334', 'Boon of Magic School Mastery', '2024', 'Epic Boon', 'Level 19+, Spellcasting or Pact Magic Feature', 'INT, WIS, or CHA +1 (up to 30)', 'AU', NULL, 334.0::DOUBLE PRECISION),
  ('FEA_0335', 'Boon of Misty Escape', '2024', 'Epic Boon', 'Level 19+', 'INT, WIS, or CHA +1 (up to 30)', 'ABH', NULL, 335.0::DOUBLE PRECISION),
  ('FEA_0336', 'Boon of the Night Spirit', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'PHB2024', NULL, 336.0::DOUBLE PRECISION),
  ('FEA_0337', 'Boon of Poison Mastery', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'FRHOF', NULL, 337.0::DOUBLE PRECISION),
  ('FEA_0338', 'Boon of Recovery', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'PHB2024', NULL, 338.0::DOUBLE PRECISION),
  ('FEA_0339', 'Boon of Revelry', '2024', 'Epic Boon', 'Level 19+', 'INT, WIS, or CHA +1 (up to 30)', 'FRHOF', NULL, 339.0::DOUBLE PRECISION),
  ('FEA_0340', 'Boon of Siberys', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'EFA', 'Details on "spellmarked" as specifically originating from Toril can be found in Hawthorne Arcana', 340.0::DOUBLE PRECISION),
  ('FEA_0341', 'Boon of Skill', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'PHB2024', NULL, 341.0::DOUBLE PRECISION),
  ('FEA_0342', 'Boon of Speed', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'PHB2024', NULL, 342.0::DOUBLE PRECISION),
  ('FEA_0343', 'Boon of Spell Recall', '2024', 'Epic Boon', 'Level 19+', 'INT, WIS, or CHA +1 (up to 30)', 'PHB2024', NULL, 343.0::DOUBLE PRECISION),
  ('FEA_0344', 'Boon of the Soul Drinker', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'FRHOF', NULL, 344.0::DOUBLE PRECISION),
  ('FEA_0345', 'Boon of Terror', '2024', 'Epic Boon', 'Level 19+', 'CHA +1 (up to 30)', 'FRHOF', NULL, 345.0::DOUBLE PRECISION),
  ('FEA_0346', 'Boon of Truesight', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'PHB2024', NULL, 346.0::DOUBLE PRECISION)

) AS v(check_id, name, ruleset, category, prereq, ability_increase, source, notes, display_order)
WHERE f.name = v.name 
  AND (
    (v.ruleset = '2014' AND (f.source = v.source OR f.source = 'PHB 2014' OR f.source = 'SatO' OR f.source = 'XFTE' OR f.source = 'HWCS'))
    OR (v.ruleset = '2024' AND (f.source = v.source OR f.source = 'PHB 2024' OR f.source = 'HWCS (2024)' OR f.source = 'VSS:PP'))
  );

-- Insert any new or missing feats (e.g. 29 new 2024 boons & AU feats)
INSERT INTO public.ac_feats (check_id, name, ruleset, category, prerequisite, ability_increase, source, notes_advice, display_order)
SELECT v.check_id, v.name, v.ruleset, v.category, v.prereq, v.ability_increase, v.source, v.notes, v.display_order
FROM (VALUES

  ('FEA_0001', 'Aberrant Dragonmark', '2014', 'General', 'Not being a dragonmarked race', 'CON +1', 'ERLW', '- The Greater Aberrant Powers option is not used
- You can additionally cast the 1st-level spell with spell slots
- Details on "spellmarked" as specifically originating from Toril can be found in Hawthorne Arcana', 1.0::DOUBLE PRECISION),
  ('FEA_0002', 'Acrobat', '2014', 'General', 'None', 'DEX +1', 'UAFFS', NULL, 2.0::DOUBLE PRECISION),
  ('FEA_0003', 'Actor', '2014', 'General', 'None', 'CHA +1', 'PHB2014', NULL, 3.0::DOUBLE PRECISION),
  ('FEA_0004', 'Adept of the Black Robes', '2014', 'General', '4th level, Initiate of high sorcery (nuitari) feat', 'None', 'DSotDQ', NULL, 4.0::DOUBLE PRECISION),
  ('FEA_0005', 'Adept of the Red Robes', '2014', 'General', '4th level, Initiate of high sorcery (lunitari) feat', 'None', 'DSotDQ', NULL, 5.0::DOUBLE PRECISION),
  ('FEA_0006', 'Adept of the White Robes', '2014', 'General', '4th level, Initiate of high sorcery (solinari) feat', 'None', 'DSotDQ', NULL, 6.0::DOUBLE PRECISION),
  ('FEA_0007', 'Aerial Expert', '2014', 'General', 'Glide trait', 'None', 'HWCS', NULL, 7.0::DOUBLE PRECISION),
  ('FEA_0008', 'Agent of Order', '2014', 'General', '4th level, scion of the outer planes (lawful outer plane) feat', 'Any +1', 'SATO', NULL, 8.0::DOUBLE PRECISION),
  ('FEA_0009', 'Alert', '2014', 'General', 'None', 'None', 'PHB2014', NULL, 9.0::DOUBLE PRECISION),
  ('FEA_0010', 'Alchemist', '2014', 'General', 'None', 'INT +1', 'UAFT', NULL, 10.0::DOUBLE PRECISION),
  ('FEA_0011', 'Animal Handler', '2014', 'General', 'None', 'WIS +1', 'UAFFS', NULL, 11.0::DOUBLE PRECISION),
  ('FEA_0012', 'Arcanist', '2014', 'General', 'None', 'INT +1', 'UAFFS', '- Your spellcasting ability for these spells is INT
- You can additionally cast Detect Magic with spell slots', 12.0::DOUBLE PRECISION),
  ('FEA_0013', 'Artificer Initiate', '2014', 'Origin', 'None', 'None', 'TCE', 'Can be taken as an Origin feat by 2024 characters', 13.0::DOUBLE PRECISION),
  ('FEA_0014', 'Athlete', '2014', 'General', 'None', 'STR or DEX +1', 'PHB2014', NULL, 14.0::DOUBLE PRECISION),
  ('FEA_0015', 'Bandit Cunning', '2014', 'General', 'None', 'None', 'HWCS', NULL, 15.0::DOUBLE PRECISION),
  ('FEA_0016', 'Baleful Scion', '2014', 'General', '4th level, scion of the outer planes (evil outer plane) feat', 'Any +1', 'SATO', NULL, 16.0::DOUBLE PRECISION),
  ('FEA_0017', 'Blade Mastery', '2014', 'General', 'None', 'None', 'UAFT', 'Also benefits Double-Bladed Scimitars', 17.0::DOUBLE PRECISION),
  ('FEA_0018', 'Bountiful Luck', '2014', 'General', 'Halfling', 'None', 'XGE', NULL, 18.0::DOUBLE PRECISION),
  ('FEA_0019', 'Brawny', '2014', 'General', 'None', 'STR +1', 'UAFFS', NULL, 19.0::DOUBLE PRECISION),
  ('FEA_0020', 'Burglar', '2014', 'General', 'None', 'DEX +1', 'UAFT', NULL, 20.0::DOUBLE PRECISION),
  ('FEA_0021', 'Cartomancer', '2014', 'General', '4th level, Spellcasting or Pact Magic feature', 'None', 'BMT', '- Having either Spellcasting or Pact Magic serves as this feat''s prerequisite.
- You imbue spells as a single classed member of a class e.g. a cleric 1/wizard 4 can''t imbue 3rd-level cleric or wizard spells.
- Casting the imbued spell as a bonus action uses no components but does use a spell slot and obeys all other general spellcasting rules.', 21.0::DOUBLE PRECISION),
  ('FEA_0022', 'Charger', '2014', 'General', 'None', 'None', 'PHB2014', NULL, 22.0::DOUBLE PRECISION),
  ('FEA_0023', 'Chef', '2014', 'General', 'None', 'CON or WIS +1', 'TCE', 'You can use the Prepare Meals option for cook''s utensils (XGE) as part of the same short rest to make the special food.', 23.0::DOUBLE PRECISION),
  ('FEA_0024', 'Cohort of Chaos', '2014', 'General', '4th level, scion of the outer planes (chaotic outer plane) feat', 'Any +1', 'SATO', NULL, 24.0::DOUBLE PRECISION),
  ('FEA_0025', 'Crossbow Expert', '2014', 'General', 'None', 'None', 'PHB2014', NULL, 25.0::DOUBLE PRECISION),
  ('FEA_0026', 'Crusher', '2014', 'General', 'None', 'STR or CON+1', 'TCE', NULL, 26.0::DOUBLE PRECISION),
  ('FEA_0027', 'Defensive Duelist', '2014', 'General', 'DEX 13+', 'None', 'PHB2014', NULL, 27.0::DOUBLE PRECISION),
  ('FEA_0028', 'Diplomat', '2014', 'General', 'None', 'CHA +1', 'UAFFS', 'If you or your companions harm the charmed target, they''re no longer charmed and can''t be charmed via Diplomat again for 1 hour.', 28.0::DOUBLE PRECISION),
  ('FEA_0029', 'Divinely Favored', '2014', 'General', '4th-level', 'None', 'DSotDQ', NULL, 29.0::DOUBLE PRECISION),
  ('FEA_0030', 'Dragon Fear', '2014', 'General', 'Dragonborn', 'STR, CON or CHA +1', 'XGE', NULL, 30.0::DOUBLE PRECISION),
  ('FEA_0031', 'Dragon Hide', '2014', 'General', 'Dragonborn', 'STR, CON or CHA +1', 'XGE', NULL, 31.0::DOUBLE PRECISION),
  ('FEA_0032', 'Drow High Magic', '2014', 'General', 'Elf (Drow)', 'None', 'XGE', '- Your spellcasting ability for these spells is your choice of INT, WIS, or CHA
- You can additionally cast the listed spells with spell slots', 32.0::DOUBLE PRECISION),
  ('FEA_0033', 'Dual Wielder', '2014', 'General', 'None', 'None', 'PHB2014', NULL, 33.0::DOUBLE PRECISION),
  ('FEA_0034', 'Dungeon Delver', '2014', 'Origin', 'None', 'None', 'PHB2014', 'Can be taken as an Origin feat by 2024 characters', 34.0::DOUBLE PRECISION),
  ('FEA_0035', 'Durable', '2014', 'General', 'None', 'CON +1', 'PHB2014', NULL, 35.0::DOUBLE PRECISION),
  ('FEA_0036', 'Dwarf Fortitude', '2014', 'General', 'Dwarf', 'CON +1', 'XGE', NULL, 36.0::DOUBLE PRECISION),
  ('FEA_0037', 'Eldritch Adept', '2014', 'General', 'Spellcasting or Pact Magic feature', 'None', 'TCE', 'The spell save DC for spells you gain this way is the same spell save DC used to qualify for this feat (Spellcasting or Pact Magic).', 37.0::DOUBLE PRECISION),
  ('FEA_0038', 'Elemental Adept', '2014', 'General', 'Spellcasting feature', 'None', 'PHB2014', NULL, 38.0::DOUBLE PRECISION),
  ('FEA_0039', 'Elven Accuracy', '2014', 'General', 'Elf/Half Elf', 'DEX, INT, WIS or CHA +1', 'XGE', NULL, 39.0::DOUBLE PRECISION),
  ('FEA_0040', 'Ember of the Fire Giant', '2014', 'General', '4th level, strike of the giants (fire strike) feat', 'STR, CON, or WIS +1', 'BGG', NULL, 40.0::DOUBLE PRECISION),
  ('FEA_0041', 'Empathic', '2014', 'General', 'None', 'WIS +1', 'UAFFS', NULL, 41.0::DOUBLE PRECISION),
  ('FEA_0042', 'Fade Away', '2014', 'General', 'Gnome', 'DEX or INT +1', 'XGE', NULL, 42.0::DOUBLE PRECISION),
  ('FEA_0043', 'Fell Handed', '2014', 'General', 'None', 'None', 'UAFT', NULL, 43.0::DOUBLE PRECISION),
  ('FEA_0044', 'Flail Mastery', '2014', 'General', 'None', 'None', 'UAFT', NULL, 44.0::DOUBLE PRECISION),
  ('FEA_0045', 'Fey Teleportation', '2014', 'General', 'Elf (High)', 'INT or CHA +1', 'XGE', '- Your spellcasting ability for these spells is your choice of INT, WIS, or CHA
- You can additionally cast Misty Step with spell slots', 45.0::DOUBLE PRECISION),
  ('FEA_0046', 'Fey Touched', '2014', 'General', 'None', 'INT, WIS, or CHA +1', 'TCE', NULL, 46.0::DOUBLE PRECISION),
  ('FEA_0047', 'Field Medic', '2014', 'General', 'None', 'None', 'HWT', '- Your spellcasting ability for these spells is your choice of INT, WIS, or CHA
- You can additionally cast Cure Wounds with spell slots', 47.0::DOUBLE PRECISION),
  ('FEA_0048', 'Fighting Initiate', '2014', 'Origin', 'Proficiency with a martial weapon', 'None', 'TCE', 'Can be used by 2024 characters to acquire a Fighting Style feat.', 48.0::DOUBLE PRECISION),
  ('FEA_0049', 'Flames of Phlegethos', '2014', 'General', 'Tiefling', 'INT or CHA +1', 'XGE', NULL, 49.0::DOUBLE PRECISION),
  ('FEA_0050', 'Flamewoken', '2014', 'General', 'None', 'None', 'HWT', 'Your spellcasting ability for Produce Flame is your choice of INT, WIS, or CHA', 50.0::DOUBLE PRECISION),
  ('FEA_0051', 'Fury of the Frost Giant', '2014', 'General', '4th level, strike of the giants (frost strike) feat', 'STR, CON, or WIS +1', 'BGG', NULL, 51.0::DOUBLE PRECISION),
  ('FEA_0052', 'Gift of the Chromatic Dragon', '2014', 'General', 'None', 'None', 'FTD', NULL, 52.0::DOUBLE PRECISION),
  ('FEA_0053', 'Gift of the Gem Dragon', '2014', 'General', 'None', 'INT, WIS, or CHA +1', 'FTD', NULL, 53.0::DOUBLE PRECISION),
  ('FEA_0054', 'Gift of the Metallic Dragon', '2014', 'General', 'None', 'None', 'FTD', NULL, 54.0::DOUBLE PRECISION),
  ('FEA_0055', 'Gourmand', '2014', 'General', 'None', 'CON +1', 'UAFT', NULL, 55.0::DOUBLE PRECISION),
  ('FEA_0056', 'Grappler', '2014', 'General', 'STR +13', 'None', 'PHB2014', NULL, 56.0::DOUBLE PRECISION),
  ('FEA_0057', 'Great Weapon Master', '2014', 'General', 'None', 'None', 'PHB2014', NULL, 57.0::DOUBLE PRECISION),
  ('FEA_0058', 'Guile of the Cloud Giant', '2014', 'General', '4th level, strike of the giants (cloud strike) feat', 'STR, CON, or CHA +1', 'BGG', NULL, 58.0::DOUBLE PRECISION),
  ('FEA_0059', 'Gunner', '2014', 'General', 'None', 'DEX +1', 'TCE', NULL, 59.0::DOUBLE PRECISION),
  ('FEA_0060', 'Healer', '2014', 'General', 'None', 'None', 'PHB2014', NULL, 60.0::DOUBLE PRECISION),
  ('FEA_0061', 'Heavily Armored', '2014', 'General', 'M. armor proficiency', 'STR +1', 'PHB2014', NULL, 61.0::DOUBLE PRECISION),
  ('FEA_0062', 'Heavy Armor Master', '2014', 'General', 'H. armor proficiency', 'STR +1', 'PHB2014', NULL, 62.0::DOUBLE PRECISION),
  ('FEA_0063', 'Heavy Glider', '2014', 'General', 'Glide trait', 'None', 'HWCS', NULL, 63.0::DOUBLE PRECISION),
  ('FEA_0064', 'Historian', '2014', 'General', 'None', 'INT +1', 'UAFFS', NULL, 64.0::DOUBLE PRECISION),
  ('FEA_0065', 'Infernal Constitution', '2014', 'General', 'Tiefling', 'CON +1', 'XGE', NULL, 65.0::DOUBLE PRECISION),
  ('FEA_0066', 'Initiate of High Sorcery', '2014', 'Origin', 'Sorcerer, Wizard, or Mage of High Sorcery', 'None', 'DSotDQ', 'Can be taken as an Origin feat by 2024 characters', 66.0::DOUBLE PRECISION),
  ('FEA_0067', 'Inspiring Leader', '2014', 'General', 'CHA 13+', 'None', 'PHB2014', NULL, 67.0::DOUBLE PRECISION),
  ('FEA_0068', 'Investigator', '2014', 'General', 'None', 'INT +1', 'UAFFS', NULL, 68.0::DOUBLE PRECISION),
  ('FEA_0069', 'Keen Mind', '2014', 'General', 'None', 'INT +1', 'PHB2014', NULL, 69.0::DOUBLE PRECISION),
  ('FEA_0070', 'Keeness of the Stone Giant', '2014', 'General', '4th level, strike of the giants (stone strike) feat', 'STR, CON, or WIS +1', 'BGG', NULL, 70.0::DOUBLE PRECISION),
  ('FEA_0071', 'Knight of the Crown', '2014', 'General', '4th level, Squire of solamnia feat', 'STR, DEX, or CON +1', 'DSotDQ', NULL, 71.0::DOUBLE PRECISION),
  ('FEA_0072', 'Knight of the Rose', '2014', 'General', '4th level, Squire of solamnia feat', 'CON, WIS, or CHA +1', 'DSotDQ', NULL, 72.0::DOUBLE PRECISION),
  ('FEA_0073', 'Knight of the Sword', '2014', 'General', '4th level, Squire of solamnia feat', 'INT, WIS, or CHA +1', 'DSotDQ', NULL, 73.0::DOUBLE PRECISION),
  ('FEA_0074', 'Lightly Armored', '2014', 'General', 'None', 'STR or DEX +1', 'PHB2014', NULL, 74.0::DOUBLE PRECISION),
  ('FEA_0075', 'Linguist', '2014', 'General', 'None', 'INT +1', 'PHB2014', 'Can''t be used to learn Class Languages such as Druidic or Thieves'' Cant', 75.0::DOUBLE PRECISION),
  ('FEA_0076', 'Lucky', '2014', 'General', 'None', 'None', 'PHB2014', NULL, 76.0::DOUBLE PRECISION),
  ('FEA_0077', 'Mage Slayer', '2014', 'General', 'None', 'None', 'PHB2014', 'The first bullet point is replaced with the following: When you see a creature within 5 feet of you casting a spell with verbal, somatic, or material components, you can use your reaction to make a melee weapon attack against that creature. On a hit, the creature must make a Constitution saving throw, with the DC equal to 10 or half the damage taken, whichever number is higher. On a failed save, the creature''s spell fails and has no effect.', 77.0::DOUBLE PRECISION),
  ('FEA_0078', 'Magic Initiate', '2014', 'General', 'None', 'None', 'PHB2014', '- Your spellcasting ability for these spells is your choice of INT, WIS, or CHA
- You can additionally cast the 1st-level spell with spell slots', 78.0::DOUBLE PRECISION),
  ('FEA_0079', 'Martial Adept', '2014', 'Origin', 'None', 'None', 'PHB2014', 'Can be taken as an Origin feat by 2024 characters', 79.0::DOUBLE PRECISION),
  ('FEA_0080', 'Master of Disguise', '2014', 'General', 'None', 'CHA +1', 'UAFT', NULL, 80.0::DOUBLE PRECISION),
  ('FEA_0081', 'Medic', '2014', 'General', 'None', 'WIS +1', 'UAFFS', NULL, 81.0::DOUBLE PRECISION),
  ('FEA_0082', 'Medium Armor Master', '2014', 'General', 'M. armor proficiency', 'None', 'PHB2014', NULL, 82.0::DOUBLE PRECISION),
  ('FEA_0083', 'Menacing', '2014', 'General', 'None', 'CHA +1', 'UAFFS', NULL, 83.0::DOUBLE PRECISION),
  ('FEA_0084', 'Metamagic Adept', '2014', 'General', 'Spellcasting or Pact Magic', 'None', 'TCE', NULL, 84.0::DOUBLE PRECISION),
  ('FEA_0085', 'Mobile', '2014', 'General', 'None', 'None', 'PHB2014', NULL, 85.0::DOUBLE PRECISION),
  ('FEA_0086', 'Moderately Armored', '2014', 'General', 'L. armor proficiency', 'STR or DEX +1', 'PHB2014', NULL, 86.0::DOUBLE PRECISION),
  ('FEA_0087', 'Mounted Combatant', '2014', 'General', 'None', 'None', 'PHB2014', NULL, 87.0::DOUBLE PRECISION),
  ('FEA_0088', 'Naturalist', '2014', 'General', 'None', 'INT +1', 'UAFFS', '- Your spellcasting ability for these spells is INT
- You can additionally cast Detect Poison and Disease with spell slots', 88.0::DOUBLE PRECISION),
  ('FEA_0089', 'Observant', '2014', 'General', 'None', 'INT or WIS +1', 'PHB2014', NULL, 89.0::DOUBLE PRECISION),
  ('FEA_0090', 'Orcish Fury', '2014', 'General', 'Half-Orc', 'STR or CON +1', 'XGE', NULL, 90.0::DOUBLE PRECISION),
  ('FEA_0091', 'Opportunistic Thief', '2014', 'General', 'None', 'DEX +1', 'HWCS', NULL, 91.0::DOUBLE PRECISION),
  ('FEA_0092', 'Outlands Envoy', '2014', 'General', '4th level, scion of the outer planes (the outlands) feat', 'Any +1', 'SATO', NULL, 92.0::DOUBLE PRECISION),
  ('FEA_0093', 'Perceptive', '2014', 'General', 'None', 'WIS +1', 'UAFFS', NULL, 93.0::DOUBLE PRECISION),
  ('FEA_0094', 'Perfect Landing', '2014', 'General', 'None', 'DEX +1', 'HWCS', NULL, 94.0::DOUBLE PRECISION),
  ('FEA_0095', 'Performer', '2014', 'General', 'None', 'CHA +1', 'UAFFS', NULL, 95.0::DOUBLE PRECISION),
  ('FEA_0096', 'Piercer', '2014', 'General', 'None', 'STR or DEX +1', 'TCE', NULL, 96.0::DOUBLE PRECISION),
  ('FEA_0097', 'Planar Wanderer', '2014', 'General', '4th level, scion of the outer planes feat', 'None', 'SATO', NULL, 97.0::DOUBLE PRECISION),
  ('FEA_0098', 'Plantmender', '2014', 'General', 'None', 'None', 'HWT', '- Your spellcasting ability for these spells is your choice of INT, WIS, or CHA
- You can additionally cast Barkskin or Spike Growth with spell slots', 98.0::DOUBLE PRECISION),
  ('FEA_0099', 'Poisoner', '2014', 'General', 'None', 'None', 'TCE', NULL, 99.0::DOUBLE PRECISION),
  ('FEA_0100', 'Polearm Master', '2014', 'General', 'None', 'None', 'PHB2014', 'A trident can also be used with both options of this feat.', 100.0::DOUBLE PRECISION),
  ('FEA_0101', 'Prodigy', '2014', 'General', 'Half-Elf/Half-Orc/Human', 'None', 'XGE', 'Can''t be used to learn Class Languages such as Druidic or Thieves'' Cant', 101.0::DOUBLE PRECISION),
  ('FEA_0102', 'Quick-Fingered', '2014', 'General', 'None', 'DEX +1', 'UAFFS', NULL, 102.0::DOUBLE PRECISION),
  ('FEA_0103', 'Resilient', '2014', 'General', 'None', 'One +1 of your choice', 'PHB2014', NULL, 103.0::DOUBLE PRECISION),
  ('FEA_0104', 'Revenant Blade', '2014', 'General', 'Double-bladed scimitar proficiency', 'STR or DEX +1', 'ERLW', 'Uses the mechanics of the Revenant Blade feat from ERLW, but the prequisite is changed as listed.', 104.0::DOUBLE PRECISION),
  ('FEA_0105', 'Righetous Heritor', '2014', 'General', '4th level, scion of the outer planes (good outer plane) feat', 'Any +1', 'SATO', NULL, 105.0::DOUBLE PRECISION),
  ('FEA_0106', 'Ritual Caster', '2014', 'General', 'INT/WIS 13+', 'None', 'PHB2014', NULL, 106.0::DOUBLE PRECISION),
  ('FEA_0107', 'Rune Shaper', '2014', 'Origin', 'Spellcasting or Pact Magic Feature', 'None', 'BGG', '- Having either Spellcasting or Pact Magic serves as this feat''s prerequisite.
- Can be taken as an Origin feat by 2024 characters', 107.0::DOUBLE PRECISION),
  ('FEA_0108', 'Savage Attacker', '2014', 'General', 'None', 'None', 'PHB2014', NULL, 108.0::DOUBLE PRECISION),
  ('FEA_0109', 'Scion of the Outer Planes', '2014', 'Origin', 'None', 'None', 'SATO', 'Can be taken as an Origin feat by 2024 characters', 109.0::DOUBLE PRECISION),
  ('FEA_0110', 'Second Chance', '2014', 'General', 'Halfling', 'DEX, CON or CHA +1', 'XGE', NULL, 110.0::DOUBLE PRECISION),
  ('FEA_0111', 'Sentinel', '2014', 'General', 'None', 'None', 'PHB2014', NULL, 111.0::DOUBLE PRECISION),
  ('FEA_0112', 'Shadow Touched', '2014', 'General', 'None', 'INT, WIS, or CHA +1', 'TCE', NULL, 112.0::DOUBLE PRECISION),
  ('FEA_0113', 'Sharpshooter', '2014', 'General', 'None', 'None', 'PHB2014', NULL, 113.0::DOUBLE PRECISION),
  ('FEA_0114', 'Shield Master', '2014', 'General', 'None', 'None', 'PHB2014', 'You can take the bonus action to shove before you take the Attack action.', 114.0::DOUBLE PRECISION),
  ('FEA_0115', 'Silver-Tongued', '2014', 'General', 'None', 'CHA +1', 'UAFFS', NULL, 115.0::DOUBLE PRECISION),
  ('FEA_0116', 'Skilled', '2014', 'General', 'None', 'None', 'PHB2014', NULL, 116.0::DOUBLE PRECISION),
  ('FEA_0117', 'Skill Expert', '2014', 'General', 'None', 'Any +1', 'TCE', NULL, 117.0::DOUBLE PRECISION),
  ('FEA_0118', 'Skulker', '2014', 'General', 'DEX 13+', 'None', 'PHB2014', NULL, 118.0::DOUBLE PRECISION),
  ('FEA_0119', 'Slasher', '2014', 'General', 'None', 'STR or DEX +1', 'TCE', NULL, 119.0::DOUBLE PRECISION),
  ('FEA_0120', 'Soul of the Storm Giant', '2014', 'General', '4th level, strike of the giants (storm strike) feat', 'STR, WIS, or CHA +1', 'BGG', NULL, 120.0::DOUBLE PRECISION),
  ('FEA_0121', 'Spear Mastery', '2014', 'General', 'None', 'None', 'UAFT', 'You can also use a trident with each of this feat''s options.', 121.0::DOUBLE PRECISION),
  ('FEA_0122', 'Speech of the Ancient Beasts', '2014', 'General', 'None', 'CHA +1', 'HWCS', NULL, 122.0::DOUBLE PRECISION),
  ('FEA_0123', 'Spell Sniper', '2014', 'General', 'Spellcasting', 'None', 'PHB2014', 'Your spellcasting ability for these spells is your choice of INT, WIS, or CHA', 123.0::DOUBLE PRECISION),
  ('FEA_0124', 'Squat Nimbleness', '2014', 'General', 'Dwarf/Small race', 'STR or DEX +1', 'XGE', NULL, 124.0::DOUBLE PRECISION),
  ('FEA_0125', 'Squire of Solamnia', '2014', 'Origin', 'Fighter, Paladin, or Knight of Solamnia', 'None', 'DSotDQ', 'Can be taken as an Origin feat by 2024 characters', 125.0::DOUBLE PRECISION),
  ('FEA_0126', 'Stealthy', '2014', 'General', 'None', 'DEX +1', 'UAFFS', NULL, 126.0::DOUBLE PRECISION),
  ('FEA_0127', 'Strike of the Giants', '2014', 'Origin', 'Proficiency with a Martial Weapon or Giant Foundling', 'None', 'BGG', '- Can be taken as an Origin feat by 2024 characters
- Proficiency with at least one martial weapon satsifies this feat''s prerequisite', 127.0::DOUBLE PRECISION),
  ('FEA_0128', 'Strixhaven Initiate', '2014', 'Origin', 'None', 'None', 'SCC', 'Can be taken as an Origin feat by 2024 characters', 128.0::DOUBLE PRECISION),
  ('FEA_0129', 'Strixhaven Mascot', '2014', 'General', '4th-level, Strixhaven Initiate feat', 'None', 'SCC', NULL, 129.0::DOUBLE PRECISION),
  ('FEA_0130', 'Survivalist', '2014', 'General', 'None', 'WIS +1', 'UAFFS', '- Your spellcasting ability for these spells is WIS
- You can additionally cast Alarm with spell slots', 130.0::DOUBLE PRECISION),
  ('FEA_0131', 'Svirfeblin Magic', '2014', 'General', 'Gnome (Deep)', 'None', 'MTF', '- Your spellcasting ability for these spells is your choice of INT, WIS, or CHA
- You can additionally cast the listed spells with spell slots', 131.0::DOUBLE PRECISION),
  ('FEA_0132', 'Tavern Brawler', '2014', 'General', 'None', 'STR or CON +1', 'PHB2014', NULL, 132.0::DOUBLE PRECISION),
  ('FEA_0133', 'Telekinetic', '2014', 'General', 'None', 'INT, WIS, or CHA +1', 'TCE', 'The distance before disappearing for the mage hand created by this feat also increases by 30 feet (to 60 feet).', 133.0::DOUBLE PRECISION),
  ('FEA_0134', 'Telepathic', '2014', 'General', 'None', 'INT, WIS, or CHA +1', 'TCE', NULL, 134.0::DOUBLE PRECISION),
  ('FEA_0135', 'Theologian', '2014', 'General', 'None', 'INT +1', 'UAFFS', '- Your spellcasting ability for these spells is INT
- You can additionally cast Detect Evil and Good with spell slots', 135.0::DOUBLE PRECISION),
  ('FEA_0136', 'Tough', '2014', 'General', 'None', 'None', 'PHB2014', NULL, 136.0::DOUBLE PRECISION),
  ('FEA_0137', 'Vigor of the Hill Giant', '2014', 'General', '4th level, strike of the giants (hill strike) feat', 'STR, CON, or WIS +1', 'BGG', NULL, 137.0::DOUBLE PRECISION),
  ('FEA_0138', 'War Caster', '2014', 'General', 'Spellcasting', 'None', 'PHB2014', NULL, 138.0::DOUBLE PRECISION),
  ('FEA_0139', 'Weapon Master', '2014', 'General', 'None', 'STR or DEX +1', 'PHB2014', NULL, 139.0::DOUBLE PRECISION),
  ('FEA_0140', 'Wood Elf Magic', '2014', 'General', 'Elf (Wood)', 'None', 'XGE', '- Your spellcasting ability for these spells is your choice of INT, WIS, or CHA
- You can additionally cast the listed spells with spell slots', 140.0::DOUBLE PRECISION),
  ('FEA_0141', 'Woodwise', '2014', 'General', 'None', 'None', 'HWCS', NULL, 141.0::DOUBLE PRECISION),
  ('FEA_0142', 'Aerial Expert', '2024', 'Origin', 'Glide trait', 'None', 'HWCS_2024', NULL, 142.0::DOUBLE PRECISION),
  ('FEA_0143', 'Alert', '2024', 'Origin', 'None', 'None', 'PHB2024', NULL, 143.0::DOUBLE PRECISION),
  ('FEA_0144', 'Arcane Artist', '2024', 'Origin', 'None', 'None', 'AU', NULL, 144.0::DOUBLE PRECISION),
  ('FEA_0145', 'Arcane Eloquence', '2024', 'Origin', 'None', 'None', 'AU', NULL, 145.0::DOUBLE PRECISION),
  ('FEA_0146', 'Arcane Infiltrator', '2024', 'Origin', 'None', 'None', 'AU', NULL, 146.0::DOUBLE PRECISION),
  ('FEA_0147', 'Arcane Omens', '2024', 'Origin', 'None', 'None', 'AU', NULL, 147.0::DOUBLE PRECISION),
  ('FEA_0148', 'Arcane Overload', '2024', 'Origin', 'None', 'None', 'AU', NULL, 148.0::DOUBLE PRECISION),
  ('FEA_0149', 'Arcane Safeguard', '2024', 'Origin', 'None', 'None', 'AU', NULL, 149.0::DOUBLE PRECISION),
  ('FEA_0150', 'Arcane Undertaker', '2024', 'Origin', 'None', 'None', 'AU', NULL, 150.0::DOUBLE PRECISION),
  ('FEA_0151', 'Bandit Cunning', '2024', 'Origin', 'None', 'None', 'HWCS_2024', NULL, 151.0::DOUBLE PRECISION),
  ('FEA_0152', 'Child of the Sun', '2024', 'Origin', 'None', 'None', 'LFL', NULL, 152.0::DOUBLE PRECISION),
  ('FEA_0153', 'Crafter', '2024', 'Origin', 'None', 'None', 'PHB2024', '- The discount only applies to equipment or other items that fetch half value when sold.
- Items made with Fast Crafting can''t be sold or traded.', 153.0::DOUBLE PRECISION),
  ('FEA_0154', 'Cult of the Dragon Initiate', '2024', 'Origin', 'None', 'None', 'FRHOF', 'If you already know Draconic, the language chosen can be any language in Allowed Content (Languages) except for Class Languages', 154.0::DOUBLE PRECISION),
  ('FEA_0155', 'Emerald Enclave Fledgling', '2024', 'Origin', 'None', 'None', 'FRHOF', NULL, 155.0::DOUBLE PRECISION),
  ('FEA_0156', 'Familiar Friend', '2024', 'Origin', 'None', 'None', 'AU', NULL, 156.0::DOUBLE PRECISION),
  ('FEA_0157', 'Harper Agent', '2024', 'Origin', 'None', 'None', 'FRHOF', NULL, 157.0::DOUBLE PRECISION),
  ('FEA_0158', 'Healer', '2024', 'Origin', 'None', 'None', 'PHB2024', NULL, 158.0::DOUBLE PRECISION),
  ('FEA_0159', 'Heavy Glider', '2024', 'Origin', 'Glide trait', 'None', 'HWCS_2024', NULL, 159.0::DOUBLE PRECISION),
  ('FEA_0160', 'Lords'' Alliance Agent', '2024', 'Origin', 'None', 'None', 'FRHOF', NULL, 160.0::DOUBLE PRECISION),
  ('FEA_0161', 'Lucky', '2024', 'Origin', 'None', 'None', 'PHB2024', NULL, 161.0::DOUBLE PRECISION),
  ('FEA_0162', 'Magic Initiate', '2024', 'Origin', 'None', 'None', 'PHB2024', NULL, 162.0::DOUBLE PRECISION),
  ('FEA_0163', 'Musician', '2024', 'Origin', 'None', 'None', 'PHB2024', NULL, 163.0::DOUBLE PRECISION),
  ('FEA_0164', 'Opportunistic Thief', '2024', 'Origin', 'None', 'None', 'HWCS_2024', NULL, 164.0::DOUBLE PRECISION),
  ('FEA_0165', 'Perfect Landing', '2024', 'Origin', 'None', 'None', 'HWCS_2024', NULL, 165.0::DOUBLE PRECISION),
  ('FEA_0166', 'Portal Jumper', '2024', 'Origin', 'None', 'None', 'AU', NULL, 166.0::DOUBLE PRECISION),
  ('FEA_0167', 'Purple Dragon Rook', '2024', 'Origin', 'None', 'None', 'FRHOF', NULL, 167.0::DOUBLE PRECISION),
  ('FEA_0168', 'Savage Attacker', '2024', 'Origin', 'None', 'None', 'PHB2024', NULL, 168.0::DOUBLE PRECISION),
  ('FEA_0169', 'Shadowmoor Hexer', '2024', 'Origin', 'None', 'None', 'LFL', NULL, 169.0::DOUBLE PRECISION),
  ('FEA_0170', 'Sharp Eye', '2024', 'Origin', 'None', 'None', 'RHW', NULL, 170.0::DOUBLE PRECISION),
  ('FEA_0171', 'Speech of the Ancient Beasts', '2024', 'Origin', 'None', 'None', 'HWCS_2024', NULL, 171.0::DOUBLE PRECISION),
  ('FEA_0172', 'Spellfire Spark', '2024', 'Origin', 'None', 'None', 'FRHOF', NULL, 172.0::DOUBLE PRECISION),
  ('FEA_0173', 'Skilled', '2024', 'Origin', 'None', 'None', 'PHB2024', NULL, 173.0::DOUBLE PRECISION),
  ('FEA_0174', 'Survivor', '2024', 'Origin', 'None', 'None', 'RHW', NULL, 174.0::DOUBLE PRECISION),
  ('FEA_0175', 'Tavern Brawler', '2024', 'Origin', 'None', 'None', 'PHB2024', NULL, 175.0::DOUBLE PRECISION),
  ('FEA_0176', 'Tireless Reveler', '2024', 'Origin', 'None', 'None', 'ABH', NULL, 176.0::DOUBLE PRECISION),
  ('FEA_0177', 'Transmuted Anatomy', '2024', 'Origin', 'None', 'None', 'AU', NULL, 177.0::DOUBLE PRECISION),
  ('FEA_0178', 'Tough', '2024', 'Origin', 'None', 'None', 'PHB2024', NULL, 178.0::DOUBLE PRECISION),
  ('FEA_0179', 'Tyro of the Gauntlet', '2024', 'Origin', 'None', 'None', 'FRHOF', NULL, 179.0::DOUBLE PRECISION),
  ('FEA_0180', 'Vampire Hunter', '2024', 'Origin', 'None', 'None', 'ABH', NULL, 180.0::DOUBLE PRECISION),
  ('FEA_0181', 'Vampire Plaything', '2024', 'Origin', 'None', 'None', 'ABH', 'The Potion of Healing or Antitoxin created can''t be sold or traded.', 181.0::DOUBLE PRECISION),
  ('FEA_0182', 'Woodwise', '2024', 'Origin', 'None', 'None', 'HWCS_2024', NULL, 182.0::DOUBLE PRECISION),
  ('FEA_0183', 'Zhentarim Ruffian', '2024', 'Origin', 'None', 'None', 'FRHOF', NULL, 183.0::DOUBLE PRECISION),
  ('FEA_0184', 'Aberrant Anatomy', '2024', 'Dark Gift', 'None', 'None', 'RHW', '- If you receive the benefit of Aberrant Anatomy as a Dark Gift (Supernatural Reward) while you already have it as a Dark Gift feat, you only gain the benefit of one at a time.
- As written, you can also gain this Dark Gift feat anytime you could gain an Origin feat.', 184.0::DOUBLE PRECISION),
  ('FEA_0185', 'Echoing Soul', '2024', 'Dark Gift', 'None', 'None', 'RHW', '- If you receive the benefit of Echoing Soul as a Dark Gift (Supernatural Reward) while you already have it as a Dark Gift feat, you only gain the benefit of one at a time.
- As written, you can also gain this Dark Gift feat anytime you could gain an Origin feat.', 185.0::DOUBLE PRECISION),
  ('FEA_0186', 'Gathered Whispers', '2024', 'Dark Gift', 'None', 'None', 'RHW', '- If you receive the benefit of Gathered Whispers as a Dark Gift (Supernatural Reward) while you already have it as a Dark Gift feat, you only gain the benefit of one at a time.
- As written, you can also gain this Dark Gift feat anytime you could gain an Origin feat.', 186.0::DOUBLE PRECISION),
  ('FEA_0187', 'Living Shadow', '2024', 'Dark Gift', 'None', 'None', 'RHW', '- If you receive the benefit of Living Shadow as a Dark Gift (Supernatural Reward) while you already have it as a Dark Gift feat, you only gain the benefit of one at a time.
- As written, you can also gain this Dark Gift feat anytime you could gain an Origin feat.', 187.0::DOUBLE PRECISION),
  ('FEA_0188', 'Mist Walker', '2024', 'Dark Gift', 'None', 'None', 'RHW', '- If you receive the benefit of Mist Walker as a Dark Gift (Supernatural Reward) while you already have it as a Dark Gift feat, you only gain the benefit of one at a time.
- As written, you can also gain this Dark Gift feat anytime you could gain an Origin feat.', 188.0::DOUBLE PRECISION),
  ('FEA_0189', 'Second Skin', '2024', 'Dark Gift', 'None', 'None', 'RHW', '- If you receive the benefit of Second Skin as a Dark Gift (Supernatural Reward) while you already have it as a Dark Gift feat, you only gain the benefit of one at a time.
- As written, you can also gain this Dark Gift feat anytime you could gain an Origin feat.', 189.0::DOUBLE PRECISION),
  ('FEA_0190', 'Symbiotic Being', '2024', 'Dark Gift', 'None', 'None', 'RHW', '- If you receive the benefit of Symbiotic Being as a Dark Gift (Supernatural Reward) while you already have it as a Dark Gift feat, you only gain the benefit of one at a time.
- As written, you can also gain this Dark Gift feat anytime you could gain an Origin feat.', 190.0::DOUBLE PRECISION),
  ('FEA_0191', 'Touch of Death', '2024', 'Dark Gift', 'None', 'None', 'RHW', '- If you receive the benefit of Touch of Death (RHW) as a Dark Gift (Supernatural Reward) while you already have it as a Dark Gift feat, you only gain the benefit of one at a time.
- As written, you can also gain this Dark Gift feat anytime you could gain an Origin feat.', 191.0::DOUBLE PRECISION),
  ('FEA_0192', 'Watchers', '2024', 'Dark Gift', 'None', 'None', 'RHW', '- If you receive the benefit of Watchers as a Dark Gift (Supernatural Reward) while you already have it as a Dark Gift feat, you only gain the benefit of one at a time.
- As written, you can also gain this Dark Gift feat anytime you could gain an Origin feat.', 192.0::DOUBLE PRECISION),
  ('FEA_0193', 'Aberrant Dragonmark', '2024', 'Dragonmark', 'Can''t have another dragonmarked feat or be a dragonmarked race', 'None', 'EFA', '- This feat can''t be taken by 2024 PCs that are a dragonmarked race from Eberron: Rising from the Last War
- Details on "spellmarked" as specifically originating from Toril can be found in Hawthorne Arcana
- When customizing a background for a 2024 PC and selecting an Origin feat, you can choose to instead take this Dragonmark Feat as a starting feat for that background', 193.0::DOUBLE PRECISION),
  ('FEA_0194', 'Mark of Detection', '2024', 'Dragonmark', 'Can''t have another dragonmarked feat or be a dragonmarked race', 'None', 'EFA', '- This feat can''t be taken by 2024 PCs that are a dragonmarked race from Eberron: Rising from the Last War
- Details on "spellmarked" as specifically originating from Toril can be found in Hawthorne Arcana
- When customizing a background for a 2024 PC and selecting an Origin feat, you can choose to instead take this Dragonmark Feat as a starting feat for that background', 194.0::DOUBLE PRECISION),
  ('FEA_0195', 'Mark of Finding', '2024', 'Dragonmark', 'Can''t have another dragonmarked feat or be a dragonmarked race', 'None', 'EFA', '- This feat can''t be taken by 2024 PCs that are a dragonmarked race from Eberron: Rising from the Last War
- Details on "spellmarked" as specifically originating from Toril can be found in Hawthorne Arcana
- When customizing a background for a 2024 PC and selecting an Origin feat, you can choose to instead take this Dragonmark Feat as a starting feat for that background', 195.0::DOUBLE PRECISION),
  ('FEA_0196', 'Mark of Handling', '2024', 'Dragonmark', 'Can''t have another dragonmarked feat or be a dragonmarked race', 'None', 'EFA', '- This feat can''t be taken by 2024 PCs that are a dragonmarked race from Eberron: Rising from the Last War
- Details on "spellmarked" as specifically originating from Toril can be found in Hawthorne Arcana
- When customizing a background for a 2024 PC and selecting an Origin feat, you can choose to instead take this Dragonmark Feat as a starting feat for that background', 196.0::DOUBLE PRECISION),
  ('FEA_0197', 'Mark of Healing', '2024', 'Dragonmark', 'Can''t have another dragonmarked feat or be a dragonmarked race', 'None', 'EFA', '- This feat can''t be taken by 2024 PCs that are a dragonmarked race from Eberron: Rising from the Last War
- Details on "spellmarked" as specifically originating from Toril can be found in Hawthorne Arcana
- When customizing a background for a 2024 PC and selecting an Origin feat, you can choose to instead take this Dragonmark Feat as a starting feat for that background', 197.0::DOUBLE PRECISION),
  ('FEA_0198', 'Mark of Hospitality', '2024', 'Dragonmark', 'Can''t have another dragonmarked feat or be a dragonmarked race', 'None', 'EFA', '- This feat can''t be taken by 2024 PCs that are a dragonmarked race from Eberron: Rising from the Last War
- Details on "spellmarked" as specifically originating from Toril can be found in Hawthorne Arcana
- When customizing a background for a 2024 PC and selecting an Origin feat, you can choose to instead take this Dragonmark Feat as a starting feat for that background', 198.0::DOUBLE PRECISION),
  ('FEA_0199', 'Mark of Making', '2024', 'Dragonmark', 'Can''t have another dragonmarked feat or be a dragonmarked race', 'None', 'EFA', '- This feat can''t be taken by 2024 PCs that are a dragonmarked race from Eberron: Rising from the Last War
- Details on "spellmarked" as specifically originating from Toril can be found in Hawthorne Arcana
- When customizing a background for a 2024 PC and selecting an Origin feat, you can choose to instead take this Dragonmark Feat as a starting feat for that background', 199.0::DOUBLE PRECISION),
  ('FEA_0200', 'Mark of Passage', '2024', 'Dragonmark', 'Can''t have another dragonmarked feat or be a dragonmarked race', 'None', 'EFA', '- This feat can''t be taken by 2024 PCs that are a dragonmarked race from Eberron: Rising from the Last War
- Details on "spellmarked" as specifically originating from Toril can be found in Hawthorne Arcana
- When customizing a background for a 2024 PC and selecting an Origin feat, you can choose to instead take this Dragonmark Feat as a starting feat for that background', 200.0::DOUBLE PRECISION),
  ('FEA_0201', 'Mark of Scribing', '2024', 'Dragonmark', 'Can''t have another dragonmarked feat or be a dragonmarked race', 'None', 'EFA', '- This feat can''t be taken by 2024 PCs that are a dragonmarked race from Eberron: Rising from the Last War
- Details on "spellmarked" as specifically originating from Toril can be found in Hawthorne Arcana
- When customizing a background for a 2024 PC and selecting an Origin feat, you can choose to instead take this Dragonmark Feat as a starting feat for that background', 201.0::DOUBLE PRECISION),
  ('FEA_0202', 'Mark of Sentinel', '2024', 'Dragonmark', 'Can''t have another dragonmarked feat or be a dragonmarked race', 'None', 'EFA', '- This feat can''t be taken by 2024 PCs that are a dragonmarked race from Eberron: Rising from the Last War
- Details on "spellmarked" as specifically originating from Toril can be found in Hawthorne Arcana
- When customizing a background for a 2024 PC and selecting an Origin feat, you can choose to instead take this Dragonmark Feat as a starting feat for that background', 202.0::DOUBLE PRECISION),
  ('FEA_0203', 'Mark of Shadow', '2024', 'Dragonmark', 'Can''t have another dragonmarked feat or be a dragonmarked race', 'None', 'EFA', '- This feat can''t be taken by 2024 PCs that are a dragonmarked race from Eberron: Rising from the Last War
- Details on "spellmarked" as specifically originating from Toril can be found in Hawthorne Arcana
- When customizing a background for a 2024 PC and selecting an Origin feat, you can choose to instead take this Dragonmark Feat as a starting feat for that background', 203.0::DOUBLE PRECISION),
  ('FEA_0204', 'Mark of Storm', '2024', 'Dragonmark', 'Can''t have another dragonmarked feat or be a dragonmarked race', 'None', 'EFA', '- This feat can''t be taken by 2024 PCs that are a dragonmarked race from Eberron: Rising from the Last War
- Details on "spellmarked" as specifically originating from Toril can be found in Hawthorne Arcana
- When customizing a background for a 2024 PC and selecting an Origin feat, you can choose to instead take this Dragonmark Feat as a starting feat for that background', 204.0::DOUBLE PRECISION),
  ('FEA_0205', 'Mark of Warding', '2024', 'Dragonmark', 'Can''t have another dragonmarked feat or be a dragonmarked race', 'None', 'EFA', '- This feat can''t be taken by 2024 PCs that are a dragonmarked race from Eberron: Rising from the Last War
- Details on "spellmarked" as specifically originating from Toril can be found in Hawthorne Arcana
- When customizing a background for a 2024 PC and selecting an Origin feat, you can choose to instead take this Dragonmark Feat as a starting feat for that background', 205.0::DOUBLE PRECISION),
  ('FEA_0206', 'Ability Score Improvement', '2024', 'General', 'Level 4+', 'Any +2 or any two +1/+1', 'PHB2024', NULL, 206.0::DOUBLE PRECISION),
  ('FEA_0207', 'Abjuration Adept', '2024', 'General', 'Level 4+, Spellcasting or Pact Magic', 'INT, WIS, or CHA +1', 'AU', NULL, 207.0::DOUBLE PRECISION),
  ('FEA_0208', 'Actor', '2024', 'General', 'Level 4+, CHA 13+', 'CHA +1', 'PHB2024', NULL, 208.0::DOUBLE PRECISION),
  ('FEA_0209', 'Athlete', '2024', 'General', 'Level 4+, STR or DEX 13+', 'STR or DEX +1', 'PHB2024', NULL, 209.0::DOUBLE PRECISION),
  ('FEA_0210', 'Bloodlust', '2024', 'General', 'Level 4+', 'STR, DEX, or CON +1', 'ABH', NULL, 210.0::DOUBLE PRECISION),
  ('FEA_0211', 'Bomber', '2024', 'General', 'Level 4+', 'DEX +1', 'ABH', NULL, 211.0::DOUBLE PRECISION),
  ('FEA_0212', 'Brutal Grip', '2024', 'General', 'Level 4+, STR 13+', 'STR +1', 'VSS_PP', NULL, 212.0::DOUBLE PRECISION),
  ('FEA_0213', 'Charger', '2024', 'General', 'Level 4+, STR or DEX 13+', 'STR or DEX +1', 'PHB2024', NULL, 213.0::DOUBLE PRECISION),
  ('FEA_0214', 'Chef', '2024', 'General', 'Level 4+', 'CON or WIS +1', 'PHB2024', 'You can use the Prepare Meals option for cook''s utensils (XGE) as part of the same short rest to make the special food.', 214.0::DOUBLE PRECISION),
  ('FEA_0215', 'Cloying Mists', '2024', 'General', 'Level 4+', 'INT, WIS, or CHA +1', 'ABH', NULL, 215.0::DOUBLE PRECISION),
  ('FEA_0216', 'Cold Caster', '2024', 'General', 'Level 4+', 'INT, WIS, or CHA +1', 'FRHOF', NULL, 216.0::DOUBLE PRECISION),
  ('FEA_0217', 'Conjuration Adept', '2024', 'General', 'Level 4+, Spellcasting or Pact Magic', 'INT, WIS, or CHA +1', 'AU', NULL, 217.0::DOUBLE PRECISION),
  ('FEA_0218', 'Crossbow Expert', '2024', 'General', 'Level 4+, DEX 13+', 'DEX +1', 'PHB2024', NULL, 218.0::DOUBLE PRECISION),
  ('FEA_0219', 'Crusher', '2024', 'General', 'Level 4+', 'STR or CON +1', 'PHB2024', NULL, 219.0::DOUBLE PRECISION),
  ('FEA_0220', 'Defensive Duelist', '2024', 'General', 'Level 4+, DEX 13+', 'DEX +1', 'PHB2024', NULL, 220.0::DOUBLE PRECISION),
  ('FEA_0221', 'Delicious Pain', '2024', 'General', 'Level 4+', 'Any +1', 'ABH', NULL, 221.0::DOUBLE PRECISION),
  ('FEA_0222', 'Divination Adept', '2024', 'General', 'Level 4+, Spellcasting or Pact Magic', 'INT, WIS, or CHA +1', 'AU', NULL, 222.0::DOUBLE PRECISION),
  ('FEA_0223', 'Dragonscarred', '2024', 'General', 'Level 4+, Cult of the Dragon Initiate Feat', 'CON or CHA +1', 'FRHOF', NULL, 223.0::DOUBLE PRECISION),
  ('FEA_0224', 'Dual Wielder', '2024', 'General', 'Level 4+, STR or DEX 13+', 'STR or DEX +1', 'PHB2024', NULL, 224.0::DOUBLE PRECISION),
  ('FEA_0225', 'Durable', '2024', 'General', 'Level 4+', 'CON +1', 'PHB2024', NULL, 225.0::DOUBLE PRECISION),
  ('FEA_0226', 'Elemental Adept', '2024', 'General', 'Level 4+, Spellcasting or Pact Magic', 'INT, WIS, or CHA +1', 'PHB2024', NULL, 226.0::DOUBLE PRECISION),
  ('FEA_0227', 'Elemental Familiar', '2024', 'General', 'Level 4+, Familiar Friend Feat', 'Any +1', 'AU', NULL, 227.0::DOUBLE PRECISION),
  ('FEA_0228', 'Enchantment Adept', '2024', 'General', 'Level 4+, Spellcasting or Pact Magic', 'INT, WIS, or CHA +1', 'AU', NULL, 228.0::DOUBLE PRECISION),
  ('FEA_0229', 'Enclave Magic', '2024', 'General', 'Level 4+, Emerald Enclave Fledgling Feat', 'INT, WIS, or CHA +1', 'FRHOF', NULL, 229.0::DOUBLE PRECISION),
  ('FEA_0230', 'Evocation Adept', '2024', 'General', 'Level 4+, Spellcasting or Pact Magic', 'INT, WIS, or CHA +1', 'AU', NULL, 230.0::DOUBLE PRECISION),
  ('FEA_0231', 'Fairy Trickster', '2024', 'General', 'Level 4+', 'DEX or CHA +1', 'FRHOF', NULL, 231.0::DOUBLE PRECISION),
  ('FEA_0232', 'Fey-Touched', '2024', 'General', 'Level 4+', 'INT, WIS, or CHA +1', 'PHB2024', NULL, 232.0::DOUBLE PRECISION),
  ('FEA_0233', 'Field Commander', '2024', 'General', 'Level 4+, CHA 13+', 'CHA +1', 'VSS_PP', 'An ally commanded to take the Dash action as a Reaction can choose to instead take a Reaction to move up to their speed.', 233.0::DOUBLE PRECISION),
  ('FEA_0234', 'Focused Critical', '2024', 'General', 'Level 4+', 'STR or DEX +1', 'VSS_PP', NULL, 234.0::DOUBLE PRECISION),
  ('FEA_0235', 'Genie Magic', '2024', 'General', 'Level 4+', 'INT, WIS, or CHA +1', 'FRHOF', NULL, 235.0::DOUBLE PRECISION),
  ('FEA_0236', 'Grappler', '2024', 'General', 'Level 4+, STR or DEX 13+', 'STR or DEX +1', 'PHB2024', NULL, 236.0::DOUBLE PRECISION),
  ('FEA_0237', 'Great Weapon Master', '2024', 'General', 'Level 4+, STR 13+', 'STR +1', 'PHB2024', NULL, 237.0::DOUBLE PRECISION),
  ('FEA_0238', 'Greater Aberrant Mark', '2024', 'General', 'Level 4+, Aberrant Dragonmark Feat', 'CON +1', 'EFA', NULL, 238.0::DOUBLE PRECISION),
  ('FEA_0239', 'Greater Mark of Detection', '2024', 'General', 'Level 4+, Mark of Detection Feat or Half-Elf (Mark of Detection) Race', 'Any +1', 'EFA', 'A 2024 PC that is a Half-Elf (Mark of Detection) from Eberron: Rising from the Last War also satisfies this feat''s prerequisite.', 239.0::DOUBLE PRECISION),
  ('FEA_0240', 'Greater Mark of Finding', '2024', 'General', 'Level 4+, Mark of Finding Feat or Half-Orc (Mark of Finding) race or Human (Mark of Finding) race', 'Any +1', 'EFA', 'A 2024 PC that is a Half-Orc (Mark of Finding) or Human (Mark of Finding) from Eberron: Rising from the Last War also satisfies this feat''s prerequisite.', 240.0::DOUBLE PRECISION),
  ('FEA_0241', 'Greater Mark of Handling', '2024', 'General', 'Level 4+, Mark of Handling Feat or Human (Mark of Handling) race', 'Any +1', 'EFA', 'A 2024 PC that is a Human (Mark of Handling) from Eberron: Rising from the Last War also satisfies this feat''s prerequisite.', 241.0::DOUBLE PRECISION),
  ('FEA_0242', 'Greater Mark of Healing', '2024', 'General', 'Level 4+, Mark of Healing Feat or Halfling (Mark of Healing) race', 'Any +1', 'EFA', 'A 2024 PC that is a Halfling (Mark of Healing) from Eberron: Rising from the Last War also satisfies this feat''s prerequisite.', 242.0::DOUBLE PRECISION),
  ('FEA_0243', 'Greater Mark of Hospitality', '2024', 'General', 'Level 4+, Mark of Hospitality Feat or Halfling (Mark of Hospitality) race', 'Any +1', 'EFA', 'A 2024 PC that is a Halfling (Mark of Hospitality) from Eberron: Rising from the Last War also satisfies this feat''s prerequisite.', 243.0::DOUBLE PRECISION),
  ('FEA_0244', 'Greater Mark of Making', '2024', 'General', 'Level 4+, Mark of Making Feat or Human (Mark of Making) race', 'Any +1', 'EFA', 'A 2024 PC that is a Human (Mark of Making) from Eberron: Rising from the Last War also satisfies this feat''s prerequisite.', 244.0::DOUBLE PRECISION),
  ('FEA_0245', 'Greater Mark of Passage', '2024', 'General', 'Level 4+, Mark of Passage Feat or Human (Mark of Passage) race', 'Any +1', 'EFA', 'A 2024 PC that is a Human (Mark of Passage) from Eberron: Rising from the Last War also satisfies this feat''s prerequisite.', 245.0::DOUBLE PRECISION),
  ('FEA_0246', 'Greater Mark of Scribing', '2024', 'General', 'Level 4+, Mark of Scribing Feat or Gnome (Mark of Scribing) race', 'Any +1', 'EFA', 'A 2024 PC that is a Gnome (Mark of Scribing) from Eberron: Rising from the Last War also satisfies this feat''s prerequisite.', 246.0::DOUBLE PRECISION),
  ('FEA_0247', 'Greater Mark of Sentinel', '2024', 'General', 'Level 4+, Mark of Sentinel Feat or Human (Mark of Sentinel) race', 'Any +1', 'EFA', 'A 2024 PC that is a Human (Mark of Sentinel) from Eberron: Rising from the Last War also satisfies this feat''s prerequisite.', 247.0::DOUBLE PRECISION),
  ('FEA_0248', 'Greater Mark of Shadow', '2024', 'General', 'Level 4+, Mark of Shadow Feat or Elf (Mark of Shadow) race', 'Any +1', 'EFA', 'A 2024 PC that is an Elf (Mark of Shadow) from Eberron: Rising from the Last War also satisfies this feat''s prerequisite.', 248.0::DOUBLE PRECISION),
  ('FEA_0249', 'Greater Mark of Storm', '2024', 'General', 'Level 4+, Mark of Storm Feat or Half-Elf (Mark of Storm) race', 'Any +1', 'EFA', 'A 2024 PC that is a Half-Elf (Mark of Storm) from Eberron: Rising from the Last War also satisfies this feat''s prerequisite.', 249.0::DOUBLE PRECISION),
  ('FEA_0250', 'Greater Mark of Warding', '2024', 'General', 'Level 4+, Mark of Warding or Dwarf (Mark of Warding) race', 'Any +1', 'EFA', 'A 2024 PC that is a Dwarf (Mark of Warding) from Eberron: Rising from the Last War also satisfies this feat''s prerequisite.', 250.0::DOUBLE PRECISION),
  ('FEA_0251', 'Harper Teamwork', '2024', 'General', 'Level 4+, Harper Agent Feat', 'DEX or CHA +1', 'FRHOF', NULL, 251.0::DOUBLE PRECISION),
  ('FEA_0252', 'Heavily Armored', '2024', 'General', 'Level 4+, Medium Armor Training', 'STR or CON +1', 'PHB2024', NULL, 252.0::DOUBLE PRECISION),
  ('FEA_0253', 'Heavy Armor Master', '2024', 'General', 'Level 4+, Heavy Armor Training', 'STR or CON +1', 'PHB2024', NULL, 253.0::DOUBLE PRECISION),
  ('FEA_0254', 'Illusion Adept', '2024', 'General', 'Level 4+, Spellcasting or Pact Magic', 'INT, WIS, or CHA +1', 'AU', NULL, 254.0::DOUBLE PRECISION),
  ('FEA_0255', 'Inspiring Leader', '2024', 'General', 'Level 4+, WIS or CHA 13+', 'WIS or CHA +1', 'PHB2024', NULL, 255.0::DOUBLE PRECISION),
  ('FEA_0256', 'Keen Mind', '2024', 'General', 'Level 4+, INT 13+', 'INT +1', 'PHB2024', NULL, 256.0::DOUBLE PRECISION),
  ('FEA_0257', 'Light Bringer', '2024', 'General', 'Level 4+', 'INT, WIS, or CHA +1', 'ABH', NULL, 257.0::DOUBLE PRECISION),
  ('FEA_0258', 'Lightly Armored', '2024', 'General', 'Level 4+', 'STR or DEX +1', 'PHB2024', NULL, 258.0::DOUBLE PRECISION),
  ('FEA_0259', 'Lordly Resolve', '2024', 'General', 'Level 4+, Lords'' Alliance Agent Feat', 'STR or CHA +1', 'FRHOF', NULL, 259.0::DOUBLE PRECISION),
  ('FEA_0260', 'Love Bites', '2024', 'General', 'Level 4+', 'Any +1', 'ABH', NULL, 260.0::DOUBLE PRECISION),
  ('FEA_0261', 'Mage Slayer', '2024', 'General', 'Level 4+', 'STR or DEX +1', 'PHB2024', NULL, 261.0::DOUBLE PRECISION),
  ('FEA_0262', 'Magic Connoisseur', '2024', 'General', 'Level 4+, Magic Initiate Feat', 'INT, WIS, or CHA +1', 'AU', NULL, 262.0::DOUBLE PRECISION),
  ('FEA_0263', 'Martial Weapon Training', '2024', 'General', 'Level 4+', 'STR or DEX +1', 'PHB2024', NULL, 263.0::DOUBLE PRECISION),
  ('FEA_0264', 'Medium Armor Master', '2024', 'General', 'Level 4+, Medium Armor Training', 'STR or DEX +1', 'PHB2024', NULL, 264.0::DOUBLE PRECISION),
  ('FEA_0265', 'Moderately Armored', '2024', 'General', 'Level 4+, Light Armor Training', 'STR or DEX +1', 'PHB2024', NULL, 265.0::DOUBLE PRECISION),
  ('FEA_0266', 'Mounted Combatant', '2024', 'General', 'Level 4+', 'STR, DEX, or WIS +1', 'PHB2024', NULL, 266.0::DOUBLE PRECISION),
  ('FEA_0267', 'Mythal Touched', '2024', 'General', 'Level 4+', 'INT, WIS, or CHA +1', 'FRHOF', NULL, 267.0::DOUBLE PRECISION),
  ('FEA_0268', 'Necromancy Adept', '2024', 'General', 'Level 4+, Spellcasting or Pact Magic', 'INT, WIS, or CHA +1', 'AU', NULL, 268.0::DOUBLE PRECISION),
  ('FEA_0269', 'Observant', '2024', 'General', 'Level 4+, INT or WIS 13+', 'INT or WIS +1', 'PHB2024', NULL, 269.0::DOUBLE PRECISION),
  ('FEA_0270', 'Order''s Resilience', '2024', 'General', 'Level 4+, Tyro of the Gauntlet Feat', 'STR, WIS, or CHA +1', 'FRHOF', NULL, 270.0::DOUBLE PRECISION),
  ('FEA_0271', 'Otherworldly Familiar', '2024', 'General', 'Level 4+, Familiar Friend Feat', 'Any +1', 'AU', NULL, 271.0::DOUBLE PRECISION),
  ('FEA_0272', 'Piercer', '2024', 'General', 'Level 4+', 'STR or DEX +1', 'PHB2024', NULL, 272.0::DOUBLE PRECISION),
  ('FEA_0273', 'Poisoner', '2024', 'General', 'Level 4+', 'DEX or INT +1', 'PHB2024', NULL, 273.0::DOUBLE PRECISION),
  ('FEA_0274', 'Polearm Master', '2024', 'General', 'Level 4+, STR or DEX 13+', 'STR or DEX +1', 'PHB2024', NULL, 274.0::DOUBLE PRECISION),
  ('FEA_0275', 'Potent Dragonmark', '2024', 'General', 'Level 4+, Any Dragonmark Feat or Any Dragonmark Race', 'Dragonmark Feat Spellcasting Ability +1', 'EFA', '- A 2024 PC that is a dragonmarked race from Eberron: Rising from the Last War also satisfies this feat''s prerequisite. The feat grants +1 to the ability score you use for the race''s racial spells feature.', 275.0::DOUBLE PRECISION),
  ('FEA_0276', 'Purple Dragon Commandant', '2024', 'General', 'Level 4+, Purple Dragon Rook Feat or Martial Weapon Proficiency', 'STR or DEX +1', 'FRHOF', NULL, 276.0::DOUBLE PRECISION),
  ('FEA_0277', 'Putrefy', '2024', 'General', 'Level 4+', 'Any +1', 'ABH', NULL, 277.0::DOUBLE PRECISION),
  ('FEA_0278', 'Rebuke', '2024', 'General', 'Level 4+', 'Any +1', 'ABH', NULL, 278.0::DOUBLE PRECISION),
  ('FEA_0279', 'Resilient', '2024', 'General', 'Level 4+', 'One +1 of your choice', 'PHB2024', NULL, 279.0::DOUBLE PRECISION),
  ('FEA_0280', 'Ritual Caster', '2024', 'General', 'Level 4+; INT, WIS, or CHA 13+', 'INT, WIS, or CHA +1', 'PHB2024', NULL, 280.0::DOUBLE PRECISION),
  ('FEA_0281', 'Sentinel', '2024', 'General', 'Level 4+, STR or DEX 13+', 'STR or DEX +1', 'PHB2024', NULL, 281.0::DOUBLE PRECISION),
  ('FEA_0282', 'Shadow Touched', '2024', 'General', 'Level 4+', 'INT, WIS, or CHA +1', 'PHB2024', NULL, 282.0::DOUBLE PRECISION),
  ('FEA_0283', 'Sharpshooter', '2024', 'General', 'Level 4+, DEX 13+', 'DEX +1', 'PHB2024', NULL, 283.0::DOUBLE PRECISION),
  ('FEA_0284', 'Shield Master', '2024', 'General', 'Level 4+, Shield Training', 'STR +1', 'PHB2024', NULL, 284.0::DOUBLE PRECISION),
  ('FEA_0285', 'Skill Expert', '2024', 'General', 'Level 4+', 'Any +1', 'PHB2024', NULL, 285.0::DOUBLE PRECISION),
  ('FEA_0286', 'Skulker', '2024', 'General', 'Level 4+, DEX 13+', 'DEX +1', 'PHB2024', NULL, 286.0::DOUBLE PRECISION),
  ('FEA_0287', 'Slasher', '2024', 'General', 'Level 4+', 'STR or DEX +1', 'PHB2024', NULL, 287.0::DOUBLE PRECISION),
  ('FEA_0288', 'Soothing Familiar', '2024', 'General', 'Level 4+, Familiar Friend Feat', 'Any +1', 'AU', NULL, 288.0::DOUBLE PRECISION),
  ('FEA_0289', 'Speedy', '2024', 'General', 'Level 4+, DEX or CON 13+', 'DEX or CON +1', 'PHB2024', 'Replaces the Mobile feat from PHB 2014.', 289.0::DOUBLE PRECISION),
  ('FEA_0290', 'Spell Resistant', '2024', 'General', 'Level 4+', 'DEX or CON +1', 'AU', NULL, 290.0::DOUBLE PRECISION),
  ('FEA_0291', 'Spell Subterfuge', '2024', 'General', 'Level 4+, Spellcasting or Pact Magic', 'INT, WIS, or CHA +1', 'AU', NULL, 291.0::DOUBLE PRECISION),
  ('FEA_0292', 'Spell Sniper', '2024', 'General', 'Level 4+, Spellcasting or Pact Magic', 'INT, WIS, or CHA +1', 'PHB2024', NULL, 292.0::DOUBLE PRECISION),
  ('FEA_0293', 'Spellfire Adept', '2024', 'General', 'Level 4+, Spellfire Spark Feat or Spellcasting or Pact Magic Feature', 'INT, WIS, or CHA +1', 'FRHOF', NULL, 293.0::DOUBLE PRECISION),
  ('FEA_0294', 'Street Justice', '2024', 'General', 'Level 4+', 'STR or DEX +1', 'FRHOF', NULL, 294.0::DOUBLE PRECISION),
  ('FEA_0295', 'Telekinetic', '2024', 'General', 'Level 4+', 'INT, WIS, or CHA +1', 'PHB2024', 'The distance before disappearing for the mage hand created by this feat also increases by 30 feet (to 60 feet).', 295.0::DOUBLE PRECISION),
  ('FEA_0296', 'Telepathic', '2024', 'General', 'Level 4+', 'INT, WIS, or CHA +1', 'PHB2024', NULL, 296.0::DOUBLE PRECISION),
  ('FEA_0297', 'Treacherous Allure', '2024', 'General', 'Level 4+', 'INT, WIS, or CHA +1', 'ABH', NULL, 297.0::DOUBLE PRECISION),
  ('FEA_0298', 'Transmutation Adept', '2024', 'General', 'Level 4+, Spellcasting or Pact Magic', 'INT, WIS, or CHA +1', 'AU', NULL, 298.0::DOUBLE PRECISION),
  ('FEA_0299', 'Vampire Touched', '2024', 'General', 'Level 4+', 'INT, WIS, or CHA +1', 'ABH', NULL, 299.0::DOUBLE PRECISION),
  ('FEA_0300', 'War Caster', '2024', 'General', 'Level 4+, Spellcasting or Pact Magic', 'INT, WIS, or CHA +1', 'PHB2024', NULL, 300.0::DOUBLE PRECISION),
  ('FEA_0301', 'Warlike Familiar', '2024', 'General', 'Level 4+, Familiar Friend Feat', 'Any +1', 'AU', NULL, 301.0::DOUBLE PRECISION),
  ('FEA_0302', 'Weapon Master', '2024', 'General', 'Level 4+', 'STR or DEX +1', 'PHB2024', NULL, 302.0::DOUBLE PRECISION),
  ('FEA_0303', 'Zhentarim Tactics', '2024', 'General', 'Level 4+, Zhentarim Ruffian Feat', 'DEX or CHA +1', 'FRHOF', NULL, 303.0::DOUBLE PRECISION),
  ('FEA_0304', 'Arcane Warrior', '2024', 'Fighting Style', 'Fighting Style Feature', 'None', 'AU', NULL, 304.0::DOUBLE PRECISION),
  ('FEA_0305', 'Archery', '2024', 'Fighting Style', 'Fighting Style Feature', 'None', 'PHB2024', NULL, 305.0::DOUBLE PRECISION),
  ('FEA_0306', 'Blind Fighting', '2024', 'Fighting Style', 'Fighting Style Feature', 'None', 'PHB2024', NULL, 306.0::DOUBLE PRECISION),
  ('FEA_0307', 'Defense', '2024', 'Fighting Style', 'Fighting Style Feature', 'None', 'PHB2024', NULL, 307.0::DOUBLE PRECISION),
  ('FEA_0308', 'Dueling', '2024', 'Fighting Style', 'Fighting Style Feature', 'None', 'PHB2024', NULL, 308.0::DOUBLE PRECISION),
  ('FEA_0309', 'Great Weapon Fighting', '2024', 'Fighting Style', 'Fighting Style Feature', 'None', 'PHB2024', NULL, 309.0::DOUBLE PRECISION),
  ('FEA_0310', 'Interception', '2024', 'Fighting Style', 'Fighting Style Feature', 'None', 'PHB2024', NULL, 310.0::DOUBLE PRECISION),
  ('FEA_0311', 'Protection', '2024', 'Fighting Style', 'Fighting Style Feature', 'None', 'PHB2024', NULL, 311.0::DOUBLE PRECISION),
  ('FEA_0312', 'Thrown Weapon Fighting', '2024', 'Fighting Style', 'Fighting Style Feature', 'None', 'PHB2024', NULL, 312.0::DOUBLE PRECISION),
  ('FEA_0313', 'Two-Weapon Fighting', '2024', 'Fighting Style', 'Fighting Style Feature', 'None', 'PHB2024', NULL, 313.0::DOUBLE PRECISION),
  ('FEA_0314', 'Unarmed Fighting', '2024', 'Fighting Style', 'Fighting Style Feature', 'None', 'PHB2024', NULL, 314.0::DOUBLE PRECISION),
  ('FEA_0315', 'Boon of Blazing Dawn', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'ABH', NULL, 315.0::DOUBLE PRECISION),
  ('FEA_0316', 'Boon of Bloodshed', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'FRHOF', NULL, 316.0::DOUBLE PRECISION),
  ('FEA_0317', 'Boon of Bountiful Health', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'FRHOF', NULL, 317.0::DOUBLE PRECISION),
  ('FEA_0318', 'Boon of the Bright Sun', '2024', 'Epic Boon', 'Level 19+', 'CON, WIS, or CHA +1 (up to 30)', 'FRHOF', NULL, 318.0::DOUBLE PRECISION),
  ('FEA_0319', 'Boon of Combat Prowess', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'PHB2024', NULL, 319.0::DOUBLE PRECISION),
  ('FEA_0320', 'Boon of Communication', '2024', 'Epic Boon', 'Level 19+', 'INT, WIS, or CHA +1 (up to 30)', 'FRHOF', NULL, 320.0::DOUBLE PRECISION),
  ('FEA_0321', 'Boon of Desperate Resilience', '2024', 'Epic Boon', 'Level 19+', 'STR or CON +1 (up to 30)', 'FRHOF', NULL, 321.0::DOUBLE PRECISION),
  ('FEA_0322', 'Boon of Dimensional Travel', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'PHB2024', NULL, 322.0::DOUBLE PRECISION),
  ('FEA_0323', 'Boon of Energy Resistance', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'PHB2024', NULL, 323.0::DOUBLE PRECISION),
  ('FEA_0324', 'Boon of Erupting Spellpower', '2024', 'Epic Boon', 'Level 19+', 'INT, WIS, or CHA +1 (up to 30)', 'AU', NULL, 324.0::DOUBLE PRECISION),
  ('FEA_0325', 'Boon of Exquisite Radiance', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'FRHOF', NULL, 325.0::DOUBLE PRECISION),
  ('FEA_0326', 'Boon of Fate', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'PHB2024', NULL, 326.0::DOUBLE PRECISION),
  ('FEA_0327', 'Boon of Fluid Forms', '2024', 'Epic Boon', 'Level 19+', 'INT, WIS, or CHA +1 (up to 30)', 'FRHOF', NULL, 327.0::DOUBLE PRECISION),
  ('FEA_0328', 'Boon of Fortitude', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'PHB2024', NULL, 328.0::DOUBLE PRECISION),
  ('FEA_0329', 'Boon of Fortune''s Favor', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'FRHOF', NULL, 329.0::DOUBLE PRECISION),
  ('FEA_0330', 'Boon of the Furious Storm', '2024', 'Epic Boon', 'Level 19+, Spellcasting or Pact Magic Feature', 'INT, WIS, or CHA +1 (up to 30)', 'FRHOF', NULL, 330.0::DOUBLE PRECISION),
  ('FEA_0331', 'Boon of the Iron Mind', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'AU', NULL, 331.0::DOUBLE PRECISION),
  ('FEA_0332', 'Boon of Irresistible Offense', '2024', 'Epic Boon', 'Level 19+', 'STR or DEX +1 (up to 30)', 'PHB2024', NULL, 332.0::DOUBLE PRECISION),
  ('FEA_0333', 'Boon of Looming Shadows', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'ABH', NULL, 333.0::DOUBLE PRECISION),
  ('FEA_0334', 'Boon of Magic School Mastery', '2024', 'Epic Boon', 'Level 19+, Spellcasting or Pact Magic Feature', 'INT, WIS, or CHA +1 (up to 30)', 'AU', NULL, 334.0::DOUBLE PRECISION),
  ('FEA_0335', 'Boon of Misty Escape', '2024', 'Epic Boon', 'Level 19+', 'INT, WIS, or CHA +1 (up to 30)', 'ABH', NULL, 335.0::DOUBLE PRECISION),
  ('FEA_0336', 'Boon of the Night Spirit', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'PHB2024', NULL, 336.0::DOUBLE PRECISION),
  ('FEA_0337', 'Boon of Poison Mastery', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'FRHOF', NULL, 337.0::DOUBLE PRECISION),
  ('FEA_0338', 'Boon of Recovery', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'PHB2024', NULL, 338.0::DOUBLE PRECISION),
  ('FEA_0339', 'Boon of Revelry', '2024', 'Epic Boon', 'Level 19+', 'INT, WIS, or CHA +1 (up to 30)', 'FRHOF', NULL, 339.0::DOUBLE PRECISION),
  ('FEA_0340', 'Boon of Siberys', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'EFA', 'Details on "spellmarked" as specifically originating from Toril can be found in Hawthorne Arcana', 340.0::DOUBLE PRECISION),
  ('FEA_0341', 'Boon of Skill', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'PHB2024', NULL, 341.0::DOUBLE PRECISION),
  ('FEA_0342', 'Boon of Speed', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'PHB2024', NULL, 342.0::DOUBLE PRECISION),
  ('FEA_0343', 'Boon of Spell Recall', '2024', 'Epic Boon', 'Level 19+', 'INT, WIS, or CHA +1 (up to 30)', 'PHB2024', NULL, 343.0::DOUBLE PRECISION),
  ('FEA_0344', 'Boon of the Soul Drinker', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'FRHOF', NULL, 344.0::DOUBLE PRECISION),
  ('FEA_0345', 'Boon of Terror', '2024', 'Epic Boon', 'Level 19+', 'CHA +1 (up to 30)', 'FRHOF', NULL, 345.0::DOUBLE PRECISION),
  ('FEA_0346', 'Boon of Truesight', '2024', 'Epic Boon', 'Level 19+', 'Any +1 (up to 30)', 'PHB2024', NULL, 346.0::DOUBLE PRECISION)

) AS v(check_id, name, ruleset, category, prereq, ability_increase, source, notes, display_order)
WHERE NOT EXISTS (
    SELECT 1 FROM public.ac_feats f WHERE f.check_id = v.check_id
);

-- ------------------------------------------------------------------------------
-- 4. Constraints, Indexes & Cleanup
-- ------------------------------------------------------------------------------
-- Ensure check_id NOT NULL and UNIQUE
ALTER TABLE public.ac_feats ALTER COLUMN check_id SET NOT NULL;
DROP INDEX IF EXISTS public.idx_ac_feats_check_id;
CREATE UNIQUE INDEX idx_ac_feats_check_id ON public.ac_feats (check_id);

-- Ensure ruleset NOT NULL and name + ruleset uniqueness
ALTER TABLE public.ac_feats ALTER COLUMN ruleset SET NOT NULL;
DROP INDEX IF EXISTS public.idx_ac_feats_name_ruleset;
CREATE UNIQUE INDEX idx_ac_feats_name_ruleset ON public.ac_feats (name, ruleset);

-- Foreign Key to ac_sources
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ac_feats_source_fkey' AND table_name = 'ac_feats'
    ) THEN
        ALTER TABLE public.ac_feats 
            ADD CONSTRAINT ac_feats_source_fkey FOREIGN KEY (source) REFERENCES public.ac_sources(source_key);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 5. Updated_At Trigger & Staff Admin RLS Policies
-- ------------------------------------------------------------------------------
-- Trigger for handle_updated_at
DROP TRIGGER IF EXISTS set_ac_feats_updated_at ON public.ac_feats;
CREATE TRIGGER set_ac_feats_updated_at
    BEFORE UPDATE ON public.ac_feats
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.ac_feats ENABLE ROW LEVEL SECURITY;

-- 1. Public Read Policy
DROP POLICY IF EXISTS "Allow public read access to ac_feats" ON public.ac_feats;
CREATE POLICY "Allow public read access to ac_feats"
ON public.ac_feats FOR SELECT
TO anon, authenticated
USING (true);

-- 2. Service Role Management Policy
DROP POLICY IF EXISTS "Allow service_role to manage ac_feats" ON public.ac_feats;
CREATE POLICY "Allow service_role to manage ac_feats"
ON public.ac_feats FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 3. Staff Admin & Engineer Policy
DROP POLICY IF EXISTS "Admins and Engineers can manage ac_feats" ON public.ac_feats;
CREATE POLICY "Admins and Engineers can manage ac_feats"
ON public.ac_feats FOR ALL
TO authenticated
USING (
  ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
  OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
)
WITH CHECK (
  ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
  OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
);
