/**
 * Database Migration Runner: AC Backgrounds Links & Check_ID Normalization
 * Target Table: public.ac_backgrounds
 *
 * Usage:
 *   node supabase/migrations/run_20261012_ac_backgrounds_links.js --dry-run
 *   node supabase/migrations/run_20261012_ac_backgrounds_links.js --execute
 *   node supabase/migrations/run_20261012_ac_backgrounds_links.js --dry-run --prod
 *   node supabase/migrations/run_20261012_ac_backgrounds_links.js --execute --prod
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
        dbUrl = process.env.DEV_DB_URL || process.env.SOURCE_DB_URL;
        targetEnvName = 'DEV';
    }
}

if (!dbUrl) {
    console.error(`Error: Database connection URL not found for ${targetEnvName}.`);
    process.exit(1);
}

const isExecute = process.argv.includes('--execute');
const isDryRun = process.argv.includes('--dry-run') || !isExecute;

async function run() {
    console.log(`====================================================`);
    console.log(`Starting AC Backgrounds Links & Check_ID Migration`);
    console.log(`Environment: ${targetEnvName}`);
    console.log(`Mode:        ${isExecute ? 'EXECUTE (Commit changes)' : 'DRY RUN (Rollback)'}`);
    console.log(`====================================================`);

    const client = new pg.Client({ connectionString: dbUrl });
    try {
        await client.connect();

        const sqlFile = path.resolve(__dirname, '20261012_ac_backgrounds_links.sql');
        const sqlContent = fs.readFileSync(sqlFile, 'utf8');

        await client.query('BEGIN;');

        const cleanSql = sqlContent
            .replace(/^\s*BEGIN\s*;/im, '')
            .replace(/^\s*COMMIT\s*;/im, '');

        await client.query(cleanSql);

        // Verification Checks
        console.log('\n--- Running Post-Migration Verification Checks ---');
        let allPassed = true;

        // Check 1: Record count in public.ac_backgrounds
        const countRes = await client.query('SELECT count(*) FROM public.ac_backgrounds;');
        const totalCount = parseInt(countRes.rows[0].count, 10);
        if (totalCount === 166) {
            console.log(`[PASS] Check 1: Record count verified (166 backgrounds preserved).`);
        } else {
            console.error(`[FAIL] Check 1: Expected 166 backgrounds, found ${totalCount}.`);
            allPassed = false;
        }

        // Check 2: Check_ID range check (BAC_0001 .. BAC_0166)
        const rangeRes = await client.query(`
            SELECT min(check_id) as min_id, max(check_id) as max_id, count(DISTINCT check_id) as distinct_ids
            FROM public.ac_backgrounds;
        `);
        const r = rangeRes.rows[0];
        if (r.min_id === 'BAC_0001' && r.max_id === 'BAC_0166' && parseInt(r.distinct_ids, 10) === 166) {
            console.log(`[PASS] Check 2: Check_ID range verified: BAC_0001 through BAC_0166 (166 distinct IDs).`);
        } else {
            console.error(`[FAIL] Check 2: Unexpected check_id range:`, r);
            allPassed = false;
        }

        // Check 3: Zero null or empty check_ids
        const nullRes = await client.query(`
            SELECT count(*) FROM public.ac_backgrounds
            WHERE check_id IS NULL OR TRIM(check_id) = '';
        `);
        const nullCount = parseInt(nullRes.rows[0].count, 10);
        if (nullCount === 0) {
            console.log(`[PASS] Check 3: Zero null or empty check_ids verified.`);
        } else {
            console.error(`[FAIL] Check 3: Found ${nullCount} null/empty check_ids.`);
            allPassed = false;
        }

        // Check 4: display_order to check_id 1:1 mapping alignment
        const alignRes = await client.query(`
            SELECT count(*) FROM public.ac_backgrounds
            WHERE check_id != ('BAC_' || LPAD(display_order::text, 4, '0'));
        `);
        const misalignedCount = parseInt(alignRes.rows[0].count, 10);
        if (misalignedCount === 0) {
            console.log(`[PASS] Check 4: All 166 records have display_order matching check_id 1:1.`);
        } else {
            console.error(`[FAIL] Check 4: Found ${misalignedCount} misaligned records.`);
            allPassed = false;
        }

        // Check 5: Spot check boundary and specific backgrounds
        const spot1 = await client.query("SELECT check_id, name, display_order FROM public.ac_backgrounds WHERE check_id = 'BAC_0001';");
        const spot38 = await client.query("SELECT check_id, name, display_order FROM public.ac_backgrounds WHERE check_id = 'BAC_0038';");
        const spot166 = await client.query("SELECT check_id, name, display_order FROM public.ac_backgrounds WHERE check_id = 'BAC_0166';");

        if (spot1.rows[0]?.name === 'Cult of the Dragon Infiltrator' &&
            spot38.rows[0]?.name === 'Fallen Cloak Survivor' &&
            spot166.rows[0]?.name === 'Zhentarim Mercenary') {
            console.log(`[PASS] Check 5: Spot check verified (BAC_0001='Cult of the Dragon Infiltrator', BAC_0038='Fallen Cloak Survivor', BAC_0166='Zhentarim Mercenary').`);
        } else {
            console.error(`[FAIL] Check 5: Spot check failed:`, {
                spot1: spot1.rows[0],
                spot38: spot38.rows[0],
                spot166: spot166.rows[0]
            });
            allPassed = false;
        }

        if (!allPassed) {
            throw new Error('One or more verification checks failed.');
        }

        if (isExecute) {
            await client.query('COMMIT;');
            console.log(`\n>>> SUCCESS: All checks passed. Changes COMMITTED to ${targetEnvName}.`);
        } else {
            await client.query('ROLLBACK;');
            console.log(`\n>>> DRY-RUN COMPLETE: All checks passed. Transaction safely ROLLED BACK.`);
        }

    } catch (err) {
        try {
            await client.query('ROLLBACK;');
        } catch (_) {}
        console.error(`\n>>> ERROR running migration against ${targetEnvName}:`, err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();
