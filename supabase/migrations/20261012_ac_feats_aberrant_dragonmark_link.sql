--
-- Migration: 20261012_ac_feats_aberrant_dragonmark_link.sql
-- Purpose: Update Aberrant Dragonmark feats (FEA_0001, FEA_0193) to link Hawthorne Arcana
--          to the website link (/arcana/) instead of the external Google Drive PDF.
-- Target Table: public.ac_feats
--

BEGIN;

-- Update FEA_0001 (2014 Aberrant Dragonmark) and FEA_0193 (2024 Aberrant Dragonmark)
UPDATE public.ac_feats
SET notes_advice = REPLACE(
    notes_advice,
    '[Hawthorne Arcana](https://drive.google.com/file/d/1yoinFa31Rhq__unHxMxCSfMq7QY5ARYC/view)',
    '[Hawthorne Arcana](/arcana/)'
)
WHERE name = 'Aberrant Dragonmark'
  AND notes_advice LIKE '%[Hawthorne Arcana](https://drive.google.com/file/d/1yoinFa31Rhq__unHxMxCSfMq7QY5ARYC/view)%';

COMMIT;
