
async function findGids() {
  const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;
  
  const response = await fetch(url);
  const text = await response.text();
  
  const re = /"gid":\s*"(\d+)"/g;
  let match;
  const gids = new Set();
  while ((match = re.exec(text)) !== null) {
    gids.add(match[1]);
  }
  
  // Also look for [0,"Sheet Name",,,12345]
  const re2 = /\[\d+,"([^"]+)",,,(\d+)\]/g;
  while ((match = re2.exec(text)) !== null) {
    console.log(`Found Sheet: ${match[1]} (GID: ${match[2]})`);
    gids.add(match[2]);
  }
  
  console.log("All unique GIDs found:", Array.from(gids).join(', '));
  
  for (const gid of gids) {
    if (gid === '0') continue;
    const res = await fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}`);
    const t = await res.text();
    const m = t.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
    if (m) {
      const j = JSON.parse(m[1]);
      const firstRow = j.table.rows[0];
      const content = firstRow ? firstRow.c.map(c => c ? (c.f || c.v) : null).join(' | ') : 'empty';
      console.log(`GID ${gid} | First Row: ${content.substring(0, 100)}`);
    }
  }
}

findGids();
