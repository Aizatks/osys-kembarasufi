import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    if (!token) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || !['admin', 'superadmin', 'pengurus', 'c-suite'].includes(payload.role)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staff_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!staffId || !startDate || !endDate) {
      return NextResponse.json({ error: 'staff_id, start_date, end_date diperlukan' }, { status: 400 });
    }

    // Get staff info
    const { data: staff } = await supabase
      .from('staff')
      .select('id, name, category')
      .eq('id', staffId)
      .single();

    // Get all daily tasks with template info for this staff in date range
    const { data: tasks } = await supabase
      .from('daily_tasks')
      .select(`
        id, task_date, is_completed, template_id,
        template:task_templates!inner(id, title, category, points, indicator_type, weightage)
      `)
      .eq('staff_id', staffId)
      .gte('task_date', startDate)
      .lte('task_date', endDate)
      .eq('task_templates.category', 'daily')
      .order('task_date', { ascending: true });

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({
        staff,
        breakdown: [],
        summary: { total: 0, completed: 0, missed: 0 },
        period: { start: startDate, end: endDate },
      });
    }

    // Group by template
    const templateMap: Record<string, {
      template_id: string;
      title: string;
      indicator_type: string;
      total: number;
      completed: number;
      missed_dates: string[];
    }> = {};

    for (const task of tasks) {
      const t = task.template as any;
      if (!t) continue;
      const tid = t.id;

      if (!templateMap[tid]) {
        templateMap[tid] = {
          template_id: tid,
          title: t.title,
          indicator_type: t.indicator_type || 'KPI',
          total: 0,
          completed: 0,
          missed_dates: [],
        };
      }

      templateMap[tid].total++;
      if (task.is_completed) {
        templateMap[tid].completed++;
      } else {
        templateMap[tid].missed_dates.push(task.task_date);
      }
    }

    // Build breakdown array sorted by completion rate ascending (worst first)
    const breakdown = Object.values(templateMap).map((item) => ({
      ...item,
      completion_rate: item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0,
      missed: item.total - item.completed,
      missed_dates: item.missed_dates, // all missed dates
    })).sort((a, b) => a.completion_rate - b.completion_rate);

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.is_completed).length;

    // Identify "never done" and "rarely done" tasks
    const neverDone = breakdown.filter(b => b.completion_rate === 0);
    const rarelyDone = breakdown.filter(b => b.completion_rate > 0 && b.completion_rate < 50);
    const wellDone = breakdown.filter(b => b.completion_rate >= 80);

    return NextResponse.json({
      staff,
      breakdown,
      insights: {
        never_done: neverDone.map(b => b.title),
        rarely_done: rarelyDone.map(b => ({ title: b.title, rate: b.completion_rate })),
        well_done: wellDone.map(b => ({ title: b.title, rate: b.completion_rate })),
      },
      summary: {
        total: totalTasks,
        completed: completedTasks,
        missed: totalTasks - completedTasks,
        completion_rate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      },
      period: { start: startDate, end: endDate },
    });
  } catch (error) {
    console.error('Breakdown error:', error);
    return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
  }
}
