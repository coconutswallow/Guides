-- ==============================================================================
-- 1. Create the Three Tables
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ac_fighting_styles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    classes TEXT,
    source TEXT NOT NULL,
    notes_advice TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT ac_fighting_styles_name_source_key UNIQUE (name, source)
);

CREATE TABLE IF NOT EXISTS public.ac_artificer_infusions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    item_prereq TEXT,
    requires_attunement TEXT,
    level_prereq TEXT,
    source TEXT NOT NULL,
    notes_advice TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT ac_artificer_infusions_name_source_key UNIQUE (name, source)
);

CREATE TABLE IF NOT EXISTS public.ac_eldritch_invocations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    pact_prereq TEXT,
    other_prereq TEXT,
    level_prereq TEXT,
    source TEXT NOT NULL,
    notes_advice TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT ac_eldritch_invocations_name_source_key UNIQUE (name, source)
);

-- ==============================================================================
-- 2. Triggers for updated_at timestamps
-- ==============================================================================
DROP TRIGGER IF EXISTS set_updated_at ON public.ac_fighting_styles;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.ac_fighting_styles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.ac_artificer_infusions;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.ac_artificer_infusions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.ac_eldritch_invocations;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.ac_eldritch_invocations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 3. Enable Row Level Security (RLS) & Policies
-- ==============================================================================
ALTER TABLE public.ac_fighting_styles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to ac_fighting_styles" ON public.ac_fighting_styles FOR SELECT USING (true);
CREATE POLICY "Allow service_role to manage ac_fighting_styles" ON public.ac_fighting_styles FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.ac_artificer_infusions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to ac_artificer_infusions" ON public.ac_artificer_infusions FOR SELECT USING (true);
CREATE POLICY "Allow service_role to manage ac_artificer_infusions" ON public.ac_artificer_infusions FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.ac_eldritch_invocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to ac_eldritch_invocations" ON public.ac_eldritch_invocations FOR SELECT USING (true);
CREATE POLICY "Allow service_role to manage ac_eldritch_invocations" ON public.ac_eldritch_invocations FOR ALL TO service_role USING (true) WITH CHECK (true);