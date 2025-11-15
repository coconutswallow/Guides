---
title: Navigation Setup
layout: doc
order: 20
---

# Site Documentation: Managing Collections & Navigation

This guide explains the technical backbone of the site: how content is organized using Jekyll **Collections** and how those collections automatically build the sidebar **Navigation** menu.

## Part 1: What is a "Collection"?

In simple terms, a **Collection** is a special folder (starting with an `_`) that Jekyll is told to pay attention to.

- **Standard Folder:** Jekyll ignores a normal folder.
    
- **Collection Folder (`_rules`, `_playersguide`, etc.):** Jekyll will read _every file_ inside, process it, and make it available for the site to use (e.g., to create pages or list in a menu).
    

These are all defined in the `collections:` block of your `_config.yml` file. This definition tells Jekyll "Yes, the `_rules` folder is special. Read its contents and make them available under the name `rules`."

## Part 2: The Magic: From `.md` File to Sidebar Menu

This is the core concept of the site. Here is the step-by-step process of how your new page appears in the menu automatically.

1. **You Create a File:** You create `_rules/my-new-rule.md`.
    
2. **You Add "Front Matter":** At the top of that file, you add `layout: doc`.
    
3. **Jekyll Builds the Site:**
    
    - Jekyll finds `_rules/my-new-rule.md`.
        
    - It sees `layout: doc`. This is a crucial instruction. It tells Jekyll: "Take the content of this Markdown file and wrap it inside the HTML template found at `_layouts/doc.html`."
        
    - The result is a fully-formed webpage, `.../rules/my-new-rule.html`, which now has the site header, footer, and all the correct styling.
        
4. **The Sidebar Builds Itself:**
    
    - The sidebar layout file reads the `navigation:` block in `_config.yml`.
        
    - It sees the entry for "Rules & Roles" which says `collection: rules`.
        
    - This is another instruction: "Automatically find every page in the `rules` collection (which we found in Step 3!), sort them by their `order:` number, and list their `title:` here as a link."
        
5. **Done:** Your new page appears in the menu, perfectly sorted, without you ever having to manually edit an HTML navigation file.
    

The key takeaway: **`collection:` + `layout: doc` + `order:` = Automatic Menu Item**

## Part 3: How to Configure the Sidebar Menu

The sidebar is 100% controlled by the `navigation:` block in `_config.yml`. It supports **four** types of menu items.

### Type 1: The Simple Link

This just points to one specific URL. It's used for the "Home" page and the "FAQ" page.

```
# Example from _config.yml
navigation:
  - title: "Home"
    url: "/"
  - title: "FAQ"
    url: /faq.html
```

### Type 2: The Automatic Collection (Most Common)

This is the "magic" one. You provide a `title` and a `collection:` name. It automatically finds all `layout: doc` pages in that collection and builds a list.

```
# Example from _config.yml
# This one line automatically finds all pages
# in the `_rules` folder and lists them.
  - title: "Rules & Roles"
    collection: rules
```

### Type 3: The Fully Manual Section

This is used when you need to link to pages that are _not_ in a collection, or are not standard document pages (like the Statblock Builder, which is an `.html` file).

Notice there is **no `collection:` key**. Instead, you manually define all sub-links in a `sections:` block.

```
# Example from _config.yml
# Used for the Monster Compendium
  - title: "Monster Compendium"
    sections:
      - title: "Monster Compendium"
        url: /monster-compendium/
      - title: "Submit A Monster"
        url: /monster-compendium/monsters-submit/
      - title: "Statblock Builder"
        url: /monster-compendium/generator/
```

### Type 4: The Hybrid (Automatic + Manual Submenu)

This is the most complex type and is used for the "Player's Guide." It has **one level of sub-menu** and is a special case.

```
# Example from _config.yml
  - title: "Player's Guide"
    collection: playersguide
    sections:
      - title: "Appendices"
        folder: "playersguide/appendices"
```

**How this works:**

1. `collection: playersguide`: This part is **automatic**. It finds all `layout: doc` pages in the _root_ of the `_playersguide/` folder (e.g., `_playersguide/getting-started.md`) and lists them at the top level.
    
2. `sections:`: This part is **manual**. It adds a sub-menu (a "section") titled "Appendices."
    
3. `folder: "playersguide/appendices"`: This is a _special_ key. It tells the sidebar to find all `layout: doc` pages _inside_ the `_playersguide/appendices/` sub-folder and list them under the "Appendices" sub-menu.
    

**This is the 1-level-submenu limit.** This "Hybrid" model is the only way this site is configured to handle sub-menus.

## Part 4: How-To Guides

### How to Add a Page to "Rules & Roles"

1. Create a new file, e.g., `_rules/my-new-rule.md`.
    
2. Add this Front Matter to the top:
    
    ```
    ---
    layout: doc
    title: "My New Rule"
    order: 50
    ---
    
    My content starts here...
    ```
    
3. Save the file. It will be added to the menu automatically.
    

### How to Add a Page to "Player's Guide (Appendices)"

1. Create a new file in the sub-folder, e.g., `_playersguide/appendices/my-appendix.md`.
    
2. Add this Front Matter to the top:
    
    ```
    ---
    layout: doc
    title: "My New Appendix"
    order: 30
    ---
    
    My content starts here...
    ```
    
3. Save the file. It will be added to the "Appendices" sub-menu automatically.
    

## Part 5: Troubleshooting

### "My page isn't showing up in the menu!"

Check these four things:

1. **Is the file in the right collection folder?** (e.g., `_rules/`)
    
2. **Does it have `layout: doc`?** If it has `layout: statblock` or no layout, it will be ignored by the menu.
    
3. **Is the collection itself listed in `_config.yml`?** If you made a new `_newstuff/` folder, it won't do anything until you add it to `_config.yml`.
    
4. **Does it have an `order:` number?** Missing `order` can cause it to sort to the end or not appear.
    

### "My links are broken!"

- In your `_config.yml`, the `permalink:` setting for each collection controls the URL.
    
- Most are set to `/:path/`, which means `_playersguide/foo.md` becomes `/playersguide/foo/`.
    
- **Exception:** `rules` is set to `/:name.html`. This is an older style, and means `_rules/foo.md` becomes `/rules/foo.html`.