-- ============================================================================
-- Migration: Allowed Content Tiers Reference Normalization (ac_tiers)
-- File: supabase/migrations/20261012_ac_tiers_normalization.sql
-- Description:
--   Creates the canonical public.ac_tiers table holding the 3-tier nested hierarchy
--   of rules (Level 1 category linkage, Level 2 tier eligibility/APL/sessions,
--   and Level 3 permanence consumable/permanent limits).
--   Includes full public read RLS, service role management, and Staff Admin /
--   Engineer management policies.
-- ============================================================================

-- 1. Create table
CREATE TABLE IF NOT EXISTS public.ac_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) UNIQUE NOT NULL,
    name VARCHAR(64) NOT NULL,
    tier_group VARCHAR(16) NOT NULL,
    award_type VARCHAR(32) NOT NULL,
    min_apl INTEGER,
    multisession_sessions INTEGER,
    dm_requirement VARCHAR(32) DEFAULT 'Any DM',
    description TEXT NOT NULL,
    loot_tier_rules TEXT,
    reward_tier_rules TEXT,
    consumable_rules TEXT,
    permanent_rules TEXT,
    display_order DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for ordering and code lookups
CREATE INDEX IF NOT EXISTS idx_ac_tiers_code ON public.ac_tiers(code);
CREATE INDEX IF NOT EXISTS idx_ac_tiers_display_order ON public.ac_tiers(display_order);

-- 2. Enable RLS
ALTER TABLE public.ac_tiers ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "ac_tiers_public_read" ON public.ac_tiers;
CREATE POLICY "ac_tiers_public_read"
    ON public.ac_tiers
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "ac_tiers_service_role" ON public.ac_tiers;
CREATE POLICY "ac_tiers_service_role"
    ON public.ac_tiers
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "ac_tiers_staff_admin_manage" ON public.ac_tiers;
CREATE POLICY "ac_tiers_staff_admin_manage"
    ON public.ac_tiers
    FOR ALL
    TO authenticated
    USING (
        ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
        OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
    )
    WITH CHECK (
        ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
        OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
    );

-- 4. Seed Canonical 17 Base Tiers
INSERT INTO public.ac_tiers (
    code, name, tier_group, award_type, min_apl, multisession_sessions, dm_requirement,
    description, loot_tier_rules, reward_tier_rules, consumable_rules, permanent_rules, display_order
) VALUES
(
    'T0',
    'T0',
    'T0',
    'Rolled',
    3,
    NULL,
    'Any DM',
    'Bonus loot for any game. Predetermined bonus slots equal half the number of players, rounded down, with up to one T0 permanent reward. Does not count against normal item slots.',
    'DMs can add up to a number of predetermined T0 items to a game up to half the number of players (rounded down), and only one of them can be a permanent. T0 items don''t count against the normal number of item slots for a game.',
    'T0 Charms take up a session''s T0 item allotment, with 1 charm per T0 slot. Pets can also be awarded as the equivalent of a T0 Permanent item following standard item distribution rules.',
    'DMs can predetermine up to 4 duplicates of a T0 consumable per item slot (up to 15 for ammunition).',
    'At most 1 T0 permanent can be awarded per game.',
    10.0
),
(
    'T1',
    'T1',
    'T1',
    'Rolled',
    1,
    NULL,
    'Any DM',
    'Awarded in an APL 1+ game; item slots equal to player count. For predetermined loot, max 50% permanents.',
    'Awarded in an APL 1+ game; item slots equal to player count. For APL 17+ games, the DM can add bonus loot by rolling loot at APL 4 and selecting either 1 T1 permanent or up to 2 T2 consumables from the list (or predetermining the same).',
    'Dark Gifts: T1 Dark Gifts do not replace an item in the session; a character can only ever have one Dark Gift.',
    'DMs can predetermine up to 3 duplicates of a T1 consumable per item slot (up to 20 for ammunition).',
    'No more than half the items (rounded down) for a game can be permanents.',
    20.0
),
(
    'T1_SELECT',
    'T1 Select',
    'T1',
    'Select',
    3,
    NULL,
    'Any DM',
    'Predetermined from available T1 Select rewards; replaces 1 item slot in the session.',
    'Select Loot can only be predetermined by a DM, not rolled. Replaces 1 item slot in the session. For APL 17+ games, bonus loot option available.',
    'T1 Select Charms and Mounts replace 1 item in the session (1 per item slot). Supernatural Gifts count as a permanent item; combined active tiers cannot exceed Proficiency Bonus.',
    'See individual item notes for duplicate allotments per slot.',
    'Replaces 1 item slot. Max 50% permanents for predetermined session loot.',
    30.0
),
(
    'T1_PLUS',
    'T1+',
    'T1',
    'Multisession',
    1,
    3,
    'Full DM Only',
    'Multisession rewards that require 3+ sessions at APL 1+ to award and can only be awarded by Full DMs.',
    'Multisession rewards that require 3+ sessions at APL 1+ to award and can only be awarded by Full DMs.',
    'Multisession rewards that require 3+ sessions at APL 1+ to award and can only be awarded by Full DMs. Applies to Supernatural Gifts and Charms.',
    'Awarded across 3+ consecutive sessions at APL 1+. Full DMs Only.',
    'Awarded across 3+ consecutive sessions at APL 1+. Full DMs Only.',
    40.0
),
(
    'T2',
    'T2',
    'T2',
    'Rolled',
    5,
    NULL,
    'Any DM',
    'Awarded in an APL 5+ game; up to the number of players in item slots.',
    'Awarded in an APL 5+ game; item slots equal to player count. For predetermined loot, max 50% permanents.',
    'Reward tier for APL 5+ games.',
    'DMs can predetermine up to 3 duplicates of a T2 consumable per item slot (up to 20 for ammunition).',
    'No more than half the items (rounded down) for a game can be permanents.',
    50.0
),
(
    'T2_SELECT',
    'T2 Select',
    'T2',
    'Select',
    5,
    NULL,
    'Any DM',
    'A T2 reward selected from available T2 rewards; awarded in an APL 5+ game.',
    'Predetermined only; replaces 1 item in the session. Trial DMs can predetermine up to T2 Select Loot.',
    'T2 Select Charms and Mounts replace 1 item slot in the session (1 per slot). Supernatural Gifts count as permanent items (combined active tiers <= PB).',
    'See individual item notes for duplicate allotments per slot.',
    'Replaces 1 item slot. Max 50% permanents for predetermined session loot.',
    60.0
),
(
    'T2_PLUS',
    'T2+',
    'T2',
    'Multisession',
    5,
    3,
    'Full DM Only',
    'Tier 2+ rewards are multisession rewards that require 3+ sessions at APL 5+ to award and can only be awarded by Full DMs.',
    'Multisession rewards that require 3+ sessions at APL 5+ to award and can only be awarded by Full DMs.',
    'Multisession rewards that require 3+ sessions at APL 5+ to award and can only be awarded by Full DMs.',
    'Awarded across 3+ consecutive sessions at APL 5+. Full DMs Only.',
    'Awarded across 3+ consecutive sessions at APL 5+. Full DMs Only.',
    70.0
),
(
    'T3',
    'T3',
    'T3',
    'Rolled',
    11,
    NULL,
    'Full DM Only',
    'Awarded in an APL 11+ game; item slots equal to player count. Only Full DMs can predetermine T3 loot.',
    'Awarded in an APL 11+ game; item slots equal to player count. Only Full DMs can predetermine T3 loot.',
    'Reward tier for APL 11+ games. Full DMs Only.',
    'DMs can predetermine up to 3 duplicates of a T3 consumable per item slot (up to 20 for ammunition).',
    'Only Full DMs can predetermine T3 permanent loot.',
    80.0
),
(
    'T3_SELECT',
    'T3 Select',
    'T3',
    'Select',
    11,
    NULL,
    'Full DM Only',
    'A T3 reward selected from available T3 rewards; awarded in an APL 11+ game. Only Full DMs can award.',
    'Replaces 1 item slot in the session. Only Full DMs can predetermine T3 select loot.',
    'T3 Select Charms and Mounts replace 1 item slot (1 per slot); Full DMs Only. Supernatural Gifts count as permanent items (combined active tiers <= PB); Full DMs Only.',
    'See individual item notes for duplicate allotments per slot.',
    'Replaces 1 item slot. Full DMs Only.',
    90.0
),
(
    'T3_PLUS',
    'T3+',
    'T3',
    'Multisession',
    11,
    3,
    'Full DM Only',
    'Tier 3+ rewards are multisession rewards that require 3+ sessions at APL 11+ to award and can only be awarded by Full DMs.',
    'Multisession rewards that require 3+ sessions at APL 11+ to award and can only be awarded by Full DMs.',
    'Multisession rewards that require 3+ sessions at APL 11+ to award and can only be awarded by Full DMs.',
    'Awarded across 3+ consecutive sessions at APL 11+. Full DMs Only.',
    'Awarded across 3+ consecutive sessions at APL 11+. Full DMs Only.',
    100.0
),
(
    'T4',
    'T4',
    'T4',
    'Rolled',
    17,
    NULL,
    'Full DM Only',
    'Awarded in an APL 17+ game; item slots equal to player count. Only Full DMs can predetermine T4 loot.',
    'Awarded in an APL 17+ game; item slots equal to player count. Only Full DMs can predetermine T4 loot.',
    'Reward tier for APL 17+ games. Full DMs Only.',
    'See individual item notes for duplicate allotments of a T4 consumable.',
    'Only Full DMs can predetermine T4 permanent loot.',
    110.0
),
(
    'T4_SELECT',
    'T4 Select',
    'T4',
    'Select',
    17,
    NULL,
    'Full DM Only',
    'A T4 reward selected from available T4 rewards; awarded in an APL 17+ game. Only Full DMs can award.',
    'Replaces 1 item slot in the session. Only Full DMs can predetermine T4 select loot.',
    'T4 Select Charms and Mounts replace 1 item slot (1 per slot); Full DMs Only. Supernatural Gifts count as permanent items (combined active tiers <= PB); Full DMs Only.',
    'See individual item notes for duplicate allotments per slot.',
    'Replaces 1 item slot. Full DMs Only.',
    120.0
),
(
    'T4_PLUS',
    'T4+',
    'T4',
    'Multisession',
    17,
    5,
    'Full DM Only',
    'Tier 4+ rewards are multisession rewards that require 5+ sessions at APL 17+ to award and can only be awarded by Full DMs.',
    'Multisession rewards that require 5+ sessions at APL 17+ to award and can only be awarded by Full DMs.',
    'Multisession rewards that require 5+ sessions at APL 17+ to award and can only be awarded by Full DMs.',
    'Awarded across 5+ consecutive sessions at APL 17+. Full DMs Only.',
    'Awarded across 5+ consecutive sessions at APL 17+. Full DMs Only.',
    130.0
),
(
    'TIER_S',
    'Tier S',
    'Tier S',
    'Multisession',
    20,
    8,
    'Full DM Only',
    'Multisession rewards requiring 8+ sessions at APL 20 and can only be awarded by Full DMs.',
    'Multisession rewards that require 8+ sessions at APL 20 to award and can only be awarded by Full DMs.',
    'Mythic Gifts: Extraordinary permanent abilities available only to level 20 characters. Cannot be traded or sold. Requires 8+ sessions at APL 20 by Full DMs. A character can have multiple, but only 1 active at a time (selected upon finishing a Long Rest).',
    'Awarded across 8+ consecutive sessions at APL 20. Full DMs Only.',
    'Awarded across 8+ consecutive sessions at APL 20. Full DMs Only.',
    140.0
),
(
    'T2_T3_T4',
    'T2+/T3+/T4+',
    'Special',
    'Multisession',
    5,
    3,
    'Full DM Only',
    'Scaling multisession rewards awarded across tier boundaries by collaborating Full DMs.',
    'Scaling multisession rewards awarded across tier boundaries by collaborating Full DMs.',
    'Scaling multisession rewards awarded across tier boundaries by collaborating Full DMs.',
    'Multisession requirements scale with chosen tier level. Full DMs Only.',
    'Multisession requirements scale with chosen tier level. Full DMs Only.',
    150.0
),
(
    'VARIES',
    'Varies',
    'Special',
    'Special',
    NULL,
    NULL,
    'Context',
    'The reward or item tier varies or is determined by the specific context or formula.',
    'Tier varies depending on the specific item variation or options selected.',
    'Tier varies depending on the specific patron, faction, or campaign circumstances.',
    'Refer to specific item text.',
    'Refer to specific item text.',
    160.0
),
(
    'NONE',
    '—',
    'Special',
    'Special',
    NULL,
    NULL,
    'Any DM',
    'No tier applies to this entry (e.g. Marks of Prestige, Story Outcomes).',
    'No tier applies.',
    'Marks of Prestige do not count against a game''s item slots or gold allotment. Quirks do not take up an item slot and can only be awarded by Full DMs.',
    'N/A',
    'N/A',
    170.0
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    tier_group = EXCLUDED.tier_group,
    award_type = EXCLUDED.award_type,
    min_apl = EXCLUDED.min_apl,
    multisession_sessions = EXCLUDED.multisession_sessions,
    dm_requirement = EXCLUDED.dm_requirement,
    description = EXCLUDED.description,
    loot_tier_rules = EXCLUDED.loot_tier_rules,
    reward_tier_rules = EXCLUDED.reward_tier_rules,
    consumable_rules = EXCLUDED.consumable_rules,
    permanent_rules = EXCLUDED.permanent_rules,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();
