const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const GID = '260412826';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${GID}`;

fetch(url)
  .then(res => res.text())
  .then(text => {
    const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
    if (match) {
      const json = JSON.parse(match[1]);
      json.table.rows.forEach((row, idx) => {
        const bil = row.c[1]?.v;
        const date = row.c[3]?.v;
        if (bil || date) {
          console.log(`${idx}: BIL=${bil} | DATE=${date}`);
        }
      });
    }
  });
