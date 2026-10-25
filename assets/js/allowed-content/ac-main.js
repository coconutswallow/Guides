/**
 * ================================================================
 * AC MAIN CONTROLLER
 * ================================================================
 * 
 * Central orchestrator and tab registry for the Allowed Content suite.
 * Modular architecture allows seamless addition of new tabs (Feats,
 * Classes, Spells, Equipment, Bastions, Backgrounds, Downtime, etc.)
 * via declarative configuration in TAB_REGISTRY.
 * 
 * Responsibilities:
 * - Bootstrapping the application on `DOMContentLoaded`.
 * - Managing declarative tab routing and deep-linking via URL hashes.
 * - Delegating search inputs to active feature modules through the registry.
 * - Coordinating staff admin mode and shell rendering across tabs.
 * - Handling global cache updates and event broadcasts.
 * 
 * @module ACMain
 */

import { initSources, filterSources } from './ac-sources.js';
import { initRaces, filterRaces } from './ac-races.js';
import { initClasses, filterClasses, openClassForm } from './ac-classes.js';
import { initBackgrounds, filterBackgrounds, openBackgroundForm } from './ac-backgrounds.js';
import { initFeats, filterFeats, openFeatForm } from './ac-feats.js';
import { initSpells, filterSpells, openSpellForm } from './ac-spells.js';
import { initLanguages, filterLanguages, openLanguageForm } from './ac-languages.js';
import { initMiscFeatures, filterMiscFeatures, openMiscFeaturePicker } from './ac-misc-features.js';
import { initEquipment, filterEquipment, openEquipmentForm } from './ac-equipment.js';
import { initItemProperties, filterItemProperties, openItemPropertyForm } from './ac-item-properties.js';
import { initDowntime, filterDowntime, openDowntimeForm } from './ac-downtime.js';
import { initBastions, filterBastions, openBastionForm } from './ac-bastions.js';
import { initMonsters, filterMonsters, openMonsterForm, openMonstersOptionsModal, openUsageOptionsModal } from './ac-monsters.js';
import { initOtherRewards, filterOtherRewards, openOtherRewardForm, openOtherRewardsOptionsModal } from './ac-other-rewards.js';
import { initLoot, filterLoot, openLootForm, openLootOptionsModal, highlightLootItem } from './ac-loot.js';
import { 
    closeModal, 
    showToast, 
    copyDirectLink, 
    getModalItem, 
    slugify,
    initTooltips,
    debounce
} from './ac-ui-utils.js';
import { detectAdminSession, renderAdminBar } from './ac-auth.js';
import { getSourcesCached } from './ac-service.js';

/**
 * Configuration for an action button in the staff administrative toolbar.
 * 
 * @typedef {Object} AdminAction
 * @property {string} id - Unique HTML element ID for the button
 * @property {string} label - User-facing button text
 * @property {boolean} primary - True to render with primary brand accent styling
 * @property {string} event - Global CustomEvent name dispatched on click (e.g. 'ac:open-source-form')
 */

/**
 * Declarative configuration structure for an Allowed Content feature tab.
 * To introduce a new tab to the application, developers only need to define
 * an entry conforming to this typedef in TAB_REGISTRY.
 * 
 * @typedef {Object} TabConfig
 * @property {string} id - Route/tab key matching data-tab attribute (e.g. 'sources', 'races')
 * @property {string} viewId - HTML ID of the view container element (e.g. 'ac-view-sources')
 * @property {string} searchPlaceholder - Input placeholder text shown when this tab is active
 * @property {function(boolean=): Promise<void>} init - Async initialization function supporting in-memory cache
 * @property {function(string): void} filter - Synchronous text filter function receiving the query
 * @property {Array<AdminAction>} [adminActions] - Action buttons rendered in staff admin bar
 */

/**
 * Central Tab Registry
 * 
 * Scalability Pattern:
 * Decouples the main controller from feature implementations. Each tab is a self-contained
 * plugin registered here. Navigation, search delegation, and staff actions dynamically adapt.
 * 
 * @type {Record<string, TabConfig>}
 */
export const TAB_REGISTRY = {
    sources: {
        id: 'sources',
        viewId: 'ac-view-sources',
        searchPlaceholder: 'Search sources (name, abbreviation, key)...',
        init: (forceRefresh) => initSources(forceRefresh),
        filter: (term) => filterSources(term),
        adminActions: [
            { id: 'btn-add-source', label: '+ Add New Source', primary: true, event: 'ac:open-source-form' },
            { id: 'btn-manage-options', label: '⚙️ Configure Options', primary: false, event: 'ac:open-options-manager' }
        ]
    },
    races: {
        id: 'races',
        viewId: 'ac-view-races',
        searchPlaceholder: 'Search species, subraces, sources, traits, ASI...',
        init: (forceRefresh) => initRaces(forceRefresh),
        filter: (term) => filterRaces(term),
        adminActions: [
            { id: 'btn-add-race', label: '+ Add Race', primary: true, event: 'ac:open-new-race-form' },
            { id: 'btn-add-subrace', label: '+ Add Subrace', primary: false, event: 'ac:open-race-form' },
            { id: 'btn-manage-races-options', label: '⚙️ Configure Options', primary: false, event: 'ac:open-races-options' }
        ]
    },
    classes: {
        id: 'classes',
        viewId: 'ac-view-classes',
        searchPlaceholder: 'Search classes, subclasses, rulesets, categories, sources...',
        init: (forceRefresh) => initClasses(forceRefresh),
        filter: (term) => filterClasses(term),
        adminActions: [
            { id: 'btn-add-class-subclass', label: '+ Add Class/Subclass', primary: true, event: 'ac:open-class-form' },
            { id: 'btn-manage-classes-options', label: '⚙️ Configure Categories', primary: false, event: 'ac:open-classes-options' }
        ]
    },
    backgrounds: {
        id: 'backgrounds',
        viewId: 'ac-view-backgrounds',
        searchPlaceholder: 'Search backgrounds, rulesets, features, sources...',
        init: (forceRefresh) => initBackgrounds(forceRefresh),
        filter: (term) => filterBackgrounds(term),
        adminActions: [
            { id: 'btn-add-background', label: '+ Add Background', primary: true, event: 'ac:open-background-form' },
            { id: 'btn-manage-backgrounds-options', label: '⚙️ Configure Categories', primary: false, event: 'ac:open-backgrounds-options' }
        ]
    },
    feats: {
        id: 'feats',
        viewId: 'ac-view-feats',
        searchPlaceholder: 'Search feats, rulesets, categories, prerequisites, ASI, sources...',
        init: (forceRefresh) => initFeats(forceRefresh),
        filter: (term) => filterFeats(term),
        adminActions: [
            { id: 'btn-add-feat', label: '+ Add Feat', primary: true, event: 'ac:open-feat-form' },
            { id: 'btn-manage-feats-options', label: '⚙️ Configure Categories', primary: false, event: 'ac:open-feats-options' }
        ]
    },
    spells: {
        id: 'spells',
        viewId: 'ac-view-spells',
        searchPlaceholder: 'Search spells, sources, rulesets, notes, rage advice...',
        init: (forceRefresh) => initSpells(forceRefresh),
        filter: (term) => filterSpells(term),
        adminActions: [
            { id: 'btn-add-spell', label: '+ Add Spell', primary: true, event: 'ac:open-spell-form' },
            { id: 'btn-manage-spells-options', label: '⚙️ Configure Options', primary: false, event: 'ac:open-spells-options' }
        ]
    },
    languages: {
        id: 'languages',
        viewId: 'ac-view-languages',
        searchPlaceholder: 'Search languages, classifications, scripts, origins, notes...',
        init: (forceRefresh) => initLanguages(forceRefresh),
        filter: (term) => filterLanguages(term),
        adminActions: [
            { id: 'btn-add-language', label: '+ Add Language', primary: true, event: 'ac:open-language-form' },
            { id: 'btn-manage-languages-options', label: '⚙️ Configure Classifications', primary: false, event: 'ac:open-languages-options' }
        ]
    },
    'misc-features': {
        id: 'misc-features',
        viewId: 'ac-view-misc-features',
        searchPlaceholder: 'Search fighting styles, infusions, invocations, rulesets, prerequisites, sources...',
        init: (forceRefresh) => initMiscFeatures(forceRefresh),
        filter: (term) => filterMiscFeatures(term),
        adminActions: [
            { id: 'btn-add-misc-feature', label: '+ Add Feature', primary: true, event: 'ac:open-misc-feature-picker' },
            { id: 'btn-manage-misc-options', label: '⚙️ Configure Sections', primary: false, event: 'ac:open-misc-options' }
        ]
    },
    equipment: {
        id: 'equipment',
        viewId: 'ac-view-equipment',
        searchPlaceholder: 'Search equipment, weapons, armor, tools, categories, sources...',
        init: (forceRefresh) => initEquipment(forceRefresh),
        filter: (term) => filterEquipment(term),
        adminActions: [
            { id: 'btn-add-equipment', label: '+ Add Equipment', primary: true, event: 'ac:open-equipment-form' },
            { id: 'btn-manage-equipment-options', label: '⚙️ Configure Categories', primary: false, event: 'ac:open-equipment-options' }
        ]
    },
    downtime: {
        id: 'downtime',
        viewId: 'ac-view-downtime',
        searchPlaceholder: 'Search downtime activities, categories, costs, rules, notes...',
        init: (forceRefresh) => initDowntime(forceRefresh),
        filter: (term) => filterDowntime(term),
        adminActions: [
            { id: 'btn-add-downtime', label: '+ Add Downtime Activity', primary: true, event: 'ac:open-downtime-form' },
            { id: 'btn-manage-downtime-options', label: '⚙️ Configure Categories', primary: false, event: 'ac:open-downtime-options' }
        ]
    },
    bastions: {
        id: 'bastions',
        viewId: 'ac-view-bastions',
        searchPlaceholder: 'Search bastions, facilities, orders, prerequisites, costs, sources...',
        init: (forceRefresh) => initBastions(forceRefresh),
        filter: (term) => filterBastions(term),
        adminActions: [
            { id: 'btn-add-bastion', label: '+ Add Bastion Facility', primary: true, event: 'ac:open-bastion-form' },
            { id: 'btn-manage-bastions-options', label: '⚙️ Configure Categories', primary: false, event: 'ac:open-bastions-options' }
        ]
    },
    loot: {
        id: 'loot',
        viewId: 'ac-view-loot',
        searchPlaceholder: 'Search loot, rolled items, select items, magic items, weapons, armor...',
        init: (forceRefresh) => initLoot(forceRefresh),
        filter: (term) => filterLoot(term),
        openItem: (target) => highlightLootItem(target),
        adminActions: [
            { id: 'btn-add-loot', label: '+ Add Loot', primary: true, event: 'ac:open-loot-form' },
            { id: 'btn-manage-loot-categories', label: '⚙️ Configure Categories', primary: false, event: 'ac:open-loot-categories' }
        ]
    },
    'other-rewards': {
        id: 'other-rewards',
        viewId: 'ac-view-other-rewards',
        searchPlaceholder: 'Search other rewards, dark gifts, supernatural gifts, charms, mounts, pets...',
        init: (forceRefresh) => initOtherRewards(forceRefresh),
        filter: (term) => filterOtherRewards(term),
        adminActions: [
            { id: 'btn-add-other-reward', label: '+ Add Reward', primary: true, event: 'ac:open-other-reward-form' },
            { id: 'btn-manage-other-rewards-categories', label: '⚙️ Configure Categories', primary: false, event: 'ac:open-other-rewards-categories' }
        ]
    },
    'item-properties': {
        id: 'item-properties',
        viewId: 'ac-view-item-properties',
        searchPlaceholder: 'Search item properties, creators, histories, quirks, sentient features...',
        init: (forceRefresh) => initItemProperties(forceRefresh),
        filter: (term) => filterItemProperties(term),
        adminActions: [
            { id: 'btn-add-item-property', label: '+ Add Item Property', primary: true, event: 'ac:open-item-property-form' },
            { id: 'btn-manage-item-properties-usage', label: '⚙️ Configure Usage', primary: false, event: 'ac:open-usage-options' },
            { id: 'btn-manage-item-properties-options', label: '⚙️ Configure Options', primary: false, event: 'ac:open-item-properties-options' }
        ]
    },
    monsters: {
        id: 'monsters',
        viewId: 'ac-view-monsters',
        searchPlaceholder: 'Search monsters, types, CR, sections, sources...',
        init: (forceRefresh) => initMonsters(forceRefresh),
        filter: (term) => filterMonsters(term),
        adminActions: [
            { id: 'btn-add-monster', label: '+ Add Monster', primary: true, event: 'ac:open-monster-form' },
            { id: 'btn-manage-monsters-options', label: '⚙️ Configure Usage', primary: false, event: 'ac:open-usage-options' }
        ]
    }
};

const VALID_TABS = Object.keys(TAB_REGISTRY);

/**
 * Initializes the Allowed Content application.
 */
export async function init() {
    console.log('AC UI: Initializing...');
    
    // Preload sources cache in background for instant lookups across all tabs
    getSourcesCached().catch(err => console.warn('Sources cache preload failed:', err));
    
    // Detect staff session and render global admin bar if user has Admin/Engineer roles
    detectAdminSession().then(isAdmin => {
        if (isAdmin) {
            const activeTab = document.querySelector('.ac-tab.active')?.dataset.tab || 'sources';
            renderAdminBar(activeTab, TAB_REGISTRY);
        }
    }).catch(err => console.warn('Admin session check failed:', err));

    // Listen for sources mutations across tabs to ensure in-memory cache and views remain synced
    window.addEventListener('ac:sources-updated', async () => {
        await getSourcesCached(true);
        const activeTab = document.querySelector('.ac-tab.active')?.dataset.tab;
        const currentTabConfig = TAB_REGISTRY[activeTab];
        if (currentTabConfig?.init) {
            await currentTabConfig.init(true);
        }
    });

    // Listen for races mutations across tabs to ensure view remains synced
    window.addEventListener('ac:races-updated', async () => {
        const activeTab = document.querySelector('.ac-tab.active')?.dataset.tab;
        if (activeTab === 'races') {
            await TAB_REGISTRY.races.init(true);
        }
    });

    // Listen for classes mutations across tabs to ensure view remains synced
    window.addEventListener('ac:classes-updated', async () => {
        const activeTab = document.querySelector('.ac-tab.active')?.dataset.tab;
        if (activeTab === 'classes') {
            await TAB_REGISTRY.classes.init(true);
        }
    });

    // Listen for backgrounds mutations across tabs to ensure view remains synced
    window.addEventListener('ac:backgrounds-updated', async () => {
        const activeTab = document.querySelector('.ac-tab.active')?.dataset.tab;
        if (activeTab === 'backgrounds') {
            await TAB_REGISTRY.backgrounds.init(true);
        }
    });

    // Listen for feats mutations across tabs to ensure view remains synced
    window.addEventListener('ac:feats-updated', async () => {
        const activeTab = document.querySelector('.ac-tab.active')?.dataset.tab;
        if (activeTab === 'feats') {
            await TAB_REGISTRY.feats.init(true);
        }
    });

    // Listen for languages mutations across tabs to ensure view remains synced
    window.addEventListener('ac:languages-updated', async () => {
        const activeTab = document.querySelector('.ac-tab.active')?.dataset.tab;
        if (activeTab === 'languages') {
            await TAB_REGISTRY.languages.init(true);
        }
    });

    // Listen for admin toolbar actions to open class and subclass forms
    window.addEventListener('ac:open-class-form', () => {
        openClassForm(null, null, false, 'subclass');
    });
    window.addEventListener('ac:open-new-class-form', () => {
        openClassForm(null, null, false, 'class');
    });

    // Listen for admin toolbar action to open background form
    window.addEventListener('ac:open-background-form', () => {
        openBackgroundForm();
    });

    // Listen for admin toolbar action to open feat form
    window.addEventListener('ac:open-feat-form', () => {
        openFeatForm();
    });

    // Listen for admin toolbar action to open spell form
    window.addEventListener('ac:open-spell-form', () => {
        openSpellForm();
    });

    // Listen for spells mutations across tabs to ensure view remains synced
    window.addEventListener('ac:spells-updated', async () => {
        const activeTab = document.querySelector('.ac-tab.active')?.dataset.tab;
        if (activeTab === 'spells') {
            await TAB_REGISTRY['spells'].init(true);
        }
    });

    // Listen for admin toolbar action to open language form
    window.addEventListener('ac:open-language-form', () => {
        openLanguageForm();
    });

    // Listen for misc features mutations across tabs to ensure view remains synced
    window.addEventListener('ac:misc-features-updated', async () => {
        const activeTab = document.querySelector('.ac-tab.active')?.dataset.tab;
        if (activeTab === 'misc-features') {
            await TAB_REGISTRY['misc-features'].init(true);
        }
    });

    // Listen for admin toolbar action to open misc feature picker
    window.addEventListener('ac:open-misc-feature-picker', () => {
        openMiscFeaturePicker();
    });

    // Listen for admin toolbar action to open equipment form
    window.addEventListener('ac:open-equipment-form', () => {
        openEquipmentForm();
    });

    // Listen for equipment mutations across tabs to ensure view remains synced
    window.addEventListener('ac:equipment-updated', async () => {
        const activeTab = document.querySelector('.ac-tab.active')?.dataset.tab;
        if (activeTab === 'equipment') {
            await TAB_REGISTRY['equipment'].init(true);
        }
    });

    // Listen for admin toolbar action to open item property form
    window.addEventListener('ac:open-item-property-form', () => {
        openItemPropertyForm();
    });

    // Listen for item properties mutations across tabs to ensure view remains synced
    window.addEventListener('ac:item-properties-updated', async () => {
        const activeTab = document.querySelector('.ac-tab.active')?.dataset.tab;
        if (activeTab === 'item-properties') {
            await TAB_REGISTRY['item-properties'].init(true);
        }
    });

    // Listen for admin toolbar action to open downtime form
    window.addEventListener('ac:open-downtime-form', () => {
        openDowntimeForm();
    });

    // Listen for downtime mutations across tabs to ensure view remains synced
    window.addEventListener('ac:downtime-updated', async () => {
        const activeTab = document.querySelector('.ac-tab.active')?.dataset.tab;
        if (activeTab === 'downtime') {
            await TAB_REGISTRY['downtime'].init(true);
        }
    });

    // Listen for admin toolbar action to open bastion form
    window.addEventListener('ac:open-bastion-form', () => {
        openBastionForm();
    });

    // Listen for bastion mutations across tabs to ensure view remains synced
    window.addEventListener('ac:bastions-updated', async () => {
        const activeTab = document.querySelector('.ac-tab.active')?.dataset.tab;
        if (activeTab === 'bastions') {
            await TAB_REGISTRY['bastions'].init(true);
        }
    });

    // Listen for admin toolbar action to open monster form
    window.addEventListener('ac:open-monster-form', () => {
        openMonsterForm();
    });

    // Listen for admin toolbar action to open shared usage options
    window.addEventListener('ac:open-usage-options', () => {
        openUsageOptionsModal();
    });

    // Listen for admin toolbar action to open monster options (backward compatibility)
    window.addEventListener('ac:open-monsters-options', () => {
        openUsageOptionsModal();
    });

    // Listen for monster mutations across tabs to ensure view remains synced
    window.addEventListener('ac:monsters-updated', async () => {
        const activeTab = document.querySelector('.ac-tab.active')?.dataset.tab;
        if (activeTab === 'monsters') {
            await TAB_REGISTRY['monsters'].init(true);
        }
    });

    // Listen for shared usage updates across tabs to ensure view remains synced
    window.addEventListener('ac:usage-updated', async () => {
        const activeTab = document.querySelector('.ac-tab.active')?.dataset.tab;
        if (activeTab === 'monsters') {
            await TAB_REGISTRY['monsters'].init(true);
        } else if (activeTab === 'item-properties') {
            await TAB_REGISTRY['item-properties'].init(true);
        }
    });

    // Listen for admin toolbar actions for Other Rewards
    window.addEventListener('ac:open-other-reward-form', () => {
        openOtherRewardForm();
    });
    window.addEventListener('ac:open-other-rewards-categories', () => {
        openOtherRewardsOptionsModal();
    });
    window.addEventListener('ac:other-rewards-updated', async () => {
        const activeTab = document.querySelector('.ac-tab.active')?.dataset.tab;
        if (activeTab === 'other-rewards') {
            await TAB_REGISTRY['other-rewards'].init(true);
        }
    });

    // Listen for admin toolbar actions for Loot
    window.addEventListener('ac:open-loot-form', () => {
        openLootForm();
    });
    window.addEventListener('ac:open-loot-categories', () => {
        openLootOptionsModal();
    });
    window.addEventListener('ac:loot-updated', async () => {
        const activeTab = document.querySelector('.ac-tab.active')?.dataset.tab;
        if (activeTab === 'loot') {
            await TAB_REGISTRY['loot'].init(true);
        }
    });

    // Initialize common UI utilities
    initTooltips();
    setupTabHandlers();
    
    // Set up modal close handler
    const closeBtn = document.getElementById('ac-modal-close');
    const modal = document.getElementById('ac-detail-modal');
    if (closeBtn && modal) {
        closeBtn.onclick = () => modal.close();
        modal.onclick = (e) => {
            if (e.target === modal) modal.close();
        };
    }

    // Set up global search router with 150ms debounce
    // This dramatically reduces CPU cycles and prevents DOM thrashing while typing
    const searchInput = document.getElementById('ac-global-search');
    if (searchInput) {
        const debouncedFilter = debounce((term) => {
            const activeTab = document.querySelector('.ac-tab.active')?.dataset.tab || 'sources';
            const currentTabConfig = TAB_REGISTRY[activeTab];
            if (currentTabConfig?.filter) {
                currentTabConfig.filter(term);
            }
        }, 150);

        searchInput.addEventListener('input', (e) => {
            debouncedFilter(e.target.value);
        });
    }

    // Modal share / copy link button listener
    const modalShare = document.getElementById('ac-modal-share');
    if (modalShare) {
        modalShare.addEventListener('click', (e) => {
            e.stopPropagation();
            const item = getModalItem();
            if (item) {
                copyDirectLink(item.tab || currentActiveTab || 'loot', item);
            } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
                navigator.clipboard.writeText(window.location.href);
                showToast('Direct link copied to clipboard!');
            }
        });
    }

    // Handle initial routing (deep links)
    const { tab: initialTab, itemId } = parseRoute();
    await switchTab(initialTab, false);
    if (itemId) {
        await navigateToItem(initialTab, itemId);
    }

    // Listen for hash changes (back/forward navigation)
    window.addEventListener('hashchange', async () => {
        const { tab: newTab, itemId: newId } = parseRoute();
        if (VALID_TABS.includes(newTab) && newTab !== currentActiveTab) {
            await switchTab(newTab, false);
        }
        if (newId) {
            await navigateToItem(newTab, newId);
        }
    });
    
    console.log('AC UI: Ready.');
}

/**
 * Parses URL hash and query string into a target tab and item identifier.
 * Supports:
 * - #tab?item=LOT_0178 or #tab?id=...
 * - #tab/LOT_0178 or #tab:LOT_0178
 * - ?tab=loot&item=LOT_0178
 * - #LOT_0178 (direct check_id)
 * - #tab
 * 
 * @param {string} [hashString]
 * @param {string} [searchString]
 * @returns {{ tab: string, itemId: string|null }}
 */
export function parseRoute(
    hashString = (typeof window !== 'undefined' ? window.location.hash : ''),
    searchString = (typeof window !== 'undefined' ? window.location.search : '')
) {
    let tab = 'sources';
    let itemId = null;

    // 1. Check URL query search params (?tab=loot&item=LOT_0178)
    if (searchString) {
        const params = new URLSearchParams(searchString.startsWith('?') ? searchString.slice(1) : searchString);
        const queryTab = params.get('tab');
        if (queryTab && VALID_TABS.includes(queryTab)) {
            tab = queryTab;
        }
        if (params.get('item')) {
            itemId = params.get('item');
        } else if (params.get('id')) {
            itemId = params.get('id');
        }
    }

    // 2. Check hash string (#loot?item=LOT_0178, #loot/LOT_0178, etc.)
    if (hashString && hashString.length > 1) {
        const raw = hashString.startsWith('#') ? hashString.slice(1) : hashString;

        // Pattern A: #tab?item=xxx or #tab?id=xxx
        if (raw.includes('?')) {
            const [tabPart, queryPart] = raw.split('?');
            if (VALID_TABS.includes(tabPart)) {
                tab = tabPart;
            }
            const qParams = new URLSearchParams(queryPart);
            itemId = qParams.get('item') || qParams.get('id') || itemId;
        } 
        // Pattern B: #tab/xxx or #tab:xxx
        else if (raw.includes('/') || raw.includes(':')) {
            const sep = raw.includes('/') ? '/' : ':';
            const [tabPart, ...rest] = raw.split(sep);
            if (VALID_TABS.includes(tabPart)) {
                tab = tabPart;
                itemId = rest.join(sep);
            }
        }
        // Pattern C: #tab
        else if (VALID_TABS.includes(raw)) {
            tab = raw;
        }
        // Pattern D: direct check_id like #LOT_0178
        else if (/^[A-Za-z]+_\d+$/.test(raw)) {
            const prefix = raw.split('_')[0].toUpperCase();
            const prefixTabMap = {
                'LOT': 'loot',
                'SRC': 'sources',
                'RAC': 'races',
                'CLS': 'classes',
                'BKG': 'backgrounds',
                'LNG': 'languages',
                'FEA': 'feats',
                'SPL': 'spells',
                'EQP': 'equipment',
                'DT': 'downtime',
                'BAS': 'bastions',
                'REW': 'other-rewards',
                'PRP': 'item-properties',
                'MON': 'monsters'
            };
            if (prefixTabMap[prefix]) {
                tab = prefixTabMap[prefix];
                itemId = raw;
            }
        }
    }

    return { tab, itemId };
}

/**
 * Traverses ancestors of a row or element to expand any collapsed category or accordion containers.
 * 
 * @param {HTMLElement} element 
 */
export function expandParentAccordions(element) {
    if (!element) return;
    
    // 1. Check for preceding category header in table
    let prev = element.previousElementSibling;
    while (prev) {
        if (prev.classList.contains('ac-table-group-header') || prev.classList.contains('accordion-header')) {
            if (prev.classList.contains('collapsed')) {
                prev.click();
            }
            break;
        }
        prev = prev.previousElementSibling;
    }

    // 2. Check for details or accordion wrapper
    const details = element.closest('details');
    if (details && !details.open) {
        details.open = true;
    }
}

/**
 * Navigates to and highlights a specific item within the active tab.
 * 
 * @param {string} tab 
 * @param {string} itemId 
 * @returns {Promise<boolean>}
 */
export async function navigateToItem(tab, itemId) {
    if (!itemId) return false;

    // Ensure tab is active in DOM
    const activeTab = document.querySelector('.ac-tab.active')?.dataset.tab;
    if (tab && activeTab !== tab) {
        await switchTab(tab);
    }

    const tabConfig = TAB_REGISTRY[tab];
    if (tabConfig && typeof tabConfig.openItem === 'function') {
        try {
            const handled = await tabConfig.openItem(itemId);
            if (handled) return true;
        } catch (err) {
            console.warn(`AC UI: openItem failed for tab '${tab}':`, err);
        }
    }

    // Universal DOM fallback
    await new Promise(r => setTimeout(r, 150));
    const cleanId = String(itemId).trim().toLowerCase();

    const targetEl = document.querySelector(
        `tr[data-id="${cleanId}"], tr[data-check-id="${cleanId}"], tr[data-loot-id="${cleanId}"], [id*="${cleanId}"]`
    ) || Array.from(document.querySelectorAll('tr.ac-row-clickable, tr[data-id]')).find(tr => {
        const nameEl = tr.querySelector('.col-name, strong, .detail-title');
        return nameEl && (nameEl.textContent.trim().toLowerCase() === cleanId || slugify(nameEl.textContent) === cleanId);
    });

    if (targetEl) {
        expandParentAccordions(targetEl);
        if (typeof targetEl.scrollIntoView === 'function') {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        targetEl.classList.remove('ac-row-highlighted');
        if (targetEl.offsetWidth !== undefined) void targetEl.offsetWidth;
        targetEl.classList.add('ac-row-highlighted');
        setTimeout(() => targetEl.classList.remove('ac-row-highlighted'), 4000);
        targetEl.click();
        return true;
    }

    return false;
}

let currentActiveTab = null;
let isSwitchingTab = false;

/**
 * Switch to a specific tab and optionally update the URL hash.
 * 
 * @param {string} targetTab - The tab ID to switch to
 * @param {boolean} updateHash - Whether to update the URL fragment
 */
export async function switchTab(targetTab = 'sources', updateHash = true) {
    const tabs = document.querySelectorAll('.ac-tab');
    const tabBtn = Array.from(tabs).find(t => t.dataset.tab === targetTab);
    const tabConfig = TAB_REGISTRY[targetTab];
    
    if (!tabBtn || tabBtn.classList.contains('disabled') || !tabConfig) {
        console.warn(`AC UI: Tab '${targetTab}' not available, falling back to sources`);
        if (targetTab !== 'sources') switchTab('sources', false);
        return;
    }

    // If already active and not a fresh navigation, initialize and return
    if (currentActiveTab === targetTab && tabBtn.classList.contains('active') && !updateHash) {
        if (tabConfig.init) await tabConfig.init(false);
        return;
    }

    isSwitchingTab = true;
    currentActiveTab = targetTab;
    console.log(`AC UI: Switching to ${targetTab}`);
    
    // Update active tab UI
    tabs.forEach(t => t.classList.remove('active'));
    tabBtn.classList.add('active');
    
    // Close any active detail modal
    closeModal();

    // Hide all views, show target view
    document.querySelectorAll('.ac-view').forEach(view => {
        view.classList.remove('active');
    });
    
    const targetView = document.getElementById(tabConfig.viewId);
    if (targetView) targetView.classList.add('active');

    // Update search placeholder based on tab
    const searchInput = document.getElementById('ac-global-search');
    if (searchInput) {
        searchInput.placeholder = tabConfig.searchPlaceholder || 'Search...';
    }

    // Update URL hash if requested
    if (updateHash) {
        window.location.hash = targetTab;
    }

    // Update staff admin bar for current tab
    renderAdminBar(targetTab, TAB_REGISTRY);
    
    try {
        if (tabConfig.init) {
            await tabConfig.init(false);
        }
    } catch (err) {
        console.error(`AC UI: Failed to initialize tab '${targetTab}':`, err);
    } finally {
        isSwitchingTab = false;
    }
}

/**
 * Sets up the tab switching logic.
 */
export function setupTabHandlers() {
    const tabs = document.querySelectorAll('.ac-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = tab.dataset.tab;
            if (tabId) {
                switchTab(tabId, true);
            }
        });
    });
}

// Start the application when the DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
