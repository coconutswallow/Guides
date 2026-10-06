/**
 * Database Migration Runner: AC Backgrounds Normalization & Data Load
 * 
 * Usage:
 *   node run_20261005_ac_backgrounds_normalization.js --dry-run
 *   node run_20261005_ac_backgrounds_normalization.js --execute
 *   node run_20261005_ac_backgrounds_normalization.js --prod --execute
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
        dbUrl = process.env.PROD_DB_URL;
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

const sqlFilePath = path.resolve(__dirname, '20261005_ac_backgrounds_normalization.sql');
const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

async function run() {
    console.log(`Starting AC Backgrounds migration runner [Target: ${targetEnvName}, Mode: ${isExecute ? 'EXECUTE (COMMIT)' : 'DRY-RUN (ROLLBACK)'}]...`);
    
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
        
        // 1. Total rows in ac_backgrounds
        const countRes = await client.query('SELECT count(*)::int AS count FROM public.ac_backgrounds;');
        const totalRows = countRes.rows[0].count;
        console.log(`[1] Total rows in ac_backgrounds: ${totalRows} (Expected: 166) -> ${totalRows === 166 ? 'PASS' : 'FAIL'}`);

        // 2. Ruleset distribution
        const rulesetRes = await client.query(`
            SELECT ruleset, count(*)::int 
            FROM public.ac_backgrounds 
            GROUP BY ruleset 
            ORDER BY ruleset;
        `);
        console.log('[2] Ruleset counts:', rulesetRes.rows);

        // 3. Category distribution
        const catRes = await client.query(`
            SELECT category, count(*)::int 
            FROM public.ac_backgrounds 
            GROUP BY category 
            ORDER BY category;
        `);
        console.log('[3] Category counts:', catRes.rows);

        // 4. Null ruleset or category
        const nullCheckRes = await client.query(`
            SELECT count(*)::int AS count 
            FROM public.ac_backgrounds 
            WHERE ruleset IS NULL OR category IS NULL;
        `);
        console.log(`[4] Records with NULL ruleset or category: ${nullCheckRes.rows[0].count} (Expected: 0) -> ${nullCheckRes.rows[0].count === 0 ? 'PASS' : 'FAIL'}`);

        // 5. RLS Policies
        const rlsRes = await client.query(`
            SELECT polname FROM pg_policy WHERE polrelid = 'public.ac_backgrounds'::regclass;
        `);
        const polNames = rlsRes.rows.map(r => r.polname);
        console.log('[5] Active RLS Policies on ac_backgrounds:', polNames);

        if (isExecute) {
            await client.query('COMMIT;');
            console.log('\n>>> Transaction COMMITTED successfully. Migration complete! <<<');
        } else {
            await client.query('ROLLBACK;');
            console.log('\n>>> Dry-run complete. Transaction ROLLED BACK (no changes made). <<<');
        }
    } catch (err) {
        await client.query('ROLLBACK;').catch(() => {});
        console.error('\nMigration failed with error:', err);
        process.exit(1);
    } finally {
        await client.end().catch(() => {});
    }
}

run();
