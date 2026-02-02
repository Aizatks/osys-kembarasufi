const fs = require('fs');
const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const gids = fs.readFileSync('gids.txt', 'utf8').split('\n').filter(Boolean);

async function checkGid(gid) {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}`;
    const res = await fetch(url);
    const text = await res.text();
    if (text.includes('11 HARI 8 MALAM')) {
       console.log(`Found "11 HARI 8 MALAM" in GID ${gid}`);
    }
  } catch (e) {}
}

async function run() {
  for (const gid of gids) {
    await checkGid(gid);
  }
}
run();
