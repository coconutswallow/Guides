/**
 * Database Migration Runner: AC Other Rewards Normalization
 * Target Tables: public.ac_other_rewards, public.ac_other_rewards_categories
 *
 * Usage:
 *   node supabase/migrations/run_20261012_ac_other_rewards_normalization.js --dry-run
 *   node supabase/migrations/run_20261012_ac_other_rewards_normalization.js --execute
 *   node supabase/migrations/run_20261012_ac_other_rewards_normalization.js --dry-run --prod
 *   node supabase/migrations/run_20261012_ac_other_rewards_normalization.js --execute --prod
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
    console.log(`Migration Runner: AC Other Rewards Normalization`);
    console.log(`Environment: ${envName}`);
    console.log(`Mode: ${isExecute ? 'EXECUTE (REAL WRITES)' : 'DRY-RUN (READ-ONLY)'}`);
    console.log(`==================================================\n`);

    const sqlPath = path.resolve(__dirname, '20261012_ac_other_rewards_normalization.sql');
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
        const rewardsBefore = await client.query(`
            SELECT count(*) FROM public.ac_other_rewards;
        `).catch(() => ({ rows: [{ count: 0 }] }));
        const catsBefore = await client.query(`
            SELECT count(*) FROM public.ac_other_rewards_categories;
        `).catch(() => ({ rows: [{ count: 0 }] }));

        console.log(`Current rows before migration:`);
        console.log(`  - public.ac_other_rewards: ${rewardsBefore.rows[0].count}`);
        console.log(`  - public.ac_other_rewards_categories: ${catsBefore.rows[0].count}`);

        if (isDryRun) {
            console.log('\n[DRY RUN]: Executing migration inside transaction with ROLLBACK...');
            await client.query('BEGIN');
            await client.query(sqlContent);

            await verify(client);

            await client.query('ROLLBACK');
            console.log('\n[DRY RUN] Completed successfully. All changes rolled back.');
        } else {
            console.log('\n[EXECUTE]: Applying migration and committing to database...');
            await client.query('BEGIN');
            await client.query(sqlContent);
            await client.query('COMMIT');
            console.log('[EXECUTE] Migration successfully committed to database!\n');

            await verify(client);
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

async function verify(client) {
    console.log(`Running Verification Checks...`);

    // 1. Categories verification
    const catsRes = await client.query(`
        SELECT id, name, display_order, length(notes) as notes_len 
        FROM public.ac_other_rewards_categories 
        ORDER BY display_order;
    `);
    console.log(`Categories count: ${catsRes.rowCount} (expected: 5)`);
    console.table(catsRes.rows);

    if (catsRes.rowCount !== 5) {
        throw new Error(`Expected 5 categories, found ${catsRes.rowCount}`);
    }

    // 2. Rewards verification
    const countRes = await client.query(`SELECT count(*) FROM public.ac_other_rewards;`);
    const totalCount = parseInt(countRes.rows[0].count, 10);
    console.log(`Total rewards count: ${totalCount} (expected: 387)`);

    if (totalCount !== 387) {
        throw new Error(`Expected 387 rewards, found ${totalCount}`);
    }

    // 3. Distinct check_ids
    const checkIdRes = await client.query(`
        SELECT count(DISTINCT check_id) as distinct_checks, min(check_id) as min_chk, max(check_id) as max_chk 
        FROM public.ac_other_rewards;
    `);
    console.log(`Check ID Audit: ${checkIdRes.rows[0].distinct_checks} distinct (Range: ${checkIdRes.rows[0].min_chk} to ${checkIdRes.rows[0].max_chk})`);

    if (parseInt(checkIdRes.rows[0].distinct_checks, 10) !== 387) {
        throw new Error(`Duplicate check_ids detected!`);
    }

    // 4. FK Integrity: All category_id and tier_id point to valid records
    const orphanCats = await client.query(`
        SELECT count(*) FROM public.ac_other_rewards r 
        LEFT JOIN public.ac_other_rewards_categories c ON r.category_id = c.id 
        WHERE c.id IS NULL;
    `);
    if (parseInt(orphanCats.rows[0].count, 10) !== 0) {
        throw new Error(`Found orphan category_id records: ${orphanCats.rows[0].count}`);
    }

    const orphanTiers = await client.query(`
        SELECT count(*) FROM public.ac_other_rewards r 
        LEFT JOIN public.ac_tiers t ON r.tier_id = t.id 
        WHERE t.id IS NULL;
    `);
    if (parseInt(orphanTiers.rows[0].count, 10) !== 0) {
        throw new Error(`Found orphan tier_id records: ${orphanTiers.rows[0].count}`);
    }

    // 5. Category breakdown
    const breakdown = await client.query(`
        SELECT c.name as category, count(r.id) as item_count 
        FROM public.ac_other_rewards_categories c 
        JOIN public.ac_other_rewards r ON r.category_id = c.id 
        GROUP BY c.name, c.display_order 
        ORDER BY c.display_order;
    `);
    console.log(`\nRewards count by category:`);
    console.table(breakdown.rows);

    // 6. Tier breakdown
    const tierBreakdown = await client.query(`
        SELECT t.name as tier, count(r.id) as count 
        FROM public.ac_tiers t 
        JOIN public.ac_other_rewards r ON r.tier_id = t.id 
        GROUP BY t.name, t.display_order 
        ORDER BY t.display_order;
    `);
    console.log(`\nRewards count by canonical tier:`);
    console.table(tierBreakdown.rows);

    // 7. RLS check
    const rlsCats = await client.query(`SELECT policyname, cmd FROM pg_policies WHERE tablename = 'ac_other_rewards_categories';`);
    const rlsRewards = await client.query(`SELECT policyname, cmd FROM pg_policies WHERE tablename = 'ac_other_rewards';`);
    console.log(`\nActive RLS Policies on categories: ${rlsCats.rowCount}, on rewards: ${rlsRewards.rowCount}`);

    console.log(`\nAll verification checks passed with 100% data integrity!`);
}

run();
