
async function inspectMainSheetDeep() {
  const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
  const GID = '0';
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${GID}`;
  
  const response = await fetch(url);
  const text = await response.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
  const json = JSON.parse(match[1]);
  
  console.log(`Main Sheet Deep Inspection (Rows 63-500):`);
  json.table.rows.slice(63, 500).forEach((row, i) => {
    const cells = row.c ? row.c.map(c => c ? (c.f || c.v) : null) : [];
    const rowStr = JSON.stringify(cells);
    if (rowStr.toUpperCase().includes('JORDAN') || rowStr.toUpperCase().includes('AQSA') || /\d+\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OKT|NOV|DIS)/i.test(rowStr)) {
      console.log(`Row ${i + 63}: ${rowStr}`);
    }
  });
}

inspectMainSheetDeep();
