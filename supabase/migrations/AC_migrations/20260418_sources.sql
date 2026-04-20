-- ==============================================================================
-- 1. Create the Sources Categories Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ac_sources_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    notes TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 2. Create the Sources Table (With Foreign Key)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ac_sources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES public.ac_sources_categories(id),
    name TEXT NOT NULL,
    abbreviation TEXT,
    type TEXT,
    ruleset TEXT,
    allowed_content TEXT,
    notes_advice TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Composite unique constraint (category_id + name) 
    CONSTRAINT ac_sources_category_name_key UNIQUE (category_id, name)
);

-- ==============================================================================
-- 3. Triggers for updated_at timestamps
-- ==============================================================================
DROP TRIGGER IF EXISTS set_updated_at ON public.ac_sources_categories;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.ac_sources_categories
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.ac_sources;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.ac_sources
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 4. Enable Row Level Security (RLS) & Policies
-- ==============================================================================
ALTER TABLE public.ac_sources_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to ac_sources_categories" ON public.ac_sources_categories FOR SELECT USING (true);
CREATE POLICY "Allow service_role to manage ac_sources_categories" ON public.ac_sources_categories FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.ac_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to ac_sources" ON public.ac_sources FOR SELECT USING (true);
CREATE POLICY "Allow service_role to manage ac_sources" ON public.ac_sources FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.ac_sources 
ADD COLUMN IF NOT EXISTS link TEXT;