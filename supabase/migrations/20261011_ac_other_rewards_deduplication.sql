-- Migration: AC Other Rewards Deduplication
-- Target Table: public.ac_other_rewards
-- Purpose: Remove orphan duplicate rows REW_0376 ('Quirk') and REW_0377 ('Piety'),
--          and ensure canonical rows REW_0159 and REW_0161 preserve full notes and instructions.

-- 1. Update notes_advice on canonical rows REW_0159 and REW_0161
UPDATE public.ac_other_rewards
SET notes_advice = '- Only Full DMs can create and award Quirks without a request. 
- Quirks don''t take up item slots for a session and the DM can give a character a Quirk at their discretion due to events in an adventure.
- A character can have any number of Quirks. They can''t be traded or sold.
- The effect of a Quirk should either be cosmetic or if it has a mechanical effect, the effect should be no greater than a minor magical property as described in the 2014/2024 DMG (except for the Guardian or Unbreakable properties)
- A list of available Quirks can also be seen below that are available to any DM to award without a request.',
    updated_at = NOW()
WHERE check_id = 'REW_0159';

UPDATE public.ac_other_rewards
SET notes_advice = '- A character with this kind of Supernatural Gift has a starting Piety score of 1 in relation to a deity or faith, unless it is already higher than 1. See Chapter 2 of the Mythic Odysseys of Theros for rules on how this score works (ignore the guidance regarding changing gods). 
- As a guideline and as determined by the DM, a character''s Piety typically increases by 1 during most sessions of play where they are following the tenets of that deity and faith as determined by the DM, and a single deed typically changes their Piety score by only 1 point in either direction unless the action is very significant as determined by the DM. Regardless, any increase or decrease to Piety (if any) is wholly determined by the DM.
- A DM that awards this Supernatural Gift must note in their session log the deity or faith this Supernatural Gift is associated with, as well as circumstances that can increase or decrease Piety, following the template in Mythic Odysseys of Theros.
- A character''s Piety score can change even when this Supernatural Gift is not active.
- Each Piety Supernatural Gift provides certain benefits at certain Piety thresholds—3, 10, 25, and 50—which have associated level prerequisites as well: level 1+, 5+, 11+, and 17+ respectively.
- For purposes of the number of Supernatural Gifts a character can have active at a time, this Supernatural Gift''s tier of play corresponds to the tier of the highest level trait they benefit from. For example, it would be treated as a Tier 3 Supernatural Gift when used by a level 12 character with 30 Piety (since they gain the benefit of the trait that requires being level 11+ and having 25+ Piety).
- The design and approval of this Supernatural Gift follows the process described above for Homebrew Supernatural Rewards.
- A list of available Piety Supernatural Gifts can also be seen below that are available to any Full DM to award without a request, each associated with a specific deity or faith.',
    updated_at = NOW()
WHERE check_id = 'REW_0161';

-- 2. Delete redundant duplicate entries REW_0376 and REW_0377
DELETE FROM public.ac_other_rewards
WHERE check_id IN ('REW_0376', 'REW_0377');
