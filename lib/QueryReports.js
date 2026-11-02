function getReport() {
  const url = "https://helenascleaners.smrtapp.com/graphql";
  
  const query = `
    query QueryReports($query: String!, $page: Int, $limit: Int) {
      business {
        queryReports(query: $query, page: $page, limit: $limit) {
          id
          columns {
            id
            name
          }
          values
          kpi {
            id
            value
          }
        }
      }
    }
  `;

  const variables = {
    query: JSON.stringify({
      filter: {
        "38cee305-4e24-4029-a4ed-c23d8e8da20e": {
          special: {
            "ItemTransaction:detailingDate": "$this_week"
          }
        }
      },
      columns: [],
      columns2D: {
        "1c771546-98e4-496f-935a-b95e4c55097f": {
          method: "count",
          field: 'string'
        }
      },
      columns3D: {
        "cd549d4c-3012-429d-8629-5212686b5f92": {
          method: "count",
          field: "string"
        }
      },
      kpi: {},
      groups: {
        "c09220d1-aa50-4421-bd45-4ffb220b9b0f": {
          field: "ItemTransaction:detailingDate",
          interval: "hour"
        },
        "b019d6d7-2478-4785-aae7-c1f611a1faad": {
          field: "ItemTransaction:detailing_staff_id"
        }
      },
      report_index: "sale_items",
      filterModes: {
        "38cee305-4e24-4029-a4ed-c23d8e8da20e": "include"
      },
      customizations: { sort: null },
      type_overrides: null,
      name_overrides: null,
      nested_aggs_filter: null,
      id: "651f4068-3d62-490c-b71f-c55dec69131d"
    }),
    page: 1,
    limit: 5000
  };

  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + getBearer(),
    },
    payload: JSON.stringify({
      query: query,
      variables: variables
    }),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const json = JSON.parse(response.getContentText()).data.business.queryReports;
  
  let res_obj = [];
  res_obj.push(new Array(40).fill(""))
  json.columns.map((el, i) => {
    res_obj[0][i] = el.name
  })
  json.values.map((el, i) => {
    res_obj.push(new Array(40).fill(""))
    el.map((item, t) => {
      res_obj[i + 1][t] = item || "";
    })
  })
  let SS = SpreadsheetApp.getActiveSpreadsheet()
  let SH = SS.getSheetByName('test')
  SH.clear();
  SpreadsheetApp.flush();
  if (res_obj.length > 0){
    SH.getRange(1, 1, res_obj.length, res_obj[0].length).setValues(res_obj)
  }
}


const getCookie = () => {
  const response = UrlFetchApp.fetch("https://helenascleaners.smrtapp.com/");

  const cookies = response.getAllHeaders()["Set-Cookie"];

  const cookieString = cookies
    .map(c => c.split(";")[0])
    .join("; ");
  console.log(cookieString)
  return cookieString
}

const asdasfdasfdasfsdg = () =>{
  PropertiesService.getScriptProperties().setProperty("client_version", "10")
}

function smrtLoginGetCookie() {
  let cookie;
  const url = "https://helenascleaners.smrtapp.com/api/session/remote-sign-in";

  let client_version = Number(PropertiesService.getScriptProperties().getProperty("client_version"))
  let payload = {
    clientVersion :  String(client_version),
    password : "Accessforyou11!",
    store_id : "10005",
    username : "test"
  };
  let response;
  let headers;
  let cookies;
  let response_string;
  
  try{
    response = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      headers: {
        accept: "application/json",
        "x-requested-with": "smrt-fetch"
      }
    });
    response_string = response.toString()
    headers = response.getAllHeaders();
    cookies = headers["Set-Cookie"];
    cookie = cookies.map(c => c.split(";")[0]).find(c => !c.includes("deleted"));
  }
  catch{
    console.log(response_string)
    let set_new_version = false;
    let i = 0;
    while (i < 3) {
      i++;
      payload = {
        clientVersion :  String(client_version),
        password : "Accessforyou11!",
        store_id : "10005",
        username : "test"
      };
      response = UrlFetchApp.fetch(url, {
          method: "post",
          contentType: "application/json",
          payload: JSON.stringify(payload),
          headers: {
            accept: "application/json",
            "x-requested-with": "smrt-fetch"
          }
        });
      if (JSON.parse(response.toString())["success"] == false && JSON.parse(response.toString())["message"].includes("updated the software")){
        client_version++;
      }
      else{
        if (JSON.parse(response.toString())["success"] == true){
          set_new_version = true;
          PropertiesService.getScriptProperties().setProperty("client_version", String(client_version))
        }
      }
    }
  }
  headers = response.getAllHeaders();
  cookies = headers["Set-Cookie"];
  cookie = cookies.map(c => c.split(";")[0]).find(c => !c.includes("deleted"));
  PropertiesService.getScriptProperties().setProperty("smrt_cookie", cookie);
  return cookie;
}

function loadPerformance(u) {
  const response = sendURLFetch(
    `https://helenascleaners.smrtapp.com/POS/ajax/performance-chart?staffId=${u.id}&date=${u.date}`
  );
  if (response.getResponseCode() !== 404) {
    const html_object = JSON.parse(response.getContentText());

    if (!html_object.series || html_object.series.length === 0) return false;
    const return_object = {'series': html_object.series, 'employeeName': html_object.employee};
    if (html_object.production) {
      return_object.pieces = html_object.production.pieces;
      return_object.goal = html_object.production.goal;
      return_object.ppoh = html_object.production.ppoh;
      return_object.efficiency = html_object.production.efficiency;
    }
     return return_object
  }
  return false;
}

function fill_group_of_days_ppoh_master_query_reports (){
  fill_group_of_days_ppoh_master(days=2);
}


const getDailyDataQueryReports = (month, day, year) => {
  if (!month) month = new Date().getMonth() + 1;
  if (!day) day = new Date().getDate();
  if (!year) year = new Date().getFullYear();

  const date = new Date(year, month - 1, day);

  let dataProductionPPOH = getProductionPPOHData(month, day, year);
  let empDepartmentsObj = getEmployeesDepartmentsObject();
  let empTargetObj = getEmployeesTargetObject();
  let empTargetDetailObj = getEmployeesTargetDetailObject();
  let empTargetInspectObj = getEmployeesTargetInspectObject();

  Logger.log(`getDailyDataQueryReports for ${date}`);

  const results = [];
  let charts = {};

  const empDepartmentsObjKeys = Object.keys(empDepartmentsObj);
  for (let i = 0; i < empDepartmentsObjKeys.length * 1; i++) {
    const empId = empDepartmentsObjKeys[i];

    results.push({
      id: empId,
      date: { day: day, month: month, year: year }
    });
    const chart_data = loadPerformance({id: empId, date: `${year}-${month}-${day}`});
    if (chart_data !== false) charts[empId] = chart_data;
  }

  let ppohMasterArr = [];
  Object.keys(charts).map((worker_id) => {
      const worker_obj = charts[worker_id]
      const worker = worker_obj.employeeName
      if (true || Object.keys(charts[worker_id]).length !== 0){
        let departments = charts[worker_id].series.map((department, d_i) => department)
        if (departments.filter(a => a.label === 'Press').length > 0 && departments.length > 1){
          let pieces = worker_obj.pieces || '';
          let ppoh = worker_obj.ppoh || '';
          let goal = worker_obj.goal ||'';
          let efficiency = worker_obj.efficiency || '';
          let hours = '';
          let value = '';
          if (empTargetObj[worker]) goal = empTargetObj[worker];
          if (worker_obj.ppoh){
            ppoh = worker_obj.ppoh
          }
          if (pieces && ppoh){
            hours = (pieces / ppoh).toFixed(2);
          }
          if (Object.keys(dataProductionPPOH).indexOf(worker) != -1){
            // adding data from production ppoh tab
            pieces = dataProductionPPOH[worker].pieces;
            value = dataProductionPPOH[worker].value;
            hours = dataProductionPPOH[worker].hours;
            ppoh = dataProductionPPOH[worker].ppoh;
          }

          if (goal !== '' && ppoh !== ''){
            efficiency = (Number(ppoh) / Number(goal)) * 100;
            efficiency = efficiency.toFixed(2);
          }
          
          ppohMasterArr.push([
            worker_id, // id
            date, // date
            charts[worker_id].employeeName, // name
            'Press', // departments
            pieces, // pieces
            value, // value
            hours, // hours
            ppoh, // ppoh
            goal, // goal
            ppoh && goal ? ppoh - goal : '',
            efficiency, // efficiency
            '', // notes
          ])
        }
        else{
          charts[worker_id].series.map(department => {
            let pieces = department.total;
            let hours = (department.points.filter(item => item.length > 1 && item[1] > 0).length * 0.25).toFixed(2) || '';
            let value = '';
            let ppoh = '';
            let goal = '';
            let efficiency = '';
            let department_name = department.label.replace(/\s*\d+(?:\.\d+)?\s*$/, '').trim() == 'Press' ? (empDepartmentsObj[worker] || department.label) : department.label.replace(/\s*\d+(?:\.\d+)?\s*$/, '').trim();
            if (Object.keys(dataProductionPPOH).indexOf(worker) != -1){
              // adding data from production ppoh tab
              pieces = dataProductionPPOH[worker].pieces;
              value = dataProductionPPOH[worker].value;
              hours = dataProductionPPOH[worker].hours;
              ppoh = dataProductionPPOH[worker].ppoh;
              goal = dataProductionPPOH[worker].goal;
              if (empTargetObj[worker]){
                goal = empTargetObj[worker];
              }
            }

            // CALCULATE PPOH FOR INSPECT AND DETAIL DEPARTMENTS IF NO PPOH
            if (ppoh === '' && ['inspect', 'detail'].indexOf(department_name.toLowerCase()) != -1){
              if (department_name.toLowerCase() == 'detail' && empTargetDetailObj[worker]){
                goal = empTargetDetailObj[worker];
                ppoh = Number((Number(pieces) / Number(hours)).toFixed(2));
              }
              if (department_name.toLowerCase() == 'inspect' && empTargetInspectObj[worker]){
                goal = empTargetInspectObj[worker];
                ppoh = Number((Number(pieces) / Number(hours)).toFixed(2));
              }
            }

            if (goal !== '' && ppoh !== ''){
              efficiency = (Number(ppoh) / Number(goal)) * 100;
              efficiency = efficiency.toFixed(2);
            }

            ppohMasterArr.push([
              worker_id, // id
              date, // date
              charts[worker_id].employeeName, // name
              department_name, // department
              pieces, // pieces
              value, // value
              hours, // hours
              ppoh, // ppoh
              goal, // goal
              ppoh && goal ? ppoh - goal : '',
              efficiency, // efficiency
              '', // notes
            ])
          })
        }
      }
  })
  ppohMasterArr.sort((a, b) => 
    (new Date(a[1]) - new Date(b[1])) || String(a[3]).localeCompare(String(b[3]))
  )
  return ppohMasterArr
}

const getProductionPPOHData = (month, day, year) => {
  // returns an object for the date 
  // { userid: [
  //   'user',
  //   'pieces',
  //   'value',
  //   'hours',
  //   'ppoh',
  //   'goal',
  //   'efficiency' ]}
  let result = {};
  if (!month) month = new Date().getMonth() + 1
  if (!day) day = new Date().getDate()
  if (!year) year = new Date().getFullYear()
  const date = new Date(year, month - 1, day);
  let empDepartmentsObj = getEmployeesDepartmentsObject();
  let empTargetObj = getEmployeesTargetObject();
  Logger.log(`getProductionPPOHData for ${date}`)
  let url = `https://helenascleaners.smrtapp.com/api/general/reports/load/pressingPPOH?start=${year}-${month}-${day}&end=${year}-${month}-${day}&itemTypes=`
  const response = sendURLFetch(url)
  const html = JSON.parse(response.getContentText());
  try{
    let columns = html.params.columns;
    columns = columns.map(el => el.field.toLowerCase())
    // columns.unshift('userid')
    let values = html.params.values;
    values.map(row => Object.keys(row).map(el => row[el.toLowerCase()] = row[el]))
    // values.map(row => {
    //   result[row['userid']] = (columns.map(column => {
    //     return row[column]
    //   }))
    // })
// 
    values.map(row => {
      result[row['userid']] = row;
    })
// 
  }
  catch(e) {
    console.log(e)
  }
  return result
}


const sendURLFetch = (url) => {
  const cookie = smrtLoginGetCookie();
  const options = {
    method: "get",
    headers: {
      "accept": "text/html",
      "x-requested-with": "smrt-fetch",
      "x-smrt-request-queue": "general",
      "x-smrt-rid": "-OnjIoerJBrGLVefP5dA",
      "cookie": cookie
    },
    muteHttpExceptions: true
  };
  return UrlFetchApp.fetch(url, options);
}