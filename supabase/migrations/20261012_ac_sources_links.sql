-- ==============================================================================
-- Migration: 20261012_ac_sources_links.sql
-- Description: Replace Google Spreadsheet cross-reference links in public.ac_sources
--              notes_advice with relative website URLs inside Allowed Content.
-- ==============================================================================

BEGIN;

-- 1. SRC_0009: The Book of Many Things
-- Replace spreadsheet Feats link with relative website URL /allowed-content/#feats
-- and link Loot mention to /allowed-content/#loot
UPDATE public.ac_sources
SET notes_advice = '- The Cartomancer feat has a Rage Advice regarding its use. See [Feats](/allowed-content/#feats) for details.' || E'\n' || '- Individual cards of the Deck of Many Things can be acquired, but the Deck of Many Things, the Deck of Many More Things, and the Deck of Wonders can only be encountered and used during adventures. See [Loot](/allowed-content/#loot) for details.'
WHERE check_id = 'SRC_0009';

-- 2. SRC_0023: Explorer's Guide to Wildemount
-- Replace spreadsheet Spells link with relative website URL /allowed-content/#spells
UPDATE public.ac_sources
SET notes_advice = 'Dunamancy spells are available to various classes. See [Spells](/allowed-content/#spells) for details.'
WHERE check_id = 'SRC_0023';

COMMIT;
