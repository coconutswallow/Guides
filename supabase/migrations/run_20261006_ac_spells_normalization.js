/**
 * Database Migration Runner: AC Spells Normalization & Staff Admin RLS
 * Target Table: public.ac_spells
 * 
 * Usage:
 *   node supabase/migrations/run_20261006_ac_spells_normalization.js --dry-run
 *   node supabase/migrations/run_20261006_ac_spells_normalization.js --execute
 *   node supabase/migrations/run_20261006_ac_spells_normalization.js --dry-run --prod
 *   node supabase/migrations/run_20261006_ac_spells_normalization.js --execute --prod
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

const sqlFilePath = path.resolve(__dirname, '20261006_ac_spells_normalization.sql');
const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

async function run() {
    console.log(`Starting AC Spells migration runner [Target: ${targetEnvName}, Mode: ${isExecute ? 'EXECUTE (COMMIT)' : 'DRY-RUN (ROLLBACK)'}]...`);
    
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

        // 1. Total rows in ac_spells (expecting 20)
        const countRes = await client.query('SELECT count(*)::int AS count FROM public.ac_spells;');
        const totalRows = countRes.rows[0].count;
        if (totalRows === 20) {
            console.log(`[PASS] ac_spells total rows: ${totalRows} (expected 20)`);
        } else {
            console.error(`[FAIL] ac_spells total rows: ${totalRows} (expected 20)`);
            allPassed = false;
        }

        // 2. Check_ID ranges and null checks (SPL_0001 to SPL_0020)
        const checkRes = await client.query(`
            SELECT count(*)::int as total,
                   count(check_id)::int as non_null,
                   count(DISTINCT check_id)::int as distinct_checks,
                   min(check_id) as min_check,
                   max(check_id) as max_check
            FROM public.ac_spells;
        `);
        const cRow = checkRes.rows[0];
        if (cRow.non_null === 20 && cRow.distinct_checks === 20 &&
            cRow.min_check === 'SPL_0001' && cRow.max_check === 'SPL_0020') {
            console.log(`[PASS] Check_IDs: SPL_0001 to SPL_0020 (20 distinct, 0 nulls)`);
        } else {
            console.error(`[FAIL] Check_ID audit failed:`, cRow);
            allPassed = false;
        }

        // 3. Ruleset breakdowns (16 in 2014, 4 in 2024)
        const rulesRes = await client.query(`
            SELECT ruleset, count(*)::int AS count 
            FROM public.ac_spells 
            GROUP BY ruleset 
            ORDER BY ruleset;
        `);
        console.log(`[INFO] ac_spells rulesets: ${rulesRes.rows.map(r => `${r.ruleset}: ${r.count}`).join(', ')}`);
        const r2014 = rulesRes.rows.find(r => r.ruleset === '2014')?.count || 0;
        const r2024 = rulesRes.rows.find(r => r.ruleset === '2024')?.count || 0;
        if (r2014 === 16 && r2024 === 4) {
            console.log(`[PASS] Ruleset parity: 16 (2014) and 4 (2024)`);
        } else {
            console.error(`[FAIL] Ruleset mismatch: 2014=${r2014} (exp 16), 2024=${r2024} (exp 4)`);
            allPassed = false;
        }

        // 4. Name + Ruleset uniqueness
        const dupsRes = await client.query(`
            SELECT name, ruleset, count(*) 
            FROM public.ac_spells 
            GROUP BY name, ruleset 
            HAVING count(*) > 1;
        `);
        if (dupsRes.rows.length === 0) {
            console.log(`[PASS] (name, ruleset) uniqueness: 0 duplicate pairs`);
        } else {
            console.error(`[FAIL] Found duplicate (name, ruleset) pairs:`, dupsRes.rows);
            allPassed = false;
        }

        // 5. Foreign key source integrity
        const orphanRes = await client.query(`
            SELECT s.source 
            FROM public.ac_spells s 
            LEFT JOIN public.ac_sources src ON s.source = src.source_key 
            WHERE src.source_key IS NULL;
        `);
        if (orphanRes.rows.length === 0) {
            console.log(`[PASS] Foreign key source integrity: 0 orphan source references`);
        } else {
            console.error(`[FAIL] Orphan source keys detected:`, orphanRes.rows);
            allPassed = false;
        }

        // 6. Display order sequence
        const orderRes = await client.query(`
            SELECT min(display_order) as min_order, 
                   max(display_order) as max_order, 
                   count(DISTINCT display_order)::int as distinct_orders
            FROM public.ac_spells;
        `);
        const oRow = orderRes.rows[0];
        if (Number(oRow.min_order) === 1.0 && Number(oRow.max_order) === 20.0 && oRow.distinct_orders === 20) {
            console.log(`[PASS] Display order sequence: 1.0 to 20.0 (20 distinct values)`);
        } else {
            console.error(`[FAIL] Display order check failed:`, oRow);
            allPassed = false;
        }

        // 7. RLS policy verification
        const rlsRes = await client.query(`
            SELECT tablename, policyname 
            FROM pg_policies 
            WHERE schemaname = 'public' AND tablename = 'ac_spells'
            ORDER BY policyname;
        `);
        console.log(`[INFO] Active RLS policies on ac_spells: ${rlsRes.rows.length}`);
        const adminPolicy = rlsRes.rows.find(p => p.policyname.includes('Admins and Engineers'));
        const publicPolicy = rlsRes.rows.find(p => p.policyname.includes('Allow public read'));
        const servicePolicy = rlsRes.rows.find(p => p.policyname.includes('Allow service_role'));
        if (adminPolicy && publicPolicy && servicePolicy) {
            console.log(`[PASS] RLS policies fully configured (Public read, Service role, Admins/Engineers edit)`);
        } else {
            console.error(`[FAIL] Missing RLS policies on ac_spells:`, rlsRes.rows);
            allPassed = false;
        }

        // 8. Spot check SPL_0019 (Arcana Unleashed)
        const auCheck = await client.query(`
            SELECT id, check_id, name, ruleset, source, display_order 
            FROM public.ac_spells 
            WHERE check_id = 'SPL_0019';
        `);
        if (auCheck.rows.length === 1 && auCheck.rows[0].source === 'AU' && auCheck.rows[0].ruleset === '2024') {
            console.log(`[PASS] SPL_0019 spot check verified: ${auCheck.rows[0].name} (AU / 2024 / order ${auCheck.rows[0].display_order})`);
        } else {
            console.error(`[FAIL] SPL_0019 spot check failed:`, auCheck.rows);
            allPassed = false;
        }

        if (!allPassed) {
            throw new Error('One or more verification checks failed.');
        }

        if (isExecute) {
            await client.query('COMMIT;');
            console.log(`\n>>> [SUCCESS] Migration COMMITTED to ${targetEnvName} database. <<<`);
        } else {
            await client.query('ROLLBACK;');
            console.log(`\n>>> [SUCCESS] DRY-RUN completed cleanly. All changes ROLLED BACK from ${targetEnvName}. <<<`);
        }
    } catch (err) {
        await client.query('ROLLBACK;').catch(() => {});
        console.error(`\n>>> [ERROR] Migration failed on ${targetEnvName}:`, err.message || err);
        process.exitCode = 1;
    } finally {
        await client.end();
        console.log('Database connection closed.');
    }
}

run();
