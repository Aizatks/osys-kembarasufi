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
    let query = supabase
      .from("marketing_spending")
      .select(`
        *,
        staff:staff_id (id, name)
      `)
      .order("date", { ascending: false });
    
    if (dateFrom) {
      query = query.gte("date", dateFrom);
    }
    if (dateTo) {
      query = query.lte("date", dateTo);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error fetching marketing spending:", error);
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
        .from("marketing_spending")
        .insert({
          staff_id: staffIdToUse,
          date: body.date,
          platform: body.platform,
          is_tiktok_live: body.is_tiktok_live || false,
          nama_pakej: body.nama_pakej,
          campaign_name: body.campaign_name || null,
          amount: body.amount || 0,
        })
        .select()
        .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error creating marketing spending:", error);
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
    
      const { data, error } = await supabase
        .from("marketing_spending")
        .update({
          date: body.date,
          platform: body.platform,
          is_tiktok_live: body.is_tiktok_live,
          nama_pakej: body.nama_pakej,
          campaign_name: body.campaign_name || null,
          amount: body.amount,
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
    console.error("Error updating marketing spending:", error);
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
    
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }
    
    const supabase = getSupabase();
    const { error } = await supabase
      .from("marketing_spending")
      .delete()
      .eq("id", id);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting marketing spending:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
