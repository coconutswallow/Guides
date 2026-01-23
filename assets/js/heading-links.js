/**
 * heading-links.js
 * Generates IDs and injects hoverable link icons
 */
document.addEventListener('DOMContentLoaded', () => {
    const headers = document.querySelectorAll('.doc-body h2, .doc-body h3, .doc-body h4');

    headers.forEach(header => {
        // 1. Ensure the header has an ID
        if (!header.id) {
            header.id = header.textContent
                .toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/\s+/g, '-');
        }

        // 2. Create the anchor element
        const anchor = document.createElement('a');
        anchor.className = 'header-link';
        anchor.href = '#' + header.id;
        anchor.innerHTML = '🔗'; // You can use an SVG or an icon class here
        anchor.ariaHidden = 'true';

        // 3. Append the anchor to the header
        header.appendChild(anchor);
    });
});