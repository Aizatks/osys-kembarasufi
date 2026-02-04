import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const { data: pricing, error } = await supabase
      .from("package_pricing")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ pricing });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      package_id, 
      base_price, 
      visa_fee_malaysia, 
      visa_fee_singapore,
      insurance_fee, 
      tipping_fee, 
      cwob_fee, 
      cwb_fee, 
      default_surcharge,
      optional_places
    } = body;

    const { data, error } = await supabase
      .from("package_pricing")
      .upsert([{ 
        package_id, 
        base_price, 
        visa_fee_malaysia, 
        visa_fee_singapore,
        insurance_fee, 
        tipping_fee, 
        cwob_fee, 
        cwb_fee, 
        default_surcharge,
        optional_places: optional_places || [],
        effective_from: new Date().toISOString()
      }], { onConflict: 'package_id' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ pricing: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
