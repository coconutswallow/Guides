/**
 * ============================================================================
 * ALLOWED CONTENT (AC) SCHEMA & ERD VIEWER
 * ============================================================================
 * Interactive ERD, searchable data dictionary, and relationship graph viewer.
 */

import { AC_TABLES, AC_DOMAINS, AC_TABS_MAPPING, AC_SCHEMA_GENERATED_AT } from './ac-schema-data.js';

// Table Graph Node Positions (Pre-calculated logical cluster layout)
const NODE_POSITIONS = {
    // Top: Sources & Core Reference
    'ac_sources': { x: 1250, y: 50 },

    // Cluster: Character Options - Classes & Subclasses
    'ac_classes': { x: 450, y: 150 },
    'ac_subclasses': { x: 450, y: 440 },
    'v_ac_classes': { x: 150, y: 280 },

    // Cluster: Character Options - Races & Lineages
    'ac_races': { x: 850, y: 150 },
    'ac_subraces': { x: 850, y: 440 },
    'v_ac_races': { x: 1150, y: 280 },

    // Cluster: Backgrounds, Feats, Spells
    'ac_backgrounds': { x: 1550, y: 200 },
    'ac_feats': { x: 1550, y: 460 },
    'ac_spells': { x: 1250, y: 460 },

    // Cluster: Misc Features
    'ac_artificer_infusions': { x: 1850, y: 150 },
    'ac_eldritch_invocations': { x: 1850, y: 400 },
    'ac_fighting_styles': { x: 1850, y: 640 },

    // Cluster: Languages
    'ac_language_types': { x: 2150, y: 150 },
    'ac_languages': { x: 2150, y: 400 },

    // Cluster: Equipment & Gear
    'ac_equip_type': { x: 450, y: 800 },
    'ac_equipment': { x: 450, y: 1040 },
    'ac_item_tag': { x: 150, y: 920 },
    'ac_item_properties_categories': { x: 800, y: 800 },
    'ac_item_properties': { x: 800, y: 1040 },

    // Cluster: Loot & Rewards & Tiers
    'ac_tiers': { x: 1450, y: 780 },
    'ac_loot_categories': { x: 1150, y: 780 },
    'ac_loot': { x: 1150, y: 1020 },
    'ac_loot_tags': { x: 1150, y: 1320 },
    'ac_other_rewards_categories': { x: 1750, y: 780 },
    'ac_other_rewards': { x: 1750, y: 1020 },

    // Cluster: Bastions & Downtime
    'ac_downtime_type': { x: 2150, y: 780 },
    'ac_downtime': { x: 2150, y: 1020 },
    'ac_bastion_type': { x: 2450, y: 780 },
    'ac_bastion': { x: 2450, y: 1020 },

    // Cluster: Monsters
    'ac_monsters_categories': { x: 1450, y: 1250 },
    'ac_monsters': { x: 1450, y: 1470 }
};

const CARD_WIDTH = 250;
const ROW_HEIGHT = 19;
const HEADER_HEIGHT = 56;
const MAX_PREVIEW_COLS = 5;

export class ACSchemaViewer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.currentView = 'erd'; // 'erd' | 'dict' | 'export'
        this.currentDomain = 'all';
        this.searchQuery = '';
        this.selectedTableId = null;

        // Transform state for SVG Pan & Zoom
        this.transform = { x: -300, y: -20, scale: 0.65 };
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };

        this.init();
    }

    init() {
        this.renderShell();
        this.bindEvents();
        this.renderCurrentView();
    }

    renderShell() {
        this.container.innerHTML = `
            <div class="ac-schema-container">
                <header class="ac-schema-header">
                    <div class="ac-schema-title-group">
                        <a href="${window.BASE_URL || ''}/staff/" class="ac-schema-back-link">← Back to Staff Portal</a>
                        <h1>Allowed Content Data Schema & ERD</h1>
                        <p class="ac-schema-subtitle">
                            Interactive data topology, table schemas, foreign key relationships, and tab mappings for all <strong>${Object.keys(AC_TABLES).length} Allowed Content tables and views</strong>.
                        </p>
                    </div>
                </header>

                <div class="ac-schema-toolbar">
                    <div class="ac-schema-toolbar-row">
                        <!-- View Mode Switcher -->
                        <div class="ac-view-switcher">
                            <button class="ac-view-btn active" data-view="erd">
                                <span>📊</span> Interactive ERD
                            </button>
                            <button class="ac-view-btn" data-view="dict">
                                <span>📖</span> Data Dictionary
                            </button>
                            <button class="ac-view-btn" data-view="export">
                                <span>📋</span> Mermaid ERD
                            </button>
                        </div>

                        <!-- Search Box -->
                        <div class="ac-schema-search-box">
                            <span class="ac-schema-search-icon">🔍</span>
                            <input type="text" id="ac-schema-search" class="ac-schema-search-input" placeholder="Search tables, fields (e.g. tier_id, ruleset, source)..." autocomplete="off" />
                            <button id="ac-schema-clear" class="ac-schema-clear-btn" title="Clear Search">✕</button>
                        </div>
                    </div>

                    <!-- Domain & Tab Filters -->
                    <div class="ac-schema-toolbar-row">
                        <div class="ac-schema-filters" id="ac-filter-pills">
                            <span class="ac-filter-label">Filter:</span>
                            <button class="ac-filter-pill active" data-domain="all">
                                All Tables <span class="pill-count">${Object.keys(AC_TABLES).length}</span>
                            </button>
                            ${AC_DOMAINS.map(domain => {
                                const count = Object.values(AC_TABLES).filter(t => t.domain === domain).length;
                                return `
                                    <button class="ac-filter-pill" data-domain="${domain}">
                                        ${domain} <span class="pill-count">${count}</span>
                                    </button>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>

                <!-- Main Content Viewport -->
                <main id="ac-view-viewport">
                    <!-- Dynamic View Rendered Here -->
                </main>
            </div>
        `;
    }

    bindEvents() {
        // View Switcher
        this.container.querySelectorAll('.ac-view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetView = e.currentTarget.dataset.view;
                if (targetView === this.currentView) return;

                this.container.querySelectorAll('.ac-view-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.currentView = targetView;
                this.renderCurrentView();
            });
        });

        // Search Input
        const searchInput = this.container.querySelector('#ac-schema-search');
        const clearBtn = this.container.querySelector('#ac-schema-clear');

        searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.trim().toLowerCase();
            clearBtn.style.display = this.searchQuery ? 'block' : 'none';
            this.handleSearchFilter();
        });

        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            this.searchQuery = '';
            clearBtn.style.display = 'none';
            this.handleSearchFilter();
        });

        // Domain Filters
        this.container.querySelector('#ac-filter-pills').addEventListener('click', (e) => {
            const pill = e.target.closest('.ac-filter-pill');
            if (!pill) return;

            this.container.querySelectorAll('.ac-filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            this.currentDomain = pill.dataset.domain;
            this.handleSearchFilter(true);
        });
    }

    renderCurrentView() {
        const viewport = this.container.querySelector('#ac-view-viewport');

        if (this.currentView === 'erd') {
            this.renderErdView(viewport);
        } else if (this.currentView === 'dict') {
            this.renderDataDictionaryView(viewport);
        } else if (this.currentView === 'export') {
            this.renderMermaidExportView(viewport);
        }
    }

    /* ============================================================================
     * INTERACTIVE ERD DIAGRAM VIEW
     * ============================================================================ */
    renderErdView(container) {
        container.innerHTML = `
            <div class="ac-erd-layout">
                <!-- Status Overlay -->
                <div class="ac-erd-stats">
                    <span>Tables: <strong>${Object.keys(AC_TABLES).length}</strong></span>
                    <span>Scroll to zoom, drag to pan</span>
                </div>

                <!-- Floating Canvas Controls -->
                <div class="ac-erd-controls">
                    <button class="ac-ctrl-btn" id="ctrl-zoom-in" title="Zoom In">+</button>
                    <button class="ac-ctrl-btn" id="ctrl-zoom-out" title="Zoom Out">−</button>
                    <div class="ac-ctrl-divider"></div>
                    <button class="ac-ctrl-btn" id="ctrl-reset" title="Reset View" style="font-size: 0.85rem;">100%</button>
                    <button class="ac-ctrl-btn" id="ctrl-fit" title="Fit to Screen" style="font-size: 0.85rem;">⛶</button>
                </div>

                <!-- SVG Canvas Container -->
                <div class="ac-erd-canvas-container" id="erd-canvas-container">
                    <svg id="erd-svg" class="ac-erd-svg" width="100%" height="100%">
                        <defs>
                            <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="var(--palette-neutral-gray-400, #888)" />
                            </marker>
                            <marker id="arrow-highlight" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                                <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="var(--color-primary, #58180D)" />
                            </marker>
                        </defs>
                        <g id="erd-viewport">
                            <g id="erd-edges"></g>
                            <g id="erd-nodes"></g>
                        </g>
                    </svg>
                </div>

                <!-- Slide-Out Inspector Drawer -->
                <aside class="ac-inspector-drawer collapsed" id="erd-inspector-drawer">
                    <div class="ac-drawer-header">
                        <span style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--color-text-secondary);">Table Inspector</span>
                        <button class="ac-drawer-close" id="erd-drawer-close" title="Close Drawer">✕</button>
                    </div>
                    <div class="ac-drawer-body" id="erd-drawer-body">
                        <!-- Rendered upon node click -->
                    </div>
                </aside>
            </div>
        `;

        this.initErdSvg();
    }

    initErdSvg() {
        const svgContainer = this.container.querySelector('#erd-canvas-container');
        const viewportGroup = this.container.querySelector('#erd-viewport');
        const edgesGroup = this.container.querySelector('#erd-edges');
        const nodesGroup = this.container.querySelector('#erd-nodes');

        // Draw Nodes
        let nodesHtml = '';
        for (const [tableId, table] of Object.entries(AC_TABLES)) {
            const pos = NODE_POSITIONS[tableId] || { x: 500, y: 500 };
            const previewCols = table.columns.slice(0, MAX_PREVIEW_COLS);
            const extraCount = Math.max(0, table.columns.length - MAX_PREVIEW_COLS);
            const cardHeight = HEADER_HEIGHT + (previewCols.length * ROW_HEIGHT) + (extraCount > 0 ? ROW_HEIGHT : 8);

            nodesHtml += `
                <g class="erd-node" id="node-${tableId}" data-table-id="${tableId}" transform="translate(${pos.x}, ${pos.y})">
                    <!-- Background Card -->
                    <rect class="node-card-bg" width="${CARD_WIDTH}" height="${cardHeight}" />
                    
                    <!-- Header Background -->
                    <rect class="node-header-bg" width="${CARD_WIDTH}" height="${HEADER_HEIGHT}" rx="6" ry="6" />
                    <line class="node-header-line" x1="0" y1="${HEADER_HEIGHT}" x2="${CARD_WIDTH}" y2="${HEADER_HEIGHT}" />
                    
                    <!-- Header Title & Name -->
                    <text class="node-header-title" x="12" y="22">${this.escapeHtml(table.title)}</text>
                    <text class="node-header-sub" x="12" y="38">${this.escapeHtml(tableId)}</text>
                    <text class="node-badge-tab" x="${CARD_WIDTH - 12}" y="22" text-anchor="end">${this.escapeHtml(table.tabNames[0] || '')}</text>
                    <text class="node-header-sub" x="${CARD_WIDTH - 12}" y="38" text-anchor="end">${table.rowCount.toLocaleString()} rows</text>
                    
                    <!-- Columns Preview -->
                    <g transform="translate(12, ${HEADER_HEIGHT + 14})">
                        ${previewCols.map((col, idx) => {
                            const y = idx * ROW_HEIGHT;
                            let prefix = '';
                            let keyClass = '';
                            if (col.isPk) { prefix = '🔑 '; keyClass = 'node-key-pk'; }
                            else if (col.isFk) { prefix = '🔗 '; keyClass = 'node-key-fk'; }

                            return `
                                <text class="node-row-text ${keyClass}" x="0" y="${y}">
                                    ${prefix}${this.escapeHtml(col.name)}
                                </text>
                                <text class="node-row-type" x="${CARD_WIDTH - 24}" y="${y}">
                                    ${this.escapeHtml(col.type)}
                                </text>
                            `;
                        }).join('')}
                        ${extraCount > 0 ? `
                            <text class="node-header-sub" x="0" y="${previewCols.length * ROW_HEIGHT}" style="font-style: italic;">
                                ...+${extraCount} more fields
                            </text>
                        ` : ''}
                    </g>
                </g>
            `;
        }
        nodesGroup.innerHTML = nodesHtml;

        // Draw Relationships (Edges)
        let edgesHtml = '';
        for (const [tableId, table] of Object.entries(AC_TABLES)) {
            const fromPos = NODE_POSITIONS[tableId];
            if (!fromPos) continue;

            for (const fk of table.foreignKeys) {
                const toTableId = fk.toTable;
                const toPos = NODE_POSITIONS[toTableId];
                if (!toPos) continue;

                const edgeId = `edge-${tableId}-${toTableId}-${fk.fromColumn}`;
                const pathD = this.calculateEdgePath(fromPos, toPos);

                edgesHtml += `
                    <g class="erd-edge-group" data-from="${tableId}" data-to="${toTableId}">
                        <path id="${edgeId}" class="erd-edge" d="${pathD}" marker-end="url(#arrow)" />
                    </g>
                `;
            }
        }
        edgesGroup.innerHTML = edgesHtml;

        // Setup Zoom & Pan Interactions
        this.updateSvgTransform();

        // Mouse Drag Pan
        svgContainer.addEventListener('mousedown', (e) => {
            if (e.target.closest('.erd-node') || e.target.closest('.ac-ctrl-btn')) return;
            this.isDragging = true;
            svgContainer.classList.add('is-dragging');
            this.dragStart = { x: e.clientX - this.transform.x, y: e.clientY - this.transform.y };
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            this.transform.x = e.clientX - this.dragStart.x;
            this.transform.y = e.clientY - this.dragStart.y;
            this.updateSvgTransform();
        });

        window.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                svgContainer.classList.remove('is-dragging');
            }
        });

        // Mouse Wheel Zoom (Around Cursor)
        svgContainer.addEventListener('wheel', (e) => {
            e.preventDefault();
            svgContainer.classList.add('is-dragging');
            const rect = svgContainer.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
            const newScale = Math.min(Math.max(this.transform.scale * zoomFactor, 0.15), 3.0);

            // Zoom centered on cursor
            this.transform.x = mouseX - (mouseX - this.transform.x) * (newScale / this.transform.scale);
            this.transform.y = mouseY - (mouseY - this.transform.y) * (newScale / this.transform.scale);
            this.transform.scale = newScale;

            this.updateSvgTransform();

            clearTimeout(this._wheelTimeout);
            this._wheelTimeout = setTimeout(() => {
                svgContainer.classList.remove('is-dragging');
            }, 100);
        }, { passive: false });

        // Controls
        this.container.querySelector('#ctrl-zoom-in').addEventListener('click', () => {
            this.zoomBy(1.25);
        });

        this.container.querySelector('#ctrl-zoom-out').addEventListener('click', () => {
            this.zoomBy(0.8);
        });

        this.container.querySelector('#ctrl-reset').addEventListener('click', () => {
            this.transform = { x: -300, y: -20, scale: 0.65 };
            this.updateSvgTransform();
        });

        this.container.querySelector('#ctrl-fit').addEventListener('click', () => {
            this.fitAllNodes();
        });

        // Node Selection
        nodesGroup.addEventListener('click', (e) => {
            const nodeEl = e.target.closest('.erd-node');
            if (!nodeEl) return;
            const tableId = nodeEl.dataset.tableId;
            this.selectTable(tableId);
        });

        // Close Drawer
        this.container.querySelector('#erd-drawer-close').addEventListener('click', () => {
            this.closeInspector();
        });
    }

    calculateEdgePath(fromPos, toPos) {
        const fromX = fromPos.x + CARD_WIDTH / 2;
        const fromY = fromPos.y + 20;
        const toX = toPos.x + CARD_WIDTH / 2;
        const toY = toPos.y + 20;

        const dx = toX - fromX;
        const dy = toY - fromY;
        const curveOffset = Math.min(Math.abs(dx) * 0.4, 150);

        return `M ${fromX} ${fromY} C ${fromX + (dx > 0 ? curveOffset : -curveOffset)} ${fromY}, ${toX - (dx > 0 ? curveOffset : -curveOffset)} ${toY}, ${toX} ${toY}`;
    }

    updateSvgTransform() {
        const viewportGroup = this.container.querySelector('#erd-viewport');
        if (viewportGroup) {
            viewportGroup.setAttribute('transform', `translate(${this.transform.x}, ${this.transform.y}) scale(${this.transform.scale})`);
        }
    }

    zoomBy(factor) {
        const svgContainer = this.container.querySelector('#erd-canvas-container');
        if (!svgContainer) return;

        const rect = svgContainer.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const newScale = Math.min(Math.max(this.transform.scale * factor, 0.15), 3.0);
        this.transform.x = centerX - (centerX - this.transform.x) * (newScale / this.transform.scale);
        this.transform.y = centerY - (centerY - this.transform.y) * (newScale / this.transform.scale);
        this.transform.scale = newScale;

        this.updateSvgTransform();
    }

    fitAllNodes() {
        const svgContainer = this.container.querySelector('#erd-canvas-container');
        if (!svgContainer) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const pos of Object.values(NODE_POSITIONS)) {
            minX = Math.min(minX, pos.x);
            minY = Math.min(minY, pos.y);
            maxX = Math.max(maxX, pos.x + CARD_WIDTH);
            maxY = Math.max(maxY, pos.y + 200);
        }

        const rect = svgContainer.getBoundingClientRect();
        const padding = 80;
        const contentWidth = maxX - minX + padding * 2;
        const contentHeight = maxY - minY + padding * 2;

        const scaleX = rect.width / contentWidth;
        const scaleY = rect.height / contentHeight;
        const newScale = Math.min(scaleX, scaleY, 1.0);

        this.transform = {
            x: (rect.width - contentWidth * newScale) / 2 - minX * newScale + padding * newScale,
            y: (rect.height - contentHeight * newScale) / 2 - minY * newScale + padding * newScale,
            scale: newScale
        };

        this.updateSvgTransform();
    }

    selectTable(tableId) {
        this.selectedTableId = tableId;
        const table = AC_TABLES[tableId];
        if (!table) return;

        // Highlight selected node
        this.container.querySelectorAll('.erd-node').forEach(n => {
            n.classList.toggle('selected', n.dataset.tableId === tableId);
        });

        // Highlight connected edges
        this.container.querySelectorAll('.erd-edge').forEach(edge => {
            const group = edge.closest('.erd-edge-group');
            const isConnected = group.dataset.from === tableId || group.dataset.to === tableId;
            edge.classList.toggle('highlighted', isConnected);
            edge.setAttribute('marker-end', isConnected ? 'url(#arrow-highlight)' : 'url(#arrow)');
        });

        // Open Inspector Drawer
        this.renderDrawer(table);
    }

    renderDrawer(table) {
        const drawer = this.container.querySelector('#erd-inspector-drawer');
        const body = this.container.querySelector('#erd-drawer-body');
        if (!drawer || !body) return;

        drawer.classList.remove('collapsed');

        body.innerHTML = `
            <h2 class="ac-drawer-title">${this.escapeHtml(table.title)}</h2>
            <div class="ac-drawer-table-name"><code>${this.escapeHtml(table.id)}</code></div>

            <div class="ac-drawer-meta-pills">
                <span class="ac-badge ac-badge-tab">Tab: ${this.escapeHtml(table.tabNames.join(', '))}</span>
                <span class="ac-badge ac-badge-count">${table.type}</span>
                <span class="ac-badge ac-badge-count">${table.rowCount.toLocaleString()} rows</span>
            </div>

            <p class="ac-drawer-desc">${this.escapeHtml(table.description)}</p>

            ${table.foreignKeys.length > 0 ? `
                <div class="ac-drawer-section-title">Foreign Keys (Outbound)</div>
                <ul class="ac-rel-list">
                    ${table.foreignKeys.map(fk => `
                        <li class="ac-rel-item">
                            <span><code>${this.escapeHtml(fk.fromColumn)}</code> →</span>
                            <a class="ac-rel-link" data-jump-table="${fk.toTable}">
                                <strong>${this.escapeHtml(fk.toTable)}</strong>.<code>${this.escapeHtml(fk.toColumn)}</code>
                            </a>
                        </li>
                    `).join('')}
                </ul>
            ` : ''}

            ${table.inboundRelations.length > 0 ? `
                <div class="ac-drawer-section-title">Referenced By (Inbound)</div>
                <ul class="ac-rel-list">
                    ${table.inboundRelations.map(rel => `
                        <li class="ac-rel-item">
                            <a class="ac-rel-link" data-jump-table="${rel.fromTable}">
                                <strong>${this.escapeHtml(rel.fromTable)}</strong>
                            </a>
                            <span>via <code>${this.escapeHtml(rel.fromColumn)}</code></span>
                        </li>
                    `).join('')}
                </ul>
            ` : ''}

            <div class="ac-drawer-section-title">Columns (${table.columns.length})</div>
            <div class="ac-dict-cols-table-wrapper">
                <table class="ac-cols-table">
                    <thead>
                        <tr>
                            <th>Column</th>
                            <th>Type</th>
                            <th>Key</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${table.columns.map(col => `
                            <tr>
                                <td>
                                    <strong><code>${this.escapeHtml(col.name)}</code></strong>
                                    ${!col.nullable ? '<span style="color: #c93b27; font-size: 0.75rem;" title="Required">*</span>' : ''}
                                    ${col.description ? `<div style="font-size: 0.75rem; color: var(--color-text-secondary); margin-top: 2px;">${this.escapeHtml(col.description)}</div>` : ''}
                                </td>
                                <td><span class="ac-type-tag">${this.escapeHtml(col.type)}</span></td>
                                <td>
                                    ${col.isPk ? '<span class="ac-col-key-pk">PK</span>' : ''}
                                    ${col.isFk ? `<span class="ac-col-key-fk" title="FK to ${col.fkTarget.table}">FK</span>` : ''}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div style="margin-top: 1.5rem; display: flex; gap: 0.5rem;">
                <a href="${window.BASE_URL || ''}/allowed-content/?tab=${table.tabs[0]}" class="tool-button" style="margin-top: 0; font-size: 0.85rem; padding: 0.4rem 0.8rem; text-decoration: none;">
                    Open ${table.tabNames[0]} Tab ↗
                </a>
            </div>
        `;

        // Bind jump links
        body.querySelectorAll('[data-jump-table]').forEach(link => {
            link.addEventListener('click', (e) => {
                const targetTable = e.currentTarget.dataset.jumpTable;
                this.panToTable(targetTable);
                this.selectTable(targetTable);
            });
        });
    }

    closeInspector() {
        const drawer = this.container.querySelector('#erd-inspector-drawer');
        if (drawer) drawer.classList.add('collapsed');
        this.container.querySelectorAll('.erd-node').forEach(n => n.classList.remove('selected'));
        this.container.querySelectorAll('.erd-edge').forEach(e => {
            e.classList.remove('highlighted');
            e.setAttribute('marker-end', 'url(#arrow)');
        });
        this.selectedTableId = null;
    }

    panToTable(tableId, targetScale = 0.9) {
        const pos = NODE_POSITIONS[tableId];
        const svgContainer = this.container.querySelector('#erd-canvas-container');
        if (!pos || !svgContainer) return;

        const rect = svgContainer.getBoundingClientRect();
        this.transform.scale = targetScale;
        this.transform.x = rect.width / 2 - (pos.x + CARD_WIDTH / 2) * this.transform.scale;
        this.transform.y = rect.height / 2 - (pos.y + 100) * this.transform.scale;

        this.updateSvgTransform();
    }

    /* ============================================================================
     * SEARCH & FILTER LOGIC
     * ============================================================================ */
    handleSearchFilter(isFilterClick = false) {
        const q = this.searchQuery;
        const dom = this.currentDomain;

        if (this.currentView === 'erd') {
            let matchedFirst = null;

            for (const [tableId, table] of Object.entries(AC_TABLES)) {
                const nodeEl = this.container.querySelector(`#node-${tableId}`);
                if (!nodeEl) continue;

                // Match domain
                const domainMatches = dom === 'all' || table.domain === dom;

                // Match search query (table name, title, columns, tabs)
                let searchMatches = true;
                if (q) {
                    const inName = table.id.toLowerCase().includes(q) || table.title.toLowerCase().includes(q);
                    const inDesc = table.description.toLowerCase().includes(q);
                    const inTabs = table.tabNames.some(t => t.toLowerCase().includes(q));
                    const inCols = table.columns.some(c => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q));
                    searchMatches = inName || inDesc || inTabs || inCols;
                }

                const visible = domainMatches && searchMatches;

                nodeEl.classList.toggle('dimmed', !visible);
                nodeEl.classList.toggle('matched', Boolean(visible && (q || dom !== 'all')));

                if (visible && !matchedFirst) {
                    matchedFirst = tableId;
                }
            }

            // Auto-pan and zoom to the first relevant table when a filter or search is applied
            if (dom === 'all' && !q && isFilterClick) {
                this.fitAllNodes();
                this.closeInspector();
            } else if (matchedFirst && (isFilterClick || q)) {
                this.panToTable(matchedFirst, 0.9);
                this.selectTable(matchedFirst);
            }
        } else if (this.currentView === 'dict') {
            this.renderDataDictionaryView(this.container.querySelector('#ac-view-viewport'));
        }
    }

    /* ============================================================================
     * DATA DICTIONARY VIEW
     * ============================================================================ */
    renderDataDictionaryView(container) {
        const q = this.searchQuery;
        const dom = this.currentDomain;

        const filteredTables = Object.values(AC_TABLES).filter(table => {
            const domainMatches = dom === 'all' || table.domain === dom;
            if (!domainMatches) return false;

            if (q) {
                const inName = table.id.toLowerCase().includes(q) || table.title.toLowerCase().includes(q);
                const inDesc = table.description.toLowerCase().includes(q);
                const inTabs = table.tabNames.some(t => t.toLowerCase().includes(q));
                const inCols = table.columns.some(c => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q));
                return inName || inDesc || inTabs || inCols;
            }
            return true;
        });

        container.innerHTML = `
            <div class="ac-dict-layout">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <span style="font-size: 0.95rem; color: var(--color-text-secondary);">
                        Showing <strong>${filteredTables.length}</strong> of ${Object.keys(AC_TABLES).length} tables
                    </span>
                </div>

                ${filteredTables.length === 0 ? `
                    <div style="text-align: center; padding: 3rem; background: var(--color-bg-light); border: 1px solid var(--color-border); border-radius: 8px;">
                        <h3>No matching tables found</h3>
                        <p style="color: var(--color-text-secondary);">Try clearing your search query or filter chip.</p>
                    </div>
                ` : filteredTables.map(table => `
                    <article class="ac-dict-table-card" id="dict-${table.id}">
                        <div class="ac-dict-card-header">
                            <div>
                                <h3>${this.escapeHtml(table.title)}</h3>
                                <div style="font-family: var(--font-mono, monospace); font-size: 0.92rem; color: var(--color-text-secondary);">
                                    <code>${this.escapeHtml(table.id)}</code>
                                </div>
                            </div>
                            <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                                <span class="ac-badge ac-badge-tab">Tab: ${this.escapeHtml(table.tabNames.join(', '))}</span>
                                <span class="ac-badge ac-badge-count">${table.type}</span>
                                <span class="ac-badge ac-badge-count">${table.rowCount.toLocaleString()} rows</span>
                                <a href="${window.BASE_URL || ''}/allowed-content/?tab=${table.tabs[0]}" class="tool-button" style="margin-top: 0; padding: 0.3rem 0.6rem; font-size: 0.78rem; text-decoration: none;">
                                    View Tab ↗
                                </a>
                            </div>
                        </div>

                        <p style="margin: 0 0 1rem 0; font-size: 0.95rem; line-height: 1.5;">${this.escapeHtml(table.description)}</p>

                        <!-- Relationships Summary -->
                        ${(table.foreignKeys.length > 0 || table.inboundRelations.length > 0) ? `
                            <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.25rem; font-size: 0.85rem;">
                                ${table.foreignKeys.length > 0 ? `
                                    <div style="background: var(--color-bg-page); padding: 0.6rem 0.9rem; border: 1px solid var(--color-border); border-radius: 4px; flex: 1; min-width: 260px;">
                                        <strong>Outbound FKs:</strong>
                                        <div style="margin-top: 0.35rem; display: flex; flex-direction: column; gap: 0.25rem;">
                                            ${table.foreignKeys.map(fk => `
                                                <div><code>${fk.fromColumn}</code> → <strong>${fk.toTable}</strong>.<code>${fk.toColumn}</code></div>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                                ${table.inboundRelations.length > 0 ? `
                                    <div style="background: var(--color-bg-page); padding: 0.6rem 0.9rem; border: 1px solid var(--color-border); border-radius: 4px; flex: 1; min-width: 260px;">
                                        <strong>Referenced By:</strong>
                                        <div style="margin-top: 0.35rem; display: flex; flex-direction: column; gap: 0.25rem;">
                                            ${table.inboundRelations.map(rel => `
                                                <div><strong>${rel.fromTable}</strong> via <code>${rel.fromColumn}</code></div>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        ` : ''}

                        <!-- Columns Table -->
                        <div class="ac-dict-cols-table-wrapper">
                            <table class="ac-cols-table">
                                <thead>
                                    <tr>
                                        <th>Column</th>
                                        <th>Data Type</th>
                                        <th>Nullable</th>
                                        <th>Key Type</th>
                                        <th>Default Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${table.columns.map(col => `
                                        <tr>
                                            <td>
                                                <strong><code>${this.escapeHtml(col.name)}</code></strong>
                                                ${col.description ? `<div style="font-size: 0.8rem; color: var(--color-text-secondary); margin-top: 2px;">${this.escapeHtml(col.description)}</div>` : ''}
                                            </td>
                                            <td>
                                                <span class="ac-type-tag">${this.escapeHtml(col.type)}</span>
                                            </td>
                                            <td>
                                                ${col.nullable ? '<span style="color: var(--color-text-secondary);">YES</span>' : '<span style="color: #c93b27; font-weight: 700;">NO</span>'}
                                            </td>
                                            <td>
                                                ${col.isPk ? '<span class="ac-col-key-pk">Primary Key</span>' : ''}
                                                ${col.isFk ? `<span class="ac-col-key-fk" title="FK to ${col.fkTarget.table}">FK → ${col.fkTarget.table}</span>` : ''}
                                                ${(!col.isPk && !col.isFk) ? '<span style="color: var(--color-text-secondary); opacity: 0.5;">—</span>' : ''}
                                            </td>
                                            <td>
                                                <span style="font-family: var(--font-mono, monospace); font-size: 0.8rem; color: var(--color-text-secondary);">
                                                    ${col.default ? this.escapeHtml(col.default) : '<span style="opacity: 0.4;">null</span>'}
                                                </span>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </article>
                `).join('')}
            </div>
        `;
    }

    /* ============================================================================
     * MERMAID EXPORTER VIEW
     * ============================================================================ */
    renderMermaidExportView(container) {
        const mermaidCode = this.generateMermaidMarkdown();

        container.innerHTML = `
            <div class="ac-export-box">
                <div class="ac-export-header">
                    <div>
                        <h2 style="margin: 0 0 0.25rem 0; font-family: var(--font-header, 'Marcellus SC', Georgia, serif); color: var(--color-primary);">
                            Mermaid ERD Markdown Generator
                        </h2>
                        <span style="font-size: 0.9rem; color: var(--color-text-secondary);">
                            Copy and paste this standard GitHub-Flavored Markdown block directly into documentation, GitHub PRs, or visual tools.
                        </span>
                    </div>
                    <button class="ac-copy-btn" id="btn-copy-mermaid">
                        <span id="copy-icon">📋</span> <span id="copy-text">Copy Mermaid Code</span>
                    </button>
                </div>
                <pre class="ac-mermaid-pre" id="mermaid-code-pre"><code>${this.escapeHtml(mermaidCode)}</code></pre>
            </div>
        `;

        const copyBtn = container.querySelector('#btn-copy-mermaid');
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(mermaidCode).then(() => {
                container.querySelector('#copy-icon').textContent = '✓';
                container.querySelector('#copy-text').textContent = 'Copied to Clipboard!';
                setTimeout(() => {
                    container.querySelector('#copy-icon').textContent = '📋';
                    container.querySelector('#copy-text').textContent = 'Copy Mermaid Code';
                }, 2500);
            });
        });
    }

    generateMermaidMarkdown() {
        let lines = ['```mermaid', 'erDiagram'];

        // Entities and fields
        for (const [tableId, table] of Object.entries(AC_TABLES)) {
            lines.push(`    ${tableId} {`);
            for (const col of table.columns.slice(0, 10)) {
                const typeClean = col.type.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
                let keyTag = '';
                if (col.isPk) keyTag = ' PK';
                else if (col.isFk) keyTag = ' FK';
                lines.push(`        ${typeClean} ${col.name}${keyTag}`);
            }
            if (table.columns.length > 10) {
                lines.push(`        more_columns ...`);
            }
            lines.push(`    }`);
        }

        lines.push('');

        // Relationships
        for (const [tableId, table] of Object.entries(AC_TABLES)) {
            for (const fk of table.foreignKeys) {
                lines.push(`    ${fk.toTable} ||--o{ ${tableId} : "${fk.fromColumn}"`);
            }
        }

        lines.push('```');
        return lines.join('\n');
    }

    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}
