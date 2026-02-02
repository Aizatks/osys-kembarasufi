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

    const { data: memos, error } = await supabase
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
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, body: content, target_type, target_id, attachments } = body;

    const { data, error } = await supabase
      .from("hr_memos")
      .insert([{ title, body: content, target_type, target_id, attachments }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ memo: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { memo_id, staff_id } = body;

    const { data, error } = await supabase
      .from("hr_memo_acknowledgements")
      .upsert([{ memo_id, staff_id, acknowledged_at: new Date().toISOString() }], { onConflict: "memo_id,staff_id" })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ acknowledgement: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
