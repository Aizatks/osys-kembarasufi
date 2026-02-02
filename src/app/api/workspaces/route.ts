import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const owner_id = searchParams.get("owner_id");
    const manager_id = searchParams.get("manager_id");

    let query = supabase.from("workspaces").select(`
      *,
      workspace_items (*)
    `);

    if (owner_id) {
      query = query.eq("owner_staff_id", owner_id);
    } else if (manager_id) {
      // Fetch staff under this manager
      const { data: staff } = await supabase
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
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { workspace_id, owner_staff_id, name, type, item_type, title, url, folder_path, tags } = body;

    // If no workspace_id but owner_staff_id is provided, create a NEW workspace
    if (!workspace_id && owner_staff_id) {
      const { data, error } = await supabase
        .from("workspaces")
        .insert([{ owner_staff_id, name, type }])
        .select()
        .single();
      
      if (error) throw error;
      return NextResponse.json({ workspace: data });
    }

    // Otherwise, add an item to an existing workspace
    const { data, error } = await supabase
      .from("workspace_items")
      .insert([{ workspace_id, item_type, title, url, folder_path, tags }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ item: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, title, url, folder_path, tags, old_folder_path, new_folder_path, workspace_id } = body;

    // Bulk update folder name
    if (old_folder_path && new_folder_path && workspace_id) {
      const { data, error } = await supabase
        .from("workspace_items")
        .update({ folder_path: new_folder_path })
        .eq("workspace_id", workspace_id)
        .eq("folder_path", old_folder_path)
        .select();
      
      if (error) throw error;
      return NextResponse.json({ success: true, updated: data });
    }

    // Single item update
    const { data, error } = await supabase
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
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    const { error } = await supabase
      .from("workspace_items")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
