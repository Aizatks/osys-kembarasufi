
const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;

async function findGids() {
  const response = await fetch(url);
  const html = await response.text();
  
  const searchTerms = ['JORDAN', 'AQSA', 'PALESTIN'];
  for (const term of searchTerms) {
    const termIdx = html.indexOf(term);
    if (termIdx !== -1) {
      console.log(`\nFound '${term}' at index ${termIdx}`);
      // Look for "gid":"..." near this index
      const start = Math.max(0, termIdx - 2000);
      const end = Math.min(html.length, termIdx + 2000);
      const snippet = html.substring(start, end);
      
      const gidMatches = snippet.matchAll(/"gid":"(\d+)"/g);
      for (const m of gidMatches) {
        console.log(`Possible GID near ${term}: ${m[1]}`);
      }
      
      const nameMatches = snippet.matchAll(/"name":"([^"]+)"/g);
      for (const m of nameMatches) {
        console.log(`Possible Name near ${term}: ${m[1]}`);
      }
    }
  }
}

findGids();
