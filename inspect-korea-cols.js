
const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

async function test() {
  const response = await fetch(url);
  const text = await response.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
  const json = JSON.parse(match[1]);
  
  const row = json.table.rows[14];
  row.c.forEach((cell, idx) => {
    console.log(`Col ${idx}: ${cell?.v}`);
  });
}

test();
