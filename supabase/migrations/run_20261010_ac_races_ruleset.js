/**
 * Database Migration Runner: Add ruleset to ac_races and update v_ac_races
 * 
 * Usage:
 *   node supabase/migrations/run_20261010_ac_races_ruleset.js --dry-run
 *   node supabase/migrations/run_20261010_ac_races_ruleset.js --execute
 *   node supabase/migrations/run_20261010_ac_races_ruleset.js --execute --prod
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
        dbUrl = process.env.SOURCE_DB_URL;
        targetEnvName = 'DEV / SOURCE_DB';
    }
}

const isExecute = process.argv.includes('--execute');

async function run() {
    console.log(`================================================================`);
    console.log(`Migration: Add ruleset to ac_races and normalize species names`);
    console.log(`Target DB: ${targetEnvName}`);
    console.log(`Mode:      ${isExecute ? 'EXECUTE' : 'DRY RUN'}`);
    console.log(`================================================================\n`);

    if (!dbUrl) {
        console.error('Error: Database connection URL not found in environment.');
        process.exit(1);
    }

    const client = new pg.Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log(`[+] Connected to database (${targetEnvName}).`);

        const sqlFilePath = path.resolve(__dirname, '20261010_ac_races_ruleset.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

        if (!isExecute) {
            console.log('\n[DRY RUN] Beginning simulation inside a transaction...');
            await client.query('BEGIN;');
            await client.query(sqlContent);

            // Validation queries
            const count2024 = await client.query("SELECT count(*)::int as count FROM public.ac_races WHERE ruleset = '2024';");
            const count2014 = await client.query("SELECT count(*)::int as count FROM public.ac_races WHERE ruleset = '2014';");
            const stillHas2024inName = await client.query("SELECT count(*)::int as count FROM public.ac_races WHERE name ILIKE '%(2024)%';");
            const view2024 = await client.query("SELECT count(*)::int as count FROM public.v_ac_races WHERE ruleset = '2024';");
            const view2014 = await client.query("SELECT count(*)::int as count FROM public.v_ac_races WHERE ruleset = '2014';");

            console.log(`\n--- Verification Results (Dry Run) ---`);
            console.log(`ac_races ruleset='2024' count:   ${count2024.rows[0].count} (Expected: 30)`);
            console.log(`ac_races ruleset='2014' count:   ${count2014.rows[0].count} (Expected: 84)`);
            console.log(`Races still having '(2024)':    ${stillHas2024inName.rows[0].count} (Expected: 0)`);
            console.log(`v_ac_races ruleset='2024' count: ${view2024.rows[0].count} (Expected: 52)`);
            console.log(`v_ac_races ruleset='2014' count: ${view2014.rows[0].count} (Expected: 169)`);

            await client.query('ROLLBACK;');
            console.log('\n[DRY RUN] Transaction rolled back cleanly. No changes committed.');
            console.log('To apply changes, run with: --execute' + (isProd ? ' --prod' : ''));
        } else {
            console.log('\n[EXECUTE] Applying migration to database...');
            await client.query(sqlContent);
            console.log('[+] Migration script executed successfully.');

            // Verification queries
            const count2024 = await client.query("SELECT count(*)::int as count FROM public.ac_races WHERE ruleset = '2024';");
            const count2014 = await client.query("SELECT count(*)::int as count FROM public.ac_races WHERE ruleset = '2014';");
            const stillHas2024inName = await client.query("SELECT count(*)::int as count FROM public.ac_races WHERE name ILIKE '%(2024)%';");
            const view2024 = await client.query("SELECT count(*)::int as count FROM public.v_ac_races WHERE ruleset = '2024';");
            const view2014 = await client.query("SELECT count(*)::int as count FROM public.v_ac_races WHERE ruleset = '2014';");

            console.log(`\n--- Live Verification Results ---`);
            console.log(`ac_races ruleset='2024' count:   ${count2024.rows[0].count} (Expected: 30)`);
            console.log(`ac_races ruleset='2014' count:   ${count2014.rows[0].count} (Expected: 84)`);
            console.log(`Races still having '(2024)':    ${stillHas2024inName.rows[0].count} (Expected: 0)`);
            console.log(`v_ac_races ruleset='2024' count: ${view2024.rows[0].count} (Expected: 52)`);
            console.log(`v_ac_races ruleset='2014' count: ${view2014.rows[0].count} (Expected: 169)`);
            console.log('\n[SUCCESS] Migration committed.');
        }
    } catch (err) {
        console.error('Migration failed:', err);
        try {
            await client.query('ROLLBACK;');
        } catch (_) {}
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();
