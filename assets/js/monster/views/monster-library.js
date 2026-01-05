/**
 * monster-library.js
 * * View controller for the main monster list (Library).
 * Handles:
 * 1. Fetching the full list of live monsters.
 * 2. Generating dynamic filter options (Species, Usage, Tags, Habitats).
 * 3. Rendering the filter UI and the monster grid.
 * 4. Client-side filtering logic.
 */

import { getLiveMonsters } from '../monster-service.js';

/**
 * Main render function for the Library View.
 * @param {HTMLElement} container - The DOM element to render content into.
 */
export async function renderMonsterLibrary(container) {
    // 1. View Cleanup
    const parentPage = container.closest('.page');
    if (parentPage) {
        parentPage.classList.remove('page-wide');
    }

    // 2. Data Fetching
    const monsters = await getLiveMonsters();

    // 3. Dynamic Filter Generation
    // Species & Usage
    const uniqueSpecies = [...new Set(monsters.map(m => m.species).filter(Boolean))].sort();
    const uniqueUsage = [...new Set(monsters.map(m => m.usage).filter(Boolean))].sort();

    // Tags: Flatten all tag arrays, remove nulls, get unique values
    const uniqueTags = [...new Set(
        monsters.flatMap(m => m.tags || [])
    )].sort();

    // Habitats: Flatten all habitat arrays (prepared in service), remove nulls
    const uniqueHabitats = [...new Set(
        monsters.flatMap(m => m.habitats || [])
    )].sort();

    // 4. Render Layout
    const html = `
        <h2>Monster Compendium</h2>
        
        <div class="filter-container">
            <div class="filter-group" style="flex: 2 0 300px;">
                <label for="name-search">Name:</label>
                <input type="text" id="name-search" class="filter-input" placeholder="Search by name...">
            </div>

            <div class="filter-group" style="flex: 2 0 300px;">
                <label for="usage-filter">Usage:</label>
                <select id="usage-filter" class="filter-select">
                    <option value="">All Usage</option>
                    ${uniqueUsage.map(u => `<option value="${u}">${u}</option>`).join('')}
                </select>
            </div>

            <div class="filter-group">
                <label for="species-filter">Species:</label>
                <select id="species-filter" class="filter-select">
                    <option value="">All Species</option>
                    ${uniqueSpecies.map(s => `<option value="${s}">${s}</option>`).join('')}
                </select>
            </div>

            <div class="filter-group" style="flex: 1 0 150px;">
                <label for="habitat-filter">Habitat:</label>
                <select id="habitat-filter" class="filter-select">
                    <option value="">All Habitats</option>
                    ${uniqueHabitats.map(h => `<option value="${h}">${h}</option>`).join('')}
                </select>
            </div>

            <div class="filter-group" style="flex: 1 0 150px;">
                <label for="tag-filter">Tag:</label>
                <select id="tag-filter" class="filter-select">
                    <option value="">All Tags</option>
                    ${uniqueTags.map(t => `<option value="${t}">${t}</option>`).join('')}
                </select>
            </div>
            
            <div class="filter-group" style="flex: 0 1 100px;">
                <label for="cr-min">CR From:</label>
                <input type="number" id="cr-min" class="filter-input" placeholder="Min" min="0" step="0.125">
            </div>

            <div class="filter-group" style="flex: 0 1 100px;">
                <label for="cr-max">CR To:</label>
                <input type="number" id="cr-max" class="filter-input" placeholder="Max" min="0" step="0.125">
            </div>

            <div class="filter-group">
                <label for="size-filter">Size:</label>
                <select id="size-filter" class="filter-select">
                    <option value="">All Sizes</option>
                    <option value="Tiny">Tiny</option>
                    <option value="Small">Small</option>
                    <option value="Medium">Medium</option>
                    <option value="Large">Large</option>
                    <option value="Huge">Huge</option>
                    <option value="Gargantuan">Gargantuan</option>
                </select>
            </div>

            <button id="reset-filters" class="reset-button">Reset</button>
        </div>

        <div id="monster-count" class="monster-count"></div>
        <div id="monster-grid" class="monster-list"></div>
    `;

    container.innerHTML = html;

    // 5. Initial Render of the Grid
    renderGrid(monsters);

    // 6. Define Filter Logic
    const handleFilter = () => {
        // Gather values
        const name = document.getElementById('name-search').value.toLowerCase();
        const usage = document.getElementById('usage-filter').value;
        const species = document.getElementById('species-filter').value;
        const habitat = document.getElementById('habitat-filter').value; // New
        const tag = document.getElementById('tag-filter').value;         // New
        const size = document.getElementById('size-filter').value;
        
        const minVal = document.getElementById('cr-min').value;
        const maxVal = document.getElementById('cr-max').value;
        const minCR = minVal === '' ? NaN : parseFloat(minVal);
        const maxCR = maxVal === '' ? NaN : parseFloat(maxVal);

        // Apply filters
        const filtered = monsters.filter(m => {
            const matchesName = m.name.toLowerCase().includes(name);
            const matchesUsage = !usage || m.usage === usage;
            const matchesSpecies = !species || m.species === species;
            const matchesSize = !size || m.size === size;
            
            // Habitat Check (Array includes)
            const matchesHabitat = !habitat || (m.habitats && m.habitats.includes(habitat));
            
            // Tag Check (Array includes)
            const matchesTag = !tag || (m.tags && m.tags.includes(tag));
            
            const crVal = parseFloat(m.cr);
            const matchesMin = isNaN(minCR) || crVal >= minCR;
            const matchesMax = isNaN(maxCR) || crVal <= maxCR;

            return matchesName && matchesUsage && matchesSpecies && matchesSize && matchesHabitat && matchesTag && matchesMin && matchesMax;
        });

        renderGrid(filtered);
    };

    // 7. Attach Event Listeners
    if(document.getElementById('name-search')) {
        const inputs = [
            'name-search', 'usage-filter', 'species-filter', 
            'habitat-filter', 'tag-filter', // New inputs
            'cr-min', 'cr-max', 'size-filter'
        ];
        
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.addEventListener('input', handleFilter);
        });

        document.getElementById('reset-filters').addEventListener('click', () => {
            inputs.forEach(id => {
                const el = document.getElementById(id);
                if(el) el.value = '';
            });
            handleFilter();
        });
    }
}

/**
 * Renders the grid of monster cards.
 * @param {Array} monsters - The filtered list of monsters to display.
 */
function renderGrid(monsters) {
    const grid = document.getElementById('monster-grid');
    const countLabel = document.getElementById('monster-count');
    
    if (!grid) return;

    countLabel.textContent = `Showing ${monsters.length} monsters`;
    
    if (monsters.length === 0) {
        grid.innerHTML = '<p>No monsters found.</p>';
        return;
    }

    // Render Cards
    grid.innerHTML = monsters.map(m => `
        <div class="monster-card">
            ${m.image_url ? 
                `<div class="monster-card-image">
                    <img src="${m.image_url}" alt="${m.name}" loading="lazy">
                 </div>` 
                : ''
            }
            
            <div class="monster-card-content">
                <h3><a href="#/${m.slug}">${m.name}</a></h3>
                <p class="monster-cr">CR ${formatCR(m.cr)}</p>
                <p class="monster-type">${m.size} ${m.species}</p>
                </div>
        </div>
    `).join('');
}

/**
 * Helper to format Challenge Rating (CR) into standard D&D fractions.
 * @param {number} val - The CR value.
 * @returns {string|number} - Formatted string (e.g., "1/4") or the original number.
 */
function formatCR(val) {
    if (val === 0.125) return '1/8';
    if (val === 0.25) return '1/4';
    if (val === 0.5) return '1/2';
    return val;
}