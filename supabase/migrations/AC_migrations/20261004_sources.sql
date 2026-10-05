-- ==============================================================================
-- Migration: AC Sources Normalization & Centralized Lookups
-- Date: 2026-10-04
-- Target Database: Supabase PostgreSQL (public schema)
-- Description:
--   1. Centralize category metadata and rulesets into public.lookups (type = 'sources').
--   2. Add canonical 'source_key' (PK reference) and audit 'check_id' (SRC_0001..SRC_0119) to ac_sources.
--   3. Backfill source_key and check_id for existing 117 records and upsert all 119 records
--      from 'AC_Sources v2.xlsx' (inserting AU and RHW).
--   4. Drop deprecated foreign key and category_id column from ac_sources.
--   5. Drop deprecated ac_sources_categories table.
--   6. Enforce NOT NULL and UNIQUE constraints, recreate indexes, trigger, and RLS policies.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Lookups Migration (Centralize Category Metadata & Rulesets)
-- ------------------------------------------------------------------------------
INSERT INTO public.lookups (type, data)
VALUES ('sources', '{
  "types": [
    {"name": "Core", "display_order": 1, "notes": null},
    {"name": "Supplemental", "display_order": 2, "notes": null},
    {"name": "Settings", "display_order": 3, "notes": null},
    {"name": "Extras", "display_order": 4, "notes": null},
    {"name": "Adventures", "display_order": 5, "notes": "Except for rewards listed elsewhere in Allowed Content, loot or other rewards from these adventures can typically only be acquired by playing the adventure"},
    {"name": "Third Party Content", "display_order": 6, "notes": null},
    {"name": "Unearthed Arcana", "display_order": 7, "notes": null},
    {"name": "Hawthorne Homebrew", "display_order": 8, "notes": null}
  ],
  "rulesets": [
    {"value": 2014, "label": "2014"},
    {"value": 2024, "label": "2024"}
  ]
}'::jsonb)
ON CONFLICT (type) DO UPDATE SET data = EXCLUDED.data;

-- ------------------------------------------------------------------------------
-- 2. Schema Evolution: Add Columns to public.ac_sources
-- ------------------------------------------------------------------------------
ALTER TABLE public.ac_sources ADD COLUMN IF NOT EXISTS source_key TEXT;
ALTER TABLE public.ac_sources ADD COLUMN IF NOT EXISTS check_id TEXT;

-- Drop legacy foreign key & composite unique constraints referencing category_id
ALTER TABLE public.ac_sources DROP CONSTRAINT IF EXISTS ac_sources_category_id_fkey CASCADE;
ALTER TABLE public.ac_sources DROP CONSTRAINT IF EXISTS ac_sources_category_name_key CASCADE;

-- ------------------------------------------------------------------------------
-- 3. Backfill source_key for Existing Records
-- ------------------------------------------------------------------------------
UPDATE public.ac_sources AS s
SET source_key = v.source_key
FROM (VALUES
  ('PHB2014', 'Player''s Handbook (2014)', 'PHB2014' ),
  ('DMG2014', 'Dungeon Master''s Guide (2014)', 'DMG2014' ),
  ('MM2014', 'Monster Manual (2014)', 'MM2014' ),
  ('PHB2024', 'Player''s Handbook (2024)', 'PHB2024' ),
  ('DMG2024', 'Dungeon Master''s Guide (2024)', 'DMG2024' ),
  ('MM2024', 'Monster Manual (2024)', 'MM2024' ),
  ('AcqInc', 'Acquisitions Incorporated', 'AcqInc' ),
  ('BGG', 'Bigby Presents: Glory of the Giants', 'BGG' ),
  ('BMT', 'The Book of Many Things', 'BMT' ),
  ('EEPC', 'Elemental Evil Player''s Companion', 'EEPC' ),
  ('FTD', 'Fizban''s Treasury of Dragons', 'FTD' ),
  ('MPMM', 'Mordenkainen Presents: Monsters of the Multiverse', 'MPMM' ),
  ('MTF', 'Mordenkainen''s Tome of Foes', 'MTF' ),
  ('OGA', 'One Grung Above', 'OGA' ),
  ('TCE', 'Tasha''s Cauldron of Everything', 'TCE' ),
  ('TTP', 'The Tortle Package', 'TTP' ),
  ('VGM', 'Volo''s Guide to Monsters', 'VGM' ),
  ('XGE', 'Xanathar''s Guide to Everything', 'XGE' ),
  ('ABH', 'Astarion''s Book of Hungers', 'ABH' ),
  ('AU', 'Arcana Unleashed', 'AU' ),
  ('DSotDQ', 'Dragonlance: Shadow of the Dragon Queen', 'DSotDQ' ),
  ('ERLW', 'Eberron: Rising from the Last War', 'ERLW' ),
  ('EGW', 'Explorer''s Guide to Wildemount', 'EGW' ),
  ('GGR', 'Guildmaster''s Guide to Ravnica', 'GGR' ),
  ('JTTRC', 'Journeys through the Radiant Citadel', 'JTTRC' ),
  ('MOT', 'Mythic Odysseys of Theros', 'MOT' ),
  ('SatO', 'Sigil and the Outlands (Planescape: Adventures in the Multiverse)', 'SATO' ),
  ('MPP', 'Morte''s Planar Parade (Planescape: Adventures in the Multiverse)', 'MPP' ),
  ('AAG', 'Astral Adventurer''s Guide (Spelljammer: Adventures in Space)', 'AAG' ),
  ('BAM', 'Boo''s Astral Menagerie (Spelljammer: Adventures in Space)', 'BAM' ),
  ('SCC', 'Strixhaven: A Curriculum of Chaos', 'SCC' ),
  ('SCAG', 'Sword Coast Adventurer''s Guide', 'SCAG' ),
  ('VRGR', 'Van Richten''s Guide to Ravenloft', 'VRGR' ),
  ('WGE', 'Wayfinder''s Guide to Eberron', 'WGE' ),
  ('EFA', 'Eberron: Forge of the Artificer', 'EFA' ),
  ('LFL', 'Lorwyn: First Light', 'LFL' ),
  ('FRHOF', 'Forgotten Realms: Heroes of Faerûn', 'FRHOF' ),
  ('FRAIF', 'Forgotten Realms: Adventures in Faerûn', 'FRAIF' ),
  ('RHW', 'Ravenloft: The Horrors Within', 'RHW' ),
  ('AATM', 'Adventure Atlas: The Mortuary', 'AATM' ),
  ('ALEE:MBB', 'Adventurers League Season 2 (Elemental Evil): Mulmaster Bonds and Backgrounds', 'ALEE_MBB' ),
  ('ALRoD:HRCO', 'Adventurers League Season 3 (Rage of Demons): Hillsfar Regional Character Options', 'ALROD_HRCO' ),
  ('ALCoS:OBG', 'Adventurers League Season 4 (Curse of Strahd): Curse of Strahd Optional Backgrounds', 'ALCOS_OBG' ),
  ('HAT-LMI', 'Honor Among Thieves: Legendary Loot', 'HAT_LMI' ),
  ('HAT-TG', 'Honor Among Thieves: Thieves'' Gallery', 'HAT_TG' ),
  ('MMV1', 'Misplaced Monsters: Volume 1', 'MMV1' ),
  ('MCV1:SC', 'Monstrous Compendium Volume 1: Spelljammer Creatures', 'MCV1_SC' ),
  ('MCV2:DC', 'Monstrous Compendium Volume 2: Dragonlance Creatures', 'MCV1_DC' ),
  ('MCV3:MC', 'Monstrous Compendium Volume 3: Minecraft Creatures', 'MCV3_MC' ),
  ('MCV4:EC', 'Monstrous Compendium Volume 4: Eldraine Creatures', 'MCV3_EC' ),
  ('MFF', 'Mordenkainen''s Fiendish Folio Volume 1: Monsters Malevolent and Benign', 'MFF' ),
  ('VD', 'Vecna Dossier', 'VD' ),
  ('AZfyT', 'A Zib for your Thoughts', 'AZfyT' ),
  ('BGDIA', 'Baldur''s Gate: Descent into Avernus', 'BGDIA' ),
  ('CM', 'Candlekeep Mysteries', 'CM' ),
  ('CRCotN', 'Critical Role: Call of the Netherdeep', 'CRCotN' ),
  ('CoS', 'Curse of Strahd', 'CoS' ),
  ('DLCT', 'Descent into the Lost Caverns of Tsojcanth', 'DLCT' ),
  ('DoSI', 'Dragons of Stormwreck Isle', 'DoSI' ),
  ('DIP', 'Essentials Kit: Dragon of Icespire Peak', 'DIP' ),
  ('SLW', 'Essentials Kit: Storm Lord''s Wrath', 'SLW' ),
  ('GoS', 'Ghosts of Saltmarsh', 'GoS' ),
  ('HFStCM', 'Heroes'' Feast: Saving the Children''s Menu', 'HFStCM' ),
  ('IDRotF', 'Icewind Dale: Rime of the Frostmaiden', 'IDRotF' ),
  ('IMR', 'Infernal Machine Rebuild', 'IMR' ),
  ('KftGV', 'Keys from the Golden Vault', 'KftGV' ),
  ('LR', 'Locathah Rising', 'LR' ),
  ('LLK', 'Lost Laboratory of Kwalish', 'LLK' ),
  ('LMoP', 'Lost Mine of Phandelver', 'LMoP' ),
  ('OotA', 'Out of the Abyss', 'OotA' ),
  ('PBTSO', 'Phandelver and Below: The Shattered Obelisk', 'PBTSO' ),
  ('ToFW', 'Planescape: Adventures in the Multiverse (Turn of Fortune''s Wheel)', 'ToFW' ),
  ('PotA', 'Princes of the Apocalypse', 'PotA' ),
  ('QftIS', 'Quests from the Infinite Staircase', 'QftIS' ),
  ('RtG', 'Return to the Glory', 'RtG' ),
  ('LoX', 'Spelljammer: Adventures in Space (Light of Xaryxis)', 'LoX' ),
  ('SKT', 'Storm King''s Thunder', 'SKT' ),
  ('TftYP', 'Tales from the Yawning Portal', 'TftYP' ),
  ('ToA', 'Tomb of Annihilation', 'ToA' ),
  ('HotDQ (ToD)', 'Tyranny of Dragons: Hoard of the Dragon Queen', 'HOTDQ_TOD' ),
  ('RoT (ToD)', 'Tyranny of Dragons: Rise of Tiamat', 'ROT_TOD' ),
  ('VEOR', 'Vecna: Eve of Ruin', 'VEOR' ),
  ('VNEE', 'Vecna: Nest of the Eldritch Eye', 'VNEE' ),
  ('WDH', 'Waterdeep: Dragon Heist', 'WDH' ),
  ('WDMM', 'Waterdeep: Dungeon of the Mad Mage', 'WDMM' ),
  ('WBTW', 'The Wild Beyond the Witchlight', 'WBTW' ),
  ('HotB', 'Heroes of the Borderlands', 'HotB' ),
  ('HBTD', 'Hold Back the Dead', 'HBTD' ),
  ('NF', 'Netheril''s Fall', 'NF' ),
  ('WttHC', 'Stranger Things: Welcome to the Hellfire Club', 'WttHC' ),
  ('BH2022', 'Blood Hunter', 'BH2022' ),
  ('HWCS', 'Humblewood Campaign Setting', 'HWCS' ),
  ('HWT', 'Humblewood Tales', 'HWT' ),
  ('GSB2', 'The Griffon''s Saddlebag Book Two', 'GSB2' ),
  ('W4ESD', 'Way of the Four Elements (Spiketail.Drake)', 'W4ESD' ),
  ('WEL', 'Where Evil Lives', 'WEL' ),
  ('HWCS (2024)', 'Humblewood Campaign Setting (2024)', 'HWCS_2024' ),
  ('VSS:PP', 'Valda''s Spire of Secrets: Player Pack', 'VSS_PP' ),
  ('UACDD', 'Unearthed Arcana: Cleric Divine Domains', 'UACDD' ),
  ('UADrui', 'Unearthed Arcana: Druid', 'UADrui' ),
  ('UAESR', 'Unearthed Arcana: Elf Subraces', 'UAESR' ),
  ('UATF', 'Unearthed Arcana: The Faithful', 'UATF' ),
  ('UAFT', 'Unearthed Arcana: Feats', 'UAFT' ),
  ('UAFFS', 'Unearthed Arcana: Feats for Skills', 'UAFFS' ),
  ('UAF', 'Unearthed Arcana: Fighter', 'UAF' ),
  ('UAKoO', 'Unearthed Arcana: Kits of Old', 'UAKoO' ),
  ('UALDU', 'Unearthed Arcana: Light, Dark, Underdark!', 'UALDU' ),
  ('UAMy', 'Unearthed Arcana: The Mystic Class', 'UAMy' ),
  ('UAP', 'Unearthed Arcana: Paladin', 'UAP' ),
  ('UATRR', 'Unearthed Arcana: The Ranger, Revised', 'UATRR' ),
  ('UARAR', 'Unearthed Arcana: Ranger & Rogue', 'UARAR' ),
  ('UAS', 'Unearthed Arcana: Sorcerer', 'UAS' ),
  ('UAOBM', 'Unearthed Arcana: That Old Black Magic', 'UAOBM' ),
  ('UATSC', 'Unearthed Arcana: Three Subclasses', 'UATSC' ),
  ('UAWAW', 'Unearthed Arcana: Warlock & Wizard', 'UAWAW' ),
  ('UAWA', 'Unearthed Arcana: Waterborne Adventures', 'UAWA' ),
  ('UAWR', 'Unearthed Arcana: Wizard Revisited', 'UAWR' ),
  ('HTA', 'Hawthorne Arcana', 'HTA' ),
  ('HTFG', 'Hawthorne Field Guide', 'HTFG' )
) AS v(abbr, name, source_key)
WHERE s.source_key IS NULL
  AND (s.abbreviation = v.abbr OR s.name = v.name);

-- ------------------------------------------------------------------------------
-- 4. Apply Unique Constraint on source_key for Upsert Resolution
-- ------------------------------------------------------------------------------
ALTER TABLE public.ac_sources ALTER COLUMN source_key SET NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ac_sources_source_key_key'
  ) THEN
    ALTER TABLE public.ac_sources ADD CONSTRAINT ac_sources_source_key_key UNIQUE (source_key);
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 5. Data Load: Upsert All 119 Canonical Records
--    Preserves existing UUID primary keys for 117 records, updates all fields,
--    and inserts missing records (AU, RHW) with new UUIDs.
-- ------------------------------------------------------------------------------
INSERT INTO public.ac_sources (
  source_key,
  check_id,
  abbreviation,
  name,
  type,
  ruleset,
  allowed_content,
  notes_advice,
  link,
  display_order
)
VALUES
  ('PHB2014', 'SRC_0001', 'PHB2014', 'Player''s Handbook (2014)', 'Core', '2014', 'All: Backgrounds, Classes, Subclasses, Equipment, Feats, Races, Spells', 'See also the [Basic Rules (2014)](https://www.dndbeyond.com/sources/dnd/basic-rules-2014), [SRD 5.1](https://www.dndbeyond.com/srd), and [Sage Advice](https://www.dndbeyond.com/sources/dnd/sac/sage-advice-compendium)', 'https://www.dndbeyond.com/sources/dnd/phb-2014', 1),
  ('DMG2014', 'SRC_0002', 'DMG2014', 'Dungeon Master''s Guide (2014)', 'Core', '2014', 'All: Subclasses (Death Domain Cleric, Oathbreaker Paladin), Loot and Other Rewards', 'See also the [Basic Rules (2014)](https://www.dndbeyond.com/sources/dnd/basic-rules-2014), [SRD 5.1](https://www.dndbeyond.com/srd), and [Sage Advice](https://www.dndbeyond.com/sources/dnd/sac/sage-advice-compendium)', 'https://www.dndbeyond.com/sources/dnd/dmg-2014', 2),
  ('MM2014', 'SRC_0003', 'MM2014', 'Monster Manual (2014)', 'Core', '2014', 'All: Monsters', 'See also the [Basic Rules (2014)](https://www.dndbeyond.com/sources/dnd/basic-rules-2014), [SRD 5.1](https://www.dndbeyond.com/srd), and [Sage Advice](https://www.dndbeyond.com/sources/dnd/sac/sage-advice-compendium)', 'https://www.dndbeyond.com/sources/dnd/mm-2014', 3),
  ('PHB2024', 'SRC_0004', 'PHB2024', 'Player''s Handbook (2024)', 'Core', '2024', 'All: Backgrounds, Classes, Subclasses, Equipment, Feats, Races, Spells, Monsters', 'See also the [Basic Rules (2024)](https://www.dndbeyond.com/sources/dnd/br-2024), [SRD 5.2](https://www.dndbeyond.com/srd), and [Sage Advice](https://www.dndbeyond.com/sources/dnd/sae)', 'https://www.dndbeyond.com/sources/dnd/phb-2024', 4),
  ('DMG2024', 'SRC_0005', 'DMG2024', 'Dungeon Master''s Guide (2024)', 'Core', '2024', 'All: Bastions, Loot and Other Rewards', 'See also the [Basic Rules (2024)](https://www.dndbeyond.com/sources/dnd/br-2024), [SRD 5.2](https://www.dndbeyond.com/srd), and [Sage Advice](https://www.dndbeyond.com/sources/dnd/sae)', 'https://www.dndbeyond.com/sources/dnd/dmg-2024', 5),
  ('MM2024', 'SRC_0006', 'MM2024', 'Monster Manual (2024)', 'Core', '2024', 'All: Monsters', 'See also the [Basic Rules (2024)](https://www.dndbeyond.com/sources/dnd/br-2024), [SRD 5.2](https://www.dndbeyond.com/srd), and [Sage Advice](https://www.dndbeyond.com/sources/dnd/sae)', 'https://www.dndbeyond.com/sources/dnd/mm-2024', 6),
  ('AcqInc', 'SRC_0007', 'AcqInc', 'Acquisitions Incorporated', 'Supplemental', '2014', 'Backgrounds, Races (Verdan), Vehicles, Monsters', 'Loot and spells aren''t available', 'https://www.dndbeyond.com/sources/dnd/ai', 7),
  ('BGG', 'SRC_0008', 'BGG', 'Bigby Presents: Glory of the Giants', 'Supplemental', '2014', 'All: Backgrounds, Subclasses (Path of the Giant Barbarian), Feats, Loot, Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/gotg', 8),
  ('BMT', 'SRC_0009', 'BMT', 'The Book of Many Things', 'Supplemental', '2014', 'All: Backgrounds, Feats (Cartomancer), Spells, Loot and Other Rewards, Monsters', '- The Cartomancer feat has a Rage Advice regarding its use. See [Feats](https://docs.google.com/spreadsheets/d/1fBEv1yDNTD-vwUyK6pK_oiXg2K7OiltW35iFCqxyMTY/edit?gid=1744132230) for details.
- Individual cards of the Deck of Many Things can be acquired, but the Deck of Many Things, the Deck of Many More Things, and the Deck of Wonders can only be encountered and used during adventures. See Loot for details.', 'https://www.dndbeyond.com/sources/dnd/tbomt', 9),
  ('EEPC', 'SRC_0010', 'EEPC', 'Elemental Evil Player''s Companion', 'Supplemental', '2014', 'All: Races, Spells', 'All spells are reprinted in Xanathar''s Guide to Everything', 'https://media.wizards.com/2015/downloads/dnd/EE_PlayersCompanion.pdf', 10),
  ('FTD', 'SRC_0011', 'FTD', 'Fizban''s Treasury of Dragons', 'Supplemental', '2014', 'All: Subclasses, Feats, Races, Spells, Loot and Other Rewards, Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/ftod', 11),
  ('MPMM', 'SRC_0012', 'MPMM', 'Mordenkainen Presents: Monsters of the Multiverse', 'Supplemental', '2014', 'All: Races, Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/motm', 12),
  ('MTF', 'SRC_0013', 'MTF', 'Mordenkainen''s Tome of Foes', 'Supplemental', '2014', 'All: Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/mtof', 13),
  ('OGA', 'SRC_0014', 'OGA', 'One Grung Above', 'Supplemental', '2014', 'All: Races (Grung)', NULL, 'https://www.dndbeyond.com/sources/dnd/oga/one-grung-above', 14),
  ('TCE', 'SRC_0015', 'TCE', 'Tasha''s Cauldron of Everything', 'Supplemental', '2014', 'All: Classes (Artificer), Subclasses, Optional Class Features, Customizing Your Origin, Spells, Loot', 'Custom Lineage isn''t available', 'https://www.dndbeyond.com/sources/dnd/tcoe', 15),
  ('TTP', 'SRC_0016', 'TTP', 'The Tortle Package', 'Supplemental', '2014', 'All: Races (Tortle), Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/ttp/the-tortle-package', 16),
  ('VGM', 'SRC_0017', 'VGM', 'Volo''s Guide to Monsters', 'Supplemental', '2014', 'All: Races, Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/vgtm', 17),
  ('XGE', 'SRC_0018', 'XGE', 'Xanathar''s Guide to Everything', 'Supplemental', '2014', 'All: Subclasses, Feats, Spells, Loot', NULL, 'https://www.dndbeyond.com/sources/dnd/xgte', 18),
  ('ABH', 'SRC_0019', 'ABH', 'Astarion''s Book of Hungers', 'Supplemental', '2024', 'All: Feats, Races (Dhampir), Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/aboh', 19),
  ('AU', 'SRC_0020', 'AU', 'Arcana Unleashed', 'Supplemental', '2024', 'Subclasses, Feats, Spells', 'Remaining content will be implemented soon', 'https://www.dndbeyond.com/sources/dnd/au', 20),
  ('DSotDQ', 'SRC_0021', 'DSotDQ', 'Dragonlance: Shadow of the Dragon Queen', 'Settings', '2014', 'All: Backgrounds, Subclasses (Lunar Sorcery), Equipment, Feats, Races (Kender), Loot and Other Rewards, Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/sotdq', 21),
  ('ERLW', 'SRC_0022', 'ERLW', 'Eberron: Rising from the Last War', 'Settings', '2014', 'All: Classes (Artificer), Equipment, Feats, Races, Loot, Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/erftlw', 22),
  ('EGW', 'SRC_0023', 'EGW', 'Explorer''s Guide to Wildemount', 'Settings', '2014', 'All: Backgrounds, Subclasses, Races, Spells, Loot and Other Rewards, Monsters', 'Dunamancy spells are available to various classes. See [Spells](https://docs.google.com/spreadsheets/d/1fBEv1yDNTD-vwUyK6pK_oiXg2K7OiltW35iFCqxyMTY/edit?gid=1417406706) for details.', 'https://www.dndbeyond.com/sources/dnd/egtw', 23),
  ('GGR', 'SRC_0024', 'GGR', 'Guildmaster''s Guide to Ravnica', 'Settings', '2014', 'Subclasses, Races, Spells, Loot and Other Rewards, Monsters', 'Backgrounds aren''t available', 'https://www.dndbeyond.com/sources/dnd/ggtr', 24),
  ('JTTRC', 'SRC_0025', 'JTTRC', 'Journeys through the Radiant Citadel', 'Settings', '2014', 'All: Other Rewards, Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/jttrc', 25),
  ('MOT', 'SRC_0026', 'MOT', 'Mythic Odysseys of Theros', 'Settings', '2014', 'All: Backgrounds, Subclasses, Races, Loot and Other Rewards, Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/moot', 26),
  ('SATO', 'SRC_0027', 'SatO', 'Sigil and the Outlands (Planescape: Adventures in the Multiverse)', 'Settings', '2014', 'All: Backgrounds, Feats, Spells, Loot', NULL, 'https://www.dndbeyond.com/sources/dnd/paitm/sato', 27),
  ('MPP', 'SRC_0028', 'MPP', 'Morte''s Planar Parade (Planescape: Adventures in the Multiverse)', 'Settings', '2014', 'All: Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/paitm/mpp', 28),
  ('AAG', 'SRC_0029', 'AAG', 'Astral Adventurer''s Guide (Spelljammer: Adventures in Space)', 'Settings', '2014', 'All: Backgrounds, Equipment, Races, Spells, Loot', NULL, 'https://www.dndbeyond.com/sources/dnd/sais/aag', 29),
  ('BAM', 'SRC_0030', 'BAM', 'Boo''s Astral Menagerie (Spelljammer: Adventures in Space)', 'Settings', '2014', 'All: Other Rewards, Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/sais/bam', 30),
  ('SCC', 'SRC_0031', 'SCC', 'Strixhaven: A Curriculum of Chaos', 'Settings', '2014', 'Feats, Races (Owlin), Spells, Loot, Monsters', 'Backgrounds aren''t available', 'https://www.dndbeyond.com/sources/dnd/sacoc', 31),
  ('SCAG', 'SRC_0032', 'SCAG', 'Sword Coast Adventurer''s Guide', 'Settings', '2014', 'All: Backgrounds, Subclasses, Equipment (Spiked Armor), Races, Spells', NULL, 'https://www.dndbeyond.com/sources/dnd/scag', 32),
  ('VRGR', 'SRC_0033', 'VRGR', 'Van Richten''s Guide to Ravenloft', 'Settings', '2014', 'All: Backgrounds, Subclasses, Races, Loot and Other Rewards, Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/vrgtr', 33),
  ('WGE', 'SRC_0034', 'WGE', 'Wayfinder''s Guide to Eberron', 'Settings', '2014', 'Select Loot (Band of Loyalty, Bag of Bounty, Rings of Shared Suffering)', 'All other content in this book is reprinted and updated in Eberron: Rising from the Last War', 'https://www.dndbeyond.com/sources/dnd/wgte', 34),
  ('EFA', 'SRC_0035', 'EFA', 'Eberron: Forge of the Artificer', 'Settings', '2024', 'All: Backgrounds, Bastions, Classes (Artificer), Equipment, Feats, Races, Loot and Other Rewards, Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/efota', 35),
  ('LFL', 'SRC_0036', 'LFL', 'Lorwyn: First Light', 'Settings', '2024', 'All: Backgrounds, Feats, Races, Loot, Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/lfl', 36),
  ('FRHOF', 'SRC_0037', 'FRHOF', 'Forgotten Realms: Heroes of Faerûn', 'Settings', '2024', 'All: Backgrounds, Subclasses, Equipment, Feats, Spells, Loot and Other Rewards', NULL, 'https://www.dndbeyond.com/sources/dnd/frhof', 37),
  ('FRAIF', 'SRC_0038', 'FRAIF', 'Forgotten Realms: Adventures in Faerûn', 'Settings', '2024', 'All: Monsters, Loot and Other Rewards', NULL, 'https://www.dndbeyond.com/sources/dnd/fraif', 38),
  ('RHW', 'SRC_0039', 'RHW', 'Ravenloft: The Horrors Within', 'Settings', '2024', 'All: Races, Subclasses, Backgrounds, Feats, Bastion Facilities, Other Rewards (Dark Gifts, Renown), Monsters', 'The Cabinet of Curiosities Bastion Facility isn''t available yet at this time.', 'https://www.dndbeyond.com/sources/dnd/rthw', 39),
  ('AATM', 'SRC_0040', 'AATM', 'Adventure Atlas: The Mortuary', 'Extras', '2014', 'All: Other Rewards (Charm of the Dead Truce, Charm of Incorporeality)', NULL, 'https://www.dndbeyond.com/sources/dnd/aatm', 40),
  ('ALEE_MBB', 'SRC_0041', 'ALEE:MBB', 'Adventurers League Season 2 (Elemental Evil): Mulmaster Bonds and Backgrounds', 'Extras', '2014', 'All: Backgrounds', NULL, 'https://drive.google.com/file/d/1wzS4jjqWZNLgc-6ek3mZie_2PE_uQLuu/view?usp=drive_link', 41),
  ('ALROD_HRCO', 'SRC_0042', 'ALRoD:HRCO', 'Adventurers League Season 3 (Rage of Demons): Hillsfar Regional Character Options', 'Extras', '2014', 'All: Backgrounds', NULL, 'https://drive.google.com/file/d/1bw37LLeBCVMPrsafdW5rudjLOFT11FNT/view?usp=drive_link', 42),
  ('ALCOS_OBG', 'SRC_0043', 'ALCoS:OBG', 'Adventurers League Season 4 (Curse of Strahd): Curse of Strahd Optional Backgrounds', 'Extras', '2014', 'All: Backgrounds', NULL, 'https://drive.google.com/file/d/1OE_X_Loj2g6T4gg_HdI_8X-byKDk_rlF/view?usp=drive_link', 43),
  ('HAT_LMI', 'SRC_0044', 'HAT-LMI', 'Honor Among Thieves: Legendary Loot', 'Extras', '2014', 'All: Loot', NULL, 'https://www.dndbeyond.com/sources/dnd/lmi/legendary-magic-items', 44),
  ('HAT_TG', 'SRC_0045', 'HAT-TG', 'Honor Among Thieves: Thieves'' Gallery', 'Extras', '2014', 'All: Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/tg/thieves-gallery', 45),
  ('MMV1', 'SRC_0046', 'MMV1', 'Misplaced Monsters: Volume 1', 'Extras', '2014', 'All: Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/mpmv1/misplaced-monsters-volume-1', 46),
  ('MCV1_SC', 'SRC_0047', 'MCV1:SC', 'Monstrous Compendium Volume 1: Spelljammer Creatures', 'Extras', '2014', 'All: Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/mcv1/spelljammer-creatures', 47),
  ('MCV1_DC', 'SRC_0048', 'MCV2:DC', 'Monstrous Compendium Volume 2: Dragonlance Creatures', 'Extras', '2014', 'All: Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/mcv2/dragonlance-creatures', 48),
  ('MCV3_MC', 'SRC_0049', 'MCV3:MC', 'Monstrous Compendium Volume 3: Minecraft Creatures', 'Extras', '2014', 'All: Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/mcv3/minecraft-creatures', 49),
  ('MCV3_EC', 'SRC_0050', 'MCV4:EC', 'Monstrous Compendium Volume 4: Eldraine Creatures', 'Extras', '2014', 'All: Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/mcv4/eldraine-creatures', 50),
  ('MFF', 'SRC_0051', 'MFF', 'Mordenkainen''s Fiendish Folio Volume 1: Monsters Malevolent and Benign', 'Extras', '2014', 'All: Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/mffv1/monsters-malevolent-and-benign', 51),
  ('VD', 'SRC_0052', 'VD', 'Vecna Dossier', 'Extras', '2014', 'All: Monsters (Vecna the Archlich)', NULL, 'https://www.dndbeyond.com/sources/dnd/tvd/the-vecna-dossier', 52),
  ('AZfyT', 'SRC_0053', 'AZfyT', 'A Zib for your Thoughts', 'Adventures', '2014', 'All: Loot (Vial of Thought Capture)', NULL, 'https://www.dmsguild.com/en/product/265835/a-zib-for-your-thoughts-5e', 53),
  ('BGDIA', 'SRC_0054', 'BGDIA', 'Baldur''s Gate: Descent into Avernus', 'Adventures', '2014', 'All: Backgrounds, Loot and Other Rewards, Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/bgdia', 54),
  ('CM', 'SRC_0055', 'CM', 'Candlekeep Mysteries', 'Adventures', '2014', 'All: Loot and Other Rewards, Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/cm', 55),
  ('CRCotN', 'SRC_0056', 'CRCotN', 'Critical Role: Call of the Netherdeep', 'Adventures', '2014', 'All: Loot, Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/cotn', 56),
  ('CoS', 'SRC_0057', 'CoS', 'Curse of Strahd', 'Adventures', '2014', 'All: Backgrounds (Haunted One), Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/cos', 57),
  ('DLCT', 'SRC_0058', 'DLCT', 'Descent into the Lost Caverns of Tsojcanth', 'Adventures', '2014', 'All: Loot, Monsters (Pech)', NULL, 'https://www.dndbeyond.com/sources/dnd/dilct/descent-into-the-lost-caverns-of-tsojcanth', 58),
  ('DoSI', 'SRC_0059', 'DoSI', 'Dragons of Stormwreck Isle', 'Adventures', '2014', 'All: Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/dosi', 59),
  ('DIP', 'SRC_0060', 'DIP', 'Essentials Kit: Dragon of Icespire Peak', 'Adventures', '2014', 'All: Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/doip', 60),
  ('SLW', 'SRC_0061', 'SLW', 'Essentials Kit: Storm Lord''s Wrath', 'Adventures', '2014', 'All: Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/slw', 61),
  ('GoS', 'SRC_0062', 'GoS', 'Ghosts of Saltmarsh', 'Adventures', '2014', 'All: Backgrounds, Equipment, Loot, Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/gos', 62),
  ('HFStCM', 'SRC_0063', 'HFStCM', 'Heroes'' Feast: Saving the Children''s Menu', 'Adventures', '2014', 'All: Other Rewards (Charm of the Stumblenoodle)', NULL, 'https://www.dndbeyond.com/sources/dnd/hfscm', 63),
  ('IDRotF', 'SRC_0064', 'IDRotF', 'Icewind Dale: Rime of the Frostmaiden', 'Adventures', '2014', 'All: Equipment, Spells, Loot and Other Rewards, Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/idrotf', 64),
  ('IMR', 'SRC_0065', 'IMR', 'Infernal Machine Rebuild', 'Adventures', '2014', 'All: Equipment (Dust of the Mummy), Loot, Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/imr', 65),
  ('KftGV', 'SRC_0066', 'KftGV', 'Keys from the Golden Vault', 'Adventures', '2014', 'All: Loot (Shard Solitaire), Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/kftgv', 66),
  ('LR', 'SRC_0067', 'LR', 'Locathah Rising', 'Adventures', '2014', 'Monsters', 'Locathah race isn''t available', 'https://www.dndbeyond.com/sources/dnd/lr', 67),
  ('LLK', 'SRC_0068', 'LLK', 'Lost Laboratory of Kwalish', 'Adventures', '2014', 'All: Loot, Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/llok', 68),
  ('LMoP', 'SRC_0069', 'LMoP', 'Lost Mine of Phandelver', 'Adventures', '2014', 'All: Loot (Spider Staff), Monsters', 'Other loot is reprinted in Phandelver and Below: The Shattered Obelisk', 'https://www.dndbeyond.com/sources/dnd/lmop', 69),
  ('OotA', 'SRC_0070', 'OotA', 'Out of the Abyss', 'Adventures', '2014', 'All: Backgrounds, Equipment, Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/oota', 70),
  ('PBTSO', 'SRC_0071', 'PBTSO', 'Phandelver and Below: The Shattered Obelisk', 'Adventures', '2014', 'All: Loot and Other Rewards, Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/pbtso', 71),
  ('ToFW', 'SRC_0072', 'ToFW', 'Planescape: Adventures in the Multiverse (Turn of Fortune''s Wheel)', 'Adventures', '2014', 'All: Other Rewards, Monsters (Morte)', NULL, 'https://www.dndbeyond.com/sources/dnd/paitm/tofw', 72),
  ('PotA', 'SRC_0073', 'PotA', 'Princes of the Apocalypse', 'Adventures', '2014', 'All: Loot, Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/pota', 73),
  ('QftIS', 'SRC_0074', 'QftIS', 'Quests from the Infinite Staircase', 'Adventures', '2014', 'All: Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/qftis', 74),
  ('RtG', 'SRC_0075', 'RtG', 'Return to the Glory', 'Adventures', '2014', 'All: Monsters', NULL, 'https://www.dmsguild.com/en/product/314450/return-to-the-glory-5e', 75),
  ('LoX', 'SRC_0076', 'LoX', 'Spelljammer: Adventures in Space (Light of Xaryxis)', 'Adventures', '2014', 'All: Monsters (Astral Blight)', NULL, 'https://www.dndbeyond.com/sources/dnd/sais/lox', 76),
  ('SKT', 'SRC_0077', 'SKT', 'Storm King''s Thunder', 'Adventures', '2014', 'All: Equipment, Loot, Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/skt', 77),
  ('TftYP', 'SRC_0078', 'TftYP', 'Tales from the Yawning Portal', 'Adventures', '2014', 'All: Loot, Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/tftyp', 78),
  ('ToA', 'SRC_0079', 'ToA', 'Tomb of Annihilation', 'Adventures', '2014', 'All: Backgrounds, Equipment, Loot and Other Rewards, Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/toa', 79),
  ('HOTDQ_TOD', 'SRC_0080', 'HotDQ (ToD)', 'Tyranny of Dragons: Hoard of the Dragon Queen', 'Adventures', '2014', 'All: Backgrounds, Loot, Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/tod', 80),
  ('ROT_TOD', 'SRC_0081', 'RoT (ToD)', 'Tyranny of Dragons: Rise of Tiamat', 'Adventures', '2014', 'All: Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/tod', 81),
  ('VEOR', 'SRC_0082', 'VEOR', 'Vecna: Eve of Ruin', 'Adventures', '2014', 'All: Loot (Chime of Exile) and Other Rewards (Vecna''s Link), Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/veor', 82),
  ('VNEE', 'SRC_0083', 'VNEE', 'Vecna: Nest of the Eldritch Eye', 'Adventures', '2014', 'All: Other Rewards (Charm of the Creeping Hand, Charm of the Eldritch Eye)', NULL, 'https://www.dndbeyond.com/sources/dnd/vnee', 83),
  ('WDH', 'SRC_0084', 'WDH', 'Waterdeep: Dragon Heist', 'Adventures', '2014', 'All: Equipment, Loot, Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/wdh', 84),
  ('WDMM', 'SRC_0085', 'WDMM', 'Waterdeep: Dungeon of the Mad Mage', 'Adventures', '2014', 'All: Loot, Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/wdotmm', 85),
  ('WBTW', 'SRC_0086', 'WBTW', 'The Wild Beyond the Witchlight', 'Adventures', '2014', 'All: Backgrounds, Races, Loot, Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/twbtw', 86),
  ('HotB', 'SRC_0087', 'HotB', 'Heroes of the Borderlands', 'Adventures', '2024', 'All: Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/hotb', 87),
  ('HBTD', 'SRC_0088', 'HBTD', 'Hold Back the Dead', 'Adventures', '2024', 'All: Equipment', NULL, 'https://www.dndbeyond.com/sources/dnd/hbtd', 88),
  ('NF', 'SRC_0089', 'NF', 'Netheril''s Fall', 'Adventures', '2024', 'All: Loot, Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/nf', 89),
  ('WttHC', 'SRC_0090', 'WttHC', 'Stranger Things: Welcome to the Hellfire Club', 'Adventures', '2024', 'All: Loot, Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/wthc', 90),
  ('BH2022', 'SRC_0091', 'BH2022', 'Blood Hunter', 'Third Party Content', '2014', 'All: Classes (Blood Hunter), Subclasses', NULL, 'https://www.dndbeyond.com/classes/357975-blood-hunter', 91),
  ('HWCS', 'SRC_0092', 'HWCS', 'Humblewood Campaign Setting', 'Third Party Content', '2014', 'All: Backgrounds, Subclasses, Feats, Races, Spells, Loot, Monsters', NULL, 'https://www.dndbeyond.com/sources/dnd/hcs', 92),
  ('HWT', 'SRC_0093', 'HWT', 'Humblewood Tales', 'Third Party Content', '2014', 'All: Subclasses, Equipment, Feats, Spells, Loot, Monsters', 'Forest Sage feat isn''t available', 'https://www.dndbeyond.com/sources/dnd/hwt', 93),
  ('GSB2', 'SRC_0094', 'GSB2', 'The Griffon''s Saddlebag Book Two', 'Third Party Content', '2014', 'Subclasses (Circle of Dragons Druid)', 'All other content isn''t available', 'https://www.dndbeyond.com/sources/dnd/gsb2', 94),
  ('W4ESD', 'SRC_0095', 'W4ESD', 'Way of the Four Elements (Spiketail.Drake)', 'Third Party Content', '2014', 'All: Subclasses (Way of the Four Elements Monk)', NULL, 'https://drive.google.com/file/d/1lVzmPfyqdUMfmnyRK5OYFQ4HSkLYQDHi/view?usp=sharing', 95),
  ('WEL', 'SRC_0096', 'WEL', 'Where Evil Lives', 'Third Party Content', '2014', 'Loot (Foresight Weapon)', 'All other content isn''t available', 'https://www.dndbeyond.com/sources/dnd/wel', 96),
  ('HWCS_2024', 'SRC_0097', 'HWCS (2024)', 'Humblewood Campaign Setting (2024)', 'Third Party Content', '2024', 'All: Backgrounds, Subclasses, Feats, Races', NULL, 'https://hitpointpress.com/products/humblewood-campaign-setting-pdf', 97),
  ('VSS_PP', 'SRC_0098', 'VSS:PP', 'Valda''s Spire of Secrets: Player Pack', 'Third Party Content', '2024', 'Subclasses (Arachnoid Stalker Rogue), Feats (Brutal Grip, Field Commander, Focused Critical), Races, Loot', 'Spells, other subclasses, and Iron Hero feat aren''t available', 'https://www.dndbeyond.com/sources/dnd/vsspp', 98),
  ('UACDD', 'SRC_0099', 'UACDD', 'Unearthed Arcana: Cleric Divine Domains', 'Unearthed Arcana', '2014', 'Subclasses (Protection Domain Cleric)', 'All other content isn''t available', 'https://media.wizards.com/2016/dnd/downloads/UA_Cleric.pdf', 99),
  ('UADrui', 'SRC_0100', 'UADrui', 'Unearthed Arcana: Druid', 'Unearthed Arcana', '2014', 'Subclasses (Circle of Twilight Druid)', 'All other content isn''t available', 'https://media.wizards.com/2016/dnd/downloads/UA_Druid11272016_CAWS.pdf', 100),
  ('UAESR', 'SRC_0101', 'UAESR', 'Unearthed Arcana: Elf Subraces', 'Unearthed Arcana', '2014', 'Races (Avariel)', 'All other content isn''t available', 'https://media.wizards.com/2017/dnd/downloads/UA-ElfSubraces.pdf', 101),
  ('UATF', 'SRC_0102', 'UATF', 'Unearthed Arcana: The Faithful', 'Unearthed Arcana', '2014', 'Subclasses (Seeker Warlock)', 'All other content isn''t available', 'https://media.wizards.com/2016/dnd/downloads/UA%20Non-Divine%20Faithful%20SFG.pdf', 102),
  ('UAFT', 'SRC_0103', 'UAFT', 'Unearthed Arcana: Feats', 'Unearthed Arcana', '2014', 'All: Feats', 'Warhammer Master feat isn''t available', 'https://media.wizards.com/2016/downloads/DND/UA-Feats-V1.pdf', 103),
  ('UAFFS', 'SRC_0104', 'UAFFS', 'Unearthed Arcana: Feats for Skills', 'Unearthed Arcana', '2014', 'All: Feats', NULL, 'https://media.wizards.com/2017/dnd/downloads/UA-SkillFeats.pdf', 104),
  ('UAF', 'SRC_0105', 'UAF', 'Unearthed Arcana: Fighter', 'Unearthed Arcana', '2014', 'Subclasses (Sharpshooter Fighter)', 'All other content isn''t available', 'https://media.wizards.com/2016/dnd/downloads/2016_Fighter_UA_1205_1.pdf', 105),
  ('UAKoO', 'SRC_0106', 'UAKoO', 'Unearthed Arcana: Kits of Old', 'Unearthed Arcana', '2014', 'Subclasses (Satire Bard)', 'All other content isn''t available', 'https://media.wizards.com/2015/downloads/dnd/04_UA_Classics_Revisited.pdf', 106),
  ('UALDU', 'SRC_0107', 'UALDU', 'Unearthed Arcana: Light, Dark, Underdark!', 'Unearthed Arcana', '2014', 'Fighting Styles (Close Quarters Shooter, Tunnel Fighter)', 'All other content isn''t available', 'https://media.wizards.com/2015/downloads/dnd/02_UA_Underdark_Characters.pdf', 107),
  ('UAMy', 'SRC_0108', 'UAMy', 'Unearthed Arcana: The Mystic Class', 'Unearthed Arcana', '2014', 'All: Classes (Mystic), Subclasses', NULL, 'https://media.wizards.com/2017/dnd/downloads/UAMystic3.pdf', 108),
  ('UAP', 'SRC_0109', 'UAP', 'Unearthed Arcana: Paladin', 'Unearthed Arcana', '2014', 'Subclasses (Oath of Treachery Paladin)', 'All other content isn''t available', 'https://media.wizards.com/2016/dnd/downloads/UAPaladin_SO_20161219_1.pdf', 109),
  ('UATRR', 'SRC_0110', 'UATRR', 'Unearthed Arcana: The Ranger, Revised', 'Unearthed Arcana', '2014', 'All: Classes (Revised Ranger), Subclasses', NULL, 'https://media.wizards.com/2016/dnd/downloads/UA_RevisedRanger.pdf', 110),
  ('UARAR', 'SRC_0111', 'UARAR', 'Unearthed Arcana: Ranger & Rogue', 'Unearthed Arcana', '2014', 'Subclasses (Primeval Guardian Ranger)', 'All other content isn''t available', 'https://media.wizards.com/2016/dnd/downloads/2017_01_UA_RangerRogue_0117JCMM.pdf', 111),
  ('UAS', 'SRC_0112', 'UAS', 'Unearthed Arcana: Sorcerer', 'Unearthed Arcana', '2014', 'Subclasses (Phoenix Sorcery, Sea Sorcery, Stone Sorcery)', 'All other content isn''t available', 'https://media.wizards.com/2017/dnd/downloads/26_UASorcererUA020617s.pdf', 112),
  ('UAOBM', 'SRC_0113', 'UAOBM', 'Unearthed Arcana: That Old Black Magic', 'Unearthed Arcana', '2014', 'Races (Abyssal Tiefling)', 'All other content isn''t available', 'https://media.wizards.com/2015/downloads/dnd/07_UA_That_Old_Black_Magic.pdf', 113),
  ('UATSC', 'SRC_0114', 'UATSC', 'Unearthed Arcana: Three Subclasses', 'Unearthed Arcana', '2014', 'Subclasses (Invention Wizard)', 'All other content isn''t available', 'https://media.wizards.com/2018/dnd/downloads/UA-3Subclasses0108.pdf', 114),
  ('UAWAW', 'SRC_0115', 'UAWAW', 'Unearthed Arcana: Warlock & Wizard', 'Unearthed Arcana', '2014', 'Subclasses (The Raven Queen Warlock)', 'All other content isn''t available', 'https://media.wizards.com/2017/dnd/downloads/20170213_Wizrd_Wrlck_UAv2_i48nf.pdf', 115),
  ('UAWA', 'SRC_0116', 'UAWA', 'Unearthed Arcana: Waterborne Adventures', 'Unearthed Arcana', '2014', 'Fighting Style (Mariner)', 'All other content isn''t available', 'https://media.wizards.com/2015/downloads/dnd/UA_Waterborne_v3.pdf', 116),
  ('UAWR', 'SRC_0117', 'UAWR', 'Unearthed Arcana: Wizard Revisited', 'Unearthed Arcana', '2014', 'Subclasses (Theurgy Wizard)', 'All other content isn''t available', 'https://media.wizards.com/2017/dnd/downloads/MJ320UAWizardVF2017.pdf', 117),
  ('HTA', 'SRC_0118', 'HTA', 'Hawthorne Arcana', 'Hawthorne Homebrew', '2014', 'All: Backgrounds, Subclasses, Races', NULL, '/arcana/', 118),
  ('HTFG', 'SRC_0119', 'HTFG', 'Hawthorne Field Guide', 'Hawthorne Homebrew', '2014', 'All: Monsters', NULL, 'https://hawthorneguild.github.io/Guides/monsters/', 119)
ON CONFLICT (source_key) DO UPDATE SET
  check_id = EXCLUDED.check_id,
  abbreviation = EXCLUDED.abbreviation,
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  ruleset = EXCLUDED.ruleset,
  allowed_content = EXCLUDED.allowed_content,
  notes_advice = EXCLUDED.notes_advice,
  link = EXCLUDED.link,
  display_order = EXCLUDED.display_order,
  updated_at = timezone('utc'::text, now());

-- ------------------------------------------------------------------------------
-- 6. Enforce Final Schema Constraints
-- ------------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ac_sources_check_id_key'
  ) THEN
    ALTER TABLE public.ac_sources ADD CONSTRAINT ac_sources_check_id_key UNIQUE (check_id);
  END IF;
END $$;

ALTER TABLE public.ac_sources ALTER COLUMN abbreviation SET NOT NULL;
ALTER TABLE public.ac_sources ALTER COLUMN name SET NOT NULL;
ALTER TABLE public.ac_sources ALTER COLUMN type SET NOT NULL;
ALTER TABLE public.ac_sources ALTER COLUMN ruleset SET NOT NULL;

-- ------------------------------------------------------------------------------
-- 7. Deprecate Legacy Category Structures
-- ------------------------------------------------------------------------------
ALTER TABLE public.ac_sources DROP COLUMN IF EXISTS category_id;
DROP TABLE IF EXISTS public.ac_sources_categories CASCADE;

-- ------------------------------------------------------------------------------
-- 8. Performance Indexes
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_ac_sources_source_key ON public.ac_sources (source_key);
CREATE INDEX IF NOT EXISTS idx_ac_sources_check_id ON public.ac_sources (check_id);
CREATE INDEX IF NOT EXISTS idx_ac_sources_type ON public.ac_sources (type);
CREATE INDEX IF NOT EXISTS idx_ac_sources_ruleset ON public.ac_sources (ruleset);
CREATE INDEX IF NOT EXISTS idx_ac_sources_display_order ON public.ac_sources (display_order);

-- ------------------------------------------------------------------------------
-- 9. Trigger for Timestamp Management
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS set_updated_at ON public.ac_sources;
CREATE TRIGGER set_updated_at 
    BEFORE UPDATE ON public.ac_sources
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 10. Row Level Security (RLS) Policies
-- ------------------------------------------------------------------------------
ALTER TABLE public.ac_sources ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ac_sources' AND policyname = 'Allow public read access to ac_sources'
    ) THEN
        CREATE POLICY "Allow public read access to ac_sources" 
            ON public.ac_sources FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ac_sources' AND policyname = 'Allow service_role to manage ac_sources'
    ) THEN
        CREATE POLICY "Allow service_role to manage ac_sources" 
            ON public.ac_sources FOR ALL TO service_role 
            USING (true) WITH CHECK (true);
    END IF;
END $$;
