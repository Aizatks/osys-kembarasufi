
const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const gid = '1685996596';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}`;

async function testGidWestEurope() {
  try {
    const response = await fetch(url);
    const text = await response.text();
    const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
    if (!match) return;
    const json = JSON.parse(match[1]);
    console.log('GID 1685996596 (West Europe) first 25 rows:');
    json.table.rows.slice(0, 25).forEach((row, i) => {
      console.log(`Row ${i}:`, row.c?.map(c => c?.v));
    });
  } catch (e) {
    console.error(e);
  }
}

testGidWestEurope();
