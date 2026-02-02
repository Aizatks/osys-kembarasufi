
const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const gid = '1940566849';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}`;

async function inspectCikguLoh() {
  try {
    const response = await fetch(url);
    const text = await response.text();
    const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
    if (!match) return;
    const json = JSON.parse(match[1]);
    console.log('GID 1940566849 - First 150 rows:');
    json.table.rows.slice(0, 150).forEach((row, i) => {
      const rowContent = row.c.map(c => c?.v || '').join(' | ');
      if (rowContent.trim()) {
        console.log(`Row ${i}: ${rowContent}`);
      }
    });
  } catch (e) {
    console.error(e);
  }
}

inspectCikguLoh();
