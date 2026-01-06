/**
 * monster-library.js
 * * View controller for the main monster list (Library).
 * * UPDATED: Tag container is now compact (single-line height) to match other inputs.
 */

import { getLiveMonsters } from '../monster-service.js';

export async function renderMonsterLibrary(container) {
    // 1. View Cleanup
    const parentPage = container.closest('.page');
    if (parentPage) {
        parentPage.classList.remove('page-wide');
    }

    // 2. Data Fetching
    const monsters = await getLiveMonsters();

    // 3. Dynamic Filter Generation
    const uniqueSpecies = [...new Set(monsters.map(m => m.species).filter(Boolean))].sort();
    const uniqueUsage = [...new Set(monsters.map(m => m.usage).filter(Boolean))].sort();
    const uniqueHabitats = [...new Set(monsters.flatMap(m => m.habitats || []))].sort();
    const uniqueTags = [...new Set(monsters.flatMap(m => m.tags || []))].sort();

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

            <div class="filter-group" style="flex: 1 0 200px; display: flex; flex-direction: column;">
                <label>Tags (Select multiple):</label>
                <div id="tag-container" style="
                    height: 40px;            /* Matches standard input height */
                    resize: vertical;        /* UPDATED: Allows user to drag height */
                    overflow-y: auto; 
                    border: 1px solid var(--color-line, #ccc); 
                    background: var(--color-bg, #fff); 
                    padding: 6px 0.5rem;     /* Adjusted padding for alignment */
                    border-radius: 4px;
                ">
                    ${uniqueTags.length > 0 ? uniqueTags.map(t => `
                        <label style="display: block; cursor: pointer; margin-bottom: 2px; font-size: 0.9em; white-space: nowrap;">
                            <input type="checkbox" value="${t}" class="tag-checkbox" style="margin-right: 5px;">${t}
                        </label>
                    `).join('') : '<span style="color: #888; font-style: italic; font-size: 0.8em;">No tags</span>'}
                </div>
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
        // Gather standard inputs
        const name = document.getElementById('name-search').value.toLowerCase();
        const usage = document.getElementById('usage-filter').value;
        const species = document.getElementById('species-filter').value;
        const habitat = document.getElementById('habitat-filter').value;
        const size = document.getElementById('size-filter').value;
        
        const minVal = document.getElementById('cr-min').value;
        const maxVal = document.getElementById('cr-max').value;
        const minCR = minVal === '' ? NaN : parseFloat(minVal);
        const maxCR = maxVal === '' ? NaN : parseFloat(maxVal);

        // Gather Multi-Select Tags
        const checkedBoxes = document.querySelectorAll('.tag-checkbox:checked');
        const selectedTags = Array.from(checkedBoxes).map(cb => cb.value);

        // Apply filters
        const filtered = monsters.filter(m => {
            const matchesName = m.name.toLowerCase().includes(name);
            const matchesUsage = !usage || m.usage === usage;
            const matchesSpecies = !species || m.species === species;
            const matchesSize = !size || m.size === size;
            
            const matchesHabitat = !habitat || (m.habitats && m.habitats.includes(habitat));
            
            // Tag Logic: OR logic (monster has ANY of the selected tags)
            // You can switch to .every() for AND logic if preferred.
            const matchesTags = selectedTags.length === 0 || (
                m.tags && selectedTags.every(t => m.tags.includes(t))
            );

            const crVal = parseFloat(m.cr);
            const matchesMin = isNaN(minCR) || crVal >= minCR;
            const matchesMax = isNaN(maxCR) || crVal <= maxCR;

            return matchesName && matchesUsage && matchesSpecies && matchesSize && 
                   matchesHabitat && matchesTags && matchesMin && matchesMax;
        });

        renderGrid(filtered);
    };

    // 7. Attach Event Listeners
    if(document.getElementById('name-search')) {
        const inputs = [
            'name-search', 'usage-filter', 'species-filter', 
            'habitat-filter', 'cr-min', 'cr-max', 'size-filter'
        ];
        
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.addEventListener('input', handleFilter);
        });

        document.querySelectorAll('.tag-checkbox').forEach(cb => {
            cb.addEventListener('change', handleFilter);
        });

        document.getElementById('reset-filters').addEventListener('click', () => {
            inputs.forEach(id => {
                const el = document.getElementById(id);
                if(el) el.value = '';
            });
            document.querySelectorAll('.tag-checkbox').forEach(cb => cb.checked = false);
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

function formatCR(val) {
    if (val === 0.125) return '1/8';
    if (val === 0.25) return '1/4';
    if (val === 0.5) return '1/2';
    return val;
}