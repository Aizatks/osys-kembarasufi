
const fetch = require('node-fetch');

async function checkMainSheet() {
  const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

  try {
    const response = await fetch(url);
    const text = await response.text();
    const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
    if (!match) throw new Error('Invalid response format');
    const json = JSON.parse(match[1]);

    json.table.rows.forEach((row, i) => {
      const cells = row.c;
      if (!cells) return;
      const pkgName = cells[1]?.v;
      if (pkgName && typeof pkgName === 'string' && pkgName.includes('SPAIN')) {
        console.log(`Row ${i}: ${pkgName}`);
      }
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

checkMainSheet();
