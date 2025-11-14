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
                    // Open menu by setting max-height to scroll height
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
                    // 1. Open sub-submenu
                    subsubmenu.style.maxHeight = subsubmenu.scrollHeight + 'px';
                    
                    // 2. Wait for next frame, then recalculate and set the parent's max-height 
                    //    to include the newly opened sub-submenu's height.
                    if (parentSubmenu) {
                        requestAnimationFrame(() => {
                            parentSubmenu.style.maxHeight = parentSubmenu.scrollHeight + 'px';
                        });
                    }
                } else {
                    // Close submenu
                    subsubmenu.style.maxHeight = '0';
                    
                    // Recalculate parent to fit remaining content
                    if (parentSubmenu) {
                        // Force reflow then set to current scroll height
                        requestAnimationFrame(() => {
                            parentSubmenu.style.maxHeight = parentSubmenu.scrollHeight + 'px';
                        });
                    }
                }
            });
        });
        
    } catch (e) {
        // This fails gracefully without breaking the main menu toggle or search
        console.warn("Sidebar submenu JS failed to initialize:", e);
    }
})();