
async function fetchGid() {
  const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
  const GID = '831903829';
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${GID}`;
  
  try {
    const response = await fetch(url);
    const text = await response.text();
    const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
    if (!match) {
      console.log("No match found for GID " + GID);
      return;
    }
    const json = JSON.parse(match[1]);
    json.table.rows.forEach((row, i) => {
      const cells = row.c ? row.c.map(c => c ? (c.f || c.v) : null) : [];
      console.log(`Row ${i}:`, JSON.stringify(cells));
    });
  } catch (e) {
    console.error(e);
  }
}

fetchGid();
