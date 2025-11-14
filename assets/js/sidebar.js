// assets/js/sidebar.js

(function() {
    // This value MUST match the transition time in your style.css
    // .nav-submenu { transition: max-height 0.3s ease; }
    const animationTime = 300; // 300 milliseconds

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
                    submenu.style.maxHeight = submenu.scrollHeight + 'px';
                } else {
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
                    
                    // 2. We MUST wait two frames.
                    // Frame 1: Browser registers child is open.
                    // Frame 2: Browser updates parent's scrollHeight.
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            // 3. NOW we can safely read the parent's new height.
                            parentSubmenu.style.maxHeight = parentSubmenu.scrollHeight + 'px';
                        });
                    });

                } else {
                    // --- CLOSING ---
                    // 1. Close the child menu
                    subsubmenu.style.maxHeight = '0';
                    
                    // 2. We MUST wait for the child's animation to finish
                    //    before recalculating the parent's height.
                    setTimeout(() => {
                        parentSubmenu.style.maxHeight = parentSubmenu.scrollHeight + 'px';
                    }, animationTime); // Wait for the animation to complete
                }
            });
        });
        
    } catch (e) {
        // This fails gracefully without breaking the main menu toggle or search
        console.warn("Sidebar submenu JS failed to initialize:", e);
    }
})();