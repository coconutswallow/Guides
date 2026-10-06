/**
 * Migration Runner: AC Fighting Styles Feats Link Fix (MSC_0017)
 * 
 * Usage:
 *   node supabase/migrations/run_20261006_ac_fighting_styles_feats_link_fix.js --dry-run
 *   node supabase/migrations/run_20261006_ac_fighting_styles_feats_link_fix.js --execute
 *   node supabase/migrations/run_20261006_ac_fighting_styles_feats_link_fix.js --dry-run --prod
 *   node supabase/migrations/run_20261006_ac_fighting_styles_feats_link_fix.js --execute --prod
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
const isExecute = process.argv.includes('--execute');
const isDryRun = process.argv.includes('--dry-run') || !isExecute;

let targetEnvName = isProd ? 'PRODUCTION' : 'DEV';
let dbUrl = isProd
    ? (process.env.PROD_DB_URL || process.env.TARGET_DB_URL)
    : (process.env.SOURCE_DB_URL || process.env.DEV_DB_URL || process.env.DATABASE_URL);

if (!dbUrl) {
    console.error(`❌ Could not determine database URL for ${targetEnvName}. Check DBSync/.env.`);
    process.exit(1);
}

const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');

async function main() {
    console.log(`\n======================================================================`);
    console.log(`🔧 MIGRATION: MSC_0017 Feats Link Fix`);
    console.log(`📡 Target Environment: ${targetEnvName}`);
    console.log(`🔗 Database URL:       ${maskedUrl}`);
    console.log(`⚙️ Mode:               ${isExecute ? 'EXECUTE (Applying changes)' : 'DRY-RUN (Simulated, will rollback)'}`);
    console.log(`======================================================================\n`);

    const client = new pg.Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // 1. Check current value
        const beforeRes = await client.query(`
            SELECT check_id, name, ruleset, notes_advice
            FROM public.ac_fighting_styles
            WHERE check_id = 'MSC_0017';
        `);

        console.log('📋 Current record in ac_fighting_styles:');
        console.table(beforeRes.rows);

        // 2. Read migration SQL
        const sqlPath = path.resolve(__dirname, '20261006_ac_fighting_styles_feats_link_fix.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // 3. Begin Transaction
        await client.query('BEGIN;');

        await client.query(sql);

        // 4. Verify updated value
        const afterRes = await client.query(`
            SELECT check_id, name, ruleset, notes_advice
            FROM public.ac_fighting_styles
            WHERE check_id = 'MSC_0017';
        `);

        console.log('\n🔍 Value after UPDATE inside transaction:');
        console.table(afterRes.rows);

        const expectedAdvice = 'Refer to Fighting Style Feats [here](/Guides/allowed-content/#feats).';
        if (afterRes.rows[0]?.notes_advice === expectedAdvice) {
            console.log('✅ Value matches expected link target!');
        } else {
            throw new Error(`Unexpected value: ${afterRes.rows[0]?.notes_advice}`);
        }

        if (isExecute) {
            await client.query('COMMIT;');
            console.log(`\n🚀 [${targetEnvName}] Changes committed successfully!`);
        } else {
            await client.query('ROLLBACK;');
            console.log(`\n🛡️ [${targetEnvName}] Dry run completed successfully (rolled back).`);
        }
    } catch (err) {
        try { await client.query('ROLLBACK;'); } catch (_) {}
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

main();
