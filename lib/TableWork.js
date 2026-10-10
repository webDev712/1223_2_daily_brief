const fill_group_of_days_ppoh_master = (days=2) => {
  let start_today = new Date();
  start_today.setDate(start_today.getDate());
  for (let i = 0; i < days; i++){
    fill_ppoh_master(start_today);
    start_today.setDate(start_today.getDate() - 1);
  }
}

const fill_ppoh_trigger = () => {
  fill_ppoh_master()
}

const fill_ppoh_master = (today_arg) => {
  log(getSettings(), new Date(), "Triggered fill_ppoh_master")
  Logger.log('Triggered by:' + getSettings() + ' at: ' + new Date());
  let SS = SpreadsheetApp.getActiveSpreadsheet();
  let SH_ppoh = SS.getSheetById('662849213');
  const previous_data_count = SH_ppoh.getDataRange().getValues().length - 1;
  let previous_data = SH_ppoh.getRange(2, 1, previous_data_count, 12).getValues();
  let today;
  if (today_arg){
    today = today_arg;
  }
  else{
    today = new Date();
    today.setDate(today.getDate() - 1);
    today.setHours(0, 0, 0, 0);
  }
  let dataQueryReports = getDailyDataQueryReports(today.getMonth() + 1, today.getDate(), today.getFullYear());
  today.setHours(0,0,0,0)
  console.log(today)
  if (true || dataQueryReports.length > 0){
    previous_data = previous_data.filter(row => new Date(row[1]).setHours(0,0,0,0) !== today.getTime())
    let before_date = previous_data.filter(row => new Date(row[1]).setHours(0,0,0,0) < today.getTime())
    let after_date = previous_data.filter(row => new Date(row[1]).setHours(0,0,0,0) > today.getTime())
    let result = after_date.concat(dataQueryReports.concat(before_date))
    
    

    if (result){
      result.sort((a, b) => 
        (new Date(b[1]) - new Date(a[1])) || String(a[3]).localeCompare(String(b[3]))
      )
      result = removeDuplicateRows(result)
      Logger.log("Added rows: " + dataQueryReports.length)
      Logger.log("Previous rows: " + previous_data_count)
      Logger.log("Total rows (filtered): " + result.length)

      fill_employee_master(dataQueryReports);

      SH_ppoh.getRange(2, 1, previous_data_count, 12).clear()
      SH_ppoh.getRange(2, 1, result.length, result[0].length).setValues(result)
      SpreadsheetApp.flush();
      log(getSettings(), new Date(), 'Added new rows: ' + dataQueryReports.length)
    }
  }
  return 0
}


const fill_employee_master = (new_data) => {
  log(getSettings(), new Date(), "Triggered fill_employee_master")
  let SS = SpreadsheetApp.getActiveSpreadsheet();
  let SH_emp = SS.getSheetById('1946909354');
  let emp_data = SH_emp.getDataRange().getValues().slice(1);

  new_data.map(new_emp_data => {
    if (emp_data.filter(el => el[0] == Number(new_emp_data[0])).length === 0){
      emp_data.push([
        new_emp_data[0], // id
        new_emp_data[2], // name
        new_emp_data[3], // department
        '', // target PPOH
        '', // detail PPOH
        '', // inspect PPOH
        'Yes', // active
        '', // primary role
        '', // trainer
        '', // notes
      ])
    }
  })
  emp_data = emp_data.sort((a, b) => {
    const yesA = a[6] === "Yes" ? 1 : 0;
    const yesB = b[6] === "Yes" ? 1 : 0;
    if (yesA !== yesB) {
      return yesB - yesA; 
    }
    const numA = Math.max(...[Number(a[3]), Number(a[4]), Number(a[5])]) || 0;
    const numB = Math.max(...[Number(b[3]), Number(b[4]), Number(b[5])]) || 0;
    if (numA !== numB) {
      return numB - numA;
    }
    return String(a[2]).localeCompare(String(b[2]));
  })
  if (emp_data.length > 0) {
    SH_emp.getRange(2, 1, emp_data.length, emp_data[0].length).setValues(emp_data);
  }
  return 0
}

const getEmployeesDepartmentsObject = () => {
  let SS = SpreadsheetApp.getActiveSpreadsheet();
  let SH_emp = SS.getSheetById('1946909354');
  let emp_data = SH_emp.getDataRange().getValues().slice(1);
  let emp_object = {};
  emp_data.map(emp => emp_object[emp[0]] = emp[2])
  return emp_object
}

const getEmployeesTargetObject = () => {
  let SS = SpreadsheetApp.getActiveSpreadsheet();
  let SH_emp = SS.getSheetById('1946909354');
  let emp_data = SH_emp.getDataRange().getValues().slice(1);
  let emp_object = {};
  emp_data.map(emp => emp_object[emp[0]] = emp[3])
  return emp_object
}

const getEmployeesTargetDetailObject = () => {
  let SS = SpreadsheetApp.getActiveSpreadsheet();
  let SH_emp = SS.getSheetById('1946909354');
  let emp_data = SH_emp.getDataRange().getValues().slice(1);
  let emp_object = {};
  emp_data.map(emp => emp_object[emp[0]] = emp[4])
  return emp_object
}

const getEmployeesTargetInspectObject = () => {
  let SS = SpreadsheetApp.getActiveSpreadsheet();
  let SH_emp = SS.getSheetById('1946909354');
  let emp_data = SH_emp.getDataRange().getValues().slice(1);
  let emp_object = {};
  emp_data.map(emp => emp_object[emp[0]] = emp[5])
  return emp_object
}

const weekly_report = () => {
  log(getSettings(), new Date(), "Triggered weekly_report")
  let SS = SpreadsheetApp.getActiveSpreadsheet();
  let SH_ppoh = SS.getSheetById('662849213');
  let SH_Dashboard = SS.getSheetById('1994667643');

  let ppoh_data = SH_ppoh.getDataRange().getValues().slice(1);
  let dashboard_data = SH_Dashboard.getDataRange().getValues().slice(1);

  let lastSunday = getLastMonday()
  lastSunday.setDate(lastSunday.getDate() - 1 - 7)


  // let toSunday = new Date();
  // lastMonday.setDate(lastMonday.getDate() - 7)
  // toSunday.setDate(lastMonday.getDate() + 7)


  let toMonday = new Date();
  toMonday.setDate(toMonday.getDate() - 1)

  if (lastSunday > toMonday) return 0;
  let m1 = lastSunday.getUTCMonth() + 1
  console.log(lastSunday.getDay())
  let wd1 = weekDaysArray()[lastSunday.getDay()]
  let d1 = lastSunday.getUTCDate()
  
  let m2 = toMonday.getUTCMonth() + 1
  let wd2 = weekDaysArray()[toMonday.getDay()]
  let d2 = toMonday.getUTCDate()

  SH_Dashboard.getRange('L1:T1').setValue(`Weekly statistics
${wd1} ${m1}.${d1} - ${wd2} ${m2}.${d2}`)
  let emp_object = {};
  let i = 0
  for (i; i < ppoh_data.length; i++){
    if (ppoh_data[i][1] < lastSunday) break;
  }

  ppoh_data = ppoh_data.slice(0, i);
  ppoh_data.map(e => {
    if (!emp_object['e_' + e[0]]) emp_object['e_' + e[0]] = [];
      emp_object['e_' + e[0]].push([
      e[0],
      e[1],
      e[2],
      e[3],
      e[4],
      e[5],
      e[6],
      e[7],
      e[8],
      e[9],
      e[10],
  ])});

  
  let result = [];
  let empDepartmentsObj = getEmployeesDepartmentsObject();
  Object.entries(emp_object).forEach(([key, value]) => {
    if (Number(value.map(el => el[5]).reduce((s, v) => s + v, 0)) > 0){
      emp_object[key] = [
        /* id */      value[0][0],
        /* name */    value[0][2],
        /* name id */ value[0][2] + " (" + value[0][0] + ")",
        /* departm */ empDepartmentsObj[value[0][0]] || Object.entries(value.map(el => el[3]).reduce((acc, v) => (acc[v] = (acc[v]||0)+1, acc), {})).sort((a,b)=>b[1]-a[1])[0][0],
        /* pieces */  Number(value.map(el => el[4]).reduce((s, v) => s + v, 0)),
        /* hours */   Number(value.map(el => el[5]).reduce((s, v) => s + v, 0)) / 24,
        "",
        "",
        /* ppoh */    calcAverage(value, 6),
        /* tarppoh*/  calcAverage(value, 7),
        /* effic*/    calcAverage(value, 9),
      ]
      result.push(emp_object[key]);
      // if (result[result.length - 1][9] != 0){
      //   (result[result.length - 1].push((result[result.length - 1][8] / result[result.length - 1][9] * 100).toFixed(1)));
      // }
      // else{
      //   result[result.length - 1].push(0);
      // }
    }
  });




  let resWidth = result[0].length
  if (dashboard_data.length > 0){
    SH_Dashboard.getRange(2, 1, dashboard_data.length, dashboard_data[0].length <= resWidth ? dashboard_data[0].length : resWidth).clearContent();
  }
  if (result.length > 0){
    result = result.sort((a, b) => a[3].localeCompare(b[3]))
    SH_Dashboard.getRange(2, 1, result.length, resWidth).setValues(result);
  }
  SpreadsheetApp.flush();
}