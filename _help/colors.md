---
layout: doc
title: "Color System"
order: 51
---
# Color System

Our color system is built on a two-layer model to make it flexible, and easy to maintain. This approach, often called "design tokens," separates the _literal color values_ (the Palette) from their _purpose_ (the Theme).

- Layer 1: The Palette (--palette-...)
    
    These are the raw, abstractly-named colors for the entire brand (e.g., var(--palette-brand-main)). They have no context, they just define the available colors. They are all stored in style.css.
    
- Layer 2: The Theme (--color-...)
    
    These are the semantic, role-based variables we use in the component CSS (e.g., var(--color-primary)). They give a purpose to a palette color. This layer is what allows us to swap between Light and Dark modes so easily.
    

## How to Use This System

- **To style an individual element:** Always use a **Layer 2 (Theme)** variable.
     
- **To change the entire brand's look:** You only need to change the **Layer 1 (Palette)** variables.
  

## Layer 1: The Palette Tokens

These are the raw color values.

### Light Theme Palette

|   |   |   |
|---|---|---|
|**Variable**|**Value**|**Description**|
|`--palette-brand-main`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #58180D; color: #FDF1DC; border-radius: 4px; ">#58180D</span>|Darkest, for headers/buttons|
|`--palette-brand-main-darker`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #5b0f00; color: #FDF1DC; border-radius: 4px; ">#5b0f00</span>|For sidebar, gradients|
|`--palette-brand-accent`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #822000; color: #FDF1DC; border-radius: 4px; ">#822000</span>|Lighter, for accents/hovers|
|`--palette-brand-accent-darker`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #8b1a0f; color: #FDF1DC; border-radius: 4px; ">#8b1a0f</span>|For gradients|
|`--palette-brand-highlight`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #C0AD6A; color: #2c2c2c; border-radius: 4px; ">#C0AD6A</span>|Gold, for special accents|
|`--palette-bg-page-light`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #fffef9fa; color: #2c2c2c; border-radius: 4px; border: 1px solid #ddd;">#fffef9fa</span>|Off-white page background|
|`--palette-bg-card-light`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #FDF1DC; color: #2c2c2c; border-radius: 4px; border: 1px solid #ddd;">#FDF1DC</span>|Cream for cards, tables|
|`--palette-bg-row-light`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #F5E6D3; color: #2c2c2c; border-radius: 4px; border: 1px solid #ddd;">#F5E6D3</span>|Light tan for alternating rows|
|`--palette-bg-hover-light`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #F0E0C8; color: #2c2c2c; border-radius: 4px; border: 1px solid #ddd;">#F0E0C8</span>|For table row hover|
|`--palette-border-light`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #D4C4B0; color: #2c2c2c; border-radius: 4px; ">#D4C4B0</span>|Tan border|
|`--palette-text-main-light`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #2c2c2c; color: #FDF1DC; border-radius: 4px; ">#2c2c2c</span>|Dark gray body text|
|`--palette-text-muted-light`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #5a5a5a; color: #FDF1DC; border-radius: 4px; ">#5a5a5a</span>|Medium gray meta text|
|`--palette-text-quote-light`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #5a3a2a; color: #FDF1DC; border-radius: 4px; ">#5a3a2a</span>|Blockquote text|

### Dark Theme Palette

|   |   |   |
|---|---|---|
|**Variable**|**Value**|**Description**|
|`--palette-brand-main-dark`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #D4A574; color: #2c2c2c; border-radius: 4px; ">#D4A574</span>|Golden tan, for headers|
|`--palette-brand-accent-dark`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #E8C5A0; color: #2c2c2c; border-radius: 4px; ">#E8C5A0</span>|Light tan, for accents|
|`--palette-bg-page-dark`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #000000; color: #E8DCC8; border-radius: 4px; ">#000000</span>|Pure black page background|
|`--palette-bg-card-dark`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #1a1a1a; color: #E8DCC8; border-radius: 4px; ">#1a1a1a</span>|Dark gray for cards, tables|
|`--palette-bg-row-dark`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #0f0f0f; color: #E8DCC8; border-radius: 4px; ">#0f0f0f</span>|Darker black for rows|
|`--palette-bg-header-start-dark`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #0a0a0a; color: #E8DCC8; border-radius: 4px; ">#0a0a0a</span>|Gradient start for headers|
|`--palette-bg-header-end-dark`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #1a1410; color: #E8DCC8; border-radius: 4px; ">#1a1410</span>|Gradient end for headers|
|`--palette-border-dark`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #3a3a3a; color: #E8DCC8; border-radius: 4px; ">#3a3a3a</span>|Dark gray border|
|`--palette-border-header-dark`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #2a2420; color: #E8DCC8; border-radius: 4px; ">#2a2420</span>|Dark brown-gray border|
|`--palette-text-main-dark`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #E8DCC8; color: #2c2c2c; border-radius: 4px; ">#E8DCC8</span>|Light cream body text|
|`--palette-text-muted-dark`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #A09080; color: #2c2c2c; border-radius: 4px; ">#A09080</span>|Muted tan meta text|

### Neutral / System Palette (Shared)

|   |   |   |
|---|---|---|
|**Variable**|**Value**|**Description**|
|`--palette-neutral-white`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #ffffff; color: #2c2c2c; border-radius: 4px; border: 1px solid #ddd;">#ffffff</span>|Pure white|
|`--palette-neutral-gray-100`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #d4d4d4; color: #2c2c2c; border-radius: 4px; border: 1px solid #ddd;">#d4d4d4</span>|Code text (light)|
|`--palette-neutral-gray-200`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #ddd; color: #2c2c2c; border-radius: 4px; border: 1px solid #ddd;">#ddd</span>|Light border (light)|
|`--palette-neutral-gray-300`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #999; color: #FDF1DC; border-radius: 4px; ">#999</span>|Light meta text (light)|
|`--palette-neutral-gray-400`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #666; color: #FDF1DC; border-radius: 4px; ">#666</span>|Meta text (light)|
|`--palette-neutral-gray-500`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #333333; color: #FDF1DC; border-radius: 4px; ">#333333</span>|Role badge bg (light)|
|`--palette-neutral-gray-600`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #1e1e1e; color: #FDF1DC; border-radius: 4px; ">#1e1e1e</span>|Code bg (light)|
|`--palette-neutral-gray-700`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #dad1ca; color: #2c2c2c; border-radius: 4px; ">#dad1ca</span>|Statblock modifier (light)|
|`--palette-alert-info-border`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #3498db; color: #FDF1DC; border-radius: 4px; ">#3498db</span>|Info border (shared)|
|`--palette-alert-warning-border`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #f39c12; color: #FDF1DC; border-radius: 4px; ">#f39c12</span>|Warning border (shared)|
|`--palette-alert-danger-border`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #e74c3c; color: #FDF1DC; border-radius: 4px; ">#e74c3c</span>|Danger border (shared)|
|`--palette-alert-danger-action`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #c00; color: #FDF1DC; border-radius: 4px; ">#c00</span>|Danger action (shared)|
|`--palette-alert-danger-action-hover`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #a00; color: #FDF1DC; border-radius: 4px; ">#a00</span>|Danger action hover (shared)|
|`--palette-alert-success-border`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #27ae60; color: #FDF1DC; border-radius: 4px; ">#27ae60</span>|Success border (shared)|
|`--palette-alert-success-action`|<span style="display:inline-block; width:100%; padding:0.5em 0; text-align:center; background-color: #0a0; color: #FDF1DC; border-radius: 4px; ">#0a0</span>|Success action (shared)|

## Layer 2: The Theme (Semantic Roles)

This table shows how the semantic variables (what you use in your code) are mapped from the palette.

### Core Colors

|   |   |   |
|---|---|---|
|**Theme Variable**|**Light Mode Map**|**Dark Mode Map**|
|`--color-primary`|`var(--palette-brand-main)`|`var(--palette-brand-main-dark)`|
|`--color-secondary`|`var(--palette-brand-accent)`|`var(--palette-brand-accent-dark)`|
|`--color-text`|`var(--palette-text-main-light)`|`var(--palette-text-main-dark)`|
|`--color-text-secondary`|`var(--palette-text-muted-light)`|`var(--palette-text-muted-dark)`|
|`--color-border`|`var(--palette-border-light)`|`var(--palette-border-dark)`|
|`--color-bg-page`|`var(--palette-bg-page-light)`|`var(--palette-bg-page-dark)`|
|`--color-bg-light`|`var(--palette-bg-card-light)`|`var(--palette-bg-card-dark)`|
|`--color-bg-medium`|`var(--palette-bg-row-light)`|`var(--palette-bg-row-dark)`|
|`--color-bg-page-container`|`var(--palette-bg-hover-light)`|`var(--palette-bg-row-dark)`|
|`--color-link`|`var(--color-secondary)`|`var(--color-primary)`|
|`--color-link-hover`|`var(--color-border)`|`var(--color-primary)`|
|`--color-btn-text`|`var(--color-bg-light)`|`var(--color-bg-light)`|
|`--color-btn-hover-text`|`var(--color-bg-light)`|`var(--color-bg-light)`|
|`--color-card-button-text`|`var(--color-bg-light)`|`var(--color-bg-light)`|

### UI Components

|   |   |   |
|---|---|---|
|**Theme Variable**|**Light Mode Map**|**Dark Mode Map**|
|`--color-table-hover`|`var(--palette-bg-hover-light)`|`rgba(212, 165, 116, 0.08)`|
|`--color-table-header-text`|`var(--color-bg-light)`|`var(--color-bg-light)`|
|`--color-blockquote`|`var(--palette-text-quote-light)`|`var(--color-text-secondary)`|
|`--color-breadcrumb`|`var(--palette-neutral-gray-400)`|`var(--color-text-secondary)`|
|`--color-breadcrumb-sep`|`var(--palette-neutral-gray-300)`|`var(--palette-text-muted-light)`|
|`--color-doc-meta`|`var(--palette-neutral-gray-400)`|`var(--color-text-secondary)`|
|`--color-doc-meta-border`|`var(--palette-neutral-gray-200)`|`var(--color-border)`|
|`--color-doc-body`|`var(--color-text)`|`var(--color-text)`|
|`--color-hero-title`|`var(--color-text)`|`var(--color-text)`|
|`--color-sidebar-bg`|`var(--palette-brand-main-darker)`|`var(--color-bg-page)`|
|`--color-sidebar-border`|`var(--palette-brand-highlight)`|_N/A_|
|`--color-nav-hover-light`|`var(--color-sidebar-border)`|_N/A_|
|`--color-role-badge-bg`|`var(--palette-neutral-gray-500)`|`transparent`|
|`--color-header-bg-start`|_N/A_|`var(--palette-bg-header-start-dark)`|
|`--color-header-bg-end`|_N/A_|`var(--palette-bg-header-end-dark)`|
|`--color-header-border`|_N/A_|`var(--palette-border-header-dark)`|
|`--color-header-text`|_N/A_|`var(--color-text)`|
|`--color-footer-bg`|_N/A_|`var(--color-header-bg-start)`|
|`--color-footer-border`|_N/A_|`var(--color-header-border)`|
|`--color-nav-hover`|_N/A_|`var(--color-secondary)`|
|`--color-header-overlay`|`rgba(0, 0, 0, 0.4)`|`rgba(0, 0, 0, 0.2)`|
|`--search-results-shadow`|`rgba(0, 0, 0, 0.1)`|`rgba(0, 0, 0, 0.4)`|
|`--search-link-hover-bg`|`rgba(88, 24, 13, 0.05)`|`rgba(232, 197, 160, 0.08)`|

### Generator

|   |   |   |
|---|---|---|
|**Theme Variable**|**Light Mode Map**|**Dark Mode Map**|
|`--generator-intro-bg-start`|`var(--palette-brand-main-darker)`|`var(--color-header-bg-start)`|
|`--generator-intro-bg-end`|`var(--palette-brand-accent-darker)`|`var(--color-header-bg-end)`|
|`--generator-toggle-active-bg`|`var(--color-primary)`|`var(--color-primary)`|
|`--generator-toggle-active-text`|`var(--color-bg-light)`|`var(--color-bg-light)`|
|`--generator-input-focus-shadow`|`rgba(88, 24, 13, 0.1)`|`rgba(212, 165, 116, 0.2)`|
|`--generator-table-header-bg`|`rgba(88, 24, 13, 0.05)`|`rgba(212, 165, 116, 0.08)`|
|`--generator-remove-btn-bg`|`var(--palette-alert-danger-action)`|_(Inherited)_|
|`--generator-remove-btn-hover`|`var(--palette-alert-danger-action-hover)`|_(Inherited)_|
|`--generator-markdown-bg`|`var(--palette-neutral-gray-600)`|`var(--color-header-bg-start)`|
|`--generator-markdown-text`|`var(--palette-neutral-gray-100)`|`var(--color-text)`|
|`--generator-placeholder-text`|`var(--palette-neutral-gray-300)`|`var(--palette-text-muted-light)`|
|`--generator-error-bg`|`var(--palette-alert-danger-bg-light-alt)`|`var(--palette-alert-danger-bg-dark)`|
|`--generator-error-border`|`var(--palette-alert-danger-action)`|_(Inherited)_|
|`--generator-error-text`|`var(--palette-alert-danger-action)`|`var(--palette-alert-danger-border)`|
|`--generator-success-bg`|`var(--palette-alert-success-bg-light-alt)`|`var(--palette-alert-success-bg-dark)`|
|`--generator-success-border`|`var(--palette-alert-success-action)`|_(Inherited)_|
|`--generator-success-text`|`var(--palette-alert-success-action)`|`var(--palette-alert-success-border)`|

### Stat Blocks

|   |   |   |
|---|---|---|
|**Theme Variable**|**Light Mode Map**|**Dark Mode Map**|
|`--statblock-bg-image`|`url('/Guides/assets/images/fieldguide-back.png')`|_(Inherited)_|
|`--statblock-page-bg`|`var(--palette-neutral-white)`|`var(--color-header-bg-start)`|
|`--statblock-body-bg`|`#000000`|`var(--color-bg-page)`|
|`--statblock-texture`|`url('data:image/png;base64,...')`|`none`|
|`--statblock-modifier-bg`|`var(--palette-neutral-gray-700)`|`rgba(90, 74, 58, 0.3)`|
|`--statblock-box-shadow`|`rgba(0, 0, 0, 0.25)`|`rgba(0, 0, 0, 0.5)`|
|`--statblock-card-shadow`|`rgba(0, 0, 0, 0.2)`|`rgba(0, 0, 0, 0.4)`|
|`--statblock-card-hover-shadow`|`rgba(0, 0, 0, 0.3)`|`rgba(0, 0, 0, 0.6)`|
|`--statblock-image-shadow`|`rgba(0, 0, 0, 0.2)`|`rgba(0, 0, 0, 0.4)`|
|`--statblock-header-text`|`var(--color-bg-light)`|`var(--color-bg-light)`|