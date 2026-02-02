
async function listSheets() {
  const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=0`;
  const response = await fetch(url);
  const text = await response.text();
  
  // Extract sheet names and GIDs from the HTML source
  const re = /"([^"]+)",,,(\d+)/g;
  let match;
  console.log("Sheets found:");
  while ((match = re.exec(text)) !== null) {
    console.log(`Name: ${match[1]}, GID: ${match[2]}`);
  }
}

listSheets();
