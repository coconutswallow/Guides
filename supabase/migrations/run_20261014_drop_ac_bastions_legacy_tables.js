/**
 * Database Migration Runner: Drop AC Legacy Bastion Tables
 * Target: Drop deprecated ac_bastions and ac_bastion_categories tables
 *
 * Usage:
 *   node supabase/migrations/run_20261014_drop_ac_bastions_legacy_tables.js --dry-run
 *   node supabase/migrations/run_20261014_drop_ac_bastions_legacy_tables.js --execute
 *   node supabase/migrations/run_20261014_drop_ac_bastions_legacy_tables.js --dry-run --prod
 *   node supabase/migrations/run_20261014_drop_ac_bastions_legacy_tables.js --execute --prod
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

const LEGACY_TABLES = [
    'ac_bastions',
    'ac_bastion_categories'
];

async function run() {
    console.log(`====================================================`);
    console.log(`Starting Drop AC Legacy Bastion Tables Migration`);
    console.log(`Environment: ${targetEnvName}`);
    console.log(`Mode:        ${isExecute ? 'EXECUTE (Commit changes)' : 'DRY RUN (Rollback)'}`);
    console.log(`====================================================`);

    const client = new pg.Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        const sqlFile = path.resolve(__dirname, '20261014_drop_ac_bastions_legacy_tables.sql');
        const sqlContent = fs.readFileSync(sqlFile, 'utf8');

        await client.query('BEGIN;');

        const cleanSql = sqlContent
            .replace(/^\s*BEGIN\s*;/im, '')
            .replace(/^\s*COMMIT\s*;/im, '');

        await client.query(cleanSql);

        // Verification Checks
        console.log('\n--- Running Post-Migration Verification Checks ---');
        let allPassed = true;

        // Check 1: Legacy bastion tables are dropped
        const droppedCheck = await client.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = ANY($1);
        `, [LEGACY_TABLES]);
        if (droppedCheck.rows.length === 0) {
            console.log(`[PASS] Check 1: Both legacy bastion tables confirmed dropped.`);
        } else {
            console.error(`[FAIL] Check 1: Remaining legacy tables found:`, droppedCheck.rows.map(r => r.table_name));
            allPassed = false;
        }

        // Check 2: Normalized ac_bastion and ac_bastion_type tables intact
        const activeCheck = await client.query(`
            SELECT 
                (SELECT count(*) FROM public.ac_bastion) as bastion_count,
                (SELECT count(*) FROM public.ac_bastion_type) as type_count;
        `);
        const bastionCount = parseInt(activeCheck.rows[0].bastion_count, 10);
        const typeCount = parseInt(activeCheck.rows[0].type_count, 10);

        if (bastionCount >= 66 && typeCount >= 4) {
            console.log(`[PASS] Check 2: Active tables intact (ac_bastion: ${bastionCount} rows, ac_bastion_type: ${typeCount} rows).`);
        } else {
            console.error(`[FAIL] Check 2: Unexpected counts: ac_bastion=${bastionCount}, ac_bastion_type=${typeCount}`);
            allPassed = false;
        }

        if (isExecute && allPassed) {
            await client.query('COMMIT;');
            console.log(`\n>>> [SUCCESS] Migration committed to ${targetEnvName}.`);
        } else {
            await client.query('ROLLBACK;');
            console.log(`\n>>> [ROLLBACK] Transaction rolled back (${isDryRun ? 'Dry Run Mode' : 'Verification Failure'}).`);
        }

    } catch (err) {
        await client.query('ROLLBACK;');
        console.error('\n>>> [ERROR] Migration failed and rolled back:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();
