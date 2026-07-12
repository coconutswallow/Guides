/**
 * generate-schema.js
 * Generates schema documentation using the Supabase REST API.
 *
 * Uses SUPABASE_SERVICE_PASSWORD (your service role JWT) for full access.
 * Run: node supabase/generate-schema.js
 * Output: schema.md and schema.csv in the project root
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// --- Load .env ---
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv(filePath) {
    try {
        const content = readFileSync(filePath, 'utf8');
        for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const eq = trimmed.indexOf('=');
            if (eq === -1) continue;
            const key = trimmed.slice(0, eq).trim();
            let val = trimmed.slice(eq + 1).trim();
            if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
                val = val.slice(1, -1);
            }
            if (!process.env[key]) process.env[key] = val;
        }
    } catch { /* rely on shell environment */ }
}

loadEnv(path.join(__dirname, '..', '.env'));

const { SUPABASE_URL, SUPABASE_SERVICE_PASSWORD, SUPABASE_KEY } = process.env;
const API_KEY = SUPABASE_SERVICE_PASSWORD || SUPABASE_KEY;

if (!SUPABASE_URL || !API_KEY) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_PASSWORD (or SUPABASE_KEY) must be set in .env');
    process.exit(1);
}

const BASE = `${SUPABASE_URL}/rest/v1`;

// --- Helpers ---

function apiHeaders(extra = {}) {
    return {
        'apikey': API_KEY,
        'Authorization': `Bearer ${API_KEY}`,
        ...extra,
    };
}

async function get(url, headers = {}) {
    const res = await fetch(url, { headers: apiHeaders(headers) });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status} ${url}: ${text}`);
    }
    return res.json();
}

// --- 1. Fetch OpenAPI spec (table/column names, types, descriptions, nullable) ---
async function fetchSpec() {
    return get(`${BASE}/`);
}

// --- 2. Fetch primary key info via information_schema ---
// PostgREST supports schema-switching with Accept-Profile header.
// Supabase may or may not expose information_schema — we try and fall back gracefully.
async function fetchPrimaryKeys() {
    const url = `${BASE}/key_column_usage` +
        `?select=table_name,column_name` +
        `&constraint_name=like.*_pkey`;
    try {
        const rows = await get(url, { 'Accept-Profile': 'information_schema' });
        // Returns [{ table_name, column_name }, ...]
        const pks = new Set();
        for (const row of rows) pks.add(`${row.table_name}.${row.column_name}`);
        return pks;
    } catch {
        return null; // information_schema not accessible — will infer below
    }
}

// --- 3. Fetch foreign key info via information_schema ---
async function fetchForeignKeys() {
    const url = `${BASE}/referential_constraints` +
        `?select=constraint_name,unique_constraint_name`;
    const kcu = `${BASE}/key_column_usage` +
        `?select=constraint_name,table_name,column_name,position_in_unique_constraint`;
    try {
        const [refs, keys] = await Promise.all([
            get(url, { 'Accept-Profile': 'information_schema' }),
            get(kcu, { 'Accept-Profile': 'information_schema' }),
        ]);

        // Build a map: { 'table.column' -> { table, column } }
        const keyMap = {};
        for (const k of keys) {
            keyMap[k.constraint_name] ??= [];
            keyMap[k.constraint_name].push(k);
        }

        const fks = {};
        for (const ref of refs) {
            const src  = keyMap[ref.constraint_name]?.find(k => k.position_in_unique_constraint == null);
            const dest = keyMap[ref.unique_constraint_name]?.find(k => k.position_in_unique_constraint != null)
                      ?? keyMap[ref.unique_constraint_name]?.[0];
            if (src && dest) {
                fks[`${src.table_name}.${src.column_name}`] = { table: dest.table_name, column: dest.column_name };
            }
        }
        return fks;
    } catch {
        return null;
    }
}

// --- Parse OpenAPI spec into rows ---
function parseSpec(spec, pks, fks) {
    const definitions = spec.definitions ?? {};
    const rows = [];

    for (const [tableName, tableDef] of Object.entries(definitions)) {
        const tableDescription = tableDef.description ?? '';
        const required = new Set(tableDef.required ?? []);
        const properties = tableDef.properties ?? {};

        for (const [colName, colDef] of Object.entries(properties)) {
            // Skip virtual FK embed properties added by PostgREST
            if (colDef['$ref'] || colDef.items?.['$ref']) continue;

            const fieldType = colDef.format ?? colDef.type ?? '';
            const nullable  = !required.has(colName);
            const fieldDesc = colDef.description ?? '';

            // PK: use information_schema result if available, else infer from column named 'id'
            const isPk = pks
                ? pks.has(`${tableName}.${colName}`)
                : (colName === 'id' && !nullable);

            // FK: use information_schema result if available, else heuristic from embed map
            const fkKey = `${tableName}.${colName}`;
            const fk = fks?.[fkKey] ?? null;

            rows.push({
                table_name:        tableName,
                table_description: tableDescription,
                column_name:       colName,
                field_type:        fieldType,
                nullable,
                field_description: fieldDesc,
                is_primary_key:    isPk,
                fk_table:          fk?.table ?? null,
                fk_column:         fk?.column ?? null,
            });
        }
    }

    return rows;
}

// --- Markdown ---
function escMd(str) {
    if (str == null) return '';
    return String(str).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function generateMarkdown(rows, pkSource, fkSource) {
    const tables = new Map();
    for (const row of rows) {
        if (!tables.has(row.table_name)) {
            tables.set(row.table_name, { description: row.table_description, columns: [] });
        }
        tables.get(row.table_name).columns.push(row);
    }

    const pkNote = pkSource ? '' : ' *(PK inferred from column named `id`)*';
    const fkNote = fkSource ? '' : ' *(FK heuristic — verify against migrations)*';

    const lines = [
        '# Database Schema',
        `*Generated: ${new Date().toISOString()}${pkNote}${fkNote}*`,
        '',
        '## Tables',
    ];
    for (const name of [...tables.keys()].sort()) {
        lines.push(`- [${name}](#${name.replace(/_/g, '-')})`);
    }
    lines.push('');

    for (const [tableName, { description, columns }] of [...tables.entries()].sort()) {
        lines.push(`## ${tableName}`);
        if (description) lines.push('', description);
        lines.push('');
        lines.push('| Field | Type | Nullable | PK | FK | Description |');
        lines.push('|-------|------|:--------:|:--:|----|-------------|');

        for (const col of columns) {
            const pk   = col.is_primary_key ? 'PK' : '';
            const fk   = col.fk_table ? `-> \`${col.fk_table}.${col.fk_column}\`` : '';
            const null_ = col.nullable ? 'YES' : 'NO';
            const desc = escMd(col.field_description);
            lines.push(`| \`${col.column_name}\` | \`${col.field_type}\` | ${null_} | ${pk} | ${fk} | ${desc} |`);
        }
        lines.push('');
    }

    return lines.join('\n');
}

// --- CSV ---
function generateCsv(rows) {
    const headers = ['table_name','table_description','field_name','field_type',
        'nullable','primary_key','fk_table','fk_column','field_description'];
    const esc = (v) => {
        if (v == null) return '';
        const s = String(v);
        return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [
        headers.join(','),
        ...rows.map(r => [
            esc(r.table_name), esc(r.table_description),
            esc(r.column_name), esc(r.field_type), esc(r.nullable),
            esc(r.is_primary_key), esc(r.fk_table), esc(r.fk_column),
            esc(r.field_description),
        ].join(',')),
    ].join('\n');
}

// --- Main ---
async function main() {
    const role = SUPABASE_SERVICE_PASSWORD ? 'service_role' : 'anon';
    console.log(`Fetching schema (${role} key)...`);

    const [spec, pks, fks] = await Promise.all([
        fetchSpec(),
        fetchPrimaryKeys(),
        fetchForeignKeys(),
    ]);

    console.log(`  PK source: ${pks ? 'information_schema' : 'inferred'}`);
    console.log(`  FK source: ${fks ? 'information_schema' : 'inferred'}`);

    const rows = parseSpec(spec, pks, fks);
    const tableCount = new Set(rows.map(r => r.table_name)).size;
    console.log(`Found ${rows.length} columns across ${tableCount} tables.`);

    const outDir = path.join(__dirname, '..');
    writeFileSync(path.join(outDir, 'schema.md'),  generateMarkdown(rows, pks, fks), 'utf8');
    writeFileSync(path.join(outDir, 'schema.csv'), generateCsv(rows), 'utf8');

    console.log('  -> schema.md');
    console.log('  -> schema.csv');
}

main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
