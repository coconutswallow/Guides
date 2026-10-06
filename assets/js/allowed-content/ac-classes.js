/**
 * ================================================================
 * AC CLASSES MODULE
 * ================================================================
 * 
 * Data handling and presentation for player character classes and subclasses.
 * Supports normalized two-table architecture (ac_classes + ac_subclasses),
 * with primary Accordion view, explicit Ruleset and Category columns and filters,
 * external document linking, and full staff administrative capabilities.
 * 
 * Features:
 * - Primary Accordion View: Base classes expandable to reveal all specialized subclasses.
 * - Explicit Columns & Filters: Ruleset ('2014' / '2024') and Category ('Official' / 'Hawthorne Homebrew').
 * - Sources lookup integration with tooltips and badge metadata.
 * - External document links (Google Drive, UA PDFs, D&D Beyond).
 * - Client-side search across classes, subclasses, multiclassing, sources, and rulings.
 * - Staff administrative operations (Add/Edit/Delete classes & subclasses).
 * 
 * @module ACClasses
 */

import { 
    getClasses, 
    getSourcesMap, 
    getSourceByKey,
    createClass,
    updateClass,
    deleteClass,
    createSubclass,
    updateSubclass,
    deleteSubclass
} from './ac-service.js';
import { 
    getNextDisplayOrder, 
    cleanFloat, 
    sortByDisplayOrder, 
    formatDisplayOrder 
} from './ac-order-utils.js';
import { 
    detectAdminSession, 
    setAdminMode, 
    getAdminMode, 
    getCurrentUser 
} from './ac-auth.js';
import { 
    openModal, 
    closeModal, 
    esc, 
    formatSnippet, 
    renderSourceBadges, 
    extractSourceKeys,
    renderMarkdownLinks,
    resolveSourceLink
} from './ac-ui-utils.js';

export {
    setAdminMode,
    getAdminMode
};

let allClasses = [];
let allSubclassesFlat = [];
let filteredClasses = [];
let filteredSubclasses = [];
let availableSourceKeys = [];

let currentViewMode = 'accordion'; // 'accordion' | 'flat'
let expandedClassIds = new Set();
let allExpanded = false;

// Active toolbar filters
let selectedRulesetFilter = 'ALL';   // 'ALL' | '2014' | '2024'
let selectedCategoryFilter = 'ALL';  // 'ALL' | 'Official' | 'Hawthorne Homebrew'
let selectedSourceFilter = 'ALL';    // 'ALL' | specific source_key
let currentSearchTerm = '';

/**
 * Returns current view mode.
 * @returns {string}
 */
export function getViewMode() {
    return currentViewMode;
}

/**
 * Sets view mode and triggers re-render.
 * @param {'accordion'|'flat'} mode 
 */
export function setViewMode(mode) {
    if (mode === 'accordion' || mode === 'flat') {
        currentViewMode = mode;
        renderView();
    }
}

/**
 * Resolves inherited properties for a subclass from its parent class.
 * 
 * @param {Object} sub - Subclass record from ac_subclasses
 * @param {Object} cls - Parent class record from ac_classes
 * @returns {Object} Subclass with inherited properties resolved
 */
export function resolveInheritedClass(sub, cls) {
    const parentNotes = cls.notes_advice ? cls.notes_advice.trim() : '';
    const subNotes = sub.notes_advice ? sub.notes_advice.trim() : '';
    
    let combinedNotes = subNotes;
    if (parentNotes && subNotes) {
        combinedNotes = `${parentNotes}\n\n${subNotes}`;
    } else if (parentNotes) {
        combinedNotes = parentNotes;
    }

    const resolvedSource = sub.source || sub.sources || cls.source || cls.sources || '';

    return {
        ...sub,
        source: resolvedSource,
        sources: extractSourceKeys(resolvedSource),
        hit_die: cls.hit_die || sub.hit_die || '—',
        multiclassing: cls.multiclassing || sub.multiclassing || '—',
        // Expanded Class Options (TCE) always only applies to the class, not subclass
        expanded_options: null,
        class_expanded_options: cls.expanded_options || null,
        // Subclass notes_advice strictly preserves the subclass's own advice
        notes_advice: subNotes || null,
        subclass_notes_advice: subNotes || null,
        class_notes_advice: parentNotes || null,
        combined_notes_advice: combinedNotes || null,
        className: cls.name,
        classRuleset: cls.ruleset,
        classSource: cls.source,
        parentClass: cls
    };
}

/**
 * Initializes the Classes view.
 * 
 * @param {boolean} [forceRefresh=false]
 */
export async function initClasses(forceRefresh = false) {
    const container = document.getElementById('ac-view-classes');
    if (!container) return;

    if (!forceRefresh && allClasses.length > 0) {
        applyFilters();
        renderView();
        return;
    }

    container.innerHTML = `
        <div class="ac-loading">
            <div class="spinner"></div>
            <span>Cataloging Classes & Subclasses...</span>
        </div>
    `;

    try {
        const [classesData, _sourcesMap] = await Promise.all([
            getClasses(),
            getSourcesMap(forceRefresh)
        ]);

        allClasses = classesData || [];

        // Flatten subclasses and resolve inheritance
        allSubclassesFlat = [];
        const sourceSet = new Set();

        allClasses.forEach(cls => {
            cls.sources = extractSourceKeys(cls.source || cls.sources);
            cls.sources.forEach(k => sourceSet.add(k));
            
            const subs = cls.subclasses || [];
            cls.resolvedSubclasses = subs.map(sub => {
                extractSourceKeys(sub.source || sub.sources).forEach(k => sourceSet.add(k));
                const resolved = resolveInheritedClass(sub, cls);
                allSubclassesFlat.push(resolved);
                return resolved;
            });
        });

        availableSourceKeys = Array.from(sourceSet).sort();

        // Default: expand all classes with 5 or fewer subclasses
        expandedClassIds.clear();

        applyFilters();
        renderView();

    } catch (err) {
        console.error('Failed to initialize Classes view:', err);
        container.innerHTML = `<div class="ac-error" style="text-align: center; padding: 2rem;">Error loading classes: ${esc(err.message)}</div>`;
    }
}

/**
 * Applies search term, ruleset, category, and source filters.
 */
function applyFilters() {
    const term = currentSearchTerm.trim().toLowerCase();

    filteredClasses = allClasses.filter(cls => {
        // 1. Ruleset Filter
        if (selectedRulesetFilter !== 'ALL' && cls.ruleset !== selectedRulesetFilter) {
            return false;
        }

        // 2. Category Filter (checks if class itself or any of its subclasses match)
        if (selectedCategoryFilter !== 'ALL') {
            const hasMatchingCategory = cls.category === selectedCategoryFilter || 
                (cls.resolvedSubclasses || []).some(s => s.category === selectedCategoryFilter);
            if (!hasMatchingCategory) return false;
        }

        // 3. Source Filter
        if (selectedSourceFilter !== 'ALL') {
            const clsSources = extractSourceKeys(cls.source || cls.sources);
            const matchesSource = clsSources.includes(selectedSourceFilter) || 
                (cls.resolvedSubclasses || []).some(s => extractSourceKeys(s.source || s.sources).includes(selectedSourceFilter));
            if (!matchesSource) return false;
        }

        // 4. Search Query
        if (term) {
            const matchesClass = 
                cls.name.toLowerCase().includes(term) ||
                (cls.ruleset && cls.ruleset.toLowerCase().includes(term)) ||
                (cls.category && cls.category.toLowerCase().includes(term)) ||
                (cls.source && cls.source.toLowerCase().includes(term)) ||
                extractSourceKeys(cls.source || cls.sources).some(k => {
                    const srcObj = getSourceByKey(k);
                    return srcObj && (srcObj.name.toLowerCase().includes(term) || srcObj.abbreviation?.toLowerCase().includes(term));
                }) ||
                (cls.multiclassing && cls.multiclassing.toLowerCase().includes(term)) ||
                (cls.expanded_options && cls.expanded_options.toLowerCase().includes(term)) ||
                (cls.notes_advice && cls.notes_advice.toLowerCase().includes(term));

            const matchesSubclass = (cls.resolvedSubclasses || []).some(s => 
                s.name.toLowerCase().includes(term) ||
                (s.category && s.category.toLowerCase().includes(term)) ||
                (s.source && s.source.toLowerCase().includes(term)) ||
                extractSourceKeys(s.source || s.sources).some(k => {
                    const srcObj = getSourceByKey(k);
                    return srcObj && (srcObj.name.toLowerCase().includes(term) || srcObj.abbreviation?.toLowerCase().includes(term));
                }) ||
                (s.notes_advice && s.notes_advice.toLowerCase().includes(term))
            );

            return matchesClass || matchesSubclass;
        }

        return true;
    });

    // Also update flattened subclasses filter
    filteredSubclasses = allSubclassesFlat.filter(sub => {
        if (selectedRulesetFilter !== 'ALL' && sub.ruleset !== selectedRulesetFilter) return false;
        if (selectedCategoryFilter !== 'ALL' && sub.category !== selectedCategoryFilter) return false;
        if (selectedSourceFilter !== 'ALL' && !extractSourceKeys(sub.source || sub.sources).includes(selectedSourceFilter)) return false;
        if (term) {
            return (
                sub.name.toLowerCase().includes(term) ||
                (sub.className && sub.className.toLowerCase().includes(term)) ||
                (sub.category && sub.category.toLowerCase().includes(term)) ||
                (sub.source && sub.source.toLowerCase().includes(term)) ||
                extractSourceKeys(sub.source || sub.sources).some(k => {
                    const srcObj = getSourceByKey(k);
                    return srcObj && (srcObj.name.toLowerCase().includes(term) || srcObj.abbreviation?.toLowerCase().includes(term));
                }) ||
                (sub.multiclassing && sub.multiclassing.toLowerCase().includes(term)) ||
                (sub.notes_advice && sub.notes_advice.toLowerCase().includes(term)) ||
                (sub.class_notes_advice && sub.class_notes_advice.toLowerCase().includes(term)) ||
                (sub.class_expanded_options && sub.class_expanded_options.toLowerCase().includes(term))
            );
        }
        return true;
    });
}

/**
 * Filter delegate invoked from the global search router in ac-main.js.
 * 
 * @param {string} searchTerm
 */
export function filterClasses(searchTerm) {
    currentSearchTerm = searchTerm || '';
    applyFilters();
    renderView();
}

/**
 * Renders the Classes view container including toolbar and active view.
 */
function renderView() {
    const container = document.getElementById('ac-view-classes');
    if (!container) return;

    const isAdmin = getAdminMode();
    const totalSubclasses = allSubclassesFlat.length;
    const showingSubclasses = filteredSubclasses.length;

    const html = `
        <div class="ac-classes-container">
            <!-- Toolbar: Filters and View Controls -->
            <div class="ac-toolbar-filters" style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; justify-content: space-between; margin-bottom: 1rem; padding: 0.5rem 0;">
                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;">
                    <span class="ac-count-badge" style="font-size: 0.85rem; font-weight: 600; opacity: 0.85;">
                        Showing <strong>${filteredClasses.length}</strong> Classes (${showingSubclasses} Subclasses)
                    </span>

                    <!-- Ruleset Filter (2014 vs 2024) -->
                    <select id="ac-classes-ruleset-filter" class="ac-filter-select" title="Filter by Ruleset">
                        <option value="ALL" ${selectedRulesetFilter === 'ALL' ? 'selected' : ''}>All Rulesets</option>
                        <option value="2014" ${selectedRulesetFilter === '2014' ? 'selected' : ''}>2014 Ruleset</option>
                        <option value="2024" ${selectedRulesetFilter === '2024' ? 'selected' : ''}>2024 Ruleset</option>
                    </select>

                    <!-- Category Filter (Official vs Hawthorne Homebrew) -->
                    <select id="ac-classes-category-filter" class="ac-filter-select" title="Filter by Category">
                        <option value="ALL" ${selectedCategoryFilter === 'ALL' ? 'selected' : ''}>All Categories</option>
                        <option value="Official" ${selectedCategoryFilter === 'Official' ? 'selected' : ''}>Official WotC</option>
                        <option value="Hawthorne Homebrew" ${selectedCategoryFilter === 'Hawthorne Homebrew' ? 'selected' : ''}>Hawthorne Homebrew</option>
                    </select>

                    <!-- Source Filter -->
                    <select id="ac-classes-source-filter" class="ac-filter-select" title="Filter by Sourcebook">
                        <option value="ALL">All Sources (${availableSourceKeys.length})</option>
                        ${availableSourceKeys.map(k => {
                            const src = getSourceByKey(k);
                            const label = src ? `${k} - ${src.name}` : k;
                            return `<option value="${esc(k)}" ${selectedSourceFilter === k ? 'selected' : ''}>${esc(label)}</option>`;
                        }).join('')}
                    </select>
                </div>

                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <!-- View Switcher -->
                    <div class="ac-view-switcher" style="display: flex; background: var(--bg-surface-elevated, rgba(0,0,0,0.05)); border-radius: 6px; padding: 2px;">
                        <button class="ac-view-tab-btn ${currentViewMode === 'accordion' ? 'active' : ''}" data-mode="accordion" title="Grouped Accordion View">
                            📂 Accordion
                        </button>
                        <button class="ac-view-tab-btn ${currentViewMode === 'flat' ? 'active' : ''}" data-mode="flat" title="Flat Unified Table View">
                            📋 Flat
                        </button>
                    </div>

                    ${currentViewMode === 'accordion' ? `
                        <button id="accordion-toggle-all-classes-btn" class="ac-btn-toggle-all" title="Toggle expanding or collapsing all classes">
                            ${allExpanded ? 'Collapse All ▲' : 'Expand All ▼'}
                        </button>
                    ` : ''}
                </div>
            </div>

            <!-- Main Content Area -->
            <div id="classes-table-container">
                ${currentViewMode === 'accordion' ? renderAccordionTable(isAdmin) : renderFlatTable(isAdmin)}
            </div>
        </div>
    `;

    container.innerHTML = html;
    setupControls();
    attachRowListeners();
}

/**
 * Formats a short multiclassing summary snippet for table display.
 * 
 * @param {string} text
 * @returns {string}
 */
function formatMulticlassShort(text) {
    if (!text || text === '—') return '—';
    const match = text.match(/Requires\s+([^.\n]+)/i);
    return match ? match[0] : text.split('\n')[0].substring(0, 30) + '...';
}

/**
 * Formats notes/advice with markdown links and truncation for table cells.
 * 
 * @param {string} text
 * @returns {string}
 */
function formatNotesAdvice(text) {
    if (!text) return '<span style="opacity: 0.5;">—</span>';
    const cleaned = text.split(/\r?\n/).map(l => l.trim()).join('\n').trim();
    if (cleaned.length <= 160) {
        return renderMarkdownLinks(cleaned);
    }
    const snippet = cleaned.slice(0, 160) + '…';
    return `<span class="ac-advice-snippet">${renderMarkdownLinks(snippet)}</span><span class="ac-advice-full" style="display: none; white-space: pre-wrap;">${renderMarkdownLinks(cleaned)}</span> <button type="button" class="ac-advice-more-btn" style="background: none; border: none; padding: 0 4px; font-size: 0.78rem; color: var(--color-primary); cursor: pointer; text-decoration: underline; font-weight: 500;" title="Click to expand full advice">more ↗</button>`;
}

/**
 * Formats notes/advice for Flat View, distinguishing subclass advice from class advice.
 * 
 * @param {Object} sub
 * @returns {string}
 */
function formatFlatNotesAdvice(sub) {
    const hasSubAdvice = Boolean(sub.notes_advice);
    const hasClassAdvice = Boolean(sub.class_notes_advice);

    if (hasSubAdvice && hasClassAdvice) {
        return `
            <div>${formatNotesAdvice(sub.notes_advice)}</div>
            <div style="font-size: 0.78rem; opacity: 0.75; margin-top: 4px; padding-top: 4px; border-top: 1px dashed var(--border-subtle, rgba(0,0,0,0.1));" title="Class-level advice applies to all ${esc(sub.className)}s">
                <span style="font-weight: 600; opacity: 0.9;">Class:</span> ${formatSnippet(sub.class_notes_advice, 45)}
            </div>
        `;
    }
    if (hasSubAdvice) {
        return formatNotesAdvice(sub.notes_advice);
    }
    if (hasClassAdvice) {
        return `
            <div style="font-size: 0.85rem; opacity: 0.85;" title="Class-level advice applies to all ${esc(sub.className)}s">
                <span style="font-weight: 600; opacity: 0.9;">Class:</span> ${formatNotesAdvice(sub.class_notes_advice)}
            </div>
        `;
    }
    return '<span style="opacity: 0.4;">—</span>';
}

/**
 * Renders an external document link badge if URL is present.
 * 
 * @param {string} link
 * @returns {string}
 */
function renderLinkBadge(link) {
    if (!link) return '<span style="opacity: 0.4;">—</span>';
    const resolved = resolveSourceLink(link);
    const isArcana = link.includes('/arcana/') || link.includes('arcana');
    const label = isArcana ? 'Arcana ↗' : (link.startsWith('/') ? 'Guide ↗' : 'Document ↗');
    const title = isArcana ? 'Open Hawthorne Arcana guide' : 'Open source document';
    return `
        <a href="${esc(resolved)}" target="_blank" rel="noopener noreferrer" class="ac-link-badge" title="${title}" onclick="event.stopPropagation();">
            ${label}
        </a>
    `;
}

/**
 * Primary Accordion View: Base classes table with collapsible subclass sub-tables.
 * 
 * @param {boolean} isAdmin
 * @returns {string}
 */
function renderAccordionTable(isAdmin = false) {
    if (filteredClasses.length === 0) {
        return `
            <table class="ac-table ac-accordion-table" id="classes-accordion-table">
                <tbody>
                    <tr><td colspan="9" style="text-align:center; padding: 3rem;">No classes found matching your criteria.</td></tr>
                </tbody>
            </table>
        `;
    }

    return `
        <table class="ac-table ac-accordion-table" id="classes-accordion-table">
            <thead>
                <tr>
                    <th class="col-name">Class</th>
                    <th class="col-ruleset" style="text-align: center;">Ruleset</th>
                    <th class="col-subclass">Subclasses</th>
                    <th class="col-hitdie" style="text-align: center;">Hit Die</th>
                    <th class="col-category">Category</th>
                    <th class="col-sources" style="text-align: center;">Source</th>
                    <th class="col-multiclass">Multiclassing</th>
                    <th class="col-expanded hide-mobile">Expanded Options</th>
                    <th class="col-notes">Rage Advice</th>
                </tr>
            </thead>
            <tbody>
                ${filteredClasses.map(cls => {
                    const subs = cls.resolvedSubclasses || cls.subclasses || [];
                    const isExpanded = expandedClassIds.has(cls.id);
                    const subNames = subs.map(s => s.name).filter(Boolean);

                    return `
                        <tr class="ac-accordion-parent-row ${isExpanded ? 'expanded' : ''}" data-class-id="${esc(cls.id)}">
                            <td class="col-name">
                                <div class="name-cell">
                                    <div style="display: flex; align-items: center;">
                                        <span class="accordion-chevron">${isExpanded ? '▼' : '▶'}</span>
                                        <span><strong>${esc(cls.name)}</strong></span>
                                        <span class="badge-lineages-count">${subs.length}</span>
                                    </div>
                                    <span class="row-hover-icon">${isExpanded ? 'Collapse ▲' : 'Expand ▼'}</span>
                                </div>
                            </td>
                            <td class="col-ruleset" style="text-align: center;">
                                <span>${esc(cls.ruleset || '2014')}</span>
                            </td>
                            <td class="col-subclass">
                                <div>
                                    <strong>${subs.length} Subclasses</strong>
                                    <div style="font-size: 0.78rem; opacity: 0.75; margin-top: 2px;">
                                        ${esc(subNames.slice(0, 3).join(', '))}${subNames.length > 3 ? ` +${subNames.length - 3} more` : ''}
                                    </div>
                                </div>
                            </td>
                            <td class="col-hitdie" style="text-align: center;">
                                <strong>${esc(cls.hit_die || '—')}</strong>
                            </td>
                            <td class="col-category">
                                <span>${esc(cls.category || 'Official')}</span>
                            </td>
                            <td class="col-sources" style="text-align: center;">
                                ${renderSourceBadges(cls.source || cls.sources)}
                            </td>
                            <td class="col-multiclass">
                                ${esc(formatMulticlassShort(cls.multiclassing))}
                            </td>
                            <td class="col-expanded hide-mobile">
                                ${formatSnippet(cls.expanded_options)}
                            </td>
                            <td class="col-notes">
                                ${formatNotesAdvice(cls.notes_advice)}
                            </td>
                        </tr>

                        <!-- Subclasses Drawer Row -->
                        <tr class="ac-species-drawer-row ${isExpanded ? '' : 'ac-drawer-collapsed'}" id="drawer-${esc(cls.id)}">
                            <td colspan="9" class="ac-drawer-cell">
                                <div class="ac-inline-subraces-wrapper">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; padding: 0 0.25rem;">
                                        <div style="font-weight: 600; color: var(--color-primary); font-size: 0.9rem;">
                                            📂 ${esc(cls.name)} (${esc(cls.ruleset)}) Subclasses (${subs.length})
                                        </div>
                                        <div style="font-size: 0.8rem; opacity: 0.7; display: flex; align-items: center; gap: 0.5rem;">
                                            ${isAdmin ? `
                                                <button class="ac-btn-admin ac-btn-primary ac-btn-sm btn-drawer-add-subclass" data-class-id="${esc(cls.id)}" style="font-size: 0.78rem; padding: 2px 8px;">➕ Add Subclass</button>
                                                <button class="ac-btn-admin ac-btn-secondary ac-btn-sm btn-drawer-edit-class" data-class-id="${esc(cls.id)}" style="font-size: 0.78rem; padding: 2px 8px;">⚙️ Edit Class</button>
                                            ` : 'Click any subclass row to view full details and rulings'}
                                        </div>
                                    </div>
                                    <table class="ac-inline-subtable">
                                        <thead>
                                            <tr>
                                                <th>Subclass</th>
                                                <th style="text-align: center;">Ruleset</th>
                                                <th>Category</th>
                                                <th style="text-align: center;">Source</th>
                                                <th style="text-align: center;">Link</th>
                                                <th>Rage Advice</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${subs.length === 0 ? `
                                                <tr>
                                                    <td colspan="6" style="text-align: center; opacity: 0.7; padding: 1.5rem;">
                                                        No subclasses added yet.
                                                        ${isAdmin ? `<br><button class="ac-btn-admin ac-btn-primary ac-btn-sm btn-drawer-add-subclass" data-class-id="${esc(cls.id)}" style="margin-top: 0.5rem;">➕ Add First Subclass</button>` : ''}
                                                    </td>
                                                </tr>
                                            ` : subs.map((sub, sIdx) => `
                                                <tr data-subclass-id="${esc(sub.id)}" data-class-id="${esc(cls.id)}" data-sub-idx="${sIdx}">
                                                    <td><strong>${esc(sub.name)}</strong></td>
                                                    <td style="text-align: center;">${esc(sub.ruleset || cls.ruleset)}</td>
                                                    <td>${esc(sub.category || 'Official')}</td>
                                                    <td style="text-align: center;">${renderSourceBadges(sub.source || sub.sources || cls.source || cls.sources)}</td>
                                                    <td style="text-align: center;">${renderLinkBadge(sub.link)}</td>
                                                    <td>${formatNotesAdvice(sub.notes_advice)}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

/**
 * Flat Unified Table View: Renders each subclass as an individual row.
 * 
 * @param {boolean} isAdmin
 * @returns {string}
 */
function renderFlatTable(isAdmin = false) {
    if (filteredSubclasses.length === 0) {
        return `
            <table class="ac-table" id="classes-table">
                <tbody>
                    <tr><td colspan="9" style="text-align:center; padding: 3rem;">No subclasses found matching your criteria.</td></tr>
                </tbody>
            </table>
        `;
    }

    return `
        <table class="ac-table" id="classes-table">
            <thead>
                <tr>
                    <th class="col-name">Class</th>
                    <th class="col-ruleset" style="text-align: center;">Ruleset</th>
                    <th class="col-subclass">Subclass</th>
                    <th class="col-hitdie" style="text-align: center;">Hit Die</th>
                    <th class="col-category">Category</th>
                    <th class="col-sources" style="text-align: center;">Source</th>
                    <th class="col-link" style="text-align: center;">Link</th>
                    <th class="col-multiclass">Multiclassing</th>
                    <th class="col-notes">Rage Advice</th>
                </tr>
            </thead>
            <tbody>
                ${filteredSubclasses.map(sub => `
                    <tr data-subclass-id="${esc(sub.id)}" data-class-id="${esc(sub.parentClass?.id || '')}">
                        <td class="col-name">
                            <div class="name-cell">
                                <span>${esc(sub.className || sub.parentClass?.name || '—')}</span>
                                <span class="row-hover-icon">${isAdmin ? 'Edit / Details →' : 'Details →'}</span>
                            </div>
                        </td>
                        <td class="col-ruleset" style="text-align: center;">
                            ${esc(sub.ruleset || '2014')}
                        </td>
                        <td class="col-subclass">
                            <strong>${esc(sub.name)}</strong>
                        </td>
                        <td class="col-hitdie" style="text-align: center;">
                            <strong>${esc(sub.hit_die || '—')}</strong>
                        </td>
                        <td class="col-category">
                            ${esc(sub.category || 'Official')}
                        </td>
                        <td class="col-sources" style="text-align: center;">
                            ${renderSourceBadges(sub.source || sub.sources || sub.parentClass?.source || sub.parentClass?.sources)}
                        </td>
                        <td class="col-link" style="text-align: center;">
                            ${renderLinkBadge(sub.link)}
                        </td>
                        <td class="col-multiclass">
                            ${esc(formatMulticlassShort(sub.multiclassing))}
                        </td>
                        <td class="col-notes">
                            ${formatFlatNotesAdvice(sub)}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

/**
 * Attaches event listeners to toolbar filter dropdowns and buttons.
 */
function setupControls() {
    const rulesetSelect = document.getElementById('ac-classes-ruleset-filter');
    if (rulesetSelect) {
        rulesetSelect.onchange = (e) => {
            selectedRulesetFilter = e.target.value;
            applyFilters();
            renderView();
        };
    }

    const categorySelect = document.getElementById('ac-classes-category-filter');
    if (categorySelect) {
        categorySelect.onchange = (e) => {
            selectedCategoryFilter = e.target.value;
            applyFilters();
            renderView();
        };
    }

    const sourceSelect = document.getElementById('ac-classes-source-filter');
    if (sourceSelect) {
        sourceSelect.onchange = (e) => {
            selectedSourceFilter = e.target.value;
            applyFilters();
            renderView();
        };
    }

    const container = document.getElementById('ac-view-classes');
    if (!container) return;

    // View Switcher tab buttons
    container.querySelectorAll('.ac-view-tab-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            const mode = btn.dataset.mode;
            if (mode && mode !== currentViewMode) {
                currentViewMode = mode;
                renderView();
            }
        };
    });

    // Toggle All Accordions button
    const toggleAllBtn = document.getElementById('accordion-toggle-all-classes-btn');
    if (toggleAllBtn) {
        toggleAllBtn.onclick = () => {
            allExpanded = !allExpanded;
            if (allExpanded) {
                filteredClasses.forEach(c => expandedClassIds.add(c.id));
            } else {
                expandedClassIds.clear();
            }
            renderView();
        };
    }
}

/**
 * Attaches row click listeners across accordion headers and nested sub-tables.
 */
function attachRowListeners() {
    const container = document.getElementById('ac-view-classes');
    if (!container) return;

    // 1. Accordion parent row clicks -> toggle expand/collapse
    container.querySelectorAll('.ac-accordion-parent-row').forEach(row => {
        row.onclick = (e) => {
            if (e.target.closest('a, button, .ac-source-badge')) return;
            const classId = row.dataset.classId;
            const cls = allClasses.find(c => c.id === classId);
            if (!cls) return;

            if (expandedClassIds.has(classId)) {
                expandedClassIds.delete(classId);
            } else {
                expandedClassIds.add(classId);
            }
            renderView();
        };
    });

    // Drawer action buttons (Add Subclass, Edit Class)
    container.querySelectorAll('.btn-drawer-add-subclass').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const cls = allClasses.find(c => c.id === btn.dataset.classId);
            if (cls) openClassForm(null, cls, false, 'subclass');
        };
    });

    container.querySelectorAll('.btn-drawer-edit-class').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const cls = allClasses.find(c => c.id === btn.dataset.classId);
            if (cls) openClassForm(null, cls, true);
        };
    });

    // 2. Accordion child table row clicks -> open detail modal
    container.querySelectorAll('.ac-inline-subtable tbody tr').forEach(row => {
        row.onclick = (e) => {
            e.stopPropagation();
            if (e.target.closest('a, button, .ac-source-badge')) return;
            const classId = row.dataset.classId;
            const subclassId = row.dataset.subclassId;
            const cls = allClasses.find(c => c.id === classId);
            if (!cls) return;
            const subIdx = (cls.resolvedSubclasses || cls.subclasses || []).findIndex(s => s.id === subclassId);
            showClassDetail(cls, Math.max(0, subIdx));
        };
    });

    // 3. Flat table row clicks -> open detail modal
    container.querySelectorAll('#classes-table tbody tr').forEach(row => {
        row.onclick = (e) => {
            if (e.target.closest('a, button, .ac-source-badge')) return;
            const subclassId = row.dataset.subclassId;
            const subItem = allSubclassesFlat.find(s => s.id === subclassId);
            if (!subItem || !subItem.parentClass) return;
            const parentClass = subItem.parentClass;
            const subIdx = (parentClass.resolvedSubclasses || parentClass.subclasses || []).findIndex(s => s.id === subclassId);
            showClassDetail(parentClass, Math.max(0, subIdx));
        };
    });

    // 4. Inline advice expand / collapse toggles
    container.querySelectorAll('.ac-advice-more-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const parent = btn.parentElement;
            const snippet = parent?.querySelector('.ac-advice-snippet');
            const full = parent?.querySelector('.ac-advice-full');
            if (!snippet || !full) return;

            const isExpanded = full.style.display !== 'none';
            if (isExpanded) {
                full.style.display = 'none';
                snippet.style.display = '';
                btn.textContent = 'more ↗';
                btn.title = 'Click to expand full advice';
            } else {
                full.style.display = 'inline';
                snippet.style.display = 'none';
                btn.textContent = 'less ↖';
                btn.title = 'Click to collapse advice';
            }
        };
    });
}

/**
 * Opens and renders the rich Class & Subclass Detail Modal.
 * Includes subclass navigation tabs and formatted rulings.
 * 
 * @param {Object} cls - Parent class object from ac_classes
 * @param {number} activeSubclassIndex - Index of currently focused subclass
 */
export function showClassDetail(cls, activeSubclassIndex = 0) {
    const isAdmin = getAdminMode();
    const subclasses = cls.resolvedSubclasses || cls.subclasses || [];
    const currentSub = subclasses[activeSubclassIndex] || subclasses[0] || {};

    const html = `
        <div class="detail-header">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem;">
                <div class="detail-category">
                    <span style="font-weight: 600;">${esc(currentSub.category || cls.category || 'Official')}</span> • ${renderSourceBadges(currentSub.source || currentSub.sources || cls.source || cls.sources)}
                </div>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <span style="font-size: 0.85rem; padding: 2px 8px; border-radius: 4px; background: var(--bg-surface-elevated, rgba(0,0,0,0.06)); font-weight: 600;">
                        ${esc(currentSub.ruleset || cls.ruleset)} Ruleset
                    </span>
                    ${currentSub.link ? `
                        <a href="${esc(resolveSourceLink(currentSub.link))}" target="_blank" rel="noopener noreferrer" class="ac-link-badge" style="font-size: 0.85rem; padding: 3px 8px;">
                            ${(currentSub.link.includes('/arcana/') || currentSub.link.includes('arcana')) ? 'Arcana Guide ↗' : 'External Doc ↗'}
                        </a>
                    ` : ''}
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
                <h2 class="detail-title" style="margin: 0;">
                    ${esc(cls.name)} 
                    ${currentSub.name ? `<small style="opacity:0.75; font-size: 0.65em; font-weight: 500;">(${esc(currentSub.name)})</small>` : ''}
                </h2>
                ${isAdmin ? `
                    <div class="detail-actions">
                        ${currentSub?.id ? `<button id="modal-btn-edit-subclass" class="ac-btn-admin ac-btn-secondary" title="Edit this subclass">✏️ Edit Subclass</button>` : ''}
                        <button id="modal-btn-add-subclass" class="ac-btn-admin ac-btn-primary" title="Add a new subclass to this class">➕ Add Subclass</button>
                        <button id="modal-btn-edit-class" class="ac-btn-admin ac-btn-secondary" title="Edit base class">⚙️ Edit Class</button>
                        ${currentSub?.id ? `<button id="modal-btn-delete-subclass" class="ac-btn-admin ac-btn-delete" title="Delete this subclass">🗑️ Delete</button>` : ''}
                        <button id="modal-btn-delete-class" class="ac-btn-admin ac-btn-delete" title="Delete this base class and all its subclasses">🗑️ Delete Class</button>
                    </div>
                ` : ''}
            </div>
        </div>

        ${subclasses.length > 1 ? `
            <div class="ac-modal-subrace-nav">
                <div class="ac-modal-nav-title">Select Subclass (${subclasses.length} available):</div>
                <div class="ac-modal-subrace-tabs">
                    ${subclasses.map((s, idx) => {
                        const isActive = idx === activeSubclassIndex;
                        const sSrc = s.source || (Array.isArray(s.sources) ? s.sources.join(', ') : '') || cls.source || '';
                        return `
                            <button class="ac-modal-tab-btn ${isActive ? 'active' : ''}" data-idx="${idx}">
                                <span>${esc(s.name)}</span>
                                ${sSrc ? `<span style="opacity: 0.7; font-size: 0.75em;">(${esc(sSrc)})</span>` : ''}
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>
        ` : ''}

        <div class="detail-grid">
            <div class="detail-item">
                <label>Hit Die</label>
                <value><strong>${esc(cls.hit_die || '—')}</strong></value>
            </div>
            <div class="detail-item">
                <label>Ruleset</label>
                <value>${esc(currentSub.ruleset || cls.ruleset || '2014')}</value>
            </div>
            <div class="detail-item">
                <label>Category</label>
                <value>${esc(currentSub.category || 'Official')}</value>
            </div>
            <div class="detail-item">
                <label>Source</label>
                <value>${renderSourceBadges(currentSub.source || currentSub.sources || cls.source || cls.sources)}</value>
            </div>
        </div>

        <div class="detail-section">
            <h4>Multiclassing Requirements & Proficiencies</h4>
            <div style="white-space: pre-wrap; font-size: 0.92rem; line-height: 1.6; opacity: 0.9;">${esc(cls.multiclassing || 'None')}</div>
        </div>

        ${cls.expanded_options ? `
            <div class="detail-section">
                <h4>${esc(cls.name)} Expanded Class Options (TCE)</h4>
                <div style="white-space: pre-wrap; font-size: 0.92rem; line-height: 1.6;">${renderMarkdownLinks(cls.expanded_options)}</div>
            </div>
        ` : ''}

        ${cls.notes_advice ? `
            <div class="detail-section">
                <h4>${esc(cls.name)} Class Rulings & Advice</h4>
                <div style="white-space: pre-wrap; font-size: 0.92rem; line-height: 1.6; color: var(--color-secondary);">
                    ${renderMarkdownLinks(cls.notes_advice)}
                </div>
            </div>
        ` : ''}

        ${currentSub.notes_advice ? `
            <div class="detail-section">
                <h4>${esc(currentSub.name)} Subclass Rulings & Advice</h4>
                <div style="white-space: pre-wrap; font-size: 0.92rem; line-height: 1.6; color: var(--color-secondary);">
                    ${renderMarkdownLinks(currentSub.notes_advice)}
                </div>
            </div>
        ` : ''}
    `;

    openModal(html);

    // Attach subclass tab listeners
    const modalEl = document.getElementById('ac-detail-modal');
    if (modalEl) {
        modalEl.querySelectorAll('.ac-modal-tab-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                const idx = parseInt(btn.dataset.idx, 10);
                showClassDetail(cls, idx);
            };
        });

        if (isAdmin) {
            const editSubBtn = document.getElementById('modal-btn-edit-subclass');
            if (editSubBtn) editSubBtn.onclick = () => openClassForm(currentSub, cls);

            const addSubBtn = document.getElementById('modal-btn-add-subclass');
            if (addSubBtn) addSubBtn.onclick = () => openClassForm(null, cls, false, 'subclass');

            const editClassBtn = document.getElementById('modal-btn-edit-class');
            if (editClassBtn) editClassBtn.onclick = () => openClassForm(null, cls, true);

            const deleteSubBtn = document.getElementById('modal-btn-delete-subclass');
            if (deleteSubBtn) deleteSubBtn.onclick = () => confirmAndDeleteSubclass(currentSub, cls);

            const deleteClassBtn = document.getElementById('modal-btn-delete-class');
            if (deleteClassBtn) deleteClassBtn.onclick = () => confirmAndDeleteClass(cls);
        }
    }
}

/**
 * Opens an edit or creation form modal for a Class or Subclass.
 * 
 * @param {Object|null} subclassItem - Existing subclass object if editing
 * @param {Object|null} defaultParentClass - Parent class object
 * @param {boolean} [isEditBaseClass=false] - True if editing base class properties
 * @param {string|null} [defaultMode=null] - 'class' or 'subclass' if adding new
 */
export async function openClassForm(subclassItem = null, defaultParentClass = null, isEditBaseClass = false, defaultMode = null) {
    if (allClasses.length === 0) {
        allClasses = (await getClasses()) || [];
    }

    const isNew = !subclassItem && !isEditBaseClass;
    let selectedParentClass = defaultParentClass || (subclassItem ? subclassItem.parentClass : null);
    const initialMode = defaultMode || (isEditBaseClass ? 'class' : (selectedParentClass ? 'subclass' : 'class'));

    let headerCategory = 'New Class / Subclass';
    let headerTitle = 'Add Class or Subclass';

    if (isEditBaseClass) {
        headerCategory = 'Edit Base Class';
        headerTitle = `Edit Base Class: ${esc(selectedParentClass?.name || '')}`;
    } else if (subclassItem) {
        headerCategory = 'Edit Subclass';
        headerTitle = `Edit Subclass: ${esc(selectedParentClass?.name || '')} (${esc(subclassItem.name)})`;
    } else {
        headerCategory = initialMode === 'class' ? 'New Base Class' : 'New Subclass';
        headerTitle = initialMode === 'class' ? 'Add New Base Class' : 'Add New Subclass';
    }

    const html = `
        <div class="detail-header">
            <span class="detail-category" id="modal-header-category">${headerCategory}</span>
            <h2 class="detail-title" id="modal-header-title">${headerTitle}</h2>
        </div>

        <form id="ac-class-form" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;">
            ${isEditBaseClass ? `
                <div class="ac-form-group">
                    <label for="class-input-name">Class Name *</label>
                    <input type="text" id="class-input-name" required class="ac-form-input" value="${esc(selectedParentClass?.name || '')}">
                </div>
                <div class="ac-form-group">
                    <label for="class-input-ruleset">Ruleset *</label>
                    <select id="class-input-ruleset" class="ac-form-input" required>
                        <option value="2014" ${selectedParentClass?.ruleset === '2014' ? 'selected' : ''}>2014</option>
                        <option value="2024" ${selectedParentClass?.ruleset === '2024' ? 'selected' : ''}>2024</option>
                    </select>
                </div>
                <div class="ac-form-group">
                    <label for="class-input-category">Category *</label>
                    <select id="class-input-category" class="ac-form-input" required>
                        <option value="Official" ${selectedParentClass?.category === 'Official' ? 'selected' : ''}>Official</option>
                        <option value="Hawthorne Homebrew" ${selectedParentClass?.category === 'Hawthorne Homebrew' ? 'selected' : ''}>Hawthorne Homebrew</option>
                    </select>
                </div>
                <div class="ac-form-group">
                    <label for="class-input-hitdie">Hit Die *</label>
                    <input type="text" id="class-input-hitdie" required class="ac-form-input" value="${esc(selectedParentClass?.hit_die || 'd8')}" placeholder="d8, d10, d12, etc.">
                </div>
                <div class="ac-form-group">
                    <label for="class-input-source">Source *</label>
                    <input type="text" id="class-input-source" required class="ac-form-input" value="${esc(selectedParentClass?.source || 'PHB2014')}">
                </div>
                <div class="ac-form-group">
                    <label for="class-input-multiclass">Multiclassing Requirements & Proficiencies</label>
                    <textarea id="class-input-multiclass" class="ac-form-textarea" rows="3">${esc(selectedParentClass?.multiclassing || '')}</textarea>
                </div>
                <div class="ac-form-group">
                    <label for="class-input-expanded">Expanded Options (TCE)</label>
                    <textarea id="class-input-expanded" class="ac-form-textarea" rows="3">${esc(selectedParentClass?.expanded_options || '')}</textarea>
                </div>
                <div class="ac-form-group">
                    <label for="class-input-notes">Base Notes / Advice</label>
                    <textarea id="class-input-notes" class="ac-form-textarea" rows="3">${esc(selectedParentClass?.notes_advice || '')}</textarea>
                </div>
            ` : (subclassItem ? `
                <!-- Edit Subclass Form -->
                <div class="ac-form-group">
                    <label for="class-select-parent">Parent Class *</label>
                    <select id="class-select-parent" class="ac-form-input" required>
                        ${allClasses.map(c => `
                            <option value="${esc(c.id)}" ${selectedParentClass?.id === c.id ? 'selected' : ''}>
                                ${esc(c.name)} (${esc(c.ruleset)})
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div class="ac-form-group">
                    <label for="subclass-input-name">Subclass Name *</label>
                    <input type="text" id="subclass-input-name" required class="ac-form-input" value="${esc(subclassItem.name || '')}" placeholder="e.g. Battle Master, Berserker">
                </div>
                <div class="ac-form-group">
                    <label for="subclass-input-ruleset">Ruleset *</label>
                    <select id="subclass-input-ruleset" class="ac-form-input" required>
                        <option value="2014" ${subclassItem.ruleset === '2014' ? 'selected' : ''}>2014</option>
                        <option value="2024" ${subclassItem.ruleset === '2024' ? 'selected' : ''}>2024</option>
                    </select>
                </div>
                <div class="ac-form-group">
                    <label for="subclass-input-category">Category *</label>
                    <select id="subclass-input-category" class="ac-form-input" required>
                        <option value="Official" ${subclassItem.category === 'Official' ? 'selected' : ''}>Official</option>
                        <option value="Hawthorne Homebrew" ${subclassItem.category === 'Hawthorne Homebrew' ? 'selected' : ''}>Hawthorne Homebrew</option>
                    </select>
                </div>
                <div class="ac-form-group">
                    <label for="subclass-input-source">Source *</label>
                    <input type="text" id="subclass-input-source" required class="ac-form-input" value="${esc(subclassItem.source || 'PHB2014')}" placeholder="e.g. PHB2014, TCE, XGE, HTA">
                </div>
                <div class="ac-form-group">
                    <label for="subclass-input-link">Document Link</label>
                    <input type="text" id="subclass-input-link" class="ac-form-input" value="${esc(subclassItem.link || '')}" placeholder="https://... or /arcana/...">
                </div>
                <div class="ac-form-group">
                    <label for="subclass-input-notes">Subclass Notes / Advice</label>
                    <textarea id="subclass-input-notes" class="ac-form-textarea" rows="3">${esc(subclassItem.notes_advice || '')}</textarea>
                </div>
            ` : `
                <!-- New Class or Subclass Form with Mode Toggle -->
                <div class="ac-form-group ac-mode-toggle" style="background: var(--bg-surface-elevated, rgba(0,0,0,0.03)); padding: 0.75rem 1rem; border-radius: 6px; border: 1px solid var(--border-color, rgba(0,0,0,0.1));">
                    <label style="font-weight: 600; margin-bottom: 0.4rem; display: block;">What would you like to add?</label>
                    <div style="display: flex; gap: 1.5rem; align-items: center; flex-wrap: wrap;">
                        <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; font-weight: 500;">
                            <input type="radio" name="class-form-type" id="type-radio-class" value="class" ${initialMode === 'class' ? 'checked' : ''}>
                            <span>New Base Class <small style="opacity: 0.75;">(e.g. Artificer, Blood Hunter)</small></span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; font-weight: 500;">
                            <input type="radio" name="class-form-type" id="type-radio-subclass" value="subclass" ${initialMode === 'subclass' ? 'checked' : ''}>
                            <span>New Subclass <small style="opacity: 0.75;">(under an existing class)</small></span>
                        </label>
                    </div>
                </div>

                <!-- Section: New Base Class -->
                <div id="section-new-class" style="display: ${initialMode === 'class' ? 'flex' : 'none'}; flex-direction: column; gap: 1rem;">
                    <div class="ac-form-group">
                        <label for="class-input-name">Class Name *</label>
                        <input type="text" id="class-input-name" required class="ac-form-input" placeholder="e.g. Blood Hunter, Artificer" ${initialMode === 'class' ? '' : 'disabled'}>
                    </div>
                    <div class="ac-form-group">
                        <label for="class-input-ruleset">Ruleset *</label>
                        <select id="class-input-ruleset" class="ac-form-input" required ${initialMode === 'class' ? '' : 'disabled'}>
                            <option value="2014" selected>2014</option>
                            <option value="2024">2024</option>
                        </select>
                    </div>
                    <div class="ac-form-group">
                        <label for="class-input-category">Category *</label>
                        <select id="class-input-category" class="ac-form-input" required ${initialMode === 'class' ? '' : 'disabled'}>
                            <option value="Official" selected>Official</option>
                            <option value="Hawthorne Homebrew">Hawthorne Homebrew</option>
                        </select>
                    </div>
                    <div class="ac-form-group">
                        <label for="class-input-hitdie">Hit Die *</label>
                        <input type="text" id="class-input-hitdie" required class="ac-form-input" value="d8" placeholder="d6, d8, d10, d12" ${initialMode === 'class' ? '' : 'disabled'}>
                    </div>
                    <div class="ac-form-group">
                        <label for="class-input-source">Source *</label>
                        <input type="text" id="class-input-source" required class="ac-form-input" value="PHB2014" placeholder="e.g. PHB2014, TCE, BH2022" ${initialMode === 'class' ? '' : 'disabled'}>
                    </div>
                    <div class="ac-form-group">
                        <label for="class-input-multiclass">Multiclassing Requirements & Proficiencies</label>
                        <textarea id="class-input-multiclass" class="ac-form-textarea" rows="3" placeholder="Requires DEX 13, INT 13..." ${initialMode === 'class' ? '' : 'disabled'}></textarea>
                    </div>
                    <div class="ac-form-group">
                        <label for="class-input-expanded">Expanded Options (TCE)</label>
                        <textarea id="class-input-expanded" class="ac-form-textarea" rows="2" placeholder="Optional feature replacements..." ${initialMode === 'class' ? '' : 'disabled'}></textarea>
                    </div>
                    <div class="ac-form-group">
                        <label for="class-input-notes">Base Notes / Advice</label>
                        <textarea id="class-input-notes" class="ac-form-textarea" rows="3" placeholder="Guild rulings, advice..." ${initialMode === 'class' ? '' : 'disabled'}></textarea>
                    </div>
                    <div class="ac-form-group" style="border-top: 1px dashed var(--border-color, rgba(0,0,0,0.15)); padding-top: 0.75rem;">
                        <label for="class-input-initial-subclass">Initial Subclass (Optional)</label>
                        <input type="text" id="class-input-initial-subclass" class="ac-form-input" placeholder="e.g. Ghostslayer (leave blank if adding subclasses later)" ${initialMode === 'class' ? '' : 'disabled'}>
                    </div>
                </div>

                <!-- Section: New Subclass -->
                <div id="section-new-subclass" style="display: ${initialMode === 'subclass' ? 'flex' : 'none'}; flex-direction: column; gap: 1rem;">
                    <div class="ac-form-group">
                        <label for="class-select-parent">Parent Class *</label>
                        <select id="class-select-parent" class="ac-form-input" required ${initialMode === 'subclass' ? '' : 'disabled'}>
                            <option value="NEW">+ Create New Base Class...</option>
                            ${allClasses.map(c => `
                                <option value="${esc(c.id)}" ${selectedParentClass?.id === c.id ? 'selected' : ''}>
                                    ${esc(c.name)} (${esc(c.ruleset)})
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="ac-form-group">
                        <label for="subclass-input-name">Subclass Name *</label>
                        <input type="text" id="subclass-input-name" required class="ac-form-input" placeholder="e.g. Battle Master, Berserker" ${initialMode === 'subclass' ? '' : 'disabled'}>
                    </div>
                    <div class="ac-form-group">
                        <label for="subclass-input-ruleset">Ruleset *</label>
                        <select id="subclass-input-ruleset" class="ac-form-input" required ${initialMode === 'subclass' ? '' : 'disabled'}>
                            <option value="2014" selected>2014</option>
                            <option value="2024">2024</option>
                        </select>
                    </div>
                    <div class="ac-form-group">
                        <label for="subclass-input-category">Category *</label>
                        <select id="subclass-input-category" class="ac-form-input" required ${initialMode === 'subclass' ? '' : 'disabled'}>
                            <option value="Official" selected>Official</option>
                            <option value="Hawthorne Homebrew">Hawthorne Homebrew</option>
                        </select>
                    </div>
                    <div class="ac-form-group">
                        <label for="subclass-input-source">Source *</label>
                        <input type="text" id="subclass-input-source" required class="ac-form-input" value="PHB2014" placeholder="e.g. PHB2014, TCE, XGE, HTA" ${initialMode === 'subclass' ? '' : 'disabled'}>
                    </div>
                    <div class="ac-form-group">
                        <label for="subclass-input-link">Document Link</label>
                        <input type="text" id="subclass-input-link" class="ac-form-input" placeholder="https://... or /arcana/..." ${initialMode === 'subclass' ? '' : 'disabled'}>
                    </div>
                    <div class="ac-form-group">
                        <label for="subclass-input-notes">Subclass Notes / Advice</label>
                        <textarea id="subclass-input-notes" class="ac-form-textarea" rows="3" ${initialMode === 'subclass' ? '' : 'disabled'}></textarea>
                    </div>
                </div>
            `)}

            <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
                <button type="button" class="ac-btn-admin ac-btn-secondary" id="class-form-cancel">Cancel</button>
                <button type="submit" class="ac-btn-admin ac-btn-primary" id="class-form-submit">Save Changes</button>
            </div>
        </form>
    `;

    openModal(html);

    const cancelBtn = document.getElementById('class-form-cancel');
    if (cancelBtn) cancelBtn.onclick = closeModal;

    const radioClass = document.getElementById('type-radio-class');
    const radioSubclass = document.getElementById('type-radio-subclass');
    const parentSelect = document.getElementById('class-select-parent');

    function setFormMode(mode) {
        const isClass = mode === 'class';
        const sectionClass = document.getElementById('section-new-class');
        const sectionSubclass = document.getElementById('section-new-subclass');
        const headerCatEl = document.getElementById('modal-header-category');
        const headerTitleEl = document.getElementById('modal-header-title');

        if (sectionClass) {
            sectionClass.style.display = isClass ? 'flex' : 'none';
            sectionClass.querySelectorAll('input, select, textarea').forEach(el => el.disabled = !isClass);
        }
        if (sectionSubclass) {
            sectionSubclass.style.display = isClass ? 'none' : 'flex';
            sectionSubclass.querySelectorAll('input, select, textarea').forEach(el => el.disabled = isClass);
        }
        if (headerCatEl) headerCatEl.textContent = isClass ? 'New Base Class' : 'New Subclass';
        if (headerTitleEl) headerTitleEl.textContent = isClass ? 'Add New Base Class' : 'Add New Subclass';
        if (radioClass) radioClass.checked = isClass;
        if (radioSubclass) radioSubclass.checked = !isClass;
    }

    if (radioClass) radioClass.onchange = () => setFormMode('class');
    if (radioSubclass) radioSubclass.onchange = () => setFormMode('subclass');
    if (parentSelect) {
        parentSelect.onchange = () => {
            if (parentSelect.value === 'NEW') {
                setFormMode('class');
            }
        };
    }

    const form = document.getElementById('ac-class-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('class-form-submit');
            if (submitBtn) submitBtn.disabled = true;

            try {
                if (isEditBaseClass && selectedParentClass) {
                    const name = document.getElementById('class-input-name').value.trim();
                    const ruleset = document.getElementById('class-input-ruleset').value;
                    const hit_die = document.getElementById('class-input-hitdie').value.trim();
                    const source = document.getElementById('class-input-source').value.trim();
                    const category = document.getElementById('class-input-category')?.value || 'Official';
                    const multiclassing = document.getElementById('class-input-multiclass').value.trim();
                    const expanded_options = document.getElementById('class-input-expanded').value.trim();
                    const notes_advice = document.getElementById('class-input-notes').value.trim();

                    const { error } = await updateClass(selectedParentClass.id, {
                        name, ruleset, hit_die, source, category, multiclassing, expanded_options, notes_advice
                    });
                    if (error) throw error;
                } else if (subclassItem) {
                    // Update Subclass
                    const parentId = document.getElementById('class-select-parent').value;
                    const name = document.getElementById('subclass-input-name').value.trim();
                    const ruleset = document.getElementById('subclass-input-ruleset').value;
                    const category = document.getElementById('subclass-input-category').value;
                    const source = document.getElementById('subclass-input-source').value.trim();
                    const link = document.getElementById('subclass-input-link').value.trim() || null;
                    const notes_advice = document.getElementById('subclass-input-notes').value.trim() || null;

                    const { error } = await updateSubclass(subclassItem.id, {
                        class_id: parentId, name, ruleset, category, source, link, notes_advice
                    });
                    if (error) throw error;
                } else {
                    // Creation mode
                    const isCreatingBaseClass = radioClass ? radioClass.checked : (initialMode === 'class');

                    if (isCreatingBaseClass) {
                        const name = document.getElementById('class-input-name').value.trim();
                        const ruleset = document.getElementById('class-input-ruleset').value;
                        const hit_die = document.getElementById('class-input-hitdie').value.trim();
                        const category = document.getElementById('class-input-category')?.value || 'Official';
                        const source = document.getElementById('class-input-source').value.trim();
                        const multiclassing = document.getElementById('class-input-multiclass').value.trim() || null;
                        const expanded_options = document.getElementById('class-input-expanded').value.trim() || null;
                        const notes_advice = document.getElementById('class-input-notes').value.trim() || null;
                        const initialSub = document.getElementById('class-input-initial-subclass')?.value.trim();

                        const nextClassOrder = getNextDisplayOrder(allClasses);
                        const { data: newClass, error: classErr } = await createClass({
                            name, ruleset, category, hit_die, source, multiclassing, expanded_options, notes_advice, display_order: nextClassOrder
                        });
                        if (classErr) throw classErr;

                        if (initialSub && newClass?.id) {
                            const { error: subErr } = await createSubclass({
                                class_id: newClass.id,
                                name: initialSub,
                                ruleset,
                                category,
                                source,
                                link: null,
                                notes_advice: null,
                                display_order: 10.0
                            });
                            if (subErr) console.warn('Could not create initial subclass:', subErr);
                        }
                    } else {
                        // Create New Subclass
                        const parentId = document.getElementById('class-select-parent').value;
                        if (parentId === 'NEW') {
                            setFormMode('class');
                            if (submitBtn) submitBtn.disabled = false;
                            return;
                        }
                        const name = document.getElementById('subclass-input-name').value.trim();
                        const ruleset = document.getElementById('subclass-input-ruleset').value;
                        const category = document.getElementById('subclass-input-category').value;
                        const source = document.getElementById('subclass-input-source').value.trim();
                        const link = document.getElementById('subclass-input-link').value.trim() || null;
                        const notes_advice = document.getElementById('subclass-input-notes').value.trim() || null;

                        const parentClass = allClasses.find(c => c.id === parentId);
                        const existingSubs = parentClass ? (parentClass.subclasses || []) : [];
                        const nextOrder = getNextDisplayOrder(existingSubs);

                        const { error } = await createSubclass({
                            class_id: parentId, name, ruleset, category, source, link, notes_advice, display_order: nextOrder
                        });
                        if (error) throw error;
                    }
                }

                closeModal();
                await initClasses(true);
            } catch (err) {
                alert(`Error saving class data: ${err.message}`);
                if (submitBtn) submitBtn.disabled = false;
            }
        };
    }
}

/**
 * Confirms and deletes a base class and all its subclasses.
 * 
 * @param {Object} cls
 */
export async function confirmAndDeleteClass(cls) {
    if (!cls) return;
    const confirmed = confirm(`Are you sure you want to delete the class "${cls.name} (${cls.ruleset})" and all its subclasses? This cannot be undone.`);
    if (!confirmed) return;

    try {
        const { success, error } = await deleteClass(cls.id);
        if (!success) throw error;
        closeModal();
        await initClasses(true);
    } catch (err) {
        alert(`Failed to delete class: ${err.message}`);
    }
}

/**
 * Confirms and deletes a subclass.
 * 
 * @param {Object} sub
 * @param {Object} cls
 */
export async function confirmAndDeleteSubclass(sub, cls) {
    if (!sub) return;
    const confirmed = confirm(`Are you sure you want to delete the subclass "${sub.name}" from ${cls.name}?`);
    if (!confirmed) return;

    try {
        const { success, error } = await deleteSubclass(sub.id);
        if (!success) throw error;
        closeModal();
        await initClasses(true);
    } catch (err) {
        alert(`Failed to delete subclass: ${err.message}`);
    }
}
