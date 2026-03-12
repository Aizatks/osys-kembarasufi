import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("hr_branches")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      // Table doesn't exist
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        return NextResponse.json({ branches: [], needsSetup: true });
      }
      throw error;
    }

    return NextResponse.json({ branches: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, address, latitude, longitude, radius, is_active } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Nama cawangan wajib diisi" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("hr_branches")
      .insert([{
        name: name.trim(),
        address: address?.trim() || null,
        latitude: latitude || 0,
        longitude: longitude || 0,
        radius: radius || 200,
        is_active: is_active !== false,
      }])
      .select()
      .single();

    if (error) {
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        return NextResponse.json({
          error: "Jadual hr_branches belum dibuat.",
          needsSetup: true,
          setupSql: `CREATE TABLE IF NOT EXISTS hr_branches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  latitude DOUBLE PRECISION DEFAULT 0,
  longitude DOUBLE PRECISION DEFAULT 0,
  radius INTEGER DEFAULT 200,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`
        }, { status: 500 });
      }
      throw error;
    }

    return NextResponse.json({ branch: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, name, address, latitude, longitude, radius, is_active } = body;

    if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (latitude !== undefined) updateData.latitude = latitude;
    if (longitude !== undefined) updateData.longitude = longitude;
    if (radius !== undefined) updateData.radius = radius;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabase
      .from("hr_branches")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ branch: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

    const { error } = await supabase
      .from("hr_branches")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
