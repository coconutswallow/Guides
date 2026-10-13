/**
 * Database Migration Runner: Replace external Hawthorne Arcana links with /arcana/
 * Target Tables: public.ac_feats, public.ac_spells, public.ac_equipment, public.ac_monsters_legacy_backup
 *
 * Usage:
 *   node supabase/migrations/run_20261012_ac_arcana_links_global.js --dry-run
 *   node supabase/migrations/run_20261012_ac_arcana_links_global.js --execute
 *   node supabase/migrations/run_20261012_ac_arcana_links_global.js --dry-run --prod
 *   node supabase/migrations/run_20261012_ac_arcana_links_global.js --execute --prod
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
    console.log(`Starting Global Hawthorne Arcana Link Migration`);
    console.log(`Environment: ${targetEnvName}`);
    console.log(`Mode:        ${isExecute ? 'EXECUTE (Commit changes)' : 'DRY RUN (Rollback)'}`);
    console.log(`====================================================`);

    const client = new pg.Client({ connectionString: dbUrl });
    try {
        await client.connect();

        const sqlFile = path.resolve(__dirname, '20261012_ac_arcana_links_global.sql');
        const sqlContent = fs.readFileSync(sqlFile, 'utf8');

        await client.query('BEGIN;');

        const cleanSql = sqlContent
            .replace(/^\s*BEGIN\s*;/im, '')
            .replace(/^\s*COMMIT\s*;/im, '');

        await client.query(cleanSql);

        // Verification Checks
        console.log('\n--- Running Post-Migration Verification Checks ---');
        let allPassed = true;

        // Check 1: Record counts in primary AC tables preserved
        const featsCountRes = await client.query('SELECT count(*) FROM public.ac_feats;');
        const featsTotal = parseInt(featsCountRes.rows[0].count, 10);
        if (featsTotal === 346) {
            console.log(`[PASS] Check 1a: ac_feats count preserved (${featsTotal} feats).`);
        } else {
            console.error(`[FAIL] Check 1a: Expected 346 feats, found ${featsTotal}.`);
            allPassed = false;
        }

        const spellsCountRes = await client.query('SELECT count(*) FROM public.ac_spells;');
        const spellsTotal = parseInt(spellsCountRes.rows[0].count, 10);
        if (spellsTotal === 20) {
            console.log(`[PASS] Check 1b: ac_spells count preserved (${spellsTotal} spells).`);
        } else {
            console.error(`[FAIL] Check 1b: Expected 20 spells, found ${spellsTotal}.`);
            allPassed = false;
        }

        const equipCountRes = await client.query('SELECT count(*) FROM public.ac_equipment;');
        const equipTotal = parseInt(equipCountRes.rows[0].count, 10);
        if (equipTotal === 490) {
            console.log(`[PASS] Check 1c: ac_equipment count preserved (${equipTotal} items).`);
        } else {
            console.error(`[FAIL] Check 1c: Expected 490 equipment, found ${equipTotal}.`);
            allPassed = false;
        }

        // Check 2: Feats verification (all 15 dragonmark/Siberys/Aberrant feats have [Hawthorne Arcana](/arcana/))
        const remainingFeatsDrive = await client.query("SELECT count(*) FROM public.ac_feats WHERE notes_advice LIKE '%1yoinFa31Rhq__unHxMxCSfMq7QY5ARYC%';");
        const remainingFeatsCount = parseInt(remainingFeatsDrive.rows[0].count, 10);
        if (remainingFeatsCount === 0) {
            console.log(`[PASS] Check 2a: 0 Google Drive links remaining in ac_feats.`);
        } else {
            console.error(`[FAIL] Check 2a: Expected 0 Drive links in ac_feats, found ${remainingFeatsCount}.`);
            allPassed = false;
        }

        const featsArcanaLinkRes = await client.query("SELECT count(*) FROM public.ac_feats WHERE notes_advice LIKE '%[Hawthorne Arcana](/arcana/)%';");
        const featsArcanaCount = parseInt(featsArcanaLinkRes.rows[0].count, 10);
        if (featsArcanaCount === 15) {
            console.log(`[PASS] Check 2b: Exactly 15 feats verified with [Hawthorne Arcana](/arcana/).`);
        } else {
            console.error(`[FAIL] Check 2b: Expected 15 feats with [Hawthorne Arcana](/arcana/), found ${featsArcanaCount}.`);
            allPassed = false;
        }

        // Check 3: Spells verification (SPL_0007 has /arcana/, 0 Drive links in ac_spells)
        const remainingSpellsDrive = await client.query("SELECT count(*) FROM public.ac_spells WHERE notes LIKE '%1yoinFa31Rhq__unHxMxCSfMq7QY5ARYC%';");
        const remainingSpellsCount = parseInt(remainingSpellsDrive.rows[0].count, 10);
        if (remainingSpellsCount === 0) {
            console.log(`[PASS] Check 3a: 0 Google Drive links remaining in ac_spells.`);
        } else {
            console.error(`[FAIL] Check 3a: Expected 0 Drive links in ac_spells, found ${remainingSpellsCount}.`);
            allPassed = false;
        }

        const spl07Res = await client.query("SELECT notes FROM public.ac_spells WHERE check_id = 'SPL_0007';");
        const spl07Notes = spl07Res.rows[0]?.notes || '';
        if (spl07Notes.includes('[Hawthorne Arcana](/arcana/)')) {
            console.log(`[PASS] Check 3b: SPL_0007 verified with [Hawthorne Arcana](/arcana/).`);
        } else {
            console.error(`[FAIL] Check 3b: SPL_0007 does not contain [Hawthorne Arcana](/arcana/):`, spl07Notes);
            allPassed = false;
        }

        // Check 4: Equipment verification (EQP_0459 has /arcana/, 0 Drive links in ac_equipment)
        const remainingEquipDrive = await client.query("SELECT count(*) FROM public.ac_equipment WHERE description LIKE '%1yoinFa31Rhq__unHxMxCSfMq7QY5ARYC%';");
        const remainingEquipCount = parseInt(remainingEquipDrive.rows[0].count, 10);
        if (remainingEquipCount === 0) {
            console.log(`[PASS] Check 4a: 0 Google Drive links remaining in ac_equipment.`);
        } else {
            console.error(`[FAIL] Check 4a: Expected 0 Drive links in ac_equipment, found ${remainingEquipCount}.`);
            allPassed = false;
        }

        const eqp459Res = await client.query("SELECT description FROM public.ac_equipment WHERE check_id = 'EQP_0459';");
        const eqp459Desc = eqp459Res.rows[0]?.description || '';
        if (eqp459Desc.includes('[Hawthorne Arcana](/arcana/)')) {
            console.log(`[PASS] Check 4b: EQP_0459 verified with [Hawthorne Arcana](/arcana/).`);
        } else {
            console.error(`[FAIL] Check 4b: EQP_0459 does not contain [Hawthorne Arcana](/arcana/):`, eqp459Desc);
            allPassed = false;
        }

        // Check 5: Global check across other ac_* tables
        const otherTables = ['ac_classes', 'ac_subclasses', 'ac_races', 'ac_subraces', 'ac_backgrounds', 'ac_sources', 'ac_downtime', 'ac_bastions', 'ac_loot', 'ac_item_properties', 'ac_other_rewards', 'ac_monsters'];
        for (const t of otherTables) {
            const colsRes = await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND data_type IN ('text', 'character varying');", [t]);
            for (const c of colsRes.rows) {
                const col = c.column_name;
                const r = await client.query('SELECT count(*) FROM public.' + t + ' WHERE "' + col + '" LIKE $1;', ['%1yoinFa31Rhq__unHxMxCSfMq7QY5ARYC%']);
                const count = parseInt(r.rows[0].count, 10);
                if (count > 0) {
                    console.error(`[FAIL] Check 5: Table ${t}.${col} still has ${count} Drive link(s).`);
                    allPassed = false;
                }
            }
        }
        if (allPassed) {
            console.log(`[PASS] Check 5: 0 Google Drive Arcana links across all other Allowed Content tables.`);
        }

        if (!allPassed) {
            throw new Error('Post-migration verification checks failed.');
        }

        if (isExecute) {
            await client.query('COMMIT;');
            console.log(`\n>>> SUCCESS: Migration committed to ${targetEnvName}. <<<`);
        } else {
            await client.query('ROLLBACK;');
            console.log(`\n>>> DRY RUN COMPLETE: All checks passed. Changes rolled back. <<<`);
        }

    } catch (err) {
        try {
            await client.query('ROLLBACK;');
        } catch (rbErr) {
            // ignore rollback error
        }
        console.error(`\n>>> ERROR: Migration failed. Transaction rolled back. <<<`, err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();
