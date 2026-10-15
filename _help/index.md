---
title: Website Documentation Hub
layout: doc
permalink: /help/
order: 1
exclude_from_search: true
staff_only: true
---

## ⚙️ Core Architecture & Design System

- **[Website Technical Architecture & Infrastructure]({{ '/help/website-architecture/' | relative_url }})**  
  Documents the high-level of how the website is constructed, including the integration between the test and the production servers.
  
- **[Collections & Navigation Setup]({{ '/help/collections/' | relative_url }})**  
  How Jekyll (the tool in GitHub) collections in `_config.yml` pair with `_data/navigation.yml` to build collapsible sidebar navigation menus.

- **[Color System & Parchment Themes]({{ '/help/colors/' | relative_url }})**  
  The two-layer design token model (raw palette tokens vs. semantic theme variables) powering both Light and Dark modes.

- **[Discord Authentication & Role-Based Access Control]({{ '/help/discord-login/' | relative_url }})**  
  Supabase Auth integration with Discord OAuth, `discord_users` role lookups, client caching, and page gating.
  
- **[Home Page & Server Announcements]({{ '/help/homepage/' | relative_url }})**  
  Homepage grid organization and the dynamic date-filtered server announcements banner powered by Supabase `server_msg`.

- **[FAQ Architecture & Maintenance]({{ '/help/FAQ-engineering/' | relative_url }})**  
  Alpine.js reactive search and filter engine coupled with build-time `_data/faqs.yml` data.

---

## 🛡️ Subsystems & Staff Applications

Deep-dive documentation for database-driven single page applications:

- **[Allowed Content Architecture & Data Model]({{ '/help/allowed-content/' | relative_url }})**  
  Oveview of the Allowed Content - and the database tables that now power it

---

## 📝 For Content Authors & Editors

- **[Site Editor (DecapBridge CMS)]({{ '/help/site-editor/' | relative_url }})**  
  Browser-based visual editor for creating and updating static guides without touching git repositories.

- **[Markdown Author's Guide]({{ '/help/markdown/' | relative_url }})**  
  Typography standards, alert callout syntax, tables, and embedding guidelines for Hawthorne documentation.

- **[Site Images & Artwork]({{ '/help/site-images/' | relative_url }})**  
  Image placement, compression guidelines, thumbnail standards, and asset paths.

- **[Site Map & Page Ordering]({{ '/help/sitemap/' | relative_url }})**  
  Complete listing of all collections and pages to verify sorting orders and URLs.

