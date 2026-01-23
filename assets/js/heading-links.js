/**
 * heading-links.js
 * Injects link icons and copies the URL to clipboard on click
 */
document.addEventListener('DOMContentLoaded', () => {
    // Select headers within the doc-body container
    const headers = document.querySelectorAll('.doc-body h2, .doc-body h3, .doc-body h4');

    headers.forEach(header => {
        // Ensure the header has a valid ID
        if (!header.id) {
            header.id = header.textContent
                .toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/\s+/g, '-');
        }

        // Create the anchor element
        const anchor = document.createElement('a');
        anchor.className = 'header-link';
        anchor.href = '#' + header.id;
        anchor.innerHTML = '🔗'; 
        anchor.style.cursor = 'pointer';
        anchor.ariaHidden = 'true';

        // Add Click-to-Copy functionality
        anchor.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent the default browser jump
            
            // Construct the full URL
            const fullUrl = window.location.origin + window.location.pathname + window.location.search + '#' + header.id;
            
            // Copy to clipboard
            navigator.clipboard.writeText(fullUrl).then(() => {
                // Optional: Visual feedback
                const originalText = anchor.innerHTML;
                anchor.innerHTML = '✅';
                setTimeout(() => { anchor.innerHTML = originalText; }, 2000);
                
                // Still update the URL bar without jumping
                window.history.pushState(null, null, '#' + header.id);
            });
        });

        header.appendChild(anchor);
    });
});