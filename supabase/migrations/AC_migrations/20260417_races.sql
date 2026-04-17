-- ==============================================================================
-- 1. Create the Races Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ac_races (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    subrace TEXT NOT NULL, -- Set to NOT NULL to safely allow the composite unique constraint
    size TEXT,
    speed TEXT,
    language TEXT,
    str TEXT,
    dex TEXT,
    con TEXT,
    "int" TEXT,
    wis TEXT,
    cha TEXT,
    extra TEXT,
    source TEXT,
    rage_advice TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Composite unique constraint: Tells Supabase how to detect duplicates
    CONSTRAINT ac_races_name_subrace_key UNIQUE (name, subrace)
);

-- ==============================================================================
-- 2. Trigger for updated_at timestamps
-- ==============================================================================
-- (Assumes the public.handle_updated_at() function already exists from your Bastions setup)
DROP TRIGGER IF EXISTS set_updated_at ON public.ac_races;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.ac_races
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 3. Enable Row Level Security (RLS) & Policies
-- ==============================================================================
ALTER TABLE public.ac_races ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to ac_races" 
    ON public.ac_races FOR SELECT USING (true);

CREATE POLICY "Allow service_role to manage ac_races" 
    ON public.ac_races
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);