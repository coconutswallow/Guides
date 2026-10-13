/**
 * Database Migration Runner: Drop AC Legacy Backup Tables
 * Target: Drop 12 deprecated ac_*_legacy_backup and ac_*_legacy_* tables
 *
 * Usage:
 *   node supabase/migrations/run_20261012_drop_ac_legacy_tables.js --dry-run
 *   node supabase/migrations/run_20261012_drop_ac_legacy_tables.js --execute
 *   node supabase/migrations/run_20261012_drop_ac_legacy_tables.js --dry-run --prod
 *   node supabase/migrations/run_20261012_drop_ac_legacy_tables.js --execute --prod
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

const LEGACY_TABLES = [
    'ac_artificer_infusions_legacy_backup',
    'ac_classes_legacy_backup',
    'ac_eldritch_invocations_legacy_backup',
    'ac_feats_legacy_backup',
    'ac_fighting_styles_legacy_backup',
    'ac_loot_categories_legacy_backup',
    'ac_loot_legacy_backup',
    'ac_monsters_categories_legacy_backup',
    'ac_monsters_legacy_backup',
    'ac_other_rewards_categories_legacy_backup',
    'ac_other_rewards_legacy_backup',
    'ac_races_legacy_20261004'
];

async function run() {
    console.log(`====================================================`);
    console.log(`Starting Drop AC Legacy Backup Tables Migration`);
    console.log(`Environment: ${targetEnvName}`);
    console.log(`Mode:        ${isExecute ? 'EXECUTE (Commit changes)' : 'DRY RUN (Rollback)'}`);
    console.log(`====================================================`);

    const client = new pg.Client({ connectionString: dbUrl });
    try {
        await client.connect();

        const sqlFile = path.resolve(__dirname, '20261012_drop_ac_legacy_tables.sql');
        const sqlContent = fs.readFileSync(sqlFile, 'utf8');

        await client.query('BEGIN;');

        const cleanSql = sqlContent
            .replace(/^\s*BEGIN\s*;/im, '')
            .replace(/^\s*COMMIT\s*;/im, '');

        await client.query(cleanSql);

        // Verification Checks
        console.log('\n--- Running Post-Migration Verification Checks ---');
        let allPassed = true;

        // Check 1: All 12 legacy tables are dropped
        const droppedCheck = await client.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = ANY($1);
        `, [LEGACY_TABLES]);
        if (droppedCheck.rows.length === 0) {
            console.log(`[PASS] Check 1: All 12 legacy backup tables confirmed dropped.`);
        } else {
            console.error(`[FAIL] Check 1: Remaining legacy tables found:`, droppedCheck.rows.map(r => r.table_name));
            allPassed = false;
        }

        // Check 2: Primary AC tables row counts preserved
        const primaryTables = [
            { name: 'ac_sources', min: 121 },
            { name: 'ac_classes', min: 29 },
            { name: 'ac_subclasses', min: 244 },
            { name: 'ac_races', min: 114 },
            { name: 'ac_subraces', min: 221 },
            { name: 'ac_backgrounds', min: 166 },
            { name: 'ac_feats', min: 346 },
            { name: 'ac_spells', min: 20 },
            { name: 'ac_equipment', min: 490 },
            { name: 'ac_bastion', min: 66 },
            { name: 'ac_bastion_type', min: 4 },
            { name: 'ac_downtime', min: 130 },
            { name: 'ac_loot', min: 1358 },
            { name: 'ac_monsters', min: 3195 },
            { name: 'ac_other_rewards', min: 385 },
            { name: 'ac_item_properties', min: 92 },
            { name: 'ac_languages', min: 128 }
        ];

        for (const pt of primaryTables) {
            const res = await client.query(`SELECT count(*) FROM public."${pt.name}";`);
            const count = parseInt(res.rows[0].count, 10);
            if (count >= pt.min) {
                console.log(`[PASS] Check 2: Primary table public.${pt.name} preserved (${count} records).`);
            } else {
                console.error(`[FAIL] Check 2: Primary table public.${pt.name} count lower than expected (${count} < ${pt.min}).`);
                allPassed = false;
            }
        }

        // Check 3: Active views queryable
        const vClassesRes = await client.query('SELECT count(*) FROM public.v_ac_classes;');
        const vRacesRes = await client.query('SELECT count(*) FROM public.v_ac_races;');
        console.log(`[PASS] Check 3: Views v_ac_classes (${vClassesRes.rows[0].count}) and v_ac_races (${vRacesRes.rows[0].count}) intact and queryable.`);

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
