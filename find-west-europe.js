const fs = require('fs');
const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const gids = fs.readFileSync('gids.txt', 'utf8').split('\n').filter(Boolean);

async function checkGid(gid) {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}`;
    const res = await fetch(url);
    const text = await res.text();
    if (text.toLowerCase().includes('west europe')) {
       console.log(`Found "WEST EUROPE" in GID ${gid}`);
       // Check if it's the main sheet by looking for price patterns
       if (text.includes('9499') && text.includes('9299')) {
         console.log(`  -> This seems to be the main sheet.`);
       } else {
         console.log(`  -> This might be the date sheet!`);
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
