/**
 * ================================================================
 * AC MONSTERS MODULE
 * ================================================================
 * 
 * Data handling and presentation for the Monsters content set.
 * 
 * Responsibilities:
 * - Rendering the searchable monster bestiary.
 * - Implementing 3-tier navigation for monster types and sources.
 * - Handling monster-specific filtering and detailed statblock display.
 * 
 * @module ACMonsters
 */

import { getMonsters, getMonsterCategories } from './ac-service.js';
import { openModal, esc, formatSnippet, getUniqueSortedLabels } from './ac-ui-utils.js';

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
            tier2: (parts[1] && parts[1].toLowerCase() !== 'general') ? parts[1] : null,
            tier2_full: parts[1] || parts[0], // Keep original for jump labels
            tier3: (parts[2] && parts[2].toLowerCase() !== 'general') ? parts[2] : null
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

    // Create a map of category ID -> array of filtered items
    const itemMap = {};
    filteredMonsters.forEach(item => {
        const catId = (typeof item.category_id === 'object' ? item.category_id?.id : item.category_id) || item.category?.id;
        
        if (catId) {
            if (!itemMap[catId]) itemMap[catId] = [];
            itemMap[catId].push(item);
        }
    });

    renderMonsterNavigation(itemMap);

    const content = document.getElementById('monster-content');
    if (!content) return;

    // Filter categories to only those that have items matching the current search AND selection
    const activeCategories = monsterCategories.filter(cat => {
        if (currentTier1 && cat.tier1 !== currentTier1) return false;
        if (currentTier2 && cat.tier2 !== currentTier2) return false;
        return (itemMap[cat.id] || []).length > 0;
    });

    if (activeCategories.length === 0) {
        content.innerHTML = '<div class="ac-no-results">No monsters found matching your search.</div>';
        return;
    }

    // Render active categories sequentially
    content.innerHTML = activeCategories.map(cat => {
        const items = itemMap[cat.id] || [];
        const sectionId = `monster-section-${cat.id}`;
        
        return `
            <div class="ac-section-group">
                <div class="ac-section-title" id="${sectionId}">
                    <h2>${esc(cat.name)}</h2>
                    ${cat.notes ? `<div class="section-desc" style="white-space: pre-wrap;">${esc(cat.notes)}</div>` : ''}
                </div>
                
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
 * @param {Object} itemMap - Map of category ID to filtered items.
 */
function renderMonsterNavigation(itemMap = {}) {
    const navContainer = document.getElementById('monster-nav');
    if (!navContainer) return;

    // Filter chips to those that actually have items
    const tier1Options = getUniqueSortedLabels(monsterCategories, 'tier1');
    const tier2Options = currentTier1 
        ? getUniqueSortedLabels(monsterCategories.filter(c => c.tier1 === currentTier1), 'tier2')
        : [];
    
    // Dynamic Jump-links (Navigation Index)
    let jumpOptions = [];
    let jumpLabel = "Navigation:";

    if (currentTier1 && currentTier2) {
        // Specific Tier 2 selected -> Jump to Tier 3 sub-categories
        jumpLabel = "Source:";
        jumpOptions = monsterCategories.filter(c => 
            c.tier1 === currentTier1 && 
            c.tier2 === currentTier2 && 
            c.tier3 &&
            (itemMap[c.id] || []).length > 0
        ).map(c => ({ label: c.tier3, target: `monster-section-${c.id}` }));
    } else if (currentTier1) {
        // Tier 1 selected, Tier 2 is "All" -> Jump to Tier 2 group starts
        jumpLabel = "Jump to:";
        const t2Labels = getUniqueSortedLabels(monsterCategories.filter(c => c.tier1 === currentTier1), 'tier2_full');
        jumpOptions = t2Labels.map(t2 => {
            const firstCat = monsterCategories.find(c => c.tier1 === currentTier1 && c.tier2_full === t2);
            return { label: t2, target: `monster-section-${firstCat.id}` };
        });
    }

    navContainer.innerHTML = `
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

        ${currentTier1 && tier2Options.length > 0 ? `
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

        ${jumpOptions.length > 0 ? `
            <div class="ac-shortcuts-row">
                <span class="nav-label">${jumpLabel}</span>
                <div class="ac-shortcuts ac-shortcuts-tier3">
                    ${jumpOptions.map(opt => `
                        <button class="ac-shortcut-chip" data-type="scroll" data-target="${opt.target}">
                            ${esc(opt.label)}
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
