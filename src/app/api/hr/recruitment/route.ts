import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { withRole } from "@/lib/api-auth";

export const GET = withRole(['admin', 'superadmin'], async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    let query = supabaseAdmin
      .from("hr_recruitment")
      .select("*")
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data: applicants, error } = await query;

    if (error) throw error;

    return NextResponse.json({ applicants });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const POST = withRole(['admin', 'superadmin'], async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const { 
      full_name, 
      email, 
      phone, 
      position, 
      cv_url, 
      notes,
      status 
    } = body;

    const { data, error } = await supabaseAdmin
      .from("hr_recruitment")
      .insert([{ 
        full_name, 
        email, 
        phone, 
        position, 
        cv_url, 
        notes,
        status: status || "Applied"
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ applicant: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const PATCH = withRole(['admin', 'superadmin'], async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const { id, status, notes, interview_date } = body;

    const { data, error } = await supabaseAdmin
      .from("hr_recruitment")
      .update({ status, notes, interview_date })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ applicant: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
