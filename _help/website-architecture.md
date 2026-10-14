---
layout: doc
title: "Website Technical Architecture"
order: 10
exclude_from_search: false
---


## 1. System Architecture Overview

The Hawthorne Guild website utilizes a static-first [Jamstack architecture](https://jamstack.org/what-is-jamstack/) with Jekyll and GitHub Pages, coupled with client-side reactive JavaScript modules connecting to a cloud-hosted Supabase PostgreSQL backend.  In simple terms:

* **Static pages** are saved as vanilla markdown files. Jekyll automatically applies the .CSS styling to turn them into HTML pages.  This is automatically done.  Easiest is to update via the Content Editor (DecapBridge)
* **Dynamic pages** are pages that have interactive functionality.  Typically it is a combination of javascript (that control the functionality), and a database (supabase) to store the data.  Examples are the DM Tool, Allowed Content, Monster Compendium.
* **2-tier architecture**  We have 2 copies of the website and 2 copies of the database.  One is the test server, and one is the production server (what is accessible by members).  Functionality is first shipped to the test server, and once testing is done, pushed to production.

<figure style="margin: 2rem 0; text-align: center;">
  <img src="{{ '/assets/images/architecture/website-arch-page-1.png' | relative_url }}" alt="Hawthorne Website Technical Architecture" style="max-width: 100%; height: auto; border: 1px solid var(--color-border); border-radius: var(--border-radius); box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
  <figcaption style="font-size: 0.9em; color: var(--color-text-muted); margin-top: 0.5rem;">Figure 1: Full System Architecture Diagram</figcaption>
</figure>

## 2. GitHub Pages & Two-Environment Strategy

The site foundation runs on GitHub Pages powered by Jekyll. One characteristic of this setup is GitHub Pages builds directly the pages immediately upon code commits (every time you commit the code, the website is re-built).  To prevent many commits in Prod, and allow beta-testing of functionality to select users before rolling out to the general members, we are using a two-repository strategy (basically a test copy, and a production copy).

<figure style="margin: 2rem 0; text-align: center;">
  <img src="{{ '/assets/images/architecture/website-arch-page-2.png' | relative_url }}" alt="GitHub Pages and Two-Environment Strategy" style="max-width: 100%; height: auto; border: 1px solid var(--color-border); border-radius: var(--border-radius); box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
  <figcaption style="font-size: 0.9em; color: var(--color-text-muted); margin-top: 0.5rem;">Figure 2: Two-Environment Strategy & Release Process</figcaption>
</figure>

- **Development / Test Environment:**
  - **Repository:** `https://github.com/coconutswallow/Guides`
  - **Live URL:** `https://coconutswallow.github.io/Guides/`
  - **Purpose:** Active development, staging feature branches, and beta testing new applications before public release.
- **Production Environment:**
  - **Repository:** `https://github.com/hawthorneguild/Guides`
  - **Live URL:** `https://hawthorneguild.github.io/Guides/`
  - **Purpose:** Public-facing production guild documentation and player tools.

## 4. Database Sync

### Types of Data:

There are 2 types of data and how they are treated:

* Reference data (data created by engineers and admin): This is data like the Allowed Content.  This data needs to be sync'ed between the two databases.  
* User data:  This is data created by members (e.g. homebrew monsters).  We do not sync this data.


### Database Migration Pipeline
To keep the two databases structurally identical:

1. **Migration Scripts:** All database schema changes, reference data updates are saved as timestamped SQL files in `supabase/migrations/` (e.g. `20261014_drop_ac_bastions_legacy_tables.sql`).
2. When we are ready to migrate the database changes in production, we just execute those SQL scripts in production.
3. I have a database record **system.last_database_update** that keeps track of the last time migration scripts are executed so I can keep track of what needs to be run. 


### Automatic Website Switching
The frontend website data layer (`assets/js/supabaseClient.js`) inspects `window.location.hostname` to automatically route requests:

| Environment | Hostname | Supabase Database Target |
| :--- | :--- | :--- |
| **TEST** | `coconutswallow.github.io` | `CoconutDB` (`kcbvryvmcbfpsibxthhn.supabase.co`) |
| **PRODUCTION** | `hawthorneguild.github.io` | `HawthorneDB` (`iepqxczcyvrxcbyeiscc.supabase.co`) |

i.e. same code, if it's run by the test server, it points to CoconutDB, if that same code is run in production, it points to Hawthorne Production database.