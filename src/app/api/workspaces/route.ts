import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { withAuth } from "@/lib/api-auth";

export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const owner_id = searchParams.get("owner_id");
    const manager_id = searchParams.get("manager_id");

    let query = supabaseAdmin.from("workspaces").select(`
      *,
      workspace_items (*)
    `);

    // Non-admin users can only see their own workspaces
    if (!['admin', 'superadmin'].includes(user.role)) {
      query = query.eq("owner_staff_id", user.userId);
    } else if (owner_id) {
      query = query.eq("owner_staff_id", owner_id);
    } else if (manager_id) {
      // Fetch staff under this manager
      const { data: staff } = await supabaseAdmin
        .from("staff")
        .select("id")
        .eq("manager_id", manager_id);
      
      const staffIds = staff?.map(s => s.id) || [];
      query = query.in("owner_staff_id", [manager_id, ...staffIds]);
    }

    const { data: workspaces, error } = await query;

    if (error) throw error;

    return NextResponse.json({ workspaces });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const { workspace_id, owner_staff_id, name, type, item_type, title, url, folder_path, tags } = body;

    // If no workspace_id but owner_staff_id is provided, create a NEW workspace
    if (!workspace_id && owner_staff_id) {
      // Users can only create workspaces for themselves (unless admin)
      if (owner_staff_id !== user.userId && !['admin', 'superadmin'].includes(user.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      const { data, error } = await supabaseAdmin
        .from("workspaces")
        .insert([{ owner_staff_id, name, type }])
        .select()
        .single();
      
      if (error) throw error;
      return NextResponse.json({ workspace: data });
    }

    // Otherwise, add an item to an existing workspace
    const { data, error } = await supabaseAdmin
      .from("workspace_items")
      .insert([{ workspace_id, item_type, title, url, folder_path, tags }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ item: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const PATCH = withAuth(async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const { id, title, url, folder_path, tags, old_folder_path, new_folder_path, workspace_id } = body;

    // Bulk update folder name
    if (old_folder_path && new_folder_path && workspace_id) {
      const { data, error } = await supabaseAdmin
        .from("workspace_items")
        .update({ folder_path: new_folder_path })
        .eq("workspace_id", workspace_id)
        .eq("folder_path", old_folder_path)
        .select();
      
      if (error) throw error;
      return NextResponse.json({ success: true, updated: data });
    }

    // Single item update
    const { data, error } = await supabaseAdmin
      .from("workspace_items")
      .update({ title, url, folder_path, tags })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ item: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const DELETE = withAuth(async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    const { error } = await supabaseAdmin
      .from("workspace_items")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
