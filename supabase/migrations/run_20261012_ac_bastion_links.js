/**
 * Database Migration Runner: AC Bastion Links Normalization
 * Target Tables: public.ac_bastion, public.ac_bastion_type
 *
 * Usage:
 *   node supabase/migrations/run_20261012_ac_bastion_links.js --dry-run
 *   node supabase/migrations/run_20261012_ac_bastion_links.js --execute
 *   node supabase/migrations/run_20261012_ac_bastion_links.js --dry-run --prod
 *   node supabase/migrations/run_20261012_ac_bastion_links.js --execute --prod
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
        dbUrl = process.env.PROD_DB_URL || process.env.TARGET_DB_URL;
        targetEnvName = 'PRODUCTION';
    } else {
        dbUrl = process.env.SOURCE_DB_URL || process.env.TARGET_DB_URL;
        targetEnvName = 'DEV';
    }
}

if (!dbUrl) {
    console.error(`Error: DB connection URL not found in environment for ${targetEnvName}`);
    process.exit(1);
}

const isExecute = process.argv.includes('--execute');
const isDryRun = process.argv.includes('--dry-run') || !isExecute;

const sqlFilePath = path.resolve(__dirname, '20261012_ac_bastion_links.sql');
const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

async function run() {
    console.log(`Starting AC Bastion Links migration runner [Target: ${targetEnvName}, Mode: ${isExecute ? 'EXECUTE (COMMIT)' : 'DRY-RUN (ROLLBACK)'}]...`);

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

        // -----------------------------------------------------------------------
        // Verification Checks
        // -----------------------------------------------------------------------
        console.log('\n--- Running Verification Checklist ---');
        let allPassed = true;

        // Check 1: Row count integrity on ac_bastion_type
        const typeCountRes = await client.query('SELECT count(*) FROM public.ac_bastion_type;');
        const typeCount = parseInt(typeCountRes.rows[0].count, 10);
        if (typeCount === 4) {
            console.log(`[PASS] Check 1: public.ac_bastion_type contains exactly 4 records.`);
        } else {
            console.error(`[FAIL] Check 1: Expected 4 records in public.ac_bastion_type, got ${typeCount}.`);
            allPassed = false;
        }

        // Check 2: Row count integrity on ac_bastion
        const bastionCountRes = await client.query('SELECT count(*) FROM public.ac_bastion;');
        const bastionCount = parseInt(bastionCountRes.rows[0].count, 10);
        if (bastionCount === 66) {
            console.log(`[PASS] Check 2: public.ac_bastion contains exactly 66 facility records.`);
        } else {
            console.error(`[FAIL] Check 2: Expected 66 records in public.ac_bastion, got ${bastionCount}.`);
            allPassed = false;
        }

        // Check 3: Relative links in ac_bastion_type
        const b1Res = await client.query("SELECT notes FROM public.ac_bastion_type WHERE check_id = 'BASC_0001';");
        const b3Res = await client.query("SELECT notes FROM public.ac_bastion_type WHERE check_id = 'BASC_0003';");
        const b1Notes = b1Res.rows[0]?.notes || '';
        const b3Notes = b3Res.rows[0]?.notes || '';

        if (b1Notes.includes('[Appendix B of the Player Guidelines](/playersguide/appendices/bastions/)') &&
            b3Notes.includes('[Appendix B of the Player Guidelines](/playersguide/appendices/bastions/)') &&
            b3Notes.includes('[Crafting Magic Item](/allowed-content/#downtime)')) {
            console.log(`[PASS] Check 3: Category rules contain normalized relative links.`);
        } else {
            console.error(`[FAIL] Check 3: Category notes missing expected relative links.`);
            allPassed = false;
        }

        // Check 4: Equipment links in ac_bastion
        const equipLinkRes = await client.query("SELECT check_id, name FROM public.ac_bastion WHERE notes_advice LIKE '%[Equipment](/allowed-content/#equipment)%';");
        if (equipLinkRes.rows.length >= 7) {
            console.log(`[PASS] Check 4: ${equipLinkRes.rows.length} facilities verified with [Equipment](/allowed-content/#equipment) links.`);
        } else {
            console.error(`[FAIL] Check 4: Expected >= 7 facilities with Equipment links, got ${equipLinkRes.rows.length}.`);
            allPassed = false;
        }

        // Check 5: Downtime links in ac_bastion
        const dtLinkRes = await client.query("SELECT check_id, name FROM public.ac_bastion WHERE notes_advice LIKE '%(/allowed-content/#downtime)%';");
        if (dtLinkRes.rows.length >= 8) {
            console.log(`[PASS] Check 5: ${dtLinkRes.rows.length} facilities verified with Downtime links.`);
        } else {
            console.error(`[FAIL] Check 5: Expected >= 8 facilities with Downtime links, got ${dtLinkRes.rows.length}.`);
            allPassed = false;
        }

        // Check 6: Loot links in ac_bastion
        const lootLinkRes = await client.query("SELECT check_id, name FROM public.ac_bastion WHERE notes_advice LIKE '%(/allowed-content/#loot)%';");
        if (lootLinkRes.rows.length >= 4) {
            console.log(`[PASS] Check 6: ${lootLinkRes.rows.length} facilities verified with Loot links.`);
        } else {
            console.error(`[FAIL] Check 6: Expected >= 4 facilities with Loot links, got ${lootLinkRes.rows.length}.`);
            allPassed = false;
        }

        // Check 7: Monsters and Other Rewards links in ac_bastion
        const monLinkRes = await client.query("SELECT check_id, name FROM public.ac_bastion WHERE check_id = 'BAS_0050' AND notes_advice LIKE '%[Monsters](/allowed-content/#monsters)%';");
        const rewLinkRes = await client.query("SELECT check_id, name FROM public.ac_bastion WHERE check_id = 'BAS_0059' AND notes_advice LIKE '%[Allowed Content: Other Rewards (Dark Gifts)](/allowed-content/#other-rewards)%';");
        if (monLinkRes.rows.length === 1 && rewLinkRes.rows.length === 1) {
            console.log(`[PASS] Check 7: Menagerie (BAS_0050) and Liminal Space (BAS_0059) verified with Monsters and Other Rewards links.`);
        } else {
            console.error(`[FAIL] Check 7: Missing Monsters or Other Rewards links.`);
            allPassed = false;
        }

        // Check 8: War Room Appendix B link
        const warRoomRes = await client.query("SELECT check_id, name FROM public.ac_bastion WHERE check_id = 'BAS_0061' AND notes_advice LIKE '%[Appendix B of the Player Guidelines](/playersguide/appendices/bastions/)%';");
        if (warRoomRes.rows.length === 1) {
            console.log(`[PASS] Check 8: War Room (BAS_0061) verified with Player Guidelines Appendix B link.`);
        } else {
            console.error(`[FAIL] Check 8: War Room missing expected Appendix B link.`);
            allPassed = false;
        }

        if (!allPassed) {
            throw new Error('One or more verification checks failed.');
        }

        if (isExecute) {
            await client.query('COMMIT;');
            console.log(`\n>>> SUCCESS: All checks passed. Changes COMMITTED to ${targetEnvName}.`);
        } else {
            await client.query('ROLLBACK;');
            console.log(`\n>>> DRY-RUN COMPLETE: All checks passed. Transaction safely ROLLED BACK.`);
        }

    } catch (err) {
        try {
            await client.query('ROLLBACK;');
        } catch (_) {}
        console.error(`\n>>> ERROR running migration against ${targetEnvName}:`, err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();
