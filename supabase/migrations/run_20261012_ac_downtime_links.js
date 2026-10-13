/**
 * Database Migration Runner: AC Downtime Links Normalization
 * Target Tables: public.ac_downtime, public.ac_downtime_type
 *
 * Usage:
 *   node supabase/migrations/run_20261012_ac_downtime_links.js --dry-run
 *   node supabase/migrations/run_20261012_ac_downtime_links.js --execute
 *   node supabase/migrations/run_20261012_ac_downtime_links.js --dry-run --prod
 *   node supabase/migrations/run_20261012_ac_downtime_links.js --execute --prod
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
    console.log(`Starting AC Downtime Links Migration`);
    console.log(`Environment: ${targetEnvName}`);
    console.log(`Mode:        ${isExecute ? 'EXECUTE (Commit changes)' : 'DRY RUN (Rollback)'}`);
    console.log(`====================================================`);

    const client = new pg.Client({ connectionString: dbUrl });
    try {
        await client.connect();

        const sqlFile = path.resolve(__dirname, '20261012_ac_downtime_links.sql');
        const sqlContent = fs.readFileSync(sqlFile, 'utf8');

        await client.query('BEGIN;');

        // Execute migration SQL body
        // Strip out existing outer BEGIN / COMMIT in the sql file to manage transaction cleanly
        const cleanSql = sqlContent
            .replace(/^\s*BEGIN\s*;/im, '')
            .replace(/^\s*COMMIT\s*;/im, '');

        await client.query(cleanSql);

        // Verification Checks
        console.log('\n--- Running Post-Migration Verification Checks ---');
        let allPassed = true;

        // Check 1: Record counts
        const dtCountRes = await client.query('SELECT count(*) FROM public.ac_downtime;');
        const dtTypeCountRes = await client.query('SELECT count(*) FROM public.ac_downtime_type;');
        const dtCount = parseInt(dtCountRes.rows[0].count, 10);
        const dtTypeCount = parseInt(dtTypeCountRes.rows[0].count, 10);

        if (dtCount === 130) {
            console.log(`[PASS] Check 1a: public.ac_downtime count is exactly 130.`);
        } else {
            console.error(`[FAIL] Check 1a: Expected 130 rows in public.ac_downtime, found ${dtCount}.`);
            allPassed = false;
        }

        if (dtTypeCount === 13) {
            console.log(`[PASS] Check 1b: public.ac_downtime_type count is exactly 13.`);
        } else {
            console.error(`[FAIL] Check 1b: Expected 13 rows in public.ac_downtime_type, found ${dtTypeCount}.`);
            allPassed = false;
        }

        // Check 2: Relative links in ac_downtime_type
        const bastTypeRes = await client.query("SELECT notes FROM public.ac_downtime_type WHERE name = 'Bastions';");
        const strongTypeRes = await client.query("SELECT notes FROM public.ac_downtime_type WHERE name = 'Building a Stronghold';");
        const travTypeRes = await client.query("SELECT notes FROM public.ac_downtime_type WHERE name = 'Traveling';");

        const bastNotes = bastTypeRes.rows[0]?.notes || '';
        const strongNotes = strongTypeRes.rows[0]?.notes || '';
        const travNotes = travTypeRes.rows[0]?.notes || '';

        if (bastNotes.includes('[Player Guidelines](/playersguide/appendices/bastions/)') &&
            strongNotes.includes('[Appendix B](/playersguide/appendices/bastions/)') &&
            travNotes.includes('[Player Guidelines](/playersguide/downtime/#traveling)') &&
            travNotes.includes('[Forgotten Realms: Heroes of Faerûn map](https://www.aidedd.org/atlas/faerun)')) {
            console.log(`[PASS] Check 2: Downtime category notes contain normalized relative & external links.`);
        } else {
            console.error(`[FAIL] Check 2: Downtime category notes missing expected normalized links.`);
            allPassed = false;
        }

        // Check 3: Bastion links in DT_0001, DT_0002, DT_0003, DT_0005
        const dt01Res = await client.query("SELECT description, notes_advice FROM public.ac_downtime WHERE check_id = 'DT_0001';");
        const dt02Res = await client.query("SELECT description, notes_advice FROM public.ac_downtime WHERE check_id = 'DT_0002';");
        const dt03Res = await client.query("SELECT description FROM public.ac_downtime WHERE check_id = 'DT_0003';");
        const dt05Res = await client.query("SELECT notes_advice FROM public.ac_downtime WHERE check_id = 'DT_0005';");

        if (dt01Res.rows[0]?.description.includes('[Bastions](/allowed-content/#bastions)') &&
            dt01Res.rows[0]?.description.includes('[Appendix B of the Player Guidelines](/playersguide/appendices/bastions/)') &&
            dt01Res.rows[0]?.notes_advice.includes('[Traveling](/allowed-content/#downtime)') &&
            dt02Res.rows[0]?.description.includes('[Bastions](/allowed-content/#bastions)') &&
            dt03Res.rows[0]?.description.includes('[Ravenloft: The Horrors Within](https://www.dndbeyond.com/sources/dnd/rthw)') &&
            dt05Res.rows[0]?.notes_advice.includes('[Appendix B](/playersguide/appendices/bastions/)')) {
            console.log(`[PASS] Check 3: Bastion downtime activities verified with Bastion, Appendix B, and D&D Beyond links.`);
        } else {
            console.error(`[FAIL] Check 3: Bastion downtime activities missing expected links.`);
            allPassed = false;
        }

        // Check 4: Equipment tab links in Buying / Selling / Crafting
        const eqRes = await client.query("SELECT count(*) FROM public.ac_downtime WHERE description LIKE '%[Equipment](/allowed-content/#equipment)%';");
        const eqCount = parseInt(eqRes.rows[0].count, 10);
        if (eqCount === 13) {
            console.log(`[PASS] Check 4: Exactly 13 activities verified with [Equipment](/allowed-content/#equipment) link.`);
        } else {
            console.error(`[FAIL] Check 4: Expected 13 activities with Equipment links, got ${eqCount}.`);
            allPassed = false;
        }

        // Check 5: Language tab links in Learning Languages
        const langRes = await client.query("SELECT count(*) FROM public.ac_downtime WHERE description LIKE '%[Languages](/allowed-content/#languages)%';");
        const langCount = parseInt(langRes.rows[0].count, 10);
        if (langCount === 4) {
            console.log(`[PASS] Check 5: Exactly 4 activities verified with [Languages](/allowed-content/#languages) link.`);
        } else {
            console.error(`[FAIL] Check 5: Expected 4 activities with Languages links, got ${langCount}.`);
            allPassed = false;
        }

        // Check 6: Crafting magic item Loot & Bastions links (DT_0039)
        const dt39Res = await client.query("SELECT notes_advice FROM public.ac_downtime WHERE check_id = 'DT_0039';");
        const dt39Notes = dt39Res.rows[0]?.notes_advice || '';
        if (dt39Notes.includes('[Loot](/allowed-content/#loot)') &&
            dt39Notes.includes('[Bastions](/allowed-content/#bastions)')) {
            console.log(`[PASS] Check 6: Crafting magic item (DT_0039) verified with Loot and Bastions links.`);
        } else {
            console.error(`[FAIL] Check 6: DT_0039 missing Loot or Bastions relative links.`);
            allPassed = false;
        }

        // Check 7: Ala Carte Rework 2024 games link (DT_0056)
        const dt56Res = await client.query("SELECT notes_advice FROM public.ac_downtime WHERE check_id = 'DT_0056';");
        const dt56Notes = dt56Res.rows[0]?.notes_advice || '';
        if (dt56Notes.includes('[Player Guidelines](/playersguide/appendices/2024-games/)') &&
            !dt56Notes.includes('https://hawthorneguild.github.io')) {
            console.log(`[PASS] Check 7: Ala Carte Rework (DT_0056) verified with relative 2024-games link.`);
        } else {
            console.error(`[FAIL] Check 7: DT_0056 missing or incorrect relative 2024-games link.`);
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
