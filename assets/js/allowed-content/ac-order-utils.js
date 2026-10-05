/**
 * ================================================================
 * AC ORDER UTILS (FRACTIONAL INDEXING)
 * ================================================================
 * 
 * Reusable utility module providing fractional indexing and display_order
 * calculations across all Allowed Content tabs (Sources, Races, Feats, Spells, etc.).
 * 
 * Core Benefits:
 * - O(1) single-row updates when reordering or inserting items between existing rows.
 * - Eliminates large cascade re-indexing writes (e.g. shifting 100+ rows).
 * - Human-readable and editable decimal values (e.g. 10.5, 10.25).
 * - Float-precision sanitization to avoid IEEE 754 floating-point artifacts.
 * 
 * @module ACOrderUtils
 */

const DEFAULT_PRECISION = 8;
const MIN_GAP_THRESHOLD = 1e-6;

/**
 * Sanitizes a floating-point number to avoid IEEE 754 precision artifacts.
 * 
 * @param {number} num - Raw number
 * @param {number} [precision=8] - Maximum decimal places
 * @returns {number} Clean rounded float
 */
export function cleanFloat(num, precision = DEFAULT_PRECISION) {
    if (typeof num !== 'number' || isNaN(num)) return 0;
    return parseFloat(num.toFixed(precision));
}

/**
 * Calculates a fractional midpoint order between two existing display_order values.
 * 
 * @param {number|null} prevOrder - Order of preceding item (null if inserting at start)
 * @param {number|null} nextOrder - Order of following item (null if inserting at end)
 * @param {number} [precision=8] - Max precision
 * @returns {number} Fractional order between prevOrder and nextOrder
 */
export function getMidpointOrder(prevOrder, nextOrder, precision = DEFAULT_PRECISION) {
    const hasPrev = prevOrder !== null && prevOrder !== undefined && !isNaN(prevOrder);
    const hasNext = nextOrder !== null && nextOrder !== undefined && !isNaN(nextOrder);

    // Case 1: Inserting between two items
    if (hasPrev && hasNext) {
        const p = Number(prevOrder);
        const n = Number(nextOrder);
        if (p === n) {
            return cleanFloat(p + 0.5, precision);
        }
        const low = Math.min(p, n);
        const high = Math.max(p, n);
        return cleanFloat((low + high) / 2, precision);
    }

    // Case 2: Inserting at the beginning (before nextOrder)
    if (!hasPrev && hasNext) {
        const n = Number(nextOrder);
        if (n > 1) {
            return cleanFloat(n - 1, precision);
        }
        if (n > 0) {
            return cleanFloat(n / 2, precision);
        }
        return cleanFloat(n - 1, precision);
    }

    // Case 3: Inserting at the end (after prevOrder)
    if (hasPrev && !hasNext) {
        const p = Number(prevOrder);
        return cleanFloat(p + 1, precision);
    }

    // Case 4: List is empty
    return 1;
}

/**
 * Calculates the fractional display order to insert an item at a specific index
 * in a sorted collection.
 * 
 * @param {Array<Object>} sortedItems - Collection sorted by display_order
 * @param {number} targetIndex - 0-based insertion index (0 to sortedItems.length)
 * @param {string} [orderKey='display_order'] - Key containing order value
 * @param {number} [precision=8] - Max precision
 * @returns {number} New fractional display_order
 */
export function getOrderForPosition(sortedItems = [], targetIndex = 0, orderKey = 'display_order', precision = DEFAULT_PRECISION) {
    if (!sortedItems || sortedItems.length === 0) {
        return 1;
    }

    // Insert at beginning
    if (targetIndex <= 0) {
        return getMidpointOrder(null, sortedItems[0]?.[orderKey], precision);
    }

    // Insert at end
    if (targetIndex >= sortedItems.length) {
        return getMidpointOrder(sortedItems[sortedItems.length - 1]?.[orderKey], null, precision);
    }

    // Insert between targetIndex - 1 and targetIndex
    const prevOrder = sortedItems[targetIndex - 1]?.[orderKey];
    const nextOrder = sortedItems[targetIndex]?.[orderKey];
    return getMidpointOrder(prevOrder, nextOrder, precision);
}

/**
 * Calculates the next display order for appending to the end of a collection.
 * 
 * @param {Array<Object>} items - Collection of items
 * @param {number} [step=1] - Increment step
 * @param {string} [orderKey='display_order'] - Key containing order value
 * @returns {number} Next order value
 */
export function getNextDisplayOrder(items = [], step = 1, orderKey = 'display_order') {
    if (!items || items.length === 0) return 1;
    const max = items.reduce((m, item) => {
        const val = Number(item?.[orderKey] ?? 0);
        return !isNaN(val) && val > m ? val : m;
    }, 0);
    return cleanFloat(max + step);
}

/**
 * Calculates display order for placing an item at the very beginning of a collection.
 * 
 * @param {Array<Object>} items - Collection of items
 * @param {string} [orderKey='display_order'] - Key containing order value
 * @returns {number} New order value for start
 */
export function getStartDisplayOrder(items = [], orderKey = 'display_order') {
    if (!items || items.length === 0) return 1;
    const sorted = sortByDisplayOrder(items, 'name', orderKey);
    return getOrderForPosition(sorted, 0, orderKey);
}

/**
 * Calculates the new display_order when moving an item from one index to another.
 * 
 * @param {Array<Object>} items - Sorted collection of items
 * @param {number} fromIndex - Current index of item
 * @param {number} toIndex - Destination index
 * @param {string} [orderKey='display_order'] - Key containing order value
 * @param {number} [precision=8] - Max precision
 * @returns {{ newOrder: number, updatedItem: Object }} Result object
 */
export function moveItemOrder(items = [], fromIndex, toIndex, orderKey = 'display_order', precision = DEFAULT_PRECISION) {
    if (!items || items.length === 0 || fromIndex === toIndex) {
        const curr = items?.[fromIndex];
        return { newOrder: curr?.[orderKey] ?? 1, updatedItem: curr };
    }

    // Create shallow copy without moving item
    const movingItem = items[fromIndex];
    const remaining = items.filter((_, idx) => idx !== fromIndex);

    // In remaining array, calculate target insertion point
    const targetOrder = getOrderForPosition(remaining, toIndex, orderKey, precision);
    const updatedItem = { ...movingItem, [orderKey]: targetOrder };

    return { newOrder: targetOrder, updatedItem };
}

/**
 * Checks whether the display orders between adjacent items have become too tight
 * and would benefit from rebalancing.
 * 
 * @param {Array<Object>} items - Collection of items
 * @param {number} [threshold=1e-6] - Minimum gap threshold
 * @param {string} [orderKey='display_order'] - Key containing order value
 * @returns {boolean} True if any adjacent gap is smaller than threshold
 */
export function needsRebalance(items = [], threshold = MIN_GAP_THRESHOLD, orderKey = 'display_order') {
    if (!items || items.length < 2) return false;
    const sorted = sortByDisplayOrder(items, null, orderKey);
    for (let i = 0; i < sorted.length - 1; i++) {
        const gap = Number(sorted[i + 1]?.[orderKey] ?? 0) - Number(sorted[i]?.[orderKey] ?? 0);
        if (gap <= threshold) return true;
    }
    return false;
}

/**
 * Rebalances orders across an entire collection to clean, evenly-spaced integers.
 * 
 * @param {Array<Object>} items - Collection of items
 * @param {number} [start=10] - First item order
 * @param {number} [step=10] - Step between items
 * @param {string} [orderKey='display_order'] - Key containing order value
 * @returns {Array<{ id: string|number, display_order: number }>} Array of id and new display_order
 */
export function rebalanceOrders(items = [], start = 10, step = 10, orderKey = 'display_order') {
    if (!items || items.length === 0) return [];
    const sorted = sortByDisplayOrder(items, 'name', orderKey);
    return sorted.map((item, idx) => ({
        id: item.id,
        [orderKey]: start + (idx * step)
    }));
}

/**
 * Safely sorts a collection by float/numeric display_order with a secondary tiebreaker.
 * 
 * @param {Array<Object>} items - Items to sort
 * @param {string|null} [tieBreaker='name'] - Secondary sort key
 * @param {string} [orderKey='display_order'] - Order key
 * @returns {Array<Object>} New sorted array
 */
export function sortByDisplayOrder(items = [], tieBreaker = 'name', orderKey = 'display_order') {
    if (!items || !Array.isArray(items)) return [];
    return [...items].sort((a, b) => {
        const orderA = Number(a?.[orderKey] ?? 0);
        const orderB = Number(b?.[orderKey] ?? 0);
        if (orderA !== orderB) {
            return orderA - orderB;
        }
        if (tieBreaker && a?.[tieBreaker] && b?.[tieBreaker]) {
            return String(a[tieBreaker]).localeCompare(String(b[tieBreaker]));
        }
        return 0;
    });
}

/**
 * Formats a display_order number for presentation in the UI.
 * 
 * @param {number|null} order - Raw display order
 * @returns {string} Formatted string e.g. "10.5", "1", or "—"
 */
export function formatDisplayOrder(order) {
    if (order === null || order === undefined || isNaN(order)) return '—';
    const num = Number(order);
    return cleanFloat(num, 4).toString();
}
