---
layout: doc
title: "Navigation Setup"
order: 2
---

# Site Documentation: Managing Collections & Navigation

This guide explains how to maintain the Hawthorne Guild Guide site, including how collections work and what appears in the navigation menu.

## Understanding Collections

Collections are Jekyll's way of organizing related content. Each collection is defined in `_config.yml` and corresponds to a folder starting with an underscore.

### Current Collections

- `_rules` - Server rules and policies
- `_players_guide` - Player resources and guides
- `_dms_guide` - Dungeon Master resources
- `_arcana` - Magic and spellcasting information
- `_field_guide` - World and location information
- `_faq` - Frequently asked questions
- `_monsters` - Monster statblocks (special handling)
- `_site_docs` - Internal site documentation (NOT in menu)

## What Appears in the Navigation Menu

### Automatic Collection Navigation

Collections added to the `navigation` section in `_config.yml` with the `collection` property will automatically generate menu items for all documents with:
- `layout: doc` in the front matter
- Files are sorted by the `order` field

**Example from `_config.yml`:**
```yaml
navigation:
  - title: "📜 Rules & Roles"
    collection: rules
```

This will display ALL `.md` files in `_rules/` that have `layout: doc`, sorted by their `order` value.

### What Gets Excluded

Documents are excluded from automatic navigation if they:
- Use a different layout (e.g., `layout: statblock`)
- Are in a collection NOT listed in `_config.yml` navigation (like `_site_docs`)
- Don't have front matter

### Manual Navigation Sections

Some sections are manually defined (not auto-generated from collections):

**Example: Monster Compendium**
```yaml
- title: "📖 Monster Compendium"
  sections:
    - title: "Monster Compendium"
      url: /monster-compendium/
    - title: "Submit Monster"
      url: /monster-compendium/monsters-submit/
    - title: "Statblock Builder"
      url: /monster-compendium/generator/
```

These require explicit URLs because they include `.html` files or need custom ordering.

## Adding New Content

### Adding a Document to an Existing Collection

1. Create a new `.md` file in the appropriate collection folder (e.g., `_rules/new-rule.md`)
2. Add front matter:
```yaml
---
layout: doc
title: "Your Document Title"
order: 5
---
```
3. Write your content using Markdown
4. The document will automatically appear in the navigation menu if the collection is in `_config.yml`

### Creating a New Collection

1. **Add to `_config.yml` collections section:**
```yaml
collections:
  your_collection:
    output: true
    permalink: /your-collection/:path/
```

2. **Add to navigation (if you want it in the menu):**
```yaml
navigation:
  - title: "🎯 Your Collection"
    collection: your_collection
```

3. **Create the folder:** `_your_collection/`

4. **Add documents** with `layout: doc` front matter

### Creating a Hidden Collection (Like Site Docs)

If you want a collection that generates pages but doesn't appear in the menu:

1. Add to collections in `_config.yml`:
```yaml
collections:
  site_docs:
    output: true
    permalink: /site-docs/:path/
```

2. **Do NOT add it to the navigation section**

3. Pages will be accessible via direct URL: `/site-docs/your-page/`

## Front Matter Reference

### Required Fields for Navigation Display

```yaml
---
layout: doc          # Must be "doc" to appear in auto-generated nav
title: "Page Title"  # Displays in menu and as page heading
order: 1             # Determines position in menu (lower = higher)
---
```

### Optional Fields

```yaml
description: "Brief description for search/SEO"
author: "Your Name"
date: 2025-11-09
tags: [tag1, tag2]
```

## Direct Links

All pages are accessible via direct URLs following this pattern:

- Rules: `https://coconutswallow.github.io/Guides/rules/page-name.html`
- Player's Guide: `https://coconutswallow.github.io/Guides/players-guide/page-name/`
- DM's Guide: `https://coconutswallow.github.io/Guides/dms-guide/page-name/`
- Arcana: `https://coconutswallow.github.io/Guides/arcana/page-name/`
- FAQ: `https://coconutswallow.github.io/Guides/faq/page-name/`
- Monsters: `https://coconutswallow.github.io/Guides/monster-compendium/monster-name/`
- Site Docs: `https://coconutswallow.github.io/Guides/site-docs/page-name/`

**Note:** The URL structure is defined by the `permalink` setting in each collection's config.

## Troubleshooting

### "My page doesn't appear in the menu"

Check:
1. Does the file have `layout: doc` in front matter?
2. Is the collection listed in `_config.yml` navigation?
3. Is the file in the correct collection folder?
4. Does it have an `order` field?

### "My collection appears empty in the menu"

Check:
1. Do any files in the collection have `layout: doc`?
2. Files with `layout: statblock` or other layouts won't appear
3. The collection folder must start with underscore (e.g., `_rules`)

### "Build error about null object"

This usually means:
1. A collection name is misspelled in `_config.yml`
2. A collection folder doesn't exist
3. Front matter is malformed

## Best Practices

1. **Consistent Ordering:** Use order values in increments of 10 (10, 20, 30) to allow easy insertion of new pages
2. **Clear Titles:** Use descriptive titles that work both in the menu and as page headings
3. **Document Layout:** Always use `layout: doc` for standard documentation pages
4. **Test Locally:** Use `bundle exec jekyll serve` to test changes before committing
5. **Keep URLs Clean:** Use lowercase and hyphens in filenames (e.g., `server-rules.md` not `Server_Rules.md`)

## File Structure Example

```
/
├── _config.yml
├── _rules/
│   ├── server-rules.md        (layout: doc, order: 1)
│   ├── server-roles.md        (layout: doc, order: 2)
│   └── privacy-policy.md      (layout: doc, order: 3)
├── _monsters/
│   ├── ancient-dragon.md      (layout: statblock) ← NOT in auto-nav
│   └── goblin.md              (layout: statblock) ← NOT in auto-nav
├── _site_docs/
│   └── collections-guide.md   (layout: doc) ← NOT in menu
└── monster-compendium/
    └── index.html             ← Manual nav entry required
```

## Need Help?

If you need to make structural changes to the site or have questions about the navigation system, contact the site administrator or consult the Jekyll documentation at https://jekyllrb.com/docs/collections/