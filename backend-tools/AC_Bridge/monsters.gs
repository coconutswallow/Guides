// ==============================================================================
// Configuration
// ==============================================================================
const MONSTERS_SOURCE_SHEET_ID   = "1fBEv1yDNTD-vwUyK6pK_oiXg2K7OiltW35iFCqxyMTY";  
const MONSTERS_SOURCE_SHEET_NAME = "Monsters";               
const MONSTERS_CATS_SHEET_NAME   = "Monsters Categories";    
const MONSTERS_ITEMS_SHEET_NAME  = "Monsters";    

// Declare the primary levels to allow 3-tier deep sub-categorization
const LEVEL1 = ["Fair Game", "Full DM Only"];
const LEVEL2 = ["Core", "Supplemental", "Adventures", "Non-FR"];

const monstersScriptProps = PropertiesService.getScriptProperties();
const MONSTERS_ENV = {
  DEV: {
    URL: monstersScriptProps.getProperty("SUPABASE_DEV_URL"),
    KEY: monstersScriptProps.getProperty("SUPABASE_DEV_KEY")
  },
  PROD: {
    URL: monstersScriptProps.getProperty("SUPABASE_PROD_URL"),
    KEY: monstersScriptProps.getProperty("SUPABASE_PROD_KEY")
  }
};

// ==============================================================================
// Create Custom Menu Items
// ==============================================================================
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Database Sync')
    .addItem('🚀 Sync Monsters to DEV', 'syncMonstersToDev')
    .addItem('🚨 Sync Monsters to PROD', 'syncMonstersToProd')
    .addToUi();
}

// ==============================================================================
// 1. Normalizer (3-TIER, NO INHERITANCE, DE-DUPLICATED)
// ==============================================================================
function normalizeMonsters() {
  const sourceSS = SpreadsheetApp.openById(MONSTERS_SOURCE_SHEET_ID);
  const source   = sourceSS.getSheetByName(MONSTERS_SOURCE_SHEET_NAME);

  if (!source) {
    SpreadsheetApp.getUi().alert(`Tab "${MONSTERS_SOURCE_SHEET_NAME}" not found in source sheet.`);
    return;
  }

  // getDisplayValues() preserves "1/4" CRs instead of parsing them as dates!
  const range = source.getDataRange();
  const data = range.getDisplayValues();
  const richData = range.getRichTextValues();

  const categoriesData = [["Category", "Notes"]];
  const itemsData = [
    ["Category", "Name", "Source", "Classification", "CR", "Creature Type", "Notes / Rage Advice"]
  ];

  let state = "SEARCHING_CATEGORY";
  
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

    // 1. Skip Link Navigation rows and intros
    if (c0.startsWith("Jump to") || c0.startsWith("Core,Supplemental")) continue;

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
        let cleanName = rawTextName.replace(/\[(.*?)\]\(.*?\)/g, "$1").trim(); // Strip markdown
        let inlineNote = parts.slice(1).join("\n\n").trim(); 

        // Heuristic: If it's a long sentence or ends in a period, it's a note. Otherwise, category.
        let isCat = true;
        if (cleanName.length > 60 || cleanName.endsWith(".")) isCat = false;
        if (cleanName.toLowerCase().includes("except with a dm's permission")) isCat = false;
        if (cleanName.toLowerCase().includes("dms should take care to review")) isCat = false;

        if (isCat) {
          const lowerName = cleanName.toLowerCase();
          
          if (LEVEL1.map(c => c.toLowerCase()).includes(lowerName)) {
            activeLevel = 1; l1Name = cleanName; l1Notes = inlineNote;
            l2Name = ""; l2Notes = ""; l3Name = ""; l3Notes = "";
          } 
          else if (LEVEL2.map(c => c.toLowerCase()).includes(lowerName)) {
            activeLevel = 2; l2Name = cleanName; l2Notes = inlineNote;
            l3Name = ""; l3Notes = "";
          } 
          else {
            activeLevel = 3; l3Name = cleanName; l3Notes = inlineNote;
          }
          
          let catParts = [];
          if (l1Name) catParts.push(l1Name);
          if (l2Name) catParts.push(l2Name);
          if (l3Name) catParts.push(l3Name);
          currentCategory = catParts.join(" - ");

          // NO INHERITANCE
          if (activeLevel === 1) currentNotes = l1Notes;
          else if (activeLevel === 2) currentNotes = l2Notes;
          else if (activeLevel === 3) currentNotes = l3Notes;
          
          categoriesData.push([currentCategory, currentNotes]);
          state = "CATEGORY_NOTES";
        } 
        else {
          // IT IS JUST A NOTE
          const noteText = richTextToMarkdown(richRow[0]).trim();
          
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
          String(row[4] || "").trim(), // Classification (Col E)
          String(row[5] || "").trim(), // CR (Col F)
          String(row[6] || "").trim(), // Creature Type (Col G)
          richTextToMarkdown(richRow[8]).trim() // Notes / Rage Advice (Col I)
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

  insertData(MONSTERS_CATS_SHEET_NAME, categoriesData);
  insertData(MONSTERS_ITEMS_SHEET_NAME, itemsData);

  SpreadsheetApp.getUi().alert(
    `Done! Exported ${categoriesData.length - 1} Categories and ${itemsData.length - 1} Monsters.`
  );
}

// ==============================================================================
// 2. Entry Points for Sync
// ==============================================================================
function syncMonstersToDev() {
  if (!MONSTERS_ENV.DEV.URL || !MONSTERS_ENV.DEV.KEY) throw new Error("Missing Dev Script Properties.");
  console.log("Starting Monsters sync to DEVELOPMENT...");
  runMonstersSync(MONSTERS_ENV.DEV.URL, MONSTERS_ENV.DEV.KEY, "DEVELOPMENT");
}

function syncMonstersToProd() {
  if (!MONSTERS_ENV.PROD.URL || !MONSTERS_ENV.PROD.KEY) throw new Error("Missing Prod Script Properties.");
  console.log("Starting Monsters sync to PRODUCTION...");
  runMonstersSync(MONSTERS_ENV.PROD.URL, MONSTERS_ENV.PROD.KEY, "PRODUCTION");
}

// ==============================================================================
// 3. Main Sync Orchestrator
// ==============================================================================
function runMonstersSync(apiUrl, apiKey, envName) {
  try {
    const catsPushed = syncMonstersCategories(apiUrl, apiKey);
    console.log(`Monsters Categories Upserted: ${catsPushed}`);
    
    const categoryMap = fetchMonstersCategoryMap(apiUrl, apiKey);
    
    const itemsPushed = syncMonstersData(apiUrl, apiKey, categoryMap);
    console.log(`Monsters Items Upserted: ${itemsPushed}`);
    
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
// 4. Sync Monsters Categories (WITH DE-DUPLICATOR)
// ==============================================================================
function syncMonstersCategories(apiUrl, apiKey) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MONSTERS_CATS_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${MONSTERS_CATS_SHEET_NAME}" not found.`);
  
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
  
  supabaseUpsertMonsters(apiUrl, apiKey, "ac_monsters_categories", payload, "name");
  return payload.length;
}

// ==============================================================================
// 5. Fetch Category UUID Mapping
// ==============================================================================
function fetchMonstersCategoryMap(apiUrl, apiKey) {
  const endpoint = `${apiUrl}/rest/v1/ac_monsters_categories?select=id,name`;
  
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
// 6. Sync Monsters Data (WITH DE-DUPLICATOR)
// ==============================================================================
function syncMonstersData(apiUrl, apiKey, categoryMap) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MONSTERS_ITEMS_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${MONSTERS_ITEMS_SHEET_NAME}" not found.`);
  
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
    const itemSource = row[2] || null;
    
    const uniqueKey = `${categoryId}_${itemName}_${itemSource}`;

    payloadMap.set(uniqueKey, {
      category_id: categoryId,
      name: itemName,
      source: itemSource,
      classification: row[3] || null,
      cr: row[4] || null,
      creature_type: row[5] || null,
      notes_advice: row[6] || null,
      display_order: i
    });
  }

  const payload = Array.from(payloadMap.values());
  if (payload.length === 0) return 0;
  
  supabaseUpsertMonsters(apiUrl, apiKey, "ac_monsters", payload, "category_id,name,source");
  return payload.length;
}

// ==============================================================================
// 7. Helper: Supabase Upsert
// ==============================================================================
function supabaseUpsertMonsters(apiUrl, apiKey, tableName, payloadArray, conflictCols) {
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