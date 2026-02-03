import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { withAuth, withRole } from "@/lib/api-auth";

export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const { data: memos, error } = await supabaseAdmin
      .from("hr_memos")
      .select(`
        *,
        hr_memo_acknowledgements (staff_id, acknowledged_at)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ memos });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const POST = withRole(['admin', 'superadmin'], async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const { title, body: content, target_type, target_id, attachments } = body;

    const { data, error } = await supabaseAdmin
      .from("hr_memos")
      .insert([{ title, body: content, target_type, target_id, attachments }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ memo: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const PUT = withAuth(async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const { memo_id, staff_id } = body;

    // Users can only acknowledge memos for themselves
    if (staff_id !== user.userId && !['admin', 'superadmin'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("hr_memo_acknowledgements")
      .upsert([{ memo_id, staff_id, acknowledged_at: new Date().toISOString() }], { onConflict: "memo_id,staff_id" })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ acknowledgement: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
