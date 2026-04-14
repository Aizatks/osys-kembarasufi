import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { verifyToken, extractTokenFromHeader } from "@/lib/auth";

const HR_ROLES = ['admin', 'superadmin', 'hr', 'hr-manager', 'c-suite'];

export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || !HR_ROLES.includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const staff_id = searchParams.get('staff_id');

    let query = supabase.from('hr_staff_salary').select('*');
    if (staff_id) query = query.eq('staff_id', staff_id);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ salaries: data || [] });
  } catch (error: any) {
    console.error('Salary GET error:', error);
    return NextResponse.json({ salaries: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || !HR_ROLES.includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { staff_id, basic_salary, allowances, epf_employee_rate, epf_employer_rate, socso_category, eis_enabled, tax_category, pcb_enabled, bank_name, bank_account } = body;

    if (!staff_id || basic_salary === undefined) {
      return NextResponse.json({ error: 'staff_id dan basic_salary diperlukan' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('hr_staff_salary')
      .upsert({
        staff_id,
        basic_salary,
        epf_employee_rate: epf_employee_rate ?? 11,
        epf_employer_rate: epf_employer_rate ?? 13,
        socso_category: socso_category ?? 1,
        eis_enabled: eis_enabled ?? true,
        tax_category: tax_category ?? 'single',
        pcb_enabled: pcb_enabled ?? true,
        bank_name,
        bank_account,
        allowances: allowances || [],
        updated_at: new Date().toISOString(),
      }, { onConflict: 'staff_id' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ salary: data });
  } catch (error: any) {
    console.error('Salary POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
