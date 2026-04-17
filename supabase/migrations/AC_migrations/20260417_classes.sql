-- ==============================================================================
-- 1. Create the Classes Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ac_classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    subclass TEXT NOT NULL, -- NOT NULL required for the composite unique constraint
    hit_die TEXT,
    multiclassing TEXT,
    expanded_options TEXT,
    rage_advice TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Composite unique constraint: Tells Supabase how to detect duplicates
    CONSTRAINT ac_classes_name_subclass_key UNIQUE (name, subclass)
);

-- ==============================================================================
-- 2. Trigger for updated_at timestamps
-- ==============================================================================
DROP TRIGGER IF EXISTS set_updated_at ON public.ac_classes;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.ac_classes
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 3. Enable Row Level Security (RLS) & Policies
-- ==============================================================================
ALTER TABLE public.ac_classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to ac_classes" 
    ON public.ac_classes FOR SELECT USING (true);

CREATE POLICY "Allow service_role to manage ac_classes" 
    ON public.ac_classes
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);