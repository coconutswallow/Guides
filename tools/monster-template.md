---
layout: statblock
title: Creature Name
cr: 5
size: Medium
type: Beast
alignment: Unaligned
category: 2014 Fair Game
creator: Your Name
image: 
image_credit: 
---

## Creature Name

Optional lore description goes here. Each paragraph should be separated by a blank line.

This is a second paragraph of lore. You can include multiple paragraphs.

### Subheading in Lore

You can use subheadings to organize lore sections.

More lore content here.

___
> ## Creature Name
> *Medium beast, unaligned*
>
> **Armor Class** 13 (natural armor)  
> **Hit Points** 45 (6d8 + 18)  
> **Speed** 30 ft., swim 30 ft.
>
> | STR | DEX | CON | INT | WIS | CHA |
> |:---:|:---:|:---:|:---:|:---:|:---:|
> | 16 (+3) | 12 (+1) | 16 (+3) | 3 (-4) | 12 (+1) | 6 (-2) |
>
> **Saving Throws** Str +5, Con +5  
> **Skills** Perception +3, Stealth +3  
> **Damage Resistances** cold  
> **Damage Immunities** poison  
> **Condition Immunities** poisoned  
> **Senses** darkvision 60 ft., passive Perception 13  
> **Languages** —  
> **Challenge** 5 (1,800 XP) **Proficiency Bonus** +3
>
> ### Traits
>
> ***Amphibious.*** The creature can breathe air and water.
>
> ***Keen Smell.*** The creature has advantage on Wisdom (Perception) checks that rely on smell.
>
> ### Actions
>
> ***Multiattack.*** The creature makes two attacks: one with its bite and one with its claws.
>
> ***Bite.*** *Melee Weapon Attack:* +5 to hit, reach 5 ft., one target. *Hit:* 10 (2d6 + 3) piercing damage.
>
> ***Claws.*** *Melee Weapon Attack:* +5 to hit, reach 5 ft., one target. *Hit:* 7 (1d8 + 3) slashing damage.
>
> ### Bonus Actions
>
> ***Agile Movement.*** The creature takes the Dash or Disengage action.
>
> ### Reactions
>
> ***Protective Strike.*** When an ally within 5 feet of the creature is hit by an attack, the creature can make one melee attack against the attacker.
>
> ### Legendary Actions
>
> The creature can take 3 legendary actions, choosing from the options below. Only one legendary action can be used at a time and only at the end of another creature's turn. The creature regains spent legendary actions at the start of its turn.
>
> ***Detect.*** The creature makes a Wisdom (Perception) check.
>
> ***Move.*** The creature moves up to its speed without provoking opportunity attacks.
>
> ***Attack (Costs 2 Actions).*** The creature makes one attack.
>
> ### Lair Actions
>
> On initiative count 20 (losing initiative ties), the creature can take one of the following lair actions; the creature can't use the same lair action two rounds in a row:
>
> - The creature creates a 20-foot-radius sphere of magical darkness centered on a point it can see within 120 feet of it. The darkness lasts until initiative count 20 on the next round.
> - The creature causes the ground in a 20-foot radius centered on a point it can see within 120 feet to become difficult terrain until initiative count 20 on the next round.
>
> ### Regional Effects
>
> The region containing the creature's lair is warped by its presence, which creates one or more of the following effects:
>
> - Water sources within 1 mile of the lair are supernaturally fouled. Enemies of the creature that drink such water regurgitate it within minutes.
> - Plants within 1 mile of the lair grow thick and twisted, and the area is lightly obscured by fog.
>
> If the creature dies, these effects fade over the course of 1d10 days.

---

## PARSER DOCUMENTATION

### Parsing Rules for Standardized Format

#### Front Matter
```javascript
// Extract YAML between --- markers
const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
// Parse each line as key: value
```

#### Lore Section
```javascript
// Everything between "## Title" and "___"
const loreMatch = content.match(/## [^\n]+\n\n([\s\S]*?)\n___/);
```

#### Ability Scores
```javascript
// Parse table row with pattern: | 16 (+3) | 12 (+1) | ...
const abilityMatch = content.match(/\|\s*(\d+)\s*\([^)]+\)\s*\|/g);
// Extract: STR=16, DEX=12, etc.
```

#### Basic Stats
```javascript
// Pattern: **Field Name** value
const acMatch = content.match(/\*\*Armor Class\*\*\s+(.+?)(?=\s*\*\*|\n)/);
const hpMatch = content.match(/\*\*Hit Points\*\*\s+(.+?)(?=\s*\*\*|\n)/);
```

#### Saving Throws
```javascript
// Pattern: **Saving Throws** Str +5, Con +5
const savesMatch = content.match(/\*\*Saving Throws\*\*\s+(.+)/);
// Split by comma, parse each save
```

#### Abilities (Traits/Actions/etc)
```javascript
// Pattern: ***Name.*** Description
const abilityRegex = /\*\*\*([^.]+)\.\*\*\*\s+([^\n]+(?:\n(?!\*\*\*)[^\n]+)*)/g;
```

#### Legendary Actions Description
```javascript
// First paragraph after "### Legendary Actions" before first ***
const descMatch = content.match(/### Legendary Actions\n>\n>\s*(.+?)(?=\n>\n>\s*\*\*\*)/s);
```

#### Lair Actions / Regional Effects
```javascript
// Everything between heading and next ### or end
const lairMatch = content.match(/### Lair Actions\n>([\s\S]*?)(?=\n>\s*###|$)/);
```