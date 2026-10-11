/**
 * Database Migration Runner: AC Lookups Categories Expansion & Staff RLS
 * Target Table: public.lookups
 *
 * Usage:
 *   node supabase/migrations/run_20261011_ac_lookups_categories_expansion.js --dry-run
 *   node supabase/migrations/run_20261011_ac_lookups_categories_expansion.js --execute
 *   node supabase/migrations/run_20261011_ac_lookups_categories_expansion.js --dry-run --prod
 *   node supabase/migrations/run_20261011_ac_lookups_categories_expansion.js --execute --prod
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

async function run() {
    const args = process.argv.slice(2);
    const isProd = args.includes('--prod');
    const isExecute = args.includes('--execute');
    const isDryRun = args.includes('--dry-run') || !isExecute;

    const dbUrl = isProd
        ? (process.env.TARGET_DB_URL || process.env.PROD_DB_URL)
        : (process.env.SOURCE_DB_URL || process.env.DEV_DB_URL);

    if (!dbUrl) {
        console.error(`Error: Missing database connection string for ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'}.`);
        process.exit(1);
    }

    const envName = isProd ? 'PRODUCTION' : 'DEVELOPMENT';
    console.log(`\n==================================================`);
    console.log(`Migration Runner: AC Lookups Categories Expansion`);
    console.log(`Environment: ${envName}`);
    console.log(`Mode: ${isExecute ? 'EXECUTE (REAL WRITES)' : 'DRY-RUN (READ-ONLY)'}`);
    console.log(`==================================================\n`);

    const sqlPath = path.resolve(__dirname, '20261011_ac_lookups_categories_expansion.sql');
    if (!fs.existsSync(sqlPath)) {
        console.error(`Error: SQL migration file not found at ${sqlPath}`);
        process.exit(1);
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    const client = new pg.Client({ connectionString: dbUrl });

    try {
        await client.connect();
        console.log(`Connected to ${envName} database successfully.`);

        // Baseline Check
        const beforeTypes = await client.query('SELECT type FROM public.lookups ORDER BY type');
        console.log(`Current Lookups Types (${beforeTypes.rowCount}):`, beforeTypes.rows.map(r => r.type));

        if (isDryRun) {
            console.log('\n[DRY RUN]: Validation of migration SQL...');
            await client.query('BEGIN');
            await client.query(sqlContent);

            const testTypes = await client.query('SELECT type FROM public.lookups ORDER BY type');
            console.log(`[DRY RUN] Types after migration:`, testTypes.rows.map(r => r.type));

            const testPolicies = await client.query(
                "SELECT policyname, cmd FROM pg_policies WHERE tablename = 'lookups'"
            );
            console.log(`[DRY RUN] Lookups Policies:`, testPolicies.rows);

            await client.query('ROLLBACK');
            console.log('\n[DRY RUN] Completed successfully. All transactions rolled back.');
        } else {
            console.log('\n[EXECUTE]: Applying migration...');
            await client.query('BEGIN');
            await client.query(sqlContent);
            await client.query('COMMIT');
            console.log('[EXECUTE] Migration successfully committed to database!');

            // Post-verification
            const afterTypes = await client.query('SELECT type FROM public.lookups ORDER BY type');
            console.log(`Updated Lookups Types (${afterTypes.rowCount}):`, afterTypes.rows.map(r => r.type));

            const afterPolicies = await client.query(
                "SELECT policyname, cmd FROM pg_policies WHERE tablename = 'lookups'"
            );
            console.log(`Updated Policies:`, afterPolicies.rows);
        }
    } catch (err) {
        console.error('Migration failed with error:', err);
        try {
            await client.query('ROLLBACK');
        } catch (_) {}
        process.exit(1);
    } finally {
        await client.end();
        console.log(`Database connection closed.`);
    }
}

run();
