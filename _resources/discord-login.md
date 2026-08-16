---
layout: doc
title: "Appendix: Discord login on this site"
order: 100
---

## Introduction

Certain features of the website uses the Discord Oauth login to enable interactive features intended to improve the user experience for playing on the Hawthorne Server.  This allows features such as the ability to save and load your own content, and allows us to control access to site content that should be restricted to specific roles (e.g. Staff to support site administration, or DMs to access the DM Tool).

It is **very reasonable** that a member may have concern regarding the collection and usage of their personal information.  This page is intended to provide the details of **what information is collected, why it is used, and what is being stored**.


## Overview of the Discord Login

The Discord login function is used to authenticate a user and determine whether they belong to the Hawthorne Guild and hold roles that authorize particular website features.  It uses [Discord's Provided Oauth](https://docs.discord.com/developers/topics/oauth2) to facilitate this login.

## What Information is accessed

Upon pressing the login, the pop-up from Discord will display the following:

> This will allow the developer of Hawthorne
> - Access your username
> - Access your email address
> - Know what servers you're in
> - Read your member info (nickname, avatar, roles, etc...) for servers you belong to

While technically all of this information can be accessed, the implementation follows a **data-minimization approach**: it uses the Discord data required to perform authentication and authorization, and it **does not** access or save the user's information (such as Discord server list or information about their other servers.) 

Specifically this information is accessed upon login:

* Discord ID
* If the user belongs to the Hawthorne Guild

If yes, then the following is saved into Hawthorne's Database
* Your Discord ID
* Your Display Name
* Your Hawthorne roles (e.g. "Adventurer", "Full DM", "Staff")

**Personal information, such as name, email, servers, etc. are not accessed nor stored at any time.**

## Technical Overview

## Website Technical Overview
The Hawthorne Site uses a serverless architecture - __all code is processed on the user's browser__.  It is a static website with javascript hosted on Github using [Github Pages](https://docs.github.com/en/pages).  
 
 So any code that is run, runs on user's computer, and the only time it is run is when a user accesses the parts of the website that needs access.  There is no back-end server that uses the discord login at any other time.  The developer cannot access any information other than what is saved (detailed below) because the authentication happens on the user's browser upon login.
  
## Supabase Database

The only "back-end" component is [Supabase](https://supabase.com/) database.  This database is used to store the interactive parts of the website, such as (the monster compendium, session logs, rework logs).  Supabase uses row-level security by default (and how we've implemented the database) - meaning each row piece of data is checked against the rules of who has access to the information.  

Supabase also provides built-in connectors to the Discord OAuth to handle the authentication checks (so we don't need to build the code from scratch, reducing chance of defects).

## Technical Details of the Login

During login, the application currently:

1. Triggers the Oauth authentication the user through Discord and Supabase.
2. Asks the Discord OAuth to get access to the user's Discord guild list in the user's browser.
3. Checks whether that list contains the Hawthorne Guild ID.
4. Retrieves the user's member record for the Hawthorne Guild.
5. If Yes, saves Hawthorne nickname and role IDs for account linking and authorization.


**All of this is done inside the user's browser.**

### OAuth permissions

The login starts in `assets/js/auth-manager.js` by asking Discord for two permissions:

```js
async login() {
    const cleanUrl = window.location.origin + window.location.pathname;
    await this.client.auth.signInWithOAuth({
        provider: 'discord',
        options: {
            redirectTo: cleanUrl,
            scopes: 'guilds guilds.members.read'
        }
    });
}
```

These scopes have distinct purposes:

- `guilds` permits the Oauth to check the user's guild list and check for the Hawthorne Guild ID.
- `guilds.members.read` permits the code to retrieve the user's own member record, including nickname and roles, for the Hawthorne Guild.

These permissions do not give the website permission to read Discord messages, direct messages, friends, contacts, or channel content.

### Hawthorne Guild membership check

The required guild is identified by a fixed ID:

```js
const REQUIRED_GUILD_ID = [Redacted];
```

The browser calls Discord's current-user guild endpoint:

```js
const r = await fetch('https://discord.com/api/users/@me/guilds', {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller.signal
});

const guilds = await r.json();
return Array.isArray(guilds) &&
    guilds.some(guild => guild.id === REQUIRED_GUILD_ID);
```


Translated into non-technical terms, there is no code that accesses the user's guild list.  It asks the Discord Oauth to get access to the guild list (which is loaded in the user's browser), and then asks the if the user belongs to <code>REQUIRED_GUILD_ID</code> (Hawthorne's Guild ID).

This logic is all done on the user's browser in real-time.  

### Hawthorne member and role lookup

After confirming that the Hawthorne Guild appears in the list, the application requests the user's member record for that guild only:

```js
const r = await fetch(
    `https://discord.com/api/users/@me/guilds/${REQUIRED_GUILD_ID}/member`,
    {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal
    }
);

return await r.json();
```

The member record supplies the guild-specific nickname and role IDs required for authorization. The application selects the display name and passes the relevant values to the account-linking database function:

```js
const discordId = session.user.user_metadata.provider_id;
const displayName = member.nick || session.user.user_metadata.full_name;

const { error } = await this.client.rpc('link_discord_account', {
    arg_discord_id: discordId,
    arg_display_name: displayName,
    arg_roles: member.roles
});
```

The application does not use this endpoint to retrieve another guild, or any personal information about the user.  

## Data intentionally saved

The `link_discord_account` database function maps Hawthorne Discord role IDs to the role names recognized by the website. It then stores or updates the following fields in `discord_users`:

```sql
INSERT INTO public.discord_users (
    discord_id,
    user_id,
    display_name,
    roles,
    last_seen
)
VALUES (
    arg_discord_id,
    new_uuid,
    arg_display_name,
    to_jsonb(mapped_role_names),
    now()
)
```

The saved fields are:

| Field | Purpose |
| --- | --- |
| `discord_id` | Links the authenticated account to the correct Discord identity. |
| `user_id` | Links the Discord identity to the user's Supabase authentication account. |
| `display_name` | The user's the Hawthorne nickname or Discord display name. |
| `roles` | The user's Hawthorne roles. |
| `last_seen` | The last time the user logged into the site (to check if re-login is required). |


## Is Discord Login necessary?

Short answer is no.  This was implemented as a way to make it easier for users such as:

- Allows saving and loading of DM Tool sessions without needing to create a new user ID, login, etc.
- Allows loading of the display name in the session logs

From a technical standpoint, this implementation was chosen because 

1) it allowed the developer to use Supabase' built-in Discord OAuth connector - which is safer than coding from scratch and 
2) to accomodate the serverless architecture which means we can't run code in a back-end server (because it the server doesn't exist)

## What if I am still uncomfortable with the login?

All logged-in features of the site is optional.  If you do not wish to login, it is not mandatory.  
