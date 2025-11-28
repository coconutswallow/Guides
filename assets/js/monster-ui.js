const MonsterUI = (function() {
    'use strict';

    // ... existing constants and helper functions (escapeHtml) ...

    function renderAuthHeader(user, isAdmin) {
        const header = document.getElementById('auth-header');
        if (!user) {
            header.innerHTML = `
                <button onclick="MonsterService.login()" class="discord-btn">
                    Login with Discord
                </button>`;
        } else {
            header.innerHTML = `
                <div class="user-badge">
                    <span>Logged in as <strong>${escapeHtml(user.email)}</strong></span>
                    ${isAdmin ? '<span class="admin-tag">ADMIN</span>' : ''}
                    <button onclick="MonsterService.logout()" class="logout-btn">Logout</button>
                </div>`;
        }
    }

    function renderDashboard(myMonsters, reviewQueue, isAdmin) {
        let html = '<div class="dashboard-container">';

        // ADMIN SECTION
        if (isAdmin && reviewQueue.length > 0) {
            html += `
                <section class="review-queue">
                    <h3>👑 Admin Review Queue</h3>
                    ${renderTable(reviewQueue, true)}
                </section>
            `;
        }

        // USER SECTION
        html += `
            <section class="my-monsters">
                <h3>My Homebrew</h3>
                ${myMonsters.length === 0 ? '<p>No monsters created yet.</p>' : renderTable(myMonsters, false)}
            </section>
        </div>`;

        return html;
    }

    function renderTable(monsters, isAdminView) {
        return `
            <table class="monster-table">
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Type/CR</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${monsters.map(m => {
                        // Logic to show "Revision" hierarchy
                        const isRevision = !!m.parent_id;
                        const displayTitle = isRevision 
                            ? `<span class="revision-mark">↳ Revision of:</span> ${escapeHtml(m.title)}`
                            : `<strong>${escapeHtml(m.title)}</strong>`;

                        return `
                        <tr>
                            <td>${displayTitle}</td>
                            <td>${escapeHtml(m.type)} (CR ${m.cr})</td>
                            <td><span class="status-badge status-${m.status}">${m.status}</span></td>
                            <td>
                                <div class="btn-group">
                                    <button class="action-edit" data-id="${m.id}">
                                        ${m.status === 'approved' ? 'Revise' : 'Edit'}
                                    </button>
                                    
                                    ${m.status === 'draft' || m.status === 'rejected' 
                                        ? `<button class="action-submit" data-id="${m.id}">Submit</button> 
                                           <button class="action-delete" data-id="${m.id}">Delete</button>` 
                                        : ''}
                                    
                                    <button class="action-clone" data-id="${m.id}" title="Clone">Clone</button>

                                    ${isAdminView ? `
                                        <button class="action-approve" data-id="${m.id}">✅</button>
                                        <button class="action-reject" data-id="${m.id}">🚫</button>
                                    ` : ''}
                                </div>
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    function updateStatusBadge(status) {
        const container = document.getElementById('status-indicator');
        if(container) {
            container.innerHTML = `Current Status: <span class="status-badge status-${status}">${status}</span>`;
        }
    }
    
    // Add image error handling to your existing form render
    // In renderIdentitySection():
    // <img src="${state.image}" onerror="this.src='/assets/images/placeholder.png'; this.onerror=null;" ... >

    // ... Export functions ...
    return {
        // ... existing exports ...
        renderAuthHeader,
        renderDashboard,
        updateStatusBadge
    };
})();