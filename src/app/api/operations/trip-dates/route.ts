import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyToken, extractTokenFromHeader } from "@/lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ALLOWED_ROLES = ['tour-coordinator', 'tour-coordinator-manager', 'superadmin'];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const package_id = searchParams.get("package_id");

    let query = supabase
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
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);
    const payload = token ? verifyToken(token) : null;

    if (!payload || !ALLOWED_ROLES.includes(payload.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const { data, error } = await supabase
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
}

export async function PATCH(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);
    const payload = token ? verifyToken(token) : null;

    if (!payload || !ALLOWED_ROLES.includes(payload.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const { data, error } = await supabase
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
}
