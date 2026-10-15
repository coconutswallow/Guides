---
layout: doc
title: "Development & Database Workflow"
order: 90
exclude_from_search: true
---

# Development, Testing & Database Workflow

This guide details the engineering standards, local development setup, automated testing, and database migration rules for the Hawthorne Guild website repository ([HawthorneGuild/Guides](https://github.com/HawthorneGuild/Guides) hosting [hawthorneguild.github.io/Guides](https://hawthorneguild.github.io/Guides)).

---

## 1. Local Development Server

The site is built with Jekyll and served via an ES6 module Node.js HTTP server.

To run the local development server:

```bash
node serve.js
```

- **Port:** Defaults to `http://localhost:4000/Guides/` (or specified via `PORT=4000`).
- **Cache-Control:** `serve.js` enforces `Cache-Control: no-store, no-cache, must-revalidate` headers to ensure browser ES modules reload cleanly during active development.
- **Root Redirection:** Navigating to `/` automatically redirects to the base path `/Guides/`.

---

## 2. Automated Testing Suite

We use [Vitest](https://vitest.dev/) for unit and integration testing of all Allowed Content modules, auth checks, and calculation utilities.

### Running Tests

```bash
# Run the complete test suite
npx vitest run

# Run a specific test suite
npx vitest run test/ac-schema.test.js
```

### Mandates:
- **Zero Regressions:** All test suites (23+ files, 270+ test cases) must pass 100% before committing code.
- **Coverage for New Features:** Any new Allowed Content module, service method, or calculation utility must include corresponding test coverage in `test/`.

---

## 3. Database Migrations & DBSync Mandate

All schema changes, DDL, views, triggers, and seed data updates must follow the unified migration pattern outlined below.

### Unified Migration Directory
- **Single Source of Truth:** All migrations MUST reside directly in `supabase/migrations/`.
- **Do Not Use Secondary Folders:** Never place migrations in `/database/`, subfolders, or ad-hoc directories.

### Naming Conventions
- **SQL Migration:** `supabase/migrations/YYYYMMDD_<description>.sql`  
  *Example:* `20261014_drop_ac_bastions_legacy_tables.sql`
- **Node.js Migration Runner:** `supabase/migrations/run_YYYYMMDD_<description>.js`  
  *Example:* `run_20261014_drop_ac_bastions_legacy_tables.js`

### Execution Pattern

Runners read database credentials from DBSync environment configuration (`DBSync/.env`):

```bash
# 1. Always execute a dry run against DEV first
node supabase/migrations/run_YYYYMMDD_example.js --dry-run

# 2. Apply to DEV environment
node supabase/migrations/run_YYYYMMDD_example.js --execute

# 3. Apply to PRODUCTION environment
node supabase/migrations/run_YYYYMMDD_example.js --execute --prod
```

### Migration Log
All executed migrations must be documented in `supabase/migrations/MIGRATION_LOG.md` with:
- Step number and timestamp
- Target environments (DEV and PROD)
- Tables/views affected
- Verification criteria and status
