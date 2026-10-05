/**
 * Database Migration Runner: Normalize ac_classes and ac_subclasses
 * 
 * Usage:
 *   node database/migrations/run_20261005_ac_classes_normalization.js --dry-run
 *   node database/migrations/run_20261005_ac_classes_normalization.js --execute
 *   node database/migrations/run_20261005_ac_classes_normalization.js --execute --prod
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
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
        dbUrl = process.env.PROD_DB_URL;
        targetEnvName = 'PRODUCTION';
    } else {
        dbUrl = process.env.SOURCE_DB_URL || process.env.TARGET_DB_URL;
        targetEnvName = 'DEV / SOURCE_DB';
    }
}

const isExecute = process.argv.includes('--execute');

async function run() {
    console.log(`================================================================`);
    console.log(`Migration: Normalize ac_classes & ac_subclasses with Inheritance`);
    console.log(`Target DB: ${targetEnvName}`);
    console.log(`Mode:      ${isExecute ? 'EXECUTE' : 'DRY RUN'}`);
    console.log(`================================================================\n`);

    if (!dbUrl) {
        console.error('Error: Database connection URL not found in environment.');
        process.exit(1);
    }

    const sqlFilePath = path.resolve(__dirname, '20261005_ac_classes_normalization.sql');
    if (!fs.existsSync(sqlFilePath)) {
        console.error(`Error: SQL file not found at ${sqlFilePath}`);
        process.exit(1);
    }
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Pre-fetch valid source keys from DB so extractor can validate
    const preClient = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    try {
        await preClient.connect();
        const { rows: sourceRows } = await preClient.query('SELECT source_key FROM public.ac_sources');
        const sourceKeys = sourceRows.map(s => s.source_key);
        fs.writeFileSync('/tmp/valid_sources.json', JSON.stringify(sourceKeys, null, 2));
        await preClient.end();
    } catch (err) {
        console.warn('Warning: Could not pre-fetch ac_sources keys:', err.message);
    }

    // Run Python data extractor
    console.log('Extracting and normalising classes and subclasses data from Excel files...');
    const pythonScriptPath = path.resolve(__dirname, 'extract_classes_data.py');
    let extractedData;
    try {
        const rawJson = execSync(`python3 "${pythonScriptPath}"`, { maxBuffer: 20 * 1024 * 1024 }).toString();
        extractedData = jsonParseSafe(rawJson);
    } catch (err) {
        console.error('Data extraction failed:', err.message);
        process.exit(1);
    }

    const { classes, subclasses } = extractedData;
    console.log(`Extracted ${classes.length} base classes and ${subclasses.length} subclasses.`);

    const homebrewCount = subclasses.filter(s => s.category === 'Hawthorne Homebrew').length;
    console.log(`Hawthorne Homebrew subclasses identified: ${homebrewCount}`);
    const ruleset2024Count = subclasses.filter(s => s.ruleset === '2024').length;
    console.log(`2024 Subclasses identified: ${ruleset2024Count}`);

    if (!isExecute) {
        console.log('\n[DRY RUN] DDL preview:');
        console.log(sqlContent.slice(0, 450) + '...\n');
        console.log('Sample classes to be inserted:');
        console.table(classes.slice(0, 5).map(c => ({
            name: c.name,
            ruleset: c.ruleset,
            hit_die: c.hit_die,
            source: c.source,
            advice_len: (c.notes_advice || '').length
        })));
        console.log('\nSample subclasses to be inserted:');
        console.table(subclasses.slice(0, 5).map(s => ({
            name: s.name,
            className: s.className,
            ruleset: s.ruleset,
            category: s.category,
            source: s.source,
            advice_len: (s.notes_advice || '').length
        })));
        console.log('\nRun with --execute to apply this migration to the database.');
        return;
    }

    const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

    try {
        await client.connect();
        console.log('Connected to database successfully.');

        console.log('\nExecuting migration in single atomic transaction...');
        await client.query('BEGIN');

        // 1. Run DDL
        await client.query(sqlContent);
        console.log('  ✓ DDL executed (tables, triggers, RLS, view created)');

        // 2. Clear table contents if re-running
        await client.query('DELETE FROM public.ac_subclasses');
        await client.query('DELETE FROM public.ac_classes');

        // 3. Insert Base Classes
        const codeToUuidMap = new Map();
        for (const c of classes) {
            const res = await client.query(`
                INSERT INTO public.ac_classes (
                    name, ruleset, category, source, hit_die, multiclassing, 
                    expanded_options, notes_advice, display_order
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id
            `, [
                c.name, c.ruleset, c.category, c.source, c.hit_die, c.multiclassing,
                c.expanded_options, c.notes_advice, c.display_order
            ]);
            const key = c.class_idx !== undefined ? c.class_idx : c.class_code;
            codeToUuidMap.set(key, res.rows[0].id);
        }
        console.log(`  ✓ Inserted ${classes.length} base classes with generated UUIDs`);

        // 4. Insert Subclasses with foreign keys populated
        for (const s of subclasses) {
            const key = s.class_idx !== undefined ? s.class_idx : s.class_code;
            const classUuid = codeToUuidMap.get(key);
            if (!classUuid) {
                throw new Error(`Missing class UUID mapping for key: ${key}`);
            }
            await client.query(`
                INSERT INTO public.ac_subclasses (
                    class_id, name, ruleset, category, source, link, 
                    notes_advice, engineering_notes, display_order
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
                classUuid, s.name, s.ruleset, s.category, s.source, s.link,
                s.notes_advice, s.engineering_notes, s.display_order
            ]);
        }
        console.log(`  ✓ Inserted ${subclasses.length} subclasses linked via UUID foreign keys`);

        await client.query('COMMIT');
        console.log('\nMigration committed successfully!');

        // 5. Verification Queries
        const classCountRes = await client.query('SELECT count(*) FROM public.ac_classes');
        const subCountRes = await client.query('SELECT count(*) FROM public.ac_subclasses');
        const viewCountRes = await client.query('SELECT count(*) FROM public.v_ac_classes');
        console.log(`\nVerification:`);
        console.log(`  ac_classes count:     ${classCountRes.rows[0].count}`);
        console.log(`  ac_subclasses count:  ${subCountRes.rows[0].count}`);
        console.log(`  v_ac_classes count:   ${viewCountRes.rows[0].count}`);

        const hbRes = await client.query(`
            SELECT class_name, subclass_name, category, subclass_source, link
            FROM public.v_ac_classes
            WHERE category = 'Hawthorne Homebrew'
            ORDER BY class_name, subclass_name
        `);
        console.log(`\nVerified Hawthorne Homebrew Subclasses (${hbRes.rows.length}):`);
        console.table(hbRes.rows);

        const sampleRes = await client.query(`
            SELECT class_name, subclass_name, ruleset, hit_die, subclass_source, 
                   substring(notes_advice from 1 for 45) as sample_advice
            FROM public.v_ac_classes
            WHERE notes_advice IS NOT NULL
            LIMIT 5
        `);
        console.log(`\nSample Inherited Records from v_ac_classes:`);
        console.table(sampleRes.rows);

    } catch (err) {
        console.error('Migration failed:', err);
        try {
            await client.query('ROLLBACK');
            console.log('Transaction rolled back.');
        } catch (rbErr) {
            console.error('Rollback error:', rbErr);
        }
        process.exit(1);
    } finally {
        await client.end();
    }
}

function jsonParseSafe(str) {
    try {
        return JSON.parse(str);
    } catch (e) {
        // Attempt finding first { and last }
        const start = str.indexOf('{');
        const end = str.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
            return JSON.parse(str.slice(start, end + 1));
        }
        throw e;
    }
}

run();
