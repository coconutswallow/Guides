/**
 * Database Migration Runner: Schema Migrations Tracking
 * Target Table: public._schema_migrations
 *
 * Usage:
 *   node supabase/migrations/run_20261031_schema_migrations_tracking.js --dry-run
 *   node supabase/migrations/run_20261031_schema_migrations_tracking.js --execute
 *   node supabase/migrations/run_20261031_schema_migrations_tracking.js --dry-run --prod
 *   node supabase/migrations/run_20261031_schema_migrations_tracking.js --execute --prod
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadEnv() {
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
        dbUrl = process.env.SOURCE_DB_URL || process.env.DEV_DB_URL;
        targetEnvName = 'DEV';
    }
}

const isExecute = process.argv.includes('--execute');

export async function runMigration() {
    if (!dbUrl) {
        console.error(`❌ Error: Database connection URL not found for environment: ${targetEnvName}`);
        process.exit(1);
    }

    console.log(`\n======================================================================`);
    console.log(`🚀 Migration: 20261031_schema_migrations_tracking.sql`);
    console.log(`🎯 Environment: ${targetEnvName}`);
    console.log(`⚙️  Mode: ${isExecute ? 'EXECUTE (Applying changes)' : 'DRY-RUN (Simulating in transaction)'}`);
    console.log(`======================================================================\n`);

    const sqlFilePath = path.join(__dirname, '20261031_schema_migrations_tracking.sql');
    if (!fs.existsSync(sqlFilePath)) {
        console.error(`❌ Error: Migration file not found: ${sqlFilePath}`);
        process.exit(1);
    }
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    const checksum = crypto.createHash('md5').update(sqlContent).digest('hex');

    const client = new pg.Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });

    const startTime = Date.now();
    try {
        await client.connect();
        console.log(` Connected to PostgreSQL [${targetEnvName}]`);

        if (!isExecute) {
            await client.query('BEGIN');
            console.log(` Transaction started for Dry-Run.`);
        }

        console.log(` Executing DDL: creating public._schema_migrations...`);
        await client.query(sqlContent);

        // Record this migration itself into _schema_migrations
        await client.query(`
            INSERT INTO public._schema_migrations (version, name, checksum, applied_at, execution_time_ms)
            VALUES ($1, $2, $3, NOW(), $4)
            ON CONFLICT (version) DO UPDATE 
            SET checksum = EXCLUDED.checksum, applied_at = NOW(), execution_time_ms = EXCLUDED.execution_time_ms;
        `, ['20261031_schema_migrations_tracking.sql', 'schema_migrations_tracking', checksum, Date.now() - startTime]);

        const verifyRes = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = '_schema_migrations';
        `);

        if (verifyRes.rows.length === 1) {
            console.log(` Verification passed: table public._schema_migrations exists.`);
        } else {
            throw new Error('Verification failed: public._schema_migrations was not created.');
        }

        if (!isExecute) {
            await client.query('ROLLBACK');
            console.log(` Transaction rolled back (Dry-Run successful).`);
        } else {
            console.log(` Changes committed successfully.`);
        }

        console.log(`\n🎉 Migration ${isExecute ? 'Completed' : 'Dry-Run Succeeded'} for [${targetEnvName}]!\n`);
    } catch (err) {
        if (!isExecute) {
            try { await client.query('ROLLBACK'); } catch (_) {}
        }
        console.error(`❌ Migration failed:`, err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    runMigration();
}
