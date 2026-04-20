-- Migration: Update internal links for the Dollmaker and Porcelain Dolls
-- Date: 2026-04-20
-- Description: Updates hardcoded links in 'additional_info' (Other Notes) to match the new site hierarchy (/field-guide/monsters/).

-- This handles links to the Dollmaker, porcelain doll, and swarm from within each other's documentation.
UPDATE monsters
SET additional_info = REPLACE(
    REPLACE(
        additional_info, 
        '/monsters/#/', 
        '/field-guide/monsters/#/'
    ),
    '/Guides/monsters/#/',
    '/Guides/field-guide/monsters/#/'
)
WHERE row_id IN (
    'f3be2757-c8d0-4b17-8ff8-ec98b05bee26', -- the-dollmaker
    '7b01bfe9-d9f0-491d-8ccf-e263f758b66a'  -- cursed-porcelain-doll / swarm
)
OR slug IN (
    'cursed-porcelain-doll', 
    'swarm-of-cursed-porcelain-dolls', 
    'the-dollmaker'
);
