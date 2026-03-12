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
    const all = searchParams.get("all");
    const start_date = searchParams.get("start_date");
    const end_date = searchParams.get("end_date");

    let query = supabase
      .from("hr_attendance_logs")
      .select("*")
      .order("timestamp", { ascending: false });

    // If not "all", filter by staff_id
    if (!all && staff_id) {
      query = query.eq("staff_id", staff_id);
    }

    // Date filters
    if (start_date) {
      query = query.gte("timestamp", `${start_date}T00:00:00.000Z`);
    }
    if (end_date) {
      query = query.lte("timestamp", `${end_date}T23:59:59.999Z`);
    }

    // If no date filter and not "all", default to today only
    if (!start_date && !end_date && !all) {
      const today = new Date();
      // Use Malaysia timezone (UTC+8)
      const myDate = new Date(today.getTime() + 8 * 60 * 60 * 1000);
      const todayStr = myDate.toISOString().split("T")[0];
      query = query.gte("timestamp", `${todayStr}T00:00:00+08:00`)
                   .lte("timestamp", `${todayStr}T23:59:59+08:00`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ logs: data || [] });
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
      note,
      branch_id
    } = body;

    // Malaysia timestamp
    const nowMY = new Date(Date.now() + 8 * 60 * 60 * 1000);

    // Fetch geofence: check branch first, then fallback to global settings
    let location_status = "OK";
    let matched_branch = null;

    if (branch_id) {
      // Check specific branch
      const { data: branch } = await supabase
        .from("hr_branches")
        .select("*")
        .eq("id", branch_id)
        .single();

      if (branch) {
        const distance = calculateDistance(latitude, longitude, branch.latitude, branch.longitude);
        location_status = distance <= branch.radius ? "OK" : "OUTSIDE";
        matched_branch = branch.name;
      }
    } else {
      // Auto-detect nearest branch
      const { data: branches } = await supabase
        .from("hr_branches")
        .select("*")
        .eq("is_active", true);

      if (branches && branches.length > 0) {
        let nearestDist = Infinity;
        for (const b of branches) {
          const dist = calculateDistance(latitude, longitude, b.latitude, b.longitude);
          if (dist < nearestDist) {
            nearestDist = dist;
            matched_branch = b.name;
            location_status = dist <= b.radius ? "OK" : "OUTSIDE";
          }
        }
      } else {
        // Fallback to legacy settings
        const { data: settings } = await supabase
          .from("hr_attendance_settings")
          .select("*")
          .single();

        if (settings?.geofence_enabled) {
          const distance = calculateDistance(latitude, longitude, settings.hq_latitude, settings.hq_longitude);
          location_status = distance <= settings.geofence_radius ? "OK" : "OUTSIDE";
        }
      }
    }

    const status = location_status === "OUTSIDE" ? "outside_geofence" : "on_time";

    const { data, error } = await supabase
      .from("hr_attendance_logs")
      .insert([{
        staff_id,
        staff_name,
        type,
        timestamp: nowMY.toISOString(),
        selfie_url,
        latitude,
        longitude,
        accuracy,
        location_status,
        status,
        note,
        branch_name: matched_branch
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
  const R = 6371e3;
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) *
    Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
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
