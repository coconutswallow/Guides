/**
 * Database Migration Runner: AC Loot Normalization
 * Target Tables: public.ac_loot, public.ac_loot_categories, public.ac_loot_tags
 *
 * Usage:
 *   node supabase/migrations/run_20261012_ac_loot_normalization.js --dry-run
 *   node supabase/migrations/run_20261012_ac_loot_normalization.js --execute
 *   node supabase/migrations/run_20261012_ac_loot_normalization.js --dry-run --prod
 *   node supabase/migrations/run_20261012_ac_loot_normalization.js --execute --prod
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

const args = process.argv.slice(2);
const isProd = args.includes('--prod');
const isExecute = args.includes('--execute');
const isDryRun = args.includes('--dry-run') || !isExecute;

const connectionString = isProd
    ? (process.env.PROD_DB_URL || process.env.TARGET_DB_URL)
    : process.env.SOURCE_DB_URL;

const envName = isProd ? 'PRODUCTION' : 'DEVELOPMENT';

if (!connectionString) {
    console.error(`Error: Database connection string not found for ${envName}.`);
    process.exit(1);
}

const migrationFile = path.resolve(__dirname, '20261012_ac_loot_normalization.sql');
if (!fs.existsSync(migrationFile)) {
    console.error(`Error: Migration SQL file not found at ${migrationFile}`);
    process.exit(1);
}

const sqlContent = fs.readFileSync(migrationFile, 'utf8');

async function run() {
    console.log(`====================================================`);
    console.log(`Migration Runner: AC Loot Normalization`);
    console.log(`Environment:      ${envName}`);
    console.log(`Mode:             ${isExecute ? 'EXECUTE' : 'DRY-RUN'}`);
    console.log(`SQL File:         ${path.basename(migrationFile)} (${(sqlContent.length / 1024).toFixed(1)} KB)`);
    console.log(`====================================================\n`);

    const client = new pg.Client({
        connectionString,
        statement_timeout: 120000
    });

    try {
        await client.connect();
        console.log(`Successfully connected to ${envName} database.`);

        if (isDryRun) {
            console.log(`\nStarting DRY-RUN (wrapping in transaction and ROLLBACK)...`);
            await client.query('BEGIN;');
            const startTime = Date.now();
            await client.query(sqlContent);
            const duration = Date.now() - startTime;
            console.log(`SQL migration executed cleanly in ${duration}ms.`);

            await verify(client);

            await client.query('ROLLBACK;');
            console.log(`\nTransaction rolled back successfully. Dry-run verified without modifying data.`);
        } else {
            console.log(`\nExecuting migration for real...`);
            const startTime = Date.now();
            await client.query(sqlContent);
            const duration = Date.now() - startTime;
            console.log(`SQL migration committed cleanly in ${duration}ms.`);

            await verify(client);
            console.log(`\nMigration completed and verified successfully on ${envName}!`);
        }
    } catch (err) {
        console.error(`\nMigration failed with error:`);
        console.error(err);
        try {
            await client.query('ROLLBACK;');
        } catch (_) {}
        process.exit(1);
    } finally {
        await client.end();
    }
}

async function verify(client) {
    console.log(`\n--- Verification & Data Integrity Audit ---`);

    // 1. Table counts
    const catRes = await client.query('SELECT count(*) FROM public.ac_loot_categories;');
    const lootRes = await client.query('SELECT count(*) FROM public.ac_loot;');
    console.log(`Categories count: ${catRes.rows[0].count} (Expected: 4)`);
    console.log(`Loot items count: ${lootRes.rows[0].count} (Expected: 1358)`);

    if (parseInt(catRes.rows[0].count, 10) !== 4) {
        throw new Error(`Category count mismatch! Expected 4, got ${catRes.rows[0].count}`);
    }
    if (parseInt(lootRes.rows[0].count, 10) !== 1358) {
        throw new Error(`Loot count mismatch! Expected 1358, got ${lootRes.rows[0].count}`);
    }

    // 2. Backup table audit
    const backupRes = await client.query('SELECT count(*) FROM public.ac_loot_legacy_backup;');
    console.log(`Legacy backup count: ${backupRes.rows[0].count} rows preserved`);

    // 3. Distinct check_ids
    const checkIdRes = await client.query(`
        SELECT count(DISTINCT check_id) as distinct_checks, min(check_id) as min_chk, max(check_id) as max_chk 
        FROM public.ac_loot;
    `);
    console.log(`Check ID Audit: ${checkIdRes.rows[0].distinct_checks} distinct (Range: ${checkIdRes.rows[0].min_chk} to ${checkIdRes.rows[0].max_chk})`);

    if (parseInt(checkIdRes.rows[0].distinct_checks, 10) !== 1358) {
        throw new Error(`Duplicate check_ids detected!`);
    }

    // 4. FK Integrity: All category_id and tier_id point to valid records
    const orphanCats = await client.query(`
        SELECT count(*) FROM public.ac_loot l 
        LEFT JOIN public.ac_loot_categories c ON l.category_id = c.id 
        WHERE c.id IS NULL;
    `);
    if (parseInt(orphanCats.rows[0].count, 10) !== 0) {
        throw new Error(`Found orphan category_id records: ${orphanCats.rows[0].count}`);
    }

    const orphanTiers = await client.query(`
        SELECT count(*) FROM public.ac_loot l 
        LEFT JOIN public.ac_tiers t ON l.tier_id = t.id 
        WHERE t.id IS NULL;
    `);
    if (parseInt(orphanTiers.rows[0].count, 10) !== 0) {
        throw new Error(`Found orphan tier_id records: ${orphanTiers.rows[0].count}`);
    }

    // 5. Category breakdown
    const breakdown = await client.query(`
        SELECT c.name as category, count(l.id) as item_count 
        FROM public.ac_loot_categories c 
        JOIN public.ac_loot l ON l.category_id = c.id 
        GROUP BY c.name, c.display_order 
        ORDER BY c.display_order;
    `);
    console.log(`\nLoot count by category:`);
    console.table(breakdown.rows);

    // 6. Tier breakdown
    const tierBreakdown = await client.query(`
        SELECT t.name as tier, count(l.id) as count 
        FROM public.ac_tiers t 
        JOIN public.ac_loot l ON l.tier_id = t.id 
        GROUP BY t.name, t.display_order 
        ORDER BY t.display_order;
    `);
    console.log(`\nLoot count by canonical tier:`);
    console.table(tierBreakdown.rows);

    // 7. Nature breakdown
    const natureBreakdown = await client.query(`
        SELECT nature, count(*) as count 
        FROM public.ac_loot 
        GROUP BY nature 
        ORDER BY count DESC;
    `);
    console.log(`\nLoot count by nature:`);
    console.table(natureBreakdown.rows);

    // 8. RLS check
    const rlsCats = await client.query(`SELECT policyname, cmd FROM pg_policies WHERE tablename = 'ac_loot_categories';`);
    const rlsLoot = await client.query(`SELECT policyname, cmd FROM pg_policies WHERE tablename = 'ac_loot';`);
    console.log(`\nActive RLS Policies on categories: ${rlsCats.rowCount}, on loot: ${rlsLoot.rowCount}`);

    console.log(`\nAll verification checks passed with 100% data integrity!`);
}

run();
