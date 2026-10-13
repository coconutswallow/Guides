--
-- Migration: 20261012_ac_misc_features_links.sql
-- Purpose: Normalize relative documentation links in public.ac_fighting_styles and public.ac_artificer_infusions
--
BEGIN;

-- 1. Update public.ac_fighting_styles: normalize relative URL
UPDATE public.ac_fighting_styles 
SET notes_advice = 'Refer to Fighting Style Feats [here](/allowed-content/#feats).'
WHERE check_id = 'MSC_0017';

-- 2. Update public.ac_artificer_infusions: cross-reference Items List to Loot tab
UPDATE public.ac_artificer_infusions 
SET notes_advice = '- Magic items made this way can''t be sold or traded
- Can be used to make any T0 or T1 permanent magic item in [Loot](/allowed-content/#loot)'
WHERE check_id = 'MSC_0029';

COMMIT;
