const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

fetch(url)
  .then(res => res.text())
  .then(text => {
    const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
    if (match) {
      const json = JSON.parse(match[1]);
      json.table.rows.forEach(row => {
        const name = row.c[1]?.v;
        if (name) console.log(name);
      });
    }
  });
