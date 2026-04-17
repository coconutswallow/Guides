// ==============================================================================
// Configuration
// ==============================================================================
const CLASSES_SHEET_NAME = "Normalized Classes"; // Matches the output of your normalizer script

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