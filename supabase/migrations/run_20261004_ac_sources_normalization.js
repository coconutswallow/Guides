/**
 * Database Migration Runner: AC Sources Normalization & Data Load
 * 
 * Usage:
 *   node run_20261004_ac_sources_normalization.js --dry-run
 *   node run_20261004_ac_sources_normalization.js --execute
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

const dbUrl = process.env.SOURCE_DB_URL || process.env.TARGET_DB_URL;
if (!dbUrl) {
    console.error('Error: SOURCE_DB_URL is not set in environment or .env file');
    process.exit(1);
}

const isExecute = process.argv.includes('--execute');
const isDryRun = process.argv.includes('--dry-run') || !isExecute;

const sqlFilePath = path.resolve(__dirname, '20261004_ac_sources_normalization.sql');
const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

async function run() {
    console.log(`Starting migration runner [Mode: ${isExecute ? 'EXECUTE (COMMIT)' : 'DRY-RUN (ROLLBACK)'}]...`);
    
    const client = new pg.Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to PostgreSQL database successfully.');

        await client.query('BEGIN;');

        console.log('Executing migration SQL statements...');
        await client.query(sqlContent);
        console.log('Migration SQL executed successfully.');

        // Run verification checks
        console.log('\n--- Running Verification Checklist ---');
        
        // 1. Total row count in ac_sources
        const countRes = await client.query('SELECT count(*)::int AS count FROM public.ac_sources;');
        const totalRows = countRes.rows[0].count;
        console.log(`[1] Total rows in ac_sources: ${totalRows} (Expected: 119) -> ${totalRows === 119 ? 'PASS' : 'FAIL'}`);

        // 2. Audit check_ids (SRC_0001 to SRC_0119)
        const checkIdRes = await client.query(`
            SELECT min(check_id) AS min_id, max(check_id) AS max_id, count(distinct check_id)::int AS distinct_count 
            FROM public.ac_sources;
        `);
        const { min_id, max_id, distinct_count } = checkIdRes.rows[0];
        const checkIdPass = min_id === 'SRC_0001' && max_id === 'SRC_0119' && distinct_count === 119;
        console.log(`[2] Audit check_ids: min=${min_id}, max=${max_id}, distinct=${distinct_count} -> ${checkIdPass ? 'PASS' : 'FAIL'}`);

        // 3. Duplicate source_keys
        const dupRes = await client.query(`
            SELECT source_key, count(*)::int 
            FROM public.ac_sources 
            GROUP BY source_key 
            HAVING count(*) > 1;
        `);
        console.log(`[3] Duplicate source_keys: ${dupRes.rows.length} (Expected: 0) -> ${dupRes.rows.length === 0 ? 'PASS' : 'FAIL'}`);

        // 4. MCV source keys (canonical mapping for downstream monsters table)
        const mcvRes = await client.query(`
            SELECT source_key, abbreviation, name 
            FROM public.ac_sources 
            WHERE source_key IN ('MCV1_DC', 'MCV3_EC')
            ORDER BY source_key;
        `);
        const mcvPass = mcvRes.rows.length === 2 && 
                        mcvRes.rows[0].source_key === 'MCV1_DC' && 
                        mcvRes.rows[1].source_key === 'MCV3_EC';
        console.log(`[4] Canonical MCV keys (MCV1_DC, MCV3_EC): ${mcvRes.rows.length} found -> ${mcvPass ? 'PASS' : 'FAIL'}`);

        // 5. New 2024 rows: AU and RHW
        const newRowsRes = await client.query(`
            SELECT source_key, check_id, name, ruleset, type 
            FROM public.ac_sources 
            WHERE source_key IN ('AU', 'RHW')
            ORDER BY source_key;
        `);
        const newRowsPass = newRowsRes.rows.length === 2;
        console.log(`[5] Missing records inserted (AU, RHW): ${newRowsRes.rows.length} found -> ${newRowsPass ? 'PASS' : 'FAIL'}`);

        // 6. Lookups entry for type = 'sources'
        const lookupsRes = await client.query(`
            SELECT type, data 
            FROM public.lookups 
            WHERE type = 'sources';
        `);
        const lookupsData = lookupsRes.rows[0]?.data;
        const lookupsPass = lookupsData && Array.isArray(lookupsData.types) && lookupsData.types.length === 8;
        console.log(`[6] Lookups table entry ('sources'): ${lookupsData?.types?.length || 0} categories -> ${lookupsPass ? 'PASS' : 'FAIL'}`);

        // 7. Deprecation check: ac_sources_categories and category_id column
        const catTableRes = await client.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'ac_sources_categories'
            ) AS exists;
        `);
        const catColRes = await client.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'ac_sources' AND column_name = 'category_id'
            ) AS exists;
        `);
        const deprecationPass = !catTableRes.rows[0].exists && !catColRes.rows[0].exists;
        console.log(`[7] Legacy categories table and FK removed: -> ${deprecationPass ? 'PASS' : 'FAIL'}`);

        const allPassed = totalRows === 119 && checkIdPass && dupRes.rows.length === 0 && mcvPass && newRowsPass && lookupsPass && deprecationPass;

        if (!allPassed) {
            throw new Error('Verification checklist failed! Aborting migration.');
        }

        if (isExecute) {
            await client.query('COMMIT;');
            console.log('\n>>> MIGRATION COMMITTED TO DATABASE SUCCESSFULLY. <<<');
        } else {
            await client.query('ROLLBACK;');
            console.log('\n>>> DRY RUN COMPLETED (CHANGES ROLLED BACK). To apply permanently, run with --execute <<<');
        }

    } catch (err) {
        console.error('\n[!] Error during migration:', err);
        try {
            await client.query('ROLLBACK;');
            console.log('Transaction rolled back.');
        } catch (rbErr) {
            console.error('Error during rollback:', rbErr);
        }
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();
