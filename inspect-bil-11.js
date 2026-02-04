
const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const GID = '0';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${GID}`;

async function inspectRow11() {
  const response = await fetch(url);
  const text = await response.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
  const json = JSON.parse(match[1]);
  
  const row = json.table.rows[11]; // Index 11 is Bil 11? Or row 11?
  // Let's find the row where Bil is 11
  const bil11Row = json.table.rows.find(r => r.c[0]?.v == 11);
  
  if (bil11Row) {
    console.log('Row with BIL 11:');
    bil11Row.c.forEach((cell, i) => {
      console.log(`${i}: v=${cell?.v}, f=${cell?.f}`);
    });
  } else {
    console.log('Could not find BIL 11');
  }
}

inspectRow11();
