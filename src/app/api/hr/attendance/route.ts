import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { withAuth } from "@/lib/api-auth";

export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const staff_id = searchParams.get("staff_id");
    const start_date = searchParams.get("start_date");
    const end_date = searchParams.get("end_date");
    
    // Check if user has HR access (admin, superadmin, hr, hr-manager)
    const hasHRAccess = ['admin', 'superadmin', 'hr', 'hr-manager', 'c-suite'].includes(user.role);

    let query = supabaseAdmin
      .from("hr_attendance_logs")
      .select("*")
      .order("timestamp", { ascending: false });

    // Staff can only see their own attendance, HR/admin can see all
    if (!hasHRAccess) {
      query = query.eq("staff_id", user.userId);
    } else if (staff_id) {
      query = query.eq("staff_id", staff_id);
    }
    
    // Date range filter
    if (start_date) {
      query = query.gte("timestamp", `${start_date}T00:00:00`);
    }
    if (end_date) {
      query = query.lte("timestamp", `${end_date}T23:59:59`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ logs: data, hasHRAccess });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const POST = withAuth(async (req: NextRequest, user) => {
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

    // Verify user can only clock in/out for themselves
    if (staff_id !== user.userId && !['admin', 'superadmin'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized - Cannot clock in/out for another user' }, { status: 403 });
    }

    // Fetch settings for geofence check
    const { data: settings } = await supabaseAdmin
      .from("hr_attendance_settings")
      .select("*")
      .single();

    // Convert type to lowercase for DB enum
    const dbType = type.toLowerCase() as 'in' | 'out';
    
    let location_status: 'ok' | 'outside' | 'no_gps' = "ok";
    if (settings && settings.geofence_enabled) {
      // Check against all allowed locations
      const locations = settings.allowed_locations || [];
      let isInRange = false;
      
      for (const loc of locations) {
        const distance = calculateDistance(latitude, longitude, loc.lat, loc.lng);
        if (distance <= (loc.radius || settings.geofence_radius)) {
          isInRange = true;
          break;
        }
      }
      
      if (!isInRange && locations.length > 0) {
        location_status = "outside";
      }
    }

    // Calculate status based on working hours
    let status: 'on_time' | 'late' | 'early_leave' | 'out_of_range' = "on_time";
    if (settings?.working_hours) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const [startH, startM] = settings.working_hours.start.split(':').map(Number);
      const [endH, endM] = settings.working_hours.end.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      
      if (dbType === 'in' && currentTime > startMinutes + 15) {
        status = "late"; // Late if more than 15 mins after start
      } else if (dbType === 'out' && currentTime < endMinutes - 30) {
        status = "early_leave"; // Early leave if more than 30 mins before end
      }
    }
    
    if (location_status === "outside") {
      status = "out_of_range";
    } 

    const { data, error } = await supabaseAdmin
      .from("hr_attendance_logs")
      .insert([{
        staff_id,
        staff_name,
        type: dbType,
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
});

// PATCH - Edit attendance (HR/Superadmin only)
export const PATCH = withAuth(async (req: NextRequest, user) => {
  try {
    // Only HR/Admin can edit attendance
    const hasHRAccess = ['admin', 'superadmin', 'hr', 'hr-manager'].includes(user.role);
    if (!hasHRAccess) {
      return NextResponse.json({ error: 'Akses ditolak - Hanya HR/Admin boleh edit rekod' }, { status: 403 });
    }

    const body = await req.json();
    const { id, timestamp, type, status, note } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID rekod diperlukan' }, { status: 400 });
    }

    const updateData: Record<string, any> = {};
    if (timestamp) updateData.timestamp = timestamp;
    if (type) updateData.type = type.toLowerCase();
    if (status) updateData.status = status;
    if (note !== undefined) updateData.note = note;

    const { data, error } = await supabaseAdmin
      .from("hr_attendance_logs")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ log: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

// DELETE - Delete attendance (HR/Superadmin only)
export const DELETE = withAuth(async (req: NextRequest, user) => {
  try {
    // Only HR/Admin can delete attendance
    const hasHRAccess = ['admin', 'superadmin', 'hr', 'hr-manager'].includes(user.role);
    if (!hasHRAccess) {
      return NextResponse.json({ error: 'Akses ditolak - Hanya HR/Admin boleh padam rekod' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: 'ID rekod diperlukan' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("hr_attendance_logs")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

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
