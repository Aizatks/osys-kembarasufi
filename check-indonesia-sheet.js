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
  console.log('🔍 Analyzing Indonesia Sheet Structure...\n');
  
  const json = await fetchSheet();
  if (!json) {
    console.log('❌ Failed to fetch');
    return;
  }
  
  const rows = json.table.rows;
  console.log(`Total rows: ${rows.length}\n`);
  
  // Find section headers and separators
  console.log('📋 Finding Package Sections (Headers/Separators):\n');
  
  const sections = [];
  let currentSection = null;
  
  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i]?.c || [];
    
    // Get all cell values for this row
    const rowValues = cells.slice(0, 10).map((c, idx) => {
      const val = c?.v || c?.f || '';
      return String(val).trim();
    });
    
    // Check if this is a header row (look for patterns like "TRANS SUMATERA", "JAKARTA & BANDUNG", etc)
    const fullRow = rowValues.join(' ').toUpperCase();
    
    // Detect package headers
    if (fullRow.includes('TRANS SUMATERA') || 
        fullRow.includes('JAKARTA') || 
        fullRow.includes('BALI') ||
        fullRow.includes('MEDAN') ||
        fullRow.includes('SABANG') ||
        fullRow.includes('PADANG') ||
        fullRow.includes('ACEH') ||
        fullRow.includes('DEPOSIT') ||
        fullRow.includes('HARGA PAKEJ')) {
      
      console.log(`Row ${i + 1}: ${fullRow.substring(0, 100)}`);
      
      // Check if this looks like a header (not a date row)
      const datePattern = /\d{1,2}\s*(jan|feb|mac|mar|apr|may|mei|jun|jul|aug|ogo|sep|okt|nov|dis|dec)/i;
      if (!datePattern.test(fullRow)) {
        if (currentSection) {
          currentSection.endRow = i - 1;
          sections.push(currentSection);
        }
        currentSection = {
          name: fullRow.substring(0, 60),
          startRow: i,
          endRow: null
        };
      }
    }
    
    // Also check for date rows to understand structure
    const datePattern = /\d{1,2}\s*(jan|feb|mac|mar|apr|may|mei|jun|jul|aug|ogo|sep|okt|nov|dis|dec)/i;
    const col0 = rowValues[0];
    const col1 = rowValues[1];
    const col2 = rowValues[2];
    const col3 = rowValues[3];
    const col4 = rowValues[4];
    const col5 = rowValues[5];
    
    // If we find a date, log it with columns
    if (datePattern.test(col3) || datePattern.test(col4)) {
      // Only log first few dates per section
      if (i < 10 || (i > 30 && i < 40) || (i > 60 && i < 70)) {
        console.log(`  Row ${i + 1}: [0]${col0} | [1]${col1} | [2]${col2} | [3]${col3} | [4]${col4} | [5]${col5}`);
      }
    }
  }
  
  // Close last section
  if (currentSection) {
    currentSection.endRow = rows.length - 1;
    sections.push(currentSection);
  }
  
  console.log('\n📦 Detected Sections:');
  sections.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name}`);
    console.log(`     Rows: ${s.startRow + 1} - ${s.endRow + 1}`);
  });
  
  // Now analyze column structure more carefully
  console.log('\n\n📊 Detailed Column Analysis (first 100 rows):');
  console.log('Looking for DATE column and KEKOSONGAN/AVAILABLE column...\n');
  
  for (let i = 0; i < Math.min(100, rows.length); i++) {
    const cells = rows[i]?.c || [];
    const rowValues = cells.slice(0, 12).map((c, idx) => {
      const val = c?.v || c?.f || '';
      return `[${idx}]${String(val).substring(0, 15)}`;
    });
    
    const fullRow = rowValues.join(' | ');
    
    // Only print rows with dates or headers
    const datePattern = /\d{1,2}\s*(jan|feb|mac|mar|apr|may|mei|jun|jul|aug|ogo|sep|okt|nov|dis|dec)/i;
    if (datePattern.test(fullRow) || 
        fullRow.toUpperCase().includes('TRANS') ||
        fullRow.toUpperCase().includes('JAKARTA') ||
        fullRow.toUpperCase().includes('BALI') ||
        fullRow.toUpperCase().includes('DATE') ||
        fullRow.toUpperCase().includes('AVAILABLE') ||
        fullRow.toUpperCase().includes('KEKOSONGAN') ||
        fullRow.toUpperCase().includes('DEPOSIT')) {
      console.log(`Row ${String(i + 1).padStart(3)}: ${fullRow}`);
    }
  }
}

main().catch(console.error);
