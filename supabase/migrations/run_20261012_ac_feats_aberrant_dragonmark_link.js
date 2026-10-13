/**
 * Database Migration Runner: AC Feats Aberrant Dragonmark Website Link
 * Target Table: public.ac_feats
 *
 * Usage:
 *   node supabase/migrations/run_20261012_ac_feats_aberrant_dragonmark_link.js --dry-run
 *   node supabase/migrations/run_20261012_ac_feats_aberrant_dragonmark_link.js --execute
 *   node supabase/migrations/run_20261012_ac_feats_aberrant_dragonmark_link.js --dry-run --prod
 *   node supabase/migrations/run_20261012_ac_feats_aberrant_dragonmark_link.js --execute --prod
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
    console.log(`Starting AC Feats Aberrant Dragonmark Link Migration`);
    console.log(`Environment: ${targetEnvName}`);
    console.log(`Mode:        ${isExecute ? 'EXECUTE (Commit changes)' : 'DRY RUN (Rollback)'}`);
    console.log(`====================================================`);

    const client = new pg.Client({ connectionString: dbUrl });
    try {
        await client.connect();

        const sqlFile = path.resolve(__dirname, '20261012_ac_feats_aberrant_dragonmark_link.sql');
        const sqlContent = fs.readFileSync(sqlFile, 'utf8');

        await client.query('BEGIN;');

        const cleanSql = sqlContent
            .replace(/^\s*BEGIN\s*;/im, '')
            .replace(/^\s*COMMIT\s*;/im, '');

        await client.query(cleanSql);

        // Verification Checks
        console.log('\n--- Running Post-Migration Verification Checks ---');
        let allPassed = true;

        // Check 1: Record count in public.ac_feats preserved
        const countRes = await client.query('SELECT count(*) FROM public.ac_feats;');
        const totalCount = parseInt(countRes.rows[0].count, 10);
        if (totalCount === 346) {
            console.log(`[PASS] Check 1: Record count verified (346 feats preserved).`);
        } else {
            console.error(`[FAIL] Check 1: Expected 346 feats, found ${totalCount}.`);
            allPassed = false;
        }

        // Check 2: FEA_0001 (2014 Aberrant Dragonmark) has [Hawthorne Arcana](/arcana/)
        const f1Res = await client.query("SELECT notes_advice FROM public.ac_feats WHERE check_id = 'FEA_0001';");
        const f1Notes = f1Res.rows[0]?.notes_advice || '';
        if (f1Notes.includes('[Hawthorne Arcana](/arcana/)') && !f1Notes.includes('1yoinFa31Rhq__unHxMxCSfMq7QY5ARYC')) {
            console.log(`[PASS] Check 2: FEA_0001 (2014 Aberrant Dragonmark) verified with website link [Hawthorne Arcana](/arcana/).`);
        } else {
            console.error(`[FAIL] Check 2: FEA_0001 has unexpected notes_advice:`, f1Notes);
            allPassed = false;
        }

        // Check 3: FEA_0193 (2024 Aberrant Dragonmark) has [Hawthorne Arcana](/arcana/)
        const f193Res = await client.query("SELECT notes_advice FROM public.ac_feats WHERE check_id = 'FEA_0193';");
        const f193Notes = f193Res.rows[0]?.notes_advice || '';
        if (f193Notes.includes('[Hawthorne Arcana](/arcana/)') && !f193Notes.includes('1yoinFa31Rhq__unHxMxCSfMq7QY5ARYC')) {
            console.log(`[PASS] Check 3: FEA_0193 (2024 Aberrant Dragonmark) verified with website link [Hawthorne Arcana](/arcana/).`);
        } else {
            console.error(`[FAIL] Check 3: FEA_0193 has unexpected notes_advice:`, f193Notes);
            allPassed = false;
        }

        // Check 4: Exactly 2 Aberrant Dragonmark records updated
        const updatedRes = await client.query("SELECT count(*) FROM public.ac_feats WHERE name = 'Aberrant Dragonmark' AND notes_advice LIKE '%[Hawthorne Arcana](/arcana/)%';");
        const updatedCount = parseInt(updatedRes.rows[0].count, 10);
        if (updatedCount === 2) {
            console.log(`[PASS] Check 4: Exactly 2 Aberrant Dragonmark feats verified with website link.`);
        } else {
            console.error(`[FAIL] Check 4: Expected 2 updated records, found ${updatedCount}.`);
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
