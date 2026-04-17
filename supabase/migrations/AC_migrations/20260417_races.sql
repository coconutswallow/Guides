const BASTION_SOURCE_SHEET_ID   = "1fBEv1yDNTD-vwUyK6pK_oiXg2K7OiltW35iFCqxyMTY";  
const BASTION_SOURCE_SHEET_NAME = "Bastions";               
const BASTION_CATS_SHEET_NAME   = "Bastions Categories";    
const BASTION_ITEMS_SHEET_NAME  = "Normalized Bastions";    

function normalizeBastions() {
  const sourceSS = SpreadsheetApp.openById(BASTION_SOURCE_SHEET_ID);
  const source   = sourceSS.getSheetByName(BASTION_SOURCE_SHEET_NAME);

  if (!source) {
    SpreadsheetApp.getUi().alert(`Tab "${BASTION_SOURCE_SHEET_NAME}" not found in source sheet.`);
    return;
  }

  // Use getDisplayValues() to prevent Google Sheets from turning fractions into Dates
  const data = source.getDataRange().getDisplayValues();
  
  // Arrays for the two normalized tables (Notice the new Display Order column)
  const categoriesData = [["Category", "Notes", "Display Order"]];
  const itemsData = [
    ["Category", "Name", "Source", "Size", "Building Prerequisite", "Cost (GP)", "Cost (DTP)", "Order", "Description", "Notes / Rage Advice"]
  ];

  let state = "SEARCHING_CATEGORY";
  let displayOrderCounter = 1; // Start the counter for SQL ordering
  
  // Initialize with a default category for the global rules at the top of the sheet
  let currentCategory = "General Rules";
  let currentNotes = "";
  
  // Push the first category with its Display Order
  categoriesData.push([currentCategory, currentNotes, displayOrderCounter]);
  displayOrderCounter++;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    
    // Parse the specific columns containing the Bastion data
    const c0  = String(row[0] || "").trim();  // Name
    const c2  = String(row[2] || "").trim();  // Source
    const c3  = String(row[3] || "").trim();  // Size
    const c4  = String(row[4] || "").trim();  // Building Prerequisite
    const c6  = String(row[6] || "").trim();  // GP
    const c7  = String(row[7] || "").trim();  // DTP
    const c8  = String(row[8] || "").trim();  // Order
    const c9  = String(row[9] || "").trim();  // Description
    const c12 = String(row[12] || "").trim(); // Notes / Rage Advice

    // 1. Skip Link Navigation rows
    if (c0 === "Jump to") continue;
    if (c0 === "Basic Facilities" && c2 === "Special Facilities") continue;

    // 2. A fully blank row triggers a reset to find the next category
    if (c0 === "" && c2 === "" && c6 === "") {
      state = "SEARCHING_CATEGORY";
      continue;
    }

    // 3. Subcategory detection: A single column populated while extracting DATA
    if (state === "DATA" && c0 !== "" && c2 === "" && c6 === "") {
      state = "SEARCHING_CATEGORY";
    }

    // 4. STATE: Finding a Category Header
    if (state === "SEARCHING_CATEGORY") {
      // Is it a category name? (Text in column A, but no Source/GP data)
      if (c0 !== "" && c2 === "" && c6 === "") {
        
        // Differentiate between a short category title and a long general rule
        if (c0.length > 50) {
          // It's a rule/note! Append it to the most recent category
          let lastIdx = categoriesData.length - 1;
          if (categoriesData[lastIdx][1] === "") {
            categoriesData[lastIdx][1] = c0;
          } else {
            categoriesData[lastIdx][1] += "\n\n" + c0;
          }
          state = "CATEGORY_NOTES";
          continue;
        } else {
          // It's a true Category! (e.g. "Basic Facilities")
          currentCategory = c0;
          currentNotes = "";
          state = "CATEGORY_NOTES";
          
          // PUSH CATEGORY WITH DISPLAY ORDER
          categoriesData.push([currentCategory, currentNotes, displayOrderCounter]);
          displayOrderCounter++; // Increment!
          continue;
        }
      }
      
      // Found the actual Table Header
      if (c0 === "Name" && c2 === "Source") {
        state = "HEADER_1";
        continue;
      }
    } 
    
    // 5. STATE: Reading Notes beneath the Category
    else if (state === "CATEGORY_NOTES") {
      if (c0 === "Name" && c2 === "Source") {
        state = "HEADER_1";
      } else if (c0 !== "" && c2 === "" && c6 === "") {
        // Normal Note line, concatenate it
        let lastIdx = categoriesData.length - 1;
        if (categoriesData[lastIdx][1] === "") {
            categoriesData[lastIdx][1] = c0;
        } else {
            categoriesData[lastIdx][1] += "\n\n" + c0;
        }
      }
    } 
    
    // 6. STATE: Navigating the double-header of the table
    else if (state === "HEADER_1") {
      // The second line of headers says "Prerequisite" under Building
      if (c4 === "Prerequisite" || (c0 === "" && c2 === "")) {
        state = "DATA";
      }
    } 
    
    // 7. STATE: Extracting standard rows
    else if (state === "DATA") {
      // Ignore repeat headers inside data sections
      if (c0 === "Name" && c2 === "Source") {
        state = "HEADER_1";
        continue;
      }
      
      // Store the real Item Data
      if (c0 !== "" && c0 !== "nan") {
        itemsData.push([
          currentCategory, c0, c2, c3, c4, c6, c7, c8, c9, c12
        ]);
      }
    }
  }

  // Write to destination workbook
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Helper function to insert data safely
  function insertData(sheetName, dataArray) {
    if (dataArray.length === 0) return;
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) sheet = ss.insertSheet(sheetName);
    else sheet.clearContents();
    sheet.getRange(1, 1, dataArray.length, dataArray[0].length).setValues(dataArray);
  }

  // Insert both tables
  insertData(BASTION_CATS_SHEET_NAME, categoriesData);
  insertData(BASTION_ITEMS_SHEET_NAME, itemsData);

  SpreadsheetApp.getUi().alert(
    `Done! Exported ${categoriesData.length - 1} Categories and ${itemsData.length - 1} Bastion Facilities.`
  );
}
// ==============================================================================
// Configuration
// ==============================================================================
// const BASTION_CATS_SHEET_NAME  = "Bastions Categories";    
// const BASTION_ITEMS_SHEET_NAME = "Normalized Bastions"; 

// Securely fetch secrets from Script Properties
const scriptProps = PropertiesService.getScriptProperties();

const ENV = {
  DEV: {
    URL: scriptProps.getProperty("SUPABASE_DEV_URL"),
    KEY: scriptProps.getProperty("SUPABASE_DEV_KEY")
  },
  PROD: {
    URL: scriptProps.getProperty("SUPABASE_PROD_URL"),
    KEY: scriptProps.getProperty("SUPABASE_PROD_KEY")
  }
};

// ==============================================================================
// Create a Custom Menu in Google Sheets (For Manual Syncing)
// ==============================================================================
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Database Sync')
    .addItem('🚀 Sync Bastions to DEV', 'syncBastionsToDev')
    .addItem('🚨 Sync Bastions to PROD', 'syncBastionsToProd')
    .addToUi();
}

// ==============================================================================
// Entry Points (Run these from the editor, custom menu, or time-driven trigger)
// ==============================================================================
function syncBastionsToDev() {
  if (!ENV.DEV.URL || !ENV.DEV.KEY) throw new Error("Missing Dev Script Properties.");
  console.log("Starting Bastions sync to DEVELOPMENT...");
  runSyncOrchestrator(ENV.DEV.URL, ENV.DEV.KEY, "DEVELOPMENT");
}

function syncBastionsToProd() {
  if (!ENV.PROD.URL || !ENV.PROD.KEY) throw new Error("Missing Prod Script Properties.");
  console.log("Starting Bastions sync to PRODUCTION...");
  runSyncOrchestrator(ENV.PROD.URL, ENV.PROD.KEY, "PRODUCTION");
}

// ==============================================================================
// Main Sync Orchestrator
// ==============================================================================
function runSyncOrchestrator(apiUrl, apiKey, envName) {
  try {
    // 1. Sync the Categories (Now includes display_order)
    const categoriesPushed = syncCategories(apiUrl, apiKey);
    console.log(`Categories Upserted: ${categoriesPushed}`);
    
    // 2. Fetch the UUID Map from Supabase (Category Name -> UUID)
    const categoryMap = fetchCategoryMap(apiUrl, apiKey);
    
    // 3. Sync the Bastions using the mapped UUIDs
    const bastionsPushed = syncBastionItems(apiUrl, apiKey, categoryMap);
    console.log(`Bastions Upserted: ${bastionsPushed}`);
    
    console.log(`✅ Sync Complete [${envName}]!`);
    
    // Non-blocking UI Toast. Fails silently if running headlessly on a trigger.
    try {
      SpreadsheetApp.getActiveSpreadsheet().toast(`Categories: ${categoriesPushed} | Bastions: ${bastionsPushed}`, `✅ Sync Complete [${envName}]`);
    } catch(e) {}
    
  } catch (error) {
    console.error(`❌ Error during sync to ${envName}: ${error.message}`);
    console.error(error);
    
    // Non-blocking UI Toast for errors
    try {
       SpreadsheetApp.getActiveSpreadsheet().toast(`${error.message}`, `❌ Sync Error [${envName}]`, 10);
    } catch(e) {}
  }
}

// ==============================================================================
// 1. Sync Categories
// ==============================================================================
function syncCategories(apiUrl, apiKey) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(BASTION_CATS_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${BASTION_CATS_SHEET_NAME}" not found.`);
  
  const data = sheet.getDataRange().getDisplayValues();
  const payload = [];

  // Start at i=1 to skip headers
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue; 
    
    payload.push({
      name: row[0],
      notes: row[1] || null,
      display_order: parseInt(row[2]) || i // Captures the new Display Order column!
    });
  }

  if (payload.length === 0) return 0;
  supabaseUpsert(apiUrl, apiKey, "ac_bastion_categories", payload);
  return payload.length;
}

// ==============================================================================
// 2. Fetch Category Map (Name -> UUID)
// ==============================================================================
function fetchCategoryMap(apiUrl, apiKey) {
  const endpoint = `${apiUrl}/rest/v1/ac_bastion_categories?select=id,name`;
  
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
    throw new Error(`Failed to fetch categories mapping: ${response.getContentText()}`);
  }

  const json = JSON.parse(response.getContentText());
  const map = {};
  
  json.forEach(cat => {
    map[cat.name] = cat.id;
  });
  
  return map;
}

// ==============================================================================
// 3. Sync Bastion Items
// ==============================================================================
function syncBastionItems(apiUrl, apiKey, categoryMap) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(BASTION_ITEMS_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${BASTION_ITEMS_SHEET_NAME}" not found.`);
  
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
      size: row[3] || null,
      building_prerequisite: row[4] || null,
      cost_gp: row[5] || null,
      cost_dtp: row[6] || null,
      order: row[7] || null,
      description: row[8] || null,
      notes_advice: row[9] || null
    });
  }

  if (payload.length === 0) return 0;
  supabaseUpsert(apiUrl, apiKey, "ac_bastions", payload);
  return payload.length;
}

// ==============================================================================
// Helper: Supabase Upsert Request
// ==============================================================================
// We added `conflictCol = "name"` so PostgREST knows exactly how to check for duplicates
function supabaseUpsert(apiUrl, apiKey, tableName, payloadArray, conflictCol = "name") {
  // Append ?on_conflict=name to the URL
  const endpoint = `${apiUrl}/rest/v1/${tableName}?on_conflict=${conflictCol}`;
  
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