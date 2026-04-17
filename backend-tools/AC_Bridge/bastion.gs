const SOURCE_SHEET_ID   = "1fBEv1yDNTD-vwUyK6pK_oiXg2K7OiltW35iFCqxyMTY";  
const SOURCE_SHEET_NAME = "Bastions";               
const CATS_SHEET_NAME   = "Bastions Categories";    
const ITEMS_SHEET_NAME  = "Normalized Bastions";    

function normalizeBastions() {
  const sourceSS = SpreadsheetApp.openById(SOURCE_SHEET_ID);
  const source   = sourceSS.getSheetByName(SOURCE_SHEET_NAME);

  if (!source) {
    SpreadsheetApp.getUi().alert(`Tab "${SOURCE_SHEET_NAME}" not found in source sheet.`);
    return;
  }

  const data = source.getDataRange().getValues();
  
  // Arrays for the two normalized tables
  const categoriesData = [["Category", "Notes"]];
  const itemsData = [
    ["Category", "Name", "Source", "Size", "Building Prerequisite", "Cost (GP)", "Cost (DTP)", "Order", "Description", "Notes / Rage Advice"]
  ];

  let state = "SEARCHING_CATEGORY";
  
  // Initialize with a default category for the global rules at the top of the sheet
  let currentCategory = "General Rules";
  let currentNotes = "";
  categoriesData.push([currentCategory, currentNotes]);

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
          categoriesData.push([currentCategory, currentNotes]);
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
  insertData(CATS_SHEET_NAME, categoriesData);
  insertData(ITEMS_SHEET_NAME, itemsData);

  SpreadsheetApp.getUi().alert(
    `Done! Exported ${categoriesData.length - 1} Categories and ${itemsData.length - 1} Bastion Facilities.`
  );
}