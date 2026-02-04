import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireWhatsAppAuth, isValidUUID } from '@/lib/whatsapp-auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SLUG_REGEX = /^[a-z0-9-]{1,50}$/;
const MAX_NAME_LENGTH = 100;

export async function GET(req: NextRequest) {
  const auth = await requireWhatsAppAuth(req);
  if (!auth.authorized) {
    return auth.response;
  }

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

export async function POST(req: NextRequest) {
  const auth = await requireWhatsAppAuth(req);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await req.json();
    const { name, slug, logic, pixel_id, tiktok_pixel_id } = body;

    if (!name || typeof name !== 'string' || name.length > MAX_NAME_LENGTH) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    }

    if (!slug || typeof slug !== 'string' || !SLUG_REGEX.test(slug)) {
      return NextResponse.json({ error: 'Invalid slug (lowercase letters, numbers, hyphens only)' }, { status: 400 });
    }

    if (logic && !['random', 'round-robin', 'weighted'].includes(logic)) {
      return NextResponse.json({ error: 'Invalid logic type' }, { status: 400 });
    }

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

export async function PATCH(req: NextRequest) {
  const auth = await requireWhatsAppAuth(req);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await req.json();
    const { id, numbers } = body;

    if (!id || !isValidUUID(id)) {
      return NextResponse.json({ error: 'Invalid rotator ID' }, { status: 400 });
    }

    if (!numbers || !Array.isArray(numbers)) {
      return NextResponse.json({ error: 'Numbers must be an array' }, { status: 400 });
    }

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
