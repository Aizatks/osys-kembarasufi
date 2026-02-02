import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchPackageDates, PACKAGE_SHEET_MAP } from "@/lib/sheets";
import { verifyToken, extractTokenFromHeader } from "@/lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ALLOWED_ROLES = ['tour-coordinator', 'tour-coordinator-manager', 'superadmin'];

function parseDateToISO(dateStr: string): string | null {
  if (!dateStr) return null;
  
  const monthMap: Record<string, string> = {
    'JAN': '01', 'FEB': '02', 'MAC': '03', 'MAR': '03', 'APR': '04', 'MAY': '05', 
    'MEI': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08', 'OGO': '08', 'SEP': '09', 
    'OKT': '10', 'NOV': '11', 'DIS': '12', 'DEC': '12'
  };

  // Try format like "26 JAN" or "26 JAN 2026"
  let match = dateStr.match(/(\d{1,2})\s*([A-Z]{3,})/i);
  if (match) {
    const day = match[1].padStart(2, '0');
    const monthPart = match[2].toUpperCase().substring(0, 3);
    const month = monthMap[monthPart];
    if (day && month) {
      return `2026-${month}-${day}`;
    }
  }

  // Try format like "JAN 26"
  match = dateStr.match(/([A-Z]{3,})\s*(\d{1,2})/i);
  if (match) {
    const day = match[2].padStart(2, '0');
    const monthPart = match[1].toUpperCase().substring(0, 3);
    const month = monthMap[monthPart];
    if (day && month) {
      return `2026-${month}-${day}`;
    }
  }

  // Try numeric format like "26/01/2026" or "26-01-2026"
  match = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    let year = match[3];
    if (year.length === 2) year = '20' + year;
    return `${year}-${month}-${day}`;
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);
    const payload = token ? verifyToken(token) : null;

    if (!payload || !ALLOWED_ROLES.includes(payload.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1VWX1w9lZ6kO75tYtqqcgEATQmPk1XbyAkJ_XGwiztYY';
    const results = [];

    for (const [pkgName, config] of Object.entries(PACKAGE_SHEET_MAP)) {
      const dates = await fetchPackageDates(SHEET_ID, config.gid, config);
      
      for (const date of dates) {
        const isoDate = parseDateToISO(date.txt);
        if (!isoDate) continue;

        const { error } = await supabase
          .from("trip_dates")
          .upsert({
            package_id: pkgName,
            depart_date: isoDate,
            seats_total: 30,
            seats_available: date.availability ?? 30,
            last_synced_at: new Date().toISOString()
          }, { onConflict: 'package_id,depart_date' });
        
        if (error) console.error(`Error upserting ${pkgName} ${date.txt}:`, error);
      }
      results.push({ pkgName, count: dates.length });
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
