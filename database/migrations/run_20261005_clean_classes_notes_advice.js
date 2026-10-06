/**
 * Database Migration Runner: Clean leading/trailing spaces from ac_classes & ac_subclasses
 * 
 * Usage:
 *   node database/migrations/run_20261005_clean_classes_notes_advice.js --dry-run
 *   node database/migrations/run_20261005_clean_classes_notes_advice.js --execute
 *   node database/migrations/run_20261005_clean_classes_notes_advice.js --execute --prod
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
        dbUrl = process.env.PROD_DB_URL;
        targetEnvName = 'PRODUCTION';
    } else {
        dbUrl = process.env.SOURCE_DB_URL || process.env.TARGET_DB_URL;
        targetEnvName = 'DEV';
    }
}

if (!dbUrl) {
    if (isProd) {
        console.error('Error: PROD_DB_URL is not set.');
    } else {
        console.error('Error: SOURCE_DB_URL is not set in environment or .env file');
    }
    process.exit(1);
}

const isExecute = process.argv.includes('--execute');
const isDryRun = process.argv.includes('--dry-run') || !isExecute;

const sqlFilePath = path.resolve(__dirname, '20261005_clean_classes_notes_advice.sql');
const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

async function run() {
    console.log(`Starting migration runner [Target: ${targetEnvName}, Mode: ${isExecute ? 'EXECUTE (COMMIT)' : 'DRY-RUN (ROLLBACK)'}]...`);
    
    const client = new pg.Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to PostgreSQL database successfully.');

        await client.query('BEGIN;');

        const beforeCheck = await client.query(`
            SELECT count(*)::int AS count 
            FROM public.ac_classes 
            WHERE (notes_advice ~ '(?m)^[ \\t]+' OR notes_advice ~ '(?m)[ \\t]+$'
                OR multiclassing ~ '(?m)^[ \\t]+' OR multiclassing ~ '(?m)[ \\t]+$'
                OR expanded_options ~ '(?m)^[ \\t]+' OR expanded_options ~ '(?m)[ \\t]+$');
        `);
        console.log(`Uncleaned rows in ac_classes before migration: ${beforeCheck.rows[0].count}`);

        console.log('Executing migration SQL statements...');
        await client.query(sqlContent);
        console.log('Migration SQL executed successfully.');

        // Run verification checks
        console.log('\n--- Running Verification Checklist ---');
        
        const afterCheck = await client.query(`
            SELECT count(*)::int AS count 
            FROM public.ac_classes 
            WHERE (notes_advice ~ '(?m)^[ \\t]+' OR notes_advice ~ '(?m)[ \\t]+$'
                OR multiclassing ~ '(?m)^[ \\t]+' OR multiclassing ~ '(?m)[ \\t]+$'
                OR expanded_options ~ '(?m)^[ \\t]+' OR expanded_options ~ '(?m)[ \\t]+$');
        `);
        const remainingCount = afterCheck.rows[0].count;
        const pass = remainingCount === 0;
        console.log(`[1] ac_classes rows with leading/trailing line spaces remaining: ${remainingCount} (Expected: 0) -> ${pass ? 'PASS' : 'FAIL'}`);

        if (!pass) {
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
        await client.query('ROLLBACK;').catch(() => {});
        console.error('\n❌ Migration Failed:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();
