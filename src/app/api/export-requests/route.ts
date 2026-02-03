import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { extractTokenFromHeader, verifyToken } from "@/lib/auth";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getAuthenticatedStaff(request: NextRequest) {
  // Try to get from Authorization header first (important for impersonation)
  const authHeader = request.headers.get("authorization");
  const token = extractTokenFromHeader(authHeader);
  
  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      const supabase = getSupabase();
      const { data: staff } = await supabase
        .from("staff")
        .select("*")
        .eq("id", payload.userId)
        .single();
      
      if (staff) {
        return { staff, impersonatedBy: payload.impersonatedBy };
      }
    }
  }

  // Fallback to session cookie
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");
  
  if (!sessionCookie?.value) {
    return null;
  }
  
  try {
    const session = JSON.parse(sessionCookie.value);
    const supabase = getSupabase();
    const { data: staff } = await supabase
      .from("staff")
      .select("*")
      .eq("id", session.staffId)
      .single();
    
    return staff ? { staff, impersonatedBy: null } : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const authData = await getAuthenticatedStaff(request);
    
    if (!authData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { staff, impersonatedBy } = authData;
    const supabase = getSupabase();
    let query = supabase
      .from("export_requests")
      .select(`
        *,
        staff:staff_id (id, name),
        approver:approved_by (id, name)
      `)
      .order("created_at", { ascending: false });
    
    // Non-admins only see their own requests
    // Even superadmins being impersonated should only see their own requests if they are "staff"
    if (staff.role !== "superadmin" && staff.role !== "admin") {
      query = query.eq("staff_id", staff.id);
    } else if (impersonatedBy) {
      // If a superadmin is impersonating, they should only see the requests of the person they are impersonating
      // unless they are explicitly at the export-requests management page (which they wouldn't be if impersonating)
      query = query.eq("staff_id", staff.id);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error fetching export requests:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authData = await getAuthenticatedStaff(request);
    
    if (!authData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { staff, impersonatedBy } = authData;
    const body = await request.json();
    const supabase = getSupabase();
    
    // Superadmin can export immediately, UNLESS they are impersonating someone
    if (staff.role === "superadmin" && !impersonatedBy) {
      const reportData = await fetchReportData(supabase, body.report_type, body.date_from, body.date_to, body.staff_id);
      return NextResponse.json({ 
        data: reportData,
        approved: true,
        message: "Export berjaya" 
      });
    }
    
    const { data, error } = await supabase
      .from("export_requests")
      .insert({
        staff_id: staff.id,
        report_type: body.report_type,
        date_from: body.date_from,
        date_to: body.date_to,
        status: "pending",
      })
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      data, 
      approved: false,
      message: "Permintaan export telah dihantar. Menunggu kelulusan admin." 
    });
  } catch (error) {
    console.error("Error creating export request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authData = await getAuthenticatedStaff(request);
    
    if (!authData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { staff } = authData;
    
    if (staff.role !== "superadmin" && staff.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    const body = await request.json();
    const supabase = getSupabase();
    
    if (!body.id || !body.action) {
      return NextResponse.json({ error: "ID and action are required" }, { status: 400 });
    }
    
    const { data: existingRequest } = await supabase
      .from("export_requests")
      .select("*")
      .eq("id", body.id)
      .single();
    
    if (!existingRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    
    const newStatus = body.action === "approve" ? "approved" : "rejected";
    
    const { data, error } = await supabase
      .from("export_requests")
      .update({
        status: newStatus,
        approved_by: staff.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.id)
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    let reportData = null;
    if (body.action === "approve") {
      reportData = await fetchReportData(
        supabase, 
        existingRequest.report_type, 
        existingRequest.date_from, 
        existingRequest.date_to,
        existingRequest.staff_id
      );
    }
    
    return NextResponse.json({ 
      data,
      reportData,
      message: body.action === "approve" ? "Permintaan diluluskan" : "Permintaan ditolak"
    });
  } catch (error) {
    console.error("Error updating export request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function fetchReportData(
  supabase: ReturnType<typeof createClient>,
  reportType: string,
  dateFrom: string,
  dateTo: string,
  staffId?: string
) {
  const tableName = reportType === "sales" ? "sales_reports" : "lead_reports";
  const dateField = reportType === "sales" ? "date_closed" : "date_lead";
  
  let query = supabase
    .from(tableName)
    .select(`*, staff:staff_id (id, name)`)
    .gte(dateField, dateFrom)
    .lte(dateField, dateTo)
    .order(dateField, { ascending: false });
  
  if (staffId && staffId !== "all") {
    query = query.eq("staff_id", staffId);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data;
}

export async function DELETE(request: NextRequest) {
  try {
    const staff = await getAuthenticatedStaff();
    
    if (!staff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const supabase = getSupabase();
    
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }
    
    const { data: existingRequest } = await supabase
      .from("export_requests")
      .select("staff_id, status")
      .eq("id", id)
      .single();
    
    if (!existingRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    
    if (staff.role !== "superadmin" && existingRequest.staff_id !== staff.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    if (existingRequest.status !== "pending" && staff.role !== "superadmin") {
      return NextResponse.json({ error: "Cannot delete non-pending request" }, { status: 400 });
    }
    
    const { error } = await supabase
      .from("export_requests")
      .delete()
      .eq("id", id);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting export request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
