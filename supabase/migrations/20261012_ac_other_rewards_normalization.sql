-- ============================================================================
-- Migration: Allowed Content Other Rewards Normalization (ac_other_rewards)
-- File: supabase/migrations/20261012_ac_other_rewards_normalization.sql
-- Description:
--   Normalizes public.ac_other_rewards and public.ac_other_rewards_categories.
--   - Backs up legacy tables to ac_other_rewards_legacy_backup and ac_other_rewards_categories_legacy_backup.
--   - Resets categories down to 5 canonical categories with complete Level 1 rules.
--   - Normalizes 387 reward items (check_id REW_0001 through REW_0387).
--   - Links tier_id directly to public.ac_tiers (with is_dm_select & tier_display).
--   - Normalizes sources to TEXT[] referencing ac_sources.source_key.
--   - Sets up Public Read RLS and Staff Admin/Engineer management policies.
-- ============================================================================

-- 1. Create backups of legacy tables if they exist
CREATE TABLE IF NOT EXISTS public.ac_other_rewards_categories_legacy_backup AS 
SELECT * FROM public.ac_other_rewards_categories;

CREATE TABLE IF NOT EXISTS public.ac_other_rewards_legacy_backup AS 
SELECT * FROM public.ac_other_rewards;

-- 2. Drop existing dependent table and categories
DROP TABLE IF EXISTS public.ac_other_rewards CASCADE;
DROP TABLE IF EXISTS public.ac_other_rewards_categories CASCADE;

-- 3. Create normalized categories table (Level 1 Scope)
CREATE TABLE public.ac_other_rewards_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(64) UNIQUE NOT NULL,
    notes TEXT NOT NULL,
    display_order DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for category ordering
CREATE INDEX idx_ac_other_rewards_categories_display_order 
    ON public.ac_other_rewards_categories(display_order);

-- Enable RLS on categories
ALTER TABLE public.ac_other_rewards_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ac_other_rewards_categories_public_read"
    ON public.ac_other_rewards_categories FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "ac_other_rewards_categories_service_role"
    ON public.ac_other_rewards_categories FOR ALL
    TO service_role
    USING (true) WITH CHECK (true);

CREATE POLICY "ac_other_rewards_categories_staff_manage"
    ON public.ac_other_rewards_categories FOR ALL
    TO authenticated
    USING (
        ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
        OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
    )
    WITH CHECK (
        ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
        OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
    );

-- Seed 5 canonical categories
INSERT INTO public.ac_other_rewards_categories (id, name, notes, display_order) VALUES
('c0000001-0000-0000-0000-000000000001', 'Dark Gifts', 'Dark Gifts are a type of Supernatural Reward that consist of a mixture of beneficial and detrimental abilities due to contact with dark supernatural forces. They cannot be traded or sold.
Dark Gifts do not replace an item in the session. A DM can give a character or multiple characters a Dark Gift at their discretion due to events in an adventure.
A character can only ever have one Dark Gift. If a character receives another Dark Gift, they must choose to keep the old Dark Gift or lose it and replace it with the new one.', 10.0),
('c0000001-0000-0000-0000-000000000002', 'Supernatural Gifts', 'Supernatural Gifts are a type of Supernatural Reward that consist of extraordinary permanent abilities acquired after great deeds or contact with powerful supernatural forces. They cannot be traded or sold.
Supernatural Gifts follow the normal item distribution rules and are treated as permanent items and can only be awarded by Full DMs.
A character can have multiple Supernatural Gifts, but can only benefit from a number whose combined tier is no greater than their Proficiency Bonus. They choose which combination of Supernatural Gifts if any they have active whenever they finish a Long Rest.', 20.0),
('c0000001-0000-0000-0000-000000000003', 'Mythic Gifts (Tier S)', 'Mythic Gifts are a type of Supernatural Reward that consist of extraordinary permanent abilities only available to level 20 characters. They cannot be traded or sold.
Mythic Gifts are Tier S rewards: they are multisession rewards that require 8+ sessions at APL 20 to award and can only be awarded by Full DMs.
A character can have multiple Mythic Gifts, but can only benefit from one at a time. They choose which Mythic Gift if any they have active whenever they finish a Long Rest.', 30.0),
('c0000001-0000-0000-0000-000000000004', 'Charms', 'Charms are a type of Supernatural Reward that consist of minor abilities that typically have limited uses similar to consumable items. They cannot be traded or sold.
Charms follow the normal item distribution rules and are treated as consumable items (only 1 charm per item slot except where otherwise stated)
A character can have any number of charms, but can''t benefit from the same charm more than once: a character receiving the same charm again only regains any expended uses of the charm.', 40.0),
('c0000001-0000-0000-0000-000000000005', 'Miscellaneous', 'Catch-all category covering Bastions, Quirks, Piety, Marks of Prestige, Mounts, Pets, Renown (and Renown Perks), Groups (Factions/Organizations/Communities), and Story Outcomes.', 50.0);

-- 4. Create normalized ac_other_rewards table
CREATE TABLE public.ac_other_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    check_id VARCHAR(32) UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category_id UUID NOT NULL REFERENCES public.ac_other_rewards_categories(id) ON DELETE RESTRICT,
    tier_id UUID REFERENCES public.ac_tiers(id) ON DELETE RESTRICT,
    type TEXT NOT NULL,
    is_dm_select BOOLEAN DEFAULT false NOT NULL,
    event_category VARCHAR(64),
    tier_display TEXT NOT NULL,
    source TEXT[] NOT NULL,
    description TEXT,
    notes_advice TEXT,
    display_order DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_ac_other_rewards_check_id ON public.ac_other_rewards(check_id);
CREATE INDEX idx_ac_other_rewards_category_id ON public.ac_other_rewards(category_id);
CREATE INDEX idx_ac_other_rewards_tier_id ON public.ac_other_rewards(tier_id);
CREATE INDEX idx_ac_other_rewards_display_order ON public.ac_other_rewards(display_order);
CREATE INDEX idx_ac_other_rewards_source ON public.ac_other_rewards USING GIN (source);

-- Enable RLS on rewards
ALTER TABLE public.ac_other_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ac_other_rewards_public_read"
    ON public.ac_other_rewards FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "ac_other_rewards_service_role"
    ON public.ac_other_rewards FOR ALL
    TO service_role
    USING (true) WITH CHECK (true);

CREATE POLICY "ac_other_rewards_staff_manage"
    ON public.ac_other_rewards FOR ALL
    TO authenticated
    USING (
        ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
        OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
    )
    WITH CHECK (
        ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
        OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
    );

-- 5. Seed 387 Canonical Rewards
INSERT INTO public.ac_other_rewards (
    id, check_id, name, category_id, tier_id, type, is_dm_select, event_category,
    tier_display, source, description, notes_advice, display_order
) VALUES
('6a1caca2-1dbc-5593-82ce-273b39cf55e2', 'REW_0001', 'Aberrant Anatomy', 'c0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Dark Gift (Supernatural Reward)', false, NULL, 'T1', ARRAY['RHW']::text[], 'Dark Gift. See book for description.', 'The Aberrant Anatomy Dark Gift feat received as a Dark Gift (Supernatural Reward) can''t be replaced by any means except with another Dark Gift (Supernatural Reward).', 10.0),
('d391464e-11cf-5ff3-aaa6-17004c5aca5f', 'REW_0002', 'Echoing Soul', 'c0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Dark Gift (Supernatural Reward)', false, NULL, 'T1', ARRAY['VRGR']::text[], 'Dark Gift. See book for description.', '- Echoing Soul received as a Dark Gift (Supernatural Reward) uses the rules for Echoing Soul from Van Richten’s Guide to Ravenloft in 2014 games and uses the rules for the corresponding Dark Gift feat from Ravenloft: The Horrors Within in 2024 games. Outside of games, a character uses the version of corresponding to their PC''s game version.
- For 2024 PCs and in 2024 games, the Echoing Soul Dark Gift feat received as a Dark Gift (Supernatural Reward) can''t be replaced by any means except with another Dark Gift (Supernatural Reward).', 20.0),
('63bc2ecf-1288-5b8c-b6dc-0159962d247e', 'REW_0003', 'Gathered Whispers', 'c0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Dark Gift (Supernatural Reward)', false, NULL, 'T1', ARRAY['VRGR']::text[], 'Dark Gift. See book for description.', '- Gathered Whispers received as a Dark Gift (Supernatural Reward) uses the rules for Gathered Whispers from Van Richten’s Guide to Ravenloft in 2014 games and uses the rules for the corresponding Dark Gift feat from Ravenloft: The Horrors Within in 2024 games. Outside of games, a character uses the version of corresponding to their PC''s game version.
- For 2024 PCs and in 2024 games, the Gathered Whispers Dark Gift feat received as a Dark Gift (Supernatural Reward) can''t be replaced by any means except with another Dark Gift (Supernatural Reward).', 30.0),
('d0b423bb-436a-58c2-b76f-42877e3101ef', 'REW_0004', 'Living Shadow', 'c0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Dark Gift (Supernatural Reward)', false, NULL, 'T1', ARRAY['VRGR']::text[], 'Dark Gift. See book for description.', '- Living Shadow received as a Dark Gift (Supernatural Reward) uses the rules for Living Shadow from Van Richten’s Guide to Ravenloft in 2014 games and uses the rules for the corresponding Dark Gift feat from Ravenloft: The Horrors Within in 2024 games. Outside of games, a character uses the version of corresponding to their PC''s game version.
- For 2024 PCs and in 2024 games, the Living Shadow Dark Gift feat received as a Dark Gift (Supernatural Reward) can''t be replaced by any means except with another Dark Gift (Supernatural Reward).', 40.0),
('b338942e-61de-5ed8-ba5a-d3537ad17613', 'REW_0005', 'Mist Walker', 'c0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Dark Gift (Supernatural Reward)', false, NULL, 'T1', ARRAY['VRGR']::text[], 'Dark Gift. See book for description.', '- Mist Walker received as a Dark Gift (Supernatural Reward) uses the rules for Mist Walker from Van Richten’s Guide to Ravenloft in 2014 games and uses the rules for the corresponding Dark Gift feat from Ravenloft: The Horrors Within in 2024 games. Outside of games, a character uses the version of corresponding to their PC''s game version. 
- For 2024 PCs and in 2024 games, the Mist Walker Dark Gift feat received as a Dark Gift (Supernatural Reward) can''t be replaced by any means except with another Dark Gift (Supernatural Reward).                                       
- The character''s threshold equals their Constitution modifier x 7 (minimum of 7). A character can spend DTP in Hawthorne up to this threshold, but then must travel to another location and rest there before returning to Hawthorne. If this travel and rest occurs in an adventure, this resets the threshold and must be recorded in the session log. For example, a level 3 character with a +3 Constitution modifier has a threshold of 21 days. If they spend 3 DTP copying spells, they should record their downtime log in the form of: @DiscordName as CharacterName (3) spends 3 DTP copying the following spells... [3/21 for Mist Walker Threshold]', 50.0),
('609dd51b-5c8f-560a-91b7-8672f86a693d', 'REW_0006', 'Second Skin', 'c0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Dark Gift (Supernatural Reward)', false, NULL, 'T1', ARRAY['VRGR']::text[], 'Dark Gift. See book for description.', '- Second Skin received as a Dark Gift (Supernatural Reward) uses the rules for Second Skin from Van Richten’s Guide to Ravenloft in 2014 games and uses the rules for the corresponding Dark Gift feat from Ravenloft: The Horrors Within in 2024 games. Outside of games, a character uses the version of corresponding to their PC''s game version.     
- For 2024 PCs and in 2024 games, the Second Skin Dark Gift feat received as a Dark Gift (Supernatural Reward) can''t be replaced by any means except with another Dark Gift (Supernatural Reward).                                   
- The specific catalyst must be listed in the session log where this Dark Gift was acquired.', 60.0),
('993d20e0-31db-5aed-ad6c-e21afa4c25d7', 'REW_0007', 'Symbiotic Being', 'c0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Dark Gift (Supernatural Reward)', false, NULL, 'T1', ARRAY['VRGR']::text[], 'Dark Gift. See book for description.', '- Symbiotic Being received as a Dark Gift (Supernatural Reward) uses the rules for Symbiotic Being from Van Richten’s Guide to Ravenloft in 2014 games and uses the rules for the corresponding Dark Gift feat from Ravenloft: The Horrors Within in 2024 games. Outside of games, a character uses the version of corresponding to their PC''s game version.
- For 2024 PCs and in 2024 games, the Symbiotic Being Dark Gift feat received as a Dark Gift (Supernatural Reward) can''t be replaced by any means except with another Dark Gift (Supernatural Reward).
- The symbiote''s ability scores, skills, personality, and agenda must be recorded in the session log where the Dark Gift was acquired.', 70.0),
('bb327c65-df80-5759-99f1-273548d8ce1d', 'REW_0008', 'Touch of Death (RHW)', 'c0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Dark Gift (Supernatural Reward)', false, NULL, 'T1', ARRAY['RHW']::text[], 'Dark Gift. See book for description.', 'The Touch of Death Dark Gift feat received as a Dark Gift (Supernatural Reward) can''t be replaced by any means except with another Dark Gift (Supernatural Reward).', 80.0),
('3fed5d46-71e6-5016-89f9-b0c000d4a6f1', 'REW_0009', 'Watchers', 'c0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T1'), 'Dark Gift (Supernatural Reward)', false, NULL, 'T1', ARRAY['VRGR']::text[], 'Dark Gift. See book for description.', '- Watchers received as a Dark Gift (Supernatural Reward) uses the rules for Watchers from Van Richten’s Guide to Ravenloft in 2014 games and uses the rules for the corresponding Dark Gift feat from Ravenloft: The Horrors Within in 2024 games. Outside of games, a character uses the version of corresponding to their PC''s game version.
- For 2024 PCs and in 2024 games, the Watchers Dark Gift feat received as a Dark Gift (Supernatural Reward) can''t be replaced by any means except with another Dark Gift (Supernatural Reward).', 90.0),
('458fe378-31af-5d37-82a5-53f0df2293ad', 'REW_0010', 'Touch of Death (VRGR)', 'c0000001-0000-0000-0000-000000000001', (SELECT id FROM public.ac_tiers WHERE code = 'T2'), 'Dark Gift (Supernatural Reward)', false, NULL, 'T2', ARRAY['VRGR']::text[], 'Dark Gift. See book for description.', NULL, 100.0),
('2286488e-9a3f-5b49-97b3-fb3b7de07de5', 'REW_0011', 'Blessing of the Solipsistic Mind', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['PBTSO']::text[], 'Supernatural Gift. See book for description.', NULL, 110.0),
('7c44a6b5-e1a9-56b0-8c34-426c18430b87', 'REW_0012', 'Blessing of Weapon Enhancement', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['DMG2014']::text[], 'Supernatural Gift. See book for description.', NULL, 120.0),
('6150bc7b-7246-548e-b33c-5847869aedba', 'REW_0013', 'Boon of Combat Prowess', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['DMG2014']::text[], 'Supernatural Gift. See book for description.', 'This also recharges after a Long Rest.', 130.0),
('91430612-8c3e-5b61-a438-2a78651d12f3', 'REW_0014', 'Boon of Dimensional Travel', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['DMG2014']::text[], 'Supernatural Gift. See book for description.', 'This also recharges after a Long Rest.', 140.0),
('c1f85077-4493-5ce5-83b3-d6bfe33ebd62', 'REW_0015', 'Boon of Immortality', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['DMG2014']::text[], 'Supernatural Gift. See book for description.', NULL, 150.0),
('f2b0e50a-8fc6-5fed-a7c0-07247530057a', 'REW_0016', 'Boon of Luck', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['DMG2014']::text[], 'Supernatural Gift. See book for description.', 'This also recharges after a Long Rest.', 160.0),
('3a6e0af6-9aa2-5232-b10e-180b2b90c56d', 'REW_0017', 'Boon of Peerless Aim', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['DMG2014']::text[], 'Supernatural Gift. See book for description.', 'This also recharges after a Long Rest.', 170.0),
('ada4024d-9f19-5903-a58d-668b04c3df8f', 'REW_0018', 'Lifelong Companion', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['MOT']::text[], 'Supernatural Gift. See book for description.', NULL, 180.0),
('7688b759-f610-5242-8db0-7e0d06c2d01b', 'REW_0019', 'Lost Spell: Abate Dracorage (HB)', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Supernatural Gift (Supernatural Reward)', true, NULL, 'T1 Select (DM Select)', ARRAY['HHB']::text[], 'Supernatural Gift, T1 (can only be used by a Cleric, Sorcerer, or Wizard)

You''ve learned the lost magics of Abate Dracorage, a spell once used in the last Rage of Dragons to help fight off the effects of the Dracorage. 

While this Supernatural Gift is active, the Abate Dracorage spell is considered always prepared for you and you can cast the following spell with spell slots of the appropriate level using your spellcasting ability.

Abate Dracorage
Level 4 Abjuration (Cleric, Sorcerer, Wizard)
Casting Time: Action
Range: 60 feet
Components: V, S
Duration: 7 days

You remove the Dracorage from one creature of your choice that you can see in range that is under the effects of the Dracorage. The creature additionally can''t come under the effects of the Dracorage for the spell''s duration. An unwilling target must succeed on a Wisdom saving throw to resist this spell.

Using a Higher-Level Spell Slot. The duration is longer with a spell slot of level 6 - 8 (14 days) or 9 (30 days).', '- This homebrew Supernatural Gift was created by salemalvian
- Only DMs that are collaborating with salemalvian with their permission can award this Supernatural Gift as part of an adventure.', 190.0),
('796594e5-77c6-50e9-9d61-cdeaffbec924', 'REW_0020', 'Mariner Spirit (HB)', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['HHB']::text[], 'Supernatural Gift, T1

As a Wavetouched of HALO, you are entrusted with securing dangerous routes and protecting valuable shipments. Through many hours spent out at sea, you have become accustomed to long hours and hard sailing.

While this Supernatural Gift is active, you can hold your breath for twice as many minutes as normal, can automatically find a safe route to land a ship on shore provided such a route exists, and during an adventure you can travel up to 16 hours in a day before you are required to begin making Constitution saving throws against Exhaustion for Extended Travel.', '- This homebrew Supernatural Gift was created by myusernameisredacted
- This Supernatural Gift can only ever be obtained as an Agent Renown Perk (Renown Score 3+) as part of HALO in a session', 200.0),
('0f27397f-4aa1-56f1-a7b3-99df336f8d57', 'REW_0021', 'Unscarred', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['MOT']::text[], 'Supernatural Gift. See book for description.', NULL, 210.0),
('8ee8657d-4878-5a41-a026-2eee1e06d2f8', 'REW_0022', 'Draconic Familiar', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['FTD']::text[], 'T1 Draconic Gift. See book for description.', 'As a T1 Draconic Gift, this is typically gifted or acquired from dragons of wyrmling age or greater.', 220.0),
('be816fcb-d6b9-59d1-aafc-7c12dc8fc92c', 'REW_0023', 'Draconic Rebirth', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['FTD']::text[], 'T1 Draconic Gift. See book for description.', '- As a T1 Draconic Gift, this is typically gifted or acquired from dragons of wyrmling age or greater.
- A PC subject to Draconic Rebirth must post an associated log in #character-rework-log for the change in race / species and the source as Draconic Rebirth, with a link to the session log. There is no cost for this change.
- This Draconic Gift doesn''t count against the number of Supernatural Gifts you can have active at a time. If your species ever changes to other than Dragonborn, remove this Draconic Gift from your character sheet.', 230.0),
('ec2f0ec9-6980-5153-b9ed-0a0db4481e53', 'REW_0024', 'Tongue of the Dragon', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['FTD']::text[], 'T1 Draconic Gift. See book for description.', 'As a T1 Draconic Gift, this is typically gifted or acquired from dragons of wyrmling age or greater.', 240.0),
('cb2d768d-5cb4-5c19-9d00-3281d90bf8d7', 'REW_0025', 'Vecna''s Link', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['VEOR']::text[], 'Supernatural Gift. See book for description.', 'This can be reflavored as a Supernatural Gift not specifically tied to Vecna.', 250.0),
('edce68ec-b462-50bc-81cb-05d7e3179ab0', 'REW_0026', 'Blessing of Dumathoin', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T2 Select', ARRAY['PBTSO']::text[], 'Supernatural Gift. See book for description.', NULL, 260.0),
('3bfa4a21-b3a5-59a5-a032-1e0a71f3cf79', 'REW_0027', 'Blessing of Valhalla', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T2 Select', ARRAY['DMG2014']::text[], 'Supernatural Gift. See book for description.', NULL, 270.0),
('a449133c-ba13-50b5-a040-9fad92a6746f', 'REW_0028', 'Blessing of Wound Closure', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T2 Select', ARRAY['DMG2014']::text[], 'Supernatural Gift. See book for description.', NULL, 280.0),
('2442de20-23a1-51d4-bf3f-6270c3c196fe', 'REW_0029', 'Boon of Fate', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T2 Select', ARRAY['DMG2014']::text[], 'Supernatural Gift. See book for description.', 'This also recharges after a Long Rest.', 290.0),
('c98a7d53-add3-5c5f-b94f-47a1e5b8aa46', 'REW_0030', 'Boon of the Night Spirit', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T2 Select', ARRAY['DMG2014']::text[], 'Supernatural Gift. See book for description.', NULL, 300.0),
('1655d185-e649-557f-8fcd-9b7967c6cc50', 'REW_0031', 'Boon of the Unfettered', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T2 Select', ARRAY['DMG2014']::text[], 'Supernatural Gift. See book for description.', 'In 2024 games, this also gives Advantage on saving throws made to avoid or end the Grappled condition', 310.0),
('67325259-afd5-5761-8a2d-409f40c9e69c', 'REW_0032', 'Draconic Senses', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Draconic Gift (Supernatural Reward)', false, NULL, 'T2 Select', ARRAY['FTD']::text[], 'T2 Draconic Gift. See book for description.', 'As a T2 Draconic Gift, this is typically gifted or acquired from dragons of young age or greater.', 320.0),
('6025e18a-0a65-58d3-a9b0-5049c0512c44', 'REW_0033', 'Echo of Dragonsight', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Draconic Gift (Supernatural Reward)', false, NULL, 'T2 Select', ARRAY['FTD']::text[], 'T2 Draconic Gift. See book for description.', 'As a T2 Draconic Gift, this is typically gifted or acquired from dragons of young age or greater.', 330.0),
('578a8f62-be8c-527c-95a3-88b0d2f8f6a8', 'REW_0034', 'Frightful Presence', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Draconic Gift (Supernatural Reward)', false, NULL, 'T2 Select', ARRAY['FTD']::text[], 'T2 Draconic Gift. See book for description.', 'As a T2 Draconic Gift, this is typically gifted or acquired from dragons of young age or greater.', 340.0),
('ddfc0e2d-024a-5590-ac82-01df904c3963', 'REW_0035', 'Heroic Destiny', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T2 Select', ARRAY['MOT']::text[], 'Supernatural Gift. See book for description.', NULL, 350.0),
('5f3395e5-1dd6-5051-a66b-fe467ac4acfa', 'REW_0036', 'Hollow One', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T2 Select', ARRAY['EGW']::text[], 'Supernatural Gift. See book for description.', NULL, 360.0),
('13c2bf11-cfa1-57f1-a3d7-e483a1d7fa64', 'REW_0037', 'My Body is a Temple, My Mind is a Fortress (HB)', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Supernatural Gift (Supernatural Reward)', true, NULL, 'T2 Select (DM Select)', ARRAY['HHB']::text[], 'Supernatural Gift, T2

Through relentless discipline and self-mastery, you have fused physical resilience and mental clarity into an unshakable core. Whether forged through ascetic meditation, divine blessing, or sheer grit, you now stand as an immovable bastion against forces that would topple lesser mortals.

When you fail a saving throw while this Supernatural Gift is active, you can take a Reaction to gain Temporary Hit Points equal to your Proficiency Bonus and add a d6 to the saving throw, potentially turning the failed save into a success.

You can take this Reaction a number of times equal to your Proficiency Bonus and you regain all expended uses when you finish a Long Rest.', '- This homebrew Supernatural Gift was created by naoe45
- This Supernatural Gift can only ever be obtained as a Renown Perk (Renown Score 30) as part of the Yamato Clan', 370.0),
('fbe10130-2df7-50cb-becd-927db879e74f', 'REW_0038', 'Node Manifestation', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T2 Select', ARRAY['HTFG']::text[], 'Supernatural Gift, T2 (can only be used by a Mystic)

You have learned to attune your senses and psionic powers to the magic of nodes: nexuses of magical energy that exist throughout the world. You have gained a heightened sense and ability to utilize nodes, granting you access to various powers associated with nodes. While this Supernatural Gift is active, you gain the following benefits with respect to earth nodes and other nodes, as well as any other benefit that requires this Supernatural Gift in order to use. (For details on the powers associated with nodes, see Earth Nodes in the Hawthorne Field Guide and its corresponding sections)

Sensing Earth Nodes. When attempting to sense a node within 30 feet of you, you can make a DC 15 Intelligence (Arcana) check to do so.
Enhanced Spellcasting. You can take the action to draw on a node''s Psionic Mastery psi point pool twice per 24-hour period instead of once.
Granted Spells. You can spend a Short Rest bringing yourself in tune with the magical energy of a node and, at the end of the Short Rest, make an Intelligence (Arcana) against the node DC of the node to access the node''s granted spells for the next 24 hours. You can cast these spells without using any components by expending psi points up to your psi limit, with Intelligence as your spellcasting ability. You can benefit from a node''s Enhanced Spellcasting from any spells you cast in this way, making Intelligence (Arcana) checks to do so.
Storing Items. You can store and retrieve items within the extradimensional space of a node, making Intelligence (Arcana) checks to do so.
Modifying Earth Nodes. You have a greater ability in helping to redirect the flow of energy of a node when supervising any project that involves modifying the area around a node and are able to make Intelligence (Arcana) checks to do so.', NULL, 380.0),
('56ccafd6-84c3-56c7-9936-982bf0407e1c', 'REW_0039', 'Node Spellcasting', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T2 Select', ARRAY['HTFG']::text[], 'Supernatural Gift, T2 (can only be used by a spellcaster)

You have learned to attune your senses and magical powers to the magic of nodes: nexuses of magical energy that exist throughout the world. You have gained a heightened sense and ability to utilize nodes, granting you access to various powers associated with nodes. While this Supernatural Gift is active, you gain the following benefits with respect to earth nodes and other nodes, as well as any other benefit that requires this Supernatural Gift in order to use. (For details on the powers associated with nodes, see Earth Nodes in the Hawthorne Field Guide and its corresponding sections)

Sensing Earth Nodes. When attempting to sense a node within 30 feet of you, you can make a DC 15 Arcana check using your spellcasting ability to do so.
Enhanced Spellcasting. When attempting to enhance your spells with a node''s magic, you can make an Arcana check using your spellcasting ability to do so.
Portals to Other Locations. You are able to spend time acquiring expertise in your understanding of a given earth node after your understanding of it has become proficient. After you''ve acquired such expertise, you are able to use Teleportation Circle, Teleport or similar magic while within the area of the given earth node to attempt to create a two-way portal to another location on the same plane of existence.
Granted Spells. You can spend a short rest bringing yourself in tune with the magical energy of a node and, at the end of the short rest, make an Arcana check using your spellcasting ability against the node DC of the node to access the node''s granted spells for the next 24 hours. You can cast these spells using any spell slots of the appropriate level you have and using your spellcasting ability to do so.
Storing Items. You can store and retrieve items within the extradimensional space of a node, making Arcana checks using your spellcasting ability to do so.
Locking Nodes. After studying a node, you can use Arcane Lock to magically secure against its use by others.
Modifying Earth Nodes. You have a greater ability in helping to redirect the flow of energy of a node when supervising any project that involves modifying the area around a node and are able to make Arcana checks using your spellcasting ability to do so.', NULL, 390.0),
('9758ab02-52ec-53a4-ad34-d8ac756a7b69', 'REW_0040', 'Survivor''s Pressure (HB)', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T2 Select', ARRAY['HHB']::text[], 'Supernatural Gift, T2

There are moments when you and those closest to you struggle, but you''ve learned to adapt, improvise, and succeed under pressure. When the odds are stacked against you, you know when to lock in.

You gain the following trait.

Pressure. When you fail a saving throw forced by an enemy or trap against your will or when an enemy you can see within 30 feet of yourself scores a Critical Hit, you can enter a flow state for 1 hour or gain a Pressure die instead if you are already in this flow state.  When you fail a D20 Test, you can spend a Pressure die to roll 1d6 and add the number rolled to the D20 Test, potentially turning it into a success. 

You can only have up to three Pressure dice at a time, and you lose any unexpended Pressure dice when the flow state ends. The flow state ends early if you gain the Unconscious condition, die, or dismiss it (no action required).

After you enter this flow state, you can''t do so again until you finish a Long Rest.', 'This homebrew Supernatural Gift was created by magurotoria', 400.0),
('7cf4452a-813d-54aa-b646-4c8a8678e949', 'REW_0041', 'Unyielding Will (HB)', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Supernatural Gift (Supernatural Reward)', true, NULL, 'T2 Select (DM Select)', ARRAY['HHB']::text[], 'Supernatural Gift, T2

When you fail an Intelligence, Wisdom, or Charisma saving throw while this Supernatural Gift is active, you can take a Reaction to roll a d6 to the saving throw, potentially turning the failed save into a success. If this causes you to succeed the save and the save was forced by a creature you can see within 120 feet, you can force the creature to make an Intelligence saving throw against your spell save DC. The creature takes 2d10 Psychic damage on a failed save, or half as much damage on a successful one. 

You can take this Reaction a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.', '- This homebrew Supernatural Gift was created by naoe45
- This Supernatural Gift can only ever be obtained as a Renown Perk (Renown Score 30) as part of the Yamato Clan', 410.0),
('8466c849-3ff6-5281-8e05-84f1f1bcd464', 'REW_0042', 'Anvilwrought', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T3 Select', ARRAY['MOT']::text[], 'Supernatural Gift. See book for description.', NULL, 420.0),
('d2f4f192-e7bc-5a75-bb62-b040adea1d37', 'REW_0043', 'Boon of Invincibility', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T3 Select', ARRAY['DMG2014']::text[], 'Supernatural Gift. See book for description.', 'This also recharges after a Long Rest.', 430.0),
('ea0a7129-b03c-5635-89bc-3ddc95480268', 'REW_0044', 'Boon of Quick Casting', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T3 Select', ARRAY['DMG2014']::text[], 'Supernatural Gift. See book for description.', NULL, 440.0),
('2ce0c5e4-c888-5f56-a5df-0fb6038dcaea', 'REW_0045', 'Boon of Spell Mastery', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T3 Select', ARRAY['DMG2014']::text[], 'Supernatural Gift. See book for description.', 'The chosen spell can be any 1st-level spell you can cast, not just sorcerer, warlock, or wizard spells.', 450.0),
('46eac04b-5b65-5874-8b03-26d61ca94675', 'REW_0046', 'Blessing of Magic Resistance', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T3 Select', ARRAY['DMG2014']::text[], 'Supernatural Gift. See book for description.', NULL, 460.0),
('2eb1dc5f-33aa-5f06-a401-b2168eb6f5e8', 'REW_0047', 'Blessing of Protection', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T3 Select', ARRAY['DMG2014']::text[], 'Supernatural Gift. See book for description.', NULL, 470.0),
('4745d17e-5076-5bf7-b91f-6c4354fb53df', 'REW_0048', 'Boon of Magic Resistance', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T3 Select', ARRAY['DMG2014']::text[], 'Supernatural Gift. See book for description.', NULL, 480.0),
('faef17ca-0417-5e05-ae08-87e9571e2471', 'REW_0049', 'Boon of Planar Travel', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T3 Select', ARRAY['DMG2014']::text[], 'Supernatural Gift. See book for description.', 'This also recharges after a Long Rest.', 490.0),
('b5d0a791-80b8-5069-8a01-0cb9da9327d7', 'REW_0050', 'Boon of Recovery', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T3 Select', ARRAY['DMG2014']::text[], 'Supernatural Gift. See book for description.', NULL, 500.0),
('e05b363d-8830-54c9-9a4c-ab2e4e74c445', 'REW_0051', 'Boon of Speed', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T3 Select', ARRAY['DMG2014']::text[], 'Supernatural Gift. See book for description.', NULL, 510.0),
('0350172a-0b58-5a38-96ef-b36258299c74', 'REW_0052', 'Psionic Reach', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Draconic Gift (Supernatural Reward)', false, NULL, 'T3 Select', ARRAY['FTD']::text[], 'T3 Draconic Gift. See book for description.', 'As a T3 Draconic Gift, this is typically gifted or acquired from dragons of adult age or greater.', 520.0),
('d311920e-17f9-5d34-be29-5ded1928ead6', 'REW_0053', 'Inscrutable', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T3 Select', ARRAY['MOT']::text[], 'Supernatural Gift. See book for description.', NULL, 530.0),
('60d6bd4e-c5ed-59b7-8489-a7758f4f10db', 'REW_0054', 'Feat', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T4 Select', ARRAY['DMG2014']::text[], 'The character gains a new feat chosen by the DM that isn''t an Epic Boon feat.', 'The chosen feat can be any of the Feats in Allowed Content that isn''t an Epic Boon feat, but the character must fulfill the feat''s prerequisites if any.', 540.0),
('67e155ca-a03f-5afb-b00a-9eded37bf162', 'REW_0055', 'Boon of Irresistible Offense', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T4 Select', ARRAY['DMG2014']::text[], 'Supernatural Gift. See book for description.', NULL, 550.0),
('578bb9c7-93da-5985-b532-3fe2fc6ffc73', 'REW_0056', 'Boon of Perfect Health', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T4 Select', ARRAY['DMG2014']::text[], 'Supernatural Gift. See book for description.', NULL, 560.0),
('75689ab7-d666-570e-a3a7-f8554abeb58d', 'REW_0057', 'Boon of Resilience', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T4 Select', ARRAY['DMG2014']::text[], 'Supernatural Gift. See book for description.', NULL, 570.0),
('f87838f2-a6bf-5978-b4d4-8ef064378efc', 'REW_0058', 'Boon of Skill Proficiency', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T4 Select', ARRAY['DMG2014']::text[], 'Supernatural Gift. See book for description.', NULL, 580.0),
('cd57c35f-09f7-5026-b3ff-1f886167bb2c', 'REW_0059', 'Scaled Toughness', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Draconic Gift (Supernatural Reward)', false, NULL, 'T4 Select', ARRAY['FTD']::text[], 'T4 Draconic Gift. See book for description.', 'As a T4 Draconic Gift, this is typically gifted or acquired from ancient dragons.', 590.0),
('fe980ea8-dee4-5909-8d52-2c9ccc784a3e', 'REW_0060', 'Sovereign of the Dunes (HB)', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Supernatural Gift (Supernatural Reward)', true, NULL, 'T4 Select (DM Select)', ARRAY['HHB']::text[], 'Supernatural Gift, T4

As a Sultan of the Court of Dunes, you''ve achieved the highest rank of leadership within the Court other than the Queen herself and been inducted into its deepest mysteries, with the Queen of Sand bestowing her boon and favor upon you. While this Supernatural Gift is active, you gain the following traits.

Sultan''s Sanctuary. You are immune to curses, disease, and magical contagions and have the benefits of an Amulet of Proof Against Detection and Location. Additionally, you stop aging: you are immune to any effect that would age you, and you can''t die from old age.

Gift of the Sands. When you select this Supernatural Gift to be active when finishing a Long Rest, choose one of the following options below to benefit from. You can only benefit from one option at a time.
- Gift of the Blazing Sun. You can cast the Absorb Elements spell at will, requiring no components. Additionally, you can cast the Plane Shift spell, requiring no components and targeting yourself only, with the destination being the Court of Dunes in the Feywild. After you cast Plane Shift in this way, you can''t do so again until you finish a Long Rest.
- Queen''s Favor. You can take a Magic action to shape-shift into a Sphinx of Secrets. You retain your game statistics and ability to speak, but your creature type, size, AC, movement modes, Strength, and Dexterity are replaced by those of the Sphinx of Secrets stat block, and you gain any statistics and capabilities that the Sphinx of Secrets stat block has that you lack. You remain shape-shifted in this way until you are reduced to 0 Hit Points, die, or end it as a Bonus Action. After you shape-shift in this way, you can''t do so again until you finish a Short or Long Rest.
- Sultan''s Ascent. You can cast the Clairvoyance spell at will, requiring no components. Additionally, you can cast the Plane Shift spell, requiring no components and targeting yourself only, with the destination being a desert location in the Feywild. After you cast Plane Shift in this way, you can''t do so again until you finish a Long Rest.', '- This Supernatural Gift was created by empress5002 and salah_ad_din
- This homebrew Supernatural Gift can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 50+ with the Court of Dunes. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 17+ DMPC with a Renown Score of 50+ with the Court of Dunes can choose to obtain this Supernatural Gift in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as a Supernatural Gift using an item slot.', 600.0),
('41bcb6e7-0216-556b-b3c3-2bfe6202d21a', 'REW_0061', 'Nyxborn', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T4 Select', ARRAY['MOT']::text[], 'Supernatural Gift. See book for description.', NULL, 610.0),
('a36596af-92c5-5e3b-ad6b-c7d7df0edaef', 'REW_0062', 'Wildmark (HB)', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T4 Select', ARRAY['HHB']::text[], 'Supernatural Gift, T4

As a Master of the Wild of the Emerald Enclave, you''ve achieved the highest rank of leadership within the faction and have been inducted into its deepest mysteries. While this Supernatural Gift is active, you gain the following traits.

Nature''s Protection. You are immune to curses, disease, and magical contagions and have the benefits of an Amulet of Proof Against Detection and Location. Additionally, you stop aging: you are immune to any effect that would age you, and you can''t die from old age.

Nature''s Blessing. When you select this Supernatural Gift to be active when finishing a Long Rest, choose one of the following options below to benefit from. You can only benefit from one option at a time.
- Blessing of Eldath. You can cast the Water Breathing spell at will, requiring no components. Additionally, you can cast the Plane Shift spell, requiring no components and targeting yourself only, with the destination being a location on the Elemental Plane of Water. After you cast Plane Shift in this way, you can''t do so again until you finish a Long Rest.
- Blessing of Mielikki. You can take a Magic action to shape-shift into a Treant. You retain your game statistics and ability to speak, but your creature type, size, AC, movement modes, Strength, and Dexterity are replaced by those of the Treant stat block, and you gain any statistics and capabilities that the Treant stat block has that you lack. You remain shape-shifted in this way until you are reduced to 0 Hit Points, die, or end it as a Bonus Action. After you shape-shift in this way, you can''t do so again until you finish a Short or Long Rest.
- Blessing of Silvanus. You can cast the Meld into Stone spell at will, requiring no components. Additionally, you can cast the Plane Shift spell, requiring no components and targeting yourself only, with the destination being a location on the Elemental Plane of Earth. After you cast Plane Shift in this way, you can''t do so again until you finish a Long Rest.', '- This homebrew Supernatural Gift was created by greensprout
- This Supernatural Gift can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 50+ with the Emerald Enclave. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 17+ DMPC with a Renown Score of 50+ with the Emerald Enclave can choose to obtain this Supernatural Gift in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as a Supernatural Gift using an item slot.', 620.0),
('e6aa370c-5fec-5ca8-b7e4-9d8965f36323', 'REW_0063', 'Iconoclast', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T1_PLUS'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T1+', ARRAY['MOT']::text[], 'Supernatural Gift. See book for description.', 'For purposes of the number of Supernatural Gifts a character can have active at a time, this Supernatural Gift''s tier of play corresponds to the character''s tier. For example, it would be treated as a Tier 3 Supernatural Gift when used by a level 12 character (since they gain the benefit of the level 11 trait).', 630.0),
('f3ab2746-1ac8-59d9-abeb-94b4a021df0c', 'REW_0064', 'Oracle', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T1_PLUS'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T1+', ARRAY['MOT']::text[], 'Supernatural Gift. See book for description.', '- A character can only obtain this Supernatural Gift in relation to a deity or faith as deternined by the DM. When a character gains this Supernatural Gift, their starting Piety score with respect to that deity or faith is 1 unless it is already higher than 1. See Chapter 2 of the Mythic Odysseys of Theros for rules on how this score works (ignore the guidance regarding changing gods). 
- As a guideline and as determined by the DM, a character''s Piety typically increases by 1 during most sessions of play where they are following the tenets of that deity and faith as determined by the DM, and a single deed typically changes their Piety score by only 1 point in either direction unless the action is very significant as determined by the DM. Regardless, any increase or decrease to Piety (if any) is wholly determined by the DM.
- A character''s Piety score can change even when this Supernatural Gift is not active.
- A DM that awards this Supernatural Gift must note in their session log the deity or faith this Supernatural Gift is associated with, as well as circumstances that can increase or decrease Piety, following the template in Mythic Odysseys of Theros.
- Each Piety threshold for this Supernatural Gift also has a level threshold. A character must be level 1+ to benefit from the Augur trait (Piety 3+), must be level 5+ to benefit from the Seer trait (Piety 10+), must be level 11+ to benefit from the Sibyl trait (Piety 25+), and must be level 17+ to benefit from the Divine Oracle trait (Piety 50+).
- For purposes of the number of Supernatural Gifts a character can have active at a time, this Supernatural Gift''s tier of play corresponds to the tier of the highest level trait they benefit from. For example, it would be treated as a Tier 3 Supernatural Gift when used by a level 12 character with 30 Piety (since they gain the benefit of the Sibyl trait which requires being level 11+ and 25+ Piety).', 640.0),
('1785feef-f815-5d53-ac3a-5da7f2b454ed', 'REW_0065', 'Boon of Undetectability', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T2_PLUS'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T2+', ARRAY['DMG2014']::text[], 'Supernatural Gift. See book for description.', NULL, 650.0),
('ad66f52a-7ec6-5efa-9df0-7d9456aa4de2', 'REW_0066', 'Soulbond of Steel (HB)', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T2_PLUS'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T2+', ARRAY['HHB']::text[], 'Soulbond of Steel ([INSERT NAME OF SPIRIT])
Supernatural Gift, T2+ (can only be used by a creature the spirit deems worthy)

You have a formed a bond between your soul and a spirit that has altered you irrevocably. [INSERT REMAINING NARRATIVE DESCRIPTION HERE, INCLUDING SPECIFIC SPIRIT''S NAME]

While this Supernatural Gift is active, you obtain the following benefits.

Spiritual Emissary. The bonded spirit remains at your side at all times as an intangible spirit immune to all damage and all conditions that can only be perceived by you and by creatures able to see into the Ethereal Plane. The bonded spirit has the following additional properties.
- Sentience. The bonded spirit is a sentient [INSERT ALIGNMENT] spirit with an Intelligence of 12, a Wisdom of 14, and a Charisma of 12. It has hearing and [INSERT SENSES]. [INSERT HOW IT COMMUNICATES]
- Personality. [INSERT PERSONALITY HERE, INCLUDING PURPOSE AND POTENTIAL CONFLICT]

Spirit Summon. You can cast the Find Familiar spell without expending any Material components. When you do so, the bonded spirit disappears as it assumes the form of the creature summoned by the spell, except it retains its alignment, personality, and Intelligence, Wisdom, and Charisma scores. If the familiar is temporarily dismissed, the bonded spirit immediately reappears at your side until you cause it to reappear as a familiar. If the familiar is slain or dismissed forever, the bonded spirit immediately reappears at your side and can''t become a familiar again until you cast the spell in this way again. Once you cast the spell in this way, you can''t do so again until you finish a Long Rest.

Soulblade (Requires Attunement). You can attune to the bonded spirit after finishing a Short Rest focused on it. While you are attuned to the bonded spirit, you can use a Bonus Action to transform it into a magical Simple or Martial Melee Weapon of your choice that you bond with or back into its spirit form. The weapon is a sentient weapon with the Sentience and Personality properties of the bonded spirit as described above. While the bonded spirit takes the form of a weapon, you gain the following benefits:
- You can take a Bonus Action to change the weapon into a different type of Simple or Martial Melee Weapon of your choice.
- You can take a Bonus Action to summon the weapon, causing it to teleport instantly to your hand.
- When you attack an object with this magic weapon and hit, the hit is a Critical Hit and you maximize your weapon damage dice against the target.
- When you hit a creature with an attack using this magic weapon, the target takes an extra 2d6 Necrotic damage and must succeed on a DC 15 Constitution saving throw or be unable to regain Hit Points for 1 hour. The target repeats the save at the end of each of its turns, ending the effect on itself on a success.
- This magic weapon can''t be broken while you remain bonded to the spirit, not even in an Antimagic Field.

Broken Bonds. If this Supernatural Gift becomes inactive at any point after you''ve received it, remove this Supernatural Gift from your character sheet as your bond to the spirit breaks and the spirit vanishes.', '- This homebrew Supernatural Gift was created by monoxideatwork
- When awarding this Supernatural Gift, a Full DM can apply the Damage Alteration Item Property to the Soulblade to change the extra 2d6 damage dealt to be any type of damage except for Bludgeoning, Piercing, Slashing, or Force.', 660.0),
('f11a07e2-03c8-5ab5-9fef-d8669316f003', 'REW_0067', 'Boon of Fortitude', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T3_PLUS'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T3+', ARRAY['DMG2014']::text[], 'Supernatural Gift. See book for description.', NULL, 670.0),
('764383e1-0bf9-5d54-84ee-b62a623e14bb', 'REW_0068', 'Boon of Truesight', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T3_PLUS'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T3+', ARRAY['DMG2014']::text[], 'Supernatural Gift. See book for description.', NULL, 680.0),
('0ac1dc24-8cfa-5439-accb-c54ff09ce774', 'REW_0069', 'Ability Score Improvement', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T4+', ARRAY['DMG2014']::text[], 'The character can increase one ability score by 2 or increase two ability scores by 1 each. The ability score can now be increased above 20, up to a maximum of 30.', NULL, 690.0),
('4c0986fd-0fd4-5496-8289-33a7d5af5b82', 'REW_0070', 'Epic Boon Feat', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T4+', ARRAY['DMG2014']::text[], 'The character gains an Epic Boon feat chosen by the DM.', '- The chosen feat can be any of the Epic Boon Feats in Allowed Content that the character satisfies the prerequisites for. 
- Only 2024 characters can benefit from this Supernatural Gift.', 700.0),
('7b1e1660-085a-5a97-b9ee-2227d177289f', 'REW_0071', 'Blessing of Health', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T4+', ARRAY['DMG2014']::text[], 'Supernatural Gift. See book for description.', NULL, 710.0),
('3326d0ea-8dfa-5337-abcb-f2551bdea538', 'REW_0072', 'Blessing of Understanding', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T4+', ARRAY['DMG2014']::text[], 'Supernatural Gift. See book for description.', NULL, 720.0),
('f7d2f6c6-d861-5b69-ac46-de092d77432a', 'REW_0073', 'Boon of the Fire Soul', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T4+', ARRAY['DMG2014']::text[], 'Supernatural Gift. See book for description.', NULL, 730.0),
('4184215e-8739-546c-afa0-c4d2a5268bb2', 'REW_0074', 'Boon of the Stormborn', 'c0000001-0000-0000-0000-000000000002', (SELECT id FROM public.ac_tiers WHERE code = 'T4_PLUS'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T4+', ARRAY['DMG2014']::text[], 'Supernatural Gift. See book for description.', NULL, 740.0),
('01474a58-9846-51ce-a7b6-36d1c04c0cb4', 'REW_0075', 'Boon of High Magic', 'c0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'TIER_S'), 'Mythic Gift (Supernatural Reward)', false, NULL, 'Tier S', ARRAY['DMG2014']::text[], 'Mythic Gift. See book for description.', NULL, 750.0),
('1e6bdad7-dd07-57fb-a4e5-8008bbdf85d2', 'REW_0076', 'Boon of Spell Recall', 'c0000001-0000-0000-0000-000000000003', (SELECT id FROM public.ac_tiers WHERE code = 'TIER_S'), 'Mythic Gift (Supernatural Reward)', false, NULL, 'Tier S', ARRAY['DMG2014']::text[], 'Mythic Gift. See book for description.', NULL, 760.0),
('732cc047-febb-51e5-a8ff-9bf4e6b8d468', 'REW_0077', 'Charm of Instant Tools', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Charm (Supernatural Reward)', false, NULL, 'T0', ARRAY['BAM']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot', 770.0),
('b3552aab-28ff-58f3-b691-740ebee4ef0f', 'REW_0078', 'Charm of the Jester', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Charm (Supernatural Reward)', false, NULL, 'T0', ARRAY['BMT']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot provided each charm has only 1 use remaining', 780.0),
('1bf80e70-361b-5fa0-b09f-8d8022e0f81a', 'REW_0079', 'Charm of Journeying', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Charm (Supernatural Reward)', false, NULL, 'T0', ARRAY['HHB']::text[], 'Charm, T0

You can use an action to use the charm and gain the following benefits for 24 hours:
- You have advantage on Wisdom (Survival) checks
- You and up to 5 other creatures of your choice ignore difficult terrain while traveling together outdoors and you and your group’s travel pace cannot be reduced by nonmagical means. (See the Player’s Handbook for the rules on travel pace)
- Once you use this charm, it vanishes from you.', '- A DM can predetermine up to 3 of these charms per item slot					
- This is an adaptation of Habbabuk''s Blessing from Dragonlance: Shadow of the Dragon Queen.', 790.0),
('87846d0d-fb5e-53ac-aeaa-26571490bdb8', 'REW_0080', 'Charm of Snowball Strike', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Charm (Supernatural Reward)', false, NULL, 'T0', ARRAY['IDRotF']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot', 800.0),
('e89b63b7-30e1-53a0-907a-768acec7bff5', 'REW_0081', 'Charm of the Snow Walker', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Charm (Supernatural Reward)', false, NULL, 'T0', ARRAY['IDRotF']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot provided each charm has only 1 use remaining', 810.0),
('c083fa80-2f70-5d16-974a-2a063c2b71ec', 'REW_0082', 'Charm of the Swollen Hag', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Charm (Supernatural Reward)', false, NULL, 'T0', ARRAY['ToA']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot provided each charm has only 1 use remaining', 820.0),
('65489083-6590-522c-b134-aac24ab9820c', 'REW_0083', 'Charm of the Water Bearer', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Charm (Supernatural Reward)', false, NULL, 'T0', ARRAY['CM']::text[], 'Charm. See book for description.', '- A character with this charm can choose when to begin receiving its benefit up to its duration.
- Only in character days that pass as part of an adventure count against the duration as determined by the DM.
- A DM can predetermine up to 3 of these charms per item slot', 830.0),
('7aaa2bf0-2e94-5a18-a22d-03137ba1f680', 'REW_0084', 'Charm of Treasure Sense', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Charm (Supernatural Reward)', false, NULL, 'T0', ARRAY['ToA']::text[], 'Charm. See book for description.', '- A character with this charm can choose when to begin receiving its benefit up to its duration.
- Only in character days that pass as part of an adventure count against the duration as determined by the DM.
- A DM can predetermine up to 3 of these charms per item slot', 840.0),
('f19b3cfb-e800-5e08-8778-6cd03d1c82e6', 'REW_0085', 'Azorius Charm', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['GGR']::text[], 'Charm. See book for description.', '- A DM can predetermine up to 3 of these charms per item slot 
- By default, this is reflavored as a charm not tied to the Azorius Guild of Ravnica.', 850.0),
('7d216d3c-533f-5eb5-b5bc-9f53c6e9a39d', 'REW_0086', 'Boros Charm', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['GGR']::text[], 'Charm. See book for description.', '- A DM can predetermine up to 3 of these charms per item slot           
- By default, this is reflavored as a charm not tied to the Boros Guild of Ravnica.', 860.0),
('9e0f6844-f0e5-5136-9f7b-261ecf51bb1a', 'REW_0087', 'Charm of Agelessness', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['BGDIA']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot', 870.0),
('12b01ce3-9f1e-59d9-87f3-a4599153b3ec', 'REW_0088', 'Charm of Air Bubbles', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['BAM']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot provided each charm has only 1 use remaining', 880.0),
('ce2c846f-5730-55ee-84ad-596555d3eae0', 'REW_0089', 'Charm of Animal Conjuring', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['DMG2014']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot provided each charm has only 1 use remaining', 890.0),
('6677310a-2b58-5787-b9e2-e95a100e0676', 'REW_0090', 'Charm of Biting Cold', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['IDRotF']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot provided each charm has only 1 use remaining', 900.0),
('a7ec775f-1ca1-5cb4-973c-737d6f060076', 'REW_0091', 'Charm of Bounty', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['IDRotF']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot provided each charm has only 1 use remaining', 910.0),
('dd986a74-41bf-5550-a36d-8071261ee646', 'REW_0092', 'Charm of Cold Resistance', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['IDRotF']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot', 920.0),
('ad60b84d-c4c1-5c41-b137-5d5f1b65922d', 'REW_0093', 'Charm of the Comet', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['BMT']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot provided each charm has only 1 use remaining', 930.0),
('86d2a3c8-741a-53d8-be69-9513862fdea4', 'REW_0094', 'Charm of Darkvision', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['DMG2014']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot provided each charm has only 1 use remaining', 940.0),
('2e7733e6-c32f-5210-919a-fde5ffc80afe', 'REW_0095', 'Charm of the Dead Truce', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['AATM']::text[], 'Charm. See book for description.', '- A character with this charm can choose when to begin receiving its benefit up to its duration.
- Only in character days that pass as part of an adventure count against the duration as determined by the DM.
- A DM can predetermine up to 3 of these charms per item slot', 950.0),
('a6175eae-6af6-57d7-8a8f-c2535413ac30', 'REW_0096', 'Charm of Diabolical Inspiration', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['BGDIA']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot provided each charm has only 1 use remaining', 960.0),
('c540677a-9a9f-5b74-87d7-c7c4a8dfb947', 'REW_0097', 'Charm of Draconic Will', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['HHB']::text[], 'Charm, T1

This charm has 3 charges. When you fail a Wisdom saving throw, you can expend 1 of the charm’s charges to gain a +4 bonus to that saving throw. Once all its charges have been expended, the charm vanishes from you. Additionally, when you acquire this charm, you permanently gain the ability to speak, read, and write Draconic if you couldn’t already and you retain this ability even after the charm vanishes.', '- This is an adaptation of Dragon Queen''s Will from Dragonlance: Shadow of the Dragon Queen.
- A DM can predetermine up to 3 of these charms per item slot', 970.0),
('7af7987e-bfe2-5754-a027-a6f171653d51', 'REW_0098', 'Charm of the Fates', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['BMT']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot provided each charm has only 1 use remaining', 980.0),
('7459c95b-5c94-5e85-b829-377b822a819e', 'REW_0099', 'Charm of Feather Falling', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['DMG2014']::text[], 'Charm. See book for description.', '- A character with this charm can choose when to begin receiving its benefit up to its duration.
- Only in character days that pass as part of an adventure count against the duration as determined by the DM.
- A DM can predetermine up to 3 of these charms per item slot', 990.0),
('22dc5934-a802-5f7b-b553-765d4f4ce7e4', 'REW_0100', 'Charm of the Fool', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['BMT']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot provided each charm has only 1 use remaining', 1000.0),
('f80c496b-d04e-559c-801b-9739cd540c7a', 'REW_0101', 'Charm of the Ghoul', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['ToA']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot provided each charm has only 1 use remaining', 1010.0),
('ea40b73d-633d-54fb-a498-5941df6e1419', 'REW_0102', 'Charm of Heroism', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['DMG2014']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot', 1020.0),
('2d3af586-4a5e-5d58-9770-1069937cae9b', 'REW_0103', 'Charm of the Key', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['BMT']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot provided each charm has only 1 use remaining', 1030.0),
('9cbce01b-c760-5c4d-a06f-07f5ffdd7052', 'REW_0104', 'Charm of the Puzzle', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['BMT']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot provided each charm has only 1 use remaining', 1040.0),
('37757e0d-5176-5698-a5fd-46de68240baa', 'REW_0105', 'Charm of the Slayer', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['DMG2014']::text[], 'Charm. See book for description.', '- This charm can affect any kind of weapon.
- A character with this charm can choose when to begin receiving its benefit up to its duration. The character chooses whether the chosen weapon becomes a Dragon Slayer or a Giant Slayer upon usng the charm.
- Only in character days that pass as part of an adventure count against the duration as determined by the DM.
- A DM can predetermine up to 3 of these charms per item slot', 1050.0),
('e2b6a39c-81d1-57fa-97cd-a33acd94508f', 'REW_0106', 'Charm of the Star', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['BMT']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot provided each charm has only 1 use remaining', 1060.0),
('54b02378-4c02-5d7a-bdf9-dcd921b4a0b6', 'REW_0107', 'Charm of the Storm', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['DIP']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot provided each charm has only 1 use remaining', 1070.0),
('2ddb8bf4-8efe-53a2-be8f-9ccffe2c656d', 'REW_0108', 'Charm of the Talons', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['BMT']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot provided each charm has only 1 use remaining', 1080.0),
('9dfaa814-5785-5a22-bcdd-e76abfaa5524', 'REW_0109', 'Charm of Water Breathing', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['EGW']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot', 1090.0),
('bffccbd1-8099-5354-943d-38a455b0ffbe', 'REW_0110', 'Dimir Charm', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['GGR']::text[], 'Charm. See book for description.', '- A DM can predetermine up to 3 of these charms per item slot
- By default, this is reflavored as a charm not tied to the Dimir Guild of Ravnica.', 1100.0),
('dbde8288-a463-5cbf-89d8-ad25b433cd76', 'REW_0111', 'Favor of the Heroic Steed', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['DSotDQ']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot provided each charm has only 1 use remaining', 1110.0),
('ca94100b-97d5-5da7-9afc-23204800e2d3', 'REW_0112', 'Golgari Charm', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['GGR']::text[], 'Charm. See book for description.', '- A DM can predetermine up to 3 of these charms per item slot
- By default, this is reflavored as a charm not tied to the Golgari Guild of Ravnica.', 1120.0),
('c40faf68-7da1-5e56-b2a1-355d277c009c', 'REW_0113', 'Gruul Charm', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['GGR']::text[], 'Charm. See book for description.', '- A DM can predetermine up to 3 of these charms per item slot
- By default, this is reflavored as a charm not tied to the Gruul Guild of Ravnica.', 1130.0),
('a78a184f-f87d-5196-981f-96c1a2a9735d', 'REW_0114', 'Guidance of the Remembered', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['JTTRC']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot', 1140.0),
('6d9bd2a4-cc49-551c-a7cc-e92790988b20', 'REW_0115', 'Izzet Charm', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['GGR']::text[], 'Charm. See book for description.', '- A DM can predetermine up to 3 of these charms per item slot
- By default, this is reflavored as a charm not tied to the Izzet Guild of Ravnica.', 1150.0),
('8588a0b1-664e-554c-9739-42356a8c7bf0', 'REW_0116', 'Memory of the Ancestors', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['JTTRC']::text[], 'Charm. See book for description.', '- A character with this charm can choose when to begin receiving its benefit up to its duration.
- Only in character days that pass as part of an adventure count against the duration as determined by the DM.
- A DM can predetermine up to 3 of these charms per item slot', 1160.0),
('58c8bed9-264a-504a-bad6-a78812a9671e', 'REW_0117', 'Ninuno''s Mark', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['JTTRC']::text[], 'Charm. See book for description.', '- A DM can predetermine up to 3 of these charms per item slot
- By default, this is reflavored as a charm not specifically granted by a ninuno.', 1170.0),
('6f2915d4-cadd-52ca-865a-fbd69a695981', 'REW_0118', 'Orzhov Charm', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['GGR']::text[], 'Charm. See book for description.', '- A DM can predetermine up to 3 of these charms per item slot
- By default, this is reflavored as a charm not tied to the Orzhov Guild of Ravnica.', 1180.0),
('a2ea2038-aae2-509a-86e6-6c94bc2fd09e', 'REW_0119', 'Seasoul Touched', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['JTTRC']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot provided each charm has only 1 use remaining', 1190.0),
('765a0cc4-b697-552e-96d1-9eaa1212e564', 'REW_0120', 'Selesnya Charm', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['GGR']::text[], 'Charm. See book for description.', '- A DM can predetermine up to 3 of these charms per item slot
- By default, this is reflavored as a charm not tied to the Selesnya Guild of Ravnica.', 1200.0),
('f61f54d0-35dd-539b-96b5-6e7ee91289df', 'REW_0121', 'Simic Charm', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['GGR']::text[], 'Charm. See book for description.', '- A DM can predetermine up to 3 of these charms per item slot
- By default, this is reflavored as a charm not tied to the Simic Guild of Ravnica.', 1210.0),
('919b5081-b912-511c-9114-bd66699adb25', 'REW_0122', 'Rakdos Charm', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T1 Select', ARRAY['GGR']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot', 1220.0),
('dcf692d2-5ddf-5983-ab31-832ff6d243e6', 'REW_0123', 'Charm of Balance', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T2 Select', ARRAY['BMT']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot provided each charm has only 1 use remaining', 1230.0),
('d1f3c638-e014-5199-9211-f77f62b69310', 'REW_0124', 'Charm of the Creeping Hand', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T2 Select', ARRAY['VNEE']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot', 1240.0),
('b6f351e2-d7f6-5abe-90da-941e2b747cdb', 'REW_0125', 'Charm of the Donjon', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T2 Select', ARRAY['BMT']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot provided each charm has only 1 use remaining', 1250.0),
('53126475-9785-59ce-ac54-733fd2516910', 'REW_0126', 'Charm of the Eldritch Eye', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T2 Select', ARRAY['VNEE']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot provided each charm has only 1 use remaining', 1260.0),
('c67b304e-70db-5d3b-b717-2202b9f03426', 'REW_0127', 'Charm of the Flames', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T2 Select', ARRAY['BMT']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot provided each charm has only 1 use remaining', 1270.0),
('ad371d1f-8492-59bb-835a-d42173c9b18d', 'REW_0128', 'Charm of the Gem', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T2 Select', ARRAY['BMT']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot provided each charm has only 1 use remaining', 1280.0),
('878f8c49-c6ca-5255-8566-78d2dd1c2e3b', 'REW_0129', 'Charm of the Ice Troll', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T2 Select', ARRAY['IDRotF']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot', 1290.0),
('987f2b4e-13be-5494-9e52-fdb8a889bbd5', 'REW_0130', 'Charm of Incorporeality', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T2 Select', ARRAY['AATM']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot', 1300.0),
('a4ba7a35-ae86-5116-b1c4-eef4c0567f0b', 'REW_0131', 'Charm of the Knight', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T2 Select', ARRAY['BMT']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot provided each charm has only 1 use remaining', 1310.0),
('ea0b3bf8-186d-54b7-b8d2-19363db231d3', 'REW_0132', 'Charm of Lesser Conscription', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T2 Select', ARRAY['BGDIA']::text[], 'Charm. See book for description.', '- A DM can predetermine up to 3 of these charms per item slot
- Only in character days that pass as part of an adventure count against the duration as determined by the DM.', 1320.0),
('a8e5ae79-03a0-5a1c-9c30-d72af8f8b106', 'REW_0133', 'Charm of Many Tongues', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T2 Select', ARRAY['BGDIA']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot', 1330.0),
('f6bd4d2f-8e2d-5b2d-a20f-9154c79e6386', 'REW_0134', 'Charm of the Mirage', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T2 Select', ARRAY['CM']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot', 1340.0),
('47a78a45-6b81-5a9b-9b3f-9d3240d38b6d', 'REW_0135', 'Charm of Restoration', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T2 Select', ARRAY['DMG2014']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot', 1350.0),
('29cb3cc2-4f54-5a6a-bb5c-7023fe1d5463', 'REW_0136', 'Charm of the Rogue', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T2 Select', ARRAY['BMT']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot provided each charm has only 1 use remaining', 1360.0),
('62eb793f-b783-5287-8e83-cf2f35396d78', 'REW_0137', 'Charm of Ruin', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T2 Select', ARRAY['BMT']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot provided each charm has only 1 use remaining', 1370.0),
('e6710bb4-4cbd-57c9-b467-31dcea8d4796', 'REW_0138', 'Charm of the Sage', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T2 Select', ARRAY['BMT']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot provided each charm has only 1 use remaining', 1380.0),
('0d280998-ce57-5044-b3bf-01fe2eb753b5', 'REW_0139', 'Charm of the Skull', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T2 Select', ARRAY['BMT']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot provided each charm has only 1 use remaining', 1390.0),
('3d539a77-ca7f-5059-9253-33e15dcbc717', 'REW_0140', 'Charm of the Void', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T2 Select', ARRAY['BMT']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot provided each charm has only 1 use remaining', 1400.0),
('26913ac8-5ece-51fd-8a35-e917c213ca64', 'REW_0141', 'Charm of Vitality', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T2 Select', ARRAY['DMG2014']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot', 1410.0),
('b17d2e38-872f-5997-be9d-e2d895045d7a', 'REW_0142', 'Way of the Dragon', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T2 Select', ARRAY['JTTRC']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot provided each charm has only up to 2 charges remaining', 1420.0),
('0cd11d01-6f55-5b75-a2d1-9474028b234f', 'REW_0143', 'Charm of the Adamant', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T3 Select', ARRAY['BGDIA']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot provided each charm has only 1 use remaining', 1430.0),
('fe21350a-9980-5c6a-853e-d0173258095c', 'REW_0144', 'Charm of Euryale', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T3 Select', ARRAY['BMT']::text[], 'Charm. See book for description.', NULL, 1440.0),
('67e3aaca-bf62-5672-bbb2-5956e30f4257', 'REW_0145', 'Charm of the Maimed', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T3 Select', ARRAY['ToA']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot', 1450.0),
('d328751b-2cf0-5ea0-845b-d8972da57db1', 'REW_0146', 'Charm of the Heroes'' Feast', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T3 Select', ARRAY['CM']::text[], 'Charm. See book for description.', NULL, 1460.0),
('ef698a3b-e32a-5f17-9a02-1451eb0e4d97', 'REW_0147', 'Charm of the Moon', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T3 Select', ARRAY['BMT']::text[], 'Charm. See book for description.', 'This charm produces the effect of a spell instead of you casting it. If the produced spell requires Concentration, it instead lasts for its full duration. If the produced spell has a range of self, you''re the target. If the produced spell has a range of self with an area, you''re the point of origin. Targets of the produced spell must be in the spell''s range of you and there must be a clear path from you to the targets. For purposes of all other effects written in the produced spell, you''re treated as the spell''s caster.', 1470.0),
('6556591f-7e5b-5961-920d-3a9f9ce5d619', 'REW_0148', 'Charm of Nine Lives', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T3 Select', ARRAY['BGDIA']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot provided each charm has up to 3 uses remaining', 1480.0),
('44255eae-6e93-544f-bc62-1884d33c7d54', 'REW_0149', 'Charm of the Stumblenoodle', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T3 Select', ARRAY['HFStCM']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot provided each charm has only 1 use remaining', 1490.0),
('714a7b59-9923-5e3b-94b5-1338cccf03b8', 'REW_0150', 'Charm of the Sun', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T3 Select', ARRAY['BMT']::text[], 'Charm. See book for description.', NULL, 1500.0),
('7f2d79d8-b9e2-558b-b141-e96d0ac1cf8e', 'REW_0151', 'Charm of the Throne', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T3 Select', ARRAY['BMT']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot provided each charm has only 1 use remaining', 1510.0),
('b65f02c7-b4ce-5d3d-8c88-8d87225d23cc', 'REW_0152', 'Charm of the Traveler''s Haven', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T3 Select', ARRAY['IDRotF']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot provided each charm has only 1 use remaining', 1520.0),
('c083bbe4-4b80-55f1-af78-044f345d4542', 'REW_0153', 'Eyes of the Impossible', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T3 Select', ARRAY['ToFW']::text[], 'Charm. See book for description.', '- A character with this charm can choose when to begin receiving its benefit up to its duration.
- Only in character days that pass as part of an adventure count against the duration as determined by the DM.', 1530.0),
('7066f803-75b7-53bc-8bb2-777cf830ccc4', 'REW_0154', 'Charm of Greater Conscription', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T4 Select', ARRAY['BGDIA']::text[], 'Charm. See book for description.', 'Only in character days that pass as part of an adventure count against the duration as determined by the DM.', 1540.0),
('c5bbd11e-7e4d-5950-aad8-dc5b7cacd2cd', 'REW_0155', 'Charm of Hellish Rebuke', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T4 Select', ARRAY['BGDIA']::text[], 'Charm. See book for description.', 'A DM can predetermine up to 3 of these charms per item slot provided each charm has up to 3 uses remaining', 1550.0),
('c67d5915-ea98-5d11-8f18-9d62ad821da5', 'REW_0156', 'Time of the Dragon', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Charm (Supernatural Reward)', false, NULL, 'T4 Select', ARRAY['ToFW']::text[], 'Charm. See book for description.', 'This charm summons an adult time dragon of the DM''s choice, not specifically Renesnuprah.', 1560.0),
('10114764-23a3-5bb5-a7ef-04a141b4b7a7', 'REW_0157', 'Charm of the Crystal Heart', 'c0000001-0000-0000-0000-000000000004', (SELECT id FROM public.ac_tiers WHERE code = 'T3_PLUS'), 'Charm (Supernatural Reward)', false, NULL, 'T3+', ARRAY['ToA']::text[], 'Charm. See book for description.', '- A character with this charm can choose when to begin receiving its benefit up to its duration.
- Only in character days that pass as part of an adventure count against the duration as determined by the DM.
- A DM can predetermine up to 3 of these charms per item slot', 1570.0),
('dddb6d05-ab99-5aef-aa05-13edca87e847', 'REW_0158', 'Bastion', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'VARIES'), 'Bastion', false, NULL, 'Varies', ARRAY['DMG2024']::text[], 'A Bastion obtained as part of an adventure.', '- DMs can award a Bastion as part of an adventure, which doesn’t count against the adventure’s gold allotment or item slots. The number of Special Facilities and their level prerequisites must adhere to the table in Appendix B of the Player Guidelines, using the Average Party Level (APL). 
- These Bastions can’t be used in downtime or otherwise altered or expanded; however, Bastion Turns can be taken during adventures with a DM’s permission. 
- Items crafted and effects gained at these Bastions can’t persist beyond an adventure. 
- A character awarded a Bastion in this way can claim it as their new Bastion (which can be used in downtime) by using the rules for Additional Bastions in Appendix B of the Player Guidelines and expending the full cost in gold and DTP for the awarded Bastion’s facilities. The player must have the original DM’s permission to do so, which must be noted in the session log originally or as later edited.', 1580.0),
('b08ddca9-cfc9-54d5-93ea-d625fd1a9da5', 'REW_0159', 'Quirk', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Supernatural Reward', false, NULL, 'T0', ARRAY['HHB']::text[], 'A character gains a minor alteration to their person that is either cosmetic or provides a mechanical benefit no greater than a minor magical property.', '- Only Full DMs can create and award Quirks without a request. 
- Quirks don''t take up item slots for a session and the DM can give a character a Quirk at their discretion due to events in an adventure.
- A character can have any number of Quirks. They can''t be traded or sold.
- The effect of a Quirk should either be cosmetic or if it has a mechanical effect, the effect should be no greater than a minor magical property as described in the 2014/2024 DMG (except for the Guardian or Unbreakable properties)', 1590.0),
('05b1ab40-cf8f-5b75-a4e4-21b13028e23a', 'REW_0160', 'Homebrew Supernatural Reward (Dark Gift, Supernatural Gift, Mythic Gift, or Charm)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'VARIES'), 'Supernatural Reward', false, NULL, 'Varies', ARRAY['HHB']::text[], 'Homebrew Supernatural Reward created by a DM in collaboration with the Rules team.', '- DMs can submit a Rules request to design and award a homebrew Supernatural Reward of their creation in an adventure.
- The design and tier of the Supernatural Reward is collaboratively determined by the DM and the Rules team.        
- The DM should refer to existing 5e Supernatural Rewards to either use as a starting point for their homebrew reward or to help inform how the reward is designed.
- The DM may be asked to  provide an outline describing how the reward is meant to be acquired.
- The reward follows the normal distribution rules for items on the server. If the item is determined to be multisession loot of a given tier, the DM must run a multisession of the required minimum APL and number of sessions.
- With a DM’s consent, an approved homebrew Supernatural Reward can be added to this document to allow that DM and other DMs to award that reward without the need for future requests.', 1600.0),
('b09f8bd9-4277-5984-b75c-ae24dae63918', 'REW_0161', 'Piety', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_PLUS'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T1+', ARRAY['HHB']::text[], 'Homebrew Supernatural Gift created by a Full DM in collaboration with the Lore and Rules teams, using the Piety system as detailed in Mythic Odysseys of Theros.', '- A character with this kind of Supernatural Gift has a starting Piety score of 1 in relation to a deity or faith, unless it is already higher than 1. See Chapter 2 of the Mythic Odysseys of Theros for rules on how this score works (ignore the guidance regarding changing gods). 
- As a guideline and as determined by the DM, a character''s Piety typically increases by 1 during most sessions of play where they are following the tenets of that deity and faith as determined by the DM, and a single deed typically changes their Piety score by only 1 point in either direction unless the action is very significant as determined by the DM. Regardless, any increase or decrease to Piety (if any) is wholly determined by the DM.
- A DM that awards this Supernatural Gift must note in their session log the deity or faith this Supernatural Gift is associated with, as well as circumstances that can increase or decrease Piety, following the template in Mythic Odysseys of Theros.
- A character''s Piety score can change even when this Supernatural Gift is not active.
- Each Piety Supernatural Gift provides certain benefits at certain Piety thresholds—3, 10, 25, and 50—which have associated level prerequisites as well: level 1+, 5+, 11+, and 17+ respectively.
- For purposes of the number of Supernatural Gifts a character can have active at a time, this Supernatural Gift''s tier of play corresponds to the tier of the highest level trait they benefit from. For example, it would be treated as a Tier 3 Supernatural Gift when used by a level 12 character with 30 Piety (since they gain the benefit of the trait that requires being level 11+ and having 25+ Piety).
- The design and approval of this Supernatural Gift follows the process described above for Homebrew Supernatural Rewards.', 1610.0),
('a2bcc2bf-d5b6-5090-90ec-cc0342f3eafd', 'REW_0162', 'Adaptive Frame (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Quirk', false, NULL, 'T0', ARRAY['HHB']::text[], 'Quirk, T0 (can only be used by a creature with the Arcane Armor class feature)

Your Arcane Armor is sized for a Medium creature, but you can wear it even if you are smaller than Medium size. While wearing your Arcane Armor, you are treated as a Medium creature for purposes of game features and effects.', 'This Quirk was created by aovnick', 1620.0),
('343f0744-9343-5e5b-b56a-f3a2c05c00fa', 'REW_0163', 'Formation Fighting (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Quirk', false, NULL, 'T0', ARRAY['HHB']::text[], 'Quirk, T0

New members of the Legion of Dread are instructed in the ways of fighting together as an effective combat unit.

While you are within 5 feet of another creature with this feature that is no more than one size larger or smaller than you and neither of you have the Incapacitated or Prone condition, you gain the benefits of Half Cover. Both you and the other creature must be wielding either a melee weapon or a shield in order for you to gain this benefit.', '- This Quirk was created by greensprout
- This Quirk can only ever be obtained as a Renown Perk (Renown Score 3) as part of the Legion of Dread', 1630.0),
('7d6c0cc6-e56c-520a-91f4-2e734f438ffe', 'REW_0164', 'Inner Beast (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Quirk', false, NULL, 'T0', ARRAY['HHB']::text[], 'Quirk, T0

You can spend 8 hours in uninterrupted meditation to magically shape-shift into a Tiny Beast or back into your true form. The first time you shape-shift into a Tiny Beast in this way, you choose the kind of Beast you turn into as well as the appearance and physical characteristics of the form, which you thereafter always assume when you shape-shift into a Beast in this way. You also revert back to your true form if you die.

Besides being Tiny and a Beast in your Beast form, you retain all other game statistics. Additionally, while in your Beast form, you are limited in the actions you can perform by the nature of the Beast form, and you can''t speak, cast spells, or take any other action that requires hands or speech. Your gear melds into the Beast form, and you can''t activate, use, wield, or otherwise benefit from any of your equipment.', 'This Quirk was created by goosetipher', 1640.0),
('8146d8bd-3108-5e28-bf86-f577aa9cd8dd', 'REW_0165', 'Devout of Bahamut (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_PLUS'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T1+', ARRAY['HHB']::text[], 'Supernatural Gift, T1+ (can only be used by a follower of Bahamut)

Your dedication to Bahamut has not gone unnoticed, with the Platinum Dragon granting you his blessing commensurate with the devotion you demonstrate through your actions. When you gain this Supernatural Gift, your Piety score with respect to Bahamut is 1 unless it is already higher than 1.

See Chapter 2 of the Mythic Odysseys of Theros for rules on how this score works (ignore the guidance regarding changing gods). As a guideline and as determined by the DM, you can expect your Piety to increase by 1 during most sessions of play where you are following Bahamut''s tenets as determined by the DM, and a single deed typically changes your Piety score by only 1 point in either direction unless the action is very significant as determined by the DM. Regardless, any increase or decrease to Piety (if any) is wholly determined by the DM.

You increase your Piety score to Bahamut through acts such as these during an adventure (even while this Supernatural Gift is inactive):
- Defeating servants of Tiamat, evil chromatic Dragons, or members of the Cult of the Dragon.
- Defending worshippers of Bahamut and his sites of importance.
- Defending good Dragons.
- Protecting the weak or liberating the oppressed.
- Seeking and ensuring justice.
- Upholding and adhering to the tenets of the Ptarian Code.

Your Piety score to Bahamut decreases if you diminish Bahamut''s influence in the world, contradict his ideals, or let him down through acts such as these during an adventure (even while this Supernatural Gift is inactive):
- Harming or slaying good metallic Dragons.
- Betraying one''s faith to commit acts of corruption or dishonor.
- Willfully causing harm and misery to creatures of Good alignment.
- Knowingly assisting the Cult of the Dragon or servants of Tiamat in their wicked endeavors.
- Supporting oppression and injustice.

When you select this Supernatural Gift to be active when finishing a Long Rest, choose one of the following ability scores: Intelligence, Wisdom, or Charisma. While this Supernatural Gift is active, you gain the following benefits if you meet the associated level prerequisite and meet the associated Piety threshold.

Bahamut''s Devotee
Level 1+, Piety 3+

You''ve learned to instill yourself or others with the nobility and courage of the Platinum Dragon. You can cast the Heroism spell without expending a spell slot and requiring no Material components. You can cast this spell a number of times equal to the ability score modifier for the ability score you chose (minimum of once), and you regain all expended uses when you finish a Long Rest. The ability score you chose is your spellcasting ability for this spell. 

Bahamut''s Votary
Level 5+, Piety 10+

Bahamut has allowed your words to rally your allies around you. You can cast the Beacon of Hope spell without expending a spell slot and requiring no Material components. You can''t cast this spell in this way again until you finish a Long Rest. The ability score you chose is your spellcasting ability for this spell. 

Immediately after casting this spell in this way, you can take a Bonus Action to unleash a draconic cry of inspiration. Until the end of your next turn, you and all allies under the effect of the Beacon of Hope spell as cast in this way have Advantage on attack rolls. 

Bahamut''s Disciple
Level 11+, Piety 25+

Your dedication to Bahamut allows you to channel the radiant flames of the Platinum Dragon himself. You can take an action to exhale blinding radiant energy in a 30-foot Cone. Each creature in that area must make a Constitution saving throw, with the DC equal to 8 + your Proficiency Bonus + your Constitution modifier. On a failed save, a creature takes 4d6 Radiant damage and has the Blinded condition until the end of your next turn. On a successful save, a creature takes half as much damage only. You can take this action a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.

Additionally, you have Resistance to Radiant damage.

Champion of Bahamut
Level 17+, Piety 50+

Your dedication to the ideals of the Platinum Dragon have been repaid with a measure of his strength and noble character. You can increase your Strength or Charisma score by 2 and also increase your maximum for that score by 2.', 'This homebrew Supernatural Gift was created by willbrashear', 1650.0),
('00010a86-65b0-5007-b59d-b52e0860899a', 'REW_0166', 'Devout of Bhaal (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_PLUS'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T1+', ARRAY['HHB']::text[], 'Supernatural Gift, T1+ (can only be used by a follower of Bhaal)

Your dedication to Bhaal has not gone unnoticed, with the Lord of Murder granting you his blessing commensurate with the devotion you demonstrate through your actions. When you gain this Supernatural Gift, your Piety score with respect to Bhaal is 1 unless it is already higher than 1.

See Chapter 2 of the Mythic Odysseys of Theros for rules on how this score works (ignore the guidance regarding changing gods). As a guideline and as determined by the DM, you can expect your Piety to increase by 1 during most sessions of play where you are following Bhaal''s tenets as determined by the DM, and a single deed typically changes your Piety score by only 1 point in either direction unless the action is very significant as determined by the DM. Regardless, any increase or decrease to Piety (if any) is wholly determined by the DM.

You increase your Piety score to Bhaal through acts such as these during an adventure (even while this Supernatural Gift is inactive):
- Killing a powerful and skilled foe in combat.
- Striking awe or fear of Bhaal in others, such as by skillfully slaying a worthy target in plain view.
- Spreading the influence of Bhaal via manipulating or intimidating others.
- Participating in rituals and holy ceremonies dedicated to Bhaal, such as on the Feast of the Moon.
- Defeating servants of faiths opposed to Bhaal, such as followers of Chauntea, Helm, Ilmater, Lathander, LIlira, Torm, or Tyr.

Your Piety score to Bhaal decreases if you diminish Bhaal''s influence in the world, contradict his ideals, or let him down through acts such as these during an adventure (even while this Supernatural Gift is inactive):
- Directly performing acts of compassion or mercy for others.
- Striking down an enemy in combat nonlethally when a killing blow was possible instead.
- Killing without cause or consideration, especially if killing individuals that could be useful to the church of Bhaal.
- Acting against fellow Bhaalists and the church of Bhaal on behalf of faiths opposed to Bhaal, such as followers of Chauntea, Helm, Ilmater, Lathander, LIlira, Torm, or Tyr.

When you select this Supernatural Gift to be active when finishing a Long Rest, choose one of the following ability scores: Constitution, Intelligence, Wisdom, or Charisma. While this Supernatural Gift is active, you gain the following benefits if you meet the associated level prerequisite and meet the associated Piety threshold.

Bhaal''s Devotee
Level 1+, Piety 3+

Bhaal guides your hand to ensure that your blade draws the blood of your enemies. You can cast the Divine Favor spell (no Concentration required and deals Necrotic damage instead of Radiant damage) without expending a spell slot and requiring no Material components. You can cast this spell a number of times equal to the ability score modifier for the ability score you chose (minimum of once), and you regain all expended uses when you finish a Long Rest.

Bhaal''s Votary
Level 5+, Piety 10+

The Lord of Murder has taught you to sow terror and strike fear when you slay your foes in his name. 

When you reduce an enemy to 0 Hit Points, you can take a Reaction to gain Temporary Hit Points equal to half your level and force each enemy within 30 feet of yourself that can see you to make a Wisdom saving throw or have the Frightened condition until the end of your next turn. The save DC for the Wisdom saving throw is equal to 8 + your Proficiency Bonus + the ability score modifier for the ability score you chose. You can take this Reaction a number of times equal to the ability score modifier for the ability score you chose (minimum of once), and you regain all expended uses when you finish a Long Rest.

Bhaal''s Disciple
Level 11+, Piety 25+

Through steadfast sacrifice and devotion to Bhaal, you have been blessed with the capacity to channel the power of the unstoppable Slayer itself.

If you are hit with an attack roll and don''t have the Incapacitated condition, you can choose to reduce the attack''s damage to 0 and curse the attacker until the end of your next turn. The cursed target can''t regain Hit Points, and the next time you deal damage to the attacker while it is cursed in this way, it has Vulnerability to all of the damage and then the curse ends. If the target has 25 Hit Points or fewer after taking this damage, it must succeed on a Constitution saving throw or be destroyed. On a successful save, the target has the Frightened condition until the end of your next turn. The save DC for the Constitution saving throw is equal to 8 + your Proficiency Bonus + the ability score modifier for the ability score you chose.

Once used, this trait can''t be used again until you finish a Long Rest.

Champion of Bhaal
Level 17+, Piety 50+

For the dark deeds you have done in his name, the Lord of Murder has granted you a measure of his elegant savagery and fearsome resilience. You can increase your Dexterity or Constitution score by 2 and also increase your maximum for that score by 2.', '- This homebrew Supernatural Gift was created by temmiechaoslight
- As a rules reminder, a creature that has Immunity to a source or type of damage takes 0 damage, even if it later gains Vulnerability to that source or type of damage.', 1660.0),
('df3bc67c-c6ff-57f2-b583-fcb0fd7aa10c', 'REW_0167', 'Devout of Eilistraee (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_PLUS'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T1+', ARRAY['HHB']::text[], 'Supernatural Gift, T1+ (can only be used by a follower of Eilistraee)

Your dedication to Eilistraee has not gone unnoticed, with the Dark Maiden granting you her blessing commensurate with the devotion you demonstrate through your actions. When you gain this Supernatural Gift, your Piety score with respect to Eilistraee is 1 unless it is already higher than 1.

See Chapter 2 of the Mythic Odysseys of Theros for rules on how this score works (ignore the guidance regarding changing gods). As a guideline and as determined by the DM, you can expect your Piety to increase by 1 during most sessions of play where you are following Eilistraee''s tenets as determined by the DM, and a single deed typically changes your Piety score by only 1 point in either direction unless the action is very significant as determined by the DM. Regardless, any increase or decrease to Piety (if any) is wholly determined by the DM.

You increase your Piety score to Eilistraee through acts such as these during an adventure (even while this Supernatural Gift is inactive):
- Freeing drow from traditional udadrow society to take to the surface and convert away from the clutches of others of the Dark Seldarine, especially Lolth.
- Promoting harmony between different species, such as denouncing and working against racial bigotry where present.
- Swiftly ending conflict with as little bloodshed as possible to defend others from undue violence.
- Providing kindness and hospitality to strangers and to those in need, such as giving shelter to the homeless or providing food to hungry travelers.
- Performing skillful dance and song to lift the spirits of others and during worship of Eilistraee.
- Participating in holy ceremonies dedicated to Eilistraee, such as the High Hunt or the Run.
- Aiding fellow followers of Eilistraee, followers of the Seldarine, especially of Corellon Larethian and Erevan Ilesere, as well as followers of Callduran Smoothhands, Haela Brightaxe, Lurue, Mystra, and Selûne.
- Defeating servants of other evil deities of the Dark Seldarine and evil deities of the Underdark, especially of Lolth.

Your Piety score to Eilistraee decreases if you diminish Eilistraee''s influence in the world, contradict her ideals, or let him down through acts such as these during an adventure (even while this Supernatural Gift is inactive):
- Promoting disunity and strife between different species, such as expressing or displaying racial bigotry.
- Damaging and denigrating works of beauty and art or unduly allowing them to come to harm.
- Not aiding drow in distress, such as turning aside drow seeking to depart traditional udadrow society and away from the path of others of the Dark Seldarine.
- Turning aside those in need and treating strangers inhospitably and with suspicion from the outset.
- Participating in unnecessary bloodshed, such as overly prolonging conflict or attacking innocents.
- Aiding the cause of the evil deities of the Dark Seldarine and evil deities of the Underdark, especially of Lolth.
- Attacking followers of Eilistraee and other friendly faiths, such as of the Seldarine, Callduran Smoothhands, Haela Brightaxe, Lurue, Mystra, and Selûne.
- Desecrating holy sites to Eilistraee or other faiths aligned with hers, such as of the Seldarine, Callduran Smoothhands, Haela Brightaxe, Lurue, Mystra, and Selûne.

When you select this Supernatural Gift to be active when finishing a Long Rest, choose one of the following ability scores: Intelligence, Wisdom, or Charisma. While this Supernatural Gift is active, you gain the following benefits if you meet the associated level prerequisite and meet the associated Piety threshold.

Eilistraee''s Devotee
Level 1+, Piety 3+

The Dark Dancer herself has bestowed upon you the capacity to evoke her own graceful dance and skill. When this Supernatural Gift becomes active, you gain Proficiency with your choice of either the Performance or Survival skill, and you gain Expertise in it.

Eilistraee''s Votary
Level 5+, Piety 10+

Under the guidance of the Dark Maiden, you''ve learned the sword dance of her faithful. You can take a Magic action to cause one sword you are holding to gain the magical properties of a Dancing Sword in addition to its other existing magical properties if any, for a number of hours equal to your Proficiency Bonus. You can''t take this Magic action again until you finish a Long Rest.

Eilistraee''s Disciple
Level 11+, Piety 25+

Lady Silverhair has taught you how to weave both song and swordplay together. You can cast the Steel Wind Strike spell without expending a spell slot and requiring no Material components. You can''t cast this spell in this way again until you finish a Short or Long Rest. The ability score you chose is your spellcasting ability for this spell.

Additionally, you can''t be caught in webs of any sort and can move through webs as if they were Difficult Terrain.

Champion of Eilistraee
Level 17+, Piety 50+

Your steadfast dedication to the Dark Maiden and her cause has allowed you to fully enter her embrace as a living emissary of her love and grace. You can increase your Dexterity or Charisma score by 2 and also increase your maximum for that score by 2.', 'This homebrew Supernatural Gift was created by tglassy, talevran, and velocirabbit_', 1670.0),
('b5bd8cba-2b38-55b0-a5f2-3ad1a489a1e4', 'REW_0168', 'Devout of Eldath (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_PLUS'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T1+', ARRAY['HHB']::text[], 'Supernatural Gift, T1+ (can only be used by a follower of Eldath)

Your dedication to Eldath has not gone unnoticed, with the Green Goddess granting you her blessing commensurate with the devotion you demonstrate through your actions. When you gain this Supernatural Gift, your Piety score with respect to Eldath is 1 unless it is already higher than 1.

See Chapter 2 of the Mythic Odysseys of Theros for rules on how this score works (ignore the guidance regarding changing gods). As a guideline and as determined by the DM, you can expect your Piety to increase by 1 during most sessions of play where you are following Eldath''s tenets as determined by the DM, and a single deed typically changes your Piety score by only 1 point in either direction unless the action is very significant as determined by the DM. Regardless, any increase or decrease to Piety (if any) is wholly determined by the DM.

You increase your Piety score to Eldath through acts such as these during an adventure (even while this Supernatural Gift is inactive):
- Choosing to deescalate and resolve a conflict peacefully when you have the option to.
- Providing healing, care, and comfort to the injured, sick, and dying.
- Participating in holy ceremonies dedicated to Eldath, such as the Greening.
- Preserving, defending, and restoring pools, forests, and other areas of nature, such as purifying a befouled body of water, replanting a deforested area, or defending a sacred glade.

Your Piety score to Eldath decreases if you diminish Eldath''s influence in the world, contradict her ideals, or let her down through acts such as these during an adventure (even while this Supernatural Gift is inactive):
- Participating in unnecessary bloodshed and inflicting unnecessary harm, such as initiating violent conflict, overly prolonging conflict, or harming innocents.
- Carelessly harming or damaging pools, forests, and other areas of nature, such as polluting bodies of water, starting a forest fire, participating in mass deforestation, or desecrating a sacred glade.
- Needlessly harming and slaying denizens of the forest, such as forest animals or other creatures such as unicorns.
- Harming or attacking fellow followers of Eldath and those aligned with her church.

When you select this Supernatural Gift to be active when finishing a Long Rest, choose one of the following ability scores: Intelligence, Wisdom, or Charisma. While this Supernatural Gift is active, you gain the following benefits if you meet the associated level prerequisite and meet the associated Piety threshold.

Eldath''s Devotee
Level 1+, Piety 3+

For your dedication to her faith, the Quiet One has taught you to seek strength from stillness and to show others that violence is no solution. You can cast the Sanctuary spell without expending a spell slot and requiring no Material components. You can cast this spell a number of times equal to the ability score modifier for the ability score you chose (minimum of once), and you regain all expended uses when you finish a Long Rest. The ability score you chose is your spellcasting ability for this spell.

Eldath''s Votary
Level 5+, Piety 10+

The Mother of Waters has blessed you with the capacity to counsel peace and to restore balance to nature. You can cast the Calm Emotions spell without expending a spell slot and requiring no Material components. You can cast this spell a number of times equal to the ability score modifier for the ability score you chose (minimum of once), and you regain all expended uses when you finish a Long Rest. The ability score you chose is your spellcasting ability for this spell.

You can also cast the Mend Plants spell at will and requiring no Material components. Additionally, you can cast the Purify Food and Drink spell at will as a ritual only and requiring no Material components and only to remove poison and rot from water or a portion of a body of water that fits within a 5-foot radius Sphere within range. The ability score you chose is your spellcasting ability for these spells.

Eldath''s Disciple
Level 11+, Piety 25+

The Green Goddess has bestowed you with a capacity to ensure others do not come to harm in the cause of peace. When an ally you can see within 30 feet of yourself is targeted by an attack roll, you can take a Reaction to teleport to an unoccupied space within 5 feet of the ally and take all of the attack''s damage instead. You have Resistance to this damage. You can take this Reaction a number of times equal to the ability score modifier for the ability score you chose (minimum of once), and you regain all expended uses when you finish a Long Rest.

Champion of Eldath
Level 17+, Piety 50+

Your tireless devotion and dedication to the Mother of the Waters and her ideals has been repaid with a measure of her quiet wisdom and grace. You can increase your Wisdom or Charisma score by 2 and also increase your maximum for that score by 2.', 'This homebrew Supernatural Gift was created by another_tiefling and magurotoria', 1680.0),
('57f6fccf-2663-518e-98db-380883417062', 'REW_0169', 'Devout of Helm (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_PLUS'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T1+', ARRAY['HHB']::text[], 'Supernatural Gift, T1+ (can only be used by a follower of Helm)

Your dedication to Helm has not gone unnoticed, with the Watcher granting you his blessing commensurate with the devotion you demonstrate through your actions. When you gain this Supernatural Gift, your Piety score with respect to Helm is 1 unless it is already higher than 1.

See Chapter 2 of the Mythic Odysseys of Theros for rules on how this score works (ignore the guidance regarding changing gods). As a guideline and as determined by the DM, you can expect your Piety to increase by 1 during most sessions of play where you are following Helm''s tenets as determined by the DM, and a single deed typically changes your Piety score by only 1 point in either direction unless the action is very significant as determined by the DM. Regardless, any increase or decrease to Piety (if any) is wholly determined by the DM.

You increase your Piety score to Helm through acts such as these during an adventure (even while this Supernatural Gift is inactive):
- Ensuring that one you''ve been tasked to protect remains secure and safe from harm.
- Ensuring a location you''ve been tasked to protect remains secure and isn''t breached.
- Exposing corruption, especially a corrupt or false guardian.
- Partake in one of the holy ceremonies of the church of Helm, such as the Consecration of a Postulant or the Consecration of a Glymtul.
- Correctly anticipate and prepare for an assault on a person, location, or object which you have been tasked to protect.
- Protecting the poor, weak, injured, young, or other innocents during battle.

Your Piety score to Helm decreases if you diminish Helm''s influence in the world, contradict his ideals, or let him down through acts such as these during an adventure (even while this Supernatural Gift is inactive):
- Betraying your trust by abandoning your post or charge.
- Neglecting your post or charge by allowing yourself to grow lax in duty.
- Allowing the poor, weak, injured, young, or other innocents to be sacrificed or come to harm for the sake of preserving yourself.
- Being aware of and failing to expose corruption or engaging in corrupt acts yourself, such as abusing your position as a guardian.
- Choosing rashness over careful forethought when it comes to securing and protecting your charge.
- Desecrating holy sites dedicated to Helm.

When you select this Supernatural Gift to be active when finishing a Long Rest, choose one of the following ability scores: Intelligence, Wisdom, or Charisma. While this Supernatural Gift is active, you gain the following benefits if you meet the associated level prerequisite and meet the associated Piety threshold.

Helm''s Devotee
Level 1+, Piety 3+

The Watcher has blessed you with the capacity to protect others under your care. You can cast the Shield of Faith spell without expending a spell slot and requiring no Material components. You can cast this spell a number of times equal to the ability score modifier for the ability score you chose (minimum of once), and you regain all expended uses when you finish a Long Rest. The ability score you chose is your spellcasting ability for this spell. 

Helm''s Votary
Level 5+, Piety 10+

Through continued dedication to the Vigilant One, you can ensure that none fall under your watch. You can cast the Beacon of Hope spell without expending a spell slot and requiring no Material components. You can''t cast this spell in this way again until you finish a Long Rest. The ability score you chose is your spellcasting ability for this spell. 

In addition, when you cast the Shield of Faith spell targeting a creature other than yourself, the spell does not require Concentration. You can''t have more than one ongoing instance of the spell in this way at a time.

Helm''s Disciple
Level 11+, Piety 25+

The God of Guardians has granted you the resilience needed to uphold your duties as a vigilant protector. Whenever you finish a Long Rest, you gain Resistance to one of the following damage types until the next time you finish a Long Rest: Bludgeoning, Piercing, or Slashing. 

Additionally, you and friendly creatures within 10 feet of yourself have Advantage on saving throws made to avoid or end the Blinded condition.

Champion of Helm
Level 17+, Piety 50+

Your tireless dedication in safeguarding others and steadfast faith in the Watcher has granted you a measure of his resilience and vigilance. You can increase your Constitution or Wisdom score by 2 and also increase your maximum for that score by 2.', 'This homebrew Supernatural Gift was created by diandra and .missile', 1690.0),
('11b76878-d691-5598-b8a2-a3fa2d6ed47f', 'REW_0170', 'Painbearer of Ilmater (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_PLUS'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T1+', ARRAY['HHB']::text[], 'Supernatural Gift, T1+ (can only be used by a follower of Ilmater)

Your dedication to Ilmater has not gone unnoticed, with the Broken God granting you his blessings commensurate with the devotion you demonstrate through your actions. When you gain this Supernatural Gift, your Piety score with respect to Ilmater is 1 unless it is already higher than 1. 
 
See Chapter 2 of the Mythic Odysseys of Theros for rules on how this score works (ignore the guidance regarding changing gods). As a guideline and as determined by the DM, you can expect your Piety to increase by 1 during most sessions of play where you are following Ilmater''s tenets as determined by the DM, and a single deed typically changes your Piety score by only 1 point in either direction unless the action is very significant as determined by the DM. Regardless, any increase or decrease to Piety (if any) is wholly determined by the DM.

You increase your Piety score to Ilmater through acts such as these during an adventure (even while this Supernatural Gift is inactive):
- Helping to relieve suffering.
- Taking on the pain or suffering of another.
- Inspiring others to keep going despite pain and suffering.
- Allowing someone to unburden their sorrows on you.
- Healing wounds and tending to injuries.
- Suffering as a direct result of your beliefs or principles.
- Destroying instruments of torture and stopping those who inflict suffering on others for wicked purposes.
- Defending the poor, sick and helpless and taking up their ails and woes on you.
- Tending to sick houses and places in need and distress.
- Showing mercy when it would be easier not to.
- Participating in the Pilgrimage of The Broken One.

Your Piety score to Ilmater decreases if you diminish Ilmater’s influence in the world, contradict his ideals, or let him down through acts such as these during an adventure (even while this Supernatural Gift is inactive):
- Inflicting wanton suffering and violence for no reason, especially against those who cannot fight back.
- Refusing to heal the sick or needy and abandoning the suffering in need.
- Allowing cruelty to continue unchallenged.
- Aiding in or committing acts of cruelty, torture, and tyranny.
- Mocking or dismissing the value of endurance, sacrifice, or martyrdom.
- Sacrificing someone else to save yourself.

When you select this Supernatural Gift to be active when finishing a Long Rest, choose one of the following ability scores: Intelligence, Wisdom, or Charisma. While this Supernatural Gift is active, you gain the following benefits if you meet the associated level prerequisite and meet the associated Piety threshold.

Words of Hope
Level 1+, Piety 3+

The Broken God has allowed to ease the pain and despair of others. You can cast the Healing Word spell without expending a spell slot and requiring no Material components. You can cast this spell a number of times equal to the ability score modifier for the ability score you chose (minimum of once), and you regain all expended uses when you finish a Long Rest. The ability score you chose is your spellcasting ability for this spell. 

Favor of the Broken God
Level 5+, Piety 10+

As a painbearer of the Broken God, you can bestow Ilmater''s favor to others. You can cast the Life Transference spell without expending a spell slot and requiring no Material components. You can''t cast this spell in this way again until you finish a Short or Long Rest. The ability score you chose is your spellcasting ability for this spell.

Additionally, your allies within 5 feet of you have advantage on saving throws made to end or avoid the Charmed and Frightened conditions, provided you aren''t Incapacitated. 

Endurance of the Broken God
Level 11+, Piety 25+

Your faith in Ilmater has granted you the endurance to withstand the trials of the world and to continue to strive to uphold both his and your ideals. You have Advantage on saving throws made to avoid or end the Exhaustion condition, and your Hit Point maximum can''t be reduced. 

Saint of the Rack
Level 17+, Piety 50+

The Crying God has repaid your sincere devotion to him and his tenets by imbuing you with a measure of his own patience and grace. You can increase your Constitution or Charisma score by 2 and also increase your maximum for that score by 2.', 'This homebrew Supernatural Gift was created by geisterhund', 1700.0),
('8b678f1c-e240-5aff-85f3-1da89b7b2e3c', 'REW_0171', 'Devout of Kelemvor (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_PLUS'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T1+', ARRAY['HHB']::text[], 'Supernatural Gift, T1+ (can only be used by a follower of Kelemvor)

Your dedication to Kelemvor has not gone unnoticed, with Kelemvor granting you his blessing commensurate with the devotion you demonstrate through your actions. When you gain this Supernatural Gift, your Piety score with respect to Kelemvor is 1 unless it is already higher than 1. 

See Chapter 2 of the Mythic Odysseys of Theros for rules on how this score works (ignore the guidance regarding changing gods). As a guideline and as determined by the DM, you can expect your Piety to increase by 1 during most sessions of play where you are following Kelemvor''s tenets as determined by the DM, and a single deed typically changes your Piety score by only 1 point in either direction unless the action is very significant as determined by the DM. Regardless, any increase or decrease to Piety (if any) is wholly determined by the DM.

You increase your Piety score to Kelemvor through acts such as these during an adventure (even while this Supernatural Gift is inactive):
- Working to prevent untimely death, such as preventing a murder or the spread of a disease.
- Opposing necromancy and the undead, such as by slaying undead.
- Helping lingering spirits to pass on, such as ghosts.
- Overseeing burial rites for the recently dead and ensuring they receive a proper burial.
- Easing someone''s death, putting the final affairs of the dying in order, assisting with funeral arrangements, or providing counsel to the bereaved.
- Ensuring that the deeds and knowledge of someone who has died are preserved.
- Participating in holy ceremonies dedicated to Kelemvor, such as the recounting of Deeds of the Dead on Shieldmeet or the Feast of the Moon.

Your Piety score to Kelemvor decreases if you diminish Kelemvor''s influence in the world, contradict his ideals, or let him down through acts such as these during an adventure (even while this Supernatural Gift is inactive):
- Aiding the cause of enemies of the church of Kelemvor, especially that of Cyric, Myrkul, Talona, or Velsharoon.
- Raising and maintaining undead.
- Unnaturally extending one''s life beyond its proper time and end, such as seeking immortality.
- Denying a dying person their final rites.
 -Defiling or desecrating a tomb or grave.
 -Seeking to bring about the untimely death of innocents, such as via murder, spreading disease, or unleashing a scourge of undead.

When you select this Supernatural Gift to be active when finishing a Long Rest, choose one of the following ability scores: Intelligence, Wisdom, or Charisma. While this Supernatural Gift is active, you gain the following benefits if you meet the associated level prerequisite and meet the associated Piety threshold. 

Kelemvor''s Devotee
Level 1+, Piety 3+

The Great Guide has gifted you with the capacity to perform the rite of passing to ensure the fallen can be taken to their final rest undisturbed. You can cast the Gentle Repose spell without expending a spell slot and requiring no Material components. You can cast this spell a number of times equal to the ability score modifier for the ability score you chose (minimum of once), and you regain all expended uses when you finish a Long Rest. The ability score you chose is your spellcasting ability for this spell.

Kelemvor''s Votary
Level 5+, Piety 10+

Your continued devotion to the Lord of the Dead has been repaid with the ability to channel his own power to deliver a fatal touch to those that unnaturally forestall death. You can take a Bonus Action to cause one weapon you are holding to gain the magical properties of a Mace of Disruption in addition to its other existing magical properties if any for 1 minute. Once used, you can''t take this Bonus Action again until you finish a Long Rest.

Kelemvor''s Disciple
Level 11+, Piety 25+

For your steadfast service and dedication in the cause of finality, Lord Death has gifted you with a portion of his very grace to resist the forces of entropy and untimely death. Your Hit Point maximum can''t be reduced, and you and friendly creatures within 10 feet of yourself have Advantage on death saving throws and on saving throws made to avoid or end the Exhaustion condition. 

Additionally, if you would be subjected to an effect that would kill you instantly without dealing damage, you can choose to negate the effect against you (no action required). Once used, you can''t negate such effects again in this way until you finish a Short or Long Rest.

Champion of Kelemvor
Level 17+, Piety 50+

Your tireless dedication as a shepherd of souls has been rewarded by Kelemvor himself, blessing you with the same sense of patience and insight by which he judges souls. You can increase your Constitution or Wisdom score by 2 and also increase your maximum for that score by 2.

In addition, whenever you die, you can choose to allow Kelemvor to immediately claim your soul. If you choose to allow Kelemvor to claim your soul in this way, your body along with anything nonmagical you are wearing or carrying vanish as your spirit travels to the City of the Dead in the Fugue Plane and you are eternally reborn as one of Kelemvor''s Seraphs of Death. You are immediately retired as an NPC under the DM''s control and refuse any attempt to be revived to life.', 'This homebrew Supernatural Gift was created by baba8forever and jennawynn', 1710.0),
('617dfd23-bafc-5ad5-9d8d-51d15c349d95', 'REW_0172', 'Devout of Mystra (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_PLUS'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T1+', ARRAY['HHB']::text[], 'Supernatural Gift, T1+ (can only be used by a follower of Mystra)

Your dedication to Mystra has not gone unnoticed, with the Lady of Mysteries granting you her blessing commensurate with the devotion you demonstrate through your actions. When you gain this Supernatural Gift, your Piety score with respect to Mystra is 1 unless it is already higher than 1. 

See Chapter 2 of the Mythic Odysseys of Theros for rules on how this score works (ignore the guidance regarding changing gods). As a guideline and as determined by the DM, you can expect your Piety to increase by 1 during most sessions of play where you are following Mystra''s tenets as determined by the DM, and a single deed typically changes your Piety score by only 1 point in either direction unless the action is very significant as determined by the DM. Regardless, any increase or decrease to Piety (if any) is wholly determined by the DM.

You increase your Piety score to Mystra through acts such as these during an adventure (even while this Supernatural Gift is inactive):
- Defeating servants of Shar, Cyric, and Bane
- Defending worshippers of Mystra and her sites of importance
- Collecting and spreading arcane knowledge, power, or skill
- Preserving and sharing magical lore
- Teaching magic to others and using magic to benefit others
- Inventing and curating powerful magical items
- Helping to repair or stabilize a damaged part of the Weave

Your Piety score to Mystra decreases if you diminish Mystra''s influence in the world, contradict her ideals, or let her down through acts such as these during an adventure (even while this Supernatural Gift is inactive):
- Using magic recklessly or carelessly without regard for consequences
- Threatening the balance of or damaging the Weave, such as via a magical disaster
- Aiding the cause of Shar, Cyric, or Bane or their followers
- Harming the church of Mystra and its followers
- Impeding others from learning magic responsibly
- Destroying arcane knowledge or preventing others from learning it
- Using the Shadow Weave

When you select this Supernatural Gift to be active when finishing a Long Rest, choose one of the following ability scores: Intelligence, Wisdom, or Charisma. While this Supernatural Gift is active, you gain the following benefits if you meet the associated level prerequisite and meet the associated Piety threshold.

Mystra''s Devotee
Level 1+, Piety 3+

As a student of the Art in service to the Lady of Mysteries, you have been blessed with the ability to inherently sense the workings of the Weave. You can cast the Detect Magic spell without expending a spell slot and requiring no Material components. You can cast this spell a number of times equal to the ability score modifier for the ability score you chose (minimum of once), and you regain all expended uses when you finish a Long Rest. The ability score you chose is your spellcasting ability for this spell. 

Mystra''s Votary
Level 5+, Piety 10+

The Mother of All Magic has gifted you with a capacity to use and understand magic with subtlety and skill. You can cast the Counterspell spell without expending a spell slot and requiring no Material components. You can''t cast this spell in this way again until you finish a Long Rest. The ability score you chose is your spellcasting ability for this spell.

Additionally, whenever you make an Intelligence (Arcana) check, you can treat a d20 roll of 9 or lower as a 10.

Mystra''s Disciple
Level 11+, Piety 25+

In your time studying the Art and deepening your faith in Mystra, the Lady of Mysteries has granted you the capacity to wield her silver fire and channel the raw magic of the Weave itself. You can take a Magic action to create magical, heatless silver fire to erupt and surround you. This silver fire lasts until you have the Incapacitated condition, you take a Magic action to quench it, or all of its charges are expended. While surrounded in silver fire, you have Truesight out to a range of 30 feet and you have one of the following benefits of your choice:
- You can breathe underwater.
- You can survive without food and water.
- You are immune to magic that would ascertain your alignment, creature type, thoughts, or truthfulness.
- You have Resistance to Cold damage and are unharmed by temperatures of 0 degrees Fahrenheit or lower.

This silver fire has 6 charges and regains all expended charges when you take the Magic action to create it again. You can expend 1 or more charges from the silver fire to cast one of the following spells from it without expending a spell slot and requiring no Material components: Cure Wounds (1 charge) or Revivify (2 charges). The ability score you chose is your spellcasting ability for these spells. You can additionally take a Magic action to expend 3 charges from the silver fire to create your choice of either a 60-foot Line of silver fire that is 5 feet wide or a 30-foot Cone of silver fire. Each creature in the area must make a Dexterity saving throw, with the DC equal to 8 + your Proficiency Bonus + the ability score modifier for the ability score you chose. A target takes 4d12 Fire damage on a failed save, or half as much on a successful one. Objects not worn or carried in the area take this damage automatically.

Once you take the Magic action to create silver fire in this way, you can''t do so again until you finish a Long Rest.

Champion of Mystra
Level 17+, Piety 50+

Your dedication to the Art and furtherance of the ideals of the Mother of All Magic have been repaid with a measure of her subtlety and resilience. You can increase your Intelligence or Constitution score by 2 and also increase your maximum for that score by 2. In addition, whenever you die, you can choose to surrender yourself to the flow of magic and join the Weave itself. If you choose to join the Weave in this way, your body along with everything nonmagical you are wearing and carrying vanish as your spirit merges with the Weave and you become a Weaveghost. You are immediately retired as an NPC under the DM''s control and refuse any attempt to be revived to life.', 'This homebrew Supernatural Gift was created by leal4', 1720.0),
('5bb35a02-909a-50de-bbd5-ce0704492ce9', 'REW_0173', 'Devout of the Raven Queen (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_PLUS'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T1+', ARRAY['HHB']::text[], 'Supernatural Gift, T1+ (can only be used by a follower of the Raven Queen)

Your dedication to Raven Queen has not gone unnoticed, with the Raven Queen granting you her blessing commensurate with the devotion you demonstrate through your actions. When you gain this Supernatural Gift, your Piety score with respect to the Raven Queen is 1 unless it is already higher than 1. 

See Chapter 2 of the Mythic Odysseys of Theros for rules on how this score works (ignore the guidance regarding changing gods). As a guideline and as determined by the DM, you can expect your Piety to increase by 1 during most sessions of play where you are following the Raven Queen''s tenets as determined by the DM, and a single deed typically changes your Piety score by only 1 point in either direction unless the action is very significant as determined by the DM. Regardless, any increase or decrease to Piety (if any) is wholly determined by the DM.

You increase your Piety score to the Raven Queen through acts such as these during an adventure (even while this Supernatural Gift is inactive):
- Aiding followers of the Raven Queen, such as her death giant or shadar-kai servitors, with a task they are carrying out on her behalf.
- Defeating servants of Orcus or Vecna.
- Retrieving a memory, especially those touched by sorrow or tragedy, in the form of an important trinket, a memory extracted from a person, or a soul in order to deliver it to the Raven Queen or one of her faithful servants.
- Willingly undertake a trial of the Raven Queen within the Fortress of Memories.
- Retrieving sediment from the River Styx to return to the Raven Queen directly or conveyed through one of her faithful.
- Receiving and carrying out a quest delivered by a raven sent by the Raven Queen.
- Helping lay the tortured dead to rest and ensuring that their soul and memories can be conducted to the Raven Queen.

Your Piety score to the Raven Queen decreases if you diminish the Raven Queen''s influence in the world, contradict her ideals, or let her down through acts such as these during an adventure (even while this Supernatural Gift is inactive):
- Aiding the cause of Orcus or Vecna.
- Fighting and slaying other servants of the Raven Queen, such as her death giant or shadar-kai servitors, while they are carrying out a task on her behalf.
- Destroying or desecrating sites dedicated to the Raven Queen.
- Slaying a raven sent by the Raven Queen out of the Shadowfell.
- Destroying key memories that could have been collected by the Raven Queen, such as important objects laden with history or erasing the memories of others.
- Preventing a soul''s passage to the Raven Queen for an unnatural length of time, such as raising and maintaining ensouled undead.

When you select this Supernatural Gift to be active when finishing a Long Rest, choose one of the following ability scores: Intelligence, Wisdom, or Charisma. While this Supernatural Gift is active, you gain the following benefits if you meet the associated level prerequisite and meet the associated Piety threshold.

The Raven Queen''s Devotee 
Level 1+, Piety 3+

For your fealty to her, the Raven Queen has granted you one of her favored messengers as your constant companion and guide. You can cast the Find Familiar spell without expending a spell slot and requiring no Material components, which always takes the form of a Raven when cast in this way. If this familiar is ever slain by a creature, you add an additional 1d6 Necrotic damage to your damage rolls against the killer for 1 hour. You can''t cast this spell in this way again until you finish a Short or Long Rest. The ability score you chose is your spellcasting ability for this spell. 

The Raven Queen''s Votary 
Level 5+, Piety 10+

For your continued service to the Raven Queen, you have been granted her blessing to slip into shadow and mist. You can cast the Misty Step spell without expending a spell slot and requiring no Material components. You can cast this spell a number of times equal to the ability score modifier for the ability score you chose (minimum of once), and you regain all expended uses when you finish a Long Rest. The ability score you chose is your spellcasting ability for this spell.

The Raven Queen''s Disciple 
Level 11+, Piety 25+

Your dedication to the Raven Queen has inured you against the worst effects of the plane she inhabits and prepared you to face her foes. You have Resistance to Necrotic damage and are immune to the effects of Shadowfell Despair. Additionally, you and friendly creatures within 10 feet of yourself have Advantage on death saving throws.

Champion of the Raven Queen 
Level 17+, Piety 50+

Your devotion to the cause of the Raven Queen has been repaid with a measure of her enigmatic insight and will. You can increase your Wisdom or Charisma score by 2 and also increase your maximum for that score by 2.

In addition, whenever you die, you can choose to allow the Raven Queen to immediately claim your soul back to her domain. If you choose to allow the Raven Queen to claim your soul in this way, your body vanishes but anything you were wearing or carrying is left behind. You gain a new body in 24 hours in the Raven Queen''s domain in the Shadowfell, reviving with all of your Hit Points.', 'This homebrew Supernatural Gift was created by magurotoria and mark.stac', 1730.0),
('e0b87086-ea8f-5c01-b843-f267c4e5018d', 'REW_0174', 'Devout of Selûne (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_PLUS'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T1+', ARRAY['HHB']::text[], 'Supernatural Gift, T1+ (can only be used by a follower of Selûne)

Your dedication to Selûne has not gone unnoticed, with the Moonmaiden granting you her blessing commensurate with the devotion you demonstrate through your actions. When you gain this Supernatural Gift, your Piety score with respect to Selûne is 1 unless it is already higher than 1. 

See Chapter 2 of the Mythic Odysseys of Theros for rules on how this score works (ignore the guidance regarding changing gods). As a guideline and as determined by the DM, you can expect your Piety to increase by 1 during most sessions of play where you are following Selûne''s tenets as determined by the DM, and a single deed typically changes your Piety score by only 1 point in either direction unless the action is very significant as determined by the DM. Regardless, any increase or decrease to Piety (if any) is wholly determined by the DM.

You increase your Piety score to Selûne through acts such as these during an adventure (even while this Supernatural Gift is inactive):
- Defeating servants of Shar
- Defending worshippers of Selûne and her sites of importance
- Cure the curse of Lycanthropy for an afflicted.
- Cure a madness for an afflicted.
- Participate in the Mystery of the Night

Your Piety score to Selûne decreases if you diminish Selûne''s influence in the world, contradict her ideals, or let her down through acts such as these during an adventure (even while this Supernatural Gift is inactive):
- Betraying one''s faith to commit acts of corruption or pain.
- Willfully causing harm and misery to creatures of Good alignment.
- Spreading madness and Lycanthropy.
- Using the Shadow Weave.

When you select this Supernatural Gift to be active when finishing a Long Rest, choose one of the following ability scores: Intelligence, Wisdom, or Charisma. While this Supernatural Gift is active, you gain the following benefits if you meet the associated level prerequisite and meet the associated Piety threshold.

Selûne''s Devotee 
Level 1+, Piety 3+

The Moonmaiden has blessed your eyes to pierce through the shadows. You have Darkvision out to 60 feet. If you already have Darkvision, you increase its range by 30 feet.

Selûne''s Votary 
Level 5+, Piety 10+

You can call down the Moonmaiden''s light to sear your foes. You can cast the Moonbeam spell without expending a spell slot and requiring no Material components. You can cast this spell a number of times equal to the ability score modifier for the ability score you chose (minimum of once), and you regain all expended uses when you finish a Long Rest. The ability score you chose is your spellcasting ability for this spell.

Selûne''s Disciple 
Level 11+, Piety 25+

The Moonmaiden has gifted you her Moonfire to wield. Whenever you cast a spell that deals Fire damage, you can choose to change its damage type to Radiant damage.

Additionally, you can cast the Flame Strike spell without expending a spell slot and requiring no Material components. You can''t cast this spell in this way again until you finish a Short or Long Rest. The ability score you chose is your spellcasting ability for this spell.

Champion of Selûne 
Level 17+, Piety 50+

The Moonmaiden has repaid your sincere devotion to her by embracing you into the deeper mysteries of the night. You add an additional 1d8 Radiant damage to your damage rolls. 

Additionally, you can use a Bonus Action to cast the Greater Restoration spell without expending a spell slot and requiring no Material components. You can cast this spell a number of times equal to the ability score modifier for the ability score you chose (minimum of once), and you regain all expended uses when you finish a Long Rest. The ability score you chose is your spellcasting ability for this spell.', 'This homebrew Supernatural Gift was created by greensprout', 1740.0),
('0c92ebf7-73d4-561a-8292-24b6bedee234', 'REW_0175', 'Devout of Umberlee (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_PLUS'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T1+', ARRAY['HHB']::text[], 'Supernatural Gift, T1+ (can only be used by a follower of Umberlee)

Your dedication to Umberlee has not gone unnoticed, with the Bitch Queen granting you her blessing commensurate with the devotion you demonstrate through your actions. When you gain this Supernatural Gift, your Piety score with respect to Umberlee is 1 unless it is already higher than 1.

See Chapter 2 of the Mythic Odysseys of Theros for rules on how this score works (ignore the guidance regarding changing gods). As a guideline and as determined by the DM, you can expect your Piety to increase by 1 during most sessions of play where you are following Umberlee''s tenets as determined by the DM, and a single deed typically changes your Piety score by only 1 point in either direction unless the action is very significant as determined by the DM. Regardless, any increase or decrease to Piety (if any) is wholly determined by the DM.

You increase your Piety score to Umberlee through acts such as these during an adventure (even while this Supernatural Gift is inactive):
- Ensuring that sailors and other travelers pay tribute and make offerings to Umberlee before setting to and while at sea
- Openly preaching and warning of the wrath of the Queen of the Depths in coastal cities and ports
- Providing protection and safe passage for a ship traveling at sea whose crew and passengers have shown the proper respect and made the proper tributes to the Bitch Queen
- Performing the ritual of the Drowning to induct a new supplicant fully into the faith of the Wavemother
- Striking down and slaying any who fail to show the proper respect for Umberlee
- Rooting out and slaying any who have turned their back on and betrayed the Queen of the Depths

Your Piety score to Umberlee decreases if you diminish Umberlee''s influence in the world, contradict her ideals, or let her down through acts such as these during an adventure (even while this Supernatural Gift is inactive):
- Invoking the name and favor of another divine being besides Umberlee before setting out to and while at sea or allowing others to do the same
- Failing to pay tribute to the Wavemother before setting out to and while at sea or allowing others to do the same
- Allowing trespasses and harm done to Umberlee''s holy sites or followers to go unanswered
- Providing aid or shelter to those out at sea that have either disrespected or failed to show respect or pay tribute to the Queen of the Depths

When you select this Supernatural Gift to be active when finishing a Long Rest, choose one of the following ability scores: Intelligence, Wisdom, or Charisma. While this Supernatural Gift is active, you gain the following benefits if you meet the associated level prerequisite and meet the associated Piety threshold.

Umberlee''s Devotee
Level 1+, Piety 3+

Your dedication to the Wavemother allows you to keep your footing even in the harshest storm. When you make a Strength or Dexterity saving throw to avoid the Prone condition, you can give yourself Advantage on the saving throw. You can use this trait a number of times equal to the ability score modifier for the ability score you chose (minimum of once). You regain all expended uses when you finish a Long Rest.

Umberlee''s Votary
Level 5+, Piety 10+

The Queen of the Depths has taken notice of your dedication to her and has gifted you with the capacity to unleash her wrath. You can cast the Sleet Storm spell without expending a spell slot and requiring no Material components. You can''t cast this spell in this way again until you finish a Long Rest. The ability score you chose is your spellcasting ability for this spell.

Umberlee''s Disciple
Level 11+, Piety 25+

Your fervent faith in the Bitch Queen allows to channel the devastation of the sea itself. When you deal Cold or Lightning damage, you can change that damage type to the other listed type.

Champion of Umberlee
Level 17+, Piety 50+

You''ve fully entered into the embrace of the Wavemother as a living emissary of her wrath and will. You can increase your Constitution or Charisma score by 2 and also increase your maximum for that score by 2.', 'This homebrew Supernatural Gift was created by magurotoria', 1750.0),
('ef62dfdf-2379-5b4c-8412-620bc0cf0033', 'REW_0176', 'Devout of Tethrin Veraldé (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_PLUS'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T1+', ARRAY['HHB']::text[], 'Supernatural Gift, T1+ (can only be used by a follower of Tethrin Veraldé)

Your dedication to Tethrin Veraldé has not gone unnoticed, with the Master of Blades granting you his blessing commensurate with the devotion you demonstrate through your actions. When you gain this Supernatural Gift, your Piety score with respect to Tethrin Veraldé is 1 unless it is already higher than 1.

See Chapter 2 of the Mythic Odysseys of Theros for rules on how this score works (ignore the guidance regarding changing gods). As a guideline and as determined by the DM, you can expect your Piety to increase by 1 during most sessions of play where you are following Tethrin Veraldé''s tenets as determined by the DM, and a single deed typically changes your Piety score by only 1 point in either direction unless the action is very significant as determined by the DM. Regardless, any increase or decrease to Piety (if any) is wholly determined by the DM.

You increase your Piety score to Tethrin Veraldé through acts such as these during an adventure (even while this Supernatural Gift is inactive):
- Partaking in the holy day and ceremony of Tethrin''s Match and displaying your dedication and skill with the blade and magic.
- Defeating servants of the evil deities of the Dark Seldarine, especially of Lolth.
- Defeating servants of evil deities of war, especially followers of Selvetarm and Hextor.
- Aiding followers of the Seldarine, especially servants of Corellon Larethian, Sehanine Moonbow, Kirith Sotheril, and fellow followers of Tethrin Veraldé.
- Aiding servants of good deities of war, especially of Heironeous.
- Defeating a skilled foe in single combat.
- Achieving a great victory through a heroic and prodigious display of one''s skill with a blade and magic.
- Undertaking a quest to aid elven society, especially to recover lost relics or locations key to elven culture and history or to eliminate a threat to elven society.

Your Piety score to Tethrin Veraldé decreases if you diminish Tethrin Veraldé''s influence in the world, contradict his ideals, or let him down through acts such as these during an adventure (even while this Supernatural Gift is inactive):
- Aiding the cause of the evil deities of Dark Seldarine and their followers, especially of Lolth.
- Aiding the cause of evil deities of war and their followers, especially of Selvetarm and Hextor.
- Harming the church of the Seldarine and its followers, especially of Corellon Larethian, Sehanine Moonbow, Kirith Sotheril, and Tethrin Veraldé.
- Destroying or desecrating relics and sites important to elven culture and history.
- Seeking to harm elven society and aid enemies of elves.
- Displaying cowardice in conflict.
- Defeating an honorable foe through deceit rather than skill with blades and magic.

When you select this Supernatural Gift to be active when finishing a Long Rest, choose one of the following ability scores: Intelligence, Wisdom, or Charisma. While this Supernatural Gift is active, you gain the following benefits if you meet the associated level prerequisite and meet the associated Piety threshold.

Tethrin Veraldé''s Devotee
Level 1+, Piety 3+

The Master of Blades guides your steps, showing you the dance of victory. You can cast the Zephyr Strike spell without expending a spell slot and requiring no Material components. You can cast this spell a number of times equal to the ability score modifier for the ability score you chose (minimum of once), and you regain all expended uses when you finish a Long Rest. The ability score you chose is your spellcasting ability for this spell. 

Tethrin Veraldé''s Votary
Level 5+, Piety 10+

Your life is a lesson taught by the Master of Blades, weaving blade and spell. You can take a Bonus Action to cast the Mirror Image spell without expending a spell slot and requiring no Material components. You can''t cast this spell in this way again until you finish a Long Rest. The ability score you chose is your spellcasting ability for this spell. 

In addition, when you cast the Zephyr Strike spell, the spell does not require Concentration. You can''t have more than one ongoing instance of the spell in this way at a time.

Tethrin Veraldé''s Disciple
Level 11+, Piety 25+

The Shining One guides your blade, his will scoring those who would stand against you. You can cast the Fount of Moonlight spell without expending a spell slot and requiring no Material components. You can''t cast this spell in this way again until you finish a Short or Long Rest. The ability score you chose is your spellcasting ability for this spell. 

Champion of Tethrin Veraldé
Level 17+, Piety 50+

Your devotion to the Shining One has granted you a measure of his power and grace. You can increase your Dexterity or Intelligence score by 2 and also increase your maximum for that score by 2.', 'This homebrew Supernatural Gift was created by goosetipher and temmiechaoslight', 1760.0),
('a946a7ca-c63a-5cc2-8e34-1f4e3d54b3f9', 'REW_0177', 'Seeker of the Way (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_PLUS'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T1+', ARRAY['HHB']::text[], 'Supernatural Gift, T1+ (can only be used by a follower of the Way)

You are a Chung Tao, a follower of the Way, a faith practiced in the land of Kara-Tur that emphasizes the interconnectedness of the cosmos, finding one''s place within it, and acting in accordance with the natural order of the universe. According to your faith, all things and all beings are connected to one another by the forces of the universe, with differentiation between good and evil and law and chaos as merely labels imposed onto an otherwise indivisible and harmonious whole. 

Your dedication to the Tao has given you deeper insight into the world and yourself and has granted you the capacity to find your place in the universe commensurate with the dedication you demonstrate through belief and deed. When you gain this Supernatural Gift, your Piety score with respect to the Way is 1 unless it is already higher than 1.

See Chapter 2 of the Mythic Odysseys of Theros for rules on how this score works (ignore the guidance regarding changing gods). As a guideline and as determined by the DM, you can expect your Piety to increase by 1 during most sessions of play where you are following the tenets of the Way as determined by the DM, and a single deed typically changes your Piety score by only 1 point in either direction unless the action is very significant as determined by the DM. Regardless, any increase or decrease to Piety (if any) is wholly determined by the DM.

You increase your Piety score to the Way through concrete acts such as these during an adventure (even while this Supernatural Gift is inactive):
- Choosing to deescalate a violent conflict peacefully when you have the option to.
- Mediating and negotiating a significant dispute without favoring one side over the other.
- Refusing to respond to provocation and maintaining discipline.
- Restoring the natural balance of an area that has become corrupted or harmed by conscious intervention.
- Providing significant aid with no demand or expectation of reward.
- Freely giving up material possessions to someone in need.
- Providing meaningful counseling and guidance without coercing or forcing a course of action.
- Meditating on the Way as part of a pilgrimage or at a sacred site.

Your Piety score to the Way decreases if you diminish the influence of the Way in the world, contract its ideals, or act against its tenets through acts such as these during an adventure (even while this Supernatural Gift is inactive):
- Deliberately choosing a violent course of action over available peaceful options.
- Abandoning an individual in need out of self-gain or convenience.
- Allowing yourself to become provoked and responding with anger and rashness.
- Defiling places of nature or sacred sites and deliberately corrupting the natural balance in an area.
- Committing an act of revenge or borne out of spite or a grudge.
- Displaying spite or a lack of empathy for others, including a fallen enemy.
- Showing a lack of self control and acting out of anger, pride, or spite.
- Hoarding material wealth and acting out of greed or for the sake of a reward.

When you select this Supernatural Gift to be active when finishing a Long Rest, choose one of the following ability scores: Intelligence, Wisdom, or Charisma. While this Supernatural Gift is active, you gain the following benefits if you meet the associated level prerequisite and meet the associated Piety threshold.

Strength in Stillness
Level 1+, Piety 3+
 
As a student of the Way, you have learned to still and calm your mind, allowing you to retain self-control even in moments of stress and great peril or to guide others to the same. 

You can cast the Heroism spell without expending a spell slot and requiring no Material components. You can cast this spell a number of times equal to the ability score modifier for the ability score you chose (minimum of once), and you regain all expended uses when you finish a Long Rest. The ability score you chose is your spellcasting ability for this spell. 
 
Ten Thousand Things, One Flow
Level 5+, Piety 10+
 
Through your meditation upon the Way, you''ve partly pierced through the illusion of distinction and no longer regard yourself as something separate from the flow of the universe.

During your turn if you haven''t moved and aren''t Incapacitated, you can choose to take a meditative stance until the start of your next turn. While you are in this stance, your Speed is 0 and can''t increase, your reach increases by 5 feet, and you treat any creature or object within your reach as being within 5 feet.

Action through Inaction
Level 11+, Piety 25+

Further study of the Way has allowed you to further improve your capacity to behave with effortless action and align yourself with the natural order of the world. 

If you end your turn without having moved, attack rolls against you have Disadvantage until the start of your next turn. This effect ends early if you move, teleport, have the Grappled, Incapacitated, Prone, or Restrained condition, or if something moves you without using your movement, action, Bonus Action, or Reaction. 

The Self Fades, The Way Remains
Level 17+, Piety 50+

Your tireless dedication to the Way has allowed you to open yourself fully to the yin and yang and ebb and flow of the natural forces of the world and to make yourself a part of its whole.

You can increase your Constitution or Wisdom score by 2 and also increase your maximum for that score by 2. In addition, whenever you die, you can choose to surrender yourself fully to the Way and join the natural order you revere. If you choose to join the natural order in this way, your body along with everything nonmagical you are wearing and carrying vanish as your spirit merges with the multiverse. You are immediately retired as an NPC under the DM''s control and refuse any attempt to be revived to life.', 'This homebrew Supernatural Gift was created by naoe45', 1770.0),
('47c374d6-bf52-538c-8d18-7b1b964c5faf', 'REW_0178', 'Devout of Tiamat (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_PLUS'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T1+', ARRAY['HHB']::text[], 'Supernatural Gift, T1+ (can only be used by a follower of Tiamat)

Your dedication to Tiamat has not gone unnoticed, with the Dragon Queen granting you her blessing commensurate with the devotion you demonstrate through your actions. When you gain this Supernatural Gift, your Piety score with respect to Tiamat is 1 unless it is already higher than 1.

See Chapter 2 of the Mythic Odysseys of Theros for rules on how this score works (ignore the guidance regarding changing gods). As a guideline and as determined by the DM, you can expect your Piety to increase by 1 during most sessions of play where you are following Tiamat''s tenets as determined by the DM, and a single deed typically changes your Piety score by only 1 point in either direction unless the action is very significant as determined by the DM. Regardless, any increase or decrease to Piety (if any) is wholly determined by the DM.

You increase your Piety score to Tiamat through acts such as these during an adventure (even while this Supernatural Gift is inactive):
- Defeating enemies of Tiamat, such as metallic dragons or servants of deities other than Tiamat, especially of Bahamut, Bane, Gilgeam, and Ilmater.
- Desecrating holy sites dedicated to deities other than Tiamat, especially of Bahamut, Bane, Gilgeam, and Ilmater.
- Aiding the Cult of the Dragon and other followers of Tiamat in their goals in achieving the ascendance of Tiamat and chromatic dragons.
- Acting out of avarice and greed and especially by force, such claiming a hoard of treasure for yourself.
- Taking retribution and vengeance against those you believe to have slighted or wronged you.
- Participating in holy ceremonies dedicated to Tiamat, such as the Rite of Respect before a chromatic dragon or a pilgrimage to the Monument of Tiamat in Avernus.

Your Piety score to Tiamat decreases if you diminish Tiamat''s influence in the world, contradict her ideals, or let him down through acts such as these during an adventure (even while this Supernatural Gift is inactive):
- Aiding the cause of enemies of Tiamat, such as metallic dragons or servants of Bahamut, Bane, Gilgeam, and Ilmater.
- Showing respect or reverence for deities other than Tiamat, especially of Bahamut, Bane, Gilgeam, or Ilmater.
- Attacking followers of Tiamat engaged in a task in her name, such as abishai or elements of the Cult of the Dragon.
- Acting out of mercy, compassion, or forgiveness, such as forgiving someone who has wronged you.
- Sharing your wealth with others, such as through acts of charity
.
When you select this Supernatural Gift to be active when finishing a Long Rest, choose one of the following ability scores: Intelligence, Wisdom, or Charisma. While this Supernatural Gift is active, you gain the following benefits if you meet the associated level prerequisite and meet the associated Piety threshold.

Tiamat''s Devotee
Level 1+, Piety 3+

Tiamat has granted you the ability to call upon her destructive power. You can cast the Chromatic Orb spell without expending a spell slot and requiring no Material components. You can cast this spell a number of times equal to the ability score modifier for the ability score you chose (minimum of once), and you regain all expended uses when you finish a Long Rest. The ability score you chose is your spellcasting ability for this spell. 

Tiamat''s Votary
Level 5+, Piety 10+

The Dragon Queen has taught you to sow fear in your enemies as she spreads it among hers. You can cast the Fear spell without expending a spell slot and requiring no Material components. You can''t cast this spell in this way again until you finish a Long Rest. The ability score you chose is your spellcasting ability for this spell. 

Immediately after casting this spell in this way, you can take a Bonus Action to unleash a draconic cry of dread. Until the end of your next turn, you and your allies have Advantage on attack rolls against any enemies under the effect of the Fear spell as cast in this way.

Tiamat''s Disciple
Level 11+, Piety 25+

Through continued dedication and sacrifice to Tiamat, you have gained the capacity to manifest some of the power of her five heads. You can take a Bonus Action to magically create five spectral draconic heads that hover near your shoulders for 1 minute. The heads vanish early if you have the Incapacitated condition, die, or all heads are no longer present. Each dragon head appears as the head of a chromatic dragon with corresponding damage types: Black (Acid), White (Cold), Red (Fire), Blue (Lightning), and Green (Poison). While the heads are present, you gain the following benefits:
- You have Resistance to the corresponding damage type of any head that is present.
- Once per turn when you take the Attack action, you can replace one of the attacks to cause one head of your choice that is present to release draconic energy in a 30-foot Cone. Each creature in that area must make a Dexterity saving throw, with the DC equal to 8 + your Proficiency Bonus + the ability score modifier for the ability score you chose. On a failed save, a creature takes 4d6 damage of the corresponding damage type. On a successful save, a creature takes half as much damage. The head then vanishes and is no longer present.

You can''t take this Bonus Action again until you finish a Long Rest.

Champion of Tiamat
Level 17+, Piety 50+

The Dragon Queen has repaid your steadfast sacrifice and veneration in her name and cause with a measure of her strength and presence. You can increase your Strength or Charisma score by 2 and also increase your maximum for that score by 2.', 'This homebrew Supernatural Gift was created by salemalvian', 1780.0),
('b383aab1-faac-576a-b741-60becbecf06b', 'REW_0179', 'Devout of Torm (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_PLUS'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T1+', ARRAY['HHB']::text[], 'Supernatural Gift, T1+ (can only be used by a follower of Torm)

Your dedication to Torm has not gone unnoticed, with the Loyal Fury granting you his blessing commensurate with the devotion you demonstrate through your actions. When you gain this Supernatural Gift, your Piety score with respect to Torm is 1 unless it is already higher than 1.

See Chapter 2 of the Mythic Odysseys of Theros for rules on how this score works (ignore the guidance regarding changing gods). As a guideline and as determined by the DM, you can expect your Piety to increase by 1 during most sessions of play where you are following Torm''s tenets as determined by the DM, and a single deed typically changes your Piety score by only 1 point in either direction unless the action is very significant as determined by the DM. Regardless, any increase or decrease to Piety (if any) is wholly determined by the DM.

You increase your Piety score to Torm through acts such as these during an adventure (even while this Supernatural Gift is inactive):
- Opposing and defeating followers of deities of strife, especially those of Bane, Bhaal, Cyric, and Shar.
- Aiding followers of Amaunator, Bahamut, Helm, Ilmater, Lathander, the Red Knight, and Tyr, as well as fellow followers of Torm.
- Participating in holy ceremonies dedicated to Torm, such as the annual ceremonies of the Divine Death and the True Resurrection.
- Exposing and working against corruption and injustice, such as bringing a corrupt magistrate to justice or working to reform unjust laws.
- Discovering and putting a swift end to acts of high treachery.
- Upholding your duty in fulfilling acts of service for the good of others, even at personal cost or sacrifice.

Your Piety score to Torm decreases if you diminish Torm''s influence in the world, contradict his ideals, or let him down through acts such as these during an adventure (even while this Supernatural Gift is inactive):
- Aiding the cause of deities of strife, especially that of Bane, Bhaal, Cyric, and Shar.
- Attacking followers of Torm or followers of faiths friendly with that of Torm''s.
- Desecrating holy sites dedicated to Torm or to faiths friendly with that of Torm''s.
- Neglecting and forsaking your duty, such as ignoring and disobeying honorable and just orders given by your superior.
- Acting out of self-righteousness than out of a true sense of discernment and justice, such as assaulting an arrested criminal.
- Being aware of and failing to expose acts of corruption and treachery or engaging in such acts yourself.

When you select this Supernatural Gift to be active when finishing a Long Rest, choose one of the following ability scores: Intelligence, Wisdom, or Charisma. While this Supernatural Gift is active, you gain the following benefits if you meet the associated level prerequisite and meet the associated Piety threshold.

Torm''s Devotee
Level 1+, Piety 3+

As one inducted into the faith of Torm the True, you can manifest a measure of his courage and sense of duty. You can cast the Heroism spell without expending a spell slot and requiring no Material components. You can cast this spell a number of times equal to the ability score modifier for the ability score you chose (minimum of once), and you regain all expended uses when you finish a Long Rest. The ability score you chose is your spellcasting ability for this spell.

Torm''s Votary
Level 5+, Piety 10+

Your devotion to the Loyal Fury has been repaid with a capacity to bring a swift end to enemies of courage and justice. You can cast the Blinding Smite spell without expending a spell slot and requiring no Material Components. You can''t cast this spell in this way again until you finish a Short or Long Rest. The ability score you chose is your spellcasting ability for this spell.

In addition, when you cast the Heroism spell targeting a creature other than yourself, the spell does not require Concentration. You can''t have more than one ongoing instance of the spell in this way at a time.

Torm''s Disciple
Level 11+, Piety 25+

The Loyal Fury allows you to muster his fallen faithful to your aid, dutiful beyond even death. You can cast the Spirit Guardians spell (level 5 version) without expending a spell slot and requiring no Material components. The damage dealt by the spell when cast in this way is always Radiant damage. You can''t cast this spell in this way again until you finish a Long Rest. The ability score you chose is your spellcasting ability for this spell.

Champion of Torm
Level 17+, Piety 50+

For your tireless loyalty to Torm the True and his cause, you have been granted a measure of the Loyal Fury''s strength and courage. You can increase your Strength or Charisma score by 2 and also increase your maximum for that score by 2.', 'This homebrew Supernatural Gift was created by baba8forever, goosetipher, and velocirabbit_', 1790.0),
('d0f24a70-a263-5b7b-a077-721afa010350', 'REW_0180', 'Letter of Recommendation', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Mark of Prestige', false, NULL, 'T0', ARRAY['DMG2014']::text[], 'A letter of recommendation provided by an NPC as part of an adventure. See book for description.', NULL, 1800.0),
('7f2d607f-ff20-56ba-9e04-1a7c0f502609', 'REW_0181', 'Medal', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Mark of Prestige', false, NULL, 'T0', ARRAY['DMG2014']::text[], 'A medal awarded by an NPC as part of an adventure. See book for description.', NULL, 1810.0),
('2546e883-3a6d-52d4-aa6f-35ca26b5c30c', 'REW_0182', 'Parcel of Land', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Mark of Prestige', false, NULL, 'T0', ARRAY['DMG2014']::text[], 'A parcel of land either claimed or granted as part of an adventure. See book for description.', 'A parcel of land that is claimed in a world location as part of an adventure as determined by the DM can be used to build a Bastion as described in Appendix B of the Player Guidelines.', 1820.0),
('94979014-0297-510c-a3fe-d512f8559c9a', 'REW_0183', 'Special Favor', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Mark of Prestige', false, NULL, 'T0', ARRAY['DMG2014']::text[], 'A special favor awarded by an NPC as part of an adventure. See book for description.', NULL, 1830.0),
('39781dca-ffcf-5235-9cbe-dc6a80777acc', 'REW_0184', 'Special Right', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Mark of Prestige', false, NULL, 'T0', ARRAY['DMG2014']::text[], 'A special right, often detailed in a document, awarded by an NPC as part of an adventure. See book for description.', NULL, 1840.0),
('abd1d8f2-59b7-58f5-b75d-99c97738169b', 'REW_0185', 'Stronghold', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Mark of Prestige', false, NULL, 'T0', ARRAY['DMG2014']::text[], 'A stronghold either claimed or granted as part of an adventure. See book for description.', '- Known as "Fortifications" in the 2024 Dungeon Master''s Guide.
- A stronghold awarded to one or more characters is assumed to be able to cover its own maintenance costs each month and does not require a character to pay for it.
- A stronghold that is claimed in a world location as part of an adventure as determined by the DM can be used to build a Bastion as described in Appendix B of the Player Guidelines.
- Strongholds can also be constructed as described by the Building a Stronghold downtime activity.', 1850.0),
('c75ba28d-b30e-5869-bc29-c0d5fc32bee9', 'REW_0186', 'Title', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Mark of Prestige', false, NULL, 'T0', ARRAY['DMG2014']::text[], 'A title awarded by an NPC as part of an adventure. See book for description.', '- As written, a title can sometimes come with a right to a parcel of land or stronghold.
- As written, a title conveyed by an archfey or another otherworldly being may also come with an associated Supernatural Reward. This reward uses the normal rules for distributing such awards.', 1860.0),
('04f67543-7872-51e1-928c-0d263822919e', 'REW_0187', 'Any Mount in Equipment except Gadabout', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Mount', false, NULL, 'T1 Select', ARRAY[]::text[], 'Mount. See book for description.', NULL, 1870.0),
('40f2ee0b-9bcb-512d-b7e7-9e7e1650db48', 'REW_0188', 'Ankheg', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Mount', false, NULL, 'T1 Select', ARRAY['MM2014']::text[], 'Mount. See book for description.', NULL, 1880.0),
('e6282fbc-8093-5230-807c-745f926c0270', 'REW_0189', 'Aurochs', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Mount', false, NULL, 'T1 Select', ARRAY['VGM']::text[], 'Mount. See book for description.', NULL, 1890.0),
('61ac0a1f-1a49-5c82-901c-e823dce74348', 'REW_0190', 'Black Bear', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Mount', false, NULL, 'T1 Select', ARRAY['MM2014']::text[], 'Mount. See book for description.', NULL, 1900.0),
('f9598d49-eae3-5572-80ca-ac6c5e1ebba5', 'REW_0191', 'Blink Dog', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Mount', false, NULL, 'T1 Select', ARRAY['MM2014']::text[], 'Mount. See book for description.', 'This mount is sapient.', 1910.0),
('b7664254-69be-5726-8348-1c232d77a71c', 'REW_0192', 'Brown Bear', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Mount', false, NULL, 'T1 Select', ARRAY['MM2014']::text[], 'Mount. See book for description.', NULL, 1920.0),
('d75470a6-c28a-5b4f-8940-e10f91b4cc2b', 'REW_0193', 'Clawfoot', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Mount', false, NULL, 'T1 Select', ARRAY['ERLW']::text[], 'Mount. See book for description.', NULL, 1930.0),
('c5370dbe-7b6b-582c-8005-4803b5c30c0b', 'REW_0194', 'Dire Wolf', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Mount', false, NULL, 'T1 Select', ARRAY['MM2014']::text[], 'Mount. See book for description.', NULL, 1940.0),
('07c0997b-ff4d-51da-b1a7-32d08265af62', 'REW_0195', 'Elk', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Mount', false, NULL, 'T1 Select', ARRAY['MM2014']::text[], 'Mount. See book for description.', NULL, 1950.0),
('3009d881-1c38-5550-9029-832c45ff7232', 'REW_0196', 'Fastieth', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Mount', false, NULL, 'T1 Select', ARRAY['ERLW']::text[], 'Mount. See book for description.', NULL, 1960.0),
('ca3f7600-d6d3-5ce7-a532-fb30ca305dc8', 'REW_0197', 'Giant Sea Horse', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Mount', false, NULL, 'T1 Select', ARRAY['MM2014']::text[], 'Mount. See book for description.', NULL, 1970.0),
('31ac4b86-0cea-533f-9a82-5a1e89566408', 'REW_0198', 'Giant Scorpion', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Mount', false, NULL, 'T1 Select', ARRAY['MM2014']::text[], 'Mount. See book for description.', NULL, 1980.0),
('af377d70-e8d7-5555-af14-8e4175eb90f3', 'REW_0199', 'Giant Space Hamster', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Mount', false, NULL, 'T1 Select', ARRAY['BAM']::text[], 'Mount. See book for description.', NULL, 1990.0),
('0c70f595-a065-5d54-98aa-bf390946554a', 'REW_0200', 'Giant Strider', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Mount', false, NULL, 'T1 Select', ARRAY['VGM']::text[], 'Mount. See book for description.', NULL, 2000.0),
('e8000fa6-def2-5436-8c11-0a9b9c82757b', 'REW_0201', 'Guard Drake (any)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Mount', false, NULL, 'T1 Select', ARRAY['VGM']::text[], 'Mount. See book for description.', NULL, 2010.0),
('4ca62e85-2400-5d1d-910f-7370c2ef21e2', 'REW_0202', 'Hippocamp', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Mount', false, NULL, 'T1 Select', ARRAY['MOT']::text[], 'Mount. See book for description.', NULL, 2020.0),
('37b861ac-4c8d-55b3-b31b-dc5cdcc7cecf', 'REW_0203', 'Lion', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Mount', false, NULL, 'T1 Select', ARRAY['MM2014']::text[], 'Mount. See book for description.', NULL, 2030.0),
('6b1269c7-168c-55de-9019-7c709a52cb64', 'REW_0204', 'Nimblewright Steed', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Mount', false, NULL, 'T1 Select', ARRAY['FRAIF']::text[], 'Mount. See book for description.', NULL, 2040.0),
('f5b0c5ff-e9ef-5ad8-9c5d-acb4cb06cbeb', 'REW_0205', 'Owlbear', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Mount', false, NULL, 'T1 Select', ARRAY['MM2014']::text[], 'Mount. See book for description.', NULL, 2050.0),
('e8c0763e-97d6-5c4b-bc91-6b31deef01e0', 'REW_0206', 'Polar Bear', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Mount', false, NULL, 'T1 Select', ARRAY['MM2014']::text[], 'Mount. See book for description.', NULL, 2060.0),
('6d756517-30c4-56be-963f-06150e66cd84', 'REW_0207', 'Space Swine', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Mount', false, NULL, 'T1 Select', ARRAY['BAM']::text[], 'Mount. See book for description.', NULL, 2070.0),
('2cc9b33c-3f96-5f77-b2cb-01434d3e379a', 'REW_0208', 'Valenar Steed', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Mount', false, NULL, 'T1 Select', ARRAY['ERLW']::text[], 'Mount. See book for description.', 'This mount is sapient.', 2080.0),
('748b6c07-16db-5955-8f5a-90185c691cd7', 'REW_0209', 'Winter Wolf', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Mount', false, NULL, 'T1 Select', ARRAY['MM2014']::text[], 'Mount. See book for description.', 'This mount is sapient.', 2090.0),
('9e8f5aa0-c435-558c-8377-c9cc212aaf50', 'REW_0210', 'Worg', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Mount', false, NULL, 'T1 Select', ARRAY['MM2014']::text[], 'Mount. See book for description.', 'This mount is sapient.', 2100.0),
('aca0a3c8-0b1d-534c-9da6-6c92d102ee5f', 'REW_0211', 'Displacer Beast', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Mount', false, NULL, 'T2 Select', ARRAY['MM2014']::text[], 'Mount. See book for description.', 'This mount is sapient.', 2110.0),
('ff7a8a27-49aa-5669-9f8e-e3d5c302726a', 'REW_0212', 'Gadabout', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Mount', false, NULL, 'T2 Select', ARRAY['MCV1_SC']::text[], 'Mount. See book for description.', 'Typically found in Wildspace', 2120.0),
('16988cb4-aad5-59e0-bfe3-275f229e7f9b', 'REW_0213', 'Hippogriff', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Mount', false, NULL, 'T2 Select', ARRAY['MM2014']::text[], 'Mount. See book for description.', NULL, 2130.0),
('277a10c4-f9a7-5c5f-8797-97d6806754b8', 'REW_0214', 'Dragonnel', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Mount', false, NULL, 'T3 Select', ARRAY['FTD']::text[], 'Mount. See book for description.', 'This mount is sapient.', 2140.0),
('377d86d3-90bc-5f9a-b607-4b4fbf366a58', 'REW_0215', 'Dragon Army Dragonnel', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Mount', false, NULL, 'T3 Select', ARRAY['DSotDQ']::text[], 'Mount. See book for description.', 'This mount is sapient.', 2150.0),
('9283718f-79ba-5672-9bb2-cea9454d1bb7', 'REW_0216', 'Wasteland Dragonnel', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Mount', false, NULL, 'T3 Select', ARRAY['DSotDQ']::text[], 'Mount. See book for description.', 'This mount is sapient.', 2160.0),
('0aebfe0f-42e3-5722-a59b-1729cc17eb75', 'REW_0217', 'Griffon', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Mount', false, NULL, 'T3 Select', ARRAY['MM2014']::text[], 'Mount. See book for description.', NULL, 2170.0),
('9ac06153-d44c-5344-a7b5-d55a6a6f9e98', 'REW_0218', 'Nightmare', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Mount', false, NULL, 'T3 Select', ARRAY['MM2014']::text[], 'Mount. See book for description.', 'This mount is sapient.', 2180.0),
('4bff76b0-7fb8-528b-bb1f-15fc53a6df53', 'REW_0219', 'Pegasus', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Mount', false, NULL, 'T3 Select', ARRAY['MM2014']::text[], 'Mount. See book for description.', 'This mount is sapient.', 2190.0),
('542502f5-60fb-5ab4-a3d9-30dc440a1e56', 'REW_0220', 'Peryton', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Mount', false, NULL, 'T3 Select', ARRAY['MM2014']::text[], 'Mount. See book for description.', 'This mount is sapient.', 2200.0),
('e0d39c6a-4c97-5da9-abb5-1e3cdb6e0c69', 'REW_0221', 'Skyjek Roc', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Mount', false, NULL, 'T3 Select', ARRAY['GGR']::text[], 'Mount. See book for description.', NULL, 2210.0),
('112712f5-3ee4-52d0-bd7e-e09cf249770d', 'REW_0222', 'Star Lancer', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Mount', false, NULL, 'T3 Select', ARRAY['MCV1_SC']::text[], 'Mount. See book for description.', '- This mount is sapient.
- Typically found in Wildspace', 2220.0),
('a5a1ca9f-cbbd-5cce-8479-fc50dd5a685a', 'REW_0223', 'Winged Bull', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Mount', false, NULL, 'T3 Select', ARRAY['MOT']::text[], 'Mount. See book for description.', 'This mount is sapient.', 2230.0),
('269c2161-395f-50c8-a7d2-63b21238f77f', 'REW_0224', 'Winged Lion', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Mount', false, NULL, 'T3 Select', ARRAY['MOT']::text[], 'Mount. See book for description.', 'This mount is sapient.', 2240.0),
('9dabbeac-97dc-5c84-b319-f1a9d01de12c', 'REW_0225', 'Catoblepas', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Mount', false, NULL, 'T4 Select', ARRAY['VGM']::text[], 'Mount. See book for description.', NULL, 2250.0),
('fa2a5342-8860-5100-b965-221983349e9e', 'REW_0226', 'Chimera', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Mount', false, NULL, 'T4 Select', ARRAY['MM2014']::text[], 'Mount. See book for description.', 'This mount is sapient.', 2260.0),
('e78bc964-8743-55e2-a4d8-abcddc1835b0', 'REW_0227', 'Unicorn', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Mount', false, NULL, 'T4 Select', ARRAY['MM2014']::text[], 'Mount. See book for description.', 'This mount is sapient.', 2270.0),
('717d34ce-61aa-5491-9a27-93fea8244322', 'REW_0228', 'Wyvern', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Mount', false, NULL, 'T4 Select', ARRAY['MM2014']::text[], 'Mount. See book for description.', NULL, 2280.0),
('2cfcf288-3f41-5f62-a37a-4f98a9bf9282', 'REW_0229', 'Pets listed in Equipment', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Pet', false, NULL, 'T0', ARRAY[]::text[], 'Pets as listed in Equipment', NULL, 2290.0),
('a0e7276c-e956-58a6-955c-a6a244764b17', 'REW_0230', 'Blink Dog', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Pet', false, NULL, 'T0', ARRAY['MM2014']::text[], 'Pet. See book for description.', 'This pet is sapient.', 2300.0),
('dd511a9e-b741-538f-8316-4ad6dd2ba468', 'REW_0231', 'Miniature Corvid Companion', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Pet', false, 'Exclusive Event', 'T0 (Exclusive Event)', ARRAY['HHB']::text[], 'Pet, T0

This small, orb-like black bird appeared after the Night of Black Knives, seeming to find attachment to you. The corvid companion has the statistics of a Raven and at your request, it can perch on your shoulder. While the corvid companion is perched on your shoulder, it is immune to all damage and all conditions and cannot be targeted by attacks, spells, or other effects. The corvid companion can learn and speak up to three messages of 25 words or less at a time, and it can replace one of these messages after it has spoken it with a new message.', '- This homebrew pet was created by magurotoria
- This homebrew pet was only obtainable as part of the 2025 Night of Black Knives event', 2310.0),
('72ce2292-1227-5b69-9484-fcc79aa54fd6', 'REW_0232', 'The Spirit of Joy', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Pet', false, 'Exclusive Event', 'T0 (Exclusive Event)', ARRAY['HHB']::text[], 'Pet, T0

For celebrating love, joy and authenticity during Lliira’s Festival of Joy, the Joybringer herself grants you a celestial companion made from her very own robes. 

The Spirit of Joy is a Chaotic Good creature. It loves to flit and play, though it can also be convinced to take happy, snuggly naps as well. 

It does not speak, and does not have a language of its own, but it can follow simple non-combat commands like, “Come here,” “Fetch,” “Play,” and “Sleep.” When left to its own devices, the patch on its chest constantly shifts with the colors of Lliira’s multi-colored robes.

Owners can use a magic action to speak the command word, “Spark joy!” and The Spirit of Joy will reflect any combination of colors you like. This pet cannot join in combat, and if struck, or commanded to fight, it will flee to the gardens of Brightwater forever.

When left to its own devices, the patch on its chest constantly shifts with the colors of Lliira’s multi-colored robes. It otherwise uses the statistics of Fluff Puffle.', '- This homebrew pet was created by melowyny
- This homebrew pet was only obtainable as part of the 2026 Festival of Joy event', 2320.0),
('55680106-c40a-548f-abb6-060e2b2fe677', 'REW_0233', 'Renown', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'VARIES'), 'Renown', false, NULL, 'Varies', ARRAY['DMG2014']::text[], 'Gaining renown with a particular group, such as a faction, organization, or community. See book for description.', '- Except for starting Renown at character creation, a character starts with a Renown score of 0 with respect to a group. Completing an adventure that advances a group''s interest increases a character''s Renown score by 1 as determined by a DM. Completing an adventure as part of a mission directly assigned by that group increases a character''s Renown score by 2 as determined by a DM. Highly significant quests can increase Renown score by 3 or 4 as determined by a DM.
- A character with a Renown Score of 3+ with a group is typically considered a respected member of it, as either an official or honorary member. Some groups come with member benefits for being a member of that group.
- A character can also lose Renown Score as written. A character that no longer meets the Renown Score requirement for a Renown Perk can''t benefit from it until they reach the appropriate Renown Score once more.
- A character can obtain Renown with and benefit from associated Renown Perks for any number of groups. However, a character can''t become a respected member of a faction or organization (Renown Score 3+) if they are already a respected member of a faction or organization that is Hostile to it. The character can''t become a respected member or have a Renown Score of 3+ with such a faction or organization without first reducing their Renown Score with the Hostile faction or organization to 0 and forfeit all associated Renown Perks. This voluntary reduction of Renown Score should be logged in either the downtime log or session log in which it occurs. (Note: A DM may allow a PC to infiltrate a Hostile faction or organization during an adventure and potentially benefit from Renown Perks with that faction that last for the duration of the adventure only)
- Some groups have ranks and titles associated with achieving certain Renown Score thresholds with that group. Besides an indication of a member''s recognition or title within the group, ranks have no mechanical effects.
- A character can only benefit from Renown Perks from a community while physically present at that community''s location.', 2330.0),
('bde51c2f-9b58-561d-85de-866e04f63758', 'REW_0234', 'Renown Perk', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'VARIES'), 'Renown Perk', false, NULL, 'Varies', ARRAY['DMG2014']::text[], 'Gaining a perk as part of achieving a certain Renown Score within a group. See book for description.', '- Renown Perks don''t count against a game''s item slots or gold allotment but cannot be sold or traded.
- Characters that achieve a particular Renown Score within a group are eligible to receive Marks of Prestige, Story Outcomes, and trinkets that don''t count against a session''s item slots or gold allotment as determined by the DM. 
- A DM can award other Renown Perks as part of an adventure without request provided their effects don''t extend beyond the scope of the adventure. Both the 2014 and 2024 Dungeon Master''s Guide provide suggestions of possible Renown Perks. Depending on the nature of the group, some of the suggested perks for Group Patrons described in Tasha''s Cauldron of Everything are also appropriate as Renown Perks.
- A DM can award other Renown Perks that are more mechanically significant and that persist beyond an adventure as part of an approved Rules request. A list of available Renown Perks for different groups can also be seen below that are available to DMs to award without a request.', 2340.0),
('94cbd6cd-f6ce-5a71-946c-3c608cab30a1', 'REW_0235', 'Cult of the Dragon', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Faction)', false, NULL, '—', ARRAY['FRHOF']::text[], 'See Forgotten Realms: Heroes of Faerûn for a description, list of Renown rewards, and member benefits. See other sources for additional information.

Ranks
- Dragonclaw: Renown Score 10+
- Dragonwing: Renown Score 15+
- Dragonfang: Renown Score 25+
- Dragonsoul: Renown Score 40+
- Wearer of Purple: Renown Score 50+', '- See sources for description of member traits.
- The Cult of the Dragon is one of the major factions of Faerûn.
- The Cult of the Dragon are Hostile to the Emerald Enclave, the Harpers, the Lords'' Alliance, the Order of the Gauntlet, and the Purple Dragon Knights.
- For this faction''s Member Benefits, you can either roll for or choose a Cult of the Dragon Trinket. Additionally, whenever you expend DTP while a respected member of this faction (Renown Score 3+), you must expend 3 GP per DTP expended to cover your tithing.
- For the Renown Score 3+ benefit, you don''t need to expend 1 GP per DTP expended while outside Hawthorne if you are at a location with an accessible Cult of the Dragon hideout.
- For the Renown Score 10 benefit, the magic item obtained is a T1 magic item of your choice in Allowed Content (Loot) and must be logged in the session or downtime log in which you reached this Renown score.
- The Renown Score 25+ benefit can only be used during adventures or as overseen by a DM.
- For the Renown Score 30 benefit, the magic item obtained is a T2 magic item of your choice in Allowed Content (Loot) and must be logged in the session or downtime log in which you reached this Renown score.
- The Renown Score 40+ benefit can only be used during adventures or as overseen by a DM.
- The Renown Score 50+ benefit can be reused the next time your Renown score increases by 5 or more since you last used it.', 2350.0),
('2b1abe9c-0123-5e98-80ff-25ea064892e7', 'REW_0236', 'Harpers', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Faction)', false, NULL, '—', ARRAY['FRHOF']::text[], 'See Forgotten Realms: Heroes of Faerûn for a description, list of Renown rewards, and member benefits. See other sources for additional information.

The Harpers is a scattered network of spellcasters and spies who advocate equality and covertly oppose the abuse of power. The organization is benevolent, knowledgeable, and secretive. Bards and wizards of good alignments are commonly drawn to the Harpers.

Motto: Down with tyranny. Fairness and equality for all.

Goals
- Gather information throughout Faerûn.
- Promote fairness and equality by covert means.
- Thwart tyrants and leaders, governments, and organizations that grow too powerful.
- Aid the weak, poor and oppressed.

Beliefs
- One can never have too much information or arcane knowledge.
- Too much power leads to corruption. The abuse of magic must be closely monitored.
- No one should be powerless.

Ranks
- Watcher: Renown Score 3+
- Harpshadow: Renown Score 15+
- Brightcandle: Renown Score 25+
- Wise Owl: Renown Score 40+
- High Harper: Renown Score 50+', '- The Harpers are one of the major factions of Faerûn.
- The Harpers are Hostile to the Cult of the Dragon, the Red Wizards, the Zhentarim, and the Legion of Dread.
- Traits: Harper agents are trained to act alone and rely on their own resources. When they get into scrapes, they don’t count on their fellow Harpers to rescue them. Nevertheless, Harpers are dedicated to helping one another in times of need, and friendships between Harpers are nigh unbreakable. Masterful spies and infiltrators, they use various guises and secret identities to form relationships, cultivate their information networks, and manipulate others into doing what needs to be done. Although most Harpers prefer to operate in the shadows, there are exceptions.
- For this faction''s Member Benefits, you can either roll for or choose a Harper Trinket.
- For the Renown Score 3+ benefit, you don''t need to expend 1 GP per DTP expended while outside Hawthorne if you are at a location with an accessible Harper stronghold.
- For the Renown Score 5+ benefit, you can purchase T0 potions or scrolls at their listed base cost in Allowed Content (Loot) at Harper strongholds.
- The Renown Score 50+ benefit can be reused the next time your Renown score increases by 10 or more since you last used it.', 2360.0),
('6dc9281c-ce06-51ef-890e-43eeb2f6f12b', 'REW_0237', 'Harper Token (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', false, NULL, 'T0', ARRAY['HHB']::text[], 'Wondrous Item, T0

This silver brooch is embossed with the symbol of the Harpers, depicting a harp against a crescent moon. This brooch is presented to newly inducted members of the Harpers to serve as faction insignia as a token of their membership.

While wearing this brooch, you gain the following benefit.

Telepathic Detection. The pin grows warm if a creature within 30 feet of yourself attempts to use telepathy to communicate.', '- This homebrew item was created by greensprout
- This item can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 3+ with the Harpers. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 1+ DMPC with a Renown Score of 3+ with the Harpers can choose to obtain this item in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as an item reward.', 2370.0),
('90fa31af-1651-5d8f-af9e-1f27aad04cc5', 'REW_0238', 'Lesser Harper Pin (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Wondrous Item', false, NULL, 'T1 Select', ARRAY['HHB']::text[], 'Wondrous Item, T1 (Requires Attunement)

This silver brooch is embossed with the symbol of the Harpers, depicting a harp against a crescent moon. This brooch is presented to dedicated members among the Harpers.

While wearing this pin, you gain the following benefits.

Mind Shielding. You are immune to magic that allows other creatures to read your thoughts, determine whether you are lying, know your alignment, or know your creature type. Creatures can telepathically communicate with you only if you allow it.

Telepathic Detection. The pin grows warm if a creature within 30 feet of yourself attempts to use telepathy to communicate.', '- This homebrew item was created by greensprout
- This item can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 10+ with the Harpers. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 1+ DMPC with a Renown Score of 10+ with the Harpers can choose to obtain this item in replacement of their normal DM Loot for that DMPC.
- This homebrew item was previously known as Harper Pin
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as an item reward.', 2380.0),
('c24b105c-53b7-542a-af97-a7c6650dbe92', 'REW_0239', 'Harpspeak', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Story Outcome', false, NULL, 'T0', ARRAY['HHB']::text[], 'Story Outcome, T0

You''ve proven yourself to be a reliable Harper agent. You learn Harpspeak, a secret non-verbal language and means of communication known only to Harpers. Harpspeak can be used either in the form of a sign language or with scribed runes to leave hidden messages. 

As a sign language, Harpspeak uses ordinary gestures in patterns that allow for messages to be hidden in seemingly normal and innocuous gestures such as smiles, frowns, and winks. Only a creature that knows Harpspeak understands such messages. It takes four times longer to convey such a message than it does to speak the same idea plainly. 

As scribed runes, Harpspeak can be used to leave behind hidden messages for other Harpers. Creatures who know Harpspeak automatically spot such messages. Others spot the message''s presence with a successful DC 15 Wisdom (Perception) check but can''t decipher it without magic. Harpers sometimes mark the interior of these runes with extra dots to leave behind a misleading message for their enemies and to alert their fellow Harpers that the true symbol and its meaning is somewhere else nearby.', '- This Story Outcome was created by greensprout
- This Story Outcome can be awarded without using an item slot as normal but can only be obtained by a PC with a Renown Score of 15+ with the Harpers. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 1+ DMPC with a Renown Score of 15+ with the Harpers can choose to obtain this Story Outcome in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as a Story Outcome.', 2390.0),
('e3c14cb4-a9c8-5dbe-a8a7-ea3e816d7954', 'REW_0240', 'Chord of Calling', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Story Outcome', false, NULL, 'T0', ARRAY['HHB']::text[], 'Story Outcome, T0

You are a trusted voice among the Harpers and a pillar of communities, recognized finding and rooting out injustice where you can. During adventures in Faerûn, you can spend 7 days to call upon major aid from the Harpers and obtain assistance from Harper spellcasters or other support. The nature of this assistance is determined by the DM.', '- This Story Outcome was created by greensprout
- This Story Outcome can be awarded without using an item slot as normal but can only be obtained by a PC with a Renown Score of 25+ with the Harpers. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 1+ DMPC with a Renown Score of 25+ with the Harpers can choose to obtain this Story Outcome in replacement of their normal DM Loot for that DMPC.
- This Story Outcome was previously known as Wise Owl''s Wiles
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as a Story Outcome.', 2400.0),
('64e00cd9-ae9a-5f81-aca2-0ab7f166ebc0', 'REW_0241', 'Greater Harper Pin (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Wondrous Item', false, NULL, 'T4 Select', ARRAY['HHB']::text[], 'Wondrous Item, T4 (Requires Attunement)

This silver brooch is embossed with the symbol of the Harpers, depicting a harp against a crescent moon. This brooch is presented to those that have become a High Harper, the highest rank in the leadership of the Harpers. Unlike the Harper pin provided earlier in a Harper''s career, the silver of this pin has been magically treated to be as hard as adamantine and has extraordinary properties.

While wearing this pin, you gain the following effects..

Mind Shielding. You have Advantage on saving throws made to avoid or end the Charmed or Frightened condition. Additionally, you are immune to magic that allows other creatures to read your thoughts, determine whether you are lying, know your alignment, or know your creature type. Creatures can telepathically communicate with you only if you allow it.

Nondetection. The pin has the properties of an Amulet of Proof Against Detection and Location and the pin itself is also protected against such effects.

Resilience. You have Resistance to Lightning damage and you have Immunity to damage from the Magic Missile spell.

Telepathic Detection. The pin grows warm if a creature within 30 feet of yourself attempts to use telepathy to communicate.', '- This homebrew item was created by greensprout
- This item can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 50+ with the Harpers. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 17+ DMPC with a Renown Score of 50+ with the Harpers can choose to obtain this item in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as an item reward.', 2410.0),
('02f32583-1552-5045-9db6-f1442cccbafe', 'REW_0242', 'Order of the Gauntlet', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Faction)', false, NULL, '—', ARRAY['FRHOF']::text[], 'See Forgotten Realms: Heroes of Faerûn for a description, list of Renown rewards, and member benefits. See other sources for additional information.

The Order of the Gauntlet is composed of faithful and vigilant seekers of justice who protect others from the depredations of evildoers. The organization is honorable, vigilant, and zealous. Clerics, monks, and paladins of good (and often lawful good) alignments are commonly drawn to the Order of the Gauntlet.

Motto: The gods are with us. When evil strikes, we strike back.

Goals
- Be armed and vigilant against evil.
- Identify evil threats such as secretive power groups and inherently evil creatures.
- Enforce justice.
- Enact retribution against evil actions—do not strike preemptively.

Beliefs
- Faith is the greatest weapon against evil—faith in one’s god, one’s friends, and one’s self.
- Battling evil is an extraordinary task that requires extraordinary strength and bravery.
- Punishing an evil act is just. Punishing an evil thought is not.

Ranks
- Chevall: Renown Score 3+
- Marcheon: Renown Score 15+
- Whitehawk: Renown Score 25+
- Vindicator: Renown Score 40+
- Righteous Hand: Renown Score 50+

Titles
- Knight of the Guard: Renown Score 5+
- Knight of the Banner: Renown Score 15+
- Knight of Justice: Renown Score 30+
- Chapter Knight: Renown Score 50+', '- The Order of the Gauntlet are one of the major factions of Faerûn.
- The Order of the Gauntlet are Hostile to the Cult of the Dragon, the Red Wizards, the Zhentarim, and the Legion of Dread.
- Traits: The Order of the Gauntlet is a dedicated, tightly knit group of like-minded individuals driven by religious zeal or a finely-honed sense of justice and honor. Friendship and camaraderie are important to members of the order, and they share a trust and a bond normally reserved for siblings. Like highly motivated soldiers, members of the Order of the Gauntlet seek to become the best at what they do and look forward to testing their mettle. There are few, if any, “lone wolves” in this organization.
- For this faction''s Member Benefits, you can either roll for or choose an Order of the Gauntlet Trinket.
- For the Renown Score 3+ benefit, you don''t need to expend 1 GP per DTP expended while outside Hawthorne if you are at a location with an accessible Order of the Gauntlet chapter.
- For the Renown Score 10 benefit, the magic item obtained is a T1 Armor, Ring, or Weapon of your choice in Allowed Content (Loot) and must be logged in the session or downtime log in which you reached this Renown score.
- For the Renown Score 15+ benefit, obtaining the services of an Order of the Gauntlet spellcaster to cast level 2 or lower Cleric spells costs no DTP or GP in downtime. However, any spells cast this way to achieve a lasting effect still cost DTP equal to the spell''s level (minimum of 1 DTP).
- For the Renown Score 40 benefit, the magic item obtained is a T2 Armor, Ring, or Weapon of your choice in Allowed Content (Loot) and must be logged in the session or downtime log in which you reached this Renown score.', 2420.0),
('cd4fedbd-892d-5962-b6fd-dee979d7c50c', 'REW_0243', 'Emblem of the Order (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', false, NULL, 'T0', ARRAY['HHB']::text[], 'Wondrous Item, T0

This Emblem serves as faction insignia given to new members of the Order of the Gauntlet and to mark them as belonging to the faction. Prominently displayed upon the Emblem is the symbol of the Order of the Gauntlet: a gauntleted fist grasping a sword by the blade.

You can use this Emblem as a Holy Symbol. While wearing the fabric or holding the Shield that the Emblem is borne upon, you can take a Bonus Action to cause the Emblem to shed Bright Light in a 10-foot radius and Dim Light for an additional 10 feet, or to extinguish the light.', '- This homebrew item was created by greensprout
- This item can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 3+ with the Order of the Gauntlet. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 1+ DMPC with a Renown Score of 3+ with the Order of the Gauntlet can choose to obtain this item in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as an item reward.', 2430.0),
('a02e4b14-5418-5465-9c21-e1c9ff821c68', 'REW_0244', 'Hero''s Welcome', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Story Outcome', false, NULL, 'T0', ARRAY['HHB']::text[], 'Story Outcome, T0

Word of your deeds among the Order of the Gauntlet have spread among the common folk of the Sword Coast and beyond as a champion of justice. 

You can find a place to hide, rest, or recuperate among other commoners, unless you have shown yourself to be a danger to them. They will shield you from the law or anyone else searching for you and will extend you every courtesy and do their utmost to help you. Unless you have shown yourself to be a danger to them, they will even take up arms to fight alongside you, should you find yourself facing an enemy alone.', '- This Story Outcome was created by greensprout
- This Story Outcome can be awarded without using an item slot as normal but can only be obtained by a PC with a Renown Score of 10+ with the Order of the Gauntlet. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 1+ DMPC with a Renown Score of 10+ with the Order of the Gauntlet can choose to obtain this Story Outcome in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as a Story Outcome.', 2440.0),
('d8117100-6247-5260-a0d5-47433f810259', 'REW_0245', 'Hippogriffs of the Hawk', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Story Outcome', false, NULL, 'T0', ARRAY['HHB']::text[], 'Story Outcome, T0

You have proven your valor and integrity and that you can be counted as a trusted member of the Order. You have earned the right to acquire Hippogriffs from the Hawk''s Nest, a fortification near Silverymoon Pass protected by the Order of the Gauntlet. 

While in Faerûn, you can expend 30 DTP and 1000 GP to purchase a Hippogriff as a downtime activity; the Hippogriff is delivered to the settlement or stronghold nearest to you where the Order of the Gauntlet is present.', '- This Renown Perk was created by greensprout
- This Story Outcome can be awarded without using an item slot as normal but can only be obtained by a PC with a Renown Score of 15+ with the Order of the Gauntlet. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 1+ DMPC with a Renown Score of 15+ with the Order of the Gauntlet can choose to obtain this Story Outcome in replacement of their normal DM Loot for that DMPC.
- The Order of the Gauntlet has a presence in the city of Hawthorne.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as a Story Outcome.', 2450.0),
('7bec32d5-78c2-5d6c-b85c-6b4b52958185', 'REW_0246', 'Rally the Order', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Story Outcome', false, NULL, 'T0', ARRAY['HHB']::text[], 'Story Outcome, T0

You are a champion of the Order of the Gauntlet, with your actions recognized to have brought glory, honor, and respect to the Order and its ideals. During adventures in Faerûn, you can spend 7 days to call upon major aid from the Order of the Gauntlet and obtain assistance from Order spellcasters or other support. The nature of this assistance is determined by the DM.', '- This Renown Perk was created by greensprout
- This Story Outcome can be awarded without using an item slot as normal but can only be obtained by a PC with a Renown Score of 25+ with the Order of the Gauntlet. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 1+ DMPC with a Renown Score of 25+ with the Order of the Gauntlet can choose to obtain this Story Outcome in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as a Story Outcome.', 2460.0),
('57b6702d-8edc-5016-b72c-aebf477c565a', 'REW_0247', 'Talisman of the Gauntlet (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Wondrous Item', false, NULL, 'T4 Select', ARRAY['HHB']::text[], 'Wondrous Item, T4 (Requires Attunement)

This silver talisman is emblazoned with the symbol of the Order of the Gauntlet, depicting the blade of retribution held by the gauntlet of justice. This talisman is presented to those that have become a Righteous Hand, the highest rank in the Order of the Gauntlet''s leadership. 

Holy Symbol. You can use the talisman as a Holy Symbol. You gain a +3 bonus to your saving throws while you wear or hold this talisman.

Holy Rebuke. This talisman has 7 charges and regains 1d6 + 1 expended charges daily at dawn. While holding or wearing this talisman, you can take a Magic action to expend 1 or more of its charges to cause one of the following effects:
- Rebuke Evil. You expend 1 charge and target one creature you can see within 60 feet of yourself. The target must succeed on a DC 17 Wisdom saving throw, taking 8d6 Psychic damage on a failed save, or half as much damage on a successful one. If the target is evil, it has Disadvantage on the save. 
- Turn Evil. You expend 2 charges and target one creature you can see within 60 feet of yourself, forcing the target to make a DC 17 Wisdom saving throw. On a failed save, the target has the Frightened condition for 1 minute or until it takes damage. While Frightened in this way, the target can do only one of the following on each of its turns: move or take an action or a Bonus Action. If the target is evil, it has Disadvantage on the initial save, and the target can repeat the saving throw at the end of each of its turns, ending the condition on itself on a success.
- Grand Rebuke. You expend 4 charges and target each creature of your choice that you can see within 60 feet of yourself. Each target must succeed on a DC 17 Wisdom saving throw, taking 8d6 Psychic damage on a failed save, or half as much damage on a successful one. If the target is evil, it has Disadvantage on the save.', '- This homebrew item was created by greensprout
- This item can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 50+ with the Order of the Gauntlet. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 17+ DMPC with a Renown Score of 50+ with the Order of the Gauntlet can choose to obtain this item in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as an item reward.', 2470.0),
('c82427a1-93a0-504c-9705-23a9c728ea70', 'REW_0248', 'Emerald Enclave', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Faction)', false, NULL, '—', ARRAY['FRHOF']::text[], 'See Forgotten Realms: Heroes of Faerûn for a description, list of Renown rewards, and member benefits. See other sources for additional information.

The Emerald Enclave is a widespread group of wilderness survivalists who preserve the natural order while rooting out unnatural threats. The organization is decentralized, hardy, and reclusive. Barbarians, druids, and rangers of good or neutral alignments are commonly drawn to the Emerald Enclave.

Motto: We preserve the natural order.

Goals
- Restore and preserve the natural order.
- Destroy all that is unnatural.
- Keep the elemental forces of the world in check.
- Keep civilization and the wilderness from destroying each other.

Beliefs
- The natural order must be respected and preserved.
- Forces that upset the natural order must be destroyed.
- Civilization and the wilderness must learn to coexist peacefully.

Ranks
- Springwarden: Renown Score 3+
- Summerstrider: Renown Score 15+
- Autumnreaver: Renown Score 25+
- Winterstalker: Renown Score 40+
- Master of the Wild: Renown Score 50+', '- The Emerald Enclave are one of the major factions of Faerûn.
- The Emerald Enclave are Hostile to the Cult of the Dragon, the Red Wizards, the Zhentarim, and the Legion of Dread.
- Traits: Members of the Emerald Enclave are spread far and wide, and usually operate in isolation. They learn to depend on themselves more than others. Survival in a harsh world also demands great fortitude and mastery of certain fighting and survival skills. Members of the Enclave who dedicate themselves to helping others survive the perils of the wilderness are more social than others who are charged with defending sacred glades and preserving the natural balance.
- For this faction''s Member Benefits, you can either roll for or choose an Emerald Enclave Trinket. Additionally, you don''t need to expend 1 GP per DTP expended while outside Hawthorne and while in Faerûn.
- The Renown Score 5+ benefit can only be used during adventures or as overseen by a DM.
- For the Renown Score 15+ benefit, you can purchase T0 or T1 potions or spell scrolls at their listed base cost in Allowed Content (Loot) at locations where the Emerald Enclave is present.
- For the Renown Score 30 benefit, the number of Potions of Healing (Superior) obtained must be rolled and logged in the session or downtime log in which you reached this Renown score.
- The Renown Score 50+ benefit can be reused the next time your Renown score increases by 5 or more since you last used it.', 2480.0),
('9f30098e-52bb-59f0-877e-4632bb42428e', 'REW_0249', 'Emerald Enclave Clasp (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Wondrous Item', false, NULL, 'T0', ARRAY['HHB']::text[], 'Wondrous Item, T0

This copper cloak clasp is in the shape of a leaf accented with green enamel and serves as faction insignia for new members of the Emerald Enclave. 

While wearing this clasp, you can take a Magic action to determine which way is magnetic north. Nothing happens if the clasp is used in a location that has no magnetic north. Additionally, you can cast the Druidcraft spell from this clasp to predict the weather at your location only.', '- This homebrew item was created by greensprout
- This item can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 3+ with the Emerald Enclave. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 1+ DMPC with a Renown Score of 3+ with the Emerald Enclave can choose to obtain this item in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as an item reward.', 2490.0),
('d7bc6680-418c-5ca1-9e74-af6f7d2edb6c', 'REW_0250', 'At Home in the Wild', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Story Outcome', false, NULL, 'T0', ARRAY['HHB']::text[], 'Story Outcome, T0

You''ve shown your commitment and have been taught how to survive in the wild. You have Advantage on ability checks made to calm or befriend Beasts, and you can find food and fresh water for yourself and up to five other people each day, provided that the land offers berries, small game, water, and so forth.', '- This Story Outcome was created by greensprout
- This Story Outcome can be awarded without using an item slot as normal but can only be obtained by a PC with a Renown Score of 10+ with the Emerald Enclave. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 1+ DMPC with a Renown Score of 10+ with the Emerald Enclave can choose to obtain this Story Outcome in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as a Story Outcome.', 2500.0),
('fda63e13-0f4a-506b-96df-baf8d24298b0', 'REW_0251', 'Emerald Cloak (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Wondrous Item', false, NULL, 'T2 Select', ARRAY['HHB']::text[], 'Wondrous Item, T2 (Requires Attunement)

Subtly displayed on the back of this green cloak is the profile of a silhouetted stag, the symbol of the Emerald Enclave. This cloak is presented to members of the Emerald Enclave for demonstrating their relability as faction agents and in carrying out significant duties and tasks.

This cloak has the properties of a Nature''s Mantle and you have Advantage on Dexterity (Stealth) checks while wearing this cloak. 

Additionally, while wearing this cloak, you can use a Bonus Action to cast the Tree Stride spell from this cloak except that the spell''s duration is 1 round. This property of the cloak can''t be used again until the next dawn.', '- This homebrew item was created by greensprout
- This item can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 30+ with the Emerald Enclave. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 5+ DMPC with a Renown Score of 30+ with the Emerald Enclave can choose to obtain this item in replacement of their normal DM Loot for that DMPC.
- This item can be attuned to even if you are not a Druid or Ranger
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as an item reward.', 2510.0),
('2defb517-7f20-514e-858b-c25bb026a9c0', 'REW_0252', 'Call the Pack', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Story Outcome', false, NULL, 'T0', ARRAY['HHB']::text[], 'Story Outcome, T0

You are a champion of the Emerald Enclave, with your actions recognized to have brought balance and stability. During adventures in Faerûn, you can spend 7 days to call upon major aid from the Emerald Enclave and obtain assistance from Enclave spellcasters or other support. The nature of this assistance is determined by the DM.', '- This Renown Perk was created by greensprout
- This Story Outcome can be awarded without using an item slot as normal but can only be obtained by a PC with a Renown Score of 25+ with the Emerald Enclave. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 1+ DMPC with a Renown Score of 25+ with the Emerald Enclave can choose to obtain this Story Outcome in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as a Story Outcome.', 2520.0),
('d872dc1e-7938-50e9-8f35-a6c0127cc476', 'REW_0253', 'Wildmark (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Supernatural Gift', false, NULL, 'T4 Select', ARRAY['HHB']::text[], 'Supernatural Gift, T4

As a Master of the Wild of the Emerald Enclave, you''ve achieved the highest rank of leadership within the faction and have been inducted into its deepest mysteries. While this Supernatural Gift is active, you gain the following traits.

Nature''s Protection. You are immune to curses, disease, and magical contagions and have the benefits of an Amulet of Proof Against Detection and Location. Additionally, you stop aging: you are immune to any effect that would age you, and you can''t die from old age.

Nature''s Blessing. When you select this Supernatural Gift to be active when finishing a Long Rest, choose one of the following options below to benefit from. You can only benefit from one option at a time.
- Blessing of Eldath. You can cast the Water Breathing spell at will, requiring no components. Additionally, you can cast the Plane Shift spell, requiring no components and targeting yourself only, with the destination being a location on the Elemental Plane of Water. After you cast Plane Shift in this way, you can''t do so again until you finish a Long Rest.
- Blessing of Mielikki. You can take a Magic action to shape-shift into a Treant. You retain your game statistics and ability to speak, but your creature type, size, AC, movement modes, Strength, and Dexterity are replaced by those of the Treant stat block, and you gain any statistics and capabilities that the Treant stat block has that you lack. You remain shape-shifted in this way until you are reduced to 0 Hit Points, die, or end it as a Bonus Action. After you shape-shift in this way, you can''t do so again until you finish a Short or Long Rest.
- Blessing of Silvanus. You can cast the Meld into Stone spell at will, requiring no components. Additionally, you can cast the Plane Shift spell, requiring no components and targeting yourself only, with the destination being a location on the Elemental Plane of Earth. After you cast Plane Shift in this way, you can''t do so again until you finish a Long Rest.', '- This homebrew Supernatural Gift was created by greensprout
- This Supernatural Gift can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 50+ with the Emerald Enclave. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 17+ DMPC with a Renown Score of 50+ with the Emerald Enclave can choose to obtain this Supernatural Gift in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as a Supernatural Gift using an item slot.', 2530.0),
('e68f2992-5e46-54a5-b8bc-3844ce369eaa', 'REW_0254', 'Lords'' Alliance', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Faction)', false, NULL, '—', ARRAY['FRHOF']::text[], 'See Forgotten Realms: Heroes of Faerûn for a description, list of Renown rewards, and member benefits. See other sources for additional information.

The Lords’ Alliance is a loose coalition of established political powers concerned with mutual security and prosperity. The organization is aggressive, militant, and political. Fighters and sorcerers of lawful or neutral alignments are commonly drawn to the Lords’ Alliance.

Motto: Threats to home must be terminated without prejudice. Superiority is our security. 

Goals
- Ensure the safety and prosperity of cities and other settlements of Faerûn.
- Maintain a strong coalition against the forces of disorder.
- Proactively eliminate threats to the established powers.
- Bring honor and glory to one’s leaders and one’s homeland.

Beliefs
- If civilization is to survive, all must unite against the dark forces that threaten it.
- Fight for your realm. Only you can bring honor, glory, and prosperity to your lord and homeland.
- Don’t wait for the enemy to come to you. The best defense is a strong offense.

Ranks
- Cloak: Renown Score 3+
- Redknife: Renown Score 15+
- Stingblade: Renown Score 25+
- Warduke: Renown Score 40+
- Lioncrown: Renown Score 50+', '- The Lords'' Alliance are one of the major factions of Faerûn.
- The Lords'' Alliance is Hostile to the Cult of the Dragon, the Red Wizards, the Zhentarim, and the Legion of Dread.
- Traits: To seek out and destroy threats to their homelands, agents of the Lords’ Alliance must be highly trained at what they do. Few can match their skills in the field. They fight for the glory and the security of their people and for the lords who rule over them, and they do so with pride. However, the Lords’ Alliance can only survive if its members “play nice” with one another, which requires a certain measure of diplomacy. Rogue agents within the Lords’ Alliance are rare, but defections have been known to occur.
- For this faction''s Member Benefits, you can either roll for or choose a Lords'' Alliance Trinket. Additionally, you don''t need to expend 1 GP per DTP expended while outside Hawthorne and while in a Lords'' Alliance settlement. 
- For the Renown Score 5+ benefit, level 0 - 3 spell scrolls acquired at a Lords'' Alliance settlement in this way can be purchased for their listed base cost value in Allowed Content (Loot), to which the listed 10% discount is applied.
- For the Renown Score 10 benefit, the magic item obtained is a T1 magic item of your choice in Allowed Content (Loot) and must be logged in the session or downtime log in which you reached this Renown score.
- For the Renown Score 25+ benefit, obtaining the services of a Lords'' Alliance spellcaster in a Lords'' Alliance settlement to cast the Sending spell costs no DTP or GP in downtime.', 2540.0),
('efb2980b-467d-536b-a528-a19047ba5181', 'REW_0255', 'Signet Ring of the Alliance (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Ring', false, NULL, 'T0', ARRAY['HHB']::text[], 'Ring, T0

Etched upon this signet ring is the shape of a crown, the symbol of the Lords'' Alliance. Such rings serve as faction insignia for the Lords'' Alliance and are customarily given to newly inducted members and can be dipped in wax to seal important documents.

While wearing this ring, you can take a Magic action to cause your voice or signal to carry clearly for up to 600 feet until the end of your next turn.', '- This homebrew item was created by greensprout
- This item can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 3+ with the Lords'' Alliance. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 1+ DMPC with a Renown Score of 3+ with the Lords'' Alliance can choose to obtain this item in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as an item reward.', 2550.0),
('8df7c63a-0263-59fb-a7fb-20bb08ee752b', 'REW_0256', 'Voice of the City', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Story Outcome', false, NULL, 'T0', ARRAY['HHB']::text[], 'Story Outcome, T0

You''ve demonstrated your loyalty and commitment to the lords of the realm. You''ve been granted training in the civic and legal structures of cities of the Lords'' Alliance and cities in general. You have Advantage on Charisma checks made to influence city authorities, city officials, city nobility, and city officers of the law.', '- This Story Outcome was created by greensprout
- This Story Outcome can be awarded without using an item slot as normal but can only be obtained by a PC with a Renown Score of 10+ with the Lords'' Alliance. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 1+ DMPC with a Renown Score of 10+ with the Lords'' Alliance can choose to obtain this Story Outcome in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as a Story Outcome.', 2560.0),
('9836e565-e148-5b85-a324-dd4e660bfda3', 'REW_0257', 'Badge of the Alliance (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Wondrous Item', false, NULL, 'T2 Select', ARRAY['HHB']::text[], 'Wondrous Item, T2 (Requires Attunement)

Emblazoned upon this badge is the symbol of a crown, marking one as a ranking member of the Lords'' Alliance. These badges are frequently given to Stingblades of the Lords'' Alliance after earning the trust of the Lords'' Alliance for their actions and marks their authority to act as entrusted agents of the Alliance.

While wearing this badge, you gain a +2 bonus to AC if you aren''t using a shield.

Additionally, while wearing this badge, you can cast the Command spell from it (save DC 17).', '- This homebrew item was created by greensprout
- This item can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 30+ with the Lords'' Alliance. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 5+ DMPC with a Renown Score of 30+ with the Lords'' Alliance can choose to obtain this item in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as an item reward.', 2570.0),
('0871edd8-c402-5724-9fc6-2c96249d6221', 'REW_0258', 'Assemble the Alliance', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Story Outcome', false, NULL, 'T0', ARRAY['HHB']::text[], 'Story Outcome, T0

You are a champion of the Lords'' Alliance, with your actions recognized to have brought order and security to the realm. During adventures in Faerûn, you can spend 7 days to call upon major aid from the Lords'' Alliance and obtain assistance from Alliance spellcasters or other support. The nature of this assistance is determined by the DM.', '- This Story Outcome was created by greensprout
- This Story Outcome can be awarded without using an item slot as normal but can only be obtained by a PC with a Renown Score of 25+ with the Lords'' Alliance. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 1+ DMPC with a Renown Score of 25+ with the Lords'' Alliance can choose to obtain this Story Outcome in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as a Story Outcome.', 2580.0),
('5d8a7732-6741-5ecb-824c-4946e28b8803', 'REW_0259', 'Crown of the Alliance (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Wondrous Item', false, NULL, 'T4 Select', ARRAY['HHB']::text[], 'Wondrous Item, T4 (Requires Attunement)

This golden crown is forged in the shape of two rearing lions. This crown is immediately recognizable as a symbol of the Lords'' Alliance and is often presented to those that have become a Lioncrown, the highest rank in the leadership of the Lords'' Alliance. 

The crown has 7 charges and regains 1d6 + 1 expended charges daily at dawn, and has the following properties.

Resolve. While you wear this crown, you have Resistance to Psychic damage and have Immunity to the Charmed and Frightened conditions. Additionally, each ally within 30 feet of you has Advantage on saving throws made to avoid or end the Charmed or Frightened condition. 

Inspiration. While wearing this crown, you can take a Bonus Action to expend 1 charge from the crown and inspire one creature you can see that is within 30 feet of you and that can see or hear you. Once within the next hour when the inspired creature makes a D20 Test, the inspired creature can roll 1d6 and add the number rolled to the d20. 

Spells. While wearing this crown, you can expend 1 or more of the crown''s charges to cast one of the following spells from it: Aid (level 4 version, 4 charges), Circle of Power (5 charges), Crusader''s Mantle (3 charges), or Heroism (5 Temporary Hit Points, 1 charge).', '- This homebrew item was created by greensprout
- This homebrew item can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 50+ with the Lords'' Alliance. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 17+ DMPC with a Renown Score of 50+ with the Lords'' Alliance can choose to obtain this homebrew item in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as an item reward.', 2590.0),
('62a28f35-7ec5-5a23-905b-201a8a857237', 'REW_0260', 'Purple Dragon Knights', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Faction)', false, NULL, '—', ARRAY['FRHOF']::text[], 'See Forgotten Realms: Heroes of Faerûn for a description, list of Renown rewards, and member benefits. See other sources for additional information.', '- See sources for description of member traits.
- The Purple Dragon Knights is one of the major factions of Faerûn.
- The Purple Dragon Knights are Hostile to the Cult of the Dragon, the Red Wizards, and the Legion of Dread.
- For this faction''s Member Benefits, you can either roll for or choose a Purple Dragon Knight Trinket.
- For the Renown Score 3+ benefit, you don''t need to expend 1 GP per DTP expended while outside Hawthorne if you are at Suzail.
- For the Renown Score 10 benefit, the magic item obtained is a T1 Armor or Weapon of your choice in Allowed Content (Loot) and must be logged in the session or downtime log in which you reached this Renown score.
- For the Renown Score 50 benefit, the amethyst dragon egg must be incubated as encased in rock or in a small cave and takes 365 days to hatch. In character days that pass for the character during an adventure counts towards this time. Each real life day that passes while the character is not adventuring as part of a multisession or campaign also counts towards this time. The amethyst dragon egg then hatches into an Amethyst Dragon Wyrmling with a name, alignment, and personality as determined by you but is otherwise an NPC under the DM''s control.', 2600.0),
('4ead7409-113a-547f-8bed-c8af9f02f701', 'REW_0261', 'Red Wizards', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Faction)', false, NULL, '—', ARRAY['FRHOF']::text[], 'See Forgotten Realms: Heroes of Faerûn for a description, list of Renown rewards, and member benefits. See other sources for additional information.', '- See sources for description of member traits.
- The Red Wizards are one of the major factions of Faerûn.
- The Red Wizards are Hostile to the Emerald Enclave, the Harpers, the Lords'' Alliance, the Order of the Gauntlet, the Purple Dragon Knights, and the Legion of Dread.
- For this faction''s Member Benefits, you can either roll for or choose a Red Wizard Trinket.
- For the Renown Score 3+ benefit, you don''t need to expend 1 GP per DTP expended while outside Hawthorne if you are at a Thayan enclave.
- For the Renown Score 10 benefit, the magic item obtained is a T1 Rod, Staff, or Wand of your choice in Allowed Content (Loot) and must be logged in the session or downtime log in which you reached this Renown score.
- For the Renown Score 25+ benefit, you expend DTP and GP to acquire and attune to a Thayan Spell Tattoo containing either a level 1 spell (2 DTP and 50 GP), a level 2 spell (5 DTP and 200 GP), or a level 3 spell (8 DTP and 300 GP) of your choice. You can''t obtain another Thayan Spell Tattoo in this way again until an existing tattoo vanishes.
- For the Renown Score 30 benefit, the magic item obtained is a T2 Rod, Staff, Wand, or Wondrous Item of your choice in Allowed Content (Loot) and must be logged in the session or downtime log in which you reached this Renown score.
- For the Renown Score 50 benefit, the magic item obtained is a T3 Rod, Staff, Wand, or Wondrous Item of your choice in Allowed Content (Loot) and must be logged in the session or downtime log in which you reached this Renown score.', 2610.0),
('bdb1a803-84ab-5105-b7c3-a7bb05448dde', 'REW_0262', 'Zhentarim', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Faction)', false, NULL, '—', ARRAY['FRHOF']::text[], 'See Forgotten Realms: Heroes of Faerûn for a description, list of Renown rewards, and member benefits. See other sources for additional information.

The Zhentarim is an unscrupulous shadow network that seeks to expand its influence and power throughout Faerûn. The organization is ambitious, opportunistic, and meritocratic. Rogues and warlocks of neutral and/or evil alignments are commonly drawn to the Zhentarim.

Motto: Join us and prosper. Oppose us and suffer.

Goals
- Amass wealth.
- Look for opportunities to seize power.
- Gain influence over important people and organizations.
- Dominate Faerûn.

Beliefs
- The Zhentarim is your family. You watch out for it, and it watches out for you.
- You are the master of your own destiny. Never be less than what you deserve to be.
- Everything—and everyone—has a price.• The Zhentarim is your family. You watch out for it, and it watches out for you.
- You are the master of your own destiny. Never be less than what you deserve to be.
- Everything—and everyone—has a price.

Ranks
- Fang: Renown Score 3+
- Wolf: Renown Score 10+
- Viper: Renown Score 25+
- Ardragon: Renown Score 40+
- Dread Lord: Renown Score 50+', '- The Zhentarim are one of the major factions of Faerûn.
- The Zhentarim is Hostile to the Emerald Enclave, the Harpers, the Lords'' Alliance, the Order of the Gauntlet, HALO, and the Legion of Dread.
- Traits: A member of the Zhentarim thinks of himself or herself as a member of a large family, and relies on the Black Network for resources and security. However, members are granted enough autonomy to pursue their own interests and gain some measure of personal power or influence. The Black Network is a meritocracy. It promises “the best of the best,” although in truth, the Zhentarim is more interested in spreading its own propaganda and influence than investing in the improvement of its individual members.
- For this faction''s Member Benefits, you can either roll for or choose a Zhentarim Trinket.
- For the Renown Score 3+ benefit, you don''t need to expend 1 GP per DTP expended while outside Hawthorne if you are at a Zhentarim-controlled safe house or inn.
- For the Renown Score 10 benefit, the magic item obtained is a T1 magic item of your choice in Allowed Content (Loot) and must be logged in the session or downtime log in which you reached this Renown score.
- For the Renown Score 40 benefit, you can establish a Zhentarim outpost as a Fortification in or near any town or city in Faerûn that is open to trade of your choice. If you do not already have a Bastion, you can make the outpost a starting Bastion with two Basic Facilities (one Cramped and one Roomy) and two Special Facilities, requiring no gold or DTP but meeting any other prerequisites as normal. If you already have a Bastion, you can choose to retire it and transfer all existing facilities to the outpost to make it your new Bastion, requiring no gold or DTP. You must use the rules for Traveling in Downtime to travel to or from this outpost as normal.
- For the Renown Score 40 benefit, you can''t call on the aid of a Zhentarim-allied Beholder for help again until your Renown Score increases by 10 or more since the last time you called upon one.
- For the Renown Score 50 benefit, gaining the benefit of the Clone spell in this way costs no GP or DTP. If the Clone was used, you can''t call on the aid of a Zhentarim spellcaster to cast the Clone spell in this way for you again until your Renown Score increases by 10 or more since you last used a Clone created by this benefit.', 2620.0),
('7770f561-7230-5b0a-8bb3-512fa092b906', 'REW_0263', 'Zhentarim Token (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Trinket', false, NULL, 'T0', ARRAY['HHB']::text[], 'Trinket, T0

This iron coin is stamped with the symbol of the Zhentarim, a winged snake biting a coin, and is given to newly inducted members of the Black Network and serves as faction insignia to mark membership within the faction. 

When you display this coin, you have Advantage on Intimidation checks made against merchants, travelers, and others that fear and respect the influence of the Black Network.', '- This homebrew item was created by greensprout
- This item can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 3+ with the Zhentarim. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 1+ DMPC with a Renown Score of 3+ with the Zhentarim can choose to obtain this item in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as an item reward.', 2630.0),
('593d2cf6-d76d-508b-87c1-8e3d4baaa085', 'REW_0264', 'Black Network Connections', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Story Outcome', false, NULL, 'T0', ARRAY['HHB']::text[], 'Story Outcome, T0

You are a champion of the Zhentarim, with your actions recognized to have brought significant benefit and respect to the Black Network. During adventures in Faerûn, you can spend 7 days to call upon major aid from the Zhentarim and obtain assistance from Zhentarim spellcasters or other support. The nature of this assistance is determined by the DM.', '- This Renown Perk was created by greensprout
- This Story Outcome can be awarded without using an item slot as normal but can only be obtained by a PC with a Renown Score of 25+ with the Zhentarim. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 1+ DMPC with a Renown Score of 25+ with the Zhentarim can choose to obtain this Story Outcome in replacement of their normal DM Loot for that DMPC.
- This Story Outcome was previously known as Ardragon''s Authority
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as a Story Outcome.', 2640.0),
('6a371fcc-11e8-5fb0-853f-736b13996d57', 'REW_0265', 'Zhentilar Tattoo (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Wondrous Item (Tattoo)', false, NULL, 'T2 Select', ARRAY['HHB']::text[], 'Wondrous Item (Tattoo), T2

Produced by a special needle, this magic tattoo appears on your body as a Flying Snake which moves about your skin to avoid being seen by others. This tattoo is given to committed members of the Zhentarim, marking their irrevocable dedication to the Black Network for the remainder of their life.

Zhentilar Dedication. To apply this tattoo, you hold the needle to your skin where you want the tattoo to appear, pressing the needle there for duration of a Short Rest. When you finish the Short Rest, the needle turns into the ink that has become the tattoo, which appears on the skin. After the tattoo is applied, it cannot be removed from you unless you die or are targeted with a Wish spell or Divine Intervention, in which case the tattoo vanishes and the needle reappears in your space. 

Tattoo Attunement. You can only attune to this tattoo if it has been applied to you.

Shadowy Acts (Requires Attunement). You have Advantage on Dexterity (Stealth) and Charisma (Intimidation) checks. Additionally, while you are in Dim Light or Darkness, you can Hide as a Bonus Action even if you are being directly observed.

Zhentarim Diplomacy (Requires Attunement). This tattoo has 6 charges and regains 1d6 expended charges daily at dusk. You can expend 1 or more of the tattoo''s charges to cast one of the following spells from it (save DC 15): Command (1 charge), Fear (3 charges), or Suggestion (2 charges).', '- This homebrew item was created by greensprout
- This item can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 30+ with the Zhentarim. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 5+ DMPC with a Renown Score of 30+ with the Zhentarim can choose to obtain this item in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as an item reward.', 2650.0),
('b92c597a-037b-5834-831c-a37e7a9a7998', 'REW_0266', 'Faceless Eyes of the Zhentarim', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Wondrous Item', false, NULL, 'T4 Select', ARRAY['HHB']::text[], 'Wondrous Item, T4 (Requires Attunement)

This stylized hood of black and gold leaves only the eyes visible. This hood is immediately recognizable as a symbol of the Black Network and is often presented to those that have become a Dread Lord, the highest rank in the Zhentarim''s leadership.

Faceless Gaze. To gaze upon the faceless eyes of this hood is to invite fear. When a creature starts its turn within 30 feet of you and can see you, you can force it to make a DC 19 Wisdom saving throw if you don''t have the Incapacitated condition and can see the creature. On a failed save, the creature has the Frightened condition until the start of its next turn, and if the saving throw fails by 5 or more, the creature''s Speed is reduced to 0 while Frightened in this way. Unless surprised, a creature can avert its eyes to avoid the saving throw at the start of its next turn. If the creature does so, it can''t see you until the start of its next turn, when it can avert its eyes again. If the creature looks at you in the meantime, it must immediately make the save.

Mark for Death. You can take a Magic action to choose one creature you can see within 30 feet of you, marking it until the end of your next turn. The next time you deal damage to the marked creature, the creature has Vulnerability to all of that source''s damage, and then the mark ends.', '- This homebrew item was created by greensprout
- This homebrew item can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 50+ with the Zhentarim. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 17+ DMPC with a Renown Score of 50+ with the Zhentarim can choose to obtain this homebrew item in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as an item reward.', 2660.0),
('4e801b08-f33a-58a7-bc0c-5816ef2264b2', 'REW_0267', 'Dragonmarked Houses', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['EFA']::text[], 'Dragonmarked houses of Eberron. See Eberron: Rising from the Last War for a description and see Eberron: Forge of the Artificer for a list of Renown rewards.', 'All dragonmarked houses listed below function in the following way:
- If you have 3+ Renown Score with a dragonmarked house, you don''t need to expend 1 GP per DTP expended while outside Hawthorne if you are in Khorvaire or another region in Eberron with dragonmarked houses present.
- For a dragonmarked house you have 3+ Renown Score with, you can call in a number of favors up to your Renown Score. If your Renown Score ever falls below the total number of times you’ve requested a favor, you cannot call in a favor again until your Renown Score increases to the required amount.
- You can only call in favors or otherwise benefit from any Renown Perks of a dragonmarked house if you are in Khorvaire or another region in Eberron with dragonmarked houses present.
- You can only have spells cast for you by a member of a dragonmarked house if you are in Khorvaire or another region in Eberron with dragonmarked houses present. Having any spell cast by using a favor costs DTP equal to the requested spell’s level and costs half its usual gold cost as listed. The usual gold cost for a spell cast as a spellcasting service is according to the table in the 2024 PHB (include the cost of any costly components if the spell uses any) or the cost as a Spellcasting Service downtime activity if it is one of the listed spells for the downtime activity. If the spell is listed as provided by a dragonmarked house as listed in Eberron: Rising from the Last War, use that cost as the usual gold cost instead.
- If you have the House Agent background as written to represent being an agent of a dragonmarked house, you have a starting Renown Score of 3 with that house. This is in addition to the starting Renown from character creation.
- If you have one of the house heir backgrounds as written to represent being an heir of a dragonmarked house, you have a starting Renown Score of 5 with that house. This is in addition to the starting Renown from character creation.
- If you are playing a dragonmarked race, you have a starting Renown Score of 5 with the associated house. This is in addition to the starting Renown from character creation.
- Acquiring a Dragonmark feat (except the Aberrant Dragonmark feat) after level 1 increases your Renown Score with the associated house by 1.
- Acquiring the Boon of Siberys feat or another Epic Boon feat that represents a Siberys dragonmark increases your Renown Score with the associated house by 3.
- Acquiring any aberrant dragonmark reduces your Renown Score with any dragonmarked house by 2 when the house''s leadership learns of the mark.', 2670.0),
('f4ffdaa0-68c2-59d0-a276-7f6332ef8867', 'REW_0268', 'House Cannith', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['EFA']::text[], 'Dragonmarked house of Eberron. See Eberron: Rising from the Last War for a description and see Eberron: Forge of the Artificer for a list of Renown rewards.', '- The Favored in House Renown Perk can only be used while in Khorvaire or another region in Eberron with dragonmarked houses present and can be used to purchase any T0 or T1 item in Allowed Content (Loot) for half its listed base cost.
- The Recognized in House Renown Perk can only be used if your Bastion is in Khorvaire or another region in Eberron with dragonmarked houses present.', 2680.0),
('aa72bc18-100e-55f6-9f44-6c849a7fd17a', 'REW_0269', 'House Deneith', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['EFA']::text[], 'Dragonmarked house of Eberron. See Eberron: Rising from the Last War for a description and see Eberron: Forge of the Artificer for a list of Renown rewards.', '- The Favored in House Renown Perk can only be used while in Khorvaire or another region in Eberron with dragonmarked houses present.
- The Recognized in House Renown Perk can only be used if your Bastion is in Khorvaire or another region in Eberron with dragonmarked houses present.', 2690.0),
('c6186154-9935-58ce-8afe-89c06ad4770b', 'REW_0270', 'House Ghallanda', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['EFA']::text[], 'Dragonmarked house of Eberron. See Eberron: Rising from the Last War for a description and see Eberron: Forge of the Artificer for a list of Renown rewards.', '- The Favored in House Renown Perk can only be used while in Khorvaire or another region in Eberron with dragonmarked houses present.
- The Recognized in House Renown Perk can only be used if your Bastion is in Khorvaire or another region in Eberron with dragonmarked houses present.', 2700.0),
('74512b00-98bf-58a6-aa45-fc263ddf91d0', 'REW_0271', 'House Jorasco', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['EFA']::text[], 'Dragonmarked house of Eberron. See Eberron: Rising from the Last War for a description and see Eberron: Forge of the Artificer for a list of Renown rewards.', '- The Favored in House Renown Perk can only be used while in Khorvaire or another region in Eberron with dragonmarked houses present and can be used to purchase any variety of a Potion of Healing in Allowed Content (Equipment) for half its listed cost (or for the GP value of its crafting cost if no cost is listed).
- The Recognized in House Renown Perk can only be used if your Bastion is in Khorvaire or another region in Eberron with dragonmarked houses present.', 2710.0),
('38d160b7-13ed-5136-8fe3-76435855507d', 'REW_0272', 'House Kundarak', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['EFA']::text[], 'Dragonmarked house of Eberron. See Eberron: Rising from the Last War for a description and see Eberron: Forge of the Artificer for a list of Renown rewards.', '- The Favored in House Renown Perk can only be used while in Khorvaire or another region in Eberron with dragonmarked houses present and its benefit lasts 30 days. In character days that pass for the character during an adventure counts towards this time. Each real life day that passes while the character is not adventuring as part of a multisession or campaign also counts towards this time.
- The Recognized in House Renown Perk can only be used if your Bastion is in Khorvaire or another region in Eberron with dragonmarked houses present.', 2720.0),
('3040b7ee-24bf-5cc2-b33c-2ba715e075be', 'REW_0273', 'House Lyrandar', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['EFA']::text[], 'Dragonmarked house of Eberron. See Eberron: Rising from the Last War for a description and see Eberron: Forge of the Artificer for a list of Renown rewards.', '- The Favored in House Renown Perk can be used to secure passage on a sailing ship in Khorvaire or another region in Eberron with dragonmarked houses present at no gold cost. Using the Renown Perk to secure airship or elemental galleon passage in Khorvaire or another region in Eberron with dragonmarked houses present in Eberron costs half its usual cost, with the usual gold cost listed in Eberron: Rising from the Last War, and costs DTP equal to the number of days of travel (rounded up, minimum of 1 DTP).
- The Recognized in House Renown Perk can only be used if your Bastion is in Khorvaire or another region in Eberron with dragonmarked houses present.', 2730.0),
('2c2b24fe-3b39-5b6b-ae6a-9f2132a62c13', 'REW_0274', 'House Medani', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['EFA']::text[], 'Dragonmarked house of Eberron. See Eberron: Rising from the Last War for a description and see Eberron: Forge of the Artificer for a list of Renown rewards.', '- The Favored in House Renown Perk can only be used during an adventure in Khorvaire or another region in Eberron with dragonmarked houses present.
- The Recognized in House Renown Perk can only be used if your Bastion is in Khorvaire or another region in Eberron with dragonmarked houses present.', 2740.0),
('2d55df5c-b616-5e8e-8a72-2769848571a6', 'REW_0275', 'House Orien', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['EFA']::text[], 'Dragonmarked house of Eberron. See Eberron: Rising from the Last War for a description and see Eberron: Forge of the Artificer for a list of Renown rewards.', '- The Favored in House Renown Perk to secure caravan, lightning rail, or teleportation transport in Khorvaire or another region in Eberron with dragonmarked houses present costs half its usual cost, with the usual gold cost listed in Eberron: Rising from the Last War, and costs DTP equal to the number of days of travel (rounded up, minimum of 1 DTP).
- The Recognized in House Renown Perk can only be used if your Bastion is in Khorvaire or another region in Eberron with dragonmarked houses present.', 2750.0),
('13103bbd-e081-5dcd-9e2a-9ea2f595a827', 'REW_0276', 'House Phiarlan', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['EFA']::text[], 'Dragonmarked house of Eberron. See Eberron: Rising from the Last War for a description and see Eberron: Forge of the Artificer for a list of Renown rewards.', '- The Favored in House Renown Perk can only be used while in Khorvaire or another region in Eberron with dragonmarked houses present and can be used to purchase any poison in Allowed Content (Equipment): Poisons for half its listed cost. It can also be used to acquire stolen goods at half cost as determined by a DM during an adventure.
- The Recognized in House Renown Perk can only be used if your Bastion is in Khorvaire or another region in Eberron with dragonmarked houses present.', 2760.0),
('0c76eae4-33b2-58d2-a6c2-49899cf5acd0', 'REW_0277', 'House Sivis', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['EFA']::text[], 'Dragonmarked house of Eberron. See Eberron: Rising from the Last War for a description and see Eberron: Forge of the Artificer for a list of Renown rewards.', '- The Favored in House Renown Perk can only be used while in Khorvaire or another region in Eberron with dragonmarked houses present and can be used to acquire translation or messaging services at no gold cost, as described in Eberron: Rising from the Last War.
- The Recognized in House Renown Perk can only be used if your Bastion is in Khorvaire or another region in Eberron with dragonmarked houses present.', 2770.0),
('5961008d-e791-5924-bb71-d09484ef71a1', 'REW_0278', 'House Tharashk', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['EFA']::text[], 'Dragonmarked house of Eberron. See Eberron: Rising from the Last War for a description and see Eberron: Forge of the Artificer for a list of Renown rewards.', '- The Favored in House Renown Perk can only be used while in Khorvaire or another region in Eberron with dragonmarked houses present and can be used to purchase any T0 or T1 item in Allowed Content (Loot) for half its listed base cost or an Eberron dragonshard worth up to 100 GP for half its usual cost (for example, acquiring an Eberron dragonshard worth 50 GP for only 25 GP).
- The Recognized in House Renown Perk can only be used if your Bastion is in Khorvaire or another region in Eberron with dragonmarked houses present.', 2780.0),
('54b7e168-0a48-5b14-b76e-31cf32870978', 'REW_0279', 'House Thuranni', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['EFA']::text[], 'Dragonmarked house of Eberron. See Eberron: Rising from the Last War for a description and see Eberron: Forge of the Artificer for a list of Renown rewards.', '- The Favored in House Renown Perk can only be used while in Khorvaire or another region in Eberron with dragonmarked houses present and can be used to purchase any poison in Allowed Content (Equipment): Poisons for half its listed cost. It can also be used to acquire stolen goods at half cost as determined by a DM during an adventure.
- The Recognized in House Renown Perk can only be used if your Bastion is in Khorvaire or another region in Eberron with dragonmarked houses present.', 2790.0),
('14a57fcf-d056-5ff4-bf0b-57577e7b3f82', 'REW_0280', 'House Vadalis', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['EFA']::text[], 'Dragonmarked house of Eberron. See Eberron: Rising from the Last War for a description and see Eberron: Forge of the Artificer for a list of Renown rewards.', '- The Favored in House Renown Perk can only be used while in Khorvaire or another region in Eberron with dragonmarked houses present and can be used to purchase any Pet or Mount listed in Allowed Content (Equipment) for half its listed gold cost.
- The Recognized in House Renown Perk can only be used if your Bastion is in Khorvaire or another region in Eberron with dragonmarked houses present.', 2800.0),
('4c6c701f-8f10-5cdc-868b-ff5faa073446', 'REW_0281', 'Morgrave University', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['EFA']::text[], 'Group patron and institution of higher learning in Eberron. See Eberron: Rising from the Last War for a description and see Eberron: Forge of the Artificer for a list of patron benefits.', '- The Group Patron benefits as listed in Eberron: Forge of the Artificer can only be accessed if you have Renown Score 3+ with this group. Details on how each benefit can be used are below.
- Group Assistance can be used by you as written once before you finish a Long Rest.
- For Compensation, you don''t need to expend 1 GP per DTP expended while outside Hawthorne if you are in Khorvaire or another region in Eberron with dragonmarked houses present.
- The Research benefit can only be used if your Bastion is in Khorvaire or another region in Eberron with dragonmarked houses present. Additionally, while in Khorvaire or another region in Eberron with dragonmarked houses present, you can arrange for the Research downtime activity to be conducted on your behalf (using an Intelligence bonus of +4) but must cover the gold and DTP cost yourself.
- You can only gain the benefit of Training while in Khorvaire or another region in Eberron with dragonmarked houses present, which costs 30 DTP to gain the listed benefit.', 2810.0),
('71993046-a335-5d35-8a2c-dc3cb600345d', 'REW_0282', 'Commoner Crew (Baldur''s Gate)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Community)', false, NULL, '—', ARRAY['FRAIF']::text[], 'See Forgotten Realms: Adventures in Faerûn for a description and list of Renown rewards.', '- For the Renown Score 3+ benefit, you don''t need to expend 1 GP per DTP expended while outside Hawthorne if you are in Baldur''s Gate
- For the Renown Score 5+ benefit, you can only purchase tools at half cost if you are in Baldur''s Gate
- The Renown Score 15+ and Renown Score 25+ benefits can only be used if you are in Baldur''s Gate', 2820.0),
('4efd051e-ced3-5380-ba1c-03692d72ab7a', 'REW_0283', 'Flaming Fist (Baldur''s Gate)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Faction)', false, NULL, '—', ARRAY['FRAIF']::text[], 'See Forgotten Realms: Adventures in Faerûn for a description and list of Renown rewards.', '- For the Renown Score 3+ benefit, you don''t need to expend 1 GP per DTP expended while outside Hawthorne if you are in Baldur''s Gate
- The Renown Score 25+ benefit can only be used if you are in Baldur''s Gate
- For the Renown Score 30 benefit, the magic item obtained is a T2 magic item of your choice in Allowed Content (Loot) and must be logged in the session or downtime log in which you reached this Renown score.', 2830.0),
('6342a4a5-7249-5f3b-9797-cef68ae9544e', 'REW_0284', 'The Guild (Baldur''s Gate)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Faction)', false, NULL, '—', ARRAY['FRAIF']::text[], 'See Forgotten Realms: Adventures in Faerûn for a description and list of Renown rewards.', '- For the Renown Score 3+ benefit, you don''t need to expend 1 GP per DTP expended while outside Hawthorne if you are in Baldur''s Gate
- For the Renown Score 5+ benefit, you can only purchase the listed tools at half cost if you are in Baldur''s Gate
- For the Renown Score 10 benefit, you must exchange a T0 magic item to obtain a T1 magic item of your choice in Allowed Content (Loot) and must be logged in the session or downtime log in which you reached this Renown score.
- The Renown Score 25+ and Renown Score 40+ benefits can only be used if you are in Baldur''s Gate', 2840.0),
('e2555f8a-4c7b-5e6c-81a4-3245ded06c71', 'REW_0285', 'Genie Faction (Calimshan)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Faction)', false, NULL, '—', ARRAY['FRAIF']::text[], 'See Forgotten Realms: Adventures in Faerûn for a description and list of Renown rewards.', '- Renown is tracked separately for each genie faction in Calimshan and its associated city: Dao (in Olympus Dag), Djinn (in Burin Bir), Efreet (in Gozva Ka), and Marids (in Maran Saya).
- For the Renown Score 3+ benefit, you don''t need to expend 1 GP per DTP expended while outside Hawthorne if you are at the associated genie city.
- For the Renown Score 5+ benefit, you can only purchase the listed items at half cost while you are in Calimshan.
- For the Renown Score 10 benefit, the Charm obtained is one item slot''s worth of a T1 or lower Charm of your choice in Allowed Content (Other Rewards) and must be logged in the session or downtime log in which you reached this Renown score.
- The Renown Score 40+ benefit can only be used if you are in Calimshan
- For the Renown Score 50 benefit, the Blessing obtained is T3 or lower Supernatural Gift of your choice in Allowed Content (Other Rewards) and must be logged in the session or downtime log in which you reached this Renown score.', 2850.0),
('a7b585d9-c12e-5566-bcde-dc1779d8f0c4', 'REW_0286', 'Sultana (Calimshan)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['FRAIF']::text[], 'See Forgotten Realms: Adventures in Faerûn for a description and list of Renown rewards.', '- For the Renown Score 3+ benefit, you don''t need to expend 1 GP per DTP expended while outside Hawthorne if you are in Calimport
- For the Renown Score 5+ benefit, the discount also applies to the gold cost of any spellcasting services in Calimport
- For the Renown Score 5+ and 25+ benefits, you can only use this benefit if your Bastion is in Calimshan.', 2860.0),
('f71aa210-248d-589e-b4e3-c5b02585a488', 'REW_0287', 'Dale (Dalelands)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Community)', false, NULL, '—', ARRAY['FRAIF']::text[], 'See Forgotten Realms: Adventures in Faerûn for a description and list of Renown rewards.', '- Renown is tracked separately for each dale of the Dalelands: Archendale, Battledale, Daggerdale, Deepingdale, Featherdale, Harrowdale, High Dale, Mistledale, Scardale, Shadowdale, and Tasseldale.
- For the Renown Score 5+ benefit, you can obtain a 10% discount when purchasing any nonmagical item in Allowed Content (Equipment) worth 2,000 GP or less while you are at the associated dale.
- For the Renown Score 10+ benefit, you don''t need to expend 1 GP per DTP expended while outside Hawthorne if you are at the associated dale.
- For the Renown Score 25+ benefit, obtaining the services of a spellcaster of the associated dale to cast a spell of level 3 or lower costs no DTP or GP but you must still cover the cost of any Material components. Any spells cast this way to achieve a lasting effect still cost DTP equal to the spell''s level (minimum of 1 DTP).
- For the Renown Score 30 benefit, the magic item obtained is a T2 magic item of your choice in Allowed Content (Loot) and must be logged in the session or downtime log in which you reached this Renown score.', 2870.0),
('b2d0dd5b-956e-5d81-9882-c6dbcab027ab', 'REW_0288', 'Ten-Towns (Icewind Dale)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Community)', false, NULL, '—', ARRAY['FRAIF']::text[], 'See Forgotten Realms: Adventures in Faerûn for a description and list of Renown rewards.', '- Renown is tracked separately for each settlement of Ten-Towns: Bremen, Bryn Shander, Caer-Dineval, Caer-Konig, Dougan''s Hole, Easthaven, Good Mead, Lonelywood, Targos, and Termalaine.
- For the Renown Score 5+ benefit, you don''t need to expend 1 GP per DTP expended while outside Hawthorne if you are at the associated settlement.
- The Renown Score 15+ benefit can only be used if you are at the associated settlement.', 2880.0),
('ebc01d89-3253-500f-80ee-a97c1090509f', 'REW_0289', 'Cult of Chthonic Night (Innsmouth)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['RHW']::text[], 'See Ravenloft: The Horrors Within for a description and list of Renown rewards.', '- For the Renown Score 10+ benefit, you can participate in a ritual in Innsmouth during an adventure or as overseen by a DM to gain the Gathered Whispers Dark Gift feat from Ravenloft: The Horrors Within. If you already have this as a Dark Gift feat, you only gain the benefit of one at a time. 
- You can’t gain another Dark Gift feat from the cults of Innsmouth while you have this Dark Gift feat, and when you leave Innsmouth, you can either choose to lose or keep this Dark Gift feat.
- The Dark Gift feat you gain from the cults of Innsmouth can’t be replaced by any means except by choosing to lose it when leaving Innsmouth and participating in another ritual with the cults of Innsmouth to gain a Dark Gift feat.
- The Dark Gift feat you gain from one of the cults of Innsmouth isn’t a Dark Gift (Supernatural Reward) as in Allowed Content: Other Rewards (Dark Gifts) and doesn’t count against the limit of 1 Dark Gift (Supernatural Reward) at a time.', 2890.0),
('054a2339-960f-5cd0-8211-d206b0e117c8', 'REW_0290', 'Cult of the Drowning Wave (Innsmouth)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['RHW']::text[], 'See Ravenloft: The Horrors Within for a description and list of Renown rewards.', '- For the Renown Score 10+ benefit, you can participate in a ritual in Innsmouth during an adventure or as overseen by a DM to gain the Symbiotic Being Dark Gift feat from Ravenloft: The Horrors Within. If you already have this as a Dark Gift feat, you only gain the benefit of one at a time. 
- You can’t gain another Dark Gift feat from the cults of Innsmouth while you have this Dark Gift feat, and when you leave Innsmouth, you can either choose to lose or keep this Dark Gift feat.
- The Dark Gift feat you gain from the cults of Innsmouth can’t be replaced by any means except by choosing to lose it when leaving Innsmouth and participating in another ritual with the cults of Innsmouth to gain a Dark Gift feat.
- The Dark Gift feat you gain from one of the cults of Innsmouth isn’t a Dark Gift (Supernatural Reward) as in Allowed Content: Other Rewards (Dark Gifts) and doesn’t count against the limit of 1 Dark Gift (Supernatural Reward) at a time.', 2900.0),
('3d5e03a5-a6c9-5396-8c61-09d062a75271', 'REW_0291', 'Cult of the Heavenly Doom (Innsmouth)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['RHW']::text[], 'See Ravenloft: The Horrors Within for a description and list of Renown rewards.', '- For the Renown Score 10+ benefit, you can participate in a ritual in Innsmouth during an adventure or as overseen by a DM to gain the Touch of Death Dark Gift feat from Ravenloft: The Horrors Within. If you already have this as a Dark Gift feat, you only gain the benefit of one at a time. 
- You can’t gain another Dark Gift feat from the cults of Innsmouth while you have this Dark Gift feat, and when you leave Innsmouth, you can either choose to lose or keep this Dark Gift feat.
- The Dark Gift feat you gain from the cults of Innsmouth can’t be replaced by any means except by choosing to lose it when leaving Innsmouth and participating in another ritual with the cults of Innsmouth to gain a Dark Gift feat.
- The Dark Gift feat you gain from one of the cults of Innsmouth isn’t a Dark Gift (Supernatural Reward) as in Allowed Content: Other Rewards (Dark Gifts) and doesn’t count against the limit of 1 Dark Gift (Supernatural Reward) at a time.', 2910.0),
('494d1cb0-2607-595b-9d3e-26224280343a', 'REW_0292', 'Cult of the Scaly Abyss (Innsmouth)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['RHW']::text[], 'See Ravenloft: The Horrors Within for a description and list of Renown rewards.', '- For the Renown Score 10+ benefit, you can participate in a ritual in Innsmouth during an adventure or as overseen by a DM to gain the Aberrant Anatomy Dark Gift feat from Ravenloft: The Horrors Within. If you already have this as a Dark Gift feat, you only gain the benefit of one at a time. 
- You can’t gain another Dark Gift feat from the cults of Innsmouth while you have this Dark Gift feat, and when you leave Innsmouth, you can either choose to lose or keep this Dark Gift feat.
- The Dark Gift feat you gain from the cults of Innsmouth can’t be replaced by any means except by choosing to lose it when leaving Innsmouth and participating in another ritual with the cults of Innsmouth to gain a Dark Gift feat.
- The Dark Gift feat you gain from one of the cults of Innsmouth isn’t a Dark Gift (Supernatural Reward) as in Allowed Content: Other Rewards (Dark Gifts) and doesn’t count against the limit of 1 Dark Gift (Supernatural Reward) at a time.', 2920.0),
('2d476780-3648-561c-8d73-5379e931d249', 'REW_0293', 'Ramya Vasavadan (Kalakeri)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['RHW']::text[], 'See Ravenloft: The Horrors Within for a description and list of Renown rewards.', NULL, 2930.0),
('bd52f886-b9f3-5d53-9085-f233be50b1b6', 'REW_0294', 'Arijani and Reeva Vasavadan (Kalakeri)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['RHW']::text[], 'See Ravenloft: The Horrors Within for a description and list of Renown rewards.', NULL, 2940.0),
('77d95597-aeb4-5559-9bfa-aed3e042dd2d', 'REW_0295', 'Kendrick Family (Moonshae Isles)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['FRAIF']::text[], 'See Forgotten Realms: Adventures in Faerûn for a description and list of Renown rewards.', '- For the Renown Score 5+ benefit, you don''t need to expend 1 GP per DTP expended while outside Hawthorne if you are in Alaron
- The Renown Score 30+ benefit can only be used if you are in the Moonshae Isles', 2950.0),
('f3fff4f0-33d7-54e2-86a2-dcf32ce54ea2', 'REW_0296', 'High Lady Ordalf (Moonshae Isles)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['FRAIF']::text[], 'See Forgotten Realms: Adventures in Faerûn for a description and list of Renown rewards.', '- For the Renown Score 5 benefit, the magic item obtained is a T0 magic item of your choice in Allowed Content (Loot) and must be logged in the session or downtime log in which you reached this Renown score.
- For the Renown Score 15 benefit, the magic item obtained is a T2 magic item of your choice in Allowed Content (Loot) and must be logged in the session or downtime log in which you reached this Renown score. The pet Blink Dog has a name, alignment, and personality as determined by you and is treated as a Pet as described in Allowed Content (Equipment): Pets', 2960.0),
('57a2417a-5cf6-546c-95fa-dbefdf57d02f', 'REW_0297', 'Jarl Olfsvenn (Moonshae Isles)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['FRAIF']::text[], 'See Forgotten Realms: Adventures in Faerûn for a description and list of Renown rewards.', 'The Renown Score 30+ benefit can only be used if you are in the Moonshae Isles', 2970.0),
('2e1273eb-8984-5115-a160-54a5b6709a2a', 'REW_0298', 'Moonshae Druids (Moonshae Isles)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['FRAIF']::text[], 'See Forgotten Realms: Adventures in Faerûn for a description and list of Renown rewards.', '- For the Renown Score 5+ benefit, you can only use the discount while you are in the Moonshae Isles
- For the Renown Score 15+ benefit, you can purchase level 5 or lower spell scrolls of Druid scrolls while in the Moonshae Isles. The purchase cost of a spell scroll is equal to twice its listed gold cost to scribe a spell scroll of that level in Allowed Content (Downtime).
- The Renown Score 30 benefit can be reused the next time your Renown score increases by 5 or more since you last used it.', 2980.0),
('004532de-6580-5b10-91a9-ee663ab6d94b', 'REW_0299', 'Knights of the Black Gauntlet (Bane)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['FRHOF']::text[], 'See Forgotten Realms: Heroes of Faerûn for a description and list of Renown rewards.', 'If you''re a member of this organization, you don''t need to expend 1 GP per DTP expended while outside Hawthorne if you are at a location with a temple to Bane or a Knights of the Black Gauntlet outpost', 2990.0),
('c07676e9-b039-5997-a030-5420f4e010ae', 'REW_0300', 'Seeds of Cultivation (Chauntea)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['FRHOF']::text[], 'See Forgotten Realms: Heroes of Faerûn for a description and list of Renown rewards.', '- You must have a Renown Score of 5+ to become a respected member of this group.
- If you don''t have a Renown Score of 5+ with this organization to join it, you can expend 365 DTP tending to a rural community in Faerûn on behalf of the Seeds of Cultivation. Your Renown Score then becomes 5 and you can join this faction.', 3000.0),
('cabba6ee-ffaa-5297-bd79-11a2d4a22872', 'REW_0301', 'Gatherers of Gond (Gond)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['FRHOF']::text[], 'See Forgotten Realms: Heroes of Faerûn for a description and list of Renown rewards.', 'You must have a Renown Score of 5+ to become a respected member of this group.', 3010.0),
('75c40620-7736-5c9c-a7c0-cd5efccaa8ae', 'REW_0302', 'Everwatch Knights (Helm)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['FRHOF']::text[], 'See Forgotten Realms: Heroes of Faerûn for a description and list of Renown rewards.', NULL, 3020.0),
('99a0326d-6785-573c-b702-02c92cb597bf', 'REW_0303', 'Broken Ones (Ilmater)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['FRHOF']::text[], 'See Forgotten Realms: Heroes of Faerûn for a description and list of Renown rewards.', 'If you''re a member of this organization, you don''t need to expend 1 GP per DTP expended while outside Hawthorne if you are at a location with a temple or monastery to Ilmater', 3030.0),
('848b3e9a-71f4-508b-8405-59a3cfdd6972', 'REW_0304', 'Knights of the Eternal Order (Kelemvor)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['FRHOF']::text[], 'See Forgotten Realms: Heroes of Faerûn for a description and list of Renown rewards.', '- The armor gained when joining this organization is any type of armor of the PC''s choice, which cannot be sold or traded.
- If you''re a member of this organization, you don''t need to expend 1 GP per DTP expended while outside Hawthorne if you are at a location with a temple to Kelemvor', 3040.0),
('a0524b58-2167-58d4-8f03-d1d6359cbcb6', 'REW_0305', 'Dawnbringers (Lathander)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['FRHOF']::text[], 'See Forgotten Realms: Heroes of Faerûn for a description and list of Renown rewards.', 'You must have a Renown Score of 5+ to become a respected member of this group.', 3050.0),
('b15b349a-54ee-5952-8ee4-37cfcbbb8325', 'REW_0306', 'Silken Stewards (Lolth)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['FRHOF']::text[], 'See Forgotten Realms: Heroes of Faerûn for a description and list of Renown rewards.', NULL, 3060.0),
('86f9f10f-4b48-539d-8da6-8361cdb3da38', 'REW_0307', 'Knights of the Mystic Fire (Mystra)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['FRHOF']::text[], 'See Forgotten Realms: Heroes of Faerûn for a description and list of Renown rewards.', 'If you''re a member of this organization, you don''t need to expend 1 GP per DTP expended while outside Hawthorne if you are at a location with a temple to Mystra', 3070.0),
('b12c20a4-e0cb-5e95-b8a6-850a3d29eba5', 'REW_0308', 'Swords of the Lady (Selûne)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['FRHOF']::text[], 'See Forgotten Realms: Heroes of Faerûn for a description and list of Renown rewards.', '- If you''re a member of this organization, you don''t need to expend 1 GP per DTP expended while outside Hawthorne if you are at a location with a holding of the Swords of the Lady
- If you''re a member of this organization, you can purchase Silvered Weapons or have an existing weapon silvered at half its normal gold cost', 3080.0),
('55473038-ea82-5c8d-9987-f08409a6e99b', 'REW_0309', 'Order of the Dark Moon (Shar)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['FRHOF']::text[], 'See Forgotten Realms: Heroes of Faerûn for a description and list of Renown rewards.', 'If you''re a member of this organization, you don''t need to expend 1 GP per DTP expended while outside Hawthorne if you are at a location with a temple or other structure dedicated to Shar', 3090.0),
('433dba0e-b0e9-5436-958b-f145f471ec1d', 'REW_0310', 'Sodality of the Ruby Rose (Sune)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['FRHOF']::text[], 'See Forgotten Realms: Heroes of Faerûn for a description and list of Renown rewards.', 'If you''re a member of this organization, you don''t need to expend 1 GP per DTP expended while outside Hawthorne if you are at a location with a temple or other structure dedicated to Sune', 3100.0),
('d88d61a8-ccb6-5108-ae72-16fd0e688b9f', 'REW_0311', 'Stormknives (Tempus)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['FRHOF']::text[], 'See Forgotten Realms: Heroes of Faerûn for a description and list of Renown rewards.', NULL, 3110.0),
('14ef8f5a-4d6e-54d1-9354-fdcd497aad97', 'REW_0312', 'Order of the Golden Lion (Torm)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Organization)', false, NULL, '—', ARRAY['FRHOF']::text[], 'See Forgotten Realms: Heroes of Faerûn for a description and list of Renown rewards.', 'You must have a Renown Score of 5+ to become a respected member of this group.', 3120.0),
('3095e9e5-c79c-5e00-a098-f44d068c1575', 'REW_0313', 'Court of Dunes', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Faction)', false, NULL, '—', ARRAY['HHB']::text[], 'The Court of Dunes is a Domain of Delight within the Feywild that resides within a sprawling oasis amidst a vast enchanted desert whose golden grains ripple like waves under an eternal sun. It is a realm where the sands of time and magic intertwine, with its denizens residing in sand caves scattered around the desert as well as beneath the oasis itself. At the heart of oasis lies the Resplendent Palace, which appears to be carved frm the finest quartz and constantly shifts and rearranges itself like the very dunes that surround it. The palace is the seat of power of the archfey that rules over the Court, Isetaari, the Queen of Sand. The Court of Dunes has only recently come into its own as a power in the Feywild due to the Sand Queen and her capacity to manipulate time. A wise and enigmatic individual, the Sand Queen embodies and is as unpredictable as the shifting sands of the desert: nurturing and tranquil at one moment, but just as easily ferocious and unforgiving should the situation demand it.

Court of Dunes Renown
Renown Score     Reward
3                            Gem of the Dune Court (HB)
10+                        At Home in the Dunes
25+                        Gather the Court
30                          Sage''s Sight (HB)

Motto: Mystery, Magic, and Mutual Respect

Goals
- Collect Secrets and Fortunes to Empower the Sand Queen
- Safeguard honor, tradition, and hospitality.
- Cultivate a network of informants and allies to stay vigilant across regions.

Beliefs
- The Court of Dunes thrives on the delicate interplay between magic and nature.
- Its inhabitants admire the desert’s beauty and respect its harshness, believing that true strength lies in adaptability and resilience.
- Rituals are often centered around the sun and moon, symbolizing guidance and dreams.

Ranks
- Nomad: Renown Score 3+
- Ustaaz: Renown Score 15+
- Sheikh: Renown Score 25+
- Amir: Renown Score 40+
- Sultan: Renown Score 50+', '- This group was created by empress5002 and salah_ad_din
- Traits: Members of the Court of Dunes are usually associated with a desert location or desert-themed activity. Merchants, nomads, scholars, adventurers of all sorts, prophets, seers, and fortune tellers are among those who seek the community of the Court of Dunes. The word "Sharikat" is used for the community as it exists across all realms. For members, the Court of Dunes is a sanctuary where magic and community converge, nurturing a way of life that balances tradition with the enchantment of the unknown. The community thrives on the principles of cooperation and loyalty, each member playing a role that supports the whole. Members desire to shape their destiny while preserving the timeless elegance of their desert heritage and ensuring the prosperity and harmony of their home. Community members frequently visit one another for shared meals and storytelling sessions, often filled with music and laughter, creating an ambiance of warmth and unity. 
- DMs and players seeking more information regarding this faction should contact empress5002 or salah_ad_din
- Only DMs that are collaborating with empress5002 or salah_ad_din with their permission can award Renown Score with the Court of Dunes to player characters
- Only players collaborating with empress5002 or salah_ad_din with their permission can obtain starting Renown with this faction', 3130.0),
('354b49a4-b763-5276-8117-8345d4657609', 'REW_0314', 'Gem of the Dune Court (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Renown Perk (Renown Score 3) (T0 Permanent)', true, NULL, 'T0 (DM Select)', ARRAY['HHB']::text[], 'Wondrous item, T0

As a newly inducted member of the Court of Dunes, you gain access to its outer courts and have been gifted this gem by Lady Sirocco, archfey and ambassador of the Court of Dunes.

While this gem is on your person, you have Advantage on Intelligence (Investigation) checks made to uncover secrets.

Message. While holding the gem, you can take a Magic action to cause the gem to emit a magical pulse of light and cast the Message spell, except its range is 300 feet. This property of the gem can''t be used again until the next dawn.', '- This homebrew item was created by empress5002 and salah_ad_din
- This homebrew item can only ever be obtained as a Renown Perk (Renown Score 3) as part of the Court of Dunes', 3140.0),
('c65e0a32-0b4b-5337-ad46-6d095da83d0d', 'REW_0315', 'At Home in the Dunes', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Renown Perk (Renown Score 10+)', true, NULL, 'T1 Select (DM Select)', ARRAY['HHB']::text[], 'Renown Perk, T1 (Requires Renown Score 10+)

You''ve shown your loyalty to the Court of Dunes and have been taught how to survive in the desert. You have Advantage on ability checks made to survive in the desert, and you can find food and fresh water for yourself and up to five other people each day, provided that the land offers sources of food and water.', '- This Renown Perk was created by empress5002 and salah_ad_din
- This Renown Perk can only ever be obtained as a Renown Perk (Renown Score 10+) as part of the Court of Dunes', 3150.0),
('67833165-ecea-56b8-a9d7-ec65af46ba73', 'REW_0316', 'Gather the Court', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Renown Perk (Renown Score 25+)', true, NULL, 'T1 Select (DM Select)', ARRAY['HHB']::text[], 'Renown Perk, T1 (Requires Renown Score 25+)

You are a champion of the Court of Dunes, with your actions recognized to have brought knowledge of secrets and portents of fortune. During adventures in the Material Plane or the Feywild, you can spend 7 days to call upon major aid from the Court of Dunes and obtain assistance from Court spellcasters or other support. The nature of this assistance is determined by the DM.', '- This renown perk was created by empress5002 and salah_ad_din
- This Renown Perk can only ever be obtained as a Renown Perk (Renown Score 10+) as part of the Court of Dunes', 3160.0),
('b1265bbd-74b8-5d4c-ab19-cc789616c65b', 'REW_0317', 'Sage''s Sight (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Renown Perk (Renown Score 30) (T2 Permanent)', true, NULL, 'T2 Select (DM Select)', ARRAY['HHB']::text[], 'Wondrous item, T2 (Requires Attunement)

The gem you received when you originally joined the Court of Dunes has been upgraded and imbued with a greater capacity to perceive hidden truths. 

This gem has the properties of a Gem of the Dune Court and a Gem of Seeing.', '- This homebrew item was created by empress5002 and salah_ad_din
- This homebrew item can only ever be obtained as a Renown Perk (Renown Score 30) as part of the Court of Dunes', 3170.0),
('0ec828e9-2464-5948-9a18-8940c10cad27', 'REW_0318', 'Sovereign of the Dunes (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Supernatural Gift', true, NULL, 'T4 Select (DM Select)', ARRAY['HHB']::text[], 'Supernatural Gift, T4

As a Sultan of the Court of Dunes, you''ve achieved the highest rank of leadership within the Court other than the Queen herself and been inducted into its deepest mysteries, with the Queen of Sand bestowing her boon and favor upon you. While this Supernatural Gift is active, you gain the following traits.

Sultan''s Sanctuary. You are immune to curses, disease, and magical contagions and have the benefits of an Amulet of Proof Against Detection and Location. Additionally, you stop aging: you are immune to any effect that would age you, and you can''t die from old age.

Gift of the Sands. When you select this Supernatural Gift to be active when finishing a Long Rest, choose one of the following options below to benefit from. You can only benefit from one option at a time.
- Gift of the Blazing Sun. You can cast the Absorb Elements spell at will, requiring no components. Additionally, you can cast the Plane Shift spell, requiring no components and targeting yourself only, with the destination being the Court of Dunes in the Feywild. After you cast Plane Shift in this way, you can''t do so again until you finish a Long Rest.
- Queen''s Favor. You can take a Magic action to shape-shift into a Sphinx of Secrets. You retain your game statistics and ability to speak, but your creature type, size, AC, movement modes, Strength, and Dexterity are replaced by those of the Sphinx of Secrets stat block, and you gain any statistics and capabilities that the Sphinx of Secrets stat block has that you lack. You remain shape-shifted in this way until you are reduced to 0 Hit Points, die, or end it as a Bonus Action. After you shape-shift in this way, you can''t do so again until you finish a Short or Long Rest.
- Sultan''s Ascent. You can cast the Clairvoyance spell at will, requiring no components. Additionally, you can cast the Plane Shift spell, requiring no components and targeting yourself only, with the destination being a desert location in the Feywild. After you cast Plane Shift in this way, you can''t do so again until you finish a Long Rest.', '- This Supernatural Gift was created by empress5002 and salah_ad_din
- This homebrew Supernatural Gift can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 50+ with the Court of Dunes. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 17+ DMPC with a Renown Score of 50+ with the Court of Dunes can choose to obtain this Supernatural Gift in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as a Supernatural Gift using an item slot.', 3180.0),
('96e0466c-c847-596c-8ad9-c0e5aa470958', 'REW_0319', 'Crime Family', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Faction)', false, NULL, '—', ARRAY['HHB']::text[], 'This is a template that can be used for groups that consist of organized criminal organizations based around an extended family. Goals of such crime families are the preservation of family power and influence and co-existence with other powerful families, with the ambition of becoming the most powerful and prominent family in the region. Crime families in this way are almost always based in a city or other locale and extended region.

Any renown gained is specific to a particular group that uses this template. For example, gaining renown with the Nazz Gang (Crime Family) would be separate from renown gained for a different crime family.

The motto, goals, beliefs, and ranks are always specific to any given crime family as designed by the DM. The following are generic examples that can be used and modified by any DM.

Crime Family Renown
Renown Score     Reward
3                            Family Insignia (HB)
10+                        Laying Low
15+                        An Offer They Can''t Refuse
25+                        Cash in the Chips
50+                        Heir to the Throne

Motto: Family before everything.

Goals
- Amass wealth and build a network of influence
- Gain influence over important people and organizations
- Gain control over areas of the local economy and society
- Gain power and respect in both the underworld and in legitimate society

Beliefs
- Once you join the family, you''re in it for life
- Loyalty comes first: never betray the family
- The good of the family comes before what''s good for your self

Ranks
- Runner: Renown Score 3+
- Enforcer: Renown Score 15+
- Crew Chief: Renown Score 25+
- Lieutenant: Renown Score 40+
- Crime Boss: Renown Score 50+', '- This group template was created by salah_ad_din
- Crime families can be found in most cities. A specific crime family''s area of influence is typically localized to a region, often only a single city.
- Traits: A member of a crime family belongs to a powerful criminal organization and family, via relation or recruitment. The crime family demands loyalty and service in exchange for prestige, power, and protection. While the specific rules of conduct differ from crime family to crime family, every crime family demands loyalty and service from its members in exchange for power, prestige, and protection. Respect of higher ranking members of the crime family is expected as well as respect for the specific tenets and traditions of the crime family. As loyalty is the core principle of every crime family, betrayal is the ultimate crime, frequently punished by death.
- DMs and player seeking more information on a specific crime family should contact the DM that created the crime family
- Only DMs that are collaborating with the DM that created a specific crime family with their permission can award Renown Score with that crime family to player characters
- Only players collaborating with the DM that created a specific crime family with their permisison can obtain starting Renown with the faction', 3190.0),
('5d72b760-3be9-5238-9acc-143dcf06e8a2', 'REW_0320', 'Family Insignia (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Renown Perk (Renown Score 3) (Trinket)', true, NULL, 'T0 (DM Select)', ARRAY['HHB']::text[], 'Trinket, T0

As newly inducted member of a crime family, you have been presented with a family insignia: a ring, a coin, a tattoo, or some other ornament appropriate to the family. The insignia bears the symbol of the crime family and is unique to each crime family.

When you display this insignia in the area where the crime family exerts its influence, you have Advantage on Intimidation checks made against merchants, travelers, and others that fear and respect the influence of the crime family in the region.', '- This homebrew item was created by salah_ad_din
- This homebrew item can only ever be obtained as a Renown Perk (Renown Score 3) as part of the specific crime family', 3200.0),
('6674018b-1852-51c8-b793-22feb93f1fbf', 'REW_0321', 'Laying Low', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Renown Perk (Renown Score 10+)', true, NULL, 'T1 Select (DM Select)', ARRAY['HHB']::text[], 'Renown Perk, T1 (Requires Renown Score 10+)

You''ve gained access to a safe house you can access on short notice when there''s too much heat. During an adventure in the area the crime family exerts its influence, you can obtain access to a hidden safe house for yourself and up to five others. The safe house contains basic supplies for up to two days. You can''t leave this safe house and return to it. The availability, exact location, and exact contents of the safe house are determined by the DM.', '- This Renown Perk was created by salah_ad_din
- This Renown Perk can only ever be obtained as a Renown Perk (Renown Score 10+) as part of the specific crime family', 3210.0),
('86dc966d-ed35-5110-9fa1-8c8266c4ec93', 'REW_0322', 'An Offer They Can''t Refuse', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Renown Perk (Renown Score 15+)', true, NULL, 'T1 Select (DM Select)', ARRAY['HHB']::text[], 'Renown Perk, T1 (Requires Renown Score 15+)

You''ve climbed the ranks of the crime family and are in charge of a crew of your own to manage. While in the area the crime family exerts its influence, you have Advantage on Charisma (Intimidation or Persuasion) checks. 

Additionally, if you spend 1 minute or more talking to someone who can understand what you say while in the area the crime family exerts its influence, you can force the target to make a Wisdom saving throw, with the DC equal to 8 + your Proficiency Bonus + your Strength or Charisma modifier (your choice). On a failed save, the target has the Charmed and Frightened condition for 1 hour. On a successful save, the target can''t be Charmed or Frightened by you in this way for 24 hours. If you or your companions harm the target, it can repeat the Wisdom saving throw with Advantage on the saving throw and ending the Charmed and Frightened condition on a success.', '- This renown perk was created by salah_ad_din
- This Renown Perk can only ever be obtained as a Renown Perk (Renown Score 15+) as part of the specific crime family', 3220.0),
('514c0ff1-23e8-5321-9252-bf7e48d0236d', 'REW_0323', 'Cash in the Chips', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Renown Perk (Renown Score 25+)', true, NULL, 'T1 Select (DM Select)', ARRAY['HHB']::text[], 'Renown Perk, T1 (Requires Renown Score 25+)

You''ve continued to gain renown and respect within the crime family, becoming the right hand of its highest leadership. During adventures in areas the crime family exerts its influence, you can spend 7 days to call upon major aid from the crime family. The nature of this assistance is determined by the DM.', '- This renown perk was created by salah_ad_din
- This Renown Perk can only ever be obtained as a Renown Perk (Renown Score 25+) as part of the specific crime family', 3230.0),
('c6eca835-c245-5214-829a-0c8a8135aefc', 'REW_0324', 'Heir to the Throne', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Renown Perk (Renown Score 50+)', true, NULL, 'T3 Select (DM Select)', ARRAY['HHB']::text[], 'Renown Perk, T3 (Requires Renown Score 50+)

As a Crime Boss of the crime family, you''ve entered the highest echelon of leadership within the organization and have gained a position of power, prestige, and respect within the family. If you are not yourself related to the crime family, you have proven yourself to be the next closest thing to it. You gain the following benefits.

Bodyguard. You have been assigned a loyal and high ranking Lieutenant in the crime family to act as a bodyguard to protect your person, with the statistics of a Bandit Crime Lord or a Warrior Commander (your choice), with alignment, appearance, name, and personality determined by you. The bodyguard is under the DM''s control but regards you as a trusted ally to be heeded and protected, with their life if necessary. If this bodyguard is ever killed, you must arrange for their resurrection yourself. You can replace a dead or missing bodyguard by expending 30 DTP and 10,000 GP while in an area the crime family exerts its influence.

Spread Influence. While in a settlement such as a village, town, or city during an adventure, you can attempt to extend the influence of the crime family into the settlement over the course of 30 days of work by expending 30 DTP and 1000 GP. You must make a Charisma check and gain a +1 bonus to the check for each 1000 GP you additionally spend on the effort beyond the initial 1000 GP, up to a maximum bonus of +10. The DC of this ability check is 15 for a village, 20 for a town, and 25 for a city. If you succeed on the Charisma check, you extend the influence of crime family into the settlement in a manner as determined by the DM. If you fail the Charisma check by 5 or more, you are rebuffed by local authorities or possibly other rival criminal organizations as determined by the DM and may face possible imprisonment or banishment as determined by the DM. 

Untouchable. The crime family has put you in contact with powerful spellcasters to keep your activities out of the public eye. While in an area the crime family exerts its influence, you can''t be targeted by Divination spells or perceived through magical scrying sensors unless you allow it.', '- This renown perk was created by salah_ad_din
- This Renown Perk can only ever be obtained as a Renown Perk (Renown Score 50+) as part of the specific crime family', 3240.0),
('45213b20-eefe-58fa-bca0-e2e5f725161f', 'REW_0325', 'GEAR', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Faction)', false, NULL, '—', ARRAY['HHB']::text[], 'The Guild of Artificers, Engineers, and Researchers (GEAR) is a consortium of artificers and inventors dedicated to creating marvels of magical and mechanical engineering. Based out of the Rock of Bral, GEAR maintains a variety of outposts in major cities across Faerûn and is dedicated to the advancement and proliferation of works of magical artifice and engineering, such as firearms, constructs, or other marvels. GEAR aims to push the boundaries of artificing and provides its services to anyone willing to pay to acquire them regardless of affiliation, positioning itself as a neutral provider of quality products.

GEAR Renown
Renown Score     Reward
3                            GEAR Multi-Tool (HB)
10+                        GEAR Supply Drop
30                          GEAR Pyrojector
50+                        GEAR Guardian

Motto: Fearlessly forging the future.

Goals:
- Innovate and advance what is possible by combining mechanical ingenuity with magic
- Gain profit in order to continue to invest in further innovation and invention
- Identify and retain important clients and customers

Beliefs:
- The future lies in the fusion of the mechanical and the magical and we seek to enlighten others to see the same.
- We avoid taking any direct sides in conflicts and wars as we seek to build towards the future: GEAR remains neutral and provides its services regardless of affliation.
- Quality must never be sacrificed for quantity: our reputation for luxury and quality products can never be compromised.

Ranks:
- Mechanic: Renown Score 3+
- Apprentice Engineer: Renown Score 15+
- Journeyman Engineer: Renown Score 25+
- Master Engineer: Renown Score 40+
- Executive Officer: Renown Score 50+', '- This group was created by .decoymantis., mark.stac, and kwamsture
- Traits:  Members of GEAR are often drawn from existing groups, locations, or organizations known for their artificers and inventors, such as the church of Gond, Calimshan, Lantan, Halruaa, or New Nivix. GEAR often seeks to recruit those that have shown aptitude and skill in creating marvels of mechanical and magical engineering, and those that join find a space to freely collaborate with other likeminded individuals to innovate and advance their research and work. GEAR members typically prioritize research and invention over directly taking sides in a political conflict, as GEAR itself caters to any that seek its works, regardless of affiliation.
- DMs and players seeking more information regarding this faction should contact .decoymantis., mark.stac, or kwamsture
- Only DMs that are collaborating with .decoymantis., mark.stac, or kwamsture with their permission can award Renown Score with GEAR to player characters
- Only players collaborating with .decoymantis., mark.stac, or kwamsture with their permission can obtain starting Renown with this faction', 3250.0),
('7fcd75a7-c96d-5fb0-8172-fbe7cba08e20', 'REW_0326', 'GEAR Multi-Tool (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Renown Perk (Renown Score 3) (T0 Permanent)', true, NULL, 'T0 (DM Select)', ARRAY['HHB']::text[], 'Wondrous Item, T0

This intricate device is about 6 inches wide and bears the symbol of GEAR: a gear with a bomb in the center, with its fuse lit with a faint ember glow. The device is made of metal that reflects your rank within GEAR: copper, brass, steel, adamantine, or mithral. As you rise up the ranks, this device is modified and upgraded to accommodate the new metal.

The GEAR Multi-Tool contains multiple tools folded within it. While holding it, you can take an Utilize action to transform the GEAR Multi-Tool into one of the following tools of your choice: Thieves'' Tools, Tinker''s Tools, or Weaver''s Tools. 

You can add 1d4 to an ability check made with one of these tools while holding it. Once used, this property can''t be used again until the next dawn.', '- This homebrew item was created by .decoymantis., mark.stac, and kwamsture
- This homebrew item can only ever be obtained as a Renown Perk (Renown Score 3) as part of GEAR', 3260.0),
('5c78e2bc-f89b-5b14-ace5-8e15b4d55257', 'REW_0327', 'GEAR Supply Drop', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Renown Perk (Renown Score 10+)', true, NULL, 'T1 Select (DM Select)', ARRAY['HHB']::text[], 'Renown Perk, T1 (Requires Renown Score 10+)

As a member of GEAR, you can obtain assistance when out in the field. 

During an adventure in Faerûn, you can spend 24 hours while within a settlement or stronghold where GEAR is present to arrange for a supply drop. The supply drop consists of up to 250 GP in value of any combination of the following items:
- Blasting Powder (35 GP)
- Smokpowder Packet (35 GP)
- Smokepowder Keg (250 GP)
- Potion of Healing (50 GP)
- Potion of Greater Healing (100 GP)

These items last until the adventure''s conclusion, after which any unused items are reclaimed by GEAR', '- This Renown Perk was created by .decoymantis., mark.stac, and kwamsture
- This Renown Perk can only ever be obtained as a Renown Perk (Renown Score 10+) as part of GEAR
- GEAR has contacts and a prescence in Hawthorne and in most major cities of Faerûn', 3270.0),
('d7fabbbf-d7de-5ba5-b529-ba53b2f767ab', 'REW_0328', 'GEAR Pyrojector (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Renown Perk (Renown Score 30)', true, NULL, 'T2 Select (DM Select)', ARRAY['HHB']::text[], 'Wondrous Item, T2 (Requires Attunement)

This short tube, about 2 feet long and 6 inches in diameter, is a modified Mizzium Mortar that has been further enhanced by inventors of GEAR. The end that''s pointed toward a target is open, and a glowing ball of molten metal can be seen at the other end as long as the tube has at least 1 charge remaining.

The GEAR Pyrojector has 6 charges for the following properties. It regains 1d6 expended charges daily at dawn.

Molten Wave. While holding the tube, you can take a Magic action to expend 1 charge and unleash a wave of molten destruction in a 30-foot Cone. Each creature in the area must make a DC 15 Dexterity saving throw, taking 5d6 Fire damage on a failed save, or half as much damage on a successful one.

Molten Bombard. While holding the tube, you can take a Magic action to expend 3 charges to unleash a blast of molten rock and make a ranged spell attack with a +7 bonus to hit against one creature within 60 feet of yourself. On a hit, the target takes 8d6 Fire damage and has the Blinded condition until the end of its next turn.', '- This homebrew item was created by .decoymantis., mark.stac, and kwamsture
- This homebrew item can only ever be obtained as a Renown Perk (Renown Score 30) as part of GEAR', 3280.0),
('d6d732a6-cfd6-5425-98c0-9b06490db63b', 'REW_0329', 'GEAR Guardian', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Renown Perk (Renown Score 50+)', true, NULL, 'T3 Select (DM Select)', ARRAY['HHB']::text[], 'Renown Perk, T3 (Requires Renown Score 50+)

You''ve provided invaluable contributions to GEAR and GEAR regards your continued survival as paramount. During adventures in Faerûn, you can spend 7 days and 7 DTP to arrange for a Shield Guardian supplied by GEAR to come to your aid, along with its corresponding amulet. The Shield Guardian is under the DM''s control but it follows your commands and assists you to the best of its ability while you wear the amulet. The Shield Guardian and its amulet returns to the nearest GEAR office at the adventure''s conclusion if it has not been destroyed or otherwise prevented from returning. 

If the Shield Guardian is destroyed or is otherwise unable to return, you can''t use this benefit again until you expend 30 DTP and 7000 GP to arrange for a replacement in the future. You also can''t receive the aid of another Shield Guardian from GEAR in this way if you already have the aid of one currently.', '- This Renown Perk was created by .decoymantis., mark.stac, and kwamsture
- This Renown Perk can only ever be obtained as a Renown Perk (Renown Score 50+) as part of GEAR', 3290.0),
('d37614e1-2a48-5e1b-9909-30b7d9309b5d', 'REW_0330', 'GEAR Exosuit (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Wondrous Item', true, NULL, 'T4 Select (DM Select)', ARRAY['HHB']::text[], 'Wondrous Item, T4 (Requires Attunement)

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

Molten Barrage. While wearing the suit, you can take a Magic action to expend 2 charges and create a fiery explosion in a 20-foot radius, 40-foot high Cylinder centered on a point within 120 feet of yourself. Each creature in that area must make a DC 18 Dexterity saving throw, taking 10d8 Fire damage on a failed save, or half as much on a successful one.', '- This homebrew item was created by .decoymantis., mark.stac, and kwamsture
- This homebrew item can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 50+ with GEAR. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 17+ DMPC with a Renown Score of 50+ with GEAR can choose to obtain this homebrew item in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as an item reward.', 3300.0),
('9c478609-9400-5bc9-a6b4-362e51d192ec', 'REW_0331', 'Gilded Accord', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Faction)', false, NULL, '—', ARRAY['HHB']::text[], 'The Gilded Accord is a secretive, alliance founded by the golden dragon Aurelian and his former adventuring party. Its members work behind the scenes to identify and eliminate hidden threats, corruption, and rising evils across the world. While discreet in their methods, they believe in direct action, justice, and cooperation. Any class of good alignment can be a candidate.

Gilded Accord Renown
Renown Score     Reward
3                            Gilded Accord Amulet (HB)
10+                        Gilded Knowledge
15+                        Auric Outpost
30                          Mantle of the Gilded

Motto: In Shadows, We Spark Light.

Goals
- Uncover and dismantle hidden evils that threaten the balance of the world.
- Safeguard innocent lives by taking proactive measures against corruption and tyranny.
- Cultivate a network of informants and allies to stay vigilant across regions.

Beliefs
- True strength comes from cooperation among diverse beings.
- Justice and wisdom should guide power, not greed or dominance.
- Evil thrives in apathy; thus, it must be confronted quietly but decisively.

Ranks
- Seeker (Renown Score 3+): Entry-level operatives actively participating in missions: investigating, confronting threats, and gathering actionable intelligence.
- Sentinel (Renown Score 15+): Proven members entrusted with more autonomy, handling dangerous operations and directly dismantling threats. They are expected to make tactical decisions and lead small teams.
- Warden (Renown Score 25+): Veteran agents responsible for coordinating and managing large teams, organizing significant operations, and mentoring lower-ranked members. They balance tactical command with strategic oversight.
- Luminary (Renown Score 40+): Highly experienced operatives who handle critical threats, delicate diplomatic interactions, and missions crucial to the faction’s security. They are empowered to act independently, representing the faction in crucial matters.
- Councilor (Renown Score 50+): Elite strategists and advisors who form the inner circle around Aurelian. They guide overall faction strategy, direct major campaigns, and coordinate the faction’s resources and operations at the highest levels.', '- This group was created by falconxyx
- Traits:  A member of the Gilded Accord sees themselves as part of a quiet war against hidden evils. While they may operate alone or in small teams, they know they are backed by a wider, unseen network with reach, resources, and resolve. Membership is earned through action—noble intentions aren''t enough; results matter. The Accord values discretion and integrity. Members are expected to act decisively against corruption, even when it hides behind law or power. Autonomy is respected, loyalty to the cause is non-negotiable. The Accord does not promise glory or status—only purpose, and the tools to fulfill it.
- DMs and players seeking more information regarding this faction should contact falconxyx
- Only DMs that are collaborating with falconxyx with their permission can award Renown Score with the Gilded Accord to player characters
- Only players collaborating with falconxyx with their permission can obtain starting Renown with this faction', 3310.0),
('cc921db6-3db2-59b9-8771-21c21559161e', 'REW_0332', 'Gilded Accord Amulet (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Renown Perk (Renown Score 3) (T0 Permanent)', true, NULL, 'T0 (DM Select)', ARRAY['HHB']::text[], 'Wondrous item, T0

As a member of the Gilded Accord, you are an operative assigned to confront threats and gather intelligence. To mark your membership with the organization, you are given this amulet.

Whenever you finish a Long Rest while wearing this amulet, you can choose one of the following creature types: Aberration, Celestial, Elemental, Fey, Fiend, or Undead. While the amulet is within 150 feet of a creature of the chosen type, it feels noticeably colder. Additionally, while the amulet is within 30 feet of another Gilded Accord Amulet, it subtly vibrates to warn you.', '- This homebrew item was created by falconxyx
- This homebrew item can only ever be obtained as a Renown Perk (Renown Score 3) as part of the Gilded Accord', 3320.0),
('fd00a3db-0aa7-5570-ae04-8ffa63f4256b', 'REW_0333', 'Gilded Knowledge', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Renown Perk (Renown Score 10+)', true, NULL, 'T1 Select (DM Select)', ARRAY['HHB']::text[], 'Renown Perk, T1 (Requires Renown Score 10+)

As a member of the Gilded Accord, you can call upon contacts within the Gilded Accord to uncover information about a specific person, place, or thing. While in a location where the Gilded Accord has a presence, you can contact members of the organization to arrange for research to be done on your behalf, using the rules for Research in Xanathar''s Guide to Everything. You''re responsible for covering expenses incurred as part of this research, and the DM determines if the information is available and if it is a success or failure (with a base Intelligence bonus of +4 and the Intelligence check made with Advantage). If you call upon members of the Gilded Accord in this way during downtime instead of as part of an adventure, you must also expend the necessary amount of DTP.', '- This Renown Perk was created by falconxyx
- This Renown Perk can only ever be obtained as a Renown Perk (Renown Score 10+) as part of the Gilded Accord
- The Gilded Accord has contacts and a presence in the city of Hawthorne
- See the associated rules for Research in the Downtime section of this document', 3330.0),
('c2f6415f-3dc5-53f2-a866-4eba7bc07b21', 'REW_0334', 'Auric Outpost', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Renown Perk (Renown Score 15+)', true, NULL, 'T1 Select (DM Select)', ARRAY['HHB']::text[], 'Renown Perk, T1 (Requires Renown Score 15+)

As a member of the Gilded Accord, your commitment to the organization has granted you access to logistical support on short notice. During an adventure in Faerûn, if you can establish contact with the organization, you can request the establishment of a temporary safe house with two days of notice at a location within Faerûn and that contains basic supplies. The availability, exact location, and exact contents of the safe house are determined by the DM.', '- This Renown Perk was created by falconxyx
- This Renown Perk can only ever be obtained as a Renown Perk (Renown Score 15+) as part of the Gilded Accord', 3340.0),
('2c1db763-17c5-5c0b-bfbf-78a413716760', 'REW_0335', 'Mantle of the Gilded (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Renown Perk (Renown Score 30) (T3 Permanent)', true, NULL, 'T3 Select (DM Select)', ARRAY['HHB']::text[], 'Wondrous item, T3 (Requires Attunement)

As a member of the Gilded Accord, you have been gifted a mantle imbued with the power of the gold dragon Aurelian, founder of the Gilded Accord. 

This mantle has the properties of a Cloak of Protection. 

Additionally while wearing this mantle, you can cast the the Flame Strike spell (save DC 15) or Zone of Truth spell (save DC 15) from it. Once the mantle has been used to cast a spell, it can''t be used to cast that spell again until the next dawn.', '- This homebrew item was created by falconxyx
- This homebrew item can only ever obtained as a Renown Perk (Renown Score 30) as part of the Gilded Accord', 3350.0),
('5ccbd255-39f4-5e2e-b491-9bd65c664e74', 'REW_0336', 'Voice of Aurelian (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Wondrous Item', true, NULL, 'T4 Select (DM Select)', ARRAY['HHB']::text[], 'Wondrous item, T4

As a Councilor of the Gilded Accord, the amulet you received when you originally joined the organization has been upgraded and imbued with the draconic magic of Aurelian, marking you as among the highest rank of leadership in the organization.

This amulet has the properties of a Gilded Accord Amulet. 

This amulet has 3 charges and regains all expended charges daily at dawn. When a creature you can see within 120 feet of you targets you with an attack roll, you can take a Reaction and expend 1 charge from the amulet to force the attacker to make a DC 18 Charisma saving throw. On a failed save, the attack misses and the creature is transported to a harmless demiplane until the start of your next turn, where it reappears in the space it left or in the nearest unoccupied space if that space is occupied.', '- This homebrew item was created by falconxyx
- This homebrew item requires the Gilded Accord Amulet as a prerequisite, which it replaces and upgrades
- This homebrew item can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 50+ with the Gilded Accord. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 17+ DMPC with a Renown Score of 50+ with the Gilded Accord can choose to obtain this homebrew item in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as an item reward.', 3360.0),
('627b8483-62b4-5ed3-9c73-459ded632334', 'REW_0337', 'HALO', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Faction)', false, NULL, '—', ARRAY['HHB']::text[], 'Hawthorne’s Adventurers’ Logistics Organization (HALO) is a prestigious group of sailors, couriers, navigators, and adventurers dedicated to connecting the scattered corners of Faerûn through secure and honorable deliveries. Members are respected as beacons of reliability and protectors of free trade, often traveling across dangerous territories and seas.

HALO Renown
Renown Score     Reward
3                            HALO Insignia Cloak (HB)
10                          Mariner Spirit (HB)
15+                        Dinopower Transport
25+                        Port of Call

Motto: A shining beacon of dependable service.

Goals
- Safely transport goods, messages, and artifacts across Faerûn, no matter the danger.
- Foster trust and commerce between distant communities.
- Protect cargo and trade routes from pirates, monsters, and tyrants.
- Provide aid to isolated towns and adventuring parties in need.

Beliefs
- A promise made is a promise kept.
- Every shipment carries someone''s hopes, and must be protected.
- The freedom to trade and travel must be defended against oppression.
- Navigation through land, sea, or magic is an art and a sacred trust.

Ranks
- Wayfinder (Renown Score 3+): New members trusted to carry standard deliveries and simple messages.
- Wavetouched (Renown Score 15+): Experienced couriers entrusted with longer voyages or minor dangerous routes.
- Sea Warden (Renown Score 25+): Guardians of key shipments, leaders of small caravans or ships.
- Horizonmaster (Renown Score 40+): Commanders of fleets, elite navigators, and defenders of major trade routes.
- Halo Bearer (Renown Score 50+): Legendary agents of HALO, known across Faerûn for their miraculous feats of delivery, rescue, and negotiation.', '- This group was created by myusernameisredacted
- HALO is Hostile to the Zhentarim
- Traits:  HALO agents are trusted emissaries of connection in a realm too often torn by war, wilderness, and warring powers. They are as likely to deliver a treaty between feuding Moonsea barons as they are to ferry rare spell components to a lone wizard’s tower on the Spine of the World. Each member is a sworn navigator of Faerûn’s fractured geography—seas plagued by sahuagin, roads stalked by bandits, skies hunted by dragons—and yet they push forward with steadfast purpose. These adventurers often double as messengers, diplomats, or rescuers, and are trained to think on their feet, navigate hostile terrain, and make hard calls in the name of honor and delivery. They are not just couriers—they are champions of freedom, guardians of trade, and lifelines to the forgotten edges of the world.
- DMs and players seeking more information regarding this faction should contact myusernameisredacted, fedd_, or wildehide
- Only DMs that are collaborating with myusernameisredacted, fedd_, or wildehide with their permission can award Renown Score with HALO to player characters
- Only players collaborating with myusernameisredacted, fedd_, or wildehide with their permission can obtain starting Renown with this faction', 3370.0),
('40e7609e-992c-58f1-b23e-de6b682157be', 'REW_0338', 'HALO Insignia Cloak (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Renown Perk (Renown 3) (T0 Permanent)', true, NULL, 'T0 (DM Select)', ARRAY['HHB']::text[], 'Wondrous Item, T0

As a newly inducted member of HALO, you are a crew member of a vessel and entrusted to carry standard cargo. To aid in your duties and identify you as a member of HALO, you have received this cloak.

While wearing this cloak, you have Advantage on Strength (Athletics) checks made to swim and you cannot become lost while traveling by ship except by magical means.

Message. While wearing the cloak, you can take a Magic action to cause the cloak to emit a magical pulse of light and cast the Message spell, except its range is 300 feet. This property of the cloak can''t be used again until the next dawn.', '- This homebrew item was created by myusernameisredacted
- This homebrew item can only ever be obtained as a Renown Perk (Renown Score 3) as part of HALO', 3380.0),
('3d7846bc-c2e2-5d08-ad06-4f33124cadd3', 'REW_0339', 'Mariner Spirit (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Renown Perk (Renown Score 10) (T1 Supernatural Gift)', true, NULL, 'T1 Select (DM Select)', ARRAY['HHB']::text[], 'Supernatural Gift, T1

As a member of HALO, you are entrusted with securing dangerous routes and protecting valuable shipments. Through many hours spent out at sea, you have become accustomed to long hours and hard sailing.

While this Supernatural Gift is active, you can hold your breath for twice as many minutes as normal, can automatically find a safe route to land a ship on shore provided such a route exists, and during an adventure you can travel up to 16 hours in a day before you are required to begin making Constitution saving throws against Exhaustion for Extended Travel.', '- This homebrew Supernatural Gift was created by myusernameisredacted
- This Supernatural Gift can only ever be obtained as a Renown Perk (Renown Score 10) as part of HALO', 3390.0),
('00deaa50-e457-5918-96e4-aa1e0b03aa14', 'REW_0340', 'Dinopower Transport', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Renown Perk (Renown Score 15+)', true, NULL, 'T1 Select (DM Select)', ARRAY['HHB']::text[], 'Renown Perk, T1 (Requires Renown Score 15+)

As a dedicated member of HALO. you have demonstrated a commitment to the company and life on the sea. For this effort you have earned the trust of the organization’s beastmasters and monster trainers. You have earned the right to acquire a Plesiosaurus.

While in the city of Hawthorne or Port Nyanzaru, you can expend 30 DTP and 2000 GP to purchase a Plesiosaurus as a downtime activity; the Plesiosaurus is delivered to the settlement or stronghold nearest to you where HALO is present.', '- This Renown Perk was created by myusernameisredacted
- This Renown Perk can only ever be obtained as a Renown Perk (Renown Score 15+) as part of HALO
- HALO has contacts and a presence in the city of Hawthorne', 3400.0),
('e5121fa4-8a79-5a5e-a319-15b659fe1e68', 'REW_0341', 'Port of Call', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Renown Perk (Renown Score 25+)', true, NULL, 'T1 Select (DM Select)', ARRAY['HHB']::text[], 'Renown Perk, T1 (Requires Renown Score 25+)

As an experienced member of HALO, you are entrusted with command over a fleet of vessels. Due to your position within HALO, you can secure permits to berth and dock ships in any coastal city of Faerûn. During adventures in Faerûn, you can spend 7 days to call upon major aid from HALO and obtain assistance from HALO vessels or other support. The nature of this assistance is determined by the DM.', '- This Renown Perk was created by myusernameisredacted
- This Renown Perk can only ever obtained as a Renown Perk (Renown Score 25+) as part of HALO', 3410.0),
('7bd63656-7f4a-56ff-99ae-7708b059353e', 'REW_0342', 'The HALO Halo (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Wondrous Item', true, NULL, 'T4 Select (DM Select)', ARRAY['HHB']::text[], 'Wondrous Item, T4 (Requires Attunement)

As a Halo Bearer of HALO, you have gained this shining gold crown to mark achieving the highest rank in the organization and your position of leadership. This shining gold crown hovers just above your head while you wear it, and you gain the following benefits while wearing this crown.

By Land, Air, and Sea. You have a Burrow Speed, Fly Speed, and Swim Speed equal to your walking Speed.

Adapt and Thrive. You can cast the Air Bubble or Water Breathing spell from this crown. This property of the crown can''t be used again until you finish a Short or Long Rest.

Raise the Tempest. You can cast the Control Weather spell from this crown. This property of the crown can''t be used again until the next dawn.

Bombard Blitz. You can take a Bonus Action to cause the crown to pulse with the force of a bombard. For the next minute or until you become Incapacitated or dismiss this effect on your turn (no action required), you gain a +2 bonus to ranged weapon attack rolls, deal an additional 2d8 Force damage with your ranged weapon attacks, and when you hit a creature with a ranged weapon attack, you can push the creature up to 10 feet straight away from yourself if it is Huge or smaller. This property of the crown can''t be used again until the next dawn.', '- This homebrew item was created by myusernameisredacted
- This homebrew item can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 50+ with HALO. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 17+ DMPC with a Renown Score of 50+ with HALO can choose to obtain this homebrew item in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as an item reward.', 3420.0),
('0244f9ea-b10a-53cb-8dcd-eb691b541a58', 'REW_0343', 'Legion of Dread', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Faction)', false, NULL, '—', ARRAY['HHB']::text[], 'The Legions of Dread serve as the armed forces of the Dread Empire. Often making use of auxiliaries and outsiders, the Legions grant nominal ranks and comissions to individuals that have provided a faithful service to the Empire. Fighters, paladins, and wizards of lawful evil or chaotic evil alignments are commonly drawn to the Legions of Dread.

Legion of Dread Renown
Renown Score     Reward
3                            Formation Fighting (HB)
10+                        Goblin Munitions
25+                        Cohort Commander
30                          Banner of the Dread Legion (HB)
50+                        Legate''s Legions

Motto: Even victories ordained by Heavens and Hells can be broken by the will of men.

Goals
- Further the influence of the Dread Empress
- Defend the Dread Empire
- Protect the monstrous races that comprise the Dread Empire

Beliefs
- There is but one Sin; Defeat.
- There is but one Grace; Victory.
- Power is the right to change the world as you see fit.

Ranks
- Legionnaire: Renown Score 3+
- Lieutenant: Renown Score 15+
- Captain: Renown Score 25+
- Tribune: Renown Score 40+
- Legate: Renown Score 50+', '- This group was created by greensprout
- The Legion of Dread are Hostile to the Emerald Enclave, the Harpers, the Lords'' Alliance, the Order of the Gauntlet, the Purple Dragon Knights, the Red Wizards, and the Zhentarim
- Traits: Dread Legionnaires are trained to operate in units, supporting each other and following a strict hierarchy of ranks and duties. Standing side by side in the shield walls of the Dread Legions, comraderie and esprit de corps are strong merits pushed for by the legions. Stalwart warriors, evocative mages, and brilliant strategists, the Dread Legions employ innovative tactics to combat the superior numbers and power of the established factions. 
- DMs and players seeking more information regarding this faction should contact greensprout', 3430.0),
('2f6cfc2a-d787-5e7f-8afa-4065912bcde4', 'REW_0344', 'Formation Fighting (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Renown Perk (Renown Score 3) (Quirk)', true, NULL, 'T0 (DM Select)', ARRAY['HHB']::text[], 'Quirk, T0

New members of the Legion of Dread are instructed in the ways of fighting together as an effective combat unit.

While you are within 5 feet of another creature with this feature that is no more than one size larger or smaller than you and neither of you have the Incapacitated or Prone condition, you gain the benefits of Half Cover. Both you and the other creature must be wielding either a melee weapon or a shield in order for you to gain this benefit.', '- This Quirk was created by greensprout
- This Quirk can only ever be obtained as a Renown Perk (Renown Score 3) as part of the Legion of Dread', 3440.0),
('4784fa3d-c5e8-5ec5-822b-3d2453baf94c', 'REW_0345', 'Goblin Munitions', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Renown Perk (Renown Score 10+)', true, NULL, 'T1 Select (DM Select)', ARRAY['HHB']::text[], 'Renown Perk, T1 (Requires Renown Score 10+)

As an experienced member of the Legion of Dread, you''ve earned the trust and command of a legion, as well as the secret tactics of the legion''s use of Goblin Munitions. While in a settlement or stronghold containing members of the Legion of Dread, you can craft or purchase the following items as listed in Equipment as a downtime activity.

- Flashstick (HB)
- Sharper (HB)
- Tosser Grenade (HB)', '- This Renown Perk was created by greensprout
- This Renown Perk can only ever be obtained as a Renown Perk (Renown Score 10+) as part of the Legion of Dread
- The Legion of Dread has contacts and a presence in the city of Hawthorne', 3450.0),
('51e0270d-5be4-5545-9958-f8c371f268f8', 'REW_0346', 'Cohort Commander', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Renown Perk (Renown Score 25+)', true, NULL, 'T1 Select (DM Select)', ARRAY['HHB']::text[], 'Renown Perk, T1 (Requires Renown Score 25+)

As a proven member of the Legion of Dread, you have command over a cohort consisting of 200 Legionnaires that can have a specialized role, such as Armored Infantry, Cavalry, or Spellcasters. During adventures taken in service to the Dread Empire, you can call upon the aid of the cohort you command within the Legion of Dread and obtain assistance from your cohort or your cohort''s spellcaster. The nature of this assistance is determined by the DM.', '- This Renown Perk was created by greensprout
- This Renown Perk can only ever obtained as a Renown Perk (Renown Score 25+) as part of the Legion of Dread', 3460.0),
('e1d43bbe-59ef-5762-902c-8fd5e4e7eaa3', 'REW_0347', 'Banner of the Dread Legion (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Renown Perk (Renown Score 30) (T2 Permanent)', true, NULL, 'T2 Select (DM Select)', ARRAY['HHB']::text[], 'Wondrous Item, T2 (Requires Attunement)

This banner is emblazoned with the symbol of the Legion of Dread and measures 5 feet high and 3 feet wide. Such banners are often granted to field commanders in the Legion of Dread to mark their authority. It can be attached to a 10-foot pole to serve as a standard. Furling or unfurling the banner requires an action. 

You can use a Magic action while holding the banner while it is unfurled to create a 10-foot Emanation originating from the banner, which lasts until you let go of the banner, have the Incapacitated condition, or use a Bonus Action to end it. When you create this Emanation, choose one of the options below:
- Attack. While in the Emanation, you can take a Bonus Action on each of your turns to inspire a charge: each creature of your choice within the Emanation can take a Reaction to move up to their Speed toward you and has Advantage on its next attack roll before the end of your next turn.
- Defend. You and allies in the Emanation while it lasts are immune to the Prone condition and have Advantage on saving throws made to avoid or end the Charmed and Frightened conditions.', '- This homebrew item was created by greensprout
- This homebrew item can only ever be obtained as a Renown Perk (Renown Score 30) as part of the Legion of Dread', 3470.0),
('1f2d3826-1c4f-5595-ab56-9f98563107f8', 'REW_0348', 'Legate''s Legions', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Renown Perk (Renown Score 50+)', true, NULL, 'T4 Select (DM Select)', ARRAY['HHB']::text[], 'Renown Perk, T4 (Requires Renown Score 50+)

As a Legate of the Legion of Dread, you have achieved the highest rank of field command within the Legion of Dread and can directly command hundreds of soldiers. During an adventure that is taken in service to the Dread Empire, you can muster an army as if you had issued the Recruit: Soldiers order from the War Room Bastion Facility, even if you don''t have access to the facility yourself. The soldiers assemble at the nearest stronghold controlled by the Dread Empire after 7 days and you must pay the costs to feed them each day as listed else they disband.', '- This Renown Perk was created by greensprout
- This Renown Perk can only ever obtained as a Renown Perk (Renown Score 50+) as part of the Legion of Dread', 3480.0),
('f2b93110-6c90-5616-a893-4c21c041d339', 'REW_0349', 'Prismatic Lotus', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Faction)', false, NULL, '—', ARRAY['HHB']::text[], 'The Prismatic Lotus is a group that prides itself for members that known to be sly conversationalists and able to weasel way into places shouldn''t be as a faction focused on brokering information. The Prismatic Lotus favors espionage, infiltration, deception, trickery, and even poisons to get the information to later be used for blackmail and heists as bought and sold to the highest bidder. Information is at the core of the Prismatic Lotus and it stops at almost nothing to get it. Recruitment to the organization is always done secretively, to ensure that only those of the right mindset are among the ranks. The principal expectation of its members are to maintain a friendly face: big smiles and big shows as always the philanthropist to the face of the people.

Prismatic Lotus Renown
Renown Score     Reward
3                            Lotus Seed Clip (HB)
10                          A New Leaf (HB)
15+                        Ever the Studious Thief
50+                        Flourishing Favor

Motto: A lotus on the surface, though the roots run deep.

Goals
- Further one''s own skills of infiltration be it by mechanical or verbal means.
- Maintain and protect The Florists'' Muse and the lands around it. The Florists'' Muse is a restaurant and beast fighting pit which doublse as a front for the Prismatic Lotus.
- Gold is good, platinum is better, a pretty face can''t be maintained with only coppers after all.

Beliefs
- Gathering of knowledge is useful, no matter the means.
- The more skilled one is at gathering information by multiple means, the better they can serve themselves and others.
- Skills speak louder than gold, while donations are always welcome, to truly shine for the Prismatic Lotus, you must be skilled with infiltration and espionage.

Ranks
- Prismatic Seedling: Renown Score 3+
- Prismatic Floret: Renown Score 15+
- Prismatic Bud: Renown Score 25+
- Prismatic Blossom: Renown Score 40+
- Prismatic Bloom: Renown Score 50+', '- This group was created by another_tiefling
- Traits: Prismatic Lotus members are encouraged to build relationships with fellow members, ranging from familial, friendly, business, and romantic. In the field, Prismatic Lotus members work together towards their common goals using any means necessary, often entering parties, balls, or other events in pairs, trios, or even larger groups. Those among the Prismatic Lotus who choose to work alone are regarded in esteem for being able to accomplish by themselves what otherwise take many. Cunning and a silver tongue are the favored means of dealing with problems and to ascend the ranks faster than other approaches though there is a place for those of all manner of folks in the organization and a direct approach has its time and place just as well. In the end, members of the Prismatic Lotus only have loyalty for each other, with any others outside of the organization a potential mark and fair game for backstabbing (whether metaphorically or literally).
- DMs and players seeking more information regarding this faction should contact another_tiefling
- Only DMs that are collaborating with another_tiefling with their permission can award Renown Score with the Prismatic Lotus to player characters
- Only players collaborating with another_tiefling with their permission can obtain starting Renown with this faction', 3490.0),
('b877e57e-cff2-5170-bf1c-934f866be8ac', 'REW_0350', 'Lotus Seed Clip (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Renown Perk (Renown Score 3) (Trinket)', true, NULL, 'T0 (DM Select)', ARRAY['HHB']::text[], 'Trinket, T0

This brooch or hair clip is a shimmering and prismatic lotus seed. This ornament is presented to newly inducted members of the Prismatic Lotus to serve as faction insignia as a token of their membership.', '- This homebrew item was created by another_tiefling
- This homebrew item can only ever be obtained as a Renown Perk (Renown Score 3) as part of the Prismatic Lotus', 3500.0),
('e904d27c-9b07-5c80-b42b-c5726f9915fb', 'REW_0351', 'A New Leaf (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Renown Perk (Renown Score 10) (T1 Permanent)', true, NULL, 'T1 Select (DM Select)', ARRAY['HHB']::text[], 'Wondrous item, T1

This brooch or hair clip is a shimmering lotus leaf. This ornament is presented to dedicated members among the Prismatic Lotus. While wearing this ornament, you have Advantage on Intelligence (History) checks and you have Advantage on Charisma checks made to obtain information.', '- This homebrew item was created by another_tiefling
- This homebrew item can only ever be obtained as a Renown Perk (Renown Score 10) as part of the Prismatic Lotus', 3510.0),
('d66538f3-c52c-50da-8d79-a7469df0d108', 'REW_0352', 'Ever the Studious Thief', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Renown Perk (Renown Score 15+)', true, NULL, 'T1 Select (DM Select)', ARRAY['HHB']::text[], 'Renown Perk, T1 (Requires Renown Score 15+)

Yur training and time spent among the books of the hidden library of the Prismatic Lotus have afforded you specific knowledge to pick both locks and pockets alike in the pursuit of knowledge. Whenever you would make a Dexterity (Sleight of Hand) check, you can choose to instead make an Intelligence (Sleight of Hand) check.', '- This Renown Perk was created by another_tiefling
- This Renown Perk can only ever be obtained as a Renown Perk (Renown Score 15+) as part of the Prismatic Lotus', 3520.0),
('9bdc856c-e05c-5e94-bdf9-d25ac3bed09e', 'REW_0353', 'Flourishing Favor', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Renown Perk (Renown Score 50+)', true, NULL, 'T3 Select (DM Select)', ARRAY['HHB']::text[], 'Renown Perk, T3 (Requires Renown Score 50+)

As a Blossom of the Prismatic Lotus, you have proven yourself to and have gained the favor of Serix, one of the faction''s founders, and gained her permission to call upon creatures under her command. During adventures in Faerûn, you can spend 7 days to arrange for a monster from the Prismatic Lotus to come to your aid. The creature must be a Monstrosity that is CR 10 or less in the Fair Game category of Allowed Content. The creature is under the DM''s control but it follows your commands and assists you to the best of its ability. The creature returns to the nearest safe house or stronghold controlled by the Prismatic Lotus at the adventure''s conclusion if it has not been slain or otherwise prevented from returning.', '- This Renown Perk was created by another_tiefling
- This Renown Perk can only ever obtained as a Renown Perk (Renown Score 50+) as part of the Prismatic Lotus in a session', 3530.0),
('2e22d352-5bc5-5d8b-8651-63e58df4adaf', 'REW_0354', 'Mark of the Lotus (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Wondrous Item (Tattoo)', true, NULL, 'T4 Select (DM Select)', ARRAY['HHB']::text[], 'Wondrous Item (Tattoo), T4

As a Bloom of the Prismatic Lotus, you''ve achieved the highest rank of leadership within the organization besides the founders themselves. As a testament to your dedication to the organization, you have been gifted with a magical tattoo of a lotus as imbued by one of the founders, Serix or Soliana, and through it formed a bond with a Mini-Render that has an appearance of your choice and is known as a GR-44.

A Mini-Render has the statistics of a Gray Render, except its size is Tiny, it can''t attack, it has 10 HP and 15 AC, and it regards you as its master, following your commands to the best of its ability. If you take a Magic action to throw the Mini-Render to a point on the ground within 60 feet of yourself, the Mini-Render becomes a Gray Render. If the space where the Gray Render would appear is occupied by other creatures or objects, or if there isn''t enough space for the creature, the Mini-Render doesn''t become a Gray Render.

The Gray Render is Friendly to you and your allies. It understands your languages, obeys your commands, and takes its turn immediately after you on your Initiative count. If you issue no commands, the Gray Render defends itself but takes no other actions.

The Gray Render exists for up to 3 hours. At the end of the duration, the Gray Render reverts to its Mini-Render form and attempts to return to you. It reverts to a Mini-Render early if it is reduced to 0 hit points or if you take a Magic action while touching the Gray Render to make it revert back to a Mini-Render

Once the Gray Render reverts to its Mini-Render form again, it can''t transform in this way again until it has been fed blood or meat and 7 days have passed.

If the Mini-Render is ever slain, its body dissolves and is siphoned into the tattoo. Its body can be extracted from the tattoo by the founders of the Prismatic Lotus, who can restore it back to life and re-establish your bond with it over the course of 7 days.', '- This homebrew item was created by another_tiefling
- This homebrew item can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 50+ with the Prismatic Lotus. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 17+ DMPC with a Renown Score of 50+ with the Prismatic Lotus can choose to obtain this homebrew item in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as an item reward.', 3540.0),
('d7448f34-ae8e-57f0-b460-341f3f888640', 'REW_0355', 'United Universe Coalition', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Faction)', false, NULL, '—', ARRAY['HHB']::text[], 'The United Universe Coalition (UUC) is a federation of peoples, governments, and factions from across the multiverse that seeks to aid and protect the Astral Sea and Wildspace systems from cosmic threats as well as the machinations of mind flayers. The UUC''s headquarters is the Convergence, a massive spelljamming station carefully concealed within the depths of the Astral Sea. The UUC has no fixed leadership but instead representatives of member factions, governments, and groups each hold a seat in the UUC''s governing body. The UUC has recently come to Toril to expand its cooperative reach.

Motto: Together, We Can Do More!

Symbol: The UUC symbol is a gold five pointed star with the letters "U.U.C." in the center. The star is overlaid on three overlapping circles with a gold outline and light blue interior, surrounded by a gold ring decorated with small white diamonds. 

Goals
- Eliminate mind flayer threats to prevent the establishment of elder brain networks across the multiverse and to work against their Grand Design
- Establish and maintain membership and alliances between Wildspace system, especially isolated Wildspace systems
- Respond to cosmic threats and disasters
- Map and monitor Wildspace and the Astral Sea for new threats, anomalies, and uncharted places
- Rescue and liberate mind-controlled populations

Beliefs
- No Wildspace system, planet, or peoples stands alone. The UUC rises or falls together.
- The UUC stands against all forms of mental domination.
- Aberrant, cosmic, and eldritch threats must be stopped before they spread.
- The UUC seeks to prevent cosmic collapses and destabilization, including unstable rifts in the Astral Sea and Wildspace.

Member Benefits: See below.

Renown Rewards: See below.

Ranks
- UUC Cadet: Renown Score 3+
- UUC Ensign: Renown Score 5+
- UUC Lieutenant Junior Grade: Renown Score 10+
- UUC Lieutenant: Renown Score 15+
- UUC Lieutenant Commander: Renown Score 25+
- UUC Commander: Renown Score 30+
- UUC Captain: Renown Score 40+
- UUC Admiral: Renown Score 50+', '- This group was created by _badwolf_ in collaboration with the Lore Consultants and participating DMs of the 2025 Sky District event.
- The UUC is Hostile to any group aligned with mind flayers or that seek to bring about the Grand Design of mind flayers.
- The UUC has a presence across settlements in the Astral Sea, Wildspace, and Wildspace systems, including but not limited to: Hawthorne, the Rock of Bral, Nimbral (on Toril), the Labyrinth (an asteroid in Shatterspace), any city of the Free Cities League (in Shatterspace), the astral dominion of Hestavar (in the Astral Sea), and the Convergence (in the Astral Sea).
- Traits. UUC members are hostile to the Grand Design of mind flayers, though they can be tolerant of individuals in neutral zones like the Rock of Bral. Depending on the issue, UUC members also can find themselves at odds with expansionist groups in the Astral Sea and Wildspace, such as the Xarxyian Empire. Beyond this, UUC members often show a remarkable tolerance for most cultural and factional differences, as the UUC seeks to bring together like-minded people. Members of the UUC prefer to operate in the open, relying primarily on diplomatic solutions to wide-ranging issues and desire to create a unified network that stretches from the stars and beyond. Their motto and guiding principle is "Together, We Can Do More!"', 3550.0),
('e031426d-4a34-5a30-ba52-37cd144c5928', 'REW_0356', 'Member Benefits (UUC)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Member Benefits', false, NULL, '—', ARRAY['HHB']::text[], 'If you''re a member of the UUC, you receive these benefits.

Universal Access. You can access UUC lounges or safe houses at any settlement where the UUC has a presence. You can maintain a Modest Lifestyle while present at a UUC lounge or safe house and don''t have to expend 1 GP per DTP expended while outside Hawthorne.

Members Only. Upon joining the UUC, you receive a gray UUC jacket. As your Renown Score with the UUC increases, you can gain additional jackets in other colors: red (Renown Score 5+), orange (Renown Score 10+), yellow (Renown Score 15+), green (Renown Score 25+), blue (Renown Score 30+), indigo (Renown Score 40+), and violet (Renown Score 50+).

Trinket. Choose one of the options on or roll on the UUC Trinkets Table to determine what trinket you have from your membership in the UUC.

UUC Trinkets
1d6 Trinket
1 A brass brooch in the shape of an astrolabe, engraved with the UUC logo on the back.
2 A desk friend with a programmed illusion of a stylized astral performer, in UUC uniform, who sings a snippet of the UUC theme song, "Together, We Can Do More!"
3 A replica of famous UUC Captain Wayjean''s famous off-duty jacket, emblazoned with the UUC logo on the lapel.
4 A petrified eye of a Kindori. The eye sheds Dim Light in a 5-foot radius.
5 An unclaimed Space Hamster race ticket from Karsh''s Big Pleasure Wheel. The back displays a magical image of the finish of the 50th Anniversary Astral Squeakers race.
6 An authentic replica of a set of Plasmoid space pipes.', 'These member benefits were created by _badwolf_ in collaboration with the Lore Consultants and participating DMs of the 2025 Sky District event.', 3560.0),
('eb1de4bb-7f0c-510d-86d5-ead7ea3cba6d', 'REW_0357', 'Renown Rewards (UUC)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Renown Rewards', false, NULL, '—', ARRAY['HHB']::text[], 'UUC Renown
Renown Score Reward
3+ You earn the honorary rank of UUC Cadet. Members of the UUC are Friendly to you by default, and you have the right to display the UUC symbol on your person, your residence, or on your vehicles.

5+ You earn the honorary rank of UUC Ensign. While in Hawthorne or in the Rock of Bral, you can obtain UUC transport to travel to the other location via UUC spelljamming vessels at a discounted rate. Each one-way trip costs 7 GP and 1 DTP.

10 You earn the honorary rank of UUC Lieutenant Junior Grade. The first time your Renown Score reaches 10, the UUC gifts you a magic item to help you with your adventures in Wildspace and the Astral Sea. The magic item obtained is a T1 magic item of your choice in Allowed Content (Loot) and must be logged in the session or downtime log in which you reached this Renown score.

15+ You earn the honorary rank of UUC Lieutenant, and you receive rank insignia with Lieutenant pips to wear along with your Hawthorne badge. While in a settlement affiliated with the UUC or one of its member groups, you have a 10 percent discount when buying space vehicles or Spelljamming Helms. Additionally, you can register any space vehicle you own with the UUC, receiving a UUC call sign and colors in the form of a flag or painted insignia on the hull.

25 You earn the honorary rank of UUC Lieutenant Commander.  The first time your Renown Score reaches 25, the UUC grants you your choice of a Damselfly Ship, Flying Fish Ship, Lamprey Ship, Shrike Ship, or Wasp Ship for free. The choice of vehicle must be logged in the session or downtime log in which you reached this Renown Score.

30+ You earn the honorary rank of UUC Commander. When you visit a location in which UUC members are Friendly to you by default, you can enlist 1d4 Plasmoid Warriors to aid you for 10 days. Once you use this reward, you can''t do so again until your Renown Score increases.

40 You earn the honorary rank of UUC Captain. The first time your Renown Score reaches 40, you receive a voucher to freely upgrade one space vehicle or other vehicle you own with a Spelljamming Helm installed. The voucher allows you to install onto the vehicle a T2 or lower Superior Ship Upgrade of your choice in Allowed Content (Loot) that is compatible with the vehicle. The upgrade costs no gold or DTP to install but must be logged in #⁠downtime-logs when you redeem the voucher.

50+ You earn the official rank of UUC Admiral. You are entitled to wear the style and insignia of an UUC Admiral, and the UUC openly shares information with you. In addition, you are kept updated on the current location of the Convergence, where you can choose to stay. While residing in the Convergence, you can maintain a Wealthy lifestyle for free, and and don''t have to expend 1 GP per DTP expended while outside Hawthorne.', 'These renown rewards were created by _badwolf_ in collaboration with the Lore Consultants and participating DMs of the 2025 Sky District event.', 3570.0),
('6ab240d8-4b20-589c-b04e-9d3168974724', 'REW_0358', 'Yamato Clan', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'NONE'), 'Group (Faction)', false, NULL, '—', ARRAY['HHB']::text[], 'The Yamato Clan is the alliance of three great clans of Wa: the Kurotsuki, Tatsunokami, and Seriyuden. Each respectively upholds the ancient traditions of honor, spiritual stewardship, and martial mastery within Akamihane Academy and beyond. Together, they protect the balance between worlds, safeguard sacred knowledge, and ensure that power never corrupts the soul. The Yamato Clan values loyalty, self-mastery, tradition, and responsibility. Members are expected to refine not only their techniques but their hearts, becoming paragons of virtue in an era of growing chaos.

Yamato Clan Renown
Renown Score     Reward
3                            Clan Sigil Sash (HB) or Onmyō Paper Tag (HB)
10                          Bowl of Never-Ending Ramen (HB) or Teacup of Endless Clarity (HB)
30                          My Boy is a Temple, My Mind is a Fortress (HB) or Unyielding Will (HB)
50                          Ink of the Living Legacy (HB) or Pendant of the Arcane Echo (HB)

Symbol: A stylized cherry blossom woven with a silver crescent and black feathers—representing honor, unity, and resilience through shadow and storm.

Motto: Through discipline, wisdom, and unity, we ascend

Goals
- Preserve the Balance. Prevent the material and spirit realms from colliding or corrupting each other.
- Uphold the Great Clans. Ensure the survival, honor, and influence of the Yamato Clan as a bulwark against darkness and decay.
- Guard the Divine Heritage. Protect ancient secrets, artifacts, and traditions from being stolen, lost, or abused.
- Forge the New Era. Train the next generation of warriors, mystics, and leaders who will guide the world into peace without sacrificing tradition.
- Oppose Anathema. Fight against those who seek to pervert spiritual forces for personal power, whether demons, rogue sorcerers, or corrupted gods.

Beliefs
- Honor Above All. Upholding the name of the Clan is more important than personal gain.
- Balance of Worlds. The spirit realm and material world must exist in harmony; neither should dominate.
- Strength in Unity. No member is abandoned. Even the fallen are remembered and honored.
- Legacy. Each member’s deeds add to the unbroken chain of tradition and future promise.

Ranks
- Petal: Renown Score 3+
- Bloom: Renown Score 15+
- Warden: Renown Score 25+
- Dawnblade: Renown Score 40+
- Celestial Envoy: Renown Score 50+', '- This group was created by naoe45
- Traits: Member of the Yamato Clan are trained to seek personal growth and provide something back for the clan. Whether it is taking task for the clan or serving in the army, but not only this is enough. It must be done with precision, every stroke, bow, word should carry some sort of purpose or weight. One will endure enormous suffering or hardship without complaint if it furfill their role. Common missions include purging spirit corruption, escorting sacred relics, defending barrier gates between worlds, investigating magical anomalies, and settling disputes between clans diplomatically or by force if necessary.
- DMs and players seeking more information regarding this faction should contact naoe45
- Only DMs that are collaborating with naoe45 with their permission can award Renown Score with the Yamato Clan to player characters
- Only players collaborating with naoe45 with their permission can obtain starting Renown with this faction
- NOTE: Each rank of this faction has Renown Perks associated with one of two different options: the Path of the Bushi and the Path of the Madōshi. A character must choose one Renown Perk corresponding to one path or the other when obtaining a Renown Perk for achieving a Renown Score threshold within this faction. A character can choose to later swap a Renown Perk they have for a given Renown Score threshold to one for the other corresponding path by expending an amount of DTP equal to the required Renown Score threshold, provided the character is present in Hawthorne or another location where the Yamato Clan is present. For example, a character can spend 10 DTP to exchange the Path of the Bushi Renown Score 10 Renown Perk (the Bowl of Never-Ending Ramen) for that of the Path of the Madōshi Renown Score 10 Renown Perk (the Teacup of Endless Clarity) or vice versa. If any Renown Perks require other Renown Perks as a prerequisite, you must still obey any prerequisites when performing any swap in this way.', 3580.0),
('e0f60492-8219-5ca1-82ff-820d8b89a8a6', 'REW_0359', 'Clan Sigil Sash (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Renown Perk (Renown Score 3) (T0 Permanent - Path of the Bushi)', true, NULL, 'T0 (DM Select)', ARRAY['HHB']::text[], 'Wondrous Item, T0

This sash bears the symbol of the Yamato Clan: a stylized cherry blossom woven with a silver crescent and black feathers. It glows faintly under the moonlight.

Jōka. While wearing the sash, you can cast the Prestidigitation spell to clean yourself and any equipment you are wearing or carrying only.', '- This homebrew item was created by naoe45
- This is the Path of the Bushi Renown Score 3 Renown Perk
- This homebrew item can only ever be obtained as a Renown Perk (Renown Score 3) as part of the Yamato Clan', 3590.0),
('8c8d59e8-6407-5a18-9562-173a49a67438', 'REW_0360', 'Onmyō Paper Tag (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Renown Perk (Renown Score 3) (T0 Permanent - Path of the Madōshi)', true, NULL, 'T0 (DM Select)', ARRAY['HHB']::text[], 'Wondrous Item, T0

This prayer book bears the symbol of the Yamato Clan: a stylized cherry blossom woven with a silver crescent and black feathers. It contains various prayers and protective verses.

Orizuru. While holding this book, you can cast the Find Familiar spell from it. When you cast this spell from this book, the familiar is Celestial, always takes the form of a Raven made of folded paper, and disappears at the next dawn.  This property can''t be used again until the next dawn.', '- This homebrew item was created by naoe45
- This is the Path of the Madōshi Renown Score 3 Renown Perk
- This homebrew item can only ever be obtained as a Renown Perk (Renown Score 3) as part of the Yamato Clan', 3600.0),
('9a9029bf-73b5-53b5-bd86-deeb672c091c', 'REW_0361', 'Bowl of Never-Ending Ramen (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Renown Perk (Renown Score 10) (T1 Permanent - Path of the Bushi)', true, NULL, 'T1 Select (DM Select)', ARRAY['HHB']::text[], 'Wondrous Item, T1

The first step to martial prowess is a good meal. This wide ceramic bowl is painted with looping waves and tiny golden koi along the rim. The inside always feels faintly warm, and it smells faintly of garlic, sesame, and something you can’t quite name but makes you hungry.

This bowl has 3 charges and regains all expended charges daily at dawn. While holding it, you can take a Magic action to use the bowl''s command word and expend 1 charge to create a steaming portion of ramen in the bowl. A creature can spend 10 minutes to consume the ramen and regain a number of Hit Points equal to 2d8 + its Constitution modifier. One portion of ramen provides enough nourishment to sustain a creature for one day.', '- This homebrew item was created by naoe45
- This is the Path of the Bushi Renown Score 10 Renown Perk
- This homebrew item can only ever be obtained as a Renown Perk (Renown Score 10) as part of the Yamato Clan', 3610.0),
('d3656439-99d5-5d55-8090-13e64b28293e', 'REW_0362', 'Teacup of Endless Clarity (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_SELECT'), 'Renown Perk (Renown Score 10) (T1 Permanent - Path of the Madōshi)', true, NULL, 'T1 Select (DM Select)', ARRAY['HHB']::text[], 'Wondrous Item, T1

This porcelain teacup is painted with a ring of tiny stars along the lip. The tea inside always steams faintly, regardless of temperature, and smells like a mix of jasmine, mint, and an indefinable ancient sweetness.

This teacup has 3 charges for the following properties and regains all expended charges daily at dawn. 

Clarifying Brew. You can take a Magic action to use the teacup''s command word and expend 1 charge to create steaming tea within the teacup. You can spend 1 minute drinking the tea and gain Advantage on the next Intelligence (Arcana, History, Investigation, or Nature) check you make within the next hour.

Energizing Brew. When you finish a Short Rest while the teacup is on your person, you can expend 1 charge and regain one expended level 1 spell slot. Once used, this property can''t be used again until the next dawn.', '- This homebrew item was created by naoe45
- This is the Path of the Madōshi Renown Score 10 Renown Perk
- This homebrew item can only ever be obtained as a Renown Perk (Renown Score 10) as part of the Yamato Clan', 3620.0),
('88e2d44f-102f-53da-bc9c-1f5b840ca2f3', 'REW_0363', 'My Body is a Temple, My Mind is a Fortress (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Renown Perk (Renown Score 30) (T2 Supernatural Gift - Path of the Bushi)', true, NULL, 'T2 Select (DM Select)', ARRAY['HHB']::text[], 'Supernatural Gift, T2

Through relentless discipline and self-mastery, you have fused physical resilience and mental clarity into an unshakable core. Whether forged through ascetic meditation, divine blessing, or sheer grit, you now stand as an immovable bastion against forces that would topple lesser mortals.

When you fail a saving throw while this Supernatural Gift is active, you can take a Reaction to gain Temporary Hit Points equal to your Proficiency Bonus and add a d6 to the saving throw, potentially turning the failed save into a success.

You can take this Reaction a number of times equal to your Proficiency Bonus and you regain all expended uses when you finish a Long Rest.', '- This homebrew Supernatural Gift was created by naoe45
- This is the Path of the Bushi Renown Score 30 Renown Perk
- This Supernatural Gift can only ever be obtained as a Renown Perk (Renown Score 30) as part of the Yamato Clan', 3630.0),
('84551dd8-9480-5d14-8e26-892b5524ca89', 'REW_0364', 'Unyielding Will (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Renown Perk (Renown Score 30) (T2 Supernatural Gift - Path of the Madōshi)', true, NULL, 'T2 Select (DM Select)', ARRAY['HHB']::text[], 'Supernatural Gift, T2

When you fail an Intelligence, Wisdom, or Charisma saving throw while this Supernatural Gift is active, you can take a Reaction to roll a d6 to the saving throw, potentially turning the failed save into a success. If this causes you to succeed the save and the save was forced by a creature you can see within 120 feet, you can force the creature to make an Intelligence saving throw against your spell save DC. The creature takes 2d10 Psychic damage on a failed save, or half as much damage on a successful one. 

You can take this Reaction a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.', '- This homebrew Supernatural Gift was created by naoe45
- This is the Path of the Madōshi Renown Score 30 Renown Perk
- This Supernatural Gift can only ever be obtained as a Renown Perk (Renown Score 30) as part of the Yamato Clan', 3640.0),
('8267102d-4fbe-5870-9646-ebb7ce5468d0', 'REW_0365', 'Ink of the Living Legacy (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Renown Perk (Renown Score 50) (T3 Permanent - Path of the Bushi)', true, NULL, 'T3 Select (DM Select)', ARRAY['HHB']::text[], 'Wondrous Item (tattoo), T3 (Requires Attunement)

This intricate magical tattoo runs across your forearm, shoulder, or back in flowing lines of ink that shift faintly with your heartbeat. At rest, the design depicts your mentor, teacher, or other important guiding figure, stylized in an iconic pose. When activated, the ink glows and briefly animates, peeling away from your skin as an ethereal figure.

This tattoo has a number of charges equal to your Proficiency Bonus for the following properties and it regains all expended charges daily at dawn.

Mentor''s Strike. The spectral image of your mentor strikes with you and steels your resolve. When you hit a creature with a weapon attack, you can expend 1 charge to deal an extra 4d6 Force damage to the target. If this attack reduces the target to 0 Hit Points, you gain Temporary Hit Points equal to your level.

Shrine Maiden''s Blessing. You can call forth a serene shrine maiden in a burst of shimmering paper charms. You can expend 2 charges to cast the Lesser Restoration spell from the tattoo.', '- This homebrew item was created by naoe45
- This is the Path of the Bushi Renown Score 50 Renown Perk
- This homebrew item can only ever obtained as a Renown Perk (Renown Score 50) as part of the Yamato Clan', 3650.0),
('536228ce-7382-5905-973f-c4fd0b4acca0', 'REW_0366', 'Pendant of the Arcane Echo (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Renown Perk (Renown Score 50) (T3 Permanent - Path of the Madōshi)', true, NULL, 'T3 Select (DM Select)', ARRAY['HHB']::text[], 'Wondrous Item, T3 (Requires Attunement by a Spellcaster)

Suspended from this silver chain is a smooth gemstone that swirls with faint starlight. At certain angles, you see brief, flickering afterimages of yourself casting spells as if the pendant is replaying memories of your magic.

The pendant has a number of charges equal to your Proficiency Bonus and regains all expended charges daily at dawn. You can use the following properties while wearing the pendant.

Arcane Renewal. You can spend 1 minute in deep focus and regain one expended spell slot of level 3 or lower. Once used, this property can''t be used again until the next dawn.

Empower the Effect. When you roll damage for a spell or roll dice to determine the number of Hit Points a spell restores, you can expend 1 charge and reroll a number of dice up to your spellcasting ability modifier, and you must use the new rolls.

Perfect the Weave. If you miss a spell attack roll or fail a Constitution saving throw made to maintain Concentration, you can expend 1 charge and reroll the d20, and you must use the new roll.', '- This homebrew item was created by naoe45
- This is the Path of the Madōshi Renown Score 50 Renown Perk
- This homebrew item can only ever obtained as a Renown Perk (Renown Score 50) as part of the Yamato Clan', 3660.0),
('6bf71db3-a5ef-5ea2-ae44-b4447d64c6bc', 'REW_0367', 'Ink of the Eternal Legacy (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Wondrous Item (Tattoo)', true, NULL, 'T4 Select (DM Select)', ARRAY['HHB']::text[], 'Wondrous Item (tattoo), T4 (Requires Attunement)

The tattoo expands across the body from its original form. Your mentor’s stylized likeness now appears entwined with faint celestial calligraphy, while the shrine maiden’s form is etched in silver-white ink that seems to shimmer faintly when you breathe. At times of danger, the tattoo pulses with radiant warmth, as if alive.

This tattoo has a number of charges equal to your Proficiency Bonus and it regains all expended charges daily at dawn.

Deadly Strike. Your attack rolls with weapons and Unarmed Strikes can score a Critical Hit on a roll of 19 or 20 on the d20.

Shrine Maiden''s Minor Blessing. You can call forth a serene shrine maiden in a burst of shimmering paper charms. You can expend 1 charge to cast the Lesser Restoration spell from the tattoo.

Shrine Maiden''s Major Blessing. You can call forth a serene shrine maiden in a burst of shimmering paper charms. You can expend 2 charges to cast the Greater Restoration spell from the tattoo.

Unstoppable Strike. The spectral image of your mentor strikes with you and steels your resolve. When you hit a creature with a weapon attack, you can expend 1 charge to deal an extra 4d8 Force damage to the target and if the target is Large or smaller, it must succeed on a Strength saving throw (DC equal to 8 plus your Strength or Dexterity modifier plus your Proficiency Bonus) or be knocked Prone. If this attack reduces the target to 0 Hit Points, you gain Temporary Hit Points equal to twice your level.', '- This homebrew item was created by naoe45
- This homebrew item requires the Ink of the Living Legacy as a prerequisite, which it replaces and upgrades. If a PC ever swaps from the Ink of the Living Legacy to the Pendant of the Arcane Echo as the Renown Score 50 Renown Perk for the Yamato Clan, this item is lost.
- This homebrew item can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 50+ with the Yamato Clan. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 17+ DMPC with a Renown Score of 50+ with the Yamato Clan can choose to obtain this homebrew item in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as an item reward.', 3670.0),
('dd0f8116-8193-5a04-842e-8be636d4c29e', 'REW_0368', 'Pendant of the Arcane Fury (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T4_SELECT'), 'Wondrous Item', true, NULL, 'T4 Select (DM Select)', ARRAY['HHB']::text[], 'Wondrous Item, T4 (Requires Attunement by a Spellcaster)

Suspended from this silver chain is a smooth gemstone that swirls with faint starlight. At certain angles, you see brief, flickering afterimages of yourself casting spells as if the pendant is replaying memories of your magic.

The pendant has 8 charges and regains all expended charges daily at dawn. You can use the following properties while wearing the pendant.

Arcane Renewal. When you finish a Short Rest, you can expend up to 5 charges to regain expended spell slots that have a combined level equal to no more than the number of charges expended.

Empower the Effect. When you roll damage for a spell or roll dice to determine the number of Hit Points a spell restores, you can expend 1 charge and reroll a number of dice up to your spellcasting ability modifier, and you must use the new rolls.

Perfect the Weave. If you miss a spell attack roll or fail a Constitution saving throw made to maintain Concentration, you can expend 1 charge and reroll the d20, and you must use the new roll.

Secret Spell. When you cast a spell, you can expend 1 charge to to cast it without any Verbal, Somatic, or Material components, except Material components that are consumed by the spell or that have a cost specified in the spell.

War Mage. Your spell save DC and spell attack bonus each increase by 2.', '- This homebrew item was created by naoe45
- This homebrew item requires the Pendant of the Arcane Echo as a prerequisite, which it replaces and upgrades. If a PC ever swaps from the Pendant of the Arcane Echo to the Ink of the Living Legacy as the Renown Score 50 Renown Perk for the Yamato Clan, this item is lost.
- This homebrew item can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 50+ with the Yamato Clan. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 17+ DMPC with a Renown Score of 50+ with the Yamato Clan can choose to obtain this homebrew item in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as an item reward.', 3680.0),
('2ae79745-9be9-51f4-8af1-7c6e4e6278e2', 'REW_0369', 'Story Outcome', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Story Outcome', false, NULL, 'T0', ARRAY['HHB']::text[], 'A narrative consequence gained as a result of events that occur as part of an adventure, as determined and designed by a DM.', '- A Story Outcome is either a positive or negative narrative consequence as a result of events during an adventure. For example, as a result of an adventure, friendly NPCs in a region may provide shelter to that character in the future if they adventure in the same region again.
- A Story Outcome only comes into play in future games at the discretion of the presiding DM.
- The mechanical effect of a Story Outcome if any shouldn''t exceed the gold and loot allotment of the adventure or have a mechanical effect greater than that of a minor magical property (excluding Guardian or Unbreakable).
- Awarding more mechanically significant Story Outcomes requires a Rules request in #dm-requests.', 3690.0),
('4f0b19b0-6f9f-5a65-9ede-a0771638c07c', 'REW_0370', 'Bulwark Against Loss', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Story Outcome', false, 'Exclusive Event', 'T0 (Exclusive Event)', ARRAY['HHB']::text[], 'Story Outcome, T0

The Followers of the Lady of Loss sought to spread the influence of Loss, and had been emboldened to raise their blades against Hawthorne, the Guild, and its allies. Just as Loss had emboldened her followers, your dedication to defending Hawthorne, the Guild, and its allies serve to embolden yourself in the eyes of others. When interacting with any of the five factions of Faerûn (the Emerald Enclave, the Harpers, the Lords'' Alliance, the Order of the Gauntlet, and the Zhentarim), you gain a +2 bonus to Charisma (Persuasion) and Charisma (Intimidation) checks to sway these factions.', '- This homebrew Story Outcome was created by magurotoria
- This homebrew Story Outcome was only obtainable as part of the 2025 Night of Black Knives event', 3700.0),
('462ff8b2-1346-5c37-8ad1-0a3c879c0f62', 'REW_0371', 'Favored of Bahamut (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Story Outcome', false, 'Exclusive Event', 'T0 (Exclusive Event)', ARRAY['HHB']::text[], 'Story Outcome, T0

You have proven to be an ally of the Platinum Dragon through your efforts during the Rage of Dragons. When interacting with followers of Bahamut or speaking with metallic Dragons outside of combat, you can make a DC 15 Charisma (Persuasion) check. On a success, you can request one of the following favors:
- Ask for shelter for up to one week.
- Receive information on one object or creature within their territory.
- Receive transport to a location with no questions asked.

Once you successfully use this Story Reward, remove it from your character sheet.', '- This homebrew Story Outcome was created by salemalvian
- This homebrew Story Outcome was only obtainable as part of the 2025 Rage of Dragons story season', 3710.0),
('e63e209a-7e1b-5c15-8a98-d8c98c6380c2', 'REW_0372', 'Favored of Tiamat (HB)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Story Outcome', false, 'Exclusive Event', 'T0 (Exclusive Event)', ARRAY['HHB']::text[], 'You have proven to be an ally of the Dragon Queen through your efforts during the Rage of Dragons. When interacting with followers of Tiamat or speaking with chromatic Dragons outside of combat, you can make a DC 15 Charisma (Persuasion) check. On a success, you can request for one of the following favors:
- Ask for them to turn a blind eye to a recent activity you took
- Ask them to pretend they hadn''t seen you
- Receive information about an object or creature in their territory

Once you successfully use this Story Reward, remove it from your character sheet.', '- This homebrew Story Outcome was created by salemalvian
- This homebrew Story Outcome was only obtainable as part of the 2025 Rage of Dragons story season', 3720.0),
('ae98227f-1299-5c63-b667-0e9c333e84d4', 'REW_0373', 'Gift of Glassteel (Reinforced Glassteel Plate)', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T3_SELECT'), 'Story Outcome', true, NULL, 'T3 Select (DM Select)', ARRAY['HHB']::text[], 'Story Outcome, T3 (can only be used by a creature with proficiency in Alchemist''s Supplies, Glassblower''s Tools, and Smith''s Tools)

Through both extensive study under skilled smiths from Evereska and your own personal study in the field, you have learned how to work with Glassteel, a wondrous substance that combines the transparency of glass with a strength that exceeds steel. During an adventure, you can expend 20,000 GP to gather raw materials and create a set of Reinforced Glassteel Plate of your choice over the course of 7 days. You must additionally expend an amount of gold in raw materials for the purchase cost of the type of armor crafted in this way.

Note: You can only create a set of Glassteel Plate of your choice as overseen by a DM during an adventure. choosing both the type of armor made and the Resistances the armor confers. A set of Reinforced Glassteel Plate is a T3 item: gathering the raw materials as described above and creating the armor can only occur during an APL 11+ adventure, with the armor taking up a T3 permanent item slot.', '- This homebrew Story Outcome was created by rexen
- Only DMs that are collaborating with aovnick or rexen with their permission can award this Story Outcome as part of an adventure.
- A set of Reinforced Glassteel Plate crafted in this way takes up one of the normal permanent item slots of the session.', 3730.0),
('57e35f27-157b-57a0-a96e-b29d9b0e9bbc', 'REW_0374', 'Gift of Hizagkuur', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T2_SELECT'), 'Story Outcome', true, NULL, 'T2 Select (DM Select)', ARRAY['HHB']::text[], 'Story Outcome, T2 (can only be used by a creature with proficiency in Smith''s Tools and the Arcana skill)

Through extensive study under skilled dwarven smiths of the Underdark, you''ve learned how to work with Hizagkuur, a rare silvery gray metal made from ore in the Underdark that is refined by complex processes and often enchanted by dwarven priests of the Mordinsamman to resist all magic and ensorcellment. During an adventure through the Underdark, you can expend 2,000 GP to gather raw materials and create a set of Hizagkuur Armor or a Hizagkuur Weapon of your choice over the course of 7 days. You must additionally expend an amount of gold in raw materials for the purchase cost of the type of armor or weapon crafted in this way.

Note: You can only create a set of Hizagkuur Armor or a Hizagkuur Weapon of your choice as overseen by a DM during an adventure through the Underdark, choosing the type of armor or weapon made. A set of Hizagkuur Armor or a Hizagkuur Weapon is a T2 item: gathering the raw materials as described above and creating the item can only occur during an APL 5+ adventure, with the item taking up a T2 permanent item slot.', '- This homebrew Story Outcome was created by greensprout
- A set of Hizagkuur Armor or a Hizagkuur Weapon crafted in this way takes up one of the normal permanent item slots of the session.', 3740.0),
('fa2255dd-d706-5c58-8ae0-3cdcfd3661b3', 'REW_0375', 'Kindori Voyage', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Story Outcome', false, 'Exclusive Event', 'T0 (Exclusive Event)', ARRAY['HHB']::text[], 'Story Outcome, T0

During your travels in Wildspace, you encountered and befriended a Kindori, which magically imbued you with a charm to call upon it again in the future. While you are in Wildspace or in the Astral Sea, you can use the charm to call the Kindori you befriended. The Kindori provides you and your party with spelljamming transport for a period of 30 days. After you use this Story Outcome, remove it from your character sheet.', 'This homebrew Story Outcome was only obtainable as part of the 2025 Sky District event', 3750.0),
('0226443d-960f-5cea-bc4f-53a665ec0fbf', 'REW_0376', 'Quirk', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Supernatural Reward', false, NULL, 'T0', ARRAY['HHB']::text[], 'A character gains a minor alteration to their person that is either cosmetic or provides a mechanical benefit no greater than a minor magical property.', '- Only Full DMs can create and award Quirks without a request. 
- Quirks don''t take up item slots for a session and the DM can give a character a Quirk at their discretion due to events in an adventure.
- A character can have any number of Quirks. They can''t be traded or sold.
- The effect of a Quirk should either be cosmetic or if it has a mechanical effect, the effect should be no greater than a minor magical property as described in the 2014/2024 DMG (except for the Guardian or Unbreakable properties)
- A list of available Quirks can also be seen below that are available to any DM to award without a request.', 3760.0),
('6c48fec7-e849-5847-a821-d306ade8ecb6', 'REW_0377', 'Piety', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T1_PLUS'), 'Supernatural Gift (Supernatural Reward)', false, NULL, 'T1+', ARRAY['HHB']::text[], 'Homebrew Supernatural Gift created by a Full DM in collaboration with the Lore and Rules teams, using the Piety system as detailed in Mythic Odysseys of Theros.', '- A character with this kind of Supernatural Gift has a starting Piety score of 1 in relation to a deity or faith unless it is already higher than 1. See Chapter 2 of the Mythic Odysseys of Theros for rules on how this score works (ignore the guidance regarding changing gods). 
- As a guideline and as determined by the DM, a character''s Piety typically increases by 1 during most sessions of play where they are following the tenets of that deity and faith as determined by the DM, and a single deed typically changes their Piety score by only 1 point in either direction unless the action is very significant as determined by the DM. Regardless, any increase or decrease to Piety (if any) is wholly determined by the DM.
- A DM that awards this Supernatural Gift must note in their session log the deity or faith this Supernatural Gift is associated with, as well as circumstances that can increase or decrease Piety, following the template in Mythic Odysseys of Theros.
- A character''s Piety score can change even when this Supernatural Gift is not active.
- Each Piety Supernatural Gift provides certain benefits at certain Piety thresholds—3, 10, 25, and 50—which have associated level prerequisites as well: level 1+, 5+, 11+, and 17+ respectively.
- For purposes of the number of Supernatural Gifts a character can have active at a time, this Supernatural Gift''s tier of play corresponds to the tier of the highest level trait they benefit from. For example, it would be treated as a Tier 3 Supernatural Gift when used by a level 12 character with 30 Piety (since they gain the benefit of the trait that requires being level 11+ and having 25+ Piety).
- The design and approval of this Supernatural Gift follows the process described above for Homebrew Supernatural Rewards.
- A list of available Piety Supernatural Gifts can also be seen below that are available to any Full DM to award without a request, each associated with a specific deity or faith.', 3770.0),
('47929b02-3a41-5e7a-b782-1be0e421b4ec', 'REW_0378', 'Harpspeak', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Story Outcome', false, NULL, 'T0', ARRAY['HHB']::text[], 'Story Outcome, T0

You''ve proven yourself to be a reliable Harper agent. You learn Harpspeak, a secret non-verbal language and means of communication known only to Harpers. Harpspeak can be used either in the form of a sign language or with scribed runes to leave hidden messages. 

As a sign language, Harpspeak uses ordinary gestures in patterns that allow for messages to be hidden in seemingly normal and innocuous gestures such as smiles, frowns, and winks. Only a creature that knows Harpspeak understands such messages. It takes four times longer to convey such a message than it does to speak the same idea plainly. 

As scribed runes, Harpspeak can be used to leave behind hidden messages for other Harpers. Creatures who know Harpspeak automatically spot such messages. Others spot the message''s presence with a successful DC 15 Wisdom (Perception) check but can''t decipher it without magic. Harpers sometimes mark the interior of these runes with extra dots to leave behind a misleading message for their enemies and to alert their fellow Harpers that the true symbol and its meaning is somewhere else nearby.', '- This Story Outcome was created by greensprout
- This Story Outcome can be awarded without using an item slot as normal but can only be obtained by a PC with a Renown Score of 15+ with the Harpers. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 1+ DMPC with a Renown Score of 15+ with the Harpers can choose to obtain this Story Outcome in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as a Story Outcome.', 3780.0),
('2f2cb084-3c15-5ace-aff9-f49386ffec9e', 'REW_0379', 'Chord of Calling', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Story Outcome', false, NULL, 'T0', ARRAY['HHB']::text[], 'Story Outcome, T0

You are a trusted voice among the Harpers and a pillar of communities, recognized finding and rooting out injustice where you can. During adventures in Faerûn, you can spend 7 days to call upon major aid from the Harpers and obtain assistance from Harper spellcasters or other support. The nature of this assistance is determined by the DM.', '- This Story Outcome was created by greensprout
- This Story Outcome can be awarded without using an item slot as normal but can only be obtained by a PC with a Renown Score of 25+ with the Harpers. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 1+ DMPC with a Renown Score of 25+ with the Harpers can choose to obtain this Story Outcome in replacement of their normal DM Loot for that DMPC.
- This Story Outcome was previously known as Wise Owl''s Wiles
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as a Story Outcome.', 3790.0),
('d309f93e-1fa5-5d90-80b4-2f57a1a693a0', 'REW_0380', 'Hero''s Welcome', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Story Outcome', false, NULL, 'T0', ARRAY['HHB']::text[], 'Story Outcome, T0

Word of your deeds among the Order of the Gauntlet have spread among the common folk of the Sword Coast and beyond as a champion of justice. 

You can find a place to hide, rest, or recuperate among other commoners, unless you have shown yourself to be a danger to them. They will shield you from the law or anyone else searching for you and will extend you every courtesy and do their utmost to help you. Unless you have shown yourself to be a danger to them, they will even take up arms to fight alongside you, should you find yourself facing an enemy alone.', '- This Story Outcome was created by greensprout
- This Story Outcome can be awarded without using an item slot as normal but can only be obtained by a PC with a Renown Score of 10+ with the Order of the Gauntlet. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 1+ DMPC with a Renown Score of 10+ with the Order of the Gauntlet can choose to obtain this Story Outcome in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as a Story Outcome.', 3800.0),
('ae134215-8974-5afd-9dbd-9c1f8831ee6d', 'REW_0381', 'Hippogriffs of the Hawk', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Story Outcome', false, NULL, 'T0', ARRAY['HHB']::text[], 'Story Outcome, T0

You have proven your valor and integrity and that you can be counted as a trusted member of the Order. You have earned the right to acquire Hippogriffs from the Hawk''s Nest, a fortification near Silverymoon Pass protected by the Order of the Gauntlet. 

While in Faerûn, you can expend 30 DTP and 1000 GP to purchase a Hippogriff as a downtime activity; the Hippogriff is delivered to the settlement or stronghold nearest to you where the Order of the Gauntlet is present.', '- This Renown Perk was created by greensprout
- This Story Outcome can be awarded without using an item slot as normal but can only be obtained by a PC with a Renown Score of 15+ with the Order of the Gauntlet. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 1+ DMPC with a Renown Score of 15+ with the Order of the Gauntlet can choose to obtain this Story Outcome in replacement of their normal DM Loot for that DMPC.
- The Order of the Gauntlet has a presence in the city of Hawthorne.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as a Story Outcome.', 3810.0),
('f1855869-0f7b-5564-9980-70af7bae42a7', 'REW_0382', 'Rally the Order', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Story Outcome', false, NULL, 'T0', ARRAY['HHB']::text[], 'Story Outcome, T0

You are a champion of the Order of the Gauntlet, with your actions recognized to have brought glory, honor, and respect to the Order and its ideals. During adventures in Faerûn, you can spend 7 days to call upon major aid from the Order of the Gauntlet and obtain assistance from Order spellcasters or other support. The nature of this assistance is determined by the DM.', '- This Renown Perk was created by greensprout
- This Story Outcome can be awarded without using an item slot as normal but can only be obtained by a PC with a Renown Score of 25+ with the Order of the Gauntlet. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 1+ DMPC with a Renown Score of 25+ with the Order of the Gauntlet can choose to obtain this Story Outcome in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as a Story Outcome.', 3820.0),
('9c4a23d6-e376-56fe-a0e6-21bbe916c430', 'REW_0383', 'At Home in the Wild', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Story Outcome', false, NULL, 'T0', ARRAY['HHB']::text[], 'Story Outcome, T0

You''ve shown your commitment and have been taught how to survive in the wild. You have Advantage on ability checks made to calm or befriend Beasts, and you can find food and fresh water for yourself and up to five other people each day, provided that the land offers berries, small game, water, and so forth.', '- This Story Outcome was created by greensprout
- This Story Outcome can be awarded without using an item slot as normal but can only be obtained by a PC with a Renown Score of 10+ with the Emerald Enclave. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 1+ DMPC with a Renown Score of 10+ with the Emerald Enclave can choose to obtain this Story Outcome in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as a Story Outcome.', 3830.0),
('77ce0233-6dde-535c-af75-4561cce2f77c', 'REW_0384', 'Call the Pack', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Story Outcome', false, NULL, 'T0', ARRAY['HHB']::text[], 'Story Outcome, T0

You are a champion of the Emerald Enclave, with your actions recognized to have brought balance and stability. During adventures in Faerûn, you can spend 7 days to call upon major aid from the Emerald Enclave and obtain assistance from Enclave spellcasters or other support. The nature of this assistance is determined by the DM.', '- This Renown Perk was created by greensprout
- This Story Outcome can be awarded without using an item slot as normal but can only be obtained by a PC with a Renown Score of 25+ with the Emerald Enclave. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 1+ DMPC with a Renown Score of 25+ with the Emerald Enclave can choose to obtain this Story Outcome in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as a Story Outcome.', 3840.0),
('2374e889-9476-5408-96b2-bad08b249b91', 'REW_0385', 'Voice of the City', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Story Outcome', false, NULL, 'T0', ARRAY['HHB']::text[], 'Story Outcome, T0

You''ve demonstrated your loyalty and commitment to the lords of the realm. You''ve been granted training in the civic and legal structures of cities of the Lords'' Alliance and cities in general. You have Advantage on Charisma checks made to influence city authorities, city officials, city nobility, and city officers of the law.', '- This Story Outcome was created by greensprout
- This Story Outcome can be awarded without using an item slot as normal but can only be obtained by a PC with a Renown Score of 10+ with the Lords'' Alliance. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 1+ DMPC with a Renown Score of 10+ with the Lords'' Alliance can choose to obtain this Story Outcome in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as a Story Outcome.', 3850.0),
('11527f22-ca40-5490-a2ea-536006f866e5', 'REW_0386', 'Assemble the Alliance', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Story Outcome', false, NULL, 'T0', ARRAY['HHB']::text[], 'Story Outcome, T0

You are a champion of the Lords'' Alliance, with your actions recognized to have brought order and security to the realm. During adventures in Faerûn, you can spend 7 days to call upon major aid from the Lords'' Alliance and obtain assistance from Alliance spellcasters or other support. The nature of this assistance is determined by the DM.', '- This Story Outcome was created by greensprout
- This Story Outcome can be awarded without using an item slot as normal but can only be obtained by a PC with a Renown Score of 25+ with the Lords'' Alliance. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 1+ DMPC with a Renown Score of 25+ with the Lords'' Alliance can choose to obtain this Story Outcome in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as a Story Outcome.', 3860.0),
('51e9a2fe-717e-5a37-bd11-619ef737414d', 'REW_0387', 'Black Network Connections', 'c0000001-0000-0000-0000-000000000005', (SELECT id FROM public.ac_tiers WHERE code = 'T0'), 'Story Outcome', false, NULL, 'T0', ARRAY['HHB']::text[], 'Story Outcome, T0

You are a champion of the Zhentarim, with your actions recognized to have brought significant benefit and respect to the Black Network. During adventures in Faerûn, you can spend 7 days to call upon major aid from the Zhentarim and obtain assistance from Zhentarim spellcasters or other support. The nature of this assistance is determined by the DM.', '- This Renown Perk was created by greensprout
- This Story Outcome can be awarded without using an item slot as normal but can only be obtained by a PC with a Renown Score of 25+ with the Zhentarim. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 1+ DMPC with a Renown Score of 25+ with the Zhentarim can choose to obtain this Story Outcome in replacement of their normal DM Loot for that DMPC.
- This Story Outcome was previously known as Ardragon''s Authority
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as a Story Outcome.', 3870.0);
