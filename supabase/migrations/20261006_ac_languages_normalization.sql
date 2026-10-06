-- ==============================================================================
-- Migration: AC Languages Normalization & Staff Admin RLS
-- Date: 2026-10-06
-- Target Database: Supabase PostgreSQL (public schema)
-- Description:
--   1. Creates/verifies public.ac_language_types and public.ac_languages tables.
--   2. Alters display_order to DOUBLE PRECISION to support fractional indexing.
--   3. Adds check_id column to public.ac_languages for 1:1 audit tracking.
--   4. Upserts 5 normalized language types (with descriptions & order).
--   5. Upserts all 128 canonical languages from Allowed_Content_20261004.xlsx
--      (restoring Orc at LAN_0012, setting script, origin, speakers, notes).
--   6. Enforces check_id NOT NULL and UNIQUE constraints on public.ac_languages.
--   7. Configures updated_at triggers and Staff Admin / Engineer RLS policies.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Table Definitions & Schema Evolution
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ac_language_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    display_order DOUBLE PRECISION DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.ac_languages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    check_id TEXT,
    name TEXT NOT NULL UNIQUE,
    type_id UUID REFERENCES public.ac_language_types(id),
    script TEXT,
    origin TEXT,
    typical_speakers TEXT,
    notes TEXT,
    display_order DOUBLE PRECISION DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure check_id column exists on ac_languages
ALTER TABLE public.ac_languages ADD COLUMN IF NOT EXISTS check_id TEXT;

-- Alter display_order to DOUBLE PRECISION for fractional indexing
ALTER TABLE public.ac_language_types
    ALTER COLUMN display_order TYPE DOUBLE PRECISION USING display_order::DOUBLE PRECISION;

ALTER TABLE public.ac_languages
    ALTER COLUMN display_order TYPE DOUBLE PRECISION USING display_order::DOUBLE PRECISION;

-- ------------------------------------------------------------------------------
-- 2. Seed / Upsert Language Types (5 Categories)
-- ------------------------------------------------------------------------------
INSERT INTO public.ac_language_types (name, description, display_order)
VALUES
  ('Class Languages', 'Class languages can only be known or learned by a member of that class.', 1.0),
  ('Standard Languages', NULL, 2.0),
  ('Exotic / Rare Languages', NULL, 3.0),
  ('Monster Languages', 'Many monster languages are difficult to speak or understand owing to physiology or means of communication unique to that species of monster and many have no written form

Monster languages can''t be learned in downtime except as taught by a PC that knows the language or as an adventure reward, using the gold and DTP cost for learning an Exotic / Rare language', 4.0),
  ('Ethnic Languages', 'Ethnic languages are associated with specific ethnic groups. PCs can learn one ethnic language for free as part of character creation


Ethnic languages can be learned in downtime using the gold and DTP cost for learning an Exotic / Rare language, but you must first travel to one of the associated regions', 5.0)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

-- ------------------------------------------------------------------------------
-- 3. Upsert All 128 Languages (LAN_0001 through LAN_0128)
-- ------------------------------------------------------------------------------
INSERT INTO public.ac_languages (check_id, name, type_id, script, origin, typical_speakers, notes, display_order)
SELECT
    v.check_id,
    v.name,
    t.id AS type_id,
    v.script,
    v.origin,
    v.typical_speakers,
    v.notes,
    v.display_order
FROM (VALUES
  ('LAN_0001', 'Druidic', 'Class Languages', NULL, 'Druidic circles', 'Druids, treants, various plants', 'Can only be acquired and used by Druids', 1.0),
  ('LAN_0002', 'Thieves'' Cant', 'Class Languages', NULL, 'Criminal guilds', 'Rogues, criminals', 'Can only be acquired and used by Rogues', 2.0),
  ('LAN_0003', 'Common', 'Standard Languages', 'Common', 'Sigil', 'Humans and the vast majority of other humanoids across the multiverse', '- All PCs must know this language
- In Toril, the script used is known as Thorass', 3.0),
  ('LAN_0004', 'Common Sign Language', 'Standard Languages', NULL, 'Sigil', 'Humans and other humanoids', NULL, 4.0),
  ('LAN_0005', 'Draconic', 'Standard Languages', 'Draconic', 'Dragons', 'Dragons, dragonborn, kobolds, and other draconic creatures', 'In Toril, the script used is known as Iokharic', 5.0),
  ('LAN_0006', 'Dwarvish', 'Standard Languages', 'Dwarvish', 'Dwarves', 'Dwarves', 'In Toril, the script used is known as Dethek', 6.0),
  ('LAN_0007', 'Elvish', 'Standard Languages', 'Elvish', 'Elves', 'Elves, various fey, some celestials', 'In Toril, the script used is known as Espruar', 7.0),
  ('LAN_0008', 'Giant', 'Standard Languages', 'Dwarvish', 'Giants', 'Giants, various humanoid tribes', NULL, 8.0),
  ('LAN_0009', 'Gnomish', 'Standard Languages', 'Dwarvish', 'Gnomes', 'Gnomes', NULL, 9.0),
  ('LAN_0010', 'Goblin', 'Standard Languages', 'Dwarvish', 'Goblinoids', 'Goblinoid', NULL, 10.0),
  ('LAN_0011', 'Halfling', 'Standard Languages', 'Common', 'Halflings', 'Halflings', NULL, 11.0),
  ('LAN_0012', 'Orc', 'Standard Languages', 'Dwarvish', 'Orcs', 'Orcs', NULL, 12.0),
  ('LAN_0013', 'Abyssal', 'Exotic / Rare Languages', 'Infernal', 'Demons of the Abyss', 'Demons, humanoids and undead in league with the Abyss', NULL, 13.0),
  ('LAN_0014', 'Celestial', 'Exotic / Rare Languages', 'Celestial', 'Celestials', 'Celestials, aasimars, and other humanoids in league with the Upper Planes', NULL, 14.0),
  ('LAN_0015', 'Deep Speech', 'Exotic / Rare Languages', NULL, 'Aberrations', 'Aberrations including beholderkin and illithids, humanoids in league with Aberrations', 'Normally has no written script, but uses Elvish when written', 15.0),
  ('LAN_0016', 'Infernal', 'Exotic / Rare Languages', 'Infernal', 'Devils of the Nine Hells', 'Devils, tieflings, and humanoids in league with the Nine Hells', NULL, 16.0),
  ('LAN_0017', 'Primordial', 'Exotic / Rare Languages', 'Dwarvish', 'Elementals', 'Elementals', 'Has four dialects: Aquan, Auran, Ignan, and Terran', 17.0),
  ('LAN_0018', 'Sylvan', 'Exotic / Rare Languages', 'Elvish', 'The Feywild', 'Fey, plants, some celestials, humanoids in league with the Feywild', NULL, 18.0),
  ('LAN_0019', 'Undercommon', 'Exotic / Rare Languages', 'Elvish', 'The Underdark', 'Denizens of the Underdark including drow, duergar, deep gnomes, beholders, etc', NULL, 19.0),
  ('LAN_0020', 'Aarakocra', 'Exotic / Rare Languages', NULL, 'Aarakocra', 'Aarakocra, various jungle druids of Chult', NULL, 20.0),
  ('LAN_0021', 'Aragrakh', 'Exotic / Rare Languages', 'Draconic', 'Dragons of Toril', 'Ancient dragons, some adult dragons of Toril, and members of the Cult of the Dragon', '- This is an older version of Draconic on Toril that is now a dead language
- PCs who learn this language can read written text but not accurately speak or understand it
- This language can''t be learned in downtime except as taught by a PC that knows the language or as an adventure reward', 21.0),
  ('LAN_0022', 'Birdfolk', 'Exotic / Rare Languages', 'Birdfolk', 'Birdfolk of the Feywild and Everden', 'Birdfolk and humblefolk of the Feywild and the world of Everden', 'This language is from the Humblewood setting but is also spoken among those in the Feywild', 22.0),
  ('LAN_0023', 'Cervan', 'Exotic / Rare Languages', NULL, 'Cervans of the Feywild and Everden', 'Cervans of the Feywild and the world of Everden', 'This language is from the Humblewood setting but is also spoken among those in the Feywild', 23.0),
  ('LAN_0024', 'Daelkyr', 'Exotic / Rare Languages', NULL, 'Daelkyr of Eberron', 'Aberrations of Eberron, denizens of Khyber in Eberron', '- This language is from the Eberron setting
- This language can''t be learned in downtime except as taught by a PC that knows the language or as an adventure reward', 24.0),
  ('LAN_0025', 'Gith', 'Exotic / Rare Languages', 'Tir''su', 'Githyanki and githzerai', 'Githyanki, githzerai', NULL, 25.0),
  ('LAN_0026', 'Gnoll', 'Exotic / Rare Languages', NULL, 'Gnolls', 'Gnolls, various humanoids as a regional language', 'Normally has no written form, but uses Abyssal when written', 26.0),
  ('LAN_0027', 'Hedge', 'Exotic / Rare Languages', 'Sylvan', 'Hedges of the Feywild and Everden', 'Hedges of the Feywild and the world of Everden', 'This language is from the Humblewood setting but is also spoken among those in the Feywild', 27.0),
  ('LAN_0028', 'Hulgorykn', 'Exotic / Rare Languages', 'Dwarvish', 'Orcs of Toril', 'Has no living speakers', '- Uses Dethek as script
- This is an older version of Orcish on Toril that is now a dead language
- PCs who learn this language can read written text but not accurately speak or understand it
- This language can''t be learned in downtime except as taught by a PC that knows the language or as an adventure reward', 28.0),
  ('LAN_0029', 'Jerbeen', 'Exotic / Rare Languages', 'Birdfolk', 'Jerbeens of the Feywild and Everden', 'Jerbeens of the Feywild and the world of Everden', 'This language is from the Humblewood setting but is also spoken among those in the Feywild', 29.0),
  ('LAN_0030', 'Leonin', 'Exotic / Rare Languages', 'Common', 'Leonin', 'Leonin', NULL, 30.0),
  ('LAN_0031', 'Loross', 'Exotic / Rare Languages', 'Draconic', 'High Netheril', 'Surviving shadovar', '- Uses Iokharic as script                                                
- Loross can be understood by an Elvish speaker and vice versa
- Often studied by academics, the written form can be automatically translated by those with the Sage or Cloistered Scholar background', 31.0),
  ('LAN_0032', 'Loxodon', 'Exotic / Rare Languages', 'Elvish', 'Loxo and loxodons', 'Loxo, loxodon', NULL, 32.0),
  ('LAN_0033', 'Kothian', 'Exotic / Rare Languages', 'Kothian', 'Minotaurs of Krynn', 'Minotaurs of Krynn', '- This language is from the Dragonlance setting
- This language can''t be learned in downtime except as taught by a PC that knows the language or as an adventure reward', 33.0),
  ('LAN_0034', 'Mapach', 'Exotic / Rare Languages', 'Mapach', 'Mapachs of the Feywild and Everden', 'Mapachs of the Feywild and the world of Everden', 'This language is from the Humblewood setting but is also spoken among those in the Feywild', 34.0),
  ('LAN_0035', 'Merfolk', 'Exotic / Rare Languages', 'Merfolk', 'Merfolk', 'Merfolk, sea elves', NULL, 35.0),
  ('LAN_0036', 'Minotaur', 'Exotic / Rare Languages', 'Minotaur', 'Minotaurs', 'Minotaurs', NULL, 36.0),
  ('LAN_0037', 'Netherese', 'Exotic / Rare Languages', 'Draconic', 'Netheril', 'Warforged, surviving shadovar, and others connected to Netheril', 'Uses Iokharic as script', 37.0),
  ('LAN_0038', 'Old Omuan', 'Exotic / Rare Languages', 'Unique cuneiform script', 'Omu in Chult', 'Has no living speakers', '- The written form can be translated by those with the Sage or Cloistered Scholar background with a DC 10 Intelligence (History) check
- This language can''t be learned in downtime except as taught by a PC that knows the language or as an adventure reward', 38.0),
  ('LAN_0039', 'Olman', 'Exotic / Rare Languages', 'Olman', 'Olman Empire', 'Some humanoids of Maztica', 'This language can''t be learned in downtime except as taught by a PC that knows the language or as an adventure reward', 39.0),
  ('LAN_0040', 'Seldruin', 'Exotic / Rare Languages', 'Elvish', 'Elven High Mages of Toril', 'Older baelnorn liches and some ancient dragons', '- Uses Hamarfae as script
- This is the language of Elven High Magic and is now a dead language
- PCs who learn this language can read written text but not accurately speak or understand it
- This language can''t be learned in downtime except as taught by a PC that knows the language or as an adventure reward', 40.0),
  ('LAN_0041', 'Quori', 'Exotic / Rare Languages', 'Quori', 'Quori', 'Quori, kalashtar', NULL, 41.0),
  ('LAN_0042', 'Tabaxi (Payit)', 'Exotic / Rare Languages', 'Unique pictograms', 'Tabaxi of Maztica', 'Tabaxi from Maztica', '- This is an ancient form of the Payit language
- Those that can speak Payit can understand about half of it', 42.0),
  ('LAN_0043', 'Thorass', 'Exotic / Rare Languages', 'Common', 'Ancient Calishites and Jhaamdathans', 'Surviving shadovar, officials of Amn, Durpar, and Zazesspur, and denizens of Abeir', 'Also known as Old Common, this is the direct precusor to Common on Faerûn', 43.0),
  ('LAN_0044', 'Thri-kreen', 'Exotic / Rare Languages', NULL, 'Thri-kreen', 'Thri-kreen', '- This language does not use spoken words but involves bodily manipulation of antennae and mandibles by thri-kreen
- Non-thri-kreen can understand but not speak this language', 44.0),
  ('LAN_0045', 'Vedalken', 'Exotic / Rare Languages', 'Vedalken', 'Vedalken', 'Vedalken', NULL, 45.0),
  ('LAN_0046', 'Vulpin', 'Exotic / Rare Languages', 'Vulpin', 'Vulpins of the Feywild and Everden', 'Vulpins of the Feywild and the world of Everden', 'This language is from the Humblewood setting but is also spoken among those in the Feywild', 46.0),
  ('LAN_0047', 'Harpspeak', 'Exotic / Rare Languages', NULL, 'Harpers', 'Harpers, one of the major factions of Faerûn', '- This language can only ever be learned as a Stalwart Renown Perk (Renown Score 10+) as part of the Harpers in a session

- Harpspeak is a secret non-verbal language and means of communication known only to Harpers. Harpspeak can be used either in the form of a sign language or with scribed runes to leave hidden messages. 

As a sign language, Harpspeak uses ordinary gestures in patterns that allow for messages to be hidden in seemingly normal and innocuous gestures such as smiles, frowns, and winks. Only a creature that knows Harpspeak understands such messages. It takes four times longer to convey such a message than it does to speak the same idea plainly. 

As scribed runes, Harpspeak can be used to leave behind hidden messages for other Harpers. Creatures who know Harpspeak automatically spot such messages. Others spot the message''s presence with a successful DC 15 Wisdom (Perception) check but can''t decipher it without magic. Harpers sometimes mark the interior of these runes with extra dots to leave behind a misleading message for their enemies and to alert their fellow Harpers that the true symbol and its meaning is somewhere else nearby.', 47.0),
  ('LAN_0048', 'Algaepygmy', 'Monster Languages', NULL, 'Algaepygmies', 'Algaepygmies', NULL, 48.0),
  ('LAN_0049', 'Blink Dog', 'Monster Languages', NULL, 'Blink dogs', 'Blink dogs', NULL, 49.0),
  ('LAN_0050', 'Bullywug', 'Monster Languages', NULL, 'Bullywugs', 'Bullywugs, various jungle druids of Chult', NULL, 50.0),
  ('LAN_0051', 'Deep Crow', 'Monster Languages', NULL, 'Deep crows', 'Deep crows', NULL, 51.0),
  ('LAN_0052', 'Giant Eagle', 'Monster Languages', NULL, 'Giant eagles', 'Giant eagles', NULL, 52.0),
  ('LAN_0053', 'Giant Elk', 'Monster Languages', NULL, 'Giant elks', 'Giant elks', NULL, 53.0),
  ('LAN_0054', 'Giant Owl', 'Monster Languages', NULL, 'Giant owls', 'Giant owls', NULL, 54.0),
  ('LAN_0055', 'Grell', 'Monster Languages', NULL, 'Grell', 'Grell', 'Non-grell cannot speak this language and cannot understand over half of it', 55.0),
  ('LAN_0056', 'Grippli', 'Monster Languages', NULL, 'Grippli', 'Grippli', NULL, 56.0),
  ('LAN_0057', 'Grung', 'Monster Languages', NULL, 'Grungs', 'Grungs', NULL, 57.0),
  ('LAN_0058', 'Hook Horror', 'Monster Languages', NULL, 'Hook horrors', 'Hook horrors', 'Non-hook horrors can understand but not speak this language', 58.0),
  ('LAN_0059', 'Ice Toad', 'Monster Languages', NULL, 'Ice toads', 'Ice toads, various arctic druids', NULL, 59.0),
  ('LAN_0060', 'Ixitxachitl', 'Monster Languages', NULL, 'Ixitxachitl', 'Ixitxachitl', NULL, 60.0),
  ('LAN_0061', 'Kraul', 'Monster Languages', 'Kraul', 'Kraul', 'Kraul', NULL, 61.0),
  ('LAN_0062', 'Kruthik', 'Monster Languages', NULL, 'Kruthik', 'Kruthik', NULL, 62.0),
  ('LAN_0063', 'Modron', 'Monster Languages', NULL, 'Modrons', 'Modrons, various planeswalkers', NULL, 63.0),
  ('LAN_0064', 'Ogre', 'Monster Languages', 'Ogre', 'Ogres', 'Ogres and related creatures, warriors of Thar', NULL, 64.0),
  ('LAN_0065', 'Otyugh', 'Monster Languages', NULL, 'Otyugh', 'Otyugh, denizens of the Underdark including drow, duergar, and deep gnomes', NULL, 65.0),
  ('LAN_0066', 'Qualith', 'Monster Languages', 'Qualith', 'Mind flayers', 'Has no spoken form, but used by illithids as written psionic communication', 'Qualith can only be written by illithids, and non-illithids must make an Intelligence check or use the Comprehend Languages spell to read Qualith', 66.0),
  ('LAN_0067', 'Sahuagin', 'Monster Languages', NULL, 'Sahuagin', 'Sahuagin, sea elves, clergy of aquatic deities, various jungle druids of Chult', NULL, 67.0),
  ('LAN_0068', 'Saurial', 'Monster Languages', NULL, 'Saurials', 'Saurials', '- Uses sound frequencies beyond the range of typical humanoid hearing and thus cannot be spoken or understood by most humanoids. Saurials have learned to communicate with humanoids via various scents.
- Non-saurials can learn scents that correspond to basic emotions', 68.0),
  ('LAN_0069', 'Slaad', 'Monster Languages', NULL, 'Slaadi', 'Slaadi', NULL, 69.0),
  ('LAN_0070', 'Sphinx', 'Monster Languages', NULL, 'Sphinxes', 'Sphinxes', NULL, 70.0),
  ('LAN_0071', 'Tasloi', 'Monster Languages', NULL, 'Tasloi', 'Tasloi', NULL, 71.0),
  ('LAN_0072', 'Tincalli', 'Monster Languages', NULL, 'Tincalli', 'Tincalli', NULL, 72.0),
  ('LAN_0073', 'Troglodyte', 'Monster Languages', NULL, 'Troglodytes', 'Troglodytes', 'Non-troglodytes cannot fully speak and understand this language as half of it is based on the transmission of various scents', 73.0),
  ('LAN_0074', 'Umber Hulk', 'Monster Languages', NULL, 'Umber hulks', 'Umber hulks', '- Also known as Hulkish
- Non-umber hulks can understand but not speak this language', 74.0),
  ('LAN_0075', 'Vegepygmy', 'Monster Languages', NULL, 'Vegepygmies', 'Vegepygmies, Chultans in contact with vegepygmies', NULL, 75.0),
  ('LAN_0076', 'Winter Wolf', 'Monster Languages', NULL, 'Winter wolves', 'Winter wolves', NULL, 76.0),
  ('LAN_0077', 'Worg', 'Monster Languages', NULL, 'Worgs', 'Worgs, other intelligent canines such as barghests and winter wolves', NULL, 77.0),
  ('LAN_0078', 'Yeti', 'Monster Languages', NULL, 'Yetis', 'Yetis, arctic dwarves, some denizens of Icewind Dale', NULL, 78.0),
  ('LAN_0079', 'Yikaria', 'Monster Languages', NULL, 'Yakfolk', 'Yakfolk', NULL, 79.0),
  ('LAN_0080', 'Ziklight', 'Monster Languages', NULL, 'Clockwork horrors', 'Clockwork horrors', 'This is a purely visual language of blinking lights that resembles Morse code', 80.0),
  ('LAN_0081', 'Aglarondan', 'Ethnic Languages', 'Elvish', 'Aglarond', 'Denizens of Aglarond, Altumbel, and other nearby regions', 'Uses Espruar as script', 81.0),
  ('LAN_0082', 'Alzhedo', 'Ethnic Languages', 'Common', 'Calimshan', 'Calishites and other denizens of Calimshan and nearby regions', 'Uses Thorass as script', 82.0),
  ('LAN_0083', 'Bothii', 'Ethnic Languages', NULL, 'Uthgardt nomads and tribes', 'Uthgardt tribespeople and some denizens of Hartsvale', NULL, 83.0),
  ('LAN_0084', 'Chessentan', 'Ethnic Languages', 'Common', 'Chessenta', 'Mulan and denizens of Chessenta and other regions near the Sea of Fallen Stars', 'Uses Thorass as script', 84.0),
  ('LAN_0085', 'Chondathan', 'Ethnic Languages', 'Common', 'Jhaamdathan Empire, Chondath', 'Chondathans, Tethyrians, and denizens of Amn, Chondath, Cormyr, the Dalelands, the Dragon Coast, the Savage North, Sembia, the area formerly known as the Silver Marches, the Sword Coast, Tethyr, Waterdeep, the Western Heartlands, the Vilhon Reach, and other regions across Faerûn', 'Uses Thorass as script', 85.0),
  ('LAN_0086', 'Chultan', 'Ethnic Languages', 'Draconic', 'Chult', 'Chultans and other denizens of Chult, Samarach, and other nearby regions', 'Mainly uses Iokharic as script', 86.0),
  ('LAN_0087', 'Damaran', 'Ethnic Languages', 'Dwarvish', 'Damara', 'Damarans, Nar, and denizens of Damara, the Great Dale, Impiltur, the Moonsea, Narfell, Thesk, and other nearby regions', 'Uses Dethek as script', 87.0),
  ('LAN_0088', 'Dambrathan', 'Ethnic Languages', 'Elvish', 'Dambrath', 'Dambrathans including Arkauins and denizens of Dambrath and other nearby regions', 'Uses Espruar as script', 88.0),
  ('LAN_0089', 'Durpari', 'Ethnic Languages', 'Common', 'Durpar', 'Durpari and denizens of Durpar, Estagund, Var, Veldron, and other nearby regions', 'Uses Thorass as script', 89.0),
  ('LAN_0090', 'Guran', 'Ethnic Languages', 'Common', 'Gurs', 'Gurs', 'Also known as Gurri, it uses Thorass as script', 90.0),
  ('LAN_0091', 'Halruaan', 'Ethnic Languages', 'Draconic', 'Halruaa', 'Halruaans and denizens of Halruaa, Nimbral, and other nearby regions', 'Uses Iokharic as script', 91.0),
  ('LAN_0092', 'Illuskan', 'Ethnic Languages', 'Common', 'Illusk, the North', 'Illuskans, Uthgardt tribes, and others denizens of the northern Sword Coast, including Luskan, Mintarn, the Moonshae Isles, Ruathym, uncivilized areas of the Savage North', 'Uses Thorass as script', 92.0),
  ('LAN_0093', 'Koryoan', 'Ethnic Languages', 'Koryoan', 'Koryo', 'Koryoans of Kara-Tur', NULL, 93.0),
  ('LAN_0094', 'Kozakuran', 'Ethnic Languages', 'Kozakuran', 'Kozakura', 'Kozakurans of Kara-Tur', NULL, 94.0),
  ('LAN_0095', 'Lantanese', 'Ethnic Languages', 'Draconic', 'Lantan', 'Lantanna and other denizens of Lantan', 'Uses Iokharic as script', 95.0),
  ('LAN_0096', 'Midani', 'Ethnic Languages', 'Common', 'Zakhara, Bedine nomads', 'Bedines, Zakharans, and other denizens of the Anauroch Desert and Zakhara', 'Uses Thorass as script', 96.0),
  ('LAN_0097', 'Mulhorandi', 'Ethnic Languages', 'Celestial', 'Mulhorand', 'Mulan and denizens of Mulhoranad and other nearby regions near the Sea of Fallen Stars including Murghôm, Semphar, and Thay', 'Uses Celestial as script', 97.0),
  ('LAN_0098', 'Nexalan', 'Ethnic Languages', 'Draconic or unique pictograms', 'Nexalans of Maztica', 'Nexalans and other denizens of Maztica', 'Uses Iokharic or unique pictograms for script', 98.0),
  ('LAN_0099', 'Payit', 'Ethnic Languages', 'Unique pictograms', 'Payit of Maztica', 'Payit and other denizens of Payit and Far Payit in Maztica', NULL, 99.0),
  ('LAN_0100', 'Rashemi', 'Ethnic Languages', 'Common', 'Rashemen', 'Rashemi and some denizens of Rashemen and nearby regions', 'Uses Thorass as script', 100.0),
  ('LAN_0101', 'Reghedjic', 'Ethnic Languages', NULL, 'Reghed nomads', 'Reghed nomads of Icewind Dale', NULL, 101.0),
  ('LAN_0102', 'Roushoum', 'Ethnic Languages', 'Common', 'Imaskari', 'Imaskari', 'Also known as Imaskari and uses Imaskari as script', 102.0),
  ('LAN_0103', 'Serusan', 'Ethnic Languages', 'Aquan (Primordial)', 'Serôs', 'Denizens of Serôs in the underwater region beneath the Sea of Fallen Stars', '- Uses Aquan, a dialect of Primordial, as script
- This language can''t be learned in downtime except as taught by a PC that knows the language or as an adventure reward', 103.0),
  ('LAN_0104', 'Sespech', 'Ethnic Languages', NULL, 'Sespech', 'Denizens of Sespech and the Shining Plains within Chondath', NULL, 104.0),
  ('LAN_0105', 'Shaaran', 'Ethnic Languages', 'Dwarvish', 'Shaarans', 'Shaarans and denizens of the Shaar, Lake of Steam, Lapaliiya, Sespech, and other nearby regions', 'Uses Dethek as script', 105.0),
  ('LAN_0106', 'Shou', 'Ethnic Languages', 'Draconic', 'Shou Lung', 'Shou and denizens of Shou Lung and Kara-Tur', 'Also known as High Shou or Kao te Shou, it uses Iokharic as script', 106.0),
  ('LAN_0107', 'Tashalan', 'Ethnic Languages', 'Dwarvish', 'Tashalar', 'Tashalans and denizens of Tashalar, Samarach, Thindol, and other nearby regions', 'Uses Dethek as script', 107.0),
  ('LAN_0108', 'Thayan', 'Ethnic Languages', 'Infernal', 'Thay', 'Thayans', 'Uses Infernal as script', 108.0),
  ('LAN_0109', 'Tuigan', 'Ethnic Languages', 'Common', 'Tuigan tribes', 'Tuigan tribes and other denizens of the Hordelands', 'Uses Thorass as script', 109.0),
  ('LAN_0110', 'Turmic', 'Ethnic Languages', 'Common', 'Turmish', 'Turami and denizens of Turmish and other nearby regions', 'Uses Thorass as script', 110.0),
  ('LAN_0111', 'Uluik', 'Ethnic Languages', 'Common', 'Ulutiuns', 'Ulutiuns, arctic dwarves, denizens of northmost regions of Faerûn, including those of the Great Glacier, Damara, Narfell, and Vaasa', 'Uses Thorass as script', 111.0),
  ('LAN_0112', 'Untheric', 'Ethnic Languages', 'Common', 'Unther', 'Mulan and denizens of Unther and other regions near the Sea of Fallen Stars', 'Uses Thorass as script', 112.0),
  ('LAN_0113', 'Wa-an', 'Ethnic Languages', 'Wa-an', 'Wa', 'Wanese of Kara-Tur', NULL, 113.0),
  ('LAN_0114', 'Waelen', 'Ethnic Languages', 'Common', 'Moonshae Isles', 'Ffolk of the Moonshae Isles and Five Kingdoms', 'Uses Thorass as script', 114.0),
  ('LAN_0115', 'Abanasinian', 'Ethnic Languages', 'Common', 'Abanasinia in Krynn', 'Denizens of Abansinia in Krynn', 'This language is from the Dragonlance setting (typically accessible during an adventure or as overseen by a DM)', 115.0),
  ('LAN_0116', 'Ergot', 'Ethnic Languages', 'Common', 'Ergoth in Krynn', 'Denizens of northern Ergoth in Krynn', 'This language is from the Dragonlance setting (typically accessible during an adventure or as overseen by a DM)', 116.0),
  ('LAN_0117', 'Istarian', 'Ethnic Languages', 'Istarian', 'Istar in Krynn', 'Ancient Istarians of Krynn', 'This language is from the Dragonlance setting (typically accessible during an adventure or as overseen by a DM)', 117.0),
  ('LAN_0118', 'Kenderspeak', 'Ethnic Languages', 'Common', 'Kender of Krynn', 'Denizens of Goodlund and Hylo in Krynn', 'This language is from the Dragonlance setting (typically accessible during an adventure or as overseen by a DM)', 118.0),
  ('LAN_0119', 'Kharolian', 'Ethnic Languages', 'Common', 'Kharolians in Krynn', 'Denizens of the Plains of Dust and Tarsis in Krynn', 'This language is from the Dragonlance setting (typically accessible during an adventure or as overseen by a DM)', 119.0),
  ('LAN_0120', 'Khur', 'Ethnic Languages', 'Istarian', 'Khur in Krynn', 'Khur nomads in Krynn', 'This language is from the Dragonlance setting (typically accessible during an adventure or as overseen by a DM)', 120.0),
  ('LAN_0121', 'Nerakese', 'Ethnic Languages', 'Istarian', 'Neraka', 'Denizens of Neraka in Krynn', 'This language is from the Dragonlance setting (typically accessible during an adventure or as overseen by a DM)', 121.0),
  ('LAN_0122', 'Nordmaarian', 'Ethnic Languages', 'Istarian', 'Nordmaar', 'Denizens of Nordmaar in Krynn', 'This language is from the Dragonlance setting (typically accessible during an adventure or as overseen by a DM)', 122.0),
  ('LAN_0123', 'The Patterna', 'Ethnic Languages', 'Common', 'Vistani', 'Vistani in Ravenloft', 'This language is from the Ravenloft setting (typically accessible during an adventure or as overseen by a DM)', 123.0),
  ('LAN_0124', 'Riedran', 'Ethnic Languages', 'Common', 'Rierdra in Eberron', 'Denizens of Sarlona in Eberron', 'This language is from the Eberron setting (typically accessible during an adventure or as overseen by a DM)', 124.0),
  ('LAN_0125', 'Solamnic', 'Ethnic Languages', 'Common', 'Solamnia in Krynn', 'Denizens of Solamnia and Sancrist in Krynn', 'This language is from the Dragonlance setting (typically accessible during an adventure or as overseen by a DM)', 125.0),
  ('LAN_0126', 'Marquesian', 'Ethnic Languages', 'Marquesian', 'Marquet in Exandria', 'Denizens of the Clovis Concord and Menagerie Coast, including figures in high society as well as pirates', 'This language is from the Exandria setting (typically accessible during an adventure or as overseen by a DM)', 126.0),
  ('LAN_0127', 'Naush', 'Ethnic Languages', 'Naush', 'Ki''Nau islanders of the Menagerie Coast in Exandria', 'Denizens of the Clovis Concord and Menagerie Coast, including Ki''Nau islanders and sailors', 'This language is from the Exandria setting (typically accessible during an adventure or as overseen by a DM)', 127.0),
  ('LAN_0128', 'Zemnian', 'Ethnic Languages', 'Zemnian', 'Zemniaz in Exandria', 'Denizens of the Dwendalian Empire, mainly farmers', 'This language is from the Exandria setting (typically accessible during an adventure or as overseen by a DM)', 128.0)
) AS v(check_id, name, type_name, script, origin, typical_speakers, notes, display_order)
JOIN public.ac_language_types t ON t.name = v.type_name
ON CONFLICT (name) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    type_id = EXCLUDED.type_id,
    script = EXCLUDED.script,
    origin = EXCLUDED.origin,
    typical_speakers = EXCLUDED.typical_speakers,
    notes = EXCLUDED.notes,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

-- ------------------------------------------------------------------------------
-- 4. Constraints Enforcement
-- ------------------------------------------------------------------------------
ALTER TABLE public.ac_languages ALTER COLUMN check_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ac_languages_check_id_key'
    ) THEN
        ALTER TABLE public.ac_languages ADD CONSTRAINT ac_languages_check_id_key UNIQUE (check_id);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 5. Updated At Triggers
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS set_updated_at ON public.ac_language_types;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.ac_language_types
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.ac_languages;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.ac_languages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 6. Row Level Security (RLS) Policies
-- ------------------------------------------------------------------------------
ALTER TABLE public.ac_language_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to ac_language_types" ON public.ac_language_types;
CREATE POLICY "Allow public read access to ac_language_types"
    ON public.ac_language_types FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow service_role to manage ac_language_types" ON public.ac_language_types;
CREATE POLICY "Allow service_role to manage ac_language_types"
    ON public.ac_language_types FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins and Engineers can manage ac_language_types" ON public.ac_language_types;
CREATE POLICY "Admins and Engineers can manage ac_language_types"
    ON public.ac_language_types FOR ALL
    TO authenticated
    USING (
      ((SELECT discord_users.roles FROM discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
      OR ((SELECT discord_users.roles FROM discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
    )
    WITH CHECK (
      ((SELECT discord_users.roles FROM discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
      OR ((SELECT discord_users.roles FROM discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
    );

ALTER TABLE public.ac_languages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to ac_languages" ON public.ac_languages;
CREATE POLICY "Allow public read access to ac_languages"
    ON public.ac_languages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow service_role to manage ac_languages" ON public.ac_languages;
CREATE POLICY "Allow service_role to manage ac_languages"
    ON public.ac_languages FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins and Engineers can manage ac_languages" ON public.ac_languages;
CREATE POLICY "Admins and Engineers can manage ac_languages"
    ON public.ac_languages FOR ALL
    TO authenticated
    USING (
      ((SELECT discord_users.roles FROM discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
      OR ((SELECT discord_users.roles FROM discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
    )
    WITH CHECK (
      ((SELECT discord_users.roles FROM discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
      OR ((SELECT discord_users.roles FROM discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
    );
