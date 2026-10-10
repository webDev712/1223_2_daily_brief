function log(user, time, text) {
  let SS = SpreadsheetApp.getActiveSpreadsheet();
  let logs_sh = SS.getSheetById('628080227');
  
  logs_sh.insertRowBefore(2);
  logs_sh.getRange(2, 1, 1, 3).setValues([[user || "", time || "", text || ""]])
}