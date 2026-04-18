-- ==============================================================================
-- 1. Create the Loot Categories Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ac_loot_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    notes TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 2. Create the Loot Table (With Foreign Key)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ac_loot (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES public.ac_loot_categories(id),
    name TEXT NOT NULL,
    source TEXT NOT NULL,
    type TEXT,
    tier TEXT,
    description TEXT,
    notes_advice TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Composite unique constraint (name + source) to handle identically named items 
    -- from different sources (like 2014 vs 2024 versions)
    CONSTRAINT ac_loot_name_source_key UNIQUE (name, source)
);

-- ==============================================================================
-- 3. Triggers for updated_at timestamps
-- ==============================================================================
DROP TRIGGER IF EXISTS set_updated_at ON public.ac_loot_categories;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.ac_loot_categories
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.ac_loot;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.ac_loot
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 4. Enable Row Level Security (RLS) & Policies
-- ==============================================================================
ALTER TABLE public.ac_loot_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to ac_loot_categories" ON public.ac_loot_categories FOR SELECT USING (true);
CREATE POLICY "Allow service_role to manage ac_loot_categories" ON public.ac_loot_categories FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.ac_loot ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to ac_loot" ON public.ac_loot FOR SELECT USING (true);
CREATE POLICY "Allow service_role to manage ac_loot" ON public.ac_loot FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Add display_order to Loot Categories
ALTER TABLE public.ac_loot_categories 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Add display_order to Loot Items
ALTER TABLE public.ac_loot 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;