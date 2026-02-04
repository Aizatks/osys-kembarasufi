
async function deepSearch(query) {
  const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
  const gids = [
    '1685996596', '260412826', '1839549646', '44458730', '337539407', 
    '46277800', '327375225', '73120252', '831903829', '527228455', 
    '1836266947', '511623951', '1550667701', '177943333', '780665131', 
    '10064167', '632179666', '1673896653', '58911564', '721933905', 
    '643644940', '2104681834', '492345239', '410628206', '1646649981', 
    '1358593334', '1940566849'
  ];
  
  for (const gid of gids) {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}`;
    try {
      const response = await fetch(url);
      const text = await response.text();
      const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
      if (!match) continue;
      const json = JSON.parse(match[1]);
      
      json.table.rows.forEach((row, i) => {
        const cells = row.c ? row.c.map(c => c ? (c.f || c.v) : null) : [];
        const rowStr = JSON.stringify(cells).toUpperCase();
        if (rowStr.includes(query.toUpperCase())) {
          console.log(`MATCH in GID ${gid} Row ${i}: ${JSON.stringify(cells)}`);
        }
      });
    } catch (e) {}
  }
}

deepSearch('AQSA');
