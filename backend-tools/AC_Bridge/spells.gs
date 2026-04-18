const SPELLS_SOURCE_SHEET_ID   = "1fBEv1yDNTD-vwUyK6pK_oiXg2K7OiltW35iFCqxyMTY";  // the ID from the source sheet's URL
const SPELLS_SOURCE_SHEET_NAME = "Spells";                  // tab name in the source sheet
const SPELLS_SHEET_NAME = "Spells";                  // tab name in your destination workbook

const COLUMNS = {
  SPELL:  0,  // Column A
  SOURCE: 1,  // Column B
  NOTES:  2,  // Column C
  ADVICE: 3   // Column D
};

function replicateSpells() {
  const sourceSS = SpreadsheetApp.openById(SPELLS_SOURCE_SHEET_ID);
  const source   = sourceSS.getSheetByName(SPELLS_SOURCE_SHEET_NAME);

  if (!source) {
    SpreadsheetApp.getUi().alert(`Tab "${SPELLS_SOURCE_SHEET_NAME}" not found in source sheet.`);
    return;
  }

  const data = source.getDataRange().getValues();
  const replicated = [];

  // Create the clean header row for the target sheet
  replicated.push([
    "Spell", "Source", "Notes", "Rage Advice"
  ]);

  // Start at i=1 to skip the raw header row
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // Safely parse the columns, falling back to empty strings if missing
    const spell  = String(row[COLUMNS.SPELL] || "").trim();
    const src    = String(row[COLUMNS.SOURCE] || "").trim();
    const notes  = String(row[COLUMNS.NOTES] || "").trim();
    const advice = String(row[COLUMNS.ADVICE] || "").trim();

    // Skip empty rows or accidental header repeats
    if (spell === "" || spell === "Spell") continue;

    // Add the clean row
    replicated.push([spell, src, notes, advice]);
  }

  // Write to the target sheet in this workbook (create if missing)
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let targetSheet = ss.getSheetByName(SPELLS_SHEET_NAME);
  if (!targetSheet) {
    targetSheet = ss.insertSheet(SPELLS_SHEET_NAME);
  } else {
    targetSheet.clearContents();
  }

  // Set the replicated data range
  targetSheet.getRange(1, 1, replicated.length, replicated[0].length).setValues(replicated);

  SpreadsheetApp.getUi().alert(
    `Done! ${replicated.length - 1} spell groupings written to "${SPELLS_SHEET_NAME}".`
  );
}