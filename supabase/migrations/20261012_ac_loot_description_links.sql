-- Migration: 20261012_ac_loot_description_links.sql
-- Description: Convert cross-reference links in public.ac_loot descriptions to markdown format
-- Targets:
--   1. Monster link in LOT_1232 (The Spirit of Joy) -> [Fluff Puffle](/monsters/#fluff-puffle)
--   2. Allowed Content tab cross-references 'See Equipment' -> 'See [Equipment](/allowed-content/#equipment)'
--   3. Allowed Content tab cross-references 'See Downtime' -> 'See [Downtime](/allowed-content/#downtime)'

-- 1. Update The Spirit of Joy (LOT_1232)
UPDATE public.ac_loot
SET description = replace(description, 'statistics of Fluff Puffle.', 'statistics of [Fluff Puffle](/monsters/#fluff-puffle).')
WHERE check_id = 'LOT_1232'
  AND description LIKE '%statistics of Fluff Puffle.%'
  AND description NOT LIKE '%[Fluff Puffle]%';

-- 2. Update See Equipment references
UPDATE public.ac_loot
SET description = replace(description, 'See Equipment', 'See [Equipment](/allowed-content/#equipment)')
WHERE description LIKE '%See Equipment%'
  AND description NOT LIKE '%See [Equipment]%';

-- 3. Update See Downtime references
UPDATE public.ac_loot
SET description = replace(description, 'See Downtime', 'See [Downtime](/allowed-content/#downtime)')
WHERE description LIKE '%See Downtime%'
  AND description NOT LIKE '%See [Downtime]%';
