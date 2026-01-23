/**
 * heading-links.js
 */
document.addEventListener('DOMContentLoaded', () => {
    // Select headers within the doc-body container
    const headers = document.querySelectorAll('.doc-body h2, .doc-body h3, .doc-body h4');

    headers.forEach(header => {
        if (!header.id) {
            header.id = header.textContent
                .toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/\s+/g, '-');
        }

        const anchor = document.createElement('a');
        anchor.className = 'header-link'; // This class is targetted by our CSS
        anchor.href = '#' + header.id;
        anchor.innerHTML = '🔗'; 
        anchor.ariaHidden = 'true';

        // Click-to-copy logic
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const fullUrl = window.location.origin + window.location.pathname + window.location.search + '#' + header.id;
            
            navigator.clipboard.writeText(fullUrl).then(() => {
                const originalText = anchor.innerHTML;
                anchor.innerHTML = '✅';
                setTimeout(() => { anchor.innerHTML = originalText; }, 2000);
                window.history.pushState(null, null, '#' + header.id);
            });
        });

        header.appendChild(anchor);
    });
});