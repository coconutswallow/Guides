// assets/js/sidebar.js

(function() {
    // This value MUST match the transition time in your style.css
    // .nav-submenu { transition: max-height 0.3s ease; }
    const animationTime = 300; // 300 milliseconds

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
                    // 1. Temporarily set to 'none' to measure the TRUE full height
                    //    (including any open children from a previous state).
                    submenu.style.transition = 'none'; // Turn off animation
                    submenu.style.maxHeight = 'none';
                    const trueHeight = submenu.scrollHeight;
                    
                    // 2. Reset to 0 *immediately* (before the browser can render)
                    submenu.style.maxHeight = '0';
                    submenu.style.transition = ''; // Turn animation back on
                    
                    // 3. Wait one frame, then animate to the true, correct height.
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
                const parentSubmenu = this.closest('.nav-submenu');
                
                if (!parentSubmenu) return; // Safety check

                this.setAttribute('aria-expanded', !isExpanded);
                icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(90deg)';

                if (!isExpanded) {
                    // --- OPENING L2 ---
                    // 1. Open the child menu.
                    subsubmenu.style.maxHeight = subsubmenu.scrollHeight + 'px';
                    
                    // 2. Wait for the browser to register the new child height...
                    requestAnimationFrame(() => {
                        // 3. ...then tell the L1 parent to update its height.
                        parentSubmenu.style.maxHeight = parentSubmenu.scrollHeight + 'px';
                    });

                } else {
                    // --- CLOSING L2 ---
                    // 1. Close the child menu.
                    subsubmenu.style.maxHeight = '0';
                    
                    // 2. We MUST wait for the child's animation to finish...
                    setTimeout(() => {
                        // 3. ...then tell the L1 parent to update its height.
                        parentSubmenu.style.maxHeight = parentSubmenu.scrollHeight + 'px';
                    },