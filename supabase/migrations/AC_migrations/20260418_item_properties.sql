-- ==============================================================================
-- 1. Create the Item Properties Categories Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ac_item_properties_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    notes TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 2. Create the Item Properties Table (With Foreign Key)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ac_item_properties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES public.ac_item_properties_categories(id),
    name TEXT NOT NULL,
    source TEXT NOT NULL,
    type TEXT,
    category_sub TEXT,
    description TEXT,
    notes_advice TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Composite unique constraint (category_id + name + source) 
    CONSTRAINT ac_item_properties_category_name_source_key UNIQUE (category_id, name, source)
);

-- ==============================================================================
-- 3. Triggers for updated_at timestamps
-- ==============================================================================
DROP TRIGGER IF EXISTS set_updated_at ON public.ac_item_properties_categories;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.ac_item_properties_categories
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.ac_item_properties;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.ac_item_properties
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 4. Enable Row Level Security (RLS) & Policies
-- ==============================================================================
ALTER TABLE public.ac_item_properties_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to ac_item_properties_categories" ON public.ac_item_properties_categories FOR SELECT USING (true);
CREATE POLICY "Allow service_role to manage ac_item_properties_categories" ON public.ac_item_properties_categories FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.ac_item_properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to ac_item_properties" ON public.ac_item_properties FOR SELECT USING (true);
CREATE POLICY "Allow service_role to manage ac_item_properties" ON public.ac_item_properties FOR ALL TO service_role USING (true) WITH CHECK (true);