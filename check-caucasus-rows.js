
const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

async function test() {
  const res = await fetch(url);
  const text = await res.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
  const json = JSON.parse(match[1]);
  const rows = json.table.rows;
  
  rows.forEach((row, i) => {
    const cells = row.c;
    if (cells && cells[1] && String(cells[1].v).includes('CAUCASUS')) {
      console.log(`Row ${i}:`, cells.map((c, ci) => `[${ci}] ${c ? c.v : 'null'}`).join(' | '));
    }
  });
}

test();
