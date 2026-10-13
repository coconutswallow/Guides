/**
 * Database Migration Runner: AC Sources Links Normalization
 * Target Table: public.ac_sources
 *
 * Usage:
 *   node supabase/migrations/run_20261012_ac_sources_links.js --dry-run
 *   node supabase/migrations/run_20261012_ac_sources_links.js --execute
 *   node supabase/migrations/run_20261012_ac_sources_links.js --dry-run --prod
 *   node supabase/migrations/run_20261012_ac_sources_links.js --execute --prod
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
    console.log(`Starting AC Sources Links Normalization Migration`);
    console.log(`Environment: ${targetEnvName}`);
    console.log(`Mode:        ${isExecute ? 'EXECUTE (Commit changes)' : 'DRY RUN (Rollback)'}`);
    console.log(`====================================================`);

    const client = new pg.Client({ connectionString: dbUrl });
    try {
        await client.connect();

        const sqlFile = path.resolve(__dirname, '20261012_ac_sources_links.sql');
        const sqlContent = fs.readFileSync(sqlFile, 'utf8');

        await client.query('BEGIN;');

        const cleanSql = sqlContent
            .replace(/^\s*BEGIN\s*;/im, '')
            .replace(/^\s*COMMIT\s*;/im, '');

        await client.query(cleanSql);

        // Verification Checks
        console.log('\n--- Running Post-Migration Verification Checks ---');
        let allPassed = true;

        // Check 1: Record count in public.ac_sources
        const countRes = await client.query('SELECT count(*) FROM public.ac_sources;');
        const totalCount = parseInt(countRes.rows[0].count, 10);
        if (totalCount === 121) {
            console.log(`[PASS] Check 1: Record count verified (121 sources preserved).`);
        } else {
            console.error(`[FAIL] Check 1: Expected 121 sources, found ${totalCount}.`);
            allPassed = false;
        }

        // Check 2: All 119 Excel check_ids present
        const rangeRes = await client.query(`
            SELECT count(DISTINCT check_id) as distinct_src
            FROM public.ac_sources
            WHERE check_id LIKE 'SRC_%';
        `);
        const distinctSrc = parseInt(rangeRes.rows[0].distinct_src, 10);
        if (distinctSrc >= 119) {
            console.log(`[PASS] Check 2: Check_ID coverage verified (${distinctSrc} distinct SRC_* IDs).`);
        } else {
            console.error(`[FAIL] Check 2: Expected at least 119 distinct SRC_* IDs, found ${distinctSrc}.`);
            allPassed = false;
        }

        // Check 3: SRC_0009 verification
        const bmtRes = await client.query("SELECT notes_advice FROM public.ac_sources WHERE check_id = 'SRC_0009';");
        const bmtNotes = bmtRes.rows[0]?.notes_advice || '';
        if (
            bmtNotes.includes('[Feats](/allowed-content/#feats)') &&
            bmtNotes.includes('[Loot](/allowed-content/#loot)') &&
            !bmtNotes.includes('spreadsheets')
        ) {
            console.log(`[PASS] Check 3: SRC_0009 (The Book of Many Things) verified with relative website links for Feats and Loot.`);
        } else {
            console.error(`[FAIL] Check 3: SRC_0009 unexpected notes_advice:`, bmtNotes);
            allPassed = false;
        }

        // Check 4: SRC_0023 verification
        const egwRes = await client.query("SELECT notes_advice FROM public.ac_sources WHERE check_id = 'SRC_0023';");
        const egwNotes = egwRes.rows[0]?.notes_advice || '';
        if (
            egwNotes.includes('[Spells](/allowed-content/#spells)') &&
            !egwNotes.includes('spreadsheets')
        ) {
            console.log(`[PASS] Check 4: SRC_0023 (Explorer's Guide to Wildemount) verified with relative website link for Spells.`);
        } else {
            console.error(`[FAIL] Check 4: SRC_0023 unexpected notes_advice:`, egwNotes);
            allPassed = false;
        }

        // Check 5: Zero Google Spreadsheet links remaining in public.ac_sources
        const remainingSheetLinks = await client.query(`
            SELECT count(*) FROM public.ac_sources
            WHERE notes_advice LIKE '%docs.google.com/spreadsheets%'
               OR allowed_content LIKE '%docs.google.com/spreadsheets%';
        `);
        const remainingSheetCount = parseInt(remainingSheetLinks.rows[0].count, 10);
        if (remainingSheetCount === 0) {
            console.log(`[PASS] Check 5: 0 Google Spreadsheet links remaining in ac_sources.`);
        } else {
            console.error(`[FAIL] Check 5: Expected 0 Google Spreadsheet links, found ${remainingSheetCount}.`);
            allPassed = false;
        }

        // Check 6: Core external links in SRC_0001..SRC_0006 preserved
        const coreRes = await client.query(`
            SELECT count(*) FROM public.ac_sources
            WHERE check_id IN ('SRC_0001', 'SRC_0002', 'SRC_0003', 'SRC_0004', 'SRC_0005', 'SRC_0006')
              AND notes_advice LIKE '%[Basic Rules (%]%';
        `);
        const coreCount = parseInt(coreRes.rows[0].count, 10);
        if (coreCount === 6) {
            console.log(`[PASS] Check 6: All 6 Core rulebook external markdown links preserved.`);
        } else {
            console.error(`[FAIL] Check 6: Expected 6 Core rulebooks with external markdown links, found ${coreCount}.`);
            allPassed = false;
        }

        if (!allPassed) {
            throw new Error('Post-migration verification checks failed.');
        }

        if (isExecute) {
            await client.query('COMMIT;');
            console.log(`\n>>> SUCCESS: Migration committed to ${targetEnvName}. <<<`);
        } else {
            await client.query('ROLLBACK;');
            console.log(`\n>>> DRY RUN COMPLETE: All checks passed. Changes rolled back. <<<`);
        }

    } catch (err) {
        try {
            await client.query('ROLLBACK;');
        } catch (rbErr) {
            // ignore rollback error
        }
        console.error(`\n>>> ERROR: Migration failed. Transaction rolled back. <<<`, err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();
