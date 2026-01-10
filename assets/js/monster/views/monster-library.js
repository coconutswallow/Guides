/**
 * monster-library.js
 * View controller for the main monster list (Library).
 * Includes filtering, sorting, and dynamic grid rendering.
 * Location: \assets\js\monster\views\monster-library.js
 */

import { getMonsters, getMonsterLookups } from '../../monster/monster-service.js';

export async function renderMonsterLibrary(container) {
    // 1. View Cleanup
    const parentPage = container.closest('.page');
    if (parentPage) {
        parentPage.classList.remove('page-wide');
    }

    // 2. Data Fetching (Parallel fetch for speed)
    const [monsters, lookups] = await Promise.all([
        getMonsters(),
        getMonsterLookups()
    ]);

    // 3. Prepare Dropdown Options
    // Maps the database lookup objects to simple arrays or keeps them if the structure matches
    const speciesOptions = lookups?.species || [];
    const usageOptions = lookups?.usages || [];
    const sizeOptions = lookups?.sizes || [];

    // 4. Render Layout
    const html = `
        <h2>Monster Compendium</h2>
        
        <div style="margin-bottom: 1.5rem;">
            <p>The monsters in this compendium have been created by various members of the community of the Hawthorne Dungeons & Dragons Guild. The credits are listed on the footer of the monster stat block.</p>
            <p><em>(A tool to create and submit your own monsters is coming soon!)</em></p>
        </div>
        
        <div class="filter-container" style="display: flex; flex-direction: row; flex-wrap: wrap; gap: 10px; align-items: flex-end; width: 100%;">
            
            <div class="filter-group" style="flex: 4 1 200px;">
                <label for="name-search">Name:</label>
                <input type="text" id="name-search" class="filter-input" placeholder="Search...">
            </div>

            <div class="filter-group" style="flex: 3 1 160px;">
                <label for="usage-filter">Usage:</label>
                <select id="usage-filter" class="filter-select">
                    <option value="">All Usage</option>
                    ${usageOptions.map(u => `<option value="${u.value}">${u.value}</option>`).join('')}
                </select>
            </div>

            <div class="filter-group" style="flex: 2 1 140px;">
                <label for="species-filter">Species:</label>
                <select id="species-filter" class="filter-select">
                    <option value="">All Species</option>
                    ${speciesOptions.map(s => `<option value="${s.value}">${s.value}</option>`).join('')}
                </select>
            </div>
            
            <div class="filter-group" style="flex: 0.5 1 55px;">
                <label for="cr-min">Min CR:</label>
                <input type="number" id="cr-min" class="filter-input" placeholder="0" min="0" step="0.125">
            </div>

            <div class="filter-group" style="flex: 0.5 1 55px;">
                <label for="cr-max">Max CR:</label>
                <input type="number" id="cr-max" class="filter-input" placeholder="30" min="0" step="0.125">
            </div>

            <div class="filter-group" style="flex: 1.5 1 100px;">
                <label for="size-filter">Size:</label>
                <select id="size-filter" class="filter-select">
                    <option value="">All</option>
                    ${sizeOptions.map(sz => `<option value="${sz.value}">${sz.value}</option>`).join('')}
                </select>
            </div>

            <button id="reset-filters" class="reset-button" style="flex: 0 0 auto; height: 38px; margin-bottom: 2px;">Reset</button>
        </div>

        <div id="monster-count" class="monster-count"></div>
        <div id="monster-grid" class="monster-list"></div>
    `;

    container.innerHTML = html;

    // 5. Initial Render of the Grid
    renderGrid(monsters);

    // 6. Define Filter Logic
    const handleFilter = () => {
        // Gather inputs
        const name = document.getElementById('name-search').value.toLowerCase();
        const usage = document.getElementById('usage-filter').value;
        const species = document.getElementById('species-filter').value;
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
            
            const crVal = parseFloat(m.cr);
            const matchesMin = isNaN(minCR) || crVal >= minCR;
            const matchesMax = isNaN(maxCR) || crVal <= maxCR;

            return matchesName && matchesUsage && matchesSpecies && matchesSize && matchesMin && matchesMax;
        });

        renderGrid(filtered);
    };

    // 7. Attach Event Listeners
    if(document.getElementById('name-search')) {
        const inputs = [
            'name-search', 'usage-filter', 'species-filter', 
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

function renderGrid(monsters) {
    const grid = document.getElementById('monster-grid');
    const countLabel = document.getElementById('monster-count');
    
    if (!grid) return;

    countLabel.textContent = `Showing ${monsters.length} monsters`;
    
    if (monsters.length === 0) {
        grid.innerHTML = '<p>No monsters found matching your criteria.</p>';
        return;
    }

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

// Helper to format Challenge Rating
function formatCR(val) {
    if (val === 0.125) return '1/8';
    if (val === 0.25) return '1/4';
    if (val === 0.5) return '1/2';
    return val;
}