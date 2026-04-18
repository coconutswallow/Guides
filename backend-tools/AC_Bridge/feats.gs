const FEATS_SOURCE_SHEET_ID  = "1fBEv1yDNTD-vwUyK6pK_oiXg2K7OiltW35iFCqxyMTY"; // The ID of your raw data workbook
const RAW_FEATS_SHEET        = "Feats";
const NORMALIZED_FEATS_SHEET = "Feats";

function normalizeFeats() {
  // 1. Open the remote source workbook using the explicit ID
  const sourceSS = SpreadsheetApp.openById(FEATS_SOURCE_SHEET_ID);
  const source   = sourceSS.getSheetByName(RAW_FEATS_SHEET);

  if (!source) {
    SpreadsheetApp.getUi().alert(`Tab "${RAW_FEATS_SHEET}" not found in source sheet.`);
    return;
  }

  // Use getDisplayValues() to prevent any weird auto-formatting issues
  const data = source.getDataRange().getDisplayValues();
  const normalized = [];

  // 2. Set the Header Row for the Normalized Tab
  normalized.push([
    "Feat", "Category", "Prerequisite", "Ability Increase", "Source", "Notes / Rage Advice"
  ]);

  // 3. Loop through the raw data
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const featName = String(row[0] || "").trim();

    // Skip empty rows and the header row
    if (featName === "" || featName === "Feat") continue;

    // Clean the category field (Converts the em-dash "—" to a blank string)
    let rawCategory = String(row[1] || "").trim();
    let cleanCategory = (rawCategory === "—") ? "" : rawCategory;

    // Push the cleaned row to our array
    normalized.push([
      featName,
      cleanCategory,
      String(row[2] || "").trim(),
      String(row[3] || "").trim(),
      String(row[4] || "").trim(),
      String(row[5] || "").trim()
    ]);
  }

  // 4. Write to the Normalized sheet in YOUR ACTIVE WORKBOOK (where this script lives)
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let normSheet = ss.getSheetByName(NORMALIZED_FEATS_SHEET);
  
  if (!normSheet) {
    normSheet = ss.insertSheet(NORMALIZED_FEATS_SHEET);
  } else {
    normSheet.clearContents();
  }

  // Write the data payload
  normSheet.getRange(1, 1, normalized.length, normalized[0].length).setValues(normalized);

  SpreadsheetApp.getUi().alert(
    `Done! ${normalized.length - 1} rows cleanly pulled and written to "${NORMALIZED_FEATS_SHEET}".`
  );
}
// ==============================================================================
// Configuration
// ==============================================================================
// We now point this at our beautifully normalized tab!
const FEATS_SHEET_NAME = "Feats"; 

const featScriptProps = PropertiesService.getScriptProperties();
const FEAT_ENV = {
  DEV: {
    URL: featScriptProps.getProperty("SUPABASE_DEV_URL"),
    KEY: featScriptProps.getProperty("SUPABASE_DEV_KEY")
  },
  PROD: {
    URL: featScriptProps.getProperty("SUPABASE_PROD_URL"),
    KEY: featScriptProps.getProperty("SUPABASE_PROD_KEY")
  }
};

// ==============================================================================
// Entry Points 
// ==============================================================================
function syncFeatsToDev() {
  if (!FEAT_ENV.DEV.URL || !FEAT_ENV.DEV.KEY) throw new Error("Missing Dev Script Properties.");
  console.log("Starting Feats sync to DEVELOPMENT...");
  runFeatsSync(FEAT_ENV.DEV.URL, FEAT_ENV.DEV.KEY, "DEVELOPMENT");
}

function syncFeatsToProd() {
  if (!FEAT_ENV.PROD.URL || !FEAT_ENV.PROD.KEY) throw new Error("Missing Prod Script Properties.");
  console.log("Starting Feats sync to PRODUCTION...");
  runFeatsSync(FEAT_ENV.PROD.URL, FEAT_ENV.PROD.KEY, "PRODUCTION");
}

// ==============================================================================
// Main Sync Orchestrator
// ==============================================================================
function runFeatsSync(apiUrl, apiKey, envName) {
  try {
    const featsPushed = syncFeatsData(apiUrl, apiKey);
    console.log(`✅ Sync Complete [${envName}]! Upserted ${featsPushed} Feats.`);
    
    try {
      SpreadsheetApp.getActiveSpreadsheet().toast(`Feats Upserted: ${featsPushed}`, `✅ Sync Complete [${envName}]`);
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
// 1. Parse and Sync Feats
// ==============================================================================
function syncFeatsData(apiUrl, apiKey) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FEATS_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${FEATS_SHEET_NAME}" not found.`);
  
  const data = sheet.getDataRange().getDisplayValues();
  const payload = [];
  let displayOrderCounter = 1;

  // Start at i=1 to skip the normalized headers
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const featName = String(row[0] || "").trim();
    
    // Safety check just in case
    if (!featName) continue;
    
    payload.push({
      name: featName,
      category: row[1] || null, // Empty strings from the normalizer become null for the DB
      prerequisite: row[2] || null,
      ability_increase: row[3] || null,
      source: row[4] || null,
      notes_advice: row[5] || null,
      display_order: displayOrderCounter
    });
    
    displayOrderCounter++;
  }

  if (payload.length === 0) return 0;
  
  // Upsert pointing at the composite unique constraint (name + source)
  supabaseUpsertFeats(apiUrl, apiKey, "ac_feats", payload, "name,source");
  return payload.length;
}

// ==============================================================================
// Helper: Supabase Upsert Request
// ==============================================================================
// Delete this if you already have it in your Master Sheet
function supabaseUpsertFeats(apiUrl, apiKey, tableName, payloadArray, conflictCols) {
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