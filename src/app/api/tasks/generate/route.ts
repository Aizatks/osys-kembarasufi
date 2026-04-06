import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken, ADMIN_ROLES } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';

function formatDateLocal(date: Date): string {
  return date.toISOString().split('T')[0];
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    if (!token) return NextResponse.json({ error: 'Tidak dibenarkan' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload || !ADMIN_ROLES.includes(payload.role)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const body = await request.json();
    const { start_date, end_date, category = 'daily', staff_ids } = body;

    if (!start_date || !end_date) {
      return NextResponse.json({ error: 'start_date dan end_date diperlukan' }, { status: 400 });
    }

    // Get all approved staff (or specific staff_ids)
    let staffQuery = supabase.from('staff').select('id, name, category, role').eq('status', 'approved');
    if (staff_ids && staff_ids.length > 0) {
      staffQuery = staffQuery.in('id', staff_ids);
    }
    const { data: staffList, error: staffError } = await staffQuery;
    if (staffError || !staffList) {
      return NextResponse.json({ error: 'Gagal ambil senarai staff' }, { status: 500 });
    }

    // Get active templates for this category
    const { data: templates } = await supabase
      .from('task_templates')
      .select('*')
      .eq('is_active', true)
      .eq('category', category)
      .order('sort_order', { ascending: true });

    if (!templates || templates.length === 0) {
      return NextResponse.json({ message: 'Tiada template aktif untuk kategori ini', generated: 0 });
    }

    const startDate = new Date(start_date + 'T00:00:00');
    const endDate = new Date(end_date + 'T00:00:00');

    let totalGenerated = 0;
    const errors: string[] = [];

    const ROLE_LABEL_MAP: Record<string, string> = {
      'staff': 'Sales', 'ejen': 'Ejen', 'b2b': 'B2B', 'marketing': 'Marketing',
      'media-videographic': 'Media', 'admin': 'Admin', 'tour-coordinator': 'PIC',
      'tour-coordinator-manager': 'Tour Coordinator Manager', 'c-suite': 'C-Suite',
      'pengurus': 'Pengurus', 'intern': 'Intern', 'operation': 'Operation',
      'sales-marketing-manager': 'Sales & Marketing Manager',
      'asst-sales-marketing-manager': 'Asst. Sales & Marketing Manager',
      'admin-manager': 'Admin Manager', 'hr-manager': 'HR Manager',
      'finance-manager': 'Finance Manager',
    };

    for (const staff of staffList) {
      const staffCategory = staff.category || 'Sales';
      const staffRoleLabel = ROLE_LABEL_MAP[staff.role || ''] || staffCategory;
      // If staff has a specific role label different from category,
      // only match that specific role — not the broad category.
      const staffMatchValues = new Set(
        staffRoleLabel !== staffCategory
          ? [staffRoleLabel]
          : [staffCategory]
      );

      // Filter templates for this staff's category/role OR if staff is specifically targeted
      const staffTemplates = templates.filter((t: any) => {
        // Check if this staff is specifically targeted by ID
        if (t.target_staff_ids && t.target_staff_ids.length > 0 && t.target_staff_ids.includes(staff.id)) {
          return true;
        }
        // Check role-based matching
        return !t.target_role || t.target_role.length === 0 || t.target_role.some((r: string) => staffMatchValues.has(r));
      });

      if (staffTemplates.length === 0) continue;

      // Get existing tasks for this staff in date range
      const { data: existing } = await supabase
        .from('daily_tasks')
        .select('template_id, task_date')
        .eq('staff_id', staff.id)
        .gte('task_date', start_date)
        .lte('task_date', end_date)
        .not('template_id', 'is', null);

      const existingPairs = new Set(
        (existing || []).map((t: any) => `${t.template_id}__${t.task_date}`)
      );

      const tasksToCreate: any[] = [];

      if (category === 'daily') {
        // Generate one task per template per day
        const current = new Date(startDate);
        while (current <= endDate) {
          const dateStr = formatDateLocal(current);
          for (const t of staffTemplates) {
            const key = `${t.id}__${dateStr}`;
            if (!existingPairs.has(key)) {
              tasksToCreate.push({ staff_id: staff.id, task_date: dateStr, template_id: t.id, points_earned: 0 });
            }
          }
          current.setDate(current.getDate() + 1);
        }
      } else if (category === 'weekly') {
        // Iterate week by week
        const current = new Date(startDate);
        // Move to Monday of current week
        const dayOfWeek = current.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        current.setDate(current.getDate() + diffToMonday);

        while (current <= endDate) {
          const weekStart = new Date(current);
          const weekEnd = new Date(current);
          weekEnd.setDate(weekEnd.getDate() + 6);

          for (const t of staffTemplates) {
            if (t.frequency_days && t.frequency_days.length > 0) {
              // Generate per matching day in week
              const day = new Date(weekStart);
              while (day <= weekEnd && day <= endDate) {
                const dow = day.getDay();
                if (t.frequency_days.includes(dow)) {
                  const dateStr = formatDateLocal(day);
                  const key = `${t.id}__${dateStr}`;
                  if (!existingPairs.has(key)) {
                    tasksToCreate.push({ staff_id: staff.id, task_date: dateStr, template_id: t.id, points_earned: 0 });
                  }
                }
                day.setDate(day.getDate() + 1);
              }
            } else {
              // One task per week on Monday
              const dateStr = formatDateLocal(weekStart);
              const key = `${t.id}__${dateStr}`;
              if (!existingPairs.has(key)) {
                tasksToCreate.push({ staff_id: staff.id, task_date: dateStr, template_id: t.id, points_earned: 0 });
              }
            }
          }
          current.setDate(current.getDate() + 7);
        }
      } else if (category === 'monthly') {
        // One task per template per month
        const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

        while (current <= endMonth) {
          const dateStr = formatDateLocal(current);
          for (const t of staffTemplates) {
            const key = `${t.id}__${dateStr}`;
            if (!existingPairs.has(key)) {
              tasksToCreate.push({ staff_id: staff.id, task_date: dateStr, template_id: t.id, points_earned: 0 });
            }
          }
          current.setMonth(current.getMonth() + 1);
        }
      }

      // Insert in batches of 100
      for (let i = 0; i < tasksToCreate.length; i += 100) {
        const batch = tasksToCreate.slice(i, i + 100);
        const { error: insertError } = await supabase.from('daily_tasks').insert(batch);
        if (insertError) {
          errors.push(`${staff.name}: ${insertError.message}`);
        } else {
          totalGenerated += batch.length;
        }
      }
    }

    logActivity({
      staffId: payload.userId, staffName: payload.name, staffEmail: payload.email,
      action: 'generate_tasks',
      description: `Jana ${totalGenerated} task (${category}) untuk ${staffList.length} staff: ${start_date} → ${end_date}`,
      metadata: { category, start_date, end_date, totalGenerated, staffCount: staffList.length },
    });

    return NextResponse.json({
      message: `Berjaya generate ${totalGenerated} task untuk ${staffList.length} staff`,
      generated: totalGenerated,
      staff_count: staffList.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Generate tasks error:', error);
    return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
  }
}
