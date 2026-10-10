const getBearer = () => getAPIKeyProperty()

const getURL = () => 'https://helenascleaners.smrtapp.com/graphql';

const sendQuery = (payload) => {
  const url = getURL();
  const apiKey = getBearer();

  const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        Authorization: 'Bearer ' + apiKey
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

  return JSON.parse(response.getContentText());
}

const getSS = () => SS ? SS : SpreadsheetApp.getActiveSpreadsheet();

const showLoader = (SH, row, column, width, height) => {
  
}

const makeYYYYMMDD = (value) => {
   if (!value) return "";

  if (Object.prototype.toString.call(value) === "[object Date]") {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const [m, d, y] = value.split('/');
  return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
}

const ymdToMDY = (ymd) => {
  if (!ymd) return "";

  const [y, m, d] = ymd.split('-');
  return `${Number(m)}/${Number(d)}/${y}`;
};

function getLastMonday(today = new Date()) {
  const day = today.getDay(); 
  const diff = (day === 0 ? 6 : day - 1);
  const lastMonday = new Date(today);
  lastMonday.setDate(today.getDate() - diff);
  lastMonday.setHours(0, 0, 0, 0);
  return lastMonday;
}

function weekDaysArray() {
  return [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ]
}

const calcAverage = (arr, idx) => {
  const nums = arr.map(el => Number(el[idx])).filter(v => !isNaN(v));
  if (nums.length === 0) return 0;
  return Number((nums.reduce((s, v) => s + v, 0) / nums.length).toFixed(2));
};


function removeDuplicateRows(rows) {
  const seen = new Set();

  return rows.filter(row => {
    const key = JSON.stringify(row);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}


const SMRT_API_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2hlbGVuYXNjbGVhbmVycy5zbXJ0YXBwLmNvbSIsImlhdCI6MTc2NzgxMzM5MCwic3ViIjoiYWRtaW4ifQ.NbGbNnrvA-XgnbLvfnx1Ka-cMc_gzbddNc2j5FmKryY'