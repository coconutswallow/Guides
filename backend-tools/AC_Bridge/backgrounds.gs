const BACKGROUND_SOURCE_SHEET_ID   = "1fBEv1yDNTD-vwUyK6pK_oiXg2K7OiltW35iFCqxyMTY";  // the ID from the source sheet's URL
const BACKGROUND_SOURCE_SHEET_NAME = "Backgrounds";             // tab name in the source sheet
const BACKGROUND_SHEET_NAME = "Backgrounds";             // tab name in your destination workbook

const COLUMNS = {
  NAME:    0,  // Column A
  SOURCE:  2,  // Column C
  FEATURE: 3,  // Column D
  NOTES:   5,  // Column F
};

function normalizeBackgrounds() {
  const sourceSS = SpreadsheetApp.openById(BACKGROUND_SOURCE_SHEET_ID);
  const source   = sourceSS.getSheetByName(BACKGROUND_SOURCE_SHEET_NAME);

  if (!source) {
    SpreadsheetApp.getUi().alert(`Tab "${BACKGROUND_SOURCE_SHEET_NAME}" not found in source sheet.`);
    return;
  }

  const data = source.getDataRange().getValues();
  const replicated = [];

  // Create the clean header row for the target sheet
  replicated.push(["Name", "Source", "Feature", "Notes / Rage Advice"]);

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    
    // Safely parse the columns, falling back to empty strings if missing
    const name    = String(row[COLUMNS.NAME] || "").trim();
    const source  = String(row[COLUMNS.SOURCE] || "").trim();
    const feature = String(row[COLUMNS.FEATURE] || "").trim();
    const notes   = String(row[COLUMNS.NOTES] || "").trim();

    // Skip the intro text, blank spaces, and the raw header row
    if (
      name === "" || 
      name === "Name" || 
      name === "Backgrounds" || 
      name.startsWith("Characters on the server")
    ) {
      continue;
    }

    // Add the clean row
    replicated.push([name, source, feature, notes]);
  }

  // Write to the target sheet in this workbook (create if missing)
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let targetSheet = ss.getSheetByName(BACKGROUND_SHEET_NAME);
  if (!targetSheet) {
    targetSheet = ss.insertSheet(BACKGROUND_SHEET_NAME);
  } else {
    targetSheet.clearContents();
  }

  // Set the replicated data range
  targetSheet.getRange(1, 1, replicated.length, replicated[0].length)
    .setValues(replicated);

  SpreadsheetApp.getUi().alert(
    `Done! ${replicated.length - 1} backgrounds written to "${BACKGROUND_SHEET_NAME}".`
  );
}
// ==============================================================================
// Configuration
// ==============================================================================
const BACKGROUNDS_SHEET_NAME = "Backgrounds"; 

// Securely fetch the exact same secrets you already set up
const bgScriptProps = PropertiesService.getScriptProperties();
const BG_ENV = {
  DEV: {
    URL: bgScriptProps.getProperty("SUPABASE_DEV_URL"),
    KEY: bgScriptProps.getProperty("SUPABASE_DEV_KEY")
  },
  PROD: {
    URL: bgScriptProps.getProperty("SUPABASE_PROD_URL"),
    KEY: bgScriptProps.getProperty("SUPABASE_PROD_KEY")
  }
};

// ==============================================================================
// Create Custom Menu Items
// ==============================================================================
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Database Sync')
    .addItem('🚀 Sync Backgrounds to DEV', 'syncBackgroundsToDev')
    .addItem('🚨 Sync Backgrounds to PROD', 'syncBackgroundsToProd')
    .addToUi();
}

// ==============================================================================
// Entry Points 
// ==============================================================================
function syncBackgroundsToDev() {
  if (!BG_ENV.DEV.URL || !BG_ENV.DEV.KEY) throw new Error("Missing Dev Script Properties.");
  console.log("Starting Backgrounds sync to DEVELOPMENT...");
  runBackgroundsSync(BG_ENV.DEV.URL, BG_ENV.DEV.KEY, "DEVELOPMENT");
}

function syncBackgroundsToProd() {
  if (!BG_ENV.PROD.URL || !BG_ENV.PROD.KEY) throw new Error("Missing Prod Script Properties.");
  console.log("Starting Backgrounds sync to PRODUCTION...");
  runBackgroundsSync(BG_ENV.PROD.URL, BG_ENV.PROD.KEY, "PRODUCTION");
}

// ==============================================================================
// Main Sync Orchestrator
// ==============================================================================
function runBackgroundsSync(apiUrl, apiKey, envName) {
  try {
    const bgPushed = syncBackgroundsData(apiUrl, apiKey);
    console.log(`✅ Sync Complete [${envName}]! Upserted ${bgPushed} Backgrounds.`);
    
    // Non-blocking toast notification
    try {
      SpreadsheetApp.getActiveSpreadsheet().toast(`Backgrounds Upserted: ${bgPushed}`, `✅ Sync Complete [${envName}]`);
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
// 1. Parse and Sync Backgrounds
// ==============================================================================
function syncBackgroundsData(apiUrl, apiKey) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(BACKGROUNDS_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${BACKGROUNDS_SHEET_NAME}" not found.`);
  
  const data = sheet.getDataRange().getDisplayValues();
  const payload = [];

  let displayOrderCounter = 1;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const bgName = String(row[0] || "").trim();
    
    // Skip empty rows and the header row
    if (!bgName || bgName === "Name") continue;
    
    payload.push({
      name: bgName,
      source: String(row[1] || "").trim(),
      feature: row[2] || null,
      notes_advice: row[3] || null,
      display_order: displayOrderCounter
    });
    
    displayOrderCounter++;
  }

  if (payload.length === 0) return 0;
  
  // Upsert pointing at the composite unique constraint (name + source)
  supabaseUpsertBackgrounds(apiUrl, apiKey, "ac_backgrounds", payload, "name,source");
  
  return payload.length;
}

// ==============================================================================
// Helper: Supabase Upsert Request
// ==============================================================================
function supabaseUpsertBackgrounds(apiUrl, apiKey, tableName, payloadArray, conflictCols) {
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