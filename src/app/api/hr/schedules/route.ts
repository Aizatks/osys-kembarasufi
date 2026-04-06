import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Fetch all schedules (branch-level and individual)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const branch_id = searchParams.get("branch_id");
    const staff_id = searchParams.get("staff_id");

    let query = supabase
      .from("hr_work_schedules")
      .select("*")
      .order("created_at", { ascending: false });

    if (branch_id) query = query.eq("branch_id", branch_id);
    if (staff_id) query = query.eq("staff_id", staff_id);

    const { data, error } = await query;

    if (error) {
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        return NextResponse.json({
          schedules: [],
          needsSetup: true,
          setupSql: SETUP_SQL,
        });
      }
      throw error;
    }

    return NextResponse.json({ schedules: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create new schedule
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      schedule_type, // "branch" or "individual"
      branch_id,
      staff_id,
      staff_name,
      work_start,   // "09:00"
      work_end,     // "18:00"
      late_tolerance, // minutes grace period (e.g. 15)
      work_days,    // [1,2,3,4,5] = Mon-Fri
      is_active,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Nama jadual wajib diisi" }, { status: 400 });
    }
    if (!work_start || !work_end) {
      return NextResponse.json({ error: "Waktu mula dan tamat wajib diisi" }, { status: 400 });
    }

    const insertData: any = {
      name: name.trim(),
      schedule_type: schedule_type || "branch",
      work_start,
      work_end,
      late_tolerance: late_tolerance || 15,
      work_days: work_days || [1, 2, 3, 4, 5],
      is_active: is_active !== false,
    };

    if (branch_id) insertData.branch_id = branch_id;
    if (staff_id) insertData.staff_id = staff_id;
    if (staff_name) insertData.staff_name = staff_name;

    const { data, error } = await supabase
      .from("hr_work_schedules")
      .insert([insertData])
      .select()
      .single();

    if (error) {
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        return NextResponse.json({ error: "Jadual belum dibuat", needsSetup: true, setupSql: SETUP_SQL }, { status: 500 });
      }
      throw error;
    }

    return NextResponse.json({ schedule: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Update schedule
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

    const { data, error } = await supabase
      .from("hr_work_schedules")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ schedule: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove schedule
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

    const { error } = await supabase.from("hr_work_schedules").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

const SETUP_SQL = `CREATE TABLE IF NOT EXISTS hr_work_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  schedule_type TEXT DEFAULT 'branch' CHECK (schedule_type IN ('branch', 'individual')),
  branch_id UUID REFERENCES hr_branches(id) ON DELETE CASCADE,
  staff_id TEXT,
  staff_name TEXT,
  work_start TIME NOT NULL DEFAULT '09:00',
  work_end TIME NOT NULL DEFAULT '18:00',
  late_tolerance INTEGER DEFAULT 15,
  work_days INTEGER[] DEFAULT '{1,2,3,4,5}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`;
