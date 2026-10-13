--
-- Migration: 20261012_ac_feats_links.sql
-- Purpose: Normalize external markdown links and relative site URLs in public.ac_feats
-- Target Table: public.ac_feats
--

BEGIN;

-- 1. Update 26 dragonmark feats with external markdown link to Eberron: Rising from the Last War
UPDATE public.ac_feats
SET notes_advice = REPLACE(
    notes_advice,
    'from Eberron: Rising from the Last War',
    'from [Eberron: Rising from the Last War](https://www.dndbeyond.com/sources/dnd/erftlw)'
)
WHERE notes_advice LIKE '%from Eberron: Rising from the Last War%'
  AND notes_advice NOT LIKE '%[Eberron: Rising from the Last War]%';

-- 2. Update 15 dragonmark & boon feats with external markdown link to Hawthorne Arcana
UPDATE public.ac_feats
SET notes_advice = REPLACE(
    notes_advice,
    'found in Hawthorne Arcana',
    'found in [Hawthorne Arcana](https://drive.google.com/file/d/1yoinFa31Rhq__unHxMxCSfMq7QY5ARYC/view)'
)
WHERE notes_advice LIKE '%found in Hawthorne Arcana%'
  AND notes_advice NOT LIKE '%[Hawthorne Arcana]%';

-- 3. Update FEA_0154 (Cult of the Dragon Initiate) with relative site URL to Languages tab
UPDATE public.ac_feats
SET notes_advice = REPLACE(
    notes_advice,
    'Allowed Content (Languages)',
    '[Allowed Content (Languages)](/allowed-content/#languages)'
)
WHERE check_id = 'FEA_0154'
  AND notes_advice LIKE '%Allowed Content (Languages)%'
  AND notes_advice NOT LIKE '%[Allowed Content (Languages)]%';

COMMIT;
