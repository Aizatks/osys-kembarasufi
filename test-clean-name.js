
function cleanPackageName(name) {
  if (!name) return "";
  let cleaned = name.trim();
  
  const hariHariRegex = /(\d+\s*HARI\s+\d+\s*)HARI/i;
  if (hariHariRegex.test(cleaned)) {
    cleaned = cleaned.replace(hariHariRegex, '$1MALAM');
  }
  
  return cleaned;
}

const testCases = [
  "SPAIN, PORTUGAL & MOROCCO (12 HARI 9 HARI)",
  "SPAIN, PORTUGAL & MOROCCO (12 HARI 9 MALAM)",
  "TURKEY (10 HARI 7 MALAM)",
  "SCANDINAVIA (14 HARI 11 HARI)",
  "12 HARI 9 HARI"
];

testCases.forEach(tc => {
  console.log(`Original: ${tc}`);
  console.log(`Cleaned:  ${cleanPackageName(tc)}`);
  console.log('---');
});
