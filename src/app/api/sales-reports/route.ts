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
  
  // Check if this is an impersonation token
  if (payload.impersonatedBy) {
    // Get original admin user
    const { data: originalStaff } = await supabase
      .from("staff")
      .select("*")
      .eq("id", payload.impersonatedBy)
      .single();
    
    // Get the impersonated user
    const { data: targetStaff } = await supabase
      .from("staff")
      .select("*")
      .eq("id", payload.userId)
      .single();
    
    if (originalStaff && targetStaff) {
      return { staff: originalStaff, viewingAsStaff: targetStaff, isImpersonating: true };
    }
  }
  
  // Normal login - get staff from token
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
        .from("sales_reports")
        .select(`
          *,
          staff:staff_id (id, name)
        `)
        .order("date_closed", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      
      // If impersonating, show only that staff's data
      if (isImpersonating && viewingAsStaff) {
        query = query.eq("staff_id", viewingAsStaff.id);
      } else if (staff.role !== "superadmin" && staff.role !== "admin") {
        query = query.eq("staff_id", staff.id);
      } else if (staffId && staffId !== "all") {
        query = query.eq("staff_id", staffId);
      }
      
      if (dateFrom) {
        query = query.gte("date_closed", dateFrom);
      }
      if (dateTo) {
        query = query.lte("date_closed", dateTo);
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
    console.error("Error fetching sales reports:", error);
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
    
    // Use viewingAsStaff id if impersonating
    const staffIdToUse = isImpersonating && viewingAsStaff ? viewingAsStaff.id : staff.id;
    
    const { data, error } = await supabase
      .from("sales_reports")
      .insert({
        staff_id: staffIdToUse,
        bulan: body.bulan,
        no_phone: body.no_phone,
        nama_pakej: body.nama_pakej,
        date_closed: body.date_closed,
        tarikh_trip: body.tarikh_trip,
        jumlah_pax: body.jumlah_pax || 0,
        harga_pakej: body.harga_pakej || 0,
        amount_others: body.amount_others || 0,
        discount: body.discount || 0,
        total: body.total || 0,
        paid: body.paid || 0,
        status_bayaran: body.status_bayaran,
        status_peserta: body.status_peserta,
        nama_wakil_peserta: body.nama_wakil_peserta,
        remark: body.remark,
      })
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error creating sales report:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { staff } = await getAuthenticatedStaff(request);
    
    if (!staff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await request.json();
    const supabase = getSupabase();
    
    if (!body.id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }
    
    const { data: existingReport } = await supabase
      .from("sales_reports")
      .select("staff_id")
      .eq("id", body.id)
      .single();
    
    if (!existingReport) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    
    if (staff.role !== "superadmin" && staff.role !== "admin" && existingReport.staff_id !== staff.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    const { data, error } = await supabase
      .from("sales_reports")
      .update({
        bulan: body.bulan,
        no_phone: body.no_phone,
        nama_pakej: body.nama_pakej,
        date_closed: body.date_closed,
        tarikh_trip: body.tarikh_trip,
        jumlah_pax: body.jumlah_pax,
        harga_pakej: body.harga_pakej,
        amount_others: body.amount_others,
        discount: body.discount,
        total: body.total,
        paid: body.paid,
        status_bayaran: body.status_bayaran,
        status_peserta: body.status_peserta,
        nama_wakil_peserta: body.nama_wakil_peserta,
        remark: body.remark,
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
    console.error("Error updating sales report:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { staff } = await getAuthenticatedStaff(request);
    
    if (!staff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
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
      if (staff.role !== "superadmin" && staff.role !== "admin") {
        const { data: reports } = await supabase
          .from("sales_reports")
          .select("id, staff_id")
          .in("id", idArray);
        
        const unauthorized = reports?.filter(r => r.staff_id !== staff.id);
        if (unauthorized && unauthorized.length > 0) {
          return NextResponse.json({ error: "Forbidden: Some reports belong to other staff" }, { status: 403 });
        }
      }
      
      // Delete in batches to avoid query limits
      const batchSize = 1000;
      let totalDeleted = 0;
      const errors: string[] = [];
      
      for (let i = 0; i < idArray.length; i += batchSize) {
        const batch = idArray.slice(i, i + batchSize);
        
        try {
          const { error } = await supabase
            .from("sales_reports")
            .delete()
            .in("id", batch);
          
          if (error) {
            console.error("Batch delete error, trying individual:", error);
            for (const singleId of batch) {
              const { error: singleError } = await supabase
                .from("sales_reports")
                .delete()
                .eq("id", singleId);
              
              if (!singleError) {
                totalDeleted++;
              } else {
                errors.push(`ID ${singleId}: ${singleError.message}`);
              }
            }
          } else {
            totalDeleted += batch.length;
          }
        } catch (batchError) {
          console.error("Batch error:", batchError);
          for (const singleId of batch) {
            try {
              const { error: singleError } = await supabase
                .from("sales_reports")
                .delete()
                .eq("id", singleId);
              
              if (!singleError) {
                totalDeleted++;
              }
            } catch {
              // Skip this one
            }
          }
        }
      }
      
      if (errors.length > 0 && totalDeleted === 0) {
        return NextResponse.json({ error: "Failed to delete records", errors }, { status: 500 });
      }
      
      return NextResponse.json({ success: true, deleted: totalDeleted });
    }
    
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }
    
    const { data: existingReport } = await supabase
      .from("sales_reports")
      .select("staff_id")
      .eq("id", id)
      .single();
    
    if (!existingReport) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    
    if (staff.role !== "superadmin" && staff.role !== "admin" && existingReport.staff_id !== staff.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    const { error } = await supabase
      .from("sales_reports")
      .delete()
      .eq("id", id);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting sales report:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
