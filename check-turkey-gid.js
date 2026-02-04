
async function checkTurkeyGid() {
  const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
  const GID = '46277800'; // Turkey GID from sheets.ts
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${GID}`;
  
  const response = await fetch(url);
  const text = await response.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
  const json = JSON.parse(match[1]);
  
  console.log(`GID ${GID} - First 10 rows:`);
  json.table.rows.slice(0, 10).forEach((row, i) => {
    const cells = row.c.map(c => c ? (c.f || c.v) : null);
    console.log(`Row ${i}:`, JSON.stringify(cells));
  });
}

checkTurkeyGid();
