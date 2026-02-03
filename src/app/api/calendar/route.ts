import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { withAuth, withRole } from "@/lib/api-auth";

export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const staff_id = searchParams.get("staff_id");
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    let query = supabaseAdmin
      .from("calendar_events")
      .select("*")
      .order("start_at", { ascending: true });

    // Staff can only see their own events, admin can see all
    if (!['admin', 'superadmin'].includes(user.role)) {
      query = query.eq("staff_id", user.userId);
    } else if (staff_id) {
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
});

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const { staff_id, title, start_at, end_at, type, metadata } = body;

    // Users can only create events for themselves (unless admin)
    if (staff_id !== user.userId && !['admin', 'superadmin'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("calendar_events")
      .insert([{ staff_id, title, start_at, end_at, type, metadata }])
      .select()
      .single();

    if (error) throw error;

    // Create notification record
    await supabaseAdmin.from("notifications").insert([{
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
});

export const DELETE = withAuth(async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    // Check ownership
    const { data: event } = await supabaseAdmin
      .from("calendar_events")
      .select("staff_id")
      .eq("id", id)
      .single();

    if (event && event.staff_id !== user.userId && !['admin', 'superadmin'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from("calendar_events")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
