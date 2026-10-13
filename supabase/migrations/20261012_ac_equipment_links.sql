--
-- Migration: 20261012_ac_equipment_links.sql
-- Purpose: Normalize external and relative documentation links in public.ac_equipment, public.ac_equip_type, and public.ac_equipment_categories
--
BEGIN;

-- 1. Update public.ac_equip_type and public.ac_equipment_categories (Siege Ammunition and Weapons)
UPDATE public.ac_equip_type SET notes = REPLACE(notes, 'atop a structure such as a Bastion, or as personally operated.', 'atop a structure such as a [Bastion](/allowed-content/#bastions), or as personally operated.') WHERE name = 'Siege Ammunition and Weapons';
UPDATE public.ac_equipment_categories SET notes = REPLACE(notes, 'atop a structure such as a Bastion, or as personally operated.', 'atop a structure such as a [Bastion](/allowed-content/#bastions), or as personally operated.') WHERE name = 'Siege Ammunition and Weapons';

-- 2. Update public.ac_equipment
UPDATE public.ac_equipment SET notes_advice = 'Considered to have the Heavy property for purposes of weapons in [Loot](/allowed-content/#loot) that allow or exclude weapons with the Heavy property' WHERE check_id = 'EQP_0039';
UPDATE public.ac_equipment SET notes_advice = 'Only one Cheese Bag can be purchased per day per person. If purchasing a Cheese Bag in [downtime](/allowed-content/#downtime), you must expend 1 DTP in addition to the gold cost.' WHERE check_id = 'EQP_0248';
UPDATE public.ac_equipment SET notes_advice = 'See [Allowed Content (Loot)](/allowed-content/#loot) for the requirements to craft this magic item.' WHERE check_id = 'EQP_0252';
UPDATE public.ac_equipment SET notes_advice = 'See [Allowed Content (Loot)](/allowed-content/#loot) for the requirements to craft this magic item.' WHERE check_id = 'EQP_0273';
UPDATE public.ac_equipment SET notes_advice = '- Can only be purchased by a PC missing a limb or on behalf of a creature missing a limb
- Does not require attunement.
- A PC can start with this item at character creation as a substitute for a missing limb. A Prosthetic Limb possessed at character creation in this way cannot be traded.
- See [Allowed Content (Loot)](/allowed-content/#loot) for the requirements to craft this magic item.' WHERE check_id = 'EQP_0282';
UPDATE public.ac_equipment SET notes_advice = '- Typically found in the Nine Hells. Can only be purchased during an adventure or as otherwise overseen by a DM.
- Uses the rules for infernal war machines as listed in Baldur''s Gate: Descent into Avernus, including requiring Soul Coins to use the vehicle.
- An infernal war machine can be repaired as described in [Downtime](/allowed-content/#downtime).
- A Demon Grinder has 4 weapon stations and can swap them with new weapon stations as Infernal War Machine Upgrades.

* Can also instead be purchased for 8 Soul Coins' WHERE check_id = 'EQP_0389';
UPDATE public.ac_equipment SET notes_advice = '- Typically found in the Nine Hells. Can only be purchased during an adventure or as otherwise overseen by a DM.
- Uses the rules for infernal war machines as listed in Baldur''s Gate: Descent into Avernus, including requiring Soul Coins to use the vehicle.
- An infernal war machine can be repaired as described in [Downtime](/allowed-content/#downtime).
- A Tormentor has 1 weapon station and can swap it with a new weapon station as Infernal War Machine Upgrades.

* Can also instead be purchased for 4 Soul Coins' WHERE check_id = 'EQP_0390';
UPDATE public.ac_equipment SET notes_advice = '- Typically found in the Nine Hells. Can only be purchased during an adventure or as otherwise overseen by a DM.
- Uses the rules for infernal war machines as listed in Baldur''s Gate: Descent into Avernus, including requiring Soul Coins to use the vehicle.
- An infernal war machine can be repaired as described in [Downtime](/allowed-content/#downtime).
- A Scavenger has 3 weapon stations and can swap them with new weapon stations as Infernal War Machine Upgrades.

* Can also instead be purchased for 8 Soul Coins' WHERE check_id = 'EQP_0391';
UPDATE public.ac_equipment SET notes_advice = 'Can''t be turned into a mobile [Bastion](/allowed-content/#bastions)' WHERE check_id = 'EQP_0394';
UPDATE public.ac_equipment SET notes_advice = '- Can only be purchased in Khorvaire or another region in Eberron with dragonmarked houses present.
- A creature without the Mark of the Storm can''t operate this vehicle''s helm except as described in chapter 7 of [Eberron: Forge of the Artificer](https://www.dndbeyond.com/sources/dnd/efota)
- The Shipbuilder’s Guild assignment for the Guildhall Special Facility for [Bastions](/allowed-content/#bastions) can only be used to construct this air vehicle if your Bastion is in Khorvaire or another region in Eberron with dragonmarked houses present and you have 25+ Renown Score with House Lyrandar.
- Besides the Helm, the listed crew stations can be exchanged for either shipboard Siege Weapons or other crew stations as Vehicle Upgrades' WHERE check_id = 'EQP_0396';
UPDATE public.ac_equipment SET notes_advice = '- Can only be purchased in Khorvaire or another region in Eberron with dragonmarked houses present.
- A creature without the Mark of the Storm can''t operate this vehicle''s helm except as described in chapter 7 of [Eberron: Forge of the Artificer](https://www.dndbeyond.com/sources/dnd/efota)
- The Shipbuilder’s Guild assignment for the Guildhall Special Facility for [Bastions](/allowed-content/#bastions) can only be used to construct this air vehicle if your Bastion is in Khorvaire or another region in Eberron with dragonmarked houses present and you have 25+ Renown Score with House Lyrandar.
- Besides the Helm, the listed crew stations can be exchanged for either shipboard Siege Weapons or other crew stations as Vehicle Upgrades' WHERE check_id = 'EQP_0397';
UPDATE public.ac_equipment SET notes_advice = '- Can only be purchased in Khorvaire or another region in Eberron with dragonmarked houses present.
- A creature without the Mark of the Storm can''t operate this vehicle''s helm except as described in chapter 7 of [Eberron: Forge of the Artificer](https://www.dndbeyond.com/sources/dnd/efota)
- The Shipbuilder’s Guild assignment for the Guildhall Special Facility for [Bastions](/allowed-content/#bastions) can only be used to construct this air vehicle if your Bastion is in Khorvaire or another region in Eberron with dragonmarked houses present and you have 25+ Renown Score with House Lyrandar.
- Besides the Helm, the listed crew stations can be exchanged for either shipboard Siege Weapons or other crew stations as Vehicle Upgrades' WHERE check_id = 'EQP_0398';
UPDATE public.ac_equipment SET notes_advice = '- The creator of this homebrew item is salah_ad_din
- This vehicle can''t be used to travel in [downtime](/allowed-content/#downtime) except as overseen by a DM
- Superior Ship Upgrades can''t be installed onto a Hot Air Balloon
- Can''t be turned into a mobile [Bastion](/allowed-content/#bastions)' WHERE check_id = 'EQP_0399';
UPDATE public.ac_equipment SET notes_advice = 'Can''t be turned into a mobile [Bastion](/allowed-content/#bastions)' WHERE check_id = 'EQP_0403';
UPDATE public.ac_equipment SET notes_advice = '- Can only be purchased in Hawthorne and other port cities
- Can''t be turned into a mobile [Bastion](/allowed-content/#bastions)' WHERE check_id = 'EQP_0409';
UPDATE public.ac_equipment SET notes_advice = '- Can only be purchased in the Rock of Bral or other major settlements in Wildspace or the Astral Sea
- Ballistas, ballista bolts, and mangonels are not included in the cost and must be separately purchased. Each can also be replaced with other shipboard siege weapons via purchasing.
- Can''t land on ground or water
- Planar travel using a nautiloid follows the existing rules for traveling to a location beyond Faerun in [downtime](/allowed-content/#downtime). Otherwise, it can only occur during an adventure or as otherwise overseen by a DM.' WHERE check_id = 'EQP_0416';
UPDATE public.ac_equipment SET description = 'Pet. See [Hawthorne Field Guide](/monsters/) for further info.' WHERE check_id = 'EQP_0453';
UPDATE public.ac_equipment SET description = 'Pet. See [Hawthorne Arcana](https://drive.google.com/file/d/1yoinFa31Rhq__unHxMxCSfMq7QY5ARYC/view) for further info.' WHERE check_id = 'EQP_0459';
UPDATE public.ac_equipment SET notes_advice = '- Tuning forks to other planes of existence can only be purchased or crafted as part of an adventure
- Crafting a tuning fork for another plane of existence requires 1) Researching the correct combination of material and frequency for that plane of existence as determined by the DM 2) Crafting the tuning fork as determined by the DM 3) Traveling to the associated plane of existence and attuning the fork there using associated materials from the plane and casting Plane Shift over the course of 1 hour or more as determined by the DM
- DMs can review ["Plane Speaking" in Dragon 120](https://archive.org/details/DragonMagazine260_201801/DragonMagazine120/page/n43/mode/2up) for a suggested list of materials and frequencies' WHERE check_id = 'EQP_0487';
UPDATE public.ac_equipment SET notes_advice = '- Can only be acquired from an adventure or crafted
- Can only be crafted by a level 11+ PC able to cast Demiplane, with the crafted cube linking to a demiplane they have created or the Demiplane Special Facility of a [Bastion](/allowed-content/#bastions) they own
- This is an adaptation of the Horizon Puzzle Cube from Bigby Presents: Glory of the Giants.' WHERE check_id = 'EQP_0494';

COMMIT;
