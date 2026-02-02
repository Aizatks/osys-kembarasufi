
const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;

async function listSheets() {
  try {
    const response = await fetch(url);
    const text = await response.text();
    // GIDs are usually in the format "gid": "12345" or in the URL hash
    // But better to use the tq endpoint to see if we can get sheet names
    
    // Actually, let's just try to find the GID in the source
    const gids = text.match(/"gid":"(\d+)"/g);
    const names = text.match(/"name":"([^"]+)"/g);
    
    console.log('Found GIDs and Names:');
    if (gids && names) {
      gids.forEach((gid, i) => {
        if (names[i]) {
          console.log(`${names[i]} -> ${gid}`);
        }
      });
    }
  } catch (e) {
    console.error(e);
  }
}

listSheets();
