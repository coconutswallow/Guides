/**
 * Database Migration Runner: Enable Security Invoker on public.v_ac_races
 * 
 * Usage:
 *   node database/migrations/run_20261005_v_ac_races_security_invoker.js --dry-run
 *   node database/migrations/run_20261005_v_ac_races_security_invoker.js --execute
 *   node database/migrations/run_20261005_v_ac_races_security_invoker.js --execute --prod
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

const sqlFilePath = path.resolve(__dirname, '20261005_v_ac_races_security_invoker.sql');
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

        console.log('Executing migration SQL statements...');
        await client.query(sqlContent);
        console.log('Migration SQL executed successfully.');

        // Run verification checks
        console.log('\n--- Running Verification Checklist ---');
        
        // 1. Verify reloptions on pg_class for v_ac_races contains security_invoker=true
        const viewOpts = await client.query(`
            SELECT relname, reloptions 
            FROM pg_class 
            WHERE relname = 'v_ac_races';
        `);
        const options = viewOpts.rows[0]?.reloptions || [];
        const invokerPass = options.includes('security_invoker=true');
        console.log(`[1] v_ac_races has security_invoker=true: ${invokerPass ? 'PASS' : 'FAIL'} (${options.join(', ')})`);

        // 2. Query as anon role
        await client.query('SET ROLE anon;');
        const anonRes = await client.query('SELECT count(*)::int AS count FROM public.v_ac_races;');
        const anonCount = anonRes.rows[0].count;
        const anonPass = anonCount === 221;
        console.log(`[2] Query as anon role: ${anonCount} rows (Expected: 221) -> ${anonPass ? 'PASS' : 'FAIL'}`);

        // 3. Query as authenticated role
        await client.query('SET ROLE authenticated;');
        const authRes = await client.query('SELECT count(*)::int AS count FROM public.v_ac_races;');
        const authCount = authRes.rows[0].count;
        const authPass = authCount === 221;
        console.log(`[3] Query as authenticated role: ${authCount} rows (Expected: 221) -> ${authPass ? 'PASS' : 'FAIL'}`);

        await client.query('RESET ROLE;');

        const allPassed = invokerPass && anonPass && authPass;

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
        await client.query('ROLLBACK;').catch(() => {});
        console.error('\n❌ Migration Failed:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();
