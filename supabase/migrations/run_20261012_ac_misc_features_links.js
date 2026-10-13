/**
 * Database Migration Runner: AC Misc Class Features Links Normalization
 * Target Tables: public.ac_fighting_styles, public.ac_artificer_infusions, public.ac_eldritch_invocations
 *
 * Usage:
 *   node supabase/migrations/run_20261012_ac_misc_features_links.js --dry-run
 *   node supabase/migrations/run_20261012_ac_misc_features_links.js --execute
 *   node supabase/migrations/run_20261012_ac_misc_features_links.js --dry-run --prod
 *   node supabase/migrations/run_20261012_ac_misc_features_links.js --execute --prod
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
    console.log(`Starting AC Misc Class Features Links Migration`);
    console.log(`Environment: ${targetEnvName}`);
    console.log(`Mode:        ${isExecute ? 'EXECUTE (Commit changes)' : 'DRY RUN (Rollback)'}`);
    console.log(`====================================================`);

    const client = new pg.Client({ connectionString: dbUrl });
    try {
        await client.connect();

        const sqlFile = path.resolve(__dirname, '20261012_ac_misc_features_links.sql');
        const sqlContent = fs.readFileSync(sqlFile, 'utf8');

        await client.query('BEGIN;');

        const cleanSql = sqlContent
            .replace(/^\s*BEGIN\s*;/im, '')
            .replace(/^\s*COMMIT\s*;/im, '');

        await client.query(cleanSql);

        // Verification Checks
        console.log('\n--- Running Post-Migration Verification Checks ---');
        let allPassed = true;

        // Check 1: Record counts across all 3 tables
        const fsCountRes = await client.query('SELECT count(*) FROM public.ac_fighting_styles;');
        const infCountRes = await client.query('SELECT count(*) FROM public.ac_artificer_infusions;');
        const invCountRes = await client.query('SELECT count(*) FROM public.ac_eldritch_invocations;');
        
        const fsCount = parseInt(fsCountRes.rows[0].count, 10);
        const infCount = parseInt(infCountRes.rows[0].count, 10);
        const invCount = parseInt(invCountRes.rows[0].count, 10);

        if (fsCount === 17 && infCount === 16 && invCount === 86) {
            console.log(`[PASS] Check 1: Record counts verified (17 Fighting Styles, 16 Infusions, 86 Invocations = 119 total).`);
        } else {
            console.error(`[FAIL] Check 1: Expected (17, 16, 86), found (${fsCount}, ${infCount}, ${invCount}).`);
            allPassed = false;
        }

        // Check 2: Check_ID range check
        const minMaxRes = await client.query(`
            SELECT 
                (SELECT min(check_id) FROM public.ac_fighting_styles) as min_fs,
                (SELECT max(check_id) FROM public.ac_fighting_styles) as max_fs,
                (SELECT min(check_id) FROM public.ac_artificer_infusions) as min_inf,
                (SELECT max(check_id) FROM public.ac_artificer_infusions) as max_inf,
                (SELECT min(check_id) FROM public.ac_eldritch_invocations) as min_inv,
                (SELECT max(check_id) FROM public.ac_eldritch_invocations) as max_inv;
        `);
        const r = minMaxRes.rows[0];
        if (r.min_fs === 'MSC_0001' && r.max_fs === 'MSC_0017' &&
            r.min_inf === 'MSC_0018' && r.max_inf === 'MSC_0033' &&
            r.min_inv === 'MSC_0034' && r.max_inv === 'MSC_0119') {
            console.log(`[PASS] Check 2: Check_ID ranges verified: MSC_0001..MSC_0017, MSC_0018..MSC_0033, MSC_0034..MSC_0119.`);
        } else {
            console.error(`[FAIL] Check 2: Check_ID ranges unexpected:`, r);
            allPassed = false;
        }

        // Check 3: Feats link in MSC_0017
        const fs17Res = await client.query("SELECT notes_advice FROM public.ac_fighting_styles WHERE check_id = 'MSC_0017';");
        const fs17Notes = fs17Res.rows[0]?.notes_advice || '';
        if (fs17Notes.includes('Refer to Fighting Style Feats [here](/allowed-content/#feats).')) {
            console.log(`[PASS] Check 3: MSC_0017 verified with [here](/allowed-content/#feats) relative link.`);
        } else {
            console.error(`[FAIL] Check 3: MSC_0017 notes unexpected: ${fs17Notes}`);
            allPassed = false;
        }

        // Check 4: Loot link in MSC_0029
        const inf29Res = await client.query("SELECT notes_advice FROM public.ac_artificer_infusions WHERE check_id = 'MSC_0029';");
        const inf29Notes = inf29Res.rows[0]?.notes_advice || '';
        if (inf29Notes.includes('in [Loot](/allowed-content/#loot)')) {
            console.log(`[PASS] Check 4: MSC_0029 verified with [Loot](/allowed-content/#loot) relative link.`);
        } else {
            console.error(`[FAIL] Check 4: MSC_0029 notes unexpected: ${inf29Notes}`);
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
