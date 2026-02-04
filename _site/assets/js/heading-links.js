/**
 * heading-links.js
 */
document.addEventListener('DOMContentLoaded', () => {
    const headers = document.querySelectorAll('.doc-body h2, .doc-body h3, .doc-body h4');

    headers.forEach(header => {
        if (!header.id) {
            header.id = header.textContent
                .toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/\s+/g, '-');
        }

        const anchor = document.createElement('a');
        anchor.className = 'header-link';
        anchor.href = '#' + header.id;
        anchor.setAttribute('aria-hidden', 'true');
        
        // Use a span for finer control over the icon size/scaling
        anchor.innerHTML = '<span class="header-link-icon">🔗</span>';

        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const fullUrl = window.location.origin + window.location.pathname + window.location.search + '#' + header.id;
            
            navigator.clipboard.writeText(fullUrl).then(() => {
                const icon = anchor.querySelector('.header-link-icon');
                const originalText = icon.innerHTML;
                icon.innerHTML = '✅';
                setTimeout(() => { icon.innerHTML = originalText; }, 2000);
                window.history.pushState(null, null, '#' + header.id);
            });
        });

        header.appendChild(anchor);
    });
});