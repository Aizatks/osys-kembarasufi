const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const GID = '377196173';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${GID}`;

fetch(url)
  .then(res => res.text())
  .then(text => {
    const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
    if (match) {
      const json = JSON.parse(match[1]);
      json.table.rows.slice(0, 10).forEach((row, idx) => {
        const cells = row.c.map(c => c?.v || '-');
        console.log(`${idx}: ${cells.join(' | ')}`);
      });
    }
  });
