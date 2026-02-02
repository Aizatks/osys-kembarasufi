import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';

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
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assigned_to');

    const isAdmin = ['admin', 'superadmin'].includes(payload.role);
    const staffId = isAdmin && assignedTo ? assignedTo : payload.userId;

    let query = supabase
      .from('custom_tasks')
      .select(`
        *,
        assigned_to_staff:staff!custom_tasks_assigned_to_fkey(id, name),
        assigned_by_staff:staff!custom_tasks_assigned_by_fkey(id, name)
      `)
      .order('created_at', { ascending: false });

    if (!isAdmin || assignedTo) {
      query = query.eq('assigned_to', staffId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: tasks, error } = await query;

    if (error) {
      console.error('Get custom tasks error:', error);
      return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
    }

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Get custom tasks error:', error);
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
    if (!payload || !['admin', 'superadmin'].includes(payload.role)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, assigned_to, due_date, priority, points } = body;

    if (!title || !assigned_to) {
      return NextResponse.json({ error: 'Tajuk dan penerima diperlukan' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('custom_tasks')
      .insert({
        title,
        description: description || null,
        assigned_to,
        assigned_by: payload.userId,
        due_date: due_date || null,
        priority: priority || 'medium',
        points: points || 1,
      })
      .select(`
        *,
        assigned_to_staff:staff!custom_tasks_assigned_to_fkey(id, name),
        assigned_by_staff:staff!custom_tasks_assigned_by_fkey(id, name)
      `)
      .single();

    if (error) {
      console.error('Create custom task error:', error);
      return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
    }

    return NextResponse.json({ task: data, message: 'Task khas berjaya dicipta' });
  } catch (error) {
    console.error('Create custom task error:', error);
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
    const { id, status, title, description, due_date, priority, points } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });
    }

    const { data: task, error: fetchError } = await supabase
      .from('custom_tasks')
      .select('assigned_to, assigned_by')
      .eq('id', id)
      .single();

    if (fetchError || !task) {
      return NextResponse.json({ error: 'Task tidak dijumpai' }, { status: 404 });
    }

    const isAdmin = ['admin', 'superadmin'].includes(payload.role);
    const isAssignee = task.assigned_to === payload.userId;

    if (!isAdmin && !isAssignee) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (status !== undefined) {
      updateData.status = status;
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else {
        updateData.completed_at = null;
      }
    }

    if (isAdmin) {
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (due_date !== undefined) updateData.due_date = due_date;
      if (priority !== undefined) updateData.priority = priority;
      if (points !== undefined) updateData.points = points;
    }

    const { data, error } = await supabase
      .from('custom_tasks')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        assigned_to_staff:staff!custom_tasks_assigned_to_fkey(id, name),
        assigned_by_staff:staff!custom_tasks_assigned_by_fkey(id, name)
      `)
      .single();

    if (error) {
      console.error('Update custom task error:', error);
      return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
    }

    return NextResponse.json({ task: data, message: 'Task berjaya dikemaskini' });
  } catch (error) {
    console.error('Update custom task error:', error);
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
    if (!payload || !['admin', 'superadmin'].includes(payload.role)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 });
    }

    const { error } = await supabase
      .from('custom_tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete custom task error:', error);
      return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Task berjaya dipadam' });
  } catch (error) {
    console.error('Delete custom task error:', error);
    return NextResponse.json({ error: 'Ralat sistem' }, { status: 500 });
  }
}
