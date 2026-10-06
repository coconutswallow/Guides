-- ==============================================================================
-- Migration: Normalize ac_classes and ac_subclasses with Inheritance View
-- Date: 2026-10-05
-- Description:
-- 1. Safely archives legacy flat `ac_classes` to `ac_classes_legacy_backup`.
-- 2. Creates normalized `public.ac_classes` (base parent class table).
-- 3. Creates normalized `public.ac_subclasses` (subclass child table with FK).
-- 4. Enables Row Level Security (RLS) and sets public read / service_role write policies.
-- 5. Creates `public.v_ac_classes` view WITH (security_invoker = true) to resolve
--    inheritance (hit_die, multiclassing, TCE expanded options, combined notes/advice).
-- ==============================================================================

-- 1. Safely archive legacy flat table if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'ac_classes' AND column_name = 'subclass'
    ) THEN
        DROP TABLE IF EXISTS public.ac_classes_legacy_backup CASCADE;
        ALTER TABLE public.ac_classes RENAME TO ac_classes_legacy_backup;
    END IF;
END $$;

-- 2. Create Base Classes Table
CREATE TABLE IF NOT EXISTS public.ac_classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    ruleset TEXT NOT NULL,           -- '2014' or '2024' (Green data)
    category TEXT NOT NULL DEFAULT 'Official', -- 'Official' or 'Hawthorne Homebrew' (Yellow data)
    source TEXT NOT NULL,            -- string lookup to ac_sources.source_key
    hit_die TEXT,                    -- 'd6', 'd8', 'd10', 'd12'
    multiclassing TEXT,
    expanded_options TEXT,           -- TCE optional features
    notes_advice TEXT,               -- base class level rulings & advice
    display_order DOUBLE PRECISION DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    CONSTRAINT ac_classes_name_ruleset_key UNIQUE (name, ruleset)
);

-- 3. Create Subclasses Child Table
CREATE TABLE IF NOT EXISTS public.ac_subclasses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID NOT NULL REFERENCES public.ac_classes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    ruleset TEXT NOT NULL,           -- '2014' or '2024' (Green data)
    category TEXT NOT NULL DEFAULT 'Official', -- 'Official' or 'Hawthorne Homebrew' (Yellow data)
    source TEXT NOT NULL,            -- string lookup to ac_sources.source_key
    link TEXT,                       -- external document/PDF link
    notes_advice TEXT,               -- subclass-specific rulings & advice
    engineering_notes TEXT,
    display_order DOUBLE PRECISION DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Multi-source printings allowed (e.g. Battlerager SCAG vs Battlerager HTA)
    CONSTRAINT ac_subclasses_class_name_source_key UNIQUE (class_id, name, source)
);

-- 4. Triggers for updated_at timestamps
DROP TRIGGER IF EXISTS set_updated_at ON public.ac_classes;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.ac_classes
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.ac_subclasses;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.ac_subclasses
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 5. Enable Row Level Security (RLS) & Policies
ALTER TABLE public.ac_classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to ac_classes" ON public.ac_classes;
CREATE POLICY "Allow public read access to ac_classes" 
    ON public.ac_classes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow service_role to manage ac_classes" ON public.ac_classes;
CREATE POLICY "Allow service_role to manage ac_classes" 
    ON public.ac_classes FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.ac_subclasses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to ac_subclasses" ON public.ac_subclasses;
CREATE POLICY "Allow public read access to ac_subclasses" 
    ON public.ac_subclasses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow service_role to manage ac_subclasses" ON public.ac_subclasses;
CREATE POLICY "Allow service_role to manage ac_subclasses" 
    ON public.ac_subclasses FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6. Ensure Hawthorne Arcana source points to website section
UPDATE public.ac_sources
SET link = '/Guides/arcana/'
WHERE source_key = 'HTA';

-- 7. Inheritance Resolution View
DROP VIEW IF EXISTS public.v_ac_classes CASCADE;

CREATE OR REPLACE VIEW public.v_ac_classes
WITH (security_invoker = true) AS
SELECT 
    s.id AS id,
    s.id AS subclass_id,
    c.id AS class_id,
    c.name AS class_name,
    s.name AS subclass_name,
    c.ruleset,
    s.category,
    s.source AS subclass_source,
    c.source AS class_source,
    c.hit_die,
    c.multiclassing,
    -- Expanded Class Options (TCE) applies only to the class
    c.expanded_options AS class_expanded_options,
    c.expanded_options,
    -- Rage Advice: explicit separation of class vs subclass advice
    c.notes_advice AS class_notes_advice,
    s.notes_advice AS subclass_notes_advice,
    s.link,
    -- Combined notes for backwards compatibility
    NULLIF(TRIM(
        CASE 
            WHEN c.notes_advice IS NOT NULL AND s.notes_advice IS NOT NULL 
                THEN c.notes_advice || E'\n\n' || s.notes_advice
            ELSE COALESCE(s.notes_advice, c.notes_advice, '')
        END
    ), '') AS notes_advice,
    s.engineering_notes,
    c.display_order AS class_display_order,
    s.display_order AS subclass_display_order
FROM public.ac_classes c
JOIN public.ac_subclasses s ON s.class_id = c.id
ORDER BY c.display_order ASC, s.display_order ASC;
