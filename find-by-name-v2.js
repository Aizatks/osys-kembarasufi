
const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const names = ['JORDAN', 'JORDAN AQSA', 'AQSA', 'PALESTIN', 'JORDAN & AQSA', 'JORDAN, PALESTIN & AQSA'];

async function findSheetByName() {
  for (const name of names) {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(name)}`;
    console.log(`Trying: ${name}`);
    const res = await fetch(url);
    const text = await res.text();
    if (text.includes('google.visualization.Query.setResponse')) {
      const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
      const json = JSON.parse(match[1]);
      if (json.status !== 'error') {
        console.log(`SUCCESS for ${name}! First row:`);
        const firstRow = json.table.rows[0]?.c.map(c => c?.v || '-').join(' | ');
        console.log(firstRow);
        // Check if Col 3 has a date pattern
        const col3 = json.table.rows[1]?.c[3]?.v;
        console.log(`Col 3 (Index 3): ${col3}`);
      } else {
        console.log(`Error for ${name}: ${json.errors[0].detailed_message}`);
      }
    }
  }
}

findSheetByName();
