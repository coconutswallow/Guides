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
| **16** | 2026-10-11 | **Shared Usage Lookup** | `20261011_ac_shared_usage_lookup.sql` | `run_20261011_ac_shared_usage_lookup.js` | ✅ Applied | ✅ Applied |
| **18** | 2026-10-12 | **Other Rewards Normalization** | `20261012_ac_other_rewards_normalization.sql` | `run_20261012_ac_other_rewards_normalization.js` | ✅ Applied | ⏳ Pending (DEV Only) |
| **19** | 2026-10-12 | **AC Loot Normalization** | `20261012_ac_loot_normalization.sql` | `run_20261012_ac_loot_normalization.js` | ✅ Applied | ✅ Applied |
| **20** | 2026-10-12 | **Tiers Display & Rules** | `20261012_ac_tiers_display.sql` | `run_20261012_ac_tiers_display.js` | ✅ Applied | ✅ Applied |
| **21** | 2026-10-12 | **AC Loot Description Links** | `20261012_ac_loot_description_links.sql` | `run_20261012_ac_loot_description_links.js` | ✅ Applied | ✅ Applied |
| **22** | 2026-10-12 | **Other Rewards Description Links** | `20261012_ac_other_rewards_description_links.sql` | `run_20261012_ac_other_rewards_description_links.js` | ✅ Applied | ✅ Applied |
| **23** | 2026-10-12 | **AC Loot Notes & Links Population** | `20261012_ac_loot_notes_links.sql` | `run_20261012_ac_loot_notes_links.js` | ✅ Applied | ✅ Applied |
| **24** | 2026-10-12 | **AC Bastion Links Normalization** | `20261012_ac_bastion_links.sql` | `run_20261012_ac_bastion_links.js` | ✅ Applied | ✅ Applied |
| **38** | 2026-10-25 | **AC Loot Notes Re-alignment** | `20261025_ac_loot_notes_realignment.sql` | `run_20261025_ac_loot_notes_realignment.js` | ✅ Applied | ✅ Applied |

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

---

### Step 17: AC Tiers Normalization (`ac_tiers`)
- **Date**: 2026-10-12
- **Target Table**: `public.ac_tiers`
- **Runner**: `supabase/migrations/run_20261012_ac_tiers_normalization.js`
- **SQL Migration**: `supabase/migrations/20261012_ac_tiers_normalization.sql`
- **Source Spreadsheets**: `Allowed_Content_20261004.xlsx` (Loot & Other Rewards tabs), `AC_Tiers.xlsx`
- **Dependencies**: None (Foundational lookup for Loot and Other Rewards).

#### Key Changes & Architectural Alignment
1. **Canonical Tiers Reference Table**:
   - Reconciled the 3-tier nested hierarchy of rules (Category -> Tier -> Consumable/Permanent) across the upcoming Loot and Other Rewards tabs.
   - Created `public.ac_tiers` with:
     - `code VARCHAR(32) UNIQUE NOT NULL`
     - `name VARCHAR(64) NOT NULL`
     - `tier_group VARCHAR(16) NOT NULL` ('T0', 'T1', 'T2', 'T3', 'T4', 'Tier S', 'Special')
     - `award_type VARCHAR(32) NOT NULL` ('Rolled', 'Select', 'Multisession', 'Special')
     - `min_apl INTEGER` (APL thresholds: 1, 3, 5, 11, 17, 20)
     - `multisession_sessions INTEGER` (3, 5, 8 session requirements)
     - `dm_requirement VARCHAR(32)` ('Any DM', 'Trial DM', 'Full DM Only')
     - `description TEXT NOT NULL` (Universal baseline tier rules)
     - `loot_tier_rules TEXT` (Specific magic item distribution rules)
     - `reward_tier_rules TEXT` (Specific supernatural reward, charm, and mount rules)
     - `consumable_rules TEXT` (Duplicate allowances: 4 for T0, 3 for T1–T3, ammo limits 15/20)
     - `permanent_rules TEXT` (Permanent item limits: max 1 for T0, 50% session caps, Full DM locks)
     - `display_order DOUBLE PRECISION NOT NULL` (Fractional indexing)
2. **Canonical 17 Seed Tiers**:
   - Populated: `T0`, `T1`, `T1 Select`, `T1+`, `T2`, `T2 Select`, `T2+`, `T3`, `T3 Select`, `T3+`, `T4`, `T4 Select`, `T4+`, `Tier S`, `T2+/T3+/T4+`, `Varies`, `—`.
3. **Staff Admin & Engineer RLS Policies**:
   - Public read access (`SELECT`) for `anon, authenticated`.
   - Full management (`ALL`) for `service_role`.
   - Full management (`ALL`) for authenticated users with `Admin` or `Engineer` roles in `discord_users.roles`.

#### Commands to Run
```bash
# 1. Dry run on DEV
node supabase/migrations/run_20261012_ac_tiers_normalization.js --dry-run

# 2. Execute on DEV
node supabase/migrations/run_20261012_ac_tiers_normalization.js --execute

# 3. Dry run on PRODUCTION
node supabase/migrations/run_20261012_ac_tiers_normalization.js --dry-run --prod

# 4. Execute on PRODUCTION
node supabase/migrations/run_20261012_ac_tiers_normalization.js --execute --prod
```

#### Verification Criteria
- Table `public.ac_tiers` exists.
- Exactly 17 rows present.
- All 17 codes match canonical definitions.
- RLS policies active for public read, service role, and staff admin/engineer.

#### Execution Status
| Environment | Dry-Run | Execute | Date | Notes |
| :--- | :---: | :---: | :--- | :--- |
| DEV | ✅ | ✅ | 2026-10-12 | Verified. 17 rows, complete rule descriptions, RLS active. |
| PRODUCTION | ✅ | ✅ | 2026-10-12 | Verified. 17 rows, complete rule descriptions, RLS active. |

---

### Step 18: Other Rewards Normalization (`ac_other_rewards`, `ac_other_rewards_categories`)
- **Date**: 2026-10-12
- **Target Tables**: `public.ac_other_rewards`, `public.ac_other_rewards_categories`
- **Runner**: `supabase/migrations/run_20261012_ac_other_rewards_normalization.js`
- **SQL Migration**: `supabase/migrations/20261012_ac_other_rewards_normalization.sql`
- **Source Spreadsheets**: `Allowed_Content_20261004.xlsx` (Other Rewards tab), `AC_Other_Rewards.xlsx`, `AC_Other_Reward_Cat.xlsx`, `AC_Other_Reward_Type.xlsx`
- **Dependencies**: Step 01 (`ac_sources`), Step 17 (`ac_tiers`).

#### Key Changes & Architectural Alignment
1. **Backups Created**:
   - `public.ac_other_rewards_legacy_backup` and `public.ac_other_rewards_categories_legacy_backup`.
2. **Category Normalization (Level 1 Scope)**:
   - Reset bloated legacy categories (82 breadcrumbs) down to **5 canonical categories**:
     - `Dark Gifts` (10 items)
     - `Supernatural Gifts` (64 items)
     - `Mythic Gifts (Tier S)` (2 items)
     - `Charms` (81 items)
     - `Miscellaneous` (230 items)
   - Populated complete Level 1 rules into `notes` for each category (trade bans, PB limits, Long Rest swaps).
3. **Reward Items Normalization**:
   - Populated exactly **387 canonical rewards** (`REW_0001` through `REW_0387`).
   - Links `category_id` via foreign key to `public.ac_other_rewards_categories(id)`.
   - Links `tier_id` via foreign key to `public.ac_tiers(id)`.
   - Populated `tier_display` for 100% spreadsheet label parity (`T0`, `T1 Select`, `T1 Select (DM Select)`, etc.).
   - Populated `is_dm_select` boolean and `event_category` flags.
   - Normalized source keys to `TEXT[]` referencing canonical `ac_sources.source_key`s with GIN index.
   - Converted `display_order` to `DOUBLE PRECISION` (fractional indexing sequence).
4. **Staff Admin & Engineer RLS Policies**:
   - Public read access (`SELECT`) for `anon, authenticated`.
   - Full management (`ALL`) for `service_role`.
   - Full management (`ALL`) for authenticated users with `Admin` or `Engineer` roles in `discord_users.roles`.

#### Commands to Run
```bash
# 1. Dry run on DEV
node supabase/migrations/run_20261012_ac_other_rewards_normalization.js --dry-run

# 2. Execute on DEV
node supabase/migrations/run_20261012_ac_other_rewards_normalization.js --execute

# 3. Dry run on PRODUCTION (Pending)
node supabase/migrations/run_20261012_ac_other_rewards_normalization.js --dry-run --prod

# 4. Execute on PRODUCTION (Pending)
node supabase/migrations/run_20261012_ac_other_rewards_normalization.js --execute --prod
```

#### Verification Criteria
- Categories count: exactly 5.
- Total rewards: exactly 387.
- Distinct `check_id` sequence: `REW_0001` through `REW_0387` (387 distinct).
- Zero orphan category or tier foreign keys.
- All records have `source` as `TEXT[]` and `display_order` as `DOUBLE PRECISION`.
- RLS policies active on both tables.

#### Execution Status
| Environment | Dry-Run | Execute | Date | Notes |
| :--- | :---: | :---: | :--- | :--- |
| DEV | ✅ | ✅ | 2026-10-12 | Verified. 387 rows, 5 categories, 0 orphan FKs, RLS active. |
| PRODUCTION | ⏳ | ⏳ | — | Pending (Executed in DEV only per user instruction). |

---

### Step 19: AC Loot Normalization (`ac_loot`, `ac_loot_categories`, `ac_loot_tags`)
- **Date**: 2026-10-12
- **Source Spreadsheet**: `Allowed_Content_20261004.xlsx` (Loot tab)
- **Draft Reference**: `Allowed_Content_20261004.xlsx` (Loot)
- **Dependencies**: Step 17 (`public.ac_tiers`), Step 1 (`public.ac_sources`)
- **Files**:
  - `supabase/migrations/20261012_ac_loot_normalization.sql`
  - `supabase/migrations/run_20261012_ac_loot_normalization.js`
  - `.context/current-tasks/generate_loot_sql.py`
- **Commands Executed**:
  - `node supabase/migrations/run_20261012_ac_loot_normalization.js --dry-run`
  - `node supabase/migrations/run_20261012_ac_loot_normalization.js --execute`

#### Key Changes
1. **Legacy Table Archiving**:
   - Backed up legacy data safely into `public.ac_loot_legacy_backup` (1,351 rows) and `public.ac_loot_categories_legacy_backup` (77 rows).
2. **Category Normalization (Level 1 Scope)**:
   - Reset bloated legacy categories (77 navigation breadcrumbs) down to **4 canonical sections**:
     - `Rolled Loot` (1,006 items)
     - `Select Loot` (69 items)
     - `Multisession Loot` (64 items)
     - `Other Loot` (219 items)
   - Stored full Level 1 category rules directly in `notes` (`/hgenloot` usage, 50% permanent cap, predetermination eligibility, Full DM locks).
3. **Loot Items Normalization (Level 2 & Level 3 Scope)**:
   - Populated exactly **1,358 canonical items** (`LOT_0001` through `LOT_1358`).
   - Filtered out 3 navigation anchor rows (`2021 Hawthorne Coliseum`, `2025 Sky District`, `Feast of the Moon`).
   - Decomposed composite tier strings (e.g. `T2 Select Permanent (DM Select)`) into:
     - `tier_id` $\rightarrow$ foreign key to `public.ac_tiers(id)`
     - `nature` $\rightarrow$ `'Permanent'` (1,080), `'Consumable'` (267), or `'Varies'` (11)
     - `is_dm_select` $\rightarrow$ `boolean`
     - `event_category` $\rightarrow$ `'Exclusive Event'`, `'Seasonal Event'`, or `NULL`
     - `tier_display` $\rightarrow$ original composite string for 100% UI fidelity
   - Mapped source tokens to `TEXT[]` referencing canonical `ac_sources.source_key`s.
   - Converted `display_order` to `DOUBLE PRECISION` for fractional sequence indexing.
4. **Staff Admin, Auditor, and Engineer RLS Policies**:
   - Public read access (`SELECT`) for all users.
   - Full management (`INSERT`, `UPDATE`, `DELETE`) for `Admin`, `Auditor`, and `Engineer` roles via `discord_users.roles`.

#### Verification Criteria
- Categories count: exactly 4.
- Total loot items: exactly 1,358.
- Distinct `check_id` sequence: `LOT_0001` through `LOT_1358` (1,358 distinct).
- Zero orphan category or tier foreign keys.
- RLS policies active across `ac_loot`, `ac_loot_categories`, and `ac_loot_tags`.

#### Execution Status
| Environment | Dry-Run | Execute | Date | Notes |
| :--- | :---: | :---: | :--- | :--- |
| DEV | ✅ | ✅ | 2026-10-12 | Verified. 1,358 items, 4 categories, 0 orphan FKs, RLS active. |
| PRODUCTION | ⏳ | ⏳ | — | Pending (Executed in DEV only per user instruction). |

---

### Step 20: AC Other Rewards Deduplication (`ac_other_rewards`)
- **Date**: 2026-10-12
- **Scope**: Deduplication of accidental source spreadsheet repeat rows REW_0376 and REW_0377
- **Files**:
  - `supabase/migrations/20261011_ac_other_rewards_deduplication.sql`
  - `supabase/migrations/run_20261011_ac_other_rewards_deduplication.js`
- **Commands Executed**:
  - `node supabase/migrations/run_20261011_ac_other_rewards_deduplication.js --dry-run`
  - `node supabase/migrations/run_20261011_ac_other_rewards_deduplication.js --execute`

#### Key Changes
1. **Accidental Duplicate Removal**:
   - Removed `REW_0376` (duplicate "Quirk" entry mistakenly inserted before Story Outcomes).
   - Removed `REW_0377` (duplicate "Piety" entry mistakenly inserted before Story Outcomes).
2. **Canonical Entry Enrichment**:
   - Preserved and synchronized the full `notes_advice` instructions onto the canonical `REW_0159` ("Quirk") and `REW_0161` ("Piety") records.
3. **Table Item Count**:
   - Total items normalized from 387 to **385 items**.

#### Verification Criteria
- `public.ac_other_rewards` total count: 385 items.
- Duplicate entries `REW_0376` and `REW_0377` verified removed.
- Exactly 1 canonical `Quirk` entry and 1 canonical `Piety` entry.

#### Execution Status
| Environment | Dry-Run | Execute | Date | Notes |
| :--- | :---: | :---: | :--- | :--- |
| DEV | ✅ | ✅ | 2026-10-12 | Verified. 385 items, REW_0376/REW_0377 removed, canonical notes enriched. |
| PRODUCTION | ⏳ | ⏳ | — | Pending (Executed in DEV only per user instruction). |

---

### Step 21: AC Loot Description Links (`ac_loot`)
- **Date**: 2026-10-12
- **Scope**: Convert cross-reference links in `public.ac_loot` descriptions to markdown format
- **Files**:
  - `supabase/migrations/20261012_ac_loot_description_links.sql`
  - `supabase/migrations/run_20261012_ac_loot_description_links.js`
- **Commands Executed**:
  - `node supabase/migrations/run_20261012_ac_loot_description_links.js --dry-run`
  - `node supabase/migrations/run_20261012_ac_loot_description_links.js --execute`
  - `node supabase/migrations/run_20261012_ac_loot_description_links.js --dry-run --prod`
  - `node supabase/migrations/run_20261012_ac_loot_description_links.js --execute --prod`

#### Key Changes
1. **Fluff Puffle Pet Link**:
   - Converted "Fluff Puffle" companion reference in `LOT_1232` (*The Spirit of Joy*) to relative compendium link: `[Fluff Puffle](/monsters/#fluff-puffle)`.
2. **Tab Cross-References (Equipment)**:
   - Converted 118 items referencing `See Equipment` in `description` (e.g. `Base Cost: See Equipment.`, `Crafting Cost: See Equipment.`, `Tool: See Equipment (...)`) to `See [Equipment](/allowed-content/#equipment)`.
3. **Tab Cross-References (Downtime)**:
   - Converted 4 items referencing `See Downtime` in `description` (e.g. `Crafting Cost: See Downtime (Scribing Spell Scroll)`) to `See [Downtime](/allowed-content/#downtime)`.
4. **Non-Reference Safeguard**:
   - Items using "equipment" in ordinary sentences (`LOT_0067`, `LOT_0433` - "clean yourself and any equipment...") preserved intact without modification.

#### Verification Criteria
- `public.ac_loot` total count preserved at 1,358 items.
- `LOT_1232` verified containing `[Fluff Puffle](/monsters/#fluff-puffle)`.
- `public.ac_loot` verified with 118 items linked to `[Equipment](/allowed-content/#equipment)` and 0 unlinked.
- `public.ac_loot` verified with 4 items linked to `[Downtime](/allowed-content/#downtime)` and 0 unlinked.
- Non-reference items `LOT_0067` and `LOT_0433` verified uncorrupted.

#### Execution Status
| Environment | Dry-Run | Execute | Date | Notes |
| :--- | :---: | :---: | :--- | :--- |
| DEV | ✅ | ✅ | 2026-10-12 | Verified. 1,358 items, 118 Equipment links, 4 Downtime links, 1 Fluff Puffle link. |
| PRODUCTION | ✅ | ✅ | 2026-10-12 | Verified. 1,358 items, 118 Equipment links, 4 Downtime links, 1 Fluff Puffle link. |

---

### Step 22: AC Other Rewards Description Links (`ac_other_rewards`, `ac_loot`)
- **Date**: 2026-10-12
- **Scope**: Convert description links to markdown in `public.ac_other_rewards` and restore `notes_advice` for `LOT_1073` (*Talisman of the Gauntlet (HB)*) in `public.ac_loot`
- **Files**:
  - `supabase/migrations/20261012_ac_other_rewards_description_links.sql`
  - `supabase/migrations/run_20261012_ac_other_rewards_description_links.js`
- **Commands Executed**:
  - `node supabase/migrations/run_20261012_ac_other_rewards_description_links.js --dry-run`
  - `node supabase/migrations/run_20261012_ac_other_rewards_description_links.js --execute`

#### Key Changes
1. **Deity Factions External Links**:
   - Converted 14 deity factions (`REW_0299` through `REW_0312`) referencing Forgotten Realms: Heroes of Faerûn to markdown: `See [Forgotten Realms: Heroes of Faerûn](https://www.dndbeyond.com/sources/dnd/frhof) for a description and list of Renown rewards.`
2. **Monster Compendium Link**:
   - In `REW_0353` (*Flourishing Favor*), linked Fair Game to monster compendium: `in the [Fair Game](/allowed-content/#monsters) category of Allowed Content.`
3. **Allowed Content Tabs Cross-References**:
   - In `REW_0357` (*Renown Rewards (UUC)*), linked to Loot: `Allowed Content ([Loot](/allowed-content/#loot))`.
   - In `REW_0229` and `REW_0345`, linked to Equipment: `[Equipment](/allowed-content/#equipment)`.
   - In `REW_0348` (*Legate's Legions*), linked to Bastions: `from the [War Room](/allowed-content/#bastions) Bastion Facility`.
4. **Talisman of the Gauntlet (HB) Restoration**:
   - Restored `notes_advice` for `LOT_1073` in `public.ac_loot` with relative link: `[Order of the Gauntlet](/allowed-content/#other-rewards)`.

#### Verification Criteria
- `public.ac_other_rewards` count preserved at 385.
- 14 deity factions verified with D&D Beyond markdown link.
- `REW_0353` verified containing `[Fair Game](/allowed-content/#monsters)`.
- `REW_0357` verified containing `[Loot](/allowed-content/#loot)`.
- `REW_0229` & `REW_0345` verified containing `[Equipment](/allowed-content/#equipment)`.
- `REW_0348` verified containing `[War Room](/allowed-content/#bastions)`.
- `LOT_1073` verified with restored notes and `[Order of the Gauntlet](/allowed-content/#other-rewards)`.

#### Execution Status
| Environment | Dry-Run | Execute | Date | Notes |
| :--- | :---: | :---: | :--- | :--- |
| DEV | ✅ | ✅ | 2026-10-12 | Verified. 385 items, 14 external deity links, 5 cross-tab links, LOT_1073 restored. |
| PRODUCTION | ⏳ | ⏳ | — | Pending (Executed in DEV only per user instruction). |

---

### Step 23: AC Loot Notes & Links Population (`ac_loot`)
- **Date**: 2026-10-12
- **Scope**: Populate `notes_advice` for all 680 items in `public.ac_loot` from spreadsheet Column J, converting all embedded cell hyperlinks (193 links) and cross-references to markdown.
- **Files**:
  - `supabase/migrations/20261012_ac_loot_notes_links.sql`
  - `supabase/migrations/run_20261012_ac_loot_notes_links.js`
- **Commands Executed**:
  - `node supabase/migrations/run_20261012_ac_loot_notes_links.js --dry-run`
  - `node supabase/migrations/run_20261012_ac_loot_notes_links.js --execute`

#### Key Changes
1. **Spreadsheet Column J Restoration**:
   - Resolved the column index mapping bug from the initial normalization, populating `notes_advice` for all **680 loot items** that have rulings, crafting guidelines, and creator attributions in the source spreadsheet.
2. **Faction Renown Cross-References (40 items)**:
   - Converted internal named range hyperlinks (`OtherRewardsRenown...`) to relative Allowed Content links: `[<Faction Name>](/allowed-content/#other-rewards)` (*Order of the Gauntlet, Harpers, Emerald Enclave, Lords' Alliance, Zhentarim, Yamato Clan, Court of the Dunes, Crime Family, GEAR, Gilded Accord, HALO, Legion of Dread, Prismatic Lotus*).
3. **Allowed Content Tabs Cross-References (7 items)**:
   - Converted spreadsheet tab references to relative URLs:
     - `[Equipment](/allowed-content/#equipment)` (4 items)
     - `[Downtime](/allowed-content/#downtime)` (2 items)
     - `[Bastions](/allowed-content/#bastions)` (1 item)
4. **External Event & Source Links (147 items)**:
   - Converted 145 Discord event announcement links to markdown `[<Event Name>](https://discord.com/channels/...)` (*Coliseum, Feast of the Moon, Greengrass, Midwinter, Rage of Dragons, Wilds District, Founding Week, Lionheart Legion Playtest, etc.*).
   - Converted 2 D&D Beyond links to markdown `[Wayfinder's Guide to Eberron](https://marketplace.dndbeyond.com/category/SRC-00037)`.

#### Verification Criteria
- `public.ac_loot` row count preserved at 1,358 items.
- `public.ac_loot` verified with exactly 680 items having `notes_advice IS NOT NULL`.
- Verified 40 Other Rewards Renown faction links.
- Verified 145 Discord event announcement links.
- Verified 4 Equipment tab links, 2 Downtime tab links, and 1 Bastions tab link.
- Verified benchmark items: `LOT_1073` (*Talisman of the Gauntlet*), `LOT_0047` (*Adventurer's Ring*), `LOT_1202` (*Hawthorne Cast-Off Shirt of Mending*).

#### Execution Status
| Environment | Dry-Run | Execute | Date | Notes |
| :--- | :---: | :---: | :--- | :--- |
| DEV | ✅ | ✅ | 2026-10-12 | Verified. 1,358 items, 680 notes populated, 193 links converted. |
| PRODUCTION | ⏳ | ⏳ | — | Pending (Executed in DEV only per user instruction). |

---

### Step 24: AC Bastion Links Normalization (`ac_bastion`, `ac_bastion_type`)
- **Date**: 2026-10-12
- **Scope**: Convert cross-reference links in `public.ac_bastion` (18 facility notes) and `public.ac_bastion_type` (2 category notes) to relative markdown links within the website, and audit all check_IDs against `Allowed_Content_20261004.xlsx - Bastion tab`.
- **Files**:
  - `supabase/migrations/20261012_ac_bastion_links.sql`
  - `supabase/migrations/run_20261012_ac_bastion_links.js`
- **Commands Executed**:
  - `node supabase/migrations/run_20261012_ac_bastion_links.js --dry-run`
  - `node supabase/migrations/run_20261012_ac_bastion_links.js --execute`
  - `node supabase/migrations/run_20261012_ac_bastion_links.js --dry-run --prod`
  - `node supabase/migrations/run_20261012_ac_bastion_links.js --execute --prod`

#### Key Changes
1. **Check_ID Verification**:
   - Confirmed 100% 1:1 parity for all **66 facility check_IDs** (`BAS_0001` through `BAS_0066`) between the spreadsheet Bastions tab, `.context/current-tasks/Loaded/AC_Bastion.xlsx`, and `public.ac_bastion` across DEV and PRODUCTION.
2. **Category Rule Relative Links (`ac_bastion_type`)**:
   - `BASC_0001` (General Rules): Converted Appendix B reference to relative URL: `[Appendix B of the Player Guidelines](/playersguide/appendices/bastions/)`.
   - `BASC_0003` (Special Facilities): Converted Appendix B and downtime activity references to relative URLs: `[Appendix B of the Player Guidelines](/playersguide/appendices/bastions/)` and `[Crafting Magic Item](/allowed-content/#downtime)`.
3. **Facility Note Cross-References (`ac_bastion`)**:
   - Equipment tab links (8 facilities): `BAS_0020`, `BAS_0021`, `BAS_0023`, `BAS_0029`, `BAS_0030`, `BAS_0036`, `BAS_0057`, `BAS_0058` $\rightarrow$ `[Equipment](/allowed-content/#equipment)`.
   - Downtime tab links (8 facilities): `BAS_0021`, `BAS_0029`, `BAS_0032`, `BAS_0033`, `BAS_0036`, `BAS_0044`, `BAS_0047`, `BAS_0066` $\rightarrow$ `[Buying and Selling](/allowed-content/#downtime)`, `[Traveling](/allowed-content/#downtime)`, `[Building a Stronghold](/allowed-content/#downtime)`, `[Allowed Content (Downtime)](/allowed-content/#downtime)`.
   - Loot tab links (5 facilities): `BAS_0009`, `BAS_0020`, `BAS_0023`, `BAS_0034`, `BAS_0044` $\rightarrow$ `[Rolled](/allowed-content/#loot) or [Select](/allowed-content/#loot) Loot categories`.
   - Monsters tab link (1 facility): `BAS_0050` (Menagerie) $\rightarrow$ `[Monsters](/allowed-content/#monsters)`.
   - Other Rewards link (1 facility): `BAS_0059` (Liminal Space) $\rightarrow$ `[Allowed Content: Other Rewards (Dark Gifts)](/allowed-content/#other-rewards)`.
   - Player Guidelines link (1 facility): `BAS_0061` (War Room) $\rightarrow$ `[Appendix B of the Player Guidelines](/playersguide/appendices/bastions/)`.
4. **Draft Workbook Synchronization**:
   - Updated `.context/current-tasks/Loaded/AC_Bastion.xlsx` (18 facilities) and `.context/current-tasks/Loaded/AC_Bastion_Type.xlsx` (2 category types) to keep local offline references 100% in sync with database and live site.

#### Verification Criteria
- `public.ac_bastion_type`: 4 rows preserved in both DEV and PROD.
- `public.ac_bastion`: 66 rows preserved (`BAS_0001` through `BAS_0066`) in both DEV and PROD.
- 8 facilities verified with `[Equipment](/allowed-content/#equipment)` links.
- 8 facilities verified with Downtime links.
- 5 facilities verified with Loot links.
- Verified Menagerie (`BAS_0050`), Liminal Space (`BAS_0059`), and War Room (`BAS_0061`).

#### Execution Status
| Environment | Dry-Run | Execute | Date | Notes |
| :--- | :---: | :---: | :--- | :--- |
| DEV | ✅ | ✅ | 2026-10-12 | All 8 automated verification checks passed. |
| PRODUCTION | ✅ | ✅ | 2026-10-12 | All 8 automated verification checks passed. |

---

### Step 25: AC Downtime Links Normalization (`ac_downtime`, `ac_downtime_type`)
- **Date**: 2026-10-12
- **Scope**: Review each row of `Allowed_Content_20261004.xlsx - Downtime tab`, confirm `check_id` against `public.ac_downtime`, format external links in markdown (`[label](url)`), and convert spreadsheet cross-references to relative site URLs.
- **Files**:
  - `supabase/migrations/20261012_ac_downtime_links.sql`
  - `supabase/migrations/run_20261012_ac_downtime_links.js`
- **Commands Executed**:
  - `node supabase/migrations/run_20261012_ac_downtime_links.js --dry-run`
  - `node supabase/migrations/run_20261012_ac_downtime_links.js --execute`
  - `node supabase/migrations/run_20261012_ac_downtime_links.js --dry-run --prod`
  - `node supabase/migrations/run_20261012_ac_downtime_links.js --execute --prod`

#### Key Changes
1. **Check_ID Verification**:
   - Confirmed all **72 check_IDs** in the spreadsheet (`DTP_0001` through `DTP_0072`) map 1:1 to `DT_0001` through `DT_0072` in `public.ac_downtime` and `AC_Downtime.xlsx`.
   - Verified that all remaining rows without Col 16 in the master spreadsheet correspond to `DT_0073` through `DT_0130` in `public.ac_downtime`, preserving exact 130 row count parity.
2. **Category Rule Relative & External Links (`ac_downtime_type`)**:
   - `Bastions`: Replaced absolute site URL with relative link: `(see Appendix B of the [Player Guidelines](/playersguide/appendices/bastions/) for details)`.
   - `Building a Stronghold`: Replaced absolute site URL with relative link: `in [Appendix B](/playersguide/appendices/bastions/) of the Player Guidelines`.
   - `Traveling`: Replaced absolute site URL with relative link `[Player Guidelines](/playersguide/downtime/#traveling)` and normalized external map link to `[Forgotten Realms: Heroes of Faerûn map](https://www.aidedd.org/atlas/faerun)`.
3. **Downtime Activity Link Updates (`ac_downtime`)**:
   - `DT_0001` (*Construct or Expand a Bastion*): Converted Bastions tab link `[Bastions](/allowed-content/#bastions)`, Appendix B link `[Appendix B of the Player Guidelines](/playersguide/appendices/bastions/)`, and downtime cross-reference `[Traveling](/allowed-content/#downtime) downtime activity`.
   - `DT_0002` (*Construct or Expand a Shared Bastion*): Converted Bastions tab link `[Bastions](/allowed-content/#bastions)` and Appendix B link `[Appendix B of the Player Guidelines](/playersguide/appendices/bastions/)`.
   - `DT_0003` (*Haunted Bastions*): Added external markdown link to `[Ravenloft: The Horrors Within](https://www.dndbeyond.com/sources/dnd/rthw)`.
   - `DT_0005` (*Bastion (Stronghold)*): Converted Appendix B link to relative URL `[Appendix B](/playersguide/appendices/bastions/) of the Player Guidelines`.
   - Equipment tab links (13 activities: `DT_0015` through `DT_0022` buying/selling, and `DT_0024` through `DT_0028` crafting): Replaced `Equipment sheet` text with `[Equipment](/allowed-content/#equipment) tab`.
   - `DT_0039` (*Crafting T0 Consumable*): Converted `Loot sheet` text to `[Loot](/allowed-content/#loot)` and `Bastions sheet` text to `[Bastions](/allowed-content/#bastions)`.
   - `DT_0056` (*Ala Carte Rework (Level 6)*): Converted absolute site URL to relative URL `[Player Guidelines](/playersguide/appendices/2024-games/)`.
   - Languages tab links (4 activities: `DT_0104` through `DT_0107` learning languages): Replaced `Languages sheet` text with `[Languages](/allowed-content/#languages) tab`.
4. **Draft Workbook Synchronization**:
   - Updated `.context/current-tasks/Loaded/AC_Downtime.xlsx` (23 activities) and `.context/current-tasks/Loaded/AC_Downtime_Type.xlsx` (3 category types) to keep offline master workbooks 100% in sync with database and live site.

#### Verification Criteria
- `public.ac_downtime_type`: 13 rows preserved in both DEV and PROD.
- `public.ac_downtime`: 130 rows preserved (`DT_0001` through `DT_0130`) in both DEV and PROD.
- Exactly 13 activities verified with `[Equipment](/allowed-content/#equipment)` links.
- Exactly 4 activities verified with `[Languages](/allowed-content/#languages)` links.
- Verified Bastion activities (`DT_0001`, `DT_0002`, `DT_0003`, `DT_0005`).
- Verified magic item crafting (`DT_0039`) and level 6 rework (`DT_0056`).

#### Execution Status
| Environment | Dry-Run | Execute | Date | Notes |
| :--- | :---: | :---: | :--- | :--- |
| DEV | ✅ | ✅ | 2026-10-12 | All 7 automated verification checks passed. |
| PRODUCTION | ✅ | ✅ | 2026-10-12 | All 7 automated verification checks passed. |

---

### Step 26: AC Equipment Links Normalization (`ac_equipment`, `ac_equip_type`, `ac_equipment_categories`)
- **Date**: 2026-10-12
- **Scope**: Review each row of `Allowed_Content_20261004.xlsx - Equipment tab`, confirm `check_id` against `public.ac_equipment`, format external links in markdown (`[label](url)`), and convert spreadsheet cross-references to relative site URLs.
- **Files**:
  - `supabase/migrations/20261012_ac_equipment_links.sql`
  - `supabase/migrations/run_20261012_ac_equipment_links.js`
- **Commands Executed**:
  - `node supabase/migrations/run_20261012_ac_equipment_links.js --dry-run`
  - `node supabase/migrations/run_20261012_ac_equipment_links.js --execute`
  - `node supabase/migrations/run_20261012_ac_equipment_links.js --dry-run --prod`
  - `node supabase/migrations/run_20261012_ac_equipment_links.js --execute --prod`

#### Key Changes
1. **Check_ID Verification**:
   - Confirmed all **490 equipment items** map 1:1 between `Allowed_Content_20261004.xlsx`, `AC_Equipment.xlsx`, and `public.ac_equipment`.
   - Identified that rows 480–484 in the master spreadsheet (`EQP_0425` through `EQP_0429`) were section banner headers ("Vehicle Upgrades"), while `Wheat` was numbered `EQP_0495` in the database, preserving exact 490 items count across DEV and PRODUCTION.
2. **Category Rule Relative Links (`ac_equip_type`, `ac_equipment_categories`)**:
   - `Siege Ammunition and Weapons`: Converted structure reference `atop a structure such as a Bastion` to `atop a structure such as a [Bastion](/allowed-content/#bastions)`.
3. **Equipment Item Links (`ac_equipment`)**:
   - `EQP_0039` (*Lance*): Converted Loot reference to relative URL `[Loot](/allowed-content/#loot)`.
   - `EQP_0248` (*Cheese Bag*): Converted Downtime reference to relative URL `[downtime](/allowed-content/#downtime)`.
   - `EQP_0252` (*Adventurer's Ring*), `EQP_0273` (*Mechanical Wonder (Domestic)*), `EQP_0282` (*Prosthetic Limb*): Converted Loot reference to relative URL `[Allowed Content (Loot)](/allowed-content/#loot)`.
   - `EQP_0389` (*Demon Grinder*), `EQP_0390` (*Tormentor*), `EQP_0391` (*Scavenger*): Converted Downtime reference to relative URL `[Downtime](/allowed-content/#downtime)`.
   - `EQP_0394` (*Mechanical Beholder*), `EQP_0403` (*Rowboat*), `EQP_0409` (*Whaleboat*): Converted Bastion reference to relative URL `[Bastion](/allowed-content/#bastions)`.
   - `EQP_0396` (*Lyrandar Air Cruiser*), `EQP_0397` (*Lyrandar Skyskiff*), `EQP_0398` (*Strider Airship*): Converted Bastions reference to relative URL `[Bastions](/allowed-content/#bastions)` and converted external reference to markdown `[Eberron: Forge of the Artificer](https://www.dndbeyond.com/sources/dnd/efota)`.
   - `EQP_0399` (*Hot Air Balloon (HB)*): Converted Bastion reference to relative URL `[Bastion](/allowed-content/#bastions)` and downtime travel reference to `[downtime](/allowed-content/#downtime)`.
   - `EQP_0416` (*Nautiloid*): Converted planar travel reference to relative URL `[downtime](/allowed-content/#downtime)`.
   - `EQP_0453` (*Playful Pulp*): Converted description reference to relative URL `[Hawthorne Field Guide](/monsters/)`.
   - `EQP_0459` (*Songbird*): Converted description reference to markdown external URL `[Hawthorne Arcana](https://drive.google.com/file/d/1yoinFa31Rhq__unHxMxCSfMq7QY5ARYC/view)`.
   - `EQP_0487` (*Tuning Fork (Other Planes)*): Converted reference to markdown external URL `["Plane Speaking" in Dragon 120](https://archive.org/details/DragonMagazine260_201801/DragonMagazine120/page/n43/mode/2up)`.
   - `EQP_0494` (*Planar Puzzle Cube*): Converted Bastion reference to relative URL `[Bastion](/allowed-content/#bastions)`.
4. **Draft Workbook Synchronization**:
   - Updated `.context/current-tasks/Loaded/AC_Equipment.xlsx` (20 items) to keep offline master workbooks 100% in sync with database and live site.

#### Verification Criteria
- `public.ac_equipment`: 490 rows preserved in both DEV and PROD.
- `public.ac_equip_type` & `public.ac_equipment_categories`: 13 rows preserved.
- Exactly 4 items verified with `[Loot](/allowed-content/#loot)` links.
- Exactly 6 items verified with `[Downtime](/allowed-content/#downtime)` links.
- Exactly 8 items verified with `[Bastions](/allowed-content/#bastions)` links.
- Playful Pulp (`EQP_0453`) and Songbird (`EQP_0459`) verified with monster relative link & Google Drive external link.
- Tuning Fork (`EQP_0487`) and Eberron Airships (`EQP_0396`..`EQP_0398`) verified with external links.

#### Execution Status
| Environment | Dry-Run | Execute | Date | Notes |
| :--- | :---: | :---: | :--- | :--- |
| DEV | ✅ | ✅ | 2026-10-12 | All 7 automated verification checks passed. |
| PRODUCTION | ✅ | ✅ | 2026-10-12 | All 7 automated verification checks passed. |

---

### Step 27: AC Misc Class Features Links Normalization (`ac_fighting_styles`, `ac_artificer_infusions`, `ac_eldritch_invocations`)
- **Date**: 2026-10-12
- **Scope**: Review each row of `Allowed_Content_20261004.xlsx - Misc. Class Features tab`, confirm `check_id` against respective database tables, format external links in markdown (`[label](url)`), and convert spreadsheet cross-references to relative site URLs.
- **Files**:
  - `supabase/migrations/20261012_ac_misc_features_links.sql`
  - `supabase/migrations/run_20261012_ac_misc_features_links.js`
- **Commands Executed**:
  - `node supabase/migrations/run_20261012_ac_misc_features_links.js --dry-run`
  - `node supabase/migrations/run_20261012_ac_misc_features_links.js --execute`
  - `node supabase/migrations/run_20261012_ac_misc_features_links.js --dry-run --prod`
  - `node supabase/migrations/run_20261012_ac_misc_features_links.js --execute --prod`

#### Key Changes
1. **Check_ID Verification**:
   - Confirmed all **119 check_IDs** (`MSC_0001` through `MSC_0119`) map 1:1 to their respective tables:
     - `public.ac_fighting_styles`: 17 records (`MSC_0001` .. `MSC_0017`).
     - `public.ac_artificer_infusions`: 16 records (`MSC_0018` .. `MSC_0033`).
     - `public.ac_eldritch_invocations`: 86 records (`MSC_0034` .. `MSC_0119`).
2. **Relative Link Updates**:
   - `MSC_0017` (*2024 Fighting Styles*): Normalized link to in-page relative URL: `Refer to Fighting Style Feats [here](/allowed-content/#feats).`
   - `MSC_0029` (*Replicate Magic Item*): Converted spreadsheet reference `in the Items List` to relative URL `in [Loot](/allowed-content/#loot)`.
3. **Draft Workbook Synchronization**:
   - Updated `.context/current-tasks/Loaded/AC_Fightingstyles.xlsx` (`MSC_0017`) and `.context/current-tasks/Loaded/AC_Artificer_Infusion.xlsx` (`MSC_0029`).

#### Verification Criteria
- `public.ac_fighting_styles`: 17 rows preserved in both DEV and PROD.
- `public.ac_artificer_infusions`: 16 rows preserved in both DEV and PROD.
- `public.ac_eldritch_invocations`: 86 rows preserved in both DEV and PROD.
- Check_ID ranges: `MSC_0001`..`MSC_0017`, `MSC_0018`..`MSC_0033`, `MSC_0034`..`MSC_0119`.
- Verified Feats relative link in `MSC_0017` and Loot relative link in `MSC_0029`.

#### Execution Status
| Environment | Dry-Run | Execute | Date | Notes |
| :--- | :---: | :---: | :--- | :--- |
| DEV | ✅ | ✅ | 2026-10-12 | All 4 automated verification checks passed. |
| PRODUCTION | ✅ | ✅ | 2026-10-12 | All 4 automated verification checks passed. |

---

### Step 28: AC Spells Links Normalization (`ac_spells`)
- **Date**: 2026-10-12
- **Scope**: Review each row of `Allowed_Content_20261004.xlsx - Spells tab`, confirm `check_id` against `public.ac_spells`, format external links in markdown (`[label](url)`), and convert spreadsheet cross-references to relative site URLs.
- **Files**:
  - `supabase/migrations/20261012_ac_spells_links.sql`
  - `supabase/migrations/run_20261012_ac_spells_links.js`
- **Commands Executed**:
  - `node supabase/migrations/run_20261012_ac_spells_links.js --dry-run`
  - `node supabase/migrations/run_20261012_ac_spells_links.js --execute`
  - `node supabase/migrations/run_20261012_ac_spells_links.js --dry-run --prod` (Dry-run verified; ready for PROD execution)

#### Key Changes
1. **Check_ID Verification**:
   - Confirmed all **20 check_IDs** (`SPL_0001` through `SPL_0020`) map 1:1 to `public.ac_spells`.
2. **External Link Updates**:
   - `SPL_0007` (*Spells from EGW*): Added external markdown link to Hawthorne Arcana Google Drive: `[Hawthorne Arcana](https://drive.google.com/file/d/1yoinFa31Rhq__unHxMxCSfMq7QY5ARYC/view)`.
   - `SPL_0017` (*Spells from PHB (2024)*): Added external markdown link to PHB 2024 Spell Changes spreadsheet: `[PHB 2024 Spell Changes](https://docs.google.com/spreadsheets/d/1tKfU_-0uIi5SvnDXDdLw09WNw8X0akidCoZar1MeOL4/edit?usp=sharing)`.
3. **Relative Site Link Updates**:
   - `SPL_0012` (*Spells from AAG*): Converted spreadsheet reference `Equipment!A1` to relative URL `[Equipment](/allowed-content/#equipment)`.
   - `SPL_0018` (*Spells from FRHOF (2024)*): Converted spreadsheet cross-reference `Spells!A1` to relative URL `[Allowed Content (Spells)](/allowed-content/#spells)`.
4. **Draft Workbook Synchronization**:
   - Updated `.context/current-tasks/Loaded/AC_Spells.xlsx` (`SPL_0007`, `SPL_0012`, `SPL_0017`, `SPL_0018`) to keep offline master workbooks 100% in sync with database and live site.

#### Verification Criteria
- `public.ac_spells`: Exactly 20 rows preserved (`SPL_0001` through `SPL_0020`).
- Check_ID ranges: `SPL_0001`..`SPL_0020`.
- Verified external links formatted in markdown for `SPL_0007` and `SPL_0017`.
- Verified relative website links for `SPL_0012` (`/allowed-content/#equipment`) and `SPL_0018` (`/allowed-content/#spells`).

#### Execution Status
| Environment | Dry-Run | Execute | Date | Notes |
| :--- | :---: | :---: | :--- | :--- |
| DEV | ✅ | ✅ | 2026-10-12 | All 6 automated verification checks passed. Committed to DEV. |
| PRODUCTION | ✅ | ⏳ | 2026-10-12 | Dry-run verified. Pending execution when ready. |

---

### Step 29: AC Feats Links Normalization (`ac_feats`)
- **Date**: 2026-10-12
- **Scope**: Review each row of `Allowed_Content_20261004.xlsx - Feats tab`, confirm `check_id` against `public.ac_feats`, format external links in markdown (`[label](url)`), and convert spreadsheet cross-references to relative site URLs.
- **Files**:
  - `supabase/migrations/20261012_ac_feats_links.sql`
  - `supabase/migrations/run_20261012_ac_feats_links.js`
- **Commands Executed**:
  - `node supabase/migrations/run_20261012_ac_feats_links.js --dry-run`
  - `node supabase/migrations/run_20261012_ac_feats_links.js --execute`
  - `node supabase/migrations/run_20261012_ac_feats_links.js --dry-run --prod` (Dry-run verified; ready for PROD execution)

#### Key Changes
1. **Check_ID Verification**:
   - Confirmed all **346 check_IDs** (`FEA_0001` through `FEA_0346`) map 1:1 to `public.ac_feats`.
2. **External Link Updates**:
   - **Eberron: Rising from the Last War** (26 feats): Converted references across 13 Origin dragonmark feats (`FEA_0193`..`FEA_0205`), 12 Greater dragonmark feats (`FEA_0239`..`FEA_0250`), and Potent Dragonmark (`FEA_0275`) to `[Eberron: Rising from the Last War](https://www.dndbeyond.com/sources/dnd/erftlw)`.
   - **Hawthorne Arcana** (15 feats): Converted references in `FEA_0001` (Aberrant Dragonmark), 13 Origin dragonmark feats (`FEA_0193`..`FEA_0205`), and `FEA_0340` (Boon of Siberys) to `[Hawthorne Arcana](https://drive.google.com/file/d/1yoinFa31Rhq__unHxMxCSfMq7QY5ARYC/view)`.
3. **Relative Site Link Updates**:
   - `FEA_0154` (*Cult of the Dragon Initiate*): Converted spreadsheet reference `Allowed Content (Languages)` to relative website URL `[Allowed Content (Languages)](/allowed-content/#languages)`.
4. **Draft Workbook Synchronization**:
   - Updated `.context/current-tasks/Loaded/AC_Feats.xlsx` across all 29 corresponding records to keep offline master workbooks 100% in sync with database and live site.

#### Verification Criteria
- `public.ac_feats`: Exactly 346 rows preserved (`FEA_0001` through `FEA_0346`).
- Check_ID ranges: `FEA_0001`..`FEA_0346`.
- Exactly 26 feats verified with `[Eberron: Rising from the Last War](https://www.dndbeyond.com/sources/dnd/erftlw)`.
- Exactly 15 feats verified with `[Hawthorne Arcana](https://drive.google.com/file/d/1yoinFa31Rhq__unHxMxCSfMq7QY5ARYC/view)`.
- Exactly 1 feat (`FEA_0154`) verified with `[Allowed Content (Languages)](/allowed-content/#languages)`.
- Spot checks verified for multi-link feats (e.g. `FEA_0193`).

#### Execution Status
| Environment | Dry-Run | Execute | Date | Notes |
| :--- | :---: | :---: | :--- | :--- |
| DEV | ✅ | ✅ | 2026-10-12 | All 6 automated verification checks passed. Committed to DEV. |
| PRODUCTION | ✅ | ⏳ | 2026-10-12 | Dry-run verified. Pending execution when ready. |

---

### Step 30: AC Backgrounds Links & Check_ID Normalization (`ac_backgrounds`)
- **Date**: 2026-10-12
- **Scope**: Review each row of `Allowed_Content_20261004.xlsx - Backgrounds tab`, confirm `check_id` against `public.ac_backgrounds`, add `check_id` column and populate `BAC_0001`..`BAC_0166`, format external links in markdown (`[label](url)`), and convert spreadsheet cross-references to relative site URLs.
- **Files**:
  - `supabase/migrations/20261012_ac_backgrounds_links.sql`
  - `supabase/migrations/run_20261012_ac_backgrounds_links.js`
- **Commands Executed**:
  - `node supabase/migrations/run_20261012_ac_backgrounds_links.js --dry-run`
  - `node supabase/migrations/run_20261012_ac_backgrounds_links.js --execute`
  - `node supabase/migrations/run_20261012_ac_backgrounds_links.js --dry-run --prod` (Dry-run verified; ready for PROD execution)

#### Key Changes
1. **Check_ID Schema Evolution & Backfill**:
   - `public.ac_backgrounds` previously lacked the `check_id` audit column.
   - Added `check_id VARCHAR(32) NOT NULL UNIQUE` to `public.ac_backgrounds`.
   - Populated `check_id = 'BAC_' || LPAD(display_order::text, 4, '0')` for all 166 backgrounds, establishing strict 1:1 parity with `Allowed_Content_20261004.xlsx` (`BAC_0001` through `BAC_0166`).
2. **Link & Description Audit**:
   - Audited all 166 rows of `Allowed_Content_20261004.xlsx - Backgrounds` across Column 1 (`Name`), Column 4 (`Feature`), and Column 6 (`Notes / Rage Advice`).
   - Confirmed 0 cell hyperlinks in target text fields and 0 external URLs / cross-sheet spreadsheet links requiring link syntax conversions. All 166 descriptions are clean text.
3. **Draft Workbook Synchronization**:
   - Synchronized `.context/current-tasks/Loaded/AC_Backgrounds.xlsx` with `check_id` column and values `BAC_0001` through `BAC_0166` across all 166 records to keep offline master workbooks 100% in sync with database and live site.

#### Verification Criteria
- `public.ac_backgrounds`: Exactly 166 rows preserved (`BAC_0001` through `BAC_0166`).
- Check_ID ranges: `BAC_0001`..`BAC_0166` (166 distinct IDs, 0 nulls/empty).
- Strict 1:1 alignment between `display_order` and `check_id` across all 166 records.
- Spot checks verified for boundary records (`BAC_0001` = Cult of the Dragon Infiltrator, `BAC_0038` = Fallen Cloak Survivor, `BAC_0166` = Zhentarim Mercenary).

#### Execution Status
| Environment | Dry-Run | Execute | Date | Notes |
| :--- | :---: | :---: | :---: | :--- |
| PRODUCTION | ✅ | ⏳ | 2026-10-12 | Dry-run verified. Pending execution when ready. |

---

### Step 31: AC Feats Aberrant Dragonmark Website Link Update (`ac_feats`)
- **Date**: 2026-10-12
- **Scope**: Update Aberrant Dragonmark feats in `public.ac_feats` (`FEA_0001` and `FEA_0193`) so that the reference to Hawthorne Arcana points to the website link (`[Hawthorne Arcana](/arcana/)`) instead of the external Google Drive PDF.
- **Files**:
  - `supabase/migrations/20261012_ac_feats_aberrant_dragonmark_link.sql`
  - `supabase/migrations/run_20261012_ac_feats_aberrant_dragonmark_link.js`
- **Commands Executed**:
  - `node supabase/migrations/run_20261012_ac_feats_aberrant_dragonmark_link.js --dry-run`
  - `node supabase/migrations/run_20261012_ac_feats_aberrant_dragonmark_link.js --execute`
  - `node supabase/migrations/run_20261012_ac_feats_aberrant_dragonmark_link.js --dry-run --prod` (Dry-run verified; ready for PROD execution)

#### Key Changes
1. **Aberrant Dragonmark Link Normalization**:
   - Updated `FEA_0001` (2014 Aberrant Dragonmark) and `FEA_0193` (2024 Aberrant Dragonmark) in `public.ac_feats`.
   - Converted Google Drive URL (`https://drive.google.com/file/d/1yoinFa31Rhq__unHxMxCSfMq7QY5ARYC/view`) to the site link `[Hawthorne Arcana](/arcana/)`.
2. **Draft Workbook Synchronization**:
   - Synchronized `.context/current-tasks/Loaded/AC_Feats.xlsx` across both Aberrant Dragonmark records to keep offline master workbooks 100% in sync with database and live site.

#### Verification Criteria
- `public.ac_feats`: Exactly 346 rows preserved.
- `FEA_0001` verified with `[Hawthorne Arcana](/arcana/)`.
- `FEA_0193` verified with `[Hawthorne Arcana](/arcana/)`.
- Zero Google Drive links remaining in Aberrant Dragonmark records.

#### Execution Status
| Environment | Dry-Run | Execute | Date | Notes |
| :--- | :---: | :---: | :---: | :--- |
| PRODUCTION | ✅ | ⏳ | 2026-10-12 | Dry-run verified. Pending execution when ready. |

---

### Step 32: AC Races & Subraces Links Normalization (`ac_races`, `ac_subraces`, `v_ac_races`)
- **Date**: 2026-10-12
- **Scope**: Review each row of `Allowed_Content_20261004.xlsx - Races tab`, confirm `check_id` against `public.ac_races` and `public.ac_subraces`, format external links in markdown (`[label](url)`), and convert spreadsheet cross-references to relative site URLs.
- **Files**:
  - `supabase/migrations/20261012_ac_races_links.sql`
  - `supabase/migrations/run_20261012_ac_races_links.js`
- **Commands Executed**:
  - `node supabase/migrations/run_20261012_ac_races_links.js --dry-run`
  - `node supabase/migrations/run_20261012_ac_races_links.js --execute`
  - `node supabase/migrations/run_20261012_ac_races_links.js --dry-run --prod` (Dry-run verified; ready for PROD execution)

#### Key Changes
1. **Check_ID Architecture & Parity**:
   - `Allowed_Content_20261004.xlsx - Races` contains 247 rows (`RAC_0001` through `RAC_0247`).
   - 26 parent header rows have `(choose one)` subrace placeholders (e.g. `Elf (2014) (choose one)` = `RAC_0037`).
   - All 221 functional subrace/species rows correspond 1:1 to `public.ac_subraces`, which already carries `check_id VARCHAR(32) NOT NULL UNIQUE`.
2. **Hawthorne Arcana Website Link Normalization**:
   - Converted all raw text mentions of `can be found in Hawthorne Arcana` in `public.ac_subraces` (19 records across dragonmarked lineages, warforged, changelings, kalashtar) and `public.ac_races` (5 parent species) to relative website links: `can be found in [Hawthorne Arcana](/arcana/)`.
   - The inheritance view `public.v_ac_races` automatically reflects the markdown link across all subrace rows.
3. **Draft Workbook Synchronization**:
   - Synchronized `.context/current-tasks/Loaded/AC_Subraces.xlsx` across all 19 corresponding records to keep offline master workbooks 100% in sync with database and live site.

#### Verification Criteria
- `public.ac_races`: Exactly 114 base species preserved.
- `public.ac_subraces`: Exactly 221 subraces preserved (`RAC_0001` through `RAC_0247`).
- Exactly 19 subraces in `public.ac_subraces` verified with `[Hawthorne Arcana](/arcana/)`.
- Exactly 5 base races in `public.ac_races` verified with `[Hawthorne Arcana](/arcana/)`.
- Zero unlinked occurrences of `can be found in Hawthorne Arcana` remaining.
- Spot checks verified in `public.v_ac_races` for `RAC_0075` (Mark of Scribing) and `RAC_0179` (Warforged).

#### Execution Status
| Environment | Dry-Run | Execute | Date | Notes |
| :--- | :---: | :---: | :---: | :--- |
| DEV | ✅ | ✅ | 2026-10-12 | All 6 automated verification checks passed. Committed to DEV. |
| PRODUCTION | ✅ | ⏳ | 2026-10-12 | Dry-run verified. Pending execution when ready. |

---

### Step 33: Global Hawthorne Arcana Links Replacement (`ac_feats`, `ac_spells`, `ac_equipment`, Static Docs)
- **Date**: 2026-10-12
- **Scope**: Search the entire site and database for links to the external Google Drive PDF (`https://drive.google.com/file/d/1yoinFa31Rhq__unHxMxCSfMq7QY5ARYC/view`) and replace with the website link to Arcana (`/arcana/` in database Allowed Content tables, and `{{ '/arcana/' | relative_url }}` in Jekyll documentation).
- **Files**:
  - `_resources/PDF-guides.md`
  - `supabase/migrations/20261012_ac_arcana_links_global.sql`
  - `supabase/migrations/run_20261012_ac_arcana_links_global.js`
- **Commands Executed**:
  - `node supabase/migrations/run_20261012_ac_arcana_links_global.js --dry-run`
  - `node supabase/migrations/run_20261012_ac_arcana_links_global.js --execute`
  - `node supabase/migrations/run_20261012_ac_arcana_links_global.js --dry-run --prod` (Dry-run verified; ready for PROD execution)

#### Key Changes
1. **Static Documentation**:
   - `_resources/PDF-guides.md`: Replaced Google Drive PDF URL with Jekyll relative site link `[Hawthorne Arcana]({{ '/arcana/' | relative_url }})`.
2. **Database Allowed Content Tables**:
   - `public.ac_feats`: Converted remaining 13 dragonmark origin feats (`FEA_0194`–`FEA_0205`) and Boon of Siberys (`FEA_0340`) from the Google Drive URL to `[Hawthorne Arcana](/arcana/)`. All 15 dragonmark / Siberys / Aberrant feats now point to `/arcana/`.
   - `public.ac_spells`: Converted Dunamancy notes reference in `SPL_0007` (*Spells from EGW*) from Google Drive URL to `[Hawthorne Arcana](/arcana/)`.
   - `public.ac_equipment`: Converted *Songbird* (`EQP_0459`) description reference from Google Drive URL to `[Hawthorne Arcana](/arcana/)`.
   - `public.ac_monsters_legacy_backup`: Converted backup notes reference if table is present.

#### Verification Criteria
- `public.ac_feats`: Exactly 346 rows preserved; 0 Google Drive Arcana links remaining; 15 feats verified with `[Hawthorne Arcana](/arcana/)`.
- `public.ac_spells`: Exactly 20 rows preserved; 0 Google Drive Arcana links remaining; `SPL_0007` verified with `[Hawthorne Arcana](/arcana/)`.
- `public.ac_equipment`: Exactly 490 rows preserved; 0 Google Drive Arcana links remaining; `EQP_0459` verified with `[Hawthorne Arcana](/arcana/)`.
- Global audit across all other Allowed Content tables (`ac_classes`, `ac_subclasses`, `ac_races`, `ac_subraces`, `ac_backgrounds`, `ac_sources`, `ac_downtime`, `ac_bastions`, `ac_loot`, `ac_item_properties`, `ac_other_rewards`, `ac_monsters`) confirmed 0 Drive Arcana links remaining.

#### Execution Status
| Environment | Dry-Run | Execute | Date | Notes |
| :--- | :---: | :---: | :---: | :--- |
| DEV | ✅ | ✅ | 2026-10-12 | All 8 automated verification checks passed. Committed to DEV. |
| PRODUCTION | ✅ | ⏳ | 2026-10-12 | Dry-run verified (all 8 checks passed). Pending execution when ready. |

---

### Step 34: AC Sources Links Normalization (`ac_sources`)
- **Date**: 2026-10-12
- **Scope**: Review each row of `Allowed_Content_20261004.xlsx - Sources tab`, confirm `check_id` against `public.ac_sources`, format external links in markdown (`[label](url)`), and convert spreadsheet cross-references to relative site URLs (`/allowed-content/#...`).
- **Files**:
  - `supabase/migrations/20261012_ac_sources_links.sql`
  - `supabase/migrations/run_20261012_ac_sources_links.js`
  - `.context/current-tasks/AC_Sources v2.xlsx`
- **Commands Executed**:
  - `node supabase/migrations/run_20261012_ac_sources_links.js --dry-run`
  - `node supabase/migrations/run_20261012_ac_sources_links.js --execute`
  - `node supabase/migrations/run_20261012_ac_sources_links.js --dry-run --prod` (Dry-run verified; ready for PROD execution)

#### Key Changes
1. **Check_ID Architecture & Parity**:
   - `Allowed_Content_20261004.xlsx - Sources` contains 119 source records (`SRC_0001` through `SRC_0119`).
   - Every single check_id corresponds 1:1 to `public.ac_sources`.
   - `public.ac_sources` additionally contains 2 site-internal synthetic navigation records (`SRC_0120` Hawthorne Homebrew and `SRC_0121` Allowed Content) for 121 total records.
2. **Notes & Cross-Reference Link Normalization**:
   - `SRC_0009` (*The Book of Many Things*): Converted raw Google Spreadsheet cross-reference to `[Feats](/allowed-content/#feats)` and updated Loot mention to relative link `[Loot](/allowed-content/#loot)`.
   - `SRC_0023` (*Explorer's Guide to Wildemount*): Converted raw Google Spreadsheet cross-reference to `[Spells](/allowed-content/#spells)`.
   - `SRC_0001`–`SRC_0006`: Confirmed Core rulebook external links to Basic Rules, SRD, and Sage Advice are properly formatted as markdown `[label](url)`.
3. **Draft Workbook Synchronization**:
   - Synchronized `.context/current-tasks/AC_Sources v2.xlsx` across `SRC_0009`, `SRC_0023`, and `SRC_0118` to maintain exact 1:1 parity with database and live site.

#### Verification Criteria
- `public.ac_sources`: Exactly 121 rows preserved.
- All 119 distinct `SRC_*` records confirmed present.
- `SRC_0009` verified with `[Feats](/allowed-content/#feats)` and `[Loot](/allowed-content/#loot)`.
- `SRC_0023` verified with `[Spells](/allowed-content/#spells)`.
- Zero Google Spreadsheet URLs (`docs.google.com/spreadsheets`) remaining in `ac_sources`.
- All 6 Core rulebooks verified with external markdown links.

#### Execution Status
| Environment | Dry-Run | Execute | Date | Notes |
| :--- | :---: | :---: | :---: | :--- |
| DEV | ✅ | ✅ | 2026-10-12 | All 6 automated verification checks passed. Committed to DEV. |
| PRODUCTION | ✅ | ⏳ | 2026-10-12 | Dry-run verified (all 6 checks passed). Pending execution when ready. |

---

### Step 35: Drop Deprecated AC Legacy Backup Tables
- **Date**: 2026-10-12
- **Scope**: Clean up 12 deprecated `ac_*_legacy_backup` and `ac_*_legacy_20261004` snapshot tables in PostgreSQL that were created during earlier normalization steps.
- **Files**:
  - `supabase/migrations/20261012_drop_ac_legacy_tables.sql`
  - `supabase/migrations/run_20261012_drop_ac_legacy_tables.js`
- **Commands Executed**:
  - `node supabase/migrations/run_20261012_drop_ac_legacy_tables.js --dry-run`
  - `node supabase/migrations/run_20261012_drop_ac_legacy_tables.js --execute`
  - `node supabase/migrations/run_20261012_drop_ac_legacy_tables.js --dry-run --prod` (Dry-run verified; ready for PROD execution)

#### Key Changes
1. **Dropped Snapshot Tables**:
   - `public.ac_artificer_infusions_legacy_backup`
   - `public.ac_classes_legacy_backup`
   - `public.ac_eldritch_invocations_legacy_backup`
   - `public.ac_feats_legacy_backup`
   - `public.ac_fighting_styles_legacy_backup`
   - `public.ac_loot_categories_legacy_backup`
   - `public.ac_loot_legacy_backup`
   - `public.ac_monsters_categories_legacy_backup`
   - `public.ac_monsters_legacy_backup`
   - `public.ac_other_rewards_categories_legacy_backup`
   - `public.ac_other_rewards_legacy_backup`
   - `public.ac_races_legacy_20261004`
2. **Schema Integrity Verified**:
   - Confirmed 0 foreign key dependencies and 0 dependent views on any of the dropped tables.
   - All primary Allowed Content tables (`ac_sources`, `ac_classes`, `ac_subclasses`, `ac_races`, `ac_subraces`, `ac_backgrounds`, `ac_feats`, `ac_spells`, `ac_equipment`, `ac_bastion`, `ac_bastion_type`, `ac_downtime`, `ac_loot`, `ac_monsters`, `ac_other_rewards`, `ac_item_properties`, `ac_languages`) verified 100% preserved with full row counts.
   - Database views `public.v_ac_classes` and `public.v_ac_races` verified fully intact and queryable.

#### Verification Criteria
- All 12 legacy backup tables confirmed dropped from `information_schema.tables`.
- All 17 primary AC tables confirmed intact with complete record counts.
- Active views `v_ac_classes` (244 rows) and `v_ac_races` (221 rows) verified intact.

#### Execution Status
| Environment | Dry-Run | Execute | Date | Notes |
| :--- | :---: | :---: | :---: | :--- |
| DEV | ✅ | ✅ | 2026-10-12 | All 12 legacy tables dropped. Committed to DEV. |
| PRODUCTION | ✅ | ⏳ | 2026-10-12 | Dry-run verified (all checks passed). Pending execution when ready. |

---

### Step 36: Drop Deprecated AC Compatibility Views (`ac_downtime_categories`, `ac_equipment_categories`)
- **Date**: 2026-10-12
- **Scope**: Clean up 2 deprecated compatibility views in PostgreSQL (`public.ac_downtime_categories` and `public.ac_equipment_categories`) that were superseded by base tables `ac_downtime_type` and `ac_equip_type`.
- **Files**:
  - `supabase/migrations/20261012_drop_ac_legacy_views.sql`
  - `supabase/migrations/run_20261012_drop_ac_legacy_views.js`
- **Commands Executed**:
  - `node supabase/migrations/run_20261012_drop_ac_legacy_views.js --dry-run`
  - `node supabase/migrations/run_20261012_drop_ac_legacy_views.js --execute`
  - `node supabase/migrations/run_20261012_drop_ac_legacy_views.js --dry-run --prod` (Dry-run verified; ready for PROD execution)

#### Key Changes
1. **Dropped Compatibility Views**:
   - `public.ac_downtime_categories` (previously mapped to `ac_downtime_type`)
   - `public.ac_equipment_categories` (previously mapped to `ac_equip_type`)
2. **Security & RLS Resolution**:
   - Neither view had `security_invoker = true`, running under default security-definer privileges.
   - Verified that neither view is queried anywhere in the active codebase (`ac-service.js` directly queries canonical base tables `ac_downtime_type` and `ac_equip_type`).
   - Dropping these unused views eliminates unneeded schema overhead and security lint warnings.
3. **Canonical Base Tables & Active Views Preserved**:
   - `public.ac_downtime_type` (13 rows) and `public.ac_equip_type` (13 rows) confirmed 100% intact.
   - Active views `public.v_ac_classes` and `public.v_ac_races` (with `security_invoker = true`) confirmed intact.

#### Verification Criteria
- Both deprecated views confirmed dropped from `information_schema.views`.
- Base tables `ac_downtime_type` and `ac_equip_type` verified intact with 13 rows each.
- Active views `v_ac_classes` and `v_ac_races` verified intact and queryable.

#### Execution Status
| Environment | Dry-Run | Execute | Date | Notes |
| :--- | :---: | :---: | :---: | :--- |
| DEV | ✅ | ✅ | 2026-10-12 | Both deprecated views dropped. Committed to DEV. |
| PRODUCTION | ✅ | ⏳ | 2026-10-12 | Dry-run verified (all checks passed). Pending execution when ready. |


---

### Step 37: Drop AC Legacy Bastion Tables (`ac_bastions`, `ac_bastion_categories`)
- **Date**: 2026-10-14
- **Scope**: Clean up 2 deprecated pre-normalization Bastion tables in PostgreSQL (`public.ac_bastions` and `public.ac_bastion_categories`) that were superseded by normalized base tables `public.ac_bastion` and `public.ac_bastion_type`.
- **Files**:
  - `supabase/migrations/20261014_drop_ac_bastions_legacy_tables.sql`
  - `supabase/migrations/run_20261014_drop_ac_bastions_legacy_tables.js`
- **Commands Executed**:
  - `node supabase/migrations/run_20261014_drop_ac_bastions_legacy_tables.js --dry-run`
  - `node supabase/migrations/run_20261014_drop_ac_bastions_legacy_tables.js --execute`
  - `node supabase/migrations/run_20261014_drop_ac_bastions_legacy_tables.js --dry-run --prod`
  - `node supabase/migrations/run_20261014_drop_ac_bastions_legacy_tables.js --execute --prod`

#### Key Changes
1. **Dropped Legacy Bastion Tables**:
   - `public.ac_bastions` (superseded by normalized `ac_bastion`)
   - `public.ac_bastion_categories` (superseded by normalized `ac_bastion_type`)
2. **Service Layer Clean-Up**:
   - In `assets/js/allowed-content/ac-service.js`, removed deprecated fallback query logic that attempted to read from `ac_bastions` or `ac_bastion_categories`. All reads and CRUD operations exclusively target `ac_bastion` and `ac_bastion_type`.
3. **Verification Criteria**:
   - `ac_bastions` and `ac_bastion_categories` confirmed dropped from `information_schema.tables` in both DEV and PRODUCTION environments.
   - Active normalized tables `public.ac_bastion` (66 rows) and `public.ac_bastion_type` (4 rows) verified 100% intact.
   - Re-extracted metadata via `generate_ac_schema_metadata.js`, indexing 32 clean tables/views.

#### Execution Status
| Environment | Dry-Run | Execute | Date | Notes |
| :--- | :---: | :---: | :---: | :--- |
| DEV | ✅ | ✅ | 2026-10-14 | Both legacy bastion tables dropped. Committed to DEV. |
| PRODUCTION | ✅ | ✅ | 2026-10-14 | Both legacy bastion tables dropped. Committed to PRODUCTION. |

---

### Step 38: AC Loot Notes Re-alignment (`public.ac_loot`)
- **Date**: 2026-10-25
- **Scope**: Re-align all `notes_advice` values in `public.ac_loot` with canonical spreadsheet `Allowed_Content_20261004.xlsx - Loot tab`.
- **Root Cause Resolved**: The initial notes population migration (`20261012_ac_loot_notes_links.sql`) keyed updates on spreadsheet Column P (`check_id`). Two items in the source spreadsheet lacked Column P IDs (`Zhentarim Token (HB)` at row 194 and `Hawthorne Cape (HB)` at row 1433), whereas the initial schema migration generated sequential IDs (`LOT_0001` to `LOT_1358`). This caused an off-by-one upward shift from row 195 onwards (e.g. Blight Ichor's note displaying on Blasting Powder) and an off-by-two shift after row 1433, as well as leaving Zhentarim Token and Hawthorne Cape without notes, and overwriting Rod of Absorption's note due to a duplicate ID in the spreadsheet.
- **Files**:
  - `supabase/migrations/20261025_ac_loot_notes_realignment.sql`
  - `supabase/migrations/run_20261025_ac_loot_notes_realignment.js`
- **Commands Executed**:
  - `node supabase/migrations/run_20261025_ac_loot_notes_realignment.js --dry-run`
  - `node supabase/migrations/run_20261025_ac_loot_notes_realignment.js --execute`
  - `node supabase/migrations/run_20261025_ac_loot_notes_realignment.js --dry-run --prod`
  - `node supabase/migrations/run_20261025_ac_loot_notes_realignment.js --execute --prod`

#### Key Changes
1. **Safety Backup**: Created table `public.ac_loot_notes_backup_20261025` before resetting notes.
2. **Notes Realignment**:
   - Cleared shifted and orphaned notes (`notes_advice = NULL`).
   - Populated exact 1:1 notes for all **681 loot items** having notes in the canonical spreadsheet.
   - Restored notes and markdown links for `LOT_0175` (`Zhentarim Token (HB)` with `[Zhentarim](/allowed-content/#other-rewards)`) and `LOT_1233` (`Hawthorne Cape (HB)` with February 2025 event announcement Discord link).
   - Corrected `LOT_0177` (`Blasting Powder`) to `NULL` notes, and aligned `LOT_0178` (`Blight Ichor`) with its Underdark fungi note.
   - Restored `LOT_1077` (`Rod of Absorption`) multisession limit note and set `LOT_1078` (`+2 All-Purpose Tool`) to `NULL`.
3. **Verification Criteria**:
   - `public.ac_loot` total row count preserved at 1,358 items.
   - Exactly 681 rows with `notes_advice IS NOT NULL` (677 `NULL`).
   - 40 Other Rewards renown faction links verified.
   - 146 Discord event links verified.
   - 4 Equipment links, 2 Downtime links, 1 Bastions link verified.
   - All benchmark items (`LOT_0175`, `LOT_0177`, `LOT_0178`, `LOT_1077`, `LOT_1078`, `LOT_1079`, `LOT_1232`, `LOT_1233`) verified 100%.

#### Execution Status
| Environment | Dry-Run | Execute | Date | Notes |
| :--- | :---: | :---: | :---: | :--- |
| DEV | ✅ | ✅ | 2026-10-25 | Re-aligned all 681 notes. All verification checks passed. |
| PRODUCTION | ✅ | ✅ | 2026-10-25 | Re-aligned all 681 notes. All verification checks passed. |

---

### Step 39: Monster Tags & Relations Schema (`public.monster_tags`, `public.monster_tag_relations`)
- **Date**: 2026-10-31
- **Scope**: Create normalized tables `public.monster_tags` and `public.monster_tag_relations` (n:n) with indexes and RLS policies for monster search, tagging, and compendium filtering.
- **Files**:
  - `supabase/migrations/20261031_monster_tags.sql`
  - `supabase/migrations/run_20261031_monster_tags.js`
- **Commands Executed**:
  - `node supabase/migrations/run_20261031_monster_tags.js --dry-run`
  - `node supabase/migrations/run_20261031_monster_tags.js --execute`
  - `node supabase/migrations/run_20261031_monster_tags.js --dry-run --prod`
  - `node supabase/migrations/run_20261031_monster_tags.js --execute --prod`

#### Key Changes
1. **monster_tags**:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `name TEXT NOT NULL`
   - Case-insensitive unique index `idx_monster_tags_name_lower` on `LOWER(TRIM(name))`
   - Timestamps `created_at` and `updated_at`
2. **monster_tag_relations** (n:n junction):
   - `monster_row_id UUID NOT NULL REFERENCES public.monsters(row_id) ON DELETE CASCADE`
   - `tag_id UUID NOT NULL REFERENCES public.monster_tags(id) ON DELETE CASCADE`
   - Composite PK `(monster_row_id, tag_id)`
   - Indexes on `monster_row_id` and `tag_id`
3. **RLS Policies**:
   - `monster_tags`: Public `SELECT` allowed; `ALL` (insert/update/delete) restricted to `Admin` and `Engineer` roles.
   - `monster_tag_relations`: Public `SELECT` allowed; `ALL` restricted to monster creators, `is_monster_admin()`, `Admin`, and `Engineer`.
4. **No Initial Seeding**: Tables initialized empty for manual tag management via Staff Portal.

#### Execution Status
| Environment | Dry-Run | Execute | Date | Notes |
| :--- | :---: | :---: | :---: | :--- |
| DEV | ✅ | ✅ | 2026-10-31 | Schema and RLS policies created. All verification checks passed. |
| PRODUCTION | ✅ | ✅ | 2026-10-31 | Schema and RLS policies created. All verification checks passed. |

---

### Step 40: Schema Migrations Tracking & Catch-up CLI (`public._schema_migrations`)
- **Date**: 2026-10-31
- **Scope**: Establish in-database schema migration tracking table `public._schema_migrations` and unified CLI (`migrate.js`) to track which migrations have run in DEV vs. PROD, detect drift, and perform safe catch-up migrations into PROD upon explicit approval.
- **Files**:
  - `supabase/migrations/20261031_schema_migrations_tracking.sql`
  - `supabase/migrations/run_20261031_schema_migrations_tracking.js`
  - `supabase/migrations/migrate.js`
- **Commands Executed**:
  - `node supabase/migrations/run_20261031_schema_migrations_tracking.js --dry-run`
  - `node supabase/migrations/run_20261031_schema_migrations_tracking.js --execute`
  - `node supabase/migrations/migrate.js baseline --execute`
  - `node supabase/migrations/migrate.js status`
- **Key Changes**:
  1. `public._schema_migrations`: `version VARCHAR(120) PRIMARY KEY`, `name TEXT`, `checksum VARCHAR(64)`, `applied_at TIMESTAMPTZ`, `applied_by TEXT`, `execution_time_ms INT`.
  2. Baseline established for all 76 historical migration scripts.
  3. CLI commands added to `package.json`: `migrate:status`, `migrate:catchup`, `migrate:baseline`.
  4. Updated `AGENTS.md` restricting agents from executing PROD migrations without explicit user approval.
- **Execution Status**:
  | Environment | Dry-Run | Execute | Date | Notes |
  | :--- | :---: | :---: | :---: | :--- |
  | DEV | ✅ | ✅ | 2026-10-31 | Table created and all 76 historical migrations baselined. |
  | PRODUCTION | ✅ | ✅ | 2026-10-31 | Verified and baselined via migration manager. |

---

### Step 41: Harden Monster & Features RLS Policies (`public.monsters`, `public.monster_features`)
- **Date**: 2026-10-31
- **Scope**: Harden database RLS policies on `public.monsters` and `public.monster_features` following security code review:
  - Enforce `status = 'Draft'` and `is_live = false` on creator INSERTs.
  - Restrict creator UPDATEs to `Draft` and `Pending` statuses (prevent unauthorized `Approved` or `is_live` promotion).
  - Codify public SELECT policies for anonymous users on `is_live = true` monsters and their features.
- **Files**:
  - `supabase/migrations/20261031_harden_monster_rls.sql`
  - `supabase/migrations/run_20261031_harden_monster_rls.js`
- **Commands Executed**:
  - `node supabase/migrations/run_20261031_harden_monster_rls.js --dry-run`
  - `node supabase/migrations/run_20261031_harden_monster_rls.js --execute`
- **Execution Status**:
  | Environment | Dry-Run | Execute | Date | Notes |
  | :--- | :---: | :---: | :---: | :--- |
  | DEV | ✅ | ✅ | 2026-10-31 | Applied and recorded in _schema_migrations. |
  | PRODUCTION | ✅ | ✅ | 2026-10-31 | Synchronized with DEV. |




