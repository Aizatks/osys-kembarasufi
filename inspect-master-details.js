
const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const GID = '0';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${GID}`;

async function inspectFirst20() {
  const response = await fetch(url);
  const text = await response.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
  const json = JSON.parse(match[1]);
  
  json.table.rows.slice(0, 20).forEach((row, i) => {
    console.log(`\nRow ${i}:`);
    row.c.forEach((cell, j) => {
      if (cell && (cell.v || cell.f)) {
        console.log(`  Col ${j}: v=${cell.v}, f=${cell.f}`);
      }
    });
  });
}

inspectFirst20();
