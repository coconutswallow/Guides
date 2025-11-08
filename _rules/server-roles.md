---
layout: doc
title: "Server Roles and Hierarchy"
order: 2
---

## Server Roles and Hierarchy

All registered members of the server have the <span class="role-adventurer">Adventurer</span> role. Adventurers that have played at least one game on the server can register as a DM and obtain the <span class="role-trial-dm">Trial DM</span> role. Trial DMs that have run several games on the server can apply for and obtain the <span class="role-full-dm">Full DM</span> role, granting additional DMing privileges on the server. In addition to players and DMs are members of <span class="role-staff">Staff</span> that help oversee and manage different aspects of the server.

### Staff Teams

There are six Staff teams:

* <span class="role-auditor">**Auditors**</span> and <span class="role-apprentice">**Auditor Apprentices**</span> oversee character reworks and help ensure server logs are accurate.

* <span class="role-lore">**Lore Consultants**</span> and <span class="role-auditor-apprentice">**Lore Apprentices**</span> handle all matters about setting and server specific lore and assist players and DMs in being consistent with both.

* <span class="role-pr">**Player Relations**</span> oversees player/DM registration as well as handling server disputes and incident reports, including disciplinary action if necessary.

* <span class="role-rules">**Rule Architects**</span> and <span class="role-rules-apprentice">**Rule Apprentices**</span> handles all matters about official and server specific rules and mechanics, as well as allowed content on the server.

* <span class="role-engineer">**Engineers**</span> and <span class=".role-engineer-apprentice">**Engineers Apprentices**</span> maintain the server's bots and backend and sites.

<span class="role-admin">**Admins**</span> oversee the running and management of the server in collaboration with the other Staff teams.

---

## Role Hierarchy Diagram

<div class="image-text-wrapper">
  <img src="https://img.photouploads.com/file/PhotoUploads-com/jv5M.png" alt="Server Role Hierarchy" class="hierarchy-image">
  <div class="hierarchy-explanation">
    <h3>Understanding the Hierarchy</h3>
    <p>The diagram shows the organizational structure of the Hawthorne Guild server, with different levels of roles and responsibilities.</p>
    
    <p><strong>At the top</strong> are the Admins who oversee all server operations and work with the various staff teams.</p>
    
    <p><strong>Staff teams</strong> include specialized roles like Auditors, Lore Consultants, Player Relations, Rule Architects, and Engineers. Each team has full members and apprentices who are learning the role.</p>
    
    <p><strong>The DM track</strong> shows progression from Trial DM to Full DM, with increasing responsibilities and privileges as DMs gain experience running games.</p>
    
    <p><strong>Adventurers</strong> form the foundation of the server - all registered players who participate in games and roleplay.</p>
  </div>
</div>

<style>
/* Role color styling */
.role-adventurer {
  color: #999999;
  font-weight: 600;
}

.role-trial-dm {
  color: #25c059;
  font-weight: 600;
}

.role-full-dm {
  color: #1a7939;
  font-weight: 600;
}

.role-auditor {
  color: #ff9900;
  font-weight: 600;
}

.role-auditor-apprentice {
  color: #d98843;
  font-weight: 600;
}

.role-lore {
  color: #1f628e;
  font-weight: 600;
}

.role-lore-apprentice {
  color: #5296d5;
  font-weight: 600;
}

.role-pr {
  color: #ffd966;
  font-weight: 600;
  background-color: #333333; /* Dark gray background */
  padding: 2px 4px; /* Optional: Adds a little space around the text and background */
  border-radius: 3px; /* Optional: Gives the background slightly rounded corners */
}

.role-rules {
  color: #f975f2;
  font-weight: 600;
  background-color: #333333; /* Dark gray background */
  padding: 2px 4px; /* Optional: Adds a little space around the text and background */
  border-radius: 3px; /* Optional: Gives the background slightly rounded corners */
}

.role-rules-apprentice {
  color: #b179b8;
  font-weight: 600;
}

.role-engineer {
  color: #1abc9c;
  font-weight: 700;
  text-transform: uppercase;
}

.role-engineer-apprentice {
  color: #63a493;
  font-weight: 700;
  text-transform: uppercase;
}
.role-admins {
  color: #1c1c1c;
  font-weight: 800;
  text-transform: uppercase;
}


/* Image with text wrap */
.image-text-wrapper {
  display: flex;
  gap: 2em;
  margin: 2em 0;
  align-items: flex-start;
}

.hierarchy-image {
  max-width: 400px;
  width: 100%;
  height: auto;
  border: 2px solid var(--color-border);
  flex-shrink: 0;
}

.hierarchy-explanation {
  flex: 1;
}

.hierarchy-explanation h3 {
  margin-top: 0;
  color: var(--color-primary);
  font-family: var(--font-header);
}

.hierarchy-explanation p {
  margin-bottom: 1em;
  line-height: 1.6;
}

/* Responsive design */
@media (max-width: 768px) {
  .image-text-wrapper {
    flex-direction: column;
  }
  
  .hierarchy-image {
    max-width: 100%;
  }
}
</style>