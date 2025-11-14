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
                    // --- L1 FIX ---
                    // Set to a very large, fixed number.
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

                if (!isExpanded) {
                    // --- THIS IS THE L2 FIX ---
                    // 1. Turn off animation so we can measure without delay.
                    subsubmenu.style.transition = 'none'; 
                    
                    // 2. Set to 'none' to un-hide it and find its full height.
                    subsubmenu.style.maxHeight = 'none';
                    
                    // 3. Read the *true* height.
                    const trueHeight = subsubmenu.scrollHeight;
                    
                    // 4. Reset to 0 *before* the browser can render.
                    subsubmenu.style.maxHeight = '0';
                    
                    // 5. Turn animation back on.
                    subsubmenu.style.transition = ''; // Uses the default from style.css
                    
                    // 6. Wait one frame, then animate to the *true, correct* height.
                    requestAnimationFrame(() => {
                        subsubmenu.style.maxHeight = trueHeight + 'px';
                    });
                } else {
                    // To close, just animate to 0.
                    subsubmenu.style.maxHeight = '0';
                }
            });
        });
        
    } catch (e) {
        // This fails gracefully...
        console.warn("Sidebar submenu JS failed to initialize:", e);
    }
})();