// assets/js/sidebar.js

/**
 * This is an "Immediately Invoked Function Expression" (IIFE).
 * It wraps the entire script in a function that runs immediately.
 * This is a standard practice to prevent variables from "leaking"
 * into the global scope (i.e., it keeps our variables private).
 * 
 * Location: \assets\js\sidebar.js

 */
(function() {
    /**
     * This 'try...catch' block is a safety net.
     * If any code inside the 'try' block fails (e.g., an element
     * isn't found, a browser doesn't support a feature), the
     * script won't crash the *entire* website. Instead, it will
     * "catch" the error and just log a warning to the console.
     */
    try {
        
        // --- Handle L1 Toggles (First Level) ---
        // e.g., "Player's Guide"
        
        // 1. Find all the L1 toggle buttons on the page.
        const sectionToggles = document.querySelectorAll('.nav-section-toggle');
        
        // 2. Loop through each toggle button and attach a click listener.
        sectionToggles.forEach(toggle => {
            toggle.addEventListener('click', function(e) {
                
                // 3. Stop the browser's default action.
                // If this toggle is an <a> tag, this prevents the
                // browser from trying to follow a link or jump to a hash.
                e.preventDefault();
                
                // 4. Find the related elements.
                // 'this' is the button that was just clicked.
                const navSection = this.parentElement; // The <li> containing the button
                const submenu = navSection.querySelector('.nav-submenu'); // The <ul> to show/hide
                const icon = this.querySelector('.toggle-icon'); // The '+' or '>' icon
                
                // 5. Check the current state.
                // We read the 'aria-expanded' attribute (good for accessibility)
                // to see if the menu is currently open or closed.
                const isExpanded = this.getAttribute('aria-expanded') === 'true';
                
                // 6. Update the state (toggle it).
                this.setAttribute('aria-expanded', !isExpanded);
                
                // 7. Visually update the icon (rotate it).
                icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(90deg)';
                
                // 8. Animate the submenu open or closed.
                // We do this by animating the 'max-height' CSS property.
                if (!isExpanded) {
                    // --- L1 FIX: "Magic Number" Method ---
                    // The menu is closed, so OPEN IT.
                    // We set 'max-height' to a very large number.
                    // The CSS transition will animate it from '0' up to this
                    // number. It will stop when it hits the content's
                    // actual height. '5000px' is a "safe" guess that
                    // the menu will never be taller than this.
                    submenu.style.maxHeight = '5000px'; 
                } else {
                    // The menu is open, so CLOSE IT.
                    // Animate the 'max-height' back down to '0'.
                    submenu.style.maxHeight = '0';
                }
            });
        });
        
        
        // --- Handle L2 Toggles (Second Level) ---
        // e.g., "Appendices"
        
        // 1. Find all the L2 toggle buttons.
        const subsectionToggles = document.querySelectorAll('.nav-subsection-toggle');
        
        // 2. Loop and attach click listeners, just like before.
        subsectionToggles.forEach(toggle => {
            toggle.addEventListener('click', function(e) {
                
                // 3. Stop the default browser action.
                e.preventDefault();
                
                // 4. Find the related L2 elements.
                const navSubsection = this.parentElement;
                const subsubmenu = navSubsection.querySelector('.nav-subsubmenu');
                const icon = this.querySelector('.toggle-icon');
                
                // 5. Check the current state.
                const isExpanded = this.getAttribute('aria-expanded') === 'true';
                
                // 6. Update the state.
                this.setAttribute('aria-expanded', !isExpanded);
                
                // 7. Update the icon.
                icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(90deg)';

                // 8. Animate the submenu open or closed.
                if (!isExpanded) {
                    // --- L2 FIX: "Dynamic Height" Method ---
                    // This is a more complex, but more precise, way to
                    // animate 'max-height' without using a "magic number".
                    // We need to get the *exact* height of the hidden content.
                    
                    // a. Turn off CSS transitions temporarily.
                    // We need to measure the element's full height *instantly*
                    // without any animation delay.
                    subsubmenu.style.transition = 'none'; 
                    
                    // b. Un-hide the element to measure it.
                    // 'maxHeight = 'none'' removes the '0' height and lets
                    // it expand to its full, natural height.
                    subsubmenu.style.maxHeight = 'none';
                    
                    // c. Read the true, full height of the content.
                    // 'scrollHeight' is a property that gives the total
                    // height of an element's content, even if it's hidden.
                    const trueHeight = subsubmenu.scrollHeight;
                    
                    // d. Re-hide the element *immediately*.
                    // We set it back to 0. Since transitions are still off,
                    // this happens instantly, before the browser can
                    // render the "open" state. This prevents a "flicker".
                    subsubmenu.style.maxHeight = '0';
                    
                    // e. Turn CSS transitions back on.
                    // Setting to '' makes it use the default transition
                    // defined in the CSS file.
                    subsubmenu.style.transition = '';
                    
                    // f. Wait for the *next available frame*, then animate.
                    // 'requestAnimationFrame' tells the browser: "Do this
                    // on the next paint cycle." This ensures that the
                    // browser has processed the 'maxHeight = 0' from step (d)
                    // and is ready to animate *from* 0.
                    requestAnimationFrame(() => {
                        // Now we animate 'max-height' from '0' to the
                        // *exact* height we measured.
                        subsubmenu.style.maxHeight = trueHeight + 'px';
                    });
                } else {
                    // The menu is open, so CLOSE IT.
                    // This is simple: just animate 'max-height' to '0'.
                    subsubmenu.style.maxHeight = '0';
                }
            });
        });
        
    } catch (e) {
        // If anything in the 'try' block failed, log the error
        // for debugging, but don't stop the rest of the site's JS.
        console.warn("Sidebar submenu JS failed to initialize:", e);
    }
})();