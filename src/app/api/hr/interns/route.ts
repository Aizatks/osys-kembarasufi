import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { withRole } from "@/lib/api-auth";

export const GET = withRole(['admin', 'superadmin'], async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    let query = supabaseAdmin
      .from("hr_intern_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (id) {
      query = query.eq("id", id);
    }

    const { data: interns, error } = await query;

    if (error) throw error;

    return NextResponse.json({ interns });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const POST = withRole(['admin', 'superadmin'], async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const { 
      full_name, 
      university, 
      course, 
      start_date, 
      end_date, 
      supervisor_id,
      status 
    } = body;

    const { data, error } = await supabaseAdmin
      .from("hr_intern_profiles")
      .insert([{ 
        full_name, 
        university, 
        course, 
        start_date, 
        end_date, 
        supervisor_id,
        status: status || "Active"
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ intern: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const PATCH = withRole(['admin', 'superadmin'], async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const { id, evaluation_score, status, remarks } = body;

    const { data, error } = await supabaseAdmin
      .from("hr_intern_profiles")
      .update({ evaluation_score, status, remarks })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ intern: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
