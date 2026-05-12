-- Migration: Revert internal links for the Dollmaker and Porcelain Dolls to the correct /monsters/ path
-- Date: 2026-05-12
-- Description: Reverts hardcoded links in 'additional_info' to match the current site hierarchy (/monsters/).

UPDATE monsters
SET additional_info = REPLACE(
    REPLACE(
        additional_info, 
        '/field-guide/monsters/#/', 
        '/monsters/#/'
    ),
    '/Guides/field-guide/monsters/#/',
    '/Guides/monsters/#/'
)
WHERE additional_info LIKE '%/field-guide/monsters/%';
