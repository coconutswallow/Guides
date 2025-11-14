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
                    // 1. Turn off animation so we can measure without delay.
                    submenu.style.transition = 'none'; 
                    
                    // 2. Set to 'none' to unlock its full potential height.
                    submenu.style.maxHeight = 'none';
                    
                    // 3. Read the *true* height (which now includes all hidden children).
                    const trueHeight = submenu.scrollHeight;
                    
                    // 4. Reset to 0 *before* the browser can render the change.
                    submenu.style.maxHeight = '0';
                    
                    // 5. Turn animation back on.
                    submenu.style.transition = ''; // Uses the default from style.css
                    
                    // 6. Wait one frame, then animate to the *true, correct* height.
                    requestAnimationFrame(() => {
                        submenu.style.maxHeight = trueHeight + 'px';
                    });
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
                // const parentSubmenu = this.closest('.nav-submenu'); // No longer needed
                
                this.setAttribute('aria-expanded', !isExpanded);
                icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(90deg)';

                // --- THIS IS THE L2 FIX ---
                // Because the L1 toggle (above) now opens to the *full* height,
                // the L2 toggle only needs to open and close itself.
                // No more parent calculations, no more race conditions.

                if (!isExpanded) {
                    // Open the child menu. That's it.
                    subsubmenu.style.maxHeight = subsubmenu.scrollHeight + 'px';
                } else {
                    // Close the child menu. That's it.
                    subsubmenu.style.maxHeight = '0';
                }
            });
        });
        
    } catch (e) {
        // This fails gracefully without breaking the main menu toggle or search
        console.warn("Sidebar submenu JS failed to initialize:", e);
    }
})();