
const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;

async function findJordanGid() {
  const response = await fetch(url);
  const html = await response.text();
  
  // Try various regex patterns
  const patterns = [
    /"name":"JORDAN & AQSA","gid":"(\d+)"/i,
    /"gid":"(\d+)","name":"JORDAN & AQSA"/i,
    /JORDAN & AQSA.*?gid=(\d+)/i,
    /gid=(\d+).*?JORDAN & AQSA/i,
    /"name":"PALESTIN,JORDAN & AQSA","gid":"(\d+)"/i
  ];
  
  for (const p of patterns) {
    const match = html.match(p);
    if (match) {
      console.log(`Found GID with pattern ${p}: ${match[1] || match[2]}`);
    }
  }
  
  // If still not found, print snippets around "JORDAN"
  const idx = html.indexOf('JORDAN & AQSA');
  if (idx !== -1) {
    console.log("Snippet around 'JORDAN & AQSA':", html.substring(idx - 200, idx + 200));
  }
}

findJordanGid();
