---
title: Navigation Setup
layout: doc
order: 20
exclude_from_search: true
---

**Site Documentation: Managing Collections & Navigation**

This guide explains the technical backbone of the site: how content is organized using Jekyll (the built-in CMS in GithHub Pages) **Collections** and how those collections automatically build the sidebar **Navigation** menu.

## Part 1: What is a "Collection"?

In simple terms, a **Collection** is a special folder (starting with an `_`) that Jekyll is told to pay attention to. Whatever is set as a collection is indexed by Jekyll.  For our purposes, the general setup is a collection is more or less a "Book" or a Guide with a bunch of pages.

- **Standard Folder:** Jekyll ignores a normal folder (e.g. /assets)
    
- **Collection Folder (`_rules`, `_playersguide`, etc.):** Jekyll will read _every file_ inside, process it, and make it available for the site to use (e.g., to create pages or list in a menu).  It will convert markdown files (.md) and apply CSS and re-write them as formatted HTML files.

## Setting up Collections

There are 2 places to setup the collections `collections:` is in 
- `_config.yml` in the root directory:  this setups which collections are processed, as well as adding them to the side-navigation
- `/admin/config.yml` in the admin folder:  this sets up which collections are available for editing in the admin console. 

In general, you don't need to touch these config files unless we add a new top level item (e.g. add a new guide), or add a submenu (e.g. appendices section).  Adding new pages automatically get added to the site nav.

in _config.yml, there are 2 sections:

### Collections Setup:

This section tells Jekyll where are the collections to process.  The permalink tells the site the URL to create.  
```
collections:
  rules:
    output: true
    permalink: /rules/:path/
  playersguide:
    output: true
    permalink: /playersguide/:path/
```

### Navigation setup

The navigation section tells the site which collections to show in the side-nav, and in which order.  You only need to define the "folders" - individual pages are automatically
indexed and added.  Note:  I've only built this to handle 1-level of subfolders (e.g. playersguide/appendix/ is okay but not playersguide/appendix/appendix_A_pages/)

```
navigation:
  - title: "Home"
    url: "/"
    
  - title: "Rules & Roles"
    collection: rules
      
  - title: "Player's Guide"
    collection: playersguide
    sections:
      - title: "Appendices"
        folder: "playersguide/appendices"
```

In some cases, the side nav can have direct links instead of pulling from a collection, e.g.


```
# Monster Compendium we want to link directly to HTML files
  - title: "Monster Compendium"
    sections:
      - title: "Monster Compendium"
        url: /monster-compendium/
      - title: "Submit A Monster"
        url: /monster-compendium/monsters-submit/
      - title: "Statblock Builder"
        url: /monster-compendium/generator/
```

### Documents and Front Matter

As I said, individual markdown files in Jekyll are automatically processed, converted to HTML, and indexed into the navigation.  In order to do so, there is some
meta-data (front matter) that is read at the top of each file to let it know how to use it:

    ---
    layout: doc
    title: "My New Rule"
    order: 50
    background_image: /assets/images/mybackground.jpg
    ---

|Front Matter|	|Description|
|:----------------|	|:--------------------------------------------------|
|layout|	|tells Jekyll which layout to use:  in almost all cases, it's "doc" for document.  There is also "statblock" for the monster statblocks but those are handled in a custom fashion|
|title|	|Name of the page.  You can have a different page name than file name|
|order|	|Sets the order in which a document shows up in its section.  So it's generally good practice to have pages set with gaps in the order number, so if you want to add a new page, you don't need to re-order every single page after it.|
|background_image|	|Sets a custom background image on the page.  Can be an internal link (like the example) or a https: external link|

**The only optional front-matter is the background image (which you can have and just leave blank).  All other front matter are mandatory for a page to show up**
