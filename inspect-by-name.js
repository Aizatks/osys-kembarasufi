
const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const sheetName = 'JORDAN & AQSA'; // Trying common variations
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;

async function inspect() {
  console.log(`Trying sheet name: ${sheetName}`);
  const response = await fetch(url);
  const text = await response.text();
  if (text.includes('google.visualization.Query.setResponse')) {
    const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
    const json = JSON.parse(match[1]);
    if (json.status === 'error') {
      console.log('Error:', json.errors[0].detailed_message);
    } else {
      console.log('Success! Columns:');
      json.table.cols.forEach((col, i) => console.log(`${i}: ${col.label}`));
      console.log('\nRows (first 10):');
      json.table.rows.slice(0, 10).forEach((row, i) => {
        const values = row.c.map(cell => cell ? (cell.f || cell.v) : '');
        console.log(`${i}: ${values.join(' | ')}`);
      });
    }
  } else {
    console.log('Could not find response JSON');
  }
}

inspect();
