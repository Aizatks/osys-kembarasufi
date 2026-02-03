import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { withAuth, withRole } from "@/lib/api-auth";

export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const staff_id = searchParams.get("staff_id");
    const status = searchParams.get("status");

    let query = supabaseAdmin
      .from("hr_claims")
      .select(`
        *,
        hr_claim_actions (*)
      `)
      .order("created_at", { ascending: false });

    // Staff can only see their own claims, admin can see all
    if (!['admin', 'superadmin'].includes(user.role)) {
      query = query.eq("staff_id", user.userId);
    } else if (staff_id) {
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
});

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const { staff_id, amount, category, date, attachments, remarks } = body;

    // Users can only submit claims for themselves
    if (staff_id !== user.userId && !['admin', 'superadmin'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("hr_claims")
      .insert([{ staff_id, amount, category, date, attachments, remarks, status: "Submitted" }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ claim: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const PATCH = withRole(['admin', 'superadmin'], async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const { claim_id, action_by, action, note } = body;

    // Update claim status
    const status = action === "APPROVE" ? "Approved" : action === "REJECT" ? "Rejected" : "Paid";
    
    const { error: claimError } = await supabaseAdmin
      .from("hr_claims")
      .update({ status })
      .eq("id", claim_id);

    if (claimError) throw claimError;

    // Record action
    const { data, error: actionError } = await supabaseAdmin
      .from("hr_claim_actions")
      .insert([{ claim_id, action_by, action, note, timestamp: new Date().toISOString() }])
      .select()
      .single();

    if (actionError) throw actionError;

    return NextResponse.json({ action: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
