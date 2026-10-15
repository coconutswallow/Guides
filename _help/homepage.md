---
layout: doc
title: "Home Page & Announcements"
order: 50
exclude_from_search: true
---

# Home Page & Announcements Architecture

This guide explains how the main homepage (`index.html`) is structured and how staff can easily post and manage active server announcement banners.

---

## 1. Server Announcements Banner

Right beneath the welcome message on the homepage, there is a prominent announcement banner. Staff can use this to broadcast important updates to all visitors—such as upcoming community workshops, major ruleset changes, seasonal events, or scheduled server maintenance.

### How It Works 
- **Automatic Appearance:** The banner only appears when there is an active announcement scheduled for today. If there are no current notices, the banner stays completely hidden so the homepage remains clean and uncluttered.
- **Set It and Forget It:** Every announcement has a **Start Date** and an **End Date**. The banner automatically starts showing on the start date and quietly disappears once the end date passes—no manual cleanup or code edits needed.
- **Rich Text & Links:** Announcements support standard Markdown formatting. You can make text **bold**, add *italics*, create bullet lists, or include clickable links directly to guides, Discord channels, or signup forms.
- **Multiple Notices:** If more than one announcement is active on the same day, the banner neatly stacks them with subtle divider lines between each notice.

---

### How to Post, Edit, or Remove an Announcement

You do not need to touch any website code or re-deploy the site to publish an announcement.

1. **Open the Database:** Navigate to the `server_msg` table in the Supabase Table Editor.
2. **Add or Edit a Notice:** Click **Insert row** (or double-click an existing entry to edit):
   - **`message`:** Enter your announcement text using regular Markdown (e.g. `🎉 **Bastion Workshop** this Saturday! Join us in voice chat or [read the Bastion Guide](/Guides/bastions/).`).
   - **`start_date`:** The day the notice should begin appearing (formatted as `YYYY-MM-DD`, e.g. `2026-10-15`).
   - **`end_date`:** The final day the notice should appear. The day after this date, the banner automatically stops displaying.
3. **To Remove Early:** If an event is cancelled or an announcement is no longer relevant, simply delete the row or set its `end_date` to yesterday's date.

> [!TIP]
> **Time Zones:** The website checks announcement dates against each visitor's **local calendar date**. An announcement scheduled for `2026-10-15` will appear on October 15th in the visitor's own time zone.

<details>
<summary><strong>Technical Details (For Developers & Engineers)</strong></summary>

- **Database Table:** `public.server_msg` (columns: `message` text, `start_date` date, `end_date` date).
- **Client Script:** Embedded in `index.html` within the `loadActiveMessages()` function.
- **Query Filter:** `supabase.from('server_msg').select('message').lte('start_date', localToday).gte('end_date', localToday)`.
- **Markdown Parser:** Parsed client-side using `marked.js` (`cdn.jsdelivr.net/npm/marked/marked.min.js`).
- **DOM Container:** `#server-msg-container`, hidden by default (`display: none`) and styled with `var(--color-bg-light)` and `border-left: 5px solid var(--color-primary)`.
</details>

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
