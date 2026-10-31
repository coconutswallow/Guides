/**
 * monster-library.js
 * View controller for the main monster list (Library).
 * Includes filtering, sorting, and dynamic grid rendering.
 * Location: \assets\js\monster\views\monster-library.js
 */

import { getMonsters, getMonsterLookups } from '../../monster/monster-service.js';
import { escapeHTML, sanitizeUrl } from '../monster-utils.js';

export async function renderMonsterLibrary(container) {
    // 1. View Cleanup
    const parentPage = container.closest('.page');
    if (parentPage) {
        parentPage.classList.remove('page-wide');
    }

    // 2. Data Fetching (Parallel fetch for speed with error propagation)
    let monsters = [];
    let lookups = {};
    try {
        [monsters, lookups] = await Promise.all([
            getMonsters(),
            getMonsterLookups()
        ]);
    } catch (err) {
        container.innerHTML = `
            <h2>Monster Compendium</h2>
            <div class="alert alert-danger" style="margin: 2rem 0; padding: 1.5rem; border: 2px solid var(--color-primary); background: var(--color-bg-page);">
                <p><strong>Failed to load monsters:</strong> ${escapeHTML(err.message || 'Unable to retrieve monsters from database')}.</p>
                <button type="button" class="btn btn-primary" onclick="window.location.reload()" style="margin-top: 0.5rem; cursor: pointer; padding: 0.5rem 1rem;">Retry</button>
            </div>
        `;
        return;
    }

    // 3. Prepare Dropdown Options
    // Maps the database lookup objects to simple arrays or keeps them if the structure matches
    const speciesOptions = lookups?.species || [];
    const usageOptions = lookups?.usages || [];
    const sizeOptions = lookups?.sizes || [];
    // Sort tags alphabetically (case-insensitive)
    const tagOptions = [...(lookups?.tags || [])].sort((a, b) => 
        (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
    );

    // Selected Tags State (Set of tag names)
    const selectedTags = new Set();

    // 4. Render Layout
    const html = `
        <h2>Monster Compendium</h2>
        
        <div style="margin-bottom: 1.5rem;">
            <p>The monsters in this compendium have been created by various members of the community of the Hawthorne Dungeons & Dragons Guild. The credits are listed on the footer of the monster stat block.</p>
            <p>You can use this <a href="/Guides/monsters/editor/"><b>Monster Creator Tool</b></a> to create and submit your own monsters for community use!</p>
        </div>
        
        <div class="filter-container" style="display: flex; flex-direction: row; flex-wrap: wrap; gap: 10px; align-items: flex-end; width: 100%;">
            
            <div class="filter-group" style="flex: 3.5 1 180px;">
                <label for="name-search">Name:</label>
                <input type="text" id="name-search" class="filter-input" placeholder="Search...">
            </div>

            <div class="filter-group" style="flex: 2.5 1 140px;">
                <label for="usage-filter">Usage:</label>
                <select id="usage-filter" class="filter-select">
                    <option value="">All Usage</option>
                    ${usageOptions.map(u => `<option value="${u.value}">${u.value}</option>`).join('')}
                </select>
            </div>

            <div class="filter-group" style="flex: 2 1 130px;">
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

            <div class="filter-group" style="flex: 1.2 1 90px;">
                <label for="size-filter">Size:</label>
                <select id="size-filter" class="filter-select">
                    <option value="">All</option>
                    ${sizeOptions.map(sz => `<option value="${sz.value}">${sz.value}</option>`).join('')}
                </select>
            </div>

            ${tagOptions.length > 0 ? `
            <div class="filter-group tag-filter-group" style="flex: 2 1 150px; position: relative;">
                <label for="tag-dropdown-toggle">Tags:</label>
                <div class="tag-multiselect-container">
                    <button type="button" id="tag-dropdown-toggle" class="filter-select tag-dropdown-btn" aria-haspopup="true" aria-expanded="false">
                        <span id="tag-dropdown-label" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 6px;">All Tags</span>
                        <span style="font-size: 0.75rem; pointer-events: none;">▼</span>
                    </button>
                    <div id="tag-dropdown-menu" class="tag-dropdown-menu" style="display: none;">
                        <div class="tag-dropdown-header">
                            <span>Tags (${tagOptions.length})</span>
                            <button type="button" id="tag-dropdown-clear" class="tag-dropdown-clear-btn">Clear</button>
                        </div>
                        <div class="tag-dropdown-list">
                            ${tagOptions.map(t => `
                                <label class="tag-dropdown-item">
                                    <input type="checkbox" class="tag-checkbox" value="${escapeHTML(t.name)}">
                                    <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHTML(t.name)}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
            ` : ''}

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
        const name = (document.getElementById('name-search')?.value || '').toLowerCase();
        const usage = document.getElementById('usage-filter')?.value || '';
        const species = document.getElementById('species-filter')?.value || '';
        const size = document.getElementById('size-filter')?.value || '';

        const minVal = document.getElementById('cr-min')?.value || '';
        const maxVal = document.getElementById('cr-max')?.value || '';
        const minCR = minVal === '' ? NaN : parseFloat(minVal);
        const maxCR = maxVal === '' ? NaN : parseFloat(maxVal);

        // Apply filters
        const filtered = monsters.filter(m => {
            const matchesName = !name || (m.name || '').toLowerCase().includes(name);
            const matchesUsage = !usage || m.usage === usage;
            const matchesSpecies = !species || m.species === species;
            const matchesSize = !size || m.size === size;

            const crVal = parseFloat(m.cr);
            const matchesMin = isNaN(minCR) || crVal >= minCR;
            const matchesMax = isNaN(maxCR) || crVal <= maxCR;

            const matchesTags = selectedTags.size === 0 || 
                (Array.isArray(m.tags) && Array.from(selectedTags).some(st => m.tags.includes(st)));

            return matchesName && matchesUsage && matchesSpecies && matchesSize && matchesMin && matchesMax && matchesTags;
        });

        renderGrid(filtered);
    };

    // Helper to update the Tag dropdown button label & styling
    const updateTagDropdownLabel = () => {
        const labelEl = document.getElementById('tag-dropdown-label');
        const toggleBtn = document.getElementById('tag-dropdown-toggle');
        if (!labelEl) return;

        if (selectedTags.size === 0) {
            labelEl.textContent = 'All Tags';
            if (toggleBtn) {
                toggleBtn.style.fontWeight = 'normal';
                toggleBtn.style.borderColor = 'var(--color-primary)';
            }
        } else if (selectedTags.size === 1) {
            const firstTag = Array.from(selectedTags)[0];
            labelEl.textContent = firstTag;
            if (toggleBtn) {
                toggleBtn.style.fontWeight = 'bold';
                toggleBtn.style.borderColor = 'var(--color-secondary)';
            }
        } else {
            labelEl.textContent = `${selectedTags.size} tags selected`;
            if (toggleBtn) {
                toggleBtn.style.fontWeight = 'bold';
                toggleBtn.style.borderColor = 'var(--color-secondary)';
            }
        }
    };

    // 7. Attach Tag Dropdown Listeners
    const toggleBtn = document.getElementById('tag-dropdown-toggle');
    const menuEl = document.getElementById('tag-dropdown-menu');
    const clearBtn = document.getElementById('tag-dropdown-clear');

    if (toggleBtn && menuEl) {
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = menuEl.style.display === 'block';
            menuEl.style.display = isOpen ? 'none' : 'block';
            toggleBtn.setAttribute('aria-expanded', !isOpen);
        });

        // Prevent clicking inside dropdown from closing it
        menuEl.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Close on outside click
        const closeDropdown = (e) => {
            if (!menuEl.contains(e.target) && e.target !== toggleBtn) {
                menuEl.style.display = 'none';
                toggleBtn.setAttribute('aria-expanded', 'false');
            }
        };
        document.addEventListener('click', closeDropdown);

        // Checkbox toggle handlers
        menuEl.querySelectorAll('.tag-checkbox').forEach(cb => {
            cb.addEventListener('change', () => {
                const tagVal = cb.value;
                if (cb.checked) {
                    selectedTags.add(tagVal);
                } else {
                    selectedTags.delete(tagVal);
                }
                updateTagDropdownLabel();
                handleFilter();
            });
        });

        // Clear button inside dropdown
        if (clearBtn) {
            clearBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                selectedTags.clear();
                menuEl.querySelectorAll('.tag-checkbox').forEach(cb => {
                    cb.checked = false;
                });
                updateTagDropdownLabel();
                handleFilter();
            });
        }
    }

    // 8. Attach Standard Event Listeners
    if (document.getElementById('name-search')) {
        const inputs = [
            'name-search', 'usage-filter', 'species-filter',
            'cr-min', 'cr-max', 'size-filter'
        ];

        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', handleFilter);
        });

        document.getElementById('reset-filters').addEventListener('click', () => {
            inputs.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            selectedTags.clear();
            if (menuEl) {
                menuEl.querySelectorAll('.tag-checkbox').forEach(cb => {
                    cb.checked = false;
                });
            }
            updateTagDropdownLabel();
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

    grid.innerHTML = monsters.map(m => {
        const safeImageUrl = sanitizeUrl(m.image_url);
        const safeName = escapeHTML(m.name || 'Unnamed Monster');
        const safeSlug = encodeURIComponent(m.slug || '');
        const safeSize = escapeHTML(m.size || 'Medium');
        const safeSpecies = escapeHTML(m.species || 'Humanoid');
        return `
        <div class="monster-card">
            ${safeImageUrl ?
            `<div class="monster-card-image">
                    <img src="${safeImageUrl}" alt="${safeName}" loading="lazy">
                 </div>`
            : ''
        }
            
            <div class="monster-card-content">
                <h3><a href="#/${safeSlug}">${safeName}</a></h3>
                <p class="monster-cr">CR ${formatCR(m.cr)}</p>
                <p class="monster-type">${safeSize} ${safeSpecies}</p>
                ${Array.isArray(m.tags) && m.tags.length > 0 ? `
                    <div class="monster-card-tags" style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px;">
                        ${m.tags.map(t => `<span class="monster-tag-pill" style="font-size: 0.75rem; padding: 1px 6px; border-radius: 10px; background: var(--color-bg-medium); color: var(--color-primary); border: 1px solid var(--color-border);">${escapeHTML(t)}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
        `;
    }).join('');
}

// Helper to format Challenge Rating
function formatCR(val) {
    if (val === 0.125) return '1/8';
    if (val === 0.25) return '1/4';
    if (val === 0.5) return '1/2';
    return val;
}