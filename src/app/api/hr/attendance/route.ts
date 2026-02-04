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
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

    let query = supabase
      .from("hr_attendance_logs")
      .select("*")
      .order("timestamp", { ascending: false });

    if (staff_id) {
      query = query.eq("staff_id", staff_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ logs: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      staff_id, 
      staff_name, 
      type, 
      selfie_url, 
      latitude, 
      longitude, 
      accuracy,
      note 
    } = body;

    // Fetch settings for geofence check
    const { data: settings } = await supabase
      .from("hr_attendance_settings")
      .select("*")
      .single();

    let location_status = "OK";
    if (settings && settings.geofence_enabled) {
      const distance = calculateDistance(
        latitude, 
        longitude, 
        settings.hq_latitude, 
        settings.hq_longitude
      );
      if (distance > settings.geofence_radius) {
        location_status = "OUTSIDE";
      }
    }

    // Determine status (On-time, Late, etc.)
    // Simplified logic for now
    const status = "On-time"; 

    const { data, error } = await supabase
      .from("hr_attendance_logs")
      .insert([{
        staff_id,
        staff_name,
        type,
        timestamp: new Date().toISOString(),
        selfie_url,
        latitude,
        longitude,
        accuracy,
        location_status,
        status,
        note
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ log: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // in metres
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
    }

    const { error } = await supabase
      .from("hr_attendance_logs")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, type, status, timestamp, note } = body;

    if (!id) {
      return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("hr_attendance_logs")
      .update({ type, status, timestamp, note, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ log: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
