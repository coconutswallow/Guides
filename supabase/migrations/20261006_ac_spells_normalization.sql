-- ==============================================================================
-- MIGRATION: 20261006_ac_spells_normalization.sql
-- Description: Normalize public.ac_spells schema with check_id, ruleset,
--              foreign key to ac_sources(source_key), fractional display_order,
--              handle_updated_at trigger, and Staff Admin & Engineer RLS policies.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Schema Alterations & Preparation
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ac_spells (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    source TEXT NOT NULL,
    notes TEXT,
    rage_advice TEXT,
    display_order DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Drop legacy constraints if they exist
ALTER TABLE public.ac_spells DROP CONSTRAINT IF EXISTS ac_spells_name_source_key;
ALTER TABLE public.ac_spells DROP CONSTRAINT IF EXISTS ac_spells_source_fkey;

-- Add check_id and ruleset columns
ALTER TABLE public.ac_spells ADD COLUMN IF NOT EXISTS check_id VARCHAR(32);
ALTER TABLE public.ac_spells ADD COLUMN IF NOT EXISTS ruleset VARCHAR(10) NOT NULL DEFAULT '2024';

-- Ensure display_order is DOUBLE PRECISION
ALTER TABLE public.ac_spells ALTER COLUMN display_order TYPE DOUBLE PRECISION USING display_order::double precision;
ALTER TABLE public.ac_spells ALTER COLUMN display_order SET DEFAULT 0.0;

-- ------------------------------------------------------------------------------
-- 2. Upsert All 20 Normalized Spell Records
-- ------------------------------------------------------------------------------
INSERT INTO public.ac_spells (
    id, check_id, name, ruleset, source, notes, rage_advice, display_order
) VALUES (
    '30767c9d-3583-43c4-9409-715a6b46f266'::uuid,
    'SPL_0001',
    'Spells from PHB (2014)',
    '2014',
    'PHB2014',
    'All Wizard spells are present in the Hawthorne Community Spellbook',
    '- Awaken: can''t be used by PCs to increase their Intelligence or gain languages.
- Clone: A creature can have only 1 existing clone, with both caster and target spending 128 DTP (if you are both the caster and target, it is 128 DTP total).
- Contingency: can''t be stored in a Glyph of Warding.
- Druidcraft: can also be used to tell the time as one of its effects
- Fabricate: The raw materials can be bought in downtime and cost the full cost of the item.
- Find Familiar: In addition to the listed options, the chosen familiar can also be any Beast that is CR 0, as well as the following options: Blood Hawk, Flying Snake.
- Find Steed: The chosen steed can be any Medium or larger Beast in Fair Game that is CR 1/2 or less.
- Gate: A creature named by the spell knows it is being targeted by the spell and can choose to refuse being summoned, causing the spell to fail.
- Glyph of Warding: can''t be cast into the extradimensional space of a bag of holding or other magic items that create extradimensional spaces.
- Magic Jar: can''t be used to permanently swap bodies
- Message: doesn''t use verbal components
- Planar Binding: A PC can only have 1 existing bound creature.
- Prestidigitation: can also be used to tell the time as one of its effects
- Reincarnate: The body part used in the spell must be taken from after the target has died and can include blood. A reincarnated PC can swap any racial feats they no longer qualify for with another feat or ASI. A PC reincarnated into a variant human gains a starting feat. A PC reincarnated out of variant human loses their starting feat. 
- Simulacrum: Only 1 simulacrum can exist per caster, and a simulacrum itself cannot cast this spell. The simulacrum can only regain HP by the alchemical process.
- Symbol: can''t be cast into the extradimensional space of a bag of holding or other magic items that create extradimensional spaces.
- Teleportation Circle: PCs know the following sigil sequences: Hawthorne, Durlag''s Tower, Lerwick Outpost, Merkin''s Keep, Port Nyanzaru, Suzail, Silent Tower, Tinkerton
- Teleport: can''t be used in downtime except to a permanent circle or a safe location you possess an associated object for
- Thaumaturgy: can also be used to tell the time as one of its effects
- True Polymorph: Any permanent transformations are reverted at the end of a DM''s adventure, except a a PC transformed as a type of character retirement.
- Wish: Using the spell beyond the scope of duplicating a spell or the bulleted options requires approval from the Lore Consultants and/or Rule Architects, unless the effect is limited to the scope of a DM''s adventure. If you receive the effect of a Wish from other than a PC or a PC-controlled creature, its effect is limited to the scope of a DM''s adventure except as approved by the Lore Consultants and/or Rule Architects. A character that loses the ability to cast the spell can never regain the ability to do so, even by reworking, except only by rerolling the stress roll with another Wish spell as per the spell''s written ability to reroll any roll made within 1 round. A PC-controlled creature casting this spell (such as a simulacrum) can only use it to duplicate a spell as written. Additionally, a creature that gains resistance to a damage type from this spell only benefits from one instance at a time; if the spell is cast again to confer damage resistance, only the most recent casting applies.',
    1.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    notes = EXCLUDED.notes,
    rage_advice = EXCLUDED.rage_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_spells (
    id, check_id, name, ruleset, source, notes, rage_advice, display_order
) VALUES (
    'a735dae9-aee2-42c6-b3b4-efffcce16aec'::uuid,
    'SPL_0002',
    'Spells from EEPC',
    '2014',
    'EEPC',
    'All spells are reprinted in XGE',
    NULL,
    2.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    notes = EXCLUDED.notes,
    rage_advice = EXCLUDED.rage_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_spells (
    id, check_id, name, ruleset, source, notes, rage_advice, display_order
) VALUES (
    '148f0432-3743-40f1-82e8-9cdb100437aa'::uuid,
    'SPL_0003',
    'Spells from SCAG',
    '2014',
    'SCAG',
    NULL,
    '- Booming Blade: The cost requirement for the weapon is removed, the spell''s range is the weapon''s reach (not Self), and the spell targets a creature within the weapon''s reach. The spell can be used with War Caster.
- Green-Flame Blade: The cost requirement for the weapon is removed, the spell''s range is the weapon''s reach (not Self), and the spell targets a creature within the weapon''s reach. The spell can be used with War Caster.
- Lightning Lure: The spell''s range is 15 feet (not Self) and targets one creature in range. The spell can be used with War Caster.
- Sword Burst: The spell''s range is 5 feet (not Self) and targets all other creatures in range. The spell can be used with War Caster.',
    3.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    notes = EXCLUDED.notes,
    rage_advice = EXCLUDED.rage_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_spells (
    id, check_id, name, ruleset, source, notes, rage_advice, display_order
) VALUES (
    '29041ca8-447a-4e66-b73e-093eee33a42a'::uuid,
    'SPL_0004',
    'Spells from XGE',
    '2014',
    'XGE',
    'All Wizard spells are present in the Hawthorne Community Spellbook',
    'Find Greater Steed: In addition to the listed options, the chosen steed can be any Beast that is CR 2 or less, as well as the following options: Dragonnel, Hippogriff, Skyjek Roc, Star Lancer',
    4.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    notes = EXCLUDED.notes,
    rage_advice = EXCLUDED.rage_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_spells (
    id, check_id, name, ruleset, source, notes, rage_advice, display_order
) VALUES (
    '22b9ca80-2741-4273-a44e-63f61a3292c5'::uuid,
    'SPL_0005',
    'Spells from GGR',
    '2014',
    'GGR',
    'Encode thoughts is Wizard only',
    'Encode thoughts: Creating a thought strand doesn''t cause the creature to lose memory of the associated thought or memory.',
    5.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    notes = EXCLUDED.notes,
    rage_advice = EXCLUDED.rage_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_spells (
    id, check_id, name, ruleset, source, notes, rage_advice, display_order
) VALUES (
    '1d7e5bfe-97a8-4129-b4e8-cd89ddacfc8e'::uuid,
    'SPL_0006',
    'Spells from LLK',
    '2014',
    'LLK',
    'All Wizard spells are present in the Hawthorne Community Spellbook',
    '- Flock of Familiars: Doesn''t require concentration and the spell ends early if you dismiss the familiars with an action or cast the spell again. A Pact of the Chain warlock can''t summon Pact of the Chain familiars with the spell.
- Galder''s Speedy Courier: After receiving a chest, the target can block your ability to reach it again with this spell for 8 hours. If you try to send another chest during that time, you learn you are blocked, and the spell fails.',
    6.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    notes = EXCLUDED.notes,
    rage_advice = EXCLUDED.rage_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_spells (
    id, check_id, name, ruleset, source, notes, rage_advice, display_order
) VALUES (
    '53659632-7ac5-4533-9017-37cea3d30fba'::uuid,
    'SPL_0007',
    'Spells from EGW',
    '2014',
    'EGW',
    '- Refer to Dunamancy in Hawthorne Arcana
- On Toril, dunamancy was rediscovered and proliferated by studying ancient Netherese chronomancy
- Chronurgy and graviturgy spells are available to different classes as listed in Rage Advice
- All Wizard spells are present in the Hawthorne Community Spellbook',
    'Sapping Sting: Cleric, Sorcerer, Warlock, Wizard
Gift of Alacrity: Artificer, Bard, Cleric, Druid, Ranger, Sorcerer, Wizard
Magnify Gravity: Druid, Sorcerer, Warlock, Wizard
Fortune''s Favor: Bard, Cleric, Druid, Sorcerer, Wizard
Immovable Object: Artificer, Wizard
Wristpocket: Artificer, Bard, Warlock, Wizard
Pulse Wave: Druid, Sorcerer, Warlock, Wizard
Gravity Sinkhole: Druid, Sorcerer, Wizard
Temporal Shunt: Bard, Cleric, Sorcerer, Warlock, Wizard
Gravity Fissure: Druid, Sorcerer, Wizard
Tether Essence: Bard, Cleric, Warlock, Wizard
Dark Star: Warlock, Wizard
Reality Break: Sorcerer, Warlock, Wizard
Ravenous Void: Sorcerer, Warlock, Wizard
Time Ravage: Cleric, Druid, Sorcerer, Warlock, Wizard

Immovable Object: The target must be an object that isn''t being worn or carried.',
    7.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    notes = EXCLUDED.notes,
    rage_advice = EXCLUDED.rage_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_spells (
    id, check_id, name, ruleset, source, notes, rage_advice, display_order
) VALUES (
    'd537a0b4-f4d8-4242-985e-770421b0e03d'::uuid,
    'SPL_0008',
    'Spells from IDRotF',
    '2014',
    'IDRotF',
    'Create Magen is Wizard only, and Frost Fingers is Sorcerer, Warlock,  Wizard.

All Wizard spells are present in the Hawthorne Community Spellbook',
    'Create Magen: The hitpoint maximum reduction also is removed if the magen dies. A PC can only have 1 existing magen.',
    8.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    notes = EXCLUDED.notes,
    rage_advice = EXCLUDED.rage_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_spells (
    id, check_id, name, ruleset, source, notes, rage_advice, display_order
) VALUES (
    '4da2f804-9fd9-4aa5-b487-84992d846fe0'::uuid,
    'SPL_0009',
    'Spells from TCE',
    '2014',
    'TCE',
    'All Wizard spells are present in the Hawthorne Community Spellbook',
    '- Booming Blade: The cost requirement for the weapon is removed, the spell''s range is the weapon''s reach (not Self), and the spell targets a creature within the weapon''s reach. The spell can be used with War Caster.
- Dream of the Blue Veil: The material component can''t be substitued with a component pouch or spellcasting focus.
- Green-Flame Blade: The cost requirement for the weapon is removed, the spell''s range is the weapon''s reach (not Self), and the spell targets a creature within the weapon''s reach. The spell can be used with War Caster.
- Lightning Lure: The spell''s range is 15 feet (not Self) and targets one creature in range. The spell can be used with War Caster.
- Sword Burst: The spell''s range is 5 feet (not Self) and targets all other creatures in range. The spell can be used with War Caster.
- Summon Aberration/Beast/Celestial/Construct/Elemental/Fey/Fiend/Shadowspawn/Undead: The summoned creature has a number of Hit Dice equal to the spell level (d6 HD for Small, d8 HD for Medium, and d10 HD for Large)',
    9.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    notes = EXCLUDED.notes,
    rage_advice = EXCLUDED.rage_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_spells (
    id, check_id, name, ruleset, source, notes, rage_advice, display_order
) VALUES (
    '330b2574-1a74-481f-8528-f07f0bff6e7b'::uuid,
    'SPL_0010',
    'Spells from FTD',
    '2014',
    'FTD',
    'All Wizard spells are present in the Hawthorne Community Spellbook',
    NULL,
    10.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    notes = EXCLUDED.notes,
    rage_advice = EXCLUDED.rage_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_spells (
    id, check_id, name, ruleset, source, notes, rage_advice, display_order
) VALUES (
    '06cfa576-36b7-44d7-bd01-ee9fdd054f8c'::uuid,
    'SPL_0011',
    'Spells from SCC',
    '2014',
    'SCC',
    'All Wizard spells are present in the Hawthorne Community Spellbook',
    '- Silvery Barbs: The reroll affects the final result of the original roll, including after any advantage or disadvantage were applied. A creature chosen to receive advantage from the spell is a target of the spell; therefore, the spell can''t benefit from the Twinned Spell Metamagic, but it can benefit from the Split Enchantment class feature if no creature is granted advantage.
- Vortex Warp: A chosen surface must be able to support the target; you can''t use the spell to force a creature to fall.',
    11.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    notes = EXCLUDED.notes,
    rage_advice = EXCLUDED.rage_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_spells (
    id, check_id, name, ruleset, source, notes, rage_advice, display_order
) VALUES (
    'd0eae827-524a-47ca-b341-75a785905e78'::uuid,
    'SPL_0012',
    'Spells from AAG',
    '2014',
    'AAG',
    'Air Bubble and Create Spelljamming Helm are present in Hawthorne Community Spellbook',
    'A spelljamming helm can only be installed onto an air, water, or space vehicle listed in Equipment except for a Canoe or Rowboat. Additionally, a spelljamming helm created by Create Spelljamming Helm cannot be sold.',
    12.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    notes = EXCLUDED.notes,
    rage_advice = EXCLUDED.rage_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_spells (
    id, check_id, name, ruleset, source, notes, rage_advice, display_order
) VALUES (
    'b19cfc52-de74-4dd7-ae20-3c89926b4021'::uuid,
    'SPL_0013',
    'Spells from BMT',
    '2014',
    'BMT',
    'All Wizard spells are present in the Hawthorne Community Spellbook',
    NULL,
    13.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    notes = EXCLUDED.notes,
    rage_advice = EXCLUDED.rage_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_spells (
    id, check_id, name, ruleset, source, notes, rage_advice, display_order
) VALUES (
    'e9a9a356-bac0-4cf9-b18a-0c924b23d3da'::uuid,
    'SPL_0014',
    'Spells from SatO',
    '2014',
    'SATO',
    'All Wizard spells are present in the Hawthorne Community Spellbook',
    NULL,
    14.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    notes = EXCLUDED.notes,
    rage_advice = EXCLUDED.rage_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_spells (
    id, check_id, name, ruleset, source, notes, rage_advice, display_order
) VALUES (
    '118ecf30-adf5-40aa-b66c-be38521273bf'::uuid,
    'SPL_0015',
    'Spells from HWCS',
    '2014',
    'HWCS',
    'All Wizard spells are present in the Hawthorne Community Spellbook',
    '- Globe of Twilight: Has a range of Self (15-foot radius, 15 feet high)
- Invoke the Amaranthine: Can call upon any deity or otherworldly being, not just an Amaranthine of Everden',
    15.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    notes = EXCLUDED.notes,
    rage_advice = EXCLUDED.rage_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_spells (
    id, check_id, name, ruleset, source, notes, rage_advice, display_order
) VALUES (
    '10bd790e-663c-4d4e-bc66-a8c5063f1715'::uuid,
    'SPL_0016',
    'Spells from HWT',
    '2014',
    'HWT',
    'Only Mend Plants is added. Other spells are reprints of what is available in Humblewood Campaign Setting (see above).',
    NULL,
    16.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    notes = EXCLUDED.notes,
    rage_advice = EXCLUDED.rage_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_spells (
    id, check_id, name, ruleset, source, notes, rage_advice, display_order
) VALUES (
    'a05ab3c1-5732-4d72-8119-cedf20a2754e'::uuid,
    'SPL_0017',
    'Spells from PHB (2024)',
    '2024',
    'PHB2024',
    'Can only be used by 2024 characters.

- Befuddlement replaces Feeblemind from PHB 2014.
- Find Steed also supersedes Find Greater Steed from XGE.
- Shining Smite replaces Branding Smite from PHB 2014.
- Summon Dragon is the renamed version of Summon Draconic Spirit from FTD, but a 2024 character can use either version of the spell.

Refer to the PHB 2024 Spell Changes for more details.

All Wizard spells are present in the Hawthorne Community Spellbook',
    '- Awaken: can''t be used by PCs to increase their Intelligence or gain languages.
- Clone: A creature can have only 1 existing clone, with both caster and target spending 128 DTP (if you are both the caster and target, it is 128 DTP total).
- Contingency: can''t be stored into a Glyph of Warding.
- Druidcraft: can also be used to tell the time as one of its effects
- Fabricate: The raw materials can be bought in downtime and cost the full cost of the item.
- Find Familiar: In addition to the listed options, the following options can be used: Blood Hawk, Flying Snake
- Gate: A creature named by the spell knows it is being targeted by the spell and can choose to refuse being summoned, causing the spell to fail.
- Glyph of Warding: can''t be cast into the extradimensional space of a bag of holding or other magic items that create extradimensional spaces.
- Magic Jar: can''t be used to permanently swap bodies.
- Planar Binding: A PC can only have 1 existing bound creature.
- Prestidigitation: can also be used to tell the time as one of its effects
- Reincarnate: The body part used in the spell must be taken from after the target has died and can include blood. A reincarnated PC can swap any racial feats they no longer qualify for with another feat or ASI. A PC reincarnated into a human gains an additional Origin feat. A PC reincarnated out of human loses their racial Origin feat. 
- Simulacrum: Only 1 simulacrum can exist per caster.
- Symbol: can''t be cast into the extradimensional space of a bag of holding or other magic items that create extradimensional spaces.
- Animate Objects, Giant Insect, Summon Aberration / Beast / Celestial / Construct / Dragon / Elemental / Fey / Fiend / Undead: The summoned creature has a number of Hit Dice equal to the spell level (d6 HD for Small, d8 HD for Medium, and d10 HD for Large)
- Tasha''s Bubbling Cauldron: creates the caster''s choice of a number of T1 or lower potions.These potions can''t be traded.
- Teleportation Circle: PCs know the following sigil sequences: Hawthorne, Durlag''s Tower, Lerwick Outpost, Merkin''s Keep, Port Nyanzaru, Suzail, Silent Tower, Tinkerton
- Teleport: can''t be used in downtime except to a permanent circle or a safe location you possess a linked object for
- Thaumaturgy: can also be used to tell the time as one of its effects
- True Polymorph: Any permanent transformations are reverted at the end of a DM''s adventure, except a a PC transformed as a type of character retirement.
- Wish: Using the spell to Reshape Reality requires approval from the Lore Consultants and/or Rule Architects, unless the effect is limited to the scope of a DM''s adventure. If you receive the effect of a Wish from other than a PC or a PC-controlled creature, its effect is limited to the scope of a DM''s adventure except as approved by the Lore Consultants and/or Rule Architects. A character that loses the ability to cast the spell can never regain the ability to do so, even by reworking, except only by Roll Redo from another Wish spell or Heroic Inspiration. A PC-controlled creature casting this spell (such as a simulacrum) can only use it to duplicate a spell as written. Additionally, a creature only benefits from one instance of the Resistance option at a time; if the spell is used again to confer Resistance, only the most recent casting applies.',
    17.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    notes = EXCLUDED.notes,
    rage_advice = EXCLUDED.rage_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_spells (
    id, check_id, name, ruleset, source, notes, rage_advice, display_order
) VALUES (
    '55ca1d76-41ad-4020-8f28-2b0fd3030650'::uuid,
    'SPL_0018',
    'Spells from FRHOF (2024)',
    '2024',
    'FRHOF',
    'Can only be used by 2024 characters.

Circle Magic can be used as written with any eligible spell in Allowed Content (Spells)

Deryan''s Helpful Homunculi and Conjure Constructs are also Artificer spells for the 2024 EFA Artificer

All Wizard spells are present in the Hawthorne Community Spellbook',
    '- Deryan''s Helpful Homunculi: The assistant created by this spell can assist with crafting either Equipment or in crafting magic items. If the assistant is used to help craft Equipment, the DTP cost to craft that Equipment is halved (rounded up). However, you must pay for the spell’s Material component costs for each DTP spent this way to craft and additionally add the spell level this spell is cast at in DTP. For crafting magic items, the assistant cannot be used to assist in crafting any magic items that can be used to cast spells or that have restricted attunement requirements. The assistant otherwise can be used to halve the base DTP cost to craft a magic item (rounded up) at your Bastion as if they were an assisting PC. However, you must pay for the spell’s Material component costs for each DTP spent this way to craft and additionally add the spell level this spell is cast at in DTP, as well as the additional 3 or 21 DTP as normal. The assistant can be used in conjunction with an assisting PC. The DTP cost to craft a magic item in this way is two-thirds of its original base DTP cost, with you and the assisting PC expending one-third of the base DTP cost each (round up). However, you must pay for the spell’s Material component costs for each DTP you spent this way to craft and additionally add the spell level this spell is cast at in DTP, as well as the additional 3 or 21 DTP as normal.
- Dirge: The Speed of a target that succeeds on its saving throw is halved until the end of the creature''s next turn.
- Doomtide: The spell’s special component (a string of three black pearls from Pandemonium) that is used when casting the spell as a circle spell can’t be obtained in downtime but instead typically from an adventure.',
    18.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    notes = EXCLUDED.notes,
    rage_advice = EXCLUDED.rage_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_spells (
    id, check_id, name, ruleset, source, notes, rage_advice, display_order
) VALUES (
    'c032649a-5b48-436f-b472-a1b415a78280'::uuid,
    'SPL_0019',
    'Spells from AU (2024)',
    '2024',
    'AU',
    'Can only be used by 2024 characters.

The following Wizard spells are present in the Hawthorne Community Spellbook: Catnap, Enervation, Illusory Dragon, Invulnerability, Negative Energy Flood, Power Word Pain, Wither and Bloom',
    '- Distorted Distance: The effect of Elongated Distance lasts until the end of the creature''s next turn.
- Lightning Ring: A creature makes a save against the Emanation only once per turn.
- Summon Dinosaur: The summoned creature has a number of Hit Dice (d12) equal to the spell level
- Summon Plant: The summoned creature has a number of Hit Dice (d10) equal to the spell level',
    19.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    notes = EXCLUDED.notes,
    rage_advice = EXCLUDED.rage_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_spells (
    id, check_id, name, ruleset, source, notes, rage_advice, display_order
) VALUES (
    '0b9439f7-8e46-4602-bb98-fb191603b6f6'::uuid,
    'SPL_0020',
    'Spells from EFA (2024)',
    '2024',
    'EFA',
    NULL,
    NULL,
    20.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    name = EXCLUDED.name,
    ruleset = EXCLUDED.ruleset,
    source = EXCLUDED.source,
    notes = EXCLUDED.notes,
    rage_advice = EXCLUDED.rage_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

-- ------------------------------------------------------------------------------
-- 3. Enforce Integrity Constraints & Foreign Keys
-- ------------------------------------------------------------------------------
ALTER TABLE public.ac_spells ALTER COLUMN check_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'ac_spells_check_id_key' AND table_name = 'ac_spells'
    ) THEN
        ALTER TABLE public.ac_spells ADD CONSTRAINT ac_spells_check_id_key UNIQUE (check_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'uq_ac_spells_name_ruleset' AND table_name = 'ac_spells'
    ) THEN
        ALTER TABLE public.ac_spells ADD CONSTRAINT uq_ac_spells_name_ruleset UNIQUE (name, ruleset);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'ac_spells_source_fkey' AND table_name = 'ac_spells'
    ) THEN
        ALTER TABLE public.ac_spells ADD CONSTRAINT ac_spells_source_fkey FOREIGN KEY (source) REFERENCES public.ac_sources(source_key);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 4. Create Indexes
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_ac_spells_check_id ON public.ac_spells(check_id);
CREATE INDEX IF NOT EXISTS idx_ac_spells_source ON public.ac_spells(source);
CREATE INDEX IF NOT EXISTS idx_ac_spells_ruleset ON public.ac_spells(ruleset);
CREATE INDEX IF NOT EXISTS idx_ac_spells_display_order ON public.ac_spells(display_order);

-- ------------------------------------------------------------------------------
-- 5. Updated_At Trigger
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS set_ac_spells_updated_at ON public.ac_spells;
CREATE TRIGGER set_ac_spells_updated_at
    BEFORE UPDATE ON public.ac_spells
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 6. Row Level Security (RLS) Policies
-- ------------------------------------------------------------------------------
ALTER TABLE public.ac_spells ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to ac_spells" ON public.ac_spells;
CREATE POLICY "Allow public read access to ac_spells"
ON public.ac_spells FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow service_role to manage ac_spells" ON public.ac_spells;
CREATE POLICY "Allow service_role to manage ac_spells"
ON public.ac_spells FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins and Engineers can manage ac_spells" ON public.ac_spells;
CREATE POLICY "Admins and Engineers can manage ac_spells"
ON public.ac_spells FOR ALL
TO authenticated
USING (
  ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
  OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
)
WITH CHECK (
  ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
  OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
);
