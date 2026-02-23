import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';

function formatDateLocal(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getGrade(completionRate: number): string {
  if (completionRate >= 95) return 'A+';
  if (completionRate >= 85) return 'A';
  if (completionRate >= 70) return 'B';
  if (completionRate >= 50) return 'C';
  return 'D';
}

function getBonusRecommendation(completionRate: number): {
  recommendation: string;
  bonus_percentage: number;
} {
  if (completionRate >= 95) {
    return { recommendation: 'bonus_full_increment', bonus_percentage: 150 };
  } else if (completionRate >= 85) {
    return { recommendation: 'bonus_full', bonus_percentage: 100 };
  } else if (completionRate >= 70) {
    return { recommendation: 'bonus_half', bonus_percentage: 50 };
  }
  return { recommendation: 'no_bonus', bonus_percentage: 0 };
}

function calculateWeightedScore(tasks: any[]) {
  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter(t => t.is_completed).length || 0;
  
  let kpiTotalPoints = 0;
  let kpiEarnedPoints = 0;
  let kpiWeightedSum = 0;
  let kpiWeightTotal = 0;
  
  let kriTotalPoints = 0;
  let kriEarnedPoints = 0;
  let kriWeightedSum = 0;
  let kriWeightTotal = 0;

  tasks?.forEach(t => {
    const points = t.template?.points || 0;
    const weight = Number(t.template?.weightage || 1);
    const type = t.template?.indicator_type || 'KPI';
    const isCompleted = t.is_completed ? 1 : 0;

    if (type === 'KRI') {
      kriTotalPoints += points;
      kriEarnedPoints += t.is_completed ? points : 0;
      kriWeightedSum += isCompleted * weight;
      kriWeightTotal += weight;
    } else {
      kpiTotalPoints += points;
      kpiEarnedPoints += t.is_completed ? points : 0;
      kpiWeightedSum += isCompleted * weight;
      kpiWeightTotal += weight;
    }
  });

  const kpiRate = kpiWeightTotal > 0 ? (kpiWeightedSum / kpiWeightTotal) * 100 : 0;
  const kriRate = kriWeightTotal > 0 ? (kriWeightedSum / kriWeightTotal) * 100 : 0;
  
  // KPI 40%, KRI 60% weightage
  let finalScore = 0;
  if (kpiWeightTotal > 0 && kriWeightTotal > 0) {
    finalScore = (kpiRate * 0.4) + (kriRate * 0.6);
  } else if (kpiWeightTotal > 0) {
    finalScore = kpiRate;
  } else if (kriWeightTotal > 0) {
    finalScore = kriRate;
  }

  return {
    totalTasks,
    completedTasks,
    kpiRate: Math.round(kpiRate * 10) / 10,
    kriRate: Math.round(kriRate * 10) / 10,
    completionRate: Math.round(finalScore * 10) / 10,
    kpiTotalPoints,
    kpiEarnedPoints,
    kriTotalPoints,
    kriEarnedPoints
  };
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token tidak sah' }, { status: 401 });
    }

      const { searchParams } = new URL(request.url);
      const staffIdParam = searchParams.get('staff_id');
      const period = searchParams.get('period') || 'weekly';
      const dateParam = searchParams.get('date') || formatDateLocal(new Date());
      const year = searchParams.get('year');
      const allStaff = searchParams.get('all') === 'true';
      const startDateOverride = searchParams.get('start_date');
      const endDateOverride = searchParams.get('end_date');

    const isAdmin = ['admin', 'superadmin', 'pengurus', 'c-suite'].includes(payload.role);

    if (period === 'yearly' && year) {
      const yearNum = parseInt(year);
      const startDate = `${yearNum}-01-01`;
      const endDate = `${yearNum}-12-31`;

      if (allStaff && isAdmin) {
        const { data: staffList } = await supabase
          .from('staff')
          .select('id, name, category')
          .eq('status', 'approved');

        const results = await Promise.all(
          (staffList || []).map(async (staff) => {
            const { data: tasks } = await supabase
              .from('daily_tasks')
              .select('is_completed, points_earned, template:task_templates(points, indicator_type, weightage)')
              .eq('staff_id', staff.id)
              .gte('task_date', startDate)
              .lte('task_date', endDate);

            const scores = calculateWeightedScore(tasks || []);

            return {
              staff_id: staff.id,
              staff_name: staff.name,
              category: staff.category,
              ...scores,
              grade: getGrade(scores.completionRate),
              ...getBonusRecommendation(scores.completionRate),
            };
          })
        );

        results.sort((a, b) => b.completionRate - a.completionRate);

        return NextResponse.json({ scores: results, year: yearNum });
      }

      const staffId = staffIdParam || payload.userId;

      const { data: tasks } = await supabase
        .from('daily_tasks')
        .select('task_date, is_completed, points_earned, template:task_templates(points, indicator_type, weightage)')
        .eq('staff_id', staffId)
        .gte('task_date', startDate)
        .lte('task_date', endDate);

      const scores = calculateWeightedScore(tasks || []);

      const monthlyData: Record<number, any[]> = {};
      for (let m = 1; m <= 12; m++) {
        monthlyData[m] = [];
      }

      tasks?.forEach(t => {
        const month = new Date(t.task_date).getMonth() + 1;
        monthlyData[month].push(t);
      });

      const monthly = Object.entries(monthlyData).map(([month, mTasks]) => {
        const mScores = calculateWeightedScore(mTasks);
        return {
          month: parseInt(month),
          tasks_completed: mScores.completedTasks,
          total_tasks: mScores.totalTasks,
          rate: mScores.completionRate,
          kpiRate: mScores.kpiRate,
          kriRate: mScores.kriRate
        };
      });

      const quarterly = [1, 2, 3, 4].map(q => {
        const months = [q * 3 - 2, q * 3 - 1, q * 3];
        const qTasks = tasks?.filter(t => {
          const m = new Date(t.task_date).getMonth() + 1;
          return months.includes(m);
        }) || [];
        const qScores = calculateWeightedScore(qTasks);
        return {
          quarter: `Q${q}`,
          rate: qScores.completionRate,
          grade: getGrade(qScores.completionRate),
          kpiRate: qScores.kpiRate,
          kriRate: qScores.kriRate
        };
      });

      return NextResponse.json({
        staff_id: staffId,
        year: yearNum,
        summary: {
          ...scores,
          grade: getGrade(scores.completionRate),
        },
        quarterly,
        monthly,
        ...getBonusRecommendation(scores.completionRate),
      });
    }

    const targetDate = new Date(dateParam);
    let periodStart: Date;
    let periodEnd: Date;

    if (startDateOverride && endDateOverride) {
      periodStart = new Date(startDateOverride + 'T00:00:00');
      periodEnd = new Date(endDateOverride + 'T00:00:00');
    } else if (period === 'weekly') {
      const day = targetDate.getDay();
      const diff = targetDate.getDate() - day + (day === 0 ? -6 : 1);
      periodStart = new Date(targetDate);
      periodStart.setDate(diff);
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodStart.getDate() + 6);
    } else {
      periodStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      periodEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
    }

    const startDateStr = formatDateLocal(periodStart);
    const endDateStr = formatDateLocal(periodEnd);

    if (allStaff && isAdmin) {
      const { data: staffList } = await supabase
        .from('staff')
        .select('id, name, category')
        .eq('status', 'approved');

      const results = await Promise.all(
        (staffList || []).map(async (staff) => {
          const { data: tasks } = await supabase
            .from('daily_tasks')
            .select('is_completed, points_earned, template:task_templates(points, indicator_type, weightage)')
            .eq('staff_id', staff.id)
            .gte('task_date', startDateStr)
            .lte('task_date', endDateStr);

          const scores = calculateWeightedScore(tasks || []);

          return {
            staff_id: staff.id,
            staff_name: staff.name,
            category: staff.category,
            ...scores,
            grade: getGrade(scores.completionRate),
          };
        })
      );

      results.sort((a, b) => b.completionRate - a.completionRate);

      return NextResponse.json({
        scores: results,
        period: {
          type: period,
          start: startDateStr,
          end: endDateStr,
        },
      });
    }

    const staffId = isAdmin && staffIdParam ? staffIdParam : payload.userId;

    const { data: tasks } = await supabase
      .from('daily_tasks')
      .select('is_completed, points_earned, template:task_templates(points, indicator_type, weightage)')
      .eq('staff_id', staffId)
      .gte('task_date', startDateStr)
      .lte('task_date', endDateStr);

    const scores = calculateWeightedScore(tasks || []);

    return NextResponse.json({
      score: {
        staff_id: staffId,
        period_type: period,
        period_start: startDateStr,
        period_end: endDateStr,
        ...scores,
        grade: getGrade(scores.completionRate),
      },
    });
  } catch (error) {
    console.error('Get scores error:', error);
    return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
  }
}
