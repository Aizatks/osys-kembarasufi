import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    let query = supabase
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
}

export async function POST(req: Request) {
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

    const { data, error } = await supabase
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
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, evaluation_score, status, remarks } = body;

    const { data, error } = await supabase
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
}
