-- ==============================================================================
-- Migration: Update Hawthorne Arcana Subclass Links to Site Sections
-- Date: 2026-10-05
-- Description:
-- Updates subclass records in `public.ac_subclasses` that reference Hawthorne Arcana
-- to link directly to their corresponding site URLs under `/arcana/` instead of
-- the legacy Google Drive PDF link.
-- ==============================================================================

UPDATE public.ac_subclasses
SET link = CASE
    WHEN name = 'Battlerager' AND source = 'HTA' THEN '/Guides/arcana/battlerager/'
    WHEN name = 'Purple Dragon Knight' AND source = 'HTA' THEN '/Guides/arcana/purple-dragon-knight/'
    WHEN name = 'Serenity' AND source = 'HTA' THEN '/Guides/arcana/serenity-monk/'
    WHEN name = 'Artificer' AND source = 'HTA' THEN '/Guides/arcana/artificer-wizard/'
    ELSE link
END
WHERE (name = 'Battlerager' AND source = 'HTA')
   OR (name = 'Purple Dragon Knight' AND source = 'HTA')
   OR (name = 'Serenity' AND source = 'HTA')
   OR (name = 'Artificer' AND source = 'HTA');

-- Ensure official SCAG Battlerager does not have Arcana homebrew link
UPDATE public.ac_subclasses
SET link = NULL
WHERE name = 'Battlerager' AND source = 'SCAG';

UPDATE public.ac_sources
SET link = '/Guides/arcana/'
WHERE source_key = 'HTA';
