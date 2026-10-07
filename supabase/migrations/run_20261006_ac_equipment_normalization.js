/**
 * Database Migration Runner: AC Equipment Normalization & Staff Admin RLS
 * Target Tables: public.ac_equip_type, public.ac_equipment
 * 
 * Usage:
 *   node supabase/migrations/run_20261006_ac_equipment_normalization.js --dry-run
 *   node supabase/migrations/run_20261006_ac_equipment_normalization.js --execute
 *   node supabase/migrations/run_20261006_ac_equipment_normalization.js --dry-run --prod
 *   node supabase/migrations/run_20261006_ac_equipment_normalization.js --execute --prod
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

const sqlFilePath = path.resolve(__dirname, '20261006_ac_equipment_normalization.sql');
const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

async function run() {
    console.log(`Starting AC Equipment migration runner [Target: ${targetEnvName}, Mode: ${isExecute ? 'EXECUTE (COMMIT)' : 'DRY-RUN (ROLLBACK)'}]...`);
    
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

        // 1. Total rows in ac_equip_type (expecting 13)
        const typeCountRes = await client.query('SELECT count(*)::int AS count FROM public.ac_equip_type;');
        const totalTypes = typeCountRes.rows[0].count;
        if (totalTypes === 13) {
            console.log(`[PASS] ac_equip_type total rows: ${totalTypes} (expected 13)`);
        } else {
            console.error(`[FAIL] ac_equip_type total rows: ${totalTypes} (expected 13)`);
            allPassed = false;
        }

        // 2. Compatibility view check
        const viewRes = await client.query('SELECT count(*)::int AS count FROM public.ac_equipment_categories;');
        if (viewRes.rows[0].count === 13) {
            console.log(`[PASS] Compatibility view ac_equipment_categories returns: 13 rows`);
        } else {
            console.error(`[FAIL] Compatibility view returned: ${viewRes.rows[0].count} rows (expected 13)`);
            allPassed = false;
        }

        // 3. Total rows in ac_equipment (expecting 490)
        const countRes = await client.query('SELECT count(*)::int AS count FROM public.ac_equipment;');
        const totalEquipment = countRes.rows[0].count;
        if (totalEquipment === 490) {
            console.log(`[PASS] ac_equipment total rows: ${totalEquipment} (expected 490)`);
        } else {
            console.error(`[FAIL] ac_equipment total rows: ${totalEquipment} (expected 490)`);
            allPassed = false;
        }

        // 4. Check_ID audit: non-null, distinct, range
        const checkRes = await client.query(`
            SELECT count(*)::int as total,
                   count(check_id)::int as non_null,
                   count(DISTINCT check_id)::int as distinct_checks,
                   min(check_id) as min_check,
                   max(check_id) as max_check
            FROM public.ac_equipment;
        `);
        const cRow = checkRes.rows[0];
        if (cRow.non_null === 490 && cRow.distinct_checks === 490 &&
            cRow.min_check === 'EQP_0001' && cRow.max_check === 'EQP_0495') {
            console.log(`[PASS] Check_IDs: EQP_0001 to EQP_0495 (490 distinct, 0 nulls, Wheat at EQP_0495)`);
        } else {
            console.error(`[FAIL] Check_ID audit failed:`, cRow);
            allPassed = false;
        }

        // 5. Foreign Key integrity: equip_type_id and category_id
        const fkRes = await client.query(`
            SELECT count(*)::int as count
            FROM public.ac_equipment e
            LEFT JOIN public.ac_equip_type t ON e.equip_type_id = t.id
            WHERE t.id IS NULL;
        `);
        if (fkRes.rows[0].count === 0) {
            console.log(`[PASS] Equip type FK integrity: 0 orphan records`);
        } else {
            console.error(`[FAIL] Orphan equip_type_id found: ${fkRes.rows[0].count}`);
            allPassed = false;
        }

        // 6. Ruleset breakdown: 319 in 2024, 171 in 2014
        const rulesRes = await client.query(`
            SELECT ruleset, count(*)::int AS count 
            FROM public.ac_equipment 
            GROUP BY ruleset 
            ORDER BY ruleset;
        `);
        console.log(`[INFO] ac_equipment rulesets: ${rulesRes.rows.map(r => `${r.ruleset}: ${r.count}`).join(', ')}`);
        const r2014 = rulesRes.rows.find(r => r.ruleset === '2014')?.count || 0;
        const r2024 = rulesRes.rows.find(r => r.ruleset === '2024')?.count || 0;
        if (r2014 === 170 && r2024 === 320) {
            console.log(`[PASS] Ruleset parity: 170 (2014) and 320 (2024)`);
        } else {
            console.error(`[FAIL] Ruleset mismatch: 2014=${r2014} (exp 170), 2024=${r2024} (exp 320)`);
            allPassed = false;
        }

        // 7. Source array integrity against ac_sources
        const srcIntegrityRes = await client.query(`
            SELECT count(*)::int as invalid_count
            FROM public.ac_equipment
            WHERE NOT (source <@ (SELECT array_agg(source_key) FROM public.ac_sources));
        `);
        if (srcIntegrityRes.rows[0].invalid_count === 0) {
            console.log(`[PASS] Source array integrity: all source elements link to valid ac_sources(source_key)`);
        } else {
            console.error(`[FAIL] Invalid source keys detected in ac_equipment: ${srcIntegrityRes.rows[0].invalid_count}`);
            allPassed = false;
        }

        // 8. Multi-source entries count
        const multiSrcRes = await client.query(`
            SELECT count(*)::int as count
            FROM public.ac_equipment
            WHERE array_length(source, 1) > 1;
        `);
        console.log(`[INFO] Multi-source equipment items: ${multiSrcRes.rows[0].count} records`);

        // 9. Display order validation
        const orderRes = await client.query(`
            SELECT min(display_order) as min_order, 
                   max(display_order) as max_order, 
                   count(DISTINCT display_order)::int as distinct_orders
            FROM public.ac_equipment;
        `);
        const oRow = orderRes.rows[0];
        if (oRow.distinct_orders === 490 && parseFloat(oRow.min_order) === 1.0 && parseFloat(oRow.max_order) === 490.0) {
            console.log(`[PASS] Display orders: 1.0 to 490.0 (490 distinct, fractional indexing ready)`);
        } else {
            console.error(`[FAIL] Display order sequence mismatch:`, oRow);
            allPassed = false;
        }

        // 10. RLS policies verification
        const rlsRes = await client.query(`
            SELECT tablename, policyname 
            FROM pg_policies 
            WHERE schemaname = 'public' AND tablename IN ('ac_equip_type', 'ac_equipment')
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
