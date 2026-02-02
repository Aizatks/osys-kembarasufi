const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const GID = '2090089036'; // Master sheet

async function checkDuration() {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${GID}`;
  
  const response = await fetch(url);
  const text = await response.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
  const json = JSON.parse(match[1]);
  
  // Print columns header
  console.log('=== COLUMNS ===');
  json.table.cols.forEach((col, idx) => {
    console.log(`Col ${idx}: ${col.label}`);
  });
  
  console.log('\n=== FIRST 5 ROWS ===');
  for (let i = 0; i < 5 && i < json.table.rows.length; i++) {
    const row = json.table.rows[i];
    const cells = row.c;
    const vals = [];
    for (let j = 0; j < 10; j++) {
      const cell = cells[j];
      vals.push(cell?.v || '');
    }
    console.log(`Row ${i}: ${vals.join(' | ')}`);
  }
}

checkDuration().catch(console.error);
