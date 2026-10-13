/**
 * Database Migration Runner: AC Equipment Links Normalization
 * Target Tables: public.ac_equipment, public.ac_equip_type, public.ac_equipment_categories
 *
 * Usage:
 *   node supabase/migrations/run_20261012_ac_equipment_links.js --dry-run
 *   node supabase/migrations/run_20261012_ac_equipment_links.js --execute
 *   node supabase/migrations/run_20261012_ac_equipment_links.js --dry-run --prod
 *   node supabase/migrations/run_20261012_ac_equipment_links.js --execute --prod
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
        dbUrl = process.env.DEV_DB_URL || process.env.SOURCE_DB_URL;
        targetEnvName = 'DEV';
    }
}

if (!dbUrl) {
    console.error(`Error: Database connection URL not found for ${targetEnvName}.`);
    process.exit(1);
}

const isExecute = process.argv.includes('--execute');
const isDryRun = process.argv.includes('--dry-run') || !isExecute;

async function run() {
    console.log(`====================================================`);
    console.log(`Starting AC Equipment Links Migration`);
    console.log(`Environment: ${targetEnvName}`);
    console.log(`Mode:        ${isExecute ? 'EXECUTE (Commit changes)' : 'DRY RUN (Rollback)'}`);
    console.log(`====================================================`);

    const client = new pg.Client({ connectionString: dbUrl });
    try {
        await client.connect();

        const sqlFile = path.resolve(__dirname, '20261012_ac_equipment_links.sql');
        const sqlContent = fs.readFileSync(sqlFile, 'utf8');

        await client.query('BEGIN;');

        const cleanSql = sqlContent
            .replace(/^\s*BEGIN\s*;/im, '')
            .replace(/^\s*COMMIT\s*;/im, '');

        await client.query(cleanSql);

        // Verification Checks
        console.log('\n--- Running Post-Migration Verification Checks ---');
        let allPassed = true;

        // Check 1: Record counts
        const countRes = await client.query('SELECT count(*) FROM public.ac_equipment;');
        const eqCount = parseInt(countRes.rows[0].count, 10);
        if (eqCount === 490) {
            console.log(`[PASS] Check 1: public.ac_equipment count is exactly 490.`);
        } else {
            console.error(`[FAIL] Check 1: Expected 490 rows in public.ac_equipment, found ${eqCount}.`);
            allPassed = false;
        }

        // Check 2: Category notes Bastion link
        const typeRes = await client.query("SELECT notes FROM public.ac_equip_type WHERE name = 'Siege Ammunition and Weapons';");
        const catRes = await client.query("SELECT notes FROM public.ac_equipment_categories WHERE name = 'Siege Ammunition and Weapons';");
        if (typeRes.rows[0]?.notes.includes('[Bastion](/allowed-content/#bastions)') &&
            catRes.rows[0]?.notes.includes('[Bastion](/allowed-content/#bastions)')) {
            console.log(`[PASS] Check 2: Siege Ammunition category rules verified with [Bastion](/allowed-content/#bastions) link.`);
        } else {
            console.error(`[FAIL] Check 2: Siege Ammunition category rules missing Bastion link.`);
            allPassed = false;
        }

        // Check 3: Loot tab links (Lance, Adventurer's Ring, Mechanical Wonder, Prosthetic Limb)
        const lootRes = await client.query("SELECT check_id FROM public.ac_equipment WHERE notes_advice LIKE '%(/allowed-content/#loot)%';");
        if (lootRes.rows.length === 4) {
            console.log(`[PASS] Check 3: Exactly 4 equipment items verified with [Loot](/allowed-content/#loot) links.`);
        } else {
            console.error(`[FAIL] Check 3: Expected 4 items with Loot links, found ${lootRes.rows.length}.`);
            allPassed = false;
        }

        // Check 4: Downtime links (Cheese Bag, Infernal War Machines, Hot Air Balloon, Nautiloid)
        const dtRes = await client.query("SELECT check_id FROM public.ac_equipment WHERE notes_advice LIKE '%(/allowed-content/#downtime)%';");
        if (dtRes.rows.length === 6) {
            console.log(`[PASS] Check 4: Exactly 6 equipment items verified with [Downtime](/allowed-content/#downtime) links.`);
        } else {
            console.error(`[FAIL] Check 4: Expected 6 items with Downtime links, found ${dtRes.rows.length}.`);
            allPassed = false;
        }

        // Check 5: Bastion links (Vehicles and Demiplane cube)
        const basRes = await client.query("SELECT check_id FROM public.ac_equipment WHERE notes_advice LIKE '%(/allowed-content/#bastions)%';");
        if (basRes.rows.length === 8) {
            console.log(`[PASS] Check 5: Exactly 8 equipment items verified with [Bastions](/allowed-content/#bastions) links.`);
        } else {
            console.error(`[FAIL] Check 5: Expected 8 items with Bastions links, found ${basRes.rows.length}.`);
            allPassed = false;
        }

        // Check 6: Pet Description links (Playful Pulp, Songbird)
        const pulpRes = await client.query("SELECT description FROM public.ac_equipment WHERE check_id = 'EQP_0453';");
        const birdRes = await client.query("SELECT description FROM public.ac_equipment WHERE check_id = 'EQP_0459';");
        if (pulpRes.rows[0]?.description.includes('[Hawthorne Field Guide](/monsters/)') &&
            birdRes.rows[0]?.description.includes('[Hawthorne Arcana](https://drive.google.com/file/d/1yoinFa31Rhq__unHxMxCSfMq7QY5ARYC/view)')) {
            console.log(`[PASS] Check 6: Playful Pulp and Songbird verified with monsters relative link & drive external link.`);
        } else {
            console.error(`[FAIL] Check 6: Pet description links failed.`);
            allPassed = false;
        }

        // Check 7: Dragon Magazine & Eberron external links
        const forkRes = await client.query("SELECT notes_advice FROM public.ac_equipment WHERE check_id = 'EQP_0487';");
        const eberronRes = await client.query("SELECT check_id FROM public.ac_equipment WHERE notes_advice LIKE '%(https://www.dndbeyond.com/sources/dnd/efota)%';");
        if (forkRes.rows[0]?.notes_advice.includes('https://archive.org/details/DragonMagazine260_201801/DragonMagazine120/page/n43/mode/2up') &&
            eberronRes.rows.length === 3) {
            console.log(`[PASS] Check 7: Tuning Fork (archive.org) and 3 Eberron Airships (dndbeyond) external links verified.`);
        } else {
            console.error(`[FAIL] Check 7: External links verification failed.`);
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
