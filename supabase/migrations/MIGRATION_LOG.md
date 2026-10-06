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
