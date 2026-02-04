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

    let query = supabase
      .from("hr_staff_documents")
      .select("*")
      .order("issued_at", { ascending: false });

    if (staff_id) {
      query = query.eq("staff_id", staff_id);
    }

    const { data: documents, error } = await query;

    if (error) throw error;

    return NextResponse.json({ documents });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { staff_id, doc_type, title, file_url, issued_at, tags } = body;

    const { data, error } = await supabase
      .from("hr_staff_documents")
      .insert([{ staff_id, doc_type, title, file_url, issued_at, tags }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ document: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    const { error } = await supabase
      .from("hr_staff_documents")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
