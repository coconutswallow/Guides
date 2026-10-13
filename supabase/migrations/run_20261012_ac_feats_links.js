/**
 * Database Migration Runner: AC Feats Links Normalization
 * Target Table: public.ac_feats
 *
 * Usage:
 *   node supabase/migrations/run_20261012_ac_feats_links.js --dry-run
 *   node supabase/migrations/run_20261012_ac_feats_links.js --execute
 *   node supabase/migrations/run_20261012_ac_feats_links.js --dry-run --prod
 *   node supabase/migrations/run_20261012_ac_feats_links.js --execute --prod
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
    console.log(`Starting AC Feats Links Migration`);
    console.log(`Environment: ${targetEnvName}`);
    console.log(`Mode:        ${isExecute ? 'EXECUTE (Commit changes)' : 'DRY RUN (Rollback)'}`);
    console.log(`====================================================`);

    const client = new pg.Client({ connectionString: dbUrl });
    try {
        await client.connect();

        const sqlFile = path.resolve(__dirname, '20261012_ac_feats_links.sql');
        const sqlContent = fs.readFileSync(sqlFile, 'utf8');

        await client.query('BEGIN;');

        const cleanSql = sqlContent
            .replace(/^\s*BEGIN\s*;/im, '')
            .replace(/^\s*COMMIT\s*;/im, '');

        await client.query(cleanSql);

        // Verification Checks
        console.log('\n--- Running Post-Migration Verification Checks ---');
        let allPassed = true;

        // Check 1: Record count in public.ac_feats
        const countRes = await client.query('SELECT count(*) FROM public.ac_feats;');
        const totalCount = parseInt(countRes.rows[0].count, 10);
        if (totalCount === 346) {
            console.log(`[PASS] Check 1: Record count verified (346 feats preserved).`);
        } else {
            console.error(`[FAIL] Check 1: Expected 346 feats, found ${totalCount}.`);
            allPassed = false;
        }

        // Check 2: Check_ID range check (FEA_0001 .. FEA_0346)
        const rangeRes = await client.query(`
            SELECT min(check_id) as min_id, max(check_id) as max_id, count(DISTINCT check_id) as distinct_ids
            FROM public.ac_feats;
        `);
        const r = rangeRes.rows[0];
        if (r.min_id === 'FEA_0001' && r.max_id === 'FEA_0346' && parseInt(r.distinct_ids, 10) === 346) {
            console.log(`[PASS] Check 2: Check_ID range verified: FEA_0001 through FEA_0346 (346 distinct IDs).`);
        } else {
            console.error(`[FAIL] Check 2: Unexpected check_id range:`, r);
            allPassed = false;
        }

        // Check 3: Exactly 26 feats contain Eberron: Rising from the Last War markdown link
        const eberronRes = await client.query(`
            SELECT count(*) FROM public.ac_feats
            WHERE notes_advice LIKE '%[Eberron: Rising from the Last War](https://www.dndbeyond.com/sources/dnd/erftlw)%';
        `);
        const eberronCount = parseInt(eberronRes.rows[0].count, 10);
        if (eberronCount === 26) {
            console.log(`[PASS] Check 3: Exactly 26 feats contain markdown external link to Eberron: Rising from the Last War.`);
        } else {
            console.error(`[FAIL] Check 3: Expected 26 feats with Eberron link, found ${eberronCount}.`);
            allPassed = false;
        }

        // Check 4: Exactly 15 feats contain Hawthorne Arcana markdown link
        const arcanaRes = await client.query(`
            SELECT count(*) FROM public.ac_feats
            WHERE notes_advice LIKE '%[Hawthorne Arcana](https://drive.google.com/file/d/1yoinFa31Rhq__unHxMxCSfMq7QY5ARYC/view)%';
        `);
        const arcanaCount = parseInt(arcanaRes.rows[0].count, 10);
        if (arcanaCount === 15) {
            console.log(`[PASS] Check 4: Exactly 15 feats contain markdown external link to Hawthorne Arcana.`);
        } else {
            console.error(`[FAIL] Check 4: Expected 15 feats with Hawthorne Arcana link, found ${arcanaCount}.`);
            allPassed = false;
        }

        // Check 5: FEA_0154 contains Allowed Content (Languages) relative link
        const lRes = await client.query("SELECT notes_advice FROM public.ac_feats WHERE check_id = 'FEA_0154';");
        const lNotes = lRes.rows[0]?.notes_advice || '';
        if (lNotes.includes('[Allowed Content (Languages)](/allowed-content/#languages)')) {
            console.log(`[PASS] Check 5: FEA_0154 verified with relative website link to [Allowed Content (Languages)](/allowed-content/#languages).`);
        } else {
            console.error(`[FAIL] Check 5: FEA_0154 missing relative link: ${lNotes}`);
            allPassed = false;
        }

        // Check 6: Spot check on multi-link feats (FEA_0193 has both Eberron and Arcana links)
        const multiRes = await client.query("SELECT notes_advice FROM public.ac_feats WHERE check_id = 'FEA_0193';");
        const multiNotes = multiRes.rows[0]?.notes_advice || '';
        if (multiNotes.includes('[Eberron: Rising from the Last War]') && multiNotes.includes('[Hawthorne Arcana]')) {
            console.log(`[PASS] Check 6: Spot check verified (FEA_0193 has both Eberron and Hawthorne Arcana markdown links).`);
        } else {
            console.error(`[FAIL] Check 6: FEA_0193 missing expected links: ${multiNotes}`);
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
