import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { verifyToken, extractTokenFromHeader } from "@/lib/auth";

const HR_ROLES = ['admin', 'superadmin', 'hr', 'hr-manager', 'c-suite'];

async function ensurePerformanceTable() {
  try {
    await supabase.rpc('exec_ddl', {
      ddl: `CREATE TABLE IF NOT EXISTS hr_performance_scores (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        staff_id UUID NOT NULL,
        staff_name TEXT,
        year INT NOT NULL,
        month INT NOT NULL,
        working_days INT DEFAULT 0,
        days_present INT DEFAULT 0,
        days_late INT DEFAULT 0,
        days_absent INT DEFAULT 0,
        days_leave INT DEFAULT 0,
        score DECIMAL(5,1) DEFAULT 0,
        details JSONB,
        calculated_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(staff_id, year, month)
      );`
    });
  } catch { /* table may already exist */ }
}

// Calculate performance score for a staff member for a given month
async function calculateStaffScore(staffId: string, year: number, month: number) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0); // Last day of month
  const endStr = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

  // Get attendance logs for this month
  const { data: logs } = await supabase
    .from('hr_attendance_logs')
    .select('*')
    .eq('staff_id', staffId)
    .gte('timestamp', `${startDate}T00:00:00+08:00`)
    .lte('timestamp', `${endStr}T23:59:59+08:00`);

  // Get leave requests (approved) for this month
  const { data: leaves } = await supabase
    .from('hr_leave_requests')
    .select('*')
    .eq('staff_id', staffId)
    .eq('status', 'approved')
    .lte('start_date', endStr)
    .gte('end_date', startDate);

  // Calculate working days (Mon-Fri)
  let workingDays = 0;
  const date = new Date(year, month - 1, 1);
  while (date.getMonth() === month - 1) {
    const day = date.getDay();
    if (day !== 0 && day !== 6) workingDays++;
    date.setDate(date.getDate() + 1);
  }

  // Count attendance days (unique dates with clock-in)
  const clockInDates = new Set<string>();
  let lateDays = 0;

  (logs || []).forEach((log: any) => {
    if (log.type === 'in') {
      const logDate = new Date(log.timestamp).toISOString().split('T')[0];
      clockInDates.add(logDate);
      if (log.status === 'late') lateDays++;
    }
  });

  const daysPresent = clockInDates.size;
  const daysLeave = (leaves || []).reduce((sum: number, l: any) => sum + parseFloat(l.total_days || 0), 0);
  const daysAbsent = Math.max(0, workingDays - daysPresent - daysLeave);

  // Score formula:
  // On-time attendance: +10 pts per day
  // Late: +5 pts per day
  // Leave (approved): +7 pts per day (neutral-ish)
  // Absent: 0 pts
  const onTimeDays = daysPresent - lateDays;
  const totalPoints = (onTimeDays * 10) + (lateDays * 5) + (daysLeave * 7);
  const maxPoints = workingDays * 10;
  const score = workingDays > 0 ? Math.round((totalPoints / maxPoints) * 100 * 10) / 10 : 0;

  return {
    working_days: workingDays,
    days_present: daysPresent,
    days_late: lateDays,
    days_absent: daysAbsent,
    days_leave: daysLeave,
    score: Math.min(100, score),
    details: {
      on_time_days: onTimeDays,
      late_days: lateDays,
      total_points: totalPoints,
      max_points: maxPoints,
    },
  };
}

export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    await ensurePerformanceTable();

    const { searchParams } = new URL(req.url);
    const staff_id = searchParams.get('staff_id');
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null;
    const isHR = HR_ROLES.includes(payload.role);

    let query = supabase
      .from('hr_performance_scores')
      .select('*')
      .eq('year', year)
      .order('month', { ascending: false });

    if (month) query = query.eq('month', month);
    if (staff_id) query = query.eq('staff_id', staff_id);
    else if (!isHR) query = query.eq('staff_id', payload.userId);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ scores: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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

    await ensurePerformanceTable();

    const body = await req.json();
    const { year, month } = body;

    if (!year || !month) {
      return NextResponse.json({ error: 'Tahun dan bulan diperlukan' }, { status: 400 });
    }

    // Get all approved staff
    const { data: allStaff } = await supabase
      .from('staff')
      .select('id, name')
      .eq('status', 'approved')
      .neq('role', 'unassigned');

    if (!allStaff || allStaff.length === 0) {
      return NextResponse.json({ error: 'Tiada staff aktif' }, { status: 400 });
    }

    const results = [];

    for (const staff of allStaff) {
      const scoreData = await calculateStaffScore(staff.id, year, month);

      const { data, error } = await supabase
        .from('hr_performance_scores')
        .upsert({
          staff_id: staff.id,
          staff_name: staff.name,
          year,
          month,
          ...scoreData,
          calculated_at: new Date().toISOString(),
        }, { onConflict: 'staff_id,year,month' })
        .select()
        .single();

      if (!error && data) results.push(data);
    }

    return NextResponse.json({
      message: `Prestasi dikira untuk ${results.length} staff`,
      scores: results,
    });
  } catch (error: any) {
    console.error('Performance calculation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
