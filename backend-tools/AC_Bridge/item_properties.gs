// ==============================================================================
// Configuration
// ==============================================================================
const IP_SOURCE_SHEET_ID   = "1fBEv1yDNTD-vwUyK6pK_oiXg2K7OiltW35iFCqxyMTY";  
const IP_SOURCE_SHEET_NAME = "Item Properties";               
const IP_CATS_SHEET_NAME   = "Item Properties Categories";    
const IP_ITEMS_SHEET_NAME  = "Item Properties";    

// Defining the primary "Top Level" categories found in the document
const ITEMPROP_MAIN_CATEGORIES = [
  "Magic Item Special Features",
  "Sentient Magic Items",
  "Other"
];

const ITEMPROP_SUB_CATEGORIES = [
  "Creator",
  "History",
  "Minor Property",
  "Quirk"
];

const ipScriptProps = PropertiesService.getScriptProperties();
const IP_ENV = {
  DEV: {
    URL: ipScriptProps.getProperty("SUPABASE_DEV_URL"),
    KEY: ipScriptProps.getProperty("SUPABASE_DEV_KEY")
  },
  PROD: {
    URL: ipScriptProps.getProperty("SUPABASE_PROD_URL"),
    KEY: ipScriptProps.getProperty("SUPABASE_PROD_KEY")
  }
};

// ==============================================================================
// Create Custom Menu Items
// ==============================================================================
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Database Sync')
    .addItem('🚀 Sync Item Props to DEV', 'syncItemPropertiesToDev')
    .addItem('🚨 Sync Item Props to PROD', 'syncItemPropertiesToProd')
    .addToUi();
}

// ==============================================================================
// 1. Normalizer (NO INHERITANCE + MARKDOWN FIXES + ORPHAN FIX)
// ==============================================================================
function normalizeItemProperties() {
  const sourceSS = SpreadsheetApp.openById(IP_SOURCE_SHEET_ID);
  const source   = sourceSS.getSheetByName(IP_SOURCE_SHEET_NAME);

  if (!source) {
    SpreadsheetApp.getUi().alert(`Tab "${IP_SOURCE_SHEET_NAME}" not found in source sheet.`);
    return;
  }

  const range = source.getDataRange();
  const data = range.getDisplayValues();
  const richData = range.getRichTextValues();

  const categoriesData = [["Category", "Notes"]];
  const itemsData = [
    ["Category", "Name", "Source", "Type", "Category (Sub)", "Description", "Notes / Rage Advice"]
  ];

  let state = "SEARCHING_CATEGORY";
  
  let activeLevel = 1;
  let l1Name = "", l1Notes = "";
  let l2Name = "", l2Notes = "";
  
  let currentCategory = "";
  let currentNotes = "";

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const richRow = richData[i];
    
    const c0 = String(row[0] || "").trim(); 
    const c2 = String(row[2] || "").trim(); 

    // 1. Skip Link Navigation rows
    if (c0.startsWith("Jump to") || c0.startsWith("Any Item Properties listed as")) continue;

    // 2. A fully blank row triggers a reset to find the next category
    if (c0 === "" && c2 === "") {
      state = "SEARCHING_CATEGORY";
      continue;
    }

    // 3. Subcategory detection
    if (state === "DATA" && c0 !== "" && c2 === "") {
      state = "SEARCHING_CATEGORY";
    }

    // 4. STATE: Finding Categories or Reading Notes
    if (state === "SEARCHING_CATEGORY" || state === "CATEGORY_NOTES") {
      
      if (c0 === "Name" && c2 === "Source") {
        state = "DATA";
        continue;
      }
      
      if (c0 !== "" && c2 === "") {
        let fullText = richTextToMarkdown(richRow[0]).trim();
        fullText = fullText.replace(/\s*\([Gg]o to.*?\)/g, "").trim();
        
        let parts = fullText.split(/\r?\n/);
        let rawTextName = parts[0].trim();
        let cleanName = rawTextName.replace(/\[(.*?)\]\(.*?\)/g, "$1").trim(); // Strip markdown for checking
        let inlineNote = parts.slice(1).join("\n\n").trim(); 

        const lowerName = cleanName.toLowerCase();
        const isCat = ITEMPROP_MAIN_CATEGORIES.map(c => c.toLowerCase()).includes(lowerName) || 
                      ITEMPROP_SUB_CATEGORIES.map(c => c.toLowerCase()).includes(lowerName);

        if (isCat) {
          if (ITEMPROP_MAIN_CATEGORIES.map(c => c.toLowerCase()).includes(lowerName)) {
            activeLevel = 1;
            l1Name = cleanName; l1Notes = inlineNote;
            l2Name = ""; l2Notes = "";
          } else {
            activeLevel = 2;
            l2Name = cleanName; l2Notes = inlineNote;
          }
          
          let catParts = [];
          if (l1Name) catParts.push(l1Name);
          if (l2Name) catParts.push(l2Name);
          currentCategory = catParts.join(" - ");

          // NO INHERITANCE
          currentNotes = activeLevel === 1 ? l1Notes : l2Notes;
          
          categoriesData.push([currentCategory, currentNotes]);
          state = "CATEGORY_NOTES";
        } 
        else {
          // IT IS JUST A NOTE
          const noteText = richTextToMarkdown(richRow[0]).trim();
          if (activeLevel === 1) {
            l1Notes = l1Notes ? l1Notes + "\n\n" + noteText : noteText;
            currentNotes = l1Notes;
          } else {
            l2Notes = l2Notes ? l2Notes + "\n\n" + noteText : noteText;
            currentNotes = l2Notes;
          }

          if (categoriesData.length > 1) {
            categoriesData[categoriesData.length - 1][1] = currentNotes;
          }
        }
        continue;
      }
      
      // Fallthrough for orphans
      if (c0 !== "" && c2 !== "") {
        state = "DATA";
      }
    } 
    
    // 5. STATE: Extracting standard rows
    if (state === "DATA") {
      if (c0 === "Name" && c2 === "Source") continue;
      
      if (c0 !== "" && c0 !== "nan") {
        itemsData.push([
          currentCategory, 
          c0, 
          c2, 
          String(row[3] || "").trim(), // Type
          String(row[4] || "").trim(), // Category (Sub)
          richTextToMarkdown(richRow[5]).trim(), // Description
          richTextToMarkdown(richRow[10]).trim() // Notes / Rage Advice (Column K -> index 10)
        ]);
      }
    }
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  function insertData(sheetName, dataArray) {
    if (dataArray.length === 0) return;
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) sheet = ss.insertSheet(sheetName);
    else sheet.clearContents();
    sheet.getRange(1, 1, dataArray.length, dataArray[0].length).setValues(dataArray);
  }

  insertData(IP_CATS_SHEET_NAME, categoriesData);
  insertData(IP_ITEMS_SHEET_NAME, itemsData);

  SpreadsheetApp.getUi().alert(
    `Done! Exported ${categoriesData.length - 1} Categories and ${itemsData.length - 1} Item Properties.`
  );
}

// ==============================================================================
// 2. Entry Points for Sync
// ==============================================================================
function syncItemPropertiesToDev() {
  if (!IP_ENV.DEV.URL || !IP_ENV.DEV.KEY) throw new Error("Missing Dev Script Properties.");
  console.log("Starting Item Properties sync to DEVELOPMENT...");
  runItemPropertiesSync(IP_ENV.DEV.URL, IP_ENV.DEV.KEY, "DEVELOPMENT");
}

function syncItemPropertiesToProd() {
  if (!IP_ENV.PROD.URL || !IP_ENV.PROD.KEY) throw new Error("Missing Prod Script Properties.");
  console.log("Starting Item Properties sync to PRODUCTION...");
  runItemPropertiesSync(IP_ENV.PROD.URL, IP_ENV.PROD.KEY, "PRODUCTION");
}

// ==============================================================================
// 3. Main Sync Orchestrator
// ==============================================================================
function runItemPropertiesSync(apiUrl, apiKey, envName) {
  try {
    const catsPushed = syncItemPropertiesCategories(apiUrl, apiKey);
    console.log(`Item Properties Categories Upserted: ${catsPushed}`);
    
    const categoryMap = fetchItemPropertiesCategoryMap(apiUrl, apiKey);
    
    const itemsPushed = syncItemPropertiesData(apiUrl, apiKey, categoryMap);
    console.log(`Item Properties Items Upserted: ${itemsPushed}`);
    
    console.log(`✅ Sync Complete [${envName}]!`);
    
    try {
      SpreadsheetApp.getActiveSpreadsheet().toast(`Categories: ${catsPushed} | Items: ${itemsPushed}`, `✅ Sync Complete [${envName}]`);
    } catch(e) {}
    
  } catch (error) {
    console.error(`❌ Error during sync to ${envName}: ${error.message}`);
    try {
       SpreadsheetApp.getActiveSpreadsheet().toast(`${error.message}`, `❌ Sync Error [${envName}]`, 10);
    } catch(e) {}
  }
}

// ==============================================================================
// 4. Sync Item Properties Categories (WITH DE-DUPLICATOR)
// ==============================================================================
function syncItemPropertiesCategories(apiUrl, apiKey) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(IP_CATS_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${IP_CATS_SHEET_NAME}" not found.`);
  
  const data = sheet.getDataRange().getDisplayValues();
  
  // 🚨 NEW: Use a Map to automatically filter out duplicate Category Names
  const payloadMap = new Map();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const catName = row[0];
    if (!catName) continue; 
    
    // The Map uses the name as a Key. If it sees a duplicate, it safely overwrites it.
    payloadMap.set(catName, {
      name: catName,
      notes: row[1] || null,
      display_order: i 
    });
  }

  // Convert the cleaned Map back into an array for Supabase
  const payload = Array.from(payloadMap.values());
  
  if (payload.length === 0) return 0;
  supabaseUpsertItemProperties(apiUrl, apiKey, "ac_item_properties_categories", payload, "name");
  return payload.length;
}

// ==============================================================================
// 6. Sync Item Properties Data (WITH DE-DUPLICATOR)
// ==============================================================================
function syncItemPropertiesData(apiUrl, apiKey, categoryMap) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(IP_ITEMS_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${IP_ITEMS_SHEET_NAME}" not found.`);
  
  const data = sheet.getDataRange().getDisplayValues();
  
  // 🚨 NEW: Use a Map to automatically filter out duplicate Items
  const payloadMap = new Map();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[1]) continue; 
    
    const categoryName = row[0];
    const categoryId = categoryMap[categoryName] || null;

    if (!categoryId) {
      console.warn(`Warning: Could not find UUID for category "${categoryName}" for item "${row[1]}"`);
    }

    const itemName = row[1];
    const itemSource = row[2] || null;
    
    // Create a unique key matching the SQL constraint (Category + Name + Source)
    const uniqueKey = `${categoryId}_${itemName}_${itemSource}`;

    payloadMap.set(uniqueKey, {
      category_id: categoryId,
      name: itemName,
      source: itemSource,
      type: row[3] || null,
      category_sub: row[4] || null,
      description: row[5] || null,
      notes_advice: row[6] || null,
      display_order: i
    });
  }

  // Convert the cleaned Map back into an array for Supabase
  const payload = Array.from(payloadMap.values());
  
  if (payload.length === 0) return 0;
  supabaseUpsertItemProperties(apiUrl, apiKey, "ac_item_properties", payload, "category_id,name,source");
  return payload.length;
}

// ==============================================================================
// 5. Fetch Category UUID Mapping
// ==============================================================================
function fetchItemPropertiesCategoryMap(apiUrl, apiKey) {
  const endpoint = `${apiUrl}/rest/v1/ac_item_properties_categories?select=id,name`;
  
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
// 6. Sync Item Properties Data
// ==============================================================================
function syncItemPropertiesData(apiUrl, apiKey, categoryMap) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(IP_ITEMS_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${IP_ITEMS_SHEET_NAME}" not found.`);
  
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
      type: row[3] || null,
      category_sub: row[4] || null,
      description: row[5] || null,
      notes_advice: row[6] || null,
      display_order: i
    });
  }

  if (payload.length === 0) return 0;
  
  // 🚨 CRITICAL FIX: Upserts safely using the new 3-part constraint
  supabaseUpsertItemProperties(apiUrl, apiKey, "ac_item_properties", payload, "category_id,name,source");
  return payload.length;
}

// ==============================================================================
// 7. Helper: Supabase Upsert
// ==============================================================================
function supabaseUpsertItemProperties(apiUrl, apiKey, tableName, payloadArray, conflictCols) {
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

// ==============================================================================
// 8. Helper: Convert Google Sheet Rich Text to Markdown Links (External Only)
// ==============================================================================
function richTextToMarkdown(richTextValue) {
  if (!richTextValue) return "";
  const text = richTextValue.getText();
  if (!text) return "";

  const runs = richTextValue.getRuns();
  let markdown = "";

  for (let i = 0; i < runs.length; i++) {
    const runText = runs[i].getText();
    const runUrl = runs[i].getLinkUrl();

    if (runUrl) {
      // Blanket check: anything starting with "#" is an internal document anchor
      const isInternalLink = runUrl.startsWith("#") || runUrl.includes("docs.google.com/spreadsheets");
      
      if (isInternalLink) {
        markdown += runText; 
      } else {
        markdown += `[${runText}](${runUrl})`; 
      }
    } else {
      markdown += runText;
    }
  }
  
  return markdown;
}