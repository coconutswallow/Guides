/**
 * Database Migration Runner: AC Bastion Normalization & Staff Admin RLS
 * Target Tables: public.ac_bastion_type, public.ac_bastion
 *
 * Usage:
 *   node supabase/migrations/run_20261009_ac_bastion_normalization.js --dry-run
 *   node supabase/migrations/run_20261009_ac_bastion_normalization.js --execute
 *   node supabase/migrations/run_20261009_ac_bastion_normalization.js --dry-run --prod
 *   node supabase/migrations/run_20261009_ac_bastion_normalization.js --execute --prod
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

const sqlFilePath = path.resolve(__dirname, '20261009_ac_bastion_normalization.sql');
const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

async function run() {
    console.log(`Starting AC Bastion migration runner [Target: ${targetEnvName}, Mode: ${isExecute ? 'EXECUTE (COMMIT)' : 'DRY-RUN (ROLLBACK)'}]...`);

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

        // -----------------------------------------------------------------------
        // Verification Checks
        // -----------------------------------------------------------------------
        console.log('\n--- Running Verification Checklist ---');
        let allPassed = true;

        // 1. Total rows in ac_bastion_type (expecting 4)
        const typeCountRes = await client.query('SELECT count(*)::int AS count FROM public.ac_bastion_type;');
        const totalTypes = typeCountRes.rows[0].count;
        if (totalTypes === 4) {
            console.log(`[PASS] ac_bastion_type total rows: ${totalTypes} (expected 4)`);
        } else {
            console.error(`[FAIL] ac_bastion_type total rows: ${totalTypes} (expected 4)`);
            allPassed = false;
        }

        // 2. ac_bastion_type check_ids: BASC_0001..BASC_0004
        const typeCheckRes = await client.query(`
            SELECT count(*)::int as total,
                   count(check_id)::int as non_null,
                   count(DISTINCT check_id)::int as distinct_checks,
                   min(check_id) as min_check,
                   max(check_id) as max_check
            FROM public.ac_bastion_type;
        `);
        const tcRow = typeCheckRes.rows[0];
        if (tcRow.non_null === 4 && tcRow.distinct_checks === 4 &&
            tcRow.min_check === 'BASC_0001' && tcRow.max_check === 'BASC_0004') {
            console.log(`[PASS] ac_bastion_type check_ids: BASC_0001 to BASC_0004 (4 distinct, 0 nulls)`);
        } else {
            console.error(`[FAIL] ac_bastion_type check_id audit failed:`, tcRow);
            allPassed = false;
        }

        // 3. Total rows in ac_bastion (expecting 66)
        const countRes = await client.query('SELECT count(*)::int AS count FROM public.ac_bastion;');
        const totalBastions = countRes.rows[0].count;
        if (totalBastions === 66) {
            console.log(`[PASS] ac_bastion total rows: ${totalBastions} (expected 66)`);
        } else {
            console.error(`[FAIL] ac_bastion total rows: ${totalBastions} (expected 66)`);
            allPassed = false;
        }

        // 4. Check_ID audit: BAS_0001..BAS_0066
        const checkRes = await client.query(`
            SELECT count(*)::int as total,
                   count(check_id)::int as non_null,
                   count(DISTINCT check_id)::int as distinct_checks,
                   min(check_id) as min_check,
                   max(check_id) as max_check
            FROM public.ac_bastion;
        `);
        const cRow = checkRes.rows[0];
        if (cRow.non_null === 66 && cRow.distinct_checks === 66 &&
            cRow.min_check === 'BAS_0001' && cRow.max_check === 'BAS_0066') {
            console.log(`[PASS] Check_IDs: BAS_0001 to BAS_0066 (66 distinct, 0 nulls)`);
        } else {
            console.error(`[FAIL] Check_ID audit failed:`, cRow);
            allPassed = false;
        }

        // 5. Foreign Key integrity: bastion_type_id
        const fkRes = await client.query(`
            SELECT count(*)::int as count
            FROM public.ac_bastion b
            LEFT JOIN public.ac_bastion_type t ON b.bastion_type_id = t.id
            WHERE t.id IS NULL;
        `);
        if (fkRes.rows[0].count === 0) {
            console.log(`[PASS] Bastion type FK integrity: 0 orphan records`);
        } else {
            console.error(`[FAIL] Orphan bastion_type_id found: ${fkRes.rows[0].count}`);
            allPassed = false;
        }

        // 6. Category breakdown
        const catRes = await client.query(`
            SELECT t.name, count(b.id)::int AS count
            FROM public.ac_bastion_type t
            LEFT JOIN public.ac_bastion b ON b.bastion_type_id = t.id
            GROUP BY t.id, t.name, t.display_order
            ORDER BY t.display_order;
        `);
        console.log(`[INFO] Bastion facility counts by type:`);
        for (const r of catRes.rows) {
            console.log(`  - ${r.name}: ${r.count}`);
        }

        // 7. Source array integrity against ac_sources
        const srcIntegrityRes = await client.query(`
            SELECT count(*)::int as invalid_count
            FROM public.ac_bastion
            WHERE NOT (source <@ (SELECT array_agg(source_key) FROM public.ac_sources));
        `);
        if (srcIntegrityRes.rows[0].invalid_count === 0) {
            console.log(`[PASS] Source array integrity: all source elements link to valid ac_sources(source_key)`);
        } else {
            console.error(`[FAIL] Invalid source keys detected in ac_bastion: ${srcIntegrityRes.rows[0].invalid_count}`);
            allPassed = false;
        }

        // 8. Multi-source entries count
        const multiSrcRes = await client.query(`
            SELECT count(*)::int as count
            FROM public.ac_bastion
            WHERE array_length(source, 1) > 1;
        `);
        console.log(`[INFO] Multi-source bastion facilities: ${multiSrcRes.rows[0].count} records`);

        // 9. Display order validation
        const orderRes = await client.query(`
            SELECT min(display_order) as min_order,
                   max(display_order) as max_order,
                   count(DISTINCT display_order)::int as distinct_orders
            FROM public.ac_bastion;
        `);
        const oRow = orderRes.rows[0];
        if (oRow.distinct_orders === 66 && parseFloat(oRow.min_order) === 1.0 && parseFloat(oRow.max_order) === 66.0) {
            console.log(`[PASS] Display orders: 1.0 to 66.0 (66 distinct, fractional indexing ready)`);
        } else {
            console.error(`[FAIL] Display order sequence mismatch:`, oRow);
            allPassed = false;
        }

        // 10. RLS policies verification
        const rlsRes = await client.query(`
            SELECT tablename, policyname
            FROM pg_policies
            WHERE schemaname = 'public' AND tablename IN ('ac_bastion_type', 'ac_bastion')
            ORDER BY tablename, policyname;
        `);
        console.log(`[INFO] Active RLS policies (${rlsRes.rows.length}):`);
        for (const p of rlsRes.rows) {
            console.log(`  - [${p.tablename}] ${p.policyname}`);
        }
        if (rlsRes.rows.length >= 6) {
            console.log(`[PASS] RLS policies applied (read, service_role, and Admin/Engineer write policies active)`);
        } else {
            console.error(`[FAIL] Expected at least 6 RLS policies, found ${rlsRes.rows.length}`);
            allPassed = false;
        }

        // 11. HHB source present in ac_sources
        const hhbRes = await client.query(`
            SELECT count(*)::int as count FROM public.ac_sources WHERE source_key = 'HHB';
        `);
        if (hhbRes.rows[0].count > 0) {
            console.log(`[PASS] HHB source key exists in ac_sources`);
        } else {
            console.error(`[FAIL] HHB source key missing from ac_sources`);
            allPassed = false;
        }

        if (allPassed) {
            console.log(`\nAll verification checks PASSED successfully!`);
        } else {
            console.error(`\nOne or more verification checks FAILED!`);
        }

        if (isExecute && allPassed) {
            await client.query('COMMIT;');
            console.log(`\n[SUCCESS] Migration committed to ${targetEnvName} database.`);
        } else {
            await client.query('ROLLBACK;');
            console.log(`\n[DRY-RUN] Transaction rolled back. No changes applied to ${targetEnvName} database.`);
        }

    } catch (err) {
        try {
            await client.query('ROLLBACK;');
        } catch (_) {}
        console.error(`\n[ERROR] Migration failed:`, err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();
