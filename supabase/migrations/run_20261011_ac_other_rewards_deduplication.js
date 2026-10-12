/**
 * Database Migration Runner: AC Other Rewards Deduplication
 * Target Table: public.ac_other_rewards
 *
 * Usage:
 *   node supabase/migrations/run_20261011_ac_other_rewards_deduplication.js --dry-run
 *   node supabase/migrations/run_20261011_ac_other_rewards_deduplication.js --execute
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
    console.log(`Migration Runner: AC Other Rewards Deduplication`);
    console.log(`Environment: ${envName}`);
    console.log(`Mode: ${isExecute ? 'EXECUTE (REAL WRITES)' : 'DRY-RUN (READ-ONLY)'}`);
    console.log(`==================================================\n`);

    const sqlPath = path.resolve(__dirname, '20261011_ac_other_rewards_deduplication.sql');
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
        const countBefore = await client.query(`SELECT count(*) FROM public.ac_other_rewards;`);
        const totalBefore = parseInt(countBefore.rows[0].count, 10);
        console.log(`Current rewards before migration: ${totalBefore}`);

        if (isDryRun) {
            console.log('\n[DRY RUN]: Executing migration inside transaction with ROLLBACK...');
            await client.query('BEGIN');
            await client.query(sqlContent);

            await verify(client, totalBefore - 2);

            await client.query('ROLLBACK');
            console.log('\n[DRY RUN] Completed successfully. All changes rolled back.');
        } else {
            console.log('\n[EXECUTE]: Applying migration and committing to database...');
            await client.query('BEGIN');
            await client.query(sqlContent);
            await client.query('COMMIT');
            console.log('[EXECUTE] Migration successfully committed to database!\n');

            await verify(client, totalBefore - 2);
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

async function verify(client, expectedCount) {
    console.log(`Running Verification Checks...`);

    // 1. Total count verification
    const countRes = await client.query(`SELECT count(*) FROM public.ac_other_rewards;`);
    const totalCount = parseInt(countRes.rows[0].count, 10);
    console.log(`Total rewards count: ${totalCount} (expected: ${expectedCount})`);

    if (totalCount !== expectedCount) {
        throw new Error(`Expected ${expectedCount} rewards, found ${totalCount}`);
    }

    // 2. Verify deleted rows
    const deletedRes = await client.query(`
        SELECT check_id, name FROM public.ac_other_rewards WHERE check_id IN ('REW_0376', 'REW_0377');
    `);
    if (deletedRes.rowCount !== 0) {
        throw new Error(`Expected REW_0376 and REW_0377 to be deleted, but found ${deletedRes.rowCount} rows`);
    }
    console.log(`Confirmed: REW_0376 and REW_0377 successfully deleted.`);

    // 3. Verify single Quirk and Piety definitions
    const quirkRes = await client.query(`
        SELECT check_id, name, notes_advice FROM public.ac_other_rewards WHERE name = 'Quirk';
    `);
    console.log(`Quirk entries count: ${quirkRes.rowCount} (expected: 1)`);
    if (quirkRes.rowCount !== 1) {
        throw new Error(`Expected exactly 1 Quirk entry, found ${quirkRes.rowCount}`);
    }
    if (!quirkRes.rows[0].notes_advice.includes('A list of available Quirks can also be seen below')) {
        throw new Error(`Quirk notes_advice does not contain updated instructions.`);
    }

    const pietyRes = await client.query(`
        SELECT check_id, name, notes_advice FROM public.ac_other_rewards WHERE name = 'Piety';
    `);
    console.log(`Piety entries count: ${pietyRes.rowCount} (expected: 1)`);
    if (pietyRes.rowCount !== 1) {
        throw new Error(`Expected exactly 1 Piety entry, found ${pietyRes.rowCount}`);
    }
    if (!pietyRes.rows[0].notes_advice.includes('A list of available Piety Supernatural Gifts can also be seen below')) {
        throw new Error(`Piety notes_advice does not contain updated instructions.`);
    }

    console.log(`All verification checks passed successfully!`);
}

run();
