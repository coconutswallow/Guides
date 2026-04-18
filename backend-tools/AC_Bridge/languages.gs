// ==============================================================================
// Configuration
// ==============================================================================
const LANG_SOURCE_SHEET_ID   = "1fBEv1yDNTD-vwUyK6pK_oiXg2K7OiltW35iFCqxyMTY";  
const LANG_SOURCE_SHEET_NAME = "Languages";             
const LANG_TYPES_SHEET_NAME  = "Language Types";        
const LANGS_SHEET_NAME       = "Languages";  

const COL_LANG     = 0;
const COL_SCRIPT   = 1;
const COL_ORIGIN   = 2;
const COL_SPEAKERS = 3;
const COL_NOTES    = 8;  // Notes are placed in column I

const langScriptProps = PropertiesService.getScriptProperties();
const LANG_ENV = {
  DEV: {
    URL: langScriptProps.getProperty("SUPABASE_DEV_URL"),
    KEY: langScriptProps.getProperty("SUPABASE_DEV_KEY")
  },
  PROD: {
    URL: langScriptProps.getProperty("SUPABASE_PROD_URL"),
    KEY: langScriptProps.getProperty("SUPABASE_PROD_KEY")
  }
};

// ==============================================================================
// Create Custom Menu Items
// ==============================================================================
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Database Sync')
    .addItem('🚀 Sync Languages to DEV', 'syncLanguagesToDev')
    .addItem('🚨 Sync Languages to PROD', 'syncLanguagesToProd')
    .addToUi();
}

// ==============================================================================
// 1. Normalizer (Preserved from User Upload)
// ==============================================================================
function normalizeLanguages() {
  const sourceSS = SpreadsheetApp.openById(LANG_SOURCE_SHEET_ID);
  const source   = sourceSS.getSheetByName(LANG_SOURCE_SHEET_NAME);

  if (!source) {
    SpreadsheetApp.getUi().alert(`Tab "${LANG_SOURCE_SHEET_NAME}" not found in source sheet.`);
    return;
  }

  const data = source.getDataRange().getValues();
  
  const typesData = [["Language Type", "Description"]];
  const langsData = [["Language", "Language Type", "Script", "Origin", "Typical Speakers", "Notes"]];

  let state = "SEARCHING_CATEGORY";
  let currentCategory = "";
  let currentDesc = "";

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    
    const cLang     = String(row[COL_LANG] || "").trim();
    const cScript   = String(row[COL_SCRIPT] || "").trim();
    const cOrigin   = String(row[COL_ORIGIN] || "").trim();
    const cSpeakers = String(row[COL_SPEAKERS] || "").trim();
    const cNotes    = String(row[COL_NOTES] || "").trim();

    if (cLang === "Jump to") continue;
    if (cLang === "" && cScript === "" && cOrigin === "") {
      state = "SEARCHING_CATEGORY";
      continue;
    }

    if (state === "SEARCHING_CATEGORY") {
      if (cLang !== "" && cScript === "" && cOrigin === "") {
        currentCategory = cLang;
        currentDesc = "";
        typesData.push([currentCategory, currentDesc]);
        state = "CATEGORY_NOTES";
        continue;
      }
      if (cLang === "Language" && cScript === "Script") {
        state = "DATA";
        continue;
      }
    } 
    else if (state === "CATEGORY_NOTES") {
      if (cLang === "Language" && cScript === "Script") {
        state = "DATA";
      } else if (cLang !== "" && cScript === "" && cOrigin === "") {
        if (currentDesc === "") {
          currentDesc = cLang;
        } else {
          currentDesc += "\n\n" + cLang; 
        }
        typesData[typesData.length - 1][1] = currentDesc;
      }
    } 
    else if (state === "DATA") {
      if (cLang === "Language" && cScript === "Script") continue; 
      
      langsData.push([
        cLang,
        currentCategory,
        cScript,
        cOrigin,
        cSpeakers,
        cNotes
      ]);
    }
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let typesSheet = ss.getSheetByName(LANG_TYPES_SHEET_NAME);
  if (!typesSheet) typesSheet = ss.insertSheet(LANG_TYPES_SHEET_NAME);
  else typesSheet.clearContents();
  typesSheet.getRange(1, 1, typesData.length, typesData[0].length).setValues(typesData);

  let langsSheet = ss.getSheetByName(LANGS_SHEET_NAME);
  if (!langsSheet) langsSheet = ss.insertSheet(LANGS_SHEET_NAME);
  else langsSheet.clearContents();
  langsSheet.getRange(1, 1, langsData.length, langsData[0].length).setValues(langsData);

  SpreadsheetApp.getUi().alert(`Done! Exported ${typesData.length - 1} Types and ${langsData.length - 1} Languages.`);
}

// ==============================================================================
// 2. Entry Points for Sync
// ==============================================================================
function syncLanguagesToDev() {
  if (!LANG_ENV.DEV.URL || !LANG_ENV.DEV.KEY) throw new Error("Missing Dev Script Properties.");
  console.log("Starting Languages sync to DEVELOPMENT...");
  runLanguagesSync(LANG_ENV.DEV.URL, LANG_ENV.DEV.KEY, "DEVELOPMENT");
}

function syncLanguagesToProd() {
  if (!LANG_ENV.PROD.URL || !LANG_ENV.PROD.KEY) throw new Error("Missing Prod Script Properties.");
  console.log("Starting Languages sync to PRODUCTION...");
  runLanguagesSync(LANG_ENV.PROD.URL, LANG_ENV.PROD.KEY, "PRODUCTION");
}

// ==============================================================================
// 3. Main Sync Orchestrator
// ==============================================================================
function runLanguagesSync(apiUrl, apiKey, envName) {
  try {
    // A. Sync Types
    const typesPushed = syncLanguageTypes(apiUrl, apiKey);
    console.log(`Language Types Upserted: ${typesPushed}`);
    
    // B. Fetch UUID Mapping
    const typeMap = fetchLanguageTypeMap(apiUrl, apiKey);
    
    // C. Sync Languages using UUIDs
    const langsPushed = syncLanguagesData(apiUrl, apiKey, typeMap);
    console.log(`Languages Upserted: ${langsPushed}`);
    
    console.log(`✅ Sync Complete [${envName}]!`);
    
    try {
      SpreadsheetApp.getActiveSpreadsheet().toast(`Types: ${typesPushed} | Langs: ${langsPushed}`, `✅ Sync Complete [${envName}]`);
    } catch(e) {}
    
  } catch (error) {
    console.error(`❌ Error during sync to ${envName}: ${error.message}`);
    try {
       SpreadsheetApp.getActiveSpreadsheet().toast(`${error.message}`, `❌ Sync Error [${envName}]`, 10);
    } catch(e) {}
  }
}

// ==============================================================================
// 4. Sync Language Types
// ==============================================================================
function syncLanguageTypes(apiUrl, apiKey) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(LANG_TYPES_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${LANG_TYPES_SHEET_NAME}" not found.`);
  
  const data = sheet.getDataRange().getDisplayValues();
  const payload = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue; 
    
    payload.push({
      name: row[0],
      description: row[1] || null,
      display_order: i 
    });
  }

  if (payload.length === 0) return 0;
  supabaseUpsertLangs(apiUrl, apiKey, "ac_language_types", payload, "name");
  return payload.length;
}

// ==============================================================================
// 5. Fetch Type UUID Mapping
// ==============================================================================
function fetchLanguageTypeMap(apiUrl, apiKey) {
  const endpoint = `${apiUrl}/rest/v1/ac_language_types?select=id,name`;
  
  const options = {
    method: "get",
    headers: {
      "apikey": apiKey,
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(endpoint, options);
  if (response.getResponseCode() >= 400) {
    throw new Error(`Failed to fetch mapping: ${response.getContentText()}`);
  }

  const json = JSON.parse(response.getContentText());
  const map = {};
  json.forEach(t => map[t.name] = t.id);
  return map;
}

// ==============================================================================
// 6. Sync Languages Data
// ==============================================================================
function syncLanguagesData(apiUrl, apiKey, typeMap) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(LANGS_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${LANGS_SHEET_NAME}" not found.`);
  
  const data = sheet.getDataRange().getDisplayValues();
  const payload = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue; 
    
    const typeName = row[1];
    const typeId = typeMap[typeName] || null;

    if (!typeId) {
      console.warn(`Warning: Could not find UUID for type "${typeName}" for language "${row[0]}"`);
    }

    // Clean em-dashes from the script column
    let rawScript = String(row[2] || "").trim();
    let cleanScript = (rawScript === "—" || rawScript === "") ? null : rawScript;

    payload.push({
      name: row[0],
      type_id: typeId,
      script: cleanScript,
      origin: row[3] || null,
      typical_speakers: row[4] || null,
      notes: row[5] || null,
      display_order: i
    });
  }

  if (payload.length === 0) return 0;
  supabaseUpsertLangs(apiUrl, apiKey, "ac_languages", payload, "name");
  return payload.length;
}

// ==============================================================================
// 7. Helper: Supabase Upsert
// ==============================================================================
function supabaseUpsertLangs(apiUrl, apiKey, tableName, payloadArray, conflictCols) {
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