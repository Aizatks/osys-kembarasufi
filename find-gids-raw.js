
const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;

async function findGids() {
  const response = await fetch(url);
  const html = await response.text();
  
  // Look for the JSON data that contains the sheet metadata
  const match = html.match(/bootstrapData\s*=\s*({.+?});/);
  if (match) {
    const data = JSON.parse(match[1]);
    const sheets = data.changes.changes[0][1]; // This path might vary, but let's try to find it
    // Actually, it's easier to just regex for the pattern {"name":"...","gid":"..."}
    const sheetMatches = html.matchAll(/\{"name":"([^"]+)","gid":"(\d+)"/g);
    for (const m of sheetMatches) {
      console.log(`Name: ${m[1]} | GID: ${m[2]}`);
    }
  } else {
    // Try another way - look for the script tags
    const sheetMatches = html.matchAll(/\{"name":"([^"]+)","gid":"(\d+)"/g);
    let found = false;
    for (const m of sheetMatches) {
      console.log(`Name: ${m[1]} | GID: ${m[2]}`);
      found = true;
    }
    if (!found) {
      console.log("No sheets found via regex. Printing a snippet of HTML around first 'gid'...");
      const gidIdx = html.indexOf('"gid"');
      if (gidIdx !== -1) {
        console.log(html.substring(gidIdx, gidIdx + 500));
      } else {
        console.log("No 'gid' found in HTML.");
      }
    }
  }
}

findGids();
