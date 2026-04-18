const MISC_FEAT_SOURCE_SHEET_ID   = "1fBEv1yDNTD-vwUyK6pK_oiXg2K7OiltW35iFCqxyMTY";  
const MISC_FEAT_SOURCE_SHEET_NAME = "Misc. Class Features";             
const FS_SHEET_NAME     = "Fighting Styles";        
const AI_SHEET_NAME     = "Artificer Infusions";  
const EI_SHEET_NAME     = "Eldritch Invocations";  

/**
 * Parses the "Misc. Class Features" tab and splits data into 3 sheets.
 */
function parseMiscClassFeatures() {
  const sourceSS = SpreadsheetApp.openById(MISC_FEAT_SOURCE_SHEET_ID);
  const source   = sourceSS.getSheetByName(MISC_FEAT_SOURCE_SHEET_NAME);

  if (!source) {
    SpreadsheetApp.getUi().alert(`Tab "${MISC_FEAT_SOURCE_SHEET_NAME}" not found in source sheet.`);
    return;
  }

  const data = source.getDataRange().getDisplayValues();
  
  const fightingStyles = [];
  const artificerInfusions = [];
  const eldritchInvocations = [];

  let currentSection = "";

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const c0 = String(row[0] || "").trim();
    const c1 = String(row[1] || "").trim();
    const c2 = String(row[2] || "").trim();
    const c3 = String(row[3] || "").trim();
    const c4 = String(row[4] || "").trim();
    const c5 = String(row[5] || "").trim();

    if (c0.startsWith("Go to")) continue;

    if (c0 === "Fighting Styles") {
      currentSection = "FS";
      continue;
    } else if (c0 === "Artificer Infusions") {
      currentSection = "AI";
      continue;
    } else if (c0 === "Eldritch Invocations") {
      currentSection = "EI";
      continue;
    }

    if (c0 === "" && c1 === "" && c2 === "" && c3 === "" && c4 === "" && c5 === "") continue;

    // Skip column headers
    if (c0 === "Style Name" || c0 === "Infusion Name" || c0 === "Invocation") continue;

    if (currentSection === "FS") {
      fightingStyles.push([c0, c1, c2, c3]);
    } else if (currentSection === "AI") {
      artificerInfusions.push([c0, c1, c2, c3, c4, c5]);
    } else if (currentSection === "EI") {
      eldritchInvocations.push([c0, c1, c2, c3, c4, c5]);
    }
  }

  // Add back normalized headers for the local sheets
  fightingStyles.unshift(["Style Name", "Classes", "Source", "Notes / Advice"]);
  artificerInfusions.unshift(["Infusion Name", "Item Prerequisite", "Requires Attunement", "Level", "Source", "Notes / Advice"]);
  eldritchInvocations.unshift(["Invocation", "Pact Prereq", "Other Prereq", "Level", "Source", "Notes / Advice"]);

  function writeToSheet(sheetName, sheetData) {
    if (sheetData.length <= 1) return; // Only header and no data
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) sheet = ss.insertSheet(sheetName);
    else sheet.clearContents();
    sheet.getRange(1, 1, sheetData.length, sheetData[0].length).setValues(sheetData);
  }

  writeToSheet(FS_SHEET_NAME, fightingStyles);
  writeToSheet(AI_SHEET_NAME, artificerInfusions);
  writeToSheet(EI_SHEET_NAME, eldritchInvocations);

  SpreadsheetApp.getUi().alert(
    `Done! Exported:\n- ${fightingStyles.length - 1} Fighting Styles\n- ${artificerInfusions.length - 1} Artificer Infusions\n- ${eldritchInvocations.length - 1} Eldritch Invocations`
  );
}

// ==============================================================================
// SUPABASE SYNC LOGIC
// ==============================================================================
const miscScriptProps = PropertiesService.getScriptProperties();
const MISC_ENV = {
  DEV: {
    URL: miscScriptProps.getProperty("SUPABASE_DEV_URL"),
    KEY: miscScriptProps.getProperty("SUPABASE_DEV_KEY")
  },
  PROD: {
    URL: miscScriptProps.getProperty("SUPABASE_PROD_URL"),
    KEY: miscScriptProps.getProperty("SUPABASE_PROD_KEY")
  }
};

function syncMiscFeatsToDev() { syncAllMisc(MISC_ENV.DEV.URL, MISC_ENV.DEV.KEY, "DEVELOPMENT"); }
function syncMiscFeatsToProd() { syncAllMisc(MISC_ENV.PROD.URL, MISC_ENV.PROD.KEY, "PRODUCTION"); }

function syncAllMisc(apiUrl, apiKey, envName) {
  if (!apiUrl || !apiKey) throw new Error(`Missing Supabase credentials for ${envName}.`);
  
  const results = [];
  results.push(`FS: ${syncTable(apiUrl, apiKey, FS_SHEET_NAME, "ac_fighting_styles", mapFS)}`);
  results.push(`AI: ${syncTable(apiUrl, apiKey, AI_SHEET_NAME, "ac_artificer_infusions", mapAI)}`);
  results.push(`EI: ${syncTable(apiUrl, apiKey, EI_SHEET_NAME, "ac_eldritch_invocations", mapEI)}`);
  
  const msg = `✅ Sync Complete [${envName}]!\n${results.join('\n')}`;
  console.log(msg);
  try { SpreadsheetApp.getActiveSpreadsheet().toast(msg, "Sync Complete"); } catch(e) {}
}

function syncTable(apiUrl, apiKey, sheetName, tableName, mapperFn) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return "Sheet missing";
  
  const data = sheet.getDataRange().getDisplayValues();
  const payload = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    payload.push(mapperFn(row, i));
  }
  
  if (payload.length === 0) return "0 rows";
  
  supabaseUpsertMisc(apiUrl, apiKey, tableName, payload);
  return `${payload.length} rows`;
}

// Mappers
function mapFS(r, idx) {
  return { name: r[0], classes: r[1], source: r[2], notes_advice: r[3], display_order: idx };
}
function mapAI(r, idx) {
  return { name: r[0], item_prereq: r[1], requires_attunement: r[2], level_prereq: r[3], source: r[4], notes_advice: r[5], display_order: idx };
}
function mapEI(r, idx) {
  return { name: r[0], pact_prereq: r[1], other_prereq: r[2], level_prereq: r[3], source: r[4], notes_advice: r[5], display_order: idx };
}

function supabaseUpsertMisc(apiUrl, apiKey, tableName, payload) {
  const endpoint = `${apiUrl}/rest/v1/${tableName}?on_conflict=name,source`;
  const options = {
    method: "post",
    headers: {
      "apikey": apiKey,
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal, resolution=merge-duplicates" 
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  const response = UrlFetchApp.fetch(endpoint, options);
  if (response.getResponseCode() >= 400) throw new Error(`Supabase Error [${tableName}]: ${response.getContentText()}`);
}