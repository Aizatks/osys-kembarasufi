import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyToken, extractTokenFromHeader } from "@/lib/auth";

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
  
  const payload = await verifyToken(token);
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

    // 3. Fetch Leads
    let leadsQuery = supabase.from("lead_reports").select("nama_pakej");
    if (dateFrom) leadsQuery = leadsQuery.gte("date_lead", dateFrom);
    if (dateTo) leadsQuery = leadsQuery.lte("date_lead", dateTo);
    const { data: leadsData, error: leadsError } = await leadsQuery;
    
    if (leadsError) throw leadsError;

    // --- AGGREGATION ---

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

    // Package Performance
    const packageStats: Record<string, { 
      spending: number; 
      pax: number; 
      leads: number;
      closers: Record<string, number>;
    }> = {};

    // Group Spending by Package
    spendingData?.forEach((s) => {
      const pkg = s.nama_pakej;
      if (!packageStats[pkg]) {
        packageStats[pkg] = { spending: 0, pax: 0, leads: 0, closers: {} };
      }
      packageStats[pkg].spending += Number(s.amount);
    });

    // Group Sales by Package
    salesData?.forEach((s: any) => {
      const pkg = s.nama_pakej;
      if (!packageStats[pkg]) {
        packageStats[pkg] = { spending: 0, pax: 0, leads: 0, closers: {} };
      }
      packageStats[pkg].pax += Number(s.jumlah_pax || 0);
      
      const closerName = s.staff?.name || "Unknown";
      packageStats[pkg].closers[closerName] = (packageStats[pkg].closers[closerName] || 0) + 1;
    });

    // Group Leads by Package
    leadsData?.forEach((l) => {
      const pkg = l.nama_pakej;
      if (packageStats[pkg]) {
        packageStats[pkg].leads += 1;
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
        totalLeads: leadsData?.length || 0,
        platformStats
      },
      packageReport
    });
  } catch (error) {
    console.error("Error generating marketing report:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
