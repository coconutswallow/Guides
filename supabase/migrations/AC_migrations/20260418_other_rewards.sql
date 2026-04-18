-- ==============================================================================
-- 1. Create the Other Rewards Categories Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ac_other_rewards_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    notes TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 2. Create the Other Rewards Table (With Foreign Key)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ac_other_rewards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES public.ac_other_rewards_categories(id),
    name TEXT NOT NULL,
    source TEXT NOT NULL,
    type TEXT,
    tier TEXT,
    description TEXT,
    notes_advice TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Composite unique constraint (name + source) 
    CONSTRAINT ac_other_rewards_name_source_key UNIQUE (name, source)
);

-- ==============================================================================
-- 3. Triggers for updated_at timestamps
-- ==============================================================================
DROP TRIGGER IF EXISTS set_updated_at ON public.ac_other_rewards_categories;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.ac_other_rewards_categories
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.ac_other_rewards;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.ac_other_rewards
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 4. Enable Row Level Security (RLS) & Policies
-- ==============================================================================
ALTER TABLE public.ac_other_rewards_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to ac_other_rewards_categories" ON public.ac_other_rewards_categories FOR SELECT USING (true);
CREATE POLICY "Allow service_role to manage ac_other_rewards_categories" ON public.ac_other_rewards_categories FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.ac_other_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to ac_other_rewards" ON public.ac_other_rewards FOR SELECT USING (true);
CREATE POLICY "Allow service_role to manage ac_other_rewards" ON public.ac_other_rewards FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 1. Drop the old unique rule
ALTER TABLE public.ac_other_rewards 
DROP CONSTRAINT IF EXISTS ac_other_rewards_name_source_key;

-- 2. Add the new category-aware unique rule
ALTER TABLE public.ac_other_rewards 
ADD CONSTRAINT ac_other_rewards_category_name_source_key UNIQUE (category_id, name, source);