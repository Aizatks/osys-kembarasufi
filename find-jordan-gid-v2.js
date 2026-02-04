
const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const GID = '0';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${GID}`;

async function findJordanGid() {
  const response = await fetch(url);
  const text = await response.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
  const json = JSON.parse(match[1]);
  
  // Find row where Column 1 contains "JORDAN"
  const rowIdx = json.table.rows.findIndex(r => r.c[1]?.v?.toString().toUpperCase().includes('JORDAN'));
  
  if (rowIdx !== -1) {
    console.log(`Found JORDAN at Row ${rowIdx}:`);
    const row = json.table.rows[rowIdx];
    row.c.forEach((cell, i) => {
      console.log(`${i}: v=${cell?.v}, f=${cell?.f}`);
    });
  } else {
    console.log('Could not find JORDAN in Column 1');
  }
}

findJordanGid();
