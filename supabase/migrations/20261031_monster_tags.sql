-- Migration: Monster Tags & Many-to-Many Monster Tag Relations
-- Date: 2026-10-31
-- Target Tables: public.monster_tags, public.monster_tag_relations

-- 1. Create Lookup Table: monster_tags
CREATE TABLE IF NOT EXISTS public.monster_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Case-insensitive unique index on trimmed tag name
CREATE UNIQUE INDEX IF NOT EXISTS idx_monster_tags_name_lower 
ON public.monster_tags (LOWER(TRIM(name)));

-- 2. Create Junction Table: monster_tag_relations (n:n)
CREATE TABLE IF NOT EXISTS public.monster_tag_relations (
    monster_row_id UUID NOT NULL REFERENCES public.monsters(row_id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.monster_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (monster_row_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_monster_tag_relations_monster 
ON public.monster_tag_relations(monster_row_id);

CREATE INDEX IF NOT EXISTS idx_monster_tag_relations_tag 
ON public.monster_tag_relations(tag_id);

-- 3. Row Level Security (RLS)
ALTER TABLE public.monster_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monster_tag_relations ENABLE ROW LEVEL SECURITY;

-- monster_tags: Public read for all users
DROP POLICY IF EXISTS "Public can view monster_tags" ON public.monster_tags;
CREATE POLICY "Public can view monster_tags"
ON public.monster_tags FOR SELECT
TO public
USING (true);

-- monster_tags: Insert/Update/Delete restricted to Admin and Engineer roles
DROP POLICY IF EXISTS "Admins and Engineers can manage monster_tags" ON public.monster_tags;
CREATE POLICY "Admins and Engineers can manage monster_tags"
ON public.monster_tags FOR ALL
TO authenticated
USING (
  ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
  OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
)
WITH CHECK (
  ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
  OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
);

-- monster_tag_relations: Public read for all users
DROP POLICY IF EXISTS "Public can view monster_tag_relations" ON public.monster_tag_relations;
CREATE POLICY "Public can view monster_tag_relations"
ON public.monster_tag_relations FOR SELECT
TO public
USING (true);

-- monster_tag_relations: Creators can manage tags for their monsters; Staff/Admins can manage any
DROP POLICY IF EXISTS "Creators or Staff can manage monster_tag_relations" ON public.monster_tag_relations;
CREATE POLICY "Creators or Staff can manage monster_tag_relations"
ON public.monster_tag_relations FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.monsters m
    WHERE m.row_id = monster_tag_relations.monster_row_id
      AND (
        m.creator_discord_id = (SELECT discord_id FROM public.discord_users WHERE user_id = auth.uid())
        OR public.is_monster_admin()
        OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
        OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.monsters m
    WHERE m.row_id = monster_tag_relations.monster_row_id
      AND (
        m.creator_discord_id = (SELECT discord_id FROM public.discord_users WHERE user_id = auth.uid())
        OR public.is_monster_admin()
        OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Admin"]'::jsonb)
        OR ((SELECT discord_users.roles FROM public.discord_users WHERE discord_users.user_id = auth.uid()) @> '["Engineer"]'::jsonb)
      )
  )
);
