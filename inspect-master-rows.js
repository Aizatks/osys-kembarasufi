
const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

async function test() {
  const response = await fetch(url);
  const text = await response.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
  const json = JSON.parse(match[1]);
  
  json.table.rows.slice(10, 30).forEach((row, idx) => {
    const cells = row.c;
    const realIdx = idx + 10;
    console.log(`Row ${realIdx}: ${cells[1]?.v || 'Empty'}`);
  });
}

test();
