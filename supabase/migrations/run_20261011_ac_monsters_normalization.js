/**
 * Database Migration Runner: AC Monsters Normalization & Staff Admin RLS
 * Target Tables: public.ac_monsters, public.ac_monsters_categories, public.lookups
 *
 * Usage:
 *   node supabase/migrations/run_20261011_ac_monsters_normalization.js --dry-run
 *   node supabase/migrations/run_20261011_ac_monsters_normalization.js --execute
 *   node supabase/migrations/run_20261011_ac_monsters_normalization.js --dry-run --prod
 *   node supabase/migrations/run_20261011_ac_monsters_normalization.js --execute --prod
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to load env from Guides/.env or DBSync/.env
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

const isProd = process.argv.includes('--prod');
const customDbArg = process.argv.find(a => a.startsWith('--db=') || a.startsWith('--url='));
const customDbUrl = customDbArg ? customDbArg.split('=')[1].replace(/^["']|["']$/g, '') : null;

let targetEnvName = 'DEV';
let dbUrl = customDbUrl;
if (!dbUrl) {
    if (isProd) {
        dbUrl = process.env.PROD_DB_URL || process.env.TARGET_DB_URL;
        targetEnvName = 'PRODUCTION';
    } else {
        dbUrl = process.env.SOURCE_DB_URL || process.env.DEV_DB_URL;
        targetEnvName = 'DEV';
    }
}

if (!dbUrl) {
    console.error(`❌ Error: Database connection URL not found for environment: ${targetEnvName}`);
    process.exit(1);
}

const isExecute = process.argv.includes('--execute');

async function runMigration() {
    console.log(`\n======================================================================`);
    console.log(`🚀 Migration: 20261011_ac_monsters_normalization.sql`);
    console.log(`🎯 Environment: ${targetEnvName}`);
    console.log(`⚙️  Mode: ${isExecute ? 'EXECUTE (Applying changes)' : 'DRY-RUN (Simulating in transaction)'}`);
    console.log(`======================================================================\n`);

    const sqlFilePath = path.join(__dirname, '20261011_ac_monsters_normalization.sql');
    if (!fs.existsSync(sqlFilePath)) {
        console.error(`❌ Error: Migration file not found: ${sqlFilePath}`);
        process.exit(1);
    }
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    const client = new pg.Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log(` Connected to PostgreSQL [${targetEnvName}]`);

        // Check pre-migration stats
        console.log(`\n--- Pre-migration Inspection ---`);
        try {
            const countMonstersRes = await client.query('SELECT count(*) FROM public.ac_monsters');
            console.log(` Current public.ac_monsters row count: ${countMonstersRes.rows[0].count}`);
        } catch (e) {
            console.log(` public.ac_monsters does not exist or error: ${e.message}`);
        }

        try {
            const countCatsRes = await client.query('SELECT count(*) FROM public.ac_monsters_categories');
            console.log(` Current public.ac_monsters_categories count: ${countCatsRes.rows[0].count}`);
        } catch (e) {
            console.log(` public.ac_monsters_categories does not exist or error: ${e.message}`);
        }

        // Begin Transaction
        await client.query('BEGIN');
        console.log(`\n--- Executing SQL Script ---`);

        await client.query(sqlContent);
        console.log(` SQL executed successfully.`);

        // Post-migration Verification
        console.log(`\n--- Post-migration Verification ---`);
        const catCountRes = await client.query('SELECT count(*) FROM public.ac_monsters_categories');
        const monsterCountRes = await client.query('SELECT count(*) FROM public.ac_monsters');
        const checkIdCountRes = await client.query("SELECT count(DISTINCT check_id) FROM public.ac_monsters WHERE check_id LIKE 'MON_%'");
        const sourceArrayRes = await client.query("SELECT count(*) FROM public.ac_monsters WHERE pg_typeof(source) = 'text[]'::regtype");
        const doubleOrderRes = await client.query("SELECT count(*) FROM public.ac_monsters WHERE pg_typeof(display_order) = 'double precision'::regtype");
        const ruleset2024Res = await client.query("SELECT count(*) FROM public.ac_monsters WHERE ruleset = '2024'");
        const ruleset2014Res = await client.query("SELECT count(*) FROM public.ac_monsters WHERE ruleset = '2014'");
        const htfgCountRes = await client.query("SELECT count(*) FROM public.ac_monsters WHERE 'HTFG' = ANY(source)");
        const lookupsRes = await client.query("SELECT data FROM public.lookups WHERE type = 'monsters'");

        console.log(` Categories count: ${catCountRes.rows[0].count} (Expected: 2)`);
        console.log(` Total monsters count: ${monsterCountRes.rows[0].count} (Expected: 3195)`);
        console.log(` Distinct MON_ check_ids: ${checkIdCountRes.rows[0].count} (Expected: 3195)`);
        console.log(` Records with source as text[]: ${sourceArrayRes.rows[0].count} (Expected: 3195)`);
        console.log(` Records with display_order as double precision: ${doubleOrderRes.rows[0].count} (Expected: 3195)`);
        console.log(` 2024 ruleset monsters: ${ruleset2024Res.rows[0].count} (Expected: 554)`);
        console.log(` 2014 ruleset monsters: ${ruleset2014Res.rows[0].count} (Expected: 2641)`);
        console.log(` HTFG monsters in table: ${htfgCountRes.rows[0].count} (Expected: 0 - skipped)`);
        console.log(` Lookups metadata configured: ${lookupsRes.rows.length > 0 ? 'YES' : 'NO'}`);
        if (lookupsRes.rows.length > 0) {
            console.log(` Lookups description: "${lookupsRes.rows[0].data.description}"`);
        }

        // Category breakdown
        const catBreakdownRes = await client.query(`
            SELECT category, classification, count(*) as count
            FROM public.ac_monsters
            GROUP BY category, classification
            ORDER BY category, classification
        `);
        console.log(`\n--- Classification Breakdown ---`);
        for (const row of catBreakdownRes.rows) {
            console.log(`   ${row.category} -> ${row.classification}: ${row.count}`);
        }

        // Sample check
        const sampleRes = await client.query(`
            SELECT m.check_id, m.name, m.ruleset, m.category, m.classification, m.cr, m.creature_type, m.source, m.display_order
            FROM public.ac_monsters m
            ORDER BY m.display_order
            LIMIT 5
        `);
        console.log(`\n--- First 5 Records ---`);
        for (const row of sampleRes.rows) {
            console.log(`   [${row.check_id}] ${row.name} (${row.ruleset}) | CR: ${row.cr} | Type: ${row.creature_type} | Category: ${row.category} / ${row.classification} | Source: [${row.source.join(', ')}] | Order: ${row.display_order}`);
        }

        const lastRes = await client.query(`
            SELECT m.check_id, m.name, m.ruleset, m.category, m.classification, m.cr, m.creature_type, m.source, m.display_order
            FROM public.ac_monsters m
            ORDER BY m.display_order DESC
            LIMIT 3
        `);
        console.log(`\n--- Last 3 Records ---`);
        for (const row of lastRes.rows.reverse()) {
            console.log(`   [${row.check_id}] ${row.name} (${row.ruleset}) | CR: ${row.cr} | Type: ${row.creature_type} | Category: ${row.category} / ${row.classification} | Source: [${row.source.join(', ')}] | Order: ${row.display_order}`);
        }

        // Verify RLS Policies
        const rlsRes = await client.query(`
            SELECT policyname, permissive, roles, cmd
            FROM pg_policies
            WHERE tablename = 'ac_monsters'
            ORDER BY policyname
        `);
        console.log(`\n--- RLS Policies on public.ac_monsters ---`);
        for (const pol of rlsRes.rows) {
            console.log(`   Policy: "${pol.policyname}" | Roles: ${pol.roles} | Cmd: ${pol.cmd}`);
        }

        const rlsCatRes = await client.query(`
            SELECT policyname, permissive, roles, cmd
            FROM pg_policies
            WHERE tablename = 'ac_monsters_categories'
            ORDER BY policyname
        `);
        console.log(`\n--- RLS Policies on public.ac_monsters_categories ---`);
        for (const pol of rlsCatRes.rows) {
            console.log(`   Policy: "${pol.policyname}" | Roles: ${pol.roles} | Cmd: ${pol.cmd}`);
        }

        if (isExecute) {
            await client.query('COMMIT');
            console.log(`\n✅ TRANSACTION COMMITTED: Migration successfully applied to ${targetEnvName}!`);
        } else {
            await client.query('ROLLBACK');
            console.log(`\nℹ️  DRY-RUN COMPLETE: Transaction rolled back cleanly. No changes committed.`);
        }

    } catch (err) {
        try {
            await client.query('ROLLBACK');
        } catch (_) {}
        console.error(`\n❌ Migration failed on ${targetEnvName}:`, err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
