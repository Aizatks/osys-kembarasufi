import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';

interface TaskTemplate {
  id: string;
  title: string;
  description: string | null;
  category: string;
  target_role: string[] | null;
  points: number;
  is_mandatory: boolean;
  sort_order: number;
}

function getDateRange(category: string, date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  const end = new Date(date);

  if (category === 'daily') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (category === 'weekly') {
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else if (category === 'monthly') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}

function formatDateLocal(date: Date): string {
  return date.toISOString().split('T')[0];
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
    const dateParam = searchParams.get('date') || formatDateLocal(new Date());
    const staffIdParam = searchParams.get('staff_id');
    const category = searchParams.get('category') || 'daily';

    const isAdmin = ['admin', 'superadmin'].includes(payload.role);
    const staffId = isAdmin && staffIdParam ? staffIdParam : payload.userId;

    const { data: staff } = await supabase
      .from('staff')
      .select('category')
      .eq('id', staffId)
      .single();

    const staffCategory = staff?.category || 'Sales';

    const targetDate = new Date(dateParam);
    const { start: periodStart, end: periodEnd } = getDateRange(category, targetDate);

    const { data: existingTasks, error: tasksError } = await supabase
      .from('daily_tasks')
      .select(`
        *,
        template:task_templates(id, title, description, category, points, is_mandatory)
      `)
      .eq('staff_id', staffId)
      .gte('task_date', formatDateLocal(periodStart))
      .lte('task_date', formatDateLocal(periodEnd));

    if (tasksError) {
      console.error('Get daily tasks error:', tasksError);
      return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
    }

    const { data: templates } = await supabase
      .from('task_templates')
      .select('*')
      .eq('is_active', true)
      .eq('category', category)
      .order('sort_order', { ascending: true });

    const filteredTemplates = (templates || []).filter((t: TaskTemplate) =>
      !t.target_role || t.target_role.length === 0 || t.target_role.includes(staffCategory)
    );

    const existingTemplateIds = new Set(
      (existingTasks || [])
        .filter(t => t.template_id)
        .map(t => t.template_id)
    );

    const tasksToCreate = filteredTemplates
      .filter((t: TaskTemplate) => !existingTemplateIds.has(t.id))
      .map((t: TaskTemplate) => ({
        staff_id: staffId,
        task_date: formatDateLocal(targetDate),
        template_id: t.id,
        points_earned: 0,
      }));

    if (tasksToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from('daily_tasks')
        .insert(tasksToCreate);

      if (insertError) {
        console.error('Auto-create tasks error:', insertError);
      }
    }

      const { data: allTasks, error: finalError } = await supabase
          .from('daily_tasks')
          .select(`
            *,
            template:task_templates(id, title, description, category, points, is_mandatory, is_active, sort_order, attachment_requirement)
          `)
        .eq('staff_id', staffId)
        .gte('task_date', formatDateLocal(periodStart))
        .lte('task_date', formatDateLocal(periodEnd))
        .order('created_at', { ascending: true });

      if (finalError) {
        console.error('Get final tasks error:', finalError);
        return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
      }

      // Filter out tasks whose template is inactive or deleted
      const filteredAllTasks = (allTasks || []).filter(t => {
        if (!t.template_id) return true; // custom task - keep
        if (!t.template) return false; // template deleted - hide
        if (t.template.is_active === false) return false; // template inactive - hide
        return true;
      });

      const tasks = filteredAllTasks.sort((a, b) => {
      const orderA = a.template?.sort_order ?? 999;
      const orderB = b.template?.sort_order ?? 999;
      return orderA - orderB;
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.is_completed).length;
    const totalPoints = tasks.reduce((sum, t) => sum + (t.template?.points || 0), 0);
    const earnedPoints = tasks.filter(t => t.is_completed).reduce((sum, t) => sum + (t.template?.points || 0), 0);

    return NextResponse.json({
      tasks,
      summary: {
        totalTasks,
        completedTasks,
        totalPoints,
        earnedPoints,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      },
      period: {
        start: formatDateLocal(periodStart),
        end: formatDateLocal(periodEnd),
        category,
      },
    });
  } catch (error) {
    console.error('Get daily tasks error:', error);
    return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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

      const body = await request.json();
      const { id, is_completed, notes } = body;

      if (!id) {
        return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });
      }

      const { data: task, error: fetchError } = await supabase
        .from('daily_tasks')
        .select('*, template:task_templates(points, attachment_requirement)')
        .eq('id', id)
        .single();

      if (fetchError || !task) {
        return NextResponse.json({ error: 'Task tidak dijumpai' }, { status: 404 });
      }

      const isAdmin = ['admin', 'superadmin'].includes(payload.role);
      if (!isAdmin && task.staff_id !== payload.userId) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
      }

      // Block completion if attachment is required but not uploaded
      const attachReq = task.template?.attachment_requirement;
      const requiresAttachment = attachReq && attachReq !== 'none' && attachReq !== 'Tiada';
      if (is_completed === true && requiresAttachment && !task.attachment_url) {
        return NextResponse.json({ error: `Sila lampirkan ${attachReq} dahulu sebelum menandakan task ini selesai.` }, { status: 422 });
      }

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (is_completed !== undefined) {
        updateData.is_completed = is_completed;
        updateData.completed_at = is_completed ? new Date().toISOString() : null;
        updateData.points_earned = is_completed ? (task.template?.points || 0) : 0;
      }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const { data, error } = await supabase
      .from('daily_tasks')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        template:task_templates(id, title, description, category, points, is_mandatory)
      `)
      .single();

    if (error) {
      console.error('Update task error:', error);
      return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
    }

    return NextResponse.json({ 
      task: data, 
      message: is_completed ? 'Task selesai!' : 'Task dikemaskini' 
    });
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { custom_title, custom_description, task_date, staff_id } = body;

    if (!custom_title) {
      return NextResponse.json({ error: 'Tajuk diperlukan' }, { status: 400 });
    }

    const isAdmin = ['admin', 'superadmin'].includes(payload.role);
    const targetStaffId = isAdmin && staff_id ? staff_id : payload.userId;

    const { data, error } = await supabase
      .from('daily_tasks')
      .insert({
        staff_id: targetStaffId,
        task_date: task_date || formatDateLocal(new Date()),
        custom_title,
        custom_description: custom_description || null,
        points_earned: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Create custom task error:', error);
      return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
    }

    return NextResponse.json({ task: data, message: 'Task custom berjaya ditambah' });
  } catch (error) {
    console.error('Create custom task error:', error);
    return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });
    }

    const { data: task } = await supabase
      .from('daily_tasks')
      .select('staff_id, template_id')
      .eq('id', id)
      .single();

    if (!task) {
      return NextResponse.json({ error: 'Task tidak dijumpai' }, { status: 404 });
    }

    if (task.template_id) {
      return NextResponse.json({ error: 'Tidak boleh padam task template' }, { status: 400 });
    }

    const isAdmin = ['admin', 'superadmin'].includes(payload.role);
    if (!isAdmin && task.staff_id !== payload.userId) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { error } = await supabase
      .from('daily_tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete task error:', error);
      return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Task berjaya dipadam' });
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
  }
}
