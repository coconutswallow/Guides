/**
 * Database Migration Runner: Add base properties to ac_races and implement inheritance in v_ac_races
 * 
 * Usage:
 *   node database/migrations/run_20261005_ac_races_base_properties_inheritance.js --dry-run
 *   node database/migrations/run_20261005_ac_races_base_properties_inheritance.js --execute
 *   node database/migrations/run_20261005_ac_races_base_properties_inheritance.js --execute --prod
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
        targetEnvName = 'DEV / SOURCE_DB';
    }
}

const isExecute = process.argv.includes('--execute');

async function run() {
    console.log(`================================================================`);
    console.log(`Migration: Base Properties & Lineage Inheritance`);
    console.log(`Target DB: ${targetEnvName}`);
    console.log(`Mode:      ${isExecute ? 'EXECUTE' : 'DRY RUN'}`);
    console.log(`================================================================\n`);

    if (!dbUrl) {
        console.error('Error: Database connection URL not found in environment.');
        process.exit(1);
    }

    const sqlFilePath = path.resolve(__dirname, '20261005_ac_races_base_properties_inheritance.sql');
    if (!fs.existsSync(sqlFilePath)) {
        console.error(`Error: SQL file not found at ${sqlFilePath}`);
        process.exit(1);
    }

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    const client = new pg.Client({ connectionString: dbUrl });

    try {
        await client.connect();
        console.log('Connected to database successfully.');

        if (!isExecute) {
            console.log('\n[DRY RUN] Previewing SQL to be executed:');
            console.log(sqlContent.slice(0, 500) + '...\n');
            console.log('Run with --execute to apply this migration.');
            return;
        }

        console.log('\nExecuting migration in transaction...');
        await client.query('BEGIN');
        await client.query(sqlContent);
        await client.query('COMMIT');
        console.log('Migration committed successfully!');

        // Verification query
        const testRes = await client.query(`
            SELECT race, subrace, size, speed, language, dex, int_stat, cha, notes_advice
            FROM public.v_ac_races
            WHERE race IN ('Elf (2014)', 'Dwarf (2014)', 'Aasimar', 'Dragonborn (2014)')
            ORDER BY race, subrace
            LIMIT 10
        `);
        console.log('\nVerification of inherited lineages:');
        console.table(testRes.rows.map(r => ({
            race: r.race,
            subrace: r.subrace,
            size: r.size,
            speed: r.speed,
            dex: r.dex,
            int: r.int_stat,
            cha: r.cha,
            notes: (r.notes_advice || '').slice(0, 35)
        })));

    } catch (err) {
        console.error('Migration failed:', err);
        try {
            await client.query('ROLLBACK');
            console.log('Transaction rolled back.');
        } catch (rbErr) {
            console.error('Rollback error:', rbErr);
        }
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();
