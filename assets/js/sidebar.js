// assets/js/sidebar.js

// This file contains the logic for opening/closing navigation sections and subsections.
// It is wrapped in a try/catch to prevent errors on pages without complex navigation.

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
                    // Open submenu by setting max-height to scroll height
                    subsubmenu.style.maxHeight = subsubmenu.scrollHeight + 'px';
                    
                    // Recalculate parent multiple times during expansion
                    if (parentSubmenu) {
                        // Immediately set to a large value
                        parentSubmenu.style.maxHeight = (parentSubmenu.scrollHeight + subsubmenu.scrollHeight + 100) + 'px';
                        
                        // Then recalculate after animation
                        setTimeout(() => {
                            parentSubmenu.style.maxHeight = parentSubmenu.scrollHeight + 'px';
                        }, 320);
                    }
                } else {
                    // Close submenu by setting max-height to 0
                    subsubmenu.style.maxHeight = '0';
                    
                    // Recalculate parent submenu height after animation completes
                    if (parentSubmenu) {
                        setTimeout(() => {
                            parentSubmenu.style.maxHeight = parentSubmenu.scrollHeight + 'px';
                        }, 320);
                    }
                }
            });
        });
        
    } catch (e) {
        // This fails gracefully without breaking the main menu toggle or search
        console.warn("Sidebar submenu JS failed to initialize:", e);
    }
})();