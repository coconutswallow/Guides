import json

def sql_escape(val):
    if val is None:
        return 'NULL'
    s = str(val).replace("'", "''")
    return f"'{s}'"

with open('/tmp/normalized_downtime.json') as f:
    activities = json.load(f)

# Categories
categories = [
    {
        'id': 'cd57e12c-2d6b-472d-ba30-74dd5612c4d6',
        'name': 'Bastions',
        'notes': 'You must be level 5+ to build and benefit from a Bastion. You can only build and benefit from one Bastion as part of downtime (see Appendix B of the [Player Guidelines](https://hawthorneguild.github.io/Guides/playersguide/appendices/bastions/) for details)\n\nYou can only construct a Bastion either a) near Hawthorne or a guild outpost or b) at another world location if you are able to claim a parcel of land or stronghold as part of an adventure as determined by the DM.',
        'display_order': 1.0
    },
    {
        'id': 'c584deb3-05b0-46fe-a407-0bbe2825f6de',
        'name': 'Building a Stronghold',
        'notes': 'As described in the Dungeon Master\'s Guide, Strongholds (also known as "Fortifications") are structures that can be built or acquired by characters. Unlike Bastions, strongholds provide no inherent mechanical benefit.\n\nSimilar to Bastions, you can only construct a Stronghold either a) near Hawthorne or a guild outpost or b) at another world location if you are able to claim a parcel of land or stronghold as part of an adventure as determined by the DM.\n\nA Stronghold is assumed to be able to cover its own maintenance costs each month and does not require a character to pay for it.\n\nAny number of PCs of other players can mutually contribute gold and DTP to build a Stronghold but only one PC can be logged as the owner of it.\n\nA Stronghold can be used to build a Bastion as described in [Appendix B](https://hawthorneguild.github.io/Guides/playersguide/appendices/bastions/) of the Player Guidelines.',
        'display_order': 2.0
    },
    {
        'id': 'b4459d2f-ecbd-4f09-bbc3-5b6a33dea143',
        'name': 'Buying & Selling',
        'notes': 'Individual items worth up to 15,000 GP can be purchased in Hawthorne. More expensive items must be purchased in Waterdeep or other major cities.',
        'display_order': 3.0
    },
    {
        'id': 'd877d27a-29d9-4177-a97c-678fe9d972ae',
        'name': 'Crafting',
        'notes': 'Except where otherwise stated, crafting equipment requires proficiency in a corresponding tool, costs DTP equal to the item cost / 25, and costs gold equal to half the item cost.',
        'display_order': 4.0
    },
    {
        'id': '00f09436-9aaf-4875-bc43-ebf3af6c7bb6',
        'name': 'Research',
        'notes': 'Research can only be conducted with respect to an adventure as overseen by a DM',
        'display_order': 5.0
    },
    {
        'id': '3574d95e-3ac0-480d-88bc-038fa54cd3e9',
        'name': 'Reworking',
        'notes': 'All reworks must be logged in #character-rework-log for approval by an Auditor\n\nYou must log all reworks in your Master Adventurer Log (MAL) in the session section\n\nYou can fully refund any rework prior to your first game played or DMPCed with that character. Log the refund in #character-rework-log for approval by an Auditor\n\nYou can partially refund (50% GP and DTP recouped) any rework before your 3rd game played or DMPCed with that character. Log the refund in #character-rework-log for approval by an Auditor',
        'display_order': 6.0
    },
    {
        'id': 'ecd4d90a-cdd3-4223-8afc-0d889f410f09',
        'name': 'Spellcasting',
        'notes': 'Hawthorne has a community spellbook to copy spells from and into located at Hawthorne University (See #hawthorne-universtity )',
        'display_order': 7.0
    },
    {
        'id': 'de038550-5b90-4c56-97c1-fa9175135332',
        'name': 'Spellcasting Services',
        'notes': 'These spellcasting services by NPCs can only be used in Hawthorne or in other villages (level 0 - 2 spells) or other towns or cities (level 0 - 5 spells)',
        'display_order': 8.0
    },
    {
        'id': 'd8d3c2ad-0c10-4760-a696-5cd78b60f89b',
        'name': 'Trading',
        'notes': 'Only PCs in the same location can trade with each other and any items you obtain via trading with another PC must be of your PC\'s tier or lower\n\nYou can\'t trade gold or equipment that can be sold for gold between your PCs, even by proxy or cross character trade\n\nItems and equpment created by class features can\'t be traded or sold. Supernatural Rewards also cannot be traded or sold.',
        'display_order': 9.0
    },
    {
        'id': 'bf982e7d-7dd2-408e-b5e0-223f7aaf138e',
        'name': 'Training',
        'notes': 'Besides learning by yourself, another player\'s PC that knows a language or has a tool proficiency can teach your PC that language or tool proficiency. You expend the listed DTP cost but no gold and the teacher PC expends half the listed DTP.\n\nBoth your PC and the teacher PC must be in the same location, and the teacher must be another player\'s PC; the teacher cannot be one of your own PCs.\n\nThe teacher can choose at their discretion to charge you gold for teaching, using the rules for trading gold.',
        'display_order': 10.0
    },
    {
        'id': '46a73f33-8302-4739-a18b-47963154b8fe',
        'name': 'Traveling',
        'notes': 'Traveling costs 1 DTP and 1 GP per day of travel and uses the travel rules in the PHB (2014 p.181, 2024 p. 20) and DMG (2014 p. 242), with a maximum of 8 hours traveled per day.\n\nTravel distances to major cities are in the [Player Guidelines](https://hawthorneguild.github.io/Guides/playersguide/downtime/#traveling). Refer to the [map in ](https://www.aidedd.org/atlas/faerun)[Forgotten Realms: Heroes of Faerûn](https://www.aidedd.org/atlas/faerun) to help determine distances and plan travel as necessary.',
        'display_order': 11.0
    },
    {
        'id': 'e23d5a97-6350-4cbb-9713-3bd234e967b5',
        'name': 'Work',
        'notes': 'The roll and the amount of gold gained must be logged in #downtime-log',
        'display_order': 12.0
    },
    {
        'id': 'a74477c9-038f-4368-b515-f6c997e45349',
        'name': 'Miscellaneous',
        'notes': None,
        'display_order': 13.0
    }
]

lines = []
lines.append("-- ==============================================================================")
lines.append("-- MIGRATION: 20261006_ac_downtime_normalization.sql")
lines.append("-- Description: Normalize public.ac_downtime_type and public.ac_downtime schemas.")
lines.append("--              Includes check_id (DT_0001..DT_0130), downtime_type_id foreign key,")
lines.append("--              activity mirror column, fractional display_order (DOUBLE PRECISION),")
lines.append("--              compatibility view public.ac_downtime_categories,")
lines.append("--              handle_updated_at triggers, and Staff Admin & Engineer RLS policies.")
lines.append("-- ==============================================================================")
lines.append("")
lines.append("-- ------------------------------------------------------------------------------")
lines.append("-- 1. Schema Setup for public.ac_downtime_type")
lines.append("-- ------------------------------------------------------------------------------")
lines.append("-- Temporarily drop view if it already exists from a previous migration run")
lines.append("DROP VIEW IF EXISTS public.ac_downtime_categories CASCADE;")
lines.append("DROP TABLE IF EXISTS public.ac_downtime_categories CASCADE;")
lines.append("")
lines.append("CREATE TABLE IF NOT EXISTS public.ac_downtime_type (")
lines.append("    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),")
lines.append("    name TEXT NOT NULL UNIQUE,")
lines.append("    description TEXT,")
lines.append("    notes TEXT,")
lines.append("    display_order DOUBLE PRECISION NOT NULL DEFAULT 0.0,")
lines.append("    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),")
lines.append("    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())")
lines.append(");")
lines.append("")
lines.append("ALTER TABLE public.ac_downtime_type ALTER COLUMN display_order TYPE DOUBLE PRECISION USING display_order::double precision;")
lines.append("")
lines.append("-- ------------------------------------------------------------------------------")
lines.append("-- 2. Upsert All 13 Downtime Types")
lines.append("-- ------------------------------------------------------------------------------")
for c in categories:
    lines.append("INSERT INTO public.ac_downtime_type (id, name, description, notes, display_order)")
    lines.append("VALUES (")
    lines.append(f"    {sql_escape(c['id'])}::uuid,")
    lines.append(f"    {sql_escape(c['name'])},")
    lines.append(f"    {sql_escape(c['notes'])},")
    lines.append(f"    {sql_escape(c['notes'])},")
    lines.append(f"    {c['display_order']}")
    lines.append(")")
    lines.append("ON CONFLICT (id) DO UPDATE SET")
    lines.append("    name = EXCLUDED.name,")
    lines.append("    description = EXCLUDED.description,")
    lines.append("    notes = EXCLUDED.notes,")
    lines.append("    display_order = EXCLUDED.display_order,")
    lines.append("    updated_at = timezone('utc'::text, now());")
    lines.append("")

lines.append("-- ------------------------------------------------------------------------------")
lines.append("-- 3. Schema Setup & Evolution for public.ac_downtime")
lines.append("-- ------------------------------------------------------------------------------")
lines.append("CREATE TABLE IF NOT EXISTS public.ac_downtime (")
lines.append("    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),")
lines.append("    category_id UUID,")
lines.append("    downtime_type_id UUID REFERENCES public.ac_downtime_type(id) ON DELETE SET NULL,")
lines.append("    check_id VARCHAR(32),")
lines.append("    name TEXT NOT NULL,")
lines.append("    activity TEXT,")
lines.append("    gold_cost TEXT,")
lines.append("    dtp_cost TEXT,")
lines.append("    description TEXT,")
lines.append("    notes_advice TEXT,")
lines.append("    display_order DOUBLE PRECISION NOT NULL DEFAULT 0.0,")
lines.append("    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),")
lines.append("    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())")
lines.append(");")
lines.append("")
lines.append("-- Ensure columns exist")
lines.append("ALTER TABLE public.ac_downtime ADD COLUMN IF NOT EXISTS check_id VARCHAR(32);")
lines.append("ALTER TABLE public.ac_downtime ADD COLUMN IF NOT EXISTS downtime_type_id UUID REFERENCES public.ac_downtime_type(id) ON DELETE SET NULL;")
lines.append("ALTER TABLE public.ac_downtime ADD COLUMN IF NOT EXISTS activity TEXT;")
lines.append("")
lines.append("-- Ensure display_order is DOUBLE PRECISION")
lines.append("ALTER TABLE public.ac_downtime ALTER COLUMN display_order TYPE DOUBLE PRECISION USING display_order::double precision;")
lines.append("ALTER TABLE public.ac_downtime ALTER COLUMN display_order SET DEFAULT 0.0;")
lines.append("")
lines.append("-- Drop legacy foreign key constraints and unique constraints if needed")
lines.append("ALTER TABLE public.ac_downtime DROP CONSTRAINT IF EXISTS ac_downtime_category_id_fkey;")
lines.append("ALTER TABLE public.ac_downtime DROP CONSTRAINT IF EXISTS ac_downtime_name_key;")
lines.append("")
lines.append("-- Re-point category_id to ac_downtime_type(id) for clean backwards compatibility")
lines.append("ALTER TABLE public.ac_downtime ADD CONSTRAINT ac_downtime_category_id_fkey")
lines.append("    FOREIGN KEY (category_id) REFERENCES public.ac_downtime_type(id) ON DELETE SET NULL;")
lines.append("")
lines.append("-- ------------------------------------------------------------------------------")
lines.append("-- 4. Compatibility View for legacy ac_downtime_categories references")
lines.append("-- ------------------------------------------------------------------------------")
lines.append("-- Drop old table if exists and replace with view")
lines.append("DROP TABLE IF EXISTS public.ac_downtime_categories CASCADE;")
lines.append("CREATE OR REPLACE VIEW public.ac_downtime_categories AS")
lines.append("SELECT id, name, notes, description, display_order, created_at, updated_at")
lines.append("FROM public.ac_downtime_type;")
lines.append("")
lines.append("-- ------------------------------------------------------------------------------")
lines.append("-- 5. Upsert All 130 Downtime Activities")
lines.append("-- ------------------------------------------------------------------------------")

for a in activities:
    lines.append("INSERT INTO public.ac_downtime (")
    lines.append("    id, check_id, downtime_type_id, category_id, name, activity, gold_cost,")
    lines.append("    dtp_cost, description, notes_advice, display_order")
    lines.append(") VALUES (")
    lines.append(f"    {sql_escape(a['id'])}::uuid,")
    lines.append(f"    {sql_escape(a['check_id'])},")
    lines.append(f"    {sql_escape(a['downtime_type_id'])}::uuid,")
    lines.append(f"    {sql_escape(a['downtime_type_id'])}::uuid,")
    lines.append(f"    {sql_escape(a['name'])},")
    lines.append(f"    {sql_escape(a['name'])},")
    lines.append(f"    {sql_escape(a['gold_cost'])},")
    lines.append(f"    {sql_escape(a['dtp_cost'])},")
    lines.append(f"    {sql_escape(a['description'])},")
    lines.append(f"    {sql_escape(a['notes_advice'])},")
    lines.append(f"    {a['display_order']}")
    lines.append(")")
    lines.append("ON CONFLICT (id) DO UPDATE SET")
    lines.append("    check_id = EXCLUDED.check_id,")
    lines.append("    downtime_type_id = EXCLUDED.downtime_type_id,")
    lines.append("    category_id = EXCLUDED.category_id,")
    lines.append("    name = EXCLUDED.name,")
    lines.append("    activity = EXCLUDED.activity,")
    lines.append("    gold_cost = EXCLUDED.gold_cost,")
    lines.append("    dtp_cost = EXCLUDED.dtp_cost,")
    lines.append("    description = EXCLUDED.description,")
    lines.append("    notes_advice = EXCLUDED.notes_advice,")
    lines.append("    display_order = EXCLUDED.display_order,")
    lines.append("    updated_at = timezone('utc'::text, now());")
    lines.append("")

lines.append("-- Ensure check_id is NOT NULL and UNIQUE")
lines.append("ALTER TABLE public.ac_downtime ALTER COLUMN check_id SET NOT NULL;")
lines.append("CREATE UNIQUE INDEX IF NOT EXISTS idx_ac_downtime_check_id ON public.ac_downtime(check_id);")
lines.append("")
lines.append("-- ------------------------------------------------------------------------------")
lines.append("-- 6. Performance Indexes")
lines.append("-- ------------------------------------------------------------------------------")
lines.append("CREATE INDEX IF NOT EXISTS idx_ac_downtime_type_id ON public.ac_downtime(downtime_type_id);")
lines.append("CREATE INDEX IF NOT EXISTS idx_ac_downtime_category_id ON public.ac_downtime(category_id);")
lines.append("CREATE INDEX IF NOT EXISTS idx_ac_downtime_display_order ON public.ac_downtime(display_order);")
lines.append("CREATE INDEX IF NOT EXISTS idx_ac_downtime_name ON public.ac_downtime(name);")
lines.append("CREATE INDEX IF NOT EXISTS idx_ac_downtime_type_display_order ON public.ac_downtime_type(display_order);")
lines.append("")
lines.append("-- ------------------------------------------------------------------------------")
lines.append("-- 7. Automated Timestamps Triggers")
lines.append("-- ------------------------------------------------------------------------------")
lines.append("DROP TRIGGER IF EXISTS set_updated_at ON public.ac_downtime_type;")
lines.append("CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.ac_downtime_type")
lines.append("    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();")
lines.append("")
lines.append("DROP TRIGGER IF EXISTS set_updated_at ON public.ac_downtime;")
lines.append("CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.ac_downtime")
lines.append("    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();")
lines.append("")
lines.append("-- ------------------------------------------------------------------------------")
lines.append("-- 8. Row Level Security (RLS) Policies")
lines.append("-- ------------------------------------------------------------------------------")
lines.append("ALTER TABLE public.ac_downtime_type ENABLE ROW LEVEL SECURITY;")
lines.append("")
lines.append("DROP POLICY IF EXISTS \"Allow public read access to ac_downtime_type\" ON public.ac_downtime_type;")
lines.append("CREATE POLICY \"Allow public read access to ac_downtime_type\"")
lines.append("ON public.ac_downtime_type FOR SELECT")
lines.append("TO anon, authenticated")
lines.append("USING (true);")
lines.append("")
lines.append("DROP POLICY IF EXISTS \"Allow service_role to manage ac_downtime_type\" ON public.ac_downtime_type;")
lines.append("CREATE POLICY \"Allow service_role to manage ac_downtime_type\"")
lines.append("ON public.ac_downtime_type FOR ALL")
lines.append("TO service_role")
lines.append("USING (true)")
lines.append("WITH CHECK (true);")
lines.append("")
lines.append("DROP POLICY IF EXISTS \"Admins and Engineers can manage ac_downtime_type\" ON public.ac_downtime_type;")
lines.append("CREATE POLICY \"Admins and Engineers can manage ac_downtime_type\"")
lines.append("ON public.ac_downtime_type FOR ALL")
lines.append("TO authenticated")
lines.append("USING (")
lines.append("  ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '[\"Engineer\"]'::jsonb)")
lines.append("  OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '[\"Admin\"]'::jsonb)")
lines.append(")")
lines.append("WITH CHECK (")
lines.append("  ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '[\"Engineer\"]'::jsonb)")
lines.append("  OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '[\"Admin\"]'::jsonb)")
lines.append(");")
lines.append("")
lines.append("ALTER TABLE public.ac_downtime ENABLE ROW LEVEL SECURITY;")
lines.append("")
lines.append("DROP POLICY IF EXISTS \"Allow public read access to ac_downtime\" ON public.ac_downtime;")
lines.append("CREATE POLICY \"Allow public read access to ac_downtime\"")
lines.append("ON public.ac_downtime FOR SELECT")
lines.append("TO anon, authenticated")
lines.append("USING (true);")
lines.append("")
lines.append("DROP POLICY IF EXISTS \"Allow service_role to manage ac_downtime\" ON public.ac_downtime;")
lines.append("CREATE POLICY \"Allow service_role to manage ac_downtime\"")
lines.append("ON public.ac_downtime FOR ALL")
lines.append("TO service_role")
lines.append("USING (true)")
lines.append("WITH CHECK (true);")
lines.append("")
lines.append("DROP POLICY IF EXISTS \"Admins and Engineers can manage ac_downtime\" ON public.ac_downtime;")
lines.append("CREATE POLICY \"Admins and Engineers can manage ac_downtime\"")
lines.append("ON public.ac_downtime FOR ALL")
lines.append("TO authenticated")
lines.append("USING (")
lines.append("  ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '[\"Engineer\"]'::jsonb)")
lines.append("  OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '[\"Admin\"]'::jsonb)")
lines.append(")")
lines.append("WITH CHECK (")
lines.append("  ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '[\"Engineer\"]'::jsonb)")
lines.append("  OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '[\"Admin\"]'::jsonb)")
lines.append(");")
lines.append("")

sql_content = '\n'.join(lines)
with open('supabase/migrations/20261006_ac_downtime_normalization.sql', 'w') as f:
    f.write(sql_content)

print(f"Generated supabase/migrations/20261006_ac_downtime_normalization.sql ({len(sql_content)} bytes)")
