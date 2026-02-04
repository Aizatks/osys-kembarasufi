
const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const GID = '831903829'; 
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${GID}`;

async function inspectRow11() {
  const response = await fetch(url);
  const text = await response.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
  const json = JSON.parse(match[1]);
  
  const row = json.table.rows[11];
  if (row) {
    console.log('Master List Row 11 Details:');
    row.c.forEach((cell, i) => {
      console.log(`${i}: v=${cell?.v}, f=${cell?.f}`);
    });
  } else {
    console.log('No row 11 found');
  }
}

inspectRow11();
