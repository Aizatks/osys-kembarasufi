import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-logger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const assignedTo = searchParams.get("assignedTo");

  let query = supabase
    .from("creative_requests")
    .select("*, requester:staff(name), assignee:staff(name)")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (assignedTo) query = query.eq("assigned_to", assignedTo);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, request_type, priority, deadline, requester_id, reference_url } = body;

    const { data, error } = await supabase
      .from("creative_requests")
      .insert([
        { 
          title, 
          description, 
          request_type, 
          priority, 
          deadline, 
          requester_id,
          reference_url,
          status: 'pending'
        }
      ])
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logActivity({
      staffId: requester_id,
      action: "create_creative_request",
      description: `Created creative request: ${title}`,
      metadata: { requestId: data.id }
    });

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, assigned_to, result_url, userId } = body;

    const { data, error } = await supabase
      .from("creative_requests")
      .update({ status, assigned_to, result_url, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logActivity({
      staffId: userId,
      action: "update_creative_request",
      description: `Updated creative request status to ${status}: ${data.title}`,
      metadata: { requestId: id }
    });

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
