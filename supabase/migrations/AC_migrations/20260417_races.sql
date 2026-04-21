-- ==============================================================================
-- 1. Create the Races Categories Table (e.g., "Official WotC Races", "Homebrew")
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ac_races_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    notes TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 2. Create the Races Table (With Foreign Key)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ac_races (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES public.ac_races_categories(id),
    race TEXT NOT NULL,
    subrace TEXT,
    size TEXT,
    speed TEXT,
    languages TEXT,
    str TEXT,
    dex TEXT,
    con TEXT,
    int_stat TEXT, -- 'int' is a reserved SQL keyword, using int_stat
    wis TEXT,
    cha TEXT,
    extra_traits TEXT,
    source TEXT NOT NULL,
    notes_advice TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Composite unique constraint to handle subraces/variants safely
    CONSTRAINT ac_races_category_race_subrace_source_key UNIQUE (category_id, race, subrace, source)
);

-- ==============================================================================
-- 3. Triggers for updated_at timestamps
-- ==============================================================================
DROP TRIGGER IF EXISTS set_updated_at ON public.ac_races_categories;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.ac_races_categories
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.ac_races;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.ac_races
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 4. Enable Row Level Security (RLS) & Policies
-- ==============================================================================
ALTER TABLE public.ac_races_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to ac_races_categories" ON public.ac_races_categories FOR SELECT USING (true);
CREATE POLICY "Allow service_role to manage ac_races_categories" ON public.ac_races_categories FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.ac_races ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to ac_races" ON public.ac_races FOR SELECT USING (true);
CREATE POLICY "Allow service_role to manage ac_races" ON public.ac_races FOR ALL TO service_role USING (true) WITH CHECK (true);