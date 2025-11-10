---
layout: doc
title: "Color Table"
order: 51
---
# Colors

I've tried my best to use color variables wherever possible, and stick to as clean of a set of colors as possible.  This way each color variable has a pair for light and dark mode, so if we hate the colors, we just change it at the headers, and everything updates easier

## Color Table

| file | variable | light mode color (including example) | dark mode color (including example) |
| :--- | :--- | :--- | :--- |
| **style.css** | `--color-primary` | `#58180D` (Deep burgundy - headers, buttons) | `#D4A574` (Golden tan - headers (inverted)) |
| **style.css** | `--color-secondary` | `#822000` (Rich rust - accents, hovers) | `#E8C5A0` (Light tan - accents) |
| **style.css** | `--color-bg-light` | `#FDF1DC` (Cream - cards, tables) | `#1a1a1a` (Dark gray/black - cards, tables) |
| **style.css** | `--color-bg-medium` | `#F5E6D3` (Light tan - alternating rows) | `#0f0f0f` (Darker black - alternating rows) |
| **style.css** | `--color-bg-page` | `#FFFEF9` (Off-white - page background) | `#000000` (Pure black - page background) |
| **style.css** | `--color-text` | `#2c2c2c` (Dark gray - body text) | `#E8DCC8` (Light cream - body text) |
| **style.css** | `--color-text-secondary` | `#5a5a5a` (Medium gray - meta text) | `#A09080` (Muted tan - meta text) |
| **style.css** | `--color-border` | `#D4C4B0` (Tan border) | `#3a3a3a` (Dark gray border) |
| **style.css** | `--color-link` | `#822000` (Rust - links) | `#D4A574` (Golden tan - links) |
| **style.css** | `--color-link-hover` | `#58180D` (Burgundy - link hover) | `#E8C5A0` (Light tan - link hover) |
| **style.css** | `--color-table-hover` | `#F0E0C8` (Table row hover) | `rgba(212, 165, 116, 0.08)` (Subtle table row hover) |
| **style.css** | `--color-blockquote` | `#5a3a2a` (Blockquote text) | `#A09080` (Muted tan for quotes) |
| **style.css** | `--color-breadcrumb` | `#666` (Breadcrumb text) | `#A09080` (Muted tan for breadcrumbs) |
| **style.css** | `--color-breadcrumb-sep` | `#999` (Breadcrumb separator) | `#5a5a5a` (Darker separator) |
| **style.css** | `--color-doc-meta` | `#666` (Documentation meta) | `#A09080` (Muted tan for meta info) |
| **style.css** | `--color-doc-meta-border` | `#ddd` (Documentation meta border) | `#3a3a3a` (Dark border) |
| **style.css** | `--color-doc-body` | `#2c2c2c` (Documentation body text) | `#E8DCC8` (Light cream for body text) |
| **style.css** | `--color-table-header-text` | `#FDF1DC` (Table header text) | `#1a1a1a` (Table header text) |
| **style.css** | `--color-role-badge-bg` | `#333333` (Role badge background) | `transparent` (Role badge background) |
| **style.css** | `--color-header-overlay` | `rgba(0, 0, 0, 0.4)` (Header overlay) | `rgba(0, 0, 0, 0.2)` (Header overlay) |
| **style.css** | `--color-alert-info-bg` | `#e3f2fd` (Alert background) | `rgba(52, 152, 219, 0.12)` (Alert background) |
| **style.css** | `--color-alert-info-border` | `#3498db` (Alert border) | `#3498db` (Alert border) |
| **style.css** | `--color-alert-warning-bg` | `#fff3cd` (Alert background) | `rgba(243, 156, 18, 0.12)` (Alert background) |
| **style.css** | `--color-alert-warning-border` | `#f39c12` (Alert border) | `#f39c12` (Alert border) |
| **style.css** | `--color-alert-danger-bg` | `#f8d7da` (Alert background) | `rgba(231, 76, 60, 0.12)` (Alert background) |
| **style.css** | `--color-alert-danger-border` | `#e74c3c` (Alert border) | `#e74c3c` (Alert border) |
| **style.css** | `--color-alert-success-bg` | `#d4edda` (Alert background) | `rgba(39, 174, 96, 0.12)` (Alert background) |
| **style.css** | `--color-alert-success-border` | `#27ae60` (Alert border) | `#27ae60` (Alert border) |
| **style.css** | `--color-header-bg-start` | N/A | `#0a0a0a` (Nearly black (gradient start)) |
| **style.css** | `--color-header-bg-end` | N/A | `#1a1410` (Very dark brown-black (gradient end)) |
| **style.css** | `--color-header-text` | N/A | `#E8DCC8` (Light cream text) |
| **style.css** | `--color-header-border` | N/A | `#2a2420` (Dark brown-gray border) |
| **style.css** | `--color-footer-bg` | N/A | `#0a0a0a` (Nearly black) |
| **style.css** | `--color-footer-border` | N/A | `#2a2420` (Dark brown-gray border) |
| **style.css** | `--color-nav-hover` | N/A | `#2a2420` (Light tan for nav hover) |
| **style.css** | `--color-sidebar-bg` | `#5b0f00` (Sidebar background) | `#000000` (Pure black sidebar background) |
| **style.css** | `--color-sidebar-border` | `#C0AD6A` (Sidebar header border) | N/A |
| **style.css** | `--color-nav-hover-light` | `#C0AD6A` (Nav hover in light mode) | N/A |
| **style.css** | `--color-btn-text` | N/A | `#1a1a1a` (Dark text for buttons - NEW!) |
| **generator.css** | `--generator-intro-bg-start` | `#5b0f00` (Intro gradient start) | `#0a0a0a` (Intro gradient start) |
| **generator.css** | `--generator-intro-bg-end` | `#8b1a0f` (Intro gradient end) | `#1a1410` (Intro gradient end) |
| **generator.css** | `--generator-toggle-active-bg` | `#58180D` (Active toggle background) | `#D4A574` (Active toggle background) |
| **generator.css** | `--generator-toggle-active-text` | `#FDF1DC` (Active toggle text) | `#1a1a1a` (Active toggle text) |
| **generator.css** | `--generator-input-focus-shadow` | `rgba(88, 24, 13, 0.1)` (Input focus shadow) | `rgba(212, 165, 116, 0.2)` (Input focus shadow) |
| **generator.css** | `--generator-table-header-bg` | `rgba(88, 24, 13, 0.05)` (Table header background) | `rgba(212, 165, 116, 0.08)` (Table header background) |
| **generator.css** | `--generator-remove-btn-bg` | `#c00` (Remove button background) | `#c00` (Remove button background) |
| **generator.css** | `--generator-remove-btn-hover` | `#a00` (Remove button hover) | `#a00` (Remove button hover) |
| **generator.css** | `--generator-markdown-bg` | `#1e1e1e` (Markdown preview background) | `#0a0a0a` (Markdown preview background) |
| **generator.css** | `--generator-markdown-text` | `#d4d4d4` (Markdown preview text) | `#E8DCC8` (Markdown preview text) |
| **generator.css** | `--generator-placeholder-text` | `#999` (Placeholder text) | `#5a5a5a` (Placeholder text) |
| **generator.css** | `--generator-error-bg` | `#fee` (Error box background) | `rgba(231, 76, 60, 0.15)` (Error box background) |
| **generator.css** | `--generator-error-border` | `#c00` (Error box border) | `#e74c3c` (Error box border) |
| **generator.css** | `--generator-error-text` | `#c00` (Error box text) | `#e74c3c` (Error box text) |
| **generator.css** | `--generator-success-bg` | `#efe` (Success box background) | `rgba(39, 174, 96, 0.15)` (Success box background) |
| **generator.css** | `--generator-success-border` | `#0a0` (Success box border) | `#27ae60` (Success box border) |
| **generator.css** | `--generator-success-text` | `#0a0` (Success box text) | `#27ae60` (Success box text) |
| **statblock.css** | `--statblock-page-bg` | `#ffffff` (Page background override) | `#0a0a0a` (Page background override) |
| **statblock.css** | `--statblock-body-bg` | `#000000` (Body background color) | `#000000` (Body background color) |
| **statblock.css** | `--statblock-modifier-bg` | `#dad1ca` (Ability score modifier background) | `rgba(90, 74, 58, 0.3)` (Ability score modifier background) |
| **statblock.css** | `--statblock-header-text` | `#FDF1DC` (Stat block header text) | `#1a1a1a` (Stat block header text) |
| **statblock.css** | `--statblock-box-shadow**` | `rgba(0, 0, 0, 0.25)` (Page container shadow) | `rgba(0, 0, 0, 0.5)` (Page container shadow) |
| **statblock.css** | `--statblock-card-shadow` | `rgba(0, 0, 0, 0.2)` (Stat block card shadow) | `rgba(0, 0, 0, 0.4)` (Stat block card shadow) |
| **statblock.css** | `--statblock-card-hover-shadow` | `rgba(0, 0, 0, 0.3)` (Stat block card hover shadow) | `rgba(0, 0, 0, 0.6)` (Stat block card hover shadow) |
| **statblock.css** | `--statblock-image-shadow` | `rgba(0, 0, 0, 0.2)` (Image shadow) | `rgba(0, 0, 0, 0.4)` (Image shadow) |
| **home.css** | `--color-hero-title` | `#2c2c2c` (Dark gray for hero title) | `#E8DCC8` (Light cream for hero title) |
| **home.css** | `--color-card-button-text` | `#FDF1DC` (Cream text on buttons) | `#1a1a1a` (Dark text on buttons) |
| **search.css** | `--search-results-shadow` | `rgba(0, 0, 0, 0.1)` (Search results shadow) | `rgba(0, 0, 0, 0.4)` (Search results shadow) |
| **search.css** | `--search-link-hover-bg` | `rgba(88, 24, 13, 0.05)` (Search link hover background) | `rgba(232, 197, 160, 0.08)` (Search link hover background) |