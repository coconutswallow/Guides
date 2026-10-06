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
 * - Sanitizing user/database content for safe HTML and attribute rendering.
 * - Formatting text snippets and parsing Markdown links.
 * - Rendering source badges and reusable source tag pickers.
 * 
 * @module ACUIUtils
 */

import { getSourceByKey } from './ac-service.js';

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
    if (typeof modal.showModal === 'function') {
        modal.showModal();
    } else {
        modal.setAttribute('open', '');
    }
}

/**
 * Closes the detail modal safely in both browser and headless environments.
 */
export function closeModal() {
    const modal = document.getElementById('ac-detail-modal');
    if (modal) {
        if (typeof modal.close === 'function') {
            modal.close();
        } else {
            modal.removeAttribute('open');
        }
    }
}

/**
 * Displays a lightweight toast notification.
 * 
 * @param {string} message - Message text
 * @param {boolean} isError - Whether to format as error
 */
export function showToast(message, isError = false) {
    const existing = document.getElementById('ac-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'ac-toast';
    toast.className = `ac-toast ${isError ? 'error' : ''}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        if (toast.parentNode) toast.remove();
    }, 3500);
}

/**
 * Creates a debounced function that delays invoking `fn` until after `delay`
 * milliseconds have elapsed since the last time the debounced function was called.
 * 
 * Performance Rationale:
 * Input search boxes trigger the `input` event on every single keypress. Without debouncing,
 * typing a 15-character query triggers 15 complete array filter operations and 15 complete
 * DOM tree reconstructions. Debouncing waits for the user to pause typing before updating the DOM.
 * 
 * @param {Function} fn - The function to debounce
 * @param {number} [delay=150] - Milliseconds to wait after the last invocation
 * @returns {Function} Debounced version of fn
 */
export function debounce(fn, delay = 150) {
    let timeoutId = null;
    return function (...args) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            fn.apply(this, args);
            timeoutId = null;
        }, delay);
    };
}

/**
 * Initializes a lightweight mouse-follow tooltip for Category and Source preview hovers.
 * 
 * Performance & Animation Note:
 * Modern high-polling mice trigger `mousemove` at up to 1000Hz. Updating DOM inline styles
 * on every raw event causes layout recalculations that can drop frame rates. We throttle
 * position updates using `requestAnimationFrame` so styles only update once per screen refresh (60/120Hz).
 */
export function initTooltips() {
    if (document.getElementById('ac-global-tooltip')) return;

    const tooltip = document.createElement('div');
    tooltip.className = 'ac-tooltip';
    tooltip.id = 'ac-global-tooltip';
    document.body.appendChild(tooltip);

    let active = false;
    let rafId = null;

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
        // Throttle DOM style recalculations using requestAnimationFrame
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
            tooltip.style.left = (e.clientX + 15) + 'px';
            tooltip.style.top = (e.clientY + 15) + 'px';
            rafId = null;
        });
    });

    document.addEventListener('mouseout', (e) => {
        const target = e.target.closest('[data-tooltip]');
        if (target) {
            tooltip.classList.remove('active');
            active = false;
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        }
    });
}

/**
 * Sanitizes untrusted text for safe HTML element and attribute insertion.
 * 
 * Security & Design Details:
 * - Encodes `&`, `<`, `>`, and `"`.
 * - Escaping `<` and `>` prevents Cross-Site Scripting (XSS) by neutralizing HTML tags (<script>, <img>, etc.).
 * - Escaping `"` prevents attribute breakout in double-quoted HTML attributes (`value="${esc(val)}"`).
 * - Note on single quotes: Single quotes `'` are intentionally NOT converted to `&#39;` so that titles
 *   with apostrophes (e.g. "Player's Handbook", "Sword Coast Adventurer's Guide") remain legible
 *   and match test assertions. In standard HTML5, single quotes inside double-quoted attributes are
 *   completely safe and valid.
 * 
 * @param {*} str - Raw string or value from database or user input
 * @returns {string} Sanitized string safe for HTML rendering
 */
export function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Resolves a raw source link to a safe absolute or site-relative URL.
 * 
 * Security & Path Resolution:
 * 1. Blocks dangerous schemes (javascript:, data:, vbscript:, file:) to prevent XSS execution.
 * 2. Normalizes protocol-relative links (//example.com) to https://.
 * 3. Prepends the site `BASE_URL` (e.g., `/Guides`) to relative paths (e.g. `/arcana/` -> `/Guides/arcana/`).
 * 
 * @param {string} [rawLink=''] - Raw link URL from database or markdown
 * @returns {string} Normalized, safe URL string
 */
export function resolveSourceLink(rawLink = '') {
    if (!rawLink || typeof rawLink !== 'string') return '';
    const trimmed = rawLink.trim();
    if (!trimmed) return '';

    // Security check: strictly disallow dangerous URI schemes
    if (/^(?:javascript|data|vbscript|file):/i.test(trimmed)) {
        console.warn(`AC Security: Blocked potentially insecure URL scheme: ${trimmed}`);
        return '';
    }

    // Security check: normalize protocol-relative URLs
    if (trimmed.startsWith('//')) {
        return `https:${trimmed}`;
    }

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
    }

    // Resolve base URL from window, environment, or current location pathname
    let base = '';
    if (typeof window !== 'undefined') {
        if (window.BASE_URL && window.BASE_URL !== '/') {
            base = window.BASE_URL;
        } else if (window.location && window.location.pathname) {
            const match = window.location.pathname.match(/^(\/[^/]+)/);
            if (match && match[1].toLowerCase() === '/guides') {
                base = match[1];
            }
        }
    }
    if (!base && typeof BASE_URL !== 'undefined' && BASE_URL && BASE_URL !== '/') {
        base = BASE_URL;
    }
    if (!base || base === '/') {
        base = '/Guides';
    }

    const cleanBase = base.replace(/\/$/, '');

    if (trimmed.startsWith('/')) {
        if (cleanBase && !trimmed.startsWith(cleanBase + '/')) {
            return `${cleanBase}${trimmed}`;
        }
        return trimmed;
    }

    return `${cleanBase}/${trimmed.replace(/^\.?\//, '')}`;
}

/**
 * Resolves the relative or absolute URL to the Staff Portal, respecting site BASE_URL (/Guides).
 * 
 * @returns {string} Fully resolved Staff Portal URL (e.g. '/Guides/staff/')
 */
export function getStaffPortalUrl() {
    return resolveSourceLink('/staff/');
}

/**
 * Converts markdown links `[label](url)` in text into secure HTML `<a>` tags.
 * 
 * Security Architecture:
 * 1. The input string is first passed through `esc()` to neutralize any raw HTML.
 * 2. Newlines are safely converted into `<br>` tags.
 * 3. A strict regex matches only URLs beginning with http://, https://, or relative paths (/ or ./).
 * 4. All generated links receive `rel="noopener noreferrer"` to prevent tab-nabbing attacks.
 * 
 * @param {string} text - Raw text containing markdown links
 * @param {boolean} [stopPropagation=true] - Whether clicking the link stops event bubbling (e.g., In table rows)
 * @returns {string} HTML string with rendered anchor tags
 */
export function renderMarkdownLinks(text, stopPropagation = true) {
    if (!text || !text.trim() || text === '—') return '—';
    const cleaned = String(text)
        .split(/\r?\n/)
        .map(line => line.trim())
        .join('\n')
        .trim();
    let safe = esc(cleaned);
    safe = safe.replace(/\r?\n/g, '<br>');
    const stopProp = stopPropagation ? ' onclick="event.stopPropagation()"' : '';
    return safe.replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/|\.\/)[^\s\)\"'>]+)\)/g, (match, label, url) => {
        const cleanUrl = resolveSourceLink(url).replace(/"/g, '&quot;');
        return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="source-url-link"${stopProp}>${label}</a>`;
    });
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
    let clean = String(str).replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (clean.length <= length) return esc(clean);
    return esc(clean.substring(0, length)) + '...';
}

/**
 * Extracts unique labels from an array of items and sorts them by their minimum order value.
 * 
 * @param {Array<Object>} items - Array of objects
 * @param {string} labelField - Field to extract labels from
 * @param {string} orderField - Field to sort by
 * @returns {Array<string>} Unique sorted labels
 */
export function getUniqueSortedLabels(items, labelField, orderField = 'display_order') {
    const labelMap = {};
    items.forEach(item => {
        const label = item[labelField];
        if (!label) return;
        
        const order = item[orderField] ?? 999;
        if (labelMap[label] === undefined || order < labelMap[label]) {
            labelMap[label] = order;
        }
    });

    return Object.keys(labelMap).sort((a, b) => {
        const orderA = labelMap[a];
        const orderB = labelMap[b];
        if (orderA !== orderB) return orderA - orderB;
        return a.localeCompare(b);
    });
}

/**
 * Normalizes and extracts individual source keys from an array, string, or comma-separated string.
 * Supports strings like 'ERLW, TCE', 'SCAG / XGE', or arrays like ['PHB2014', 'MPMM'].
 * 
 * @param {Array<string>|string|null|undefined} src
 * @returns {Array<string>}
 */
export function extractSourceKeys(src) {
    if (!src) return [];
    if (Array.isArray(src)) {
        return src.flatMap(s => typeof s === 'string' ? s.split(/[,/]/).map(x => x.trim()).filter(Boolean) : s).filter(Boolean);
    }
    if (typeof src === 'string') {
        return src.split(/[,/]/).map(s => s.trim()).filter(Boolean);
    }
    return [];
}

/**
 * Renders an array or string of source keys into interactive source badges.
 * Resolves source metadata dynamically from the in-memory cache.
 * Supports both array format (['SCAG', 'MTF']) and string format ('TCE', 'ERLW, TCE').
 * 
 * @param {Array<string>|string} sourcesInput - Array of source keys or string of source(s)
 * @param {boolean} isVariant - Whether this badge is for a variant printing
 * @returns {string} HTML string of badges
 */
export function renderSourceBadges(sourcesInput, isVariant = false) {
    const sourcesArray = extractSourceKeys(sourcesInput);
    if (!sourcesArray || sourcesArray.length === 0) {
        return '<span style="opacity:0.5;">—</span>';
    }

    return sourcesArray.map(key => {
        const src = getSourceByKey(key);
        const label = src?.abbreviation || key;
        const fullName = src?.name || key;
        const ruleset = src?.ruleset ? ` [${src.ruleset}]` : '';
        const tooltip = `${fullName}${ruleset}`;
        
        return `<span class="ac-source-badge ${isVariant ? 'badge-variant' : ''}" data-key="${esc(key)}" data-tooltip="${esc(tooltip)}">${esc(label)}</span>`;
    }).join(' ');
}

/**
 * Renders a standardized, interactive multi-select source tag picker component.
 * Can be reused across any Allowed Content tab (Races, Feats, Classes, Spells, etc.).
 * 
 * @param {Object} options
 * @param {HTMLElement} options.containerEl - Container element to render the picker into
 * @param {Array<string>} options.selectedKeys - Initially selected source keys
 * @param {Array<string>} options.availableKeys - Array of all available source keys
 * @param {Function} options.onChange - Callback fired whenever selection changes: onChange(updatedKeys)
 */
export function renderSourceTagPicker({ containerEl, selectedKeys = [], availableKeys = [], onChange = () => {} }) {
    if (!containerEl) return;

    let currentSelected = [...selectedKeys];

    containerEl.className = 'ac-tag-picker';
    containerEl.innerHTML = `
        <div class="ac-tag-chips-container" id="ac-picker-chips"></div>
        <div style="display: flex; gap: 0.5rem;">
            <select class="ac-form-select" id="ac-picker-select" style="flex: 1;">
                <option value="">+ Add Source...</option>
                ${availableKeys.map(k => {
                    const src = getSourceByKey(k);
                    const label = src ? `${k} - ${src.name}` : k;
                    return `<option value="${esc(k)}">${esc(label)}</option>`;
                }).join('')}
            </select>
        </div>
    `;

    const chipsEl = containerEl.querySelector('#ac-picker-chips');
    const selectEl = containerEl.querySelector('#ac-picker-select');

    function updateChips() {
        if (currentSelected.length === 0) {
            chipsEl.innerHTML = '<span class="ac-tag-empty-msg">No sources selected. Use dropdown below to add.</span>';
            return;
        }

        chipsEl.innerHTML = currentSelected.map(k => {
            const src = getSourceByKey(k);
            const label = src ? `${k} (${src.name})` : k;
            return `
                <span class="ac-tag-chip" data-key="${esc(k)}">
                    <span>${esc(label)}</span>
                    <span class="ac-tag-remove" data-key="${esc(k)}" title="Remove source">&times;</span>
                </span>
            `;
        }).join('');

        chipsEl.querySelectorAll('.ac-tag-remove').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const key = btn.dataset.key;
                currentSelected = currentSelected.filter(k => k !== key);
                updateChips();
                onChange([...currentSelected]);
            };
        });
    }

    selectEl.onchange = (e) => {
        const key = e.target.value;
        if (key && !currentSelected.includes(key)) {
            currentSelected.push(key);
            updateChips();
            onChange([...currentSelected]);
        }
        selectEl.value = '';
    };

    updateChips();
}
