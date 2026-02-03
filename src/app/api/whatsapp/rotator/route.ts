import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { withAuth, withRole } from "@/lib/api-auth";

export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const { data: rotators, error } = await supabaseAdmin
      .from("whatsapp_rotators")
      .select(`
        *,
        whatsapp_rotator_numbers (*)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ rotators });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const POST = withRole(['admin', 'superadmin'], async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const { name, slug, logic, pixel_id, tiktok_pixel_id } = body;

    const { data, error } = await supabaseAdmin
      .from("whatsapp_rotators")
      .insert([{ name, slug, logic, pixel_id, tiktok_pixel_id }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ rotator: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const PATCH = withRole(['admin', 'superadmin'], async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const { id, numbers } = body;

    // Delete existing numbers and insert new ones
    await supabaseAdmin.from("whatsapp_rotator_numbers").delete().eq("rotator_id", id);
    
    const { data, error } = await supabaseAdmin
      .from("whatsapp_rotator_numbers")
      .insert(numbers.map((n: any) => ({ ...n, rotator_id: id })))
      .select();

    if (error) throw error;

    return NextResponse.json({ numbers: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
