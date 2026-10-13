/**
 * Database Migration Runner: AC Spells Links Normalization
 * Target Table: public.ac_spells
 *
 * Usage:
 *   node supabase/migrations/run_20261012_ac_spells_links.js --dry-run
 *   node supabase/migrations/run_20261012_ac_spells_links.js --execute
 *   node supabase/migrations/run_20261012_ac_spells_links.js --dry-run --prod
 *   node supabase/migrations/run_20261012_ac_spells_links.js --execute --prod
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
    console.log(`Starting AC Spells Links Migration`);
    console.log(`Environment: ${targetEnvName}`);
    console.log(`Mode:        ${isExecute ? 'EXECUTE (Commit changes)' : 'DRY RUN (Rollback)'}`);
    console.log(`====================================================`);

    const client = new pg.Client({ connectionString: dbUrl });
    try {
        await client.connect();

        const sqlFile = path.resolve(__dirname, '20261012_ac_spells_links.sql');
        const sqlContent = fs.readFileSync(sqlFile, 'utf8');

        await client.query('BEGIN;');

        const cleanSql = sqlContent
            .replace(/^\s*BEGIN\s*;/im, '')
            .replace(/^\s*COMMIT\s*;/im, '');

        await client.query(cleanSql);

        // Verification Checks
        console.log('\n--- Running Post-Migration Verification Checks ---');
        let allPassed = true;

        // Check 1: Record count in public.ac_spells
        const countRes = await client.query('SELECT count(*) FROM public.ac_spells;');
        const totalCount = parseInt(countRes.rows[0].count, 10);
        if (totalCount === 20) {
            console.log(`[PASS] Check 1: Record count verified (20 spells preserved).`);
        } else {
            console.error(`[FAIL] Check 1: Expected 20 spells, found ${totalCount}.`);
            allPassed = false;
        }

        // Check 2: Check_ID range check (SPL_0001 .. SPL_0020)
        const rangeRes = await client.query(`
            SELECT min(check_id) as min_id, max(check_id) as max_id, count(DISTINCT check_id) as distinct_ids
            FROM public.ac_spells;
        `);
        const r = rangeRes.rows[0];
        if (r.min_id === 'SPL_0001' && r.max_id === 'SPL_0020' && parseInt(r.distinct_ids, 10) === 20) {
            console.log(`[PASS] Check 2: Check_ID range verified: SPL_0001 through SPL_0020 (20 distinct IDs).`);
        } else {
            console.error(`[FAIL] Check 2: Unexpected check_id range:`, r);
            allPassed = false;
        }

        // Check 3: Hawthorne Arcana link in SPL_0007
        const res7 = await client.query("SELECT notes FROM public.ac_spells WHERE check_id = 'SPL_0007';");
        const notes7 = res7.rows[0]?.notes || '';
        const arcanaLink = '[Hawthorne Arcana](https://drive.google.com/file/d/1yoinFa31Rhq__unHxMxCSfMq7QY5ARYC/view)';
        if (notes7.includes(arcanaLink)) {
            console.log(`[PASS] Check 3: SPL_0007 verified with markdown external link to Hawthorne Arcana.`);
        } else {
            console.error(`[FAIL] Check 3: SPL_0007 notes missing expected link: ${notes7}`);
            allPassed = false;
        }

        // Check 4: Equipment link in SPL_0012
        const res12 = await client.query("SELECT rage_advice FROM public.ac_spells WHERE check_id = 'SPL_0012';");
        const rage12 = res12.rows[0]?.rage_advice || '';
        const eqLink = 'listed in [Equipment](/allowed-content/#equipment)';
        if (rage12.includes(eqLink)) {
            console.log(`[PASS] Check 4: SPL_0012 verified with relative website link to [Equipment](/allowed-content/#equipment).`);
        } else {
            console.error(`[FAIL] Check 4: SPL_0012 rage_advice missing expected link: ${rage12}`);
            allPassed = false;
        }

        // Check 5: PHB 2024 Spell Changes link in SPL_0017
        const res17 = await client.query("SELECT notes FROM public.ac_spells WHERE check_id = 'SPL_0017';");
        const notes17 = res17.rows[0]?.notes || '';
        const phb24Link = '[PHB 2024 Spell Changes](https://docs.google.com/spreadsheets/d/1tKfU_-0uIi5SvnDXDdLw09WNw8X0akidCoZar1MeOL4/edit?usp=sharing)';
        if (notes17.includes(phb24Link)) {
            console.log(`[PASS] Check 5: SPL_0017 verified with markdown external link to PHB 2024 Spell Changes spreadsheet.`);
        } else {
            console.error(`[FAIL] Check 5: SPL_0017 notes missing expected link: ${notes17}`);
            allPassed = false;
        }

        // Check 6: Allowed Content (Spells) link in SPL_0018
        const res18 = await client.query("SELECT notes FROM public.ac_spells WHERE check_id = 'SPL_0018';");
        const notes18 = res18.rows[0]?.notes || '';
        const spellsLink = '[Allowed Content (Spells)](/allowed-content/#spells)';
        if (notes18.includes(spellsLink)) {
            console.log(`[PASS] Check 6: SPL_0018 verified with relative website link to [Allowed Content (Spells)](/allowed-content/#spells).`);
        } else {
            console.error(`[FAIL] Check 6: SPL_0018 notes missing expected link: ${notes18}`);
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
