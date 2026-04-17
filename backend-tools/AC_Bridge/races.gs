
const RACES_SOURCE_SHEET_ID   = "1fBEv1yDNTD-vwUyK6pK_oiXg2K7OiltW35iFCqxyMTY";  // the ID from the source sheet's URL
const RACES_SOURCE_SHEET_NAME = "Races";                 // tab name in the source sheet
const RACES_NORMALIZED_SHEET  = "Races";

const COLUMNS = {
  RACE:        0,
  SUBRACE:     1,
  SIZE:        2,
  SPEED:       3,
  LANGUAGE:    4,
  STR:         5,
  DEX:         6,
  CON:         7,
  INT:         8,
  WIS:         9,
  CHA:         10,
  // col 11 is empty — skipped
  EXTRA:       12,
  // cols 13, 14 are empty — skipped
  SOURCE:      15,
  RAGE_ADVICE: 16,
};

function normalizeRaces() {
  const sourceSS = SpreadsheetApp.openById(RACES_SOURCE_SHEET_ID);
  const source   = sourceSS.getSheetByName(RACES_SOURCE_SHEET_NAME);

  if (!source) {
    SpreadsheetApp.getUi().alert(`Tab "${RACES_SOURCE_SHEET_NAME}" not found in source sheet.`);
    return;
  }

  const data = source.getDataRange().getValues();
  const normalized = [];

  // Header row
  normalized.push([
    "Race", "Subrace", "Size", "Speed", "Language",
    "Str", "Dex", "Con", "Int", "Wis", "Cha",
    "Extra", "Source", "Rage Advice"
  ]);

  let currentRace     = "";
  let currentSize     = "";
  let currentSpeed    = "";
  let currentLanguage = "";

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    const race    = String(row[COLUMNS.RACE]).trim();
    const subrace = String(row[COLUMNS.SUBRACE]).trim();

    // Explicitly skip the secondary header row
    if (race === "Race") continue;

    // FIXED: Forward-fill parent-level fields. 
    // Ignore descriptive notes wrapped in parentheses (like "(As PHB 2014)") from becoming the parent Race!
    if (race !== "" && !race.startsWith("(")) {
        currentRace = race;
    }
    
    if (String(row[COLUMNS.SIZE]).trim() !== "")     currentSize     = row[COLUMNS.SIZE];
    if (String(row[COLUMNS.SPEED]).trim() !== "")    currentSpeed    = row[COLUMNS.SPEED];
    if (String(row[COLUMNS.LANGUAGE]).trim() !== "") currentLanguage = row[COLUMNS.LANGUAGE];

    // Skip the placeholder parent row
    if (subrace === "(choose one)") continue;

    // Skip fully empty rows
    if (currentRace === "" && subrace === "") continue;

    normalized.push([
      currentRace,
      subrace,
      currentSize,
      currentSpeed,
      currentLanguage,
      row[COLUMNS.STR],
      row[COLUMNS.DEX],
      row[COLUMNS.CON],
      row[COLUMNS.INT],
      row[COLUMNS.WIS],
      row[COLUMNS.CHA],
      row[COLUMNS.EXTRA],
      row[COLUMNS.SOURCE],
      row[COLUMNS.RAGE_ADVICE],
    ]);
  }

  // Write to Normalized sheet in this workbook (create if missing)
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let normSheet = ss.getSheetByName(RACES_NORMALIZED_SHEET);
  if (!normSheet) {
    normSheet = ss.insertSheet(RACES_NORMALIZED_SHEET);
  } else {
    normSheet.clearContents();
  }

  normSheet.getRange(1, 1, normalized.length, normalized[0].length)
    .setValues(normalized);

  SpreadsheetApp.getUi().alert(
    `Done! ${normalized.length - 1} rows written to "${RACES_NORMALIZED_SHEET}".`
  );
}
// ==============================================================================
// Configuration
// ==============================================================================
const RACES_SHEET_NAME = "Races"; 

// Securely fetch the exact same secrets you already set up
const raceScriptProps = PropertiesService.getScriptProperties();
const RACE_ENV = {
  DEV: {
    URL: raceScriptProps.getProperty("SUPABASE_DEV_URL"),
    KEY: raceScriptProps.getProperty("SUPABASE_DEV_KEY")
  },
  PROD: {
    URL: raceScriptProps.getProperty("SUPABASE_PROD_URL"),
    KEY: raceScriptProps.getProperty("SUPABASE_PROD_KEY")
  }
};

// ==============================================================================
// Create Custom Menu Items
// ==============================================================================
// If you already have an onOpen() in your project, just add these .addItem() 
// lines to your existing menu block instead of replacing it!
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Database Sync')
    .addItem('🚀 Sync Races to DEV', 'syncRacesToDev')
    .addItem('🚨 Sync Races to PROD', 'syncRacesToProd')
    .addToUi();
}

// ==============================================================================
// Entry Points 
// ==============================================================================
function syncRacesToDev() {
  if (!RACE_ENV.DEV.URL || !RACE_ENV.DEV.KEY) throw new Error("Missing Dev Script Properties.");
  console.log("Starting Races sync to DEVELOPMENT...");
  runRaceSync(RACE_ENV.DEV.URL, RACE_ENV.DEV.KEY, "DEVELOPMENT");
}

function syncRacesToProd() {
  if (!RACE_ENV.PROD.URL || !RACE_ENV.PROD.KEY) throw new Error("Missing Prod Script Properties.");
  console.log("Starting Races sync to PRODUCTION...");
  runRaceSync(RACE_ENV.PROD.URL, RACE_ENV.PROD.KEY, "PRODUCTION");
}

// ==============================================================================
// Main Sync Orchestrator
// ==============================================================================
function runRaceSync(apiUrl, apiKey, envName) {
  try {
    const racesPushed = syncRacesData(apiUrl, apiKey);
    console.log(`✅ Sync Complete [${envName}]! Upserted ${racesPushed} Races.`);
    
    // Non-blocking toast notification
    try {
      SpreadsheetApp.getActiveSpreadsheet().toast(`Races Upserted: ${racesPushed}`, `✅ Sync Complete [${envName}]`);
    } catch(e) {}
    
  } catch (error) {
    console.error(`❌ Error during sync to ${envName}: ${error.message}`);
    console.error(error);
    
    try {
       SpreadsheetApp.getActiveSpreadsheet().toast(`${error.message}`, `❌ Sync Error [${envName}]`, 10);
    } catch(e) {}
  }
}

// ==============================================================================
// 1. Parse and Sync Races
// ==============================================================================
function syncRacesData(apiUrl, apiKey) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(RACES_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${RACES_SHEET_NAME}" not found.`);
  
  // getDisplayValues ensures fractional CRs or Speeds don't get turned into Dates
  const data = sheet.getDataRange().getDisplayValues();
  const payload = [];

  let displayOrderCounter = 1;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const raceName = String(row[0] || "").trim();
    
    // Skip empty rows and the header rows
    if (!raceName || raceName === "Race") continue;
    
    payload.push({
      name: raceName,
      subrace: String(row[1] || "(none)").trim(), // Forces "(none)" if blank
      size: row[2] || null,
      speed: row[3] || null,
      language: row[4] || null,
      str: row[5] || null,
      dex: row[6] || null,
      con: row[7] || null,
      "int": row[8] || null,
      wis: row[9] || null,
      cha: row[10] || null,
      extra: row[11] || null,
      source: row[12] || null,
      rage_advice: row[13] || null,
      display_order: displayOrderCounter
    });
    
    displayOrderCounter++;
  }

  if (payload.length === 0) return 0;
  
  // Upsert pointing at the composite unique constraint (name + subrace)
  supabaseUpsertRaces(apiUrl, apiKey, "ac_races", payload, "name,subrace");
  
  return payload.length;
}

// ==============================================================================
// Helper: Supabase Upsert Request
// ==============================================================================
function supabaseUpsertRaces(apiUrl, apiKey, tableName, payloadArray, conflictCols) {
  const endpoint = `${apiUrl}/rest/v1/${tableName}?on_conflict=${conflictCols}`;
  
  const options = {
    method: "post",
    headers: {
      "apikey": apiKey,
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal, resolution=merge-duplicates" 
    },
    payload: JSON.stringify(payloadArray),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(endpoint, options);
  
  if (response.getResponseCode() >= 400) {
    throw new Error(`Supabase Upsert Error on ${tableName}: ${response.getContentText()}`);
  }
}