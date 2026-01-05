import { getLiveMonsters } from '../monster-service.js';

export async function renderMonsterLibrary(container) {
    // 1. Clean up layout from previous views
    const parentPage = container.closest('.page');
    if (parentPage) {
        parentPage.classList.remove('page-wide');
    }

    const monsters = await getLiveMonsters();

    // 2. Extract unique Species for the dropdown
    const uniqueSpecies = [...new Set(monsters.map(m => m.species).filter(Boolean))].sort();

    // 3. Render HTML matching style.css classes
    const html = `
        <h2>Monster Compendium</h2>
        
        <div class="filter-container">
            <div class="filter-group">
                <label for="name-search">Name:</label>
                <input type="text" id="name-search" class="filter-input" placeholder="Search by name...">
            </div>

            <div class="filter-group">
                <label for="species-filter">Species:</label>
                <select id="species-filter" class="filter-select">
                    <option value="">All Species</option>
                    ${uniqueSpecies.map(s => `<option value="${s}">${s}</option>`).join('')}
                </select>
            </div>
            
            <div class="filter-group">
                <label for="cr-min">CR From:</label>
                <input type="number" id="cr-min" class="filter-input" placeholder="Min" min="0" step="0.125">
            </div>

            <div class="filter-group">
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

    // 4. Initial Render
    renderGrid(monsters);

    // 5. Filter Logic
    const handleFilter = () => {
        const name = document.getElementById('name-search').value.toLowerCase();
        const species = document.getElementById('species-filter').value; // New
        const size = document.getElementById('size-filter').value;
        
        const minVal = document.getElementById('cr-min').value;
        const maxVal = document.getElementById('cr-max').value;
        const minCR = minVal === '' ? NaN : parseFloat(minVal);
        const maxCR = maxVal === '' ? NaN : parseFloat(maxVal);

        const filtered = monsters.filter(m => {
            const matchesName = m.name.toLowerCase().includes(name);
            const matchesSpecies = !species || m.species === species; // New
            const matchesSize = !size || m.size === size;
            
            const crVal = parseFloat(m.cr);
            // Treat empty input as "no limit"
            const matchesMin = isNaN(minCR) || crVal >= minCR;
            const matchesMax = isNaN(maxCR) || crVal <= maxCR;

            return matchesName && matchesSpecies && matchesSize && matchesMin && matchesMax;
        });

        renderGrid(filtered);
    };

    // 6. Attach Event Listeners
    const inputs = ['name-search', 'species-filter', 'cr-min', 'cr-max', 'size-filter'];
    inputs.forEach(id => {
        document.getElementById(id).addEventListener('input', handleFilter);
    });

    // Reset Button
    document.getElementById('reset-filters').addEventListener('click', () => {
        inputs.forEach(id => document.getElementById(id).value = '');
        handleFilter();
    });
}

function renderGrid(monsters) {
    const grid = document.getElementById('monster-grid');
    const countLabel = document.getElementById('monster-count');
    
    if (!grid) return;

    countLabel.textContent = `Showing ${monsters.length} monsters`;
    
    if (monsters.length === 0) {
        grid.innerHTML = '<p>No monsters found.</p>';
        return;
    }

    grid.innerHTML = monsters.map(m => `
        <div class="monster-card">
            ${m.image_url ? 
                `<div class="monster-card-image"><img src="${m.image_url}" alt="${m.name}" loading="lazy"></div>` 
                : ''}
            <div class="monster-card-content">
                <h3><a href="#/monster/${m.slug}">${m.name}</a></h3>
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