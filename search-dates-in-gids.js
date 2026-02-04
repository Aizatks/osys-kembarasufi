
async function searchDatesInGid(gid) {
  const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}`;
  
  const response = await fetch(url);
  const text = await response.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
  if (!match) return;
  const json = JSON.parse(match[1]);
  
  json.table.rows.forEach((row, i) => {
    const cells = row.c ? row.c.map(c => c ? (c.f || c.v) : null) : [];
    const dateCandidate = cells[3]; // Column D
    if (dateCandidate && typeof dateCandidate === 'string' && /\d{1,2}\s*(JAN|FEB|MAC|MAR|APR|MAY|MEI|JUN|JUL|AUG|OGO|SEP|OKT|NOV|DIS|DEC)/i.test(dateCandidate)) {
      console.log(`GID ${gid} Row ${i} Column D: ${dateCandidate}`);
      console.log(`Full Row: ${JSON.stringify(cells)}`);
    }
  });
}

const gids = ['1159336148', '831903829', '527228455', '1836266947', '260412826', '1685996596'];
for (const gid of gids) {
  searchDatesInGid(gid);
}
