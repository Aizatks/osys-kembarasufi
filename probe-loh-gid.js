
const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const GID = '1940566849';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${GID}`;

async function probe() {
  const response = await fetch(url);
  const text = await response.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
  const json = JSON.parse(match[1]);
  
  json.table.rows.forEach((row, i) => {
    const cells = row.c;
    const date = cells && cells[2] ? cells[2].v : null;
    const name = cells && cells[1] ? cells[1].v : null;
    if (name || date) {
      console.log(`Row ${i}: Name=${name}, Date=${date}`);
    }
  });
}

probe();
