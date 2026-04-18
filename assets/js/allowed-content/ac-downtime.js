// ==============================================================================
// Configuration
// ==============================================================================
const DT_SOURCE_SHEET_ID = "1fBEv1yDNTD-vwUyK6pK_oiXg2K7OiltW35iFCqxyMTY";
const DT_SOURCE_SHEET_NAME = "Downtime";
const DT_CATS_SHEET_NAME = "Downtime Categories";
const DT_ITEMS_SHEET_NAME = "Normalized Downtime";

const dtScriptProps = PropertiesService.getScriptProperties();
const DT_ENV = {
    DEV: {
        URL: dtScriptProps.getProperty("SUPABASE_DEV_URL"),
        KEY: dtScriptProps.getProperty("SUPABASE_DEV_KEY")
    },
    PROD: {
        URL: dtScriptProps.getProperty("SUPABASE_PROD_URL"),
        KEY: dtScriptProps.getProperty("SUPABASE_PROD_KEY")
    }
};

// ==============================================================================
// Create Custom Menu Items
// ==============================================================================
function onOpen() {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('Database Sync')
        .addItem('🚀 Sync Downtime to DEV', 'syncDowntimeToDev')
        .addItem('🚨 Sync Downtime to PROD', 'syncDowntimeToProd')
        .addToUi();
}

// ==============================================================================
// 1. Normalizer (NOW WITH MARKDOWN LINK PRESERVATION)
// ==============================================================================
function normalizeDowntime() {
    const sourceSS = SpreadsheetApp.openById(DT_SOURCE_SHEET_ID);
    const source = sourceSS.getSheetByName(DT_SOURCE_SHEET_NAME);

    if (!source) {
        SpreadsheetApp.getUi().alert(`Tab "${DT_SOURCE_SHEET_NAME}" not found in source sheet.`);
        return;
    }

    // Grab BOTH the display text and the underlying Rich Text (metadata) for links
    const range = source.getDataRange();
    const data = range.getDisplayValues();
    const richData = range.getRichTextValues();

    // Arrays for the two normalized tables
    const categoriesData = [["Category", "Notes"]];
    const itemsData = [
        ["Category", "Name of Activity", "Gold", "DTP Cost", "Description", "Notes / Rage Advice"]
    ];

    let state = "SEARCHING_CATEGORY";
    let currentCategory = "";
    let currentNotes = "";

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const richRow = richData[i]; // Get the rich text for this specific row

        // Parse the standard columns
        const c0 = String(row[0] || "").trim(); // Name of Activity
        const c2 = String(row[2] || "").trim(); // Gold
        const c3 = String(row[3] || "").trim(); // DTP Cost

        // 1. Skip Link Navigation rows
        if (c0.startsWith("Jump to")) continue;

        // 2. A fully blank row triggers a reset to find the next category
        if (c0 === "" && c2 === "" && c3 === "" && String(row[4] || "").trim() === "") {
            state = "SEARCHING_CATEGORY";
            continue;
        }

        // 3. Subcategory detection
        if (state === "DATA" && c0 !== "" && c2 === "" && c3 === "") {
            state = "SEARCHING_CATEGORY";
        }

        // 4. STATE: Finding a Category Header
        if (state === "SEARCHING_CATEGORY") {
            if (c0 !== "" && c2 === "" && c3 === "") {
                currentCategory = c0.split("(Go to")[0].trim(); // Clean up navigation text
                currentNotes = "";
                categoriesData.push([currentCategory, currentNotes]);
                state = "CATEGORY_NOTES";
                continue;
            }

            if (c0 === "Name of Activity") {
                state = "DATA";
                continue;
            }
        }

        // 5. STATE: Reading Notes beneath the Category
        if (state === "CATEGORY_NOTES") {
            if (c0 === "Name of Activity") {
                state = "DATA";
                continue; // Skip the header itself
            } else if (c0 !== "" && c2 === "" && c3 === "") {
                // Run the category note through the markdown converter!
                const noteText = richTextToMarkdown(richRow[0]).trim();

                if (currentNotes === "") {
                    currentNotes = noteText;
                } else {
                    currentNotes += "\n\n" + noteText;
                }

                categoriesData[categoriesData.length - 1][1] = currentNotes;
                continue;
            } else if (c0 !== "" && (c2 !== "" || c3 !== "")) {
                // FIX: Found an activity (has Gold or DTP) but no "Name of Activity" header. 
                // Switch to DATA state and let it fall through to the block below!
                state = "DATA";
            }
        }

        // 6. STATE: Extracting standard rows
        if (state === "DATA") {
            if (c0 === "Name of Activity") {
                continue;
            }

            // Store the real Item Data and convert Descriptions/Notes to Markdown!
            if (c0 !== "" && c0 !== "nan") {
                itemsData.push([
                    currentCategory,
                    c0,
                    c2,
                    c3,
                    richTextToMarkdown(richRow[4]).trim(), // Description with links
                    richTextToMarkdown(richRow[9]).trim()  // Notes with links
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

    insertData(DT_CATS_SHEET_NAME, categoriesData);
    insertData(DT_ITEMS_SHEET_NAME, itemsData);

    SpreadsheetApp.getUi().alert(
        `Done! Exported ${categoriesData.length - 1} Categories and ${itemsData.length - 1} Downtime Activities.`
    );
}

// ==============================================================================
// 2. Entry Points for Sync
// ==============================================================================
function syncDowntimeToDev() {
    if (!DT_ENV.DEV.URL || !DT_ENV.DEV.KEY) throw new Error("Missing Dev Script Properties.");
    console.log("Starting Downtime sync to DEVELOPMENT...");
    runDowntimeSync(DT_ENV.DEV.URL, DT_ENV.DEV.KEY, "DEVELOPMENT");
}

function syncDowntimeToProd() {
    if (!DT_ENV.PROD.URL || !DT_ENV.PROD.KEY) throw new Error("Missing Prod Script Properties.");
    console.log("Starting Downtime sync to PRODUCTION...");
    runDowntimeSync(DT_ENV.PROD.URL, DT_ENV.PROD.KEY, "PRODUCTION");
}

// ==============================================================================
// 3. Main Sync Orchestrator
// ==============================================================================
function runDowntimeSync(apiUrl, apiKey, envName) {
    try {
        const catsPushed = syncDowntimeCategories(apiUrl, apiKey);
        console.log(`Downtime Categories Upserted: ${catsPushed}`);

        const categoryMap = fetchDowntimeCategoryMap(apiUrl, apiKey);

        const itemsPushed = syncDowntimeData(apiUrl, apiKey, categoryMap);
        console.log(`Downtime Activities Upserted: ${itemsPushed}`);
        console.log(`✅ Sync Complete [${envName}]!`);

        try {
            SpreadsheetApp.getActiveSpreadsheet().toast(`Categories: ${catsPushed} | Activities: ${itemsPushed}`, `✅ Sync Complete [${envName}]`);
        } catch (e) { }

    } catch (error) {
        console.error(`❌ Error during sync to ${envName}: ${error.message}`);
        try {
            SpreadsheetApp.getActiveSpreadsheet().toast(`${error.message}`, `❌ Sync Error [${envName}]`, 10);
        } catch (e) { }
    }
}

// ==============================================================================
// 4. Sync Downtime Categories
// ==============================================================================
function syncDowntimeCategories(apiUrl, apiKey) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DT_CATS_SHEET_NAME);
    if (!sheet) throw new Error(`Sheet "${DT_CATS_SHEET_NAME}" not found.`);

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
    supabaseUpsertDowntime(apiUrl, apiKey, "ac_downtime_categories", payload, "name");
    return payload.length;
}

// ==============================================================================
// 5. Fetch Category UUID Mapping
// ==============================================================================
function fetchDowntimeCategoryMap(apiUrl, apiKey) {
    const endpoint = `${apiUrl}/rest/v1/ac_downtime_categories?select=id,name`;

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
// 6. Sync Downtime Data
// ==============================================================================
function syncDowntimeData(apiUrl, apiKey, categoryMap) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DT_ITEMS_SHEET_NAME);
    if (!sheet) throw new Error(`Sheet "${DT_ITEMS_SHEET_NAME}" not found.`);

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
            gold_cost: row[2] || null,
            dtp_cost: row[3] || null,
            description: row[4] || null,
            notes_advice: row[5] || null,
            display_order: i
        });
    }

    if (payload.length === 0) return 0;
    supabaseUpsertDowntime(apiUrl, apiKey, "ac_downtime", payload, "name");
    return payload.length;
}

// ==============================================================================
// 7. Helper: Supabase Upsert
// ==============================================================================
function supabaseUpsertDowntime(apiUrl, apiKey, tableName, payloadArray, conflictCols) {
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
// 8. Helper: Convert Google Sheet Rich Text to Markdown Links
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
            markdown += `[${runText}](${runUrl})`;
        } else {
            markdown += runText;
        }
    }

    return markdown;
}