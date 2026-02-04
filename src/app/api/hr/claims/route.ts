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
    const status = searchParams.get("status");

    let query = supabase
      .from("hr_claims")
      .select(`
        *,
        hr_claim_actions (*)
      `)
      .order("created_at", { ascending: false });

    if (staff_id) {
      query = query.eq("staff_id", staff_id);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const { data: claims, error } = await query;

    if (error) throw error;

    return NextResponse.json({ claims });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { staff_id, amount, category, date, attachments, remarks } = body;

    const { data, error } = await supabase
      .from("hr_claims")
      .insert([{ staff_id, amount, category, date, attachments, remarks, status: "Submitted" }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ claim: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { claim_id, action_by, action, note } = body;

    // Update claim status
    const status = action === "APPROVE" ? "Approved" : action === "REJECT" ? "Rejected" : "Paid";
    
    const { error: claimError } = await supabase
      .from("hr_claims")
      .update({ status })
      .eq("id", claim_id);

    if (claimError) throw claimError;

    // Record action
    const { data, error: actionError } = await supabase
      .from("hr_claim_actions")
      .insert([{ claim_id, action_by, action, note, timestamp: new Date().toISOString() }])
      .select()
      .single();

    if (actionError) throw actionError;

    return NextResponse.json({ action: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
