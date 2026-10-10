function action_TrackerTriggers(e) {
  let range = e.range;
  let row = range.getRow();
  let col = range.getColumn();
  
  if (col === 10){
    if (range.getValue() === 'Resolved'){
      console.log('Resolved', new Date())
      range.getSheet().getRange(row, col + 1).setValue(new Date());
    }
    SpreadsheetApp.flush()
    sortActionTracker()
  }
}

function daily_Lead_LogTriggers(e){
  let range = e.range;
  let row = range.getRow();
  let col = range.getColumn();
  let dlSheet = range.getSheet();

  if (col === 11 && dlSheet.getRange(row, 11).getValue() === 'Yes'){
    let id = dlSheet.getRange(row, 1).getValue();
    if (id === "") {
      let newId = Utilities.getUuid();
      dlSheet.getRange(row, 1).setValue(newId);
      SpreadsheetApp.flush();
      id = newId;
    } 

    let actionTrackerSH = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Action_Tracker');
    let actionData = actionTrackerSH.getDataRange().getValues().slice(1).map(a => a.slice(0, 10));
    let index = actionData.findIndex(row => String(row[0]) === String(id));
    
    let data_row = dlSheet.getRange(row, 1, 1, 14).getValues()[0]
    
    console.log(index)
    console.log('00')
    // Adding new line
    if (index === -1){
      console.log('01')
      let ts = new Date();
      let new_row = [[
        id,
        ts,
        data_row[2],
        data_row[3],
        data_row[5],
        data_row[6],
        data_row[7],
        data_row[11],
        data_row[8],
        "Unset",
      ]]
      if (data_row[11]){
        console.log('02')
        try {
          console.log('03')
          sendEmailNewIssue(id, data_row[11], new_row[0][1], new_row[0][2], new_row[0][3], new_row[0][4], new_row[0][5], new_row[0][6], new_row[0][8], new_row[0][9]);
        }catch(e){
          Logger.log('error, while sending an email:')
          Logger.log(e)
        }
      }
      actionTrackerSH.insertRowBefore(2)
      actionTrackerSH.getRange(2, 1, new_row.length, new_row[0].length).setValues(new_row);
      actionTrackerSH.getRange(2, 12, 1, 1).setFormulaR1C1('=IF(OR(RC[-1]="", RC[-9]=""), "", DAYS(RC[-1], RC[-9]))');

      sortActionTracker();
    }
  }
  else if ([2, 3, 4, 5, 6, 7, 8, 12].indexOf(col) !== -1){
    console.log('10')
    let new_assigned_owner = e.value

    let actionTrackerSH = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Action_Tracker');
    let actionData = actionTrackerSH.getDataRange().getValues().slice(1).map(a => a.slice(0, 10));

    let id = dlSheet.getRange(row, 1).getValue();
    if (id === "") {
      let newId = Utilities.getUuid();
      dlSheet.getRange(row, 1).setValue(newId);
      SpreadsheetApp.flush();
      id = newId;
    }
    let action_row_id = actionData.findIndex(el => el[0] === id)
    console.log('action_row_id: ', action_row_id)
    if (action_row_id !== -1){
      console.log('11')
      // actionTrackerSH.getRange('A1').setValue(JSON.stringify(new_assigned_owner) + JSON.stringify(action_row_id));
      let found_row = actionTrackerSH.getRange(action_row_id + 2, 1, 1, actionData[0].length || 13).getValues()[0];
      let dl_row = dlSheet.getRange(row, 1, 1, 14).getValues()[0];
      found_row[1] = dl_row[1];
      found_row[2] = dl_row[2];
      found_row[3] = dl_row[3];
      found_row[4] = dl_row[5];
      found_row[5] = dl_row[6];
      found_row[6] = dl_row[7];
      found_row[7] = new_assigned_owner;
      found_row = found_row.slice(0, 8);
      actionTrackerSH.getRange(action_row_id + 2, 1, 1, found_row.length).setValues([found_row]);
      if(col === 12 && new_assigned_owner){
        console.log('12')
        sendEmailNewIssue(id, dl_row[11], dl_row[1], dl_row[2], dl_row[3], dl_row[5], dl_row[6], dl_row[7], dl_row[8], "Unset");

      }
    }

  }
}

function sortActionTracker() {
  let actionTrackerSH = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Action_Tracker');
  let actionTrData = actionTrackerSH.getDataRange().getValues().slice(1);
  if (actionTrData.length > 0){
    actionTrData = actionTrData.sort((a, b) => {
     const statusOrder = {
  "": 1,
  "Unset": 2,
  "Waiting": 3,
  "In progress": 4,
  "Resolved": 5
};

const statusCompare = (statusOrder[a[9]] || 99) - (statusOrder[b[9]] || 99);
if (statusCompare !== 0) return statusCompare;

return new Date(b[2]) - new Date(a[2]);
    });
    actionTrackerSH.getRange(2, 1, actionTrData.length, actionTrData[0].length).setValues(actionTrData);
    actionTrackerSH
      .getRange(2, 12, actionTrData.length, 1)
      .setFormulaR1C1('=IF(OR(RC[-1]="", RC[-9]=""), "", DAYS(RC[-1], RC[-9]))');
    SpreadsheetApp.flush();
  }
}

function addCommentToColumnL() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Daily_Lead_Log");
  const lastRow = sheet.getLastRow();
  
  const range = sheet.getRange(2, 11, lastRow - 1);
  
  const commentText = "Please fill in this column when you have finished all the other columns.";
  
  range.setNote(commentText);
}