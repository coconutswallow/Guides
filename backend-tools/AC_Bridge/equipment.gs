// ==============================================================================
// Configuration
// ==============================================================================
const EQUIP_SOURCE_SHEET_ID   = "1fBEv1yDNTD-vwUyK6pK_oiXg2K7OiltW35iFCqxyMTY";  // ID of your raw data workbook
const EQUIP_SOURCE_SHEET_NAME = "Equipment";               
const EQUIP_CATS_SHEET_NAME   = "Equipment Categories";    
const EQUIP_ITEMS_SHEET_NAME  = "Normalized Equipment";    

const equipScriptProps = PropertiesService.getScriptProperties();
const EQUIP_ENV = {
  DEV: {
    URL: equipScriptProps.getProperty("SUPABASE_DEV_URL"),
    KEY: equipScriptProps.getProperty("SUPABASE_DEV_KEY")
  },
  PROD: {
    URL: equipScriptProps.getProperty("SUPABASE_PROD_URL"),
    KEY: equipScriptProps.getProperty("SUPABASE_PROD_KEY")
  }
};

// ==============================================================================
// Create Custom Menu Items
// ==============================================================================
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Database Sync')
    .addItem('🚀 Sync Equipment to DEV', 'syncEquipmentToDev')
    .addItem('🚨 Sync Equipment to PROD', 'syncEquipmentToProd')
    .addToUi();
}

// ==============================================================================
// 1. Normalizer 
// ==============================================================================
function normalizeEquipment() {
  const sourceSS = SpreadsheetApp.openById(EQUIP_SOURCE_SHEET_ID);
  const source   = sourceSS.getSheetByName(EQUIP_SOURCE_SHEET_NAME);

  if (!source) {
    SpreadsheetApp.getUi().alert(`Tab "${EQUIP_SOURCE_SHEET_NAME}" not found in source sheet.`);
    return;
  }

  // Use getDisplayValues to ensure fractions and costs remain text
  const data = source.getDataRange().getDisplayValues();
  
  // Arrays for the two normalized tables
  const categoriesData = [["Category", "Notes"]];
  const itemsData = [
    ["Category", "Name", "Source", "Cost (GP)", "Weight (lbs)", "Crafting Cost (GP)", "Crafting Cost (DTP)", "Crafting Requirements", "Description", "Notes / Rage Advice"]
  ];

  let state = "SEARCHING_CATEGORY";
  let currentCategory = "";
  let currentNotes = "";

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    
    const c0  = String(row[0] || "").trim();
    const c1  = String(row[1] || "").trim();
    const c2  = String(row[2] || "").trim();
    const c3  = String(row[3] || "").trim();
    const c4  = String(row[4] || "").trim();
    const c5  = String(row[5] || "").trim();
    const c6  = String(row[6] || "").trim();
    const c7  = String(row[7] || "").trim();
    const c10 = String(row[10] || "").trim(); // Notes / Rage advice

    // 1. Skip Link Navigation rows
    if (c0.startsWith("Jump to")) continue;

    // 2. A fully blank row triggers a reset to find the next category
    if (c0 === "" && c1 === "" && c5 === "") {
      state = "SEARCHING_CATEGORY";
      continue;
    }

    // 3. Subcategory detection
    if (state === "DATA" && c0 !== "" && c1 === "" && c5 === "") {
      state = "SEARCHING_CATEGORY";
    }

    // 4. STATE: Finding a Category Header
    if (state === "SEARCHING_CATEGORY") {
      if (c0 !== "" && c1 === "" && c5 === "") {
        currentCategory = c0;
        currentNotes = "";
        categoriesData.push([currentCategory, currentNotes]);
        state = "CATEGORY_NOTES";
        continue;
      }
      if (c0 === "Name" && c1 === "Source") {
        state = "HEADER_1";
        continue;
      }
    } 
    
    // 5. STATE: Reading Notes beneath the Category
    else if (state === "CATEGORY_NOTES") {
      if (c0 === "Name" && c1 === "Source") {
        state = "HEADER_1";
      } else if (c0 !== "" && c1 === "" && c5 === "") {
        if (currentNotes === "") {
          currentNotes = c0;
        } else {
          currentNotes += "\n\n" + c0;
        }
        categoriesData[categoriesData.length - 1][1] = currentNotes;
      }
    } 
    
    // 6. STATE: Navigating the double-header of the table
    else if (state === "HEADER_1") {
      if (c4 === "GP" || (c0 === "" && c1 === "")) {
        state = "DATA";
      }
    } 
    
    // 7. STATE: Extracting standard rows
    else if (state === "DATA") {
      if (c0 === "Name" && c1 === "Source") {
        state = "HEADER_1";
        continue;
      }
      if (c0 !== "" && c0 !== "nan") {
        itemsData.push([
          currentCategory, c0, c1, c2, c3, c4, c5, c6, c7, c10
        ]);
      }
    }
  }

  // Write to destination workbook
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let catsSheet = ss.getSheetByName(EQUIP_CATS_SHEET_NAME);
  if (!catsSheet) catsSheet = ss.insertSheet(EQUIP_CATS_SHEET_NAME);
  else catsSheet.clearContents();
  catsSheet.getRange(1, 1, categoriesData.length, categoriesData[0].length).setValues(categoriesData);

  let itemsSheet = ss.getSheetByName(EQUIP_ITEMS_SHEET_NAME);
  if (!itemsSheet) itemsSheet = ss.insertSheet(EQUIP_ITEMS_SHEET_NAME);
  else itemsSheet.clearContents();
  itemsSheet.getRange(1, 1, itemsData.length, itemsData[0].length).setValues(itemsData);

  SpreadsheetApp.getUi().alert(`Done! Exported ${categoriesData.length - 1} Categories and ${itemsData.length - 1} Equipment Items.`);
}

// ==============================================================================
// 2. Entry Points for Sync
// ==============================================================================
function syncEquipmentToDev() {
  if (!EQUIP_ENV.DEV.URL || !EQUIP_ENV.DEV.KEY) throw new Error("Missing Dev Script Properties.");
  console.log("Starting Equipment sync to DEVELOPMENT...");
  runEquipmentSync(EQUIP_ENV.DEV.URL, EQUIP_ENV.DEV.KEY, "DEVELOPMENT");
}

function syncEquipmentToProd() {
  if (!EQUIP_ENV.PROD.URL || !EQUIP_ENV.PROD.KEY) throw new Error("Missing Prod Script Properties.");
  console.log("Starting Equipment sync to PRODUCTION...");
  runEquipmentSync(EQUIP_ENV.PROD.URL, EQUIP_ENV.PROD.KEY, "PRODUCTION");
}

// ==============================================================================
// 3. Main Sync Orchestrator
// ==============================================================================
function runEquipmentSync(apiUrl, apiKey, envName) {
  try {
    const catsPushed = syncEquipmentCategories(apiUrl, apiKey);
    console.log(`Categories Upserted: ${catsPushed}`);
    
    const categoryMap = fetchEquipmentCategoryMap(apiUrl, apiKey);
    
    const itemsPushed = syncEquipmentData(apiUrl, apiKey, categoryMap);
    console.log(`Equipment Upserted: ${itemsPushed}`);
    
    console.log(`✅ Sync Complete [${envName}]!`);
    
    try {
      SpreadsheetApp.getActiveSpreadsheet().toast(`Categories: ${catsPushed} | Equipment: ${itemsPushed}`, `✅ Sync Complete [${envName}]`);
    } catch(e) {}
    
  } catch (error) {
    console.error(`❌ Error during sync to ${envName}: ${error.message}`);
    try {
       SpreadsheetApp.getActiveSpreadsheet().toast(`${error.message}`, `❌ Sync Error [${envName}]`, 10);
    } catch(e) {}
  }
}

// ==============================================================================
// 4. Sync Equipment Categories
// ==============================================================================
function syncEquipmentCategories(apiUrl, apiKey) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(EQUIP_CATS_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${EQUIP_CATS_SHEET_NAME}" not found.`);
  
  const data = sheet.getDataRange().getDisplayValues();
  const payload = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue; 
    
    payload.push({
      name: row[0],
      notes: row[1] || null,
      display_order: i 
    });
  }

  if (payload.length === 0) return 0;
  supabaseUpsertEquipment(apiUrl, apiKey, "ac_equipment_categories", payload, "name");
  return payload.length;
}

// ==============================================================================
// 5. Fetch Category UUID Mapping
// ==============================================================================
function fetchEquipmentCategoryMap(apiUrl, apiKey) {
  const endpoint = `${apiUrl}/rest/v1/ac_equipment_categories?select=id,name`;
  
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
  json.forEach(c => map[c.name] = c.id);
  return map;
}

// ==============================================================================
// 6. Sync Equipment Data
// ==============================================================================
function syncEquipmentData(apiUrl, apiKey, categoryMap) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(EQUIP_ITEMS_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${EQUIP_ITEMS_SHEET_NAME}" not found.`);
  
  const data = sheet.getDataRange().getDisplayValues();
  const payload = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[1]) continue; 
    
    const categoryName = row[0];
    const categoryId = categoryMap[categoryName] || null;

    if (!categoryId) {
      console.warn(`Warning: Could not find UUID for category "${categoryName}" for item "${row[1]}"`);
    }

    payload.push({
      category_id: categoryId,
      name: row[1],
      source: row[2] || null,
      cost_gp: row[3] || null,
      weight_lbs: row[4] || null,
      craft_cost_gp: row[5] || null,
      craft_cost_dtp: row[6] || null,
      craft_reqs: row[7] || null,
      description: row[8] || null,
      notes_advice: row[9] || null,
      display_order: i
    });
  }

  if (payload.length === 0) return 0;
  supabaseUpsertEquipment(apiUrl, apiKey, "ac_equipment", payload, "name,source");
  return payload.length;
}

// ==============================================================================
// 7. Helper: Supabase Upsert
// ==============================================================================
function supabaseUpsertEquipment(apiUrl, apiKey, tableName, payloadArray, conflictCols) {
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