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

    // Use current UTC time — Supabase stores as TIMESTAMPTZ so timezone is preserved.
    // Frontend will display using Asia/Kuala_Lumpur timezone.
    // Previously we added +8h which caused double offset (8:32 AM → stored as 4:32 PM).
    const myTimestamp = new Date().toISOString();

    // Fetch geofence: check branch first, then fallback to global settings
    // DB enum values: location_status = "ok" | "outside"; status = "on_time" | "late" | etc
    let location_status = "ok";
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
        location_status = distance <= branch.radius ? "ok" : "outside";
        matched_branch = branch.name;
      }
    } else {
      // Auto-detect nearest branch (table might not exist yet)
      const { data: branches, error: brErr } = await supabase
        .from("hr_branches")
        .select("*")
        .eq("is_active", true);

      if (!brErr && branches && branches.length > 0) {
        let nearestDist = Infinity;
        for (const b of branches) {
          const dist = calculateDistance(latitude, longitude, b.latitude, b.longitude);
          if (dist < nearestDist) {
            nearestDist = dist;
            matched_branch = b.name;
            location_status = dist <= b.radius ? "ok" : "outside";
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
          location_status = distance <= settings.geofence_radius ? "ok" : "outside";
        }
      }
    }

    // Determine on_time / late status based on work schedule
    let status = "on_time";
    if (location_status === "outside") {
      status = "outside_geofence";
    } else if (type === "in") {
      // Check work schedule for this staff/branch
      try {
        const nowMY = new Date(new Date().getTime() + 8 * 60 * 60 * 1000);
        const currentTime = `${String(nowMY.getUTCHours()).padStart(2, "0")}:${String(nowMY.getUTCMinutes()).padStart(2, "0")}`;
        const dayOfWeek = nowMY.getUTCDay(); // 0=Sun, 1=Mon, ...

        // Priority: individual schedule > branch schedule
        let schedule = null;

        // 1. Check individual schedule
        const { data: indvSchedule } = await supabase
          .from("hr_work_schedules")
          .select("*")
          .eq("staff_id", staff_id)
          .eq("schedule_type", "individual")
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();

        if (indvSchedule) {
          schedule = indvSchedule;
        } else {
          // 2. Find nearest branch and check branch schedule
          const { data: branchSchedules } = await supabase
            .from("hr_work_schedules")
            .select("*")
            .eq("schedule_type", "branch")
            .eq("is_active", true);

          if (branchSchedules && branchSchedules.length > 0) {
            // Find schedule for matched branch or first active one
            if (matched_branch) {
              // Get branch_id from matched branch name
              const { data: matchedBr } = await supabase
                .from("hr_branches")
                .select("id")
                .eq("name", matched_branch)
                .maybeSingle();

              if (matchedBr) {
                schedule = branchSchedules.find((s: any) => s.branch_id === matchedBr.id) || null;
              }
            }
            // Fallback to any active branch schedule
            if (!schedule) schedule = branchSchedules[0];
          }
        }

        if (schedule) {
          const workDays: number[] = schedule.work_days || [1, 2, 3, 4, 5];
          const tolerance = schedule.late_tolerance || 15;
          const workStart = schedule.work_start; // "09:00"

          if (workDays.includes(dayOfWeek)) {
            // Compare current time vs work_start + tolerance
            const [startH, startM] = workStart.split(":").map(Number);
            const deadlineMinutes = startH * 60 + startM + tolerance;
            const currentMinutes = parseInt(currentTime.split(":")[0]) * 60 + parseInt(currentTime.split(":")[1]);

            if (currentMinutes > deadlineMinutes) {
              status = "late";
            }
          }
        }
      } catch (schedErr) {
        // Schedule table might not exist yet — just default to on_time
        console.error("Schedule check error (non-fatal):", schedErr);
      }
    }

    const insertData: any = {
      staff_id,
      staff_name,
      type,
      timestamp: myTimestamp,
      selfie_url,
      latitude,
      longitude,
      accuracy,
      location_status,
      status,
      note,
    };

    if (matched_branch) insertData.branch_name = matched_branch;

    // Attempt insert, with progressive fallback for missing/enum columns
    let result = await supabase.from("hr_attendance_logs").insert([insertData]).select().single();

    // Fallback 1: remove branch_name if column doesn't exist
    if (result.error?.message?.includes("branch_name")) {
      delete insertData.branch_name;
      result = await supabase.from("hr_attendance_logs").insert([insertData]).select().single();
    }

    // Fallback 2: try alternate enum values for location_status
    if (result.error?.message?.includes("location_status")) {
      // Try correct value pairs: if "ok" → try OK variants first, if "outside" → try OUTSIDE variants first
      const isInRange = location_status === "ok";
      const tryInRange = ["ok", "OK", "in_range", "within_range", "present"];
      const tryOutRange = ["outside", "OUTSIDE", "out_of_range", "out_range", "absent"];
      const tryValues = isInRange ? [...tryInRange, ...tryOutRange] : [...tryOutRange, ...tryInRange];

      for (const val of tryValues) {
        insertData.location_status = val;
        result = await supabase.from("hr_attendance_logs").insert([insertData]).select().single();
        if (!result.error) break;
        if (!result.error.message?.includes("location_status")) break;
      }
    }

    // Fallback 3: try alternate enum values for status
    if (result.error?.message?.includes("status")) {
      const tryStatusValues = ["on_time", "late", "early", "absent", "present", "On-time", "Late", "Early"];
      for (const val of tryStatusValues) {
        insertData.status = val;
        result = await supabase.from("hr_attendance_logs").insert([insertData]).select().single();
        if (!result.error) break;
        if (!result.error.message?.includes("status")) break;
      }
      // Last resort: remove status entirely
      if (result.error?.message?.includes("status")) {
        delete insertData.status;
        result = await supabase.from("hr_attendance_logs").insert([insertData]).select().single();
      }
    }

    if (result.error) throw result.error;

    // Attach location info to response for frontend display
    const logData = { ...result.data, _location_status: location_status, _branch: matched_branch };

    return NextResponse.json({ log: logData });
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
