// assets/js/sidebar.js

(function() {
    try {
        // --- THIS VALUE MUST MATCH YOUR CSS ---
        // .nav-submenu { transition: max-height 0.3s ease; }
        const animationTime = 300; // 300 milliseconds

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
                    // --- THIS IS THE FIX ---
                    // Don't calculate height. Set an "un-animatable" value
                    // to break it out of the animation and let it grow.
                    submenu.style.maxHeight = 'none';
                    
                    // To get the animation back, we wait one frame, then set it
                    // to its real, full scrollHeight (which now includes all children).
                    requestAnimationFrame(() => {
                        submenu.style.maxHeight = submenu.scrollHeight + 'px';
                    });
                } else {
                    // To close, we first set it to its *current* height...
                    submenu.style.maxHeight = submenu.scrollHeight + 'px';
                    // ...then wait one frame, and set it to 0 to animate it closed.
                    requestAnimationFrame(() => {
                        submenu.style.maxHeight = '0';
                    });
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
                const parentSubmenu = this.closest('.nav-submenu');
                
                if (!parentSubmenu) return; // Safety check

                this.setAttribute('aria-expanded', !isExpanded);
                icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(90deg)';

                // --- THIS IS THE SECOND FIX ---
                // The parent's height is already set to its full scrollHeight
                // by the first-level toggle. We only need to
                // open/close the child. We NO LONGER update the parent.

                if (!isExpanded) {
                    // --- OPENING ---
                    // 1. Open the child menu.
                    subsubmenu.style.maxHeight = subsubmenu.scrollHeight + 'px';
                    // 2. We MUST manually update the parent's height *after* opening.
                    setTimeout(() => {
                        parentSubmenu.style.maxHeight = parentSubmenu.scrollHeight + subsubmenu.scrollHeight + 'px';
                    }, 0);

                } else {
                    // --- CLOSING ---
                    // 1. We must get the parent's height *before* closing the child.
                    const parentHeight = parentSubmenu.scrollHeight;
                    const childHeight = subsubmenu.scrollHeight;

                    // 2. Close the child menu.
                    subsubmenu.style.maxHeight = '0';
                    
                    // 3. Manually set the parent's height to the new, smaller value.
                    parentSubmenu.style.maxHeight = (parentHeight - childHeight) + 'px';
                }
            });
        });
        
    } catch (e) {
        // This fails gracefully without breaking the main menu toggle or search
        console.warn("Sidebar submenu JS failed to initialize:", e);
    }
})();