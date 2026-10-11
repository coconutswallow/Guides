/**
 * Database Migration Runner: AC Item Properties Normalization & Staff Admin RLS
 * Target Tables: public.ac_item_properties_categories, public.ac_item_properties
 *
 * Usage:
 *   node supabase/migrations/run_20261011_ac_item_properties_normalization.js --dry-run
 *   node supabase/migrations/run_20261011_ac_item_properties_normalization.js --execute
 *   node supabase/migrations/run_20261011_ac_item_properties_normalization.js --dry-run --prod
 *   node supabase/migrations/run_20261011_ac_item_properties_normalization.js --execute --prod
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
    console.log(`🚀 Migration: 20261011_ac_item_properties_normalization.sql`);
    console.log(`🎯 Environment: ${targetEnvName}`);
    console.log(`⚙️  Mode: ${isExecute ? 'EXECUTE (Applying changes)' : 'DRY-RUN (Simulating in transaction)'}`);
    console.log(`======================================================================\n`);

    const sqlFilePath = path.join(__dirname, '20261011_ac_item_properties_normalization.sql');
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
            const countPropsRes = await client.query('SELECT count(*) FROM public.ac_item_properties');
            console.log(` Current public.ac_item_properties row count: ${countPropsRes.rows[0].count}`);
        } catch (e) {
            console.log(` public.ac_item_properties does not exist or error: ${e.message}`);
        }

        try {
            const countCatsRes = await client.query('SELECT count(*) FROM public.ac_item_properties_categories');
            console.log(` Current public.ac_item_properties_categories count: ${countCatsRes.rows[0].count}`);
        } catch (e) {
            console.log(` public.ac_item_properties_categories does not exist or error: ${e.message}`);
        }

        // Begin Transaction
        await client.query('BEGIN');
        console.log(`\n--- Executing SQL Script ---`);

        await client.query(sqlContent);
        console.log(` SQL executed successfully.`);

        // Post-migration Verification
        console.log(`\n--- Post-migration Verification ---`);
        const catCountRes = await client.query('SELECT count(*) FROM public.ac_item_properties_categories');
        const propCountRes = await client.query('SELECT count(*) FROM public.ac_item_properties');
        const checkIdCountRes = await client.query("SELECT count(DISTINCT check_id) FROM public.ac_item_properties WHERE check_id LIKE 'ITP_%'");
        const sourceArrayRes = await client.query("SELECT count(*) FROM public.ac_item_properties WHERE pg_typeof(source) = 'text[]'::regtype");
        const doubleOrderRes = await client.query("SELECT count(*) FROM public.ac_item_properties WHERE pg_typeof(display_order) = 'double precision'::regtype");

        console.log(` Categories count: ${catCountRes.rows[0].count}`);
        console.log(` Total item properties: ${propCountRes.rows[0].count} (Expected: 92)`);
        console.log(` Distinct ITP_ check_ids: ${checkIdCountRes.rows[0].count} (Expected: 92)`);
        console.log(` Records with source as text[]: ${sourceArrayRes.rows[0].count} (Expected: 92)`);
        console.log(` Records with display_order as double precision: ${doubleOrderRes.rows[0].count} (Expected: 92)`);

        // Sample check
        const sampleRes = await client.query(`
            SELECT p.check_id, p.name, p.source, p.type, p.category_sub, p.display_order, c.name as cat_name
            FROM public.ac_item_properties p
            LEFT JOIN public.ac_item_properties_categories c ON p.category_id = c.id
            ORDER BY p.display_order
            LIMIT 5
        `);
        console.log(`\n--- First 5 Records ---`);
        for (const row of sampleRes.rows) {
            console.log(`   [${row.check_id}] ${row.name} (${row.type}) | Category: ${row.category_sub} | Source: [${row.source.join(', ')}] | Order: ${row.display_order}`);
        }

        const lastRes = await client.query(`
            SELECT p.check_id, p.name, p.source, p.type, p.category_sub, p.display_order, c.name as cat_name
            FROM public.ac_item_properties p
            LEFT JOIN public.ac_item_properties_categories c ON p.category_id = c.id
            ORDER BY p.display_order DESC
            LIMIT 3
        `);
        console.log(`\n--- Last 3 Records ---`);
        for (const row of lastRes.rows.reverse()) {
            console.log(`   [${row.check_id}] ${row.name} (${row.type}) | Category: ${row.category_sub} | Source: [${row.source.join(', ')}] | Order: ${row.display_order}`);
        }

        // Verify RLS Policies
        const rlsRes = await client.query(`
            SELECT policyname, permissive, roles, cmd
            FROM pg_policies
            WHERE tablename = 'ac_item_properties'
            ORDER BY policyname
        `);
        console.log(`\n--- RLS Policies on public.ac_item_properties ---`);
        for (const pol of rlsRes.rows) {
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
