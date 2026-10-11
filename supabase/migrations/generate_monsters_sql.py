"""
Generator script for AC Monsters Normalization:
- Reads Allowed_Content_20261004.xlsx (Monsters tab)
- Filters out Hawthorne Field Guide (HTFG) monsters (67 records)
- Extracts 3,195 official monsters with MON_ check_ids
- Outputs normalized AC_Monsters.xlsx
- Generates 20261011_ac_monsters_normalization.sql
"""

import openpyxl
import datetime
import uuid
import os
import json

# 1. Source Mapping Dictionary (validated against public.ac_sources)
SOURCE_KEY_MAP = {
    'acquistions incorporated': 'AcqInc',
    'adventure atlas: the mortuary': 'AATM',
    'astarion\'s book of hungers': 'ABH',
    'baldur\'s gate: descent into avernus': 'BGDIA',
    'bigby presents: glory of the giants': 'BGG',
    'boo\'s astral menagerie': 'BAM',
    'book of many things': 'BMT',
    'candlekeep mysteries': 'CM',
    'critical role: call of the netherdeep': 'CRCotN',
    'curse of strahd': 'CoS',
    'descent into the lost caverns of tsojcanth': 'DLCT',
    'dragon of icespire peak': 'DIP',
    'dragonlance: shadow of the dragon queen': 'DSotDQ',
    'dragons of stormwreck isle': 'DoSI',
    'dungeon master\'s guide 2014': 'DMG2014',
    'eberron: forge of the artificer': 'EFA',
    'eberron: rising from the last war': 'ERLW',
    'explorer\'s guide to wildemount': 'EGW',
    'fizban\'s treasury of dragons': 'FTD',
    'forgotten realms: adventures in faerûn': 'FRAIF',
    'ghosts of saltmarsh': 'GoS',
    'guildmasters\' guide to ravnica': 'GGR',
    'hawthorne arcana': 'HTA',
    'heroes of the borderlands': 'HotB',
    'hoard of the dragon queen (tyranny of dragons)': 'HOTDQ_TOD',
    'honor among thieves: thieves\' gallery': 'HAT_TG',
    'humblewood campaign setting': 'HWCS',
    'humblewood tales': 'HWT',
    'icewind dale: rime of the frostmaiden': 'IDRotF',
    'infernal machine rebuild': 'IMR',
    'journeys through the radiant citadel': 'JTTRC',
    'keys from the golden vault': 'KftGV',
    'light of xaryxis': 'LoX',
    'locathah rising': 'LR',
    'lorwyn: first light': 'LFL',
    'lost laboratory of kwalish': 'LLK',
    'lost mine of phandelver': 'LMoP',
    'misplaced monsters: volume 1': 'MMV1',
    'monster manual 2014': 'MM2014',
    'monster manual 2024': 'MM2024',
    'monstrous compendium volume 1: spelljammer creatures': 'MCV1_SC',
    'monstrous compendium volume 2: dragonlance creatures': 'MCV1_DC',
    'monstrous compendium volume 3: minecraft creatures': 'MCV3_MC',
    'monstrous compendium volume 4: eldraine creatures': 'MCV3_EC',
    'mordenakainen\'s fiendish folio': 'MFF',
    'mordenkainen presents: monsters of the multiverse': 'MPMM',
    'mordenkainen\'s fiendish folio': 'MFF',
    'mordenkainen\'s tome of foes': 'MTF',
    'morte\'s planar parade': 'MPP',
    'mythic odysseys of theros': 'MOT',
    'netheril\'s fall': 'NF',
    'out of the abyss': 'OotA',
    'phandelver and below: the shattered obelisk': 'PBTSO',
    'player\'s handbook 2024': 'PHB2024',
    'princes of the apocalypse': 'PotA',
    'quests from the infinite staircase': 'QftIS',
    'ravenloft: the horrors within': 'RHW',
    'return to the glory': 'RtG',
    'rise of tiamat (tyranny of dragons)': 'ROT_TOD',
    'storm king\'s thunder': 'SKT',
    'storm lord\'s wrath': 'SLW',
    'strixhaven: curriculum of chaos': 'SCC',
    'tales from the yawning portal': 'TftYP',
    'the tortle package': 'TTP',
    'the wild beyond the witchlight': 'WBTW',
    'tomb of annihilation': 'ToA',
    'turn of fortune\'s wheel': 'ToFW',
    'van richten\'s guide to ravenloft': 'VRGR',
    'vecna dossier': 'VD',
    'vecna: eve of ruin': 'VEOR',
    'volo\'s guide to monsters': 'VGM',
    'waterdeep: dragon heist': 'WDH',
    'waterdeep: dungeon of the mad mage': 'WDMM',
    'welcome to the hellfire club': 'WttHC'
}

# Category UUIDs
CAT_FAIR_GAME_ID = 'c1ce104d-076e-4eaa-b464-06467a67ddcd'
CAT_FULL_DM_ONLY_ID = 'a4a35cf9-768c-5722-a9b0-92ee7e02b78a'

def clean_cr(val):
    if val is None:
        return None
    if isinstance(val, (datetime.datetime, datetime.date)):
        if val.month == 1:
            return f"1/{val.day}"
        return val.strftime('%Y-%m-%d')
    if isinstance(val, float):
        if val.is_integer():
            return str(int(val))
        return str(val)
    if isinstance(val, int):
        return str(val)
    return str(val).strip()

def sql_str(val):
    if val is None:
        return "NULL"
    escaped = str(val).replace("'", "''")
    return f"'{escaped}'"

def main():
    print("Reading Allowed_Content_20261004.xlsx...")
    wb = openpyxl.load_workbook('.context/current-tasks/Allowed_Content_20261004.xlsx', read_only=True, data_only=True)
    sheet = wb['Monsters']

    current_cat = None
    current_classification = None

    records = []
    skipped_htfg = 0

    for idx, row in enumerate(sheet.iter_rows(values_only=True)):
        val0 = str(row[0]).strip() if row[0] is not None else ''
        check_id = row[15] if len(row) > 15 else None
        
        if val0 in ['Fair Game', 'Full DM Only']:
            current_cat = val0
        if val0 in ['Core', 'Supplemental', 'Adventures', 'Non-FR']:
            current_classification = val0
            
        if check_id and str(check_id).strip().startswith('MON_'):
            check_id_clean = str(check_id).strip()
            src_raw = str(row[2]).strip() if row[2] else ''
            
            # Skip Hawthorne Field Guide monsters
            if src_raw == 'Hawthorne Field Guide':
                skipped_htfg += 1
                continue
                
            src_lower = src_raw.lower()
            if src_lower not in SOURCE_KEY_MAP:
                raise ValueError(f"Unknown source: '{src_raw}' for check_id {check_id_clean}")
            source_key = SOURCE_KEY_MAP[src_lower]
            
            ruleset = '2024' if source_key in ['MM2024', 'PHB2024'] else '2014'
            
            cat_name = str(row[4]).strip() if row[4] else current_cat
            if cat_name not in ['Fair Game', 'Full DM Only']:
                cat_name = current_cat or 'Fair Game'
                
            cat_id = CAT_FAIR_GAME_ID if cat_name == 'Fair Game' else CAT_FULL_DM_ONLY_ID
            
            # Deterministic UUIDv5 based on check_id
            rec_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"ac_monsters:{check_id_clean}"))
            
            cr_val = clean_cr(row[5])
            creature_type_val = str(row[6]).strip() if row[6] else None
            notes_val = str(row[8]).strip() if row[8] else None
            
            records.append({
                'id': rec_id,
                'check_id': check_id_clean,
                'name': str(row[0]).strip(),
                'ruleset': ruleset,
                'category_id': cat_id,
                'category': cat_name,
                'classification': current_classification,
                'cr': cr_val,
                'creature_type': creature_type_val,
                'source': [source_key],
                'notes_advice': notes_val,
                'display_order': float(len(records) + 1) * 10.0
            })

    print(f"Extraction complete: {len(records)} records extracted, {skipped_htfg} HTFG records skipped.")
    assert len(records) == 3195, f"Expected 3195 records, got {len(records)}"
    assert skipped_htfg == 67, f"Expected 67 skipped HTFG records, got {skipped_htfg}"

    # -------------------------------------------------------------
    # 2. Write Normalized AC_Monsters.xlsx
    # -------------------------------------------------------------
    print("Writing normalized AC_Monsters.xlsx...")
    out_wb = openpyxl.Workbook()
    
    # Sheet 1: Schema
    ws_schema = out_wb.active
    ws_schema.title = 'Schema'
    ws_schema.append(['Field', 'PK?', 'FK?', 'Type', 'Notes'])
    ws_schema.append(['id', 'Y', None, 'UUID', 'Primary Key, gen_random_uuid() / UUIDv5'])
    ws_schema.append(['check_id', None, None, 'Text', 'Unique Audit Check ID (MON_0001 .. MON_3262)'])
    ws_schema.append(['name', None, None, 'Text', 'Creature / Monster Name'])
    ws_schema.append(['ruleset', None, None, 'Text', 'Ruleset version: 2014 or 2024'])
    ws_schema.append(['category_id', None, 'Y', 'UUID', 'Foreign Key referencing ac_monsters_categories.id'])
    ws_schema.append(['category', None, None, 'Text', 'Category: Fair Game or Full DM Only'])
    ws_schema.append(['classification', None, None, 'Text', 'Section Classification: Core, Supplemental, Adventures, Non-FR'])
    ws_schema.append(['cr', None, None, 'Text', 'Challenge Rating (0, 1/8, 1/4, 1/2, 1 .. 30, lair notes)'])
    ws_schema.append(['creature_type', None, None, 'Text', 'Creature Type / Subtype (e.g. Dragon, Aberration)'])
    ws_schema.append(['source', None, 'Y', 'Text[]', 'Canonical source key referencing ac_sources.source_key'])
    ws_schema.append(['notes_advice', None, None, 'Text', 'Notes / Rage Advice and guidelines'])
    ws_schema.append(['display_order', None, None, 'Float', 'Double precision fractional display order'])

    # Sheet 2: Data
    ws_data = out_wb.create_sheet('Data')
    ws_data.append(['id', 'check_id', 'name', 'ruleset', 'category_id', 'category', 'classification', 'cr', 'creature_type', 'source', 'notes_advice', 'display_order'])
    for r in records:
        ws_data.append([
            r['id'],
            r['check_id'],
            r['name'],
            r['ruleset'],
            r['category_id'],
            r['category'],
            r['classification'],
            r['cr'],
            r['creature_type'],
            r['source'][0],
            r['notes_advice'],
            r['display_order']
        ])

    xlsx_path = '.context/current-tasks/AC_Monsters.xlsx'
    out_wb.save(xlsx_path)
    print(f"Saved normalized Excel workbook to {xlsx_path}")

    # -------------------------------------------------------------
    # 3. Generate 20261011_ac_monsters_normalization.sql
    # -------------------------------------------------------------
    print("Generating SQL migration file...")
    sql_path = 'supabase/migrations/20261011_ac_monsters_normalization.sql'

    sql_parts = []
    sql_parts.append("""-- ==============================================================================
-- MIGRATION: 20261011_ac_monsters_normalization.sql
-- Description: Normalize public.ac_monsters schema, categories, and dataset.
--              - Total Records: 3,195 official monsters (1:1 with Allowed_Content_20261004.xlsx)
--              - Excludes 67 Hawthorne Field Guide (HTFG) monsters (routed to Compendium)
--              - Check IDs: MON_0001 through MON_3262 (unique audit constraint)
--              - Deterministic UUID primary keys
--              - Category Foreign Key (UUID -> public.ac_monsters_categories.id)
--              - Normalized categories: 'Fair Game' and 'Full DM Only'
--              - Section Classifications: 'Core', 'Supplemental', 'Adventures', 'Non-FR'
--              - Ruleset tagging ('2014' vs '2024')
--              - Source as TEXT[] referencing canonical ac_sources keys
--              - display_order as DOUBLE PRECISION (fractional indexing)
--              - GIN index on source array
--              - Lookups integration with banner description for Monster Compendium
--              - Full RLS policies for Public Read, Service Role, and Staff Admin/Engineer
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Safely Archive Legacy Tables if not already backed up
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ac_monsters')
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ac_monsters_legacy_backup') THEN
        CREATE TABLE public.ac_monsters_legacy_backup AS SELECT * FROM public.ac_monsters;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ac_monsters_categories')
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ac_monsters_categories_legacy_backup') THEN
        CREATE TABLE public.ac_monsters_categories_legacy_backup AS SELECT * FROM public.ac_monsters_categories;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. Schema Evolution for public.ac_monsters_categories
-- ------------------------------------------------------------------------------
ALTER TABLE public.ac_monsters_categories 
    ALTER COLUMN display_order TYPE DOUBLE PRECISION USING display_order::double precision;

-- ------------------------------------------------------------------------------
-- 3. Schema Evolution for public.ac_monsters
-- ------------------------------------------------------------------------------
-- Drop legacy unique constraint referencing (category_id, name, source)
ALTER TABLE public.ac_monsters DROP CONSTRAINT IF EXISTS ac_monsters_category_name_source_key;
ALTER TABLE public.ac_monsters DROP CONSTRAINT IF EXISTS ac_monsters_category_id_name_key;

-- Add missing columns if needed
ALTER TABLE public.ac_monsters ADD COLUMN IF NOT EXISTS check_id VARCHAR(32);
ALTER TABLE public.ac_monsters ADD COLUMN IF NOT EXISTS ruleset VARCHAR(10) NOT NULL DEFAULT '2024';
ALTER TABLE public.ac_monsters ADD COLUMN IF NOT EXISTS category TEXT;

-- Convert display_order to DOUBLE PRECISION
ALTER TABLE public.ac_monsters 
    ALTER COLUMN display_order TYPE DOUBLE PRECISION USING display_order::double precision;
ALTER TABLE public.ac_monsters 
    ALTER COLUMN display_order SET DEFAULT 10.0;

-- Convert source to TEXT[]
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'ac_monsters' AND column_name = 'source' AND data_type = 'text'
    ) THEN
        ALTER TABLE public.ac_monsters ALTER COLUMN source TYPE TEXT[] USING string_to_array(source, ', ');
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 4. Clear Legacy Data and Seed Normalized Monster Categories
-- ------------------------------------------------------------------------------
-- Clear out legacy records first (safely preserved in ac_monsters_legacy_backup)
DELETE FROM public.ac_monsters;

-- Temporarily drop FK to cleanly reset category rows
ALTER TABLE public.ac_monsters DROP CONSTRAINT IF EXISTS ac_monsters_category_id_fkey;

-- Clear legacy category bloat and insert clean canonical categories
DELETE FROM public.ac_monsters_categories;

INSERT INTO public.ac_monsters_categories (id, name, notes, display_order)
VALUES 
    (
        'c1ce104d-076e-4eaa-b464-06467a67ddcd'::uuid,
        'Fair Game',
        'Fair Game Monsters can be used by any DM in adventures they run. Except with a DM''s permission during an adventure, only monsters in Fair Game as printed can be used by PCs for purposes of spells and game features that let them summon or shape-shift into a creature.',
        10.0
    ),
    (
        'a4a35cf9-768c-5722-a9b0-92ee7e02b78a'::uuid,
        'Full DM Only',
        'DMs should take care to review the statblock, lore, and Notes / Rage Advice for any monster they plan to include in a game.',
        20.0
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    notes = EXCLUDED.notes,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

-- Re-establish Foreign Key
ALTER TABLE public.ac_monsters 
    ADD CONSTRAINT ac_monsters_category_id_fkey 
    FOREIGN KEY (category_id) REFERENCES public.ac_monsters_categories(id) ON DELETE CASCADE;

-- ------------------------------------------------------------------------------
-- 5. Update Lookups Metadata for Monsters Tab
-- ------------------------------------------------------------------------------
INSERT INTO public.lookups (type, data)
VALUES (
    'monsters',
    jsonb_build_object(
        'description', 'Official Monsters listed here. For Hawthorne Homebrew Monsters, please [Go to the Monster Compendium in the Field Guide](/Guides/monsters/).',
        'categories', jsonb_build_array(
            jsonb_build_object('name', 'Fair Game', 'display_order', 1, 'notes', 'Fair Game Monsters can be used by any DM in adventures they run.'),
            jsonb_build_object('name', 'Full DM Only', 'display_order', 2, 'notes', 'DMs should take care to review statblock and notes before including.')
        ),
        'classifications', jsonb_build_array(
            jsonb_build_object('name', 'Core', 'display_order', 1),
            jsonb_build_object('name', 'Supplemental', 'display_order', 2),
            jsonb_build_object('name', 'Adventures', 'display_order', 3),
            jsonb_build_object('name', 'Non-FR', 'display_order', 4)
        ),
        'rulesets', jsonb_build_array(
            jsonb_build_object('label', '2024', 'value', '2024'),
            jsonb_build_object('label', '2014', 'value', '2014')
        )
    )
)
ON CONFLICT (type) DO UPDATE SET
    data = EXCLUDED.data;

-- ------------------------------------------------------------------------------
-- 6. Reload Normalized Monsters Dataset (3,195 Records)
-- ------------------------------------------------------------------------------
""")

    # Batch inserts into groups of 250 rows for optimal Postgres parsing
    batch_size = 250
    for b_start in range(0, len(records), batch_size):
        batch = records[b_start:b_start + batch_size]
        vals_sql = []
        for r in batch:
            src_array_str = "ARRAY[" + ", ".join([f"'{s}'" for s in r['source']]) + "]::text[]"
            vals_sql.append(f"""    (
        '{r['id']}'::uuid,
        {sql_str(r['check_id'])},
        {sql_str(r['name'])},
        {sql_str(r['ruleset'])},
        '{r['category_id']}'::uuid,
        {sql_str(r['category'])},
        {sql_str(r['classification'])},
        {sql_str(r['cr'])},
        {sql_str(r['creature_type'])},
        {src_array_str},
        {sql_str(r['notes_advice'])},
        {r['display_order']}::double precision
    )""")
        
        joined_vals = ",\n".join(vals_sql)
        sql_parts.append(f"""INSERT INTO public.ac_monsters (
    id, check_id, name, ruleset, category_id, category, classification, cr, creature_type, source, notes_advice, display_order
) VALUES
{joined_vals};
""")

    # Constraints, Indexes, and RLS
    sql_parts.append("""-- ------------------------------------------------------------------------------
-- 7. Constraints and Indexes
-- ------------------------------------------------------------------------------
-- Add unique constraint on check_id
ALTER TABLE public.ac_monsters DROP CONSTRAINT IF EXISTS ac_monsters_check_id_key;
ALTER TABLE public.ac_monsters ADD CONSTRAINT ac_monsters_check_id_key UNIQUE (check_id);

-- Enforce NOT NULL on check_id and ruleset
ALTER TABLE public.ac_monsters ALTER COLUMN check_id SET NOT NULL;
ALTER TABLE public.ac_monsters ALTER COLUMN ruleset SET NOT NULL;
ALTER TABLE public.ac_monsters ALTER COLUMN category SET NOT NULL;
ALTER TABLE public.ac_monsters ALTER COLUMN classification SET NOT NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ac_monsters_check_id ON public.ac_monsters (check_id);
CREATE INDEX IF NOT EXISTS idx_ac_monsters_category_id ON public.ac_monsters (category_id);
CREATE INDEX IF NOT EXISTS idx_ac_monsters_category ON public.ac_monsters (category);
CREATE INDEX IF NOT EXISTS idx_ac_monsters_classification ON public.ac_monsters (classification);
CREATE INDEX IF NOT EXISTS idx_ac_monsters_ruleset ON public.ac_monsters (ruleset);
CREATE INDEX IF NOT EXISTS idx_ac_monsters_name ON public.ac_monsters (name);
CREATE INDEX IF NOT EXISTS idx_ac_monsters_cr ON public.ac_monsters (cr);
CREATE INDEX IF NOT EXISTS idx_ac_monsters_source ON public.ac_monsters USING GIN (source);

-- ------------------------------------------------------------------------------
-- 8. Row Level Security Policies (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.ac_monsters_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ac_monsters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to ac_monsters_categories" ON public.ac_monsters_categories;
DROP POLICY IF EXISTS "Allow service_role to manage ac_monsters_categories" ON public.ac_monsters_categories;
DROP POLICY IF EXISTS "Admins and Engineers can manage ac_monsters_categories" ON public.ac_monsters_categories;

CREATE POLICY "Allow public read access to ac_monsters_categories"
ON public.ac_monsters_categories FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow service_role to manage ac_monsters_categories"
ON public.ac_monsters_categories FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins and Engineers can manage ac_monsters_categories"
ON public.ac_monsters_categories FOR ALL
TO authenticated
USING (
  ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
  OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
)
WITH CHECK (
  ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
  OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
);

DROP POLICY IF EXISTS "Allow public read access to ac_monsters" ON public.ac_monsters;
DROP POLICY IF EXISTS "Allow service_role to manage ac_monsters" ON public.ac_monsters;
DROP POLICY IF EXISTS "Admins and Engineers can manage ac_monsters" ON public.ac_monsters;

CREATE POLICY "Allow public read access to ac_monsters"
ON public.ac_monsters FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow service_role to manage ac_monsters"
ON public.ac_monsters FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins and Engineers can manage ac_monsters"
ON public.ac_monsters FOR ALL
TO authenticated
USING (
  ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
  OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
)
WITH CHECK (
  ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
  OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
);
""")

    with open(sql_path, 'w', encoding='utf-8') as f:
        f.write("\n".join(sql_parts))

    print(f"Generated SQL file: {sql_path} ({os.path.getsize(sql_path)} bytes)")

if __name__ == '__main__':
    main()
