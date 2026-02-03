import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-logger";
import { withAuth } from "@/lib/api-auth";

export const GET = withAuth(async (request: NextRequest, user) => {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const pkg = searchParams.get("package");

  let query = supabaseAdmin
    .from("creative_assets")
    .select("*, created_by(name)")
    .order("created_at", { ascending: false });

  if (category) query = query.eq("category", category);
  if (pkg) query = query.eq("package", pkg);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
});

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const body = await request.json();
    const { title, description, category, package: pkg, file_url, file_type } = body;

    const { data, error } = await supabaseAdmin
      .from("creative_assets")
      .insert([
        { 
          title, 
          description, 
          category, 
          package: pkg, 
          file_url, 
          file_type, 
          created_by: user.userId 
        }
      ])
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logActivity({
      staffId: user.userId,
      action: "upload_creative_asset",
      description: `Uploaded ${category} asset: ${title}`,
      metadata: { assetId: data.id }
    });

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
});

export const DELETE = withAuth(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    // 1. Dapatkan info asset untuk buang fail di storage
    const { data: asset, error: fetchError } = await supabaseAdmin
      .from("creative_assets")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Check ownership or admin role
    if (asset.created_by !== user.userId && !['admin', 'superadmin'].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // 2. Buang dari Storage jika ada URL
    if (asset.file_url) {
      try {
        const url = new URL(asset.file_url);
        const pathParts = url.pathname.split('/public/creative-assets/');
        if (pathParts.length > 1) {
          const filePath = decodeURIComponent(pathParts[1]);
          await supabaseAdmin.storage.from('creative-assets').remove([filePath]);
        }
      } catch (storageErr) {
        console.error("Storage delete error:", storageErr);
      }
    }

    // 3. Buang dari Database
    const { error: deleteError } = await supabaseAdmin
      .from("creative_assets")
      .delete()
      .eq("id", id);

    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

    await logActivity({
      staffId: user.userId,
      action: "delete_creative_asset",
      description: `Deleted asset: ${asset.title}`,
      metadata: { assetId: id }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
});
