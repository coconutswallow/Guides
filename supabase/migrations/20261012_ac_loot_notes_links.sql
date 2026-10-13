-- Migration: 20261012_ac_loot_notes_links.sql
-- Description: Populate public.ac_loot notes_advice from spreadsheet Column J
--              and convert all internal tab links and external event links to markdown format.
-- Scope: 718 items with notes_advice, including 193 items with embedded links.

BEGIN;
UPDATE public.ac_loot SET notes_advice = 'This is treated as magic ammunition' WHERE check_id = 'LOT_0002';
UPDATE public.ac_loot SET notes_advice = 'Use 2014 version in 2014 games and 2024 version in 2024 games' WHERE check_id = 'LOT_0006';
UPDATE public.ac_loot SET notes_advice = 'DMs can only drop this as part of an adventure in Chult or related to it.' WHERE check_id = 'LOT_0010';
UPDATE public.ac_loot SET notes_advice = 'This item is nonmagical.' WHERE check_id = 'LOT_0011';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is _badwolf_
- A DM can predetermine only 1 Festival Lantern per item slot' WHERE check_id = 'LOT_0013';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is ouryth' WHERE check_id = 'LOT_0015';
UPDATE public.ac_loot SET notes_advice = '- DMs can predetermine up to 7 duplicates per item slot.
- DMs can only drop this as part of an adventure in Chult or related to it.' WHERE check_id = 'LOT_0020';
UPDATE public.ac_loot SET notes_advice = 'A DM can only predetermine 1 Mythallar Bracelet per item slot' WHERE check_id = 'LOT_0023';
UPDATE public.ac_loot SET notes_advice = 'Use the XGE version in 2014 games and the DMG2024 version in 2024 games respectively' WHERE check_id = 'LOT_0025';
UPDATE public.ac_loot SET notes_advice = 'After the item is used on an adventure or in downtime (no DTP required), in character days that pass for an adventure''s duration counts towards the time after which the shrub transforms as determined by the DM. Each real life day that passes while the character is not adventuring as part of a multisession or campaign also counts towards this time.' WHERE check_id = 'LOT_0026';
UPDATE public.ac_loot SET notes_advice = 'The 2014 version is used: allows you to cast Animal Friendship at will for 1 hour' WHERE check_id = 'LOT_0027';
UPDATE public.ac_loot SET notes_advice = '- The item can correctly identified as part of a Short Rest.
- Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0028';
UPDATE public.ac_loot SET notes_advice = 'The effect lasts for 8 hours.' WHERE check_id = 'LOT_0031';
UPDATE public.ac_loot SET notes_advice = 'DMs can only drop this as part of an adventure in Chult or related to it.' WHERE check_id = 'LOT_0032';
UPDATE public.ac_loot SET notes_advice = '- This is treated as magic ammunition
- When you score a Critical Hit with it against a creature that is shape-shifted, this ammunition deals one additional die of damage.' WHERE check_id = 'LOT_0033';
UPDATE public.ac_loot SET notes_advice = 'DMs can predetermine up to 10 duplicates per item slot.' WHERE check_id = 'LOT_0034';
UPDATE public.ac_loot SET notes_advice = '- Ignore the tattoo coverage table
- The maximum number of spellwrought tattoos you can have on you at a time is equal to your proficiency bonus
- A spellwrought tattoo is not used up if its casting is interrupted' WHERE check_id = 'LOT_0037';
UPDATE public.ac_loot SET notes_advice = '- Ignore the tattoo coverage table
- The maximum number of spellwrought tattoos you can have on you at a time is equal to your proficiency bonus
- A spellwrought tattoo is not used up if its casting is interrupted' WHERE check_id = 'LOT_0038';
UPDATE public.ac_loot SET notes_advice = 'DMs can only drop this as part of an adventure in Chult or related to it.' WHERE check_id = 'LOT_0042';
UPDATE public.ac_loot SET notes_advice = 'DMs can only drop this as part of an adventure in Chult or related to it.' WHERE check_id = 'LOT_0043';
UPDATE public.ac_loot SET notes_advice = 'DMs can only drop this as part of an adventure in Chult or related to it.' WHERE check_id = 'LOT_0044';
UPDATE public.ac_loot SET notes_advice = 'DMs can only drop this as part of an adventure in Chult or related to it.' WHERE check_id = 'LOT_0045';
UPDATE public.ac_loot SET notes_advice = 'This is treated as a magic weapon' WHERE check_id = 'LOT_0046';
UPDATE public.ac_loot SET notes_advice = 'Can also be purchased as Adventuring Gear for 250 GP in Allowed Content ([Equipment](/allowed-content/#equipment))' WHERE check_id = 'LOT_0047';
UPDATE public.ac_loot SET notes_advice = '- Attuning to this doesn''t count against the normal number of items you can attune to
- This item can also be attuned to by an Autognome or Gepettin
- Can also be used by a creature with an Arcane Propulsion Arm or Prosthetic Limb' WHERE check_id = 'LOT_0048';
UPDATE public.ac_loot SET notes_advice = 'The creator of this homebrew item is werewuff.' WHERE check_id = 'LOT_0051';
UPDATE public.ac_loot SET notes_advice = 'Does not require attunement.' WHERE check_id = 'LOT_0052';
UPDATE public.ac_loot SET notes_advice = 'The creator of this homebrew item is goosetipher.' WHERE check_id = 'LOT_0054';
UPDATE public.ac_loot SET notes_advice = 'The creator of this homebrew item is _badwolf_' WHERE check_id = 'LOT_0059';
UPDATE public.ac_loot SET notes_advice = 'Does not require attunement.' WHERE check_id = 'LOT_0062';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by naoe45
- This homebrew item can only ever be obtained as a Renown Perk (Renown Score 3) as part of the [Yamato Clan](/allowed-content/#other-rewards)' WHERE check_id = 'LOT_0067';
UPDATE public.ac_loot SET notes_advice = 'The creator of this homebrew item is nekohime89' WHERE check_id = 'LOT_0075';
UPDATE public.ac_loot SET notes_advice = '- When crafted, the DC is 20.
- The tool needed to craft this item is the tool needed to craft the associated container.' WHERE check_id = 'LOT_0077';
UPDATE public.ac_loot SET notes_advice = 'Does not require attunement.' WHERE check_id = 'LOT_0080';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by greensprout
- This item can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 3+ with the [Order of the Gauntlet](/allowed-content/#other-rewards). It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 1+ DMPC with a Renown Score of 3+ with the Order of the Gauntlet can choose to obtain this item in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as an item reward.' WHERE check_id = 'LOT_0084';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by greensprout
- This item can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 3+ with the [Emerald Enclave](/allowed-content/#other-rewards). It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 1+ DMPC with a Renown Score of 3+ with the Emerald Enclave can choose to obtain this item in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as an item reward.' WHERE check_id = 'LOT_0085';
UPDATE public.ac_loot SET notes_advice = 'A PC can start with this item at character creation as a substitute for a missing eye. An Ersatz Eye possessed at character creation in this way cannot be traded.' WHERE check_id = 'LOT_0087';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by salah_ad_din
- This homebrew item can only ever be obtained as a Renown Perk (Renown Score 3) as part of the specific [Crime Family](/allowed-content/#other-rewards)' WHERE check_id = 'LOT_0092';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by .decoymantis., mark.stac, and kwamsture
- This homebrew item can only ever be obtained as a Renown Perk (Renown Score 3) as part of [GEAR](/allowed-content/#other-rewards)' WHERE check_id = 'LOT_0095';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by empress5002 and salah_ad_din
- This homebrew item can only ever be obtained as a Renown Perk (Renown Score 3) as part of the [Court of Dunes](/allowed-content/#other-rewards)' WHERE check_id = 'LOT_0096';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by falconxyx
- This homebrew item can only ever be obtained as a Renown Perk (Renown Score 3) as part of the [Gilded Accord](/allowed-content/#other-rewards)' WHERE check_id = 'LOT_0097';
UPDATE public.ac_loot SET notes_advice = 'The creator of this homebrew item is _badwolf_' WHERE check_id = 'LOT_0098';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by myusernameisredacted
- This homebrew item can only ever be obtained as a Renown Perk (Renown Score 3) as part of [HALO](/allowed-content/#other-rewards)' WHERE check_id = 'LOT_0099';
UPDATE public.ac_loot SET notes_advice = 'This homebrew item was created by umm36' WHERE check_id = 'LOT_0100';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by greensprout
- This item can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 3+ with the [Harpers](/allowed-content/#other-rewards). It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 1+ DMPC with a Renown Score of 3+ with the Harpers can choose to obtain this item in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as an item reward.' WHERE check_id = 'LOT_0101';
UPDATE public.ac_loot SET notes_advice = 'Does not require attunement.' WHERE check_id = 'LOT_0104';
UPDATE public.ac_loot SET notes_advice = 'Each use of the horn uses 1 charge' WHERE check_id = 'LOT_0106';
UPDATE public.ac_loot SET notes_advice = 'Does not require attunement.' WHERE check_id = 'LOT_0108';
UPDATE public.ac_loot SET notes_advice = 'Does not require attunement.' WHERE check_id = 'LOT_0109';
UPDATE public.ac_loot SET notes_advice = 'Does not require attunement.' WHERE check_id = 'LOT_0110';
UPDATE public.ac_loot SET notes_advice = 'Avoids all attempts by other creatures to attack or snatch it' WHERE check_id = 'LOT_0111';
UPDATE public.ac_loot SET notes_advice = 'Avoids all attempts by other creatures to attack or snatch it' WHERE check_id = 'LOT_0112';
UPDATE public.ac_loot SET notes_advice = 'Avoids all attempts by other creatures to attack or snatch it' WHERE check_id = 'LOT_0113';
UPDATE public.ac_loot SET notes_advice = 'This is an adaptation of the Keycharm from Eberron: Rising from the Last War.' WHERE check_id = 'LOT_0114';
UPDATE public.ac_loot SET notes_advice = 'The creator of this homebrew item is _badwolf_.' WHERE check_id = 'LOT_0115';
UPDATE public.ac_loot SET notes_advice = '- The DM decides the lock''s DC when dropping the item, from 15 - 25.' WHERE check_id = 'LOT_0118';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by another_tiefling
- This homebrew item can only ever be obtained as a Renown Perk (Renown Score 3) as part of the [Prismatic Lotus](/allowed-content/#other-rewards)' WHERE check_id = 'LOT_0120';
UPDATE public.ac_loot SET notes_advice = 'Ignore the tattoo coverage table.' WHERE check_id = 'LOT_0124';
UPDATE public.ac_loot SET notes_advice = 'This homebrew item was created by bravehusky' WHERE check_id = 'LOT_0129';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by naoe45
- This homebrew item can only ever be obtained as a Renown Perk (Renown Score 3) as part of the [Yamato Clan](/allowed-content/#other-rewards)' WHERE check_id = 'LOT_0130';
UPDATE public.ac_loot SET notes_advice = '- Can be used as an Arcane Focus
- Can be used to determine magnetic north regardless of plane of existence (has no effect if in a location without a magnetic north)' WHERE check_id = 'LOT_0131';
UPDATE public.ac_loot SET notes_advice = 'Does not require attunement.' WHERE check_id = 'LOT_0133';
UPDATE public.ac_loot SET notes_advice = 'Can be used as an Arcane Focus' WHERE check_id = 'LOT_0134';
UPDATE public.ac_loot SET notes_advice = '- Does not require attunement.
- A PC can start with this item at character creation as a substitute for a missing limb. A Prosthetic Limb possessed at character creation in this way cannot be traded.
- Can also be purchased as Adventuring Gear for 0 GP in Allowed Content ([Equipment](/allowed-content/#equipment)) by a PC missing a limb or on behalf of a creature missing a limb' WHERE check_id = 'LOT_0142';
UPDATE public.ac_loot SET notes_advice = 'The die rolled is a d6.' WHERE check_id = 'LOT_0145';
UPDATE public.ac_loot SET notes_advice = 'This is an adaptation of the Scribe''s Pen from Eberron: Rising from the Last War.' WHERE check_id = 'LOT_0148';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by greensprout
- This item can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 3+ with the [Lords'' Alliance](/allowed-content/#other-rewards). It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 1+ DMPC with a Renown Score of 3+ with the Lords'' Alliance can choose to obtain this item in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as an item reward.' WHERE check_id = 'LOT_0151';
UPDATE public.ac_loot SET notes_advice = '- This is treated as a magic weapon
- When you score a Critical Hit with it against a creature that is shape-shifted, this weapon deals one additional die of damage.' WHERE check_id = 'LOT_0152';
UPDATE public.ac_loot SET notes_advice = 'The sounds can be heard out to 120 feet' WHERE check_id = 'LOT_0157';
UPDATE public.ac_loot SET notes_advice = 'By default, this is reflavored as an item not tied to Strixhaven when obtained outside of Strixhaven' WHERE check_id = 'LOT_0159';
UPDATE public.ac_loot SET notes_advice = 'Does not require attunement.' WHERE check_id = 'LOT_0161';
UPDATE public.ac_loot SET notes_advice = 'This homebrew item was created by temmiechaoslight' WHERE check_id = 'LOT_0164';
UPDATE public.ac_loot SET notes_advice = 'The 2024 version is used: the cane can be transformed into a nomagical sword or vice versa.' WHERE check_id = 'LOT_0167';
UPDATE public.ac_loot SET notes_advice = 'The music can be heard out to 120 feet' WHERE check_id = 'LOT_0169';
UPDATE public.ac_loot SET notes_advice = '- Attuning to this doesn''t count against the normal number of items you can attune to. An attached wand that requires its own attunement still does.
- This item can also be attuned to by an Autognome or Gepettin
- Can also be used by a creature with an Arcane Propulsion Arm or Prosthetic Limb' WHERE check_id = 'LOT_0172';
UPDATE public.ac_loot SET notes_advice = '- Outside of Exandria, this is reflavored as originating from Underdark fungi.                                
- By default, this is reflavored as not being a drug.' WHERE check_id = 'LOT_0177';
UPDATE public.ac_loot SET notes_advice = 'This homebrew item was created by _badwolf_' WHERE check_id = 'LOT_0178';
UPDATE public.ac_loot SET notes_advice = '- A DM can only predetermine 1 Chime of Opening per item slot.
- Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0180';
UPDATE public.ac_loot SET notes_advice = '- A DM can only predetermine 1 Deck of Illusions per item slot.
- Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0182';
UPDATE public.ac_loot SET notes_advice = 'A DM can only predetermine 1 Deck of Miscellany per item slot.' WHERE check_id = 'LOT_0183';
UPDATE public.ac_loot SET notes_advice = 'Only the most recently applied leech takes effect on a creature with multiple attached leeches.' WHERE check_id = 'LOT_0184';
UPDATE public.ac_loot SET notes_advice = 'Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0188';
UPDATE public.ac_loot SET notes_advice = '- The item can be correctly identified as part of a Short Rest.
- Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0191';
UPDATE public.ac_loot SET notes_advice = 'Use 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0192';
UPDATE public.ac_loot SET notes_advice = 'The creator of this homebrew item is another_tiefling' WHERE check_id = 'LOT_0194';
UPDATE public.ac_loot SET notes_advice = 'A DM can only predetermine 1 Gem of Brightness per item slot.' WHERE check_id = 'LOT_0195';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is greensprout.
- The Gift of Hizagkuur Story Outcome as a prerequisite needed to be able to craft this item.' WHERE check_id = 'LOT_0197';
UPDATE public.ac_loot SET notes_advice = 'The creator of this homebrew item is greensprout.' WHERE check_id = 'LOT_0199';
UPDATE public.ac_loot SET notes_advice = 'Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0200';
UPDATE public.ac_loot SET notes_advice = 'This is an adaptation of the Paper Bird from Waterdeep: Dragon Heist.' WHERE check_id = 'LOT_0204';
UPDATE public.ac_loot SET notes_advice = 'Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0215';
UPDATE public.ac_loot SET notes_advice = 'This homebrew item was created by _badwolf_' WHERE check_id = 'LOT_0216';
UPDATE public.ac_loot SET notes_advice = 'The effect lasts for 10 minutes (no Concentration required)' WHERE check_id = 'LOT_0217';
UPDATE public.ac_loot SET notes_advice = 'The effect lasts for 24 hours' WHERE check_id = 'LOT_0223';
UPDATE public.ac_loot SET notes_advice = 'The creator of this homebrew item is macthematical.
.' WHERE check_id = 'LOT_0224';
UPDATE public.ac_loot SET notes_advice = 'A DM can only predetermine 1 Robe of Serpents per item slot.' WHERE check_id = 'LOT_0229';
UPDATE public.ac_loot SET notes_advice = '- This is an adaptation of the Seeker Dart from Princes of the Apocalypse.
- A DM can only predetermine 1 Seeker Weapon per item slot.' WHERE check_id = 'LOT_0230';
UPDATE public.ac_loot SET notes_advice = 'The creator of this homebrew item is Krunk.' WHERE check_id = 'LOT_0231';
UPDATE public.ac_loot SET notes_advice = 'The creator of this homebrew item is baba8forever' WHERE check_id = 'LOT_0235';
UPDATE public.ac_loot SET notes_advice = '- DMs can predetermine up to 6 duplicates per item slot.
- By default, this is reflavored as not being tied to Theros when obtained outside of Theros' WHERE check_id = 'LOT_0236';
UPDATE public.ac_loot SET notes_advice = '- Outside of Exandria, this is reflavored as originating from crystalline deposits in mines of various mountains.      
- By default, this is reflavored as not being a drug.' WHERE check_id = 'LOT_0239';
UPDATE public.ac_loot SET notes_advice = 'Can be acquired as an upcast version of a lower level spell' WHERE check_id = 'LOT_0240';
UPDATE public.ac_loot SET notes_advice = 'Can be acquired as an upcast version of a lower level spell' WHERE check_id = 'LOT_0241';
UPDATE public.ac_loot SET notes_advice = '- Ignore the tattoo coverage table
- The maximum number of spellwrought tattoos you can have on you at a time is equal to your proficiency bonus
- A spellwrought tattoo is not used up if its casting is interrupted
- Can be acquired as an upcast version of a lower level spell' WHERE check_id = 'LOT_0242';
UPDATE public.ac_loot SET notes_advice = '- Ignore the tattoo coverage table
- The maximum number of spellwrought tattoos you can have on you at a time is equal to your proficiency bonus
- A spellwrought tattoo is not used up if its casting is interrupted
- Can be acquired as an upcast version of a lower level spell' WHERE check_id = 'LOT_0243';
UPDATE public.ac_loot SET notes_advice = '- In addition to the other listed liquids, it can also produce 1 quart of boiling hot tea or up to 1 gallon of soy sauce per day.
- Produces up to 4 ounces of Basic Poison per day
- You can use the jug during [downtime](/allowed-content/#downtime) to Work as if you had Expertise in Alchemist''s Supplies. You cannot otherwise use the jug in downtime.' WHERE check_id = 'LOT_0247';
UPDATE public.ac_loot SET notes_advice = 'Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0248';
UPDATE public.ac_loot SET notes_advice = 'The creator of this homebrew item is greensprout' WHERE check_id = 'LOT_0250';
UPDATE public.ac_loot SET notes_advice = 'This is an adaptation of the Bag of Bounty from [Wayfinder''s Guide to Eberron](https://marketplace.dndbeyond.com/category/SRC-00037).' WHERE check_id = 'LOT_0258';
UPDATE public.ac_loot SET notes_advice = 'The bag weighs 5 pounds' WHERE check_id = 'LOT_0259';
UPDATE public.ac_loot SET notes_advice = 'Ignore the tattoo coverage table.' WHERE check_id = 'LOT_0262';
UPDATE public.ac_loot SET notes_advice = 'The 2024 version is used: the boots grant Advantage on all Dexterity (Stealth) checks' WHERE check_id = 'LOT_0268';
UPDATE public.ac_loot SET notes_advice = 'Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0269';
UPDATE public.ac_loot SET notes_advice = 'The 2024 version is used: you gain the cloak''s benefit regardless of whether the hood is up or not.' WHERE check_id = 'LOT_0278';
UPDATE public.ac_loot SET notes_advice = 'Ignore the tattoo coverage table.' WHERE check_id = 'LOT_0281';
UPDATE public.ac_loot SET notes_advice = 'When used in 2024 games, if you are attuned to and are wielding both Cracker and Whacker, both weapons are treated as if they had the Light property.' WHERE check_id = 'LOT_0284';
UPDATE public.ac_loot SET notes_advice = 'When used in 2024 games, it is considered Adventuring Gear, not a weapon, and a Huge or larger creature does not automatically succeed the saving throw.' WHERE check_id = 'LOT_0292';
UPDATE public.ac_loot SET notes_advice = '- Outside of Eberron, no daelkyr receive any information.
- By default, this is reflavored as an item not tied to Eberron when obtained outside of Eberron.' WHERE check_id = 'LOT_0298';
UPDATE public.ac_loot SET notes_advice = 'Ignore the tattoo coverage table.' WHERE check_id = 'LOT_0299';
UPDATE public.ac_loot SET notes_advice = 'For spells reprinted in 2024 that have a different school of magic in 2014 compared to 2024, use the 2024 school of magic to determine an eligible spell for this item.' WHERE check_id = 'LOT_0300';
UPDATE public.ac_loot SET notes_advice = 'For spells reprinted in 2024 that have a different school of magic in 2014 compared to 2024, use the 2024 school of magic to determine an eligible spell for this item.' WHERE check_id = 'LOT_0301';
UPDATE public.ac_loot SET notes_advice = 'For spells reprinted in 2024 that have a different school of magic in 2014 compared to 2024, use the 2024 school of magic to determine an eligible spell for this item.' WHERE check_id = 'LOT_0302';
UPDATE public.ac_loot SET notes_advice = 'For spells reprinted in 2024 that have a different school of magic in 2014 compared to 2024, use the 2024 school of magic to determine an eligible spell for this item.' WHERE check_id = 'LOT_0303';
UPDATE public.ac_loot SET notes_advice = 'For spells reprinted in 2024 that have a different school of magic in 2014 compared to 2024, use the 2024 school of magic to determine an eligible spell for this item.' WHERE check_id = 'LOT_0304';
UPDATE public.ac_loot SET notes_advice = 'For spells reprinted in 2024 that have a different school of magic in 2014 compared to 2024, use the 2024 school of magic to determine an eligible spell for this item.' WHERE check_id = 'LOT_0305';
UPDATE public.ac_loot SET notes_advice = 'Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0307';
UPDATE public.ac_loot SET notes_advice = 'The 2024 version is used: the target doesn''t have to see you and the spell''s level can be increased by expending additional charges' WHERE check_id = 'LOT_0308';
UPDATE public.ac_loot SET notes_advice = 'The 2024 version is used: you have Darkvision out to a range of 1 foot and Advantage on any Intelligence (Investigation) check made to examine something within that range' WHERE check_id = 'LOT_0310';
UPDATE public.ac_loot SET notes_advice = 'After the item is used on an adventure, in character days that pass for the adventure''s duration counts towards the time after which the item can be used again as determined by the DM. Each real life day that passes while the character is not adventuring as part of a multisession or campaign also counts towards this time.' WHERE check_id = 'LOT_0312';
UPDATE public.ac_loot SET notes_advice = 'After the item is used on an adventure, in character days that pass for the adventure''s duration counts towards the time after which the item can be used again as determined by the DM. Each real life day that passes while the character is not adventuring as part of a multisession or campaign also counts towards this time.' WHERE check_id = 'LOT_0315';
UPDATE public.ac_loot SET notes_advice = 'The creator of this homebrew item is rexen.' WHERE check_id = 'LOT_0317';
UPDATE public.ac_loot SET notes_advice = 'The creator of this homebrew item is rexen.' WHERE check_id = 'LOT_0323';
UPDATE public.ac_loot SET notes_advice = 'Adapted from Curse of Strahd.' WHERE check_id = 'LOT_0331';
UPDATE public.ac_loot SET notes_advice = '- By default, this is reflavored as not being tied to Ravnica when obtained outside of Ravnica.
- Can be awarded once as an Agent Renown Perk to a member of a guild of Ravnica that has a Renown score of 5+ with that guild and following a group mission for that guild. This does not use the session''s item slots.' WHERE check_id = 'LOT_0333';
UPDATE public.ac_loot SET notes_advice = 'This is an adaptation of the Helm of the Gods from Mythic Odysseys of Theros.' WHERE check_id = 'LOT_0337';
UPDATE public.ac_loot SET notes_advice = 'Detect Thoughts (DC 13) can be cast at will from the helm and you have telepathy out to 30 feet' WHERE check_id = 'LOT_0338';
UPDATE public.ac_loot SET notes_advice = 'Each side pouch holds up to 200 pounds (not exceeding a volume of 25 cubic feet) and retrieving an item from the sack requires either an object interaction or a Bonus Action (your choice)' WHERE check_id = 'LOT_0341';
UPDATE public.ac_loot SET notes_advice = 'The yellow fish with black stripes (11-14 on the roll) disappears after 24 hours of being caught if not thrown by then.' WHERE check_id = 'LOT_0342';
UPDATE public.ac_loot SET notes_advice = 'After the item is used on an adventure, in character days that pass for the adventure''s duration counts towards the time after which the item can be used again as determined by the DM. Each real life day that passes while the character is not adventuring as part of a multisession or campaign also counts towards this time.' WHERE check_id = 'LOT_0346';
UPDATE public.ac_loot SET notes_advice = 'By default, this is reflavored as a horn not tied to Iggwilv.' WHERE check_id = 'LOT_0348';
UPDATE public.ac_loot SET notes_advice = 'Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0349';
UPDATE public.ac_loot SET notes_advice = 'This is an adaptation of the Inquisitive''s Goggles from Eberron: Rising from the Last War.' WHERE check_id = 'LOT_0350';
UPDATE public.ac_loot SET notes_advice = 'You can play the instrument while casting a spell that causes any of its targets to be charmed on a failed saving throw, thereby imposing disadvantage on the save. This effect applies only if the spell has a somatic or a material component.' WHERE check_id = 'LOT_0352';
UPDATE public.ac_loot SET notes_advice = 'You can play the instrument while casting a spell that causes any of its targets to be charmed on a failed saving throw, thereby imposing disadvantage on the save. This effect applies only if the spell has a somatic or a material component.' WHERE check_id = 'LOT_0353';
UPDATE public.ac_loot SET notes_advice = 'You can play the instrument while casting a spell that causes any of its targets to be charmed on a failed saving throw, thereby imposing disadvantage on the save. This effect applies only if the spell has a somatic or a material component.' WHERE check_id = 'LOT_0354';
UPDATE public.ac_loot SET notes_advice = 'Avoids all attempts by other creatures to attack or snatch it' WHERE check_id = 'LOT_0355';
UPDATE public.ac_loot SET notes_advice = '- Use the 2014 version in 2014 games and the 2024 version in 2024 games
- Avoids all attempts by other creatures to attack or snatch it' WHERE check_id = 'LOT_0356';
UPDATE public.ac_loot SET notes_advice = 'Avoids all attempts by other creatures to attack or snatch it' WHERE check_id = 'LOT_0357';
UPDATE public.ac_loot SET notes_advice = 'Avoids all attempts by other creatures to attack or snatch it' WHERE check_id = 'LOT_0358';
UPDATE public.ac_loot SET notes_advice = 'Avoids all attempts by other creatures to attack or snatch it' WHERE check_id = 'LOT_0359';
UPDATE public.ac_loot SET notes_advice = 'Avoids all attempts by other creatures to attack or snatch it' WHERE check_id = 'LOT_0360';
UPDATE public.ac_loot SET notes_advice = 'Avoids all attempts by other creatures to attack or snatch it' WHERE check_id = 'LOT_0361';
UPDATE public.ac_loot SET notes_advice = 'Avoids all attempts by other creatures to attack or snatch it' WHERE check_id = 'LOT_0362';
UPDATE public.ac_loot SET notes_advice = 'Avoids all attempts by other creatures to attack or snatch it' WHERE check_id = 'LOT_0363';
UPDATE public.ac_loot SET notes_advice = 'Avoids all attempts by other creatures to attack or snatch it' WHERE check_id = 'LOT_0364';
UPDATE public.ac_loot SET notes_advice = 'Avoids all attempts by other creatures to attack or snatch it' WHERE check_id = 'LOT_0365';
UPDATE public.ac_loot SET notes_advice = 'Avoids all attempts by other creatures to attack or snatch it' WHERE check_id = 'LOT_0366';
UPDATE public.ac_loot SET notes_advice = 'Avoids all attempts by other creatures to attack or snatch it' WHERE check_id = 'LOT_0367';
UPDATE public.ac_loot SET notes_advice = '- Use the 2014 version in 2014 games and the 2024 version in 2024 games
- After the javelin''s property is used, it reappears in your hand' WHERE check_id = 'LOT_0368';
UPDATE public.ac_loot SET notes_advice = 'The creator of this homebrew item is greensprout' WHERE check_id = 'LOT_0369';
UPDATE public.ac_loot SET notes_advice = 'The creator of this homebrew item is greensprout' WHERE check_id = 'LOT_0370';
UPDATE public.ac_loot SET notes_advice = 'Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0373';
UPDATE public.ac_loot SET notes_advice = 'The axe form is a Greataxe' WHERE check_id = 'LOT_0374';
UPDATE public.ac_loot SET notes_advice = 'Can also be purchased as Adventuring Gear for 400 GP in Allowed Content ([Equipment](/allowed-content/#equipment))' WHERE check_id = 'LOT_0375';
UPDATE public.ac_loot SET notes_advice = 'The 2024 version is used: the mdedallion has 5 charges and regains 1d4 expended charges daily at dawn' WHERE check_id = 'LOT_0376';
UPDATE public.ac_loot SET notes_advice = 'The creator of this homebrew item is greensprout' WHERE check_id = 'LOT_0379';
UPDATE public.ac_loot SET notes_advice = 'You can also Hide as a Bonus Action in an area that''s Heavily Obscured.' WHERE check_id = 'LOT_0381';
UPDATE public.ac_loot SET notes_advice = 'You have Advantage on saving throws made to avoid or end the Poisoned condition as well as against harmful gases and vapors' WHERE check_id = 'LOT_0382';
UPDATE public.ac_loot SET notes_advice = 'The creator of this homebrew item is Krunk.' WHERE check_id = 'LOT_0385';
UPDATE public.ac_loot SET notes_advice = '- This weapon is nonmagical and is considered to be a Heavy Crossbow for purposes of game features and effects.
- This weapon can''t be selected as a type of weapon for other weapons (e.g. +1 Weapon)
- Has Push weapon mastery in 2024 games. Having weapon mastery with Heavy Crossbow also grants access to this weapon''s mastery property. 
- As per the written rules, a character by default uses their Dexterity modifier for the attack roll and also adds it to the damage roll made with this weapon.
- The creator of this homebrew item is greensprout.' WHERE check_id = 'LOT_0387';
UPDATE public.ac_loot SET notes_advice = '- This weapon is nonmagical and is considered to be a Longbow for purposes of game features and effects.
- This weapon can''t be selected as a type of weapon for other weapons (e.g. +1 Weapon)
- Has Slow weapon mastery in 2024 games. Having weapon mastery with Longbows also grants access to this weapon''s mastery property. 
- As per the written rules, a character by default uses their Dexterity modifier for the attack roll and also adds it to the damage roll made with this weapon.
- Normal arrows are used as ammunition with this weapon.' WHERE check_id = 'LOT_0388';
UPDATE public.ac_loot SET notes_advice = '- The 2014 version is used: it can be used to regain a level 4+ spell slot, but the new spell slot is level 3
- If used to regain an expended level 4+ Pact Magic spell slot, the regained spell slot is level 3. This level 3 Pact Magic spell slot is not retained through a rest.' WHERE check_id = 'LOT_0390';
UPDATE public.ac_loot SET notes_advice = 'The 2014 version is used: if you start your turn dying while wearing this item, you stabilize.' WHERE check_id = 'LOT_0393';
UPDATE public.ac_loot SET notes_advice = 'Does not require proficiency in wind instruments' WHERE check_id = 'LOT_0396';
UPDATE public.ac_loot SET notes_advice = '- A character with Proficiency in Jeweler''s Tools can combine up to 4 individual prayer beads (including duplicates) into a single Necklace of Prayer Beads (requiring only one attunement slot) by expending 1 DTP per bead. Beads can be removed in the same way for 1 DTP per bead removed.' WHERE check_id = 'LOT_0398';
UPDATE public.ac_loot SET notes_advice = '- A character with Proficiency in Jeweler''s Tools can combine up to 4 individual prayer beads (including duplicates) into a single Necklace of Prayer Beads (requiring only one attunement slot) by expending 1 DTP per bead. Beads can be removed in the same way for 1 DTP per bead removed.
- For the Prayer Bead, Curing, Lesser Restoration can also be cast out of it instead of Cure Wounds (Level 2)' WHERE check_id = 'LOT_0399';
UPDATE public.ac_loot SET notes_advice = '- A character with Proficiency in Jeweler''s Tools can combine up to 4 individual prayer beads (including duplicates) into a single Necklace of Prayer Beads (requiring only one attunement slot) by expending 1 DTP per bead. Beads can be removed in the same way for 1 DTP per bead removed.' WHERE check_id = 'LOT_0400';
UPDATE public.ac_loot SET notes_advice = 'By default, this is reflavored as not being tied to Ravnica when obtained outside of Ravnica.' WHERE check_id = 'LOT_0402';
UPDATE public.ac_loot SET notes_advice = 'This weapon regains 1d3 expended charges daily at dawn.' WHERE check_id = 'LOT_0404';
UPDATE public.ac_loot SET notes_advice = '- This weapon is nonmagical.
- This weapon can''t be selected as a type of weapon for other weapons (e.g. +1 Weapon)
- This is an adaptation of the Light Repeating Crossbow from Out of the Abyss.' WHERE check_id = 'LOT_0405';
UPDATE public.ac_loot SET notes_advice = 'This weapon replaces all existing instances of the previous legacy item +1 Weapon of Recall (HB)' WHERE check_id = 'LOT_0407';
UPDATE public.ac_loot SET notes_advice = 'By default, this is reflavored as not tied to Henwin when obtained outside of Everden.' WHERE check_id = 'LOT_0415';
UPDATE public.ac_loot SET notes_advice = '- This is an adaptation of the Rings of Shared Suffering from [Wayfinder''s Guide to Eberron](https://marketplace.dndbeyond.com/category/SRC-00037).
- Both you and the linked creature must be in the same adventure to receive the ring''s effects' WHERE check_id = 'LOT_0418';
UPDATE public.ac_loot SET notes_advice = 'Does not require attunement.' WHERE check_id = 'LOT_0423';
UPDATE public.ac_loot SET notes_advice = 'A 2024 character using this ring cannot prepare or cast Find Greater Steed.' WHERE check_id = 'LOT_0432';
UPDATE public.ac_loot SET notes_advice = 'By default, this is reflavored as not being tied to Ravnica when obtained outside of Ravnica.' WHERE check_id = 'LOT_0435';
UPDATE public.ac_loot SET notes_advice = 'By default, this is reflavored as not being tied to Ravnica when obtained outside of Ravnica.' WHERE check_id = 'LOT_0439';
UPDATE public.ac_loot SET notes_advice = '- Attacking with the staff head is a melee weapon attack.
- Has no class restrictions for attunement' WHERE check_id = 'LOT_0442';
UPDATE public.ac_loot SET notes_advice = '- Use the 2014 version in 2014 games and the 2024 version in 2024 games
- Has no class restrictions for attunement' WHERE check_id = 'LOT_0446';
UPDATE public.ac_loot SET notes_advice = 'By default, this is reflavored as a tome not tied to Strixhaven University when obtained outside of Strixhaven.' WHERE check_id = 'LOT_0448';
UPDATE public.ac_loot SET notes_advice = 'The creator of this homebrew item is greensprout.' WHERE check_id = 'LOT_0454';
UPDATE public.ac_loot SET notes_advice = 'On a 20 on the d20 for an attack roll, the weapon deals an extra 2d6 damage as opposed to a flat amount of damage (for a total of 4d6 damage on a critical hit)' WHERE check_id = 'LOT_0456';
UPDATE public.ac_loot SET notes_advice = 'You have Advantage on saving throws made to avoid or end the Poisoned condition as well as against harmful gases and vapors' WHERE check_id = 'LOT_0457';
UPDATE public.ac_loot SET notes_advice = 'Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0462';
UPDATE public.ac_loot SET notes_advice = 'This is an adaptation of the Ruidium Weapon from Critical Role: Call of the Netherdeep.' WHERE check_id = 'LOT_0469';
UPDATE public.ac_loot SET notes_advice = '- In 2014 games, on a 20 on the d20 for an attack roll, the weapon deals an extra 3d6 damage as opposed to a flat amount of damage (for a total of 6d6 damage on a critical hit)
- In 2024 games, on a 20 on the d20 for an attack roll, the weapon deals an extra 6d4 damage as opposed to a flat amount of damage (for a total of 12d4 damage on a critical hit)' WHERE check_id = 'LOT_0471';
UPDATE public.ac_loot SET notes_advice = 'On a 20 on the d20 for an attack roll, the weapon deals an extra 4d6 damage as opposed to a flat amount of damage (for a total of 8d6 damage on a critical hit)' WHERE check_id = 'LOT_0475';
UPDATE public.ac_loot SET notes_advice = 'The creator of this homebrew item is rexen.' WHERE check_id = 'LOT_0478';
UPDATE public.ac_loot SET notes_advice = '- Known as +1 Wraps of Unarmed Power in the 2024 Dungeon Master''s Guide
- You can choose to deal either Force damage or your normal damage type with unarmed strikes, and your Unarmed Strikes are considered magical for purpose of overcoming resistance and immunity to nonmagical attacks
- These wraps are considered to be and must be worn as gloves or gauntlets to benefit from them. As such, they cannot be worn with another set of gloves or gauntlets nor can you benefit from another set of gloves or gauntlets (such as Gauntlets of the Dragon) while wearing these wraps' WHERE check_id = 'LOT_0483';
UPDATE public.ac_loot SET notes_advice = '- A DM can only predetermine 1 Arcane Battery per item slot.' WHERE check_id = 'LOT_0485';
UPDATE public.ac_loot SET notes_advice = '- Can be any kind of ammunition.
- Known as Ammunition of Slaying in the 2024 Dungeon Master''s Guide
- Use the 2014 version in 2014 games and the 2024 version in 2024 games
- DMs can only predetermine up to 3 duplicates per item slot.' WHERE check_id = 'LOT_0486';
UPDATE public.ac_loot SET notes_advice = '- The bag can only be used during an adventure, not downtime.
- A character can only benefit from an increase to their lowest ability score from the bag once. If the character reworks without reworking into a new character, the increase is applied to whatever the lowest ability score is after the rework. This benefit is not retained through a checkpoint rework into a different character.' WHERE check_id = 'LOT_0487';
UPDATE public.ac_loot SET notes_advice = '- Outside of Exandria, this is reflavored as originating from a Black Pudding.
- By default, this is reflavored as not being a drug.' WHERE check_id = 'LOT_0489';
UPDATE public.ac_loot SET notes_advice = 'By default, this is reflavored as not being a drug.' WHERE check_id = 'LOT_0493';
UPDATE public.ac_loot SET notes_advice = '- A DM can only predetermine 1 Elemental Gem per item slot.
- Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0494';
UPDATE public.ac_loot SET notes_advice = '- A DM can only predetermine 1 Ioun Stone of Absorption per item slot.
- Avoids all attempts by other creatures to attack or snatch it' WHERE check_id = 'LOT_0495';
UPDATE public.ac_loot SET notes_advice = '- A DM can only predetermine 1 Manual of Flesh Golems per item slot
- Using the manual to create the associated golem requires the listed cost in gold and an amount of DTP equal to the number of days required' WHERE check_id = 'LOT_0496';
UPDATE public.ac_loot SET notes_advice = 'This can''t be used during downtime, only during an adventure.' WHERE check_id = 'LOT_0499';
UPDATE public.ac_loot SET notes_advice = 'The creator of this homebrew item is greensprout' WHERE check_id = 'LOT_0501';
UPDATE public.ac_loot SET notes_advice = 'A DM can only predetermine 1 bag of Portable Cannonballs per item slot' WHERE check_id = 'LOT_0503';
UPDATE public.ac_loot SET notes_advice = 'The effect doesn''t require Concentration.' WHERE check_id = 'LOT_0505';
UPDATE public.ac_loot SET notes_advice = 'Your age can''t be reduced below the age of a young adult for your species (16 years for humans)' WHERE check_id = 'LOT_0511';
UPDATE public.ac_loot SET notes_advice = 'This potion removes any disease or poison affecting you.' WHERE check_id = 'LOT_0519';
UPDATE public.ac_loot SET notes_advice = '- A DM can only predetermine 1 Purple Worm Poison per item slot.
- Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0520';
UPDATE public.ac_loot SET notes_advice = 'A DM can only predetermine 1 Reincarnation Dust per item slot.' WHERE check_id = 'LOT_0523';
UPDATE public.ac_loot SET notes_advice = '- A DM can only predetermine 1 Ring of Temporal Salvation per item slot.
- The ring''s effect prevents you from dying in the first place.' WHERE check_id = 'LOT_0524';
UPDATE public.ac_loot SET notes_advice = '- A DM can predetermine only 1 Robe of Useful Items per item slot.
- Roll for the number of and contents of the other patches in the #treasure-log' WHERE check_id = 'LOT_0525';
UPDATE public.ac_loot SET notes_advice = '- Can protect against any creature type
- Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0526';
UPDATE public.ac_loot SET notes_advice = 'The creator of this homebrew item is .missile' WHERE check_id = 'LOT_0528';
UPDATE public.ac_loot SET notes_advice = 'The creator of this homebrew item is willbrashear' WHERE check_id = 'LOT_0529';
UPDATE public.ac_loot SET notes_advice = 'Can be acquired as an upcast version of a lower level spell' WHERE check_id = 'LOT_0531';
UPDATE public.ac_loot SET notes_advice = 'Can be acquired as an upcast version of a lower level spell' WHERE check_id = 'LOT_0532';
UPDATE public.ac_loot SET notes_advice = '- Ignore the tattoo coverage table
- The maximum number of spellwrought tattoos you can have on you at a time is equal to your proficiency bonus
- A spellwrought tattoo is not used up if its casting is interrupted
- Can be acquired as an upcast version of a lower level spell' WHERE check_id = 'LOT_0533';
UPDATE public.ac_loot SET notes_advice = '- Ignore the tattoo coverage table
- The maximum number of spellwrought tattoos you can have on you at a time is equal to your proficiency bonus
- A spellwrought tattoo is not used up if its casting is interrupted
- Can be acquired as an upcast version of a lower level spell' WHERE check_id = 'LOT_0534';
UPDATE public.ac_loot SET notes_advice = 'By default, this is reflavored as a poison not tied to Thessalar.' WHERE check_id = 'LOT_0537';
UPDATE public.ac_loot SET notes_advice = 'The creator of this homebrew item is .missile' WHERE check_id = 'LOT_0538';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is umm36
- DMs can only predetermine up to 3 duplicates per item slot.' WHERE check_id = 'LOT_0539';
UPDATE public.ac_loot SET notes_advice = 'The creator of this homebrew item is arles.' WHERE check_id = 'LOT_0540';
UPDATE public.ac_loot SET notes_advice = 'Ignore the tattoo coverage table.' WHERE check_id = 'LOT_0544';
UPDATE public.ac_loot SET notes_advice = 'Only your cleric and paladin spells get the bonus to spell save DC and spell attack rolls.' WHERE check_id = 'LOT_0547';
UPDATE public.ac_loot SET notes_advice = 'This is an adaptation of Ruidium Armor from Critical Role: Call of the Netherdeep.' WHERE check_id = 'LOT_0553';
UPDATE public.ac_loot SET notes_advice = 'Find the Path in this spellbook can''t be copied into another spellbook.' WHERE check_id = 'LOT_0557';
UPDATE public.ac_loot SET notes_advice = 'Word of Recall in this spellbook can''t be copied into another spellbook.' WHERE check_id = 'LOT_0558';
UPDATE public.ac_loot SET notes_advice = 'By default, this is reflavored as not tied to Hanera when obtained outside of Everden.' WHERE check_id = 'LOT_0560';
UPDATE public.ac_loot SET notes_advice = 'Ignore the tattoo coverage table.' WHERE check_id = 'LOT_0562';
UPDATE public.ac_loot SET notes_advice = 'While attuned to and wearing this belt, you are considered a Dwarf in addition to your true species for purposes of attuning to magic items with a racial restriction.' WHERE check_id = 'LOT_0565';
UPDATE public.ac_loot SET notes_advice = 'While attuned to and wearing this belt, you are considered an Elf in addition to your true species for purposes of attuning to magic items with a racial restriction.' WHERE check_id = 'LOT_0566';
UPDATE public.ac_loot SET notes_advice = 'While attuned to and wearing this belt, you are considered a Firbolg in addition to your true species for purposes of attuning to magic items with a racial restriction.' WHERE check_id = 'LOT_0567';
UPDATE public.ac_loot SET notes_advice = 'By default, this is reflavored as not being tied to Exandria when obtained outside of Exandria.' WHERE check_id = 'LOT_0570';
UPDATE public.ac_loot SET notes_advice = 'The creators of this homebrew item are blopisig2 and 149thomas.' WHERE check_id = 'LOT_0573';
UPDATE public.ac_loot SET notes_advice = 'Protects against extreme cold from 0 degrees Fahrenheit or lower' WHERE check_id = 'LOT_0576';
UPDATE public.ac_loot SET notes_advice = 'Grants proficiency with any ranged weapon and +2 to damage rolls for ranged attacks with such weapons' WHERE check_id = 'LOT_0577';
UPDATE public.ac_loot SET notes_advice = 'Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0591';
UPDATE public.ac_loot SET notes_advice = 'The creator of this homebrew item is greensprout.' WHERE check_id = 'LOT_0595';
UPDATE public.ac_loot SET notes_advice = 'Can only be used during an adventure or as supervised by a DM, not during downtime.' WHERE check_id = 'LOT_0606';
UPDATE public.ac_loot SET notes_advice = 'The creator of this homebrew item is 149thomas' WHERE check_id = 'LOT_0607';
UPDATE public.ac_loot SET notes_advice = 'The creator of this homebrew item is deaconsdaze.
.' WHERE check_id = 'LOT_0617';
UPDATE public.ac_loot SET notes_advice = '- Can also be derived from gem dragons of the corresponding types and damage resistances: Amethyst (Force), Crystal (Radiant), Emerald (Psychic), Sapphire (Thunder), or Topaz (Necrotic)
- You have Advantage on saving throws against the Frightful Presence of dragons' WHERE check_id = 'LOT_0618';
UPDATE public.ac_loot SET notes_advice = '- Can be acquired as containing upcast versions of lower level spells
- For spells reprinted in 2024 that have a different school of magic in 2014 compared to 2024, use the 2024 school of magic to determine an eligible spell for this item.' WHERE check_id = 'LOT_0626';
UPDATE public.ac_loot SET notes_advice = '- Can be acquired as containing upcast versions of lower level spells
- For spells reprinted in 2024 that have a different school of magic in 2014 compared to 2024, use the 2024 school of magic to determine an eligible spell for this item.' WHERE check_id = 'LOT_0627';
UPDATE public.ac_loot SET notes_advice = '- Can be acquired as containing upcast versions of lower level spells
- For spells reprinted in 2024 that have a different school of magic in 2014 compared to 2024, use the 2024 school of magic to determine an eligible spell for this item.' WHERE check_id = 'LOT_0628';
UPDATE public.ac_loot SET notes_advice = '- Can be acquired as containing upcast versions of lower level spells
- For spells reprinted in 2024 that have a different school of magic in 2014 compared to 2024, use the 2024 school of magic to determine an eligible spell for this item.' WHERE check_id = 'LOT_0629';
UPDATE public.ac_loot SET notes_advice = '- Can be acquired as containing upcast versions of lower level spells
- For spells reprinted in 2024 that have a different school of magic in 2014 compared to 2024, use the 2024 school of magic to determine an eligible spell for this item.' WHERE check_id = 'LOT_0630';
UPDATE public.ac_loot SET notes_advice = '- Can be acquired as containing upcast versions of lower level spells
- For spells reprinted in 2024 that have a different school of magic in 2014 compared to 2024, use the 2024 school of magic to determine an eligible spell for this item.' WHERE check_id = 'LOT_0631';
UPDATE public.ac_loot SET notes_advice = 'By default, this is reflavored as not tied to Kren when obtained outside of Everden.' WHERE check_id = 'LOT_0634';
UPDATE public.ac_loot SET notes_advice = 'Only your cleric and paladin spells get the bonus to spell save DC and spell attack rolls.' WHERE check_id = 'LOT_0636';
UPDATE public.ac_loot SET notes_advice = 'After the item is used on an adventure, in character days that pass for the adventure''s duration counts towards the time after which the item can be used again as determined by the DM. Each real life day that passes while the character is not adventuring as part of a multisession or campaign also counts towards this time.' WHERE check_id = 'LOT_0639';
UPDATE public.ac_loot SET notes_advice = '- After the item is used on an adventure, in character days that pass for the adventure''s duration counts towards the time after which the item can be used again as determined by the DM. Each real life day that passes while the character is not adventuring as part of a multisession or campaign also counts towards this time.
- Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0640';
UPDATE public.ac_loot SET notes_advice = '- After the item is used on an adventure, in character days that pass for the adventure''s duration counts towards the time after which the item can be used again as determined by the DM. Each real life day that passes while the character is not adventuring as part of a multisession or campaign also counts towards this time.
- Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0641';
UPDATE public.ac_loot SET notes_advice = '- After the item is used on an adventure, in character days that pass for the adventure''s duration counts towards the time after which the item can be used again as determined by the DM. Each real life day that passes while the character is not adventuring as part of a multisession or campaign also counts towards this time.
- Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0642';
UPDATE public.ac_loot SET notes_advice = '- After the item is used on an adventure, in character days that pass for the adventure''s duration counts towards the time after which the item can be used again as determined by the DM. Each real life day that passes while the character is not adventuring as part of a multisession or campaign also counts towards this time.
- Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0643';
UPDATE public.ac_loot SET notes_advice = '- After the item is used on an adventure, in character days that pass for the adventure''s duration counts towards the time after which the item can be used again as determined by the DM. Each real life day that passes while the character is not adventuring as part of a multisession or campaign also counts towards this time.
- Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0644';
UPDATE public.ac_loot SET notes_advice = '- After the item is used on an adventure, in character days that pass for the adventure''s duration counts towards the time after which the item can be used again as determined by the DM. Each real life day that passes while the character is not adventuring as part of a multisession or campaign also counts towards this time.
- Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0645';
UPDATE public.ac_loot SET notes_advice = 'By default, this reflavored as not tied to Gesme when obtained outside of Everden.' WHERE check_id = 'LOT_0646';
UPDATE public.ac_loot SET notes_advice = 'Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0649';
UPDATE public.ac_loot SET notes_advice = '- Ignore the tattoo coverage table.
- You are also shunted if you end your turn inside a creature.' WHERE check_id = 'LOT_0660';
UPDATE public.ac_loot SET notes_advice = 'This is an adaptation of Haemstrike from Heliana''s Guide to Monster Hunting.' WHERE check_id = 'LOT_0665';
UPDATE public.ac_loot SET notes_advice = 'The item produced out of the hat''s last effect is either T0, T1, or T2 (ignore rarity)' WHERE check_id = 'LOT_0666';
UPDATE public.ac_loot SET notes_advice = 'The side pouches hold up to 200 pounds (not exceeding a volume of 25 cubic feet), the central pouch holds up to 500 pounds (not exceeding 64 cubic feet), and retrieving an item from the sack requires either an object interaction or a Bonus Action (your choice)' WHERE check_id = 'LOT_0669';
UPDATE public.ac_loot SET notes_advice = 'The creator of this homebrew item is greensprout.' WHERE check_id = 'LOT_0670';
UPDATE public.ac_loot SET notes_advice = 'The creator of this homebrew item is greensprout.' WHERE check_id = 'LOT_0671';
UPDATE public.ac_loot SET notes_advice = '- After the item is used on an adventure, in character days that pass for the adventure''s duration counts towards the time after which the item can be used again as determined by the DM. Each real life day that passes while the character is not adventuring as part of a multisession or campaign also counts towards this time.
- This item summons 2d4+2 Berserkers, each of which is immune to the Charmed and Frightened conditions.' WHERE check_id = 'LOT_0672';
UPDATE public.ac_loot SET notes_advice = 'You can play the instrument while casting a spell that causes any of its targets to be charmed on a failed saving throw, thereby imposing disadvantage on the save. This effect applies only if the spell has a somatic or a material component.' WHERE check_id = 'LOT_0676';
UPDATE public.ac_loot SET notes_advice = 'You can play the instrument while casting a spell that causes any of its targets to be charmed on a failed saving throw, thereby imposing disadvantage on the save. This effect applies only if the spell has a somatic or a material component.' WHERE check_id = 'LOT_0677';
UPDATE public.ac_loot SET notes_advice = 'Avoids all attempts by other creatures to attack or snatch it' WHERE check_id = 'LOT_0679';
UPDATE public.ac_loot SET notes_advice = '- Avoids all attempts by other creatures to attack or snatch it
- The 2024 version is used: a level 1 to level 4 spell can be stored into it' WHERE check_id = 'LOT_0680';
UPDATE public.ac_loot SET notes_advice = 'Use the 2014 version in 2014 games and the 2024 version in 2024 games.' WHERE check_id = 'LOT_0681';
UPDATE public.ac_loot SET notes_advice = 'The disposition of intelligent undead creatures towards you is determined by the DM, even if you use the second property. For example, a lich or its minions might still be hostile to you even after you use the second property and haven''t damaged either.' WHERE check_id = 'LOT_0686';
UPDATE public.ac_loot SET notes_advice = 'Ignore the tattoo coverage table.' WHERE check_id = 'LOT_0687';
UPDATE public.ac_loot SET notes_advice = '- Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0689';
UPDATE public.ac_loot SET notes_advice = '- Does not possess the Soul Snare property outside of Exandria
- By default, this is reflavored as an item not tied to the Luxon when obtained outside of Exandria.' WHERE check_id = 'LOT_0691';
UPDATE public.ac_loot SET notes_advice = 'On a 20 on the d20 for an attack roll, the weapon deals an extra 2d6 damage as opposed to a flat amount of damage (for a total of 4d6 damage on a critical hit). If the target is a Construct, on a 20 on the d20 for an attack roll, the weapon instead deals an extra 4d6 damage as opposed to a flat amount of damage (for a total of 8d6 damage on a critical hit).' WHERE check_id = 'LOT_0694';
UPDATE public.ac_loot SET notes_advice = 'By default, this is reflavored as not being tied to Ravnica when obtained outside of Ravnica.' WHERE check_id = 'LOT_0701';
UPDATE public.ac_loot SET notes_advice = 'By default, this is reflavored as not being tied to Ravnica when obtained outside of Ravnica.' WHERE check_id = 'LOT_0702';
UPDATE public.ac_loot SET notes_advice = 'After the item is used on an adventure, in character days that pass for the adventure''s duration counts towards the time after which the item can be used again as determined by the DM. Each real life day that passes while the character is not adventuring as part of a multisession or campaign also counts towards this time.' WHERE check_id = 'LOT_0705';
UPDATE public.ac_loot SET notes_advice = 'When this weapon runs out of charges, it becomes a +2 Weapon and no longer requires attunement.' WHERE check_id = 'LOT_0707';
UPDATE public.ac_loot SET notes_advice = 'By default, this is reflavored as not being tied to Ravnica when obtained outside of Ravnica.' WHERE check_id = 'LOT_0713';
UPDATE public.ac_loot SET notes_advice = 'By default, this is reflavored as not tied to Reya when obtained outside of Everden.' WHERE check_id = 'LOT_0714';
UPDATE public.ac_loot SET notes_advice = 'The creator of this homebrew item is rexen.' WHERE check_id = 'LOT_0716';
UPDATE public.ac_loot SET notes_advice = 'The 2024 version is used: Does not require proficiency in wind instruments and only creatures of your choice are affected' WHERE check_id = 'LOT_0717';
UPDATE public.ac_loot SET notes_advice = 'Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0719';
UPDATE public.ac_loot SET notes_advice = 'A character with Proficiency in Jeweler''s Tools can combine up to 4 individual prayer beads (including duplicates) into a single Necklace of Prayer Beads (requiring only one attunement slot) by expending 1 DTP per bead. Beads can be removed in the same way for 1 DTP per bead removed.' WHERE check_id = 'LOT_0720';
UPDATE public.ac_loot SET notes_advice = 'A character with Proficiency in Jeweler''s Tools can combine up to 4 individual prayer beads (including duplicates) into a single Necklace of Prayer Beads (requiring only one attunement slot) by expending 1 DTP per bead. Beads can be removed in the same way for 1 DTP per bead removed.' WHERE check_id = 'LOT_0721';
UPDATE public.ac_loot SET notes_advice = 'After the item is used on an adventure, in character days that pass for the adventure''s duration counts towards the time after which the item can be used again as determined by the DM. Each real life day that passes while the character is not adventuring as part of a multisession or campaign also counts towards this time.' WHERE check_id = 'LOT_0722';
UPDATE public.ac_loot SET notes_advice = 'After the item is used on an adventure, in character days that pass for the adventure''s duration counts towards the time after which the item can be used again as determined by the DM. Each real life day that passes while the character is not adventuring as part of a multisession or campaign also counts towards this time.' WHERE check_id = 'LOT_0723';
UPDATE public.ac_loot SET notes_advice = 'After the item is used on an adventure, in character days that pass for the adventure''s duration counts towards the time after which the item can be used again as determined by the DM. Each real life day that passes while the character is not adventuring as part of a multisession or campaign also counts towards this time.' WHERE check_id = 'LOT_0724';
UPDATE public.ac_loot SET notes_advice = 'This weapon replaces all existing instances of the previous legacy item +2 Weapon of Recall (HB)' WHERE check_id = 'LOT_0729';
UPDATE public.ac_loot SET notes_advice = 'The 2024 version is used: there is no Intelligence requirement for Beasts with respect to the Fear spell cast from the ring' WHERE check_id = 'LOT_0732';
UPDATE public.ac_loot SET notes_advice = 'This is an adaptation of the Ring of Red Fury from Critical Role: Call of the Netherdeep.' WHERE check_id = 'LOT_0734';
UPDATE public.ac_loot SET notes_advice = 'The 2014 version is used: this item requires attunement' WHERE check_id = 'LOT_0739';
UPDATE public.ac_loot SET notes_advice = 'Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0745';
UPDATE public.ac_loot SET notes_advice = 'Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0747';
UPDATE public.ac_loot SET notes_advice = 'This is an adaptation of the Robe of Summer from Tales from the Yawning Portal' WHERE check_id = 'LOT_0748';
UPDATE public.ac_loot SET notes_advice = 'The spell slot regained must be a Warlock spell slot' WHERE check_id = 'LOT_0751';
UPDATE public.ac_loot SET notes_advice = 'Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0753';
UPDATE public.ac_loot SET notes_advice = 'Ignore the tattoo coverage table.' WHERE check_id = 'LOT_0762';
UPDATE public.ac_loot SET notes_advice = 'This is an adaptation of the Ruidium Shield from Critical Role: Call of the Netherdeep.' WHERE check_id = 'LOT_0766';
UPDATE public.ac_loot SET notes_advice = 'This is an adaptation of the Speaking Stone from Eberron: Rising from the Last War.' WHERE check_id = 'LOT_0767';
UPDATE public.ac_loot SET notes_advice = 'Can also be attuned to by a creature able to cast all of the spells listed in the item.' WHERE check_id = 'LOT_0771';
UPDATE public.ac_loot SET notes_advice = 'Has no class restrictions for attunement.' WHERE check_id = 'LOT_0772';
UPDATE public.ac_loot SET notes_advice = 'Can also be attuned to by a creature able to cast all of the spells listed in the item.' WHERE check_id = 'LOT_0773';
UPDATE public.ac_loot SET notes_advice = 'Can also be attuned to by a creature able to cast all of the spells listed in the item.' WHERE check_id = 'LOT_0774';
UPDATE public.ac_loot SET notes_advice = 'Can also be attuned to by a creature able to cast all of the spells listed in the item.' WHERE check_id = 'LOT_0775';
UPDATE public.ac_loot SET notes_advice = 'Can also be attuned to by a creature able to cast all of the spells listed in the item.' WHERE check_id = 'LOT_0776';
UPDATE public.ac_loot SET notes_advice = 'By default, this is reflavored as not being tied to Ravnica when obtained outside of Ravnica.' WHERE check_id = 'LOT_0780';
UPDATE public.ac_loot SET notes_advice = 'By default, this is reflavored as not being tied to Altus when obtained outside of Everden.' WHERE check_id = 'LOT_0783';
UPDATE public.ac_loot SET notes_advice = 'By default, this is reflavored as not being tied to Tasha.' WHERE check_id = 'LOT_0784';
UPDATE public.ac_loot SET notes_advice = 'This armor can only be used during an adventure and your attunement to it must be broken by the end of the adventure or following the end of the adventure, such as through Remove Curse. You make the Charisma saving throws as written for any Long Rests taken during an adventure.' WHERE check_id = 'LOT_0788';
UPDATE public.ac_loot SET notes_advice = '- A non-spellcaster can attune to this item
- while holding the wand, you can use your Reaction to expend 1 charge and gain Advantage on a saving throw you make to avoid being Paralyzed or Restrained, or you can expend 1 charge and gain Advantage on any check you make to escape a grapple.' WHERE check_id = 'LOT_0789';
UPDATE public.ac_loot SET notes_advice = 'Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0790';
UPDATE public.ac_loot SET notes_advice = 'Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0791';
UPDATE public.ac_loot SET notes_advice = 'Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0792';
UPDATE public.ac_loot SET notes_advice = 'Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0798';
UPDATE public.ac_loot SET notes_advice = 'By default, this is reflavored as not being tied to Ravnica when obtained outside of Ravnica.' WHERE check_id = 'LOT_0803';
UPDATE public.ac_loot SET notes_advice = 'This is an adaptation of the Dagger of Blindsight in Waterdeep: Dungeon of the Mad Mage' WHERE check_id = 'LOT_0804';
UPDATE public.ac_loot SET notes_advice = 'On a 20 on the d20 for an attack roll, the weapon deals an extra 4d6 damage as opposed to a flat amount of damage (for a total of 8d6 damage on a critical hit)' WHERE check_id = 'LOT_0808';
UPDATE public.ac_loot SET notes_advice = 'Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0811';
UPDATE public.ac_loot SET notes_advice = 'Can also be purchased as Adventuring Gear for 4000 GP in Allowed Content ([Equipment](/allowed-content/#equipment))' WHERE check_id = 'LOT_0815';
UPDATE public.ac_loot SET notes_advice = 'Use 2014 version in 2014 games. Use 2024 version in 2024 games.' WHERE check_id = 'LOT_0816';
UPDATE public.ac_loot SET notes_advice = '- Known as +2 Wraps of Unarmed Power in the 2024 Dungeon Master''s Guide
- You can choose to deal either Force damage or your normal damage type with unarmed strikes, and your Unarmed Strikes are considered magical for purpose of overcoming resistance and immunity to nonmagical attacks
- These wraps are considered to be and must be worn as gloves or gauntlets to benefit from them. As such, they cannot be worn with another set of gloves or gauntlets nor can you benefit from another set of gloves or gauntlets (such as Gauntlets of the Dragon) while wearing these wraps' WHERE check_id = 'LOT_0819';
UPDATE public.ac_loot SET notes_advice = '- A DM can only predetermine 1 Superior Ioun Stone of Absorption per item slot.
- Avoids all attempts by other creatures to attack or snatch it' WHERE check_id = 'LOT_0824';
UPDATE public.ac_loot SET notes_advice = '- A DM can only predetermine 1 Ioun Stone of Greater Absorption per item slot.
- Avoids all attempts by other creatures to attack or snatch it' WHERE check_id = 'LOT_0825';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is falconxyx
- A DM can only predetermine 1 Lesser Potion of Dragon''s Majesty per item slot.' WHERE check_id = 'LOT_0826';
UPDATE public.ac_loot SET notes_advice = '- A DM can only predetermine 1 Manual of Clay Golems per item slot.
- Using the manual to create the associated golem requires the listed cost in gold and an amount of DTP equal to the number of days required' WHERE check_id = 'LOT_0827';
UPDATE public.ac_loot SET notes_advice = '- A DM can only predetermine 1 Manual of Stone Golems per item slot.
- Using the manual to create the associated golem requires the listed cost in gold and an amount of DTP equal to the number of days required' WHERE check_id = 'LOT_0828';
UPDATE public.ac_loot SET notes_advice = 'This can''t be used during downtime, only during an adventure.' WHERE check_id = 'LOT_0830';
UPDATE public.ac_loot SET notes_advice = 'A DM can only predetermine 1 Potion of Cloud Giant Strength per item slot.' WHERE check_id = 'LOT_0832';
UPDATE public.ac_loot SET notes_advice = 'A DM can only predetermine 1 Potion of Mind Control (monster) per item slot.' WHERE check_id = 'LOT_0834';
UPDATE public.ac_loot SET notes_advice = '- The location teleported to is a previously designated sanctuary. You can designate a location as a sanctuary by taking a Magic action immediately after finishing a Long Rest at that location with this item on your person.
- A DM can only predetermine 1 Recall Crystal per item slot.' WHERE check_id = 'LOT_0836';
UPDATE public.ac_loot SET notes_advice = '- A DM can predetermine up to 3 duplicates per item slot.
- By default, this is reflavored as not being tied to Theros when obtained outside of Theros.' WHERE check_id = 'LOT_0837';
UPDATE public.ac_loot SET notes_advice = '- A DM can predetermine up to 3 duplicates per item slot.
- By default, this is reflavored as not being tied to Theros when obtained outside of Theros.' WHERE check_id = 'LOT_0838';
UPDATE public.ac_loot SET notes_advice = '- Can be acquired as an upcast version of a lower level spell
- A DM can only predetermine 1 level 6 spell scroll per item slot.' WHERE check_id = 'LOT_0839';
UPDATE public.ac_loot SET notes_advice = '- Can be acquired as an upcast version of a lower level spell
- A DM can only predetermine 1 level 7 spell scroll per item slot.' WHERE check_id = 'LOT_0840';
UPDATE public.ac_loot SET notes_advice = '- Can be acquired as an upcast version of a lower level spell
- A DM can only predetermine 1 level 8 spell scroll per item slot.' WHERE check_id = 'LOT_0841';
UPDATE public.ac_loot SET notes_advice = 'The creator of this homebrew item is magurotoria' WHERE check_id = 'LOT_0848';
UPDATE public.ac_loot SET notes_advice = 'Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0849';
UPDATE public.ac_loot SET notes_advice = 'Ignore the tattoo coverage table.' WHERE check_id = 'LOT_0850';
UPDATE public.ac_loot SET notes_advice = '- Outside of Eberron, Belashyrra receives no information
- By default, this is reflavored as an item not tied to Belashyrra.' WHERE check_id = 'LOT_0851';
UPDATE public.ac_loot SET notes_advice = 'Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0855';
UPDATE public.ac_loot SET notes_advice = 'Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0858';
UPDATE public.ac_loot SET notes_advice = 'After the item is used on an adventure, in character days that pass for the adventure''s duration counts towards the time after which the item can be used again as determined by the DM. Each real life day that passes while the character is not adventuring as part of a multisession or campaign also counts towards this time.' WHERE check_id = 'LOT_0866';
UPDATE public.ac_loot SET notes_advice = 'Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0867';
UPDATE public.ac_loot SET notes_advice = '- Can be acquired as containing upcast versions of lower level spells
- For spells reprinted in 2024 that have a different school of magic in 2014 compared to 2024, use the 2024 school of magic to determine an eligible spell for this item.' WHERE check_id = 'LOT_0879';
UPDATE public.ac_loot SET notes_advice = '- Can be acquired as containing upcast versions of lower level spells
- For spells reprinted in 2024 that have a different school of magic in 2014 compared to 2024, use the 2024 school of magic to determine an eligible spell for this item.' WHERE check_id = 'LOT_0880';
UPDATE public.ac_loot SET notes_advice = '- Can be acquired as containing upcast versions of lower level spells
- For spells reprinted in 2024 that have a different school of magic in 2014 compared to 2024, use the 2024 school of magic to determine an eligible spell for this item.' WHERE check_id = 'LOT_0881';
UPDATE public.ac_loot SET notes_advice = '- Can be acquired as containing upcast versions of lower level spells
- For spells reprinted in 2024 that have a different school of magic in 2014 compared to 2024, use the 2024 school of magic to determine an eligible spell for this item.' WHERE check_id = 'LOT_0882';
UPDATE public.ac_loot SET notes_advice = '- Can be acquired as containing upcast versions of lower level spells
- For spells reprinted in 2024 that have a different school of magic in 2014 compared to 2024, use the 2024 school of magic to determine an eligible spell for this item.' WHERE check_id = 'LOT_0883';
UPDATE public.ac_loot SET notes_advice = '- Can be acquired as containing upcast versions of lower level spells
- For spells reprinted in 2024 that have a different school of magic in 2014 compared to 2024, use the 2024 school of magic to determine an eligible spell for this item.' WHERE check_id = 'LOT_0884';
UPDATE public.ac_loot SET notes_advice = 'Has no alignment restriction for attunement' WHERE check_id = 'LOT_0886';
UPDATE public.ac_loot SET notes_advice = '- After the item is used on an adventure, in character days that pass for the adventure''s duration counts towards the time after which the item can be used again as determined by the DM. Each real life day that passes while the character is not adventuring as part of a multisession or campaign also counts towards this time.
- Can only be used during an adventure or as supervised by a DM, not during downtime.' WHERE check_id = 'LOT_0887';
UPDATE public.ac_loot SET notes_advice = '- After the item is used on an adventure, in character days that pass for the adventure''s duration counts towards the time after which the item can be used again as determined by the DM. Each real life day that passes while the character is not adventuring as part of a multisession or campaign also counts towards this time.
- This item summons 3d4+3 Berserkers, each of which is immune to the Charmed and Frightened conditions.' WHERE check_id = 'LOT_0895';
UPDATE public.ac_loot SET notes_advice = 'You can play the instrument while casting a spell that causes any of its targets to be charmed on a failed saving throw, thereby imposing disadvantage on the save. This effect applies only if the spell has a somatic or a material component.' WHERE check_id = 'LOT_0896';
UPDATE public.ac_loot SET notes_advice = 'You can play the instrument while casting a spell that causes any of its targets to be charmed on a failed saving throw, thereby imposing disadvantage on the save. This effect applies only if the spell has a somatic or a material component.' WHERE check_id = 'LOT_0897';
UPDATE public.ac_loot SET notes_advice = 'Avoids all attempts by other creatures to attack or snatch it' WHERE check_id = 'LOT_0898';
UPDATE public.ac_loot SET notes_advice = '- Outside of Eberron, the Black Pudding is allied with oozes and Juiblex.
- By default, this is reflavored as an item not tied to Kryzin.' WHERE check_id = 'LOT_0899';
UPDATE public.ac_loot SET notes_advice = 'By default, this is reflavored as not being tied to Ravnica when obtained outside of Ravnica.' WHERE check_id = 'LOT_0912';
UPDATE public.ac_loot SET notes_advice = 'A character with Proficiency in Jeweler''s Tools can combine up to 4 individual prayer beads (including duplicates) into a single Necklace of Prayer Beads (requiring only one attunement slot) by expending 1 DTP per bead. Beads can be removed in the same way for 1 DTP per bead removed.' WHERE check_id = 'LOT_0914';
UPDATE public.ac_loot SET notes_advice = 'After the item is used on an adventure, in character days that pass for the adventure''s duration counts towards the time after which the item can be used again as determined by the DM. Each real life day that passes while the character is not adventuring as part of a multisession or campaign also counts towards this time.' WHERE check_id = 'LOT_0915';
UPDATE public.ac_loot SET notes_advice = 'This weapon replaces all existing instances of the previous legacy item +3 Weapon of Recall (HB)' WHERE check_id = 'LOT_0916';
UPDATE public.ac_loot SET notes_advice = 'You can regrow a missing body part in downtime by expending 1d6+1 DTP per missing body part.' WHERE check_id = 'LOT_0917';
UPDATE public.ac_loot SET notes_advice = 'The first button produces a Flame Tongue' WHERE check_id = 'LOT_0923';
UPDATE public.ac_loot SET notes_advice = 'After the item is used on an adventure, in character days that pass for the adventure''s duration counts towards the time after which the item can be used again as determined by the DM. Each real life day that passes while the character is not adventuring as part of a multisession or campaign also counts towards this time.' WHERE check_id = 'LOT_0925';
UPDATE public.ac_loot SET notes_advice = 'By default, this is reflavored as not tied to Gaspard when obtained outside of Everden.' WHERE check_id = 'LOT_0926';
UPDATE public.ac_loot SET notes_advice = 'A level 6+ spell that is countered isn''t stored in the bottle.' WHERE check_id = 'LOT_0935';
UPDATE public.ac_loot SET notes_advice = 'Can also be attuned to by a creature able to cast all of the spells listed in the item.' WHERE check_id = 'LOT_0938';
UPDATE public.ac_loot SET notes_advice = 'Can also be attuned to by a creature able to cast all of the spells listed in the item.' WHERE check_id = 'LOT_0939';
UPDATE public.ac_loot SET notes_advice = 'Can also be attuned to by a creature able to cast all of the spells listed in the item.' WHERE check_id = 'LOT_0942';
UPDATE public.ac_loot SET notes_advice = 'Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0943';
UPDATE public.ac_loot SET notes_advice = 'By default, this is reflavored as an item not tied to Dyrrn.' WHERE check_id = 'LOT_0945';
UPDATE public.ac_loot SET notes_advice = 'This is an adaptation of the Topaz Annihilator from Fizban''s Treasury of Dragons.' WHERE check_id = 'LOT_0947';
UPDATE public.ac_loot SET notes_advice = 'The creator of this homebrew item is diandra' WHERE check_id = 'LOT_0949';
UPDATE public.ac_loot SET notes_advice = 'By default, this is reflavored as not being tied to Ravnica when obtained outside of Ravnica.' WHERE check_id = 'LOT_0950';
UPDATE public.ac_loot SET notes_advice = '- Known as +3 Wraps of Unarmed Power in the 2024 Dungeon Master''s Guide
- You can choose to deal either Force damage or your normal damage type with unarmed strikes, and your Unarmed Strikes are considered magical for purpose of overcoming resistance and immunity to nonmagical attacks
- These wraps are considered to be and must be worn as gloves or gauntlets to benefit from them. As such, they cannot be worn with another set of gloves or gauntlets nor can you benefit from another set of gloves or gauntlets (such as Gauntlets of the Dragon) while wearing these wraps' WHERE check_id = 'LOT_0956';
UPDATE public.ac_loot SET notes_advice = '- A DM can only predetermine 1 Egg of Rebirth per item slot
- By default, this is reflavored as not tied to Ardea when obtained outside of Everden.' WHERE check_id = 'LOT_0957';
UPDATE public.ac_loot SET notes_advice = '- The bottle can only be used during an adventure, not downtime.
- Use the 2014 version in 2014 games and the 2024 version in 2024 games.
- A DM can only predetermine 1 Efreeti Bottle per item slot' WHERE check_id = 'LOT_0958';
UPDATE public.ac_loot SET notes_advice = '- A DM can only predetermine 1 Superior Ioun Stone of Greater Absorption per item slot.
- Avoids all attempts by other creatures to attack or snatch it' WHERE check_id = 'LOT_0959';
UPDATE public.ac_loot SET notes_advice = 'A DM can only predetermine 1 Talisman of Pure Good per item slot.' WHERE check_id = 'LOT_0960';
UPDATE public.ac_loot SET notes_advice = 'A DM can only predetermine 1 Talisman of Ultimate Evil per item slot.' WHERE check_id = 'LOT_0961';
UPDATE public.ac_loot SET notes_advice = '- A DM can only predetermine 1 Manual of Iron Golems per item slot.
- Using the manual to create the associated golem requires the listed cost in gold and an amount of DTP equal to the number of days required' WHERE check_id = 'LOT_0962';
UPDATE public.ac_loot SET notes_advice = 'A DM can only predetermine 1 Potion of Dragon''s Majesty per item slot.' WHERE check_id = 'LOT_0963';
UPDATE public.ac_loot SET notes_advice = 'A DM can only predetermine 1 Potion of Giant Size per item slot.' WHERE check_id = 'LOT_0964';
UPDATE public.ac_loot SET notes_advice = 'A DM can only predetermine 1 Potion of Storm Giant Strength per item slot.' WHERE check_id = 'LOT_0965';
UPDATE public.ac_loot SET notes_advice = 'A DM can only predetermine 1 Ring of Three Wishes (1 wish) per item slot.' WHERE check_id = 'LOT_0966';
UPDATE public.ac_loot SET notes_advice = '- Can be acquired as an upcast version of a lower level spell
- A DM can only predetermine 1 level 9 spell scroll per item slot' WHERE check_id = 'LOT_0967';
UPDATE public.ac_loot SET notes_advice = 'A DM can only predetermine 1 Tablet of Reawakening per item slot' WHERE check_id = 'LOT_0968';
UPDATE public.ac_loot SET notes_advice = '- Can only be used during an adventure or as supervised by a DM, not downtime.
- The statistics and rules for the 2024 version is used' WHERE check_id = 'LOT_0969';
UPDATE public.ac_loot SET notes_advice = 'Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0971';
UPDATE public.ac_loot SET notes_advice = 'Ignore the tattoo coverage table.' WHERE check_id = 'LOT_0974';
UPDATE public.ac_loot SET notes_advice = 'The ability check must be made before the end of your next turn to benefit from the action.' WHERE check_id = 'LOT_0975';
UPDATE public.ac_loot SET notes_advice = 'Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0976';
UPDATE public.ac_loot SET notes_advice = '- Can be acquired as containing upcast versions of lower level spells
- For spells reprinted in 2024 that have a different school of magic in 2014 compared to 2024, use the 2024 school of magic to determine an eligible spell for this item.' WHERE check_id = 'LOT_0979';
UPDATE public.ac_loot SET notes_advice = '- Can be acquired as containing upcast versions of lower level spells
- For spells reprinted in 2024 that have a different school of magic in 2014 compared to 2024, use the 2024 school of magic to determine an eligible spell for this item.' WHERE check_id = 'LOT_0980';
UPDATE public.ac_loot SET notes_advice = '- Can be acquired as containing upcast versions of lower level spells
- For spells reprinted in 2024 that have a different school of magic in 2014 compared to 2024, use the 2024 school of magic to determine an eligible spell for this item.' WHERE check_id = 'LOT_0981';
UPDATE public.ac_loot SET notes_advice = '- Can be acquired as containing upcast versions of lower level spells
- For spells reprinted in 2024 that have a different school of magic in 2014 compared to 2024, use the 2024 school of magic to determine an eligible spell for this item.' WHERE check_id = 'LOT_0982';
UPDATE public.ac_loot SET notes_advice = '- Can be acquired as containing upcast versions of lower level spells
- For spells reprinted in 2024 that have a different school of magic in 2014 compared to 2024, use the 2024 school of magic to determine an eligible spell for this item.' WHERE check_id = 'LOT_0983';
UPDATE public.ac_loot SET notes_advice = '- Can be acquired as containing upcast versions of lower level spells
- For spells reprinted in 2024 that have a different school of magic in 2014 compared to 2024, use the 2024 school of magic to determine an eligible spell for this item.' WHERE check_id = 'LOT_0984';
UPDATE public.ac_loot SET notes_advice = 'After the Gold Dragon Form property is used on an adventure, in character days that pass for the adventure''s duration counts towards the time after which the property can be used again as determined by the DM. Each real life day that passes while the character is not adventuring as part of a multisession or campaign also counts towards this time.' WHERE check_id = 'LOT_0986';
UPDATE public.ac_loot SET notes_advice = '- After the item is used on an adventure, in character days that pass for the adventure''s duration counts towards the time after which the item can be used again as determined by the DM. Each real life day that passes while the character is not adventuring as part of a multisession or campaign also counts towards this time.
- This item summons 4d4+4 Berserkers, each of which is immune to the Charmed and Frightened conditions.' WHERE check_id = 'LOT_0989';
UPDATE public.ac_loot SET notes_advice = '- Use the 2014 version in 2014 games and the 2024 version in 2024 games
- Roll for the number of charges in the #treasure-log' WHERE check_id = 'LOT_0990';
UPDATE public.ac_loot SET notes_advice = '- You don''t need to slay an elemental to access all of the ring''s properties
- Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0994';
UPDATE public.ac_loot SET notes_advice = '- You don''t need to slay an elemental to access all of the ring''s properties
- Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0995';
UPDATE public.ac_loot SET notes_advice = '- You don''t need to slay an elemental to access all of the ring''s properties
- Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0996';
UPDATE public.ac_loot SET notes_advice = '- You don''t need to slay an elemental to access all of the ring''s properties
- Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_0997';
UPDATE public.ac_loot SET notes_advice = '- Can also be attuned to by a creature able to cast all of the spells listed in the item.
- Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_1002';
UPDATE public.ac_loot SET notes_advice = '- A monster with legendary actions isn''t immune to the effect but instead can choose to expend a use of Legendary Resistance to take the extra damage instead
- In 2024 games, on a 20 on the d20 for an attack roll, the weapon deals an extra 12d4 damage as opposed to a flat amount of damage (for a total of 24d4 damage on a critical hit)' WHERE check_id = 'LOT_1004';
UPDATE public.ac_loot SET notes_advice = 'Can only be used during an adventure or as supervised by a DM, not downtime.' WHERE check_id = 'LOT_1005';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is greensprout.
- This item can only be obtained in sessions involving the [Legion of Dread](/allowed-content/#other-rewards) (in collaboration with greensprout)
- A DM can predetermine up to 3 Flashsticks per item slot' WHERE check_id = 'LOT_1006';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is greensprout.
- This item can only be obtained in sessions involving the [Legion of Dread](/allowed-content/#other-rewards) (in collaboration with greensprout)
- A DM can predetermine up to 3 Sharpers per item slot' WHERE check_id = 'LOT_1007';
UPDATE public.ac_loot SET notes_advice = 'A DM can predetermine up to 3 duplicates per item slot.' WHERE check_id = 'LOT_1008';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is greensprout.
- This item can only be obtained in sessions involving the [Legion of Dread](/allowed-content/#other-rewards) (in collaboration with greensprout)
- A DM can predetermine up to 3 Tosser Grenades per item slot' WHERE check_id = 'LOT_1009';
UPDATE public.ac_loot SET notes_advice = 'Notes / Rage Advice' WHERE check_id = 'LOT_1011';
UPDATE public.ac_loot SET notes_advice = '- Does not require attunement.
- Can only be used by a creature missing a hand or arm and can be detached or reattached with a Magic action' WHERE check_id = 'LOT_1012';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by macthematical
- Only DMs that are collaborating with macthematical with their permission can award this homebrew item as part of an adventure.' WHERE check_id = 'LOT_1013';
UPDATE public.ac_loot SET notes_advice = '- The stone can''t be used as a spell component
- The blood can''t be recovered or used' WHERE check_id = 'LOT_1014';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by naoe45
- This homebrew item can only ever be obtained as a Renown Perk (Renown Score 10) as part of the [Yamato Clan](/allowed-content/#other-rewards)' WHERE check_id = 'LOT_1015';
UPDATE public.ac_loot SET notes_advice = 'Can only be acquired from or in relation to a hag' WHERE check_id = 'LOT_1016';
UPDATE public.ac_loot SET notes_advice = 'This item can only ever be obtained as a Renown Perk (Renown Score 25) as part of the [Harpers](/allowed-content/#other-rewards) and does not use an item slot' WHERE check_id = 'LOT_1017';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by greensprout
- This item can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 10+ with the [Harpers](/allowed-content/#other-rewards). It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 1+ DMPC with a Renown Score of 10+ with the Harpers can choose to obtain this item in replacement of their normal DM Loot for that DMPC.
- This homebrew item was previously known as Harper Pin
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as an item reward.' WHERE check_id = 'LOT_1018';
UPDATE public.ac_loot SET notes_advice = 'This homebrew item was created by jlorshin' WHERE check_id = 'LOT_1020';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by another_tiefling
- This homebrew item can only ever be obtained as a Renown Perk (Renown Score 10) as part of the [Prismatic Lotus](/allowed-content/#other-rewards)' WHERE check_id = 'LOT_1021';
UPDATE public.ac_loot SET notes_advice = 'The orb''s alignment, ability scores, known languages, and academic subjects must be written in the session log for the adventure the orb is acquired in' WHERE check_id = 'LOT_1022';
UPDATE public.ac_loot SET notes_advice = 'The session log in which this item is acquired must provide regarding the soul contained within, including its name, alignment, and personality' WHERE check_id = 'LOT_1025';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by naoe45
- This homebrew item can only ever be obtained as a Renown Perk (Renown Score 10) as part of the [Yamato Clan](/allowed-content/#other-rewards)' WHERE check_id = 'LOT_1026';
UPDATE public.ac_loot SET notes_advice = '- Can only be gifted by a tattoo artist associated with the Red Wizards either past or present
- A Thayan Spell Tattoo can only be crafted by a PC that is a member of the Red Wizards with a Renown Score of 50+. 
- Crafting a Thayan Spell Tattoo follows the same rules for scribing a level 1, level 2, or level 3 Spell Scroll respectively as described in Allowed Content ([Downtime](/allowed-content/#downtime)).
- A Thayan Spell Tattoo can only be crafted as applied to a creature. If applied to another player''s PC, that PC must expend the same amount of DTP as required to craft the Thayan Spell Tattoo to receive the tattoo.' WHERE check_id = 'LOT_1027';
UPDATE public.ac_loot SET notes_advice = 'A DM can predetermine up to 3 duplicates per item slot.' WHERE check_id = 'LOT_1029';
UPDATE public.ac_loot SET notes_advice = '- A DM can only predetermine 1 Infernal War Machine Schematic per item slot.
- Using the schematic to create the associated infernal war machine requires the listed cost in gold or Soul Coins and an amount of DTP equal to the number of days required' WHERE check_id = 'LOT_1030';
UPDATE public.ac_loot SET notes_advice = 'A DM can predetermine up to 3 duplicates per item slot.' WHERE check_id = 'LOT_1031';
UPDATE public.ac_loot SET notes_advice = 'A DM can only predetermine 1 Teleportation Tablet per item slot.' WHERE check_id = 'LOT_1032';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by greensprout
- This item can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 30+ with the [Lords'' Alliance](/allowed-content/#other-rewards). It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 5+ DMPC with a Renown Score of 30+ with the Lords'' Alliance can choose to obtain this item in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as an item reward.' WHERE check_id = 'LOT_1033';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by greensprout
- This homebrew item can only ever be obtained as a Renown Perk (Renown Score 30) as part of the [Legion of Dread](/allowed-content/#other-rewards)' WHERE check_id = 'LOT_1034';
UPDATE public.ac_loot SET notes_advice = 'The docent''s known languages, skills, spells, and personality must be written in the session log for the adventure the docent is acquired in' WHERE check_id = 'LOT_1035';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by greensprout
- This item can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 30+ with the [Emerald Enclave](/allowed-content/#other-rewards). It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 5+ DMPC with a Renown Score of 30+ with the Emerald Enclave can choose to obtain this item in replacement of their normal DM Loot for that DMPC.
- This item can be attuned to even if you are not a Druid or Ranger
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as an item reward.' WHERE check_id = 'LOT_1036';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by .decoymantis., mark.stac, and kwamsture
- This homebrew item can only ever be obtained as a Renown Perk (Renown Score 30) as part of [GEAR](/allowed-content/#other-rewards)' WHERE check_id = 'LOT_1037';
UPDATE public.ac_loot SET notes_advice = 'Can only be acquired from an adventure in Ravnica.' WHERE check_id = 'LOT_1038';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by _badwolf_
- Only DMs that are collaborating with _badwolf_ with their permission can award this homebrew item as part of an adventure.' WHERE check_id = 'LOT_1039';
UPDATE public.ac_loot SET notes_advice = 'This homebrew item was created by 149thomas' WHERE check_id = 'LOT_1041';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by empress5002 and salah_ad_din
- This homebrew item can only ever be obtained as a Renown Perk (Renown Score 30) as part of the [Court of Dunes](/allowed-content/#other-rewards)' WHERE check_id = 'LOT_1042';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by salemalvian
- Only DMs that are collaborating with salemalvian with their permission can award this homebrew item as part of an adventure.' WHERE check_id = 'LOT_1044';
UPDATE public.ac_loot SET notes_advice = 'This homebrew item was created by magurotoria' WHERE check_id = 'LOT_1045';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by greensprout
- This item can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 30+ with the [Zhentarim](/allowed-content/#other-rewards). It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 5+ DMPC with a Renown Score of 30+ with the Zhentarim can choose to obtain this item in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as an item reward.' WHERE check_id = 'LOT_1046';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is .missile
- A DM can predetermine only 1 baton per item slot.
- Can only be acquired from an adventure in the Spelljammer Academy or otherwise in Wildspace or the Astral Sea.' WHERE check_id = 'LOT_1047';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by 149thomas and izazeal
- Only DMs that are collaborating with 149thomas and izazeal with their permission can award this homebrew item as part of an adventure.' WHERE check_id = 'LOT_1049';
UPDATE public.ac_loot SET notes_advice = 'After the Feast of Plenty property is used on an adventure, in character days that pass for the adventure''s duration counts towards the time after which the property can be used again as determined by the DM. Each real life day that passes while the character is not adventuring as part of a multisession or campaign also counts towards this time.' WHERE check_id = 'LOT_1050';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by naoe45
- This homebrew item can only ever obtained as a Renown Perk (Renown Score 50) as part of the [Yamato Clan](/allowed-content/#other-rewards)' WHERE check_id = 'LOT_1052';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by falconxyx
- This homebrew item can only ever obtained as a Renown Perk (Renown Score 30) as part of the [Gilded Accord](/allowed-content/#other-rewards)' WHERE check_id = 'LOT_1053';
UPDATE public.ac_loot SET notes_advice = '- This can be used in conjunction with a flying Bastion modification to allow a flying Bastion to move, as described in [Bastions](/allowed-content/#bastions).
- The orb can be keyed to an existing flying Bastion by taking a Bastion Turn at the Bastion with the Navigation Orb present. The orb can otherwise be keyed to a Stronghold Bastion (as per the Building a Stronghold downtime activity) by expending 7 DTP with the Navigation Orb present at the location.' WHERE check_id = 'LOT_1055';
UPDATE public.ac_loot SET notes_advice = 'This can''t be used during downtime, only during an adventure.' WHERE check_id = 'LOT_1056';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by naoe45
- This homebrew item can only ever obtained as a Renown Perk (Renown Score 50) as part of the [Yamato Clan](/allowed-content/#other-rewards)' WHERE check_id = 'LOT_1057';
UPDATE public.ac_loot SET notes_advice = 'This is an adaptation of the Horizon Puzzle Cube from Bigby Presents: Glory of the Giants.' WHERE check_id = 'LOT_1058';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by rexen
- This item can only ever obtained as created during an adventure by a character with the Gift of Glassteel (Reinforced Glassteel Plate) Story Outcome, taking up a T3 Permanent item slot for the adventure.' WHERE check_id = 'LOT_1059';
UPDATE public.ac_loot SET notes_advice = 'A Full DM must make a request to the Lore Consultants to award one of the Swords of Answering as only 9 of these swords are known to exist in the multiverse.' WHERE check_id = 'LOT_1060';
UPDATE public.ac_loot SET notes_advice = 'A Ring of Three Wishes (2 wishes) takes up 2 item slots as a consumable item as predetermined.' WHERE check_id = 'LOT_1061';
UPDATE public.ac_loot SET notes_advice = 'A Ring of Three Wishes (3 wishes) takes up 3 item slots as a consumable item as predetermined.' WHERE check_id = 'LOT_1062';
UPDATE public.ac_loot SET notes_advice = '- A DM can only predetermine 1 Tome of the Dragon per item slot.
- Using the tome to transform an adult or ancient Dragon into the associated Dracolich can only be done as overseen by a DM and requires the listed cost in gold (80,000 GP) and  DTP equal to the number of days required (180 DTP). If you are a Dragon and are conducting the ritual, the required gold cost and time required is halved as listed (to 40,000 GP and 90 DTP). Another PC that meets the requirements to use the tome can assist you with the ritual, with you and the assisting PC expending 90 DTP each (or 45 DTP each if you are a Dragon). The Dracolich created is an NPC under the DM’s control.' WHERE check_id = 'LOT_1063';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by greensprout
- This homebrew item can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 50+ with the [Lords'' Alliance](/allowed-content/#other-rewards). It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 17+ DMPC with a Renown Score of 50+ with the Lords'' Alliance can choose to obtain this homebrew item in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as an item reward.' WHERE check_id = 'LOT_1064';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by greensprout
- This homebrew item can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 50+ with the [Zhentarim](/allowed-content/#other-rewards). It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 17+ DMPC with a Renown Score of 50+ with the Zhentarim can choose to obtain this homebrew item in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as an item reward.' WHERE check_id = 'LOT_1065';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by .decoymantis., mark.stac, and kwamsture
- This homebrew item can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 50+ with [GEAR](/allowed-content/#other-rewards). It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 17+ DMPC with a Renown Score of 50+ with GEAR can choose to obtain this homebrew item in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as an item reward.' WHERE check_id = 'LOT_1066';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by greensprout
- This item can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 50+ with the [Harpers](/allowed-content/#other-rewards). It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 17+ DMPC with a Renown Score of 50+ with the Harpers can choose to obtain this item in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as an item reward.' WHERE check_id = 'LOT_1067';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by myusernameisredacted
- This homebrew item can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 50+ with [HALO](/allowed-content/#other-rewards). It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 17+ DMPC with a Renown Score of 50+ with HALO can choose to obtain this homebrew item in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as an item reward.' WHERE check_id = 'LOT_1068';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by naoe45
- This homebrew item requires the Ink of the Living Legacy as a prerequisite, which it replaces and upgrades. If a PC ever swaps from the Ink of the Living Legacy to the Pendant of the Arcane Echo as the Renown Score 50 Renown Perk for the [Yamato Clan](/allowed-content/#other-rewards), this item is lost.
- This homebrew item can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 50+ with the Yamato Clan. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 17+ DMPC with a Renown Score of 50+ with the Yamato Clan can choose to obtain this homebrew item in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as an item reward.' WHERE check_id = 'LOT_1069';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by another_tiefling
- This homebrew item can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 50+ with the [Prismatic Lotus](/allowed-content/#other-rewards). It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 17+ DMPC with a Renown Score of 50+ with the Prismatic Lotus can choose to obtain this homebrew item in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as an item reward.' WHERE check_id = 'LOT_1070';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by naoe45
- This homebrew item requires the Pendant of the Arcane Echo as a prerequisite, which it replaces and upgrades. If a PC ever swaps from the Pendant of the Arcane Echo to the Ink of the Living Legacy as the Renown Score 50 Renown Perk for the [Yamato Clan](/allowed-content/#other-rewards), this item is lost.
- This homebrew item can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 50+ with the Yamato Clan. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 17+ DMPC with a Renown Score of 50+ with the Yamato Clan can choose to obtain this homebrew item in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as an item reward.' WHERE check_id = 'LOT_1071';
UPDATE public.ac_loot SET notes_advice = 'The name, alignment, and personality of the specific Djinni must be written in the session log in which this item is awarded.' WHERE check_id = 'LOT_1072';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by greensprout
- This item can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 50+ with the [Order of the Gauntlet](/allowed-content/#other-rewards). It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 17+ DMPC with a Renown Score of 50+ with the Order of the Gauntlet can choose to obtain this item in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as an item reward.' WHERE check_id = 'LOT_1074';
UPDATE public.ac_loot SET notes_advice = 'Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_1075';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by falconxyx
- This homebrew item requires the [Gilded Accord](/allowed-content/#other-rewards) Amulet as a prerequisite, which it replaces and upgrades
- This homebrew item can be awarded using an item slot as normal but can only be obtained by a PC with a Renown Score of 50+ with the Gilded Accord. It can''t be sold or traded and the PC can''t use it if they ever fall below the required Renown Score threshold.
- A DM with a level 17+ DMPC with a Renown Score of 50+ with the Gilded Accord can choose to obtain this homebrew item in replacement of their normal DM Loot for that DMPC.
- NOTE: This is not a Renown Perk and is not obtained just from gaining Renown Score, but instead as an item reward.' WHERE check_id = 'LOT_1076';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by greensprout
- A DM can only award up to 1 pair of Lesser Portal Stones per APL 11+ multisession of 3+ sessions.' WHERE check_id = 'LOT_1077';
UPDATE public.ac_loot SET notes_advice = 'A DM can only award up to 1 Rod of Absorption per APL 11+ multisession of 3+ sessions.' WHERE check_id = 'LOT_1078';
UPDATE public.ac_loot SET notes_advice = 'Only your cleric and paladin spells get the bonus to spell save DC and spell attack rolls.' WHERE check_id = 'LOT_1078';
UPDATE public.ac_loot SET notes_advice = 'Only your cleric and paladin spells get the bonus to spell save DC and spell attack rolls.' WHERE check_id = 'LOT_1082';
UPDATE public.ac_loot SET notes_advice = '- A character with Proficiency in Jeweler''s Tools can combine up to 4 individual prayer beads (including duplicates) into a single Necklace of Prayer Beads (requiring only one attunement slot) by expending 1 DTP per bead. Beads can be removed in the same way for 1 DTP per bead removed.
- Can only be used during an adventure or as supervised by a DM, not during downtime.' WHERE check_id = 'LOT_1087';
UPDATE public.ac_loot SET notes_advice = 'This homebrew item was created by 149thomas' WHERE check_id = 'LOT_1090';
UPDATE public.ac_loot SET notes_advice = 'The spell slot regained must be a Warlock spell slot' WHERE check_id = 'LOT_1091';
UPDATE public.ac_loot SET notes_advice = 'A DM can only award 1 Lesser Candle of Invocation per APL 17+ multisession of 5+ sessions' WHERE check_id = 'LOT_1093';
UPDATE public.ac_loot SET notes_advice = '- A DM can only award up to 1 Manual of Bodily Health per APL 17+ multisession of 5+ sessions.
- A character can only benefit from one of each item once. This benefit is not retained through a checkpoint rework into a different character.' WHERE check_id = 'LOT_1094';
UPDATE public.ac_loot SET notes_advice = '- A DM can only award up to 1 Manual of Gainful Exercise per APL 17+ multisession of 5+ sessions.
- A character can only benefit from one of each item once. This benefit is not retained through a checkpoint rework into a different character.' WHERE check_id = 'LOT_1095';
UPDATE public.ac_loot SET notes_advice = '- A DM can only award up to 1 Manual of Quickness of Action per APL 17+ multisession of 5+ sessions.
- A character can only benefit from one of each item once. This benefit is not retained through a checkpoint rework into a different character.' WHERE check_id = 'LOT_1096';
UPDATE public.ac_loot SET notes_advice = '- A DM can only award up to 1 Tome of Clear Thoughts per APL 17+ multisession of 5+ sessions.
- A character can only benefit from one of each item once. This benefit is not retained through a checkpoint rework into a different character.' WHERE check_id = 'LOT_1097';
UPDATE public.ac_loot SET notes_advice = '- A DM can only award up to 1 Tome of Leadership and Influence per APL 17+ multisession of 5+ sessions.
- A character can only benefit from one of each item once. This benefit is not retained through a checkpoint rework into a different character.' WHERE check_id = 'LOT_1098';
UPDATE public.ac_loot SET notes_advice = '- A DM can only award up to 1 Tome of Understanding per APL 17+ multisession of 5+ sessions.
- A character can only benefit from one of each item once. This benefit is not retained through a checkpoint rework into a different character.' WHERE check_id = 'LOT_1099';
UPDATE public.ac_loot SET notes_advice = 'A DM can only award up to 1 Greater Talisman of Pure Good per APL 17+ multisession of 5+ sessions.' WHERE check_id = 'LOT_1100';
UPDATE public.ac_loot SET notes_advice = 'A DM can only award up to 1 Greater Talisman of Ultimate Evil per APL 17+ multisession of 5+ sessions.' WHERE check_id = 'LOT_1101';
UPDATE public.ac_loot SET notes_advice = 'Only your cleric and paladin spells get the bonus to spell save DC and spell attack rolls.' WHERE check_id = 'LOT_1103';
UPDATE public.ac_loot SET notes_advice = '- Can be acquired as containing upcast versions of lower level spells
- For spells reprinted in 2024 that have a different school of magic in 2014 compared to 2024, use the 2024 school of magic to determine an eligible spell for this item.' WHERE check_id = 'LOT_1109';
UPDATE public.ac_loot SET notes_advice = '- Can be acquired as containing upcast versions of lower level spells
- For spells reprinted in 2024 that have a different school of magic in 2014 compared to 2024, use the 2024 school of magic to determine an eligible spell for this item.' WHERE check_id = 'LOT_1110';
UPDATE public.ac_loot SET notes_advice = '- Can be acquired as containing upcast versions of lower level spells
- For spells reprinted in 2024 that have a different school of magic in 2014 compared to 2024, use the 2024 school of magic to determine an eligible spell for this item.' WHERE check_id = 'LOT_1111';
UPDATE public.ac_loot SET notes_advice = 'Only your cleric and paladin spells get the bonus to spell save DC and spell attack rolls.' WHERE check_id = 'LOT_1112';
UPDATE public.ac_loot SET notes_advice = 'The statistics and rules for the 2024 version is used' WHERE check_id = 'LOT_1115';
UPDATE public.ac_loot SET notes_advice = '- After the item is used on an adventure, in character days that pass for the adventure''s duration counts towards the time after which the item can be used again as determined by the DM. Each real life day that passes while the character is not adventuring as part of a multisession or campaign also counts towards this time.
- This item summons 5d4+5 Berserkers, each of which is immune to the Charmed and Frightened conditions.' WHERE check_id = 'LOT_1116';
UPDATE public.ac_loot SET notes_advice = '- The DM can roll or choose the contents of the flask using the tables from either the 2014 or 2024 version of this item (reroll any result that would result in a Solar)
- Use the 2014 version in 2014 games and the 2024 version in 2024 games' WHERE check_id = 'LOT_1117';
UPDATE public.ac_loot SET notes_advice = '- Requires attunement by a creature of the weapon''s choice (ignore racial attunement requirement)
- Options from the tables of either the 2014 or 2024 version can be used
- As written, the first rune of a Moonblade must grant a +1 bonus to attack and damage rolls. Any other runes (up to a maximum of 6 additional runes) use the listed options in the tables. The maximum bonus to attack and damage rolls regardless of combination of runes is always +3.
- The option corresponding to 91-92 on the d100 for the 2014 version and the option corresponding to 61-75 on the d100 for the 2024 version are treated as version equivalents of each other. Use the former in 2014 games and the latter in 2024 games.
- The maximum amount of damage from the option corresponding to 91-92 on the d100 for the 2014 version is 3d6 Slashing damage, meaning a Moonblade can have no more than three such runes.
- The maximum amount of damage from the option corresponding to 93-94 on the d100 per the table in the 2014 version is 3d6 damage against creatures of a certain type, meaning a Moonblade can have no more than three such runes per creature type.' WHERE check_id = 'LOT_1119';
UPDATE public.ac_loot SET notes_advice = 'This item has no alignment restrictions' WHERE check_id = 'LOT_1124';
UPDATE public.ac_loot SET notes_advice = 'This homebrew item was created by 149thomas' WHERE check_id = 'LOT_1125';
UPDATE public.ac_loot SET notes_advice = 'The spell slot regained must be a Warlock spell slot' WHERE check_id = 'LOT_1126';
UPDATE public.ac_loot SET notes_advice = '- Use the 2014 version in 2014 games and the 2024 version in 2024 games
- Can also be attuned to by a creature able to cast all of the spells listed in the item.' WHERE check_id = 'LOT_1128';
UPDATE public.ac_loot SET notes_advice = 'A DM can only award up to 1 Candle of Invocation per APL 20 multisession of 8+ sessions.' WHERE check_id = 'LOT_1129';
UPDATE public.ac_loot SET notes_advice = '- A DM can only award up to 1 Scroll of Titan Summoning per APL 20 multisession of 8+ sessions.
- Can only be used during an adventure, not downtime.' WHERE check_id = 'LOT_1130';
UPDATE public.ac_loot SET notes_advice = 'The name, personality, and alignment of the Solar must be written in the session log in which this item is acquired.' WHERE check_id = 'LOT_1133';
UPDATE public.ac_loot SET notes_advice = '- All Relics of Emergence are initially acquired in this state as part of a multisession. The minimum APL and number of sessions depends on this state''s tier, but is always at least 3 sessions.
- A Relic of Emergence only grants its full benefits to a specific user: if another character acquires it (such as through trading or a checkpoint rework into a different character), the Relic only provides the benefits of this state to them. (Separate multisessions are required to evolve the item for that new character)
- A Full DM can submit a Rules request to turn another existing magic item they previously awarded into a Relic of Emergence, if they feel it is appropriate for that item to be an evolving item. They must provide the same information as above and the existing magic item''s statistics are treated as the Dormant state of the Relic.' WHERE check_id = 'LOT_1135';
UPDATE public.ac_loot SET notes_advice = 'A Dormant Relic of Emergence upgrades to this state after a multisession reflecting the character''s growth and specific conditions to unlock more of the Relic''s power. The minimum APL and number of sessions depends on this state''s tier, but is always at least 3 sessions.' WHERE check_id = 'LOT_1136';
UPDATE public.ac_loot SET notes_advice = 'An Awakened Relic of Emergence upgrades to this state after a multisession reflecting the character''s growth and specific conditions to unlock the full power and potential of the Relic. The minimum APL and number of sessions depends on this state''s tier, but is always at least 3 sessions.' WHERE check_id = 'LOT_1137';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by hanabi_0611
- Only DMs that are collaborating with hanabi_0611 with their permission can award this homebrew item as part of an adventure' WHERE check_id = 'LOT_1138';
UPDATE public.ac_loot SET notes_advice = '- The statblock of the devil must be in Fair Game.
- The specifics of the associated devil, including its name and personality, must be written in the session log this card is acquired in.' WHERE check_id = 'LOT_1155';
UPDATE public.ac_loot SET notes_advice = 'The associated spell must be written in the session log the card is acquired in. 

* If the associated spell has a casting time longer than 1 action, then this item''s tier is T3+ and requires an APL 11+ multisession of 3+ sessions ran by a Full DM to award.' WHERE check_id = 'LOT_1156';
UPDATE public.ac_loot SET notes_advice = '- The Full DM must submit a Rules request providing the full statistics of the item in each state for review and approval.
- The Full DM may be asked to provide an outline on how the item is meant to be initially acquired.
- The tier of each state is determined collaboratively by the Full DM and the Rules team.' WHERE check_id = 'LOT_1166';
UPDATE public.ac_loot SET notes_advice = '- This can''t be installed onto an air or space vehicle that can''t sail on water.
- This can only be installed onto a vehicle that uses oars: Galley, Keelboat, Longship, Rowboat, Sailing Ship, Warship, Ffolk Sailing Ship, Norlander Longship, Rusted Hulk, or Whaleboat' WHERE check_id = 'LOT_1168';
UPDATE public.ac_loot SET notes_advice = '- This can''t be installed onto an air or space vehicle that can''t sail on water.
- This can only be installed onto a vehicle that uses oars: Galley, Keelboat, Longship, Rowboat, Sailing Ship, Warship, Ffolk Sailing Ship, Norlander Longship, Rusted Hulk, or Whaleboat' WHERE check_id = 'LOT_1172';
UPDATE public.ac_loot SET notes_advice = '- This can''t be installed onto an air or space vehicle that can''t sail on water.
- This can only be installed onto a vehicle that uses sails: Galley, Keelboat, Longship, Sailing Ship, Warship, Ffolk Sailing Ship, Norlander Longship, or Rusted Hulk, as well as Bombard, Flying Fish Ship, Hammerhead Ship, Space Galleon, or Squid Ship' WHERE check_id = 'LOT_1173';
UPDATE public.ac_loot SET notes_advice = '- This can''t be installed onto an air or space vehicle that can''t sail on water.
- This can only be installed onto a vehicle that uses sails: Galley, Keelboat, Longship, Sailing Ship, Warship, Ffolk Sailing Ship, Norlander Longship, or Rusted Hulk, as well as Bombard, Flying Fish Ship, Hammerhead Ship, Space Galleon, or Squid Ship' WHERE check_id = 'LOT_1174';
UPDATE public.ac_loot SET notes_advice = 'A weapon can have up to two upgrades if at least one of them is Arcane Artillery.' WHERE check_id = 'LOT_1175';
UPDATE public.ac_loot SET notes_advice = '- This can''t be installed onto an air or space vehicle that can''t sail on water.
- This can only be installed onto a vehicle that uses sails: Galley, Keelboat, Longship, Sailing Ship, Warship, Ffolk Sailing Ship, Norlander Longship, or Rusted Hulk, as well as Bombard, Flying Fish Ship, Hammerhead Ship, Space Galleon, or Squid Ship' WHERE check_id = 'LOT_1184';
UPDATE public.ac_loot SET notes_advice = '- This can''t be installed onto an air or space vehicle that can''t sail on water.
- This can only be installed onto a vehicle that uses sails: Galley, Keelboat, Longship, Sailing Ship, Warship, Ffolk Sailing Ship, Norlander Longship, or Rusted Hulk, as well as Bombard, Flying Fish Ship, Hammerhead Ship, Space Galleon, or Squid Ship' WHERE check_id = 'LOT_1185';
UPDATE public.ac_loot SET notes_advice = 'Can only be installed onto a Gargantuan infernal war machine, such as the Demon Grinder' WHERE check_id = 'LOT_1189';
UPDATE public.ac_loot SET notes_advice = 'Can only be installed onto a Huge or larger infernal war machine, such as the Scavenger' WHERE check_id = 'LOT_1191';
UPDATE public.ac_loot SET notes_advice = 'Can only be installed onto a Gargantuan infernal war machine, such as the Demon Grinder' WHERE check_id = 'LOT_1194';
UPDATE public.ac_loot SET notes_advice = 'This homebrew item was only obtainable as part of the [2021 Hawthorne Coliseum event](https://discord.com/channels/308324031478890497/617806519488086056/810634944811368509)' WHERE check_id = 'LOT_1202';
UPDATE public.ac_loot SET notes_advice = 'This homebrew item was only obtainable as part of the [2021 Hawthorne Coliseum event](https://discord.com/channels/308324031478890497/617806519488086056/810634944811368509)' WHERE check_id = 'LOT_1203';
UPDATE public.ac_loot SET notes_advice = 'This homebrew item was only obtainable as part of the [2021 Hawthorne Coliseum event](https://discord.com/channels/308324031478890497/617806519488086056/810634944811368509)' WHERE check_id = 'LOT_1204';
UPDATE public.ac_loot SET notes_advice = 'This homebrew item was only obtainable as part of the [2021 Hawthorne Coliseum event](https://discord.com/channels/308324031478890497/617806519488086056/810634944811368509)' WHERE check_id = 'LOT_1205';
UPDATE public.ac_loot SET notes_advice = 'This homebrew item was only obtainable as part of the [2021 Hawthorne Coliseum event](https://discord.com/channels/308324031478890497/617806519488086056/810634944811368509)' WHERE check_id = 'LOT_1206';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by _badwolf_
- This homebrew item was only obtainable as part of the [2025 Wilds District Event](https://discord.com/channels/308324031478890497/1366928263452033074/1391891341390119034)' WHERE check_id = 'LOT_1207';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by _badwolf_
- This homebrew item was only obtainable as part of the [2025 Wilds District Event](https://discord.com/channels/308324031478890497/1366928263452033074/1389351479646883840)' WHERE check_id = 'LOT_1208';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by _badwolf_
- This homebrew item was only obtainable as part of the [2025 Wilds District Event](https://discord.com/channels/308324031478890497/1366928263452033074/1386791831303356489)' WHERE check_id = 'LOT_1209';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by salemalvian
- This homebrew item was only obtainable as part of the [2025 Rage of Dragons story season](https://discord.com/channels/308324031478890497/617806519488086056/1422641103840084119)' WHERE check_id = 'LOT_1210';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by salemalvian
- This homebrew item was only obtainable as part of the [2025 Rage of Dragons story season](https://discord.com/channels/308324031478890497/1366928263452033074/1415360706341109863)' WHERE check_id = 'LOT_1211';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by salemalvian
- This homebrew item was only obtainable as part of the [2025 Rage of Dragons story season](https://discord.com/channels/308324031478890497/1366928263452033074/1415360706341109863)' WHERE check_id = 'LOT_1212';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by salemalvian
- This homebrew item was only obtainable as part of the [2025 Rage of Dragons story season](https://discord.com/channels/308324031478890497/617806519488086056/1422641103840084119)' WHERE check_id = 'LOT_1213';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by salemalvian
- This homebrew item was only obtainable as part of the [2025 Rage of Dragons story season](https://discord.com/channels/308324031478890497/1366928263452033074/1421657900929122444)' WHERE check_id = 'LOT_1214';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by salemalvian
- This homebrew item was only obtainable as part of the [2025 Rage of Dragons story season](https://discord.com/channels/308324031478890497/1366928263452033074/1421657900929122444)' WHERE check_id = 'LOT_1215';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by salemalvian
- This homebrew item was only obtainable as part of the [2025 Rage of Dragons story season](https://discord.com/channels/308324031478890497/617806519488086056/1422641103840084119)' WHERE check_id = 'LOT_1216';
UPDATE public.ac_loot SET notes_advice = '- This homebrew trinket was created by salemalvian
- This homebrew trinket was only obtainable as part of the [2025 Rage of Dragons story season](https://discord.com/channels/308324031478890497/617806519488086056/1422641103840084119)' WHERE check_id = 'LOT_1217';
UPDATE public.ac_loot SET notes_advice = '- This homebrew Story Outcome was created by salemalvian
- This homebrew Story Outcome was only obtainable as part of the [2025 Rage of Dragons story season](https://discord.com/channels/308324031478890497/617806519488086056/1422641103840084119)' WHERE check_id = 'LOT_1218';
UPDATE public.ac_loot SET notes_advice = '- This homebrew Story Outcome was created by salemalvian
- This homebrew Story Outcome was only obtainable as part of the [2025 Rage of Dragons story season](https://discord.com/channels/308324031478890497/617806519488086056/1422641103840084119)' WHERE check_id = 'LOT_1219';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by 149thomas
- This homebrew item was only obtainable as part of the [2025 Founding Week event](https://discord.com/channels/308324031478890497/1366928263452033074/1395429732849422336)' WHERE check_id = 'LOT_1220';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by magurotoria
- This homebrew item was only obtainable as part of the [2025 Night of Black Knives event](https://discord.com/channels/308324031478890497/1366928263452033074/1412088472428089374)' WHERE check_id = 'LOT_1221';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was created by magurotoria
- This homebrew item was only obtainable as part of the [2025 Night of Black Knives event](https://discord.com/channels/308324031478890497/1366928263452033074/1412088472428089374)' WHERE check_id = 'LOT_1222';
UPDATE public.ac_loot SET notes_advice = '- This homebrew pet was created by magurotoria
- This homebrew pet was only obtainable as part of the [2025 Night of Black Knives event](https://discord.com/channels/308324031478890497/1366928263452033074/1412088472428089374)' WHERE check_id = 'LOT_1223';
UPDATE public.ac_loot SET notes_advice = '- This homebrew Story Outcome was created by magurotoria
- This homebrew Story Outcome was only obtainable as part of the [2025 Night of Black Knives event](https://discord.com/channels/308324031478890497/1366928263452033074/1412088472428089374)' WHERE check_id = 'LOT_1224';
UPDATE public.ac_loot SET notes_advice = 'This homebrew item was only obtainable as part of the [end of the 2025 Lionheart Legion Playtest](https://discord.com/channels/308324031478890497/617817659555446814/1445095319175037071)' WHERE check_id = 'LOT_1225';
UPDATE public.ac_loot SET notes_advice = 'This homebrew item was only obtainable as part of the [first phase of the 2025 Lionheart Legion Playtest](https://discord.com/channels/308324031478890497/617806519488086056/1406718331159052410)' WHERE check_id = 'LOT_1226';
UPDATE public.ac_loot SET notes_advice = '- This homebrew item was only obtainable as part of the [2025 Banner Contest 2: Electric Boogaloo](https://discord.com/channels/308324031478890497/617806519488086056/1409585608552353882) event
- This can''t be used during downtime, only during an adventure' WHERE check_id = 'LOT_1227';
UPDATE public.ac_loot SET notes_advice = 'This homebrew item was only obtainable as part of the [2025 Sky District event](https://discord.com/channels/308324031478890497/1366928263452033074/1450301034009460920)' WHERE check_id = 'LOT_1228';
UPDATE public.ac_loot SET notes_advice = 'This homebrew item was only obtainable as part of the [2025 Sky District event](https://discord.com/channels/308324031478890497/1366928263452033074/1450301034009460920)' WHERE check_id = 'LOT_1229';
UPDATE public.ac_loot SET notes_advice = 'This homebrew Story Outcome was only obtainable as part of the [2025 Sky District event](https://discord.com/channels/308324031478890497/1366928263452033074/1450301034009460920)' WHERE check_id = 'LOT_1230';
UPDATE public.ac_loot SET notes_advice = '- This homebrew pet was created by melowyny
- This homebrew pet was only obtainable as part of the [2026 Festival of Joy event](https://discord.com/channels/308324031478890497/1366928263452033074/1514468916666306591)' WHERE check_id = 'LOT_1231';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is greenjuice
- This homebrew item was initially obtainable as part of the [2022 Feast of the Moon event](https://discord.com/channels/308324031478890497/617806519488086056/1025633803663855647)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1232';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is buront
- This homebrew item was initially obtainable as part of the [2022 Feast of the Moon event](https://discord.com/channels/308324031478890497/617806519488086056/1025633803663855647)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1233';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is madeofmo1ecules
- This homebrew item was initially obtainable as part of the [2022 Feast of the Moon event](https://discord.com/channels/308324031478890497/617806519488086056/1025633803663855647)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1234';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is coconutswallow
- This homebrew item was initially obtainable as part of the [2025 Feast of the Moon event](https://discord.com/channels/308324031478890497/1366928263452033074/1422739981490847806)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1235';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is inkworks
- This homebrew item was initially obtainable as part of the [2022 Feast of the Moon event](https://discord.com/channels/308324031478890497/617806519488086056/1025633803663855647)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1236';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is hey_petrichor
- This homebrew item was initially obtainable as part of the [2025 Feast of the Moon event](https://discord.com/channels/308324031478890497/1366928263452033074/1422739981490847806)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1237';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is inkworks
- This homebrew item was initially obtainable as part of the [2022 Feast of the Moon event](https://discord.com/channels/308324031478890497/617806519488086056/1025633803663855647)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1238';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is rngsomeone
- This homebrew item was initially obtainable as part of the [2025 Feast of the Moon event](https://discord.com/channels/308324031478890497/1366928263452033074/1422739981490847806)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October
- A DM can predetermine up to 1 package of up to 4 sweets per item slot' WHERE check_id = 'LOT_1239';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is arles.
- This homebrew item was initially obtainable as part of the [2025 Feast of the Moon event](https://discord.com/channels/308324031478890497/1366928263452033074/1422739981490847806)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October
- A DM can predetermine up to 1 container of 5 leaves per item slot' WHERE check_id = 'LOT_1240';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is axion5412
- This homebrew item was initially obtainable as part of the [2022 Feast of the Moon event](https://discord.com/channels/308324031478890497/617806519488086056/1025633803663855647)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1241';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is lina304
- This homebrew item was initially obtainable as part of the [2025 Feast of the Moon event](https://discord.com/channels/308324031478890497/1366928263452033074/1422739981490847806)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1242';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is another_tiefling
- This homebrew item was initially obtainable as part of the [2025 Feast of the Moon event](https://discord.com/channels/308324031478890497/1366928263452033074/1422739981490847806)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1243';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is espy42
- This homebrew item was initially obtainable as part of the [2025 Feast of the Moon event](https://discord.com/channels/308324031478890497/1366928263452033074/1422739981490847806)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1244';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is myusernameisredacted
- This homebrew item was initially obtainable as part of the [2022 Feast of the Moon event](https://discord.com/channels/308324031478890497/617806519488086056/1025633803663855647)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1245';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is arles.
- This homebrew item was initially obtainable as part of the [2025 Feast of the Moon event](https://discord.com/channels/308324031478890497/1366928263452033074/1422739981490847806)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1246';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is .missklang
- This homebrew item was initially obtainable as part of the [2025 Feast of the Moon event](https://discord.com/channels/308324031478890497/1366928263452033074/1422739981490847806)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1247';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is diandra
- This homebrew item was initially obtainable as part of the [2025 Feast of the Moon event](https://discord.com/channels/308324031478890497/1366928263452033074/1422739981490847806)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1248';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is graxil
- This homebrew item was initially obtainable as part of the [2025 Feast of the Moon event](https://discord.com/channels/308324031478890497/1366928263452033074/1422739981490847806)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1249';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is .ravenshade
- This homebrew item was initially obtainable as part of the [2025 Feast of the Moon event](https://discord.com/channels/308324031478890497/1366928263452033074/1422739981490847806)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1250';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is _badwolf_
- This homebrew item was initially obtainable as part of the [2025 Feast of the Moon event](https://discord.com/channels/308324031478890497/1366928263452033074/1422739981490847806)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1251';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is geisterhund
- This homebrew item was initially obtainable as part of the [2025 Feast of the Moon event](https://discord.com/channels/308324031478890497/1366928263452033074/1422739981490847806)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1252';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is axion5412
- This homebrew item was initially obtainable as part of the [2022 Feast of the Moon event](https://discord.com/channels/308324031478890497/617806519488086056/1025633803663855647)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1253';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is axion5412
- This homebrew item was initially obtainable as part of the [2022 Feast of the Moon event](https://discord.com/channels/308324031478890497/617806519488086056/1025633803663855647)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1254';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is rexen
- This homebrew item was initially obtainable as part of the [2025 Feast of the Moon event](https://discord.com/channels/308324031478890497/1366928263452033074/1422739981490847806)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1255';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is scantion
- This homebrew item was initially obtainable as part of the [2025 Feast of the Moon event](https://discord.com/channels/308324031478890497/1366928263452033074/1422739981490847806)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1256';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is arles.
- This homebrew item was initially obtainable as part of the [2025 Feast of the Moon event](https://discord.com/channels/308324031478890497/1366928263452033074/1422739981490847806)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1257';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is myusernameisredacted
- This homebrew item was initially obtainable as part of the [2022 Feast of the Moon event](https://discord.com/channels/308324031478890497/617806519488086056/1025633803663855647)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1258';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is monoxideatwork
- This homebrew item was initially obtainable as part of the [2022 Feast of the Moon event](https://discord.com/channels/308324031478890497/617806519488086056/1025633803663855647)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1259';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is magurotoria
- This homebrew item was initially obtainable as part of the [2022 Feast of the Moon event](https://discord.com/channels/308324031478890497/617806519488086056/1025633803663855647)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1260';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is inkworks
- This homebrew item was initially obtainable as part of the [2022 Feast of the Moon event](https://discord.com/channels/308324031478890497/617806519488086056/1025633803663855647)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1261';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is tinyoctopus
- This homebrew item was initially obtainable as part of the [2022 Feast of the Moon event](https://discord.com/channels/308324031478890497/617806519488086056/1025633803663855647)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1262';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is axion5412
- This homebrew item was initially obtainable as part of the [2022 Feast of the Moon event](https://discord.com/channels/308324031478890497/617806519488086056/1025633803663855647)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1263';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is axion5412
- This homebrew item was initially obtainable as part of the [2022 Feast of the Moon event](https://discord.com/channels/308324031478890497/617806519488086056/1025633803663855647)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1264';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is scantion
- This homebrew item was initially obtainable as part of the [2025 Feast of the Moon event](https://discord.com/channels/308324031478890497/1366928263452033074/1422739981490847806)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1265';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is umm36
- This homebrew item was initially obtainable as part of the [2025 Feast of the Moon event](https://discord.com/channels/308324031478890497/1366928263452033074/1422739981490847806)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1266';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is devoodle
- This homebrew item was initially obtainable as part of the [2025 Feast of the Moon event](https://discord.com/channels/308324031478890497/1366928263452033074/1422739981490847806)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1267';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is _badwolf_
- This homebrew item was initially obtainable as part of the [2025 Feast of the Moon event](https://discord.com/channels/308324031478890497/1366928263452033074/1422739981490847806)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1268';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is espy42
- This homebrew item was initially obtainable as part of the [2025 Feast of the Moon event](https://discord.com/channels/308324031478890497/1366928263452033074/1422739981490847806)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1269';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is monoxideatwork
- This homebrew item was initially obtainable as part of the [2025 Feast of the Moon event](https://discord.com/channels/308324031478890497/1366928263452033074/1422739981490847806)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1270';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is myusernameisredacted
- This homebrew item was initially obtainable as part of the [2025 Feast of the Moon event](https://discord.com/channels/308324031478890497/1366928263452033074/1422739981490847806)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1271';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is lina304
- This homebrew item was initially obtainable as part of the [2025 Feast of the Moon event](https://discord.com/channels/308324031478890497/1366928263452033074/1422739981490847806)
- DMs can only drop this item as part of sessions ran during the Feast of the Moon event held during the calendar month of October' WHERE check_id = 'LOT_1272';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is .decoymantis.
- This homebrew item was initially obtainable as part of the [2026 Greengrass event](https://discord.com/channels/308324031478890497/1366928263452033074/1485992656453636277)
- This item can only be dropped as either crafted during or from sessions ran during the Greengrass event held during the calendar month of April' WHERE check_id = 'LOT_1273';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is axion5412
- This homebrew item was initially obtainable as part of the [2024 Greengrass event](https://discord.com/channels/308324031478890497/617806519488086056/1228869094569148466)
- DMs can only drop this item as part of sessions ran during the Greengrass event held during the calendar month of April' WHERE check_id = 'LOT_1274';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is bugcatchermafia
- This homebrew item was initially obtainable as part of the [2026 Greengrass event](https://discord.com/channels/308324031478890497/1366928263452033074/1485992656453636277)
- This item can only be dropped as either crafted during or from sessions ran during the Greengrass event held during the calendar month of April' WHERE check_id = 'LOT_1275';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is greenjuice
- This homebrew item was initially obtainable as part of the [2024 Greengrass event](https://discord.com/channels/308324031478890497/617806519488086056/1228869094569148466)
- DMs can only drop this item as part of sessions ran during the Greengrass event held during the calendar month of April' WHERE check_id = 'LOT_1276';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is greenjuice
- This homebrew item was initially obtainable as part of the [2024 Greengrass event](https://discord.com/channels/308324031478890497/617806519488086056/1228869094569148466)
- DMs can only drop this item as part of sessions ran during the Greengrass event held during the calendar month of April' WHERE check_id = 'LOT_1277';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is maymegglemay
- This homebrew item was initially obtainable as part of the [2026 Greengrass event](https://discord.com/channels/308324031478890497/1366928263452033074/1485992656453636277)
- This item can only be dropped as either crafted during or from sessions ran during the Greengrass event held during the calendar month of April' WHERE check_id = 'LOT_1278';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is maymegglemay
- This homebrew item was initially obtainable as part of the [2026 Greengrass event](https://discord.com/channels/308324031478890497/1366928263452033074/1485992656453636277)
- This item can only be dropped as either crafted during or from sessions ran during the Greengrass event held during the calendar month of April' WHERE check_id = 'LOT_1279';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is maymegglemay
- This homebrew item was initially obtainable as part of the [2026 Greengrass event](https://discord.com/channels/308324031478890497/1366928263452033074/1485992656453636277)
- This item can only be dropped as either crafted during or from sessions ran during the Greengrass event held during the calendar month of April
- A DM can predetermine up to 1 Memory Tea of Lanternbloom per item slot' WHERE check_id = 'LOT_1280';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is maymegglemay
- This homebrew item was initially obtainable as part of the [2026 Greengrass event](https://discord.com/channels/308324031478890497/1366928263452033074/1485992656453636277)
- This item can only be dropped as either crafted during or from sessions ran during the Greengrass event held during the calendar month of April' WHERE check_id = 'LOT_1281';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is peridot_cow
- This homebrew item was initially obtainable as part of the [2026 Greengrass event](https://discord.com/channels/308324031478890497/1366928263452033074/1485992656453636277)
- This item can only be dropped as either crafted during or from sessions ran during the Greengrass event held during the calendar month of April' WHERE check_id = 'LOT_1282';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is monoxideatwork
- This homebrew item was initially obtainable as part of the [2024 Greengrass event](https://discord.com/channels/308324031478890497/617806519488086056/1228869094569148466)
- DMs can only drop this item as part of sessions ran during the Greengrass event held during the calendar month of April' WHERE check_id = 'LOT_1283';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is tinyoctopus
- This homebrew item was initially obtainable as part of the [2024 Greengrass event](https://discord.com/channels/308324031478890497/617806519488086056/1228869094569148466)
- DMs can only drop this item as part of sessions ran during the Greengrass event held during the calendar month of April' WHERE check_id = 'LOT_1284';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is bugcatchermafia
- This homebrew item was initially obtainable as part of the [2026 Greengrass event](https://discord.com/channels/308324031478890497/1366928263452033074/1485992656453636277)
- This item can only be dropped as either crafted during or from sessions ran during the Greengrass event held during the calendar month of April' WHERE check_id = 'LOT_1285';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is _badwolf_
- This homebrew item was initially obtainable as part of the [2026 Greengrass event](https://discord.com/channels/308324031478890497/1366928263452033074/1485992656453636277)
- This item can only be dropped as either crafted during or from sessions ran during the Greengrass event held during the calendar month of April' WHERE check_id = 'LOT_1286';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is maymegglemay
- This homebrew item was initially obtainable as part of the [2026 Greengrass event](https://discord.com/channels/308324031478890497/1366928263452033074/1485992656453636277)
- This item can only be dropped as either crafted during or from sessions ran during the Greengrass event held during the calendar month of April' WHERE check_id = 'LOT_1287';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is dylanham
- This homebrew item was only obtainable as part of the [2026 Greengrass event](https://discord.com/channels/308324031478890497/1366928263452033074/1485992656453636277)
- This item can only be claimed by a DM of the 2026 Greengrass event or a participant of the 2026 Grassmash' WHERE check_id = 'LOT_1288';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is axion5412
- This homebrew item was initially obtainable as part of the [2024 Greengrass event](https://discord.com/channels/308324031478890497/617806519488086056/1228869094569148466)
- DMs can only drop this item as part of sessions ran during the Greengrass event held during the calendar month of April' WHERE check_id = 'LOT_1289';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is monoxideatwork
- This homebrew item was initially obtainable as part of the [2024 Greengrass event](https://discord.com/channels/308324031478890497/617806519488086056/1228869094569148466)
- DMs can only drop this item as part of sessions ran during the Greengrass event held during the calendar month of April' WHERE check_id = 'LOT_1290';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is tinyoctopus
- This homebrew item was initially obtainable as part of the [2024 Greengrass event](https://discord.com/channels/308324031478890497/617806519488086056/1228869094569148466)
- DMs can only drop this item as part of sessions ran during the Greengrass event held during the calendar month of April' WHERE check_id = 'LOT_1291';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is weiling8978
- This homebrew item was only obtainable as part of the [2026 Greengrass event](https://discord.com/channels/308324031478890497/1366928263452033074/1485992656453636277)
- This item can only be claimed by a DM of the 2026 Greengrass event or a participant of the 2026 Grassmash' WHERE check_id = 'LOT_1292';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is peridot_cow
- This homebrew item was only obtainable as part of the [2026 Greengrass event](https://discord.com/channels/308324031478890497/1366928263452033074/1485992656453636277)
- This item can only be claimed by a DM of the 2026 Greengrass event or a participant of the 2026 Grassmash' WHERE check_id = 'LOT_1293';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is axion5412
- This homebrew item was initially obtainable as part of the [2024 Greengrass event](https://discord.com/channels/308324031478890497/617806519488086056/1228869094569148466)
- DMs can only drop this item as part of sessions ran during the Greengrass event held during the calendar month of April' WHERE check_id = 'LOT_1294';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is _badwolf_
- This homebrew item was only obtainable as part of the [2026 Greengrass event](https://discord.com/channels/308324031478890497/1366928263452033074/1485992656453636277)
- This item can only be claimed by a DM of the 2026 Greengrass event or a participant of the 2026 Grassmash' WHERE check_id = 'LOT_1295';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is jackthebunnyowo
- This homebrew item was only obtainable as part of the [2026 Greengrass event](https://discord.com/channels/308324031478890497/1366928263452033074/1485992656453636277)
- This item can only be claimed by a DM of the 2026 Greengrass event or a participant of the 2026 Grassmash' WHERE check_id = 'LOT_1296';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is melowyny
- This homebrew item was only obtainable as part of the [2026 Greengrass event](https://discord.com/channels/308324031478890497/1366928263452033074/1485992656453636277)
- This item can only be claimed by a DM of the 2026 Greengrass event or a participant of the 2026 Grassmash' WHERE check_id = 'LOT_1297';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is axion5412
- This homebrew item was initially obtainable as part of the [2024 Greengrass event](https://discord.com/channels/308324031478890497/617806519488086056/1228869094569148466)
- DMs can only drop this item as part of sessions ran during the Greengrass event held during the calendar month of April' WHERE check_id = 'LOT_1298';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is axion5412
- This homebrew item was initially obtainable as part of the [2024 Greengrass event](https://discord.com/channels/308324031478890497/617806519488086056/1228869094569148466)
- DMs can only drop this item as part of sessions ran during the Greengrass event held during the calendar month of April' WHERE check_id = 'LOT_1299';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is monoxideatwork and myusernameisredacted
- This homebrew item was initially obtainable as part of the [2024 Greengrass event](https://discord.com/channels/308324031478890497/617806519488086056/1228869094569148466)
- DMs can only drop this item as part of sessions ran during the Greengrass event held during the calendar month of April' WHERE check_id = 'LOT_1300';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is .ravenshade
- This homebrew item was only obtainable as part of the [2026 Greengrass event](https://discord.com/channels/308324031478890497/1366928263452033074/1485992656453636277)
- This item can only be claimed by a DM of the 2026 Greengrass event or a participant of the 2026 Grassmash' WHERE check_id = 'LOT_1301';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is magurotoria
- This homebrew item was initially obtainable as part of the [2024 Greengrass event](https://discord.com/channels/308324031478890497/617806519488086056/1228869094569148466)
- DMs can only drop this item as part of sessions ran during the Greengrass event held during the calendar month of April' WHERE check_id = 'LOT_1302';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is beezyboo
- This homebrew item was only obtainable as part of the [2026 Greengrass event](https://discord.com/channels/308324031478890497/1366928263452033074/1485992656453636277)
- This item can only be claimed by a DM of the 2026 Greengrass event or a participant of the 2026 Grassmash' WHERE check_id = 'LOT_1303';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is tinyoctopus
- This homebrew item was initially obtainable as part of the [2024 Greengrass event](https://discord.com/channels/308324031478890497/617806519488086056/1228869094569148466)
- DMs can only drop this item as part of sessions ran during the Greengrass event held during the calendar month of April' WHERE check_id = 'LOT_1304';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is _badwolf_
- This homebrew item was only obtainable as part of the [2026 Greengrass event](https://discord.com/channels/308324031478890497/1366928263452033074/1485992656453636277)
- This item can only be claimed by a DM of the 2026 Greengrass event or a participant of the 2026 Grassmash' WHERE check_id = 'LOT_1305';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is tinyoctopus
- This homebrew item was initially obtainable as part of the [2024 Greengrass event](https://discord.com/channels/308324031478890497/617806519488086056/1228869094569148466)
- DMs can only drop this item as part of sessions ran during the Greengrass event held during the calendar month of April' WHERE check_id = 'LOT_1306';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is arles.
- This homebrew item was only obtainable as part of the [2026 Greengrass event](https://discord.com/channels/308324031478890497/1366928263452033074/1485992656453636277)
- This item can only be claimed by a DM of the 2026 Greengrass event or a participant of the 2026 Grassmash' WHERE check_id = 'LOT_1307';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is maymegglemay
- This homebrew item was initially obtainable as part of the [2026 Greengrass event](https://discord.com/channels/308324031478890497/1366928263452033074/1485992656453636277)
- This item can only be dropped as either crafted during or from sessions ran during the Greengrass event held during the calendar month of April' WHERE check_id = 'LOT_1308';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is maymegglemay
- This homebrew item was initially obtainable as part of the [2026 Greengrass event](https://discord.com/channels/308324031478890497/1366928263452033074/1485992656453636277)
- This item can only be dropped as either crafted during or from sessions ran during the Greengrass event held during the calendar month of April' WHERE check_id = 'LOT_1309';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is maymegglemay
- This homebrew item was initially obtainable as part of the [2026 Greengrass event](https://discord.com/channels/308324031478890497/1366928263452033074/1485992656453636277)
- This item can only be dropped as either crafted during or from sessions ran during the Greengrass event held during the calendar month of April' WHERE check_id = 'LOT_1310';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is salah_ad_din
- This homebrew item was initially obtainable as part of the [2025 Midwinter Miracle event](https://discord.com/channels/308324031478890497/1366928263452033074/1445106644697616446)
- DMs can only drop this item as part of sessions ran during the Midwinter event held during the calendar months of December or January' WHERE check_id = 'LOT_1311';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is aloricvonvelmon
- This homebrew item was initially obtainable as part of the [2025 Midwinter Miracle event](https://discord.com/channels/308324031478890497/1366928263452033074/1445106644697616446)
- DMs can only drop this item as part of sessions ran during the Midwinter event held during the calendar months of December or January' WHERE check_id = 'LOT_1312';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is espy42
- This homebrew item was initially obtainable as part of the [2020 X-Mash / Midwinter event](https://discord.com/channels/308324031478890497/617806519488086056/785630065424990218)
- DMs can only drop this item as part of sessions ran during the Midwinter event held during the calendar months of December or January' WHERE check_id = 'LOT_1313';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is melowyny
- This homebrew item was initially obtainable as part of the [2025 Midwinter Miracle event](https://discord.com/channels/308324031478890497/1366928263452033074/1445106644697616446)
- DMs can only drop this item as part of sessions ran during the Midwinter event held during the calendar months of December or January' WHERE check_id = 'LOT_1314';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is greensprout
- This homebrew item was initially obtainable as part of the [2020 X-Mash / Midwinter event](https://discord.com/channels/308324031478890497/617806519488086056/785630065424990218)
- DMs can only drop this item as part of sessions ran during the Midwinter event held during the calendar months of December or January' WHERE check_id = 'LOT_1315';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is umm36
- This homebrew item was initially obtainable as part of the [2025 Midwinter Miracle event](https://discord.com/channels/308324031478890497/1366928263452033074/1445106644697616446)
- DMs can only drop this item as part of sessions ran during the Midwinter event held during the calendar months of December or January
- A DM can predetermine up to 1 Jingle Hat of Untimidation per item slot' WHERE check_id = 'LOT_1316';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is temmiechaoslight
- This homebrew item was initially obtainable as part of the [2025 Midwinter Miracle event](https://discord.com/channels/308324031478890497/1366928263452033074/1445106644697616446)
- DMs can only drop this item as part of sessions ran during the Midwinter event held during the calendar months of December or January' WHERE check_id = 'LOT_1317';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is bugcatchermafia
- This homebrew item was initially obtainable as part of the [2025 Midwinter Miracle event](https://discord.com/channels/308324031478890497/1366928263452033074/1445106644697616446)
- DMs can only drop this item as part of sessions ran during the Midwinter event held during the calendar months of December or January' WHERE check_id = 'LOT_1318';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is rngsomeone
- This homebrew item was initially obtainable as part of the [2025 Midwinter Miracle event](https://discord.com/channels/308324031478890497/1366928263452033074/1445106644697616446)
- DMs can only drop this item as part of sessions ran during the Midwinter event held during the calendar months of December or January' WHERE check_id = 'LOT_1319';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is daveeee
- This homebrew item was initially obtainable as part of the [2025 Midwinter Miracle event](https://discord.com/channels/308324031478890497/1366928263452033074/1445106644697616446)
- DMs can only drop this item as part of sessions ran during the Midwinter event held during the calendar months of December or January' WHERE check_id = 'LOT_1320';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is myusernameisredacted
- This homebrew item was initially obtainable as part of the [2020 X-Mash / Midwinter event](https://discord.com/channels/308324031478890497/617806519488086056/785630065424990218)
- DMs can only drop this item as part of sessions ran during the Midwinter event held during the calendar months of December or January' WHERE check_id = 'LOT_1321';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is bugcatchermafia
- This homebrew item was initially obtainable as part of the [2025 Midwinter Miracle event](https://discord.com/channels/308324031478890497/1366928263452033074/1445106644697616446)
- DMs can only drop this item as part of sessions ran during the Midwinter event held during the calendar months of December or January' WHERE check_id = 'LOT_1322';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is .missklang
- This homebrew item was initially obtainable as part of the [2025 Midwinter Miracle event](https://discord.com/channels/308324031478890497/1366928263452033074/1445106644697616446)
- DMs can only drop this item as part of sessions ran during the Midwinter event held during the calendar months of December or January' WHERE check_id = 'LOT_1323';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is magurotoria
- This homebrew item was initially obtainable as part of the [2020 X-Mash / Midwinter event](https://discord.com/channels/308324031478890497/617806519488086056/785630065424990218)
- DMs can only drop this item as part of sessions ran during the Midwinter event held during the calendar months of December or January' WHERE check_id = 'LOT_1324';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is salah_ad_din
- This homebrew item was initially obtainable as part of the [2025 Midwinter Miracle event](https://discord.com/channels/308324031478890497/1366928263452033074/1445106644697616446)
- DMs can only drop this item as part of sessions ran during the Midwinter event held during the calendar months of December or January' WHERE check_id = 'LOT_1325';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is bugcatchermafia
- This homebrew item was initially obtainable as part of the [2025 Midwinter Miracle event](https://discord.com/channels/308324031478890497/1366928263452033074/1445106644697616446)
- DMs can only drop this item as part of sessions ran during the Midwinter event held during the calendar months of December or January' WHERE check_id = 'LOT_1326';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is _badwolf_
- DMs can only drop this item as part of sessions ran during the Midwinter event held during the calendar months of December or January' WHERE check_id = 'LOT_1327';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is _badwolf_
- This homebrew item was initially obtainable as part of the [2025 Midwinter Miracle event](https://discord.com/channels/308324031478890497/1366928263452033074/1445106644697616446)
- DMs can only drop this item as part of sessions ran during the Midwinter event held during the calendar months of December or January
- This item cannot be used in downtime' WHERE check_id = 'LOT_1328';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is angelfaux
- This homebrew item was initially obtainable as part of the [2025 Midwinter Miracle event](https://discord.com/channels/308324031478890497/1366928263452033074/1445106644697616446)
- DMs can only drop this item as part of sessions ran during the Midwinter event held during the calendar months of December or January' WHERE check_id = 'LOT_1329';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is monoxideatwork
- This homebrew item was initially obtainable as part of the [2020 X-Mash / Midwinter event](https://discord.com/channels/308324031478890497/617806519488086056/785630065424990218)
- DMs can only drop this item as part of sessions ran during the Midwinter event held during the calendar months of December or January' WHERE check_id = 'LOT_1330';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is monoxideatwork
- This homebrew item was initially obtainable as part of the [2025 Midwinter Miracle event](https://discord.com/channels/308324031478890497/1366928263452033074/1445106644697616446)
- DMs can only drop this item as part of sessions ran during the Midwinter event held during the calendar months of December or January' WHERE check_id = 'LOT_1331';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is salemalvian
- This homebrew item was initially obtainable as part of the [2025 Midwinter Miracle event](https://discord.com/channels/308324031478890497/1366928263452033074/1445106644697616446)
- DMs can only drop this item as part of sessions ran during the Midwinter event held during the calendar months of December or January' WHERE check_id = 'LOT_1332';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is _badwolf_
- This homebrew item was initially obtainable as part of the [2020 X-Mash / Midwinter event](https://discord.com/channels/308324031478890497/617806519488086056/785630065424990218)
- DMs can only drop this item as part of sessions ran during the Midwinter event held during the calendar months of December or January' WHERE check_id = 'LOT_1333';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is _badwolf_
- This homebrew item was initially obtainable as part of the [2025 Midwinter Miracle event](https://discord.com/channels/308324031478890497/1366928263452033074/1445106644697616446)
- DMs can only drop this item as part of sessions ran during the Midwinter event held during the calendar months of December or January' WHERE check_id = 'LOT_1334';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is rexen
- This homebrew item was initially obtainable as part of the [2020 X-Mash / Midwinter event](https://discord.com/channels/308324031478890497/617806519488086056/785630065424990218)
- DMs can only drop this item as part of sessions ran during the Midwinter event held during the calendar months of December or January' WHERE check_id = 'LOT_1335';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is melowyny
- This homebrew item was initially obtainable as part of the [2025 Midwinter Miracle event](https://discord.com/channels/308324031478890497/1366928263452033074/1445106644697616446)
- DMs can only drop this item as part of sessions ran during the Midwinter event held during the calendar months of December or January' WHERE check_id = 'LOT_1336';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is jender27
- This homebrew item was initially obtainable as part of the [2020 X-Mash / Midwinter event](https://discord.com/channels/308324031478890497/617806519488086056/785630065424990218)
- DMs can only drop this item as part of sessions ran during the Midwinter event held during the calendar months of December or January' WHERE check_id = 'LOT_1337';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is krwn5327
- This homebrew item was initially obtainable as part of the [2025 Midwinter Miracle event](https://discord.com/channels/308324031478890497/1366928263452033074/1445106644697616446)
- DMs can only drop this item as part of sessions ran during the Midwinter event held during the calendar months of December or January' WHERE check_id = 'LOT_1338';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is cust.
- This homebrew item was initially obtainable as part of the [2025 Midwinter Miracle event](https://discord.com/channels/308324031478890497/1366928263452033074/1445106644697616446)
- DMs can only drop this item as part of sessions ran during the Midwinter event held during the calendar months of December or January' WHERE check_id = 'LOT_1339';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is rexen
- This homebrew item was initially obtainable as part of the [2025 Midwinter Miracle event](https://discord.com/channels/308324031478890497/1366928263452033074/1445106644697616446)
- DMs can only drop this item as part of sessions ran during the Midwinter event held during the calendar months of December or January' WHERE check_id = 'LOT_1340';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is naoe45
- This homebrew item was initially obtainable as part of the [2025 Midwinter Miracle event](https://discord.com/channels/308324031478890497/1366928263452033074/1445106644697616446)
- DMs can only drop this item as part of sessions ran during the Midwinter event held during the calendar months of December or January' WHERE check_id = 'LOT_1341';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is salah_ad_din
- This homebrew item was initially obtainable as part of the [2025 Midwinter Miracle event](https://discord.com/channels/308324031478890497/1366928263452033074/1445106644697616446)
- DMs can only drop this item as part of sessions ran during the Midwinter event held during the calendar months of December or January' WHERE check_id = 'LOT_1342';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is myusernameisredacted
- This homebrew item was initially obtainable as part of the [2025 Midwinter Miracle event](https://discord.com/channels/308324031478890497/1366928263452033074/1445106644697616446)
- DMs can only drop this item as part of sessions ran during the Midwinter event held during the calendar months of December or January' WHERE check_id = 'LOT_1343';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is shaunuthun
- This homebrew item was initially obtainable as part of the [2020 X-Mash / Midwinter event](https://discord.com/channels/308324031478890497/617806519488086056/785630065424990218)
- DMs can only drop this item as part of sessions ran during the Midwinter event held during the calendar months of December or January' WHERE check_id = 'LOT_1344';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is tinyoctopus
- This homebrew item was initially obtainable as part of the [2020 X-Mash / Midwinter event](https://discord.com/channels/308324031478890497/617806519488086056/785630065424990218)
- DMs can only drop this item as part of sessions ran during the Midwinter event held during the calendar months of December or January' WHERE check_id = 'LOT_1345';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is killerspy7
- This homebrew item was initially obtainable as part of the [2020 X-Mash / Midwinter event](https://discord.com/channels/308324031478890497/617806519488086056/785630065424990218)
- DMs can only drop this item as part of sessions ran during the Midwinter event held during the calendar months of December or January' WHERE check_id = 'LOT_1346';
UPDATE public.ac_loot SET notes_advice = '- The creator of this homebrew item is grayel_longarm and user_name_10
- This homebrew item was initially obtainable as part of the [2025 Midwinter Miracle event](https://discord.com/channels/308324031478890497/1366928263452033074/1445106644697616446)
- DMs can only drop this item as part of sessions ran during the Midwinter event held during the calendar months of December or January' WHERE check_id = 'LOT_1347';
UPDATE public.ac_loot SET notes_advice = '- A DM must submit a Rules request to drop a specific official item in an adventure.
- Bear in mind the reasons listed above. If the item is unique to an official adventure, it will typically require running that adventure to drop.
- If the item is a unique item such as an artifact, it will be determined if the item is appropriate for use by a PC in the server''s shared persistent world and will be tiered accordingly. Most artifacts will typically be Tier S.
- A DM may be asked to provide an outline describing how the item is meant to be acquired.' WHERE check_id = 'LOT_1348';
UPDATE public.ac_loot SET notes_advice = '- The DM should refer to existing 5e magic items to either use as a starting point for their homebrew item or to help inform how the item is designed.
- The DM may be asked to provide an outline describing how the item is meant to be acquired.
- The item follows the normal distribution rules for items on the server. If the item is determined to be multisession loot of a given tier, the DM must run a multisession of the required minimum APL and number of sessions.
- With a DM’s consent, an approved homebrew item can be added as loot to this document to allow that DM and other DMs to award that item without the need for future requests.' WHERE check_id = 'LOT_1349';
UPDATE public.ac_loot SET notes_advice = 'This item references a mechanic for firearms that is no longer used on the server. The item functionally is a +1 weapon that requires attunement.' WHERE check_id = 'LOT_1350';
UPDATE public.ac_loot SET notes_advice = 'This item references a mechanic for firearms that is no longer used on the server. The item functionally is a magic weapon with no other properties.' WHERE check_id = 'LOT_1351';
UPDATE public.ac_loot SET notes_advice = 'This item cannot be crafted and cannot be created by Tasha''s Bubbling Cauldron or other effects.' WHERE check_id = 'LOT_1352';
UPDATE public.ac_loot SET notes_advice = 'All instances of this legacy item were placed with the Returning Weapon' WHERE check_id = 'LOT_1353';
UPDATE public.ac_loot SET notes_advice = 'All instances of this legacy item were placed with the Returning Weapon' WHERE check_id = 'LOT_1354';
UPDATE public.ac_loot SET notes_advice = 'All instances of this legacy item were placed with the +2 Returning Weapon (HB)' WHERE check_id = 'LOT_1355';
UPDATE public.ac_loot SET notes_advice = 'All instances of this legacy item were placed with the +3 Returning Weapon (HB)' WHERE check_id = 'LOT_1356';
COMMIT;
