

<script>
    window.currentUser = null;
    
    // Configuration: The role required to see the Save/Load buttons
    const REQUIRED_ROLES = ["Staff", "Staff Apprentice"];    //Replace with roles to check

    // This function is called by auth-header.html when auth state changes
    window.handlePageAuth = function(user, profile) {
        window.currentUser = user;

        const instructionText = document.getElementById('instruction-text');
        const loggedOutGroup = document.getElementById('logged-out-controls');
        const loggedInGroup = document.getElementById('logged-in-controls');
        const authErrorGroup = document.getElementById('auth-error-msg');
        
        // Reset all displays first
        loggedOutGroup.style.display = 'none';
        loggedInGroup.style.display = 'none';
        authErrorGroup.style.display = 'none';

        if (user) {
            // User is logged in. Check Roles.
            const userRoles = (profile && profile.roles) ? profile.roles : [];
            const hasAccess = userRoles.includes(REQUIRED_ROLE);

            if (instructionText) instructionText.style.display = 'none';

            if (hasAccess) {
                // CASE 1: Logged in AND has 'Staff' role
                loggedInGroup.style.display = 'flex';
                if(window.fetchReworks) window.fetchReworks();
            } else {
                // CASE 2: Logged in BUT missing role
                authErrorGroup.style.display = 'flex';
            }

        } else {
            // CASE 3: Logged Out
            loggedOutGroup.style.display = 'flex';
            if (instructionText) instructionText.style.display = 'block';
        }
    }
</script>