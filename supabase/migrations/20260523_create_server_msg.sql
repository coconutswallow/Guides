-- Migration: Create server_msg Table
-- Date: 2026-05-23
-- Description: Creates the server_msg table for active announcements on the homepage.

-- 2026-07-12:  Executed in PROD

-- 1. Create the server_msg Table
CREATE TABLE IF NOT EXISTS public.server_msg (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Trigger for updated_at timestamps
DROP TRIGGER IF EXISTS set_updated_at ON public.server_msg;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.server_msg
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 3. Enable Row Level Security (RLS) & Policies
ALTER TABLE public.server_msg ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to server_msg" ON public.server_msg;
CREATE POLICY "Allow public read access to server_msg" 
    ON public.server_msg FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow service_role to manage server_msg" ON public.server_msg;
CREATE POLICY "Allow service_role to manage server_msg" 
    ON public.server_msg
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);
