import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { verifyToken, extractTokenFromHeader } from "@/lib/auth";

const HR_ROLES = ['admin', 'superadmin', 'hr', 'hr-manager', 'c-suite'];

// Malaysian EPF rates 2025/2026 (simplified)
function calcEPF(salary: number, employeeRate: number, employerRate: number) {
  return {
    employee: Math.round(salary * (employeeRate / 100) * 100) / 100,
    employer: Math.round(salary * (employerRate / 100) * 100) / 100,
  };
}

// SOCSO (simplified Category 1 — Employment Injury + Invalidity)
function calcSOCSO(salary: number) {
  if (salary > 5000) return { employee: 24.75, employer: 86.65 };
  if (salary > 4000) return { employee: 19.75, employer: 69.05 };
  if (salary > 3000) return { employee: 14.75, employer: 51.65 };
  if (salary > 2000) return { employee: 9.75, employer: 34.25 };
  if (salary > 1000) return { employee: 5.25, employer: 18.35 };
  return { employee: 2.50, employer: 8.80 };
}

// EIS (Employment Insurance System)
function calcEIS(salary: number) {
  const cappedSalary = Math.min(salary, 5000);
  return {
    employee: Math.round(cappedSalary * 0.002 * 100) / 100,
    employer: Math.round(cappedSalary * 0.002 * 100) / 100,
  };
}

// PCB estimate (very simplified — actual PCB requires full annual projection)
function calcPCB(salary: number, taxCategory: string) {
  const annualSalary = salary * 12;
  const epfRelief = salary * 0.11 * 12;
  const personalRelief = 9000;
  const spouseRelief = taxCategory === 'married' ? 4000 : 0;
  const taxable = Math.max(0, annualSalary - epfRelief - personalRelief - spouseRelief);

  let tax = 0;
  if (taxable > 250000) tax = 24200 + (taxable - 250000) * 0.25;
  else if (taxable > 100000) tax = 10900 + (taxable - 100000) * 0.24;
  else if (taxable > 70000) tax = 4400 + (taxable - 70000) * 0.21;
  else if (taxable > 50000) tax = 1800 + (taxable - 50000) * 0.13;
  else if (taxable > 35000) tax = 600 + (taxable - 35000) * 0.08;
  else if (taxable > 20000) tax = 150 + (taxable - 20000) * 0.03;
  else if (taxable > 5000) tax = (taxable - 5000) * 0.01;

  return Math.round((tax / 12) * 100) / 100;
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
    const { period_start, period_end, staff_ids } = body;

    if (!period_start || !period_end) {
      return NextResponse.json({ error: 'Tempoh diperlukan' }, { status: 400 });
    }

    // Get all staff with salary config
    const { data: salaries, error: salErr } = await supabase.from('hr_staff_salary').select('*');

    if (salErr || !salaries || salaries.length === 0) {
      return NextResponse.json({ error: 'Tiada konfigurasi gaji ditemui. Sila tetapkan gaji staff terlebih dahulu.' }, { status: 400 });
    }

    // Filter by staff_ids if provided
    const targetSalaries = staff_ids && staff_ids.length > 0
      ? salaries.filter((s: any) => staff_ids.includes(s.staff_id))
      : salaries;

    const generated = [];

    for (const sal of targetSalaries) {
      const basicSalary = parseFloat(sal.basic_salary);
      if (basicSalary <= 0) continue;

      const salAllowances = sal.allowances || [];
      const totalAllowances = salAllowances.reduce((sum: number, a: any) => sum + (a.amount || 0), 0);
      const grossSalary = basicSalary + totalAllowances;

      const epf = calcEPF(basicSalary, sal.epf_employee_rate || 11, sal.epf_employer_rate || 13);
      const socso = calcSOCSO(basicSalary);
      const eis = sal.eis_enabled ? calcEIS(basicSalary) : { employee: 0, employer: 0 };
      const pcb = sal.pcb_enabled ? calcPCB(basicSalary, sal.tax_category || 'single') : 0;

      const deductions = [
        { name: 'EPF (Pekerja)', amount: epf.employee },
        { name: 'SOCSO (Pekerja)', amount: socso.employee },
        ...(eis.employee > 0 ? [{ name: 'EIS (Pekerja)', amount: eis.employee }] : []),
        ...(pcb > 0 ? [{ name: 'PCB/Cukai', amount: pcb }] : []),
      ];

      const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
      const netPay = Math.round((grossSalary - totalDeductions) * 100) / 100;

      const payrollData = {
        staff_id: sal.staff_id,
        period_start,
        period_end,
        basic_salary: basicSalary,
        allowances: salAllowances,
        deductions,
        claims_amount: 0,
        total_amount: netPay,
        status: 'Draft',
        metadata: {
          epf_employer: epf.employer,
          socso_employer: socso.employer,
          eis_employer: eis.employer,
          gross_salary: grossSalary,
          total_deductions: totalDeductions,
        },
      };

      // Check if payroll already exists for this staff+period
      const { data: existing } = await supabase
        .from('hr_payroll')
        .select('id')
        .eq('staff_id', sal.staff_id)
        .eq('period_start', period_start)
        .neq('status', 'salary_config')
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('hr_payroll')
          .update(payrollData)
          .eq('id', existing.id)
          .select()
          .single();
        if (!error && data) generated.push(data);
      } else {
        const { data, error } = await supabase
          .from('hr_payroll')
          .insert([payrollData])
          .select()
          .single();
        if (!error && data) generated.push(data);
      }
    }

    return NextResponse.json({
      message: `Payroll dijana untuk ${generated.length} staff`,
      payroll: generated,
      count: generated.length,
    });
  } catch (error: any) {
    console.error('Generate payroll error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
