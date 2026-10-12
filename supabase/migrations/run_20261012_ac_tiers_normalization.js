/**
 * Database Migration Runner: AC Tiers Normalization
 * Target Table: public.ac_tiers
 *
 * Usage:
 *   node supabase/migrations/run_20261012_ac_tiers_normalization.js --dry-run
 *   node supabase/migrations/run_20261012_ac_tiers_normalization.js --execute
 *   node supabase/migrations/run_20261012_ac_tiers_normalization.js --dry-run --prod
 *   node supabase/migrations/run_20261012_ac_tiers_normalization.js --execute --prod
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
    console.log(`Migration Runner: AC Tiers Normalization`);
    console.log(`Environment: ${envName}`);
    console.log(`Mode: ${isExecute ? 'EXECUTE (REAL WRITES)' : 'DRY-RUN (READ-ONLY)'}`);
    console.log(`==================================================\n`);

    const sqlPath = path.resolve(__dirname, '20261012_ac_tiers_normalization.sql');
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
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'ac_tiers'
            ) as exists;
        `);
        console.log(`Table public.ac_tiers exists before migration: ${tableCheck.rows[0].exists}`);

        if (tableCheck.rows[0].exists) {
            const countBefore = await client.query('SELECT count(*) FROM public.ac_tiers');
            console.log(`Current rows in public.ac_tiers: ${countBefore.rows[0].count}`);
        }

        if (isDryRun) {
            console.log('\n[DRY RUN]: Executing migration inside transaction with ROLLBACK...');
            await client.query('BEGIN');
            await client.query(sqlContent);

            const countAfter = await client.query('SELECT count(*) FROM public.ac_tiers');
            const sampleRows = await client.query(`
                SELECT code, name, award_type, min_apl, multisession_sessions, dm_requirement, display_order 
                FROM public.ac_tiers 
                ORDER BY display_order
            `);

            console.log(`[DRY RUN] Validated total rows in ac_tiers: ${countAfter.rows[0].count}`);
            console.log(`[DRY RUN] Sample Tiers:`);
            console.table(sampleRows.rows);

            await client.query('ROLLBACK');
            console.log('\n[DRY RUN] Completed successfully. All changes rolled back.');
        } else {
            console.log('\n[EXECUTE]: Applying migration and committing to database...');
            await client.query('BEGIN');
            await client.query(sqlContent);
            await client.query('COMMIT');
            console.log('[EXECUTE] Migration successfully committed to database!\n');

            // Post-verification
            const countAfter = await client.query('SELECT count(*) FROM public.ac_tiers');
            const allRows = await client.query(`
                SELECT code, name, award_type, min_apl, multisession_sessions, dm_requirement, display_order 
                FROM public.ac_tiers 
                ORDER BY display_order
            `);
            const rlsCheck = await client.query(`
                SELECT policyname, permissive, roles, cmd 
                FROM pg_policies 
                WHERE tablename = 'ac_tiers';
            `);

            console.log(`Post-Verification:`);
            console.log(`Total rows in public.ac_tiers: ${countAfter.rows[0].count}`);
            console.log(`\nActive Tiers:`);
            console.table(allRows.rows);
            console.log(`\nActive RLS Policies on public.ac_tiers:`);
            console.table(rlsCheck.rows);

            if (parseInt(countAfter.rows[0].count, 10) !== 17) {
                throw new Error(`Expected 17 rows in ac_tiers, but found ${countAfter.rows[0].count}`);
            }
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
