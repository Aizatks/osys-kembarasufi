const SHEET_ID = '1C0jdJxjkdwTULNMPqgqbXyOctnOfkrVM_K_u1ywM4Hs';

async function analyzeSheet(gid, name) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}`;
  
  try {
    const response = await fetch(url);
    const text = await response.text();
    const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
    if (!match) throw new Error('Invalid response format');
    const json = JSON.parse(match[1]);
    
    console.log(`\n=== ${name} (GID: ${gid}) ===`);
    console.log('COLUMNS:');
    json.table.cols.forEach((col, idx) => {
      console.log(`  ${idx}: ${col.label || '(no label)'}`);
    });
    
    console.log('\nFIRST 5 DATA ROWS:');
    for (let i = 0; i < Math.min(10, json.table.rows.length); i++) {
      const row = json.table.rows[i];
      if (!row.c) continue;
      const vals = row.c.map((c, idx) => `[${idx}]${c?.v || ''}`).slice(0, 15);
      console.log(`  Row ${i}: ${vals.join(' | ')}`);
    }
  } catch (error) {
    console.error(`Error fetching ${name}:`, error.message);
  }
}

async function main() {
  await analyzeSheet('1789979154', 'SALES REPORT');
  await analyzeSheet('1892509228', 'LEAD REPORT');
}

main();
