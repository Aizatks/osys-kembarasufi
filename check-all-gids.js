const fs = require('fs');
const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const gids = fs.readFileSync('gids.txt', 'utf8').split('\n').filter(Boolean);

async function checkGid(gid) {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}`;
    const res = await fetch(url);
    const text = await res.text();
    if (text.includes('12 APR') || text.includes('JAN -') || text.includes('FEB -')) {
       const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
       if (match) {
         const json = JSON.parse(match[1]);
         const content = json.table.rows.slice(0, 3).map(r => r.c.map(c => c?.v).join('|')).join(' \n ');
         console.log(`GID ${gid} might contain dates:\n${content}`);
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
