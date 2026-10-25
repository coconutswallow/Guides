/**
 * Database Migration Runner: AC Loot Notes Re-alignment
 * Target Table: public.ac_loot
 *
 * Description:
 * Re-aligns public.ac_loot notes_advice with the canonical spreadsheet Allowed_Content_20261004.xlsx.
 * Fixes the off-by-one / off-by-two shift caused by missing check_ids in Column P for
 * Zhentarim Token (HB) and Hawthorne Cape (HB), restores omitted notes, clears false notes,
 * and restores overwritten Rod of Absorption notes.
 *
 * Usage:
 *   node supabase/migrations/run_20261025_ac_loot_notes_realignment.js --dry-run
 *   node supabase/migrations/run_20261025_ac_loot_notes_realignment.js --execute
 *   node supabase/migrations/run_20261025_ac_loot_notes_realignment.js --dry-run --prod
 *   node supabase/migrations/run_20261025_ac_loot_notes_realignment.js --execute --prod
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

const migrationFile = path.resolve(__dirname, '20261025_ac_loot_notes_realignment.sql');
if (!fs.existsSync(migrationFile)) {
    console.error(`Error: Migration SQL file not found at ${migrationFile}`);
    process.exit(1);
}

const sqlContent = fs.readFileSync(migrationFile, 'utf8');

async function run() {
    console.log(`====================================================`);
    console.log(`Migration Runner: AC Loot Notes Re-alignment`);
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

    // 1. Total row count in ac_loot
    const totalRes = await client.query('SELECT count(*) FROM public.ac_loot;');
    console.log(`Loot total rows: ${totalRes.rows[0].count} (Expected: 1358)`);
    if (parseInt(totalRes.rows[0].count, 10) !== 1358) {
        throw new Error(`Total count mismatch! Expected 1358, got ${totalRes.rows[0].count}`);
    }

    // 2. Count of rows with notes_advice populated
    const notesRes = await client.query('SELECT count(*) FROM public.ac_loot WHERE notes_advice IS NOT NULL;');
    console.log(`Loot rows with notes_advice: ${notesRes.rows[0].count} (Expected: 681)`);
    if (parseInt(notesRes.rows[0].count, 10) !== 681) {
        throw new Error(`Notes count mismatch! Expected 681, got ${notesRes.rows[0].count}`);
    }

    // 3. Renown faction links in notes_advice
    const renownRes = await client.query("SELECT count(*) FROM public.ac_loot WHERE notes_advice LIKE '%/allowed-content/#other-rewards%';");
    console.log(`Loot rows with Other Rewards renown links: ${renownRes.rows[0].count} (Expected: 40)`);
    if (parseInt(renownRes.rows[0].count, 10) !== 40) {
        throw new Error(`Renown link count mismatch! Expected 40, got ${renownRes.rows[0].count}`);
    }

    // 4. Discord event links in notes_advice
    const discordRes = await client.query("SELECT count(*) FROM public.ac_loot WHERE notes_advice LIKE '%discord.com%';");
    console.log(`Loot rows with Discord event links: ${discordRes.rows[0].count} (Expected: 146)`);
    if (parseInt(discordRes.rows[0].count, 10) !== 146) {
        throw new Error(`Discord link count mismatch! Expected 146, got ${discordRes.rows[0].count}`);
    }

    // 5. Equipment links in notes_advice
    const eqRes = await client.query("SELECT count(*) FROM public.ac_loot WHERE notes_advice LIKE '%[Equipment](/allowed-content/#equipment)%';");
    console.log(`Loot rows with Equipment links: ${eqRes.rows[0].count} (Expected: 4)`);
    if (parseInt(eqRes.rows[0].count, 10) !== 4) {
        throw new Error(`Equipment link count mismatch! Expected 4, got ${eqRes.rows[0].count}`);
    }

    // 6. Downtime links in notes_advice
    const dtRes = await client.query("SELECT count(*) FROM public.ac_loot WHERE notes_advice LIKE '%[Downtime](/allowed-content/#downtime)%' OR notes_advice LIKE '%[downtime](/allowed-content/#downtime)%';");
    console.log(`Loot rows with Downtime links: ${dtRes.rows[0].count} (Expected: 2)`);
    if (parseInt(dtRes.rows[0].count, 10) !== 2) {
        throw new Error(`Downtime link count mismatch! Expected 2, got ${dtRes.rows[0].count}`);
    }

    // 7. Bastions links in notes_advice
    const basRes = await client.query("SELECT count(*) FROM public.ac_loot WHERE notes_advice LIKE '%[Bastions](/allowed-content/#bastions)%';");
    console.log(`Loot rows with Bastions links: ${basRes.rows[0].count} (Expected: 1)`);
    if (parseInt(basRes.rows[0].count, 10) !== 1) {
        throw new Error(`Bastions link count mismatch! Expected 1, got ${basRes.rows[0].count}`);
    }

    // 8. Specific benchmark item checks
    // LOT_0175: Zhentarim Token (HB) -> must have notes restored with Zhentarim renown link
    const zhenRes = await client.query("SELECT name, notes_advice FROM public.ac_loot WHERE check_id = 'LOT_0175';");
    if (!zhenRes.rows[0] || zhenRes.rows[0].name !== 'Zhentarim Token (HB)' || !zhenRes.rows[0].notes_advice || !zhenRes.rows[0].notes_advice.includes('[Zhentarim](/allowed-content/#other-rewards)')) {
        throw new Error(`LOT_0175 (Zhentarim Token) validation failed!`);
    }
    console.log(`LOT_0175 (Zhentarim Token (HB)): Verified restored notes & Zhentarim link.`);

    // LOT_0177: Blasting Powder -> must be NULL (no shifted note from Blight Ichor)
    const blastRes = await client.query("SELECT name, notes_advice FROM public.ac_loot WHERE check_id = 'LOT_0177';");
    if (!blastRes.rows[0] || blastRes.rows[0].name !== 'Blasting Powder' || blastRes.rows[0].notes_advice !== null) {
        throw new Error(`LOT_0177 (Blasting Powder) validation failed! Expected NULL, got: ${blastRes.rows[0]?.notes_advice}`);
    }
    console.log(`LOT_0177 (Blasting Powder): Verified NULL notes (no shifted note).`);

    // LOT_0178: Blight Ichor -> must have Underdark fungi note
    const blightRes = await client.query("SELECT name, notes_advice FROM public.ac_loot WHERE check_id = 'LOT_0178';");
    if (!blightRes.rows[0] || blightRes.rows[0].name !== 'Blight Ichor' || !blightRes.rows[0].notes_advice.includes('Underdark fungi')) {
        throw new Error(`LOT_0178 (Blight Ichor) validation failed!`);
    }
    console.log(`LOT_0178 (Blight Ichor): Verified realigned Underdark fungi note.`);

    // LOT_1077: Rod of Absorption -> must have restored multisession cap note (not overwritten or shifted)
    const rodRes = await client.query("SELECT name, notes_advice FROM public.ac_loot WHERE check_id = 'LOT_1077';");
    if (!rodRes.rows[0] || rodRes.rows[0].name !== 'Rod of Absorption' || !rodRes.rows[0].notes_advice.includes('Rod of Absorption per APL 11+')) {
        throw new Error(`LOT_1077 (Rod of Absorption) validation failed! Got: ${rodRes.rows[0]?.notes_advice}`);
    }
    console.log(`LOT_1077 (Rod of Absorption): Verified restored Rod of Absorption note.`);

    // LOT_1078: +2 All-Purpose Tool -> must be NULL
    const aptRes = await client.query("SELECT name, notes_advice FROM public.ac_loot WHERE check_id = 'LOT_1078';");
    if (!aptRes.rows[0] || aptRes.rows[0].name !== '+2 All-Purpose Tool' || aptRes.rows[0].notes_advice !== null) {
        throw new Error(`LOT_1078 (+2 All-Purpose Tool) validation failed! Expected NULL, got: ${aptRes.rows[0]?.notes_advice}`);
    }
    console.log(`LOT_1078 (+2 All-Purpose Tool): Verified NULL notes.`);

    // LOT_1079: +2 Amulet of the Devout -> must have cleric and paladin note
    const amuRes = await client.query("SELECT name, notes_advice FROM public.ac_loot WHERE check_id = 'LOT_1079';");
    if (!amuRes.rows[0] || amuRes.rows[0].name !== '+2 Amulet of the Devout' || !amuRes.rows[0].notes_advice.includes('cleric and paladin spells')) {
        throw new Error(`LOT_1079 (+2 Amulet of the Devout) validation failed!`);
    }
    console.log(`LOT_1079 (+2 Amulet of the Devout): Verified cleric and paladin note.`);

    // LOT_1232: The Spirit of Joy -> must have melowyny / 2026 Festival of Joy note
    const joyRes = await client.query("SELECT name, notes_advice FROM public.ac_loot WHERE check_id = 'LOT_1232';");
    if (!joyRes.rows[0] || joyRes.rows[0].name !== 'The Spirit of Joy' || !joyRes.rows[0].notes_advice.includes('melowyny')) {
        throw new Error(`LOT_1232 (The Spirit of Joy) validation failed!`);
    }
    console.log(`LOT_1232 (The Spirit of Joy): Verified melowyny pet note.`);

    // LOT_1233: Hawthorne Cape (HB) -> must have restored February 2025 announcement link
    const capeRes = await client.query("SELECT name, notes_advice FROM public.ac_loot WHERE check_id = 'LOT_1233';");
    if (!capeRes.rows[0] || capeRes.rows[0].name !== 'Hawthorne Cape (HB)' || !capeRes.rows[0].notes_advice || !capeRes.rows[0].notes_advice.includes('1345411866394099765')) {
        throw new Error(`LOT_1233 (Hawthorne Cape) validation failed!`);
    }
    console.log(`LOT_1233 (Hawthorne Cape (HB)): Verified restored February 2025 announcement note.`);

    console.log(`\nVerification completed successfully! All audit checks passed 100%.\n`);
}

run();
