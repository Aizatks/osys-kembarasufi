
async function findCorrectGid() {
  const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;
  
  const response = await fetch(url);
  const html = await response.text();
  
  // Look for "JORDAN" or "AQSA" and see if there's a GID nearby
  // In Google Sheets HTML, sheet names and GIDs are often in a JSON structure like:
  // [,"Sheet Name",,,123456789]
  const re = /\[\d+,"([^"]+)",,,(\d+)\]/g;
  let match;
  console.log("Found Sheets:");
  while ((match = re.exec(html)) !== null) {
    console.log(`Name: ${match[1]}, GID: ${match[2]}`);
    if (match[1].toUpperCase().includes('JORDAN') || match[1].toUpperCase().includes('AQSA')) {
      console.log(`>>> POTENTIAL MATCH: ${match[1]} -> ${match[2]}`);
    }
  }
  
  // Try another pattern
  const re2 = /"([^"]+)":\{"sheetId":(\d+)/g;
  while ((match = re2.exec(html)) !== null) {
    console.log(`Pattern 2 Match: Name: ${match[1]}, GID: ${match[2]}`);
  }
}

findCorrectGid();
