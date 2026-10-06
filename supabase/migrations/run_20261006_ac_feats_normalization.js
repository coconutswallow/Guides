/**
 * Database Migration Runner: AC Feats Normalization & Staff Admin RLS
 * 
 * Usage:
 *   node supabase/migrations/run_20261006_ac_feats_normalization.js --dry-run
 *   node supabase/migrations/run_20261006_ac_feats_normalization.js --execute
 *   node supabase/migrations/run_20261006_ac_feats_normalization.js --dry-run --prod
 *   node supabase/migrations/run_20261006_ac_feats_normalization.js --execute --prod
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to load env from Guides/.env or DBSync/.env
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
        dbUrl = process.env.SOURCE_DB_URL || process.env.TARGET_DB_URL;
        targetEnvName = 'DEV';
    }
}

if (!dbUrl) {
    console.error(`Error: DB connection URL not found in environment for ${targetEnvName}`);
    process.exit(1);
}

const isExecute = process.argv.includes('--execute');
const isDryRun = process.argv.includes('--dry-run') || !isExecute;

const sqlFilePath = path.resolve(__dirname, '20261006_ac_feats_normalization.sql');
const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

async function run() {
    console.log(`Starting AC Feats migration runner [Target: ${targetEnvName}, Mode: ${isExecute ? 'EXECUTE (COMMIT)' : 'DRY-RUN (ROLLBACK)'}]...`);
    
    const client = new pg.Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log(`Connected to PostgreSQL database (${targetEnvName}) successfully.`);

        await client.query('BEGIN;');

        console.log('Executing migration SQL statements...');
        await client.query(sqlContent);
        console.log('Migration SQL executed successfully.');

        // Verification checks
        console.log('\n--- Running Verification Checklist ---');
        let allPassed = true;

        // 1. Total rows in ac_feats
        const countRes = await client.query('SELECT count(*)::int AS count FROM public.ac_feats;');
        const totalRows = countRes.rows[0].count;
        const pass1 = totalRows === 346;
        console.log(`[1] Total rows in ac_feats: ${totalRows} (Expected: 346) -> ${pass1 ? 'PASS' : 'FAIL'}`);
        if (!pass1) allPassed = false;

        // 2. check_id range and uniqueness: FEA_0001 to FEA_0346
        const checkIdRes = await client.query(`
            SELECT 
                count(*)::int AS total_checks,
                count(DISTINCT check_id)::int AS unique_checks,
                min(check_id) AS min_check,
                max(check_id) AS max_check,
                count(*) FILTER (WHERE check_id IS NULL)::int AS null_checks
            FROM public.ac_feats;
        `);
        const { total_checks, unique_checks, min_check, max_check, null_checks } = checkIdRes.rows[0];
        const pass2 = total_checks === 346 && unique_checks === 346 && min_check === 'FEA_0001' && max_check === 'FEA_0346' && null_checks === 0;
        console.log(`[2] check_id range & uniqueness: [${min_check} .. ${max_check}], unique=${unique_checks}, nulls=${null_checks} -> ${pass2 ? 'PASS' : 'FAIL'}`);
        if (!pass2) allPassed = false;

        // 3. Ruleset breakdown: 141 (2014) and 205 (2024)
        const rulesetRes = await client.query(`
            SELECT ruleset, count(*)::int 
            FROM public.ac_feats 
            GROUP BY ruleset 
            ORDER BY ruleset;
        `);
        console.log('[3] Ruleset breakdown:', rulesetRes.rows);
        const rMap = Object.fromEntries(rulesetRes.rows.map(r => [r.ruleset, r.count]));
        const pass3 = rMap['2014'] === 141 && rMap['2024'] === 205;
        console.log(`    Ruleset counts valid (141 2014, 205 2024) -> ${pass3 ? 'PASS' : 'FAIL'}`);
        if (!pass3) allPassed = false;

        // 4. Duplicate (name, ruleset) check
        const dupRes = await client.query(`
            SELECT name, ruleset, count(*)::int
            FROM public.ac_feats
            GROUP BY name, ruleset
            HAVING count(*) > 1;
        `);
        const pass4 = dupRes.rows.length === 0;
        console.log(`[4] Duplicate (name, ruleset) pairs: ${dupRes.rows.length} -> ${pass4 ? 'PASS' : 'FAIL'}`);
        if (!pass4) allPassed = false;

        // 5. Category breakdown
        const catRes = await client.query(`
            SELECT category, count(*)::int 
            FROM public.ac_feats 
            GROUP BY category 
            ORDER BY count(*) DESC;
        `);
        console.log('[5] Category counts:', catRes.rows);
        const nullCatRes = await client.query("SELECT count(*)::int AS count FROM public.ac_feats WHERE category IS NULL OR category = '—';");
        const pass5 = nullCatRes.rows[0].count === 0;
        console.log(`    Uncategorized ('—' or NULL) count: ${nullCatRes.rows[0].count} -> ${pass5 ? 'PASS' : 'FAIL'}`);
        if (!pass5) allPassed = false;

        // 6. Foreign key validity against ac_sources
        const fkRes = await client.query(`
            SELECT count(*)::int AS orphans
            FROM public.ac_feats f
            LEFT JOIN public.ac_sources s ON f.source = s.source_key
            WHERE s.source_key IS NULL;
        `);
        const pass6 = fkRes.rows[0].orphans === 0;
        console.log(`[6] Valid foreign keys to ac_sources: orphans=${fkRes.rows[0].orphans} -> ${pass6 ? 'PASS' : 'FAIL'}`);
        if (!pass6) allPassed = false;

        // 7. Fractional indexing display_order data type
        const typeRes = await client.query(`
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'ac_feats' AND column_name = 'display_order';
        `);
        const pass7 = typeRes.rows[0]?.data_type === 'double precision';
        console.log(`[7] Fractional indexing data type: ${typeRes.rows[0]?.data_type} -> ${pass7 ? 'PASS' : 'FAIL'}`);
        if (!pass7) allPassed = false;

        // 8. RLS Policies
        const rlsRes = await client.query(`
            SELECT polname FROM pg_policy WHERE polrelid = 'public.ac_feats'::regclass;
        `);
        const polNames = rlsRes.rows.map(r => r.polname);
        const hasAdminPolicy = polNames.includes('Admins and Engineers can manage ac_feats');
        const pass8 = hasAdminPolicy;
        console.log(`[8] Staff Admin RLS Active (${polNames.length} policies): -> ${pass8 ? 'PASS' : 'FAIL'}`);
        if (!pass8) allPassed = false;

        console.log('--------------------------------------');

        if (!allPassed) {
            throw new Error('One or more verification checks failed! Rolling back.');
        }

        if (isExecute) {
            await client.query('COMMIT;');
            console.log(`\n>>> MIGRATION COMMITTED TO ${targetEnvName} DATABASE SUCCESSFULLY. <<<`);
        } else {
            await client.query('ROLLBACK;');
            console.log(`\nDRY-RUN COMPLETE: All changes verified and ROLLED BACK cleanly.`);
            console.log(`To apply permanently, run with: node supabase/migrations/run_20261006_ac_feats_normalization.js --execute${isProd ? ' --prod' : ''}`);
        }

    } catch (err) {
        await client.query('ROLLBACK;').catch(() => {});
        console.error('\n❌ Migration Failed:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();
