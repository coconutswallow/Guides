-- ==============================================================================
-- 1. Create the Categories Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ac_bastion_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE, -- Storing 'Category' as 'name' 
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 2. Create the Bastions Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ac_bastions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES public.ac_bastion_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    source TEXT,
    size TEXT,
    building_prerequisite TEXT,
    cost_gp TEXT,     -- Using TEXT because values are like "500 / 1000 / 3000"
    cost_dtp TEXT,    -- Using TEXT because values are like "20 / 45 / 125"
    "order" TEXT,     -- Quoted because 'order' is a SQL reserved keyword
    description TEXT,
    notes_advice TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add an index on the foreign key to improve read performance
CREATE INDEX IF NOT EXISTS idx_ac_bastions_category_id ON public.ac_bastions(category_id);


-- ==============================================================================
-- 3. Trigger for updated_at timestamps
-- ==============================================================================
-- Create a generic function to update the 'updated_at' column if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger to both tables
DROP TRIGGER IF EXISTS set_updated_at ON public.ac_bastion_categories;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.ac_bastion_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.ac_bastions;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.ac_bastions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();


-- ==============================================================================
-- 4. Enable Row Level Security (RLS)
-- ==============================================================================
ALTER TABLE public.ac_bastion_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ac_bastions ENABLE ROW LEVEL SECURITY;


-- ==============================================================================
-- 5. Define RLS Policies
-- ==============================================================================

-- POLICY: Anyone can read the data (Public Read)
CREATE POLICY "Allow public read access to ac_bastion_categories" 
    ON public.ac_bastion_categories FOR SELECT USING (true);

CREATE POLICY "Allow public read access to ac_bastions" 
    ON public.ac_bastions FOR SELECT USING (true);

-- POLICY: Only the Service Role (your Apps Script) can Insert/Update/Delete
-- Note: The service_role key inherently bypasses RLS, but it's good practice 
-- to be explicit, and if you ever switch to a custom authenticated role for the script,
-- you can just change 'service_role' to 'authenticated'.

CREATE POLICY "Allow service_role to manage ac_bastion_categories" 
    ON public.ac_bastion_categories
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow service_role to manage ac_bastions" 
    ON public.ac_bastions
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

ALTER TABLE public.ac_bastions ADD CONSTRAINT ac_bastions_name_key UNIQUE (name);

ALTER TABLE public.ac_bastion_categories 
ADD COLUMN display_order INTEGER DEFAULT 0;