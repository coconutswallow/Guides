-- ==============================================================================
-- 1. Create the Equipment Categories Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ac_equipment_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    notes TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 2. Create the Equipment Table (With Foreign Key)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ac_equipment (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES public.ac_equipment_categories(id),
    name TEXT NOT NULL,
    source TEXT NOT NULL,
    cost_gp TEXT,
    weight_lbs TEXT,
    craft_cost_gp TEXT,
    craft_cost_dtp TEXT,
    craft_reqs TEXT,
    description TEXT,
    notes_advice TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Composite unique constraint in case of 2014 vs 2024 versions of the same item
    CONSTRAINT ac_equipment_name_source_key UNIQUE (name, source)
);

-- ==============================================================================
-- 3. Triggers for updated_at timestamps
-- ==============================================================================
DROP TRIGGER IF EXISTS set_updated_at ON public.ac_equipment_categories;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.ac_equipment_categories
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.ac_equipment;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.ac_equipment
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 4. Enable Row Level Security (RLS) & Policies
-- ==============================================================================
ALTER TABLE public.ac_equipment_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to ac_equipment_categories" ON public.ac_equipment_categories FOR SELECT USING (true);
CREATE POLICY "Allow service_role to manage ac_equipment_categories" ON public.ac_equipment_categories FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.ac_equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to ac_equipment" ON public.ac_equipment FOR SELECT USING (true);
CREATE POLICY "Allow service_role to manage ac_equipment" ON public.ac_equipment FOR ALL TO service_role USING (true) WITH CHECK (true);