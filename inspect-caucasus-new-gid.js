
const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const GID = '1341151525';

async function inspect() {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${GID}`;
  const response = await fetch(url);
  const text = await response.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
  if (!match) {
    console.log('No match');
    return;
  }
  const json = JSON.parse(match[1]);
  console.log('Cols:', json.table.cols.map((c, i) => ({ i, label: c.label })));
  console.log('First 5 rows:');
  json.table.rows.slice(0, 10).forEach((r, i) => {
    console.log(`Row ${i}:`, r.c.map(cell => cell?.v));
  });
}

inspect();
