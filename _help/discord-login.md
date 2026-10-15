---
layout: doc
title: Discord Login & Roles Guide
description: "Documentation for the Supabase-powered Discord authentication and Role-Based Access Control (RBAC) system."
order: 40
exclude_from_search: false
---

# Discord Authentication & Role-Based Access Control (RBAC)

The Hawthorne Guild website lets you sign in using your regular Discord account. This connects your Discord server roles (such as Staff, DM, Lore, or Admin) directly to the website so you can access staff portals, review tools, and content management systems without needing a separate username or password.

---

## 1. How It Works (Functional Architecture)

Instead of creating a new website account, you log in with your existing **Discord** account.

### In Simple Terms:
- **One Login:** You use the same Discord account you already use for Hawthorne games.
- **Server Membership Required:** To log in, you must be a member of the official Hawthorne Guild Discord server.
- **Automatic Roles:** The website automatically detects your Discord server roles (such as *Adventurer*, *DM*, *Staff*, or *Admin*). If your roles change in Discord, the site updates your website permissions automatically.
- **Remembers Your Place:** When you click login, Discord returns you to the exact page and search filters you were looking at.
- **Stays Signed In:** You stay logged in as you browse between pages, so you don't need to re-login every time you click a link.

---

### What Happens When You Log In

<div class="auth-flowchart-container" style="margin: 2rem 0; padding: 1.5rem 1rem; background: var(--color-bg-light); border: 1px solid var(--color-border); border-radius: var(--border-radius); box-shadow: var(--shadow-sm);">
  <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.75rem;">
    <div style="flex: 1 1 140px; min-width: 130px; max-width: 180px; padding: 1rem 0.75rem; background: var(--color-bg-page); border: 2px solid var(--color-border); border-radius: 6px; text-align: center; box-shadow: var(--shadow-xs);">
      <div style="font-size: 1.5rem; margin-bottom: 0.35rem;">🖱️</div>
      <div style="font-weight: 700; color: var(--color-primary); font-size: 0.95rem; font-family: var(--font-header);">1. Click Login</div>
      <div style="font-size: 0.8rem; color: var(--color-text-secondary); margin-top: 0.25rem;">Header button</div>
    </div>

    <span style="color: var(--palette-brand-highlight); font-size: 1.4rem; font-weight: bold;">➔</span>

    <div style="flex: 1 1 140px; min-width: 130px; max-width: 180px; padding: 1rem 0.75rem; background: var(--color-bg-page); border: 2px solid var(--color-border); border-radius: 6px; text-align: center; box-shadow: var(--shadow-xs);">
      <div style="font-size: 1.5rem; margin-bottom: 0.35rem;">💬</div>
      <div style="font-weight: 700; color: var(--color-primary); font-size: 0.95rem; font-family: var(--font-header);">2. Authorize</div>
      <div style="font-size: 0.8rem; color: var(--color-text-secondary); margin-top: 0.25rem;">Discord prompt</div>
    </div>

    <span style="color: var(--palette-brand-highlight); font-size: 1.4rem; font-weight: bold;">➔</span>

    <div style="flex: 1 1 140px; min-width: 130px; max-width: 180px; padding: 1rem 0.75rem; background: var(--color-bg-page); border: 2px solid var(--color-border); border-radius: 6px; text-align: center; box-shadow: var(--shadow-xs);">
      <div style="font-size: 1.5rem; margin-bottom: 0.35rem;">🛡️</div>
      <div style="font-weight: 700; color: var(--color-primary); font-size: 0.95rem; font-family: var(--font-header);">3. Check Guild</div>
      <div style="font-size: 0.8rem; color: var(--color-text-secondary); margin-top: 0.25rem;">Member check</div>
    </div>

    <span style="color: var(--palette-brand-highlight); font-size: 1.4rem; font-weight: bold;">➔</span>

    <div style="flex: 1 1 140px; min-width: 130px; max-width: 180px; padding: 1rem 0.75rem; background: var(--color-bg-page); border: 2px solid var(--color-border); border-radius: 6px; text-align: center; box-shadow: var(--shadow-xs);">
      <div style="font-size: 1.5rem; margin-bottom: 0.35rem;">📜</div>
      <div style="font-weight: 700; color: var(--color-primary); font-size: 0.95rem; font-family: var(--font-header);">4. Sync Roles</div>
      <div style="font-size: 0.8rem; color: var(--color-text-secondary); margin-top: 0.25rem;">Staff, DM, Lore, etc.</div>
    </div>

    <span style="color: var(--palette-brand-highlight); font-size: 1.4rem; font-weight: bold;">➔</span>

    <div style="flex: 1 1 140px; min-width: 130px; max-width: 180px; padding: 1rem 0.75rem; background: var(--color-primary); border: 2px solid var(--palette-brand-highlight); border-radius: 6px; text-align: center; box-shadow: var(--shadow-sm); color: var(--color-btn-text);">
      <div style="font-size: 1.5rem; margin-bottom: 0.35rem;">✨</div>
      <div style="font-weight: 700; color: var(--color-btn-text); font-size: 0.95rem; font-family: var(--font-header);">5. Unlocked!</div>
      <div style="font-size: 0.8rem; color: var(--color-btn-text); opacity: 0.9; margin-top: 0.25rem;">Tools accessible</div>
    </div>
  </div>
</div>

1. **Click Login:** Click the **"Login with Discord"** button in the top navigation bar.
2. **Approve on Discord:** Discord displays a standard authorization screen asking if you want to connect your account to the Hawthorne Guild website.
3. **Check Server Membership:** The system checks that you are in the Hawthorne Guild server. If not, login is denied.
4. **Fetch Your Roles:** The site matches your Discord server roles to website permissions (e.g. recognizing you as a Staff member, DM, or Auditor).
5. **Unlock Features:** You return to your page with your Discord avatar displayed, and any staff tools matching your roles are unlocked.

> [!TIP]
> **Role Updates:** If you receive a new role in Discord, the site checks for updates at least once a day. You can also sign out and sign back in at any time to instantly refresh your roles.

<details>
<summary><strong>Technical Architecture Details (For Developers & Engineers)</strong></summary>

- **OAuth Provider:** Discord OAuth2 via Supabase (`scopes: 'guilds guilds.members.read'`).
- **Guild Verification:** Verifies membership in Guild ID `308324031478890497`.
- **Role Translation:** Discord snowflake role IDs are mapped to friendly role names via `public.discord_role_map` using the PostgreSQL stored procedure `link_discord_account`.
- **Session Freshness:** `assets/js/auth-manager.js` checks `last_seen` in `public.discord_users`. If older than 24 hours, it triggers a background Discord sync.
- **Caching:** Roles are cached in-memory via `assets/js/auth-check.js` (`roleCache` Map) to minimize database queries during page navigation.
- **Session Persistence:** Sessions are persisted in browser `localStorage` by the Supabase client.
</details>

---

## 2. Role-Based Access Control (RBAC)

Roles are stored in the `roles` column (`text[]`) in the `public.discord_users` table.

### Key Roles

| Role | Typical Permissions & Access |
| :--- | :--- |
| **Admin** / **Engineer** | Full administrative access to Staff Portal, Allowed Content management, schema visualizer, monster compendium, and RLS policies. |
| **Auditor** | Read & audit access across Allowed Content, staff verification tools, and logs. |
| **Staff** / **Staff Apprentice** | Access to Staff Index, Map Editor, Review Tools, and operational moderation panels. |
| **Lore** / **Rules** | Content review and approval permissions for Monster Library and Compendium. |
| **Monster Admin** | Direct review, approval, editing, and publishing rights for monster submissions. |
| **Trial DM** / **Full DM** | Access to DM Tooling, Session Manager, and Monster Editor drafting tools. |
| **Adventurer** | Default verified Hawthorne Guild Discord member role. |

### Role Mapping via `link_discord_account` RPC

When `auth-manager.js` synchronizes user data, it invokes the PostgreSQL RPC function:

```javascript
await supabase.rpc('link_discord_account', {
    arg_discord_id: discordId,
    arg_display_name: displayName,
    arg_roles: member.roles // Array of Discord Snowflake IDs
});
```

Inside PostgreSQL, `link_discord_account` joins the `arg_roles` against `public.discord_role_map`:

```sql
SELECT coalesce(array_agg(role_name), '{}')
INTO mapped_role_names
FROM public.discord_role_map
WHERE role_id = ANY(arg_roles);
```

This translates numeric role IDs (e.g. `'343393950079385610'`) directly into clean names (e.g. `'Adventurer'`, `'Staff'`), storing the human-readable names into `discord_users.roles`.

---

## 3. Key Files & Components

| Component | Path | Description |
| :--- | :--- | :--- |
| **Auth Widget** | `_includes/auth-header.html` | HTML/CSS include rendered in the site header. Displays Discord Login button or user profile avatar, display name, and sign-out button. Automatically dispatches `window.handlePageAuth(user)`. |
| **Auth Manager** | `assets/js/auth-manager.js` | Core controller managing OAuth session lifecycle, 24h `last_seen` freshness, guild membership validation, Discord sync, URL preservation, and exposing `window.authManager`. |
| **Role Checker** | `assets/js/auth-check.js` | Exports `checkAccess(userId, requiredRole)` with in-memory `roleCache` (`Map()`). Supports a single role string or an array of acceptable roles. |
| **AC Permissions** | `assets/js/allowed-content/ac-auth.js` | Centralized Allowed Content auth module. Exports `detectAdminSession()` (`['Admin', 'Engineer']`), `getAdminMode()`, `setAdminMode()`, and renders the `renderAdminBar()`. |
| **Supabase Client** | `assets/js/supabaseClient.js` | Centralized Supabase client instance and project credentials. |
| **DB Sync Procedure** | `supabase/link-discord-accounts` | PostgreSQL stored procedure (`public.link_discord_account`) that maps Discord snowflake IDs to role names using `discord_role_map` and updates `discord_users`. |

---

## 4. How to Gate Pages & Tools

To protect a page, admin panel, or staff tool, follow this three-part implementation pattern:

1. **Include the Auth Header**: Place `{% raw %}{% include auth-header.html %}{% endraw %}` in the page header so visitors can log in, log out, and see their profile avatar.
2. **Define UI State Containers**: Provide an access-denied container (`#access-denied`) and an authenticated content container (`#staff-interface`).
3. **Register `window.handlePageAuth`**: In an ES module script, import `checkAccess` and define the callback to verify roles and toggle display states.

### Complete Gating Template

{% raw %}
```html
<!-- 1. Header with Discord Login / Profile Widget -->
<header class="staff-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 2px solid var(--color-border);">
  <h1 style="margin: 0; color: var(--color-primary); font-family: var(--font-header);">Staff Portal</h1>
  {% include auth-header.html %}
</header>

<!-- 2. Access Denied State (shown to unauthenticated users or users missing required roles) -->
<div id="access-denied" class="access-denied" style="display: none; max-width: 600px; margin: 3rem auto; padding: 2.5rem 2rem; background: var(--color-bg-light); border: 1px solid var(--color-border); border-radius: var(--border-radius); text-align: center; box-shadow: var(--shadow-md);">
  <h2 style="color: var(--color-primary); font-family: var(--font-header); font-size: 2rem; margin-bottom: 1rem;">Staff Access Required</h2>
  <p style="font-size: 1.05rem; color: var(--color-text); line-height: 1.6; margin-bottom: 1.5rem;">
    This page requires authenticated staff privileges. Please log in with a Discord account holding a Hawthorne Staff role to continue.
  </p>
  <p style="font-size: 0.9em; color: var(--color-text-secondary); margin-bottom: 0;">
    For more information, please see the <a href="{{ '/resources/discord-login/' | relative_url }}">Discord Login Explanation</a>.
  </p>
</div>

<!-- 3. Authenticated Application Interface -->
<div id="staff-interface" style="display: none;">
  <main class="staff-content">
    <h2>Staff Control Panel</h2>
    <!-- Staff controls, tables, and management tools go here -->
    <div id="staff-app-root"></div>
  </main>
</div>

<!-- 4. Authorization Module Script -->
<script type="module">
  import { checkAccess } from "{{ '/assets/js/auth-check.js' | relative_url }}";

  const ui = {
    accessDenied: document.getElementById('access-denied'),
    staffInterface: document.getElementById('staff-interface')
  };

  /**
   * Authentication callback dispatched by auth-header.html / authManager
   * @param {Object|null} user - Supabase user object or null when logged out
   */
  window.handlePageAuth = async function (user) {
    if (!user) {
      if (ui.accessDenied) ui.accessDenied.style.display = 'block';
      if (ui.staffInterface) ui.staffInterface.style.display = 'none';
      return;
    }

    // Check for required roles (supports single role string or array of allowed roles)
    const hasPermission = await checkAccess(user.id, [
      'Staff',
      'Staff Apprentice',
      'Admin',
      'Engineer'
    ]);

    if (!hasPermission) {
      if (ui.accessDenied) ui.accessDenied.style.display = 'block';
      if (ui.staffInterface) ui.staffInterface.style.display = 'none';
      return;
    }

    // Access granted: reveal interface and initialize application
    if (ui.accessDenied) ui.accessDenied.style.display = 'none';
    if (ui.staffInterface) ui.staffInterface.style.display = 'block';

    initStaffApp(user);
  };

  // Prevent race conditions: check if AuthManager resolved before this script evaluated
  if (window.authManager && window.authManager.user !== undefined) {
    window.handlePageAuth(window.authManager.user);
  }

  function initStaffApp(user) {
    // Mount components, initialize controllers, or fetch data
    console.log(`Staff interface initialized for ${user.email || user.id}`);
  }
</script>
```
{% endraw %}

---

## 5. Security & Row Level Security (RLS)

> [!IMPORTANT]
> **Client-Side Gating vs Database Security**
> Client-side checks (`handlePageAuth` and `checkAccess`) control **UI visibility only** (e.g. hiding admin navigation or edit modals from unauthorized visitors).
> 
> Real security is enforced server-side by PostgreSQL Row Level Security (RLS) policies on Supabase tables. Even if a visitor bypasses client-side JavaScript, unauthorized database mutations (`INSERT`, `UPDATE`, `DELETE`) will fail with `HTTP 403 / permission denied`.
