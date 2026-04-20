---
title: Navigation Setup
layout: doc
order: 20
exclude_from_search: true
---

**Site Documentation: Managing Collections & Navigation**

This guide explains the technical backbone of the site: how content is organized using Jekyll **Collections** and standard **Folders**, and how those sources build the sidebar **Navigation** menu.

## Part 1: Folders vs. Collections

The site uses a hybrid model to balance automation with reliability:

- **Jekyll Collections (`_rules`, `_playersguide`, etc.):** These folders start with an underscore. They are "official" Jekyll content buckets. Individual pages added here are automatically indexed into the site system.
- **Standard Root Folders (`lore`, `arcana`, `field-guide`, etc.):** These are standard directories in the root. They are used for major site hubs to ensure maximum routing stability (preventing "404 Not Found" errors). 

## Part 2: Navigation setup

The sidebar menu is controlled by a single file: `/_data/navigation.yml`. This file is the "Manager" for the entire site's structure.

There are three ways an item appears in the sidebar:

### 1. Direct Link
Used for simple pages like Allowed Content or FAQ.
```yaml
- title: "FAQ"
  url: /faq.html
```

### 2. Jekyll Collection Loop
Used for "Books" where we want a dropdown that automatically lists every page inside.
```yaml
- title: "Rules & Roles"
  collection: rules
```

### 3. Manual Dropdown (`type: dropdown`)
Used for root folders (`lore`, `arcana`, etc.) to provide the same "accordion" look as a collection while using stable folder links.
```yaml
- title: "Server Lore"
  type: dropdown
  sections:
    - title: "Contents"
      url: /lore/
    - title: "About Hawthorne"
      url: /lore/about-hawthorne/
```

## Part 3: Documents and Front Matter

Individual markdown files (.md) require "Front Matter" at the top to let Jekyll know how to display them:

```yaml
---
layout: doc
title: "My New Rule"
order: 50
background_image: /assets/images/mybackground.jpg
---
```

|Front Matter|Description|
|:---|:---|
|**layout**|Always `doc` for standard documents.|
|**title**|The visible name of the page.|
|**order**|Sets the sorting order (10, 20, 30...) in the sidebar submenu.|
|**permalink**|*IMPORTANT:* For pages in root folders, manually set the clean URL here (e.g., `permalink: /lore/about-hawthorne/`).|
|**background_image**|Sets a custom background image for the page header.|

> [!TIP]
> If you add a new page to a **Collection** (like the Player's Guide), it will appear in the sidebar automatically. If you add a page to a **Root Folder** (like Lore), you must manually add its link to `/_data/navigation.yml`.
