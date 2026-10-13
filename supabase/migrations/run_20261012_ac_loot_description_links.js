/**
 * Database Migration Runner: AC Loot Description Links
 * Target Table: public.ac_loot
 *
 * Usage:
 *   node supabase/migrations/run_20261012_ac_loot_description_links.js --dry-run
 *   node supabase/migrations/run_20261012_ac_loot_description_links.js --execute
 *   node supabase/migrations/run_20261012_ac_loot_description_links.js --dry-run --prod
 *   node supabase/migrations/run_20261012_ac_loot_description_links.js --execute --prod
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

const args = process.argv.slice(2);
const isProd = args.includes('--prod');
const isExecute = args.includes('--execute');
const isDryRun = args.includes('--dry-run') || !isExecute;

const connectionString = isProd
    ? (process.env.PROD_DB_URL || process.env.TARGET_DB_URL)
    : process.env.SOURCE_DB_URL;

const envName = isProd ? 'PRODUCTION' : 'DEVELOPMENT';

if (!connectionString) {
    console.error(`Error: Database connection string not found for ${envName}.`);
    process.exit(1);
}

const migrationFile = path.resolve(__dirname, '20261012_ac_loot_description_links.sql');
if (!fs.existsSync(migrationFile)) {
    console.error(`Error: Migration SQL file not found at ${migrationFile}`);
    process.exit(1);
}

const sqlContent = fs.readFileSync(migrationFile, 'utf8');

async function run() {
    console.log(`====================================================`);
    console.log(`Migration Runner: AC Loot Description Links`);
    console.log(`Environment:      ${envName}`);
    console.log(`Mode:             ${isExecute ? 'EXECUTE' : 'DRY-RUN'}`);
    console.log(`SQL File:         ${path.basename(migrationFile)}`);
    console.log(`====================================================\n`);

    const client = new pg.Client({
        connectionString,
        statement_timeout: 120000
    });

    try {
        await client.connect();
        console.log(`Successfully connected to ${envName} database.`);

        if (isDryRun) {
            console.log(`\nStarting DRY-RUN (wrapping in transaction and ROLLBACK)...`);
            await client.query('BEGIN;');
            const startTime = Date.now();
            await client.query(sqlContent);
            const duration = Date.now() - startTime;
            console.log(`SQL migration executed cleanly in ${duration}ms.`);

            await verify(client);

            await client.query('ROLLBACK;');
            console.log(`\nTransaction rolled back successfully. Dry-run verified without modifying data.`);
        } else {
            console.log(`\nExecuting migration for real...`);
            const startTime = Date.now();
            await client.query(sqlContent);
            const duration = Date.now() - startTime;
            console.log(`SQL migration committed cleanly in ${duration}ms.`);

            await verify(client);
            console.log(`\nMigration completed and verified successfully on ${envName}!`);
        }
    } catch (err) {
        console.error(`\nMigration failed with error:`);
        console.error(err);
        try {
            await client.query('ROLLBACK;');
        } catch (_) {}
        process.exit(1);
    } finally {
        await client.end();
    }
}

async function verify(client) {
    console.log(`\n--- Verification & Data Integrity Audit ---`);

    // 1. Table total count
    const totalRes = await client.query('SELECT count(*) FROM public.ac_loot;');
    console.log(`Loot total rows: ${totalRes.rows[0].count} (Expected: 1358)`);
    if (parseInt(totalRes.rows[0].count, 10) !== 1358) {
        throw new Error(`Total count mismatch! Expected 1358, got ${totalRes.rows[0].count}`);
    }

    // 2. Fluff Puffle pet link in LOT_1232
    const fpRes = await client.query("SELECT check_id, description FROM public.ac_loot WHERE check_id = 'LOT_1232';");
    if (fpRes.rows.length === 0) throw new Error('LOT_1232 not found!');
    const fpDesc = fpRes.rows[0].description;
    const hasFpLink = fpDesc.includes('[Fluff Puffle](/monsters/#fluff-puffle)');
    console.log(`LOT_1232 Fluff Puffle link present: ${hasFpLink}`);
    if (!hasFpLink) throw new Error(`LOT_1232 missing [Fluff Puffle](/monsters/#fluff-puffle) link! Current desc snippet: ${fpDesc.slice(-100)}`);

    // 3. Equipment links
    const eqLinkedRes = await client.query("SELECT count(*) FROM public.ac_loot WHERE description LIKE '%See [Equipment](/allowed-content/#equipment)%';");
    const eqUnlinkedRes = await client.query("SELECT count(*) FROM public.ac_loot WHERE description LIKE '%See Equipment%' AND description NOT LIKE '%See [Equipment]%';");
    console.log(`Equipment linked items count:   ${eqLinkedRes.rows[0].count} (Expected: 118)`);
    console.log(`Equipment unlinked items count: ${eqUnlinkedRes.rows[0].count} (Expected: 0)`);
    if (parseInt(eqLinkedRes.rows[0].count, 10) !== 118) {
        throw new Error(`Equipment linked count mismatch! Expected 118, got ${eqLinkedRes.rows[0].count}`);
    }
    if (parseInt(eqUnlinkedRes.rows[0].count, 10) !== 0) {
        throw new Error(`Equipment unlinked count mismatch! Expected 0, got ${eqUnlinkedRes.rows[0].count}`);
    }

    // 4. Downtime links
    const dtLinkedRes = await client.query("SELECT count(*) FROM public.ac_loot WHERE description LIKE '%See [Downtime](/allowed-content/#downtime)%';");
    const dtUnlinkedRes = await client.query("SELECT count(*) FROM public.ac_loot WHERE description LIKE '%See Downtime%' AND description NOT LIKE '%See [Downtime]%';");
    console.log(`Downtime linked items count:    ${dtLinkedRes.rows[0].count} (Expected: 4)`);
    console.log(`Downtime unlinked items count:  ${dtUnlinkedRes.rows[0].count} (Expected: 0)`);
    if (parseInt(dtLinkedRes.rows[0].count, 10) !== 4) {
        throw new Error(`Downtime linked count mismatch! Expected 4, got ${dtLinkedRes.rows[0].count}`);
    }
    if (parseInt(dtUnlinkedRes.rows[0].count, 10) !== 0) {
        throw new Error(`Downtime unlinked count mismatch! Expected 0, got ${dtUnlinkedRes.rows[0].count}`);
    }

    // 5. Non-reference items preserved intact
    const nonRefRes = await client.query("SELECT check_id, description FROM public.ac_loot WHERE check_id IN ('LOT_0067', 'LOT_0433');");
    for (const row of nonRefRes.rows) {
        if (!row.description.includes('clean yourself and any equipment')) {
            throw new Error(`Non-reference row ${row.check_id} was corrupted!`);
        }
        if (row.description.includes('[equipment]') || row.description.includes('[Equipment]')) {
            throw new Error(`Non-reference row ${row.check_id} should not have equipment bracketed!`);
        }
    }
    console.log(`Non-reference rows (LOT_0067, LOT_0433) preserved cleanly without unwanted links.`);
    console.log(`Verification completed successfully! All audit checks passed 100%.\n`);
}

run();
