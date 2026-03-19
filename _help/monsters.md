---
layout: doc
title: Monster-Compendium
order: 34
exclude_from_search: true
---

**Monster Compendium Engineering Notes**

The monster compendium has been re-engineered from a static markdown generator to a dynamic Single Page Application (SPA) powered by Supabase. This transition allows for real-time data fetching, dynamic stat calculation, and a more robust filtering system.

## Functional Design

- **Database Driven:** Monsters are no longer stored as static flat files. They are queried dynamically from the Supabase `monsters` table.
- **Dynamic Calculation:** Derived statistics (such as Proficiency Bonus, XP, and Ability Modifiers) are calculated on the fly by the client based on the monster's Challenge Rating (CR) and Ability Scores.
- **SPA Architecture:** The compendium operates as a lightweight SPA using hash-based routing to switch between the Library view and the Monster Detail view without reloading the page.

### Workflow

1. **Storage:** Monster data, features, and creator information are stored in the relational database.
2. **Access:** The frontend queries the database via `monster-service.js`.
3. **Rendering:**
    * The **Library** fetches a summary list for the grid view.
    * The **Detail View** fetches the full monster record + related features (`monster_features` table) to build the stat block.
4. **Submission:** *A tool to create and submit user-generated monsters directly to the database is currently in development.*

## Engineering Notes

The architecture separates data fetching, routing, and view rendering into distinct ES6 modules.

### Key Folders & Files

* `/assets/js/monster/`
    * `monster-app.js`: The application entry point and Router. Handles URL hash changes to toggle between views.
    * `monster-service.js`: The Data Layer. Handles all asynchronous calls to the Supabase client.
* `/assets/js/monster/views/`
    * `monster-library.js`: View Controller for the main list. Handles filtering (Species, Usage, CR, Size) and grid rendering.
    * `monster-detail.js`: View Controller for the single monster page. Handles the responsive layout, D&D stat math, and Markdown parsing for descriptions.

### Script Reference

| Script | Description |
| :--- | :--- |
| `monster-app.js` | **Router:** Listens for window hash changes (e.g., `#/:slug`) and initializes the appropriate view handler. |
| `monster-service.js` | **Service:** Exports `getMonsters()` and `getMonsterBySlug()`. Joins data from `monsters`, `monster_features`, and `discord_users`. |
| `monster-library.js` | **View:** Renders the searchable grid. Contains logic for client-side filtering of the monster dataset. |
| `monster-detail.js` | **View:** Renders the full statblock. Calculates derived stats (e.g., `calculatePB`, `calculateXP`) and injects HTML into the container. |

### Dependencies

* **Supabase Client:** Used for backend database interaction.
* **Marked.js:** Used to parse markdown content within monster descriptions and feature text (Traits, Actions, etc.).

### Styling Notes

* **Scoped Styles:** `monster-detail.js` injects view-specific CSS styles dynamically to handle complex statblock layouts and mobile responsiveness (e.g., switching from grid to flex-column on small screens).
* **Layout:** The view supports a "Page Wide" class toggle to maximize screen real estate when viewing large stat blocks.