
async function checkSpecificGid(gid) {
  const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}`;
  
  try {
    const response = await fetch(url);
    const text = await response.text();
    const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
    if (!match) return;
    const json = JSON.parse(match[1]);
    console.log(`--- GID ${gid} ---`);
    json.table.rows.slice(0, 20).forEach((row, i) => {
      const cells = row.c ? row.c.map(c => c ? (c.f || c.v) : null) : [];
      console.log(`Row ${i}: ${JSON.stringify(cells)}`);
    });
  } catch (e) {}
}

checkSpecificGid('1159334547');
