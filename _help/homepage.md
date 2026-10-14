---
layout: doc
title: "Home Page & Announcements"
order: 32
exclude_from_search: true
---

# Home Page & Announcements Architecture

This guide explains how the main homepage (`index.html`) is structured and how active server announcement banners are managed via Supabase.

---

## 1. Dynamic Server Messages Banner

The top of the homepage features a dynamic server announcement banner:

- **Data Source:** Supabase PostgreSQL table `server_msg`.
- **Query Filter:** Automatically displays messages where `start_date <= today <= end_date` based on the user's local date.
- **Markdown Rendering:** Messages support full Markdown (links, bolding, lists, italics) parsed in the browser via `marked.js`.

### How to Post or Edit an Announcement:
1. Open the Supabase Table Editor for `server_msg`.
2. Insert or edit a row:
   - `message`: Markdown-formatted announcement text.
   - `start_date`: Date when the banner should start displaying (e.g. `2026-10-14`).
   - `end_date`: Date when the banner should automatically expire and hide.
3. Multiple active announcements will automatically render separated by subtle dividers.

---

## 2. Homepage Grid Structure

Below the hero banner and active announcements, `index.html` organizes content into three primary sections:

1. **Getting Started:** Quick orientation cards for new guild members.
2. **For Players:** Player's Guide, Allowed Content, Arcana, Player Tools, and Downtime.
3. **For Dungeon Masters:** DM's Guide, Monster Compendium, Field Guide, and DM Tools.

### Card HTML Pattern:

```html
<div class="card-grid">
  <div class="feature-card">
    <div class="card-image-wrapper">
      <img src="{{ '/assets/thumbnails/ac-thumb.png' | relative_url }}" alt="Allowed Content" class="card-thumbnail">
    </div>
    <div class="card-content">
      <h4>Allowed Content</h4>
      <p>Browse approved races, classes, backgrounds, feats, spells, and items.</p>
      <a href="{{ '/allowed-content/' | relative_url }}" class="card-button">Explore Catalog</a>
    </div>
  </div>
</div>
```

- **Thumbnails:** Stored in `/assets/thumbnails/` at standard **300x200px** dimensions.
