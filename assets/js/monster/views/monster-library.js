import { getLiveMonsters } from '../monster-service.js';

export async function renderMonsterLibrary(container) {
    const monsters = await getLiveMonsters();
    
    // HTML Template for Filters
    const html = `
        <h2>Monster Compendium</h2>
        <div class="filter-container">
            <div class="filter-group">
                <label>Name:</label>
                <input type="text" id="name-search" class="filter-input" placeholder="Search...">
            </div>
            <div class="filter-group">
                <label>CR Range:</label>
                <div style="display:flex; gap:5px;">
                    <input type="number" id="cr-min" class="filter-input" placeholder="Min" step="0.125">
                    <input type="number" id="cr-max" class="filter-input" placeholder="Max" step="0.125">
                </div>
            </div>
            <div class="filter-group">
                <label>Size:</label>
                <select id="size-filter" class="filter-select">
                    <option value="">All</option>
                    <option value="Tiny">Tiny</option>
                    <option value="Small">Small</option>
                    <option value="Medium">Medium</option>
                    <option value="Large">Large</option>
                    <option value="Huge">Huge</option>
                    <option value="Gargantuan">Gargantuan</option>
                </select>
            </div>
        </div>
        <div id="monster-grid" class="monster-list"></div>
    `;

    container.className = 'page'; // Standard width
    container.innerHTML = html;

    // Initial Render
    renderGrid(monsters);

    // Filter Logic
    const handleFilter = () => {
        const name = document.getElementById('name-search').value.toLowerCase();
        const minCR = parseFloat(document.getElementById('cr-min').value);
        const maxCR = parseFloat(document.getElementById('cr-max').value);
        const size = document.getElementById('size-filter').value;

        const filtered = monsters.filter(m => {
            const matchesName = m.Name.toLowerCase().includes(name);
            const matchesSize = !size || m.Size === size;
            
            const crVal = parseFloat(m.CR);
            const matchesMin = isNaN(minCR) || crVal >= minCR;
            const matchesMax = isNaN(maxCR) || crVal <= maxCR;

            return matchesName && matchesSize && matchesMin && matchesMax;
        });

        renderGrid(filtered);
    };

    // Attach Listeners
    ['name-search', 'cr-min', 'cr-max', 'size-filter'].forEach(id => {
        document.getElementById(id).addEventListener('input', handleFilter);
    });
}

function renderGrid(monsters) {
    const grid = document.getElementById('monster-grid');
    if (monsters.length === 0) {
        grid.innerHTML = '<p>No monsters found.</p>';
        return;
    }

    grid.innerHTML = monsters.map(m => `
        <div class="monster-card">
            ${m.Image_URL ? 
                `<div class="monster-card-image"><img src="${m.Image_URL}" alt="${m.Name}" loading="lazy"></div>` 
                : ''}
            <div class="monster-card-content">
                <h3><a href="#/monster/${m.Slug}">${m.Name}</a></h3>
                <p class="monster-cr">CR ${formatCR(m.CR)}</p>
                <p class="monster-type">${m.Size} ${m.Species}</p>
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