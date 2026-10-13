/**
 * Database Migration Runner: AC Races & Subraces Links Normalization
 * Target Tables: public.ac_races, public.ac_subraces, public.v_ac_races
 *
 * Usage:
 *   node supabase/migrations/run_20261012_ac_races_links.js --dry-run
 *   node supabase/migrations/run_20261012_ac_races_links.js --execute
 *   node supabase/migrations/run_20261012_ac_races_links.js --dry-run --prod
 *   node supabase/migrations/run_20261012_ac_races_links.js --execute --prod
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
    console.log(`Starting AC Races & Subraces Links Migration`);
    console.log(`Environment: ${targetEnvName}`);
    console.log(`Mode:        ${isExecute ? 'EXECUTE (Commit changes)' : 'DRY RUN (Rollback)'}`);
    console.log(`====================================================`);

    const client = new pg.Client({ connectionString: dbUrl });
    try {
        await client.connect();

        const sqlFile = path.resolve(__dirname, '20261012_ac_races_links.sql');
        const sqlContent = fs.readFileSync(sqlFile, 'utf8');

        await client.query('BEGIN;');

        const cleanSql = sqlContent
            .replace(/^\s*BEGIN\s*;/im, '')
            .replace(/^\s*COMMIT\s*;/im, '');

        await client.query(cleanSql);

        // Verification Checks
        console.log('\n--- Running Post-Migration Verification Checks ---');
        let allPassed = true;

        // Check 1: Record count in public.ac_races preserved (114)
        const raceCountRes = await client.query('SELECT count(*) FROM public.ac_races;');
        const raceCount = parseInt(raceCountRes.rows[0].count, 10);
        if (raceCount === 114) {
            console.log(`[PASS] Check 1: Record count verified in public.ac_races (114 base races preserved).`);
        } else {
            console.error(`[FAIL] Check 1: Expected 114 races, found ${raceCount}.`);
            allPassed = false;
        }

        // Check 2: Record count in public.ac_subraces preserved (221)
        const subraceCountRes = await client.query('SELECT count(*) FROM public.ac_subraces;');
        const subraceCount = parseInt(subraceCountRes.rows[0].count, 10);
        if (subraceCount === 221) {
            console.log(`[PASS] Check 2: Record count verified in public.ac_subraces (221 subraces preserved).`);
        } else {
            console.error(`[FAIL] Check 2: Expected 221 subraces, found ${subraceCount}.`);
            allPassed = false;
        }

        // Check 3: Exactly 19 subraces contain [Hawthorne Arcana](/arcana/)
        const srLinkRes = await client.query("SELECT count(*) FROM public.ac_subraces WHERE notes_advice LIKE '%[Hawthorne Arcana](/arcana/)%';");
        const srLinkCount = parseInt(srLinkRes.rows[0].count, 10);
        if (srLinkCount === 19) {
            console.log(`[PASS] Check 3: Exactly 19 subraces contain website relative link [Hawthorne Arcana](/arcana/).`);
        } else {
            console.error(`[FAIL] Check 3: Expected 19 subraces with link, found ${srLinkCount}.`);
            allPassed = false;
        }

        // Check 4: Exactly 5 parent races contain [Hawthorne Arcana](/arcana/)
        const rLinkRes = await client.query("SELECT count(*) FROM public.ac_races WHERE notes_advice LIKE '%[Hawthorne Arcana](/arcana/)%';");
        const rLinkCount = parseInt(rLinkRes.rows[0].count, 10);
        if (rLinkCount === 5) {
            console.log(`[PASS] Check 4: Exactly 5 parent races contain website relative link [Hawthorne Arcana](/arcana/).`);
        } else {
            console.error(`[FAIL] Check 4: Expected 5 races with link, found ${rLinkCount}.`);
            allPassed = false;
        }

        // Check 5: 0 unlinked 'found in Hawthorne Arcana' remaining in either table
        const unlinkedSrRes = await client.query("SELECT count(*) FROM public.ac_subraces WHERE notes_advice LIKE '%found in Hawthorne Arcana%' AND notes_advice NOT LIKE '%[Hawthorne Arcana]%';");
        const unlinkedRRes = await client.query("SELECT count(*) FROM public.ac_races WHERE notes_advice LIKE '%found in Hawthorne Arcana%' AND notes_advice NOT LIKE '%[Hawthorne Arcana]%';");
        const totalUnlinked = parseInt(unlinkedSrRes.rows[0].count, 10) + parseInt(unlinkedRRes.rows[0].count, 10);
        if (totalUnlinked === 0) {
            console.log(`[PASS] Check 5: Zero unlinked 'found in Hawthorne Arcana' occurrences remaining.`);
        } else {
            console.error(`[FAIL] Check 5: Found ${totalUnlinked} unlinked occurrences.`);
            allPassed = false;
        }

        // Check 6: Spot check v_ac_races view for Mark of Scribing (RAC_0075) and Warforged (RAC_0179)
        const spot1 = await client.query("SELECT check_id, race, subrace, notes_advice FROM public.v_ac_races WHERE check_id = 'RAC_0075';");
        const spot2 = await client.query("SELECT check_id, race, subrace, notes_advice FROM public.v_ac_races WHERE check_id = 'RAC_0179';");
        if (spot1.rows[0]?.notes_advice.includes('[Hawthorne Arcana](/arcana/)') &&
            spot2.rows[0]?.notes_advice.includes('[Hawthorne Arcana](/arcana/)')) {
            console.log(`[PASS] Check 6: View v_ac_races spot check verified for RAC_0075 and RAC_0179.`);
        } else {
            console.error(`[FAIL] Check 6: Spot check failed:`, { spot1: spot1.rows[0], spot2: spot2.rows[0] });
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
