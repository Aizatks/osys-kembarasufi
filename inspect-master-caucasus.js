
const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';

async function inspectMaster() {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;
  const response = await fetch(url);
  const text = await response.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
  if (!match) {
    console.log('No match');
    return;
  }
  const json = JSON.parse(match[1]);
  json.table.rows.forEach((r, i) => {
    const pkgName = r.c[1]?.v;
    if (pkgName && String(pkgName).toUpperCase().includes('CAUCASUS')) {
      console.log(`Row ${i}:`, r.c.map(cell => cell?.v));
    }
  });
}

inspectMaster();
