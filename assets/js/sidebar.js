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

                if (!isExpanded) {
                    // --- OPENING ---
                    // 1. Open child menu
                    subsubmenu.style.maxHeight = subsubmenu.scrollHeight + 'px';
                    
                    if (parentSubmenu) {
                        // 2. Wait for the browser's next frame, THEN...
                        requestAnimationFrame(() => {
                            // 3. Read the parent's NEW scrollHeight (which now includes the open child)
                            // and set its maxHeight to that value.
                            parentSubmenu.style.maxHeight = parentSubmenu.scrollHeight + 'px';
                        });
                    }
                } else {
                    // --- CLOSING ---
                    if (parentSubmenu) {
                         // 1. Get the heights *before* closing
                         const parentHeight = parentSubmenu.scrollHeight;
                         const childHeight = subsubmenu.scrollHeight;
                         
                         // 2. Set the parent to the new, smaller, fixed height
                         // This animates it *down* smoothly
                         parentSubmenu.style.maxHeight = (parentHeight - childHeight) + 'px';
                    }
                    // 3. Close the child *at the same time*
                    subsubmenu.style.maxHeight = '0';
                }
            });
        });
        
    } catch (e) {
        // This fails gracefully without breaking the main menu toggle or search
        console.warn("Sidebar submenu JS failed to initialize:", e);
    }
})();