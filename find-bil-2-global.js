const fs = require('fs');
const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const gids = fs.readFileSync('gids.txt', 'utf8').split('\n').filter(Boolean);

async function checkGid(gid) {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}`;
    const res = await fetch(url);
    const text = await res.text();
    if (text.includes('"2"') || text.includes('|2|')) {
       const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
       if (match) {
         const json = JSON.parse(match[1]);
         json.table.rows.forEach((row, idx) => {
           if (row.c[1]?.v === 2) {
             console.log(`Found BIL 2 in GID ${gid} at row ${idx}`);
           }
         });
       }
    }
  } catch (e) {}
}

async function run() {
  for (const gid of gids) {
    await checkGid(gid);
  }
}
run();
