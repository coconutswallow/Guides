/**
 * Database Migration Runner: AC Shared Usage Lookup
 * Target Table: public.lookups (type = 'usage')
 *
 * Usage:
 *   node supabase/migrations/run_20261011_ac_shared_usage_lookup.js --dry-run
 *   node supabase/migrations/run_20261011_ac_shared_usage_lookup.js --execute
 *   node supabase/migrations/run_20261011_ac_shared_usage_lookup.js --dry-run --prod
 *   node supabase/migrations/run_20261011_ac_shared_usage_lookup.js --execute --prod
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
    console.log(`Migration Runner: AC Shared Usage Lookup`);
    console.log(`Environment: ${envName}`);
    console.log(`Mode: ${isExecute ? 'EXECUTE (REAL WRITES)' : 'DRY-RUN (READ-ONLY)'}`);
    console.log(`==================================================\n`);

    const sqlPath = path.resolve(__dirname, '20261011_ac_shared_usage_lookup.sql');
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
        const beforeCheck = await client.query("SELECT type, jsonb_pretty(data) as d FROM public.lookups WHERE type = 'usage'");
        console.log(`Current 'usage' lookup exists:`, beforeCheck.rowCount > 0);

        if (isDryRun) {
            console.log('\n[DRY RUN]: Validation of migration SQL...');
            await client.query('BEGIN');
            await client.query(sqlContent);

            const testCheck = await client.query("SELECT type, jsonb_pretty(data) as d FROM public.lookups WHERE type = 'usage'");
            console.log(`[DRY RUN] 'usage' lookup content:\n`, testCheck.rows[0]?.d);

            await client.query('ROLLBACK');
            console.log('\n[DRY RUN] Completed successfully. All transactions rolled back.');
        } else {
            console.log('\n[EXECUTE]: Applying migration...');
            await client.query('BEGIN');
            await client.query(sqlContent);
            await client.query('COMMIT');
            console.log('[EXECUTE] Migration successfully committed to database!');

            // Post-verification
            const afterCheck = await client.query("SELECT type, jsonb_pretty(data) as d FROM public.lookups WHERE type = 'usage'");
            console.log(`Updated 'usage' lookup content:\n`, afterCheck.rows[0]?.d);
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
