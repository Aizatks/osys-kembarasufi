const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

fetch(url)
  .then(res => res.text())
  .then(text => {
    // This only gets the first sheet. 
    // To get all sheets, we usually need the API or to scrape the HTML.
    // Let's try to fetch the HTML and look for "gid".
    fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`)
      .then(res => res.text())
      .then(html => {
        const matches = html.matchAll(/"gid":"(\d+)"/g);
        const gids = new Set();
        for (const match of matches) {
          gids.add(match[1]);
        }
        console.log(Array.from(gids).join(', '));
      });
  });
