---
layout: doc
title: "FAQ Architecture & Maintenance"
order: 60
exclude_from_search: true
---

# FAQ Architecture & Maintenance

This document covers the technical architecture, data model, and update process for the guild's [Frequently Asked Questions (FAQ)](/Guides/faq.html) page.

---

## 1. Technical Overview

The FAQ page is a **hybrid static-reactive** interface:
- **Build Time:** Jekyll iterates over `_data/faqs.yml` at build time to render all questions and categories directly into the HTML DOM for instant loading and SEO discoverability.
- **Run Time:** [Alpine.js](https://alpinejs.dev/) provides client-side instant search and category filtering with zero server round-trips.

---

## 2. File Structure

| File | Purpose |
| :--- | :--- |
| `faq.html` | Core template containing Alpine.js state (`searchTerm`), category nav, and Question cards. |
| `_data/faqs.yml` | The single source of truth containing all FAQ questions, answers, and category tags. |
| `assets/css/faq.css` | Specialized styling for the two-column sidebar layout, search bar, and question cards. |

---

## 3. Data Structure (`_data/faqs.yml`)

The YAML file contains an `entries` array where each item has three properties:

```yaml
entries:
  - category: "Character Creation"
    question: "What rulesets are allowed in Hawthorne?"
    answer: "Both the 2014 and 2024 core rulesets are permitted. Check the <a href='/Guides/allowed-content/'>Allowed Content</a> catalog for specific sourcebook rulings."

  - category: "Downtime"
    question: "How do I log crafting progress?"
    answer: "Crafting downtime must be logged in the designated discord channel according to the Guild Downtime rules."
```

### Supported Categories & Sorting
In `faq.html`, categories are ordered according to the configured priority:
1. `General`
2. `Character Creation`
3. `MAL`
4. `Games`
5. `Downtime`
6. `DM`
7. `Rules`
8. `Support`

---

## 4. Editing & Updating Questions

1. Open `_data/faqs.yml`.
2. Add a new entry to the `entries` list or modify an existing item.
3. In the `answer` field, HTML anchor tags (`<a href="...">`) and standard HTML markup are fully supported.
4. Commit changes to git and push; Jekyll will rebuild the page automatically.
