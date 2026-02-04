
const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

async function listSheets() {
  try {
    const response = await fetch(url);
    const text = await response.text();
    const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
    if (!match) return;
    const json = JSON.parse(match[1]);
    console.log('Columns:', json.table.cols.map(c => c.label));
    
    // To get all sheet names, we need a different approach or just check the ones we have.
    // Actually gviz doesn't give sheet names easily without specific gid.
    // But we can try to find them by trial and error or looking at the spreadsheet.
  } catch (e) {
    console.error(e);
  }
}

listSheets();
