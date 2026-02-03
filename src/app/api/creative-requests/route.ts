import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-logger";
import { withAuth } from "@/lib/api-auth";

export const GET = withAuth(async (request: NextRequest, user) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const assignedTo = searchParams.get("assignedTo");

  let query = supabaseAdmin
    .from("creative_requests")
    .select("*, requester:staff(name), assignee:staff(name)")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (assignedTo) query = query.eq("assigned_to", assignedTo);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
});

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const body = await request.json();
    const { title, description, request_type, priority, deadline, reference_url } = body;

    const { data, error } = await supabaseAdmin
      .from("creative_requests")
      .insert([
        { 
          title, 
          description, 
          request_type, 
          priority, 
          deadline, 
          requester_id: user.userId,
          reference_url,
          status: 'pending'
        }
      ])
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logActivity({
      staffId: user.userId,
      action: "create_creative_request",
      description: `Created creative request: ${title}`,
      metadata: { requestId: data.id }
    });

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
});

export const PATCH = withAuth(async (request: NextRequest, user) => {
  try {
    const body = await request.json();
    const { id, status, assigned_to, result_url } = body;

    const { data, error } = await supabaseAdmin
      .from("creative_requests")
      .update({ status, assigned_to, result_url, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logActivity({
      staffId: user.userId,
      action: "update_creative_request",
      description: `Updated creative request status to ${status}: ${data.title}`,
      metadata: { requestId: id }
    });

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
});
