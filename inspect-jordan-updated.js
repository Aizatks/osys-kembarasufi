
const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const GID = '831903829';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${GID}`;

async function inspect() {
  const response = await fetch(url);
  const text = await response.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
  const json = JSON.parse(match[1]);
  
  console.log('Columns:');
  json.table.cols.forEach((col, i) => {
    console.log(`${i}: ${col.label}`);
  });
  
  console.log('\nRows (first 100):');
  json.table.rows.slice(0, 100).forEach((row, i) => {
    const values = row.c.map(cell => cell ? (cell.f || cell.v) : '');
    console.log(`${i}: ${values.join(' | ')}`);
  });
}

inspect();
