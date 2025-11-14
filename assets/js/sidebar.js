// assets/js/sidebar.js

(function() {
    try {
        // Handle section toggles (first level submenus)
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
                    // Open menu by setting max-height to its full scroll height
                    submenu.style.maxHeight = submenu.scrollHeight + 'px';
                } else {
                    // Close menu by setting max-height to 0
                    submenu.style.maxHeight = '0';
                }
            });
        });
        
        // Handle subsection toggles (second level submenus)
        const subsectionToggles = document.querySelectorAll('.nav-subsection-toggle');
        subsectionToggles.forEach(toggle => {
            toggle.addEventListener('click', function(e) {
                e.preventDefault();
                const navSubsection = this.parentElement;
                const subsubmenu = navSubsection.querySelector('.nav-subsubmenu');
                const icon = this.querySelector('.toggle-icon');
                const isExpanded = this.getAttribute('aria-expanded') === 'true';
                const parentSubmenu = this.closest('.nav-submenu');
                
                this.setAttribute('aria-expanded', !isExpanded);
                icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(90deg)';
                
                // Get the height of the child menu *before* changing it
                const childHeight = subsubmenu.scrollHeight;

                if (!isExpanded) {
                    // Open child submenu
                    subsubmenu.style.maxHeight = childHeight + 'px';
                    
                    // Update parent's max-height by ADDING the child's height
                    if (parentSubmenu) {
                        parentSubmenu.style.maxHeight = (parentSubmenu.scrollHeight + childHeight) + 'px';
                    }
                } else {
                    // Close child submenu
                    subsubmenu.style.maxHeight = '0';
                    
                    // Update parent's max-height by SUBTRACTING the child's height
                    if (parentSubmenu) {
                         // We set the height to the parent's current height *minus* the child's height
                        parentSubmenu.style.maxHeight = (parentSubmenu.scrollHeight - childHeight) + 'px';
                    }
                }
            });
        });
        
    } catch (e) {
        // This fails gracefully without breaking the main menu toggle or search
        console.warn("Sidebar submenu JS failed to initialize:", e);
    }
})();