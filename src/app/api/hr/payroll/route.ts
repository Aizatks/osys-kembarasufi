import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { withAuth, withRole } from "@/lib/api-auth";

export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const staff_id = searchParams.get("staff_id");
    const period = searchParams.get("period");

    let query = supabaseAdmin
      .from("hr_payroll")
      .select("*")
      .order("period_start", { ascending: false });

    // Staff can only see their own payroll, admin can see all
    if (!['admin', 'superadmin'].includes(user.role)) {
      query = query.eq("staff_id", user.userId);
    } else if (staff_id) {
      query = query.eq("staff_id", staff_id);
    }
    
    if (period) {
      query = query.eq("period_start", period);
    }

    const { data: payroll, error } = await query;

    if (error) throw error;

    return NextResponse.json({ payroll });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const POST = withRole(['admin', 'superadmin'], async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const { 
      staff_id, 
      period_start, 
      period_end, 
      basic_salary, 
      allowances, 
      deductions, 
      claims_amount 
    } = body;

    const total_amount = basic_salary + (allowances?.reduce((a: any, b: any) => a + b.amount, 0) || 0) - (deductions?.reduce((a: any, b: any) => a + b.amount, 0) || 0) + (claims_amount || 0);

    const { data, error } = await supabaseAdmin
      .from("hr_payroll")
      .insert([{ 
        staff_id, 
        period_start, 
        period_end, 
        basic_salary, 
        allowances, 
        deductions, 
        claims_amount,
        total_amount,
        status: "Draft"
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ payroll: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const PATCH = withRole(['admin', 'superadmin'], async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const { id, status } = body;

    const updateData: any = { status };
    if (status === "Paid") {
      updateData.paid_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from("hr_payroll")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ payroll: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
