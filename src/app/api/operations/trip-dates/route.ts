import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { withAuth, withRole } from "@/lib/api-auth";

const ALLOWED_ROLES: string[] = ['tour-coordinator', 'tour-coordinator-manager', 'superadmin', 'admin'];

export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const package_id = searchParams.get("package_id");

    let query = supabaseAdmin
      .from("trip_dates")
      .select("*")
      .order("depart_date", { ascending: true });

    if (package_id) {
      query = query.eq("package_id", package_id);
    }

    const { data: trip_dates, error } = await query;

    if (error) throw error;

    return NextResponse.json({ trip_dates });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    if (!ALLOWED_ROLES.includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { 
      package_id, 
      depart_date, 
      return_date, 
      seats_total, 
      seats_available, 
      base_price_override, 
      surcharge_override 
    } = body;

    const { data, error } = await supabaseAdmin
      .from("trip_dates")
      .insert([{ 
        package_id, 
        depart_date, 
        return_date, 
        seats_total, 
        seats_available, 
        base_price_override, 
        surcharge_override,
        last_synced_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ trip_date: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const PATCH = withAuth(async (req: NextRequest, user) => {
  try {
    if (!ALLOWED_ROLES.includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { 
      id, 
      base_price_override, 
      surcharge_override, 
      seats_available,
      depart_date,
      return_date,
      seats_total
    } = body;

    const { data, error } = await supabaseAdmin
      .from("trip_dates")
      .update({ 
        base_price_override, 
        surcharge_override, 
        seats_available,
        depart_date,
        return_date,
        seats_total
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ trip_date: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
