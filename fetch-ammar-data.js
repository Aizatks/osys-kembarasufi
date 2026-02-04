const SHEET_ID = '1C0jdJxjkdwTULNMPqgqbXyOctnOfkrVM_K_u1ywM4Hs';

async function fetchSheet(gid, name) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}`;
  
  try {
    const response = await fetch(url);
    const text = await response.text();
    const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
    if (!match) throw new Error('Invalid response format');
    const json = JSON.parse(match[1]);
    
    console.log(`\n=== ${name} (GID: ${gid}) ===`);
    console.log('Columns:', json.table.cols.map((c, i) => `${i}:${c.label}`).join(', '));
    
    const rows = [];
    for (let i = 0; i < json.table.rows.length; i++) {
      const row = json.table.rows[i];
      if (!row.c) continue;
      const vals = row.c.map(c => c?.v || c?.f || '');
      if (vals.some(v => v)) {
        rows.push(vals);
        if (rows.length <= 5) {
          console.log(`Row ${i}:`, vals.slice(0, 15));
        }
      }
    }
    console.log(`Total rows with data: ${rows.length}`);
    return rows;
  } catch (error) {
    console.error(`Error fetching ${name}:`, error.message);
    return [];
  }
}

async function main() {
  const salesData = await fetchSheet('1789979154', 'SALES REPORT');
  console.log('\n--- SALES DATA FOR IMPORT ---');
  salesData.slice(1).forEach((row, i) => {
    if (row[0]) console.log(`${i}: BULAN=${row[0]}, PHONE=${row[1]}, PAKEJ=${row[2]}, DATE_CLOSED=${row[3]}, TRIP=${row[4]}, PAX=${row[5]}, HARGA=${row[6]}`);
  });
  
  const leadData = await fetchSheet('1892509228', 'LEAD REPORT');
  console.log('\n--- LEAD DATA FOR IMPORT ---');
  leadData.slice(1).forEach((row, i) => {
    if (row[0]) console.log(`${i}: BULAN=${row[0]}, PAKEJ=${row[1]}, DATE=${row[2]}, PHONE=${row[3]}, FROM=${row[4]}, REMARK=${row[5]}, STATUS=${row[6]}`);
  });
}

main();
