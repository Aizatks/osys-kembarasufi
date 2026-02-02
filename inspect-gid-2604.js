
const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const gid = '260412826';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}`;

async function inspectGid2604() {
  try {
    const response = await fetch(url);
    const text = await response.text();
    const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
    if (!match) return;
    const json = JSON.parse(match[1]);
    console.log('GID 260412826 - All columns labels:');
    console.log(json.table.cols.map(c => c.label));
    console.log('GID 260412826 - First 50 rows, checking all columns for dates:');
    json.table.rows.forEach((row, i) => {
      const rowData = row.c.map((c, j) => ({ col: j, val: c?.v }));
      const dateCols = rowData.filter(d => d.val && String(d.val).match(/\d{1,2}\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC|MEI|MAC|OGO|OKT|DIS)/i));
      if (dateCols.length > 0) {
        console.log(`Row ${i} found dates:`, dateCols);
      }
    });
  } catch (e) {
    console.error(e);
  }
}

inspectGid2604();
