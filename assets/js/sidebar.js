// assets/js/sidebar.js

(function() {
    try {
        // Handle section toggles (first level submenus, e.g., "Player's Guide")
        const sectionToggles = document.querySelectorAll('.nav-section-toggle');
        sectionToggles.forEach(toggle => {
            toggle.addEventListener('click', function(e) {
                e.preventDefault();
                const navSection = this.parentElement;
                const submenu = navSection.querySelector('.nav-submenu');
                const icon = this.querySelector('.toggle-icon');
                const isExpanded = this.getAttribute('aria-expanded') === 'true';
                
                this.setAttribute('aria-expanded', !isExpanded);
                icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(90deg)';
                
                if (!isExpanded) {
                    // --- THIS IS THE L1 FIX ---
                    // Don't calculate. Set to a very large, fixed number.
                    // This guarantees it's tall enough for all hidden children.
                    submenu.style.maxHeight = '5000px'; 
                } else {
                    // To close, just animate to 0.
                    submenu.style.maxHeight = '0';
                }
            });
        });
        
        // Handle subsection toggles (second level submenus, e.g., "Appendices")
        const subsectionToggles = document.querySelectorAll('.nav-subsection-toggle');
        subsectionToggles.forEach(toggle => {
            toggle.addEventListener('click', function(e) {
                e.preventDefault();
                const navSubsection = this.parentElement;
                const subsubmenu = navSubsection.querySelector('.nav-subsubmenu');
                const icon = this.querySelector('.toggle-icon');
                const isExpanded = this.getAttribute('aria-expanded') === 'true';
                
                this.setAttribute('aria-expanded', !isExpanded);
                icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(90deg)';

                // --- THIS IS THE L2 FIX ---
                // The L1 parent is now *guaranteed* to be tall enough.
                // This toggle only needs to open and close itself.
                // No more complex parent/child calculations.

                if (!isExpanded) {
                    // Open the child menu.
                    subsubmenu.style.maxHeight = subsubmenu.scrollHeight + 'px';
                } else {
                    // Close the child menu.
                    subsubmenu.style.maxHeight = '0';
                }
            });
        });
        
    } catch (e) {
        // This fails gracefully without breaking the main menu toggle or search
        console.warn("Sidebar submenu JS failed to initialize:", e);
    }
})();