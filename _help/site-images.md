---
title: Site Images & Artwork
layout: doc
order: 120
exclude_from_search: true
---

# Managing Site Images & Artwork

This guide covers guidelines for adding, sizing, and styling images across the Hawthorne Guild documentation website.

---

## 1. Homepage & Feature Thumbnails

Thumbnails displayed in card grids (such as the homepage or tool landing pages) are stored in `/assets/thumbnails/`:

- **Standard Dimensions:** **300 x 200 px** (3:2 aspect ratio).
- **Format:** Prefer lightweight PNG or WebP files optimized for web.
- **Reference Pattern:**
  ```liquid
  <img src="{{ '/assets/thumbnails/example-thumb.png' | relative_url }}" alt="Feature Title" class="card-thumbnail">
  ```

---

## 2. Page Header Background Images

Documentation pages support custom header artwork via front matter:

```yaml
---
layout: doc
title: "Downtime Activities"
order: 15
background_image: /assets/images/tavern_brawl.jpg
---
```

The background styling is integrated into `_layouts/doc.html`, applying subtle darkening and parchment blending to keep title text legible.

---

## 3. Inserting Images into Markdown Articles

### Internal Repository Images:
Store new images in `/assets/images/` and reference them using site-relative paths:

```markdown
![Trade Confirmation Example](/Guides/assets/images/trade-example.png)
```

### External Images:
```markdown
![Artwork Title](https://example.com/artwork.jpg)
```

---

## 4. Image Credits & Captions

To maintain accreditation for community and sourcebook artists, use the styled `.image-caption` class:

```html
<span class="image-caption">Dragon Magazine #300 — Illustration by Wayne Reynolds</span>
```

With an external portfolio link:

```html
<span class="image-caption"><a href="https://artstation.com/artist" target="_blank" rel="noopener noreferrer">Artwork Title by Artist Name</a></span>
```
