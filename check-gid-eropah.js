
async function searchJordanInGid(gid) {
  const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}`;
  
  const response = await fetch(url);
  const text = await response.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
  if (!match) return;
  const json = JSON.parse(match[1]);
  
  json.table.rows.forEach((row, i) => {
    const cells = row.c ? row.c.map(c => c ? (c.f || c.v) : null) : [];
    const rowStr = JSON.stringify(cells);
    if (rowStr.toUpperCase().includes('JORDAN') || rowStr.toUpperCase().includes('AQSA')) {
      console.log(`GID ${gid} Row ${i}: ${rowStr}`);
    }
  });
}

searchJordanInGid('260412826');
