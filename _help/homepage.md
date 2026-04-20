---
layout: doc
title: "Home Page"
order: 32
exclude_from_search: true
---

**Site Documentation: Editing the Homepage**

This guide explains how to make simple edits to the main homepage (`index.html`) of the guild website.

## Layout Overview

The homepage uses a responsive grid designed to highlight key entry points for players and DMs.

- **Structure:** The page is split into 3 major sections: **Getting Started**, **For Players**, and **For Dungeon Masters**.
- **Grid:** Each section contains a series of cards. Currently, the site is optimized for a **3x4 grid (12 cards total)** to balance the layout.

## How the Homepage is Structured

The homepage is built in a semantic pattern:

1.  **Sections (`<div class="home-section">`)**: Containers for major topics. Each has an `<h3>` title.
2.  **Card Grids (`<div class="card-grid">`)**: The wrapper for the individual cards.
3.  **Cards (`<div class="feature-card">`)**: Each card contains a title, a thumbnail image, a brief description, and a button.

## How to Make Common Edits

To edit a card, find the corresponding block in `index.html`.

### Example Card Block:

```html
<div class="feature-card">
  <h4>Player's Guide</h4>
  <a href="{{ 'playersguide/index/' | relative_url }}">
    <img src="{{ '/assets/thumbnails/players-300.png' | relative_url }}" alt="Player's Guide" class="card-thumbnail">
  </a>
  <p>Everything you need to know to create characters and play on the Hawthorne D&D 5e Server</p>
  <a href="{{ 'playersguide/index/' | relative_url }}" class="card-button">Read Guide</a>
</div>
```

### Key Elements to Edit:
- `<h4></h4>`: The title displayed at the top of the card.
- `src="{{ '/assets/thumbnails/...' | relative_url }}"`: The thumbnail image. For best results, use **300x200px** images.
- `<p></p>`: The short descriptive blurb.
- `href="{{ '...' | relative_url }}"`: The link location. Ensure this matches your directory path (e.g., `lore/` or `playersguide/index/`).

> [!IMPORTANT]
> When adding or removing cards, try to maintain a multiple of 3 or 4 per row to keep the grid looking balanced on desktop screens.
