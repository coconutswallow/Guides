const CLASSES_SOURCE_SHEET_ID   = "1fBEv1yDNTD-vwUyK6pK_oiXg2K7OiltW35iFCqxyMTY";  // the ID from the source sheet's URL
const CLASSES_SOURCE_SHEET_NAME = "Classes";                 // tab name in the source sheet
const CLASSES_NORMALIZED_SHEET  = "Classes";                 // tab name in the destination sheet

const CLASSES_COLUMNS = {
  CLASS:         0,
  SUBCLASS:      1,
  HIT_DIE:       2,
  MULTICLASSING: 3,
  EXPANDED_OPT:  4,
  // CLASSES_COLUMNS 5 through 9 are empty/skipped based on the sheet layout
  RAGE_ADVICE:   10,
};

function normalizeClasses() {
  const sourceSS = SpreadsheetApp.openById(CLASSES_SOURCE_SHEET_ID);
  const source   = sourceSS.getSheetByName(CLASSES_SOURCE_SHEET_NAME);

  if (!source) {
    SpreadsheetApp.getUi().alert(`Tab "${CLASSES_SOURCE_SHEET_NAME}" not found in source sheet.`);
    return;
  }

  const data = source.getDataRange().getValues();
  const normalized = [];

  // Create the standard header row for the normalized sheet
  normalized.push([
    "Class", "Subclass", "Hit Die", "Multiclassing", "Expanded Class Options (TCE)", "Rage Advice"
  ]);

  let currentClass         = "";
  let currentHitDie        = "";
  let currentMulticlassing = "";
  let currentExpandedOpt   = "";
  let currentClassAdvice   = ""; // Used to pass parent class 'Rage Advice' to its subclasses

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // Safely parse the CLASSES_COLUMNS, falling back to empty strings if out-of-bounds
    const cls    = String(row[CLASSES_COLUMNS.CLASS] || "").trim();
    const subcls = String(row[CLASSES_COLUMNS.SUBCLASS] || "").trim();

    // Skip the header rows from the raw sheet
    if (cls === "Class" && subcls === "Subclass") continue;

    // Grab parent-level fields when a new Class is declared.
    // Unlike Races, we reset these entirely per class to avoid bleeding missing fields to the next class.
    if (cls !== "") {
      currentClass         = cls;
      currentHitDie        = String(row[CLASSES_COLUMNS.HIT_DIE] || "").trim();
      currentMulticlassing = String(row[CLASSES_COLUMNS.MULTICLASSING] || "").trim();
      currentExpandedOpt   = String(row[CLASSES_COLUMNS.EXPANDED_OPT] || "").trim();
      currentClassAdvice   = String(row[CLASSES_COLUMNS.RAGE_ADVICE] || "").trim();
    }

    // Skip the placeholder parent row 
    if (subcls === "(choose one)") continue;

    // Skip fully empty rows
    if (currentClass === "" && subcls === "") continue;

    // Subclasses can have their own Rage Advice (e.g. Battlerager). 
    // If they do, use it; otherwise, inherit the parent class's general notes/advice.
    let advice = String(row[CLASSES_COLUMNS.RAGE_ADVICE] || "").trim();
    if (advice === "" && currentClassAdvice !== "") {
      advice = currentClassAdvice;
    }

    normalized.push([
      currentClass,
      subcls,
      currentHitDie,
      currentMulticlassing,
      currentExpandedOpt,
      advice
    ]);
  }

  // Write to Normalized sheet in this workbook (create if missing)
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let normSheet = ss.getSheetByName(CLASSES_NORMALIZED_SHEET);
  if (!normSheet) {
    normSheet = ss.insertSheet(CLASSES_NORMALIZED_SHEET);
  } else {
    normSheet.clearContents();
  }

  // Set the normalized data range
  normSheet.getRange(1, 1, normalized.length, normalized[0].length)
    .setValues(normalized);

  SpreadsheetApp.getUi().alert(
    `Done! ${normalized.length - 1} rows written to "${CLASSES_NORMALIZED_SHEET}".`
  );
}
// ==============================================================================
// Configuration
// ==============================================================================
const CLASSES_SHEET_NAME = "Classes"; // Matches the output of your normalizer script

// Securely fetch the exact same secrets you already set up
const classScriptProps = PropertiesService.getScriptProperties();
const CLASS_ENV = {
  DEV: {
    URL: classScriptProps.getProperty("SUPABASE_DEV_URL"),
    KEY: classScriptProps.getProperty("SUPABASE_DEV_KEY")
  },
  PROD: {
    URL: classScriptProps.getProperty("SUPABASE_PROD_URL"),
    KEY: classScriptProps.getProperty("SUPABASE_PROD_KEY")
  }
};

// ==============================================================================
// Create Custom Menu Items
// ==============================================================================
// If using a Master Sheet, add these items to your single master onOpen() function
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Database Sync')
    .addItem('🚀 Sync Classes to DEV', 'syncClassesToDev')
    .addItem('🚨 Sync Classes to PROD', 'syncClassesToProd')
    .addToUi();
}

// ==============================================================================
// Entry Points 
// ==============================================================================
function syncClassesToDev() {
  if (!CLASS_ENV.DEV.URL || !CLASS_ENV.DEV.KEY) throw new Error("Missing Dev Script Properties.");
  console.log("Starting Classes sync to DEVELOPMENT...");
  runClassSync(CLASS_ENV.DEV.URL, CLASS_ENV.DEV.KEY, "DEVELOPMENT");
}

function syncClassesToProd() {
  if (!CLASS_ENV.PROD.URL || !CLASS_ENV.PROD.KEY) throw new Error("Missing Prod Script Properties.");
  console.log("Starting Classes sync to PRODUCTION...");
  runClassSync(CLASS_ENV.PROD.URL, CLASS_ENV.PROD.KEY, "PRODUCTION");
}

// ==============================================================================
// Main Sync Orchestrator
// ==============================================================================
function runClassSync(apiUrl, apiKey, envName) {
  try {
    const classesPushed = syncClassesData(apiUrl, apiKey);
    console.log(`✅ Sync Complete [${envName}]! Upserted ${classesPushed} Classes/Subclasses.`);
    
    // Non-blocking toast notification
    try {
      SpreadsheetApp.getActiveSpreadsheet().toast(`Classes Upserted: ${classesPushed}`, `✅ Sync Complete [${envName}]`);
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
// 1. Parse and Sync Classes
// ==============================================================================
function syncClassesData(apiUrl, apiKey) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CLASSES_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${CLASSES_SHEET_NAME}" not found.`);
  
  // getDisplayValues ensures we don't accidentally parse anything weird as dates
  const data = sheet.getDataRange().getDisplayValues();
  const payload = [];

  let displayOrderCounter = 1;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const className = String(row[0] || "").trim();
    
    // Skip empty rows and the header row
    if (!className || className === "Class") continue;
    
    payload.push({
      name: className,
      subclass: String(row[1] || "(none)").trim(), // Forces "(none)" if blank
      hit_die: row[2] || null,
      multiclassing: row[3] || null,
      expanded_options: row[4] || null,
      rage_advice: row[5] || null,
      display_order: displayOrderCounter
    });
    
    displayOrderCounter++;
  }

  if (payload.length === 0) return 0;
  
  // Upsert pointing at the composite unique constraint (name + subclass)
  supabaseUpsertClasses(apiUrl, apiKey, "ac_classes", payload, "name,subclass");
  
  return payload.length;
}

// ==============================================================================
// Helper: Supabase Upsert Request
// ==============================================================================
// If using a Master sheet, you can delete this duplicate helper and just rename the 
// function call in syncClassesData to match your existing supabaseUpsert helper
function supabaseUpsertClasses(apiUrl, apiKey, tableName, payloadArray, conflictCols) {
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