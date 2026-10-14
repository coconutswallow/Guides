/**
 * Database Schema Extraction Runner: Allowed Content (AC)
 * 
 * Inspects PostgreSQL `information_schema` and `pg_constraint` to generate
 * the comprehensive static schema registry `assets/js/allowed-content/ac-schema-data.js`.
 * 
 * Usage:
 *   node supabase/migrations/generate_ac_schema_metadata.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
    const envPaths = [
        path.resolve(__dirname, '../../.env'),
        path.resolve(__dirname, '../../../DBSync/.env')
    ];

    for (const p of envPaths) {
        if (fs.existsSync(p)) {
            const content = fs.readFileSync(p, 'utf8');
            for (const line of content.split('\n')) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) continue;
                const eqIdx = trimmed.indexOf('=');
                if (eqIdx !== -1) {
                    const key = trimmed.slice(0, eqIdx).trim();
                    let val = trimmed.slice(eqIdx + 1).trim();
                    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
                        val = val.slice(1, -1);
                    }
                    if (!process.env[key]) {
                        process.env[key] = val;
                    }
                }
            }
        }
    }
}

loadEnv();

const dbUrl = process.env.DEV_DB_URL || process.env.SOURCE_DB_URL;
if (!dbUrl) {
    console.error('Error: SOURCE_DB_URL or DEV_DB_URL not found in .env');
    process.exit(1);
}

const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

// Domain and Tab Mappings
const TABLE_METADATA = {
    'ac_sources': {
        title: 'Allowed Sources',
        tabs: ['sources'],
        tabNames: ['Sources'],
        domain: 'Sources & References',
        description: 'Master index of official rulebooks, campaign settings, third-party publications, abbreviations, and ruleset flags (2014 / 2024).'
    },
    'ac_races': {
        title: 'Playable Species',
        tabs: ['races'],
        tabNames: ['Races'],
        domain: 'Character Options',
        description: 'Base playable species and lineages (e.g. Elf, Dwarf, Human) containing core traits, speed, size, and source references.'
    },
    'ac_subraces': {
        title: 'Subraces & Lineage Variants',
        tabs: ['races'],
        tabNames: ['Races'],
        domain: 'Character Options',
        description: 'Species variants and subraces (e.g. High Elf, Wood Elf, Mountain Dwarf) linked to parent species via race_id.'
    },
    'v_ac_races': {
        title: 'Unified Races View',
        tabs: ['races'],
        tabNames: ['Races'],
        domain: 'Character Options',
        description: 'Security-invoker database view that joins ac_races and ac_subraces into a flat catalog for the Allowed Content frontend.'
    },
    'ac_classes': {
        title: 'Character Classes',
        tabs: ['classes'],
        tabNames: ['Classes'],
        domain: 'Character Options',
        description: 'Base character classes (e.g. Barbarian, Wizard) containing hit dice, armor/weapon proficiencies, spellcasting ability, and ruleset.'
    },
    'ac_subclasses': {
        title: 'Subclasses & Archetypes',
        tabs: ['classes'],
        tabNames: ['Classes'],
        domain: 'Character Options',
        description: 'Subclasses and archetypes (e.g. Path of the Berserker, School of Evocation) linked to parent classes via class_id.'
    },
    'v_ac_classes': {
        title: 'Unified Classes View',
        tabs: ['classes'],
        tabNames: ['Classes'],
        domain: 'Character Options',
        description: 'Database view joining ac_classes and ac_subclasses into flattened rows consumed by the Classes tab.'
    },
    'ac_backgrounds': {
        title: 'Character Backgrounds',
        tabs: ['backgrounds'],
        tabNames: ['Backgrounds'],
        domain: 'Character Options',
        description: 'Character backgrounds including origin feats, ability score increases, skill/tool proficiencies, starting gear, and notes.'
    },
    'ac_feats': {
        title: 'Character Feats',
        tabs: ['feats'],
        tabNames: ['Feats'],
        domain: 'Character Options',
        description: 'Allowed feats categorized into General, Origin, Epic Boon, and Fighting Style feats with prerequisites and ASI options.'
    },
    'ac_spells': {
        title: 'Spells & Incantations',
        tabs: ['spells'],
        tabNames: ['Spells'],
        domain: 'Combat & Magic',
        description: 'Allowed spells with school, level, ritual status, casting components, and guild-specific Barbarian rage rulings.'
    },
    'ac_languages': {
        title: 'Languages',
        tabs: ['languages'],
        tabNames: ['Languages'],
        domain: 'Character Options',
        description: 'Allowed languages, scripts, origins, typical speakers, and rarity.'
    },
    'ac_language_types': {
        title: 'Language Categories',
        tabs: ['languages'],
        tabNames: ['Languages'],
        domain: 'Lookups & Categories',
        description: 'Classification categories for languages (Standard, Exotic, Rare/Secret).'
    },
    'ac_artificer_infusions': {
        title: 'Artificer Infusions',
        tabs: ['misc-features'],
        tabNames: ['Misc Class Features'],
        domain: 'Character Options',
        description: 'Artificer Infusions including level prerequisites, item prerequisites, attunement requirements, and rulings.'
    },
    'ac_eldritch_invocations': {
        title: 'Eldritch Invocations',
        tabs: ['misc-features'],
        tabNames: ['Misc Class Features'],
        domain: 'Character Options',
        description: 'Warlock Eldritch Invocations including level prerequisites, pact prerequisites, spell prerequisites, and rulings.'
    },
    'ac_fighting_styles': {
        title: 'Fighting Styles',
        tabs: ['misc-features'],
        tabNames: ['Misc Class Features'],
        domain: 'Character Options',
        description: 'Fighting Style options for Fighters, Paladins, Rangers, and feats.'
    },
    'ac_equipment': {
        title: 'Equipment & Gear',
        tabs: ['equipment'],
        tabNames: ['Equipment'],
        domain: 'Equipment & Gear',
        description: 'Weapons, armor, tools, adventuring gear, vehicle types, costs, weights, and crafting costs (gold and DTP).'
    },
    'ac_equip_type': {
        title: 'Equipment Categories',
        tabs: ['equipment'],
        tabNames: ['Equipment'],
        domain: 'Lookups & Categories',
        description: 'Category classifications for equipment (Armor, Weapons, Tools, Adventuring Gear, Vehicles, Mounts, etc.).'
    },
    'ac_item_tag': {
        title: 'Item Tags',
        tabs: ['equipment', 'item-properties'],
        tabNames: ['Equipment', 'Item Properties'],
        domain: 'Lookups & Categories',
        description: 'Tag classification lookup used to categorize weapons, gear, and items.'
    },
    'ac_item_properties': {
        title: 'Item Properties & Masteries',
        tabs: ['item-properties'],
        tabNames: ['Item Properties'],
        domain: 'Equipment & Gear',
        description: 'Weapon Masteries, armor modifications, magic property rules, and weapon properties (Finesse, Heavy, Light, etc.).'
    },
    'ac_item_properties_categories': {
        title: 'Item Property Categories',
        tabs: ['item-properties'],
        tabNames: ['Item Properties'],
        domain: 'Lookups & Categories',
        description: 'Categories for item properties (Weapon Mastery, Weapon Properties, Armor Properties, Special).'
    },
    'ac_downtime': {
        title: 'Downtime Activities',
        tabs: ['downtime'],
        tabNames: ['Downtime'],
        domain: 'Bastions & Downtime',
        description: 'Downtime activities available to players between adventures, gold costs, DTP costs, and check DC requirements.'
    },
    'ac_downtime_type': {
        title: 'Downtime Categories',
        tabs: ['downtime'],
        tabNames: ['Downtime'],
        domain: 'Lookups & Categories',
        description: 'Categories for downtime activities (Training, Crafting, Work, Lifestyle, etc.).'
    },
    'ac_bastion': {
        title: 'Bastions & Facilities',
        tabs: ['bastions'],
        tabNames: ['Bastions'],
        domain: 'Bastions & Downtime',
        description: '2024 Bastion facilities, level requirements, construction costs (GP/DTP), facility size, and benefit descriptions.'
    },
    'ac_bastion_type': {
        title: 'Bastion Facility Categories',
        tabs: ['bastions'],
        tabNames: ['Bastions'],
        domain: 'Lookups & Categories',
        description: 'Categories for Bastion facilities (Basic Facilities, Special Facilities).'
    },
    'ac_loot': {
        title: 'Loot & Magic Items',
        tabs: ['loot'],
        tabNames: ['Loot'],
        domain: 'Loot & Rewards',
        description: 'Magic items, mundane loot, consumables, attunement rules, DM-select status, and tier requirements.'
    },
    'ac_loot_categories': {
        title: 'Loot Categories',
        tabs: ['loot'],
        tabNames: ['Loot'],
        domain: 'Lookups & Categories',
        description: 'Categories for loot and magic items (Permanent Magic Item, Consumable, Mundane Item, Spell Scroll).'
    },
    'ac_loot_tags': {
        title: 'Loot Tags Join Table',
        tabs: ['loot'],
        tabNames: ['Loot'],
        domain: 'Loot & Rewards',
        description: 'Tag join table associating loot items with descriptive and indexing tags.'
    },
    'ac_tiers': {
        title: 'Master Award Tiers',
        tabs: ['loot', 'other-rewards'],
        tabNames: ['Loot', 'Other Rewards'],
        domain: 'Lookups & Categories',
        description: 'Master award tiers (Tier 1-4, Minor/Major, Special) defining minimum APL, session counts, and DM requirements.'
    },
    'ac_other_rewards': {
        title: 'Other Rewards & Supernatural Gifts',
        tabs: ['other-rewards'],
        tabNames: ['Other Rewards'],
        domain: 'Loot & Rewards',
        description: 'Non-item supernatural rewards including charms, blessings, epic boons, and guild status honors.'
    },
    'ac_other_rewards_categories': {
        title: 'Other Reward Categories',
        tabs: ['other-rewards'],
        tabNames: ['Other Rewards'],
        domain: 'Lookups & Categories',
        description: 'Categories for other rewards (Charms, Blessings, Supernatural Gifts, Guild Honors).'
    },
    'ac_monsters': {
        title: 'Allowed Monsters',
        tabs: ['monsters'],
        tabNames: ['Monsters'],
        domain: 'Monsters & Encounters',
        description: 'Catalog of allowed official and approved homebrew monsters, challenge ratings (CR), creature types, and sources.'
    },
    'ac_monsters_categories': {
        title: 'Monster Categories',
        tabs: ['monsters'],
        tabNames: ['Monsters'],
        domain: 'Lookups & Categories',
        description: 'Categories for monsters (Official, Hawthorne Homebrew).'
    }
};

async function main() {
    console.log('Connecting to database...');

    // 1. Fetch all tables and views
    const tablesQuery = `
        SELECT table_name, table_type
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND (table_name LIKE 'ac_%' OR table_name LIKE 'v_ac_%')
        ORDER BY table_name;
    `;
    const tablesRes = await pool.query(tablesQuery);

    // 2. Fetch all columns
    const columnsQuery = `
        SELECT 
            c.table_name,
            c.column_name,
            c.ordinal_position,
            c.is_nullable,
            c.data_type,
            c.udt_name,
            c.column_default,
            c.character_maximum_length
        FROM information_schema.columns c
        WHERE c.table_schema = 'public' 
          AND (c.table_name LIKE 'ac_%' OR c.table_name LIKE 'v_ac_%')
        ORDER BY c.table_name, c.ordinal_position;
    `;
    const columnsRes = await pool.query(columnsQuery);

    // 3. Fetch primary keys
    const pksQuery = `
        SELECT
            tc.table_name,
            kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY' 
          AND (tc.table_name LIKE 'ac_%' OR tc.table_name LIKE 'v_ac_%');
    `;
    const pksRes = await pool.query(pksQuery);

    // 4. Fetch foreign keys
    const fksQuery = `
        SELECT
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name,
            rc.delete_rule,
            rc.update_rule
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
        JOIN information_schema.referential_constraints rc
          ON rc.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND (tc.table_name LIKE 'ac_%' OR ccu.table_name LIKE 'ac_%')
        ORDER BY tc.table_name, kcu.column_name;
    `;
    const fksRes = await pool.query(fksQuery);

    // 5. Fetch table comments from pg_description
    const tableCommentsQuery = `
        SELECT 
            c.relname as table_name,
            d.description
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_description d ON d.objoid = c.oid AND d.objsubid = 0
        WHERE n.nspname = 'public' AND (c.relname LIKE 'ac_%' OR c.relname LIKE 'v_ac_%');
    `;
    const tableCommentsRes = await pool.query(tableCommentsQuery);
    const tableCommentsMap = {};
    for (const r of tableCommentsRes.rows) {
        tableCommentsMap[r.table_name] = r.description;
    }

    // 6. Fetch column comments from pg_description
    const colCommentsQuery = `
        SELECT 
            c.relname as table_name,
            a.attname as column_name,
            d.description
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_attribute a ON a.attrelid = c.oid
        JOIN pg_description d ON d.objoid = c.oid AND d.objsubid = a.attnum
        WHERE n.nspname = 'public' AND (c.relname LIKE 'ac_%' OR c.relname LIKE 'v_ac_%');
    `;
    const colCommentsRes = await pool.query(colCommentsQuery);
    const colCommentsMap = {};
    for (const r of colCommentsRes.rows) {
        colCommentsMap[`${r.table_name}.${r.column_name}`] = r.description;
    }

    // Index PKs and FKs
    const pksByTable = {};
    for (const row of pksRes.rows) {
        if (!pksByTable[row.table_name]) pksByTable[row.table_name] = new Set();
        pksByTable[row.table_name].add(row.column_name);
    }

    const fksByTable = {};
    const inboundFksByTable = {};
    for (const row of fksRes.rows) {
        if (!fksByTable[row.table_name]) fksByTable[row.table_name] = [];
        fksByTable[row.table_name].push(row);

        if (!inboundFksByTable[row.foreign_table_name]) inboundFksByTable[row.foreign_table_name] = [];
        inboundFksByTable[row.foreign_table_name].push(row);
    }

    // Row counts
    const rowCounts = {};
    for (const r of tablesRes.rows) {
        try {
            const cntRes = await pool.query(`SELECT count(*) FROM "${r.table_name}"`);
            rowCounts[r.table_name] = parseInt(cntRes.rows[0].count, 10);
        } catch (e) {
            rowCounts[r.table_name] = 0;
        }
    }

    // Build Table Schema Objects
    const tablesMap = {};
    for (const r of tablesRes.rows) {
        const tableName = r.table_name;
        const meta = TABLE_METADATA[tableName] || {
            title: tableName.replace(/^(ac_|v_ac_)/, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            tabs: ['misc'],
            tabNames: ['Other'],
            domain: 'General',
            description: `Table ${tableName} in public schema.`
        };

        const dbTableDesc = tableCommentsMap[tableName];
        const finalDesc = dbTableDesc && dbTableDesc.length > 15 ? dbTableDesc : meta.description;

        tablesMap[tableName] = {
            id: tableName,
            title: meta.title,
            type: r.table_type, // 'BASE TABLE' or 'VIEW'
            tabs: meta.tabs,
            tabNames: meta.tabNames,
            domain: meta.domain,
            description: finalDesc,
            rowCount: rowCounts[tableName] ?? 0,
            columns: [],
            primaryKeys: Array.from(pksByTable[tableName] || []),
            foreignKeys: [],
            inboundRelations: []
        };
    }

    // Map columns
    for (const col of columnsRes.rows) {
        const table = tablesMap[col.table_name];
        if (!table) continue;

        const isPk = pksByTable[col.table_name]?.has(col.column_name) ?? false;
        const fkInfo = (fksByTable[col.table_name] || []).find(f => f.column_name === col.column_name);
        const colDesc = colCommentsMap[`${col.table_name}.${col.column_name}`] || '';

        const typeDisplay = col.data_type === 'USER-DEFINED' ? col.udt_name : col.data_type;

        table.columns.push({
            name: col.column_name,
            type: typeDisplay,
            nullable: col.is_nullable === 'YES',
            default: col.column_default,
            maxLength: col.character_maximum_length,
            description: colDesc,
            isPk,
            isFk: !!fkInfo,
            fkTarget: fkInfo ? {
                table: fkInfo.foreign_table_name,
                column: fkInfo.foreign_column_name,
                deleteRule: fkInfo.delete_rule,
                updateRule: fkInfo.update_rule
            } : null
        });
    }

    // Map relationships
    for (const tableName of Object.keys(tablesMap)) {
        const table = tablesMap[tableName];
        const outbound = fksByTable[tableName] || [];
        table.foreignKeys = outbound.map(f => ({
            fromColumn: f.column_name,
            toTable: f.foreign_table_name,
            toColumn: f.foreign_column_name,
            deleteRule: f.delete_rule
        }));

        const inbound = inboundFksByTable[tableName] || [];
        table.inboundRelations = inbound.map(f => ({
            fromTable: f.table_name,
            fromColumn: f.column_name,
            toColumn: f.foreign_column_name,
            deleteRule: f.delete_rule
        }));
    }

    // Summary Domains
    const domainsSet = new Set();
    Object.values(tablesMap).forEach(t => domainsSet.add(t.domain));
    const domainsList = Array.from(domainsSet).sort();

    // Summary Tabs
    const tabsMap = {};
    for (const t of Object.values(tablesMap)) {
        for (let i = 0; i < t.tabs.length; i++) {
            const tabKey = t.tabs[i];
            const tabName = t.tabNames[i] || tabKey;
            if (!tabsMap[tabKey]) {
                tabsMap[tabKey] = {
                    key: tabKey,
                    name: tabName,
                    tableIds: []
                };
            }
            tabsMap[tabKey].tableIds.push(t.id);
        }
    }

    // Output target
    const outputPath = path.resolve(__dirname, '../../assets/js/allowed-content/ac-schema-data.js');
    const fileHeader = `/**
 * Allowed Content (AC) Schema Registry
 * Auto-generated on: ${new Date().toISOString()}
 * Generated by: supabase/migrations/generate_ac_schema_metadata.js
 * 
 * Provides complete data-dictionary understanding, field definitions,
 * primary/foreign keys, tab associations, and relationship graphs for all Allowed Content tables.
 */

`;

    const content = `${fileHeader}export const AC_SCHEMA_GENERATED_AT = ${JSON.stringify(new Date().toISOString())};

export const AC_DOMAINS = ${JSON.stringify(domainsList, null, 2)};

export const AC_TABS_MAPPING = ${JSON.stringify(tabsMap, null, 2)};

export const AC_TABLES = ${JSON.stringify(tablesMap, null, 2)};

export default {
    generatedAt: AC_SCHEMA_GENERATED_AT,
    domains: AC_DOMAINS,
    tabs: AC_TABS_MAPPING,
    tables: AC_TABLES
};
`;

    fs.writeFileSync(outputPath, content, 'utf8');
    console.log(`Successfully generated schema data at: ${outputPath}`);
    console.log(`Indexed ${Object.keys(tablesMap).length} tables/views, ${columnsRes.rows.length} columns, ${fksRes.rows.length} FK relationships.`);

    await pool.end();
}

main().catch(err => {
    console.error('Fatal error during schema generation:', err);
    process.exit(1);
});
