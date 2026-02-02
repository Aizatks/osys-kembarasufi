
const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;

async function findGids() {
  const response = await fetch(url);
  const html = await response.text();
  
  console.log("Searching for GIDs and names...");
  // Look for the "sheet_id" and "name" pattern in the HTML
  // Often looks like: {"sheet_id":12345,"name":"SheetName"}
  const matches = html.matchAll(/"sheet_id":(\d+),"name":"([^"]+)"/g);
  let found = false;
  for (const m of matches) {
    console.log(`GID: ${m[1]} | Name: ${m[2]}`);
    found = true;
  }
  
  if (!found) {
    // Try another pattern: {"name":"SheetName","gid":"12345"}
    const matches2 = html.matchAll(/"name":"([^"]+)","gid":"(\d+)"/g);
    for (const m of matches2) {
      console.log(`Name: ${m[1]} | GID: ${m[2]}`);
      found = true;
    }
  }
  
  if (!found) {
    // Try searching for JORDAN & AQSA text and see what's around it
    const term = "JORDAN & AQSA";
    const idx = html.indexOf(term);
    if (idx !== -1) {
      console.log(`Found '${term}' at ${idx}. Snippet: ${html.substring(idx - 100, idx + 200)}`);
    }
  }
}

findGids();
