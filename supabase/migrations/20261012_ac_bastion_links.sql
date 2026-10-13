-- Migration: 20261012_ac_bastion_links.sql
-- Description: Convert cross-reference links in Bastion notes and types to markdown relative URLs
-- Target Tables: public.ac_bastion, public.ac_bastion_type

BEGIN;

-- 1. Update ac_bastion_type category notes
UPDATE public.ac_bastion_type 
SET notes = 'A starting Bastion must contain two Basic Facilities (one Cramped and one Roomy) and two Special Facilities. You must be level 5+ and meet all other prerequisites. See [Appendix B of the Player Guidelines](/playersguide/appendices/bastions/) for details.

Any facility or component built as part of a Bastion can be torn down and 50% of its gold cost refunded. The Bastion must still contain at least two Basic Facilities (including one Cramped and one Roomy) and two Special Facilities afterward to be useable.

A Special Facility can be replaced with another Special Facility by paying the gold and DTP to build the new facility, but the full gold cost of the old facility contributes to the new one

You can combine your Bastion with Bastions built by one or more characters of other players into a single structure as written in the 2024 Dungeon Master''s Guide.  Each participant can mutually contribute gold and DTP in building and expanding Bastions in this way.

Any items acquired or crafted from Bastions are subject to the normal trading rules (including needing to wait 30 days before self trading)'
WHERE check_id = 'BASC_0001';

UPDATE public.ac_bastion_type 
SET notes = 'You must meet all prerequisites of a Special Facility in order to build and use it. The maximum number of Special Facilities your Bastion can have depends on your character''s level (see [Appendix B of the Player Guidelines](/playersguide/appendices/bastions/) for details)

A Bastion can''t have more than one Special Facility of the same kind unless the facility''s description says otherwise.

A Special Facility can be replaced with another Special Facility by paying the gold and DTP to build the new facility, but the full gold cost of the old facility contributes to the new one

Only the Bastion''s owner can benefit from its Special Facilities except where explicitly noted otherwise.

Certain Special Facilities have associated Craftable Magic Item Types to be used with the [Crafting Magic Item](/allowed-content/#downtime) downtime activity'
WHERE check_id = 'BASC_0003';

-- 2. Update ac_bastion facility notes
-- BAS_0009: Arcane Study
UPDATE public.ac_bastion SET notes_advice = '- For the Craft: Arcane Focus or Book order, crafting the item requires no additional DTP beyond taking the Bastion Turn and requires no additional GP beyond what is written.
- For the Craft: Magic Item order (must be level 9+), the crafted magic item can be any T0 or T1 item in the [Rolled](/allowed-content/#loot) or [Select](/allowed-content/#loot) Loot categories of the listed Craftable Magic Item Types (ignore rarity and theme). This facility''s hireling can craft the item even if you don''t have the associated tool proficiency, though you must still expend gold and DTP as normal. If the item allows one to cast any spells or has specific attunement restrictions, you must craft the item yourself.' WHERE check_id = 'BAS_0009';

-- BAS_0020: Smithy
UPDATE public.ac_bastion SET notes_advice = '- For the Craft: Smith''s Tools order, the crafted item can be any item in [Equipment](/allowed-content/#equipment) that has Smith''s Tools as its requirement. The facility''s hirelings can craft the item even if you don''t have the associated tool proficiency, though you must still expend gold and DTP as normal.
- For the Craft: Magic Item order (must be level 9+), the crafted magic item can be any T0 or T1 item in the [Rolled](/allowed-content/#loot) or [Select](/allowed-content/#loot) Loot categories of the listed Craftable Magic Item Types (ignore rarity and theme). This facility''s hireling can craft the item even if you don''t have the associated tool proficiency, though you must still expend gold and DTP as normal. If the item allows one to cast any spells or has specific attunement restrictions, you must craft the item yourself.' WHERE check_id = 'BAS_0020';

-- BAS_0021: Storehouse
UPDATE public.ac_bastion SET notes_advice = '- For the Trade: Goods order, any nonmagical goods acquired must be in the [Equipment](/allowed-content/#equipment) sheet.
- For the Trade: Goods order, any nonmagical goods sold from the Storehouse fetch prices as per the [Buying and Selling](/allowed-content/#downtime) downtime activity (ignore percentage markup)' WHERE check_id = 'BAS_0021';

-- BAS_0023: Workshop
UPDATE public.ac_bastion SET notes_advice = '- For the Craft: Adventuring Gear order, the crafted item can be any item in [Equipment](/allowed-content/#equipment) that has one of the chosen tool proficiencies as its requirement. The facility''s hirelings can craft the item even if you don''t have the associated tool proficiency, though you must still expend gold and DTP as normal.
- For the Craft: Magic Item order (must be level 9+), the crafted magic item can be any T0 or T1 item in the [Rolled](/allowed-content/#loot) or [Select](/allowed-content/#loot) Loot categories of the listed Craftable Magic Item Types (ignore rarity and theme). This facility''s hireling can craft the item even if you don''t have the associated tool proficiency (provided the facility has one of the tools you selected), though you must still expend gold and DTP as normal. If the item allows one to cast any spells or has specific attunement restrictions, you must craft the item yourself.
- Can be expanded to Vast as written by expending 2000 GP and 80 DTP and also gaining 2 additional hirelings and 3 additional listed Aristan''s Tools as listed.
- If you take a Bastion Turn while physically present at your Bastion, you gain Heroic Inspiration without needing to expend any additional DTP.  You must otherwise expend 1 DTP to gain Heroic Inspiration in downtime while present at the Bastion. You don''t need to expend this DTP during an adventure.' WHERE check_id = 'BAS_0023';

-- BAS_0029: Kundarak Vault
UPDATE public.ac_bastion SET notes_advice = '- This Special Facility can only be used if your Bastion is in Khorvaire or another region in Eberron with dragonmarked houses present.
- For the Trade: Goods order, any nonmagical goods acquired must be in the [Equipment](/allowed-content/#equipment) sheet.
- For the Trade: Goods order, any nonmagical goods sold from the facility fetch prices as per the [Buying and Selling](/allowed-content/#downtime) downtime activity (ignore percentage markup).' WHERE check_id = 'BAS_0029';

-- BAS_0030: Laboratory
UPDATE public.ac_bastion SET notes_advice = '- For the Craft: Alchemist''s Supplies order, the crafted item can be any item in [Equipment](/allowed-content/#equipment) that has Alchemist''s Supplies as its requirement. The facility''s hirelings can craft the item even if you don''t have the associated tool proficiency, though you must still expend gold and DTP as normal.
- For the Craft: Poison order, collecting the poison requires no additional DTP beyond taking the Bastion Turn and costs GP equal to half the listed poison''s price.' WHERE check_id = 'BAS_0030';

-- BAS_0032: Navigator's Helm
UPDATE public.ac_bastion SET notes_advice = '- A water vehicle can be built into a mobile Bastion with this facility. The vehicle''s cost to acquire must be paid separately.
- Besides taking a Bastion Turn to travel as written, a mobile Bastion can be used as a vehicle as normal to travel during an adventure or in downtime as per the [Traveling](/allowed-content/#downtime) downtime activity.' WHERE check_id = 'BAS_0032';

-- BAS_0033: Orien Helm
UPDATE public.ac_bastion SET notes_advice = '- A Lightning Rail can be built into a mobile Bastion with this Special Facility. This can only be used as a Bastion in Khorvaire or another region in Eberron with dragonmarked houses present.
- This Special Facility can only be used if your Bastion is in Khorvaire or another region in Eberron with dragonmarked houses present.
- Besides taking a Bastion Turn to travel as written, a mobile Bastion can be used as a vehicle as normal to travel during an adventure or in downtime as per the [Traveling](/allowed-content/#downtime) downtime activity.' WHERE check_id = 'BAS_0033';

-- BAS_0034: Sacristy
UPDATE public.ac_bastion SET notes_advice = '- For the Craft: Holy Water order,  crafting the item requires no additional DTP beyond taking the Bastion Turn and requires no additional GP beyond what is written. You cannot sell or trade Holy Water crafted in this way.
- For the Craft: Magic Item order, the crafted magic item can be any T0 or T1 item in the [Rolled](/allowed-content/#loot) or [Select](/allowed-content/#loot) Loot categories of the listed Craftable Magic Item Types (ignore rarity and theme). This facility''s hireling can craft the item even if you don''t have the associated tool proficiency, though you must still expend gold and DTP as normal. If the item allows one to cast any spells or has specific attunement restrictions, you must craft the item yourself.
- Spell Refreshment can only be used during an adventure and costs no DTP.' WHERE check_id = 'BAS_0034';

-- BAS_0036: Stable
UPDATE public.ac_bastion SET notes_advice = '- For the Trade: Animals order, any mounts acquired must be in the [Equipment](/allowed-content/#equipment) sheet. The available mounts depends on the Bastion''s location.
- For the Trade: Animals order, any mounts sold from the Storehouse fetch prices as per the [Buying and Selling](/allowed-content/#downtime) downtime activity (ignore percentage markup). You cannot sell sapient mounts.
- Can be expanded to Vast as written by expending 2000 GP and 80 DTP' WHERE check_id = 'BAS_0036';

-- BAS_0044: Artificer's Forge
UPDATE public.ac_bastion SET notes_advice = '- Whenever you craft a magic item using the rules in [Allowed Content (Downtime)](/allowed-content/#downtime), the Crafting Assistants can reduce the base DTP cost to craft the item by either one half or two thirds of the normal base DTP cost (round up for the DTP cost after applying the reduction).
- For the Craft: Magic Item order, the crafted magic item can be any T0 or T1 item in the [Rolled](/allowed-content/#loot) or [Select](/allowed-content/#loot) Loot categories of the listed Craftable Magic Item Types (ignore rarity). This facility''s hirelings can craft the item even if you don''t have the associated tool proficiency, though you must still expend gold and DTP as normal. If the item has specific attunement restrictions, it must be an item that could be attuned to by an Artificer, Bard, Sorcerer, Warlock, or Wizard. The base DTP cost to craft the item this way is halved (round up) as the two hirelings work together.' WHERE check_id = 'BAS_0044';

-- BAS_0047: Lyrandar Helm
UPDATE public.ac_bastion SET notes_advice = '- An elemental air vehicle can be built into a mobile Bastion with this facility. The vehicle''s cost to acquire must be paid separately.
- A reflavored version of this Special Facility can also be used with other air vehicles as built into a mobile Bastion. The vehicle''s cost to acquire must be paid separately. Instead of Renown with House Lyrandar, the facility''s prerequisite instead is Renown Score 25+ with a group with access to and the ability to create airships, such as the community of Halruaa, the community of New Nivix, etc. (Renown with House Lyrandar can still also satisfy this prerequisite)
- A reflavored version of this Special Facility can also be used with space vehicles as built into a mobile Bastion. The vehicle''s cost to acquire must be paid separately. Instead of Renown with House Lyrandar, the facility''s prerequisite instead is Renown Score 25+ with a group with access to and the ability to create space vehicles, such as the community of New Nivix, the community of the Rock of Bral, the United Universe Coalition, etc.
- Besides taking a Bastion Turn to travel as written, a mobile Bastion can be used as a vehicle as normal to travel during an adventure or in downtime as per the [Traveling](/allowed-content/#downtime) downtime activity.' WHERE check_id = 'BAS_0047';

-- BAS_0050: Menagerie
UPDATE public.ac_bastion SET notes_advice = 'For the Recruit: Creature order, you can recruit other Beasts and Monstrosities besides the listed options with costs as according to the second table. The recruited creature can be any non-sapient Beast or Monstrosity of your choice that is CR 3 or less in Fair Game in the [Monsters](/allowed-content/#monsters) sheet. (If a monster can speak one or more languages, has telepathy, or has an alignment other than unaligned, it is considered to be sapient) A Beast or Monstrosity that is CR 2 or higher and that has a Fly Speed is considered to be T3 for purposes of acquisition and trade.' WHERE check_id = 'BAS_0050';

-- BAS_0057: Demiplane
UPDATE public.ac_bastion SET notes_advice = '- The Empower: Arcane Resilience order can only be issued during an adventure.
- You must expend 1 DTP to use Fabrication. This DTP must be expended even if used during an adventure.
- The object created via Fabrication must be present in the [Equipment](/allowed-content/#equipment) sheet in addition to the listed requirements.' WHERE check_id = 'BAS_0057';

-- BAS_0058: Guildhall
UPDATE public.ac_bastion SET notes_advice = '- For the Adventurers'' Guild assignment, the Beast can be any Beast in Fair Game that is CR 2 or less.
- For the Masons'' Guild assignment, you can add up to 7 5-foot squares of Defensive Walls as part of the Bastion Turn with no additional DTP cost and costing no money. Only other PCs of the same shared set of Bastions can receive Defensive Walls in this way during downtime.
- For the Shipbuilders'' Guild assignment, any air, space, or water vehicle listed in the [Equipment](/allowed-content/#equipment) sheet can be made. You pay half the cost of the vehicle and the construction takes an amount of DTP equal to the vehicle''s full cost divided by 1000 (round up, minimum 1). Additionally, your Bastion must be located in a coastal location to construct any water vehicles. Your Bastion must be open to air or space to construct any air or space vehicles.
- For the Thieves'' Guild assignment, the object must be present in the [Equipment](/allowed-content/#equipment) sheet and have a value no greater than 500 GP in addition to the listed requirements.' WHERE check_id = 'BAS_0058';

-- BAS_0059: Liminal Space
UPDATE public.ac_bastion SET notes_advice = '- If you take a Bastion Turn while physically present at your Bastion, you can gain the benefits of Dark Bargains without needing to expend any additional DTP. You must otherwise expend 7 DTP to gain the benefits of Dark Bargains in downtime while present at the Bastion. You don''t need to expend this DTP during an adventure.
- You can only retain the benefit of the Dark Gift feat from Dark Bargains while you have this Bastion Facility and satisfy its prerequisite.
- If you already have the chosen Dark Gift feat from Dark Bargains as a Dark Gift feat, you only gain the benefit of one at a time. 
- The Dark Gift feat you gain from Dark Bargains can’t be replaced by any means except by use of Dark Bargains again.
- The Dark Gift feat you gain from Dark Bargains isn’t a Dark Gift (Supernatural Reward) as in [Allowed Content: Other Rewards (Dark Gifts)](/allowed-content/#other-rewards) and doesn’t count against the limit of 1 Dark Gift (Supernatural Reward) at a time.' WHERE check_id = 'BAS_0059';

-- BAS_0061: War Room
UPDATE public.ac_bastion SET notes_advice = '- The Recruit: Soldiers order can only be issued during an adventure or as overseen by a DM.
- When you issue the Recruit: Soldiers order, you muster either 5 Army statblocks or 1 Mounted Army statblock per lieutenant ordered. Each Army costs 20 GP per day to feed and each Mounted Army costs 40 GP per day to feed. You can find these statblocks in [Appendix B of the Player Guidelines](/playersguide/appendices/bastions/). Each statblock represents a group of 20 Guards.' WHERE check_id = 'BAS_0061';

-- BAS_0066: Flying Bastion
UPDATE public.ac_bastion SET notes_advice = '- The listed cost is per 5-foot square taken up by a Bastion''s Basic and Special Facilities and must be expended both when turning a Bastion into a flying Bastion as well as when adding any new Basic or Special Facilities to a flying Bastion. 
- A flying Bastion requires a Navigation Orb in order to move. If a Bastion is turned into a flying Bastion without a Navigation Orb, it floats at a fixed height from 10 feet to 10 miles above the ground (chosen at the time when the modification is applied). 
- A flying Bastion can move with a Navigation Orb as written at a rate of 1 mile per hour. It can be used by the Bastion''s owner (or owners if it is a Shared Bastion) or by any hireling of the Bastion for this purpose. A flying Bastion can be used to travel during an adventure or in downtime as per the [Traveling](/allowed-content/#downtime) downtime activity. 
- A Navigation Orb can be keyed to an existing Flying Bastion by taking a Bastion Turn at the Bastion with the Navigation Orb present. The orb can otherwise be keyed to a Stronghold Bastion (as per the [Building a Stronghold](/allowed-content/#downtime) downtime activity) by expending 7 DTP with the Navigation Orb present at the location.' WHERE check_id = 'BAS_0066';

COMMIT;
