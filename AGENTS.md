# Hawthorne Guild — Agent Instructions (Guides)

These rules apply to every AI coding or verification agent working in the `Coconut/Guides` repository.

## 1. Database Migrations & Schema Changes

**CRITICAL MANDATE: Unified Migration Directory**

- **Single Migrations Directory:** All database changes, DDL, schema migrations, RLS policies, views, triggers, and seed updates MUST be stored in `supabase/migrations/`.
- **No Secondary Directories:** Do NOT create or store migrations in `/database/migrations/`, subdirectories (e.g. `AC_migrations/`), or any alternate folder. All migration scripts must live directly within `supabase/migrations/`.
- **Naming Convention:** Migration files must follow the timestamp format:
  `YYYYMMDD_<description>.sql`
  Example: `20261005_ac_backgrounds_normalization.sql`.
- **Migration Runner Pattern:** Migration execution and verification scripts (Node.js runners utilizing the `pg` client and `/workspace/git/Coconut/DBSync/.env`) must also reside in `supabase/migrations/` (e.g., `run_20261005_ac_backgrounds_normalization.js`).
- **Environment Targeting:**
  - `DEV`: Target database configured via `SOURCE_DB_URL` in `DBSync/.env`.
  - `PRODUCTION`: Target database configured via `TARGET_DB_URL` / `PROD_DB_URL` in `DBSync/.env` (invoked with `--execute --prod`).
  - Always execute `--dry-run` first before applying migrations with `--execute`. Apply changes to both DEV and PROD environments when completing database tasks.

---

## 2. Architecture & Design Standards

### Frontend Architecture
- **Jekyll & Static Assets:** The repository is a Jekyll static documentation site hosted on GitHub Pages (`/Guides/` base path).
- **Allowed Content (AC) Modules:** Located in `assets/js/allowed-content/`.
  - `ac-service.js`: Central data access layer interfacing with Supabase tables (`public.ac_*`).
  - Feature modules (e.g., `ac-sources.js`, `ac-races.js`, `ac-classes.js`, `ac-backgrounds.js`): Responsible for rendering, filtering, responsive table/card layouts, modal workflows, and staff admin operations.
  - `ac-main.js`: Main entry point and tab controller.
  - `ac-auth.js`: Staff authentication and role checking (Admin, Auditor, Engineer).
- **Styling Aesthetic:** Follows Hawthorne Guild's parchment aesthetic (Alegreya Sans, Marcellus SC headers, burgundy/gold accents, subtle double borders) with full dark mode support.
- **Local Development Server:** `node serve.js` serves `_site/` on port 4000. `serve.js` includes `Cache-Control: no-store, no-cache` headers to prevent stale browser caching of ES modules.

### Testing & Verification
- **Test Suite:** Powered by Vitest (`package.json` -> `npm test` or `npx vitest run`).
- **Coverage Requirement:** Any new or modified Allowed Content feature module or service method must include unit test coverage in `test/` (e.g., `test/ac-backgrounds.test.js`).
- **Zero Regressions:** Run `npx vitest run` before completing any task to verify that all test suites pass 100%.

---

## 3. Context & Documentation Workflow

- **Task Tracking:** Active tasks and Excel source definitions are located in `.context/current-tasks/`.
- **Changelogs:** Update `.context/changelog.md` and `_resources/changelog.md` as appropriate when completing significant user-facing or architectural changes.
- **Data Parity:** When migrating spreadsheet data into Supabase, verify exact 1:1 row counts, primary key constraints (prefer `UUID` over custom keys), ruleset categorization ('2014' vs '2024'), category lookups ('Official' vs 'Homebrew'), and markdown links in notes/advice.
