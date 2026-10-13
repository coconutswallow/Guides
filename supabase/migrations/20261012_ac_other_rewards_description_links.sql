-- Migration: 20261012_ac_other_rewards_description_links.sql
-- Description: Convert cross-reference and source links in public.ac_other_rewards descriptions to markdown format,
--              and restore notes_advice for Talisman of the Gauntlet (HB) in public.ac_loot.
-- Targets:
--   1. External D&D Beyond links on 14 deity factions (REW_0299 through REW_0312)
--   2. Internal link to Monsters compendium in REW_0353 (Flourishing Favor)
--   3. Internal links to Loot tab in REW_0357 (Renown Rewards (UUC))
--   4. Internal links to Equipment tab in REW_0229 and REW_0345
--   5. Internal link to Bastions tab in REW_0348 (Legate's Legions)
--   6. Restore notes_advice for LOT_1073 (Talisman of the Gauntlet (HB)) with Order of the Gauntlet link

-- 1. Update 14 deity faction descriptions with D&D Beyond markdown link
UPDATE public.ac_other_rewards
SET description = replace(
    description,
    'See Forgotten Realms: Heroes of Faerûn for a description and list of Renown rewards.',
    'See [Forgotten Realms: Heroes of Faerûn](https://www.dndbeyond.com/sources/dnd/frhof) for a description and list of Renown rewards.'
)
WHERE description LIKE '%See Forgotten Realms: Heroes of Faerûn for a description and list of Renown rewards.%'
  AND description NOT LIKE '%[Forgotten Realms: Heroes of Faerûn]%';

-- 2. Update Flourishing Favor (REW_0353) with Monsters compendium link
UPDATE public.ac_other_rewards
SET description = replace(
    description,
    'in the Fair Game category of Allowed Content.',
    'in the [Fair Game](/allowed-content/#monsters) category of Allowed Content.'
)
WHERE check_id = 'REW_0353'
  AND description LIKE '%in the Fair Game category of Allowed Content.%'
  AND description NOT LIKE '%[Fair Game]%';

-- 3. Update Renown Rewards (UUC) (REW_0357) with Loot tab links
UPDATE public.ac_other_rewards
SET description = replace(
    description,
    'Allowed Content (Loot)',
    'Allowed Content ([Loot](/allowed-content/#loot))'
)
WHERE check_id = 'REW_0357'
  AND description LIKE '%Allowed Content (Loot)%'
  AND description NOT LIKE '%[Loot]%';

-- 4. Update Pets listed in Equipment (REW_0229) and Goblin Munitions (REW_0345)
UPDATE public.ac_other_rewards
SET description = replace(
    description,
    'Pets as listed in Equipment',
    'Pets as listed in [Equipment](/allowed-content/#equipment)'
)
WHERE check_id = 'REW_0229'
  AND description LIKE '%Pets as listed in Equipment%'
  AND description NOT LIKE '%[Equipment]%';

UPDATE public.ac_other_rewards
SET description = replace(
    description,
    'as listed in Equipment as a downtime activity',
    'as listed in [Equipment](/allowed-content/#equipment) as a downtime activity'
)
WHERE check_id = 'REW_0345'
  AND description LIKE '%as listed in Equipment as a downtime activity%'
  AND description NOT LIKE '%[Equipment]%';

-- 5. Update Legate's Legions (REW_0348)
UPDATE public.ac_other_rewards
SET description = replace(
    description,
    'from the War Room Bastion Facility',
    'from the [War Room](/allowed-content/#bastions) Bastion Facility'
)
WHERE check_id = 'REW_0348'
  AND description LIKE '%from the War Room Bastion Facility%'
  AND description NOT LIKE '%[War Room]%';

-- 6. Restore Talisman of the Gauntlet (HB) (LOT_1073) notes_advice in ac_loot
UPDATE public.ac_loot
SET notes_advice = '- This homebrew item was created by greensprout
- This item can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 50+ with the [Order of the Gauntlet](/allowed-content/#other-rewards). It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 17+ DMPC with a Renown Score of 50+ with the Order of the Gauntlet can choose to obtain this item in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as an item reward.'
WHERE check_id = 'LOT_1073'
  AND (notes_advice IS NULL OR notes_advice NOT LIKE '%[Order of the Gauntlet]%');
