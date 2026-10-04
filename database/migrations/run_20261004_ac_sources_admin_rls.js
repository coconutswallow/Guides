/**
 * Database Migration Runner: AC Sources Admin RLS Policy
 * 
 * Usage:
 *   node database/migrations/run_20261004_ac_sources_admin_rls.js --dry-run
 *   node database/migrations/run_20261004_ac_sources_admin_rls.js --execute
 *   node database/migrations/run_20261004_ac_sources_admin_rls.js --execute --prod  (targets production DB)
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
const dbUrl = isProd ? process.env.SOURCE_DB_URL : (process.env.TARGET_DB_URL || process.env.SOURCE_DB_URL);
const dbLabel = isProd ? 'PRODUCTION' : 'TEST';

if (!dbUrl) {
    console.error('Error: Database connection URL is not set in environment or .env file');
    process.exit(1);
}

const isExecute = process.argv.includes('--execute');
const isDryRun = process.argv.includes('--dry-run') || !isExecute;

const sqlFilePath = path.resolve(__dirname, '20261004_ac_sources_admin_rls.sql');
const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

async function run() {
    console.log(`Starting RLS migration runner [Target: ${dbLabel} DB | Mode: ${isExecute ? 'EXECUTE (COMMIT)' : 'DRY-RUN (ROLLBACK)'}]...`);
    
    const client = new pg.Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log(`Connected to ${dbLabel} database successfully.`);

        await client.query('BEGIN;');

        console.log('Executing RLS migration SQL statements...');
        await client.query(sqlContent);
        console.log('Migration SQL executed successfully.');

        // Run verification checks
        console.log('\n--- Running Verification Checklist ---');
        
        // 1. Verify RLS is enabled on ac_sources
        const rlsRes = await client.query(`
            SELECT relrowsecurity 
            FROM pg_class 
            WHERE relname = 'ac_sources';
        `);
        const rlsEnabled = rlsRes.rows.length > 0 && rlsRes.rows[0].relrowsecurity === true;
        console.log(`[1] RLS enabled on ac_sources: ${rlsEnabled ? 'PASS' : 'FAIL'}`);

        // 2. Verify policy exists in pg_policies
        const policyRes = await client.query(`
            SELECT policyname, permissive, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE tablename = 'ac_sources' AND policyname = 'Admins and Engineers can manage ac_sources';
        `);
        const policyFound = policyRes.rows.length === 1;
        console.log(`[2] Admin RLS policy in pg_policies: ${policyFound ? 'PASS' : 'FAIL'}`);
        if (policyFound) {
            console.log(`    Command: ${policyRes.rows[0].cmd}`);
            console.log(`    Roles: ${policyRes.rows[0].roles}`);
        }

        // 3. List all policies on ac_sources
        const allPoliciesRes = await client.query(`
            SELECT policyname, cmd, roles 
            FROM pg_policies 
            WHERE tablename = 'ac_sources'
            ORDER BY policyname;
        `);
        console.log(`[3] Total active policies on ac_sources: ${allPoliciesRes.rows.length}`);
        allPoliciesRes.rows.forEach(p => console.log(`    - "${p.policyname}" (${p.cmd}) for ${p.roles}`));

        const allPass = rlsEnabled && policyFound;

        if (isExecute) {
            if (allPass) {
                await client.query('COMMIT;');
                console.log('\n>>> Transaction COMMITTED successfully. Target database has been updated.');
            } else {
                await client.query('ROLLBACK;');
                console.error('\n>>> Verification checks FAILED. Transaction has been ROLLED BACK.');
                process.exit(1);
            }
        } else {
            await client.query('ROLLBACK;');
            console.log('\n>>> DRY RUN complete. Transaction ROLLED BACK. No changes were made to the database.');
        }

    } catch (err) {
        await client.query('ROLLBACK;').catch(() => {});
        console.error('Error executing migration:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();
