
async function checkGid(gid) {
  const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}`;
  
  const response = await fetch(url);
  const text = await response.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
  if (!match) return null;
  const json = JSON.parse(match[1]);
  return json.table.rows;
}

async function probeGids() {
  const gids = ['1940566849', '831903829', '1159336148', '527228455', '1836266947'];
  for (const gid of gids) {
    const rows = await checkGid(gid);
    if (rows && rows.length > 0) {
      console.log(`--- GID ${gid} ---`);
      rows.slice(0, 10).forEach((row, i) => {
        const cells = row.c ? row.c.map(c => c ? (c.f || c.v) : null) : [];
        console.log(`Row ${i}:`, JSON.stringify(cells));
      });
    }
  }
}

probeGids();
