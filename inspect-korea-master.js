
const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

async function test() {
  const response = await fetch(url);
  const text = await response.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
  const json = JSON.parse(match[1]);
  
  json.table.rows.forEach((row, idx) => {
    const cells = row.c;
    if (cells && cells[1] && cells[1].v && cells[1].v.toString().toUpperCase().includes('KOREA')) {
      console.log(`Row ${idx}: ${cells[1].v} | Tip Cell (6): ${cells[6] ? cells[6].v : 'N/A'}`);
    }
  });
}

test();
