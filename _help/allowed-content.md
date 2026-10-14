---
layout: doc
title: "Allowed Content Architecture"
order: 30
exclude_from_search: true
---

# Allowed Content Architecture & Data Schema

The **Allowed Content (AC)** system is Hawthorne Guild's comprehensive database and reference catalog for all character creation options, equipment, rules, and world mechanics. It supports both the **2014** and **2024** rulesets, as well as **Official** and **Homebrew** content.

---

## 1. System Overview

Allowed Content operates as a dynamic, client-side Single Page Application (SPA) backed by **Supabase PostgreSQL** and vanilla ES6 modules:

- **Database:** 32 normalized tables and views in PostgreSQL (`public.ac_*`).
- **Data Access Layer:** `assets/js/allowed-content/ac-service.js` manages caching, joined lookups, and CRUD operations.
- **Role-Based Permissions:** `assets/js/allowed-content/ac-auth.js` enforces role checks (`Admin`, `Engineer`, `Auditor`).
- **Interactive Schema & ERD:** Located at `/staff/ac-schema/` for real-time visualization of tables, fields, and foreign keys.

---

## 2. Table Domains & Architecture

Allowed Content tables are divided into logical domains:

| Domain | Primary Tables & Views | Key Responsibilities |
| :--- | :--- | :--- |
| **Sources** | `ac_sources`, `ac_sources_view` | Core rulebooks, supplements, third-party publishers, and homebrew sources. |
| **Character Options** | `ac_races`, `ac_classes`, `ac_subclasses`, `ac_backgrounds`, `ac_feats` | Species, lineages, class progressions, subclasses, backgrounds, and feats. |
| **Magic & Spells** | `ac_spells`, `ac_spell_classes`, `ac_spell_subclasses` | Spell definitions, spell list mappings per class/subclass, ritual/concentration flags. |
| **Equipment & Loot** | `ac_equipment`, `ac_item_properties`, `ac_items`, `ac_loot`, `ac_other_rewards` | Weapons, armor, gear, property tags, magic item drops, and server rewards. |
| **Bastions & Downtime** | `ac_bastion`, `ac_bastion_type`, `ac_downtime`, `ac_downtime_categories` | 2024 bastion facilities, facility categories, and server downtime activities. |
| **Monsters & World** | `ac_monsters`, `ac_languages` | Compendium monsters integrated into Allowed Content and server languages. |

---

## 3. Frontend Architecture

The frontend is modularized in `assets/js/allowed-content/`:

```
assets/js/allowed-content/
├── ac-main.js                  # Main controller, tab registration & routing
├── ac-service.js               # Central Supabase data access layer & caching
├── ac-auth.js                  # Role verification (canManageAC, canAuditAC)
├── ac-order-utils.js           # check_id and placement ordering calculations
├── ac-schema-viewer.js         # Interactive SVG ERD, data dictionary & Mermaid generator
├── ac-schema-data.js           # Pre-compiled database schema metadata
├── ac-sources.js               # Sources tab module
├── ac-races.js                 # Species & lineages tab module
├── ac-classes.js               # Classes & subclasses tab module
├── ac-backgrounds.js           # Backgrounds tab module
├── ac-feats.js                 # Feats tab module
├── ac-spells.js                # Spells tab module
├── ac-equipment.js             # Equipment tab module
├── ac-item-properties.js       # Item properties tab module
├── ac-bastions.js              # Bastions tab module
├── ac-downtime.js              # Downtime activities tab module
├── ac-other-rewards.js         # Other rewards tab module
├── ac-loot.js                  # Loot tab module
└── ac-languages.js             # Languages tab module
```

---

## 4. Staff Admin & Workflow

Staff members with `Admin` or `Engineer` roles can manage content directly on `/allowed-content/?admin=true`:

1. **Authentication:** Uses Discord OAuth via `assets/js/auth-check.js`.
2. **Add / Edit / Delete:** Modal dialogs allow updating records without leaving the page.
3. **Sequencing (`check_id`):** New items automatically calculate their next sequential `check_id` per sourcebook using `ac-order-utils.js`.
4. **Auditor Mode:** Users with the `Auditor` role can review rulings, verify ruleset tags, and add advisory notes.

---

## 5. Schema & Interactive ERD Tool

To understand the relational structure, refer to the **Allowed Content Schema & ERD** page at:

**[`/staff/ac-schema/`](/Guides/staff/ac-schema/)**

Features:
- **Interactive Vector Canvas:** Pan, zoom, and drag table cards.
- **Auto-Focus Zoom:** Filter pill clicks automatically pan and zoom to the first matching table.
- **Searchable Data Dictionary:** Search across table names, column names, data types, and PostgreSQL descriptions.
- **Mermaid Exporter:** One-click generation of Mermaid ERD markup for documentation and GitHub issues.
- **Metadata Generator:** Built via `supabase/migrations/generate_ac_schema_metadata.js`, pulling table and column comments directly from `pg_description`.
