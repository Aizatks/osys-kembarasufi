import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const staff_id = searchParams.get("staff_id");
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    let query = supabase
      .from("calendar_events")
      .select("*")
      .order("start_at", { ascending: true });

    if (staff_id) {
      query = query.eq("staff_id", staff_id);
    }
    if (start && end) {
      query = query.gte("start_at", start).lte("end_at", end);
    }

    const { data: events, error } = await query;

    if (error) throw error;

    return NextResponse.json({ events });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { staff_id, title, start_at, end_at, type, metadata } = body;

    const { data, error } = await supabase
      .from("calendar_events")
      .insert([{ staff_id, title, start_at, end_at, type, metadata }])
      .select()
      .single();

    if (error) throw error;

    // Create notification record
    await supabase.from("notifications").insert([{
      staff_id,
      channel: "IN_APP",
      message: `Event baru: ${title} pada ${new Date(start_at).toLocaleDateString()}`,
      scheduled_at: start_at,
      status: "PENDING"
    }]);

    return NextResponse.json({ event: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    const { error } = await supabase
      .from("calendar_events")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
