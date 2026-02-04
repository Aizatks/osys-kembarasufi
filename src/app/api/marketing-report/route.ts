import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyToken, extractTokenFromHeader } from "@/lib/auth";
import { fetchSheetData } from "@/lib/sheets";

const PAGE_SIZE = 1000;

const INFORMAL_TO_FORMAL_MAPPINGS: Record<string, string[]> = {
  "TURKIYE": ["TURKI", "TURKEY", "TURKIYE", "TURKIYEE", "Turki", "Turkiye", "Pakej Turkiye"],
  "SWITZERLAND": ["SWISS", "Switzerland", "Pakej Switzerland", "SWITZERLAND | SWISS"],
  "JAPAN": ["JEPUN", "Japan", "Jepun", "JAPAN "],
  "KOREA SEOUL NAMI": ["KOREA", "Korea", "KOREA ", "KOREA JEJU", "KOREA NAMI", "KOREA NAMI ", "NAMI", "Pakej KS", "PAKEJ KS", "KS"],
  "BALKAN 8 NEGARA": ["BALKAN", "Balkan", "Balkan 8 Negara", "BALKAN 8 NEGARA", "Pakej Balkan 8 Negara"],
  "CENTRAL EASTERN EUROPE": ["CEE", "Central Eastern Europe", "CENTRAL & EASTERN EUROPE | CEE", "Pakej CEE", "CEE / SCANDI"],
  "MESIR JEJAK RASUL": ["MESIR", "Mesir", "MESIR ", "Mesir Jejak Rasul"],
  "MESIR NILE CRUISE": ["MESIR CRUISE NILE", "Mesir Cruise Nile", "MESIR CRUISE "],
  "PALESTIN,JORDAN & AQSA": ["JORDAN", "Jordan", "JORDAN AQSA", "Jordan Aqsa Palestin", "JORDAN PALESTINE & MASJIDIL AQSA", "Pakej Jordan + Palestin", "AQSA"],
  "KASHMIR & AGRA TOUR": ["KASHMIR", "Kashmir", "Kashmir & Agra Tour", "KASHMIR INDIA"],
  "VIETNAM 6 NEGERI": ["VIETNAM", "Vietnam", "VIETNAM 6", "vietnam 6 negeri", "VIETNAM 6 NEGERI", "VIETNAM 6 NEGERI | DALAT", "DANANG", "danang", "Danang", "DANANG VIETNAM", "DALAT", "Vietnam (Dalat)", "Vietnam (Danang)", "VIETNAM DANANG", "VIETNAM DALAT ", "PHU QUOC", "Phu qouc", "PHU QUOC VIETNAM", "VIETNAM PHU QUOC", "VIETNAM PHUQUOC", "HANOI", "hanoi", "VIETNAM HANOI", "SAPA"],
  "WEST EUROPE": ["WEST", "WEST  ", "WEST 5", "WEST 6", "WEST6", "West Eropah", "West Eropah 6 Negara", "WEST EUROPE ", "WEST EUROPE 5 NEGARA", "WEST EUROPE 6 NEGARA", "W EUROPE 6", "Pakej West Eropah 5 Negara", "Pakej West Eropah 6 Negara", "Eropah"],
  "KEMBARA CAUCASUS": ["CAUCASUS", "Caucasus", "CAUCASUS 3 NEGARA"],
  "SCANDINAVIA 3 NEGARA": ["SCANDI", "SCANDINAVIA", "Scandinavia"],
  "ICELAND": ["ICE", "Iceland", "Pakej Iceland"],
  "NEW ZEALAND": ["NZ", "NEW ZEALAND ", "Pakej New Zealand"],
  "TAIWAN": ["taiwan", "Taiwan"],
  "BEIJING + INNER MONGOLIA": ["BEIJING", "Beijing", "BEIJING + INNER MONGOLIA", "BEIJNG", "BIM"],
  "SILK ROAD CHINA": ["Silk Road", "silk road china", "Silk road china", "9 SILK CHINA", "CHINA 9"],
  "JAKARTA & BANDUNG": ["JAKARTA", "JAK", "JAKARTA + BANDUNG", "jakarta bandung", "JAKARTA-BANDUNG"],
  "ACEH + PULAU SABANG": ["ACEH", "Aceh", "ACEH & PULAU SABANG", "Aceh Pulau Sabang", "acheh pulau sabang", "AMAL ACEH", "TRIP AMAL ACEH"],
  "MEDAN": ["medan", "Medan", "MEDAN INDONESIA", "AMAL MEDAN", "TRIP AMAL MEDAN"],
  "PADANG & BUKIT TINGGI": ["PADANG", "Padang", "Padang & Bukit Tinggi", "Padang + Bukit Tinggi", "padang bukit tinggi"],
  "TRANS INDONESIA": ["TRANS", "Trans indo", "TRANS INDO", "TRANS INDONESIA 8 WILAYAH"],
  "BALI": ["bali", "Bali", "BALI INDONESIA"],
  "SPAIN, PORTUGAL & MOROCCO": ["SPM", "SEPANYOL , PORTUGAL , MOROCCO (SPM)", "SPM 3 PAX"],
  "PAKISTAN PANORAMA": ["PAKISTAN", "Pakistan"],
  "CANADA": ["canada"],
  "UNITED KINGDOM": ["UK", "United Kingdom"],
  "WILAYAH YUNNAN": ["YUNNAN", "yunnan", "Yunnan", "YUNNAN CHINA"],
  "HATYAI SONGKHLA": ["HATYAI", "HAT YAI - SONGKHLA", "hat yai"],
  "CENTRAL ASIA": ["CENTRAL ASIA 3 NEGARA", "Pakej 3 Negara Central Asia", "CENTRAL 3 TAN"],
  "UMRAH BARAKAH": ["UMRAH", "Umrah", "UMRAH "],
  "INDONESIA": ["INDO", "Indonesia", "ANY PAKEJ INDONESIA"],
};

function findFormalPackageName(informalName: string, formalPackages: string[]): string | null {
  if (!informalName) return null;
  
  const upperInformal = informalName.toUpperCase().trim();
  
  for (const formalPkg of formalPackages) {
    const upperFormal = formalPkg.toUpperCase();
    if (upperFormal.includes(upperInformal) || upperInformal.includes(upperFormal.split("(")[0].trim())) {
      return formalPkg;
    }
  }
  
  for (const [formalKey, informalList] of Object.entries(INFORMAL_TO_FORMAL_MAPPINGS)) {
    for (const informal of informalList) {
      if (informalName === informal || upperInformal === informal.toUpperCase()) {
        const matched = formalPackages.find(fp => fp.toUpperCase().includes(formalKey));
        if (matched) return matched;
      }
    }
  }
  
  return null;
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getAuthenticatedStaff(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = extractTokenFromHeader(authHeader);
  
  if (!token) {
    return { staff: null, viewingAsStaff: null, isImpersonating: false };
  }
  
  const payload = verifyToken(token);
  if (!payload) {
    return { staff: null, viewingAsStaff: null, isImpersonating: false };
  }
  
  const supabase = getSupabase();
  
  if (payload.impersonatedBy) {
    const { data: originalStaff } = await supabase
      .from("staff")
      .select("*")
      .eq("id", payload.impersonatedBy)
      .single();
    
    const { data: targetStaff } = await supabase
      .from("staff")
      .select("*")
      .eq("id", payload.userId)
      .single();
    
    if (originalStaff && targetStaff) {
      // Allow if original is admin or target is marketing
      const isAllowed = 
        ["admin", "superadmin"].includes(originalStaff.role) || 
        targetStaff.role === "marketing" || 
        targetStaff.category === "Marketing";
        
      if (!isAllowed) return { staff: null, viewingAsStaff: null, isImpersonating: false };
      
      return { staff: originalStaff, viewingAsStaff: targetStaff, isImpersonating: true };
    }
  }
  
  const { data: staff } = await supabase
    .from("staff")
    .select("*")
    .eq("id", payload.userId)
    .single();
  
  if (!staff) {
    return { staff: null, viewingAsStaff: null, isImpersonating: false };
  }

  // Check if role or category is allowed
  const allowedRoles = ["admin", "superadmin", "marketing"];
  const isAllowed = allowedRoles.includes(staff.role) || staff.category === "Marketing";
  
  if (!isAllowed) {
    return { staff: null, viewingAsStaff: null, isImpersonating: false };
  }
  
  return { staff, viewingAsStaff: staff, isImpersonating: false };
}


export async function GET(request: NextRequest) {
  try {
    const { staff } = await getAuthenticatedStaff(request);
    
    if (!staff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    
    const supabase = getSupabase();
    
    // 1. Fetch Spending
    let spendingQuery = supabase.from("marketing_spending").select("*");
    if (dateFrom) spendingQuery = spendingQuery.gte("date", dateFrom);
    if (dateTo) spendingQuery = spendingQuery.lte("date", dateTo);
    const { data: spendingData, error: spendingError } = await spendingQuery;
    
    if (spendingError) throw spendingError;
    
    // 2. Fetch Sales (for Pax and Closers)
    let salesQuery = supabase.from("sales_reports").select("nama_pakej, jumlah_pax, staff_id, staff:staff_id(name)");
    if (dateFrom) salesQuery = salesQuery.gte("date_closed", dateFrom);
    if (dateTo) salesQuery = salesQuery.lte("date_closed", dateTo);
    const { data: salesData, error: salesError } = await salesQuery;
    
    if (salesError) throw salesError;

    // 3. Fetch Leads (with pagination to bypass 1000 row limit)
    let allLeadsData: { nama_pakej: string }[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      let leadsQuery = supabase
        .from("lead_reports")
        .select("nama_pakej")
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      
      if (dateFrom) leadsQuery = leadsQuery.gte("date_lead", dateFrom);
      if (dateTo) leadsQuery = leadsQuery.lte("date_lead", dateTo);
      
      const { data, error: leadsError } = await leadsQuery;
      
      if (leadsError) throw leadsError;
      
      if (data && data.length > 0) {
        allLeadsData = allLeadsData.concat(data);
        page++;
        hasMore = data.length === PAGE_SIZE;
      } else {
        hasMore = false;
      }
    }

    // --- AGGREGATION ---

    // Fetch formal package names from Google Sheets
    const sheetData = await fetchSheetData();
    const formalPackages = Array.from(new Set(Object.values(sheetData).map(p => p.name))).sort();

    // Platform Overview
    const platformStats: Record<string, { spending: number; leads: number }> = {
      "Meta Ads": { spending: 0, leads: 0 },
      "TikTok Ads": { spending: 0, leads: 0 },
      "TikTok Live": { spending: 0, leads: 0 },
    };

    spendingData?.forEach((s) => {
      let key = s.platform;
      if (s.platform === "TikTok Ads" && s.is_tiktok_live) {
        key = "TikTok Live";
      }
      if (platformStats[key]) {
        platformStats[key].spending += Number(s.amount);
      }
    });

    // Package Performance - use formal package names as keys
    const packageStats: Record<string, { 
      spending: number; 
      pax: number; 
      leads: number;
      closers: Record<string, number>;
    }> = {};

    // Helper to get or create package stats using formal name
    const getPackageStats = (pkgName: string) => {
      const formalName = findFormalPackageName(pkgName, formalPackages) || pkgName;
      if (!packageStats[formalName]) {
        packageStats[formalName] = { spending: 0, pax: 0, leads: 0, closers: {} };
      }
      return { key: formalName, stats: packageStats[formalName] };
    };

    // Group Spending by Package (normalize to formal names)
    spendingData?.forEach((s) => {
      const { stats } = getPackageStats(s.nama_pakej);
      stats.spending += Number(s.amount);
    });

    // Group Sales by Package (normalize to formal names)
    salesData?.forEach((s: any) => {
      const { stats } = getPackageStats(s.nama_pakej);
      stats.pax += Number(s.jumlah_pax || 0);
      
      const closerName = s.staff?.name || "Unknown";
      stats.closers[closerName] = (stats.closers[closerName] || 0) + 1;
    });

    // Group Leads by Package (normalize to formal names)
    allLeadsData?.forEach((l) => {
      const formalName = findFormalPackageName(l.nama_pakej, formalPackages);
      if (formalName && packageStats[formalName]) {
        packageStats[formalName].leads += 1;
      } else if (packageStats[l.nama_pakej]) {
        packageStats[l.nama_pakej].leads += 1;
      }
    });

    // Finalize Package Report
    const packageReport = Object.entries(packageStats).map(([name, stats]) => {
      // Determine Top Closer
      let topCloser = "N/A";
      let maxSales = 0;
      Object.entries(stats.closers).forEach(([closer, count]) => {
        if (count > maxSales) {
          maxSales = count;
          topCloser = closer;
        }
      });

      return {
        name,
        spending: stats.spending,
        pax: stats.pax,
        leads: stats.leads,
        topCloser: topCloser === "N/A" ? "N/A" : `${topCloser} (${maxSales} close)`,
      };
    }).sort((a, b) => b.spending - a.spending);

    return NextResponse.json({
      overview: {
        totalSpending: Object.values(platformStats).reduce((acc, curr) => acc + curr.spending, 0),
        totalPax: salesData?.reduce((acc, curr) => acc + Number(curr.jumlah_pax || 0), 0) || 0,
        totalLeads: allLeadsData?.length || 0,
        platformStats
      },
      packageReport
    });
  } catch (error) {
    console.error("Error generating marketing report:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
