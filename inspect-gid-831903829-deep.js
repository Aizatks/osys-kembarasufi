
const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const gid = '831903829';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}`;

async function inspectGid() {
  try {
    const response = await fetch(url);
    const text = await response.text();
    const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
    if (!match) return;
    const json = JSON.parse(match[1]);
    console.log(`GID ${gid} - Rows 50 to 150:`);
    json.table.rows.slice(50, 150).forEach((row, i) => {
      const rowContent = row.c.map((c, colIdx) => `[${colIdx}]${c?.v || ''}`).join(' | ');
      if (rowContent.trim()) {
        console.log(`Row ${i + 50}: ${rowContent}`);
      }
    });
  } catch (e) {
    console.error(e);
  }
}

inspectGid();
