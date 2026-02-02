import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const { data: rotators, error } = await supabase
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
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, slug, logic, pixel_id, tiktok_pixel_id } = body;

    const { data, error } = await supabase
      .from("whatsapp_rotators")
      .insert([{ name, slug, logic, pixel_id, tiktok_pixel_id }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ rotator: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, numbers } = body;

    // Delete existing numbers and insert new ones
    await supabase.from("whatsapp_rotator_numbers").delete().eq("rotator_id", id);
    
    const { data, error } = await supabase
      .from("whatsapp_rotator_numbers")
      .insert(numbers.map((n: any) => ({ ...n, rotator_id: id })))
      .select();

    if (error) throw error;

    return NextResponse.json({ numbers: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
