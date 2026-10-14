---
layout: doc
title: Monster Compendium & Editor
order: 34
exclude_from_search: true
---

# Monster Compendium, Creator & Approvals

The Monster Compendium is a dynamic Single Page Application (SPA) powered by Supabase PostgreSQL that provides a searchable monster library, dynamic 5e statblock calculation, an interactive monster creator, and a staff approval queue.

---

## 1. Architecture & Workflow

- **URL Base:** [`/field-guide/monsters/`](/Guides/field-guide/monsters/)
- **Database Driven:** Monsters and features are queried from Supabase `monsters` and `monster_features` tables.
- **Client-Side Stat Calculations:** Ability score modifiers, Proficiency Bonus (derived from Challenge Rating), XP values, and passive perception are computed dynamically in the browser.
- **SPA Routing:** Operates with hash-based routing between the monster library grid and the detailed stat block view.

---

## 2. Key Interfaces

### 1. Monster Compendium Library
- **Path:** `/field-guide/monsters/index.html`
- **Features:** Instant filtering by CR range, monster type, size, alignment, search query, and environment.

### 2. Monster Editor / Creator
- **Path:** `/field-guide/monsters/editor.html`
- **Logic:** `assets/js/monster/monster-editor.js`
- **Capabilities:**
  - Real-time statblock preview as fields are entered.
  - Auto-calculates saving throws, skill proficiencies, and hit dice math based on CR and Constitution.
  - Action, bonus action, reaction, and legendary action builder.
  - Form validations and submission directly to Supabase with draft/review statuses.

### 3. Monster Submissions Approval Queue
- **Path:** `/field-guide/monsters/approvals.html`
- **Access:** Staff, Staff Apprentice, Admin, Engineer.
- **Capabilities:** Review submitted homebrew monsters, inspect statblock balance, suggest revisions, approve for guild play, or reject with feedback.

---

## 3. Database Schema

- **`monsters`:** Core monster attributes (name, size, type, subtype, alignment, armor_class, hit_points, speed, str, dex, con, int, wis, cha, cr, senses, languages, is_approved).
- **`monster_features`:** Actions, traits, legendary actions, and spellcasting blocks associated via `monster_id`.
- **Allowed Content Integration:** `assets/js/allowed-content/ac-monsters.js` allows configuring monsters for encounter guidelines, wild shape, and familiar lists.