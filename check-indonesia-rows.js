const SHEET_ID = '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
const GID = '492345239';

async function fetchSheet() {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${GID}`;
  const res = await fetch(url);
  const text = await res.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
  if (!match) return null;
  return JSON.parse(match[1]);
}

async function main() {
  console.log('🔍 Finding exact row boundaries for Indonesia packages...\n');
  
  const json = await fetchSheet();
  if (!json) {
    console.log('❌ Failed to fetch');
    return;
  }
  
  const rows = json.table.rows;
  console.log(`Total rows: ${rows.length}\n`);
  
  // Look for package headers and boundaries
  const headerPatterns = [
    'TRANS SUMATERA',
    'JAKARTA & BANDUNG',
    'BALI',
    'MEDAN',
    'ACEH + PULAU SABANG',
    'ACEH 4H',
    'PADANG + BUKITTINGGI',
    'DEPOSIT',
    'HARGA PAKEJ'
  ];
  
  console.log('📋 Row-by-row analysis:\n');
  
  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i]?.c || [];
    const rowValues = cells.slice(0, 6).map((c) => {
      const val = c?.v || c?.f || '';
      return String(val).trim();
    });
    
    const fullRow = rowValues.join(' | ');
    const upperRow = fullRow.toUpperCase();
    
    // Check if this row contains header pattern
    const isHeader = headerPatterns.some(p => upperRow.includes(p));
    
    // Check if contains date
    const datePattern = /\d{1,2}\s*(jan|feb|mac|mar|apr|may|mei|jun|jul|aug|ogo|sep|okt|nov|dis|dec)/i;
    const hasDate = datePattern.test(fullRow);
    
    if (isHeader || i < 5 || i === 30 || i === 31 || i === 32 || i === 33 || i === 34 || 
        i === 54 || i === 55 || i === 56 || i === 57 || i === 58 ||
        i === 74 || i === 75 || i === 76 || i === 77 || i === 78 ||
        i === 102 || i === 103 || i === 104 || i === 105 ||
        i === 128 || i === 129 || i === 130 || i === 131) {
      const marker = isHeader ? '🏷️ ' : (hasDate ? '📅' : '  ');
      console.log(`${marker} Row ${String(i).padStart(3)}: ${fullRow.substring(0, 100)}`);
    }
  }
  
  // Now count dates per section
  console.log('\n\n📊 Counting dates per section based on header rows:\n');
  
  const sections = [
    { name: 'Trans Sumatera', start: 0, end: 30 },
    { name: 'Jakarta Bandung', start: 32, end: 54 },
    { name: 'Bali', start: 56, end: 74 },
    { name: 'Medan', start: 77, end: 102 },
    { name: 'Aceh Sabang', start: 104, end: 129 },
    { name: 'Padang Bukittinggi', start: 130, end: 160 },
  ];
  
  for (const section of sections) {
    let dateCount = 0;
    const dates = [];
    
    for (let i = section.start; i <= section.end && i < rows.length; i++) {
      const cells = rows[i]?.c || [];
      const dateCell = cells[3];
      const dateVal = dateCell?.f || dateCell?.v || '';
      const dateStr = String(dateVal).trim();
      
      const datePattern = /\d{1,2}\s*(jan|feb|mac|mar|apr|may|mei|jun|jul|aug|ogo|sep|okt|nov|dis|dec)/i;
      if (datePattern.test(dateStr)) {
        dateCount++;
        if (dates.length < 3) {
          dates.push(dateStr);
        }
      }
    }
    
    console.log(`${section.name}:`);
    console.log(`  Rows: ${section.start} - ${section.end}`);
    console.log(`  Dates found: ${dateCount}`);
    console.log(`  Sample: ${dates.join(', ')}`);
    console.log('');
  }
}

main().catch(console.error);
