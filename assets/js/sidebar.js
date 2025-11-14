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
                
                if (!parentSubmenu) return; // Safety check

                this.setAttribute('aria-expanded', !isExpanded);
                icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(90deg)';

                if (!isExpanded) {
                    // --- OPENING ---
                    // 1. Open the child menu
                    subsubmenu.style.maxHeight = subsubmenu.scrollHeight + 'px';
                    
                    // 2. Wait for the browser's next frame...
                    requestAnimationFrame(() => {
                        // 3. NOW read the parent's NEW scrollHeight (which includes the child)
                        // and animate the parent to that new, larger height.
                        parentSubmenu.style.maxHeight = parentSubmenu.scrollHeight + 'px';
                    });
                } else {
                    // --- CLOSING ---
                    // 1. Close the child menu
                    subsubmenu.style.maxHeight = '0';
                    
                    // 2. Wait for the browser's next frame...
                    requestAnimationFrame(() => {
                        // 3. NOW read the parent's NEW scrollHeight (which no longer includes the child)
                        // and animate the parent to that new, smaller height.
                        parentSubmenu.style.maxHeight = parentSubmenu.scrollHeight + 'px';
                    });
                }
            });
        });
        
    } catch (e) {
        // This fails gracefully without breaking the main menu toggle or search
        console.warn("Sidebar submenu JS failed to initialize:", e);
    }
})();