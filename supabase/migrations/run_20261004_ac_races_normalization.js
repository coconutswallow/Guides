/**
 * Database Migration Runner: AC Races & Subraces Normalization & Data Load
 * 
 * Usage:
 *   node run_20261004_ac_races_normalization.js --dry-run
 *   node run_20261004_ac_races_normalization.js --execute
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
        dbUrl = process.env.PROD_DB_URL;
        targetEnvName = 'PRODUCTION';
    } else {
        dbUrl = process.env.SOURCE_DB_URL || process.env.TARGET_DB_URL;
        targetEnvName = 'DEV';
    }
}

if (!dbUrl) {
    if (isProd) {
        console.error('Error: PROD_DB_URL is not set. You can supply the database URL via --db="postgresql://..." or by uncommenting PROD_DB_URL in /workspace/git/Coconut/DBSync/.env');
    } else {
        console.error('Error: SOURCE_DB_URL is not set in environment or .env file');
    }
    process.exit(1);
}

const isExecute = process.argv.includes('--execute');
const isDryRun = process.argv.includes('--dry-run') || !isExecute;

const sqlFilePath = path.resolve(__dirname, '20261004_ac_races_normalization.sql');
const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

async function run() {
    console.log(`Starting migration runner [Target: ${targetEnvName}, Mode: ${isExecute ? 'EXECUTE (COMMIT)' : 'DRY-RUN (ROLLBACK)'}]...`);
    
    const client = new pg.Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to PostgreSQL database successfully.');

        await client.query('BEGIN;');

        console.log('Executing migration SQL statements...');
        await client.query(sqlContent);
        console.log('Migration SQL executed successfully.');

        // Run verification checks
        console.log('\n--- Running Verification Checklist ---');
        
        // 1. Total row count in ac_races
        const countRacesRes = await client.query('SELECT count(*)::int AS count FROM public.ac_races;');
        const totalRaces = countRacesRes.rows[0].count;
        const racesPass = totalRaces === 114;
        console.log(`[1] Total rows in ac_races: ${totalRaces} (Expected: 114) -> ${racesPass ? 'PASS' : 'FAIL'}`);

        // 2. Total row count in ac_subraces
        const countSubRes = await client.query('SELECT count(*)::int AS count FROM public.ac_subraces;');
        const totalSubraces = countSubRes.rows[0].count;
        const subracesPass = totalSubraces === 221;
        console.log(`[2] Total rows in ac_subraces: ${totalSubraces} (Expected: 221) -> ${subracesPass ? 'PASS' : 'FAIL'}`);

        // 3. Audit check_ids on ac_subraces (RAC_0001 to RAC_0247, 221 distinct)
        const checkIdRes = await client.query(`
            SELECT min(check_id) AS min_id, max(check_id) AS max_id, count(distinct check_id)::int AS distinct_count 
            FROM public.ac_subraces;
        `);
        const { min_id, max_id, distinct_count } = checkIdRes.rows[0];
        const checkIdPass = min_id === 'RAC_0001' && max_id === 'RAC_0247' && distinct_count === 221;
        console.log(`[3] Audit check_ids: min=${min_id}, max=${max_id}, distinct=${distinct_count} -> ${checkIdPass ? 'PASS' : 'FAIL'}`);

        // 4. Duplicate race_id check
        const dupRacesRes = await client.query(`
            SELECT race_id, count(*)::int 
            FROM public.ac_races 
            GROUP BY race_id 
            HAVING count(*) > 1;
        `);
        const dupRacesPass = dupRacesRes.rows.length === 0;
        console.log(`[4] Uniqueness of ac_races.race_id: ${dupRacesRes.rows.length} duplicates -> ${dupRacesPass ? 'PASS' : 'FAIL'}`);

        // 5. Foreign key integrity
        const orphanRes = await client.query(`
            SELECT count(*)::int AS count 
            FROM public.ac_subraces s
            LEFT JOIN public.ac_races r ON s.race_id = r.race_id
            WHERE r.race_id IS NULL;
        `);
        const fkPass = orphanRes.rows[0].count === 0;
        console.log(`[5] Foreign key integrity (ac_subraces -> ac_races): ${orphanRes.rows[0].count} orphaned -> ${fkPass ? 'PASS' : 'FAIL'}`);

        // 6. Multi-source array verification (SCAG/MTF, EEPC/VGM, etc.)
        const multiSrcRes = await client.query(`
            SELECT check_id, subrace, sources 
            FROM public.ac_subraces 
            WHERE array_length(sources, 1) > 1
            ORDER BY check_id;
        `);
        const multiSrcPass = multiSrcRes.rows.length === 6;
        console.log(`[6] Multi-source text[] entries: ${multiSrcRes.rows.length} records (Expected: 6) -> ${multiSrcPass ? 'PASS' : 'FAIL'}`);
        for (const r of multiSrcRes.rows) {
            console.log(`    - ${r.check_id} (${r.subrace}): [${r.sources.join(', ')}]`);
        }

        // 7. Variants JSONB verification (e.g. Aarakocra)
        const variantRes = await client.query(`
            SELECT race_id, name, sources, variants 
            FROM public.ac_races 
            WHERE race_id = 'RACE_0001';
        `);
        const aarakocraVariants = variantRes.rows[0]?.variants;
        const variantsPass = aarakocraVariants && 'EEPC' in aarakocraVariants && 'MPMM' in aarakocraVariants;
        console.log(`[7] Variants JSONB on ac_races (RACE_0001 Aarakocra): EEPC & MPMM present -> ${variantsPass ? 'PASS' : 'FAIL'}`);

        // 8. Backward-compatibility view: v_ac_races
        const viewRes = await client.query('SELECT count(*)::int AS count FROM public.v_ac_races;');
        const viewCount = viewRes.rows[0].count;
        const viewPass = viewCount === 221;
        console.log(`[8] Compatibility view (public.v_ac_races): ${viewCount} rows -> ${viewPass ? 'PASS' : 'FAIL'}`);

        const allPassed = racesPass && subracesPass && checkIdPass && dupRacesPass && fkPass && multiSrcPass && variantsPass && viewPass;

        if (!allPassed) {
            throw new Error('Verification checklist failed! Aborting migration.');
        }

        if (isExecute) {
            await client.query('COMMIT;');
            console.log('\n>>> MIGRATION COMMITTED TO DATABASE SUCCESSFULLY. <<<');
        } else {
            await client.query('ROLLBACK;');
            console.log('\n>>> DRY RUN COMPLETED (CHANGES ROLLED BACK). To apply permanently, run with --execute <<<');
        }

    } catch (err) {
        await client.query('ROLLBACK;').catch(() => {});
        console.error('\n❌ Migration Failed:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();
