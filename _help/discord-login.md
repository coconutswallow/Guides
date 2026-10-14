---
layout: doc
title: Discord Login & Roles Guide
description: "Documentation for the Supabase-powered Discord authentication and Role-Based Access Control (RBAC) system."
order: 40
exclude_from_search: false
---

# Discord Authentication & Role-Based Access Control (RBAC)

The Hawthorne Guild website utilizes [Supabase Auth](https://supabase.com/auth) with Discord as the OAuth provider. This allows users to authenticate with their Discord account and enables client-side role verification for staff portals, admin editors, and review tools.

---

## 1. Functional Architecture

- **OAuth Provider:** Discord OAuth2.
- **Session Persistence:** Sessions are automatically managed and persisted in `localStorage` by the Supabase client.
- **Role Verification:** User roles are queried from the `discord_users` table in Supabase.
- **In-Memory Caching:** `assets/js/auth-check.js` caches user roles in a client-side `Map()` to prevent redundant database hits on navigation or re-render.
- **Zero-Backend Node Logic:** The authentication flow is completely client-side. The browser interacts directly with Supabase and Discord.

### Authentication Workflow

1. **Initiation:** The user clicks "Login with Discord" in the site header.
2. **Redirect:** Supabase redirects the browser to Discord's authorization screen.
3. **Verification:** Discord verifies the user and redirects back to the website with an access code.
4. **Session Token:** Supabase exchanges the code for a JWT session token and stores it locally.
5. **UI State Update:** `assets/js/auth-manager.js` detects the active session, updates the header with the user's Discord avatar, and exposes `window.authManager`.

---

## 2. Role-Based Access Control (RBAC)

Roles are stored in the `roles` text array column in the `discord_users` table.

### Recognized Server Roles:
- `Admin`: Full management access across all subsystems.
- `Engineer`: Full technical access to configurations, databases, and editors.
- `Auditor`: Read and advisory audit permissions for Allowed Content rulings.
- `Staff`: General staff portal access.
- `Staff Apprentice`: Entry-level staff portal access.
- `Lore`: Special access to lore and worldbuilding tools.
- `Rules`: Special access to rulebook verification workflows.

---

## 3. Key Files & Components

| Component | Path | Description |
| :--- | :--- | :--- |
| **Auth Widget** | `_includes/auth-header.html` | HTML and CSS include rendered in the site header, showing Login button or user profile avatar. |
| **Auth Manager** | `assets/js/auth-manager.js` | Main controller managing OAuth session lifecycle, login/logout, and UI state. |
| **Role Checker** | `assets/js/auth-check.js` | Exports `checkAccess(userId, requiredRole)` with built-in role caching. |
| **AC Permissions** | `assets/js/allowed-content/ac-auth.js` | Exports `canManageAC(userId)` (Admin/Engineer) and `canAuditAC(userId)` (Admin/Engineer/Auditor). |
| **Supabase Client** | `assets/js/supabaseClient.js` | Centralized Supabase client instance and project credentials. |

---

## 4. How to Gate Pages & Tools

To protect a page or admin panel, implement the `handlePageAuth` pattern:

```html
<div id="access-denied" style="display: none;">Access Denied. Staff credentials required.</div>
<div id="staff-interface" style="display: none;">Staff content here...</div>

<script type="module">
  import { checkAccess } from "{{ '/assets/js/auth-check.js' | relative_url }}";

  window.handlePageAuth = async function (user) {
    if (!user) {
      document.getElementById('access-denied').style.display = 'block';
      return;
    }

    // Check for required roles (supports single role or array)
    const hasPermission = await checkAccess(user.id, ['Staff', 'Staff Apprentice', 'Admin']);

    if (hasPermission) {
      document.getElementById('access-denied').style.display = 'none';
      document.getElementById('staff-interface').style.display = 'block';
    } else {
      document.getElementById('access-denied').style.display = 'block';
    }
  };
</script>
```