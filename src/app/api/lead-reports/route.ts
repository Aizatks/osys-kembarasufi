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
  
  return { staff, viewingAsStaff: staff, isImpersonating: false };
}

export async function GET(request: NextRequest) {
  try {
    const { staff, viewingAsStaff, isImpersonating } = await getAuthenticatedStaff(request);
    
    if (!staff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const effectiveStaff = isImpersonating && viewingAsStaff ? viewingAsStaff : staff;
    
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const staffId = searchParams.get("staff_id");
    
    const supabase = getSupabase();
    
    // Fetch all data using pagination to bypass 1000 row limit
    const PAGE_SIZE = 1000;
    let allData: Record<string, unknown>[] = [];
    let page = 0;
    let hasMore = true;
    
    while (hasMore) {
      let query = supabase
        .from("lead_reports")
        .select(`
          *,
          staff:staff_id (id, name)
        `)
        .order("date_lead", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      
      if (effectiveStaff.role !== "superadmin" && effectiveStaff.role !== "admin") {
        query = query.eq("staff_id", effectiveStaff.id);
      } else if (staffId && staffId !== "all") {
        query = query.eq("staff_id", staffId);
      }
      
      if (dateFrom) {
        query = query.gte("date_lead", dateFrom);
      }
      if (dateTo) {
        query = query.lte("date_lead", dateTo);
      }
      
      const { data, error } = await query;
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      if (data && data.length > 0) {
        allData = allData.concat(data);
        page++;
        hasMore = data.length === PAGE_SIZE;
      } else {
        hasMore = false;
      }
    }
    
    return NextResponse.json({ data: allData });
  } catch (error) {
    console.error("Error fetching lead reports:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { staff, viewingAsStaff, isImpersonating } = await getAuthenticatedStaff(request);
    
    if (!staff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await request.json();
    const supabase = getSupabase();
    
    const staffIdToUse = isImpersonating && viewingAsStaff ? viewingAsStaff.id : staff.id;
    
    const { data, error } = await supabase
      .from("lead_reports")
      .insert({
        staff_id: staffIdToUse,
        bulan: body.bulan,
        nama_pakej: body.nama_pakej,
        date_lead: body.date_lead,
        no_phone: body.no_phone,
        lead_from: body.lead_from,
        remark: body.remark,
        follow_up_status: body.follow_up_status || null,
        date_follow_up: body.date_follow_up || null,
      })
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error creating lead report:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { staff, viewingAsStaff, isImpersonating } = await getAuthenticatedStaff(request);
    
    if (!staff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const effectiveStaff = isImpersonating && viewingAsStaff ? viewingAsStaff : staff;
    
    const body = await request.json();
    const supabase = getSupabase();
    
    if (!body.id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }
    
    const { data: existingReport } = await supabase
      .from("lead_reports")
      .select("staff_id")
      .eq("id", body.id)
      .single();
    
    if (!existingReport) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    
    if (effectiveStaff.role !== "superadmin" && effectiveStaff.role !== "admin" && existingReport.staff_id !== effectiveStaff.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    const { data, error } = await supabase
      .from("lead_reports")
      .update({
        bulan: body.bulan,
        nama_pakej: body.nama_pakej,
        date_lead: body.date_lead,
        no_phone: body.no_phone,
        lead_from: body.lead_from,
        remark: body.remark,
        follow_up_status: body.follow_up_status || null,
        date_follow_up: body.date_follow_up || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.id)
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error updating lead report:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { staff, viewingAsStaff, isImpersonating } = await getAuthenticatedStaff(request);
    
    if (!staff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const effectiveStaff = isImpersonating && viewingAsStaff ? viewingAsStaff : staff;
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const supabase = getSupabase();
    
    // Check for bulk delete via body (for large selections)
    let idArray: string[] = [];
    const contentType = request.headers.get("content-type");
    
    if (contentType?.includes("application/json")) {
      try {
        const body = await request.json();
        if (body.ids && Array.isArray(body.ids)) {
          idArray = body.ids.filter(Boolean);
        }
      } catch {
        // No body or invalid JSON, continue with URL params
      }
    }
    
    // Fallback to URL params for backward compatibility
    if (idArray.length === 0) {
      const idsParam = searchParams.get("ids");
      if (idsParam) {
        idArray = idsParam.split(",").filter(Boolean);
      }
    }
    
    // Bulk delete
    if (idArray.length > 0) {
      if (effectiveStaff.role !== "superadmin" && effectiveStaff.role !== "admin") {
        const { data: reports } = await supabase
          .from("lead_reports")
          .select("id, staff_id")
          .in("id", idArray);
        
        const unauthorized = reports?.filter(r => r.staff_id !== effectiveStaff.id);
        if (unauthorized && unauthorized.length > 0) {
          return NextResponse.json({ error: "Forbidden: Some reports belong to other staff" }, { status: 403 });
        }
      }
      
      // Delete in smaller batches to avoid query limits
        const batchSize = 1000;
        let totalDeleted = 0;
        
        for (let i = 0; i < idArray.length; i += batchSize) {
          const batch = idArray.slice(i, i + batchSize);
          const { error } = await supabase
            .from("lead_reports")
            .delete()
            .in("id", batch);
          
          if (!error) totalDeleted += batch.length;
        }
        
        return NextResponse.json({ success: true, deleted: totalDeleted });
    }
    
    // Single delete
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }
    
    const { data: existingReport } = await supabase
      .from("lead_reports")
      .select("staff_id")
      .eq("id", id)
      .single();
    
    if (!existingReport) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    
    if (effectiveStaff.role !== "superadmin" && effectiveStaff.role !== "admin" && existingReport.staff_id !== effectiveStaff.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    const { error } = await supabase
      .from("lead_reports")
      .delete()
      .eq("id", id);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting lead report:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
