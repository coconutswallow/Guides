-- ==============================================================================
-- MIGRATION: 20261006_ac_downtime_normalization.sql
-- Description: Normalize public.ac_downtime_type and public.ac_downtime schemas.
--              Includes check_id (DT_0001..DT_0130), downtime_type_id foreign key,
--              activity mirror column, fractional display_order (DOUBLE PRECISION),
--              compatibility view public.ac_downtime_categories,
--              handle_updated_at triggers, and Staff Admin & Engineer RLS policies.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Schema Setup for public.ac_downtime_type
-- ------------------------------------------------------------------------------
-- Temporarily drop view if it already exists from a previous migration run
DROP VIEW IF EXISTS public.ac_downtime_categories CASCADE;
DROP TABLE IF EXISTS public.ac_downtime_categories CASCADE;

CREATE TABLE IF NOT EXISTS public.ac_downtime_type (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    notes TEXT,
    display_order DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.ac_downtime_type ALTER COLUMN display_order TYPE DOUBLE PRECISION USING display_order::double precision;

-- ------------------------------------------------------------------------------
-- 2. Upsert All 13 Downtime Types
-- ------------------------------------------------------------------------------
INSERT INTO public.ac_downtime_type (id, name, description, notes, display_order)
VALUES (
    'cd57e12c-2d6b-472d-ba30-74dd5612c4d6'::uuid,
    'Bastions',
    'You must be level 5+ to build and benefit from a Bastion. You can only build and benefit from one Bastion as part of downtime (see Appendix B of the [Player Guidelines](https://hawthorneguild.github.io/Guides/playersguide/appendices/bastions/) for details)

You can only construct a Bastion either a) near Hawthorne or a guild outpost or b) at another world location if you are able to claim a parcel of land or stronghold as part of an adventure as determined by the DM.',
    'You must be level 5+ to build and benefit from a Bastion. You can only build and benefit from one Bastion as part of downtime (see Appendix B of the [Player Guidelines](https://hawthorneguild.github.io/Guides/playersguide/appendices/bastions/) for details)

You can only construct a Bastion either a) near Hawthorne or a guild outpost or b) at another world location if you are able to claim a parcel of land or stronghold as part of an adventure as determined by the DM.',
    1.0
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    notes = EXCLUDED.notes,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime_type (id, name, description, notes, display_order)
VALUES (
    'c584deb3-05b0-46fe-a407-0bbe2825f6de'::uuid,
    'Building a Stronghold',
    'As described in the Dungeon Master''s Guide, Strongholds (also known as "Fortifications") are structures that can be built or acquired by characters. Unlike Bastions, strongholds provide no inherent mechanical benefit.

Similar to Bastions, you can only construct a Stronghold either a) near Hawthorne or a guild outpost or b) at another world location if you are able to claim a parcel of land or stronghold as part of an adventure as determined by the DM.

A Stronghold is assumed to be able to cover its own maintenance costs each month and does not require a character to pay for it.

Any number of PCs of other players can mutually contribute gold and DTP to build a Stronghold but only one PC can be logged as the owner of it.

A Stronghold can be used to build a Bastion as described in [Appendix B](https://hawthorneguild.github.io/Guides/playersguide/appendices/bastions/) of the Player Guidelines.',
    'As described in the Dungeon Master''s Guide, Strongholds (also known as "Fortifications") are structures that can be built or acquired by characters. Unlike Bastions, strongholds provide no inherent mechanical benefit.

Similar to Bastions, you can only construct a Stronghold either a) near Hawthorne or a guild outpost or b) at another world location if you are able to claim a parcel of land or stronghold as part of an adventure as determined by the DM.

A Stronghold is assumed to be able to cover its own maintenance costs each month and does not require a character to pay for it.

Any number of PCs of other players can mutually contribute gold and DTP to build a Stronghold but only one PC can be logged as the owner of it.

A Stronghold can be used to build a Bastion as described in [Appendix B](https://hawthorneguild.github.io/Guides/playersguide/appendices/bastions/) of the Player Guidelines.',
    2.0
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    notes = EXCLUDED.notes,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime_type (id, name, description, notes, display_order)
VALUES (
    'b4459d2f-ecbd-4f09-bbc3-5b6a33dea143'::uuid,
    'Buying & Selling',
    'Individual items worth up to 15,000 GP can be purchased in Hawthorne. More expensive items must be purchased in Waterdeep or other major cities.',
    'Individual items worth up to 15,000 GP can be purchased in Hawthorne. More expensive items must be purchased in Waterdeep or other major cities.',
    3.0
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    notes = EXCLUDED.notes,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime_type (id, name, description, notes, display_order)
VALUES (
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'Crafting',
    'Except where otherwise stated, crafting equipment requires proficiency in a corresponding tool, costs DTP equal to the item cost / 25, and costs gold equal to half the item cost.',
    'Except where otherwise stated, crafting equipment requires proficiency in a corresponding tool, costs DTP equal to the item cost / 25, and costs gold equal to half the item cost.',
    4.0
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    notes = EXCLUDED.notes,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime_type (id, name, description, notes, display_order)
VALUES (
    '00f09436-9aaf-4875-bc43-ebf3af6c7bb6'::uuid,
    'Research',
    'Research can only be conducted with respect to an adventure as overseen by a DM',
    'Research can only be conducted with respect to an adventure as overseen by a DM',
    5.0
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    notes = EXCLUDED.notes,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime_type (id, name, description, notes, display_order)
VALUES (
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    'Reworking',
    'All reworks must be logged in #character-rework-log for approval by an Auditor

You must log all reworks in your Master Adventurer Log (MAL) in the session section

You can fully refund any rework prior to your first game played or DMPCed with that character. Log the refund in #character-rework-log for approval by an Auditor

You can partially refund (50% GP and DTP recouped) any rework before your 3rd game played or DMPCed with that character. Log the refund in #character-rework-log for approval by an Auditor',
    'All reworks must be logged in #character-rework-log for approval by an Auditor

You must log all reworks in your Master Adventurer Log (MAL) in the session section

You can fully refund any rework prior to your first game played or DMPCed with that character. Log the refund in #character-rework-log for approval by an Auditor

You can partially refund (50% GP and DTP recouped) any rework before your 3rd game played or DMPCed with that character. Log the refund in #character-rework-log for approval by an Auditor',
    6.0
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    notes = EXCLUDED.notes,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime_type (id, name, description, notes, display_order)
VALUES (
    'ecd4d90a-cdd3-4223-8afc-0d889f410f09'::uuid,
    'Spellcasting',
    'Hawthorne has a community spellbook to copy spells from and into located at Hawthorne University (See #hawthorne-universtity )',
    'Hawthorne has a community spellbook to copy spells from and into located at Hawthorne University (See #hawthorne-universtity )',
    7.0
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    notes = EXCLUDED.notes,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime_type (id, name, description, notes, display_order)
VALUES (
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'Spellcasting Services',
    'These spellcasting services by NPCs can only be used in Hawthorne or in other villages (level 0 - 2 spells) or other towns or cities (level 0 - 5 spells)',
    'These spellcasting services by NPCs can only be used in Hawthorne or in other villages (level 0 - 2 spells) or other towns or cities (level 0 - 5 spells)',
    8.0
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    notes = EXCLUDED.notes,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime_type (id, name, description, notes, display_order)
VALUES (
    'd8d3c2ad-0c10-4760-a696-5cd78b60f89b'::uuid,
    'Trading',
    'Only PCs in the same location can trade with each other and any items you obtain via trading with another PC must be of your PC''s tier or lower

You can''t trade gold or equipment that can be sold for gold between your PCs, even by proxy or cross character trade

Items and equpment created by class features can''t be traded or sold. Supernatural Rewards also cannot be traded or sold.',
    'Only PCs in the same location can trade with each other and any items you obtain via trading with another PC must be of your PC''s tier or lower

You can''t trade gold or equipment that can be sold for gold between your PCs, even by proxy or cross character trade

Items and equpment created by class features can''t be traded or sold. Supernatural Rewards also cannot be traded or sold.',
    9.0
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    notes = EXCLUDED.notes,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime_type (id, name, description, notes, display_order)
VALUES (
    'bf982e7d-7dd2-408e-b5e0-223f7aaf138e'::uuid,
    'Training',
    'Besides learning by yourself, another player''s PC that knows a language or has a tool proficiency can teach your PC that language or tool proficiency. You expend the listed DTP cost but no gold and the teacher PC expends half the listed DTP.

Both your PC and the teacher PC must be in the same location, and the teacher must be another player''s PC; the teacher cannot be one of your own PCs.

The teacher can choose at their discretion to charge you gold for teaching, using the rules for trading gold.',
    'Besides learning by yourself, another player''s PC that knows a language or has a tool proficiency can teach your PC that language or tool proficiency. You expend the listed DTP cost but no gold and the teacher PC expends half the listed DTP.

Both your PC and the teacher PC must be in the same location, and the teacher must be another player''s PC; the teacher cannot be one of your own PCs.

The teacher can choose at their discretion to charge you gold for teaching, using the rules for trading gold.',
    10.0
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    notes = EXCLUDED.notes,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime_type (id, name, description, notes, display_order)
VALUES (
    '46a73f33-8302-4739-a18b-47963154b8fe'::uuid,
    'Traveling',
    'Traveling costs 1 DTP and 1 GP per day of travel and uses the travel rules in the PHB (2014 p.181, 2024 p. 20) and DMG (2014 p. 242), with a maximum of 8 hours traveled per day.

Travel distances to major cities are in the [Player Guidelines](https://hawthorneguild.github.io/Guides/playersguide/downtime/#traveling). Refer to the [map in ](https://www.aidedd.org/atlas/faerun)[Forgotten Realms: Heroes of Faerûn](https://www.aidedd.org/atlas/faerun) to help determine distances and plan travel as necessary.',
    'Traveling costs 1 DTP and 1 GP per day of travel and uses the travel rules in the PHB (2014 p.181, 2024 p. 20) and DMG (2014 p. 242), with a maximum of 8 hours traveled per day.

Travel distances to major cities are in the [Player Guidelines](https://hawthorneguild.github.io/Guides/playersguide/downtime/#traveling). Refer to the [map in ](https://www.aidedd.org/atlas/faerun)[Forgotten Realms: Heroes of Faerûn](https://www.aidedd.org/atlas/faerun) to help determine distances and plan travel as necessary.',
    11.0
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    notes = EXCLUDED.notes,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime_type (id, name, description, notes, display_order)
VALUES (
    'e23d5a97-6350-4cbb-9713-3bd234e967b5'::uuid,
    'Work',
    'The roll and the amount of gold gained must be logged in #downtime-log',
    'The roll and the amount of gold gained must be logged in #downtime-log',
    12.0
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    notes = EXCLUDED.notes,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime_type (id, name, description, notes, display_order)
VALUES (
    'a74477c9-038f-4368-b515-f6c997e45349'::uuid,
    'Miscellaneous',
    NULL,
    NULL,
    13.0
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    notes = EXCLUDED.notes,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

-- ------------------------------------------------------------------------------
-- 3. Schema Setup & Evolution for public.ac_downtime
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ac_downtime (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID,
    downtime_type_id UUID REFERENCES public.ac_downtime_type(id) ON DELETE SET NULL,
    check_id VARCHAR(32),
    name TEXT NOT NULL,
    activity TEXT,
    gold_cost TEXT,
    dtp_cost TEXT,
    description TEXT,
    notes_advice TEXT,
    display_order DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ensure columns exist
ALTER TABLE public.ac_downtime ADD COLUMN IF NOT EXISTS check_id VARCHAR(32);
ALTER TABLE public.ac_downtime ADD COLUMN IF NOT EXISTS downtime_type_id UUID REFERENCES public.ac_downtime_type(id) ON DELETE SET NULL;
ALTER TABLE public.ac_downtime ADD COLUMN IF NOT EXISTS activity TEXT;

-- Ensure display_order is DOUBLE PRECISION
ALTER TABLE public.ac_downtime ALTER COLUMN display_order TYPE DOUBLE PRECISION USING display_order::double precision;
ALTER TABLE public.ac_downtime ALTER COLUMN display_order SET DEFAULT 0.0;

-- Drop legacy foreign key constraints and unique constraints if needed
ALTER TABLE public.ac_downtime DROP CONSTRAINT IF EXISTS ac_downtime_category_id_fkey;
ALTER TABLE public.ac_downtime DROP CONSTRAINT IF EXISTS ac_downtime_name_key;

-- Re-point category_id to ac_downtime_type(id) for clean backwards compatibility
ALTER TABLE public.ac_downtime ADD CONSTRAINT ac_downtime_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES public.ac_downtime_type(id) ON DELETE SET NULL;

-- ------------------------------------------------------------------------------
-- 4. Compatibility View for legacy ac_downtime_categories references
-- ------------------------------------------------------------------------------
-- Drop old table if exists and replace with view
DROP TABLE IF EXISTS public.ac_downtime_categories CASCADE;
CREATE OR REPLACE VIEW public.ac_downtime_categories AS
SELECT id, name, notes, description, display_order, created_at, updated_at
FROM public.ac_downtime_type;

-- ------------------------------------------------------------------------------
-- 5. Upsert All 130 Downtime Activities
-- ------------------------------------------------------------------------------
INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '1bcd0379-9916-48c0-a5c1-fa5f6b594bcb'::uuid,
    'DT_0001',
    'cd57e12c-2d6b-472d-ba30-74dd5612c4d6'::uuid,
    'cd57e12c-2d6b-472d-ba30-74dd5612c4d6'::uuid,
    'Construct or Expand a Bastion',
    'Construct or Expand a Bastion',
    'Varies',
    'Varies',
    'Constructing or expanding a Bastion by adding or replacing one or more facilities. See the Bastions sheet for details and Appendix B of the [Player Guidelines](https://hawthorneguild.github.io/Guides/playersguide/appendices/bastions/) for details.',
    '- Bastions use the rules for Bastions as described in chapter 8 of the 2024 Dungeon Master''s Guide, with modifications as listed in the Bastions sheet and Appendix B of the [Player Guidelines](https://hawthorneguild.github.io/Guides/playersguide/appendices/bastions/).
- Your starting Bastion must contain two Basic Facilities (one Cramped, one Roomy) and two Special Facilities you qualify for.
- Any facility or component built as part of a Bastion can be torn down and 50% of its gold cost refunded. The Bastion must still contain at least two Basic Facilities (including one Cramped and one Roomy) and two Special Facilities afterward to be useable.                                                                                                                
- A Special Facility can be replaced with another Special Facility by paying the gold and DTP to build the new facility, but the full gold cost of the old facility contributes to the new one                                                                                                                
- A Bastion can also be built into a mobile Bastion as described in chapter 3 of [Eberron: Forge of the Artificer](https://www.dndbeyond.com/sources/dnd/efota). The Bastion must be built into an appropriate air, space, or water vehicle, with the vehicle''s cost to acquire paid separately, and requires an associated Special Facility to allow for propulsion. A mobile Bastion can be built wherever the vehicle is berthed. An eligible vehicle can likewise also be built into a mobile Bastion with the appropriate Special Facility. Besides taking a Bastion Turn to travel as written, a mobile Bastion can be used as a vehicle as normal to travel during an adventure or in downtime as per the Traveling downtime activity.
- You can combine your Bastion with Bastions built by one or more characters of other players into a single structure as written in the 2024 Dungeon Master''s Guide (page 334). Each participant can mutually contribute gold and DTP in building and expanding Bastions in this way.',
    1.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'f21a6a70-05fd-4931-90f7-e0e1dcca55ad'::uuid,
    'DT_0002',
    'cd57e12c-2d6b-472d-ba30-74dd5612c4d6'::uuid,
    'cd57e12c-2d6b-472d-ba30-74dd5612c4d6'::uuid,
    'Construct or Expand a Shared Bastion',
    'Construct or Expand a Shared Bastion',
    'Varies',
    'Varies',
    'Constructing or expanding a Bastion that is Shared by characters of different players.* See the Bastions sheet for details and Appendix B of the [Player Guidelines](https://hawthorneguild.github.io/Guides/playersguide/appendices/bastions/) for details.**

* Each participant must build one or more Special Facilities of a Shared Bastion, with the maximum number of Special Facilities in a Shared Bastion according to the highest level participating PC (up to 6 by level 17+).

** An existing Bastion can be converted into a Shared Bastion with new participants constructing one or more Special Facilities. If the Bastion already has the maximum number of Special Facilities according to the highest level participating PC, an existing Special Facility must be torn down first to make room. Additionally, Shared Bastions can be Combined with either the singular or Shared Bastions of PCs of other players as normal.',
    '- A Shared Bastion is a single Bastion built and expanded by one or more characters of different players. This Bastion counts as the single Bastion a character can benefit from at a single time and each participant can mutually benefit from and issue orders to any Special Facility they meet the prerequisites for.
- To construct a Shared Bastion, the construction must be specifically logged as a Shared Bastion in #downtime-logs, with each participant logging the facilities they are contributing gold and DTP to build. A participant must contribute the entire gold and DTP cost to construct at least one Special Facility of a Shared Bastion to benefit from a Shared Bastion. Likewise, the entire cost of any individual Basic Facility or other component (such as a Defensive Wall) must be fully paid for in gold and DTP by a single participant at a time.
- The initial construction logs by each participant must also indicate the initial list of Special Facilities each participant is choosing to benefit from. The maximum number of Special Facilities any individual participant can benefit from at a time still depends on their character level as per the table in Appendix B of the [Player Guidelines](https://hawthorneguild.github.io/Guides/playersguide/appendices/bastions/) and the maximum number of such facilities in the Bastion depends on the highest level participant.
- When expanding a Shared Bastion with additional Basic and Special Facilities, each participant must also log which newly constructed Special Facilities if any they are now benefitting from. These logs must reply to the most recent construction or expansion logs in #downtime-logs and must have an updated list of the Bastion''s facilities.
- A participant that levels up and can benefit from more Special Facilities must likewise log which additional Special Facilities if any they are choosing to gain the benefit of and must reply to the most recent construction or expansion log in #downtime-logs
- Besides adding to the list of Special Facilities they are benefitting from, a participant can swap one Special Facility they are benefitting from for another existing Special Facility by expending the DTP cost to construct the latter Special Facility and log the swap in #downtime-logs by replying to the most recent construction or expansion log in #downtime-logs
- If a participant wishes to tear down a facility or component or otherwise replace a Special Facility with another one, they must log doing so in #downtime-logs by replying to the most recent construction or expansion log and with an updated list of the Bastion''s facilities. A participant can only tear down or replace a facility or component they constructed. Each participant must log which Special Facilities if any they are now benefitting from, excising any Special Facility that was torn down from their list.
- Bastion Turns are issued individually as if a participant was the sole owner of the Bastion and can only order facilities they are benefitting from.',
    2.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'dea352a4-c0e0-5136-bf21-ced213b99d97'::uuid,
    'DT_0003',
    'cd57e12c-2d6b-472d-ba30-74dd5612c4d6'::uuid,
    'cd57e12c-2d6b-472d-ba30-74dd5612c4d6'::uuid,
    'Haunted Bastions',
    'Haunted Bastions',
    'Varies',
    'Varies',
    'Adding a Haunted Bastion Facility to your Bastion as described in Ravenloft: The Horrors Within',
    '- When adding or replacing a Bastion Special facility, if none of the Bastion’s Special Facilities are already Haunted, you can choose for the new facility to be Haunted.
- As written, a Haunted Special Facility cannot be replaced nor can it be torn down until it is no longer Haunted.
- Whenever a Bastion has at least one Haunted Special Facility, any new Special Facility added as a new facility or replacement has a chance of becoming Haunted: when adding the facility, roll a d6 in #downtime-logs and if the result is even, the new facility is also Haunted.
- Bastion Hauntings only occur as written when taking a Bastion Turn as overseen by a DM. Otherwise, whenever you take a Bastion Turn in downtime and issue an order to one or more Haunted Special Facilities, roll a d6 per Haunted Special Facility that was issued an order. If any die rolls a 1, the DTP cost of the Bastion Turn doubles to 14 DTP for that turn.',
    3.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '874552e4-b75a-468d-8d2f-8b1578dcabb0'::uuid,
    'DT_0004',
    'cd57e12c-2d6b-472d-ba30-74dd5612c4d6'::uuid,
    'cd57e12c-2d6b-472d-ba30-74dd5612c4d6'::uuid,
    'Taking a Bastion Turn',
    'Taking a Bastion Turn',
    '0',
    '7',
    'Taking a Bastion Turn and issuing orders to one or more of your Bastion''s Special Facilities (except Maintain)',
    '- When taking a Bastion Turn in downtime, you can''t issue the Maintain order. You must be present at your Bastion or have a way to communicate with your Bastion''s hirelings (e.g. Sending) to take a Bastion turn. (Because the Maintain order can''t be issued, Bastion Events can''t occur during downtime)
- When taking a Bastion Turn during an adventure, you must still expend 7 DTP unless the Maintain order is issued. A DM can choose to incorporate Bastion Events during an adventure after the Maintain order has been issued. Any rewards obtained via a Bastion Event must fit within the adventure''s gold and item allotment using the server rules.',
    4.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '196990bc-91bb-4a1f-939d-b46b4924b3e2'::uuid,
    'DT_0005',
    'c584deb3-05b0-46fe-a407-0bbe2825f6de'::uuid,
    'c584deb3-05b0-46fe-a407-0bbe2825f6de'::uuid,
    'Bastion (Stronghold)',
    'Bastion (Stronghold)',
    'Varies',
    'Varies',
    'Building a Stronghold in the form of a Bastion''s Basic and Special Facilities, except it provides no mechanical benefit.',
    '- A Stronghold can be built as using the rules and costs for building a Bastion as described in [Appendix B](https://hawthorneguild.github.io/Guides/playersguide/appendices/bastions/) of the Player Guidelines, except it can''t be used to take Bastion Turns or to gain any benefits from its Special Facilities. A Stronghold built as a Bastion in this way doesn''t count against the normal limit of 1 Bastion a character can ever own and benefit from at a time.
- A Stronghold built as a Bastion in this way still follows all the normal rules for constructing or expanding a Bastion, except any number of PCs of other players can mutually contribute gold and DTP to build the Bastion as a Stronghold. Only one PC can be logged as the owner of the Stronghold.
- A character must still fulfill all the normal prerequisites for building Bastions, including any prerequisites for its Special Facilities.',
    5.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'a5927777-e6e7-4ad4-8e30-e7b425f57c44'::uuid,
    'DT_0006',
    'c584deb3-05b0-46fe-a407-0bbe2825f6de'::uuid,
    'c584deb3-05b0-46fe-a407-0bbe2825f6de'::uuid,
    'Abbey',
    'Abbey',
    '-50000',
    '400',
    'Building an abbey as a Stronghold. See the 2014 Dungeon Master''s Guide for description.',
    'An abbey comes with 5 skilled hirelings and 25 unskilled hirelings.',
    6.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'f56530e4-cc82-4dec-aa8b-29a2b28a425b'::uuid,
    'DT_0007',
    'c584deb3-05b0-46fe-a407-0bbe2825f6de'::uuid,
    'c584deb3-05b0-46fe-a407-0bbe2825f6de'::uuid,
    'Guildhall, town or city',
    'Guildhall, town or city',
    '-5000',
    '60',
    'Building a town or city guildhall as a Stronghold. See the 2014 Dungeon Master''s Guide for description.',
    'A guildhall comes with 5 skilled hirelings and 3 unskilled hirelings.',
    7.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '6b707ead-bfcd-4844-9b18-9b5eca5a342b'::uuid,
    'DT_0008',
    'c584deb3-05b0-46fe-a407-0bbe2825f6de'::uuid,
    'c584deb3-05b0-46fe-a407-0bbe2825f6de'::uuid,
    'Keep or small castle',
    'Keep or small castle',
    '-50000',
    '400',
    'Building a keep or small castle as a Stronghold. See the 2014 Dungeon Master''s Guide for description.',
    'A keep or small castle comes with 50 skilled hirelings and 50 unskilled hirelings.',
    8.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'ab2d606b-a952-4ff0-9af5-781b9e712a32'::uuid,
    'DT_0009',
    'c584deb3-05b0-46fe-a407-0bbe2825f6de'::uuid,
    'c584deb3-05b0-46fe-a407-0bbe2825f6de'::uuid,
    'Noble estate with manor',
    'Noble estate with manor',
    '-25000',
    '150',
    'Building a noble estate with manor as a Stronghold. See the 2014 Dungeon Master''s Guide for description.',
    'A noble estate with manor comes with 3 skilled hirelings and 15 unskilled hirelings.',
    9.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '1f3a828e-4e58-47e6-8de0-5c45d4f60e5d'::uuid,
    'DT_0010',
    'c584deb3-05b0-46fe-a407-0bbe2825f6de'::uuid,
    'c584deb3-05b0-46fe-a407-0bbe2825f6de'::uuid,
    'Outpost or fort',
    'Outpost or fort',
    '-15000',
    '100',
    'Building an outpost or fort as a Stronghold. See the 2014 Dungeon Master''s Guide for description.',
    'An outpost or fort comes with 20 skilled hirelings and 40 unskilled hirelings.',
    10.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '6ccc5a70-be24-411a-ba51-d5ce4ccb2f6e'::uuid,
    'DT_0011',
    'c584deb3-05b0-46fe-a407-0bbe2825f6de'::uuid,
    'c584deb3-05b0-46fe-a407-0bbe2825f6de'::uuid,
    'Palace or large castle',
    'Palace or large castle',
    '-500000',
    '1200',
    'Building a palace or large castle as a Stronghold. See the 2014 Dungeon Master''s Guide for description.',
    'A palace or large castle comes with 200 skilled hirelings and 100 unskilled hirelings.',
    11.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'e2697840-c7ba-49e4-89b0-0c5a3bf7b469'::uuid,
    'DT_0012',
    'c584deb3-05b0-46fe-a407-0bbe2825f6de'::uuid,
    'c584deb3-05b0-46fe-a407-0bbe2825f6de'::uuid,
    'Temple',
    'Temple',
    '-5000',
    '400',
    'Building a temple as a Stronghold. See the 2014 Dungeon Master''s Guide for description.',
    'A temple comes with 10 skilled hirelings and 10 unskilled hirelings.',
    12.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '0a86a7d2-8b1a-4a5e-8014-ac256757af32'::uuid,
    'DT_0013',
    'c584deb3-05b0-46fe-a407-0bbe2825f6de'::uuid,
    'c584deb3-05b0-46fe-a407-0bbe2825f6de'::uuid,
    'Tower, fortified',
    'Tower, fortified',
    '-15000',
    '100',
    'Building a fortified tower as a Stronghold. See the 2014 Dungeon Master''s Guide for description.',
    'A fortified tower comes with 10 skilled hirelings.',
    13.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '345e6623-2630-4832-a348-cf23298fb918'::uuid,
    'DT_0014',
    'c584deb3-05b0-46fe-a407-0bbe2825f6de'::uuid,
    'c584deb3-05b0-46fe-a407-0bbe2825f6de'::uuid,
    'Trading post',
    'Trading post',
    '-5000',
    '60',
    'Building a trading post as a Stronghold. See the 2014 Dungeon Master''s Guide for description.',
    'A trading post comes with 4 skilled hirelings and 2 unskilled hirelings.',
    14.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'c54d0ef0-15f6-4e6b-a761-ed994a31f5dc'::uuid,
    'DT_0015',
    'b4459d2f-ecbd-4f09-bbc3-5b6a33dea143'::uuid,
    'b4459d2f-ecbd-4f09-bbc3-5b6a33dea143'::uuid,
    'Buying or Selling Armor',
    'Buying or Selling Armor',
    'Varies',
    '0',
    'Buying or selling Armor. See link to Equipment sheet for details.',
    'Armor you sell fetches half price',
    15.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '4eb60103-36a0-4cbd-8ff2-6a13efb4075e'::uuid,
    'DT_0016',
    'b4459d2f-ecbd-4f09-bbc3-5b6a33dea143'::uuid,
    'b4459d2f-ecbd-4f09-bbc3-5b6a33dea143'::uuid,
    'Buying or Selling Weapons',
    'Buying or Selling Weapons',
    'Varies',
    '0',
    'Buying or selling Weapons. See link to Equipment sheet for details.',
    'Weapons you sell fetch half price',
    16.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '93c8b537-e834-4267-bf7e-398edce7c7fa'::uuid,
    'DT_0017',
    'b4459d2f-ecbd-4f09-bbc3-5b6a33dea143'::uuid,
    'b4459d2f-ecbd-4f09-bbc3-5b6a33dea143'::uuid,
    'Buying or Selling Tools',
    'Buying or Selling Tools',
    'Varies',
    '0',
    'Buying or selling Tools. See link to Equipment sheet for details.',
    'Tools you sell fetch half price',
    17.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '842a56f1-3315-40bf-b0a2-552ed818940f'::uuid,
    'DT_0018',
    'b4459d2f-ecbd-4f09-bbc3-5b6a33dea143'::uuid,
    'b4459d2f-ecbd-4f09-bbc3-5b6a33dea143'::uuid,
    'Buying or Selling Adventuring Gear',
    'Buying or Selling Adventuring Gear',
    'Varies',
    '0',
    'Buying or selling Adventuring Gear. See link to Equipment sheet for details.',
    'Adventuring Gear you sell fetches half price',
    18.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '7c75f0f9-36c4-45ab-8f9a-cd08c8d3785a'::uuid,
    'DT_0019',
    'b4459d2f-ecbd-4f09-bbc3-5b6a33dea143'::uuid,
    'b4459d2f-ecbd-4f09-bbc3-5b6a33dea143'::uuid,
    'Buying or Selling Poisons',
    'Buying or Selling Poisons',
    'Varies',
    '0',
    'Buying or selling Poisons. See link to Equipment sheet for details.',
    '- Poisons you sell fetch full price
- The discount from the Crafter feat (2024) doesn''t apply when buying Poisons
- Note that Basic Poison is considered Adventuring Gear and only fetches half price when resold (50 GP)',
    19.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '0995517a-2dc4-4e89-9167-6d9e114032a3'::uuid,
    'DT_0020',
    'b4459d2f-ecbd-4f09-bbc3-5b6a33dea143'::uuid,
    'b4459d2f-ecbd-4f09-bbc3-5b6a33dea143'::uuid,
    'Buying or Selling Trade Goods',
    'Buying or Selling Trade Goods',
    'Varies',
    '0',
    'Buying or selling Trade Goods. See link to Equipment sheet for details.',
    '- Trade Goods you sell fetch full price
- The discount from the Crafter feat (2024) doesn''t apply when buying Trade Goods',
    20.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'eca92fd9-ec2a-497f-b372-5f7a9284d196'::uuid,
    'DT_0021',
    'b4459d2f-ecbd-4f09-bbc3-5b6a33dea143'::uuid,
    'b4459d2f-ecbd-4f09-bbc3-5b6a33dea143'::uuid,
    'Buying or Selling Mounts, Vehicles, or Pets',
    'Buying or Selling Mounts, Vehicles, or Pets',
    'Varies',
    '0',
    'Buying or selling Mounts, Vehicles, or Pets. See link to Equipment sheet for details.',
    'Mounts, Vehicles, or Pets you sell fetch half price',
    21.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'a89de52f-0dbf-4ddf-ba42-bacb87a1a090'::uuid,
    'DT_0022',
    'b4459d2f-ecbd-4f09-bbc3-5b6a33dea143'::uuid,
    'b4459d2f-ecbd-4f09-bbc3-5b6a33dea143'::uuid,
    'Buying or Selling Miscellaneous',
    'Buying or Selling Miscellaneous',
    'Varies',
    '0',
    'Buying or selling other Miscellaneous items. See link to Equipment sheet for details.',
    'Refer to link for details.',
    22.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '795f786b-ac50-44bc-b2db-f98a40a7fccf'::uuid,
    'DT_0023',
    'b4459d2f-ecbd-4f09-bbc3-5b6a33dea143'::uuid,
    'b4459d2f-ecbd-4f09-bbc3-5b6a33dea143'::uuid,
    'Selling Art Objects, Gems, and Jewelry',
    'Selling Art Objects, Gems, and Jewelry',
    'Varies',
    '0',
    'Selling art objects, gems, or jewelry obtained from adventures',
    'Art objects, gems, and jewelry you sell fetch full price
- The discount from the Crafter feat (2024) doesn''t apply when buying Art Objects, Gems, and Jewelry',
    23.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'aa37c71b-a4b3-430d-8763-aee223664108'::uuid,
    'DT_0024',
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'Crafting Armor',
    'Crafting Armor',
    'Varies',
    'Item cost / 25',
    'Crafting Armor. See link to Equipment sheet for details.',
    NULL,
    24.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'f7db44e1-6766-4b82-8a9b-0bfc06296eed'::uuid,
    'DT_0025',
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'Crafting Weapon',
    'Crafting Weapon',
    'Varies',
    'Item cost / 25',
    'Crafting Weapons. See link to Equipment sheet for details.',
    NULL,
    25.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '4e26aea5-c358-4c0b-96f9-2b69acf11926'::uuid,
    'DT_0026',
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'Crafting Adventuring Gear',
    'Crafting Adventuring Gear',
    'Varies',
    'Item cost / 25',
    'Crafting Adventuring Gear. See link to Equipment sheet for details.',
    NULL,
    26.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '05ae3a0c-1992-47f7-abc5-e98bd4742b3d'::uuid,
    'DT_0027',
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'Crafting Poison',
    'Crafting Poison',
    'Varies',
    'Item cost / 25',
    'Crafting Poisons. See link to Equipment sheet for details.',
    NULL,
    27.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '724678ef-c3c6-44d7-a606-87304c502d1e'::uuid,
    'DT_0028',
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'Crafting Miscellaneous',
    'Crafting Miscellaneous',
    'Varies',
    'Varies',
    'Crafting other Miscellaneous items. See link to Equipment sheet for details.',
    NULL,
    28.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '0bdc7a78-c980-490e-943d-800ea889c4ef'::uuid,
    'DT_0029',
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'Scribing Spell Scroll (Cantrip)',
    'Scribing Spell Scroll (Cantrip)',
    '-15',
    '1',
    'Scribing a cantrip spell scroll. See PHB 2024 for additional information.',
    '- To scribe a spell scroll, as per the 2024 PHB, you must know or have the spell prepared, you must have proficiency with Arcana or Calligrapher''s Supplies, you must be able to cast the spell, and you must provide the spell''s material components. If the material components are normally consumed, they are consumed when the scroll is completed.
- A scribed spell scroll uses your spell attack bonus, spell save DC, and spellcasting ability modifier.
- A scribed cantrip spell scroll works as if the caster were your level.
- A scribed level 2+ spell scroll can be an upcast version of a lower level spell you know or have prepared.
- The maximum number of scribed spell scrolls you can have at a time is equal to your Proficiency Bonus.
- You can''t sell or trade any spell scrolls you scribe from this downtime activity.',
    29.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '3be44e5c-3fcc-4f80-941f-c76f164c48a9'::uuid,
    'DT_0030',
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'Scribing Spell Scroll (Level 1)',
    'Scribing Spell Scroll (Level 1)',
    '-25',
    '2',
    'Scribing a level 1 spell scroll. See PHB 2024 for additional information.',
    NULL,
    30.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '4382cc82-c028-49ea-9758-4cc087ed57f2'::uuid,
    'DT_0031',
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'Scribing Spell Scroll (Level 2)',
    'Scribing Spell Scroll (Level 2)',
    '-100',
    '5',
    'Scribing a level 2 spell scroll. See PHB 2024 for additional information.',
    NULL,
    31.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'dbd1a29f-c819-40a9-b6ae-04701a5e8078'::uuid,
    'DT_0032',
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'Scribing Spell Scroll (Level 3)',
    'Scribing Spell Scroll (Level 3)',
    '-150',
    '8',
    'Scribing a level 3 spell scroll. See PHB 2024 for additional information.',
    NULL,
    32.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '1a0b2f2a-19a3-4860-8bbb-954085bd3a75'::uuid,
    'DT_0033',
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'Scribing Spell Scroll (Level 4)',
    'Scribing Spell Scroll (Level 4)',
    '-1000',
    '14',
    'Scribing a level 4 spell scroll. See PHB 2024 for additional information.',
    NULL,
    33.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'efa9805f-459c-4719-b41a-474cfc1f217a'::uuid,
    'DT_0034',
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'Scribing Spell Scroll (Level 5)',
    'Scribing Spell Scroll (Level 5)',
    '-1500',
    '30',
    'Scribing a level 5 spell scroll. See PHB 2024 for additional information.',
    NULL,
    34.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '421d6af8-82ea-4e38-a417-cad3d72f713f'::uuid,
    'DT_0035',
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'Scribing Spell Scroll (Level 6)',
    'Scribing Spell Scroll (Level 6)',
    '-10000',
    '46',
    'Scribing a level 6 spell scroll. See PHB 2024 for additional information.',
    NULL,
    35.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '760dcfff-09ca-4cf5-8783-9dd8882f9fb0'::uuid,
    'DT_0036',
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'Scribing Spell Scroll (Level 7)',
    'Scribing Spell Scroll (Level 7)',
    '-12500',
    '57',
    'Scribing a level 7 spell scroll. See PHB 2024 for additional information.',
    NULL,
    36.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '88025258-6495-4458-a5ab-36d238d37522'::uuid,
    'DT_0037',
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'Scribing Spell Scroll (Level 8)',
    'Scribing Spell Scroll (Level 8)',
    '-15000',
    '68',
    'Scribing a level 8 spell scroll. See PHB 2024 for additional information.',
    NULL,
    37.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '9c9e49fd-cdd1-4105-b22e-ee58b119e0b8'::uuid,
    'DT_0038',
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'Scribing Spell Scroll (Level 9)',
    'Scribing Spell Scroll (Level 9)',
    '-50000',
    '129',
    'Scribing a level 9 spell scroll. See PHB 2024 for additional information.',
    NULL,
    38.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '2d381034-8713-42bb-8420-3c33492ea032'::uuid,
    'DT_0039',
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'Crafting T0 Consumable',
    'Crafting T0 Consumable',
    '-25*',
    '3**',
    'Crafting a T0 Consumable in Rolled or Select Loot.',
    'Crafting magic items is based on the rules of the 2024 Dungeon Master''s Guide with the following changes:
- Crafting a magic item of a certain type requires requires proficiency in the Arcana skill, proficiency in a corresponding tool, and an associated Special Facility of a Bastion depending on the type of item. The required tool proficiency is based on the Magic Item Tools table in chapter 7 of the 2024 Dungeon Master''s Guide and is individually listed for each item in Loot. The required Special Facility is detailed in the Bastions sheet.
- You can only craft magic items of your character''s tier or lower.                                                                                                            
- If a magic item can be used to cast spells, the spells must be among your Spells Prepared or Spells Known in order to craft the item, you must be able to cast the spell, and you must provide the material components for each spell. If the material components are normally consumed, they are consumed for each spell when the item is complete.                                                                                                                
- If a magic item requires attunement, you must be able to attune to it in order to craft the item.
- Another player''s PC can provide assistance in crafting, with each participating PC expending half the base DTP cost (round up). A PC can only assist in this way if they are in the same location and are individually capable of crafting the item (in terms of Arcana and tool proficiency, spells known or prepared, and attunement).
- A Base Cost and associated Crafting Cost is listed for craftable items: the Crafting Cost is what must be expended to craft the item. The Base Cost does not mean that the magic item can be purchased.                                                                                                   

* Certain magic items can cost more than this value to craft: be sure to check an item''s notes in Loot. Additionally, if a magic item incorporates an item with a purchase cost (such as magic armor), you must pay its full cost or craft that item in order to craft the associated magic item. For example magic plate armor would require paying an additional 1500 GP or an additional 750 GP and 60 DTP and craft the armor.            

** Certain magic items can cost more DTP than this value to craft: be sure to check an item''s notes in Loot. Additionally, if a magic item is crafted in Hawthorne or a city (population >5000), an additional 3 DTP must be expended after any potential reductions. If it is crafted elsewhere, an additional 21 DTP must be expended instead after any potential reductions. Every magic item costs an additional 3 or 21 DTP to craft as a result.',
    39.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '098cd814-3d44-4a12-901d-4efae771909b'::uuid,
    'DT_0040',
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'Crafting T0 Permanent',
    'Crafting T0 Permanent',
    '-50*',
    '5**',
    'Crafting a T0 Permanent in Rolled or Select Loot.',
    NULL,
    40.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'c40203c7-26eb-4394-8b97-9f6ad286e8ce'::uuid,
    'DT_0041',
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'Crafting T1 Consumable',
    'Crafting T1 Consumable',
    '-100*',
    '5**',
    'Crafting a T1 Consumable in Rolled or Select Loot.',
    NULL,
    41.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '35ed0b71-894b-45a6-b87e-e6dc8a8f3714'::uuid,
    'DT_0042',
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'Crafting T1 Permanent',
    'Crafting T1 Permanent',
    '-200*',
    '10**',
    'Crafting a T1 Permanent in Rolled or Select Loot.',
    NULL,
    42.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '58a069ec-d1c1-434d-b7a7-a9cbdba13ce2'::uuid,
    'DT_0043',
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'Crafting T2 Consumable',
    'Crafting T2 Consumable',
    '—',
    '—',
    'Not currently available.',
    NULL,
    43.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '9b73a093-54de-411e-bed8-c3bc48dd85a0'::uuid,
    'DT_0044',
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'Crafting T2 Permanent',
    'Crafting T2 Permanent',
    '—',
    '—',
    'Not currently available.',
    NULL,
    44.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'e353838d-7bac-4716-a46f-2e120658b2f0'::uuid,
    'DT_0045',
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'Crafting T3 Consumable',
    'Crafting T3 Consumable',
    '—',
    '—',
    'Not currently available.',
    NULL,
    45.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'ca2171a7-2ff3-4ec4-9a14-1641b9062fac'::uuid,
    'DT_0046',
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'Crafting T3 Permanent',
    'Crafting T3 Permanent',
    '—',
    '—',
    'Not currently available.',
    NULL,
    46.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '792b1587-bbcf-47b2-a604-c5d77c0a8af7'::uuid,
    'DT_0047',
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'Crafting T4 Consumable',
    'Crafting T4 Consumable',
    '—',
    '—',
    'Not currently available.',
    NULL,
    47.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'ff0e861d-ab1a-4e45-afe3-418a56b16e21'::uuid,
    'DT_0048',
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'd877d27a-29d9-4177-a97c-678fe9d972ae'::uuid,
    'Crafting T4 Permanent',
    'Crafting T4 Permanent',
    '—',
    '—',
    'Not currently available.',
    NULL,
    48.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '22c129af-8be0-4d77-9aec-ae14996b4a86'::uuid,
    'DT_0049',
    '00f09436-9aaf-4875-bc43-ebf3af6c7bb6'::uuid,
    '00f09436-9aaf-4875-bc43-ebf3af6c7bb6'::uuid,
    'Research',
    'Research',
    '-50, with the option for an additional 50 to 300 GP',
    '5',
    'Researching a specific person, place, or thing as described in Xanathar''s Guide to Everything.',
    '- Research must be overseen by a DM and follows the rules in XGE
- A PC with access to Candlekeep or another particularly well-stocked library or place with knowledgeable sages has Advantage on the Intelligence check',
    49.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '5e704c0b-1f01-413d-add0-cf772f2efc14'::uuid,
    'DT_0050',
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    '2024 Update Rework',
    '2024 Update Rework',
    '0',
    '0',
    'Fully reworking a 2014 PC that existed from August 2025 and prior into a 2024 PC.',
    '- This is a free full rework into a 2024 PC, including using the sheet to created an entirely new character. (The previous character becomes retired as an NPC but the same MAL sheet is used).
- A character is defined as existing from August 2025 and prior if they are mentioned in at least one log in the #session-log, #downtime-logs, or #trade-logs from August 2025 and before',
    50.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '710543c1-bf09-4e06-bd7d-5f5d0679bbba'::uuid,
    'DT_0051',
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    'Any rework before level 6',
    'Any rework before level 6',
    '0',
    '0',
    'Reworking a PC before playing or DMPCing a game with them at level 6',
    'You have unlimited free full reworks with PCs prior to their first level 6 game as a player or DMPC. The rework must still be logged and approved.',
    51.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'c0939e0a-23f1-56be-aca5-0e58f684f8a3'::uuid,
    'DT_0052',
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    'Jump Start Rework',
    'Jump Start Rework',
    '0',
    '0',
    'Reworking a Level 11 Jump Start PC before playing or DMPCing a game with them at level 12, or changing their selected items.',
    '- You have unlimited free full reworks with a Level 11 PC created by completing the DM Jump Start Reward Track provided, the PC must not have played their first level 12 game as a player or DMPC. The rework request must have a link to the 10th Jump Start session log redeeming the level 11 PC.
- The above also applies to any level 11 PCs created by the Midsummer Madness Reward Track. The rework request must have a link to the 10th Midsummer Madness session log redeeming the level 11 PC.
- You can change the Jump Start PC''s selected magic items one time prior to their first level 12 game as a Player Character or DMPC. The alteration must be approved in a request to the Auditors in ⁠#player-requests and reflected in the 10th Jump Start session log redeeming the level 11 PC. If consumables were selected, they cannot be changed if they have been partially or fully used.
- The above also applies to any level 11 PCs created by the Midsummer Madness Reward Track and must be reflected in the 10th Midsummer Madness session log redeeming the level 11 PC. The same rule regarding consumables above applies.
- Any Jump Start / Midsummer Madness PC created from August 2026 and prior is eligible for one free full rework and a one-time item selection alteration, regardless of its current level. A character is defined as existing from August 2026 and prior if they are mentioned in at least one log in the #session-log, #downtime-logs, or #trade-logs from August 2026 and before',
    52.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '7f603df5-4156-4c45-965b-3f555aeebd24'::uuid,
    'DT_0053',
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    'T2 Checkpoint Rework',
    'T2 Checkpoint Rework',
    '-820',
    '150',
    'Fully reworking a T2 PC down to the beginning of level 3, 4, or 5',
    '- This is a full rework, including using the sheet to create an entirely new character. (The previous character becomes retired as an NPC but the same MAL sheet is used)
- A character NPCed in this way can be restored with another checkpoint rework provided that MAL sheet wasn''t used as part of a consolidation 
- A character reworked into another character this way retains all equipment and magic items, but doesn''t retain any supernatural rewards, sapient pets, or sapient mounts. Any Relics of Emergence or Hoard Magic Items they own revert to their initial state.',
    53.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '4a3562cb-34bd-49ff-b579-68cbadddece3'::uuid,
    'DT_0054',
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    'T3 Checkpoint Rework',
    'T3 Checkpoint Rework',
    '-2400',
    '180',
    'Fully reworking a T3 PC down to the beginning of level 6, 7, 8, or 9',
    NULL,
    54.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '69ce46a4-9b98-48da-addb-1fcdd7ad2d2d'::uuid,
    'DT_0055',
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    'T4 Checkpoint Rework',
    'T4 Checkpoint Rework',
    '-4250',
    '260',
    'Fully reworking a T4 PC down to the beginning of level 11, 12, 13, 14, or 15',
    NULL,
    55.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'fcb69fe2-694a-4593-b4d8-c1c88f441d54'::uuid,
    'DT_0056',
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    'Ala Carte Rework (Level 6)',
    'Ala Carte Rework (Level 6)',
    '-160',
    '30',
    'Single change rework for level 6 PC',
    'The listed cost is per change:
- Changing 1 class level, your race / species (including racial features and ASIs), background (including features,  proficiencies, and/or ASIs) and changing a feat or ASI  all cost 1 change each
- Changing a language known or tool or skill proficiency independent of other changes costs 1 change
- Changing a subclass costs 1 change per class level that adds a subclass feature. (You aren''t charged for a subclass change added as a result of a class level change)
- Changing starting ability scores, or changing the character to a different person, costs 2 changes
- Changing from 2014 to 2024 costs 1 change. You must change your species, class, subclass, feats, and all other character options to their 2024 equivalent unless that option has not been reprinted. Your starting ASIs from your species are replaced with ASIs of your choice from your background, which can be customized as written in Appendix A of the [Player Guidelines](https://hawthorneguild.github.io/Guides/playersguide/appendices/2024-games/).
- Changing from 2024 to 2014 costs 1 change. You must change your species, class, subclass, feats, and all other character options to their 2014 equivalent. If there is no 2014 equivalent for a character option, you must choose an eligible 2014 option instead. This does not incur any additional costs.',
    56.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '04cb1805-8d1a-4b89-a562-afd35e524d59'::uuid,
    'DT_0057',
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    'Ala Carte Rework (Level 7 - 8)',
    'Ala Carte Rework (Level 7 - 8)',
    '-270',
    '30',
    'Single change rework for level 7 - 8 PC',
    NULL,
    57.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '77f70219-e4a1-4d1a-aab6-e901a9156ca1'::uuid,
    'DT_0058',
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    'Ala Carte Rework (Level 9 - 10)',
    'Ala Carte Rework (Level 9 - 10)',
    '-400',
    '30',
    'Single change rework for level 9 - 10 PC',
    NULL,
    58.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'a637b1b0-8501-41ee-9687-73d368f1c773'::uuid,
    'DT_0059',
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    'Ala Carte Rework (Level 11 - 12)',
    'Ala Carte Rework (Level 11 - 12)',
    '-630',
    '40',
    'Single change rework for level 11 - 12 PC',
    NULL,
    59.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '9bd4cd51-6d54-44e4-8056-1771f8b0bf5f'::uuid,
    'DT_0060',
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    'Ala Carte Rework (Level 13 - 14)',
    'Ala Carte Rework (Level 13 - 14)',
    '-810',
    '40',
    'Single change rework for level 13 - 14 PC',
    NULL,
    60.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '83e0f278-f1b0-4361-a311-592ccba3d79e'::uuid,
    'DT_0061',
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    'Ala Carte Rework (Level 15 - 16)',
    'Ala Carte Rework (Level 15 - 16)',
    '-1030',
    '40',
    'Single change rework for level 15 - 16 PC',
    NULL,
    61.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '6fb8e936-4bc5-49a9-9c19-f08610e40a9a'::uuid,
    'DT_0062',
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    'Ala Carte Rework (Level 17 - 18)',
    'Ala Carte Rework (Level 17 - 18)',
    '-1270',
    '50',
    'Single change rework for level 17 - 18 PC',
    NULL,
    62.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '4e05517d-a817-4ff4-b731-818d939f386f'::uuid,
    'DT_0063',
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    'Ala Carte Rework (Level 19 - 20)',
    'Ala Carte Rework (Level 19 - 20)',
    '-1530',
    '50',
    'Single change rework for level 19 - 20 PC',
    NULL,
    63.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '658aa505-8a40-45c6-927b-aeef59ca2ae5'::uuid,
    'DT_0064',
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    'T2 Spell Change',
    'T2 Spell Change',
    '-100 GP per spell level (minimum 100)',
    '5 times spell level (minimum 5)',
    'Changing 1 spell known as a T2 PC.',
    'The listed cost is per spell changed:
- The gold and DTP cost are per the spell level of the new spell changed to
- If you lose the ability to cast the Wish spell, you can use a spell change, with its listed costs, to swap it out for another spell your PC is eligible to know.
- If you lose the ability to cast the Wish spell, you can''t cast it again with that character or even other characters associated with that MAL sheet via a full checkpoint rework',
    64.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '3babb2d3-9346-4125-9233-43f45a3356ce'::uuid,
    'DT_0065',
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    'T3 Spell Change',
    'T3 Spell Change',
    '-200 GP per spell level (minimum 200)',
    NULL,
    'Changing 1 spell known as a T3 PC.',
    NULL,
    65.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'c94b27da-f261-41cf-8c19-be5d365e6e3a'::uuid,
    'DT_0066',
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    'T4 Spell Change',
    'T4 Spell Change',
    '-300 GP per spell level (minimum 300)',
    NULL,
    'Changing 1 spell known as a T4 PC.',
    NULL,
    66.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '880670d2-0365-4044-a74f-683c4fb34c37'::uuid,
    'DT_0067',
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    'T2 Character Consolidation',
    'T2 Character Consolidation',
    '-960',
    '180',
    'Consolidating a T2 PC with another T1 PC you have, retiring the T2 PC but using their MAL sheet for the T1 PC as a level 5 PC',
    '- The higher level PC is retired as an NPC, but their character sheet is used as the new MAL sheet for the lower level PC
- All items from the lower level PC''s MAL sheet are traded to the higher level PC''s MAL sheet
- The consolidated PC doesn''t benefit from any supernatural rewards the higher level PC had. Any Relics of Emergence or Hoard Magic Items in the consolidated MAL sheet revert to their initial state.
- The lower level PC''s MAL sheet is retired',
    67.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '2ec158bc-655e-4f2f-ae9b-8ef8e5c52684'::uuid,
    'DT_0068',
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    'T3 Character Consolidation',
    'T3 Character Consolidation',
    '-2400',
    '180',
    'Consolidating a T3 PC with another T2 PC you have, retiring the T3 PC but using their MAL sheet for the T2 PC as a level 11 PC',
    NULL,
    68.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'c44f604a-0515-474e-88ef-27ae6addcf0f'::uuid,
    'DT_0069',
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    'End of the Road Rework',
    'End of the Road Rework',
    'Varies',
    'Varies',
    'Using one of the other existing rework options to rework a PC that can no longer be played due to death or another reversible circumstance (such as lycanthropy or vampirism) from an adventure, as subject to the DM''s discretion',
    'To submit for an End of the Road rework, contact an Auditor and bear in mind the following:
- An End of the Road rework requires the approval of the DM that ran the adventure. If the terminal event occurred in text RP or due to guild action (such as being expelled from the guild), the Lore team act as the DM.
- Any gold, magic items, or treasure that may be lost from the MAL sheet are determined by the DM
- The gold cost of reversing the consequence is added to the rework cost (for example, 25,000 GP for True Resurrection to cure vampirism)
- After confirming with the DM and you, an Auditor will log the rework in #character-rework-log if it is approved',
    69.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '82c9897f-e876-4fbf-805b-c1df7ac227cd'::uuid,
    'DT_0070',
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    '15% Story Rework Discount (3+ sessions)',
    '15% Story Rework Discount (3+ sessions)',
    '15% Discount',
    NULL,
    'Checkpoint rework for PC at listed discounted rate as a result of a series of adventures ran by a DM with minimum duration and session count as listed',
    '- The player submits a rework as normal in #character-rework-log but should note Story Rework in the log
- The DM submits a story rework discount in #character-rework-log, linking the relevant session logs and providing a brief narrative explanation of the change
- Multiple DMs can collaborate for this purpose; each participating DM should be tagged in the log in #character-rework-log
- This discounted checkpoint rework allows a PC to choose to remain the same level instead of having to drop in level and tier
- This discounted checkpoint rework doesn''t allow for reworking into another character
- This discounted checkpoint rework can''t be refunded
- Only sessions that are 3+ hours count towards this discounted rework',
    70.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '2510ca84-539a-4c51-8f9a-2f2d18a3c4f4'::uuid,
    'DT_0071',
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    '30% Story Rework Discount (4+ sessions)',
    '30% Story Rework Discount (4+ sessions)',
    '30% Discount',
    NULL,
    NULL,
    NULL,
    71.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '4b4eb66b-dfbf-4133-9f0b-240e0c730670'::uuid,
    'DT_0072',
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    '3574d95e-3ac0-480d-88bc-038fa54cd3e9'::uuid,
    '50% Story Rework Discount (6+ sessions)',
    '50% Story Rework Discount (6+ sessions)',
    '50% Discount',
    NULL,
    NULL,
    NULL,
    72.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '9726bf36-5880-4095-abf3-9302512f4f76'::uuid,
    'DT_0073',
    'ecd4d90a-cdd3-4223-8afc-0d889f410f09'::uuid,
    'ecd4d90a-cdd3-4223-8afc-0d889f410f09'::uuid,
    'Casting a Spell with a lasting effect',
    'Casting a Spell with a lasting effect',
    'Varies',
    'Level of the spell (minimum 1)',
    'Casting a spell to achieve a lasting effect, such as Simulacrum',
    '- You must expend any costly material components for the spell that are consumed (if any) as the gold cost for this activity
- If the effect has a finite duration of 1 day or longer, only in character days that pass as part of an adventure count against the duration as determined by the DM.
- If another spell is cast as part of casting a spell with a lasting effect (such as the Contingency or Glyph of Warding spell), only DTP equal to the highest spell level used needs to be expended. For example, casting a level 6 Contingency spell with a level 4 Otiluke''s Resilient Sphere spell in downtime costs only 6 DTP.',
    73.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'fcbcbd0f-f38f-422d-beda-4e5e6d79375e'::uuid,
    'DT_0074',
    'ecd4d90a-cdd3-4223-8afc-0d889f410f09'::uuid,
    'ecd4d90a-cdd3-4223-8afc-0d889f410f09'::uuid,
    'Casting a Spell consecutively to make permanent',
    'Casting a Spell consecutively to make permanent',
    'Varies',
    'Number of days required + level of the spell',
    'Casting a spell that can be made permanent through casting on consecutive days, such as Teleportation Circle',
    'You must expend any costly material components for the spell that are consumed (if any) as the gold cost for this activity.',
    74.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '9a8d804a-5865-4b35-b96b-ad9357b22b06'::uuid,
    'DT_0075',
    'ecd4d90a-cdd3-4223-8afc-0d889f410f09'::uuid,
    'ecd4d90a-cdd3-4223-8afc-0d889f410f09'::uuid,
    'Copying a Spell',
    'Copying a Spell',
    '-50 GP (per spell level)',
    'Special',
    'Copying a spell into your spellbook at a rate of 2 hours per spell level. You expend 1 DTP for every 8 hours that pass this way (round up, minimum 1 DTP), allowing you to copy multiple spells per DTP expended.',
    '- While in Hawthorne, you can copy spells from the Community Spellbook. Refer to the listed Spells in this document.
- You can copy a spell from another PC''s spellbook, but both you and that PC must expend the DTP',
    75.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '36151e84-6417-4e11-b326-c35eb6e98da2'::uuid,
    'DT_0076',
    'ecd4d90a-cdd3-4223-8afc-0d889f410f09'::uuid,
    'ecd4d90a-cdd3-4223-8afc-0d889f410f09'::uuid,
    'Copying your Spellbook or a Prepared Spell',
    'Copying your Spellbook or a Prepared Spell',
    '-10 GP (per spell level)',
    'Special',
    'Copying a spell from your spellbook or a spell you have prepared into another book at a rate of 1 hour per spell level. You expend 1 DTP for every 8 hours that pass this way (round up, minimum 1 DTP), allowing you to copy multiple spells per DTP expended.',
    '- While in Hawthorne, you can copy spells into the Community Spellbook. Refer to the listed Spells in this document.',
    76.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'c1fe08b4-939b-460a-9122-0cefea11a554'::uuid,
    'DT_0077',
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'Detect Magic',
    'Detect Magic',
    '-10',
    '1',
    'Casting Detect Magic to detect magic on creatures or objects',
    NULL,
    77.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'eeb72cec-18a0-4340-bf15-2fa25a570094'::uuid,
    'DT_0078',
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'Comprehend Languages',
    'Comprehend Languages',
    '-11',
    '1',
    'Having up to 10 pages of text literally translated and transcribed with Comprehend Languages',
    '- 1 page of text contains about 250 words
- You receive the literal translation as a stack of up to 5 sheets of paper written on front and back',
    78.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '20981f1f-68b1-4fc7-9e18-35aa100b2694'::uuid,
    'DT_0079',
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'Identify',
    'Identify',
    '-20',
    '1',
    'Having Identify cast on a creature or object',
    NULL,
    79.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '33432200-f1fa-417d-96cf-5d285373b51e'::uuid,
    'DT_0080',
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'Illusory Script',
    'Illusory Script',
    '-30',
    '1',
    'Creating an illusory message for the next 10 days with Illusory Script',
    NULL,
    80.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'b1f8607e-9440-45f9-920a-9dd41b577fa5'::uuid,
    'DT_0081',
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'Ceremony',
    'Ceremony',
    '-60',
    '1',
    'Performing one of the listed ceremonies of Ceremony',
    'For Atonement, treat the NPC''s Insight bonus as +5',
    81.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '4d08eb87-6e8d-4f56-bf19-f05e11f8924d'::uuid,
    'DT_0082',
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'Animal Messenger',
    'Animal Messenger',
    '-40',
    '2',
    'Sending a message with Animal Messenger',
    'In Hawthorne, the target must be either another guild member or Hawthorne NPC',
    82.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '4e0f14f5-f66a-4072-b0f9-9b286a61436f'::uuid,
    'DT_0083',
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'Gentle Repose',
    'Gentle Repose',
    '-40',
    '2',
    'Protecting a corpse from decay with Gentle Repose',
    NULL,
    83.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '5d1ebe17-e22b-4080-a51b-382627a7e3b3'::uuid,
    'DT_0084',
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'Lesser Restoration',
    'Lesser Restoration',
    '-40',
    '2',
    'Removing a condition from you or another creature with Lesser Restoration',
    NULL,
    84.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '67e6ff0b-7a7b-4323-92ed-9464e0db0074'::uuid,
    'DT_0085',
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'Knock',
    'Knock',
    '-40',
    '2',
    'Unlocking a container you possess with Knock',
    NULL,
    85.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'b95d57e2-51d2-44fd-be92-21bb269190aa'::uuid,
    'DT_0086',
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'Magic Mouth',
    'Magic Mouth',
    '-60',
    '2',
    'Imbuing an object you possess with Magic Mouth',
    NULL,
    86.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '8e69bb7c-57d4-48bf-bde7-91707ea983f9'::uuid,
    'DT_0087',
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'Arcane Lock',
    'Arcane Lock',
    '-90',
    '2',
    'Locking a container you possess or a door of a dwelling you own with Arcane Lock',
    NULL,
    87.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'a79fc5cd-933c-4dbc-8c24-47327ed43da2'::uuid,
    'DT_0088',
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'Dispel Magic',
    'Dispel Magic',
    '-90',
    '3',
    'Having Dispel Magic cast on a creature or object',
    NULL,
    88.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '0779424d-06b3-45ca-aaca-54a5ee6b93c6'::uuid,
    'DT_0089',
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'Remove Curse',
    'Remove Curse',
    '-90',
    '3',
    'Having Remove Curse cast on a creature or object',
    NULL,
    89.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '3ea3c867-b658-4d30-9b6b-91e9ef3dc3ed'::uuid,
    'DT_0090',
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'Sending',
    'Sending',
    '-90',
    '3',
    'Sending a message with Sending',
    'In Hawthorne, the target must be either another guild member or Hawthorne NPC',
    90.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'fe5a0976-e0c8-4fb2-a0f9-89107b862246'::uuid,
    'DT_0091',
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'Speak with Dead',
    'Speak with Dead',
    '-90',
    '3',
    'Interrogating the remains of a creature with Speak with Dead',
    NULL,
    91.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'bf55aa72-a6ae-41c2-a4a1-aada47fb37e2'::uuid,
    'DT_0092',
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'Continual Flame (3rd-level)',
    'Continual Flame (3rd-level)',
    '-190',
    '3',
    'Imbuing an object you possess with a Continual Flame',
    NULL,
    92.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '57924c82-6b46-4f9d-8526-447accc47d0e'::uuid,
    'DT_0093',
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'Divination',
    'Divination',
    '-210',
    '4',
    'Predicting the future with Divination',
    NULL,
    93.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '79da2f42-4db8-4c7c-9dfb-dfd5da63cdde'::uuid,
    'DT_0094',
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'Galder''s Speedy Courier',
    'Galder''s Speedy Courier',
    '-210',
    '4',
    'Sending a package with Galder''s Speedy Courier',
    'In Hawthorne, the target must be either another guild member or Hawthorne NPC',
    94.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'b7e5c2d8-ba5d-42d4-a73a-b8d2f4a9b7ee'::uuid,
    'DT_0095',
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'Teleportation Circle',
    'Teleportation Circle',
    '-350',
    '5',
    'Teleporting to a different location with Teleportation Circle',
    'In Hawthorne, this can only target the following locations: Durlag''s Tower, Lerwick Outpost, Merkin''s Keep (near Baldur''s Gate), Port Nyanzaru (in the Temple of Savras), Suzail, Silent Tower (Mompono Village, Chult), Tinkerton (near Waterdeep)',
    95.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '788c095a-a822-4c34-aa6c-6c123d7013b5'::uuid,
    'DT_0096',
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'Greater Restoration',
    'Greater Restoration',
    '-450',
    '5',
    'Removing a condition from you or another creature with Greater Restoration',
    NULL,
    96.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '94be731c-8587-48cb-8bfd-5dfd3517c038'::uuid,
    'DT_0097',
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'Raise Dead',
    'Raise Dead',
    '-1250',
    '5',
    'Having yourself or another creature resurrected with Raise Dead',
    'The PC being resurrected must expend an additional 4 DTP to recuperate from their ordeal.',
    97.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'c03e81ec-3870-482d-80c2-67d4a12ad094'::uuid,
    'DT_0098',
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'de038550-5b90-4c56-97c1-fa9175135332'::uuid,
    'Other Spells of Level 5 or lower',
    'Other Spells of Level 5 or lower',
    'Varies',
    'Level of the spell (minimum 1)',
    'Having another spell of level 5 or lower cast at the DM''s discretion',
    'A DM can make other level 0 - 5 spells from NPCs available as part of an adventure. The normal gold cost equals (10 x (Spell Level)²) + (2 x Cost of Consumed Components) + (0.1 x Cost of Nonconsumed Components), with a minimum of 10 GP.',
    98.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'e5fb8673-a708-4974-99ff-e9e7366f6f35'::uuid,
    'DT_0099',
    'd8d3c2ad-0c10-4760-a696-5cd78b60f89b'::uuid,
    'd8d3c2ad-0c10-4760-a696-5cd78b60f89b'::uuid,
    'Trading Gold',
    'Trading Gold',
    'Varies',
    '0',
    'You give or receive an amount of gold to or from another player''s character',
    'To avoid gold cross trading or self trade of gold by proxy, a PC can''t receive gold or give gold to another player''s character except for purposes of item trades or the following listed activities only, with the gold immediately used for the activity after being received. The associated trade log must state for what reason the gold was given for among the options below (for example, for purposes of assisting with a rework). 

The list of eligible activities is as follows:
- Paying for the gold cost of another player''s character rework
- Paying for the gold cost for a resurrection or spellcasting service on behalf of another player''s character
- Contributing gold for another player''s character to construct a Bastion or Stronghold as per the rules for building Bastions and Strongholds
- Paying for the gold cost for another player''s character to purchase Equipment
- Paying for the gold cost to clear a Story Outcome on behalf of another player''s character as determined by a DM (such as a fine or ransom)
- Paying for the gold cost for an RP service on behalf of another player''s character, provided it does not produce any Equipment or Loot
- Paying out a wager or bet to another player''s character, with a message link to where the associated roleplay occurred

Note that you can''t trade gold between your PCs, even via proxy or cross character trades (such as trading an item from one of your PCs and receiving gold on another PC). An Auditor investigation will be opened if you and other parties violate this rule.',
    99.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '1abc4361-f6d8-4feb-9da0-0da7b2c751a2'::uuid,
    'DT_0100',
    'd8d3c2ad-0c10-4760-a696-5cd78b60f89b'::uuid,
    'd8d3c2ad-0c10-4760-a696-5cd78b60f89b'::uuid,
    'Trading Equipment',
    'Trading Equipment',
    'Varies',
    '0',
    'You give or receive equipment to or from another player''s character',
    '- To avoid gold cross trading or self trade of gold by a proxy, a PC can''t receive Equipment that can be sold for gold or give Equipment that can be sold for gold to another player''s character except for purposes of trades or as a marked item.
- Equipment that can be sold for gold that is given as a marked item is Equipment gifted to another player''s character, except the Equipment becomes marked and can no longer be sold for gold, even if later traded to another PC. Equipment that is marked in this way must be noted as such in the trade log where it is given as a marked item.
- After an item is traded between two PCs, those two PCs can''t re-trade the item between them again until after 14 days have passed.
- Note that you can''t trade gold or items that can be sold for gold between your PCs, even via proxy or cross character trades (such as trading an item from one of your PCs and receiving gold or an item worth gold on another PC). An Auditor investigation will be opened if you and other parties violate this rule.',
    100.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '9fb85e75-05bb-42d5-8fcf-bcc9f40abc92'::uuid,
    'DT_0101',
    'd8d3c2ad-0c10-4760-a696-5cd78b60f89b'::uuid,
    'd8d3c2ad-0c10-4760-a696-5cd78b60f89b'::uuid,
    'Trading Magic Items',
    'Trading Magic Items',
    'Varies',
    '0',
    'You give or receive a magic item to or from another player''s character',
    '- Any items you obtain via trading must be of your PC''s tier or lower. The only exception are items obtained as part of a "last will," but you still cannot use an item above your PC''s tier whether during downtime or an adventure.
- After an item is traded between two PCs, those two PCs can''t re-trade the item between them again until after 14 days have passed',
    101.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '87cb1669-4fd7-432b-aa7f-93eed93e7f97'::uuid,
    'DT_0102',
    'd8d3c2ad-0c10-4760-a696-5cd78b60f89b'::uuid,
    'd8d3c2ad-0c10-4760-a696-5cd78b60f89b'::uuid,
    'Self Trading',
    'Self Trading',
    '0',
    '0',
    'You trade an item from one of your PCs to another one of your PCs',
    '- Trinkets can be freely traded between your PCs.
- You can''t trade a magic item obtained on one of your PCs to another one of your PCs until after 30 days have passed since the date of the session or downtime log where you obtained the item. You can''t retrade that item back between the PCs until after another 30 days have passed.
- You can''t trade gold or items that can be sold for gold between your PCs, even via proxy or cross character trades (such as trading an item from one of your PCs and receiving gold or an item worth gold on another PC). An Auditor investigation will be opened if you and other parties violate this rule.
- As an exception to the above rule, you can trade Art Objects, Gems, and Jewelry between your PCs but only as a marked item. When self trading Art Objects, Gems, or Jewelry as a marked item, it is exchanged from one of your PCs to another except that the Art Object, Gem, or Jewelry becomes marked and can no longer be sold for gold, even if later traded to another PC. Art Objects, Gems, or Jewelry that become marked in this way must be noted as such in the trade log where it is exchanged as a marked item.',
    102.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '4520e80e-88b9-4cf4-abac-d84054ba76d8'::uuid,
    'DT_0103',
    'd8d3c2ad-0c10-4760-a696-5cd78b60f89b'::uuid,
    'd8d3c2ad-0c10-4760-a696-5cd78b60f89b'::uuid,
    'Loaning an Item',
    'Loaning an Item',
    'Varies',
    '0',
    'You give or receive an item to or from another player''s character as a loan for a minimum period of 14 or more days',
    'The transaction must be logged as a loan and must last a minimum of 14 days.',
    103.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '4a0b41d0-5371-4f11-bf93-d073effc62ec'::uuid,
    'DT_0104',
    'bf982e7d-7dd2-408e-b5e0-223f7aaf138e'::uuid,
    'bf982e7d-7dd2-408e-b5e0-223f7aaf138e'::uuid,
    'Learning a Standard Language',
    'Learning a Standard Language',
    '-150',
    '60',
    'Learning a Standard language. See link to Languages sheet for details.',
    'Can be learned in Hawthorne or other towns or cities',
    104.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'd587ce61-a9f9-4a95-aa09-964db8754702'::uuid,
    'DT_0105',
    'bf982e7d-7dd2-408e-b5e0-223f7aaf138e'::uuid,
    'bf982e7d-7dd2-408e-b5e0-223f7aaf138e'::uuid,
    'Learning an Exotic / Rare Language',
    'Learning an Exotic / Rare Language',
    '-250',
    '100',
    'Learning an Exotic / Rare language. See link to Languages sheet for details.',
    '- Celestial, Infernal, and Vedalken can be learned in Hawthorne or other major cities
- Other Exotic / Rare languages can''t be learned in Hawthorne but can be in Waterdeep or other major cities',
    105.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '8831e199-db94-4820-a696-3d81378d9730'::uuid,
    'DT_0106',
    'bf982e7d-7dd2-408e-b5e0-223f7aaf138e'::uuid,
    'bf982e7d-7dd2-408e-b5e0-223f7aaf138e'::uuid,
    'Learning a Monster Language',
    'Learning a Monster Language',
    '-250',
    '100',
    'Learning a Monster language. See link to Languages sheet for details.',
    '- Can''t be learned in downtime except as an adventure reward or as taught by another PC
- Many monster languages are difficult to speak or understand owing to physiology or means of communication unique to that species of monster and many have no written form',
    106.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '5e874859-757d-4bb1-a4f0-76a3f1e1dcf7'::uuid,
    'DT_0107',
    'bf982e7d-7dd2-408e-b5e0-223f7aaf138e'::uuid,
    'bf982e7d-7dd2-408e-b5e0-223f7aaf138e'::uuid,
    'Learning an Ethnic Language',
    'Learning an Ethnic Language',
    '-250',
    '100',
    'Learning an Ethnic language. See link to Languages sheet for details.',
    'Learning in downtime requires traveling to one of the associated listed regions',
    107.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'a12df836-5ea3-4325-b3d5-2d0406d140c2'::uuid,
    'DT_0108',
    'bf982e7d-7dd2-408e-b5e0-223f7aaf138e'::uuid,
    'bf982e7d-7dd2-408e-b5e0-223f7aaf138e'::uuid,
    'Gaining Tool or Vehicle Proficiency (except Disguise Kit, Forgery Kit, Gaming Set, Thieves'' Tools)',
    'Gaining Tool or Vehicle Proficiency (except Disguise Kit, Forgery Kit, Gaming Set, Thieves'' Tools)',
    '-300',
    '150',
    'Gaining proficiency with a tool or vehicle other than a Disguise Kit, Forgery Kit, Gaming Set, or Thieves'' Tools',
    '- For a tool proficiency, requires possessing the associated tool
- For vehicle proficiency, the type of vehicle proficiences are vehicles (air), vehicles (land), vehicles (space), and vehicles (water)',
    108.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '01ba03a1-2544-4e5c-98e6-e81bf33ea0b7'::uuid,
    'DT_0109',
    'bf982e7d-7dd2-408e-b5e0-223f7aaf138e'::uuid,
    'bf982e7d-7dd2-408e-b5e0-223f7aaf138e'::uuid,
    'Gaining a Gaming Set Proficiency',
    'Gaining a Gaming Set Proficiency',
    '-120',
    '60',
    'Gaining proficiency with a type of Gaming Set',
    'Requires possessing the associated gaming set',
    109.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '41fca872-4ede-4139-a43f-50d272d6976a'::uuid,
    'DT_0110',
    'bf982e7d-7dd2-408e-b5e0-223f7aaf138e'::uuid,
    'bf982e7d-7dd2-408e-b5e0-223f7aaf138e'::uuid,
    'Gaining Disguise Kit, Forgery Kit, or Thieves'' Tools Proficiency',
    'Gaining Disguise Kit, Forgery Kit, or Thieves'' Tools Proficiency',
    '-500',
    '100',
    'Gaining proficiency with a Disguise Kit, Forgery Kit, or Thieves'' Tools',
    'Requires possessing the associated tool',
    110.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'b73b9b66-a4ca-45aa-a0b9-2ee96097e786'::uuid,
    'DT_0111',
    'bf982e7d-7dd2-408e-b5e0-223f7aaf138e'::uuid,
    'bf982e7d-7dd2-408e-b5e0-223f7aaf138e'::uuid,
    'Gaining Expertise in a Tool or Vehicle',
    'Gaining Expertise in a Tool or Vehicle',
    '-250',
    '50',
    'Gaining Expertise with a tool or vehicle you have proficiency in',
    'Can''t be acquired in Hawthorne but can be in Waterdeep or other major cities',
    111.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '8fb7d1a7-66a8-47d1-97fe-3d86d161cb4e'::uuid,
    'DT_0112',
    '46a73f33-8302-4739-a18b-47963154b8fe'::uuid,
    '46a73f33-8302-4739-a18b-47963154b8fe'::uuid,
    'Traveling on land',
    'Traveling on land',
    '-1 GP per day of travel',
    '1 DTP per day of travel',
    'Traveling to a destination on land via walking, a mount, or a land vehicle',
    '- Use the distance via roads to determine the number of days traveled
- A PC on foot, riding a land vehicle, or on a typical mount covers 24 miles in a day
- A PC on a Phantom Steed can cover 10 miles in 1 hour (or 80 miles in a day if the PC can keep the spell up the entire day)',
    112.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '6e496b0b-18bd-4c0d-acc6-bedbb673af38'::uuid,
    'DT_0113',
    '46a73f33-8302-4739-a18b-47963154b8fe'::uuid,
    '46a73f33-8302-4739-a18b-47963154b8fe'::uuid,
    'Traveling by ship passage',
    'Traveling by ship passage',
    '-1 SP per mile traveled and either -1.5 GP (hammock) or -3 GP (private cabin) per day of travel',
    '1 DTP per day of travel',
    'Traveling from one port to another via ship as a passenger, resting either in a hammock or private cabin',
    '- Use the distance between ports to determine the number of days traveled
- A typical sailing ship covers 48 miles in a day to travel along the sea
- A keelboat covers 24 miles in a day to travel along a river',
    113.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '8df7022d-d29f-45af-b067-93e353ca4493'::uuid,
    'DT_0114',
    '46a73f33-8302-4739-a18b-47963154b8fe'::uuid,
    '46a73f33-8302-4739-a18b-47963154b8fe'::uuid,
    'Traveling via flight',
    'Traveling via flight',
    '-1 GP per day of travel',
    '1 DTP per day of travel',
    'Traveling to a destination via a flying mount or magical flight',
    '- Use the straightline distance between locations to determine the number of days traveled
- For flying via a flying mount or a magical item that grants sustained flight, you can travel up to 8 times the hourly rate of the source of flight in a day regardless of if it is a flying mount or magical item that grants sustained flight
- A PC under the effects of Wind Walk can cover 240 miles in a day',
    114.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'c6018e8c-13c9-4ba5-b920-8cdd284af1d3'::uuid,
    'DT_0115',
    '46a73f33-8302-4739-a18b-47963154b8fe'::uuid,
    '46a73f33-8302-4739-a18b-47963154b8fe'::uuid,
    'Traveling via owned air, space, or water vehicle',
    'Traveling via owned air, space, or water vehicle',
    '-1 GP per day of travel and -2 GP per crew member per day of travel',
    '1 DTP per day of travel',
    'Traveling to a destination via an air, space, or water vehicle you own',
    '- A vehicle can cover 24 times its listed hourly speed in a day
- A water vehicle can only travel from one port to another port
- An air vehicle can be landed safely on the ground
- A canoe, keelboat, or rowboat can only travel via a river
- Certain space vehicles can only be landed safely on the ground or in water (such as a port), not both
- Use the straightline distance between locations to determine the number of days traveled via an air or space vehicle
- Travel from Toril to the Rock of Bral or vice versa via a space vehicle takes 1 DTP for 1 day of travel (2 DTP for 2 days for a round trip)
- Vehicles with a listed amount of Crew require that number of skilled hirelings for each day of use, costing 2 GP per hireling (included in Gold Spent)
- Other characters (up to the vehicle''s Passenger limit) can also travel with you in this way, but also expend gold and DTP to travel, though they do not have to pay for Crew costs',
    115.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '20e69605-7aca-4935-a9f8-39aa6cffb18f'::uuid,
    'DT_0116',
    '46a73f33-8302-4739-a18b-47963154b8fe'::uuid,
    '46a73f33-8302-4739-a18b-47963154b8fe'::uuid,
    'Traveling via a teleportation spell',
    'Traveling via a teleportation spell',
    'Varies',
    'Level of the spell (minimum 1)',
    'Traveling to a destination via a teleportation spell',
    '- The caster must expend any costly material components for the spell that are consumed (if any) as the gold cost for this activity
- The caster and any other characters that are teleported must expend DTP equal to the level of the spell used
- You can''t use Teleport in downtime except to a permanent circle or a safe location you possess an associated / linked object for
- All PCs know the following sigil sequences: Durlag''s Tower, Lerwick Outpost, Merkin''s Keep (near Baldur''s Gate), Port Nyanzaru (in the Temple of Savras), Suzail, Silent Tower (Mompono Village, Chult), Tinkerton (near Waterdeep)',
    116.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '34a0b5b3-ba7d-427c-a001-93475580192d'::uuid,
    'DT_0117',
    '46a73f33-8302-4739-a18b-47963154b8fe'::uuid,
    '46a73f33-8302-4739-a18b-47963154b8fe'::uuid,
    'Traveling from Hawthorne to the Rock of Bral or vice versa',
    'Traveling from Hawthorne to the Rock of Bral or vice versa',
    '-15 GP',
    '1 DTP',
    'Traveling to the Rock of Bral from Hawthorne (or vice versa) via spelljamming transport provided by New Nivix',
    'A round trip costs 30 GP and 2 DTP',
    117.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '115c082b-72c0-4764-bd06-9b82637fd3fb'::uuid,
    'DT_0118',
    '46a73f33-8302-4739-a18b-47963154b8fe'::uuid,
    '46a73f33-8302-4739-a18b-47963154b8fe'::uuid,
    'Travelling into or out of an extradimensional space',
    'Travelling into or out of an extradimensional space',
    'Varies',
    'Varies',
    'Travelling into or out from an extradimensional space you have access to via a spell or magic item (e.g. Demiplane)',
    '- For a spell, the caster must expend any costly material components for the spell that are consumed (if any) as the gold cost for this activity
- If a spell is used to travel into or out from an extradimensional space you have access to, the DTP cost is equal to the level of spell
- If a magic item is used to travel into or out from an extradimensional space you have access to without casting a spell (e.g. Rod of Security), the DTP cost is 1',
    118.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'dd878a94-995b-400d-be47-532af9915b52'::uuid,
    'DT_0119',
    '46a73f33-8302-4739-a18b-47963154b8fe'::uuid,
    '46a73f33-8302-4739-a18b-47963154b8fe'::uuid,
    'Traveling beyond Faerûn',
    'Traveling beyond Faerûn',
    'Varies',
    'Level of the spell (minimum 1)',
    'Traveling via a teleportation spell to a known safe location beyond Faerûn.',
    '- Locations beyond Faerûn include other continents on Toril, Wildspace, other planes of existence, and other worlds
- Outside of teleporting to a known safe location (such as to a known teleportation circle), travel to locations beyond Faerûn can only occur as part of an adventure or as otherwise overseen by a DM
- The caster must expend any costly material components for the spell that are consumed (if any) as the gold cost for this activity
- The caster and any other characters that are teleported must expend DTP equal to the level of the spell used',
    119.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '4bbbe277-cf82-4331-83b5-80419fd4e8a4'::uuid,
    'DT_0120',
    'e23d5a97-6350-4cbb-9713-3bd234e967b5'::uuid,
    'e23d5a97-6350-4cbb-9713-3bd234e967b5'::uuid,
    'Working a Trade with a Tool (Proficiency)',
    'Working a Trade with a Tool (Proficiency)',
    '1d6 + your Proficiency Bonus',
    '1',
    'Working a trade with a tool you have Proficiency with.',
    'You can log multiple rolls at once and the total gold gained in #downtime-log',
    120.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '299f4af3-e864-4a31-b2cd-46dc2e8b6f73'::uuid,
    'DT_0121',
    'e23d5a97-6350-4cbb-9713-3bd234e967b5'::uuid,
    'e23d5a97-6350-4cbb-9713-3bd234e967b5'::uuid,
    'Working a Trade with a Tool (Expertise)',
    'Working a Trade with a Tool (Expertise)',
    '1d6 + twice your Proficiency Bonus',
    '1',
    'Working a trade with a tool you have Expertise with.',
    NULL,
    121.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '9d745215-33ac-44e3-999d-79c0d199e732'::uuid,
    'DT_0122',
    'a74477c9-038f-4368-b515-f6c997e45349'::uuid,
    'a74477c9-038f-4368-b515-f6c997e45349'::uuid,
    'Divine Intervention (2014)',
    'Divine Intervention (2014)',
    '0',
    '7',
    'Using 2014 Divine Intervention as a cleric to attempt to resurrect a PC or reverse a consequence that requires Divine Intervention to revert.',
    '- A character can only benefit from one successful Divine Intervention (2014) in their career to be resurrected, replicating True Resurrection without any components. 
- Divine Intervention can''t otherwise be used in downtime, except for purposes of resurrection as above or for other effects that require a Divine Intervention to revert.',
    122.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '57daedaf-bac7-4091-bc26-8c775201dd6e'::uuid,
    'DT_0123',
    'a74477c9-038f-4368-b515-f6c997e45349'::uuid,
    'a74477c9-038f-4368-b515-f6c997e45349'::uuid,
    'Gaining Renown',
    'Gaining Renown',
    '0',
    '10 times current Renown Score',
    'Increasing your Renown Score with a group by 1 by undertaking minor missions and socializing with its members',
    '- You must already have a Renown Score of 1+ with a group to increase your Renown Score in this way
- You must be in the same location as members of a group in order to increase your Renown Score in this way
- In Hawthorne and most cities of Faerûn, members of the Cult of the Dragon, the Emerald Enclave, the Harpers, the Lords'' Alliance, the Order of the Gauntlet, the Purple Dragon Knights, the Red Wizards, and the Zhentarim can be found',
    123.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'fff57296-36c9-4b98-a70a-7ba1dc03da7c'::uuid,
    'DT_0124',
    'a74477c9-038f-4368-b515-f6c997e45349'::uuid,
    'a74477c9-038f-4368-b515-f6c997e45349'::uuid,
    'Repairing Damaged Armor and Weapons',
    'Repairing Damaged Armor and Weapons',
    '0',
    'DTP equal to the penalty',
    'Repairing armor and weapons with a cumulative penalty to their AC, attack rolls, or damage rolls, such as due to a Black Pudding or Rust Monster',
    '- Repairing damaged armor or weapons in this way requires proficiency in Smith''s Tools
- Destroyed armor and weapons can''t be repaired in this way.',
    124.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    'a8f48c45-2906-4672-b998-ed12b6cf2870'::uuid,
    'DT_0125',
    'a74477c9-038f-4368-b515-f6c997e45349'::uuid,
    'a74477c9-038f-4368-b515-f6c997e45349'::uuid,
    'Repairing Infernal War Machine',
    'Repairing Infernal War Machine',
    '-50 GP per Hit Point regained',
    '1 DTP per 50 Hit Points regained',
    'Repairing an Infernal War Machine you own in downtime',
    'A damaged infernal war machine can only be repaired in this way while at a settlement in the Nine Hells (such as Mahadi''s Wandering Emporium) or at another locaton as determined by a DM.',
    125.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '104b694f-adcb-4199-890c-597bbeee986e'::uuid,
    'DT_0126',
    'a74477c9-038f-4368-b515-f6c997e45349'::uuid,
    'a74477c9-038f-4368-b515-f6c997e45349'::uuid,
    'Repairing Infernal War Machine (Tools)',
    'Repairing Infernal War Machine (Tools)',
    '200 GP per repair (up to 8 repairs per DTP)',
    '1',
    'Repairing an Infernal War Machine you own in downtime using Smith''s Tools or Tinker''s Tools',
    '- Repairing a damaged infernal war machine in this way requires proficiency in Smith''s Tools or Tinker''s Tools to either remove levels of Exhaustion or restore Hit Points.
- Performing a repair requires 200 GP worth of replacement parts and either removes 1 level of Exhaustion or restores 2d4 + 2 Hit Points. An infernal war machine can be repaired in this way up to 8 times per DTP expended.
- During an adventure, an infernal war machine can be repaired in this way once per hour. This does not expend DTP.',
    126.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '7c208b85-788a-4fc9-b5ab-13b0320f0fd6'::uuid,
    'DT_0127',
    'a74477c9-038f-4368-b515-f6c997e45349'::uuid,
    'a74477c9-038f-4368-b515-f6c997e45349'::uuid,
    'Vehicle Repair',
    'Vehicle Repair',
    '-20 GP per Hit Point regained*',
    '1 DTP per Hit Point regained*',
    'Repairing a Vehicle you own in downtime',
    'A damaged vehicle can only be repaired in this way while berthed. This activity can''t be used to repair an infernal war machine.

* In Hawthorne or in a port city (population >5000), a vehicle can regain 2 Hit Points per DTP expended at a cost of 10 GP per Hit Point regained',
    127.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '1e2c3024-69c9-4bba-9370-8ad388808a99'::uuid,
    'DT_0128',
    'a74477c9-038f-4368-b515-f6c997e45349'::uuid,
    'a74477c9-038f-4368-b515-f6c997e45349'::uuid,
    'Shipboard Weapon Repair',
    'Shipboard Weapon Repair',
    '-10 GP per Hit Point regained*',
    '1 DTP per Hit Point regained*',
    'Repairing a Shipboard Weapon you own in downtime',
    'A damaged shipboard weapon can only be repaired in this way while berthed. 

* In Hawthorne or in a port city (population >5000), a vehicle can regain 2 Hit Points per DTP expended at a cost of 5 GP per Hit Point regained',
    128.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '0699d274-259c-413b-abd7-3eaf573a2a01'::uuid,
    'DT_0129',
    'a74477c9-038f-4368-b515-f6c997e45349'::uuid,
    'a74477c9-038f-4368-b515-f6c997e45349'::uuid,
    'Vehicle Repair (Mending)',
    'Vehicle Repair (Mending)',
    '0',
    '1',
    'Repairing a Vehicle you own in downtime using the Mending spell',
    '- You can cast Mending in this way up to 8 times per DTP expended. Each use of Mending in this way restores a number of Hit Points to a damaged vehicle equal to 1d8 + your spellcasting ability modifier.
- During an adventure, a DM can permit the use of Mending in this way once per hour to repair a damaged vehicle. This does not expend DTP.',
    129.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

INSERT INTO public.ac_downtime (
    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,
    dtp_cost, description, notes_advice, display_order
) VALUES (
    '734eaa68-70fa-46e4-be1f-a0b9f73c7f5d'::uuid,
    'DT_0130',
    'a74477c9-038f-4368-b515-f6c997e45349'::uuid,
    'a74477c9-038f-4368-b515-f6c997e45349'::uuid,
    'Shipboard Weapon Repair (Mending)',
    'Shipboard Weapon Repair (Mending)',
    '0',
    '1',
    'Repairing a Shipboard Weapon you own in downtime using the Mending spell',
    '- You can cast Mending in this way up to 8 times per DTP expended. Each use of Mending in this way restores a number of Hit Points to a damaged shipboard weapon equal to 1d8 + your spellcasting ability modifier.
- During an adventure, a DM can permit the use of Mending in this way once per hour to repair a damaged shipboard weapon. This does not expend DTP.',
    130.0
)
ON CONFLICT (id) DO UPDATE SET
    check_id = EXCLUDED.check_id,
    downtime_type_id = EXCLUDED.downtime_type_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    activity = EXCLUDED.activity,
    gold_cost = EXCLUDED.gold_cost,
    dtp_cost = EXCLUDED.dtp_cost,
    description = EXCLUDED.description,
    notes_advice = EXCLUDED.notes_advice,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

-- Ensure check_id is NOT NULL and UNIQUE
ALTER TABLE public.ac_downtime ALTER COLUMN check_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ac_downtime_check_id ON public.ac_downtime(check_id);

-- ------------------------------------------------------------------------------
-- 6. Performance Indexes
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_ac_downtime_type_id ON public.ac_downtime(downtime_type_id);
CREATE INDEX IF NOT EXISTS idx_ac_downtime_category_id ON public.ac_downtime(category_id);
CREATE INDEX IF NOT EXISTS idx_ac_downtime_display_order ON public.ac_downtime(display_order);
CREATE INDEX IF NOT EXISTS idx_ac_downtime_name ON public.ac_downtime(name);
CREATE INDEX IF NOT EXISTS idx_ac_downtime_type_display_order ON public.ac_downtime_type(display_order);

-- ------------------------------------------------------------------------------
-- 7. Automated Timestamps Triggers
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS set_updated_at ON public.ac_downtime_type;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.ac_downtime_type
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.ac_downtime;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.ac_downtime
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 8. Row Level Security (RLS) Policies
-- ------------------------------------------------------------------------------
ALTER TABLE public.ac_downtime_type ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to ac_downtime_type" ON public.ac_downtime_type;
CREATE POLICY "Allow public read access to ac_downtime_type"
ON public.ac_downtime_type FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow service_role to manage ac_downtime_type" ON public.ac_downtime_type;
CREATE POLICY "Allow service_role to manage ac_downtime_type"
ON public.ac_downtime_type FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins and Engineers can manage ac_downtime_type" ON public.ac_downtime_type;
CREATE POLICY "Admins and Engineers can manage ac_downtime_type"
ON public.ac_downtime_type FOR ALL
TO authenticated
USING (
  ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
  OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
)
WITH CHECK (
  ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
  OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
);

ALTER TABLE public.ac_downtime ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to ac_downtime" ON public.ac_downtime;
CREATE POLICY "Allow public read access to ac_downtime"
ON public.ac_downtime FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow service_role to manage ac_downtime" ON public.ac_downtime;
CREATE POLICY "Allow service_role to manage ac_downtime"
ON public.ac_downtime FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins and Engineers can manage ac_downtime" ON public.ac_downtime;
CREATE POLICY "Admins and Engineers can manage ac_downtime"
ON public.ac_downtime FOR ALL
TO authenticated
USING (
  ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
  OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
)
WITH CHECK (
  ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
  OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
);
