/**
 * heading-links.js
 * Handles smooth scrolling and anchor link behavior
 */

document.addEventListener('DOMContentLoaded', () => {
    // Select all headers within the doc-body
    const headers = document.querySelectorAll('.doc-body h2, .doc-body h3, .doc-body h4');

    headers.forEach(header => {
        // Ensure header has an ID for linking
        if (!header.id) {
            header.id = header.textContent
                .toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/\s+/g, '-');
        }

        // Add a click listener if you want to update the URL when clicking the heading
        header.style.cursor = 'pointer';
        header.addEventListener('click', () => {
            const url = new URL(window.location);
            url.hash = header.id;
            window.history.pushState({}, '', url);
            
            header.scrollIntoView({
                behavior: 'smooth'
            });
        });
    });
});