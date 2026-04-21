/**
 * ================================================================
 * PLAYER EQUIPMENT PURCHASE TOOL
 * ================================================================
 * 
 * Logic for browsing equipment, managing a shopping cart, and 
 * generating purchase reports for Discord and GSheets.
 * 
 * @module PurchaseTool
 */

import { getEquipment } from '../allowed-content/ac-service.js';
import { esc } from '../allowed-content/ac-ui-utils.js';
import { logError } from '../error-logger.js';

// State
let allEquipment = [];
let filteredEquipment = [];
let cart = [];
let activeCategory = 'all';

/**
 * Initializes the purchase tool
 */
async function init() {
    const catalogContainer = document.getElementById('equipment-catalog-list');
    if (!catalogContainer) return;

    try {
        allEquipment = await getEquipment();
        filteredEquipment = [...allEquipment];
        
        renderCategories();
        renderCatalog();
        setupEventListeners();
        validateForm(); // Initial check
    } catch (error) {
        logError('purchase-tool', `Failed to initialize: ${error.message}`, 'critical');
        catalogContainer.innerHTML = '<div class="ac-error">Failed to load equipment catalog. Please refresh.</div>';
    }
}

/**
 * Renders the category filter chips based on available equipment categories
 */
function renderCategories() {
    const container = document.getElementById('category-filters');
    if (!container) return;

    // Extract unique categories
    const categoryMap = new Map();
    allEquipment.forEach(item => {
        if (item.category && !categoryMap.has(item.category.id)) {
            categoryMap.set(item.category.id, item.category);
        }
    });

    const sortedCategories = Array.from(categoryMap.values())
        .sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999));

    container.innerHTML = `
        <button class="cat-chip ${activeCategory === 'all' ? 'active' : ''}" data-category="all">All Items</button>
        ${sortedCategories.map(cat => `
            <button class="cat-chip ${activeCategory === cat.id ? 'active' : ''}" data-category="${cat.id}">
                ${esc(cat.name)}
            </button>
        `).join('')}
    `;

    // Add listeners
    container.querySelectorAll('.cat-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            activeCategory = chip.dataset.category;
            container.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            applyFilters();
        });
    });
}

/**
 * Renders the equipment items in the catalog (Table Format)
 */
function renderCatalog() {
    const container = document.getElementById('equipment-catalog-list');
    if (!container) return;

    if (filteredEquipment.length === 0) {
        container.innerHTML = '<div class="ac-no-results">No items found matching your search.</div>';
        return;
    }

    container.innerHTML = `
        <div class="ac-table-wrapper">
            <table class="purchase-table">
                <thead>
                    <tr>
                        <th class="col-name">Item</th>
                        <th class="col-cost">Cost</th>
                        <th class="col-weight hide-mobile">Weight</th>
                        <th class="col-qty">Add to Cart</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredEquipment.map(item => {
                        const price = item.cost_gp || 0;
                        return `
                            <tr>
                                <td class="col-name">
                                    <div style="font-weight: 700;">${esc(item.name)}</div>
                                    <div style="font-size: 0.8rem; color: var(--color-text-secondary); line-height: 1.2;">${esc(item.category?.name || 'Equipment')}</div>
                                </td>
                                <td class="col-cost"><strong>${price} GP</strong></td>
                                <td class="col-weight hide-mobile">${item.weight_lbs ? `${esc(item.weight_lbs)} lbs` : '—'}</td>
                                <td class="col-qty">
                                    <div class="table-qty-container">
                                        <input type="number" class="qty-input" value="1" min="1" id="qty-${item.id}">
                                        <button class="table-add-btn" onclick="window.addToCart('${item.id}')">Add</button>
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Filters the equipment list based on search and category
 */
function applyFilters() {
    const searchTerm = document.getElementById('equipment-search')?.value.toLowerCase() || '';
    
    filteredEquipment = allEquipment.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm) || 
                            (item.description && item.description.toLowerCase().includes(searchTerm)) ||
                            (item.category?.name.toLowerCase().includes(searchTerm));
        const matchesCategory = activeCategory === 'all' || item.category_id === activeCategory;
        return matchesSearch && matchesCategory;
    });

    renderCatalog();
}

/**
 * Validates the required character fields
 */
function validateForm() {
    const player = document.getElementById('player-name');
    const char = document.getElementById('char-name');
    const level = document.getElementById('char-level');
    const checkoutBtn = document.getElementById('open-checkout-modal');
    const validationMsg = document.getElementById('validation-msg');

    if (!player || !char || !level || !checkoutBtn) return false;

    const playerVal = player.value.trim();
    const charVal = char.value.trim();
    const levelVal = level.value.toString().trim();

    const isValid = playerVal !== "" && charVal !== "" && levelVal !== "";

    if (isValid) {
        checkoutBtn.disabled = cart.length === 0;
        if (validationMsg) validationMsg.style.display = 'none';
        [player, char, level].forEach(el => el.classList.remove('invalid'));
    } else {
        checkoutBtn.disabled = true;
        // Only show validation if they've started interacting or cart is non-empty
        if (cart.length > 0 && (playerVal === "" || charVal === "" || levelVal === "")) {
            if (validationMsg) validationMsg.style.display = 'block';
        }
    }
    
    console.log('Validation:', { isValid, player: playerVal, char: charVal, level: levelVal, cartSize: cart.length });
    return isValid;
}

/**
 * Adds an item to the cart
 * @param {string} id - The item ID
 */
window.addToCart = function(id) {
    const item = allEquipment.find(i => i.id === id);
    if (!item) return;

    const qtyInput = document.getElementById(`qty-${id}`);
    const quantity = parseInt(qtyInput?.value || '1', 10);

    if (isNaN(quantity) || quantity < 1) return;

    const existingCartItem = cart.find(i => i.id === id);
    if (existingCartItem) {
        existingCartItem.quantity += quantity;
    } else {
        cart.push({
            id: item.id,
            name: item.name,
            cost_gp: item.cost_gp || 0,
            quantity: quantity
        });
    }

    renderCart();
    validateForm();
    qtyInput.value = 1; // Reset input
    
    // Pulse feedback on cart
    const countDisplay = document.getElementById('cart-count');
    if (countDisplay) {
        countDisplay.style.color = 'var(--color-secondary)';
        countDisplay.style.fontWeight = 'bold';
        setTimeout(() => {
            countDisplay.style.color = '';
            countDisplay.style.fontWeight = '';
        }, 500);
    }
};

/**
 * Removes an item from the cart
 */
window.removeFromCart = function(id) {
    cart = cart.filter(item => item.id !== id);
    renderCart();
    validateForm();
};

/**
 * Renders the shopping cart
 */
function renderCart() {
    const container = document.getElementById('cart-items-list');
    const countDisplay = document.getElementById('cart-count');
    const totalDisplay = document.getElementById('total-gold');

    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--color-text-secondary); padding: 1rem;">Cart is empty</div>';
        if (countDisplay) countDisplay.textContent = '(0 items)';
        if (totalDisplay) totalDisplay.textContent = '0';
        return;
    }

    let total = 0;
    let itemCount = 0;

    container.innerHTML = cart.map(item => {
        const subtotal = item.cost_gp * item.quantity;
        total += subtotal;
        itemCount += item.quantity;

        return `
            <div class="cart-item">
                <span class="cart-item-name" title="${esc(item.name)}">${item.quantity}x ${esc(item.name)}</span>
                <span style="color: var(--color-primary); font-weight: bold;">${subtotal} GP</span>
                <span class="cart-item-remove" onclick="window.removeFromCart('${item.id}')" title="Remove">&times;</span>
            </div>
        `;
    }).join('');

    if (countDisplay) countDisplay.textContent = `(${itemCount} items)`;
    if (totalDisplay) totalDisplay.textContent = total;
}

/**
 * Sets up global event listeners
 */
function setupEventListeners() {
    document.getElementById('equipment-search')?.addEventListener('input', applyFilters);
    
    // Validation listeners - using input, change, and keyup for safety
    ['player-name', 'char-name', 'char-level'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', validateForm);
            el.addEventListener('change', validateForm);
            el.addEventListener('keyup', validateForm);
        }
    });

    document.getElementById('open-checkout-modal')?.addEventListener('click', handleOpenModal);
}

/**
 * Opens the checkout preview modal
 */
function handleOpenModal() {
    if (!validateForm()) {
        // Highlight invalid fields
        ['player-name', 'char-name', 'char-level'].forEach(id => {
            const el = document.getElementById(id);
            if (el && !el.value.trim()) el.classList.add('invalid');
        });
        return;
    }

    const modal = document.getElementById('checkout-modal');
    const discordPreview = document.getElementById('discord-preview');
    const gsheetPreview = document.getElementById('gsheet-preview');

    if (!modal || !discordPreview || !gsheetPreview) return;

    // Generate Discord Output
    const playerName = document.getElementById('player-name').value;
    const charName = document.getElementById('char-name').value;
    const level = document.getElementById('char-level').value;
    const itemsList = cart.map(item => item.quantity > 1 ? `${item.quantity}x ${item.name}` : item.name).join(', ');
    const totalSpent = cart.reduce((sum, item) => sum + (item.cost_gp * item.quantity), 0);
    
    discordPreview.textContent = `${playerName} as ${charName}(level ${level}) purchases ${itemsList} and spends ${totalSpent} gold.`;

    // Generate GSheet Output
    const now = new Date();
    const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
    // Tab-delimited row: Date, DTP(0), Description, Gold(-), Items
    gsheetPreview.textContent = `${dateStr}\t0\tEquipment Purchase\t-${totalSpent}\t${itemsList}`;

    modal.showModal();
}

/**
 * Copies the specific output type to clipboard
 * @param {string} type - 'discord' or 'gsheet'
 */
window.copyOutput = function(type) {
    const el = document.getElementById(`${type}-preview`);
    if (!el) return;

    copyToClipboard(el.textContent, `${type === 'discord' ? 'Discord post' : 'GSheet row'} copied!`);
};

/**
 * Generic clipboard helper
 */
async function copyToClipboard(text, message) {
    try {
        await navigator.clipboard.writeText(text);
        showFeedback(message);
    } catch (err) {
        console.error('Could not copy text: ', err);
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showFeedback(message);
        } catch (err) {
            showFeedback('Failed to copy. See console.');
        }
        document.body.removeChild(textArea);
    }
}

/**
 * Shows temporary feedback message in modal
 */
function showFeedback(message) {
    const feedback = document.getElementById('copy-feedback-modal');
    if (!feedback) return;
    
    feedback.textContent = message;
    feedback.style.opacity = '1';
    
    setTimeout(() => {
        feedback.style.opacity = '0';
    }, 3000);
}

// Start
init();
