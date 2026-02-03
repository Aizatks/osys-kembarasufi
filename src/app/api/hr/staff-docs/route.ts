import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { withAuth, withRole } from "@/lib/api-auth";

export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const staff_id = searchParams.get("staff_id");

    let query = supabaseAdmin
      .from("hr_staff_documents")
      .select("*")
      .order("issued_at", { ascending: false });

    // Staff can only see their own documents, admin can see all
    if (!['admin', 'superadmin'].includes(user.role)) {
      query = query.eq("staff_id", user.userId);
    } else if (staff_id) {
      query = query.eq("staff_id", staff_id);
    }

    const { data: documents, error } = await query;

    if (error) throw error;

    return NextResponse.json({ documents });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const POST = withRole(['admin', 'superadmin'], async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const { staff_id, doc_type, title, file_url, issued_at, tags } = body;

    const { data, error } = await supabaseAdmin
      .from("hr_staff_documents")
      .insert([{ staff_id, doc_type, title, file_url, issued_at, tags }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ document: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const DELETE = withRole(['admin', 'superadmin'], async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    const { error } = await supabaseAdmin
      .from("hr_staff_documents")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
