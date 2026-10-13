/**
 * Database Migration Runner: Drop Deprecated AC Compatibility Views
 * Target: Drop public.ac_downtime_categories and public.ac_equipment_categories
 *
 * Usage:
 *   node supabase/migrations/run_20261012_drop_ac_legacy_views.js --dry-run
 *   node supabase/migrations/run_20261012_drop_ac_legacy_views.js --execute
 *   node supabase/migrations/run_20261012_drop_ac_legacy_views.js --dry-run --prod
 *   node supabase/migrations/run_20261012_drop_ac_legacy_views.js --execute --prod
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

const VIEWS_TO_DROP = [
    'ac_downtime_categories',
    'ac_equipment_categories'
];

async function run() {
    console.log(`====================================================`);
    console.log(`Starting Drop Deprecated AC Compatibility Views Migration`);
    console.log(`Environment: ${targetEnvName}`);
    console.log(`Mode:        ${isExecute ? 'EXECUTE (Commit changes)' : 'DRY RUN (Rollback)'}`);
    console.log(`====================================================`);

    const client = new pg.Client({ connectionString: dbUrl });
    try {
        await client.connect();

        const sqlFile = path.resolve(__dirname, '20261012_drop_ac_legacy_views.sql');
        const sqlContent = fs.readFileSync(sqlFile, 'utf8');

        await client.query('BEGIN;');

        const cleanSql = sqlContent
            .replace(/^\s*BEGIN\s*;/im, '')
            .replace(/^\s*COMMIT\s*;/im, '');

        await client.query(cleanSql);

        // Verification Checks
        console.log('\n--- Running Post-Migration Verification Checks ---');
        let allPassed = true;

        // Check 1: Target views dropped
        const droppedCheck = await client.query(`
            SELECT table_name FROM information_schema.views
            WHERE table_schema = 'public' AND table_name = ANY($1);
        `, [VIEWS_TO_DROP]);
        if (droppedCheck.rows.length === 0) {
            console.log(`[PASS] Check 1: Both deprecated views confirmed dropped.`);
        } else {
            console.error(`[FAIL] Check 1: Views still exist:`, droppedCheck.rows.map(r => r.table_name));
            allPassed = false;
        }

        // Check 2: Canonical base tables intact
        const dtRes = await client.query('SELECT count(*) FROM public.ac_downtime_type;');
        const dtCount = parseInt(dtRes.rows[0].count, 10);
        if (dtCount === 13) {
            console.log(`[PASS] Check 2a: Base table public.ac_downtime_type intact (${dtCount} rows).`);
        } else {
            console.error(`[FAIL] Check 2a: Expected 13 rows in public.ac_downtime_type, got ${dtCount}.`);
            allPassed = false;
        }

        const eqRes = await client.query('SELECT count(*) FROM public.ac_equip_type;');
        const eqCount = parseInt(eqRes.rows[0].count, 10);
        if (eqCount === 13) {
            console.log(`[PASS] Check 2b: Base table public.ac_equip_type intact (${eqCount} rows).`);
        } else {
            console.error(`[FAIL] Check 2b: Expected 13 rows in public.ac_equip_type, got ${eqCount}.`);
            allPassed = false;
        }

        // Check 3: Active views v_ac_classes and v_ac_races preserved with security_invoker
        const activeViewsRes = await client.query(`
            SELECT c.relname, c.reloptions
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relkind = 'v' AND c.relname IN ('v_ac_classes', 'v_ac_races');
        `);
        if (activeViewsRes.rows.length === 2) {
            console.log(`[PASS] Check 3: Active views v_ac_classes and v_ac_races preserved.`);
        } else {
            console.error(`[FAIL] Check 3: Expected 2 active views, got ${activeViewsRes.rows.length}.`);
            allPassed = false;
        }

        if (!allPassed) {
            throw new Error('Post-migration verification checks failed.');
        }

        if (isExecute) {
            await client.query('COMMIT;');
            console.log(`\n>>> SUCCESS: Migration committed to ${targetEnvName}. <<<`);
        } else {
            await client.query('ROLLBACK;');
            console.log(`\n>>> DRY RUN COMPLETE: All checks passed. Changes rolled back. <<<`);
        }

    } catch (err) {
        try {
            await client.query('ROLLBACK;');
        } catch (rbErr) {
            // ignore rollback error
        }
        console.error(`\n>>> ERROR: Migration failed. Transaction rolled back. <<<`, err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();
