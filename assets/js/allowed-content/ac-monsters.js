/**
 * ================================================================
 * AC MONSTERS MODULE
 * ================================================================
 * 
 * Logic for the Monsters content set. Handles:
 * - Table rendering grouped by Category
 * - Explicit rendering of empty categories (headers/notes only)
 * - Monster-specific filtering and search
 * - Record detail generation
 * - 3-Tier Drill-down Navigation for categories
 */

import { getMonsters, getMonsterCategories } from './ac-service.js';
import { openModal, esc, formatSnippet } from './ac-ui-utils.js';

let allMonsters = [];
let monsterCategories = [];
let filteredMonsters = [];

// Navigation State
let currentTier1 = null;
let currentTier2 = null;

/**
 * Initializes the Monsters view.
 */
export async function initMonsters() {
    const container = document.getElementById('ac-view-monsters');
    if (!container) return;

    // Show loading state if empty
    if (allMonsters.length === 0) {
        container.innerHTML = `
            <div class="ac-loading">
                <div class="spinner"></div>
                <span>Summoning Monsters...</span>
            </div>
        `;
    }

    // Fetch both categories and items in parallel
    const [categories, items] = await Promise.all([
        getMonsterCategories(),
        getMonsters()
    ]);

    console.log(`AC Monsters: Found ${categories.length} categories and ${items.length} items.`);

    // Pre-parse categories for tiered navigation
    monsterCategories = categories.map(cat => {
        const parts = cat.name.split(' - ').map(p => p.trim());
        return {
            ...cat,
            tier1: parts[0] || 'Unknown',
            tier2: parts[1] || 'General',
            tier3: parts[2] || parts[1] || parts[0] // Fallback for simple names
        };
    });

    allMonsters = items;
    filteredMonsters = [...allMonsters];

    renderMonsters();
}

/**
 * Renders the Monsters view.
 */
function renderMonsters() {
    const container = document.getElementById('ac-view-monsters');
    if (!container) return;

    // Clear and build header area
    container.innerHTML = `
        <div class="ac-table-header">
            <div id="monster-nav" class="ac-monster-nav">
                <!-- Tiered navigation will be injected here -->
            </div>
            <div class="ac-stats" id="monster-stats">
                ${filteredMonsters.length} Monsters found
            </div>
        </div>
        <div id="monster-content" class="ac-sections-container"></div>
    `;

    renderMonsterNavigation();

    const content = document.getElementById('monster-content');

    // Create a map of category ID -> array of filtered items
    const itemMap = {};
    filteredMonsters.forEach(item => {
        const catId = (typeof item.category_id === 'object' ? item.category_id?.id : item.category_id) || item.category?.id;
        
        if (catId) {
            if (!itemMap[catId]) itemMap[catId] = [];
            itemMap[catId].push(item);
        }
    });

    // Render all categories sequentially
    content.innerHTML = monsterCategories.map(cat => {
        const items = itemMap[cat.id] || [];
        const sectionId = `monster-section-${cat.id}`;
        
        return `
            <div class="ac-section-group">
                <div class="ac-section-title" id="${sectionId}">
                    <h2>${esc(cat.name)}</h2>
                    ${cat.notes ? `<div class="section-desc" style="white-space: pre-wrap;">${esc(cat.notes)}</div>` : ''}
                </div>
                
                ${items.length > 0 ? `
                    <div class="ac-table-wrapper">
                        <table class="ac-table">
                            <thead>
                                <tr>
                                    <th class="col-name">Monster Name</th>
                                    <th class="col-source hide-mobile">Source</th>
                                    <th class="col-class hide-tablet">Classification</th>
                                    <th class="col-cr">CR</th>
                                    <th class="col-type hide-tablet">Creature Type</th>
                                    <th class="col-notes">Notes / Advice</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.map(item => `
                                    <tr data-id="${item.id}">
                                        <td class="col-name">
                                            <div class="name-cell">
                                                <span>${esc(item.name)}</span>
                                                <span class="row-hover-icon">Details →</span>
                                            </div>
                                        </td>
                                        <td class="col-source hide-mobile">${esc(item.source)}</td>
                                        <td class="col-class hide-tablet">${esc(item.classification || '—')}</td>
                                        <td class="col-cr">${esc(item.cr || '—')}</td>
                                        <td class="col-type hide-tablet">${esc(item.creature_type || '—')}</td>
                                        <td class="col-notes">${formatSnippet(item.notes_advice)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');

    // Attach row click listeners
    content.querySelectorAll('tr[data-id]').forEach(row => {
        row.addEventListener('click', () => {
            const id = row.dataset.id;
            const monster = allMonsters.find(m => m.id === id);
            if (monster) showMonsterDetail(monster);
        });
    });
}

/**
 * Renders the 3-tier drill-down navigation.
 */
function renderMonsterNavigation() {
    const navContainer = document.getElementById('monster-nav');
    if (!navContainer) return;

    // 1. Get Tier 1 options
    const tier1Options = [...new Set(monsterCategories.map(c => c.tier1))].sort();

    // 2. Get Tier 2 options based on current Selection
    const tier2Options = currentTier1 
        ? [...new Set(monsterCategories.filter(c => c.tier1 === currentTier1).map(c => c.tier2))].sort()
        : [];

    // 3. Get Tier 3 options based on current Selections
    const tier3Options = (currentTier1 && currentTier2)
        ? monsterCategories.filter(c => c.tier1 === currentTier1 && c.tier2 === currentTier2)
        : [];

    navContainer.innerHTML = `
        <!-- Row 1: Tiers -->
        <div class="ac-shortcuts-row">
            <span class="nav-label">Usage:</span>
            <div class="ac-shortcuts">
                <button class="ac-shortcut-chip ${!currentTier1 ? 'active' : ''}" data-type="tier1" data-value="">All</button>
                ${tier1Options.map(opt => `
                    <button class="ac-shortcut-chip ${currentTier1 === opt ? 'active' : ''}" data-type="tier1" data-value="${esc(opt)}">
                        ${esc(opt)}
                    </button>
                `).join('')}
            </div>
        </div>

        <!-- Row 2: Groupings (Conditional) -->
        ${currentTier1 ? `
            <div class="ac-shortcuts-row">
                <span class="nav-label">Series:</span>
                <div class="ac-shortcuts ac-shortcuts-tier2">
                    <button class="ac-shortcut-chip ${!currentTier2 ? 'active' : ''}" data-type="tier2" data-value="">All</button>
                    ${tier2Options.map(opt => `
                        <button class="ac-shortcut-chip ${currentTier2 === opt ? 'active' : ''}" data-type="tier2" data-value="${esc(opt)}">
                            ${esc(opt)}
                        </button>
                    `).join('')}
                </div>
            </div>
        ` : ''}

        <!-- Row 3: Sources (Conditional) -->
        ${currentTier2 ? `
            <div class="ac-shortcuts-row">
                <span class="nav-label">Source:</span>
                <div class="ac-shortcuts ac-shortcuts-tier3">
                    ${tier3Options.map(cat => `
                        <button class="ac-shortcut-chip" data-type="scroll" data-target="monster-section-${cat.id}">
                            ${esc(cat.tier3)}
                        </button>
                    `).join('')}
                </div>
            </div>
        ` : ''}
    `;

    // Add event listeners to chips
    navContainer.querySelectorAll('.ac-shortcut-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const { type, value, target } = chip.dataset;

            if (type === 'tier1') {
                currentTier1 = value || null;
                currentTier2 = null; // Reset lower level
                renderMonsters();
            } else if (type === 'tier2') {
                currentTier2 = value || null;
                renderMonsters();
            } else if (type === 'scroll') {
                const element = document.getElementById(target);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
    });
}

/**
 * Filters the monster dataset based on a search term.
 * 
 * @param {string} term - The search string
 */
export function filterMonsters(term) {
    if (!term) {
        filteredMonsters = [...allMonsters];
    } else {
        const lower = term.toLowerCase();
        filteredMonsters = allMonsters.filter(m => 
            m.name.toLowerCase().includes(lower) ||
            m.source.toLowerCase().includes(lower) ||
            m.classification?.toLowerCase().includes(lower) ||
            m.cr?.toLowerCase().includes(lower) ||
            m.creature_type?.toLowerCase().includes(lower) ||
            m.notes_advice?.toLowerCase().includes(lower)
        );
    }
    renderMonsters();
}

/**
 * Shows the full detail for a specific Monster in a modal.
 * 
 * @param {Object} item - The monster record
 */
function showMonsterDetail(item) {
    const html = `
        <div class="detail-header">
            <span class="detail-category">${esc(item.category?.name || 'Monster')}</span>
            <h2 class="detail-title">${esc(item.name)}</h2>
        </div>

        <div class="detail-grid">
            <div class="detail-item">
                <label>Source</label>
                <value>${esc(item.source)}</value>
            </div>
            <div class="detail-item">
                <label>Classification</label>
                <value>${esc(item.classification || '—')}</value>
            </div>
            <div class="detail-item">
                <label>CR</label>
                <value>${esc(item.cr || '—')}</value>
            </div>
            <div class="detail-item">
                <label>Creature Type</label>
                <value>${esc(item.creature_type || '—')}</value>
            </div>
        </div>

        <div class="detail-section">
            <h4>Notes / Advice</h4>
            <div class="advice-content" style="white-space: pre-wrap;">${esc(item.notes_advice || 'No notes available.')}</div>
        </div>
    `;

    openModal(html);
}
