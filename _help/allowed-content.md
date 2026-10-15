---
layout: doc
title: "Allowed Content Architecture"
order: 70
exclude_from_search: true
---

The Allowed Content web version is a conversion of the gsheet into normalized database tables; this allows for configuration of new content with drop downs, and the ability to filter and search by different criteria.


## System Overview

Allowed Content operates as a Single Page Application backed by a database (supabase):

- **Database:** 32 normalized tables and views in PostgreSQL (`public.ac_*`).
- **Data Access Layer:** `assets/js/allowed-content/ac-service.js` manages caching, joined lookups, and CRUD operations.
- **Role-Based Permissions:** `assets/js/allowed-content/ac-auth.js` enforces role checks (`Admin`, `Engineer` have edit access only).

---

## Implementation Architecture: Tables, Views & Inheritance

Rather than maintaining a flat spreadsheet, Allowed Content normalizes data into relational tables and PostgreSQL views based on four architectural patterns:

### Parent-Child Relationships & Inheritance Views (`v_ac_*`)
For options that have parent and variant definitions (such as classes/subclasses and species/subraces), the database normalizes parent attributes separately from child options, then exposes an **Inheritance Resolution View**:

- **Classes (`ac_classes` + `ac_subclasses` → `v_ac_classes`)**:
  - `ac_classes`: Stores parent class properties that apply to all archetypes (hit die, multiclassing prerequisites, class book source, ruleset, and optional class features).
  - `ac_subclasses`: Stores specific subclass options (subclass name, category, subclass book source, external links, and subclass advice).
  - `v_ac_classes`: A view that joins class with subclass

- **Species & Lineages (`ac_races` + `ac_subraces` → `v_ac_races`)**:
  - `ac_races`: Stores base species traits (base size, base speed, base languages, core ability score baselines).
  - `ac_subraces`: Stores lineage variants, stat adjustments, and subrace-specific traits.
  - `v_ac_races`: Merges race with subraces

###  Sources Reference Table (`ac_sources`)
- Every content table references `ac_sources.source_key` (e.g. `'PHB'`, `'XGE'`, `'TCE'`).
- This centralizes ruleset classification (`'2014'` vs `'2024'`), publisher metadata, and Nature (`'Official'` vs `'Homebrew'`). Changing a source's properties in `ac_sources` automatically cascades across all referencing content without modifying individual item rows.

---
## Frontend Architecture

The frontend is modularized in `assets/js/allowed-content/`:

```
assets/js/allowed-content/
├── ac-main.js                  # Main controller, tab registration & routing
├── ac-service.js               # Central Supabase data access layer & caching
├── ac-auth.js                  # Staff authentication, role checks (detectAdminSession), and admin mode bar
├── ac-order-utils.js           # check_id and placement ordering calculations
├── ac-schema-viewer.js         # Interactive SVG ERD, data dictionary & Mermaid generator
├── ac-schema-data.js           # Pre-compiled database schema metadata (32 tables and views)
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

## Staff Admin & Workflow

Staff members with `Admin` or `Engineer` roles can manage content directly on `/allowed-content/?admin=true`:

1. **Authentication:** Uses Discord OAuth via `assets/js/auth-check.js`.
2. **Add / Edit / Delete:** Modal dialogs allow updating records without leaving the page.
3. **Sequencing (`check_id`):** New items automatically calculate their next sequential `check_id` per sourcebook using `ac-order-utils.js`.
4. **Auditor Mode:** Users with the `Auditor` role can review rulings, verify ruleset tags, and add advisory notes.

---

## Schema & Interactive ERD Tool

There's a lot of tables, so I created an interactive Schema Browser:

**[Allowed Content Schema Browser](/Guides/staff/ac-schema/)**
