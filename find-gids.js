const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;

fetch(url)
  .then(res => res.text())
  .then(html => {
    // Regex to find sheet names and gids
    // Format is often {"name":"SheetName","gid":"12345"}
    const matches = html.matchAll(/"name":"([^"]+)","gid":"(\d+)"/g);
    const results = [];
    for (const match of matches) {
      results.push({ name: match[1], gid: match[2] });
    }
    
    // Also try another pattern
    const matches2 = html.matchAll(/"gid":"(\d+)","name":"([^"]+)"/g);
    for (const match of matches2) {
      results.push({ name: match[2], gid: match[1] });
    }

    if (results.length === 0) {
      // Try to find the section where sheet names are listed
      console.log("No specific matches found. Searching for general GIDs...");
      const gids = html.match(/"gid":"(\d+)"/g);
      console.log(gids ? gids.join(', ') : "None");
    } else {
      results.forEach(r => console.log(`Name: ${r.name} | GID: ${r.gid}`));
    }
  });
