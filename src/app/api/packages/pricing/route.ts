import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { withAuth, withRole } from "@/lib/api-auth";

export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const { data: pricing, error } = await supabaseAdmin
      .from("package_pricing")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ pricing });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const POST = withRole(['admin', 'superadmin'], async (req: NextRequest, user) => {
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

    const { data, error } = await supabaseAdmin
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
});
