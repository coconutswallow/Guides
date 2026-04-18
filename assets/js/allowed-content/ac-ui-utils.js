/**
 * ================================================================
 * AC UI UTILITIES
 * ================================================================
 * 
 * Shared UI logic and presentation helpers for the Allowed Content 
 * dashboard.
 * 
 * Responsibilities:
 * - Managing the global detail modal.
 * - Implementing mouse-follow tooltips for metadata previews.
 * - Sanitizing user/database content for safe HTML rendering.
 * - Formatting long text snippets for compact table views.
 * 
 * @module ACUIUtils
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
/**
 * Extracts unique labels from an array of items and sorts them by their minimum order value.
 * This ensures that hierarchical navigation chips respect the database sort order.
 * 
 * @param {Array<Object>} items - Array of objects containing labels and order values
 * @param {string} labelField - The field to extract unique labels from (e.g., 'tier1')
 * @param {string} orderField - The field to sort by (e.g., 'display_order')
 * @returns {Array<string>} Unique labels sorted by their minimum order value
 */
export function getUniqueSortedLabels(items, labelField, orderField = 'display_order') {
    // 1. Group by label and find min order
    const labelMap = {};
    items.forEach(item => {
        const label = item[labelField];
        if (!label) return;
        
        const order = item[orderField] ?? 999;
        if (labelMap[label] === undefined || order < labelMap[label]) {
            labelMap[label] = order;
        }
    });

    // 2. Sort labels by their min order, then alphabetically for ties
    return Object.keys(labelMap).sort((a, b) => {
        const orderA = labelMap[a];
        const orderB = labelMap[b];
        if (orderA !== orderB) return orderA - orderB;
        return a.localeCompare(b);
    });
}
