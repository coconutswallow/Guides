---
layout: doc
title: Discord Login Guide
description: "Documentation for the Supabase-powered Discord authentication system."
order: 40
exclude_from_search: false
---

**Discord Auth Engineering Notes**

The site authentication system has been implemented using [Supabase Auth](https://supabase.com/auth) with Discord as the OAuth provider. This allows users to log in using their existing Discord credentials, enabling the site to recognize guild members and eventually gate content or features based on roles.

## Functional Design

- **Provider:** Authentication is handled strictly via Discord OAuth2.
- **Session Management:** Sessions are persisted via Supabase, meaning users stay logged in even after refreshing the page.
- **UI Integration:** The login widget is a self-contained "include" that can be placed on any page. It automatically toggles between a "Login" button and a "User Profile" panel based on the current session state.
- **Zero-Backend Logic:** The entire flow is client-side. The browser talks directly to Supabase, which talks to Discord, and then returns the user to the site with a session token.

### Workflow

1.  **Initiation:** User clicks "Login with Discord".
2.  **Redirect:** The site redirects the user to Discord's authorization page.
3.  **Authentication:** Discord verifies the user and sends them back to the site with an access code.
4.  **Verification:** Supabase exchanges the code for a Session Token.
5.  **State Update:** The `auth-manager.js` script detects the new session and updates the UI to show the user's avatar and username.

## Engineering Notes

The architecture uses ES6 Modules to maintain a clean separation between configuration, logic, and UI.

### Key Files & Components

| File | Location | Description |
| :--- | :--- | :--- |
| **Auth Header** | `_includes/auth-header.html` | **The UI Widget.** Contains the HTML for the button and profile card, plus CSS for styling. It uses a "polling" script to wait for the manager to load. |
| **Auth Manager** | `/assets/js/auth-manager.js` | **The Controller.** An ES6 Module that handles the logic. It initializes the session, handles login/logout clicks, and updates the UI. It attaches itself to `window.authManager` so the HTML can access it. |
| **Supabase Client** | `/assets/js/supabaseClient.js` | **The Config.** A single source of truth for API Keys and the Supabase Client instance. It is imported by the Manager. |
| **Default Layout** | `_layouts/default.html` | **The Loader.** Loads the Auth Manager script as a `type="module"` so that it can use imports. |

### Integration Guide

To add the login widget to a new page, simply add the following Liquid tag:

```liquid
{% include auth-header.html %}