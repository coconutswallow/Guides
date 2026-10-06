-- ==============================================================================
-- Migration: 20261006_ac_fighting_styles_feats_link_fix.sql
-- Description: Update MSC_0017 notes_advice to link "here" to Allowed Content Feats Tab (/Guides/allowed-content/#feats)
-- ==============================================================================

UPDATE public.ac_fighting_styles
SET notes_advice = 'Refer to Fighting Style Feats [here](/Guides/allowed-content/#feats).'
WHERE check_id = 'MSC_0017';
