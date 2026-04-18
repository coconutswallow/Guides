-- ==============================================================================
-- 1. Create the Feats Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ac_feats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    source TEXT NOT NULL, -- NOT NULL required for the composite unique constraint
    category TEXT,
    prerequisite TEXT,
    ability_increase TEXT,
    notes_advice TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Composite unique constraint: Tells Supabase how to detect duplicates
    CONSTRAINT ac_feats_name_source_key UNIQUE (name, source)
);

-- ==============================================================================
-- 2. Trigger for updated_at timestamps
-- ==============================================================================
DROP TRIGGER IF EXISTS set_updated_at ON public.ac_feats;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.ac_feats
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 3. Enable Row Level Security (RLS) & Policies
-- ==============================================================================
ALTER TABLE public.ac_feats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to ac_feats" 
    ON public.ac_feats FOR SELECT USING (true);

CREATE POLICY "Allow service_role to manage ac_feats" 
    ON public.ac_feats
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);