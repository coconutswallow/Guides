/**
 * Database Migration Runner: AC Downtime Normalization & Staff Admin RLS
 * Target Tables: public.ac_downtime_type, public.ac_downtime
 * Compatibility View: public.ac_downtime_categories
 * 
 * Usage:
 *   node supabase/migrations/run_20261006_ac_downtime_normalization.js --dry-run
 *   node supabase/migrations/run_20261006_ac_downtime_normalization.js --execute
 *   node supabase/migrations/run_20261006_ac_downtime_normalization.js --dry-run --prod
 *   node supabase/migrations/run_20261006_ac_downtime_normalization.js --execute --prod
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

const sqlFilePath = path.resolve(__dirname, '20261006_ac_downtime_normalization.sql');
const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

async function run() {
    console.log(`Starting AC Downtime migration runner [Target: ${targetEnvName}, Mode: ${isExecute ? 'EXECUTE (COMMIT)' : 'DRY-RUN (ROLLBACK)'}]...`);
    
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

        // 1. Total rows in ac_downtime_type (expecting 13)
        const typeCountRes = await client.query('SELECT count(*)::int as count FROM public.ac_downtime_type;');
        const typeCount = typeCountRes.rows[0].count;
        if (typeCount === 13) {
            console.log(`[PASS] ac_downtime_type total rows: ${typeCount} (expected 13)`);
        } else {
            console.error(`[FAIL] ac_downtime_type total rows: ${typeCount} (expected 13)`);
            allPassed = false;
        }

        // 2. Compatibility view ac_downtime_categories
        const viewCountRes = await client.query('SELECT count(*)::int as count FROM public.ac_downtime_categories;');
        const viewCount = viewCountRes.rows[0].count;
        if (viewCount === 13) {
            console.log(`[PASS] Compatibility view ac_downtime_categories returns: ${viewCount} rows`);
        } else {
            console.error(`[FAIL] Compatibility view ac_downtime_categories returns: ${viewCount} (expected 13)`);
            allPassed = false;
        }

        // 3. Total rows in ac_downtime (expecting 130)
        const dtCountRes = await client.query('SELECT count(*)::int as count FROM public.ac_downtime;');
        const dtCount = dtCountRes.rows[0].count;
        if (dtCount === 130) {
            console.log(`[PASS] ac_downtime total rows: ${dtCount} (expected 130)`);
        } else {
            console.error(`[FAIL] ac_downtime total rows: ${dtCount} (expected 130)`);
            allPassed = false;
        }

        // 4. Check_ID audit: DT_0001 to DT_0130, no nulls
        const checkIdRes = await client.query(`
            SELECT 
                count(check_id)::int as total_ids,
                count(DISTINCT check_id)::int as distinct_ids,
                min(check_id) as min_id,
                max(check_id) as max_id,
                count(*) FILTER (WHERE check_id IS NULL)::int as null_ids
            FROM public.ac_downtime;
        `);
        const { total_ids, distinct_ids, min_id, max_id, null_ids } = checkIdRes.rows[0];
        if (total_ids === 130 && distinct_ids === 130 && min_id === 'DT_0001' && max_id === 'DT_0130' && null_ids === 0) {
            console.log(`[PASS] Check_IDs: ${min_id} to ${max_id} (${distinct_ids} distinct, ${null_ids} nulls)`);
        } else {
            console.error(`[FAIL] Check_ID integrity failed: total=${total_ids}, distinct=${distinct_ids}, min=${min_id}, max=${max_id}, nulls=${null_ids}`);
            allPassed = false;
        }

        // 5. Check specific newly added activities: Haunted Bastions (DT_0003) and Jump Start Rework (DT_0052)
        const newActivitiesRes = await client.query(`
            SELECT check_id, name, gold_cost, dtp_cost FROM public.ac_downtime
            WHERE name IN ('Haunted Bastions', 'Jump Start Rework')
            ORDER BY check_id;
        `);
        if (newActivitiesRes.rows.length === 2) {
            console.log(`[PASS] Restored activities verified:`);
            newActivitiesRes.rows.forEach(r => {
                console.log(`  - [${r.check_id}] ${r.name} (Gold: ${r.gold_cost}, DTP: ${r.dtp_cost})`);
            });
        } else {
            console.error(`[FAIL] Expected 2 restored activities, found: ${newActivitiesRes.rows.length}`);
            allPassed = false;
        }

        // 6. Foreign key integrity
        const orphanRes = await client.query(`
            SELECT count(*)::int as orphan_count 
            FROM public.ac_downtime d
            LEFT JOIN public.ac_downtime_type t ON d.downtime_type_id = t.id
            WHERE t.id IS NULL;
        `);
        const orphanCount = orphanRes.rows[0].orphan_count;
        if (orphanCount === 0) {
            console.log(`[PASS] Downtime type FK integrity: 0 orphan records`);
        } else {
            console.error(`[FAIL] Found ${orphanCount} orphan downtime records without valid downtime_type_id`);
            allPassed = false;
        }

        // 7. Category distribution check
        const expectedDistribution = {
            'Bastions': 4,
            'Building a Stronghold': 10,
            'Buying & Selling': 9,
            'Crafting': 25,
            'Research': 1,
            'Reworking': 23,
            'Spellcasting': 4,
            'Spellcasting Services': 22,
            'Trading': 5,
            'Training': 8,
            'Traveling': 8,
            'Work': 2,
            'Miscellaneous': 9
        };
        const catDistRes = await client.query(`
            SELECT t.name, count(d.id)::int as count
            FROM public.ac_downtime_type t
            LEFT JOIN public.ac_downtime d ON d.downtime_type_id = t.id
            GROUP BY t.name
            ORDER BY t.name;
        `);
        let distMatch = true;
        for (const row of catDistRes.rows) {
            if (expectedDistribution[row.name] !== row.count) {
                console.error(`[FAIL] Distribution mismatch for ${row.name}: expected ${expectedDistribution[row.name]}, got ${row.count}`);
                distMatch = false;
            }
        }
        if (distMatch) {
            console.log(`[PASS] Category distribution: exact 1:1 match across all 13 categories (sum = 130)`);
        } else {
            allPassed = false;
        }

        // 8. Display orders: 1.0 to 130.0 distinct values
        const orderRes = await client.query(`
            SELECT count(DISTINCT display_order)::int as distinct_orders, min(display_order) as min_ord, max(display_order) as max_ord
            FROM public.ac_downtime;
        `);
        const { distinct_orders, min_ord, max_ord } = orderRes.rows[0];
        if (distinct_orders === 130 && Number(min_ord) === 1.0 && Number(max_ord) === 130.0) {
            console.log(`[PASS] Display orders: ${min_ord} to ${max_ord} (${distinct_orders} distinct, fractional indexing ready)`);
        } else {
            console.error(`[FAIL] Display order check failed: distinct=${distinct_orders}, min=${min_ord}, max=${max_ord}`);
            allPassed = false;
        }

        // 9. Active RLS policies
        const rlsRes = await client.query(`
            SELECT tablename, policyname 
            FROM pg_policies 
            WHERE schemaname = 'public' AND tablename IN ('ac_downtime_type', 'ac_downtime')
            ORDER BY tablename, policyname;
        `);
        console.log(`[INFO] Active RLS policies (${rlsRes.rows.length}):`);
        rlsRes.rows.forEach(r => console.log(`  - [${r.tablename}] ${r.policyname}`));

        if (rlsRes.rows.length >= 6) {
            console.log(`[PASS] RLS policies applied (read, service_role, and Admin/Engineer write policies active)`);
        } else {
            console.error(`[FAIL] Expected at least 6 RLS policies, found ${rlsRes.rows.length}`);
            allPassed = false;
        }

        if (!allPassed) {
            throw new Error('Verification checks failed. Rolling back transaction.');
        }

        console.log('\nAll verification checks PASSED successfully!');

        if (isExecute) {
            await client.query('COMMIT;');
            console.log(`[EXECUTE] Migration successfully COMMITTED to ${targetEnvName} database.`);
        } else {
            await client.query('ROLLBACK;');
            console.log(`[DRY-RUN] Transaction rolled back. No changes applied to ${targetEnvName} database.`);
        }

    } catch (err) {
        await client.query('ROLLBACK;');
        console.error(`Migration FAILED: ${err.message}`);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();
