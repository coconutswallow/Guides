// ==============================================================================
// Configuration
// ==============================================================================
const SOURCES_SOURCE_SHEET_ID   = "1fBEv1yDNTD-vwUyK6pK_oiXg2K7OiltW35iFCqxyMTY";  
const SOURCES_SOURCE_SHEET_NAME = "Sources";               
const SOURCES_CATS_SHEET_NAME   = "Sources Categories";    
const SOURCES_ITEMS_SHEET_NAME  = "Sources";    

// Declare the primary categories to allow the script to route properly
const SOURCES_CATEGORIES = [
  "Core",
  "Supplemental",
  "Settings",
  "Extras",
  "Adventures",
  "Third Party Content",
  "Unearthed Arcana",
  "Hawthorne Homebrew"
];

const sourcesScriptProps = PropertiesService.getScriptProperties();
const SOURCES_ENV = {
  DEV: {
    URL: sourcesScriptProps.getProperty("SUPABASE_DEV_URL"),
    KEY: sourcesScriptProps.getProperty("SUPABASE_DEV_KEY")
  },
  PROD: {
    URL: sourcesScriptProps.getProperty("SUPABASE_PROD_URL"),
    KEY: sourcesScriptProps.getProperty("SUPABASE_PROD_KEY")
  }
};

// ==============================================================================
// Create Custom Menu Items
// ==============================================================================
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Database Sync')
    .addItem('🚀 Sync Sources to DEV', 'syncSourcesToDev')
    .addItem('🚨 Sync Sources to PROD', 'syncSourcesToProd')
    .addToUi();
}

// ==============================================================================
// 1. Normalizer (WITH LINK EXTRACTION)
// ==============================================================================
function normalizeSources() {
  const sourceSS = SpreadsheetApp.openById(SOURCES_SOURCE_SHEET_ID);
  const source   = sourceSS.getSheetByName(SOURCES_SOURCE_SHEET_NAME);

  if (!source) {
    SpreadsheetApp.getUi().alert(`Tab "${SOURCES_SOURCE_SHEET_NAME}" not found in source sheet.`);
    return;
  }

  const range = source.getDataRange();
  const data = range.getDisplayValues();
  const richData = range.getRichTextValues();

  const categoriesData = [["Category", "Notes"]];
  const itemsData = [
    ["Category", "Name", "Abbreviation", "Type", "Ruleset", "Allowed Content", "Notes / Rage Advice", "Link"]
  ];

  let state = "SEARCHING_CATEGORY";
  
  let currentCategory = "";
  let currentNotes = "";

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const richRow = richData[i];
    
    // In Sources, Column A is the Source Name/Category, Column D is Abbreviation
    const c0 = String(row[0] || "").trim(); 
    const c3 = String(row[3] || "").trim(); 

    // 1. Skip Link Navigation rows
    if (c0.startsWith("Jump to") || (c0 === "Core" && c3 === "Extras")) continue;

    // 2. A fully blank row triggers a reset to find the next category
    if (c0 === "" && c3 === "") {
      state = "SEARCHING_CATEGORY";
      continue;
    }

    // 3. Subcategory detection
    if (state === "DATA" && c0 !== "" && c3 === "") {
      state = "SEARCHING_CATEGORY";
    }

    // 4. STATE: Finding Categories or Reading Notes
    if (state === "SEARCHING_CATEGORY" || state === "CATEGORY_NOTES") {
      
      if (c0 === "Source" && c3 === "Abbreviation") {
        state = "DATA";
        continue;
      }
      
      if (c0 !== "" && c3 === "") {
        let fullText = richTextToMarkdown(richRow[0]).trim();
        fullText = fullText.replace(/\s*\([Gg]o to.*?\)/g, "").trim();
        
        let parts = fullText.split(/\r?\n/);
        let rawTextName = parts[0].trim();
        let cleanName = rawTextName.replace(/\[(.*?)\]\(.*?\)/g, "$1").trim(); // Strip markdown links for checking
        let inlineNote = parts.slice(1).join("\n\n").trim(); 

        const lowerName = cleanName.toLowerCase();
        const isCat = SOURCES_CATEGORIES.map(c => c.toLowerCase()).includes(lowerName);

        if (isCat) {
          currentCategory = cleanName;
          currentNotes = inlineNote;
          categoriesData.push([currentCategory, currentNotes]);
          state = "CATEGORY_NOTES";
        } 
        else {
          // IT IS JUST A NOTE
          const noteText = richTextToMarkdown(richRow[0]).trim();
          currentNotes = currentNotes ? currentNotes + "\n\n" + noteText : noteText;

          if (categoriesData.length > 1) {
            categoriesData[categoriesData.length - 1][1] = currentNotes;
          }
        }
        continue;
      }
      
      // Fallthrough for orphans (if headers vanish)
      if (c0 !== "" && c3 !== "") {
        state = "DATA";
      }
    } 
    
    // 5. STATE: Extracting standard rows
    if (state === "DATA") {
      if (c0 === "Source" && c3 === "Abbreviation") continue;
      
      if (c0 !== "" && c0 !== "nan") {
        
        // 🚨 NEW: Extract the raw URL from the Source Name cell
        const sourceLink = extractLink(richRow[0]);

        itemsData.push([
          currentCategory, 
          c0, // Source Name
          c3, // Abbreviation
          String(row[4] || "").trim(), // Type
          String(row[5] || "").trim(), // Ruleset
          richTextToMarkdown(richRow[6]).trim(), // Allowed Content
          richTextToMarkdown(richRow[11]).trim(), // Notes (Column L)
          sourceLink // Link
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

  insertData(SOURCES_CATS_SHEET_NAME, categoriesData);
  insertData(SOURCES_ITEMS_SHEET_NAME, itemsData);

  SpreadsheetApp.getUi().alert(
    `Done! Exported ${categoriesData.length - 1} Categories and ${itemsData.length - 1} Sources.`
  );
}

// ==============================================================================
// 2. Entry Points for Sync
// ==============================================================================
function syncSourcesToDev() {
  if (!SOURCES_ENV.DEV.URL || !SOURCES_ENV.DEV.KEY) throw new Error("Missing Dev Script Properties.");
  console.log("Starting Sources sync to DEVELOPMENT...");
  runSourcesSync(SOURCES_ENV.DEV.URL, SOURCES_ENV.DEV.KEY, "DEVELOPMENT");
}

function syncSourcesToProd() {
  if (!SOURCES_ENV.PROD.URL || !SOURCES_ENV.PROD.KEY) throw new Error("Missing Prod Script Properties.");
  console.log("Starting Sources sync to PRODUCTION...");
  runSourcesSync(SOURCES_ENV.PROD.URL, SOURCES_ENV.PROD.KEY, "PRODUCTION");
}

// ==============================================================================
// 3. Main Sync Orchestrator
// ==============================================================================
function runSourcesSync(apiUrl, apiKey, envName) {
  try {
    const catsPushed = syncSourcesCategories(apiUrl, apiKey);
    console.log(`Sources Categories Upserted: ${catsPushed}`);
    
    const categoryMap = fetchSourcesCategoryMap(apiUrl, apiKey);
    
    const itemsPushed = syncSourcesData(apiUrl, apiKey, categoryMap);
    console.log(`Sources Items Upserted: ${itemsPushed}`);
    
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
// 4. Sync Sources Categories (WITH DE-DUPLICATOR)
// ==============================================================================
function syncSourcesCategories(apiUrl, apiKey) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SOURCES_CATS_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${SOURCES_CATS_SHEET_NAME}" not found.`);
  
  const data = sheet.getDataRange().getDisplayValues();
  const payloadMap = new Map();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const catName = row[0];
    if (!catName) continue; 
    
    payloadMap.set(catName, {
      name: catName,
      notes: row[1] || null,
      display_order: i 
    });
  }

  const payload = Array.from(payloadMap.values());
  if (payload.length === 0) return 0;
  
  supabaseUpsertSources(apiUrl, apiKey, "ac_sources_categories", payload, "name");
  return payload.length;
}

// ==============================================================================
// 5. Fetch Category UUID Mapping
// ==============================================================================
function fetchSourcesCategoryMap(apiUrl, apiKey) {
  const endpoint = `${apiUrl}/rest/v1/ac_sources_categories?select=id,name`;
  
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
// 6. Sync Sources Data (WITH DE-DUPLICATOR)
// ==============================================================================
function syncSourcesData(apiUrl, apiKey, categoryMap) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SOURCES_ITEMS_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${SOURCES_ITEMS_SHEET_NAME}" not found.`);
  
  const data = sheet.getDataRange().getDisplayValues();
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
    
    // We unique it by category_id and name
    const uniqueKey = `${categoryId}_${itemName}`;

    payloadMap.set(uniqueKey, {
      category_id: categoryId,
      name: itemName,
      abbreviation: row[2] || null,
      type: row[3] || null,
      ruleset: row[4] || null,
      allowed_content: row[5] || null,
      notes_advice: row[6] || null,
      link: row[7] || null, // 🚨 NEW: Maps column 7 to the database link field
      display_order: i
    });
  }

  const payload = Array.from(payloadMap.values());
  if (payload.length === 0) return 0;
  
  supabaseUpsertSources(apiUrl, apiKey, "ac_sources", payload, "category_id,name");
  return payload.length;
}

// ==============================================================================
// 7. Helper: Supabase Upsert
// ==============================================================================
function supabaseUpsertSources(apiUrl, apiKey, tableName, payloadArray, conflictCols) {
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
// 8. Helpers: Markdown & Link Extraction
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

function extractLink(richTextValue) {
  if (!richTextValue) return "";
  
  // First check if the entire cell has one unified link
  const cellUrl = richTextValue.getLinkUrl();
  if (cellUrl) return cellUrl;

  // Otherwise, scan the text runs to find the first embedded link
  const runs = richTextValue.getRuns();
  for (let i = 0; i < runs.length; i++) {
    const runUrl = runs[i].getLinkUrl();
    if (runUrl) return runUrl;
  }
  
  return "";
}