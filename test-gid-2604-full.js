
const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const gid = '260412826';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}`;

async function testGid2604Full() {
  try {
    const response = await fetch(url);
    const text = await response.text();
    const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
    if (!match) return;
    const json = JSON.parse(match[1]);
    console.log('GID 260412826 rows:');
    json.table.rows.forEach((row, i) => {
      const date = row.c[3]?.v;
      if (date) console.log(`Row ${i} Date:`, date);
    });
  } catch (e) {
    console.error(e);
  }
}

testGid2604Full();
