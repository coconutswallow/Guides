/**
 * ================================================================
 * AC OTHER REWARDS MODULE
 * ================================================================
 * 
 * Logic for the Other Rewards content set. Handles:
 * - Table rendering grouped by Category
 * - Explicit rendering of empty categories (headers/notes only)
 * - Reward-specific filtering and search
 * - Record detail generation
 */

import { getOtherRewards, getOtherRewardsCategories } from './ac-service.js';
import { openModal, esc, formatSnippet } from './ac-ui-utils.js';

let allRewards = [];
let rewardCategories = [];
let filteredRewards = [];

/**
 * Initializes the Other Rewards view.
 */
export async function initOtherRewards() {
    const container = document.getElementById('ac-view-other-rewards');
    if (!container) return;

    // Show loading state if empty
    if (allRewards.length === 0) {
        container.innerHTML = `
            <div class="ac-loading">
                <div class="spinner"></div>
                <span>Gathering Rewards...</span>
            </div>
        `;
    }

    // Fetch both categories and items in parallel
    const [categories, items] = await Promise.all([
        getOtherRewardsCategories(),
        getOtherRewards()
    ]);

    console.log(`AC Other Rewards: Found ${categories.length} categories and ${items.length} items.`);

    rewardCategories = categories;
    allRewards = items;
    filteredRewards = [...allRewards];

    renderOtherRewards();
}

/**
 * Renders the Other Rewards view.
 */
function renderOtherRewards() {
    const container = document.getElementById('ac-view-other-rewards');
    if (!container) return;

    // Clear and build header area
    container.innerHTML = `
        <div class="ac-table-header">
            <div class="ac-filters" id="reward-filters"></div>
            <div class="ac-stats" id="reward-stats">
                ${filteredRewards.length} Rewards found
            </div>
        </div>
        <div id="reward-content" class="ac-sections-container"></div>
    `;

    const content = document.getElementById('reward-content');

    // Create a map of category ID -> array of filtered items
    const itemMap = {};
    filteredRewards.forEach(item => {
        const catId = (typeof item.category_id === 'object' ? item.category_id?.id : item.category_id) || item.category?.id;
        
        if (catId) {
            if (!itemMap[catId]) itemMap[catId] = [];
            itemMap[catId].push(item);
        }
    });

    // Render Shortcut Chips (Top Level Only)
    const filtersContainer = document.getElementById('reward-filters');
    if (filtersContainer) {
        const topLevelMap = new Map();
        rewardCategories.forEach(cat => {
            const topName = cat.name.split(' - ')[0];
            if (!topLevelMap.has(topName)) {
                topLevelMap.set(topName, `reward-section-${cat.id}`);
            }
        });

        filtersContainer.innerHTML = `
            <div class="ac-shortcuts">
                ${Array.from(topLevelMap.entries()).map(([name, targetId]) => `
                    <button class="ac-shortcut-chip" data-target="${targetId}">
                        ${esc(name)}
                    </button>
                `).join('')}
            </div>
        `;

        filtersContainer.querySelectorAll('.ac-shortcut-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const targetId = chip.dataset.target;
                const element = document.getElementById(targetId);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }

    // Render all categories sequentially
    content.innerHTML = rewardCategories.map(cat => {
        const items = itemMap[cat.id] || [];
        const sectionId = `reward-section-${cat.id}`;
        
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
                                    <th class="col-name">Reward Name</th>
                                    <th class="col-source hide-mobile">Source</th>
                                    <th class="col-type hide-tablet">Type</th>
                                    <th class="col-tier hide-tablet">Tier</th>
                                    <th class="col-description hide-mobile">Description</th>
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
                                        <td class="col-type hide-tablet">${esc(item.type || '—')}</td>
                                        <td class="col-tier hide-tablet">${esc(item.tier || '—')}</td>
                                        <td class="col-description hide-mobile">${formatSnippet(item.description)}</td>
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
            const reward = allRewards.find(r => r.id === id);
            if (reward) showRewardDetail(reward);
        });
    });
}

/**
 * Filters the reward dataset based on a search term.
 * 
 * @param {string} term - The search string
 */
export function filterOtherRewards(term) {
    if (!term) {
        filteredRewards = [...allRewards];
    } else {
        const lower = term.toLowerCase();
        filteredRewards = allRewards.filter(r => 
            r.name.toLowerCase().includes(lower) ||
            r.source.toLowerCase().includes(lower) ||
            r.description?.toLowerCase().includes(lower) ||
            r.notes_advice?.toLowerCase().includes(lower) ||
            r.type?.toLowerCase().includes(lower) ||
            r.tier?.toLowerCase().includes(lower)
        );
    }
    renderOtherRewards();
}

/**
 * Shows the full detail for a specific Reward item in a modal.
 * 
 * @param {Object} item - The reward record
 */
function showRewardDetail(item) {
    const html = `
        <div class="detail-header">
            <span class="detail-category">${esc(item.category?.name || 'Other Reward')}</span>
            <h2 class="detail-title">${esc(item.name)}</h2>
        </div>

        <div class="detail-grid">
            <div class="detail-item">
                <label>Source</label>
                <value>${esc(item.source)}</value>
            </div>
            <div class="detail-item">
                <label>Type / Tier</label>
                <value>${esc(item.type || '—')} / ${esc(item.tier || '—')}</value>
            </div>
        </div>

        <div class="detail-section">
            <h4>Description</h4>
            <p style="white-space: pre-wrap;">${esc(item.description || 'No description available.')}</p>
        </div>

        ${item.notes_advice ? `
        <div class="detail-section">
            <h4>Notes / Advice</h4>
            <div class="advice-content" style="white-space: pre-wrap;">${esc(item.notes_advice)}</div>
        </div>
        ` : ''}
    `;

    openModal(html);
}
