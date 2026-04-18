// ==============================================================================
// Configuration
// ==============================================================================
const OR_SOURCE_SHEET_ID   = "1fBEv1yDNTD-vwUyK6pK_oiXg2K7OiltW35iFCqxyMTY";  
const OR_SOURCE_SHEET_NAME = "Other Rewards";               
const OR_CATS_SHEET_NAME   = "Other Rewards Categories";    
const OR_ITEMS_SHEET_NAME  = "Other Rewards";    

// Defining the primary "Top Level" categories found in the document
const OTHERREWARDS_CATEGORIES = [
  "Dark Gifts", 
  "Supernatural Gifts", 
  "Mythic Gifts (Tier S)", 
  "Charms", 
  "Miscellaneous", 
  "Quirks", 
  "Piety", 
  "Marks of Prestige", 
  "Mounts", 
  "Pets", 
  "Renown", 
  "Story Outcomes"
];

const orScriptProps = PropertiesService.getScriptProperties();
const OR_ENV = {
  DEV: {
    URL: orScriptProps.getProperty("SUPABASE_DEV_URL"),
    KEY: orScriptProps.getProperty("SUPABASE_DEV_KEY")
  },
  PROD: {
    URL: orScriptProps.getProperty("SUPABASE_PROD_URL"),
    KEY: orScriptProps.getProperty("SUPABASE_PROD_KEY")
  }
};

// ==============================================================================
// Create Custom Menu Items
// ==============================================================================
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Database Sync')
    .addItem('🚀 Sync Other Rewards to DEV', 'syncOtherRewardsToDev')
    .addItem('🚨 Sync Other Rewards to PROD', 'syncOtherRewardsToProd')
    .addToUi();
}

// ==============================================================================
// 1. Normalizer (NO INHERITANCE + MARKDOWN FIXES)
// ==============================================================================
function normalizeOtherRewards() {
  const sourceSS = SpreadsheetApp.openById(OR_SOURCE_SHEET_ID);
  const source   = sourceSS.getSheetByName(OR_SOURCE_SHEET_NAME);

  if (!source) {
    SpreadsheetApp.getUi().alert(`Tab "${OR_SOURCE_SHEET_NAME}" not found in source sheet.`);
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
  
  let activeLevel = 1;
  let mainCategory = "", mainNotes = "";
  let subCategory = "", subNotes = "";
  
  let currentCategory = "";
  let currentNotes = "";

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const richRow = richData[i];
    
    const c0 = String(row[0] || "").trim(); 
    const c2 = String(row[2] || "").trim(); 
    const c5 = String(row[5] || "").trim();

    // 1. Skip Link Navigation rows
    if (c0.startsWith("Jump to") || (c0 === "Quirks" && String(row[1] || "").trim() === "Piety")) continue;
    if (c0.includes("Dark Gifts") && String(row[1] || "").trim().includes("Supernatural Gifts")) continue;
    if (c0.includes("T1") && String(row[1] || "").trim().includes("T1 Select")) continue;

    // 2. A fully blank row triggers a reset to find the next category
    if (c0 === "" && c2 === "" && c5 === "") {
      state = "SEARCHING_CATEGORY";
      continue;
    }

    // 3. Subcategory detection
    if (state === "DATA" && c0 !== "" && c2 === "" && c5 === "") {
      state = "SEARCHING_CATEGORY";
    }

    // 4. STATE: Finding Categories or Reading Notes
    if (state === "SEARCHING_CATEGORY") {
      if (c0 !== "" && c2 === "" && c5 === "") {
        
        // Handle long notes that look like categories
        if (c0.length > 45 || c0.endsWith(".")) {
          const noteText = richTextToMarkdown(richRow[0]).trim();
          if (activeLevel === 1) {
            mainNotes = mainNotes ? mainNotes + "\n\n" + noteText : noteText;
            currentNotes = mainNotes;
          } else {
            subNotes = subNotes ? subNotes + "\n\n" + noteText : noteText;
            currentNotes = subNotes;
          }
          categoriesData[categoriesData.length - 1][1] = currentNotes;
          state = "CATEGORY_NOTES";
          continue;
        }

        let fullText = richTextToMarkdown(richRow[0]).trim();
        fullText = fullText.replace(/\s*\([Gg]o to.*?\)/g, "").trim();
        
        let parts = fullText.split(/\r?\n/);
        let rawTextName = parts[0].trim();
        let catName = rawTextName.replace(/\[(.*?)\]\(.*?\)/g, "$1").trim(); // Strips markdown links for checking
        let inlineNote = parts.slice(1).join("\n\n").trim(); 
        
        if (OTHERREWARDS_CATEGORIES.includes(catName)) {
          activeLevel = 1;
          mainCategory = catName;
          mainNotes = inlineNote;
          subCategory = "";
          subNotes = "";
        } else {
          activeLevel = 2;
          subCategory = catName;
          subNotes = inlineNote;
        }
        
        currentCategory = subCategory ? `${mainCategory} - ${subCategory}` : mainCategory;
        currentNotes = activeLevel === 1 ? mainNotes : subNotes; // NO INHERITANCE
        
        categoriesData.push([currentCategory, currentNotes]);
        state = "CATEGORY_NOTES";
        continue;
      }
      
      if (c0 === "Name" && c2 === "Source") {
        state = "DATA";
        continue;
      }
    } 
    
    // 5. STATE: Reading Notes beneath the Category
    else if (state === "CATEGORY_NOTES") {
      if (c0 === "Name" && c2 === "Source") {
        state = "DATA";
      } else if (c0 !== "" && c2 === "" && c5 === "") {
        const noteText = richTextToMarkdown(richRow[0]).trim();
        
        if (activeLevel === 1) {
          mainNotes = mainNotes ? mainNotes + "\n\n" + noteText : noteText;
          currentNotes = mainNotes;
        } else {
          subNotes = subNotes ? subNotes + "\n\n" + noteText : noteText;
          currentNotes = subNotes;
        }

        categoriesData[categoriesData.length - 1][1] = currentNotes;
      }
    } 
    
    // 6. STATE: Extracting standard rows
    else if (state === "DATA") {
      if (c0 === "Name" && c2 === "Source") continue;
      
      if (c0 !== "" && c0 !== "nan") {
        itemsData.push([
          currentCategory, 
          c0, 
          c2, 
          String(row[3] || "").trim(), // Type
          String(row[4] || "").trim(), // Tier
          richTextToMarkdown(richRow[5]).trim(), // Description
          richTextToMarkdown(richRow[9]).trim()  // Notes (Col J)
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

  insertData(OR_CATS_SHEET_NAME, categoriesData);
  insertData(OR_ITEMS_SHEET_NAME, itemsData);

  SpreadsheetApp.getUi().alert(
    `Done! Exported ${categoriesData.length - 1} Categories and ${itemsData.length - 1} Other Reward Items.`
  );
}

// ==============================================================================
// 2. Entry Points for Sync
// ==============================================================================
function syncOtherRewardsToDev() {
  if (!OR_ENV.DEV.URL || !OR_ENV.DEV.KEY) throw new Error("Missing Dev Script Properties.");
  console.log("Starting Other Rewards sync to DEVELOPMENT...");
  runOtherRewardsSync(OR_ENV.DEV.URL, OR_ENV.DEV.KEY, "DEVELOPMENT");
}

function syncOtherRewardsToProd() {
  if (!OR_ENV.PROD.URL || !OR_ENV.PROD.KEY) throw new Error("Missing Prod Script Properties.");
  console.log("Starting Other Rewards sync to PRODUCTION...");
  runOtherRewardsSync(OR_ENV.PROD.URL, OR_ENV.PROD.KEY, "PRODUCTION");
}

// ==============================================================================
// 3. Main Sync Orchestrator
// ==============================================================================
function runOtherRewardsSync(apiUrl, apiKey, envName) {
  try {
    const catsPushed = syncOtherRewardsCategories(apiUrl, apiKey);
    console.log(`Other Rewards Categories Upserted: ${catsPushed}`);
    
    const categoryMap = fetchOtherRewardsCategoryMap(apiUrl, apiKey);
    
    const itemsPushed = syncOtherRewardsData(apiUrl, apiKey, categoryMap);
    console.log(`Other Rewards Items Upserted: ${itemsPushed}`);
    
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
// 4. Sync Other Rewards Categories
// ==============================================================================
function syncOtherRewardsCategories(apiUrl, apiKey) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(OR_CATS_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${OR_CATS_SHEET_NAME}" not found.`);
  
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
  
  // 🚨 This one goes to ac_other_rewards_categories
  supabaseUpsertOtherRewards(apiUrl, apiKey, "ac_other_rewards_categories", payload, "name");
  return payload.length;
}

// ... (keep fetchOtherRewardsCategoryMap exactly as it is) ...

// ==============================================================================
// 6. Sync Other Rewards Data
// ==============================================================================
function syncOtherRewardsData(apiUrl, apiKey, categoryMap) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(OR_ITEMS_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${OR_ITEMS_SHEET_NAME}" not found.`);
  
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
  
  // 🚨 This one goes to ac_other_rewards and uses the 3-part duplicate check
  supabaseUpsertOtherRewards(apiUrl, apiKey, "ac_other_rewards", payload, "category_id,name,source");
  return payload.length;
}

// ==============================================================================
// 5. Fetch Category UUID Mapping
// ==============================================================================
function fetchOtherRewardsCategoryMap(apiUrl, apiKey) {
  const endpoint = `${apiUrl}/rest/v1/ac_other_rewards_categories?select=id,name`;
  
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
// 6. Sync Other Rewards Data
// ==============================================================================
function syncOtherRewardsData(apiUrl, apiKey, categoryMap) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(OR_ITEMS_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${OR_ITEMS_SHEET_NAME}" not found.`);
  
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
  
  // 🚨 CRITICAL: Make sure the end of this string is exactly "category_id,name,source"
  supabaseUpsertOtherRewards(apiUrl, apiKey, "ac_other_rewards", payload, "category_id,name,source");
  
  return payload.length;
}

// ==============================================================================
// 7. Helper: Supabase Upsert
// ==============================================================================
function supabaseUpsertOtherRewards(apiUrl, apiKey, tableName, payloadArray, conflictCols) {
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