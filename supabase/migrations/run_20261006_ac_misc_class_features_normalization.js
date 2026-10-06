/**
 * Database Migration Runner: AC Misc Class Features Normalization & Staff Admin RLS
 * Target Domain: Fighting Styles, Artificer Infusions, Eldritch Invocations
 * 
 * Usage:
 *   node supabase/migrations/run_20261006_ac_misc_class_features_normalization.js --dry-run
 *   node supabase/migrations/run_20261006_ac_misc_class_features_normalization.js --execute
 *   node supabase/migrations/run_20261006_ac_misc_class_features_normalization.js --dry-run --prod
 *   node supabase/migrations/run_20261006_ac_misc_class_features_normalization.js --execute --prod
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

const sqlFilePath = path.resolve(__dirname, '20261006_ac_misc_class_features_normalization.sql');
const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

async function run() {
    console.log(`Starting AC Misc Class Features migration runner [Target: ${targetEnvName}, Mode: ${isExecute ? 'EXECUTE (COMMIT)' : 'DRY-RUN (ROLLBACK)'}]...`);
    
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

        // 1. Total rows in ac_fighting_styles (expecting 17)
        const fsCount = await client.query('SELECT count(*)::int AS count FROM public.ac_fighting_styles;');
        const fsTotal = fsCount.rows[0].count;
        if (fsTotal === 17) {
            console.log(`[PASS] ac_fighting_styles total rows: ${fsTotal} (expected 17)`);
        } else {
            console.error(`[FAIL] ac_fighting_styles total rows: ${fsTotal} (expected 17)`);
            allPassed = false;
        }

        // 2. Total rows in ac_artificer_infusions (expecting 16)
        const aiCount = await client.query('SELECT count(*)::int AS count FROM public.ac_artificer_infusions;');
        const aiTotal = aiCount.rows[0].count;
        if (aiTotal === 16) {
            console.log(`[PASS] ac_artificer_infusions total rows: ${aiTotal} (expected 16)`);
        } else {
            console.error(`[FAIL] ac_artificer_infusions total rows: ${aiTotal} (expected 16)`);
            allPassed = false;
        }

        // 3. Total rows in ac_eldritch_invocations (expecting 86)
        const eiCount = await client.query('SELECT count(*)::int AS count FROM public.ac_eldritch_invocations;');
        const eiTotal = eiCount.rows[0].count;
        if (eiTotal === 86) {
            console.log(`[PASS] ac_eldritch_invocations total rows: ${eiTotal} (expected 86)`);
        } else {
            console.error(`[FAIL] ac_eldritch_invocations total rows: ${eiTotal} (expected 86)`);
            allPassed = false;
        }

        // 4. Check_ID ranges and null checks
        const fsCheck = await client.query(`
            SELECT count(*)::int as total,
                   count(check_id)::int as non_null,
                   count(DISTINCT check_id)::int as distinct_checks,
                   min(check_id) as min_check,
                   max(check_id) as max_check
            FROM public.ac_fighting_styles;
        `);
        if (fsCheck.rows[0].non_null === 17 && fsCheck.rows[0].distinct_checks === 17 &&
            fsCheck.rows[0].min_check === 'MSC_0001' && fsCheck.rows[0].max_check === 'MSC_0017') {
            console.log(`[PASS] ac_fighting_styles Check_IDs: MSC_0001 to MSC_0017 (17 distinct, 0 nulls)`);
        } else {
            console.error(`[FAIL] ac_fighting_styles Check_ID audit failed:`, fsCheck.rows[0]);
            allPassed = false;
        }

        const aiCheck = await client.query(`
            SELECT count(*)::int as total,
                   count(check_id)::int as non_null,
                   count(DISTINCT check_id)::int as distinct_checks,
                   min(check_id) as min_check,
                   max(check_id) as max_check
            FROM public.ac_artificer_infusions;
        `);
        if (aiCheck.rows[0].non_null === 16 && aiCheck.rows[0].distinct_checks === 16 &&
            aiCheck.rows[0].min_check === 'MSC_0018' && aiCheck.rows[0].max_check === 'MSC_0033') {
            console.log(`[PASS] ac_artificer_infusions Check_IDs: MSC_0018 to MSC_0033 (16 distinct, 0 nulls)`);
        } else {
            console.error(`[FAIL] ac_artificer_infusions Check_ID audit failed:`, aiCheck.rows[0]);
            allPassed = false;
        }

        const eiCheck = await client.query(`
            SELECT count(*)::int as total,
                   count(check_id)::int as non_null,
                   count(DISTINCT check_id)::int as distinct_checks,
                   min(check_id) as min_check,
                   max(check_id) as max_check
            FROM public.ac_eldritch_invocations;
        `);
        if (eiCheck.rows[0].non_null === 86 && eiCheck.rows[0].distinct_checks === 86 &&
            eiCheck.rows[0].min_check === 'MSC_0034' && eiCheck.rows[0].max_check === 'MSC_0119') {
            console.log(`[PASS] ac_eldritch_invocations Check_IDs: MSC_0034 to MSC_0119 (86 distinct, 0 nulls)`);
        } else {
            console.error(`[FAIL] ac_eldritch_invocations Check_ID audit failed:`, eiCheck.rows[0]);
            allPassed = false;
        }

        // 5. Ruleset breakdowns
        const fsRules = await client.query(`SELECT ruleset, count(*)::int AS count FROM public.ac_fighting_styles GROUP BY ruleset ORDER BY ruleset;`);
        console.log(`[INFO] ac_fighting_styles rulesets: ${fsRules.rows.map(r => `${r.ruleset}: ${r.count}`).join(', ')}`);

        const aiRules = await client.query(`SELECT ruleset, count(*)::int AS count FROM public.ac_artificer_infusions GROUP BY ruleset ORDER BY ruleset;`);
        console.log(`[INFO] ac_artificer_infusions rulesets: ${aiRules.rows.map(r => `${r.ruleset}: ${r.count}`).join(', ')}`);

        const eiRules = await client.query(`SELECT ruleset, count(*)::int AS count FROM public.ac_eldritch_invocations GROUP BY ruleset ORDER BY ruleset;`);
        console.log(`[INFO] ac_eldritch_invocations rulesets: ${eiRules.rows.map(r => `${r.ruleset}: ${r.count}`).join(', ')}`);
        const ei2014 = eiRules.rows.find(r => r.ruleset === '2014')?.count || 0;
        const ei2024 = eiRules.rows.find(r => r.ruleset === '2024')?.count || 0;
        if (ei2014 === 58 && ei2024 === 28) {
            console.log(`[PASS] ac_eldritch_invocations ruleset parity: 58 (2014) and 28 (2024)`);
        } else {
            console.error(`[FAIL] ac_eldritch_invocations ruleset mismatch: 2014=${ei2014} (exp 58), 2024=${ei2024} (exp 28)`);
            allPassed = false;
        }

        // 6. Name + Ruleset uniqueness
        const fsDups = await client.query(`SELECT name, ruleset, count(*) FROM public.ac_fighting_styles GROUP BY name, ruleset HAVING count(*) > 1;`);
        const aiDups = await client.query(`SELECT name, ruleset, count(*) FROM public.ac_artificer_infusions GROUP BY name, ruleset HAVING count(*) > 1;`);
        const eiDups = await client.query(`SELECT name, ruleset, count(*) FROM public.ac_eldritch_invocations GROUP BY name, ruleset HAVING count(*) > 1;`);
        if (fsDups.rows.length === 0 && aiDups.rows.length === 0 && eiDups.rows.length === 0) {
            console.log(`[PASS] (name, ruleset) uniqueness: 0 duplicate pairs across all 3 tables`);
        } else {
            console.error(`[FAIL] Found duplicate (name, ruleset) pairs!`, { fs: fsDups.rows, ai: aiDups.rows, ei: eiDups.rows });
            allPassed = false;
        }

        // 7. Foreign key source integrity
        const orphanFs = await client.query(`SELECT f.source FROM public.ac_fighting_styles f LEFT JOIN public.ac_sources s ON f.source = s.source_key WHERE s.source_key IS NULL;`);
        const orphanAi = await client.query(`SELECT a.source FROM public.ac_artificer_infusions a LEFT JOIN public.ac_sources s ON a.source = s.source_key WHERE s.source_key IS NULL;`);
        const orphanEi = await client.query(`SELECT e.source FROM public.ac_eldritch_invocations e LEFT JOIN public.ac_sources s ON e.source = s.source_key WHERE s.source_key IS NULL;`);
        if (orphanFs.rows.length === 0 && orphanAi.rows.length === 0 && orphanEi.rows.length === 0) {
            console.log(`[PASS] Foreign key source integrity: 0 orphan source references across all 3 tables`);
        } else {
            console.error(`[FAIL] Orphan source keys detected!`, { fs: orphanFs.rows, ai: orphanAi.rows, ei: orphanEi.rows });
            allPassed = false;
        }

        // 8. RLS policy verification
        const rlsRes = await client.query(`
            SELECT tablename, policyname 
            FROM pg_policies 
            WHERE schemaname = 'public' AND tablename IN ('ac_fighting_styles', 'ac_artificer_infusions', 'ac_eldritch_invocations')
            ORDER BY tablename, policyname;
        `);
        console.log(`[INFO] Active RLS policies found: ${rlsRes.rows.length}`);
        const expectedTables = ['ac_fighting_styles', 'ac_artificer_infusions', 'ac_eldritch_invocations'];
        for (const tbl of expectedTables) {
            const tablePolicies = rlsRes.rows.filter(r => r.tablename === tbl);
            const adminPolicy = tablePolicies.find(p => p.policyname.includes('Admins and Engineers'));
            const publicPolicy = tablePolicies.find(p => p.policyname.includes('Allow public read'));
            const servicePolicy = tablePolicies.find(p => p.policyname.includes('Allow service_role'));
            if (adminPolicy && publicPolicy && servicePolicy) {
                console.log(`[PASS] RLS policies fully configured on ${tbl}`);
            } else {
                console.error(`[FAIL] Missing RLS policies on ${tbl}:`, tablePolicies);
                allPassed = false;
            }
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
