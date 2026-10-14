---
layout: doc
title: "Color System & Design Tokens"
order: 51
exclude_from_search: true
staff_only: true
---

# Color System & Design Tokens

Hawthorne Guild's styling architecture follows a strict, multi-tiered design token model defined in `assets/css/style.css`. This separates literal color values from their semantic purpose and enables seamless switching between **Light Parchment** and **Dark Mode** themes.

---

## 🏗️ Architecture: The Two-Layer Model

```
┌────────────────────────────────────────────────────────┐
│  LAYER 1: PALETTE TOKENS (--palette-...)               │
│  Raw abstract values: #58180D, #D4A574, RGB channels   │
└───────────────────────────┬────────────────────────────┘
                            │ Maps to
┌───────────────────────────▼────────────────────────────┐
│  LAYER 2: THEME TOKENS (--color-...)                   │
│  Semantic roles: --color-primary, --color-bg-page      │
└───────────────────────────┬────────────────────────────┘
                            │ Consumed by
┌───────────────────────────▼────────────────────────────┐
│  FEATURE STYLESHEETS (Modular Component CSS)           │
│  ac-schema.css, allowed-content.css, rework.css, etc.   │
└────────────────────────────────────────────────────────┘
```

### Golden Rules for Authors & Developers
1. **Never hardcode hex values in component CSS:** Always use Layer 2 (`--color-...`) theme variables.
2. **For transparency/alpha channels:** Use the standardized RGB channel tokens with `rgba(var(--palette-*-rgb), <alpha>)`.
3. **To rebrand the site:** Modify only Layer 1 (`--palette-...`) variables in `style.css`; all component styles inherit automatically.

---

## 🎨 Layer 1: The Palette Tokens

### Light Theme Brand & Parchment

| Variable | Value | Preview | Description |
|---|---|---|---|
| `--palette-brand-main` | `#58180D` | <span style="display:inline-block; width:100%; padding:0.4em 0; text-align:center; background-color: #58180D; color: #FDF1DC; border-radius: 4px;">#58180D</span> | Deep Burgundy — headers, main buttons |
| `--palette-brand-main-darker` | `#5b0f00` | <span style="display:inline-block; width:100%; padding:0.4em 0; text-align:center; background-color: #5b0f00; color: #FDF1DC; border-radius: 4px;">#5b0f00</span> | Dark Burgundy — sidebar, active states |
| `--palette-brand-accent` | `#822000` | <span style="display:inline-block; width:100%; padding:0.4em 0; text-align:center; background-color: #822000; color: #FDF1DC; border-radius: 4px;">#822000</span> | Rust Accent — links, hovers |
| `--palette-brand-accent-darker` | `#8b1a0f` | <span style="display:inline-block; width:100%; padding:0.4em 0; text-align:center; background-color: #8b1a0f; color: #FDF1DC; border-radius: 4px;">#8b1a0f</span> | Dark Rust — gradients |
| `--palette-brand-highlight` | `#C0AD6A` | <span style="display:inline-block; width:100%; padding:0.4em 0; text-align:center; background-color: #C0AD6A; color: #2c2c2c; border-radius: 4px;">#C0AD6A</span> | Antique Gold — accents, borders |
| `--palette-bg-page-light` | `#fffef9fa` | <span style="display:inline-block; width:100%; padding:0.4em 0; text-align:center; background-color: #fffef9fa; color: #2c2c2c; border-radius: 4px; border: 1px solid #ddd;">#fffef9fa</span> | Parchment off-white page background |
| `--palette-bg-card-light` | `#FDF1DC` | <span style="display:inline-block; width:100%; padding:0.4em 0; text-align:center; background-color: #FDF1DC; color: #2c2c2c; border-radius: 4px; border: 1px solid #ddd;">#FDF1DC</span> | Warm cream — cards, dialogs, tables |
| `--palette-bg-row-light` | `#F5E6D3` | <span style="display:inline-block; width:100%; padding:0.4em 0; text-align:center; background-color: #F5E6D3; color: #2c2c2c; border-radius: 4px; border: 1px solid #ddd;">#F5E6D3</span> | Soft tan — alternating table rows |
| `--palette-bg-hover-light` | `#F0E0C8` | <span style="display:inline-block; width:100%; padding:0.4em 0; text-align:center; background-color: #F0E0C8; color: #2c2c2c; border-radius: 4px; border: 1px solid #ddd;">#F0E0C8</span> | Highlight tan — hover states |
| `--palette-border-light` | `#D4C4B0` | <span style="display:inline-block; width:100%; padding:0.4em 0; text-align:center; background-color: #D4C4B0; color: #2c2c2c; border-radius: 4px;">#D4C4B0</span> | Parchment border |
| `--palette-text-main-light` | `#2c2c2c` | <span style="display:inline-block; width:100%; padding:0.4em 0; text-align:center; background-color: #2c2c2c; color: #FDF1DC; border-radius: 4px;">#2c2c2c</span> | Charcoal body text |
| `--palette-text-muted-light` | `#5a5a5a` | <span style="display:inline-block; width:100%; padding:0.4em 0; text-align:center; background-color: #5a5a5a; color: #FDF1DC; border-radius: 4px;">#5a5a5a</span> | Medium gray metadata |
| `--palette-text-quote-light` | `#5a3a2a` | <span style="display:inline-block; width:100%; padding:0.4em 0; text-align:center; background-color: #5a3a2a; color: #FDF1DC; border-radius: 4px;">#5a3a2a</span> | Deep sepia blockquote text |

### Dark Theme Palette

| Variable | Value | Preview | Description |
|---|---|---|---|
| `--palette-brand-main-dark` | `#D4A574` | <span style="display:inline-block; width:100%; padding:0.4em 0; text-align:center; background-color: #D4A574; color: #1a1a1a; border-radius: 4px;">#D4A574</span> | Golden Tan — headers, primary accents |
| `--palette-brand-accent-dark` | `#E8C5A0` | <span style="display:inline-block; width:100%; padding:0.4em 0; text-align:center; background-color: #E8C5A0; color: #1a1a1a; border-radius: 4px;">#E8C5A0</span> | Light Sand — links, secondary accents |
| `--palette-bg-page-dark` | `#000000` | <span style="display:inline-block; width:100%; padding:0.4em 0; text-align:center; background-color: #000000; color: #E8DCC8; border-radius: 4px; border: 1px solid #444;">#000000</span> | True black page canvas |
| `--palette-bg-card-dark` | `#1a1a1a` | <span style="display:inline-block; width:100%; padding:0.4em 0; text-align:center; background-color: #1a1a1a; color: #E8DCC8; border-radius: 4px; border: 1px solid #444;">#1a1a1a</span> | Dark charcoal cards and panels |
| `--palette-bg-row-dark` | `#0f0f0f` | <span style="display:inline-block; width:100%; padding:0.4em 0; text-align:center; background-color: #0f0f0f; color: #E8DCC8; border-radius: 4px; border: 1px solid #444;">#0f0f0f</span> | Alternating table rows |
| `--palette-bg-header-start-dark` | `#0a0a0a` | <span style="display:inline-block; width:100%; padding:0.4em 0; text-align:center; background-color: #0a0a0a; color: #E8DCC8; border-radius: 4px; border: 1px solid #444;">#0a0a0a</span> | Header gradient start |
| `--palette-bg-header-end-dark` | `#1a1410` | <span style="display:inline-block; width:100%; padding:0.4em 0; text-align:center; background-color: #1a1410; color: #E8DCC8; border-radius: 4px; border: 1px solid #444;">#1a1410</span> | Warm header gradient end |
| `--palette-border-dark` | `#3a3a3a` | <span style="display:inline-block; width:100%; padding:0.4em 0; text-align:center; background-color: #3a3a3a; color: #E8DCC8; border-radius: 4px;">#3a3a3a</span> | Subtle dark border |
| `--palette-border-header-dark` | `#2a2420` | <span style="display:inline-block; width:100%; padding:0.4em 0; text-align:center; background-color: #2a2420; color: #E8DCC8; border-radius: 4px;">#2a2420</span> | Dark brown header border |
| `--palette-text-main-dark` | `#E8DCC8` | <span style="display:inline-block; width:100%; padding:0.4em 0; text-align:center; background-color: #E8DCC8; color: #1a1a1a; border-radius: 4px;">#E8DCC8</span> | Cream body text |
| `--palette-text-muted-dark` | `#A09080` | <span style="display:inline-block; width:100%; padding:0.4em 0; text-align:center; background-color: #A09080; color: #1a1a1a; border-radius: 4px;">#A09080</span> | Muted sand metadata |

### RGB Channel Tokens (for Alpha Compositing)

To create semi-transparent backgrounds or glowing box-shadows, use these RGB channels:

| Token | Light Mode Channels | Dark Mode Channels | Example Usage |
|---|---|---|---|
| `--palette-brand-main-rgb` | `88, 24, 13` | `212, 165, 116` | `rgba(var(--palette-brand-main-rgb), 0.1)` |
| `--palette-brand-accent-rgb` | `130, 32, 0` | `232, 197, 160` | `rgba(var(--palette-brand-accent-rgb), 0.15)` |
| `--palette-brand-highlight-rgb` | `192, 173, 106` | `192, 173, 106` | `rgba(var(--palette-brand-highlight-rgb), 0.1)` |
| `--palette-bg-card-light-rgb` | `253, 241, 220` | `26, 26, 26` | `rgba(var(--palette-bg-card-light-rgb), 0.85)` |
| `--palette-bg-page-light-rgb` | `255, 254, 249` | `0, 0, 0` | `rgba(var(--palette-bg-page-light-rgb), 0.9)` |
| `--palette-border-light-rgb` | `212, 196, 176` | `58, 58, 58` | `rgba(var(--palette-border-light-rgb), 0.25)` |

### Hawthorne Guild Server Role Colors

| Role | Variable | Hex | Preview |
|---|---|---|---|
| **Trial DM** | `--palette-role-trial-dm` | `#25c059` | <span style="display:inline-block; width:100%; padding:0.3em 0; text-align:center; background-color:#25c059; color:#fff; border-radius:3px;">#25c059</span> |
| **Full DM** | `--palette-role-full-dm` | `#1a7939` | <span style="display:inline-block; width:100%; padding:0.3em 0; text-align:center; background-color:#1a7939; color:#fff; border-radius:3px;">#1a7939</span> |
| **Auditor** | `--palette-role-auditor` | `#ff9900` | <span style="display:inline-block; width:100%; padding:0.3em 0; text-align:center; background-color:#ff9900; color:#fff; border-radius:3px;">#ff9900</span> |
| **Auditor Apprentice** | `--palette-role-auditor-apprentice` | `#d98843` | <span style="display:inline-block; width:100%; padding:0.3em 0; text-align:center; background-color:#d98843; color:#fff; border-radius:3px;">#d98843</span> |
| **Lore Team** | `--palette-role-lore` | `#1f628e` | <span style="display:inline-block; width:100%; padding:0.3em 0; text-align:center; background-color:#1f628e; color:#fff; border-radius:3px;">#1f628e</span> |
| **Lore Apprentice** | `--palette-role-lore-apprentice` | `#5296d5` | <span style="display:inline-block; width:100%; padding:0.3em 0; text-align:center; background-color:#5296d5; color:#fff; border-radius:3px;">#5296d5</span> |
| **PR Team** | `--palette-role-pr` | `#ffd966` | <span style="display:inline-block; width:100%; padding:0.3em 0; text-align:center; background-color:#ffd966; color:#2c2c2c; border-radius:3px;">#ffd966</span> |
| **Rules Team** | `--palette-role-rules` | `#f975f2` | <span style="display:inline-block; width:100%; padding:0.3em 0; text-align:center; background-color:#f975f2; color:#2c2c2c; border-radius:3px;">#f975f2</span> |
| **Rules Apprentice** | `--palette-role-rules-apprentice` | `#b179b8` | <span style="display:inline-block; width:100%; padding:0.3em 0; text-align:center; background-color:#b179b8; color:#fff; border-radius:3px;">#b179b8</span> |
| **Engineer** | `--palette-role-engineer` | `#1abc9c` | <span style="display:inline-block; width:100%; padding:0.3em 0; text-align:center; background-color:#1abc9c; color:#fff; border-radius:3px;">#1abc9c</span> |
| **Engineer Apprentice** | `--palette-role-engineer-apprentice` | `#63a493` | <span style="display:inline-block; width:100%; padding:0.3em 0; text-align:center; background-color:#63a493; color:#fff; border-radius:3px;">#63a493</span> |
| **Admins** | `--palette-role-admins` | `#1c1c1c` | <span style="display:inline-block; width:100%; padding:0.3em 0; text-align:center; background-color:#1c1c1c; color:#fff; border-radius:3px;">#1c1c1c</span> |

---

## 🌓 Layer 2: The Theme Tokens (Semantic Roles)

These semantic variables automatically swap their definitions between Light and Dark mode.

### Core Foundation Colors

| Semantic Variable | Light Theme Mapping | Dark Theme Mapping | Purpose |
|---|---|---|---|
| `--color-primary` | `var(--palette-brand-main)` | `var(--palette-brand-main-dark)` | Major headings, prominent buttons, primary borders |
| `--color-secondary` | `var(--palette-brand-accent)` | `var(--palette-brand-accent-dark)` | Interactive links, subheadings, hover borders |
| `--color-text` | `var(--palette-text-main-light)` | `var(--palette-text-main-dark)` | Primary body copy |
| `--color-text-main` | `var(--palette-text-main-light)` | `var(--palette-text-main-dark)` | Alias for `--color-text` |
| `--color-text-secondary` | `var(--palette-text-muted-light)` | `var(--palette-text-muted-dark)` | Metadata, dates, sub-labels, captions |
| `--color-border` | `var(--palette-border-light)` | `var(--palette-border-dark)` | Standard element borders, dividers, table gridlines |

### Surfaces & Backgrounds

| Semantic Variable | Light Theme Mapping | Dark Theme Mapping | Purpose |
|---|---|---|---|
| `--color-bg-page` | `var(--palette-bg-page-light)` | `var(--palette-bg-page-dark)` | Overall page canvas |
| `--color-bg-light` | `var(--palette-bg-card-light)` | `var(--palette-bg-card-dark)` | Cards, panels, modal dialogs, search dropdowns |
| `--color-bg-medium` | `var(--palette-bg-row-light)` | `var(--palette-bg-row-dark)` | Form inputs, alternating table rows, callout backings |
| `--color-table-hover` | `var(--palette-bg-hover-light)` | `rgba(212, 165, 116, 0.08)` | Hover highlight for table rows and list items |

### Semantic Alerts & Badges

| Semantic Variable | Light Theme Mapping | Dark Theme Mapping | Purpose |
|---|---|---|---|
| `--color-alert-info-bg` | `var(--palette-alert-info-bg-light)` | `rgba(52, 152, 219, 0.12)` | Blue info notices and callouts |
| `--color-alert-info-border` | `var(--palette-alert-info-border)` | `var(--palette-alert-info-border)` | Blue info border (`#3498db`) |
| `--color-alert-warning-bg` | `var(--palette-alert-warning-bg-light)` | `rgba(243, 156, 18, 0.12)` | Yellow/Amber warning notices |
| `--color-alert-warning-border`| `var(--palette-alert-warning-border)` | `var(--palette-alert-warning-border)` | Warning border (`#f39c12`) |
| `--color-alert-danger-bg` | `var(--palette-alert-danger-bg-light)` | `rgba(231, 76, 60, 0.12)` | Red danger/destructive alerts |
| `--color-alert-danger-border`| `var(--palette-alert-danger-border)` | `var(--palette-alert-danger-border)` | Red danger border (`#e74c3c`) |
| `--color-alert-success-bg` | `var(--palette-alert-success-bg-light)` | `rgba(39, 174, 96, 0.12)` | Green success notices and badges |
| `--color-alert-success-border`| `var(--palette-alert-success-border)` | `var(--palette-alert-success-border)` | Green success border (`#27ae60`) |

---

## 📐 Layer 3: Typography, Shadows & Spacing

### Typography Design Tokens

```css
--font-header: 'Marcellus SC', 'Almendra', serif;
--font-body:   'Alegreya Sans', sans-serif;
```

- **Headings & Titles (`--font-header`):** Used for `<h1>`–`<h4>`, section banners, button labels, and table headers to preserve the Hawthorne Guild parchment aesthetic.
- **Body & Controls (`--font-body`):** Used for all content paragraphs, lists, form inputs, tooltips, and table cell data.

### Elevation & Box Shadows

```css
--shadow-sm:  0 2px 4px var(--shadow-color-light);   /* Subtle cards & inputs */
--shadow-md:  0 4px 8px var(--shadow-color-light-alt);  /* Lifted hover states */
--shadow-lg:  0 6px 12px var(--shadow-color-light-alt-2); /* Modals & popups */
--shadow-xl:  0 10px 25px rgba(0, 0, 0, 0.25);          /* Dialog overlays */
--border-radius: 0px;                                     /* Crisp classic parchment edges */
```

### Spacing Tokens

```css
--spacing-xs: 0.5rem;   /* 8px */
--spacing-sm: 1rem;     /* 16px */
--spacing-md: 2rem;     /* 32px */
--spacing-lg: 3rem;     /* 48px */
--spacing-xl: 4rem;     /* 64px */
```

---

## 🧪 Implementation Example

Here is how a feature component (e.g. an admin card or modal) should consume design tokens:

```css
.custom-card {
    background: var(--color-bg-light);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius);
    padding: var(--spacing-sm);
    box-shadow: var(--shadow-sm);
    color: var(--color-text);
}

.custom-card h3 {
    font-family: var(--font-header);
    color: var(--color-primary);
    margin-top: 0;
}

.custom-card:hover {
    box-shadow: var(--shadow-md);
    background: var(--color-table-hover);
}

.custom-badge-active {
    background: var(--color-alert-success-bg);
    border: 1px solid var(--color-alert-success-border);
    color: var(--color-alert-success-border);
}
```