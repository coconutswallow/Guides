/**
 * Database Migration Runner: Copy Hit Die and Multiclassing from Ranger (2014) to Revised Ranger (2014)
 * 
 * Usage:
 *   node database/migrations/run_20261005_revised_ranger_copy_ranger_properties.js --dry-run
 *   node database/migrations/run_20261005_revised_ranger_copy_ranger_properties.js --execute
 *   node database/migrations/run_20261005_revised_ranger_copy_ranger_properties.js --execute --prod
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

const sqlFilePath = path.resolve(__dirname, '20261005_revised_ranger_copy_ranger_properties.sql');
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
            SELECT name, ruleset, hit_die, multiclassing 
            FROM public.ac_classes 
            WHERE name IN ('Ranger', 'Revised Ranger') AND ruleset = '2014'
            ORDER BY name;
        `);
        console.log('Classes before migration:');
        beforeCheck.rows.forEach(r => {
            console.log(`  - ${r.name} (${r.ruleset}): hit_die=${r.hit_die}, multiclassing=${r.multiclassing ? 'present' : 'null'}`);
        });

        console.log('\nExecuting migration SQL statements...');
        await client.query(sqlContent);
        console.log('Migration SQL executed successfully.');

        // Run verification checks
        console.log('\n--- Running Verification Checklist ---');
        
        const afterCheck = await client.query(`
            SELECT name, ruleset, hit_die, multiclassing 
            FROM public.ac_classes 
            WHERE name IN ('Ranger', 'Revised Ranger') AND ruleset = '2014'
            ORDER BY name;
        `);
        const ranger = afterCheck.rows.find(r => r.name === 'Ranger');
        const revisedRanger = afterCheck.rows.find(r => r.name === 'Revised Ranger');

        const hitDieMatch = ranger && revisedRanger && ranger.hit_die === revisedRanger.hit_die && revisedRanger.hit_die === 'd10';
        const mcMatch = ranger && revisedRanger && ranger.multiclassing === revisedRanger.multiclassing && revisedRanger.multiclassing !== null;

        console.log(`[1] Hit die matches Ranger (2014) ('d10'): ${hitDieMatch ? 'PASS' : 'FAIL'} (${revisedRanger?.hit_die})`);
        console.log(`[2] Multiclassing matches Ranger (2014): ${mcMatch ? 'PASS' : 'FAIL'}`);

        if (!hitDieMatch || !mcMatch) {
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
