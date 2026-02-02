const fs = require('fs');
const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const gids = fs.readFileSync('gids.txt', 'utf8').split('\n').filter(Boolean);

async function checkGid(gid) {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}`;
    const res = await fetch(url);
    const text = await res.text();
    const dateMatches = text.match(/\d{1,2}\s*(jan|feb|mac|mar|apr|may|mei|jun|jul|aug|ogo|sep|okt|nov|dis|dec)/ig);
    if (dateMatches && dateMatches.length > 5) {
       console.log(`GID ${gid} has ${dateMatches.length} dates.`);
       const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
       if (match) {
         const json = JSON.parse(match[1]);
         const firstFew = json.table.rows.slice(0, 3).map(r => r.c.map(c => c?.v).join('|')).join(' \n ');
         console.log(`  Preview: ${firstFew}`);
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
