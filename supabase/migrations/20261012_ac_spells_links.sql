--
-- Migration: 20261012_ac_spells_links.sql
-- Purpose: Normalize external markdown links and relative site URLs in public.ac_spells
-- Target Table: public.ac_spells
--

BEGIN;

-- 1. Update SPL_0007 (Spells from EGW): Format external Google Drive link for Hawthorne Arcana
UPDATE public.ac_spells
SET notes = REPLACE(
    notes,
    '- Refer to Dunamancy in Hawthorne Arcana',
    '- Refer to Dunamancy in [Hawthorne Arcana](https://drive.google.com/file/d/1yoinFa31Rhq__unHxMxCSfMq7QY5ARYC/view)'
)
WHERE check_id = 'SPL_0007'
  AND notes LIKE '%- Refer to Dunamancy in Hawthorne Arcana%'
  AND notes NOT LIKE '%[Hawthorne Arcana]%';

-- 2. Update SPL_0012 (Spells from AAG): Convert spreadsheet reference to Equipment tab to relative website URL
UPDATE public.ac_spells
SET rage_advice = REPLACE(
    rage_advice,
    'listed in Equipment except for a Canoe or Rowboat',
    'listed in [Equipment](/allowed-content/#equipment) except for a Canoe or Rowboat'
)
WHERE check_id = 'SPL_0012'
  AND rage_advice LIKE '%listed in Equipment except for a Canoe or Rowboat%'
  AND rage_advice NOT LIKE '%[Equipment]%';

-- 3. Update SPL_0017 (Spells from PHB (2024)): Format external Google Sheets link for PHB 2024 Spell Changes
UPDATE public.ac_spells
SET notes = REPLACE(
    notes,
    'Refer to the PHB 2024 Spell Changes for more details.',
    'Refer to the [PHB 2024 Spell Changes](https://docs.google.com/spreadsheets/d/1tKfU_-0uIi5SvnDXDdLw09WNw8X0akidCoZar1MeOL4/edit?usp=sharing) for more details.'
)
WHERE check_id = 'SPL_0017'
  AND notes LIKE '%Refer to the PHB 2024 Spell Changes for more details.%'
  AND notes NOT LIKE '%[PHB 2024 Spell Changes]%';

-- 4. Update SPL_0018 (Spells from FRHOF (2024)): Convert spreadsheet cross-reference to Spells tab to relative website URL
UPDATE public.ac_spells
SET notes = REPLACE(
    notes,
    'Circle Magic can be used as written with any eligible spell in Allowed Content (Spells)',
    'Circle Magic can be used as written with any eligible spell in [Allowed Content (Spells)](/allowed-content/#spells)'
)
WHERE check_id = 'SPL_0018'
  AND notes LIKE '%Circle Magic can be used as written with any eligible spell in Allowed Content (Spells)%'
  AND notes NOT LIKE '%[Allowed Content (Spells)]%';

COMMIT;
