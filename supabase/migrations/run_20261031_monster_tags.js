/**
 * Database Migration Runner: Monster Tags & Relations
 * Target Tables: public.monster_tags, public.monster_tag_relations
 *
 * Usage:
 *   node supabase/migrations/run_20261031_monster_tags.js --dry-run
 *   node supabase/migrations/run_20261031_monster_tags.js --execute
 *   node supabase/migrations/run_20261031_monster_tags.js --dry-run --prod
 *   node supabase/migrations/run_20261031_monster_tags.js --execute --prod
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to load env from Guides/.env or DBSync/.env
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
        dbUrl = process.env.SOURCE_DB_URL || process.env.DEV_DB_URL;
        targetEnvName = 'DEV';
    }
}

if (!dbUrl) {
    console.error(`❌ Error: Database connection URL not found for environment: ${targetEnvName}`);
    process.exit(1);
}

const isExecute = process.argv.includes('--execute');

async function runMigration() {
    console.log(`\n======================================================================`);
    console.log(`🚀 Migration: 20261031_monster_tags.sql`);
    console.log(`🎯 Environment: ${targetEnvName}`);
    console.log(`⚙️  Mode: ${isExecute ? 'EXECUTE (Applying changes)' : 'DRY-RUN (Simulating in transaction)'}`);
    console.log(`======================================================================\n`);

    const sqlFilePath = path.join(__dirname, '20261031_monster_tags.sql');
    if (!fs.existsSync(sqlFilePath)) {
        console.error(`❌ Error: Migration file not found: ${sqlFilePath}`);
        process.exit(1);
    }
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    const client = new pg.Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log(` Connected to PostgreSQL [${targetEnvName}]`);

        // Check pre-migration status
        console.log(`\n--- Pre-migration Inspection ---`);
        const preCheckTags = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'monster_tags'
            );
        `);
        console.log(` public.monster_tags exists: ${preCheckTags.rows[0].exists}`);

        const preCheckRel = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'monster_tag_relations'
            );
        `);
        console.log(` public.monster_tag_relations exists: ${preCheckRel.rows[0].exists}`);

        // Begin Transaction
        await client.query('BEGIN');
        console.log(`\n--- Executing SQL Script ---`);

        await client.query(sqlContent);
        console.log(` SQL executed successfully.`);

        // Post-migration Verification
        console.log(`\n--- Post-migration Verification ---`);
        const postCheckTags = await client.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name IN ('monster_tags', 'monster_tag_relations')
            ORDER BY table_name;
        `);
        console.log(` Verified tables created:`, postCheckTags.rows.map(r => r.table_name).join(', '));

        const indexCheck = await client.query(`
            SELECT indexname FROM pg_indexes 
            WHERE schemaname = 'public' AND tablename IN ('monster_tags', 'monster_tag_relations')
            ORDER BY indexname;
        `);
        console.log(` Verified indices:`, indexCheck.rows.map(r => r.indexname).join(', '));

        const rlsCheck = await client.query(`
            SELECT tablename, policyname, cmd, qual, with_check 
            FROM pg_policies 
            WHERE schemaname = 'public' AND tablename IN ('monster_tags', 'monster_tag_relations')
            ORDER BY tablename, policyname;
        `);
        console.log(` Verified RLS policies:`);
        for (const pol of rlsCheck.rows) {
            console.log(`   [${pol.tablename}] "${pol.policyname}" (${pol.cmd})`);
        }

        const tagCount = await client.query('SELECT count(*) FROM public.monster_tags');
        console.log(` Current monster_tags row count: ${tagCount.rows[0].count} (Expected: 0 - manual creation)`);

        const relCount = await client.query('SELECT count(*) FROM public.monster_tag_relations');
        console.log(` Current monster_tag_relations row count: ${relCount.rows[0].count} (Expected: 0 - manual creation)`);

        if (isExecute) {
            await client.query('COMMIT');
            console.log(`\n Transaction COMMITTED successfully in ${targetEnvName}.`);
        } else {
            await client.query('ROLLBACK');
            console.log(`\n DRY-RUN COMPLETE: Transaction safely ROLLED BACK. No changes applied.`);
        }
    } catch (err) {
        try {
            await client.query('ROLLBACK');
        } catch (_) {}
        console.error(`\n❌ Migration failed with error:`, err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
