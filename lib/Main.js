function onEditCustom(e) {
  const sheetNames = ['Daily_Lead_Log', 'Action_Tracker']; // watch both tabs
  const idCol = 1;
  const timestampCol = 2;               // Column B
  const triggerCols = [3,4,5,6,7,8,9,10,11,12];       // Adjust if needed

  const range = e.range;
  const sheet = range.getSheet();

  Logger.log(e)
  if (sheet.getName() === 'Action_Tracker') action_TrackerTriggers(e);
  if (sheet.getName() === 'Daily_Lead_Log') daily_Lead_LogTriggers(e);
  if (!sheetNames.includes(sheet.getName())) return;

  const row = range.getRow();
  const col = range.getColumn();

  if (!triggerCols.includes(col)) return;
  
  if (col !== timestampCol){
    const tsCell = sheet.getRange(row, timestampCol);
    if (tsCell.getValue() === '') tsCell.setValue(new Date());
  }

  const idCell = sheet.getRange(row, idCol);
  if (idCell.getValue() === '' && sheet.getName() === 'Daily_Lead_Log') idCell.setValue(Utilities.getUuid());

}



function onOpen(e) {
  SpreadsheetApp.getUi()
    .createMenu("SMRT Settings")
      .addItem('Show SMRT Settings', 'openSettingsModal').addToUi();
  SpreadsheetApp.getUi()
    .createMenu("Triggers")
      .addItem('Create Triggers', 'openAddTrigger')
      .addItem('Delete Triggers', 'openDeleteTrigger')
      .addItem('Show Triggers', 'openShowTrigger').addToUi();
  SpreadsheetApp.getUi()
    .createMenu("Get SMRT data")
      .addItem('Get Daily Data', 'openGetDailyData')
      .addItem('Create Weekly Report', 'openConfigureWeeklyData').addToUi();
  SpreadsheetApp.getUi()
    .createMenu("Daily Lead Log Page")
      .addItem('Add Row', 'dailyLeadLogAddRow').addToUi();
}


function dailyLeadLogAddRow() {
  let dlSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Daily_Lead_Log')
  dlSheet.insertRowBefore(2);
  dlSheet.setRowHeight(2, 40);
  dlSheet.getRange(2, 1, 1, 1).setValue(Utilities.getUuid());
  dlSheet.getRange(2, 2, 1, 1).setValue(new Date());
  dlSheet.getRange(2, 3, 1, 1).setValue(new Date());

  SpreadsheetApp.flush();
}

function openSettingsModal() {
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutputFromFile('ShowSettings').setWidth(500).setHeight(400),
    'Settings');
}

const a = () => {
  let dlSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Daily_Lead_Log')
  let atSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Action_Tracker')
  let dlData = dlSheet.getDataRange().getValues()
  let atData = atSheet.getDataRange().getValues()
  let idLeadObj = {}
  dlData.map(el => idLeadObj[el[0]] = el[3])
  atData.map((el, i) => atSheet.getRange(i + 1, 4).setValue(idLeadObj[el[0]]))  
}


const b = () => {
  log('test', new Date())
}

function createFillPPOHMasterTrigger() {
  log(getSettings(), new Date(), 'Created trigger fill_ppoh_master for 6am')
  deleteFillPPOHMasterTrigger();
  Utilities.sleep(5000)


  ScriptApp.newTrigger('fill_ppoh_trigger')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .inTimezone('America/Los_Angeles')
    .create();
  Logger.log('Created trigger fill_ppoh_master for 6am: ' + getSettings() + " at: " + new Date());
}

function deleteFillPPOHMasterTrigger() {
  log(getSettings(), new Date(), 'Deleted all triggers fill_ppoh_master')
  Logger.log('Deleted all triggers fill_ppoh_master by: ' + getSettings() + " at: " + new Date());
  let triggers =  ScriptApp.getProjectTriggers();
  triggers.forEach((trigger) => {
    if (trigger.getHandlerFunction() == "fill_ppoh_master" || trigger.getHandlerFunction() == "fill_ppoh_trigger") {
      ScriptApp.deleteTrigger(trigger);
    }
  })
}

function createWeekReportTrigger() {
  log(getSettings(), new Date(), 'Created trigger weekly_report for Sunday 6am')
  Utilities.sleep(5000)
  deleteWeekReportTrigger();


  ScriptApp.newTrigger('weekly_report')
    .timeBased()
    .everyWeeks(1)
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(7)
    .inTimezone('America/Los_Angeles')
    .create();
  Logger.log('Created trigger weekly_report for Sunday 7am by: ' + getSettings() + " at: " + new Date());
  // ScriptApp.newTrigger('weekly_report')
  //   .timeBased()
  //   .everyWeeks(1)
  //   .onWeekDay(ScriptApp.WeekDay.SUNDAY)
  //   .atHour(4)
  //   .inTimezone('America/Los_Angeles')
  //   .create();
}

function deleteWeekReportTrigger() {
  log(getSettings(), new Date(), 'Deleted all triggers fill_ppoh_master')
  Logger.log('Deleted all triggers fill_ppoh_master by: ' + getSettings() + " at: " + new Date());
  let triggers =  ScriptApp.getProjectTriggers();
  triggers.forEach((trigger) => {
    if (trigger.getHandlerFunction() == "weekly_report") {
      ScriptApp.deleteTrigger(trigger);
    }
  })
}

function getSettings(){
  return Session.getActiveUser().getEmail();
}

function getAPIKeyProperty(){
  let props = PropertiesService.getUserProperties();
  let key = props.getProperty("SMRT_KEY");
  return key || "";
}

function setAPIKeyProperty(new_key){
  log(getSettings(), new Date(), 'PRIVATE API KEY ADDED')
  Logger.log('Triggered by: ' + getSettings() + " at: " + new Date() + " new API_KEY: " + new_key.slice(0, 10) + "...");
  let props = PropertiesService.getUserProperties();
  props.setProperty("SMRT_KEY", new_key);
  return true;
}


function openAddTrigger() {
  try{
    createFillPPOHMasterTrigger();
    createWeekReportTrigger();
    SpreadsheetApp.getUi().alert('Created Daily triggers and Weekly triggers');
  }
  catch(e){
    SpreadsheetApp.getUi().alert(e);
  }
}

function openDeleteTrigger() {
  try{
    deleteFillPPOHMasterTrigger();
    deleteWeekReportTrigger();
    SpreadsheetApp.getUi().alert('Deleted all Daily triggers and Weekly triggers');
  }
  catch(e){
    SpreadsheetApp.getUi().alert(e);
  }
}

function openShowTrigger() {
  let result = "Triggers: ";
  let i = 1;
  let found_triggers = false;
  let triggers =  ScriptApp.getProjectTriggers();
  triggers.forEach((trigger) => {
    if (trigger.getHandlerFunction() == "fill_ppoh_master") {
      result += `\n${i}) Daily trigger`;
      i++;
      found_triggers = true;
    }
    if (trigger.getHandlerFunction() == "weekly_report") {
      result += `\n${i}) Weekly trigger`;
      i++;
      found_triggers = true;
    }
  })
  SpreadsheetApp.getUi().alert(found_triggers ? result : 'No triggers found...');
}

function openGetDailyData() {
  let template = HtmlService.createTemplateFromFile('GetDailyData');

  template.data = {
    date: Utilities.formatDate(
      new Date(),
      'America/Los_Angeles',
      'yyyy-MM-dd'
    ),
  }

  const html = template.evaluate()
    .setWidth(500)
    .setHeight(250);

  SpreadsheetApp.getUi().showModalDialog(html, 'Get Daily Data')
}

function openConfigureWeeklyData() {
  let template = HtmlService.createTemplateFromFile('GetWeeklyData');

  template.data = {
    date: Utilities.formatDate(
      new Date(),
      'America/Los_Angeles',
      'yyyy-MM-dd'
    ),
    previous_monday: Utilities.formatDate(
      getLastMonday(),
      'America/Los_Angeles',
      'yyyy-MM-dd'
    ),
  }

  const html = template.evaluate()
    .setWidth(500)
    .setHeight(250);

  SpreadsheetApp.getUi().showModalDialog(html, 'Create Weekly Report')
}


function doGet() {
  const sheet = getSS()
    .getSheetByName("PPOH_MASTER");

  const data = sheet.getDataRange().getValues();

  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}