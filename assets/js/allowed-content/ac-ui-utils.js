/**
 * ================================================================
 * AC UI UTILITIES
 * ================================================================
 * 
 * Reusable UI components and helpers for the Allowed Content UI.
 * Handles modals, tooltips, and general DOM manipulation.
 */

/**
 * Opens the detail modal with the provided HTML content.
 * 
 * @param {string} contentHtml - HTML to inject into the modal
 */
export function openModal(contentHtml) {
    const modal = document.getElementById('ac-detail-modal');
    const body = document.getElementById('ac-detail-body');
    if (!modal || !body) return;

    body.innerHTML = contentHtml;
    modal.showModal();
}

/**
 * Closes the detail modal.
 */
export function closeModal() {
    const modal = document.getElementById('ac-detail-modal');
    if (modal) modal.close();
}

/**
 * Initializes a simple tooltip that follows the mouse.
 * Used for Category name hovers.
 */
export function initTooltips() {
    const tooltip = document.createElement('div');
    tooltip.className = 'ac-tooltip';
    tooltip.id = 'ac-global-tooltip';
    document.body.appendChild(tooltip);

    let active = false;

    document.addEventListener('mouseover', (e) => {
        const target = e.target.closest('[data-tooltip]');
        if (target) {
            tooltip.innerHTML = target.getAttribute('data-tooltip');
            tooltip.classList.add('active');
            active = true;
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (!active) return;
        tooltip.style.left = (e.clientX + 15) + 'px';
        tooltip.style.top = (e.clientY + 15) + 'px';
    });

    document.addEventListener('mouseout', (e) => {
        const target = e.target.closest('[data-tooltip]');
        if (target) {
            tooltip.classList.remove('active');
            active = false;
        }
    });
}

/**
 * Sanitizes a string for HTML insertion using a template literal approach.
 * 
 * @param {string} str - Raw string
 * @returns {string} Sanitized string
 */
export function esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Creates a shortened snippet of a string for table previews.
 * 
 * @param {string} str - Raw string
 * @param {number} length - Maximum length before truncation
 * @returns {string} Sanitized and truncated string
 */
export function formatSnippet(str, length = 50) {
    if (!str) return '—';
    // Remove newlines and extra spaces for clean preview
    let clean = str.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (clean.length <= length) return esc(clean);
    return esc(clean.substring(0, length)) + '...';
}
