
async function searchJordanInGidDeep(gid) {
  const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}`;
  
  const response = await fetch(url);
  const text = await response.text();
  
  if (text.toUpperCase().includes('JORDAN') || text.toUpperCase().includes('AQSA')) {
    console.log(`GID ${gid} contains JORDAN or AQSA`);
    // Find where it is
    const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
    const json = JSON.parse(match[1]);
    json.table.rows.forEach((row, i) => {
      const rowStr = JSON.stringify(row.c).toUpperCase();
      if (rowStr.includes('JORDAN') || rowStr.includes('AQSA')) {
        console.log(`Row ${i}: ${JSON.stringify(row.c.map(c => c?.v))}`);
      }
    });
  } else {
    console.log(`GID ${gid} does NOT contain JORDAN or AQSA`);
  }
}

searchJordanInGidDeep('831903829');
