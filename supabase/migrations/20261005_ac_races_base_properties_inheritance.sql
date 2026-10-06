-- ==============================================================================
-- Migration: Add Base Species Attributes to ac_races and Implement Inheritance in v_ac_races
-- Date: 2026-10-05
-- Description:
-- 1. Adds base character attributes to `public.ac_races` (size, speed, language,
--    str, dex, con, int_stat, wis, cha, extra, notes_advice).
-- 2. Populates base attributes for all 114 base species.
-- 3. Updates `public.v_ac_races` view to resolve lineage inheritance:
--    - Subrace overrides Size & Speed if specified; fallbacks to Base Race.
--    - Subrace overrides/inherits individual Ability Score Increases (Base + Subrace).
--    - Subrace appends/combines Languages.
--    - Subrace appends Extra Traits to Base Traits.
--    - Subrace appends Lineage Notes / Advice to Base Species Notes.
--    - Sets WITH (security_invoker = true) to enforce RLS.
-- ==============================================================================

-- 1. Add base columns to ac_races
ALTER TABLE public.ac_races ADD COLUMN IF NOT EXISTS size TEXT;
ALTER TABLE public.ac_races ADD COLUMN IF NOT EXISTS speed TEXT;
ALTER TABLE public.ac_races ADD COLUMN IF NOT EXISTS language TEXT;
ALTER TABLE public.ac_races ADD COLUMN IF NOT EXISTS str TEXT;
ALTER TABLE public.ac_races ADD COLUMN IF NOT EXISTS dex TEXT;
ALTER TABLE public.ac_races ADD COLUMN IF NOT EXISTS con TEXT;
ALTER TABLE public.ac_races ADD COLUMN IF NOT EXISTS int_stat TEXT;
ALTER TABLE public.ac_races ADD COLUMN IF NOT EXISTS wis TEXT;
ALTER TABLE public.ac_races ADD COLUMN IF NOT EXISTS cha TEXT;
ALTER TABLE public.ac_races ADD COLUMN IF NOT EXISTS extra TEXT;
ALTER TABLE public.ac_races ADD COLUMN IF NOT EXISTS notes_advice TEXT;

-- 2. For single-lineage species, initialize base properties from their primary subrace record
UPDATE public.ac_races r
SET 
    size = COALESCE(r.size, s.size),
    speed = COALESCE(r.speed, s.speed),
    language = COALESCE(r.language, s.language),
    str = COALESCE(r.str, s.str),
    dex = COALESCE(r.dex, s.dex),
    con = COALESCE(r.con, s.con),
    int_stat = COALESCE(r.int_stat, s.int_stat),
    wis = COALESCE(r.wis, s.wis),
    cha = COALESCE(r.cha, s.cha),
    extra = COALESCE(r.extra, s.extra),
    notes_advice = COALESCE(r.notes_advice, s.notes_advice)
FROM (
    SELECT DISTINCT ON (race_id) *
    FROM public.ac_subraces
    ORDER BY race_id, display_order ASC
) s
WHERE r.race_id = s.race_id;

-- 3. Explicitly set canonical base attributes for species with distinct subraces/lineages

-- Aasimar
UPDATE public.ac_races SET
    size = 'M', speed = '30', language = 'Common, Celestial',
    str = NULL, dex = NULL, con = NULL, int_stat = NULL, wis = NULL, cha = '2',
    extra = 'Darkvision (60''); Celestial Resistance; Healing Hands; Light Bearer'
WHERE name = 'Aasimar';

-- Cervan (2014)
UPDATE public.ac_races SET
    size = 'M', speed = '30', language = 'Birdfolk, Cervan',
    str = NULL, dex = NULL, con = '2', int_stat = NULL, wis = NULL, cha = NULL,
    extra = 'Practical; Surge of Vigor'
WHERE name = 'Cervan (2014)';

-- Corvum
UPDATE public.ac_races SET
    size = 'M', speed = '30', language = 'Birdfolk, Auran',
    str = NULL, dex = NULL, con = NULL, int_stat = '2', wis = NULL, cha = NULL,
    extra = 'Glide; Talons; Appraising Eye'
WHERE name = 'Corvum';

-- Dragonborn (2014)
UPDATE public.ac_races SET
    size = 'M', speed = '30', language = 'Common, Draconic',
    str = '2', dex = NULL, con = NULL, int_stat = NULL, wis = NULL, cha = '1',
    extra = 'Draconic Ancestry; Breath Weapon; Damage Resistance',
    notes_advice = '- Breath Weapon can be used as an action or as a bonus action.
- Can have non-prehensile tails.
- The statistics of this species can be used to represent a Half Dragon, as described in Fizban''s Treasury of Dragons as well as in the Monster Manual. If you choose to play a Half Dragon in this way, your creature type is Dragon, not Humanoid.
- As described in the Player Guidelines, you can choose to play as a mixture of species in Allowed Content and choose one of the component species to play (e.g. a half-dwarf, half-elf and using the statistics of the Elf species). If you play a mixture of species that includes Half Dragon as described above, you can choose for your creature type to be Dragon even if you select a different species to play. For example, a half Dragonborn (Half Dragon), half Tiefling played using the statistics of the Tiefling species but with a creature type of Dragon, not Humanoid.'
WHERE name = 'Dragonborn (2014)';

-- Dwarf (2014)
UPDATE public.ac_races SET
    size = 'M', speed = '25', language = 'Common, Dwarvish',
    str = NULL, dex = NULL, con = '2', int_stat = NULL, wis = NULL, cha = NULL,
    extra = 'Darkvision (60''); Dwarven Resilience; Dwarven Combat Training; Stonecunning; Speed not reduced by heavy armor'
WHERE name = 'Dwarf (2014)';

-- Elf (2014)
UPDATE public.ac_races SET
    size = 'M', speed = '30', language = 'Common, Elvish',
    str = NULL, dex = '2', con = NULL, int_stat = NULL, wis = NULL, cha = NULL,
    extra = 'Darkvision (60''); Keen Senses; Fey Ancestry; Trance',
    notes_advice = '- Can choose to benefit from Blessed of Corellon (MTF p. 45), which allows changing sex whenever finishing a long rest.
- Due to the nature of their trance and long-lived lives, elves raised in typical elven communities usually aren''t considered full adults in the eyes of elven society until after their first century. However, elves achieve full physical and mental maturity at the same rate as an adult human. As such, elves that become adventurers prior to the passing of their first century are atypical but not impossible.'
WHERE name = 'Elf (2014)';

-- Gallus (2014)
UPDATE public.ac_races SET
    size = 'M', speed = '30', language = 'Birdfolk, Auran',
    str = NULL, dex = NULL, con = NULL, int_stat = NULL, wis = '2', cha = NULL,
    extra = 'Glide; Wing Flap; Communal'
WHERE name = 'Gallus (2014)';

-- Genasi
UPDATE public.ac_races SET
    size = 'M', speed = '30', language = 'Common, Primordial',
    str = NULL, dex = NULL, con = '2', int_stat = NULL, wis = NULL, cha = NULL
WHERE name = 'Genasi';

-- Gnome (2014)
UPDATE public.ac_races SET
    size = 'S', speed = '25', language = 'Common, Gnomish',
    str = NULL, dex = NULL, con = NULL, int_stat = '2', wis = NULL, cha = NULL,
    extra = 'Darkvision (60''); Gnome Cunning'
WHERE name = 'Gnome (2014)';

-- Half-Elf
UPDATE public.ac_races SET
    size = 'M', speed = '30', language = 'Common, Elvish, +1',
    str = NULL, dex = NULL, con = NULL, int_stat = NULL, wis = NULL, cha = '2',
    extra = 'Darkvision (60''); Fey Ancestry; Skill Versatility',
    notes_advice = 'For 2024 PCs, this species is superseded by and is replaced with Khoravar (as from Eberron: Forge of the Artificer)'
WHERE name = 'Half-Elf';

-- Halfling (2014)
UPDATE public.ac_races SET
    size = 'S', speed = '25', language = 'Common, Halfling',
    str = NULL, dex = '2', con = NULL, int_stat = NULL, wis = NULL, cha = NULL,
    extra = 'Lucky; Brave; Halfling Nimbleness'
WHERE name = 'Halfling (2014)';

-- Luma (2014)
UPDATE public.ac_races SET
    size = 'S', speed = '25', language = 'Birdfolk, Auran',
    str = NULL, dex = NULL, con = NULL, int_stat = NULL, wis = NULL, cha = '2',
    extra = 'Glide; Wing Flap; Fated; Touched'
WHERE name = 'Luma (2014)';

-- Nymph
UPDATE public.ac_races SET
    size = 'S or M', speed = '25', language = 'Common, Sylvan, +1'
WHERE name = 'Nymph';

-- Raptor (2014)
UPDATE public.ac_races SET
    size = 'S', speed = '25', language = 'Birdfolk, Auran',
    str = NULL, dex = '2', con = NULL, int_stat = NULL, wis = NULL, cha = NULL,
    extra = 'Glide; Talons; Keen Senses; Hunter''s Training'
WHERE name = 'Raptor (2014)';

-- Shifter
UPDATE public.ac_races SET
    size = 'M', speed = '30', language = 'Common',
    extra = 'Darkvision (60''); Shifting'
WHERE name = 'Shifter';

-- Strig (2014)
UPDATE public.ac_races SET
    size = 'M', speed = '30', language = 'Birdfolk, Auran',
    str = '2', dex = NULL, con = NULL, int_stat = NULL, wis = NULL, cha = NULL,
    extra = 'Glide; Talons; Darkvision (60''); Patterned Feathers'
WHERE name = 'Strig (2014)';

-- Tiefling (2014)
UPDATE public.ac_races SET
    size = 'M', speed = '30', language = 'Common, Infernal',
    str = NULL, dex = NULL, con = NULL, int_stat = NULL, wis = NULL, cha = '2',
    extra = 'Darkvision (60''); Hellfire Resistance',
    notes_advice = '- Your spellcasting ability for these racial spells is your choice of INT, WIS, or CHA
- You can additionally cast the listed racial spells with spell slots
- Flight is enabled at character level 5+'
WHERE name = 'Tiefling (2014)';

-- 2024 Species with lineages
UPDATE public.ac_races SET
    size = 'M', speed = '30', language = 'Birdfolk, Cervan',
    extra = 'Practical; Surge of Vigor'
WHERE name = 'Cervan (2024)';

UPDATE public.ac_races SET
    size = 'M', speed = '30', language = 'Birdfolk, Auran',
    extra = 'Glide; Talons; Appraising Eye'
WHERE name = 'Corvum (2024)';

UPDATE public.ac_races SET
    size = 'M', speed = '30', language = 'Common, +1',
    extra = 'Darkvision (60''); Keen Senses; Fey Ancestry; Trance'
WHERE name = 'Elf (2024)';

UPDATE public.ac_races SET
    size = 'M', speed = '30', language = 'Birdfolk, Auran',
    extra = 'Glide; Wing Flap; Communal'
WHERE name = 'Gallus (2024)';

UPDATE public.ac_races SET
    size = 'S', speed = '30', language = 'Common, +1',
    extra = 'Darkvision (60''); Gnome Cunning'
WHERE name = 'Gnome (2024)';

UPDATE public.ac_races SET
    size = 'M', speed = '35', language = 'Common, +1',
    extra = 'Giant Ancestry; Large Form; Powerful Build'
WHERE name = 'Goliath (2024)';

UPDATE public.ac_races SET
    size = 'S', speed = '30', language = 'Birdfolk, Auran',
    extra = 'Glide; Wing Flap; Fated; Touched'
WHERE name = 'Luma (2024)';

UPDATE public.ac_races SET
    size = 'S or M', speed = '25 or 30', language = 'Birdfolk, Auran',
    extra = 'Glide; Talons; Hunter''s Training'
WHERE name = 'Raptor (2024)';

UPDATE public.ac_races SET
    size = 'S or M', speed = '30', language = 'Common, +1',
    extra = 'Darkvision (60''); Shifting'
WHERE name = 'Shifter (2024)';

UPDATE public.ac_races SET
    size = 'M', speed = '30', language = 'Birdfolk, Auran',
    extra = 'Glide; Talons; Darkvision (60''); Patterned Feathers'
WHERE name = 'Strig (2024)';

UPDATE public.ac_races SET
    size = 'S or M', speed = '30', language = 'Common, +1',
    extra = 'Darkvision (60''); Otherworldly Presence; Fiendish Legacy'
WHERE name = 'Tiefling (2024)';


-- 4. Recreate v_ac_races view to resolve lineage inheritance
DROP VIEW IF EXISTS public.v_ac_races CASCADE;

CREATE OR REPLACE VIEW public.v_ac_races WITH (security_invoker = true) AS
SELECT
    s.id,
    r.name AS race,
    r.name,
    s.subrace,
    COALESCE(s.size, r.size) AS size,
    COALESCE(s.speed, r.speed) AS speed,
    CASE 
        WHEN s.language IS NULL OR s.language = '' THEN r.language
        WHEN r.language IS NULL OR r.language = '' THEN s.language
        WHEN s.language = r.language THEN r.language
        WHEN s.language LIKE '+%' OR s.language LIKE '1 +%' THEN 
            CONCAT_WS(', ', r.language, s.language)
        WHEN r.language NOT LIKE CONCAT('%', s.language, '%') THEN
            CONCAT_WS(', ', r.language, s.language)
        ELSE s.language
    END AS language,
    COALESCE(s.str, r.str) AS str,
    COALESCE(s.dex, r.dex) AS dex,
    COALESCE(s.con, r.con) AS con,
    COALESCE(s.int_stat, r.int_stat) AS int_stat,
    COALESCE(s.wis, r.wis) AS wis,
    COALESCE(s.cha, r.cha) AS cha,
    CASE 
        WHEN r.extra IS NOT NULL AND s.extra IS NOT NULL AND r.extra != s.extra 
            THEN CONCAT_WS(E'\n', r.extra, s.extra)
        ELSE COALESCE(s.extra, r.extra)
    END AS extra,
    array_to_string(s.sources, ', ') AS source,
    s.sources,
    CASE 
        WHEN r.notes_advice IS NOT NULL AND s.notes_advice IS NOT NULL AND r.notes_advice != s.notes_advice 
            THEN CONCAT_WS(E'\n', r.notes_advice, s.notes_advice)
        ELSE COALESCE(s.notes_advice, r.notes_advice)
    END AS notes_advice,
    CASE 
        WHEN r.notes_advice IS NOT NULL AND s.notes_advice IS NOT NULL AND r.notes_advice != s.notes_advice 
            THEN CONCAT_WS(E'\n', r.notes_advice, s.notes_advice)
        ELSE COALESCE(s.notes_advice, r.notes_advice)
    END AS rage_advice,
    s.check_id,
    s.display_order,
    s.created_at,
    s.updated_at
FROM public.ac_subraces s
JOIN public.ac_races r ON s.race_id = r.race_id;
