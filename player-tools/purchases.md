---
layout: default
title: "Equipment Purchase Tool"
permalink: /player-tools/purchases/
hide_from_nav: true
extra_css: 
  - /assets/css/player-tools/purchase-tool.css
extra_js:
  - /assets/js/player-tools/purchase-tool.js
---

<h1 class="page-title">Equipment Purchase Tool</h1>

<div class="purchase-tool-container">
    <!-- Left Column: Catalog -->
    <div class="tool-catalog">
        <div class="tool-section">
            <h3>Equipment Catalog</h3>
            <div class="catalog-header">
                <div class="search-wrapper">
                    <span class="search-icon">🔍</span>
                    <input type="text" id="equipment-search" placeholder="Search items or categories...">
                </div>
            </div>

            <div class="category-chips" id="category-filters">
                <button class="cat-chip active" data-category="all">All Items</button>
                <!-- Category chips will be injected here -->
            </div>

            <div id="equipment-catalog-list">
                <div class="tool-loading">Loading equipment catalog...</div>
            </div>
        </div>
    </div>

    <!-- Right Column: Cart & Info -->
    <aside class="tool-sidebar">
        <!-- Character Details Section -->
        <div class="tool-section character-info-card">
            <h3>Character Details</h3>
            <div class="info-group">
                <label for="player-name">Player @Username <span style="color:red">*</span></label>
                <input type="text" id="player-name" placeholder="e.g. @Username">
            </div>
            <div class="info-group">
                <label for="char-name">Character Name <span style="color:red">*</span></label>
                <input type="text" id="char-name" placeholder="e.g. Grom the Bold">
            </div>
            <div class="info-group">
                <label for="char-level">Current Level <span style="color:red">*</span></label>
                <input type="number" id="char-level" min="1" max="20" value="1">
            </div>
            <div id="validation-msg" style="color: var(--palette-alert-danger-border); font-size: 0.8rem; height: 1rem; margin-top: -0.5rem; display: none;">
                Please fill all required fields
            </div>
        </div>

        <!-- Shopping Cart Section -->
        <div class="tool-section">
            <h3>
                Shopping Cart
                <span id="cart-count" style="font-size: 0.8rem; font-weight: normal; opacity: 0.7;">(0 items)</span>
            </h3>
            
            <div id="cart-items-list" class="cart-items">
                <div style="text-align: center; color: var(--color-text-secondary); padding: 2rem; font-style: italic;">
                    Your cart is empty
                </div>
            </div>

            <div class="cart-total-box">
                <span class="total-label">Total Gold Spent</span>
                <span class="total-value"><span id="total-gold">0</span> GP</span>
            </div>

            <div class="checkout-actions">
                <button id="open-checkout-modal" class="btn-checkout btn-primary" disabled>
                    Review & Checkout
                </button>
                <div id="copy-feedback"></div>
            </div>
        </div>
    </aside>
</div>

<!-- Output Preview Modal -->
<dialog id="checkout-modal" class="purchase-modal">
    <div class="modal-header">
        <h2>Purchase Review</h2>
        <button class="modal-close" onclick="document.getElementById('checkout-modal').close()">&times;</button>
    </div>
    <div class="modal-content">
        <!-- Discord Section -->
        <div class="preview-section">
            <h4>Discord Log</h4>
            <div class="output-preview"><code id="discord-preview"></code></div>
            <button class="copy-mini-btn" onclick="window.copyOutput('discord')">Copy Discord Log</button>
            <div class="instruction-box">
                <p>Post this log to the <a href="https://discord.com/channels/308324031478890497/617830376257093640" target="_blank" rel="noopener noreferrer">#downtime-logs</a> channel.</p>
            </div>
        </div>

        <!-- MAL Section -->
        <div class="preview-section">
            <h4>MAL Row (GSheet)</h4>
            <div class="output-preview"><code id="gsheet-preview"></code></div>
            <button class="copy-mini-btn" onclick="window.copyOutput('gsheet')">Copy GSheet Row</button>
            <div class="instruction-box">
                <p><strong>MAL Instructions:</strong></p>
                <ul>
                    <li>Paste this row into the <strong>Downtime Log</strong> section of your Master Adventure Log.</li>
                    <li><strong>Manually update</strong> your inventory tab with the new items.</li>
                </ul>
            </div>
        </div>
        
        <div id="copy-feedback-modal"></div>
    </div>
    <div class="modal-actions">
        <button class="btn-close-modal" onclick="document.getElementById('checkout-modal').close()">Close</button>
    </div>
</dialog>

<!-- Special Item Configuration Modal -->
<dialog id="special-item-modal" class="purchase-modal special-modal">
    <div class="modal-header">
        <h2>Configure Special Item</h2>
        <button class="modal-close" onclick="document.getElementById('special-item-modal').close()">&times;</button>
    </div>
    <div class="modal-content">
        <div class="special-item-info">
            <h3 id="special-item-name">Item Name</h3>
            <div class="instruction-box">
                <p><strong>Cost Instructions:</strong> <span id="special-cost-info"></span></p>
                <p><strong>Weight Instructions:</strong> <span id="special-weight-info"></span></p>
            </div>
        </div>

        <div class="tool-section no-border">
            <div class="info-group">
                <label for="special-note-input">Base Item / Details <span style="color:red">*</span></label>
                <input type="text" id="special-note-input" placeholder="e.g. Plate Armor, Longsword" list="base-item-list">
                <datalist id="base-item-list">
                    <!-- Options populated via JS -->
                </datalist>
                <div id="base-item-cost-display" style="font-size: 0.85rem; margin-top: 0.4rem; color: var(--color-primary); font-weight: bold; min-height: 1.2rem;"></div>
            </div>
            <div class="info-group">
                <label for="special-cost-input">Calculated GP Cost <span style="color:red">*</span></label>
                <input type="number" id="special-cost-input" placeholder="Enter final GP cost">
            </div>
            <div id="special-validation-msg" style="color: var(--palette-alert-danger-border); font-size: 0.8rem; height: 1rem; margin-bottom: 1rem; display: none;">
                Please fill all required fields
            </div>
        </div>
    </div>
    <div class="modal-actions">
        <button class="btn-close-modal" onclick="document.getElementById('special-item-modal').close()">Cancel</button>
        <button id="confirm-special-add" class="btn-checkout btn-primary" style="width: auto; margin-bottom: 0; padding: 0.6rem 2rem;">Add to Cart</button>
    </div>
</dialog>

<script type="module" src="{{ '/assets/js/player-tools/purchase-tool.js' | relative_url }}"></script>
