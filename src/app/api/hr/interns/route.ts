import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS hr_intern_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  university TEXT NOT NULL,
  course TEXT,
  start_date DATE,
  end_date DATE,
  supervisor_id TEXT,
  status TEXT DEFAULT 'Active',
  evaluation_score INTEGER,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
`;

async function tryCreateTable() {
  // Try using pg_catalog to run raw SQL via supabase
  try {
    await supabase.from("hr_intern_profiles").select("id").limit(1);
  } catch {
    // ignore
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("hr_intern_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      // Table doesn't exist
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        return NextResponse.json({
          interns: [],
          needsSetup: true,
          setupSql: CREATE_TABLE_SQL.trim()
        });
      }
      throw error;
    }

    return NextResponse.json({ interns: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { full_name, university, course, start_date, end_date, supervisor_id, status } = body;

    if (!full_name?.trim() || !university?.trim()) {
      return NextResponse.json({ error: "Nama penuh dan universiti wajib diisi" }, { status: 400 });
    }

    const insertData: any = {
      full_name: full_name.trim(),
      university: university.trim(),
      course: course?.trim() || null,
      start_date: start_date || null,
      end_date: end_date || null,
      status: status || "Active",
    };
    if (supervisor_id) insertData.supervisor_id = supervisor_id;

    const { data, error } = await supabase
      .from("hr_intern_profiles")
      .insert([insertData])
      .select()
      .single();

    if (error) {
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        return NextResponse.json({
          error: "Jadual belum dibuat. Sila buka Supabase SQL Editor dan jalankan SQL setup.",
          needsSetup: true,
          setupSql: CREATE_TABLE_SQL.trim()
        }, { status: 500 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ intern: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, full_name, university, course, start_date, end_date, status, evaluation_score, remarks } = body;

    if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

    const updateData: any = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (university !== undefined) updateData.university = university;
    if (course !== undefined) updateData.course = course;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (end_date !== undefined) updateData.end_date = end_date;
    if (status !== undefined) updateData.status = status;
    if (evaluation_score !== undefined) updateData.evaluation_score = evaluation_score;
    if (remarks !== undefined) updateData.remarks = remarks;

    const { data, error } = await supabase
      .from("hr_intern_profiles")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ intern: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

    const { error } = await supabase
      .from("hr_intern_profiles")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
