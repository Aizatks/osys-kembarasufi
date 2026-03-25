import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyToken, extractTokenFromHeader } from "@/lib/auth";
import { cleanPhoneNumber } from "@/lib/phone-utils";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = extractTokenFromHeader(authHeader);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");
    const excludeId = searchParams.get("exclude_id");

    if (!phone) {
      return NextResponse.json({ error: "Phone is required" }, { status: 400 });
    }

    const cleaned = cleanPhoneNumber(phone);
    if (!cleaned) {
      return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
    }

    const supabase = getSupabase();

    // Find ALL records with this phone number, ordered by date
    let query = supabase
      .from("lead_reports")
      .select("id, nama_pakej, date_lead, bulan, is_duplicate, staff:staff_id (id, name)")
      .eq("no_phone", cleaned)
      .order("date_lead", { ascending: true })
      .order("created_at", { ascending: true });

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      occurrences: data || [],
      total: data?.length || 0,
    });
  } catch (error) {
    console.error("Error looking up original lead:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
