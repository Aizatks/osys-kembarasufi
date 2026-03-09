export interface TripDate {
  txt: string;
  status: 'AVAILABLE' | 'LIMITED' | 'CLOSED';
  sur: number;
  surLabel: string;
  availability: number | null;
  peakSeasonPrices?: { adult?: number; cwb?: number; cwob?: number };
}

export interface InsuranceRates {
  malaysian: number;
  nonMalaysian: number;
  seniorMalaysian: number;
  seniorNonMalaysian: number;
}

export interface PackageData {
  name: string;
  duration: string;
  prices: {
    adult: number;
    cwb: number;
    cwob: number;
    infant: number;
  };
  costs: {
    tip: number;
    surcharge_base: number;
    visa: number;
    singleRoom: number;
    insurance: number;
  };
  insuranceRates?: InsuranceRates;
  pic: string;
  dates: TripDate[];
  sheetGid: string;
}

export type MasterData = Record<string, PackageData>;

interface GoogleVizResponse {
  table: {
    cols: { label: string; type: string }[];
    rows: { c: ({ v: string | number | null; f?: string } | null)[] }[];
  };
}

function parseNumberFromCell(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    // If it contains "RM", prioritize the number after it
    const rmMatch = val.match(/RM\s*([\d,.]+)/i);
    if (rmMatch) {
      const cleaned = rmMatch[1].replace(/,/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    }
    
    // Otherwise, clean and parse, but be careful with hyphens that aren't minus signs
    const cleaned = val.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

function parseDate(dateVal: string | number | null, formatted?: string): string {
  if (!dateVal) return '';
  if (formatted) return formatted;
  if (typeof dateVal === 'string') return dateVal;
  return '';
}

export type SheetConfig = {
  gid: string;
  dateCol: number;
  surCol: number;
  availCol: number;
  rowStart?: number;
  rowEnd?: number;
  tipFromHeader?: number;
  seasonCol?: number;
  seasonSurcharge?: number;
  // For packages with seasonal base price changes (e.g. Korea December)
  peakSeasonKeyword?: string;
  peakSeasonPrices?: { adult?: number; cwb?: number; cwob?: number };
  // Only apply peakSeasonPrices when surcharge is at least this amount (e.g. Egypt/SPM - SEJUK applies year-round but Dec has higher surcharge)
  peakMinSurcharge?: number;
};

export const PACKAGE_SHEET_MAP: Record<string, SheetConfig> = {
    // Europe packages
    // Dec prices: West Europe 9299/9099/8899, peak when sur>=370
    'WEST EUROPE': { gid: '1685996596', dateCol: 3, surCol: 1, availCol: 5, seasonCol: 6, peakSeasonKeyword: 'WINTER', peakSeasonPrices: { adult: 9299, cwb: 9099, cwob: 8899 } },
    // Dec prices: Kembara Eropah 9299/9099/8899
    'KEMBARA EROPAH': { gid: '1650367882', dateCol: 3, surCol: 1, availCol: 4, seasonCol: 6, peakSeasonKeyword: 'WINTER', peakSeasonPrices: { adult: 9299, cwb: 9099, cwob: 8899 } },
    'EROPAH 5 NEGARA': { gid: '1650367882', dateCol: 3, surCol: 1, availCol: 4, seasonCol: 6, peakSeasonKeyword: 'WINTER', peakSeasonPrices: { adult: 9299, cwb: 9099, cwob: 8899 } },
    // Switzerland - Dec 8899/8699/8499
    'SWITZERLAND': { gid: '0', dateCol: 3, surCol: 1, availCol: 5, seasonCol: 6, peakSeasonKeyword: 'WINTER', peakSeasonPrices: { adult: 8899, cwb: 8699, cwob: 8499 } },
    // UK - Dec 12630/12430/12230
    'UNITED KINGDOM': { gid: '1415831953', dateCol: 3, surCol: 1, availCol: 5, seasonCol: 6, peakSeasonKeyword: 'WINTER', peakSeasonPrices: { adult: 12630, cwb: 12430, cwob: 12230 } },
    'UK': { gid: '1415831953', dateCol: 3, surCol: 1, availCol: 5, seasonCol: 6, peakSeasonKeyword: 'WINTER', peakSeasonPrices: { adult: 12630, cwb: 12430, cwob: 12230 } },
    // CEE - Dec 8899/8699/8499, peakMinSurcharge to avoid Jan SEJUK dates getting peak prices
    'CEE': { gid: '44458730', dateCol: 3, surCol: 1, availCol: 5, seasonCol: 6, peakSeasonKeyword: 'SEJUK', peakSeasonPrices: { adult: 8899, cwb: 8699, cwob: 8499 }, peakMinSurcharge: 370 },
    'CENTRAL EASTERN': { gid: '44458730', dateCol: 3, surCol: 1, availCol: 5, seasonCol: 6, peakSeasonKeyword: 'SEJUK', peakSeasonPrices: { adult: 8899, cwb: 8699, cwob: 8499 }, peakMinSurcharge: 370 },
    // Balkan - Dec 8899/8699/8499
    'BALKAN': { gid: '337539407', dateCol: 3, surCol: 1, availCol: 5, seasonCol: 6, peakSeasonKeyword: 'SEJUK', peakSeasonPrices: { adult: 8899, cwb: 8699, cwob: 8499 }, peakMinSurcharge: 340 },

    // Turkey & Caucasus
    // Turkey Dec: 5299/5099/4899 (WINTER SONATA in col[5])
    'TURKEY': { gid: '46277800', dateCol: 2, surCol: 1, availCol: 10, seasonCol: 5, peakSeasonKeyword: 'WINTER SONATA', peakSeasonPrices: { adult: 5299, cwb: 5099, cwob: 4899 } },
    'TURKIYE': { gid: '46277800', dateCol: 2, surCol: 1, availCol: 10, seasonCol: 5, peakSeasonKeyword: 'WINTER SONATA', peakSeasonPrices: { adult: 5299, cwb: 5099, cwob: 4899 } },
    'TURKI': { gid: '46277800', dateCol: 2, surCol: 1, availCol: 10, seasonCol: 5, peakSeasonKeyword: 'WINTER SONATA', peakSeasonPrices: { adult: 5299, cwb: 5099, cwob: 4899 } },
    // Caucasus Dec: 8899/8699/8499 - no departure sheet, handled via PRICE_OVERRIDES
    'CAUCASUS': { gid: '327375225', dateCol: 3, surCol: 1, availCol: 5 },
    'KEMBARA CAUCASUS': { gid: '327375225', dateCol: 3, surCol: 1, availCol: 5 },

    // Spain/Portugal/Morocco
    // SEJUK applies Jan-Feb (regular) AND Dec (higher) - peakMinSurcharge to distinguish
    'SPM': { gid: '73120252', dateCol: 3, surCol: 1, availCol: 5, seasonCol: 6, peakSeasonKeyword: 'SEJUK', peakSeasonPrices: { adult: 9699, cwb: 9499, cwob: 9299 }, peakMinSurcharge: 340 },
    'SPAIN': { gid: '73120252', dateCol: 3, surCol: 1, availCol: 5, seasonCol: 6, peakSeasonKeyword: 'SEJUK', peakSeasonPrices: { adult: 9699, cwb: 9499, cwob: 9299 }, peakMinSurcharge: 340 },
    'PORTUGAL': { gid: '73120252', dateCol: 3, surCol: 1, availCol: 5, seasonCol: 6, peakSeasonKeyword: 'SEJUK', peakSeasonPrices: { adult: 9699, cwb: 9499, cwob: 9299 }, peakMinSurcharge: 340 },
    'MOROCCO': { gid: '73120252', dateCol: 3, surCol: 1, availCol: 5, seasonCol: 6, peakSeasonKeyword: 'SEJUK', peakSeasonPrices: { adult: 9699, cwb: 9499, cwob: 9299 }, peakMinSurcharge: 340 },

    // Jordan/Palestine/Aqsa - Dec: 8799/8699/8599
    'JORDAN': { gid: '724334601', dateCol: 3, surCol: 1, availCol: 5, seasonCol: 6, peakSeasonKeyword: 'SEJUK', peakSeasonPrices: { adult: 8799, cwb: 8699, cwob: 8599 }, peakMinSurcharge: 340 },
    'PALESTIN': { gid: '724334601', dateCol: 3, surCol: 1, availCol: 5, seasonCol: 6, peakSeasonKeyword: 'SEJUK', peakSeasonPrices: { adult: 8799, cwb: 8699, cwob: 8599 }, peakMinSurcharge: 340 },
    'AQSA': { gid: '724334601', dateCol: 3, surCol: 1, availCol: 5, seasonCol: 6, peakSeasonKeyword: 'SEJUK', peakSeasonPrices: { adult: 8799, cwb: 8699, cwob: 8599 }, peakMinSurcharge: 340 },
    'JORDAN AQSA': { gid: '724334601', dateCol: 3, surCol: 1, availCol: 5, seasonCol: 6, peakSeasonKeyword: 'SEJUK', peakSeasonPrices: { adult: 8799, cwb: 8699, cwob: 8599 }, peakMinSurcharge: 340 },

    // Egypt packages
    // SEJUK applies Feb-Mar (regular) AND Dec (higher) - peakMinSurcharge to distinguish
    'MESIR': { gid: '104028176', dateCol: 3, surCol: 1, availCol: 5, seasonCol: 6, peakSeasonKeyword: 'SEJUK', peakSeasonPrices: { adult: 7299, cwb: 7099, cwob: 6899 }, peakMinSurcharge: 340 },
    'EGYPT': { gid: '104028176', dateCol: 3, surCol: 1, availCol: 5, seasonCol: 6, peakSeasonKeyword: 'SEJUK', peakSeasonPrices: { adult: 7299, cwb: 7099, cwob: 6899 }, peakMinSurcharge: 340 },
    'JEJAK RASUL': { gid: '104028176', dateCol: 3, surCol: 1, availCol: 5, seasonCol: 6, peakSeasonKeyword: 'SEJUK', peakSeasonPrices: { adult: 7299, cwb: 7099, cwob: 6899 }, peakMinSurcharge: 340 },
    'MESIR JEJAK RASUL': { gid: '104028176', dateCol: 3, surCol: 1, availCol: 5, seasonCol: 6, peakSeasonKeyword: 'SEJUK', peakSeasonPrices: { adult: 7299, cwb: 7099, cwob: 6899 }, peakMinSurcharge: 340 },
    'NILE': { gid: '1836266947', dateCol: 3, surCol: -1, availCol: 10 },
    'CRUISE': { gid: '1836266947', dateCol: 3, surCol: -1, availCol: 10 },
    'MESIR CRUISE NILE': { gid: '1836266947', dateCol: 3, surCol: -1, availCol: 10 },

    // China packages - Beijing/Xian Dec: 4499/4399/4299
    'YUNNAN': { gid: '839996957', dateCol: 3, surCol: 1, availCol: 5 },
    'BEIJING INNER MONGOLIA': { gid: '1042321717', dateCol: 3, surCol: 1, availCol: 5, seasonCol: 6, peakSeasonKeyword: 'SEJUK', peakSeasonPrices: { adult: 4499, cwb: 4399, cwob: 4299 } },
    'INNER MONGOLIA': { gid: '1042321717', dateCol: 3, surCol: 1, availCol: 5, seasonCol: 6, peakSeasonKeyword: 'SEJUK', peakSeasonPrices: { adult: 4499, cwb: 4399, cwob: 4299 } },
    'MONGOLIA': { gid: '1042321717', dateCol: 3, surCol: 1, availCol: 5, seasonCol: 6, peakSeasonKeyword: 'SEJUK', peakSeasonPrices: { adult: 4499, cwb: 4399, cwob: 4299 } },
    'BIM': { gid: '1042321717', dateCol: 3, surCol: 1, availCol: 5, seasonCol: 6, peakSeasonKeyword: 'SEJUK', peakSeasonPrices: { adult: 4499, cwb: 4399, cwob: 4299 } },
    'BEIJING XIAN': { gid: '1042321717', dateCol: 3, surCol: 1, availCol: 5, seasonCol: 6, peakSeasonKeyword: 'SEJUK', peakSeasonPrices: { adult: 4499, cwb: 4399, cwob: 4299 } },
    'XIAN': { gid: '1042321717', dateCol: 3, surCol: 1, availCol: 5, seasonCol: 6, peakSeasonKeyword: 'SEJUK', peakSeasonPrices: { adult: 4499, cwb: 4399, cwob: 4299 } },
    'CHINA': { gid: '839996957', dateCol: 3, surCol: 1, availCol: 5 },

    // Japan - Dec: 7499/7399/7299
    'JAPAN': { gid: '2127495849', dateCol: 3, surCol: 1, availCol: 5, seasonCol: 6, peakSeasonKeyword: 'Sejuk', peakSeasonPrices: { adult: 7499, cwb: 7399, cwob: 7299 } },
    'JEPUN': { gid: '2127495849', dateCol: 3, surCol: 1, availCol: 5, seasonCol: 6, peakSeasonKeyword: 'Sejuk', peakSeasonPrices: { adult: 7499, cwb: 7399, cwob: 7299 } },
    // Korea - Dec: 4399/4299/4199
    'KOREA': { gid: '177943333', dateCol: 3, surCol: 1, availCol: 5, seasonCol: 6, peakSeasonKeyword: 'SEJUK', peakSeasonPrices: { adult: 4399, cwb: 4299, cwob: 4199 } },
    'SEOUL': { gid: '177943333', dateCol: 3, surCol: 1, availCol: 5, seasonCol: 6, peakSeasonKeyword: 'SEJUK', peakSeasonPrices: { adult: 4399, cwb: 4299, cwob: 4199 } },
    'NAMI': { gid: '177943333', dateCol: 3, surCol: 1, availCol: 5, seasonCol: 6, peakSeasonKeyword: 'SEJUK', peakSeasonPrices: { adult: 4399, cwb: 4299, cwob: 4199 } },
    
    // India/Pakistan - VERIFIED
    'KASHMIR': { gid: '780665131', dateCol: 3, surCol: 1, availCol: 5 },
    'AGRA': { gid: '780665131', dateCol: 3, surCol: 1, availCol: 5 },
    'PAKISTAN': { gid: '10064167', dateCol: 3, surCol: 1, availCol: 5 },
    
    // Umrah - VERIFIED
    'UMRAH': { gid: '632179666', dateCol: 3, surCol: -1, availCol: 5 },
    'BARAKAH': { gid: '632179666', dateCol: 3, surCol: -1, availCol: 5 },
    
    // Taiwan/Timor - VERIFIED
    'TAIWAN': { gid: '1673896653', dateCol: 3, surCol: 1, availCol: 5 },
    'TIMOR': { gid: '58911564', dateCol: 3, surCol: 1, availCol: 5 },
    'TIMOR LESTE': { gid: '58911564', dateCol: 3, surCol: 1, availCol: 5 },
    
    // Syria/Lebanon - VERIFIED
    'SYRIA': { gid: '721933905', dateCol: 3, surCol: 1, availCol: 5 },
    'LEBANON': { gid: '721933905', dateCol: 3, surCol: 1, availCol: 5 },
    'SYRIA & LEBANON': { gid: '721933905', dateCol: 3, surCol: 1, availCol: 5 },
    
    // Vietnam packages - VERIFIED FEB 2026
    'VIETNAM': { gid: '28971169', dateCol: 3, surCol: 1, availCol: 5 },
    'DANANG': { gid: '1224583752', dateCol: 3, surCol: 1, availCol: 5 },
    'DA NANG': { gid: '1224583752', dateCol: 3, surCol: 1, availCol: 5 },
    'HANOI': { gid: '137831688', dateCol: 3, surCol: 1, availCol: 5 },
    'PHU QUOC': { gid: '1924663094', dateCol: 3, surCol: 1, availCol: 5 },
    'SAPA': { gid: '137831688', dateCol: 3, surCol: 1, availCol: 5 },
    'HALONG': { gid: '137831688', dateCol: 3, surCol: 1, availCol: 5 },
    
    // Cambodia - VERIFIED
    'KEMBOJA': { gid: '2104681834', dateCol: 2, surCol: 1, availCol: 5 },
    'CAMBODIA': { gid: '2104681834', dateCol: 2, surCol: 1, availCol: 5 },
    
    // Indonesia - VERIFIED
    'INDONESIA': { gid: '492345239', dateCol: 3, surCol: 1, availCol: 5 },
    'TRANS SUMATERA': { gid: '492345239', dateCol: 3, surCol: 1, availCol: 5, rowStart: 0, rowEnd: 30 },
    'JAKARTA BANDUNG': { gid: '492345239', dateCol: 3, surCol: 1, availCol: 5, rowStart: 33, rowEnd: 54 },
    'BALI': { gid: '492345239', dateCol: 3, surCol: 1, availCol: 5, rowStart: 57, rowEnd: 74 },
    'MEDAN': { gid: '492345239', dateCol: 3, surCol: 1, availCol: 5, rowStart: 78, rowEnd: 102 },
    'ACEH SABANG': { gid: '492345239', dateCol: 3, surCol: 1, availCol: 5, rowStart: 105, rowEnd: 128 },
    'PADANG BUKITTINGGI': { gid: '492345239', dateCol: 3, surCol: 1, availCol: 5, rowStart: 131, rowEnd: 160 },
    
    // Thailand - VERIFIED
    'THAILAND': { gid: '410628206', dateCol: 1, surCol: -1, availCol: 4 },
    
    // Domestic Malaysia - VERIFIED
    'DOMESTIK': { gid: '1646649981', dateCol: 1, surCol: -1, availCol: 4 },
    
    // China special destinations - VERIFIED
    'HARBIN & CHENGDU & SILK ROAD': { gid: '1358593334', dateCol: 2, surCol: -1, availCol: 4 },
    'HARBIN': { gid: '1358593334', dateCol: 2, surCol: -1, availCol: 4 },
    'CHENGDU': { gid: '1358593334', dateCol: 2, surCol: -1, availCol: 4 },
    'SILK ROAD': { gid: '1358593334', dateCol: 2, surCol: -1, availCol: 4 },
  
    // Scandinavia & special destinations - UPDATED FEB 2026
    'SCANDINAVIA': { gid: '1940566849', dateCol: 2, surCol: -1, availCol: 4 },
    'FAROE ISLAND + NORWAY LOFOTEN': { gid: '881089322', dateCol: 3, surCol: -1, availCol: 4 },
    'NORWAY LOFOTEN': { gid: '1243583528', dateCol: 3, surCol: -1, availCol: 4 },
    'NORWAY LOFOTEN + ICELAND': { gid: '478311422', dateCol: 3, surCol: -1, availCol: 4 },
    'FAROE ISLAND + ICELAND': { gid: '301384465', dateCol: 3, surCol: -1, availCol: 4 },
    'CENTRAL ASIA': { gid: '1490179661', dateCol: 3, surCol: -1, availCol: 5 },
    'NEW ZEALAND': { gid: '1114698589', dateCol: 3, surCol: -1, availCol: 5 },
    'SOUTH AMERICA': { gid: '11631890', dateCol: 3, surCol: -1, availCol: 5 },
    'CANADA': { gid: '1002715059', dateCol: 3, surCol: -1, availCol: 5 },
    'MEXICO + CUBA': { gid: '400612641', dateCol: 3, surCol: -1, availCol: 5 },
    'GREENLAND + LOFOTEN': { gid: '2390795', dateCol: 3, surCol: -1, availCol: 5 },
    'GREENLAND + LOFOTEN ISLAND': { gid: '2390795', dateCol: 3, surCol: -1, availCol: 5 },
    'ANTARTICA': { gid: '669046422', dateCol: 3, surCol: -1, availCol: 5 },
    'ICELAND': { gid: '1553006713', dateCol: 3, surCol: -1, availCol: 5 },
    
    // CIKGU LOH PAKEJ (Special packages)
    'JORDAN CIKGU LOH': { gid: '1940566849', dateCol: 2, surCol: -1, availCol: 4, rowStart: 61, rowEnd: 72, tipFromHeader: 250 },
    'CIKGU LOH': { gid: '1940566849', dateCol: 2, surCol: -1, availCol: 4, tipFromHeader: 250 },
    'CIKGU LOH PAKEJ': { gid: '1940566849', dateCol: 2, surCol: -1, availCol: 4, tipFromHeader: 250 },
    'CIKGU LOH JORDAN': { gid: '1940566849', dateCol: 2, surCol: -1, availCol: 4, rowStart: 61, rowEnd: 72, tipFromHeader: 250 },
    'CIKGU LOH TURKEY': { gid: '1940566849', dateCol: 2, surCol: -1, availCol: 4, rowStart: 73, rowEnd: 85, tipFromHeader: 250 },
    'CIKGU LOH MESIR': { gid: '1940566849', dateCol: 2, surCol: -1, availCol: 4, rowStart: 86, rowEnd: 100, tipFromHeader: 250 },
};

export function findSheetKeyFromPackageName(pkgName: string): string | null {
  const upperName = pkgName.toUpperCase();
  
  const specificMatches: [string, string][] = [
    ['BEIJING INNER MONGOLIA', 'BEIJING INNER MONGOLIA'],
    ['INNER MONGOLIA', 'INNER MONGOLIA'],
    ['BEIJING XIAN', 'BEIJING XIAN'],
    ['BEIJING-XIAN', 'BEIJING XIAN'],
    ['YUNNAN', 'YUNNAN'],
    ['FAROE ISLAND + NORWAY LOFOTEN', 'FAROE ISLAND + NORWAY LOFOTEN'],
    ['NORWAY LOFOTEN + ICELAND', 'NORWAY LOFOTEN + ICELAND'],
    ['NORWAY LOFOTEN', 'NORWAY LOFOTEN'],
    ['FAROE ISLAND + ICELAND', 'FAROE ISLAND + ICELAND'],
    ['CENTRAL ASIA', 'CENTRAL ASIA'],
    ['KYRGYZSTAN', 'CENTRAL ASIA'],
    ['KAZAKHSTAN', 'CENTRAL ASIA'],
    ['UZBEKISTAN', 'CENTRAL ASIA'],
    ['NEW ZEALAND', 'NEW ZEALAND'],
    ['SOUTH AMERICA', 'SOUTH AMERICA'],
    ['CANADA', 'CANADA'],
    ['GREENLAND + LOFOTEN', 'GREENLAND + LOFOTEN'],
    ['GREENLAND', 'GREENLAND + LOFOTEN'],
    ['ANTARTICA', 'ANTARTICA'],
    ['ICELAND', 'ICELAND'],
    ['CENTRAL EASTERN EUROPE', 'CEE'],
    ['CENTRAL EASTERN', 'CEE'],
    ['JORDAN AQSA', 'JORDAN AQSA'],
    ['TRANS SUMATERA', 'TRANS SUMATERA'],
    ['JAKARTA BANDUNG', 'JAKARTA BANDUNG'],
    ['ACEH SABANG', 'ACEH SABANG'],
    ['PADANG BUKITTINGGI', 'PADANG BUKITTINGGI'],
    ['DANANG', 'DANANG'],
    ['HANOI', 'HANOI'],
    ['PHU QUOC', 'PHU QUOC'],
    ['SAPA', 'HANOI'],
    ['HALONG', 'HANOI'],
  ];
  
  for (const [pattern, key] of specificMatches) {
    if (upperName.includes(pattern)) {
      if (PACKAGE_SHEET_MAP[key]) {
        return key;
      }
    }
  }
  
  const keys = Object.keys(PACKAGE_SHEET_MAP).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (upperName.includes(key)) {
      return key;
    }
  }
  return null;
}

/**
 * Cleans the package name from spreadsheet inconsistencies.
 * Specifically fixes "12 HARI 9 HARI" -> "12 HARI 9 MALAM"
 */
function cleanPackageName(name: string): string {
  if (!name) return "";
  let cleaned = name.trim();
  
  // Fix "X HARI Y HARI" pattern (case insensitive)
  const hariHariRegex = /(\d+\s*HARI\s+\d+\s*)HARI/i;
  if (hariHariRegex.test(cleaned)) {
    cleaned = cleaned.replace(hariHariRegex, '$1MALAM');
  }
  
  return cleaned;
}

export function extractSurchargeFromText(text: string): { amount: number; label: string } {
  if (!text) return { amount: 0, label: '' };
  const str = String(text).trim().toUpperCase();
  
  if (str === '-' || str === '' || str === 'TIADA' || str === 'NO' || str === 'NIL' || str === 'N/A') {
    return { amount: 0, label: '' };
  }
  
  if (str.includes('FREE') || str.includes('TIADA') || str === 'TANYA PIC') {
    return { amount: 0, label: '' };
  }
  
  const rmMatch = str.match(/RM\s*(\d+)/i);
  if (rmMatch) {
    const amt = parseInt(rmMatch[1]);
    return { amount: amt, label: `Surcharge RM${amt}` };
  }
  
  const surchargeRmMatch = str.match(/(?:SURCHARGE|SURCAJ|SURHAR)\s*RM\s*(\d+)/i);
  if (surchargeRmMatch) {
    const amt = parseInt(surchargeRmMatch[1]);
    return { amount: amt, label: `Surcharge RM${amt}` };
  }
  
  if (/^\d{2,3}$/.test(str)) {
    const amt = parseInt(str);
    if (amt >= 100 && amt <= 500) {
      return { amount: amt, label: `Surcharge RM${amt}` };
    }
  }
  
  const numMatch = str.match(/(\d+)/);
  if (numMatch && (str.includes('SURCHARGE') || str.includes('SURCAJ') || str.includes('SURHAR'))) {
    const amt = parseInt(numMatch[1]);
    if (amt >= 100 && amt <= 500) {
      return { amount: amt, label: `Surcharge RM${amt}` };
    }
  }
  
  return { amount: 0, label: '' };
}

export async function fetchPackageDates(sheetId: string, gid: string, config: SheetConfig): Promise<TripDate[]> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}`;
  
  try {
    const response = await fetch(url, { next: { revalidate: 60 } });
    if (!response.ok) return [];
    
    const text = await response.text();
    const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
    if (!match) return [];
    
    const json: GoogleVizResponse = JSON.parse(match[1]);
    const dates: TripDate[] = [];
    const seenDates = new Set<string>();
    
    json.table.rows.forEach((row, rowIdx) => {
      if (config.rowStart !== undefined && rowIdx < config.rowStart) return;
      if (config.rowEnd !== undefined && rowIdx > config.rowEnd) return;
      
      const cells = row.c;
      if (!cells) return;
      
      const dateCell = cells[config.dateCol];
      const dateStr = parseDate(dateCell?.v ?? null, dateCell?.f);
      if (!dateStr) return;
      
      const lowerDate = dateStr.toLowerCase().trim();
      const monthNames = ['jan', 'feb', 'mac', 'mar', 'apr', 'may', 'mei', 'jun', 'jul', 
        'aug', 'ogo', 'sep', 'okt', 'nov', 'dis', 'dec', 'january', 'february', 'march', 'april', 
        'june', 'july', 'august', 'september', 'october', 'november', 'december'];
      
      if (monthNames.includes(lowerDate) || lowerDate.includes('tarikh') || 
          lowerDate === 'date' || lowerDate.includes('date ')) return;
      
      if (!/\d{1,2}\s*(jan|feb|mac|mar|apr|may|mei|jun|jul|aug|ogo|sep|okt|nov|dis|dec)/i.test(dateStr)) return;
      
      if (lowerDate.includes('flight') || lowerDate.includes('ek') || lowerDate.includes('scroll')) return;
      
      if (seenDates.has(dateStr)) return;
      seenDates.add(dateStr);
      
      let rowSurcharge = 0;
      let rowSurLabel = '';
      
      if (config.surCol >= 0 && cells[config.surCol]) {
        const surVal = cells[config.surCol]?.v;
        const surStr = String(surVal || '').trim();
        const surResult = extractSurchargeFromText(surStr);
        rowSurcharge = surResult.amount;
        rowSurLabel = surResult.label;
      }
      
      let rowPeakSeasonPrices: { adult?: number; cwb?: number; cwob?: number } | undefined;

      if (config.seasonCol !== undefined && cells[config.seasonCol]) {
        const seasonVal = String(cells[config.seasonCol]?.v || '').toUpperCase().trim();

        // Handle legacy Swiss-style season surcharge
        if (config.seasonSurcharge) {
          const peakSeasons = ['WINTER', 'SPRING', 'AUTUMN'];
          if (peakSeasons.includes(seasonVal)) {
            rowSurcharge = config.seasonSurcharge;
            rowSurLabel = `Surcharge RM${config.seasonSurcharge} (${seasonVal})`;
          } else if (seasonVal === 'SUMMER') {
            rowSurcharge = 0;
            rowSurLabel = '';
          }
        }

        // Handle packages with seasonal base price changes (e.g. Korea December/SEJUK)
        if (config.peakSeasonKeyword && config.peakSeasonPrices && seasonVal === config.peakSeasonKeyword.toUpperCase()) {
          // If peakMinSurcharge set, only apply peak prices when surcharge meets threshold (e.g. Egypt/SPM Dec vs regular SEJUK)
          if (!config.peakMinSurcharge || rowSurcharge >= config.peakMinSurcharge) {
            rowPeakSeasonPrices = config.peakSeasonPrices;
          }
        }
      }

      let availability: number | null = null;
      if (config.availCol >= 0 && cells[config.availCol]) {
        const availVal = cells[config.availCol]?.v;
        if (typeof availVal === 'number') {
          availability = availVal;
        } else if (typeof availVal === 'string') {
          const upperAvail = availVal.toUpperCase().trim();
          if (upperAvail === 'CLOSED' || upperAvail === 'FULL' || upperAvail === 'CANCEL') {
            availability = 0;
          } else {
            const firstNumMatch = availVal.match(/^(\d+)/);
            if (firstNumMatch) {
              availability = parseInt(firstNumMatch[1]);
            }
          }
        }
      }

      let status: 'AVAILABLE' | 'LIMITED' | 'CLOSED' = 'AVAILABLE';
      if (availability !== null) {
        if (availability === 0) {
          status = 'CLOSED';
        } else if (availability <= 5) {
          status = 'LIMITED';
        }
      }

      dates.push({
        txt: dateStr,
        status,
        sur: rowSurcharge,
        surLabel: rowSurLabel,
        availability,
        peakSeasonPrices: rowPeakSeasonPrices,
      });
    });

    // Sort dates chronologically by first date in the string
    const monthMap: Record<string, number> = {
      jan: 0, feb: 1, mac: 2, mar: 2, apr: 3, may: 4, mei: 4, jun: 5, june: 5,
      jul: 6, july: 6, aug: 7, ogo: 7, sep: 8, okt: 9, oct: 9, nov: 10, dis: 11, dec: 11,
    };
    function parseDateForSort(txt: string): number {
      // Match first occurrence of: day month [year] - extract year from anywhere in string
      const dayMonMatch = txt.match(/^(\d{1,2})\s+([a-z]+)/i);
      const yearMatch = txt.match(/(\d{4})/);
      if (!dayMonMatch || !yearMatch) return 0;
      const day = parseInt(dayMonMatch[1]);
      const mon = monthMap[dayMonMatch[2].toLowerCase()] ?? 0;
      const year = parseInt(yearMatch[1]);
      return year * 10000 + mon * 100 + day;
    }
    dates.sort((a, b) => parseDateForSort(a.txt) - parseDateForSort(b.txt));

    return dates;
  } catch (error) {
    console.error(`Error fetching dates for gid ${gid}:`, error);
    return [];
  }
}

async function fetchInsuranceData(): Promise<Record<string, InsuranceRates>> {
  const INSURANCE_SHEET_ID = process.env.INSURANCE_SHEET_ID || '10NoXH0GHjw1xInZLAp_NwbuTKOpEzAUg';
  const url = `https://docs.google.com/spreadsheets/d/${INSURANCE_SHEET_ID}/gviz/tq?tqx=out:json`;
  
  try {
    const response = await fetch(url, { next: { revalidate: 300 } });
    if (!response.ok) return {};
    
    const text = await response.text();
    const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
    if (!match) return {};
    
    const json: GoogleVizResponse = JSON.parse(match[1]);
    const insuranceMap: Record<string, InsuranceRates> = {};
    
    json.table.rows.forEach((row) => {
      const cells = row.c;
      if (!cells) return;
      
      const pakejName = (cells[1]?.v as string)?.toUpperCase()?.trim();
      if (!pakejName) return;
      
      const malaysian = (cells[5]?.v as number) || 0;
      const nonMalaysian = (cells[6]?.v as number) || 0;
      const seniorMalaysian = (cells[7]?.v as number) || 0;
      const seniorNonMalaysian = (cells[8]?.v as number) || 0;
      
      insuranceMap[pakejName] = {
        malaysian,
        nonMalaysian,
        seniorMalaysian,
        seniorNonMalaysian,
      };
    });
    
    return insuranceMap;
  } catch (error) {
    console.error('Error fetching insurance data:', error);
    return {};
  }
}

function matchInsuranceToPackage(pkgName: string, insuranceMap: Record<string, InsuranceRates>): InsuranceRates | undefined {
  const upperName = pkgName.toUpperCase();
  
  for (const [insKey, rates] of Object.entries(insuranceMap)) {
    if (upperName.includes(insKey) || insKey.includes(upperName.split(' ')[0])) {
      return rates;
    }
  }
  
  const keywords = ['WEST EUROPE', 'CENTRAL EASTERN', 'BALKAN', 'SWITZERLAND', 'TURKI', 'TURKEY', 
    'CAUCASUS', 'SPAIN', 'JORDAN', 'MESIR', 'NILE', 'JAPAN', 'BEIJING', 'YUNNAN', 'XIAN', 
    'KOREA', 'TAIWAN', 'VIETNAM', 'DANANG', 'PHU QUOC', 'HANOI', 'KEMBOJA', 'HATYAI', 
    'INDONESIA', 'PAKISTAN', 'KASHMIR', 'TIMOR', 'CHENGDU', 'HARBIN', 'SILK ROAD', 'UMRAH'];
  
  for (const kw of keywords) {
    if (upperName.includes(kw)) {
      for (const [insKey, rates] of Object.entries(insuranceMap)) {
        if (insKey.includes(kw)) {
          return rates;
        }
      }
    }
  }
  
  return undefined;
}

export async function fetchSheetData(): Promise<MasterData> {
  const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

  try {
    const [mainResponse, insuranceMap] = await Promise.all([
      fetch(url, { next: { revalidate: 60 } }),
      fetchInsuranceData(),
    ]);
    
    if (!mainResponse.ok) throw new Error('Failed to fetch sheet data');
    
    const text = await mainResponse.text();
    const match = text.match(/google\.visualization\.Query\.setResponse\((.+)\);?$/);
    if (!match) throw new Error('Invalid response format');
    const json: GoogleVizResponse = JSON.parse(match[1]);

    const masterData: MasterData = {};

    json.table.rows.forEach((row) => {
      const cells = row.c;
      if (!cells || cells.length < 12) return;

      const bil = cells[0]?.v;
      const rawPkgName = cells[1]?.v as string;
      
      if (!bil || !rawPkgName || typeof rawPkgName !== 'string') return;
      if (rawPkgName.includes('LINK') || rawPkgName.includes('klik')) return;

      const pkgName = cleanPackageName(rawPkgName);
      const pkgKey = `pkg_${bil}`;

      const adultPrice = parseNumberFromCell(cells[2]?.v);
      const cwbPrice = parseNumberFromCell(cells[3]?.v);
      const cwobPrice = parseNumberFromCell(cells[4]?.v);
      const infantPrice = parseNumberFromCell(cells[5]?.v);
      let tipping = parseNumberFromCell(cells[6]?.v);
      const surcharge = parseNumberFromCell(cells[7]?.v);
      const insurance = parseNumberFromCell(cells[8]?.v);
      const visa = parseNumberFromCell(cells[9]?.v);
      const singleRoom = parseNumberFromCell(cells[10]?.v);
      const pic = (cells[11]?.v as string) || '';

      const sheetKey = findSheetKeyFromPackageName(pkgName);
      const config = sheetKey && PACKAGE_SHEET_MAP[sheetKey] ? PACKAGE_SHEET_MAP[sheetKey] : null;
      const sheetGid = config ? config.gid : '';
      
      if (config?.tipFromHeader && tipping === 0) {
        tipping = config.tipFromHeader;
      }
      
      const insuranceRates = matchInsuranceToPackage(pkgName, insuranceMap);

      masterData[pkgKey] = {
          name: pkgName.trim(),
          duration: '',
          prices: {
            adult: adultPrice,
            cwb: cwbPrice,
            cwob: cwobPrice,
            infant: infantPrice,
          },
          costs: {
            tip: tipping,
            surcharge_base: surcharge,
            visa: visa,
            singleRoom: singleRoom,
            insurance: insurance,
          },
          insuranceRates,
          pic: pic,
          dates: [], // Will be fetched on demand
          sheetGid,
        };
      });

      // PRICE OVERRIDES - Verified against LAPORAN HARIAN HARGA PAKEJ 2026 spreadsheet (gid=949409090)
      // These fix CWB/CWOB that main sheet sometimes has wrong. Dec prices handled via peakSeasonPrices.
      const PRICE_OVERRIDES: Record<string, Partial<{
        adult: number; cwb: number; cwob: number; tip: number; surcharge: number
      }>> = {
        // Indonesia
        'ACEH': { cwb: 1799, cwob: 1599 },
        'SABANG': { cwb: 1799, cwob: 1599 },
        'ACEH SABANG': { cwb: 1799, cwob: 1599 },
        'ACEH + SABANG': { cwb: 1799, cwob: 1599 },
        'PADANG': { cwb: 1499, cwob: 1299 },
        'BUKITTINGGI': { cwb: 1499, cwob: 1299 },
        'BUKIT TINGGI': { cwb: 1499, cwob: 1299 },
        'PADANG BUKITTINGGI': { cwb: 1499, cwob: 1299 },
        'PADANG + BUKITTINGGI': { cwb: 1499, cwob: 1299 },
        // Vietnam
        'VIETNAM HANOI': { cwb: 2899, cwob: 2699 },
        'HANOI': { cwb: 2899, cwob: 2699 },
        'SAPA': { cwb: 2899, cwob: 2699 },
        'HALONG': { cwb: 2899, cwob: 2699 },
        // Korea - regular season (Dec prices via peakSeasonPrices)
        'KOREA': { cwb: 3899, cwob: 3699, tip: 200 },
        'SEOUL': { cwb: 3899, cwob: 3699, tip: 200 },
        'NAMI': { cwb: 3899, cwob: 3699, tip: 200 },
        // Japan - regular season (Dec prices via peakSeasonPrices)
        'JAPAN': { cwb: 6899, cwob: 6699 },
        'JEPUN': { cwb: 6899, cwob: 6699 },
        // China
        'BEIJING INNER MONGOLIA': { cwb: 4199, cwob: 3999 },
        'INNER MONGOLIA': { cwb: 4199, cwob: 3999 },
        'MONGOLIA': { cwb: 4199, cwob: 3999 },
        'BIM': { cwb: 4199, cwob: 3999 },
        'BEIJING XIAN': { cwb: 4199, cwob: 3999 },
        'XIAN': { cwb: 4199, cwob: 3999 },
        'YUNNAN': { adult: 4999, cwb: 4499, cwob: 4299, tip: 250 },
        // Taiwan - Dec same price, no surcharge
        'TAIWAN': { cwb: 3599, cwob: 3399, tip: 180 },
        // Pakistan
        'PAKISTAN': { cwb: 6799, cwob: 6599 },
        // SPM - regular base (Dec via peakSeasonPrices)
        'SPM': { cwb: 9299, cwob: 8899 },
        'SPAIN': { cwb: 9299, cwob: 8899 },
        'PORTUGAL': { cwb: 9299, cwob: 8899 },
        'MOROCCO': { cwb: 9299, cwob: 8899 },
        // Egypt - regular base (Dec via peakSeasonPrices)
        'MESIR': { cwb: 6799, cwob: 6599 },
        'JEJAK RASUL': { cwb: 6799, cwob: 6599 },
        // Turkey - regular base (Dec via peakSeasonPrices)
        'TURKEY': { cwb: 4899, cwob: 4699 },
        'TURKIYE': { cwb: 4899, cwob: 4699 },
        'TURKI': { cwb: 4899, cwob: 4699 },
        // Caucasus - regular base (Dec: 8899/8699/8499 via peakSeasonPrices when available)
        'CAUCASUS': { cwb: 8499, cwob: 8099 },
        'KEMBARA CAUCASUS': { cwb: 8499, cwob: 8099 },
        // CEE/Balkan - regular base
        'CEE': { cwb: 8499, cwob: 8099 },
        'CENTRAL EASTERN': { cwb: 8499, cwob: 8099 },
        'BALKAN': { cwb: 8499, cwob: 8099 },
      };

      // Apply overrides
      Object.values(masterData).forEach((pkg) => {
        const upperName = pkg.name.toUpperCase();
        for (const [pattern, overrides] of Object.entries(PRICE_OVERRIDES)) {
          if (upperName.includes(pattern)) {
            if (overrides.adult !== undefined) pkg.prices.adult = overrides.adult;
            if (overrides.cwb !== undefined) pkg.prices.cwb = overrides.cwb;
            if (overrides.cwob !== undefined) pkg.prices.cwob = overrides.cwob;
            if (overrides.tip !== undefined) pkg.costs.tip = overrides.tip;
            if (overrides.surcharge !== undefined) pkg.costs.surcharge_base = overrides.surcharge;
            break; 
          }
        }
      });

      return masterData;
  } catch (error) {
    console.error('Error fetching sheets:', error);
    return {};
  }
}
