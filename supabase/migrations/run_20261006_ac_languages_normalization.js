/**
 * Database Migration Runner: AC Languages Normalization & Data Load
 * 
 * Usage:
 *   node run_20261006_ac_languages_normalization.js --dry-run
 *   node run_20261006_ac_languages_normalization.js --execute
 *   node run_20261006_ac_languages_normalization.js --prod --execute
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
        dbUrl = process.env.SOURCE_DB_URL || process.env.TARGET_DB_URL;
        targetEnvName = 'DEV';
    }
}

if (!dbUrl) {
    console.error('Error: DB connection URL is not set in environment or .env file');
    process.exit(1);
}

const isExecute = process.argv.includes('--execute');
const isDryRun = process.argv.includes('--dry-run') || !isExecute;

const sqlFilePath = path.resolve(__dirname, '20261006_ac_languages_normalization.sql');
const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

async function run() {
    console.log(`Starting AC Languages migration runner [Target: ${targetEnvName}, Mode: ${isExecute ? 'EXECUTE (COMMIT)' : 'DRY-RUN (ROLLBACK)'}]...`);
    
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

        // 1. Total rows in ac_language_types
        const typeCountRes = await client.query('SELECT count(*)::int AS count FROM public.ac_language_types;');
        const typeRows = typeCountRes.rows[0].count;
        const pass1 = typeRows === 5;
        console.log(`[1] Total rows in ac_language_types: ${typeRows} (Expected: 5) -> ${pass1 ? 'PASS' : 'FAIL'}`);
        if (!pass1) allPassed = false;

        // 2. Total rows in ac_languages
        const langCountRes = await client.query('SELECT count(*)::int AS count FROM public.ac_languages;');
        const langRows = langCountRes.rows[0].count;
        const pass2 = langRows === 128;
        console.log(`[2] Total rows in ac_languages: ${langRows} (Expected: 128) -> ${pass2 ? 'PASS' : 'FAIL'}`);
        if (!pass2) allPassed = false;

        // 3. check_id coverage and range LAN_0001 to LAN_0128
        const checkIdRes = await client.query(`
            SELECT 
                count(*)::int AS total_checks,
                count(DISTINCT check_id)::int AS unique_checks,
                min(check_id) AS min_check,
                max(check_id) AS max_check,
                count(*) FILTER (WHERE check_id IS NULL)::int AS null_checks
            FROM public.ac_languages;
        `);
        const { total_checks, unique_checks, min_check, max_check, null_checks } = checkIdRes.rows[0];
        const pass3 = total_checks === 128 && unique_checks === 128 && min_check === 'LAN_0001' && max_check === 'LAN_0128' && null_checks === 0;
        console.log(`[3] check_id range and uniqueness: [${min_check} .. ${max_check}], unique=${unique_checks}, nulls=${null_checks} -> ${pass3 ? 'PASS' : 'FAIL'}`);
        if (!pass3) allPassed = false;

        // 4. Orc verification (LAN_0012 restoration check)
        const orcRes = await client.query(`
            SELECT l.check_id, l.name, l.script, l.origin, l.typical_speakers, t.name as type_name
            FROM public.ac_languages l
            JOIN public.ac_language_types t ON l.type_id = t.id
            WHERE l.check_id = 'LAN_0012' OR l.name = 'Orc';
        `);
        const orcRow = orcRes.rows[0];
        const pass4 = orcRes.rows.length === 1 && orcRow.check_id === 'LAN_0012' && orcRow.name === 'Orc' && orcRow.type_name === 'Standard Languages' && orcRow.script === 'Dwarvish';
        console.log(`[4] Restored Orc record verification: check_id=${orcRow?.check_id}, name=${orcRow?.name}, type=${orcRow?.type_name}, script=${orcRow?.script} -> ${pass4 ? 'PASS' : 'FAIL'}`);
        if (!pass4) allPassed = false;

        // 5. Foreign key validity (no orphan language types)
        const orphanRes = await client.query(`
            SELECT count(*)::int AS orphans 
            FROM public.ac_languages 
            WHERE type_id IS NULL OR type_id NOT IN (SELECT id FROM public.ac_language_types);
        `);
        const orphanCount = orphanRes.rows[0].orphans;
        const pass5 = orphanCount === 0;
        console.log(`[5] Foreign key validity (orphans = ${orphanCount}) -> ${pass5 ? 'PASS' : 'FAIL'}`);
        if (!pass5) allPassed = false;

        // 6. display_order data types
        const colTypeRes = await client.query(`
            SELECT table_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name IN ('ac_language_types', 'ac_languages') 
              AND column_name = 'display_order';
        `);
        const pass6 = colTypeRes.rows.every(r => r.data_type === 'double precision');
        console.log(`[6] Fractional indexing display_order data types: ${colTypeRes.rows.map(r => `${r.table_name}:${r.data_type}`).join(', ')} -> ${pass6 ? 'PASS' : 'FAIL'}`);
        if (!pass6) allPassed = false;

        // 7. RLS policies verification
        const policiesRes = await client.query(`
            SELECT tablename, policyname 
            FROM pg_policies 
            WHERE schemaname = 'public' AND tablename IN ('ac_language_types', 'ac_languages')
            ORDER BY tablename, policyname;
        `);
        const expectedPolicies = [
            'ac_language_types:Admins and Engineers can manage ac_language_types',
            'ac_language_types:Allow public read access to ac_language_types',
            'ac_language_types:Allow service_role to manage ac_language_types',
            'ac_languages:Admins and Engineers can manage ac_languages',
            'ac_languages:Allow public read access to ac_languages',
            'ac_languages:Allow service_role to manage ac_languages'
        ];
        const actualPolicies = policiesRes.rows.map(r => `${r.tablename}:${r.policyname}`);
        const pass7 = expectedPolicies.every(p => actualPolicies.includes(p));
        console.log(`[7] RLS Policies (${actualPolicies.length} found): -> ${pass7 ? 'PASS' : 'FAIL'}`);
        if (!pass7) allPassed = false;

        console.log('--------------------------------------');

        if (isExecute) {
            if (allPassed) {
                await client.query('COMMIT;');
                console.log(`\nSUCCESS: Migration successfully applied and COMMITTED to ${targetEnvName}.`);
            } else {
                await client.query('ROLLBACK;');
                console.error(`\nFAILED: Verification checks failed. Transaction ROLLED BACK.`);
                process.exit(1);
            }
        } else {
            await client.query('ROLLBACK;');
            console.log(`\nDRY-RUN COMPLETE: All changes verified and ROLLED BACK cleanly.`);
            if (!allPassed) {
                console.error('Note: One or more verification checks failed during dry run.');
                process.exit(1);
            }
        }
    } catch (err) {
        await client.query('ROLLBACK;').catch(() => {});
        console.error('\nERROR running migration:', err);
        process.exit(1);
    } finally {
        await client.end().catch(() => {});
    }
}

run();
