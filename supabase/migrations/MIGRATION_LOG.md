# Allowed Content Database Migration Log & Runbook

This document is the **canonical running log** of database schema migrations and data loads for the Hawthorne Guild **Allowed Content (AC)** overhaul. 

Whenever a new Allowed Content tab or data segment is touched:
1. Create the `YYYYMMDD_<description>.sql` migration script in `supabase/migrations/`.
2. Create the Node.js runner `run_YYYYMMDD_<description>.js` with automated verification checks.
3. Test with `--dry-run` against DEV (`SOURCE_DB_URL`).
4. Apply with `--execute` against DEV.
5. Apply with `--execute --prod` against PRODUCTION (`TARGET_DB_URL`).
6. **Append the new step to this document** with date, script names, commands, row count verification, and dependencies.

---

## Environment Configuration

Connection strings are loaded from `/workspace/git/Coconut/DBSync/.env` (or local `.env`):
- **DEV Database**: `SOURCE_DB_URL`
- **PROD Database**: `TARGET_DB_URL` (or `PROD_DB_URL`)

### Standard Runner Command Pattern
```bash
# 1. Dry run on DEV (rolls back automatically)
node supabase/migrations/run_<migration>.js --dry-run

# 2. Execute on DEV (commits to database)
node supabase/migrations/run_<migration>.js --execute

# 3. Dry run on PRODUCTION
node supabase/migrations/run_<migration>.js --dry-run --prod

# 4. Execute on PRODUCTION
node supabase/migrations/run_<migration>.js --execute --prod
```

---

## Master Migration Sequence & Status

| Step | Date | Tab / Domain | SQL File(s) | Runner Script | Status DEV | Status PROD |
| :---: | :---: | :--- | :--- | :--- | :---: | :---: |
| **01** | 2026-10-04 | **Sources** (Foundational) | `20261004_ac_sources_normalization.sql`<br>`20261004_ac_sources_admin_rls.sql` | `run_20261004_ac_sources_normalization.js`<br>`run_20261004_ac_sources_admin_rls.js` | ✅ Applied | ✅ Applied |
| **02** | 2026-10-04 | **Fractional Indexing** | `20261004_ac_fractional_indexing.sql` | *(Executed via psql / runner)* | ✅ Applied | ✅ Applied |
| **03** | 2026-10-04 | **Races & Lineages** | `20261004_ac_races_normalization.sql`<br>`20261004_ac_races_rls.sql`<br>`20261005_ac_races_base_properties_inheritance.sql`<br>`20261005_v_ac_races_security_invoker.sql`<br>`20261005_clean_notes_advice.sql` | `run_20261004_ac_races_normalization.js`<br>`run_20261005_ac_races_base_properties_inheritance.js`<br>`run_20261005_v_ac_races_security_invoker.js`<br>`run_20261005_clean_notes_advice.js` | ✅ Applied | ✅ Applied |
| **04** | 2026-10-05 | **Classes & Subclasses** | `20261005_ac_classes_normalization.sql` | `run_20261005_ac_classes_normalization.js`<br>*(uses `extract_classes_data.py`)* | ✅ Applied | ✅ Applied |
| **05** | 2026-10-05 | **Backgrounds** | `20261005_ac_backgrounds_normalization.sql` | `run_20261005_ac_backgrounds_normalization.js` | ✅ Applied | ✅ Applied |
| **06** | 2026-10-06 | **Languages** | `20261006_ac_languages_normalization.sql` | `run_20261006_ac_languages_normalization.js` | ✅ Applied | ✅ Applied |
| **07** | 2026-10-06 | **Feats** | `20261006_ac_feats_normalization.sql` | `run_20261006_ac_feats_normalization.js` | ✅ Applied | ✅ Applied |
| **08** | 2026-10-06 | **Misc Class Features**<br>(Fighting Styles, Artificer Infusions, Eldritch Invocations) | `20261006_ac_misc_class_features_normalization.sql` | `run_20261006_ac_misc_class_features_normalization.js` | ✅ Applied | ✅ Applied |
| **09** | 2026-10-06 | **Spells** | `20261006_ac_spells_normalization.sql` | `run_20261006_ac_spells_normalization.js` | ✅ Applied | ✅ Applied |
| **10** | 2026-10-06 | **Equipment** | `20261006_ac_equipment_normalization.sql` | `run_20261006_ac_equipment_normalization.js` | ✅ Applied | ✅ Applied |
| **11** | 2026-10-06 | **Downtime** | `20261006_ac_downtime_normalization.sql` | `run_20261006_ac_downtime_normalization.js` | ✅ Applied | ✅ Applied |
| **12** | 2026-10-09 | **Bastions** | `20261009_ac_bastion_normalization.sql` | `run_20261009_ac_bastion_normalization.js` | ✅ Applied | ✅ Applied |
| **13** | 2026-10-10 | **Races Ruleset Normalization** | `20261010_ac_races_ruleset.sql` | `run_20261010_ac_races_ruleset.js` | ✅ Applied | ✅ Applied |
| **14** | 2026-10-11 | **Item Properties Normalization** | `20261011_ac_item_properties_normalization.sql` | `run_20261011_ac_item_properties_normalization.js` | ✅ Applied | ✅ Applied |
| **15** | 2026-10-11 | **Monsters Normalization** | `20261011_ac_monsters_normalization.sql` | `run_20261011_ac_monsters_normalization.js` | ✅ Applied | ✅ Applied |

---

## Detailed Step-by-Step Running Log

### Step 1: Sources (`ac_sources`)
- **Date**: 2026-10-04
- **Source Spreadsheet**: `AC_Sources v2.xlsx` / `Allowed_Content_20261004.xlsx` (Sources tab)
- **Dependencies**: None (Root of Allowed Content taxonomy).
- **Files**:
  - `supabase/migrations/20261004_ac_sources_normalization.sql`
  - `supabase/migrations/20261004_ac_sources_admin_rls.sql`
  - `supabase/migrations/run_20261004_ac_sources_normalization.js`
  - `supabase/migrations/run_20261004_ac_sources_admin_rls.js`
- **Key Changes**:
  - Adds `check_id` (`TEXT UNIQUE`) for 1:1 spreadsheet row tracking (`SRC_0001` .. `SRC_0119`).
  - Adds `ruleset` column ('2014' vs '2024').
  - Normalizes source keys (e.g. `MCV1_DC`, `MCV3_EC`, `AU`, `RHW`).
  - Sets up Admin & Engineer RLS policies for browser-based catalog editing.
- **Verification Criteria**:
  - Exactly 119 rows in `public.ac_sources`.
  - Continuous `check_id` sequence: `SRC_0001` through `SRC_0119`.
  - Zero duplicate `source_key` entries.

---

### Step 2: Fractional Indexing (`display_order`)
- **Date**: 2026-10-04
- **Dependencies**: Step 1 (Sources) & Step 3 (Races).
- **Files**:
  - `supabase/migrations/20261004_ac_fractional_indexing.sql`
- **Key Changes**:
  - Converts `display_order` from `INTEGER` to `DOUBLE PRECISION` across `ac_sources`, `ac_races`, and `ac_subraces`.
  - Enables fractional midpoint insertion (e.g. inserting an item at order `1.5` between `1.0` and `2.0` without rewriting the entire table).

---

### Step 3: Races & Lineages (`ac_races`, `ac_subraces`, `v_ac_races`)
- **Date**: 2026-10-04 to 2026-10-05
- **Source Spreadsheet**: `AC_Races.xlsx`, `AC_Subraces.xlsx`
- **Dependencies**: Step 1 (`ac_sources` canonical source keys).
- **Files**:
  - `supabase/migrations/20261004_ac_races_normalization.sql`
  - `supabase/migrations/run_20261004_ac_races_normalization.js`
  - `supabase/migrations/20261004_ac_races_rls.sql`
  - `supabase/migrations/20261005_ac_races_base_properties_inheritance.sql`
  - `supabase/migrations/run_20261005_ac_races_base_properties_inheritance.js`
  - `supabase/migrations/20261005_v_ac_races_security_invoker.sql`
  - `supabase/migrations/run_20261005_v_ac_races_security_invoker.js`
  - `supabase/migrations/20261005_clean_notes_advice.sql`
  - `supabase/migrations/run_20261005_clean_notes_advice.js`
- **Key Changes**:
  - Archives flat legacy `ac_races` to `ac_races_legacy_20261004`.
  - Normalizes hierarchy into master `ac_races` (114 base species) and `ac_subraces` (221 lineages).
  - Adds base character attributes to `ac_races` (size, speed, language, stats, traits, notes).
  - Creates view `v_ac_races WITH (security_invoker = true)` to resolve lineage inheritance automatically (fallbacks, combined traits, and stats).
  - Normalizes multi-source lineages (`sources text[]`) and JSONB variant data (e.g. Aarakocra).
  - Strips leading/trailing indentation from multi-line advice bullets.
  - Adds Admin & Engineer management RLS policies.
- **Verification Criteria**:
  - `ac_races`: Exactly 114 rows.
  - `ac_subraces`: Exactly 221 rows, `check_id` range `RAC_0001` .. `RAC_0247`.
  - Zero orphaned subraces (100% referential integrity with `ac_races.race_id`).
  - Compatibility view `v_ac_races` returns 221 rows with security invoker enabled.

---

### Step 4: Classes & Subclasses (`ac_classes`, `ac_subclasses`, `v_ac_classes`)
- **Date**: 2026-10-05
- **Source Spreadsheet**: `AC_Class.xlsx`, `AC_SubClass.xlsx`
- **Dependencies**: Step 1 (`ac_sources` key validation).
- **Files**:
  - `supabase/migrations/20261005_ac_classes_normalization.sql`
  - `supabase/migrations/extract_classes_data.py`
  - `supabase/migrations/run_20261005_ac_classes_normalization.js`
- **Key Changes**:
  - Archives flat legacy `ac_classes` to `ac_classes_legacy_backup`.
  - Normalizes schema into `public.ac_classes` (29 parent classes with hit_die, multiclassing, TCE options) and `public.ac_subclasses` (244 child subclasses with foreign key `class_id`).
  - Python extractor `extract_classes_data.py` pre-validates source keys against `public.ac_sources`.
  - Re-maps Hawthorne Arcana source link to `/Guides/arcana/`.
  - Creates inheritance view `public.v_ac_classes` with `security_invoker = true`.
- **Verification Criteria**:
  - `ac_classes`: Exactly 29 rows.
  - `ac_subclasses`: Exactly 244 rows.
  - Zero orphaned subclasses.

---

### Step 5: Backgrounds (`ac_backgrounds`)
- **Date**: 2026-10-05
- **Source Spreadsheet**: `AC_Backgrounds.xlsx`
- **Dependencies**: Step 1 (`ac_sources`).
- **Files**:
  - `supabase/migrations/20261005_ac_backgrounds_normalization.sql`
  - `supabase/migrations/run_20261005_ac_backgrounds_normalization.js`
- **Key Changes**:
  - Alters `public.ac_backgrounds` to add `ruleset` ('2014' or '2024') and `category` ('Official' or 'Homebrew').
  - Normalizes all 166 background rows (source keys, rulesets, categories, feature names, replacement feature advice).
  - Sets Staff Admin & Engineer RLS policies (`Admins and Engineers can manage ac_backgrounds`).
- **Verification Criteria**:
  - Total rows: Exactly 166.
  - Zero rows with `NULL` ruleset or `NULL` category.
  - Active RLS policy confirmed.

---

### Step 6: Languages (`ac_language_types`, `ac_languages`)
- **Date**: 2026-10-06
- **Source Spreadsheet**: `Allowed_Content_20261004.xlsx` (Languages tab), `AC_Language.xlsx`, `AC_LangType.xlsx`
- **Dependencies**: None.
- **Files**:
  - `supabase/migrations/20261006_ac_languages_normalization.sql`
  - `supabase/migrations/run_20261006_ac_languages_normalization.js`
- **Key Changes**:
  - Creates normalized category table `public.ac_language_types` (UUID PK, name, description, display_order).
  - Evolves `public.ac_languages` to reference `ac_language_types(id)` via UUID foreign key.
  - Adds `check_id` (`LAN_0001` .. `LAN_0128`) with `NOT NULL` and `UNIQUE` constraints.
  - Restores missing canonical language: **Orc** at `LAN_0012` (Standard Languages, Dwarvish script).
  - Upserts all 5 normalized categories and 128 languages with scripts, origins, typical speakers, and notes.
  - Configures `updated_at` triggers and Staff Admin / Engineer RLS policies.
- **Verification Criteria**:
  - `ac_language_types`: Exactly 5 rows.
  - `ac_languages`: Exactly 128 rows.
  - Continuous `check_id` range: `LAN_0001` through `LAN_0128` (0 nulls, 0 duplicates).
  - Restored Orc record verified at `LAN_0012`.
  - Zero orphaned foreign keys.
  - Display order data types: `DOUBLE PRECISION` on both tables.
  - Staff Admin RLS verified.

---

### Step 7: Feats (`ac_feats`)
- **Date**: 2026-10-06
- **Source Spreadsheet**: `Allowed_Content_20261004.xlsx` (Feats tab)
- **Draft Reference**: `AC_Feats.xlsx`
- **Dependencies**: Step 1 (`ac_sources` foreign key validation).
- **Files**:
  - `supabase/migrations/20261006_ac_feats_normalization.sql`
  - `supabase/migrations/run_20261006_ac_feats_normalization.js`
- **Commands Executed**:
  - `node supabase/migrations/run_20261006_ac_feats_normalization.js --dry-run`
  - `node supabase/migrations/run_20261006_ac_feats_normalization.js --execute`
  - `node supabase/migrations/run_20261006_ac_feats_normalization.js --dry-run --prod`
  - `node supabase/migrations/run_20261006_ac_feats_normalization.js --execute --prod`
- **Key Changes**:
  - Archived legacy 317 records to `public.ac_feats_legacy_backup`.
  - Kept UUID primary key standard (`id UUID DEFAULT gen_random_uuid() PRIMARY KEY`) preserving all 317 existing UUIDs in DEV/PROD and assigning new UUIDs for the 29 new feats.
  - Added `check_id TEXT NOT NULL UNIQUE` covering all 346 feats (`FEA_0001` .. `FEA_0346`).
  - Added `ruleset TEXT NOT NULL` ('2014' vs '2024') enabling 44 identically named feats across editions to coexist cleanly (`CONSTRAINT ac_feats_name_ruleset_key UNIQUE (name, ruleset)`).
  - Normalized source keys to `public.ac_sources` (`PHB 2014` -> `PHB2014`, `PHB 2024` -> `PHB2024`, `HWCS (2024)` -> `HWCS_2024`, `SatO` -> `SATO`, `VSS:PP` -> `VSS_PP`, `XFTE` -> `XGE`).
  - Added foreign key constraint `ac_feats_source_fkey` referencing `public.ac_sources(source_key)`.
  - Normalized categories (`'—'` -> `'General'`, `'Origin'`, `'Epic Boon'`, `'Fighting Style'`, `'Dragonmark'`, `'Dark Gift'`).
  - Converted `display_order` to `DOUBLE PRECISION DEFAULT 0` for fractional indexing.
  - Enabled RLS with public read, service_role manage, and `Admins and Engineers can manage ac_feats`.
- **Verification Criteria**:
  - Total rows: Exactly 346 in both DEV and PROD.
  - Check ID range: `FEA_0001` .. `FEA_0346` (346 distinct, 0 nulls).
  - Ruleset breakdown: 141 (2014) and 205 (2024).
  - Duplicate (name, ruleset) pairs: 0.
  - Foreign key orphans: 0.
  - Active RLS policies confirmed in DEV and PROD.

---

### Step 8: Misc Class Features (`ac_fighting_styles`, `ac_artificer_infusions`, `ac_eldritch_invocations`)
- **Date**: 2026-10-06
- **Source Spreadsheet**: `Allowed_Content_20261004.xlsx` (Misc. Class Features tab)
- **Draft References**: `AC_Fightingstyles.xlsx`, `AC_Artificer_Infusion.xlsx`, `AC_Edtritch_Invoc.xlsx`
- **Dependencies**: Step 1 (`ac_sources` foreign key validation).
- **Files**:
  - `supabase/migrations/20261006_ac_misc_class_features_normalization.sql`
  - `supabase/migrations/run_20261006_ac_misc_class_features_normalization.js`
- **Commands Executed**:
  - `node supabase/migrations/run_20261006_ac_misc_class_features_normalization.js --dry-run`
  - `node supabase/migrations/run_20261006_ac_misc_class_features_normalization.js --execute`
  - `node supabase/migrations/run_20261006_ac_misc_class_features_normalization.js --dry-run --prod`
  - `node supabase/migrations/run_20261006_ac_misc_class_features_normalization.js --execute --prod`
- **Key Changes**:
  - Archived legacy tables to `ac_fighting_styles_legacy_backup`, `ac_artificer_infusions_legacy_backup`, and `ac_eldritch_invocations_legacy_backup`.
  - Maintained UUID primary key standard (`id UUID DEFAULT gen_random_uuid() PRIMARY KEY`) across all three tables, preserving all existing UUIDs in DEV and PROD.
  - Added `check_id TEXT NOT NULL UNIQUE` mapping all 119 records sequentially:
    - Fighting Styles: `MSC_0001` .. `MSC_0017` (17 records)
    - Artificer Infusions: `MSC_0018` .. `MSC_0033` (16 records)
    - Eldritch Invocations: `MSC_0034` .. `MSC_0119` (86 records)
  - Added `ruleset TEXT NOT NULL` ('2014' vs '2024') enabling 22 identically named Eldritch Invocations across editions to coexist cleanly (`CONSTRAINT ac_*_name_ruleset_key UNIQUE (name, ruleset)`).
  - Normalized source keys to `public.ac_sources` (`PHB 2014` -> `PHB2014`, `PHB 2024` -> `PHB2024`, `TCE`, `XGE`, `UALDU`, `UAWA`, `HWT`).
  - Added foreign key constraints referencing `public.ac_sources(source_key)` across all three tables (`ac_*_source_fkey`).
  - Converted `display_order` to `DOUBLE PRECISION DEFAULT 0` for fractional indexing reordering support.
  - Attached `handle_updated_at()` triggers to all three tables.
  - Enabled Row Level Security (RLS) on all three tables with:
    - `Allow public read access to ac_*` (`SELECT` for `anon`, `authenticated`).
    - `Allow service_role to manage ac_*` (`ALL` for `service_role`).
    - `Admins and Engineers can manage ac_*` (`ALL` for authenticated users with Admin or Engineer roles).
  - Synchronized and normalized draft workbooks `AC_Fightingstyles.xlsx`, `AC_Artificer_Infusion.xlsx`, and `AC_Edtritch_Invoc.xlsx`.
- **Verification Criteria**:
  - Total rows: Exactly 17 in `ac_fighting_styles`, 16 in `ac_artificer_infusions`, and 86 in `ac_eldritch_invocations` (119 total) in both DEV and PROD.
  - Check ID ranges: `MSC_0001`..`MSC_0017`, `MSC_0018`..`MSC_0033`, `MSC_0034`..`MSC_0119` (119 distinct, 0 nulls).
  - Ruleset breakdown:
    - Fighting Styles: 16 (2014) and 1 (2024).
    - Artificer Infusions: 16 (2014) and 0 (2024).
    - Eldritch Invocations: 58 (2014) and 28 (2024).
  - Duplicate `(name, ruleset)` pairs: 0.
  - Foreign key orphans: 0.
  - Active RLS policies confirmed in DEV and PROD across all three tables.

---

### Step 8.1: Data Fix — 2024 Fighting Style Feats Link (`ac_fighting_styles`)
- **Date**: 2026-10-06
- **Source Spreadsheet**: `Allowed_Content_20261004.xlsx` (Misc. Class Features tab)
- **Draft Reference**: `AC_Fightingstyles.xlsx`
- **Target Record**: `MSC_0017` (`2024 Fighting Styles`)
- **Files**:
  - `supabase/migrations/20261006_ac_fighting_styles_feats_link_fix.sql`
  - `supabase/migrations/run_20261006_ac_fighting_styles_feats_link_fix.js`
- **Commands Executed**:
  - `node supabase/migrations/run_20261006_ac_fighting_styles_feats_link_fix.js --dry-run`
  - `node supabase/migrations/run_20261006_ac_fighting_styles_feats_link_fix.js --execute`
  - `node supabase/migrations/run_20261006_ac_fighting_styles_feats_link_fix.js --dry-run --prod`
  - `node supabase/migrations/run_20261006_ac_fighting_styles_feats_link_fix.js --execute --prod`
- **Key Changes**:
  - Updated `notes_advice` for `MSC_0017` from `Refer to Fighting Style Feats here.` to `Refer to Fighting Style Feats [here](/Guides/allowed-content/#feats).`
  - Updated both workbooks (`AC_Fightingstyles.xlsx` and `Allowed_Content_20261004.xlsx`).
  - Added in-page relative link navigation support in `assets/js/allowed-content/ac-ui-utils.js` (`renderMarkdownLinks`, `formatExpandableText`, `resolveSourceLink`).
- **Verification Criteria**:
  - DEV: `notes_advice` updated and verified via SQL.
  - PRODUCTION: `notes_advice` updated and verified via SQL.

---

### Step 9: Spells (`public.ac_spells`)
- **Date**: 2026-10-06
- **Source Spreadsheet**: `Allowed_Content_20261004.xlsx` (Spells tab)
- **Draft Reference**: `AC_Spells.xlsx`
- **Dependencies**: Step 1 (`public.ac_sources`)
- **Files**:
  - `supabase/migrations/20261006_ac_spells_normalization.sql`
  - `supabase/migrations/run_20261006_ac_spells_normalization.js`
- **Commands Executed**:
  - `node supabase/migrations/run_20261006_ac_spells_normalization.js --dry-run`
  - `node supabase/migrations/run_20261006_ac_spells_normalization.js --execute`
  - `node supabase/migrations/run_20261006_ac_spells_normalization.js --dry-run --prod`
  - `node supabase/migrations/run_20261006_ac_spells_normalization.js --execute --prod`
- **Key Changes**:
  - Added audit column `check_id VARCHAR(32) NOT NULL UNIQUE` (`SPL_0001` through `SPL_0020`).
  - Added edition tracking `ruleset VARCHAR(10) NOT NULL DEFAULT '2024'` (16 records under '2014', 4 records under '2024').
  - Normalized `source` column to standard source keys (`PHB2014`, `EEPC`, `SCAG`, `XGE`, `GGR`, `LLK`, `EGW`, `IDRotF`, `TCE`, `FTD`, `SCC`, `AAG`, `BMT`, `SATO`, `HWCS`, `HWT`, `PHB2024`, `FRHOF`, `AU`, `EFA`) with foreign key constraint `ac_spells_source_fkey` referencing `public.ac_sources(source_key)`.
  - Added unique constraint `uq_ac_spells_name_ruleset` on `(name, ruleset)` and dropped legacy `ac_spells_name_source_key`.
  - Updated `display_order` to `DOUBLE PRECISION` supporting fractional indexing (1.0 through 20.0).
  - Preserved all 19 historic UUID primary keys in DEV and PROD, and added deterministic UUID `c032649a-5b48-436f-b472-a1b415a78280` for the 20th record (`SPL_0019`: 'Spells from AU (2024)').
  - Attached `handle_updated_at()` trigger for automated timestamp management.
  - Enabled Row Level Security (RLS) with policies:
    - `Allow public read access to ac_spells` (SELECT for anon and authenticated).
    - `Allow service_role to manage ac_spells` (ALL for service_role).
    - `Admins and Engineers can manage ac_spells` (ALL for users with Admin/Engineer Discord roles).
  - Generated `.context/current-tasks/AC_Spells.xlsx` data dictionary and data catalog.
- **Verification Criteria**:
  - Total rows: exactly 20 rows in both DEV and PROD.
  - Check ID audit: `SPL_0001` to `SPL_0020` (20 distinct, 0 nulls).
  - Ruleset split: 16 (2014) and 4 (2024).
  - Duplicate `(name, ruleset)` pairs: 0.
  - Foreign key orphans: 0.
  - Display orders: 1.0 to 20.0 (20 distinct values).
  - Active RLS policies confirmed in DEV and PROD.

### Step 10: Equipment (`public.ac_equip_type`, `public.ac_equipment`)
- **Date**: 2026-10-06
- **Source Spreadsheet**: `Allowed_Content_20261004.xlsx` (Equipment tab)
- **Draft References**: `AC_Equip_Type.xlsx`, `AC_Equipment.xlsx`
- **Dependencies**: Step 1 (`public.ac_sources`)
- **Files**:
  - `supabase/migrations/20261006_ac_equipment_normalization.sql`
  - `supabase/migrations/run_20261006_ac_equipment_normalization.js`
- **Commands Executed**:
  - `node supabase/migrations/run_20261006_ac_equipment_normalization.js --dry-run`
  - `node supabase/migrations/run_20261006_ac_equipment_normalization.js --execute`
  - `node supabase/migrations/run_20261006_ac_equipment_normalization.js --dry-run --prod`
  - `node supabase/migrations/run_20261006_ac_equipment_normalization.js --execute --prod`
- **Key Changes**:
  - Created normalized category table `public.ac_equip_type` with UUID primary keys, name, notes, and fractional `display_order` (`DOUBLE PRECISION`).
  - Added compatibility view `public.ac_equipment_categories` selecting from `public.ac_equip_type` to guarantee zero breaking changes for existing code.
  - Normalized `public.ac_equipment`:
    - Preserved all 490 historic UUID primary keys in DEV and PRODUCTION.
    - Added `check_id VARCHAR(32) NOT NULL UNIQUE` covering all 490 equipment items (`EQP_0001` through `EQP_0495`, with Wheat resolved at `EQP_0495` and excluding erroneous header labels `EQP_0425`..`EQP_0429`).
    - Added foreign key `equip_type_id UUID REFERENCES public.ac_equip_type(id)` mapping all 13 types (Armor, Weapons, Tools, Adventuring Gear, Poisons, Trade Goods, Mounts, Vehicles, Vehicle Upgrades, Pets, Siege Ammunition and Weapons, Spell Components, Other Craftable Items), retaining legacy `category_id` in sync.
    - Converted `source` to `TEXT[] NOT NULL` to support items published across multiple sourcebooks (e.g., `PHB2014, PHB2024`, `DMG2014, DMG2024`, `BGDIA, SKT`), verified against `public.ac_sources(source_key)`.
    - Added supporting sources `HHB` (Hawthorne Homebrew) and `AC` (Allowed Content) to `public.ac_sources`.
    - Added `ruleset VARCHAR(10) NOT NULL DEFAULT '2024'` ('2014' vs '2024') tracking edition compatibility.
    - Updated `display_order` to `DOUBLE PRECISION` supporting fractional indexing (1.0 through 490.0).
    - Added GIN index on `source` array (`idx_ac_equipment_source`) and B-Tree indexes on `check_id`, `equip_type_id`, `ruleset`, `display_order`.
    - Attached `handle_updated_at()` triggers on both tables.
    - Enabled Row Level Security (RLS) on both tables with public read access, service_role full management, and Admin/Engineer full management policies.
    - Normalized user draft workbooks `.context/current-tasks/AC_Equip_Type.xlsx` (13 types with UUIDs, notes, and Data Dictionary) and `.context/current-tasks/AC_Equipment.xlsx` (490 items with UUIDs, restored missing weapons Club, Dagger, Greatclub, restored last 7 items, multi-source arrays, ruleset, and Data Dictionary).
- **Verification Criteria**:
  - `ac_equip_type` total rows: Exactly 13 in both DEV and PROD.
  - Compatibility view `ac_equipment_categories`: Exactly 13 rows in both DEV and PROD.
  - `ac_equipment` total rows: Exactly 490 in both DEV and PROD.
  - Check ID audit: `EQP_0001` to `EQP_0495` (490 distinct, 0 nulls, Wheat at `EQP_0495`).
  - Equip type foreign key orphans: 0.
  - Ruleset split: 170 (2014) and 320 (2024).
  - Source array integrity: 100% of source elements valid in `public.ac_sources` (0 invalid).
  - Multi-source records: 269 items published across multiple sourcebooks.
  - Display orders: 1.0 to 490.0 (490 distinct, fractional indexing ready).
  - Active RLS policies confirmed in DEV and PROD across both tables.

### Step 11: Downtime (`public.ac_downtime_type`, `public.ac_downtime`)
- **Date**: 2026-10-06
- **Source Spreadsheet**: `Allowed_Content_20261004.xlsx` (Downtime tab)
- **Draft References**: `AC_Downtime_Type.xlsx`, `AC_Downtime.xlsx`
- **Dependencies**: Step 1 (`public.ac_sources`)
- **Files**:
  - `supabase/migrations/20261006_ac_downtime_normalization.sql`
  - `supabase/migrations/run_20261006_ac_downtime_normalization.js`
- **Commands Executed**:
  - `node supabase/migrations/run_20261006_ac_downtime_normalization.js --dry-run`
  - `node supabase/migrations/run_20261006_ac_downtime_normalization.js --execute`
  - `node supabase/migrations/run_20261006_ac_downtime_normalization.js --dry-run --prod`
  - `node supabase/migrations/run_20261006_ac_downtime_normalization.js --execute --prod`
- **Key Changes**:
  - Created normalized category table `public.ac_downtime_type` with UUID primary keys, name, notes, description, and fractional `display_order` (`DOUBLE PRECISION`).
  - Added compatibility view `public.ac_downtime_categories` selecting from `public.ac_downtime_type` to guarantee zero breaking changes for existing code.
  - Normalized `public.ac_downtime`:
    - Preserved all 128 historic UUID primary keys in DEV and PRODUCTION.
    - Restored missing row from master spreadsheet `Jump Start Rework` (row 89 in master spreadsheet, `DTP_0052`) and `Haunted Bastions` with deterministic UUIDs, bringing total activities to exactly 130.
    - Added `check_id VARCHAR(32) NOT NULL UNIQUE` covering all 130 downtime activities (`DT_0001` through `DT_0130`).
    - Added foreign key `downtime_type_id UUID REFERENCES public.ac_downtime_type(id)` mapping all 13 categories (Bastions, Building a Stronghold, Buying & Selling, Crafting, Research, Reworking, Spellcasting, Spellcasting Services, Trading, Training, Traveling, Work, Miscellaneous), retaining legacy `category_id` in sync.
    - Added mirror column `activity TEXT`.
    - Preserved rich markdown links in notes/advice for existing records.
    - Updated `display_order` to `DOUBLE PRECISION` supporting fractional indexing (1.0 through 130.0).
    - Attached `handle_updated_at()` triggers on both tables.
    - Enabled Row Level Security (RLS) on both tables with public read access, service_role full management, and Admin/Engineer full management policies.
    - Corrected and normalized user draft workbooks `.context/current-tasks/AC_Downtime_Type.xlsx` (13 types with UUIDs, notes, and Data Dictionary) and `.context/current-tasks/AC_Downtime.xlsx` (130 activities with UUIDs, restored Jump Start Rework at DT_0052, UUID foreign keys, and Data Dictionary), and saved copies to `.context/current-tasks/Loaded/`.
- **Verification Criteria**:
  - `ac_downtime_type` total rows: Exactly 13 in both DEV and PROD.
  - Compatibility view `ac_downtime_categories`: Exactly 13 rows in both DEV and PROD.
  - `ac_downtime` total rows: Exactly 130 in both DEV and PROD.
  - Check ID audit: `DT_0001` to `DT_0130` (130 distinct, 0 nulls, `Jump Start Rework` at `DT_0052`).
  - Downtime type foreign key orphans: 0.
  - Category distribution: exact 1:1 match across all 13 categories (sum = 130).
  - Display orders: 1.0 to 130.0 (130 distinct, fractional indexing ready).
  - Active RLS policies confirmed in DEV and PROD across both tables.

---

## Template for Appending Future Steps

When implementing the next Allowed Content tab (e.g. Feats, Equipment, Spells, Downtime, Bastions, Loot, Monsters), copy and fill out the template below:

```markdown
### Step X: [Domain Name] (`public.ac_[table_name]`)
- **Date**: YYYY-MM-DD
- **Source Spreadsheet**: `Allowed_Content_YYYYMMDD.xlsx` ([Sheet Name] tab)
- **Dependencies**: [List prerequisite tables, e.g. Step 1 ac_sources]
- **Files**:
  - `supabase/migrations/YYYYMMDD_ac_[domain]_normalization.sql`
  - `supabase/migrations/run_YYYYMMDD_ac_[domain]_normalization.js`
- **Commands Executed**:
  - `node supabase/migrations/run_YYYYMMDD_ac_[domain]_normalization.js --dry-run`
  - `node supabase/migrations/run_YYYYMMDD_ac_[domain]_normalization.js --execute`
  - `node supabase/migrations/run_YYYYMMDD_ac_[domain]_normalization.js --dry-run --prod`
  - `node supabase/migrations/run_YYYYMMDD_ac_[domain]_normalization.js --execute --prod`
- **Key Changes**:
  - [Schema changes, tables created/altered, new columns]
  - [Data normalization highlights, ruleset split, category mapping]
  - [RLS policy updates]
- **Verification Criteria**:
  - [Expected row count]
  - [Check ID audit range, e.g. DOM_0001 .. DOM_XXXX]
  - [Referential integrity and constraints]
```

---

### Step 12: Bastions (`ac_bastion_type`, `ac_bastion`)
- **Date**: 2026-10-09
- **Source Spreadsheets**:
  - `AC_Bastion_Type.xlsx` → `public.ac_bastion_type` (4 category type records)
  - `AC_Bastion.xlsx` → `public.ac_bastion` (66 facility records with check_id)
  - `Allowed_Content_20261004.xlsx` > `Bastions` sheet (authoritative source for facility data)
- **SQL File**: `20261009_ac_bastion_normalization.sql`
- **Runner Script**: `run_20261009_ac_bastion_normalization.js`
- **Dependencies**: Step 01 (Sources), Step 10 (Equipment — ensures EFA, FRHOF, RHW source keys)

#### Normalization Issues Identified & Corrected
1. **UUID Primary Key**: Original `AC_Bastion.xlsx` used string keys (`BAS_ID`, `BasCat_ID`) as PKs. Corrected to `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` with stable pre-generated UUIDs for idempotent upserts.
2. **Source as TEXT[]**: Original normalized as plain `Text`. Corrected to `TEXT[] NOT NULL DEFAULT ARRAY['DMG2024']::text[]` to support multiple sources (matching Equipment pattern). Source values normalized: `'Homebrew'` → `'HHB'` (Hawthorne Homebrew key).
3. **ac_bastion_type check_id**: Added `check_id VARCHAR(32) UNIQUE NOT NULL` field (`BASC_0001`..`BASC_0004`) to `ac_bastion_type` table for consistency with the AC architecture standard.
4. **display_order**: Stored as `DOUBLE PRECISION` for fractional indexing support (1.0 to 66.0).
5. **RLS Policies**: Public `SELECT`, service_role `ALL`, and Admin/Engineer `ALL` via `user_roles` join.

#### Schema Created
- `public.ac_bastion_type` (4 rows: General Rules, Basic Facilities, Special Facilities, Other)
- `public.ac_bastion` (66 rows: BAS_0001..BAS_0066)

#### Commands to Run
```bash
# 1. Dry run on DEV
node supabase/migrations/run_20261009_ac_bastion_normalization.js --dry-run

# 2. Execute on DEV
node supabase/migrations/run_20261009_ac_bastion_normalization.js --execute

# 3. Dry run on PRODUCTION
node supabase/migrations/run_20261009_ac_bastion_normalization.js --dry-run --prod

# 4. Execute on PRODUCTION
node supabase/migrations/run_20261009_ac_bastion_normalization.js --execute --prod
```

#### Verification Criteria
- `ac_bastion_type`: 4 rows, check_ids BASC_0001..BASC_0004, all distinct
- `ac_bastion`: 66 rows, check_ids BAS_0001..BAS_0066, all distinct, 0 nulls
- FK integrity: 0 orphan `bastion_type_id` references
- Source array integrity: all `source[]` elements found in `ac_sources.source_key`
- Display orders: 1.0..66.0, all 66 distinct
- RLS: ≥ 6 policies across both tables

#### Execution Status
| Environment | Dry-Run | Execute | Date | Notes |
| :--- | :---: | :---: | :--- | :--- |
| DEV | ✅ | ✅ | 2026-10-09 | All 11 checks passed. 4 types, 66 facilities committed. |
| PRODUCTION | ✅ | ✅ | 2026-10-10 | All 11 checks passed. 4 types, 66 facilities committed. |

---

### Step 13: Races Ruleset & Species Name Normalization (`ac_races`, `v_ac_races`)
- **Date**: 2026-10-10
- **SQL Migration**: `supabase/migrations/20261010_ac_races_ruleset.sql`
- **Runner Script**: `supabase/migrations/run_20261010_ac_races_ruleset.js`
- **Tables Affected**: `public.ac_races`, `public.v_ac_races`

#### Overview & Changes
1. **Added `ruleset` Column**: Added `ruleset VARCHAR(10) NOT NULL DEFAULT '2014'` to `public.ac_races`.
2. **Species Name Normalization**:
   - For all species containing `(2024)` in `name` (30 species total): set `ruleset = '2024'` and cleanly stripped ` (2024)` from `name`.
   - All other species (84 species) set to `ruleset = '2014'`.
3. **Composite Unique Constraint**: Replaced `ac_races_name_key` (single name unique) with `ac_races_name_ruleset_key` (`UNIQUE (name, ruleset)`), allowing 2014 and 2024 printings of identical species names (e.g. `Elf`, `Dwarf`, `Human`) to coexist cleanly.
4. **Recreated `v_ac_races` View**: Recreated `v_ac_races WITH (security_invoker = true)` exposing `ruleset` from joined `ac_races`, with permissions granted to `anon, authenticated, service_role`.

#### Commands to Run
```bash
# 1. Dry run on DEV
node supabase/migrations/run_20261010_ac_races_ruleset.js --dry-run

# 2. Execute on DEV
node supabase/migrations/run_20261010_ac_races_ruleset.js --execute

# 3. Dry run on PRODUCTION
node supabase/migrations/run_20261010_ac_races_ruleset.js --dry-run --prod

# 4. Execute on PRODUCTION
node supabase/migrations/run_20261010_ac_races_ruleset.js --execute --prod
```

#### Verification Criteria
- `ac_races`: 30 species with `ruleset = '2024'`, 84 species with `ruleset = '2014'` (114 total).
- 0 species in `ac_races` retain `(2024)` in their name string.
- `v_ac_races`: 52 subraces with `ruleset = '2024'`, 169 with `ruleset = '2014'` (221 total).
- 0 collisions or foreign key breaks on `ac_subraces.race_id`.

#### Execution Status
| Environment | Dry-Run | Execute | Date | Notes |
| :--- | :---: | :---: | :--- | :--- |
| DEV | ✅ | ✅ | 2026-10-10 | Verified. 30 '2024' races, 84 '2014' races. 0 remaining with '(2024)' in name. |
| PRODUCTION | ✅ | ✅ | 2026-10-10 | Verified. 30 '2024' races, 84 '2014' races. 0 remaining with '(2024)' in name. |

---

### Step 14: Item Properties Normalization (`ac_item_properties`, `ac_item_properties_categories`)
- **Date**: 2026-10-11
- **SQL Migration**: `supabase/migrations/20261011_ac_item_properties_normalization.sql`
- **Runner Script**: `supabase/migrations/run_20261011_ac_item_properties_normalization.js`
- **Source Spreadsheets**:
  - `Allowed_Content_20261004.xlsx` (Item Properties tab — 92 rows)
  - `AC_Item_Properties.xlsx` (Schema draft analysis & correction)
- **Tables Affected**: `public.ac_item_properties_categories`, `public.ac_item_properties`

#### Overview & Corrections Addressed
1. **Spreadsheet & Tab Clarification**:
   - The user request referenced the Equipment tab, but all 92 Check IDs (`ITP_0001` - `ITP_0092`) are on the **Item Properties** tab. (The Equipment tab contains items with `EQP_0001` - `EQP_0494` already normalized in Step 10).
2. **Schema & Normalization Fixes**:
   - **UUID Primary Keys**: Table uses standard UUID (`gen_random_uuid()`) primary keys rather than integer/string IDs. Foreign key to category uses `category_id UUID REFERENCES ac_item_properties_categories(id)`.
   - **Multi-Source Support (`TEXT[]`)**: Migrated `source` from single `TEXT` to `TEXT[]` referencing canonical `ac_sources` keys (`DMG2014`, `DMG2024`, and `HHB`). GIN index created (`idx_ac_item_properties_source`).
   - **Fractional Indexing**: `display_order` converted to `DOUBLE PRECISION`.
   - **Header Artifact Cleanup**: Removed erroneous legacy placeholder row (`Creator` with source `Minor Property` at `display_order = 1`).
   - **Unique Constraints**:
     - `check_id VARCHAR(32) UNIQUE` (`ITP_0001` .. `ITP_0092`).
     - Composite `UNIQUE (category_id, name)` on `ac_item_properties`.
3. **Staff Admin & Engineer RLS Policies**:
   - `Allow public read access` (`SELECT` for `anon, authenticated`).
   - `Allow service_role to manage` (`ALL` for `service_role`).
   - `Admins and Engineers can manage` (`ALL` for `authenticated` users with `Admin` or `Engineer` roles in `discord_users.roles`).

#### Commands to Run
```bash
# 1. Dry run on DEV
node supabase/migrations/run_20261011_ac_item_properties_normalization.js --dry-run

# 2. Execute on DEV
node supabase/migrations/run_20261011_ac_item_properties_normalization.js --execute

# 3. Dry run on PRODUCTION
node supabase/migrations/run_20261011_ac_item_properties_normalization.js --dry-run --prod

# 4. Execute on PRODUCTION
node supabase/migrations/run_20261011_ac_item_properties_normalization.js --execute --prod
```

#### Verification Criteria
- Categories count: 7.
- Total item properties: 92 (1:1 with `Allowed_Content_20261004.xlsx`).
- Distinct `ITP_` check_ids: 92 (`ITP_0001` through `ITP_0092`).
- 92 records with `source` as `TEXT[]`.
- 92 records with `display_order` as `DOUBLE PRECISION`.

#### Execution Status
| Environment | Dry-Run | Execute | Date | Notes |
| :--- | :---: | :---: | :--- | :--- |
| DEV | ✅ | ✅ | 2026-10-11 | Verified. 92 rows, 92 distinct ITP_ check_ids, source as text[], double precision order. |
| PRODUCTION | ✅ | ✅ | 2026-10-11 | Verified. 92 rows, 92 distinct ITP_ check_ids, source as text[], double precision order. |

---

### 20261011_ac_lookups_categories_expansion.sql
- **Target Table:** `public.lookups`
- **Runner:** `supabase/migrations/run_20261011_ac_lookups_categories_expansion.js`
- **Purpose:** Expand `public.lookups` to store categories, types, sections, and rulesets for Allowed Content tabs (`classes`, `backgrounds`, `feats`, `item-properties`, `misc-features`). Grant Staff Admins and Engineers `ALL` (insert, update, delete) permissions on `lookups` under RLS.

#### Execution Commands
```bash
# 1. Dry run on DEV
node supabase/migrations/run_20261011_ac_lookups_categories_expansion.js --dry-run

# 2. Execute on DEV
node supabase/migrations/run_20261011_ac_lookups_categories_expansion.js --execute

# 3. Dry run on PRODUCTION
node supabase/migrations/run_20261011_ac_lookups_categories_expansion.js --dry-run --prod

# 4. Execute on PRODUCTION
node supabase/migrations/run_20261011_ac_lookups_categories_expansion.js --execute --prod
```

#### Verification Criteria
- `lookups` contains expanded keys: `classes`, `backgrounds`, `feats`, `item-properties`, `misc-features`, alongside existing `CR`, `monster`, `dm-tool`, `character`, `sources`.
- Staff Admin and Engineer policy `Admins and Engineers can manage lookups` grants `ALL` access to authenticated staff.

#### Execution Status
| Environment | Dry-Run | Execute | Date | Notes |
| :--- | :---: | :---: | :---: | :--- |
| DEV | ✅ | ✅ | 2026-10-11 | Verified. 10 types in lookups, Staff Admin/Engineer ALL policy active. |
| PRODUCTION | ✅ | ✅ | 2026-10-11 | Verified. 10 types in lookups, Staff Admin/Engineer ALL policy active. |

---

### Step 15: Monsters Normalization (`ac_monsters`, `ac_monsters_categories`, `lookups`)
- **Date**: 2026-10-11
- **Source Spreadsheet**: `Allowed_Content_20261004.xlsx` (Monsters tab)
- **Target Tables**: `public.ac_monsters`, `public.ac_monsters_categories`, `public.lookups`
- **Runner**: `supabase/migrations/run_20261011_ac_monsters_normalization.js`
- **SQL Migration**: `supabase/migrations/20261011_ac_monsters_normalization.sql`
- **Normalized Data File**: `.context/current-tasks/Loaded/AC_Monsters.xlsx` & `.context/current-tasks/AC_Monsters.xlsx`
- **Dependencies**: Step 1 (`ac_sources` canonical source keys).

#### Key Changes & Architectural Alignment
1. **Spreadsheet Audit & Filtering**:
   - Total records in spreadsheet with `MON_` check_id: 3,262 (`MON_0001` through `MON_3262`).
   - Skipped 67 Hawthorne Field Guide (`HTFG`) homebrew monsters (plus unindexed `Sultan Rezzo`) to avoid redundancy with the interactive Monster Compendium.
   - Preserved 3,195 official monsters with 1:1 audit integrity.
2. **Schema Evolution**:
   - **Legacy Backups**: Created `public.ac_monsters_legacy_backup` and `public.ac_monsters_categories_legacy_backup`.
   - **Primary Key**: Deterministic UUIDv5 primary keys (`id UUID PRIMARY KEY DEFAULT gen_random_uuid()`).
   - **Audit Check ID**: Added `check_id VARCHAR(32) UNIQUE NOT NULL`.
   - **Ruleset**: Added `ruleset VARCHAR(10) NOT NULL DEFAULT '2024'` ('2024' for MM2024 and PHB2024; '2014' for legacy printings).
   - **Categories**: Reset bloated legacy breadcrumbs down to 2 canonical categories (`Fair Game` and `Full DM Only`) with UUID foreign keys.
   - **Section Classifications**: Structured into 4 standard sections (`Core`, `Supplemental`, `Adventures`, `Non-FR`).
   - **Challenge Ratings**: Corrected Excel date-formatting artifacts (`2024-01-04` -> `'1/4'`, `2024-01-02` -> `'1/2'`, `2024-01-08` -> `'1/8'`).
   - **Canonical Sources**: Mapped to `TEXT[]` referencing canonical `ac_sources.source_key`s with GIN index.
   - **Fractional Indexing**: `display_order` converted to `DOUBLE PRECISION` (10.0 step sequence).
3. **Monster Compendium Hub Linking**:
   - Added `lookups` record (`type = 'monsters'`) with header banner text linking to the Field Guide:
     `Official Monsters listed here. For Hawthorne Homebrew Monsters, please [Go to the Monster Compendium in the Field Guide](/Guides/monsters/).`
4. **Staff Admin & Engineer RLS Policies**:
   - Public read access (`SELECT`) for `anon, authenticated`.
   - Full management (`ALL`) for `service_role`.
   - Full management (`ALL`) for authenticated users with `Admin` or `Engineer` roles in `discord_users.roles`.

#### Commands to Run
```bash
# 1. Dry run on DEV
node supabase/migrations/run_20261011_ac_monsters_normalization.js --dry-run

# 2. Execute on DEV
node supabase/migrations/run_20261011_ac_monsters_normalization.js --execute

# 3. Dry run on PRODUCTION
node supabase/migrations/run_20261011_ac_monsters_normalization.js --dry-run --prod

# 4. Execute on PRODUCTION
node supabase/migrations/run_20261011_ac_monsters_normalization.js --execute --prod
```

#### Verification Criteria
- Categories count: 2 (`Fair Game`, `Full DM Only`).
- Total monsters: 3,195 (1:1 with `Allowed_Content_20261004.xlsx`, excluding 67 HTFG monsters).
- Distinct `MON_` check_ids: 3,195.
- HTFG monsters in table: 0 (properly routed to Compendium).
- 2024 ruleset count: 554.
- 2014 ruleset count: 2,641.
- All records with `source` as `TEXT[]`.
- All records with `display_order` as `DOUBLE PRECISION`.
- Active RLS policies for public read, service role, and staff admin/engineer.

#### Execution Status
| Environment | Dry-Run | Execute | Date | Notes |
| :--- | :---: | :---: | :--- | :--- |
| DEV | ✅ | ✅ | 2026-10-11 | Verified. 3,195 rows, 2 categories, 3,195 distinct MON_ check_ids, RLS active. |
| PRODUCTION | ✅ | ✅ | 2026-10-11 | Verified. 3,195 rows, 2 categories, 3,195 distinct MON_ check_ids, RLS active. |


---

### Step 16: Shared Usage Lookup (`lookups`)
- **Date**: 2026-10-11
- **Target Table**: `public.lookups` (`type = 'usage'`)
- **Runner**: `supabase/migrations/run_20261011_ac_shared_usage_lookup.js`
- **SQL Migration**: `supabase/migrations/20261011_ac_shared_usage_lookup.sql`
- **Dependencies**: Step 14 (`lookups` schema & RLS policies).

#### Key Changes & Architectural Alignment
1. **Shared Usage Standardization**:
   - Seeded canonical usage levels in `public.lookups` (`type = 'usage'`).
   - Shared across Allowed Content tabs that categorize content by usage permission (Monsters, Item Properties, etc.).
   - Standard levels: `Fair Game` (display label "Fair Game (Any DM)") and `Full DM Only`.
   - Unified configuration management across all Allowed Content tabs.

#### Verification Criteria
- `lookups` contains `type = 'usage'` with `Fair Game` and `Full DM Only`.
- Staff Admin and Engineer policy grants manage access.

#### Execution Status
| Environment | Dry-Run | Execute | Date | Notes |
| :--- | :---: | :---: | :--- | :--- |
| DEV | ✅ | ✅ | 2026-10-11 | Verified. 'usage' lookup record seeded. |
| PRODUCTION | ✅ | ✅ | 2026-10-11 | Verified. 'usage' lookup record seeded. |
