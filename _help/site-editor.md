---
title: Site Editor (DecapBridge CMS)
layout: doc
permalink: /help/site-editor/
order: 110
exclude_from_search: true
---

## Content Editing with DecapBridge CMS

To enable staff and authors to add or edit static documentation pages without editing raw git files or requiring command-line tools, a web-based Content Management System (DecapBridge) is integrated into the site.

---

### 1. Accessing the Web Editor

1. Navigate to the web editor interface at:  
   **[`/admin/`](/Guides/admin/)** or directly via [https://hawthorneguild.github.io/Guides/admin](https://hawthorneguild.github.io/Guides/admin)
2. DecapBridge administrative settings and user invites are managed at [https://decapbridge.com/auth/login](https://decapbridge.com/auth/login).
3. **Permissions:** Access is restricted to authorized editors. To request an invitation, reach out to an **Admin** or **Engineer** in the Hawthorne Guild Discord.

---

### 2. Editor Workflow

Once logged in, the editor displays the site's collections on the left (e.g. *Rules & Roles*, *Player's Guide*, *DM's Guide*, *Arcana*, *Lore*):

1. **Selecting a Page:** Click on any page title in the list to open the editor.
2. **Creating a Page:** Click the **New [Collection Name]** button in the upper right.
3. **Front Matter:**
   - **Title:** The display name of the article.
   - **Order:** Numerical sequence determining menu order (e.g., `10, 20, 30...`). Leave gaps between numbers to allow inserting future pages easily.
   - **Layout:** Standard pages use `layout: doc`.
   - **Background Image:** Optional header background image path.
4. **Rich Text vs. Markdown:**
   - Toggle between **Rich Text** (visual formatting toolbar) and **Markdown** mode.
   - In Rich Text mode, use the `+` button to upload images into the media library or insert URLs.
5. **Publishing:** Click **Publish** to save changes. The changes are committed to GitHub and deployed automatically to the live site within 1–3 minutes.
