-- ==============================================================================
-- 1. Create the Downtime Categories Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ac_downtime_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    notes TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 2. Create the Downtime Activities Table (With Foreign Key)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ac_downtime (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES public.ac_downtime_categories(id),
    name TEXT NOT NULL UNIQUE,
    gold_cost TEXT,
    dtp_cost TEXT,
    description TEXT,
    notes_advice TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 3. Triggers for updated_at timestamps
-- ==============================================================================
DROP TRIGGER IF EXISTS set_updated_at ON public.ac_downtime_categories;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.ac_downtime_categories
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.ac_downtime;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.ac_downtime
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 4. Enable Row Level Security (RLS) & Policies
-- ==============================================================================
ALTER TABLE public.ac_downtime_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to ac_downtime_categories" ON public.ac_downtime_categories FOR SELECT USING (true);
CREATE POLICY "Allow service_role to manage ac_downtime_categories" ON public.ac_downtime_categories FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.ac_downtime ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to ac_downtime" ON public.ac_downtime FOR SELECT USING (true);
CREATE POLICY "Allow service_role to manage ac_downtime" ON public.ac_downtime FOR ALL TO service_role USING (true) WITH CHECK (true);