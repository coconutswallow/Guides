// ==============================================================================
// Configuration
// ==============================================================================
const LOOT_SOURCE_SHEET_ID   = "1fBEv1yDNTD-vwUyK6pK_oiXg2K7OiltW35iFCqxyMTY";  
const LOOT_SOURCE_SHEET_NAME = "Loot";               
const LOOT_CATS_SHEET_NAME   = "Loot Categories";    
const LOOT_ITEMS_SHEET_NAME  = "Loot";    

// Defining the primary "Top Level" categories found in the document
const MAIN_CATEGORIES = [
  "Rolled Loot", "Select Loot", "Multisession Loot", "Tier S Items (APL 20)",
  "Relics of Emergence", "Other Loot", "Deck of Many Things", "Hoard Magic Items",
  "Superior Ship Upgrades", "Infernal War Machine Upgrades", "Event Items",
  "Exclusive Event Items", "Miscellaneous Event Items", "Seasonal Event Items",
  "Unlisted Official Items", "Homebrew Items", "Legacy Loot"
];

const lootScriptProps = PropertiesService.getScriptProperties();
const LOOT_ENV = {
  DEV: {
    URL: lootScriptProps.getProperty("SUPABASE_DEV_URL"),
    KEY: lootScriptProps.getProperty("SUPABASE_DEV_KEY")
  },
  PROD: {
    URL: lootScriptProps.getProperty("SUPABASE_PROD_URL"),
    KEY: lootScriptProps.getProperty("SUPABASE_PROD_KEY")
  }
};

// ==============================================================================
// Create Custom Menu Items
// ==============================================================================
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Database Sync')
    .addItem('🚀 Sync Loot to DEV', 'syncLootToDev')
    .addItem('🚨 Sync Loot to PROD', 'syncLootToProd')
    .addToUi();
}

// ==============================================================================
// 1. Normalizer (NO NOTE INHERITANCE)
// ==============================================================================
// Helper: Does this text match a Category Header pattern?
function isCategory(text) {
  const t = text.toLowerCase();
  if (MAIN_CATEGORIES.map(c => c.toLowerCase()).includes(t)) return true;
  // Matches "t0 items (apl 3+)", "t1 select consumables", "t3 select cards", etc.
  if (/^t\d\+?\s*(select)?\s*(items|consumables|permanents|cards|select)?\s*(\(apl \d+\+?(,\s*full dm only)?\))?$/.test(t)) return true;
  // Matches "tier s consumables"
  if (/^tier s\s*(items|consumables|permanents)?\s*(\(apl \d+\))?$/.test(t)) return true;
  // Matches "2025 wilds district event items"
  if (/^\d{4}.*event items$/.test(t)) return true;
  // Matches explicit seasonal events
  if (["feast of the moon event items", "greengrass", "midwinter event items"].includes(t)) return true;
  return false;
}

function normalizeLoot() {
  const sourceSS = SpreadsheetApp.openById(LOOT_SOURCE_SHEET_ID);
  const source   = sourceSS.getSheetByName(LOOT_SOURCE_SHEET_NAME);

  if (!source) {
    SpreadsheetApp.getUi().alert(`Tab "${LOOT_SOURCE_SHEET_NAME}" not found in source sheet.`);
    return;
  }

  // Grab BOTH the display text and the underlying Rich Text (metadata) for links
  const range = source.getDataRange();
  const data = range.getDisplayValues();
  const richData = range.getRichTextValues();

  // Arrays for the two normalized tables
  const categoriesData = [["Category", "Notes"]];
  const itemsData = [
    ["Category", "Name", "Source", "Type", "Tier", "Description", "Notes / Rage Advice"]
  ];

  let state = "SEARCHING_CATEGORY";
  
  // 3-Level Hierarchy Trackers
  let activeLevel = 1;
  let l1Name = "", l1Notes = "";
  let l2Name = "", l2Notes = "";
  let l3Name = "", l3Notes = "";
  
  let currentCategory = "";
  let currentNotes = "";

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const richRow = richData[i];
    
    const c0 = String(row[0] || "").trim(); 
    const c2 = String(row[2] || "").trim(); 

    // 1. Skip Link Navigation rows
    if (c0.startsWith("Jump to")) continue;

    // 2. A fully blank row triggers a reset to find the next category
    if (c0 === "" && c2 === "") {
      state = "SEARCHING_CATEGORY";
      continue;
    }

    // 3. Subcategory detection (Directly ending a table into a new category)
    if (state === "DATA" && c0 !== "" && c2 === "") {
      state = "SEARCHING_CATEGORY";
    }

    // 4. STATE: Finding Categories or Reading Notes
    if (state === "SEARCHING_CATEGORY" || state === "CATEGORY_NOTES") {
      
      // If we hit a table header, switch to DATA parsing
      if (c0 === "Name" && c2 === "Source") {
        state = "DATA";
        continue;
      }
      
      if (c0 !== "" && c2 === "") {
        let fullText = richTextToMarkdown(richRow[0]).trim();
        
        // Destroy ANY variation of "(Go to...)"
        fullText = fullText.replace(/\s*\([Gg]o to.*?\)/g, "").trim();
        
        // Split the cell by newlines for inline notes
        let parts = fullText.split(/\r?\n/);
        
        // Extract raw text for notes, and purely clean text for category detection
        let rawTextName = parts[0].trim();
        let cleanName = rawTextName.replace(/\[(.*?)\]\(.*?\)/g, "$1").trim(); // Strips markdown links!
        let inlineNote = parts.slice(1).join("\n\n").trim(); 

        if (isCategory(cleanName)) {
          // ✅ IT IS A CATEGORY HEADER
          const lowerName = cleanName.toLowerCase();
          
          if (MAIN_CATEGORIES.map(c => c.toLowerCase()).includes(lowerName)) {
            activeLevel = 1;
            l1Name = cleanName; l1Notes = inlineNote;
            l2Name = ""; l2Notes = "";
            l3Name = ""; l3Notes = "";
          } 
          else if (lowerName.includes("consumable") || lowerName.includes("permanent") || lowerName.includes("cards")) {
            activeLevel = 3;
            l3Name = cleanName; l3Notes = inlineNote;
          } 
          else {
            activeLevel = 2;
            l2Name = cleanName; l2Notes = inlineNote;
            l3Name = ""; l3Notes = ""; 
          }
          
          // Build the combined Category Path (e.g., L1 - L2 - L3)
          let catParts = [];
          if (l1Name) catParts.push(l1Name);
          if (l2Name) catParts.push(l2Name);
          if (l3Name) catParts.push(l3Name);
          currentCategory = catParts.join(" - ");

          // 🚨 FIX: Only use the notes for the CURRENT level (No Inheritance)
          if (activeLevel === 1) currentNotes = l1Notes;
          else if (activeLevel === 2) currentNotes = l2Notes;
          else if (activeLevel === 3) currentNotes = l3Notes;
          
          categoriesData.push([currentCategory, currentNotes]);
          state = "CATEGORY_NOTES";
        } 
        else {
          // ✅ IT IS JUST A NOTE
          const noteText = richTextToMarkdown(richRow[0]).trim();
          
          // Append standalone notes directly to whichever level is currently active
          // and update currentNotes to reflect ONLY that level's notes
          if (activeLevel === 1) {
            l1Notes = l1Notes ? l1Notes + "\n\n" + noteText : noteText;
            currentNotes = l1Notes;
          } else if (activeLevel === 2) {
            l2Notes = l2Notes ? l2Notes + "\n\n" + noteText : noteText;
            currentNotes = l2Notes;
          } else if (activeLevel === 3) {
            l3Notes = l3Notes ? l3Notes + "\n\n" + noteText : noteText;
            currentNotes = l3Notes;
          }

          // Update the existing category with the newly appended notes
          if (categoriesData.length > 1) {
            categoriesData[categoriesData.length - 1][1] = currentNotes;
          }
        }
        continue;
      }
    } 
    
    // 5. STATE: Extracting standard rows
    else if (state === "DATA") {
      if (c0 === "Name" && c2 === "Source") continue;
      
      if (c0 !== "" && c0 !== "nan") {
        itemsData.push([
          currentCategory, 
          c0, 
          c2, 
          String(row[3] || "").trim(), // Type
          String(row[4] || "").trim(), // Tier
          richTextToMarkdown(richRow[5]).trim(), // Description (with Links)
          richTextToMarkdown(richRow[9]).trim()  // Notes/Rage Advice (with Links)
        ]);
      }
    }
  }

  // Write to destination workbook
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  function insertData(sheetName, dataArray) {
    if (dataArray.length === 0) return;
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) sheet = ss.insertSheet(sheetName);
    else sheet.clearContents();
    sheet.getRange(1, 1, dataArray.length, dataArray[0].length).setValues(dataArray);
  }

  insertData(LOOT_CATS_SHEET_NAME, categoriesData);
  insertData(LOOT_ITEMS_SHEET_NAME, itemsData);

  SpreadsheetApp.getUi().alert(
    `Done! Exported ${categoriesData.length - 1} Categories and ${itemsData.length - 1} Loot Items.`
  );
}

// ==============================================================================
// 2. Entry Points for Sync
// ==============================================================================
function syncLootToDev() {
  if (!LOOT_ENV.DEV.URL || !LOOT_ENV.DEV.KEY) throw new Error("Missing Dev Script Properties.");
  console.log("Starting Loot sync to DEVELOPMENT...");
  runLootSync(LOOT_ENV.DEV.URL, LOOT_ENV.DEV.KEY, "DEVELOPMENT");
}

function syncLootToProd() {
  if (!LOOT_ENV.PROD.URL || !LOOT_ENV.PROD.KEY) throw new Error("Missing Prod Script Properties.");
  console.log("Starting Loot sync to PRODUCTION...");
  runLootSync(LOOT_ENV.PROD.URL, LOOT_ENV.PROD.KEY, "PRODUCTION");
}

// ==============================================================================
// 3. Main Sync Orchestrator
// ==============================================================================
function runLootSync(apiUrl, apiKey, envName) {
  try {
    const catsPushed = syncLootCategories(apiUrl, apiKey);
    console.log(`Loot Categories Upserted: ${catsPushed}`);
    
    const categoryMap = fetchLootCategoryMap(apiUrl, apiKey);
    
    const itemsPushed = syncLootData(apiUrl, apiKey, categoryMap);
    console.log(`Loot Items Upserted: ${itemsPushed}`);
    
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
// 4. Sync Loot Categories
// ==============================================================================
function syncLootCategories(apiUrl, apiKey) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(LOOT_CATS_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${LOOT_CATS_SHEET_NAME}" not found.`);
  
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
  supabaseUpsertLoot(apiUrl, apiKey, "ac_loot_categories", payload, "name");
  return payload.length;
}

// ==============================================================================
// 5. Fetch Category UUID Mapping
// ==============================================================================
function fetchLootCategoryMap(apiUrl, apiKey) {
  const endpoint = `${apiUrl}/rest/v1/ac_loot_categories?select=id,name`;
  
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
// 6. Sync Loot Data
// ==============================================================================
function syncLootData(apiUrl, apiKey, categoryMap) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(LOOT_ITEMS_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${LOOT_ITEMS_SHEET_NAME}" not found.`);
  
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
      tier: row[4] || null,
      description: row[5] || null,
      notes_advice: row[6] || null,
      display_order: i
    });
  }

  if (payload.length === 0) return 0;
  supabaseUpsertLoot(apiUrl, apiKey, "ac_loot", payload, "name,source");
  return payload.length;
}

// ==============================================================================
// 7. Helper: Supabase Upsert
// ==============================================================================
function supabaseUpsertLoot(apiUrl, apiKey, tableName, payloadArray, conflictCols) {
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
      // Check if it is an internal Google Sheets link
      const isInternalLink = runUrl.startsWith("#") || runUrl.includes("docs.google.com/spreadsheets");
      
      if (isInternalLink) {
        // Strip the link, just keep the text
        markdown += runText; 
      } else {
        // It's a safe external link, convert to Markdown
        markdown += `[${runText}](${runUrl})`; 
      }
    } else {
      // Normal unlinked text
      markdown += runText;
    }
  }
  
  return markdown;
}