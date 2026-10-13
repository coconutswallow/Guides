/**
 * Database Migration Runner: AC Other Rewards Description Links
 * Target Tables: public.ac_other_rewards, public.ac_loot
 *
 * Usage:
 *   node supabase/migrations/run_20261012_ac_other_rewards_description_links.js --dry-run
 *   node supabase/migrations/run_20261012_ac_other_rewards_description_links.js --execute
 *   node supabase/migrations/run_20261012_ac_other_rewards_description_links.js --dry-run --prod
 *   node supabase/migrations/run_20261012_ac_other_rewards_description_links.js --execute --prod
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

const migrationFile = path.resolve(__dirname, '20261012_ac_other_rewards_description_links.sql');
if (!fs.existsSync(migrationFile)) {
    console.error(`Error: Migration SQL file not found at ${migrationFile}`);
    process.exit(1);
}

const sqlContent = fs.readFileSync(migrationFile, 'utf8');

async function run() {
    console.log(`====================================================`);
    console.log(`Migration Runner: AC Other Rewards Description Links`);
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

    // 1. Total row count in ac_other_rewards
    const totalRes = await client.query('SELECT count(*) FROM public.ac_other_rewards;');
    console.log(`Other rewards total rows: ${totalRes.rows[0].count} (Expected: 385)`);
    if (parseInt(totalRes.rows[0].count, 10) !== 385) {
        throw new Error(`Total count mismatch! Expected 385, got ${totalRes.rows[0].count}`);
    }

    // 2. Deity external D&D Beyond links
    const deityRes = await client.query("SELECT count(*) FROM public.ac_other_rewards WHERE description LIKE '%[Forgotten Realms: Heroes of Faerûn](https://www.dndbeyond.com/sources/dnd/frhof)%';");
    console.log(`Deity markdown linked count: ${deityRes.rows[0].count} (Expected: 14)`);
    if (parseInt(deityRes.rows[0].count, 10) !== 14) {
        throw new Error(`Deity link count mismatch! Expected 14, got ${deityRes.rows[0].count}`);
    }

    // 3. Flourishing Favor (REW_0353) Monsters link
    const ffRes = await client.query("SELECT description FROM public.ac_other_rewards WHERE check_id = 'REW_0353';");
    if (!ffRes.rows[0].description.includes('[Fair Game](/allowed-content/#monsters)')) {
        throw new Error(`REW_0353 missing Fair Game link!`);
    }
    console.log(`REW_0353 Flourishing Favor contains [Fair Game](/allowed-content/#monsters): true`);

    // 4. Renown Rewards (UUC) (REW_0357) Loot links
    const uucRes = await client.query("SELECT description FROM public.ac_other_rewards WHERE check_id = 'REW_0357';");
    if (!uucRes.rows[0].description.includes('Allowed Content ([Loot](/allowed-content/#loot))')) {
        throw new Error(`REW_0357 missing Loot link!`);
    }
    console.log(`REW_0357 Renown Rewards (UUC) contains [Loot](/allowed-content/#loot): true`);

    // 5. Equipment links in REW_0229 and REW_0345
    const eq1 = await client.query("SELECT description FROM public.ac_other_rewards WHERE check_id = 'REW_0229';");
    if (!eq1.rows[0].description.includes('[Equipment](/allowed-content/#equipment)')) {
        throw new Error(`REW_0229 missing Equipment link!`);
    }
    const eq2 = await client.query("SELECT description FROM public.ac_other_rewards WHERE check_id = 'REW_0345';");
    if (!eq2.rows[0].description.includes('[Equipment](/allowed-content/#equipment)')) {
        throw new Error(`REW_0345 missing Equipment link!`);
    }
    console.log(`REW_0229 & REW_0345 contain [Equipment](/allowed-content/#equipment): true`);

    // 6. Bastions link in REW_0348
    const basRes = await client.query("SELECT description FROM public.ac_other_rewards WHERE check_id = 'REW_0348';");
    if (!basRes.rows[0].description.includes('[War Room](/allowed-content/#bastions)')) {
        throw new Error(`REW_0348 missing War Room Bastion link!`);
    }
    console.log(`REW_0348 Legate's Legions contains [War Room](/allowed-content/#bastions): true`);

    // 7. Talisman of the Gauntlet (LOT_1073) notes_advice in ac_loot
    const talRes = await client.query("SELECT notes_advice FROM public.ac_loot WHERE check_id = 'LOT_1073';");
    if (!talRes.rows[0].notes_advice || !talRes.rows[0].notes_advice.includes('[Order of the Gauntlet](/allowed-content/#other-rewards)')) {
        throw new Error(`LOT_1073 missing Order of the Gauntlet link in notes_advice!`);
    }
    console.log(`LOT_1073 Talisman of the Gauntlet notes_advice restored with [Order of the Gauntlet](/allowed-content/#other-rewards): true`);

    console.log(`\nVerification completed successfully! All audit checks passed 100%.\n`);
}

run();
