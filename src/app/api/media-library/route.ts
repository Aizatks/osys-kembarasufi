import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-logger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const pkg = searchParams.get("package");

  let query = supabase
    .from("creative_assets")
    .select("*, created_by(name)")
    .order("created_at", { ascending: false });

  if (category) query = query.eq("category", category);
  if (pkg) query = query.eq("package", pkg);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, category, package: pkg, file_url, file_type, userId } = body;

    const { data, error } = await supabase
      .from("creative_assets")
      .insert([
        { 
          title, 
          description, 
          category, 
          package: pkg, 
          file_url, 
          file_type, 
          created_by: userId 
        }
      ])
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logActivity({
      staffId: userId,
      action: "upload_creative_asset",
      description: `Uploaded ${category} asset: ${title}`,
      metadata: { assetId: data.id }
    });

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    // 1. Dapatkan info asset untuk buang fail di storage
    const { data: asset, error: fetchError } = await supabase
      .from("creative_assets")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // 2. Buang dari Storage jika ada URL
    if (asset.file_url) {
      try {
        const url = new URL(asset.file_url);
        const pathParts = url.pathname.split('/public/creative-assets/');
        if (pathParts.length > 1) {
          const filePath = decodeURIComponent(pathParts[1]);
          await supabase.storage.from('creative-assets').remove([filePath]);
        }
      } catch (storageErr) {
        console.error("Storage delete error:", storageErr);
      }
    }

    // 3. Buang dari Database
    const { error: deleteError } = await supabase
      .from("creative_assets")
      .delete()
      .eq("id", id);

    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

    if (userId) {
      await logActivity({
        staffId: userId,
        action: "delete_creative_asset",
        description: `Deleted asset: ${asset.title}`,
        metadata: { assetId: id }
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
