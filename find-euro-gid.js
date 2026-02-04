const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;

fetch(url)
  .then(res => res.text())
  .then(html => {
    // Look for bootstrap data which contains sheet names and gids
    const match = html.match(/bootstrapData\s*=\s*({.+?});/);
    if (match) {
      const data = JSON.parse(match[1]);
      const sheets = data.changesummary.sheetIdToName;
      for (const [id, name] of Object.entries(sheets)) {
        console.log(`GID: ${id} | Name: ${name}`);
      }
    } else {
      // Fallback: regex for gids in the HTML
      const gids = html.match(/"gid":\s*"(\d+)"/g);
      console.log("Found GIDs: " + (gids ? gids.join(', ') : 'none'));
    }
  });
