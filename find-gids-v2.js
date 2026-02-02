
const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;

async function findGids() {
  const response = await fetch(url);
  const html = await response.text();
  
  console.log("Searching for sheet names and GIDs...");
  const sheetMatches = html.matchAll(/\{"name":"([^"]+)","gid":"(\d+)"/g);
  let found = false;
  for (const m of sheetMatches) {
    console.log(`Name: ${m[1]} | GID: ${m[2]}`);
    found = true;
  }
  
  if (!found) {
    // Try searching for the names in the HTML and see what's near them
    console.log("No sheets found via simple regex. Searching for 'JORDAN' or 'AQSA' context...");
    const searchTerms = ['JORDAN', 'AQSA', 'PALESTIN'];
    for (const term of searchTerms) {
      const idx = html.indexOf(term);
      if (idx !== -1) {
        console.log(`Found '${term}' at index ${idx}. Snippet: ${html.substring(idx - 50, idx + 150)}`);
      }
    }
  }
}

findGids();
