---
title: Collections & Navigation Setup
layout: doc
order: 20 
exclude_from_search: true
---

# Managing Collections & Navigation

This guide explains how content is organized in Jekyll using **Collections** and how the sidebar navigation menu is configured in `_data/navigation.yml`.

---

## 1. Jekyll Collections (`_config.yml`)

Collections are content buckets defined in `_config.yml` that automatically index pages and generate permalinks:

```yaml
collections:
  rules:
    output: true
    permalink: /rules/:path/
  playersguide:
    output: true
    permalink: /playersguide/:path/
  dmsguide:
    output: true
    permalink: /dmsguide/:path/
  dms_appendices:
    output: true
    permalink: /dmsguide/appendices/:path/
  faq:
    output: true
    permalink: /faq/:path/
  help:
    output: true
    permalink: /help/:path/
  resources:
    output: true
    permalink: /resources/:path/
  lore:
    output: true
    permalink: /lore/:path/
  arcana:
    output: true
    permalink: /arcana/:path/
  player_resources:
    output: true
    permalink: /player-resources/:path/
  dm_resources:
    output: true
    permalink: /dm-resources/:path/
  adventure_locations:
    output: true
    permalink: /field-guide/adventure-locations/:path/
```

You'll notice that collection folders always start with "_" such as "_playersguide".  This helps Jekyll know which folders to index and convert the .md into .html.  Individual markdown files within a collection folder (e.g. `_rules/downtime.md`) automatically inherit the collection layout and routing.

---

## 2. Navigation Setup (`_data/navigation.yml`)

The sidebar menu is controlled by `_data/navigation.yml`. There are three primary patterns for adding items:

### Pattern 1: Direct Link
Used for standalone pages such as Allowed Content, FAQ, or DM Tool:
```yaml
- title: "Allowed Content"
  url: /allowed-content/

- title: "FAQ"
  url: /faq.html
```

### Pattern 2: Collection Loop
Used for multi-page "books" where Jekyll automatically renders a collapsible list of all pages in the collection sorted by `order`:
```yaml
- title: "Rules & Roles"
  collection: rules

- title: "Player's Guide"
  collection: playersguide
  sections:
    - title: "Appendices"
      folder: "playersguide/appendices"
```

### Pattern 3: Custom Dropdown (`type: dropdown` or `sections:`)
Used for groupings of distinct URLs or sub-tools:
```yaml
- title: "Player Tools"
  sections:
    - title: "Contents"
      url: /player-tools/
    - title: "Rework Tool"
      url: /player-tools/rework/

- title: "Field Guide"
  type: dropdown
  sections:
    - title: "Monster Compendium"
      url: /monsters/
    - title: "Adventure Locations"
      url: /field-guide/adventure-locations/
```

---

## 3. Front Matter Conventions

Every markdown document in a collection should begin with front matter (i.e. this should be at the top of each .md file)

```yaml
---
layout: doc
title: "Downtime Activities"
order: 20
background_image: /assets/images/tavern_brawl.jpg
exclude_from_search: false
---
```

| Field | Description |
| :--- | :--- |
| `layout` | Always `doc` for standard documentation pages. |
| `title` | Page heading displayed at the top and in navigation menus. |
| `order` | Number controlling sorting position in collection listings (10, 20, 30...). |
| `background_image` | Optional custom header artwork background. |
| `exclude_from_search` | Set to `true` to exclude internal guides or admin notes from universal search. |
