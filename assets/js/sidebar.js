// Handle subsection toggles (second level submenus)
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
            // Open submenu by setting max-height to scroll height
            subsubmenu.style.maxHeight = subsubmenu.scrollHeight + 'px';
        } else {
            // Close submenu by setting max-height to 0
            subsubmenu.style.maxHeight = '0';
        }
        
        // NEW: Recalculate parent submenu height
        const parentSubmenu = this.closest('.nav-submenu');
        if (parentSubmenu) {
            parentSubmenu.style.maxHeight = parentSubmenu.scrollHeight + 'px';
        }
    });
});