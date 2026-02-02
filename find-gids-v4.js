
const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;

async function findAllGids() {
  const response = await fetch(url);
  const html = await response.text();
  
  console.log("All unique GIDs found in HTML:");
  const matches = html.matchAll(/"gid":"(\d+)"/g);
  const gids = new Set();
  for (const m of matches) {
    gids.add(m[1]);
  }
  console.log(Array.from(gids).join(', '));
  
  // Also look for names and gids together in a different format
  const matches2 = html.matchAll(/,"(\d+)",\[\["([^"]+)"/g);
  for (const m of matches2) {
    console.log(`Potential Mapping: GID ${m[1]} -> Name ${m[2]}`);
  }
}

findAllGids();
