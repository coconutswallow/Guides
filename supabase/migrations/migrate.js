/**
 * Unified Migration Manager & Catch-Up CLI
 *
 * Commands:
 *   node supabase/migrations/migrate.js status
 *   node supabase/migrations/migrate.js baseline [--prod] [--execute]
 *   node supabase/migrations/migrate.js catchup [--dry-run] [--execute]
 *   node supabase/migrations/migrate.js up [<file>] [--prod] [--dry-run] [--execute]
 *
 * package.json shortcuts:
 *   npm run migrate:status
 *   npm run migrate:catchup
 *   npm run migrate:baseline
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

export function getMigrationFiles(dir = __dirname) {
    return fs.readdirSync(dir)
        .filter(f => /^\d{8}_.*\.sql$/.test(f))
        .sort();
}

export function computeFileChecksum(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    return crypto.createHash('md5').update(content).digest('hex');
}

export async function ensureTrackingTable(client) {
    await client.query(`
        CREATE TABLE IF NOT EXISTS public._schema_migrations (
            version VARCHAR(120) PRIMARY KEY,
            name TEXT NOT NULL,
            checksum VARCHAR(64) NOT NULL,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            applied_by TEXT DEFAULT CURRENT_USER,
            execution_time_ms INTEGER DEFAULT 0
        );
    `);
}

export async function getAppliedMigrations(client) {
    try {
        const res = await client.query(`
            SELECT version, name, checksum, applied_at, execution_time_ms
            FROM public._schema_migrations
            ORDER BY version ASC;
        `);
        const map = new Map();
        for (const r of res.rows) {
            map.set(r.version, r);
        }
        return map;
    } catch (err) {
        // If table doesn't exist yet, return empty map
        return new Map();
    }
}

export function getDbUrls() {
    const devUrl = process.env.SOURCE_DB_URL || process.env.DEV_DB_URL;
    const prodUrl = process.env.PROD_DB_URL || process.env.TARGET_DB_URL;
    return { devUrl, prodUrl };
}

export async function checkMigrationStatus({ dir = __dirname } = {}) {
    const { devUrl, prodUrl } = getDbUrls();
    const files = getMigrationFiles(dir);

    const devClient = devUrl ? new pg.Client({ connectionString: devUrl, ssl: { rejectUnauthorized: false } }) : null;
    const prodClient = prodUrl ? new pg.Client({ connectionString: prodUrl, ssl: { rejectUnauthorized: false } }) : null;

    let devApplied = new Map();
    let prodApplied = new Map();

    if (devClient) {
        try {
            await devClient.connect();
            devApplied = await getAppliedMigrations(devClient);
        } catch (e) {
            console.error(`⚠️ Could not connect to DEV database: ${e.message}`);
        }
    }

    if (prodClient) {
        try {
            await prodClient.connect();
            prodApplied = await getAppliedMigrations(prodClient);
        } catch (e) {
            console.error(`⚠️ Could not connect to PROD database: ${e.message}`);
        }
    }

    const rows = [];
    const catchupNeeded = [];

    for (const file of files) {
        const filePath = path.join(dir, file);
        const checksum = computeFileChecksum(filePath);
        const inDev = devApplied.get(file);
        const inProd = prodApplied.get(file);

        let state = 'PENDING ALL';
        if (inDev && inProd) {
            if (inDev.checksum !== checksum || inProd.checksum !== checksum) {
                state = 'CHECKSUM DRIFT';
            } else {
                state = 'IN SYNC';
            }
        } else if (inDev && !inProd) {
            state = 'DEV ONLY (Catchup Needed)';
            catchupNeeded.push({ file, filePath, checksum, inDev });
        } else if (!inDev && inProd) {
            state = 'PROD ONLY';
        }

        rows.push({
            file,
            devStatus: inDev ? `Applied (${new Date(inDev.applied_at).toISOString().slice(0, 10)})` : 'Pending',
            prodStatus: inProd ? `Applied (${new Date(inProd.applied_at).toISOString().slice(0, 10)})` : 'Pending',
            state
        });
    }

    if (devClient) await devClient.end().catch(() => {});
    if (prodClient) await prodClient.end().catch(() => {});

    return { rows, catchupNeeded, totalFiles: files.length };
}

export async function runCatchup({ isExecute = false, dir = __dirname } = {}) {
    const { prodUrl } = getDbUrls();
    if (!prodUrl) {
        console.error('❌ Error: PROD database URL not found in environment.');
        process.exit(1);
    }

    const { catchupNeeded } = await checkMigrationStatus({ dir });

    console.log(`\n======================================================================`);
    console.log(`🚀 Migration Catch-Up for PRODUCTION`);
    console.log(`🎯 Mode: ${isExecute ? 'EXECUTE (Applying changes)' : 'DRY-RUN (Simulating in transaction)'}`);
    console.log(`📋 Pending Migrations: ${catchupNeeded.length}`);
    console.log(`======================================================================\n`);

    if (catchupNeeded.length === 0) {
        console.log(`✨ Production is completely up to date! No catch-up migrations needed.\n`);
        return;
    }

    const prodClient = new pg.Client({ connectionString: prodUrl, ssl: { rejectUnauthorized: false } });
    await prodClient.connect();
    await ensureTrackingTable(prodClient);

    for (const item of catchupNeeded) {
        console.log(`➡️  Processing: ${item.file}`);
        const sqlContent = fs.readFileSync(item.filePath, 'utf8');
        const start = Date.now();

        try {
            await prodClient.query('BEGIN');
            await prodClient.query(sqlContent);

            await prodClient.query(`
                INSERT INTO public._schema_migrations (version, name, checksum, applied_at, execution_time_ms)
                VALUES ($1, $2, $3, NOW(), $4)
                ON CONFLICT (version) DO UPDATE
                SET checksum = EXCLUDED.checksum, applied_at = NOW(), execution_time_ms = EXCLUDED.execution_time_ms;
            `, [item.file, item.file.replace(/\.sql$/, ''), item.checksum, Date.now() - start]);

            if (!isExecute) {
                await prodClient.query('ROLLBACK');
                console.log(`   [Dry-Run OK] Simulated successfully, rolled back.`);
            } else {
                await prodClient.query('COMMIT');
                console.log(`   [Executed] Successfully applied and recorded in PROD.`);
            }
        } catch (err) {
            await prodClient.query('ROLLBACK').catch(() => {});
            console.error(`❌ Migration failed on ${item.file}:`, err);
            await prodClient.end();
            process.exit(1);
        }
    }

    await prodClient.end();
    console.log(`\n🎉 Catch-up ${isExecute ? 'completed' : 'dry-run succeeded'} for ${catchupNeeded.length} migration(s)!\n`);
}

export async function runBaseline({ targetEnv = 'DEV', isExecute = false, dir = __dirname } = {}) {
    const { devUrl, prodUrl } = getDbUrls();
    const dbUrl = targetEnv === 'PRODUCTION' ? prodUrl : devUrl;
    if (!dbUrl) {
        console.error(`❌ Error: Database URL not found for environment: ${targetEnv}`);
        process.exit(1);
    }

    const files = getMigrationFiles(dir);
    console.log(`\n======================================================================`);
    console.log(`📌 Establishing Migration Baseline for [${targetEnv}]`);
    console.log(`🎯 Mode: ${isExecute ? 'EXECUTE' : 'DRY-RUN'}`);
    console.log(`📁 Historical migrations discovered: ${files.length}`);
    console.log(`======================================================================\n`);

    const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    await client.connect();
    await ensureTrackingTable(client);

    const applied = await getAppliedMigrations(client);
    let inserted = 0;

    for (const file of files) {
        if (!applied.has(file)) {
            const filePath = path.join(dir, file);
            const checksum = computeFileChecksum(filePath);
            if (isExecute) {
                await client.query(`
                    INSERT INTO public._schema_migrations (version, name, checksum, applied_at, execution_time_ms)
                    VALUES ($1, $2, $3, NOW(), 0)
                    ON CONFLICT (version) DO NOTHING;
                `, [file, file.replace(/\.sql$/, ''), checksum]);
            }
            inserted++;
            console.log(`   ${isExecute ? 'Recorded' : 'Would record'}: ${file}`);
        }
    }

    await client.end();
    console.log(`\n🎉 Baseline established: ${inserted} migration(s) ${isExecute ? 'recorded' : 'simulated'} in [${targetEnv}].\n`);
}

// CLI Command Router
async function main() {
    const args = process.argv.slice(2);
    const cmd = args[0] || 'status';
    const isExecute = args.includes('--execute');
    const isProd = args.includes('--prod');

    if (cmd === 'status') {
        console.log(`\n========================================================================================================`);
        console.log(`📊 Supabase Schema Migration Status (DEV vs PRODUCTION)`);
        console.log(`========================================================================================================\n`);

        const { rows, catchupNeeded, totalFiles } = await checkMigrationStatus();

        console.log('MIGRATION FILE'.padEnd(46) + ' | ' + 'DEV STATUS'.padEnd(20) + ' | ' + 'PROD STATUS'.padEnd(20) + ' | ' + 'STATE');
        console.log('-'.repeat(104));

        for (const r of rows) {
            console.log(`${r.file.padEnd(46)} | ${r.devStatus.padEnd(20)} | ${r.prodStatus.padEnd(20)} | ${r.state}`);
        }

        console.log('-'.repeat(104));
        console.log(`Total Migrations: ${totalFiles} | Pending Catch-up for PROD: ${catchupNeeded.length}\n`);

        if (catchupNeeded.length > 0) {
            console.log(`⚠️  ${catchupNeeded.length} migration(s) applied in DEV need to be caught up in PROD:`);
            for (const item of catchupNeeded) {
                console.log(`   - ${item.file}`);
            }
            console.log(`\n💡 To catch up production, run:`);
            console.log(`   npm run migrate:catchup\n`);
        } else {
            console.log(`✨ All migrations are in sync!\n`);
        }
    } else if (cmd === 'catchup') {
        await runCatchup({ isExecute });
    } else if (cmd === 'baseline') {
        const targetEnv = isProd ? 'PRODUCTION' : 'DEV';
        await runBaseline({ targetEnv, isExecute });
    } else {
        console.log(`\nUnknown command: ${cmd}`);
        console.log(`Available commands:`);
        console.log(`  node supabase/migrations/migrate.js status`);
        console.log(`  node supabase/migrations/migrate.js catchup [--execute]`);
        console.log(`  node supabase/migrations/migrate.js baseline [--prod] [--execute]\n`);
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main();
}
