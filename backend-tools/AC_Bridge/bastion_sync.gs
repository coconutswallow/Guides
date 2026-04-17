// ==============================================================================
// Configuration
// ==============================================================================
const CATS_SHEET_NAME  = "Bastions Categories";    
const ITEMS_SHEET_NAME = "Normalized Bastions"; 

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
// Entry Points (Run these from the editor dropdown)
// ==============================================================================
function syncBastionsToDev() {
  if (!ENV.DEV.URL || !ENV.DEV.KEY) throw new Error("Missing Dev Script Properties.");
  runSyncOrchestrator(ENV.DEV.URL, ENV.DEV.KEY, "DEVELOPMENT");
}

function syncBastionsToProd() {
  const ui = SpreadsheetApp.getUi();
  // Optional: Add a safety confirmation for Production pushes
  const response = ui.alert("⚠️ Production Sync", "Are you sure you want to push these changes to the PRODUCTION database?", ui.ButtonSet.YES_NO);
  if (response !== ui.Button.YES) return;

  if (!ENV.PROD.URL || !ENV.PROD.KEY) throw new Error("Missing Prod Script Properties.");
  runSyncOrchestrator(ENV.PROD.URL, ENV.PROD.KEY, "PRODUCTION");
}

// ==============================================================================
// Main Sync Orchestrator
// ==============================================================================
function runSyncOrchestrator(apiUrl, apiKey, envName) {
  const ui = SpreadsheetApp.getUi();
  
  try {
    // 1. Sync the Categories
    const categoriesPushed = syncCategories(apiUrl, apiKey);
    
    // 2. Fetch the UUID Map from Supabase (Category Name -> UUID)
    const categoryMap = fetchCategoryMap(apiUrl, apiKey);
    
    // 3. Sync the Bastions using the mapped UUIDs
    const bastionsPushed = syncBastionItems(apiUrl, apiKey, categoryMap);
    
    ui.alert(`✅ Sync Complete [${envName}]!\n\nCategories Upserted: ${categoriesPushed}\nBastions Upserted: ${bastionsPushed}`);
  } catch (error) {
    ui.alert(`❌ Error during sync to ${envName}:\n\n${error.message}`);
    console.error(error);
  }
}

// ==============================================================================
// 1. Sync Categories
// ==============================================================================
function syncCategories(apiUrl, apiKey) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CATS_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${CATS_SHEET_NAME}" not found.`);
  
  const data = sheet.getDataRange().getDisplayValues();
  const payload = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue; 
    
    payload.push({
      name: row[0],
      notes: row[1] || null
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
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ITEMS_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${ITEMS_SHEET_NAME}" not found.`);
  
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
function supabaseUpsert(apiUrl, apiKey, tableName, payloadArray) {
  const endpoint = `${apiUrl}/rest/v1/${tableName}`;
  
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