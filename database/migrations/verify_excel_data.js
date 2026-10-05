import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

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
                    if (!process.env[key]) process.env[key] = val;
                }
            }
        }
    }
}
loadEnv();

// Run python to dump JSON
const pyScript = `
import openpyxl, json
wb_r = openpyxl.load_workbook('.context/current-tasks/AC_Races.xlsx')
r_rows = [r for r in list(wb_r['Data'].iter_rows(values_only=True))[1:] if r[0] is not None]
wb_s = openpyxl.load_workbook('.context/current-tasks/AC_Subraces.xlsx')
s_rows = [r for r in list(wb_s['Data'].iter_rows(values_only=True))[1:] if r[0] is not None]
with open('/tmp/excel_dump.json', 'w') as f:
    json.dump({'races': r_rows, 'subraces': s_rows}, f)
`;

fs.writeFileSync('/tmp/dump.py', pyScript);
execSync('python3 /tmp/dump.py');

const excelData = JSON.parse(fs.readFileSync('/tmp/excel_dump.json', 'utf8'));
console.log(`Excel Dump: ${excelData.races.length} races, ${excelData.subraces.length} subraces`);

const client = new pg.Client({
    connectionString: process.env.SOURCE_DB_URL || process.env.TARGET_DB_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    await client.connect();
    
    // Check races
    const dbRaces = await client.query('SELECT race_id, name FROM public.ac_races ORDER BY race_id;');
    console.log(`DB Races: ${dbRaces.rows.length}`);
    const dbRaceMap = new Map(dbRaces.rows.map(r => [r.race_id, r.name]));
    let raceDiffs = 0;
    for (const r of excelData.races) {
        const [rid, name] = r;
        if (!dbRaceMap.has(rid)) {
            console.log(`Missing race in DB: ${rid} ${name}`);
            raceDiffs++;
        } else if (dbRaceMap.get(rid) !== name) {
            console.log(`Race name diff: ${rid} -> Excel: "${name}" vs DB: "${dbRaceMap.get(rid)}"`);
            raceDiffs++;
        }
    }
    console.log(`Total race differences: ${raceDiffs}`);

    // Check subraces
    // Headers: ('Race_ID', 'Lookup', 'Source', 'Subrace', 'Size', 'Speed', 'Language', 'Str', 'Dex', 'Con', 'Int', 'Wis', 'Cha', 'Extra', 'Notes', 'Engineering Notes')
    const dbSub = await client.query(`
        SELECT race_id, subrace, sources, size, speed, language, str, dex, con, int_stat, wis, cha, extra, notes_advice, check_id, display_order 
        FROM public.ac_subraces 
        ORDER BY display_order;
    `);
    console.log(`DB Subraces: ${dbSub.rows.length}`);

    // Let's compare row count and pairing
    let subDiffs = 0;
    for (let i = 0; i < excelData.subraces.length; i++) {
        const er = excelData.subraces[i];
        const dr = dbSub.rows[i];
        if (!dr) {
            console.log(`Row ${i} missing in DB!`);
            subDiffs++;
            continue;
        }

        const eRaceId = er[0];
        const eSource = er[2];
        const eSubrace = er[3];
        const eSize = er[4] ? String(er[4]).trim() : null;
        const eSpeed = er[5] ? String(er[5]).trim() : null;

        // Check race_id
        if (dr.race_id !== eRaceId) {
            console.log(`Row ${i} race_id mismatch: Excel=${eRaceId}, DB=${dr.race_id}`);
            subDiffs++;
        }

        // Check subrace
        const dSub = dr.subrace;
        if (dSub !== eSubrace && !(dSub === 'None' && (eSubrace === 'None' || !eSubrace))) {
            console.log(`Row ${i} (${dr.check_id}) subrace mismatch: Excel="${eSubrace}", DB="${dSub}"`);
            subDiffs++;
        }

        // Check sources
        const eSrcArr = String(eSource).split(',').map(s => s.trim());
        const dSrcArr = dr.sources;
        if (JSON.stringify(eSrcArr) !== JSON.stringify(dSrcArr)) {
            console.log(`Row ${i} (${dr.check_id}) sources mismatch: Excel=${JSON.stringify(eSrcArr)}, DB=${JSON.stringify(dSrcArr)}`);
            subDiffs++;
        }
    }
    console.log(`Total subrace structure differences: ${subDiffs}`);

    console.log('\n--- Discrepancy Analysis ---');
    for (const i of [60, 61, 205, 206, 207]) {
        console.log(`\nRow ${i} (display_order approx ${i+1}):`);
        console.log('Excel:', excelData.subraces[i]);
        console.log('DB   :', dbSub.rows[i]);
    }

    await client.end();
}

main().catch(console.error);
