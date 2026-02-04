
async function inspectGid(gid, rowsCount = 500) {
  const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}`;
  
  try {
    const response = await fetch(url);
    const text = await response.text();
    const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
    if (!match) return;
    const json = JSON.parse(match[1]);
    console.log(`--- GID ${gid} ---`);
    json.table.rows.slice(0, rowsCount).forEach((row, i) => {
      const cells = row.c ? row.c.map(c => c ? (c.f || c.v) : null) : [];
      const rowStr = JSON.stringify(cells);
      if (rowStr.toUpperCase().includes('JORDAN') || rowStr.toUpperCase().includes('AQSA')) {
        console.log(`Row ${i}: ${rowStr}`);
      }
    });
  } catch (e) {}
}

async function run() {
  const gids = ['1836266947', '511623951', '643644940', '1940566849', '46277800', '1685996596'];
  for (const gid of gids) {
    await inspectGid(gid);
  }
}

run();
