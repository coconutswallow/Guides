/**
 * monster-library.js
 * * View controller for the Monster Library (Home/Search).
 * Handles:
 * 1. Fetching all live monsters.
 * 2. Generating dynamic filter options (unique tags/habitats).
 * 3. Client-side filtering and rendering.
 */

import { getLiveMonsters } from '../monster-service.js';

let allMonsters = []; // Local cache for filtering

export async function renderMonsterLibrary(container) {
    container.innerHTML = '<div class="loading">Loading library...</div>';
    
    // 1. Fetch Data
    allMonsters = await getLiveMonsters();

    // 2. Extract Unique Values for Dropdowns
    const uniqueSpecies = [...new Set(allMonsters.map(m => m.species).filter(Boolean))].sort();
    const uniqueUsage = [...new Set(allMonsters.map(m => m.usage).filter(Boolean))].sort();
    
    // Flatten all tags/habitats arrays into a single list of unique values
    const uniqueTags = [...new Set(allMonsters.flatMap(m => m.tags))].sort();
    const uniqueHabitats = [...new Set(allMonsters.flatMap(m => m.habitats))].sort();

    // 3. Render Layout
    // We inject the <style> block at the bottom to ensure layout works even if external CSS fails
    const template = `
        <div class="library-header">
            <h1>Monster Library</h1>
            <p>Explore the compendium of creatures.</p>
        </div>

        <div class="filter-container">
            <div class="filter-group">
                <label>Search</label>
                <input type="text" id="filter-name" placeholder="Search by name...">
            </div>

            <div class="filter-group">
                <label>CR Range</label>
                <div style="display: flex; gap: 0.5rem;">
                    <input type="number" id="filter-cr-min" placeholder="Min" step="0.125" min="0" style="width: 70px;">
                    <input type="number" id="filter-cr-max" placeholder="Max" step="0.125" min="0" style="width: 70px;">
                </div>
            </div>

            <div class="filter-group">
                <label>Size</label>
                <select id="filter-size">
                    <option value="">Any Size</option>
                    <option value="Tiny">Tiny</option>
                    <option value="Small">Small</option>
                    <option value="Medium">Medium</option>
                    <option value="Large">Large</option>
                    <option value="Huge">Huge</option>
                    <option value="Gargantuan">Gargantuan</option>
                </select>
            </div>

            <div class="filter-group">
                <label>Species</label>
                <select id="filter-species">
                    <option value="">Any Species</option>
                    ${uniqueSpecies.map(s => `<option value="${s}">${s}</option>`).join('')}
                </select>
            </div>

            <div class="filter-group">
                <label>Habitat</label>
                <select id="filter-habitat">
                    <option value="">Any Habitat</option>
                    ${uniqueHabitats.map(h => `<option value="${h}">${h}</option>`).join('')}
                </select>
            </div>

            <div class="filter-group">
                <label>Tag</label>
                <select id="filter-tag">
                    <option value="">Any Tag</option>
                    ${uniqueTags.map(t => `<option value="${t}">${t}</option>`).join('')}
                </select>
            </div>
            
             <div class="filter-group">
                <label>Usage</label>
                <select id="filter-usage">
                    <option value="">Any Usage</option>
                    ${uniqueUsage.map(u => `<option value="${u}">${u}</option>`).join('')}
                </select>
            </div>
        </div>

        <div id="monster-grid" class="monster-grid">
            </div>

        <style>
            /* --- INJECTED LAYOUT STYLES --- */
            
            /* 1. Header & Page */
            .library-header {
                text-align: center;
                margin-bottom: 2rem;
            }

            /* 2. Filters Layout */
            .filter-container {
                display: flex;
                flex-wrap: wrap;
                gap: 1rem;
                background: #f8f9fa; /* Light gray background */
                padding: 1.5rem;
                border-radius: 8px;
                margin-bottom: 2rem;
                align-items: flex-end;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }

            .filter-group {
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
                flex: 1 1 auto; /* Allow items to grow/shrink properly */
            }

            .filter-group label {
                font-size: 0.8rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #555;
            }

            .filter-group input, 
            .filter-group select {
                padding: 0.6rem;
                border: 1px solid #ced4da;
                border-radius: 4px;
                font-size: 0.95rem;
                background-color: white;
            }

            /* 3. Grid Layout */
            .monster-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                gap: 2rem;
                padding-bottom: 3rem;
            }

            .monster-card {
                background: white;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                overflow: hidden;
                text-decoration: none;
                color: inherit;
                display: flex;
                flex-direction: column;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                height: 100%;
            }

            .monster-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 10px 20px rgba(0,0,0,0.1);
                border-color: #b0b0b0;
            }

            /* 4. Thumbnail Fixes */
            .card-image {
                height: 180px; /* Force consistent height */
                width: 100%;
                background-color: #eee;
                overflow: hidden;
                position: relative;
            }

            .card-image img {
                width: 100%;
                height: 100%;
                object-fit: cover; /* Crop image to fill container */
                object-position: top center;
            }

            .card-image.placeholder {
                display: flex;
                align-items: center;
                justify-content: center;
                color: #aaa;
                font-size: 2rem;
                background: #f0f0f0;
            }
            .card-image.placeholder::after {
                content: '🐉'; /* Simple fallback icon */
            }

            /* 5. Card Content */
            .card-content {
                padding: 1.25rem;
                display: flex;
                flex-direction: column;
                flex-grow: 1;
            }

            .card-content h3 {
                margin: 0 0 0.5rem 0;
                font-size: 1.25rem;
                color: #333;
            }

            .card-meta {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.75rem;
                font-size: 0.9rem;
                color: #666;
            }

            .cr-badge {
                background: #e9ecef;
                padding: 0.25rem 0.6rem;
                border-radius: 4px;
                font-weight: bold;
                color: #495057;
            }

            .species-text {
                font-style: italic;
            }

            .card-tags {
                margin-top: auto; /* Push to bottom */
                padding-top: 0.75rem;
                border-top: 1px solid #eee;
                font-size: 0.85rem;
                color: #888;
            }
        </style>
    `;

    container.innerHTML = template;

    // 4. Initial Render & Event Listeners
    renderGrid(allMonsters);
    setupEventListeners();
}

/**
 * Filter Logic
 */
function setupEventListeners() {
    const inputs = document.querySelectorAll('.filter-container input, .filter-container select');
    inputs.forEach(input => {
        input.addEventListener('input', applyFilters);
        input.addEventListener('change', applyFilters);
    });
}

function applyFilters() {
    const nameVal = document.getElementById('filter-name').value.toLowerCase();
    const sizeVal = document.getElementById('filter-size').value;
    const speciesVal = document.getElementById('filter-species').value;
    const usageVal = document.getElementById('filter-usage').value;
    const habitatVal = document.getElementById('filter-habitat').value;
    const tagVal = document.getElementById('filter-tag').value;
    
    const minCR = parseFloat(document.getElementById('filter-cr-min').value);
    const maxCR = parseFloat(document.getElementById('filter-cr-max').value);

    const filtered = allMonsters.filter(m => {
        // Name Search
        if (nameVal && !m.name.toLowerCase().includes(nameVal)) return false;
        
        // Exact Matches
        if (sizeVal && m.size !== sizeVal) return false;
        if (speciesVal && m.species !== speciesVal) return false;
        if (usageVal && m.usage !== usageVal) return false;

        // Array Includes Logic (Many-to-Many)
        // If monster.habitats includes the selected habitat value
        if (habitatVal && (!m.habitats || !m.habitats.includes(habitatVal))) return false;
        
        // If monster.tags includes the selected tag value
        if (tagVal && (!m.tags || !m.tags.includes(tagVal))) return false;

        // CR Range
        if (!isNaN(minCR) && m.cr < minCR) return false;
        if (!isNaN(maxCR) && m.cr > maxCR) return false;

        return true;
    });

    renderGrid(filtered);
}

/**
 * Render Grid Cards
 */
function renderGrid(monsters) {
    const grid = document.getElementById('monster-grid');
    
    if (monsters.length === 0) {
        grid.innerHTML = '<p class="no-results" style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #666;">No monsters found matching your criteria.</p>';
        return;
    }

    grid.innerHTML = monsters.map(m => {
        // Format CR (0.125 -> 1/8)
        let crDisplay = m.cr;
        if (m.cr === 0.125) crDisplay = '1/8';
        else if (m.cr === 0.25) crDisplay = '1/4';
        else if (m.cr === 0.5) crDisplay = '1/2';

        return `
        <a href="#/${m.slug}" class="monster-card">
            ${m.image_url 
                ? `<div class="card-image"><img loading="lazy" src="${m.image_url}" alt="${m.name}"></div>` 
                : `<div class="card-image placeholder"></div>`
            }
            <div class="card-content">
                <h3>${m.name}</h3>
                <div class="card-meta">
                    <span class="cr-badge">CR ${crDisplay}</span>
                    <span class="species-text">${m.size} ${m.species}</span>
                </div>
                ${m.habitats && m.habitats.length > 0 
                    ? `<div class="card-tags"><small>🏝️ ${m.habitats[0]}${m.habitats.length > 1 ? ` +${m.habitats.length-1}` : ''}</small></div>` 
                    : ''
                }
            </div>
        </a>
        `;
    }).join('');
}